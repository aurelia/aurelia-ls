import ts from 'typescript';
import {
  readStaticStringArrayValue,
  readStaticStringValue,
  StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import {
  EvaluationValueKind,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { readReferenceName } from '../evaluation/ts-syntax.js';
import {
  CheckedObserver,
  NodeObserverLocatorAccessorOverride,
  NodeObserverLocatorGlobalConfig,
  NodeObserverLocatorNodeConfig,
  SelectValueObserver,
  ValueAttributeObserver,
  type NodeObserverConfig,
} from './observer-locator.js';

export function nodeObserverNodeConfigsFromUseConfigCall(
  call: ts.CallExpression,
  reader: StaticEvaluationExpressionReader,
): readonly NodeObserverLocatorNodeConfig[] {
  const [first, second, third] = call.arguments;
  if (first == null || ts.isSpreadElement(first)) {
    return [];
  }
  if (second != null && third != null && !ts.isSpreadElement(second) && !ts.isSpreadElement(third)) {
    const tagName = staticStringFromExpression(first, reader);
    const key = staticStringFromExpression(second, reader);
    const config = nodeObserverConfigFromExpression(third, reader);
    return tagName != null && key != null && config != null
      ? [new NodeObserverLocatorNodeConfig(tagName, key, config)]
      : [];
  }

  const value = reader.evaluateExpression(first).value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return [];
  }
  const configs: NodeObserverLocatorNodeConfig[] = [];
  for (const tagProperty of value.properties.values()) {
    if (tagProperty.value.kind !== EvaluationValueKind.Object) {
      continue;
    }
    for (const property of tagProperty.value.properties.values()) {
      const config = nodeObserverConfigFromValue(property.value);
      if (config != null) {
        configs.push(new NodeObserverLocatorNodeConfig(tagProperty.name, property.name, config));
      }
    }
  }
  return configs;
}

export function nodeObserverGlobalConfigsFromUseConfigGlobalCall(
  call: ts.CallExpression,
  reader: StaticEvaluationExpressionReader,
): readonly NodeObserverLocatorGlobalConfig[] {
  const [first, second] = call.arguments;
  if (first == null || ts.isSpreadElement(first)) {
    return [];
  }
  if (second != null && !ts.isSpreadElement(second)) {
    const key = staticStringFromExpression(first, reader);
    const config = nodeObserverConfigFromExpression(second, reader);
    return key != null && config != null
      ? [new NodeObserverLocatorGlobalConfig(key, config)]
      : [];
  }

  const value = reader.evaluateExpression(first).value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return [];
  }
  const configs: NodeObserverLocatorGlobalConfig[] = [];
  for (const property of value.properties.values()) {
    const config = nodeObserverConfigFromValue(property.value);
    if (config != null) {
      configs.push(new NodeObserverLocatorGlobalConfig(property.name, config));
    }
  }
  return configs;
}

export function nodeObserverAccessorOverridesFromCall(
  call: ts.CallExpression,
  reader: StaticEvaluationExpressionReader,
): readonly NodeObserverLocatorAccessorOverride[] {
  const [first, second] = call.arguments;
  if (first == null || ts.isSpreadElement(first)) {
    return [];
  }
  if (second != null && !ts.isSpreadElement(second)) {
    const tagName = staticStringFromExpression(first, reader);
    const key = staticStringFromExpression(second, reader);
    return tagName != null && key != null
      ? [new NodeObserverLocatorAccessorOverride(tagName, key)]
      : [];
  }

  const value = reader.evaluateExpression(first).value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return [];
  }
  const overrides: NodeObserverLocatorAccessorOverride[] = [];
  for (const tagProperty of value.properties.values()) {
    const keys = readStaticStringArrayValue(tagProperty.value);
    if (keys == null) {
      continue;
    }
    for (const key of keys) {
      overrides.push(new NodeObserverLocatorAccessorOverride(tagProperty.name, key));
    }
  }
  return overrides;
}

export function nodeObserverGlobalAccessorOverridesFromCall(
  call: ts.CallExpression,
  reader: StaticEvaluationExpressionReader,
): readonly string[] {
  return call.arguments.flatMap((argument) => {
    if (ts.isSpreadElement(argument)) {
      return [];
    }
    const key = staticStringFromExpression(argument, reader);
    return key == null ? [] : [key];
  });
}

export function nodeObserverConfigFromExpression(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): NodeObserverConfig | null {
  const value = reader.evaluateExpression(expression).value;
  return value?.kind === EvaluationValueKind.Object
    ? nodeObserverConfigFromValue(value)
    : null;
}

export function nodeObserverConfigFromValue(
  value: EvaluationValue,
): NodeObserverConfig | null {
  if (value.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const eventsValue = value.properties.get('events')?.value ?? null;
  const events = eventsValue == null ? [] : readStaticStringArrayValue(eventsValue);
  if (events == null) {
    return null;
  }
  const readonlyValue = value.properties.get('readonly')?.value ?? null;
  const defaultValue = value.properties.get('default')?.value;
  const type = nodeObserverTypeFromConfig(value);
  return {
    ...(type == null ? {} : { type }),
    events,
    readonly: readonlyValue?.kind === EvaluationValueKind.Boolean ? readonlyValue.value : false,
    default: defaultValue == null ? undefined : primitiveDefaultFromEvaluationValue(defaultValue),
  };
}

function nodeObserverTypeFromConfig(
  config: EvaluationObjectValue,
): NodeObserverConfig['type'] | null {
  const property = config.properties.get('type');
  if (property == null || !ts.isPropertyAssignment(property.node)) {
    return null;
  }
  const name = readReferenceName(property.node.initializer);
  switch (name) {
    case 'ValueAttributeObserver':
      return ValueAttributeObserver;
    case 'CheckedObserver':
      return CheckedObserver;
    case 'SelectValueObserver':
      return SelectValueObserver;
    default:
      return null;
  }
}

function primitiveDefaultFromEvaluationValue(value: EvaluationValue): unknown {
  switch (value.kind) {
    case EvaluationValueKind.String:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.Boolean:
      return value.value;
    case EvaluationValueKind.Null:
      return null;
    case EvaluationValueKind.Undefined:
      return undefined;
    default:
      return undefined;
  }
}

function staticStringFromExpression(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): string | null {
  const value = reader.evaluateExpression(expression).value;
  return value == null ? null : readStaticStringValue(value);
}
