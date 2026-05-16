import {
  RuntimeBindingSourceValueEvaluationKind,
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import type { BindingScope } from '../configuration/scope.js';
import {
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationStringPatternHole,
  EvaluationStringPatternValue,
  EvaluationStringValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { IteratorBindingScopeEffect } from './runtime-binding.js';
import type { TemplateExpressionParse } from './value-site.js';

/**
 * Projects the value-side shape of Aurelia Repeat's `BindingContext(local, item)`.
 *
 * The scope/type projector already owns the TypeChecker element type. This helper keeps the evaluator-local value
 * carrier separate: when the repeat source is a small static collection, nested bindings can still see an item-shaped
 * value without pretending that semantic-runtime rendered every repeated view instance.
 */
export function repeatStaticLocalValue(
  parse: TemplateExpressionParse | null,
  parent: BindingScope,
  effect: IteratorBindingScopeEffect,
  localName: string,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
): EvaluationValue | null {
  if (sourceValueEvaluator == null || parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
    return null;
  }
  const evaluation = sourceValueEvaluator.evaluate(parse.result.ast.iterable, parent);
  if (evaluation.kind !== RuntimeBindingSourceValueEvaluationKind.Value || evaluation.value == null) {
    return null;
  }
  const item = repeatItemRepresentativeValue(evaluation.value, `repeat.${localName}`, effect.sourceAddressHandle == null ? null : localName);
  if (item == null) {
    return null;
  }
  if (effect.localNames.length === 1) {
    return item;
  }
  return readRepresentativeProperty(item, localName) ?? null;
}

function repeatItemRepresentativeValue(
  value: EvaluationValue,
  path: string,
  sourceLabel: string | null,
): EvaluationValue | null {
  if (value.kind === EvaluationValueKind.Array) {
    return representativeFromArray(value, path, sourceLabel);
  }
  if (value.kind === EvaluationValueKind.Set && !value.weak) {
    return representativeValues(
      value.elements.map((element) => element.value),
      path,
      sourceLabel,
    );
  }
  return null;
}

function representativeFromArray(
  value: EvaluationArrayValue,
  path: string,
  sourceLabel: string | null,
): EvaluationValue | null {
  if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder || value.elements.length === 0) {
    return null;
  }
  return representativeValues(
    value.elements.map((element) => element.value),
    path,
    sourceLabel,
  );
}

function representativeValues(
  values: readonly EvaluationValue[],
  path: string,
  sourceLabel: string | null,
): EvaluationValue | null {
  if (values.length === 0) {
    return null;
  }
  if (values.length === 1) {
    return values[0]!;
  }
  const same = exactSamePrimitive(values);
  if (same != null) {
    return same;
  }
  const strings = values.every((value): value is EvaluationStringValue => value.kind === EvaluationValueKind.String)
    ? values
    : null;
  if (strings != null) {
    return representativeStringValue(strings, `${path}.*`, sourceLabel);
  }
  const objectProperties = objectPropertyMaps(values);
  if (objectProperties != null) {
    return representativeObjectValue(objectProperties, path, sourceLabel);
  }
  return new EvaluationBoundaryValue(
    EvaluationBoundaryKind.BindingScope,
    sourceLabel == null ? path : `${path}:${sourceLabel}`,
    values[0]?.node ?? null,
  );
}

function exactSamePrimitive(
  values: readonly EvaluationValue[],
): EvaluationValue | null {
  const first = values[0]!;
  switch (first.kind) {
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
      return values.every((value) => value.kind === first.kind) ? first : null;
    case EvaluationValueKind.Boolean:
      return values.every((value) => value.kind === first.kind && value.value === first.value)
        ? new EvaluationBooleanValue(first.value, first.node)
        : null;
    case EvaluationValueKind.Number:
      return values.every((value) => value.kind === first.kind && value.value === first.value)
        ? new EvaluationNumberValue(first.value, first.node)
        : null;
    case EvaluationValueKind.String:
      return values.every((value) => value.kind === first.kind && value.value === first.value)
        ? new EvaluationStringValue(first.value, first.node)
        : null;
    default:
      return null;
  }
}

function representativeStringValue(
  values: readonly EvaluationStringValue[],
  path: string,
  sourceLabel: string | null,
): EvaluationValue {
  const texts = values.map((value) => value.value);
  const prefix = commonPrefix(texts);
  const suffix = commonSuffix(texts.map((text) => text.slice(prefix.length)));
  return new EvaluationStringPatternValue(
    [prefix, suffix],
    [new EvaluationStringPatternHole(new EvaluationBoundaryValue(
      EvaluationBoundaryKind.BindingScope,
      sourceLabel == null ? path : `${path}:${sourceLabel}`,
      values[0]?.node ?? null,
    ))],
    values[0]?.node ?? null,
  );
}

function representativeObjectValue(
  propertyMaps: readonly ReadonlyMap<string, EvaluationObjectProperty>[],
  path: string,
  sourceLabel: string | null,
): EvaluationBoundaryObjectValue {
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const name of commonPropertyNames(propertyMaps)) {
    const values = propertyMaps.map((propertyMap) => propertyMap.get(name)!.value);
    const propertyValue = representativeValues(values, `${path}.${name}`, sourceLabel)
      ?? new EvaluationBoundaryValue(EvaluationBoundaryKind.BindingScope, `${path}.${name}`, propertyMaps[0]?.get(name)?.node ?? null);
    const node = propertyMaps[0]?.get(name)?.node ?? values[0]?.node ?? null;
    if (node == null) {
      continue;
    }
    properties.set(name, new EvaluationObjectProperty(name, propertyValue, node));
  }
  return new EvaluationBoundaryObjectValue(
    EvaluationBoundaryKind.BindingScope,
    sourceLabel == null ? path : `${path}:${sourceLabel}`,
    properties,
    null,
  );
}

function objectPropertyMaps(
  values: readonly EvaluationValue[],
): readonly ReadonlyMap<string, EvaluationObjectProperty>[] | null {
  const maps: ReadonlyMap<string, EvaluationObjectProperty>[] = [];
  for (const value of values) {
    if (
      value.kind === EvaluationValueKind.Object
      || value.kind === EvaluationValueKind.BoundaryObject
      || value.kind === EvaluationValueKind.Instance
    ) {
      maps.push(value.properties);
      continue;
    }
    return null;
  }
  return maps;
}

function readRepresentativeProperty(
  value: EvaluationValue,
  name: string,
): EvaluationValue | null {
  if (
    value.kind === EvaluationValueKind.Object
    || value.kind === EvaluationValueKind.BoundaryObject
    || value.kind === EvaluationValueKind.Instance
  ) {
    return value.properties.get(name)?.value ?? null;
  }
  return null;
}

function commonPropertyNames(
  propertyMaps: readonly ReadonlyMap<string, EvaluationObjectProperty>[],
): readonly string[] {
  const [first, ...rest] = propertyMaps;
  if (first == null) {
    return [];
  }
  return [...first.keys()].filter((name) => rest.every((propertyMap) => propertyMap.has(name)));
}

function commonPrefix(values: readonly string[]): string {
  if (values.length === 0) {
    return '';
  }
  let prefix = values[0] ?? '';
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

function commonSuffix(values: readonly string[]): string {
  if (values.length === 0) {
    return '';
  }
  let suffix = values[0] ?? '';
  for (const value of values.slice(1)) {
    while (!value.endsWith(suffix) && suffix.length > 0) {
      suffix = suffix.slice(1);
    }
  }
  return suffix;
}
