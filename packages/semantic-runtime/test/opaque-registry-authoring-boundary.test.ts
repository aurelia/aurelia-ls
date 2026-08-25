import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerSelection,
} from '../src/index.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { RegistryRegistrationAdmission } from '../src/registration/registration-admission.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryRoots: string[] = [];
const registrationOpenMissingInput = 'template-resource-scope:registration-open';

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('opaque registry authoring boundary', () => {
  test('keeps declaration-only registry resources unknown without claiming complete authoring coverage', async () => {
    const fixture = opaqueRegistryFixture();
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixture.root,
      storeKey: `test:opaque-registry-authoring:${path.basename(fixture.root)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const tagCursor = sourceCursor(fixture.template, 'opaque-panel', 4);
    const knownTagCursor = sourceCursor(fixture.template, 'known-panel', 4);

    const opaqueOperation = app.emission.appWorld.diWorld.registrationOperations.find((operation) =>
      operation.admission instanceof RegistryRegistrationAdmission
      && operation.admission.registryValue?.localName === 'OpaquePlugin'
    );
    const opaqueScope = app.emission.appWorld.diWorld.registrationOpenSeamScopes.find((scope) =>
      scope.operation === opaqueOperation
    );
    expect(opaqueScope?.seam.reasonKinds).toContain(OpenSeamReasonKind.DiRegistryBodyOpen);

    const inventory = app.ask({
      kind: SemanticAppQueryKind.ResourceInventory,
      page: { size: 100 },
    });
    expect(inventory.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(inventory.value.completeness.openVisibility).toBe(1);
    expect(inventory.value.rows.some((row) => row.name.startsWith('opaque'))).toBe(false);

    const definitions = app.ask({
      kind: SemanticAppQueryKind.ResourceDefinitions,
      page: { size: 100 },
    });
    expect(definitions.value.rows.some((row) => row.name?.startsWith('opaque') === true)).toBe(false);

    const availability = app.ask({
      kind: SemanticAppQueryKind.TemplateResourceAvailability,
      cursor: tagCursor,
    });
    expect(availability.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(availability.value.completeness.openVisibility).toBe(1);
    expect(availability.value.rows.some((row) => row.resource.name.startsWith('opaque'))).toBe(false);

    const isolatedAvailability = app.ask({
      kind: SemanticAppQueryKind.TemplateResourceAvailability,
      cursor: sourceCursor(fixture.isolatedTemplate, 'isolatedMessage', 4, 'src/isolated-app.html'),
    });
    expect(isolatedAvailability.selection).toBe(SemanticRuntimeAnswerSelection.Exact);
    expect(isolatedAvailability.value.selectedTemplate?.definitionName).toBe('isolated-app');
    expect(isolatedAvailability.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(isolatedAvailability.value.completeness.openVisibility).toBe(1);

    const completion = app.ask({
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: tagCursor,
      page: { size: 100 },
    });
    expect(completion.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(completion.value.missingInputs).toContain(registrationOpenMissingInput);
    expect(completion.value.candidates.some((candidate) => candidate.name === 'opaque-panel')).toBe(false);

    const cursorInfo = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: tagCursor,
    });
    expect(cursorInfo.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(cursorInfo.value.missingInputs).toContain(registrationOpenMissingInput);
    expect(cursorInfo.value.selectedDefinition).toBeNull();

    const knownCursorInfo = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: knownTagCursor,
    });
    expect(knownCursorInfo.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(knownCursorInfo.value.selectedDefinition?.name).toBe('known-panel');
    expect(knownCursorInfo.value.uncertainty).toMatchObject({
      category: 'resource-availability-incomplete',
      affectedDomain: 'resource',
    });

    const memberCompletion = app.ask({
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: sourceCursor(fixture.template, '${message}</p>', 5),
      page: { size: 100 },
    });
    expect(memberCompletion.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(memberCompletion.value.missingInputs).not.toContain(registrationOpenMissingInput);

    const diagnostics = app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: 'src/app.html' },
      page: { size: 100 },
    });
    const appTemplate = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'app-root'
    );
    expect(appTemplate?.compilation.attributeClassification.issues.some((issue) =>
      issue.issueKind === 'unknown-binding-command'
    )).toBe(true);
    expect(appTemplate?.runtimeAnalysis.bindingBehavior.issues.some((issue) =>
      issue.issueKind === 'resource-not-found' && issue.application.behaviorName === 'opaqueBb'
    )).toBe(true);
    expect(appTemplate?.runtimeAnalysis.valueConverter.issues.some((issue) =>
      issue.issueKind === 'resource-not-found' && issue.application.converterName === 'opaqueVc'
    )).toBe(true);
    expect(diagnostics.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(diagnostics.value.rows).toEqual([]);

    const appDiagnostics = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      page: { size: 100 },
    });
    expect(appDiagnostics.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(appDiagnostics.value.rows).toEqual([]);

    const appDiagnosticSummary = app.ask({
      kind: SemanticAppQueryKind.AppDiagnosticSummary,
      page: { size: 100 },
    });
    expect(appDiagnosticSummary.coverage).toBe(SemanticRuntimeAnswerCoverage.Open);
    expect(appDiagnosticSummary.value.rows).toEqual([]);
  }, 30_000);

  test('keeps source-owned closed registry resources fully authorable', async () => {
    const fixture = sourceRegistryFixture();
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixture.root,
      storeKey: `test:source-registry-authoring:${path.basename(fixture.root)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const tagCursor = sourceCursor(fixture.template, 'source-panel', 4);

    const sourceOperation = app.emission.appWorld.diWorld.registrationOperations.find((operation) =>
      operation.admission instanceof RegistryRegistrationAdmission
      && operation.admission.registryValue?.localName === 'SourcePlugin'
    );
    expect(sourceOperation).toBeDefined();
    expect(app.emission.appWorld.diWorld.registrationOpenSeamScopes.some((scope) =>
      scope.operation === sourceOperation
    )).toBe(false);

    const inventory = app.ask({
      kind: SemanticAppQueryKind.ResourceInventory,
      page: { size: 100 },
    });
    expect(inventory.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(inventory.value.completeness.openVisibility).toBe(0);
    expect(inventory.value.rows.some((row) => row.name === 'source-panel')).toBe(true);

    const availability = app.ask({
      kind: SemanticAppQueryKind.TemplateResourceAvailability,
      cursor: tagCursor,
    });
    expect(availability.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(availability.value.rows.some((row) => row.resource.name === 'source-panel')).toBe(true);

    const completion = app.ask({
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: tagCursor,
      page: { size: 100 },
    });
    expect(completion.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(completion.value.missingInputs).not.toContain(registrationOpenMissingInput);
    expect(completion.value.candidates.some((candidate) => candidate.name === 'source-panel')).toBe(true);

    const cursorInfo = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: tagCursor,
    });
    expect(cursorInfo.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(cursorInfo.value.selectedDefinition?.name).toBe('source-panel');

    const diagnostics = app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: 'src/app.html' },
      page: { size: 100 },
    });
    expect(diagnostics.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(diagnostics.value.rows).toEqual([]);

    const appDiagnostics = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      page: { size: 100 },
    });
    expect(appDiagnostics.coverage).toBe(SemanticRuntimeAnswerCoverage.Complete);
    expect(appDiagnostics.value.rows).toEqual([]);
  }, 30_000);
});

