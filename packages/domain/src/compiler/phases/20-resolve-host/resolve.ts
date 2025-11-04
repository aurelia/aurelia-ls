/* =============================================================================
 * PHASE 20 — RESOLVE HOST SEMANTICS
 * IR → LinkedSemantics (pure; no IR mutation)
 * - Resolves host node semantics (custom/native/none)
 * - Normalizes attr→prop (global/per-tag/DOM overrides)
 * - Resolves binding targets (custom bindable > native DOM prop > attribute)
 * - Computes effective binding mode (incl. static two-way defaults)
 * - Lifts controller metadata (repeat/with/promise/if/switch/portal)
 * - Emits AU11xx diagnostics
 * ============================================================================= */

import type {
  IrModule, TemplateIR, DOMNode,
  SourceSpan,
  PropertyBindingIR, AttributeBindingIR, StylePropertyBindingIR, ListenerBindingIR, RefBindingIR,
  SetAttributeIR, SetClassAttributeIR, SetStyleAttributeIR, TextBindingIR, IteratorBindingIR, HydrateTemplateControllerIR, HydrateLetElementIR,
  BindingMode, NodeId,
  InstructionIR,
  SetPropertyIR,
} from "../../model/ir.js";

import type { Semantics, TypeRef, Bindable } from "../../language/registry.js";

import type {
  LinkedSemanticsModule, LinkedTemplate, LinkedRow, NodeSem, LinkedInstruction,
  LinkedPropertyBinding, LinkedAttributeBinding, LinkedStylePropertyBinding, LinkedListenerBinding, LinkedRefBinding,
  LinkedTextBinding, LinkedSetAttribute, LinkedSetClassAttribute, LinkedSetStyleAttribute, LinkedIteratorBinding,
  LinkedHydrateTemplateController, TargetSem, ControllerSem,
  SemDiagnostic,
  LinkedHydrateLetElement,
  LinkedSetProperty,
  ElementResRef, DomElementRef,
} from "./types.js";

function assertUnreachable(x: never): never { throw new Error("unreachable"); }

/* ============================================================================
 * Public API
 * ============================================================================ */

export function resolveHost(ir: IrModule, sem: Semantics): LinkedSemanticsModule {
  const diags: SemDiagnostic[] = [];
  const templates: LinkedTemplate[] = ir.templates.map((t) => linkTemplate(t, sem, diags));
  return {
    version: "aurelia-linked@1",
    templates,
    exprTable: ir.exprTable, // passthrough for Analysis/tooling
    diags,
  };
}

/* ============================================================================
 * Template / Row linking
 * ============================================================================ */

