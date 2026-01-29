/**
 * Third-party resource merge utilities.
 *
 * Build explicit resources from config, check for content,
 * and merge resource collections.
 */

import type {
  AttrRes,
  Bindable,
  BindingBehaviorSig,
  BindingMode,
  ElementRes,
  ResourceCollections,
  ValueConverterSig,
} from "../compiler.js";
import type {
  ExplicitResourceConfig,
  ExplicitElementConfig,
  ExplicitAttributeConfig,
} from "./types.js";

type MutableResourceCollections = {
  elements?: Record<string, ElementRes>;
  attributes?: Record<string, AttrRes>;
  controllers?: ResourceCollections["controllers"];
  valueConverters?: Record<string, ValueConverterSig>;
  bindingBehaviors?: Record<string, BindingBehaviorSig>;
};

const MODE_MAP: Record<string, BindingMode> = {
  "one-time": "oneTime",
  "to-view": "toView",
  "from-view": "fromView",
  "two-way": "twoWay",
};

/**
 * Build resource collections from explicit config declarations.
 */
export function buildThirdPartyResources(
  config?: ExplicitResourceConfig,
): Partial<ResourceCollections> {
  const elements = buildElements(config?.elements);
  const attributes = buildAttributes(config?.attributes);
  const valueConverters = buildValueConverters(config?.valueConverters);
  const bindingBehaviors = buildBindingBehaviors(config?.bindingBehaviors);

  const resources: MutableResourceCollections = {};
  if (Object.keys(elements).length > 0) {
    resources.elements = elements;
  }
  if (Object.keys(attributes).length > 0) {
    resources.attributes = attributes;
  }
  if (Object.keys(valueConverters).length > 0) {
    resources.valueConverters = valueConverters;
  }
  if (Object.keys(bindingBehaviors).length > 0) {
    resources.bindingBehaviors = bindingBehaviors;
  }

  return resources;
}

/**
 * Check if a partial resource collection has any entries.
 */
export function hasThirdPartyResources(resources: Partial<ResourceCollections>): boolean {
  return Boolean(
    (resources.elements && Object.keys(resources.elements).length > 0) ||
    (resources.attributes && Object.keys(resources.attributes).length > 0) ||
    (resources.controllers && Object.keys(resources.controllers).length > 0) ||
    (resources.valueConverters && Object.keys(resources.valueConverters).length > 0) ||
    (resources.bindingBehaviors && Object.keys(resources.bindingBehaviors).length > 0),
  );
}

/**
 * Merge two resource collections (base + extra).
 */
export function mergeResourceCollections(
  base: ResourceCollections,
  extra: Partial<ResourceCollections>,
): ResourceCollections {
  return {
    elements: extra.elements ? { ...base.elements, ...extra.elements } : base.elements,
    attributes: extra.attributes ? { ...base.attributes, ...extra.attributes } : base.attributes,
    controllers: extra.controllers ? { ...base.controllers, ...extra.controllers } : base.controllers,
    valueConverters: extra.valueConverters
      ? { ...base.valueConverters, ...extra.valueConverters }
      : base.valueConverters,
    bindingBehaviors: extra.bindingBehaviors
      ? { ...base.bindingBehaviors, ...extra.bindingBehaviors }
      : base.bindingBehaviors,
  };
}

/**
 * Merge extra resources into scope-level resources (both partial).
 */
export function mergeScopeResources(
  base: Partial<ResourceCollections> | undefined,
  extra: Partial<ResourceCollections>,
): Partial<ResourceCollections> {
  const merged: MutableResourceCollections = { ...(base ?? {}) };
  if (extra.elements) {
    merged.elements = { ...(base?.elements ?? {}), ...extra.elements };
  }
  if (extra.attributes) {
    merged.attributes = { ...(base?.attributes ?? {}), ...extra.attributes };
  }
  if (extra.controllers) {
    merged.controllers = { ...(base?.controllers ?? {}), ...extra.controllers };
  }
  if (extra.valueConverters) {
    merged.valueConverters = { ...(base?.valueConverters ?? {}), ...extra.valueConverters };
  }
  if (extra.bindingBehaviors) {
    merged.bindingBehaviors = { ...(base?.bindingBehaviors ?? {}), ...extra.bindingBehaviors };
  }
  return merged;
}

// ============================================================================
// Builders
// ============================================================================

function buildElements(
  entries: Record<string, ExplicitElementConfig> | undefined,
): Record<string, ElementRes> {
  const elements: Record<string, ElementRes> = {};
  if (!entries) return elements;

  for (const [rawName, def] of Object.entries(entries)) {
    const name = normalizeResourceName(rawName);
    elements[name] = {
      kind: "element",
      name,
      bindables: toBindables(def.bindables),
      ...(def.containerless !== undefined ? { containerless: def.containerless } : {}),
      ...(def.shadowOptions ? { shadowOptions: def.shadowOptions } : {}),
    };
  }

  return elements;
}

function buildAttributes(
  entries: Record<string, ExplicitAttributeConfig> | undefined,
): Record<string, AttrRes> {
  const attributes: Record<string, AttrRes> = {};
  if (!entries) return attributes;

  for (const [rawName, def] of Object.entries(entries)) {
    const name = normalizeResourceName(rawName);
    attributes[name] = {
      kind: "attribute",
      name,
      bindables: toBindables(def.bindables),
      ...(def.isTemplateController !== undefined ? { isTemplateController: def.isTemplateController } : {}),
      ...(def.noMultiBindings !== undefined ? { noMultiBindings: def.noMultiBindings } : {}),
    };
  }

  return attributes;
}

function buildValueConverters(entries: string[] | undefined): Record<string, ValueConverterSig> {
  const valueConverters: Record<string, ValueConverterSig> = {};
  if (!entries) return valueConverters;

  for (const rawName of entries) {
    const name = normalizeResourceName(rawName);
    valueConverters[name] = {
      name,
      in: { kind: "unknown" },
      out: { kind: "unknown" },
    };
  }

  return valueConverters;
}

function buildBindingBehaviors(entries: string[] | undefined): Record<string, BindingBehaviorSig> {
  const bindingBehaviors: Record<string, BindingBehaviorSig> = {};
  if (!entries) return bindingBehaviors;

  for (const rawName of entries) {
    const name = normalizeResourceName(rawName);
    bindingBehaviors[name] = { name };
  }

  return bindingBehaviors;
}

function normalizeResourceName(name: string): string {
  return name.trim().toLowerCase();
}

function toBindables(
  bindables: Record<string, { mode?: "one-time" | "to-view" | "from-view" | "two-way" }> | undefined,
): Record<string, Bindable> {
  const output: Record<string, Bindable> = {};
  if (!bindables) return output;

  for (const [name, def] of Object.entries(bindables)) {
    const mode = toBindingMode(def.mode);
    output[name] = {
      name,
      ...(mode ? { mode } : {}),
    };
  }

  return output;
}

function toBindingMode(mode: string | undefined): BindingMode | undefined {
  if (!mode) return undefined;
  return MODE_MAP[mode];
}
