import { readEvaluationEffectTrace } from "../../evaluation/index.js";
import {
  sourceSelectorForRange,
  type SourceProject,
} from "../../source/index.js";
import { associationsForBundleEffect } from "./framework-bundle-associations.js";
import {
  profileFrameworkBundles,
  readFrameworkBundleClassificationContext,
} from "./framework-bundle-classification.js";
import {
  readFrameworkBundleAdmissionCache,
  writeFrameworkBundleAdmissionCache,
} from "./framework-cache.js";
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

const bundleRowsByPackageByProject = new WeakMap<
  SourceProject,
  Map<string, readonly FrameworkBundleExportRow[]>
>();

const bundleRowsByExportByProject = new WeakMap<
  SourceProject,
  Map<string, readonly FrameworkBundleExportRow[]>
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
  const cache =
    bundleRowsByPackageByProject.get(sourceProject) ??
    new Map<string, readonly FrameworkBundleExportRow[]>();
  if (!bundleRowsByPackageByProject.has(sourceProject)) {
    bundleRowsByPackageByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkBundleAdmissionCache(
    sourceProject,
    packageId,
  );
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const rows = scanFrameworkBundlePackageRows(
    sourceProject,
    packageId,
    packageName,
  );
  cache.set(packageId, rows);
  writeFrameworkBundleAdmissionCache(sourceProject, packageId, rows);
  return rows;
}

export function readFrameworkBundleExportRows(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
  exportName: string,
): readonly FrameworkBundleExportRow[] {
  const packageCache = bundleRowsByPackageByProject
    .get(sourceProject)
    ?.get(packageId);
  if (packageCache !== undefined) {
    return packageCache.filter(
      (row) => row.exportEntry.exportName === exportName,
    );
  }
  const cache =
    bundleRowsByExportByProject.get(sourceProject) ??
    new Map<string, readonly FrameworkBundleExportRow[]>();
  if (!bundleRowsByExportByProject.has(sourceProject)) {
    bundleRowsByExportByProject.set(sourceProject, cache);
  }
  const diskCached = readFrameworkBundleAdmissionCache(
    sourceProject,
    packageId,
  );
  if (diskCached !== undefined) {
    const rows = diskCached.filter(
      (row) => row.exportEntry.exportName === exportName,
    );
    bundleRowsByPackageByProject.get(sourceProject)?.set(packageId, diskCached);
    cache.set(`${packageId}:${exportName}`, rows);
    return rows;
  }
  const key = `${packageId}:${exportName}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rows = scanFrameworkBundlePackageRows(
    sourceProject,
    packageId,
    packageName,
    exportName,
  );
  cache.set(key, rows);
  return rows;
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
