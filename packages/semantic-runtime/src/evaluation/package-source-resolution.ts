import path from 'node:path';

import ts from 'typescript';

import type { AuthoredSourceBoundary } from '../boot/source-boundary.js';
import {
  type BootPackageManifest,
  isHostPathWithin,
} from '../boot/host-files.js';
import { stableKernelLocalHash } from '../kernel/handles.js';
import { normalizeModuleKey } from './module-graph.js';
import { isRelativeModuleSpecifier } from './module-specifier.js';
import {
  EvaluationPackageOriginIndex,
  evaluationModuleHostPathKey,
  type ResolvedEvaluationModuleOrigin,
  ResolvedEvaluationModuleSourceScope,
  ResolvedPackageInstance,
  ResolvedPackageOwner,
} from './package-origin.js';
import {
  candidateEvaluationModulePaths,
  EvaluationPackageSourceLayout,
  type EvaluationPackageSourceFileSystem,
  type EvaluationPackageSourceLayoutProfile,
  isAuthoredPackageSourceModule,
  isEvaluationModulePath,
} from './package-source-layout.js';

export {
  evaluationModuleHostPathKey,
  evaluationModuleKey,
  ResolvedEvaluationModuleOrigin,
  ResolvedEvaluationModuleSourceScope,
  ResolvedPackageInstance,
  ResolvedPackageOwner,
} from './package-origin.js';

export type { EvaluationPackageSourceFileSystem } from './package-source-layout.js';

export type EvaluationPackageSourceResolverProfile = EvaluationPackageSourceLayoutProfile;

export const enum EvaluationModuleSourceResolutionKind {
  Source = 'source',
  PackageBoundary = 'package-boundary',
  Unresolved = 'unresolved',
}

export interface EvaluationModuleSourceResolution {
  readonly kind: EvaluationModuleSourceResolutionKind;
  readonly sourcePath: string | null;
}

interface PackageRootCandidate {
  readonly rootDir: string;
  readonly locatorRootDir: string | null;
}

interface PackageManifestIdentity {
  readonly name: string;
  readonly version: string | null;
}

/**
 * Per-evaluation authority for package ownership, source mapping, containment, and logical module identity.
 *
 * This deliberately remains inside one exact project-input generation. Sharing it across sessions would require an
 * independent computation receipt/currentness contract.
 */
export class EvaluationPackageSourceResolver {
  private readonly packageRootByBareSpecifier = new Map<string, string | null>();
  private readonly originIndex: EvaluationPackageOriginIndex;
  private readonly sourceLayout: EvaluationPackageSourceLayout;

  constructor(
    private readonly rootDir: string,
    private readonly fileSystem: EvaluationPackageSourceFileSystem,
    private readonly preserveSymlinks: boolean,
    admitSourceShippedPackageEntrypoints: boolean,
    private readonly authoredSources: AuthoredSourceBoundary | null,
  ) {
    this.originIndex = new EvaluationPackageOriginIndex(rootDir, preserveSymlinks);
    this.sourceLayout = new EvaluationPackageSourceLayout(
      fileSystem,
      admitSourceShippedPackageEntrypoints,
    );
  }

