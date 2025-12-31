/* =============================================================================
 * AOT PLAN - Transform analysis output to AotPlanModule
 * -----------------------------------------------------------------------------
 * Consumes: LinkedSemanticsModule (20-resolve), ScopeModule (30-bind)
 * Produces: AotPlanModule (abstract instruction graph)
 *
 * Key responsibilities:
 * - Walk linked template structure and build PlanNodes
 * - Assign hydration target indices to elements with bindings/controllers
 * - Collect expressions into expression table with frame mappings
 * - Transform scope frames into PlanScopes with locals and override context
 * - Handle template controllers and their nested templates
 * ============================================================================= */

import type {
  BindingSourceIR,
  CommentNode,
  DOMNode,
  ElementNode,
  ExprId,
  ExprTableEntry,
  FrameId,
  NodeId,
  SourceSpan,
  TemplateNode,
  TextNode,
} from "../../model/index.js";

import type { ScopeModule, ScopeTemplate, ScopeFrame, ScopeSymbol } from "../../model/symbols.js";
import type { ReadonlyExprIdMap } from "../../model/identity.js";

import type {
  LinkedSemanticsModule,
  LinkedTemplate,
  LinkedInstruction,
  LinkedPropertyBinding,
  LinkedAttributeBinding,
  LinkedStylePropertyBinding,
  LinkedListenerBinding,
  LinkedRefBinding,
  LinkedTextBinding,
  LinkedHydrateElement,
  LinkedHydrateAttribute,
  LinkedHydrateTemplateController,
  LinkedHydrateLetElement,
  LinkedIteratorBinding,
} from "../../analysis/index.js";

import { indexExprTable, collectBindingNames } from "../../shared/expr-utils.js";
import { NOOP_TRACE, CompilerAttributes } from "../../shared/index.js";
import { debug } from "../../shared/debug.js";

import type {
  AotPlanModule,
  AotPlanOptions,
  PlanNode,
  PlanElementNode,
  PlanTextNode,
  PlanCommentNode,
  PlanFragmentNode,
  PlanBinding,
  PlanPropertyBinding,
  PlanAttributeBinding,
  PlanAttributeInterpolation,
  PlanStyleBinding,
  PlanListenerBinding,
  PlanRefBinding,
  PlanTextInterpolation,
  PlanStaticAttr,
  PlanCustomElement,
  PlanCustomAttr,
  PlanStaticProp,
  PlanLetElement,
  PlanLetBinding,
  PlanController,
  PlanAuxExpr,
  PlanExpression,
  PlanScope,
  PlanScopeKind,
  PlanLocal,
  PlanLocalSource,
} from "./types.js";

/* =============================================================================
 * Public API
 * ============================================================================= */

/**
 * Build an AotPlanModule from linked semantics and scope analysis.
 */
export function planAot(
  linked: LinkedSemanticsModule,
  scope: ScopeModule,
  options: AotPlanOptions,
): AotPlanModule {
  const trace = options.trace ?? NOOP_TRACE;

  return trace.span("aot.plan", () => {
    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: options.templateFilePath,
      "aot.plan.templateCount": linked.templates.length,
    });

    const ctx = new PlanningContext(linked, scope, options);

    // Only process the root template (nested templates are handled via controllers)
    const rootTemplate = linked.templates[0];
    const rootScopeTemplate = scope.templates[0];

    if (!rootTemplate || !rootScopeTemplate) {
      // Empty template
      debug.aot("plan.empty", { path: options.templateFilePath });
      trace.event("aot.plan.empty");
      return {
        version: "aurelia-aot-plan@1",
        root: createEmptyFragment(),
        expressions: [],
        scopes: [],
        targetCount: 0,
        name: options.templateFilePath,
      };
    }

    debug.aot("plan.start", {
      path: options.templateFilePath,
      templateCount: linked.templates.length,
    });

    // Build scope entries from ScopeModule
    trace.event("aot.plan.buildScopes");
    const scopes = buildPlanScopes(rootScopeTemplate, ctx);

    // Transform root template
    trace.event("aot.plan.transformTemplate");
    const root = transformTemplate(rootTemplate, rootScopeTemplate, ctx);

    const expressions = ctx.getExpressions();

    trace.setAttributes({
      [CompilerAttributes.EXPR_COUNT]: expressions.length,
      "aot.plan.scopeCount": scopes.length,
      "aot.plan.targetCount": ctx.targetCount,
    });

    return {
      version: "aurelia-aot-plan@1",
      root,
      expressions,
      scopes,
      targetCount: ctx.targetCount,
      name: rootTemplate.name ?? options.templateFilePath,
    };
  });
}

