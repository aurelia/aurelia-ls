/**
 * Server Platform Setup
 *
 * Creates a JSDOM-based platform for server-side rendering.
 */

import { JSDOM } from "jsdom";
import { BrowserPlatform } from "@aurelia/platform-browser";
import type { IPlatform } from "@aurelia/runtime-html";

/**
 * Request context for URL-aware SSR rendering.
 * Used by the router to resolve the correct route during server-side rendering.
 */
export interface SSRRequestContext {
  /** Request URL path (e.g., '/products/123' or '/about?ref=home') */
  url: string;
  /** Base href for link generation (e.g., '/' or '/app/'), defaults to '/' */
  baseHref?: string;
}

export interface ServerPlatformOptions {
  /** Initial HTML content for the document */
  html?: string;
  /** Request context for URL-aware rendering (routing) */
  request?: SSRRequestContext;
}

// BrowserPlatform expects Window & typeof globalThis
type BrowserWindow = ConstructorParameters<typeof BrowserPlatform>[0];

/**
 * Create a server-side platform using JSDOM.
 *
 * When request context is provided, the platform's location will reflect
 * the request URL, allowing the router to resolve the correct route.
 */
export function createServerPlatform(options: ServerPlatformOptions = {}): IPlatform {
  const html = options.html ?? `<!DOCTYPE html><html><head></head><body></body></html>`;
  const request = options.request;

  // Build JSDOM URL from request context
  const jsdomUrl = request?.url
    ? `http://localhost${request.url.startsWith("/") ? "" : "/"}${request.url}`
    : "http://localhost/";

  const jsdom = new JSDOM(html, {
    pretendToBeVisual: true,
    url: jsdomUrl,
  });

  const w = jsdom.window as unknown as BrowserWindow;

  // Set base href if provided (used for link generation)
  if (request?.baseHref && request.baseHref !== "/") {
    const base = w.document.createElement("base");
    base.href = request.baseHref;
    w.document.head.appendChild(base);
  }

  // Create microtask queue fallback
  const p = Promise.resolve();
  function queueMicrotask(cb: () => void): void {
    p.then(cb).catch((err: unknown) => { throw err; });
  }

  // Use our fallback queueMicrotask - JSDOM's may not be fully compatible
  const platform = new BrowserPlatform(w, {
    queueMicrotask,
  });

  return platform;
}

/**
 * Get the document from a platform.
 */
export function getDocument(platform: IPlatform): IPlatform["document"] {
  return platform.document;
}
