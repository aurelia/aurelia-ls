import ts from 'typescript';
import { EvaluationBindingKind, type ModuleEnvironmentRecord } from '../evaluation/environment.js';
import {
  StaticEvaluationExpressionStatementDisposition,
  StaticEvaluationPolicy,
  type StaticEvaluationExpressionStatementPolicyInput,
} from '../evaluation/policy.js';

export const aureliaConfigurationEvaluationPolicy = new StaticEvaluationPolicy([
  configurationOwnedAureliaFacadeSetupStatement,
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
  const root = rootNewExpressionForExpressionChain(expression);
  if (root == null) {
    return false;
  }

  const constructor = unwrapExpression(root.expression);
  return ts.isIdentifier(constructor)
    && isKnownAureliaFacadeImport(constructor.text, environment);
}

function rootNewExpressionForExpressionChain(expression: ts.Expression): ts.NewExpression | null {
  const current = unwrapExpression(expression);
  if (ts.isNewExpression(current)) {
    return current;
  }
  if (ts.isCallExpression(current)) {
    return rootNewExpressionForExpressionChain(current.expression);
  }
  if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    return rootNewExpressionForExpressionChain(current.expression);
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

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}
