import ts from 'typescript';

import {
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  evaluationValuesEqual,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  type EvaluationValue,
} from './values.js';

export function evaluateStaticBinaryOperator(
  operator: ts.SyntaxKind,
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node,
): EvaluationValue | null {
  switch (operator) {
    case ts.SyntaxKind.EqualsEqualsToken:
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return new EvaluationBooleanValue(evaluationValuesEqual(left, right), node);
    case ts.SyntaxKind.ExclamationEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return new EvaluationBooleanValue(!evaluationValuesEqual(left, right), node);
  }

  if (!isEvaluationPrimitiveValue(left) || !isEvaluationPrimitiveValue(right)) {
    return null;
  }
  const leftPrimitive = readEvaluationPrimitive(left);
  const rightPrimitive = readEvaluationPrimitive(right);

  switch (operator) {
    case ts.SyntaxKind.PlusToken:
      if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
        return new EvaluationStringValue(String(leftPrimitive) + String(rightPrimitive), node);
      }
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive + rightPrimitive, node)
        : null;
    case ts.SyntaxKind.MinusToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive - rightPrimitive, node)
        : null;
    case ts.SyntaxKind.AsteriskToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive * rightPrimitive, node)
        : null;
    case ts.SyntaxKind.SlashToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive / rightPrimitive, node)
        : null;
    case ts.SyntaxKind.PercentToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive % rightPrimitive, node)
        : null;
    case ts.SyntaxKind.AsteriskAsteriskToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive ** rightPrimitive, node)
        : null;
    case ts.SyntaxKind.LessThanToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive < rightPrimitive, node)
        : null;
    case ts.SyntaxKind.LessThanEqualsToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive <= rightPrimitive, node)
        : null;
    case ts.SyntaxKind.GreaterThanToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive > rightPrimitive, node)
        : null;
    case ts.SyntaxKind.GreaterThanEqualsToken:
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive >= rightPrimitive, node)
        : null;
    default:
      return null;
  }
}

export function staticTokenName(kind: ts.SyntaxKind): string {
  return ts.tokenToString(kind) ?? ts.SyntaxKind[kind] ?? String(kind);
}
