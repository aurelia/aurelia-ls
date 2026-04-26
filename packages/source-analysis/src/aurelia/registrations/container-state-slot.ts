import { auLink } from '../au-link.js';
import type { SourceNodeRef, SymbolRef, KeyRef } from '../refs.js';
import type { DependencyMaterialization } from '../di/index.js';
import type { RegistrationPayload } from './registration-payload.js';
import type { RegistrationTransition } from './registration-transition.js';
import type { RegistrationResolverBasis } from './registration-resolver-basis.js';

export const CONTAINER_STATE_SLOT_KINDS = [
  'instance-value',
  'null-provider',
  'throwing-provider',
  'constructable-activation',
  'callback-activation',
  'alias-forward',
  'open',
] as const;

export type ContainerStateSlotKind =
  typeof CONTAINER_STATE_SLOT_KINDS[number];

// A container-state entry can hold one or more activation/value slots for the
// same key. This keeps multi-registration aggregation separate from the keyed
// entry shell and gives us a place to hang evaluation-ready basis such as
// constructable dependency materialization.
@auLink('kernel:Resolver')
export class ContainerStateSlot {
  constructor(
    readonly id: string,
    readonly kind: ContainerStateSlotKind,
    readonly transition: RegistrationTransition,
    readonly resolverBasis: RegistrationResolverBasis | null = null,
    readonly payload: RegistrationPayload | null = null,
    readonly owner: SymbolRef | SourceNodeRef | null = null,
    readonly targetKey: KeyRef | null = null,
    readonly dependencyMaterialization: DependencyMaterialization | null = null,
    readonly note: string | null = null,
  ) {}
}
