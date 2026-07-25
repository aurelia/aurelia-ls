import ts from 'typescript';
import {
  readStaticStringValue,
} from '../evaluation/expression-reader.js';
import {
  ModuleLoader,
  ModuleLoaderTransformStatus,
  type ModuleItem,
} from '../evaluation/module-loader.js';
import {
  EvaluationObjectPropertyState,
  EvaluationValueKind,
  type EvaluationObjectProperty,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
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
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  compactFieldProvenance,
  fieldProvenanceWhenDistinct,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  RegistrationEmissionContext,
  RegistrationEmissionScope,
  RegistrationKernelEmission,
  RegistrationKernelEmitter,
} from '../registration/registration-kernel-emitter.js';
import { DiKeyExpressionIdentityRequest } from '../di/di-key-identity-emitter.js';
import { Container } from '../di/container.js';
import {
  ContainerDefaultResolverPolicy,
  type ContainerConfigurationField,
  type ContainerConfigurationRequest,
} from '../di/container-configuration.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerRootMaterializationRequest,
  ContainerRootMaterializer,
} from '../di/container-materializer.js';
import {
  RegistrationAdmissionObservation,
  RegistrationCarrierKind,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from '../registration/registration-observation.js';
import {
  RegistrationAdmissionKind,
  RegistrationKeyRole,
  RegistrationStrategy,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  FrameworkRegistrationKind,
  RegistrationKeyReference,
  RegistryBodyInterpretationState,
  RegistryBodyKind,
  RegistrationValueKind,
} from '../registration/registration-reference.js';
import {
  AppTaskDefinition,
  ConfigurationCallbackReference,
  type AppTaskField,
} from './app-task.js';
import {
  AureliaApplicationDraft,
  AureliaApplicationMaterializer,
} from './aurelia-application-materializer.js';
import type { AppRoot } from './app-root.js';
import type { Aurelia } from './aurelia.js';
import {
  ArrayConfigurationOptionValue,
  BooleanConfigurationOptionValue,
  CallbackConfigurationOptionValue,
  ConfigurationOptionContribution,
  type ConfigurationOptionField,
  ConfigurationOptionValueKind,
  IdentityConfigurationOptionValue,
  NullConfigurationOptionValue,
  NumberConfigurationOptionValue,
  ObjectConfigurationOptionValue,
  StringArrayConfigurationOptionValue,
  StringConfigurationOptionValue,
  UndefinedConfigurationOptionValue,
  UnknownConfigurationOptionValue,
} from './configuration-option.js';
import {
  AppTaskObservation,
  ConfigurationCallbackObservation,
  ConfigurationOptionContributionObservation,
  ConfigurationOptionValueObservation,
  ConfigurationSequenceObservation,
  ConfigurationStepObservation,
} from './configuration-observation.js';
import {
  aureliaContainerDefaultResolverPolicyForValue,
  type AureliaContainerEvaluation,
} from './aurelia-evaluation-runtime.js';
import { ConfigurationEvaluationBindingFrame } from './configuration-evaluation-bindings.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import {
  ConfigurationKernelPublication,
  ConfigurationProductHandles,
  ConfigurationSourceRecordSet,
} from './configuration-publication.js';
import {
  ConfigurationSequenceReference,
  ConfigurationStep,
  ConfigurationStepKind,
  ConfigurationStepReference,
} from './configuration-sequence.js';

class AppTaskEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly task: AppTaskDefinition,
    readonly sourceNode: ts.CallExpression,
    readonly openSeamHandles: readonly OpenSeamHandle[],
  ) {}
}

class RegistrationKeyEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly reference: RegistrationKeyReference,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class AppTaskEmissionSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly emissions: readonly AppTaskEmission[],
  ) {}
}

class OptionContributionEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly contribution: ConfigurationOptionContribution,
    readonly openSeamHandles: readonly OpenSeamHandle[],
  ) {}
}

class OptionContributionEmissionSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly emissions: readonly OptionContributionEmission[],
  ) {}
}

class ConfigurationOptionValueEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly value: ConfigurationOptionContribution['value'],
    readonly provenanceHandle: ProvenanceHandle | null,
  ) {}
}

class ContainerConfigurationEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly configuration: ContainerConfigurationRequest | null,
  ) {}
}

class ConfigurationStepTarget {
  constructor(
    readonly identityHandle: IdentityHandle,
    readonly productHandle: ProductHandle,
  ) {}
}

interface ConfigurationCallbackEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly reference: ConfigurationCallbackReference;
  readonly provenanceHandle: ProvenanceHandle;
}

export class ConfigurationStepEmissionSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly steps: readonly ConfigurationStep[],
    readonly appTasks: readonly AppTaskDefinition[],
    readonly optionContributions: readonly ConfigurationOptionContribution[],
    readonly registrationAdmissions: readonly RegistrationAdmissionProduct[],
    readonly containers: readonly Container[],
    readonly aurelias: readonly Aurelia[],
    readonly appRoots: readonly AppRoot[],
    readonly sequenceAurelia: Aurelia | null,
    readonly sequenceAppRoot: AppRoot | null,
  ) {}
}

export class ConfigurationStepReferenceSeed {
  constructor(
    readonly identityHandle: IdentityHandle,
    readonly productHandle: ProductHandle,
    readonly addressHandle: AddressHandle,
    readonly ordinal: number,
  ) {}

  toReference(): ConfigurationStepReference {
    return new ConfigurationStepReference(
      this.identityHandle,
      this.productHandle,
      this.addressHandle,
      this.ordinal,
    );
  }
}

export class ConfigurationStepMaterializer {
  private readonly registrationEmitter: RegistrationKernelEmitter;
  private readonly rootContainers: ContainerRootMaterializer;
  private readonly childContainers: ContainerChildMaterializer;
  private readonly applications: AureliaApplicationMaterializer;

