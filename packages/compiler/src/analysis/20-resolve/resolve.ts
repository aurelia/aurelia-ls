/* =============================================================================
 * PHASE 20 - RESOLVE HOST SEMANTICS
 * IR → LinkedSemantics (pure; no IR mutation)
 * - Resolves host node semantics (custom/native/none)
 * - Normalizes attr→prop (global/per-tag/DOM overrides)
 * - Resolves binding targets (custom bindable > native DOM prop > attribute)
 * - Computes effective binding mode (incl. static two-way defaults)
 * - Lifts controller metadata (repeat/with/promise/if/switch/portal)
 * - Emits AU11xx diagnostics
 * ============================================================================= */

import type {
  IrModule,
  TemplateIR,
  DOMNode,
  PropertyBindingIR,
  AttributeBindingIR,
  StylePropertyBindingIR,
  ListenerBindingIR,
  RefBindingIR,
  SetAttributeIR,
  SetClassAttributeIR,
  SetStyleAttributeIR,
  TextBindingIR,
  TranslationBindingIR,
  IteratorBindingIR,
  HydrateTemplateControllerIR,
  HydrateLetElementIR,
  BindingMode,
  NodeId,
  InstructionIR,
  InstructionRow,
  SetPropertyIR,
  HydrateElementIR,
  HydrateAttributeIR,
  ElementBindableIR,
  AttributeBindableIR,
  SourceSpan,
} from "../../model/ir.js";

import { createSemanticsLookup, getControllerConfig, type SemanticsLookup, type SemanticsLookupOptions, type LocalImportDef } from "../../language/registry.js";
import type { Semantics } from "../../language/registry.js";
import type { ResourceCollections, ResourceGraph, ResourceScopeId } from "../../language/resource-graph.js";

import type {
  LinkedSemanticsModule,
  LinkedTemplate,
  LinkedRow,
  NodeSem,
  LinkedInstruction,
  LinkedPropertyBinding,
  LinkedAttributeBinding,
  LinkedStylePropertyBinding,
  LinkedListenerBinding,
  LinkedRefBinding,
  LinkedTextBinding,
  LinkedTranslationBinding,
  LinkedSetAttribute,
  LinkedSetClassAttribute,
  LinkedSetStyleAttribute,
  LinkedIteratorBinding,
  LinkedHydrateTemplateController,
  LinkedHydrateElement,
  LinkedHydrateAttribute,
  LinkedElementBindable,
  SemDiagnostic,
  LinkedHydrateLetElement,
  LinkedSetProperty,
  TargetSem,
  AttrResRef,
} from "./types.js";
import { normalizeAttrToProp, normalizePropLikeName } from "./name-normalizer.js";
import {
  pushDiag,
  resolveAttrBindable,
  resolveAttrResRef,
  resolveAttrTarget,
  resolveBindableMode,
  resolveControllerBindable,
  resolveControllerSem,
  resolveEffectiveMode,
  resolveElementResRef,
  resolvePropertyTarget,
  resolveIteratorAuxSpec,
} from "./resolution-helpers.js";
import { resolveNodeSem } from "./node-semantics.js";
import {
  type Diagnosed,
  pure,
  diag,
  withStub,
  DiagnosticAccumulator,
} from "../../shared/diagnosed.js";
import { buildDiagnostic } from "../../shared/diagnostics.js";
import { extractExprResources, extractHostAssignments } from "../../shared/expr-utils.js";
import { NOOP_TRACE, CompilerAttributes, type CompileTrace } from "../../shared/trace.js";

function assertUnreachable(_x: never): never {
  throw new Error("unreachable");
}

/**
 * Check if a NodeSem represents a truly unknown custom element.
 * Custom elements have tags containing '-' (per HTML spec).
 * When both custom and native are null for such elements, it's unknown.
 *
 * Used for stub propagation: we suppress AU1104 for props on unknown
 * custom elements since the root cause is the missing element, not the prop.
 *
 * IMPORTANT: If a resource graph is provided and the element exists in ANY
 * scope of that graph, it's NOT truly unknown (just out-of-scope), so we
 * should NOT suppress AU1104 in that case.
 */
function isUnknownCustomElement(host: NodeSem, graph?: ResourceGraph | null): boolean {
  // Not an element or not a custom element tag
  if (host.kind !== "element" || !host.tag.includes("-")) {
    return false;
  }

  // If resolved (custom or native), it's not unknown
  if (host.custom || host.native) {
    return false;
  }

  // If there's a resource graph, check if the element exists in ANY scope
  // If it does, it's not "truly unknown" - it's just not visible in current scope
  if (graph) {
    const tag = host.tag.toLowerCase();
    for (const scope of Object.values(graph.scopes)) {
      if (scope.resources?.elements?.[tag]) {
        return false; // Element exists in graph, not truly unknown
      }
    }
  }

  // Truly unknown custom element
  return true;
}

