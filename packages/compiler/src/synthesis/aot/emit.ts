/* =============================================================================
 * AOT EMIT - Transform AotPlanModule to SerializedDefinition
 * -----------------------------------------------------------------------------
 * Consumes: AotPlanModule (from plan stage)
 * Produces: AotCodeResult (serialized instructions + expressions + mapping)
 *
 * This stage walks the plan tree and emits serialized instructions organized
 * by hydration target index. The output is ready for:
 * - Direct JSON serialization for build output
 * - Translation to Aurelia's runtime format (via codec)
 * ============================================================================= */

import type {
  AotPlanModule,
  AotCodeResult,
  SerializedDefinition,
  SerializedInstruction,
  SerializedPropertyBinding,
  SerializedInterpolation,
  SerializedTextBinding,
  SerializedListenerBinding,
  SerializedIteratorBinding,
  SerializedRefBinding,
  SerializedSetProperty,
  SerializedHydrateElement,
  SerializedHydrateAttribute,
  SerializedHydrateTemplateController,
  SerializedHydrateLetElement,
  SerializedLetBinding,
  SerializedExpression,
  SerializedBindable,
  AotMappingEntry,
  PlanNode,
  PlanElementNode,
  PlanTextNode,
  PlanBinding,
  PlanCustomElement,
  PlanCustomAttr,
  PlanLetElement,
  PlanController,
} from "./types.js";
import { INSTRUCTION_TYPE, BINDING_MODE, type BindingModeValue } from "./constants.js";
import type { ExprId, BindingMode, TemplateMetaIR } from "../../model/index.js";

/* =============================================================================
 * Public API
 * ============================================================================= */

import type { CompileTrace } from "../../shared/index.js";
import { NOOP_TRACE, CompilerAttributes } from "../../shared/index.js";
import { debug } from "../../shared/debug.js";

export interface AotEmitOptions {
  /** Template name (for the definition) */
  name?: string;

  /**
   * Strip source location spans from expression ASTs.
   * Reduces output size significantly for production builds.
   * @default false
   */
  stripSpans?: boolean;

  /**
   * Deduplicate identical expressions.
   * Reduces output size by sharing ASTs when the same expression appears multiple times.
   * @default false
   */
  deduplicateExpressions?: boolean;

  /** Optional trace for instrumentation */
  trace?: CompileTrace;
}

/**
 * Emit serialized instructions from an AotPlanModule.
 */
export function emitAotCode(
  plan: AotPlanModule,
  options: AotEmitOptions = {},
): AotCodeResult {
  const trace = options.trace ?? NOOP_TRACE;

  return trace.span("aot.emit", () => {
    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: plan.name ?? options.name ?? "template",
      "aot.emit.targetCount": plan.targetCount,
      "aot.emit.stripSpans": options.stripSpans ?? false,
      "aot.emit.deduplicate": options.deduplicateExpressions ?? false,
    });

    debug.aot("emit.start", {
      name: plan.name ?? options.name ?? "template",
      targetCount: plan.targetCount,
      exprCount: plan.expressions.length,
    });

    const ctx = new EmitContext(plan, options);

    trace.event("aot.emit.definition");
    let definition = ctx.emitDefinition(plan.root, options.name ?? "template", plan.templateMeta);
    let expressions = ctx.getExpressions();

    // Apply expression deduplication if requested
    if (options.deduplicateExpressions) {
      trace.event("aot.emit.deduplicate", { exprCount: expressions.length });
      const { dedupedExpressions, exprIdRemap } = deduplicateExpressionTable(
        expressions,
        options.stripSpans ?? false,
      );

      // Remap ExprIds in the definition
      if (exprIdRemap.size > 0) {
        definition = remapDefinitionExprIds(definition, exprIdRemap);
      }

      trace.setAttributes({
        "aot.emit.dedupedCount": dedupedExpressions.length,
        "aot.emit.remappedCount": exprIdRemap.size,
      });

      expressions = dedupedExpressions;
    }

    trace.setAttributes({
      [CompilerAttributes.EXPR_COUNT]: expressions.length,
      [CompilerAttributes.INSTR_COUNT]: definition.instructions.length,
    });

    return {
      definition,
      expressions,
      mapping: ctx.getMapping(),
    };
  });
}

