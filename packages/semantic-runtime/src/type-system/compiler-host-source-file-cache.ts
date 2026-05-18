import ts from 'typescript';
import type {
  SemanticRuntimeCountRow,
} from '../telemetry/kernel-density.js';
import {
  sortedCountRows,
} from '../telemetry/kernel-density.js';
import {
  canonicalTypeSystemPath,
  isDefaultLibrarySourceFile,
  isTypeSystemPathAtOrUnder,
} from './source-file-path.js';

export interface TypeSystemCompilerHostSourceFileCacheStats {
  readonly hits: number;
  readonly hitSourceTextCharacters: number;
  readonly misses: number;
  readonly writes: number;
  readonly writeSourceTextCharacters: number;
  readonly bypasses: number;
  readonly cacheableNodeModuleReads: number;
  readonly cacheableExternalDeclarationReads: number;
  readonly bypassFreshSourceFileReads: number;
  readonly bypassProjectSourceReads: number;
  readonly bypassExternalSourceReads: number;
  readonly clearOperations: number;
  readonly clearedEntries: number;
  readonly clearedSourceTextCharacters: number;
  readonly clearedNodeModuleEntries: number;
  readonly clearedNodeModuleSourceTextCharacters: number;
  readonly clearedDeclarationEntries: number;
  readonly clearedDeclarationSourceTextCharacters: number;
  readonly clearedDefaultLibraryEntries: number;
  readonly clearedDefaultLibrarySourceTextCharacters: number;
  readonly clearedExternalDeclarationEntries: number;
  readonly clearedExternalDeclarationSourceTextCharacters: number;
}

export interface TypeSystemCompilerHostSourceFileCacheOverview extends TypeSystemCompilerHostSourceFileCacheStats {
  readonly entries: number;
  readonly distinctCanonicalPaths: number;
  readonly duplicateCanonicalPathEntries: number;
  readonly sourceTextCharacters: number;
  readonly nodeModuleEntries: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationEntries: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibraryEntries: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalDeclarationEntries: number;
  readonly externalDeclarationSourceTextCharacters: number;
  readonly parseOptions: readonly SemanticRuntimeCountRow[];
  readonly duplicateParseOptionSets: readonly SemanticRuntimeCountRow[];
  readonly lastClearPolicy: TypeSystemCompilerHostSourceFileCacheClearPolicy | null;
  readonly largestEntries: readonly TypeSystemCompilerHostSourceFileCacheEntrySummary[];
}

export type TypeSystemCompilerHostSourceFileCacheClearPolicy =
  | 'preserve'
  | 'all'
  | 'node-modules'
  | 'default-libraries'
  | 'external-declarations';

export interface TypeSystemCompilerHostSourceFileCacheClearSummary {
  readonly policy: TypeSystemCompilerHostSourceFileCacheClearPolicy;
  readonly entries: number;
  readonly sourceTextCharacters: number;
  readonly nodeModuleEntries: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationEntries: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibraryEntries: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalDeclarationEntries: number;
  readonly externalDeclarationSourceTextCharacters: number;
  readonly remainingEntries: number;
}

export type TypeSystemCompilerHostSourceFileCacheEntryBucket =
  | 'default-libraries'
  | 'node-modules'
  | 'external-declarations';

export interface TypeSystemCompilerHostSourceFileCacheEntrySummary {
  readonly fileName: string;
  readonly canonicalPath: string;
  readonly bucket: TypeSystemCompilerHostSourceFileCacheEntryBucket;
  readonly parseOptionKey: string;
  readonly sourceTextCharacters: number;
  readonly isDeclarationFile: boolean;
}

type TypeSystemCompilerHostSourceFileCacheDensity = Pick<
  TypeSystemCompilerHostSourceFileCacheOverview,
  | 'distinctCanonicalPaths'
  | 'duplicateCanonicalPathEntries'
  | 'sourceTextCharacters'
  | 'nodeModuleEntries'
  | 'nodeModuleSourceTextCharacters'
  | 'declarationEntries'
  | 'declarationSourceTextCharacters'
  | 'defaultLibraryEntries'
  | 'defaultLibrarySourceTextCharacters'
  | 'externalDeclarationEntries'
  | 'externalDeclarationSourceTextCharacters'
  | 'parseOptions'
  | 'duplicateParseOptionSets'
>;

