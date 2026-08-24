import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
import type { AuthoredSourceBoundary } from '../boot/source-boundary.js';
import {
  type BootPackageManifest,
  isHostPathWithin,
} from '../boot/host-files.js';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import {
  ProjectModuleResolutionKind,
  ProjectModuleResolver,
} from '../project-analysis/project-module-resolution.js';
import {
  EvaluationModuleGraph,
  normalizeModuleKey,
  readEvaluationModuleRecord,
} from './module-graph.js';
import { isRelativeModuleSpecifier } from './module-specifier.js';
import { guessScriptKind } from './ts-syntax.js';
import { assetModuleText } from './asset-module.js';
import {
  compilerOptionsPathsCanResolve,
  EvaluationModuleSourceResolutionKind,
  EvaluationPackageSourceResolver,
  evaluationModuleHostPathKey as hostFileCacheKey,
  type ResolvedEvaluationModuleOrigin,
} from './package-source-resolution.js';

export {
  ResolvedEvaluationModuleOrigin,
  ResolvedEvaluationModuleSourceScope,
  ResolvedPackageInstance,
  ResolvedPackageOwner,
} from './package-source-resolution.js';

export interface EvaluationModuleSourceFileProfile {
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly missingFiles: number;
  readonly readMilliseconds: number;
  readonly parseMilliseconds: number;
  readonly sourceBytes: number;
}

export interface EvaluationModuleResolutionProfile {
  readonly calls: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly milliseconds: number;
  readonly postTypeScriptRelativePathProbeEnabled: number;
  readonly relativeCalls: number;
  readonly bareCalls: number;
  readonly querySuffixCalls: number;
  readonly assetSpecifierCalls: number;
  readonly extensionlessRelativeCalls: number;
  readonly emittedJavaScriptRelativeCalls: number;
  readonly frameworkExternalBoundaries: number;
  readonly packageExternalBoundaries: number;
  readonly typeScriptCalls: number;
  readonly typeScriptMilliseconds: number;
  readonly resolvedByTypeScript: number;
  readonly resolvedByLinkedSource: number;
  readonly linkedSourceOpenings: number;
  readonly resolvedByPathProbe: number;
  readonly resolvedByPathProbeBeforeTypeScript: number;
  readonly resolvedByPathProbeAfterTypeScript: number;
  readonly unresolved: number;
  readonly pathProbeCalls: number;
  readonly pathProbeMilliseconds: number;
  readonly pathProbeBeforeTypeScript: number;
  readonly pathProbeBeforeTypeScriptMilliseconds: number;
  readonly pathProbeAfterTypeScript: number;
  readonly pathProbeAfterTypeScriptMilliseconds: number;
  readonly unresolvedRelative: number;
  readonly unresolvedBare: number;
  readonly declarationSourceHits: number;
  readonly declarationSourceMisses: number;
  readonly packagePolicyHits: number;
  readonly packagePolicyMisses: number;
  readonly packageManifestHits: number;
  readonly packageManifestMisses: number;
}

export interface EvaluationModuleHostFileSystemProfile {
  readonly fileExistsCalls: number;
  readonly fileExistsHits: number;
  readonly fileExistsMisses: number;
  readonly directoryExistsCalls: number;
  readonly directoryExistsHits: number;
  readonly directoryExistsMisses: number;
  readonly readFileCalls: number;
  readonly readFileHits: number;
  readonly readFileMisses: number;
  readonly realpathCalls: number;
  readonly realpathHits: number;
  readonly realpathMisses: number;
  readonly getDirectoriesCalls: number;
  readonly getDirectoriesHits: number;
  readonly getDirectoriesMisses: number;
}

export interface EvaluationModuleSourceHostProfile {
  readonly sourceFiles: EvaluationModuleSourceFileProfile;
  readonly moduleResolutions: EvaluationModuleResolutionProfile;
  readonly fileSystem: EvaluationModuleHostFileSystemProfile;
}

