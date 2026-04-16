import { execSync } from 'node:child_process';
import { existsSync, readdirSync, type Dirent } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import * as ts from 'typescript';

import {
  normalizeRepoRelativePath,
  resolveAnalysisProfile,
  type AnalysisProfile,
} from './analysis-profile.js';

export type TsProgramProfile = 'analysis' | 'analysis-no-resolve';

export interface RepoSessionOptions {
  readonly repoPath?: string;
  readonly target?: string;
  readonly profilePath?: string;
  readonly excludedRepoRelativePrefixes?: readonly string[] | null;
  readonly maxCachedPrograms?: number;
}

export interface LoadedTsconfigSnapshot {
  readonly absPath: string;
  readonly relPath: string;
  readonly configDir: string;
  readonly parsed: ts.ParsedCommandLine;
}

export interface LoadTsconfigResult {
  readonly snapshot: LoadedTsconfigSnapshot | null;
  readonly error: string | null;
}

export interface ProgramCacheOptions {
  readonly cache?: boolean;
}

interface CachedProgramEntry {
  readonly program: ts.Program;
  lastAccessToken: number;
}

const SOURCE_FILE_PATTERN = /\.(tsx?|mts|cts)$/;

export function parseExcludedRepoRelativePrefixes(
  rawValue: string | undefined,
  target = '',
  repoPath = process.cwd(),
): readonly string[] {
  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .map((value) => normalizeRepoRelativePath(value));
      }
    } catch {
      // Fall back to profile-derived defaults below.
    }
  }

  return resolveAnalysisProfile({ repoPath, target }).excludedRepoRelativePrefixes;
}

export class RepoSession {
  readonly #profile: AnalysisProfile;
  readonly #repoPath: string;
  readonly #target: string;
  readonly #excludedRepoRelativePrefixes: readonly string[];
  readonly #maxCachedPrograms: number;
  readonly #skipDirs = new Set(['node_modules', '.git', 'dist', '__tests__']);
  readonly #submodulePaths = new Set<string>();
  readonly #tsconfigCache = new Map<string, LoadTsconfigResult>();
  readonly #programCache = new Map<string, CachedProgramEntry>();

  #packageDirs: readonly string[] | null = null;
  #repoSourceFiles: readonly string[] | null = null;
  #tsconfigAbsPaths: readonly string[] | null = null;
  #nextProgramAccessToken = 1;