/* =============================================================================
 * Emit Context
 * ============================================================================= */

class EmitContext {
  private readonly plan: AotPlanModule;
  private readonly options: AotEmitOptions;
  private readonly mapping: AotMappingEntry[] = [];
  private nestedTemplateIndex = 0;

  constructor(plan: AotPlanModule, options: AotEmitOptions) {
    this.plan = plan;
    this.options = options;
  }

  getExpressions(): SerializedExpression[] {
    return this.plan.expressions.map((e) => ({
      id: e.id,
      ast: this.options.stripSpans ? stripSpansFromAst(e.ast) : e.ast,
    }));
  }

  getMapping(): AotMappingEntry[] {
    return this.mapping;
  }

  /**
   * Emit a definition for a template subtree.
   */
  emitDefinition(root: PlanNode, name: string, templateMeta?: TemplateMetaIR): SerializedDefinition {
    const instructions: SerializedInstruction[][] = [];
    const nestedTemplates: SerializedDefinition[] = [];

    // Walk the tree and collect instructions by target index
    this.emitNode(root, instructions, nestedTemplates);

    const result: SerializedDefinition = {
      name,
      instructions,
      nestedTemplates,
      targetCount: instructions.length,
    };

    // Emit meta element properties
    if (templateMeta) {
      emitMetaProperties(result, templateMeta);
    }

    return result;
  }

  /**
   * Emit instructions for a node and its descendants.
   */
  private emitNode(
    node: PlanNode,
    instructions: SerializedInstruction[][],
    nestedTemplates: SerializedDefinition[],
  ): void {
    switch (node.kind) {
      case "element":
        this.emitElement(node, instructions, nestedTemplates);
        break;
      case "text":
        this.emitText(node, instructions);
        break;
      case "comment":
        // Comments don't produce instructions
        break;
      case "fragment":
        for (const child of node.children) {
          this.emitNode(child, instructions, nestedTemplates);
        }
        break;
    }
  }

  /**
   * Emit instructions for an element node.
   */
  private emitElement(
    node: PlanElementNode,
    instructions: SerializedInstruction[][],
    nestedTemplates: SerializedDefinition[],
  ): void {
    // Process template controllers first (outside-in order)
    // Controllers wrap the element, so their instructions come first
    for (const ctrl of node.controllers) {
      this.emitController(ctrl, node, instructions, nestedTemplates);
    }

    // If this element is a hydration target, emit its instructions
    if (node.targetIndex !== undefined) {
      const row = this.getOrCreateRow(instructions, node.targetIndex);

      // Custom element hydration
      if (node.customElement) {
        row.push(this.emitHydrateElement(node.customElement));
      }

      // Let element hydration
      if (node.letElement) {
        row.push(this.emitHydrateLetElement(node.letElement));
      }

      // Custom attribute hydrations
      for (const ca of node.customAttrs) {
        row.push(this.emitHydrateAttribute(ca));
      }

      // Element bindings
      for (const binding of node.bindings) {
        row.push(this.emitBinding(binding));
      }

      // Reorder instructions for runtime correctness (checkbox/radio, select)
      if (shouldReorderInstructions(node, row)) {
        reorderInstructions(node, row);
      }
    }

    // Recurse into children (unless wrapped by a controller that handles them)
    if (node.controllers.length === 0) {
      for (const child of node.children) {
        this.emitNode(child, instructions, nestedTemplates);
      }
    }
  }

  /**
   * Emit instructions for a text node.
   */
  private emitText(
    node: PlanTextNode,
    instructions: SerializedInstruction[][],
  ): void {
    if (node.interpolation && node.targetIndex !== undefined) {
      const row = this.getOrCreateRow(instructions, node.targetIndex);
      row.push({
        type: INSTRUCTION_TYPE.textBinding,
        parts: node.interpolation.parts,
        exprIds: node.interpolation.exprIds,
      } satisfies SerializedTextBinding);
    }
  }

