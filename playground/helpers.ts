/**
 * Playground test helpers
 *
 * Utilities for starting Vite dev servers and controlling Playwright browsers
 * within Vitest tests.
 */

import { createServer, type ViteDevServer } from "vite";
import { chromium, type Browser, type Page } from "playwright";
import { dirname } from "node:path";

export interface TestContext {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
  url: string;
}

// Counter for generating unique ports per test file
let portCounter = 0;

/**
 * Start a Vite dev server for the given config file.
 */
export async function startServer(configFile: string): Promise<ViteDevServer> {
  // Use a unique high port for each test to avoid conflicts
  // Start from a random base to avoid conflicts across test runs
  const basePort = 15000 + (process.pid % 5000);
  const port = basePort + portCounter++;

  // Root should be the directory containing the config file
  const root = dirname(configFile);

  const server = await createServer({
    configFile,
    root,
    server: {
      port,
      strictPort: false, // Will find next available if taken
      host: "127.0.0.1", // Bind to IPv4 explicitly for Playwright compatibility
    },
    logLevel: "silent",
  });

  await server.listen();

  // Give Vite time to fully initialize (plugin async setup)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return server;
}

/**
 * Get the URL for a running Vite dev server.
 * Uses httpServer.address() directly since resolvedUrls may not reflect
 * the actual assigned port when port: 0 is used.
 */
export function getServerUrl(server: ViteDevServer): string {
  // Use httpServer.address() for the actual port
  const httpServer = server.httpServer;
  if (httpServer) {
    const address = httpServer.address();
    if (address && typeof address === "object") {
      const port = address.port;
      // Use 127.0.0.1 explicitly to avoid IPv6/IPv4 resolution issues
      return `http://127.0.0.1:${port}/`;
    }
  }

  // Fallback to resolvedUrls
  const info = server.resolvedUrls;
  if (info?.local?.[0]) {
    return info.local[0];
  }

  throw new Error("Server has no local URL");
}

/**
 * Launch a Playwright browser.
 */
export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
  });
}

/**
 * Set up a complete test context: server + browser + page.
 * Call cleanup() when done.
 */
export async function setupTestContext(
  configFile: string
): Promise<TestContext & { cleanup: () => Promise<void> }> {
  const server = await startServer(configFile);
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const url = getServerUrl(server);

  const cleanup = async () => {
    await page.close();
    await browser.close();
    await server.close();
  };

  return { server, browser, page, url, cleanup };
}

/**
 * Wait for Aurelia to hydrate/start by checking for the absence of loading indicators
 * or presence of hydrated content.
 */
export async function waitForAureliaReady(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Wait for the custom element to have content (Aurelia has rendered)
  await page.waitForFunction(
    () => {
      const app = document.querySelector("my-app, hydration-app, test-app");
      if (!app) return false;
      // Check that it has actual content (not just empty)
      return app.children.length > 0 || app.textContent?.trim();
    },
    { timeout }
  );
}

/**
 * Check if the page was server-side rendered by looking for SSR markers.
 */
export async function wasSSRRendered(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Check for SSR scope data (injected by our SSR)
    return typeof (window as any).__AU_SSR_SCOPE__ !== "undefined";
  });
}

/**
 * Get the SSR scope data from the page.
 */
export async function getSSRScope(page: Page): Promise<unknown> {
  return page.evaluate(() => (window as any).__AU_SSR_SCOPE__);
}

/**
 * Count elements matching a selector.
 */
export async function countElements(
  page: Page,
  selector: string
): Promise<number> {
  return page.locator(selector).count();
}
