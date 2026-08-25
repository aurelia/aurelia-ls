import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import { SourceFileRole } from '../kernel/address.js';
import type {
  AddressHandle,
  IdentityHandle,
  MaterializationHandle,
  OpenSeamHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  MaterializationOwnerHandle,
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  openSeamBoundaryKindForReason,
  type OpenSeam,
} from '../kernel/open-seam.js';
import { addressBelongsToSourceFiles } from '../kernel/source-address.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  SemanticOpenSeamMaterializationImpactRow,
  SemanticOpenSeamMaterializationOwnerRow,
  SemanticOpenSeamMaterializedProductRow,
  SemanticOpenSeamReasonSource,
  SemanticOpenSeamRow,
  SemanticOpenSeamSiteRow,
  SemanticOpenSeamSiteVariantRow,
  SemanticOpenSeamSummaryRow,
  SemanticSourceRange,
} from './contracts.js';
import {
  SemanticOpenSeamMaterializationOutcome,
  SemanticOpenSeamPressureKind,
} from './contracts.js';
import {
  describeAddress,
  describeIdentityReference,
  describeSourceAnchorHandle,
  semanticExactSourceReference,
  semanticSourceReferenceFileKey,
  semanticSourceReferenceKey,
  type SemanticSourceReference,
} from './source-reference.js';

type RuntimeTemplateResource = AureliaAppWorldProjectEmission['templates']['resources'][number];

export interface OpenSeamProjectionFact {
  readonly seam: OpenSeam;
  readonly seamKey: string;
  readonly siteKey: string;
  readonly seamKindKey: OpenSeam['seamKindKey'];
  readonly summary: string;
  readonly boundaryKinds: SemanticOpenSeamRow['boundaryKinds'];
  readonly reasonKinds: SemanticOpenSeamRow['reasonKinds'];
  readonly reasonSources: readonly OpenSeamReasonSourceFact[];
  readonly pressureKind: SemanticOpenSeamRow['pressureKind'];
  readonly impacts: readonly OpenSeamMaterializationImpactFact[];
  readonly source: SemanticSourceReference | null;
  readonly sourceRole: SemanticOpenSeamRow['sourceRole'];
}

interface OpenSeamReasonSourceFact {
  readonly reasonKind: SemanticOpenSeamReasonSource['reasonKind'];
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
  readonly addressHandle: AddressHandle | null;
  readonly evidenceHandle: OpenSeam['evidenceHandle'];
}

interface OpenSeamMaterializationImpactFact {
  readonly impactKey: string;
  readonly materialization: MaterializationRecord;
  readonly outcome: SemanticOpenSeamMaterializationImpactRow['outcome'];
  readonly owner: Omit<SemanticOpenSeamMaterializationOwnerRow, 'handles'>;
  readonly products: readonly OpenSeamMaterializedProductFact[];
}

interface OpenSeamMaterializedProductFact {
  readonly productKey: string;
  readonly product: MaterializedProduct;
  readonly source: SemanticSourceReference | null;
}

/**
 * Read open seams owned by the app-world emission instead of the whole shared workspace store.
 *
 * The kernel store is intentionally shared across a booted workspace. In monorepos, opening more than one app should
 * not make `app.openSeams()` accumulate seams from previously opened project frames.
 */
export function readAppOpenSeams(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): readonly OpenSeam[] {
  const sourceFileHandles = sourceFileAddressHandles(emission);
  const rows = new Map<OpenSeamHandle, OpenSeam>();

  recordSourceFileOpenSeams(rows, store, sourceFileHandles);
  recordOpenSeams(rows, emission.appWorld.diWorld.openSeams);
  recordOpenSeams(rows, emission.routeRuntimeTopology.openSeams);
  recordOpenSeams(rows, emission.routeInstructions.openSeams);
  for (const resource of emission.templates.resources) {
    recordOpenSeams(rows, templateResourceOpenSeams(resource));
  }

  return [...rows.values()];
}