interface ResolverContext {
  readonly lookup: SemanticsLookup;
  readonly diags: SemDiagnostic[];
  readonly graph?: ResourceGraph | null;
}

/* ============================================================================
 * Public API
 * ============================================================================ */

export interface ResolveHostOptions {
  resources?: ResourceCollections;
  graph?: ResourceGraph | null;
  scope?: ResourceScopeId | null;
  /**
   * Local imports from template `<import>` elements.
   *
   * These are resolved as local element definitions for this template,
   * allowing resolution of elements imported via `<import from="./foo">`.
   */
  localImports?: LocalImportDef[];
  /** Optional trace for instrumentation. Defaults to NOOP_TRACE. */
  trace?: CompileTrace;
}

export function resolveHost(ir: IrModule, sem: Semantics, opts?: ResolveHostOptions): LinkedSemanticsModule {
  const trace = opts?.trace ?? NOOP_TRACE;

  return trace.span("resolve.host", () => {
    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: ir.name ?? "<unknown>",
      "resolve.templateCount": ir.templates.length,
      "resolve.exprCount": ir.exprTable?.length ?? 0,
    });

    const diags: SemDiagnostic[] = [];
    const lookupOpts: SemanticsLookupOptions | undefined = opts ? buildLookupOpts(opts) : undefined;
    const ctx: ResolverContext = {
      lookup: createSemanticsLookup(sem, lookupOpts),
      diags,
      graph: opts?.graph ?? null,
    };

    // Link all templates
    trace.event("resolve.templates.start");
    const templates: LinkedTemplate[] = ir.templates.map((t) => linkTemplate(t, ctx));
    trace.event("resolve.templates.complete", { count: templates.length });

    // Validate branch controller relationships on ROOT template only.
    // Nested templates (controller defs) are validated via validateNestedIrRows during recursion.
    // ir.templates[0] is always the root; others are nested templates for controllers.
    if (templates[0]) {
      trace.event("resolve.validateBranches.start");
      validateBranchControllers(templates[0].rows, ctx);
      trace.event("resolve.validateBranches.complete");
    }

    // Validate expression resources (AU01xx diagnostics)
    if (ir.exprTable) {
      trace.event("resolve.validateExprResources.start");
      validateExpressionResources(ir.exprTable, ctx);
      trace.event("resolve.validateExprResources.complete");
    }

    // Count linked instructions
    let instrCount = 0;
    for (const t of templates) {
      for (const r of t.rows) {
        instrCount += r.instructions.length;
      }
    }

    // Record output metrics
    trace.setAttributes({
      [CompilerAttributes.INSTR_COUNT]: instrCount,
      [CompilerAttributes.DIAG_COUNT]: diags.length,
      [CompilerAttributes.DIAG_ERROR_COUNT]: diags.filter(d => d.code.startsWith("AU11") || d.code.startsWith("AU01")).length,
    });

    return {
      version: "aurelia-linked@1",
      templates,
      exprTable: ir.exprTable ?? [], // passthrough for Analysis/tooling
      diags,
    };
  });
}

/* ============================================================================
 * Template / Row linking
 * ============================================================================ */

function buildLookupOpts(opts: ResolveHostOptions): SemanticsLookupOptions {
  return {
    ...(opts.resources ? { resources: opts.resources } : {}),
    ...(opts.graph !== undefined ? { graph: opts.graph } : {}),
    ...(opts.scope !== undefined ? { scope: opts.scope ?? null } : {}),
    ...(opts.localImports ? { localImports: opts.localImports } : {}),
  };
}

function linkTemplate(t: TemplateIR, ctx: ResolverContext): LinkedTemplate {
  const idToNode = new Map<NodeId, DOMNode>();
  indexDom(t.dom, idToNode);

  // Validate unknown custom elements across the entire DOM tree.
  // This emits AU1102 for any custom element tag that isn't registered.
  validateUnknownElements(t.dom, ctx);

  const rows: LinkedRow[] = t.rows.map((row) => {
    const dom = idToNode.get(row.target);
    const nodeSem = resolveNodeSem(dom, ctx.lookup);
    const linkedInstrs = row.instructions.map((i) => linkInstruction(i, nodeSem, ctx));
    return { target: row.target, node: nodeSem, instructions: linkedInstrs };
  });

  const result: LinkedTemplate = { dom: t.dom, rows, name: t.name! };

  // Carry template meta through for AOT emission
  if (t.templateMeta) {
    result.templateMeta = t.templateMeta;
  }

  return result;
}

