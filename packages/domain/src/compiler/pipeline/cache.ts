import fs from "node:fs";
import path from "node:path";
import { stableHash } from "./hash.js";

export interface StageCacheEntry<TValue = unknown> {
  meta: {
    artifactHash: string;
    cacheKey: string;
    version: string;
    key: string;
    fromCache?: boolean;
  };
  artifact: TValue;
}

export interface StageCache {
  load<TValue = unknown>(key: string): StageCacheEntry<TValue> | null;
  store<TValue = unknown>(key: string, entry: StageCacheEntry<TValue>): void;
}

/** In-memory cache layer (per session). */
export class MemoryStageCache implements StageCache {
  #store = new Map<string, StageCacheEntry>();
  load<TValue = unknown>(key: string): StageCacheEntry<TValue> | null {
    return (this.#store.get(key) as StageCacheEntry<TValue> | undefined) ?? null;
  }
  store<TValue = unknown>(key: string, entry: StageCacheEntry<TValue>): void {
    this.#store.set(key, entry);
  }
}

/** File-system cache layer. */
export class FileStageCache implements StageCache {
  #dir: string;
  constructor(dir: string) {
    this.#dir = dir;
  }

  load<TValue = unknown>(key: string): StageCacheEntry<TValue> | null {
    const file = this.#pathFor(key);
    if (!fs.existsSync(file)) return null;
    try {
      const text = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(text, cacheReviver) as StageCacheEntry<TValue>;
      return parsed;
    } catch {
      return null;
    }
  }

  store<TValue = unknown>(key: string, entry: StageCacheEntry<TValue>): void {
    const file = this.#pathFor(key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const payload = JSON.stringify(entry, cacheReplacer);
    fs.writeFileSync(file, payload, "utf8");
  }

  #pathFor(key: string): string {
    const safeKey = key.length > 64 ? stableHash(key) : key;
    return path.join(this.#dir, `${safeKey}.json`);
  }
}

export function createDefaultCacheDir(): string {
  return path.join(process.cwd(), ".aurelia-cache");
}

function cacheReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return { __cacheType: "Map", entries: Array.from(value.entries()) };
  }
  if (value instanceof Set) {
    return { __cacheType: "Set", values: Array.from(value.values()) };
  }
  return value;
}

function cacheReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object") {
    const record = value as { __cacheType?: string; entries?: [unknown, unknown][]; values?: unknown[] };
    if (record.__cacheType === "Map" && Array.isArray(record.entries)) {
      return new Map(record.entries);
    }
    if (record.__cacheType === "Set" && Array.isArray(record.values)) {
      return new Set(record.values);
    }
  }
  return value;
}