/* =============================================================================
 * Planning Context
 * ============================================================================= */

class PlanningContext {
  readonly linked: LinkedSemanticsModule;
  readonly scope: ScopeModule;
  readonly options: AotPlanOptions;

  /** Expression index for AST lookups */
  readonly exprIndex: ReadonlyExprIdMap<ExprTableEntry>;

  /** Map from DOM node to linked template (for nested template lookup) */
  private readonly domToLinked: WeakMap<TemplateNode, LinkedTemplate>;

  /** Collected expressions */
  private readonly expressions: Map<ExprId, PlanExpression> = new Map();

  /** Expression to frame mapping from scope analysis */
  readonly exprToFrame: ReadonlyExprIdMap<FrameId>;

  /**
   * Stack of target counters - each template (root and nested) has its own counter.
   * This ensures nested templates use LOCAL indices starting from 0, not global indices.
   */
  private targetCounterStack: number[] = [0];

  constructor(
    linked: LinkedSemanticsModule,
    scope: ScopeModule,
    options: AotPlanOptions,
  ) {
    this.linked = linked;
    this.scope = scope;
    this.options = options;
    this.exprIndex = indexExprTable(linked.exprTable);

    // Build map from DOM node to linked template for nested template lookup
    // All templates (root + nested) are in linked.templates with their DOM nodes
    this.domToLinked = new WeakMap();
    for (const t of linked.templates) {
      this.domToLinked.set(t.dom, t);
    }

    // Get exprToFrame from root scope template
    const rootScope = scope.templates[0];
    this.exprToFrame = rootScope?.exprToFrame ?? new Map();
  }

  /** Look up the LinkedTemplate for a given DOM node (used for nested templates) */
  getLinkedTemplate(dom: TemplateNode): LinkedTemplate | undefined {
    // Try WeakMap lookup first (fast path)
    let result = this.domToLinked.get(dom);
    if (!result) {
      // Fallback to linear search by object identity
      // This handles cases where elseDef.dom references might not be in the WeakMap
      result = this.linked.templates.find(t => t.dom === dom);
    }
    // DEBUG: Log when template is not found
    if (!result) {
      console.log("[DEBUG getLinkedTemplate] NOT FOUND for dom.id:", dom.id);
      console.log("[DEBUG getLinkedTemplate] linked.templates count:", this.linked.templates.length);
      console.log("[DEBUG getLinkedTemplate] linked.templates ids:", this.linked.templates.map(t => t.dom.id));
    }
    return result;
  }

  /** Allocate a hydration target index (local to current template scope) */
  allocateTarget(): number {
    const stackIndex = this.targetCounterStack.length - 1;
    const index = this.targetCounterStack[stackIndex]!;
    this.targetCounterStack[stackIndex] = index + 1;
    return index;
  }

  /** Get current target count (for current template scope) */
  get targetCount(): number {
    return this.targetCounterStack[this.targetCounterStack.length - 1]!;
  }

  /** Push a new target scope when entering a nested template */
  pushTargetScope(): void {
    this.targetCounterStack.push(0);
  }

  /** Pop target scope when leaving a nested template, returns its target count */
  popTargetScope(): number {
    return this.targetCounterStack.pop() ?? 0;
  }

  /** Register an expression in the plan */
  registerExpression(exprId: ExprId, span?: SourceSpan): void {
    if (this.expressions.has(exprId)) return;

    const entry = this.exprIndex.get(exprId);
    if (!entry) return;

    const frameId = this.exprToFrame.get(exprId) ?? (0 as FrameId);

    this.expressions.set(exprId, {
      id: exprId,
      ast: entry.ast,
      frameId,
      span,
    });
  }

  /** Get all collected expressions */
  getExpressions(): PlanExpression[] {
    return Array.from(this.expressions.values());
  }
}

/* =============================================================================
 * Scope Building
 * ============================================================================= */

function buildPlanScopes(scopeTemplate: ScopeTemplate, ctx: PlanningContext): PlanScope[] {
  const scopes: PlanScope[] = [];

  for (const frame of scopeTemplate.frames) {
    scopes.push(buildPlanScope(frame, ctx));
  }

  return scopes;
}