/** Build one compact causal fact set shared by raw rows, summaries, and authored-site projections. */
export function openSeamProjectionFacts(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  sourceRoleForSource: (source: SemanticSourceReference | null) => SemanticOpenSeamRow['sourceRole'],
): readonly OpenSeamProjectionFact[] {
  const seams = readAppOpenSeams(emission, store);
  const seamHandles = new Set(seams.map((seam) => seam.handle));
  const materializations = store.readMaterializations()
    .filter((materialization) =>
      materialization.openSeamHandles.some((handle) => seamHandles.has(handle))
    );
  const keys = new OpenSeamAnswerKeys(seams, materializations);
  const impactsBySeam = openSeamImpactsByHandle(store, seamHandles, materializations, keys);
  return seams
    .map((seam): OpenSeamProjectionFact => {
      const seamKey = keys.seam(seam.handle);
      const source = describeAddress(store, seam.addressHandle);
      const reasonSources = seam.reasonSources.map((reasonSource): OpenSeamReasonSourceFact => ({
        reasonKind: reasonSource.reasonKind,
        summary: reasonSource.summary,
        source: describeAddress(store, reasonSource.addressHandle),
        addressHandle: reasonSource.addressHandle,
        evidenceHandle: reasonSource.evidenceHandle ?? null,
      }));
      const impacts = impactsBySeam.get(seam.handle) ?? [];
      return {
        seam,
        seamKey,
        siteKey: openSeamSiteKey(source, seamKey),
        seamKindKey: seam.seamKindKey,
        summary: seam.summary,
        boundaryKinds: [...new Set(seam.reasonKinds.map(openSeamBoundaryKindForReason))].sort(),
        reasonKinds: seam.reasonKinds,
        reasonSources,
        pressureKind: impacts.length === 0
          ? SemanticOpenSeamPressureKind.EvidenceOnly
          : SemanticOpenSeamPressureKind.ProductPressure,
        impacts,
        source,
        sourceRole: sourceRoleForSource(source),
      };
    })
    .sort((left, right) =>
      openSeamSourceSortKey(left.source).localeCompare(openSeamSourceSortKey(right.source))
      || left.seamKindKey.localeCompare(right.seamKindKey)
      || left.reasonKinds.join('|').localeCompare(right.reasonKinds.join('|'))
      || left.seamKey.localeCompare(right.seamKey)
    );
}

/** Expand compact seam facts into public rows without leaking raw handles into ordinary keys. */
export function openSeamRows(
  facts: readonly OpenSeamProjectionFact[],
  handles: boolean,
  sourceRangeForSource: (source: SemanticSourceReference | null) => SemanticSourceRange | null = () => null,
): readonly SemanticOpenSeamRow[] {
  return facts.map((fact): SemanticOpenSeamRow => ({
    seamKey: fact.seamKey,
    siteKey: fact.siteKey,
    seamKindKey: fact.seamKindKey,
    summary: fact.summary,
    boundaryKinds: fact.boundaryKinds,
    reasonKinds: fact.reasonKinds,
    reasonSources: fact.reasonSources.map((reasonSource): SemanticOpenSeamReasonSource => ({
      reasonKind: reasonSource.reasonKind,
      summary: reasonSource.summary,
      source: reasonSource.source,
      sourceRange: sourceRangeForSource(reasonSource.source),
      ...(handles ? {
        handles: {
          addressHandle: reasonSource.addressHandle,
          evidenceHandle: reasonSource.evidenceHandle,
        },
      } : {}),
    })),
    pressureKind: fact.pressureKind,
    affectedMaterializationCount: fact.impacts.length,
    affectedProductCount: new Set(
      fact.impacts.flatMap((impact) => impact.products.map((product) => product.productKey)),
    ).size,
    impacts: fact.impacts.map((impact): SemanticOpenSeamMaterializationImpactRow => ({
      impactKey: impact.impactKey,
      outcome: impact.outcome,
      owner: {
        ...impact.owner,
        ...(handles ? {
          handles: {
            ownerHandle: impact.materialization.ownerHandle,
          },
        } : {}),
      },
      products: impact.products.map((product): SemanticOpenSeamMaterializedProductRow => ({
        productKey: product.productKey,
        productKindKey: product.product.productKindKey,
        source: product.source,
        ...(handles ? {
          handles: {
            productHandle: product.product.handle,
            identityHandle: product.product.identityHandle,
            addressHandle: product.product.addressHandle,
          },
        } : {}),
      })),
      ...(handles ? {
        handles: {
          materializationHandle: impact.materialization.handle,
          ownerHandle: impact.materialization.ownerHandle,
        },
      } : {}),
    })),
    source: fact.source,
    sourceRange: sourceRangeForSource(fact.source),
    sourceRole: fact.sourceRole,
    ...(handles ? {
      handles: {
        handle: fact.seam.handle,
        addressHandle: fact.seam.addressHandle,
      },
    } : {}),
  }));
}

