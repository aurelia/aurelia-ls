/**
 * @aurelia-ls/build - Build tools and SSR for Aurelia
 *
 * This package provides:
 * - Server-side rendering (SSR) for Aurelia templates
 * - Build tool integrations (Vite, Webpack) [planned]
 * - AOT compilation utilities [planned]
 */

// SSR
export * from "./ssr/index.js";

// Re-export compile functions from domain for convenience
export {
  lowerDocument,
  resolveHost,
  bindScopes,
  buildAotPlan,
  emitAotCode,
  getExpressionParser,
  DEFAULT_SYNTAX,
  DEFAULT_SEMANTICS,
  type AotPlan,
  type AotCodeResult,
  type SerializedDefinition,
} from "@aurelia-ls/domain";

// Runtime re-exports for SSR consumers
export { DI, Registration } from "@aurelia/kernel";
export { Aurelia, IPlatform, StandardConfiguration, CustomElement } from "@aurelia/runtime-html";
export type { IInstruction } from "@aurelia/template-compiler";

// High-level API
import { DI, Registration } from "@aurelia/kernel";
import { Aurelia, IPlatform, StandardConfiguration } from "@aurelia/runtime-html";
import { createServerPlatform, getDocument } from "./ssr/index.js";

export interface CompileAndRenderOptions {
  /** Component state for rendering */
  state: Record<string, unknown>;
  /** Template file path (for source maps) */
  templatePath?: string;
}

export interface CompileAndRenderResult {
  /** Rendered HTML */
  html: string;
}

/**
 * Compile a template and render to HTML in one step.
 *
 * Uses the actual Aurelia runtime for both compilation and rendering
 * to ensure perfect parity with client-side behavior.
 *
 * @param markup - The Aurelia template markup
 * @param options - Compilation and render options
 * @returns The rendered HTML with hydration markers
 *
 * @example
 * ```typescript
 * const result = await compileAndRender(
 *   '<div>${message}</div>',
 *   { state: { message: 'Hello World' } }
 * );
 * console.log(result.html); // '<div>Hello World</div>'
 * ```
 */
export async function compileAndRender(
  markup: string,
  options: CompileAndRenderOptions,
): Promise<CompileAndRenderResult> {
  // Create server platform
  const platform = createServerPlatform();
  const doc = getDocument(platform);

  // Create DI container with platform and standard config
  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform),
  );

  // Create component class - the runtime will compile the template
  const Component = class {
    static $au = {
      type: "custom-element" as const,
      name: "ssr-root",
      template: markup,
      // needsCompile: true (default) - runtime will compile
    };
  };

  // Apply state to component prototype
  const stateDescriptors: PropertyDescriptorMap = {};
  for (const [key, value] of Object.entries(options.state)) {
    stateDescriptors[key] = { value, writable: true, enumerable: true, configurable: true };
  }
  Object.defineProperties(Component.prototype, stateDescriptors);

  // Create host element
  const host = doc.createElement("div");
  doc.body.appendChild(host);

  // Create and start Aurelia
  const au = new Aurelia(container);
  au.app({ host, component: Component });
  await au.start();

  // Get rendered HTML
  const html = host.innerHTML;

  // Cleanup
  await au.stop(true);

  return { html };
}