function buildPlanScope(frame: ScopeFrame, ctx: PlanningContext): PlanScope {
  const locals: PlanLocal[] = [];
  const overrideContext: string[] = [];

  for (const sym of frame.symbols) {
    const local = symbolToLocal(sym, frame, ctx);
    if (local.source === "contextual") {
      overrideContext.push(local.name);
    } else {
      locals.push(local);
    }
  }

  return {
    frameId: frame.id,
    parentFrameId: frame.parent,
    kind: frameToPlanKind(frame),
    locals,
    overrideContext,
  };
}

function symbolToLocal(sym: ScopeSymbol, frame: ScopeFrame, ctx: PlanningContext): PlanLocal {
  const base: PlanLocal = { name: sym.name, source: symbolKindToSource(sym.kind) };

  // For let bindings, include the value expression
  if (sym.kind === "let" && frame.letValueExprs) {
    const exprId = frame.letValueExprs[sym.name];
    if (exprId !== undefined) {
      base.exprId = exprId;
      ctx.registerExpression(exprId, sym.span ?? undefined);
    }
  }

  return base;
}

function symbolKindToSource(kind: ScopeSymbol["kind"]): PlanLocalSource {
  switch (kind) {
    case "let": return "let";
    case "iteratorLocal": return "iterator";
    case "contextual": return "contextual";
    case "alias": return "alias";
  }
}

function frameToPlanKind(frame: ScopeFrame): PlanScopeKind {
  if (frame.kind === "root") return "root";

  // Determine kind from origin if available (pattern-based, not controller-specific)
  const origin = frame.origin;
  if (!origin) return "root";

  switch (origin.kind) {
    case "iterator": return "repeat";      // Iterator pattern → repeat-like scope
    case "valueOverlay": return "with";    // Value overlay pattern → with-like scope
    case "promiseValue": return "promise"; // Promise value pattern → promise-like scope
    case "promiseBranch": return "promise"; // Promise branch also uses promise scope kind
    default: return "root";
  }
}

/* =============================================================================
 * Template Transformation
 * ============================================================================= */

function transformTemplate(
  linked: LinkedTemplate,
  scopeTemplate: ScopeTemplate,
  ctx: PlanningContext,
): PlanNode {
  // Build instruction map for quick lookup by target NodeId
  const instructionsByTarget = new Map<NodeId, LinkedInstruction[]>();
  for (const row of linked.rows) {
    instructionsByTarget.set(row.target, row.instructions);
  }

  // Transform the root DOM node
  return transformNode(linked.dom, instructionsByTarget, scopeTemplate.root, ctx);
}

function transformNode(
  node: DOMNode,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  currentFrame: FrameId,
  ctx: PlanningContext,
): PlanNode {
  const instructions = instructionsByTarget.get(node.id) ?? [];

  switch (node.kind) {
    case "element":
      return transformElement(node, instructions, instructionsByTarget, currentFrame, ctx);
    case "template":
      // If the template node has instructions (e.g., template controllers like if/else),
      // treat it as an element with tag "template" rather than a transparent fragment
      if (instructions.length > 0) {
        return transformTemplateAsElement(node, instructions, instructionsByTarget, currentFrame, ctx);
      }
      return transformFragment(node, instructionsByTarget, currentFrame, ctx);
    case "text":
      return transformText(node, instructions, ctx);
    case "comment":
      return transformComment(node, ctx);
  }
}

