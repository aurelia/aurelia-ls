import type { NestedTemplateHtmlNode } from "@aurelia-ls/compiler/synthesis/aot/emit-template.js";
import type { AotCodeResult, SerializedDefinition, SerializedExpression } from "@aurelia-ls/compiler/synthesis/aot/types.js";
import { emitExpressionTable } from "./expression-table.js";
import { emitDefinition } from "./definition.js";
import { toIdentifierPrefix } from "./format.js";

export { emitExpressionTable, getExpressionRef, buildExpressionIndexMap } from "./expression-table.js";
export { emitDefinition } from "./definition.js";
export * from "./format.js";

/* =============================================================================
 * PUBLIC API
 * ============================================================================= */

export interface EmitStaticAuOptions {
  /** Resource name (kebab-case, e.g., "my-app") */
  name: string;

  /** Class name for variable prefix generation */
  className: string;

  /** Resource type */
  type: "custom-element" | "custom-attribute";

  /** Template HTML string (from emitTemplate or provided separately) */
  template: string;

  /** Nested template HTML tree (for template controllers) */
  nestedHtmlTree?: NestedTemplateHtmlNode[];

  /**
   * Dependencies to include in the definition.
   * These are emitted as-is (identifier references or expressions).
   */
  dependencies?: string[];

  /**
   * Bindables to include in the definition.
   */
  bindables?: Array<{
    name: string;
    mode?: number;
    primary?: boolean;
    attribute?: string;
  }>;

  /** Indentation string */
  indent?: string;

  /** Include comments in output */
  includeComments?: boolean;
}

export interface EmitStaticAuResult {
  /** Expression table declaration */
  expressionTable: string;

  /** Nested definition declarations (for template controllers) */
  nestedDefinitions: string[];

  /** Main $au definition declaration */
  mainDefinition: string;

  /** All parts combined, ready for injection */
  combined: string;

  /** Variable name prefix used */
  prefix: string;

  /** Expression table variable name */
  expressionTableVar: string;

  /** Main definition variable name */
  definitionVar: string;
}

/**
 * Emit the complete static $au artifact from AOT compilation results.
 *
 * @example
 * ```javascript
 * const myApp__e = [
 *   { $kind: "AccessScope", name: "message", ancestor: 0 },
 * ];
 * const myApp_$au = {
 *   type: "custom-element",
 *   name: "my-app",
 *   template: "<div>${message}</div>",
 *   instructions: [...],
 *   needsCompile: false,
 * };
 * ```
 */
export function emitStaticAu(
  aot: AotCodeResult,
  options: EmitStaticAuOptions
): EmitStaticAuResult {
  const { name, className, type, template, nestedHtmlTree = [], dependencies = [], bindables = [], indent = "  ", includeComments = true } = options;

  // Generate identifier prefix from class name
  const prefix = toIdentifierPrefix(className);

  // Emit expression table
  const expressionTable = emitExpressionTable(aot.expressions, {
    prefix,
    indent,
    includeComments,
    stripSpans: true,
  });

  // Emit definition (handles nested templates internally)
  const { nestedDefinitions, mainDefinition } = emitDefinition(aot.definition, {
    prefix,
    template,
    type,
    expressions: aot.expressions,
    nestedHtmlTree,
    dependencies,
    bindables,
    indent,
  });

  // Combine all parts
  const parts = [expressionTable];
  if (nestedDefinitions.length > 0) {
    parts.push("");
    parts.push(...nestedDefinitions);
  }
  parts.push("");
  parts.push(mainDefinition);

  return {
    expressionTable,
    nestedDefinitions,
    mainDefinition,
    combined: parts.join("\n"),
    prefix,
    expressionTableVar: `${prefix}__e`,
    definitionVar: `${prefix}_$au`,
  };
}

/* =============================================================================
 * UTILITIES
 * ============================================================================= */

/**
 * Generate the assignment statement to attach $au to a class.
 *
 * @example
 * generateAuAssignment("MyApp", "myApp") → "MyApp.$au = myApp_$au;"
 */
export function generateAuAssignment(className: string, prefix?: string): string {
  const p = prefix ?? toIdentifierPrefix(className);
  return `${className}.$au = ${p}_$au;`;
}

/**
 * Check if AOT result has any content worth emitting.
 */
export function hasEmittableContent(aot: AotCodeResult): boolean {
  return (
    aot.expressions.length > 0 ||
    aot.definition.instructions.length > 0 ||
    aot.definition.nestedTemplates.length > 0
  );
}
