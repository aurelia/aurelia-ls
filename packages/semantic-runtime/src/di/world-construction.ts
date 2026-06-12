import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { Container } from './container.js';
import type { ContainerRegistrationOperation } from './container-registration.js';
import type {
  ContainerFactorySlot,
  ContainerResourceSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from './container-slot.js';
import type { Resolver } from './resolver.js';
import type {
  ParameterizedRegistry,
  RegistryValue,
} from './registry.js';
import type { AppTaskDefinition } from '../configuration/app-task.js';
import type { DiIssue } from './di-issue.js';
import type { ResourceIssue } from '../resources/resource-issue.js';

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
    /** Root-shared factory slots produced during spending. */
    readonly factorySlots: readonly ContainerFactorySlot[],
    /** Built-in IContainer self resolver slots produced for modeled containers. */
    readonly selfResolverSlots: readonly ContainerSelfResolverSlot[],
    /** Container-owned resource slots produced during spending. */
    readonly resourceSlots: readonly ContainerResourceSlot[],
    /** Framework-owned lifecycle AppTasks surfaced while spending framework registrations. */
    readonly appTasks: readonly AppTaskDefinition[],
    /** Open seams left by registration spending. */
    readonly openSeams: readonly OpenSeam[],
    /** Source-backed DI/container issues discovered while spending registrations. */
    readonly issues: readonly DiIssue[],
    /** Source-backed resource registration issues discovered while spending resource definitions. */
    readonly resourceIssues: readonly ResourceIssue[],
    /** Kernel records committed for these DI products and seams. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}
