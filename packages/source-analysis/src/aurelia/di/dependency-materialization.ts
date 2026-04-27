import type { SourceNodeRef, SymbolRef } from '../refs.js';
import { MaterializationRecord } from '../provenance/evidence.js';
import type { DependencyAssociation } from './dependency-association.js';
import type { DependencyOpenSeam } from './dependency-open-seam.js';

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
