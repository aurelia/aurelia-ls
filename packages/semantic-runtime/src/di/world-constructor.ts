import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeamReasonKind,
  OpenSeam,
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
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import type { TypeSystemProject } from '../type-system/project.js';
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
  FrameworkDiEffectCoverageState,
  frameworkDiRegistrationEffectsForKind,
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
  DiFrameworkAppTaskPublicationMaterializer,
  DiFrameworkRegistrationEffectEmission,
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
  readonly completion: DiRegistrationCascadeCompletion;
}

const enum DiRegistrationCascadeCompletion {
  /** Registration effects completed without a framework-fatal recursive registry branch. */
  Completed = 'completed',
  /** A recursive registry branch would throw and abort the owning configuration sequence at runtime. */
  Fatal = 'fatal',
}

type DiRegistrationDirectSpender = (
  container: Container,
  step: ConfigurationStep,
  admission: RegistrationAdmissionProduct,
  registryBodyInterpreted: boolean,
  inheritedOpenSeams: readonly OpenSeam[],
) => DiRegistrationSpendingEmission;

interface DiRegistrationSpendingCascadeServices {
  readonly admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>;
  readonly openSeamsByAdmissionProduct: ReadonlyMap<ProductHandle, readonly OpenSeam[]>;
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

  retainOpenSeams(seams: readonly OpenSeam[]): void {
    const retained = new Set(this.openSeams.map((seam) => seam.handle));
    for (const seam of seams) {
      if (!retained.has(seam.handle)) {
        this.openSeams.push(seam);
        retained.add(seam.handle);
      }
    }
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
  private completion = DiRegistrationCascadeCompletion.Completed;

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
    if (spent.completion === DiRegistrationCascadeCompletion.Fatal) {
      this.completion = DiRegistrationCascadeCompletion.Fatal;
    }
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
      completion: this.completion,
    };
  }
}

