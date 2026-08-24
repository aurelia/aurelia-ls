import { SemanticClaim } from '../kernel/claim.js';
import {
  OpenSeamReasonKind,
  OpenSeam,
} from '../kernel/open-seam.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
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
import type {
  EvaluationArrayElement,
  EvaluationFunctionValue,
  EvaluationValue,
} from '../evaluation/values.js';
import { EvaluationValueKind } from '../evaluation/values.js';
import {
  type EvaluationOpenSeam,
} from '../evaluation/seams.js';
import {
  evaluationAbruptCompletionSummary,
  type EvaluationExpressionAbruptCompletion,
} from '../evaluation/completion.js';
import {
  openSeamReasonKindsForEvaluationPressure,
} from '../evaluation/boundary-open-reason.js';
import {
  foldStaticValueMemberRead,
  readStaticValueProperty,
} from '../evaluation/property-access.js';
import { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type {
  AppTaskDefinition,
} from '../configuration/app-task.js';
import {
  aureliaAppTaskEvaluationForValue,
} from '../configuration/aurelia-evaluation-runtime.js';
import {
  ConfigurationSequenceKind,
  type ConfigurationStep,
} from '../configuration/configuration-sequence.js';
import {
  buildRegistryBodyStepIndex,
  RegistryAdmissionBodyExecution,
  type RegistryBodyExecutionSession,
  type RegistryBodyStepExecution,
  type RegistryBodyStepIndex,
} from '../configuration/registry-body-index.js';
import type {
  BuiltInResourceEmission,
  ConfiguredBuiltInResourceCatalogEmission,
} from '../resources/built-in-resource-catalog-materializer.js';
import {
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
} from '../resources/resource-kind.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { ResourceIssue } from '../resources/resource-issue.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  OpenRegistrationAdmission,
  ParameterizedRegistryAdmission,
  FrameworkRegistrationAdmission,
  ResourceRegistrationAdmission,
  RegistryRegistrationAdmission,
  RegistrationStrategy,
  ResolverRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import type { EvaluatedRegistrationCarrier } from '../registration/registration-observation.js';
import {
  FrameworkRegistrationKind,
  RegistryBodyInterpretationState,
} from '../registration/registration-reference.js';
import type { RegistrationKernelEmission } from '../registration/registration-kernel-emitter.js';
import { hasEvaluationRegisterFunction } from '../registration/evaluated-registration-value.js';
import {
  FrameworkDiEffectCoverageState,
  frameworkDiRegistrationEffectsForKind,
} from './framework-registration-effects.js';
import type { Container } from './container.js';
import {
  ContainerRegistrationOperation,
  frameworkRegistrationKindForOperation,
} from './container-registration.js';
import {
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
  type ContainerFactorySlot,
  type ContainerResourceSlot,
} from './container-slot.js';
import type { ContainerResolutionFailureKind } from './container-lookup.js';
import {
  type DiIssue,
  DiRegistryApplicationFailureKind,
} from './di-issue.js';
import {
  type DiIssuePublication,
  DiIssuePublisher,
} from './di-issue-publication.js';
import { DiKeyIdentityEmitter } from './di-key-identity-emitter.js';
import { DiProductDetails } from './product-details.js';
import { Resolver } from './resolver.js';
import { isConcreteResolverStrategy } from './resolver.js';
import {
  ParameterizedRegistry,
  RegistryRegistrationState,
  RegistryValue,
} from './registry.js';
import {
  DiRegistrationValueMaterializer,
  type DiRegistrationValueMaterialization,
} from './registration-value-materializer.js';
import type {
  DiRegistrationEvidenceAuthority,
  DiRegistrationValueProduct,
} from './registration-value.js';
import {
  DiProviderActivationView,
  DiProviderActivationState,
  type DiProviderActivationSession,
} from './provider-activation.js';
import {
  DiRegistrationOpenSeamScope,
  type DiResourceSlotExclusion,
  DiWorldConstructionEmission,
  RegisteredAppTask,
  type DiResolverProduct,
} from './world-construction.js';
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
  type DiSourceSet,
  recordsForDiOpenSeam,
  recordsForDiEvaluationOpenSeams,
  recordsForDiSource,
  summaryForParameterizedRegistryResult,
  summaryForRegistryValueOpen,
} from './world-publication.js';

type ResourceSlotPublicationResult = NonNullable<ReturnType<
  DiResourceSlotPublicationMaterializer['recordsForResourceDefinitionSlot']
>>;

interface DiRegistrationSpendingEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly operation: ContainerRegistrationOperation;
  readonly resolvers: readonly Resolver[];
  readonly registries: readonly RegistryValue[];
  readonly parameterizedRegistries: readonly ParameterizedRegistry[];
  readonly resolverSlots: readonly ContainerResolverSlot[];
  readonly factorySlots: readonly ContainerFactorySlot[];
  readonly resourceSlots: readonly ContainerResourceSlot[];
  readonly resourceSlotExclusions: readonly DiResourceSlotExclusion[];
  readonly registeredAppTasks: readonly RegisteredAppTask[];
  readonly openSeams: readonly OpenSeam[];
  readonly registrationOpenSeamScopes: readonly DiRegistrationOpenSeamScope[];
  readonly issues: readonly DiIssue[];
  readonly resourceIssues: readonly ResourceIssue[];
  readonly evaluationMutationCount: number;
  readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null;
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
  readonly resourceSlotExclusions: readonly DiResourceSlotExclusion[];
  readonly registeredAppTasks: readonly RegisteredAppTask[];
  readonly openSeams: readonly OpenSeam[];
  readonly registrationOpenSeamScopes: readonly DiRegistrationOpenSeamScope[];
  readonly issues: readonly DiIssue[];
  readonly resourceIssues: readonly ResourceIssue[];
  readonly evaluationMutationCount: number;
  readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null;
  readonly completion: DiRegistrationCascadeCompletion;
}

interface DiRegistrationApplication {
  readonly body: RegistryAdmissionBodyExecution;
  /** Body cascades already spent synchronously at their reached container.register call sites. */
  readonly bodyCascades: readonly DiRegistrationSpendingCascadeEmission[] | null;
  readonly conditionalAdmissions: RegistrationKernelEmission | null;
  readonly records: readonly KernelStoreRecord[];
  readonly openSeams: readonly OpenSeam[];
  readonly issues: readonly DiIssuePublication[];
  readonly fatal: boolean;
  /** Exact thrown registry completion awaiting the nearest uncaught registration boundary. */
  readonly abruptFailure: EvaluationExpressionAbruptCompletion | null;
}

const enum DiRegistryHandlerReadState {
  Callable,
  Open,
  NotCallable,
}

type DiRegistryHandlerRead =
  | {
    readonly state: DiRegistryHandlerReadState.Callable;
    readonly value: EvaluationFunctionValue;
    readonly openSeams: readonly EvaluationOpenSeam[];
  }
  | {
    readonly state: DiRegistryHandlerReadState.Open;
    readonly reason: string;
    readonly openSeams: readonly EvaluationOpenSeam[];
    readonly reasonKinds: readonly OpenSeamReasonKind[];
  }
  | {
    readonly state: DiRegistryHandlerReadState.NotCallable;
    readonly reason: string;
  };

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
  dispatchAdmission: RegistrationAdmissionProduct,
  ordinal: number,
  runtimeValue: EvaluationValue | null,
  registrationValue: DiRegistrationValueMaterialization,
  application: DiRegistrationApplication,
  inheritedOpenSeams: readonly OpenSeam[],
) => DiRegistrationSpendingEmission;

