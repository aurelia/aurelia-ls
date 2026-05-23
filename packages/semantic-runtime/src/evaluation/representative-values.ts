import {
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
} from './values.js';

/**
 * Summarize several possible evaluator values into one conservative representative.
 *
 * This is used when semantic-runtime intentionally does not materialize every runtime instance, such as repeated
 * template views or speculative branches with a dynamic condition. The result must stay safe: exact values are kept
 * only when every lane agrees, string-like lanes become a dynamic string pattern, object lanes keep only common
 * properties, and unrelated lanes fall back to a binding-scope boundary value.
 */
export function representativeEvaluationValues(
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
  const stringLike = representativeStringLikeValue(values, `${path}.*`, sourceLabel);
  if (stringLike != null) {
    return stringLike;
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

function representativeStringLikeValue(
  values: readonly EvaluationValue[],
  path: string,
  sourceLabel: string | null,
): EvaluationValue | null {
  const ranges: StringLikeRange[] = [];
  for (const value of values) {
    const range = stringLikeRange(value);
    if (range == null) {
      return null;
    }
    ranges.push(range);
  }
  const texts = ranges.map((range) => `${range.prefix}${range.suffix}`);
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

interface StringLikeRange {
  readonly prefix: string;
  readonly suffix: string;
}

function stringLikeRange(
  value: EvaluationValue,
): StringLikeRange | null {
  switch (value.kind) {
    case EvaluationValueKind.String:
      return { prefix: value.value, suffix: '' };
    case EvaluationValueKind.StringPattern:
      return {
        prefix: value.parts[0] ?? '',
        suffix: value.parts[value.parts.length - 1] ?? '',
      };
    case EvaluationValueKind.BoundaryValue:
      return { prefix: '', suffix: '' };
    default:
      return null;
  }
}

function representativeObjectValue(
  propertyMaps: readonly ReadonlyMap<string, EvaluationObjectProperty>[],
  path: string,
  sourceLabel: string | null,
): EvaluationBoundaryObjectValue {
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const name of commonPropertyNames(propertyMaps)) {
    const values = propertyMaps.map((propertyMap) => propertyMap.get(name)!.value);
    const propertyValue = representativeEvaluationValues(values, `${path}.${name}`, sourceLabel)
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