function transformElement(
  node: ElementNode,
  instructions: LinkedInstruction[],
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  currentFrame: FrameId,
  ctx: PlanningContext,
): PlanElementNode {
  const bindings: PlanBinding[] = [];
  const staticAttrs: PlanStaticAttr[] = [];
  const controllers: PlanController[] = [];
  const customAttrs: PlanCustomAttr[] = [];
  let customElement: PlanCustomElement | undefined;
  let letElement: PlanLetElement | undefined;

  // Determine if this node needs a target index
  let needsTarget = false;

  // Process instructions
  for (const ins of instructions) {
    switch (ins.kind) {
      case "propertyBinding":
        bindings.push(transformPropertyBinding(ins, ctx));
        needsTarget = true;
        break;

      case "attributeBinding":
        bindings.push(transformAttributeBinding(ins, ctx));
        needsTarget = true;
        break;

      case "stylePropertyBinding":
        bindings.push(transformStyleBinding(ins, ctx));
        needsTarget = true;
        break;

      case "listenerBinding":
        bindings.push(transformListenerBinding(ins, ctx));
        needsTarget = true;
        break;

      case "refBinding":
        bindings.push(transformRefBinding(ins, ctx));
        needsTarget = true;
        break;

      case "setAttribute":
        staticAttrs.push({ name: ins.to, value: ins.value });
        break;

      case "setProperty":
        // Static property - will be handled in customElement if applicable
        break;

      case "setClassAttribute":
        staticAttrs.push({ name: "class", value: ins.value });
        break;

      case "setStyleAttribute":
        staticAttrs.push({ name: "style", value: ins.value });
        break;

      case "hydrateElement":
        customElement = transformHydrateElement(ins, ctx);
        needsTarget = true;
        break;

      case "hydrateAttribute":
        customAttrs.push(transformHydrateAttribute(ins, ctx));
        needsTarget = true;
        break;

      case "hydrateTemplateController":
        controllers.push(transformController(ins, instructionsByTarget, currentFrame, ctx));
        needsTarget = true;
        break;

      case "hydrateLetElement":
        letElement = transformLetElement(ins, ctx);
        needsTarget = true;
        break;

      case "textBinding":
      case "iteratorBinding":
        // These shouldn't appear on elements
        break;
    }
  }

  // Add static attrs from DOM node, but filter out binding attributes
  // Collect bound attribute names (interpolation bindings use these attributes)
  const boundAttrNames = new Set<string>();
  for (const binding of bindings) {
    if (binding.type === "attributeInterpolation") {
      boundAttrNames.add(binding.to);
    }
  }

  for (const attr of node.attrs) {
    // Skip attributes that are binding commands (e.g., 'if.bind', 'repeat.for', 'value.bind')
    if (isBindingAttribute(attr.name)) {
      continue;
    }
    // Skip attributes that have interpolation bindings - the binding's parts
    // contain any static portions and the runtime will construct the full value
    if (boundAttrNames.has(attr.name)) {
      continue;
    }
    // Check if we already have this attr from instructions
    if (!staticAttrs.some(a => a.name === attr.name)) {
      staticAttrs.push({ name: attr.name, value: attr.value });
    }
  }

  // Build the result node
  const result: PlanElementNode = {
    kind: "element",
    nodeId: node.id,
    tag: node.tag,
    staticAttrs,
    bindings,
    customAttrs,
    controllers,
    children: [], // filled below
  };

  // When element has template controllers, the element itself does NOT get a target
  // in the parent template. The controller markers are the targets in the parent.
  // The element's bindings, custom element, and custom attributes are handled
  // in the nested template (processed via transformNestedTemplate).
  if (controllers.length > 0) {
    // Clear bindings from parent element - they'll be in nested template
    result.bindings = [];
    result.customAttrs = [];
    // Don't set customElement or allocate target for element
    // Only controller has target in parent template
  } else {
    if (customElement) {
      result.customElement = customElement;
    }
    if (letElement) {
      result.letElement = letElement;
    }
    // IMPORTANT: Allocate element's targetIndex BEFORE processing children.
    // This ensures targetIndex values match document order (element before its children),
    // which matches the marker order in emit-template.ts.
    if (needsTarget) {
      result.targetIndex = ctx.allocateTarget();
    }
  }

  // Transform children - but NOT if the element has controllers.
  // When an element has template controllers, its children are part of the
  // nested template (ins.def) and will be processed via transformNestedTemplate.
  // Processing them here would cause duplication.
  if (controllers.length === 0) {
    result.children = node.children.map(child =>
      transformNode(child, instructionsByTarget, currentFrame, ctx)
    );
  }

  if (node.selfClosed) {
    result.selfClosing = true;
  }

  if (ctx.options.includeLocations && node.loc) {
    result.loc = node.loc;
  }

  return result;
}

function transformFragment(
  node: TemplateNode,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  currentFrame: FrameId,
  ctx: PlanningContext,
): PlanFragmentNode {
  const children = node.children.map(child =>
    transformNode(child, instructionsByTarget, currentFrame, ctx)
  );

  return {
    kind: "fragment",
    nodeId: node.id,
    children,
  };
}

/**
 * Transform a <template> element that has instructions (e.g., template controllers like if/else)
 * as an element node with tag "template".
 */
