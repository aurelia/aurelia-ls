import fs from "node:fs";
import path from "node:path";
import type { ModuleResolver } from "@aurelia-ls/compiler";

export const noopModuleResolver: ModuleResolver = () => null;

/**
 * Generic set diff by key.
 * Given two arrays + key fn, returns { missing, extra } of the key strings.
 */
export function diffByKey<T>(
  actualArr: T[] | undefined,
  expectedArr: T[] | undefined,
  keyFn: (item: T) => string
): { missing: string[]; extra: string[] } {
  const a = new Set((actualArr ?? []).map(keyFn));
  const e = new Set((expectedArr ?? []).map(keyFn));

  const missing = [...e].filter((k) => !a.has(k));
  const extra = [...a].filter((k) => !e.has(k));
  return { missing, extra };
}

/**
 * Multiset diff by key.
 * Preserves duplicate cardinality (same key may appear multiple times).
 */
export function diffByKeyCounts<T>(
  actualArr: T[] | undefined,
  expectedArr: T[] | undefined,
  keyFn: (item: T) => string
): { missing: string[]; extra: string[] } {
  const actual = toCountMap(actualArr, keyFn);
  const expected = toCountMap(expectedArr, keyFn);
  const keys = new Set([...actual.keys(), ...expected.keys()]);
  const missing: string[] = [];
  const extra: string[] = [];

  for (const key of keys) {
    const actualCount = actual.get(key) ?? 0;
    const expectedCount = expected.get(key) ?? 0;
    if (expectedCount > actualCount) {
      for (let i = 0; i < expectedCount - actualCount; i++) missing.push(key);
    } else if (actualCount > expectedCount) {
      for (let i = 0; i < actualCount - expectedCount; i++) extra.push(key);
    }
  }

  return { missing, extra };
}

function toCountMap<T>(
  values: T[] | undefined,
  keyFn: (item: T) => string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const value of values ?? []) {
    const key = keyFn(value);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * Pretty-print helper for assertion messages.
 */
export function fmtList(label: string, arr: string[] | undefined): string {
  return arr && arr.length ? `\n${label}:\n - ${arr.join("\n - ")}\n` : "";
}

/**
 * Create a simple per-suite failure recorder that writes a JSON file on exit.
 *
 * Usage in a test file:
 *   const { recordFailure, attachWriter } = createFailureRecorder(__dirname, "failures.json");
 *   attachWriter();
 *   ...
 *   if (mismatch) recordFailure({ ... });
 */
export function createFailureRecorder(dirname: string, outFileName: string) {
  const records: unknown[] = [];

  function recordFailure(entry: unknown) {
    records.push(entry);
  }

  function writeOut() {
    const outPath = path.join(dirname, outFileName);
    if (!records.length) {
      // Clean up stale failure file if present.
      try {
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      } catch {
        /* ignore cleanup errors */
      }
      return;
    }
    try {
      fs.writeFileSync(outPath, JSON.stringify(records, null, 2), "utf8");
      console.error(`Wrote test failure snapshot to ${outPath}`);
    } catch (e) {
      console.error(
        `ERROR: failed to write ${outFileName}: ${(e as Error).message}`
      );
    }
  }

  function attachWriter() {
    // One file per node process; good enough for these suites.
    process.on("exit", writeOut);
  }

  return { recordFailure, attachWriter };
}