type TypeSystemCompilerHostSourceFileCacheClearDensity = {
  -readonly [TKey in keyof Omit<
    TypeSystemCompilerHostSourceFileCacheClearSummary,
    'policy' | 'remainingEntries'
  >]: Omit<TypeSystemCompilerHostSourceFileCacheClearSummary, 'policy' | 'remainingEntries'>[TKey];
};

class TypeSystemCompilerHostSourceFileCache {
  private readonly sourceFiles = new Map<string, ts.SourceFile>();
  private densitySnapshot: TypeSystemCompilerHostSourceFileCacheDensity | null = null;
  private hits = 0;
  private hitSourceTextCharacters = 0;
  private misses = 0;
  private writes = 0;
  private writeSourceTextCharacters = 0;
  private bypasses = 0;
  private cacheableNodeModuleReads = 0;
  private cacheableExternalDeclarationReads = 0;
  private bypassFreshSourceFileReads = 0;
  private bypassProjectSourceReads = 0;
  private bypassExternalSourceReads = 0;
  private clearOperations = 0;
  private clearedEntries = 0;
  private clearedSourceTextCharacters = 0;
  private clearedNodeModuleEntries = 0;
  private clearedNodeModuleSourceTextCharacters = 0;
  private clearedDeclarationEntries = 0;
  private clearedDeclarationSourceTextCharacters = 0;
  private clearedDefaultLibraryEntries = 0;
  private clearedDefaultLibrarySourceTextCharacters = 0;
  private clearedExternalDeclarationEntries = 0;
  private clearedExternalDeclarationSourceTextCharacters = 0;
  private lastClearPolicy: TypeSystemCompilerHostSourceFileCacheClearPolicy | null = null;

  readOrCreate(
    fileName: string,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    projectRootDir: string,
    shouldCreateNewSourceFile: boolean | undefined,
    create: () => ts.SourceFile | undefined,
  ): ts.SourceFile | undefined {
    const decision = typeSystemHostSourceFileCacheDecision(fileName, projectRootDir, shouldCreateNewSourceFile);
    this.recordDecision(decision);
    if (!typeSystemHostSourceFileCacheDecisionIsCacheable(decision)) {
      this.bypasses += 1;
      return create();
    }

    const key = typeSystemHostSourceFileCacheKey(fileName, languageVersionOrOptions);
    const existing = this.sourceFiles.get(key);
    if (existing !== undefined) {
      this.hits += 1;
      this.hitSourceTextCharacters += existing.text.length;
      return existing;
    }

    this.misses += 1;
    const sourceFile = create();
    if (sourceFile !== undefined) {
      this.sourceFiles.set(key, sourceFile);
      this.densitySnapshot = null;
      this.writes += 1;
      this.writeSourceTextCharacters += sourceFile.text.length;
    }
    return sourceFile;
  }

  snapshot(): TypeSystemCompilerHostSourceFileCacheStats {
    return {
      hits: this.hits,
      hitSourceTextCharacters: this.hitSourceTextCharacters,
      misses: this.misses,
      writes: this.writes,
      writeSourceTextCharacters: this.writeSourceTextCharacters,
      bypasses: this.bypasses,
      cacheableNodeModuleReads: this.cacheableNodeModuleReads,
      cacheableExternalDeclarationReads: this.cacheableExternalDeclarationReads,
      bypassFreshSourceFileReads: this.bypassFreshSourceFileReads,
      bypassProjectSourceReads: this.bypassProjectSourceReads,
      bypassExternalSourceReads: this.bypassExternalSourceReads,
      clearOperations: this.clearOperations,
      clearedEntries: this.clearedEntries,
      clearedSourceTextCharacters: this.clearedSourceTextCharacters,
      clearedNodeModuleEntries: this.clearedNodeModuleEntries,
      clearedNodeModuleSourceTextCharacters: this.clearedNodeModuleSourceTextCharacters,
      clearedDeclarationEntries: this.clearedDeclarationEntries,
      clearedDeclarationSourceTextCharacters: this.clearedDeclarationSourceTextCharacters,
      clearedDefaultLibraryEntries: this.clearedDefaultLibraryEntries,
      clearedDefaultLibrarySourceTextCharacters: this.clearedDefaultLibrarySourceTextCharacters,
      clearedExternalDeclarationEntries: this.clearedExternalDeclarationEntries,
      clearedExternalDeclarationSourceTextCharacters: this.clearedExternalDeclarationSourceTextCharacters,
    };
  }

