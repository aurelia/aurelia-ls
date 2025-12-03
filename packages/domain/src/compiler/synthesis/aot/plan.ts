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
  ExprId,
  NodeId,
  FrameId,
  SourceSpan,
  ExprTableEntry,
  BindingSourceIR,
  TemplateNode,
  DOMNode,
  ElementNode,
  TextNode,
  CommentNode,
  BindingIdentifierOrPattern,
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
  LinkedIteratorBinding,
} from "../../analysis/index.js";

import { indexExprTable } from "../../shared/expr-utils.js";

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
  PlanController,
  PlanRepeatController,
  PlanIfController,
  PlanWithController,
  PlanSwitchController,
  PlanPromiseController,
  PlanPortalController,
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
  const ctx = new PlanningContext(linked, scope, options);

  // Only process the root template (nested templates are handled via controllers)
  const rootTemplate = linked.templates[0];
  const rootScopeTemplate = scope.templates[0];

  if (!rootTemplate || !rootScopeTemplate) {
    // Empty template
    return {
      version: "aurelia-aot-plan@1",
      root: createEmptyFragment(),
      expressions: [],
      scopes: [],
      targetCount: 0,
      name: options.templateFilePath,
    };
  }

  // Build scope entries from ScopeModule
  const scopes = buildPlanScopes(rootScopeTemplate, ctx);

  // Transform root template
  const root = transformTemplate(rootTemplate, rootScopeTemplate, ctx);

  return {
    version: "aurelia-aot-plan@1",
    root,
    expressions: ctx.getExpressions(),
    scopes,
    targetCount: ctx.targetCount,
    name: rootTemplate.name ?? options.templateFilePath,
  };
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

  /** Map from TemplateNode to LinkedTemplate */
  readonly domToLinked: WeakMap<TemplateNode, LinkedTemplate>;

  /** Collected expressions */
  private readonly expressions: Map<ExprId, PlanExpression> = new Map();

  /** Expression to frame mapping from scope analysis */
  readonly exprToFrame: ReadonlyExprIdMap<FrameId>;

  /** Next hydration target index */
  private nextTargetIndex = 0;

  constructor(
    linked: LinkedSemanticsModule,
    scope: ScopeModule,
    options: AotPlanOptions,
  ) {
    this.linked = linked;
    this.scope = scope;
    this.options = options;
    this.exprIndex = indexExprTable(linked.exprTable);

    // Build DOM → LinkedTemplate map
    this.domToLinked = new WeakMap();
    for (const t of linked.templates) {
      this.domToLinked.set(t.dom, t);
    }

    // Get exprToFrame from root scope template
    const rootScope = scope.templates[0];
    this.exprToFrame = rootScope?.exprToFrame ?? new Map();
  }

  /** Allocate a hydration target index */
  allocateTarget(): number {
    return this.nextTargetIndex++;
  }

  /** Get current target count */
  get targetCount(): number {
    return this.nextTargetIndex;
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

  /** Look up LinkedTemplate for a nested template node */
  getLinkedTemplate(dom: TemplateNode): LinkedTemplate | undefined {
    return this.domToLinked.get(dom);
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
    case "repeatLocal": return "iterator";
    case "repeatContextual": return "contextual";
    case "promiseAlias": return "alias";
  }
}

