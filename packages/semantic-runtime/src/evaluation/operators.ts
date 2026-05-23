import ts from 'typescript';

import {
  EvaluationBooleanValue,
  EvaluationValueKind,
  EvaluationNumberValue,
  EvaluationStringValue,
  evaluationValuesEqual,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  type EvaluationValue,
} from './values.js';

export type StaticBinaryOperation =
  | '=='
  | '==='
  | '!='
  | '!=='
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '**'
  | '<'
  | '<='
  | '>'
  | '>=';

export function evaluateStaticBinaryOperator(
  operator: ts.SyntaxKind,
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node,
): EvaluationValue | null {
  const operation = staticBinaryOperationForToken(operator);
  return operation == null ? null : evaluateStaticBinaryOperation(operation, left, right, node);
}

export function evaluateStaticBinaryOperation(
  operation: StaticBinaryOperation,
  left: EvaluationValue,
  right: EvaluationValue,
  node: ts.Node | null,
): EvaluationValue | null {
  switch (operation) {
    case '==':
      return new EvaluationBooleanValue(evaluationValuesLooselyEqual(left, right), node);
    case '===':
      return new EvaluationBooleanValue(evaluationValuesEqual(left, right), node);
    case '!=':
      return new EvaluationBooleanValue(!evaluationValuesLooselyEqual(left, right), node);
    case '!==':
      return new EvaluationBooleanValue(!evaluationValuesEqual(left, right), node);
  }

  if (!isEvaluationPrimitiveValue(left) || !isEvaluationPrimitiveValue(right)) {
    return null;
  }
  const leftPrimitive = readEvaluationPrimitive(left);
  const rightPrimitive = readEvaluationPrimitive(right);

  switch (operation) {
    case '+':
      if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
        return new EvaluationStringValue(String(leftPrimitive) + String(rightPrimitive), node);
      }
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive + rightPrimitive, node)
        : null;
    case '-':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive - rightPrimitive, node)
        : null;
    case '*':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive * rightPrimitive, node)
        : null;
    case '/':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive / rightPrimitive, node)
        : null;
    case '%':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive % rightPrimitive, node)
        : null;
    case '**':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationNumberValue(leftPrimitive ** rightPrimitive, node)
        : null;
    case '<':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive < rightPrimitive, node)
        : null;
    case '<=':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive <= rightPrimitive, node)
        : null;
    case '>':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive > rightPrimitive, node)
        : null;
    case '>=':
      return typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number'
        ? new EvaluationBooleanValue(leftPrimitive >= rightPrimitive, node)
        : null;
    default:
      return null;
  }
}

function evaluationValuesLooselyEqual(
  left: EvaluationValue,
  right: EvaluationValue,
): boolean {
  if (left.kind === EvaluationValueKind.Null || left.kind === EvaluationValueKind.Undefined) {
    return right.kind === EvaluationValueKind.Null || right.kind === EvaluationValueKind.Undefined;
  }
  if (right.kind === EvaluationValueKind.Null || right.kind === EvaluationValueKind.Undefined) {
    return false;
  }
  if (left.kind === EvaluationValueKind.Boolean) {
    return evaluationValuesLooselyEqual(new EvaluationNumberValue(left.value ? 1 : 0, left.node), right);
  }
  if (right.kind === EvaluationValueKind.Boolean) {
    return evaluationValuesLooselyEqual(left, new EvaluationNumberValue(right.value ? 1 : 0, right.node));
  }
  if (left.kind === EvaluationValueKind.String && right.kind === EvaluationValueKind.Number) {
    return Number(left.value) === right.value;
  }
  if (left.kind === EvaluationValueKind.Number && right.kind === EvaluationValueKind.String) {
    return left.value === Number(right.value);
  }
  return evaluationValuesEqual(left, right);
}

function staticBinaryOperationForToken(operator: ts.SyntaxKind): StaticBinaryOperation | null {
  switch (operator) {
    case ts.SyntaxKind.EqualsEqualsToken:
      return '==';
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return '===';
    case ts.SyntaxKind.ExclamationEqualsToken:
      return '!=';
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return '!==';
    case ts.SyntaxKind.PlusToken:
      return '+';
    case ts.SyntaxKind.MinusToken:
      return '-';
    case ts.SyntaxKind.AsteriskToken:
      return '*';
    case ts.SyntaxKind.SlashToken:
      return '/';
    case ts.SyntaxKind.PercentToken:
      return '%';
    case ts.SyntaxKind.AsteriskAsteriskToken:
      return '**';
    case ts.SyntaxKind.LessThanToken:
      return '<';
    case ts.SyntaxKind.LessThanEqualsToken:
      return '<=';
    case ts.SyntaxKind.GreaterThanToken:
      return '>';
    case ts.SyntaxKind.GreaterThanEqualsToken:
      return '>=';
    default:
      return null;
  }
}

export function staticTokenName(kind: ts.SyntaxKind): string {
  return ts.tokenToString(kind) ?? ts.SyntaxKind[kind] ?? String(kind);
}