  overview(
    largestEntryLimit = 0,
  ): TypeSystemCompilerHostSourceFileCacheOverview {
    const density = this.readCacheDensity();
    return {
      entries: this.sourceFiles.size,
      ...density,
      ...this.snapshot(),
      lastClearPolicy: this.lastClearPolicy,
      largestEntries: this.largestEntries(largestEntryLimit),
    };
  }

  clear(
    policy: TypeSystemCompilerHostSourceFileCacheClearPolicy = 'all',
  ): TypeSystemCompilerHostSourceFileCacheClearSummary {
    if (policy === 'preserve') {
      return {
        policy,
        entries: 0,
        sourceTextCharacters: 0,
        nodeModuleEntries: 0,
        nodeModuleSourceTextCharacters: 0,
        declarationEntries: 0,
        declarationSourceTextCharacters: 0,
        defaultLibraryEntries: 0,
        defaultLibrarySourceTextCharacters: 0,
        externalDeclarationEntries: 0,
        externalDeclarationSourceTextCharacters: 0,
        remainingEntries: this.sourceFiles.size,
      };
    }

    const cleared = emptyTypeSystemCompilerHostSourceFileCacheClearDensity();
    for (const [key, sourceFile] of this.sourceFiles) {
      if (!sourceFileCacheEntryMatchesClearPolicy(sourceFile, policy)) {
        continue;
      }
      recordSourceFileCacheEntryDensity(cleared, sourceFile);
      this.sourceFiles.delete(key);
    }
    if (cleared.entries > 0) {
      this.densitySnapshot = null;
    }
    this.clearOperations += 1;
    this.clearedEntries += cleared.entries;
    this.clearedSourceTextCharacters += cleared.sourceTextCharacters;
    this.clearedNodeModuleEntries += cleared.nodeModuleEntries;
    this.clearedNodeModuleSourceTextCharacters += cleared.nodeModuleSourceTextCharacters;
    this.clearedDeclarationEntries += cleared.declarationEntries;
    this.clearedDeclarationSourceTextCharacters += cleared.declarationSourceTextCharacters;
    this.clearedDefaultLibraryEntries += cleared.defaultLibraryEntries;
    this.clearedDefaultLibrarySourceTextCharacters += cleared.defaultLibrarySourceTextCharacters;
    this.clearedExternalDeclarationEntries += cleared.externalDeclarationEntries;
    this.clearedExternalDeclarationSourceTextCharacters += cleared.externalDeclarationSourceTextCharacters;
    this.lastClearPolicy = policy;
    return {
      policy,
      ...cleared,
      remainingEntries: this.sourceFiles.size,
    };
  }

  private readCacheDensity(): TypeSystemCompilerHostSourceFileCacheDensity {
    if (this.densitySnapshot != null) {
      return this.densitySnapshot;
    }
    const density = this.computeCacheDensity();
    this.densitySnapshot = density;
    return density;
  }

  private computeCacheDensity(): TypeSystemCompilerHostSourceFileCacheDensity {
    const canonicalPaths = new Set<string>();
    let sourceTextCharacters = 0;
    let nodeModuleEntries = 0;
    let nodeModuleSourceTextCharacters = 0;
    let declarationEntries = 0;
    let declarationSourceTextCharacters = 0;
    let defaultLibraryEntries = 0;
    let defaultLibrarySourceTextCharacters = 0;
    let externalDeclarationEntries = 0;
    let externalDeclarationSourceTextCharacters = 0;
    const parseOptionCounts = new Map<string, number>();
    const parseOptionsByCanonicalPath = new Map<string, Set<string>>();

    for (const [cacheKey, sourceFile] of this.sourceFiles) {
      const normalizedFileName = canonicalTypeSystemPath(sourceFile.fileName);
      const parseOptionKey = sourceFileCacheEntryParseOptionKey(cacheKey);
      parseOptionCounts.set(parseOptionKey, (parseOptionCounts.get(parseOptionKey) ?? 0) + 1);
      const parseOptions = parseOptionsByCanonicalPath.get(normalizedFileName) ?? new Set<string>();
      parseOptions.add(parseOptionKey);
      parseOptionsByCanonicalPath.set(normalizedFileName, parseOptions);
      canonicalPaths.add(normalizedFileName);
      const isNodeModule = normalizedFileName.includes('/node_modules/');
      const isDeclaration = sourceFile.isDeclarationFile;
      const isDefaultLibrary = isDefaultLibrarySourceFile(normalizedFileName);
      const sourceTextLength = sourceFile.text.length;
      sourceTextCharacters += sourceTextLength;
      if (isNodeModule) {
        nodeModuleEntries += 1;
        nodeModuleSourceTextCharacters += sourceTextLength;
      }
      if (isDeclaration) {
        declarationEntries += 1;
        declarationSourceTextCharacters += sourceTextLength;
      }
      if (isDefaultLibrary) {
        defaultLibraryEntries += 1;
        defaultLibrarySourceTextCharacters += sourceTextLength;
      }
      if (isDeclaration && !isNodeModule && !isDefaultLibrary) {
        externalDeclarationEntries += 1;
        externalDeclarationSourceTextCharacters += sourceTextLength;
      }
    }

    return {
      distinctCanonicalPaths: canonicalPaths.size,
      duplicateCanonicalPathEntries: Math.max(0, this.sourceFiles.size - canonicalPaths.size),
      sourceTextCharacters,
      nodeModuleEntries,
      nodeModuleSourceTextCharacters,
      declarationEntries,
      declarationSourceTextCharacters,
      defaultLibraryEntries,
      defaultLibrarySourceTextCharacters,
      externalDeclarationEntries,
      externalDeclarationSourceTextCharacters,
      parseOptions: sortedCountRows(parseOptionCounts),
      duplicateParseOptionSets: duplicateParseOptionSetRows(parseOptionsByCanonicalPath),
    };
  }

