import type { SourceNodeRef, SymbolRef } from '../refs.js';
import {
  EvidenceSource,
  EvidenceWitness,
  MaterializationRecord,
  ProvenanceSet,
  type ProvenanceMode,
} from '../provenance/index.js';
import type { DependencyAssociationSource } from './dependency-association-source.js';
import type { DependencyOpenSeam } from './dependency-open-seam.js';
import type { DependencyRequest } from './dependency-request.js';
import type { DependencyAssociation } from './dependency-association.js';

export const DEPENDENCY_PROVENANCE_MODES = [
  'selected',
  'overlay',
  'presence-only',
] as const satisfies readonly ProvenanceMode[];

export type DependencyProvenanceMode =
  typeof DEPENDENCY_PROVENANCE_MODES[number];

export const DEPENDENCY_PROVENANCE_FIELD_KINDS = [
  'dependency-association',
] as const;

export type DependencyProvenanceFieldKind =
  typeof DEPENDENCY_PROVENANCE_FIELD_KINDS[number];

export class DependencyContributor {
  readonly evidence: EvidenceWitness<
    DependencyProvenanceFieldKind,
    DependencyAssociationSource['kind']
  >;

  constructor(
    readonly source: DependencyAssociationSource,
    readonly request: DependencyRequest,
    readonly sourceNode: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {
    this.evidence = new EvidenceWitness(
      'dependency-association',
      source.kind,
      sourceNode == null ? EvidenceSource.open(note) : EvidenceSource.sourceNode(sourceNode, note),
      note,
    );
  }
}

export class DependencyAssociationProvenance {
  readonly provenanceSet: ProvenanceSet<
    DependencyProvenanceFieldKind,
    DependencyProvenanceMode,
    DependencyContributor
  >;

  constructor(
    readonly mode: DependencyProvenanceMode,
    readonly selected: DependencyContributor | null,
    readonly contributors: readonly DependencyContributor[] = [],
    readonly note: string | null = null,
  ) {
    this.provenanceSet = new ProvenanceSet(
      'dependency-association',
      mode,
      selected,
      contributors,
      note,
    );
  }
}

export class DependencyMaterialization {
  readonly materialization: MaterializationRecord<
    SymbolRef | SourceNodeRef,
    DependencyAssociation,
    DependencyOpenSeam
  >;

  constructor(
    readonly owner: SymbolRef | SourceNodeRef,
    readonly associations: readonly DependencyAssociation[] = [],
    readonly openSeams: readonly DependencyOpenSeam[] = [],
  ) {
    this.materialization = new MaterializationRecord(owner, associations, openSeams);
  }
}
