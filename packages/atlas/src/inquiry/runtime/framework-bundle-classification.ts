import ts from "typescript";

import {
  SourceProjectMemo,
  type SourceProject,
} from "../../source/index.js";
import {
  type FrameworkDiInterfaceExportRow,
  type FrameworkPackageExportRow,
  type FrameworkRegistryExportRow,
  type FrameworkResourceCarrierRow,
} from "./framework-entities.js";
import {
  capabilitiesForPackageExport,
  diInterfaceRowsForVariable,
  exportSurfaceEntryForNamedDeclaration,
  readFrameworkDiInterfaceExportRows,
  readFrameworkPackageNames,
} from "./framework-package-exports.js";
import {
  readFrameworkResourcePackageCarrierRows,
  resourceCarriersForClass,
  resourceCarriersForVariable,
} from "./framework-resources.js";
import {
  declarationKey,
  declarationNameText,
  declarationsForExpressionSymbol,
  memberNamesForValueName,
  targetDeclarationKey,
  uniqueById,
  valueDeclarationParts,
} from "./framework-symbols.js";
import {
  unwrapExpression,
  visibleExpressionName,
} from "./framework-ts-utils.js";

const bundleClassificationContextMemo = new SourceProjectMemo<
  FrameworkBundleClassificationContext
>();

export interface FrameworkBundleClassificationContext {
  readonly packageNames: ReadonlyMap<string, string>;
  readonly metrics: FrameworkBundleClassificationMetrics;
  readonly declarationsByExpression: WeakMap<
    ts.Expression,
    readonly ts.Declaration[]
  >;
  readonly indexedResourcePackageIds: Set<string>;
  readonly resourceCarriersByDeclaration: Map<
    string,
    FrameworkResourceCarrierRow[]
  >;
  readonly resourceCarriersByName: Map<string, FrameworkResourceCarrierRow[]>;
  readonly resourceCarriersByPackageAndName: Map<
    string,
    FrameworkResourceCarrierRow[]
  >;
  readonly indexedDiPackageIds: Set<string>;
  readonly diInterfacesByDeclaration: Map<
    string,
    FrameworkDiInterfaceExportRow[]
  >;
  readonly diInterfacesByName: Map<string, FrameworkDiInterfaceExportRow[]>;
  readonly indexedRegistryPackageIds: Set<string>;
  readonly registryExportsByDeclaration: Map<
    string,
    FrameworkRegistryExportRow[]
  >;
  readonly registryExportsByName: Map<string, FrameworkRegistryExportRow[]>;
}

export interface FrameworkBundleClassificationMetrics {
  expressions: number;
  expressionFactMs: number;
  arrayBindingMs: number;
  resourceMs: number;
  diMs: number;
  registryMs: number;
}

export function readFrameworkBundleClassificationContext(
  sourceProject: SourceProject,
): FrameworkBundleClassificationContext {
  return bundleClassificationContextMemo.read(sourceProject, () =>
    createFrameworkBundleClassificationContext(sourceProject),
  );
}

export function createFrameworkBundleClassificationContext(
  sourceProject: SourceProject,
): FrameworkBundleClassificationContext {
  const startedAt = performance.now();
  const packageNames = readFrameworkPackageNames(sourceProject);
  const afterPackages = performance.now();
  const context = {
    packageNames,
    metrics: {
      expressions: 0,
      expressionFactMs: 0,
      arrayBindingMs: 0,
      resourceMs: 0,
      diMs: 0,
      registryMs: 0,
    },
    declarationsByExpression: new WeakMap<
      ts.Expression,
      readonly ts.Declaration[]
    >(),
    indexedResourcePackageIds: new Set<string>(),
    resourceCarriersByDeclaration: new Map<
      string,
      FrameworkResourceCarrierRow[]
    >(),
    resourceCarriersByName: new Map<string, FrameworkResourceCarrierRow[]>(),
    resourceCarriersByPackageAndName: new Map<
      string,
      FrameworkResourceCarrierRow[]
    >(),
    indexedDiPackageIds: new Set<string>(),
    diInterfacesByDeclaration: new Map<
      string,
      FrameworkDiInterfaceExportRow[]
    >(),
    diInterfacesByName: new Map<string, FrameworkDiInterfaceExportRow[]>(),
    indexedRegistryPackageIds: new Set<string>(),
    registryExportsByDeclaration: new Map<
      string,
      FrameworkRegistryExportRow[]
    >(),
    registryExportsByName: new Map<string, FrameworkRegistryExportRow[]>(),
  };
  profileFrameworkBundles({
    event: "atlas.framework.bundles.classification.profile",
    packageMs: Math.round(afterPackages - startedAt),
    totalMs: Math.round(afterPackages - startedAt),
    packages: packageNames.size,
  });
  return context;
}

