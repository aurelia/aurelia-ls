import ts from 'typescript';
import {
  aureliaArrayMethodSemanticsFor,
} from '../expression/array-method-semantics.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  staticStringPrototypeBoundaryMethods,
} from './intrinsics/string-intrinsics.js';
import {
  hasQuestionDotToken,
  isNullishEvaluationValue,
} from './nullish-expression.js';
import {
  evaluationPropertyKeyString,
} from './operators.js';
import { EvaluationOpenSeamKind } from './seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationBooleanValue,
  EvaluationFunctionValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationRegularExpressionValue,
  EvaluationStringValue,
  EvaluationUndefinedValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

export const enum StaticValueMemberReadKind {
  /** Member read closed to a concrete evaluator value without invoking host policy. */
  Value = 'value',
  /** Member read selected a getter function that needs evaluator-host invocation with the receiver as `this`. */
  Getter = 'getter',
  /** Member read needs host open-seam publication before it can become an evaluator value. */
  Open = 'open',
}

export type StaticValueMemberRead =
  | {
    readonly kind: StaticValueMemberReadKind.Value;
    readonly value: EvaluationValue;
  }
  | {
    readonly kind: StaticValueMemberReadKind.Getter;
    readonly getter: EvaluationFunctionValue;
    readonly thisValue: EvaluationValue;
  }
  | {
    readonly kind: StaticValueMemberReadKind.Open;
    readonly reason: string;
    readonly seamKind: EvaluationOpenSeamKind;
  };

export interface StaticValueMemberReadHandlers<TValue> {
  /** Handles a concrete evaluator-local member value. */
  readonly value: (value: EvaluationValue) => TValue;
  /** Handles a getter that must be invoked by the active evaluator with the receiver as `this`. */
  readonly getter: (getter: EvaluationFunctionValue, thisValue: EvaluationValue) => TValue;
  /** Handles a member read that must stay open until a host/runtime consumer resolves it. */
  readonly open: (reason: string, seamKind: EvaluationOpenSeamKind) => TValue;
}

/** Folds static member-read outcomes so evaluator and binding-source consumers cannot drift on new read kinds. */
export function foldStaticValueMemberRead<TValue>(
  read: StaticValueMemberRead,
  handlers: StaticValueMemberReadHandlers<TValue>,
): TValue {
  switch (read.kind) {
    case StaticValueMemberReadKind.Value:
      return handlers.value(read.value);
    case StaticValueMemberReadKind.Getter:
      return handlers.getter(read.getter, read.thisValue);
    case StaticValueMemberReadKind.Open:
      return handlers.open(read.reason, read.seamKind);
  }
}

export interface StaticPropertyAccessEvaluationHost {
  evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue;

  evaluateFunctionWithArguments(
    callee: EvaluationFunctionValue,
    call: ts.Node,
    argumentValues: readonly EvaluationValue[],
    moduleKey: string,
    depth: number,
    thisValue?: EvaluationValue | null,
  ): EvaluationValue;

  unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;

  materializeUnknownUse(
    value: EvaluationUnknownValue,
    node: ts.Node,
    moduleKey: string,
    summary: string,
    seamKind: EvaluationOpenSeamKind,
  ): EvaluationUnknownValue;
}

export function evaluateStaticPropertyAccess(
  expression: ts.PropertyAccessExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
  if (hasQuestionDotToken(expression) && isNullishEvaluationValue(receiver)) {
    return new EvaluationUndefinedValue(expression);
  }
  if (receiver.kind === EvaluationValueKind.Unknown) {
    return host.materializeUnknownUse(
      receiver,
      expression,
      moduleKey,
      `Property access '${expression.name.text}' depended on an open receiver.`,
      EvaluationOpenSeamKind.UnresolvedIdentifier,
    );
  }
  return evaluateStaticPropertyValue(receiver, expression.name.text, expression, moduleKey, depth + 1, host);
}

export function evaluateStaticPropertyValue(
  receiver: EvaluationValue,
  propertyName: string,
  node: ts.Node,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  return evaluateStaticValueMemberRead(
    readStaticValueProperty(receiver, propertyName, node),
    node,
    moduleKey,
    depth,
    host,
  );
}

export function evaluateStaticElementValue(
  receiver: EvaluationValue,
  argument: EvaluationValue,
  node: ts.Node,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  return evaluateStaticValueMemberRead(
    readStaticValueElement(receiver, argument, node),
    node,
    moduleKey,
    depth,
    host,
  );
}

