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
  IRendering,
  type ICustomElementController,
  type ISSRManifest,
} from "@aurelia/runtime-html";
import { NOOP_TRACE, debug, type CompileTrace } from "@aurelia-ls/compiler";
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

  /** Optional trace for instrumentation */
  trace?: CompileTrace;
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
  const trace = options.trace ?? NOOP_TRACE;

  return trace.spanAsync("ssr.render", async () => {
    trace.setAttributes({
      "ssr.render.childCount": options.childComponents?.length ?? 0,
      "ssr.render.hasCustomRegister": !!options.register,
      "ssr.render.url": options.request?.url ?? "/",
    });

    debug.ssr("render.start", {
      component: RootComponent.name ?? "anonymous",
      url: options.request?.url ?? "/",
      childCount: options.childComponents?.length ?? 0,
    });

    trace.event("ssr.render.setup");
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
    // Ensure SSR marker preservation is registered before any runtime services resolve.
    container.register(
      Registration.instance(IPlatform, platform),
      Registration.instance(ISSRContext, { preserveMarkers: true }),
      StandardConfiguration,
    );
    if (process.env.AURELIA_DEBUG_AOT === "1") {
      const hasSsrContext = container.has(ISSRContext, true);
      const context = hasSsrContext ? container.get(ISSRContext) : undefined;
      const rendering = container.get(IRendering) as { _preserveMarkers?: boolean };
      // eslint-disable-next-line no-console
      console.log("[ssr] ISSRContext", {
        has: hasSsrContext,
        preserveMarkers: context?.preserveMarkers ?? null,
        renderingPreserveMarkers: rendering?._preserveMarkers ?? null,
      });
    }

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
    trace.event("ssr.render.aureliaStart");
    debug.ssr("render.aurelia.starting");
    const host = doc.createElement("div");
    doc.body.appendChild(host);

    const au = new Aurelia(container);
    const globalSnapshot = applyGlobalDom(platform);
    try {
      au.app({ host, component: RootComponent });
      await au.start();
    } finally {
      restoreGlobalDom(globalSnapshot);
    }
    trace.event("ssr.render.aureliaStarted");
    debug.ssr("render.aurelia.started");

    // Sync DOM properties to attributes for proper HTML serialization
    syncPropertiesForSSR(host);

    // Get the root controller for manifest recording
    const rootController = (au.root as unknown as { controller: ICustomElementController }).controller;

    // Record tree-based manifest from controller tree
    trace.event("ssr.render.manifest");
    const manifest = recordManifest(rootController);

    // Call beforeStop callback if provided (for post-render analysis)
    if (options.beforeStop) {
      options.beforeStop(rootController, host);
    }

    // Process output
    trace.event("ssr.render.process");
    let html: string;
    if (options.ssr) {
      const processed = processSSROutput(host, options.ssr);
      html = processed.html;
    } else {
      html = host.innerHTML;
    }

    // Cleanup
    trace.event("ssr.render.stop");
    await au.stop(true);

    debug.ssr("render.complete", {
      htmlLength: html.length,
      rootComponent: manifest.root,
    });

    trace.setAttribute("ssr.render.htmlLength", html.length);

    return { html, manifest };
  });
}

type GlobalDomSnapshot = {
  window?: unknown;
  document?: unknown;
  HTMLElement?: unknown;
  Element?: unknown;
  Node?: unknown;
  HTMLInputElement?: unknown;
  HTMLTextAreaElement?: unknown;
  HTMLSelectElement?: unknown;
};

type DomGlobals = GlobalDomSnapshot;

function applyGlobalDom(platform: IPlatform): GlobalDomSnapshot {
  const globals = globalThis as unknown as DomGlobals;
  const win = (platform as { window?: unknown }).window
    ?? (platform.document as { defaultView?: unknown } | undefined)?.defaultView;
  const winGlobals = (win ?? {}) as DomGlobals;

  const snapshot: GlobalDomSnapshot = {
    window: globals.window,
    document: globals.document,
    HTMLElement: globals.HTMLElement,
    Element: globals.Element,
    Node: globals.Node,
    HTMLInputElement: globals.HTMLInputElement,
    HTMLTextAreaElement: globals.HTMLTextAreaElement,
    HTMLSelectElement: globals.HTMLSelectElement,
  };

  if (win) {
    globals.window = win;
  }
  if (platform.document) {
    globals.document = platform.document as unknown;
  }
  if (winGlobals.HTMLElement) {
    globals.HTMLElement = winGlobals.HTMLElement;
  }
  if (winGlobals.Element) {
    globals.Element = winGlobals.Element;
  }
  if (winGlobals.Node) {
    globals.Node = winGlobals.Node;
  }
  if (winGlobals.HTMLInputElement) {
    globals.HTMLInputElement = winGlobals.HTMLInputElement;
  }
  if (winGlobals.HTMLTextAreaElement) {
    globals.HTMLTextAreaElement = winGlobals.HTMLTextAreaElement;
  }
  if (winGlobals.HTMLSelectElement) {
    globals.HTMLSelectElement = winGlobals.HTMLSelectElement;
  }

  if (process.env.AURELIA_SSR_DEBUG_GLOBALS === "1") {
    // eslint-disable-next-line no-console
    console.log("[ssr] globals", {
      hasWindow: Boolean(globals.window),
      hasDocument: Boolean(globals.document),
      hasHTMLElement: Boolean(globals.HTMLElement),
      hasHTMLInputElement: Boolean(globals.HTMLInputElement),
    });
  }

  return snapshot;
}

function restoreGlobalDom(snapshot: GlobalDomSnapshot): void {
  const globals = globalThis as unknown as DomGlobals;
  globals.window = snapshot.window;
  globals.document = snapshot.document;
  globals.HTMLElement = snapshot.HTMLElement;
  globals.Element = snapshot.Element;
  globals.Node = snapshot.Node;
  globals.HTMLInputElement = snapshot.HTMLInputElement;
  globals.HTMLTextAreaElement = snapshot.HTMLTextAreaElement;
  globals.HTMLSelectElement = snapshot.HTMLSelectElement;
}

// Re-export for backwards compatibility during transition
export { render as renderWithComponents };
