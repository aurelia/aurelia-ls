import { describe, expect, test } from 'vitest';

import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import {
  EvaluationValueRelationKind,
  evaluationSameValueDecision,
  evaluationSameValueZeroDecision,
  evaluationStrictEqualityDecision,
  evaluationValuesShareLineage,
} from '../src/evaluation/value-relation.js';
import {
  EvaluationBigIntValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationModuleNamespaceValue,
  EvaluationNumberValue,
  EvaluationObjectValue,
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
});
