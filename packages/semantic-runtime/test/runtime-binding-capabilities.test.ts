import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { RuntimeBindingKind } from '../src/template/runtime-binding.js';
import { runtimeBindingCapabilities, RuntimeBindingStateScopeHandoff } from '../src/template/runtime-binding-capabilities.js';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { materializeSemanticAppTemplateCompilerHandoffs } from '../src/template/browser-template.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const requireFramework = createRequire(path.resolve(import.meta.dirname, '../../../aurelia/package.json'));

describe('concrete native binding capabilities', () => {
  test('distinguishes parameter astBind from useScope and member presence from callback behavior', () => {
    const { DI, Registration } = requireFramework('@aurelia/kernel');
    const { Scope } = requireFramework('@aurelia/runtime');
    const { ExpressionParser } = requireFramework('@aurelia/expression-parser');
    const { PropertyBinding, BindingMode, SignalBindingBehavior } = requireFramework('@aurelia/runtime-html');
    const { TranslationBinding, I18N } = requireFramework('@aurelia/i18n');
    const { IStoreRegistry, StateBindingBehavior, StateDispatchBinding } = requireFramework('@aurelia/state');
    PropertyBinding.mix?.();
    const container = DI.createContainer().register(
      Registration.instance(IStoreRegistry, { getStore: () => store }),
      Registration.instance(I18N, {}),
      StateBindingBehavior,
      SignalBindingBehavior,
    );
    const store = { getState: () => ({ name: 'state' }), subscribe() {}, unsubscribe() {} };
    const observer = {
      getAccessor: () => ({ setValue(value: unknown, target: Record<PropertyKey, unknown>, key: PropertyKey) { target[key] = value; } }),
      getObserver: () => ({ subscribe() {}, unsubscribe() {} }),
    };
    const parser = new ExpressionParser();
    const scope = Scope.create({ name: 123 });
    const ast = parser.parse('{ name } & state', 'IsProperty');
    const translation = new TranslationBinding({}, container, observer, {}, {});
    translation.useParameter(ast);
    const parameter = translation.parameter;
    parameter.bind(scope);
    expect(parameter.value).toEqual({ name: 123 });
    expect(parameter.useScope).toBeUndefined();
    expect(parameter.limit).toBeUndefined();
    const output = {};
    const property = new PropertyBinding({ state: 0 }, container, observer, ast, output, 'value', BindingMode.toView, true);
    property.bind(scope);
    expect(output).toEqual({ value: { name: 'state' } });
    const signal = container.get(SignalBindingBehavior);
    expect(() => signal.bind(scope, parameter, 'refresh')).not.toThrow();
    const dispatch = new StateDispatchBinding(container, parser.parse('name', 'IsProperty'), {}, 'click', store, true);
    expect(() => signal.bind(scope, dispatch, 'dispatch-refresh')).not.toThrow();
    // connectable installs a member that satisfies signal's presence check; it is not a useful dispatch callback.
    expect(() => dispatch.handleChange()).toThrow();
    expect(runtimeBindingCapabilities({ bindingKind: RuntimeBindingKind.TranslationParameters })).toMatchObject({
      executesAstBind: true, handlesChange: true, rateLimit: false, stateScopeHandoff: RuntimeBindingStateScopeHandoff.None,
    });
    expect(runtimeBindingCapabilities({ bindingKind: RuntimeBindingKind.StateDispatch }).handlesChange).toBe(true);
    signal.unbind(scope, parameter);
    signal.unbind(scope, dispatch);
    parameter.unbind();
    property.unbind();
    container.dispose();
  });

  test('state mode suppresses initial expression observation without implying absence of a store subscription', () => {
    const { DI } = requireFramework('@aurelia/kernel');
    const { Scope } = requireFramework('@aurelia/runtime');
    const { ExpressionParser } = requireFramework('@aurelia/expression-parser');
    const { OneTimeBindingBehavior, SignalBindingBehavior } = requireFramework('@aurelia/runtime-html');
    const { StateBinding } = requireFramework('@aurelia/state');
    const container = DI.createContainer().register(OneTimeBindingBehavior, SignalBindingBehavior);
    const parser = new ExpressionParser();
    for (const [suffix, expectedReads] of [['', ['name']], [' & oneTime', []], [" & signal:'refresh'", ['name']]] as const) {
      const reads: string[] = [];
      let subscriptions = 0;
      const store = { getState: () => ({ name: 'state' }), subscribe() { subscriptions++; }, unsubscribe() { subscriptions--; } };
      const observer = {
        getAccessor: () => ({ setValue(value: unknown, target: Record<PropertyKey, unknown>, key: PropertyKey) { target[key] = value; } }),
        getObserver(_target: object, key: PropertyKey) { reads.push(String(key)); return { subscribe() {}, unsubscribe() {} }; },
      };
      const target = {};
      const binding = new StateBinding({}, container, observer, parser.parse(`name${suffix}`, 'IsProperty'), target, 'value', store, true);
      binding.bind(Scope.create({}));
      expect(reads).toEqual(expectedReads);
      expect(target).toEqual({ value: 'state' });
      expect(subscriptions).toBe(1);
      binding.unbind();
      expect(subscriptions).toBe(0);
    }
    container.dispose();
  });

  test('keeps independent capabilities for bindings with phase-dependent scope reads', () => {
    for (const bindingKind of [RuntimeBindingKind.Attribute, RuntimeBindingKind.SpreadValue, RuntimeBindingKind.Iterate]) {
      expect(runtimeBindingCapabilities({ bindingKind }).stateScopeHandoff)
        .toBe(RuntimeBindingStateScopeHandoff.AfterInitialEvaluation);
    }
    expect(runtimeBindingCapabilities({ bindingKind: RuntimeBindingKind.Iterate })).toMatchObject({
      executesAstBind: true, handlesChange: true, rateLimit: false, initialMode: null,
    });
    expect(runtimeBindingCapabilities({ bindingKind: RuntimeBindingKind.Translation }).executesAstBind).toBe(false);
    expect(runtimeBindingCapabilities({ bindingKind: RuntimeBindingKind.Let }).initialMode).toBeNull();
    expect(runtimeBindingCapabilities({ bindingKind: RuntimeBindingKind.Listener })).toMatchObject({ handlesChange: false, rateLimit: true });
  });

  test('evaluate-only translation keys still resolve behaviors during native astUnbind', () => {
    const { DI, Registration } = requireFramework('@aurelia/kernel');
    const { Scope } = requireFramework('@aurelia/runtime');
    const { ExpressionParser } = requireFramework('@aurelia/expression-parser');
    const { SignalBindingBehavior } = requireFramework('@aurelia/runtime-html');
    const { TranslationBinding, I18N } = requireFramework('@aurelia/i18n');
    const { IStoreRegistry, StateBindingBehavior } = requireFramework('@aurelia/state');
    const keys: unknown[] = [];
    const store = { getState: () => ({ key: 'state-key' }), subscribe() {}, unsubscribe() {} };
    const container = DI.createContainer().register(
      Registration.instance(IStoreRegistry, { getStore: () => store }),
      Registration.instance(I18N, {
        subscribeLocaleChange() {}, unsubscribeLocaleChange() {},
        evaluate(key: unknown) { keys.push(key); return []; },
      }),
      StateBindingBehavior, SignalBindingBehavior,
    );
    const parser = new ExpressionParser();
    const scope = Scope.create({ key: 'view-model-key' });
    const observer = { getObserver: () => ({ subscribe() {}, unsubscribe() {} }) };
    const stateKey = new TranslationBinding({}, container, observer, {}, {});
    stateKey.ast = parser.parse('key & state', 'IsProperty');
    stateKey.bind(scope);
    expect(keys).toEqual(['view-model-key']);
    expect(() => stateKey.unbind()).not.toThrow();
    const signalKey = new TranslationBinding({}, container, observer, {}, {});
    signalKey.ast = parser.parse("key & signal:'cleanup-only'", 'IsProperty');
    expect(() => signalKey.bind(scope)).not.toThrow();
    // Signal.unbind assumes names retained by bind. Removing the resource would change this native outcome.
    expect(() => signalKey.unbind()).toThrow(TypeError);
    container.dispose();
  });

  test('retains AOT resource demand for an unbind-only translation-key behavior', async () => {
    const fixtureRoot = path.resolve(import.meta.dirname, '../fixtures/pressure/i18n-translation-binding-errors');
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(fixtureRoot, 'src/i18n-translation-binding-errors-app.html'),
      '<template><p t.bind="\'greeting\' & signal:\'cleanup-only\'"></p></template>');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
      storeKey: 'translation-key-cleanup-resource-demand',
    });
    try {
      const app = await runtime.openApp({ analysisDepth: 'binding-observation', telemetry: { inquiryProfile: 'aot' } });
      const analysis = app.emission.templates.resources[0]!.runtimeAnalysis;
      const entries = analysis.expressionResourcePlan.behaviorEntries;
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ bindReachability: null, bindOrder: null, issue: null });
      const applications = analysis.bindingBehavior.applications;
      expect(applications).toHaveLength(1);
      expect(applications[0]).toMatchObject({ phase: 'unbind', bindReachability: null, phaseReachability: 'reached' });
      expect(applications[0]!.lifecycleEffects.openReason).toContain('without astBind');
      const requirements = materializeSemanticAppTemplateCompilerHandoffs({ app }).runtimeRegistrationRequirements;
      expect(requirements.resources.selectionKind).toBe('exact-leaves');
      expect(requirements.resources.leaves.some((leaf) => leaf.exportName === 'SignalBindingBehavior')).toBe(true);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);
});
