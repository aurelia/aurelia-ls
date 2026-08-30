import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { CustomElementTemplateModuleRole } from '../src/resources/custom-element-definition.js';
import { ResourceCarrierKind } from '../src/resources/resource-kind.js';
import type {
  EffectiveResourceDefinitionSelection,
} from '../src/resources/resource-recognition-project-pass.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('resource definition source attachment', () => {
  test('detaches exact mixed-carrier geometry and keeps effective selection causal', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-effective-definitions');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:resource-definition-source-attachment:mixed-carriers',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const selections = app.emission.resources.definitionSelections;

    const decoratorOverStatic = namedSelection(selections, 'decorator-effective');
    expect(decoratorOverStatic.sourceAttachment?.carrierKind).toBe(ResourceCarrierKind.Decorator);
    expect(decoratorOverStatic.sourceAttachment?.carrier.oldText).toBe("@customElement('decorator-effective')");
    expect(decoratorOverStatic.sourceAttachment?.definitionExpression?.oldText).toBe("'decorator-effective'");
    expect(decoratorOverStatic.sourceAttachment?.target?.oldText).toBe('DecoratorOverStatic');
    expect(decoratorOverStatic.sourceAttachment?.targetDeclaration?.oldText).toContain('export class DecoratorOverStatic');
    expect(decoratorOverStatic.supersededSourceAttachments).toHaveLength(1);
    expect(decoratorOverStatic.supersededSourceAttachments[0]?.carrierKind).toBe(ResourceCarrierKind.StaticAu);
    expect(decoratorOverStatic.supersededSourceAttachments[0]?.carrier.oldText).toContain("name: 'static-shadowed'");

    const defineOverDecorator = namedSelection(selections, 'define-effective');
    expect(defineOverDecorator.sourceAttachment?.carrierKind).toBe(ResourceCarrierKind.DefineCall);
    expect(defineOverDecorator.sourceAttachment?.carrier.oldText).toContain('CustomElement.define({');
    expect(defineOverDecorator.sourceAttachment?.definitionExpression?.oldText).toContain("name: 'define-effective'");
    expect(defineOverDecorator.supersededSourceAttachments.map((attachment) => attachment.carrierKind))
      .toEqual([ResourceCarrierKind.Decorator]);

    const inline = namedSelection(selections, 'alias-carrier').sourceAttachment;
    expect(inline?.templateModuleRole).toBe(CustomElementTemplateModuleRole.InlineValue);
    expect(inline?.templateSource?.sourceFileAddressHandle).toBe(inline?.owningSourceFileAddressHandle);
    expect(inline?.templateSource?.oldText).toBe('<template>${value}</template>');

    const imported = namedSelection(selections, 'effective-definitions-app').sourceAttachment;
    expect(imported?.carrierKind).toBe(ResourceCarrierKind.Decorator);
    expect(imported?.templateModuleRole).toBe(CustomElementTemplateModuleRole.TemplateValue);
    expect(imported?.templateSource?.sourceFileAddressHandle).not.toBe(imported?.owningSourceFileAddressHandle);
    expect(normalize(imported?.templateSource?.sourcePath)).toBe('src/effective-definitions-app.html');
    expect(imported?.templateSource?.oldText).toContain('<template>');

    const anonymous = namedSelection(selections, 'anonymous-card').sourceAttachment;
    const importedTarget = namedSelection(selections, 'imported-target-card').sourceAttachment;
    expect(anonymous?.carrierKind).toBe(ResourceCarrierKind.DefineCall);
    expect(importedTarget?.carrierKind).toBe(ResourceCarrierKind.DefineCall);
    expect(anonymous?.owningModuleKey).toBe(importedTarget?.owningModuleKey);
    expect(anonymous?.owningSourceFileAddressHandle).toBe(importedTarget?.owningSourceFileAddressHandle);
    expect(anonymous?.carrier.start).not.toBe(importedTarget?.carrier.start);
    expect(anonymous?.definitionProductHandle).not.toBe(importedTarget?.definitionProductHandle);

    for (const attachment of app.emission.resources.readDefinitionSourceAttachments()) {
      await expectOldTextAtRange(attachment.carrier);
      if (attachment.definitionExpression != null) {
        await expectOldTextAtRange(attachment.definitionExpression);
      }
      if (attachment.target != null) {
        await expectOldTextAtRange(attachment.target);
      }
      if (attachment.targetDeclaration != null) {
        await expectOldTextAtRange(attachment.targetDeclaration);
      }
      if (attachment.templateSource != null) {
        await expectOldTextAtRange(attachment.templateSource);
      }
    }
  }, 30_000);

  test('keeps a convention class and its companion template as separate authored carriers', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-conventions-enabled');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:resource-definition-source-attachment:convention',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const convention = namedSelection(app.emission.resources.definitionSelections, 'convention-card').sourceAttachment;

    expect(convention?.carrierKind).toBe(ResourceCarrierKind.Convention);
    expect(convention?.templateModuleRole).toBe(CustomElementTemplateModuleRole.DefinitionModule);
    expect(convention?.definitionExpression).toBeNull();
    expect(convention?.carrier.oldText).toContain('export class ConventionCard');
    expect(normalize(convention?.carrier.sourcePath)).toBe('src/convention-card.ts');
    expect(normalize(convention?.templateSource?.sourcePath)).toBe('src/convention-card.html');
    expect(convention?.templateSource?.sourceFileAddressHandle).not.toBe(convention?.owningSourceFileAddressHandle);
    expect(convention?.templateSource?.oldText).toContain('${message}');
  }, 30_000);

  test('admits convention carriers through the AOT Vite provider and its nested convention options', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.resource-source-attachment-aot-vite-'));
    try {
      await writeWorkspaceFiles(workspaceRoot, {
        'package.json': JSON.stringify({
          name: 'aot-vite-convention-provider',
          private: true,
          type: 'module',
          dependencies: { aurelia: '2.0.0-rc.2' },
        }),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
          },
          include: ['src'],
        }),
        'vite.config.ts': [
          "import { aureliaAot } from '@aurelia-ls/aot-vite';",
          "import { defineConfig } from 'vite';",
          'declare const provider: unknown;',
          'export default defineConfig({',
          '  plugins: aureliaAot({',
          '    provider,',
          "    conventions: { include: 'src/**/*.{ts,html}' },",
          '  }),',
          '});',
        ].join('\n'),
        'src/main.ts': [
          "import Aurelia from 'aurelia';",
          "import { App } from './app';",
          'Aurelia.app(App).start();',
        ].join('\n'),
        'src/app.ts': 'export class App {}',
        'src/app.html': '<aot-provider-card></aot-provider-card>',
        'src/aot-provider-card.ts': 'export class AotProviderCard {}',
        'src/aot-provider-card.html': '<p>${message}</p>',
      });
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: `contract:resource-definition-source-attachment:aot-vite:${path.basename(workspaceRoot)}`,
      });
      const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
      const attachment = namedSelection(
        app.emission.resources.definitionSelections,
        'aot-provider-card',
      ).sourceAttachment;

      expect(attachment?.carrierKind).toBe(ResourceCarrierKind.Convention);
      expect(normalize(attachment?.carrier.sourcePath)).toBe('src/aot-provider-card.ts');
      expect(normalize(attachment?.templateSource?.sourcePath)).toBe('src/aot-provider-card.html');
      expect(attachment?.templateSource?.oldText).toBe('<p>${message}</p>');
    } finally {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  }, 30_000);

  test('distinguishes template values from convention definition modules and incidental pairs', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.resource-template-module-role-'));
    try {
      await writeWorkspaceFiles(workspaceRoot, {
        'package.json': JSON.stringify({
          name: 'template-module-role-fixture',
          private: true,
          type: 'module',
          dependencies: { aurelia: '2.0.0-rc.2' },
        }),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
          },
          include: ['src'],
        }),
        'vite.config.ts': [
          "import aurelia from '@aurelia/vite-plugin';",
          "import { defineConfig } from 'vite';",
          'export default defineConfig({ plugins: [aurelia()] });',
        ].join('\n'),
        'src/main.ts': [
          "import Aurelia, { customElement } from 'aurelia';",
          "import { ObjectNoTemplate } from './object-no-template';",
          "import { ObjectNullTemplate } from './object-null-template';",
          "import { ObjectUndefinedTemplate } from './object-undefined-template';",
          "import { StaticAliasPair } from './static-alias-pair';",
          "import { StaticPair } from './static-pair';",
          "import { StringPair } from './string-pair';",
          "import { ValuePair } from './value-pair';",
          '@customElement({',
          "  name: 'template-role-app',",
          "  template: '<object-no-template></object-no-template>',",
          '  dependencies: [ObjectNoTemplate, ObjectNullTemplate, ObjectUndefinedTemplate, StaticAliasPair, StaticPair, StringPair, ValuePair],',
          '})',
          'class TemplateRoleApp {}',
          'Aurelia.app(TemplateRoleApp).start();',
        ].join('\n'),
        'src/object-no-template.ts': [
          "import { customElement } from 'aurelia';",
          "@customElement({ name: 'object-no-template' })",
          'export class ObjectNoTemplate {}',
        ].join('\n'),
        'src/object-no-template.html': '<p>incidental pair</p>',
        'src/object-null-template.ts': [
          "import { customElement } from 'aurelia';",
          "@customElement({ name: 'object-null-template', template: null })",
          'export class ObjectNullTemplate {}',
        ].join('\n'),
        'src/object-null-template.html': '<p>suppressed pair</p>',
        'src/object-undefined-template.ts': [
          "import { customElement } from 'aurelia';",
          "@customElement({ name: 'object-undefined-template', template: undefined })",
          'export class ObjectUndefinedTemplate {',
          "  static template = '<p>type fallback</p>';",
          '}',
        ].join('\n'),
        'src/object-undefined-template.html': '<p>overwritten pair</p>',
        'src/string-pair.ts': [
          "import { customElement } from 'aurelia';",
          "@customElement('string-pair')",
          'export class StringPair {}',
        ].join('\n'),
        'src/string-pair.html': '<p>string pair</p>',
        'src/static-alias-pair.ts': [
          "import type { CustomElementStaticAuDefinition } from 'aurelia';",
          'const definition: CustomElementStaticAuDefinition = {',
          "  type: 'custom-element',",
          "  name: 'static-alias-pair',",
          '};',
          'export class StaticAliasPair {',
          '  static $au = definition;',
          '}',
        ].join('\n'),
        'src/static-alias-pair.html': '<p>incidental static pair</p>',
        'src/static-pair.ts': [
          "import type { CustomElementStaticAuDefinition } from 'aurelia';",
          'export class StaticPair {',
          '  static $au: CustomElementStaticAuDefinition = {',
          "    type: 'custom-element',",
          "    name: 'static-pair',",
          '  };',
          '}',
        ].join('\n'),
        'src/static-pair.html': '<p>static pair</p>',
        'src/value-pair.ts': [
          "import { customElement } from 'aurelia';",
          "import template from './value-pair.html';",
          'const base = { template };',
          "const definition = { ...base, name: 'value-pair' };",
          '@customElement(definition)',
          'export class ValuePair {}',
        ].join('\n'),
        'src/value-pair.html': '<p>value pair</p>',
        'src/aurelia-assets.d.ts': "declare module '*.html' { const value: string; export default value; }",
      });
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: `contract:resource-template-module-role:${path.basename(workspaceRoot)}`,
      });
      const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
      const attachment = (name: string) => namedSelection(
        app.emission.resources.definitionSelections,
        name,
      ).sourceAttachment!;

      expect(attachment('object-no-template')).toMatchObject({
        templateModuleRole: CustomElementTemplateModuleRole.None,
        templateSource: null,
      });
      expect(attachment('object-null-template')).toMatchObject({
        templateModuleRole: CustomElementTemplateModuleRole.None,
        templateSource: null,
      });
      expect(attachment('object-undefined-template')).toMatchObject({
        templateModuleRole: CustomElementTemplateModuleRole.InlineValue,
        templateSource: expect.objectContaining({ oldText: '<p>type fallback</p>' }),
      });
      expect(attachment('string-pair').templateModuleRole)
        .toBe(CustomElementTemplateModuleRole.DefinitionModule);
      expect(attachment('static-alias-pair')).toMatchObject({
        templateModuleRole: CustomElementTemplateModuleRole.None,
        templateSource: null,
      });
      expect(attachment('static-pair').templateModuleRole)
        .toBe(CustomElementTemplateModuleRole.DefinitionModule);
      expect(attachment('value-pair').templateModuleRole)
        .toBe(CustomElementTemplateModuleRole.TemplateValue);
    } finally {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  }, 30_000);

  test('retains recognition pressure with exact source text without deciding transform eligibility', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.resource-source-attachment-open-'));
    try {
      await writeWorkspaceFiles(workspaceRoot, {
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            experimentalDecorators: true,
          },
          include: ['src'],
        }),
        'src/main.ts': [
          "import Aurelia, { customElement } from 'aurelia';",
          'declare const runtimeAliases: readonly string[];',
          '@customElement({',
          "  name: 'open-card',",
          '  aliases: runtimeAliases,',
          "  template: '<p>open</p>',",
          '})',
          'export class OpenCard {}',
          'Aurelia.app(OpenCard).start();',
        ].join('\n'),
      });
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: `contract:resource-definition-source-attachment:open:${path.basename(workspaceRoot)}`,
      });
      const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
      const attachment = namedSelection(app.emission.resources.definitionSelections, 'open-card').sourceAttachment;
      const aliasOpen = attachment?.recognitionOpenReasons.find((reason) =>
        reason.summary.includes('alias')
      );

      expect(aliasOpen).toBeDefined();
      expect(aliasOpen?.reasonKinds.length).toBeGreaterThan(0);
      expect(aliasOpen?.source?.oldText).toBe('aliases: runtimeAliases');
      if (aliasOpen?.source != null) {
        await expectOldTextAtRange(aliasOpen.source);
      }
      expect('eligible' in (attachment ?? {})).toBe(false);
    } finally {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  }, 30_000);
});

function namedSelection(
  selections: readonly EffectiveResourceDefinitionSelection[],
  name: string,
): EffectiveResourceDefinitionSelection {
  const selection = selections.find((candidate) =>
    'name' in candidate.definition && candidate.definition.name === name
  );
  if (selection == null) {
    throw new Error(`Expected resource definition '${name}'.`);
  }
  expect(selection.sourceAttachment).not.toBeNull();
  return selection;
}

async function expectOldTextAtRange(
  source: {
    readonly sourceFilePath: string;
    readonly start: number;
    readonly end: number;
    readonly oldText: string;
  },
): Promise<void> {
  const text = await readFile(source.sourceFilePath, 'utf8');
  expect(text.slice(source.start, source.end)).toBe(source.oldText);
}

function pressureFixtureRoot(name: string): string {
  return path.join(packageRoot, 'fixtures/pressure', name);
}

function normalize(value: string | null | undefined): string | null {
  return value?.replaceAll('\\', '/') ?? null;
}

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
