/**
 * Kitchen Sink SSR E2E Test
 *
 * Tests AOT-compiled features with SSR + hydration.
 * This is the SSR counterpart to kitchen-sink-csr.test.ts.
 *
 * If a test passes in CSR but fails here, the bug is in SSR/hydration.
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

describe("Kitchen Sink SSR + Hydration", () => {
  let ctx: TestContext & { cleanup: () => Promise<void> };

  beforeAll(async () => {
    ctx = await setupTestContext(configFile);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  test("page loads with SSR, DOM preserved, click handlers work", async () => {
    await ctx.page.goto(ctx.url);

    // Mark DOM before hydration
    await ctx.page.evaluate(() => {
      const title = document.querySelector('[data-testid="title"]');
      if (title) {
        (title as any).__testMarker = "preserved";
      }
    });

    await waitForAureliaReady(ctx.page);

    // Verify SSR
    expect(await wasSSRRendered(ctx.page)).toBe(true);

    // DOM preserved
    const markerPreserved = await ctx.page.evaluate(() => {
      const title = document.querySelector('[data-testid="title"]');
      return (title as any)?.__testMarker === "preserved";
    });
    expect(markerPreserved).toBe(true);

    // Interpolation
    expect(await ctx.page.locator('[data-testid="title"]').textContent()).toBe(
      "Kitchen Sink"
    );

    // Click handler
    await ctx.page.locator('[data-testid="increment"]').click();
    expect(await ctx.page.locator('[data-testid="count"]').textContent()).toBe(
      "Count: 1"
    );
  });

  test("if/else shows correct branch and toggles after hydration", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Initial state
    expect(await ctx.page.locator('[data-testid="if-true"]').isVisible()).toBe(true);
    expect(await ctx.page.locator('[data-testid="if-false"]').isVisible()).toBe(false);

    // Toggle
    await ctx.page.locator('[data-testid="toggle"]').click();
    expect(await ctx.page.locator('[data-testid="if-true"]').isVisible()).toBe(false);
    expect(await ctx.page.locator('[data-testid="if-false"]').isVisible()).toBe(true);
  });

  test("repeat.for renders from SSR and add works after hydration", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const items = ctx.page.locator('[data-testid="items-list"] [data-testid="item"]');

    // Initial items (from SSR)
    expect(await items.count()).toBe(3);
    expect(await items.allTextContents()).toEqual(["Apple", "Banana", "Cherry"]);

    // Add item (after hydration)
    await ctx.page.locator('[data-testid="add-item"]').click();
    expect(await items.count()).toBe(4);
  });

  test("ref binding and let element work after hydration", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Ref binding
    const input = ctx.page.locator('[data-testid="ref-input"]');
    expect(await input.isVisible()).toBe(true);
    expect(await input.inputValue()).toBe("initial");

    // Let element
    expect(await ctx.page.locator('[data-testid="computed-value"]').textContent()).toBe(
      "Doubled: 0"
    );

    await ctx.page.locator('[data-testid="increment"]').click();
    await ctx.page.locator('[data-testid="increment"]').click();
    expect(await ctx.page.locator('[data-testid="computed-value"]').textContent()).toBe(
      "Doubled: 4"
    );
  });

  // TODO: Switch hydration bug - duplicates DOM during hydration adoption
  test.skip("switch/case shows correct branch and cycles after hydration", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Initial state is "success"
    expect(await ctx.page.locator('[data-testid="status-loading"]').isVisible()).toBe(false);
    expect(await ctx.page.locator('[data-testid="status-success"]').isVisible()).toBe(true);
    expect(await ctx.page.locator('[data-testid="status-error"]').isVisible()).toBe(false);

    // Cycle: success → error → loading → success
    await ctx.page.locator('[data-testid="cycle-status"]').click();
    expect(await ctx.page.locator('[data-testid="status-error"]').isVisible()).toBe(true);

    await ctx.page.locator('[data-testid="cycle-status"]').click();
    expect(await ctx.page.locator('[data-testid="status-loading"]').isVisible()).toBe(true);

    await ctx.page.locator('[data-testid="cycle-status"]').click();
    expect(await ctx.page.locator('[data-testid="status-success"]').isVisible()).toBe(true);
  });
});
