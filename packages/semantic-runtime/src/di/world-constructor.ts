import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeamReasonKind,
  type OpenSeam,
} from '../kernel/open-seam.js';
import type {
  ClaimHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  DiProductIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  AppTaskDefinition,
} from '../configuration/app-task.js';
import {
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
  ResourceDefinitionKind,
} from '../resources/resource-kind.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { ResourceIssue } from '../resources/resource-issue.js';
import { ResourceProductDetails } from '../resources/product-details.js';
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
  RegistryBodyInterpretationState,
} from '../registration/registration-reference.js';
import {
  frameworkRegistrationEffectsForKind,
} from './framework-registration-effects.js';
import type { Container } from './container.js';
import { ContainerRegistrationOperation } from './container-registration.js';
import {
  ContainerFactorySlot,
  ContainerResourceSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from './container-slot.js';
import type { DiIssue } from './di-issue.js';
import {
  DiIssuePublisher,
} from './di-issue-publication.js';
import { DiKeyIdentityEmitter } from './di-key-identity-emitter.js';
import { DiProductDetails } from './product-details.js';
import { Resolver } from './resolver.js';
import {
  ParameterizedRegistry,
  RegistryValue,
} from './registry.js';
import { DiWorldConstructionEmission } from './world-construction.js';
import {
  DiClaimEmission,
  DiContainerSelfResolverPublicationMaterializer,
  DiFrameworkAppTaskPublicationMaterializer,
  DiFrameworkRegistrationEffectEmission,
  DiProductEmission,
  DiRegistrationOperationEmission,
  DiRegistrationOperationHandles,
  DiRegistryPublicationMaterializer,
  DiResourceSlotEmission,
  DiResourceSlotPublicationMaterializer,
  DiResolverPublicationMaterializer,
  DiSourceSet,
  recordsForDiOpenSeam,
  recordsForDiSource,
} from './world-publication.js';

interface DiRegistrationSpendingEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly operation: ContainerRegistrationOperation;
  readonly resolvers: readonly Resolver[];
  readonly registries: readonly RegistryValue[];
  readonly parameterizedRegistries: readonly ParameterizedRegistry[];
  readonly resolverSlots: readonly ContainerResolverSlot[];
  readonly factorySlots: readonly ContainerFactorySlot[];
  readonly resourceSlots: readonly ContainerResourceSlot[];
  readonly appTasks: readonly AppTaskDefinition[];
  readonly openSeams: readonly OpenSeam[];
  readonly issues: readonly DiIssue[];
  readonly resourceIssues: readonly ResourceIssue[];
}

interface DiRegistrationSpendingCascadeEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly operations: readonly ContainerRegistrationOperation[];
  readonly resolvers: readonly Resolver[];
  readonly registries: readonly RegistryValue[];
  readonly parameterizedRegistries: readonly ParameterizedRegistry[];
  readonly resolverSlots: readonly ContainerResolverSlot[];
  readonly factorySlots: readonly ContainerFactorySlot[];
  readonly resourceSlots: readonly ContainerResourceSlot[];
  readonly appTasks: readonly AppTaskDefinition[];
  readonly openSeams: readonly OpenSeam[];
  readonly issues: readonly DiIssue[];
  readonly resourceIssues: readonly ResourceIssue[];
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
  readonly issuePublisher: DiIssuePublisher;
  readonly spendDirect: DiRegistrationDirectSpender;
}

