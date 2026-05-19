import ts from 'typescript';
import type { AddressHandle } from '../kernel/handles.js';
import {
  EvaluationRead,
  readStaticStringArrayValue,
  readStaticStringValue,
  type StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import {
  hasStaticModifier,
  readPropertyName,
} from '../evaluation/ts-syntax.js';
import {
  EvaluationValueKind,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import {
  ResourceDependencyReference,
  ResourceTargetReference,
} from './resource-reference.js';

export class ConvergenceOpen {
  constructor(
    readonly summary: string,
    readonly node: ts.Node,
  ) {}
}

export function convergenceOpenForNode(
  summary: string,
  node: ts.Node | null | undefined,
): readonly ConvergenceOpen[] {
  return node == null ? [] : [new ConvergenceOpen(summary, node)];
}

export function nullableConvergenceOpenForNode(
  summary: string,
  node: ts.Node | null | undefined,
): ConvergenceOpen | null {
  return convergenceOpenForNode(summary, node)[0] ?? null;
}

export function appendConvergenceOpen(
  opens: ConvergenceOpen[],
  summary: string,
  node: ts.Node | null | undefined,
): void {
  const open = nullableConvergenceOpenForNode(summary, node);
  if (open != null) {
    opens.push(open);
  }
}

export function convergenceOpenForRead(
  summary: string,
  read: EvaluationRead<EvaluationValue> | null,
): readonly ConvergenceOpen[] {
  return convergenceOpenForNode(summary, read?.node ?? read?.value?.node);
}

export function nullableConvergenceOpenForRead(
  summary: string,
  read: EvaluationRead<EvaluationValue> | null,
): ConvergenceOpen | null {
  return convergenceOpenForRead(summary, read)[0] ?? null;
}

export function readStaticClassProperty(
  classNode: ts.ClassLikeDeclarationBase | null,
  propertyName: string,
): ts.Expression | null {
  if (classNode == null) {
    return null;
  }
  for (const member of classNode.members) {
    if (!hasStaticModifier(member) || !ts.isPropertyDeclaration(member) || member.initializer == null) {
      continue;
    }
    if (readPropertyName(member.name) === propertyName) {
      return member.initializer;
    }
  }
  return null;
}

export function readNearestStaticClassProperty(
  classPrototypeChain: readonly ts.ClassLikeDeclarationBase[],
  propertyName: string,
): ts.Expression | null {
  for (const classNode of classPrototypeChain) {
    const expression = readStaticClassProperty(classNode, propertyName);
    if (expression != null) {
      return expression;
    }
  }
  return null;
}

export function readObjectProperty(
  reader: StaticEvaluationExpressionReader,
  expression: ts.Expression | null,
  propertyName: string,
): EvaluationRead<EvaluationValue> | null {
  if (expression == null) {
    return null;
  }
  const evaluated = reader.evaluateExpression(expression);
  if (evaluated.value?.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const property = evaluated.value.properties.get(propertyName);
  return property == null
    ? null
    : new EvaluationRead(property.value, property.node, evaluated.openSeams);
}

export function readFieldValue(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): EvaluationRead<EvaluationValue> | null {
  return readObjectProperty(context.expressionReader, definitionExpression, fieldName)
    ?? readStaticClassPropertyValue(context, targetClass, fieldName);
}

export function readStaticClassPropertyValue(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
  propertyName: string,
): EvaluationRead<EvaluationValue> | null {
  const initializer = readStaticClassProperty(targetClass, propertyName);
  return initializer == null ? null : context.expressionReader.evaluateExpression(initializer);
}

export function readBooleanField(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): boolean | null {
  const value = readFieldValue(context, definitionExpression, targetClass, fieldName)?.value;
  return value?.kind === EvaluationValueKind.Boolean ? value.value : null;
}

export function readStringField(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): string | null {
  const value = readFieldValue(context, definitionExpression, targetClass, fieldName)?.value;
  return value == null ? null : readStaticStringValue(value);
}

export function readStaticStringArrayClassProperty(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
): readonly string[] {
  const value = readStaticClassPropertyValue(context, targetClass, fieldName)?.value;
  if (value == null) {
    return [];
  }
  return readStaticStringArrayValue(value) ?? [];
}

export function readObjectString(
  value: EvaluationObjectValue | null,
  propertyName: string,
): string | null {
  if (value == null) {
    return null;
  }
  const property = value.properties.get(propertyName);
  return property == null ? null : readStaticStringValue(property.value);
}

export function targetReferenceForFunction(
  value: Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Function | EvaluationValueKind.Class }>,
  addressHandle: AddressHandle | null,
): ResourceTargetReference {
  const localName = value.declaration.name != null && ts.isIdentifier(value.declaration.name)
    ? value.declaration.name.text
    : null;
  return new ResourceTargetReference(
    null,
    addressHandle,
    localName,
    null,
    value.environment.moduleKey,
  );
}

export function dependencyReferenceForFunction(
  value: Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Function | EvaluationValueKind.Class }>,
): ResourceDependencyReference {
  const localName = value.declaration.name != null && ts.isIdentifier(value.declaration.name)
    ? value.declaration.name.text
    : null;
  return new ResourceDependencyReference(
    null,
    localName,
    value.environment.moduleKey,
    localName,
  );
}

export function decoratorCallNamed(decorator: ts.Decorator, name: string): ts.CallExpression | null {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression)) {
    return null;
  }
  const callee = expression.expression;
  if (ts.isIdentifier(callee) && callee.text === name) {
    return expression;
  }
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === name) {
    return expression;
  }
  return null;
}

export function decoratorIdentifierNamed(decorator: ts.Decorator, name: string): boolean {
  const expression = decorator.expression;
  if (ts.isIdentifier(expression)) {
    return expression.text === name;
  }
  return ts.isPropertyAccessExpression(expression) && expression.name.text === name;
}

export function memberName(member: ts.ClassElement): string | null {
  if (
    ts.isPropertyDeclaration(member)
    || ts.isGetAccessorDeclaration(member)
    || ts.isSetAccessorDeclaration(member)
    || ts.isMethodDeclaration(member)
  ) {
    return readPropertyName(member.name);
  }
  return null;
}

export function memberNameNode(member: ts.ClassElement): ts.PropertyName | null {
  if (
    ts.isPropertyDeclaration(member)
    || ts.isGetAccessorDeclaration(member)
    || ts.isSetAccessorDeclaration(member)
    || ts.isMethodDeclaration(member)
  ) {
    return member.name;
  }
  return null;
}

export function openIfPresent(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
  summary: string,
): readonly ConvergenceOpen[] {
  const definitionRead = readObjectProperty(context.expressionReader, definitionExpression, fieldName);
  const staticExpression = readStaticClassProperty(targetClass, fieldName);
  if (definitionRead == null && staticExpression == null) {
    return [];
  }
  return convergenceOpenForNode(summary, definitionRead?.node ?? staticExpression);
}

export function mergeAliases(
  ...aliasLists: readonly (readonly string[])[]
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const aliases of aliasLists) {
    for (const alias of aliases) {
      if (seen.has(alias)) {
        continue;
      }
      seen.add(alias);
      result.push(alias);
    }
  }
  return result;
}
