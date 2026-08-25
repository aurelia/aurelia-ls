import { spawnSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const runnerPath = resolve(packageRoot, "scripts/run-jit-oracle.mjs");

describe("AOT JIT oracle CLI", () => {
  it("gates the full corpus with one uncontaminated file-backed JSON receipt", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "aot-jit-oracle-cli-"));
    const outputPath = join(temporaryRoot, "receipt.json");
    const stdoutPath = join(temporaryRoot, "stdout.json");
    const stdoutFd = openSync(stdoutPath, "w");
    let stdoutOpen = true;
    try {
      const result = runCliToFile(
        stdoutFd,
        "--json",
        `--output=${outputPath}`,
        "--build-id=vitest-contract",
      );
      closeSync(stdoutFd);
      stdoutOpen = false;

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const stdoutJson = readFileSync(stdoutPath, "utf8");
      expect(stdoutJson).toBe(readFileSync(outputPath, "utf8"));
      const receipt = JSON.parse(stdoutJson) as JitOracleReceipt;
      expect(receipt.schemaVersion).toBe("aurelia-ls/aot-jit-oracle-run/v1");
      expect(receipt.environment.buildId).toBe("vitest-contract");
      expect(receipt.environment.framework.revision).toMatch(/^[0-9a-f]{40}$/u);
      expect(receipt.caseRegistry.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(receipt.result.failedCount).toBe(0);
      expect(receipt.result.executionCount).toBeGreaterThan(0);
    } finally {
      if (stdoutOpen) {
        closeSync(stdoutFd);
      }
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("emits a versioned JSON infrastructure failure without contaminating stdout", () => {
    const result = runCli("--json", "--family=missing");

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    const receipt = JSON.parse(result.stdout) as { schemaVersion: string; outcome: string };
    expect(receipt.schemaVersion).toBe("aurelia-ls/aot-jit-oracle-error/v1");
    expect(receipt.outcome).toBe("infrastructure-failure");
  });
});

interface JitOracleReceipt {
  readonly schemaVersion: string;
  readonly environment: {
    readonly buildId: string | null;
    readonly framework: { readonly revision: string | null };
  };
  readonly caseRegistry: { readonly fingerprint: string };
  readonly result: { readonly failedCount: number; readonly executionCount: number };
}

function runCli(...args: readonly string[]): ReturnType<typeof spawnSync> & { stdout: string; stderr: string } {
  return spawnSync(process.execPath, [runnerPath, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function runCliToFile(stdoutFd: number, ...args: readonly string[]): { status: number | null; stderr: string } {
  const result = spawnSync(process.execPath, [runnerPath, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", stdoutFd, "pipe"],
  });
  return { status: result.status, stderr: result.stderr };
}