interface DiRegistrationSpendingCascadeServices {
  readonly admissionsByProduct: ReadonlyMap<ProductHandle, RegistrationAdmissionProduct>;
  readonly openSeamsByAdmissionProduct: ReadonlyMap<ProductHandle, readonly OpenSeam[]>;
  readonly registryBodyIndex: RegistryBodyStepIndex;
  readonly activation: DiProviderActivationSession;
  readonly issuePublisher: DiIssuePublisher;
  readonly materializeValue: (
    admission: RegistrationAdmissionProduct,
    carrier: EvaluatedRegistrationCarrier | null,
  ) => DiRegistrationValueMaterialization;
  readonly parameterElementsFor: (
    registry: ParameterizedRegistry,
  ) => readonly EvaluationArrayElement[];
  readonly materializeParameterizedRegistryParameters: (
    registry: ParameterizedRegistry,
    ownerKey: string,
  ) => RegistrationKernelEmission;
  readonly openParameterizedRegistry: (
    local: string,
    registry: ParameterizedRegistry,
    summary: string,
    reasonKinds: readonly OpenSeamReasonKind[],
  ) => {
    readonly records: readonly KernelStoreRecord[];
    readonly seam: OpenSeam;
  };
  readonly retainEvaluationPressure: (
    local: string,
    openSeams: readonly EvaluationOpenSeam[],
    fallbackAddressHandle: AddressHandle | null,
  ) => {
    readonly records: readonly KernelStoreRecord[];
    readonly seams: readonly OpenSeam[];
  };
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
  readonly resourceSlotExclusions: DiResourceSlotExclusion[] = [];
  readonly registeredAppTasks: RegisteredAppTask[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly issues: DiIssue[] = [];
  readonly resourceIssues: ResourceIssue[] = [];
  readonly operationMaterializationClaimHandles: ClaimHandle[];

  constructor(
    source: DiSourceSet,
    readonly operation: DiRegistrationOperationEmission,
    registrationValue: DiRegistrationValueMaterialization,
    readonly evaluationMutationCount: number,
    readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null,
  ) {
    this.records = [
      ...source.records,
      ...registrationValue.records,
      ...operation.records,
    ];
    this.operationMaterializationClaimHandles = [
      operation.containerProducesOperationClaimHandle,
      operation.operationAppliesAdmissionClaimHandle,
      ...(operation.operationUsesRegistrationValueClaimHandle == null
        ? []
        : [operation.operationUsesRegistrationValueClaimHandle]),
    ];
    if (registrationValue.product instanceof Resolver) {
      this.resolvers.push(registrationValue.product);
    } else if (registrationValue.product instanceof RegistryValue) {
      this.registries.push(registrationValue.product);
    } else if (registrationValue.product instanceof ParameterizedRegistry) {
      this.parameterizedRegistries.push(registrationValue.product);
    }
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

  recordResourceSlots(container: Container, emission: DiResourceSlotEmission): void {
    this.records.push(...emission.records);
    this.resourceSlots.push(...emission.slots);
    this.openSeams.push(...emission.openSeams);
    this.issues.push(...emission.issues);
    this.resourceIssues.push(...emission.resourceIssues);
    this.resourceSlotExclusions.push(...emission.exclusions);
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
    this.registeredAppTasks.push(...effects.appTasks.map((task) =>
      new RegisteredAppTask(task, null, this.operation.product)
    ));
    this.openSeams.push(...effects.openSeams);
    this.issues.push(...effects.issues);
    this.resourceIssues.push(...effects.resourceIssues);
    this.resourceSlotExclusions.push(...effects.resourceSlotExclusions);
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

  recordAppTask(
    task: AppTaskDefinition | null,
    runtimeValue: EvaluationValue | null,
  ): void {
    if (task != null) {
      this.registeredAppTasks.push(new RegisteredAppTask(
        task,
        aureliaAppTaskEvaluationForValue(runtimeValue),
        this.operation.product,
      ));
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
      resourceSlotExclusions: this.resourceSlotExclusions,
      registeredAppTasks: this.registeredAppTasks,
      openSeams: this.openSeams,
      registrationOpenSeamScopes: this.openSeams.map((seam) => new DiRegistrationOpenSeamScope(
        seam,
        this.operation.product,
        this.operation.product.container.identityHandle,
      )),
      issues: this.issues,
      resourceIssues: this.resourceIssues,
      evaluationMutationCount: this.evaluationMutationCount,
      abruptCompletion: this.abruptCompletion,
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
  private readonly resourceSlotExclusions: DiResourceSlotExclusion[] = [];
  private readonly registeredAppTasks: RegisteredAppTask[] = [];
  private readonly openSeams: OpenSeam[] = [];
  private readonly registrationOpenSeamScopes: DiRegistrationOpenSeamScope[] = [];
  private readonly issues: DiIssue[] = [];
  private readonly resourceIssues: ResourceIssue[] = [];
  private evaluationMutationCount = 0;
  private abruptCompletion: EvaluationExpressionAbruptCompletion | null = null;
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
    this.resourceSlotExclusions.push(...spent.resourceSlotExclusions);
    this.registeredAppTasks.push(...spent.registeredAppTasks);
    this.openSeams.push(...spent.openSeams);
    this.registrationOpenSeamScopes.push(...spent.registrationOpenSeamScopes);
    this.issues.push(...spent.issues);
    this.resourceIssues.push(...spent.resourceIssues);
    this.evaluationMutationCount += spent.evaluationMutationCount;
    this.abruptCompletion ??= spent.abruptCompletion;
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
    this.resourceSlotExclusions.push(...spent.resourceSlotExclusions);
    this.registeredAppTasks.push(...spent.registeredAppTasks);
    this.openSeams.push(...spent.openSeams);
    this.registrationOpenSeamScopes.push(...spent.registrationOpenSeamScopes);
    this.issues.push(...spent.issues);
    this.resourceIssues.push(...spent.resourceIssues);
    this.evaluationMutationCount += spent.evaluationMutationCount;
    this.abruptCompletion ??= spent.abruptCompletion;
    if (spent.completion === DiRegistrationCascadeCompletion.Fatal) {
      this.completion = DiRegistrationCascadeCompletion.Fatal;
    }
  }

  markFatal(): void {
    this.completion = DiRegistrationCascadeCompletion.Fatal;
  }

  get fatal(): boolean {
    return this.completion === DiRegistrationCascadeCompletion.Fatal;
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
      resourceSlotExclusions: this.resourceSlotExclusions,
      registeredAppTasks: this.registeredAppTasks,
      openSeams: this.openSeams,
      registrationOpenSeamScopes: this.registrationOpenSeamScopes,
      issues: this.issues,
      resourceIssues: this.resourceIssues,
      evaluationMutationCount: this.evaluationMutationCount,
      abruptCompletion: this.abruptCompletion,
      completion: this.completion,
    };
  }
}

class DiRegistrationSpendingCascade {
  private readonly activeAdmissionKeys = new Set<string>();
  private nextOperationOrdinal = 0;

  constructor(private readonly services: DiRegistrationSpendingCascadeServices) {}

  admissionForProduct(productHandle: ProductHandle): RegistrationAdmissionProduct | null {
    return this.services.admissionsByProduct.get(productHandle) ?? null;
  }

  spend(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    carrier: EvaluatedRegistrationCarrier | null,
    admissionOpenSeams: readonly OpenSeam[] | null = null,
    propagateRegistryFailure = false,
  ): DiRegistrationSpendingCascadeEmission {
    const spentKey = `${container.productHandle}:${step.productHandle}:${admission.productHandle}`;
    if (this.activeAdmissionKeys.has(spentKey)) {
      return this.unableAutoRegisterCascade(spentKey, step, admission);
    }
    const ordinal = this.nextOperationOrdinal++;
    this.activeAdmissionKeys.add(spentKey);
    try {
      const runtimeValue = carrier?.value ?? null;
      const registrationValue = this.services.materializeValue(admission, carrier);
      const dispatchAdmission = registrationValue.dispatchAdmission ?? admission;
      let application = emptyDiRegistrationApplication();
      if (
        registrationValue.product instanceof RegistryValue
        && hasEvaluationRegisterFunction(runtimeValue)
      ) {
        application = this.executeRegistryBody(
          container,
          step,
          admission,
          ordinal,
          runtimeValue,
          [],
          this.services.registryBodyIndex.openAdmissionExecution(admission, runtimeValue),
        );
      }
      if (registrationValue.product instanceof ParameterizedRegistry) {
        application = this.prepareParameterizedRegistry(
          container,
          step,
          admission,
          ordinal,
          registrationValue.product,
        );
      }
      if (application.abruptFailure != null && !propagateRegistryFailure) {
        application = mergeDiRegistrationApplications(
          application,
          this.failedRegistryApplication(
            container,
            step,
            admission,
            ordinal,
            DiRegistryApplicationFailureKind.AbruptCompletion,
            `Registry application failed after its reached effects: ${evaluationAbruptCompletionSummary(application.abruptFailure)}`,
          ),
        );
      }
      const inheritedOpenSeams = registrationValue.closesAdmissionRecognition
        ? registrationValue.openSeams
        : [
            ...(admissionOpenSeams
              ?? this.services.openSeamsByAdmissionProduct.get(admission.productHandle)
              ?? []),
            ...registrationValue.openSeams,
          ];
      const frame = new DiRegistrationSpendingCascadeFrame(
        this.services.spendDirect(
          container,
          step,
          admission,
          dispatchAdmission,
          ordinal,
          runtimeValue,
          registrationValue,
          application,
          inheritedOpenSeams,
        ),
      );
      if (application.conditionalAdmissions != null) {
        for (const conditionalAdmission of application.conditionalAdmissions.admissions) {
          const spent = this.spend(
            container,
            step,
            conditionalAdmission,
            application.conditionalAdmissions.evaluatedCarriersByAdmissionProduct.get(conditionalAdmission.productHandle) ?? null,
            application.conditionalAdmissions.openSeamsByAdmissionProduct.get(conditionalAdmission.productHandle) ?? [],
            propagateRegistryFailure,
          );
          frame.recordCascade(spent);
          if (spent.completion === DiRegistrationCascadeCompletion.Fatal) {
            break;
          }
        }
      }
      if (!frame.fatal) {
        if (application.bodyCascades != null) {
          for (const spent of application.bodyCascades) {
            frame.recordCascade(spent);
          }
        } else {
          for (const bodyStep of application.body.steps) {
            if (!this.recordBodyStep(frame, container, bodyStep)) {
              break;
            }
          }
        }
      }
      if (application.fatal) {
        frame.markFatal();
      }
      return frame.toEmission();
    } finally {
      this.activeAdmissionKeys.delete(spentKey);
    }
  }

  private executeRegistryBody(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    ordinal: number,
    runtimeValue: EvaluationValue,
    parameterValues: readonly EvaluationValue[],
    bodySession: RegistryBodyExecutionSession | null,
  ): DiRegistrationApplication {
    const bodyCascades: DiRegistrationSpendingCascadeEmission[] | null = bodySession == null ? null : [];
    const execution = this.services.activation.executeRegistrationRegistry(
      container,
      runtimeValue,
      parameterValues,
      bodySession == null
        ? null
        : (invocation) => {
            const bodyStep = bodySession.record(invocation);
            if (bodyStep == null) {
              return;
            }
            let invocationFatal = false;
            let evaluationMutationCount = 0;
            let abruptCompletion: EvaluationExpressionAbruptCompletion | null = null;
            for (const spent of this.spendBodyStep(container, bodyStep)) {
              bodyCascades!.push(spent);
              evaluationMutationCount += spent.evaluationMutationCount;
              if (spent.completion === DiRegistrationCascadeCompletion.Fatal) {
                invocationFatal = true;
                abruptCompletion ??= spent.abruptCompletion;
                break;
              }
            }
            return {
              shouldContinue: !invocationFatal,
              hasEvaluationMutation: evaluationMutationCount > 0,
              abruptCompletion,
            };
          },
    );
    const body = bodySession?.finish(execution)
      ?? new RegistryAdmissionBodyExecution([], false, execution);
    return {
      ...this.applicationForRegistryBody(container, step, admission, ordinal, body),
      bodyCascades: bodyCascades?.map((emission) => registryCascadeAfterEnclosingExecution(
        emission,
        execution?.abruptCompletion ?? null,
      )) ?? null,
    };
  }

  private prepareParameterizedRegistry(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    ordinal: number,
    registry: ParameterizedRegistry,
  ): DiRegistrationApplication {
    const result = registry.register(container);
    if (result.state === RegistryRegistrationState.Open) {
      return this.openParameterizedRegistryApplication(
        container,
        step,
        admission,
        ordinal,
        registry,
        summaryForParameterizedRegistryResult(result.state),
        [OpenSeamReasonKind.DiRegistryBodyOpen],
      );
    }

    const parameterElements = this.services.parameterElementsFor(registry);
    const parameterOpenSeams = parameterElements.flatMap((element) => element.openSeams);
    if (parameterElements.length !== registry.params.length || parameterOpenSeams.length > 0) {
      const pressure = this.services.retainEvaluationPressure(
        this.parameterizedRegistryLocal(container, step, admission, ordinal, 'parameter-pressure'),
        parameterOpenSeams,
        registry.sourceAddressHandle,
      );
      return pressure.seams.length > 0
        ? {
            ...emptyDiRegistrationApplication(),
            records: pressure.records,
            openSeams: pressure.seams,
          }
        : this.openParameterizedRegistryApplication(
          container,
          step,
          admission,
          ordinal,
          registry,
          'Parameterized registry arguments did not retain one exact evaluator value per runtime parameter.',
          [OpenSeamReasonKind.DiRegistryBodyOpen],
        );
    }

    if (result.state === RegistryRegistrationState.ParameterAdmission) {
      return {
        ...emptyDiRegistrationApplication(),
        conditionalAdmissions: this.services.materializeParameterizedRegistryParameters(
          registry,
          `di-registration:${ordinal}:${container.productHandle}:${step.productHandle}:${admission.productHandle}`,
        ),
      };
    }

    const activation = this.services.activation.activateParameterizedRegistryHandler(
      container,
      registry,
    );
    if (activation.abruptCompletion != null) {
      return {
        ...emptyDiRegistrationApplication(),
        fatal: true,
        abruptFailure: activation.abruptCompletion,
      };
    }
    if (activation.state === DiProviderActivationState.Failed) {
      return this.failedRegistryApplication(
        container,
        step,
        admission,
        ordinal,
        DiRegistryApplicationFailureKind.HandlerResolution,
        activation.reason ?? 'Parameterized registry handler resolution entered a proven container failure.',
        activation.failureKind,
      );
    }
    if (activation.state === DiProviderActivationState.Cycle && activation.cycle != null) {
      const issue = this.services.issuePublisher.publishCyclicDependency(
        this.parameterizedRegistryLocal(container, step, admission, ordinal, 'handler-cycle'),
        registry.key.localName,
        registry.key.localName ?? String(registry.key.identityHandle),
        activation.cycle,
        registry.sourceAddressHandle,
      );
      return {
        ...emptyDiRegistrationApplication(),
        records: issue.records,
        issues: [issue],
        fatal: true,
      };
    }
    if (activation.state !== DiProviderActivationState.Value || activation.value == null) {
      if (activation.state === DiProviderActivationState.Undefined) {
        return this.failedRegistryApplication(
          container,
          step,
          admission,
          ordinal,
          DiRegistryApplicationFailureKind.HandlerRegisterNotCallable,
          'Parameterized registry handler resolution produced undefined, so runtime register(container, ...params) dispatch would throw.',
        );
      }
      const pressure = this.services.retainEvaluationPressure(
        this.parameterizedRegistryLocal(container, step, admission, ordinal, 'handler-pressure'),
        activation.openSeams,
        registry.sourceAddressHandle,
      );
      return pressure.seams.length > 0
        ? {
            ...emptyDiRegistrationApplication(),
            records: pressure.records,
            openSeams: pressure.seams,
          }
        : this.openParameterizedRegistryApplication(
            container,
            step,
            admission,
            ordinal,
            registry,
            activation.reason
              ?? 'Parameterized registry handler resolution did not produce one exact registry value.',
            [OpenSeamReasonKind.DiRegistryBodyOpen],
          );
    }

    const activationPressure = this.services.retainEvaluationPressure(
      this.parameterizedRegistryLocal(container, step, admission, ordinal, 'handler-value-pressure'),
      activation.openSeams,
      registry.sourceAddressHandle,
    );
    const handler = readParameterizedRegistryHandler(activation.value);
    if (handler.state === DiRegistryHandlerReadState.NotCallable) {
      return mergeDiRegistrationApplications(
        {
          ...emptyDiRegistrationApplication(),
          records: activationPressure.records,
          openSeams: activationPressure.seams,
        },
        this.failedRegistryApplication(
          container,
          step,
          admission,
          ordinal,
          DiRegistryApplicationFailureKind.HandlerRegisterNotCallable,
          handler.reason,
        ),
      );
    }
    if (handler.state === DiRegistryHandlerReadState.Open) {
      const memberPressure = this.services.retainEvaluationPressure(
        this.parameterizedRegistryLocal(container, step, admission, ordinal, 'handler-member-pressure'),
        handler.openSeams,
        registry.sourceAddressHandle,
      );
      const pressure = mergeDiRegistrationApplications(
        {
          ...emptyDiRegistrationApplication(),
          records: activationPressure.records,
          openSeams: activationPressure.seams,
        },
        {
          ...emptyDiRegistrationApplication(),
          records: memberPressure.records,
          openSeams: memberPressure.seams,
        },
      );
      return pressure.openSeams.length > 0
        ? pressure
        : mergeDiRegistrationApplications(
            pressure,
            this.openParameterizedRegistryApplication(
              container,
              step,
              admission,
              ordinal,
              registry,
              handler.reason,
              handler.reasonKinds.length === 0
                ? [OpenSeamReasonKind.DiRegistryBodyOpen]
                : handler.reasonKinds,
            ),
          );
    }

    const parameterValues = parameterElements.map((element) => element.value);
    const bodyApplication = this.executeRegistryBody(
      container,
      step,
      admission,
      ordinal,
      activation.value,
      parameterValues,
      this.services.registryBodyIndex.openRuntimeValueExecution(activation.value),
    );
    let application = mergeDiRegistrationApplications(
      {
        ...emptyDiRegistrationApplication(),
        records: activationPressure.records,
        openSeams: activationPressure.seams,
      },
      bodyApplication,
    );
    if (!bodyApplication.body.closed && !application.fatal && application.openSeams.length === 0) {
      application = mergeDiRegistrationApplications(
        application,
        this.openParameterizedRegistryApplication(
            container,
            step,
            admission,
            ordinal,
            registry,
            'Parameterized registry resolved an exact handler, but its register(container, ...params) body did not close to the source-owned registration sequence.',
            [OpenSeamReasonKind.DiRegistryBodyOpen],
        ),
      );
    }
    return application;
  }

  private applicationForRegistryBody(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    ordinal: number,
    body: RegistryAdmissionBodyExecution,
  ): DiRegistrationApplication {
    const execution = body.execution;
    const pressure = this.services.retainEvaluationPressure(
      this.parameterizedRegistryLocal(container, step, admission, ordinal, 'registry-body-pressure'),
      execution?.auditOpenSeams ?? [],
      admission.sourceAddressHandle,
    );
    const application: DiRegistrationApplication = {
      ...emptyDiRegistrationApplication(),
      body,
      records: pressure.records,
      openSeams: pressure.seams,
    };
    return execution?.abruptCompletion == null
      ? application
      : {
          ...application,
          fatal: true,
          abruptFailure: execution.abruptCompletion,
        };
  }

  private failedRegistryApplication(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    ordinal: number,
    failureKind: DiRegistryApplicationFailureKind,
    message: string,
    resolutionFailureKind: ContainerResolutionFailureKind | null = null,
  ): DiRegistrationApplication {
    const issue = this.services.issuePublisher.publishRegistryApplicationFailed(
      this.parameterizedRegistryLocal(container, step, admission, ordinal, `failure:${failureKind}`),
      container,
      step.stepKind,
      admission.admissionKind,
      registrationAdmissionStrategyLabel(admission),
      failureKind,
      message,
      admission.sourceAddressHandle,
      resolutionFailureKind,
    );
    return {
      ...emptyDiRegistrationApplication(),
      records: issue.records,
      issues: [issue],
      fatal: true,
    };
  }

  private openParameterizedRegistryApplication(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    ordinal: number,
    registry: ParameterizedRegistry,
    summary: string,
    reasonKinds: readonly OpenSeamReasonKind[],
  ): DiRegistrationApplication {
    const open = this.parameterizedRegistryOpen(
      container,
      step,
      admission,
      ordinal,
      registry,
      summary,
      reasonKinds,
    );
    return {
      ...emptyDiRegistrationApplication(),
      records: open.records,
      openSeams: [open.seam],
    };
  }

  private parameterizedRegistryLocal(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    ordinal: number,
    suffix: string,
  ): string {
    return `di-registration:${ordinal}:${container.productHandle}:${step.productHandle}:${admission.productHandle}:${suffix}`;
  }

  private parameterizedRegistryOpen(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    ordinal: number,
    registry: ParameterizedRegistry,
    summary: string,
    reasonKinds: readonly OpenSeamReasonKind[],
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly seam: OpenSeam;
  } {
    return this.services.openParameterizedRegistry(
      this.parameterizedRegistryLocal(container, step, admission, ordinal, 'parameterized-registry-open'),
      registry,
      summary,
      reasonKinds,
    );
  }

  private recordBodyStep(
    frame: DiRegistrationSpendingCascadeFrame,
    container: Container,
    execution: RegistryBodyStepExecution,
  ): boolean {
    for (const spent of this.spendBodyStep(container, execution)) {
      frame.recordCascade(spent);
      if (spent.completion === DiRegistrationCascadeCompletion.Fatal) {
        return false;
      }
    }
    return true;
  }

  private spendBodyStep(
    container: Container,
    execution: RegistryBodyStepExecution,
  ): readonly DiRegistrationSpendingCascadeEmission[] {
    const spentAdmissions: DiRegistrationSpendingCascadeEmission[] = [];
    const bodyStep = execution.step;
    for (const admissionHandle of bodyStep.registrationAdmissionProductHandles) {
      const admission = this.admissionForProduct(admissionHandle);
      if (admission == null) {
        continue;
      }
      const spent = this.spend(
        container,
        bodyStep,
        admission,
        execution.runtimeCarrierForAdmission(admission),
        null,
        true,
      );
      spentAdmissions.push(spent);
      if (spent.completion === DiRegistrationCascadeCompletion.Fatal) {
        break;
      }
    }
    return spentAdmissions;
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
      resourceSlotExclusions: [],
      registeredAppTasks: [],
      openSeams: [],
      registrationOpenSeamScopes: [],
      issues: [publication.issue],
      resourceIssues: [],
      evaluationMutationCount: 0,
      abruptCompletion: null,
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

function registryCascadeAfterEnclosingExecution(
  emission: DiRegistrationSpendingCascadeEmission,
  propagated: EvaluationExpressionAbruptCompletion | null,
): DiRegistrationSpendingCascadeEmission {
  const caught = emission.completion === DiRegistrationCascadeCompletion.Fatal
    && (
      propagated == null
      || emission.abruptCompletion != null && emission.abruptCompletion !== propagated
    );
  return caught
    ? {
        ...emission,
        completion: DiRegistrationCascadeCompletion.Completed,
        abruptCompletion: null,
      }
    : emission;
}

function emptyDiRegistrationApplication(): DiRegistrationApplication {
  return {
    body: new RegistryAdmissionBodyExecution([], false),
    bodyCascades: null,
    conditionalAdmissions: null,
    records: [],
    openSeams: [],
    issues: [],
    fatal: false,
    abruptFailure: null,
  };
}

function mergeDiRegistrationApplications(
  left: DiRegistrationApplication,
  right: DiRegistrationApplication,
): DiRegistrationApplication {
  return {
    body: registryBodyHasEvidence(right.body) ? right.body : left.body,
    bodyCascades: left.bodyCascades == null && right.bodyCascades == null
      ? null
      : [...(left.bodyCascades ?? []), ...(right.bodyCascades ?? [])],
    conditionalAdmissions: right.conditionalAdmissions ?? left.conditionalAdmissions,
    records: [...left.records, ...right.records],
    openSeams: [...left.openSeams, ...right.openSeams],
    issues: [...left.issues, ...right.issues],
    fatal: left.fatal || right.fatal,
    abruptFailure: right.abruptFailure ?? left.abruptFailure,
  };
}

function registryBodyHasEvidence(body: RegistryAdmissionBodyExecution): boolean {
  return body.execution != null || body.steps.length > 0 || body.matched;
}

function readParameterizedRegistryHandler(value: EvaluationValue): DiRegistryHandlerRead {
  return foldStaticValueMemberRead<DiRegistryHandlerRead>(readStaticValueProperty(value, 'register', value.node), {
    value: (member) => member.kind === EvaluationValueKind.Function
      ? {
          state: DiRegistryHandlerReadState.Callable,
          value: member,
          openSeams: [] as readonly EvaluationOpenSeam[],
        }
      : {
          state: DiRegistryHandlerReadState.NotCallable,
          reason: 'Parameterized registry handler activation produced an exact value whose register member is not callable.',
        },
    candidate: (_member, openSeams) => ({
      state: DiRegistryHandlerReadState.Open,
      reason: 'Parameterized registry handler has a candidate register member qualified by unresolved property pressure.',
      openSeams,
      reasonKinds: openSeamReasonKindsForEvaluationPressure(openSeams, null),
    }),
    getter: (_getter, _thisValue, openSeams) => ({
      state: DiRegistryHandlerReadState.Open,
      reason: 'Parameterized registry handler exposes register through a getter whose result has not been executed by DI world construction.',
      openSeams,
      reasonKinds: openSeamReasonKindsForEvaluationPressure(openSeams, null),
    }),
    open: (reason, _seamKind, reasonKinds, openSeams) => ({
      state: DiRegistryHandlerReadState.Open,
      reason,
      openSeams,
      reasonKinds,
    }),
  });
}

class DiWorldConstructionFrame {
  readonly records: KernelStoreRecord[] = [];
  readonly registrationOperations: ContainerRegistrationOperation[] = [];
  readonly resolvers: DiResolverProduct[] = [];
  readonly registries: RegistryValue[] = [];
  readonly parameterizedRegistries: ParameterizedRegistry[] = [];
  readonly resolverSlots: ContainerResolverSlot[] = [];
  readonly factorySlots: ContainerFactorySlot[] = [];
  readonly selfResolverSlots: ContainerSelfResolverSlot[] = [];
  readonly resourceSlots: ContainerResourceSlot[] = [];
  readonly resourceSlotExclusions: DiResourceSlotExclusion[] = [];
  readonly registeredAppTasks: RegisteredAppTask[] = [];
  readonly openSeams: OpenSeam[] = [];
  readonly registrationOpenSeamScopes: DiRegistrationOpenSeamScope[] = [];
  readonly issues: DiIssue[] = [];
  readonly resourceIssues: ResourceIssue[] = [];
  private readonly resolverProductHandles = new Set<ProductHandle>();
  private readonly registryProductHandles = new Set<ProductHandle>();
  private readonly parameterizedRegistryProductHandles = new Set<ProductHandle>();

  recordSelfResolver(selfResolver: ContainerSelfResolverSlot): void {
    this.selfResolverSlots.push(selfResolver);
  }

  recordConstructorResolverSlot(slot: ContainerResolverSlot): void {
    this.resolverSlots.push(slot);
    const resolver = slot.resolver;
    if (resolver == null || this.resolverProductHandles.has(resolver.productHandle)) {
      return;
    }
    this.resolverProductHandles.add(resolver.productHandle);
    this.resolvers.push(resolver);
  }

  recordOpenSeam(
    seam: {
      readonly records: readonly KernelStoreRecord[];
      readonly seam: OpenSeam;
    },
    containerIdentityHandle: IdentityHandle | null = null,
  ): void {
    this.records.push(...seam.records);
    this.openSeams.push(seam.seam);
    this.registrationOpenSeamScopes.push(new DiRegistrationOpenSeamScope(
      seam.seam,
      null,
      containerIdentityHandle,
    ));
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
    readonly resourceSlotExclusions: readonly DiResourceSlotExclusion[];
    readonly registeredAppTasks: readonly RegisteredAppTask[];
    readonly openSeams: readonly OpenSeam[];
    readonly registrationOpenSeamScopes: readonly DiRegistrationOpenSeamScope[];
    readonly issues: readonly DiIssue[];
    readonly resourceIssues: readonly ResourceIssue[];
  }): void {
    this.records.push(...spent.records);
    this.registrationOperations.push(...spent.operations);
    for (const resolver of spent.resolvers) {
      if (!this.resolverProductHandles.has(resolver.productHandle)) {
        this.resolverProductHandles.add(resolver.productHandle);
        this.resolvers.push(resolver);
      }
    }
    for (const registry of spent.registries) {
      if (!this.registryProductHandles.has(registry.productHandle)) {
        this.registryProductHandles.add(registry.productHandle);
        this.registries.push(registry);
      }
    }
    for (const registry of spent.parameterizedRegistries) {
      if (!this.parameterizedRegistryProductHandles.has(registry.productHandle)) {
        this.parameterizedRegistryProductHandles.add(registry.productHandle);
        this.parameterizedRegistries.push(registry);
      }
    }
    this.resolverSlots.push(...spent.resolverSlots);
    this.factorySlots.push(...spent.factorySlots);
    this.resourceSlots.push(...spent.resourceSlots);
    this.resourceSlotExclusions.push(...spent.resourceSlotExclusions);
    this.registeredAppTasks.push(...spent.registeredAppTasks);
    this.openSeams.push(...spent.openSeams);
    this.registrationOpenSeamScopes.push(...spent.registrationOpenSeamScopes);
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
      this.resourceSlotExclusions,
      this.registeredAppTasks,
      this.openSeams,
      this.registrationOpenSeamScopes,
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
    const containersByProduct = this.installConstructorResolvers(configuration, frame);
    const aureliaContainerByProduct = this.aureliaContainerIndex(configuration, containersByProduct);
    const admissionsByProduct = registrationAdmissionIndex(configuration);
    const appTasksByProduct = appTaskIndex(configuration);
    const registrationValues = new DiRegistrationValueMaterializer(
      this.store,
      this.publication,
      configuration,
      evaluation,
      typeSystem,
      resourceDefinitions,
      projectKey,
      this.resolverPublication,
      this.registryPublication,
    );
    const activation = new DiProviderActivationView(
      this.publication,
      evaluation.forkSession(),
      typeSystem,
      configuration,
      {
        containers: [...containersByProduct.values()],
        resolverSlots: frame.resolverSlots,
        selfResolverSlots: frame.selfResolverSlots,
        factorySlots: frame.factorySlots,
      },
      registrationValues,
    ).createSession();
    const registrationCascade = this.registrationSpendingCascade(
      configuration,
      evaluation,
      typeSystem,
      configuredResources,
      resourceDefinitions,
      projectKey,
      admissionsByProduct,
      appTasksByProduct,
      registrationValues,
      activation,
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
    registrationValues: DiRegistrationValueMaterializer,
    activation: DiProviderActivationSession,
  ): DiRegistrationSpendingCascade {
    const sourceIndex = new StaticProjectEvaluationSourceIndex(evaluation);
    return new DiRegistrationSpendingCascade({
      admissionsByProduct,
      openSeamsByAdmissionProduct: registrationAdmissionOpenSeamIndex(configuration),
      registryBodyIndex: buildRegistryBodyStepIndex(configuration),
      activation,
      issuePublisher: new DiIssuePublisher(this.store),
      materializeValue: (admission, carrier) => registrationValues.materialize(admission, carrier),
      parameterElementsFor: (registry) => registrationValues.evaluatedRegistryParameterElements(registry),
      materializeParameterizedRegistryParameters: (registry, ownerKey) =>
        registrationValues.materializeParameterizedRegistryParameterAdmissions(registry, ownerKey),
      openParameterizedRegistry: (local, registry, summary, reasonKinds) => recordsForDiOpenSeam(
        this.store,
        local,
        KernelVocabulary.Di.OpenRegistryBody.key,
        summary,
        registry.sourceAddressHandle,
        reasonKinds,
      ),
      retainEvaluationPressure: (local, openSeams, fallbackAddressHandle) =>
        recordsForDiEvaluationOpenSeams(
          this.store,
          sourceIndex,
          local,
          openSeams,
          fallbackAddressHandle,
        ),
      spendDirect: (
        container,
        step,
        admission,
        dispatchAdmission,
        ordinal,
        runtimeValue,
        registrationValue,
        application,
        inheritedOpenSeams,
      ) =>
        this.recordsForRegistrationSpending(
          container,
          step,
          admission,
          dispatchAdmission,
          ordinal,
          runtimeValue,
          registrationValue,
          application,
          typeSystem,
          configuredResources,
          resourceDefinitions,
          projectKey,
          appTasksByProduct,
          inheritedOpenSeams,
        ),
    });
  }

  private installConstructorResolvers(
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
      container.readResolverSlots().filter((slot): slot is ContainerResolverSlot =>
        slot instanceof ContainerResolverSlot
      ).forEach((slot) => frame.recordConstructorResolverSlot(slot));
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
    const sequenceKindsByProduct = new Map(configuration.sequences.map((sequence) => [
      sequence.productHandle,
      sequence.sequenceKind,
    ] as const));
    for (const step of configuration.steps) {
      const sequenceProductHandle = step.sequence?.productHandle ?? null;
      if (
        sequenceProductHandle != null
        && sequenceKindsByProduct.get(sequenceProductHandle) === ConfigurationSequenceKind.Registry
      ) {
        continue;
      }
      if (sequenceProductHandle != null && failedSequenceProducts.has(sequenceProductHandle)) {
        continue;
      }
      if (step.registrationAdmissionProductHandles.length === 0) {
        continue;
      }

      const container = this.containerForStep(step, containersByProduct, aureliaContainerByProduct);
      if (container == null) {
        this.recordOpenRegistrationSpendingStep(
          frame,
          step,
          `di-open-container:${step.productHandle}`,
          'Configuration step admitted registrations, but DI world construction could not identify or model the receiving container.',
          [OpenSeamReasonKind.DiRegistrationContainerOpen],
        );
        continue;
      }

      for (const admissionProductHandle of step.registrationAdmissionProductHandles) {
        const admission = registrationCascade.admissionForProduct(admissionProductHandle);
        if (admission == null) {
          this.recordOpenRegistrationSpendingStep(
            frame,
            step,
            `di-open-admission:${step.productHandle}:${admissionProductHandle}`,
            'Configuration step referenced a registration admission product that was not present in the configuration emission.',
            [OpenSeamReasonKind.DiRegistrationAdmissionOpen],
            container.identityHandle,
          );
          continue;
        }

        const spent = registrationCascade.spend(
          container,
          step,
          admission,
          configuration.evaluationBindings.registrationCarrierForAdmission(admission.productHandle),
        );
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
    step: ConfigurationStep,
    containersByProduct: ReadonlyMap<ProductHandle, Container>,
    aureliaContainerByProduct: ReadonlyMap<ProductHandle, Container>,
  ): Container | null {
    if (step.targetProductHandle != null) {
      const direct = containersByProduct.get(step.targetProductHandle)
        ?? aureliaContainerByProduct.get(step.targetProductHandle)
        ?? null;
      if (direct != null) {
        return direct;
      }
    }
    return null;
  }

  private recordOpenRegistrationSpendingStep(
    frame: DiWorldConstructionFrame,
    step: ConfigurationStep,
    local: string,
    summary: string,
    reasonKinds: readonly OpenSeamReasonKind[],
    containerIdentityHandle: IdentityHandle | null = null,
  ): void {
    const emission = recordsForDiOpenSeam(
      this.store,
      local,
      KernelVocabulary.Di.OpenRegistrationSpending.key,
      summary,
      step.sourceAddressHandle,
      reasonKinds,
    );
    frame.recordOpenSeam(emission, containerIdentityHandle);
    frame.records.push(new MaterializationRecord(
      this.store.handles.materialization(local),
      step.identityHandle,
      [],
      [],
      [emission.seam.handle],
    ));
  }

  private recordsForRegistrationSpending(
    container: Container,
    step: ConfigurationStep,
    admission: RegistrationAdmissionProduct,
    dispatchAdmission: RegistrationAdmissionProduct,
    ordinal: number,
    runtimeValue: EvaluationValue | null,
    registrationValue: DiRegistrationValueMaterialization,
    application: DiRegistrationApplication,
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    inheritedOpenSeams: readonly OpenSeam[],
  ): DiRegistrationSpendingEmission {
    const local = `di-registration:${ordinal}:${container.productHandle}:${step.productHandle}:${admission.productHandle}`;
    const source = recordsForDiSource(this.store,
      `${local}:source`,
      'Configuration-owned registration admission spent into DI world construction.',
      step.sourceAddressHandle ?? admission.sourceAddressHandle,
    );
    const operation = this.operationForAdmission(
      container,
      admission,
      registrationValue.product,
      registrationValue.authority,
      registrationValue.frameworkRegistrationKind,
      ordinal,
      local,
      source.provenanceHandle,
    );
    const frame = new DiRegistrationSpendingFrame(
      source,
      operation,
      registrationValue,
      application.body.execution?.mutationCount ?? 0,
      application.abruptFailure ?? application.body.execution?.abruptCompletion ?? null,
    );
    frame.records.push(...application.records);
    frame.retainOpenSeams([...inheritedOpenSeams, ...application.openSeams]);
    frame.issues.push(...application.issues.map((publication) => publication.issue));
    if (application.issues.length > 0) {
      frame.recordProductClaims(this.recordsForOperationProductClaims(
        `${local}:application-issues`,
        operation.product.productHandle,
        application.issues.map((publication) => publication.issue.productHandle),
        source.provenanceHandle,
      ));
    }
    if (application.conditionalAdmissions != null) {
      frame.records.push(...application.conditionalAdmissions.records);
      frame.recordProductClaims(this.recordsForOperationAdmissionClaims(
        `${local}:conditional-admission`,
        operation.product.productHandle,
        application.conditionalAdmissions.admissions,
        source.provenanceHandle,
      ));
    }

    this.spendRegistrationAdmission(
      frame,
      container,
      dispatchAdmission,
      runtimeValue,
      registrationValue.product,
      typeSystem,
      configuredResources,
      resourceDefinitions,
      projectKey,
      appTasksByProduct,
      local,
      source.provenanceHandle,
      application,
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
    runtimeValue: EvaluationValue | null,
    registrationValue: DiRegistrationValueProduct | null,
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    local: string,
    provenanceHandle: ProvenanceHandle,
    application: DiRegistrationApplication,
  ): void {
    if (registrationValue instanceof Resolver) {
      this.spendCanonicalResolverValue(
        frame,
        container,
        admission,
        registrationValue,
        local,
        provenanceHandle,
      );
      return;
    }
    if (registrationValue instanceof ParameterizedRegistry) {
      // Parameterized registries can recursively spend source-owned admissions, so the cascade owns their branch.
      return;
    }
    if (registrationValue instanceof RegistryValue) {
      this.spendCanonicalRegistryValue(
        frame,
        container,
        admission,
        registrationValue,
        runtimeValue,
        typeSystem,
        configuredResources,
        projectKey,
        appTasksByProduct,
        local,
        provenanceHandle,
        application,
      );
      return;
    }
    const frameworkKind = frameworkRegistrationKindForOperation(frame.operation.product);
    if (frameworkKind != null) {
      this.spendFrameworkRegistrationOperation(
        frame,
        container,
        admission,
        frameworkKind,
        typeSystem,
        configuredResources,
        projectKey,
        local,
        provenanceHandle,
      );
      return;
    }
    if (admission instanceof OpenRegistrationAdmission) {
      this.spendUnmaterializedRegistrationAdmission(frame, admission, local);
      return;
    }
    if (
      admission instanceof ResolverRegistrationAdmission
      || admission instanceof ParameterizedRegistryAdmission
      || admission instanceof RegistryRegistrationAdmission
    ) {
      this.spendUnmaterializedRegistrationAdmission(frame, admission, local);
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
  }

  private spendUnmaterializedRegistrationAdmission(
    frame: DiRegistrationSpendingFrame,
    admission:
      | OpenRegistrationAdmission
      | ResolverRegistrationAdmission
      | ParameterizedRegistryAdmission
      | RegistryRegistrationAdmission,
    local: string,
  ): void {
    if (frame.openSeams.length > 0) {
      return;
    }
    frame.recordOpenSeam(recordsForDiOpenSeam(this.store,
      `${local}:open-admission`,
      KernelVocabulary.Di.OpenRegistrationSpending.key,
      summaryForUnmaterializedRegistrationAdmission(admission),
      admission.sourceAddressHandle,
      reasonKindsForUnmaterializedRegistrationAdmission(admission),
    ));
  }

  private spendCanonicalResolverValue(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: RegistrationAdmissionProduct,
    resolver: Resolver,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    if (resolver._key.identityHandle == null || !isConcreteResolverStrategy(resolver._strategy)) {
      throw new Error('A canonical runtime Resolver must retain one closed key and concrete framework strategy.');
    }
    const emission = this.resolverPublication.recordsForCanonicalResolverSlot(
      container,
      {
        ownerIdentityHandle: admission.identityHandle,
        key: resolver._key,
        keyIdentityHandle: resolver._key.identityHandle,
        strategy: resolver._strategy,
        state: resolver._state,
        sourceAddressHandle: resolver.sourceAddressHandle,
        fieldProvenance: resolver.fieldProvenance,
      },
      resolver,
      local,
      provenanceHandle,
    );
    frame.recordResolverEmission(container, {
      records: emission.records,
      resolvers: [],
      resolverSlots: [emission.resolverSlot],
      openSeams: [],
    });
    frame.recordProductClaims(this.recordsForOperationProductClaims(
      `${local}:resolver-slot-products`,
      frame.operation.product.productHandle,
      [emission.resolverSlot.productHandle],
      provenanceHandle,
    ));
  }

  private spendCanonicalRegistryValue(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: RegistrationAdmissionProduct,
    registryValue: RegistryValue,
    runtimeValue: EvaluationValue | null,
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
    appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
    local: string,
    provenanceHandle: ProvenanceHandle,
    application: DiRegistrationApplication,
  ): void {
    const bodyClosed = application.body.closed
      || frameworkDiEffectsCloseRegistryBody(frame.operation.product);
    const openSummary = application.fatal || bodyClosed || application.openSeams.length > 0
      ? null
      : summaryForRegistryValueOpen(registryValue.registryValue);
    if (openSummary != null) {
      frame.recordOpenSeam(recordsForDiOpenSeam(
        this.store,
        `${local}:registry-open`,
        KernelVocabulary.Di.OpenRegistryBody.key,
        openSummary,
        admission.sourceAddressHandle,
        [OpenSeamReasonKind.DiRegistryBodyOpen],
      ));
    }
    if (application.fatal) {
      return;
    }

    const registeredAppTask = appTaskForRegistrationOperation(frame.operation.product, appTasksByProduct);
    frame.recordAppTask(registeredAppTask, runtimeValue);
    const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
      container,
      frame.operation.product,
      typeSystem,
      configuredResources,
      projectKey,
      `${local}:registry-framework-effects`,
      provenanceHandle,
    );
    frame.recordFrameworkEffects(container, frameworkEffects);
    frame.recordProductClaims(this.recordsForOperationProductClaims(
      `${local}:registry-effect-products`,
      frame.operation.product.productHandle,
      [
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
      frame.operation.product.productHandle,
      [
        ...emission.slots.map((slot) => slot.productHandle),
        ...emission.issues.map((issue) => issue.productHandle),
      ],
      provenanceHandle,
    ));
  }

  private spendFrameworkRegistrationOperation(
    frame: DiRegistrationSpendingFrame,
    container: Container,
    admission: RegistrationAdmissionProduct,
    frameworkKind: FrameworkRegistrationKind,
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): void {
    const frameworkEffects = this.recordsForFrameworkRegistrationEffects(
      container,
      frame.operation.product,
      typeSystem,
      configuredResources,
      projectKey,
      `${local}:framework-effects`,
      provenanceHandle,
    );
    frame.recordFrameworkEffects(container, frameworkEffects);
    frame.recordProductClaims(this.recordsForOperationProductClaims(
      `${local}:framework-effect-products`,
      frame.operation.product.productHandle,
      [
        ...frameworkEffects.resolvers.map((resolver) => resolver.productHandle),
        ...frameworkEffects.resolverSlots.map((slot) => slot.productHandle),
        ...frameworkEffects.factorySlots.map((slot) => slot.productHandle),
        ...frameworkEffects.resourceSlots.map((slot) => slot.productHandle),
        ...frameworkEffects.issues.map((issue) => issue.productHandle),
      ],
      provenanceHandle,
    ));

    const openSummary = frameworkDiRegistrationEffectsForKind(frameworkKind).openSummary;
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
    registrationValue: DiRegistrationValueProduct | null,
    evidenceAuthority: DiRegistrationEvidenceAuthority,
    frameworkRegistrationKind: FrameworkRegistrationKind | null,
    ordinal: number,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiRegistrationOperationEmission {
    const handles = this.registrationOperationHandles(local);
    const operation = this.registrationOperationForAdmission(
      container,
      admission,
      registrationValue,
      evidenceAuthority,
      frameworkRegistrationKind,
      ordinal,
      handles,
    );
    const records = this.recordsForRegistrationOperation(
      container,
      admission,
      registrationValue,
      operation,
      handles,
      provenanceHandle,
    );
    return new DiRegistrationOperationEmission(
      records,
      operation,
      handles.containerProducesOperationClaimHandle,
      handles.operationAppliesAdmissionClaimHandle,
      registrationValue == null ? null : handles.operationUsesRegistrationValueClaimHandle,
    );
  }

  private registrationOperationHandles(local: string): DiRegistrationOperationHandles {
    return new DiRegistrationOperationHandles(
      this.store.handles.product(`${local}:operation`),
      this.store.handles.identity(`${local}:operation`),
      this.store.handles.claim(`${local}:container-produces-operation`),
      this.store.handles.claim(`${local}:operation-applies-admission`),
      this.store.handles.claim(`${local}:operation-uses-registration-value`),
    );
  }

  private registrationOperationForAdmission(
    container: Container,
    admission: RegistrationAdmissionProduct,
    registrationValue: DiRegistrationValueProduct | null,
    evidenceAuthority: DiRegistrationEvidenceAuthority,
    frameworkRegistrationKind: FrameworkRegistrationKind | null,
    ordinal: number,
    handles: DiRegistrationOperationHandles,
  ): ContainerRegistrationOperation {
    const operation = new ContainerRegistrationOperation(
      handles.productHandle,
      handles.identityHandle,
      ordinal,
      container.toReference(),
      admission,
      registrationValue,
      evidenceAuthority,
      frameworkRegistrationKind,
      admission.sourceAddressHandle ?? container.sourceAddressHandle,
      [],
    );
    return operation;
  }

  private recordsForRegistrationOperation(
    container: Container,
    admission: RegistrationAdmissionProduct,
    registrationValue: DiRegistrationValueProduct | null,
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
        handles.containerProducesOperationClaimHandle,
        container.productHandle,
        KernelVocabulary.Di.ProducesProduct.key,
        operation.productHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        handles.operationAppliesAdmissionClaimHandle,
        operation.productHandle,
        KernelVocabulary.Di.AppliesRegistration.key,
        admission.productHandle,
        provenanceHandle,
      ),
      ...(registrationValue == null
        ? []
        : [new SemanticClaim(
            handles.operationUsesRegistrationValueClaimHandle,
            operation.productHandle,
            KernelVocabulary.Di.UsesRegistrationValue.key,
            registrationValue.productHandle,
            provenanceHandle,
          )]),
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
        operation.product.productHandle,
        KernelVocabulary.Di.ContainerRegistration.key,
        operation.product.identityHandle,
        operation.product.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:operation`),
        operation.product.identityHandle,
        [operation.product.productHandle],
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

  private recordsForOperationAdmissionClaims(
    local: string,
    operationProductHandle: ProductHandle,
    admissions: readonly RegistrationAdmissionProduct[],
    provenanceHandle: ProvenanceHandle,
  ): DiClaimEmission {
    const handles: ClaimHandle[] = [];
    const records = admissions.map((admission, index) => {
      const handle = this.store.handles.claim(`${local}:${index}`);
      handles.push(handle);
      return new SemanticClaim(
        handle,
        operationProductHandle,
        KernelVocabulary.Di.AdmitsRegistration.key,
        admission.productHandle,
        provenanceHandle,
      );
    });
    return new DiClaimEmission(records, handles);
  }

  private recordsForResourceAdmission(
    container: Container,
    admission: ResourceRegistrationAdmission,
    resourceDefinitions: ResourceDefinitionIndex | null,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResourceSlotEmission {
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

    return this.spendOrderedResourceKeys(
      container,
      definition.type,
      resourceLookupNames(definition, admission.resourceLookupNameOverride),
      definition.productHandle,
      admission.sourceAddressHandle,
      local,
      (name, index) => this.resourceSlotPublication.recordsForResourceDefinitionSlot(
        container,
        definition,
        name,
        admission.sourceAddressHandle,
        `${local}:${index}`,
        provenanceHandle,
        projectKey,
      ),
      'Resource registration did not produce any runtime resource-key rows.',
    );
  }

  private recordsForConfiguredResourceSlots(
    container: Container,
    operation: ContainerRegistrationOperation,
    frameworkKind: FrameworkRegistrationKind,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiResourceSlotEmission {
    const admission = operation.admission;
    const selection = configuredResources.selections.find((candidate) =>
      candidate.registrationAdmissionProductHandle === admission.productHandle
      && candidate.frameworkKind === frameworkKind
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

    const emissions = resourceEmissions.map((emission, resourceIndex) => {
      const resource = emission.resource;
      return this.spendOrderedResourceKeys(
        container,
        resource.resourceKind,
        [resource.name, ...resource.aliases],
        resource.productHandle,
        operation.sourceAddressHandle,
        `${local}:${resourceIndex}`,
        (name, nameIndex) => this.resourceSlotPublication.recordsForBuiltInResourceSlot(
          container,
          resource,
          name,
          admission.sourceAddressHandle,
          `${local}:${resourceIndex}:${nameIndex}`,
          provenanceHandle,
          projectKey,
        ),
      );
    });

    return new DiResourceSlotEmission(
      emissions.flatMap((emission) => emission.records),
      emissions.flatMap((emission) => emission.slots),
      emissions.flatMap((emission) => emission.claimHandles),
      emissions.flatMap((emission) => emission.openSeams),
      emissions.flatMap((emission) => emission.issues),
      emissions.flatMap((emission) => emission.resourceIssues),
      emissions.flatMap((emission) => emission.exclusions),
    );
  }

  /**
   * Spend one runtime-shaped ResourceDefinition.register operation in primary/alias order.
   * Custom elements, converters, behaviors, and commands stop after primary collision. Custom attributes and
   * template controllers additionally occupy otherwise-free alias resolver keys, but those poisoned aliases have no
   * effective resource target and therefore remain blocked instead of becoming invented slots.
   */
  private spendOrderedResourceKeys(
    container: Container,
    kind: ResourceDefinitionKind,
    names: readonly string[],
    resourceProductHandle: ProductHandle | null,
    registrationSourceAddressHandle: AddressHandle | null,
    local: string,
    publish: (name: string, index: number) => ResourceSlotPublicationResult | null,
    emptyEmissionSummary: string | null = null,
  ): DiResourceSlotEmission {
    const records: KernelStoreRecord[] = [];
    const slots: ContainerResourceSlot[] = [];
    const claimHandles: ClaimHandle[] = [];
    const openSeams: OpenSeam[] = [];
    const issues: DiIssue[] = [];
    const resourceIssues: ResourceIssue[] = [];
    const exclusions: DiResourceSlotExclusion[] = [];

    for (const [index, name] of names.entries()) {
      const resourceKey = runtimeResourceKeyForKind(kind, name);
      const occupied = resourceKey == null
        ? null
        : container.readResourceSlots().find((candidate) => candidate.resourceKey === resourceKey) ?? null;
      const blocked = resourceKey != null && occupied == null && container.hasBlockedResource(resourceKey);
      if (blocked) {
        const seam = recordsForDiOpenSeam(
          this.store,
          `${local}:${index}:blocked-resource-key`,
          KernelVocabulary.Di.OpenRegistrationSpending.key,
          `Resource key ${resourceKey} is occupied by a registration whose effective resource target is unavailable.`,
          registrationSourceAddressHandle,
          [OpenSeamReasonKind.DiResourceSlotOpen],
        );
        records.push(...seam.records);
        openSeams.push(seam.seam);
        if (isAttributeRegistrationKind(kind)) {
          if (index === 0) {
            this.blockUnownedResourceAliases(container, kind, names.slice(1));
            break;
          }
          continue;
        }
        // A poisoned alias still consumes that resolver key, but a spread registration continues to later aliases.
        // Only a poisoned primary prevents non-attribute resources from reaching their alias registrations.
        if (index === 0) break;
        continue;
      }
      if (
        index > 0
        && occupied?.resourceProductHandle != null
        && occupied.resourceProductHandle === resourceProductHandle
      ) {
        continue;
      }
      const publication = publish(name, index);
      if (publication == null) {
        continue;
      }
      records.push(...publication.records);
      claimHandles.push(...publication.claimHandles);
      issues.push(...publication.issues);
      resourceIssues.push(...publication.resourceIssues);
      exclusions.push(...publication.exclusions);
      if (publication.slot != null) {
        slots.push(publication.slot);
        // Accepted rows become visible immediately so later aliases observe the same ordered registration call.
        container.registerResource(publication.slot);
      } else if (index === 0) {
        if (isAttributeRegistrationKind(kind)) {
          this.blockUnownedResourceAliases(container, kind, names.slice(1));
        }
        break;
      }
    }

    if (
      emptyEmissionSummary != null
      && slots.length === 0
      && openSeams.length === 0
      && issues.length === 0
      && resourceIssues.length === 0
    ) {
      const seam = recordsForDiOpenSeam(
        this.store,
        `${local}:no-resource-key`,
        KernelVocabulary.Di.OpenRegistrationSpending.key,
        emptyEmissionSummary,
        registrationSourceAddressHandle,
        [OpenSeamReasonKind.DiResourceSlotOpen],
      );
      records.push(...seam.records);
      openSeams.push(seam.seam);
    }

    return new DiResourceSlotEmission(records, slots, claimHandles, openSeams, issues, resourceIssues, exclusions);
  }

  private blockUnownedResourceAliases(
    container: Container,
    kind: ResourceDefinitionKind,
    aliasNames: readonly string[],
  ): void {
    for (const aliasName of aliasNames) {
      const aliasKey = runtimeResourceKeyForKind(kind, aliasName);
      if (
        aliasKey != null
        && !container.readResourceSlots().some((candidate) => candidate.resourceKey === aliasKey)
      ) {
        container.blockResourceKey(aliasKey);
      }
    }
  }

  private recordsForFrameworkRegistrationEffects(
    container: Container,
    operation: ContainerRegistrationOperation,
    typeSystem: TypeSystemProject,
    configuredResources: ConfiguredBuiltInResourceCatalogEmission,
    projectKey: string | null,
    local: string,
    provenanceHandle: ProvenanceHandle,
  ): DiFrameworkRegistrationEffectEmission {
    const admission = operation.admission;
    const frameworkKind = frameworkRegistrationKindForOperation(operation);
    if (frameworkKind == null) {
      return new DiFrameworkRegistrationEffectEmission([], [], [], [], [], []);
    }

    const frameworkEffects = frameworkDiRegistrationEffectsForKind(frameworkKind);
    const resourceEmission = this.recordsForConfiguredResourceSlots(
      container,
      operation,
      frameworkKind,
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
          frameworkKind,
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
      resourceEmission.exclusions,
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

function isAttributeRegistrationKind(kind: ResourceDefinitionKind): boolean {
  return kind === ResourceDefinitionKind.CustomAttribute
    || kind === ResourceDefinitionKind.TemplateController;
}

function summaryForUnmaterializedRegistrationAdmission(
  admission:
    | OpenRegistrationAdmission
    | ResolverRegistrationAdmission
    | ParameterizedRegistryAdmission
    | RegistryRegistrationAdmission,
): string {
  if (admission instanceof ResolverRegistrationAdmission) {
    return 'Resolver registration reached DI spending without one closed key and concrete runtime strategy.';
  }
  if (admission instanceof ParameterizedRegistryAdmission) {
    return 'Parameterized registry reached DI spending without one closed registry lookup key.';
  }
  if (admission instanceof RegistryRegistrationAdmission) {
    return 'Registry registration reached DI spending without a materialized IRegistry-shaped runtime value.';
  }
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

function reasonKindsForUnmaterializedRegistrationAdmission(
  admission:
    | OpenRegistrationAdmission
    | ResolverRegistrationAdmission
    | ParameterizedRegistryAdmission
    | RegistryRegistrationAdmission,
): readonly OpenSeamReasonKind[] {
  if (
    admission instanceof ResolverRegistrationAdmission
    || admission instanceof ParameterizedRegistryAdmission
  ) {
    return [OpenSeamReasonKind.DiRegistrationKeyOpen];
  }
  if (admission instanceof RegistryRegistrationAdmission) {
    return [OpenSeamReasonKind.DiRegistrationPublicationOpen];
  }
  return [OpenSeamReasonKind.DiRegistrationAdmissionOpen];
}

function frameworkDiEffectsCloseRegistryBody(operation: ContainerRegistrationOperation): boolean {
  const registrationValue = operation.registrationValue;
  if (
    registrationValue instanceof RegistryValue
    && registrationValue.registryValue?.registryBody?.state === RegistryBodyInterpretationState.Interpreted
  ) {
    return true;
  }
  const frameworkKind = frameworkRegistrationKindForOperation(operation);
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
    resourceSlotExclusions: [],
    registeredAppTasks: [],
    openSeams: [],
    registrationOpenSeamScopes: [],
    issues: [],
    resourceIssues: [],
    evaluationMutationCount: 0,
    abruptCompletion: null,
    completion: DiRegistrationCascadeCompletion.Completed,
  };
}

function appTaskForRegistrationOperation(
  operation: ContainerRegistrationOperation,
  appTasksByProduct: ReadonlyMap<ProductHandle, AppTaskDefinition>,
): AppTaskDefinition | null {
  if (frameworkRegistrationKindForOperation(operation) !== FrameworkRegistrationKind.AppTask) {
    return null;
  }
  const productHandle = operation.registrationValue instanceof RegistryValue
    ? operation.registrationValue.registryValue?.productHandle ?? null
    : null;
  return productHandle == null ? null : appTasksByProduct.get(productHandle) ?? null;
}