export interface EvaluationModuleResolutionPolicy {
  /**
   * Retry local relative path probing after TypeScript fails to resolve a relative specifier.
   *
   * This is a completeness trade-off for extensionless or bundler-shaped authored source/asset imports. It can add
   * filesystem probes on large apps, so keep it explicit and profile-gated rather than hiding it as a helper fallback.
   */
  readonly postTypeScriptRelativePathProbe: boolean;
  /**
   * Let bare package imports reach TypeScript resolution when the package manifest points at authored source.
   *
   * This is a completeness trade-off for source-shipped helper packages used by app code. Keep it policy-owned so
   * generic static evaluation can remain conservative while product-facing app analysis can spend on real sources.
   */
  readonly admitSourceShippedPackageEntrypoints: boolean;
}

export const DefaultEvaluationModuleResolutionPolicy: EvaluationModuleResolutionPolicy = {
  postTypeScriptRelativePathProbe: true,
  admitSourceShippedPackageEntrypoints: false,
};

/** Source host boundary for recursive module graph construction. */
export interface EvaluationModuleSourceHost {
  /** Compiler options that determine usage-specific package conditions, when the host owns them. */
  readonly compilerOptions?: ts.CompilerOptions;
  /** Read and parse one module key into a TypeScript source file. */
  readSourceFile(moduleKey: string): ts.SourceFile | null;
  /** Resolve an authored module specifier from one module key. */
  resolveModuleSpecifier(
    fromModuleKey: string,
    moduleSpecifier: string,
    resolutionMode?: ts.ResolutionMode,
  ): string | null;
}

class CachedEvaluationModuleHostFileSystem {
  private readonly fileExistsResults = new Map<string, boolean>();
  private readonly directoryExistsResults = new Map<string, boolean>();
  private readonly fileTextResults = new Map<string, string | undefined>();
  private readonly realpathResults = new Map<string, string>();
  private readonly directoryListings = new Map<string, readonly string[]>();

  private fileExistsCalls = 0;
  private fileExistsHits = 0;
  private fileExistsMisses = 0;
  private directoryExistsCalls = 0;
  private directoryExistsHits = 0;
  private directoryExistsMisses = 0;
  private readFileCalls = 0;
  private readFileHits = 0;
  private readFileMisses = 0;
  private realpathCalls = 0;
  private realpathHits = 0;
  private realpathMisses = 0;
  private getDirectoriesCalls = 0;
  private getDirectoriesHits = 0;
  private getDirectoriesMisses = 0;

  constructor(
    private readonly inputHost: SemanticRuntimeProjectInputHost,
  ) {}

  fileExists(fileName: string): boolean {
    this.fileExistsCalls += 1;
    const key = hostFileCacheKey(fileName);
    const cached = this.fileExistsResults.get(key);
    if (cached !== undefined) {
      this.fileExistsHits += 1;
      return cached;
    }
    this.fileExistsMisses += 1;
    const exists = this.inputHost.fileExists(fileName);
    this.fileExistsResults.set(key, exists);
    return exists;
  }

  directoryExists(directoryName: string): boolean {
    this.directoryExistsCalls += 1;
    const key = hostFileCacheKey(directoryName);
    const cached = this.directoryExistsResults.get(key);
    if (cached !== undefined) {
      this.directoryExistsHits += 1;
      return cached;
    }
    this.directoryExistsMisses += 1;
    const exists = this.inputHost.directoryExists(directoryName);
    this.directoryExistsResults.set(key, exists);
    return exists;
  }

  readFile(fileName: string): string | undefined {
    this.readFileCalls += 1;
    const key = hostFileCacheKey(fileName);
    if (this.fileTextResults.has(key)) {
      this.readFileHits += 1;
      return this.fileTextResults.get(key);
    }
    this.readFileMisses += 1;
    const text = this.inputHost.readFile(fileName);
    this.fileTextResults.set(key, text);
    return text;
  }

