/**
 * Template Imports E2E Test
 *
 * Tests that components imported via <import from="./counter"> in templates:
 * 1. Resolve correctly in the AOT compiler
 * 2. Generate proper dependencies array in $au
 * 3. Render and function correctly at runtime
 *
 * This is an end-to-end test for the localImports feature.
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

  test("page loads with imported component", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Check main title is rendered
    const title = await ctx.page
      .locator('[data-testid="title"]')
      .textContent();
    expect(title).toBe("Template Imports Demo");
  });

  test("imported counter component renders", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // First counter should be present
    const firstCounter = await ctx.page
      .locator('[data-testid="first-counter"]')
      .count();
    expect(firstCounter).toBe(1);

    // Second counter should be present
    const secondCounter = await ctx.page
      .locator('[data-testid="second-counter"]')
      .count();
    expect(secondCounter).toBe(1);
  });

  test("imported counter has correct initial state", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Check first counter's value
    const firstValue = await ctx.page
      .locator('[data-testid="first-counter"] [data-testid="counter-value"]')
      .textContent();
    expect(firstValue).toBe("0");

    // Check second counter's value
    const secondValue = await ctx.page
      .locator('[data-testid="second-counter"] [data-testid="counter-value"]')
      .textContent();
    expect(secondValue).toBe("0");
  });

  test("imported counter label bindable works", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Check first counter's label (bound)
    const firstLabel = await ctx.page
      .locator('[data-testid="first-counter"] [data-testid="counter-label"]')
      .textContent();
    expect(firstLabel).toBe("First Counter:");

    // Check second counter's label (literal)
    const secondLabel = await ctx.page
      .locator('[data-testid="second-counter"] [data-testid="counter-label"]')
      .textContent();
    expect(secondLabel).toBe("Second Counter:");
  });

  test("imported counter increment works", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click increment on first counter
    await ctx.page
      .locator('[data-testid="first-counter"] [data-testid="counter-inc"]')
      .click();

    // Verify it incremented
    const firstValue = await ctx.page
      .locator('[data-testid="first-counter"] [data-testid="counter-value"]')
      .textContent();
    expect(firstValue).toBe("1");

    // Second counter should still be 0
    const secondValue = await ctx.page
      .locator('[data-testid="second-counter"] [data-testid="counter-value"]')
      .textContent();
    expect(secondValue).toBe("0");
  });

  test("imported counter decrement works", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click decrement on second counter
    await ctx.page
      .locator('[data-testid="second-counter"] [data-testid="counter-dec"]')
      .click();

    // Verify it decremented
    const secondValue = await ctx.page
      .locator('[data-testid="second-counter"] [data-testid="counter-value"]')
      .textContent();
    expect(secondValue).toBe("-1");
  });

  test("multiple counters are independent", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click first counter 3 times
    const firstInc = ctx.page.locator(
      '[data-testid="first-counter"] [data-testid="counter-inc"]'
    );
    await firstInc.click();
    await firstInc.click();
    await firstInc.click();

    // Click second counter 2 times
    const secondInc = ctx.page.locator(
      '[data-testid="second-counter"] [data-testid="counter-inc"]'
    );
    await secondInc.click();
    await secondInc.click();

    // Verify counters are independent
    const firstValue = await ctx.page
      .locator('[data-testid="first-counter"] [data-testid="counter-value"]')
      .textContent();
    expect(firstValue).toBe("3");

    const secondValue = await ctx.page
      .locator('[data-testid="second-counter"] [data-testid="counter-value"]')
      .textContent();
    expect(secondValue).toBe("2");
  });
});
