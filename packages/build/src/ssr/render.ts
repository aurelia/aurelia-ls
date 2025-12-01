/**
 * SSR Renderer
 *
 * Renders Aurelia templates to HTML string using the actual Aurelia runtime.
 * This ensures perfect parity with client-side rendering.
 */

import { DI, Registration } from "@aurelia/kernel";
import { Aurelia, IPlatform, StandardConfiguration } from "@aurelia/runtime-html";
import type { IInstruction } from "@aurelia/template-compiler";
import { createServerPlatform, getDocument } from "./platform.js";

export interface RenderOptions {
  /** Component state */
  state: Record<string, unknown>;
}

export interface RenderResult {
  /** Rendered HTML with hydration markers */
  html: string;
}

export interface ComponentDefinition {
  /** Template HTML string */
  template: string;
  /** Binding instructions for the template */
  instructions: IInstruction[][];
  /** Component name */
  name?: string;
}

/**
 * Render a component to HTML string using the Aurelia runtime.
 *
 * @param definition - The compiled component definition
 * @param options - Render options including state
 * @returns The rendered HTML
 *
 * @example
 * ```typescript
 * const result = await renderToString(
 *   {
 *     template: '<div><!--au:0--></div>',
 *     instructions: [[new TextBindingInstruction('message')]],
 *   },
 *   { state: { message: 'Hello World' } }
 * );
 * console.log(result.html); // '<div><!--au:0-->Hello World</div>'
 * ```
 */
export async function renderToString(
  definition: ComponentDefinition,
  options: RenderOptions,
): Promise<RenderResult> {
  // Create server platform
  const platform = createServerPlatform();
  const doc = getDocument(platform);

  // Create DI container with platform
  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform),
  );

  // Create template element
  const templateEl = doc.createElement("template");
  templateEl.innerHTML = definition.template;

  // Create component class with $au definition
  const componentName = definition.name ?? "ssr-root";
  const Component = class {
    static $au = {
      type: "custom-element" as const,
      name: componentName,
      template: templateEl,
      instructions: definition.instructions,
      needsCompile: false,
    };
  };

  // Apply state to component prototype so instances get those values
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

/**
 * Render a pre-defined custom element to HTML.
 *
 * Use this when you have a component class that's already defined
 * with the @customElement decorator or static $au property.
 */
export async function renderComponent<T extends object>(
  Component: new () => T,
  options: RenderOptions,
): Promise<RenderResult> {
  // Create server platform
  const platform = createServerPlatform();
  const doc = getDocument(platform);

  // Create DI container with platform
  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform),
  );

  // Apply state to a new instance
  const instance = new Component();
  Object.assign(instance, options.state);

  // Create host element
  const host = doc.createElement("div");
  doc.body.appendChild(host);

  // Create and start Aurelia
  const au = new Aurelia(container);
  au.app({ host, component: instance });
  await au.start();

  // Get rendered HTML
  const html = host.innerHTML;

  // Cleanup
  await au.stop(true);

  return { html };
}
