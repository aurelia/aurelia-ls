import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticResourceInventoryOriginKind,
  SourceFileRole,
  type SemanticResourceInventoryResult,
  type SemanticRuntimeAnswer,
} from '../src/index.js';
import { ResolvedEvaluationModuleSourceScope } from '../src/evaluation/package-origin.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe('resource discovery package origin', () => {
  test('keeps graph-linked resources in the current package project-owned without granting edit ownership', async () => {
    const appRoot = temporaryRoot();
    const mainSource = path.join(appRoot, 'src', 'main.ts');
    const selfWidgetSource = path.join(appRoot, 'src', 'self-widget.ts');
    const importWidgetSource = path.join(appRoot, 'src', 'import-widget.ts');

    writeJson(path.join(appRoot, 'package.json'), {
      name: '@acme/workbench-app',
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: {
        '@aurelia/runtime-html': '2.0.0',
      },
      imports: {
        '#import-widget': './src/import-widget.ts',
      },
      exports: {
        './self-widget': {
          types: './dist/types/self-widget.d.ts',
          import: './src/self-widget.ts',
        },
      },
    });
    writeJson(path.join(appRoot, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        experimentalDecorators: true,
        strict: true,
      },
      files: ['src/main.ts'],
    });
    writeText(mainSource, [
      "import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';",
      "import { SelfWidget } from '@acme/workbench-app/self-widget';",
      "import { ImportWidget } from '#import-widget';",
      '',
      '@customElement({',
      "  name: 'workbench-app',",
      "  template: '<self-widget></self-widget><import-widget></import-widget>',",
      '  dependencies: [SelfWidget, ImportWidget],',
      '})',
      'export class WorkbenchApp {}',
      '',
      'new Aurelia()',
      '  .register(StandardConfiguration)',
      '  .app({ host: document.body, component: WorkbenchApp })',
      '  .start();',
      '',
    ].join('\n'));
    writeText(
      path.join(appRoot, 'dist', 'types', 'self-widget.d.ts'),
      'export declare class SelfWidget {}\n',
    );
    writeText(selfWidgetSource, [
      "import { customElement } from '@aurelia/runtime-html';",
      '',
      "@customElement({ name: 'self-widget', template: '<span>self</span>' })",
      'export class SelfWidget {}',
      '',
    ].join('\n'));
    writeText(importWidgetSource, [
      "import { customElement } from '@aurelia/runtime-html';",
      '',
      "@customElement({ name: 'import-widget', template: '<span>import</span>' })",
      'export class ImportWidget {}',
      '',
    ].join('\n'));

    const runtime = await createSemanticRuntime({
      workspaceRoot: appRoot,
      storeKey: `resource-current-package-origin:${path.basename(appRoot)}`,
      projects: [{
        projectKey: 'workbench-app',
        rootDir: appRoot,
        sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
      }],
    });
    try {
      const projectKey = runtime.workspace.projects[0]!.projectKey;
      const answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.ResourceInventory,
        projectKey,
        includeAuthoringTemplates: true,
        page: { size: 100 },
      }) as SemanticRuntimeAnswer<SemanticResourceInventoryResult>;
      const selfWidget = answer.value.rows.find((row) => row.name === 'self-widget');
      const importWidget = answer.value.rows.find((row) => row.name === 'import-widget');

      for (const widget of [selfWidget, importWidget]) {
        expect(widget?.origin).toMatchObject({
          kind: SemanticResourceInventoryOriginKind.Project,
          projectKey,
          packageName: null,
          catalogGroup: null,
        });
        expect(widget?.sources.implementation?.sourceFileRole).toBe('app-source');
      }

      const app = await runtime.openApp({ projectKey });
      for (const sourceFilePath of [selfWidgetSource, importWidgetSource]) {
        expect(app.emission.evaluation.packageOriginForModuleKey(sourceFilePath)).toMatchObject({
          sourceScope: ResolvedEvaluationModuleSourceScope.AuthoredProject,
          packageInstance: {
            name: '@acme/workbench-app',
            version: '1.0.0',
          },
        });
        expect(runtime.authoredSourceOwnership({ sourceFilePath }).value.owners).toEqual([]);
      }
      expect(runtime.authoredSourceOwnership({ sourceFilePath: mainSource }).value.owners).toHaveLength(1);
    } finally {
      runtime.clearAnalysisCache();
    }
  }, 60_000);

  test.each([false, true])(
    'projects resolver-owned package identity without granting authored ownership (preserveSymlinks=%s)',
    async (preserveSymlinks) => {
      const fixtureRoot = temporaryRoot();
      const appRoot = path.join(fixtureRoot, 'app');
      const physicalPackageRoot = path.join(fixtureRoot, 'packages', 'aurelia-resource-kit');
      const logicalPackageRoot = path.join(appRoot, 'node_modules', '@acme', 'aurelia-resource-kit');
      const packageSource = path.join(physicalPackageRoot, 'src', 'index.ts');

      writeJson(path.join(appRoot, 'package.json'), {
        name: 'package-origin-app',
        private: true,
        dependencies: {
          '@acme/aurelia-resource-kit': '0.0.0',
          '@aurelia/runtime-html': '2.0.0',
        },
      });
      writeJson(path.join(appRoot, 'tsconfig.json'), {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          preserveSymlinks,
          experimentalDecorators: true,
          strict: true,
        },
        include: ['src/**/*.ts'],
      });
      writeText(path.join(appRoot, 'src', 'main.ts'), [
        "import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';",
        "import { PackageWidget } from '@acme/aurelia-resource-kit';",
        '',
        '@customElement({',
        "  name: 'package-origin-app',",
        "  template: '<package-widget></package-widget>',",
        '  dependencies: [PackageWidget],',
        '})',
        'export class PackageOriginApp {}',
        '',
        'new Aurelia()',
        '  .register(StandardConfiguration)',
        '  .app({ host: document.body, component: PackageOriginApp })',
        '  .start();',
        '',
      ].join('\n'));

      writeJson(path.join(physicalPackageRoot, 'package.json'), {
        name: '@acme/aurelia-resource-kit',
        version: '0.0.0',
        type: 'module',
        dependencies: {
          '@aurelia/runtime-html': '2.0.0',
        },
        exports: {
          '.': {
            types: './dist/types/index.d.ts',
            import: './dist/esm/index.js',
          },
        },
      });
      writeText(
        path.join(physicalPackageRoot, 'dist', 'types', 'index.d.ts'),
        'export declare class PackageWidget {}\n',
      );
      writeText(packageSource, [
        "import { customElement } from '@aurelia/runtime-html';",
        '',
        "@customElement({ name: 'package-widget', template: '<span>package</span>' })",
        'export class PackageWidget {}',
        '',
      ].join('\n'));
      linkDirectory(physicalPackageRoot, logicalPackageRoot);

      const runtime = await createSemanticRuntime({
        workspaceRoot: appRoot,
        storeKey: `resource-package-origin:${preserveSymlinks}:${path.basename(fixtureRoot)}`,
      });
      try {
        const answer = await runtime.answerAppQuery({
          kind: SemanticAppQueryKind.ResourceInventory,
          includeAuthoringTemplates: true,
          page: { size: 100 },
        }) as SemanticRuntimeAnswer<SemanticResourceInventoryResult>;
        const app = answer.value.rows.find((row) => row.name === 'package-origin-app');
        const packageWidget = answer.value.rows.find((row) => row.name === 'package-widget');

        expect(app?.origin).toMatchObject({
          kind: SemanticResourceInventoryOriginKind.Project,
          projectKey: 'package-origin-app',
          packageName: null,
        });
        expect(packageWidget?.origin).toMatchObject({
          kind: SemanticResourceInventoryOriginKind.Package,
          projectKey: null,
          packageName: '@acme/aurelia-resource-kit',
          catalogGroup: null,
        });
        expect(packageWidget?.sources.implementation?.sourceFileRole).toBe('external-source');
        expect(runtime.authoredSourceOwnership({ sourceFilePath: packageSource }).value.owners).toEqual([]);
      } finally {
        runtime.clearAnalysisCache();
      }
    },
    60_000,
  );
});

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(packageRoot, '.resource-package-origin-'));
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
