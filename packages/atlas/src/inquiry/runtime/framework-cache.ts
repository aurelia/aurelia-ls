import {
  FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_ID,
  FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_ID,
  frameworkJsonCacheCompositeProducerVersion,
  readFrameworkJsonCachePackage,
  writeFrameworkJsonCachePackage,
} from "../../framework/index.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  type SourceProject,
} from "../../source/index.js";
import type { FrameworkBundleExportRow } from "./framework-entities.js";

const FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_VERSION = "entity-catalog-atoms@1";

const entityCatalogProducerVersions = new Map<string, string>();

const FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_VERSION = "bundle-admissions@1";

const frameworkBundleAdmissionCacheProducerVersion =
  frameworkJsonCacheCompositeProducerVersion(
    FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_ID,
    FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_VERSION,
    [
      import.meta.url,
      new URL("../../framework/admission.js", import.meta.url).href,
      new URL("../../framework/resources.js", import.meta.url).href,
      new URL("./framework-bundle-associations.js", import.meta.url).href,
      new URL("./framework-bundle-classification.js", import.meta.url).href,
      new URL("./framework-bundles.js", import.meta.url).href,
      new URL("./framework-package-exports.js", import.meta.url).href,
      new URL("./framework-resources.js", import.meta.url).href,
      new URL("./framework-symbols.js", import.meta.url).href,
      new URL("./framework-ts-utils.js", import.meta.url).href,
    ],
  );

export function readFrameworkEntityCatalogCache<T>(
  sourceProject: SourceProject,
  catalogId: string,
  packageId: string,
  dependencyPackageIds: readonly string[] = [],
): readonly T[] | undefined {
  if (process.env.ATLAS_FRAMEWORK_JSON_CACHE === "0") {
    return undefined;
  }
  return readFrameworkJsonCachePackage<readonly T[]>(sourceProject, {
    familyId: frameworkEntityCatalogCacheFamilyId(catalogId),
    familyVersion: FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_VERSION,
    producerVersion: frameworkEntityCatalogCacheProducerVersion(catalogId),
    packageId,
    dependencyPackageIds,
  });
}

export function writeFrameworkEntityCatalogCache<T>(
  sourceProject: SourceProject,
  catalogId: string,
  packageId: string,
  rows: readonly T[],
  dependencyPackageIds: readonly string[] = [],
): void {
  if (process.env.ATLAS_FRAMEWORK_JSON_CACHE === "0") {
    return;
  }
  writeFrameworkJsonCachePackage(
    sourceProject,
    {
      familyId: frameworkEntityCatalogCacheFamilyId(catalogId),
      familyVersion: FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_VERSION,
      producerVersion: frameworkEntityCatalogCacheProducerVersion(catalogId),
      packageId,
      dependencyPackageIds,
    },
    rows,
  );
}

export function frameworkEntityCatalogCacheFamilyId(catalogId: string): string {
  return `${FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_ID}.${catalogId}`;
}

function frameworkEntityCatalogCacheProducerVersion(catalogId: string): string {
  const cached = entityCatalogProducerVersions.get(catalogId);
  if (cached !== undefined) {
    return cached;
  }
  const version = frameworkJsonCacheCompositeProducerVersion(
    FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_ID,
    `${FRAMEWORK_ENTITY_CATALOG_CACHE_FAMILY_VERSION}:${catalogId}`,
    entityCatalogProducerDependencies(catalogId),
  );
  entityCatalogProducerVersions.set(catalogId, version);
  return version;
}

