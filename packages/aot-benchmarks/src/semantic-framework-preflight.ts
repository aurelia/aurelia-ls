import { createHash, type BinaryLike } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import type {
  FrameworkPackageEntryProvenance,
  PreparedFrameworkPackageGraph,
} from './framework-graph.js';

export const SEMANTIC_FRAMEWORK_PREFLIGHT_VERSION = 'aurelia-semantic-framework-preflight/v1' as const;

export interface SemanticFrameworkPreflightApplication {
  readonly applicationId: string;
  readonly root: string;
}

export interface SemanticFrameworkPreflightPackageEvidence {
  readonly packageName: string;
  readonly version: string;
  readonly semanticEntryPath: string;
  readonly semanticEntrySha256: string;
  readonly preparedEntrySha256: string;
  readonly resolutionIssuers: readonly string[];
  readonly identical: true;
}

export interface SemanticFrameworkPreflightApplicationEvidence {
  readonly applicationId: string;
  readonly applicationRoot: string;
  readonly packages: readonly SemanticFrameworkPreflightPackageEvidence[];
}

export interface SemanticFrameworkPreflightEvidence {
  readonly schemaVersion: typeof SEMANTIC_FRAMEWORK_PREFLIGHT_VERSION;
  readonly frameworkGraphFingerprint: string;
  readonly applications: readonly SemanticFrameworkPreflightApplicationEvidence[];
  readonly evidenceSha256: string;
}

interface WorkspacePackageResolution {
  readonly packageRoot: string;
  readonly entry: string;
  readonly entrySha256: string;
  readonly version: string;
}

interface MutablePackageEvidence {
  readonly resolution: WorkspacePackageResolution;
  readonly preparedEntrySha256: string;
  readonly issuers: Set<string>;
}

interface PackageManifest {
  readonly name: string;
  readonly version: string;
  readonly module: string;
  readonly exports?: unknown;
}

/**
 * Prove that semantic/static workspace resolution and the Vite package graph
 * see byte-identical production ESM roots. Resolution follows only the exact
 * internal dependency edges already verified by framework-graph preparation.
 */
export async function preflightSemanticFrameworkEntries(request: {
  readonly repositoryRoot: string;
  readonly applications: readonly SemanticFrameworkPreflightApplication[];
  readonly framework: PreparedFrameworkPackageGraph;
}): Promise<SemanticFrameworkPreflightEvidence> {
  const repositoryRoot = await realpath(path.resolve(request.repositoryRoot));
  const frameworkRoot = await realpath(request.framework.provenance.framework.repositoryRoot);
  assertInside(repositoryRoot, frameworkRoot, 'framework repository');

  const packages = packageProvenanceByName(request.framework.provenance.packages);
  const roots = [...request.framework.provenance.roots].sort((left, right) => left.localeCompare(right));
  for (const root of roots) {
    if (!packages.has(root)) throw new Error(`Prepared framework graph omits root package '${root}'.`);
  }
  const applications = normalizeApplications(repositoryRoot, request.applications);
  const applicationEvidence: SemanticFrameworkPreflightApplicationEvidence[] = [];
  for (const application of applications) {
    applicationEvidence.push(await preflightApplication({
      application,
      repositoryRoot,
      frameworkRoot,
      framework: request.framework,
      packages,
      roots,
    }));
  }

  const fingerprintInput = {
    schemaVersion: SEMANTIC_FRAMEWORK_PREFLIGHT_VERSION,
    frameworkGraphFingerprint: request.framework.provenance.graphFingerprint,
    applications: applicationEvidence,
  };
  return {
    ...fingerprintInput,
    evidenceSha256: sha256(JSON.stringify(fingerprintInput)),
  };
}

