import type { SourceSpan } from "../../model/ir.js";
import type { BindingMode, HydrateAttributeIR, HydrateElementIR } from "../../model/ir.js";
import type { Bindable } from "../../language/registry.js";
import type { SemanticsLookup } from "../../language/registry.js";
import { toTypeRefOptional } from "../../language/convert.js";
import {
  getControllerConfig,
  STUB_CONTROLLER_CONFIG,
  createCustomControllerConfig,
} from "../../language/registry.js";
import { debug } from "../../shared/debug.js";
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
import { buildDiagnostic, type CompilerDiagnostic } from "../../shared/diagnostics.js";
import { type Diagnosed, pure, diag, withStub } from "../../shared/diagnosed.js";

export function pushDiag(diags: SemDiagnostic[], code: SemDiagCode, message: string, span?: SourceSpan | null): void {
  const diag: CompilerDiagnostic = buildDiagnostic({
    code,
    message,
    span,
    source: "resolve-host",
  });
  diags.push(diag as SemDiagnostic);
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
      debug.resolve("target.bindable", { to, element: host.custom.def.name, bindable: bindable.name });
      const target: TargetSem = { kind: "element.bindable", element: host.custom, bindable };
      const effectiveMode = resolveEffectiveMode(mode, target, host, lookup, to);
      return { target, effectiveMode };
    }
  }
  // 2) Native DOM prop
  if (host.kind === "element" && host.native) {
    const domProp = host.native.def.props[to];
    if (domProp) {
      debug.resolve("target.nativeProp", { to, tag: host.tag });
      const target: TargetSem = { kind: "element.nativeProp", element: host.native, prop: domProp };
      const effectiveMode = resolveEffectiveMode(mode, target, host, lookup, to);
      return { target, effectiveMode };
    }
  }
  // 3) Unknown target
  debug.resolve("target.unknown", { to, hostKind: host.kind, tag: host.kind === "element" ? host.tag : undefined });
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

/**
 * Resolve controller semantics using unified ControllerConfig.
 *
 * Resolution order:
 * 1. Built-in controller configs (if, repeat, with, etc.)
 * 2. Custom template controllers in attributes (via @templateController decorator)
 *
 * Returns Diagnosed<ControllerSem>:
 * - On success: pure({ res, config }) with no diagnostics
 * - On failure: diag(AU1101, { res, config: STUB }) with stub controller
 *
 * The stub config is marked with isStub() to enable cascade suppression.
 */
export function resolveControllerSem(
  lookup: SemanticsLookup,
  res: string,
  span: SourceSpan | null | undefined,
): Diagnosed<ControllerSem> {
  // 1. Check built-in controller configs
  const builtinConfig = getControllerConfig(res);
  if (builtinConfig) {
    debug.resolve("controller.builtin", { name: res, trigger: builtinConfig.trigger.kind });
    return pure({ res, config: builtinConfig });
  }

  // 2. Check custom TCs in attributes (discovered via @templateController decorator)
  const customAttr = lookup.attribute(res);
  if (customAttr?.isTemplateController) {
    debug.resolve("controller.custom", { name: res, primary: customAttr.primary });
    const customConfig = createCustomControllerConfig(
      customAttr.name,
      customAttr.primary,
      customAttr.bindables
    );
    return pure({ res, config: customConfig });
  }

  // 3. Unknown controller - return stub + diagnostic
  debug.resolve("controller.unknown", { name: res });
  const diagnostic = buildDiagnostic({
    code: "AU1101" as SemDiagCode,
    message: `Unknown template controller '${res}'.`,
    span,
    source: "resolve-host",
  });

  const stubConfig = withStub({ ...STUB_CONTROLLER_CONFIG }, { span: span ?? undefined, diagnostic });
  return diag(diagnostic, { res, config: stubConfig });
}

/**
 * Resolve a controller's bindable property by name.
 * Uses the unified ControllerConfig.props lookup.
 */
export function resolveControllerBindable(ctrl: ControllerSem, prop: string): Bindable {
  // Config-driven: look up in controller's props, fall back to default bindable
  return ctrl.config.props?.[prop] ?? { name: prop };
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
  const bindableMode = (value: BindingMode | undefined): BindingMode => {
    if (!value || value === "default") return "toView";
    return value;
  };

  switch (target.kind) {
    case "element.bindable":
      return bindableMode(target.bindable.mode);

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
      return bindableMode(target.bindable.mode);

    case "attribute.bindable":
      return bindableMode(target.bindable.mode);

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
  const bindableMode = bindable?.mode;
  if (!bindableMode || bindableMode === "default") return "toView";
  return bindableMode;
}

export function resolveIteratorAuxSpec(
  lookup: SemanticsLookup,
  name: string,
  authoredMode: BindingMode,
): IteratorAuxSpec | null {
  const repeatConfig = lookup.sem.resources.controllers["repeat"];
  const tailSpec = repeatConfig?.tailProps?.[name];
  if (!tailSpec) return null;
  const accepts = tailSpec.accepts ?? ["bind", null];
  const incoming: "bind" | null = authoredMode === "default" ? null : "bind";
  if (!accepts.includes(incoming)) return null;
  // .bind overrides default to 'toView' unless spec says otherwise; literals stay as default
  const mode: BindingMode | null = incoming === "bind" ? "toView" : null;
  const type = tailSpec.type ? toTypeRefOptional(tailSpec.type) : undefined;
  return { name: tailSpec.name, mode, type: type ?? null };
}

function unreachable(_x: never): never {
  throw new Error("unreachable");
}
