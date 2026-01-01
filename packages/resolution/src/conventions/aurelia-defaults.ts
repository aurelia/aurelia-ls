import type { ConventionConfig, SuffixConfig, FilePatternConfig } from "./types.js";
import { DEFAULT_STYLE_EXTENSIONS } from "../project/types.js";

/**
 * Aurelia resource decorator names.
 *
 * These are the decorators that explicitly declare a class as an Aurelia resource.
 * Used by transform package to detect declaration forms and by resolution to
 * identify decorated resources.
 */
export const DECORATOR_NAMES = {
  customElement: "customElement",
  customAttribute: "customAttribute",
  templateController: "templateController",
  valueConverter: "valueConverter",
  bindingBehavior: "bindingBehavior",
  bindable: "bindable",
} as const;

/**
 * List of all resource decorator names (excludes bindable which is a property decorator).
 */
export const RESOURCE_DECORATOR_NAMES = [
  DECORATOR_NAMES.customElement,
  DECORATOR_NAMES.customAttribute,
  DECORATOR_NAMES.templateController,
  DECORATOR_NAMES.valueConverter,
  DECORATOR_NAMES.bindingBehavior,
] as const;

/**
 * Default Aurelia class name suffix patterns.
 *
 * Based on @aurelia/plugin-conventions.
 * See docs/aurelia-conventions.md for details.
 */
export const DEFAULT_SUFFIXES: Required<SuffixConfig> = {
  element: ["CustomElement", "Element"],
  attribute: ["CustomAttribute", "Attribute"],
  templateController: ["TemplateController"],
  valueConverter: ["ValueConverter", "Converter"],
  bindingBehavior: ["BindingBehavior", "Behavior"],
};

/**
 * Default Aurelia file patterns.
 */
export const DEFAULT_FILE_PATTERNS: Required<FilePatternConfig> = {
  element: ["*.element.ts", "*-element.ts", "*.element.js", "*-element.js"],
  attribute: ["*.attribute.ts", "*-attribute.ts", "*.attribute.js", "*-attribute.js"],
  valueConverter: ["*.converter.ts", "*-converter.ts", "*.converter.js", "*-converter.js"],
  bindingBehavior: ["*.behavior.ts", "*-behavior.ts", "*.behavior.js", "*-behavior.js"],
};

/**
 * Default view-model file extensions.
 */
export const DEFAULT_VIEW_MODEL_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

/**
 * Default template file extensions.
 */
export const DEFAULT_TEMPLATE_EXTENSIONS = [".html"];

/**
 * Default convention configuration.
 *
 * Note: `directories`, `templatePairing`, and `stylesheetPairing` are
 * intentionally omitted. When undefined, the resolution pipeline uses
 * its built-in defaults (DEFAULT_DIRECTORY_CONVENTIONS, etc.).
 */
export const DEFAULT_CONVENTION_CONFIG: ConventionConfig = {
  enabled: true,
  suffixes: DEFAULT_SUFFIXES,
  filePatterns: DEFAULT_FILE_PATTERNS,
  viewModelExtensions: DEFAULT_VIEW_MODEL_EXTENSIONS,
  templateExtensions: DEFAULT_TEMPLATE_EXTENSIONS,
  styleExtensions: DEFAULT_STYLE_EXTENSIONS,
  // directories, templatePairing, stylesheetPairing use built-in defaults when undefined
};

/**
 * Regex pattern to extract resource type from class name.
 *
 * Captures:
 * - Group 1: Base name (e.g., "MyCustom" from "MyCustomElement")
 * - Group 2: Suffix (e.g., "Element", "ValueConverter")
 */
export const CLASS_NAME_PATTERN =
  /^(.+?)(CustomElement|Element|CustomAttribute|Attribute|TemplateController|ValueConverter|Converter|BindingBehavior|Behavior)?$/;

/**
 * Determine resource type from class name suffix.
 */
export function getResourceTypeFromClassName(
  className: string,
  config: ConventionConfig = DEFAULT_CONVENTION_CONFIG,
): "element" | "attribute" | "valueConverter" | "bindingBehavior" | null {
  const suffixes = config.suffixes ?? DEFAULT_SUFFIXES;

  // Check element suffixes
  for (const suffix of suffixes.element ?? DEFAULT_SUFFIXES.element) {
    if (className.endsWith(suffix)) {
      return "element";
    }
  }

  // Check attribute suffixes (includes template controller)
  for (const suffix of suffixes.attribute ?? DEFAULT_SUFFIXES.attribute) {
    if (className.endsWith(suffix)) {
      return "attribute";
    }
  }
  for (const suffix of suffixes.templateController ?? DEFAULT_SUFFIXES.templateController) {
    if (className.endsWith(suffix)) {
      return "attribute";
    }
  }

  // Check value converter suffixes
  for (const suffix of suffixes.valueConverter ?? DEFAULT_SUFFIXES.valueConverter) {
    if (className.endsWith(suffix)) {
      return "valueConverter";
    }
  }

  // Check binding behavior suffixes
  for (const suffix of suffixes.bindingBehavior ?? DEFAULT_SUFFIXES.bindingBehavior) {
    if (className.endsWith(suffix)) {
      return "bindingBehavior";
    }
  }

  return null;
}

/**
 * Strip the resource type suffix from a class name to get the base name.
 */
export function stripResourceSuffix(className: string): string {
  const match = CLASS_NAME_PATTERN.exec(className);
  return match?.[1] ?? className;
}
