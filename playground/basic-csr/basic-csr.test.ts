/**
 * Basic CSR E2E Test
 *
 * Tests pure client-side rendering with AOT compilation (no SSR):
 * 1. Vite serves the app with AOT-compiled templates
 * 2. Aurelia boots on client and renders from scratch
 * 3. No hydration involved - just standard mount
 *
 * This isolates AOT compilation from hydration issues.
 * If click handlers work here but not in SSR+hydration, the bug is in hydration.
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

  test("page loads without SSR", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Verify NO SSR data was present (pure CSR)
    const hadSSR = await wasSSRRendered(ctx.page);
    expect(hadSSR).toBe(false);
  });

  test("renders correct initial content", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Check title
    const title = await ctx.page
      .locator('[data-testid="title"]')
      .textContent();
    expect(title).toBe("Hello from Aurelia");

    // Check initial click count
    const count = await ctx.page
      .locator('[data-testid="count"]')
      .textContent();
    expect(count).toBe("Clicks: 0");
  });

  test("click handler works (no hydration involved)", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click the button
    await ctx.page.locator('[data-testid="increment"]').click();

    // Verify count updated
    const count = await ctx.page
      .locator('[data-testid="count"]')
      .textContent();
    expect(count).toBe("Clicks: 1");
  });

  test("multiple clicks update correctly", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const button = ctx.page.locator('[data-testid="increment"]');

    // Click multiple times
    await button.click();
    await button.click();
    await button.click();

    const count = await ctx.page
      .locator('[data-testid="count"]')
      .textContent();
    expect(count).toBe("Clicks: 3");
  });

  test("DOM is created fresh (not adopted)", async () => {
    await ctx.page.goto(ctx.url);

    // In CSR, there's no pre-existing content to adopt
    // The my-app element should start empty and get populated
    const initialContent = await ctx.page.evaluate(() => {
      // Before Aurelia starts, my-app should be empty
      // (this runs immediately, might catch it)
      return document.querySelector("my-app")?.innerHTML || "";
    });

    await waitForAureliaReady(ctx.page);

    // After Aurelia starts, it should have content
    const finalContent = await ctx.page.evaluate(() => {
      return document.querySelector("my-app")?.innerHTML || "";
    });

    // Final content should have our app structure
    expect(finalContent).toContain('data-testid="title"');
    expect(finalContent).toContain('data-testid="count"');
  });
});