  private largestEntries(
    limit: number,
  ): readonly TypeSystemCompilerHostSourceFileCacheEntrySummary[] {
    if (limit <= 0 || this.sourceFiles.size === 0) {
      return [];
    }
    return [...this.sourceFiles.entries()]
      .map(([cacheKey, sourceFile]) => sourceFileCacheEntrySummary(cacheKey, sourceFile))
      .sort((left, right) =>
        right.sourceTextCharacters - left.sourceTextCharacters
        || left.canonicalPath.localeCompare(right.canonicalPath)
      )
      .slice(0, limit);
  }

  private recordDecision(decision: TypeSystemHostSourceFileCacheDecision): void {
    switch (decision) {
      case TypeSystemHostSourceFileCacheDecision.CacheNodeModule:
        this.cacheableNodeModuleReads += 1;
        break;
      case TypeSystemHostSourceFileCacheDecision.CacheExternalDeclaration:
        this.cacheableExternalDeclarationReads += 1;
        break;
      case TypeSystemHostSourceFileCacheDecision.BypassFreshSourceFile:
        this.bypassFreshSourceFileReads += 1;
        break;
      case TypeSystemHostSourceFileCacheDecision.BypassProjectSource:
        this.bypassProjectSourceReads += 1;
        break;
      case TypeSystemHostSourceFileCacheDecision.BypassExternalSource:
        this.bypassExternalSourceReads += 1;
        break;
    }
  }
}

export const sharedCompilerHostSourceFileCache = new TypeSystemCompilerHostSourceFileCache();

export function readTypeSystemCompilerHostSourceFileCacheOverview(
  largestEntryLimit = 0,
): TypeSystemCompilerHostSourceFileCacheOverview {
  return sharedCompilerHostSourceFileCache.overview(largestEntryLimit);
}

export function clearTypeSystemCompilerHostSourceFileCache(
  policy: TypeSystemCompilerHostSourceFileCacheClearPolicy = 'all',
): TypeSystemCompilerHostSourceFileCacheClearSummary {
  return sharedCompilerHostSourceFileCache.clear(policy);
}