function entityCatalogProducerDependencies(catalogId: string): readonly string[] {
  const base = [
    import.meta.url,
    new URL("./framework-symbols.js", import.meta.url).href,
  ];
  switch (catalogId) {
    case "package-exports":
    case "registry-exports":
    case "di-interfaces":
      return [
        ...base,
        new URL("./framework-package-exports.js", import.meta.url).href,
      ];
    case "resource-carriers":
    case "resources":
      return [
        ...base,
        new URL("../../framework/resources.js", import.meta.url).href,
        new URL("./framework-catalog-helpers.js", import.meta.url).href,
        new URL("./framework-catalog-utils.js", import.meta.url).href,
        new URL("./framework-package-exports.js", import.meta.url).href,
        new URL("./framework-resources.js", import.meta.url).href,
        new URL("./framework-ts-utils.js", import.meta.url).href,
      ];
    case "syntax-products":
      return [
        ...base,
        new URL("../../framework/resources.js", import.meta.url).href,
        new URL("../../framework/syntax.js", import.meta.url).href,
        new URL("./framework-package-exports.js", import.meta.url).href,
        new URL("./framework-rendering-inspection.js", import.meta.url).href,
        new URL("./framework-rendering-syntax.js", import.meta.url).href,
        new URL("./framework-resources.js", import.meta.url).href,
        new URL("./framework-ts-utils.js", import.meta.url).href,
      ];
    case "instruction-slots":
      return [
        ...base,
        new URL("../../framework/syntax.js", import.meta.url).href,
        new URL("./framework-package-exports.js", import.meta.url).href,
        new URL("./framework-rendering-inspection.js", import.meta.url).href,
        new URL("./framework-rendering-instructions.js", import.meta.url).href,
        new URL("./framework-rendering-syntax.js", import.meta.url).href,
        new URL("./framework-ts-utils.js", import.meta.url).href,
      ];
    case "binding-products":
    case "binding-admissions":
      return [
        ...base,
        new URL("../../framework/syntax.js", import.meta.url).href,
        new URL("./framework-package-exports.js", import.meta.url).href,
        new URL("./framework-rendering-bindings.js", import.meta.url).href,
        new URL("./framework-rendering-inspection.js", import.meta.url).href,
        new URL("./framework-rendering-syntax.js", import.meta.url).href,
        new URL("./framework-ts-utils.js", import.meta.url).href,
      ];
    case "observers":
      return [
        ...base,
        new URL("./framework-observer-entities.js", import.meta.url).href,
        new URL("./framework-package-exports.js", import.meta.url).href,
      ];
    case "app-tasks":
    case "router-entities":
    case "expression-entities":
    case "rendering-structures":
      return [
        ...base,
        new URL("./framework-catalog-helpers.js", import.meta.url).href,
        new URL("./framework-catalog-utils.js", import.meta.url).href,
        new URL("./framework-package-exports.js", import.meta.url).href,
        new URL("./framework-structural-entities.js", import.meta.url).href,
      ];
    default:
      return [
        ...base,
        new URL("./framework-entity-catalogs.js", import.meta.url).href,
        new URL("./framework-catalog-helpers.js", import.meta.url).href,
        new URL("./framework-catalog-utils.js", import.meta.url).href,
        new URL("./framework-package-exports.js", import.meta.url).href,
        new URL("./framework-ts-utils.js", import.meta.url).href,
      ];
  }
}

export function frameworkEntityCatalogDependencyPackageIds(
  sourceProject: SourceProject,
  ownerPackageId: string,
): readonly string[] {
  const admittedPackageIds = new Set(AURELIA_FRAMEWORK_PACKAGE_IDS);
  return sourceProject
    .snapshot()
    .summary.packages.map((entry) => entry.id)
    .filter(
      (packageId) =>
        admittedPackageIds.has(packageId as never) &&
        packageId !== ownerPackageId,
    );
}

export function readFrameworkBundleAdmissionCache(
  sourceProject: SourceProject,
  packageId: string,
): readonly FrameworkBundleExportRow[] | undefined {
  if (process.env.ATLAS_FRAMEWORK_JSON_CACHE === "0") {
    return undefined;
  }
  return readFrameworkJsonCachePackage<readonly FrameworkBundleExportRow[]>(
    sourceProject,
    {
      familyId: FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_ID,
      familyVersion: FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_VERSION,
      producerVersion: frameworkBundleAdmissionCacheProducerVersion,
      packageId,
      dependencyPackageIds: frameworkEntityCatalogDependencyPackageIds(
        sourceProject,
        packageId,
      ),
    },
  );
}

export function writeFrameworkBundleAdmissionCache(
  sourceProject: SourceProject,
  packageId: string,
  rows: readonly FrameworkBundleExportRow[],
): void {
  if (process.env.ATLAS_FRAMEWORK_JSON_CACHE === "0") {
    return;
  }
  writeFrameworkJsonCachePackage(
    sourceProject,
    {
      familyId: FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_ID,
      familyVersion: FRAMEWORK_BUNDLE_ADMISSION_CACHE_FAMILY_VERSION,
      producerVersion: frameworkBundleAdmissionCacheProducerVersion,
      packageId,
      dependencyPackageIds: frameworkEntityCatalogDependencyPackageIds(
        sourceProject,
        packageId,
      ),
    },
    rows,
  );
}
