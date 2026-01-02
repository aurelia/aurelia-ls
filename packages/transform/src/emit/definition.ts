/**
 * Transform Package - Definition Emission
 *
 * Generates JavaScript source for static $au definitions.
 * Handles the main component definition and nested templates.
 *
 * Instruction codes and binding modes are imported from compiler
 * to avoid duplication. See docs/transform-package-design.md.
 */

import {
  INSTRUCTION_TYPE,
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
  type BindingModeValue,
  type NestedTemplateHtmlNode,
} from "@aurelia-ls/compiler";
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

  /** Nested template HTML tree (for template controllers) */
  nestedHtmlTree?: NestedTemplateHtmlNode[];

  /**
   * Dependencies to include in the definition.
   * These are emitted as-is (identifier references or expressions).
   */
  dependencies?: string[];

  /**
   * Bindables to include in the definition.
   * Each bindable has a name and optional mode, primary, attribute.
   */
  bindables?: Array<{
    name: string;
    mode?: number;
    primary?: boolean;
    attribute?: string;
  }>;

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
  const { prefix, template, type, expressions, nestedHtmlTree = [], dependencies = [], bindables = [], indent = "  " } = options;

  const exprIndexMap = buildExpressionIndexMap(expressions);
  const nestedDefinitions: string[] = [];

  // Build a flat map of all nested definitions for variable name lookup
  // This assigns unique indices to all nested templates in tree order
  const defVarMap = new Map<SerializedDefinition, string>();
  buildNestedDefMap(definition, prefix, defVarMap);

  // Build a map from nested definition to its HTML content
  // This matches the hierarchical structure of nestedTemplates and nestedHtmlTree
  const defHtmlMap = new Map<SerializedDefinition, string>();
  buildNestedHtmlMap(definition.nestedTemplates, nestedHtmlTree, defHtmlMap);

  // Emit nested templates (depth-first, leaves first)
  emitNestedTemplates(definition, prefix, exprIndexMap, indent, nestedDefinitions, defVarMap, defHtmlMap);

  // Emit main definition
  const mainDefinition = emitMainDefinition(
    definition,
    prefix,
    template,
    type,
    exprIndexMap,
    indent,
    defVarMap,
    dependencies,
    bindables
  );

  return { nestedDefinitions, mainDefinition };
}

/**
 * Build a map from SerializedDefinition to its HTML content.
 * This matches the hierarchical structure: nestedTemplates[i] → nestedHtmlTree[i].html
 */
function buildNestedHtmlMap(
  nestedTemplates: SerializedDefinition[],
  nestedHtmlTree: NestedTemplateHtmlNode[],
  map: Map<SerializedDefinition, string>
): void {
  for (let i = 0; i < nestedTemplates.length; i++) {
    const def = nestedTemplates[i];
    const htmlNode = nestedHtmlTree[i];
    if (def && htmlNode) {
      map.set(def, htmlNode.html);
      // Recurse into nested definitions
      buildNestedHtmlMap(def.nestedTemplates, htmlNode.nested, map);
    }
  }
}

/**
 * Build a map of all nested definitions to their unique variable names.
 * Uses a flat counter to ensure uniqueness across the entire tree.
 */
function buildNestedDefMap(
  definition: SerializedDefinition,
  prefix: string,
  map: Map<SerializedDefinition, string>,
  counter: { value: number } = { value: 0 }
): void {
  for (const nested of definition.nestedTemplates) {
    // Assign unique variable name
    map.set(nested, `${prefix}__def_${counter.value++}`);
    // Recurse into nested's nested templates
    buildNestedDefMap(nested, prefix, map, counter);
  }
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
  defVarMap: Map<SerializedDefinition, string>,
  defHtmlMap: Map<SerializedDefinition, string>
): void {
  for (const nested of definition.nestedTemplates) {
    // Recurse into nested's nested templates first (depth-first, leaves first)
    emitNestedTemplates(nested, prefix, exprIndexMap, indent, output, defVarMap, defHtmlMap);

    // Get the unique variable name from the map
    const nestedVarName = defVarMap.get(nested);
    if (!nestedVarName) {
      throw new Error("Missing variable name for nested definition");
    }

    // Get the HTML content for this nested definition
    const nestedHtml = defHtmlMap.get(nested) ?? "";

    // Emit this nested definition
    const nestedSrc = emitNestedDefinition(nested, nestedVarName, nestedHtml, prefix, exprIndexMap, indent, defVarMap);
    output.push(nestedSrc);
  }
}

