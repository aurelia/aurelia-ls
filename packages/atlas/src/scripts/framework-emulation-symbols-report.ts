import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseFlagValueArgs } from "../cli-args.js";
import { createApi } from "../session/index.js";

const args = parseFlagValueArgs(
  process.argv.slice(2),
  "Invalid framework emulation report argument",
  "Use --out <path>.",
);
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
