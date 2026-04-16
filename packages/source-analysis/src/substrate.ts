// Type scaffold for the future shared observation graph.
// This file is intentionally structural only and does not change analyzer behavior.

export const SOURCE_ANALYSIS_SUBSTRATE_SCHEMA_VERSION = 'v0alpha1' as const;

export const SOURCE_ANALYSIS_SUBSTRATE_NODE_KINDS = [
  'repo',
  'package',
  'tsconfig',
  'source-file',
  'package-entrypoint',
  'import-observation',
  'export-observation',
  'declaration-observation',
  'type-reference-observation',
  'snapshot',
] as const;

export const SOURCE_ANALYSIS_SUBSTRATE_EDGE_KINDS = [
  'contains',
  'configures',
  'declares',
  'imports',
  'exports',
  'references-type',
  'materializes',
  'invalidates',
] as const;

export const SOURCE_ANALYSIS_PROVENANCE_KINDS = [
  'filesystem',
  'typescript-program',
  'package-manifest',
  'analysis-session',
  'snapshot-materialization',
] as const;

export type SourceAnalysisSubstrateNodeKind =
  typeof SOURCE_ANALYSIS_SUBSTRATE_NODE_KINDS[number];

export type SourceAnalysisSubstrateEdgeKind =
  typeof SOURCE_ANALYSIS_SUBSTRATE_EDGE_KINDS[number];

export type SourceAnalysisProvenanceKind =
  typeof SOURCE_ANALYSIS_PROVENANCE_KINDS[number];

export type SourceAnalysisSubstrateNodeId = string;
export type SourceAnalysisSubstrateEdgeId = string;

export type SourceAnalysisSubstrateAttributes = Readonly<Record<string, unknown>>;

export interface SourceAnalysisLocationPoint {
  readonly line: number;
  readonly column: number;
}

export interface SourceAnalysisLocationRange {
  readonly repoRelativePath: string;
  readonly start?: SourceAnalysisLocationPoint;
  readonly end?: SourceAnalysisLocationPoint;
}

export interface SourceAnalysisObservationProvenance {
  readonly kind: SourceAnalysisProvenanceKind;
  readonly label: string;
  readonly path?: string;
  readonly fingerprint?: string;
  readonly observedAt?: string;
  readonly detail?: string;
}

export interface SourceAnalysisSubstrateNode {
  readonly id: SourceAnalysisSubstrateNodeId;
  readonly kind: SourceAnalysisSubstrateNodeKind;
  readonly label: string;
  readonly repoRelativePath?: string;
  readonly fingerprint?: string;
  readonly location?: SourceAnalysisLocationRange;
  readonly provenance?: readonly SourceAnalysisObservationProvenance[];
  readonly attributes?: SourceAnalysisSubstrateAttributes;
}

// "Fact" is the intended semantic reading of a substrate node.
export type SourceAnalysisSubstrateFact = SourceAnalysisSubstrateNode;

export interface SourceAnalysisSubstrateEdge {
  readonly id: SourceAnalysisSubstrateEdgeId;
  readonly kind: SourceAnalysisSubstrateEdgeKind;
  readonly from: SourceAnalysisSubstrateNodeId;
  readonly to: SourceAnalysisSubstrateNodeId;
  readonly label?: string;
  readonly provenance?: readonly SourceAnalysisObservationProvenance[];
  readonly attributes?: SourceAnalysisSubstrateAttributes;
}

export interface SourceAnalysisSubstrateGraph {
  readonly schemaVersion: typeof SOURCE_ANALYSIS_SUBSTRATE_SCHEMA_VERSION;
  readonly repoPath: string;
  readonly target: string;
  readonly nodes: readonly SourceAnalysisSubstrateNode[];
  readonly edges: readonly SourceAnalysisSubstrateEdge[];
}
