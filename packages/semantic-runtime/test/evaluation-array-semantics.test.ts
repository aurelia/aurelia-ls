import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  EvaluationArrayCallbackClosure,
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
import { EvaluationValueEvidence } from '../src/evaluation/value-pressure.js';

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

  test('retains exact sparse positions for reads and own-property enumeration', () => {
    const result = evaluate([
      'const sparse = [, 8, , 10];',
      'const length = sparse.length;',
      'const firstHole = sparse[0];',
      'const firstValue = sparse[1];',
      'const keys = Object.keys(sparse);',
      'const values = Object.values(sparse);',
      'const includesHole = sparse.includes(undefined);',
      'const indexOfHole = sparse.indexOf(undefined);',
      "const joined = sparse.join('|');",
    ]);
    const sparse = requireArray(result, 'sparse');

    expect(sparse.exactLength).toBe(4);
    expect(sparse.elements.map((element) => element.runtimeIndex)).toEqual([1, 3]);
    expect(result.environment.readValue('length')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 4,
    }));
    expect(result.environment.readValue('firstHole')?.kind).toBe(EvaluationValueKind.Undefined);
    expect(result.environment.readValue('firstValue')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 8,
    }));
    expect(arrayPrimitiveValues(requireArray(result, 'keys'))).toEqual(['1', '3']);
    expect(arrayPrimitiveValues(requireArray(result, 'values'))).toEqual([8, 10]);
    expect(result.environment.readValue('includesHole')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Boolean,
      value: true,
    }));
    expect(result.environment.readValue('indexOfHole')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: -1,
    }));
    expect(result.environment.readValue('joined')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.String,
      value: '|8||10',
    }));
  });

  test('distinguishes sparse callback visitation and result density', () => {
    const result = evaluate([
      'const source = [, 8, , 10];',
      'const mapVisits = [];',
      'const mapped = source.map((value, index) => { mapVisits.push(index); return value * 2; });',
      'const filterVisits = [];',
      'const filtered = source.filter((value, index) => { filterVisits.push(index); return true; });',
      'const findVisits = [];',
      'const found = source.find((value, index) => { findVisits.push(index); return false; });',
      'const forEachVisits = [];',
      'source.forEach((value, index) => { forEachVisits.push(index); });',
      'const reduceVisits = [];',
      'source.reduce((total, value, index) => { reduceVisits.push(index); return total + value; }, 0);',
    ]);
    const mapped = requireArray(result, 'mapped');
    const filtered = requireArray(result, 'filtered');

    expect(arrayPrimitiveValues(requireArray(result, 'mapVisits'))).toEqual([1, 3]);
    expect(mapped.exactLength).toBe(4);
    expect(mapped.elements.map((element) => element.runtimeIndex)).toEqual([1, 3]);
    expect(arrayPrimitiveValues(mapped)).toEqual([undefined, 16, undefined, 20]);
    expect(arrayPrimitiveValues(requireArray(result, 'filterVisits'))).toEqual([1, 3]);
    expect(filtered.exactLength).toBe(2);
    expect(filtered.elements.map((element) => element.runtimeIndex)).toEqual([0, 1]);
    expect(arrayPrimitiveValues(filtered)).toEqual([8, 10]);
    expect(arrayPrimitiveValues(requireArray(result, 'findVisits'))).toEqual([0, 1, 2, 3]);
    expect(result.environment.readValue('found')).toBe(EvaluationUndefined);
    expect(arrayPrimitiveValues(requireArray(result, 'forEachVisits'))).toEqual([1, 3]);
    expect(arrayPrimitiveValues(requireArray(result, 'reduceVisits'))).toEqual([1, 3]);
  });

  test('preserves or densifies holes according to each array operation', () => {
    const result = evaluate([
      'const source = [, 2, , 4];',
      'const sliced = source.slice(0, 3);',
      'const concatenated = source.concat([, 5]);',
      'const flattened = [, [1, , 2], 3].flat();',
      'const reversedCopy = source.toReversed();',
      'const splicedCopy = source.toSpliced(1, 1);',
      'const replacedCopy = source.with(1, 9);',
      'const sortedCopy = source.toSorted();',
      'const reversed = [, 2, , 4];',
      'reversed.reverse();',
      'const spliced = [, 2, , 4];',
      'const removed = spliced.splice(0, 3);',
    ]);

    expect(arrayShape(requireArray(result, 'sliced'))).toEqual({ length: 3, indices: [1] });
    expect(arrayShape(requireArray(result, 'concatenated'))).toEqual({ length: 6, indices: [1, 3, 5] });
    expect(arrayPrimitiveValues(requireArray(result, 'flattened'))).toEqual([1, 2, 3]);
    expect(arrayPrimitiveValues(requireArray(result, 'reversedCopy'))).toEqual([4, undefined, 2, undefined]);
    expect(arrayPrimitiveValues(requireArray(result, 'splicedCopy'))).toEqual([undefined, undefined, 4]);
    expect(arrayPrimitiveValues(requireArray(result, 'replacedCopy'))).toEqual([undefined, 9, undefined, 4]);
    expect(arrayPrimitiveValues(requireArray(result, 'sortedCopy'))).toEqual([2, 4, undefined, undefined]);
    expect(arrayShape(requireArray(result, 'reversed'))).toEqual({ length: 4, indices: [0, 2] });
    expect(arrayPrimitiveValues(requireArray(result, 'reversed'))).toEqual([4, undefined, 2, undefined]);
    expect(arrayShape(requireArray(result, 'removed'))).toEqual({ length: 3, indices: [1] });
    expect(arrayShape(requireArray(result, 'spliced'))).toEqual({ length: 1, indices: [0] });
  });

  test('applies Array constructor overloads after argument-spread expansion', () => {
    const result = evaluate([
      'const sparse = new Array(2);',
      "const scalar = new Array('x');",
      'const spreadLength = new Array(...[2]);',
      'const spreadValues = new Array(...[, 2]);',
      'const ofSpreadValues = Array.of(...[, 2]);',
      'const invalidLength = new Array(1.5);',
    ]);

    expect(arrayShape(requireArray(result, 'sparse'))).toEqual({ length: 2, indices: [] });
    expect(arrayPrimitiveValues(requireArray(result, 'scalar'))).toEqual(['x']);
    expect(arrayShape(requireArray(result, 'spreadLength'))).toEqual({ length: 2, indices: [] });
    expect(arrayPrimitiveValues(requireArray(result, 'spreadValues'))).toEqual([undefined, 2]);
    expect(arrayPrimitiveValues(requireArray(result, 'ofSpreadValues'))).toEqual([undefined, 2]);
    expect(result.environment.readValue('invalidLength')?.kind).toBe(EvaluationValueKind.Unknown);
  });

  test('uses one positional argument phase across local calls and array callbacks', () => {
    const result = evaluate([
      'function pair(left, right) { return [left, right]; }',
      'function offset(value) { return this.base + value; }',
      'const localSpread = pair(...[, 2]);',
      'const calledSpread = offset.call({ base: 10 }, ...[2]);',
      'const mappedSpread = [1, 2].map(...[offset, { base: 20 }]);',
      'const fromSpread = Array.from(...[[3], offset, { base: 30 }]);',
      'function mapArrow() { return [1].map((value) => this.base + value, { base: 100 }); }',
      'const mappedArrow = mapArrow.call({ base: 10 });',
    ]);

    expect(arrayPrimitiveValues(requireArray(result, 'localSpread'))).toEqual([undefined, 2]);
    expect(result.environment.readValue('calledSpread')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 12,
    }));
    expect(arrayPrimitiveValues(requireArray(result, 'mappedSpread'))).toEqual([21, 22]);
    expect(arrayPrimitiveValues(requireArray(result, 'fromSpread'))).toEqual([33]);
    expect(arrayPrimitiveValues(requireArray(result, 'mappedArrow'))).toEqual([11]);
  });

  test('spreads closed Set and Map iterators into runtime argument positions', () => {
    const result = evaluate([
      'const setArguments = Array.of(...new Set([1, 2]));',
      "const mapArguments = Array.of(...new Map([[1, 'one']]));",
    ]);

    expect(arrayPrimitiveValues(requireArray(result, 'setArguments'))).toEqual([1, 2]);
    const mapArguments = requireArray(result, 'mapArguments');
    expect(mapArguments.exactLength).toBe(1);
    expect(mapArguments.elements[0]?.value.kind).toBe(EvaluationValueKind.Array);
    expect(arrayPrimitiveValues(mapArguments.elements[0]!.value as EvaluationArrayValue)).toEqual([1, 'one']);
  });

  test('evaluates ignored arguments but does not publish effects after an open spread', () => {
    const runtimeHost: StaticEvaluationRuntimeHost = {
      resolveIdentifier: (identifier) => identifier.text === 'dynamicItems'
        ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'dynamicItems', identifier)
        : null,
    };
    const result = evaluate([
      'const effects = [];',
      'const source = [1, 2];',
      "const popped = source.pop(effects.push('ignored'));",
      "const blocked = source.push(effects.push('before'), ...dynamicItems, effects.push('after'));",
    ], runtimeHost);

    expect(arrayPrimitiveValues(requireArray(result, 'effects'))).toEqual(['ignored', 'before']);
    expect(arrayPrimitiveValues(requireArray(result, 'source'))).toEqual([1]);
    expect(result.environment.readValue('popped')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 2,
    }));
    expect(result.environment.readValue('blocked')?.kind).toBe(EvaluationValueKind.Unknown);
  });

  test('evaluates optional-call arguments only after a non-nullish callee is known', () => {
    const runtimeHost: StaticEvaluationRuntimeHost = {
      resolveIdentifier: (identifier) => identifier.text === 'externalCallback'
        ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'externalCallback', identifier)
        : null,
    };
    const result = evaluate([
      'const effects = [];',
      "const externalResult = externalCallback?.(effects.push('called'));",
      'const absent = null;',
      "const absentResult = absent?.(effects.push('skipped'));",
    ], runtimeHost);

    expect(arrayPrimitiveValues(requireArray(result, 'effects'))).toEqual(['called']);
    expect(result.environment.readValue('externalResult')?.kind).toBe(EvaluationValueKind.BoundaryValue);
    expect(result.environment.readValue('absentResult')?.kind).toBe(EvaluationValueKind.Undefined);
  });

  test('snapshots callback length while reading each future index live', () => {
    const result = evaluate([
      'const source = [1, 2];',
      'const visits = [];',
      'const mapped = source.map((value, index, receiver) => {',
      '  visits.push(value);',
      '  if (index === 0) {',
      '    receiver.splice(1, 1, 9);',
      '    receiver.push(3);',
      '  }',
      '  return value;',
      '});',
      'const holes = [1, , 3];',
      'const holeVisits = [];',
      'const filledDuringMap = holes.map((value, index, receiver) => {',
      '  holeVisits.push(index);',
      '  if (index === 0) receiver.fill(2, 1, 2);',
      '  return value;',
      '});',
      'const findSource = [1, 2];',
      'const found = findSource.find((value, index, receiver) => {',
      '  if (index === 0) receiver.splice(1, 1, 9);',
      '  return value === 9;',
      '});',
    ]);

    expect(arrayPrimitiveValues(requireArray(result, 'visits'))).toEqual([1, 9]);
    expect(arrayPrimitiveValues(requireArray(result, 'mapped'))).toEqual([1, 9]);
    expect(arrayPrimitiveValues(requireArray(result, 'source'))).toEqual([1, 9, 3]);
    expect(arrayPrimitiveValues(requireArray(result, 'holeVisits'))).toEqual([0, 1, 2]);
    expect(arrayPrimitiveValues(requireArray(result, 'filledDuringMap'))).toEqual([1, 2, 3]);
    expect(result.environment.readValue('found')).toEqual(expect.objectContaining({
      kind: EvaluationValueKind.Number,
      value: 9,
    }));
  });

  test('preserves a callback result extent when receiver membership becomes open', () => {
    const runtimeHost: StaticEvaluationRuntimeHost = {
      resolveIdentifier: (identifier) => identifier.text === 'dynamicStart'
        ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'dynamicStart', identifier)
        : null,
    };
    const result = evaluate([
      'const source = [1, 2];',
      'const mapped = source.map((value, index, receiver) => {',
      '  if (index === 0) receiver.splice(dynamicStart, 1);',
      '  return value;',
      '});',
    ], runtimeHost);
    const mapped = requireArray(result, 'mapped');

    expect(mapped.exactLength).toBe(2);
    expect(mapped.shape.hasExactElements).toBe(false);
    expect(mapped.shape.hasExactOrder).toBe(true);
  });

  test('uses ECMAScript lexical default sort and UTF-16 string enumeration', () => {
    const result = evaluate([
      "const sorted = ['a', 'Z'].toSorted();",
      "const stringKeys = Object.keys('😀');",
      "const stringValues = Object.values('😀');",
    ]);

    expect(arrayPrimitiveValues(requireArray(result, 'sorted'))).toEqual(['Z', 'a']);
    expect(arrayPrimitiveValues(requireArray(result, 'stringKeys'))).toEqual(['0', '1']);
    expect(arrayPrimitiveValues(requireArray(result, 'stringValues'))).toEqual(['\ud83d', '\ude00']);
  });

  test('preflights callback budgets before user code can mutate evaluator state', () => {
    const values = Array.from({ length: 501 }, (_, index) => String(index)).join(',');
    const result = evaluate([
      'const visits = [];',
      `const mapped = [${values}].map((value) => { visits.push(value); return value; });`,
    ]);

    expect(requireArray(result, 'visits').elements).toEqual([]);
    expect(result.environment.readValue('mapped')?.kind).toBe(EvaluationValueKind.Unknown);
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
              new EvaluationValueEvidence(
                new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'predicate'),
                [],
              ),
              EvaluationArrayCallbackClosure.Open,
              ['predicate pressure'],
            )
          : EvaluationArrayCallbackRead.value(
              new EvaluationValueEvidence(new EvaluationBooleanValue(true), []),
              EvaluationArrayCallbackClosure.Value,
            );
      },
    );

    expect(decision.kind).toBe(EvaluationArrayMethodDecisionKind.Open);
    expect(decision.evidence).toBeNull();
    expect(decision.pressure).toEqual(['predicate pressure']);
    expect(visited).toEqual([0]);
  });

  test('retains callback pressure through deterministic map and forEach results', () => {
    const receiver = array(10, 20);
    const mapped = evaluationArrayMapDecision<string, string>(
      receiver,
      null,
      (_arguments, index) => EvaluationArrayCallbackRead.value(
        new EvaluationValueEvidence(new EvaluationNumberValue(index), []),
        EvaluationArrayCallbackClosure.Value,
        [`map:${index}`],
      ),
    );
    const forEach = evaluationArrayForEachDecision<string, string>(
      receiver,
      null,
      (_arguments, index) => EvaluationArrayCallbackRead.value(
        new EvaluationValueEvidence(new EvaluationNumberValue(index), []),
        EvaluationArrayCallbackClosure.Value,
        [`forEach:${index}`],
      ),
    );

    expect(mapped.kind).toBe(EvaluationArrayMethodDecisionKind.Value);
    expect(mapped.pressure).toEqual(['map:0', 'map:1']);
    expect(mapped.evidence?.value.kind === EvaluationValueKind.Array
      ? mapped.evidence.value.elements.map((element) => element.value)
      : null).toEqual([
      expect.objectContaining({ kind: EvaluationValueKind.Number, value: 0 }),
      expect.objectContaining({ kind: EvaluationValueKind.Number, value: 1 }),
    ]);
    expect(forEach.evidence?.value).toBe(EvaluationUndefined);
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
  );
}

function requireArray(
  result: ReturnType<typeof evaluate>,
  name: string,
): EvaluationArrayValue {
  const value = result.environment.readValue(name);
  expect(value?.kind, name).toBe(EvaluationValueKind.Array);
  return value as EvaluationArrayValue;
}

function arrayShape(value: EvaluationArrayValue): { readonly length: number | null; readonly indices: readonly (number | null)[] } {
  return {
    length: value.exactLength,
    indices: value.elements.map((element) => element.runtimeIndex),
  };
}

function arrayPrimitiveValues(value: EvaluationArrayValue): unknown[] {
  return Array.from({ length: value.exactLength ?? value.elements.length }, (_, index) => {
    const element = value.elementAtRuntimeIndex(index);
    if (element == null || element.value.kind === EvaluationValueKind.Undefined) {
      return undefined;
    }
    if (
      element.value.kind === EvaluationValueKind.Number
      || element.value.kind === EvaluationValueKind.String
      || element.value.kind === EvaluationValueKind.Boolean
    ) {
      return element.value.value;
    }
    return element.value.kind;
  });
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