  resolveTypeScriptModule(
    resolved: ts.ResolvedModuleFull | undefined,
    fromAbsolute: string,
    moduleSpecifier: string,
    authoredCompilerPathSource: boolean,
  ): EvaluationModuleSourceResolution {
    if (resolved == null) {
      return unresolvedEvaluationModuleSourceResolution();
    }
    const resolvedFileName = path.resolve(resolved.resolvedFileName);
    const physicalFileName = this.fileSystem.realpath(resolvedFileName);
    const fromPackageOrigin = this.originForModulePath(fromAbsolute);
    const expectsPackageIdentity = this.expectsPackageIdentity(resolved, resolvedFileName);
    const packageContext = expectsPackageIdentity || fromPackageOrigin != null;
    const packageInstance = packageContext
      ? this.resolvedPackageInstance(
          resolved,
          physicalFileName,
          fromAbsolute,
          moduleSpecifier,
          fromPackageOrigin,
        )
      : null;
    const packageSourceScope = packageInstance == null
      ? null
      : this.packageSourceScope(
          resolved,
          resolvedFileName,
          packageInstance,
          fromPackageOrigin,
        );

    if (expectsPackageIdentity && packageInstance == null) {
      return packageBoundaryEvaluationModuleSourceResolution();
    }

    if (isDeclarationFile(physicalFileName)) {
      if (packageInstance == null) {
        return unresolvedEvaluationModuleSourceResolution();
      }
      if (
        packageSourceScope === ResolvedEvaluationModuleSourceScope.ExternalDependency
        && !this.sourceLayout.shouldAdmitExternalSource(packageInstance.physicalRootDir)
      ) {
        return packageBoundaryEvaluationModuleSourceResolution();
      }
      const sourcePath = this.sourceLayout.sourceForLegacyDeclaration(
        physicalFileName,
        packageInstance.physicalRootDir,
      );
      if (
        sourcePath == null
        || !this.shouldAdmitResolvedSource(
          fromPackageOrigin,
          sourcePath,
          moduleSpecifier,
          packageInstance,
          packageSourceScope,
          false,
        )
      ) {
        return packageBoundaryEvaluationModuleSourceResolution();
      }
      const modulePath = this.packageSourceModuleIdentityPath(sourcePath, packageInstance);
      this.originIndex.remember(modulePath, sourcePath, packageInstance, packageSourceScope!);
      return resolvedEvaluationModuleSourceResolution(modulePath);
    }

    if (!isEvaluationModulePath(physicalFileName)) {
      return packageInstance == null
        ? unresolvedEvaluationModuleSourceResolution()
        : packageBoundaryEvaluationModuleSourceResolution();
    }

    if (!this.shouldAdmitResolvedSource(
      fromPackageOrigin,
      physicalFileName,
      moduleSpecifier,
      packageInstance,
      packageSourceScope,
      authoredCompilerPathSource,
    )) {
      return fromPackageOrigin != null || packageInstance != null
        ? packageBoundaryEvaluationModuleSourceResolution()
        : unresolvedEvaluationModuleSourceResolution();
    }
    const modulePath = this.preserveSymlinks ? resolvedFileName : physicalFileName;
    if (packageInstance != null) {
      this.originIndex.remember(modulePath, physicalFileName, packageInstance, packageSourceScope!);
    }
    return resolvedEvaluationModuleSourceResolution(modulePath);
  }

  probeRelativeModule(fromAbsolute: string, moduleSpecifier: string): string | null {
    const fromPackageOrigin = this.originForModulePath(fromAbsolute);
    const base = path.resolve(path.dirname(fromAbsolute), moduleSpecifier);
    for (const candidate of candidateEvaluationModulePaths(base)) {
      if (!isEvaluationModulePath(candidate) || !this.fileSystem.fileExists(candidate)) {
        continue;
      }
      const physicalFileName = this.fileSystem.realpath(candidate);
      const packageInstance = fromPackageOrigin != null
        && isHostPathWithin(physicalFileName, fromPackageOrigin.packageInstance.physicalRootDir)
        && moduleLocatorPathBelongsToPackageInstance(candidate, fromPackageOrigin.packageInstance)
        ? fromPackageOrigin.packageInstance
        : this.packageInstanceForPaths(candidate, physicalFileName, null);
      const packageSourceScope = packageInstance == null
        ? null
        : fromPackageOrigin?.packageInstance.instanceKey === packageInstance.instanceKey
          ? fromPackageOrigin.sourceScope
          : this.packageSourceScopeForPath(candidate, packageInstance, fromPackageOrigin);
      if (!this.shouldAdmitResolvedSource(
        fromPackageOrigin,
        physicalFileName,
        moduleSpecifier,
        packageInstance,
        packageSourceScope,
        false,
      )) {
        continue;
      }
      const modulePath = this.preserveSymlinks ? path.resolve(candidate) : physicalFileName;
      if (packageInstance != null) {
        this.originIndex.remember(modulePath, physicalFileName, packageInstance, packageSourceScope!);
      }
      return modulePath;
    }
    return null;
  }

  /** Read resolver-owned provenance without performing new host reads. */
  originForModulePath(modulePath: string): ResolvedEvaluationModuleOrigin | null {
    return this.originIndex.read(modulePath);
  }

  snapshotProfile(): EvaluationPackageSourceResolverProfile {
    return this.sourceLayout.snapshotProfile();
  }

