/**
 * Transform Package - Definition Emission
 *
 * Generates JavaScript source for static $au definitions.
 * Handles the main component definition and nested templates.
 *
 * Instruction codes and binding modes are imported from domain
 * to avoid duplication. See docs/transform-package-design.md.
 */

import {
  INSTRUCTION_TYPE,
  BINDING_MODE,
  type SerializedDefinition,
  type SerializedInstruction,
  type SerializedExpression,
  type SerializedTextBinding,
  type SerializedPropertyBinding,
  type SerializedInterpolation,
  type SerializedListenerBinding,
  type SerializedRefBinding,
  type SerializedSetProperty,
  type SerializedSetAttribute,
  type SerializedHydrateElement,
  type SerializedHydrateAttribute,
  type SerializedHydrateTemplateController,
  type SerializedHydrateLetElement,
  type SerializedIteratorBinding,
  type ExprId,
  type BindingMode,
} from "@aurelia-ls/domain";
import { formatValue, escapeString, indent as indentText } from "./format.js";
import { getExpressionRef, buildExpressionIndexMap } from "./expression-table.js";

/* =============================================================================
 * PUBLIC API
 * ============================================================================= */

export interface DefinitionEmitOptions {
  /** Variable name prefix (e.g., "myApp") */
  prefix: string;

  /** Template HTML string */
  template: string;

  /** Resource type */
  type: "custom-element" | "custom-attribute";

  /** Expression table for reference resolution */
  expressions: SerializedExpression[];

  /** Indentation string */
  indent?: string;
}

export interface DefinitionEmitResult {
  /** Nested definition sources (for template controllers) */
  nestedDefinitions: string[];

  /** Main definition source */
  mainDefinition: string;
}

/**
 * Emit a component definition as JavaScript source.
 *
 * @example
 * ```javascript
 * const myApp_$au = {
 *   type: "custom-element",
 *   name: "my-app",
 *   template: "<div>...</div>",
 *   instructions: [...],
 *   needsCompile: false,
 * };
 * ```
 */
export function emitDefinition(
  definition: SerializedDefinition,
  options: DefinitionEmitOptions
): DefinitionEmitResult {
  const { prefix, template, type, expressions, indent = "  " } = options;

  const exprIndexMap = buildExpressionIndexMap(expressions);
  const nestedDefinitions: string[] = [];

  // Emit nested templates first (depth-first)
  emitNestedTemplates(definition, prefix, exprIndexMap, indent, nestedDefinitions, 0);

  // Emit main definition
  const mainDefinition = emitMainDefinition(
    definition,
    prefix,
    template,
    type,
    exprIndexMap,
    indent
  );

  return { nestedDefinitions, mainDefinition };
}

/* =============================================================================
 * NESTED TEMPLATES
 * ============================================================================= */

function emitNestedTemplates(
  definition: SerializedDefinition,
  prefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string,
  output: string[],
  depth: number
): void {
  for (let i = 0; i < definition.nestedTemplates.length; i++) {
    const nested = definition.nestedTemplates[i]!;
    const nestedPrefix = `${prefix}__def${depth}_${i}`;

    // Recurse into nested's nested templates
    emitNestedTemplates(nested, prefix, exprIndexMap, indent, output, depth + 1);

    // Emit this nested definition
    const nestedSrc = emitNestedDefinition(nested, nestedPrefix, prefix, exprIndexMap, indent);
    output.push(nestedSrc);
  }
}

function emitNestedDefinition(
  definition: SerializedDefinition,
  varName: string,
  exprPrefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  const lines: string[] = [];
  lines.push(`const ${varName} = {`);
  lines.push(`${indent}name: "${escapeString(definition.name)}",`);
  lines.push(`${indent}type: "custom-element",`);

  // Nested templates don't have their own template string - they use the instruction's inline template
  // But they do have instructions
  const instructionsStr = emitInstructions(
    definition.instructions,
    exprPrefix,
    exprIndexMap,
    indent
  );
  lines.push(`${indent}instructions: ${instructionsStr},`);
  lines.push(`${indent}needsCompile: false,`);
  lines.push("};");

  return lines.join("\n");
}

/* =============================================================================
 * MAIN DEFINITION
 * ============================================================================= */

function emitMainDefinition(
  definition: SerializedDefinition,
  prefix: string,
  template: string,
  type: "custom-element" | "custom-attribute",
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  const lines: string[] = [];
  lines.push(`const ${prefix}_$au = {`);
  lines.push(`${indent}type: "${type}",`);
  lines.push(`${indent}name: "${escapeString(definition.name)}",`);
  lines.push(`${indent}template: "${escapeString(template)}",`);

  const instructionsStr = emitInstructions(
    definition.instructions,
    prefix,
    exprIndexMap,
    indent
  );
  lines.push(`${indent}instructions: ${instructionsStr},`);
  lines.push(`${indent}needsCompile: false,`);
  lines.push("};");

  return lines.join("\n");
}