function ensureResourcePackageIndexed(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  packageId: string | undefined,
): void {
  if (
    packageId === undefined ||
    classification.indexedResourcePackageIds.has(packageId)
  ) {
    return;
  }
  const startedAt = performance.now();
  const packageName = classification.packageNames.get(packageId);
  if (packageName === undefined) {
    classification.indexedResourcePackageIds.add(packageId);
    return;
  }
  const rows = readFrameworkResourcePackageCarrierRows(
    sourceProject,
    packageId,
    packageName,
  );
  for (const row of rows) {
    indexResourceCarrierRow(classification, row);
  }
  classification.indexedResourcePackageIds.add(packageId);
  profileFrameworkBundles({
    event: "atlas.framework.bundles.package-index.profile",
    family: "resource-carriers",
    packageId,
    ms: Math.round(performance.now() - startedAt),
    rows: rows.length,
  });
}

function indexResourceCarrierRow(
  classification: FrameworkBundleClassificationContext,
  row: FrameworkResourceCarrierRow,
): void {
  for (const target of row.carrierEntry.targets) {
    addIndexedRow(
      classification.resourceCarriersByDeclaration,
      targetDeclarationKey(target),
      row,
    );
  }
  addIndexedRow(
    classification.resourceCarriersByName,
    row.sourceExportName,
    row,
  );
  addIndexedRow(
    classification.resourceCarriersByPackageAndName,
    packageNameKey(row.packageId, row.sourceExportName),
    row,
  );
  addIndexedRow(classification.resourceCarriersByName, row.targetName, row);
  addIndexedRow(
    classification.resourceCarriersByPackageAndName,
    packageNameKey(row.packageId, row.targetName),
    row,
  );
}

function addIndexedRow<TRow>(
  index: Map<string, TRow[]>,
  key: string | null | undefined,
  row: TRow,
): void {
  if (key === null || key === undefined) {
    return;
  }
  const rows = index.get(key);
  if (rows === undefined) {
    index.set(key, [row]);
    return;
  }
  rows.push(row);
}

function packageNameKey(
  packageId: string,
  name: string | null | undefined,
): string | null {
  return name === null || name === undefined ? null : `${packageId}:${name}`;
}

function rowsForExpressionDeclarations<TRow extends { readonly id: string }>(
  sourceProject: SourceProject,
  index: ReadonlyMap<string, readonly TRow[]>,
  expression: ts.Expression,
): readonly TRow[] {
  return rowsForDeclarations(
    index,
    declarationsForExpressionSymbol(sourceProject, expression),
  );
}

export function declarationsForExpressionSymbolCached(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  expression: ts.Expression,
): readonly ts.Declaration[] {
  const current = unwrapExpression(expression);
  const cached = classification.declarationsByExpression.get(current);
  if (cached !== undefined) {
    return cached;
  }
  const declarations = declarationsForExpressionSymbol(sourceProject, current);
  classification.declarationsByExpression.set(current, declarations);
  return declarations;
}

function rowsForDeclarations<TRow extends { readonly id: string }>(
  index: ReadonlyMap<string, readonly TRow[]>,
  declarations: readonly ts.Declaration[],
): readonly TRow[] {
  return uniqueById(
    declarations.flatMap((declaration) => {
      const key = declarationKey(declaration);
      return key === null ? [] : index.get(key) ?? [];
    }),
  );
}

