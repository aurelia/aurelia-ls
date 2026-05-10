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
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  AppTaskCallbackKind,
  AppTaskDefinition,
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
  RegistrationValueReference,
} from '../registration/registration-reference.js';
import {
  frameworkRegistrationEffectsForKind,
  type FrameworkAppTaskEffect,
  type FrameworkResolverEffect,
} from './framework-registration-effects.js';
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

interface PublishedDiProductRecordSpec {
  readonly productKindKey: ProductKindKey;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly parentIdentityHandle: IdentityHandle | null;
  readonly ownerIdentityHandle: IdentityHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly providesKeyClaimHandle: ClaimHandle;
  readonly keyIdentityHandle: IdentityHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly materializationLocal: string;
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

function recordsForPublishedDiProduct(
  store: KernelStore,
  spec: PublishedDiProductRecordSpec,
): readonly KernelStoreRecord[] {
  return [
    new DiProductIdentity(
      spec.identityHandle,
      spec.productKindKey,
      spec.parentIdentityHandle,
      spec.ownerIdentityHandle,
      spec.sourceAddressHandle,
    ),
    new SemanticClaim(
      spec.providesKeyClaimHandle,
      spec.productHandle,
      KernelVocabulary.Di.ProvidesKey.key,
      spec.keyIdentityHandle,
      spec.provenanceHandle,
    ),
    new MaterializedProduct(
      spec.productHandle,
      spec.productKindKey,
      spec.identityHandle,
      spec.sourceAddressHandle,
      spec.provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(spec.materializationLocal),
      spec.identityHandle,
      [spec.productHandle],
      [spec.providesKeyClaimHandle],
    ),
  ];
}

interface DiResolverPublication {
  readonly ownerIdentityHandle: IdentityHandle;
  readonly key: RegistrationKeyReference;
  readonly keyIdentityHandle: IdentityHandle;
  readonly strategy: RegistrationStrategy;
  readonly state: RegistrationValueReference | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

interface DiResolverPublicationEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly resolver: Resolver;
  readonly resolverSlot: ContainerResolverSlot;
}

interface DiResolverPublicationHandles {
  readonly resolverProductHandle: ProductHandle;
  readonly resolverIdentityHandle: IdentityHandle;
  readonly resolverProvidesKeyClaimHandle: ClaimHandle;
  readonly resolverSlotProductHandle: ProductHandle;
  readonly resolverSlotIdentityHandle: IdentityHandle;
  readonly resolverSlotProvidesKeyClaimHandle: ClaimHandle;
}

class DiResourceSlotEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly slots: readonly ContainerResourceSlot[],
    readonly claimHandles: readonly ClaimHandle[],
    readonly openSeams: readonly OpenSeam[] = [],
  ) {}
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

interface DiRegistrationSpendingEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly operation: ContainerRegistrationOperation;
  readonly resolvers: readonly Resolver[];
  readonly registries: readonly RegistryValue[];
  readonly parameterizedRegistries: readonly ParameterizedRegistry[];
  readonly resolverSlots: readonly ContainerResolverSlot[];
  readonly resourceSlots: readonly ContainerResourceSlot[];
  readonly appTasks: readonly AppTaskDefinition[];
  readonly openSeams: readonly OpenSeam[];
}

interface DiRegistrationSpendingCascadeEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly operations: readonly ContainerRegistrationOperation[];
  readonly resolvers: readonly Resolver[];
  readonly registries: readonly RegistryValue[];
  readonly parameterizedRegistries: readonly ParameterizedRegistry[];
  readonly resolverSlots: readonly ContainerResolverSlot[];
  readonly resourceSlots: readonly ContainerResourceSlot[];
  readonly appTasks: readonly AppTaskDefinition[];
  readonly openSeams: readonly OpenSeam[];
}

type DiRegistrationDirectSpender = (
  container: Container,
  step: ConfigurationStep,
  admission: RegistrationAdmissionProduct,
  registryBodyInterpreted: boolean,
) => DiRegistrationSpendingEmission;

interface DiRegistrationSpendingCascadeServices {
  readonly admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>;
  readonly registryBodyIndex: RegistryBodyStepIndex;
  readonly spendDirect: DiRegistrationDirectSpender;
}

