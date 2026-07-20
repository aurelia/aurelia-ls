import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  EvaluationCompletionKind,
  ThrowEvaluationCompletion,
} from '../src/evaluation/completion.js';
import {
  StaticEvaluationRuntimeValueResult,
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../src/evaluation/evaluator.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import {
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationStringValue,
  type EvaluationValue,
  EvaluationValueKind,
} from '../src/evaluation/values.js';
import {
  EvaluationRead,
  EvaluationTargetResolutionKind,
  StaticEvaluationExpressionReader,
} from '../src/evaluation/expression-reader.js';
import { OpenSeam, OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelStore } from '../src/kernel/store.js';
import {
  bindingSourceValueEvaluationForRead,
  bindingSourceValueEvaluationResult,
  bindingSourceValueEvaluationWithPressure,
  RuntimeBindingSourceValueEvaluation,
  RuntimeBindingSourceValueEvaluationClosure,
} from '../src/configuration/binding-source-value-evaluation.js';
import {
  EvaluationOpenSeam,
  EvaluationOpenSeamKind,
} from '../src/evaluation/seams.js';
import {
  convergenceReasonKindsForRead,
  readBooleanField,
} from '../src/resources/resource-convergence-support.js';
import { NamedResourceRecognizer } from '../src/resources/named-resource-recognizer.js';
import { readBindables } from '../src/resources/bindable-convergence.js';
import { ShadowRootMode } from '../src/resources/custom-element-definition.js';
import { ResourceRecognitionContext } from '../src/resources/resource-recognition-context.js';
import { ResourceRecognitionPublicationSupport } from '../src/resources/resource-recognition-publication.js';
import {
  readCustomElementMetadataAnnotations,
  readStaticAliasMetadata,
} from '../src/resources/resource-metadata-annotations.js';
import { ResourceTargetReference } from '../src/resources/resource-reference.js';
import {
  readWatches,
  WatchDefinitionObjectWatchesPolicy,
} from '../src/resources/watch-convergence.js';

describe('static evaluator abrupt completion', () => {
  test('propagates a local function throw through try/catch and continues the caught path', () => {
    const result = evaluate([
      "let observed = 'before';",
      "function fail() { throw 'boom'; }",
      'try {',
      '  fail();',
      "  observed = 'unreachable';",
      '} catch (error) {',
      '  observed = error;',
      '}',
      "const after = 'after';",
    ]);

    expect(result.completion.kind).toBe(EvaluationCompletionKind.Normal);
    expect(result.environment.readValue('observed')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'boom',
    }));
    expect(result.environment.readValue('after')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'after',
    }));
  });

  test('stops module execution after an uncaught local function throw', () => {
    const result = evaluate([
      'const state = { reached: false };',
      "function fail() { throw 'boom'; }",
      'fail();',
      'state.reached = true;',
    ]);

    expect(result.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'boom' }),
    }));
    const state = result.environment.readValue('state');
    expect(state?.kind === EvaluationValueKind.Object
      ? state.properties.get('reached')?.value
      : null).toEqual(expect.objectContaining({
        kind: EvaluationValueKind.Boolean,
        value: false,
      }));
  });

  test('propagates a local constructor throw instead of fabricating an instance', () => {
    const result = evaluate([
      'class Failing {',
      "  constructor() { throw 'constructor failed'; }",
      '}',
      "let observed = 'before';",
      'try {',
      '  new Failing();',
      "  observed = 'unreachable';",
      '} catch (error) {',
      '  observed = error;',
      '}',
    ]);

    expect(result.completion.kind).toBe(EvaluationCompletionKind.Normal);
    expect(result.environment.readValue('observed')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'constructor failed',
    }));
  });

  test('lets a runtime host raise through the same completion channel', () => {
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (call, _environment, _moduleKey, _depth, host) => {
        if (!ts.isIdentifier(call.expression) || call.expression.text !== 'hostFail') {
          return null;
        }
        return host.raise(new ThrowEvaluationCompletion(new EvaluationStringValue('host failed', call)));
      },
    };
    const result = evaluate([
      "let observed = 'before';",
      'try {',
      '  hostFail();',
      "  observed = 'unreachable';",
      '} catch (error) {',
      '  observed = error;',
      '}',
    ], runtimeHost);

    expect(result.completion.kind).toBe(EvaluationCompletionKind.Normal);
    expect(result.environment.readValue('observed')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'host failed',
    }));
  });

  test('retains abrupt completion on direct function reads', () => {
    const source = sourceFile([
      "function fail() { throw 'direct failure'; }",
    ]);
    const module = new StaticEvaluator().evaluateSourceFile(source);
    const fail = module.environment.readValue('fail');
    if (fail?.kind !== EvaluationValueKind.Function) {
      throw new Error('Expected a statically evaluated fail function.');
    }

    const result = new StaticEvaluator().evaluateFunctionValue(
      fail,
      fail.declaration,
      module.moduleKey,
      [],
    );

    expect(result.value).toBeNull();
    expect(result.abruptCompletion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'direct failure' }),
    }));
  });

  test('preserves host-raised completion through a speculative evaluation session', () => {
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (call, _environment, _moduleKey, _depth, host) => {
        if (!ts.isIdentifier(call.expression) || call.expression.text !== 'hostFail') {
          return null;
        }
        return host.raise(new ThrowEvaluationCompletion(new EvaluationStringValue('session failure', call)));
      },
    };
    const source = sourceFile(['function fail() { hostFail(); }']);
    const baseline = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(baseline.runtimeHost).forkModuleEvaluation(baseline);
    const fail = session.environment.readValue('fail');
    if (fail?.kind !== EvaluationValueKind.Function) {
      throw new Error('Expected a session-local fail function.');
    }

    const result = new StaticEvaluator(session.policy, session.runtimeHost).evaluateFunctionValue(
      fail,
      fail.declaration,
      session.moduleKey,
      [],
    );

    expect(result.abruptCompletion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'session failure' }),
    }));
  });

  test('forks a mutable host-thrown value into the speculative session', () => {
    const source = sourceFile(['function fail() { hostFail(); }']);
    const sharedThrown = new EvaluationObjectValue(new Map([
      ['message', new EvaluationObjectProperty(
        'message',
        new EvaluationStringValue('original', source),
        source,
        EvaluationObjectPropertyState.Closed,
      )],
    ]), false, source);
    const runtimeHost: StaticEvaluationRuntimeHost = {
      evaluateCallExpression: (call, _environment, _moduleKey, _depth, host) => {
        if (!ts.isIdentifier(call.expression) || call.expression.text !== 'hostFail') {
          return null;
        }
        return host.raise(new ThrowEvaluationCompletion(sharedThrown));
      },
    };
    const baseline = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(baseline.runtimeHost).forkModuleEvaluation(baseline);
    const fail = session.environment.readValue('fail');
    if (fail?.kind !== EvaluationValueKind.Function) {
      throw new Error('Expected a session-local fail function.');
    }

    const result = new StaticEvaluator(session.policy, session.runtimeHost).evaluateFunctionValue(
      fail,
      fail.declaration,
      session.moduleKey,
      [],
    );
    const thrown = result.abruptCompletion?.value ?? null;
    expect(thrown?.kind).toBe(EvaluationValueKind.Object);
    expect(thrown).not.toBe(sharedThrown);
    if (thrown?.kind !== EvaluationValueKind.Object) {
      throw new Error('Expected the session to retain an object-valued throw completion.');
    }
    thrown.properties.set('message', new EvaluationObjectProperty(
      'message',
      new EvaluationStringValue('session', source),
      source,
      EvaluationObjectPropertyState.Closed,
    ));
    expect(sharedThrown.properties.get('message')?.value).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'original',
    }));
  });

  test('forks mutable CommonJS throw completion values into the speculative session', () => {
    const source = sourceFile(["function load() { require('./failing'); }"]);
    const sharedThrown = new EvaluationObjectValue(new Map([[
      'message',
      new EvaluationObjectProperty(
        'message',
        new EvaluationStringValue('commonjs failure', source),
        source,
        EvaluationObjectPropertyState.Closed,
      ),
    ]]), false, source);
    const runtimeHost: StaticEvaluationRuntimeHost = {
      resolveCommonJsRequire: () => new StaticEvaluationRuntimeValueResult(
        null,
        new ThrowEvaluationCompletion(sharedThrown),
      ),
    };
    const baseline = new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
    const session = new StaticEvaluationSessionFork(runtimeHost).forkModuleEvaluation(baseline);
    const load = session.environment.readValue('load');
    if (load?.kind !== EvaluationValueKind.Function) {
      throw new Error('Expected a session-local CommonJS loader function.');
    }

    const result = new StaticEvaluator(session.policy, session.runtimeHost).evaluateFunctionValue(
      load,
      load.declaration,
      session.moduleKey,
      [],
    );
    const thrown = result.abruptCompletion?.value ?? null;
    expect(thrown).toEqual(expect.objectContaining({ kind: EvaluationValueKind.Object }));
    expect(thrown).not.toBe(sharedThrown);
  });

  test('routes labeled continue and break only to their owning statements', () => {
    const result = evaluate([
      'let visits = 0;',
      'outer: for (const row of [1, 2]) {',
      '  for (const column of [1, 2]) {',
      '    if (column === 1) continue outer;',
      '    visits = visits + 1;',
      '  }',
      '}',
      'let escaped = false;',
      'block: {',
      '  break block;',
      '  escaped = true;',
      '}',
      "const after = 'after';",
    ]);

    expect(result.completion.kind).toBe(EvaluationCompletionKind.Normal);
    expect(result.environment.readValue('visits')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 0,
    }));
    expect(result.environment.readValue('escaped')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Boolean,
      value: false,
    }));
    expect(result.environment.readValue('after')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: 'after',
    }));
  });

  test('distinguishes resolved targets, closed non-targets, and unresolved targets', () => {
    const source = sourceFile([
      'class Resource {}',
      'const resolved = Resource;',
      'const closed = 42;',
      'const unresolved = runtimeTarget;',
    ]);
    const evaluation = new StaticEvaluator().evaluateSourceFile(source);
    const reader = new StaticEvaluationExpressionReader(
      evaluation.environment,
      evaluation.moduleKey,
      evaluation.policy,
      evaluation.runtimeHost,
    );
    const initializers = new Map(source.statements.flatMap((statement) => {
      if (!ts.isVariableStatement(statement)) {
        return [];
      }
      const declaration = statement.declarationList.declarations[0];
      return declaration != null && ts.isIdentifier(declaration.name) && declaration.initializer != null
        ? [[declaration.name.text, declaration.initializer] as const]
        : [];
    }));

    const resolved = reader.readExpressionTarget(initializers.get('resolved')!);
    const closed = reader.readExpressionTarget(initializers.get('closed')!);
    const unresolved = reader.readExpressionTarget(initializers.get('unresolved')!);
    expect(resolved).toEqual(expect.objectContaining({
      resolutionKind: EvaluationTargetResolutionKind.ResolvedDeclaration,
      localName: 'Resource',
      declarationNode: expect.objectContaining({ kind: ts.SyntaxKind.ClassDeclaration }),
    }));
    expect(closed).toEqual(expect.objectContaining({
      resolutionKind: EvaluationTargetResolutionKind.ClosedNonTarget,
      declarationNode: null,
    }));
    expect(unresolved).toEqual(expect.objectContaining({
      resolutionKind: EvaluationTargetResolutionKind.Unresolved,
      declarationNode: null,
    }));
    expect(unresolved.openReasonKinds.length).toBeGreaterThan(0);
  });

  test('retains exact completion in binding reads and classifies the compact open boundary', () => {
    const abrupt = new ThrowEvaluationCompletion(new EvaluationStringValue('binding failure', null));
    const result = bindingSourceValueEvaluationResult(null, [], abrupt);

    expect(result).toEqual(expect.objectContaining({
      closure: RuntimeBindingSourceValueEvaluationClosure.Open,
      value: null,
      abruptCompletion: abrupt,
      openReasonKinds: [OpenSeamReasonKind.StaticEvaluationAbruptCompletion],
    }));
  });

  test('retains evaluator reason kinds beside a usable binding value', () => {
    const node = sourceFile(['const value = true;']).statements[0]!;
    const read = new EvaluationRead<EvaluationValue>(
      new EvaluationStringValue('usable', node),
      node,
      [new EvaluationOpenSeam(
        EvaluationOpenSeamKind.DynamicCall,
        'A side effect remained runtime-dependent.',
        node,
        'src/abrupt-completion.ts',
      )],
    );

    const result = bindingSourceValueEvaluationForRead(read);
    expect(result.closure).toBe(RuntimeBindingSourceValueEvaluationClosure.Open);
    expect(result.value).toBe(read.value);
    expect(result.openReasonKinds).toContain(OpenSeamReasonKind.StaticEvaluationDynamicCall);
    expect(result.openReasonKinds).not.toContain(OpenSeamReasonKind.BindingSourceNeedsRuntimeValue);
  });

  test('preserves the derived leaf value while composing owner and member pressure', () => {
    const owner = RuntimeBindingSourceValueEvaluation.openWithValue(
      new EvaluationObjectValue(new Map(), false),
      'Owner remained runtime-dependent.',
      [OpenSeamReasonKind.HostEnvironmentValue],
    );
    const member = RuntimeBindingSourceValueEvaluation.openWithValue(
      new EvaluationStringValue('leaf'),
      'Member getter remained runtime-dependent.',
      [OpenSeamReasonKind.StaticEvaluationDynamicCall],
    );
    const result = bindingSourceValueEvaluationWithPressure(member, [owner, member]);

    expect(result).toEqual(expect.objectContaining({
      closure: RuntimeBindingSourceValueEvaluationClosure.Open,
      value: expect.objectContaining({ kind: EvaluationValueKind.String, value: 'leaf' }),
      openReason: 'Member getter remained runtime-dependent. Owner remained runtime-dependent.',
    }));
    expect(result.openReasonKinds).toEqual([
      OpenSeamReasonKind.StaticEvaluationDynamicCall,
      OpenSeamReasonKind.HostEnvironmentValue,
    ]);
  });

  test('preserves abrupt classification through resource convergence reads', () => {
    const node = sourceFile(["throw 'resource failure';"]).statements[0]!;
    const abrupt = new ThrowEvaluationCompletion(new EvaluationStringValue('resource failure', node));
    const read = new EvaluationRead<EvaluationValue>(null, node, [], abrupt);

    expect(convergenceReasonKindsForRead(read, [OpenSeamReasonKind.ResourceBindableConfigurationOpen])).toEqual([
      OpenSeamReasonKind.ResourceBindableConfigurationOpen,
      OpenSeamReasonKind.StaticEvaluationAbruptCompletion,
    ]);
  });

  test('publishes abrupt resource-recognition pressure with a typed kernel reason', () => {
    const { context } = resourceContext([
      "function fail() { throw 'metadata failure'; }",
      'class BrokenResource {',
      '  static $au = fail();',
      '}',
    ]);
    const observation = new NamedResourceRecognizer().recognize(context)[0];
    expect(observation?.openSeams).toEqual([
      expect.objectContaining({
        reasonKinds: [OpenSeamReasonKind.StaticEvaluationAbruptCompletion],
      }),
    ]);
    if (observation == null) {
      throw new Error('Expected static $au recognition pressure.');
    }

    const store = new KernelStore('abrupt-resource-recognition');
    const publication = new ResourceRecognitionPublicationSupport(store, store)
      .recordsForOpenSeams(context, observation.openSeams, 'abrupt-resource');
    const seam = publication.records.find((record): record is OpenSeam => record instanceof OpenSeam);
    expect(seam?.reasonKinds).toEqual([OpenSeamReasonKind.StaticEvaluationAbruptCompletion]);
  });

  test('retains evaluator pressure beside a usable resource definition', () => {
    const { context } = resourceContext([
      'function metadata() {',
      '  unresolvedMetadataEffect();',
      "  return { type: 'custom-element', name: 'partial-resource' };",
      '}',
      'class PartialResource {',
      '  static $au = metadata();',
      '}',
    ]);

    const observation = new NamedResourceRecognizer().recognize(context)[0];
    expect(observation?.definition).toEqual(expect.objectContaining({ name: 'partial-resource' }));
    expect(observation?.openSeams.length).toBeGreaterThan(0);
    expect(observation?.openSeams.some((open) => open.reasonKinds.length > 0)).toBe(true);
  });

  test('respects object-spread order while retaining resource metadata uncertainty', () => {
    const { context } = resourceContext([
      'const runtimeMetadata = unresolvedMetadata;',
      'class BeforeSpread {',
      "  static $au = { name: 'before-spread', ...runtimeMetadata, type: 'custom-element' };",
      '}',
      'class AfterSpread {',
      "  static $au = { ...runtimeMetadata, type: 'custom-element', name: 'after-spread' };",
      '}',
    ]);
    const observations = new NamedResourceRecognizer().recognize(context);
    const before = observations.find((observation) => observation.definition?.target?.localName === 'BeforeSpread');
    const after = observations.find((observation) => observation.definition?.target?.localName === 'AfterSpread');

    expect(before?.definition.name).toBeNull();
    expect(before?.openSeams.some((open) => open.reasonKinds.length > 0)).toBe(true);
    expect(after?.definition.name).toBe('after-spread');
    expect(after?.openSeams.some((open) => open.reasonKinds.length > 0)).toBe(true);
  });

  test('keeps abrupt scalar and alias metadata open instead of applying absence defaults', () => {
    const { context, classNode } = resourceContext([
      "function fail() { throw 'metadata failure'; }",
      'class BrokenResource {',
      '  static containerless = fail();',
      '  static aliases = fail();',
      '}',
    ]);

    const containerless = readBooleanField(
      context,
      null,
      classNode,
      'containerless',
      'Containerless metadata stayed open.',
    );
    expect(containerless.value).toBeNull();
    expect(containerless.open[0]?.reasonKinds).toContain(OpenSeamReasonKind.StaticEvaluationAbruptCompletion);

    const aliases = readStaticAliasMetadata(context, classNode);
    expect(aliases.aliases).toEqual([]);
    expect(aliases.open[0]?.reasonKinds).toContain(OpenSeamReasonKind.StaticEvaluationAbruptCompletion);
  });

  test('distinguishes closed metadata absence from a known value with evaluator pressure', () => {
    const { context, classNode } = resourceContext([
      'function containerlessValue() {',
      '  unresolvedMetadataEffect();',
      '  return true;',
      '}',
      'class PartialResource {',
      '  static containerless = containerlessValue();',
      '  static aliases = undefined;',
      '}',
    ]);

    const containerless = readBooleanField(
      context,
      null,
      classNode,
      'containerless',
      'Containerless metadata stayed open.',
    );
    expect(containerless.value).toBe(true);
    expect(containerless.open.length).toBeGreaterThan(0);

    const aliases = readStaticAliasMetadata(context, classNode);
    expect(aliases).toEqual({ aliases: [], open: [] });
  });

  test('reports an abruptly evaluated watch callback as open rather than invalid', () => {
    const { context, classNode } = resourceContext([
      "function fail() { throw 'watch callback failure'; }",
      "@watch('value', fail())",
      'class BrokenWatch {}',
    ]);
    const store = new KernelStore('abrupt-watch-metadata');
    const read = readWatches(
      store,
      context,
      'abrupt-watch',
      null,
      classNode,
      store.handles.identity('abrupt-watch'),
      store.handles.provenance('abrupt-watch'),
      WatchDefinitionObjectWatchesPolicy.Include,
    );

    expect(read.issues).toEqual([]);
    expect(read.watches).toEqual([]);
    expect(read.open[0]?.reasonKinds).toContain(OpenSeamReasonKind.StaticEvaluationAbruptCompletion);
  });

  test('does not publish object fields that a later unknown spread may replace', () => {
    const { context, classNode } = resourceContext([
      'const runtimeBindables = unresolvedBindables;',
      'const runtimeWatch = unresolvedWatch;',
      'class PressureResource {',
      "  static bindables = { before: true, ...runtimeBindables, after: true };",
      '  static watches = [',
      "    { expression: 'before', callback: 'beforeChanged', flush: 'sync', ...runtimeWatch },",
      "    { ...runtimeWatch, expression: 'after', callback: 'afterChanged', flush: 'sync' },",
      '  ];',
      '}',
    ]);
    const store = new KernelStore('property-pressure-resource');
    const bindables = readBindables(
      store,
      context,
      'property-pressure-bindables',
      null,
      classNode,
      new ResourceTargetReference(null, null, 'PressureResource'),
      store.handles.identity('property-pressure-resource'),
      store.handles.provenance('property-pressure-resource'),
      store,
    );
    const watches = readWatches(
      store,
      context,
      'property-pressure-watches',
      null,
      classNode,
      store.handles.identity('property-pressure-resource'),
      store.handles.provenance('property-pressure-resource'),
      WatchDefinitionObjectWatchesPolicy.Include,
    );

    expect(bindables.bindables.map((bindable) => bindable.name)).toEqual(['after']);
    expect(bindables.open.length).toBeGreaterThan(0);
    expect(watches.watches.map((watch) => watch.expression.propertyKey?.text)).toEqual(['after']);
    expect(watches.open.length).toBeGreaterThan(0);
  });

  test('respects spread order when reading shadow-root annotation options', () => {
    const before = resourceContext([
      'const runtimeShadow = unresolvedShadow;',
      "@useShadowDOM({ mode: 'closed', ...runtimeShadow })",
      'class BeforeShadowSpread {}',
    ]);
    const after = resourceContext([
      'const runtimeShadow = unresolvedShadow;',
      "@useShadowDOM({ ...runtimeShadow, mode: 'closed' })",
      'class AfterShadowSpread {}',
    ]);
    const beforeRead = readCustomElementMetadataAnnotations(before.context, before.classNode);
    const afterRead = readCustomElementMetadataAnnotations(after.context, after.classNode);

    expect(beforeRead.shadowOptions).toBeNull();
    expect(beforeRead.open.length).toBeGreaterThan(0);
    expect(afterRead.shadowOptions?.mode).toBe(ShadowRootMode.Closed);
    expect(afterRead.open.length).toBeGreaterThan(0);
  });
});

function evaluate(
  lines: readonly string[],
  runtimeHost: StaticEvaluationRuntimeHost = {},
) {
  return new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(sourceFile(lines));
}

function sourceFile(lines: readonly string[]): ts.SourceFile {
  return ts.createSourceFile(
    'src/abrupt-completion.ts',
    lines.join('\n'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function resourceContext(lines: readonly string[]): {
  readonly context: ResourceRecognitionContext;
  readonly classNode: ts.ClassLikeDeclarationBase;
} {
  const source = sourceFile(lines);
  const evaluation = new StaticEvaluator().evaluateSourceFile(source);
  const context = new ResourceRecognitionContext(
    source,
    evaluation.moduleKey,
    new KernelStore('abrupt-resource-context').handles.address('source'),
    'abrupt-resource-project',
    evaluation,
    null,
    null,
    [],
    [],
  );
  const classNode = source.statements.find((statement): statement is ts.ClassDeclaration =>
    ts.isClassDeclaration(statement)
  );
  if (classNode == null) {
    throw new Error('Expected a resource class declaration.');
  }
  return { context, classNode };
}
