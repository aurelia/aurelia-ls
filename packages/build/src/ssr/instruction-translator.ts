/**
 * Instruction Translator
 *
 * Translates domain compiler's SerializedInstruction to Aurelia's IInstruction.
 * This bridges the gap between AOT compilation output and the Aurelia runtime.
 */

import {
  PropertyBindingInstruction,
  TextBindingInstruction,
  InterpolationInstruction,
  ListenerBindingInstruction,
  RefBindingInstruction,
  SetPropertyInstruction,
  SetAttributeInstruction,
  HydrateElementInstruction,
  HydrateAttributeInstruction,
  HydrateTemplateController,
  HydrateLetElementInstruction,
  LetBindingInstruction,
  IteratorBindingInstruction,
  MultiAttrInstruction,
  type IInstruction,
} from "@aurelia/template-compiler";
import {
  BindingMode as AuBindingMode,
} from "@aurelia/template-compiler";
import {
  createInterpolation,
  type IsBindingBehavior,
  type ForOfStatement,
  type Interpolation,
} from "@aurelia/expression-parser";
import type {
  SerializedDefinition,
  SerializedInstruction,
  SerializedExpression,
  SerializedPropertyBinding,
  SerializedTextBinding,
  SerializedInterpolation,
  SerializedListenerBinding,
  SerializedRefBinding,
  SerializedSetProperty,
  SerializedSetAttribute,
  SerializedHydrateElement,
  SerializedHydrateAttribute,
  SerializedHydrateTemplateController,
  SerializedHydrateLetElement,
  SerializedIteratorBinding,
  // SerializedAuxBinding - reserved for future use
  SerializedLetBinding,
  ExprId,
  BindingMode,
  AnyBindingExpression,
} from "@aurelia-ls/domain";

/* =============================================================================
 * Public API
 * ============================================================================= */

export interface TranslationContext {
  /** Map of expression IDs to ASTs */
  exprMap: Map<ExprId, AnyBindingExpression>;
  /** Nested template definitions (translated) */
  nestedDefs: NestedDefinition[];
}

export interface NestedDefinition {
  /** Template HTML with markers */
  template: string;
  /** Translated instructions */
  instructions: IInstruction[][];
  /** Component name */
  name: string;
  /** Whether compilation is needed (always false for AOT) */
  needsCompile: false;
}

/**
 * Translate serialized instructions to Aurelia instructions.
 *
 * @param serialized - The serialized instruction rows from AOT emit
 * @param expressions - Expression table from AOT emit
 * @param nestedTemplates - Nested template definitions (for controllers)
 * @param nestedHtml - HTML strings for nested templates
 * @returns Translated Aurelia instructions
 */
export function translateInstructions(
  serialized: SerializedInstruction[][],
  expressions: SerializedExpression[],
  nestedTemplates: SerializedDefinition[],
  nestedHtml: string[],
): {
  instructions: IInstruction[][];
  nestedDefs: NestedDefinition[];
} {
  // Build expression lookup map
  const exprMap = new Map<ExprId, AnyBindingExpression>();
  for (const expr of expressions) {
    exprMap.set(expr.id, expr.ast);
  }

  // Translate nested templates first (they may be referenced by controllers)
  const nestedDefs: NestedDefinition[] = [];
  for (let i = 0; i < nestedTemplates.length; i++) {
    const nested = nestedTemplates[i];
    const html = nestedHtml[i] ?? "";
    const nestedResult = translateInstructions(
      nested?.instructions ?? [],
      expressions, // Share expression table
      nested?.nestedTemplates ?? [],
      [], // Nested nested templates - should be empty for now
    );
    nestedDefs.push({
      template: html,
      instructions: nestedResult.instructions,
      name: nested?.name ?? `nested-${i}`,
      needsCompile: false,
    });
  }

  // Create translation context
  const ctx: TranslationContext = { exprMap, nestedDefs };

  // Translate each row of instructions
  const instructions = serialized.map(row =>
    row.map(ins => translateInstruction(ins, ctx))
  );

  return { instructions, nestedDefs };
}