async function preflightApplication(input: {
  readonly application: { readonly applicationId: string; readonly root: string; readonly relativeRoot: string };
  readonly repositoryRoot: string;
  readonly frameworkRoot: string;
  readonly framework: PreparedFrameworkPackageGraph;
  readonly packages: ReadonlyMap<string, FrameworkPackageEntryProvenance>;
  readonly roots: readonly string[];
}): Promise<SemanticFrameworkPreflightApplicationEvidence> {
  const resolved = new Map<string, MutablePackageEvidence>();
  const queue: Array<{
    readonly packageName: string;
    readonly issuer: string;
    readonly issuerFile: string;
  }> = input.roots.map((packageName) => ({
    packageName,
    issuer: 'application-root',
    issuerFile: path.join(input.application.root, '__semantic-framework-preflight__.cjs'),
  }));

  while (queue.length > 0) {
    const request = queue.shift();
    if (request === undefined) continue;
    const expected = input.packages.get(request.packageName);
    if (expected === undefined) {
      throw new Error(`Prepared framework dependency '${request.packageName}' has no provenance entry.`);
    }
    const workspace = await resolveWorkspacePackage(request.packageName, request.issuerFile);
    assertInside(input.frameworkRoot, workspace.packageRoot, `${request.packageName} workspace package`);
    const semanticEntryPath = repositoryPath(input.repositoryRoot, workspace.entry);
    const preparedEntry = await realpath(input.framework.entryFor(request.packageName));
    const preparedEntrySha256 = sha256(await readFile(preparedEntry));

    if (workspace.version !== expected.version) {
      throw new Error(
        `${input.application.applicationId} resolves ${request.packageName}@${workspace.version}; `
        + `the prepared graph contains ${expected.version}.`,
      );
    }
    if (preparedEntrySha256 !== expected.installedEsmSha256) {
      throw new Error(`Prepared framework entry changed after graph verification for ${request.packageName}.`);
    }
    if (workspace.entrySha256 !== preparedEntrySha256) {
      throw new Error(
        `${input.application.applicationId} resolves different semantic and Vite bytes for ${request.packageName}: `
        + `${workspace.entrySha256} != ${preparedEntrySha256}.`,
      );
    }

    const previous = resolved.get(request.packageName);
    if (previous != null) {
      if (previous.resolution.entry !== workspace.entry) {
        throw new Error(
          `${input.application.applicationId} resolves split copies of ${request.packageName}: `
          + `${repositoryPath(input.repositoryRoot, previous.resolution.entry)} and ${semanticEntryPath}.`,
        );
      }
      previous.issuers.add(request.issuer);
      continue;
    }

    resolved.set(request.packageName, {
      resolution: workspace,
      preparedEntrySha256,
      issuers: new Set([request.issuer]),
    });
    for (const dependency of expected.internalDependencies) {
      queue.push({
        packageName: dependency,
        issuer: request.packageName,
        issuerFile: workspace.entry,
      });
    }
  }

  const packageEvidence = [...resolved]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([packageName, evidence]): SemanticFrameworkPreflightPackageEvidence => ({
      packageName,
      version: evidence.resolution.version,
      semanticEntryPath: repositoryPath(input.repositoryRoot, evidence.resolution.entry),
      semanticEntrySha256: evidence.resolution.entrySha256,
      preparedEntrySha256: evidence.preparedEntrySha256,
      resolutionIssuers: [...evidence.issuers].sort((left, right) => left.localeCompare(right)),
      identical: true,
    }));
  if (packageEvidence.length !== input.packages.size) {
    const missing = [...input.packages.keys()].filter((name) => !resolved.has(name));
    throw new Error(`Prepared framework packages are unreachable from its roots: ${missing.join(', ')}.`);
  }
  return {
    applicationId: input.application.applicationId,
    applicationRoot: input.application.relativeRoot,
    packages: packageEvidence,
  };
}

async function resolveWorkspacePackage(packageName: string, issuerFile: string): Promise<WorkspacePackageResolution> {
  let resolvedRequireEntry: string;
  try {
    resolvedRequireEntry = createRequire(issuerFile).resolve(packageName);
  } catch (error) {
    throw new Error(`Workspace resolution from '${issuerFile}' cannot resolve '${packageName}'.`, { cause: error });
  }
  const packageRoot = await findPackageRoot(resolvedRequireEntry, packageName);
  const manifestPath = path.join(packageRoot, 'package.json');
  const manifest = readManifest(await readFile(manifestPath, 'utf8'), manifestPath);
  const entry = await realpath(path.resolve(packageRoot, productionEsmEntry(manifest)));
  assertInside(packageRoot, entry, `${packageName} production ESM entry`);
  return {
    packageRoot,
    entry,
    entrySha256: sha256(await readFile(entry)),
    version: manifest.version,
  };
}