class DiRegistrationSpendingFrame {
  readonly records: KernelStoreRecord[];
  readonly resolvers: Resolver[] = [];
  readonly registries: RegistryValue[] = [];
  readonly parameterizedRegistries: ParameterizedRegistry[] = [];
  readonly resolverSlots: ContainerResolverSlot[] = [];
  readonly resourceSlots: ContainerResourceSlot[] = [];
  readonly appTasks: AppTaskDefinition[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly operationMaterializationClaimHandles: ClaimHandle[];

  constructor(
    source: DiSourceSet,
    readonly operation: DiRegistrationOperationEmission,
  ) {
    this.records = [
      ...source.records,
      ...operation.records,
    ];
    this.operationMaterializationClaimHandles = [operation.acceptRegistrationClaimHandle];
  }

  recordOpenSeam(
    seam: {
      readonly records: readonly KernelStoreRecord[];
      readonly seam: OpenSeam;
    },
  ): void {
    this.records.push(...seam.records);
    this.openSeams.push(seam.seam);
  }

  recordProductClaims(claims: DiClaimEmission): void {
    this.records.push(...claims.records);
    this.operationMaterializationClaimHandles.push(...claims.handles);
  }

  recordResolverEmission(container: Container, emission: {
    readonly records: readonly KernelStoreRecord[];
    readonly resolvers: readonly Resolver[];
    readonly resolverSlots: readonly ContainerResolverSlot[];
    readonly openSeams: readonly OpenSeam[];
  }): void {
    this.records.push(...emission.records);
    this.resolvers.push(...emission.resolvers);
    this.resolverSlots.push(...emission.resolverSlots);
    this.openSeams.push(...emission.openSeams);
    for (const slot of emission.resolverSlots) {
      container.registerResolver(slot);
    }
  }

  recordParameterizedRegistry(emission: {
    readonly records: readonly KernelStoreRecord[];
    readonly registry: ParameterizedRegistry | null;
    readonly openSeams: readonly OpenSeam[];
  }): void {
    this.records.push(...emission.records);
    if (emission.registry != null) {
      this.parameterizedRegistries.push(emission.registry);
    }
    this.openSeams.push(...emission.openSeams);
  }

  recordRegistry(emission: {
    readonly records: readonly KernelStoreRecord[];
    readonly registry: RegistryValue;
    readonly openSeams: readonly OpenSeam[];
  }): void {
    this.records.push(...emission.records);
    this.registries.push(emission.registry);
    this.openSeams.push(...emission.openSeams);
  }

  recordResourceSlots(container: Container, emission: DiResourceSlotEmission): void {
    this.records.push(...emission.records);
    this.resourceSlots.push(...emission.slots);
    this.openSeams.push(...emission.openSeams);
    for (const slot of emission.slots) {
      container.registerResource(slot);
    }
  }

  recordFrameworkEffects(container: Container, effects: DiFrameworkRegistrationEffectEmission): void {
    this.records.push(...effects.records);
    this.resolvers.push(...effects.resolvers);
    this.resolverSlots.push(...effects.resolverSlots);
    this.resourceSlots.push(...effects.resourceSlots);
    this.appTasks.push(...effects.appTasks);
    this.openSeams.push(...effects.openSeams);
    for (const slot of effects.resolverSlots) {
      container.registerResolver(slot);
    }
    for (const slot of effects.resourceSlots) {
      container.registerResource(slot);
    }
  }

  recordAppTask(task: AppTaskDefinition | null): void {
    if (task != null) {
      this.appTasks.push(task);
    }
  }

  toEmission(): DiRegistrationSpendingEmission {
    return {
      records: this.records,
      operation: this.operation.product,
      resolvers: this.resolvers,
      registries: this.registries,
      parameterizedRegistries: this.parameterizedRegistries,
      resolverSlots: this.resolverSlots,
      resourceSlots: this.resourceSlots,
      appTasks: this.appTasks,
      openSeams: this.openSeams,
    };
  }
}

class DiRegistrationSpendingCascadeFrame {
  private readonly records: KernelStoreRecord[] = [];
  private readonly operations: ContainerRegistrationOperation[] = [];
  private readonly resolvers: Resolver[] = [];
  private readonly registries: RegistryValue[] = [];
  private readonly parameterizedRegistries: ParameterizedRegistry[] = [];
  private readonly resolverSlots: ContainerResolverSlot[] = [];
  private readonly resourceSlots: ContainerResourceSlot[] = [];
  private readonly appTasks: AppTaskDefinition[] = [];
  private readonly openSeams: OpenSeam[] = [];

