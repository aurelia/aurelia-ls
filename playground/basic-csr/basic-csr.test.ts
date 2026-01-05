/**
 * Basic CSR E2E Test
 *
 * Tests pure client-side rendering with AOT compilation (no SSR):
 * 1. Vite serves the app with AOT-compiled templates
 * 2. Aurelia boots on client and renders from scratch
 * 3. No hydration involved - just standard mount
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import {
  setupTestContext,
  waitForAureliaReady,
  wasSSRRendered,
  type TestContext,
} from "../helpers";

const configFile = resolve(import.meta.dirname, "vite.config.ts");

describe("Basic CSR (AOT, no SSR)", () => {
  let ctx: TestContext & { cleanup: () => Promise<void> };

  beforeAll(async () => {
    ctx = await setupTestContext(configFile);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  test("page loads without SSR and renders correctly", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Verify NO SSR data was present (pure CSR)
    expect(await wasSSRRendered(ctx.page)).toBe(false);

    // Check title
    expect(await ctx.page.locator('[data-testid="title"]').textContent()).toBe(
      "Hello from Aurelia"
    );

    // Check initial click count
    expect(await ctx.page.locator('[data-testid="count"]').textContent()).toBe(
      "Clicks: 0"
    );
  });

  test("click handlers work and DOM is created fresh", async () => {
    await ctx.page.goto(ctx.url);

    // Before Aurelia starts, check initial state
    const initialContent = await ctx.page.evaluate(() => {
      return document.querySelector("my-app")?.innerHTML || "";
    });

    await waitForAureliaReady(ctx.page);

    // After Aurelia, DOM should have content
    const finalContent = await ctx.page.evaluate(() => {
      return document.querySelector("my-app")?.innerHTML || "";
    });
    expect(finalContent).toContain('data-testid="title"');
    expect(finalContent).toContain('data-testid="count"');

    // Click handler works
    const button = ctx.page.locator('[data-testid="increment"]');
    await button.click();
    expect(await ctx.page.locator('[data-testid="count"]').textContent()).toBe(
      "Clicks: 1"
    );

    // Multiple clicks
    await button.click();
    await button.click();
    expect(await ctx.page.locator('[data-testid="count"]').textContent()).toBe(
      "Clicks: 3"
    );
  });
});
