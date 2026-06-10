import {
  existsSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
import { isHostPathWithin, readPackageManifest, sameHostPath } from '../boot/host-files.js';
import { buildProjectCompilerOptions } from '../boot/project-compiler-options.js';
import {
  EvaluationModuleGraph,
  normalizeModuleKey,
  readEvaluationModuleRecord,
} from './module-graph.js';
import { isRelativeModuleSpecifier } from './module-specifier.js';
import { guessScriptKind } from './ts-syntax.js';
import { assetModuleText } from './asset-module.js';

const MODULE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
  '.css',
] as const;

const MODULE_INDEX_FILES = [
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'index.mjs',
  'index.cjs',
  'index.json',
] as const;

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
  /** Read and parse one module key into a TypeScript source file. */
  readSourceFile(moduleKey: string): ts.SourceFile | null;
  /** Resolve an authored module specifier from one module key. */
  resolveModuleSpecifier(fromModuleKey: string, moduleSpecifier: string): string | null;
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

  fileExists(fileName: string): boolean {
    this.fileExistsCalls += 1;
    const key = hostFileCacheKey(fileName);
    const cached = this.fileExistsResults.get(key);
    if (cached !== undefined) {
      this.fileExistsHits += 1;
      return cached;
    }
    this.fileExistsMisses += 1;
    const exists = existsSync(fileName);
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
    const exists = ts.sys.directoryExists?.(directoryName) ?? false;
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
    let text: string | undefined;
    try {
      text = readFileSync(fileName, 'utf8');
    } catch {
      text = undefined;
    }
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
    const real = canonicalExistingPath(fileName);
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
    const directories = ts.sys.getDirectories?.(directoryName) ?? [];
    this.directoryListings.set(key, directories);
    return directories;
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
  private readonly fileSystem = new CachedEvaluationModuleHostFileSystem();
  private readonly moduleResolutionHost: ts.ModuleResolutionHost;
  private readonly moduleResolutionCache: ts.ModuleResolutionCache;
  private readonly resolvedModuleSpecifiers = new Map<string, string | null>();
  private readonly packageRootByBareSpecifier = new Map<string, string | null>();
  private readonly declarationSourcePathCache = new Map<string, string | null>();
  private readonly externalPackagePolicyCache = new Map<string, boolean>();

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
  private declarationSourceHits = 0;
  private declarationSourceMisses = 0;
  private packagePolicyHits = 0;
  private packagePolicyMisses = 0;

  constructor(
    /** Root directory for relative module keys. */
    readonly rootDir: string,
    /** Compiler options used to resolve authored module specifiers. */
    readonly compilerOptions: ts.CompilerOptions = buildProjectCompilerOptions(rootDir),
    /** Completeness/performance policy for non-TypeScript module-resolution fallbacks. */
    readonly moduleResolutionPolicy: EvaluationModuleResolutionPolicy = DefaultEvaluationModuleResolutionPolicy,
  ) {
    this.moduleResolutionHost = {
      fileExists: (fileName) => this.fileSystem.fileExists(fileName),
      readFile: (fileName) => this.fileSystem.readFile(fileName),
      directoryExists: (directoryName) => this.fileSystem.directoryExists(directoryName),
      getCurrentDirectory: () => this.rootDir,
      getDirectories: (directoryName) => this.fileSystem.getDirectories(directoryName) as string[],
      realpath: (fileName) => this.fileSystem.realpath(fileName),
    };
    this.moduleResolutionCache = ts.createModuleResolutionCache(
      this.rootDir,
      (fileName) => normalizeModuleKey(path.resolve(fileName)),
      this.compilerOptions,
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
      ts.ScriptTarget.Latest,
      true,
      assetText == null ? guessScriptKind(absolute) : ts.ScriptKind.TS,
    );
    this.sourceFileParseMilliseconds += performance.now() - parseStarted;
    this.sourceFileCache.set(normalized, sourceFile);
    return sourceFile;
  }

  resolveModuleSpecifier(fromModuleKey: string, moduleSpecifier: string): string | null {
    this.moduleResolutionCalls += 1;
    const started = performance.now();
    const cacheKey = moduleResolutionCacheKey(fromModuleKey, moduleSpecifier);
    if (this.resolvedModuleSpecifiers.has(cacheKey)) {
      this.moduleResolutionCacheHits += 1;
      this.moduleResolutionMilliseconds += performance.now() - started;
      return this.resolvedModuleSpecifiers.get(cacheKey) ?? null;
    }
    this.moduleResolutionCacheMisses += 1;
    const resolved = this.resolveModuleSpecifierCore(fromModuleKey, moduleSpecifier);
    this.resolvedModuleSpecifiers.set(cacheKey, resolved);
    this.moduleResolutionMilliseconds += performance.now() - started;
    return resolved;
  }

  snapshotProfile(): EvaluationModuleSourceHostProfile {
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
        declarationSourceHits: this.declarationSourceHits,
        declarationSourceMisses: this.declarationSourceMisses,
        packagePolicyHits: this.packagePolicyHits,
        packagePolicyMisses: this.packagePolicyMisses,
      },
      fileSystem: this.fileSystem.snapshot(),
    };
  }

  private resolveModuleSpecifierCore(fromModuleKey: string, moduleSpecifier: string): string | null {
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
        this.unresolvedBareModules += 1;
        this.unresolvedModules += 1;
        return null;
      }
      if (this.shouldTreatBarePackageAsExternalBoundary(fromAbsolute, modulePathSpecifier)) {
        this.packageExternalBoundaries += 1;
        this.unresolvedBareModules += 1;
        this.unresolvedModules += 1;
        return null;
      }
    }
    let probedRelativePath = false;
    if (relativeSpecifier && shouldResolveByPathProbeBeforeTypeScript(moduleSpecifier)) {
      probedRelativePath = true;
      this.pathProbeBeforeTypeScript += 1;
      const pathProbeResult = this.measureSourceModulePathProbe('before-typescript', () =>
        this.sourceModulePathForRelativeSpecifier(fromAbsolute, modulePathSpecifier)
      );
      if (pathProbeResult != null) {
        this.resolvedByPathProbe += 1;
        this.resolvedByPathProbeBeforeTypeScript += 1;
        return this.moduleKeyForAbsolutePath(pathProbeResult);
      }
    }

    this.typeScriptModuleResolutionCalls += 1;
    const typeScriptStarted = performance.now();
    const resolved = ts.resolveModuleName(
      modulePathSpecifier,
      fromAbsolute,
      this.compilerOptions,
      this.moduleResolutionHost,
      this.moduleResolutionCache,
    ).resolvedModule;
    this.typeScriptModuleResolutionMilliseconds += performance.now() - typeScriptStarted;
    const resolvedSourcePath = this.sourceModulePathForResolvedModule(resolved, fromAbsolute, modulePathSpecifier);
    if (resolvedSourcePath != null) {
      this.resolvedByTypeScript += 1;
      return this.moduleKeyForAbsolutePath(resolvedSourcePath);
    }
    if (relativeSpecifier) {
      if (!probedRelativePath && this.moduleResolutionPolicy.postTypeScriptRelativePathProbe) {
        this.pathProbeAfterTypeScript += 1;
        const pathProbeResult = this.measureSourceModulePathProbe('after-typescript', () =>
          this.sourceModulePathForRelativeSpecifier(fromAbsolute, modulePathSpecifier)
        );
        if (pathProbeResult != null) {
          this.resolvedByPathProbe += 1;
          this.resolvedByPathProbeAfterTypeScript += 1;
          return this.moduleKeyForAbsolutePath(pathProbeResult);
        }
      }
      this.unresolvedRelativeModules += 1;
      this.unresolvedModules += 1;
      return null;
    }
    this.unresolvedBareModules += 1;
    this.unresolvedModules += 1;
    return null;
  }

  private recordModuleResolutionShape(
    authoredSpecifier: string,
    pathSpecifier: string,
    relativeSpecifier: boolean,
  ): void {
    if (authoredSpecifier.search(/[?#]/) !== -1) {
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

  private sourceModulePathForResolvedModule(
    resolved: ts.ResolvedModuleFull | undefined,
    fromAbsolute: string,
    moduleSpecifier: string,
  ): string | null {
    if (resolved == null) {
      return null;
    }
    const resolvedFileName = path.resolve(resolved.resolvedFileName);
    const fileName = this.fileSystem.realpath(resolvedFileName);
    const externalPackageRoot = externalPackageRootForPath(fileName);

    if (isDeclarationFile(fileName)) {
      if (externalPackageRoot == null) {
        return null;
      }
      if (!this.shouldMapExternalPackageDeclarationToSource(externalPackageRoot)) {
        return null;
      }
      const sourcePath = this.sourceModulePathForPackageDeclaration(fileName, externalPackageRoot);
      return sourcePath != null
        && this.shouldAdmitExternalPackageSource(fromAbsolute, sourcePath, moduleSpecifier, externalPackageRoot)
        ? sourcePath
        : null;
    }

    if (!isEvaluationModulePath(fileName)) {
      return null;
    }

    if (externalPackageRoot != null) {
      return this.shouldAdmitExternalPackageSource(fromAbsolute, fileName, moduleSpecifier, externalPackageRoot)
        ? fileName
        : null;
    }
    return fileName;
  }

  private sourceModulePathForRelativeSpecifier(
    fromAbsolute: string,
    moduleSpecifier: string,
  ): string | null {
    const base = path.resolve(path.dirname(fromAbsolute), moduleSpecifier);
    for (const candidate of candidateModulePaths(base)) {
      if (!isEvaluationModulePath(candidate) || !this.fileSystem.fileExists(candidate)) {
        continue;
      }
      const fileName = this.fileSystem.realpath(candidate);
      const externalPackageRoot = externalPackageRootForPath(fileName);
      if (
        externalPackageRoot != null
        && !this.shouldAdmitExternalPackageSource(fromAbsolute, fileName, moduleSpecifier, externalPackageRoot)
      ) {
        continue;
      }
      return fileName;
    }
    return null;
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

  private sourceModulePathForPackageDeclaration(
    declarationFileName: string,
    packageRoot: string,
  ): string | null {
    const cacheKey = `${hostFileCacheKey(packageRoot)}::${hostFileCacheKey(declarationFileName)}`;
    if (this.declarationSourcePathCache.has(cacheKey)) {
      this.declarationSourceHits += 1;
      return this.declarationSourcePathCache.get(cacheKey) ?? null;
    }
    this.declarationSourceMisses += 1;
    const relativePath = normalizeModuleKey(path.relative(packageRoot, declarationFileName));
    const declarationBase = stripDeclarationExtension(relativePath);
    if (declarationBase == null) {
      this.declarationSourcePathCache.set(cacheKey, null);
      return null;
    }

    for (const candidateBase of sourceCandidateBasesForDeclarationBase(declarationBase)) {
      for (const candidate of candidateModulePaths(path.join(packageRoot, candidateBase))) {
        if (
          isEvaluationModulePath(candidate)
          && this.fileSystem.fileExists(candidate)
          && isAuthoredPackageSourceModule(candidate, packageRoot)
        ) {
          const sourcePath = this.fileSystem.realpath(candidate);
          this.declarationSourcePathCache.set(cacheKey, sourcePath);
          return sourcePath;
        }
      }
    }
    this.declarationSourcePathCache.set(cacheKey, null);
    return null;
  }

  private shouldMapExternalPackageDeclarationToSource(packageRoot: string): boolean {
    const cacheKey = hostFileCacheKey(packageRoot);
    const cached = this.externalPackagePolicyCache.get(cacheKey);
    if (cached !== undefined) {
      this.packagePolicyHits += 1;
      return cached;
    }
    this.packagePolicyMisses += 1;
    const shouldMap = readExternalPackageSourceMappingPolicy(packageRoot)
      || (
        this.moduleResolutionPolicy.admitSourceShippedPackageEntrypoints
        && packageManifestPublishesAuthoredSourceEntrypoint(packageRoot)
      );
    this.externalPackagePolicyCache.set(cacheKey, shouldMap);
    return shouldMap;
  }

  private shouldTreatBarePackageAsExternalBoundary(
    fromAbsolute: string,
    moduleSpecifier: string,
  ): boolean {
    if (
      moduleSpecifier.startsWith('#')
      || compilerOptionsPathsCanResolve(this.compilerOptions, moduleSpecifier)
    ) {
      return false;
    }
    const packageRoot = this.externalPackageRootForBareSpecifier(fromAbsolute, moduleSpecifier);
    if (packageRoot == null) {
      return false;
    }
    return !this.shouldMapExternalPackageDeclarationToSource(packageRoot);
  }

  private externalPackageRootForBareSpecifier(
    fromAbsolute: string,
    moduleSpecifier: string,
  ): string | null {
    const packageName = packageNameForBareModuleSpecifier(moduleSpecifier);
    if (packageName == null) {
      return null;
    }
    return this.findExternalPackageRoot(path.dirname(fromAbsolute), packageName);
  }

  private findExternalPackageRoot(
    fromDirectory: string,
    packageName: string,
  ): string | null {
    let current = path.resolve(fromDirectory);
    const visitedKeys: string[] = [];
    while (true) {
      const cacheKey = `${hostFileCacheKey(current)}::${packageName}`;
      const cached = this.packageRootByBareSpecifier.get(cacheKey);
      if (cached !== undefined) {
        this.cachePackageRootSearchResults(visitedKeys, cached);
        return cached;
      }
      visitedKeys.push(cacheKey);
      const packageRoot = path.join(current, 'node_modules', packageName);
      if (this.fileSystem.fileExists(path.join(packageRoot, 'package.json'))) {
        const realPackageRoot = this.fileSystem.realpath(packageRoot);
        this.cachePackageRootSearchResults(visitedKeys, realPackageRoot);
        return realPackageRoot;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        this.cachePackageRootSearchResults(visitedKeys, null);
        return null;
      }
      current = parent;
    }
  }

  private cachePackageRootSearchResults(
    keys: readonly string[],
    packageRoot: string | null,
  ): void {
    for (const key of keys) {
      this.packageRootByBareSpecifier.set(key, packageRoot);
    }
  }

  private shouldAdmitExternalPackageSource(
    fromAbsolute: string,
    resolvedFileName: string,
    moduleSpecifier: string,
    externalPackageRoot: string,
  ): boolean {
    const fromExternalPackageRoot = externalPackageRootForPath(fromAbsolute);
    if (fromExternalPackageRoot != null) {
      if (sameHostPath(fromExternalPackageRoot, externalPackageRoot)) {
        return isRelativeModuleSpecifier(moduleSpecifier) && isAuthoredPackageSourceModule(resolvedFileName, externalPackageRoot);
      }
      return !isRelativeModuleSpecifier(moduleSpecifier)
        && isAuthoredPackageSourceModule(resolvedFileName, externalPackageRoot);
    }
    return !isRelativeModuleSpecifier(moduleSpecifier)
      && isAuthoredPackageSourceModule(resolvedFileName, externalPackageRoot);
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

    const record = readEvaluationModuleRecord(sourceFile, normalizedModuleKey);
    graph.addModule(record);
    const moduleSpecifiers = uniqueModuleEdges([
      ...record.imports.map((entry) => ({ moduleSpecifier: entry.moduleSpecifier, node: entry.node })),
      ...record.exports
        .filter((entry) => entry.moduleSpecifier != null)
        .map((entry) => ({ moduleSpecifier: entry.moduleSpecifier as string, node: entry.node })),
    ]);

    for (const edge of moduleSpecifiers) {
      const target = host.resolveModuleSpecifier(normalizedModuleKey, edge.moduleSpecifier);
      graph.linkModule(normalizedModuleKey, edge.moduleSpecifier, target);
      if (target == null) {
        if (isRelativeModuleSpecifier(edge.moduleSpecifier)) {
          unresolvedModules.push(new EvaluationModuleResolutionOpen(normalizedModuleKey, edge.moduleSpecifier, edge.node));
        }
        continue;
      }
      visit(target);
    }
  }

  visit(entryModuleKey);
  return new EvaluationModuleGraphBuildResult(graph, unresolvedModules);
}

function uniqueModuleEdges(
  edges: readonly { readonly moduleSpecifier: string; readonly node: ts.Node }[],
): readonly { readonly moduleSpecifier: string; readonly node: ts.Node }[] {
  const seen = new Set<string>();
  const unique: { readonly moduleSpecifier: string; readonly node: ts.Node }[] = [];
  for (const edge of edges) {
    if (seen.has(edge.moduleSpecifier)) {
      continue;
    }
    seen.add(edge.moduleSpecifier);
    unique.push(edge);
  }
  return unique;
}

function moduleSpecifierWithoutQuery(moduleSpecifier: string): string {
  const queryIndex = moduleSpecifier.search(/[?#]/);
  return queryIndex === -1 ? moduleSpecifier : moduleSpecifier.slice(0, queryIndex);
}

function moduleResolutionCacheKey(fromModuleKey: string, moduleSpecifier: string): string {
  return `${normalizeModuleKey(fromModuleKey)}\0${moduleSpecifier}`;
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

function packageNameForBareModuleSpecifier(moduleSpecifier: string): string | null {
  if (moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/') || moduleSpecifier.length === 0) {
    return null;
  }
  const segments = moduleSpecifier.split('/');
  const first = segments[0];
  if (first == null || first.length === 0 || first.startsWith('#')) {
    return null;
  }
  if (first.startsWith('@')) {
    const second = segments[1];
    return second == null || second.length === 0 ? null : `${first}/${second}`;
  }
  return first;
}

function compilerOptionsPathsCanResolve(
  compilerOptions: ts.CompilerOptions,
  moduleSpecifier: string,
): boolean {
  const paths = compilerOptions.paths;
  if (paths == null) {
    return false;
  }
  return Object.keys(paths).some((pattern) => pathPatternMatchesSpecifier(pattern, moduleSpecifier));
}

function pathPatternMatchesSpecifier(pattern: string, moduleSpecifier: string): boolean {
  const starIndex = pattern.indexOf('*');
  if (starIndex < 0) {
    return pattern === moduleSpecifier;
  }
  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  return moduleSpecifier.startsWith(prefix) && moduleSpecifier.endsWith(suffix);
}

function shouldResolveByPathProbeBeforeTypeScript(moduleSpecifier: string): boolean {
  if (moduleSpecifier.search(/[?#]/) !== -1) {
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

function candidateModulePaths(base: string): readonly string[] {
  const direct = candidateDirectModulePaths(base);
  if (!shouldProbeIndexModulePaths(base)) {
    return direct;
  }
  const indexes = MODULE_INDEX_FILES.map((file) => path.join(base, file));
  return [...direct, ...indexes];
}

function shouldProbeIndexModulePaths(base: string): boolean {
  const extension = path.extname(base).toLowerCase();
  return extension.length === 0 || !isEvaluationModuleExtension(extension);
}

function candidateDirectModulePaths(base: string): readonly string[] {
  const extension = path.extname(base);
  if (extension === '.js' || extension === '.jsx' || extension === '.mjs' || extension === '.cjs') {
    const withoutExtension = base.slice(0, -extension.length);
    return [
      base,
      `${withoutExtension}.ts`,
      `${withoutExtension}.tsx`,
      `${withoutExtension}.js`,
      `${withoutExtension}.jsx`,
      `${withoutExtension}.mjs`,
      `${withoutExtension}.cjs`,
    ];
  }
  if (extension.length > 0 && isEvaluationModulePath(base)) {
    return [base];
  }
  return MODULE_EXTENSIONS.map((candidateExtension) => `${base}${candidateExtension}`);
}

function canonicalExistingPath(fileName: string): string {
  try {
    return realpathSync.native(fileName);
  } catch {
    return fileName;
  }
}

function hostFileCacheKey(fileName: string): string {
  const normalized = normalizeModuleKey(path.resolve(fileName));
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isEvaluationModulePath(fileName: string): boolean {
  return isEvaluationModuleExtension(path.extname(fileName).toLowerCase());
}

function isEvaluationModuleExtension(extension: string): boolean {
  switch (extension) {
    case '.ts':
    case '.tsx':
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
    case '.json':
    case '.html':
    case '.css':
      return true;
    default:
      return false;
  }
}

function isDeclarationFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.d.ts') || lower.endsWith('.d.mts') || lower.endsWith('.d.cts');
}

function readExternalPackageSourceMappingPolicy(packageRoot: string): boolean {
  const manifest = readPackageManifest(packageRoot);
  if (manifest == null) {
    return false;
  }
  const name = typeof manifest.name === 'string' ? manifest.name : null;
  if (name === 'aurelia' || name?.startsWith('@aurelia/')) {
    return false;
  }
  if (name?.toLowerCase().includes('aurelia') === true) {
    return true;
  }
  return dependencyNames(manifest).some((dependency) =>
    dependency === 'aurelia' || dependency.startsWith('@aurelia/')
  );
}

function packageManifestPublishesAuthoredSourceEntrypoint(packageRoot: string): boolean {
  const manifest = readPackageManifest(packageRoot);
  if (manifest == null) {
    return false;
  }
  return packageManifestEntrypoints(manifest).some((entrypoint) =>
    packageEntrypointIsAuthoredSource(packageRoot, entrypoint)
  );
}

function packageManifestEntrypoints(manifest: Record<string, unknown>): readonly string[] {
  return uniquePackageEntrypoints([
    ...packageManifestStringField(manifest.main),
    ...packageManifestStringField(manifest.module),
    ...packageManifestStringField(manifest.browser),
    ...packageManifestStringField(manifest.source),
    ...packageManifestExportEntrypoints(manifest.exports),
  ]);
}

function packageManifestStringField(value: unknown): readonly string[] {
  return typeof value === 'string' && value.length > 0 ? [value] : [];
}

function packageManifestExportEntrypoints(value: unknown): readonly string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(packageManifestExportEntrypoints);
  }
  if (value != null && typeof value === 'object') {
    return Object.values(value).flatMap(packageManifestExportEntrypoints);
  }
  return [];
}

function uniquePackageEntrypoints(values: readonly string[]): readonly string[] {
  return [...new Set(values
    .map((value) => value.split(/[?#]/u, 1)[0] ?? '')
    .filter((value) => value.length > 0 && !value.startsWith('#'))
  )];
}

function packageEntrypointIsAuthoredSource(
  packageRoot: string,
  entrypoint: string,
): boolean {
  const base = path.resolve(packageRoot, entrypoint);
  return candidateModulePaths(base).some((candidate) =>
    existsSync(candidate) && isAuthoredPackageSourceModule(candidate, packageRoot)
  );
}

function dependencyNames(manifest: Record<string, unknown>): readonly string[] {
  return [
    ...dependencyGroupNames(manifest.dependencies),
    ...dependencyGroupNames(manifest.peerDependencies),
    ...dependencyGroupNames(manifest.devDependencies),
  ];
}

function dependencyGroupNames(value: unknown): readonly string[] {
  return value != null && typeof value === 'object'
    ? Object.keys(value)
    : [];
}

function stripDeclarationExtension(relativePath: string): string | null {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith('.d.ts')) {
    return relativePath.slice(0, -'.d.ts'.length);
  }
  if (lower.endsWith('.d.mts')) {
    return relativePath.slice(0, -'.d.mts'.length);
  }
  if (lower.endsWith('.d.cts')) {
    return relativePath.slice(0, -'.d.cts'.length);
  }
  return null;
}

function sourceCandidateBasesForDeclarationBase(declarationBase: string): readonly string[] {
  const candidates: string[] = [];
  addSourceCandidateBase(candidates, declarationBase.replace(/^dist\/types\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase.replace(/^dist\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase.replace(/^types\//, 'src/'));
  addSourceCandidateBase(candidates, declarationBase);
  if (declarationBase.endsWith('/index')) {
    addSourceCandidateBase(candidates, 'src/index');
  }
  return candidates;
}

function addSourceCandidateBase(candidates: string[], value: string): void {
  if (!candidates.includes(value)) {
    candidates.push(value);
  }
}

function isAuthoredPackageSourceModule(fileName: string, packageRoot: string): boolean {
  const relativePath = normalizeModuleKey(path.relative(packageRoot, fileName));
  if (relativePath.startsWith('../') || path.isAbsolute(relativePath)) {
    return false;
  }
  const segments = relativePath.split('/');
  if (segments.includes('dist') || segments.includes('lib') || segments.includes('umd') || segments.includes('cjs') || segments.includes('esm')) {
    return false;
  }
  const extension = path.extname(fileName).toLowerCase();
  if (segments[0] === 'src') {
    return isEvaluationModulePath(fileName);
  }
  return extension === '.ts' || extension === '.tsx';
}

function externalPackageRootForPath(fileName: string): string | null {
  const normalized = normalizeModuleKey(path.resolve(fileName));
  const segments = normalized.split('/');
  const nodeModulesIndex = segments.lastIndexOf('node_modules');
  if (nodeModulesIndex === -1 || nodeModulesIndex + 1 >= segments.length) {
    return null;
  }
  const packageNameIndex = nodeModulesIndex + 1;
  const packageName = segments[packageNameIndex];
  if (packageName == null) {
    return null;
  }
  const endIndex = packageName.startsWith('@')
    ? packageNameIndex + 2
    : packageNameIndex + 1;
  return endIndex <= segments.length
    ? segments.slice(0, endIndex).join('/')
    : null;
}