function opaqueRegistryFixture(): {
  readonly root: string;
  readonly template: string;
  readonly isolatedTemplate: string;
} {
  const root = temporaryProjectRoot('opaque');
  const template = [
    '<opaque-panel title.bind="message"></opaque-panel>',
    '<known-panel></known-panel>',
    '<button click.delegate="handle()">Run</button>',
    '<p>${message | opaqueVc}</p>',
    '<p>${message & opaqueBb}</p>',
    '<p>${message}</p>',
    '',
  ].join('\n');
  const isolatedTemplate = '<p>${isolatedMessage}</p>\n';
  writeCommonProject(root, template, [
    "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
    "import { OpaquePlugin } from '@acme/opaque-plugin';",
    "import { App } from './app.js';",
    "import { KnownPanel } from './known-panel.js';",
    "import { IsolatedApp } from './isolated-app.js';",
    '',
    'new Aurelia()',
    '  .register(StandardConfiguration, KnownPanel, OpaquePlugin)',
    '  .app({ host: document.body, component: App })',
    '  .start();',
    '',
    'new Aurelia()',
    '  .register(StandardConfiguration)',
    '  .app({ host: document.body, component: IsolatedApp })',
    '  .start();',
    '',
  ]);
  writeProjectFile(root, 'package.json', JSON.stringify({
    name: 'opaque-registry-authoring-boundary',
    version: '0.0.0',
    type: 'module',
    dependencies: { '@acme/opaque-plugin': '0.0.0' },
  }, null, 2));
  writeProjectFile(root, 'src/known-panel.ts', [
    "import { customElement } from '@aurelia/runtime-html';",
    '',
    "@customElement({ name: 'known-panel', template: '<span>known</span>' })",
    'export class KnownPanel {}',
    '',
  ].join('\n'));
  writeProjectFile(root, 'src/isolated-app.ts', [
    "import { customElement } from '@aurelia/runtime-html';",
    "import template from './isolated-app.html';",
    '',
    "@customElement({ name: 'isolated-app', template })",
    'export class IsolatedApp {',
    "  isolatedMessage = 'isolated';",
    '}',
    '',
  ].join('\n'));
  writeProjectFile(root, 'src/isolated-app.html', isolatedTemplate);
  writeProjectFile(root, 'node_modules/@acme/opaque-plugin/package.json', JSON.stringify({
    name: '@acme/opaque-plugin',
    version: '0.0.0',
    type: 'module',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      },
    },
  }, null, 2));
  writeProjectFile(root, 'node_modules/@acme/opaque-plugin/dist/index.d.ts', [
    "import type { IRegistry } from '@aurelia/kernel';",
    'export declare const OpaquePlugin: IRegistry;',
    '',
  ].join('\n'));
  writeProjectFile(root, 'node_modules/@acme/opaque-plugin/dist/index.js', [
    "import { BindingCommand } from '@aurelia/template-compiler';",
    "import { BindingBehavior, CustomElement, ValueConverter } from '@aurelia/runtime-html';",
    "class OpaquePanel { title = ''; }",
    'class OpaqueValueConverter { toView(value) { return value; } }',
    'class OpaqueBindingBehavior {}',
    'class OpaqueDelegateCommand { build() { return null; } }',
    "const panel = CustomElement.define({ name: 'opaque-panel', bindables: ['title'] }, OpaquePanel);",
    "const converter = ValueConverter.define('opaqueVc', OpaqueValueConverter);",
    "const behavior = BindingBehavior.define('opaqueBb', OpaqueBindingBehavior);",
    "const command = BindingCommand.define('delegate', OpaqueDelegateCommand);",
    'export const OpaquePlugin = {',
    '  register(container) { container.register(panel, converter, behavior, command); },',
    '};',
    '',
  ].join('\n'));
  return { root, template, isolatedTemplate };
}

