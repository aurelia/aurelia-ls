import type {
  SubstrateAttributes,
  SubstrateEdgeId,
  SubstrateNodeId,
  SubstrateNodeKind,
} from './substrate.js';

export const CLAIM_LATTICE_SCHEMA_VERSION = 'v0alpha1' as const;

export const CLAIM_HOME_KINDS = [
  'observation',
  'dependency',
  'type-shape',
  'export-surface',
  'freshness',
  'boundary',
  'route',
] as const;

export const CLAIM_NODE_KINDS = [
  'support',
  'derived',
  'summary',
  'boundary',
  'route',
  'materialization',
] as const;

export const CLAIM_EDGE_KINDS = [
  'derived-from',
  'depends-on',
  'narrows',
  'widens',
  'supports',
  'invalidates',
  'materializes',
  'routes-through',
] as const;

export type ClaimHomeKind =
  typeof CLAIM_HOME_KINDS[number];

export type ClaimNodeKind =
  typeof CLAIM_NODE_KINDS[number];

export type ClaimEdgeKind =
  typeof CLAIM_EDGE_KINDS[number];

export type ClaimId = string;
export type ClaimHomeId = string;

export interface ClaimHome {
  readonly id: ClaimHomeId;
  readonly kind: ClaimHomeKind;
  readonly label: string;
  readonly description?: string;
  readonly substrateKinds?: readonly SubstrateNodeKind[];
}

export interface ClaimSupport {
  readonly substrateNodeIds?: readonly SubstrateNodeId[];
  readonly substrateEdgeIds?: readonly SubstrateEdgeId[];
  readonly upstreamClaimIds?: readonly ClaimId[];
}

export interface ClaimNode {
  readonly id: ClaimId;
  readonly homeId: ClaimHomeId;
  readonly kind: ClaimNodeKind;
  readonly subjectRef: string;
  readonly label: string;
  readonly support?: ClaimSupport;
  readonly attributes?: SubstrateAttributes;
}

export interface ClaimEdge {
  readonly kind: ClaimEdgeKind;
  readonly from: ClaimId;
  readonly to: ClaimId;
  readonly label?: string;
}

export interface ClaimLattice {
  readonly schemaVersion: typeof CLAIM_LATTICE_SCHEMA_VERSION;
  readonly homes: readonly ClaimHome[];
  readonly claims: readonly ClaimNode[];
  readonly edges: readonly ClaimEdge[];
}