/* ============================================================================
 * Expression Resource Validation
 * ============================================================================ */

/**
 * Validates binding behaviors and value converters referenced in expressions.
 *
 * Error codes:
 * - AU0101: Binding behavior not found in registry
 * - AU0102: Duplicate binding behavior in same expression
 * - AU0103: Value converter not found in registry
 * - AU0106: Assignment to $host is not allowed
 * - AU9996: Conflicting rate-limit behaviors (throttle + debounce)
 */
function validateExpressionResources(
  exprTable: NonNullable<IrModule["exprTable"]>,
  ctx: ResolverContext,
): void {
  // Check for $host assignments (AU0106)
  const hostAssignments = extractHostAssignments(exprTable);
  for (const ref of hostAssignments) {
    pushDiag(
      ctx.diags,
      "AU0106",
      "Assignment to $host is not allowed.",
      ref.span,
    );
  }

  const refs = extractExprResources(exprTable);

  // Group refs by exprId for duplicate detection
  const byExpr = new Map<typeof refs[0]["exprId"], typeof refs>();
  for (const ref of refs) {
    const list = byExpr.get(ref.exprId) ?? [];
    list.push(ref);
    byExpr.set(ref.exprId, list);
  }

  // Rate-limit behaviors that conflict with each other
  const RATE_LIMIT_BEHAVIORS = new Set(["throttle", "debounce"]);

  // Check each expression for duplicates and unknown resources
  for (const [, exprRefs] of byExpr) {
    const seenBehaviors = new Set<string>();
    // Track unique rate-limiters for conflict detection (different behaviors only)
    const seenRateLimiters = new Map<string, SourceSpan>();

    for (const ref of exprRefs) {
      if (ref.kind === "bindingBehavior") {
        // Check for duplicate
        if (seenBehaviors.has(ref.name)) {
          pushDiag(
            ctx.diags,
            "AU0102",
            `Binding behavior '${ref.name}' applied more than once in the same expression.`,
            ref.span,
          );
        } else {
          seenBehaviors.add(ref.name);
        }

        // Check if registered
        if (!ctx.lookup.sem.resources.bindingBehaviors[ref.name]) {
          pushDiag(
            ctx.diags,
            "AU0101",
            `Binding behavior '${ref.name}' not found.`,
            ref.span,
          );
        }

        // Track unique rate-limiters for conflict detection
        if (RATE_LIMIT_BEHAVIORS.has(ref.name) && !seenRateLimiters.has(ref.name)) {
          seenRateLimiters.set(ref.name, ref.span);
        }
      } else {
        // valueConverter
        if (!ctx.lookup.sem.resources.valueConverters[ref.name]) {
          pushDiag(
            ctx.diags,
            "AU0103",
            `Value converter '${ref.name}' not found.`,
            ref.span,
          );
        }
      }
    }

    // Check for conflicting rate-limiters (AU9996)
    // Only triggers when DIFFERENT rate-limiters are used (e.g., throttle + debounce)
    if (seenRateLimiters.size > 1) {
      const names = [...seenRateLimiters.keys()].join(" and ");
      // Report on the second rate-limiter (the conflict)
      const entries = [...seenRateLimiters.entries()];
      const conflicting = entries[1]!;
      pushDiag(
        ctx.diags,
        "AU9996",
        `Conflicting rate-limit behaviors: ${names} cannot be used together on the same binding.`,
        conflicting[1],
      );
    }
  }
}

/**
 * Validates branch controller relationships (sibling and child).
 *
 * - Sibling relationship (else→if): preceding row must have parent controller
 * - Child relationship (then→promise): must be inside parent controller's def
 *
 * Error codes:
 * - AU0810: [else] without preceding [if]
 * - AU0813: [then]/[catch]/[pending] without parent [promise]
 * - AU0815: [case]/[default-case] without parent [switch]
 */
