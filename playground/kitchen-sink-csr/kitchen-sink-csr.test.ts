/**
 * Kitchen Sink CSR E2E Test
 *
 * Tests AOT-compiled features in pure CSR mode (no SSR/hydration).
 * If it works here, AOT emit is correct. If it fails in SSR but works here,
 * the bug is in hydration.
 *
 * WORKING:
 * - Basic interpolation
 * - Event handlers (click.trigger)
 * - if/else (simple, sibling elements)
 * - repeat.for (basic arrays, simple iteration)
 * - ref binding
 * - switch/case
 * - <let> element (computed values)
 *
 * UNTESTED (may have issues with nested templates):
 * - with.bind
 * - Nested TCs (if inside repeat)
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

  test("page loads without SSR", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const hadSSR = await wasSSRRendered(ctx.page);
    expect(hadSSR).toBe(false);
  });

  test("renders interpolation", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const title = await ctx.page.locator('[data-testid="title"]').textContent();
    expect(title).toBe("Kitchen Sink");
  });

  test("click handler works", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    await ctx.page.locator('[data-testid="increment"]').click();
    const count = await ctx.page.locator('[data-testid="count"]').textContent();
    expect(count).toBe("Count: 1");
  });

  test("if/else shows correct branch", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const ifTrue = await ctx.page.locator('[data-testid="if-true"]').isVisible();
    const ifFalse = await ctx.page.locator('[data-testid="if-false"]').isVisible();
    expect(ifTrue).toBe(true);
    expect(ifFalse).toBe(false);
  });

  test("if/else toggle works", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    await ctx.page.locator('[data-testid="toggle"]').click();

    const ifTrue = await ctx.page.locator('[data-testid="if-true"]').isVisible();
    const ifFalse = await ctx.page.locator('[data-testid="if-false"]').isVisible();
    expect(ifTrue).toBe(false);
    expect(ifFalse).toBe(true);
  });

  test("repeat.for renders items", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const items = ctx.page.locator('[data-testid="items-list"] [data-testid="item"]');
    const count = await items.count();
    expect(count).toBe(3);

    const texts = await items.allTextContents();
    expect(texts).toEqual(["Apple", "Banana", "Cherry"]);
  });

  test("repeat.for add item works", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    await ctx.page.locator('[data-testid="add-item"]').click();

    const items = ctx.page.locator('[data-testid="items-list"] [data-testid="item"]');
    const count = await items.count();
    expect(count).toBe(4);
  });

  test("ref binding creates element reference", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const input = ctx.page.locator('[data-testid="ref-input"]');
    const visible = await input.isVisible();
    expect(visible).toBe(true);

    // Input should have initial value
    const value = await input.inputValue();
    expect(value).toBe("initial");
  });

  test("switch/case shows correct branch", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Initial state is "success"
    const loading = await ctx.page.locator('[data-testid="status-loading"]').isVisible();
    const success = await ctx.page.locator('[data-testid="status-success"]').isVisible();
    const error = await ctx.page.locator('[data-testid="status-error"]').isVisible();

    expect(loading).toBe(false);
    expect(success).toBe(true);
    expect(error).toBe(false);
  });

  test("switch/case cycles through states", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click to cycle: success → error
    await ctx.page.locator('[data-testid="cycle-status"]').click();
    let error = await ctx.page.locator('[data-testid="status-error"]').isVisible();
    expect(error).toBe(true);

    // Click again: error → loading
    await ctx.page.locator('[data-testid="cycle-status"]').click();
    const loading = await ctx.page.locator('[data-testid="status-loading"]').isVisible();
    expect(loading).toBe(true);

    // Click again: loading → success
    await ctx.page.locator('[data-testid="cycle-status"]').click();
    const success = await ctx.page.locator('[data-testid="status-success"]').isVisible();
    expect(success).toBe(true);
  });

  test("let element computes derived value", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Initial count is 0, so computed (doubled) is 0
    const computed = await ctx.page.locator('[data-testid="computed-value"]').textContent();
    expect(computed).toBe("Doubled: 0");
  });

  test("let element updates when source changes", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click increment twice
    await ctx.page.locator('[data-testid="increment"]').click();
    await ctx.page.locator('[data-testid="increment"]').click();

    // count is now 2, computed (doubled) should be 4
    const computed = await ctx.page.locator('[data-testid="computed-value"]').textContent();
    expect(computed).toBe("Doubled: 4");
  });
});
