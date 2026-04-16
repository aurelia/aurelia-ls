// Type scaffold for the future claim DAG derived from the shared substrate.
// This file is intentionally structural only and does not change analyzer behavior.

import type {
  SourceAnalysisSubstrateAttributes,
  SourceAnalysisSubstrateEdgeId,
  SourceAnalysisSubstrateNodeId,
  SourceAnalysisSubstrateNodeKind,
} from './substrate.js';

export const SOURCE_ANALYSIS_CLAIM_LATTICE_SCHEMA_VERSION = 'v0alpha1' as const;

export const SOURCE_ANALYSIS_CLAIM_HOME_KINDS = [
  'observation',
  'dependency',
  'type-shape',
  'export-surface',
  'freshness',
  'boundary',
  'route',
] as const;

export const SOURCE_ANALYSIS_CLAIM_NODE_KINDS = [
  'support',
  'derived',
  'summary',
  'boundary',
  'route',
  'materialization',
] as const;

export const SOURCE_ANALYSIS_CLAIM_EDGE_KINDS = [
  'derived-from',
  'depends-on',
  'narrows',
  'widens',
  'supports',
  'invalidates',
  'materializes',
  'routes-through',
] as const;

export type SourceAnalysisClaimHomeKind =
  typeof SOURCE_ANALYSIS_CLAIM_HOME_KINDS[number];

export type SourceAnalysisClaimNodeKind =
  typeof SOURCE_ANALYSIS_CLAIM_NODE_KINDS[number];

export type SourceAnalysisClaimEdgeKind =
  typeof SOURCE_ANALYSIS_CLAIM_EDGE_KINDS[number];

export type SourceAnalysisClaimId = string;
export type SourceAnalysisClaimHomeId = string;

export interface SourceAnalysisClaimHome {
  readonly id: SourceAnalysisClaimHomeId;
  readonly kind: SourceAnalysisClaimHomeKind;
  readonly label: string;
  readonly description?: string;
  readonly substrateKinds?: readonly SourceAnalysisSubstrateNodeKind[];
}

export interface SourceAnalysisClaimSupport {
  readonly substrateNodeIds?: readonly SourceAnalysisSubstrateNodeId[];
  readonly substrateEdgeIds?: readonly SourceAnalysisSubstrateEdgeId[];
  readonly upstreamClaimIds?: readonly SourceAnalysisClaimId[];
}

export interface SourceAnalysisClaimNode {
  readonly id: SourceAnalysisClaimId;
  readonly homeId: SourceAnalysisClaimHomeId;
  readonly kind: SourceAnalysisClaimNodeKind;
  readonly subjectRef: string;
  readonly label: string;
  readonly support?: SourceAnalysisClaimSupport;
  readonly attributes?: SourceAnalysisSubstrateAttributes;
}

export interface SourceAnalysisClaimEdge {
  readonly kind: SourceAnalysisClaimEdgeKind;
  readonly from: SourceAnalysisClaimId;
  readonly to: SourceAnalysisClaimId;
  readonly label?: string;
}

export interface SourceAnalysisClaimLattice {
  readonly schemaVersion: typeof SOURCE_ANALYSIS_CLAIM_LATTICE_SCHEMA_VERSION;
  readonly homes: readonly SourceAnalysisClaimHome[];
  readonly claims: readonly SourceAnalysisClaimNode[];
  readonly edges: readonly SourceAnalysisClaimEdge[];
}
