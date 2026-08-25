import { describe, expect, test } from 'vitest';

import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import {
  EvaluationValueRelationKind,
  bindEvaluationValueJoin,
  bindEvaluationValueLineage,
  evaluationSameValueDecision,
  evaluationSameValueZeroDecision,
  evaluationStrictEqualityDecision,
  evaluationValuesShareLineage,
} from '../src/evaluation/value-relation.js';
import { evaluationValueSnapshotsHaveEqualExecutionState } from '../src/evaluation/value-snapshot-state.js';
import {
  EvaluationArrayValue,
  EvaluationBigIntValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationModuleNamespaceValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationStringPatternHole,
  EvaluationStringPatternValue,
} from '../src/evaluation/values.js';

describe('evaluator value relation', () => {
  test('keeps strict equality, SameValue, and SameValueZero distinct', () => {
    const nan = new EvaluationNumberValue(Number.NaN);
    const zero = new EvaluationNumberValue(0);
    const negativeZero = new EvaluationNumberValue(-0);

    expect(evaluationStrictEqualityDecision(nan, nan)).toBe(EvaluationValueRelationKind.Miss);
    expect(evaluationSameValueDecision(nan, nan)).toBe(EvaluationValueRelationKind.Match);
    expect(evaluationSameValueZeroDecision(nan, nan)).toBe(EvaluationValueRelationKind.Match);
    expect(evaluationStrictEqualityDecision(zero, negativeZero)).toBe(EvaluationValueRelationKind.Match);
    expect(evaluationSameValueDecision(zero, negativeZero)).toBe(EvaluationValueRelationKind.Miss);
    expect(evaluationSameValueZeroDecision(zero, negativeZero)).toBe(EvaluationValueRelationKind.Match);
  });

  test('compares BigInt by value rather than retained literal spelling', () => {
    const decimal = new EvaluationBigIntValue('1n');
    const hexadecimal = new EvaluationBigIntValue('0x1n');

    expect(evaluationStrictEqualityDecision(decimal, hexadecimal)).toBe(EvaluationValueRelationKind.Match);
  });

  test('preserves one runtime identity across independent and nested session snapshots', () => {
    const runtimeHost = {};
    const source = new EvaluationObjectValue(new Map(), false);
    const firstFork = new StaticEvaluationSessionFork(runtimeHost);
    const first = firstFork.forkValue(source);
    const second = new StaticEvaluationSessionFork(runtimeHost).forkValue(source);
    const nested = new StaticEvaluationSessionFork(firstFork.forkRuntimeHost(runtimeHost)).forkValue(first);

    expect(first).not.toBe(source);
    expect(second).not.toBe(first);
    expect(nested).not.toBe(first);
    expect(evaluationValuesShareLineage(first, second)).toBe(true);
    expect(evaluationValuesShareLineage(source, nested)).toBe(true);
    expect(evaluationStrictEqualityDecision(first, second)).toBe(EvaluationValueRelationKind.Match);
  });

  test('does not equate independent local allocations', () => {
    const left = new EvaluationObjectValue(new Map(), false);
    const right = new EvaluationObjectValue(new Map(), false);

    expect(evaluationValuesShareLineage(left, right)).toBe(false);
    expect(evaluationStrictEqualityDecision(left, right)).toBe(EvaluationValueRelationKind.Miss);
  });

  test('preserves a common branch identity on its joined carrier', () => {
    const source = new EvaluationObjectValue(new Map(), false);
    const left = new StaticEvaluationSessionFork({}).forkValue(source);
    const right = new StaticEvaluationSessionFork({}).forkValue(source);
    const joined = new EvaluationObjectValue(new Map(), false);

    bindEvaluationValueJoin(left, right, joined);

    expect(evaluationValuesShareLineage(source, joined)).toBe(true);
    expect(evaluationStrictEqualityDecision(source, joined)).toBe(EvaluationValueRelationKind.Match);
  });

  test('keeps branch-dependent identity open without losing identity across later forks', () => {
    const left = new EvaluationObjectValue(new Map(), false);
    const right = new EvaluationObjectValue(new Map(), false);
    const joined = new EvaluationObjectValue(new Map(), false);

    bindEvaluationValueJoin(left, right, joined);
    const fork = new StaticEvaluationSessionFork({}).forkValue(joined);

    expect(evaluationStrictEqualityDecision(joined, left)).toBe(EvaluationValueRelationKind.Open);
    expect(evaluationStrictEqualityDecision(joined, right)).toBe(EvaluationValueRelationKind.Open);
    expect(evaluationStrictEqualityDecision(joined, joined)).toBe(EvaluationValueRelationKind.Match);
    expect(evaluationStrictEqualityDecision(joined, fork)).toBe(EvaluationValueRelationKind.Match);
    expect(() => bindEvaluationValueLineage(left, joined)).toThrow(
      'Cannot replace branch-dependent evaluator identity with a definite lineage.',
    );
  });

  test('keeps distinct host-boundary object identities open while matching a forked snapshot', () => {
    const runtimeHost = {};
    const source = new EvaluationBoundaryObjectValue(
      EvaluationBoundaryKind.HostEnvironment,
      'host.shared',
      new Map(),
    );
    const fork = new StaticEvaluationSessionFork(runtimeHost).forkValue(source);
    const independentlyObserved = new EvaluationBoundaryObjectValue(
      EvaluationBoundaryKind.HostEnvironment,
      'host.shared',
      new Map(),
    );

    expect(evaluationStrictEqualityDecision(source, fork)).toBe(EvaluationValueRelationKind.Match);
    expect(evaluationStrictEqualityDecision(source, independentlyObserved)).toBe(EvaluationValueRelationKind.Open);
  });

  test('does not reconstruct module namespace identity from path text', () => {
    const first = new EvaluationModuleNamespaceValue('src/shared.ts', new Map(), false);
    const second = new EvaluationModuleNamespaceValue('src/shared.ts', new Map(), false);
    const other = new EvaluationModuleNamespaceValue('src/other.ts', new Map(), false);

    expect(evaluationStrictEqualityDecision(first, second)).toBe(EvaluationValueRelationKind.Miss);
    expect(evaluationStrictEqualityDecision(first, other)).toBe(EvaluationValueRelationKind.Miss);
  });

  test('requires closed SameValue state before registry snapshots can share execution', () => {
    const zero = new EvaluationNumberValue(0);
    const negativeZero = new EvaluationNumberValue(-0);
    const nan = new EvaluationNumberValue(Number.NaN);
    const otherNan = new EvaluationNumberValue(Number.NaN);
    const boundary = new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'host.flag');
    const pattern = new EvaluationStringPatternValue(
      ['', ''],
      [new EvaluationStringPatternHole(boundary)],
    );

    expect(evaluationValueSnapshotsHaveEqualExecutionState(zero, negativeZero)).toBe(false);
    expect(evaluationValueSnapshotsHaveEqualExecutionState(nan, otherNan)).toBe(true);
    expect(evaluationValueSnapshotsHaveEqualExecutionState(boundary, boundary)).toBe(false);
    expect(evaluationValueSnapshotsHaveEqualExecutionState(pattern, pattern)).toBe(false);
  });

  test('rejects equal open property state while accepting closed lineage snapshots', () => {
    const runtimeHost = {};
    const closedSource = new EvaluationObjectValue(new Map(), false);
    const openSource = new EvaluationObjectValue(new Map([
      ['value', new EvaluationObjectProperty(
        'value',
        new EvaluationNumberValue(1),
        null,
        EvaluationObjectPropertyState.Open,
      )],
    ]), false);
    const closedLeft = new StaticEvaluationSessionFork(runtimeHost).forkValue(closedSource);
    const closedRight = new StaticEvaluationSessionFork(runtimeHost).forkValue(closedSource);
    const openLeft = new StaticEvaluationSessionFork(runtimeHost).forkValue(openSource);
    const openRight = new StaticEvaluationSessionFork(runtimeHost).forkValue(openSource);

    expect(evaluationValueSnapshotsHaveEqualExecutionState(closedLeft, closedRight)).toBe(true);
    expect(evaluationValueSnapshotsHaveEqualExecutionState(openLeft, openRight)).toBe(false);
  });

  test('bounds recursive snapshot comparison without rejecting closed cycles', () => {
    const runtimeHost = {};
    const cyclicSource = new EvaluationObjectValue(new Map(), false);
    cyclicSource.properties.set('self', new EvaluationObjectProperty(
      'self',
      cyclicSource,
      null,
      EvaluationObjectPropertyState.Closed,
    ));
    const cyclicLeft = new StaticEvaluationSessionFork(runtimeHost).forkValue(cyclicSource);
    const cyclicRight = new StaticEvaluationSessionFork(runtimeHost).forkValue(cyclicSource);

    let deepSource = new EvaluationObjectValue(new Map(), false);
    for (let depth = 0; depth < 300; depth += 1) {
      const owner = new EvaluationObjectValue(new Map(), false);
      owner.properties.set('next', new EvaluationObjectProperty(
        'next',
        deepSource,
        null,
        EvaluationObjectPropertyState.Closed,
      ));
      deepSource = owner;
    }
    const deepLeft = new StaticEvaluationSessionFork(runtimeHost).forkValue(deepSource);
    const deepRight = new StaticEvaluationSessionFork(runtimeHost).forkValue(deepSource);
    const array = new EvaluationArrayValue([]);

    expect(evaluationValueSnapshotsHaveEqualExecutionState(cyclicLeft, cyclicRight)).toBe(true);
    expect(evaluationValueSnapshotsHaveEqualExecutionState(deepLeft, deepRight)).toBe(false);
    expect(evaluationValueSnapshotsHaveEqualExecutionState(array, array)).toBe(false);
  });
});
