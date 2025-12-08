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
import type { ComponentClass } from "./patch.js";
import type { ICustomElementController } from "@aurelia/runtime-html";
export type { ComponentClass };

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

  /**
   * Callback invoked before Aurelia stops, giving access to the root controller
   * and host element while the controller tree is still active.
   * Useful for post-render analysis like manifest recording.
   */
  beforeStop?: (rootController: ICustomElementController, host: Element) => void;
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
  (CustomElement as any).clearDefinition(RootComponent);
  if (options.childComponents) {
    for (const ChildComponent of options.childComponents) {
      (CustomElement as any).clearDefinition(ChildComponent);
    }
  }

  // Get root target count from $au definition for SSR context
  const rootInstructions = RootComponent.$au?.instructions;
  const rootTargetCount = Array.isArray(rootInstructions) ? rootInstructions.length : 0;

  // Create SSR context with recording capabilities
  const ssrContext = new SSRContext();

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

  // Call beforeStop callback if provided (for post-render analysis)
  if (options.beforeStop) {
    // The root's controller is available via the _controller property
    const rootController = (au.root as unknown as { controller: ICustomElementController }).controller;
    options.beforeStop(rootController, host);
  }

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
