import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ConfigurationIdentity,
  DiProductIdentity,
  InterfaceDiKeyIdentity,
  ResourceDiKeyIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  AppTaskCallbackKind,
  AppTaskDefinition,
  AppTaskSlot,
  ConfigurationCallbackReference,
  type AppTaskField,
} from '../configuration/app-task.js';
import {
  ConfigurationSequenceKind,
  type ConfigurationStep,
} from '../configuration/configuration-sequence.js';
import {
  buildRegistryBodyStepIndex,
  type RegistryBodyStepIndex,
} from '../configuration/registry-body-index.js';
import type {
  BuiltInResourceEmission,
  ConfiguredBuiltInResourceCatalogEmission,
} from '../resources/built-in-resource-catalog-materializer.js';
import {
  runtimeResourceKeyForKind,
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  frameworkRegistrationKindForAdmission,
  isResolverRegistrationStrategy,
  OpenRegistrationAdmission,
  ParameterizedRegistryAdmission,
  FrameworkRegistrationAdmission,
  ResourceRegistrationAdmission,
  RegistryRegistrationAdmission,
  RegistrationKeyRole,
  RegistrationStrategy,
  ResolverRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  FrameworkRegistrationKind,
  RegistrationKeyReference,
  RegistrationValueKind,
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationCapabilitiesForKind,
} from '../registration/framework-registration-manifest.js';
import type { Container } from './container.js';
import { ContainerRegistrationOperation, type ContainerRegistrationField } from './container-registration.js';
import {
  ContainerResourceSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
  type ContainerSlotField,
} from './container-slot.js';
import { Resolver, type ResolverField } from './resolver.js';
import {
  ParameterizedRegistry,
  RegistryRegistrationState,
  RegistryValue,
  type RegistryField,
} from './registry.js';
import { DiWorldConstructionEmission } from './world-construction.js';

class DiSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class DiProductEmission<TProduct> {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: TProduct,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly openSeams: readonly OpenSeam[] = [],
  ) {}
}

class DiFrameworkRegistrationEffectEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly resolvers: readonly Resolver[],
    readonly resolverSlots: readonly ContainerResolverSlot[],
    readonly resourceSlots: readonly ContainerResourceSlot[],
    readonly appTasks: readonly AppTaskDefinition[],
    readonly openSeams: readonly OpenSeam[] = [],
  ) {}
}

class DiRegistrationOperationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: ContainerRegistrationOperation,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly acceptRegistrationClaimHandle: ClaimHandle,
  ) {}
}

class DiRegistrationOperationHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly acceptRegistrationClaimHandle: ClaimHandle,
  ) {}
}

class DiClaimEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handles: readonly ClaimHandle[],
  ) {}
}

class DiResourceSlotEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly slots: readonly ContainerResourceSlot[],
    readonly claimHandles: readonly ClaimHandle[],
    readonly openSeams: readonly OpenSeam[] = [],
  ) {}
}

class DiResolverHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly keyIdentityHandle: IdentityHandle,
    readonly providesKeyClaimHandle: ClaimHandle,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [this.providesKeyClaimHandle];
  }
}

class DiResolverSlotHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly keyIdentityHandle: IdentityHandle,
    readonly providesKeyClaimHandle: ClaimHandle,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [this.providesKeyClaimHandle];
  }
}

class DiResourceSlotPublication {
  constructor(
    readonly resourceKind: ResourceDefinitionKind,
    readonly lookupName: string,
    readonly resourceIdentityHandle: IdentityHandle,
    readonly resourceProductHandle: ProductHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

class DiResourceSlotHandles {
  constructor(
    readonly slotLocal: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly keyIdentityHandle: IdentityHandle,
    readonly claimHandle: ClaimHandle,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [this.claimHandle];
  }
}

class DiContainerSelfResolverHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly keyIdentityHandle: IdentityHandle,
    readonly providesKeyClaimHandle: ClaimHandle,
    readonly producedClaimHandle: ClaimHandle,
  ) {}

  get claimHandles(): readonly ClaimHandle[] {
    return [
      this.providesKeyClaimHandle,
      this.producedClaimHandle,
    ];
  }
}

interface FrameworkResolverEffect {
  readonly capability: FrameworkRegistrationCapability;
  readonly keyName: string;
  readonly strategy: RegistrationStrategy;
  readonly valueKind: RegistrationValueKind | null;
  readonly valueName: string | null;
}

interface FrameworkAppTaskEffect {
  readonly capability: FrameworkRegistrationCapability;
  readonly slot: AppTaskSlot;
  readonly keyName: string;
  readonly callbackName: string;
}

const frameworkResolverEffects: readonly FrameworkResolverEffect[] = [
  {
    capability: FrameworkRegistrationCapability.I18nServiceResolvers,
    keyName: 'I18nInitOptions',
    strategy: RegistrationStrategy.Callback,
    valueKind: RegistrationValueKind.Callback,
    valueName: 'I18nConfiguration init options callback',
  },
  {
    capability: FrameworkRegistrationCapability.I18nServiceResolvers,
    keyName: 'II18nextWrapper',
    strategy: RegistrationStrategy.Singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'I18nextWrapper',
  },
  {
    capability: FrameworkRegistrationCapability.I18nServiceResolvers,
    keyName: 'I18N',
    strategy: RegistrationStrategy.Singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'I18nService',
  },
  {
    capability: FrameworkRegistrationCapability.RouterConfigurationResolvers,
    keyName: 'IBaseHref',
    strategy: RegistrationStrategy.CachedCallback,
    valueKind: RegistrationValueKind.CachedCallback,
    valueName: 'RouterConfiguration IBaseHref callback',
  },
  {
    capability: FrameworkRegistrationCapability.RouterConfigurationResolvers,
    keyName: 'IRouterOptions',
    strategy: RegistrationStrategy.Instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'RouterOptions',
  },
  {
    capability: FrameworkRegistrationCapability.RouterConfigurationResolvers,
    keyName: 'RouterOptions',
    strategy: RegistrationStrategy.Instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'RouterOptions',
  },
  {
    capability: FrameworkRegistrationCapability.RouterDefaultComponents,
    keyName: 'IRouter',
    strategy: RegistrationStrategy.Singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'Router',
  },
  {
    capability: FrameworkRegistrationCapability.StateStoreResolvers,
    keyName: 'IStoreRegistry',
    strategy: RegistrationStrategy.Singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'StoreRegistry',
  },
  {
    capability: FrameworkRegistrationCapability.DialogServiceResolvers,
    keyName: 'IDialogGlobalSettings',
    strategy: RegistrationStrategy.Singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'Dialog global settings',
  },
  {
    capability: FrameworkRegistrationCapability.DialogServiceResolvers,
    keyName: 'DialogService',
    strategy: RegistrationStrategy.Singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'DialogService',
  },
  {
    capability: FrameworkRegistrationCapability.DialogServiceResolvers,
    keyName: 'IDialogChildSettings',
    strategy: RegistrationStrategy.Instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'Dialog child settings map',
  },
];

const frameworkAppTaskEffects: readonly FrameworkAppTaskEffect[] = [
  {
    capability: FrameworkRegistrationCapability.I18nLifecycleTasks,
    slot: AppTaskSlot.Activating,
    keyName: 'I18N',
    callbackName: 'i18n.initPromise',
  },
  {
    capability: FrameworkRegistrationCapability.RouterLifecycleTasks,
    slot: AppTaskSlot.Creating,
    keyName: 'IRouter',
    callbackName: 'RouterConfiguration ensure router instance',
  },
  {
    capability: FrameworkRegistrationCapability.RouterLifecycleTasks,
    slot: AppTaskSlot.Hydrated,
    keyName: 'IContainer',
    callbackName: 'RouteContext.setRoot',
  },
  {
    capability: FrameworkRegistrationCapability.RouterLifecycleTasks,
    slot: AppTaskSlot.Activated,
    keyName: 'IRouter',
    callbackName: 'router.start(true)',
  },
  {
    capability: FrameworkRegistrationCapability.RouterLifecycleTasks,
    slot: AppTaskSlot.Deactivated,
    keyName: 'IRouter',
    callbackName: 'router.stop()',
  },
  {
    capability: FrameworkRegistrationCapability.StateStoreTasks,
    slot: AppTaskSlot.Creating,
    keyName: 'IContainer',
    callbackName: 'StateDefaultConfiguration create/register store',
  },
  {
    capability: FrameworkRegistrationCapability.DialogLifecycleTasks,
    slot: AppTaskSlot.Creating,
    keyName: 'IDialogGlobalSettings',
    callbackName: 'DialogConfiguration settings provider',
  },
];

