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
import type { ExprId } from "../../model/index.js";

/* =============================================================================
 * Public API
 * ============================================================================= */

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
}

/**
 * Emit serialized instructions from an AotPlanModule.
 */
export function emitAotCode(
  plan: AotPlanModule,
  options: AotEmitOptions = {},
): AotCodeResult {
  const ctx = new EmitContext(plan, options);
  let definition = ctx.emitDefinition(plan.root, options.name ?? "template");
  let expressions = ctx.getExpressions();

  // Apply expression deduplication if requested
  if (options.deduplicateExpressions) {
    const { dedupedExpressions, exprIdRemap } = deduplicateExpressionTable(
      expressions,
      options.stripSpans ?? false,
    );

    // Remap ExprIds in the definition
    if (exprIdRemap.size > 0) {
      definition = remapDefinitionExprIds(definition, exprIdRemap);
    }

    expressions = dedupedExpressions;
  }

  return {
    definition,
    expressions,
    mapping: ctx.getMapping(),
  };
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
  emitDefinition(root: PlanNode, name: string): SerializedDefinition {
    const instructions: SerializedInstruction[][] = [];
    const nestedTemplates: SerializedDefinition[] = [];

    // Walk the tree and collect instructions by target index
    this.emitNode(root, instructions, nestedTemplates);

    return {
      name,
      instructions,
      nestedTemplates,
      targetCount: instructions.length,
    };
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
        type: "textBinding",
        parts: node.interpolation.parts,
        exprIds: node.interpolation.exprIds,
      } satisfies SerializedTextBinding);
    }
  }

  /**
   * Emit a template controller.
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
    const templateName = `${ctrl.kind}_${this.nestedTemplateIndex++}`;

    // Build nested definition from the controller's template
    const nestedDef = this.emitControllerTemplate(ctrl, hostNode, templateName);
    nestedTemplates.push(nestedDef);

    // Create the hydrate instruction for this controller
    const hydrateCtrl: SerializedHydrateTemplateController = {
      type: "hydrateTemplateController",
      resource: ctrl.kind,
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

    // Handle controller-specific nested templates (else, cases, etc.)
    this.emitControllerBranches(ctrl, innerNested);

    // Special handling for switch: emit case/default-case as instructions
    if (ctrl.kind === "switch") {
      for (let i = 0; i < ctrl.cases.length; i++) {
        const caseBranch = ctrl.cases[i]!;
        // Each case gets a row with its hydrateTemplateController instruction
        const row: SerializedInstruction[] = [];
        const caseInstruction: SerializedHydrateTemplateController = {
          type: "hydrateTemplateController",
          resource: caseBranch.kind,
          templateIndex: i, // Index into innerNested
          instructions: this.emitControllerBindings(caseBranch),
        };
        row.push(caseInstruction);
        innerInstructions.push(row);
      }
    }

    // Special handling for promise: emit pending/then/catch as instructions
    // Each branch is a separate controller with its own template
    if (ctrl.kind === "promise") {
      let branchIndex = 0;
      if (ctrl.pendingTemplate) {
        const row: SerializedInstruction[] = [];
        row.push({
          type: "hydrateTemplateController",
          resource: "pending",
          templateIndex: branchIndex++,
          instructions: [], // pending has no bindings
        } satisfies SerializedHydrateTemplateController);
        innerInstructions.push(row);
      }
      if (ctrl.thenTemplate) {
        const row: SerializedInstruction[] = [];
        row.push({
          type: "hydrateTemplateController",
          resource: "then",
          templateIndex: branchIndex++,
          instructions: [], // local variable is handled by the TC, not via binding
        } satisfies SerializedHydrateTemplateController);
        innerInstructions.push(row);
      }
      if (ctrl.catchTemplate) {
        const row: SerializedInstruction[] = [];
        row.push({
          type: "hydrateTemplateController",
          resource: "catch",
          templateIndex: branchIndex++,
          instructions: [], // local variable is handled by the TC, not via binding
        } satisfies SerializedHydrateTemplateController);
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
   * Emit controller-specific branches (else, cases, then/catch, etc.).
   */
  private emitControllerBranches(
    ctrl: PlanController,
    nestedTemplates: SerializedDefinition[],
  ): void {
    switch (ctrl.kind) {
      case "if":
      case "else":
      case "case":
      case "default-case":
        // These are separate controllers, no additional branches to emit here
        // Their templates are handled by the main template emit
        break;
      case "switch":
        for (const caseBranch of ctrl.cases ?? []) {
          if (caseBranch.template) {
            const prefix = caseBranch.kind === "case" ? "case" : "default";
            const branchIndex = this.nestedTemplateIndex++;
            nestedTemplates.push(
              this.emitDefinition(caseBranch.template, `${prefix}_${branchIndex}`),
            );
          }
        }
        break;
      case "promise":
        if (ctrl.pendingTemplate) {
          const pendingIndex = this.nestedTemplateIndex++;
          nestedTemplates.push(
            this.emitDefinition(ctrl.pendingTemplate, `pending_${pendingIndex}`),
          );
        }
        if (ctrl.thenTemplate) {
          const thenIndex = this.nestedTemplateIndex++;
          nestedTemplates.push(
            this.emitDefinition(ctrl.thenTemplate, `then_${thenIndex}`),
          );
        }
        if (ctrl.catchTemplate) {
          const catchIndex = this.nestedTemplateIndex++;
          nestedTemplates.push(
            this.emitDefinition(ctrl.catchTemplate, `catch_${catchIndex}`),
          );
        }
        break;
    }
  }

  /**
   * Emit bindings for a controller (its own bindable properties).
   */
  private emitControllerBindings(ctrl: PlanController): SerializedInstruction[] {
    const result: SerializedInstruction[] = [];

    switch (ctrl.kind) {
      case "repeat": {
        // repeat uses an iteratorBinding with ForOfStatement
        if (ctrl.iteratorExprId) {
          const iteratorBinding: SerializedIteratorBinding = {
            type: "iteratorBinding",
            to: "items",
            exprId: ctrl.iteratorExprId,
          };
          // Include key expression for efficient diffing
          if (ctrl.keyExprId) {
            iteratorBinding.aux = [{ name: "key", exprId: ctrl.keyExprId }];
          }
          result.push(iteratorBinding);
        }
        break;
      }
      case "if":
        if (ctrl.conditionExprId) {
          result.push({
            type: "propertyBinding",
            to: "value",
            exprId: ctrl.conditionExprId,
            mode: "toView",
          } satisfies SerializedPropertyBinding);
        }
        break;
      case "with":
        if (ctrl.valueExprId) {
          result.push({
            type: "propertyBinding",
            to: "value",
            exprId: ctrl.valueExprId,
            mode: "toView",
          } satisfies SerializedPropertyBinding);
        }
        break;
      case "switch":
        if (ctrl.valueExprId) {
          result.push({
            type: "propertyBinding",
            to: "value",
            exprId: ctrl.valueExprId,
            mode: "toView",
          } satisfies SerializedPropertyBinding);
        }
        break;
      case "promise":
        if (ctrl.valueExprId) {
          result.push({
            type: "propertyBinding",
            to: "value",
            exprId: ctrl.valueExprId,
            mode: "toView",
          } satisfies SerializedPropertyBinding);
        }
        break;
      case "portal":
        if (ctrl.targetExprId) {
          result.push({
            type: "propertyBinding",
            to: "target",
            exprId: ctrl.targetExprId,
            mode: "toView",
          } satisfies SerializedPropertyBinding);
        }
        break;
      case "else":
        // else has no bindings - it links to preceding if at runtime via Else.link()
        break;
      case "case":
        // case has a value binding for the case expression
        if (ctrl.valueExprId) {
          result.push({
            type: "propertyBinding",
            to: "value",
            exprId: ctrl.valueExprId,
            mode: "toView",
          } satisfies SerializedPropertyBinding);
        }
        break;
      case "default-case":
        // default-case has no bindings - it links to switch at runtime via DefaultCase.link()
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
          type: "propertyBinding",
          to: binding.to,
          exprId: binding.exprId,
          mode: binding.mode,
        } satisfies SerializedPropertyBinding;

      case "attributeBinding":
        return {
          type: "propertyBinding",
          to: binding.to,
          exprId: binding.exprId,
          mode: "toView",
        } satisfies SerializedPropertyBinding;

      case "attributeInterpolation":
        return {
          type: "interpolation",
          to: binding.to,
          parts: binding.parts,
          exprIds: binding.exprIds,
        } satisfies SerializedInterpolation;

      case "styleBinding":
        return {
          type: "propertyBinding",
          to: `style.${binding.property}`,
          exprId: binding.exprId,
          mode: "toView",
        } satisfies SerializedPropertyBinding;

      case "listenerBinding": {
        const listener: SerializedListenerBinding = {
          type: "listenerBinding",
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
          type: "refBinding",
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
        type: "propertyBinding",
        to: binding.to,
        exprId: binding.exprId,
        mode: binding.mode,
      } satisfies SerializedPropertyBinding);
    }

    // Emit static props
    for (const prop of ce.staticProps) {
      instructions.push({
        type: "setProperty",
        to: prop.name,
        value: prop.value,
      } satisfies SerializedSetProperty);
    }

    const result: SerializedHydrateElement = {
      type: "hydrateElement",
      resource: ce.resource,
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
        type: "propertyBinding",
        to: binding.to,
        exprId: binding.exprId,
        mode: binding.mode,
      } satisfies SerializedPropertyBinding);
    }

    // Emit static props
    for (const prop of ca.staticProps) {
      instructions.push({
        type: "setProperty",
        to: prop.name,
        value: prop.value,
      } satisfies SerializedSetProperty);
    }

    const result: SerializedHydrateAttribute = {
      type: "hydrateAttribute",
      resource: ca.resource,
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
      type: "hydrateLetElement",
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
 * Get the main template from a controller.
 * Different controller types have different template properties.
 */
function getControllerMainTemplate(ctrl: PlanController): PlanNode | undefined {
  switch (ctrl.kind) {
    case "repeat":
    case "with":
    case "portal":
    case "if":
    case "else":
    case "case":
    case "default-case":
      return ctrl.template;
    case "switch":
      // Switch doesn't have a single main template - cases are child controllers
      return undefined;
    case "promise":
      // Promise doesn't have a single main template - branches are child controllers
      return undefined;
  }
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
      i => i.type === "propertyBinding" && i.to === "multiple"
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
    if (inst?.type !== "propertyBinding") continue;

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
    if (inst?.type !== "propertyBinding") continue;

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
    case "propertyBinding":
      return { ...inst, exprId: remapId(inst.exprId) };

    case "interpolation":
      return { ...inst, exprIds: inst.exprIds.map(remapId) };

    case "textBinding":
      return { ...inst, exprIds: inst.exprIds.map(remapId) };

    case "listenerBinding":
      return { ...inst, exprId: remapId(inst.exprId) };

    case "iteratorBinding":
      return {
        ...inst,
        exprId: remapId(inst.exprId),
        aux: inst.aux?.map(a => ({ ...a, exprId: remapId(a.exprId) })),
      };

    case "refBinding":
      return { ...inst, exprId: remapId(inst.exprId) };

    case "hydrateElement":
      return {
        ...inst,
        instructions: inst.instructions.map(i => remapInstructionExprIds(i, remap)),
      };

    case "hydrateAttribute":
      return {
        ...inst,
        instructions: inst.instructions.map(i => remapInstructionExprIds(i, remap)),
      };

    case "hydrateTemplateController":
      return {
        ...inst,
        instructions: inst.instructions.map(i => remapInstructionExprIds(i, remap)),
      };

    case "hydrateLetElement":
      return {
        ...inst,
        bindings: inst.bindings.map(b => ({ ...b, exprId: remapId(b.exprId) })),
      };

    case "setProperty":
    case "setAttribute":
      // These don't have ExprIds
      return inst;

    default:
      return inst;
  }
}
