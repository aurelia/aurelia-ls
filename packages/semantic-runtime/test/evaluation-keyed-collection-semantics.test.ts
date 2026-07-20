import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { EvaluationCompletionKind } from '../src/evaluation/completion.js';
import { StaticEvaluationSessionFork } from '../src/evaluation/evaluation-session.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../src/evaluation/evaluator.js';
import {
  isAureliaExpressionGlobalName,
  isStaticEvaluationGlobalName,
} from '../src/expression/global-names.js';
import {
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationKeyedCollectionEntryState,
  EvaluationMapValue,
  EvaluationSetValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';

describe('evaluation keyed-collection semantics', () => {
  test('normalizes constructor input with SameValueZero and preserves Map insertion position on overwrite', () => {
    const result = evaluate([
      'const nan = 0 / 0;',
      'const set = new Set([1, 1, nan, nan, -0, 0]);',
      'const setSize = set.size;',
      'const setValues = [...set];',
      "const map = new Map([[1, 'first'], [2, 'two'], [1, 'last'], [-0, 'negative-zero'], [0, 'zero']]);",
      'const mapSize = map.size;',
      'const mapEntries = [...map];',
      'const first = map.get(1);',
      'const zero = map.get(-0);',
    ]);

    expect(primitive(result.environment.readValue('setSize'))).toBe(3);
    expect(arrayPrimitives(requireArray(result, 'setValues'))).toEqual([1, Number.NaN, 0]);
    expect(primitive(result.environment.readValue('mapSize'))).toBe(3);
    expect(mapEntryPrimitives(requireArray(result, 'mapEntries'))).toEqual([
      [1, 'last'],
      [2, 'two'],
      [0, 'zero'],
    ]);
    expect(primitive(result.environment.readValue('first'))).toBe('last');
    expect(primitive(result.environment.readValue('zero'))).toBe('zero');
  });

  test('mutates aliased receivers and returns the receiver identity from fluent operations', () => {
    const result = evaluate([
      'const map = new Map();',
      'const mapAlias = map;',
      "const mapResult = map.set('one', 1);",
      'const mapSame = mapResult === mapAlias;',
      "const mapHas = mapAlias.has('one');",
      "const mapDeleted = mapAlias.delete('one');",
      "const mapMiss = mapAlias.delete('missing');",
      'const set = new Set();',
      'const setAlias = set;',
      'const setResult = set.add(1).add(1);',
      'const setSame = setResult === setAlias;',
      'const setHas = setAlias.has(1);',
      'setAlias.clear();',
      'const mapSize = map.size;',
      'const setSize = set.size;',
    ]);

    expect(primitive(result.environment.readValue('mapSame'))).toBe(true);
    expect(primitive(result.environment.readValue('mapHas'))).toBe(true);
    expect(primitive(result.environment.readValue('mapDeleted'))).toBe(true);
    expect(primitive(result.environment.readValue('mapMiss'))).toBe(false);
    expect(primitive(result.environment.readValue('setSame'))).toBe(true);
    expect(primitive(result.environment.readValue('setHas'))).toBe(true);
    expect(primitive(result.environment.readValue('mapSize'))).toBe(0);
    expect(primitive(result.environment.readValue('setSize'))).toBe(0);
  });

  test('uses one iterator projection across literals, argument spread, Array.from, and Object.fromEntries', () => {
    const result = evaluate([
      "const map = new Map([[1, 'one'], [2, 'two']]);",
      'const set = new Set([3, 4]);',
      "const literal = [...set, ...'😀a'];",
      'const arguments_ = Array.of(...map);',
      'const fromSet = Array.from(set);',
      'const object = Object.fromEntries(map);',
      'const one = object[1];',
      'const two = object[2];',
    ]);

    expect(arrayPrimitives(requireArray(result, 'literal'))).toEqual([3, 4, '😀', 'a']);
    expect(mapEntryPrimitives(requireArray(result, 'arguments_'))).toEqual([
      [1, 'one'],
      [2, 'two'],
    ]);
    expect(arrayPrimitives(requireArray(result, 'fromSet'))).toEqual([3, 4]);
    expect(primitive(result.environment.readValue('one'))).toBe('one');
    expect(primitive(result.environment.readValue('two'))).toBe('two');
  });

  test('advances Array, Set, and Map iterators live across body mutations', () => {
    const result = evaluate([
      'const array = [1];',
      'const arrayVisits = [];',
      'for (const value of array) {',
      '  arrayVisits.push(value);',
      '  if (value === 1) array.push(2);',
      '}',
      'const set = new Set([1, 2]);',
      'const setVisits = [];',
      'for (const value of set) {',
      '  setVisits.push(value);',
      '  if (value === 1) { set.delete(2); set.add(3); }',
      '}',
      "const map = new Map([[1, 'one'], [2, 'two']]);",
      'const mapVisits = [];',
      'for (const entry of map) {',
      '  mapVisits.push(entry[0]);',
      "  if (entry[0] === 1) { map.delete(2); map.set(3, 'three'); }",
      '}',
      'const yieldedSet = new Set([1, 2]);',
      'const yieldedSetVisits = [];',
      'for (const value of yieldedSet) {',
      '  yieldedSetVisits.push(value);',
      '  if (value === 1) yieldedSet.delete(1);',
      '}',
      "const yieldedMap = new Map([[1, 'one'], [2, 'two']]);",
      'const yieldedMapVisits = [];',
      'for (const entry of yieldedMap) {',
      '  yieldedMapVisits.push(entry[0]);',
      '  if (entry[0] === 1) yieldedMap.delete(1);',
      '}',
      'const resetSet = new Set([1, 2]);',
      'const resetSetVisits = [];',
      'for (const value of resetSet) {',
      '  resetSetVisits.push(value);',
      '  if (value === 1) { resetSet.clear(); resetSet.add(3); }',
      '}',
      'const readdedSet = new Set([1, 2]);',
      'const readdedSetVisits = [];',
      'for (const value of readdedSet) {',
      '  readdedSetVisits.push(value);',
      '  if (value === 1 && readdedSetVisits.length === 1) { readdedSet.delete(1); readdedSet.add(1); }',
      '}',
      "const overwrittenMap = new Map([[1, 'one'], [2, 'two']]);",
      'const overwrittenMapVisits = [];',
      'for (const entry of overwrittenMap) {',
      '  overwrittenMapVisits.push(entry[1]);',
      "  if (entry[0] === 1) overwrittenMap.set(2, 'replaced');",
      '}',
    ]);

    expect(arrayPrimitives(requireArray(result, 'arrayVisits'))).toEqual([1, 2]);
    expect(arrayPrimitives(requireArray(result, 'setVisits'))).toEqual([1, 3]);
    expect(arrayPrimitives(requireArray(result, 'mapVisits'))).toEqual([1, 3]);
    expect(arrayPrimitives(requireArray(result, 'yieldedSetVisits'))).toEqual([1, 2]);
    expect(arrayPrimitives(requireArray(result, 'yieldedMapVisits'))).toEqual([1, 2]);
    expect(arrayPrimitives(requireArray(result, 'resetSetVisits'))).toEqual([1, 3]);
    expect(arrayPrimitives(requireArray(result, 'readdedSetVisits'))).toEqual([1, 2, 1]);
    expect(arrayPrimitives(requireArray(result, 'overwrittenMapVisits'))).toEqual(['one', 'replaced']);
    expect(result.openSeams).toEqual([]);
  });

  test('advances Array.from iterators between mapper callbacks', () => {
    const result = evaluate([
      'const array = [1];',
      'const fromArray = Array.from(array, (value) => {',
      '  if (value === 1) array.push(2);',
      '  return value;',
      '});',
      'const set = new Set([1]);',
      'const fromSet = Array.from(set, (value) => {',
      '  if (value === 1) set.add(2);',
      '  return value;',
      '});',
      "const map = new Map([[1, 'one']]);",
      'const fromMap = Array.from(map, (entry) => {',
      "  if (entry[0] === 1) map.set(2, 'two');",
      '  return entry[0];',
      '});',
    ]);

    expect(arrayPrimitives(requireArray(result, 'fromArray'))).toEqual([1, 2]);
    expect(arrayPrimitives(requireArray(result, 'fromSet'))).toEqual([1, 2]);
    expect(arrayPrimitives(requireArray(result, 'fromMap'))).toEqual([1, 2]);
  });

  test('keeps unknown key identity separate from known value evidence and aliases', () => {
    const result = evaluate([
      "const map = new Map([['known', 1]]);",
      'const alias = map;',
      'const returned = map.set(dynamicKey, 2);',
      'const same = returned === alias;',
      'const size = alias.size;',
      "const known = alias.get('known');",
      "const stillHasKnown = alias.has('known');",
      "const projected = Object.fromEntries(new Map([['stable', dynamicValue]]));",
      'const projectedValue = projected.stable;',
    ], boundaryHost('dynamicKey', 'dynamicValue'));
    const map = requireMap(result, 'map');

    expect(primitive(result.environment.readValue('same'))).toBe(true);
    expect(result.environment.readValue('size')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(primitive(result.environment.readValue('known'))).toBe(1);
    expect(result.environment.readBinding('known')?.openSeams.length).toBeGreaterThan(0);
    expect(primitive(result.environment.readValue('stillHasKnown'))).toBe(true);
    expect(result.environment.readValue('projectedValue')?.kind).toBe(EvaluationValueKind.BoundaryValue);
    expect(map.exactSize).toBeNull();
    expect(map.entries[0]?.valueOpenSeams.length).toBeGreaterThan(0);
    expect(map.entries[1]).toEqual(expect.objectContaining({
      state: EvaluationKeyedCollectionEntryState.Conditional,
      value: expect.objectContaining({ kind: EvaluationValueKind.Number, value: 2 }),
    }));
  });

  test('qualifies membership rather than pretending an unknown delete missed', () => {
    const result = evaluate([
      "const map = new Map([['one', 1], ['two', 2]]);",
      'const deleted = map.delete(dynamicKey);',
      'const size = map.size;',
      "const one = map.get('one');",
      'const entries = [...map];',
    ], boundaryHost('dynamicKey'));
    const map = requireMap(result, 'map');

    expect(result.environment.readValue('deleted')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.environment.readValue('size')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.environment.readValue('one')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(requireArray(result, 'entries').shape.hasExactPositions).toBe(false);
    expect(map.entries.every((entry) => entry.state === EvaluationKeyedCollectionEntryState.Conditional)).toBe(true);
  });

  test('lets later exact mutations repair facts left open by dynamic keys', () => {
    const result = evaluate([
      "const map = new Map([['known', 1]]);",
      'map.set(dynamicKey, 2);',
      "map.set('known', 3);",
      "const repairedMapValue = map.get('known');",
      "map.delete('known');",
      "const deletedMapKey = map.has('known');",
      "const repairedAfterDelete = new Map([['known', 1]]);",
      'repairedAfterDelete.delete(dynamicKey);',
      "repairedAfterDelete.set('known', 4);",
      "const repairedAfterDeleteValue = repairedAfterDelete.get('known');",
      'const set = new Set([1]);',
      'set.add(dynamicKey);',
      'set.add(1);',
      'const repairedSetKey = set.has(1);',
      'set.delete(1);',
      'const deletedSetKey = set.has(1);',
    ], boundaryHost('dynamicKey'));

    expect(primitive(result.environment.readValue('repairedMapValue'))).toBe(3);
    expect(result.environment.readBinding('repairedMapValue')?.openSeams).toHaveLength(0);
    expect(primitive(result.environment.readValue('deletedMapKey'))).toBe(false);
    expect(primitive(result.environment.readValue('repairedAfterDeleteValue'))).toBe(4);
    expect(result.environment.readBinding('repairedAfterDeleteValue')?.openSeams).toHaveLength(0);
    expect(primitive(result.environment.readValue('repairedSetKey'))).toBe(true);
    expect(primitive(result.environment.readValue('deletedSetKey'))).toBe(false);
  });

  test('keeps weak collection capability distinct from keyed membership', () => {
    const result = evaluate([
      'const key = {};',
      'const weakMap = new WeakMap([[key, 1]]);',
      'const weakSet = new WeakSet([key]);',
      'const mapValue = weakMap.get(key);',
      'const setHas = weakSet.has(key);',
      'const weakMapIsWeakMap = weakMap instanceof WeakMap;',
      'const weakMapIsMap = weakMap instanceof Map;',
      'const weakSetIsWeakSet = weakSet instanceof WeakSet;',
      'const weakSetIsSet = weakSet instanceof Set;',
      'const weakMapTag = Object.prototype.toString.call(weakMap);',
      'const weakSetTag = Object.prototype.toString.call(weakSet);',
      'const weakMapConstructorType = typeof WeakMap;',
      'const mapConstructorType = typeof Map;',
      'const weakSize = weakMap.size;',
      'const spread = [...weakSet];',
    ]);

    expect(primitive(result.environment.readValue('mapValue'))).toBe(1);
    expect(primitive(result.environment.readValue('setHas'))).toBe(true);
    expect(primitive(result.environment.readValue('weakMapIsWeakMap'))).toBe(true);
    expect(primitive(result.environment.readValue('weakMapIsMap'))).toBe(false);
    expect(primitive(result.environment.readValue('weakSetIsWeakSet'))).toBe(true);
    expect(primitive(result.environment.readValue('weakSetIsSet'))).toBe(false);
    expect(primitive(result.environment.readValue('weakMapTag'))).toBe('[object WeakMap]');
    expect(primitive(result.environment.readValue('weakSetTag'))).toBe('[object WeakSet]');
    expect(primitive(result.environment.readValue('weakMapConstructorType'))).toBe('function');
    expect(primitive(result.environment.readValue('mapConstructorType'))).toBe('function');
    expect(result.environment.readValue('weakSize')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.environment.readValue('spread')?.kind).toBe(EvaluationValueKind.Array);
    expect((result.environment.readValue('spread') as EvaluationArrayValue).shape.hasExactElements).toBe(false);
  });

  test('lets exact emptiness decide unknown-key reads while open writes retain conditional identity', () => {
    const result = evaluate([
      'const emptyMap = new Map();',
      'const emptyMapValue = emptyMap.get(dynamicKey);',
      'const emptyMapHas = emptyMap.has(dynamicKey);',
      'const emptyMapDeleted = emptyMap.delete(dynamicKey);',
      'const emptySet = new Set();',
      'const emptySetHas = emptySet.has(dynamicKey);',
      'const emptySetDeleted = emptySet.delete(dynamicKey);',
      'const pressuredEmptyMapValue = emptyMap.get(missingKey);',
      'const pressuredEmptySetHas = emptySet.has(missingKey);',
      'const openMap = new Map();',
      'openMap.set(dynamicKey, 1);',
      'const openSet = new Set();',
      'openSet.add(dynamicKey);',
    ], boundaryHost('dynamicKey'));
    const emptyMap = requireMap(result, 'emptyMap');
    const emptySet = result.environment.readValue('emptySet');
    const openMap = requireMap(result, 'openMap');
    const openSet = result.environment.readValue('openSet');

    expect(primitive(result.environment.readValue('emptyMapValue'))).toBeUndefined();
    expect(primitive(result.environment.readValue('emptyMapHas'))).toBe(false);
    expect(primitive(result.environment.readValue('emptyMapDeleted'))).toBe(false);
    expect(primitive(result.environment.readValue('emptySetHas'))).toBe(false);
    expect(primitive(result.environment.readValue('emptySetDeleted'))).toBe(false);
    for (const name of [
      'emptyMapValue',
      'emptyMapHas',
      'emptyMapDeleted',
      'emptySetHas',
      'emptySetDeleted',
    ]) {
      expect(result.environment.readBinding(name)?.openSeams, name).toEqual([]);
    }
    expect(result.environment.readValue('pressuredEmptyMapValue')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.environment.readBinding('pressuredEmptyMapValue')?.openSeams.length).toBeGreaterThan(0);
    expect(result.environment.readValue('pressuredEmptySetHas')?.kind).toBe(EvaluationValueKind.Unknown);
    expect(result.environment.readBinding('pressuredEmptySetHas')?.openSeams.length).toBeGreaterThan(0);
    expect(emptyMap.shape.hasExactMembership).toBe(true);
    expect(emptyMap.exactSize).toBe(0);
    expect(emptySet).toEqual(expect.objectContaining({ exactSize: 0 }));
    expect(openMap.exactSize).toBe(1);
    expect(openMap.shape.hasExactMembership).toBe(false);
    expect(openSet).toEqual(expect.objectContaining({ exactSize: 1 }));
    expect((openSet as EvaluationSetValue).shape.hasExactMembership).toBe(false);
  });

  test('preserves collection edge state and graph isolation across session forks', () => {
    const result = evaluate([
      "const map = new Map([['known', 1]]);",
      'map.set(dynamicKey, dynamicValue);',
      'const set = new Set([1]);',
      'set.delete(dynamicKey);',
      'const weakMapConstructor = WeakMap;',
    ], boundaryHost('dynamicKey', 'dynamicValue'));
    const sourceMap = requireMap(result, 'map');
    const sourceSet = result.environment.readValue('set') as EvaluationSetValue;
    const session = new StaticEvaluationSessionFork({}).forkEnvironment(result.environment);
    const sessionMap = session.readValue('map') as EvaluationMapValue;
    const sessionSet = session.readValue('set') as EvaluationSetValue;
    const sourceWeakMapConstructor = result.environment.readValue('weakMapConstructor');
    const sessionWeakMapConstructor = session.readValue('weakMapConstructor');

    expect(sessionMap).not.toBe(sourceMap);
    expect(sessionMap.shape).toBe(sourceMap.shape);
    expect(sessionMap.entries).not.toBe(sourceMap.entries);
    expect(sessionMap.entries.map((entry) => entry.state)).toEqual(
      sourceMap.entries.map((entry) => entry.state),
    );
    expect(sessionMap.entries.map((entry) => entry.keyOpenSeams)).toEqual(
      sourceMap.entries.map((entry) => entry.keyOpenSeams),
    );
    expect(sessionMap.entries.map((entry) => entry.valueOpenSeams)).toEqual(
      sourceMap.entries.map((entry) => entry.valueOpenSeams),
    );
    expect(sessionSet).not.toBe(sourceSet);
    expect(sessionSet.shape).toBe(sourceSet.shape);
    expect(sessionSet.elements.map((element) => element.state)).toEqual(
      sourceSet.elements.map((element) => element.state),
    );
    expect(sourceWeakMapConstructor?.kind).toBe(EvaluationValueKind.BoundaryObject);
    expect(sessionWeakMapConstructor?.kind).toBe(EvaluationValueKind.BoundaryObject);
    if (
      sourceWeakMapConstructor?.kind === EvaluationValueKind.BoundaryObject
      && sessionWeakMapConstructor?.kind === EvaluationValueKind.BoundaryObject
    ) {
      expect(sessionWeakMapConstructor).not.toBe(sourceWeakMapConstructor);
      expect(sessionWeakMapConstructor.callable).toBe(true);
    }

    sessionMap.entries.pop();
    sessionSet.elements.pop();
    expect(sourceMap.entries.length).toBeGreaterThan(sessionMap.entries.length);
    expect(sourceSet.elements.length).toBeGreaterThan(sessionSet.elements.length);
  });

  test('keeps TypeScript static globals distinct from Aurelia expression globals', () => {
    for (const name of ['WeakMap', 'WeakSet', 'Promise']) {
      expect(isStaticEvaluationGlobalName(name), name).toBe(true);
      expect(isAureliaExpressionGlobalName(name), name).toBe(false);
    }
    for (const name of ['Map', 'Set', 'Array']) {
      expect(isStaticEvaluationGlobalName(name), name).toBe(true);
      expect(isAureliaExpressionGlobalName(name), name).toBe(true);
    }
  });

  test('does not publish synchronous body effects for for-await-of', () => {
    const result = evaluate([
      'export {};',
      'const visits = [];',
      'for await (const value of [1, 2]) { visits.push(value); }',
      'const after = visits.length;',
    ]);

    expect(result.completion.kind).toBe(EvaluationCompletionKind.Open);
    expect(arrayPrimitives(requireArray(result, 'visits'))).toEqual([]);
    expect(result.environment.readValue('after')).toBeNull();
    expect(result.openSeams.some((seam) => seam.summary.includes('For-await-of'))).toBe(true);
  });
});

function boundaryHost(...names: readonly string[]): StaticEvaluationRuntimeHost {
  const admitted = new Set(names);
  return {
    resolveIdentifier: (identifier) => admitted.has(identifier.text)
      ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, identifier.text, identifier)
      : null,
  };
}

function requireArray(
  result: ReturnType<typeof evaluate>,
  name: string,
): EvaluationArrayValue {
  const value = result.environment.readValue(name);
  expect(value?.kind, name).toBe(EvaluationValueKind.Array);
  return value as EvaluationArrayValue;
}

function requireMap(
  result: ReturnType<typeof evaluate>,
  name: string,
): EvaluationMapValue {
  const value = result.environment.readValue(name);
  expect(value?.kind, name).toBe(EvaluationValueKind.Map);
  return value as EvaluationMapValue;
}

function arrayPrimitives(value: EvaluationArrayValue): unknown[] {
  return Array.from({ length: value.exactLength ?? value.elements.length }, (_, index) =>
    primitive(value.elementAtRuntimeIndex(index)?.value ?? null)
  );
}

function mapEntryPrimitives(value: EvaluationArrayValue): readonly (readonly unknown[])[] {
  return value.elements.map((element) => {
    expect(element.value.kind).toBe(EvaluationValueKind.Array);
    return arrayPrimitives(element.value as EvaluationArrayValue);
  });
}

function primitive(value: EvaluationValue | null): unknown {
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return undefined;
  }
  if (
    value.kind === EvaluationValueKind.Number
    || value.kind === EvaluationValueKind.String
    || value.kind === EvaluationValueKind.Boolean
  ) {
    return value.value;
  }
  return value.kind;
}

function evaluate(
  lines: readonly string[],
  runtimeHost: StaticEvaluationRuntimeHost = {},
) {
  const source = ts.createSourceFile(
    'src/evaluation-keyed-collection-semantics.ts',
    lines.join('\n'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return new StaticEvaluator(undefined, runtimeHost).evaluateSourceFile(source);
}