  constructor(
    private readonly store: KernelStore,
    private readonly publication: ConfigurationKernelPublication,
    kernelPublication: KernelPublicationContext,
    private readonly evaluationBindings: ConfigurationEvaluationBindingFrame,
  ) {
    this.registrationEmitter = new RegistrationKernelEmitter(store, kernelPublication);
    this.rootContainers = new ContainerRootMaterializer(store, kernelPublication);
    this.childContainers = new ContainerChildMaterializer(store, kernelPublication);
    this.applications = new AureliaApplicationMaterializer(
      store,
      this.publication,
      kernelPublication,
      evaluationBindings,
    );
  }

  recordsForSequenceSteps(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    sequenceLocal: string,
    stepReferences: readonly ConfigurationStepReferenceSeed[],
    resources: ResourceDefinitionIndex | null,
  ): ConfigurationStepEmissionSet {
    const records: KernelStoreRecord[] = [];
    const steps: ConfigurationStep[] = [];
    const appTasks: AppTaskDefinition[] = [];
    const optionContributions: ConfigurationOptionContribution[] = [];
    const registrationAdmissions: RegistrationAdmissionProduct[] = [];
    const containers: Container[] = [];
    const aurelias: Aurelia[] = [];
    const appRoots: AppRoot[] = [];
    let sequenceAurelia: Aurelia | null = null;
    let sequenceAppRoot: AppRoot | null = null;
    observation.steps.forEach((stepObservation, stepIndex) => {
      const evaluatedReceiver = stepObservation.containerEvaluation == null
        ? null
        : this.evaluationBindings.containerForEvaluation(stepObservation.containerEvaluation);
      const stepEmission = this.recordsForStep(
        context,
        observation,
        stepObservation,
        sequenceLocal,
        stepIndex,
        stepReferences[stepIndex]!,
        evaluatedReceiver,
        resources,
      );
      records.push(...stepEmission.records);
      steps.push(stepEmission.step);
      appTasks.push(...stepEmission.appTasks);
      optionContributions.push(...stepEmission.optionContributions);
      registrationAdmissions.push(...stepEmission.registrationAdmissions);
      for (const [productHandle, value] of stepEmission.registrationValuesByAdmissionProduct) {
        this.evaluationBindings.bindRegistrationValue(productHandle, value);
      }
      containers.push(...stepEmission.createdContainers);
      if (stepEmission.authoredContainer != null) {
        if (stepObservation.containerEvaluation != null) {
          this.evaluationBindings.bindContainer(stepObservation.containerEvaluation, stepEmission.authoredContainer);
        }
      }
      if (stepEmission.application != null) {
        sequenceAurelia = stepEmission.application.aurelia;
        sequenceAppRoot = stepEmission.application.appRoot ?? sequenceAppRoot;
        if (stepEmission.application.createdAurelia) {
          aurelias.push(stepEmission.application.aurelia);
        }
        if (stepEmission.application.appRoot != null) {
          appRoots.push(stepEmission.application.appRoot);
        }
      }
    });
    return new ConfigurationStepEmissionSet(
      records,
      steps,
      appTasks,
      optionContributions,
      registrationAdmissions,
      containers,
      aurelias,
      appRoots,
      sequenceAurelia,
      sequenceAppRoot,
    );
  }

