import ts from 'typescript';
import {
  readStaticStringArrayValue,
  readStaticStringValue,
  StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import {
  EvaluationValueKind,
  EvaluationObjectPropertyState,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { readReferenceName } from '../evaluation/ts-syntax.js';
import {
  NodeObserverLocatorAccessorOverride,
  NodeObserverLocatorGlobalConfig,
  NodeObserverLocatorNodeConfig,
} from './observer-locator.js';
import {
  RuntimeNodeObserverConfig,
  RuntimeNodeObserverConfigFieldState,
  RuntimeNodeObserverKind,
} from '../template/runtime-binding.js';

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
): RuntimeNodeObserverConfig {
  const value = reader.evaluateExpression(expression).value;
  return value == null
    ? RuntimeNodeObserverConfig.open('Node observer config expression did not produce a static evaluation value.')
    : nodeObserverConfigFromValue(value);
}

export function nodeObserverConfigFromValue(
  value: EvaluationValue,
): RuntimeNodeObserverConfig {
  if (value.kind !== EvaluationValueKind.Object) {
    return RuntimeNodeObserverConfig.open('Node observer config did not reduce to an object value.');
  }
  const type = nodeObserverTypeFromConfig(value);
  const events = nodeObserverEventsFromConfig(value);
  const readonlyValue = nodeObserverReadonlyFromConfig(value);
  const defaultValue = nodeObserverDefaultFromConfig(value);
  const openReasons = [type.openReason, events.openReason, readonlyValue.openReason, defaultValue.openReason]
    .filter((reason): reason is string => reason != null);
  return new RuntimeNodeObserverConfig(
    type.observerKind,
    type.observerConstructorName,
    events.eventNames,
    readonlyValue.value,
    defaultValue.value,
    {
      type: type.state,
      events: events.state,
      readonly: readonlyValue.state,
      default: defaultValue.state,
    },
    openReasons.length === 0 ? null : openReasons.join(' '),
  );
}

interface NodeObserverTypeRead {
  readonly observerKind: RuntimeNodeObserverKind;
  readonly observerConstructorName: string | null;
  readonly state: RuntimeNodeObserverConfigFieldState;
  readonly openReason: string | null;
}

function nodeObserverTypeFromConfig(
  config: EvaluationObjectValue,
): NodeObserverTypeRead {
  const property = config.properties.get('type');
  if (property == null) {
    return config.mayHaveUnknownProperties
      ? {
        observerKind: RuntimeNodeObserverKind.Open,
        observerConstructorName: null,
        state: RuntimeNodeObserverConfigFieldState.Open,
        openReason: 'Node observer type may be supplied by an unclosed config property.',
      }
      : {
        observerKind: RuntimeNodeObserverKind.ValueAttribute,
        observerConstructorName: 'ValueAttributeObserver',
        state: RuntimeNodeObserverConfigFieldState.Absent,
        openReason: null,
      };
  }
  if (property.value.kind === EvaluationValueKind.Null || property.value.kind === EvaluationValueKind.Undefined) {
    if (property.state === EvaluationObjectPropertyState.Open) {
      return openNodeObserverType(
        'ValueAttributeObserver',
        'Node observer type may be replaced by a later unknown config property.',
      );
    }
    return {
      observerKind: RuntimeNodeObserverKind.ValueAttribute,
      observerConstructorName: 'ValueAttributeObserver',
      state: RuntimeNodeObserverConfigFieldState.Closed,
      openReason: null,
    };
  }
  const name = nodeObserverConstructorName(property.value, property.node);
  if (name == null) {
    return {
      observerKind: RuntimeNodeObserverKind.Open,
      observerConstructorName: null,
      state: RuntimeNodeObserverConfigFieldState.Open,
      openReason: 'Node observer constructor did not retain a static declaration or import identity.',
    };
  }
  if (property.state === EvaluationObjectPropertyState.Open) {
    return openNodeObserverType(
      name,
      'Node observer type may be replaced by a later unknown config property.',
    );
  }
  switch (name) {
    case 'ValueAttributeObserver':
      return closedNodeObserverType(RuntimeNodeObserverKind.ValueAttribute, name);
    case 'CheckedObserver':
      return closedNodeObserverType(RuntimeNodeObserverKind.Checked, name);
    case 'SelectValueObserver':
      return closedNodeObserverType(RuntimeNodeObserverKind.Select, name);
    default:
      return closedNodeObserverType(RuntimeNodeObserverKind.Custom, name);
  }
}

function openNodeObserverType(
  observerConstructorName: string | null,
  openReason: string,
): NodeObserverTypeRead {
  return {
    observerKind: RuntimeNodeObserverKind.Open,
    observerConstructorName,
    state: RuntimeNodeObserverConfigFieldState.Open,
    openReason,
  };
}

function nodeObserverConstructorName(
  value: EvaluationValue,
  sourceNode: ts.Node | null,
): string | null {
  if (value.kind === EvaluationValueKind.Class) {
    return value.declaration.name?.text ?? nodeObserverConstructorSourceName(sourceNode);
  }
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    const boundaryNode = value.node;
    if (boundaryNode != null && ts.isImportSpecifier(boundaryNode)) {
      return boundaryNode.propertyName?.text ?? boundaryNode.name.text;
    }
    const boundaryName = boundaryNode != null && ts.isExpression(boundaryNode)
      ? readReferenceName(boundaryNode)
      : null;
    return boundaryName ?? nodeObserverConstructorSourceName(sourceNode);
  }
  return nodeObserverConstructorSourceName(sourceNode);
}

