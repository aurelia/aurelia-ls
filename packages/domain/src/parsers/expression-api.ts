import type {
  ForOfStatement,
  Interpolation,
  IsBindingBehavior,
  CustomExpression,
  AnyBindingExpression,
  BadExpression,
  SourceFileId,
  SourceSpan,
} from "../compiler/model/ir.js";

export type { ExpressionType } from "../compiler/model/ir.js";
import type { ExpressionType } from "../compiler/model/ir.js";

/**
 * Public expression parser contract for the domain/LSP layer.
 *
 * This is intentionally shaped in terms of the canonical IR AST types:
 * - IsBindingBehavior (general expressions / handlers)
 * - ForOfStatement    (repeat.for header)
 * - Interpolation     (text/attr interpolation)
 * - CustomExpression  (plugin-owned expressions)
 *
 * The generic overload keeps the existing runtime behavior:
 * - 'IsProperty' / 'IsFunction' -> IsBindingBehavior
 * - 'IsIterator'                -> ForOfStatement
 * - 'Interpolation'             -> Interpolation
 * - 'IsCustom'                  -> CustomExpression
 */
export interface IExpressionParser {
  parse(expression: string, expressionType: "IsIterator", context?: ExpressionParseContext): ForOfStatement | BadExpression;
  parse(expression: string, expressionType: "Interpolation", context?: ExpressionParseContext): Interpolation;
  parse(expression: string, expressionType: "IsFunction" | "IsProperty", context?: ExpressionParseContext): IsBindingBehavior;
  parse(expression: string, expressionType: "IsCustom", context?: ExpressionParseContext): CustomExpression;

  // Fallback signature for generic call sites.
  parse(expression: string, expressionType: ExpressionType, context?: ExpressionParseContext): AnyBindingExpression;
}

/**
 * Optional parse context that attaches absolute source information to parser output.
 *
 * Prefer providing `baseSpan` that covers the authored range. If only an offset
 * is known, supply `baseOffset` and optionally `file` so spans can be rebased.
 */
export interface ExpressionParseContext {
  readonly baseSpan?: SourceSpan;
  readonly baseOffset?: number;
  readonly file?: SourceFileId;
}
