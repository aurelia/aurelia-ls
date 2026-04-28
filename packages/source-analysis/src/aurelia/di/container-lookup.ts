import type { IdentityHandle } from '../kernel/handles.js';
import type { ContainerReference } from './container.js';
import type {
  ContainerFactorySlot,
  ContainerResourceSlot,
  ContainerResolverLikeSlot,
} from './container-slot.js';

export const enum ContainerLookupState {
  /** The requested row was found in the current container tree. */
  Hit = 'hit',
  /** The requested row was not found. */
  Miss = 'miss',
  /** The resolver was not found, but runtime lookup would enter JIT/default registration. */
  JitRegistration = 'jit-registration',
  /** The container is disposed, so no lookup should be trusted. */
  Disposed = 'disposed',
}

export class ContainerResolverLookup {
  readonly kind = 'container-resolver-lookup' as const;

  constructor(
    /** Lookup state after searching the modeled container tree. */
    readonly state: ContainerLookupState,
    /** DI key identity requested by the lookup. */
    readonly keyIdentityHandle: IdentityHandle,
    /** Container where the request began. */
    readonly requestor: ContainerReference,
    /** Container that owned the matching resolver slots, when there was a hit. */
    readonly owner: ContainerReference | null,
    /** Resolver slots found for the key. Multiple slots represent runtime array-resolver behavior. */
    readonly resolverSlots: readonly ContainerResolverLikeSlot[],
    /** Containers searched in order. */
    readonly searchPath: readonly ContainerReference[],
    /** Whether runtime auto-registration would be considered after a miss. */
    readonly autoRegister: boolean,
  ) {}
}

export class ContainerFactoryLookup {
  readonly kind = 'container-factory-lookup' as const;

  constructor(
    /** Lookup state for the root-shared factory map. */
    readonly state: ContainerLookupState,
    /** Constructable key identity requested by the lookup. */
    readonly keyIdentityHandle: IdentityHandle,
    /** Container where the request began. */
    readonly requestor: ContainerReference,
    /** Factory slot found for the key. */
    readonly factorySlot: ContainerFactorySlot | null,
  ) {}
}

export class ContainerResourceLookup {
  readonly kind = 'container-resource-lookup' as const;

  constructor(
    /** Lookup state for resource-key search. */
    readonly state: ContainerLookupState,
    /** Runtime resource key string such as `au:ce:my-element`. */
    readonly resourceKey: string,
    /** Container where the request began. */
    readonly requestor: ContainerReference,
    /** Container that owned the matching resource slot, when there was a hit. */
    readonly owner: ContainerReference | null,
    /** Resource slot found for the key. */
    readonly resourceSlot: ContainerResourceSlot | null,
  ) {}
}
