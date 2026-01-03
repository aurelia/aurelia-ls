/**
 * Kitchen Sink SSR E2E Test
 *
 * Tests AOT-compiled features with SSR + hydration.
 * This is the SSR counterpart to kitchen-sink-csr.test.ts.
 *
 * Verifies:
 * 1. SSR renders initial content server-side
 * 2. Hydration preserves DOM (doesn't re-render)
 * 3. Event handlers work after hydration
 * 4. All template features work post-hydration
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

  // ==========================================================================
  // SSR Verification
  // ==========================================================================

  test("page loads with SSR content", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const hadSSR = await wasSSRRendered(ctx.page);
    expect(hadSSR).toBe(true);
  });

  test("SSR renders correct initial interpolation", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const title = await ctx.page.locator('[data-testid="title"]').textContent();
    expect(title).toBe("Kitchen Sink");
  });

  test("DOM is preserved during hydration", async () => {
    await ctx.page.goto(ctx.url);

    // Mark a DOM element before hydration
    await ctx.page.evaluate(() => {
      const title = document.querySelector('[data-testid="title"]');
      if (title) {
        (title as any).__testMarker = "preserved";
      }
    });

    await waitForAureliaReady(ctx.page);

    // Check marker is still there (DOM preserved, not replaced)
    const markerPreserved = await ctx.page.evaluate(() => {
      const title = document.querySelector('[data-testid="title"]');
      return (title as any)?.__testMarker === "preserved";
    });

    expect(markerPreserved).toBe(true);
  });

  // ==========================================================================
  // Event Handlers (post-hydration)
  // ==========================================================================

  test("click handler works after hydration", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    await ctx.page.locator('[data-testid="increment"]').click();
    const count = await ctx.page.locator('[data-testid="count"]').textContent();
    expect(count).toBe("Count: 1");
  });

  // ==========================================================================
  // Template Controllers
  // ==========================================================================

  test("if/else shows correct initial branch", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const ifTrue = await ctx.page.locator('[data-testid="if-true"]').isVisible();
    const ifFalse = await ctx.page.locator('[data-testid="if-false"]').isVisible();
    expect(ifTrue).toBe(true);
    expect(ifFalse).toBe(false);
  });

  test("if/else toggle works after hydration", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    await ctx.page.locator('[data-testid="toggle"]').click();

    const ifTrue = await ctx.page.locator('[data-testid="if-true"]').isVisible();
    const ifFalse = await ctx.page.locator('[data-testid="if-false"]').isVisible();
    expect(ifTrue).toBe(false);
    expect(ifFalse).toBe(true);
  });

  test("repeat.for renders items from SSR", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const items = ctx.page.locator('[data-testid="items-list"] [data-testid="item"]');
    const count = await items.count();
    expect(count).toBe(3);

    const texts = await items.allTextContents();
    expect(texts).toEqual(["Apple", "Banana", "Cherry"]);
  });

  test("repeat.for add item works after hydration", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    await ctx.page.locator('[data-testid="add-item"]').click();

    const items = ctx.page.locator('[data-testid="items-list"] [data-testid="item"]');
    const count = await items.count();
    expect(count).toBe(4);
  });

  // TODO: Switch hydration bug - duplicates DOM during hydration adoption
  // See aurelia/packages/runtime-html/src/resources/template-controllers/switch.ts
  test.skip("switch/case shows correct initial branch", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const loading = await ctx.page.locator('[data-testid="status-loading"]').isVisible();
    const success = await ctx.page.locator('[data-testid="status-success"]').isVisible();
    const error = await ctx.page.locator('[data-testid="status-error"]').isVisible();

    expect(loading).toBe(false);
    expect(success).toBe(true);
    expect(error).toBe(false);
  });

  test.skip("switch/case cycles through states after hydration", async () => {
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

  // ==========================================================================
  // Other Bindings
  // ==========================================================================

  test("ref binding works after hydration", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const input = ctx.page.locator('[data-testid="ref-input"]');
    const visible = await input.isVisible();
    expect(visible).toBe(true);

    const value = await input.inputValue();
    expect(value).toBe("initial");
  });

  test("let element computes derived value", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const computed = await ctx.page.locator('[data-testid="computed-value"]').textContent();
    expect(computed).toBe("Doubled: 0");
  });

  test("let element updates when source changes", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    await ctx.page.locator('[data-testid="increment"]').click();
    await ctx.page.locator('[data-testid="increment"]').click();

    const computed = await ctx.page.locator('[data-testid="computed-value"]').textContent();
    expect(computed).toBe("Doubled: 4");
  });
});
