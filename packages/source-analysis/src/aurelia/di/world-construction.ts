import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type { OpenSeam } from '../kernel/derivation.js';
import type { Container } from './container.js';
import type { ContainerRegistrationOperation } from './container-registration.js';
import type {
  ContainerResourceSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from './container-slot.js';
import type { Resolver } from './resolver.js';
import type {
  ParameterizedRegistry,
  RegistryValue,
} from './registry.js';

/** Result of spending configuration-owned registrations into abstract DI container state. */
export class DiWorldConstructionEmission {
  constructor(
    /** Containers that participated in this world-construction pass. */
    readonly containers: readonly Container[],
    /** Container registration operations produced by spending configuration admissions. */
    readonly registrationOperations: readonly ContainerRegistrationOperation[],
    /** Runtime-shaped resolver products produced from resolver admissions. */
    readonly resolvers: readonly Resolver[],
    /** Runtime-shaped generic registry values encountered during spending. */
    readonly registries: readonly RegistryValue[],
    /** Runtime-shaped ParameterizedRegistry products produced by deferred registrations. */
    readonly parameterizedRegistries: readonly ParameterizedRegistry[],
    /** Container-owned resolver slots produced during spending. */
    readonly resolverSlots: readonly ContainerResolverSlot[],
    /** Built-in IContainer self resolver slots produced for modeled containers. */
    readonly selfResolverSlots: readonly ContainerSelfResolverSlot[],
    /** Container-owned resource slots produced during spending. */
    readonly resourceSlots: readonly ContainerResourceSlot[],
    /** Open seams left by registration spending. */
    readonly openSeams: readonly OpenSeam[],
    /** Kernel records committed for these DI products and seams. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}
