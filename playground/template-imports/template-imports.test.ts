/**
 * Template Imports E2E Test
 *
 * Tests that components imported via <import from="./counter"> in templates:
 * 1. Resolve correctly in the AOT compiler
 * 2. Generate proper dependencies array in $au
 * 3. Render and function correctly at runtime
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import {
  setupTestContext,
  waitForAureliaReady,
  type TestContext,
} from "../helpers";

const configFile = resolve(import.meta.dirname, "vite.config.ts");

describe("Template Imports (E2E)", () => {
  let ctx: TestContext & { cleanup: () => Promise<void> };

  beforeAll(async () => {
    ctx = await setupTestContext(configFile);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  test("imported components render with correct initial state", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Check main title
    expect(await ctx.page.locator('[data-testid="title"]').textContent()).toBe(
      "Template Imports Demo"
    );

    // Both counters should be present
    expect(await ctx.page.locator('[data-testid="first-counter"]').count()).toBe(1);
    expect(await ctx.page.locator('[data-testid="second-counter"]').count()).toBe(1);

    // Check initial values (both start at 0)
    expect(
      await ctx.page
        .locator('[data-testid="first-counter"] [data-testid="counter-value"]')
        .textContent()
    ).toBe("0");
    expect(
      await ctx.page
        .locator('[data-testid="second-counter"] [data-testid="counter-value"]')
        .textContent()
    ).toBe("0");

    // Check labels (bound vs literal)
    expect(
      await ctx.page
        .locator('[data-testid="first-counter"] [data-testid="counter-label"]')
        .textContent()
    ).toBe("First Counter:");
    expect(
      await ctx.page
        .locator('[data-testid="second-counter"] [data-testid="counter-label"]')
        .textContent()
    ).toBe("Second Counter:");
  });

  test("imported counters work independently", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click first counter increment
    await ctx.page
      .locator('[data-testid="first-counter"] [data-testid="counter-inc"]')
      .click();

    // First counter should be 1, second still 0
    expect(
      await ctx.page
        .locator('[data-testid="first-counter"] [data-testid="counter-value"]')
        .textContent()
    ).toBe("1");
    expect(
      await ctx.page
        .locator('[data-testid="second-counter"] [data-testid="counter-value"]')
        .textContent()
    ).toBe("0");

    // Click second counter decrement
    await ctx.page
      .locator('[data-testid="second-counter"] [data-testid="counter-dec"]')
      .click();

    // Second counter should be -1
    expect(
      await ctx.page
        .locator('[data-testid="second-counter"] [data-testid="counter-value"]')
        .textContent()
    ).toBe("-1");

    // Click first counter 2 more times
    const firstInc = ctx.page.locator(
      '[data-testid="first-counter"] [data-testid="counter-inc"]'
    );
    await firstInc.click();
    await firstInc.click();

    // Click second counter 3 times
    const secondInc = ctx.page.locator(
      '[data-testid="second-counter"] [data-testid="counter-inc"]'
    );
    await secondInc.click();
    await secondInc.click();
    await secondInc.click();

    // Verify final independent state
    expect(
      await ctx.page
        .locator('[data-testid="first-counter"] [data-testid="counter-value"]')
        .textContent()
    ).toBe("3");
    expect(
      await ctx.page
        .locator('[data-testid="second-counter"] [data-testid="counter-value"]')
        .textContent()
    ).toBe("2");
  });
});