function resourceCarriersForDeclarations(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declarations: readonly ts.Declaration[],
): readonly FrameworkResourceCarrierRow[] {
  const direct = uniqueById(
    declarations.flatMap((declaration) => {
      const key = declarationKey(declaration);
      const cached =
        key === null
          ? undefined
          : classification.resourceCarriersByDeclaration.get(key);
      if (cached !== undefined) {
        return cached;
      }
      const packageId = sourceProject.packageForFileName(
        declaration.getSourceFile().fileName,
      )?.id;
      const packageName =
        packageId === undefined
          ? undefined
          : classification.packageNames.get(packageId);
      let rows: readonly FrameworkResourceCarrierRow[] = [];
      if (packageId === undefined || packageName === undefined) {
        rows = [];
      } else if (
        ts.isClassDeclaration(declaration) &&
        declaration.name !== undefined
      ) {
        rows = resourceCarriersForClass(
          sourceProject,
          declaration.getSourceFile(),
          declaration,
          packageId,
          packageName,
        );
      } else if (
        ts.isVariableDeclaration(declaration) &&
        ts.isIdentifier(declaration.name)
      ) {
        rows = resourceCarriersForVariable(
          sourceProject,
          declaration.getSourceFile(),
          declaration as ts.VariableDeclaration & {
            readonly name: ts.Identifier;
          },
          packageId,
          packageName,
        );
      }
      if (key !== null) {
        classification.resourceCarriersByDeclaration.set(key, [...rows]);
      }
      return rows;
    }),
  );
  if (direct.length > 0) {
    return direct;
  }
  return uniqueById(
    namedPackageDeclarationKeys(
      sourceProject,
      classification,
      declarations,
    ).flatMap((entry) => {
      ensureResourcePackageIndexed(
        sourceProject,
        classification,
        entry.packageId,
      );
      return (
        classification.resourceCarriersByPackageAndName.get(
          packageNameKey(entry.packageId, entry.name)!,
        ) ?? []
      );
    }),
  );
}

function diInterfacesForDeclarations(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declarations: readonly ts.Declaration[],
): readonly FrameworkDiInterfaceExportRow[] {
  const direct = uniqueById(
    declarations.flatMap((declaration) => {
      const key = declarationKey(declaration);
      const cached =
        key === null
          ? undefined
          : classification.diInterfacesByDeclaration.get(key);
      if (cached !== undefined) {
        return cached;
      }
      const packageId = sourceProject.packageForFileName(
        declaration.getSourceFile().fileName,
      )?.id;
      const packageName =
        packageId === undefined
          ? undefined
          : classification.packageNames.get(packageId);
      const rows =
        packageId === undefined ||
        packageName === undefined ||
        !ts.isVariableDeclaration(declaration)
          ? []
          : diInterfaceRowsForVariable(
              sourceProject,
              declaration.getSourceFile(),
              declaration,
              packageId,
              packageName,
            );
      if (key !== null) {
        classification.diInterfacesByDeclaration.set(key, [...rows]);
      }
      return rows;
    }),
  );
  if (direct.length > 0) {
    return direct;
  }
  return uniqueById(
    namedPackageDeclarationKeys(
      sourceProject,
      classification,
      declarations,
    ).flatMap((entry) =>
      readFrameworkDiInterfaceExportRows(
        sourceProject,
        entry.packageId,
        entry.packageName,
        entry.name,
      ),
    ),
  );
}

function registryExportsForDeclarations(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declarations: readonly ts.Declaration[],
): readonly FrameworkRegistryExportRow[] {
  return uniqueById(
    declarations.flatMap((declaration) => {
      const key = declarationKey(declaration);
      const cached =
        key === null
          ? undefined
          : classification.registryExportsByDeclaration.get(key);
      if (cached !== undefined) {
        return cached;
      }
      const rows = registryExportForDeclaration(
        sourceProject,
        classification,
        declaration,
      );
      if (key !== null) {
        classification.registryExportsByDeclaration.set(key, [...rows]);
      }
      return rows;
    }),
  );
}

function namedPackageDeclarationKeys(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declarations: readonly ts.Declaration[],
): readonly {
  readonly packageId: string;
  readonly packageName: string;
  readonly name: string;
}[] {
  const entries = new Map<
    string,
    {
      readonly packageId: string;
      readonly packageName: string;
      readonly name: string;
    }
  >();
  for (const declaration of declarations) {
    const name = declarationNameText(declaration);
    const packageId = sourceProject.packageForFileName(
      declaration.getSourceFile().fileName,
    )?.id;
    const packageName =
      packageId === undefined
        ? undefined
        : classification.packageNames.get(packageId);
    if (name === null || packageId === undefined || packageName === undefined) {
      continue;
    }
    entries.set(`${packageId}:${name}`, { packageId, packageName, name });
  }
  return [...entries.values()];
}

