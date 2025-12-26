import type { SourceFacts, ClassFacts, BindableMemberFact } from "../extraction/types.js";
import type { ResolverResult, ResourceCandidate, BindableSpec } from "./types.js";
import type { ConventionConfig } from "../conventions/types.js";
import {
  getResourceTypeFromClassName,
  stripResourceSuffix,
  DEFAULT_CONVENTION_CONFIG,
  DEFAULT_SUFFIXES,
} from "../conventions/aurelia-defaults.js";
import { toKebabCase, toCamelCase } from "../util/naming.js";

/**
 * Resolve resource candidates from file/class naming conventions.
 * This is the lowest-priority resolver.
 *
 * Handles patterns like:
 * - MyCustomElement → custom element "my"
 * - DateFormatValueConverter → value converter "dateFormat"
 * - DebounceBindingBehavior → binding behavior "debounce"
 * - my-element.ts → custom element "my-element"
 *
 * See docs/aurelia-conventions.md for the full specification.
 */
export function resolveFromConventions(
  facts: SourceFacts,
  config?: ConventionConfig,
): ResolverResult {
  const effectiveConfig = config ?? DEFAULT_CONVENTION_CONFIG;

  // Skip if conventions are disabled
  if (effectiveConfig.enabled === false) {
    return { candidates: [], diagnostics: [] };
  }

  const candidates: ResourceCandidate[] = [];

  for (const cls of facts.classes) {
    // Skip classes that already have explicit resource definition
    // (decorators or static $au - those are handled by higher-priority resolvers)
    if (hasExplicitResourceDefinition(cls)) {
      continue;
    }

    const candidate = resolveClassByConvention(cls, facts.path, effectiveConfig);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return { candidates, diagnostics: [] };
}

/**
 * Check if a class has explicit resource definition (decorator or static $au).
 */
function hasExplicitResourceDefinition(cls: ClassFacts): boolean {
  // Has resource decorator?
  const resourceDecorators = [
    "customElement",
    "customAttribute",
    "templateController",
    "valueConverter",
    "bindingBehavior",
  ];
  if (cls.decorators.some((d) => resourceDecorators.includes(d.name))) {
    return true;
  }

  // Has static $au with type?
  if (cls.staticAu?.type) {
    return true;
  }

  return false;
}

/**
 * Resolve a class to a resource candidate by convention.
 */
function resolveClassByConvention(
  cls: ClassFacts,
  source: string,
  config: ConventionConfig,
): ResourceCandidate | null {
  // Determine resource type from class name suffix
  const resourceType = getResourceTypeFromClassName(cls.name, config);

  if (!resourceType) {
    // No suffix match - not a resource by convention
    return null;
  }

  // Get base name by stripping the suffix
  const baseName = stripResourceSuffix(cls.name);
  if (!baseName) {
    return null;
  }

  // Generate resource name based on type
  const resourceName = getResourceName(baseName, resourceType);
  if (!resourceName) {
    return null;
  }

  // Check if this is a template controller (special suffix)
  const isTemplateController = isTemplateControllerClass(cls.name, config);

  // Build bindable specs from @bindable members (conventions don't define bindables,
  // but the class might still have @bindable decorators on members)
  const bindables = buildBindableSpecs(cls.bindableMembers);

  // Build the candidate
  switch (resourceType) {
    case "element":
      return {
        kind: "element",
        name: resourceName,
        source: source as import("@aurelia-ls/compiler").NormalizedPath,
        className: cls.name,
        aliases: [],
        bindables,
        confidence: "inferred",
        resolver: "convention",
        boundary: true,
      };

    case "attribute":
      return {
        kind: "attribute",
        name: resourceName,
        source: source as import("@aurelia-ls/compiler").NormalizedPath,
        className: cls.name,
        aliases: [],
        bindables,
        confidence: "inferred",
        resolver: "convention",
        isTemplateController,
        primary: findPrimaryBindable(bindables),
      };

    case "valueConverter":
      return {
        kind: "valueConverter",
        name: resourceName,
        source: source as import("@aurelia-ls/compiler").NormalizedPath,
        className: cls.name,
        aliases: [],
        bindables: [],
        confidence: "inferred",
        resolver: "convention",
      };

    case "bindingBehavior":
      return {
        kind: "bindingBehavior",
        name: resourceName,
        source: source as import("@aurelia-ls/compiler").NormalizedPath,
        className: cls.name,
        aliases: [],
        bindables: [],
        confidence: "inferred",
        resolver: "convention",
      };
  }
}

/**
 * Generate resource name from base name based on resource type.
 *
 * Elements and attributes use kebab-case:
 *   MyCustom → my-custom
 *   FooBar → foo-bar
 *
 * Value converters and binding behaviors use camelCase (preserve first letter lowercase):
 *   DateFormat → dateFormat
 *   Debounce → debounce
 */
function getResourceName(
  baseName: string,
  resourceType: "element" | "attribute" | "valueConverter" | "bindingBehavior",
): string {
  switch (resourceType) {
    case "element":
    case "attribute":
      // Kebab-case: MyCustom → my-custom
      return toKebabCase(baseName);

    case "valueConverter":
    case "bindingBehavior":
      // camelCase: DateFormat → dateFormat, Debounce → debounce
      // First letter lowercase, rest preserved
      if (baseName.length === 0) return "";
      return baseName[0]!.toLowerCase() + baseName.slice(1);
  }
}

/**
 * Check if a class name indicates a template controller.
 */
function isTemplateControllerClass(className: string, config: ConventionConfig): boolean {
  const suffixes = config.suffixes?.templateController ?? DEFAULT_SUFFIXES.templateController;
  return suffixes.some((suffix) => className.endsWith(suffix));
}

/**
 * Build bindable specs from member facts.
 */
function buildBindableSpecs(members: readonly BindableMemberFact[]): BindableSpec[] {
  return members.map((m) => ({
    name: m.name,
    ...(m.mode ? { mode: m.mode } : {}),
    ...(m.primary ? { primary: m.primary } : {}),
    ...(m.inferredType ? { type: m.inferredType } : {}),
  }));
}

/**
 * Find the primary bindable from a list of specs.
 */
function findPrimaryBindable(specs: readonly BindableSpec[]): string | null {
  for (const s of specs) {
    if (s.primary) return s.name;
  }
  // If only one bindable, it's implicitly primary
  if (specs.length === 1 && specs[0]) {
    return specs[0].name;
  }
  return null;
}
