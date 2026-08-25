import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  EvaluationBindingKind,
  EvaluationBindingState,
  ModuleEnvironmentRecord,
} from '../src/evaluation/environment.js';
import { readEvaluationEnumerableOwnEntries } from '../src/evaluation/enumerable-own-properties.js';
import {
  StaticEvaluationAmbientGlobalDeclarations,
  withStaticEvaluationAmbientGlobals,
} from '../src/evaluation/ambient-globals.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../src/evaluation/evaluator.js';
import { joinStaticEvaluationBranches } from '../src/evaluation/branch-state.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import { evaluationValueGraphOwner } from '../src/evaluation/evaluation-graph.js';
import {
  StaticConditionalExecution,
  StaticEvaluationExecutionTopology,
} from '../src/evaluation/execution-topology.js';
import {
  StaticInvocationNotApplicable,
  StaticInvocationOccurrence,
  staticInvocationValue,
} from '../src/evaluation/invocation.js';
import {
  DefaultStaticEvaluationRuntimeHost,
  delegateStaticEvaluationRuntimeHost,
} from '../src/evaluation/runtime-host.js';
import {
  EvaluationOpenSeam,
  EvaluationOpenSeamKind,
} from '../src/evaluation/seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationClassValue,
  EvaluationInstanceValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyPresence,
  EvaluationObjectPropertyState,
  EvaluationValueKind,
} from '../src/evaluation/values.js';

const branchRuntimeHost = withStaticEvaluationAmbientGlobals(
  DefaultStaticEvaluationRuntimeHost,
  new StaticEvaluationAmbientGlobalDeclarations(new Set(['flag', 'dynamicValue'])),
);