function validateBranchControllers(
  rows: LinkedRow[],
  ctx: ResolverContext,
  parentController: string | null = null,
): void {
  let prevRowControllers: string[] = [];

  for (const row of rows) {
    const currentRowControllers: string[] = [];

    for (const ins of row.instructions) {
      if (ins.kind === "hydrateTemplateController") {
        currentRowControllers.push(ins.res);

        // Check if this controller requires a parent (sibling or child relationship)
        const config = ins.controller.config;
        if (config.linksTo) {
          const parentConfig = getControllerConfig(config.linksTo);
          const relationship = parentConfig?.branches?.relationship;

          if (relationship === "sibling") {
            // Sibling relationship: parent must be in the previous row
            if (!prevRowControllers.includes(config.linksTo)) {
              const code = config.linksTo === "if" ? "AU0810" : "AU0815";
              const msg = `[${ins.res}] without preceding [${config.linksTo}]`;
              pushDiag(ctx.diags, code, msg, ins.loc);
            }
          } else if (relationship === "child") {
            // Child relationship: must be inside parent controller's def
            if (parentController !== config.linksTo) {
              const code = config.linksTo === "promise" ? "AU0813" : "AU0815";
              const msg = `[${ins.res}] without parent [${config.linksTo}]`;
              pushDiag(ctx.diags, code, msg, ins.loc);
            }
          }
        }

        // Recursively validate nested def (raw IR rows)
        if (ins.def?.rows) {
          validateNestedIrRows(ins.def.rows, ctx, ins.res);
        }
      }
    }

    prevRowControllers = currentRowControllers;
  }
}

/**
 * Validates branch controllers in nested IR rows (unlinked).
 * Used to check child relationships (then/catch inside promise, case inside switch).
 *
 * Error codes:
 * - AU0816: Multiple marker controllers in same parent (e.g., [default-case] in [switch])
 *
 * Note: Marker controllers (trigger.kind="marker") are presence-based and implicitly unique.
 * This check is CONFIG-DRIVEN: any userland marker controller gets the same validation.
 */
function validateNestedIrRows(
  rows: InstructionRow[],
  ctx: ResolverContext,
  parentController: string,
): void {
  let prevRowControllers: string[] = [];

  // Track uniqueness for marker-triggered controllers (presence-based, only one per parent).
  // This is CONFIG-DRIVEN: any controller with trigger.kind="marker" is implicitly unique.
  // Example: default-case can only appear once per switch.
  const markerCounts = new Map<string, number>();

  for (const row of rows) {
    const currentRowControllers: string[] = [];

    for (const ins of row.instructions) {
      if (ins.type === "hydrateTemplateController") {
        currentRowControllers.push(ins.res);

        // Get config for this controller
        const config = getControllerConfig(ins.res);
        if (config?.linksTo) {
          const parentConfig = getControllerConfig(config.linksTo);
          const relationship = parentConfig?.branches?.relationship;

          if (relationship === "sibling") {
            // Sibling relationship: parent must be in the previous row
            if (!prevRowControllers.includes(config.linksTo)) {
              const code = config.linksTo === "if" ? "AU0810" : "AU0815";
              const msg = `[${ins.res}] without preceding [${config.linksTo}]`;
              pushDiag(ctx.diags, code, msg, ins.loc);
            }
          } else if (relationship === "child") {
            // Child relationship: must be inside parent controller's def
            if (parentController !== config.linksTo) {
              const code = config.linksTo === "promise" ? "AU0813" : "AU0815";
              const msg = `[${ins.res}] without parent [${config.linksTo}]`;
              pushDiag(ctx.diags, code, msg, ins.loc);
            }
          }
        }

        // Uniqueness check for marker-triggered controllers (config-driven).
        // Marker controllers are presence-based (no value), so duplicates are invalid.
        // AU0816: Multiple [X] in same [parent]
        if (config?.trigger.kind === "marker" && config.linksTo === parentController) {
          const count = (markerCounts.get(ins.res) ?? 0) + 1;
          markerCounts.set(ins.res, count);
          if (count === 2) {
            // Emit diagnostic on the second occurrence
            pushDiag(ctx.diags, "AU0816", `Multiple [${ins.res}] in same [${parentController}]`, ins.loc);
          }
          // For 3+, we don't emit more diagnostics (one per parent is enough)
        }

        // Recursively validate nested def
        if (ins.def?.rows) {
          validateNestedIrRows(ins.def.rows, ctx, ins.res);
        }
      }
    }

    prevRowControllers = currentRowControllers;
  }
}

function indexDom(n: DOMNode, map: Map<NodeId, DOMNode>): void {
  map.set(n.id, n);
  switch (n.kind) {
    case "element":
    case "template":
      for (const c of n.children) indexDom(c, map);
      break;
    case "text":
    case "comment":
      break;
    default:
      break;
  }
}

/**
 * Walk the DOM tree to emit AU1102 for truly unknown custom elements.
 * This catches elements that have no instruction rows (no bindings).
 *
 * TODO: For auto-import, the resolution package should track a third layer:
 * resources that exist in the project or dependencies but aren't registered.
 * That would enable suggestions like "Did you mean to import 'x-widget'?"
 */