  /**
   * Emit a template controller.
   * Config-driven: uses ctrl.resource instead of hardcoded kind.
   */
  private emitController(
    ctrl: PlanController,
    hostNode: PlanElementNode,
    instructions: SerializedInstruction[][],
    nestedTemplates: SerializedDefinition[],
  ): void {
    // Use array length as the template index (relative to sibling nested templates)
    const templateIndex = nestedTemplates.length;
    // Use global counter for unique naming
    const templateName = `${ctrl.resource}_${this.nestedTemplateIndex++}`;

    debug.aot("emit.controller", {
      resource: ctrl.resource,
      templateIndex,
      templateName,
      targetIndex: ctrl.targetIndex,
    });

    // Build nested definition from the controller's template
    const nestedDef = this.emitControllerTemplate(ctrl, hostNode, templateName);
    nestedTemplates.push(nestedDef);

    // Create the hydrate instruction for this controller
    const hydrateCtrl: SerializedHydrateTemplateController = {
      type: INSTRUCTION_TYPE.hydrateTemplateController,
      res: ctrl.resource,
      templateIndex,
      instructions: this.emitControllerBindings(ctrl),
    };

    // Controllers get their own target
    if (ctrl.targetIndex !== undefined) {
      const row = this.getOrCreateRow(instructions, ctrl.targetIndex);
      row.push(hydrateCtrl);
    }
  }

  /**
   * Emit the nested template for a controller.
   * Config-driven: uses ctrl.branches for child branch controllers.
   *
   * Nested templates need local target indices (starting from 0), but the plan
   * uses global indices. This method emits with global indices, then compacts
   * the instructions to use local indices.
   */
  private emitControllerTemplate(
    ctrl: PlanController,
    _hostNode: PlanElementNode,
    name: string,
  ): SerializedDefinition {
    const innerInstructions: SerializedInstruction[][] = [];
    const innerNested: SerializedDefinition[] = [];

    // Emit from the controller's template (which has the full nested structure)
    // instead of hostNode (which has empty children in the plan design)
    const template = getControllerMainTemplate(ctrl);
    if (template) {
      this.emitNode(template, innerInstructions, innerNested);
    }

    // Handle child branch controllers (switch cases, promise branches, etc.)
    this.emitControllerBranches(ctrl, innerNested);

    // Emit branch instructions when we have child branches
    if (ctrl.branches && ctrl.branches.length > 0) {
      for (let i = 0; i < ctrl.branches.length; i++) {
        const branchCtrl = ctrl.branches[i]!;
        // Each branch gets a row with its hydrateTemplateController instruction
        const row: SerializedInstruction[] = [];
        const branchInstruction: SerializedHydrateTemplateController = {
          type: INSTRUCTION_TYPE.hydrateTemplateController,
          res: branchCtrl.resource,
          templateIndex: i, // Index into innerNested
          instructions: this.emitControllerBindings(branchCtrl),
        };
        row.push(branchInstruction);
        innerInstructions.push(row);
      }
    }

    // Compact instructions to use local indices (remove empty rows)
    const compacted = compactInstructions(innerInstructions);

    return {
      name,
      instructions: compacted,
      nestedTemplates: innerNested,
      targetCount: compacted.length,
    };
  }

  /**
   * Emit element without its template controllers (for nested templates).
   */
  private emitElementWithoutControllers(
    node: PlanElementNode,
    instructions: SerializedInstruction[][],
    nestedTemplates: SerializedDefinition[],
  ): void {
    // If this element is a hydration target, emit its instructions
    if (node.targetIndex !== undefined) {
      const row = this.getOrCreateRow(instructions, node.targetIndex);

      // Custom element hydration
      if (node.customElement) {
        row.push(this.emitHydrateElement(node.customElement));
      }

      // Let element hydration
      if (node.letElement) {
        row.push(this.emitHydrateLetElement(node.letElement));
      }

      // Custom attribute hydrations
      for (const ca of node.customAttrs) {
        row.push(this.emitHydrateAttribute(ca));
      }

      // Element bindings
      for (const binding of node.bindings) {
        row.push(this.emitBinding(binding));
      }

      // Reorder instructions for runtime correctness (checkbox/radio, select)
      if (shouldReorderInstructions(node, row)) {
        reorderInstructions(node, row);
      }
    }

    // Recurse into children
    for (const child of node.children) {
      this.emitNode(child, instructions, nestedTemplates);
    }
  }