/** Stable authored-site identity when exact source exists, otherwise an opaque answer-local key. */
export function openSeamSiteKey(
  source: SemanticSourceReference | null,
  fallbackSeamKey: string,
): string {
  const exact = semanticExactSourceReference(source);
  if (exact?.path != null && exact.start != null && exact.end != null) {
    return `source-site:${JSON.stringify([
      exact.sourceWorkspaceKey ?? '',
      exact.path,
      exact.start,
      exact.end,
    ])}`;
  }
  return `answer-site:${fallbackSeamKey}`;
}

class OpenSeamAnswerKeys {
  private readonly seamKeys: ReadonlyMap<OpenSeamHandle, string>;
  private readonly materializationKeys: ReadonlyMap<MaterializationHandle, string>;
  private readonly ownerKeys: ReadonlyMap<MaterializationOwnerHandle, string>;
  private readonly productKeys: ReadonlyMap<ProductHandle, string>;

  constructor(
    seams: readonly OpenSeam[],
    materializations: readonly MaterializationRecord[],
  ) {
    this.seamKeys = answerLocalHandleKeys('seam', seams.map((seam) => seam.handle));
    this.materializationKeys = answerLocalHandleKeys(
      'impact',
      materializations.map((materialization) => materialization.handle),
    );
    this.ownerKeys = answerLocalHandleKeys(
      'owner',
      materializations.map((materialization) => materialization.ownerHandle),
    );
    this.productKeys = answerLocalHandleKeys(
      'product',
      materializations.flatMap((materialization) => materialization.productHandles),
    );
  }

  seam(handle: OpenSeamHandle): string {
    return requiredAnswerLocalKey(this.seamKeys, handle);
  }

  materialization(handle: MaterializationHandle): string {
    return requiredAnswerLocalKey(this.materializationKeys, handle);
  }

  owner(handle: MaterializationOwnerHandle): string {
    return requiredAnswerLocalKey(this.ownerKeys, handle);
  }

  product(handle: ProductHandle): string {
    return requiredAnswerLocalKey(this.productKeys, handle);
  }
}

