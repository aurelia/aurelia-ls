import type { AnalysisViews } from './analysis-views.js';
import type { UnresolvedImport } from './deps/schema.js';
import type {
  PackageExportRecord,
  PackageExportsSummary,
} from './exports/schema.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import type { StructuralClaimId } from './structural-claim-graph.js';
import type { TypeDecl } from './typerefs/schema.js';

export const STRUCTURAL_SOURCE_FILE_CATALOG_SOURCES = [
  'structural-runtime',
  'repo-source-scan',
  'source-file-scan',
] as const;

export const STRUCTURAL_SOURCE_FILE_COVERAGE_KINDS = [
  'source-backed',
  'repo-blindspot',
] as const;

export type StructuralSourceFileCatalogSource =
  typeof STRUCTURAL_SOURCE_FILE_CATALOG_SOURCES[number];

export type StructuralSourceFileCoverageKind =
  typeof STRUCTURAL_SOURCE_FILE_COVERAGE_KINDS[number];

export interface StructuralSourceFileCatalogEntry {
  readonly filePath: string;
  readonly coverage: StructuralSourceFileCoverageKind;
  readonly sourceFileClaimId: StructuralClaimId | null;
  readonly projectClaimIds: readonly StructuralClaimId[];
}

export interface StructuralSourceFileCatalog {
  readonly sources: readonly StructuralSourceFileCatalogSource[];
  readonly files: readonly string[];
  readonly entriesByFile: ReadonlyMap<string, StructuralSourceFileCatalogEntry>;
}

export interface StructuralPackageFileSurface {
  readonly files: readonly string[];
  readonly uncoveredFiles: readonly string[];
  readonly unresolvedImports: readonly UnresolvedImport[];
  readonly declarationsByFile: ReadonlyMap<string, readonly TypeDecl[]>;
  readonly exportRecordsByFile: ReadonlyMap<string, readonly PackageExportRecord[]>;
}

export function describeMissingStructuralSourceFileCatalog(): string {
  return 'File focus now depends on the live structural source-file catalog, but the current analysis views do not carry structural file claims, a repo source scan, or a source-file scan.';
}

export function describeMissingStructuralPackageSurface(): string {
  return 'Package-scoped inquiry now depends on live structural package ownership, but the current analysis views do not carry a structural claim graph.';
}

export function loadStructuralSourceFileCatalog(
  analysis: AnalysisViews,
): StructuralSourceFileCatalog | null {
  const sources: StructuralSourceFileCatalogSource[] = [];
  const entries = new Map<string, StructuralSourceFileCatalogEntry>();

  if (analysis.repoSourceFiles) {
    sources.push('repo-source-scan');
    for (const filePath of analysis.repoSourceFiles) {
      entries.set(filePath, {
        filePath,
        coverage: 'repo-blindspot',
        sourceFileClaimId: null,
        projectClaimIds: [],
      });
    }
  }

  if (analysis.structuralRuntime) {
    sources.push('structural-runtime');
    for (const claim of analysis.structuralRuntime.index.sourceFiles) {
      const filePath = claim.attributes.filePath;
      const projectClaimIds = (
        analysis.structuralRuntime.index.projectSourceFilesByFilePath.get(filePath) ?? []
      ).map((projectClaim) => projectClaim.id).sort((left, right) => left.localeCompare(right));
      entries.set(filePath, {
        filePath,
        coverage: 'source-backed',
        sourceFileClaimId: claim.id,
        projectClaimIds,
      });
    }
  }

  if (analysis.sourceFileScan && !analysis.structuralRuntime) {
    sources.push('source-file-scan');
    for (const batch of analysis.sourceFileScan.batches) {
      for (const sourceFile of batch.sourceFiles) {
        entries.set(sourceFile.relPath, {
          filePath: sourceFile.relPath,
          coverage: 'source-backed',
          sourceFileClaimId: null,
          projectClaimIds: [],
        });
      }
    }
  }

  if (sources.length === 0) {
    return null;
  }

  const files = [...entries.keys()].sort((left, right) => left.localeCompare(right));
  return {
    sources,
    files,
    entriesByFile: new Map(files.map((filePath) => [filePath, entries.get(filePath)!])),
  };
}

export function getStructuralSourceFileCatalogEntry(
  analysis: AnalysisViews,
  filePath: string,
): StructuralSourceFileCatalogEntry | null {
  return loadStructuralSourceFileCatalog(analysis)?.entriesByFile.get(filePath) ?? null;
}

export function resolveStructuralSourceFileQuery(
  analysis: AnalysisViews,
  query: string,
): readonly string[] | null {
  const catalog = loadStructuralSourceFileCatalog(analysis);
  if (!catalog) {
    return null;
  }

  const normalized = trimTrailingFocusPunctuation(query).replace(/\\/g, '/');
  if (catalog.files.includes(normalized)) {
    return [normalized];
  }

  const suffixMatches = catalog.files.filter((filePath) => filePath.endsWith(normalized));
  if (suffixMatches.length > 0) {
    return suffixMatches;
  }

  return catalog.files.filter((filePath) =>
    filePath.toLowerCase().includes(normalized.toLowerCase()),
  );
}