  /**
   * Emit controller-specific branches (cases, then/catch, etc.).
   * Config-driven: uses ctrl.branches for child branch controllers.
   */
  private emitControllerBranches(
    ctrl: PlanController,
    nestedTemplates: SerializedDefinition[],
  ): void {
    // Child branches are stored in ctrl.branches when config.branches.relationship === "child"
    if (ctrl.branches && ctrl.branches.length > 0) {
      for (const branchCtrl of ctrl.branches) {
        const branchIndex = this.nestedTemplateIndex++;
        nestedTemplates.push(
          this.emitDefinition(branchCtrl.template, `${branchCtrl.resource}_${branchIndex}`),
        );
      }
    }
  }

  /**
   * Emit bindings for a controller (its own bindable properties).
   * Config-driven: uses ctrl.config.trigger to determine binding type.
   */
  private emitControllerBindings(ctrl: PlanController): SerializedInstruction[] {
    const result: SerializedInstruction[] = [];
    const { config } = ctrl;

    switch (config.trigger.kind) {
      case "iterator": {
        // Iterator trigger: emit iteratorBinding with ForOfStatement
        if (ctrl.exprId) {
          const iteratorBinding: SerializedIteratorBinding = {
            type: INSTRUCTION_TYPE.iteratorBinding,
            to: config.trigger.prop,
            exprId: ctrl.exprId,
          };
          // Include auxiliary expressions (key, etc.)
          if (ctrl.auxExprs && ctrl.auxExprs.length > 0) {
            iteratorBinding.aux = ctrl.auxExprs.map(aux => ({
              name: aux.name,
              exprId: aux.exprId,
            }));
          }
          result.push(iteratorBinding);
        }
        break;
      }

      case "value": {
        // Value trigger: emit propertyBinding to the trigger prop
        if (ctrl.exprId) {
          result.push({
            type: INSTRUCTION_TYPE.propertyBinding,
            to: config.trigger.prop,
            exprId: ctrl.exprId,
            mode: BINDING_MODE.toView,
          } satisfies SerializedPropertyBinding);
        }
        break;
      }

      case "branch": {
        // Branch trigger: may have a value binding (case) or not (pending, else)
        // Branch triggers bind to "value" (case.bind="x" -> value property)
        if (ctrl.exprId) {
          result.push({
            type: INSTRUCTION_TYPE.propertyBinding,
            to: "value",
            exprId: ctrl.exprId,
            mode: BINDING_MODE.toView,
          } satisfies SerializedPropertyBinding);
        }
        break;
      }

      case "marker":
        // Marker trigger: no bindings (else, default-case)
        break;
    }

    return result;
  }

  /**
   * Emit a binding instruction.
   */
  private emitBinding(binding: PlanBinding): SerializedInstruction {
    switch (binding.type) {
      case "propertyBinding":
        return {
          type: INSTRUCTION_TYPE.propertyBinding,
          to: binding.to,
          exprId: binding.exprId,
          mode: toBindingModeValue(binding.mode),
        } satisfies SerializedPropertyBinding;

      case "attributeBinding":
        return {
          type: INSTRUCTION_TYPE.propertyBinding,
          to: binding.to,
          exprId: binding.exprId,
          mode: BINDING_MODE.toView,
        } satisfies SerializedPropertyBinding;

      case "attributeInterpolation":
        return {
          type: INSTRUCTION_TYPE.interpolation,
          to: binding.to,
          parts: binding.parts,
          exprIds: binding.exprIds,
        } satisfies SerializedInterpolation;

      case "styleBinding":
        return {
          type: INSTRUCTION_TYPE.propertyBinding,
          to: `style.${binding.property}`,
          exprId: binding.exprId,
          mode: BINDING_MODE.toView,
        } satisfies SerializedPropertyBinding;

      case "listenerBinding": {
        const listener: SerializedListenerBinding = {
          type: INSTRUCTION_TYPE.listenerBinding,
          to: binding.event,
          exprId: binding.exprId,
          capture: binding.capture,
        };
        if (binding.modifier !== undefined) {
          listener.modifier = binding.modifier;
        }
        return listener;
      }

      case "refBinding":
        return {
          type: INSTRUCTION_TYPE.refBinding,
          to: binding.to,
          exprId: binding.exprId,
        } satisfies SerializedRefBinding;
    }
  }

