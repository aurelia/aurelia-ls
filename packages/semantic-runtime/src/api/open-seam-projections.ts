import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { AddressHandle, OpenSeamHandle } from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import { SourceFileRole } from '../kernel/address.js';
import { addressBelongsToSourceFiles } from '../kernel/source-address.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  SemanticOpenSeamRow,
  SemanticOpenSeamSiteRow,
  SemanticOpenSeamSiteVariantRow,
  SemanticOpenSeamSummaryRow,
  SemanticSourceRange,
} from './contracts.js';
import type { SemanticSourceReference } from './source-reference.js';
import {
  semanticOpenSeamAttemptForKind,
  semanticOpenSeamBoundaryForKind,
} from './open-seam-interpretation.js';

type RuntimeTemplateResource = AureliaAppWorldProjectEmission['templates']['resources'][number];

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
  recordOpenSeams(rows, emission.routeInstructions.openSeams);
  for (const resource of emission.templates.resources) {
    recordOpenSeams(rows, templateResourceOpenSeams(resource));
  }

  return [...rows.values()];
}

export function openSeamSummaryRows(
  rows: readonly SemanticOpenSeamRow[],
  sourceRangeForSource: (source: SemanticSourceReference | null) => SemanticSourceRange | null = () => null,
): readonly SemanticOpenSeamSummaryRow[] {
  const clusters = new Map<string, OpenSeamSummaryCluster>();
  for (const row of rows) {
    const key = openSeamSummaryKey(row);
    let cluster = clusters.get(key);
    if (cluster == null) {
      cluster = {
        seamKindKey: row.seamKindKey,
        attempt: row.attempt,
        boundary: row.boundary,
        reasonKinds: [...row.reasonKinds],
        count: 0,
        siteKeys: new Set(),
        sourceFiles: new Set<string>(),
        sourceRoles: new Map<string, number>(),
        sampleSummary: row.summary,
        sampleSources: [],
      };
      clusters.set(key, cluster);
    }
    cluster.count += 1;
    cluster.siteKeys.add(openSeamSiteKey(row, semanticOpenSeamSiteSource(row)));
    if (row.sourceRole != null) {
      cluster.sourceRoles.set(row.sourceRole, (cluster.sourceRoles.get(row.sourceRole) ?? 0) + 1);
    }
    for (const source of semanticOpenSeamRowSources(row)) {
      if (source.path != null) {
        cluster.sourceFiles.add(source.path);
      }
      if (cluster.sampleSources.length < 3 && !cluster.sampleSources.some((sample) => sample.label === source.label)) {
        cluster.sampleSources.push(source);
      }
    }
  }
  return [...clusters.values()]
    .map((cluster): SemanticOpenSeamSummaryRow => ({
      seamKindKey: cluster.seamKindKey,
      attempt: cluster.attempt,
      boundary: cluster.boundary,
      reasonKinds: cluster.reasonKinds,
      count: cluster.count,
      uniqueSiteCount: cluster.siteKeys.size,
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
      || left.seamKindKey.localeCompare(right.seamKindKey)
      || left.reasonKinds.join('|').localeCompare(right.reasonKinds.join('|'))
    );
}

export function openSeamSiteRows(
  rows: readonly SemanticOpenSeamRow[],
  sourceRangeForSource: (source: SemanticSourceReference | null) => SemanticSourceRange | null = () => null,
  applicationFileRolesForSource: (source: SemanticSourceReference | null) => SemanticOpenSeamSiteRow['applicationFileRoles'] = () => [],
  staticEvaluationOriginsForSource: (source: SemanticSourceReference | null) => SemanticOpenSeamSiteRow['staticEvaluationOrigins'] = () => [],
): readonly SemanticOpenSeamSiteRow[] {
  const sites = new Map<string, OpenSeamSiteCluster>();
  for (const row of rows) {
    const source = semanticOpenSeamSiteSource(row);
    const key = openSeamSiteKey(row, source);
    let site = sites.get(key);
    if (site == null) {
      site = {
        siteKey: key,
        seamKindKey: row.seamKindKey,
        source,
        sourceRole: row.sourceRole,
        applicationFileRoles: applicationFileRolesForSource(source),
        staticEvaluationOrigins: staticEvaluationOriginsForSource(source),
        sourceRange: sourceRangeForSource(source),
        rawRowCount: 0,
        attemptKinds: new Set(),
        boundaryKinds: new Set(),
        reasonKinds: new Set(),
        sampleSummary: row.summary,
        variants: new Map(),
      };
      sites.set(key, site);
    }
    site.rawRowCount += 1;
    site.attemptKinds.add(row.attempt.kind);
    site.boundaryKinds.add(row.boundary.kind);
    for (const reasonKind of row.reasonKinds) {
      site.reasonKinds.add(reasonKind);
    }

    const variantKey = openSeamSiteVariantKey(row);
    const existingVariant = site.variants.get(variantKey);
    if (existingVariant == null) {
      site.variants.set(variantKey, {
        attempt: row.attempt,
        boundary: row.boundary,
        reasonKinds: [...row.reasonKinds].sort(),
        rawRowCount: 1,
        sampleSummary: row.summary,
      });
    } else {
      existingVariant.rawRowCount += 1;
    }
  }

  return [...sites.values()]
    .map((site): SemanticOpenSeamSiteRow => {
      const variants = [...site.variants.values()]
        .sort((left, right) =>
          right.rawRowCount - left.rawRowCount
          || left.sampleSummary.localeCompare(right.sampleSummary)
        );
      return {
        siteKey: site.siteKey,
        seamKindKey: site.seamKindKey,
        source: site.source,
        sourceRole: site.sourceRole,
        applicationFileRoles: site.applicationFileRoles,
        staticEvaluationOrigins: site.staticEvaluationOrigins,
        sourceRange: site.sourceRange,
        rawRowCount: site.rawRowCount,
        variantCount: variants.length,
        attemptKinds: [...site.attemptKinds].sort(),
        boundaryKinds: [...site.boundaryKinds].sort(),
        reasonKinds: [...site.reasonKinds].sort(),
        sampleSummary: site.sampleSummary,
        variantSamples: variants.slice(0, 5).map((variant) => ({
          attempt: variant.attempt,
          boundary: variant.boundary,
          reasonKinds: variant.reasonKinds,
          rawRowCount: variant.rawRowCount,
          sampleSummary: variant.sampleSummary,
        })),
      };
    })
    .sort((left, right) =>
      openSeamSourceRoleSortRank(left.sourceRole) - openSeamSourceRoleSortRank(right.sourceRole)
      || right.rawRowCount - left.rawRowCount
      || left.seamKindKey.localeCompare(right.seamKindKey)
      || openSeamSourceSortKey(left.source).localeCompare(openSeamSourceSortKey(right.source))
    );
}

interface OpenSeamSummaryCluster {
  readonly seamKindKey: SemanticOpenSeamRow['seamKindKey'];
  readonly attempt: SemanticOpenSeamRow['attempt'];
  readonly boundary: SemanticOpenSeamRow['boundary'];
  readonly reasonKinds: SemanticOpenSeamSummaryRow['reasonKinds'];
  count: number;
  readonly siteKeys: Set<string>;
  readonly sourceFiles: Set<string>;
  readonly sourceRoles: Map<string, number>;
  readonly sampleSummary: string;
  readonly sampleSources: NonNullable<SemanticOpenSeamRow['source']>[];
}

interface OpenSeamSiteCluster {
  readonly siteKey: string;
  readonly seamKindKey: SemanticOpenSeamRow['seamKindKey'];
  readonly source: SemanticSourceReference | null;
  readonly sourceRole: SemanticOpenSeamRow['sourceRole'];
  readonly applicationFileRoles: SemanticOpenSeamSiteRow['applicationFileRoles'];
  readonly staticEvaluationOrigins: SemanticOpenSeamSiteRow['staticEvaluationOrigins'];
  readonly sourceRange: SemanticSourceRange | null;
  rawRowCount: number;
  readonly attemptKinds: Set<SemanticOpenSeamRow['attempt']['kind']>;
  readonly boundaryKinds: Set<SemanticOpenSeamRow['boundary']['kind']>;
  readonly reasonKinds: Set<SemanticOpenSeamRow['reasonKinds'][number]>;
  readonly sampleSummary: string;
  readonly variants: Map<string, MutableOpenSeamSiteVariantRow>;
}

type MutableOpenSeamSiteVariantRow = Omit<SemanticOpenSeamSiteVariantRow, 'rawRowCount'> & {
  rawRowCount: number;
};

function openSeamSummaryKey(row: SemanticOpenSeamRow): string {
  return [
    row.seamKindKey,
    row.attempt.kind,
    row.boundary.kind,
    [...row.reasonKinds].sort().join('|'),
  ].join('\0');
}

function openSeamSiteKey(
  row: SemanticOpenSeamRow,
  source: SemanticSourceReference | null,
): string {
  const exact = semanticExactSourceReference(source);
  if (exact?.path != null && exact.start != null && exact.end != null) {
    return `${exact.path}@${exact.start}..${exact.end}#${row.seamKindKey}`;
  }
  return `${row.seamKindKey}@${source?.label ?? '(no source)'}#${normalizeOpenSeamSummary(row.summary)}`;
}

function openSeamSiteVariantKey(row: SemanticOpenSeamRow): string {
  return [
    row.attempt.kind,
    row.boundary.kind,
    [...row.reasonKinds].sort().join('|'),
    normalizeOpenSeamSummary(row.summary),
  ].join('\0');
}

function semanticOpenSeamSiteSource(
  row: SemanticOpenSeamRow,
): SemanticSourceReference | null {
  return semanticOpenSeamRowSources(row)[0] ?? row.source;
}

function semanticExactSourceReference(
  source: SemanticSourceReference | null,
): SemanticSourceReference | null {
  if (source == null) {
    return null;
  }
  if (source.path != null && source.start != null && source.end != null) {
    return source;
  }
  return semanticExactSourceReference(source.anchor ?? null);
}

function normalizeOpenSeamSummary(summary: string): string {
  return summary.replace(/\s+/gu, ' ').trim();
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

export function semanticOpenSeamAttemptForRow(
  row: Pick<SemanticOpenSeamRow, 'seamKindKey'>,
): SemanticOpenSeamRow['attempt'] {
  return semanticOpenSeamAttemptForKind(row.seamKindKey);
}

export function semanticOpenSeamBoundaryForRow(
  row: Pick<SemanticOpenSeamRow, 'seamKindKey'>,
): SemanticOpenSeamRow['boundary'] {
  return semanticOpenSeamBoundaryForKind(row.seamKindKey);
}

function semanticOpenSeamRowSources(
  row: SemanticOpenSeamRow,
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
    ...resource.runtimeAnalysis.runtimeRendering.openSeams,
    ...resource.runtimeAnalysis.controllerBind.openSeams,
    ...resource.runtimeAnalysis.bindingValueChannel.openSeams,
    ...resource.runtimeAnalysis.bindingDataFlow.openSeams,
    ...resource.runtimeAnalysis.runtimeComposition.openSeams,
  ];
}

function sourceFileAddressHandles(emission: AureliaAppWorldProjectEmission): ReadonlySet<AddressHandle> {
  return new Set([
    ...emission.project.sourceFiles.map((source) => source.addressHandle),
    ...emission.evaluation.sources.map((source) => source.admission.addressHandle),
    ...emission.resources.sources.map((source) => source.admission.addressHandle),
  ]);
}
