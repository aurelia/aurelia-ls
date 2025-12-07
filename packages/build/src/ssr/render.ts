/**
 * SSR Renderer
 *
 * Renders Aurelia components to HTML using the actual Aurelia runtime.
 * This ensures perfect parity with client-side rendering.
 *
 * Key principle: Components define their own state. We don't inject state
 * externally - that's not how Aurelia works. Components initialize their
 * properties naturally, and parent-child communication happens via bindables.
 */

import { DI, Registration } from "@aurelia/kernel";
import {
  Aurelia,
  IPlatform,
  StandardConfiguration,
  ISSRContextToken,
  SSRContext,
  CustomElement,
} from "@aurelia/runtime-html";
import { createServerPlatform, getDocument } from "./platform.js";
import {
  processSSROutput,
  syncPropertiesForSSR,
  type HydrationManifest,
  type SSRProcessOptions,
} from "./ssr-processor.js";

/**
 * A component class with a static $au definition.
 */
export interface ComponentClass {
  new (...args: unknown[]): object;
  $au?: {
    type?: string;
    name?: string;
    template?: unknown;
    instructions?: unknown[][];
    needsCompile?: boolean;
    dependencies?: unknown[];
    bindables?: unknown;
    [key: string]: unknown;
  };
  readonly name: string;
}

/**
 * Options for SSR rendering.
 */
export interface RenderOptions {
  /**
   * Child component classes to register in the container.
   * These should already have their $au patched with AOT output.
   */
  childComponents?: ComponentClass[];

  /**
   * SSR processing options (marker stripping, manifest delivery).
   */
  ssr?: SSRProcessOptions;
}

/**
 * Result of SSR rendering.
 */
export interface RenderResult {
  /** Rendered HTML (clean if ssr.stripMarkers=true) */
  html: string;

  /** Hydration manifest for client-side hydration */
  manifest: HydrationManifest;
}

/**
 * Render a component to HTML using the Aurelia runtime.
 *
 * Components use their natural state - properties defined in the class,
 * initialized in the constructor, with parent-child binding via bindables.
 * No external state injection is needed or supported.
 *
 * @param RootComponent - The root component class (should have $au definition)
 * @param options - Render options
 * @returns The rendered HTML and hydration manifest
 *
 * @example
 * ```typescript
 * // Define components with their own state
 * class GreetingCard {
 *   name = 'Guest';
 *   get greeting() { return `Hello, ${this.name}!`; }
 *   static $au = {
 *     type: 'custom-element',
 *     name: 'greeting-card',
 *     template: '<div>${greeting}</div>',
 *     bindables: { name: { mode: 2 } },
 *   };
 * }
 *
 * class MyApp {
 *   userName = 'World';
 *   static $au = {
 *     type: 'custom-element',
 *     name: 'my-app',
 *     template: '<greeting-card name.bind="userName"></greeting-card>',
 *     dependencies: [GreetingCard],
 *   };
 * }
 *
 * // Render
 * const result = await render(MyApp, {
 *   childComponents: [GreetingCard],
 * });
 * // result.html contains "Hello, World!"
 * ```
 */
export async function render(
  RootComponent: ComponentClass,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const platform = createServerPlatform();
  const doc = getDocument(platform);

  // Clear cached definitions for all components BEFORE rendering.
  // The runtime caches definitions on the Type, and we need fresh
  // definitions each render to match the patched $au.
  CustomElement.clearDefinition(RootComponent);
  if (options.childComponents) {
    for (const ChildComponent of options.childComponents) {
      CustomElement.clearDefinition(ChildComponent);
    }
  }

  // Get root target count from $au definition for SSR context
  const rootInstructions = RootComponent.$au?.instructions;
  const rootTargetCount = Array.isArray(rootInstructions) ? rootInstructions.length : 0;

  // Create SSR context with recording capabilities
  const ssrContext = new SSRContext();
  ssrContext.setRootTargetCount(rootTargetCount);

  // Create DI container
  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform),
    Registration.instance(ISSRContextToken, ssrContext),
  );

  // Register child components
  if (options.childComponents) {
    for (const ChildComponent of options.childComponents) {
      container.register(ChildComponent);
    }
  }

  // Create host element and render
  const host = doc.createElement("div");
  doc.body.appendChild(host);

  const au = new Aurelia(container);
  au.app({ host, component: RootComponent });
  await au.start();

  // Sync DOM properties to attributes for proper HTML serialization
  syncPropertiesForSSR(host);

  // Get manifest from SSR context (recorded during rendering)
  const runtimeManifest = ssrContext.getManifest();

  // Process output
  let result: RenderResult;
  if (options.ssr) {
    const processed = processSSROutput(host, runtimeManifest, options.ssr);
    result = { html: processed.html, manifest: processed.manifest };
  } else {
    result = { html: host.innerHTML, manifest: runtimeManifest };
  }

  // Cleanup
  await au.stop(true);

  return result;
}

// Re-export for backwards compatibility during transition
export { render as renderWithComponents };