describe('static evaluation branch state', () => {
  test('evaluates unresolved arms from one baseline rather than sequentially contaminating them', () => {
    const result = evaluate([
      'const state = { value: 0 };',
      'const selected = flag ? (state.value = 1) : state.value;',
      'const after = state.value;',
    ]);

    expect(result.environment.readValue('selected')?.kind).toBe(EvaluationValueKind.BoundaryValue);
    expect(result.environment.readValue('after')?.kind).toBe(EvaluationValueKind.BoundaryValue);
    const state = result.environment.readValue('state');
    expect(state?.kind).toBe(EvaluationValueKind.Object);
    expect(state?.kind === EvaluationValueKind.Object
      ? state.properties.get('value')?.value.kind
      : null).toBe(EvaluationValueKind.BoundaryValue);
  });

  test('keeps conditional object-property presence distinct from an open property value', () => {
    const result = evaluate([
      'const state = {};',
      'const selected = flag ? (state.extra = 1) : 0;',
      "const hasExtra = 'extra' in state;",
      'const extra = state.extra;',
    ]);
    const state = result.environment.readValue('state');
    const extra = state?.kind === EvaluationValueKind.Object
      ? state.properties.get('extra')
      : null;

    expect(extra?.presence).toBe(EvaluationObjectPropertyPresence.Conditional);
    expect(extra?.presenceOpenSeams.map((seam) => seam.seamKind)).toEqual(['evaluation.dynamic-branch']);
    expect(result.environment.readValue('hasExtra')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(primitive(result.environment.readValue('extra'))).toBe(1);
    expect(result.environment.readBinding('extra')?.state).toBe(EvaluationBindingState.Open);
    expect(result.environment.readBinding('extra')?.openSeams.map((seam) => seam.seamKind))
      .toEqual(['evaluation.dynamic-branch']);
  });

  test('retains each branch that qualifies nested property value and presence closure', () => {
    const result = evaluate([
      'const presenceState = {};',
      'const presence = flag',
      '  ? (dynamicValue ? (presenceState.extra = 1) : 0)',
      '  : (presenceState.extra = 2);',
      'const valueState = { a: 0 };',
      'const value = flag ? (valueState[dynamicValue] = 1) : (valueState.a = 2);',
    ]);
    const presenceState = result.environment.readValue('presenceState');
    const valueState = result.environment.readValue('valueState');
    const extra = presenceState?.kind === EvaluationValueKind.Object
      ? presenceState.properties.get('extra')
      : null;
    const value = valueState?.kind === EvaluationValueKind.Object
      ? valueState.properties.get('a')
      : null;

    expect(extra?.presence).toBe(EvaluationObjectPropertyPresence.Conditional);
    expect(extra?.presenceOpenSeams.map((seam) => seam.node?.getText()).sort())
      .toEqual(['dynamicValue', 'flag']);
    expect(value?.state).toBe(EvaluationObjectPropertyState.Open);
    expect(value?.openSeams.map((seam) => seam.seamKind).sort()).toEqual([
      EvaluationOpenSeamKind.DynamicBranch,
      EvaluationOpenSeamKind.DynamicMutation,
    ]);
  });

  test('does not confuse a conditional property value seam with key-membership pressure', () => {
    const result = evaluate([
      'const state = {};',
      'const selected = flag ? (state.extra = missing) : 0;',
    ]);
    const state = result.environment.readValue('state');
    expect(state?.kind).toBe(EvaluationValueKind.Object);
    if (state?.kind !== EvaluationValueKind.Object) {
      return;
    }
    const entries = readEvaluationEnumerableOwnEntries(state);

    expect(entries?.entries[0]?.openSeams.map((seam) => seam.seamKind).sort()).toEqual([
      EvaluationOpenSeamKind.DynamicBranch,
      EvaluationOpenSeamKind.UnresolvedIdentifier,
    ]);
    expect(entries?.membershipOpenSeams.map((seam) => seam.seamKind))
      .toEqual([EvaluationOpenSeamKind.DynamicBranch]);
  });

  test('preserves aliases and self-cycles while joining branch-local mutations', () => {
    const result = evaluate([
      'const state = { value: 0 };',
      'state.self = state;',
      'const alias = state;',
      'const selected = flag ? (state.value = 1) : (state.value = 2);',
      'const aliasIdentity = state === alias;',
      'const cycleIdentity = state.self === state;',
    ]);

    expect(primitive(result.environment.readValue('aliasIdentity'))).toBe(true);
    expect(primitive(result.environment.readValue('cycleIdentity'))).toBe(true);
    expect(result.environment.readValue('selected')?.kind).toBe(EvaluationValueKind.BoundaryValue);
  });

  test('retains common structure while keeping branch-created object identity indeterminate', () => {
    const result = evaluate([
      'const selected = flag ? { value: 1 } : { value: 2 };',
      'const value = selected.value;',
      'const reflexive = selected === selected;',
      'const other = {};',
      'const compared = selected === other;',
    ]);

    expect(result.environment.readValue('selected')?.kind).toBe(EvaluationValueKind.Object);
    expect(result.environment.readValue('value')?.kind).toBe(EvaluationValueKind.BoundaryValue);
    expect(primitive(result.environment.readValue('reflexive'))).toBe(true);
    expect(result.environment.readValue('compared')?.kind).toBe(EvaluationValueKind.Unknown);
  });

  test('opens sparse-array membership when sibling lanes have different exact lengths', () => {
    const result = evaluate([
      'const selected = flag ? [1,,] : [1,,,];',
    ]);
    const selected = result.environment.readValue('selected');

    expect(selected?.kind).toBe(EvaluationValueKind.Array);
    if (selected?.kind !== EvaluationValueKind.Array) {
      return;
    }
    expect(selected.exactLength).toBeNull();
    expect(selected.hasExactElementPositions).toBe(false);
    expect(selected.elementOpenSeams.map((seam) => seam.seamKind))
      .toContain(EvaluationOpenSeamKind.DynamicBranch);
  });

  test('keeps property membership exact while retaining branch-dependent enumeration order', () => {
    const result = evaluate([
      'const selected = flag ? { a: 1, b: 2 } : { b: 2, a: 1 };',
      'const spread = { ...selected };',
      'const assigned = Object.assign({}, selected);',
      'const { ...rest } = selected;',
      'const rebuilt = Object.fromEntries(Object.entries(selected));',
      'const keys = Object.keys(selected);',
      'const first = keys[0];',
    ]);
    for (const name of ['selected', 'spread', 'assigned', 'rest', 'rebuilt']) {
      const value = result.environment.readValue(name);
      expect(value?.kind).toBe(EvaluationValueKind.Object);
      expect(value?.kind === EvaluationValueKind.Object
        ? value.propertyOrderOpenSeams.map((seam) => seam.seamKind)
        : []).toContain(EvaluationOpenSeamKind.DynamicBranch);
    }
    const keys = result.environment.readValue('keys');
    expect(keys?.kind).toBe(EvaluationValueKind.Array);
    expect(keys?.kind === EvaluationValueKind.Array ? keys.exactLength : null).toBe(2);
    expect(keys?.kind === EvaluationValueKind.Array ? keys.mayHaveUnknownElements : null).toBe(false);
    expect(keys?.kind === EvaluationValueKind.Array ? keys.mayHaveUnknownOrder : null).toBe(true);
    expect(result.environment.readValue('first')?.kind).toBe(EvaluationValueKind.Unknown);
  });

  test('retains branch-dependent property order on function and class objects', () => {
    const result = evaluate([
      'const fn = function () {};',
      'class Type {}',
      'const selected = flag',
      '  ? (fn.a = 1, fn.b = 2, Type.a = 1, Type.b = 2, 0)',
      '  : (fn.b = 2, fn.a = 1, Type.b = 2, Type.a = 1, 0);',
      'const fnFirst = Object.keys(fn)[0];',
      'const typeFirst = Object.keys(Type)[0];',
    ]);
    const fn = result.environment.readValue('fn');
    const type = result.environment.readValue('Type');

    expect(fn?.kind).toBe(EvaluationValueKind.Function);
    expect(type?.kind).toBe(EvaluationValueKind.Class);
    expect(fn?.kind === EvaluationValueKind.Function
      ? fn.propertyOrderOpenSeams.map((seam) => seam.seamKind)
      : []).toContain(EvaluationOpenSeamKind.DynamicBranch);
    expect(type?.kind === EvaluationValueKind.Class
      ? type.propertyOrderOpenSeams.map((seam) => seam.seamKind)
      : []).toContain(EvaluationOpenSeamKind.DynamicBranch);
    expect(result.environment.readValue('fnFirst')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.environment.readValue('typeFirst')?.kind).toBe(EvaluationValueKind.Unknown);
  });

  test('does not turn open property values into open key membership', () => {
    const result = evaluate([
      'const state = { a: 1 };',
      'const selected = flag ? (state.a = 2) : (state.a = 3);',
      'const keys = Object.keys(state);',
      'const first = keys[0];',
    ]);
    const keys = result.environment.readValue('keys');

    expect(keys?.kind).toBe(EvaluationValueKind.Array);
    expect(keys?.kind === EvaluationValueKind.Array ? keys.hasExactElementPositions : null).toBe(true);
    expect(primitive(result.environment.readValue('first'))).toBe('a');
  });

  test('retains unknown-key membership on every evaluator-local property carrier', () => {
    const result = evaluate([
      'const state = { known: 1 };',
      'const fn = function () {};',
      'class Type { static known = 1; static [dynamicValue] = 2; }',
      'state[dynamicValue] = 2;',
      'fn[dynamicValue] = 2;',
      'const stateKeys = Object.keys(state);',
      'const fnKeys = Object.keys(fn);',
      'const typeKeys = Object.keys(Type);',
    ]);
    for (const name of ['state', 'fn', 'Type']) {
      const value = result.environment.readValue(name);
      expect(value?.kind === EvaluationValueKind.Object
        || value?.kind === EvaluationValueKind.Function
        || value?.kind === EvaluationValueKind.Class).toBe(true);
      if (
        value?.kind !== EvaluationValueKind.Object
        && value?.kind !== EvaluationValueKind.Function
        && value?.kind !== EvaluationValueKind.Class
      ) {
        continue;
      }
      expect(value.mayHaveUnknownProperties).toBe(true);
      expect(value.shapeOpenSeams.map((seam) => seam.seamKind))
        .toContain(EvaluationOpenSeamKind.DynamicMutation);
    }
    for (const name of ['stateKeys', 'fnKeys', 'typeKeys']) {
      const value = result.environment.readValue(name);
      expect(value?.kind).toBe(EvaluationValueKind.Array);
      expect(value?.kind === EvaluationValueKind.Array ? value.mayHaveUnknownElements : null).toBe(true);
      expect(value?.kind === EvaluationValueKind.Array ? value.mayHaveUnknownOrder : null).toBe(true);
    }
  });

  test('does not collapse SameValue-distinct numbers or non-string boundaries', () => {
    const result = evaluate([
      'const signedZero = flag ? -0 : 0;',
      'const reciprocal = 1 / signedZero;',
      'const dynamic = dynamicValue;',
      'const selected = flag ? dynamic : dynamic;',
    ]);

    expect(result.environment.readValue('signedZero')?.kind).toBe(EvaluationValueKind.BoundaryValue);
    expect(result.environment.readValue('reciprocal')?.kind).toBe(EvaluationValueKind.BoundaryValue);
    expect(result.environment.readValue('selected')).toBe(result.environment.readValue('dynamic'));
    expect(result.environment.readValue('selected')?.kind).toBe(EvaluationValueKind.BoundaryValue);
  });

  test('does not attribute inherited open carrier state to an unrelated conditional', () => {
    const result = evaluate([
      'const array = [...dynamicValue];',
      'const set = new Set([dynamicValue]);',
      'const map = new Map([[dynamicValue, 1]]);',
      'const selectedArray = flag ? array : array;',
      'const selectedSet = flag ? set : set;',
      'const selectedMap = flag ? map : map;',
    ]);
    const array = result.environment.readValue('array');
    const set = result.environment.readValue('set');
    const map = result.environment.readValue('map');
    const selectedArray = result.environment.readValue('selectedArray');
    const selectedSet = result.environment.readValue('selectedSet');
    const selectedMap = result.environment.readValue('selectedMap');

    expect(selectedArray).toBe(array);
    expect(selectedSet).toBe(set);
    expect(selectedMap).toBe(map);
    expect(selectedSet?.kind === EvaluationValueKind.Set ? selectedSet.exactSize : null).toBe(1);
    expect(selectedSet?.kind === EvaluationValueKind.Set ? selectedSet.shape.hasExactOrder : null).toBe(true);
    expect(selectedMap?.kind === EvaluationValueKind.Map ? selectedMap.exactSize : null).toBe(1);
    expect(selectedMap?.kind === EvaluationValueKind.Map ? selectedMap.shape.hasExactOrder : null).toBe(true);
    for (const [name, value] of [
      ['array', selectedArray],
      ['set', selectedSet],
      ['map', selectedMap],
    ] as const) {
      expect(value?.kind === EvaluationValueKind.Array
        || value?.kind === EvaluationValueKind.Set
        || value?.kind === EvaluationValueKind.Map).toBe(true);
      if (
        value?.kind !== EvaluationValueKind.Array
        && value?.kind !== EvaluationValueKind.Set
        && value?.kind !== EvaluationValueKind.Map
      ) {
        continue;
      }
      expect(value.aggregateOpenSeams.map((seam) => seam.seamKind), name)
        .not.toContain(EvaluationOpenSeamKind.DynamicBranch);
    }
  });

  test('retains the selecting branch when only one arm contributes causal pressure', () => {
    const result = evaluate([
      'const selected = flag ? missing : 1;',
    ]);
    const binding = result.environment.readBinding('selected');

    expect(binding?.openSeams.map((seam) => seam.seamKind).sort()).toEqual([
      EvaluationOpenSeamKind.DynamicBranch,
      EvaluationOpenSeamKind.UnresolvedIdentifier,
    ]);
  });

  test('publishes nested sibling-branch audit seams to the parent evaluator', () => {
    const result = evaluate([
      'const selected = flag ? (dynamicValue ? 1 : 2) : 3;',
    ]);
    const branchSeams = result.openSeams.filter((seam) =>
      seam.seamKind === EvaluationOpenSeamKind.DynamicBranch
    );

    expect(branchSeams).toHaveLength(2);
    expect(branchSeams.map((seam) => seam.node?.getText()).sort())
      .toEqual(['dynamicValue', 'flag']);
  });

  test('retains mutually exclusive invocation lanes without flattening them into definite calls', () => {
    const graph = new StaticEvaluationSessionFork(branchRuntimeHost);
    const runtimeHost = graph.forkRuntimeHost(branchRuntimeHost);
    const result = evaluate([
      'function before() { return 0; }',
      'function left(value) { return value; }',
      'function right(value) { return value; }',
      'function after() { return 3; }',
      'const beforeValue = before();',
      "const selected = flag ? left({ side: 'left' }) : right({ side: 'right' });",
      'const afterValue = after();',
    ], runtimeHost);
    const [before, branch, after] = result.executionTopology.events;

    expect(before).toBeInstanceOf(StaticInvocationOccurrence);
    expect(branch).toBeInstanceOf(StaticConditionalExecution);
    expect(after).toBeInstanceOf(StaticInvocationOccurrence);
    expect(result.invocations.map((invocation) => invocation.node.getText())).toEqual([
      'before()',
      'after()',
    ]);
    if (!(branch instanceof StaticConditionalExecution)) {
      return;
    }
    expect(branch.whenTrue.invocationEvaluations.map((invocation) => invocation.node.getText()))
      .toEqual(["left({ side: 'left' })"]);
    expect(branch.whenFalse.invocationEvaluations.map((invocation) => invocation.node.getText()))
      .toEqual(["right({ side: 'right' })"]);

    const leftArgument = branch.whenTrue.invocationEvaluations[0]?.argumentList.authoredArguments[0]?.evidence.value;
    const rightArgument = branch.whenFalse.invocationEvaluations[0]?.argumentList.authoredArguments[0]?.evidence.value;
    expect(leftArgument == null ? null : evaluationValueGraphOwner(leftArgument)).toBe(graph);
    expect(rightArgument == null ? null : evaluationValueGraphOwner(rightArgument)).toBe(graph);

    const fork = new StaticEvaluationSessionFork(result.runtimeHost);
    const forked = fork.forkModuleEvaluation(result);
    const forkedBranch = forked.executionTopology.events[1];
    expect(forkedBranch).toBeInstanceOf(StaticConditionalExecution);
    if (forkedBranch instanceof StaticConditionalExecution) {
      const forkedArgument = forkedBranch.whenTrue.invocationEvaluations[0]
        ?.argumentList.authoredArguments[0]?.evidence.value;
      expect(forkedArgument).not.toBe(leftArgument);
      expect(forkedArgument == null ? null : evaluationValueGraphOwner(forkedArgument)).toBe(fork);
    }
  });

  test('nests conditional execution lanes without comparing sibling-local ordinals', () => {
    const result = evaluate([
      'function left() { return 1; }',
      'function middle() { return 2; }',
      'function right() { return 3; }',
      'const selected = flag ? (dynamicValue ? left() : middle()) : right();',
    ]);
    const outer = result.executionTopology.events[0];

    expect(outer).toBeInstanceOf(StaticConditionalExecution);
    if (!(outer instanceof StaticConditionalExecution)) {
      return;
    }
    expect(outer.whenFalse.invocationEvaluations.map((invocation) => invocation.node.getText()))
      .toEqual(['right()']);
    const inner = outer.whenTrue.events[0];
    expect(inner).toBeInstanceOf(StaticConditionalExecution);
    if (!(inner instanceof StaticConditionalExecution)) {
      return;
    }
    expect(inner.ordinal).toBe(0);
    expect(inner.whenTrue.invocationEvaluations.map((invocation) => invocation.node.getText()))
      .toEqual(['left()']);
    expect(inner.whenFalse.invocationEvaluations.map((invocation) => invocation.node.getText()))
      .toEqual(['middle()']);
  });

  test('preserves one joined instance across a class back-reference cycle', () => {
    const source = ts.createSourceFile(
      'src/cyclic-instance.ts',
      'class Box {}',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const declaration = source.statements[0];
    expect(ts.isClassDeclaration(declaration)).toBe(true);
    if (!ts.isClassDeclaration(declaration)) {
      return;
    }
    const environment = new ModuleEnvironmentRecord(source.fileName, null);
    const classValue = new EvaluationClassValue(declaration, environment, declaration);
    const leftGraph = new StaticEvaluationSessionFork(DefaultStaticEvaluationRuntimeHost);
    const rightGraph = new StaticEvaluationSessionFork(DefaultStaticEvaluationRuntimeHost);
    const leftEnvironment = leftGraph.forkEnvironment(environment);
    const rightEnvironment = rightGraph.forkEnvironment(environment);
    const leftClass = leftGraph.forkValue(classValue);
    const rightClass = rightGraph.forkValue(classValue);
    const leftInstance = leftGraph.retainProduced(new EvaluationInstanceValue(leftClass));
    const rightInstance = rightGraph.retainProduced(new EvaluationInstanceValue(rightClass));
    leftInstance.properties.set('a', new EvaluationObjectProperty(
      'a', new EvaluationNumberValue(1, declaration), declaration, EvaluationObjectPropertyState.Closed,
    ));
    leftInstance.properties.set('b', new EvaluationObjectProperty(
      'b', new EvaluationNumberValue(2, declaration), declaration, EvaluationObjectPropertyState.Closed,
    ));
    rightInstance.properties.set('b', new EvaluationObjectProperty(
      'b', new EvaluationNumberValue(2, declaration), declaration, EvaluationObjectPropertyState.Closed,
    ));
    rightInstance.properties.set('a', new EvaluationObjectProperty(
      'a', new EvaluationNumberValue(1, declaration), declaration, EvaluationObjectPropertyState.Closed,
    ));
    leftClass.properties.set('current', new EvaluationObjectProperty(
      'current', leftInstance, declaration, EvaluationObjectPropertyState.Closed,
    ));
    rightClass.properties.set('current', new EvaluationObjectProperty(
      'current', rightInstance, declaration, EvaluationObjectPropertyState.Closed,
    ));
    const branchSeam = new EvaluationOpenSeam(
      EvaluationOpenSeamKind.DynamicBranch,
      'Cyclic instance test branch.',
      declaration,
      source.fileName,
    );

    const joined = joinStaticEvaluationBranches({
      environment,
      leftEnvironment,
      rightEnvironment,
      leftGraph,
      rightGraph,
      leftValue: leftInstance,
      rightValue: rightInstance,
      leftOpenSeams: [],
      rightOpenSeams: [],
      leftExecutionTopology: StaticEvaluationExecutionTopology.Empty,
      rightExecutionTopology: StaticEvaluationExecutionTopology.Empty,
      branchSeam,
      path: 'cyclic-instance',
      sourceLabel: 'flag',
      sourceBoundaryKind: EvaluationBoundaryKind.HostEnvironment,
      targetGraph: null,
    });
    expect(joined?.value.kind).toBe(EvaluationValueKind.Instance);
    if (joined?.value.kind !== EvaluationValueKind.Instance) {
      return;
    }
    expect(joined.value.classValue.properties.get('current')?.value).toBe(joined.value);
    expect(joined.value.propertyOrderOpenSeams.map((seam) => seam.seamKind))
      .toContain(EvaluationOpenSeamKind.DynamicBranch);
  });

  test('does not publish an aligned binding prefix when a later branch binding refuses to join', () => {
    const source = ts.createSourceFile(
      'src/transaction.ts',
      'let aligned; let mismatch;',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const environment = new ModuleEnvironmentRecord(source.fileName, null);
    const leftGraph = new StaticEvaluationSessionFork(DefaultStaticEvaluationRuntimeHost);
    const rightGraph = new StaticEvaluationSessionFork(DefaultStaticEvaluationRuntimeHost);
    const leftEnvironment = leftGraph.forkEnvironment(environment);
    const rightEnvironment = rightGraph.forkEnvironment(environment);
    const alignedDeclaration = source.statements[0] ?? source;
    const mismatchDeclaration = source.statements[1] ?? source;
    leftEnvironment.initializeBinding(
      'aligned', new EvaluationNumberValue(1), EvaluationBindingKind.Let, true, alignedDeclaration, [],
    );
    rightEnvironment.initializeBinding(
      'aligned', new EvaluationNumberValue(1), EvaluationBindingKind.Let, true, alignedDeclaration, [],
    );
    leftEnvironment.initializeBinding(
      'mismatch', new EvaluationNumberValue(1), EvaluationBindingKind.Let, true, mismatchDeclaration, [],
    );
    rightEnvironment.initializeBinding(
      'mismatch', new EvaluationNumberValue(1), EvaluationBindingKind.Const, false, mismatchDeclaration, [],
    );
    const branchSeam = new EvaluationOpenSeam(
      EvaluationOpenSeamKind.DynamicBranch,
      'Transactional join test branch.',
      source,
      source.fileName,
    );

    const joined = joinStaticEvaluationBranches({
      environment,
      leftEnvironment,
      rightEnvironment,
      leftGraph,
      rightGraph,
      leftValue: new EvaluationNumberValue(1),
      rightValue: new EvaluationNumberValue(1),
      leftOpenSeams: [],
      rightOpenSeams: [],
      leftExecutionTopology: StaticEvaluationExecutionTopology.Empty,
      rightExecutionTopology: StaticEvaluationExecutionTopology.Empty,
      branchSeam,
      path: 'transaction',
      sourceLabel: 'flag',
      sourceBoundaryKind: EvaluationBoundaryKind.HostEnvironment,
      targetGraph: null,
    });

    expect(joined).toBeNull();
    expect(environment.readOwnBinding('aligned')).toBeNull();
  });

  test('retains the seam that opens instance shape after incomplete constructor execution', () => {
    const result = evaluate([
      'class Box {',
      '  known = 1;',
      '  constructor() { while (flag) {} }',
      '}',
      'const box = new Box();',
    ]);
    const box = result.environment.readValue('box');

    expect(box?.kind).toBe(EvaluationValueKind.Instance);
    if (box?.kind !== EvaluationValueKind.Instance) {
      return;
    }
    expect(box.mayHaveUnknownProperties).toBe(true);
    expect(box.shapeOpenSeams.map((seam) => seam.seamKind))
      .toContain(EvaluationOpenSeamKind.UnsupportedStatement);
    expect(box.properties.get('known')?.openSeams.map((seam) => seam.seamKind))
      .toContain(EvaluationOpenSeamKind.UnsupportedStatement);
  });

  test('refuses branch speculation for hosts without a metadata join contract', () => {
    let metadataTransfers = 0;
    const resolveIdentifier: NonNullable<StaticEvaluationRuntimeHost['resolveIdentifier']> = (identifier) =>
      identifier.text === 'flag'
        ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'flag', identifier)
        : null;
    const runtimeHost: StaticEvaluationRuntimeHost = {
      resolveIdentifier,
      graphIsolatedBranchOperations: {
        resolveIdentifier,
        transferValueMetadata() {
          metadataTransfers++;
        },
      },
    };
    const result = evaluate(['const value = flag ? { a: 1 } : { a: 2 };'], runtimeHost);

    expect(metadataTransfers).toBe(0);
    expect(result.environment.readValue('value')?.kind).toBe(EvaluationValueKind.BoundaryValue);
    expect(result.openSeams.map((seam) => seam.seamKind))
      .toContain(EvaluationOpenSeamKind.DynamicBranch);
  });

  test('does not execute opaque runtime-host callbacks in unresolved sibling arms', () => {
    let calls = 0;
    const runtimeHost: StaticEvaluationRuntimeHost = {
      resolveIdentifier(identifier) {
        if (identifier.text === 'flag') {
          return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'flag', identifier);
        }
        if (identifier.text === 'touch') {
          return new EvaluationBoundaryObjectValue(
            EvaluationBoundaryKind.HostEnvironment,
            'touch',
            new Map(),
            identifier,
            true,
          );
        }
        return null;
      },
      evaluateInvocation(frame) {
        if (frame.callee.value.kind === EvaluationValueKind.BoundaryObject
          && frame.callee.value.path === 'touch') {
          calls++;
          return staticInvocationValue(new EvaluationNumberValue(calls, frame.node));
        }
        return StaticInvocationNotApplicable;
      },
    };

    const unresolved = evaluate(['const value = flag ? touch() : 0;'], runtimeHost);
    expect(calls).toBe(0);
    expect(unresolved.environment.readValue('value')?.kind).toBe(EvaluationValueKind.BoundaryValue);

    const proven = evaluate(['const value = true ? touch() : 0;'], runtimeHost);
    expect(calls).toBe(1);
    expect(primitive(proven.environment.readValue('value'))).toBe(1);
  });

  test('preserves delegated invocations in graph-isolated sibling arms', () => {
    let calls = 0;
    const resolveIdentifier: NonNullable<StaticEvaluationRuntimeHost['resolveIdentifier']> = (identifier) => {
      if (identifier.text === 'flag') {
        return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'flag', identifier);
      }
      if (identifier.text === 'probe') {
        return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'probe', identifier);
      }
      return null;
    };
    const baseHost: StaticEvaluationRuntimeHost = {
      resolveIdentifier,
      graphIsolatedBranchOperations: { resolveIdentifier },
    };
    const runtimeHost = delegateStaticEvaluationRuntimeHost(baseHost, (frame) => {
      if (
        frame.callee.value.kind === EvaluationValueKind.BoundaryValue
        && frame.callee.value.path === 'probe'
      ) {
        calls++;
        return staticInvocationValue(new EvaluationNumberValue(1, frame.node));
      }
      return StaticInvocationNotApplicable;
    });
    const result = evaluate(['const value = flag ? probe() : probe();'], runtimeHost);

    expect(calls).toBe(2);
    expect(primitive(result.environment.readValue('value'))).toBe(1);
  });
});

function evaluate(
  statements: readonly string[],
  runtimeHost: StaticEvaluationRuntimeHost = branchRuntimeHost,
) {
  const source = ts.createSourceFile(
    'src/branch-state.ts',
    statements.join('\n'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
}

function primitive(value: ReturnType<ReturnType<typeof evaluate>['environment']['readValue']>): unknown {
  if (value == null || !('value' in value)) {
    return null;
  }
  return value.value;
}
