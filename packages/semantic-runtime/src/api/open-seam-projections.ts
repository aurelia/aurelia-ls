import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { AddressHandle, OpenSeamHandle } from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import { addressBelongsToSourceFiles } from '../kernel/source-address.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  SemanticOpenSeamRow,
  SemanticOpenSeamSummaryRow,
} from './contracts.js';

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
): readonly SemanticOpenSeamSummaryRow[] {
  const clusters = new Map<string, OpenSeamSummaryCluster>();
  for (const row of rows) {
    const key = openSeamSummaryKey(row);
    let cluster = clusters.get(key);
    if (cluster == null) {
      cluster = {
        seamKindKey: row.seamKindKey,
        reasonKinds: [...row.reasonKinds],
        count: 0,
        sourceFiles: new Set<string>(),
        sampleSummary: row.summary,
        sampleSources: [],
      };
      clusters.set(key, cluster);
    }
    cluster.count += 1;
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
      reasonKinds: cluster.reasonKinds,
      count: cluster.count,
      sourceFileCount: cluster.sourceFiles.size,
      sampleSummary: cluster.sampleSummary,
      sampleSources: cluster.sampleSources,
    }))
    .sort((left, right) =>
      right.count - left.count
      || left.seamKindKey.localeCompare(right.seamKindKey)
      || left.reasonKinds.join('|').localeCompare(right.reasonKinds.join('|'))
    );
}

interface OpenSeamSummaryCluster {
  readonly seamKindKey: SemanticOpenSeamRow['seamKindKey'];
  readonly reasonKinds: SemanticOpenSeamSummaryRow['reasonKinds'];
  count: number;
  readonly sourceFiles: Set<string>;
  readonly sampleSummary: string;
  readonly sampleSources: NonNullable<SemanticOpenSeamRow['source']>[];
}

function openSeamSummaryKey(row: SemanticOpenSeamRow): string {
  return [
    row.seamKindKey,
    [...row.reasonKinds].sort().join('|'),
  ].join('\0');
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
