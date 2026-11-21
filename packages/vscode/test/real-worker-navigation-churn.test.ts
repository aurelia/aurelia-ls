import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const FIXTURE_HOST = path.resolve(import.meta.dirname, "fixtures/resource-navigation-churn-host.mjs");
const TEMP_PARENT = path.resolve(import.meta.dirname, "../../semantic-runtime/.temp");
const TEMP_PREFIX = "vscode-worker-navigation-";

test("cancels superseded resource navigation and opens only the fresh final location through a real Worker", async () => {
  // Resolve Aurelia from the package while keeping every edit in a uniquely owned fixture.
  await mkdir(TEMP_PARENT, { recursive: true });
  const workspace = await mkdtemp(path.join(TEMP_PARENT, TEMP_PREFIX));
  try {
    const { stdout } = await promisify(execFile)(process.execPath, [FIXTURE_HOST, workspace], {
      // A host NODE_OPTIONS heap override would defeat Worker resourceLimits.
      env: { ...process.env, NODE_OPTIONS: "" },
      timeout: 60_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    const result = JSON.parse(stdout);
    expect(result.configuredOldGenerationMiB).toBe(768);
    expect(result.effectiveHeapLimitBytes).toBeGreaterThanOrEqual(768 * 1024 * 1024);
    expect(result.effectiveHeapLimitBytes).toBeLessThanOrEqual(800 * 1024 * 1024);
    expect(result.outcomes).toEqual([false, false, false, true]);
    expect(result.navigationCancellations).toBe(3);
    expect(result.navigationTokenCount).toBe(4);
    expect(result.cancelledNavigationTokens).toBe(3);
    expect(result.openedDocuments).toEqual([result.currentLocation.uri]);
    expect(result.shownDocuments).toEqual([{
      uri: result.currentLocation.uri,
      preview: true,
      selection: result.currentLocation.range,
    }]);
    expect(result.currentLocation.range.start.line).toBe(result.coldLocation.range.start.line + 2);
    expect(result.currentLocation.range.start.character).toBe(result.coldLocation.range.start.character);
    expect(result.informationMessages).toEqual([]);
    expect(result.fingerprintChanged).toBe(true);
    expect(result.hasExpectedResources).toBe(true);
    expect(result.hasNullTokenFailure).toBe(false);
    expect(result.requestFailures).toEqual([]);
    expect(result.wireCalls.filter((call: { tokenSupplied: boolean }) => !call.tokenSupplied)).toEqual([
      { method: "aurelia/resourceInventory", arity: 2, tokenSupplied: false },
      { method: "aurelia/resourceInventory", arity: 2, tokenSupplied: false },
    ]);
    const navigationCalls = result.wireCalls.filter((call: { tokenSupplied: boolean }) => call.tokenSupplied);
    expect(navigationCalls.length).toBeGreaterThanOrEqual(4);
    // Three superseded intents cannot retry; only the surviving intent may use its existing three-attempt budget.
    expect(navigationCalls.length).toBeLessThanOrEqual(6);
    expect(navigationCalls.every((call: { arity: number }) => call.arity === 3)).toBe(true);
    expect(result.inventoryRequests.failed).toBe(0);
    expect(result.inventoryRequests.started).toBeLessThanOrEqual(8);
    expect(result.workerOnlineCount).toBe(1);
    expect(result.workerErrors).toEqual([]);
    expect(result.exitCode).toBe(0);
  } finally {
    const resolved = path.resolve(workspace);
    if (path.dirname(resolved) !== TEMP_PARENT || !path.basename(resolved).startsWith(TEMP_PREFIX)) {
      throw new Error(`Refusing to remove unexpected navigation fixture: ${resolved}`);
    }
    await rm(resolved, { recursive: true, force: true });
  }
}, 65_000);