function emitNestedDefinition(
  definition: SerializedDefinition,
  varName: string,
  templateHtml: string,
  exprPrefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string,
  defVarMap: Map<SerializedDefinition, string>
): string {
  const lines: string[] = [];
  lines.push(`const ${varName} = {`);
  lines.push(`${indent}name: "${escapeString(definition.name)}",`);
  lines.push(`${indent}type: "custom-element",`);

  // Include the template HTML for this nested definition
  // This is required for the runtime to locate hydration targets
  lines.push(`${indent}template: "${escapeString(templateHtml)}",`);

  const instructionsStr = emitInstructions(
    definition.instructions,
    definition,
    exprPrefix,
    exprIndexMap,
    indent,
    defVarMap
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
  indent: string,
  defVarMap: Map<SerializedDefinition, string>,
  dependencies: string[],
  bindables: DefinitionEmitOptions["bindables"]
): string {
  const lines: string[] = [];
  lines.push(`const ${prefix}_$au = {`);
  lines.push(`${indent}type: "${type}",`);
  lines.push(`${indent}name: "${escapeString(definition.name)}",`);
  lines.push(`${indent}template: "${escapeString(template)}",`);

  const instructionsStr = emitInstructions(
    definition.instructions,
    definition,
    prefix,
    exprIndexMap,
    indent,
    defVarMap
  );
  lines.push(`${indent}instructions: ${instructionsStr},`);

  // Emit dependencies if present
  if (dependencies.length > 0) {
    lines.push(`${indent}dependencies: [${dependencies.join(", ")}],`);
  }

  // Emit bindables if present
  if (bindables && bindables.length > 0) {
    const bindablesStr = emitBindables(bindables, indent);
    lines.push(`${indent}bindables: ${bindablesStr},`);
  }

  lines.push(`${indent}needsCompile: false,`);
  lines.push("};");

  return lines.join("\n");
}

/**
 * Emit bindables object.
 * Format: { propName: { mode: 2 }, ... }
 */
function emitBindables(
  bindables: NonNullable<DefinitionEmitOptions["bindables"]>,
  indent: string
): string {
  const entries: string[] = [];

  for (const b of bindables) {
    const props: string[] = [];

    // Only emit non-default values
    if (b.mode !== undefined) {
      props.push(`mode: ${b.mode}`);
    }
    if (b.primary === true) {
      props.push(`primary: true`);
    }
    if (b.attribute !== undefined) {
      props.push(`attribute: "${escapeString(b.attribute)}"`);
    }

    if (props.length > 0) {
      entries.push(`${b.name}: { ${props.join(", ")} }`);
    } else {
      // Simple form: just the name with empty object
      entries.push(`${b.name}: {}`);
    }
  }

  return `{ ${entries.join(", ")} }`;
}

/* =============================================================================
 * INSTRUCTIONS
 * ============================================================================= */

/** Context for instruction emission - tracks which definition we're emitting for */
interface InstructionEmitContext {
  /** The definition containing these instructions (needed for template controller lookup) */
  definition: SerializedDefinition;
  /** Map from definition objects to their unique variable names */
  defVarMap: Map<SerializedDefinition, string>;
  /** Expression prefix for resolving expression references */
  exprPrefix: string;
  /** Expression index map for resolving expression IDs */
  exprIndexMap: Map<ExprId, number>;
}

function emitInstructions(
  instructions: SerializedInstruction[][],
  definition: SerializedDefinition,
  exprPrefix: string,
  exprIndexMap: Map<ExprId, number>,
  indent: string,
  defVarMap: Map<SerializedDefinition, string>
): string {
  if (instructions.length === 0) {
    return "[]";
  }

  const ctx: InstructionEmitContext = { definition, defVarMap, exprPrefix, exprIndexMap };
  const lines: string[] = ["["];

  for (let targetIdx = 0; targetIdx < instructions.length; targetIdx++) {
    const row = instructions[targetIdx]!;
    const rowStr = emitInstructionRow(row, ctx, indent + indent);
    lines.push(`${indent}/* target ${targetIdx} */ ${rowStr},`);
  }

  lines.push("]");
  return lines.join("\n" + indent);
}

function emitInstructionRow(
  row: SerializedInstruction[],
  ctx: InstructionEmitContext,
  indent: string
): string {
  if (row.length === 0) {
    return "[]";
  }

  const items = row.map(instr => emitInstruction(instr, ctx, indent));

  const firstItem = items[0];
  if (items.length === 1 && firstItem && firstItem.indexOf("\n") === -1 && firstItem.length < 80) {
    return `[${firstItem}]`;
  }

  return `[\n${items.map(item => indent + item).join(",\n")}\n${indent.slice(2)}]`;
}

function emitInstruction(
  instr: SerializedInstruction,
  ctx: InstructionEmitContext,
  indent: string
): string {
  // Map serialized instruction to runtime format
  switch (instr.type) {
    case INSTRUCTION_TYPE.textBinding:
      return emitTextBinding(instr, ctx);

    case INSTRUCTION_TYPE.propertyBinding:
      return emitPropertyBinding(instr, ctx);

    case INSTRUCTION_TYPE.interpolation:
      return emitInterpolation(instr, ctx);

    case INSTRUCTION_TYPE.listenerBinding:
      return emitListenerBinding(instr, ctx);

    case INSTRUCTION_TYPE.refBinding:
      return emitRefBinding(instr, ctx);

    case INSTRUCTION_TYPE.setProperty:
      return emitSetProperty(instr);

    case INSTRUCTION_TYPE.setAttribute:
      return emitSetAttribute(instr);

    case INSTRUCTION_TYPE.hydrateElement:
      return emitHydrateElement(instr, ctx, indent);

    case INSTRUCTION_TYPE.hydrateAttribute:
      return emitHydrateAttribute(instr, ctx, indent);

    case INSTRUCTION_TYPE.hydrateTemplateController:
      return emitHydrateTemplateController(instr, ctx, indent);

    case INSTRUCTION_TYPE.hydrateLetElement:
      return emitHydrateLetElement(instr, ctx);

    case INSTRUCTION_TYPE.iteratorBinding:
      return emitIteratorBinding(instr, ctx);

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
  ctx: InstructionEmitContext
): string {
  const exprs = instr.exprIds.map(id => resolveExprRef(ctx.exprPrefix, id, ctx.exprIndexMap));
  return `{ type: ${INSTRUCTION_TYPE.textBinding}, from: ${emitInterpolationObject(instr.parts, exprs)} }`;
}

function emitPropertyBinding(
  instr: SerializedPropertyBinding,
  ctx: InstructionEmitContext
): string {
  const exprRef = resolveExprRef(ctx.exprPrefix, instr.exprId, ctx.exprIndexMap);
  const modeCode = getBindingModeCode(instr.mode);
  return `{ type: ${INSTRUCTION_TYPE.propertyBinding}, from: ${exprRef}, to: "${instr.to}", mode: ${modeCode} }`;
}

function emitInterpolation(
  instr: SerializedInterpolation,
  ctx: InstructionEmitContext
): string {
  const exprs = instr.exprIds.map(id => resolveExprRef(ctx.exprPrefix, id, ctx.exprIndexMap));
  return `{ type: ${INSTRUCTION_TYPE.interpolation}, to: "${instr.to}", from: ${emitInterpolationObject(instr.parts, exprs)} }`;
}

function emitListenerBinding(
  instr: SerializedListenerBinding,
  ctx: InstructionEmitContext
): string {
  const exprRef = resolveExprRef(ctx.exprPrefix, instr.exprId, ctx.exprIndexMap);
  let str = `{ type: ${INSTRUCTION_TYPE.listenerBinding}, from: ${exprRef}, to: "${instr.to}", capture: ${instr.capture}`;
  if (instr.modifier) {
    str += `, modifier: "${instr.modifier}"`;
  }
  str += " }";
  return str;
}

function emitRefBinding(
  instr: SerializedRefBinding,
  ctx: InstructionEmitContext
): string {
  const exprRef = resolveExprRef(ctx.exprPrefix, instr.exprId, ctx.exprIndexMap);
  return `{ type: ${INSTRUCTION_TYPE.refBinding}, from: ${exprRef}, to: "${instr.to}" }`;
}

function emitSetProperty(
  instr: SerializedSetProperty
): string {
  const valueStr = formatValue(instr.value, "  ", "");
  return `{ type: ${INSTRUCTION_TYPE.setProperty}, value: ${valueStr}, to: "${instr.to}" }`;
}

function emitSetAttribute(
  instr: SerializedSetAttribute
): string {
  const valueStr = instr.value === null ? "null" : `"${escapeString(instr.value)}"`;
  return `{ type: ${INSTRUCTION_TYPE.setAttribute}, value: ${valueStr}, to: "${instr.to}" }`;
}

function emitHydrateElement(
  instr: SerializedHydrateElement,
  ctx: InstructionEmitContext,
  indent: string
): string {
  const props = emitNestedInstructions(instr.instructions, ctx, indent);
  let str = `{ type: ${INSTRUCTION_TYPE.hydrateElement}, res: "${instr.res}", props: ${props}`;
  if (instr.containerless) {
    str += ", containerless: true";
  }
  str += " }";
  return str;
}

function emitHydrateAttribute(
  instr: SerializedHydrateAttribute,
  ctx: InstructionEmitContext,
  indent: string
): string {
  const props = emitNestedInstructions(instr.instructions, ctx, indent);
  let str = `{ type: ${INSTRUCTION_TYPE.hydrateAttribute}, res: "${instr.res}", props: ${props}`;
  if (instr.alias) {
    str += `, alias: "${instr.alias}"`;
  }
  str += " }";
  return str;
}

function emitHydrateTemplateController(
  instr: SerializedHydrateTemplateController,
  ctx: InstructionEmitContext,
  indent: string
): string {
  // Look up the nested definition by its index in the current definition's nestedTemplates
  const nestedDef = ctx.definition.nestedTemplates[instr.templateIndex];
  if (!nestedDef) {
    throw new Error(`Nested template at index ${instr.templateIndex} not found`);
  }
  const defVar = ctx.defVarMap.get(nestedDef);
  if (!defVar) {
    throw new Error(`No variable name found for nested definition at index ${instr.templateIndex}`);
  }
  const props = emitNestedInstructions(instr.instructions, ctx, indent);
  return `{ type: ${INSTRUCTION_TYPE.hydrateTemplateController}, def: ${defVar}, res: "${instr.res}", props: ${props} }`;
}

function emitHydrateLetElement(
  instr: SerializedHydrateLetElement,
  ctx: InstructionEmitContext
): string {
  // Each let binding needs type: itLetBinding (101) per Aurelia's LetBindingInstruction
  const letBindings = instr.instructions.map(b => {
    const exprRef = resolveExprRef(ctx.exprPrefix, b.exprId, ctx.exprIndexMap);
    return `{ type: ${INSTRUCTION_TYPE.letBinding}, to: "${b.to}", from: ${exprRef} }`;
  });
  // Runtime expects 'instructions' field, not 'bindings'
  return `{ type: ${INSTRUCTION_TYPE.hydrateLetElement}, instructions: [${letBindings.join(", ")}], toBindingContext: ${instr.toBindingContext} }`;
}

function emitIteratorBinding(
  instr: SerializedIteratorBinding,
  ctx: InstructionEmitContext
): string {
  const exprRef = resolveExprRef(ctx.exprPrefix, instr.exprId, ctx.exprIndexMap);
  return `{ forOf: ${exprRef}, to: "${instr.to}", props: [], type: ${INSTRUCTION_TYPE.iteratorBinding} }`;
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
  ctx: InstructionEmitContext,
  indent: string
): string {
  if (instructions.length === 0) {
    return "[]";
  }
  const items = instructions.map(i => emitInstruction(i, ctx, indent));
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
 * Convert binding mode value to string for code emission.
 * Mode is already numeric (BindingModeValue), just convert to string.
 */
function getBindingModeCode(mode: BindingModeValue): string {
  return String(mode);
}