  /**
   * Emit hydrate instruction for a custom element.
   */
  private emitHydrateElement(ce: PlanCustomElement): SerializedHydrateElement {
    const instructions: SerializedInstruction[] = [];

    // Emit bindings
    for (const binding of ce.bindings) {
      instructions.push({
        type: INSTRUCTION_TYPE.propertyBinding,
        to: binding.to,
        exprId: binding.exprId,
        mode: toBindingModeValue(binding.mode),
      } satisfies SerializedPropertyBinding);
    }

    // Emit static props
    for (const prop of ce.staticProps) {
      instructions.push({
        type: INSTRUCTION_TYPE.setProperty,
        to: prop.name,
        value: prop.value,
      } satisfies SerializedSetProperty);
    }

    const result: SerializedHydrateElement = {
      type: INSTRUCTION_TYPE.hydrateElement,
      res: ce.resource,
      instructions,
    };
    if (ce.containerless) {
      result.containerless = true;
    }
    return result;
  }

  /**
   * Emit hydrate instruction for a custom attribute.
   */
  private emitHydrateAttribute(ca: PlanCustomAttr): SerializedHydrateAttribute {
    const instructions: SerializedInstruction[] = [];

    // Emit bindings
    for (const binding of ca.bindings) {
      instructions.push({
        type: INSTRUCTION_TYPE.propertyBinding,
        to: binding.to,
        exprId: binding.exprId,
        mode: toBindingModeValue(binding.mode),
      } satisfies SerializedPropertyBinding);
    }

    // Emit static props
    for (const prop of ca.staticProps) {
      instructions.push({
        type: INSTRUCTION_TYPE.setProperty,
        to: prop.name,
        value: prop.value,
      } satisfies SerializedSetProperty);
    }

    const result: SerializedHydrateAttribute = {
      type: INSTRUCTION_TYPE.hydrateAttribute,
      res: ca.resource,
      instructions,
    };
    if (ca.alias !== undefined) {
      result.alias = ca.alias;
    }
    return result;
  }

  /**
   * Emit hydrate instruction for a let element.
   */
  private emitHydrateLetElement(le: PlanLetElement): SerializedHydrateLetElement {
    const bindings: SerializedLetBinding[] = le.bindings.map(b => ({
      to: b.to,
      exprId: b.exprId,
    }));

    return {
      type: INSTRUCTION_TYPE.hydrateLetElement,
      bindings,
      toBindingContext: le.toBindingContext,
    };
  }

  /**
   * Get or create instruction row for a target index.
   */
  private getOrCreateRow(
    instructions: SerializedInstruction[][],
    targetIndex: number,
  ): SerializedInstruction[] {
    while (instructions.length <= targetIndex) {
      instructions.push([]);
    }
    return instructions[targetIndex]!;
  }
}

/* =============================================================================
 * Helper Functions
 * ============================================================================= */

/**
 * Convert a string BindingMode to a numeric BindingModeValue.
 */
function toBindingModeValue(mode: BindingMode): BindingModeValue {
  switch (mode) {
    case "default": return BINDING_MODE.default;
    case "oneTime": return BINDING_MODE.oneTime;
    case "toView": return BINDING_MODE.toView;
    case "fromView": return BINDING_MODE.fromView;
    case "twoWay": return BINDING_MODE.twoWay;
  }
}