  constructor(direct: DiRegistrationSpendingEmission) {
    this.recordDirect(direct);
  }

  recordDirect(spent: DiRegistrationSpendingEmission): void {
    this.records.push(...spent.records);
    this.operations.push(spent.operation);
    this.resolvers.push(...spent.resolvers);
    this.registries.push(...spent.registries);
    this.parameterizedRegistries.push(...spent.parameterizedRegistries);
    this.resolverSlots.push(...spent.resolverSlots);
    this.resourceSlots.push(...spent.resourceSlots);
    this.appTasks.push(...spent.appTasks);
    this.openSeams.push(...spent.openSeams);
  }

  recordCascade(spent: DiRegistrationSpendingCascadeEmission): void {
    this.records.push(...spent.records);
    this.operations.push(...spent.operations);
    this.resolvers.push(...spent.resolvers);
    this.registries.push(...spent.registries);
    this.parameterizedRegistries.push(...spent.parameterizedRegistries);
    this.resolverSlots.push(...spent.resolverSlots);
    this.resourceSlots.push(...spent.resourceSlots);
    this.appTasks.push(...spent.appTasks);
    this.openSeams.push(...spent.openSeams);
  }

  toEmission(): DiRegistrationSpendingCascadeEmission {
    return {
      records: this.records,
      operations: this.operations,
      resolvers: this.resolvers,
      registries: this.registries,
      parameterizedRegistries: this.parameterizedRegistries,
      resolverSlots: this.resolverSlots,
      resourceSlots: this.resourceSlots,
      appTasks: this.appTasks,
      openSeams: this.openSeams,
    };
  }
}

class DiRegistrationSpendingCascade {
  private readonly spentAdmissionKeys = new Set<string>();

  constructor(private readonly services: DiRegistrationSpendingCascadeServices) {}

  admissionForProduct(productHandle: ProductHandle): RegistrationAdmissionProduct | null {
    return this.services.admissionsByProduct.get(productHandle) ?? null;
  }

  spend(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
  ): DiRegistrationSpendingCascadeEmission {
    const spentKey = `${container.productHandle}:${step.productHandle}:${admission.productHandle}`;
    if (this.spentAdmissionKeys.has(spentKey)) {
      return emptyRegistrationSpendingCascade();
    }
    this.spentAdmissionKeys.add(spentKey);

    const bodySteps = this.services.registryBodyIndex.stepsForAdmission(admission);
    const registryBodyInterpreted = this.services.registryBodyIndex.bodyInterpretedForAdmission(admission);
    const frame = new DiRegistrationSpendingCascadeFrame(
      this.services.spendDirect(container, step, admission, registryBodyInterpreted),
    );
    for (const bodyStep of bodySteps) {
      this.recordBodyStep(frame, container, bodyStep);
    }
    return frame.toEmission();
  }

  private recordBodyStep(
    frame: DiRegistrationSpendingCascadeFrame,
    container: Container,
    bodyStep: ConfigurationStep,
  ): void {
    for (const admissionHandle of bodyStep.registrationAdmissionProductHandles) {
      const admission = this.admissionForProduct(admissionHandle);
      if (admission != null) {
        frame.recordCascade(this.spend(container, bodyStep, admission));
      }
    }
  }
}

interface DiConfigurationSequenceIndex {
  readonly containerBySequenceProduct: ReadonlyMap<ProductHandle, Container>;
  readonly sequenceKindByProduct: ReadonlyMap<ProductHandle, ConfigurationSequenceKind>;
}

class DiWorldConstructionFrame {
  readonly records: KernelStoreRecord[] = [];
  readonly registrationOperations: ContainerRegistrationOperation[] = [];
  readonly resolvers: Resolver[] = [];
  readonly registries: RegistryValue[] = [];
  readonly parameterizedRegistries: ParameterizedRegistry[] = [];
  readonly resolverSlots: ContainerResolverSlot[] = [];
  readonly selfResolverSlots: ContainerSelfResolverSlot[] = [];
  readonly resourceSlots: ContainerResourceSlot[] = [];
  readonly appTasks: AppTaskDefinition[] = [];
  readonly openSeams: OpenSeam[] = [];