export function diffCompilerHostSourceFileCacheStats(
  after: TypeSystemCompilerHostSourceFileCacheStats,
  before: TypeSystemCompilerHostSourceFileCacheStats,
): TypeSystemCompilerHostSourceFileCacheStats {
  return {
    hits: after.hits - before.hits,
    hitSourceTextCharacters: after.hitSourceTextCharacters - before.hitSourceTextCharacters,
    misses: after.misses - before.misses,
    writes: after.writes - before.writes,
    writeSourceTextCharacters: after.writeSourceTextCharacters - before.writeSourceTextCharacters,
    bypasses: after.bypasses - before.bypasses,
    cacheableNodeModuleReads: after.cacheableNodeModuleReads - before.cacheableNodeModuleReads,
    cacheableExternalDeclarationReads: after.cacheableExternalDeclarationReads - before.cacheableExternalDeclarationReads,
    bypassFreshSourceFileReads: after.bypassFreshSourceFileReads - before.bypassFreshSourceFileReads,
    bypassProjectSourceReads: after.bypassProjectSourceReads - before.bypassProjectSourceReads,
    bypassExternalSourceReads: after.bypassExternalSourceReads - before.bypassExternalSourceReads,
    clearOperations: after.clearOperations - before.clearOperations,
    clearedEntries: after.clearedEntries - before.clearedEntries,
    clearedSourceTextCharacters: after.clearedSourceTextCharacters - before.clearedSourceTextCharacters,
    clearedNodeModuleEntries: after.clearedNodeModuleEntries - before.clearedNodeModuleEntries,
    clearedNodeModuleSourceTextCharacters: after.clearedNodeModuleSourceTextCharacters - before.clearedNodeModuleSourceTextCharacters,
    clearedDeclarationEntries: after.clearedDeclarationEntries - before.clearedDeclarationEntries,
    clearedDeclarationSourceTextCharacters: after.clearedDeclarationSourceTextCharacters - before.clearedDeclarationSourceTextCharacters,
    clearedDefaultLibraryEntries: after.clearedDefaultLibraryEntries - before.clearedDefaultLibraryEntries,
    clearedDefaultLibrarySourceTextCharacters: after.clearedDefaultLibrarySourceTextCharacters - before.clearedDefaultLibrarySourceTextCharacters,
    clearedExternalDeclarationEntries: after.clearedExternalDeclarationEntries - before.clearedExternalDeclarationEntries,
    clearedExternalDeclarationSourceTextCharacters: after.clearedExternalDeclarationSourceTextCharacters - before.clearedExternalDeclarationSourceTextCharacters,
  };
}

function typeSystemHostSourceFileCacheKey(
  fileName: string,
  languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
): string {
  return `${canonicalTypeSystemPath(fileName)}::${typeSystemSourceFileParseOptionKey(languageVersionOrOptions)}`;
}

function typeSystemSourceFileParseOptionKey(
  languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
): string {
  const scriptTarget = typeof languageVersionOrOptions === 'number'
    ? languageVersionOrOptions
    : languageVersionOrOptions.languageVersion;
  if (typeof languageVersionOrOptions === 'number') {
    return `target:${typeScriptEnumName(ts.ScriptTarget, scriptTarget)}`;
  }
  return [
    `target:${typeScriptEnumName(ts.ScriptTarget, scriptTarget)}`,
    `format:${typeScriptEnumName(ts.ModuleKind, languageVersionOrOptions.impliedNodeFormat)}`,
    `jsdoc:${typeScriptEnumName(ts.JSDocParsingMode, languageVersionOrOptions.jsDocParsingMode)}`,
  ].join(';');
}

function typeScriptEnumName(
  enumShape: Record<number, string>,
  value: number | undefined,
): string {
  return value == null ? 'none' : enumShape[value] ?? String(value);
}

const enum TypeSystemHostSourceFileCacheDecision {
  CacheNodeModule = 1,
  CacheExternalDeclaration = 2,
  BypassFreshSourceFile = 3,
  BypassProjectSource = 4,
  BypassExternalSource = 5,
}

function typeSystemHostSourceFileCacheDecision(
  fileName: string,
  projectRootDir: string,
  shouldCreateNewSourceFile: boolean | undefined,
): TypeSystemHostSourceFileCacheDecision {
  if (shouldCreateNewSourceFile === true) {
    return TypeSystemHostSourceFileCacheDecision.BypassFreshSourceFile;
  }
  const normalizedFileName = canonicalTypeSystemPath(fileName);
  if (normalizedFileName.includes('/node_modules/')) {
    return TypeSystemHostSourceFileCacheDecision.CacheNodeModule;
  }
  const normalizedProjectRoot = canonicalTypeSystemPath(projectRootDir);
  if (isTypeSystemPathAtOrUnder(normalizedFileName, normalizedProjectRoot)) {
    return TypeSystemHostSourceFileCacheDecision.BypassProjectSource;
  }
  return normalizedFileName.endsWith('.d.ts')
    ? TypeSystemHostSourceFileCacheDecision.CacheExternalDeclaration
    : TypeSystemHostSourceFileCacheDecision.BypassExternalSource;
}

function typeSystemHostSourceFileCacheDecisionIsCacheable(
  decision: TypeSystemHostSourceFileCacheDecision,
): boolean {
  return decision === TypeSystemHostSourceFileCacheDecision.CacheNodeModule
    || decision === TypeSystemHostSourceFileCacheDecision.CacheExternalDeclaration;
}