function validateUnknownElements(n: DOMNode, ctx: ResolverContext): void {
  if (n.kind === "element") {
    const nodeSem = resolveNodeSem(n, ctx.lookup);
    if (nodeSem.kind === "element" && isUnknownCustomElement(nodeSem, ctx.graph)) {
      pushDiag(
        ctx.diags,
        "AU1102",
        `Unknown custom element '<${nodeSem.tag}>'.`,
        n.loc,
      );
    }
  }

  // Recurse into children
  if (n.kind === "element" || n.kind === "template") {
    for (const c of n.children) {
      validateUnknownElements(c, ctx);
    }
  }
}

/* ============================================================================
 * Instruction linking
 * ============================================================================ */

/**
 * Helper to extract value from Diagnosed<T> and merge diagnostics into context.
 * This bridges Elm-style internal functions with the imperative boundary.
 */
function merge<T>(diagnosed: Diagnosed<T>, ctx: ResolverContext): T {
  ctx.diags.push(...diagnosed.diagnostics as SemDiagnostic[]);
  return diagnosed.value;
}

function linkInstruction(ins: InstructionIR, host: NodeSem, ctx: ResolverContext): LinkedInstruction {
  switch (ins.type) {
    case "propertyBinding":
      return merge(linkPropertyBinding(ins, host, ctx), ctx);
    case "attributeBinding":
      return merge(linkAttributeBinding(ins, host, ctx), ctx);
    case "stylePropertyBinding":
      return linkStylePropertyBinding(ins);
    case "listenerBinding":
      return merge(linkListenerBinding(ins, host, ctx), ctx);
    case "refBinding":
      return linkRefBinding(ins);
    case "textBinding":
      return linkTextBinding(ins);
    case "translationBinding":
      return linkTranslationBinding(ins);
    case "setAttribute":
      return linkSetAttribute(ins);
    case "setProperty":
      return merge(linkSetProperty(ins, host, ctx), ctx);
    case "setClassAttribute":
      return linkSetClassAttribute(ins);
    case "setStyleAttribute":
      return linkSetStyleAttribute(ins);
    case "hydrateElement":
      return linkHydrateElement(ins, host, ctx);
    case "hydrateAttribute":
      return linkHydrateAttribute(ins, host, ctx);
    case "iteratorBinding":
      return merge(linkIteratorBinding(ins, ctx), ctx);
    case "hydrateTemplateController":
      return linkHydrateTemplateController(ins, host, ctx);
    case "hydrateLetElement":
      return linkHydrateLetElement(ins);
    /* c8 ignore next 2 -- type exhaustiveness guard */
    default:
      return assertUnreachable(ins as never);
  }
}

/* ---- PropertyBinding ---- */

function linkPropertyBinding(ins: PropertyBindingIR, host: NodeSem, ctx: ResolverContext): Diagnosed<LinkedPropertyBinding> {
  // Normalize against naming/perTag/DOM overrides before resolving targets.
  const to = normalizePropLikeName(host, ins.to, ctx.lookup);
  const { target, effectiveMode } = resolvePropertyTarget(host, to, ins.mode, ctx.lookup);
  const linked: LinkedPropertyBinding = {
    kind: "propertyBinding",
    to,
    from: ins.from,
    mode: ins.mode,
    effectiveMode,
    target,
    loc: ins.loc ?? null,
  };
  if (target.kind === "unknown") {
    // Stub propagation: suppress AU1104 for unknown custom elements.
    // The root cause is the missing element registration, not individual props.
    if (isUnknownCustomElement(host, ctx.graph)) {
      return pure(linked); // No diagnostic - root cause is element, not prop
    }
    const d = buildDiagnostic({
      code: "AU1104",
      message: `Property target '${to}' not found on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
      span: ins.loc,
      source: "resolve-host",
    });
    return diag(d, withStub(linked, { diagnostic: d, span: ins.loc ?? undefined }));
  }
  return pure(linked);
}

/* ---- AttributeBinding (interpolation on attr) ---- */

function linkAttributeBinding(ins: AttributeBindingIR, host: NodeSem, ctx: ResolverContext): Diagnosed<LinkedAttributeBinding> {
  // Preserve data-* / aria-* authored forms: never camelCase or map to props.
  if (ctx.lookup.hasPreservedPrefix(ins.attr)) {
    return pure({
      kind: "attributeBinding",
      attr: ins.attr,
      to: ins.attr,
      from: ins.from,
      target: { kind: "attribute", attr: ins.attr },
      loc: ins.loc ?? null,
    });
  }

  const to = normalizeAttrToProp(host, ins.attr, ctx.lookup);
  const target = resolveAttrTarget(host, to);
  const linked: LinkedAttributeBinding = {
    kind: "attributeBinding",
    attr: ins.attr,
    to,
    from: ins.from,
    target,
    loc: ins.loc ?? null,
  };

  if (target.kind === "unknown") {
    // Stub propagation: suppress AU1104 for unknown custom elements.
    if (isUnknownCustomElement(host, ctx.graph)) {
      return pure(linked);
    }
    const d = buildDiagnostic({
      code: "AU1104",
      message: `Attribute '${ins.attr}' could not be resolved to a property on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
      span: ins.loc,
      source: "resolve-host",
    });
    return diag(d, withStub(linked, { diagnostic: d, span: ins.loc ?? undefined }));
  }

  return pure(linked);
}