/* =============================================================================
 * Instruction Translation
 * ============================================================================= */

function translateInstruction(
  ins: SerializedInstruction,
  ctx: TranslationContext,
): IInstruction {
  switch (ins.type) {
    case "propertyBinding":
      return translatePropertyBinding(ins, ctx);
    case "textBinding":
      return translateTextBinding(ins, ctx);
    case "interpolation":
      return translateInterpolation(ins, ctx);
    case "listenerBinding":
      return translateListenerBinding(ins, ctx);
    case "refBinding":
      return translateRefBinding(ins, ctx);
    case "setProperty":
      return translateSetProperty(ins);
    case "setAttribute":
      return translateSetAttribute(ins);
    case "hydrateElement":
      return translateHydrateElement(ins, ctx);
    case "hydrateAttribute":
      return translateHydrateAttribute(ins, ctx);
    case "hydrateTemplateController":
      return translateHydrateTemplateController(ins, ctx);
    case "hydrateLetElement":
      return translateHydrateLetElement(ins, ctx);
    case "iteratorBinding":
      return translateIteratorBinding(ins, ctx);
    default:
      throw new Error(`Unknown instruction type: ${(ins as SerializedInstruction).type}`);
  }
}

function translatePropertyBinding(
  ins: SerializedPropertyBinding,
  ctx: TranslationContext,
): PropertyBindingInstruction {
  const expr = getExpr(ctx.exprMap, ins.exprId) as IsBindingBehavior;
  const mode = translateBindingMode(ins.mode);
  return new PropertyBindingInstruction(expr, ins.to, mode);
}

function translateTextBinding(
  ins: SerializedTextBinding,
  ctx: TranslationContext,
): TextBindingInstruction {
  // Build an Interpolation from parts and expressions
  const expressions = ins.exprIds.map((id: ExprId) => getExpr(ctx.exprMap, id) as IsBindingBehavior);
  const interpolation = createInterpolation(ins.parts, expressions);
  // TextBindingInstruction type says string|IsBindingBehavior but runtime handles Interpolation
  return new TextBindingInstruction(interpolation as unknown as IsBindingBehavior);
}

function translateInterpolation(
  ins: SerializedInterpolation,
  ctx: TranslationContext,
): InterpolationInstruction {
  const expressions = ins.exprIds.map((id: ExprId) => getExpr(ctx.exprMap, id) as IsBindingBehavior);
  const interpolation = createInterpolation(ins.parts, expressions);
  return new InterpolationInstruction(interpolation, ins.to);
}

function translateListenerBinding(
  ins: SerializedListenerBinding,
  ctx: TranslationContext,
): ListenerBindingInstruction {
  const expr = getExpr(ctx.exprMap, ins.exprId) as IsBindingBehavior;
  return new ListenerBindingInstruction(
    expr,
    ins.to,
    ins.capture,
    ins.modifier ?? null,
  );
}

function translateRefBinding(
  ins: SerializedRefBinding,
  ctx: TranslationContext,
): RefBindingInstruction {
  const expr = getExpr(ctx.exprMap, ins.exprId) as IsBindingBehavior;
  return new RefBindingInstruction(expr, ins.to);
}

function translateSetProperty(
  ins: SerializedSetProperty,
): SetPropertyInstruction {
  return new SetPropertyInstruction(ins.value, ins.to);
}

function translateSetAttribute(
  ins: SerializedSetAttribute,
): SetAttributeInstruction {
  // SetAttributeInstruction expects string value
  return new SetAttributeInstruction(ins.value ?? "", ins.to);
}

function translateHydrateElement(
  ins: SerializedHydrateElement,
  ctx: TranslationContext,
): HydrateElementInstruction {
  // Translate nested instructions
  const props = ins.instructions.map((i: SerializedInstruction) => translateInstruction(i, ctx));

  return new HydrateElementInstruction(
    ins.resource,
    props,
    null, // projections - not yet supported
    ins.containerless ?? false,
    undefined, // captures
    {}, // data
  );
}

