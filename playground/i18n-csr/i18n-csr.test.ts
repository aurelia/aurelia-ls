/**
 * i18n CSR E2E Test
 *
 * Tests translation bindings with AOT compilation in pure CSR mode (no SSR).
 * This validates that AOT-compiled translation instructions work correctly
 * without hydration complexity.
 *
 * Test Cases:
 * 1. Static key: t="greeting.hello"
 * 2. Interpolated key: t="priority.${level}"
 * 3. Bound expression: t.bind="statusKey"
 * 4. Bracket syntax (static): t="[title]tooltip.message"
 * 5. Bracket syntax (interpolated): t="[title]tooltip.${tooltipType}"
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

describe("i18n CSR (AOT Translation Bindings)", () => {
  let ctx: TestContext & { cleanup: () => Promise<void> };

  beforeAll(async () => {
    ctx = await setupTestContext(configFile);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  // ==========================================================================
  // Basic Setup
  // ==========================================================================

  test("page loads without SSR", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const hadSSR = await wasSSRRendered(ctx.page);
    expect(hadSSR).toBe(false);
  });

  // ==========================================================================
  // Test 1: Static Translation Key
  // ==========================================================================

  test("static key: t='greeting.hello' renders translation", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const result = await ctx.page
      .locator('[data-testid="static-result"]')
      .textContent();

    expect(result).toBe("Hello World");
  });

  // ==========================================================================
  // Test 2: Interpolated Translation Key
  // ==========================================================================

  test("interpolated key: t='priority.${level}' renders with initial value", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const result = await ctx.page
      .locator('[data-testid="interpolated-result"]')
      .textContent();

    // Initial value is "medium"
    expect(result).toBe("Medium Priority");
  });

  test("interpolated key: updates when level changes", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click "Low" button
    await ctx.page.locator('[data-testid="set-low"]').click();

    const result = await ctx.page
      .locator('[data-testid="interpolated-result"]')
      .textContent();

    expect(result).toBe("Low Priority");
  });

  test("interpolated key: updates again when level changes", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click "High" button
    await ctx.page.locator('[data-testid="set-high"]').click();

    const result = await ctx.page
      .locator('[data-testid="interpolated-result"]')
      .textContent();

    expect(result).toBe("High Priority");
  });

  // ==========================================================================
  // Test 3: Bound Expression
  // ==========================================================================

  test("bound expression: t.bind='statusKey' renders with initial value", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const result = await ctx.page
      .locator('[data-testid="bound-result"]')
      .textContent();

    // Initial value is "status.pending"
    expect(result).toBe("Pending");
  });

  test("bound expression: updates when key changes", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click "Open" button
    await ctx.page.locator('[data-testid="set-open"]').click();

    const result = await ctx.page
      .locator('[data-testid="bound-result"]')
      .textContent();

    expect(result).toBe("Open");
  });

  test("bound expression: updates again when key changes", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click "Closed" button
    await ctx.page.locator('[data-testid="set-closed"]').click();

    const result = await ctx.page
      .locator('[data-testid="bound-result"]')
      .textContent();

    expect(result).toBe("Closed");
  });

  // ==========================================================================
  // Test 4: Bracket Syntax (Static Key)
  // ==========================================================================

  test("bracket syntax static: t='[title]tooltip.message' sets title attribute", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const title = await ctx.page
      .locator('[data-testid="bracket-static-result"]')
      .getAttribute("title");

    expect(title).toBe("This is a tooltip");
  });

  // ==========================================================================
  // Test 5: Bracket Syntax (Interpolated Key)
  // ==========================================================================

  test("bracket syntax interpolated: t='[title]tooltip.${type}' sets title with initial value", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const title = await ctx.page
      .locator('[data-testid="bracket-interpolated-result"]')
      .getAttribute("title");

    // Initial value is "info"
    expect(title).toBe("More information");
  });

  test("bracket syntax interpolated: updates when type changes", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Click "Warning" button
    await ctx.page.locator('[data-testid="set-warning"]').click();

    const title = await ctx.page
      .locator('[data-testid="bracket-interpolated-result"]')
      .getAttribute("title");

    expect(title).toBe("Warning message");
  });
});