function evaluateStaticValueMemberRead(
  read: StaticValueMemberRead,
  node: ts.Node,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  return foldStaticValueMemberRead(read, {
    value: (value) => value,
    getter: (getter, thisValue) => host.evaluateFunctionWithArguments(
      getter,
      node,
      [],
      moduleKey,
      depth + 1,
      thisValue,
    ),
    open: (reason, seamKind) => host.unknown(reason, node, moduleKey, seamKind),
  });
}

function staticValueMemberValue(value: EvaluationValue): StaticValueMemberRead {
  return { kind: StaticValueMemberReadKind.Value, value };
}

function staticValueMemberGetter(
  getter: EvaluationFunctionValue,
  thisValue: EvaluationValue,
): StaticValueMemberRead {
  return { kind: StaticValueMemberReadKind.Getter, getter, thisValue };
}

function staticValueMemberOpen(
  reason: string,
  seamKind: EvaluationOpenSeamKind,
): StaticValueMemberRead {
  return { kind: StaticValueMemberReadKind.Open, reason, seamKind };
}

export function readStaticValueProperty(
  receiver: EvaluationValue,
  propertyName: string,
  node: ts.Node | null,
): StaticValueMemberRead {
  const ownProperty = readStaticOwnProperty(receiver, propertyName);
  if (ownProperty != null) {
    if (ownProperty.node != null && ts.isGetAccessorDeclaration(ownProperty.node) && ownProperty.value.kind === EvaluationValueKind.Function) {
      return staticValueMemberGetter(ownProperty.value, receiver);
    }
    return staticValueMemberValue(ownProperty.value);
  }
  if (receiver.kind === EvaluationValueKind.BoundaryObject) {
    return staticValueMemberValue(new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${propertyName}`, node));
  }
  if (receiver.kind === EvaluationValueKind.BoundaryValue) {
    return staticValueMemberValue(new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${propertyName}`, node));
  }
  if (receiver.kind === EvaluationValueKind.Object && !receiver.mayHaveUnknownProperties) {
    return staticValueMemberValue(new EvaluationUndefinedValue(node));
  }
  if (
    receiver.kind === EvaluationValueKind.Object
    || receiver.kind === EvaluationValueKind.Function
    || receiver.kind === EvaluationValueKind.Class
    || receiver.kind === EvaluationValueKind.Instance
  ) {
    return staticValueMemberOpen(
      `Object property '${propertyName}' was not known.`,
      EvaluationOpenSeamKind.UnresolvedIdentifier,
    );
  }
  if (receiver.kind === EvaluationValueKind.ModuleNamespace) {
    const value = receiver.exports.get(propertyName) ?? null;
    return value == null
      ? staticValueMemberOpen(
          `Module namespace export '${propertyName}' was not known.`,
          EvaluationOpenSeamKind.UnresolvedIdentifier,
        )
      : staticValueMemberValue(value);
  }
  if (receiver.kind === EvaluationValueKind.Array && isKnownArrayPrototypeFunction(propertyName)) {
    return staticValueMemberValue(new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `Array.prototype.${propertyName}`, node));
  }
  if (receiver.kind === EvaluationValueKind.String && isKnownStringPrototypeFunction(propertyName)) {
    return staticValueMemberValue(new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `String.prototype.${propertyName}`, node));
  }
  if (receiver.kind === EvaluationValueKind.Array && propertyName === 'length') {
    return staticValueMemberValue(new EvaluationNumberValue(receiver.elements.length, node));
  }
  if (receiver.kind === EvaluationValueKind.Set && propertyName === 'size' && !receiver.weak) {
    return staticValueMemberValue(new EvaluationNumberValue(receiver.elements.length, node));
  }
  if (receiver.kind === EvaluationValueKind.Map && propertyName === 'size' && !receiver.weak) {
    return staticValueMemberValue(new EvaluationNumberValue(receiver.entries.length, node));
  }
  if (receiver.kind === EvaluationValueKind.String && propertyName === 'length') {
    return staticValueMemberValue(new EvaluationNumberValue(receiver.value.length, node));
  }
  return staticValueMemberOpen(
    `Property access '${propertyName}' did not close over a known receiver.`,
    EvaluationOpenSeamKind.UnresolvedIdentifier,
  );
}