  private recordsForStep(
    context: ConfigurationRecognitionContext,
    sequenceObservation: ConfigurationSequenceObservation,
    observation: ConfigurationStepObservation,
    sequenceLocal: string,
    index: number,
    referenceSeed: ConfigurationStepReferenceSeed,
    receiverContainer: Container | null,
    resources: ResourceDefinitionIndex | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly step: ConfigurationStep;
    readonly appTasks: readonly AppTaskDefinition[];
    readonly optionContributions: readonly ConfigurationOptionContribution[];
    readonly registrationAdmissions: readonly RegistrationAdmissionProduct[];
    readonly registrationValuesByAdmissionProduct: ReadonlyMap<ProductHandle, EvaluationValue>;
    readonly authoredContainer: Container | null;
    readonly createdContainers: readonly Container[];
    readonly application: AureliaApplicationDraft | null;
  } {
    const records: KernelStoreRecord[] = [];
    const local = `${sequenceLocal}:${index}`;
    const source = this.publication.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-step:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      `${observation.carrierKind} produced a ${observation.stepKind} configuration step.`,
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const openSeams = this.publication.recordsForOpenSeams(context, observation.openSeams, `configuration-step:${local}`);
    records.push(...openSeams.records);

    const createsRootContainer = observation.stepKind === ConfigurationStepKind.CreateContainer;
    const createsChildContainer = observation.stepKind === ConfigurationStepKind.CreateChildContainer;
    const containerConfiguration = createsRootContainer || createsChildContainer
      ? this.recordsForContainerConfiguration(context, observation.containerEvaluation, local, source)
      : new ContainerConfigurationEmission([], null);
    records.push(...containerConfiguration.records);
    const containerRequest = createsRootContainer
      ? new ContainerRootMaterializationRequest(
        `configuration-step:${local}`,
        source.addressHandle,
        observation.receiverLocalName,
        containerConfiguration.configuration,
      )
      : null;
    let createdContainer = containerRequest == null
      ? null
      : this.rootContainers.create(containerRequest);
    let childContainerRequest: ContainerChildMaterializationRequest | null = null;
    let childParentContainer: Container | null = null;
    if (createsChildContainer) {
      const parentEvaluation = observation.containerEvaluation?.parent ?? null;
      const parent = parentEvaluation == null
        ? null
        : this.evaluationBindings.containerForEvaluation(parentEvaluation);
      if (parent == null) {
        throw new Error('A closed authored child-container evaluation must be emitted after its parent container.');
      }
      childContainerRequest = new ContainerChildMaterializationRequest({
        localKey: `configuration-step:${local}`,
        parent,
        sourceAddressHandle: source.addressHandle,
        localName: observation.receiverLocalName,
        configuration: containerConfiguration.configuration,
      });
      childParentContainer = parent;
      createdContainer = this.childContainers.create(childContainerRequest);
    }
    const application = this.applications.prepareStep(context, observation, local, source, resources);
    const appTaskProductHandles = this.appTaskProductHandles(observation, local);
    const optionProductHandles = this.optionProductHandles(observation, local);
    const producedProductHandles = [
      ...(createdContainer == null ? [] : [createdContainer.productHandle]),
      ...(application?.producedProductHandles ?? []),
      ...appTaskProductHandles,
      ...optionProductHandles,
    ];
    const target = configurationStepTarget(
      observation,
      application,
      receiverContainer,
      childParentContainer,
    );

    const stepClaims = this.publication.recordsForStepClaims(
      local,
      referenceSeed.productHandle,
      target?.productHandle ?? null,
      producedProductHandles,
      source.provenanceHandle,
    );
    records.push(...stepClaims.records);

    if (containerRequest != null && createdContainer != null) {
      records.push(...this.rootContainers.recordsFor(
        containerRequest,
        createdContainer,
        source.provenanceHandle,
        [stepClaims.producerClaimHandleFor(createdContainer.productHandle)],
      ));
    }
    if (childContainerRequest != null && createdContainer != null) {
      records.push(...this.childContainers.recordsFor(
        childContainerRequest,
        createdContainer,
        [stepClaims.producerClaimHandleFor(createdContainer.productHandle)],
      ).records);
    }
    if (application != null) {
      records.push(
        ...application.records,
        ...this.applications.recordsForProducts(application, stepClaims.producerClaimHandlesByProduct),
      );
    }

    const appTasks = this.recordsForStepAppTasks(context, observation, local, stepClaims.producerClaimHandlesByProduct);
    records.push(...appTasks.records);
    const options = this.recordsForStepOptions(
      context,
      observation,
      local,
      source,
      stepClaims.producerClaimHandlesByProduct,
    );
    records.push(...options.records);

    const registrationEmission = this.emitStepRegistrations(
      context,
      observation,
      appTasks.emissions,
      local,
      resources,
    );
    records.push(...registrationEmission.records);
    const registrationProductHandles = registrationEmission.admissions.map((admission) => admission.productHandle);
    const registrationClaims = this.publication.recordsForStepRegistrationClaims(
      local,
      referenceSeed.productHandle,
      registrationProductHandles,
      source.provenanceHandle,
    );
    records.push(...registrationClaims.records);

    const sequenceReference = configurationSequenceReferenceFor(
      this.store,
      sequenceLocal,
      sequenceObservation,
    );
    const step = this.configurationStepFor(
      observation,
      referenceSeed,
      sequenceReference,
      index,
      target,
      appTasks.emissions,
      producedProductHandles,
      registrationProductHandles,
      source,
    );
    records.push(...this.recordsForConfigurationStepProduct(
      local,
      observation,
      sequenceReference,
      referenceSeed,
      source,
      [...stepClaims.handles, ...registrationClaims.handles],
      openSeams.handles,
    ));

    return {
      records,
      step,
      appTasks: appTasks.emissions.map((emission) => emission.task),
      optionContributions: options.emissions.map((emission) => emission.contribution),
      registrationAdmissions: registrationEmission.admissions,
      registrationValuesByAdmissionProduct: registrationEmission.evaluatedValuesByAdmissionProduct,
      authoredContainer: createdContainer,
      createdContainers: [
        ...(createdContainer == null ? [] : [createdContainer]),
        ...(application?.createdContainer == null ? [] : [application.createdContainer]),
      ],
      application,
    };
  }