function openSeamImpactsByHandle(
  store: KernelStore,
  seamHandles: ReadonlySet<OpenSeamHandle>,
  materializations: readonly MaterializationRecord[],
  keys: OpenSeamAnswerKeys,
): ReadonlyMap<OpenSeamHandle, readonly OpenSeamMaterializationImpactFact[]> {
  const impacts = new Map<OpenSeamHandle, OpenSeamMaterializationImpactFact[]>();
  for (const materialization of materializations) {
    const matchingSeams = materialization.openSeamHandles.filter((handle) => seamHandles.has(handle));
    const products = materialization.productHandles.map((productHandle): OpenSeamMaterializedProductFact => {
      const product = store.readProduct(productHandle);
      if (product == null) {
        throw new Error(`Materialization '${materialization.handle}' references missing product '${productHandle}'.`);
      }
      return {
        productKey: keys.product(product.handle),
        product,
        source: describeAddress(store, product.addressHandle)
          ?? describeSourceAnchorHandle(store, product.identityHandle),
      };
    });
    const impact: OpenSeamMaterializationImpactFact = {
      impactKey: keys.materialization(materialization.handle),
      materialization,
      outcome: products.length === 0
        ? SemanticOpenSeamMaterializationOutcome.OpenWithoutProduct
        : SemanticOpenSeamMaterializationOutcome.OpenWithProduct,
      owner: openSeamMaterializationOwner(store, materialization.ownerHandle, keys.owner(materialization.ownerHandle)),
      products,
    };
    for (const seamHandle of matchingSeams) {
      const rows = impacts.get(seamHandle) ?? [];
      rows.push(impact);
      impacts.set(seamHandle, rows);
    }
  }
  for (const rows of impacts.values()) {
    rows.sort((left, right) => left.impactKey.localeCompare(right.impactKey));
  }
  return impacts;
}

function openSeamMaterializationOwner(
  store: KernelStore,
  ownerHandle: MaterializationOwnerHandle,
  ownerKey: string,
): Omit<SemanticOpenSeamMaterializationOwnerRow, 'handles'> {
  const address = store.readAddress(ownerHandle as AddressHandle);
  const identity = store.readIdentity(ownerHandle as IdentityHandle);
  const reference = address == null
    ? identity == null ? null : describeIdentityReference(identity)
    : describeAddress(store, address.handle);
  if (reference == null) {
    throw new Error(`Materialization owner '${ownerHandle}' is not an indexed address or identity.`);
  }
  return {
    ownerKey,
    recordKind: address?.kind ?? identity!.kind,
    label: reference.label,
    source: describeSourceAnchorHandle(store, ownerHandle),
  };
}

function answerLocalHandleKeys<THandle extends string>(
  prefix: string,
  handles: readonly THandle[],
): ReadonlyMap<THandle, string> {
  return new Map(
    [...new Set(handles)]
      .sort()
      .map((handle, index) => [handle, `${prefix}:${index + 1}`] as const),
  );
}

function requiredAnswerLocalKey<THandle extends string>(
  keys: ReadonlyMap<THandle, string>,
  handle: THandle,
): string {
  const key = keys.get(handle);
  if (key == null) {
    throw new Error(`Missing answer-local key for '${handle}'.`);
  }
  return key;
}

