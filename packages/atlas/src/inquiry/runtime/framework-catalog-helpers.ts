import {
  readExportNames,
  SourceDeclarationKind,
  SourceSelectorScheme,
  type SourceProject,
} from "../../source/index.js";
import {
  normalizeIdentifierText,
  uniqueCatalogMatches,
  uniqueStrings,
} from "./framework-catalog-utils.js";
import {
  FrameworkCatalogExportShape,
  FrameworkCatalogMatchBasis,
  type FrameworkCatalogMatchRow,
  type FrameworkPackageExportRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  frameworkPackageIdsForFilters,
  readFrameworkPackageExports,
} from "./framework-package-exports.js";

export function frameworkPackageIdsForEntityFilters(
  packageNames: ReadonlyMap<string, string>,
  filters: FrameworkDiscoveryFilters,
  allowedPackageIds: readonly string[],
): readonly string[] {
  const allowed = new Set(allowedPackageIds);
  return frameworkPackageIdsForFilters(packageNames, filters).filter(
    (packageId) => allowed.has(packageId),
  );
}

export function candidateExportNamesForPackage(
  sourceProject: SourceProject,
  packageId: string,
  includeEntirePackage: boolean,
  isCandidate: (name: string) => boolean,
): readonly string[] {
  return readExportNames(
    sourceProject,
    {
      scheme: SourceSelectorScheme.Package,
      packageId,
    },
    {
      limit: 100_000,
      offset: 0,
    },
  )
    .exports.map((entry) => entry.exportName)
    .filter((name) => includeEntirePackage || isCandidate(name));
}

export function packageExportsForCandidateNames(
  sourceProject: SourceProject,
  packageId: string,
  candidateNames: readonly string[],
  preferFullSurface: boolean,
): readonly FrameworkPackageExportRow[] {
  const uniqueNames = uniqueStrings(candidateNames);
  if (uniqueNames.length === 0) {
    return [];
  }
  if (preferFullSurface) {
    const admittedNames = new Set(uniqueNames);
    return readFrameworkPackageExports(sourceProject, { packageId }).filter(
      (row) => admittedNames.has(row.exportEntry.exportName),
    );
  }
  return uniqueNames.flatMap((exportName) =>
    readFrameworkPackageExports(sourceProject, { packageId, exportName }),
  );
}

export function catalogMatchesForPackageExport(
  row: FrameworkPackageExportRow,
  isMatchText: (text: string) => boolean,
  packageAdmitted: boolean,
): readonly FrameworkCatalogMatchRow[] {
  const matches: FrameworkCatalogMatchRow[] = [];
  if (packageAdmitted) {
    matches.push({
      basis: FrameworkCatalogMatchBasis.Package,
      text: row.packageId,
    });
  }
  addCatalogMatch(
    matches,
    FrameworkCatalogMatchBasis.ExportName,
    row.exportEntry.exportName,
    isMatchText,
  );
  addCatalogMatch(
    matches,
    FrameworkCatalogMatchBasis.ResolvedName,
    row.exportEntry.resolvedName,
    isMatchText,
  );
  if (row.exportEntry.type !== null) {
    addCatalogMatch(
      matches,
      FrameworkCatalogMatchBasis.TypeText,
      row.exportEntry.type,
      isMatchText,
    );
  }
  for (const memberName of row.exportEntry.memberNames) {
    addCatalogMatch(
      matches,
      FrameworkCatalogMatchBasis.MemberName,
      memberName,
      isMatchText,
    );
  }
  return uniqueCatalogMatches(matches);
}

export function addCatalogMatch(
  matches: FrameworkCatalogMatchRow[],
  basis: FrameworkCatalogMatchBasis,
  text: string,
  isMatchText: (text: string) => boolean,
): void {
  if (isMatchText(text)) {
    matches.push({ basis, text });
  }
}

export function catalogEntityMatchesQuery(
  row: FrameworkPackageExportRow & {
    readonly exportShape: FrameworkCatalogExportShape;
    readonly matchedBy: readonly FrameworkCatalogMatchRow[];
  },
  query: string,
  kinds: readonly string[],
  capabilities: readonly string[],
): boolean {
  const normalizedQuery = normalizeIdentifierText(query);
  return [
    row.packageId,
    row.exportEntry.exportName,
    row.exportEntry.resolvedName,
    row.exportEntry.type ?? "",
    row.exportShape,
    ...kinds,
    ...capabilities,
    ...row.matchedBy.map((match) => match.text),
  ].some((text) => normalizeIdentifierText(text).includes(normalizedQuery));
}

export function catalogExportShapeForPackageExport(
  row: FrameworkPackageExportRow,
): FrameworkCatalogExportShape {
  const declarationKinds = row.exportEntry.targets
    .map((target) => target.declarationKind)
    .filter(
      (declarationKind): declarationKind is SourceDeclarationKind =>
        declarationKind !== undefined,
    );
  if (row.exportEntry.type?.includes("InterfaceSymbol") === true) {
    return FrameworkCatalogExportShape.DiInterface;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Class)) {
    return FrameworkCatalogExportShape.Class;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Interface)) {
    return FrameworkCatalogExportShape.Interface;
  }
  if (declarationKinds.includes(SourceDeclarationKind.TypeAlias)) {
    return FrameworkCatalogExportShape.TypeAlias;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Function)) {
    return FrameworkCatalogExportShape.Function;
  }
  if (declarationKinds.includes(SourceDeclarationKind.Variable)) {
    return FrameworkCatalogExportShape.Value;
  }
  return FrameworkCatalogExportShape.Unknown;
}

export function catalogClassificationTexts(
  row: FrameworkPackageExportRow,
): readonly string[] {
  return [
    row.exportEntry.exportName,
    row.exportEntry.resolvedName,
    row.exportEntry.type ?? "",
    ...row.exportEntry.memberNames,
  ]
    .filter((text) => text.length > 0)
    .map(normalizeIdentifierText);
}