/* =============================================================================
 * INSTRUCTIONS
 * ============================================================================= */

function emitInstructions(
  instructions: SerializedInstruction[][],
  prefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  if (instructions.length === 0) {
    return "[]";
  }

  const lines: string[] = ["["];

  for (let targetIdx = 0; targetIdx < instructions.length; targetIdx++) {
    const row = instructions[targetIdx]!;
    const rowStr = emitInstructionRow(row, prefix, exprIndexMap, indent + indent);
    lines.push(`${indent}/* target ${targetIdx} */ ${rowStr},`);
  }

  lines.push("]");
  return lines.join("\n" + indent);
}

function emitInstructionRow(
  row: SerializedInstruction[],
  prefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  if (row.length === 0) {
    return "[]";
  }

  const items = row.map(instr => emitInstruction(instr, prefix, exprIndexMap, indent));

  const firstItem = items[0];
  if (items.length === 1 && firstItem && firstItem.indexOf("\n") === -1 && firstItem.length < 80) {
    return `[${firstItem}]`;
  }

  return `[\n${items.map(item => indent + item).join(",\n")}\n${indent.slice(2)}]`;
}

function emitInstruction(
  instr: SerializedInstruction,
  prefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  // Map serialized instruction to runtime format
  switch (instr.type) {
    case "textBinding":
      return emitTextBinding(instr, prefix, exprIndexMap);

    case "propertyBinding":
      return emitPropertyBinding(instr, prefix, exprIndexMap);

    case "interpolation":
      return emitInterpolation(instr, prefix, exprIndexMap);

    case "listenerBinding":
      return emitListenerBinding(instr, prefix, exprIndexMap);

    case "refBinding":
      return emitRefBinding(instr, prefix, exprIndexMap);

    case "setProperty":
      return emitSetProperty(instr);

    case "setAttribute":
      return emitSetAttribute(instr);

    case "hydrateElement":
      return emitHydrateElement(instr, prefix, exprIndexMap, indent);

    case "hydrateAttribute":
      return emitHydrateAttribute(instr, prefix, exprIndexMap, indent);

    case "hydrateTemplateController":
      return emitHydrateTemplateController(instr, prefix, exprIndexMap, indent);

    case "hydrateLetElement":
      return emitHydrateLetElement(instr, prefix, exprIndexMap);

    case "iteratorBinding":
      return emitIteratorBinding(instr, prefix, exprIndexMap);

    default:
      // Fallback: emit as-is
      return formatValue(instr, "  ", "");
  }
}

/* =============================================================================
 * INSTRUCTION TYPE EMITTERS
 * ============================================================================= */

function emitTextBinding(
  instr: SerializedTextBinding,
  prefix: string,
  exprIndexMap: Map<ExprId, number>
): string {
  const exprs = instr.exprIds.map(id => resolveExprRef(prefix, id, exprIndexMap));
  return `{ type: "${INSTRUCTION_TYPE.textBinding}", from: ${emitInterpolationObject(instr.parts, exprs)} }`;
}

function emitPropertyBinding(
  instr: SerializedPropertyBinding,
  prefix: string,
  exprIndexMap: Map<ExprId, number>
): string {
  const exprRef = resolveExprRef(prefix, instr.exprId, exprIndexMap);
  const modeCode = getBindingModeCode(instr.mode);
  return `{ type: "${INSTRUCTION_TYPE.propertyBinding}", from: ${exprRef}, to: "${instr.to}", mode: ${modeCode} }`;
}

function emitInterpolation(
  instr: SerializedInterpolation,
  prefix: string,
  exprIndexMap: Map<ExprId, number>
): string {
  const exprs = instr.exprIds.map(id => resolveExprRef(prefix, id, exprIndexMap));
  return `{ type: "${INSTRUCTION_TYPE.interpolation}", to: "${instr.to}", from: ${emitInterpolationObject(instr.parts, exprs)} }`;
}

function emitListenerBinding(
  instr: SerializedListenerBinding,
  prefix: string,
  exprIndexMap: Map<ExprId, number>
): string {
  const exprRef = resolveExprRef(prefix, instr.exprId, exprIndexMap);
  let str = `{ type: "${INSTRUCTION_TYPE.listenerBinding}", from: ${exprRef}, to: "${instr.to}", capture: ${instr.capture}`;
  if (instr.modifier) {
    str += `, modifier: "${instr.modifier}"`;
  }
  str += " }";
  return str;
}

