import ts from 'typescript';

import { unwrapExpression } from './ts-syntax.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

export type NullishExpressionKind =
  | 'null'
  | 'undefined';

/** Literal-level nullish recognition shared by source API diagnostics. */
export function nullishExpressionKind(
  expression: ts.Expression,
): NullishExpressionKind | null {
  const current = unwrapExpression(expression);
  if (current.kind === ts.SyntaxKind.NullKeyword) {
    return 'null';
  }
  if (ts.isIdentifier(current) && current.text === 'undefined') {
    return 'undefined';
  }
  if (ts.isVoidExpression(current)) {
    return 'undefined';
  }
  return null;
}

export function hasQuestionDotToken(node: ts.Node): boolean {
  return (node as { readonly questionDotToken?: ts.QuestionDotToken }).questionDotToken != null;
}

export function isNullishEvaluationValue(value: EvaluationValue): boolean {
  return value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined;
}
