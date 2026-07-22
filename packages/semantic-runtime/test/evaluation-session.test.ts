import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { EvaluationBindingKind, ModuleEnvironmentRecord } from '../src/evaluation/environment.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { StaticEvaluator, type StaticEvaluationRuntimeHost } from '../src/evaluation/evaluator.js';
import { evaluationValueGraphOwner } from '../src/evaluation/evaluation-graph.js';
import { delegateStaticEvaluationRuntimeHost } from '../src/evaluation/runtime-host.js';
import {
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
  type StaticInvocationFrame,
  type StaticInvocationHandled,
} from '../src/evaluation/invocation.js';
import type { StaticIntrinsicEvaluationHost } from '../src/evaluation/intrinsics/contracts.js';
import { EvaluationImportEntry, EvaluationImportKind } from '../src/evaluation/module-graph.js';
import { EvaluationValueEvidence } from '../src/evaluation/value-pressure.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationClassValue,
  EvaluationDateValue,
  EvaluationFunctionValue,
  EvaluationInstanceValue,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationModuleNamespaceExport,
  EvaluationModuleNamespaceValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationPromiseValue,
  EvaluationSetElement,
  EvaluationSetValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';
import {
  aureliaExternalEvaluationValueResolver,
  aureliaFacadeEvaluationForValue,
  aureliaFrameworkRegistrationFactoryEvaluationForValue,
  aureliaFrameworkRegistrationKindForEvaluationValue,
  aureliaRegistryBodyForEvaluationValue,
  aureliaStaticEvaluationRuntimeHost,
  isAureliaResolveEvaluationFunction,
} from '../src/configuration/aurelia-evaluation-runtime.js';
import { aureliaConfigurationEvaluationPolicy } from '../src/configuration/evaluation-policy.js';
import {
  ModuleLoader,
  ModuleLoaderTransformStatus,
} from '../src/evaluation/module-loader.js';
import { FrameworkRegistrationKind } from '../src/registration/registration-reference.js';