class DiRegistrationSpendingCascade {
  private readonly activeAdmissionKeys = new Set<string>();

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
    if (this.activeAdmissionKeys.has(spentKey)) {
      return this.unableAutoRegisterCascade(spentKey, step, admission);
    }
    this.activeAdmissionKeys.add(spentKey);
    try {
      const bodySteps = this.services.registryBodyIndex.stepsForAdmission(admission);
      const registryBodyInterpreted = this.services.registryBodyIndex.bodyInterpretedForAdmission(admission);
      const inheritedOpenSeams = this.services.openSeamsByAdmissionProduct.get(admission.productHandle) ?? [];
      const frame = new DiRegistrationSpendingCascadeFrame(
        this.services.spendDirect(container, step, admission, registryBodyInterpreted, inheritedOpenSeams),
      );
      for (const bodyStep of bodySteps) {
        if (!this.recordBodyStep(frame, container, bodyStep)) {
          break;
        }
      }
      return frame.toEmission();
    } finally {
      this.activeAdmissionKeys.delete(spentKey);
    }
  }

  private recordBodyStep(
    frame: DiRegistrationSpendingCascadeFrame,
    container: Container,
    bodyStep: ConfigurationStep,
  ): boolean {
    for (const admissionHandle of bodyStep.registrationAdmissionProductHandles) {
      const admission = this.admissionForProduct(admissionHandle);
      if (admission != null) {
        const spent = this.spend(container, bodyStep, admission);
        frame.recordCascade(spent);
        if (spent.completion === DiRegistrationCascadeCompletion.Fatal) {
          return false;
        }
      }
    }
    return true;
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
      completion: DiRegistrationCascadeCompletion.Fatal,
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

  recordSelfResolver(selfResolver: ContainerSelfResolverSlot): void {
    this.selfResolverSlots.push(selfResolver);
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

  constructor(
    /** Hot analysis store used only for deterministic handle allocation. */
    readonly store: KernelStore,
    /** Caller-owned app-generation publication and candidate read view. */
    readonly publication: KernelPublicationContext,
  ) {
    this.keyIdentityEmitter = new DiKeyIdentityEmitter(publication);
    this.resolverPublication = new DiResolverPublicationMaterializer(store, publication, this.keyIdentityEmitter);
    this.resourceSlotPublication = new DiResourceSlotPublicationMaterializer(store, this.keyIdentityEmitter);
    this.registryPublication = new DiRegistryPublicationMaterializer(store);
    this.appTaskPublication = new DiFrameworkAppTaskPublicationMaterializer(store, publication, this.keyIdentityEmitter);
  }

  construct(
    configuration: ConfigurationKernelEmission,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    evaluation: StaticProjectEvaluationResult,
    typeSystem: TypeSystemProject,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
    projectKey: string | null = null,
  ): DiWorldConstructionEmission {
    this.keyIdentityEmitter.reset();

    const frame = new DiWorldConstructionFrame();
    const containersByProduct = this.installSelfResolvers(configuration, frame);
    const aureliaContainerByProduct = this.aureliaContainerIndex(configuration, containersByProduct);
    const admissionsByProduct = registrationAdmissionIndex(configuration);
    const appTasksByProduct = appTaskIndex(configuration);
    const registrationCascade = this.registrationSpendingCascade(
      configuration,
      evaluation,
      typeSystem,
      configuredResources,
      resourceDefinitions,
      projectKey,
      admissionsByProduct,
      appTasksByProduct,
    );

    this.spendConfigurationSteps(
      frame,
      configuration,
      containersByProduct,
      aureliaContainerByProduct,
      registrationCascade,
    );

    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(frame.records, 'di-world-construction'),
      [
        ...publishProductDetails(DiProductDetails.Issue, frame.issues),
        ...publishProductDetails(ResourceProductDetails.Issue, frame.resourceIssues),
      ],
    ));

    return frame.toEmission(configuration.containers);
  }

  private registrationSpendingCascade(
    configuration: ConfigurationKernelEmission,
    evaluation: StaticProjectEvaluationResult,
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
  ): DiRegistrationSpendingCascade {
    return new DiRegistrationSpendingCascade({
      admissionsByProduct,
      openSeamsByAdmissionProduct: registrationAdmissionOpenSeamIndex(configuration),
      registryBodyIndex: buildRegistryBodyStepIndex(this.publication, configuration, evaluation),
      issuePublisher: new DiIssuePublisher(this.store),
      spendDirect: (container, step, admission, registryBodyInterpreted, inheritedOpenSeams) =>
        this.recordsForRegistrationSpending(
          container,
          step,
          admission,
          typeSystem,
          configuredResources,
          resourceDefinitions,
          projectKey,
          appTasksByProduct,
          registryBodyInterpreted,
          inheritedOpenSeams,
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
      const selfResolvers = container.readResolverSlots().filter((slot): slot is ContainerSelfResolverSlot =>
        slot instanceof ContainerSelfResolverSlot
      );
      if (selfResolvers.length !== 1) {
        throw new Error('Every materialized DI container must own exactly one constructor self resolver.');
      }
      frame.recordSelfResolver(selfResolvers[0]!);
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

  private spendConfigurationSteps(
    frame: DiWorldConstructionFrame,
    configuration: ConfigurationKernelEmission,
    containersByProduct: ReadonlyMap<ProductHandle, Container>,
    aureliaContainerByProduct: ReadonlyMap<ProductHandle, Container>,
    registrationCascade: DiRegistrationSpendingCascade,
  ): void {
    const failedSequenceProducts = new Set<ProductHandle>();
    for (const step of configuration.steps) {
      const sequenceProductHandle = step.sequence?.productHandle ?? null;
      if (sequenceProductHandle != null && failedSequenceProducts.has(sequenceProductHandle)) {
        continue;
      }
      if (step.registrationAdmissionProductHandles.length === 0) {
        continue;
      }

      const container = this.containerForStep(configuration, step, containersByProduct, aureliaContainerByProduct);
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

        const spent = registrationCascade.spend(container, step, admission);
        frame.recordSpending(spent);
        if (spent.completion === DiRegistrationCascadeCompletion.Fatal) {
          if (sequenceProductHandle != null) {
            failedSequenceProducts.add(sequenceProductHandle);
          }
          break;
        }
      }
    }
  }

  private containerForStep(
    configuration: ConfigurationKernelEmission,
    step: ConfigurationStep,
    containersByProduct: ReadonlyMap<ProductHandle, Container>,
    aureliaContainerByProduct: ReadonlyMap<ProductHandle, Container>,
  ): Container | null {
    if (step.receiverProductHandle != null) {
      const direct = containersByProduct.get(step.receiverProductHandle)
        ?? aureliaContainerByProduct.get(step.receiverProductHandle)
        ?? null;
      if (direct != null) {
        return direct;
      }
    }
    return configuration.evaluationBindings.containerForStep(step.productHandle);
  }

  private recordsForRegistrationSpending(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    registryBodyInterpreted: boolean,
    inheritedOpenSeams: readonly OpenSeam[],
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
    frame.retainOpenSeams(inheritedOpenSeams);

    this.spendRegistrationAdmission(
      frame,
      container,
      admission,
      typeSystem,
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
    typeSystem: TypeSystemProject,
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
        typeSystem,
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
        typeSystem,
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
    if (frame.openSeams.length > 0) {
      return;
    }
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
    typeSystem: TypeSystemProject,
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
      registryBodyInterpreted || frameworkDiEffectsCloseRegistryBody(admission),
    );
    frame.recordRegistry(emission);
    const registeredAppTask = appTaskForRegistryAdmission(admission, appTasksByProduct);
    frame.recordAppTask(registeredAppTask);

    const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
      container,
      admission,
      typeSystem,
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
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
      container,
      admission,
      typeSystem,
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

    const openSummary = frameworkDiRegistrationEffectsForKind(admission.frameworkKind).openSummary;
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

    // AttributePattern.register mutates the app-global IAttributeParser; it has no runtime resource key for DI to spend.
    if (definition.type === ResourceDefinitionKind.AttributePattern) {
      return new DiResourceSlotEmission([], [], [], []);
    }

    const names = resourceLookupNames(definition, admission.resourceLookupNameOverride);
    names.forEach((name, index) => {
      const slot = this.resourceSlotPublication.recordsForResourceDefinitionSlot(
        container,
        definition,
        name,
        admission.sourceAddressHandle,
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
          admission.sourceAddressHandle,
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
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiFrameworkRegistrationEffectEmission {
    const frameworkKind = frameworkRegistrationKindForAdmission(admission);
    if (frameworkKind == null) {
      return new DiFrameworkRegistrationEffectEmission([], [], [], [], [], []);
    }

    const frameworkEffects = frameworkDiRegistrationEffectsForKind(frameworkKind);
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
          typeSystem,
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
          typeSystem,
          `${local}:factory:${index}`,
          provenanceHandle,
        )
      );
    const appTaskEmissions = frameworkEffects.appTasks
      .map((effect, index) =>
        this.appTaskPublication.recordsForFrameworkAppTaskEffect(
          admission,
          effect,
          typeSystem,
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
    case RegistrationStrategy.RecursiveCarrier:
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

function frameworkDiEffectsCloseRegistryBody(admission: RegistrationAdmissionProduct): boolean {
  if (
    admission instanceof RegistryRegistrationAdmission
    && admission.registryValue?.registryBody?.state === RegistryBodyInterpretationState.Interpreted
  ) {
    return true;
  }
  const frameworkKind = frameworkRegistrationKindForAdmission(admission);
  return frameworkKind != null
    && frameworkDiRegistrationEffectsForKind(frameworkKind).coverageState === FrameworkDiEffectCoverageState.Closed;
}

function registrationAdmissionIndex(
  configuration: ConfigurationKernelEmission,
): ReadonlyMap<ProductHandle, RegistrationAdmissionProduct> {
  return new Map(configuration.registrationAdmissions.map((admission) => [admission.productHandle, admission] as const));
}

function registrationAdmissionOpenSeamIndex(
  configuration: ConfigurationKernelEmission,
): ReadonlyMap<ProductHandle, readonly OpenSeam[]> {
  const admissionProducts = new Set(configuration.registrationAdmissions.map((admission) => admission.productHandle));
  const seamsByHandle = new Map(configuration.records.flatMap((record) =>
    record instanceof OpenSeam ? [[record.handle, record] as const] : []
  ));
  const result = new Map<ProductHandle, OpenSeam[]>();
  for (const record of configuration.records) {
    if (!(record instanceof MaterializationRecord) || record.openSeamHandles.length === 0) {
      continue;
    }
    for (const productHandle of record.productHandles) {
      if (!admissionProducts.has(productHandle)) {
        continue;
      }
      const seams = record.openSeamHandles.flatMap((handle) => {
        const seam = seamsByHandle.get(handle);
        return seam == null ? [] : [seam];
      });
      if (seams.length > 0) {
        result.set(productHandle, seams);
      }
    }
  }
  return result;
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
    completion: DiRegistrationCascadeCompletion.Completed,
  };
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
