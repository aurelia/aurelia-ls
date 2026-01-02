/**
 * Playground test helpers
 *
 * Utilities for starting Vite dev servers and controlling Playwright browsers
 * within Vitest tests.
 */

import { createServer, type ViteDevServer } from "vite";
import { chromium, type Browser, type Page } from "playwright";

export interface TestContext {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
  url: string;
}

/**
 * Start a Vite dev server for the given config file.
 */
export async function startServer(configFile: string): Promise<ViteDevServer> {
  const server = await createServer({
    configFile,
    server: {
      // Use a random available port to avoid conflicts
      port: 0,
      strictPort: false,
    },
    logLevel: "silent",
  });

  await server.listen();
  return server;
}

/**
 * Get the URL for a running Vite dev server.
 */
export function getServerUrl(server: ViteDevServer): string {
  const info = server.resolvedUrls;
  if (!info?.local?.[0]) {
    throw new Error("Server has no local URL");
  }
  return info.local[0];
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
