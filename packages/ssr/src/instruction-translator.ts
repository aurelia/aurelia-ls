/**
 * Instruction Translator
 *
 * Translates AOT compiler's SerializedInstruction to Aurelia's IInstruction.
 * This bridges the gap between AOT compilation output and the Aurelia runtime.
 */

import {
  type PropertyBindingInstruction,
  type TextBindingInstruction,
  type InterpolationInstruction,
  type ListenerBindingInstruction,
  type RefBindingInstruction,
  type SetPropertyInstruction,
  type SetAttributeInstruction,
  type HydrateElementInstruction,
  type HydrateAttributeInstruction,
  type HydrateTemplateController,
  type HydrateLetElementInstruction,
  type LetBindingInstruction,
  type IteratorBindingInstruction,
  type MultiAttrInstruction,
  type IInstruction,
  itPropertyBinding,
  itTextBinding,
  itInterpolation,
  itListenerBinding,
  itRefBinding,
  itSetProperty,
  itSetAttribute,
  itHydrateElement,
  itHydrateAttribute,
  itHydrateTemplateController,
  itHydrateLetElement,
  itLetBinding,
  itIteratorBinding,
  itMultiAttr,
} from "@aurelia/template-compiler";
import {
  createInterpolation,
  type IsBindingBehavior,
  type ForOfStatement,
  type Interpolation,
} from "@aurelia/expression-parser";
import {
  INSTRUCTION_TYPE,
  debug,
  type SerializedDefinition,
  type SerializedInstruction,
  type SerializedExpression,
  type SerializedPropertyBinding,
  type SerializedTextBinding,
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
  // SerializedAuxBinding - reserved for future use
  type SerializedLetBinding,
  type NestedTemplateHtmlNode,
  type ExprId,
  type AnyBindingExpression,
} from "@aurelia-ls/compiler";

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
  /** Nested template definitions (for controllers with branches like switch/promise) */
  nestedTemplates?: NestedDefinition[];
}

/**
 * Translate serialized instructions to Aurelia instructions.
 *
 * @param serialized - The serialized instruction rows from AOT emit
 * @param expressions - Expression table from AOT emit
 * @param nestedTemplates - Nested template definitions (for controllers)
 * @param nestedHtmlTree - Hierarchical HTML tree for nested templates
 * @returns Translated Aurelia instructions
 */