describe('static evaluation sessions', () => {
  test('maps fork snapshots to their immediate parent graph', () => {
    const source = ts.createSourceFile(
      'src/fork-lineage.ts',
      'const state = { count: 0 };',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const original = new StaticEvaluator().evaluateSourceFile(source);
    const originalState = original.environment.readValue('state');
    if (originalState == null) {
      throw new Error('Expected state to be evaluated.');
    }

    const firstGraph = new StaticEvaluationSessionFork(original.runtimeHost);
    const first = firstGraph.forkModuleEvaluation(original);
    const firstState = first.environment.readValue('state');
    if (firstState == null) {
      throw new Error('Expected state to survive the first fork.');
    }
    const secondGraph = new StaticEvaluationSessionFork(first.runtimeHost);
    const second = secondGraph.forkModuleEvaluation(first);
    const secondState = second.environment.readValue('state');
    const produced = new EvaluationObjectValue(new Map(), false);

    expect(firstGraph.sourceEnvironment(first.environment)).toBe(original.environment);
    expect(firstGraph.sourceValue(firstState)).toBe(originalState);
    expect(secondGraph.sourceEnvironment(second.environment)).toBe(first.environment);
    expect(secondGraph.sourceValue(secondState!)).toBe(firstState);
    expect(secondGraph.sourceValue(produced)).toBeNull();
  });

  test('dispatches Aurelia facades from imported value identity across aliases and namespaces', () => {
    const source = ts.createSourceFile(
      'src/aurelia-facade-identity.ts',
      [
        "import Quickstart from 'aurelia';",
        "import { Aurelia as RuntimeAurelia } from '@aurelia/runtime-html';",
        "import * as browser from 'aurelia';",
        "import * as runtime from '@aurelia/runtime-html';",
        'const Alias = Quickstart;',
        'const quick = new Alias();',
        'const runtimeInstance = new RuntimeAurelia();',
        'const browserStatic = browser.Aurelia.register({});',
        'const namespaceRuntime = new runtime.Aurelia();',
        'function Aurelia() {}',
        'const local = new Aurelia();',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const result = new StaticEvaluator(undefined, aureliaStaticEvaluationRuntimeHost).evaluateSourceFile(
      source,
      source.fileName,
      aureliaImportValues(source),
    );

    expect(aureliaFacadeEvaluationForValue(result.environment.readValue('quick'))?.includesBrowserDefaults).toBe(true);
    expect(aureliaFacadeEvaluationForValue(result.environment.readValue('runtimeInstance'))?.includesBrowserDefaults).toBe(false);
    expect(aureliaFacadeEvaluationForValue(result.environment.readValue('browserStatic'))?.includesBrowserDefaults).toBe(true);
    expect(aureliaFacadeEvaluationForValue(result.environment.readValue('namespaceRuntime'))?.includesBrowserDefaults).toBe(false);
    expect(aureliaFacadeEvaluationForValue(result.environment.readValue('local'))).toBeNull();
  });

  test('keeps repeated construction at one source site as distinct facade and container identities', () => {
    const source = ts.createSourceFile(
      'src/aurelia-facade-occurrences.ts',
      [
        "import { Aurelia } from '@aurelia/runtime-html';",
        'function createApp() { return new Aurelia(); }',
        'const first = createApp();',
        'const second = createApp();',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const result = new StaticEvaluator(
      aureliaConfigurationEvaluationPolicy,
      aureliaStaticEvaluationRuntimeHost,
    ).evaluateSourceFile(source, source.fileName, aureliaImportValues(source));
    const first = aureliaFacadeEvaluationForValue(result.environment.readValue('first'));
    const second = aureliaFacadeEvaluationForValue(result.environment.readValue('second'));

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).not.toBe(second);
    expect(first?.sourceNode).toBe(second?.sourceNode);
    expect(first?.containerEvaluation).not.toBe(second?.containerEvaluation);
  });

  test('retains definite Aurelia facade setup instead of delegating it to source replay', () => {
    const source = ts.createSourceFile(
      'src/aurelia-facade-execution.ts',
      [
        "import { Aurelia } from 'aurelia';",
        'new Aurelia().register({}).app({}).start();',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const result = new StaticEvaluator(
      aureliaConfigurationEvaluationPolicy,
      aureliaStaticEvaluationRuntimeHost,
    ).evaluateSourceFile(source, source.fileName, aureliaImportValues(source));

    expect(result.invocations.map((invocation) => invocation.node.getText(source))).toEqual([
      'new Aurelia()',
      'new Aurelia().register({})',
      'new Aurelia().register({}).app({})',
      'new Aurelia().register({}).app({}).start()',
    ]);
    expect(result.openSeams).toEqual([]);
  });

  test('preserves partial module membership through ModuleLoader analysis', () => {
    const source = ts.createSourceFile(
      'src/open-module.ts',
      'export const known = {};',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const known = new EvaluationObjectValue(new Map(), false, source.statements[0] ?? source);
    const namespace = new EvaluationModuleNamespaceValue(
      'src/open-module.ts',
      new Map([
        ['known', new EvaluationModuleNamespaceExport('known', known, source.statements[0] ?? source)],
      ]),
      true,
      source,
    );

    const result = new ModuleLoader().load(namespace);

    expect(result.status).toBe(ModuleLoaderTransformStatus.Analyzed);
    expect(result.analyzedModule?.items.map((item) => item.key)).toEqual(['known']);
    expect(result.analyzedModule?.mayHaveUnknownItems).toBe(true);
  });

  test('preserves object-valued exports and filtered-item membership pressure through ModuleLoader analysis', () => {
    const source = ts.createSourceFile(
      'src/module-item-pressure.ts',
      'export const collection = []; export const unresolved = externalValue; export const primitive = 1;',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const collection = new EvaluationArrayValue([], source.statements[0] ?? source);
    const unresolved = new EvaluationUnknownValue('The export value depends on runtime state.', source.statements[1] ?? source);
    const primitive = new EvaluationNumberValue(1, source.statements[2] ?? source);
    const namespace = new EvaluationModuleNamespaceValue(
      'src/module-item-pressure.ts',
      new Map([
        ['collection', new EvaluationModuleNamespaceExport('collection', collection, source.statements[0] ?? source)],
        ['unresolved', new EvaluationModuleNamespaceExport('unresolved', unresolved, source.statements[1] ?? source)],
        ['primitive', new EvaluationModuleNamespaceExport('primitive', primitive, source.statements[2] ?? source)],
      ]),
      false,
      source,
    );

    const result = new ModuleLoader().load(namespace);

    expect(result.status).toBe(ModuleLoaderTransformStatus.Analyzed);
    expect(result.analyzedModule?.items.map((item) => item.key)).toEqual(['collection']);
    expect(result.analyzedModule?.mayHaveUnknownItems).toBe(true);
    expect(result.analyzedModule?.mayHaveUnknownOrder).toBe(true);
  });

  test('accepts direct evaluator objects that have no enumerable module items', () => {
    const result = new ModuleLoader().load(new EvaluationDateValue(0));

    expect(result.status).toBe(ModuleLoaderTransformStatus.Analyzed);
    expect(result.analyzedModule?.items).toEqual([]);
    expect(result.analyzedModule?.mayHaveUnknownItems).toBe(false);
    expect(result.analyzedModule?.mayHaveUnknownOrder).toBe(false);
  });

  test('preserves aliases and cycles while isolating follow-up mutation from the project snapshot', () => {
    const source = ts.createSourceFile(
      'src/session.ts',
      [
        'const state = { count: 0 };',
        'function bump() {',
        '  state.count = state.count + 1;',
        '  return state.count;',
        '}',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const original = new StaticEvaluator().evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const competingSession = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const originalState = original.environment.readValue('state');
    const sessionState = session.environment.readValue('state');
    const sessionBump = session.environment.readValue('bump');
    const competingState = competingSession.environment.readValue('state');

    expect(originalState?.kind).toBe(EvaluationValueKind.Object);
    expect(sessionState?.kind).toBe(EvaluationValueKind.Object);
    expect(sessionState).not.toBe(originalState);
    expect(competingState).not.toBe(originalState);
    expect(competingState).not.toBe(sessionState);
    expect(sessionBump?.kind).toBe(EvaluationValueKind.Function);
    if (
      originalState?.kind !== EvaluationValueKind.Object
      || sessionState?.kind !== EvaluationValueKind.Object
      || sessionBump?.kind !== EvaluationValueKind.Function
    ) {
      throw new Error('Expected the evaluation fixture to close over object state and a function.');
    }
    expect(sessionBump.environment).toBe(session.environment);
    expect(sessionBump.environment.clone().readValue('state')).toBe(sessionState);

    const call = new StaticEvaluator().evaluateFunctionValue(
      sessionBump,
      sessionBump.declaration,
      session.moduleKey,
      [],
    );
    expect(call.value).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Number, value: 1 }));
    expect(sessionState.properties.get('count')?.value)
      .toEqual(expect.objectContaining({ kind: EvaluationValueKind.Number, value: 1 }));
    expect(originalState.properties.get('count')?.value)
      .toEqual(expect.objectContaining({ kind: EvaluationValueKind.Number, value: 0 }));
    expect(competingState?.kind === EvaluationValueKind.Object
      ? competingState.properties.get('count')?.value
      : null).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Number, value: 0 }));
  });

  test('forks mutable child graphs retained by runtime-host metadata', () => {
    const source = ts.createSourceFile(
      'src/host-metadata.ts',
      ['const marker = {};', "const options = { include: ['src/**'] };"].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const metadata = new WeakMap<EvaluationValue, EvaluationValue>();
    const runtimeHost: StaticEvaluationRuntimeHost = {
      transferValueMetadata: (sourceValue, targetValue, transfer) => {
        const child = metadata.get(sourceValue);
        if (child != null) {
          metadata.set(targetValue, transfer.forkValue(child));
        }
      },
    };
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const originalMarker = original.environment.readValue('marker');
    const originalOptions = original.environment.readValue('options');
    if (originalMarker == null || originalOptions == null) {
      throw new Error('Expected the host-metadata fixture to evaluate marker and options values.');
    }
    metadata.set(originalMarker, originalOptions);

    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const sessionMarker = session.environment.readValue('marker');
    const sessionOptions = sessionMarker == null ? null : metadata.get(sessionMarker) ?? null;
    const sessionOptionsObject = requireValueKind(sessionOptions, EvaluationValueKind.Object);
    const originalOptionsObject = requireValueKind(originalOptions, EvaluationValueKind.Object);

    expect(sessionOptionsObject).not.toBe(originalOptionsObject);
    const sessionInclude = requireValueKind(
      sessionOptionsObject.properties.get('include')?.value ?? null,
      EvaluationValueKind.Array,
    );
    const originalInclude = requireValueKind(
      originalOptionsObject.properties.get('include')?.value ?? null,
      EvaluationValueKind.Array,
    );
    expect(sessionInclude).not.toBe(originalInclude);
    sessionInclude.elements.pop();
    expect(originalInclude.elements).toHaveLength(1);

    const nestedSession = new StaticEvaluationSessionFork(session.runtimeHost).forkModuleEvaluation(session);
    const nestedMarker = nestedSession.environment.readValue('marker');
    const nestedOptions = nestedMarker == null ? null : metadata.get(nestedMarker) ?? null;
    const nestedOptionsObject = requireValueKind(nestedOptions, EvaluationValueKind.Object);
    const nestedInclude = requireValueKind(
      nestedOptionsObject.properties.get('include')?.value ?? null,
      EvaluationValueKind.Array,
    );
    expect(nestedOptionsObject).not.toBe(sessionOptionsObject);
    expect(nestedInclude).not.toBe(sessionInclude);
    nestedInclude.elements.push(new EvaluationArrayElement(originalInclude.elements[0]!.value, null));
    expect(nestedInclude.elements).toHaveLength(1);
    expect(sessionInclude.elements).toHaveLength(0);
    expect(originalInclude.elements).toHaveLength(1);
  });

  test('transfers detached and cyclic runtime-host metadata exactly once', () => {
    const source = ts.createSourceFile(
      'src/host-metadata-cycle.ts',
      'const root = {};',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const metadata = new WeakMap<EvaluationValue, EvaluationValue>();
    let transfers = 0;
    const runtimeHost: StaticEvaluationRuntimeHost = {
      transferValueMetadata: (sourceValue, targetValue, transfer) => {
        const child = metadata.get(sourceValue);
        if (child == null) {
          return;
        }
        transfers += 1;
        metadata.set(targetValue, transfer.forkValue(child));
      },
    };
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const detached = new EvaluationObjectValue(new Map(), false, source);
    metadata.set(detached, detached);

    const sessionFork = new StaticEvaluationSessionFork(original.runtimeHost);
    sessionFork.forkModuleEvaluation(original);
    const forked = sessionFork.forkValue(detached);

    expect(forked).not.toBe(detached);
    expect(metadata.get(forked)).toBe(forked);
    expect(transfers).toBe(1);
  });

  test('forks canonical runtime-host values instead of adopting them into competing sessions', () => {
    const source = ts.createSourceFile(
      'src/host-singleton.ts',
      ['function singleton() { return 1; }', 'function probe() { return host(); }'].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const singletonDeclaration = source.statements.find((statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'singleton');
    if (singletonDeclaration == null) {
      throw new Error('Expected a canonical host function declaration.');
    }
    const canonicalEnvironment = new ModuleEnvironmentRecord('host:canonical', null);
    const canonical = new EvaluationFunctionValue(
      singletonDeclaration,
      canonicalEnvironment,
      singletonDeclaration,
    );
    const runtimeHost = runtimeHostForCall('host', source, () => staticInvocationValue(canonical));
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const first = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const second = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const firstProbe = requireValueKind(first.environment.readValue('probe'), EvaluationValueKind.Function);
    const secondProbe = requireValueKind(second.environment.readValue('probe'), EvaluationValueKind.Function);
    const firstResult = requireValueKind(
      new StaticEvaluator(first.policy, first.runtimeHost)
        .evaluateFunctionValue(firstProbe, firstProbe.declaration, first.moduleKey, []).value,
      EvaluationValueKind.Function,
    );
    const secondResult = requireValueKind(
      new StaticEvaluator(second.policy, second.runtimeHost)
        .evaluateFunctionValue(secondProbe, secondProbe.declaration, second.moduleKey, []).value,
      EvaluationValueKind.Function,
    );

    expect(firstResult).not.toBe(canonical);
    expect(secondResult).not.toBe(canonical);
    expect(secondResult).not.toBe(firstResult);
    expect(firstResult.environment).not.toBe(canonicalEnvironment);
    expect(secondResult.environment).not.toBe(firstResult.environment);
  });

  test('adopts host-supplied call arguments before session-local mutation', () => {
    const source = ts.createSourceFile(
      'src/session-host-call.ts',
      [
        'function mutate(value) { value.x = 1; return value; }',
        'function probe() { return hostInvoke(mutate); }',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const canonical = new EvaluationObjectValue(new Map([
      ['x', property('x', new EvaluationNumberValue(0, source), source)],
    ]), false, source);
    const runtimeHost = runtimeHostForCall('hostInvoke', source, (frame, host) => {
      const callee = frame.argumentList.exactEvidence()?.[0]?.value;
      if (callee?.kind !== EvaluationValueKind.Function) {
        throw new Error('Expected hostInvoke(...) to receive the prepared mutate function.');
      }
      return staticInvocationValue(host.evaluateFunctionWithArguments(
        callee,
        frame.node,
        [new EvaluationValueEvidence(canonical, [])],
        frame.moduleKey,
        frame.depth + 1,
        null,
      ));
    });
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const probe = requireValueKind(session.environment.readValue('probe'), EvaluationValueKind.Function);
    const result = requireValueKind(
      new StaticEvaluator(session.policy, session.runtimeHost)
        .evaluateFunctionValue(probe, probe.declaration, session.moduleKey, []).value,
      EvaluationValueKind.Object,
    );

    expect(result).not.toBe(canonical);
    expect(result.properties.get('x')?.value).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 1,
    }));
    expect(canonical.properties.get('x')?.value).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 0,
    }));
  });

  test('preserves a host-supplied call receiver through a session fork', () => {
    const source = ts.createSourceFile(
      'src/session-host-receiver.ts',
      [
        'function offset(value) { return this.base + value; }',
        'function probe() { return hostInvoke(offset); }',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const canonicalReceiver = new EvaluationObjectValue(new Map([
      ['base', property('base', new EvaluationNumberValue(10, source), source)],
    ]), false, source);
    const runtimeHost = runtimeHostForCall('hostInvoke', source, (frame, host) => {
      const callee = frame.argumentList.exactEvidence()?.[0]?.value;
      if (callee?.kind !== EvaluationValueKind.Function) {
        throw new Error('Expected hostInvoke(...) to receive the prepared offset function.');
      }
      return staticInvocationValue(host.evaluateFunctionWithArguments(
        callee,
        frame.node,
        [new EvaluationValueEvidence(new EvaluationNumberValue(2, frame.node), [])],
        frame.moduleKey,
        frame.depth + 1,
        new EvaluationValueEvidence(canonicalReceiver, []),
      ));
    });
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const probe = requireValueKind(session.environment.readValue('probe'), EvaluationValueKind.Function);
    const result = new StaticEvaluator(session.policy, session.runtimeHost)
      .evaluateFunctionValue(probe, probe.declaration, session.moduleKey, []).value;

    expect(result).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 12,
    }));
  });

  test('forks every mutable value carrier once across class, collection, and module cycles', () => {
    const source = ts.createSourceFile(
      'src/graph.ts',
      'class Example {}',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const declaration = source.statements.find(ts.isClassDeclaration);
    if (declaration == null) {
      throw new Error('Expected the evaluation graph fixture to contain a class declaration.');
    }
    const environment = new ModuleEnvironmentRecord('src/graph.ts', null);
    const shared = new EvaluationObjectValue(new Map(), false, declaration);
    shared.properties.set('self', property('self', shared, declaration));
    const classValue = new EvaluationClassValue(declaration, environment, declaration);
    const instance = new EvaluationInstanceValue(classValue, new Map(), false, declaration);
    classValue.properties.set('instance', property('instance', instance, declaration));
    instance.properties.set('constructor', property('constructor', classValue, declaration));
    instance.properties.set('shared', property('shared', shared, declaration));
    const array = new EvaluationArrayValue([
      new EvaluationArrayElement(shared, null),
      new EvaluationArrayElement(shared, null),
    ], declaration);
    const set = new EvaluationSetValue([
      new EvaluationSetElement(shared, null),
    ], declaration);
    const map = new EvaluationMapValue([
      new EvaluationMapEntry(shared, instance, null, null),
    ], declaration);
    const namespace = new EvaluationModuleNamespaceValue(
      'src/dependency.ts',
      new Map([
        ['shared', new EvaluationModuleNamespaceExport('shared', shared, declaration)],
        ['instance', new EvaluationModuleNamespaceExport('instance', instance, declaration)],
      ]),
      false,
      declaration,
    );
    const promise = EvaluationPromiseValue.fulfilled(
      new EvaluationValueEvidence(shared, []),
      declaration,
    );
    shared.properties.set('promise', property('promise', promise, declaration));
    const root = new EvaluationObjectValue(new Map([
      ['shared', property('shared', shared, declaration)],
      ['instance', property('instance', instance, declaration)],
      ['array', property('array', array, declaration)],
      ['set', property('set', set, declaration)],
      ['map', property('map', map, declaration)],
      ['namespace', property('namespace', namespace, declaration)],
      ['promise', property('promise', promise, declaration)],
    ]), false, declaration);
    environment.initializeBinding('root', root, EvaluationBindingKind.Const, false, declaration, []);
    environment.initializeBinding('shared', shared, EvaluationBindingKind.Const, false, declaration, []);
    environment.initializeBinding('Example', classValue, EvaluationBindingKind.Class, false, declaration, []);

    const session = new StaticEvaluationSessionFork({}).forkEnvironment(environment);
    const sessionRoot = requireValueKind(session.readValue('root'), EvaluationValueKind.Object);
    const sessionShared = requireValueKind(session.readValue('shared'), EvaluationValueKind.Object);
    const sessionClass = requireValueKind(session.readValue('Example'), EvaluationValueKind.Class);
    const sessionInstance = requireValueKind(
      sessionRoot.properties.get('instance')?.value ?? null,
      EvaluationValueKind.Instance,
    );
    const sessionArray = requireValueKind(
      sessionRoot.properties.get('array')?.value ?? null,
      EvaluationValueKind.Array,
    );
    const sessionSet = requireValueKind(
      sessionRoot.properties.get('set')?.value ?? null,
      EvaluationValueKind.Set,
    );
    const sessionMap = requireValueKind(
      sessionRoot.properties.get('map')?.value ?? null,
      EvaluationValueKind.Map,
    );
    const sessionNamespace = requireValueKind(
      sessionRoot.properties.get('namespace')?.value ?? null,
      EvaluationValueKind.ModuleNamespace,
    );
    const sessionPromise = requireValueKind(
      sessionRoot.properties.get('promise')?.value ?? null,
      EvaluationValueKind.Promise,
    );

    expect(sessionRoot).not.toBe(root);
    expect(sessionShared).not.toBe(shared);
    expect(sessionRoot.properties.get('shared')?.value).toBe(sessionShared);
    expect(sessionShared.properties.get('self')?.value).toBe(sessionShared);
    expect(sessionArray.elements.map((element) => element.value)).toEqual([sessionShared, sessionShared]);
    expect(sessionSet.elements[0]?.value).toBe(sessionShared);
    expect(sessionMap.entries[0]?.key).toBe(sessionShared);
    expect(sessionMap.entries[0]?.value).toBe(sessionInstance);
    expect(sessionNamespace.exportEntries.get('shared')?.value).toBe(sessionShared);
    expect(sessionNamespace.exportEntries.get('instance')?.value).toBe(sessionInstance);
    expect(sessionPromise.settlement.evidence.value).toBe(sessionShared);
    expect(sessionShared.properties.get('promise')?.value).toBe(sessionPromise);
    expect(sessionClass.properties.get('instance')?.value).toBe(sessionInstance);
    expect(sessionInstance.classValue).toBe(sessionClass);
    expect(sessionInstance.properties.get('constructor')?.value).toBe(sessionClass);
    expect(sessionInstance.properties.get('shared')?.value).toBe(sessionShared);

    sessionArray.elements.pop();
    sessionClass.properties.delete('instance');
    expect(array.elements).toHaveLength(2);
    expect(classValue.properties.get('instance')?.value).toBe(instance);
  });

  test('preserves runtime-host semantic identities on cloned values', () => {
    const source = ts.createSourceFile(
      'src/configuration.ts',
      [
        "import { StandardConfiguration } from '@aurelia/runtime-html';",
        "import { DI, aliasedResourcesRegistry, resolve } from '@aurelia/kernel';",
        'const configured = StandardConfiguration.customize({});',
        'const registry = aliasedResourcesRegistry([], {});',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const imports = source.statements
      .filter(ts.isImportDeclaration)
      .map((declaration) => declaration.importClause?.namedBindings ?? null);
    const standardImport = imports[0];
    const aliasedResourcesImport = imports[1];
    if (
      standardImport == null
      || !ts.isNamedImports(standardImport)
      || aliasedResourcesImport == null
      || !ts.isNamedImports(aliasedResourcesImport)
    ) {
      throw new Error('Expected the evaluation fixture to import both tested Aurelia values.');
    }
    const standardValue = aureliaExternalEvaluationValueResolver.resolveImportValue(
      source.fileName,
      new EvaluationImportEntry(
        EvaluationImportKind.Named,
        '@aurelia/runtime-html',
        'StandardConfiguration',
        'StandardConfiguration',
        standardImport.elements[0]!,
      ),
    );
    if (standardValue == null) {
      throw new Error('Expected StandardConfiguration to resolve to a framework registration value.');
    }
    const aliasedResourcesValue = aureliaExternalEvaluationValueResolver.resolveImportValue(
      source.fileName,
      new EvaluationImportEntry(
        EvaluationImportKind.Named,
        '@aurelia/kernel',
        'aliasedResourcesRegistry',
        'aliasedResourcesRegistry',
        aliasedResourcesImport.elements[1]!,
      ),
    );
    if (aliasedResourcesValue == null) {
      throw new Error('Expected aliasedResourcesRegistry to resolve to an Aurelia evaluation value.');
    }
    const resolveValue = aureliaExternalEvaluationValueResolver.resolveImportValue(
      source.fileName,
      new EvaluationImportEntry(
        EvaluationImportKind.Named,
        '@aurelia/kernel',
        'resolve',
        'resolve',
        aliasedResourcesImport.elements[2]!,
      ),
    );
    const diValue = aureliaExternalEvaluationValueResolver.resolveImportValue(
      source.fileName,
      new EvaluationImportEntry(
        EvaluationImportKind.Named,
        '@aurelia/kernel',
        'DI',
        'DI',
        aliasedResourcesImport.elements[0]!,
      ),
    );
    if (resolveValue == null || diValue == null) {
      throw new Error('Expected the Aurelia DI facade and resolve function to have external evaluation identities.');
    }
    const original = new StaticEvaluator(undefined, aureliaStaticEvaluationRuntimeHost).evaluateSourceFile(
      source,
      source.fileName,
      new Map([
        ['StandardConfiguration', new EvaluationValueEvidence(standardValue, [])],
        ['aliasedResourcesRegistry', new EvaluationValueEvidence(aliasedResourcesValue, [])],
        ['resolve', new EvaluationValueEvidence(resolveValue, [])],
        ['DI', new EvaluationValueEvidence(diValue, [])],
      ]),
    );
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const configured = session.environment.readValue('configured');
    const registry = session.environment.readValue('registry');
    const sessionResolve = session.environment.readValue('resolve');
    const sessionDi = session.environment.readValue('DI');

    expect(aureliaFrameworkRegistrationKindForEvaluationValue(configured))
      .toBe(FrameworkRegistrationKind.StandardConfiguration);
    expect(aureliaRegistryBodyForEvaluationValue(registry)).not.toBeNull();
    expect(isAureliaResolveEvaluationFunction(sessionResolve)).toBe(true);
    expect(sessionDi?.kind).toBe(EvaluationValueKind.BoundaryObject);
    expect(sessionDi?.kind === EvaluationValueKind.BoundaryObject
      ? sessionDi.properties.get('createContainer')?.value.kind
      : null).toBe(EvaluationValueKind.Function);
  });

  test('models framework registration exports through their exact runtime stages', () => {
    const source = ts.createSourceFile(
      'src/framework-registration-shapes.ts',
      [
        "import { StateDefaultConfiguration } from '@aurelia/state';",
        "import { RouterConfiguration } from '@aurelia/router';",
        "import { AppTask, StyleConfiguration } from '@aurelia/runtime-html';",
        "import { LoggerConfiguration } from '@aurelia/kernel';",
        "import { ValidationI18nConfiguration } from '@aurelia/validation-i18n';",
        "import { DialogConfigurationStandard, createDialogConfiguration } from '@aurelia/dialog';",
        'const state = StateDefaultConfiguration.init({ count: 0 });',
        "const sameState = state.withStore('secondary', { count: 1 });",
        'const router = RouterConfiguration.customize({ useUrlFragmentHash: true });',
        'const invalidRouterChain = router.customize({});',
        'const task = AppTask.creating(() => undefined);',
        "const sameDialog = DialogConfigurationStandard.withChild('child', () => ({}));",
        'const customDialog = createDialogConfiguration(() => undefined, class {});',
        'const logger = LoggerConfiguration.create({ sinks: [] });',
        'const style = StyleConfiguration.shadowDOM({ sharedStyles: [] });',
        'const localizedValidation = ValidationI18nConfiguration.customize(() => undefined);',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const external = (
      moduleSpecifier: string,
      exportName: string,
    ): EvaluationValue => {
      const value = aureliaExternalEvaluationValueResolver.resolveImportValue(
        source.fileName,
        new EvaluationImportEntry(
          EvaluationImportKind.Named,
          moduleSpecifier,
          exportName,
          exportName,
          source,
        ),
      );
      if (value == null) {
        throw new Error(`Expected ${moduleSpecifier}#${exportName} to resolve.`);
      }
      return value;
    };
    const stateFactory = external('@aurelia/state', 'StateDefaultConfiguration');
    const appTaskFactory = external('@aurelia/runtime-html', 'AppTask');
    const dialog = external('@aurelia/dialog', 'DialogConfigurationStandard');
    const defaultResources = external('@aurelia/runtime-html', 'DefaultResources');
    const loggerFactory = external('@aurelia/kernel', 'LoggerConfiguration');
    const styleFactory = external('@aurelia/runtime-html', 'StyleConfiguration');
    const localizedValidation = external('@aurelia/validation-i18n', 'ValidationI18nConfiguration');
    const evaluation = new StaticEvaluator(undefined, aureliaStaticEvaluationRuntimeHost).evaluateSourceFile(
      source,
      source.fileName,
      new Map([
        ['StateDefaultConfiguration', new EvaluationValueEvidence(stateFactory, [])],
        ['RouterConfiguration', new EvaluationValueEvidence(external('@aurelia/router', 'RouterConfiguration'), [])],
        ['AppTask', new EvaluationValueEvidence(appTaskFactory, [])],
        ['DialogConfigurationStandard', new EvaluationValueEvidence(dialog, [])],
        ['createDialogConfiguration', new EvaluationValueEvidence(external('@aurelia/dialog', 'createDialogConfiguration'), [])],
        ['LoggerConfiguration', new EvaluationValueEvidence(loggerFactory, [])],
        ['StyleConfiguration', new EvaluationValueEvidence(styleFactory, [])],
        ['ValidationI18nConfiguration', new EvaluationValueEvidence(localizedValidation, [])],
      ]),
    );
    const state = requireValueKind(evaluation.environment.readValue('state'), EvaluationValueKind.Object);
    const sameState = requireValueKind(evaluation.environment.readValue('sameState'), EvaluationValueKind.Object);
    const router = requireValueKind(evaluation.environment.readValue('router'), EvaluationValueKind.Object);

    expect(aureliaFrameworkRegistrationKindForEvaluationValue(stateFactory)).toBeNull();
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(appTaskFactory)).toBeNull();
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(loggerFactory)).toBeNull();
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(styleFactory)).toBeNull();
    expect(aureliaFrameworkRegistrationFactoryEvaluationForValue(stateFactory)?.resultKind)
      .toBe(FrameworkRegistrationKind.StateDefaultConfiguration);
    expect(aureliaFrameworkRegistrationFactoryEvaluationForValue(appTaskFactory)?.resultKind)
      .toBe(FrameworkRegistrationKind.AppTask);
    expect(aureliaFrameworkRegistrationFactoryEvaluationForValue(loggerFactory)?.resultKind)
      .toBe(FrameworkRegistrationKind.LoggerConfiguration);
    expect(aureliaFrameworkRegistrationFactoryEvaluationForValue(styleFactory)?.resultKind)
      .toBe(FrameworkRegistrationKind.StyleConfiguration);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(localizedValidation))
      .toBe(FrameworkRegistrationKind.ValidationI18nConfiguration);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(state))
      .toBe(FrameworkRegistrationKind.StateDefaultConfiguration);
    expect(sameState).toBe(state);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(router))
      .toBe(FrameworkRegistrationKind.RouterConfiguration);
    expect(router.properties.has('customize')).toBe(false);
    expect(evaluation.environment.readValue('invalidRouterChain')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(evaluation.environment.readValue('task')))
      .toBe(FrameworkRegistrationKind.AppTask);
    expect(evaluation.environment.readValue('sameDialog')).toBe(dialog);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(evaluation.environment.readValue('customDialog')))
      .toBe(FrameworkRegistrationKind.DialogConfiguration);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(evaluation.environment.readValue('logger')))
      .toBe(FrameworkRegistrationKind.LoggerConfiguration);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(evaluation.environment.readValue('style')))
      .toBe(FrameworkRegistrationKind.StyleConfiguration);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(evaluation.environment.readValue('localizedValidation')))
      .toBe(FrameworkRegistrationKind.ValidationI18nConfiguration);
    expect(defaultResources.kind).toBe(EvaluationValueKind.Array);
    expect(aureliaFrameworkRegistrationKindForEvaluationValue(defaultResources))
      .toBe(FrameworkRegistrationKind.RuntimeHtmlDefaultResources);
    expect((defaultResources as EvaluationArrayValue).mayHaveUnknownElements).toBe(true);
  });

  test('adopts session environments captured by values returned from a wrapped runtime host', () => {
    const source = ts.createSourceFile(
      'src/host-closure.ts',
      ['function returned() { return 1; }', 'host();'].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const declaration = source.statements.find(ts.isFunctionDeclaration);
    const call = source.statements.find(ts.isExpressionStatement)?.expression;
    if (declaration == null || call == null || !ts.isCallExpression(call)) {
      throw new Error('Expected the host-closure fixture to contain a function and call.');
    }
    const runtimeHost = runtimeHostForCall('host', source, (frame) => staticInvocationValue(
      new EvaluationFunctionValue(declaration, frame.environment, declaration),
    ));
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const result = new StaticEvaluator(session.policy, session.runtimeHost)
      .evaluateExpressionInEnvironment(call, session.environment, session.moduleKey);
    const returned = requireValueKind(result.value, EvaluationValueKind.Function);

    expect(returned.environment).toBe(session.environment);
  });

  test('preserves aliases installed by a host before returning a session-created instance', () => {
    const source = ts.createSourceFile(
      'src/host-instance-alias.ts',
      [
        'class Service {}',
        'const retained = {};',
        'function create() { return host(); }',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const runtimeHost = runtimeHostForCall('host', source, (frame, host) => {
      const service = frame.environment.readValue('Service');
      const retained = frame.environment.readValue('retained');
      if (service?.kind !== EvaluationValueKind.Class || retained?.kind !== EvaluationValueKind.Object) {
        throw new Error('Expected the host instance fixture to expose Service and retained.');
      }
      const instance = host.evaluateClassInstantiation(
        service,
        frame.node,
        [],
        frame.moduleKey,
        frame.depth + 1,
      );
      retained.properties.set('instance', property('instance', instance, frame.node));
      return staticInvocationValue(instance);
    });
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const create = requireValueKind(session.environment.readValue('create'), EvaluationValueKind.Function);
    const retained = requireValueKind(session.environment.readValue('retained'), EvaluationValueKind.Object);
    const result = new StaticEvaluator(session.policy, session.runtimeHost)
      .evaluateFunctionValue(create, create.declaration, session.moduleKey, []);
    const returned = requireValueKind(result.value, EvaluationValueKind.Instance);

    expect(retained.properties.get('instance')?.value).toBe(returned);
    expect(original.environment.readValue('retained')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Object,
      properties: new Map(),
    }));
  });

  test('preserves aliases installed by a host for a session-created plain object', () => {
    const source = ts.createSourceFile(
      'src/host-object-alias.ts',
      [
        'const retained = {};',
        'function probe() { const local = {}; return host(local); }',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const runtimeHost = runtimeHostForCall('host', source, (frame) => {
      const local = frame.argumentList.exactEvidence()?.[0]?.value;
      const retained = frame.environment.readValue('retained');
      if (local?.kind !== EvaluationValueKind.Object || retained?.kind !== EvaluationValueKind.Object) {
        throw new Error('Expected the host object-alias fixture to expose local and retained objects.');
      }
      retained.properties.set('local', property('local', local, frame.node));
      return staticInvocationValue(local);
    });
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const probe = requireValueKind(session.environment.readValue('probe'), EvaluationValueKind.Function);
    const retained = requireValueKind(session.environment.readValue('retained'), EvaluationValueKind.Object);
    const returned = requireValueKind(
      new StaticEvaluator(session.policy, session.runtimeHost)
        .evaluateFunctionValue(probe, probe.declaration, session.moduleKey, []).value,
      EvaluationValueKind.Object,
    );

    expect(retained.properties.get('local')?.value).toBe(returned);
    expect(original.environment.readValue('retained')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Object,
      properties: new Map(),
    }));
  });

  test('retains an in-progress instance when a hosted field initializer validates its environment', () => {
    const source = ts.createSourceFile(
      'src/hosted-field.ts',
      'class Consumer { value = host(); after = 1; }',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const runtimeHost = runtimeHostForCall('host', source, (frame) => staticInvocationValue(
      new EvaluationObjectValue(new Map(), false, frame.node),
    ));
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const sessionGraph = new StaticEvaluationSessionFork(original.runtimeHost);
    const session = sessionGraph.forkModuleEvaluation(original);
    const consumer = requireValueKind(session.environment.readValue('Consumer'), EvaluationValueKind.Class);
    const result = new StaticEvaluator(session.policy, session.runtimeHost)
      .evaluateClassValueInstantiation(consumer, session.moduleKey, consumer.declaration);
    const instance = requireValueKind(result.value, EvaluationValueKind.Instance);

    expect([...instance.properties.keys()]).toEqual(['value', 'after']);
    expect(instance.properties.get('value')?.value.kind).toBe(EvaluationValueKind.Object);
    expect(instance.properties.get('after')?.value).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 1,
    }));
    expect(evaluationValueGraphOwner(instance)).toBe(sessionGraph);
  });

  test('forks foreign direct-call arguments before evaluator-local mutation', () => {
    const source = ts.createSourceFile(
      'src/direct-argument.ts',
      'function mutate(value) { value.x = 1; return value; }',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const original = new StaticEvaluator().evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const mutate = requireValueKind(session.environment.readValue('mutate'), EvaluationValueKind.Function);
    const canonical = new EvaluationObjectValue(new Map([
      ['x', property('x', new EvaluationNumberValue(0, source), source)],
    ]), false, source);
    const returned = requireValueKind(
      new StaticEvaluator(session.policy, session.runtimeHost)
        .evaluateFunctionValue(mutate, mutate.declaration, session.moduleKey, [canonical]).value,
      EvaluationValueKind.Object,
    );

    expect(returned).not.toBe(canonical);
    expect(returned.properties.get('x')?.value).toEqual(expect.objectContaining({ value: 1 }));
    expect(canonical.properties.get('x')?.value).toEqual(expect.objectContaining({ value: 0 }));
  });

  test('forks canonical values returned by an outer delegated runtime host', () => {
    const source = ts.createSourceFile(
      'src/delegated-host.ts',
      'function probe() { return host(); }',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const baseHost = runtimeHostForCall('host', source, () => staticInvocationValue(
      new EvaluationObjectValue(new Map(), false, source),
    ));
    const original = new StaticEvaluator(undefined, baseHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const canonical = new EvaluationObjectValue(new Map(), false, source);
    const delegatedHost = delegateStaticEvaluationRuntimeHost(session.runtimeHost, (frame) =>
      ts.isIdentifier(frame.calleeNode) && frame.calleeNode.text === 'host'
        ? staticInvocationValue(canonical)
        : StaticInvocationNotApplicable
    );
    const probe = requireValueKind(session.environment.readValue('probe'), EvaluationValueKind.Function);
    const returned = requireValueKind(
      new StaticEvaluator(session.policy, delegatedHost)
        .evaluateFunctionValue(probe, probe.declaration, session.moduleKey, []).value,
      EvaluationValueKind.Object,
    );

    expect(returned).not.toBe(canonical);
    expect(evaluationValueGraphOwner(canonical)).toBeNull();
  });

  test('normalizes a foreign child inserted after a session object was first retained', () => {
    const source = ts.createSourceFile(
      'src/late-child.ts',
      [
        'const retained = {};',
        'function probe() { host(retained); return retained; }',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const canonical = new EvaluationObjectValue(new Map(), false, source);
    const runtimeHost = runtimeHostForCall('host', source, (frame) => {
      const retained = frame.argumentList.exactEvidence()?.[0]?.value;
      if (retained?.kind !== EvaluationValueKind.Object) {
        throw new Error('Expected host(...) to receive the retained session object.');
      }
      retained.properties.set('child', property('child', canonical, frame.node));
      return staticInvocationValue(retained);
    });
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const probe = requireValueKind(session.environment.readValue('probe'), EvaluationValueKind.Function);
    const returned = requireValueKind(
      new StaticEvaluator(session.policy, session.runtimeHost)
        .evaluateFunctionValue(probe, probe.declaration, session.moduleKey, []).value,
      EvaluationValueKind.Object,
    );

    expect(returned.properties.get('child')?.value).not.toBe(canonical);
    expect(evaluationValueGraphOwner(canonical)).toBeNull();
  });

  test('retains nested intrinsic products in the same evaluation graph', () => {
    const source = ts.createSourceFile(
      'src/nested-intrinsic.ts',
      'function probe() { return Object.entries({ value: 1 }); }',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const original = new StaticEvaluator().evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const probe = requireValueKind(session.environment.readValue('probe'), EvaluationValueKind.Function);
    const outer = requireValueKind(
      new StaticEvaluator(session.policy, session.runtimeHost)
        .evaluateFunctionValue(probe, probe.declaration, session.moduleKey, []).value,
      EvaluationValueKind.Array,
    );
    const inner = requireValueKind(outer.elements[0]?.value ?? null, EvaluationValueKind.Array);

    expect(evaluationValueGraphOwner(outer)).not.toBeNull();
    expect(evaluationValueGraphOwner(inner)).toBe(evaluationValueGraphOwner(outer));
  });

  test('keeps host-returned closures on their session-owned call frame', () => {
    const source = ts.createSourceFile(
      'src/host-call-frame.ts',
      [
        'function returned() { return payload.value; }',
        'function make(payload) { return host(); }',
        'function probe() { return make({ value: 1 }); }',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const returnedDeclaration = source.statements
      .find((statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) && statement.name?.text === 'returned');
    if (returnedDeclaration == null) {
      throw new Error('Expected the host call-frame fixture to declare returned.');
    }
    let hostEnvironment: ModuleEnvironmentRecord | null = null;
    let hostPayload: EvaluationValue | null = null;
    const runtimeHost = runtimeHostForCall('host', source, (frame) => {
      hostEnvironment = frame.environment;
      hostPayload = frame.environment.readValue('payload');
      return staticInvocationValue(
        new EvaluationFunctionValue(returnedDeclaration, frame.environment, returnedDeclaration),
      );
    });
    const original = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const probe = requireValueKind(session.environment.readValue('probe'), EvaluationValueKind.Function);
    const result = new StaticEvaluator(session.policy, session.runtimeHost)
      .evaluateFunctionValue(probe, probe.declaration, session.moduleKey, []);
    const returned = requireValueKind(result.value, EvaluationValueKind.Function);
    if (hostEnvironment == null) {
      throw new Error('Expected the wrapped runtime host to observe the make(...) call frame.');
    }

    expect(returned.environment).toBe(hostEnvironment);
    expect(returned.environment.readValue('payload')).toBe(hostPayload);
  });
});

function runtimeHostForCall(
  identifierName: string,
  node: ts.Node,
  evaluateCall: (
    frame: StaticInvocationFrame<ts.CallExpression>,
    host: StaticIntrinsicEvaluationHost,
  ) => StaticInvocationHandled,
): StaticEvaluationRuntimeHost {
  const calleeIdentity = new EvaluationBoundaryValue(
    EvaluationBoundaryKind.HostEnvironment,
    `test-runtime:${identifierName}`,
    node,
  );
  return {
    resolveIdentifier: (identifier) => identifier.text === identifierName ? calleeIdentity : null,
    evaluateInvocation: (frame, host) => {
      if (
        frame.kind !== StaticInvocationKind.Call
        || !ts.isCallExpression(frame.node)
        || frame.callee.value !== calleeIdentity
      ) {
        return StaticInvocationNotApplicable;
      }
      return evaluateCall(frame as StaticInvocationFrame<ts.CallExpression>, host);
    },
  };
}

function property(
  name: string,
  value: EvaluationValue,
  node: ts.Node,
): EvaluationObjectProperty {
  return new EvaluationObjectProperty(name, value, node, EvaluationObjectPropertyState.Closed);
}

function aureliaImportValues(source: ts.SourceFile): Map<string, EvaluationValueEvidence> {
  const values = new Map<string, EvaluationValueEvidence>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const moduleSpecifier = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (clause?.name != null) {
      retainAureliaImport(values, source, new EvaluationImportEntry(
        EvaluationImportKind.Default,
        moduleSpecifier,
        clause.name.text,
        'default',
        clause.name,
      ));
    }
    const bindings = clause?.namedBindings;
    if (bindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(bindings)) {
      retainAureliaImport(values, source, new EvaluationImportEntry(
        EvaluationImportKind.Namespace,
        moduleSpecifier,
        bindings.name.text,
        '*',
        bindings.name,
      ));
      continue;
    }
    for (const element of bindings.elements) {
      retainAureliaImport(values, source, new EvaluationImportEntry(
        EvaluationImportKind.Named,
        moduleSpecifier,
        element.name.text,
        element.propertyName?.text ?? element.name.text,
        element,
      ));
    }
  }
  return values;
}

function retainAureliaImport(
  values: Map<string, EvaluationValueEvidence>,
  source: ts.SourceFile,
  entry: EvaluationImportEntry,
): void {
  const value = aureliaExternalEvaluationValueResolver.resolveImportValue(source.fileName, entry);
  if (value != null) {
    values.set(entry.localName, new EvaluationValueEvidence(value, []));
  }
}

function requireValueKind<TKind extends EvaluationValueKind>(
  value: EvaluationValue | null,
  kind: TKind,
): Extract<EvaluationValue, { readonly kind: TKind }> {
  if (value?.kind !== kind) {
    throw new Error(`Expected evaluation value ${kind}, received ${value?.kind ?? 'absent'}.`);
  }
  return value as Extract<EvaluationValue, { readonly kind: TKind }>;
}
