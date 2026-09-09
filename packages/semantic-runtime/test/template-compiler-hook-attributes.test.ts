import path from 'node:path';

import { expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { materializeSemanticAppTemplateCompilerHandoffs, TemplateCompilerCompiledHandoffState } from '../src/template/browser-template.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const fixtureRoot = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-convention-minimal-app');

test('lowers hook-created attributes and preserves removal/re-add identity through complete definitions', async () => {
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(fixtureRoot, 'src/my-app.ts'), `
import { customElement, customAttribute } from '@aurelia/runtime-html';
@customAttribute({ name: 'highlight', bindables: ['value'] })
class Highlight { value = ''; }
@customElement({ name: 'generated-gate', template: '<au-slot></au-slot>', bindables: ['value'] })
class GeneratedGate {
  value = '';
  static processContent(el: HTMLElement) {
    el.removeAttribute('title.bind');
    el.setAttribute('value.bind', 'hostValue');
    el.setAttribute('class', 'changed');
    el.removeAttribute('class');
    el.setAttribute('data-added', 'retained');
    const button = el.children[0];
    button.setAttribute('click.trigger', 'activate()');
    button.setAttribute('title.bind', 'title');
    el.children[1].setAttribute('highlight.bind', 'color');
    el.children[2].setAttribute('if.bind', 'visible');
    el.children[3].setAttribute('repeat.for', 'item of items');
    const input = el.children[4];
    input.removeAttribute('value.bind');
    input.setAttribute('value.bind', 'newValue');
    input.removeAttribute('data-remove');
    return true;
  }
}
@customElement({ name: 'transient-gate', template: '' })
class TransientGate {
  static processContent(el: HTMLElement) {
    el.setAttribute('title.bind', 'neverBound???');
    el.removeAttribute('title.bind');
  }
}
@customElement({ name: 'suppressed-gate', template: '' })
class SuppressedGate {
  static processContent(el: HTMLElement) {
    el.firstElementChild!.setAttribute('title.bind', 'notCompiled');
    return false;
  }
}
@customElement({ name: 'generated-view', dependencies: [GeneratedGate, Highlight],
  template: '<generated-gate title.bind="oldHost???" class="before"><button>Click</button><div></div><span>Conditional</span><b>Repeated</b><input value.bind="oldValue???" type="text" data-remove="gone"></generated-gate>' })
class GeneratedView {
  hostValue = 'host'; title = 'title'; color = 'red'; visible = true; items = [1, 2]; oldValue = 'old'; newValue = 'new';
  activate() {}
}
@customElement({ name: 'transient-view', dependencies: [TransientGate], template: '<transient-gate></transient-gate>' })
class TransientView {}
@customElement({ name: 'suppressed-view', dependencies: [SuppressedGate], template: '<suppressed-gate><span>Raw</span></suppressed-gate>' })
class SuppressedView {}
@customElement({ name: 'outer-gate', template: '<au-slot name="slot"></au-slot>' })
class OuterGate {}
@customElement({ name: 'inner-probe', template: '' })
class InnerProbe {
  static processContent(el: HTMLElement) { el.setAttribute('data-seen', String(el.hasAttribute('au-slot'))); }
}
@customElement({ name: 'projected-view', dependencies: [OuterGate, InnerProbe],
  template: '<outer-gate><inner-probe au-slot="slot"></inner-probe></outer-gate>' })
class ProjectedView {}
@customElement({ name: 'my-app', template: '', dependencies: [GeneratedView, TransientView, SuppressedView, ProjectedView] })
export class MyApp {}
`);
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    projectDiscovery: 'single-root',
    storeKey: 'template-compiler-hook-attributes',
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
    const compiled = (name: string) => {
      const row = batch.resources.find((candidate) => candidate.resourceName === name);
      expect(row?.state, row?.reasons.map((reason) => `${reason.reasonKind}: ${reason.summary}`).join('\n'))
        .toBe(TemplateCompilerCompiledHandoffState.Exact);
      if (row?.value == null) throw new Error(`Missing compiled ${name}.`);
      return row.value;
    };
    const generated = compiled('generated-view');
    const values = JSON.stringify(generated.definitions.flatMap((definition) => definition.rows));
    for (const name of ['hostValue', 'activate', 'title', 'highlight', 'color', 'visible', 'items', 'newValue']) {
      expect(values, name).toContain(name);
    }
    expect(values).not.toContain('oldValue');
    expect(values).not.toContain('oldHost');
    const attributes = generated.definitions.flatMap((definition) => definition.tree.attributes);
    expect(attributes.some((attribute) => attribute.name === 'data-added' && attribute.value === 'retained')).toBe(true);
    expect(attributes.find((attribute) => attribute.name === 'data-added')?.source).toBeNull();
    expect(attributes.some((attribute) => ['class', 'data-remove', 'value.bind', 'if.bind', 'repeat.for'].includes(attribute.name))).toBe(false);
    const controllers = generated.definitions.filter((definition) => definition.owner.ownerKind === 'template-controller');
    expect(controllers).toHaveLength(2);
    expect(controllers.every((definition) => definition.sourceCompiledTemplate == null)).toBe(true);
    for (const controller of controllers) {
      const owner = controller.owner;
      if (owner.ownerKind !== 'template-controller') throw new Error('Expected generated template-controller owner.');
      const parent = generated.definitions.find((definition) => definition.definitionId === owner.parentDefinitionId);
      expect(parent?.rows[owner.parentRowIndex]?.[owner.parentInstructionIndex]?.source).toBeNull();
    }

    const transient = compiled('transient-view');
    expect(JSON.stringify(transient.definitions)).not.toContain('neverBound');
    const suppressed = compiled('suppressed-view');
    expect(suppressed.definitions.flatMap((definition) => definition.tree.attributes).some((attribute) =>
      attribute.name === 'title.bind' && attribute.value === 'notCompiled'
    )).toBe(true);
    expect(JSON.stringify(suppressed.definitions.flatMap((definition) => definition.rows))).not.toContain('notCompiled');
    // JIT removes au-slot before InnerProbe runs. Until that logical mutation reaches the hook DOM view,
    // preserve runtime compilation instead of emitting the incorrect exact data-seen="true" result.
    const projected = batch.resources.find(resource => resource.resourceName === 'projected-view');
    expect(projected?.state).toBe(TemplateCompilerCompiledHandoffState.Open);
    expect(projected?.value).toBeNull();
    expect(projected?.runtimeFallback).toBe('process-content-unsupported');
    expect(projected?.reasons.some(reason => reason.summary.includes('post-projection DOM view'))).toBe(true);
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
}, 30_000);
