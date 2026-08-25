import path from 'node:path';

import ts from 'typescript';

import {
  isHostPathWithin,
  readPackageManifest,
  type BootPackageManifest,
} from '../boot/host-files.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import {
  createResolvedPackageInstance,
  projectModuleHostPathKey,
  type ResolvedPackageInstance,
} from './package-identity.js';
import {
  externalPackageRootForPath,
  packageNameForBareModuleSpecifier,
  ProjectPackageLocator,
} from './package-topology.js';

const SOURCE_EXTENSIONS_BY_DECLARATION_EXTENSION = new Map<string, readonly string[]>([
  ['.d.ts', ['.ts', '.tsx']],
  ['.d.mts', ['.mts']],
  ['.d.cts', ['.cts']],
]);

export const enum ProjectModuleResolutionKind {
  TypeScript = 'typescript',
  LinkedSource = 'linked-source',
  Unresolved = 'unresolved',
}

export const enum ProjectModuleResolutionOpeningKind {
  ManifestIdentityMismatch = 'manifest-identity-mismatch',
  MissingAdvertisedDeclaration = 'missing-advertised-declaration',
  AdvertisedDeclarationPresent = 'advertised-declaration-present',
  DeclarationSelectionUnavailable = 'declaration-selection-unavailable',
  PackageConfigUnavailable = 'package-config-unavailable',
  PackageConfigUnsupported = 'package-config-unsupported',
  DeclarationOutsideOutput = 'declaration-outside-output',
  SourceUnavailable = 'source-unavailable',
  SourceAmbiguous = 'source-ambiguous',
}

/** One exact linked-package declaration-to-source decision, independent from consumer admission policy. */
export class ResolvedProjectModuleSourceLink {
  readonly revision: string;

  constructor(
    readonly containingFile: string,
    readonly moduleSpecifier: string,
    readonly resolutionMode: ts.ResolutionMode | null,
    readonly packageInstance: ResolvedPackageInstance,
    readonly logicalPackageRoot: string,
    readonly physicalPackageRoot: string,
    readonly packageConfigPath: string,
    readonly logicalDeclarationPath: string,
    readonly physicalDeclarationPath: string,
    readonly logicalSourcePath: string,
    readonly physicalSourcePath: string,
  ) {
    this.revision = stableKernelLocalHash(JSON.stringify({
      containingFile: projectModuleHostPathKey(containingFile),
      moduleSpecifier,
      resolutionMode,
      packageInstanceKey: packageInstance.instanceKey,
      logicalPackageRoot: projectModuleHostPathKey(logicalPackageRoot),
      physicalPackageRoot: projectModuleHostPathKey(physicalPackageRoot),
      packageConfigPath: projectModuleHostPathKey(packageConfigPath),
      logicalDeclarationPath: projectModuleHostPathKey(logicalDeclarationPath),
      physicalDeclarationPath: projectModuleHostPathKey(physicalDeclarationPath),
      logicalSourcePath: projectModuleHostPathKey(logicalSourcePath),
      physicalSourcePath: projectModuleHostPathKey(physicalSourcePath),
    }));
  }
}

/** Typed reason an exact linked package could not yield one source counterpart. */
export class ProjectModuleResolutionOpening {
  constructor(
    readonly openingKind: ProjectModuleResolutionOpeningKind,
    readonly moduleSpecifier: string,
    readonly logicalPackageRoot: string,
    readonly physicalPackageRoot: string,
    readonly declarationPath: string | null,
    readonly sourceCandidates: readonly string[] = [],
  ) {}
}

/** One normalized TypeScript or linked-source module-resolution result. */
export class ProjectModuleResolution {
  constructor(
    readonly kind: ProjectModuleResolutionKind,
    readonly typescript: ts.ResolvedModuleWithFailedLookupLocations,
    readonly sourceLink: ResolvedProjectModuleSourceLink | null = null,
    readonly opening: ProjectModuleResolutionOpening | null = null,
  ) {}

  get resolvedModule(): ts.ResolvedModuleFull | undefined {
    return this.typescript.resolvedModule;
  }
}

interface PackageOutputLayout {
  readonly configPath: string;
  readonly rootDir: string;
  readonly declarationDir: string;
}

interface MutablePackageOutputLayout {
  configPath: string;
  rootDir: string | null;
  declarationDir: string | null;
}

const enum PackageOutputLayoutReadKind {
  Available = 'available',
  Unavailable = 'unavailable',
  Unsupported = 'unsupported',
}

type PackageOutputLayoutReadResult =
  | { readonly kind: PackageOutputLayoutReadKind.Available; readonly layout: PackageOutputLayout }
  | { readonly kind: PackageOutputLayoutReadKind.Unavailable | PackageOutputLayoutReadKind.Unsupported };

interface KnownLinkedPackage {
  readonly packageInstance: ResolvedPackageInstance;
  readonly logicalPackageRoot: string;
  readonly physicalPackageRoot: string;
}