  realpath(fileName: string): string {
    this.realpathCalls += 1;
    const key = hostFileCacheKey(fileName);
    const cached = this.realpathResults.get(key);
    if (cached !== undefined) {
      this.realpathHits += 1;
      return cached;
    }
    this.realpathMisses += 1;
    const real = this.inputHost.realpath(fileName);
    this.realpathResults.set(key, real);
    return real;
  }

  getDirectories(directoryName: string): readonly string[] {
    this.getDirectoriesCalls += 1;
    const key = hostFileCacheKey(directoryName);
    const cached = this.directoryListings.get(key);
    if (cached !== undefined) {
      this.getDirectoriesHits += 1;
      return cached;
    }
    this.getDirectoriesMisses += 1;
    const directories = this.inputHost.readDirectory(directoryName)
      .map((entry) => path.join(directoryName, entry))
      .filter((entry) => this.inputHost.directoryExists(entry));
    this.directoryListings.set(key, directories);
    return directories;
  }

  readPackageManifest(packageRoot: string): BootPackageManifest | null {
    const manifestPath = path.join(packageRoot, 'package.json');
    if (!this.fileExists(manifestPath)) {
      return null;
    }
    try {
      const text = this.readFile(manifestPath);
      return text == null ? null : JSON.parse(text) as BootPackageManifest;
    } catch {
      return null;
    }
  }

  snapshot(): EvaluationModuleHostFileSystemProfile {
    return {
      fileExistsCalls: this.fileExistsCalls,
      fileExistsHits: this.fileExistsHits,
      fileExistsMisses: this.fileExistsMisses,
      directoryExistsCalls: this.directoryExistsCalls,
      directoryExistsHits: this.directoryExistsHits,
      directoryExistsMisses: this.directoryExistsMisses,
      readFileCalls: this.readFileCalls,
      readFileHits: this.readFileHits,
      readFileMisses: this.readFileMisses,
      realpathCalls: this.realpathCalls,
      realpathHits: this.realpathHits,
      realpathMisses: this.realpathMisses,
      getDirectoriesCalls: this.getDirectoriesCalls,
      getDirectoriesHits: this.getDirectoriesHits,
      getDirectoriesMisses: this.getDirectoriesMisses,
    };
  }
}

/** File-system implementation for local source modules. */
export class FileSystemEvaluationModuleSourceHost implements EvaluationModuleSourceHost {
  private readonly sourceFileCache = new Map<string, ts.SourceFile | null>();
  private readonly fileSystem: CachedEvaluationModuleHostFileSystem;
  private readonly projectModules: ProjectModuleResolver;
  private readonly resolvedModuleSpecifiers = new Map<string, string | null>();
  private readonly packageSources: EvaluationPackageSourceResolver;

  private sourceFileCacheHits = 0;
  private sourceFileCacheMisses = 0;
  private missingSourceFiles = 0;
  private sourceFileReadMilliseconds = 0;
  private sourceFileParseMilliseconds = 0;
  private sourceBytes = 0;
  private moduleResolutionCalls = 0;
  private moduleResolutionCacheHits = 0;
  private moduleResolutionCacheMisses = 0;
  private moduleResolutionMilliseconds = 0;
  private relativeModuleResolutionCalls = 0;
  private bareModuleResolutionCalls = 0;
  private querySuffixModuleResolutionCalls = 0;
  private assetModuleResolutionCalls = 0;
  private extensionlessRelativeModuleResolutionCalls = 0;
  private emittedJavaScriptRelativeModuleResolutionCalls = 0;
  private frameworkExternalBoundaries = 0;
  private packageExternalBoundaries = 0;
  private typeScriptModuleResolutionCalls = 0;
  private typeScriptModuleResolutionMilliseconds = 0;
  private resolvedByTypeScript = 0;
  private resolvedByLinkedSource = 0;
  private linkedSourceOpenings = 0;
  private resolvedByPathProbe = 0;
  private resolvedByPathProbeBeforeTypeScript = 0;
  private resolvedByPathProbeAfterTypeScript = 0;
  private unresolvedModules = 0;
  private pathProbeCalls = 0;
  private pathProbeMilliseconds = 0;
  private pathProbeBeforeTypeScript = 0;
  private pathProbeBeforeTypeScriptMilliseconds = 0;
  private pathProbeAfterTypeScript = 0;
  private pathProbeAfterTypeScriptMilliseconds = 0;
  private unresolvedRelativeModules = 0;
  private unresolvedBareModules = 0;