function nodeObserverConstructorSourceName(node: ts.Node | null): string | null {
  if (node == null) {
    return null;
  }
  const expression = ts.isPropertyAssignment(node)
    ? node.initializer
    : ts.isShorthandPropertyAssignment(node)
      ? node.name
      : ts.isExpression(node)
        ? node
        : null;
  return expression == null ? null : readReferenceName(expression);
}

function closedNodeObserverType(
  observerKind: RuntimeNodeObserverKind,
  observerConstructorName: string,
): NodeObserverTypeRead {
  return {
    observerKind,
    observerConstructorName,
    state: RuntimeNodeObserverConfigFieldState.Closed,
    openReason: null,
  };
}

interface NodeObserverEventsRead {
  readonly eventNames: readonly string[];
  readonly state: RuntimeNodeObserverConfigFieldState;
  readonly openReason: string | null;
}

function nodeObserverEventsFromConfig(config: EvaluationObjectValue): NodeObserverEventsRead {
  const property = config.properties.get('events');
  if (property == null) {
    return config.mayHaveUnknownProperties
      ? { eventNames: [], state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer events may be supplied by an unclosed config property.' }
      : { eventNames: [], state: RuntimeNodeObserverConfigFieldState.Absent, openReason: null };
  }
  const eventNames = knownStringArrayValues(property.value);
  const closed = property.state === EvaluationObjectPropertyState.Closed
    && property.value.kind === EvaluationValueKind.Array
    && !property.value.mayHaveUnknownElements
    && !property.value.mayHaveUnknownOrder
    && eventNames.length === property.value.elements.length;
  return closed
    ? { eventNames, state: RuntimeNodeObserverConfigFieldState.Closed, openReason: null }
    : {
      eventNames,
      state: RuntimeNodeObserverConfigFieldState.Open,
      openReason: property.state === EvaluationObjectPropertyState.Open
        ? 'Node observer event names may be replaced by a later unknown config property.'
        : 'Node observer event names did not close to a static string array.',
    };
}

function knownStringArrayValues(value: EvaluationValue): readonly string[] {
  if (value.kind !== EvaluationValueKind.Array) {
    return [];
  }
  return value.elements.flatMap((element) => {
    const stringValue = readStaticStringValue(element.value);
    return stringValue == null ? [] : [stringValue];
  });
}

interface NodeObserverReadonlyRead {
  readonly value: boolean | null;
  readonly state: RuntimeNodeObserverConfigFieldState;
  readonly openReason: string | null;
}

function nodeObserverReadonlyFromConfig(config: EvaluationObjectValue): NodeObserverReadonlyRead {
  const property = config.properties.get('readonly');
  if (property == null) {
    return config.mayHaveUnknownProperties
      ? { value: null, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer readonly policy may be supplied by an unclosed config property.' }
      : { value: false, state: RuntimeNodeObserverConfigFieldState.Absent, openReason: null };
  }
  return property.value.kind === EvaluationValueKind.Boolean
    ? property.state === EvaluationObjectPropertyState.Closed
      ? { value: property.value.value, state: RuntimeNodeObserverConfigFieldState.Closed, openReason: null }
      : { value: property.value.value, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer readonly policy may be replaced by a later unknown config property.' }
    : { value: null, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer readonly policy did not close to a boolean.' };
}

interface NodeObserverDefaultRead {
  readonly value: RuntimeNodeObserverConfig['defaultValue'];
  readonly state: RuntimeNodeObserverConfigFieldState;
  readonly openReason: string | null;
}

function nodeObserverDefaultFromConfig(config: EvaluationObjectValue): NodeObserverDefaultRead {
  const property = config.properties.get('default');
  if (property == null) {
    return config.mayHaveUnknownProperties
      ? { value: undefined, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer default may be supplied by an unclosed config property.' }
      : { value: undefined, state: RuntimeNodeObserverConfigFieldState.Absent, openReason: null };
  }
  return isEvaluationPrimitiveValue(property.value)
    ? property.state === EvaluationObjectPropertyState.Closed
      ? { value: readEvaluationPrimitive(property.value), state: RuntimeNodeObserverConfigFieldState.Closed, openReason: null }
      : { value: readEvaluationPrimitive(property.value), state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer default may be replaced by a later unknown config property.' }
    : { value: undefined, state: RuntimeNodeObserverConfigFieldState.Open, openReason: 'Node observer default did not close to a primitive value.' };
}

function staticStringFromExpression(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): string | null {
  const value = reader.evaluateExpression(expression).value;
  return value == null ? null : readStaticStringValue(value);
}