interface LinkedPackageResolutionContext {
  readonly packageName: string;
  readonly logicalPackageRoot: string;
  readonly physicalPackageRoot: string;
  readonly knownPackage: KnownLinkedPackage | null;
}

/**
 * Receipt-local project module-resolution authority shared by checker and evaluator implementations.
 *
 * Instances must not cross computation read scopes: their caches intentionally replay no host reads. Consumers create
 * one instance over their own captured project-input host and may compare deterministic source-link revisions.
 */
export class ProjectModuleResolver {
  private readonly moduleResolutionHost: ts.ModuleResolutionHost;
  private readonly moduleResolutionCache: ts.ModuleResolutionCache;
  private readonly packageLocator: ProjectPackageLocator;
  private readonly resolutions = new Map<string, ProjectModuleResolution>();
  private readonly knownLinkedPackages = new Map<string, KnownLinkedPackage>();
  private readonly runtimeResolutionCaches = new Map<string, ts.ModuleResolutionCache>();

  constructor(
    private readonly rootDir: string,
    private readonly compilerOptions: ts.CompilerOptions,
    private readonly inputHost: SemanticRuntimeProjectInputHost,
  ) {
    this.moduleResolutionHost = projectModuleResolutionHost(rootDir, inputHost);
    this.moduleResolutionCache = ts.createModuleResolutionCache(
      rootDir,
      projectModuleHostPathKey,
      compilerOptions,
    );
    this.packageLocator = new ProjectPackageLocator(inputHost);
  }

  getModuleResolutionCache(): ts.ModuleResolutionCache {
    return this.moduleResolutionCache;
  }

  getImpliedNodeFormatForFile(fileName: string): ts.ResolutionMode {
    return ts.getImpliedNodeFormatForFile(
      path.resolve(fileName),
      this.moduleResolutionCache.getPackageJsonInfoCache(),
      this.moduleResolutionHost,
      this.compilerOptions,
    );
  }

  resolveModuleName(
    moduleSpecifier: string,
    containingFile: string,
    redirectedReference?: ts.ResolvedProjectReference,
    resolutionMode?: ts.ResolutionMode,
  ): ProjectModuleResolution {
    const absoluteContainingFile = path.resolve(containingFile);
    const cacheKey = projectModuleResolutionCacheKey(
      absoluteContainingFile,
      moduleSpecifier,
      redirectedReference,
      resolutionMode,
    );
    const cached = this.resolutions.get(cacheKey);
    if (cached != null) {
      return cached;
    }
    const ordinary = ts.resolveModuleName(
      moduleSpecifier,
      absoluteContainingFile,
      this.compilerOptions,
      this.moduleResolutionHost,
      this.moduleResolutionCache,
      redirectedReference,
      resolutionMode,
    );
    const resolution = ordinary.resolvedModule != null
      ? new ProjectModuleResolution(ProjectModuleResolutionKind.TypeScript, ordinary)
      : this.resolveLinkedPackageSource(
          ordinary,
          moduleSpecifier,
          absoluteContainingFile,
          redirectedReference,
          resolutionMode,
        );
    this.resolutions.set(cacheKey, resolution);
    return resolution;
  }

  /**
   * Resolve the condition-selected JavaScript package target independently from the declaration/source lane.
   *
   * Declaration files under the already-selected package instance are hidden only for this second resolution. A
   * separate cache prevents TypeScript from replaying the declaration result from the ordinary resolution.
   */
  resolvePackageRuntimeModuleName(
    moduleSpecifier: string,
    containingFile: string,
    packageRoots: readonly string[],
    resolutionMode?: ts.ResolutionMode,
  ): ts.ResolvedModuleFull | null {
    const roots = [...new Set(packageRoots.map((root) => path.resolve(root)))];
    if (roots.length === 0) return null;
    const cacheKey = JSON.stringify([
      roots.map(projectModuleHostPathKey).sort(),
      resolutionMode ?? null,
    ]);
    let cache = this.runtimeResolutionCaches.get(cacheKey);
    if (cache == null) {
      cache = ts.createModuleResolutionCache(
        this.rootDir,
        projectModuleHostPathKey,
        this.compilerOptions,
      );
      this.runtimeResolutionCaches.set(cacheKey, cache);
    }
    const host: ts.ModuleResolutionHost = {
      ...this.moduleResolutionHost,
      fileExists: (fileName) =>
        !(isDeclarationFilePath(fileName) && roots.some((root) => isHostPathWithin(fileName, root)))
        && this.moduleResolutionHost.fileExists(fileName),
    };
    const resolved = ts.resolveModuleName(
      moduleSpecifier,
      path.resolve(containingFile),
      this.compilerOptions,
      host,
      cache,
      undefined,
      resolutionMode,
    ).resolvedModule;
    return resolved != null
      && isRuntimeJavaScriptResolution(resolved)
      && roots.some((root) => isHostPathWithin(resolved.resolvedFileName, root))
        ? resolved
        : null;
  }

