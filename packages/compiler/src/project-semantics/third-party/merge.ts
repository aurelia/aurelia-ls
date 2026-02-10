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
  ExplicitBindableConfig,
  ExplicitResourceConfig,
  ExplicitElementConfig,
  ExplicitAttributeConfig,
} from "./types.js";
import {
  mergePartialResourceCollections as mergeDefinitionPartialResourceCollections,
  mergeResolvedResourceCollections as mergeDefinitionResolvedResourceCollections,
} from "../definition/index.js";

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
  return mergeDefinitionResolvedResourceCollections(base, extra);
}

/**
 * Merge extra resources into scope-level resources (both partial).
 */
export function mergeScopeResources(
  base: Partial<ResourceCollections> | undefined,
  extra: Partial<ResourceCollections>,
): Partial<ResourceCollections> {
  return mergeDefinitionPartialResourceCollections(base, extra);
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
  bindables: Record<string, ExplicitBindableConfig> | undefined,
): Record<string, Bindable> {
  const output: Record<string, Bindable> = {};
  if (!bindables) return output;

  for (const key of Object.keys(bindables).sort((left, right) => left.localeCompare(right))) {
    const def = bindables[key] ?? {};
    const name = normalizeBindablePropertyName(def.property, key);
    if (!name) continue;
    const attribute = normalizeOptionalString(def.attribute);
    const mode = toBindingMode(def.mode);
    const primary = def.primary;
    const type = toTypeRef(def.type);
    const doc = normalizeOptionalString(def.doc);
    output[name] = {
      name,
      ...(attribute ? { attribute } : {}),
      ...(mode ? { mode } : {}),
      ...(primary !== undefined ? { primary } : {}),
      ...(type ? { type } : {}),
      ...(doc ? { doc } : {}),
    };
  }

  return output;
}

function toBindingMode(mode: ExplicitBindableConfig["mode"] | undefined): BindingMode | undefined {
  if (!mode) return undefined;
  return MODE_MAP[mode];
}

function toTypeRef(type: string | undefined): Bindable["type"] {
  const normalized = normalizeOptionalString(type);
  if (!normalized) return undefined;
  if (normalized === "any") return { kind: "any" };
  if (normalized === "unknown") return { kind: "unknown" };
  return { kind: "ts", name: normalized };
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBindablePropertyName(property: string | undefined, fallbackKey: string): string | undefined {
  const normalizedProperty = normalizeOptionalString(property);
  if (normalizedProperty) return normalizedProperty;
  return normalizeOptionalString(fallbackKey);
}
