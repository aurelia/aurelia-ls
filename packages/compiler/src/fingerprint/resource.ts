import type {
  AttributePatternConfig,
  AttrRes,
  BindingBehaviorSig,
  BindingCommandConfig,
  ControllerConfig,
  ElementRes,
  ValueConverterSig,
} from "../schema/index.js";
import { stableHash } from "../pipeline/index.js";

// Usage-level fingerprints for template invalidation.
// These intentionally exclude provenance/packaging metadata so that cache
// invalidation only tracks semantic changes that affect template resolution.

export function fingerprintElementRes(value: ElementRes | null | undefined): string {
  if (!value) return "missing";
  return stableHash({
    kind: value.kind,
    name: value.name,
    bindables: value.bindables,
    aliases: value.aliases ?? null,
    containerless: value.containerless ?? null,
    shadowOptions: value.shadowOptions ?? null,
    capture: value.capture ?? null,
    processContent: value.processContent ?? null,
    boundary: value.boundary ?? null,
  });
}

export function fingerprintAttrRes(value: AttrRes | null | undefined): string {
  if (!value) return "missing";
  return stableHash({
    kind: value.kind,
    name: value.name,
    bindables: value.bindables,
    aliases: value.aliases ?? null,
    primary: value.primary ?? null,
    isTemplateController: value.isTemplateController ?? null,
    noMultiBindings: value.noMultiBindings ?? null,
  });
}

export function fingerprintControllerConfig(value: ControllerConfig | null | undefined): string {
  if (!value) return "missing";
  return stableHash({
    name: value.name,
    trigger: value.trigger,
    scope: value.scope,
    cardinality: value.cardinality ?? null,
    placement: value.placement ?? null,
    branches: value.branches ?? null,
    linksTo: value.linksTo ?? null,
    injects: value.injects ?? null,
    tailProps: value.tailProps ?? null,
    props: value.props ?? null,
  });
}

export function fingerprintTemplateControllerUsage(
  config: ControllerConfig | null | undefined,
  attr: AttrRes | null | undefined,
): string {
  return stableHash({
    controller: fingerprintControllerConfig(config),
    attribute: fingerprintAttrRes(attr),
  });
}

export function fingerprintValueConverterSig(value: ValueConverterSig | null | undefined): string {
  if (!value) return "missing";
  return stableHash({
    name: value.name,
    in: value.in,
    out: value.out,
  });
}

export function fingerprintBindingBehaviorSig(value: BindingBehaviorSig | null | undefined): string {
  if (!value) return "missing";
  return stableHash({ name: value.name });
}

export function fingerprintBindingCommandConfig(value: BindingCommandConfig | null | undefined): string {
  if (!value) return "missing";
  return stableHash({
    name: value.name,
    kind: value.kind,
    mode: value.mode ?? null,
    capture: value.capture ?? null,
    forceAttribute: value.forceAttribute ?? null,
  });
}

export function fingerprintAttributePatternConfig(value: AttributePatternConfig | null | undefined): string {
  if (!value) return "missing";
  return stableHash({
    pattern: value.pattern,
    symbols: value.symbols,
    interpret: value.interpret,
  });
}