  readSourceLinks(): readonly ResolvedProjectModuleSourceLink[] {
    return [...this.resolutions.values()]
      .flatMap((resolution) => resolution.sourceLink == null ? [] : [resolution.sourceLink]);
  }

  readOpenings(): readonly ProjectModuleResolutionOpening[] {
    return [...this.resolutions.values()]
      .flatMap((resolution) => resolution.opening == null ? [] : [resolution.opening]);
  }

  private resolveLinkedPackageSource(
    ordinary: ts.ResolvedModuleWithFailedLookupLocations,
    moduleSpecifier: string,
    containingFile: string,
    redirectedReference: ts.ResolvedProjectReference | undefined,
    resolutionMode: ts.ResolutionMode | undefined,
  ): ProjectModuleResolution {
    const context = this.linkedPackageResolutionContext(moduleSpecifier, containingFile);
    if (context == null) {
      return new ProjectModuleResolution(ProjectModuleResolutionKind.Unresolved, ordinary);
    }
    const {
      packageName,
      logicalPackageRoot,
      physicalPackageRoot,
      knownPackage,
    } = context;
    const resolutionContainingFile = knownPackage != null
      && this.compilerOptions.preserveSymlinks !== true
      ? canonicalPhysicalModulePath(this.inputHost, containingFile)
      : containingFile;
    if (
      knownPackage == null
      && (
        projectModuleHostPathKey(logicalPackageRoot) === projectModuleHostPathKey(physicalPackageRoot)
        || externalPackageRootForPath(physicalPackageRoot) != null
      )
    ) {
      return new ProjectModuleResolution(ProjectModuleResolutionKind.Unresolved, ordinary);
    }
    const logicalManifest = readPackageManifest(this.inputHost, logicalPackageRoot);
    const physicalManifest = readPackageManifest(this.inputHost, physicalPackageRoot);
    if (!sameLinkedPackageManifestIdentity(logicalManifest, physicalManifest, packageName)) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.ManifestIdentityMismatch,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
      );
    }
    const advertisedTargets = moduleSpecifier.startsWith('#')
      ? advertisedPackageImportDeclarationTargets(logicalManifest!, moduleSpecifier)
      : advertisedDeclarationTargets(
          logicalManifest!,
          packageSubpathForSpecifier(moduleSpecifier, packageName),
        );
    if (advertisedTargets.length === 0) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.MissingAdvertisedDeclaration,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
      );
    }
    const declarationTargets = advertisedTargets
      .map((target) => linkedDeclarationTarget(logicalPackageRoot, physicalPackageRoot, target))
      .filter((target): target is NonNullable<typeof target> => target != null);
    if (declarationTargets.length === 0) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.DeclarationSelectionUnavailable,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
      );
    }
    const syntheticHost = linkedDeclarationSelectionHost(
      this.moduleResolutionHost,
      declarationTargets,
    );
    const selected = ts.resolveModuleName(
      moduleSpecifier,
      resolutionContainingFile,
      this.compilerOptions,
      syntheticHost,
      undefined,
      redirectedReference,
      resolutionMode,
    ).resolvedModule;
    const selectedTarget = selected == null
      ? null
      : declarationTargetForResolvedModule(declarationTargets, selected);
    if (selected == null || selectedTarget == null) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.DeclarationSelectionUnavailable,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
      );
    }
    if (
      this.inputHost.fileExists(selectedTarget.logicalPath)
      || this.inputHost.fileExists(selectedTarget.physicalPath)
    ) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.AdvertisedDeclarationPresent,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
        selectedTarget.physicalPath,
      );
    }
    const layoutRead = readPackageOutputLayout(this.inputHost, physicalPackageRoot);
    if (layoutRead.kind !== PackageOutputLayoutReadKind.Available) {
      return unresolvedProjectModuleResolution(
        ordinary,
        layoutRead.kind === PackageOutputLayoutReadKind.Unsupported
          ? ProjectModuleResolutionOpeningKind.PackageConfigUnsupported
          : ProjectModuleResolutionOpeningKind.PackageConfigUnavailable,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
        selectedTarget.physicalPath,
      );
    }
    const layout = layoutRead.layout;
    if (!isHostPathWithin(selectedTarget.physicalPath, layout.declarationDir)) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.DeclarationOutsideOutput,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
        selectedTarget.physicalPath,
      );
    }
    const sourceCandidates = sourceCandidatesForDeclaration(
      layout,
      selectedTarget.physicalPath,
    );
    if (sourceCandidates == null) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.PackageConfigUnsupported,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
        selectedTarget.physicalPath,
      );
    }
    const existingSourceCandidates = sourceCandidates
      .filter((candidate) => this.inputHost.fileExists(candidate))
      .map((candidate) => path.resolve(this.inputHost.realpath(candidate)))
      .sort((left, right) => projectModuleHostPathKey(left).localeCompare(projectModuleHostPathKey(right)));
    if (existingSourceCandidates.length !== 1) {
      return unresolvedProjectModuleResolution(
        ordinary,
        existingSourceCandidates.length === 0
          ? ProjectModuleResolutionOpeningKind.SourceUnavailable
          : ProjectModuleResolutionOpeningKind.SourceAmbiguous,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
        selectedTarget.physicalPath,
        existingSourceCandidates,
      );
    }
    const physicalSourcePath = existingSourceCandidates[0]!;
    if (
      !isHostPathWithin(physicalSourcePath, physicalPackageRoot)
      || !isHostPathWithin(physicalSourcePath, layout.rootDir)
    ) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.SourceUnavailable,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
        selectedTarget.physicalPath,
        existingSourceCandidates,
      );
    }
    const logicalSourcePath = path.resolve(
      logicalPackageRoot,
      path.relative(physicalPackageRoot, physicalSourcePath),
    );
    const packageInstance = createResolvedPackageInstance(
      physicalManifest,
      selected.packageId ?? null,
      physicalPackageRoot,
      logicalPackageRoot,
      this.compilerOptions.preserveSymlinks === true,
    );
    if (
      packageInstance == null
      || (
        knownPackage != null
        && packageInstance.instanceKey !== knownPackage.packageInstance.instanceKey
      )
    ) {
      return unresolvedProjectModuleResolution(
        ordinary,
        ProjectModuleResolutionOpeningKind.ManifestIdentityMismatch,
        moduleSpecifier,
        logicalPackageRoot,
        physicalPackageRoot,
        selectedTarget.physicalPath,
      );
    }
    const sourceLink = new ResolvedProjectModuleSourceLink(
      resolutionContainingFile,
      moduleSpecifier,
      resolutionMode ?? null,
      packageInstance,
      logicalPackageRoot,
      physicalPackageRoot,
      layout.configPath,
      selectedTarget.logicalPath,
      selectedTarget.physicalPath,
      logicalSourcePath,
      physicalSourcePath,
    );
    this.registerKnownLinkedPackage(sourceLink);
    const resolvedFileName = this.compilerOptions.preserveSymlinks === true
      ? logicalSourcePath
      : physicalSourcePath;
    const resolvedModule: ts.ResolvedModuleFull = {
      ...selected,
      resolvedFileName,
      extension: sourceModuleExtension(physicalSourcePath),
    };
    return new ProjectModuleResolution(
      ProjectModuleResolutionKind.LinkedSource,
      { ...ordinary, resolvedModule },
      sourceLink,
    );
  }

  private linkedPackageResolutionContext(
    moduleSpecifier: string,
    containingFile: string,
  ): LinkedPackageResolutionContext | null {
    const knownPackage = this.knownLinkedPackageContaining(containingFile);
    if (
      knownPackage != null
      && (
        moduleSpecifier.startsWith('#')
        || moduleSpecifier === knownPackage.packageInstance.name
        || moduleSpecifier.startsWith(`${knownPackage.packageInstance.name}/`)
      )
    ) {
      return {
        packageName: knownPackage.packageInstance.name,
        logicalPackageRoot: knownPackage.logicalPackageRoot,
        physicalPackageRoot: knownPackage.physicalPackageRoot,
        knownPackage,
      };
    }
    const packageName = packageNameForBareModuleSpecifier(moduleSpecifier);
    const logicalPackageRoot = packageName == null
      ? null
      : this.packageLocator.findBarePackageRoot(containingFile, moduleSpecifier);
    if (packageName == null || logicalPackageRoot == null) {
      return null;
    }
    return {
      packageName,
      logicalPackageRoot,
      physicalPackageRoot: path.resolve(this.inputHost.realpath(logicalPackageRoot)),
      knownPackage: null,
    };
  }

  private knownLinkedPackageContaining(containingFile: string): KnownLinkedPackage | null {
    if (this.knownLinkedPackages.size === 0) {
      return null;
    }
    const absoluteContainingFile = path.resolve(containingFile);
    const packageIdentityContainingFile = this.compilerOptions.preserveSymlinks === true
      ? absoluteContainingFile
      : canonicalPhysicalModulePath(this.inputHost, absoluteContainingFile);
    const nestedPackageRoot = externalPackageRootForPath(packageIdentityContainingFile);
    const candidates = [...this.knownLinkedPackages.values()]
      .map((candidate) => ({
        candidate,
        matchingRoot: [candidate.logicalPackageRoot, candidate.physicalPackageRoot]
          .filter((root) => isHostPathWithin(packageIdentityContainingFile, root))
          .sort((left, right) => right.length - left.length)[0] ?? null,
      }))
      .filter((entry): entry is typeof entry & { readonly matchingRoot: string } =>
        entry.matchingRoot != null
        && (
          nestedPackageRoot == null
          || projectModuleHostPathKey(nestedPackageRoot) === projectModuleHostPathKey(entry.matchingRoot)
        )
      )
      .sort((left, right) =>
        right.matchingRoot.length - left.matchingRoot.length
        || left.candidate.packageInstance.instanceKey.localeCompare(right.candidate.packageInstance.instanceKey)
      );
    const selected = candidates[0] ?? null;
    if (
      selected == null
      || (
        candidates[1] != null
        && candidates[1].matchingRoot.length === selected.matchingRoot.length
        && candidates[1].candidate.packageInstance.instanceKey
          !== selected.candidate.packageInstance.instanceKey
      )
    ) {
      return null;
    }
    return selected.candidate;
  }

  private registerKnownLinkedPackage(sourceLink: ResolvedProjectModuleSourceLink): void {
    const preserveLogicalIdentity = this.compilerOptions.preserveSymlinks === true;
    const knownPackage = {
      packageInstance: sourceLink.packageInstance,
      logicalPackageRoot: preserveLogicalIdentity
        ? sourceLink.logicalPackageRoot
        : sourceLink.physicalPackageRoot,
      physicalPackageRoot: sourceLink.physicalPackageRoot,
    };
    const existing = this.knownLinkedPackages.get(sourceLink.packageInstance.instanceKey);
    if (
      existing != null
      && projectModuleHostPathKey(existing.logicalPackageRoot)
        === projectModuleHostPathKey(knownPackage.logicalPackageRoot)
      && projectModuleHostPathKey(existing.physicalPackageRoot)
        === projectModuleHostPathKey(knownPackage.physicalPackageRoot)
    ) {
      return;
    }
    this.knownLinkedPackages.set(sourceLink.packageInstance.instanceKey, knownPackage);
    // A self export or #imports request may have been probed before its owning link was established. Those fail closed,
    // but must not remain order-dependent after this receipt gains exact owner evidence.
    for (const [cacheKey, resolution] of this.resolutions) {
      if (resolution.kind === ProjectModuleResolutionKind.Unresolved) {
        this.resolutions.delete(cacheKey);
      }
    }
  }
}