  constructor(options: RepoSessionOptions = {}) {
    this.#profile = resolveAnalysisProfile({
      repoPath: options.repoPath,
      target: options.target,
      profilePath: options.profilePath,
      excludedRepoRelativePrefixes: options.excludedRepoRelativePrefixes,
    });
    this.#repoPath = this.#profile.repoPath;
    this.#target = this.#profile.snapshotTarget;
    this.#excludedRepoRelativePrefixes = this.#profile.excludedRepoRelativePrefixes;
    this.#maxCachedPrograms = Number.isFinite(options.maxCachedPrograms)
      ? Math.max(0, Math.trunc(options.maxCachedPrograms!))
      : 8;

    this.#loadSubmodules();
  }

  get repoPath(): string {
    return this.#repoPath;
  }

  get target(): string {
    return this.#target;
  }

  get excludedRepoRelativePrefixes(): readonly string[] {
    return this.#excludedRepoRelativePrefixes;
  }

  get profile(): AnalysisProfile {
    return this.#profile;
  }

  toForwardSlash(value: string): string {
    return value.replace(/\\/g, '/');
  }

  toRepoRelative(absPath: string): string {
    return this.toForwardSlash(relative(this.#repoPath, absPath));
  }

  isInSubmodule(relPath: string): boolean {
    const normalized = normalizeRepoRelativePath(relPath);
    for (const submodulePath of this.#submodulePaths) {
      if (normalized === submodulePath || normalized.startsWith(`${submodulePath}/`)) {
        return true;
      }
    }
    return false;
  }

  isExcludedRepoRelativePath(relPath: string): boolean {
    const normalized = normalizeRepoRelativePath(relPath);
    return this.#excludedRepoRelativePrefixes.some((prefix) =>
      normalized === prefix || normalized.startsWith(`${prefix}/`)
    );
  }

  findTsconfigs(): readonly string[] {
    if (this.#tsconfigAbsPaths) {
      return this.#tsconfigAbsPaths;
    }

    const results = this.#walkRepo(
      this.#repoPath,
      (entryAbs) => entryAbs.endsWith('tsconfig.json') || entryAbs.endsWith('tsconfig.test.json'),
    );
    this.#tsconfigAbsPaths = results.sort();
    return this.#tsconfigAbsPaths;
  }

  tryLoadTsconfig(tsconfigAbsPath: string): LoadTsconfigResult {
    const resolvedTsconfigPath = resolve(tsconfigAbsPath);
    const cached = this.#tsconfigCache.get(resolvedTsconfigPath);
    if (cached) {
      return cached;
    }

    const configFile = ts.readConfigFile(resolvedTsconfigPath, ts.sys.readFile);
    if (configFile.error) {
      const error = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n');
      const result = { snapshot: null, error };
      this.#tsconfigCache.set(resolvedTsconfigPath, result);
      return result;
    }

    const configDir = dirname(resolvedTsconfigPath);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDir);
    const result = {
      snapshot: {
        absPath: resolvedTsconfigPath,
        relPath: this.toRepoRelative(resolvedTsconfigPath),
        configDir,
        parsed,
      },
      error: null,
    };
    this.#tsconfigCache.set(resolvedTsconfigPath, result);
    return result;
  }

  getProgram(
    tsconfigAbsPath: string,
    profile: TsProgramProfile = 'analysis',
    programOptions: ProgramCacheOptions = {},
  ): ts.Program | null {
    const resolvedTsconfigPath = resolve(tsconfigAbsPath);
    const cacheKey = `${profile}\0${resolvedTsconfigPath}`;
    if (programOptions.cache) {
      const cached = this.#programCache.get(cacheKey);
      if (cached) {
        cached.lastAccessToken = this.#nextProgramAccessToken++;
        return cached.program;
      }
    }

    const loaded = this.tryLoadTsconfig(resolvedTsconfigPath);
    if (!loaded.snapshot) {
      return null;
    }

    const compilerOptions = this.#compilerOptionsForProfile(loaded.snapshot.parsed.options, profile);
    const program = ts.createProgram(loaded.snapshot.parsed.fileNames, compilerOptions);
    if (programOptions.cache && this.#maxCachedPrograms > 0) {
      this.#programCache.set(cacheKey, {
        program,
        lastAccessToken: this.#nextProgramAccessToken++,
      });
      this.#trimProgramCache();
    }
    return program;
  }

  clearProgramCache(profile?: TsProgramProfile): void {
    if (!profile) {
      this.#programCache.clear();
      return;
    }

    const prefix = `${profile}\0`;
    for (const key of this.#programCache.keys()) {
      if (key.startsWith(prefix)) {
        this.#programCache.delete(key);
      }
    }
  }

  #trimProgramCache(): void {
    while (this.#programCache.size > this.#maxCachedPrograms) {
      let oldestKey: string | null = null;
      let oldestAccessToken = Number.POSITIVE_INFINITY;

      for (const [key, entry] of this.#programCache.entries()) {
        if (entry.lastAccessToken < oldestAccessToken) {
          oldestAccessToken = entry.lastAccessToken;
          oldestKey = key;
        }
      }

      if (!oldestKey) {
        return;
      }

      this.#programCache.delete(oldestKey);
    }
  }

  listRepoSourceFiles(): readonly string[] {
    if (this.#repoSourceFiles) {
      return this.#repoSourceFiles;
    }

    const results = this.#walkRepo(
      this.#repoPath,
      (_entryAbs, entryRel) => SOURCE_FILE_PATTERN.test(entryRel) && !entryRel.endsWith('.d.ts'),
    );
    this.#repoSourceFiles = results
      .map((entryAbs) => this.toRepoRelative(entryAbs))
      .sort();
    return this.#repoSourceFiles;
  }

  listPackageDirs(): readonly string[] {
    if (this.#packageDirs) {
      return this.#packageDirs;
    }

    const results = new Set<string>();

    for (const discoveryRoot of this.#profile.packageDiscoveryRoots) {
      const rootAbs = join(this.#repoPath, discoveryRoot.root);
      if (!existsSync(rootAbs)) {
        continue;
      }

      for (const entry of readdirSync(rootAbs, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const packageDir = resolve(rootAbs, entry.name);
        const relDir = this.toRepoRelative(packageDir);
        if (relDir.startsWith('..') || this.isExcludedRepoRelativePath(relDir)) continue;

        const packageJsonPath = join(packageDir, 'package.json');
        if (existsSync(packageJsonPath)) {
          results.add(packageDir);
        }
      }
    }

    if (this.#profile.includeRepoRootPackage && existsSync(join(this.#repoPath, 'package.json'))) {
      results.add(this.#repoPath);
    }

    this.#packageDirs = [...results].sort();
    return this.#packageDirs;
  }

  resolveNearestTsconfig(startPath: string): string | null {
    let currentDir = resolve(this.#repoPath, startPath);
    if (!existsSync(currentDir) || !ts.sys.directoryExists(currentDir)) {
      currentDir = dirname(currentDir);
    }

    const repoRoot = this.#repoPath;
    const repoRootNormalized = this.toForwardSlash(repoRoot).toLowerCase();

    while (true) {
      const tsconfigPath = join(currentDir, 'tsconfig.json');
      if (existsSync(tsconfigPath)) return tsconfigPath;

      const testTsconfigPath = join(currentDir, 'tsconfig.test.json');
      if (existsSync(testTsconfigPath)) return testTsconfigPath;

      if (this.toForwardSlash(currentDir).toLowerCase() === repoRootNormalized) {
        return null;
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        return null;
      }
      currentDir = parentDir;
    }
  }

  #compilerOptionsForProfile(
    options: ts.CompilerOptions,
    profile: TsProgramProfile,
  ): ts.CompilerOptions {
    if (profile === 'analysis-no-resolve') {
      return {
        ...options,
        noEmit: true,
        noResolve: true,
      };
    }

    return {
      ...options,
      noEmit: true,
    };
  }

  #loadSubmodules(): void {
    try {
      const raw = execSync('git submodule status', {
        cwd: this.#repoPath,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of raw.split('\n')) {
        const match = line.match(/^\s*[+-]?\w+\s+(\S+)/);
        if (!match?.[1]) continue;
        const submodulePath = normalizeRepoRelativePath(match[1]);
        this.#submodulePaths.add(submodulePath);
        this.#skipDirs.add(submodulePath);
      }
    } catch {
      // Repos without submodules are fine.
    }
  }

  #walkRepo(
    dir: string,
    shouldInclude: (entryAbs: string, entryRel: string) => boolean,
  ): string[] {
    const results: string[] = [];
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: 'utf8' });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const entryAbs = join(dir, entry.name);
      const entryRel = this.toRepoRelative(entryAbs);
      if (!entryRel.startsWith('..')) {
        if (this.isExcludedRepoRelativePath(entryRel) || this.isInSubmodule(entryRel)) {
          continue;
        }
      }

      if (entry.isDirectory()) {
        if (!this.#skipDirs.has(entry.name)) {
          results.push(...this.#walkRepo(entryAbs, shouldInclude));
        }
        continue;
      }

      if (shouldInclude(entryAbs, entryRel)) {
        results.push(this.toForwardSlash(entryAbs));
      }
    }

    return results;
  }
}

export function createRepoSession(
  options: RepoSessionOptions = {},
): RepoSession {
  return new RepoSession(options);
}
