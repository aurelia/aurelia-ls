import type { SourceSpan } from "../../model/ir.js";
import type { BindingMode, HydrateAttributeIR, HydrateElementIR } from "../../model/ir.js";
import type { Bindable } from "../../language/registry.js";
import type { SemanticsLookup } from "../../language/registry.js";
import type {
  AttrResRef,
  ControllerSem,
  IteratorAuxSpec,
  ElementResRef,
  NodeSem,
  SemDiagnostic,
  SemDiagCode,
  TargetSem,
} from "./types.js";
import { camelCase } from "./name-normalizer.js";

export function pushDiag(diags: SemDiagnostic[], code: SemDiagCode, message: string, span?: SourceSpan | null): void {
  diags.push({ code, message, span: span ?? null });
}

export function resolvePropertyTarget(
  host: NodeSem,
  to: string,
  mode: BindingMode,
  lookup: SemanticsLookup,
): { target: TargetSem; effectiveMode: BindingMode } {
  // 1) Custom element bindable (component prop)
  if (host.kind === "element" && host.custom) {
    const bindable = host.custom.def.bindables[to];
    if (bindable) {
      const target: TargetSem = { kind: "element.bindable", element: host.custom, bindable };
      const effectiveMode = resolveEffectiveMode(mode, target, host, lookup, to);
      return { target, effectiveMode };
    }
  }
  // 2) Native DOM prop
  if (host.kind === "element" && host.native) {
    const domProp = host.native.def.props[to];
    if (domProp) {
      const target: TargetSem = { kind: "element.nativeProp", element: host.native, prop: domProp };
      const effectiveMode = resolveEffectiveMode(mode, target, host, lookup, to);
      return { target, effectiveMode };
    }
  }
  // 3) Unknown target
  const target: TargetSem = { kind: "unknown", reason: host.kind === "element" ? "no-prop" : "no-element" };
  const effectiveMode = resolveEffectiveMode(mode, target, host, lookup, to);
  return { target, effectiveMode };
}

export function resolveAttrTarget(host: NodeSem, to: string): TargetSem {
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

export function resolveControllerSem(
  lookup: SemanticsLookup,
  res: string,
  diags: SemDiagnostic[],
  span: SourceSpan | null | undefined,
): ControllerSem {
  const sem = lookup.sem;
  switch (res) {
    case "repeat":
      return { res, spec: sem.resources.controllers.repeat };
    case "with":
      return { res, spec: sem.resources.controllers.with };
    case "promise":
      return { res, spec: sem.resources.controllers.promise };
    case "if":
      return { res, spec: sem.resources.controllers.if };
    case "switch":
      return { res, spec: sem.resources.controllers.switch };
    case "portal":
      return { res, spec: sem.resources.controllers.portal };
    default:
      pushDiag(diags, "AU1101", `Unknown controller '${res}'.`, span);
      // Fallback to 'with' shape to keep traversal alive
      return { res: "with", spec: { kind: "controller", res: "with", scope: "overlay", props: { value: { name: "value" } } } };
  }
}

export function resolveControllerBindable(ctrl: ControllerSem, prop: string): Bindable {
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
      return unreachable(ctrl);
  }
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
export function resolveEffectiveMode(
  mode: BindingMode,
  target: TargetSem,
  host: NodeSem,
  lookup: SemanticsLookup,
  propName?: string,
): BindingMode {
  if (mode !== "default") return mode;

  const sem = lookup.sem;

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

    case "attribute.bindable":
      return target.bindable.mode ?? "toView";

    case "attribute":
      return "toView";

    case "unknown":
      return "toView";

    default:
      return unreachable(target);
  }
}

export function resolveElementResRef(res: HydrateElementIR["res"], lookup: SemanticsLookup): ElementResRef | null {
  if (!res) return null;
  const name = typeof res === "string" ? res.toLowerCase() : res;
  const resolved = typeof name === "string" ? lookup.element(name) : null;
  return resolved ? { def: resolved } : null;
}

export function resolveAttrResRef(res: HydrateAttributeIR["res"], lookup: SemanticsLookup): AttrResRef | null {
  if (!res) return null;
  const name = typeof res === "string" ? res.toLowerCase() : res;
  const resolved = typeof name === "string" ? lookup.attribute(name) : null;
  return resolved ? { def: resolved } : null;
}

export function resolveAttrBindable(attr: AttrResRef, to: string): Bindable | null {
  const c = to.includes("-") ? camelCase(to) : to;
  return attr.def.bindables[c] ?? null;
}

export function resolveBindableMode(mode: BindingMode, bindable: Bindable | null | undefined): BindingMode {
  if (mode !== "default") return mode;
  return bindable?.mode ?? "toView";
}

export function resolveIteratorAuxSpec(
  lookup: SemanticsLookup,
  name: string,
  authoredMode: BindingMode,
): IteratorAuxSpec | null {
  const tailSpec = lookup.sem.resources.controllers.repeat.tailProps?.[name];
  if (!tailSpec) return null;
  const accepts = tailSpec.accepts ?? ["bind", null];
  const incoming: "bind" | null = authoredMode === "default" ? null : "bind";
  if (!accepts.includes(incoming)) return null;
  // .bind overrides default to 'toView' unless spec says otherwise; literals stay as default
  const mode: BindingMode | null = incoming === "bind" ? "toView" : null;
  return { name: tailSpec.name, mode, type: tailSpec.type ?? null };
}

function unreachable(x: never): never {
  throw new Error("unreachable");
}
