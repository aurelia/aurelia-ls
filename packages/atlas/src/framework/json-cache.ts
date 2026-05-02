import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import ts from "typescript";

import {
  repoRelativePath,
  toPosixPath,
  type SourceProject,
} from "../source/index.js";

/** Stable schema id for one package-scoped framework JSON cache chunk. */
export const FRAMEWORK_JSON_CACHE_PACKAGE_SCHEMA_VERSION =
  "atlas.framework-json-cache.package@1";

/** Stable id for the framework discovery entity catalog cache family. */
export const FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_ID =
  "framework.discovery.entity-catalog";

/** Stable id for evaluator-derived framework bundle admission cache chunks. */
export const FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_ID =
  "framework.discovery.bundle-admissions";

/** Source fingerprint for one admitted package. */
export interface FrameworkJsonCachePackageFingerprint {
  /** Package id from the Atlas source admission contract. */
  readonly packageId: string;
  /** Package name from package.json or admission metadata. */
  readonly packageName: string;
  /** Package root path from the source admission summary. */
  readonly rootPath: string;
  /** Package tsconfig path from the source admission summary. */
  readonly tsconfigPath: string;
  /** Number of source files owned by the package in the current Program. */
  readonly sourceFileCount: number;
  /** Content hash over tsconfig text plus owned source file repo paths and text. */
  readonly contentHash: string;
}

/** Metadata that makes one package cache chunk safe to hydrate. */
export interface FrameworkJsonCachePackageHeader {
  /** Cache schema version. */
  readonly schemaVersion: typeof FRAMEWORK_JSON_CACHE_PACKAGE_SCHEMA_VERSION;
  /** Cache family id, for example framework.discovery.entity-catalog. */
  readonly familyId: string;
  /** Family-local schema or logic version supplied by the caller. */
  readonly familyVersion: string;
  /** Hash of the producer code that wrote this chunk. */
  readonly producerVersion: string;
  /** TypeScript runtime version used to compute checker-derived fields. */
  readonly typescriptVersion: string;
  /** Absolute repository root. Invalidates moved checkouts because rows may include absolute paths. */
  readonly repoRoot: string;
  /** SourceProject identity string for broad working-tree basis checks. */
  readonly sourceIdentity: string;
  /** Package fingerprint that must match the live Program before hydration. */
  readonly packageFingerprint: FrameworkJsonCachePackageFingerprint;
  /** Additional package fingerprints for rows that embed cross-package joins. */
  readonly dependencyFingerprints: readonly FrameworkJsonCachePackageFingerprint[];
  /** ISO timestamp for observability only. */
  readonly createdAt: string;
}

/** One package-scoped framework JSON cache chunk. */
export interface FrameworkJsonCachePackageFile<TPayload>
  extends FrameworkJsonCachePackageHeader {
  /** Serializable family payload. Never contains TypeScript objects. */
  readonly payload: TPayload;
}

/** Options for reading or writing one framework JSON cache package chunk. */
export interface FrameworkJsonCachePackageOptions {
  /** Cache family id. */
  readonly familyId: string;
  /** Family-local schema version. */
  readonly familyVersion: string;
  /** Producer version, usually created with frameworkJsonCacheProducerVersion. */
  readonly producerVersion: string;
  /** Package id whose atoms are stored in this chunk. */
  readonly packageId: string;
  /** Additional package ids whose source changes should invalidate this chunk. */
  readonly dependencyPackageIds?: readonly string[];
}

const packageFingerprintByProject = new WeakMap<
  SourceProject,
  Map<string, FrameworkJsonCachePackageFingerprint | null>
>();
const producerVersionByKey = new Map<string, string>();

