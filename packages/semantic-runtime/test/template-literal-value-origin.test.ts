import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { sourceTextContentRevision } from '../src/kernel/source-text-revision.js';
import { CustomElementTemplateKind, CustomElementTemplateModuleRole } from '../src/resources/custom-element-definition.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const fixtureRoot = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-convention-minimal-app');

describe('custom element template literal value origin', () => {
  test('joins shared and imported template values to their authored literal, not the consuming field', async () => {
    const overlay = new MutableProjectSourceOverlay();
    const source = [
      "import { customElement } from '@aurelia/runtime-html';",
      "import { importedTemplate } from './template-barrel';",
      "const sharedTemplate = '<p>${message}</p>';",
      'const template = sharedTemplate;',
      'const metadata = { template };',
      'function identity<T>(value: T): T { return value; }',
      "@customElement({ name: 'direct-literal', template: '<b>direct</b>' })",
      'export class DirectLiteral {}',
      "@customElement({ name: 'first-shared', template: sharedTemplate })",
      'export class FirstShared { message = "first"; }',
      "@customElement({ name: 'second-shared', template })",
      'export class SecondShared { message = "second"; }',
      "@customElement({ name: 'property-shared', template: metadata.template })",
      'export class PropertyShared { message = "property"; }',
      "@customElement({ name: 'returned-shared', template: identity(sharedTemplate) })",
      'export class ReturnedShared { message = "returned"; }',
      "@customElement({ name: 'static-shared' })",
      'export class StaticShared { static template = sharedTemplate; message = "static"; }',
      "@customElement({ name: 'imported-literal', template: importedTemplate })",
      'export class ImportedLiteral { message = "imported"; }',
      "@customElement({ name: 'computed-template', template: '<p>' + 'computed</p>' })",
      'export class ComputedTemplate {}',
      "@customElement({ name: 'changed-template', template: sharedTemplate.replace('message', 'changed') })",
      'export class ChangedTemplate {}',
      "@customElement({ name: 'my-app', template: '', dependencies: [",
      '  DirectLiteral, FirstShared, SecondShared, PropertyShared, ReturnedShared, StaticShared, ImportedLiteral,',
      '  ComputedTemplate, ChangedTemplate,',
      '] })',
      'export class MyApp {}',
    ].join('\n');
    const importedSource = String.raw`export const escapedTemplate = '<span title="line\nnext">\u0024{message}</span>';`;
    overlay.write(path.join(fixtureRoot, 'src/my-app.ts'), source);
    overlay.write(path.join(fixtureRoot, 'src/template-origin.ts'), importedSource);
    overlay.write(path.join(fixtureRoot, 'src/template-barrel.ts'), "export { escapedTemplate as importedTemplate } from './template-origin';");
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay));
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      projectDiscovery: 'single-root',
      storeKey: 'template-literal-value-origin',
      projectInputAuthority: inputAuthority,
    });
    try {
      const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
      const selection = (name: string) => {
        const selected = app.emission.resources.definitionSelections.find(candidate =>
          'name' in candidate.definition && candidate.definition.name === name
        );
        if (selected?.definition.type !== 'custom-element' || selected.definition.template == null) {
          throw new Error(`Expected custom element '${name}' with template metadata.`);
        }
        return { template: selected.definition.template, attachment: selected.sourceAttachment };
      };
      for (const name of ['first-shared', 'second-shared', 'property-shared', 'returned-shared', 'static-shared']) {
        const { template, attachment } = selection(name);
        expect(template.kind, name).toBe(CustomElementTemplateKind.Markup);
        expect(template.moduleRole, name).toBe(CustomElementTemplateModuleRole.InlineValue);
        expect(template.markup, name).toBe('<p>${message}</p>');
        expect(template.authoredSourceRevision, name).toBe(sourceTextContentRevision(source));
        expect(template.sourceMap, name).toBeNull();
        expect(attachment?.templateSource, name).toMatchObject({
          sourcePath: 'src/my-app.ts',
          start: source.indexOf('<p>${message}</p>'),
          end: source.indexOf('<p>${message}</p>') + '<p>${message}</p>'.length,
          oldText: '<p>${message}</p>',
        });
        // Shared source does not collapse resource ownership or its eventual compiler payload.
        expect(attachment?.carrier.oldText, name).toContain(`name: '${name}'`);
      }
      expect(selection('direct-literal').template.markup).toBe('<b>direct</b>');

      const imported = selection('imported-literal');
      const decoded = '<span title="line\nnext">${message}</span>';
      const importedStart = importedSource.indexOf('<span');
      const importedEnd = importedSource.lastIndexOf("';");
      expect(imported.template.kind).toBe(CustomElementTemplateKind.Markup);
      expect(imported.template.markup).toBe(decoded);
      expect(imported.template.authoredSourceRevision).toBe(sourceTextContentRevision(importedSource));
      expect(imported.attachment?.templateSource).toMatchObject({
        sourcePath: 'src/template-origin.ts',
        start: importedStart,
        end: importedEnd,
        oldText: importedSource.slice(importedStart, importedEnd),
      });
      expect(imported.attachment?.templateSource?.sourceFileAddressHandle)
        .not.toBe(imported.attachment?.owningSourceFileAddressHandle);
      const offsets = imported.template.sourceMap?.decodedToSourceOffsets;
      expect(offsets).toHaveLength(decoded.length + 1);
      expect(offsets?.[decoded.indexOf('\n')]).toBe(importedSource.indexOf('\\n'));
      expect(offsets?.[decoded.indexOf('${message}')]).toBe(importedSource.indexOf('\\u0024'));
      expect(offsets?.[decoded.length]).toBe(importedEnd);

      for (const name of ['computed-template', 'changed-template']) {
        const { template, attachment } = selection(name);
        expect(template.kind, name).toBe(CustomElementTemplateKind.Open);
        expect(template.markup, name).toBeNull();
        expect(attachment?.templateSource, name).toBeNull();
      }
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);
});
