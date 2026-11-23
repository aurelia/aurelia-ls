import path from 'node:path';
import { expect, test } from 'vitest';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

test('selects show, focus and load value contracts from the resource hydrated in each component', async () => {
  const root = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-minimal-app');
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(root, 'src/main.ts'), `
    import Aurelia from 'aurelia';
    import { RouterConfiguration } from '@aurelia/router';
    import { App } from './app';
    Aurelia.register(RouterConfiguration).app(App).start();
  `);
  overlay.write(path.join(root, 'src/app.ts'), `
    import { customElement, customAttribute, bindable } from 'aurelia';
    import template from './app.html';
    @customAttribute('show') class LabelShow { @bindable value = ''; }
    @customAttribute('focus') class LabelFocus { @bindable value = ''; }
    @customAttribute('load') class LabelLoad { @bindable params = ''; }
    @customElement({
      name: 'labels-panel', dependencies: [LabelShow, LabelFocus, LabelLoad],
      template: '<p show.bind="label"></p><p show.bind="count"></p><p focus.bind="label"></p><a load="params.bind: label"></a>',
    })
    class LabelsPanel { label = 'label'; count = 3; }
    @customElement({ name: 'app-root', dependencies: [LabelsPanel], template })
    export class App { items = [1]; empty = false; count = 2; focusFlag = false; message = 'abc'; }
  `);
  overlay.write(path.join(root, 'src/app.html'), `
    <section show.bind="items.length"></section><section hide.bind="items.length"></section>
    <section show.bind="empty"></section><input focus.bind="count"><input focus.bind="focusFlag">
    <a load="route: detail; params.bind: { id: message }">Detail</a>
    <labels-panel></labels-panel>
  `);
  const projectInputAuthority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay));
  const runtime = await createSemanticRuntime({ workspaceRoot: root, projectInputAuthority });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const rows = app.bindingDataFlows({ size: 100 }).value.rows;
    const genuine = rows.filter(row => row.definitionName === 'app-root');
    const local = rows.filter(row => row.definitionName === 'labels-panel');
    expect(genuine.filter(row => row.targetValueType === 'unknown' && row.sourceToTargetAssignable === true)
      .map(row => row.sourceType).sort()).toEqual(['boolean', 'number', 'number']);
    expect(genuine).toContainEqual(expect.objectContaining({
      sourceName: 'count', valueChannelKind: 'truthiness-input', sourceToTargetAssignable: true, targetToSourceAssignable: false,
    }));
    expect(genuine).toContainEqual(expect.objectContaining({
      sourceName: 'focusFlag', targetValueType: 'boolean', sourceToTargetAssignable: true, targetToSourceAssignable: true,
    }));
    expect(genuine).toContainEqual(expect.objectContaining({
      targetProperty: 'params', valueChannelKind: 'router-parameters', sourceToTargetAssignable: true,
    }));
    expect(local.filter(row => row.sourceName === 'label').map(row => [
      row.targetProperty, row.valueChannelKind, row.targetValueType, row.sourceToTargetAssignable,
    ]).sort()).toEqual([
      ['params', 'raw-property', 'string', true],
      ['value', 'raw-property', 'string', true],
      ['value', 'raw-property', 'string', true],
    ]);
    expect(local).toContainEqual(expect.objectContaining({
      sourceName: 'count', targetValueType: 'string', sourceToTargetAssignable: false,
    }));
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
