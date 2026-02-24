import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.resolve(
  process.cwd(),
  "node_modules",
  ".cache",
  "aurelia-test-discovery",
);

export function setup() {
  // Discovery cache uses content-fingerprinted filenames, so stale entries
  // are naturally bypassed. No need to clear on every run — just let the
  // cache accumulate and reuse across vitest invocations.
}
