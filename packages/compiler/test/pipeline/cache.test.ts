import { describe, test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  MemoryStageCache,
  FileStageCache,
  createDefaultCacheDir,
  type StageCacheEntry,
} from "../../src/pipeline/cache.js";
import { stableHash } from "../../src/pipeline/hash.js";

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-cache-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("pipeline cache", () => {
  test("MemoryStageCache stores and loads entries", () => {
    const cache = new MemoryStageCache();
    const entry: StageCacheEntry = {
      meta: { artifactHash: "hash", cacheKey: "key", version: "1", key: "10-lower" },
      artifact: { hello: "world" },
    };

    expect(cache.load("missing")).toBeNull();
    cache.store("key", entry);
    expect(cache.load("key")).toEqual(entry);
  });

  test("FileStageCache stores and revives Map/Set artifacts", () => {
    withTempDir((dir) => {
      const cache = new FileStageCache(dir);
      const artifact = {
        map: new Map([["a", 1]]),
        set: new Set([1, 2]),
      };
      const entry: StageCacheEntry = {
        meta: { artifactHash: "hash", cacheKey: "key", version: "1", key: "10-lower" },
        artifact,
      };

      cache.store("key", entry);
      const loaded = cache.load<typeof artifact>("key");
      expect(loaded).toBeTruthy();
      expect(loaded?.artifact.map).toBeInstanceOf(Map);
      expect(Array.from(loaded?.artifact.map.entries() ?? [])).toEqual([["a", 1]]);
      expect(loaded?.artifact.set).toBeInstanceOf(Set);
      expect(Array.from(loaded?.artifact.set.values() ?? [])).toEqual([1, 2]);
    });
  });

  test("FileStageCache hashes long keys", () => {
    withTempDir((dir) => {
      const cache = new FileStageCache(dir);
      const key = "x".repeat(128);
      const entry: StageCacheEntry = {
        meta: { artifactHash: "hash", cacheKey: key, version: "1", key: "10-lower" },
        artifact: { ok: true },
      };

      cache.store(key, entry);
      const expected = path.join(dir, `${stableHash(key)}.json`);
      expect(fs.existsSync(expected)).toBe(true);
    });
  });

  test("FileStageCache returns null for invalid JSON", () => {
    withTempDir((dir) => {
      const cache = new FileStageCache(dir);
      const file = path.join(dir, "bad.json");
      fs.writeFileSync(file, "{", "utf8");
      expect(cache.load("bad")).toBeNull();
    });
  });

  test("createDefaultCacheDir uses cwd", () => {
    const expected = path.join(process.cwd(), ".aurelia-cache");
    expect(createDefaultCacheDir()).toBe(expected);
  });
});