/* ---- StylePropertyBinding ---- */

function linkStylePropertyBinding(ins: StylePropertyBindingIR): LinkedStylePropertyBinding {
  return { kind: "stylePropertyBinding", to: ins.to, from: ins.from, target: { kind: "style" }, loc: ins.loc ?? null };
}

/* ---- ListenerBinding ---- */

function linkListenerBinding(ins: ListenerBindingIR, host: NodeSem, ctx: ResolverContext): Diagnosed<LinkedListenerBinding> {
  const tag = host.kind === "element" ? host.tag : null;
  const eventRes = ctx.lookup.event(ins.to, tag ?? undefined);
  const eventType = eventRes.type;
  const linked: LinkedListenerBinding = {
    kind: "listenerBinding",
    to: ins.to,
    from: ins.from,
    eventType,
    capture: ins.capture!,
    modifier: ins.modifier ?? null,
    loc: ins.loc ?? null,
  };
  if (eventType.kind === "unknown") {
    const d = buildDiagnostic({
      code: "AU1103",
      message: `Unknown event '${ins.to}'${tag ? ` on <${tag}>` : ""}.`,
      span: ins.loc,
      source: "resolve-host",
    });
    return diag(d, withStub(linked, { diagnostic: d, span: ins.loc ?? undefined }));
  }
  return pure(linked);
}

/* ---- RefBinding ---- */

function linkRefBinding(ins: RefBindingIR): LinkedRefBinding {
  return { kind: "refBinding", to: ins.to, from: ins.from, loc: ins.loc ?? null };
}

/* ---- TextBinding ---- */

function linkTextBinding(ins: TextBindingIR): LinkedTextBinding {
  return { kind: "textBinding", from: ins.from, loc: ins.loc ?? null };
}

/* ---- TranslationBinding (i18n) ---- */

function linkTranslationBinding(ins: TranslationBindingIR): LinkedTranslationBinding {
  const result: LinkedTranslationBinding = {
    kind: "translationBinding",
    to: ins.to,
    isExpression: ins.isExpression,
    loc: ins.loc ?? null,
  };
  // Only include from when it's an expression (t.bind)
  if (ins.from) result.from = ins.from;
  // Only include keyValue when it's a literal key (t)
  if (ins.keyValue !== undefined) result.keyValue = ins.keyValue;
  return result;
}

/* ---- SetAttribute / Class / Style ---- */

function linkSetAttribute(ins: SetAttributeIR): LinkedSetAttribute {
  return { kind: "setAttribute", to: ins.to, value: ins.value, loc: ins.loc ?? null };
}
function linkSetClassAttribute(ins: SetClassAttributeIR): LinkedSetClassAttribute {
  return { kind: "setClassAttribute", value: ins.value, loc: ins.loc ?? null };
}
function linkSetStyleAttribute(ins: SetStyleAttributeIR): LinkedSetStyleAttribute {
  return { kind: "setStyleAttribute", value: ins.value, loc: ins.loc ?? null };
}

