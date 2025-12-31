import type { SourceFacts, ClassFacts, BindableMemberFact, ImportFact } from "../extraction/types.js";
import type { ResolverResult, ResourceCandidate, BindableSpec } from "./types.js";
import type { ConventionConfig } from "../conventions/types.js";
import {
  getResourceTypeFromClassName,
  stripResourceSuffix,
  DEFAULT_CONVENTION_CONFIG,
  DEFAULT_SUFFIXES,
  DEFAULT_TEMPLATE_EXTENSIONS,
} from "../conventions/aurelia-defaults.js";
import { toKebabCase, toCamelCase, getBaseName, isKindOfSame } from "../util/naming.js";
import { debug } from "@aurelia-ls/compiler";

/**
 * Resolve resource candidates from file/class naming conventions.
 * This is the lowest-priority resolver.
 *
 * Handles two convention types:
 *
 * 1. **Suffix conventions** (class name determines resource type):
 *    - MyCustomElement → custom element "my"
 *    - DateFormatValueConverter → value converter "dateFormat"
 *    - DebounceBindingBehavior → binding behavior "debounce"
 *
 * 2. **Template-pairing conventions** (HTML import determines custom element):
 *    - `import template from './foo.html'` + class `Foo` → custom element "foo"
 *    - Class name must match file name (e.g., CortexDevices in cortex-devices.ts)
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
    debug.resolution("convention.skip", { reason: "disabled", path: facts.path });
    return { candidates: [], diagnostics: [] };
  }

  const candidates: ResourceCandidate[] = [];

  // Find template imports for template-pairing convention
  const templateImports = findTemplateImports(facts.imports, effectiveConfig);
  debug.resolution("convention.templateImports", {
    path: facts.path,
    count: templateImports.length,
    imports: templateImports.map((i) => i.moduleSpecifier),
  });

  for (const cls of facts.classes) {
    // Skip classes that already have explicit resource definition
    // (decorators or static $au - those are handled by higher-priority resolvers)
    if (hasExplicitResourceDefinition(cls)) {
      debug.resolution("convention.skip.explicit", { className: cls.name });
      continue;
    }

    // Try suffix-based convention first
    const candidate = resolveClassByConvention(cls, facts.path, effectiveConfig);
    if (candidate) {
      debug.resolution("convention.suffix.match", {
        className: cls.name,
        resourceName: candidate.name,
        kind: candidate.kind,
      });
      candidates.push(candidate);
      continue;
    }

    // Try template-pairing convention if suffix didn't match
    const templateCandidate = resolveClassByTemplatePairing(
      cls,
      facts.path,
      templateImports,
      effectiveConfig,
    );
    if (templateCandidate) {
      debug.resolution("convention.templatePairing.match", {
        className: cls.name,
        resourceName: templateCandidate.name,
        templateImport: templateImports[0]?.moduleSpecifier,
      });
      candidates.push(templateCandidate);
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

// ============================================================================
// Template-Pairing Convention Support
// ============================================================================

/**
 * Find template imports (HTML file imports) from import facts.
 *
 * Looks for patterns like:
 * - `import template from './foo.html'`
 * - `import myTemplate from '../templates/bar.html'`
 */
function findTemplateImports(
  imports: readonly ImportFact[],
  config: ConventionConfig,
): ImportFact[] {
  const templateExtensions = config.templateExtensions ?? DEFAULT_TEMPLATE_EXTENSIONS;

  return imports.filter((imp) => {
    // Only default imports are valid for template pairing
    if (imp.kind !== "default") return false;

    // Check if module specifier ends with a template extension
    const specifier = imp.moduleSpecifier;
    return templateExtensions.some((ext) => specifier.endsWith(ext));
  });
}

/**
 * Resolve a class to a custom element by template-pairing convention.
 *
 * This handles the Aurelia convention where:
 * - A class has `import template from './foo.html'`
 * - The class name matches the file name (e.g., `Foo` in `foo.ts`)
 * - Result: custom element with name derived from file name
 *
 * This is based on @aurelia/plugin-conventions behavior.
 */
function resolveClassByTemplatePairing(
  cls: ClassFacts,
  sourcePath: string,
  templateImports: readonly ImportFact[],
  config: ConventionConfig,
): ResourceCandidate | null {
  // Must have at least one template import
  if (templateImports.length === 0) {
    return null;
  }

  // Get expected resource name from file path (kebab-case)
  const fileBaseName = getBaseName(sourcePath);
  const expectedResourceName = toKebabCase(fileBaseName);

  // Get resource name from class name (also kebab-case)
  const classResourceName = toKebabCase(cls.name);

  // Check if class name matches file name (allowing for case/hyphen differences)
  if (!isKindOfSame(fileBaseName, cls.name)) {
    debug.resolution("convention.templatePairing.noMatch", {
      className: cls.name,
      fileBaseName,
      classResourceName,
      expectedResourceName,
    });
    return null;
  }

  // Find a matching template import (same base name as the source file)
  const matchingTemplate = templateImports.find((imp) => {
    const templateBaseName = getBaseName(imp.moduleSpecifier);
    return isKindOfSame(templateBaseName, fileBaseName);
  });

  if (!matchingTemplate) {
    debug.resolution("convention.templatePairing.noTemplateMatch", {
      className: cls.name,
      fileBaseName,
      templateImports: templateImports.map((i) => i.moduleSpecifier),
    });
    return null;
  }

  // Build bindable specs from @bindable members
  const bindables = buildBindableSpecs(cls.bindableMembers);

  // Create custom element candidate
  return {
    kind: "element",
    name: expectedResourceName,
    source: sourcePath as import("@aurelia-ls/compiler").NormalizedPath,
    className: cls.name,
    aliases: [],
    bindables,
    confidence: "inferred",
    resolver: "convention",
    boundary: true,
  };
}
