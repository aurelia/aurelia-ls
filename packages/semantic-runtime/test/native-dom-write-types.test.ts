import path from 'node:path';
import { expect, test } from 'vitest';
import {
  createSemanticRuntime, NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority,
} from '../src/index.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

test('separates native DOMString input from its readback and keeps app-owned targets distinct', async () => {
  const root = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-convention-minimal-app');
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(root, 'src/my-app.ts'), `
    import { customElement } from 'aurelia';
    import template from './my-app.html';
    @customElement({ name: 'strict-field', bindables: ['value'], template: '<template></template>' })
    class StrictField { value = ''; }
    @customElement({ name: 'my-app', dependencies: [StrictField], template })
    export class MyApp {
      amount = 42; lower = 0; upper = 100; increment = 2; count = 42; areaValue = 42;
      typeName = 'text'; conditional = 42; fileValue = 42; modelValue = 42;
      nativeNumber = 42; customObserverValue = 42; unsupported = Symbol('key');
    }`);
  overlay.write(path.join(root, 'src/main.ts'), `
    import { AppTask, Aurelia, NodeObserverLocator, StandardConfiguration, ValueAttributeObserver } from '@aurelia/runtime-html';
    import { MyApp } from './my-app';
    class CustomValueObserver extends ValueAttributeObserver {}
    new Aurelia().register(StandardConfiguration, AppTask.creating(NodeObserverLocator, locator => {
      locator.useConfig('DIV', 'textContent', { type: CustomValueObserver, events: ['change'] });
    })).app({ component: MyApp, host: document.body }).start();`);
  overlay.write(path.join(root, 'src/my-app.html'), [
    '<input type="number" value.bind="amount" min.to-view="lower" max.to-view="upper" step.to-view="increment">',
    '<span textcontent.to-view="count"></span><textarea value.bind="areaValue"></textarea>',
    '<input type.bind="typeName" value.bind="conditional"><input type="file" value.to-view="fileValue">',
    '<input type="number" value-as-number.bind="nativeNumber"><strict-field value.to-view="modelValue"></strict-field>',
    '<div textcontent.two-way="customObserverValue"></div><span textcontent.to-view="unsupported"></span>',
  ].join('\n'));
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const rows = app.bindingDataFlows({ size: 100 }).value.rows;
    const forName = (name: string) => {
      const selected = rows.filter(row => row.sourceName === name);
      expect(selected, name).toHaveLength(1);
      return selected[0]!;
    };
    for (const name of ['amount', 'lower', 'upper', 'increment', 'count', 'areaValue']) {
      expect(forName(name).sourceToTargetAssignable, name).toBe(true);
    }
    for (const name of ['amount', 'areaValue']) {
      expect(forName(name)).toMatchObject({ targetToSourceValueType: 'string', targetToSourceAssignable: false });
    }
    expect(forName('nativeNumber')).toMatchObject({ sourceToTargetAssignable: true, targetToSourceAssignable: true });
    expect(forName('conditional').sourceToTargetAssignable).toBeNull();
    for (const name of ['fileValue', 'modelValue', 'unsupported']) expect(forName(name).sourceToTargetAssignable, name).toBe(false);
    expect(app.bindingTargetAccesses({ size: 100 }).value.rows).toContainEqual(expect.objectContaining({
      targetProperty: 'textContent', strategy: 'custom-node-observer',
    }));
    expect(forName('customObserverValue').sourceToTargetAssignable).not.toBe(true);
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
}, 30_000);