function frameToPlanKind(frame: ScopeFrame): PlanScopeKind {
  if (frame.kind === "root") return "root";

  // Determine kind from origin if available
  const origin = frame.origin;
  if (!origin) return "root";

  switch (origin.kind) {
    case "repeat": return "repeat";
    case "with": return "with";
    case "promise": return "promise";
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
        // Let elements are handled at scope level, not as element bindings
        needsTarget = true;
        break;

      case "textBinding":
      case "iteratorBinding":
        // These shouldn't appear on elements
        break;
    }
  }

  // Add static attrs from DOM node
  for (const attr of node.attrs) {
    // Check if we already have this attr from instructions
    if (!staticAttrs.some(a => a.name === attr.name)) {
      staticAttrs.push({ name: attr.name, value: attr.value });
    }
  }

  // Transform children - but NOT if the element has controllers.
  // When an element has template controllers, its children are part of the
  // nested template (ins.def) and will be processed via transformNestedTemplate.
  // Processing them here would cause duplication.
  const children = controllers.length > 0
    ? []
    : node.children.map(child =>
        transformNode(child, instructionsByTarget, currentFrame, ctx)
      );

  const result: PlanElementNode = {
    kind: "element",
    nodeId: node.id,
    tag: node.tag,
    staticAttrs,
    bindings,
    customAttrs,
    controllers,
    children,
  };

  if (needsTarget) {
    result.targetIndex = ctx.allocateTarget();
  }

  if (customElement) {
    result.customElement = customElement;
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
 * Template Controller Transformations
 * ============================================================================= */

function transformController(
  ins: LinkedHydrateTemplateController,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  currentFrame: FrameId,
  ctx: PlanningContext,
): PlanController {
  // Get the frame for this controller from scope analysis
  const controllerFrame = findControllerFrame(ins, currentFrame, ctx);

  switch (ins.res) {
    case "repeat":
      return transformRepeatController(ins, instructionsByTarget, controllerFrame, ctx);
    case "if":
      return transformIfController(ins, instructionsByTarget, controllerFrame, ctx);
    case "with":
      return transformWithController(ins, instructionsByTarget, controllerFrame, ctx);
    case "switch":
      return transformSwitchController(ins, instructionsByTarget, controllerFrame, ctx);
    case "promise":
      return transformPromiseController(ins, instructionsByTarget, controllerFrame, ctx);
    case "portal":
      return transformPortalController(ins, instructionsByTarget, controllerFrame, ctx);
  }
}

function findControllerFrame(
  ins: LinkedHydrateTemplateController,
  currentFrame: FrameId,
  ctx: PlanningContext,
): FrameId {
  // For overlay scope controllers, find the child frame
  if (ins.controller.spec.scope === "overlay") {
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

function transformRepeatController(
  ins: LinkedHydrateTemplateController,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  frameId: FrameId,
  ctx: PlanningContext,
): PlanRepeatController {
  const iteratorBinding = ins.props.find((p): p is LinkedIteratorBinding => p.kind === "iteratorBinding");
  if (!iteratorBinding) {
    throw new Error("repeat controller missing iteratorBinding");
  }

  ctx.registerExpression(iteratorBinding.forOf.astId, ins.loc ?? undefined);

  // Extract locals from ForOfStatement
  const locals = extractIteratorLocals(iteratorBinding.forOf.astId, ctx);

  // Extract contextuals from controller spec
  const contextuals = ins.controller.spec.scope === "overlay"
    ? (ins.controller.spec as { contextuals?: string[] }).contextuals ?? []
    : [];

  // Handle key expression
  let keyExprId: ExprId | undefined;
  const keyAux = iteratorBinding.aux.find(a => a.name === "key");
  if (keyAux) {
    keyExprId = primaryExprId(keyAux.from);
    ctx.registerExpression(keyExprId, ins.loc ?? undefined);
  }

  // Transform nested template
  const nestedLinked = ctx.getLinkedTemplate(ins.def.dom);
  const template = nestedLinked
    ? transformNestedTemplate(nestedLinked, instructionsByTarget, frameId, ctx)
    : createEmptyFragment();

  const result: PlanRepeatController = {
    kind: "repeat",
    frameId,
    iteratorExprId: iteratorBinding.forOf.astId,
    locals,
    contextuals,
    template,
    targetIndex: ctx.allocateTarget(),
  };

  if (keyExprId) result.keyExprId = keyExprId;
  if (ins.loc) result.loc = ins.loc;

  return result;
}

function transformIfController(
  ins: LinkedHydrateTemplateController,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  frameId: FrameId,
  ctx: PlanningContext,
): PlanIfController {
  const valueProp = ins.props.find((p): p is LinkedPropertyBinding => p.kind === "propertyBinding");
  if (!valueProp) {
    throw new Error("if controller missing condition binding");
  }

  const conditionExprId = primaryExprId(valueProp.from);
  ctx.registerExpression(conditionExprId, ins.loc ?? undefined);

  const nestedLinked = ctx.getLinkedTemplate(ins.def.dom);
  const template = nestedLinked
    ? transformNestedTemplate(nestedLinked, instructionsByTarget, frameId, ctx)
    : createEmptyFragment();

  const result: PlanIfController = {
    kind: "if",
    frameId,
    conditionExprId,
    template,
    targetIndex: ctx.allocateTarget(),
  };

  // TODO: Handle else template when we have it in the IR

  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformWithController(
  ins: LinkedHydrateTemplateController,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  frameId: FrameId,
  ctx: PlanningContext,
): PlanWithController {
  const valueProp = ins.props.find((p): p is LinkedPropertyBinding => p.kind === "propertyBinding");
  if (!valueProp) {
    throw new Error("with controller missing value binding");
  }

  const valueExprId = primaryExprId(valueProp.from);
  ctx.registerExpression(valueExprId, ins.loc ?? undefined);

  const nestedLinked = ctx.getLinkedTemplate(ins.def.dom);
  const template = nestedLinked
    ? transformNestedTemplate(nestedLinked, instructionsByTarget, frameId, ctx)
    : createEmptyFragment();

  const result: PlanWithController = {
    kind: "with",
    frameId,
    valueExprId,
    template,
    targetIndex: ctx.allocateTarget(),
  };

  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformSwitchController(
  ins: LinkedHydrateTemplateController,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  frameId: FrameId,
  ctx: PlanningContext,
): PlanSwitchController {
  const valueProp = ins.props.find((p): p is LinkedPropertyBinding => p.kind === "propertyBinding");
  if (!valueProp) {
    throw new Error("switch controller missing value binding");
  }

  const valueExprId = primaryExprId(valueProp.from);
  ctx.registerExpression(valueExprId, ins.loc ?? undefined);

  // Note: Case branches are handled as separate template controllers in the IR
  // This is a simplified implementation
  const result: PlanSwitchController = {
    kind: "switch",
    frameId,
    valueExprId,
    cases: [],
    targetIndex: ctx.allocateTarget(),
  };

  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformPromiseController(
  ins: LinkedHydrateTemplateController,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  frameId: FrameId,
  ctx: PlanningContext,
): PlanPromiseController {
  const valueProp = ins.props.find((p): p is LinkedPropertyBinding => p.kind === "propertyBinding");
  if (!valueProp) {
    throw new Error("promise controller missing value binding");
  }

  const valueExprId = primaryExprId(valueProp.from);
  ctx.registerExpression(valueExprId, ins.loc ?? undefined);

  const result: PlanPromiseController = {
    kind: "promise",
    frameId,
    valueExprId,
    targetIndex: ctx.allocateTarget(),
  };

  // Handle then/catch branches if this is a branch controller
  if (ins.branch) {
    const nestedLinked = ctx.getLinkedTemplate(ins.def.dom);
    const template = nestedLinked
      ? transformNestedTemplate(nestedLinked, instructionsByTarget, frameId, ctx)
      : createEmptyFragment();

    if (ins.branch.kind === "then") {
      result.thenTemplate = template;
      if (ins.branch.local) result.thenLocal = ins.branch.local;
      result.thenFrameId = frameId;
    } else if (ins.branch.kind === "catch") {
      result.catchTemplate = template;
      if (ins.branch.local) result.catchLocal = ins.branch.local;
      result.catchFrameId = frameId;
    }
  }

  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformPortalController(
  ins: LinkedHydrateTemplateController,
  instructionsByTarget: Map<NodeId, LinkedInstruction[]>,
  frameId: FrameId,
  ctx: PlanningContext,
): PlanPortalController {
  const nestedLinked = ctx.getLinkedTemplate(ins.def.dom);
  const template = nestedLinked
    ? transformNestedTemplate(nestedLinked, instructionsByTarget, frameId, ctx)
    : createEmptyFragment();

  const result: PlanPortalController = {
    kind: "portal",
    frameId,
    template,
    targetIndex: ctx.allocateTarget(),
  };

  // Check for target expression or selector in props
  const targetProp = ins.props.find((p): p is LinkedPropertyBinding =>
    p.kind === "propertyBinding" && p.to === "target"
  );
  if (targetProp) {
    const targetExprId = primaryExprId(targetProp.from);
    ctx.registerExpression(targetExprId, ins.loc ?? undefined);
    result.targetExprId = targetExprId;
  }

  if (ins.loc) result.loc = ins.loc;
  return result;
}

function transformNestedTemplate(
  linked: LinkedTemplate,
  _parentInstructions: Map<NodeId, LinkedInstruction[]>,
  currentFrame: FrameId,
  ctx: PlanningContext,
): PlanNode {
  // Build instruction map for nested template
  const instructionsByTarget = new Map<NodeId, LinkedInstruction[]>();
  for (const row of linked.rows) {
    instructionsByTarget.set(row.target, row.instructions);
  }

  return transformNode(linked.dom, instructionsByTarget, currentFrame, ctx);
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

  return extractBindingNames(ast.declaration);
}

function extractBindingNames(pattern: BindingIdentifierOrPattern): string[] {
  switch (pattern.$kind) {
    case "BindingIdentifier":
      return pattern.name ? [pattern.name] : [];
    case "ArrayBindingPattern": {
      const names = pattern.elements.flatMap(extractBindingNames);
      if (pattern.rest) names.push(...extractBindingNames(pattern.rest));
      return names;
    }
    case "ObjectBindingPattern": {
      const names = pattern.properties.flatMap(p => extractBindingNames(p.value));
      if (pattern.rest) names.push(...extractBindingNames(pattern.rest));
      return names;
    }
    case "BindingPatternDefault":
      return extractBindingNames(pattern.target);
    case "BindingPatternHole":
      return [];
    case "BadExpression":
      return [];
    default:
      return [];
  }
}
