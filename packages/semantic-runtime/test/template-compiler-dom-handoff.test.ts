import path from 'node:path';

import { expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  TemplateCompilerCompiledHandoffState,
} from '../src/template/browser-template.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';
import type { TemplateCompilerCompiledHandoffElement } from '../src/template/template-compiler-compiled-handoff-value.js';

const fixtureRoot = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-convention-minimal-app');

test('compiles owned DOM effects and distinguishes unsupported and abrupt hooks in one app', async () => {
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(fixtureRoot, 'src/my-app.ts'), [
    "import { customElement, customAttribute } from '@aurelia/runtime-html';",
    "@customElement({ name: 'filter-gate', template: '<au-slot></au-slot>' })",
    'class FilterGate {',
    '  static processContent(el: HTMLElement) {',
    "    el.setAttribute('title', el.getAttribute('title') + '!');",
    '    el.removeChild(el.firstChild!);',
    "    el.firstElementChild!.setAttribute('title.bind', 'kept');",
    '    return true;',
    '  }',
    '}',
    "@customElement({ name: 'nested-gate', template: '<au-slot></au-slot>' })",
    'class NestedGate {',
    '  static processContent(el: HTMLElement) {',
    "    el.firstElementChild!.firstElementChild!.remove();",
    '    return true;',
    '  }',
    '}',
    "@customElement({ name: 'unsupported-gate', template: '<au-slot></au-slot>' })",
    'class UnsupportedGate {',
    '  static processContent(el: HTMLElement) {',
    '    el.removeChild(el.firstChild!);',
    '    el.getBoundingClientRect();',
    '    return false;',
    '  }',
    '}',
    "@customElement({ name: 'abrupt-gate', template: '<au-slot></au-slot>' })",
    "class AbruptGate { static processContent() { throw 'authored failure'; } }",
    "@customElement({ name: 'temporal-gate', template: '<au-slot></au-slot>' })",
    'class TemporalGate { static enabled = false; static processContent() { return this.enabled; } }',
    "@customElement({ name: 'dom-view', dependencies: [FilterGate],",
    "  template: '<filter-gate title=\"before\"><span>${removed}</span><b title.bind=\"removed\">${kept}</b></filter-gate>' })",
    "class DomView { removed = 'removed'; kept = 'kept'; }",
    "@customElement({ name: 'nested-view', dependencies: [NestedGate],",
    "  template: '<nested-gate><section><i>${removed}</i><b>${kept}</b></section></nested-gate>' })",
    "class NestedView { removed = 'removed'; kept = 'kept'; }",
    "@customElement({ name: 'unsupported-view', dependencies: [UnsupportedGate],",
    "  template: '<unsupported-gate><span>${message}</span></unsupported-gate>' })",
    "class UnsupportedView { message = 'original'; }",
    "@customElement({ name: 'abrupt-view', dependencies: [AbruptGate], template: '<abrupt-gate></abrupt-gate>' })",
    'class AbruptView {}',
    "@customElement({ name: 'temporal-view', dependencies: [TemporalGate], template: '<temporal-gate></temporal-gate>' })",
    'class TemporalView {}',
    ...['type', 'min', 'max', 'step', 'value'].map(name =>
      `@customAttribute({ name: '${name}', bindables: ['value'] }) class Range${name} { value = ''; }`),
    "@customElement({ name: 'range-consumed-view', dependencies: [Rangetype, Rangemin, Rangemax, Rangestep, Rangevalue], template: '<input type=\"range\" min=\"80\" max=\"100\" step=\"2\" value=\"90\">' })",
    'class RangeConsumedView {}',
    "@customElement({ name: 'range-plain-view', template: '<input type=\"RANGE\" min=\"80\" max=\"100\"><input type=\"text\"><template><input type=\"range\" min=\"10\" max=\"20\"></template><template as-custom-element=\"scoped-range\"><input type=\"range\" min=\"30\" max=\"50\"></template><scoped-range></scoped-range>' })",
    'class RangePlainView {}',
    "@customElement({ name: 'range-edit', template: '<au-slot></au-slot>' })",
    "class RangeEdit { static processContent(el: HTMLElement) { el.children[0].setAttribute('value', '94'); el.children[1].removeAttribute('value'); } }",
    "@customElement({ name: 'range-edited-view', dependencies: [RangeEdit], template: '<range-edit><input type=\"range\" min=\"80\" max=\"100\"><input type=\"range\" min=\"80\" max=\"100\" value=\"88\"></range-edit>' })",
    'class RangeEditedView {}',
    "@customElement({ name: 'range-suppress', template: '' })",
    "class RangeSuppress { static processContent(el: HTMLElement) { el.firstElementChild!.setAttribute('value', '92'); return false; } }",
    "@customElement({ name: 'range-suppressed-view', dependencies: [RangeSuppress], template: '<range-suppress><input type=\"range\" min=\"80\" max=\"100\"></range-suppress>' })",
    'class RangeSuppressedView {}',
    "@customElement({ name: 'my-app', template: '', dependencies: [DomView, NestedView, UnsupportedView, AbruptView, TemporalView, RangeConsumedView, RangePlainView, RangeEditedView, RangeSuppressedView] })",
    'export class MyApp {}',
  ].join('\n'));
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    projectDiscovery: 'single-root',
    storeKey: 'template-compiler-dom-handoff',
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const app = await runtime.openApp({ includeCompilerOccurrencePrecedents: true, telemetry: { inquiryProfile: 'aot' } });
    const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
    const resource = (name: string) => {
      const row = batch.resources.find(candidate => candidate.resourceName === name);
      if (row == null) throw new Error(`Missing consuming definition '${name}'.`);
      return row;
    };
    for (const name of ['dom-view', 'nested-view']) {
      const row = resource(name);
      expect(row.state, row.reasons.map(reason => `${reason.reasonKind}: ${reason.summary}`).join('\n'))
        .toBe(TemplateCompilerCompiledHandoffState.Exact);
      if (row.value == null) throw new Error(`No compiled ${name}.`);
      const nodes = row.value.definitions.flatMap(definition => definition.tree.nodes);
      expect(nodes.some(node => node.nodeKind === 'element' && ['span', 'i'].includes(node.tagName))).toBe(false);
      expect(nodes.some(node => node.nodeKind === 'element' && node.tagName === 'b')).toBe(true);
      const instructions = JSON.stringify(row.value.definitions.flatMap(definition => definition.rows));
      expect(instructions).toContain('kept');
      expect(instructions).not.toContain('removed');
      const projections = row.value.definitions.filter(definition => definition.owner.ownerKind === 'projection');
      expect(projections.length).toBeGreaterThan(0);
      expect(projections.every(definition => definition.sourceCompiledTemplate == null)).toBe(true);
    }
    const unsupported = resource('unsupported-view');
    expect(unsupported.state).toBe(TemplateCompilerCompiledHandoffState.Open);
    expect(unsupported.runtimeFallback).toBe('process-content-unsupported');
    expect(unsupported.reasons.some(reason => reason.summary.includes('getBoundingClientRect'))).toBe(true);
    expect(unsupported.address.sourceAttachment?.templateSource?.oldText).toContain('<span>${message}</span>');
    expect(resource('temporal-view').runtimeFallback).toBe('process-content-unsupported');
    expect(resource('abrupt-view').state).toBe(TemplateCompilerCompiledHandoffState.Abrupt);
    expect(resource('abrupt-view').runtimeFallback).toBeNull();
    const rangeNodes = (name: string) => {
      const row = resource(name);
      expect(row.state, row.reasons.map(reason => reason.summary).join('\n')).toBe(TemplateCompilerCompiledHandoffState.Exact);
      expect(row.value?.schemaVersion).toBe('semantic-runtime/template-compiler-compiled-handoff/v8');
      return row.value!.definitions.flatMap(definition => definition.tree.nodes)
        .filter((node): node is TemplateCompilerCompiledHandoffElement => node.nodeKind === 'element' && node.tagName === 'input');
    };
    const plain = rangeNodes('range-plain-view');
    expect(plain.map(node => node.nativeRangeInitialization)).toEqual([
      { attributes: [{ name: 'type', value: 'RANGE' }, { name: 'min', value: '80' }, { name: 'max', value: '100' }], removals: [] },
      null,
      { attributes: [{ name: 'type', value: 'range' }, { name: 'min', value: '10' }, { name: 'max', value: '20' }], removals: [] },
      { attributes: [{ name: 'type', value: 'range' }, { name: 'min', value: '30' }, { name: 'max', value: '50' }], removals: [] },
    ]);
    const localRange = resource('range-plain-view').value!.definitions.find(definition => definition.owner.ownerKind === 'local-template');
    expect(localRange).toBeDefined();
    expect(localRange!.tree.nodes.find(node => node.nodeKind === 'element' && node.tagName === 'input'))
      .toMatchObject({ nativeRangeInitialization: {
        attributes: [{ name: 'type', value: 'range' }, { name: 'min', value: '30' }, { name: 'max', value: '50' }], removals: [],
      } });
    const consumed = rangeNodes('range-consumed-view')[0]!;
    expect(consumed.attributeIds).toEqual([]);
    expect(consumed.nativeRangeInitialization).toEqual({
      attributes: [{ name: 'type', value: 'range' }, { name: 'min', value: '80' }, { name: 'max', value: '100' },
        { name: 'step', value: '2' }, { name: 'value', value: '90' }],
      removals: ['type', 'min', 'max', 'step', 'value'],
    });
    const edited = rangeNodes('range-edited-view');
    expect(edited.map(node => node.nativeRangeInitialization)).toEqual([
      { attributes: [{ name: 'type', value: 'range' }, { name: 'min', value: '80' }, { name: 'max', value: '100' }, { name: 'value', value: '94' }], removals: [] },
      { attributes: [{ name: 'type', value: 'range' }, { name: 'min', value: '80' }, { name: 'max', value: '100' }], removals: [] },
    ]);
    expect(rangeNodes('range-suppressed-view')[0]!.nativeRangeInitialization).toEqual({
      attributes: [{ name: 'type', value: 'range' }, { name: 'min', value: '80' }, { name: 'max', value: '100' }, { name: 'value', value: '92' }],
      removals: [],
    });
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
}, 60_000);