function emitRefBinding(
  instr: SerializedRefBinding,
  prefix: string,
  exprIndexMap: Map<ExprId, number>
): string {
  const exprRef = resolveExprRef(prefix, instr.exprId, exprIndexMap);
  return `{ type: "${INSTRUCTION_TYPE.refBinding}", from: ${exprRef}, to: "${instr.to}" }`;
}

function emitSetProperty(
  instr: SerializedSetProperty
): string {
  const valueStr = formatValue(instr.value, "  ", "");
  return `{ type: "${INSTRUCTION_TYPE.setProperty}", value: ${valueStr}, to: "${instr.to}" }`;
}

function emitSetAttribute(
  instr: SerializedSetAttribute
): string {
  const valueStr = instr.value === null ? "null" : `"${escapeString(instr.value)}"`;
  return `{ type: "${INSTRUCTION_TYPE.setAttribute}", value: ${valueStr}, to: "${instr.to}" }`;
}

function emitHydrateElement(
  instr: SerializedHydrateElement,
  prefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  const props = emitNestedInstructions(instr.instructions, prefix, exprIndexMap, indent);
  let str = `{ type: "${INSTRUCTION_TYPE.hydrateElement}", res: "${instr.resource}", props: ${props}`;
  if (instr.containerless) {
    str += ", containerless: true";
  }
  str += " }";
  return str;
}

function emitHydrateAttribute(
  instr: SerializedHydrateAttribute,
  prefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  const props = emitNestedInstructions(instr.instructions, prefix, exprIndexMap, indent);
  let str = `{ type: "${INSTRUCTION_TYPE.hydrateAttribute}", res: "${instr.resource}", props: ${props}`;
  if (instr.alias) {
    str += `, alias: "${instr.alias}"`;
  }
  str += " }";
  return str;
}

function emitHydrateTemplateController(
  instr: SerializedHydrateTemplateController,
  prefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  const defVar = `${prefix}__def0_${instr.templateIndex}`;
  const props = emitNestedInstructions(instr.instructions, prefix, exprIndexMap, indent);
  return `{ type: "${INSTRUCTION_TYPE.hydrateTemplateController}", def: ${defVar}, res: "${instr.resource}", props: ${props} }`;
}

function emitHydrateLetElement(
  instr: SerializedHydrateLetElement,
  prefix: string,
  exprIndexMap: Map<ExprId, number>
): string {
  const bindings = instr.bindings.map(b => {
    const exprRef = resolveExprRef(prefix, b.exprId, exprIndexMap);
    return `{ to: "${b.to}", from: ${exprRef} }`;
  });
  return `{ type: "${INSTRUCTION_TYPE.hydrateLetElement}", bindings: [${bindings.join(", ")}], toBindingContext: ${instr.toBindingContext} }`;
}

function emitIteratorBinding(
  instr: SerializedIteratorBinding,
  prefix: string,
  exprIndexMap: Map<ExprId, number>
): string {
  const exprRef = resolveExprRef(prefix, instr.exprId, exprIndexMap);
  return `{ forOf: ${exprRef}, to: "${instr.to}", props: [], type: "${INSTRUCTION_TYPE.iteratorBinding}" }`;
}

/* =============================================================================
 * HELPERS
 * ============================================================================= */

function resolveExprRef(prefix: string, exprId: ExprId, exprIndexMap: Map<ExprId, number>): string {
  const index = exprIndexMap.get(exprId);
  if (index === undefined) {
    throw new Error(`Unknown expression ID: ${exprId}`);
  }
  return getExpressionRef(prefix, index);
}

function emitNestedInstructions(
  instructions: SerializedInstruction[],
  prefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string
): string {
  if (instructions.length === 0) {
    return "[]";
  }
  const items = instructions.map(i => emitInstruction(i, prefix, exprIndexMap, indent));
  return `[${items.join(", ")}]`;
}

function emitInterpolationObject(parts: string[], exprRefs: string[]): string {
  const partsStr = `[${parts.map(p => `"${escapeString(p)}"`).join(", ")}]`;
  const exprsStr = `[${exprRefs.join(", ")}]`;
  const firstExpr = exprRefs[0] || "null";
  const isMulti = exprRefs.length > 1;
  return `{ $kind: "Interpolation", parts: ${partsStr}, expressions: ${exprsStr}, isMulti: ${isMulti}, firstExpression: ${firstExpr} }`;
}

/**
 * Convert binding mode to runtime numeric code.
 * Uses domain's authoritative BINDING_MODE constants.
 */
function getBindingModeCode(mode: BindingMode): string {
  switch (mode) {
    case "oneTime": return String(BINDING_MODE.oneTime);
    case "toView": return String(BINDING_MODE.toView);
    case "fromView": return String(BINDING_MODE.fromView);
    case "twoWay": return String(BINDING_MODE.twoWay);
    default: return String(BINDING_MODE.toView); // default to toView
  }
}