function canonicalPhysicalModulePath(
  inputHost: SemanticRuntimeProjectInputHost,
  fileName: string,
): string {
  const absolute = path.resolve(fileName);
  const direct = path.resolve(inputHost.realpath(absolute));
  if (projectModuleHostPathKey(direct) !== projectModuleHostPathKey(absolute)) {
    return direct;
  }
  const suffix = [path.basename(absolute)];
  let ancestor = path.dirname(absolute);
  while (ancestor !== path.dirname(ancestor)) {
    if (inputHost.directoryExists(ancestor)) {
      return path.resolve(inputHost.realpath(ancestor), ...suffix);
    }
    suffix.unshift(path.basename(ancestor));
    ancestor = path.dirname(ancestor);
  }
  return direct;
}

function projectModuleResolutionHost(
  rootDir: string,
  inputHost: SemanticRuntimeProjectInputHost,
): ts.ModuleResolutionHost {
  return {
    fileExists: (fileName) => inputHost.fileExists(fileName),
    readFile: (fileName) => inputHost.readFile(fileName),
    directoryExists: (directoryName) => inputHost.directoryExists(directoryName),
    getCurrentDirectory: () => rootDir,
    getDirectories: (directoryName) => inputHost.readDirectory(directoryName)
      .map((entry) => path.join(directoryName, entry))
      .filter((entry) => inputHost.directoryExists(entry)),
    realpath: (fileName) => inputHost.realpath(fileName),
  };
}

