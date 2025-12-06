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

/* =============================================================================
 * Public API
 * ============================================================================= */

export interface AotEmitOptions {
  /** Template name (for the definition) */
  name?: string;
}

/**
 * Emit serialized instructions from an AotPlanModule.
 */
export function emitAotCode(
  plan: AotPlanModule,
  options: AotEmitOptions = {},
): AotCodeResult {
  const ctx = new EmitContext(plan, options);
  const definition = ctx.emitDefinition(plan.root, options.name ?? "template");

  return {
    definition,
    expressions: ctx.getExpressions(),
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
      ast: e.ast,
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
        // if and else are separate controllers, no additional branches to emit here
        // else controller just has its own template which is handled by the main template emit
        break;
      case "switch":
        for (const caseBranch of ctrl.cases ?? []) {
          if (caseBranch.template) {
            const caseIndex = this.nestedTemplateIndex++;
            nestedTemplates.push(
              this.emitDefinition(caseBranch.template, `case_${caseIndex}`),
            );
          }
        }
        if (ctrl.defaultTemplate) {
          const defaultIndex = this.nestedTemplateIndex++;
          nestedTemplates.push(
            this.emitDefinition(ctrl.defaultTemplate, `default_${defaultIndex}`),
          );
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
      case "repeat":
        // repeat uses an iteratorBinding with ForOfStatement
        if (ctrl.iteratorExprId) {
          result.push({
            type: "iteratorBinding",
            to: "items",
            exprId: ctrl.iteratorExprId,
          } satisfies SerializedIteratorBinding);
        }
        break;
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
      return ctrl.template;
    case "switch":
      // Switch doesn't have a single main template
      return undefined;
    case "promise":
      // Promise uses thenTemplate as the main template
      return ctrl.thenTemplate;
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
