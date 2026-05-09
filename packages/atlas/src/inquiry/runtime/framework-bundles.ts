import ts from "typescript";

import { uniqueFirstByKey } from "../../collections.js";
import { readEvaluationEffectTrace } from "../../evaluation/index.js";
import { FrameworkExportCapability } from "../../framework/index.js";
import {
  propertyNameText,
  SourceProjectKeyedMemo,
  sourceSelectorForRange,
  SourceDeclarationKind,
  type TypeScriptExportNameEntry,
  type SourceProject,
} from "../../source/index.js";
import {
  associationsForBundleEffect,
  associationsForConfigurationFactoryMembers,
} from "./framework-bundle-associations.js";
import {
  profileFrameworkBundles,
  readFrameworkBundleClassificationContext,
} from "./framework-bundle-classification.js";
import {
  FrameworkBundleKind,
  type FrameworkBundleExportRow,
  type FrameworkPackageExportRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  exportSurfaceEntryForNamedDeclaration,
  exportSurfaceEntryForVariable,
  exportedClassDeclarations,
  exportedVariableDeclarations,
  frameworkPackageIdsForFilters,
  readFrameworkPackageNames,
  readFrameworkPublicExportSurface,
} from "./framework-package-exports.js";
import {
  concreteExportTarget,
  requiredSourceRangeForTarget,
} from "./framework-support.js";

const bundleRowsByPackage = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkBundleExportRow[]
>();
const bundleRowsByExport = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkBundleExportRow[]
>();

export function readFrameworkBundles(
  sourceProject: SourceProject,
  filters: FrameworkDiscoveryFilters,
): readonly FrameworkBundleExportRow[] {
  const packageNames = readFrameworkPackageNames(sourceProject);
  const packageIds = frameworkPackageIdsForFilters(packageNames, filters);
  const rows =
    filters.exportName === undefined
      ? packageIds.flatMap((packageId) =>
          readFrameworkBundlePackageRows(
            sourceProject,
            packageId,
            packageNames.get(packageId) ?? packageId,
          ),
        )
      : packageIds.flatMap((packageId) =>
          readFrameworkBundleExportRows(
            sourceProject,
            packageId,
            packageNames.get(packageId) ?? packageId,
            filters.exportName!,
          ),
        );
  return rows
    .filter(
      (row) =>
        (filters.bundleKind === undefined ||
          row.bundleKind === filters.bundleKind) &&
        (filters.query === undefined ||
          row.exportEntry.exportName.includes(filters.query) ||
          row.bundleKind.includes(filters.query) ||
          row.associations.some(
            (association) =>
              association.targetName?.includes(filters.query!) === true ||
              association.catalogName?.includes(filters.query!) === true ||
              association.helperName?.includes(filters.query!) === true,
          )),
    )
    .sort(
      (left, right) =>
        left.packageId.localeCompare(right.packageId) ||
        left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

export function readFrameworkBundlePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): readonly FrameworkBundleExportRow[] {
  return bundleRowsByPackage.read(sourceProject, packageId, () =>
    scanFrameworkBundlePackageRows(sourceProject, packageId, packageName),
  );
}

export function readFrameworkBundleExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkBundleExportRow[] {
  const packageCache = bundleRowsByPackage.get(sourceProject, packageId);
  if (packageCache !== undefined) {
    return packageCache.filter(
      (row) => row.exportEntry.exportName === exportName,
    );
  }
  const key = `${packageId}:${exportName}`;
  return bundleRowsByExport.read(sourceProject, key, () =>
    scanFrameworkBundlePackageRows(
      sourceProject,
      packageId,
      packageName,
      exportName,
    ),
  );
}

export function scanFrameworkBundlePackageRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName?: string,
): readonly FrameworkBundleExportRow[] {
  const startedAt = performance.now();
  const candidates = readFrameworkBundleCandidates(
    sourceProject,
    packageId,
    packageName,
    exportName,
  );
  const afterCandidates = performance.now();
  const registryBundleRows = candidates.registryRows
    .map((row) => bundleRowForRegistryExport(sourceProject, row))
    .filter(bundleRowHasVisibleSpending);
  const afterRegistryBundles = performance.now();
  const registryKeys = new Set(
    candidates.registryRows.map((row) =>
      bundleKey(row.packageId, row.exportEntry.exportName),
    ),
  );
  const catalogRows = candidates.catalogRows.filter(
    (row) => !registryKeys.has(bundleKey(row.packageId, row.exportEntry.exportName)),
  );
  const afterCatalogs = performance.now();
  const rows = [...uniqueFirstByKey([...registryBundleRows, ...catalogRows], (row) => row.id)].sort((left, right) =>
    left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
  );
  profileFrameworkBundles({
    event: "atlas.framework.bundles.package.profile",
    packageId,
    ...(exportName === undefined ? {} : { exportName }),
    candidateMs: Math.round(afterCandidates - startedAt),
    registryBundleMs: Math.round(afterRegistryBundles - afterCandidates),
    catalogMs: Math.round(afterCatalogs - afterRegistryBundles),
    totalMs: Math.round(afterCatalogs - startedAt),
    registryRows: candidates.registryRows.length,
    registryBundleRows: registryBundleRows.length,
    catalogRows: catalogRows.length,
    rows: rows.length,
  });
  return rows;
}

