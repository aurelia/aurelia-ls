import ts from 'typescript';
import { EvaluationBindingKind, type ModuleEnvironmentRecord } from '../evaluation/environment.js';
import {
  StaticEvaluationExpressionStatementDisposition,
  StaticEvaluationPolicy,
  type StaticEvaluationExpressionStatementPolicyInput,
} from '../evaluation/policy.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';

export const aureliaConfigurationEvaluationPolicy = new StaticEvaluationPolicy([
  configurationOwnedAureliaFacadeSetupStatement,
  externallyOwnedImportedObjectMutationStatement,
]);

function configurationOwnedAureliaFacadeSetupStatement(
  input: StaticEvaluationExpressionStatementPolicyInput,
): StaticEvaluationExpressionStatementDisposition | null {
  return isKnownAureliaFacadeSetupStatement(input.expression, input.environment)
    ? StaticEvaluationExpressionStatementDisposition.ExternallyOwned
    : null;
}

function isKnownAureliaFacadeSetupStatement(
  expression: ts.Expression,
  environment: ModuleEnvironmentRecord,
): boolean {
  const localName = rootFacadeIdentifierForExpressionChain(expression);
  if (localName == null) {
    return false;
  }
  return isKnownAureliaFacadeImport(localName, environment);
}

function externallyOwnedImportedObjectMutationStatement(
  input: StaticEvaluationExpressionStatementPolicyInput,
): StaticEvaluationExpressionStatementDisposition | null {
  const assignment = unwrapExpression(input.expression);
  if (!ts.isBinaryExpression(assignment) || assignment.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
    return null;
  }
  const root = rootIdentifierForMutationTarget(assignment.left);
  if (root == null) {
    return null;
  }
  const binding = input.environment.readBinding(root.text);
  return binding?.bindingKind === EvaluationBindingKind.Import
    ? StaticEvaluationExpressionStatementDisposition.ExternallyOwned
    : null;
}

function rootFacadeIdentifierForExpressionChain(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isNewExpression(current)) {
    const constructor = unwrapExpression(current.expression);
    return ts.isIdentifier(constructor) ? constructor.text : null;
  }
  if (ts.isCallExpression(current)) {
    return rootFacadeIdentifierForExpressionChain(current.expression);
  }
  if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    return rootFacadeIdentifierForExpressionChain(current.expression);
  }
  return ts.isIdentifier(current) ? current.text : null;
}

function rootIdentifierForMutationTarget(expression: ts.Expression): ts.Identifier | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current;
  }
  if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    return rootIdentifierForMutationTarget(current.expression);
  }
  return null;
}

function isKnownAureliaFacadeImport(
  localName: string,
  environment: ModuleEnvironmentRecord,
): boolean {
  const binding = environment.readBinding(localName);
  if (binding?.bindingKind !== EvaluationBindingKind.Import || binding.declaration == null) {
    return false;
  }

  const declaration = binding.declaration;
  if (!ts.isImportSpecifier(declaration) && !ts.isImportClause(declaration)) {
    return false;
  }

  const importDeclaration = ts.isImportSpecifier(declaration)
    ? declaration.parent.parent.parent
    : declaration.parent;
  if (!ts.isImportDeclaration(importDeclaration) || !ts.isStringLiteral(importDeclaration.moduleSpecifier)) {
    return false;
  }

  const moduleSpecifier = importDeclaration.moduleSpecifier.text;
  if (moduleSpecifier !== 'aurelia' && moduleSpecifier !== '@aurelia/runtime-html') {
    return false;
  }

  return ts.isImportSpecifier(declaration)
    ? (declaration.propertyName?.text ?? declaration.name.text) === 'Aurelia'
    : declaration.name?.text === localName;
}
