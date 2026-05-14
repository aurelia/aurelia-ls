import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ContainerReference } from './container-reference.js';
import type { InstanceProvider } from './instance-provider.js';
import type { Resolver, ResolverStrategy } from './resolver.js';

export type ContainerSlotField =
  | 'container'
  | 'key'
  | 'resolver'
  | 'resource'
  | 'factory'
  | 'source';

/** Row in a container's resolver map. */
export class ContainerResolverSlot {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this slot. */
    readonly productHandle: ProductHandle,
    /** Container that owns the resolver slot. */
    readonly container: ContainerReference,
    /** DI key identity for this resolver row. */
    readonly keyIdentityHandle: IdentityHandle,
    /** Runtime resolver object stored in Aurelia's resolver map, when modeled. */
    readonly resolver: Resolver | InstanceProvider | null,
    /** Resolver-producing registration admission, explicit resolver, or synthetic resolver product. */
    readonly resolverProductHandle: ProductHandle | null,
    /** Runtime resolver strategy when known from registration spending. */
    readonly strategy: ResolverStrategy | null,
    /** Whether this slot came from the disposable resolver path. */
    readonly isDisposable: boolean,
    /** Source address for the operation that produced this row. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerSlotField>[] = [],
  ) {}
}

/** Built-in resolver slot that makes `IContainer` resolve through the current/requesting container. */
export class ContainerSelfResolverSlot {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this slot. */
    readonly productHandle: ProductHandle,
    /** Container that owns the built-in self resolver slot. */
    readonly container: ContainerReference,
    /** DI key identity for the runtime `IContainer` interface symbol. */
    readonly keyIdentityHandle: IdentityHandle,
    /** Source or framework anchor address for the constructor path that produced this slot. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerSlotField>[] = [],
  ) {}
}

export type ContainerResolverLikeSlot =
  | ContainerResolverSlot
  | ContainerSelfResolverSlot;

/** Row in a container's resource lookup table. */
export class ContainerResourceSlot {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this resource slot. */
    readonly productHandle: ProductHandle,
    /** Container whose resource lookup table owns this slot. */
    readonly container: ContainerReference,
    /** Runtime resource key string such as `au:resource:custom-element:my-element`, when known. */
    readonly resourceKey: string,
    /** DI key identity for the runtime resource key row. */
    readonly keyIdentityHandle: IdentityHandle,
    /** Resource identity visible through this lookup row, when known. */
    readonly resourceIdentityHandle: IdentityHandle | null,
    /** Resource product visible through this lookup row, when known. */
    readonly resourceProductHandle: ProductHandle | null,
    /** Resolver slot or resolver product backing the resource key. */
    readonly resolverProductHandle: ProductHandle | null,
    /** Source address for the operation that produced this row. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerSlotField>[] = [],
  ) {}
}

/** Row in the root-shared container factory map. */
export class ContainerFactorySlot {
  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this factory slot. */
    readonly productHandle: ProductHandle,
    /** Container tree that owns the shared factory map. */
    readonly container: ContainerReference,
    /** Constructable key identity whose factory is cached. */
    readonly keyIdentityHandle: IdentityHandle,
    /** Product or identity for the factory value when it has been modeled. */
    readonly factoryProductHandle: ProductHandle | null,
    /** Source address for the operation that produced this row. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerSlotField>[] = [],
  ) {}
}
