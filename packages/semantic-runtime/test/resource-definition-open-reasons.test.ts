import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { SemanticAppQueryKind } from '../src/api/contracts.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('resource definition open reasons', () => {
  let workspaceRoot: string;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(packageRoot, '.resource-definition-open-reasons-'));
    await writeWorkspaceFiles(workspaceRoot, {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
        include: ['src'],
      }),
      'src/main.ts': [
        "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { OpenReasonApp } from './open-reason-app.js';",
        'new Aurelia()',
        '  .register(StandardConfiguration)',
        '  .app({ host: document.body, component: OpenReasonApp })',
        '  .start();',
      ].join('\n'),
      'src/open-reason-app.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import { DefaultStrictPanel, ExplicitLoosePanel, ExplicitStrictPanel } from './strict-panels.js';",
        'declare function runtimeTemplate(): unknown;',
        'declare const runtimeStrict: boolean;',
        '@customElement({',
        "  name: 'open-reason-app',",
        '  template: 42,',
        '  capture: 42,',
        '  shadowOptions: 42,',
        "  strict: 'yes',",
        '  dependencies: [DefaultStrictPanel, ExplicitLoosePanel, ExplicitStrictPanel],',
        '})',
        'export class OpenReasonApp {}',
        '@customElement({',
        "  name: 'dynamic-template-app',",
        '  template: runtimeTemplate(),',
        '})',
        'export class DynamicTemplateApp {}',
        "@customElement({ name: 'default-strict-app', template: '' })",
        'export class DefaultStrictApp {}',
        "@customElement({ name: 'explicit-loose-app', template: '', strict: false })",
        'export class ExplicitLooseApp {}',
        "@customElement({ name: 'explicit-strict-app', template: '', strict: true })",
        'export class ExplicitStrictApp {}',
        "@customElement({ name: 'dynamic-strict-app', template: '', strict: runtimeStrict })",
        'export class DynamicStrictApp {}',
      ].join('\n'),
      'src/strict-panels.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import defaultTemplate from './default-strict.html';",
        "import looseTemplate from './explicit-loose.html';",
        "import strictTemplate from './explicit-strict.html';",
        'interface Item { readonly label: string; }',
        "@customElement({ name: 'default-strict-panel', template: defaultTemplate })",
        'export class DefaultStrictPanel { readonly maybeItem: Item | null = null; }',
        "@customElement({ name: 'explicit-loose-panel', template: looseTemplate, strict: false })",
        'export class ExplicitLoosePanel { readonly maybeItem: Item | null = null; }',
        "@customElement({ name: 'explicit-strict-panel', template: strictTemplate, strict: true })",
        'export class ExplicitStrictPanel { readonly maybeItem: Item | null = null; }',
      ].join('\n'),
      'src/default-strict.html': '<p>${maybeItem.label}</p>',
      'src/explicit-loose.html': '<p>${maybeItem.label}</p>',
      'src/explicit-strict.html': '<p>${maybeItem.label}</p>',
      'src/aurelia-assets.d.ts': [
        "declare module '*.html' {",
        '  const value: string;',
        '  export default value;',
        '}',
      ].join('\n'),
    });
  });

  afterAll(async () => {
    if (workspaceRoot != null) {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  });

  test('retains a typed framework-semantic cause for closed wrong-shaped metadata fields', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:resource-definition-open-reasons:${path.basename(workspaceRoot)}`,
    });

    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const definitions = app.emission.resources.sources.flatMap((source) => source.convergence.definitions);
    const strictFor = (name: string) => {
      const definition = definitions.find((candidate) =>
        'name' in candidate && candidate.name === name
      );
      return definition != null && 'strict' in definition ? definition.strict : undefined;
    };
    expect(strictFor('default-strict-app')).toBe(false);
    expect(strictFor('explicit-loose-app')).toBe(false);
    expect(strictFor('explicit-strict-app')).toBe(true);
    expect(strictFor('dynamic-strict-app')).toBeNull();
    const seams = runtime.workspace.store.readOpenSeams().filter((seam) =>
      seam.seamKindKey === KernelVocabulary.Resource.OpenDefinitionField.key
      && seam.summary.startsWith('Custom element ')
    );

    const closedShapeSeams = seams.filter((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.ResourceDefinitionFieldOpen)
    );
    expect(closedShapeSeams.map((seam) => seam.summary)).toEqual(expect.arrayContaining([
      'Custom element capture metadata did not close to a boolean or predicate.',
      'Custom element template metadata did not close to markup or an imported template.',
      'Custom element shadowOptions did not close to an object.',
      'Custom element strict metadata did not close to a boolean.',
    ]));
    expect(seams.every((seam) => seam.reasonKinds.length > 0)).toBe(true);
    expect(closedShapeSeams.every((seam) =>
      seam.reasonKinds.length === 1
      && seam.reasonKinds[0] === OpenSeamReasonKind.ResourceDefinitionFieldOpen
    )).toBe(true);
    const dynamicTemplate = seams.find((seam) =>
      seam.summary === 'Custom element template metadata did not close to markup or an imported template.'
      && !seam.reasonKinds.includes(OpenSeamReasonKind.ResourceDefinitionFieldOpen)
    );
    expect(dynamicTemplate?.reasonKinds).toEqual([OpenSeamReasonKind.HostEnvironmentValue]);
    const dynamicStrict = seams.find((seam) =>
      seam.summary === 'Custom element strict metadata did not close to a boolean.'
      && seam.reasonKinds.includes(OpenSeamReasonKind.HostEnvironmentValue)
    );
    expect(dynamicStrict?.reasonKinds).toEqual([OpenSeamReasonKind.HostEnvironmentValue]);
  }, 30_000);

  test('uses the framework non-strict default while preserving explicit strict diagnostics', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:resource-definition-strict-default:${path.basename(workspaceRoot)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const nullishDiagnosticCount = (filePath: string): number => app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath },
      diagnosticProjection: 'type-projection',
      page: { size: 100 },
    }).value.rows.filter((row) => row.missingInputs.includes('typescript:TS18047')).length;

    expect(nullishDiagnosticCount('src/default-strict.html')).toBe(0);
    expect(nullishDiagnosticCount('src/explicit-loose.html')).toBe(0);
    expect(nullishDiagnosticCount('src/explicit-strict.html')).toBe(1);
  }, 30_000);
});

async function writeWorkspaceFiles(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
}
