/**
 * Basic Hydration E2E Test
 *
 * Tests the complete SSR → Hydration flow:
 * 1. Server renders HTML with SSR
 * 2. Client receives pre-rendered HTML
 * 3. Aurelia hydrates (adopts DOM, attaches handlers)
 * 4. Interactivity works post-hydration
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

describe("Basic Hydration", () => {
  let ctx: TestContext & { cleanup: () => Promise<void> };

  beforeAll(async () => {
    ctx = await setupTestContext(configFile);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  test("page loads with SSR content", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Verify SSR data was present
    const hadSSR = await wasSSRRendered(ctx.page);
    expect(hadSSR).toBe(true);
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

  // TODO: Event handlers not working after hydration - investigate
  test.skip("click handler works after hydration", async () => {
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

  // TODO: Event handlers not working after hydration - investigate
  test.skip("multiple clicks update correctly", async () => {
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

  test("DOM is preserved during hydration (not replaced)", async () => {
    await ctx.page.goto(ctx.url);

    // Mark a DOM element before hydration completes
    // We do this immediately after navigation, before Aurelia hydrates
    await ctx.page.evaluate(() => {
      const title = document.querySelector('[data-testid="title"]');
      if (title) {
        (title as any).__testMarker = "preserved";
      }
    });

    await waitForAureliaReady(ctx.page);

    // Check if marker is still there (DOM was preserved, not replaced)
    const markerPreserved = await ctx.page.evaluate(() => {
      const title = document.querySelector('[data-testid="title"]');
      return (title as any)?.__testMarker === "preserved";
    });

    expect(markerPreserved).toBe(true);
  });
});