function projectModuleResolutionCacheKey(
  containingFile: string,
  moduleSpecifier: string,
  redirectedReference: ts.ResolvedProjectReference | undefined,
  resolutionMode: ts.ResolutionMode | undefined,
): string {
  return JSON.stringify([
    projectModuleHostPathKey(containingFile),
    moduleSpecifier,
    resolutionMode ?? null,
    redirectedReference?.sourceFile.fileName == null
      ? null
      : projectModuleHostPathKey(redirectedReference.sourceFile.fileName),
  ]);
}

function isDeclarationFilePath(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.d.ts') || lower.endsWith('.d.mts') || lower.endsWith('.d.cts');
}

function isRuntimeJavaScriptResolution(resolved: ts.ResolvedModuleFull): boolean {
  return runtimeJavaScriptExtensions.has(resolved.extension);
}

const runtimeJavaScriptExtensions = new Set<string>([
  ts.Extension.Js,
  ts.Extension.Jsx,
  ts.Extension.Mjs,
  ts.Extension.Cjs,
]);

function sameLinkedPackageManifestIdentity(
  logical: BootPackageManifest | null,
  physical: BootPackageManifest | null,
  expectedName: string,
): boolean {
  const logicalName = typeof logical?.name === 'string' ? logical.name : null;
  const physicalName = typeof physical?.name === 'string' ? physical.name : null;
  const logicalVersion = typeof logical?.version === 'string' ? logical.version : null;
  const physicalVersion = typeof physical?.version === 'string' ? physical.version : null;
  return logicalName === expectedName
    && physicalName === expectedName
    && logicalVersion === physicalVersion;
}

