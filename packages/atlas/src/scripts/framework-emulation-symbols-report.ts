import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { createApi } from "../session/index.js";

const { values } = parseArgs({ options: { out: { type: "string" } } });

const api = createApi({
  idleTtlMs: 10 * 60 * 1000,
  requestTimeoutMs: 120_000,
});
const report = await api.frameworkEmulationSymbolsReport();

if (values.out === undefined) {
  process.stdout.write(report.markdown);
} else {
  const outPath = resolve(values.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, report.markdown, "utf8");
  console.log(JSON.stringify({ outPath, ...report.stats }, null, 2));
}
