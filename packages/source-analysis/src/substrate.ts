export const SUBSTRATE_SCHEMA_VERSION = 'v0alpha1' as const;

export const SUBSTRATE_NODE_KINDS = [
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

export const SUBSTRATE_EDGE_KINDS = [
  'contains',
  'configures',
  'declares',
  'imports',
  'exports',
  'references-type',
  'materializes',
  'invalidates',
] as const;

export const PROVENANCE_KINDS = [
  'filesystem',
  'typescript-program',
  'package-manifest',
  'analysis-session',
  'snapshot-materialization',
] as const;

export type SubstrateNodeKind =
  typeof SUBSTRATE_NODE_KINDS[number];

export type SubstrateEdgeKind =
  typeof SUBSTRATE_EDGE_KINDS[number];

export type ProvenanceKind =
  typeof PROVENANCE_KINDS[number];

export type SubstrateNodeId = string;
export type SubstrateEdgeId = string;

export type SubstrateAttributes = Readonly<Record<string, unknown>>;

export interface LocationPoint {
  readonly line: number;
  readonly column: number;
}

export interface LocationRange {
  readonly repoRelativePath: string;
  readonly start?: LocationPoint;
  readonly end?: LocationPoint;
}

export interface ObservationProvenance {
  readonly kind: ProvenanceKind;
  readonly label: string;
  readonly path?: string;
  readonly fingerprint?: string;
  readonly observedAt?: string;
  readonly detail?: string;
}

export interface SubstrateNode {
  readonly id: SubstrateNodeId;
  readonly kind: SubstrateNodeKind;
  readonly label: string;
  readonly repoRelativePath?: string;
  readonly fingerprint?: string;
  readonly location?: LocationRange;
  readonly provenance?: readonly ObservationProvenance[];
  readonly attributes?: SubstrateAttributes;
}

export type SubstrateFact = SubstrateNode;

export interface SubstrateEdge {
  readonly id: SubstrateEdgeId;
  readonly kind: SubstrateEdgeKind;
  readonly from: SubstrateNodeId;
  readonly to: SubstrateNodeId;
  readonly label?: string;
  readonly provenance?: readonly ObservationProvenance[];
  readonly attributes?: SubstrateAttributes;
}

export interface SubstrateGraph {
  readonly schemaVersion: typeof SUBSTRATE_SCHEMA_VERSION;
  readonly repoPath: string;
  readonly target: string;
  readonly nodes: readonly SubstrateNode[];
  readonly edges: readonly SubstrateEdge[];
}