  private recordsForContainerConfiguration(
    context: ConfigurationRecognitionContext,
    evaluation: AureliaContainerEvaluation | null,
    local: string,
    ownerSource: ConfigurationSourceRecordSet,
  ): ContainerConfigurationEmission {
    const expression = evaluation?.configurationExpression ?? null;
    if (expression == null) {
      return new ContainerConfigurationEmission([], null);
    }
    const source = this.publication.recordsForSource(
      context,
      expression,
      `configuration-container:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'Source-created container configuration.',
      SourceSpanRole.Value,
    );
    const value = context.expressionReader.evaluateExpression(expression).value;
    const object = value?.kind === EvaluationValueKind.Object ? value : null;
    const inheritParentResources = object?.properties.get('inheritParentResources') ?? null;
    const defaultResolver = object?.properties.get('defaultResolver') ?? null;
    const inheritParentResourcesSource = this.recordsForContainerConfigurationField(
      context,
      inheritParentResources,
      `configuration-container:${local}:inherit-parent-resources`,
      'Container inheritParentResources configuration value.',
    );
    const defaultResolverSource = this.recordsForContainerConfigurationField(
      context,
      defaultResolver,
      `configuration-container:${local}:default-resolver`,
      'Container defaultResolver configuration value.',
    );
    const records = [
      ...source.records,
      ...(inheritParentResourcesSource?.records ?? []),
      ...(defaultResolverSource?.records ?? []),
    ];
    return new ContainerConfigurationEmission(records, {
      inheritParentResources: containerConfigurationBooleanValue(object, inheritParentResources),
      defaultResolverPolicy: containerDefaultResolverPolicy(object, defaultResolver, value),
      sourceAddressHandle: source.addressHandle,
      fieldProvenance: compactFieldProvenance<ContainerConfigurationField>([
        fieldProvenanceWhenDistinct(
          'inheritParentResources',
          inheritParentResourcesSource?.provenanceHandle,
          ownerSource.provenanceHandle,
        ),
        fieldProvenanceWhenDistinct(
          'defaultResolverPolicy',
          defaultResolverSource?.provenanceHandle,
          ownerSource.provenanceHandle,
        ),
        fieldProvenanceWhenDistinct('source', source.provenanceHandle, ownerSource.provenanceHandle),
      ]),
    });
  }

  private recordsForContainerConfigurationField(
    context: ConfigurationRecognitionContext,
    property: EvaluationObjectProperty | null,
    local: string,
    summary: string,
  ): ConfigurationSourceRecordSet | null {
    const node = property?.node == null ? null : objectPropertyValueNode(property.node);
    return node == null
      ? null
      : this.publication.recordsForSource(
          context,
          node,
          local,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Configuration],
          summary,
          SourceSpanRole.Value,
        );
  }

  private appTaskProductHandles(
    observation: ConfigurationStepObservation,
    local: string,
  ): readonly ProductHandle[] {
    return observation.appTasks.map((_, appTaskIndex) =>
      this.publication.configurationProductHandles(
        `configuration-app-task:${local}:app-task:${appTaskIndex}`,
      ).productHandle
    );
  }

  private optionProductHandles(
    observation: ConfigurationStepObservation,
    local: string,
  ): readonly ProductHandle[] {
    return observation.optionContributions.map((_, optionIndex) =>
      this.publication.configurationProductHandles(
        `configuration-option:${local}:option:${optionIndex}`,
      ).productHandle
    );
  }

  private recordsForStepAppTasks(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationStepObservation,
    local: string,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): AppTaskEmissionSet {
    const emissions = observation.appTasks.map((appTask, appTaskIndex) =>
      this.recordsForAppTask(
        context,
        appTask,
        `${local}:app-task:${appTaskIndex}`,
        producerClaimHandlesByProduct,
      )
    );
    return new AppTaskEmissionSet(
      emissions.flatMap((emission) => emission.records),
      emissions,
    );
  }

  private recordsForStepOptions(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationStepObservation,
    local: string,
    configurationValueSource: ConfigurationSourceRecordSet,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): OptionContributionEmissionSet {
    const emissions = observation.optionContributions.map((contribution, optionIndex) =>
      this.recordsForOptionContribution(
        context,
        contribution,
        `${local}:option:${optionIndex}`,
        configurationValueSource,
        producerClaimHandlesByProduct,
      )
    );
    return new OptionContributionEmissionSet(
      emissions.flatMap((emission) => emission.records),
      emissions,
    );
  }

  private configurationStepFor(
    observation: ConfigurationStepObservation,
    referenceSeed: ConfigurationStepReferenceSeed,
    sequenceReference: ConfigurationSequenceReference,
    index: number,
    target: ConfigurationStepTarget | null,
    appTaskEmissions: readonly AppTaskEmission[],
    producedProductHandles: readonly ProductHandle[],
    registrationProductHandles: readonly ProductHandle[],
    source: ConfigurationSourceRecordSet,
  ): ConfigurationStep {
    return new ConfigurationStep(
      referenceSeed.productHandle,
      referenceSeed.identityHandle,
      observation.stepKind,
      sequenceReference,
      index,
      target?.identityHandle ?? null,
      target?.productHandle ?? null,
      producedProductHandles,
      registrationProductHandles,
      appTaskEmissions.map((emission) => emission.task.toReference()),
      source.addressHandle,
      [],
    );
  }

  private recordsForConfigurationStepProduct(
    local: string,
    observation: ConfigurationStepObservation,
    sequenceReference: ConfigurationSequenceReference,
    referenceSeed: ConfigurationStepReferenceSeed,
    source: ConfigurationSourceRecordSet,
    claimHandles: readonly ClaimHandle[],
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-step:${local}`,
      productHandle: referenceSeed.productHandle,
      identityHandle: referenceSeed.identityHandle,
      productKindKey: KernelVocabulary.Configuration.Step.key,
      ownerHandle: sequenceReference.identityHandle,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: observation.receiverLocalName,
      claimHandles,
      openSeamHandles,
    });
  }

  private recordsForAppTask(
    context: ConfigurationRecognitionContext,
    observation: AppTaskObservation,
    local: string,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): AppTaskEmission {
    const source = this.publication.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-app-task:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration, EvidenceRole.Registration],
      `AppTask.${observation.slot}(...) factory produced a deferred lifecycle task.`,
      SourceSpanRole.Range,
    );
    const key = observation.keyExpression == null
      ? null
      : this.recordsForRegistrationKey(context, observation.keyExpression, `configuration-app-task:${local}:key`);
    const callback = observation.callback == null
      ? null
      : this.recordsForCallback(context, observation.callback, `configuration-app-task:${local}:callback`);
    const openSeams = this.publication.recordsForOpenSeams(context, observation.openSeams, `configuration-app-task:${local}`);

    const handles = this.publication.configurationProductHandles(`configuration-app-task:${local}`);
    const task = this.appTaskForObservation(observation, source, handles, key, callback);
    return new AppTaskEmission(
      [
        ...source.records,
        ...(key == null ? [] : key.records),
        ...(callback == null ? [] : callback.records),
        ...openSeams.records,
        ...this.recordsForAppTaskProduct(
          local,
          observation,
          source,
          handles,
          producerClaimHandlesByProduct,
          openSeams.handles,
        ),
      ],
      task,
      observation.sourceNode,
      openSeams.handles,
    );
  }

  private appTaskForObservation(
    observation: AppTaskObservation,
    source: ConfigurationSourceRecordSet,
    handles: ConfigurationProductHandles,
    key: RegistrationKeyEmission | null,
    callback: ConfigurationCallbackEmission | null,
  ): AppTaskDefinition {
    return new AppTaskDefinition(
      handles.productHandle,
      handles.identityHandle,
      observation.slot,
      observation.callbackKind,
      key?.reference ?? null,
      callback?.reference ?? null,
      source.addressHandle,
      compactFieldProvenance<AppTaskField>([
        fieldProvenanceWhenDistinct('key', key?.provenanceHandle, source.provenanceHandle),
        fieldProvenanceWhenDistinct('callback', callback?.provenanceHandle, source.provenanceHandle),
      ]),
    );
  }

  private recordsForAppTaskProduct(
    local: string,
    observation: AppTaskObservation,
    source: ConfigurationSourceRecordSet,
    handles: ConfigurationProductHandles,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-app-task:${local}`,
      productHandle: handles.productHandle,
      identityHandle: handles.identityHandle,
      productKindKey: KernelVocabulary.Configuration.AppTask.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: `AppTask.${observation.slot}`,
      claimHandles: [producerClaimHandle(producerClaimHandlesByProduct, handles.productHandle)],
      openSeamHandles,
    });
  }

  private recordsForOptionContribution(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionContributionObservation,
    local: string,
    configurationValueSource: ConfigurationSourceRecordSet,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
  ): OptionContributionEmission {
    const source = this.optionContributionSource(context, observation, local);
    const value = this.recordsForOptionValue(context, observation.value, local);
    const openSeams = this.publication.recordsForOpenSeams(context, observation.openSeams, `configuration-option:${local}`);
    const handles = this.publication.configurationProductHandles(`configuration-option:${local}`);
    const contribution = this.optionContributionForObservation(
      observation,
      source,
      configurationValueSource,
      handles,
      value,
    );
    return new OptionContributionEmission(
      [
        ...source.records,
        ...value.records,
        ...openSeams.records,
        ...this.recordsForOptionContributionProduct(
          local,
          observation,
          source,
          handles,
          producerClaimHandlesByProduct,
          openSeams.handles,
        ),
      ],
      contribution,
      openSeams.handles,
    );
  }

  private optionContributionSource(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionContributionObservation,
    local: string,
  ): ConfigurationSourceRecordSet {
    return this.publication.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-option:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      `Configuration option contribution for ${observation.optionPath.join('.') || '(root)'}.`,
      SourceSpanRole.Range,
    );
  }

  private optionContributionForObservation(
    observation: ConfigurationOptionContributionObservation,
    source: ConfigurationSourceRecordSet,
    configurationValueSource: ConfigurationSourceRecordSet,
    handles: ConfigurationProductHandles,
    value: ConfigurationOptionValueEmission,
  ): ConfigurationOptionContribution {
    return new ConfigurationOptionContribution(
      handles.productHandle,
      handles.identityHandle,
      observation.contributionKind,
      observation.configurationKind,
      configurationValueSource.addressHandle,
      observation.optionPath,
      value.value,
      source.addressHandle,
      compactFieldProvenance<ConfigurationOptionField>([
        fieldProvenanceWhenDistinct(
          'configurationValue',
          configurationValueSource.provenanceHandle,
          source.provenanceHandle,
        ),
        fieldProvenanceWhenDistinct('value', value.provenanceHandle, source.provenanceHandle),
      ]),
    );
  }

  private recordsForOptionContributionProduct(
    local: string,
    observation: ConfigurationOptionContributionObservation,
    source: ConfigurationSourceRecordSet,
    handles: ConfigurationProductHandles,
    producerClaimHandlesByProduct: ReadonlyMap<ProductHandle, ClaimHandle>,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-option:${local}`,
      productHandle: handles.productHandle,
      identityHandle: handles.identityHandle,
      productKindKey: KernelVocabulary.Configuration.OptionContribution.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: observation.optionPath.join('.'),
      claimHandles: [producerClaimHandle(producerClaimHandlesByProduct, handles.productHandle)],
      openSeamHandles,
    });
  }

  private recordsForOptionValue(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionValueObservation,
    local: string,
  ): ConfigurationOptionValueEmission {
    const source = observation.node == null
      ? null
      : this.publication.recordsForSource(
        context,
        observation.node,
        `configuration-option-value:${local}`,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Configuration],
        `Configuration option value classified as ${observation.valueKind}.`,
        SourceSpanRole.Value,
      );
    const records = source == null ? [] : [...source.records];
    const addressHandle = source?.addressHandle ?? null;
    const value = this.configurationOptionValueForObservation(
      context,
      observation,
      local,
      addressHandle,
      records,
    );

    return new ConfigurationOptionValueEmission(
      records,
      value,
      source?.provenanceHandle ?? null,
    );
  }

  private configurationOptionValueForObservation(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionValueObservation,
    local: string,
    addressHandle: AddressHandle | null,
    records: KernelStoreRecord[],
  ): ConfigurationOptionContribution['value'] {
    switch (observation.valueKind) {
      case ConfigurationOptionValueKind.Boolean:
        return new BooleanConfigurationOptionValue(Boolean(observation.primitive), addressHandle);
      case ConfigurationOptionValueKind.String:
        return new StringConfigurationOptionValue(String(observation.primitive ?? ''), addressHandle);
      case ConfigurationOptionValueKind.StringArray:
        return new StringArrayConfigurationOptionValue(observation.stringValues, addressHandle);
      case ConfigurationOptionValueKind.Number:
        return new NumberConfigurationOptionValue(
          typeof observation.primitive === 'number' ? observation.primitive : Number.NaN,
          addressHandle,
        );
      case ConfigurationOptionValueKind.Null:
        return new NullConfigurationOptionValue(addressHandle);
      case ConfigurationOptionValueKind.Undefined:
        return new UndefinedConfigurationOptionValue(addressHandle);
      case ConfigurationOptionValueKind.Object:
        return new ObjectConfigurationOptionValue(null, addressHandle, observation.localName);
      case ConfigurationOptionValueKind.Array:
        return new ArrayConfigurationOptionValue(null, addressHandle, observation.localName);
      case ConfigurationOptionValueKind.Callback:
        return new CallbackConfigurationOptionValue(null, null, addressHandle, observation.localName);
      case ConfigurationOptionValueKind.Identity:
        return this.identityConfigurationOptionValue(context, observation, local, addressHandle, records);
      case ConfigurationOptionValueKind.Product:
      case ConfigurationOptionValueKind.Absent:
      case ConfigurationOptionValueKind.Unknown:
        return new UnknownConfigurationOptionValue(addressHandle, observation.localName);
    }
  }

  private identityConfigurationOptionValue(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionValueObservation,
    local: string,
    addressHandle: AddressHandle | null,
    records: KernelStoreRecord[],
  ): IdentityConfigurationOptionValue {
    const identityHandle = this.store.handles.identity(`configuration-option-value:${local}`);
    records.push(new TypeScriptDeclarationIdentity(
      identityHandle,
      context.moduleKey,
      null,
      observation.localName,
      addressHandle,
    ));
    return new IdentityConfigurationOptionValue(identityHandle, addressHandle, observation.localName);
  }

  private emitStepRegistrations(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationStepObservation,
    appTaskEmissions: readonly AppTaskEmission[],
    stepLocal: string,
    resources: ResourceDefinitionIndex | null,
  ): RegistrationKernelEmission {
    if (observation.registrationAdmissions.length === 0) {
      return new RegistrationKernelEmission([], [], new Map());
    }
    const enriched = observation.registrationAdmissions.map((admission) => {
      const appTaskEnriched = enrichAppTaskRegistration(admission, appTaskEmissions);
      return enrichResourceRegistration(appTaskEnriched, context, resources);
    }).flatMap((admission) => [
      admission,
      ...aliasedResourcesRegistryBodyRegistrations(admission, context, resources),
    ]);
    return this.registrationEmitter.materialize(
      new RegistrationEmissionContext(
        context.sourceFile,
        context.moduleKey,
        context.sourceFileAddressHandle,
        context.projectKey,
        context.typeSystem,
        RegistrationEmissionScope.ConfigurationStep,
        stepLocal,
      ),
      enriched,
    );
  }

  private recordsForRegistrationKey(
    context: ConfigurationRecognitionContext,
    expression: ts.Expression,
    local: string,
  ): RegistrationKeyEmission {
    const source = this.publication.recordsForSource(
      context,
      expression,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration, EvidenceRole.Registration],
      'AppTask DI key expression.',
      SourceSpanRole.Value,
    );
    const observation = context.registrationKeyObservation(expression);
    const records = [...source.records];
    const identity = this.registrationEmitter.materializeKeyIdentity(
      records,
      new DiKeyExpressionIdentityRequest(
        context.projectKey,
        expression,
        observation.localName,
        observation.evaluatedValue,
        observation.constructableSource,
        context.typeSystem,
        this.store.handles.identity(local),
        source.addressHandle,
      ),
    );
    return new RegistrationKeyEmission(
      records,
      new RegistrationKeyReference(
        identity.identityHandle,
        source.addressHandle,
        observation.localName,
        identity.keyKind,
      ),
      source.provenanceHandle,
    );
  }

  private recordsForCallback(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationCallbackObservation,
    local: string,
  ): ConfigurationCallbackEmission {
    const source = this.publication.recordsForSource(
      context,
      observation.node,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'Configuration callback expression.',
      SourceSpanRole.Value,
    );
    const identityHandle = this.callbackIdentityHandle(observation, local);
    return {
      records: [
        ...source.records,
        ...this.callbackIdentityRecords(context, observation, source, identityHandle),
      ],
      reference: new ConfigurationCallbackReference(identityHandle, null, source.addressHandle, observation.localName),
      provenanceHandle: source.provenanceHandle,
    };
  }

  private callbackIdentityHandle(
    observation: ConfigurationCallbackObservation,
    local: string,
  ): IdentityHandle | null {
    return observation.isDeclaration && observation.localName != null
      ? this.store.handles.identity(local)
      : null;
  }

  private callbackIdentityRecords(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationCallbackObservation,
    source: ConfigurationSourceRecordSet,
    identityHandle: IdentityHandle | null,
  ): readonly KernelStoreRecord[] {
    return identityHandle == null ? [] : [
      new TypeScriptDeclarationIdentity(
        identityHandle,
        context.moduleKey,
        null,
        observation.localName,
        source.addressHandle,
      ),
    ];
  }
}

