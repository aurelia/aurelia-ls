import ts from 'typescript';

import {
  closedStaticValueMemberValue,
  readStaticValueProperty,
} from '../evaluation/property-access.js';
import {
  EvaluationValueKind,
  type EvaluationClassValue,
  type EvaluationFunctionValue,
  type EvaluationInstanceValue,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  readPropertyName,
  readReferenceName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type { AddressHandle } from '../kernel/handles.js';
import { RegistrationValueObservation } from './registration-observation.js';
import {
  type FrameworkRegistrationKind,
  type RegistryBodyReference,
  RegistrationValueKind,
} from './registration-reference.js';

export type EvaluatedRegistryValue =
  | EvaluationObjectValue
  | EvaluationClassValue
  | EvaluationFunctionValue
  | EvaluationInstanceValue;

export interface EvaluatedRegistrationValueContext {
  sourceFileAddressHandleForNode(node: ts.Node): AddressHandle | null;
}

export interface EvaluatedRegistrationValueSource {
  readonly node: ts.Node;
  readonly sourceFileAddressHandle: AddressHandle | null;
  readonly moduleKey: string | null;
}

/** Recover the declaration source owned by an evaluator-known constructable registration value. */
export function evaluatedConstructableValueSource(
  context: EvaluatedRegistrationValueContext,
  carrier: ts.Node,
  value: EvaluationClassValue | EvaluationFunctionValue,
): EvaluatedRegistrationValueSource {
  const sourceFileAddressHandle = context.sourceFileAddressHandleForNode(value.declaration);
  return sourceFileAddressHandle == null
    ? { node: carrier, sourceFileAddressHandle: null, moduleKey: null }
    : { node: value.declaration, sourceFileAddressHandle, moduleKey: value.environment.moduleKey };
}

/** Whether an exact evaluator value will enter Aurelia's IRegistry branch. */
export function hasEvaluationRegisterFunction(value: EvaluationValue | null): value is EvaluatedRegistryValue {
  return evaluatedRegistryRegisterFunction(value) != null;
}

/** Exact evaluator function Aurelia will invoke through the IRegistry contract. */
export function evaluatedRegistryRegisterFunction(
  value: EvaluationValue | null,
): EvaluationFunctionValue | null {
  if (
    value?.kind !== EvaluationValueKind.Object
    && value?.kind !== EvaluationValueKind.Class
    && value?.kind !== EvaluationValueKind.Function
    && value?.kind !== EvaluationValueKind.Instance
  ) {
    return null;
  }
  const register = readStaticValueProperty(value, 'register', value.node);
  const registerValue = closedStaticValueMemberValue(register);
  return registerValue?.kind === EvaluationValueKind.Function ? registerValue : null;
}

/** Whether Aurelia's container will use plain-class singleton self-registration. */
export function isPlainClassFallbackValue(
  value: EvaluationValue | null,
): value is EvaluationClassValue | EvaluationFunctionValue {
  if (value?.kind === EvaluationValueKind.Class) {
    return true;
  }
  return value?.kind === EvaluationValueKind.Function
    && isConstructableFunctionValue(value);
}

/** Whether Aurelia's container will recursively enumerate a registration carrier. */
export function isRecursiveRegistrationCarrier(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Promise:
      return true;
    case EvaluationValueKind.Function:
      return !isConstructableFunctionValue(value);
    default:
      return false;
  }
}

/** Project an exact evaluator-known IRegistry object through registration's shared value vocabulary. */
export function evaluatedRegistryValueObservation(
  context: EvaluatedRegistrationValueContext,
  carrier: ts.Node,
  value: EvaluatedRegistryValue,
  frameworkKind: FrameworkRegistrationKind | null,
  registryBody: RegistryBodyReference | null,
  localNameHint: string | null = null,
): RegistrationValueObservation {
  const source = registryValueSource(context, carrier, value);
  return new RegistrationValueObservation(
    RegistrationValueKind.Registry,
    localNameHint
      ?? (ts.isExpression(carrier) ? readReferenceName(carrier) : null)
      ?? evaluatedValueLocalName(value)
      ?? 'IRegistry',
    source.node,
    isDeclarationValueNode(source.node),
    null,
    frameworkKind,
    source.sourceFileAddressHandle,
    source.moduleKey,
    registryBody,
    null,
    value,
  );
}