/** Create a producer version from explicit semantic intent plus the compiled module that owns the producer. */
export function frameworkJsonCacheProducerVersion(
  /** Cache family id. */
  familyId: string,
  /** Human-chosen semantic version for the family writer. */
  semanticVersion: string,
  /** import.meta.url of the module that owns the producing logic. */
  moduleUrl: string,
): string {
  const key = `${familyId}\0${semanticVersion}\0${moduleUrl}`;
  const cached = producerVersionByKey.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const modulePath = fileURLToPath(moduleUrl);
  const moduleHash = fileContentHash(modulePath);
  const version = `${semanticVersion}:${moduleHash}`;
  producerVersionByKey.set(key, version);
  return version;
}

/** Create a producer version from explicit semantic intent plus every compiled module that participates in production. */
export function frameworkJsonCacheCompositeProducerVersion(
  /** Cache family id. */
  familyId: string,
  /** Human-chosen semantic version for the family writer. */
  semanticVersion: string,
  /** import.meta.url values or relative module URLs for modules that participate in producing this cache family. */
  moduleUrls: readonly string[],
): string {
  const key = `${familyId}\0${semanticVersion}\0${moduleUrls.join("\0")}`;
  const cached = producerVersionByKey.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const hash = createHash("sha256");
  for (const moduleUrl of moduleUrls) {
    const modulePath = fileURLToPath(moduleUrl);
    hash.update(modulePath);
    hash.update("\0");
    hash.update(fileContentHash(modulePath));
    hash.update("\0");
  }
  const version = `${semanticVersion}:sha256:${hash.digest("hex")}`;
  producerVersionByKey.set(key, version);
  return version;
}

/** Read one package-scoped framework JSON cache payload if all invalidation keys still match. */
export function readFrameworkJsonCachePackage<TPayload>(
  /** Hot source project used for package fingerprints. */
  sourceProject: SourceProject,
  /** Cache chunk selection and validation keys. */
  options: FrameworkJsonCachePackageOptions,
): TPayload | undefined {
  const cachePath = frameworkJsonCachePackagePath(
    sourceProject,
    options.familyId,
    options.packageId,
  );
  if (!existsSync(cachePath)) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(readFileSync(cachePath, "utf8")) as Partial<
      FrameworkJsonCachePackageFile<TPayload>
    >;
    if (!frameworkJsonCacheCheapHeaderMatches(sourceProject, options, parsed)) {
      return undefined;
    }
    const fingerprint = frameworkJsonCachePackageFingerprint(
      sourceProject,
      options.packageId,
    );
    if (fingerprint === null) {
      return undefined;
    }
    const dependencyFingerprints = dependencyFingerprintsForOptions(
      sourceProject,
      options,
    );
    if (dependencyFingerprints === null) {
      return undefined;
    }
    if (
      !frameworkJsonCacheHeaderMatches(
        sourceProject,
        options,
        fingerprint,
        dependencyFingerprints,
        parsed,
      )
    ) {
      return undefined;
    }
    return parsed.payload as TPayload;
  } catch {
    return undefined;
  }
}

/** Atomically write one package-scoped framework JSON cache payload. */
export function writeFrameworkJsonCachePackage<TPayload>(
  /** Hot source project used for package fingerprints. */
  sourceProject: SourceProject,
  /** Cache chunk selection and validation keys. */
  options: FrameworkJsonCachePackageOptions,
  /** Serializable payload to store. */
  payload: TPayload,
): void {
  const fingerprint = frameworkJsonCachePackageFingerprint(
    sourceProject,
    options.packageId,
  );
  if (fingerprint === null) {
    return;
  }
  const dependencyFingerprints = dependencyFingerprintsForOptions(
    sourceProject,
    options,
  );
  if (dependencyFingerprints === null) {
    return;
  }
  const cachePath = frameworkJsonCachePackagePath(
    sourceProject,
    options.familyId,
    options.packageId,
  );
  const cacheFile: FrameworkJsonCachePackageFile<TPayload> = {
    schemaVersion: FRAMEWORK_JSON_CACHE_PACKAGE_SCHEMA_VERSION,
    familyId: options.familyId,
    familyVersion: options.familyVersion,
    producerVersion: options.producerVersion,
    typescriptVersion: ts.version,
    repoRoot: sourceProject.repoRoot,
    sourceIdentity: sourceProject.snapshot().identity,
    packageFingerprint: fingerprint,
    dependencyFingerprints,
    createdAt: new Date().toISOString(),
    payload,
  };
  mkdirSync(dirname(cachePath), { recursive: true });
  const tempPath = `${cachePath}.${process.pid}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(cacheFile, null, 2)}\n`);
  renameSync(tempPath, cachePath);
}