export function resolveStructuralOwningPackage(
  analysis: AnalysisViews,
  filePath: string,
): PackageExportsSummary | null {
  const structuralRuntime = analysis.structuralRuntime;
  if (!structuralRuntime) {
    return null;
  }

  let bestPackageDir: string | null = null;
  for (const claim of structuralRuntime.index.packages) {
    const packageDir = claim.attributes.packageDir;
    if (!filePathBelongsToPackageDir(filePath, packageDir)) {
      continue;
    }
    if (bestPackageDir === null || packageDir.length > bestPackageDir.length) {
      bestPackageDir = packageDir;
    }
  }

  if (bestPackageDir === null) {
    return null;
  }

  return analysis.exports.packages.find((pkg) => pkg.package_dir === bestPackageDir) ?? null;
}

export function collectStructuralPackageFileSurface(
  analysis: AnalysisViews,
  pkg: PackageExportsSummary,
): StructuralPackageFileSurface | null {
  const catalog = loadStructuralSourceFileCatalog(analysis);
  if (!analysis.structuralRuntime || !catalog) {
    return null;
  }

  const ownsFile = (filePath: string): boolean =>
    resolveStructuralOwningPackage(analysis, filePath)?.package_dir === pkg.package_dir;

  const files = catalog.files.filter((filePath) =>
    ownsFile(filePath) && catalog.entriesByFile.get(filePath)?.coverage === 'source-backed',
  );
  const uncoveredFiles = catalog.files.filter((filePath) =>
    ownsFile(filePath) && catalog.entriesByFile.get(filePath)?.coverage === 'repo-blindspot',
  );
  const declarationsByFile = new Map<string, TypeDecl[]>();
  for (const declaration of analysis.typeRefs.declarations) {
    if (!ownsFile(declaration.file)) {
      continue;
    }
    const declarations = declarationsByFile.get(declaration.file) ?? [];
    declarations.push(declaration);
    declarationsByFile.set(declaration.file, declarations);
  }

  const exportRecordsByFile = new Map<string, PackageExportRecord[]>();
  for (const record of analysis.exports.exports) {
    if (record.package_dir !== pkg.package_dir
      || !record.declaration_file
      || !ownsFile(record.declaration_file)) {
      continue;
    }
    const exportRecords = exportRecordsByFile.get(record.declaration_file) ?? [];
    exportRecords.push(record);
    exportRecordsByFile.set(record.declaration_file, exportRecords);
  }

  const unresolvedImports = collectStructuralUnresolvedImports(analysis, ownsFile);

  return {
    files,
    uncoveredFiles,
    unresolvedImports,
    declarationsByFile: new Map(
      [...declarationsByFile.entries()].map(([filePath, declarations]) => [
        filePath,
        [...declarations].sort((left, right) =>
          left.line - right.line || left.name.localeCompare(right.name),
        ),
      ]),
    ),
    exportRecordsByFile: new Map(
      [...exportRecordsByFile.entries()].map(([filePath, exportRecords]) => [
        filePath,
        [...exportRecords].sort((left, right) =>
          left.exported_name.localeCompare(right.exported_name),
        ),
      ]),
    ),
  };
}

function collectStructuralUnresolvedImports(
  analysis: AnalysisViews,
  ownsFile: (filePath: string) => boolean,
): readonly UnresolvedImport[] {
  if (analysis.structuralRuntime) {
    return analysis.structuralRuntime.index.imports
      .flatMap((importClaim) => {
        if (!ownsFile(importClaim.attributes.sourceFile)) {
          return [];
        }
        const resolution = analysis.structuralRuntime?.index.resolutionByImportId.get(importClaim.id);
        if (resolution?.attributes.status !== 'unresolved') {
          return [];
        }
        return [{
          source: importClaim.attributes.sourceFile,
          specifier: importClaim.attributes.specifier,
          line: importClaim.attributes.line,
        }];
      })
      .sort((left, right) =>
        left.source.localeCompare(right.source)
        || left.line - right.line
        || left.specifier.localeCompare(right.specifier),
      );
  }

  return analysis.deps.unresolved_imports
    .filter((entry) => ownsFile(entry.source))
    .sort((left, right) =>
      left.source.localeCompare(right.source)
      || left.line - right.line
      || left.specifier.localeCompare(right.specifier),
    );
}

function filePathBelongsToPackageDir(
  filePath: string,
  packageDir: string,
): boolean {
  if (packageDir.length === 0) {
    return true;
  }

  return filePath.startsWith(`${packageDir}/`);
}