function linkSetProperty(ins: SetPropertyIR, host: NodeSem, ctx: ResolverContext): Diagnosed<LinkedSetProperty> {
  const to = normalizePropLikeName(host, ins.to, ctx.lookup);
  const { target } = resolvePropertyTarget(host, to, "default", ctx.lookup);
  const linked: LinkedSetProperty = { kind: "setProperty", to, value: ins.value, target, loc: ins.loc ?? null };
  if (target.kind === "unknown") {
    // Stub propagation: suppress AU1104 for unknown custom elements.
    if (isUnknownCustomElement(host, ctx.graph)) {
      return pure(linked);
    }
    const d = buildDiagnostic({
      code: "AU1104",
      message: `Property target '${to}' not found on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
      span: ins.loc,
      source: "resolve-host",
    });
    return diag(d, withStub(linked, { diagnostic: d, span: ins.loc ?? undefined }));
  }
  return pure(linked);
}

function linkHydrateElement(ins: HydrateElementIR, host: NodeSem, ctx: ResolverContext): LinkedHydrateElement {
  const res = resolveElementResRef(ins.res, ctx.lookup);
  const props = ins.props.map((p) => linkElementBindable(p, host, ctx));
  return {
    kind: "hydrateElement",
    res,
    props,
    projections: ins.projections ?? null,
    containerless: ins.containerless ?? false,
    loc: ins.loc ?? null,
  };
}

function linkHydrateAttribute(ins: HydrateAttributeIR, host: NodeSem, ctx: ResolverContext): LinkedHydrateAttribute {
  const res = resolveAttrResRef(ins.res, ctx.lookup);
  const props = ins.props.map((p) => linkAttributeBindable(p, res));
  return {
    kind: "hydrateAttribute",
    res,
    alias: ins.alias ?? null,
    props,
    loc: ins.loc ?? null,
  };
}

function linkElementBindable(ins: ElementBindableIR, host: NodeSem, ctx: ResolverContext): LinkedElementBindable {
  switch (ins.type) {
    case "propertyBinding":
      return merge(linkPropertyBinding(ins, host, ctx), ctx);
    case "attributeBinding":
      return merge(linkAttributeBinding(ins, host, ctx), ctx);
    case "stylePropertyBinding":
      return linkStylePropertyBinding(ins);
    case "setProperty":
      return merge(linkSetProperty(ins, host, ctx), ctx);
    /* c8 ignore next 2 -- type exhaustiveness guard */
    default:
      return assertUnreachable(ins as never);
  }
}

function linkAttributeBindable(
  ins: AttributeBindableIR,
  attr: AttrResRef | null,
): LinkedElementBindable {
  switch (ins.type) {
    case "propertyBinding": {
      const to = ins.to;
      const bindable = attr ? resolveAttrBindable(attr, to) : null;
      const target: TargetSem = bindable
        ? { kind: "attribute.bindable", attribute: attr!, bindable }
        : { kind: "unknown", reason: "no-bindable" };
      const effectiveMode = resolveBindableMode(ins.mode, bindable);
      return {
        kind: "propertyBinding",
        to,
        from: ins.from,
        mode: ins.mode,
        effectiveMode,
        target,
        loc: ins.loc ?? null,
      };
    }
    case "attributeBinding": {
      const bindable = attr ? resolveAttrBindable(attr, ins.to) : null;
      const target: TargetSem = bindable
        ? { kind: "attribute.bindable", attribute: attr!, bindable }
        : { kind: "unknown", reason: "no-bindable" };
      return {
        kind: "attributeBinding",
        attr: ins.attr,
        to: ins.to,
        from: ins.from,
        target,
        loc: ins.loc ?? null,
      };
    }
    case "setProperty": {
      const bindable = attr ? resolveAttrBindable(attr, ins.to) : null;
      const target: TargetSem = bindable
        ? { kind: "attribute.bindable", attribute: attr!, bindable }
        : { kind: "unknown", reason: "no-bindable" };
      return {
        kind: "setProperty",
        to: ins.to,
        value: ins.value,
        target,
        loc: ins.loc ?? null,
      };
    }
  }
}

/* ---- IteratorBinding (repeat) ---- */

function linkIteratorBinding(ins: IteratorBindingIR, ctx: ResolverContext): Diagnosed<LinkedIteratorBinding> {
  // Get iterator prop from repeat controller config (config-driven)
  const repeatConfig = ctx.lookup.sem.resources.controllers["repeat"];
  const normalizedTo = repeatConfig?.trigger.kind === "iterator" ? repeatConfig.trigger.prop : "items";
  const aux: LinkedIteratorBinding["aux"] = [];
  const acc = new DiagnosticAccumulator();

  if (ins.props?.length) {
    for (const p of ins.props) {
      const authoredMode: BindingMode = p.command === "bind" ? "toView" : "default";
      const spec = resolveIteratorAuxSpec(ctx.lookup, p.to, authoredMode);
      if (!spec) {
        acc.push(buildDiagnostic({
          code: "AU1106",
          message: `Unknown repeat option '${p.to}'.`,
          span: p.loc,
          source: "resolve-host",
        }));
      }
      if (!p.from && p.value == null) continue;
      const from: LinkedIteratorBinding["aux"][number]["from"] = p.from ?? {
        id: ins.forOf.astId,
        code: p.value!,
        loc: p.loc ?? null,
      };
      aux.push({ name: p.to, from, spec });
    }
  }

  const linked: LinkedIteratorBinding = {
    kind: "iteratorBinding",
    to: normalizedTo,
    forOf: ins.forOf,
    aux,
    loc: ins.loc ?? null,
  };
  // If there were diagnostics, mark the result as a stub
  if (acc.diagnostics.length > 0) {
    return acc.wrap(withStub(linked, { diagnostic: acc.diagnostics[0]!, span: ins.loc ?? undefined }));
  }
  return acc.wrap(linked);
}

/* ---- HydrateTemplateController ---- */

function linkHydrateTemplateController(
  ins: HydrateTemplateControllerIR,
  host: NodeSem,
  ctx: ResolverContext,
): LinkedHydrateTemplateController {
  // Resolve controller semantics (returns Diagnosed)
  const ctrlSem = merge(resolveControllerSem(ctx.lookup, ins.res, ins.loc), ctx);

  // Map controller props
  const props = ins.props.map((p) => {
    if (p.type === "iteratorBinding") {
      // linkIteratorBinding now returns Diagnosed
      return merge(linkIteratorBinding(p, ctx), ctx);
    } else if (p.type === "propertyBinding") {
      const to = normalizePropLikeName(host, p.to, ctx.lookup);
      const target: TargetSem = {
        kind: "controller.prop",
        controller: ctrlSem,
        bindable: resolveControllerBindable(ctrlSem, to),
      };
      const effectiveMode = resolveEffectiveMode(p.mode, target, host, ctx.lookup, to);
      const linked: LinkedPropertyBinding = {
        kind: "propertyBinding",
        to,
        from: p.from,
        mode: p.mode,
        effectiveMode,
        target,
        loc: p.loc ?? null,
      };
      return linked;
    } else if (p.type === "setProperty") {
      // Literal value - matches runtime SetPropertyInstruction
      const to = normalizePropLikeName(host, p.to, ctx.lookup);
      const target: TargetSem = {
        kind: "controller.prop",
        controller: ctrlSem,
        bindable: resolveControllerBindable(ctrlSem, to),
      };
      const linked: LinkedSetProperty = {
        kind: "setProperty",
        to,
        value: p.value,
        target,
        loc: p.loc ?? null,
      };
      return linked;
    } else if (p.type === "attributeBinding") {
      // Interpolation binding on controller prop
      const to = normalizePropLikeName(host, p.to, ctx.lookup);
      const target: TargetSem = {
        kind: "controller.prop",
        controller: ctrlSem,
        bindable: resolveControllerBindable(ctrlSem, to),
      };
      const linked: LinkedAttributeBinding = {
        kind: "attributeBinding",
        attr: p.attr,
        to,
        from: p.from,
        target,
        loc: p.loc ?? null,
      };
      return linked;
    } else {
      /* c8 ignore next -- type exhaustiveness guard */
      return assertUnreachable(p as never);
    }
  });

  // Branch metadata (promise/switch) comes structurally from IR
  let branch: LinkedHydrateTemplateController["branch"] = null;
  if (ins.branch) {
    switch (ins.branch.kind) {
      case "then":
      case "catch":
        branch = { kind: ins.branch.kind, local: ins.branch.local ?? null };
        break;
      case "pending":
        branch = { kind: "pending" };
        break;
      case "case":
        branch = { kind: "case", expr: ins.branch.expr };
        break;
      case "default":
        branch = { kind: "default" };
        break;
      /* c8 ignore next 2 -- type exhaustiveness guard */
      default:
        assertUnreachable(ins.branch);
    }
  }

  return {
    kind: "hydrateTemplateController",
    res: ctrlSem.res,
    def: ins.def, // keep nested template as raw IR (ScopeGraph will walk it)
    controller: ctrlSem,
    props,
    branch: branch ?? null,
    containerless: ins.containerless ?? false,
    loc: ins.loc ?? null,
  };
}

/* ---- HydrateLetElement ---- */

function linkHydrateLetElement(ins: HydrateLetElementIR): LinkedHydrateLetElement {
  // <let> is transparent at semantics level; ScopeGraph consumes the inner instructions.
  return {
    kind: "hydrateLetElement",
    instructions: ins.instructions,
    toBindingContext: ins.toBindingContext,
    loc: ins.loc ?? null,
  };
}

/* ============================================================================
 * Target / Controller resolution
 * ============================================================================ */