function translateHydrateAttribute(
  ins: SerializedHydrateAttribute,
  ctx: TranslationContext,
): HydrateAttributeInstruction {
  const props = ins.instructions.map((i: SerializedInstruction) => translateInstruction(i, ctx));
  return new HydrateAttributeInstruction(
    ins.resource,
    ins.alias,
    props,
  );
}

function translateHydrateTemplateController(
  ins: SerializedHydrateTemplateController,
  ctx: TranslationContext,
): HydrateTemplateController {
  // Get the nested definition for this controller
  const nestedDef = ctx.nestedDefs[ins.templateIndex];
  if (!nestedDef) {
    throw new Error(`Missing nested template at index ${ins.templateIndex}`);
  }

  // Translate nested instructions
  const props = ins.instructions.map((i: SerializedInstruction) => translateInstruction(i, ctx));

  // Build the element definition for the template controller
  const def = {
    name: nestedDef.name,
    type: "custom-element" as const,
    template: nestedDef.template,
    instructions: nestedDef.instructions,
    needsCompile: false,
  };

  return new HydrateTemplateController(
    def,
    ins.resource,
    undefined, // alias
    props,
  );
}

function translateHydrateLetElement(
  ins: SerializedHydrateLetElement,
  ctx: TranslationContext,
): HydrateLetElementInstruction {
  const bindings = ins.bindings.map((b: SerializedLetBinding) => {
    const expr = getExpr(ctx.exprMap, b.exprId) as IsBindingBehavior | Interpolation;
    return new LetBindingInstruction(expr, b.to);
  });
  return new HydrateLetElementInstruction(bindings, ins.toBindingContext);
}

function translateIteratorBinding(
  ins: SerializedIteratorBinding,
  ctx: TranslationContext,
): IteratorBindingInstruction {
  const forOf = getExpr(ctx.exprMap, ins.exprId) as ForOfStatement;

  // Translate aux bindings to MultiAttrInstruction
  const props: MultiAttrInstruction[] = [];
  if (ins.aux) {
    for (const aux of ins.aux) {
      // Aux bindings like key.bind are translated to MultiAttrInstruction
      // The value is the expression string, command is the binding type
      const expr = getExpr(ctx.exprMap, aux.exprId);
      // For now, just use the expression as-is - runtime will handle it
      props.push(new MultiAttrInstruction(
        serializeExpr(expr),
        aux.name,
        "bind", // default command
      ));
    }
  }

  return new IteratorBindingInstruction(forOf, ins.to, props);
}

/* =============================================================================
 * Helpers
 * ============================================================================= */

function getExpr(
  exprMap: Map<ExprId, AnyBindingExpression>,
  id: ExprId,
): AnyBindingExpression {
  const expr = exprMap.get(id);
  if (!expr) {
    throw new Error(`Expression not found: ${id}`);
  }
  return expr;
}

/**
 * Translate domain compiler binding mode to Aurelia binding mode.
 */
function translateBindingMode(mode: BindingMode): typeof AuBindingMode[keyof typeof AuBindingMode] {
  switch (mode) {
    case "default":
      return AuBindingMode.default;
    case "oneTime":
      return AuBindingMode.oneTime;
    case "toView":
      return AuBindingMode.toView;
    case "fromView":
      return AuBindingMode.fromView;
    case "twoWay":
      return AuBindingMode.twoWay;
    default:
      return AuBindingMode.default;
  }
}

/**
 * Serialize an expression to string for MultiAttrInstruction.
 * This is a fallback for aux bindings - ideally we'd pass the AST directly.
 */
function serializeExpr(expr: AnyBindingExpression): string {
  // Simple serialization - for basic cases
  if (expr.$kind === "AccessScope") {
    return (expr as { name: string }).name;
  }
  if (expr.$kind === "AccessMember") {
    const member = expr as { object: AnyBindingExpression; name: string };
    return `${serializeExpr(member.object)}.${member.name}`;
  }
  // Fallback - return a placeholder
  return "value";
}
