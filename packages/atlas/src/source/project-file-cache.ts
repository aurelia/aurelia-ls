import { readFileSync, statSync } from "node:fs";

import ts from "typescript";

import { normalizeFileKey } from "./path.js";

/** Per-source-project file facts used by the TypeScript LanguageService host. */
export class SourceProjectFileCache {
  readonly #directoryExists = new Map<string, boolean>();
  readonly #directories = new Map<string, string[]>();
  readonly #fileExists = new Map<string, boolean>();
  readonly #hostReadFiles = new Map<string, string | undefined>();
  readonly #readDirectories = new Map<string, string[]>();
  readonly #realpaths = new Map<string, string>();
  readonly #scriptVersions = new Map<string, string>();
  readonly #scriptSnapshots = new Map<string, ts.IScriptSnapshot | undefined>();
  readonly #stats: SourceProjectFileCacheStats = {
    directoryExistsHits: 0,
    directoryExistsReads: 0,
    fileExistsHits: 0,
    fileExistsReads: 0,
    getDirectoriesHits: 0,
    getDirectoriesReads: 0,
    hostReadFileHits: 0,
    hostReadFileReads: 0,
    readDirectoryHits: 0,
    readDirectoryReads: 0,
    realpathHits: 0,
    realpathReads: 0,
    scriptSnapshotHits: 0,
    scriptSnapshotReads: 0,
    scriptVersionHits: 0,
    scriptVersionReads: 0,
  };

  /** Return the stable file version for this SourceProject epoch. */
  scriptVersion(fileName: string): string {
    const fileKey = normalizeFileKey(fileName);
    const cached = this.#scriptVersions.get(fileKey);
    if (cached !== undefined) {
      this.#stats.scriptVersionHits++;
      return cached;
    }
    this.#stats.scriptVersionReads++;
    const version = this.#readScriptVersion(fileName);
    this.#scriptVersions.set(fileKey, version);
    return version;
  }

  /** Return the cached script text for this SourceProject epoch. */
  scriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    const fileKey = normalizeFileKey(fileName);
    if (this.#scriptSnapshots.has(fileKey)) {
      this.#stats.scriptSnapshotHits++;
      return this.#scriptSnapshots.get(fileKey);
    }
    this.#stats.scriptSnapshotReads++;
    const snapshot = this.#readScriptSnapshot(fileName);
    this.#scriptSnapshots.set(fileKey, snapshot);
    return snapshot;
  }

  /** Return a cached host readFile result for TypeScript module resolution. */
  readFile(fileName: string): string | undefined {
    const fileKey = normalizeFileKey(fileName);
    if (this.#hostReadFiles.has(fileKey)) {
      this.#stats.hostReadFileHits++;
      return this.#hostReadFiles.get(fileKey);
    }
    this.#stats.hostReadFileReads++;
    const text = ts.sys.readFile(fileName);
    this.#hostReadFiles.set(fileKey, text);
    return text;
  }

  /** Return a cached host fileExists result for TypeScript module resolution. */
  fileExists(fileName: string): boolean {
    const fileKey = normalizeFileKey(fileName);
    const cached = this.#fileExists.get(fileKey);
    if (cached !== undefined) {
      this.#stats.fileExistsHits++;
      return cached;
    }
    this.#stats.fileExistsReads++;
    const exists = ts.sys.fileExists(fileName);
    this.#fileExists.set(fileKey, exists);
    return exists;
  }

  /** Return a cached host directoryExists result for TypeScript module resolution. */
  directoryExists(directoryName: string): boolean {
    const directoryKey = normalizeFileKey(directoryName);
    const cached = this.#directoryExists.get(directoryKey);
    if (cached !== undefined) {
      this.#stats.directoryExistsHits++;
      return cached;
    }
    this.#stats.directoryExistsReads++;
    const exists = ts.sys.directoryExists?.(directoryName) ?? false;
    this.#directoryExists.set(directoryKey, exists);
    return exists;
  }

  /** Return cached host readDirectory rows for TypeScript project/module discovery. */
  readDirectory(
    rootDir: string,
    extensions?: readonly string[],
    excludes?: readonly string[],
    includes?: readonly string[],
    depth?: number,
  ): string[] {
    const key = JSON.stringify([
      normalizeFileKey(rootDir),
      extensions,
      excludes,
      includes,
      depth,
    ]);
    const cached = this.#readDirectories.get(key);
    if (cached !== undefined) {
      this.#stats.readDirectoryHits++;
      return cached;
    }
    this.#stats.readDirectoryReads++;
    const entries = ts.sys.readDirectory(
      rootDir,
      extensions,
      excludes,
      includes,
      depth,
    );
    this.#readDirectories.set(key, entries);
    return entries;
  }

  /** Return cached host child directory names for TypeScript module resolution. */
  getDirectories(directoryName: string): string[] {
    const directoryKey = normalizeFileKey(directoryName);
    const cached = this.#directories.get(directoryKey);
    if (cached !== undefined) {
      this.#stats.getDirectoriesHits++;
      return cached;
    }
    this.#stats.getDirectoriesReads++;
    const directories = ts.sys.getDirectories(directoryName);
    this.#directories.set(directoryKey, directories);
    return directories;
  }

  /** Return a cached realpath result for TypeScript module resolution. */
  realpath(fileName: string): string {
    const fileKey = normalizeFileKey(fileName);
    const cached = this.#realpaths.get(fileKey);
    if (cached !== undefined) {
      this.#stats.realpathHits++;
      return cached;
    }
    this.#stats.realpathReads++;
    const real = ts.sys.realpath?.(fileName) ?? fileName;
    this.#realpaths.set(fileKey, real);
    return real;
  }

  /** Recheck the successful and failed filesystem observations consumed by this TypeScript host. */
  inputsAreCurrent(): boolean {
    for (const [file, snapshot] of this.#scriptSnapshots) {
      const text = snapshot?.getText(0, snapshot.getLength());
      if (text !== this.#readScriptText(file)) return false;
    }
    for (const [file, text] of this.#hostReadFiles) {
      if (ts.sys.readFile(file) !== text) return false;
    }
    for (const [file, exists] of this.#fileExists) {
      if (ts.sys.fileExists(file) !== exists) return false;
    }
    for (const [dir, exists] of this.#directoryExists) {
      if ((ts.sys.directoryExists?.(dir) ?? false) !== exists) return false;
    }
    for (const [file, real] of this.#realpaths) {
      if (normalizeFileKey(ts.sys.realpath?.(file) ?? file) !== normalizeFileKey(real)) return false;
    }
    for (const [dir, entries] of this.#directories) {
      if (!samePaths(ts.sys.getDirectories(dir), entries)) return false;
    }
    for (const [key, entries] of this.#readDirectories) {
      // JSON preserves omitted optional arguments as null in the cache key.
      const [dir, extensions, excludes, includes, depth] = JSON.parse(key) as
        [string, string[] | null, string[] | null, string[] | null, number | null];
      const current = ts.sys.readDirectory(dir, extensions ?? undefined, excludes ?? undefined, includes ?? undefined, depth ?? undefined);
      if (!samePaths(current, entries)) return false;
    }
    return true;
  }

  /** Compact profiling counters for one SourceProject epoch. */
  profile(): SourceProjectFileCacheProfile {
    return {
      ...this.#stats,
      directoryExistsCached: this.#directoryExists.size,
      fileExistsCached: this.#fileExists.size,
      getDirectoriesCached: this.#directories.size,
      hostReadFileCached: this.#hostReadFiles.size,
      readDirectoryCached: this.#readDirectories.size,
      realpathCached: this.#realpaths.size,
      scriptSnapshotCached: this.#scriptSnapshots.size,
      scriptVersionCached: this.#scriptVersions.size,
    };
  }

  #readScriptVersion(fileName: string): string {
    try {
      return String(statSync(fileName).mtimeMs);
    } catch {
      return "0";
    }
  }

  #readScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    const text = this.#readScriptText(fileName);
    return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
  }

  #readScriptText(fileName: string): string | undefined {
    try {
      return readFileSync(fileName, "utf8");
    } catch {
      return undefined;
    }
  }
}

function samePaths(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => normalizeFileKey(entry) === normalizeFileKey(right[index]!));
}

interface SourceProjectFileCacheStats {
  directoryExistsHits: number;
  directoryExistsReads: number;
  fileExistsHits: number;
  fileExistsReads: number;
  getDirectoriesHits: number;
  getDirectoriesReads: number;
  hostReadFileHits: number;
  hostReadFileReads: number;
  readDirectoryHits: number;
  readDirectoryReads: number;
  realpathHits: number;
  realpathReads: number;
  scriptSnapshotHits: number;
  scriptSnapshotReads: number;
  scriptVersionHits: number;
  scriptVersionReads: number;
}

interface SourceProjectFileCacheProfile extends SourceProjectFileCacheStats {
  directoryExistsCached: number;
  fileExistsCached: number;
  getDirectoriesCached: number;
  hostReadFileCached: number;
  readDirectoryCached: number;
  realpathCached: number;
  scriptSnapshotCached: number;
  scriptVersionCached: number;
}
