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
  SourceSpan,
} from "../../model/ir.js";

import { createSemanticsLookup, getControllerConfig, type SemanticsLookup, type SemanticsLookupOptions } from "../../language/registry.js";
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

function assertUnreachable(_x: never): never {
  throw new Error("unreachable");
}

interface ResolverContext {
  readonly lookup: SemanticsLookup;
  readonly diags: SemDiagnostic[];
}

/* ============================================================================
 * Public API
 * ============================================================================ */

export interface ResolveHostOptions {
  resources?: ResourceCollections;
  graph?: ResourceGraph | null;
  scope?: ResourceScopeId | null;
}

export function resolveHost(ir: IrModule, sem: Semantics, opts?: ResolveHostOptions): LinkedSemanticsModule {
  const diags: SemDiagnostic[] = [];
  const lookupOpts: SemanticsLookupOptions | undefined = opts ? buildLookupOpts(opts) : undefined;
  const ctx: ResolverContext = {
    lookup: createSemanticsLookup(sem, lookupOpts),
    diags,
  };
  const templates: LinkedTemplate[] = ir.templates.map((t) => linkTemplate(t, ctx));

  // Validate branch controller relationships on ROOT template only.
  // Nested templates (controller defs) are validated via validateNestedIrRows during recursion.
  // ir.templates[0] is always the root; others are nested templates for controllers.
  if (templates[0]) {
    validateBranchControllers(templates[0].rows, ctx);
  }

  // TODO: Validate expression resources (AU01xx diagnostics)
  // Walk ir.exprTable to extract binding behaviors and value converters from AST.
  // Check each against ctx.lookup (registry + ResourceGraph).
  // Emit AU0101 for unknown binding behaviors, AU0103 for unknown value converters.
  // See: BindingBehaviorExpression.$kind === 'BindingBehavior' with .name
  //      ValueConverterExpression.$kind === 'ValueConverter' with .name
  // validateExpressionResources(ir.exprTable, ctx);

  return {
    version: "aurelia-linked@1",
    templates,
    exprTable: ir.exprTable ?? [], // passthrough for Analysis/tooling
    diags,
  };
}

/* ============================================================================
 * Template / Row linking
 * ============================================================================ */

function buildLookupOpts(opts: ResolveHostOptions): SemanticsLookupOptions {
  const out: SemanticsLookupOptions = {};
  if (opts.resources) out.resources = opts.resources;
  if (opts.graph !== undefined) out.graph = opts.graph;
  if (opts.scope !== undefined) out.scope = opts.scope ?? null;
  return out;
}