function readFrameworkBundleCandidates(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName?: string,
): {
  readonly registryRows: readonly FrameworkBundleExportRow[];
  readonly catalogRows: readonly FrameworkBundleExportRow[];
} {
  const startedAt = performance.now();
  const publicSurface = readFrameworkPublicExportSurface(sourceProject, packageId);
  const afterPublicSurface = performance.now();
  const registryRows: FrameworkBundleExportRow[] = [];
  const catalogRows: FrameworkBundleExportRow[] = [];
  const declarations = candidateBundleDeclarations(
    sourceProject,
    packageId,
    publicSurface.exportsByName,
    exportName,
  );
  const afterDeclarations = performance.now();
  for (const declaration of declarations) {
    if (declaration.bundleKind === FrameworkBundleKind.RegistrationCatalog) {
      if (
        (declaration.catalogElementCount ?? 0) === 0 &&
        declaration.mayHaveUnknownCatalogElements !== true
      ) {
        continue;
      }
      catalogRows.push(
        catalogBundleRowForPackageExport(
          packageName,
          declaration.row,
          declaration.catalogElementCount ?? 0,
          declaration.mayHaveUnknownCatalogElements === true,
        ),
      );
      continue;
    }
    registryRows.push({
      ...declaration.row,
      capabilities: declaration.capabilities,
      bundleKind: declaration.bundleKind,
      effectCount: 0,
      associations: [],
      openSeamCount: 0,
    });
  }
  const afterEvaluation = performance.now();
  profileFrameworkBundles({
    event: "atlas.framework.bundles.candidates.profile",
    packageId,
    ...(exportName === undefined ? {} : { exportName }),
    publicSurfaceMs: Math.round(afterPublicSurface - startedAt),
    declarationMs: Math.round(afterDeclarations - afterPublicSurface),
    evaluationMs: Math.round(afterEvaluation - afterDeclarations),
    totalMs: Math.round(afterEvaluation - startedAt),
    declarations: declarations.length,
    registryRows: registryRows.length,
    catalogRows: catalogRows.length,
  });
  return { registryRows, catalogRows };
}

interface FrameworkBundleCandidateDeclaration {
  readonly bundleKind: FrameworkBundleKind;
  readonly capabilities: readonly FrameworkExportCapability[];
  readonly catalogElementCount?: number;
  readonly exportName: string;
  readonly mayHaveUnknownCatalogElements?: boolean;
  readonly row: FrameworkPackageExportRow;
}

function candidateBundleDeclarations(
  sourceProject: SourceProject,
  packageId: string,
  publicExportsByName: ReadonlyMap<string, TypeScriptExportNameEntry>,
  exportName?: string,
): readonly FrameworkBundleCandidateDeclaration[] {
  const rows: FrameworkBundleCandidateDeclaration[] = [];
  const packageName =
    sourceProject.summary().packages.find((entry) => entry.id === packageId)
      ?.packageName ?? packageId;
  for (const sourceFile of sourceProject.ownedImplementationSourceFilesForPackage(packageId)) {
    for (const declaration of exportedClassDeclarations(sourceFile)) {
      const nameNode = declaration.name;
      const name = nameNode?.text;
      const publicExport =
        name === undefined ? undefined : publicExportsByName.get(name);
      const capabilities = capabilitiesForClassDeclaration(declaration);
      const bundleMember = firstStaticBundleMember(declaration);
      if (
        name === undefined ||
        nameNode === undefined ||
        publicExport === undefined ||
        (exportName !== undefined && name !== exportName) ||
        bundleMember === undefined ||
        capabilities.length === 0
      ) {
        continue;
      }
      rows.push({
        bundleKind: bundleKindForCapabilities(capabilities, false),
        capabilities,
        exportName: name,
        row: {
          id: `framework-export:${packageId}:${name}:bundle-candidate`,
          packageId,
          packageName,
          exportEntry: exportSurfaceEntryForNamedDeclaration(
            sourceProject,
            sourceFile,
            nameNode,
            bundleMember,
            declarationKindForClassElement(bundleMember),
            publicExport,
          ),
        },
      });
    }
    for (const declaration of exportedVariableDeclarations(sourceFile)) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }
      const name = declaration.name.text;
      const publicExport = publicExportsByName.get(name);
      const shape = shapeForVariableBundleCandidate(declaration, sourceFile);
      if (
        publicExport === undefined ||
        (exportName !== undefined && name !== exportName) ||
        shape === null
      ) {
        continue;
      }
      const namedDeclaration = declaration as ts.VariableDeclaration & {
        readonly name: ts.Identifier;
      };
      rows.push({
        ...shape,
        exportName: name,
        row: {
          id: `framework-export:${packageId}:${name}:bundle-candidate`,
          packageId,
          packageName,
          exportEntry: exportSurfaceEntryForVariable(
            sourceProject,
            sourceFile,
            namedDeclaration,
            publicExport,
          ),
        },
      });
    }
  }
  return uniqueFirstByKey(rows, (row) => row.row.id);
}

