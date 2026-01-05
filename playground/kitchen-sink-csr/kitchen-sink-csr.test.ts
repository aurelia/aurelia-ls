/**
 * Kitchen Sink CSR E2E Test
 *
 * Tests AOT-compiled features in pure CSR mode (no SSR/hydration).
 * If it works here, AOT emit is correct. If it fails in SSR but works here,
 * the bug is in hydration.
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

describe("Kitchen Sink CSR (AOT, no SSR)", () => {
  let ctx: TestContext & { cleanup: () => Promise<void> };

  beforeAll(async () => {
    ctx = await setupTestContext(configFile);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  test("page loads without SSR, interpolation and click handlers work", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Verify no SSR
    expect(await wasSSRRendered(ctx.page)).toBe(false);

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

  test("if/else shows correct branch and toggles", async () => {
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

  test("repeat.for renders items and add works", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const items = ctx.page.locator('[data-testid="items-list"] [data-testid="item"]');

    // Initial items
    expect(await items.count()).toBe(3);
    expect(await items.allTextContents()).toEqual(["Apple", "Banana", "Cherry"]);

    // Add item
    await ctx.page.locator('[data-testid="add-item"]').click();
    expect(await items.count()).toBe(4);
  });

  test("ref binding, switch/case, and let element work", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Ref binding
    const input = ctx.page.locator('[data-testid="ref-input"]');
    expect(await input.isVisible()).toBe(true);
    expect(await input.inputValue()).toBe("initial");

    // Switch/case - initial state is "success"
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

    // Let element - initial count is 0, doubled is 0
    expect(await ctx.page.locator('[data-testid="computed-value"]').textContent()).toBe(
      "Doubled: 0"
    );

    // Increment twice → count=2 → doubled=4
    await ctx.page.locator('[data-testid="increment"]').click();
    await ctx.page.locator('[data-testid="increment"]').click();
    expect(await ctx.page.locator('[data-testid="computed-value"]').textContent()).toBe(
      "Doubled: 4"
    );
  });
});
