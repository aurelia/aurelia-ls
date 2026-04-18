import type { AnalysisViews } from './analysis-views.js';
import { createAnalysisProvenanceEntry } from './analysis-surface.js';
import type { WorldFrame, InquiryCarrierProvenanceEntry } from './inquiry-model.js';

export const ANALYSIS_METADATA_KINDS = [
  'deps',
  'typerefs',
  'exports',
] as const;

export type AnalysisMetadataKind =
  typeof ANALYSIS_METADATA_KINDS[number];

export interface AnalysisSnapshotMetadata {
  readonly kind: AnalysisMetadataKind;
  readonly generatedAt: string;
  readonly sourceCommit: string;
  readonly analyzerCommit: string;
}

export function getAnalysisSnapshotMetadata(
  analysis: AnalysisViews,
  kind: AnalysisMetadataKind,
): AnalysisSnapshotMetadata {
  const snapshot = kind === 'deps'
    ? analysis.deps
    : kind === 'typerefs'
      ? analysis.typeRefs
      : analysis.exports;
  return {
    kind,
    generatedAt: snapshot.generated_at,
    sourceCommit: snapshot.source_commit,
    analyzerCommit: snapshot.analyzer_commit,
  };
}

export function createAnalysisProvenanceEntriesForKinds(
  analysis: AnalysisViews,
  kinds: readonly AnalysisMetadataKind[],
  freshness: WorldFrame['freshness'],
): readonly InquiryCarrierProvenanceEntry[] {
  return kinds.map((kind) => {
    const metadata = getAnalysisSnapshotMetadata(analysis, kind);
    return createAnalysisProvenanceEntry(
      metadata.kind,
      metadata.generatedAt,
      metadata.sourceCommit,
      freshness,
    );
  });
}

export function describeAnalysisMaterializationTiming(
  analysis: AnalysisViews,
  freshness: WorldFrame['freshness'],
  kinds: readonly AnalysisMetadataKind[],
): string {
  const labels = kinds.join(', ');
  const generatedAts = kinds
    .map((kind) => getAnalysisSnapshotMetadata(analysis, kind).generatedAt)
    .join(', ');
  return freshness === 'live'
    ? `live ${labels} analysis views refreshed at ${generatedAts}.`
    : `materialized analysis views generated at ${generatedAts}.`;
}

export function analysisGeneratedAtRefs(
  analysis: AnalysisViews,
  kinds: readonly AnalysisMetadataKind[],
): readonly string[] {
  return kinds.map((kind) => getAnalysisSnapshotMetadata(analysis, kind).generatedAt);
}