class DiRegistrationSpendingFrame {
  readonly records: KernelStoreRecord[];
  readonly resolvers: Resolver[] = [];
  readonly registries: RegistryValue[] = [];
  readonly parameterizedRegistries: ParameterizedRegistry[] = [];
  readonly resolverSlots: ContainerResolverSlot[] = [];
  readonly factorySlots: ContainerFactorySlot[] = [];
  readonly resourceSlots: ContainerResourceSlot[] = [];
  readonly appTasks: AppTaskDefinition[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly issues: DiIssue[] = [];
  readonly resourceIssues: ResourceIssue[] = [];
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
    readonly factorySlots?: readonly ContainerFactorySlot[];
    readonly openSeams: readonly OpenSeam[];
  }): void {
    this.records.push(...emission.records);
    this.resolvers.push(...emission.resolvers);
    this.resolverSlots.push(...emission.resolverSlots);
    this.factorySlots.push(...(emission.factorySlots ?? []));
    this.openSeams.push(...emission.openSeams);
    for (const slot of emission.resolverSlots) {
      container.registerResolver(slot);
    }
    for (const slot of emission.factorySlots ?? []) {
      container.registerFactory(slot);
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
    this.issues.push(...emission.issues);
    this.resourceIssues.push(...emission.resourceIssues);
    for (const slot of emission.slots) {
      container.registerResource(slot);
    }
  }

  recordFrameworkEffects(container: Container, effects: DiFrameworkRegistrationEffectEmission): void {
    this.records.push(...effects.records);
    this.resolvers.push(...effects.resolvers);
    this.resolverSlots.push(...effects.resolverSlots);
    this.factorySlots.push(...effects.factorySlots);
    this.resourceSlots.push(...effects.resourceSlots);
    this.appTasks.push(...effects.appTasks);
    this.openSeams.push(...effects.openSeams);
    this.issues.push(...effects.issues);
    this.resourceIssues.push(...effects.resourceIssues);
    for (const slot of effects.resolverSlots) {
      container.registerResolver(slot);
    }
    for (const slot of effects.factorySlots) {
      container.registerFactory(slot);
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
      factorySlots: this.factorySlots,
      resourceSlots: this.resourceSlots,
      appTasks: this.appTasks,
      openSeams: this.openSeams,
      issues: this.issues,
      resourceIssues: this.resourceIssues,
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
  private readonly factorySlots: ContainerFactorySlot[] = [];
  private readonly resourceSlots: ContainerResourceSlot[] = [];
  private readonly appTasks: AppTaskDefinition[] = [];
  private readonly openSeams: OpenSeam[] = [];
  private readonly issues: DiIssue[] = [];
  private readonly resourceIssues: ResourceIssue[] = [];

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
    this.factorySlots.push(...spent.factorySlots);
    this.resourceSlots.push(...spent.resourceSlots);
    this.appTasks.push(...spent.appTasks);
    this.openSeams.push(...spent.openSeams);
    this.issues.push(...spent.issues);
    this.resourceIssues.push(...spent.resourceIssues);
  }

  recordCascade(spent: DiRegistrationSpendingCascadeEmission): void {
    this.records.push(...spent.records);
    this.operations.push(...spent.operations);
    this.resolvers.push(...spent.resolvers);
    this.registries.push(...spent.registries);
    this.parameterizedRegistries.push(...spent.parameterizedRegistries);
    this.resolverSlots.push(...spent.resolverSlots);
    this.factorySlots.push(...spent.factorySlots);
    this.resourceSlots.push(...spent.resourceSlots);
    this.appTasks.push(...spent.appTasks);
    this.openSeams.push(...spent.openSeams);
    this.issues.push(...spent.issues);
    this.resourceIssues.push(...spent.resourceIssues);
  }

  toEmission(): DiRegistrationSpendingCascadeEmission {
    return {
      records: this.records,
      operations: this.operations,
      resolvers: this.resolvers,
      registries: this.registries,
      parameterizedRegistries: this.parameterizedRegistries,
      resolverSlots: this.resolverSlots,
      factorySlots: this.factorySlots,
      resourceSlots: this.resourceSlots,
      appTasks: this.appTasks,
      openSeams: this.openSeams,
      issues: this.issues,
      resourceIssues: this.resourceIssues,
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
      return this.unableAutoRegisterCascade(spentKey, step, admission);
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

  private unableAutoRegisterCascade(
    spentKey: string,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
  ): DiRegistrationSpendingCascadeEmission {
    const publication = this.services.issuePublisher.publishUnableAutoRegister(
      [
        'di-registration-cascade-issue',
        'unable-auto-register',
        localKeyPart(spentKey),
      ].join(':'),
      step.stepKind,
      admission.admissionKind,
      registrationAdmissionStrategyLabel(admission),
      admission.sourceAddressHandle,
    );
    return {
      records: publication.records,
      operations: [],
      resolvers: [],
      registries: [],
      parameterizedRegistries: [],
      resolverSlots: [],
      factorySlots: [],
      resourceSlots: [],
      appTasks: [],
      openSeams: [],
      issues: [publication.issue],
      resourceIssues: [],
    };
  }
}

function registrationAdmissionStrategyLabel(admission: RegistrationAdmissionProduct): string {
  if (admission instanceof RegistryRegistrationAdmission) {
    return RegistrationStrategy.Registry;
  }
  if (admission instanceof ParameterizedRegistryAdmission) {
    return RegistrationStrategy.Defer;
  }
  if (admission instanceof ResourceRegistrationAdmission) {
    return RegistrationStrategy.Resource;
  }
  if (admission instanceof FrameworkRegistrationAdmission) {
    return RegistrationStrategy.FrameworkGroup;
  }
  return admission.strategy;
}

interface DiConfigurationSequenceIndex {
  readonly containerBySequenceProduct: ReadonlyMap<ProductHandle, Container>;
}

class DiWorldConstructionFrame {
  readonly records: KernelStoreRecord[] = [];
  readonly registrationOperations: ContainerRegistrationOperation[] = [];
  readonly resolvers: Resolver[] = [];
  readonly registries: RegistryValue[] = [];
  readonly parameterizedRegistries: ParameterizedRegistry[] = [];
  readonly resolverSlots: ContainerResolverSlot[] = [];
  readonly factorySlots: ContainerFactorySlot[] = [];
  readonly selfResolverSlots: ContainerSelfResolverSlot[] = [];
  readonly resourceSlots: ContainerResourceSlot[] = [];
  readonly appTasks: AppTaskDefinition[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly issues: DiIssue[] = [];
  readonly resourceIssues: ResourceIssue[] = [];

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
    readonly factorySlots: readonly ContainerFactorySlot[];
    readonly resourceSlots: readonly ContainerResourceSlot[];
    readonly appTasks: readonly AppTaskDefinition[];
    readonly openSeams: readonly OpenSeam[];
    readonly issues: readonly DiIssue[];
    readonly resourceIssues: readonly ResourceIssue[];
  }): void {
    this.records.push(...spent.records);
    this.registrationOperations.push(...spent.operations);
    this.resolvers.push(...spent.resolvers);
    this.registries.push(...spent.registries);
    this.parameterizedRegistries.push(...spent.parameterizedRegistries);
    this.resolverSlots.push(...spent.resolverSlots);
    this.factorySlots.push(...spent.factorySlots);
    this.resourceSlots.push(...spent.resourceSlots);
    this.appTasks.push(...spent.appTasks);
    this.openSeams.push(...spent.openSeams);
    this.issues.push(...spent.issues);
    this.resourceIssues.push(...spent.resourceIssues);
  }

  toEmission(containers: readonly Container[]): DiWorldConstructionEmission {
    return new DiWorldConstructionEmission(
      containers,
      this.registrationOperations,
      this.resolvers,
      this.registries,
      this.parameterizedRegistries,
      this.resolverSlots,
      this.factorySlots,
      this.selfResolverSlots,
      this.resourceSlots,
      this.appTasks,
      this.openSeams,
      this.issues,
      this.resourceIssues,
      this.records,
    );
  }
}

/** Spends configuration-owned registration products into abstract DI container state. */
export class DiWorldConstructor {
  private readonly keyIdentityEmitter: DiKeyIdentityEmitter;
  private readonly resolverPublication: DiResolverPublicationMaterializer;
  private readonly resourceSlotPublication: DiResourceSlotPublicationMaterializer;
  private readonly registryPublication: DiRegistryPublicationMaterializer;
  private readonly appTaskPublication: DiFrameworkAppTaskPublicationMaterializer;
  private readonly selfResolverPublication: DiContainerSelfResolverPublicationMaterializer;

  constructor(
    /** Hot analysis store that receives DI world-construction records. */
    readonly store: KernelStore,
  ) {
    this.keyIdentityEmitter = new DiKeyIdentityEmitter(store);
    this.resolverPublication = new DiResolverPublicationMaterializer(store, this.keyIdentityEmitter);
    this.resourceSlotPublication = new DiResourceSlotPublicationMaterializer(store, this.keyIdentityEmitter);
    this.registryPublication = new DiRegistryPublicationMaterializer(store);
    this.appTaskPublication = new DiFrameworkAppTaskPublicationMaterializer(store, this.keyIdentityEmitter);
    this.selfResolverPublication = new DiContainerSelfResolverPublicationMaterializer(store, this.keyIdentityEmitter);
  }

  construct(
    configuration: ConfigurationKernelEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
    projectKey: string | null = null,
  ): DiWorldConstructionEmission {
    this.keyIdentityEmitter.reset();

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
      projectKey,
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
    for (const issue of frame.issues) {
      this.store.productDetails.add(DiProductDetails.Issue, issue.productHandle, issue);
    }
    for (const issue of frame.resourceIssues) {
      this.store.productDetails.add(ResourceProductDetails.Issue, issue.productHandle, issue);
    }

    return frame.toEmission(configuration.containers);
  }

  private registrationSpendingCascade(
    configuration: ConfigurationKernelEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
  ): DiRegistrationSpendingCascade {
    return new DiRegistrationSpendingCascade({
      admissionsByProduct,
      registryBodyIndex: buildRegistryBodyStepIndex(this.store, configuration),
      issuePublisher: new DiIssuePublisher(this.store),
      spendDirect: (container, step, admission, registryBodyInterpreted) =>
        this.recordsForRegistrationSpending(
          container,
          step,
          admission,
          configuredResources,
          resourceDefinitions,
          projectKey,
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
      frame.recordSelfResolver(container, this.selfResolverPublication.recordsForContainerSelfResolver(container));
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
    for (const sequence of configuration.sequences) {
      if (sequence.aurelia?.productHandle == null) {
        continue;
      }
      const container = aureliaContainerByProduct.get(sequence.aurelia.productHandle);
      if (container != null) {
        containerBySequenceProduct.set(sequence.productHandle, container);
      }
    }
    return { containerBySequenceProduct };
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
        frame.recordOpenSeam(recordsForDiOpenSeam(this.store,
          `di-open-container:${step.productHandle}`,
          KernelVocabulary.Di.OpenRegistrationSpending.key,
          'Configuration step admitted registrations, but DI world construction could not identify or model the receiving container.',
          step.sourceAddressHandle,
          [OpenSeamReasonKind.DiRegistrationContainerOpen],
        ));
        continue;
      }

      for (const admissionProductHandle of step.registrationAdmissionProductHandles) {
        const admission = registrationCascade.admissionForProduct(admissionProductHandle);
        if (admission == null) {
          frame.recordOpenSeam(recordsForDiOpenSeam(this.store,
            `di-open-admission:${step.productHandle}:${admissionProductHandle}`,
            KernelVocabulary.Di.OpenRegistrationSpending.key,
            'Configuration step referenced a registration admission product that was not present in the configuration emission.',
            step.sourceAddressHandle,
            [OpenSeamReasonKind.DiRegistrationAdmissionOpen],
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

  private recordsForRegistrationSpending(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    registryBodyInterpreted = false,
  ): DiRegistrationSpendingEmission {
    const local = `di-registration:${container.productHandle}:${step.productHandle}:${admission.productHandle}`;
    const source = recordsForDiSource(this.store,
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
      projectKey,
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
    projectKey: string | null,
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
        projectKey,
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
        projectKey,
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
        projectKey,
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
    frame.recordOpenSeam(recordsForDiOpenSeam(this.store,
      `${local}:open-admission`,
      KernelVocabulary.Di.OpenRegistrationSpending.key,
      summaryForOpenRegistrationAdmission(admission),
      admission.sourceAddressHandle,
      [OpenSeamReasonKind.DiRegistrationAdmissionOpen],
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
    projectKey: string | null,
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
      projectKey,
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
        ...frameworkEffects.factorySlots.map((slot) => slot.productHandle),
        ...frameworkEffects.resourceSlots.map((slot) => slot.productHandle),
        ...frameworkEffects.issues.map((issue) => issue.productHandle),
      ],
      provenanceHandle,
    ));
  }

  private spendResourceRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: ResourceRegistrationAdmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    const emission = this.recordsForResourceAdmission(
      container,
      admission,
      resourceDefinitions,
      projectKey,
      `${local}:resource`,
      provenanceHandle,
    );
    frame.recordResourceSlots(container, emission);
    frame.recordProductClaims(this.recordsForOperationProductClaims(
      `${local}:resource-products`,
      frame.operation.productHandle,
      [
        ...emission.slots.map((slot) => slot.productHandle),
        ...emission.issues.map((issue) => issue.productHandle),
      ],
      provenanceHandle,
    ));
  }

  private spendFrameworkRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: FrameworkRegistrationAdmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
      container,
      admission,
      configuredResources,
      projectKey,
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
        ...frameworkEffects.factorySlots.map((slot) => slot.productHandle),
        ...frameworkEffects.resourceSlots.map((slot) => slot.productHandle),
        ...frameworkEffects.issues.map((issue) => issue.productHandle),
      ],
      provenanceHandle,
    ));

    const openSummary = summaryForFrameworkRegistrationOpen(admission.frameworkKind);
    if (openSummary != null) {
      frame.recordOpenSeam(recordsForDiOpenSeam(this.store,
        `${local}:framework-registration-open`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        openSummary,
        admission.sourceAddressHandle,
        [OpenSeamReasonKind.DiRegistryBodyOpen],
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
    const operation = this.registrationOperationForAdmission(container, admission, handles);
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
  ): ContainerRegistrationOperation {
    const operation = new ContainerRegistrationOperation(
      handles.productHandle,
      handles.identityHandle,
      container.toReference(),
      admission.productHandle,
      admission.sourceAddressHandle,
      admission.sourceAddressHandle ?? container.sourceAddressHandle,
      [],
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
      const seam = recordsForDiOpenSeam(this.store,
        `${local}:open-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resolver admission could not produce a container slot because the admitted DI key stayed open.',
        admission.sourceAddressHandle,
        [OpenSeamReasonKind.DiRegistrationKeyOpen],
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, resolvers: [], resolverSlots: [], openSeams };
    }

    if (!isResolverRegistrationStrategy(admission.strategy)) {
      const seam = recordsForDiOpenSeam(this.store,
        `${local}:open-strategy`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        `DI world construction does not yet spend ${admission.strategy} admissions into concrete container effects.`,
        admission.sourceAddressHandle,
        [OpenSeamReasonKind.DiRegistrationStrategyOpen],
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, resolvers: [], resolverSlots: [], openSeams };
    }

    const publication = this.resolverPublication.resolverPublicationForAdmission(admission);
    if (publication == null) {
      const seam = recordsForDiOpenSeam(this.store,
        `${local}:open-publication`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resolver admission had a closed strategy but did not expose a closed DI key publication.',
        admission.sourceAddressHandle,
        [OpenSeamReasonKind.DiRegistrationPublicationOpen],
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
      return { records, resolvers: [], resolverSlots: [], openSeams };
    }

    const emission = this.resolverPublication.recordsForResolverPublication(container, publication, local, provenanceHandle);
    records.push(...emission.records);
    return {
      records,
      resolvers: [emission.resolver],
      resolverSlots: [emission.resolverSlot],
      openSeams,
    };
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
    return this.registryPublication.recordsForParameterizedRegistry(container, admission, local, provenanceHandle);
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
    return this.registryPublication.recordsForRegistry(container, admission, local, provenanceHandle, registryBodyInterpreted);
  }

  private recordsForResourceAdmission(
    container: Container,
    admission: ResourceRegistrationAdmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResourceSlotEmission {
    const records: KernelStoreRecord[] = [];
    const slots: ContainerResourceSlot[] = [];
    const claimHandles: ClaimHandle[] = [];
    const openSeams: OpenSeam[] = [];
    const issues: DiIssue[] = [];
    const resourceIssues: ResourceIssue[] = [];

    const definition = resourceDefinitions?.lookupByProduct(admission.registeredValue.productHandle) ?? null;
    if (definition == null) {
      const seam = recordsForDiOpenSeam(this.store,
        `${local}:definition-open`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resource registration admission did not resolve to a full resource definition during DI world construction.',
        admission.sourceAddressHandle,
        [OpenSeamReasonKind.DiResourceSlotOpen],
      );
      return new DiResourceSlotEmission(seam.records, [], [], [seam.seam]);
    }

    const names = resourceLookupNames(definition, admission.resourceLookupNameOverride);
    names.forEach((name, index) => {
      const slot = this.resourceSlotPublication.recordsForResourceDefinitionSlot(
        container,
        definition,
        name,
        `${local}:${index}`,
        provenanceHandle,
        projectKey,
      );
      if (slot == null) {
        return;
      }
      records.push(...slot.records);
      if (slot.slot != null) {
        slots.push(slot.slot);
      }
      claimHandles.push(...slot.claimHandles);
      issues.push(...slot.issues);
      resourceIssues.push(...slot.resourceIssues);
    });

    if (slots.length === 0 && issues.length === 0 && resourceIssues.length === 0) {
      const seam = recordsForDiOpenSeam(this.store,
        `${local}:no-resource-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        'Resource registration did not produce any runtime resource-key rows.',
        admission.sourceAddressHandle,
        [OpenSeamReasonKind.DiResourceSlotOpen],
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
    }

    return new DiResourceSlotEmission(records, slots, claimHandles, openSeams, issues, resourceIssues);
  }

  private recordsForConfiguredResourceSlots(
    container: Container,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
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
    const issues: DiIssue[] = [];
    const resourceIssues: ResourceIssue[] = [];
    resourceEmissions.forEach((emission, resourceIndex) => {
      const resource = emission.resource;
      const names = [resource.name, ...resource.aliases];
      names.forEach((name, nameIndex) => {
        const slot = this.resourceSlotPublication.recordsForBuiltInResourceSlot(
          container,
          resource,
          name,
          `${local}:${resourceIndex}:${nameIndex}`,
          provenanceHandle,
          projectKey,
        );
        if (slot == null) {
          return;
        }
        records.push(...slot.records);
        if (slot.slot != null) {
          slots.push(slot.slot);
        }
        claimHandles.push(...slot.claimHandles);
        issues.push(...slot.issues);
        resourceIssues.push(...slot.resourceIssues);
      });
    });

    return new DiResourceSlotEmission(records, slots, claimHandles, [], issues, resourceIssues);
  }

  private recordsForFrameworkRegistrationEffects(
    container: Container,
    admission: RegistrationAdmissionProduct,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiFrameworkRegistrationEffectEmission {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      return new DiFrameworkRegistrationEffectEmission([], [], [], [], [], []);
    }

    const frameworkEffects = frameworkRegistrationEffectsForKind(frameworkKind);
    const resourceEmission = this.recordsForConfiguredResourceSlots(
      container,
      admission,
      configuredResources,
      projectKey,
      `${local}:resources`,
      provenanceHandle,
    );
    const resolverEmissions = frameworkEffects.resolvers
      .map((effect, index) =>
        this.resolverPublication.recordsForFrameworkResolverEffect(
          container,
          admission,
          effect,
          `${local}:resolver:${index}`,
          provenanceHandle,
        )
      );
    const factoryEmissions = frameworkEffects.factories
      .map((effect, index) =>
        this.resolverPublication.recordsForFrameworkFactoryEffect(
          container,
          admission,
          effect,
          `${local}:factory:${index}`,
          provenanceHandle,
        )
      );
    const appTaskEmissions = frameworkEffects.appTasks
      .map((effect, index) =>
        this.appTaskPublication.recordsForFrameworkAppTaskEffect(
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
        ...factoryEmissions.flatMap((emission) => emission.records),
        ...appTaskEmissions.flatMap((emission) => emission.records),
      ],
      resolverEmissions.map((emission) => emission.resolver),
      resolverEmissions.map((emission) => emission.resolverSlot),
      factoryEmissions.map((emission) => emission.factorySlot),
      resourceEmission.slots,
      appTaskEmissions.map((emission) => emission.appTask),
      resourceEmission.openSeams,
      resourceEmission.issues,
      resourceEmission.resourceIssues,
    );
  }

}

function resourceLookupNames(
  definition: FullResourceDefinition,
  lookupNameOverride: string | null = null,
): readonly string[] {
  if (definition.type === ResourceDefinitionKind.AttributePattern) {
    return [];
  }
  return [lookupNameOverride ?? definition.name, ...definition.aliases.map((alias) => alias.name)];
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
  if (
    admission instanceof RegistryRegistrationAdmission
    && admission.registryValue?.registryBody?.state === RegistryBodyInterpretationState.Interpreted
  ) {
    return true;
  }
  switch (frameworkRegistrationKindForAdmission(admission)) {
    case FrameworkRegistrationKind.ValidationConfiguration:
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
    case FrameworkRegistrationKind.I18nConfiguration:
    case FrameworkRegistrationKind.RouterConfiguration:
    case FrameworkRegistrationKind.RouterDefaultComponents:
    case FrameworkRegistrationKind.RouterDefaultResources:
    case FrameworkRegistrationKind.StateDefaultConfiguration:
    case FrameworkRegistrationKind.DialogConfiguration:
    case FrameworkRegistrationKind.UiVirtualizationDefaultConfiguration:
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
    factorySlots: [],
    resourceSlots: [],
    appTasks: [],
    openSeams: [],
    issues: [],
    resourceIssues: [],
  };
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
    case FrameworkRegistrationKind.ValidationConfiguration:
      return null;
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
      return null;
    case FrameworkRegistrationKind.RouterConfiguration:
      return null;
    case FrameworkRegistrationKind.RouterDefaultComponents:
      return null;
    case FrameworkRegistrationKind.RouterDefaultResources:
      return null;
    case FrameworkRegistrationKind.UiVirtualizationDefaultConfiguration:
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