export function openSeamSummaryRows(
  rows: readonly OpenSeamProjectionFact[],
  sourceRangeForSource: (source: SemanticSourceReference | null) => SemanticSourceRange | null = () => null,
): readonly SemanticOpenSeamSummaryRow[] {
  const clusters = new Map<string, OpenSeamSummaryCluster>();
  for (const row of rows) {
    const key = openSeamClusterKey(row);
    let cluster = clusters.get(key);
    if (cluster == null) {
      cluster = {
        clusterKey: key,
        seamKindKey: row.seamKindKey,
        boundaryCounts: new Map(),
        pressureCounts: new Map(),
        reasonCounts: new Map(),
        count: 0,
        evidenceOnlyRowCount: 0,
        productPressureRowCount: 0,
        siteKeys: new Set(),
        impactKeys: new Set(),
        productKeys: new Set(),
        sourceFiles: new Set<string>(),
        sourceRoles: new Map<string, number>(),
        sampleSummary: row.summary,
        sampleSources: [],
      };
      clusters.set(key, cluster);
    }
    cluster.count += 1;
    if (row.pressureKind === SemanticOpenSeamPressureKind.EvidenceOnly) {
      cluster.evidenceOnlyRowCount += 1;
    } else {
      cluster.productPressureRowCount += 1;
    }
    incrementOpenSeamCounts(cluster.boundaryCounts, row.boundaryKinds);
    incrementOpenSeamCounts(cluster.pressureCounts, [row.pressureKind]);
    incrementOpenSeamCounts(cluster.reasonCounts, row.reasonKinds);
    cluster.siteKeys.add(row.siteKey);
    for (const impact of row.impacts) {
      cluster.impactKeys.add(impact.impactKey);
      for (const product of impact.products) {
        cluster.productKeys.add(product.productKey);
      }
    }
    if (row.sourceRole != null) {
      cluster.sourceRoles.set(row.sourceRole, (cluster.sourceRoles.get(row.sourceRole) ?? 0) + 1);
    }
    for (const source of semanticOpenSeamRowSources(row)) {
      const sourceFileKey = semanticSourceReferenceFileKey(source);
      if (sourceFileKey != null) {
        cluster.sourceFiles.add(sourceFileKey);
      }
      if (
        cluster.sampleSources.length < 3
        && !cluster.sampleSources.some((sample) =>
          semanticSourceReferenceKey(sample) === semanticSourceReferenceKey(source)
        )
      ) {
        cluster.sampleSources.push(source);
      }
    }
  }
  return [...clusters.values()]
    .map((cluster): SemanticOpenSeamSummaryRow => ({
      clusterKey: cluster.clusterKey,
      seamKindKey: cluster.seamKindKey,
      boundaryKinds: [...cluster.boundaryCounts.keys()].sort(),
      boundaryCounts: openSeamCountRows(cluster.boundaryCounts),
      pressureKinds: [...cluster.pressureCounts.keys()].sort(),
      pressureCounts: openSeamCountRows(cluster.pressureCounts),
      reasonKinds: [...cluster.reasonCounts.keys()].sort(),
      reasonCounts: openSeamCountRows(cluster.reasonCounts),
      count: cluster.count,
      evidenceOnlyRowCount: cluster.evidenceOnlyRowCount,
      productPressureRowCount: cluster.productPressureRowCount,
      uniqueSiteCount: cluster.siteKeys.size,
      affectedMaterializationCount: cluster.impactKeys.size,
      affectedProductCount: cluster.productKeys.size,
      sourceFileCount: cluster.sourceFiles.size,
      sourceRoles: openSeamSourceRoleCounts(cluster.sourceRoles),
      sampleSummary: cluster.sampleSummary,
      sampleSources: cluster.sampleSources,
      sampleSourceSites: cluster.sampleSources.map((source) => ({
        source,
        sourceRange: sourceRangeForSource(source),
      })),
    }))
    .sort((left, right) =>
      right.count - left.count
      || left.clusterKey.localeCompare(right.clusterKey)
    );
}

