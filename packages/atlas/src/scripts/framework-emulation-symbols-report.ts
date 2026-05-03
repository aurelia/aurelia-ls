import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createApi } from "../session/index.js";

const args = parseArgs(process.argv.slice(2));
const defaultOutPath = fileURLToPath(
  new URL("../../workbench/emulation-symbols.md", import.meta.url),
);
const outPath = resolve(args.get("out") ?? defaultOutPath);

const api = createApi({
  idleTtlMs: 10 * 60 * 1000,
  requestTimeoutMs: 120_000,
});
const report = await api.frameworkEmulationSymbolsReport();

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, report.markdown, "utf8");

console.log(
  JSON.stringify(
    {
      outPath,
      ...report.stats,
    },
    null,
    2,
  ),
);

function parseArgs(argv: readonly string[]): ReadonlyMap<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === undefined || !key.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near '${key ?? ""}'. Use --out <path>.`);
    }
    parsed.set(key.slice(2), value);
  }
  return parsed;
}