/** Spends configuration-owned registration products into abstract DI container state. */
export class DiWorldConstructor {
  private readonly emittedIdentityHandles = new Set<IdentityHandle>();

  constructor(
    /** Hot analysis store that receives DI world-construction records. */
    readonly store: KernelStore,
  ) {}

  construct(
    configuration: ConfigurationKernelEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
  ): DiWorldConstructionEmission {
    this.emittedIdentityHandles.clear();

    const records: KernelStoreRecord[] = [];
    const registrationOperations: ContainerRegistrationOperation[] = [];
    const resolvers: Resolver[] = [];
    const registries: RegistryValue[] = [];
    const parameterizedRegistries: ParameterizedRegistry[] = [];
    const resolverSlots: ContainerResolverSlot[] = [];
    const selfResolverSlots: ContainerSelfResolverSlot[] = [];
    const resourceSlots: ContainerResourceSlot[] = [];
    const appTasks: AppTaskDefinition[] = [];
    const openSeams: OpenSeam[] = [];

    const containersByProduct = new Map<ProductHandle, Container>();
    for (const container of configuration.containers) {
      containersByProduct.set(container.productHandle, container);
      const selfResolver = this.recordsForContainerSelfResolver(container);
      records.push(...selfResolver.records);
      selfResolverSlots.push(selfResolver.product);
      container.registerSelfResolver(selfResolver.product);
    }

    const aureliaContainerByProduct = new Map<ProductHandle, Container>();
    for (const aurelia of configuration.aurelias) {
      if (aurelia.container.productHandle == null) {
        continue;
      }
      const container = containersByProduct.get(aurelia.container.productHandle);
      if (container != null) {
        aureliaContainerByProduct.set(aurelia.productHandle, container);
      }
    }

    const containerBySequenceProduct = new Map<ProductHandle, Container>();
    const sequenceKindByProduct = new Map<ProductHandle, ConfigurationSequenceKind>();
    for (const sequence of configuration.sequences) {
      sequenceKindByProduct.set(sequence.productHandle, sequence.sequenceKind);
      if (sequence.aurelia?.productHandle == null) {
        continue;
      }
      const container = aureliaContainerByProduct.get(sequence.aurelia.productHandle);
      if (container != null) {
        containerBySequenceProduct.set(sequence.productHandle, container);
      }
    }

    const admissionsByProduct = new Map<ProductHandle, RegistrationAdmissionProduct>();
    for (const admission of configuration.registrationAdmissions) {
      admissionsByProduct.set(admission.productHandle, admission);
    }
    const appTasksByProduct = new Map(
      configuration.appTasks.map((task) => [task.productHandle, task] as const),
    );
    const registryBodyIndex = buildRegistryBodyStepIndex(this.store, configuration);
    const spentAdmissionKeys = new Set<string>();

    for (const step of configuration.steps) {
      if (step.registrationAdmissionProductHandles.length === 0) {
        continue;
      }

      const container = this.containerForStep(step, containerBySequenceProduct);
      if (container == null) {
        if (!this.stepBelongsToAppSequence(step, sequenceKindByProduct)) {
          continue;
        }
        const seam = this.recordsForOpenSeam(
          `di-open-container:${step.productHandle}`,
          KernelVocabulary.Di.OpenRegistrationSpending.key,
          'Configuration step admitted registrations, but DI world construction could not identify the receiving container.',
          step.sourceAddressHandle,
        );
        records.push(...seam.records);
        openSeams.push(seam.seam);
        continue;
      }

      for (const admissionProductHandle of step.registrationAdmissionProductHandles) {
        const admission = admissionsByProduct.get(admissionProductHandle);
        if (admission == null) {
          const seam = this.recordsForOpenSeam(
            `di-open-admission:${step.productHandle}:${admissionProductHandle}`,
            KernelVocabulary.Di.OpenRegistrationSpending.key,
            'Configuration step referenced a registration admission product that was not present in the configuration emission.',
            step.sourceAddressHandle,
          );
          records.push(...seam.records);
          openSeams.push(seam.seam);
          continue;
        }

        const spent = this.recordsForRegistrationSpendingCascade(
          container,
          step,
          admission,
          configuredResources,
          resourceDefinitions,
          admissionsByProduct,
          appTasksByProduct,
          registryBodyIndex,
          spentAdmissionKeys,
        );
        records.push(...spent.records);
        registrationOperations.push(...spent.operations);
        resolvers.push(...spent.resolvers);
        registries.push(...spent.registries);
        parameterizedRegistries.push(...spent.parameterizedRegistries);
        resolverSlots.push(...spent.resolverSlots);
        resourceSlots.push(...spent.resourceSlots);
        appTasks.push(...spent.appTasks);
        openSeams.push(...spent.openSeams);
      }
    }

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'di-world-construction'));
    }

    return new DiWorldConstructionEmission(
      configuration.containers,
      registrationOperations,
      resolvers,
      registries,
      parameterizedRegistries,
      resolverSlots,
      selfResolverSlots,
      resourceSlots,
      appTasks,
      openSeams,
      records,
    );
  }

  private containerForStep(
    step: ConfigurationStep,
    containerBySequenceProduct: ReadonlyMap<ProductHandle, Container>,
  ): Container | null {
    return step.sequence?.productHandle == null
      ? null
      : containerBySequenceProduct.get(step.sequence.productHandle) ?? null;
  }

  private stepBelongsToAppSequence(
    step: ConfigurationStep,
    sequenceKindByProduct: ReadonlyMap<ProductHandle, ConfigurationSequenceKind>,
  ): boolean {
    return step.sequence?.productHandle != null
      && sequenceKindByProduct.get(step.sequence.productHandle) === ConfigurationSequenceKind.App;
  }

  private recordsForRegistrationSpendingCascade(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    registryBodyIndex: RegistryBodyStepIndex,
    spentAdmissionKeys: Set<string>,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly operations: readonly ContainerRegistrationOperation[];
    readonly resolvers: readonly Resolver[];
    readonly registries: readonly RegistryValue[];
    readonly parameterizedRegistries: readonly ParameterizedRegistry[];
    readonly resolverSlots: readonly ContainerResolverSlot[];
    readonly resourceSlots: readonly ContainerResourceSlot[];
    readonly appTasks: readonly AppTaskDefinition[];
    readonly openSeams: readonly OpenSeam[];
  } {
    const spentKey = `${container.productHandle}:${step.productHandle}:${admission.productHandle}`;
    if (spentAdmissionKeys.has(spentKey)) {
      return {
        records: [],
        operations: [],
        resolvers: [],
        registries: [],
        parameterizedRegistries: [],
        resolverSlots: [],
        resourceSlots: [],
        appTasks: [],
        openSeams: [],
      };
    }
    spentAdmissionKeys.add(spentKey);

    const bodySteps = registryBodyIndex.stepsForAdmission(admission);
    const registryBodyInterpreted = registryBodyIndex.bodyInterpretedForAdmission(admission);
    const direct = this.recordsForRegistrationSpending(
      container,
      step,
      admission,
      configuredResources,
      resourceDefinitions,
      appTasksByProduct,
      registryBodyInterpreted,
    );
    const records: KernelStoreRecord[] = [...direct.records];
    const operations: ContainerRegistrationOperation[] = [direct.operation];
    const resolvers: Resolver[] = [...direct.resolvers];
    const registries: RegistryValue[] = [...direct.registries];
    const parameterizedRegistries: ParameterizedRegistry[] = [...direct.parameterizedRegistries];
    const resolverSlots: ContainerResolverSlot[] = [...direct.resolverSlots];
    const resourceSlots: ContainerResourceSlot[] = [...direct.resourceSlots];
    const appTasks: AppTaskDefinition[] = [...direct.appTasks];
    const openSeams: OpenSeam[] = [...direct.openSeams];

    for (const bodyStep of bodySteps) {
      for (const bodyAdmissionHandle of bodyStep.registrationAdmissionProductHandles) {
        const bodyAdmission = admissionsByProduct.get(bodyAdmissionHandle);
        if (bodyAdmission == null) {
          continue;
        }
        const body = this.recordsForRegistrationSpendingCascade(
          container,
          bodyStep,
          bodyAdmission,
          configuredResources,
          resourceDefinitions,
          admissionsByProduct,
          appTasksByProduct,
          registryBodyIndex,
          spentAdmissionKeys,
        );
        records.push(...body.records);
        operations.push(...body.operations);
        resolvers.push(...body.resolvers);
        registries.push(...body.registries);
        parameterizedRegistries.push(...body.parameterizedRegistries);
        resolverSlots.push(...body.resolverSlots);
        resourceSlots.push(...body.resourceSlots);
        appTasks.push(...body.appTasks);
        openSeams.push(...body.openSeams);
      }
    }

    return {
      records,
      operations,
      resolvers,
      registries,
      parameterizedRegistries,
      resolverSlots,
      resourceSlots,
      appTasks,
      openSeams,
    };
  }

  private recordsForRegistrationSpending(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    registryBodyInterpreted = false,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly operation: ContainerRegistrationOperation;
    readonly resolvers: readonly Resolver[];
    readonly registries: readonly RegistryValue[];
    readonly parameterizedRegistries: readonly ParameterizedRegistry[];
    readonly resolverSlots: readonly ContainerResolverSlot[];
    readonly resourceSlots: readonly ContainerResourceSlot[];
    readonly appTasks: readonly AppTaskDefinition[];
    readonly openSeams: readonly OpenSeam[];
  } {
    const records: KernelStoreRecord[] = [];
    const resolvers: Resolver[] = [];
    const registries: RegistryValue[] = [];
    const parameterizedRegistries: ParameterizedRegistry[] = [];
    const resolverSlots: ContainerResolverSlot[] = [];
    const resourceSlots: ContainerResourceSlot[] = [];
    const appTasks: AppTaskDefinition[] = [];
    const openSeams: OpenSeam[] = [];
    const local = `di-registration:${container.productHandle}:${step.productHandle}:${admission.productHandle}`;
    const source = this.recordsForSource(
      `${local}:source`,
      'Configuration-owned registration admission spent into DI world construction.',
      step.sourceAddressHandle ?? admission.sourceAddressHandle,
    );
    records.push(...source.records);

    const operation = this.operationForAdmission(container, admission, local, source.provenanceHandle);
    records.push(...operation.records);
    container.register(operation.product);
    const operationMaterializationClaimHandles = [operation.acceptRegistrationClaimHandle];

    if (admission instanceof OpenRegistrationAdmission) {
      const seam = this.recordsForOpenSeam(
        `${local}:open-admission`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        summaryForOpenRegistrationAdmission(admission),
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
    } else if (admission instanceof ResolverRegistrationAdmission) {
      const emission = this.recordsForResolverAdmission(container, admission, local, source.provenanceHandle);
      records.push(...emission.records);
      resolvers.push(...emission.resolvers);
      resolverSlots.push(...emission.resolverSlots);
      openSeams.push(...emission.openSeams);
      const productClaims = this.recordsForOperationProductClaims(
        `${local}:resolver-products`,
        operation.product.productHandle,
        [
          ...emission.resolvers.map((resolver) => resolver.productHandle),
          ...emission.resolverSlots.map((slot) => slot.productHandle),
        ],
        source.provenanceHandle,
      );
      records.push(...productClaims.records);
      operationMaterializationClaimHandles.push(...productClaims.handles);
      for (const slot of emission.resolverSlots) {
        container.registerResolver(slot);
      }
    } else if (admission instanceof ParameterizedRegistryAdmission) {
      const emission = this.recordsForParameterizedRegistry(
        container,
        admission,
        local,
        source.provenanceHandle,
      );
      records.push(...emission.records);
      if (emission.registry != null) {
        parameterizedRegistries.push(emission.registry);
        const productClaims = this.recordsForOperationProductClaims(
          `${local}:parameterized-registry-products`,
          operation.product.productHandle,
          [emission.registry.productHandle],
          source.provenanceHandle,
        );
        records.push(...productClaims.records);
        operationMaterializationClaimHandles.push(...productClaims.handles);
      }
      openSeams.push(...emission.openSeams);
    } else if (admission instanceof RegistryRegistrationAdmission) {
      const emission = this.recordsForRegistry(
        container,
        admission,
        local,
        source.provenanceHandle,
        registryBodyInterpreted || frameworkRegistrationEffectsCloseRegistryBody(admission),
      );
      records.push(...emission.records);
      registries.push(emission.registry);
      const registeredAppTask = appTaskForRegistryAdmission(admission, appTasksByProduct);
      if (registeredAppTask != null) {
        appTasks.push(registeredAppTask);
      }
      const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
        container,
        admission,
        configuredResources,
        `${local}:registry-framework-effects`,
        source.provenanceHandle,
      );
      records.push(...frameworkEffects.records);
      resolvers.push(...frameworkEffects.resolvers);
      resolverSlots.push(...frameworkEffects.resolverSlots);
      resourceSlots.push(...frameworkEffects.resourceSlots);
      appTasks.push(...frameworkEffects.appTasks);
      for (const slot of frameworkEffects.resolverSlots) {
        container.registerResolver(slot);
      }
      for (const slot of frameworkEffects.resourceSlots) {
        container.registerResource(slot);
      }
      const productClaims = this.recordsForOperationProductClaims(
        `${local}:registry-products`,
        operation.product.productHandle,
        [
          emission.registry.productHandle,
          ...(registeredAppTask == null ? [] : [registeredAppTask.productHandle]),
          ...frameworkEffects.resolvers.map((resolver) => resolver.productHandle),
          ...frameworkEffects.resolverSlots.map((slot) => slot.productHandle),
          ...frameworkEffects.resourceSlots.map((slot) => slot.productHandle),
        ],
        source.provenanceHandle,
      );
      records.push(...productClaims.records);
      operationMaterializationClaimHandles.push(...productClaims.handles);
      openSeams.push(...emission.openSeams, ...frameworkEffects.openSeams);
    } else if (admission instanceof ResourceRegistrationAdmission) {
      const slotEmission = this.recordsForResourceAdmission(
        container,
        admission,
        resourceDefinitions,
        `${local}:resource`,
        source.provenanceHandle,
      );
      records.push(...slotEmission.records);
      resourceSlots.push(...slotEmission.slots);
      for (const slot of slotEmission.slots) {
        container.registerResource(slot);
      }
      const productClaims = this.recordsForOperationProductClaims(
        `${local}:resource-products`,
        operation.product.productHandle,
        slotEmission.slots.map((slot) => slot.productHandle),
        source.provenanceHandle,
      );
      records.push(...productClaims.records);
      operationMaterializationClaimHandles.push(...productClaims.handles);
      openSeams.push(...slotEmission.openSeams);
    } else if (admission instanceof FrameworkRegistrationAdmission) {
      const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
        container,
        admission,
        configuredResources,
        `${local}:framework-effects`,
        source.provenanceHandle,
      );
      records.push(...frameworkEffects.records);
      resolvers.push(...frameworkEffects.resolvers);
      resolverSlots.push(...frameworkEffects.resolverSlots);
      resourceSlots.push(...frameworkEffects.resourceSlots);
      appTasks.push(...frameworkEffects.appTasks);
      for (const slot of frameworkEffects.resolverSlots) {
        container.registerResolver(slot);
      }
      for (const slot of frameworkEffects.resourceSlots) {
        container.registerResource(slot);
      }
      const productClaims = this.recordsForOperationProductClaims(
        `${local}:framework-effect-products`,
        operation.product.productHandle,
        [
          ...frameworkEffects.resolvers.map((resolver) => resolver.productHandle),
          ...frameworkEffects.resolverSlots.map((slot) => slot.productHandle),
          ...frameworkEffects.resourceSlots.map((slot) => slot.productHandle),
        ],
        source.provenanceHandle,
      );
      records.push(...productClaims.records);
      operationMaterializationClaimHandles.push(...productClaims.handles);

      const openSummary = summaryForFrameworkRegistrationOpen(admission.frameworkKind);
      if (openSummary != null) {
        const seam = this.recordsForOpenSeam(
          `${local}:framework-registration-open`,
          KernelVocabulary.Di.OpenRegistrationSpending.key,
          openSummary,
          admission.sourceAddressHandle,
        );
        records.push(...seam.records);
        openSeams.push(seam.seam);
      }
      openSeams.push(...frameworkEffects.openSeams);
    }
    records.push(...this.recordsForOperationEnvelope(
      local,
      operation,
      operationMaterializationClaimHandles,
      openSeams.map((seam) => seam.handle),
      source.provenanceHandle,
    ));

    return {
      records,
      operation: operation.product,
      resolvers,
      registries,
      parameterizedRegistries,
      resolverSlots,
      resourceSlots,
      appTasks,
      openSeams,
    };
  }

  private operationForAdmission(
    container: Container,
    admission: RegistrationAdmissionProduct,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiRegistrationOperationEmission {
    const handles = this.registrationOperationHandles(local);
    const operation = this.registrationOperationForAdmission(container, admission, handles, provenanceHandle);
    const records = this.recordsForRegistrationOperation(container, admission, operation, handles, provenanceHandle);
    return new DiRegistrationOperationEmission(
      records,
      operation,
      handles.productHandle,
      handles.identityHandle,
      handles.acceptRegistrationClaimHandle,
    );
  }

  private registrationOperationHandles(local: string): DiRegistrationOperationHandles {
    return new DiRegistrationOperationHandles(
      this.store.handles.product(`${local}:operation`),
      this.store.handles.identity(`${local}:operation`),
      this.store.handles.claim(`${local}:container-accepts-registration`),
    );
  }

  private registrationOperationForAdmission(
    container: Container,
    admission: RegistrationAdmissionProduct,
    handles: DiRegistrationOperationHandles,
    provenanceHandle: ProvenanceHandle,
  ): ContainerRegistrationOperation {
    const operation = new ContainerRegistrationOperation(
      handles.productHandle,
      handles.identityHandle,
      container.toReference(),
      admission.productHandle,
      admission.sourceAddressHandle,
      admission.sourceAddressHandle ?? container.sourceAddressHandle,
      compactFieldProvenance<ContainerRegistrationField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('admission', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
    return operation;
  }

  private recordsForRegistrationOperation(
    container: Container,
    admission: RegistrationAdmissionProduct,
    operation: ContainerRegistrationOperation,
    handles: DiRegistrationOperationHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      new DiProductIdentity(
        handles.identityHandle,
        KernelVocabulary.Di.ContainerRegistration.key,
        container.identityHandle,
        admission.identityHandle,
        operation.sourceAddressHandle,
      ),
      new SemanticClaim(
        handles.acceptRegistrationClaimHandle,
        container.productHandle,
        KernelVocabulary.Di.AcceptsRegistration.key,
        admission.productHandle,
        provenanceHandle,
      ),
    ];
  }

  private recordsForOperationEnvelope(
    local: string,
    operation: DiRegistrationOperationEmission,
    materializationClaimHandles: readonly ClaimHandle[],
    openSeamHandles: readonly OpenSeamHandle[],
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      new MaterializedProduct(
        operation.productHandle,
        KernelVocabulary.Di.ContainerRegistration.key,
        operation.identityHandle,
        operation.product.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:operation`),
        operation.identityHandle,
        [operation.productHandle],
        materializationClaimHandles,
        openSeamHandles,
      ),
    ];
  }

  private recordsForOperationProductClaims(
    local: string,
    operationProductHandle: ProductHandle,
    producedProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): DiClaimEmission {
    const handles: ClaimHandle[] = [];
    const records = producedProductHandles.map((productHandle, index) => {
      const handle = this.store.handles.claim(`${local}:${index}`);
      handles.push(handle);
      return new SemanticClaim(
        handle,
        operationProductHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        productHandle,
        provenanceHandle,
      );
    });
    return new DiClaimEmission(records, handles);
  }

  private recordsForResolverAdmission(
    container: Container,
    admission: ResolverRegistrationAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resolvers: readonly Resolver[];
    readonly resolverSlots: readonly ContainerResolverSlot[];
    readonly openSeams: readonly OpenSeam[];
  } {
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    if (admission.keyRole !== RegistrationKeyRole.AdmittedKey || admission.targetKey?.identityHandle == null) {
      const seam = this.recordsForOpenSeam(
        `${local}:open-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resolver admission could not produce a container slot because the admitted DI key stayed open.',
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, resolvers: [], resolverSlots: [], openSeams };
    }

    if (!isResolverRegistrationStrategy(admission.strategy)) {
      const seam = this.recordsForOpenSeam(
        `${local}:open-strategy`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        `DI world construction does not yet spend ${admission.strategy} admissions into concrete container effects.`,
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, resolvers: [], resolverSlots: [], openSeams };
    }

    const resolver = this.recordsForResolver(container, admission, local, provenanceHandle);
    const slot = this.recordsForResolverSlot(container, admission, resolver.productHandle, local, provenanceHandle);
    records.push(...resolver.records, ...slot.records);
    return {
      records,
      resolvers: [resolver.product],
      resolverSlots: [slot.product],
      openSeams,
    };
  }

  private recordsForResolver(
    container: Container,
    admission: ResolverRegistrationAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiProductEmission<Resolver> {
    const handles = this.resolverHandles(local, admission);
    const resolver = this.resolverForAdmission(handles.productHandle, handles.identityHandle, admission, provenanceHandle);
    const records = this.recordsForResolverProduct(
      local,
      container,
      admission,
      resolver,
      handles,
      provenanceHandle,
    );
    return new DiProductEmission(records, resolver, handles.productHandle, handles.identityHandle);
  }

  private resolverHandles(
    local: string,
    admission: ResolverRegistrationAdmission,
  ): DiResolverHandles {
    return new DiResolverHandles(
      this.store.handles.product(`${local}:resolver`),
      this.store.handles.identity(`${local}:resolver`),
      admission.targetKey!.identityHandle!,
      this.store.handles.claim(`${local}:resolver-provides-key`),
    );
  }

  private resolverForAdmission(
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    admission: ResolverRegistrationAdmission,
    provenanceHandle: ProvenanceHandle,
  ): Resolver {
    return new Resolver(
      productHandle,
      identityHandle,
      admission.targetKey!,
      admission.strategy,
      admission.registeredValue,
      admission.sourceAddressHandle,
      compactFieldProvenance<ResolverField>([
        new FieldProvenance('_key', provenanceHandle),
        new FieldProvenance('_strategy', provenanceHandle),
        admission.registeredValue == null ? null : new FieldProvenance('_state', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private recordsForResolverProduct(
    local: string,
    container: Container,
    admission: ResolverRegistrationAdmission,
    resolver: Resolver,
    handles: DiResolverHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      this.resolverIdentity(container, admission, resolver),
      this.resolverProvidesKeyClaim(resolver, handles, provenanceHandle),
      this.resolverProduct(admission, resolver, provenanceHandle),
      this.resolverMaterialization(local, resolver, handles),
    ];
  }

  private resolverIdentity(
    container: Container,
    admission: ResolverRegistrationAdmission,
    resolver: Resolver,
  ): DiProductIdentity {
    return new DiProductIdentity(
      resolver.identityHandle,
      KernelVocabulary.Di.Resolver.key,
      container.identityHandle,
      admission.identityHandle,
      admission.sourceAddressHandle,
    );
  }

  private resolverProvidesKeyClaim(
    resolver: Resolver,
    handles: DiResolverHandles,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      handles.providesKeyClaimHandle,
      resolver.productHandle,
      KernelVocabulary.Di.ProvidesKey.key,
      handles.keyIdentityHandle,
      provenanceHandle,
    );
  }

  private resolverProduct(
    admission: ResolverRegistrationAdmission,
    resolver: Resolver,
    provenanceHandle: ProvenanceHandle,
  ): MaterializedProduct {
    return new MaterializedProduct(
      resolver.productHandle,
      KernelVocabulary.Di.Resolver.key,
      resolver.identityHandle,
      admission.sourceAddressHandle,
      provenanceHandle,
    );
  }

  private resolverMaterialization(
    local: string,
    resolver: Resolver,
    handles: DiResolverHandles,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(`${local}:resolver`),
      resolver.identityHandle,
      [resolver.productHandle],
      handles.claimHandles,
    );
  }

  private recordsForResolverSlot(
    container: Container,
    admission: ResolverRegistrationAdmission,
    resolverProductHandle: ProductHandle,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiProductEmission<ContainerResolverSlot> {
    const handles = this.resolverSlotHandles(local, admission);
    const slot = this.resolverSlotForAdmission(container, admission, resolverProductHandle, handles, provenanceHandle);
    const records = this.recordsForResolverSlotProduct(
      local,
      container,
      admission,
      slot,
      handles,
      provenanceHandle,
    );
    return new DiProductEmission(records, slot, handles.productHandle, handles.identityHandle);
  }

  private resolverSlotHandles(
    local: string,
    admission: ResolverRegistrationAdmission,
  ): DiResolverSlotHandles {
    return new DiResolverSlotHandles(
      this.store.handles.product(`${local}:resolver-slot`),
      this.store.handles.identity(`${local}:resolver-slot`),
      admission.targetKey!.identityHandle!,
      this.store.handles.claim(`${local}:resolver-slot-provides-key`),
    );
  }

  private resolverSlotForAdmission(
    container: Container,
    admission: ResolverRegistrationAdmission,
    resolverProductHandle: ProductHandle,
    handles: DiResolverSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): ContainerResolverSlot {
    return new ContainerResolverSlot(
      handles.productHandle,
      container.toReference(),
      handles.keyIdentityHandle,
      resolverProductHandle,
      admission.strategy,
      false,
      admission.sourceAddressHandle,
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('resolver', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private recordsForResolverSlotProduct(
    local: string,
    container: Container,
    admission: ResolverRegistrationAdmission,
    slot: ContainerResolverSlot,
    handles: DiResolverSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      this.resolverSlotIdentity(container, admission, handles),
      this.resolverSlotProvidesKeyClaim(slot, handles, provenanceHandle),
      this.resolverSlotProduct(admission, slot, handles, provenanceHandle),
      this.resolverSlotMaterialization(local, slot, handles),
    ];
  }

  private resolverSlotIdentity(
    container: Container,
    admission: ResolverRegistrationAdmission,
    handles: DiResolverSlotHandles,
  ): DiProductIdentity {
    return new DiProductIdentity(
      handles.identityHandle,
      KernelVocabulary.Di.ResolverSlot.key,
      container.identityHandle,
      admission.identityHandle,
      admission.sourceAddressHandle,
    );
  }

  private resolverSlotProvidesKeyClaim(
    slot: ContainerResolverSlot,
    handles: DiResolverSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      handles.providesKeyClaimHandle,
      slot.productHandle,
      KernelVocabulary.Di.ProvidesKey.key,
      handles.keyIdentityHandle,
      provenanceHandle,
    );
  }

  private resolverSlotProduct(
    admission: ResolverRegistrationAdmission,
    slot: ContainerResolverSlot,
    handles: DiResolverSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): MaterializedProduct {
    return new MaterializedProduct(
      slot.productHandle,
      KernelVocabulary.Di.ResolverSlot.key,
      handles.identityHandle,
      admission.sourceAddressHandle,
      provenanceHandle,
    );
  }

  private resolverSlotMaterialization(
    local: string,
    slot: ContainerResolverSlot,
    handles: DiResolverSlotHandles,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(`${local}:resolver-slot`),
      handles.identityHandle,
      [slot.productHandle],
      handles.claimHandles,
    );
  }

  private recordsForParameterizedRegistry(
    container: Container,
    admission: ParameterizedRegistryAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly registry: ParameterizedRegistry | null;
    readonly openSeams: readonly OpenSeam[];
  } {
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    if (admission.registryLookupKey == null) {
      const seam = this.recordsForOpenSeam(
        `${local}:parameterized-registry-open-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'ParameterizedRegistry admission did not expose a closed registry lookup key.',
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, registry: null, openSeams };
    }

    const registry = this.parameterizedRegistryForAdmission(local, admission, provenanceHandle);
    const registryResult = registry.register(container);
    const seam = this.recordsForOpenSeam(
      `${local}:parameterized-registry-open`,
      KernelVocabulary.Di.OpenRegistryBody.key,
      summaryForParameterizedRegistryResult(registryResult?.state ?? RegistryRegistrationState.Open),
      admission.sourceAddressHandle,
    );
    records.push(
      ...this.recordsForParameterizedRegistryProduct(local, container, admission, registry, provenanceHandle, [seam.seam.handle]),
      ...seam.records,
    );
    openSeams.push(seam.seam);
    return { records, registry, openSeams };
  }

  private parameterizedRegistryForAdmission(
    local: string,
    admission: ParameterizedRegistryAdmission,
    provenanceHandle: ProvenanceHandle,
  ): ParameterizedRegistry {
    return new ParameterizedRegistry(
      this.store.handles.product(`${local}:parameterized-registry`),
      this.store.handles.identity(`${local}:parameterized-registry`),
      admission.registryLookupKey!,
      admission.registryParameters,
      admission.sourceAddressHandle,
      compactFieldProvenance<RegistryField>([
        new FieldProvenance('key', provenanceHandle),
        admission.registryParameters.length === 0 ? null : new FieldProvenance('params', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private recordsForParameterizedRegistryProduct(
    local: string,
    container: Container,
    admission: ParameterizedRegistryAdmission,
    registry: ParameterizedRegistry,
    provenanceHandle: ProvenanceHandle,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new DiProductIdentity(
        registry.identityHandle,
        KernelVocabulary.Di.ParameterizedRegistry.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new MaterializedProduct(
        registry.productHandle,
        KernelVocabulary.Di.ParameterizedRegistry.key,
        registry.identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:parameterized-registry`),
        registry.identityHandle,
        [registry.productHandle],
        [],
        openSeamHandles,
      ),
    ];
  }

  private recordsForRegistry(
    container: Container,
    admission: RegistryRegistrationAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
    registryBodyInterpreted: boolean,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly registry: RegistryValue;
    readonly openSeams: readonly OpenSeam[];
  } {
    const registry = this.registryForAdmission(local, admission, provenanceHandle);
    const openSummary = registryBodyInterpreted ? null : summaryForRegistryAdmissionOpen(admission);
    const seam = openSummary == null
      ? null
      : this.recordsForOpenSeam(
        `${local}:registry-open`,
        KernelVocabulary.Di.OpenRegistryBody.key,
        openSummary,
        admission.sourceAddressHandle,
      );
    const records: KernelStoreRecord[] = [
      ...this.recordsForRegistryProduct(
        local,
        container,
        admission,
        registry,
        provenanceHandle,
        seam == null ? [] : [seam.seam.handle],
      ),
      ...(seam?.records ?? []),
    ];
    return { records, registry, openSeams: seam == null ? [] : [seam.seam] };
  }

  private registryForAdmission(
    local: string,
    admission: RegistryRegistrationAdmission,
    provenanceHandle: ProvenanceHandle,
  ): RegistryValue {
    return new RegistryValue(
      this.store.handles.product(`${local}:registry`),
      this.store.handles.identity(`${local}:registry`),
      admission.registryValue,
      admission.sourceAddressHandle,
      compactFieldProvenance<RegistryField>([
        admission.registryValue == null ? null : new FieldProvenance('registryValue', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private recordsForRegistryProduct(
    local: string,
    container: Container,
    admission: RegistryRegistrationAdmission,
    registry: RegistryValue,
    provenanceHandle: ProvenanceHandle,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new DiProductIdentity(
        registry.identityHandle,
        KernelVocabulary.Di.Registry.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new MaterializedProduct(
        registry.productHandle,
        KernelVocabulary.Di.Registry.key,
        registry.identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:registry`),
        registry.identityHandle,
        [registry.productHandle],
        [],
        openSeamHandles,
      ),
    ];
  }

  private recordsForResourceAdmission(
    container: Container,
    admission: ResourceRegistrationAdmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResourceSlotEmission {
    const records: KernelStoreRecord[] = [];
    const slots: ContainerResourceSlot[] = [];
    const claimHandles: ClaimHandle[] = [];
    const openSeams: OpenSeam[] = [];

    const definition = resourceDefinitions?.lookupByProduct(admission.registeredValue.productHandle) ?? null;
    if (definition == null) {
      const seam = this.recordsForOpenSeam(
        `${local}:definition-open`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resource registration admission did not resolve to a full resource definition during DI world construction.',
        admission.sourceAddressHandle,
      );
      return new DiResourceSlotEmission(seam.records, [], [], [seam.seam]);
    }

    const names = resourceLookupNames(definition);
    names.forEach((name, index) => {
      const slot = this.recordsForResourceDefinitionSlot(
        container,
        definition,
        name,
        `${local}:${index}`,
        provenanceHandle,
      );
      if (slot == null) {
        return;
      }
      records.push(...slot.records);
      slots.push(slot.slot);
      claimHandles.push(...slot.claimHandles);
    });

    if (slots.length === 0) {
      const seam = this.recordsForOpenSeam(
        `${local}:no-resource-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resource registration did not produce any runtime resource-key rows.',
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
    }

    return new DiResourceSlotEmission(records, slots, claimHandles, openSeams);
  }

  private recordsForConfiguredResourceSlots(
    container: Container,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResourceSlotEmission {
    const selection = configuredResources.selections.find((candidate) =>
      candidate.registrationAdmissionProductHandle === admission.productHandle
    );
    if (selection == null) {
      return new DiResourceSlotEmission([], [], []);
    }

    const resourceEmissions: BuiltInResourceEmission[] = [];
    for (const catalogProductHandle of selection.catalogProductHandles) {
      resourceEmissions.push(...configuredResources.catalogEmission.resources.filter((resource) =>
        resource.catalogProductHandle === catalogProductHandle
      ));
    }

    const records: KernelStoreRecord[] = [];
    const slots: ContainerResourceSlot[] = [];
    const claimHandles: ClaimHandle[] = [];
    resourceEmissions.forEach((emission, resourceIndex) => {
      const resource = emission.resource;
      const names = [resource.name, ...resource.aliases];
      names.forEach((name, nameIndex) => {
        const slot = this.recordsForBuiltInResourceSlot(
          container,
          resource,
          name,
          `${local}:${resourceIndex}:${nameIndex}`,
          provenanceHandle,
        );
        if (slot == null) {
          return;
        }
        records.push(...slot.records);
        slots.push(slot.slot);
        claimHandles.push(...slot.claimHandles);
      });
    });

    return new DiResourceSlotEmission(records, slots, claimHandles);
  }

  private recordsForFrameworkRegistrationEffects(
    container: Container,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiFrameworkRegistrationEffectEmission {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      return new DiFrameworkRegistrationEffectEmission([], [], [], [], []);
    }

    const capabilities = new Set(frameworkRegistrationCapabilitiesForKind(frameworkKind));
    const resourceEmission = this.recordsForConfiguredResourceSlots(
      container,
      admission,
      configuredResources,
      `${local}:resources`,
      provenanceHandle,
    );
    const resolverEmissions = frameworkResolverEffects
      .filter((effect) => capabilities.has(effect.capability))
      .map((effect, index) =>
        this.recordsForFrameworkResolverEffect(
          container,
          admission,
          effect,
          `${local}:resolver:${index}`,
          provenanceHandle,
        )
      );
    const appTaskEmissions = frameworkAppTaskEffects
      .filter((effect) => capabilities.has(effect.capability))
      .map((effect, index) =>
        this.recordsForFrameworkAppTaskEffect(
          admission,
          effect,
          `${local}:app-task:${index}`,
          provenanceHandle,
        )
      );

    return new DiFrameworkRegistrationEffectEmission(
      [
        ...resourceEmission.records,
        ...resolverEmissions.flatMap((emission) => emission.records),
        ...appTaskEmissions.flatMap((emission) => emission.records),
      ],
      resolverEmissions.map((emission) => emission.resolver),
      resolverEmissions.map((emission) => emission.resolverSlot),
      resourceEmission.slots,
      appTaskEmissions.map((emission) => emission.appTask),
      resourceEmission.openSeams,
    );
  }

  private recordsForFrameworkResolverEffect(
    container: Container,
    admission: RegistrationAdmissionProduct,
    effect: FrameworkResolverEffect,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly resolver: Resolver;
    readonly resolverSlot: ContainerResolverSlot;
  } {
    const records: KernelStoreRecord[] = [];
    const keyIdentityHandle = this.store.handles.identity(`${local}:key:${effect.keyName}`);
    this.emitInterfaceKeyIdentity(records, keyIdentityHandle, effect.keyName, admission.sourceAddressHandle);

    const key = new RegistrationKeyReference(
      keyIdentityHandle,
      admission.sourceAddressHandle,
      effect.keyName,
    );
    const state = effect.valueKind == null
      ? null
      : new RegistrationValueReference(
        effect.valueKind,
        null,
        null,
        admission.sourceAddressHandle,
        effect.valueName,
      );

    const resolverProductHandle = this.store.handles.product(`${local}:resolver`);
    const resolverIdentityHandle = this.store.handles.identity(`${local}:resolver`);
    const resolverProvidesKeyClaimHandle = this.store.handles.claim(`${local}:resolver-provides-key`);
    const resolver = new Resolver(
      resolverProductHandle,
      resolverIdentityHandle,
      key,
      effect.strategy,
      state,
      admission.sourceAddressHandle,
      compactFieldProvenance<ResolverField>([
        new FieldProvenance('_key', provenanceHandle),
        new FieldProvenance('_strategy', provenanceHandle),
        state == null ? null : new FieldProvenance('_state', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );

    const resolverSlotProductHandle = this.store.handles.product(`${local}:resolver-slot`);
    const resolverSlotIdentityHandle = this.store.handles.identity(`${local}:resolver-slot`);
    const resolverSlotProvidesKeyClaimHandle = this.store.handles.claim(`${local}:resolver-slot-provides-key`);
    const resolverSlot = new ContainerResolverSlot(
      resolverSlotProductHandle,
      container.toReference(),
      keyIdentityHandle,
      resolver.productHandle,
      effect.strategy,
      false,
      admission.sourceAddressHandle,
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('resolver', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );

    records.push(
      new DiProductIdentity(
        resolver.identityHandle,
        KernelVocabulary.Di.Resolver.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new SemanticClaim(
        resolverProvidesKeyClaimHandle,
        resolver.productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        keyIdentityHandle,
        provenanceHandle,
      ),
      new MaterializedProduct(
        resolver.productHandle,
        KernelVocabulary.Di.Resolver.key,
        resolver.identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:resolver`),
        resolver.identityHandle,
        [resolver.productHandle],
        [resolverProvidesKeyClaimHandle],
      ),
      new DiProductIdentity(
        resolverSlotIdentityHandle,
        KernelVocabulary.Di.ResolverSlot.key,
        container.identityHandle,
        admission.identityHandle,
        admission.sourceAddressHandle,
      ),
      new SemanticClaim(
        resolverSlotProvidesKeyClaimHandle,
        resolverSlot.productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        keyIdentityHandle,
        provenanceHandle,
      ),
      new MaterializedProduct(
        resolverSlot.productHandle,
        KernelVocabulary.Di.ResolverSlot.key,
        resolverSlotIdentityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:resolver-slot`),
        resolverSlotIdentityHandle,
        [resolverSlot.productHandle],
        [resolverSlotProvidesKeyClaimHandle],
      ),
    );

    return { records, resolver, resolverSlot };
  }

  private recordsForFrameworkAppTaskEffect(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkAppTaskEffect,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly appTask: AppTaskDefinition;
  } {
    const records: KernelStoreRecord[] = [];
    const keyIdentityHandle = this.store.handles.identity(`${local}:key:${effect.keyName}`);
    this.emitInterfaceKeyIdentity(records, keyIdentityHandle, effect.keyName, admission.sourceAddressHandle);

    const taskProductHandle = this.store.handles.product(local);
    const taskIdentityHandle = this.store.handles.identity(local);
    const task = new AppTaskDefinition(
      taskProductHandle,
      taskIdentityHandle,
      effect.slot,
      AppTaskCallbackKind.ResolvedKey,
      new RegistrationKeyReference(
        keyIdentityHandle,
        admission.sourceAddressHandle,
        effect.keyName,
      ),
      new ConfigurationCallbackReference(
        null,
        null,
        admission.sourceAddressHandle,
        effect.callbackName,
      ),
      admission.sourceAddressHandle,
      compactFieldProvenance<AppTaskField>([
        new FieldProvenance('slot', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('callback', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );

    records.push(
      new ConfigurationIdentity(
        task.identityHandle,
        KernelVocabulary.Configuration.AppTask.key,
        admission.identityHandle,
        admission.sourceAddressHandle,
        `AppTask.${effect.slot}`,
      ),
      new MaterializedProduct(
        task.productHandle,
        KernelVocabulary.Configuration.AppTask.key,
        task.identityHandle,
        admission.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        task.identityHandle,
        [task.productHandle],
      ),
    );

    return { records, appTask: task };
  }

  private recordsForResourceDefinitionSlot(
    container: Container,
    definition: FullResourceDefinition,
    lookupName: string,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot;
    readonly claimHandles: readonly ClaimHandle[];
  } | null {
    if (definition.identityHandle == null || definition.productHandle == null) {
      return null;
    }
    return this.recordsForResourceSlot(
      container,
      new DiResourceSlotPublication(
        definition.type,
        lookupName,
        definition.identityHandle,
        definition.productHandle,
        definition.sourceAddressHandle,
      ),
      local,
      provenanceHandle,
    );
  }

  private recordsForBuiltInResourceSlot(
    container: Container,
    resource: BuiltInResourceEmission['resource'],
    lookupName: string,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot;
    readonly claimHandles: readonly ClaimHandle[];
  } | null {
    if (resource.identityHandle == null || resource.productHandle == null) {
      return null;
    }
    return this.recordsForResourceSlot(
      container,
      new DiResourceSlotPublication(
        resource.resourceKind,
        lookupName,
        resource.identityHandle,
        resource.productHandle,
        resource.sourceAddressHandle,
      ),
      local,
      provenanceHandle,
    );
  }

  private recordsForResourceSlot(
    container: Container,
    publication: DiResourceSlotPublication,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly slot: ContainerResourceSlot;
    readonly claimHandles: readonly ClaimHandle[];
  } | null {
    const resourceKey = this.resourceSlotKey(container, publication);
    if (resourceKey == null) {
      return null;
    }

    const records: KernelStoreRecord[] = [];
    const handles = this.resourceSlotHandles(container, local, resourceKey);
    this.emitResourceKeyIdentity(
      records,
      handles.keyIdentityHandle,
      publication.resourceIdentityHandle,
      resourceKey,
      this.resourceSlotSourceAddress(container, publication),
    );

    const slot = this.resourceSlotForPublication(container, publication, resourceKey, handles, provenanceHandle);
    records.push(
      ...this.recordsForResourceSlotProduct(
        container,
        slot,
        handles,
        provenanceHandle,
      ),
    );
    return {
      records,
      slot,
      claimHandles: handles.claimHandles,
    };
  }

  private resourceSlotKey(
    container: Container,
    publication: DiResourceSlotPublication,
  ): string | null {
    const resourceKey = runtimeResourceKeyForKind(publication.resourceKind, publication.lookupName);
    return resourceKey == null || container.hasResource(resourceKey, false)
      ? null
      : resourceKey;
  }

  private resourceSlotHandles(
    container: Container,
    local: string,
    resourceKey: string,
  ): DiResourceSlotHandles {
    const slotLocal = `di-resource-slot:${container.productHandle}:${resourceKey}`;
    return new DiResourceSlotHandles(
      slotLocal,
      this.store.handles.product(slotLocal),
      this.store.handles.identity(slotLocal),
      this.store.handles.identity(`di-key:resource:${resourceKey}`),
      this.store.handles.claim(`${local}:provides-key`),
    );
  }

  private resourceSlotForPublication(
    container: Container,
    publication: DiResourceSlotPublication,
    resourceKey: string,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): ContainerResourceSlot {
    return new ContainerResourceSlot(
      handles.productHandle,
      container.toReference(),
      resourceKey,
      handles.keyIdentityHandle,
      publication.resourceIdentityHandle,
      publication.resourceProductHandle,
      null,
      this.resourceSlotSourceAddress(container, publication),
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('resource', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private resourceSlotSourceAddress(
    container: Container,
    publication: DiResourceSlotPublication,
  ): AddressHandle | null {
    return publication.sourceAddressHandle ?? container.sourceAddressHandle;
  }

  private recordsForResourceSlotProduct(
    container: Container,
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      this.resourceSlotIdentity(container, slot, handles),
      this.resourceSlotProvidesKeyClaim(slot, handles, provenanceHandle),
      this.resourceSlotProduct(slot, handles, provenanceHandle),
      this.resourceSlotMaterialization(slot, handles),
    ];
  }

  private resourceSlotIdentity(
    container: Container,
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
  ): DiProductIdentity {
    return new DiProductIdentity(
      handles.identityHandle,
      KernelVocabulary.Di.ResourceSlot.key,
      container.identityHandle,
      slot.resourceIdentityHandle,
      slot.sourceAddressHandle,
    );
  }

  private resourceSlotProvidesKeyClaim(
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      handles.claimHandle,
      slot.productHandle,
      KernelVocabulary.Di.ProvidesKey.key,
      handles.keyIdentityHandle,
      provenanceHandle,
    );
  }

  private resourceSlotProduct(
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
    provenanceHandle: ProvenanceHandle,
  ): MaterializedProduct {
    return new MaterializedProduct(
      slot.productHandle,
      KernelVocabulary.Di.ResourceSlot.key,
      handles.identityHandle,
      slot.sourceAddressHandle,
      provenanceHandle,
    );
  }

  private resourceSlotMaterialization(
    slot: ContainerResourceSlot,
    handles: DiResourceSlotHandles,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(handles.slotLocal),
      handles.identityHandle,
      [slot.productHandle],
      handles.claimHandles,
    );
  }

  private recordsForContainerSelfResolver(container: Container): DiProductEmission<ContainerSelfResolverSlot> {
    const local = `di-self-resolver:${container.productHandle}`;
    const source = this.recordsForSource(
      `${local}:source`,
      'Container constructor installs the built-in IContainer self resolver.',
      container.sourceAddressHandle,
    );
    const records: KernelStoreRecord[] = [...source.records];
    const handles = this.containerSelfResolverHandles(local);
    this.emitInterfaceKeyIdentity(
      records,
      handles.keyIdentityHandle,
      'IContainer',
      container.sourceAddressHandle,
    );

    const slot = this.containerSelfResolverSlot(
      handles.productHandle,
      container,
      handles.keyIdentityHandle,
      source.provenanceHandle,
    );
    records.push(
      ...this.recordsForContainerSelfResolverProduct(
        local,
        container,
        slot,
        handles,
        source.provenanceHandle,
      ),
    );
    return new DiProductEmission(records, slot, handles.productHandle, handles.identityHandle);
  }

  private containerSelfResolverHandles(local: string): DiContainerSelfResolverHandles {
    return new DiContainerSelfResolverHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      this.store.handles.identity('di-key:interface:IContainer'),
      this.store.handles.claim(`${local}:provides-key`),
      this.store.handles.claim(`${local}:container-produces-product`),
    );
  }

  private containerSelfResolverSlot(
    productHandle: ProductHandle,
    container: Container,
    keyIdentityHandle: IdentityHandle,
    provenanceHandle: ProvenanceHandle,
  ): ContainerSelfResolverSlot {
    return new ContainerSelfResolverSlot(
      productHandle,
      container.toReference(),
      keyIdentityHandle,
      container.sourceAddressHandle,
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private recordsForContainerSelfResolverProduct(
    local: string,
    container: Container,
    slot: ContainerSelfResolverSlot,
    handles: DiContainerSelfResolverHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      this.containerSelfResolverIdentity(container, handles),
      ...this.containerSelfResolverClaims(container, slot, handles, provenanceHandle),
      this.containerSelfResolverProduct(slot, handles, container.sourceAddressHandle, provenanceHandle),
      this.containerSelfResolverMaterialization(local, slot, handles),
    ];
  }

  private containerSelfResolverIdentity(
    container: Container,
    handles: DiContainerSelfResolverHandles,
  ): DiProductIdentity {
    return new DiProductIdentity(
      handles.identityHandle,
      KernelVocabulary.Di.SelfResolverSlot.key,
      container.identityHandle,
      handles.keyIdentityHandle,
      container.sourceAddressHandle,
    );
  }

  private containerSelfResolverClaims(
    container: Container,
    slot: ContainerSelfResolverSlot,
    handles: DiContainerSelfResolverHandles,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        handles.providesKeyClaimHandle,
        slot.productHandle,
        KernelVocabulary.Di.ProvidesKey.key,
        handles.keyIdentityHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        handles.producedClaimHandle,
        container.productHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        slot.productHandle,
        provenanceHandle,
      ),
    ];
  }

  private containerSelfResolverProduct(
    slot: ContainerSelfResolverSlot,
    handles: DiContainerSelfResolverHandles,
    sourceAddressHandle: AddressHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): MaterializedProduct {
    return new MaterializedProduct(
      slot.productHandle,
      KernelVocabulary.Di.SelfResolverSlot.key,
      handles.identityHandle,
      sourceAddressHandle,
      provenanceHandle,
    );
  }

  private containerSelfResolverMaterialization(
    local: string,
    slot: ContainerSelfResolverSlot,
    handles: DiContainerSelfResolverHandles,
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(local),
      handles.identityHandle,
      [slot.productHandle],
      handles.claimHandles,
    );
  }

  private recordsForSource(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
  ): DiSourceSet {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Registration],
        summary,
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new DiSourceSet(records, provenanceHandle);
  }

  private recordsForOpenSeam(
    local: string,
    seamKindKey: OpenSeamKindKey,
    summary: string,
    addressHandle: AddressHandle | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly seam: OpenSeam;
  } {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const seamHandle = this.store.handles.openSeam(local);
    const seam = new OpenSeam(seamHandle, seamKindKey, summary, addressHandle, evidenceHandle);
    return {
      records: [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Diagnostic, EvidenceRole.Registration],
          summary,
          addressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
        seam,
      ],
      seam,
    };
  }

  private emitInterfaceKeyIdentity(
    records: KernelStoreRecord[],
    handle: IdentityHandle,
    interfaceName: string,
    addressHandle: AddressHandle | null,
  ): void {
    if (this.emittedIdentityHandles.has(handle) || this.store.readIdentity(handle) != null) {
      return;
    }
    this.emittedIdentityHandles.add(handle);
    records.push(new InterfaceDiKeyIdentity(
      handle,
      interfaceName,
      null,
      addressHandle,
    ));
  }

  private emitResourceKeyIdentity(
    records: KernelStoreRecord[],
    handle: IdentityHandle,
    resourceIdentityHandle: IdentityHandle,
    resourceKey: string,
    addressHandle: AddressHandle | null,
  ): void {
    if (this.emittedIdentityHandles.has(handle) || this.store.readIdentity(handle) != null) {
      return;
    }
    this.emittedIdentityHandles.add(handle);
    records.push(new ResourceDiKeyIdentity(
      handle,
      resourceIdentityHandle,
      resourceKey,
      addressHandle,
    ));
  }
}

function resourceLookupNames(definition: FullResourceDefinition): readonly string[] {
  if (definition.type === ResourceDefinitionKind.AttributePattern) {
    return [];
  }
  return [definition.name, ...definition.aliases.map((alias) => alias.name)];
}

function summaryForParameterizedRegistryResult(state: RegistryRegistrationState): string {
  switch (state) {
    case RegistryRegistrationState.Delegated:
      return 'ParameterizedRegistry found a registry key, but delegated registry body interpretation is still open.';
    case RegistryRegistrationState.ParameterAdmission:
      return 'ParameterizedRegistry fell back to registering object parameters; recursive parameter spending is still open.';
    case RegistryRegistrationState.Open:
      return 'ParameterizedRegistry could not close its registry key or parameter registration behavior yet.';
  }
}

function summaryForOpenRegistrationAdmission(admission: OpenRegistrationAdmission): string {
  switch (admission.strategy) {
    case RegistrationStrategy.Unknown:
      return 'Registration admission was preserved, but recognition could not classify its runtime strategy yet.';
    case RegistrationStrategy.Resource:
      return 'Resource registration admission was preserved for later resource-to-container spending.';
    case RegistrationStrategy.PlainClassSelf:
      return 'Plain-class fallback admission was preserved for later default resolver and auto-registration modeling.';
    case RegistrationStrategy.ObjectMap:
      return 'Object-map registration admission was preserved for later recursive entry spending.';
    case RegistrationStrategy.Factory:
      return 'Factory registration admission was preserved for later factory-map modeling.';
    case RegistrationStrategy.Defer:
      return 'Deferred registration admission was preserved, but its parameterized registry shape was not closed.';
    case RegistrationStrategy.FrameworkGroup:
      return 'Framework registration admission was preserved, but its framework effect package was not classified.';
    case RegistrationStrategy.Registry:
    case RegistrationStrategy.Instance:
    case RegistrationStrategy.Singleton:
    case RegistrationStrategy.Transient:
    case RegistrationStrategy.Callback:
    case RegistrationStrategy.CachedCallback:
    case RegistrationStrategy.AliasTo:
    case RegistrationStrategy.Resolver:
    case RegistrationStrategy.Array:
      return `Registration admission was preserved as open because ${admission.strategy} could not be spent by this product type.`;
  }
}

function frameworkRegistrationEffectsCloseRegistryBody(admission: RegistrationAdmissionProduct): boolean {
  switch (frameworkRegistrationKindForAdmission(admission)) {
    case FrameworkRegistrationKind.I18nConfiguration:
    case FrameworkRegistrationKind.RouterConfiguration:
    case FrameworkRegistrationKind.RouterDefaultComponents:
    case FrameworkRegistrationKind.RouterDefaultResources:
    case FrameworkRegistrationKind.StateDefaultConfiguration:
    case FrameworkRegistrationKind.DialogConfiguration:
      return true;
    case FrameworkRegistrationKind.StandardConfiguration:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
    case null:
      return false;
    case FrameworkRegistrationKind.AppTask:
      return true;
  }
}

function summaryForRegistryAdmissionOpen(admission: RegistryRegistrationAdmission): string | null {
  switch (admission.registryValue?.frameworkKind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return null;
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return null;
    case FrameworkRegistrationKind.I18nConfiguration:
      return null;
    case FrameworkRegistrationKind.RouterConfiguration:
      return null;
    case FrameworkRegistrationKind.RouterDefaultComponents:
      return null;
    case FrameworkRegistrationKind.RouterDefaultResources:
      return null;
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return null;
    case FrameworkRegistrationKind.DialogConfiguration:
      return null;
    case FrameworkRegistrationKind.AppTask:
      return null;
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'Framework syntax group effects can be selected by template compilation, but DI has not spent remaining expanded registrations yet.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'DefaultResources resource headers can feed DI resource slots; non-resource spread effects are still open.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
      return 'DefaultRenderers runtime renderer effects can feed template compilation, but DI has not spent remaining expanded registrations yet.';
    case null:
    case undefined:
      return 'IRegistry registration body has not been interpreted by DI world construction yet.';
  }
}

function summaryForFrameworkRegistrationOpen(frameworkKind: FrameworkRegistrationKind): string | null {
  switch (frameworkKind) {
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return 'DefaultBindingSyntax spread syntax effects can be selected by template compilation; EventModifierRegistration and remaining DI effects are not spent yet.';
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return 'ShortHandBindingSyntax spread syntax effects can be selected by template compilation.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'DefaultBindingLanguage spread syntax effects can be selected by template compilation.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'DefaultResources spread resource headers can feed DI resource slots; non-resource spread effects are still open.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return 'DefaultComponents compiler service effects can feed compiler-world formation; remaining expanded registrations are not spent yet.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
      return 'DefaultRenderers runtime renderer effects can feed template compilation; remaining expanded registrations are not spent yet.';
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'StandardConfiguration syntax and default resource effects can feed template compilation, but DI has not spent the remaining resolver and renderer effects yet.';
    case FrameworkRegistrationKind.I18nConfiguration:
      return null;
    case FrameworkRegistrationKind.RouterConfiguration:
      return null;
    case FrameworkRegistrationKind.RouterDefaultComponents:
      return null;
    case FrameworkRegistrationKind.RouterDefaultResources:
      return null;
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return null;
    case FrameworkRegistrationKind.DialogConfiguration:
      return null;
    case FrameworkRegistrationKind.AppTask:
      return null;
  }
}

function appTaskForRegistryAdmission(
  admission: RegistryRegistrationAdmission,
  appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
): AppTaskDefinition | null {
  if (frameworkRegistrationKindForAdmission(admission) !== FrameworkRegistrationKind.AppTask) {
    return null;
  }
  const productHandle = admission.registryValue?.productHandle ?? null;
  return productHandle == null ? null : appTasksByProduct.get(productHandle) ?? null;
}