export function openSeamSiteRows(
  rows: readonly OpenSeamProjectionFact[],
  sourceRangeForSource: (source: SemanticSourceReference | null) => SemanticSourceRange | null = () => null,
  applicationFileRolesForSource: (source: SemanticSourceReference | null) => SemanticOpenSeamSiteRow['applicationFileRoles'] = () => [],
  staticEvaluationOriginsForSource: (source: SemanticSourceReference | null) => SemanticOpenSeamSiteRow['staticEvaluationOrigins'] = () => [],
): readonly SemanticOpenSeamSiteRow[] {
  const sites = new Map<string, OpenSeamSiteCluster>();
  for (const row of rows) {
    const source = semanticOpenSeamSiteSource(row);
    let site = sites.get(row.siteKey);
    if (site == null) {
      site = {
        siteKey: row.siteKey,
        source,
        sourceRole: row.sourceRole,
        applicationFileRoles: applicationFileRolesForSource(source),
        staticEvaluationOrigins: staticEvaluationOriginsForSource(source),
        sourceRange: sourceRangeForSource(source),
        rawRowCount: 0,
        seamKindKeys: new Set(),
        boundaryCounts: new Map(),
        pressureCounts: new Map(),
        reasonCounts: new Map(),
        impactKeys: new Set(),
        productKeys: new Set(),
        sampleSummary: row.summary,
        variants: new Map(),
      };
      sites.set(row.siteKey, site);
    } else if (
      openSeamSourceSortKey(site.source) !== openSeamSourceSortKey(source)
      || site.sourceRole !== row.sourceRole
    ) {
      throw new Error(`Open seam authored-site key '${row.siteKey}' joined incompatible root source facts.`);
    }
    site.rawRowCount += 1;
    site.seamKindKeys.add(row.seamKindKey);
    incrementOpenSeamCounts(site.boundaryCounts, row.boundaryKinds);
    incrementOpenSeamCounts(site.pressureCounts, [row.pressureKind]);
    incrementOpenSeamCounts(site.reasonCounts, row.reasonKinds);
    for (const impact of row.impacts) {
      site.impactKeys.add(impact.impactKey);
      for (const product of impact.products) {
        site.productKeys.add(product.productKey);
      }
    }

    const variantKey = openSeamSiteVariantKey(row);
    const existingVariant = site.variants.get(variantKey);
    if (existingVariant == null) {
      site.variants.set(variantKey, {
        seamKindKey: row.seamKindKey,
        boundaryKinds: [...row.boundaryKinds],
        reasonKinds: [...row.reasonKinds].sort(),
        rawRowCount: 1,
        evidenceOnlyRowCount: row.pressureKind === SemanticOpenSeamPressureKind.EvidenceOnly ? 1 : 0,
        productPressureRowCount: row.pressureKind === SemanticOpenSeamPressureKind.ProductPressure ? 1 : 0,
        pressureKinds: new Set([row.pressureKind]),
        impactKeys: new Set(row.impacts.map((impact) => impact.impactKey)),
        productKeys: new Set(row.impacts.flatMap((impact) => impact.products.map((product) => product.productKey))),
        sampleSummary: row.summary,
      });
    } else {
      existingVariant.rawRowCount += 1;
      existingVariant.pressureKinds.add(row.pressureKind);
      if (row.pressureKind === SemanticOpenSeamPressureKind.EvidenceOnly) {
        existingVariant.evidenceOnlyRowCount += 1;
      } else {
        existingVariant.productPressureRowCount += 1;
      }
      for (const impact of row.impacts) {
        existingVariant.impactKeys.add(impact.impactKey);
        for (const product of impact.products) {
          existingVariant.productKeys.add(product.productKey);
        }
      }
    }
  }

  return [...sites.values()]
    .map((site): SemanticOpenSeamSiteRow => {
      const variants = [...site.variants.values()]
        .sort((left, right) =>
          right.rawRowCount - left.rawRowCount
          || left.seamKindKey.localeCompare(right.seamKindKey)
          || left.sampleSummary.localeCompare(right.sampleSummary)
        );
      const variantSamples = variants.length === 1 && variants[0]?.sampleSummary === site.sampleSummary
        ? []
        : variants.slice(0, 5).map(openSeamSiteVariantRow);
      return {
        siteKey: site.siteKey,
        seamKindKeys: [...site.seamKindKeys].sort(),
        source: site.source,
        sourceRole: site.sourceRole,
        applicationFileRoles: site.applicationFileRoles,
        staticEvaluationOrigins: site.staticEvaluationOrigins,
        sourceRange: site.sourceRange,
        rawRowCount: site.rawRowCount,
        variantCount: variants.length,
        boundaryKinds: [...site.boundaryCounts.keys()].sort(),
        boundaryCounts: openSeamCountRows(site.boundaryCounts),
        pressureKinds: [...site.pressureCounts.keys()].sort(),
        pressureCounts: openSeamCountRows(site.pressureCounts),
        reasonKinds: [...site.reasonCounts.keys()].sort(),
        reasonCounts: openSeamCountRows(site.reasonCounts),
        affectedMaterializationCount: site.impactKeys.size,
        affectedProductCount: site.productKeys.size,
        sampleSummary: site.sampleSummary,
        variantSamples,
      };
    })
    .sort((left, right) =>
      openSeamSourceRoleSortRank(left.sourceRole) - openSeamSourceRoleSortRank(right.sourceRole)
      || right.rawRowCount - left.rawRowCount
      || (left.seamKindKeys[0] ?? '').localeCompare(right.seamKindKeys[0] ?? '')
      || openSeamSourceSortKey(left.source).localeCompare(openSeamSourceSortKey(right.source))
    );
}

