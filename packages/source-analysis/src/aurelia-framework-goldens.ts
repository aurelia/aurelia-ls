import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type {
  ExportChainKind,
  ExportsOutput,
  PackageExportRecord,
  PackageExportsSummary,
} from './exports-contract.js';
import { createLiveQueryKernel } from './live-query/runtime.js';

export const AURELIA_FRAMEWORK_GOLDEN_SCHEMA_VERSION = 'v0alpha1' as const;
export const AURELIA_FRAMEWORK_GOLDEN_SUITE_ID = 'aurelia-framework-exports' as const;
export const DEFAULT_AURELIA_FRAMEWORK_REPO_ENV_VAR = 'AURELIA_FRAMEWORK_REPO' as const;

const DEFAULT_AURELIA_FRAMEWORK_REPO_CANDIDATES = [
  './aurelia',
] as const;

export interface AureliaFrameworkGoldenRow {
  readonly exportedName: string;
  readonly originalName: string;
  readonly declarationName: string | null;
  readonly declarationFile: string | null;
  readonly faceKind: string;
  readonly faceKinds: readonly string[];
  readonly typeOnly: boolean;
  readonly typeExported: boolean;
  readonly valueExported: boolean;
  readonly namespaceExport: boolean;
  readonly chainKinds: readonly ExportChainKind[];
}

export interface AureliaFrameworkGoldenPackageSummary {
  readonly exportCount: number;
  readonly typeOnlyExportCount: number;
  readonly valueExportCount: number;
  readonly mergedExportCount: number;
}

export interface AureliaFrameworkGoldenPackage {
  readonly schemaVersion: typeof AURELIA_FRAMEWORK_GOLDEN_SCHEMA_VERSION;
  readonly packageName: string;
  readonly packageDir: string;
  readonly analysisBasis: 'source' | 'types';
  readonly analysisEntrypoint: string;
  readonly summary: AureliaFrameworkGoldenPackageSummary;
  readonly exports: readonly AureliaFrameworkGoldenRow[];
}

export interface AureliaFrameworkGoldenManifestPackage {
  readonly packageName: string;
  readonly file: string;
  readonly exportCount: number;
}

export interface AureliaFrameworkGoldenManifest {
  readonly schemaVersion: typeof AURELIA_FRAMEWORK_GOLDEN_SCHEMA_VERSION;
  readonly suiteId: typeof AURELIA_FRAMEWORK_GOLDEN_SUITE_ID;
  readonly packageCount: number;
  readonly exportCount: number;
  readonly packages: readonly AureliaFrameworkGoldenManifestPackage[];
}

export interface AureliaFrameworkGoldenSuite {
  readonly manifest: AureliaFrameworkGoldenManifest;
  readonly packages: readonly AureliaFrameworkGoldenPackage[];
}

export interface ResolveAureliaFrameworkRepoPathOptions {
  readonly repoPath?: string;
  readonly envVar?: string;
  readonly searchFrom?: string;
  readonly fallbackCandidates?: readonly string[];
}

export interface CollectAureliaFrameworkGoldensOptions {
  readonly repoPath: string;
  readonly packageNames?: readonly string[] | null;
}

export function resolveAureliaFrameworkRepoPath(
  options: ResolveAureliaFrameworkRepoPathOptions = {},
): string | null {
  const envVar = options.envVar ?? DEFAULT_AURELIA_FRAMEWORK_REPO_ENV_VAR;
  const searchFrom = resolve(options.searchFrom ?? process.cwd());
  const explicitRepoPath = options.repoPath
    ?? normalizeConfiguredRepoPath(process.env[envVar]);
  if (explicitRepoPath) {
    const resolved = resolve(searchFrom, explicitRepoPath);
    return isAureliaMonorepoRoot(resolved) ? resolved : null;
  }

  const fallbackCandidates = options.fallbackCandidates ?? DEFAULT_AURELIA_FRAMEWORK_REPO_CANDIDATES;
  for (const candidate of fallbackCandidates) {
    const resolved = resolve(searchFrom, candidate);
    if (isAureliaMonorepoRoot(resolved)) {
      return resolved;
    }
  }

  return null;
}

export function isAureliaFrameworkPackageName(
  packageName: string,
): boolean {
  return packageName === 'aurelia' || packageName.startsWith('@aurelia/');
}