  constructor(
    /** Root directory for relative module keys. */
    readonly rootDir: string,
    /** Exact project-input host used for every positive and negative module probe. */
    inputHost: SemanticRuntimeProjectInputHost,
    /** Compiler options used to resolve authored module specifiers. */
    readonly compilerOptions: ts.CompilerOptions,
    /** Completeness/performance policy for non-TypeScript module-resolution fallbacks. */
    readonly moduleResolutionPolicy: EvaluationModuleResolutionPolicy = DefaultEvaluationModuleResolutionPolicy,
    /** Shared source-world membership authority; exact boot ownership/editability remains separate. */
    readonly authoredSources: AuthoredSourceBoundary | null = null,
  ) {
    this.fileSystem = new CachedEvaluationModuleHostFileSystem(inputHost);
    this.projectModules = new ProjectModuleResolver(
      this.rootDir,
      this.compilerOptions,
      inputHost,
    );
    this.packageSources = new EvaluationPackageSourceResolver(
      this.rootDir,
      this.fileSystem,
      this.compilerOptions.preserveSymlinks === true,
      this.moduleResolutionPolicy.admitSourceShippedPackageEntrypoints,
      this.authoredSources,
    );
  }

  readSourceFile(moduleKey: string): ts.SourceFile | null {
    const absolute = this.toAbsolutePath(moduleKey);
    const normalized = normalizeModuleKey(absolute);
    const cached = this.sourceFileCache.get(normalized);
    if (cached !== undefined) {
      this.sourceFileCacheHits += 1;
      return cached;
    }
    this.sourceFileCacheMisses += 1;
    const readStarted = performance.now();
    const text = this.fileSystem.readFile(absolute);
    this.sourceFileReadMilliseconds += performance.now() - readStarted;
    if (text == null) {
      this.missingSourceFiles += 1;
      this.sourceFileCache.set(normalized, null);
      return null;
    }
    this.sourceBytes += text.length;
    const assetText = assetModuleText(absolute, text);
    const moduleText = assetText ?? text;
    const parseStarted = performance.now();
    const sourceFile = ts.createSourceFile(
      absolute,
      moduleText,
      {
        languageVersion: ts.ScriptTarget.Latest,
        impliedNodeFormat: this.projectModules.getImpliedNodeFormatForFile(absolute),
      },
      true,
      assetText == null ? guessScriptKind(absolute) : ts.ScriptKind.TS,
    );
    this.sourceFileParseMilliseconds += performance.now() - parseStarted;
    this.sourceFileCache.set(normalized, sourceFile);
    return sourceFile;
  }

  resolveModuleSpecifier(
    fromModuleKey: string,
    moduleSpecifier: string,
    resolutionMode?: ts.ResolutionMode,
  ): string | null {
    this.moduleResolutionCalls += 1;
    const started = performance.now();
    const cacheKey = moduleResolutionCacheKey(fromModuleKey, moduleSpecifier, resolutionMode);
    if (this.resolvedModuleSpecifiers.has(cacheKey)) {
      this.moduleResolutionCacheHits += 1;
      this.moduleResolutionMilliseconds += performance.now() - started;
      return this.resolvedModuleSpecifiers.get(cacheKey) ?? null;
    }
    this.moduleResolutionCacheMisses += 1;
    const resolved = this.resolveModuleSpecifierCore(fromModuleKey, moduleSpecifier, resolutionMode);
    this.resolvedModuleSpecifiers.set(cacheKey, resolved);
    this.moduleResolutionMilliseconds += performance.now() - started;
    return resolved;
  }

