/**
 * SSR Handler Factory
 *
 * Creates an SSR handler for production use. The handler provides a unified
 * API for rendering URLs to HTML, usable by:
 * - SSG (static site generation)
 * - Express/Fastify middleware
 * - Serverless functions (Vercel, Netlify)
 * - CLI tools
 *
 * @example
 * ```typescript
 * // src/entry-server.ts
 * import { createSSRHandler } from '@aurelia-ls/build';
 * import { App } from './app';
 *
 * export default createSSRHandler({
 *   root: App,
 *   register: (container) => {
 *     // Register router, services, etc.
 *   },
 * });
 * ```
 */

import type { IContainer } from "@aurelia/kernel";
import type { ISSRManifest } from "@aurelia/runtime-html";
import { render, type ComponentClass, type SSRRequestContext } from "./render.js";

/**
 * Configuration for the SSR handler.
 */
export interface SSRHandlerConfig {
  /**
   * The root component class.
   * Must have a static $au definition (from AOT transform or manual).
   */
  root: ComponentClass;

  /**
   * Child component classes to register.
   * Required for components used in templates.
   */
  components?: ComponentClass[];

  /**
   * Hook to register DI services before rendering.
   * Use this for router configuration, services, etc.
   *
   * @param container - The DI container to register into
   * @param request - Request context (URL, baseHref)
   */
  register?: (container: IContainer, request: SSRRequestContext) => void;

  /**
   * HTML shell template.
   * Use `<!--ssr-outlet-->` for content and `<!--ssr-state-->` for hydration data.
   *
   * @default Basic HTML5 shell
   */
  shell?: string;

  /**
   * Base href for routing.
   * @default '/'
   */
  baseHref?: string;

  /**
   * Whether to strip hydration markers from output.
   * Set to true for pure static HTML (no hydration).
   * @default false
   */
  stripMarkers?: boolean;
}

/**
 * Options for a single render call.
 */
export interface SSRRenderOptions {
  /**
   * Additional request headers (for auth, caching, etc.).
   */
  headers?: Record<string, string>;

  /**
   * Override stripMarkers for this render.
   */
  stripMarkers?: boolean;
}

/**
 * Result of rendering a URL.
 */
export interface SSRResult {
  /** The URL that was rendered */
  url: string;

  /** The complete HTML output (shell + content + hydration data) */
  html: string;

  /** The hydration manifest for client-side use */
  manifest: ISSRManifest;
}

/**
 * The SSR handler interface.
 */
export interface SSRHandler {
  /**
   * Render a single URL to HTML.
   *
   * @param url - The URL path to render (e.g., '/about', '/products/123')
   * @param options - Optional render options
   * @returns The rendered HTML and manifest
   */
  render(url: string, options?: SSRRenderOptions): Promise<SSRResult>;

  /**
   * Render multiple URLs efficiently.
   * Uses an async generator for memory efficiency with large sites.
   *
   * @param urls - Array of URL paths to render
   * @returns Async generator yielding results as they complete
   */
  renderMany(urls: string[]): AsyncGenerator<SSRResult, void, unknown>;

  /**
   * Get the configuration (for debugging/inspection).
   */
  readonly config: Readonly<ResolvedSSRHandlerConfig>;
}

/**
 * Resolved configuration with defaults applied.
 */
interface ResolvedSSRHandlerConfig {
  root: ComponentClass;
  components: ComponentClass[];
  register?: (container: IContainer, request: SSRRequestContext) => void;
  shell: string;
  baseHref: string;
  stripMarkers: boolean;
}

/**
 * Default HTML shell.
 */
const DEFAULT_SHELL = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurelia App</title>
</head>
<body>
  <!--ssr-outlet-->
  <!--ssr-state-->
  <script type="module" src="/src/main.ts"></script>
</body>
</html>`;

/**
 * Create an SSR handler for production use.
 *
 * @param config - Handler configuration
 * @returns SSR handler with render methods
 *
 * @example
 * ```typescript
 * // Basic usage
 * const handler = createSSRHandler({ root: App });
 * const { html } = await handler.render('/about');
 *
 * // With router
 * const handler = createSSRHandler({
 *   root: App,
 *   components: [Home, About, Products],
 *   register: (container) => {
 *     container.register(RouterConfiguration);
 *   },
 * });
 *
 * // SSG usage
 * for await (const { url, html } of handler.renderMany(routes)) {
 *   await writeFile(urlToPath(url), html);
 * }
 * ```
 */
export function createSSRHandler(config: SSRHandlerConfig): SSRHandler {
  // Resolve configuration with defaults
  const resolved: ResolvedSSRHandlerConfig = {
    root: config.root,
    components: config.components ?? [],
    register: config.register,
    shell: config.shell ?? DEFAULT_SHELL,
    baseHref: config.baseHref ?? "/",
    stripMarkers: config.stripMarkers ?? false,
  };

  return {
    config: resolved,

    async render(url: string, options?: SSRRenderOptions): Promise<SSRResult> {
      const stripMarkers = options?.stripMarkers ?? resolved.stripMarkers;

      // Create request context
      const request: SSRRequestContext = {
        url,
        baseHref: resolved.baseHref,
      };

      // Render the component
      const result = await render(resolved.root, {
        childComponents: resolved.components,
        ssr: { stripMarkers },
        request,
        register: resolved.register,
      });

      // Inject into shell
      const html = injectIntoShell(
        resolved.shell,
        result.html,
        result.manifest,
      );

      return {
        url,
        html,
        manifest: result.manifest,
      };
    },

    async *renderMany(urls: string[]): AsyncGenerator<SSRResult, void, unknown> {
      for (const url of urls) {
        try {
          const result = await this.render(url);
          yield result;
        } catch (error) {
          // Log error but continue with other URLs
          console.error(`[ssr] Failed to render ${url}:`, error);
          // Yield an error result
          yield {
            url,
            html: `<!-- SSR Error: ${error instanceof Error ? error.message : String(error)} -->`,
            manifest: { root: "error", manifest: { children: [] } },
          };
        }
      }
    },
  };
}

/**
 * Inject SSR content and hydration data into the HTML shell.
 */
function injectIntoShell(
  shell: string,
  content: string,
  manifest: ISSRManifest,
): string {
  let html = shell;

  // Inject content at outlet marker
  const contentMarker = "<!--ssr-outlet-->";
  if (html.includes(contentMarker)) {
    html = html.replace(contentMarker, content);
  } else if (html.includes("</body>")) {
    // Fallback: inject before </body>
    html = html.replace("</body>", `${content}</body>`);
  }

  // Inject hydration state at state marker
  const stateMarker = "<!--ssr-state-->";
  if (html.includes(stateMarker)) {
    const script = `<script>window.__AU_SSR_SCOPE__=${JSON.stringify(manifest.manifest)};</script>`;
    html = html.replace(stateMarker, script);
  }

  return html;
}

/**
 * Type guard to check if an object is an SSR handler.
 */
export function isSSRHandler(obj: unknown): obj is SSRHandler {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "render" in obj &&
    typeof (obj as SSRHandler).render === "function" &&
    "renderMany" in obj &&
    typeof (obj as SSRHandler).renderMany === "function"
  );
}