export function translateInstructions(
  serialized: SerializedInstruction[][],
  expressions: SerializedExpression[],
  nestedTemplates: SerializedDefinition[],
  nestedHtmlTree: NestedTemplateHtmlNode[],
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
  // Match each nested template definition with its corresponding HTML from the tree
  const nestedDefs: NestedDefinition[] = [];
  for (let i = 0; i < nestedTemplates.length; i++) {
    const nested = nestedTemplates[i];
    const htmlNode = nestedHtmlTree[i];
    const nestedResult = translateInstructions(
      nested?.instructions ?? [],
      expressions, // Share expression table
      nested?.nestedTemplates ?? [],
      htmlNode?.nested ?? [], // Pass nested HTML tree for recursion
    );
    nestedDefs.push({
      template: htmlNode?.html ?? "",
      instructions: nestedResult.instructions,
      name: nested?.name ?? `nested-${i}`,
      needsCompile: false,
      // Include nested definitions (for branches like switch/case, promise/then/catch)
      nestedTemplates: nestedResult.nestedDefs.length > 0 ? nestedResult.nestedDefs : undefined,
    });
    debug.ssr("translate.nested", {
      index: i,
      name: nested?.name,
      htmlLength: htmlNode?.html?.length ?? 0,
      instructionRows: nested?.instructions?.length ?? 0,
      childNestedCount: nestedResult.nestedDefs.length,
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
    case INSTRUCTION_TYPE.propertyBinding:
      return translatePropertyBinding(ins, ctx);
    case INSTRUCTION_TYPE.textBinding:
      return translateTextBinding(ins, ctx);
    case INSTRUCTION_TYPE.interpolation:
      return translateInterpolation(ins, ctx);
    case INSTRUCTION_TYPE.listenerBinding:
      return translateListenerBinding(ins, ctx);
    case INSTRUCTION_TYPE.refBinding:
      return translateRefBinding(ins, ctx);
    case INSTRUCTION_TYPE.setProperty:
      return translateSetProperty(ins);
    case INSTRUCTION_TYPE.setAttribute:
      return translateSetAttribute(ins);
    case INSTRUCTION_TYPE.hydrateElement:
      return translateHydrateElement(ins, ctx);
    case INSTRUCTION_TYPE.hydrateAttribute:
      return translateHydrateAttribute(ins, ctx);
    case INSTRUCTION_TYPE.hydrateTemplateController:
      return translateHydrateTemplateController(ins, ctx);
    case INSTRUCTION_TYPE.hydrateLetElement:
      return translateHydrateLetElement(ins, ctx);
    case INSTRUCTION_TYPE.iteratorBinding:
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
  // Mode is already numeric, matching Aurelia's BindingMode values
  return {
    type: itPropertyBinding,
    from: expr,
    to: ins.to,
    mode: ins.mode,
  } as PropertyBindingInstruction;
}

function translateTextBinding(
  ins: SerializedTextBinding,
  ctx: TranslationContext,
): TextBindingInstruction {
  // Build an Interpolation from parts and expressions
  const expressions = ins.exprIds.map((id: ExprId) => getExpr(ctx.exprMap, id) as IsBindingBehavior);
  const interpolation = createInterpolation(ins.parts, expressions);
  // TextBindingInstruction type says string|IsBindingBehavior but runtime handles Interpolation
  return {
    type: itTextBinding,
    from: interpolation as unknown as IsBindingBehavior,
  } as TextBindingInstruction;
}

function translateInterpolation(
  ins: SerializedInterpolation,
  ctx: TranslationContext,
): InterpolationInstruction {
  const expressions = ins.exprIds.map((id: ExprId) => getExpr(ctx.exprMap, id) as IsBindingBehavior);
  const interpolation = createInterpolation(ins.parts, expressions);
  return {
    type: itInterpolation,
    from: interpolation,
    to: ins.to,
  } as InterpolationInstruction;
}

function translateListenerBinding(
  ins: SerializedListenerBinding,
  ctx: TranslationContext,
): ListenerBindingInstruction {
  const expr = getExpr(ctx.exprMap, ins.exprId) as IsBindingBehavior;
  return {
    type: itListenerBinding,
    from: expr,
    to: ins.to,
    capture: ins.capture,
    modifier: ins.modifier ?? null,
  } as ListenerBindingInstruction;
}

function translateRefBinding(
  ins: SerializedRefBinding,
  ctx: TranslationContext,
): RefBindingInstruction {
  const expr = getExpr(ctx.exprMap, ins.exprId) as IsBindingBehavior;
  return {
    type: itRefBinding,
    from: expr,
    to: ins.to,
  } as RefBindingInstruction;
}

function translateSetProperty(
  ins: SerializedSetProperty,
): SetPropertyInstruction {
  return {
    type: itSetProperty,
    value: ins.value,
    to: ins.to,
  } as SetPropertyInstruction;
}

function translateSetAttribute(
  ins: SerializedSetAttribute,
): SetAttributeInstruction {
  // SetAttributeInstruction expects string value
  return {
    type: itSetAttribute,
    value: ins.value ?? "",
    to: ins.to,
  } as SetAttributeInstruction;
}

function translateHydrateElement(
  ins: SerializedHydrateElement,
  ctx: TranslationContext,
): HydrateElementInstruction {
  // Translate nested instructions
  const props = ins.instructions.map((i: SerializedInstruction) => translateInstruction(i, ctx));

  return {
    type: itHydrateElement,
    res: ins.res,
    props,
    projections: null,
    containerless: ins.containerless ?? false,
    captures: void 0,
    data: {},
  } as HydrateElementInstruction;
}

function translateHydrateAttribute(
  ins: SerializedHydrateAttribute,
  ctx: TranslationContext,
): HydrateAttributeInstruction {
  const props = ins.instructions.map((i: SerializedInstruction) => translateInstruction(i, ctx));
  return {
    type: itHydrateAttribute,
    res: ins.res,
    alias: ins.alias,
    props,
  } as HydrateAttributeInstruction;
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

  // Create a nested context for translating this controller's instructions.
  // The templateIndex values in nestedDef.instructions reference nestedDef.nestedTemplates,
  // not the top-level ctx.nestedDefs.
  const nestedCtx: TranslationContext = {
    exprMap: ctx.exprMap,
    nestedDefs: nestedDef.nestedTemplates ?? [],
  };

  debug.ssr("translate.controller", {
    resource: ins.res,
    templateIndex: ins.templateIndex,
    templateName: nestedDef.name,
    templateHtmlLength: nestedDef.template.length,
    nestedDefsCount: nestedCtx.nestedDefs.length,
    instructionCount: ins.instructions.length,
  });

  // Translate nested instructions using the nested context
  const props = ins.instructions.map((i: SerializedInstruction) => translateInstruction(i, nestedCtx));

  // Build the element definition for the template controller
  const def = {
    name: nestedDef.name,
    type: "custom-element" as const,
    template: nestedDef.template,
    instructions: nestedDef.instructions,
    needsCompile: false,
  };

  return {
    type: itHydrateTemplateController,
    def,
    res: ins.res,
    alias: void 0,
    props,
  } as HydrateTemplateController;
}

function translateHydrateLetElement(
  ins: SerializedHydrateLetElement,
  ctx: TranslationContext,
): HydrateLetElementInstruction {
  // ins.instructions now matches the runtime's expected field name
  const letBindings = ins.instructions.map((b: SerializedLetBinding) => {
    const expr = getExpr(ctx.exprMap, b.exprId) as IsBindingBehavior | Interpolation;
    return {
      type: itLetBinding,
      from: expr,
      to: b.to,
    } as LetBindingInstruction;
  });
  return {
    type: itHydrateLetElement,
    instructions: letBindings,
    toBindingContext: ins.toBindingContext,
  } as HydrateLetElementInstruction;
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
      props.push({
        type: itMultiAttr,
        value: expr as IsBindingBehavior,
        to: aux.name,
        command: "bind",
      } as MultiAttrInstruction);
    }
  }

  return {
    type: itIteratorBinding,
    forOf,
    to: ins.to,
    props,
  } as IteratorBindingInstruction;
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

// translateBindingMode is no longer needed - modes are now numeric and match Aurelia's values directly