function packageSubpathForSpecifier(moduleSpecifier: string, packageName: string): string {
  return moduleSpecifier === packageName ? '.' : `.${moduleSpecifier.slice(packageName.length)}`;
}

function advertisedDeclarationTargets(
  manifest: BootPackageManifest,
  packageSubpath: string,
): readonly string[] {
  const targets: string[] = [];
  const exportsEntry = packageExportsEntry(manifest.exports, packageSubpath);
  collectAdvertisedDeclarationTargets(exportsEntry, false, targets);
  if (packageSubpath === '.') {
    addPackageTypesTarget(targets, manifest.types);
    addPackageTypesTarget(targets, manifest.typings);
  }
  return [...new Set(targets)];
}

function advertisedPackageImportDeclarationTargets(
  manifest: BootPackageManifest,
  moduleSpecifier: string,
): readonly string[] {
  const targets: string[] = [];
  collectAdvertisedDeclarationTargets(
    packageImportsEntry(manifest.imports, moduleSpecifier),
    false,
    targets,
  );
  return [...new Set(targets)];
}

function packageExportsEntry(exportsValue: unknown, packageSubpath: string): unknown {
  if (exportsValue == null || typeof exportsValue !== 'object' || Array.isArray(exportsValue)) {
    return packageSubpath === '.' ? exportsValue : null;
  }
  const exportsRecord = exportsValue as Record<string, unknown>;
  const entries = Object.entries(exportsRecord);
  const hasSubpaths = entries.some(([key]) => key.startsWith('.'));
  if (!hasSubpaths) {
    return packageSubpath === '.' ? exportsValue : null;
  }
  const exact = exportsRecord[packageSubpath];
  if (exact !== undefined) {
    return exact;
  }
  const wildcard = entries
    .filter(([key]) => key.includes('*'))
    .map(([key, value]) => ({ key, value, match: matchPackageSubpathPattern(key, packageSubpath) }))
    .filter((entry): entry is typeof entry & { readonly match: string } => entry.match != null)
    .sort((left, right) => comparePackagePatternKeys(left.key, right.key))[0];
  return wildcard == null ? null : substitutePackageTargetPattern(wildcard.value, wildcard.match);
}

function packageImportsEntry(importsValue: unknown, moduleSpecifier: string): unknown {
  if (importsValue == null || typeof importsValue !== 'object' || Array.isArray(importsValue)) {
    return null;
  }
  const importsRecord = importsValue as Record<string, unknown>;
  const exact = importsRecord[moduleSpecifier];
  if (exact !== undefined) {
    return exact;
  }
  const wildcard = Object.entries(importsRecord)
    .filter(([key]) => key.startsWith('#') && key.includes('*'))
    .map(([key, value]) => ({ key, value, match: matchPackageSubpathPattern(key, moduleSpecifier) }))
    .filter((entry): entry is typeof entry & { readonly match: string } => entry.match != null)
    .sort((left, right) => comparePackagePatternKeys(left.key, right.key))[0];
  return wildcard == null ? null : substitutePackageTargetPattern(wildcard.value, wildcard.match);
}

/** Match TypeScript/Node package-export pattern precedence without depending on a private TypeScript helper. */
function comparePackagePatternKeys(left: string, right: string): number {
  const leftStar = left.indexOf('*');
  const rightStar = right.indexOf('*');
  const leftBaseLength = leftStar < 0 ? left.length : leftStar + 1;
  const rightBaseLength = rightStar < 0 ? right.length : rightStar + 1;
  if (leftBaseLength !== rightBaseLength) {
    return rightBaseLength - leftBaseLength;
  }
  if (leftStar < 0) {
    return 1;
  }
  if (rightStar < 0) {
    return -1;
  }
  return right.length - left.length;
}

function collectAdvertisedDeclarationTargets(value: unknown, insideTypes: boolean, targets: string[]): void {
  if (typeof value === 'string') {
    if (insideTypes || isDeclarationTarget(value)) {
      addStringTarget(targets, value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectAdvertisedDeclarationTargets(entry, insideTypes, targets);
    }
    return;
  }
  if (value == null || typeof value !== 'object') {
    return;
  }
  for (const [condition, target] of Object.entries(value)) {
    collectAdvertisedDeclarationTargets(
      target,
      insideTypes || condition === 'types' || condition.startsWith('types@'),
      targets,
    );
  }
}

function isDeclarationTarget(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.endsWith('.d.ts') || lower.endsWith('.d.mts') || lower.endsWith('.d.cts');
}

function addStringTarget(targets: string[], value: unknown): void {
  if (typeof value === 'string' && value.length > 0) {
    targets.push(value);
  }
}

function addPackageTypesTarget(targets: string[], value: unknown): void {
  if (typeof value !== 'string' || value.length === 0) {
    return;
  }
  addStringTarget(targets, value.startsWith('./') ? value : `./${value}`);
}

function matchPackageSubpathPattern(pattern: string, packageSubpath: string): string | null {
  const star = pattern.indexOf('*');
  if (star < 0 || pattern.indexOf('*', star + 1) >= 0) {
    return null;
  }
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  return packageSubpath.startsWith(prefix) && packageSubpath.endsWith(suffix)
    // TypeScript intentionally uses substring here. Preserve its swapped-bound behavior when prefix and suffix
    // overlap so the declarations we expose to the synthetic host match the target TypeScript will select.
    ? packageSubpath.substring(prefix.length, packageSubpath.length - suffix.length)
    : null;
}

function substitutePackageTargetPattern(value: unknown, match: string): unknown {
  if (typeof value === 'string') {
    return value.replaceAll('*', match);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => substitutePackageTargetPattern(entry, match));
  }
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      substitutePackageTargetPattern(entry, match),
    ]));
  }
  return value;
}