interface OpenSeamSummaryCluster {
  readonly clusterKey: string;
  readonly seamKindKey: SemanticOpenSeamRow['seamKindKey'];
  readonly boundaryCounts: Map<SemanticOpenSeamRow['boundaryKinds'][number], number>;
  readonly pressureCounts: Map<SemanticOpenSeamRow['pressureKind'], number>;
  readonly reasonCounts: Map<SemanticOpenSeamRow['reasonKinds'][number], number>;
  count: number;
  evidenceOnlyRowCount: number;
  productPressureRowCount: number;
  readonly siteKeys: Set<string>;
  readonly impactKeys: Set<string>;
  readonly productKeys: Set<string>;
  readonly sourceFiles: Set<string>;
  readonly sourceRoles: Map<string, number>;
  readonly sampleSummary: string;
  readonly sampleSources: NonNullable<SemanticOpenSeamRow['source']>[];
}

interface OpenSeamSiteCluster {
  readonly siteKey: string;
  readonly source: SemanticSourceReference | null;
  readonly sourceRole: SemanticOpenSeamRow['sourceRole'];
  readonly applicationFileRoles: SemanticOpenSeamSiteRow['applicationFileRoles'];
  readonly staticEvaluationOrigins: SemanticOpenSeamSiteRow['staticEvaluationOrigins'];
  readonly sourceRange: SemanticSourceRange | null;
  rawRowCount: number;
  readonly seamKindKeys: Set<SemanticOpenSeamRow['seamKindKey']>;
  readonly boundaryCounts: Map<SemanticOpenSeamRow['boundaryKinds'][number], number>;
  readonly pressureCounts: Map<SemanticOpenSeamRow['pressureKind'], number>;
  readonly reasonCounts: Map<SemanticOpenSeamRow['reasonKinds'][number], number>;
  readonly impactKeys: Set<string>;
  readonly productKeys: Set<string>;
  readonly sampleSummary: string;
  readonly variants: Map<string, MutableOpenSeamSiteVariant>;
}

interface MutableOpenSeamSiteVariant {
  readonly seamKindKey: SemanticOpenSeamSiteVariantRow['seamKindKey'];
  readonly boundaryKinds: SemanticOpenSeamSiteVariantRow['boundaryKinds'];
  readonly pressureKinds: Set<SemanticOpenSeamRow['pressureKind']>;
  readonly reasonKinds: SemanticOpenSeamSiteVariantRow['reasonKinds'];
  rawRowCount: number;
  evidenceOnlyRowCount: number;
  productPressureRowCount: number;
  readonly impactKeys: Set<string>;
  readonly productKeys: Set<string>;
  readonly sampleSummary: string;
}

function openSeamSiteVariantRow(
  variant: MutableOpenSeamSiteVariant,
): SemanticOpenSeamSiteVariantRow {
  return {
    seamKindKey: variant.seamKindKey,
    boundaryKinds: variant.boundaryKinds,
    pressureKinds: [...variant.pressureKinds].sort(),
    reasonKinds: variant.reasonKinds,
    rawRowCount: variant.rawRowCount,
    evidenceOnlyRowCount: variant.evidenceOnlyRowCount,
    productPressureRowCount: variant.productPressureRowCount,
    affectedMaterializationCount: variant.impactKeys.size,
    affectedProductCount: variant.productKeys.size,
    sampleSummary: variant.sampleSummary,
  };
}