function configurationSequenceReferenceFor(
  store: KernelStore,
  sequenceLocal: string,
  observation: ConfigurationSequenceObservation,
): ConfigurationSequenceReference {
  return new ConfigurationSequenceReference(
    store.handles.identity(`configuration-sequence:${sequenceLocal}`),
    store.handles.product(`configuration-sequence:${sequenceLocal}`),
    store.handles.address(`configuration-sequence:${sequenceLocal}:source`),
    observation.localName,
  );
}

function configurationStepTarget(
  observation: ConfigurationStepObservation,
  application: AureliaApplicationDraft | null,
  receiverContainer: Container | null,
  childParentContainer: Container | null,
): ConfigurationStepTarget | null {
  if (application != null) {
    return new ConfigurationStepTarget(
      application.targetIdentityHandle,
      application.targetProductHandle,
    );
  }
  switch (observation.stepKind) {
    case ConfigurationStepKind.ContainerRegister:
      return receiverContainer == null
        ? null
        : new ConfigurationStepTarget(receiverContainer.identityHandle, receiverContainer.productHandle);
    case ConfigurationStepKind.CreateChildContainer:
      return childParentContainer == null
        ? null
        : new ConfigurationStepTarget(childParentContainer.identityHandle, childParentContainer.productHandle);
    case ConfigurationStepKind.CreateContainer:
    case ConfigurationStepKind.CreateAurelia:
    case ConfigurationStepKind.AureliaApp:
    case ConfigurationStepKind.AureliaRegister:
    case ConfigurationStepKind.RegistryRegister:
    case ConfigurationStepKind.Customize:
    case ConfigurationStepKind.BuilderMutation:
    case ConfigurationStepKind.OptionContribution:
    case ConfigurationStepKind.PluginConfigure:
    case ConfigurationStepKind.Unknown:
      return null;
  }
}

