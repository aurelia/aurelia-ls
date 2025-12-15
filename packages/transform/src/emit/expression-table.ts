/**
 * Transform Package - Expression Table Emission
 *
 * Generates JavaScript source for expression tables.
 * Expression tables allow sharing AST objects across instructions.
 */

import type { SerializedExpression, ExprId } from "@aurelia-ls/domain";
import { formatAst, toIdentifierPrefix } from "./format.js";

/* =============================================================================
 * PUBLIC API
 * ============================================================================= */

export interface ExpressionTableOptions {
  /** Variable name prefix (e.g., "myApp" → "myApp__e") */
  prefix: string;

  /** Indentation string */
  indent?: string;

  /** Include comments with expression index */
  includeComments?: boolean;

  /** Strip source spans from ASTs */
  stripSpans?: boolean;
}

/**
 * Emit an expression table as JavaScript source.
 *
 * @example
 * ```javascript
 * const myApp__e = [
 *   // 0: AccessScope
 *   { "$kind": "AccessScope", "name": "message", "ancestor": 0 },
 *   // 1: ForOfStatement
 *   { "$kind": "ForOfStatement", ... },
 * ];
 * ```
 */
export function emitExpressionTable(
  expressions: SerializedExpression[],
  options: ExpressionTableOptions
): string {
  const {
    prefix,
    indent = "  ",
    includeComments = true,
    stripSpans = false,
  } = options;

  if (expressions.length === 0) {
    return `const ${prefix}__e = [];`;
  }

  const lines: string[] = [];
  lines.push(`const ${prefix}__e = [`);

  for (let i = 0; i < expressions.length; i++) {
    const expr = expressions[i]!;
    const ast = stripSpans ? stripSpansFromAst(expr.ast) : expr.ast;

    if (includeComments) {
      const kind = getAstKind(ast);
      lines.push(`${indent}/* ${i} */ ${kind ? `// ${kind}` : ""}`);
    }

    const formatted = formatAst(ast, indent, indent);
    const isLast = i === expressions.length - 1;
    lines.push(`${indent}${formatted}${isLast ? "" : ","}`);
  }

  lines.push("];");

  return lines.join("\n");
}

/**
 * Get a reference to an expression in the table.
 *
 * @example
 * getExpressionRef("myApp", 0) → "myApp__e[0]"
 */
export function getExpressionRef(prefix: string, index: number): string {
  return `${prefix}__e[${index}]`;
}

/**
 * Build a map from ExprId to table index.
 */
export function buildExpressionIndexMap(
  expressions: SerializedExpression[]
): Map<ExprId, number> {
  const map = new Map<ExprId, number>();
  for (let i = 0; i < expressions.length; i++) {
    const expr = expressions[i]!;
    map.set(expr.id, i);
  }
  return map;
}

/* =============================================================================
 * HELPERS
 * ============================================================================= */

function getAstKind(ast: unknown): string | null {
  if (ast && typeof ast === "object" && "$kind" in ast) {
    return String((ast as { $kind: unknown }).$kind);
  }
  return null;
}

function stripSpansFromAst(ast: unknown): unknown {
  if (ast === null || ast === undefined) return ast;
  if (typeof ast !== "object") return ast;

  if (Array.isArray(ast)) {
    return ast.map(stripSpansFromAst);
  }

  const obj = ast as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip span-related properties
    if (key === "span" || key === "loc" || key === "start" || key === "end") {
      continue;
    }
    result[key] = stripSpansFromAst(value);
  }

  return result;
}
