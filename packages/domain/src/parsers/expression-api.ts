import type {
  ForOfStatement,
  Interpolation,
  IsBindingBehavior,
  CustomExpression,
  AnyBindingExpression,
  BadExpression,
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
 * - 'IsProperty' / 'IsFunction' → IsBindingBehavior
 * - 'IsIterator'                → ForOfStatement
 * - 'Interpolation'             → Interpolation
 * - 'IsCustom'                  → CustomExpression
 */
export interface IExpressionParser {
  parse(expression: string, expressionType: "IsIterator"): ForOfStatement | BadExpression;
  parse(expression: string, expressionType: "Interpolation"): Interpolation;
  parse(expression: string, expressionType: "IsFunction" | "IsProperty"): IsBindingBehavior;
  parse(expression: string, expressionType: "IsCustom"): CustomExpression;

  // Fallback signature for generic call sites.
  parse(expression: string, expressionType: ExpressionType): AnyBindingExpression;
}
