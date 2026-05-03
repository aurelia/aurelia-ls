import { readEvaluationEffectTrace } from "../../evaluation/index.js";
import {
  SourceProjectKeyedMemo,
  sourceSelectorForRange,
  type SourceProject,
} from "../../source/index.js";
import { associationsForBundleEffect } from "./framework-bundle-associations.js";
import {
  profileFrameworkBundles,
  readFrameworkBundleClassificationContext,
} from "./framework-bundle-classification.js";
import {
  type FrameworkBundleExportRow,
  type FrameworkRegistryExportRow,
} from "./framework-entities.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import {
  frameworkPackageIdsForFilters,
  readFrameworkPackageNames,
  readFrameworkRegistryExports,
} from "./framework-package-exports.js";
import {
  concreteExportTarget,
  sourceRangeForTarget,
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
        filters.query === undefined ||
        row.exportEntry.exportName.includes(filters.query) ||
        row.associations.some(
          (association) =>
            association.targetName?.includes(filters.query!) === true ||
            association.catalogName?.includes(filters.query!) === true ||
            association.helperName?.includes(filters.query!) === true,
        ),
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
  _packageName: string,
  exportName?: string,
): readonly FrameworkBundleExportRow[] {
  return readFrameworkRegistryExports(sourceProject, {
    packageId,
    ...(exportName === undefined ? {} : { exportName }),
  })
    .map((row) => bundleRowForRegistryExport(sourceProject, row))
    .sort((left, right) =>
      left.exportEntry.exportName.localeCompare(right.exportEntry.exportName),
    );
}

function bundleRowForRegistryExport(
  sourceProject: SourceProject,
  row: FrameworkRegistryExportRow,
): FrameworkBundleExportRow {
  const startedAt = performance.now();
  const source = sourceRangeForTarget(
    concreteExportTarget(row.exportEntry.targets),
  );
  if (source === null) {
    return {
      ...row,
      effectCount: 0,
      associations: [],
      openSeamCount: 0,
    };
  }
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
  const associations = effectTrace.effects.flatMap((effect) =>
    associationsForBundleEffect(sourceProject, classification, row, effect),
  );
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
