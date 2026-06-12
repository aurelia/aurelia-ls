#!/usr/bin/env node
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = new URL("../out/bin/aurelia-inspect.js", import.meta.url);

if (!existsSync(fileURLToPath(target))) {
  console.error("aurelia-inspect is not built yet. Run `pnpm --filter @aurelia-ls/semantic-workspace build` first.");
  process.exit(1);
}

await import(target.href);