function linkTemplate(t: TemplateIR, sem: Semantics, diags: SemDiagnostic[]): LinkedTemplate {
  const idToNode = new Map<NodeId, DOMNode>();
  indexDom(t.dom, idToNode);
  const rows: LinkedRow[] = t.rows.map((row) => {
    const dom = idToNode.get(row.target);
    const nodeSem = resolveNodeSem(dom, sem);
    const linkedInstrs = row.instructions.map((i) => linkInstruction(i, nodeSem, sem, diags));
    return { target: row.target, node: nodeSem, instructions: linkedInstrs };
  });
  return { dom: t.dom, rows, name: t.name! };
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

function resolveNodeSem(n: DOMNode | undefined, sem: Semantics): NodeSem {
  if (!n) return { kind: "comment" }; // rows may target synthetic nodes (e.g., wrapper templates)
  switch (n.kind) {
    case "element": {
      const tag = n.tag.toLowerCase();
      // Custom component wins when both exist
      const custom = sem.resources.elements[tag] ?? null;
      const native = sem.dom.elements[tag] ?? null;
      return {
        kind: "element",
        tag,
        custom: custom ? ({ def: custom } as ElementResRef) : null,
        native: native ? ({ def: native } as DomElementRef) : null,
      };
    }
    case "template": return { kind: "template" };
    case "text":     return { kind: "text" };
    case "comment":  return { kind: "comment" };
    default:         return assertUnreachable(n as never);
  }
}

/* ============================================================================
 * Instruction linking
 * ============================================================================ */

function linkInstruction(
  ins: InstructionIR,
  host: NodeSem,
  sem: Semantics,
  diags: SemDiagnostic[],
): LinkedInstruction {
  switch (ins.type) {
    case "propertyBinding":       return linkPropertyBinding(ins, host, sem, diags);
    case "attributeBinding":      return linkAttributeBinding(ins, host, sem, diags);
    case "stylePropertyBinding":  return linkStylePropertyBinding(ins);
    case "listenerBinding":       return linkListenerBinding(ins, host, sem, diags);
    case "refBinding":            return linkRefBinding(ins);
    case "textBinding":           return linkTextBinding(ins);
    case "setAttribute":          return linkSetAttribute(ins);
    case "setProperty":           return linkSetProperty(ins, host, sem, diags);
    case "setClassAttribute":     return linkSetClassAttribute(ins);
    case "setStyleAttribute":     return linkSetStyleAttribute(ins);
    case "iteratorBinding":       return linkIteratorBinding(ins, host, sem, diags);
    case "hydrateTemplateController":
      return linkHydrateTemplateController(ins, host, sem, diags);
    case "hydrateLetElement":
      return linkHydrateLetElement(ins);
    default:
      // hydrateElement/hydrateAttribute not produced by the current builder (MVP)
      return assertUnreachable(ins as never);
  }
}

/* ---- PropertyBinding ---- */

function linkPropertyBinding(
  ins: PropertyBindingIR,
  host: NodeSem,
  sem: Semantics,
  diags: SemDiagnostic[],
): LinkedPropertyBinding {
  // Normalize against naming/perTag/DOM overrides before resolving targets.
  const to = normalizePropLikeName(host, ins.to, sem);
  const { target, effectiveMode } = resolvePropertyTarget(host, to, ins.mode, sem);
  if (target.kind === "unknown") {
    diags.push({
      code: "AU1104",
      message: `Property target '${to}' not found on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
      span: ins.loc ?? null,
    });
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

function linkAttributeBinding(
  ins: AttributeBindingIR,
  host: NodeSem,
  sem: Semantics,
  diags: SemDiagnostic[],
): LinkedAttributeBinding {
  // Preserve data-* / aria-* authored forms: never camelCase or map to props.
  if (hasPreservedPrefix(ins.attr, sem)) {
    return {
      kind: "attributeBinding",
      attr: ins.attr,
      to: ins.attr,
      from: ins.from,
      target: { kind: "attribute", attr: ins.attr },
      loc: ins.loc ?? null,
    };
  }

  const to = normalizeAttrToProp(host, ins.attr, sem);
  const target = resolveAttrTarget(host, to, sem);

  if (target.kind === "unknown") {
    diags.push({
      code: "AU1104",
      message: `Attribute '${ins.attr}' could not be resolved to a property on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
      span: ins.loc ?? null,
    });
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

function linkListenerBinding(
  ins: ListenerBindingIR,
  host: NodeSem,
  sem: Semantics,
  diags: SemDiagnostic[],
): LinkedListenerBinding {
  const tag = host.kind === "element" ? host.tag : null;
  const eventType = resolveEventType(sem, ins.to, tag);
  if (eventType.kind === "unknown") {
    diags.push({
      code: "AU1103",
      message: `Unknown event '${ins.to}'${tag ? ` on <${tag}>` : ""}.`,
      span: ins.loc ?? null,
    });
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

function linkSetProperty(
  ins: SetPropertyIR,
  host: NodeSem,
  sem: Semantics,
  diags: SemDiagnostic[],
): LinkedSetProperty {
  const to = normalizePropLikeName(host, ins.to, sem);
  const { target } = resolvePropertyTarget(host, to, "default", sem);
  if (target.kind === "unknown") {
    diags.push({
      code: "AU1104",
      message: `Property target '${to}' not found on host${host.kind === "element" ? ` <${host.tag}>` : ""}.`,
      span: ins.loc ?? null,
    });
  }
  return { kind: "setProperty", to, value: ins.value, target, loc: ins.loc ?? null };
}

/* ---- IteratorBinding (repeat) ---- */

function linkIteratorBinding(
  ins: IteratorBindingIR,
  _host: NodeSem,
  sem: Semantics,
  _diags: SemDiagnostic[],
): LinkedIteratorBinding {
  // Current builder does not emit tail options as aux (MVP); keep empty for now.
  const aux: LinkedIteratorBinding["aux"] = [];

  // Normalize the iterator prop name to Semantics (usually 'items')
  const normalizedTo = sem.resources.controllers.repeat.iteratorProp;

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
  sem: Semantics,
  diags: SemDiagnostic[],
): LinkedHydrateTemplateController {
  const ctrlSem = resolveControllerSem(sem, ins.res, ins.loc, diags);

  // Map controller props
  const props = ins.props.map((p) => {
    if (p.type === "iteratorBinding") {
      const iter = linkIteratorBinding(p, host, sem, diags);
      iter.to = sem.resources.controllers.repeat.iteratorProp; // ensure parity with spec
      return iter;
    } else if (p.type === "propertyBinding") {
      const to = normalizePropLikeName(host, p.to, sem);
      const target: TargetSem = {
        kind: "controller.prop",
        controller: ctrlSem,
        bindable: resolveControllerBindable(ctrlSem, to),
      };
      const effectiveMode = resolveEffectiveMode(p.mode, target, host, sem, to);
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
      case "case":
        branch = { kind: "case", expr: ins.branch.expr };
        break;
      case "default":
        branch = { kind: "default" };
        break;
      default:
        assertUnreachable(ins.branch as never);
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

function resolvePropertyTarget(
  host: NodeSem,
  to: string,
  mode: BindingMode,
  sem: Semantics,
): { target: TargetSem; effectiveMode: BindingMode } {
  // 1) Custom element bindable (component prop)
  if (host.kind === "element" && host.custom) {
    const bindable = host.custom.def.bindables[to];
    if (bindable) {
      const target: TargetSem = { kind: "element.bindable", element: host.custom, bindable };
      const effectiveMode = resolveEffectiveMode(mode, target, host, sem, to);
      return { target, effectiveMode };
    }
  }
  // 2) Native DOM prop
  if (host.kind === "element" && host.native) {
    const domProp = host.native.def.props[to];
    if (domProp) {
      const target: TargetSem = { kind: "element.nativeProp", element: host.native, prop: domProp };
      const effectiveMode = resolveEffectiveMode(mode, target, host, sem, to);
      return { target, effectiveMode };
    }
  }
  // 3) Unknown target
  const target: TargetSem = { kind: "unknown", reason: host.kind === "element" ? "no-prop" : "no-element" };
  const effectiveMode = resolveEffectiveMode(mode, target, host, sem, to);
  return { target, effectiveMode };
}

function resolveAttrTarget(host: NodeSem, to: string, sem: Semantics): TargetSem {
  if (host.kind === "element" && host.custom) {
    const b = host.custom.def.bindables[to];
    if (b) return { kind: "element.bindable", element: host.custom, bindable: b };
  }
  if (host.kind === "element" && host.native) {
    const p = host.native.def.props[to];
    if (p) return { kind: "element.nativeProp", element: host.native, prop: p };
  }
  return { kind: "unknown", reason: host.kind === "element" ? "no-prop" : "no-element" };
}

function resolveControllerSem(
  sem: Semantics,
  res: string,
  span: SourceSpan | null | undefined,
  diags: SemDiagnostic[],
): ControllerSem {
  switch (res) {
    case "repeat":  return { res, spec: sem.resources.controllers.repeat };
    case "with":    return { res, spec: sem.resources.controllers.with };
    case "promise": return { res, spec: sem.resources.controllers.promise };
    case "if":      return { res, spec: sem.resources.controllers.if };
    case "switch":  return { res, spec: sem.resources.controllers.switch };
    case "portal":  return { res, spec: sem.resources.controllers.portal };
    default:
      diags.push({ code: "AU1101", message: `Unknown controller '${res}'.`, span: span ?? null });
      // Fallback to 'with' shape to keep traversal alive
      return { res: "with", spec: { kind: "controller", res: "with", scope: "overlay", props: { value: { name: "value" } } } };
  }
}

function resolveControllerBindable(ctrl: ControllerSem, prop: string): Bindable {
  switch (ctrl.res) {
    case "repeat": {
      // repeat header tail options are not bindables; iterator handled separately.
      return { name: prop };
    }
    case "with":
    case "promise":
    case "if":
    case "switch":
    case "portal": {
      const b = ctrl.spec.props[prop];
      return b ?? { name: prop };
    }
    default:
      return assertUnreachable(ctrl as never);
  }
}

/* ============================================================================
 * Normalization & helpers
 * ============================================================================ */

/**
 * Attr → prop normalization for interpolation on attributes.
 * Priority: naming.perTag > dom.element.attrToProp > naming.global > camelCase.
 * Preserved prefixes (data-/aria-) are handled before this is called.
 */
function normalizeAttrToProp(host: NodeSem, rawAttr: string, sem: Semantics): string {
  const attr = rawAttr.toLowerCase();
  if (host.kind !== "element") return camelCase(attr);

  const tag = host.tag;

  // 1) naming.perTag (highest precedence)
  const perTag = sem.naming.perTag?.[tag]?.[attr];
  if (perTag) return perTag;

  // 2) dom.elements[tag].attrToProp overrides
  const elt = sem.dom.elements[tag];
  const domOverride = elt?.attrToProp?.[attr];
  if (domOverride) return domOverride;

  // 3) naming.global
  const global = sem.naming.attrToPropGlobal[attr];
  if (global) return global;

  // 4) host-aware case-insensitive canonicalization
  //    (handles 'classname' → 'className', 'valueasnumber' → 'valueAsNumber', etc.)
  const hostKey = lookupHostPropCaseInsensitive(host, attr);
  if (hostKey) return hostKey;

  // 5) fallback camelCase (kebab → camel)
  return camelCase(attr);
}

function lookupHostPropCaseInsensitive(host: NodeSem, raw: string): string | null {
  if (host.kind !== "element") return null;
  const needle = raw.toLowerCase();

  // 1) Prefer custom element bindables (component props)
  if (host.custom) {
    for (const k of Object.keys(host.custom.def.bindables)) {
      if (k.toLowerCase() === needle) return k;
    }
  }
  // 2) Then native DOM props for this tag
  if (host.native) {
    for (const k of Object.keys(host.native.def.props)) {
      if (k.toLowerCase() === needle) return k;
    }
  }
  return null;
}

/**
 * Property-like normalization for `.bind/.to-view` authored names that resemble attrs.
 * Handles cases like `minlength.bind` on `<input>` → `minLength`.
 * If it already looks like a prop (has uppercase, no hyphen), return as-is.
 */
function normalizePropLikeName(host: NodeSem, raw: string, sem: Semantics): string {
  const looksLikeProp = /[A-Z]/.test(raw) && !raw.includes("-");
  if (looksLikeProp) return raw;
  return normalizeAttrToProp(host, raw, sem);
}

/** data-* / aria-* must not be camelCased or mapped to props */
function hasPreservedPrefix(attr: string, sem: Semantics): boolean {
  const prefixes = sem.naming.preserveAttrPrefixes ?? ["data-", "aria-"];
  const lower = attr.toLowerCase();
  return prefixes.some((p) => lower.startsWith(p));
}

function resolveEventType(sem: Semantics, eventName: string, tag: string | null): TypeRef {
  if (tag) {
    const perEl = sem.events.byElement?.[tag]?.[eventName];
    if (perEl) return perEl;
  }
  return sem.events.byName[eventName] ?? { kind: "unknown" };
}

/**
 * Effective binding mode resolution:
 * - Authored mode wins when not 'default'
 * - Else controller/element bindable mode
 * - Else native DOM prop mode
 * - Else static two-way defaults (byTag/globalProps)
 * - Else 'toView'
 *
 * Conditional two-way cases (e.g., contenteditable) are deferred to Typecheck.
 */
function resolveEffectiveMode(
  mode: BindingMode,
  target: TargetSem,
  host: NodeSem,
  sem: Semantics,
  propName?: string,
): BindingMode {
  if (mode !== "default") return mode;

  switch (target.kind) {
    case "element.bindable":
      return target.bindable.mode ?? "toView";

    case "element.nativeProp": {
      const explicit = target.prop.mode;
      if (explicit) return explicit;

      const name = propName ?? "";
      if (host.kind === "element") {
        const byTag = sem.twoWayDefaults.byTag[host.tag] ?? [];
        if (byTag.includes(name)) return "twoWay";
      }
      if (sem.twoWayDefaults.globalProps.includes(name)) return "twoWay";

      return "toView";
    }

    case "controller.prop":
      return target.bindable.mode ?? "toView";

    case "attribute":
      return "toView";

    case "unknown":
      return "toView";

    default:
      return assertUnreachable(target as never);
  }
}

function camelCase(n: string): string {
  return n.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
}
