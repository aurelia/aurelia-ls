/**
 * Component Definition Patching
 *
 * Utilities for patching component class $au definitions with AOT-compiled output.
 * This allows loading real component classes (with their logic) and replacing
 * their template compilation with pre-compiled AOT output.
 */

import type { IInstruction } from "@aurelia/template-compiler";
import type { AotCompileResult } from "../aot.js";

/**
 * The shape of Aurelia's static $au property on component classes.
 * This is a subset of the full CustomElementDefinition - we only define
 * what we need to read/write for patching.
 */
export interface StaticAuDefinition {
  type: "custom-element";
  name: string;
  template: string | HTMLTemplateElement | null;
  instructions: IInstruction[][];
  needsCompile: boolean;

  // Preserved metadata (not modified by patching)
  bindables?: Record<string, unknown>;
  containerless?: boolean;
  shadowOptions?: { mode: "open" | "closed" } | null;
  dependencies?: unknown[];
  aliases?: string[];
  capture?: boolean;
  processContent?: unknown;
}

/**
 * A component class with a static $au definition.
 */
export interface ComponentClass {
  new (...args: unknown[]): object;
  $au?: Partial<StaticAuDefinition>;
  readonly name: string;
}

/**
 * Options for patching a component definition.
 */
export interface PatchOptions {
  /**
   * The component name (kebab-case element name).
   * When provided, this overrides any existing name to ensure consistency.
   * If not provided, falls back to existing $au.name or derived from class name.
   */
  name?: string;
}

/**
 * Patch a component class's $au definition with AOT-compiled output.
 *
 * This function:
 * 1. Sets the component name from options (for consistent naming)
 * 2. Preserves existing metadata (bindables, containerless, etc.)
 * 3. Replaces template with AOT-compiled template HTML
 * 4. Replaces instructions with AOT-compiled instructions
 * 5. Sets needsCompile to false (already compiled)
 *
 * The class is mutated in place - its $au property is modified.
 *
 * @param ComponentClass - The component class to patch
 * @param aot - The AOT compilation result
 * @param options - Optional patch options. When name is provided, it overrides existing name.
 *
 * @example
 * ```typescript
 * const { MyApp } = await vite.ssrLoadModule('/src/my-app.ts');
 * const aot = compileWithAot(templateHtml, { semantics, resourceGraph });
 * // Vite SSR: pass name explicitly to ensure correct element name
 * patchComponentDefinition(MyApp, aot, { name: 'my-app' });
 *
 * // Tests with $au.name already defined: options can be omitted
 * patchComponentDefinition(TestComponent, aot);
 * ```
 */
export function patchComponentDefinition(
  ComponentClass: ComponentClass,
  aot: AotCompileResult,
  options: PatchOptions = {},
): void {
  const existing = ComponentClass.$au ?? {};

  // Determine component name with fallback chain:
  // 1. Explicitly provided name (for Vite SSR where decorators may not run)
  // 2. Existing $au.name (for tests with pre-defined $au)
  // 3. Derived from class name (last resort)
  const name = options.name ?? existing.name ?? getComponentName(ComponentClass);

  // Build patched definition, preserving existing metadata
  const patched: StaticAuDefinition = {
    // Required fields
    type: "custom-element",
    name,

    // AOT-compiled output (replaces existing)
    template: aot.template,
    instructions: aot.instructions,
    needsCompile: false,

    // Preserve existing metadata
    ...(existing.bindables !== undefined && { bindables: existing.bindables }),
    ...(existing.containerless !== undefined && { containerless: existing.containerless }),
    ...(existing.shadowOptions !== undefined && { shadowOptions: existing.shadowOptions }),
    ...(existing.dependencies !== undefined && { dependencies: existing.dependencies }),
    ...(existing.aliases !== undefined && { aliases: existing.aliases }),
    ...(existing.capture !== undefined && { capture: existing.capture }),
    ...(existing.processContent !== undefined && { processContent: existing.processContent }),
  };

  // Mutate the class
  ComponentClass.$au = patched;
}

/**
 * Check if a class has a $au definition (is an Aurelia component).
 */
export function hasComponentDefinition(cls: unknown): cls is ComponentClass {
  return (
    typeof cls === "function" &&
    "$au" in cls &&
    typeof cls.$au === "object" &&
    cls.$au !== null
  );
}

/**
 * Get the component name from a class's $au definition.
 * Falls back to kebab-casing the class name if no $au.name is defined.
 */
export function getComponentName(cls: ComponentClass): string {
  if (cls.$au?.name) {
    return cls.$au.name;
  }

  // Fallback: convert PascalCase to kebab-case
  return cls.name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}