interface LinkedDeclarationTarget {
  readonly logicalPath: string;
  readonly physicalPath: string;
}

function linkedDeclarationTarget(
  logicalPackageRoot: string,
  physicalPackageRoot: string,
  target: string,
): LinkedDeclarationTarget | null {
  if (!target.startsWith('./') || target.includes('?') || target.includes('#')) {
    return null;
  }
  const logicalPath = path.resolve(logicalPackageRoot, target);
  const physicalPath = path.resolve(physicalPackageRoot, target);
  return isHostPathWithin(logicalPath, logicalPackageRoot) && isHostPathWithin(physicalPath, physicalPackageRoot)
    ? { logicalPath, physicalPath }
    : null;
}

function linkedDeclarationSelectionHost(
  host: ts.ModuleResolutionHost,
  targets: readonly LinkedDeclarationTarget[],
): ts.ModuleResolutionHost {
  const targetByKey = new Map<string, LinkedDeclarationTarget>();
  const syntheticDirectoryKeys = new Set<string>();
  for (const target of targets) {
    targetByKey.set(projectModuleHostPathKey(target.logicalPath), target);
    targetByKey.set(projectModuleHostPathKey(target.physicalPath), target);
    for (const targetPath of [target.logicalPath, target.physicalPath]) {
      let directory = path.dirname(targetPath);
      while (true) {
        syntheticDirectoryKeys.add(projectModuleHostPathKey(directory));
        const parent = path.dirname(directory);
        if (parent === directory) {
          break;
        }
        directory = parent;
      }
    }
  }
  return {
    ...host,
    fileExists: (fileName) => targetByKey.has(projectModuleHostPathKey(fileName)) || host.fileExists(fileName),
    directoryExists: (directoryName) => syntheticDirectoryKeys.has(projectModuleHostPathKey(directoryName))
      || host.directoryExists?.(directoryName)
      || false,
    realpath: (fileName) => targetByKey.get(projectModuleHostPathKey(fileName))?.physicalPath
      ?? host.realpath?.(fileName)
      ?? fileName,
  };
}

function declarationTargetForResolvedModule(
  targets: readonly LinkedDeclarationTarget[],
  resolved: ts.ResolvedModuleFull,
): LinkedDeclarationTarget | null {
  const originalPath = resolvedModuleOriginalPath(resolved);
  const keys = new Set([
    projectModuleHostPathKey(resolved.resolvedFileName),
    ...(originalPath == null ? [] : [projectModuleHostPathKey(originalPath)]),
  ]);
  return targets.find((target) =>
    keys.has(projectModuleHostPathKey(target.logicalPath))
    || keys.has(projectModuleHostPathKey(target.physicalPath))
  ) ?? null;
}

function resolvedModuleOriginalPath(resolved: ts.ResolvedModuleFull): string | null {
  const originalPath = (resolved as ts.ResolvedModuleFull & { readonly originalPath?: unknown }).originalPath;
  return typeof originalPath === 'string' && originalPath.length > 0 ? originalPath : null;
}

function readPackageOutputLayout(
  host: SemanticRuntimeProjectInputHost,
  packageRoot: string,
): PackageOutputLayoutReadResult {
  const configPath = path.join(packageRoot, 'tsconfig.json');
  if (!host.fileExists(configPath)) {
    return { kind: PackageOutputLayoutReadKind.Unavailable };
  }
  const layout: MutablePackageOutputLayout = {
    configPath,
    rootDir: null,
    declarationDir: null,
  };
  const configRead = readPackageOutputLayoutConfig(host, configPath, layout, new Set());
  if (configRead !== PackageOutputLayoutReadKind.Available) {
    return { kind: configRead };
  }
  if (layout.rootDir == null || layout.declarationDir == null) {
    return { kind: PackageOutputLayoutReadKind.Unsupported };
  }
  return {
    kind: PackageOutputLayoutReadKind.Available,
    layout: {
      configPath,
      rootDir: layout.rootDir,
      declarationDir: layout.declarationDir,
    },
  };
}

