import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  EvaluationArrayCallbackRead,
  EvaluationArrayMethodDecisionKind,
  evaluationArrayFindDecision,
  evaluationArrayForEachDecision,
  evaluationArrayMapDecision,
} from '../src/evaluation/array-callback-values.js';
import { EvaluationCompletionKind } from '../src/evaluation/completion.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../src/evaluation/evaluator.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBigIntValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationUndefined,
  EvaluationValueKind,
  evaluationValuesSameValueZero,
  evaluationValuesStrictlyEqual,
} from '../src/evaluation/values.js';

describe('evaluation array semantics', () => {
  test('distinguishes strict equality from SameValueZero', () => {
    const nan = new EvaluationNumberValue(Number.NaN);
    const zero = new EvaluationNumberValue(0);
    const negativeZero = new EvaluationNumberValue(-0);

    expect(evaluationValuesStrictlyEqual(nan, nan)).toBe(false);
    expect(evaluationValuesSameValueZero(nan, nan)).toBe(true);
    expect(evaluationValuesStrictlyEqual(zero, negativeZero)).toBe(true);
    expect(evaluationValuesSameValueZero(zero, negativeZero)).toBe(true);
    expect(evaluationValuesStrictlyEqual(
      new EvaluationBigIntValue('1n'),
      new EvaluationBigIntValue('0x1n'),
    )).toBe(true);
  });

  test('uses Array.at and the correct array search equality', () => {
    const result = evaluate([
      'const nan = 0 / 0;',
      'const at = [10, 20].at(-1);',
      'const includesNan = [nan].includes(nan);',
      'const indexOfNan = [nan].indexOf(nan);',
    ]);

    expect(result.environment.readValue('at')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 20,
    }));
    expect(result.environment.readValue('includesNan')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Boolean,
      value: true,
    }));
    expect(result.environment.readValue('indexOfNan')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: -1,
    }));
  });

  test('does not manufacture positions or length across an unknown spread', () => {
    const runtimeHost: StaticEvaluationRuntimeHost = {
      resolveIdentifier: (identifier) => identifier.text === 'dynamicItems'
        ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'dynamicItems', identifier)
        : null,
    };
    const result = evaluate([
      "const items = ['before', ...dynamicItems, 'after'];",
      'const length = items.length;',
      'const element = items[1];',
      'const at = items.at(1);',
      "const index = items.indexOf('after');",
      'const mapped = items.map((value, index) => index);',
    ], runtimeHost);

    for (const name of ['length', 'element', 'at', 'index', 'mapped']) {
      expect(result.environment.readValue(name)?.kind, name).toBe(EvaluationValueKind.Unknown);
    }
  });

  test('stops short-circuit traversal at the first unresolved predicate', () => {
    const receiver = array(1, 2);
    const visited: number[] = [];
    const decision = evaluationArrayFindDecision<string, string>(
      receiver,
      null,
      false,
      (_arguments, index) => {
        visited.push(index);
        return index === 0
          ? EvaluationArrayCallbackRead.value(
              new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'predicate'),
              ['predicate pressure'],
            )
          : EvaluationArrayCallbackRead.value(new EvaluationBooleanValue(true));
      },
    );

    expect(decision.kind).toBe(EvaluationArrayMethodDecisionKind.Open);
    expect(decision.value).toBeNull();
    expect(decision.pressure).toEqual(['predicate pressure']);
    expect(visited).toEqual([0]);
  });

  test('retains callback pressure through deterministic map and forEach results', () => {
    const receiver = array(10, 20);
    const mapped = evaluationArrayMapDecision<string, string>(
      receiver,
      null,
      (_arguments, index) => EvaluationArrayCallbackRead.value(
        new EvaluationNumberValue(index),
        [`map:${index}`],
      ),
    );
    const forEach = evaluationArrayForEachDecision<string, string>(
      receiver,
      null,
      (_arguments, index) => EvaluationArrayCallbackRead.value(
        new EvaluationNumberValue(index),
        [`forEach:${index}`],
      ),
    );

    expect(mapped.kind).toBe(EvaluationArrayMethodDecisionKind.Value);
    expect(mapped.pressure).toEqual(['map:0', 'map:1']);
    expect(mapped.value?.kind === EvaluationValueKind.Array
      ? mapped.value.elements.map((element) => element.value)
      : null).toEqual([
      expect.objectContaining({ kind: EvaluationValueKind.Number, value: 0 }),
      expect.objectContaining({ kind: EvaluationValueKind.Number, value: 1 }),
    ]);
    expect(forEach.value).toBe(EvaluationUndefined);
    expect(forEach.pressure).toEqual(['forEach:0', 'forEach:1']);
  });

  test('stops array callback execution at abrupt completion', () => {
    const result = evaluate([
      'const visited = [];',
      "function fail() { throw 'array callback failed'; }",
      'const mapped = [1, 2].map((value) => value === 1 ? fail() : value);',
      "const after = 'unreachable';",
    ]);

    expect(result.completion).toEqual(expect.objectContaining({
      kind: EvaluationCompletionKind.Throw,
      value: expect.objectContaining({
        kind: EvaluationValueKind.String,
        value: 'array callback failed',
      }),
    }));
    expect(result.environment.readValue('mapped')).toBeNull();
    expect(result.environment.readValue('after')).toBeNull();
  });
});

function array(...values: readonly number[]): EvaluationArrayValue {
  return new EvaluationArrayValue(
    values.map((value) => new EvaluationArrayElement(new EvaluationNumberValue(value), null)),
    false,
  );
}

function evaluate(
  lines: readonly string[],
  runtimeHost: StaticEvaluationRuntimeHost = {},
) {
  const source = ts.createSourceFile(
    'src/evaluation-array-semantics.ts',
    lines.join('\n'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
}