  recordSelfResolver(container: Container, selfResolver: DiProductEmission<ContainerSelfResolverSlot>): void {
    this.records.push(...selfResolver.records);
    this.selfResolverSlots.push(selfResolver.product);
    container.registerSelfResolver(selfResolver.product);
  }

  recordOpenSeam(
    seam: {
      readonly records: readonly KernelStoreRecord[];
      readonly seam: OpenSeam;
    },
  ): void {
    this.records.push(...seam.records);
    this.openSeams.push(seam.seam);
  }

  recordSpending(spent: {
    readonly records: readonly KernelStoreRecord[];
    readonly operations: readonly ContainerRegistrationOperation[];
    readonly resolvers: readonly Resolver[];
    readonly registries: readonly RegistryValue[];
    readonly parameterizedRegistries: readonly ParameterizedRegistry[];
    readonly resolverSlots: readonly ContainerResolverSlot[];
    readonly resourceSlots: readonly ContainerResourceSlot[];
    readonly appTasks: readonly AppTaskDefinition[];
    readonly openSeams: readonly OpenSeam[];
  }): void {
    this.records.push(...spent.records);
    this.registrationOperations.push(...spent.operations);
    this.resolvers.push(...spent.resolvers);
    this.registries.push(...spent.registries);
    this.parameterizedRegistries.push(...spent.parameterizedRegistries);
    this.resolverSlots.push(...spent.resolverSlots);
    this.resourceSlots.push(...spent.resourceSlots);
    this.appTasks.push(...spent.appTasks);
    this.openSeams.push(...spent.openSeams);
  }

  toEmission(containers: readonly Container[]): DiWorldConstructionEmission {
    return new DiWorldConstructionEmission(
      containers,
      this.registrationOperations,
      this.resolvers,
      this.registries,
      this.parameterizedRegistries,
      this.resolverSlots,
      this.selfResolverSlots,
      this.resourceSlots,
      this.appTasks,
      this.openSeams,
      this.records,
    );
  }
}

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

    const frame = new DiWorldConstructionFrame();
    const containersByProduct = this.installSelfResolvers(configuration, frame);
    const aureliaContainerByProduct = this.aureliaContainerIndex(configuration, containersByProduct);
    const sequenceIndex = this.sequenceContainerIndex(configuration, aureliaContainerByProduct);
    const admissionsByProduct = registrationAdmissionIndex(configuration);
    const appTasksByProduct = appTaskIndex(configuration);
    const registrationCascade = this.registrationSpendingCascade(
      configuration,
      configuredResources,
      resourceDefinitions,
      admissionsByProduct,
      appTasksByProduct,
    );

    this.spendConfigurationSteps(
      frame,
      configuration,
      sequenceIndex,
      registrationCascade,
    );

    if (frame.records.length > 0) {
      this.store.commit(new KernelStoreBatch(frame.records, 'di-world-construction'));
    }

