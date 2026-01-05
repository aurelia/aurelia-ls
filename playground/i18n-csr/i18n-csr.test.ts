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

  test("page loads without SSR and static key renders", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Verify no SSR
    const hadSSR = await wasSSRRendered(ctx.page);
    expect(hadSSR).toBe(false);

    // Static key: t="greeting.hello"
    const staticResult = await ctx.page
      .locator('[data-testid="static-result"]')
      .textContent();
    expect(staticResult).toBe("Hello World");
  });

  test("interpolated key renders and updates reactively", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const locator = ctx.page.locator('[data-testid="interpolated-result"]');

    // Initial value is "medium"
    expect(await locator.textContent()).toBe("Medium Priority");

    // Click "Low" button → updates to low
    await ctx.page.locator('[data-testid="set-low"]').click();
    expect(await locator.textContent()).toBe("Low Priority");

    // Click "High" button → updates to high
    await ctx.page.locator('[data-testid="set-high"]').click();
    expect(await locator.textContent()).toBe("High Priority");
  });

  test("bound expression renders and updates reactively", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    const locator = ctx.page.locator('[data-testid="bound-result"]');

    // Initial value is "status.pending"
    expect(await locator.textContent()).toBe("Pending");

    // Click "Open" button
    await ctx.page.locator('[data-testid="set-open"]').click();
    expect(await locator.textContent()).toBe("Open");

    // Click "Closed" button
    await ctx.page.locator('[data-testid="set-closed"]').click();
    expect(await locator.textContent()).toBe("Closed");
  });

  test("bracket syntax sets attributes correctly", async () => {
    await ctx.page.goto(ctx.url);
    await waitForAureliaReady(ctx.page);

    // Static bracket: t="[title]tooltip.message"
    const staticTitle = await ctx.page
      .locator('[data-testid="bracket-static-result"]')
      .getAttribute("title");
    expect(staticTitle).toBe("This is a tooltip");

    // Interpolated bracket: t="[title]tooltip.${type}" - initial is "info"
    const interpolatedLocator = ctx.page.locator(
      '[data-testid="bracket-interpolated-result"]'
    );
    expect(await interpolatedLocator.getAttribute("title")).toBe(
      "More information"
    );

    // Click "Warning" button → updates title
    await ctx.page.locator('[data-testid="set-warning"]').click();
    expect(await interpolatedLocator.getAttribute("title")).toBe(
      "Warning message"
    );
  });
});
