import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { EvaluationBindingKind, ModuleEnvironmentRecord } from '../src/evaluation/environment.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { StaticEvaluator, type StaticEvaluationRuntimeHost } from '../src/evaluation/evaluator.js';
import { EvaluationImportEntry, EvaluationImportKind } from '../src/evaluation/module-graph.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationInstanceValue,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationModuleNamespaceValue,
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
  aureliaFrameworkRegistrationKindForEvaluationValue,
  aureliaRegistryBodyForEvaluationValue,
  aureliaStaticEvaluationRuntimeHost,
} from '../src/configuration/aurelia-evaluation-runtime.js';
import { FrameworkRegistrationKind } from '../src/registration/registration-reference.js';

describe('static evaluation sessions', () => {
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
    const session = new StaticEvaluationSessionFork().forkModuleEvaluation(original);
    const competingSession = new StaticEvaluationSessionFork().forkModuleEvaluation(original);
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

    const session = new StaticEvaluationSessionFork().forkModuleEvaluation(original);
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
    ], false, declaration);
    const set = new EvaluationSetValue([
      new EvaluationArrayElement(shared, null),
    ], false, declaration);
    const map = new EvaluationMapValue([
      new EvaluationMapEntry(shared, instance, null),
    ], false, declaration);
    const namespace = new EvaluationModuleNamespaceValue(
      'src/dependency.ts',
      new Map([
        ['shared', shared],
        ['instance', instance],
      ]),
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
    environment.initializeBinding('root', root, EvaluationBindingKind.Const, false, declaration);
    environment.initializeBinding('shared', shared, EvaluationBindingKind.Const, false, declaration);
    environment.initializeBinding('Example', classValue, EvaluationBindingKind.Class, false, declaration);

    const session = new StaticEvaluationSessionFork().forkEnvironment(environment);
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
    expect(sessionNamespace.exports.get('shared')).toBe(sessionShared);
    expect(sessionNamespace.exports.get('instance')).toBe(sessionInstance);
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
      new Map([['StandardConfiguration', standardValue]]),
    );
    const session = new StaticEvaluationSessionFork().forkModuleEvaluation(original);
    const configured = session.environment.readValue('configured');
    const registry = session.environment.readValue('registry');

    expect(aureliaFrameworkRegistrationKindForEvaluationValue(configured))
      .toBe(FrameworkRegistrationKind.StandardConfiguration);
    expect(aureliaRegistryBodyForEvaluationValue(registry)).not.toBeNull();
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
    const session = new StaticEvaluationSessionFork().forkModuleEvaluation(original);
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
    const session = new StaticEvaluationSessionFork().forkModuleEvaluation(original);
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
    const session = new StaticEvaluationSessionFork().forkModuleEvaluation(original);
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
