import type { AnalysisViews } from './analysis-views.js';
import type { UnresolvedImport } from './deps/schema.js';
import type {
  PackageExportRecord,
  PackageExportsSummary,
} from './exports/schema.js';
import { trimTrailingFocusPunctuation } from './focus-normalization.js';
import type { TypeDecl } from './typerefs/schema.js';

export const STRUCTURAL_SOURCE_FILE_CATALOG_SOURCES = [
  'structural-runtime',
  'source-file-scan',
] as const;

export type StructuralSourceFileCatalogSource =
  typeof STRUCTURAL_SOURCE_FILE_CATALOG_SOURCES[number];

export interface StructuralSourceFileCatalog {
  readonly source: StructuralSourceFileCatalogSource;
  readonly files: readonly string[];
}

export interface StructuralPackageFileSurface {
  readonly files: readonly string[];
  readonly uncoveredFiles: readonly string[];
  readonly unresolvedImports: readonly UnresolvedImport[];
  readonly declarationsByFile: ReadonlyMap<string, readonly TypeDecl[]>;
  readonly exportRecordsByFile: ReadonlyMap<string, readonly PackageExportRecord[]>;
}

export function describeMissingStructuralSourceFileCatalog(): string {
  return 'File focus now depends on the live structural source-file catalog, but the current analysis views do not carry structural file claims or a source-file scan.';
}

export function describeMissingStructuralPackageSurface(): string {
  return 'Package-scoped inquiry now depends on live structural package ownership, but the current analysis views do not carry a structural claim graph.';
}

export function loadStructuralSourceFileCatalog(
  analysis: AnalysisViews,
): StructuralSourceFileCatalog | null {
  if (analysis.structuralRuntime) {
    return {
      source: 'structural-runtime',
      files: analysis.structuralRuntime.index.sourceFiles
        .map((claim) => claim.attributes.filePath)
        .sort((left, right) => left.localeCompare(right)),
    };
  }

  if (analysis.sourceFileScan) {
    const files = new Set<string>();
    for (const batch of analysis.sourceFileScan.batches) {
      for (const sourceFile of batch.sourceFiles) {
        files.add(sourceFile.relPath);
      }
    }

    return {
      source: 'source-file-scan',
      files: [...files].sort((left, right) => left.localeCompare(right)),
    };
  }

  return null;
}

export function resolveStructuralSourceFileQuery(
  analysis: AnalysisViews,
  query: string,
): readonly string[] | null {
  const catalog = loadStructuralSourceFileCatalog(analysis);
  if (!catalog) {
    return null;
  }

  // TODO: The structural source-file catalog currently covers tsconfig-admitted
  // source files only. Uncovered repo files should become explicit structural
  // blindspot claims/evaluator inputs, not a second file catalog rebuilt from
  // snapshot carriers.
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

  const files = catalog.files.filter(ownsFile);
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

  const unresolvedImports = analysis.deps.unresolved_imports
    .filter((entry) => ownsFile(entry.source))
    .sort((left, right) =>
      left.source.localeCompare(right.source)
      || left.line - right.line
      || left.specifier.localeCompare(right.specifier),
    );
  const uncoveredFiles = analysis.deps.uncovered_files
    .filter(ownsFile)
    .sort((left, right) => left.localeCompare(right));

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

function filePathBelongsToPackageDir(
  filePath: string,
  packageDir: string,
): boolean {
  if (packageDir.length === 0) {
    return true;
  }

  return filePath.startsWith(`${packageDir}/`);
}
