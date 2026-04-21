import type { SourceNodeRef, SymbolRef } from '../refs.js';
import type { DependencyAssociationSource } from './dependency-association-source.js';
import type { DependencyOpenSeam } from './dependency-open-seam.js';
import type { DependencyRequest } from './dependency-request.js';

export const DEPENDENCY_PROVENANCE_MODES = [
  'selected',
  'overlay',
  'presence-only',
] as const;

export type DependencyProvenanceMode =
  typeof DEPENDENCY_PROVENANCE_MODES[number];

export class DependencyContributor {
  constructor(
    readonly source: DependencyAssociationSource,
    readonly request: DependencyRequest,
    readonly sourceNode: SourceNodeRef | null,
    readonly note: string | null = null,
  ) {}
}

export class DependencyAssociationProvenance {
  constructor(
    readonly mode: DependencyProvenanceMode,
    readonly selected: DependencyContributor | null,
    readonly contributors: readonly DependencyContributor[] = [],
    readonly note: string | null = null,
  ) {}
}

export class DependencyMaterialization {
  constructor(
    readonly owner: SymbolRef | SourceNodeRef,
    readonly associations: readonly import('./dependency-association.js').DependencyAssociation[] = [],
    readonly openSeams: readonly DependencyOpenSeam[] = [],
  ) {}
}
