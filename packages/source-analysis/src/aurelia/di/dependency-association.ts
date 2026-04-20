import type { KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';
import type { DependencyAssociationSource } from './dependency-association-source.js';
import type { LookupModifier } from './lookup-modifier.js';

export const DEPENDENCY_SITE_KINDS = [
  'constructor-parameter',
  'instance-field',
  'static-field',
  'definition-dependencies',
  'resolve-call',
] as const;

export type DependencySiteKind =
  typeof DEPENDENCY_SITE_KINDS[number];

export class DependencySite {
  constructor(
    readonly kind: DependencySiteKind,
    readonly owner: SymbolRef | SourceNodeRef,
    readonly source: SourceNodeRef,
    readonly location: string | null = null,
  ) {}
}

// This is the clean-room home for "how is a dependency associated with some
// Aurelia-facing subject?" It is intentionally separate from later lookup or
// container-state consequence.
export class DependencyAssociation {
  constructor(
    readonly id: string,
    readonly site: DependencySite,
    readonly source: DependencyAssociationSource,
    readonly key: KeyRef,
    readonly lookupModifiers: readonly LookupModifier[] = [],
    readonly note: string | null = null,
  ) {}
}