/**
 * Get the main template from a controller.
 * Config-driven: controllers with child branches don't have a single main template.
 */
function getControllerMainTemplate(ctrl: PlanController): PlanNode | undefined {
  // Controllers with child branches (switch, promise) don't have a single main template
  // Their branches are processed separately
  if (ctrl.config.branches?.relationship === "child" && ctrl.branches && ctrl.branches.length > 0) {
    return undefined;
  }
  return ctrl.template;
}

/**
 * Compact a sparse instruction array by removing empty rows.
 *
 * The plan stage assigns global target indices, but nested templates need
 * local indices starting from 0. This function compacts the array by removing
 * empty rows, effectively converting global indices to local indices.
 *
 * @returns The compacted instruction array with sequential indices
 */
function compactInstructions(
  instructions: SerializedInstruction[][],
): SerializedInstruction[][] {
  // Filter out empty rows
  return instructions.filter(row => row.length > 0);
}

/* =============================================================================
 * Instruction Reordering
 * -----------------------------------------------------------------------------
 * Aurelia requires certain bindings to be processed in a specific order:
 *
 * INPUT (checkbox/radio):
 *   - model/value/matcher must come BEFORE checked
 *   - Reason: CheckedObserver needs these set first to determine comparison strategy
 *
 * SELECT:
 *   - multiple must come BEFORE value
 *   - Reason: SelectValueObserver behavior depends on multiple being set first
 *
 * This matches the runtime's _shouldReorderAttrs() and _reorder() methods in
 * template-compiler.ts
 * ============================================================================= */

/** Input types that require instruction reordering */
const ORDER_SENSITIVE_INPUT_TYPES: Record<string, boolean> = {
  checkbox: true,
  radio: true,
};

/**
 * Check if an element needs instruction reordering.
 */
function shouldReorderInstructions(
  node: PlanElementNode,
  instructions: SerializedInstruction[],
): boolean {
  const tag = node.tag.toUpperCase();

  if (tag === "INPUT") {
    // Check if type is checkbox or radio
    const typeAttr = node.staticAttrs.find(a => a.name.toLowerCase() === "type");
    const inputType = typeAttr?.value?.toLowerCase() ?? "";
    return ORDER_SENSITIVE_INPUT_TYPES[inputType] === true;
  }

  if (tag === "SELECT") {
    // Check if element has static multiple attribute OR a multiple binding
    const hasStaticMultiple = node.staticAttrs.some(
      a => a.name.toLowerCase() === "multiple"
    );
    if (hasStaticMultiple) return true;

    // Check for multiple binding in instructions
    return instructions.some(
      i => i.type === INSTRUCTION_TYPE.propertyBinding && i.to === "multiple"
    );
  }

  return false;
}

/**
 * Reorder instructions for runtime correctness.
 * Mutates the array in place.
 */
function reorderInstructions(
  node: PlanElementNode,
  instructions: SerializedInstruction[],
): void {
  const tag = node.tag.toUpperCase();

  if (tag === "INPUT") {
    reorderInputInstructions(instructions);
  } else if (tag === "SELECT") {
    reorderSelectInstructions(instructions);
  }
}

/**
 * Reorder INPUT checkbox/radio instructions.
 * Ensures model/value/matcher comes before checked.
 */
function reorderInputInstructions(instructions: SerializedInstruction[]): void {
  let modelOrValueOrMatcherIndex: number | undefined;
  let checkedIndex: number | undefined;
  let found = 0;

  // Find indices of relevant bindings (stop early once both found)
  for (let i = 0; i < instructions.length && found < 2; i++) {
    const inst = instructions[i];
    if (inst?.type !== INSTRUCTION_TYPE.propertyBinding) continue;

    const to = inst.to;
    if (to === "model" || to === "value" || to === "matcher") {
      modelOrValueOrMatcherIndex = i;
      found++;
    } else if (to === "checked") {
      checkedIndex = i;
      found++;
    }
  }

  // Swap if checked comes before model/value/matcher
  if (
    checkedIndex !== undefined &&
    modelOrValueOrMatcherIndex !== undefined &&
    checkedIndex < modelOrValueOrMatcherIndex
  ) {
    const temp = instructions[modelOrValueOrMatcherIndex];
    instructions[modelOrValueOrMatcherIndex] = instructions[checkedIndex]!;
    instructions[checkedIndex] = temp!;
  }
}