  private expectsPackageIdentity(
    resolved: ts.ResolvedModuleFull,
    resolvedFileName: string,
  ): boolean {
    if (resolved.isExternalLibraryImport) {
      return true;
    }
    const originalPath = resolvedModuleOriginalPath(resolved);
    if (
      (originalPath != null && externalPackageRootForPath(originalPath) != null)
      || externalPackageRootForPath(resolvedFileName) != null
    ) {
      return true;
    }
    return resolved.packageId != null;
  }

  private packageSourceScope(
    resolved: ts.ResolvedModuleFull,
    resolvedFileName: string,
    packageInstance: ResolvedPackageInstance,
    fromPackageOrigin: ResolvedEvaluationModuleOrigin | null,
  ): ResolvedEvaluationModuleSourceScope {
    if (
      fromPackageOrigin?.sourceScope === ResolvedEvaluationModuleSourceScope.ExternalDependency
      || resolved.isExternalLibraryImport
      || externalPackageRootForPath(resolvedModuleOriginalPath(resolved) ?? resolvedFileName) != null
    ) {
      return ResolvedEvaluationModuleSourceScope.ExternalDependency;
    }
    return this.packageRootIsAuthored(packageInstance.physicalRootDir)
      ? ResolvedEvaluationModuleSourceScope.AuthoredProject
      : ResolvedEvaluationModuleSourceScope.ExternalDependency;
  }

  private packageSourceScopeForPath(
    locatorPath: string,
    packageInstance: ResolvedPackageInstance,
    fromPackageOrigin: ResolvedEvaluationModuleOrigin | null,
  ): ResolvedEvaluationModuleSourceScope {
    if (
      fromPackageOrigin?.sourceScope === ResolvedEvaluationModuleSourceScope.ExternalDependency
      || externalPackageRootForPath(locatorPath) != null
    ) {
      return ResolvedEvaluationModuleSourceScope.ExternalDependency;
    }
    return this.packageRootIsAuthored(packageInstance.physicalRootDir)
      ? ResolvedEvaluationModuleSourceScope.AuthoredProject
      : ResolvedEvaluationModuleSourceScope.ExternalDependency;
  }

  private packageRootIsAuthored(packageRoot: string): boolean {
    return this.authoredSources == null
      ? isHostPathWithin(packageRoot, this.rootDir)
      : this.authoredSources.contains(packageRoot);
  }

  private resolvedPackageInstance(
    resolved: ts.ResolvedModuleFull,
    physicalFileName: string,
    fromAbsolute: string,
    moduleSpecifier: string,
    fromPackageOrigin: ResolvedEvaluationModuleOrigin | null,
  ): ResolvedPackageInstance | null {
    if (
      fromPackageOrigin != null
      && isHostPathWithin(physicalFileName, fromPackageOrigin.packageInstance.physicalRootDir)
      && resolvedModuleBelongsToPackageInstance(resolved, fromPackageOrigin.packageInstance)
      && (
        isPackageConfinedPathSpecifier(moduleSpecifier)
        || moduleSpecifier.startsWith('#')
        || isPackageSelfReferenceSpecifier(moduleSpecifier, fromPackageOrigin.packageInstance.name)
      )
    ) {
      return fromPackageOrigin.packageInstance;
    }

    const packageId = resolved.packageId ?? null;
    const originalPath = resolvedModuleOriginalPath(resolved);
    const candidates: PackageRootCandidate[] = [];
    if (originalPath != null) {
      addPackageRootCandidatesForPath(candidates, originalPath, packageId, true);
    }
    addPackageRootCandidatesForPath(candidates, resolved.resolvedFileName, packageId, true);
    addPackageRootCandidatesForPath(candidates, physicalFileName, packageId, false);
    if (resolved.isExternalLibraryImport && !isPackageConfinedPathSpecifier(moduleSpecifier)) {
      const locatedRoot = this.externalPackageRootForBareSpecifier(fromAbsolute, moduleSpecifier);
      if (locatedRoot != null) {
        addPackageRootCandidate(candidates, locatedRoot, locatedRoot);
      }
    }
    return this.packageInstanceForCandidates(candidates, physicalFileName, packageId);
  }

