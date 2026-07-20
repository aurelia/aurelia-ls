import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { EvaluationBindingKind, ModuleEnvironmentRecord } from '../src/evaluation/environment.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { StaticEvaluator, type StaticEvaluationRuntimeHost } from '../src/evaluation/evaluator.js';
import { EvaluationImportEntry, EvaluationImportKind } from '../src/evaluation/module-graph.js';
import { EvaluationValueEvidence } from '../src/evaluation/value-pressure.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationClassValue,
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
  EvaluationSetValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';
import {
  aureliaExternalEvaluationValueResolver,
  aureliaFrameworkRegistrationFactoryEvaluationForValue,
  aureliaFrameworkRegistrationKindForEvaluationValue,
  aureliaRegistryBodyForEvaluationValue,
  aureliaStaticEvaluationRuntimeHost,
} from '../src/configuration/aurelia-evaluation-runtime.js';
import {
  ModuleLoader,
  ModuleLoaderTransformStatus,
} from '../src/evaluation/module-loader.js';
import { FrameworkRegistrationKind } from '../src/registration/registration-reference.js';

describe('static evaluation sessions', () => {
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
    const canonicalEnvironment = new ModuleEnvironmentRecord('host:canonical');
    const canonical = new EvaluationFunctionValue(
      singletonDeclaration,
      canonicalEnvironment,
      singletonDeclaration,
    );
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (call) =>
        ts.isIdentifier(call.expression) && call.expression.text === 'host' ? canonical : null,
    };
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
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (call, environment, moduleKey, depth, host) => {
        if (!ts.isIdentifier(call.expression) || call.expression.text !== 'hostInvoke') {
          return null;
        }
        const calleeExpression = call.arguments[0];
        if (calleeExpression == null) {
          return null;
        }
        const callee = host.evaluateExpression(calleeExpression, environment, moduleKey, depth + 1);
        return callee.kind === EvaluationValueKind.Function
          ? host.evaluateFunctionWithArguments(
              callee,
              call,
              [new EvaluationValueEvidence(canonical, [])],
              moduleKey,
              depth + 1,
              null,
            )
          : null;
      },
    };
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
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (call, environment, moduleKey, depth, host) => {
        if (!ts.isIdentifier(call.expression) || call.expression.text !== 'hostInvoke') {
          return null;
        }
        const calleeExpression = call.arguments[0];
        if (calleeExpression == null) {
          return null;
        }
        const callee = host.evaluateExpression(calleeExpression, environment, moduleKey, depth + 1);
        return callee.kind === EvaluationValueKind.Function
          ? host.evaluateFunctionWithArguments(
              callee,
              call,
              [new EvaluationValueEvidence(new EvaluationNumberValue(2, call), [])],
              moduleKey,
              depth + 1,
              new EvaluationValueEvidence(canonicalReceiver, []),
            )
          : null;
      },
    };
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
    const environment = new ModuleEnvironmentRecord('src/graph.ts');
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
      new EvaluationArrayElement(shared, null),
    ], false, declaration);
    const map = new EvaluationMapValue([
      new EvaluationMapEntry(shared, instance, null),
    ], false, declaration);
    const namespace = new EvaluationModuleNamespaceValue(
      'src/dependency.ts',
      new Map([
        ['shared', new EvaluationModuleNamespaceExport('shared', shared, declaration)],
        ['instance', new EvaluationModuleNamespaceExport('instance', instance, declaration)],
      ]),
      false,
      declaration,
    );
    const promise = new EvaluationPromiseValue(shared, declaration);
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
    expect(sessionPromise.fulfilledValue).toBe(sessionShared);
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
        "import { aliasedResourcesRegistry } from '@aurelia/kernel';",
        'const configured = StandardConfiguration.customize({});',
        'const registry = aliasedResourcesRegistry([], {});',
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const standardImport = source.statements
      .filter(ts.isImportDeclaration)[0]
      ?.importClause?.namedBindings;
    if (standardImport == null || !ts.isNamedImports(standardImport)) {
      throw new Error('Expected the evaluation fixture to import StandardConfiguration.');
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
    const original = new StaticEvaluator(undefined, aureliaStaticEvaluationRuntimeHost).evaluateSourceFile(
      source,
      source.fileName,
      new Map([['StandardConfiguration', new EvaluationValueEvidence(standardValue, [])]]),
    );
    const session = new StaticEvaluationSessionFork(original.runtimeHost).forkModuleEvaluation(original);
    const configured = session.environment.readValue('configured');
    const registry = session.environment.readValue('registry');

    expect(aureliaFrameworkRegistrationKindForEvaluationValue(configured))
      .toBe(FrameworkRegistrationKind.StandardConfiguration);
    expect(aureliaRegistryBodyForEvaluationValue(registry)).not.toBeNull();
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
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (_call, environment) =>
        new EvaluationFunctionValue(declaration, environment, declaration),
    };
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
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (call, environment, moduleKey, depth, host) => {
        if (!ts.isIdentifier(call.expression) || call.expression.text !== 'host') {
          return null;
        }
        const service = environment.readValue('Service');
        const retained = environment.readValue('retained');
        if (service?.kind !== EvaluationValueKind.Class || retained?.kind !== EvaluationValueKind.Object) {
          throw new Error('Expected the host instance fixture to expose Service and retained.');
        }
        const instance = host.evaluateClassInstantiation(service, call, [], moduleKey, depth + 1);
        retained.properties.set('instance', property('instance', instance, call));
        return instance;
      },
    };
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
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (call, environment) => {
        if (!ts.isIdentifier(call.expression) || call.expression.text !== 'host') {
          return null;
        }
        hostEnvironment = environment;
        hostPayload = environment.readValue('payload');
        return new EvaluationFunctionValue(returnedDeclaration, environment, returnedDeclaration);
      },
    };
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

function property(
  name: string,
  value: EvaluationValue,
  node: ts.Node,
): EvaluationObjectProperty {
  return new EvaluationObjectProperty(name, value, node, EvaluationObjectPropertyState.Closed);
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