/**
 * Reorder SELECT instructions.
 * Ensures multiple comes before value.
 */
function reorderSelectInstructions(instructions: SerializedInstruction[]): void {
  let multipleIndex: number | undefined;
  let valueIndex: number | undefined;
  let found = 0;

  // Find indices of relevant bindings
  for (let i = 0; i < instructions.length && found < 2; i++) {
    const inst = instructions[i];
    if (inst?.type !== INSTRUCTION_TYPE.propertyBinding) continue;

    if (inst.to === "multiple") {
      multipleIndex = i;
      found++;
    } else if (inst.to === "value") {
      valueIndex = i;
      found++;
    }
  }

  // Swap if value comes before multiple
  if (
    valueIndex !== undefined &&
    multipleIndex !== undefined &&
    valueIndex < multipleIndex
  ) {
    const temp = instructions[multipleIndex];
    instructions[multipleIndex] = instructions[valueIndex]!;
    instructions[valueIndex] = temp!;
  }
}

/* =============================================================================
 * AST Cleanup
 * -----------------------------------------------------------------------------
 * Utilities for reducing AST size by removing fields not needed at runtime.
 * ============================================================================= */

/**
 * Strip `span` fields from an AST to reduce serialized size.
 *
 * Source location spans are useful for diagnostics and source mapping during
 * compilation, but are not needed by the runtime for expression evaluation.
 * Stripping them can significantly reduce bundle size.
 */
function stripSpansFromAst<T>(ast: T): T {
  if (ast === null || ast === undefined) {
    return ast;
  }

  if (Array.isArray(ast)) {
    return ast.map(stripSpansFromAst) as T;
  }

  if (typeof ast !== "object") {
    return ast;
  }

  const result: Record<string, unknown> = {};
  for (const key in ast) {
    if (key === "span") {
      // Skip span fields
      continue;
    }
    const value = (ast as Record<string, unknown>)[key];
    result[key] = stripSpansFromAst(value);
  }
  return result as T;
}

/* =============================================================================
 * Expression Deduplication
 * -----------------------------------------------------------------------------
 * Identifies and eliminates duplicate expressions by content hashing.
 * ============================================================================= */

/**
 * Deduplicate expressions by content, returning unique expressions and a remap table.
 */
function deduplicateExpressionTable(
  expressions: SerializedExpression[],
  alreadyStripped: boolean,
): { dedupedExpressions: SerializedExpression[]; exprIdRemap: Map<ExprId, ExprId> } {
  const hashToCanonical = new Map<string, SerializedExpression>();
  const exprIdRemap = new Map<ExprId, ExprId>();
  const dedupedExpressions: SerializedExpression[] = [];

  for (const expr of expressions) {
    // Hash the AST (stripping spans if not already done)
    const astForHash = alreadyStripped ? expr.ast : stripSpansFromAst(expr.ast);
    const hash = hashAst(astForHash);

    const existing = hashToCanonical.get(hash);
    if (existing) {
      // Duplicate found - map this ExprId to the canonical one
      exprIdRemap.set(expr.id, existing.id);
    } else {
      // New unique expression - becomes the canonical version
      hashToCanonical.set(hash, expr);
      dedupedExpressions.push(expr);
    }
  }

  return { dedupedExpressions, exprIdRemap };
}

/**
 * Create a stable hash of an AST for deduplication.
 * Uses JSON.stringify with sorted keys for deterministic output.
 */
function hashAst(ast: unknown): string {
  return JSON.stringify(ast, sortedReplacer);
}

/**
 * JSON replacer that sorts object keys for deterministic hashing.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = (value as Record<string, unknown>)[key];
        return sorted;
      }, {});
  }
  return value;
}

/**
 * Remap ExprIds in a serialized definition tree.
 */