/** Remove all persisted chunks for one framework cache family. */
export function removeFrameworkJsonCacheFamily(
  /** Hot source project that owns the repository root. */
  sourceProject: SourceProject,
  /** Cache family id to remove. */
  familyId: string,
): void {
  rmSync(frameworkJsonCacheFamilyDir(sourceProject, familyId), {
    force: true,
    recursive: true,
  });
}

/** Return the package fingerprint used by framework JSON cache validation. */
export function frameworkJsonCachePackageFingerprint(
  /** Hot source project. */
  sourceProject: SourceProject,
  /** Package id to fingerprint. */
  packageId: string,
): FrameworkJsonCachePackageFingerprint | null {
  const cache =
    packageFingerprintByProject.get(sourceProject) ??
    new Map<string, FrameworkJsonCachePackageFingerprint | null>();
  if (!packageFingerprintByProject.has(sourceProject)) {
    packageFingerprintByProject.set(sourceProject, cache);
  }
  if (cache.has(packageId)) {
    return cache.get(packageId) ?? null;
  }
  const fingerprint = computeFrameworkJsonCachePackageFingerprint(
    sourceProject,
    packageId,
  );
  cache.set(packageId, fingerprint);
  return fingerprint;
}

function frameworkJsonCacheHeaderMatches<TPayload>(
  sourceProject: SourceProject,
  options: FrameworkJsonCachePackageOptions,
  fingerprint: FrameworkJsonCachePackageFingerprint,
  dependencyFingerprints: readonly FrameworkJsonCachePackageFingerprint[],
  parsed: Partial<FrameworkJsonCachePackageFile<TPayload>>,
): boolean {
  return (
    parsed.schemaVersion === FRAMEWORK_JSON_CACHE_PACKAGE_SCHEMA_VERSION &&
    parsed.familyId === options.familyId &&
    parsed.familyVersion === options.familyVersion &&
    parsed.producerVersion === options.producerVersion &&
    parsed.typescriptVersion === ts.version &&
    parsed.repoRoot === sourceProject.repoRoot &&
    parsed.sourceIdentity === sourceProject.snapshot().identity &&
    packageFingerprintMatches(parsed.packageFingerprint, fingerprint) &&
    packageFingerprintListsMatch(
      parsed.dependencyFingerprints,
      dependencyFingerprints,
    ) &&
    parsed.payload !== undefined
  );
}

function frameworkJsonCacheCheapHeaderMatches<TPayload>(
  sourceProject: SourceProject,
  options: FrameworkJsonCachePackageOptions,
  parsed: Partial<FrameworkJsonCachePackageFile<TPayload>>,
): boolean {
  return (
    parsed.schemaVersion === FRAMEWORK_JSON_CACHE_PACKAGE_SCHEMA_VERSION &&
    parsed.familyId === options.familyId &&
    parsed.familyVersion === options.familyVersion &&
    parsed.producerVersion === options.producerVersion &&
    parsed.typescriptVersion === ts.version &&
    parsed.repoRoot === sourceProject.repoRoot &&
    parsed.sourceIdentity === sourceProject.snapshot().identity &&
    parsed.payload !== undefined
  );
}

function packageFingerprintMatches(
  left: FrameworkJsonCachePackageFingerprint | undefined,
  right: FrameworkJsonCachePackageFingerprint,
): boolean {
  return (
    left !== undefined &&
    left.packageId === right.packageId &&
    left.packageName === right.packageName &&
    left.rootPath === right.rootPath &&
    left.tsconfigPath === right.tsconfigPath &&
    left.sourceFileCount === right.sourceFileCount &&
    left.contentHash === right.contentHash
  );
}

