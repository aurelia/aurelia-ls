import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { stableStringify } from "@aurelia-ls/resolution";
import type { CompileRunResult, IntegrationRun } from "./runner.js";

export interface SnapshotPaths {
  semantic: string;
  apiSurface: string;
  aot?: string;
}

export interface SnapshotComparison {
  match: boolean;
  expected?: string;
  actual: string;
}

export function getSnapshotPaths(baseDir: string, scenarioId: string): SnapshotPaths {
  return {
    semantic: join(baseDir, `${scenarioId}.semantic.json`),
    apiSurface: join(baseDir, `${scenarioId}.api.json`),
    aot: join(baseDir, `${scenarioId}.aot.json`),
  };
}

export function normalizeSnapshot(value: unknown): string {
  return stableStringify(value) + "\n";
}

export function writeSnapshot(path: string, value: unknown): void {
  writeFileSync(path, normalizeSnapshot(value));
}

export function readSnapshot(path: string): string | null {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

export function compareSnapshot(path: string, value: unknown): SnapshotComparison {
  const actual = normalizeSnapshot(value);
  const expected = readSnapshot(path);
  if (expected === null) {
    return { match: false, actual };
  }
  return {
    match: expected === actual,
    expected,
    actual,
  };
}

export function createSnapshotBundle(run: IntegrationRun): Record<string, unknown> {
  const aot: Record<string, unknown> = {};
  for (const [id, result] of Object.entries(run.compile)) {
    const normalized = normalizeAotResult(result);
    if (normalized) {
      aot[id] = normalized;
    }
  }
  return {
    semantic: run.snapshots.semantic,
    apiSurface: run.snapshots.apiSurface,
    ...(Object.keys(aot).length ? { aot } : {}),
  };
}

function normalizeAotResult(result: CompileRunResult): unknown | null {
  if (!result.aot) return null;
  return {
    template: result.aot.template,
    definition: result.aot.codeResult.definition,
    expressions: result.aot.codeResult.expressions,
  };
}