/** Stable answer identity for the causal class represented by one open-seam summary row. */
export function openSeamClusterKey(row: OpenSeamProjectionFact): string {
  return [
    row.seamKindKey,
    [...row.reasonKinds].sort().join('|'),
  ].join('\0');
}

function openSeamSiteVariantKey(row: OpenSeamProjectionFact): string {
  return [
    row.seamKindKey,
    [...row.reasonKinds].sort().join('|'),
  ].join('\0');
}

function semanticOpenSeamSiteSource(
  row: OpenSeamProjectionFact,
): SemanticSourceReference | null {
  return row.source;
}

function openSeamSourceSortKey(source: SemanticSourceReference | null): string {
  const exact = semanticExactSourceReference(source);
  return exact?.path == null
    ? source?.label ?? ''
    : `${exact.path}:${exact.start ?? -1}:${exact.end ?? -1}`;
}

function openSeamSourceRoleSortRank(
  role: string | null,
): number {
  switch (role) {
    case SourceFileRole.AppSource:
    case SourceFileRole.Template:
    case SourceFileRole.Style:
    case SourceFileRole.RootDocument:
      return 0;
    case SourceFileRole.TestSource:
    case SourceFileRole.ExampleSource:
      return 1;
    case SourceFileRole.PackageManifest:
    case SourceFileRole.ToolingConfig:
    case SourceFileRole.ToolingScript:
      return 2;
    case SourceFileRole.Generated:
      return 3;
    case SourceFileRole.Declaration:
      return 4;
    case SourceFileRole.ExternalSource:
      return 5;
    case SourceFileRole.Unknown:
    case null:
      return 6;
    default:
      return 6;
  }
}

function openSeamSourceRoleCounts(
  roles: ReadonlyMap<string, number>,
): SemanticOpenSeamSummaryRow['sourceRoles'] {
  return [...roles.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role));
}

function incrementOpenSeamCounts<TKey extends string>(
  counts: Map<TKey, number>,
  values: readonly TKey[],
): void {
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
}

function openSeamCountRows<TKey extends string>(
  counts: ReadonlyMap<TKey, number>,
): readonly { readonly key: string; readonly count: number }[] {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function semanticOpenSeamRowSources(
  row: OpenSeamProjectionFact,
): readonly NonNullable<SemanticOpenSeamRow['source']>[] {
  return [
    row.source,
    ...row.reasonSources.map((source) => source.source),
  ].filter((source): source is NonNullable<SemanticOpenSeamRow['source']> => source != null);
}

function recordSourceFileOpenSeams(
  rows: Map<OpenSeamHandle, OpenSeam>,
  store: KernelStore,
  sourceFileHandles: ReadonlySet<AddressHandle>,
): void {
  for (const seam of store.readOpenSeams()) {
    if (seam.addressHandle != null && addressBelongsToSourceFiles(store, seam.addressHandle, sourceFileHandles)) {
      rows.set(seam.handle, seam);
    }
  }
}

function recordOpenSeams(
  rows: Map<OpenSeamHandle, OpenSeam>,
  seams: readonly OpenSeam[],
): void {
  for (const seam of seams) {
    rows.set(seam.handle, seam);
  }
}

function templateResourceOpenSeams(resource: RuntimeTemplateResource): readonly OpenSeam[] {
  return [
    ...resource.compilation.compiledTemplate.openSeams,
    ...resource.runtimeAnalysis.readOpenSeams(),
  ];
}

function sourceFileAddressHandles(emission: AureliaAppWorldProjectEmission): ReadonlySet<AddressHandle> {
  return new Set([
    ...emission.project.sourceFiles.map((source) => source.addressHandle),
    ...emission.evaluation.sources.map((source) => source.admission.addressHandle),
    ...emission.resources.sources.map((source) => source.admission.addressHandle),
  ]);
}