export function readStaticValueElement(
  receiver: EvaluationValue,
  argument: EvaluationValue,
  node: ts.Node | null,
): StaticValueMemberRead {
  if (receiver.kind === EvaluationValueKind.Array && argument.kind === EvaluationValueKind.Number) {
    if (receiver.mayHaveUnknownOrder) {
      return staticValueMemberOpen(
        `Array index ${argument.value} depends on an unknown element order.`,
        EvaluationOpenSeamKind.UnresolvedIdentifier,
      );
    }
    const index = Number.isInteger(argument.value) && argument.value >= 0
      ? argument.value
      : null;
    const element = index == null ? null : receiver.elements[index] ?? null;
    if (element != null) {
      return staticValueMemberValue(element.value);
    }
    return receiver.mayHaveUnknownElements
      ? staticValueMemberOpen(
          `Array index ${argument.value} is not known.`,
          EvaluationOpenSeamKind.UnresolvedIdentifier,
        )
      : staticValueMemberValue(new EvaluationUndefinedValue(node));
  }

  const propertyName = evaluationPropertyKeyString(argument);
  if (propertyName != null) {
    return readStaticValueProperty(receiver, propertyName, node);
  }

  return staticValueMemberOpen(
    'Element access did not close over a known receiver and key.',
    EvaluationOpenSeamKind.UnsupportedExpression,
  );
}

export function evaluateStaticElementAccess(
  expression: ts.ElementAccessExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticPropertyAccessEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
  if (hasQuestionDotToken(expression) && isNullishEvaluationValue(receiver)) {
    return new EvaluationUndefinedValue(expression);
  }
  const argument = expression.argumentExpression == null
    ? null
    : host.evaluateExpression(expression.argumentExpression, environment, moduleKey, depth + 1);
  if (receiver.kind === EvaluationValueKind.Unknown) {
    return host.materializeUnknownUse(receiver, expression, moduleKey, 'Element access depended on an open receiver.', EvaluationOpenSeamKind.UnresolvedIdentifier);
  }
  if (argument?.kind === EvaluationValueKind.Unknown) {
    return host.materializeUnknownUse(argument, expression, moduleKey, 'Element access depended on an open key.', EvaluationOpenSeamKind.UnresolvedIdentifier);
  }
  if (argument == null) {
    return host.unknown('Element access had no argument expression.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
  }
  return evaluateStaticElementValue(receiver, argument, expression, moduleKey, depth + 1, host);
}

export function readStaticOwnProperty(
  receiver: EvaluationValue,
  name: string,
): EvaluationObjectProperty | null {
  switch (receiver.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
      return receiver.properties.get(name) ?? null;
    case EvaluationValueKind.RegularExpression:
      return readStaticRegularExpressionProperty(receiver, name);
    default:
      return null;
  }
}

export function writeStaticOwnProperty(
  receiver: EvaluationValue,
  name: string,
  value: EvaluationValue,
  node: ts.Node,
): boolean {
  switch (receiver.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
      receiver.properties.set(name, new EvaluationObjectProperty(name, value, node));
      return true;
    case EvaluationValueKind.BoundaryValue:
      return false;
    default:
      return false;
  }
}

function readStaticRegularExpressionProperty(
  receiver: EvaluationRegularExpressionValue,
  name: string,
): EvaluationObjectProperty | null {
  const node = receiver.node;
  if (node == null) {
    return null;
  }
  switch (name) {
    case 'source':
      return new EvaluationObjectProperty(name, new EvaluationStringValue(receiver.pattern, node), node);
    case 'flags':
      return new EvaluationObjectProperty(name, new EvaluationStringValue(receiver.flags, node), node);
    case 'global':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('g'), node), node);
    case 'ignoreCase':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('i'), node), node);
    case 'multiline':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('m'), node), node);
    case 'dotAll':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('s'), node), node);
    case 'unicode':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('u'), node), node);
    case 'unicodeSets':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('v'), node), node);
    case 'sticky':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('y'), node), node);
    case 'hasIndices':
      return new EvaluationObjectProperty(name, new EvaluationBooleanValue(receiver.flags.includes('d'), node), node);
    case 'lastIndex':
      return new EvaluationObjectProperty(name, new EvaluationNumberValue(0, node), node);
    default:
      return null;
  }
}

function isKnownArrayPrototypeFunction(name: string): boolean {
  return aureliaArrayMethodSemanticsFor(name) != null;
}

function isKnownStringPrototypeFunction(name: string): boolean {
  return staticStringPrototypeBoundaryMethods.has(name);
}