function transformTemplateAsElement(
  node: TemplateNode,
  instructions: LinkedInstruction[],
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  currentFrame: FrameId,
  ctx: PlanningContext,
): PlanElementNode {
  const bindings: PlanBinding[] = [];
  const staticAttrs: PlanStaticAttr[] = [];
  const controllers: PlanController[] = [];
  const customAttrs: PlanCustomAttr[] = [];

  // Process instructions - primarily template controllers for <template> elements
  for (const ins of instructions) {
    switch (ins.kind) {
      case "propertyBinding":
        bindings.push(transformPropertyBinding(ins, ctx));
        break;

      case "attributeBinding":
        bindings.push(transformAttributeBinding(ins, ctx));
        break;

      case "hydrateTemplateController":
        controllers.push(transformController(ins, instructionsByTarget, currentFrame, ctx));
        break;

      case "hydrateAttribute":
        customAttrs.push(transformHydrateAttribute(ins, ctx));
        break;

      case "setAttribute":
        staticAttrs.push({ name: ins.to, value: ins.value });
        break;

      case "setClassAttribute":
        staticAttrs.push({ name: "class", value: ins.value });
        break;

      case "setStyleAttribute":
        staticAttrs.push({ name: "style", value: ins.value });
        break;

      // Other instruction types are uncommon on <template> elements
      default:
        break;
    }
  }

  // Add static attrs from DOM node, but filter out binding attributes
  for (const attr of node.attrs) {
    if (isBindingAttribute(attr.name)) {
      continue;
    }
    if (!staticAttrs.some(a => a.name === attr.name)) {
      staticAttrs.push({ name: attr.name, value: attr.value });
    }
  }

  // Transform children - but NOT if the element has controllers.
  // When a <template> has template controllers, its children are part of the
  // nested template and will be processed via transformNestedTemplate.
  const children = controllers.length > 0
    ? []
    : node.children.map(child =>
        transformNode(child, instructionsByTarget, currentFrame, ctx)
      );

  const result: PlanElementNode = {
    kind: "element",
    nodeId: node.id,
    tag: "template",
    staticAttrs,
    bindings,
    customAttrs,
    controllers,
    children,
  };

  // When element has template controllers, bindings go to nested template
  if (controllers.length > 0) {
    result.bindings = [];
    result.customAttrs = [];
  }

  if (ctx.options.includeLocations && node.loc) {
    result.loc = node.loc;
  }

  return result;
}

function transformText(
  node: TextNode,
  instructions: LinkedInstruction[],
  ctx: PlanningContext,
): PlanTextNode {
  // Check for text interpolation
  const textBinding = instructions.find((i): i is LinkedTextBinding => i.kind === "textBinding");

  if (textBinding) {
    const interpolation = transformTextInterpolation(textBinding, ctx);
    const result: PlanTextNode = {
      kind: "text",
      nodeId: node.id,
      interpolation,
      targetIndex: ctx.allocateTarget(),
    };
    if (ctx.options.includeLocations && node.loc) {
      result.loc = node.loc;
    }
    return result;
  }

  // Static text
  return {
    kind: "text",
    nodeId: node.id,
    content: node.text,
  };
}

function transformComment(node: CommentNode, ctx: PlanningContext): PlanCommentNode {
  const result: PlanCommentNode = {
    kind: "comment",
    nodeId: node.id,
    content: node.text,
  };
  if (ctx.options.includeLocations && node.loc) {
    result.loc = node.loc;
  }
  return result;
}

/* =============================================================================
 * Binding Transformations
 * ============================================================================= */