/** Recover the declaration/value source owned by an exact evaluator-known registry object. */
export function registryValueSource(
  context: EvaluatedRegistrationValueContext,
  carrier: ts.Node,
  value: EvaluatedRegistryValue,
): EvaluatedRegistrationValueSource {
  const valueNode = evaluatedRegistryValueSourceNode(value);
  if (valueNode == null) {
    return { node: carrier, sourceFileAddressHandle: null, moduleKey: null };
  }
  const sourceFileAddressHandle = context.sourceFileAddressHandleForNode(valueNode);
  return sourceFileAddressHandle == null
    ? { node: carrier, sourceFileAddressHandle: null, moduleKey: null }
    : { node: valueNode, sourceFileAddressHandle, moduleKey: evaluatedValueModuleKey(value) };
}

export function evaluatedRegistryValueSourceNode(value: EvaluatedRegistryValue): ts.Node | null {
  const declaration = evaluatedRegistryRegisterFunction(value)?.declaration ?? null;
  if (declaration != null) {
    if (ts.isMethodDeclaration(declaration)) {
      return declaration.parent;
    }
    const property = declaration.parent;
    if (
      (ts.isPropertyAssignment(property) || ts.isPropertyDeclaration(property))
      && readPropertyName(property.name) === 'register'
    ) {
      return property.parent;
    }
  }
  return value.kind === EvaluationValueKind.Instance
    ? value.classValue.declaration
    : value.node ?? null;
}

export function evaluatedValueLocalName(
  value: EvaluatedRegistryValue | EvaluationClassValue | EvaluationFunctionValue,
): string | null {
  const node = value.node;
  if (value.kind === EvaluationValueKind.Class || value.kind === EvaluationValueKind.Function) {
    return declarationNameText(value.declaration.name)
      ?? (node != null && ts.isExpression(node) ? readReferenceName(node) : null);
  }
  if (value.kind === EvaluationValueKind.Instance) {
    return declarationNameText(value.classValue.declaration.name)
      ?? (node != null && ts.isExpression(node) ? readReferenceName(node) : null);
  }
  if (node == null) {
    return null;
  }
  if (ts.isObjectLiteralExpression(node)) {
    return registryObjectLiteralLocalName(node);
  }
  return ts.isExpression(node) ? readReferenceName(node) : null;
}

export function isDeclarationValueNode(node: ts.Node): boolean {
  return ts.isClassDeclaration(node)
    || ts.isFunctionDeclaration(node)
    || (ts.isExpression(node) && isDeclarationExpression(node));
}

export function registryObjectLiteralLocalName(literal: ts.ObjectLiteralExpression): string | null {
  let current: ts.Node = literal;
  while (
    current.parent != null
    && (
      ts.isAsExpression(current.parent)
      || ts.isTypeAssertionExpression(current.parent)
      || ts.isParenthesizedExpression(current.parent)
      || ts.isNonNullExpression(current.parent)
      || ts.isSatisfiesExpression(current.parent)
    )
  ) {
    current = current.parent;
  }
  const parent = current.parent;
  if (parent == null) {
    return null;
  }
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent)) {
    return readPropertyName(parent.name);
  }
  if (ts.isReturnStatement(parent)) {
    const owner = enclosingFunctionLocalName(parent);
    return owner == null ? null : `${owner}.return`;
  }
  return null;
}

function evaluatedValueModuleKey(value: EvaluatedRegistryValue): string | null {
  switch (value.kind) {
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Function:
      return value.environment.moduleKey;
    case EvaluationValueKind.Instance:
      return value.classValue.environment.moduleKey;
    case EvaluationValueKind.Object:
      return null;
  }
}

function isConstructableFunctionValue(value: EvaluationFunctionValue): boolean {
  return ts.isFunctionDeclaration(value.declaration) || ts.isFunctionExpression(value.declaration);
}

function declarationNameText(name: ts.PropertyName | ts.BindingName | undefined): string | null {
  if (name == null) {
    return null;
  }
  if (
    ts.isIdentifier(name)
    || ts.isStringLiteral(name)
    || ts.isNoSubstitutionTemplateLiteral(name)
    || ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  return null;
}

function isDeclarationExpression(expression: ts.Expression): boolean {
  const current = unwrapExpression(expression);
  return ts.isClassExpression(current) || ts.isFunctionExpression(current);
}

function enclosingFunctionLocalName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current != null) {
    if (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isMethodDeclaration(current)) {
      return current.name == null ? null : readPropertyName(current.name);
    }
    if (ts.isArrowFunction(current)) {
      const parent = current.parent;
      return ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)
        ? parent.name.text
        : null;
    }
    current = current.parent;
  }
  return null;
}