  /** Read resolver-owned package provenance for one reached logical or physical module without new host reads. */
  readPackageOrigin(moduleKey: string): ResolvedEvaluationModuleOrigin | null {
    return this.packageSources.originForModulePath(moduleKey);
  }

  snapshotProfile(): EvaluationModuleSourceHostProfile {
    const packageSources = this.packageSources.snapshotProfile();
    return {
      sourceFiles: {
        cacheHits: this.sourceFileCacheHits,
        cacheMisses: this.sourceFileCacheMisses,
        missingFiles: this.missingSourceFiles,
        readMilliseconds: this.sourceFileReadMilliseconds,
        parseMilliseconds: this.sourceFileParseMilliseconds,
        sourceBytes: this.sourceBytes,
      },
      moduleResolutions: {
        calls: this.moduleResolutionCalls,
        cacheHits: this.moduleResolutionCacheHits,
        cacheMisses: this.moduleResolutionCacheMisses,
        milliseconds: this.moduleResolutionMilliseconds,
        postTypeScriptRelativePathProbeEnabled: this.moduleResolutionPolicy.postTypeScriptRelativePathProbe ? 1 : 0,
        relativeCalls: this.relativeModuleResolutionCalls,
        bareCalls: this.bareModuleResolutionCalls,
        querySuffixCalls: this.querySuffixModuleResolutionCalls,
        assetSpecifierCalls: this.assetModuleResolutionCalls,
        extensionlessRelativeCalls: this.extensionlessRelativeModuleResolutionCalls,
        emittedJavaScriptRelativeCalls: this.emittedJavaScriptRelativeModuleResolutionCalls,
        frameworkExternalBoundaries: this.frameworkExternalBoundaries,
        packageExternalBoundaries: this.packageExternalBoundaries,
        typeScriptCalls: this.typeScriptModuleResolutionCalls,
        typeScriptMilliseconds: this.typeScriptModuleResolutionMilliseconds,
        resolvedByTypeScript: this.resolvedByTypeScript,
        resolvedByLinkedSource: this.resolvedByLinkedSource,
        linkedSourceOpenings: this.linkedSourceOpenings,
        resolvedByPathProbe: this.resolvedByPathProbe,
        resolvedByPathProbeBeforeTypeScript: this.resolvedByPathProbeBeforeTypeScript,
        resolvedByPathProbeAfterTypeScript: this.resolvedByPathProbeAfterTypeScript,
        unresolved: this.unresolvedModules,
        pathProbeCalls: this.pathProbeCalls,
        pathProbeMilliseconds: this.pathProbeMilliseconds,
        pathProbeBeforeTypeScript: this.pathProbeBeforeTypeScript,
        pathProbeBeforeTypeScriptMilliseconds: this.pathProbeBeforeTypeScriptMilliseconds,
        pathProbeAfterTypeScript: this.pathProbeAfterTypeScript,
        pathProbeAfterTypeScriptMilliseconds: this.pathProbeAfterTypeScriptMilliseconds,
        unresolvedRelative: this.unresolvedRelativeModules,
        unresolvedBare: this.unresolvedBareModules,
        declarationSourceHits: packageSources.declarationSourceHits,
        declarationSourceMisses: packageSources.declarationSourceMisses,
        packagePolicyHits: packageSources.packagePolicyHits,
        packagePolicyMisses: packageSources.packagePolicyMisses,
        packageManifestHits: packageSources.packageManifestHits,
        packageManifestMisses: packageSources.packageManifestMisses,
      },
      fileSystem: this.fileSystem.snapshot(),
    };
  }

