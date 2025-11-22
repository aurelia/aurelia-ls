import fs from "node:fs";
import path from "node:path";

/**
 * Generic set diff by key.
 * Given two arrays + key fn, returns { missing, extra } of the key strings.
 */
export function diffByKey(actualArr, expectedArr, keyFn) {
  const a = new Set((actualArr ?? []).map(keyFn));
  const e = new Set((expectedArr ?? []).map(keyFn));

  const missing = [...e].filter(k => !a.has(k));
  const extra   = [...a].filter(k => !e.has(k));
  return { missing, extra };
}

/**
 * Pretty-print helper for assertion messages.
 */
export function fmtList(label, arr) {
  return arr && arr.length
    ? `\n${label}:\n - ${arr.join("\n - ")}\n`
    : "";
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
export function createFailureRecorder(dirname, outFileName) {
  const records = [];

  function recordFailure(entry) {
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
      // eslint-disable-next-line no-console
      console.error(`Wrote test failure snapshot to ${outPath}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`ERROR: failed to write ${outFileName}: ${e.message}`);
    }
  }

  function attachWriter() {
    // One file per node process; good enough for these suites.
    process.on("exit", writeOut);
  }

  return { recordFailure, attachWriter };
}
