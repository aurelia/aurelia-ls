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

import { afterEach, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { EvaluationValueKind } from '../src/evaluation/values.js';
import { SourceFileRole } from '../src/kernel/address.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('linked package source integration', () => {
  test('shares exact linked-source resolution while keeping evaluator admission and authored ownership separate', async () => {
    const root = temporaryRoot();
    const appRoot = path.join(root, 'app');
    const kitRoot = path.join(root, 'packages', 'aurelia-linked-kit');
    const kernelRoot = path.join(root, 'packages', 'linked-kernel');
    const mainFile = path.join(appRoot, 'src', 'main.ts');
    const kitSource = path.join(kitRoot, 'src', 'index.ts');
    const kitSelfSource = path.join(kitRoot, 'src', 'self.ts');
    const kitInternalSource = path.join(kitRoot, 'src', 'internal.ts');
    const kernelSource = path.join(kernelRoot, 'src', 'index.ts');

    writeJson(path.join(appRoot, 'package.json'), {
      name: '@fixture/app',
      private: true,
      type: 'module',
    });
    writeJson(path.join(appRoot, 'tsconfig.json'), {
      compilerOptions: {
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
      },
      include: ['src'],
    });
    writeText(mainFile, [
      "import { linkedMarker, linkedPackageMarker } from '@acme/aurelia-linked-kit';",
      'export const appMarker = linkedMarker;',
      'export const appPackageMarker = linkedPackageMarker;',
      '',
    ].join('\n'));

    writeLinkedPackage(kitRoot, '@acme/aurelia-linked-kit', {
      aurelia: '2.0.0',
      '@aurelia/linked-kernel': '2.0.0',
    });
    writeJson(path.join(kitRoot, 'package.json'), {
      name: '@acme/aurelia-linked-kit',
      version: '1.0.0',
      type: 'module',
      types: 'dist/types/index.d.ts',
      exports: {
        '.': { types: './dist/types/index.d.ts' },
        './self': { types: './dist/types/self.d.ts' },
      },
      imports: {
        '#internal': { types: './dist/types/internal.d.ts' },
      },
      dependencies: {
        aurelia: '2.0.0',
        '@aurelia/linked-kernel': '2.0.0',
      },
    });
    writeText(kitSource, [
      "import { kernelMarker } from '@aurelia/linked-kernel';",
      "import { selfMarker } from '@acme/aurelia-linked-kit/self';",
      "import { internalMarker } from '#internal';",
      "export const linkedMarker = 'linked-source' as const;",
      'export const linkedPackageMarker = `${selfMarker}:${internalMarker}`;',
      'export const combinedMarker = `${linkedMarker}:${kernelMarker}`;',
      '',
    ].join('\n'));
    writeText(kitSelfSource, "export const selfMarker = 'self-source' as const;\n");
    writeText(kitInternalSource, "export const internalMarker = 'internal-source' as const;\n");
    writeLinkedPackage(kernelRoot, '@aurelia/linked-kernel');
    writeText(kernelSource, "export const kernelMarker = 'kernel-source' as const;\n");

    linkDirectory(kitRoot, path.join(appRoot, 'node_modules', '@acme', 'aurelia-linked-kit'));
    linkDirectory(
      kernelRoot,
      path.join(kitRoot, 'node_modules', '@aurelia', 'linked-kernel'),
    );

    const runtime = await createSemanticRuntime({
      workspaceRoot: appRoot,
      storeKey: `test:linked-package-source-integration:${path.basename(root)}`,
      projects: [{
        projectKey: 'app',
        rootDir: appRoot,
        sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
      }],
    });
    const project = runtime.workspace.projects[0]!;
    const evaluationAccess = runtime.projectEvaluations.acquire(
      project,
      aureliaAppProjectEvaluationProfile,
    );
    const evaluation = evaluationAccess.readBaseline();
    const appSource = evaluation.readEvaluatedSources().find((source) =>
      sameHostPath(source.sourceFile.fileName, mainFile)
    );
    const evaluatedKit = evaluation.readEvaluatedSources().find((source) =>
      sameHostPath(source.sourceFile.fileName, kitSource)
    );

    expect(appSource?.evaluation.environment.readValue('appMarker')).toMatchObject({
      kind: EvaluationValueKind.String,
      value: 'linked-source',
    });
    expect(appSource?.evaluation.environment.readValue('appPackageMarker')).toMatchObject({
      kind: EvaluationValueKind.String,
      value: 'self-source:internal-source',
    });
    expect(evaluatedKit).toMatchObject({
      admission: { role: SourceFileRole.ExternalSource },
      packageOrigin: {
        packageInstance: {
          name: '@acme/aurelia-linked-kit',
          version: '1.0.0',
        },
      },
    });
    expect(evaluation.readEvaluatedSources().some((source) =>
      sameHostPath(source.sourceFile.fileName, kernelSource)
    )).toBe(false);
    for (const sourcePath of [kitSelfSource, kitInternalSource]) {
      expect(evaluation.readEvaluatedSources().find((source) =>
        sameHostPath(source.sourceFile.fileName, sourcePath)
      )).toMatchObject({ admission: { role: SourceFileRole.ExternalSource } });
    }
    expect(evaluation.profile.sourceHost.moduleResolutions).toMatchObject({
      resolvedByLinkedSource: 3,
      frameworkExternalBoundaries: 1,
    });

    const typeSystem = runtime.typeSystemProjects.acquire(
      project,
      evaluationAccess.generation,
    ).readProject();
    const kitProgramSource = typeSystem.readProgramSourceFileByHostPath(kitSource);
    const kitSelfProgramSource = typeSystem.readProgramSourceFileByHostPath(kitSelfSource);
    const kitInternalProgramSource = typeSystem.readProgramSourceFileByHostPath(kitInternalSource);
    const kernelProgramSource = typeSystem.readProgramSourceFileByHostPath(kernelSource);
    expect(kitProgramSource).not.toBeNull();
    expect(kitSelfProgramSource).not.toBeNull();
    expect(kitInternalProgramSource).not.toBeNull();
    expect(kernelProgramSource).not.toBeNull();
    expect(typeSystem.program.getRootFileNames().some((fileName) =>
      [kitSource, kitSelfSource, kitInternalSource, kernelSource].some((sourcePath) =>
        sameHostPath(fileName, sourcePath)
      )
    )).toBe(false);
    for (const sourcePath of [kitSource, kitSelfSource, kitInternalSource, kernelSource]) {
      expect(typeSystem.readProgramSourceFileRoleByHostPath(sourcePath)).toBe(SourceFileRole.ExternalSource);
      expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(sourcePath)).toBe(false);
    }
    expect(typeSystem.program.getSemanticDiagnostics().filter((diagnostic) => diagnostic.code === 2307)).toEqual([]);

    const linkedMarker = typeSystem.readProgramExportedSymbol(
      '@acme/aurelia-linked-kit',
      'linkedMarker',
    );
    expect(path.resolve(linkedMarker!.declarations![0]!.getSourceFile().fileName)).toBe(path.resolve(kitSource));
    expect(project.sourceFiles).toEqual([
      expect.objectContaining({ path: 'src/main.ts', role: SourceFileRole.AppSource }),
    ]);
  }, 30_000);
});

function writeLinkedPackage(
  packageRoot: string,
  name: string,
  dependencies: Readonly<Record<string, string>> = {},
): void {
  writeJson(path.join(packageRoot, 'package.json'), {
    name,
    version: '1.0.0',
    type: 'module',
    types: 'dist/types/index.d.ts',
    exports: {
      '.': {
        types: './dist/types/index.d.ts',
        import: './dist/esm/index.js',
      },
    },
    dependencies,
  });
  writeJson(path.join(packageRoot, 'tsconfig.json'), {
    compilerOptions: {
      rootDir: 'src',
      declarationDir: 'dist/types',
    },
  });
}

function temporaryRoot(): string {
  const root = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'aurelia-linked-package-integration-')));
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