function transformPropertyBinding(ins: LinkedPropertyBinding, ctx: PlanningContext): PlanPropertyBinding {
  const exprId = primaryExprId(ins.from);
  ctx.registerExpression(exprId, ins.loc ?? undefined);

  const result: PlanPropertyBinding = {
    type: "propertyBinding",
    to: ins.to,
    exprId,
    mode: ins.effectiveMode,
  };
  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformAttributeBinding(ins: LinkedAttributeBinding, ctx: PlanningContext): PlanAttributeBinding | PlanAttributeInterpolation {
  // Check if this is an interpolation
  if (isInterpolation(ins.from)) {
    const exprIds = ins.from.exprs.map(e => e.id);
    for (const id of exprIds) {
      ctx.registerExpression(id, ins.loc ?? undefined);
    }
    const result: PlanAttributeInterpolation = {
      type: "attributeInterpolation",
      to: ins.to,
      parts: ins.from.parts,
      exprIds,
    };
    if (ins.loc) result.loc = ins.loc;
    return result;
  }

  const exprId = primaryExprId(ins.from);
  ctx.registerExpression(exprId, ins.loc ?? undefined);

  const result: PlanAttributeBinding = {
    type: "attributeBinding",
    to: ins.to,
    exprId,
  };
  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformStyleBinding(ins: LinkedStylePropertyBinding, ctx: PlanningContext): PlanStyleBinding {
  const exprId = primaryExprId(ins.from);
  ctx.registerExpression(exprId, ins.loc ?? undefined);

  const result: PlanStyleBinding = {
    type: "styleBinding",
    property: ins.to,
    exprId,
  };
  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformListenerBinding(ins: LinkedListenerBinding, ctx: PlanningContext): PlanListenerBinding {
  ctx.registerExpression(ins.from.id, ins.loc ?? undefined);

  const result: PlanListenerBinding = {
    type: "listenerBinding",
    event: ins.to,
    exprId: ins.from.id,
    capture: ins.capture ?? false,
  };
  if (ins.modifier) result.modifier = ins.modifier;
  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformRefBinding(ins: LinkedRefBinding, ctx: PlanningContext): PlanRefBinding {
  ctx.registerExpression(ins.from.id, ins.loc ?? undefined);

  const result: PlanRefBinding = {
    type: "refBinding",
    to: ins.to,
    exprId: ins.from.id,
  };
  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformTextInterpolation(ins: LinkedTextBinding, ctx: PlanningContext): PlanTextInterpolation {
  if (isInterpolation(ins.from)) {
    const exprIds = ins.from.exprs.map(e => e.id);
    for (const id of exprIds) {
      ctx.registerExpression(id, ins.loc ?? undefined);
    }
    return {
      parts: ins.from.parts,
      exprIds,
      loc: ins.loc ?? undefined,
    };
  }

  // Single expression (shouldn't happen for text, but handle it)
  const exprId = primaryExprId(ins.from);
  ctx.registerExpression(exprId, ins.loc ?? undefined);
  return {
    parts: ["", ""],
    exprIds: [exprId],
    loc: ins.loc ?? undefined,
  };
}

/* =============================================================================
 * Custom Element/Attribute Transformations
 * ============================================================================= */

function transformHydrateElement(ins: LinkedHydrateElement, ctx: PlanningContext): PlanCustomElement {
  const bindings: PlanPropertyBinding[] = [];
  const staticProps: PlanStaticProp[] = [];

  for (const prop of ins.props) {
    switch (prop.kind) {
      case "propertyBinding":
        bindings.push(transformPropertyBinding(prop, ctx));
        break;
      case "setProperty":
        staticProps.push({ name: prop.to, value: prop.value });
        break;
      case "attributeBinding":
      case "stylePropertyBinding":
        // These go on the element bindings, not custom element props
        break;
    }
  }

  return {
    resource: ins.res?.def.name ?? "unknown",
    bindings,
    staticProps,
    projections: [], // TODO: Handle projections
    containerless: ins.containerless ?? false,
  };
}

function transformHydrateAttribute(ins: LinkedHydrateAttribute, ctx: PlanningContext): PlanCustomAttr {
  const bindings: PlanPropertyBinding[] = [];
  const staticProps: PlanStaticProp[] = [];

  for (const prop of ins.props) {
    switch (prop.kind) {
      case "propertyBinding":
        bindings.push(transformPropertyBinding(prop, ctx));
        break;
      case "setProperty":
        staticProps.push({ name: prop.to, value: prop.value });
        break;
      case "attributeBinding":
      case "stylePropertyBinding":
        break;
    }
  }

  return {
    resource: ins.res?.def.name ?? "unknown",
    alias: ins.alias ?? undefined,
    bindings,
    staticProps,
  };
}

/* =============================================================================
 * Let Element Transformation
 * ============================================================================= */

function transformLetElement(ins: LinkedHydrateLetElement, ctx: PlanningContext): PlanLetElement {
  const bindings: PlanLetBinding[] = [];

  for (const letBinding of ins.instructions) {
    // Get expression ID from the binding source
    const exprId = primaryExprId(letBinding.from);
    ctx.registerExpression(exprId, letBinding.loc ?? undefined);

    bindings.push({
      to: letBinding.to,
      exprId,
    });
  }

  return {
    bindings,
    toBindingContext: ins.toBindingContext,
  };
}

/* =============================================================================
 * Template Controller Transformations
 * -----------------------------------------------------------------------------
 * Unified config-driven transformation for ALL template controllers.
 * No switch-on-name — all behavior derived from ControllerConfig.
 * ============================================================================= */

/**
 * Transform a LinkedHydrateTemplateController to a PlanController.
 *
 * This is the single entry point for ALL controller types (built-in and custom).
 * Behavior is entirely derived from the controller's ControllerConfig:
 *
 * - trigger.kind === "iterator" → extract ForOfStatement, locals, aux exprs
 * - trigger.kind === "value" → extract value expression
 * - trigger.kind === "branch" → may or may not have value expression
 * - trigger.kind === "marker" → no expression needed
 *
 * - config.branches?.relationship === "child" → collect child branch controllers
 * - config.injects?.contextuals → populate contextuals array
 * - config.injects?.alias → populate locals with alias name
 */
function transformController(
  ins: LinkedHydrateTemplateController,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  currentFrame: FrameId,
  ctx: PlanningContext,
): PlanController {
  const { config } = ins.controller;
  const frameId = findControllerFrame(ins, currentFrame, ctx);
  const nestedLinked = ctx.getLinkedTemplate(ins.def.dom);

  debug.aot("plan.controller", {
    resource: ins.res,
    trigger: config.trigger.kind,
    hasNestedTemplate: !!nestedLinked,
  });

  // For controllers with child branches (switch, promise), we collect branches separately
  // but still need to transform the nested template to get markers for branch positions
  const hasChildBranches = config.branches?.relationship === "child";

  // Transform the nested template to get markers
  // For child branches (switch, promise), this produces markers for each branch position
  // For other controllers, this produces the full nested content
  const template = nestedLinked
    ? transformNestedTemplate(nestedLinked, instructionsByTarget, frameId, ctx)
    : createEmptyFragment();

  // Build base result
  const result: PlanController = {
    resource: ins.res,
    config,
    frameId,
    template,
    targetIndex: ctx.allocateTarget(),
  };

  if (ins.loc) result.loc = ins.loc;

  // === Handle trigger-derived data ===
  switch (config.trigger.kind) {
    case "iterator": {
      // Iterator trigger: extract ForOfStatement, locals, aux expressions
      const iteratorBinding = ins.props.find(
        (p): p is LinkedIteratorBinding => p.kind === "iteratorBinding"
      );
      if (iteratorBinding) {
        result.exprId = iteratorBinding.forOf.astId;
        ctx.registerExpression(result.exprId, ins.loc ?? undefined);

        // Extract locals from ForOfStatement destructuring
        result.locals = extractIteratorLocals(result.exprId, ctx);

        // Collect auxiliary expressions (key, etc.)
        const auxExprs: PlanAuxExpr[] = [];
        for (const aux of iteratorBinding.aux) {
          const auxExprId = primaryExprId(aux.from);
          ctx.registerExpression(auxExprId, ins.loc ?? undefined);
          auxExprs.push({ name: aux.name, exprId: auxExprId });
        }
        if (auxExprs.length > 0) {
          result.auxExprs = auxExprs;
        }
      }
      break;
    }

    case "value": {
      // Value trigger: extract the primary value expression
      const valueProp = ins.props.find(
        (p): p is LinkedPropertyBinding => p.kind === "propertyBinding"
      );
      if (valueProp) {
        result.exprId = primaryExprId(valueProp.from);
        ctx.registerExpression(result.exprId, ins.loc ?? undefined);
      }
      break;
    }

    case "branch": {
      // Branch trigger: may have a value expression (case) or not (pending)
      const valueProp = ins.props.find(
        (p): p is LinkedPropertyBinding => p.kind === "propertyBinding"
      );
      if (valueProp) {
        result.exprId = primaryExprId(valueProp.from);
        ctx.registerExpression(result.exprId, ins.loc ?? undefined);
      }

      // Handle alias local (then="result", catch="error")
      // The 'local' property only exists on then/catch branches, not pending
      if (ins.branch && "local" in ins.branch && ins.branch.local) {
        result.locals = [ins.branch.local];
      }
      break;
    }

    case "marker":
      // Marker trigger: no expression needed (else, default-case)
      break;
  }

  // === Handle injects-derived data ===
  if (config.injects?.contextuals && config.injects.contextuals.length > 0) {
    result.contextuals = [...config.injects.contextuals];
  }

  // === Handle child branches ===
  if (hasChildBranches && nestedLinked) {
    const branches = collectChildBranches(nestedLinked, frameId, ctx);
    if (branches.length > 0) {
      result.branches = branches;
      debug.aot("plan.branches", {
        parent: ins.res,
        branchCount: branches.length,
        branchResources: branches.map(b => b.resource),
      });
    }
  }

  return result;
}

/**
 * Find the appropriate frame for a controller based on its scope config.
 */
function findControllerFrame(
  ins: LinkedHydrateTemplateController,
  currentFrame: FrameId,
  ctx: PlanningContext,
): FrameId {
  // For overlay scope controllers, find the child frame
  if (ins.controller.config.scope === "overlay") {
    const scopeTemplate = ctx.scope.templates[0];
    if (scopeTemplate) {
      const frame = scopeTemplate.frames.find(f =>
        f.parent === currentFrame && f.kind === "overlay"
      );
      if (frame) return frame.id;
    }
  }
  return currentFrame;
}

/**
 * Collect child branch controllers from a parent controller's nested template.
 * Used for switch (case/default-case) and promise (then/catch/pending).
 */
function collectChildBranches(
  linkedDef: LinkedTemplate,
  frameId: FrameId,
  ctx: PlanningContext,
): PlanController[] {
  const branches: PlanController[] = [];

  // Build instruction map for the nested template
  const defInstructionsByTarget = new Map<NodeId, LinkedInstruction[]>();
  for (const row of linkedDef.rows) {
    defInstructionsByTarget.set(row.target, row.instructions);
  }

  // Find all child template controllers
  for (const row of linkedDef.rows) {
    for (const childIns of row.instructions) {
      if (childIns.kind === "hydrateTemplateController") {
        // Check if this is a branch controller (has linksTo in its config)
        const childConfig = childIns.controller.config;
        if (childConfig.linksTo) {
          // Recursively transform the branch controller
          const branchCtrl = transformController(childIns, defInstructionsByTarget, frameId, ctx);
          branches.push(branchCtrl);
        }
      }
    }
  }

  return branches;
}

function transformNestedTemplate(
  linked: LinkedTemplate,
  _parentInstructions: Map<NodeId, LinkedInstruction[]>,
  currentFrame: FrameId,
  ctx: PlanningContext,
): PlanNode {
  // Push a new target scope - nested templates use LOCAL indices starting from 0
  ctx.pushTargetScope();

  // Build instruction map for nested template
  const instructionsByTarget = new Map<NodeId, LinkedInstruction[]>();
  for (const row of linked.rows) {
    instructionsByTarget.set(row.target, row.instructions);
  }

  const result = transformNode(linked.dom, instructionsByTarget, currentFrame, ctx);

  // Pop the target scope (nested template processing complete)
  ctx.popTargetScope();

  return result;
}

/* =============================================================================
 * Utility Functions
 * ============================================================================= */

function createEmptyFragment(): PlanFragmentNode {
  return {
    kind: "fragment",
    nodeId: "0" as NodeId,
    children: [],
  };
}

function isInterpolation(src: BindingSourceIR): src is Extract<BindingSourceIR, { kind: "interp" }> {
  return "exprs" in src && "parts" in src;
}

function primaryExprId(src: BindingSourceIR): ExprId {
  if (isInterpolation(src)) {
    return src.exprs[0]?.id ?? ("0" as ExprId);
  }
  return src.id;
}

function extractIteratorLocals(forOfExprId: ExprId, ctx: PlanningContext): string[] {
  const entry = ctx.exprIndex.get(forOfExprId);
  if (!entry || entry.expressionType !== "IsIterator") return [];

  const ast = entry.ast;
  if (ast.$kind !== "ForOfStatement") return [];

  // Uses shared collectBindingNames from expr-utils.ts
  return collectBindingNames(ast.declaration);
}

/* =============================================================================
 * Attribute Filtering Helpers
 * ============================================================================= */

/**
 * Known binding command suffixes that indicate an attribute is a binding, not static.
 * These should NOT be included in staticAttrs.
 */
const BINDING_COMMANDS = new Set([
  "bind", "one-time", "to-view", "from-view", "two-way",
  "trigger", "capture", "delegate",
  "ref",
  "for", // repeat.for
]);

/**
 * Check if an attribute name is a binding attribute.
 * Binding attributes have the form "name.command" where command is a known binding command.
 */
function isBindingAttribute(attrName: string): boolean {
  const dotIndex = attrName.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const command = attrName.slice(dotIndex + 1);
  return BINDING_COMMANDS.has(command);
}
