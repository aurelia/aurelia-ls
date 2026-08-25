import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import ts from 'typescript';
import { afterEach, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import {
  buildEvaluationModuleGraph,
  type EvaluationModuleSourceHost,
} from '../src/evaluation/module-host.js';
import { EvaluationImportKind } from '../src/evaluation/module-graph.js';
import {
  candidateEvaluationModulePaths,
  isEvaluationModulePath,
} from '../src/evaluation/package-source-layout.js';
import { EvaluationValueKind } from '../src/evaluation/values.js';
import { SourceFileRole } from '../src/kernel/address.js';

const PACKAGE_NAME = '@fixture/aurelia-mode-linked';
const NODE_NEXT_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
};
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('evaluation module resolution modes', () => {
  test('admits MTS and CTS source-layout candidates', () => {
    const base = '/workspace/packages/linked/src/feature';

    expect(candidateEvaluationModulePaths(base)).toEqual(expect.arrayContaining([
      `${base}.mts`,
      `${base}.cts`,
      path.join(base, 'index.mts'),
      path.join(base, 'index.cts'),
    ]));
    expect(isEvaluationModulePath(`${base}.mts`)).toBe(true);
    expect(isEvaluationModulePath(`${base}.cts`)).toBe(true);
    expect(candidateEvaluationModulePaths(`${base}.mjs`)).toEqual([
      `${base}.mts`,
      `${base}.mjs`,
    ]);
    expect(candidateEvaluationModulePaths(`${base}.cjs`)).toEqual([
      `${base}.cts`,
      `${base}.cjs`,
    ]);
  });

  test('retains distinct import and require edges for one authored specifier', () => {
    const entryKey = '/workspace/src/entry.mts';
    const importKey = '/workspace/packages/linked/src/import.mts';
    const requireKey = '/workspace/packages/linked/src/require.cts';
    const sources = new Map<string, ts.SourceFile>([
      [entryKey, sourceFile(entryKey, [
        `import { importMarker } from '${PACKAGE_NAME}';`,
        `export { importMarker as forwardedMarker } from '${PACKAGE_NAME}';`,
        `const required = require('${PACKAGE_NAME}');`,
        `export const pending = import('${PACKAGE_NAME}');`,
        'export const selected = importMarker + required.requireMarker;',
      ].join('\n'), ts.ModuleKind.ESNext)],
      [importKey, sourceFile(importKey, "export const importMarker = 'import';\n", ts.ModuleKind.ESNext)],
      [requireKey, sourceFile(requireKey, "export const requireMarker = 'require';\n", ts.ModuleKind.CommonJS)],
    ]);
    const resolutions: { readonly moduleSpecifier: string; readonly mode: ts.ResolutionMode }[] = [];
    const host: EvaluationModuleSourceHost = {
      compilerOptions: NODE_NEXT_OPTIONS,
      readSourceFile: (moduleKey) => sources.get(moduleKey) ?? null,
      resolveModuleSpecifier: (_fromModuleKey, moduleSpecifier, mode) => {
        resolutions.push({ moduleSpecifier, mode });
        return mode === ts.ModuleKind.ESNext ? importKey : requireKey;
      },
    };

    const build = buildEvaluationModuleGraph(entryKey, host);
    const record = build.graph.readModule(entryKey)!;
    const packageImports = record.imports.filter((entry) => entry.moduleSpecifier === PACKAGE_NAME);

    expect(packageImports.find((entry) => entry.importKind === EvaluationImportKind.Named)?.resolutionMode)
      .toBe(ts.ModuleKind.ESNext);
    expect(packageImports.find((entry) => entry.importKind === EvaluationImportKind.DynamicImport)?.resolutionMode)
      .toBe(ts.ModuleKind.ESNext);
    expect(packageImports.find((entry) => entry.importKind === EvaluationImportKind.CommonJsRequire)?.resolutionMode)
      .toBe(ts.ModuleKind.CommonJS);
    expect(record.exports.find((entry) => entry.moduleSpecifier === PACKAGE_NAME)?.resolutionMode)
      .toBe(ts.ModuleKind.ESNext);
    expect(resolutions).toEqual([
      { moduleSpecifier: PACKAGE_NAME, mode: ts.ModuleKind.ESNext },
      { moduleSpecifier: PACKAGE_NAME, mode: ts.ModuleKind.CommonJS },
    ]);
    expect(build.graph.readLinkedModule(entryKey, PACKAGE_NAME, ts.ModuleKind.ESNext)).toBe(importKey);
    expect(build.graph.readLinkedModule(entryKey, PACKAGE_NAME, ts.ModuleKind.CommonJS)).toBe(requireKey);
  });

  test('keeps evaluator and checker on the same conditional linked sources without granting authorship', async () => {
    const root = temporaryRoot();
    const appRoot = path.join(root, 'app');
    const packageRoot = path.join(root, 'packages', 'linked');
    const entryPath = path.join(appRoot, 'src', 'entry.mts');
    const commonJsEntryPath = path.join(appRoot, 'src', 'entry.cts');
    const importSourcePath = path.join(packageRoot, 'src', 'import.mts');
    const requireSourcePath = path.join(packageRoot, 'src', 'require.cts');

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
    writeText(entryPath, [
      `import { importMarker } from '${PACKAGE_NAME}';`,
      `export { importMarker as forwardedImport } from '${PACKAGE_NAME}';`,
      `const required = require('${PACKAGE_NAME}');`,
      `export const pendingImport = import('${PACKAGE_NAME}');`,
      'export const selectedImport = importMarker;',
      'export const selectedRequire = required.requireMarker;',
      '',
    ].join('\n'));
    writeText(commonJsEntryPath, [
      `import { requireMarker } from '${PACKAGE_NAME}';`,
      'export const selectedStaticRequire = requireMarker;',
      '',
    ].join('\n'));

    writeJson(path.join(packageRoot, 'package.json'), {
      name: PACKAGE_NAME,
      version: '1.0.0',
      type: 'module',
      exports: {
        '.': {
          import: {
            types: './dist/types/import.d.mts',
            default: './dist/esm/import.mjs',
          },
          require: {
            types: './dist/types/require.d.cts',
            default: './dist/cjs/require.cjs',
          },
        },
      },
      dependencies: {
        aurelia: '2.0.0',
      },
    });
    writeJson(path.join(packageRoot, 'tsconfig.json'), {
      compilerOptions: {
        rootDir: 'src',
        declarationDir: 'dist/types',
      },
    });
    writeText(importSourcePath, "export const importMarker = 'import-source' as const;\n");
    writeText(requireSourcePath, "export const requireMarker = 'require-source' as const;\n");
    linkDirectory(packageRoot, path.join(appRoot, 'node_modules', '@fixture', 'aurelia-mode-linked'));
    const physicalPackageRoot = realpathSync.native(packageRoot);
    const physicalImportSourcePath = path.join(physicalPackageRoot, 'src', 'import.mts');
    const physicalRequireSourcePath = path.join(physicalPackageRoot, 'src', 'require.cts');

    const runtime = await createSemanticRuntime({
      workspaceRoot: appRoot,
      storeKey: `test:evaluation-module-resolution-mode:${path.basename(root)}`,
      projects: [{
        projectKey: 'app',
        rootDir: appRoot,
        sourceFiles: [
          { path: 'src/entry.mts', role: SourceFileRole.AppSource },
          { path: 'src/entry.cts', role: SourceFileRole.AppSource },
        ],
      }],
    });
    const project = runtime.workspace.projects[0]!;
    const evaluationAccess = runtime.projectEvaluations.acquire(
      project,
      aureliaAppProjectEvaluationProfile,
    );
    const evaluation = evaluationAccess.readBaseline();
    const entry = evaluation.readEvaluatedSources().find((source) =>
      sameHostPath(source.sourceFile.fileName, entryPath)
    );

    expect(entry?.evaluation.environment.readValue('selectedImport')).toMatchObject({
      kind: EvaluationValueKind.String,
      value: 'import-source',
    });
    expect(entry?.evaluation.environment.readValue('selectedRequire')).toMatchObject({
      kind: EvaluationValueKind.String,
      value: 'require-source',
    });
    for (const sourcePath of [physicalImportSourcePath, physicalRequireSourcePath]) {
      expect(evaluation.readEvaluatedSources().find((source) =>
        sameHostPath(source.sourceFile.fileName, sourcePath)
      )).toMatchObject({ admission: { role: SourceFileRole.ExternalSource } });
    }

    const typeSystem = runtime.typeSystemProjects.acquire(
      project,
      evaluationAccess.generation,
    ).readProject();
    for (const sourcePath of [physicalImportSourcePath, physicalRequireSourcePath]) {
      expect(typeSystem.program.getSourceFile(sourcePath)).not.toBeUndefined();
      expect(typeSystem.readProgramSourceFileRoleByHostPath(sourcePath)).toBe(SourceFileRole.ExternalSource);
      expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(sourcePath)).toBe(false);
    }
    expect(unresolvedModuleDiagnostics(typeSystem.program, entryPath)).toEqual([]);
    expect(unresolvedModuleDiagnostics(typeSystem.program, commonJsEntryPath)).toEqual([]);
    expect(project.sourceFiles).toEqual([
      expect.objectContaining({ path: 'src/entry.mts', role: SourceFileRole.AppSource }),
      expect.objectContaining({ path: 'src/entry.cts', role: SourceFileRole.AppSource }),
    ]);
  }, 30_000);
});

function sourceFile(fileName: string, text: string, impliedNodeFormat: ts.ResolutionMode): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    text,
    { languageVersion: ts.ScriptTarget.Latest, impliedNodeFormat },
    true,
    ts.ScriptKind.TS,
  );
}

function unresolvedModuleDiagnostics(program: ts.Program, fileName: string): readonly ts.Diagnostic[] {
  const source = program.getSourceFile(fileName);
  expect(source).not.toBeUndefined();
  return program.getSemanticDiagnostics(source).filter((diagnostic) => diagnostic.code === 2307);
}

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-evaluation-resolution-mode-'));
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
  const normalize = (value: string): string => {
    const normalized = path.resolve(value).replaceAll('\\', '/');
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  };
  return normalize(left) === normalize(right);
}
