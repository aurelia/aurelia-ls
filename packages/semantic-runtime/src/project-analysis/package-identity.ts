import path from 'node:path';

import ts from 'typescript';

import type { BootPackageManifest } from '../boot/host-files.js';
import { stableKernelLocalHash } from '../kernel/handles.js';

interface PackageManifestIdentity {
  readonly name: string;
  readonly version: string | null;
}

/** One physical package owner, independent from package-manager locator aliases. */
export class ResolvedPackageOwner {
  constructor(
    readonly ownerKey: string,
    readonly name: string,
    readonly version: string | null,
    readonly physicalRootDir: string,
  ) {}
}

/** One exact package installation identity selected by TypeScript module resolution. */
export class ResolvedPackageInstance {
  constructor(
    readonly instanceKey: string,
    readonly owner: ResolvedPackageOwner,
    /** Opaque locator identity. Path locators are prefixed with `path:`; future adapters may supply other forms. */
    readonly locatorKey: string | null,
    /** Logical package-manager root before symlink canonicalization, when logical identity is preserved. */
    readonly locatorRootDir: string | null,
  ) {}

  get name(): string {
    return this.owner.name;
  }

  get version(): string | null {
    return this.owner.version;
  }

  get physicalRootDir(): string {
    return this.owner.physicalRootDir;
  }
}

/** Case-aware absolute host key shared by project module-resolution consumers. */
export function projectModuleHostPathKey(fileName: string): string {
  const normalized = path.resolve(fileName).replace(/\\/g, '/');
  return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
}

/** Build one package instance only when manifest and TypeScript package identity agree. */
export function createResolvedPackageInstance(
  manifest: BootPackageManifest | null,
  packageId: ts.PackageId | null,
  physicalRootDir: string,
  locatorRootDir: string | null,
  preserveSymlinks: boolean,
): ResolvedPackageInstance | null {
  const identity = packageManifestIdentity(manifest, packageId);
  if (identity == null) {
    return null;
  }
  const physicalRoot = path.resolve(physicalRootDir);
  const ownerKey = resolvedPackageOwnerKey(identity, physicalRoot);
  const owner = new ResolvedPackageOwner(
    ownerKey,
    identity.name,
    identity.version,
    physicalRoot,
  );
  const logicalRoot = preserveSymlinks && locatorRootDir != null
    ? path.resolve(locatorRootDir)
    : null;
  const locatorKey = logicalRoot == null
    ? null
    : `path:${projectModuleHostPathKey(logicalRoot)}`;
  return new ResolvedPackageInstance(
    locatorKey == null ? ownerKey : resolvedPackageLocatorInstanceKey(ownerKey, locatorKey),
    owner,
    locatorKey,
    logicalRoot,
  );
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
    projectModuleHostPathKey(physicalRootDir),
  ]))}`;
}

function resolvedPackageLocatorInstanceKey(ownerKey: string, locatorKey: string): string {
  return `resolved-package-instance:${stableKernelLocalHash(JSON.stringify([ownerKey, locatorKey]))}`;
}