async function findPackageRoot(resolvedEntry: string, packageName: string): Promise<string> {
  let current = path.dirname(await realpath(resolvedEntry));
  for (;;) {
    const manifestPath = path.join(current, 'package.json');
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { readonly name?: unknown };
      if (manifest.name !== packageName) {
        throw new Error(
          `Resolved entry for '${packageName}' crossed package boundary '${String(manifest.name)}' at '${current}'.`,
        );
      }
      return realpath(current);
    } catch (error) {
      if (!hasCode(error, 'ENOENT')) throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`Cannot find package root for '${packageName}' from '${resolvedEntry}'.`);
    current = parent;
  }
}

function readManifest(text: string, manifestPath: string): PackageManifest {
  const value = JSON.parse(text) as Partial<PackageManifest>;
  if (
    typeof value.name !== 'string'
    || typeof value.version !== 'string'
    || typeof value.module !== 'string'
  ) {
    throw new Error(`Workspace framework manifest '${manifestPath}' has no exact package/module identity.`);
  }
  return value as PackageManifest;
}

function productionEsmEntry(manifest: PackageManifest): string {
  const moduleEntry = normalizePackagePath(manifest.module, `${manifest.name} module`);
  const exportEntry = rootImportExport(manifest.exports);
  if (exportEntry != null && normalizePackagePath(exportEntry, `${manifest.name} exports.import`) !== moduleEntry) {
    throw new Error(`${manifest.name} module and production import export disagree.`);
  }
  if (!moduleEntry.startsWith('dist/esm/')) {
    throw new Error(`${manifest.name} production module '${moduleEntry}' is not a built dist ESM entry.`);
  }
  return moduleEntry;
}

function rootImportExport(exportsValue: unknown): string | null {
  if (!isRecord(exportsValue)) return null;
  const root = exportsValue['.'];
  if (typeof root === 'string') return root;
  if (!isRecord(root)) return null;
  return typeof root.import === 'string' ? root.import : null;
}

function normalizeApplications(
  repositoryRoot: string,
  applications: readonly SemanticFrameworkPreflightApplication[],
): readonly { readonly applicationId: string; readonly root: string; readonly relativeRoot: string }[] {
  const ids = new Set<string>();
  return applications.map((application) => {
    if (application.applicationId.trim().length === 0 || ids.has(application.applicationId)) {
      throw new Error(`Semantic framework preflight application id '${application.applicationId}' is empty or repeated.`);
    }
    ids.add(application.applicationId);
    const root = path.resolve(application.root);
    return {
      applicationId: application.applicationId,
      root,
      relativeRoot: repositoryPath(repositoryRoot, root),
    };
  }).sort((left, right) => left.applicationId.localeCompare(right.applicationId));
}

function packageProvenanceByName(
  entries: readonly FrameworkPackageEntryProvenance[],
): ReadonlyMap<string, FrameworkPackageEntryProvenance> {
  const packages = new Map<string, FrameworkPackageEntryProvenance>();
  for (const entry of entries) {
    if (packages.has(entry.packageName)) throw new Error(`Prepared graph repeats '${entry.packageName}'.`);
    packages.set(entry.packageName, entry);
  }
  return packages;
}

function repositoryPath(repositoryRoot: string, absolutePath: string): string {
  assertInside(repositoryRoot, absolutePath, 'persisted semantic framework path');
  const value = path.relative(repositoryRoot, absolutePath).replaceAll('\\', '/');
  return value.length === 0 ? '.' : value;
}

function normalizePackagePath(value: string, label: string): string {
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//u, '');
  if (
    normalized.length === 0
    || path.isAbsolute(normalized)
    || normalized === '..'
    || normalized.startsWith('../')
    || normalized.includes('/../')
  ) {
    throw new Error(`${label} '${value}' escapes its package.`);
  }
  return normalized;
}

function assertInside(root: string, candidate: string, label: string): void {
  const displacement = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    displacement === '..'
    || displacement.startsWith('../')
    || displacement.startsWith('..\\')
    || path.isAbsolute(displacement)
  ) {
    throw new Error(`${label} '${candidate}' is outside '${root}'.`);
  }
}

function sha256(value: BinaryLike): string {
  return createHash('sha256').update(value).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