function linkTemplate(t: TemplateIR, ctx: ResolverContext): LinkedTemplate {
  const idToNode = new Map<NodeId, DOMNode>();
  indexDom(t.dom, idToNode);
  const rows: LinkedRow[] = t.rows.map((row) => {
    const dom = idToNode.get(row.target);
    const nodeSem = resolveNodeSem(dom, ctx.lookup);
    const linkedInstrs = row.instructions.map((i) => linkInstruction(i, nodeSem, ctx));
    return { target: row.target, node: nodeSem, instructions: linkedInstrs };
  });

  return { dom: t.dom, rows, name: t.name! };
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
 * - AU0816: Multiple [default-case] in same switch
 */
function validateNestedIrRows(
  rows: InstructionRow[],
  ctx: ResolverContext,
  parentController: string,
): void {
  let prevRowControllers: string[] = [];

  // Track cardinality for controllers with "zero-one" constraint (e.g., default-case)
  let defaultCaseCount = 0;
  let firstDefaultCaseLoc: SourceSpan | null = null;

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

        // Track cardinality for default-case (zero-one constraint)
        // AU0816: Multiple [default-case] in same switch
        if (ins.res === "default-case" && parentController === "switch") {
          defaultCaseCount++;
          if (defaultCaseCount === 1) {
            firstDefaultCaseLoc = ins.loc ?? null;
          } else if (defaultCaseCount === 2) {
            // Emit diagnostic on the second occurrence, pointing to it
            pushDiag(ctx.diags, "AU0816", "Multiple [default-case] in same [switch]", ins.loc);
          }
          // For 3+, we don't emit more diagnostics (one per switch is enough)
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

/* ============================================================================
 * Instruction linking
 * ============================================================================ */

function linkInstruction(ins: InstructionIR, host: NodeSem, ctx: ResolverContext): LinkedInstruction {
  switch (ins.type) {
    case "propertyBinding":
      return linkPropertyBinding(ins, host, ctx);
    case "attributeBinding":
      return linkAttributeBinding(ins, host, ctx);
    case "stylePropertyBinding":
      return linkStylePropertyBinding(ins);
    case "listenerBinding":
      return linkListenerBinding(ins, host, ctx);
    case "refBinding":
      return linkRefBinding(ins);
    case "textBinding":
      return linkTextBinding(ins);
    case "setAttribute":
      return linkSetAttribute(ins);
    case "setProperty":
      return linkSetProperty(ins, host, ctx);
    case "setClassAttribute":
      return linkSetClassAttribute(ins);
    case "setStyleAttribute":
      return linkSetStyleAttribute(ins);
    case "hydrateElement":
      return linkHydrateElement(ins, host, ctx);
    case "hydrateAttribute":
      return linkHydrateAttribute(ins, host, ctx);
    case "iteratorBinding":
      return linkIteratorBinding(ins, ctx);
    case "hydrateTemplateController":
      return linkHydrateTemplateController(ins, host, ctx);
    case "hydrateLetElement":
      return linkHydrateLetElement(ins);
    default:
      return assertUnreachable(ins as never);
  }
}

/* ---- PropertyBinding ---- */

function linkPropertyBinding(ins: PropertyBindingIR, host: NodeSem, ctx: ResolverContext): LinkedPropertyBinding {
  // Normalize against naming/perTag/DOM overrides before resolving targets.
  const to = normalizePropLikeName(host, ins.to, ctx.lookup);
  const { target, effectiveMode } = resolvePropertyTarget(host, to, ins.mode, ctx.lookup);
  if (target.kind === "unknown") {
    pushDiag(ctx.diags, "AU1104", `Property target '${to}' not found on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`, ins.loc);
  }
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

/* ---- AttributeBinding (interpolation on attr) ---- */

function linkAttributeBinding(ins: AttributeBindingIR, host: NodeSem, ctx: ResolverContext): LinkedAttributeBinding {
  // Preserve data-* / aria-* authored forms: never camelCase or map to props.
  if (ctx.lookup.hasPreservedPrefix(ins.attr)) {
    return {
      kind: "attributeBinding",
      attr: ins.attr,
      to: ins.attr,
      from: ins.from,
      target: { kind: "attribute", attr: ins.attr },
      loc: ins.loc ?? null,
    };
  }

  const to = normalizeAttrToProp(host, ins.attr, ctx.lookup);
  const target = resolveAttrTarget(host, to);

  if (target.kind === "unknown") {
    pushDiag(ctx.diags, "AU1104", `Attribute '${ins.attr}' could not be resolved to a property on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`, ins.loc);
  }

  return {
    kind: "attributeBinding",
    attr: ins.attr,
    to,
    from: ins.from,
    target,
    loc: ins.loc ?? null,
  };
}

/* ---- StylePropertyBinding ---- */

function linkStylePropertyBinding(ins: StylePropertyBindingIR): LinkedStylePropertyBinding {
  return { kind: "stylePropertyBinding", to: ins.to, from: ins.from, target: { kind: "style" }, loc: ins.loc ?? null };
}

/* ---- ListenerBinding ---- */

function linkListenerBinding(ins: ListenerBindingIR, host: NodeSem, ctx: ResolverContext): LinkedListenerBinding {
  const tag = host.kind === "element" ? host.tag : null;
  const eventRes = ctx.lookup.event(ins.to, tag ?? undefined);
  const eventType = eventRes.type;
  if (eventType.kind === "unknown") {
    pushDiag(ctx.diags, "AU1103", `Unknown event '${ins.to}'${tag ? ` on <${tag}>` : ""}.`, ins.loc);
  }
  return {
    kind: "listenerBinding",
    to: ins.to,
    from: ins.from,
    eventType,
    capture: ins.capture!,
    modifier: ins.modifier ?? null,
    loc: ins.loc ?? null,
  };
}

/* ---- RefBinding ---- */

function linkRefBinding(ins: RefBindingIR): LinkedRefBinding {
  return { kind: "refBinding", to: ins.to, from: ins.from, loc: ins.loc ?? null };
}

/* ---- TextBinding ---- */

function linkTextBinding(ins: TextBindingIR): LinkedTextBinding {
  return { kind: "textBinding", from: ins.from, loc: ins.loc ?? null };
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

function linkSetProperty(ins: SetPropertyIR, host: NodeSem, ctx: ResolverContext): LinkedSetProperty {
  const to = normalizePropLikeName(host, ins.to, ctx.lookup);
  const { target } = resolvePropertyTarget(host, to, "default", ctx.lookup);
  if (target.kind === "unknown") {
    pushDiag(ctx.diags, "AU1104", `Property target '${to}' not found on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`, ins.loc);
  }
  return { kind: "setProperty", to, value: ins.value, target, loc: ins.loc ?? null };
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
      return linkPropertyBinding(ins, host, ctx);
    case "attributeBinding":
      return linkAttributeBinding(ins, host, ctx);
    case "stylePropertyBinding":
      return linkStylePropertyBinding(ins);
    case "setProperty":
      return linkSetProperty(ins, host, ctx);
    default:
      return assertUnreachable(ins as never);
  }
}

function linkAttributeBindable(
  ins: ElementBindableIR,
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
    case "stylePropertyBinding":
      return linkStylePropertyBinding(ins);
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
    default:
      return assertUnreachable(ins as never);
  }
}

/* ---- IteratorBinding (repeat) ---- */

function linkIteratorBinding(ins: IteratorBindingIR, ctx: ResolverContext): LinkedIteratorBinding {
  // Get iterator prop from repeat controller config (config-driven)
  const repeatConfig = ctx.lookup.sem.resources.controllers["repeat"];
  const normalizedTo = repeatConfig?.trigger.kind === "iterator" ? repeatConfig.trigger.prop : "items";
  const aux: LinkedIteratorBinding["aux"] = [];

  if (ins.props?.length) {
    for (const p of ins.props) {
      const authoredMode: BindingMode = p.command === "bind" ? "toView" : "default";
      const spec = resolveIteratorAuxSpec(ctx.lookup, p.to, authoredMode);
      if (!spec) {
        pushDiag(ctx.diags, "AU1106", `Unknown repeat option '${p.to}'.`, p.loc);
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

  return {
    kind: "iteratorBinding",
    to: normalizedTo,
    forOf: ins.forOf,
    aux,
    loc: ins.loc ?? null,
  };
}

/* ---- HydrateTemplateController ---- */

function linkHydrateTemplateController(
  ins: HydrateTemplateControllerIR,
  host: NodeSem,
  ctx: ResolverContext,
): LinkedHydrateTemplateController {
  // Resolve controller semantics (returns Diagnosed)
  const ctrlSemDiagnosed = resolveControllerSem(ctx.lookup, ins.res, ins.loc);
  ctx.diags.push(...ctrlSemDiagnosed.diagnostics as SemDiagnostic[]);
  const ctrlSem = ctrlSemDiagnosed.value;

  // Map controller props
  const props = ins.props.map((p) => {
    if (p.type === "iteratorBinding") {
      const iter = linkIteratorBinding(p, ctx);
      // iter.to is already set by linkIteratorBinding (config-driven)
      return iter;
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
    } else {
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