  private resolveModuleSpecifierCore(
    fromModuleKey: string,
    moduleSpecifier: string,
    resolutionMode: ts.ResolutionMode,
  ): string | null {
    const fromAbsolute = this.toAbsolutePath(fromModuleKey);
    const modulePathSpecifier = moduleSpecifierWithoutQuery(moduleSpecifier);
    const relativeSpecifier = isRelativeModuleSpecifier(modulePathSpecifier);
    this.recordModuleResolutionShape(moduleSpecifier, modulePathSpecifier, relativeSpecifier);
    if (relativeSpecifier) {
      this.relativeModuleResolutionCalls += 1;
    } else {
      this.bareModuleResolutionCalls += 1;
      if (isAureliaFrameworkModuleSpecifier(modulePathSpecifier)) {
        this.frameworkExternalBoundaries += 1;
        this.recordUnresolvedModule(false);
        return null;
      }
    }
    let probedRelativePath = false;
    if (relativeSpecifier && shouldResolveByPathProbeBeforeTypeScript(moduleSpecifier)) {
      probedRelativePath = true;
      this.pathProbeBeforeTypeScript += 1;
      const pathProbeResult = this.measureSourceModulePathProbe('before-typescript', () =>
        this.packageSources.probeRelativeModule(fromAbsolute, modulePathSpecifier)
      );
      if (pathProbeResult != null) {
        this.resolvedByPathProbe += 1;
        this.resolvedByPathProbeBeforeTypeScript += 1;
        return this.moduleKeyForAbsolutePath(pathProbeResult);
      }
    }

    this.typeScriptModuleResolutionCalls += 1;
    const typeScriptStarted = performance.now();
    const projectResolution = this.projectModules.resolveModuleName(
      modulePathSpecifier,
      fromAbsolute,
      undefined,
      resolutionMode,
    );
    const resolved = projectResolution.resolvedModule;
    this.typeScriptModuleResolutionMilliseconds += performance.now() - typeScriptStarted;
    if (projectResolution.kind === ProjectModuleResolutionKind.LinkedSource) {
      this.resolvedByLinkedSource += 1;
    } else if (projectResolution.opening != null) {
      this.linkedSourceOpenings += 1;
    }
    const sourceResolution = this.packageSources.resolveTypeScriptModule(
      resolved,
      fromAbsolute,
      modulePathSpecifier,
      resolved != null
        && !resolved.isExternalLibraryImport
        && compilerOptionsPathsCanResolve(this.compilerOptions, modulePathSpecifier),
      resolutionMode,
      resolved == null
        ? null
        : (packageRoots) => this.projectModules.resolvePackageRuntimeModuleName(
            modulePathSpecifier,
            fromAbsolute,
            packageRoots,
            resolutionMode,
          ),
    );
    if (sourceResolution.sourcePath != null) {
      this.resolvedByTypeScript += 1;
      return this.moduleKeyForAbsolutePath(sourceResolution.sourcePath);
    }
    if (sourceResolution.kind === EvaluationModuleSourceResolutionKind.PackageBoundary) {
      this.packageExternalBoundaries += 1;
      this.recordUnresolvedModule(relativeSpecifier);
      return null;
    }
    if (relativeSpecifier) {
      if (!probedRelativePath && this.moduleResolutionPolicy.postTypeScriptRelativePathProbe) {
        this.pathProbeAfterTypeScript += 1;
        const pathProbeResult = this.measureSourceModulePathProbe('after-typescript', () =>
          this.packageSources.probeRelativeModule(fromAbsolute, modulePathSpecifier)
        );
        if (pathProbeResult != null) {
          this.resolvedByPathProbe += 1;
          this.resolvedByPathProbeAfterTypeScript += 1;
          return this.moduleKeyForAbsolutePath(pathProbeResult);
        }
      }
      this.recordUnresolvedModule(true);
      return null;
    }
    this.recordUnresolvedModule(false);
    return null;
  }

  private recordUnresolvedModule(relativeSpecifier: boolean): void {
    if (relativeSpecifier) {
      this.unresolvedRelativeModules += 1;
    } else {
      this.unresolvedBareModules += 1;
    }
    this.unresolvedModules += 1;
  }

