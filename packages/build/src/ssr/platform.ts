/**
 * Server Platform Setup
 *
 * Creates a JSDOM-based platform for server-side rendering.
 */

import { JSDOM } from "jsdom";
import { BrowserPlatform } from "@aurelia/platform-browser";
import type { IPlatform } from "@aurelia/runtime-html";

export interface ServerPlatformOptions {
  /** Initial HTML content for the document */
  html?: string;
}

// BrowserPlatform expects Window & typeof globalThis
type BrowserWindow = ConstructorParameters<typeof BrowserPlatform>[0];

/**
 * Create a server-side platform using JSDOM.
 */
export function createServerPlatform(options: ServerPlatformOptions = {}): IPlatform {
  const html = options.html ?? `<!DOCTYPE html><html><head></head><body></body></html>`;
  const jsdom = new JSDOM(html, { pretendToBeVisual: true });

  const w = jsdom.window as unknown as BrowserWindow;

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