function packageFingerprintListsMatch(
  left: readonly FrameworkJsonCachePackageFingerprint[] | undefined,
  right: readonly FrameworkJsonCachePackageFingerprint[],
): boolean {
  return (
    left !== undefined &&
    left.length === right.length &&
    left.every((entry, index) => {
      const expected = right[index];
      return (
        expected !== undefined && packageFingerprintMatches(entry, expected)
      );
    })
  );
}

function dependencyFingerprintsForOptions(
  sourceProject: SourceProject,
  options: FrameworkJsonCachePackageOptions,
): readonly FrameworkJsonCachePackageFingerprint[] | null {
  const packageIds = uniqueStrings(
    (options.dependencyPackageIds ?? []).filter(
      (packageId) => packageId !== options.packageId,
    ),
  );
  const sortedPackageIds = [...packageIds].sort((left, right) =>
    left.localeCompare(right),
  );
  const fingerprints: FrameworkJsonCachePackageFingerprint[] = [];
  for (const packageId of sortedPackageIds) {
    const fingerprint = frameworkJsonCachePackageFingerprint(
      sourceProject,
      packageId,
    );
    if (fingerprint === null) {
      return null;
    }
    fingerprints.push(fingerprint);
  }
  return fingerprints;
}

function computeFrameworkJsonCachePackageFingerprint(
  sourceProject: SourceProject,
  packageId: string,
): FrameworkJsonCachePackageFingerprint | null {
  const summary = sourceProject
    .snapshot()
    .summary.packages.find((entry) => entry.id === packageId);
  if (summary === undefined) {
    return null;
  }
  const hash = createHash("sha256");
  hash.update(`package:${packageId}\n`);
  hash.update(`packageName:${summary.packageName}\n`);
  hash.update(`rootPath:${summary.rootPath}\n`);
  hash.update(`tsconfigPath:${summary.tsconfigPath}\n`);
  hash.update(
    `tsconfigHash:${repoFileContentHash(
      sourceProject.repoRoot,
      summary.tsconfigPath,
    )}\n`,
  );
  const sourceFiles = sourceProject
    .ownedSourceFiles()
    .filter(
      (sourceFile) =>
        sourceProject.packageForFileName(sourceFile.fileName)?.id === packageId,
    )
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
  for (const sourceFile of sourceFiles) {
    const repoPath =
      repoRelativePath(sourceProject.repoRoot, sourceFile.fileName) ??
      toPosixPath(path.resolve(sourceFile.fileName));
    hash.update(`file:${repoPath}\n`);
    hash.update(sourceFile.text);
    hash.update("\n");
  }
  return {
    packageId,
    packageName: summary.packageName,
    rootPath: summary.rootPath,
    tsconfigPath: summary.tsconfigPath,
    sourceFileCount: sourceFiles.length,
    contentHash: `sha256:${hash.digest("hex")}`,
  };
}

function frameworkJsonCachePackagePath(
  sourceProject: SourceProject,
  familyId: string,
  packageId: string,
): string {
  return path.join(
    frameworkJsonCacheFamilyDir(sourceProject, familyId),
    `${safeCachePathSegment(packageId)}.json`,
  );
}

function frameworkJsonCacheFamilyDir(
  sourceProject: SourceProject,
  familyId: string,
): string {
  return path.join(
    sourceProject.repoRoot,
    ".temp",
    "atlas",
    "cache",
    "framework",
    safeCachePathSegment(familyId),
  );
}

function safeCachePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/gu, "_");
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function fileContentHash(filePath: string): string {
  try {
    return `sha256:${createHash("sha256")
      .update(readFileSync(filePath))
      .digest("hex")}`;
  } catch {
    return "sha256:unreadable";
  }
}

function repoFileContentHash(repoRoot: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(repoRoot, filePath);
  return fileContentHash(absolutePath);
}
