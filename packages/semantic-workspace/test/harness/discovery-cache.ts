/**
 * File-system discovery cache for parallel vitest workers.
 *
 * Caches ProjectSemanticsDiscoveryResult to disk so that parallel test
 * workers sharing the same fixture don't each re-run the full discovery
 * pipeline. The cache is keyed by fixture ID and a content fingerprint
 * of the fixture's source files.
 *
 * Concurrency model:
 * - Workers check for an existing cache file first.
 * - If absent, a lock file is created (optimistic). If the lock already
 *   exists, the worker polls until the cache file appears.
 * - The winning worker runs discovery, writes the cache atomically
 *   (write .tmp, rename), and removes the lock.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ProjectSemanticsDiscoveryResult } from "@aurelia-ls/compiler";

const CACHE_DIR = path.resolve(
  process.cwd(),
  "node_modules",
  ".cache",
  "aurelia-test-discovery",
);

const POLL_INTERVAL_MS = 50;
const MAX_WAIT_MS = 30_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to read a cached discovery result. If another worker is currently
 * building the cache (lock file exists), blocks with polling until the
 * result is available.
 */
export function getCachedDiscovery(
  fixtureId: string,
  fixtureRoot: string,
): ProjectSemanticsDiscoveryResult | null {
  const filePath = cacheFilePath(fixtureId, fixtureRoot);
  const lockPath = filePath + ".lock";

  // Fast path: cache already exists.
  const cached = tryRead(filePath);
  if (cached) return cached;

  // Check if another worker is building this cache.
  if (fs.existsSync(lockPath)) {
    return waitForCache(filePath, lockPath);
  }

  // No cache, no lock. Caller should build and call setCachedDiscovery.
  return null;
}

/**
 * Claim the build lock for a fixture. Returns true if this worker won
 * the race and should build the cache. Returns false if another worker
 * already holds the lock (caller should poll via getCachedDiscovery).
 */
export function claimCacheLock(
  fixtureId: string,
  fixtureRoot: string,
): boolean {
  const filePath = cacheFilePath(fixtureId, fixtureRoot);
  const lockPath = filePath + ".lock";
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    // O_EXCL: fail if the file already exists (atomic create).
    fs.writeFileSync(lockPath, String(process.pid), { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

export function setCachedDiscovery(
  fixtureId: string,
  fixtureRoot: string,
  discovery: ProjectSemanticsDiscoveryResult,
): void {
  const filePath = cacheFilePath(fixtureId, fixtureRoot);
  const lockPath = filePath + ".lock";
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = filePath + ".tmp." + process.pid;
    fs.writeFileSync(tmp, serialize(discovery), "utf8");
    fs.renameSync(tmp, filePath);
  } catch {
    // Best-effort: don't fail tests if cache write fails.
  }
  // Release lock.
  try { fs.unlinkSync(lockPath); } catch { /* already gone */ }
}

export function clearDiscoveryCache(): void {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    }
  } catch {
    // Best-effort cleanup.
  }
}

// ---------------------------------------------------------------------------
// Blocking wait
// ---------------------------------------------------------------------------

function waitForCache(
  filePath: string,
  lockPath: string,
): ProjectSemanticsDiscoveryResult | null {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const cached = tryRead(filePath);
    if (cached) return cached;
    // If lock disappeared but no cache, another worker failed. Give up.
    if (!fs.existsSync(lockPath)) return null;
    sleepSync(POLL_INTERVAL_MS);
  }
  // Timeout — fall through to run discovery ourselves.
  return null;
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function tryRead(filePath: string): ProjectSemanticsDiscoveryResult | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return deserialize(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

function cacheFilePath(fixtureId: string, fixtureRoot: string): string {
  const fingerprint = fixtureFingerprint(fixtureRoot);
  const safeId = fixtureId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safeId}-${fingerprint}.json`);
}

/**
 * Fingerprint a fixture directory by hashing all .ts file paths and sizes.
 * This is fast (stat, not read) and detects file additions/deletions/size changes.
 */
function fixtureFingerprint(fixtureRoot: string): string {
  const hash = crypto.createHash("sha256");
  const entries = collectSourceEntries(fixtureRoot);
  for (const entry of entries) {
    hash.update(entry);
  }
  return hash.digest("hex").slice(0, 12);
}

function collectSourceEntries(dir: string): string[] {
  const entries: string[] = [];
  try {
    walk(dir, entries);
  } catch {
    // If we can't walk the directory, return empty → unique fingerprint per run.
  }
  entries.sort();
  return entries;
}

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".html") || entry.name === "tsconfig.json") {
      const stat = fs.statSync(full);
      out.push(`${full}:${stat.size}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

// Tagged serialization for Maps. Uses a distinctive key that won't collide
// with real data structures in the discovery result.
const MAP_SENTINEL = "\0__aurelia_map__";

function serialize(discovery: ProjectSemanticsDiscoveryResult): string {
  return JSON.stringify(discovery, (_key, value) => {
    if (value instanceof Map) {
      return { [MAP_SENTINEL]: Array.from(value.entries()) };
    }
    return value;
  });
}

function deserialize(json: string): ProjectSemanticsDiscoveryResult {
  return JSON.parse(json, (_key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value) && MAP_SENTINEL in value) {
      return new Map(value[MAP_SENTINEL]);
    }
    return value;
  });
}
