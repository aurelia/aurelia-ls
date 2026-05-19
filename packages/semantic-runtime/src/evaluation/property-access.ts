import ts from 'typescript';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  hasQuestionDotToken,
  isNullishEvaluationValue,
} from './nullish-expression.js';
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
  const ownProperty = readStaticOwnProperty(receiver, propertyName);
  if (ownProperty != null) {
    if (ts.isGetAccessorDeclaration(ownProperty.node) && ownProperty.value.kind === EvaluationValueKind.Function) {
      return host.evaluateFunctionWithArguments(
        ownProperty.value,
        node,
        [],
        moduleKey,
        depth + 1,
        receiver,
      );
    }
    return ownProperty.value;
  }
  if (receiver.kind === EvaluationValueKind.BoundaryObject) {
    return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${propertyName}`, node);
  }
  if (receiver.kind === EvaluationValueKind.BoundaryValue) {
    return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}.${propertyName}`, node);
  }
  if (receiver.kind === EvaluationValueKind.Object && !receiver.mayHaveUnknownProperties) {
    return new EvaluationUndefinedValue(node);
  }
  if (
    receiver.kind === EvaluationValueKind.Object
    || receiver.kind === EvaluationValueKind.Function
    || receiver.kind === EvaluationValueKind.Class
    || receiver.kind === EvaluationValueKind.Instance
  ) {
    return host.unknown(`Object property '${propertyName}' was not known.`, node, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
  }
  if (receiver.kind === EvaluationValueKind.ModuleNamespace) {
    return receiver.exports.get(propertyName)
      ?? host.unknown(`Module namespace export '${propertyName}' was not known.`, node, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
  }
  if (receiver.kind === EvaluationValueKind.Array && isKnownArrayPrototypeFunction(propertyName)) {
    return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `Array.prototype.${propertyName}`, node);
  }
  if (receiver.kind === EvaluationValueKind.String && isKnownStringPrototypeFunction(propertyName)) {
    return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `String.prototype.${propertyName}`, node);
  }
  if (receiver.kind === EvaluationValueKind.Array && propertyName === 'length') {
    return new EvaluationNumberValue(receiver.elements.length, node);
  }
  if (receiver.kind === EvaluationValueKind.Set && propertyName === 'size' && !receiver.weak) {
    return new EvaluationNumberValue(receiver.elements.length, node);
  }
  if (receiver.kind === EvaluationValueKind.Map && propertyName === 'size' && !receiver.weak) {
    return new EvaluationNumberValue(receiver.entries.length, node);
  }
  if (receiver.kind === EvaluationValueKind.String && propertyName === 'length') {
    return new EvaluationNumberValue(receiver.value.length, node);
  }
  return host.unknown(`Property access '${propertyName}' did not close over a known receiver.`, node, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
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
  if (receiver.kind === EvaluationValueKind.Array && argument.kind === EvaluationValueKind.Number) {
    if (receiver.mayHaveUnknownOrder) {
      return host.unknown(`Array index ${argument.value} depends on an unknown element order.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    return receiver.elements.at(argument.value)?.value
      ?? host.unknown(`Array index ${argument.value} is not known.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
  }
  if (argument.kind === EvaluationValueKind.String || argument.kind === EvaluationValueKind.Number) {
    const name = String(argument.value);
    const ownProperty = readStaticOwnProperty(receiver, name);
    if (ownProperty != null) {
      return ownProperty.value;
    }
    if (receiver.kind === EvaluationValueKind.BoundaryObject) {
      return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}[${JSON.stringify(name)}]`, expression);
    }
    if (receiver.kind === EvaluationValueKind.BoundaryValue) {
      return new EvaluationBoundaryValue(receiver.boundaryKind, `${receiver.path}[${JSON.stringify(name)}]`, expression);
    }
    if (receiver.kind === EvaluationValueKind.Object && !receiver.mayHaveUnknownProperties) {
      return new EvaluationUndefinedValue(expression);
    }
    if (
      receiver.kind === EvaluationValueKind.Object
      || receiver.kind === EvaluationValueKind.Function
      || receiver.kind === EvaluationValueKind.Class
      || receiver.kind === EvaluationValueKind.Instance
    ) {
      return host.unknown(`Object property '${name}' is not known.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
  }
  if (receiver.kind === EvaluationValueKind.ModuleNamespace && (argument.kind === EvaluationValueKind.String || argument.kind === EvaluationValueKind.Number)) {
    const name = String(argument.value);
    return receiver.exports.get(name)
      ?? host.unknown(`Module namespace export '${name}' is not known.`, expression, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
  }
  return host.unknown('Element access did not close over a known receiver and key.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
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
  switch (name) {
    case 'concat':
    case 'every':
    case 'filter':
    case 'fill':
    case 'find':
    case 'findIndex':
    case 'flat':
    case 'flatMap':
    case 'forEach':
    case 'includes':
    case 'indexOf':
    case 'join':
    case 'map':
    case 'reduce':
    case 'reduceRight':
    case 'slice':
    case 'some':
    case 'sort':
      return true;
    default:
      return false;
  }
}

function isKnownStringPrototypeFunction(name: string): boolean {
  switch (name) {
    case 'endsWith':
    case 'includes':
    case 'indexOf':
    case 'replace':
    case 'replaceAll':
    case 'slice':
    case 'split':
    case 'startsWith':
    case 'toLowerCase':
    case 'toUpperCase':
    case 'trim':
      return true;
    default:
      return false;
  }
}