const bundleCapabilityMemberNames = new Set([
  "register",
  "customize",
  "init",
  "withStore",
  "withChild",
  "optionsProvider",
]);

function capabilitiesForClassDeclaration(
  declaration: ts.ClassDeclaration,
): readonly FrameworkExportCapability[] {
  return capabilitiesForMemberNames(
    declaration.members.flatMap((member) => {
      if (
        !ts.canHaveModifiers(member) ||
        ts
          .getModifiers(member)
          ?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword,
          ) !== true ||
        !("name" in member)
      ) {
        return [];
      }
      const name = propertyNameText(member.name);
      return name === null ? [] : [name];
    }),
  );
}

function firstStaticBundleMember(
  declaration: ts.ClassDeclaration,
): ts.ClassElement | undefined {
  return declaration.members.find((member) => {
    if (!ts.canHaveModifiers(member) || !("name" in member)) {
      return false;
    }
    if (
      ts
        .getModifiers(member)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) !==
      true
    ) {
      return false;
    }
    return bundleCapabilityMemberNames.has(
      propertyNameText(member.name) ?? "",
    );
  });
}

function declarationKindForClassElement(
  element: ts.ClassElement,
): SourceDeclarationKind {
  if (ts.isMethodDeclaration(element)) {
    return SourceDeclarationKind.Method;
  }
  if (ts.isGetAccessorDeclaration(element) || ts.isSetAccessorDeclaration(element)) {
    return SourceDeclarationKind.Accessor;
  }
  return SourceDeclarationKind.Property;
}

type FrameworkBundleCandidateShape = Pick<
  FrameworkBundleCandidateDeclaration,
  | "bundleKind"
  | "capabilities"
  | "catalogElementCount"
  | "mayHaveUnknownCatalogElements"
>;

function shapeForVariableBundleCandidate(
  declaration: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): FrameworkBundleCandidateShape | null {
  if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
    return null;
  }
  const name = declaration.name.text;
  const initializer = unwrapBundleCandidateExpression(declaration.initializer);
  if (expressionTextContainsCreateInterface(initializer, sourceFile)) {
    return null;
  }
  if (ts.isArrayLiteralExpression(initializer)) {
    return {
      bundleKind: FrameworkBundleKind.RegistrationCatalog,
      capabilities: [],
      catalogElementCount: initializer.elements.filter(
        (element) => !ts.isSpreadElement(element),
      ).length,
      mayHaveUnknownCatalogElements: initializer.elements.some((element) =>
        ts.isSpreadElement(element),
      ),
    };
  }
  if (ts.isObjectLiteralExpression(initializer)) {
    const memberNames = objectLiteralMemberNames(initializer);
    const capabilities = capabilitiesForMemberNames(memberNames);
    if (capabilities.length === 0 && !name.endsWith("Configuration")) {
      return null;
    }
    return {
      bundleKind: FrameworkBundleKind.Configuration,
      capabilities,
    };
  }
  if (expressionTextSuggestsConfigurationFactory(initializer, sourceFile)) {
    return {
      bundleKind: FrameworkBundleKind.Configuration,
      capabilities: [
        FrameworkExportCapability.Register,
        FrameworkExportCapability.Customize,
      ],
    };
  }
  return declarationNameSuggestsBundle(name)
    ? {
        bundleKind: name.endsWith("Configuration")
          ? FrameworkBundleKind.Configuration
          : FrameworkBundleKind.Registry,
        capabilities: [],
      }
    : null;
}

function unwrapBundleCandidateExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function objectLiteralMemberNames(
  expression: ts.ObjectLiteralExpression,
): readonly string[] {
  return expression.properties.flatMap((property) => {
    if (ts.isSpreadAssignment(property)) {
      return [];
    }
    const name = propertyNameText(property.name);
    return name === null ? [] : [name];
  });
}

function declarationNameSuggestsBundle(name: string): boolean {
  return (
    name.endsWith("Configuration") ||
    name.endsWith("Registration")
  );
}

function expressionTextContainsCreateInterface(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): boolean {
  return expression.getText(sourceFile).toLowerCase().includes("createinterface");
}

