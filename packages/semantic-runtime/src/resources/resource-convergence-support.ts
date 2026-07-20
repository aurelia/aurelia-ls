import ts from 'typescript';
import type { AddressHandle } from '../kernel/handles.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  EvaluationRead,
  readStaticStringValue,
  type StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import {
  openSeamReasonKindsForEvaluationRead,
} from '../evaluation/boundary-open-reason.js';
import {
  hasStaticModifier,
  readPropertyName,
} from '../evaluation/ts-syntax.js';
import {
  closedStaticValueMemberValue,
  readStaticValueProperty,
} from '../evaluation/property-access.js';
import {
  EvaluationValueKind,
  evaluationObjectUncertaintySummaries,
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
    readonly reasonKinds: readonly OpenSeamReasonKind[],
  ) {}
}

/** One optional scalar definition field, retaining any open evaluation pressure beside a known value. */
export class ConvergenceScalarRead<TValue> {
  constructor(
    readonly value: TValue | null,
    readonly open: readonly ConvergenceOpen[],
    readonly sourceNode: ts.Node | null,
  ) {}
}

export function convergenceOpenForNode(
  summary: string,
  node: ts.Node | null | undefined,
  reasonKinds: readonly OpenSeamReasonKind[],
): readonly ConvergenceOpen[] {
  return node == null ? [] : [new ConvergenceOpen(summary, node, compactConvergenceOpenReasonKinds(reasonKinds))];
}

export function nullableConvergenceOpenForNode(
  summary: string,
  node: ts.Node | null | undefined,
  reasonKinds: readonly OpenSeamReasonKind[],
): ConvergenceOpen | null {
  return convergenceOpenForNode(summary, node, reasonKinds)[0] ?? null;
}

export function appendConvergenceOpen(
  opens: ConvergenceOpen[],
  summary: string,
  node: ts.Node | null | undefined,
  reasonKinds: readonly OpenSeamReasonKind[],
): void {
  const open = nullableConvergenceOpenForNode(summary, node, reasonKinds);
  if (open != null) {
    opens.push(open);
  }
}

export function convergenceOpenForRead(
  summary: string,
  read: EvaluationRead<EvaluationValue> | null,
  reasonKinds: readonly OpenSeamReasonKind[],
): readonly ConvergenceOpen[] {
  return convergenceOpenForNode(
    summary,
    read?.node ?? read?.value?.node,
    convergenceReasonKindsForRead(read, reasonKinds),
  );
}

export function nullableConvergenceOpenForRead(
  summary: string,
  read: EvaluationRead<EvaluationValue> | null,
  reasonKinds: readonly OpenSeamReasonKind[],
): ConvergenceOpen | null {
  return convergenceOpenForRead(summary, read, reasonKinds)[0] ?? null;
}

/** Publish only lower-level evaluator pressure, without treating a closed value as open by itself. */
export function convergenceOpenForReadPressure(
  summary: string,
  read: EvaluationRead<EvaluationValue> | null,
): readonly ConvergenceOpen[] {
  return openSeamReasonKindsForEvaluationRead(read).length === 0
    ? []
    : convergenceOpenForRead(summary, read, []);
}

export function convergenceReasonKindsForRead(
  read: EvaluationRead<EvaluationValue> | null,
  fallbackReasonKinds: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return compactConvergenceOpenReasonKinds([
    ...fallbackReasonKinds,
    ...openSeamReasonKindsForEvaluationRead(read),
  ]);
}

export function convergenceSummaryForObjectUncertainties(
  value: EvaluationObjectValue,
  fallbackSummary: string,
): string {
  const summaries = evaluationObjectUncertaintySummaries(value);
  return summaries.length === 0 ? fallbackSummary : `${fallbackSummary} ${summaries.join('; ')}.`;
}

function compactConvergenceOpenReasonKinds(
  reasonKinds: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return [...new Set(reasonKinds)];
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
  const read = reader.readObjectProperty(expression, propertyName);
  return read.value == null
    && read.openSeams.length === 0
    && read.abruptCompletion == null
    ? null
    : read;
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
  openSummary: string,
): ConvergenceScalarRead<boolean> {
  const read = readFieldValue(context, definitionExpression, targetClass, fieldName);
  const value = read?.value?.kind === EvaluationValueKind.Boolean ? read.value.value : null;
  return convergenceScalarRead(read, value, openSummary);
}

export function readStringField(
  context: ResourceRecognitionContext,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  fieldName: string,
  openSummary: string,
): ConvergenceScalarRead<string> {
  const read = readFieldValue(context, definitionExpression, targetClass, fieldName);
  const value = read?.value == null ? null : readStaticStringValue(read.value);
  return convergenceScalarRead(read, value, openSummary);
}

function convergenceScalarRead<TValue>(
  read: EvaluationRead<EvaluationValue> | null,
  value: TValue | null,
  openSummary: string,
): ConvergenceScalarRead<TValue> {
  if (read == null) {
    return new ConvergenceScalarRead<TValue>(null, [], null);
  }
  const closedAbsence = read.value?.kind === EvaluationValueKind.Undefined
    || read.value?.kind === EvaluationValueKind.Null;
  const reasonKinds = openSeamReasonKindsForEvaluationRead(read);
  return (value != null || closedAbsence) && reasonKinds.length === 0
    ? new ConvergenceScalarRead<TValue>(value, [], read.node ?? read.value?.node ?? null)
    : new ConvergenceScalarRead<TValue>(
        value,
        convergenceOpenForRead(openSummary, read, []),
        read.node ?? read.value?.node ?? null,
      );
}

export function readObjectString(
  value: EvaluationObjectValue | null,
  propertyName: string,
): string | null {
  if (value == null) {
    return null;
  }
  const read = readStaticValueProperty(value, propertyName, value.node);
  const memberValue = closedStaticValueMemberValue(read);
  return memberValue == null ? null : readStaticStringValue(memberValue);
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
  reasonKinds: readonly OpenSeamReasonKind[],
): readonly ConvergenceOpen[] {
  const definitionRead = readObjectProperty(context.expressionReader, definitionExpression, fieldName);
  const staticExpression = readStaticClassProperty(targetClass, fieldName);
  if (definitionRead == null && staticExpression == null) {
    return [];
  }
  return definitionRead == null
    ? convergenceOpenForNode(summary, staticExpression, reasonKinds)
    : convergenceOpenForRead(summary, definitionRead, reasonKinds);
}
