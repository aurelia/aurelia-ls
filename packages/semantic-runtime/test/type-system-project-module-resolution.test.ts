import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { afterEach, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  semanticRuntimeProcessTypeSystemCacheOverview,
} from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { SourceFileRole } from '../src/kernel/address.js';
import { SemanticRuntimeProjectInputReadKind } from '../src/kernel/project-input.js';
import {
  clearTypeSystemCompilerHostSourceFileCache,
  readTypeSystemCompilerHostSourceFileCacheOverview,
} from '../src/type-system/compiler-host-source-file-cache.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('type-system project module resolution', () => {
  test('admits exact linked sources through usage-specific package conditions', async () => {
    const fixtureRoot = temporaryRoot();
    const appRoot = path.join(fixtureRoot, 'app');
    const packageRoot = path.join(fixtureRoot, 'packages', 'linked');
    const logicalPackageRoot = path.join(appRoot, 'node_modules', '@fixture', 'linked');
    const importEntry = path.join(appRoot, 'src', 'entry.mts');
    const requireEntry = path.join(appRoot, 'src', 'entry.cts');
    const importSource = path.join(packageRoot, 'src', 'import.ts');
    const requireSource = path.join(packageRoot, 'src', 'require.cts');

    writeJson(path.join(appRoot, 'package.json'), {
      name: '@fixture/app',
      private: true,
      type: 'module',
    });
    writeJson(path.join(appRoot, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
      },
      files: ['src/entry.mts', 'src/entry.cts'],
    });
    writeText(importEntry, [
      "import { importMarker } from '@fixture/linked';",
      'export const selectedImport = importMarker;',
      '',
    ].join('\n'));
    writeText(requireEntry, [
      "import { requireMarker } from '@fixture/linked';",
      'export const selectedRequire = requireMarker;',
      '',
    ].join('\n'));

    writeJson(path.join(packageRoot, 'package.json'), {
      name: '@fixture/linked',
      version: '1.0.0',
      type: 'module',
      exports: {
        '.': {
          import: {
            types: './dist/types/import.d.ts',
            default: './dist/esm/import.js',
          },
          require: {
            types: './dist/types/require.d.cts',
            default: './dist/cjs/require.cjs',
          },
        },
      },
    });
    writeJson(path.join(packageRoot, 'tsconfig.json'), {
      compilerOptions: {
        rootDir: 'src',
        declarationDir: 'dist/types',
      },
    });
    writeText(importSource, "export const importMarker = 'import-source' as const;\n");
    writeText(requireSource, "export const requireMarker = 'require-source' as const;\n");
    linkDirectory(packageRoot, logicalPackageRoot);

    const runtime = await createSemanticRuntime({
      workspaceRoot: appRoot,
      storeKey: `test:type-system-linked-module-resolution:${path.basename(fixtureRoot)}`,
      projects: [{
        projectKey: 'linked-module-resolution',
        rootDir: appRoot,
        sourceFiles: [
          { path: 'src/entry.mts', role: SourceFileRole.AppSource },
          { path: 'src/entry.cts', role: SourceFileRole.AppSource },
        ],
      }],
    });
    const project = runtime.workspace.projects[0]!;
    const evaluation = runtime.projectEvaluations.acquire(
      project,
      aureliaAppProjectEvaluationProfile,
    ).readBaseline();
    const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation);

    expect(typeSystem.program.getSourceFile(importSource)).not.toBeUndefined();
    expect(typeSystem.program.getSourceFile(requireSource)).not.toBeUndefined();
    expect(unresolvedModuleDiagnostics(typeSystem, importEntry)).toEqual([]);
    expect(unresolvedModuleDiagnostics(typeSystem, requireEntry)).toEqual([]);

    const directExport = typeSystem.readProgramExportedSymbol('@fixture/linked', 'importMarker');
    expect(directExport).not.toBeNull();
    expect(path.resolve(directExport!.declarations![0]!.getSourceFile().fileName)).toBe(path.resolve(importSource));
    expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(importSource)).toBe(false);
    expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(requireSource)).toBe(false);
  }, 30_000);

  test('re-resolves a cached declaration edge when a linked package junction is retargeted', async () => {
    clearTypeSystemCompilerHostSourceFileCache('all');
    try {
      const fixtureRoot = temporaryRoot();
      const appRoot = path.join(fixtureRoot, 'app');
      const appEntry = path.join(appRoot, 'src', 'main.ts');
      const wrapperRoot = path.join(appRoot, 'node_modules', '@fixture', 'wrapper');
      const wrapperDeclaration = path.join(wrapperRoot, 'index.d.ts');
      const logicalLinkedRoot = path.join(appRoot, 'node_modules', '@fixture', 'linked');
      const linkedRootA = path.join(fixtureRoot, 'packages', 'linked-a');
      const linkedRootB = path.join(fixtureRoot, 'packages', 'linked-b');
      const linkedSourceA = writeLinkedSourcePackage(linkedRootA, 'linked-a');
      const linkedSourceB = writeLinkedSourcePackage(linkedRootB, 'linked-b');

      writeJson(path.join(appRoot, 'package.json'), {
        name: '@fixture/app',
        private: true,
        type: 'module',
      });
      writeJson(path.join(appRoot, 'tsconfig.json'), {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
        },
        files: ['src/main.ts'],
      });
      writeText(appEntry, [
        "import { linkedMarker } from '@fixture/wrapper';",
        'export const selectedMarker = linkedMarker;',
        '',
      ].join('\n'));
      writeJson(path.join(wrapperRoot, 'package.json'), {
        name: '@fixture/wrapper',
        version: '1.0.0',
        types: 'index.d.ts',
      });
      writeText(wrapperDeclaration, "export { linkedMarker } from '@fixture/linked';\n");
      linkDirectory(linkedRootA, logicalLinkedRoot);

      const runtime = await createSemanticRuntime({
        workspaceRoot: appRoot,
        storeKey: `test:type-system-program-resolution-currentness:${path.basename(fixtureRoot)}`,
        projects: [{
          projectKey: 'program-resolution-currentness',
          rootDir: appRoot,
          sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
        }],
      });
      const firstProject = runtime.workspace.projects[0]!;
      const firstEvaluation = runtime.projectEvaluations.acquire(
        firstProject,
        aureliaAppProjectEvaluationProfile,
      ).readBaseline();
      const builder = new TypeSystemProjectBuilder(runtime.frameworkSupport);
      const firstTypeSystem = builder.build(firstProject, firstEvaluation);
      const firstWrapperSource = firstTypeSystem.program.getSourceFile(wrapperDeclaration);
      const firstLocatorRead = linkedRootRealpathRead(firstTypeSystem, logicalLinkedRoot);

      expect(firstWrapperSource).not.toBeUndefined();
      expect(firstTypeSystem.program.getSourceFile(linkedSourceA)).not.toBeUndefined();
      expect(firstTypeSystem.program.getSourceFile(linkedSourceB)).toBeUndefined();
      expect(firstLocatorRead).toBeDefined();
      expect(sameHostPath(String(firstLocatorRead!.value), linkedRootA)).toBe(true);

      unlinkSync(logicalLinkedRoot);
      linkDirectory(linkedRootB, logicalLinkedRoot);
      expect(sameHostPath(realpathSync.native(logicalLinkedRoot), linkedRootB)).toBe(true);
      expect(firstLocatorRead!.validateObservedValue()).toMatchObject({
        isCurrent: false,
        changedFacets: [SemanticRuntimeProjectInputReadKind.Realpath],
      });

      const secondProject = firstProject.forInputGeneration(
        runtime.workspace.projectInputAuthority.capture(firstProject),
      );
      const secondEvaluation = runtime.projectEvaluations.acquire(
        secondProject,
        aureliaAppProjectEvaluationProfile,
      ).readBaseline();
      const secondTypeSystem = builder.build(
        secondProject,
        secondEvaluation,
        { previousProject: firstTypeSystem },
      );
      const secondWrapperSource = secondTypeSystem.program.getSourceFile(wrapperDeclaration);
      const secondLocatorRead = linkedRootRealpathRead(secondTypeSystem, logicalLinkedRoot);
      const linkedMarker = secondTypeSystem.readProgramExportedSymbol('@fixture/wrapper', 'linkedMarker');

      expect(secondProject.inputGeneration).not.toBe(firstProject.inputGeneration);
      expect(secondWrapperSource).toBe(firstWrapperSource);
      expect(secondTypeSystem.program.getSourceFile(linkedSourceA)).toBeUndefined();
      expect(secondTypeSystem.program.getSourceFile(linkedSourceB)).not.toBeUndefined();
      expect(linkedMarker).not.toBeNull();
      expect(sameHostPath(linkedMarker!.declarations![0]!.getSourceFile().fileName, linkedSourceB)).toBe(true);
      expect(secondLocatorRead).toBeDefined();
      expect(sameHostPath(String(secondLocatorRead!.value), linkedRootB)).toBe(true);
      expect(secondLocatorRead!.validateObservedValue().isCurrent).toBe(true);
    } finally {
      clearTypeSystemCompilerHostSourceFileCache('all');
    }
  }, 30_000);

  test('replaces a changed dependency revision without retaining it in the old Program cache slot', async () => {
    clearTypeSystemCompilerHostSourceFileCache('all');
    try {
      const fixtureRoot = temporaryRoot();
      const appRoot = path.join(fixtureRoot, 'app');
      const appEntry = path.join(appRoot, 'src', 'main.ts');
      const dependencyRoot = path.join(appRoot, 'node_modules', '@fixture', 'revisioned');
      const dependencyDeclaration = path.join(dependencyRoot, 'index.d.ts');
      const firstDependencyText = "export declare const revisionMarker: 'first';\n";
      const secondDependencyText = "export declare const revisionMarker: 'second';\n";

      writeJson(path.join(appRoot, 'package.json'), {
        name: '@fixture/revision-app',
        private: true,
        type: 'module',
      });
      writeJson(path.join(appRoot, 'tsconfig.json'), {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
        },
        files: ['src/main.ts'],
      });
      writeText(appEntry, [
        "import { revisionMarker } from '@fixture/revisioned';",
        'export const selectedRevision = revisionMarker;',
        '',
      ].join('\n'));
      writeJson(path.join(dependencyRoot, 'package.json'), {
        name: '@fixture/revisioned',
        version: '1.0.0',
        types: 'index.d.ts',
      });
      writeText(dependencyDeclaration, firstDependencyText);

      const runtime = await createSemanticRuntime({
        workspaceRoot: appRoot,
        storeKey: `test:type-system-dependency-revision-currentness:${path.basename(fixtureRoot)}`,
        projects: [{
          projectKey: 'dependency-revision-currentness',
          rootDir: appRoot,
          sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
        }],
      });
      const firstProject = runtime.workspace.projects[0]!;
      const firstEvaluation = runtime.projectEvaluations.acquire(
        firstProject,
        aureliaAppProjectEvaluationProfile,
      ).readBaseline();
      const builder = new TypeSystemProjectBuilder(runtime.frameworkSupport);
      const firstTypeSystem = builder.build(firstProject, firstEvaluation);
      const firstDependencySource = firstTypeSystem.program.getSourceFile(dependencyDeclaration);
      const cacheAfterFirstProgram = readTypeSystemCompilerHostSourceFileCacheOverview();

      expect(firstDependencySource?.text).toBe(firstDependencyText);

      writeText(dependencyDeclaration, secondDependencyText);
      const secondProject = firstProject.forInputGeneration(
        runtime.workspace.projectInputAuthority.capture(firstProject),
      );
      const secondEvaluation = runtime.projectEvaluations.acquire(
        secondProject,
        aureliaAppProjectEvaluationProfile,
      ).readBaseline();
      const secondTypeSystem = builder.build(
        secondProject,
        secondEvaluation,
        { previousProject: firstTypeSystem },
      );
      const secondDependencySource = secondTypeSystem.program.getSourceFile(dependencyDeclaration);
      const cacheAfterSecondProgram = readTypeSystemCompilerHostSourceFileCacheOverview();
      const publicCacheAfterSecondProgram = semanticRuntimeProcessTypeSystemCacheOverview();

      expect(secondProject.inputGeneration).not.toBe(firstProject.inputGeneration);
      expect(secondDependencySource).not.toBe(firstDependencySource);
      expect(secondDependencySource?.text).toBe(secondDependencyText);
      expect(firstDependencySource?.text).toBe(firstDependencyText);
      expect(secondTypeSystem.profile.hostSourceFileCache.supersededRevisionEvictions).toBe(1);
      expect(secondTypeSystem.profile.hostSourceFileCache.supersededRevisionEvictedSourceTextCharacters)
        .toBe(firstDependencyText.length);
      expect(cacheAfterSecondProgram.entries).toBe(cacheAfterFirstProgram.entries);
      expect(cacheAfterSecondProgram.sourceTextCharacters)
        .toBe(cacheAfterFirstProgram.sourceTextCharacters - firstDependencyText.length + secondDependencyText.length);
      expect(publicCacheAfterSecondProgram).toMatchObject({
        entries: cacheAfterSecondProgram.entries,
        entryLimit: cacheAfterSecondProgram.entryLimit,
        sourceTextCharacterLimit: cacheAfterSecondProgram.sourceTextCharacterLimit,
        supersededRevisionEvictions: cacheAfterSecondProgram.supersededRevisionEvictions,
        supersededRevisionEvictedSourceTextCharacters:
          cacheAfterSecondProgram.supersededRevisionEvictedSourceTextCharacters,
        capacityEvictions: cacheAfterSecondProgram.capacityEvictions,
        capacityEvictedSourceTextCharacters: cacheAfterSecondProgram.capacityEvictedSourceTextCharacters,
      });
    } finally {
      clearTypeSystemCompilerHostSourceFileCache('all');
    }
  }, 30_000);
});