function readPackageOutputLayoutConfig(
  host: SemanticRuntimeProjectInputHost,
  configPath: string,
  layout: MutablePackageOutputLayout,
  active: Set<string>,
): PackageOutputLayoutReadKind {
  const configKey = projectModuleHostPathKey(configPath);
  if (active.has(configKey)) {
    return PackageOutputLayoutReadKind.Unsupported;
  }
  active.add(configKey);
  try {
    const text = host.readFile(configPath);
    if (text == null) {
      return PackageOutputLayoutReadKind.Unavailable;
    }
    const parsed = ts.parseConfigFileTextToJson(configPath, text);
    if (parsed.error != null || parsed.config == null || typeof parsed.config !== 'object') {
      return PackageOutputLayoutReadKind.Unavailable;
    }
    const config = parsed.config as Record<string, unknown>;
    const extendedConfigs = packageConfigExtendsPaths(config.extends, path.dirname(configPath));
    if (extendedConfigs == null) {
      return PackageOutputLayoutReadKind.Unsupported;
    }
    for (const extendedConfig of extendedConfigs) {
      if (!host.fileExists(extendedConfig)) {
        return PackageOutputLayoutReadKind.Unavailable;
      }
      const extendedRead = readPackageOutputLayoutConfig(host, extendedConfig, layout, active);
      if (extendedRead !== PackageOutputLayoutReadKind.Available) {
        return extendedRead;
      }
    }
    const compilerOptions = config.compilerOptions;
    if (compilerOptions != null && typeof compilerOptions === 'object' && !Array.isArray(compilerOptions)) {
      const options = compilerOptions as Record<string, unknown>;
      if (options.rootDirs != null || options.outFile != null) {
        return PackageOutputLayoutReadKind.Unsupported;
      }
      if (typeof options.rootDir === 'string') {
        layout.rootDir = path.resolve(path.dirname(configPath), options.rootDir);
      } else if (options.rootDir != null) {
        return PackageOutputLayoutReadKind.Unsupported;
      }
      if (typeof options.declarationDir === 'string') {
        layout.declarationDir = path.resolve(path.dirname(configPath), options.declarationDir);
      } else if (options.declarationDir != null) {
        return PackageOutputLayoutReadKind.Unsupported;
      }
    }
    return PackageOutputLayoutReadKind.Available;
  } finally {
    active.delete(configKey);
  }
}

function packageConfigExtendsPaths(value: unknown, configDirectory: string): readonly string[] | null {
  const values = value == null ? [] : Array.isArray(value) ? value : [value];
  const paths: string[] = [];
  for (const entry of values) {
    if (typeof entry !== 'string' || (!entry.startsWith('.') && !path.isAbsolute(entry))) {
      return null;
    }
    const resolved = path.resolve(configDirectory, entry);
    paths.push(path.extname(resolved).length === 0 ? `${resolved}.json` : resolved);
  }
  return paths;
}

function sourceCandidatesForDeclaration(
  layout: PackageOutputLayout,
  declarationPath: string,
): readonly string[] | null {
  const relativeDeclaration = path.relative(layout.declarationDir, declarationPath);
  if (relativeDeclaration.startsWith('..') || path.isAbsolute(relativeDeclaration)) {
    return null;
  }
  const declarationExtension = declarationFileExtension(relativeDeclaration);
  if (declarationExtension == null) {
    return null;
  }
  const sourceExtensions = SOURCE_EXTENSIONS_BY_DECLARATION_EXTENSION.get(declarationExtension);
  if (sourceExtensions == null) {
    return null;
  }
  const sourceBase = path.resolve(
    layout.rootDir,
    relativeDeclaration.slice(0, -declarationExtension.length),
  );
  return sourceExtensions.map((extension) => `${sourceBase}${extension}`);
}

function declarationFileExtension(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  return [...SOURCE_EXTENSIONS_BY_DECLARATION_EXTENSION.keys()].find((extension) =>
    lower.endsWith(extension)
  ) ?? null;
}

function sourceModuleExtension(fileName: string): ts.Extension {
  const extension = path.extname(fileName).toLowerCase();
  switch (extension) {
    case '.ts': return ts.Extension.Ts;
    case '.tsx': return ts.Extension.Tsx;
    case '.mts': return ts.Extension.Mts;
    case '.cts': return ts.Extension.Cts;
    default: throw new Error(`Unsupported linked package source extension '${extension}'.`);
  }
}

function unresolvedProjectModuleResolution(
  ordinary: ts.ResolvedModuleWithFailedLookupLocations,
  openingKind: ProjectModuleResolutionOpeningKind,
  moduleSpecifier: string,
  logicalPackageRoot: string,
  physicalPackageRoot: string,
  declarationPath: string | null = null,
  sourceCandidates: readonly string[] = [],
): ProjectModuleResolution {
  return new ProjectModuleResolution(
    ProjectModuleResolutionKind.Unresolved,
    ordinary,
    null,
    new ProjectModuleResolutionOpening(
      openingKind,
      moduleSpecifier,
      logicalPackageRoot,
      physicalPackageRoot,
      declarationPath,
      sourceCandidates,
    ),
  );
}