    return frame.toEmission(configuration.containers);
  }

  private registrationSpendingCascade(
    configuration: ConfigurationKernelEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
  ): DiRegistrationSpendingCascade {
    return new DiRegistrationSpendingCascade({
      admissionsByProduct,
      registryBodyIndex: buildRegistryBodyStepIndex(this.store, configuration),
      spendDirect: (container, step, admission, registryBodyInterpreted) =>
        this.recordsForRegistrationSpending(
          container,
          step,
          admission,
          configuredResources,
          resourceDefinitions,
          appTasksByProduct,
          registryBodyInterpreted,
        ),
    });
  }

  private installSelfResolvers(
    configuration: ConfigurationKernelEmission,
    frame: DiWorldConstructionFrame,
  ): ReadonlyMap<ProductHandle, Container> {
    const containersByProduct = new Map<ProductHandle, Container>();
    for (const container of configuration.containers) {
      containersByProduct.set(container.productHandle, container);
      frame.recordSelfResolver(container, this.recordsForContainerSelfResolver(container));
    }
    return containersByProduct;
  }

  private aureliaContainerIndex(
    configuration: ConfigurationKernelEmission,
    containersByProduct: ReadonlyMap<ProductHandle, Container>,
  ): ReadonlyMap<ProductHandle, Container> {
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
    return aureliaContainerByProduct;
  }

  private sequenceContainerIndex(
    configuration: ConfigurationKernelEmission,
    aureliaContainerByProduct: ReadonlyMap<ProductHandle, Container>,
  ): DiConfigurationSequenceIndex {
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
    return { containerBySequenceProduct, sequenceKindByProduct };
  }

  private spendConfigurationSteps(
    frame: DiWorldConstructionFrame,
    configuration: ConfigurationKernelEmission,
    sequenceIndex: DiConfigurationSequenceIndex,
    registrationCascade: DiRegistrationSpendingCascade,
  ): void {
    for (const step of configuration.steps) {
      if (step.registrationAdmissionProductHandles.length === 0) {
        continue;
      }

      const container = this.containerForStep(step, sequenceIndex.containerBySequenceProduct);
      if (container == null) {
        if (!this.stepBelongsToAppSequence(step, sequenceIndex.sequenceKindByProduct)) {
          continue;
        }
        frame.recordOpenSeam(this.recordsForOpenSeam(
          `di-open-container:${step.productHandle}`,
          KernelVocabulary.Di.OpenRegistrationSpending.key,
          'Configuration step admitted registrations, but DI world construction could not identify the receiving container.',
          step.sourceAddressHandle,
        ));
        continue;
      }

      for (const admissionProductHandle of step.registrationAdmissionProductHandles) {
        const admission = registrationCascade.admissionForProduct(admissionProductHandle);
        if (admission == null) {
          frame.recordOpenSeam(this.recordsForOpenSeam(
            `di-open-admission:${step.productHandle}:${admissionProductHandle}`,
            KernelVocabulary.Di.OpenRegistrationSpending.key,
            'Configuration step referenced a registration admission product that was not present in the configuration emission.',
            step.sourceAddressHandle,
          ));
          continue;
        }

        frame.recordSpending(registrationCascade.spend(container, step, admission));
      }
    }
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

  private recordsForRegistrationSpending(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    registryBodyInterpreted = false,
  ): DiRegistrationSpendingEmission {
    const local = `di-registration:${container.productHandle}:${step.productHandle}:${admission.productHandle}`;
    const source = this.recordsForSource(
      `${local}:source`,
      'Configuration-owned registration admission spent into DI world construction.',
      step.sourceAddressHandle ?? admission.sourceAddressHandle,
    );
    const operation = this.operationForAdmission(container, admission, local, source.provenanceHandle);
    container.register(operation.product);
    const frame = new DiRegistrationSpendingFrame(source, operation);

    this.spendRegistrationAdmission(
      frame,
      container,
      admission,
      configuredResources,
      resourceDefinitions,
      appTasksByProduct,
      local,
      source.provenanceHandle,
      registryBodyInterpreted,
    );
    frame.records.push(...this.recordsForOperationEnvelope(
      local,
      operation,
      frame.operationMaterializationClaimHandles,
      frame.openSeams.map((seam) => seam.handle),
      source.provenanceHandle,
    ));

    return frame.toEmission();
  }

  private spendRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    local: string,
    provenanceHandle: ProvenanceHandle,
    registryBodyInterpreted: boolean,
  ): void {
    if (admission instanceof OpenRegistrationAdmission) {
      this.spendOpenRegistrationAdmission(frame, admission, local);
      return;
    }
    if (admission instanceof ResolverRegistrationAdmission) {
      this.spendResolverRegistrationAdmission(frame, container, admission, local, provenanceHandle);
      return;
    }
    if (admission instanceof ParameterizedRegistryAdmission) {
      this.spendParameterizedRegistryAdmission(frame, container, admission, local, provenanceHandle);
      return;
    }
    if (admission instanceof RegistryRegistrationAdmission) {
      this.spendRegistryRegistrationAdmission(
        frame,
        container,
        admission,
        configuredResources,
        appTasksByProduct,
        local,
        provenanceHandle,
        registryBodyInterpreted,
      );
      return;
    }
    if (admission instanceof ResourceRegistrationAdmission) {
      this.spendResourceRegistrationAdmission(
        frame,
        container,
        admission,
        resourceDefinitions,
        local,
        provenanceHandle,
      );
      return;
    }
    if (admission instanceof FrameworkRegistrationAdmission) {
      this.spendFrameworkRegistrationAdmission(
        frame,
        container,
        admission,
        configuredResources,
        local,
        provenanceHandle,
      );
    }
  }

  private spendOpenRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    admission: OpenRegistrationAdmission,
    local: string,
  ): void {
    frame.recordOpenSeam(this.recordsForOpenSeam(
      `${local}:open-admission`,
      KernelVocabulary.Di.OpenRegistrationSpending.key,
      summaryForOpenRegistrationAdmission(admission),
      admission.sourceAddressHandle,
    ));
  }

  private spendResolverRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: ResolverRegistrationAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    const emission = this.recordsForResolverAdmission(container, admission, local, provenanceHandle);
    frame.recordResolverEmission(container, emission);
    frame.recordProductClaims(this.recordsForOperationProductClaims(
      `${local}:resolver-products`,
      frame.operation.productHandle,
      [
        ...emission.resolvers.map((resolver) => resolver.productHandle),
        ...emission.resolverSlots.map((slot) => slot.productHandle),
      ],
      provenanceHandle,
    ));
  }

  private spendParameterizedRegistryAdmission(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: ParameterizedRegistryAdmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    const emission = this.recordsForParameterizedRegistry(container, admission, local, provenanceHandle);
    frame.recordParameterizedRegistry(emission);
    if (emission.registry != null) {
      frame.recordProductClaims(this.recordsForOperationProductClaims(
        `${local}:parameterized-registry-products`,
        frame.operation.productHandle,
        [emission.registry.productHandle],
        provenanceHandle,
      ));
    }
  }

  private spendRegistryRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: RegistryRegistrationAdmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    local: string,
    provenanceHandle: ProvenanceHandle,
    registryBodyInterpreted: boolean,
  ): void {
    const emission = this.recordsForRegistry(
      container,
      admission,
      local,
      provenanceHandle,
      registryBodyInterpreted || frameworkRegistrationEffectsCloseRegistryBody(admission),
    );
    frame.recordRegistry(emission);
    const registeredAppTask = appTaskForRegistryAdmission(admission, appTasksByProduct);
    frame.recordAppTask(registeredAppTask);

    const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
      container,
      admission,
      configuredResources,
      `${local}:registry-framework-effects`,
      provenanceHandle,
    );
    frame.recordFrameworkEffects(container, frameworkEffects);
    frame.recordProductClaims(this.recordsForOperationProductClaims(
      `${local}:registry-products`,
      frame.operation.productHandle,
      [
        emission.registry.productHandle,
        ...(registeredAppTask == null ? [] : [registeredAppTask.productHandle]),
        ...frameworkEffects.resolvers.map((resolver) => resolver.productHandle),
        ...frameworkEffects.resolverSlots.map((slot) => slot.productHandle),
        ...frameworkEffects.resourceSlots.map((slot) => slot.productHandle),
      ],
      provenanceHandle,
    ));
  }

  private spendResourceRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: ResourceRegistrationAdmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    const emission = this.recordsForResourceAdmission(
      container,
      admission,
      resourceDefinitions,
      `${local}:resource`,
      provenanceHandle,
    );
    frame.recordResourceSlots(container, emission);
    frame.recordProductClaims(this.recordsForOperationProductClaims(
      `${local}:resource-products`,
      frame.operation.productHandle,
      emission.slots.map((slot) => slot.productHandle),
      provenanceHandle,
    ));
  }

  private spendFrameworkRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: FrameworkRegistrationAdmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
      container,
      admission,
      configuredResources,
      `${local}:framework-effects`,
      provenanceHandle,
    );
    frame.recordFrameworkEffects(container, frameworkEffects);
    frame.recordProductClaims(this.recordsForOperationProductClaims(
      `${local}:framework-effect-products`,
      frame.operation.productHandle,
      [
        ...frameworkEffects.resolvers.map((resolver) => resolver.productHandle),
        ...frameworkEffects.resolverSlots.map((slot) => slot.productHandle),
        ...frameworkEffects.resourceSlots.map((slot) => slot.productHandle),
      ],
      provenanceHandle,
    ));

    const openSummary = summaryForFrameworkRegistrationOpen(admission.frameworkKind);
    if (openSummary != null) {
      frame.recordOpenSeam(this.recordsForOpenSeam(
        `${local}:framework-registration-open`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        openSummary,
        admission.sourceAddressHandle,
      ));
    }
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

    const publication = this.resolverPublicationForAdmission(admission);
    if (publication == null) {
      const seam = this.recordsForOpenSeam(
        `${local}:open-publication`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resolver admission had a closed strategy but did not expose a closed DI key publication.',
        admission.sourceAddressHandle,
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, resolvers: [], resolverSlots: [], openSeams };
    }

    const emission = this.recordsForResolverPublication(container, publication, local, provenanceHandle);
    records.push(...emission.records);
    return {
      records,
      resolvers: [emission.resolver],
      resolverSlots: [emission.resolverSlot],
      openSeams,
    };
  }

  private resolverPublicationForAdmission(
    admission: ResolverRegistrationAdmission,
  ): DiResolverPublication | null {
    if (admission.targetKey?.identityHandle == null) {
      return null;
    }
    return {
      ownerIdentityHandle: admission.identityHandle,
      key: admission.targetKey,
      keyIdentityHandle: admission.targetKey.identityHandle,
      strategy: admission.strategy,
      state: admission.registeredValue,
      sourceAddressHandle: admission.sourceAddressHandle,
    };
  }

  private recordsForResolverPublication(
    container: Container,
    publication: DiResolverPublication,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResolverPublicationEmission {
    const handles = this.resolverPublicationHandles(local);
    const resolver = this.resolverForPublication(publication, handles, provenanceHandle);
    const resolverSlot = this.resolverSlotForPublication(container, publication, resolver, handles, provenanceHandle);
    return {
      records: this.recordsForResolverPublicationProducts(
        container,
        publication,
        resolver,
        resolverSlot,
        handles,
        local,
        provenanceHandle,
      ),
      resolver,
      resolverSlot,
    };
  }

  private resolverPublicationHandles(local: string): DiResolverPublicationHandles {
    return {
      resolverProductHandle: this.store.handles.product(`${local}:resolver`),
      resolverIdentityHandle: this.store.handles.identity(`${local}:resolver`),
      resolverProvidesKeyClaimHandle: this.store.handles.claim(`${local}:resolver-provides-key`),
      resolverSlotProductHandle: this.store.handles.product(`${local}:resolver-slot`),
      resolverSlotIdentityHandle: this.store.handles.identity(`${local}:resolver-slot`),
      resolverSlotProvidesKeyClaimHandle: this.store.handles.claim(`${local}:resolver-slot-provides-key`),
    };
  }

  private resolverForPublication(
    publication: DiResolverPublication,
    handles: DiResolverPublicationHandles,
    provenanceHandle: ProvenanceHandle,
  ): Resolver {
    return new Resolver(
      handles.resolverProductHandle,
      handles.resolverIdentityHandle,
      publication.key,
      publication.strategy,
      publication.state,
      publication.sourceAddressHandle,
      compactFieldProvenance<ResolverField>([
        new FieldProvenance('_key', provenanceHandle),
        new FieldProvenance('_strategy', provenanceHandle),
        publication.state == null ? null : new FieldProvenance('_state', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private resolverSlotForPublication(
    container: Container,
    publication: DiResolverPublication,
    resolver: Resolver,
    handles: DiResolverPublicationHandles,
    provenanceHandle: ProvenanceHandle,
  ): ContainerResolverSlot {
    return new ContainerResolverSlot(
      handles.resolverSlotProductHandle,
      container.toReference(),
      publication.keyIdentityHandle,
      resolver.productHandle,
      publication.strategy,
      false,
      publication.sourceAddressHandle,
      compactFieldProvenance<ContainerSlotField>([
        new FieldProvenance('container', provenanceHandle),
        new FieldProvenance('key', provenanceHandle),
        new FieldProvenance('resolver', provenanceHandle),
        new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private recordsForResolverPublicationProducts(
    container: Container,
    publication: DiResolverPublication,
    resolver: Resolver,
    resolverSlot: ContainerResolverSlot,
    handles: DiResolverPublicationHandles,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
      ...this.recordsForPublishedResolver(container, publication, resolver, handles, local, provenanceHandle),
      ...this.recordsForPublishedResolverSlot(container, publication, resolverSlot, handles, local, provenanceHandle),
    ];
  }

  private recordsForPublishedResolver(
    container: Container,
    publication: DiResolverPublication,
    resolver: Resolver,
    handles: DiResolverPublicationHandles,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return recordsForPublishedDiProduct(this.store, {
      productKindKey: KernelVocabulary.Di.Resolver.key,
      productHandle: resolver.productHandle,
      identityHandle: resolver.identityHandle,
      parentIdentityHandle: container.identityHandle,
      ownerIdentityHandle: publication.ownerIdentityHandle,
      sourceAddressHandle: publication.sourceAddressHandle,
      providesKeyClaimHandle: handles.resolverProvidesKeyClaimHandle,
      keyIdentityHandle: publication.keyIdentityHandle,
      provenanceHandle,
      materializationLocal: `${local}:resolver`,
    });
  }

  private recordsForPublishedResolverSlot(
    container: Container,
    publication: DiResolverPublication,
    resolverSlot: ContainerResolverSlot,
    handles: DiResolverPublicationHandles,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return recordsForPublishedDiProduct(this.store, {
      productKindKey: KernelVocabulary.Di.ResolverSlot.key,
      productHandle: resolverSlot.productHandle,
      identityHandle: handles.resolverSlotIdentityHandle,
      parentIdentityHandle: container.identityHandle,
      ownerIdentityHandle: publication.ownerIdentityHandle,
      sourceAddressHandle: publication.sourceAddressHandle,
      providesKeyClaimHandle: handles.resolverSlotProvidesKeyClaimHandle,
      keyIdentityHandle: publication.keyIdentityHandle,
      provenanceHandle,
      materializationLocal: `${local}:resolver-slot`,
    });
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

    const frameworkEffects = frameworkRegistrationEffectsForKind(frameworkKind);
    const resourceEmission = this.recordsForConfiguredResourceSlots(
      container,
      admission,
      configuredResources,
      `${local}:resources`,
      provenanceHandle,
    );
    const resolverEmissions = frameworkEffects.resolvers
      .map((effect, index) =>
        this.recordsForFrameworkResolverEffect(
          container,
          admission,
          effect,
          `${local}:resolver:${index}`,
          provenanceHandle,
        )
      );
    const appTaskEmissions = frameworkEffects.appTasks
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

    const publication = this.frameworkResolverPublication(
      admission,
      effect,
      keyIdentityHandle,
    );
    const emission = this.recordsForResolverPublication(container, publication, local, provenanceHandle);
    records.push(...emission.records);
    return {
      records,
      resolver: emission.resolver,
      resolverSlot: emission.resolverSlot,
    };
  }

  private frameworkResolverPublication(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkResolverEffect,
    keyIdentityHandle: IdentityHandle,
  ): DiResolverPublication {
    return {
      ownerIdentityHandle: admission.identityHandle,
      key: new RegistrationKeyReference(
        keyIdentityHandle,
        admission.sourceAddressHandle,
        effect.keyName,
      ),
      keyIdentityHandle,
      strategy: effect.strategy,
      state: effect.valueKind == null
        ? null
        : new RegistrationValueReference(
          effect.valueKind,
          null,
          null,
          admission.sourceAddressHandle,
          effect.valueName,
        ),
      sourceAddressHandle: admission.sourceAddressHandle,
    };
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

    const task = this.frameworkAppTaskDefinition(admission, effect, local, keyIdentityHandle, provenanceHandle);
    records.push(...this.recordsForFrameworkAppTaskProduct(admission, effect, local, task, provenanceHandle));

    return { records, appTask: task };
  }

  private frameworkAppTaskDefinition(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkAppTaskEffect,
    local: string,
    keyIdentityHandle: IdentityHandle,
    provenanceHandle: ProvenanceHandle,
  ): AppTaskDefinition {
    return new AppTaskDefinition(
      this.store.handles.product(local),
      this.store.handles.identity(local),
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
  }

  private recordsForFrameworkAppTaskProduct(
    admission: RegistrationAdmissionProduct,
    effect: FrameworkAppTaskEffect,
    local: string,
    task: AppTaskDefinition,
    provenanceHandle: ProvenanceHandle,
  ): readonly KernelStoreRecord[] {
    return [
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
    ];
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

function registrationAdmissionIndex(
  configuration: ConfigurationKernelEmission,
): ReadonlyMap<ProductHandle, RegistrationAdmissionProduct> {
  return new Map(configuration.registrationAdmissions.map((admission) => [admission.productHandle, admission] as const));
}

function appTaskIndex(
  configuration: ConfigurationKernelEmission,
): ReadonlyMap<ProductHandle, AppTaskDefinition> {
  return new Map(configuration.appTasks.map((task) => [task.productHandle, task] as const));
}

function emptyRegistrationSpendingCascade(): DiRegistrationSpendingCascadeEmission {
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
