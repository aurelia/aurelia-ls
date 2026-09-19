import path from 'node:path';

import { expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { materializeSemanticAppTemplateCompilerHandoffs, TemplateCompilerCompiledHandoffState } from '../src/template/browser-template.js';
import * as nativeSlotProjection from '../src/template/template-compiler-native-slot-outlet-value.js';
import { TemplateCompilerSiteCursorFrontierKind } from '../src/template/template-compiler-site-cursor-event.js';
import { TemplateCompilerFrameworkInstructionType } from '../src/template/template-instruction-runtime-value.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const fixtureRoot = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-convention-minimal-app');

test('lowers hook-created nodes with existing binding, controller and projection semantics without authored spans', async () => {
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(fixtureRoot, 'src/my-app.ts'), `
import { customElement, customAttribute } from '@aurelia/runtime-html';
@customAttribute({ name: 'highlight', bindables: ['value'] })
class Highlight { value = ''; }
@customElement({ name: 'generated-card', template: '<au-slot name="body"></au-slot>', bindables: ['value'] })
class GeneratedCard { value = ''; }
@customElement({ name: 'node-maker', template: '<au-slot></au-slot>' })
class NodeMaker {
  static processContent(el: HTMLElement) {
    const doc = el.ownerDocument;
    const fragment = doc.createDocumentFragment();
    const wrapper = doc.createElement('section');
    wrapper.setAttribute('data-generated', 'wrapper');
    wrapper.appendChild(doc.createComment('hook-comment'));
    wrapper.appendChild(doc.createTextNode('static text'));
    const button = doc.createElement('button');
    button.setAttribute('title.bind', 'title');
    button.setAttribute('click.trigger', 'activate()');
    button.setAttribute('highlight.bind', 'color');
    button.appendChild(doc.createTextNode('Hello \\u0024{title}!'));
    wrapper.appendChild(button);
    const repeated = doc.createElement('b');
    repeated.setAttribute('repeat.for', 'item of items');
    repeated.setAttribute('if.bind', 'visible');
    repeated.appendChild(doc.createTextNode('Item \\u0024{item}'));
    wrapper.appendChild(repeated);
    const card = doc.createElement('generated-card');
    card.setAttribute('value.bind', 'title');
    const projected = doc.createElement('span');
    projected.setAttribute('au-slot', 'body');
    projected.appendChild(doc.createTextNode('Projection \\u0024{title}'));
    card.appendChild(projected);
    wrapper.appendChild(card);
    const outlet = doc.createElement('au-slot');
    outlet.setAttribute('name', 'generated-outlet');
    const droppedFirst = doc.createElement('i');
    droppedFirst.setAttribute('au-slot', 'unused');
    droppedFirst.appendChild(doc.createTextNode('discarded outlet child one'));
    outlet.appendChild(droppedFirst);
    const droppedSecond = doc.createElement('b');
    droppedSecond.setAttribute('au-slot', 'unused');
    droppedSecond.appendChild(doc.createTextNode('discarded outlet child two'));
    outlet.appendChild(droppedSecond);
    outlet.appendChild(doc.createTextNode('Generated fallback \\u0024{title}'));
    wrapper.appendChild(outlet);
    fragment.appendChild(wrapper);
    el.appendChild(fragment);
  }
}
@customElement({ name: 'generated-view', dependencies: [NodeMaker, GeneratedCard, Highlight], template: '<node-maker></node-maker>' })
class GeneratedView { title = 'hello'; color = 'red'; visible = true; items = [1, 2]; activate() {} }
@customElement({ name: 'invalid-maker', template: '<au-slot></au-slot>' })
class InvalidMaker {
  static processContent(el: HTMLElement) { el.appendChild(el.ownerDocument.createTextNode('Invalid \\u0024{???}')); }
}
@customElement({ name: 'invalid-view', dependencies: [InvalidMaker], template: '<invalid-maker></invalid-maker>' })
class InvalidView {}
@customElement({ name: 'let-maker', template: '' })
class LetMaker {
  static processContent(el: HTMLElement) {
    const node = el.ownerDocument.createElement('let');
    node.setAttribute('generated.bind', 'title');
    el.appendChild(node);
  }
}
@customElement({ name: 'let-view', dependencies: [LetMaker], template: '<let-maker></let-maker>' })
class LetView { title = 'hello'; }
@customElement({ name: 'marker-maker', template: '' })
class MarkerMaker {
  static processContent(el: HTMLElement) { el.appendChild(el.ownerDocument.createComment('au')); }
}
@customElement({ name: 'marker-view', dependencies: [MarkerMaker], template: '<marker-maker></marker-maker>' })
class MarkerView {}
@customElement({ name: 'native-maker', template: '' })
class NativeMaker {
  static processContent(el: HTMLElement, platform: { document: Document }) {
    el.setAttribute('data-tentative', 'discarded');
    platform.document.createElement('native-widget');
  }
}
@customElement({ name: 'native-view', dependencies: [NativeMaker], template: '<native-maker data-authored="native"></native-maker>' })
class NativeView {}
@customElement({ name: 'resource-maker', template: '' })
class ResourceMaker {
  static processContent(el: HTMLElement, platform: { document: Document }) {
    el.setAttribute('data-tentative', 'discarded');
    const img = platform.document.createElement('img');
    img.setAttribute('src', '/hook-owned-probe.png');
  }
}
@customElement({ name: 'resource-view', dependencies: [ResourceMaker], template: '<resource-maker data-authored="resource"></resource-maker>' })
class ResourceView {}
@customElement({ name: 'control-maker', template: '' })
class ControlMaker {
  static processContent(el: HTMLElement) {
    el.setAttribute('data-tentative', 'discarded');
    el.firstElementChild!.setAttribute('type', 'text');
  }
}
@customElement({ name: 'control-view', dependencies: [ControlMaker], template: '<control-maker><input type="number" value="invalid"></control-maker>' })
class ControlView {}
@customElement({ name: 'slot-maker', template: '' })
class SlotMaker {
  static processContent(el: HTMLElement) {
    const doc = el.ownerDocument;
    el.appendChild(doc.createElement('slot'));
    const named = doc.createElement('slot');
    named.setAttribute('name', 'generated-static');
    // A different generated interpolation must not make the static slot name dynamic through null product handles.
    named.setAttribute('title', 'Title \\u0024{title}');
    el.appendChild(named);
    const bound = doc.createElement('slot');
    bound.setAttribute('name.bind', 'boundName');
    el.appendChild(bound);
    const interpolated = doc.createElement('slot');
    interpolated.setAttribute('name', 'prefix-\\u0024{interpolatedName}');
    el.appendChild(interpolated);
    const repeated = doc.createElement('slot');
    repeated.setAttribute('name', 'repeated-\\u0024{item}');
    repeated.setAttribute('repeat.for', 'item of items');
    el.appendChild(repeated);
  }
}
@customElement({ name: 'shadow-view', shadowOptions: { mode: 'open' }, dependencies: [SlotMaker], template: '<slot-maker></slot-maker>' })
class ShadowView { title = 'hello'; boundName = 'bound'; interpolatedName = 'other'; items = [1, 2]; }
@customElement({ name: 'slot-invalid-view', dependencies: [SlotMaker], template: '<slot-maker></slot-maker>' })
class SlotInvalidView {}
@customElement({ name: 'text-editor', template: '<au-slot></au-slot>' })
class TextEditor {
  static processContent(el: HTMLElement) {
    el.children[0].firstChild!.data = 'Changed \\u0024{title}';
    el.children[1].firstChild!.nodeValue = 'Inserted \\u0024{added}';
    el.children[2].firstChild!.textContent = 'now static';
    const restored = el.children[3].firstChild!;
    const original = restored.nodeValue;
    restored.nodeValue = 'temporary \\u0024{discarded}';
    restored.nodeValue = original;
    el.children[4].firstChild!.data = 'Item \\u0024{item}';
    el.children[5].textContent = 'Replaced \\u0024{replacement}';
  }
}
@customElement({ name: 'edited-text-view', dependencies: [TextEditor], template: '<text-editor><p>Old \\u0024{old}</p><p>static</p><p>Removed \\u0024{removed}</p><p>Restored \\u0024{restored}</p><p repeat.for="item of items">Old \\u0024{oldRepeat}</p><p><b>Removed \\u0024{removedChild}</b><!--replaced--></p></text-editor>' })
class EditedTextView { title = 'new'; added = 'added'; restored = 'restored'; replacement = 'replacement'; items = [1, 2]; }
@customElement({ name: 'comment-editor', template: '' })
class CommentEditor {
  static processContent(el: HTMLElement) { el.firstChild!.data = 'au'; }
}
@customElement({ name: 'edited-marker-view', dependencies: [CommentEditor], template: '<comment-editor><!--ordinary--></comment-editor>' })
class EditedMarkerView {}
@customElement({ name: 'my-app', template: '', dependencies: [GeneratedView, InvalidView, LetView, MarkerView, NativeView, ResourceView, ControlView, ShadowView, SlotInvalidView, EditedTextView, EditedMarkerView] })
export class MyApp {}
`);
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    projectDiscovery: 'single-root',
    storeKey: 'template-compiler-hook-generated-nodes',
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  const nativeOutlets = vi.spyOn(nativeSlotProjection, 'projectTemplateCompilerNativeSlotOutlets');
  try {
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
    const generated = batch.resources.find(resource => resource.resourceName === 'generated-view');
    expect(generated?.state, generated?.reasons.map(reason => `${reason.reasonKind}: ${reason.summary}`).join('\n'))
      .toBe(TemplateCompilerCompiledHandoffState.Exact);
    if (generated?.value == null) throw new Error('Missing generated definition.');
    const definitions = generated.value.definitions;
    const rows = JSON.stringify(definitions.flatMap(definition => definition.rows));
    for (const name of ['title', 'activate', 'color', 'highlight', 'generated-card', 'items', 'visible', 'item', 'generated-outlet']) {
      expect(rows, name).toContain(name);
    }
    expect(definitions.filter(definition => definition.owner.ownerKind === 'template-controller')).toHaveLength(2);
    expect(definitions.filter(definition => definition.owner.ownerKind === 'projection').length).toBeGreaterThanOrEqual(2);
    const attributes = definitions.flatMap(definition => definition.tree.attributes);
    expect(attributes.find(attribute => attribute.name === 'data-generated')).toMatchObject({ value: 'wrapper', source: null });
    expect(attributes.some(attribute => ['title.bind', 'click.trigger', 'highlight.bind', 'repeat.for', 'if.bind', 'au-slot'].includes(attribute.name)))
      .toBe(false);
    const trees = JSON.stringify(definitions.map(definition => definition.tree));
    const nodes = definitions.flatMap(definition => definition.tree.nodes);
    // Nodes retain structural product addresses, not fabricated authored source spans.
    expect(nodes.find(node => node.nodeKind === 'element' && node.tagName === 'section')?.source)
      .toMatchObject({ kind: 'unexpanded-address' });
    expect(nodes.find(node => node.nodeKind === 'text' && node.text === 'static text')?.source)
      .toMatchObject({ kind: 'unexpanded-address' });
    expect(nodes.find(node => node.nodeKind === 'comment' && node.text === 'hook-comment')?.source)
      .toMatchObject({ kind: 'unexpanded-address' });
    expect(trees).toContain('static text');
    expect(trees).toContain('hook-comment');
    expect(trees).not.toContain('discarded outlet child');
    expect(trees).not.toContain('${title}');
    expect(trees).not.toContain('${item}');
    const invalid = batch.resources.find(resource => resource.resourceName === 'invalid-view');
    expect(invalid?.state).not.toBe(TemplateCompilerCompiledHandoffState.Exact);
    expect(invalid?.value).toBeNull();
    expect(invalid?.reasons.some(reason => reason.frontierCause?.frontierKind === TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedInvalid))
      .toBe(true);
    const generatedLet = batch.resources.find(resource => resource.resourceName === 'let-view');
    expect(generatedLet?.state, generatedLet?.reasons.map(reason => reason.summary).join('\n'))
      .toBe(TemplateCompilerCompiledHandoffState.Exact);
    expect(generatedLet?.value).not.toBeNull();
    expect(JSON.stringify(generatedLet?.value?.definitions.flatMap(definition => definition.rows))).toContain('generated');
    const reservedMarker = batch.resources.find(resource => resource.resourceName === 'marker-view');
    expect(reservedMarker?.value).toBeNull();
    expect(reservedMarker?.reasons.some(reason => reason.frontierCause?.frontierKind === TemplateCompilerSiteCursorFrontierKind.AuthoredCompilerMarkerReserved))
      .toBe(true);
    const edited = batch.resources.find(resource => resource.resourceName === 'edited-text-view');
    expect(edited?.state, edited?.reasons.map(reason => `${reason.reasonKind}: ${reason.summary}`).join('\n'))
      .toBe(TemplateCompilerCompiledHandoffState.Exact);
    if (edited?.value == null) throw new Error('Missing edited text definition.');
    const editedTextBindings = edited.value.definitions.flatMap(definition => definition.rows.flat())
      .filter(instruction => instruction.value.type === TemplateCompilerFrameworkInstructionType.TextBinding);
    expect(editedTextBindings).toHaveLength(5);
    expect(editedTextBindings.every(instruction => instruction.source == null)).toBe(true);
    const editedRows = JSON.stringify(edited.value.definitions.flatMap(definition => definition.rows));
    for (const name of ['title', 'added', 'restored', 'item', 'replacement']) expect(editedRows).toContain(name);
    for (const name of ['old', 'removed', 'discarded', 'oldRepeat', 'removedChild']) {
      expect(editedRows).not.toContain(`"name":"${name}"`);
    }
    const editedTrees = JSON.stringify(edited.value.definitions.map(definition => definition.tree));
    expect(editedTrees).toContain('now static');
    expect(editedTrees).not.toContain('Removed');
    expect(edited.value.definitions.filter(definition => definition.owner.ownerKind === 'template-controller')).toHaveLength(1);
    const editedMarker = batch.resources.find(resource => resource.resourceName === 'edited-marker-view');
    expect(editedMarker?.value).toBeNull();
    expect(editedMarker?.reasons.some(reason => reason.frontierCause?.frontierKind === TemplateCompilerSiteCursorFrontierKind.AuthoredCompilerMarkerReserved))
      .toBe(true);
    const shadow = batch.resources.find(resource => resource.resourceName === 'shadow-view');
    expect(shadow?.state, shadow?.reasons.map(reason => `${reason.reasonKind}: ${reason.summary}`).join('\n'))
      .toBe(TemplateCompilerCompiledHandoffState.Exact);
    if (shadow?.value == null) throw new Error('Missing generated native-slot definition.');
    expect(shadow.value.definitions[0]?.header.hasSlots).toBe(true);
    expect(shadow.value.definitions.slice(1).every(definition => !definition.header.hasSlots)).toBe(true);
    const outlets = nativeOutlets.mock.results.find(result => result.type === 'return'
      && result.value.value?.outlets.some(outlet => outlet.name === 'generated-static'))?.value?.value?.outlets;
    expect(outlets?.map(outlet => [outlet.nameKind, outlet.name, outlet.nameSourceAddressHandle])).toEqual([
      ['default', '', null],
      ['static', 'generated-static', null],
      ['dynamic', null, null],
      ['dynamic', null, null],
      ['dynamic', null, null],
    ]);
    expect(outlets?.every(outlet => outlet.node.productHandle == null
      && outlet.node.identityHandle == null && outlet.node.addressHandle == null)).toBe(true);
    const slotDefinitions = shadow.value.definitions;
    expect(slotDefinitions.flatMap(definition => definition.tree.nodes)
      .filter(node => node.nodeKind === 'element' && node.tagName === 'slot')).toHaveLength(5);
    expect(slotDefinitions.flatMap(definition => definition.tree.attributes)
      .filter(attribute => attribute.name === 'name')).toEqual([
        expect.objectContaining({ value: 'generated-static', source: null }),
      ]);
    const slotRows = JSON.stringify(slotDefinitions.flatMap(definition => definition.rows));
    for (const name of ['title', 'boundName', 'interpolatedName', 'items', 'item']) expect(slotRows).toContain(name);
    const invalidSlot = batch.resources.find(resource => resource.resourceName === 'slot-invalid-view');
    expect(invalidSlot?.value).toBeNull();
    expect(invalidSlot?.runtimeFallback).toBeNull();
    expect(invalidSlot?.reasons).toContainEqual(expect.objectContaining({
      summary: "Native <slot> requires Shadow DOM on root custom element 'slot-invalid-view'.",
      frontierCause: expect.objectContaining({
        frontierKind: TemplateCompilerSiteCursorFrontierKind.NativeSlotWithoutShadowDomInvalid,
        issue: null,
        source: null,
      }),
    }));
    for (const [name, refusal, template] of [
      ['native-view', 'native-custom-element-construction', '<native-maker data-authored="native"></native-maker>'],
      ['resource-view', 'native-resource-effects', '<resource-maker data-authored="resource"></resource-maker>'],
      ['control-view', 'native-control-state', '<control-maker><input type="number" value="invalid"></control-maker>'],
    ] as const) {
      const unsupported = batch.resources.find(resource => resource.resourceName === name);
      expect(unsupported?.state, unsupported?.reasons.map(reason => reason.summary).join('\n'))
        .toBe(TemplateCompilerCompiledHandoffState.Open);
      expect(unsupported?.value).toBeNull();
      expect(unsupported?.runtimeFallback).toBe('process-content-unsupported');
      expect(unsupported?.reasons).toContainEqual(expect.objectContaining({
        summary: expect.stringContaining(refusal),
        frontierCause: expect.objectContaining({
          frontierKind: TemplateCompilerSiteCursorFrontierKind.ProcessContentUnsupported,
          issue: null,
        }),
      }));
      expect(unsupported?.address?.sourceAttachment?.templateSource?.oldText).toBe(template);
    }
  } finally {
    nativeOutlets.mockRestore();
    runtime.retireWorkspaceIncarnation();
  }
}, 30_000);