function sourceFileCacheEntryMatchesClearPolicy(
  sourceFile: ts.SourceFile,
  policy: TypeSystemCompilerHostSourceFileCacheClearPolicy,
): boolean {
  const normalizedFileName = canonicalTypeSystemPath(sourceFile.fileName);
  const isNodeModule = normalizedFileName.includes('/node_modules/');
  const isDefaultLibrary = isDefaultLibrarySourceFile(normalizedFileName);
  switch (policy) {
    case 'all':
      return true;
    case 'node-modules':
      return isNodeModule;
    case 'default-libraries':
      return isDefaultLibrary;
    case 'external-declarations':
      return sourceFile.isDeclarationFile && !isNodeModule && !isDefaultLibrary;
    case 'preserve':
      return false;
  }
}

function emptyTypeSystemCompilerHostSourceFileCacheClearDensity(): TypeSystemCompilerHostSourceFileCacheClearDensity {
  return {
    entries: 0,
    sourceTextCharacters: 0,
    nodeModuleEntries: 0,
    nodeModuleSourceTextCharacters: 0,
    declarationEntries: 0,
    declarationSourceTextCharacters: 0,
    defaultLibraryEntries: 0,
    defaultLibrarySourceTextCharacters: 0,
    externalDeclarationEntries: 0,
    externalDeclarationSourceTextCharacters: 0,
  };
}

function recordSourceFileCacheEntryDensity(
  target: TypeSystemCompilerHostSourceFileCacheClearDensity,
  sourceFile: ts.SourceFile,
): void {
  const canonicalPath = canonicalTypeSystemPath(sourceFile.fileName);
  const sourceTextLength = sourceFile.text.length;
  const isNodeModule = canonicalPath.includes('/node_modules/');
  const isDeclaration = sourceFile.isDeclarationFile;
  const isDefaultLibrary = isDefaultLibrarySourceFile(canonicalPath);
  target.entries += 1;
  target.sourceTextCharacters += sourceTextLength;
  if (isNodeModule) {
    target.nodeModuleEntries += 1;
    target.nodeModuleSourceTextCharacters += sourceTextLength;
  }
  if (isDeclaration) {
    target.declarationEntries += 1;
    target.declarationSourceTextCharacters += sourceTextLength;
  }
  if (isDefaultLibrary) {
    target.defaultLibraryEntries += 1;
    target.defaultLibrarySourceTextCharacters += sourceTextLength;
  }
  if (isDeclaration && !isNodeModule && !isDefaultLibrary) {
    target.externalDeclarationEntries += 1;
    target.externalDeclarationSourceTextCharacters += sourceTextLength;
  }
}

function sourceFileCacheEntrySummary(
  cacheKey: string,
  sourceFile: ts.SourceFile,
): TypeSystemCompilerHostSourceFileCacheEntrySummary {
  const canonicalPath = canonicalTypeSystemPath(sourceFile.fileName);
  return {
    fileName: sourceFile.fileName,
    canonicalPath,
    bucket: sourceFileCacheEntryBucket(sourceFile, canonicalPath),
    parseOptionKey: sourceFileCacheEntryParseOptionKey(cacheKey),
    sourceTextCharacters: sourceFile.text.length,
    isDeclarationFile: sourceFile.isDeclarationFile,
  };
}

function sourceFileCacheEntryParseOptionKey(cacheKey: string): string {
  const separator = cacheKey.indexOf('::');
  return separator < 0 ? 'unknown' : cacheKey.slice(separator + 2);
}

function duplicateParseOptionSetRows(
  parseOptionsByCanonicalPath: ReadonlyMap<string, ReadonlySet<string>>,
): readonly SemanticRuntimeCountRow[] {
  const counts = new Map<string, number>();
  for (const parseOptions of parseOptionsByCanonicalPath.values()) {
    if (parseOptions.size < 2) {
      continue;
    }
    const key = [...parseOptions].sort((left, right) => left.localeCompare(right)).join(' | ');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return sortedCountRows(counts);
}

function sourceFileCacheEntryBucket(
  sourceFile: ts.SourceFile,
  canonicalPath: string,
): TypeSystemCompilerHostSourceFileCacheEntryBucket {
  if (isDefaultLibrarySourceFile(canonicalPath)) {
    return 'default-libraries';
  }
  if (canonicalPath.includes('/node_modules/')) {
    return 'node-modules';
  }
  return 'external-declarations';
}