function sourceRegistryFixture(): { readonly root: string; readonly template: string } {
  const root = temporaryProjectRoot('source');
  const template = [
    '<source-panel title.bind="message"></source-panel>',
    '<p>${message}</p>',
    '',
  ].join('\n');
  writeCommonProject(root, template, [
    "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
    "import { App } from './app.js';",
    "import { SourcePlugin } from './resources.js';",
    '',
    'new Aurelia()',
    '  .register(StandardConfiguration, SourcePlugin)',
    '  .app({ host: document.body, component: App })',
    '  .start();',
    '',
  ]);
  writeProjectFile(root, 'src/resources.ts', [
    "import type { IContainer } from '@aurelia/kernel';",
    "import { customElement } from '@aurelia/runtime-html';",
    '',
    '@customElement({',
    "  name: 'source-panel',",
    "  template: '<span>${title}</span>',",
    "  bindables: ['title'],",
    '})',
    'export class SourcePanel {',
    "  title = '';",
    '}',
    '',
    'export const SourcePlugin = {',
    '  register(container: IContainer): void {',
    '    container.register(SourcePanel);',
    '  },',
    '};',
    '',
  ].join('\n'));
  return { root, template };
}

function temporaryProjectRoot(lane: string): string {
  const root = mkdtempSync(path.join(packageRoot, `.opaque-registry-${lane}-`));
  temporaryRoots.push(root);
  return root;
}

function writeCommonProject(root: string, template: string, main: readonly string[]): void {
  writeProjectFile(root, 'tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      skipLibCheck: true,
    },
    include: ['src/**/*.ts', 'src/**/*.d.ts'],
  }, null, 2));
  writeProjectFile(root, 'src/main.ts', main.join('\n'));
  writeProjectFile(root, 'src/app.ts', [
    "import { customElement } from '@aurelia/runtime-html';",
    "import template from './app.html';",
    '',
    "@customElement({ name: 'app-root', template })",
    'export class App {',
    "  message = 'hello';",
    '  handle(): void {}',
    '}',
    '',
  ].join('\n'));
  writeProjectFile(root, 'src/app.html', template);
  writeProjectFile(root, 'src/aurelia-assets.d.ts', [
    "declare module '*.html' {",
    '  const value: string;',
    '  export default value;',
    '}',
    '',
  ].join('\n'));
}

function sourceCursor(
  template: string,
  marker: string,
  markerOffset: number,
  filePath = 'src/app.html',
): { readonly filePath: string; readonly offset: number } {
  const start = template.indexOf(marker);
  if (start < 0) {
    throw new Error(`Expected template marker '${marker}'.`);
  }
  return { filePath, offset: start + markerOffset };
}

function writeProjectFile(root: string, relativePath: string, text: string): void {
  const fileName = path.join(root, relativePath);
  mkdirSync(path.dirname(fileName), { recursive: true });
  writeFileSync(fileName, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}