  private packageInstanceForPaths(
    locatorPath: string,
    physicalFileName: string,
    packageId: ts.PackageId | null,
  ): ResolvedPackageInstance | null {
    const candidates: PackageRootCandidate[] = [];
    addPackageRootCandidatesForPath(candidates, locatorPath, packageId, true);
    addPackageRootCandidatesForPath(candidates, physicalFileName, packageId, false);
    return this.packageInstanceForCandidates(candidates, physicalFileName, packageId);
  }

  private packageInstanceForCandidates(
    candidates: readonly PackageRootCandidate[],
    physicalFileName: string,
    packageId: ts.PackageId | null,
  ): ResolvedPackageInstance | null {
    for (const candidate of candidates) {
      const manifest = this.sourceLayout.readPackageManifest(candidate.rootDir);
      const identity = packageManifestIdentity(manifest, packageId);
      if (identity == null) {
        continue;
      }
      const physicalRootDir = this.fileSystem.realpath(candidate.rootDir);
      if (!isHostPathWithin(physicalFileName, physicalRootDir)) {
        continue;
      }
      const ownerKey = resolvedPackageOwnerKey(identity, physicalRootDir);
      const owner = new ResolvedPackageOwner(
        ownerKey,
        identity.name,
        identity.version,
        physicalRootDir,
      );
      const locatorRootDir = this.preserveSymlinks && candidate.locatorRootDir != null
        ? path.resolve(candidate.locatorRootDir)
        : null;
      const locatorKey = locatorRootDir == null
        ? null
        : `path:${evaluationModuleHostPathKey(locatorRootDir)}`;
      return new ResolvedPackageInstance(
        locatorKey == null ? ownerKey : resolvedPackageLocatorInstanceKey(ownerKey, locatorKey),
        owner,
        locatorKey,
        locatorRootDir,
      );
    }
    return null;
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

  private findExternalPackageRoot(fromDirectory: string, packageName: string): string | null {
    let current = path.resolve(fromDirectory);
    const visitedKeys: string[] = [];
    while (true) {
      const cacheKey = `${evaluationModuleHostPathKey(current)}::${packageName}`;
      const cached = this.packageRootByBareSpecifier.get(cacheKey);
      if (cached !== undefined) {
        this.cachePackageRootSearchResults(visitedKeys, cached);
        return cached;
      }
      visitedKeys.push(cacheKey);
      const packageRoot = path.join(current, 'node_modules', packageName);
      if (this.fileSystem.fileExists(path.join(packageRoot, 'package.json'))) {
        this.cachePackageRootSearchResults(visitedKeys, packageRoot);
        return packageRoot;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        this.cachePackageRootSearchResults(visitedKeys, null);
        return null;
      }
      current = parent;
    }
  }

  private cachePackageRootSearchResults(keys: readonly string[], packageRoot: string | null): void {
    for (const key of keys) {
      this.packageRootByBareSpecifier.set(key, packageRoot);
    }
  }

  private shouldAdmitResolvedSource(
    fromPackageOrigin: ResolvedEvaluationModuleOrigin | null,
    resolvedFileName: string,
    moduleSpecifier: string,
    packageInstance: ResolvedPackageInstance | null,
    packageSourceScope: ResolvedEvaluationModuleSourceScope | null,
    authoredCompilerPathSource: boolean,
  ): boolean {
    const confinedPathSpecifier = isPackageConfinedPathSpecifier(moduleSpecifier);
    const packageImportSpecifier = moduleSpecifier.startsWith('#');
    const selfReferenceSpecifier = fromPackageOrigin != null
      && isPackageSelfReferenceSpecifier(moduleSpecifier, fromPackageOrigin.packageInstance.name);
    if (packageInstance == null) {
      if (fromPackageOrigin == null) {
        return true;
      }
      if (
        fromPackageOrigin.sourceScope === ResolvedEvaluationModuleSourceScope.AuthoredProject
        && this.sourceIsAuthored(resolvedFileName)
      ) {
        return true;
      }
      return authoredCompilerPathSource
        && !confinedPathSpecifier
        && !packageImportSpecifier
        && !selfReferenceSpecifier;
    }
    if (packageSourceScope === ResolvedEvaluationModuleSourceScope.AuthoredProject) {
      return this.sourceIsAuthored(resolvedFileName);
    }
    if (
      !authoredCompilerPathSource
      && !this.sourceLayout.shouldAdmitExternalSource(packageInstance.physicalRootDir)
    ) {
      return false;
    }
    if (!isAuthoredPackageSourceModule(resolvedFileName, packageInstance.physicalRootDir)) {
      return false;
    }
    if (fromPackageOrigin == null) {
      return !confinedPathSpecifier;
    }
    if (fromPackageOrigin.packageInstance.instanceKey === packageInstance.instanceKey) {
      return true;
    }
    if (selfReferenceSpecifier) {
      return false;
    }
    return !confinedPathSpecifier;
  }

  private sourceIsAuthored(fileName: string): boolean {
    return this.authoredSources == null
      ? isHostPathWithin(fileName, this.rootDir)
      : this.authoredSources.contains(fileName);
  }

  private packageSourceModuleIdentityPath(
    physicalFileName: string,
    packageInstance: ResolvedPackageInstance,
  ): string {
    if (!this.preserveSymlinks || packageInstance.locatorRootDir == null) {
      return physicalFileName;
    }
    return path.resolve(
      packageInstance.locatorRootDir,
      path.relative(packageInstance.physicalRootDir, physicalFileName),
    );
  }

}

export function compilerOptionsPathsCanResolve(
  compilerOptions: ts.CompilerOptions,
  moduleSpecifier: string,
): boolean {
  const paths = compilerOptions.paths;
  return paths != null
    && Object.keys(paths).some((pattern) => pathPatternMatchesSpecifier(pattern, moduleSpecifier));
}

function resolvedEvaluationModuleSourceResolution(sourcePath: string): EvaluationModuleSourceResolution {
  return { kind: EvaluationModuleSourceResolutionKind.Source, sourcePath };
}

function packageBoundaryEvaluationModuleSourceResolution(): EvaluationModuleSourceResolution {
  return { kind: EvaluationModuleSourceResolutionKind.PackageBoundary, sourcePath: null };
}

function unresolvedEvaluationModuleSourceResolution(): EvaluationModuleSourceResolution {
  return { kind: EvaluationModuleSourceResolutionKind.Unresolved, sourcePath: null };
}

function resolvedModuleOriginalPath(resolved: ts.ResolvedModuleFull): string | null {
  const originalPath = (resolved as ts.ResolvedModuleFull & { readonly originalPath?: unknown }).originalPath;
  return typeof originalPath === 'string' && originalPath.length > 0 ? originalPath : null;
}

function resolvedModuleBelongsToPackageInstance(
  resolved: ts.ResolvedModuleFull,
  packageInstance: ResolvedPackageInstance,
): boolean {
  const packageId = resolved.packageId;
  if (
    packageId != null
    && (
      packageId.name !== packageInstance.name
      || (packageInstance.version != null && packageId.version !== packageInstance.version)
    )
  ) {
    return false;
  }
  const locatorFileName = resolvedModuleOriginalPath(resolved) ?? resolved.resolvedFileName;
  return moduleLocatorPathBelongsToPackageInstance(locatorFileName, packageInstance);
}

function moduleLocatorPathBelongsToPackageInstance(
  locatorFileName: string,
  packageInstance: ResolvedPackageInstance,
): boolean {
  const selectedLocatorRoot = externalPackageRootForPath(locatorFileName);
  if (selectedLocatorRoot == null) {
    return true;
  }
  const selectedLocatorKey = evaluationModuleHostPathKey(selectedLocatorRoot);
  return [packageInstance.locatorRootDir, packageInstance.physicalRootDir].some((candidateRoot) =>
    candidateRoot != null && evaluationModuleHostPathKey(candidateRoot) === selectedLocatorKey
  );
}

function addPackageRootCandidatesForPath(
  candidates: PackageRootCandidate[],
  fileName: string,
  packageId: ts.PackageId | null,
  locator: boolean,
): void {
  const absoluteFileName = path.resolve(fileName);
  const nodeModulesRoot = externalPackageRootForPath(absoluteFileName);
  if (nodeModulesRoot != null) {
    addPackageRootCandidate(candidates, nodeModulesRoot, locator ? nodeModulesRoot : null);
  }
  const submoduleRoot = packageId == null
    ? null
    : packageRootForSubmodulePath(absoluteFileName, packageId.subModuleName);
  if (submoduleRoot != null) {
    addPackageRootCandidate(candidates, submoduleRoot, locator ? submoduleRoot : null);
  }
}

function addPackageRootCandidate(
  candidates: PackageRootCandidate[],
  rootDir: string,
  locatorRootDir: string | null,
): void {
  const normalizedRoot = path.resolve(rootDir);
  const normalizedLocator = locatorRootDir == null ? null : path.resolve(locatorRootDir);
  if (candidates.some((candidate) =>
    evaluationModuleHostPathKey(candidate.rootDir) === evaluationModuleHostPathKey(normalizedRoot)
    && (
      candidate.locatorRootDir == null
        ? normalizedLocator == null
        : normalizedLocator != null
          && evaluationModuleHostPathKey(candidate.locatorRootDir) === evaluationModuleHostPathKey(normalizedLocator)
    )
  )) {
    return;
  }
  candidates.push({ rootDir: normalizedRoot, locatorRootDir: normalizedLocator });
}

function packageRootForSubmodulePath(fileName: string, subModuleName: string): string | null {
  const normalizedFileName = normalizeModuleKey(path.resolve(fileName));
  const normalizedSubmodule = normalizeModuleKey(subModuleName).replace(/^\.\//, '');
  if (normalizedSubmodule.length === 0) {
    return null;
  }
  const suffix = `/${normalizedSubmodule}`;
  const comparableFileName = comparableHostPath(normalizedFileName);
  const comparableSuffix = comparableHostPath(suffix);
  return comparableFileName.endsWith(comparableSuffix)
    ? normalizedFileName.slice(0, -suffix.length)
    : null;
}

function packageManifestIdentity(
  manifest: BootPackageManifest | null,
  packageId: ts.PackageId | null,
): PackageManifestIdentity | null {
  if (manifest == null || typeof manifest.name !== 'string' || manifest.name.length === 0) {
    return null;
  }
  const version = typeof manifest.version === 'string' && manifest.version.length > 0
    ? manifest.version
    : packageId?.version ?? null;
  if (
    packageId != null
    && (
      manifest.name !== packageId.name
      || (
        typeof manifest.version === 'string'
        && manifest.version.length > 0
        && manifest.version !== packageId.version
      )
    )
  ) {
    return null;
  }
  return { name: manifest.name, version };
}

function resolvedPackageOwnerKey(identity: PackageManifestIdentity, physicalRootDir: string): string {
  return `resolved-package-owner:${stableKernelLocalHash(JSON.stringify([
    identity.name,
    identity.version,
    evaluationModuleHostPathKey(physicalRootDir),
  ]))}`;
}

function resolvedPackageLocatorInstanceKey(ownerKey: string, locatorKey: string): string {
  return `resolved-package-instance:${stableKernelLocalHash(JSON.stringify([ownerKey, locatorKey]))}`;
}

function isPackageConfinedPathSpecifier(moduleSpecifier: string): boolean {
  return isRelativeModuleSpecifier(moduleSpecifier)
    || moduleSpecifier.startsWith('/')
    || path.isAbsolute(moduleSpecifier);
}

function isPackageSelfReferenceSpecifier(moduleSpecifier: string, packageName: string): boolean {
  return moduleSpecifier === packageName || moduleSpecifier.startsWith(`${packageName}/`);
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

function pathPatternMatchesSpecifier(pattern: string, moduleSpecifier: string): boolean {
  const starIndex = pattern.indexOf('*');
  if (starIndex < 0) {
    return pattern === moduleSpecifier;
  }
  const prefix = pattern.slice(0, starIndex);
  const suffix = pattern.slice(starIndex + 1);
  return moduleSpecifier.startsWith(prefix) && moduleSpecifier.endsWith(suffix);
}

function isDeclarationFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.d.ts') || lower.endsWith('.d.mts') || lower.endsWith('.d.cts');
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
  const endIndex = packageName.startsWith('@') ? packageNameIndex + 2 : packageNameIndex + 1;
  return endIndex <= segments.length ? segments.slice(0, endIndex).join('/') : null;
}

function comparableHostPath(value: string): string {
  return ts.sys.useCaseSensitiveFileNames ? value : value.toLowerCase();
}
