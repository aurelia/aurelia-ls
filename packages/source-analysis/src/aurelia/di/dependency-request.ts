import type { BoundedReferenceSeedKind } from '../analysis/index.js';
import type { SourceNodeRef } from '../refs.js';
import type { ResourceLookupRegime } from '../registrations/resource-lookup-regime.js';
import type { LookupModifier } from './lookup-modifier.js';

export const DEPENDENCY_REQUEST_KINDS = [
  'direct-key',
  'helper-wrapped',
  'open-expression',
] as const;

export type DependencyRequestKind =
  typeof DEPENDENCY_REQUEST_KINDS[number];

// This is the authored dependency request shape, not yet a resolved key-space
// consequence. It keeps the request as-written so later DI/container-state work
// can distinguish helper sugar from the base resolved subject.
export class DependencyRequest {
  constructor(
    readonly kind: DependencyRequestKind,
    readonly source: SourceNodeRef | null,
    readonly seedKind: BoundedReferenceSeedKind,
    readonly candidateName: string | null,
    readonly lookupModifiers: readonly LookupModifier[] = [],
    readonly resourceLookupRegime: ResourceLookupRegime | null = null,
    readonly note: string | null = null,
  ) {}
}
