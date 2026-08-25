import ts from 'typescript';
import { EvaluationBindingKind } from '../evaluation/environment.js';
import {
  StaticEvaluationExpressionStatementDisposition,
  StaticEvaluationPolicy,
  type StaticEvaluationExpressionStatementPolicyInput,
} from '../evaluation/policy.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';

export const aureliaConfigurationEvaluationPolicy = new StaticEvaluationPolicy([
  externallyOwnedImportedObjectMutationStatement,
]);

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
