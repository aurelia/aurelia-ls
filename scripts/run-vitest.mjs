import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const args = process.argv.slice(2);
const require = createRequire(import.meta.url);
const vitestPkg = require.resolve("vitest/package.json");
const vitestCli = path.join(path.dirname(vitestPkg), "vitest.mjs");

const env = { ...process.env };
env.AURELIA_RESOLUTION_STRIP_SOURCED_NODES ??= "1";
env.AURELIA_HARNESS_TRIM ??= "1";

const nodeOptions = env.NODE_OPTIONS ?? "";
if (!/\b--max-old-space-size=\d+\b/.test(nodeOptions)) {
  env.NODE_OPTIONS = `${nodeOptions} --max-old-space-size=2048`.trim();
}

const result = spawnSync(process.execPath, [vitestCli, "run", "--maxWorkers=2", ...args], {
  stdio: "inherit",
  env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