function linkedRootRealpathRead(
  typeSystem: ReturnType<TypeSystemProjectBuilder['build']>,
  logicalPackageRoot: string,
) {
  return typeSystem.readRegisteredInputs().find((read) =>
    read.kind === SemanticRuntimeProjectInputReadKind.Realpath
      && 'fileName' in read.descriptor
      && sameHostPath(read.descriptor.fileName, logicalPackageRoot)
  );
}

function writeLinkedSourcePackage(root: string, marker: string): string {
  writeJson(path.join(root, 'package.json'), {
    name: '@fixture/linked',
    version: '1.0.0',
    type: 'module',
    types: 'dist/types/index.d.ts',
    exports: {
      '.': {
        types: './dist/types/index.d.ts',
        default: './dist/esm/index.js',
      },
    },
  });
  writeJson(path.join(root, 'tsconfig.json'), {
    compilerOptions: {
      rootDir: 'src',
      declarationDir: 'dist/types',
    },
  });
  const sourcePath = path.join(root, 'src', 'index.ts');
  writeText(sourcePath, `export const linkedMarker = '${marker}' as const;\n`);
  return sourcePath;
}

function unresolvedModuleDiagnostics(
  typeSystem: ReturnType<TypeSystemProjectBuilder['build']>,
  fileName: string,
): readonly ts.Diagnostic[] {
  const sourceFile = typeSystem.program.getSourceFile(fileName);
  expect(sourceFile).not.toBeUndefined();
  return typeSystem.program.getSemanticDiagnostics(sourceFile)
    .filter((diagnostic) => diagnostic.code === 2307);
}

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-type-system-module-resolution-'));
  temporaryRoots.push(root);
  return root;
}

function writeText(fileName: string, text: string): void {
  mkdirSync(path.dirname(fileName), { recursive: true });
  writeFileSync(fileName, text, 'utf8');
}

function writeJson(fileName: string, value: unknown): void {
  writeText(fileName, `${JSON.stringify(value, null, 2)}\n`);
}

function linkDirectory(target: string, link: string): void {
  mkdirSync(path.dirname(link), { recursive: true });
  symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

function sameHostPath(left: string, right: string): boolean {
  const leftPath = path.resolve(left).replace(/\\/g, '/');
  const rightPath = path.resolve(right).replace(/\\/g, '/');
  return process.platform === 'win32'
    ? leftPath.toLowerCase() === rightPath.toLowerCase()
    : leftPath === rightPath;
}
