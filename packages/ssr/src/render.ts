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

import { DI, Registration, type IContainer } from "@aurelia/kernel";
import {
  Aurelia,
  IPlatform,
  StandardConfiguration,
  ISSRContext,
  CustomElement,
  type ICustomElementController,
  type ISSRManifest,
} from "@aurelia/runtime-html";
import { recordManifest } from "./manifest-recorder.js";
import { createServerPlatform, getDocument, type SSRRequestContext } from "./platform.js";
import {
  processSSROutput,
  syncPropertiesForSSR,
  type SSRProcessOptions,
} from "./ssr-processor.js";
import type { ComponentClass } from "./patch.js";
export type { ComponentClass };
export type { SSRRequestContext };

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
   * Request context for URL-aware rendering (routing).
   * When provided, the platform's location will reflect the request URL.
   */
  request?: SSRRequestContext;

  /**
   * Hook to register DI services before rendering.
   *
   * **Note:** This is a naive first-pass API. In a real app, the client's `main.ts`
   * registers things on `Aurelia.register()` - router config, custom elements,
   * value converters, etc. Ideally, SSR would mirror that automatically, but the
   * boundaries aren't clean: some registrations are discovered via resolution,
   * some come from `$au.dependencies`, some need server-specific substitutions
   * (e.g., `ServerLocationManager` for `BrowserLocationManager`).
   *
   * For now, use this hook to manually register whatever your client app registers
   * that isn't already handled. This API will likely evolve as we better understand
   * the registration lifecycle across client/server boundaries.
   *
   * @param container - The DI container to register services into
   * @param request - Request context (URL, baseHref) for URL-aware services like router
   *
   * @example
   * ```typescript
   * register: (container, req) => {
   *   const locationManager = new ServerLocationManager(req.url, req.baseHref);
   *   container.register(Registration.instance(ILocationManager, locationManager));
   * }
   * ```
   */
  register?: (container: IContainer, request: SSRRequestContext) => void;

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

  /** Tree-based SSR manifest for client-side hydration */
  manifest: ISSRManifest;
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
  const platform = createServerPlatform({ request: options.request });
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

  // Create DI container
  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform),
    Registration.instance(ISSRContext, { preserveMarkers: true }),
  );

  // Call custom registration hook (for router, etc.)
  if (options.register) {
    const requestContext: SSRRequestContext = options.request ?? { url: "/", baseHref: "/" };
    options.register(container, requestContext);
  }

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

  // Get the root controller for manifest recording
  const rootController = (au.root as unknown as { controller: ICustomElementController }).controller;

  // Record tree-based manifest from controller tree
  const manifest = recordManifest(rootController);

  // Call beforeStop callback if provided (for post-render analysis)
  if (options.beforeStop) {
    options.beforeStop(rootController, host);
  }

  // Process output
  let html: string;
  if (options.ssr) {
    const processed = processSSROutput(host, options.ssr);
    html = processed.html;
  } else {
    html = host.innerHTML;
  }

  // Cleanup
  await au.stop(true);

  return { html, manifest };
}

// Re-export for backwards compatibility during transition
export { render as renderWithComponents };