function producerClaimHandle(
  handles: ReadonlyMap<ProductHandle, ClaimHandle>,
  productHandle: ProductHandle,
): ClaimHandle {
  const handle = handles.get(productHandle);
  if (handle == null) {
    throw new Error(`Configuration product ${productHandle} has no exact producer claim.`);
  }
  return handle;
}

function containerConfigurationBooleanValue(
  object: EvaluationObjectValue | null,
  property: EvaluationObjectProperty | null,
): boolean | null {
  if (object == null) {
    return null;
  }
  if (property == null) {
    return object.mayHaveUnknownProperties ? null : false;
  }
  return property.state === EvaluationObjectPropertyState.Closed
    && property.value.kind === EvaluationValueKind.Boolean
      ? property.value.value
      : null;
}

function containerDefaultResolverPolicy(
  object: EvaluationObjectValue | null,
  property: EvaluationObjectProperty | null,
  configurationValue: EvaluationValue | null,
): ContainerDefaultResolverPolicy {
  if (configurationValue == null || object == null) {
    return ContainerDefaultResolverPolicy.Open;
  }
  if (property == null) {
    return object.mayHaveUnknownProperties
      ? ContainerDefaultResolverPolicy.Open
      : ContainerDefaultResolverPolicy.Singleton;
  }
  if (property.state !== EvaluationObjectPropertyState.Closed) {
    return ContainerDefaultResolverPolicy.Open;
  }
  if (
    property.value.kind === EvaluationValueKind.Null
    || property.value.kind === EvaluationValueKind.Undefined
  ) {
    return ContainerDefaultResolverPolicy.Singleton;
  }
  const frameworkPolicy = aureliaContainerDefaultResolverPolicyForValue(property.value);
  if (frameworkPolicy != null) {
    return frameworkPolicy;
  }
  switch (property.value.kind) {
    case EvaluationValueKind.Function:
    case EvaluationValueKind.BoundaryValue:
      return ContainerDefaultResolverPolicy.Custom;
    default:
      return ContainerDefaultResolverPolicy.Open;
  }
}