  private recordModuleResolutionShape(
    authoredSpecifier: string,
    pathSpecifier: string,
    relativeSpecifier: boolean,
  ): void {
    if (moduleSpecifierSuffixIndex(authoredSpecifier) !== -1) {
      this.querySuffixModuleResolutionCalls += 1;
    }
    if (isAssetModulePath(pathSpecifier)) {
      this.assetModuleResolutionCalls += 1;
    }
    if (!relativeSpecifier) {
      return;
    }
    const extension = path.extname(pathSpecifier).toLowerCase();
    if (extension.length === 0) {
      this.extensionlessRelativeModuleResolutionCalls += 1;
      return;
    }
    if (isEmittedJavaScriptModuleExtension(extension)) {
      this.emittedJavaScriptRelativeModuleResolutionCalls += 1;
    }
  }

  private measureSourceModulePathProbe(
    phase: 'before-typescript' | 'after-typescript',
    read: () => string | null,
  ): string | null {
    this.pathProbeCalls += 1;
    const started = performance.now();
    try {
      return read();
    } finally {
      const elapsed = performance.now() - started;
      this.pathProbeMilliseconds += elapsed;
      if (phase === 'before-typescript') {
        this.pathProbeBeforeTypeScriptMilliseconds += elapsed;
      } else {
        this.pathProbeAfterTypeScriptMilliseconds += elapsed;
      }
    }
  }

  private toAbsolutePath(moduleKey: string): string {
    return path.isAbsolute(moduleKey)
      ? moduleKey
      : path.join(this.rootDir, moduleKey);
  }

  private moduleKeyForAbsolutePath(absolutePath: string): string {
    const absolute = path.resolve(absolutePath);
    return isHostPathWithin(absolute, this.rootDir)
      ? normalizeModuleKey(path.relative(this.rootDir, absolute))
      : normalizeModuleKey(absolute);
  }
}

/** One module edge that could not be resolved while building an evaluation graph. */
export class EvaluationModuleResolutionOpen {
  constructor(
    /** Module key that authored the unresolved edge. */
    readonly fromModuleKey: string,
    /** Module specifier text as authored. */
    readonly moduleSpecifier: string,
    /** TypeScript package-condition mode selected by the exact unresolved usage. */
    readonly resolutionMode: ts.ResolutionMode,
    /** Source node that carried the module specifier. */
    readonly node: ts.Node,
  ) {}
}

/** Result of recursively building an evaluation module graph. */
export class EvaluationModuleGraphBuildResult {
  constructor(
    /** Directed module graph over all reached local source files. */
    readonly graph: EvaluationModuleGraph,
    /** Module-resolution openings observed while walking imports and re-exports. */
    readonly unresolvedModules: readonly EvaluationModuleResolutionOpen[],
  ) {}
}

/** Build a local source module graph from one entry module using the supplied host. */
export function buildEvaluationModuleGraph(
  entryModuleKey: string,
  host: EvaluationModuleSourceHost,
): EvaluationModuleGraphBuildResult {
  return buildEvaluationModuleGraphForEntries([entryModuleKey], host);
}

/** Build one local source module graph for every supplied entry using a shared module identity domain. */
export function buildEvaluationModuleGraphForEntries(
  entryModuleKeys: readonly string[],
  host: EvaluationModuleSourceHost,
): EvaluationModuleGraphBuildResult {
  const graph = new EvaluationModuleGraph();
  const unresolvedModules: EvaluationModuleResolutionOpen[] = [];
  const visited = new Set<string>();

  function visit(moduleKey: string): void {
    const normalizedModuleKey = normalizeModuleKey(moduleKey);
    if (visited.has(normalizedModuleKey)) {
      return;
    }
    visited.add(normalizedModuleKey);
    const sourceFile = host.readSourceFile(normalizedModuleKey);
    if (sourceFile == null) {
      return;
    }

    const record = readEvaluationModuleRecord(sourceFile, normalizedModuleKey, host.compilerOptions);
    graph.addModule(record);
    const moduleSpecifiers = uniqueModuleEdges([
      ...record.imports.map((entry) => ({
        moduleSpecifier: entry.moduleSpecifier,
        resolutionMode: entry.resolutionMode,
        node: entry.node,
      })),
      ...record.exports
        .filter((entry) => entry.moduleSpecifier != null)
        .map((entry) => ({
          moduleSpecifier: entry.moduleSpecifier as string,
          resolutionMode: entry.resolutionMode,
          node: entry.node,
        })),
    ]);

    for (const edge of moduleSpecifiers) {
      const target = host.resolveModuleSpecifier(
        normalizedModuleKey,
        edge.moduleSpecifier,
        edge.resolutionMode,
      );
      graph.linkModule(normalizedModuleKey, edge.moduleSpecifier, edge.resolutionMode, target);
      if (target == null) {
        if (isRelativeModuleSpecifier(edge.moduleSpecifier)) {
          unresolvedModules.push(new EvaluationModuleResolutionOpen(
            normalizedModuleKey,
            edge.moduleSpecifier,
            edge.resolutionMode,
            edge.node,
          ));
        }
        continue;
      }
      visit(target);
    }
  }

  for (const entryModuleKey of entryModuleKeys) {
    visit(entryModuleKey);
  }
  return new EvaluationModuleGraphBuildResult(graph, unresolvedModules);
}