export function packageNameToGoldenFileName(
  packageName: string,
): string {
  const baseName = packageName
    .replace(/^@/, '')
    .replace(/\//g, '__');
  return `${baseName}.golden.json`;
}

export function collectAureliaFrameworkGoldens(
  options: CollectAureliaFrameworkGoldensOptions,
): AureliaFrameworkGoldenSuite {
  const repoPath = resolve(options.repoPath);
  const kernel = createLiveQueryKernel({ repoPath });
  const outputs = kernel.loadOutputs();
  return collectFromExportsOutput(outputs.exports, options.packageNames);
}

export function collectFromExportsOutput(
  output: ExportsOutput,
  packageNames: readonly string[] | null | undefined = null,
): AureliaFrameworkGoldenSuite {
  const explicitPackages = packageNames ? new Set(packageNames) : null;
  const selectedPackages = output.packages
    .filter((pkg) => explicitPackages
      ? explicitPackages.has(pkg.package_name)
      : isAureliaFrameworkPackageName(pkg.package_name))
    .sort((left, right) => left.package_name.localeCompare(right.package_name));

  const rowsByPackage = groupExportRowsByPackage(output.exports);
  const normalizedPackages = selectedPackages.map((pkg) =>
    normalizePackage(pkg, rowsByPackage.get(pkg.package_name) ?? []));
  const manifestPackages = normalizedPackages.map((pkg) => ({
    packageName: pkg.packageName,
    file: packageNameToGoldenFileName(pkg.packageName),
    exportCount: pkg.summary.exportCount,
  }));

  return {
    manifest: {
      schemaVersion: AURELIA_FRAMEWORK_GOLDEN_SCHEMA_VERSION,
      suiteId: AURELIA_FRAMEWORK_GOLDEN_SUITE_ID,
      packageCount: normalizedPackages.length,
      exportCount: normalizedPackages.reduce((sum, pkg) => sum + pkg.summary.exportCount, 0),
      packages: manifestPackages,
    },
    packages: normalizedPackages,
  };
}

function normalizeConfiguredRepoPath(
  rawPath: string | undefined,
): string | null {
  if (!rawPath) {
    return null;
  }
  return rawPath.trim().length > 0 ? rawPath.trim() : null;
}

function isAureliaMonorepoRoot(
  repoPath: string,
): boolean {
  const packageJsonPath = join(repoPath, 'package.json');
  const packagesDir = join(repoPath, 'packages');
  if (!existsSync(packageJsonPath) || !existsSync(packagesDir)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      readonly name?: unknown;
    };
    return packageJson.name === '@aurelia/monorepo';
  } catch {
    return false;
  }
}

function groupExportRowsByPackage(
  rows: readonly PackageExportRecord[],
): ReadonlyMap<string, readonly PackageExportRecord[]> {
  const grouped = new Map<string, PackageExportRecord[]>();
  for (const row of rows) {
    const current = grouped.get(row.package_name);
    if (current) {
      current.push(row);
      continue;
    }
    grouped.set(row.package_name, [row]);
  }
  return grouped;
}

function normalizePackage(
  pkg: PackageExportsSummary,
  rows: readonly PackageExportRecord[],
): AureliaFrameworkGoldenPackage {
  return {
    schemaVersion: AURELIA_FRAMEWORK_GOLDEN_SCHEMA_VERSION,
    packageName: pkg.package_name,
    packageDir: pkg.package_dir,
    analysisBasis: pkg.analysis_basis,
    analysisEntrypoint: pkg.analysis_entrypoint,
    summary: {
      exportCount: pkg.export_count,
      typeOnlyExportCount: pkg.type_only_export_count,
      valueExportCount: pkg.value_export_count,
      mergedExportCount: pkg.merged_export_count,
    },
    exports: rows
      .slice()
      .sort(compareExportRows)
      .map(normalizeRow),
  };
}

function normalizeRow(
  row: PackageExportRecord,
): AureliaFrameworkGoldenRow {
  return {
    exportedName: row.exported_name,
    originalName: row.original_name,
    declarationName: row.declaration_name || null,
    declarationFile: row.declaration_file,
    faceKind: row.face_kind,
    faceKinds: [...row.face_kinds],
    typeOnly: row.type_only,
    typeExported: row.type_exported,
    valueExported: row.value_exported,
    namespaceExport: row.namespace_export,
    chainKinds: row.chain.map((step) => step.kind),
  };
}

function compareExportRows(
  left: PackageExportRecord,
  right: PackageExportRecord,
): number {
  return left.exported_name.localeCompare(right.exported_name)
    || left.declaration_name.localeCompare(right.declaration_name)
    || compareNullable(left.declaration_file, right.declaration_file)
    || left.face_kind.localeCompare(right.face_kind);
}

function compareNullable(
  left: string | null,
  right: string | null,
): number {
  if (left === right) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  return left.localeCompare(right);
}