function objectPropertyValueNode(node: ts.Node): ts.Node {
  return ts.isPropertyAssignment(node) ? node.initializer : node;
}

function aliasedResourcesRegistryBodyRegistrations(
  observation: RegistrationAdmissionObservation,
  context: ConfigurationRecognitionContext,
  resources: ResourceDefinitionIndex | null,
): readonly RegistrationAdmissionObservation[] {
  const body = observation.registeredValue?.registryBody ?? null;
  if (
    resources == null
    || body?.bodyKind !== RegistryBodyKind.AliasedResourcesRegistry
    || body.state !== RegistryBodyInterpretationState.Interpreted
    || observation.registeredValue == null
    || !ts.isCallExpression(observation.registeredValue.node)
  ) {
    return [];
  }

  const call = observation.registeredValue.node;
  const input = call.arguments[0] == null
    ? null
    : context.expressionReader.evaluateExpression(call.arguments[0]).value;
  if (input == null) {
    return [];
  }
  const moduleResult = new ModuleLoader().load(input);
  if (moduleResult.status !== ModuleLoaderTransformStatus.Analyzed || moduleResult.analyzedModule == null) {
    return [];
  }

  const mainAlias = readAliasedResourcesRegistryMainAlias(call, context);
  const aliases = readAliasedResourcesRegistryAliases(call, context);
  const registrations: RegistrationAdmissionObservation[] = [];
  let mainAliasRegistered = false;
  moduleResult.analyzedModule.items.forEach((item, itemIndex) => {
    const definition = resources.lookupValue(item.value);
    if (definition == null || definition.productHandle == null) {
      registrations.push(openAliasedResourcesRegistryModuleItem(observation, item, itemIndex));
      return;
    }
    const override = !mainAliasRegistered && mainAlias != null
      ? mainAlias
      : aliases.get(resourceDefinitionName(definition) ?? '') ?? null;
    if (!mainAliasRegistered && mainAlias != null) {
      mainAliasRegistered = true;
    }
    registrations.push(resourceAliasedResourcesRegistryModuleItem(
      observation,
      context,
      item,
      definition,
      override,
    ));
  });
  return registrations;
}

function resourceDefinitionName(definition: FullResourceDefinition): string | null {
  return 'name' in definition ? definition.name : null;
}

function readAliasedResourcesRegistryMainAlias(
  call: ts.CallExpression,
  context: ConfigurationRecognitionContext,
): string | null {
  const argument = call.arguments[1] ?? null;
  if (argument == null) {
    return null;
  }
  const read = context.expressionReader.evaluateExpression(argument).value;
  return read == null ? null : readStaticStringValue(read);
}

function readAliasedResourcesRegistryAliases(
  call: ts.CallExpression,
  context: ConfigurationRecognitionContext,
): ReadonlyMap<string, string> {
  const argument = call.arguments[2] ?? null;
  if (argument == null) {
    return new Map();
  }
  const read = context.expressionReader.evaluateExpression(argument).value;
  return read?.kind === EvaluationValueKind.Object
    ? readStaticStringRecord(read)
    : new Map();
}

function readStaticStringRecord(
  value: EvaluationObjectValue,
): ReadonlyMap<string, string> {
  if (value.mayHaveUnknownProperties) {
    return new Map();
  }
  const result = new Map<string, string>();
  for (const [name, property] of value.properties) {
    const stringValue = readStaticStringValue(property.value);
    if (stringValue != null) {
      result.set(name, stringValue);
    }
  }
  return result;
}

function resourceAliasedResourcesRegistryModuleItem(
  observation: RegistrationAdmissionObservation,
  context: ConfigurationRecognitionContext,
  item: ModuleItem,
  definition: FullResourceDefinition,
  lookupNameOverride: string | null,
): RegistrationAdmissionObservation {
  const valueSource = moduleItemValueSource(context, item);
  return new RegistrationAdmissionObservation(
    RegistrationCarrierKind.RegistryRegisterMethod,
    RegistrationAdmissionKind.RegistryMethod,
    RegistrationStrategy.Resource,
    RegistrationKeyRole.Unknown,
    observation.sourceNode,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.ResourceDefinition,
      definition.target.localName ?? item.key,
      valueSource.node,
      valueSource.isDeclaration,
      definition.productHandle,
      null,
      valueSource.sourceFileAddressHandle,
      valueSource.moduleKey,
    ),
    [],
    [],
    lookupNameOverride,
  );
}