function uniqueModuleEdges(
  edges: readonly {
    readonly moduleSpecifier: string;
    readonly resolutionMode: ts.ResolutionMode;
    readonly node: ts.Node;
  }[],
): readonly {
  readonly moduleSpecifier: string;
  readonly resolutionMode: ts.ResolutionMode;
  readonly node: ts.Node;
}[] {
  const seen = new Set<string>();
  const unique: {
    readonly moduleSpecifier: string;
    readonly resolutionMode: ts.ResolutionMode;
    readonly node: ts.Node;
  }[] = [];
  for (const edge of edges) {
    const key = JSON.stringify([edge.moduleSpecifier, edge.resolutionMode ?? null]);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(edge);
  }
  return unique;
}

function moduleSpecifierWithoutQuery(moduleSpecifier: string): string {
  const queryIndex = moduleSpecifierSuffixIndex(moduleSpecifier);
  return queryIndex === -1 ? moduleSpecifier : moduleSpecifier.slice(0, queryIndex);
}

function moduleSpecifierSuffixIndex(moduleSpecifier: string): number {
  const start = moduleSpecifier.startsWith('#') ? 1 : 0;
  const relativeIndex = moduleSpecifier.slice(start).search(/[?#]/);
  return relativeIndex === -1 ? -1 : start + relativeIndex;
}

function moduleResolutionCacheKey(
  fromModuleKey: string,
  moduleSpecifier: string,
  resolutionMode: ts.ResolutionMode,
): string {
  return JSON.stringify([normalizeModuleKey(fromModuleKey), moduleSpecifier, resolutionMode ?? null]);
}

/**
 * Static evaluation treats framework packages as modeled external boundaries.
 *
 * The app evaluator should not read app-local `aurelia` / `@aurelia/*` package files to discover framework semantics:
 * configuration, resource, DI, template, router, and observer behavior enter through framework-grounded semantic
 * mirrors and import-aware recognizers. Keeping this as an early boundary trades a little recomputation in those
 * recognizers for less module-resolution filesystem churn and avoids accidentally treating framework package source as
 * app-authored evaluation input.
 */
function isAureliaFrameworkModuleSpecifier(moduleSpecifier: string): boolean {
  return moduleSpecifier === 'aurelia'
    || moduleSpecifier.startsWith('aurelia/')
    || moduleSpecifier.startsWith('@aurelia/');
}

function shouldResolveByPathProbeBeforeTypeScript(moduleSpecifier: string): boolean {
  if (moduleSpecifierSuffixIndex(moduleSpecifier) !== -1) {
    return true;
  }
  return isAssetModulePath(moduleSpecifier);
}

function isAssetModulePath(moduleSpecifier: string): boolean {
  switch (path.extname(moduleSpecifier).toLowerCase()) {
    case '.html':
    case '.css':
    case '.json':
      return true;
    default:
      return false;
  }
}

function isEmittedJavaScriptModuleExtension(extension: string): boolean {
  switch (extension) {
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return true;
    default:
      return false;
  }
}