function remapDefinitionExprIds(
  definition: SerializedDefinition,
  remap: Map<ExprId, ExprId>,
): SerializedDefinition {
  return {
    ...definition,
    instructions: definition.instructions.map(row =>
      row.map(inst => remapInstructionExprIds(inst, remap))
    ),
    nestedTemplates: definition.nestedTemplates.map(nested =>
      remapDefinitionExprIds(nested, remap)
    ),
  };
}

/**
 * Remap ExprIds in a single instruction.
 */
function remapInstructionExprIds(
  inst: SerializedInstruction,
  remap: Map<ExprId, ExprId>,
): SerializedInstruction {
  const remapId = (id: ExprId): ExprId => remap.get(id) ?? id;

  switch (inst.type) {
    case INSTRUCTION_TYPE.propertyBinding:
      return { ...inst, exprId: remapId(inst.exprId) };

    case INSTRUCTION_TYPE.interpolation:
      return { ...inst, exprIds: inst.exprIds.map(remapId) };

    case INSTRUCTION_TYPE.textBinding:
      return { ...inst, exprIds: inst.exprIds.map(remapId) };

    case INSTRUCTION_TYPE.listenerBinding:
      return { ...inst, exprId: remapId(inst.exprId) };

    case INSTRUCTION_TYPE.iteratorBinding:
      return {
        ...inst,
        exprId: remapId(inst.exprId),
        aux: inst.aux?.map(a => ({ ...a, exprId: remapId(a.exprId) })),
      };

    case INSTRUCTION_TYPE.refBinding:
      return { ...inst, exprId: remapId(inst.exprId) };

    case INSTRUCTION_TYPE.hydrateElement:
      return {
        ...inst,
        instructions: inst.instructions.map(i => remapInstructionExprIds(i, remap)),
      };

    case INSTRUCTION_TYPE.hydrateAttribute:
      return {
        ...inst,
        instructions: inst.instructions.map(i => remapInstructionExprIds(i, remap)),
      };

    case INSTRUCTION_TYPE.hydrateTemplateController:
      return {
        ...inst,
        instructions: inst.instructions.map(i => remapInstructionExprIds(i, remap)),
      };

    case INSTRUCTION_TYPE.hydrateLetElement:
      return {
        ...inst,
        bindings: inst.bindings.map(b => ({ ...b, exprId: remapId(b.exprId) })),
      };

    case INSTRUCTION_TYPE.setProperty:
    case INSTRUCTION_TYPE.setAttribute:
      // These don't have ExprIds
      return inst;

    default:
      return inst;
  }
}

/* =============================================================================
 * Meta Element Emission
 * -----------------------------------------------------------------------------
 * Converts TemplateMetaIR to SerializedDefinition properties.
 * ============================================================================= */

/**
 * Emit meta element properties into the serialized definition.
 * Mutates the result in place.
 */
function emitMetaProperties(result: SerializedDefinition, meta: TemplateMetaIR): void {
  // Shadow DOM options
  if (meta.shadowDom) {
    result.shadowOptions = { mode: meta.shadowDom.mode.value };
  }

  // Containerless
  if (meta.containerless) {
    result.containerless = true;
  }

  // Capture (custom attributes only)
  if (meta.capture) {
    result.capture = true;
  }

  // Aliases
  if (meta.aliases.length > 0) {
    const aliasNames: string[] = [];
    for (const alias of meta.aliases) {
      for (const name of alias.names) {
        aliasNames.push(name.value);
      }
    }
    if (aliasNames.length > 0) {
      result.aliases = aliasNames;
    }
  }

  // Bindables
  if (meta.bindables.length > 0) {
    const bindables: SerializedBindable[] = meta.bindables.map(b => {
      const serialized: SerializedBindable = { name: b.name.value };
      if (b.mode) {
        serialized.mode = b.mode.value;
      }
      if (b.attribute) {
        serialized.attribute = b.attribute.value;
      }
      return serialized;
    });
    result.bindables = bindables;
  }

  // hasSlot
  if (meta.hasSlot) {
    result.hasSlot = true;
  }
}