function registryExportForDeclaration(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  declaration: ts.Declaration,
): readonly FrameworkRegistryExportRow[] {
  const value = valueDeclarationParts(declaration);
  if (value === null) {
    return [];
  }
  const sourceFile = declaration.getSourceFile();
  const packageId = sourceProject.packageForFileName(sourceFile.fileName)?.id;
  const packageName =
    packageId === undefined
      ? undefined
      : classification.packageNames.get(packageId);
  if (packageId === undefined || packageName === undefined) {
    return [];
  }
  const memberNames = memberNamesForValueName(sourceProject, value.nameNode);
  const exportEntry = {
    ...exportSurfaceEntryForNamedDeclaration(
      sourceProject,
      sourceFile,
      value.nameNode,
      value.declarationNode,
      value.declarationKind,
    ),
    memberNames,
  };
  const baseRow: FrameworkPackageExportRow = {
    id: `framework-export:${packageId}:${exportEntry.exportName}:source-registry`,
    packageId,
    packageName,
    exportEntry,
  };
  const capabilities = capabilitiesForPackageExport(baseRow);
  return capabilities.length === 0
    ? []
    : [
        {
          ...baseRow,
          capabilities,
        },
      ];
}

export function resourceCarriersForExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  _sourceFile: ts.SourceFile,
  expression: ts.Expression,
  declarations: readonly ts.Declaration[] = declarationsForExpressionSymbolCached(
    sourceProject,
    classification,
    expression,
  ),
): readonly FrameworkResourceCarrierRow[] {
  const exact = resourceCarriersForDeclarations(
    sourceProject,
    classification,
    declarations,
  );
  if (exact.length > 0) {
    return exact;
  }
  const targetName = visibleExpressionName(expression);
  if (targetName === null) {
    return [];
  }
  return rowsForExpressionDeclarations(
    sourceProject,
    classification.resourceCarriersByDeclaration,
    expression,
  ).filter(
    (row) =>
      row.sourceExportName === targetName || row.targetName === targetName,
  );
}

export function diInterfacesForExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  _sourceFile: ts.SourceFile,
  expression: ts.Expression,
  declarations: readonly ts.Declaration[] = declarationsForExpressionSymbolCached(
    sourceProject,
    classification,
    expression,
  ),
): readonly FrameworkDiInterfaceExportRow[] {
  const exact = diInterfacesForDeclarations(
    sourceProject,
    classification,
    declarations,
  );
  if (exact.length > 0) {
    return exact;
  }
  const targetName = visibleExpressionName(expression);
  if (targetName === null) {
    return [];
  }
  return rowsForExpressionDeclarations(
    sourceProject,
    classification.diInterfacesByDeclaration,
    expression,
  ).filter(
    (row) =>
      row.exportEntry.exportName === targetName ||
      row.interfaceKey === targetName,
  );
}

export function registryExportsForExpression(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  _sourceFile: ts.SourceFile,
  expression: ts.Expression,
  declarations: readonly ts.Declaration[] = declarationsForExpressionSymbolCached(
    sourceProject,
    classification,
    expression,
  ),
): readonly FrameworkRegistryExportRow[] {
  const exact = registryExportsForDeclarations(
    sourceProject,
    classification,
    declarations,
  );
  if (exact.length > 0) {
    return exact;
  }
  const targetName = visibleExpressionName(expression);
  if (targetName === null) {
    return [];
  }
  return rowsForExpressionDeclarations(
    sourceProject,
    classification.registryExportsByDeclaration,
    expression,
  ).filter(
    (row) =>
      row.exportEntry.exportName === targetName ||
      row.exportEntry.resolvedName === targetName,
  );
}

export function profileFrameworkBundles(
  payload: Record<string, unknown>,
): void {
  if (process.env.ATLAS_PROFILE_FRAMEWORK_BUNDLES !== "1") {
    return;
  }
  console.error(JSON.stringify(payload));
}

export function registryExportForMemberCallReceiver(
  sourceProject: SourceProject,
  classification: FrameworkBundleClassificationContext,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  owningRow: FrameworkRegistryExportRow,
): FrameworkRegistryExportRow | undefined {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return undefined;
  }
  const callee = unwrapExpression(current.expression);
  if (
    !ts.isPropertyAccessExpression(callee) ||
    !["customize", "withChild"].includes(callee.name.text)
  ) {
    return undefined;
  }
  return registryExportsForExpression(
    sourceProject,
    classification,
    sourceFile,
    callee.expression,
  ).find((candidate) => candidate.id !== owningRow.id);
}
