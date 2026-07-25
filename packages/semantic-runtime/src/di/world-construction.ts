import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { Container } from './container.js';
import type { ContainerReference } from './container-reference.js';
import type { ContainerRegistrationOperation } from './container-registration.js';
import type {
  ContainerFactorySlot,
  ContainerResourceSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from './container-slot.js';
import type { Resolver } from './resolver.js';
import type { InstanceProvider } from './instance-provider.js';
import type {
  ParameterizedRegistry,
  RegistryValue,
} from './registry.js';
import type { AppTaskDefinition } from '../configuration/app-task.js';
import type { AureliaAppTaskEvaluation } from '../configuration/aurelia-evaluation-runtime.js';
import type { DiIssue } from './di-issue.js';
import type { ResourceIssue } from '../resources/resource-issue.js';
import type { DiContainerChainFacts } from './container-chain.js';

/** Runtime resolver objects that can occupy a container resolver slot. */
export type DiResolverProduct = Resolver | InstanceProvider;

/** Registration and container locus at which one DI open seam can hide a provider. */
export class DiRegistrationOpenSeamScope {
  constructor(
    readonly seam: OpenSeam,
    /** Exact registration operation whose spending retained or produced this seam. */
    readonly operation: ContainerRegistrationOperation | null,
  ) {}
}

/** One AppTask registry value that was actually spent into a modeled container. */
export class RegisteredAppTask {
  constructor(
    readonly task: AppTaskDefinition,
    /** Exact call-time evaluator evidence, absent for framework-minted tasks. */
    readonly evaluation: AureliaAppTaskEvaluation | null,
    /** Exact registration occurrence that spent this task into a container. */
    readonly operation: ContainerRegistrationOperation,
  ) {}

  get container(): ContainerReference {
    return this.operation.container;
  }
}

/** Result of spending configuration-owned registrations into abstract DI container state. */
export class DiWorldConstructionEmission {
  constructor(
    /** Containers that participated in this world-construction pass. */
    readonly containers: readonly Container[],
    /** Container registration operations produced by spending configuration admissions. */
    readonly registrationOperations: readonly ContainerRegistrationOperation[],
    /** Runtime-shaped resolver products produced from resolver admissions. */
    readonly resolvers: readonly DiResolverProduct[],
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
    /** AppTask registry values actually spent into modeled containers, in registration order. */
    readonly registeredAppTasks: readonly RegisteredAppTask[],
    /** Open seams left by registration spending. */
    readonly openSeams: readonly OpenSeam[],
    /** Exact registration/container scopes for open seams retained or produced while spending. */
    readonly registrationOpenSeamScopes: readonly DiRegistrationOpenSeamScope[],
    /** Source-backed DI/container issues discovered while spending registrations. */
    readonly issues: readonly DiIssue[],
    /** Source-backed resource registration issues discovered while spending resource definitions. */
    readonly resourceIssues: readonly ResourceIssue[],
    /** Kernel records committed for these DI products and seams. */
    readonly records: readonly KernelStoreRecord[],
  ) {}

  /** Definition projection retained for existing query and summary consumers. */
  get appTasks(): readonly AppTaskDefinition[] {
    return this.registeredAppTasks.map((registration) => registration.task);
  }
}

/** Read every concrete registration occurrence spent into a container consulted by this container. */
export function registrationOperationsVisibleToContainer(
  container: Container,
  world: DiWorldConstructionEmission,
  containerChainFacts: DiContainerChainFacts,
): readonly ContainerRegistrationOperation[] {
  const consultingChain = new Set(
    containerChainFacts.containerChainIdentityHandles(container.identityHandle),
  );
  return world.registrationOperations.filter((operation) => {
    const operationContainerIdentityHandle = operation.container.identityHandle;
    return operationContainerIdentityHandle != null
      && consultingChain.has(operationContainerIdentityHandle);
  });
}
