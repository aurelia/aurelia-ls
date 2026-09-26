import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { SemanticAppQueryKind } from '../src/api/contracts.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

test('joins composition loads and reads object constructors without losing component candidates', async () => {
  const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-dynamic-composition');
  const templateFile = path.join(fixtureRoot, 'src/compose-dashboard-app.html');
  const scriptFile = path.join(fixtureRoot, 'src/compose-dashboard-app.ts');
  const cases = [
    ['fulfilled', 'component="chart-widget" template.bind="getAsyncTemplate()"'],
    ['rejected-template', 'component="chart-widget" template.bind="rejectedTemplate"'],
    ['open-template', 'component="chart-widget" template.bind="getOpenTemplate()"'],
    ['rejected-component', 'component.bind="rejectedComponent" template="literal"'],
    ['instance', 'component.bind="sampleInstance"'],
    ['awaited-instance', 'component.bind="awaitedInstance"'],
    ['awaited-class', 'component.bind="awaitedSummaryClass" template.bind="summaryTemplate"'],
    ['overridden', 'component.bind="overriddenInstance"'],
    ['getter', 'component.bind="getterComponent"'],
    ['throwing-getter', 'component.bind="throwingComponent"'],
    ['open-constructor', 'component.bind="openConstructorComponent"'],
    ['ordinary-object', 'component.bind="summaryComponent" template.bind="summaryTemplate"'],
    ['string-constructor', 'component.bind="stringConstructorComponent"'],
  ] as const;
  const templates = cases.map(([, attributes]) => `<au-compose ${attributes} model.bind="selectedWidget"></au-compose>`);
  const template = templates.join('\n');
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(templateFile, template);
  overlay.write(scriptFile, fs.readFileSync(scriptFile, 'utf8').replace(
    "readonly selectedWidgetId = 'stock';",
    [
      "readonly selectedWidgetId = 'stock';",
      'readonly sampleInstance = new ChartWidget();',
      'readonly awaitedInstance = Promise.resolve(this.sampleInstance);',
      'readonly awaitedSummaryClass = Promise.resolve(SummaryPanel);',
      'readonly overriddenInstance = (() => { const value = new ChartWidget(); (value as any).constructor = InventoryWidget; return value; })();',
      'readonly getterComponent = new ConstructorGetter();',
      'readonly throwingComponent = new ThrowingConstructorGetter();',
      'readonly openConstructorComponent = new OpenConstructorGetter();',
      'readonly stringConstructorComponent = { constructor: "chart-widget" };',
    ].join('\n'),
  ).replace('class SummaryPanel {', [
    'class ConstructorGetter { get ["constructor"]() { return ChartWidget; } }',
    'class ThrowingConstructorGetter { get ["constructor"]() { throw new Error("constructor getter failed"); } }',
    'class OpenConstructorGetter { get ["constructor"]() { return (globalThis as any).externalComponent; } }',
    'class SummaryPanel {',
  ].join('\n')));
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    projectDiscovery: 'single-root',
    storeKey: 'test:runtime-composition:load-and-constructor',
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation', includeAuthoringTemplates: false });
    const rows = app.ask({ kind: SemanticAppQueryKind.RuntimeCompositions, detail: 'handles', page: { size: 100 } }).value.rows
      .filter((row) => row.renderingDefinitionName === 'compose-dashboard-app' && row.renderingContextKind === 'definition-resource');
    const rowFor = (name: typeof cases[number][0]) => {
      const index = cases.findIndex(([label]) => label === name);
      const row = rows.find((candidate) => candidate.source?.start != null && candidate.source.end != null
        && template.slice(candidate.source.start, candidate.source.end) === templates[index]);
      expect(row, name).toBeDefined();
      return row!;
    };
    const composition = app.emission.templates.resources.find((resource) => resource.compilation.definition.name === 'compose-dashboard-app')!
      .runtimeAnalysis.runtimeComposition;
    const childFor = (name: typeof cases[number][0]) => {
      const owner = composition.controllers.find((controller) => controller.productHandle === rowFor(name).handles?.compositionControllerProductHandle)!;
      const reference = owner.resolvedComponents[0]!.composedController!;
      return composition.composedControllers.find((controller) => controller.productHandle === reference.productHandle)!;
    };
    expect(rowFor('fulfilled')).toMatchObject({ loadState: 'ready', composedChildControllerCount: 1, openReason: null });
    expect(rowFor('rejected-template')).toMatchObject({
      loadState: 'rejected', templateInputValueStateKind: 'rejected', componentResolutionKind: 'static-value',
      resolvedComponentNames: ['chart-widget'], composedChildControllerCount: 0, composedChildContainerCount: 0,
    });
    expect(rowFor('open-template')).toMatchObject({
      loadState: 'open', resolvedComponentNames: ['chart-widget'], composedChildControllerCount: 0,
    });
    expect(rowFor('open-template').openReason).not.toBeNull();
    expect(rowFor('rejected-component')).toMatchObject({ loadState: 'rejected', composedChildControllerCount: 0 });
    expect(rowFor('instance')).toMatchObject({
      componentResolutionKind: 'static-value', resolvedComponentNames: ['chart-widget'], composedChildControllerCount: 1,
    });
    expect(rowFor('overridden')).toMatchObject({
      componentResolutionKind: 'static-value', resolvedComponentNames: ['inventory-widget'], composedChildControllerCount: 1,
    });
    expect(rowFor('getter').openReason).toBeNull();
    expect(rowFor('getter')).toMatchObject({
      componentResolutionKind: 'static-value', resolvedComponentNames: ['chart-widget'], composedChildControllerCount: 1,
      activationHandoffKinds: ['activate-absent'],
    });
    expect(childFor('instance').viewModel?.targetType?.display).toBe('ChartWidget');
    expect(rowFor('awaited-instance')).toMatchObject({ loadState: 'ready', composedChildControllerCount: 1 });
    expect(childFor('awaited-instance').viewModel?.targetType?.display).toBe('ChartWidget');
    expect(rowFor('awaited-class')).toMatchObject({
      loadState: 'ready', componentResolutionKind: 'object-view-model',
      activationHandoffKinds: ['model-assignable'], composedChildControllerCount: 0,
    });
    expect(childFor('overridden').name).toBe('inventory-widget');
    expect(childFor('overridden').viewModel?.targetType?.display).toBe('ChartWidget');
    expect(childFor('getter').name).toBe('chart-widget');
    expect(childFor('getter').viewModel?.targetType?.display).toBe('ConstructorGetter');
    for (const name of ['instance', 'overridden', 'getter'] as const) {
      expect(childFor(name).viewModel?.identityHandle).toBeNull();
      expect(childFor(name).viewModel?.addressHandle).not.toBeNull();
    }
    for (const name of ['throwing-getter', 'open-constructor'] as const) {
      expect(rowFor(name)).toMatchObject({ componentResolutionKind: 'open', composedChildControllerCount: 0 });
      expect(rowFor(name).openReason).not.toBeNull();
    }
    for (const name of ['ordinary-object', 'string-constructor'] as const) {
      expect(rowFor(name)).toMatchObject({
        componentResolutionKind: 'object-view-model', resolvedComponentNames: [], composedChildControllerCount: 0, openReason: null,
      });
    }
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
}, 30_000);
