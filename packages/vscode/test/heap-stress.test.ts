import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const FIXTURE_HOST = path.resolve(import.meta.dirname, "fixtures/heap-stress-host.mjs");
const TEMP_PARENT = path.resolve(import.meta.dirname, "../../semantic-runtime/.temp");
const TEMP_PREFIX = "vscode-worker-heap-";

test("answers cold element hover and resource inventory within a constrained Worker heap", async () => {
  // Keep framework module resolution inside the package while giving every run an independent project.
  await mkdir(TEMP_PARENT, { recursive: true });
  const workspace = await mkdtemp(path.join(TEMP_PARENT, TEMP_PREFIX));
  try {
    // NODE_OPTIONS in the host overrides Worker resourceLimits. The child also contains fatal V8 aborts so
    // a regression fails this test without terminating the test runner or preventing fixture cleanup.
    const { stdout } = await promisify(execFile)(process.execPath, [FIXTURE_HOST, workspace], {
      env: { ...process.env, NODE_OPTIONS: "" },
      timeout: 60_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    const result = JSON.parse(stdout);
    expect(result.configuredOldGenerationMiB).toBe(768);
    expect(result.effectiveHeapLimitBytes).toBeGreaterThanOrEqual(768 * 1024 * 1024);
    expect(result.effectiveHeapLimitBytes).toBeLessThanOrEqual(800 * 1024 * 1024);
    expect(result.hover.contents.value).toContain("<item-0>");
    expect(result.hover.contents.value).toContain("Item0");
    expect(result.hover.range).toEqual({
      start: { line: 0, character: 11 },
      end: { line: 0, character: 17 },
    });
    expect(result.inventoryProjects).toEqual([
      { status: "ready", hasExpectedResources: true },
    ]);
    expect(result.semanticTokenCount).toBeGreaterThan(0);
    expect(result.diagnostics).toEqual({ kind: "full", count: 0 });
    expect(result.workerOnlineCount).toBe(1);
    expect(result.workerErrors).toEqual([]);
    expect(result.exitCode).toBe(0);
  } finally {
    const resolved = path.resolve(workspace);
    if (path.dirname(resolved) !== TEMP_PARENT || !path.basename(resolved).startsWith(TEMP_PREFIX)) {
      throw new Error(`Refusing to remove unexpected heap-stress fixture: ${resolved}`);
    }
    await rm(resolved, { recursive: true, force: true });
  }
}, 65_000);
