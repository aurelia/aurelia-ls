import type { KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';
import type { InterfaceKey } from './interface-key.js';

export const DEPENDENCY_RESOLVED_SUBJECT_KINDS = [
  'interface-symbol',
  'constructable',
  'resource',
  'resolver',
  'object',
  'property',
  'open',
] as const;

export type DependencyResolvedSubjectKind =
  typeof DEPENDENCY_RESOLVED_SUBJECT_KINDS[number];

// This is the bounded subject basis beneath later DI/container-state
// consequence. It answers "what subject does this request appear to target?"
// without yet claiming lookup or registration consequence.
export class DependencyResolvedSubject {
  constructor(
    readonly kind: DependencyResolvedSubjectKind,
    readonly key: KeyRef | null,
    readonly owner: SymbolRef | SourceNodeRef | null,
    readonly interfaceKey: InterfaceKey | null = null,
    readonly note: string | null = null,
  ) {}
}

export class DependencyResolution {
  constructor(
    readonly subject: DependencyResolvedSubject,
    readonly note: string | null = null,
  ) {}
}