function expressionTextSuggestsConfigurationFactory(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
): boolean {
  if (!ts.isCallExpression(expression)) {
    return false;
  }
  const text = expression.expression.getText(sourceFile);
  return /create.*Configuration/i.test(text);
}

function bundleKindForCapabilities(
  capabilities: readonly FrameworkExportCapability[],
  objectShaped: boolean,
): FrameworkBundleKind {
  return objectShaped ||
    capabilities.some(
      (capability) => capability !== FrameworkExportCapability.Register,
    )
    ? FrameworkBundleKind.Configuration
    : FrameworkBundleKind.Registry;
}

function capabilitiesForMemberNames(
  memberNames: Iterable<string>,
): readonly FrameworkExportCapability[] {
  const names = new Set(memberNames);
  const capabilities: FrameworkExportCapability[] = [];
  if (names.has("register")) {
    capabilities.push(FrameworkExportCapability.Register);
  }
  if (names.has("customize")) {
    capabilities.push(FrameworkExportCapability.Customize);
  }
  if (names.has("init")) {
    capabilities.push(FrameworkExportCapability.Init);
  }
  if (names.has("withStore")) {
    capabilities.push(FrameworkExportCapability.WithStore);
  }
  if (names.has("withChild")) {
    capabilities.push(FrameworkExportCapability.WithChild);
  }
  if (names.has("optionsProvider")) {
    capabilities.push(FrameworkExportCapability.OptionsProvider);
  }
  return capabilities;
}

function bundleRowForRegistryExport(
  sourceProject: SourceProject,
  row: FrameworkBundleExportRow,
): FrameworkBundleExportRow {
  const startedAt = performance.now();
  const source = requiredSourceRangeForTarget(
    concreteExportTarget(row.exportEntry.targets),
    `Framework bundle export ${row.id} is missing a source-backed target.`,
  );
  const classification =
    readFrameworkBundleClassificationContext(sourceProject);
  const afterClassification = performance.now();
  const effectTrace = readEvaluationEffectTrace(
    sourceProject,
    sourceSelectorForRange(source),
    {
      limit: 1_000,
      offset: 0,
      memberName: "register",
      maxDepth: 200,
    },
  );
  const afterTrace = performance.now();
  const associations = uniqueAssociationRows([
    ...effectTrace.effects.flatMap((effect) =>
      associationsForBundleEffect(sourceProject, classification, row, effect),
    ),
    ...associationsForConfigurationFactoryMembers(
      sourceProject,
      classification,
      row,
    ),
  ]);
  const afterAssociations = performance.now();
  profileFrameworkBundles({
    event: "atlas.framework.bundles.row.profile",
    packageId: row.packageId,
    exportName: row.exportEntry.exportName,
    classificationMs: Math.round(afterClassification - startedAt),
    effectTraceMs: Math.round(afterTrace - afterClassification),
    associationMs: Math.round(afterAssociations - afterTrace),
    totalMs: Math.round(afterAssociations - startedAt),
    effects: effectTrace.totalEffects,
    associations: associations.length,
    openSeams: effectTrace.openSeams.length,
    metrics: {
      expressions: classification.metrics.expressions,
      expressionFactMs: Math.round(classification.metrics.expressionFactMs),
      arrayBindingMs: Math.round(classification.metrics.arrayBindingMs),
      resourceMs: Math.round(classification.metrics.resourceMs),
      diMs: Math.round(classification.metrics.diMs),
      registryMs: Math.round(classification.metrics.registryMs),
    },
  });
  return {
    ...row,
    effectCount: effectTrace.totalEffects,
    associations,
    openSeamCount: effectTrace.openSeams.length,
  };
}

function catalogBundleRowForPackageExport(
  packageName: string,
  row: FrameworkPackageExportRow,
  catalogElementCount: number,
  mayHaveUnknownElements: boolean,
): FrameworkBundleExportRow {
  return {
    ...row,
    capabilities: [],
    bundleKind: FrameworkBundleKind.RegistrationCatalog,
    catalogElementCount,
    effectCount: 0,
    associations: [],
    openSeamCount: mayHaveUnknownElements ? 1 : 0,
    packageName,
  };
}

function bundleRowHasVisibleSpending(row: FrameworkBundleExportRow): boolean {
  return row.bundleKind === FrameworkBundleKind.Configuration ||
    row.effectCount > 0 ||
    row.associations.length > 0 ||
    row.openSeamCount > 0;
}

function bundleKey(packageId: string, exportName: string): string {
  return `${packageId}:${exportName}`;
}

function uniqueAssociationRows(
  rows: readonly FrameworkBundleExportRow["associations"][number][],
): readonly FrameworkBundleExportRow["associations"][number][] {
  return uniqueFirstByKey(rows, (row) => row.id);
}