function openAliasedResourcesRegistryModuleItem(
  observation: RegistrationAdmissionObservation,
  item: ModuleItem,
  index: number,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    RegistrationCarrierKind.RegistryRegisterMethod,
    RegistrationAdmissionKind.RegistryMethod,
    RegistrationStrategy.Unknown,
    RegistrationKeyRole.Unknown,
    observation.sourceNode,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.Unknown,
      item.key,
      item.sourceProperty?.node ?? observation.sourceNode,
      false,
    ),
    [],
    [new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenStrategy.key,
      `aliasedResourcesRegistry(...) module item ${index} did not converge to a resource definition or modeled registration strategy yet.`,
      observation.sourceNode,
    )],
  );
}

function moduleItemValueSource(
  context: ConfigurationRecognitionContext,
  item: ModuleItem,
): {
  readonly node: ts.Node;
  readonly isDeclaration: boolean;
  readonly sourceFileAddressHandle: AddressHandle | null;
  readonly moduleKey: string | null;
} {
  switch (item.value.kind) {
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Function:
      return {
        node: item.value.declaration,
        isDeclaration: true,
        sourceFileAddressHandle: context.sourceFileAddressHandleForNode(item.value.declaration),
        moduleKey: item.value.environment.moduleKey,
      };
    default: {
      const sourcePropertyNode = item.sourceProperty?.node ?? null;
      return {
        node: sourcePropertyNode ?? context.sourceFile,
        isDeclaration: false,
        sourceFileAddressHandle: sourcePropertyNode == null
          ? context.sourceFileAddressHandle
          : context.sourceFileAddressHandleForNode(sourcePropertyNode),
        moduleKey: null,
      };
    }
  }
}

function enrichAppTaskRegistration(
  observation: RegistrationAdmissionObservation,
  appTaskEmissions: readonly AppTaskEmission[],
): RegistrationAdmissionObservation {
  if (
    observation.registeredValue == null
    || observation.registeredValue.valueKind !== RegistrationValueKind.Registry
  ) {
    return observation;
  }
  const appTask = appTaskEmissions.find((emission) => emission.sourceNode === observation.registeredValue?.node) ?? null;
  if (appTask == null) {
    return observation;
  }
  return new RegistrationAdmissionObservation(
    observation.carrierKind,
    observation.admissionKind,
    observation.strategy,
    observation.keyRole,
    observation.sourceNode,
    observation.targetKey,
    new RegistrationValueObservation(
      observation.registeredValue.valueKind,
      observation.registeredValue.localName,
      observation.registeredValue.node,
      observation.registeredValue.isDeclaration,
      appTask.task.productHandle,
      FrameworkRegistrationKind.AppTask,
      observation.registeredValue.sourceFileAddressHandle,
      observation.registeredValue.moduleKey,
      observation.registeredValue.registryBody,
      observation.registeredValue.keyObservation,
      observation.registeredValue.evaluatedValue,
    ),
    observation.registryParameters,
    observation.openSeams,
  );
}

function enrichResourceRegistration(
  observation: RegistrationAdmissionObservation,
  context: ConfigurationRecognitionContext,
  resources: ResourceDefinitionIndex | null,
): RegistrationAdmissionObservation {
  const definition = resourceDefinitionForRegistrationValue(observation, context, resources);
  if (definition == null || observation.registeredValue == null) {
    return observation;
  }

  return new RegistrationAdmissionObservation(
    observation.carrierKind,
    observation.admissionKind,
    RegistrationStrategy.Resource,
    RegistrationKeyRole.Unknown,
    observation.sourceNode,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.ResourceDefinition,
      definition.target.localName ?? observation.registeredValue.localName,
      observation.registeredValue.node,
      observation.registeredValue.isDeclaration,
      definition.productHandle,
      observation.registeredValue.frameworkKind,
      observation.registeredValue.sourceFileAddressHandle,
      observation.registeredValue.moduleKey,
      observation.registeredValue.registryBody,
      observation.registeredValue.keyObservation,
      observation.registeredValue.evaluatedValue,
    ),
    observation.registryParameters,
    observation.openSeams.filter((seam) =>
      seam.openKind !== KernelVocabulary.Registration.OpenStrategy.key
    ),
  );
}

function resourceDefinitionForRegistrationValue(
  observation: RegistrationAdmissionObservation,
  context: ConfigurationRecognitionContext,
  resources: ResourceDefinitionIndex | null,
): FullResourceDefinition | null {
  if (resources == null || observation.registeredValue == null) {
    return null;
  }
  if (
    observation.registeredValue.isDeclaration
    && observation.registeredValue.moduleKey != null
    && observation.registeredValue.localName != null
  ) {
    const definition = resources.lookupByModuleLocal(
      observation.registeredValue.moduleKey,
      observation.registeredValue.localName,
    );
    if (definition?.productHandle != null) {
      return definition;
    }
  }
  if (context.typeSystem != null && ts.isExpression(observation.sourceNode)) {
    const definition = resources.lookupByTypeScriptExpression(context.typeSystem, observation.sourceNode);
    if (definition?.productHandle != null) {
      return definition;
    }
  }
  const carrierDefinition = resources.lookupByCarrierNode(observation.registeredValue.node);
  if (carrierDefinition?.productHandle != null) {
    return carrierDefinition;
  }
  const definition = resources.lookupValue(observation.registeredValue.evaluatedValue);
  return definition?.productHandle == null
    ? null
    : definition;
}
