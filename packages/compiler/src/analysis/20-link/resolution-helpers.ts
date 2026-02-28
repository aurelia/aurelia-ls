import type { SourceSpan } from "../../model/ir.js";
import type { BindingMode, HydrateAttributeIR, HydrateElementIR } from "../../model/ir.js";
import type { Bindable, ControllerConfig } from "../../schema/registry.js";
import { toTypeRefOptional } from "../../convergence/convert.js";
import {
  getControllerConfig,
  STUB_CONTROLLER_CONFIG,
} from "../../schema/registry.js";
import type {
  AttrResRef,
  ControllerSem,
  IteratorAuxSpec,
  ElementResRef,
  NodeSem,
  TargetSem,
} from "./types.js";
import { camelCase } from "./name-normalizer.js";
import { type Diagnosed, pure, diag, withStub } from "../../shared/diagnosed.js";
import type { ResolveContext } from "./resolve-context.js";
import {
  planIteratorTailBinding,
  resolveIteratorTarget,
} from "../shared/controller-decisions.js";

export function resolvePropertyTarget(
  ctx: ResolveContext,
  host: NodeSem,
  to: string,
  mode: BindingMode,
): { target: TargetSem; effectiveMode: BindingMode } {
  // 1) Custom element bindable (component prop)
  if (host.kind === "element" && host.custom) {
    const bindable = host.custom.def.bindables[to];
    if (bindable) {
      ctx.services.debug.link("target.bindable", { to, element: host.custom.def.name, bindable: bindable.name });
      const target: TargetSem = { kind: "element.bindable", element: host.custom, bindable };
      const effectiveMode = resolveEffectiveMode(ctx, mode, target, host, to);
      return { target, effectiveMode };
    }
  }
  // 2) Native DOM prop
  if (host.kind === "element" && host.native) {
    const domProp = host.native.def.props[to];
    if (domProp) {
      ctx.services.debug.link("target.nativeProp", { to, tag: host.tag });
      const target: TargetSem = { kind: "element.nativeProp", element: host.native, prop: domProp };
      const effectiveMode = resolveEffectiveMode(ctx, mode, target, host, to);
      return { target, effectiveMode };
    }
  }
  // 3) Unknown target
  ctx.services.debug.link("target.unknown", { to, hostKind: host.kind, tag: host.kind === "element" ? host.tag : undefined });
  const target: TargetSem = { kind: "unknown", reason: host.kind === "element" ? "no-prop" : "no-element" };
  const effectiveMode = resolveEffectiveMode(ctx, mode, target, host, to);
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
 * 1. Controller configs from semantic authority (lookup.controller)
 *
 * Returns Diagnosed<ControllerSem>:
 * - On success: pure({ res, config }) with no diagnostics
 * - On failure: diag(aurelia/unknown-controller, { res, config: STUB }) with stub controller
 *
 * The stub config is marked with isStub() to enable cascade suppression.
 */
export function resolveControllerSem(
  ctx: ResolveContext,
  res: string,
  span: SourceSpan | null | undefined,
): Diagnosed<ControllerSem> {
  const lookup = ctx.lookup;
  const emitter = ctx.services.diagnostics;
  ctx.deps?.readResource("template-controller", res);
  // 1. Check scoped controller configs first (authoritative semantic source)
  const scopedConfig = lookup.controller(res);
  if (scopedConfig) {
    ctx.services.debug.link("controller.scoped", { name: res, trigger: scopedConfig.trigger.kind });
    return pure({ res, config: scopedConfig });
  }
  // 2. Fallback to builtins for defensive standalone usage
  const builtinConfig = getControllerConfig(res);
  if (builtinConfig) {
    ctx.services.debug.link("controller.builtin", { name: res, trigger: builtinConfig.trigger.kind });
    return pure({ res, config: builtinConfig });
  }

  // 3. Unknown controller - return stub + diagnostic
  ctx.services.debug.link("controller.unknown", { name: res });
  const hasGapInfo = lookup.hasGaps("template-controller", res);
  const gapQualifier = hasGapInfo ? " (analysis gaps exist for this resource)" : "";
  const diagnostic = emitter.emit("aurelia/unknown-controller", {
    message: `Unknown template controller '${res}'${gapQualifier}.`,
    span,
    data: {
      resourceKind: "template-controller",
      name: res,
      ...(hasGapInfo ? { confidence: "partial" as const } : {}),
    },
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
  ctx: ResolveContext,
  mode: BindingMode,
  target: TargetSem,
  host: NodeSem,
  propName?: string,
): BindingMode {
  if (mode !== "default") return mode;

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
      if (ctx.lookup.isTwoWayDefault(name, host.kind === "element" ? host.tag : undefined)) {
        return "twoWay";
      }

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

export function resolveElementResRef(ctx: ResolveContext, res: HydrateElementIR["res"]): ElementResRef | null {
  if (!res) return null;
  const name = typeof res === "string" ? res.toLowerCase() : res;
  if (typeof name === "string") ctx.deps?.readResource("custom-element", name);
  const resolved = typeof name === "string" ? ctx.lookup.element(name) : null;
  return resolved ? { def: resolved } : null;
}

export function resolveAttrResRef(ctx: ResolveContext, res: HydrateAttributeIR["res"]): AttrResRef | null {
  if (!res) return null;
  const name = typeof res === "string" ? res.toLowerCase() : res;
  if (typeof name === "string") ctx.deps?.readResource("custom-attribute", name);
  const resolved = typeof name === "string" ? ctx.lookup.attribute(name) : null;
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
  controller: ControllerConfig | null | undefined,
  name: string,
  authoredMode: BindingMode,
): IteratorAuxSpec | null {
  const decision = planIteratorTailBinding(controller, name, authoredMode);
  if (!decision.accepted || !decision.normalized) return null;
  const type = decision.normalized.type ? toTypeRefOptional(decision.normalized.type) : undefined;
  return { name: decision.normalized.name, mode: decision.normalized.mode, type: type ?? null };
}

export function resolveIteratorTargetProp(
  controller: ControllerConfig | null | undefined,
  fallback = "items",
): string {
  return resolveIteratorTarget(controller, fallback).to;
}

function unreachable(_x: never): never {
  throw new Error("unreachable");
}
