import ts from 'typescript';
import { readReferenceSeed } from '../evaluation/ts-syntax.js';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
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
  EvidenceHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ConfigurationIdentity,
  ContainerIdentity,
  ContainerIdentityKind,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  diKeyIdentityRecord,
  localNameForDiKeyIdentitySeed,
  type DiKeyIdentitySeed,
} from '../kernel/di-key-identity.js';
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
import { projectModuleSourceNodeOrdinalLocalKey } from '../kernel/local-key.js';
import {
  KernelVocabulary,
  type ClaimPredicateKey,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import { ContainerConfiguration } from '../di/container-configuration.js';
import { Container } from '../di/container.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  RegistrationKernelEmitter,
  RegistrationKernelEmission,
  RegistrationEmissionContext,
  RegistrationEmissionScope,
} from '../registration/registration-kernel-emitter.js';
import {
  RegistrationAdmissionObservation,
  RegistrationValueObservation,
} from '../registration/registration-observation.js';
import {
  RegistrationKeyRole,
  RegistrationStrategy,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  FrameworkRegistrationKind,
  RegistrationKeyReference,
  RegistrationValueKind,
} from '../registration/registration-reference.js';
import {
  AppRoot,
  AppRootConfig,
  type AppRootConfigField,
  type AppRootField,
} from './app-root.js';
import {
  AppTaskDefinition,
  ConfigurationCallbackReference,
  type AppTaskField,
} from './app-task.js';
import { Aurelia, type AureliaField } from './aurelia.js';
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
  StringConfigurationOptionValue,
  StringArrayConfigurationOptionValue,
  UnknownConfigurationOptionValue,
} from './configuration-option.js';
import {
  ConfigurationSequence,
  ConfigurationSequenceReference,
  ConfigurationStep,
  ConfigurationStepReference,
  ConfigurationStepKind,
  type ConfigurationSequenceField,
  type ConfigurationStepField,
} from './configuration-sequence.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import {
  AppRootConfigObservation,
  AppTaskObservation,
  ConfigurationOptionContributionObservation,
  ConfigurationOptionValueObservation,
  ConfigurationRecognitionOpen,
  ConfigurationSequenceObservation,
  ConfigurationStepObservation,
} from './configuration-observation.js';

/** Result of emitting configuration observations into the kernel. */
export class ConfigurationKernelEmission {
  constructor(
    /** Typed configuration sequences produced for caller-owned product indexes. */
    readonly sequences: readonly ConfigurationSequence[],
    /** Typed configuration steps produced for caller-owned product indexes. */
    readonly steps: readonly ConfigurationStep[],
    /** Typed Aurelia facade products produced by this emission. */
    readonly aurelias: readonly Aurelia[],
    /** Typed app-root products produced by this emission. */
    readonly appRoots: readonly AppRoot[],
    /** Typed root container emulator frames produced by app admission. */
    readonly containers: readonly Container[],
    /** Typed app-task products produced by this emission. */
    readonly appTasks: readonly AppTaskDefinition[],
    /** Typed option-contribution products produced by this emission. */
    readonly optionContributions: readonly ConfigurationOptionContribution[],
    /** Registration admissions emitted while materializing configuration steps. */
    readonly registrationAdmissions: readonly RegistrationAdmissionProduct[],
    /** Kernel records committed for configuration products and registration admissions by this emission. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class SourceRecordSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

interface SourceRecordHandles {
  readonly addressHandle: AddressHandle;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
}

interface ConfigurationProductRecordSpec {
  readonly local: string;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly productKindKey: ProductKindKey;
  readonly ownerHandle: IdentityHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly provenanceHandle: ProvenanceHandle;
  readonly localName: string | null;
  readonly claimHandles?: readonly ClaimHandle[];
  readonly openSeamHandles?: readonly OpenSeamHandle[];
}

interface ConfigurationClaimSet {
  readonly records: readonly KernelStoreRecord[];
  readonly handles: readonly ClaimHandle[];
}

class AppFrame {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly container: Container,
    readonly aurelia: Aurelia,
    readonly appRootConfig: AppRootConfig | null,
    readonly appRoot: AppRoot | null,
    readonly productHandles: readonly ProductHandle[],
    readonly claims: readonly ClaimHandle[],
  ) {}
}

class AppRootConfigEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly productHandle: ProductHandle,
    readonly config: AppRootConfig,
  ) {}
}

class AppFrameRootConfigEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly appRootConfig: AppRootConfigEmission | null,
    readonly usesConfigClaimHandle: ClaimHandle | null,
  ) {}
}

class AppFrameClaimEmission {
  constructor(
    readonly records: readonly SemanticClaim[],
    readonly appRootUsesConfigClaim: SemanticClaim | null,
    readonly aureliaClaimHandles: readonly ClaimHandle[],
  ) {}
}

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

interface ConfigurationCallbackEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly reference: ConfigurationCallbackReference;
  readonly provenanceHandle: ProvenanceHandle;
}

interface ConfigurationOpenSeamEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly handle: OpenSeamHandle;
}

class ConfigurationStepEmissionSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly steps: readonly ConfigurationStep[],
    readonly appTasks: readonly AppTaskDefinition[],
    readonly optionContributions: readonly ConfigurationOptionContribution[],
    readonly registrationAdmissions: readonly RegistrationAdmissionProduct[],
  ) {}
}

interface ConfigurationSequenceEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly sequence: ConfigurationSequence;
  readonly steps: readonly ConfigurationStep[];
  readonly aurelias: readonly Aurelia[];
  readonly appRoots: readonly AppRoot[];
  readonly containers: readonly Container[];
  readonly appTasks: readonly AppTaskDefinition[];
  readonly optionContributions: readonly ConfigurationOptionContribution[];
  readonly registrationAdmissions: readonly RegistrationAdmissionProduct[];
}

class ConfigurationKernelEmissionFrame {
  readonly records: KernelStoreRecord[] = [];
  readonly sequences: ConfigurationSequence[] = [];
  readonly steps: ConfigurationStep[] = [];
  readonly aurelias: Aurelia[] = [];
  readonly appRoots: AppRoot[] = [];
  readonly containers: Container[] = [];
  readonly appTasks: AppTaskDefinition[] = [];
  readonly optionContributions: ConfigurationOptionContribution[] = [];
  readonly registrationAdmissions: RegistrationAdmissionProduct[] = [];

  recordSequence(emission: ConfigurationSequenceEmission): void {
    this.records.push(...emission.records);
    this.sequences.push(emission.sequence);
    this.steps.push(...emission.steps);
    this.aurelias.push(...emission.aurelias);
    this.appRoots.push(...emission.appRoots);
    this.containers.push(...emission.containers);
    this.appTasks.push(...emission.appTasks);
    this.optionContributions.push(...emission.optionContributions);
    this.registrationAdmissions.push(...emission.registrationAdmissions);
  }

  toEmission(): ConfigurationKernelEmission {
    return new ConfigurationKernelEmission(
      this.sequences,
      this.steps,
      this.aurelias,
      this.appRoots,
      this.containers,
      this.appTasks,
      this.optionContributions,
      this.registrationAdmissions,
      this.records,
    );
  }
}

class ConfigurationSequenceProductEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly sequence: ConfigurationSequence,
  ) {}
}

class ConfigurationProductHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

class ConfigurationTargetEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly target: ResourceTargetReference,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

/** Emits configuration observations into the durable kernel graph. */
export class ConfigurationKernelEmitter {
  constructor(
    /** Hot analysis store that receives configuration records. */
    readonly store: KernelStore,
  ) {}

  emit(
    context: ConfigurationRecognitionContext,
    observations: readonly ConfigurationSequenceObservation[],
    resources: ResourceDefinitionIndex | null = null,
  ): ConfigurationKernelEmission {
    const frame = new ConfigurationKernelEmissionFrame();

    observations.forEach((observation, index) => {
      const emission = this.recordsForSequence(context, observation, index, resources);
      frame.recordSequence(emission);
    });

    if (frame.records.length > 0) {
      this.store.commit(new KernelStoreBatch(frame.records, `configuration:${context.moduleKey}`));
    }

    return frame.toEmission();
  }

  private recordsForSequence(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    index: number,
    resources: ResourceDefinitionIndex | null,
  ): ConfigurationSequenceEmission {
    const records: KernelStoreRecord[] = [];
    const local = projectModuleSourceNodeOrdinalLocalKey({
      projectKey: context.projectKey,
      moduleKey: context.moduleKey,
      sourceFile: context.sourceFile,
      node: observation.sourceNode,
      index,
    });
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-sequence:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      `Configuration sequence recognized as ${observation.sequenceKind}.`,
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const appFrame = this.recordsForAppFrame(context, observation, local, source.provenanceHandle, resources);
    if (appFrame != null) {
      records.push(...appFrame.records);
    }

    const stepReferences = this.stepReferenceSeedsForSequence(local, observation);
    const stepSet = this.recordsForSequenceSteps(context, observation, local, stepReferences, appFrame, resources);
    records.push(...stepSet.records);

    const sequenceEmission = this.recordsForSequenceProduct(observation, local, appFrame, stepReferences, source);
    records.push(...sequenceEmission.records);

    return {
      records,
      sequence: sequenceEmission.sequence,
      steps: stepSet.steps,
      aurelias: appFrame == null ? [] : [appFrame.aurelia],
      appRoots: appFrame?.appRoot == null ? [] : [appFrame.appRoot],
      containers: appFrame == null ? [] : [appFrame.container],
      appTasks: stepSet.appTasks,
      optionContributions: stepSet.optionContributions,
      registrationAdmissions: stepSet.registrationAdmissions,
    };
  }

  private recordsForSequenceProduct(
    observation: ConfigurationSequenceObservation,
    local: string,
    appFrame: AppFrame | null,
    stepReferences: readonly ConfigurationStepReferenceSeed[],
    source: SourceRecordSet,
  ): ConfigurationSequenceProductEmission {
    const handles = this.configurationProductHandles(`configuration-sequence:${local}`);
    const sequenceClaims = this.recordsForSequenceClaims(
      local,
      handles.productHandle,
      stepReferences,
      source.provenanceHandle,
    );
    const sequence = this.configurationSequenceForObservation(
      observation,
      handles.productHandle,
      handles.identityHandle,
      appFrame,
      stepReferences,
      source,
    );
    return this.sequenceProductEmission(local, observation, appFrame, source, handles, sequenceClaims, sequence);
  }

  private sequenceProductEmission(
    local: string,
    observation: ConfigurationSequenceObservation,
    appFrame: AppFrame | null,
    source: SourceRecordSet,
    handles: ConfigurationProductHandles,
    sequenceClaims: ConfigurationClaimSet,
    sequence: ConfigurationSequence,
  ): ConfigurationSequenceProductEmission {
    return new ConfigurationSequenceProductEmission(
      [
        ...sequenceClaims.records,
        ...this.recordsForConfigurationSequenceProduct(
          local,
          observation,
          appFrame,
          source,
          handles.productHandle,
          handles.identityHandle,
          sequenceClaims.handles,
        ),
      ],
      sequence,
    );
  }

  private stepReferenceSeedsForSequence(
    sequenceLocal: string,
    observation: ConfigurationSequenceObservation,
  ): readonly ConfigurationStepReferenceSeed[] {
    return observation.steps.map((_, stepIndex) => new ConfigurationStepReferenceSeed(
      this.store.handles.identity(`configuration-step:${sequenceLocal}:${stepIndex}`),
      this.store.handles.product(`configuration-step:${sequenceLocal}:${stepIndex}`),
      this.store.handles.address(`configuration-step:${sequenceLocal}:${stepIndex}:source`),
      stepIndex,
    ));
  }

  private recordsForSequenceSteps(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    sequenceLocal: string,
    stepReferences: readonly ConfigurationStepReferenceSeed[],
    appFrame: AppFrame | null,
    resources: ResourceDefinitionIndex | null,
  ): ConfigurationStepEmissionSet {
    const records: KernelStoreRecord[] = [];
    const steps: ConfigurationStep[] = [];
    const appTasks: AppTaskDefinition[] = [];
    const optionContributions: ConfigurationOptionContribution[] = [];
    const registrationAdmissions: RegistrationAdmissionProduct[] = [];
    observation.steps.forEach((stepObservation, stepIndex) => {
      const stepEmission = this.recordsForStep(
        context,
        observation,
        stepObservation,
        sequenceLocal,
        stepIndex,
        stepReferences[stepIndex]!,
        appFrame,
        resources,
      );
      records.push(...stepEmission.records);
      steps.push(stepEmission.step);
      appTasks.push(...stepEmission.appTasks);
      optionContributions.push(...stepEmission.optionContributions);
      registrationAdmissions.push(...stepEmission.registrationAdmissions);
    });
    return new ConfigurationStepEmissionSet(records, steps, appTasks, optionContributions, registrationAdmissions);
  }

  private configurationSequenceForObservation(
    observation: ConfigurationSequenceObservation,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    appFrame: AppFrame | null,
    stepReferences: readonly ConfigurationStepReferenceSeed[],
    source: SourceRecordSet,
  ): ConfigurationSequence {
    return new ConfigurationSequence(
      productHandle,
      identityHandle,
      observation.sequenceKind,
      appFrame?.aurelia.toReference() ?? null,
      appFrame?.appRoot?.toReference() ?? null,
      stepReferences.map((step) => step.toReference()),
      source.addressHandle,
      compactFieldProvenance<ConfigurationSequenceField>([
        new FieldProvenance('sequenceKind', source.provenanceHandle),
        new FieldProvenance('steps', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private recordsForConfigurationSequenceProduct(
    local: string,
    observation: ConfigurationSequenceObservation,
    appFrame: AppFrame | null,
    source: SourceRecordSet,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return this.configurationProductRecords({
      local: `configuration-sequence:${local}`,
      productHandle,
      identityHandle,
      productKindKey: KernelVocabulary.Configuration.Sequence.key,
      ownerHandle: appFrame?.aurelia.identityHandle ?? null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: observation.localName,
      claimHandles,
    });
  }

  private recordsForStep(
    context: ConfigurationRecognitionContext,
    sequenceObservation: ConfigurationSequenceObservation,
    observation: ConfigurationStepObservation,
    sequenceLocal: string,
    index: number,
    referenceSeed: ConfigurationStepReferenceSeed,
    appFrame: AppFrame | null,
    resources: ResourceDefinitionIndex | null,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly step: ConfigurationStep;
    readonly appTasks: readonly AppTaskDefinition[];
    readonly optionContributions: readonly ConfigurationOptionContribution[];
    readonly registrationAdmissions: readonly RegistrationAdmissionProduct[];
  } {
    const records: KernelStoreRecord[] = [];
    const local = `${sequenceLocal}:${index}`;
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-step:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      `${observation.carrierKind} produced a ${observation.stepKind} configuration step.`,
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const openSeams = this.recordsForOpenSeams(context, observation.openSeams, `configuration-step:${local}`);
    records.push(...openSeams.records);

    const appProducedProductHandles = productHandlesForAppStep(observation, appFrame);
    const appTasks = this.recordsForStepAppTasks(context, observation, local);
    records.push(...appTasks.records);

    const options = this.recordsForStepOptions(context, observation, local);
    records.push(...options.records);

    const registrationEmission = this.emitStepRegistrations(
      context,
      observation,
      appTasks.emissions,
      local,
      resources,
    );
    records.push(...registrationEmission.records);

    const producedProductHandles = [
      ...appProducedProductHandles,
      ...appTasks.emissions.map((emission) => emission.task.productHandle),
      ...options.emissions.map((emission) => emission.contribution.productHandle),
    ];
    const registrationProductHandles = registrationEmission.admissions.map((admission) => admission.productHandle);
    const stepClaims = this.recordsForStepClaims(
      local,
      referenceSeed.productHandle,
      producedProductHandles,
      registrationProductHandles,
      source.provenanceHandle,
    );
    records.push(...stepClaims.records);

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
      appFrame,
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
      stepClaims.handles,
      openSeams.handles,
    ));

    return {
      records,
      step,
      appTasks: appTasks.emissions.map((emission) => emission.task),
      optionContributions: options.emissions.map((emission) => emission.contribution),
      registrationAdmissions: registrationEmission.admissions,
    };
  }

  private recordsForStepAppTasks(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationStepObservation,
    local: string,
  ): AppTaskEmissionSet {
    const emissions = observation.appTasks.map((appTask, appTaskIndex) =>
      this.recordsForAppTask(
        context,
        appTask,
        `${local}:app-task:${appTaskIndex}`,
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
  ): OptionContributionEmissionSet {
    const emissions = observation.optionContributions.map((contribution, optionIndex) =>
      this.recordsForOptionContribution(
        context,
        contribution,
        `${local}:option:${optionIndex}`,
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
    appFrame: AppFrame | null,
    appTaskEmissions: readonly AppTaskEmission[],
    producedProductHandles: readonly ProductHandle[],
    registrationProductHandles: readonly ProductHandle[],
    source: SourceRecordSet,
  ): ConfigurationStep {
    return new ConfigurationStep(
      referenceSeed.productHandle,
      referenceSeed.identityHandle,
      observation.stepKind,
      sequenceReference,
      index,
      appFrame?.aurelia.identityHandle ?? null,
      appFrame?.aurelia.productHandle ?? null,
      producedProductHandles,
      registrationProductHandles,
      appTaskEmissions.map((emission) => emission.task.toReference()),
      source.addressHandle,
      configurationStepFieldProvenance(
        producedProductHandles,
        registrationProductHandles,
        appTaskEmissions,
        source.provenanceHandle,
      ),
    );
  }

  private recordsForConfigurationStepProduct(
    local: string,
    observation: ConfigurationStepObservation,
    sequenceReference: ConfigurationSequenceReference,
    referenceSeed: ConfigurationStepReferenceSeed,
    source: SourceRecordSet,
    claimHandles: readonly ClaimHandle[],
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return this.configurationProductRecords({
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

  private recordsForAppFrame(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    sequenceLocal: string,
    provenanceHandle: ProvenanceHandle,
    resources: ResourceDefinitionIndex | null,
  ): AppFrame | null {
    const appStep = appAdmissionStep(observation);
    if (appStep == null) {
      return null;
    }

    const records: KernelStoreRecord[] = [];
    const appLocal = `${sequenceLocal}:app`;
    const source = this.recordsForSource(
      context,
      appStep.sourceNode,
      `configuration-app:${appLocal}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'Aurelia app admission boundary.',
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const container = this.containerForAppFrame(appLocal, source);

    const appRootConfig = this.recordsForAppFrameRootConfig(context, observation, appLocal, resources);
    records.push(...appRootConfig.records);

    const appRoot = appRootConfig.appRootConfig == null
      ? null
      : this.appRootForAppFrame(appLocal, container, appRootConfig.appRootConfig, source, provenanceHandle);

    const aurelia = this.aureliaForAppFrame(appLocal, container, appRoot, source, provenanceHandle);
    const appClaims = this.recordsForAppFrameClaims(
      appLocal,
      container,
      appRoot,
      appRootConfig.appRootConfig,
      appRootConfig.usesConfigClaimHandle,
      aurelia,
      provenanceHandle,
    );
    records.push(...appClaims.records);
    records.push(
      ...this.recordsForAppFrameProducts(
        appLocal,
        appStep,
        container,
        appRoot,
        aurelia,
        source,
        provenanceHandle,
        appClaims,
      ),
    );

    return new AppFrame(
      records,
      container,
      aurelia,
      appRootConfig.appRootConfig?.config ?? null,
      appRoot,
      [
        container.productHandle,
        aurelia.productHandle,
        ...(appRootConfig.appRootConfig?.productHandle == null ? [] : [appRootConfig.appRootConfig.productHandle]),
        ...(appRoot == null ? [] : [appRoot.productHandle]),
      ],
      appClaims.aureliaClaimHandles,
    );
  }

  private recordsForAppFrameRootConfig(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    appLocal: string,
    resources: ResourceDefinitionIndex | null,
  ): AppFrameRootConfigEmission {
    const observationConfig = observation.steps.find((step) => step.appRootConfig != null)?.appRootConfig ?? null;
    if (observationConfig == null) {
      return new AppFrameRootConfigEmission([], null, null);
    }

    const appRootConfig = this.recordsForAppRootConfig(context, observationConfig, appLocal, resources);
    return new AppFrameRootConfigEmission(
      appRootConfig.records,
      appRootConfig,
      this.store.handles.claim(`configuration-app-root:${appLocal}:uses-config`),
    );
  }

  private recordsForAppFrameClaims(
    appLocal: string,
    container: Container,
    appRoot: AppRoot | null,
    appRootConfig: AppRootConfigEmission | null,
    appRootConfigClaimHandle: ClaimHandle | null,
    aurelia: Aurelia,
    provenanceHandle: ProvenanceHandle,
  ): AppFrameClaimEmission {
    const aureliaClaims = this.recordsForAureliaClaims(
      appLocal,
      aurelia.productHandle,
      container.productHandle,
      appRoot?.productHandle ?? null,
      provenanceHandle,
    );
    const appRootUsesConfigClaim = appRoot == null || appRootConfig == null || appRootConfigClaimHandle == null
      ? null
      : new SemanticClaim(
        appRootConfigClaimHandle,
        appRoot.productHandle,
        KernelVocabulary.Configuration.AppRootUsesConfig.key,
        appRootConfig.productHandle,
        provenanceHandle,
      );
    return new AppFrameClaimEmission(
      [
        ...aureliaClaims.records.filter((record): record is SemanticClaim => record.kind === 'semantic-claim'),
        ...(appRootUsesConfigClaim == null ? [] : [appRootUsesConfigClaim]),
      ],
      appRootUsesConfigClaim,
      aureliaClaims.handles,
    );
  }

  private containerForAppFrame(
    appLocal: string,
    source: SourceRecordSet,
  ): Container {
    return new Container(
      this.store.handles.product(`di-container:${appLocal}`),
      this.store.handles.identity(`di-container:${appLocal}`),
      ContainerIdentityKind.Root,
      null,
      null,
      source.addressHandle,
      [],
      ContainerConfiguration.DEFAULT,
    );
  }

  private appRootForAppFrame(
    appLocal: string,
    container: Container,
    appRootConfig: AppRootConfigEmission,
    source: SourceRecordSet,
    provenanceHandle: ProvenanceHandle,
  ): AppRoot {
    return new AppRoot(
      this.store.handles.product(`configuration-app-root:${appLocal}`),
      this.store.handles.identity(`configuration-app-root:${appLocal}`),
      appRootConfig.config,
      container.toReference(),
      appRootConfig.config.hostAddressHandle,
      appRootConfig.config.component,
      null,
      null,
      appRootConfig.config.sourceAddressHandle,
      compactFieldProvenance<AppRootField>([
        new FieldProvenance('config', provenanceHandle),
        new FieldProvenance('container', source.provenanceHandle),
        appRootConfig.config.hostAddressHandle == null ? null : new FieldProvenance('host', provenanceHandle),
        appRootConfig.config.component == null ? null : new FieldProvenance('component', provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private aureliaForAppFrame(
    appLocal: string,
    container: Container,
    appRoot: AppRoot | null,
    source: SourceRecordSet,
    provenanceHandle: ProvenanceHandle,
  ): Aurelia {
    return new Aurelia(
      this.store.handles.product(`configuration-aurelia:${appLocal}`),
      this.store.handles.identity(`configuration-aurelia:${appLocal}`),
      container.toReference(),
      null,
      appRoot?.toReference() ?? null,
      null,
      source.addressHandle,
      compactFieldProvenance<AureliaField>([
        new FieldProvenance('container', source.provenanceHandle),
        appRoot == null ? null : new FieldProvenance('pendingRoot', provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private recordsForAppFrameProducts(
    appLocal: string,
    appStep: ConfigurationStepObservation,
    container: Container,
    appRoot: AppRoot | null,
    aurelia: Aurelia,
    source: SourceRecordSet,
    provenanceHandle: ProvenanceHandle,
    appClaims: AppFrameClaimEmission,
  ): readonly KernelStoreRecord[] {
    return [
      ...this.containerRecordsForAppFrame(
        appLocal,
        appStep,
        container,
        source,
        claimHandlesForProduct(appClaims.records, container.productHandle),
      ),
      ...(appRoot == null ? [] : this.appRootRecordsForAppFrame(
        appLocal,
        appStep,
        appRoot,
        provenanceHandle,
        claimHandlesForProduct(appClaims.records, appRoot.productHandle),
      )),
      ...this.aureliaRecordsForAppFrame(
        appLocal,
        appStep,
        aurelia,
        source,
        appClaims.aureliaClaimHandles,
      ),
    ];
  }

  private containerRecordsForAppFrame(
    appLocal: string,
    appStep: ConfigurationStepObservation,
    container: Container,
    source: SourceRecordSet,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new ContainerIdentity(
        container.identityHandle,
        ContainerIdentityKind.Root,
        null,
        null,
        source.addressHandle,
        appStep.receiverLocalName,
      ),
      new MaterializedProduct(
        container.productHandle,
        KernelVocabulary.Di.Container.key,
        container.identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`di-container:${appLocal}`),
        container.identityHandle,
        [container.productHandle],
        claimHandles,
      ),
    ];
  }

  private appRootRecordsForAppFrame(
    appLocal: string,
    appStep: ConfigurationStepObservation,
    appRoot: AppRoot,
    provenanceHandle: ProvenanceHandle,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return this.configurationProductRecords({
      local: `configuration-app-root:${appLocal}`,
      productHandle: appRoot.productHandle,
      identityHandle: appRoot.identityHandle,
      productKindKey: KernelVocabulary.Configuration.AppRoot.key,
      ownerHandle: null,
      sourceAddressHandle: appRoot.sourceAddressHandle,
      provenanceHandle,
      localName: appStep.receiverLocalName,
      claimHandles,
    });
  }

  private aureliaRecordsForAppFrame(
    appLocal: string,
    appStep: ConfigurationStepObservation,
    aurelia: Aurelia,
    source: SourceRecordSet,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return this.configurationProductRecords({
      local: `configuration-aurelia:${appLocal}`,
      productHandle: aurelia.productHandle,
      identityHandle: aurelia.identityHandle,
      productKindKey: KernelVocabulary.Configuration.Aurelia.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: appStep.receiverLocalName,
      claimHandles,
    });
  }

  private recordsForAppRootConfig(
    context: ConfigurationRecognitionContext,
    observation: AppRootConfigObservation,
    local: string,
    resources: ResourceDefinitionIndex | null,
  ): AppRootConfigEmission {
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-app-root-config:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'AppRoot config admitted by Aurelia app flow.',
      SourceSpanRole.Range,
    );

    const host = this.recordsForAppRootHost(context, observation, local);
    const component = this.recordsForAppRootComponent(context, observation, local, resources);
    const handles = this.configurationProductHandles(`configuration-app-root-config:${local}`);
    const config = this.appRootConfigForObservation(observation, source, host, component);

    return new AppRootConfigEmission(
      [
        ...source.records,
        ...(host == null ? [] : host.records),
        ...(component == null ? [] : component.records),
        ...this.recordsForAppRootConfigProduct(local, observation, source, handles),
      ],
      handles.productHandle,
      config,
    );
  }

  private recordsForAppRootHost(
    context: ConfigurationRecognitionContext,
    observation: AppRootConfigObservation,
    local: string,
  ): SourceRecordSet | null {
    return observation.hostExpression == null
      ? null
      : this.recordsForSource(
        context,
        observation.hostExpression,
        `configuration-app-root-config:${local}:host`,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Configuration],
        'AppRoot host expression.',
        SourceSpanRole.Value,
      );
  }

  private recordsForAppRootComponent(
    context: ConfigurationRecognitionContext,
    observation: AppRootConfigObservation,
    local: string,
    resources: ResourceDefinitionIndex | null,
  ): ConfigurationTargetEmission | null {
    return observation.component == null
      ? null
      : this.recordsForTarget(context, observation.component, `configuration-app-root-config:${local}:component`, resources);
  }

  private appRootConfigForObservation(
    observation: AppRootConfigObservation,
    source: SourceRecordSet,
    host: SourceRecordSet | null,
    component: ConfigurationTargetEmission | null,
  ): AppRootConfig {
    return new AppRootConfig(
      host?.addressHandle ?? null,
      component?.target ?? null,
      observation.allowActionlessForm,
      observation.strictBinding,
      null,
      source.addressHandle,
      compactFieldProvenance<AppRootConfigField>([
        host == null ? null : new FieldProvenance('host', host.provenanceHandle),
        component == null ? null : new FieldProvenance('component', component.provenanceHandle),
        observation.allowActionlessForm == null ? null : new FieldProvenance('allowActionlessForm', source.provenanceHandle),
        observation.strictBinding == null ? null : new FieldProvenance('strictBinding', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private recordsForAppRootConfigProduct(
    local: string,
    observation: AppRootConfigObservation,
    source: SourceRecordSet,
    handles: ConfigurationProductHandles,
  ): readonly KernelStoreRecord[] {
    return this.configurationProductRecords({
      local: `configuration-app-root-config:${local}`,
      productHandle: handles.productHandle,
      identityHandle: handles.identityHandle,
      productKindKey: KernelVocabulary.Configuration.AppRootConfig.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: observation.component?.localName ?? null,
    });
  }

  private recordsForAppTask(
    context: ConfigurationRecognitionContext,
    observation: AppTaskObservation,
    local: string,
  ): AppTaskEmission {
    const source = this.recordsForSource(
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
    const openSeams = this.recordsForOpenSeams(context, observation.openSeams, `configuration-app-task:${local}`);

    const handles = this.configurationProductHandles(`configuration-app-task:${local}`);
    const task = this.appTaskForObservation(observation, source, handles, key, callback);
    return new AppTaskEmission(
      [
        ...source.records,
        ...(key == null ? [] : key.records),
        ...(callback == null ? [] : callback.records),
        ...openSeams.records,
        ...this.recordsForAppTaskProduct(local, observation, source, handles, openSeams.handles),
      ],
      task,
      observation.sourceNode,
      openSeams.handles,
    );
  }

  private appTaskForObservation(
    observation: AppTaskObservation,
    source: SourceRecordSet,
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
        new FieldProvenance('slot', source.provenanceHandle),
        key == null ? null : new FieldProvenance('key', key.provenanceHandle),
        callback == null ? null : new FieldProvenance('callback', callback.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private recordsForAppTaskProduct(
    local: string,
    observation: AppTaskObservation,
    source: SourceRecordSet,
    handles: ConfigurationProductHandles,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return this.configurationProductRecords({
      local: `configuration-app-task:${local}`,
      productHandle: handles.productHandle,
      identityHandle: handles.identityHandle,
      productKindKey: KernelVocabulary.Configuration.AppTask.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: `AppTask.${observation.slot}`,
      openSeamHandles,
    });
  }

  private recordsForOptionContribution(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionContributionObservation,
    local: string,
  ): OptionContributionEmission {
    const source = this.optionContributionSource(context, observation, local);
    const value = this.recordsForOptionValue(context, observation.value, local);
    const openSeams = this.recordsForOpenSeams(context, observation.openSeams, `configuration-option:${local}`);
    const handles = this.configurationProductHandles(`configuration-option:${local}`);
    const contribution = this.optionContributionForObservation(observation, source, handles, value);
    return new OptionContributionEmission(
      [
        ...source.records,
        ...value.records,
        ...openSeams.records,
        ...this.recordsForOptionContributionProduct(local, observation, source, handles, openSeams.handles),
      ],
      contribution,
      openSeams.handles,
    );
  }

  private optionContributionSource(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionContributionObservation,
    local: string,
  ): SourceRecordSet {
    return this.recordsForSource(
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
    source: SourceRecordSet,
    handles: ConfigurationProductHandles,
    value: ReturnType<ConfigurationKernelEmitter['recordsForOptionValue']>,
  ): ConfigurationOptionContribution {
    return new ConfigurationOptionContribution(
      handles.productHandle,
      handles.identityHandle,
      observation.contributionKind,
      observation.configurationKind,
      observation.optionPath,
      value.value,
      source.addressHandle,
      compactFieldProvenance<ConfigurationOptionField>([
        new FieldProvenance('contributionKind', source.provenanceHandle),
        observation.configurationKind == null ? null : new FieldProvenance('configurationKind', source.provenanceHandle),
        new FieldProvenance('optionPath', source.provenanceHandle),
        new FieldProvenance('value', value.provenanceHandle ?? source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private recordsForOptionContributionProduct(
    local: string,
    observation: ConfigurationOptionContributionObservation,
    source: SourceRecordSet,
    handles: ConfigurationProductHandles,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return this.configurationProductRecords({
      local: `configuration-option:${local}`,
      productHandle: handles.productHandle,
      identityHandle: handles.identityHandle,
      productKindKey: KernelVocabulary.Configuration.OptionContribution.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: observation.optionPath.join('.'),
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
      : this.recordsForSource(
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
      return new RegistrationKernelEmission([], []);
    }
    const enriched = observation.registrationAdmissions.map((admission) => {
      const appTaskEnriched = enrichAppTaskRegistration(admission, appTaskEmissions);
      return enrichResourceRegistration(appTaskEnriched, context, resources);
    });
    return new RegistrationKernelEmitter(this.store).materialize(
      new RegistrationEmissionContext(
        context.sourceFile,
        context.moduleKey,
        context.sourceFileAddressHandle,
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
    const source = this.recordsForSource(
      context,
      expression,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration, EvidenceRole.Registration],
      'AppTask DI key expression.',
      SourceSpanRole.Value,
    );
    const identityHandle = this.store.handles.identity(local);
    const keySeed = readReferenceSeed(expression);
    const localName = localNameForDiKeyIdentitySeed(keySeed);
    return new RegistrationKeyEmission(
      [
        ...source.records,
        this.registrationKeyIdentityRecord(identityHandle, keySeed, source),
      ],
      new RegistrationKeyReference(identityHandle, source.addressHandle, localName),
      source.provenanceHandle,
    );
  }

  private registrationKeyIdentityRecord(
    identityHandle: IdentityHandle,
    keySeed: DiKeyIdentitySeed,
    source: SourceRecordSet,
  ): KernelStoreRecord {
    return diKeyIdentityRecord(
      identityHandle,
      keySeed,
      source.addressHandle,
      'AppTask key expression still needs DI key classification.',
    );
  }

  private recordsForCallback(
    context: ConfigurationRecognitionContext,
    observation: import('./configuration-observation.js').ConfigurationCallbackObservation,
    local: string,
  ): ConfigurationCallbackEmission {
    const source = this.recordsForSource(
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
    observation: import('./configuration-observation.js').ConfigurationCallbackObservation,
    local: string,
  ): IdentityHandle | null {
    return observation.isDeclaration && observation.localName != null
      ? this.store.handles.identity(local)
      : null;
  }

  private callbackIdentityRecords(
    context: ConfigurationRecognitionContext,
    observation: import('./configuration-observation.js').ConfigurationCallbackObservation,
    source: SourceRecordSet,
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

  private recordsForTarget(
    context: ConfigurationRecognitionContext,
    observation: import('./configuration-observation.js').ConfigurationTargetObservation,
    local: string,
    resources: ResourceDefinitionIndex | null,
  ): ConfigurationTargetEmission {
    const source = this.recordsForTargetSource(context, observation, local);
    const records: KernelStoreRecord[] = [...source.records];
    const definition = this.resourceDefinitionForTarget(context, observation, resources);
    const identityHandle = this.targetIdentityHandle(observation, local, definition);
    records.push(...this.recordsForTargetIdentity(context, observation, source, identityHandle, definition));
    return new ConfigurationTargetEmission(
      records,
      new ResourceTargetReference(
        identityHandle,
        source.addressHandle,
        observation.localName,
        definition?.target.targetType ?? null,
      ),
      source.provenanceHandle,
    );
  }

  private recordsForTargetSource(
    context: ConfigurationRecognitionContext,
    observation: import('./configuration-observation.js').ConfigurationTargetObservation,
    local: string,
  ): SourceRecordSet {
    return this.recordsForSource(
      context,
      observation.node,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'AppRoot component target expression.',
      SourceSpanRole.Value,
    );
  }

  private resourceDefinitionForTarget(
    context: ConfigurationRecognitionContext,
    observation: import('./configuration-observation.js').ConfigurationTargetObservation,
    resources: ResourceDefinitionIndex | null,
  ): FullResourceDefinition | null {
    return resources != null && ts.isExpression(observation.node)
      ? resources.lookupExpression(observation.node, context.expressionReader)
      : null;
  }

  private targetIdentityHandle(
    observation: import('./configuration-observation.js').ConfigurationTargetObservation,
    local: string,
    definition: FullResourceDefinition | null,
  ): IdentityHandle | null {
    return definition?.target.identityHandle
      ?? (observation.isDeclaration && observation.localName != null
        ? this.store.handles.identity(local)
        : null);
  }

  private recordsForTargetIdentity(
    context: ConfigurationRecognitionContext,
    observation: import('./configuration-observation.js').ConfigurationTargetObservation,
    source: SourceRecordSet,
    identityHandle: IdentityHandle | null,
    definition: FullResourceDefinition | null,
  ): readonly TypeScriptDeclarationIdentity[] {
    return definition == null && identityHandle != null
      ? [
        new TypeScriptDeclarationIdentity(
          identityHandle,
          context.moduleKey,
          null,
          observation.localName,
          source.addressHandle,
        ),
      ]
      : [];
  }

  private recordsForSource(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    local: string,
    evidenceKind: EvidenceKind,
    evidenceRoles: readonly EvidenceRole[],
    evidenceSummary: string,
    spanRole: SourceSpanRole,
  ): SourceRecordSet {
    const handles = this.sourceRecordHandles(local);
    return new SourceRecordSet(
      this.sourceRecords(context, node, handles, evidenceKind, evidenceRoles, evidenceSummary, spanRole),
      handles.addressHandle,
      handles.evidenceHandle,
      handles.provenanceHandle,
    );
  }

  private sourceRecordHandles(local: string): SourceRecordHandles {
    return {
      addressHandle: this.store.handles.address(`${local}:source`),
      evidenceHandle: this.store.handles.evidence(local),
      provenanceHandle: this.store.handles.provenance(local),
    };
  }

  private sourceRecords(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    handles: SourceRecordHandles,
    evidenceKind: EvidenceKind,
    evidenceRoles: readonly EvidenceRole[],
    evidenceSummary: string,
    spanRole: SourceSpanRole,
  ): readonly KernelStoreRecord[] {
    return [
      new SourceSpanAddress(
        handles.addressHandle,
        context.sourceFileAddressHandle,
        node.getStart(context.sourceFile),
        node.end,
        spanRole,
      ),
      new EvidenceRecord(
        handles.evidenceHandle,
        evidenceKind,
        evidenceRoles,
        evidenceSummary,
        handles.addressHandle,
      ),
      new ProvenanceRecord(handles.provenanceHandle, [handles.evidenceHandle]),
    ];
  }

  private configurationProductHandles(local: string): ConfigurationProductHandles {
    return new ConfigurationProductHandles(
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private configurationProductRecords(
    spec: ConfigurationProductRecordSpec,
  ): readonly KernelStoreRecord[] {
    return [
      new ConfigurationIdentity(
        spec.identityHandle,
        spec.productKindKey,
        spec.ownerHandle,
        spec.sourceAddressHandle,
        spec.localName,
      ),
      new MaterializedProduct(
        spec.productHandle,
        spec.productKindKey,
        spec.identityHandle,
        spec.sourceAddressHandle,
        spec.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(spec.local),
        spec.identityHandle,
        [spec.productHandle],
        spec.claimHandles ?? [],
        spec.openSeamHandles ?? [],
      ),
    ];
  }

  private recordsForOpenSeams(
    context: ConfigurationRecognitionContext,
    seams: readonly ConfigurationRecognitionOpen[],
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly OpenSeamHandle[];
  } {
    const emissions = seams.map((seam, index) =>
      this.recordsForOpenSeam(context, seam, `${local}:open:${index}`)
    );
    return {
      records: emissions.flatMap((emission) => emission.records),
      handles: emissions.map((emission) => emission.handle),
    };
  }

  private recordsForOpenSeam(
    context: ConfigurationRecognitionContext,
    seam: ConfigurationRecognitionOpen,
    local: string,
  ): ConfigurationOpenSeamEmission {
    const source = this.recordsForSource(
      context,
      seam.node,
      local,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
      seam.summary,
      SourceSpanRole.Range,
    );
    const openSeamHandle = this.store.handles.openSeam(local);
    return {
      records: [
        ...source.records,
        new OpenSeam(
          openSeamHandle,
          seam.openKind,
          seam.summary,
          source.addressHandle,
          source.evidenceHandle,
        ),
      ],
      handle: openSeamHandle,
    };
  }

  private recordsForAureliaClaims(
    local: string,
    aureliaProductHandle: ProductHandle,
    containerProductHandle: ProductHandle,
    appRootProductHandle: ProductHandle | null,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly ClaimHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const handles: ClaimHandle[] = [];
    const ownsContainerHandle = this.store.handles.claim(`configuration-aurelia-owns-container:${local}`);
    handles.push(ownsContainerHandle);
    records.push(new SemanticClaim(
      ownsContainerHandle,
      aureliaProductHandle,
      KernelVocabulary.Configuration.OwnsContainer.key,
      containerProductHandle,
      provenanceHandle,
    ));
    if (appRootProductHandle != null) {
      const hasAppRootHandle = this.store.handles.claim(`configuration-aurelia-has-app-root:${local}`);
      handles.push(hasAppRootHandle);
      records.push(new SemanticClaim(
        hasAppRootHandle,
        aureliaProductHandle,
        KernelVocabulary.Configuration.HasAppRoot.key,
        appRootProductHandle,
        provenanceHandle,
      ));
    }
    return { records, handles };
  }

  private recordsForSequenceClaims(
    local: string,
    sequenceProductHandle: ProductHandle,
    steps: readonly ConfigurationStepReferenceSeed[],
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly ClaimHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const handles: ClaimHandle[] = [];
    steps.forEach((step, index) => {
      const claimHandle = this.store.handles.claim(`configuration-sequence-contains-step:${local}:${index}`);
      handles.push(claimHandle);
      records.push(new SemanticClaim(
        claimHandle,
        sequenceProductHandle,
        KernelVocabulary.Configuration.ContainsStep.key,
        step.productHandle,
        provenanceHandle,
      ));
    });
    return { records, handles };
  }

  private recordsForStepClaims(
    local: string,
    stepProductHandle: ProductHandle,
    producedProductHandles: readonly ProductHandle[],
    registrationProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly ClaimHandle[];
  } {
    const productClaims = this.recordsForStepProductClaims(local, stepProductHandle, producedProductHandles, provenanceHandle);
    const registrationClaims = this.recordsForStepRegistrationClaims(local, stepProductHandle, registrationProductHandles, provenanceHandle);
    return {
      records: [...productClaims.records, ...registrationClaims.records],
      handles: [...productClaims.handles, ...registrationClaims.handles],
    };
  }

  private recordsForStepProductClaims(
    local: string,
    stepProductHandle: ProductHandle,
    producedProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly SemanticClaim[];
    readonly handles: readonly ClaimHandle[];
  } {
    return this.recordsForStepOutputClaims(
      producedProductHandles,
      (index) => this.stepProductClaimHandle(local, index),
      stepProductHandle,
      KernelVocabulary.Configuration.ProducesProduct.key,
      provenanceHandle,
    );
  }

  private recordsForStepRegistrationClaims(
    local: string,
    stepProductHandle: ProductHandle,
    registrationProductHandles: readonly ProductHandle[],
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly SemanticClaim[];
    readonly handles: readonly ClaimHandle[];
  } {
    return this.recordsForStepOutputClaims(
      registrationProductHandles,
      (index) => this.store.handles.claim(`configuration-step-admits-registration:${local}:${index}`),
      stepProductHandle,
      KernelVocabulary.Configuration.AdmitsRegistration.key,
      provenanceHandle,
    );
  }

  private recordsForStepOutputClaims(
    productHandles: readonly ProductHandle[],
    claimHandleForIndex: (index: number) => ClaimHandle,
    stepProductHandle: ProductHandle,
    claimKind: ClaimPredicateKey,
    provenanceHandle: ProvenanceHandle,
  ): {
    readonly records: readonly SemanticClaim[];
    readonly handles: readonly ClaimHandle[];
  } {
    const records: SemanticClaim[] = [];
    const handles: ClaimHandle[] = [];
    productHandles.forEach((productHandle, index) => {
      const claimHandle = claimHandleForIndex(index);
      handles.push(claimHandle);
      records.push(new SemanticClaim(
        claimHandle,
        stepProductHandle,
        claimKind,
        productHandle,
        provenanceHandle,
      ));
    });
    return { records, handles };
  }

  private stepProductClaimHandle(local: string, index: number): ClaimHandle {
    return this.store.handles.claim(`configuration-step-produces-product:${local}:${index}`);
  }
}

class ConfigurationStepReferenceSeed {
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

function appAdmissionStep(
  observation: ConfigurationSequenceObservation,
): ConfigurationStepObservation | null {
  return observation.steps.find((step) =>
    step.stepKind === ConfigurationStepKind.CreateAurelia
    || step.stepKind === ConfigurationStepKind.AureliaRegister
    || step.stepKind === ConfigurationStepKind.AureliaApp
  ) ?? null;
}

function productHandlesForAppStep(
  observation: ConfigurationStepObservation,
  appFrame: AppFrame | null,
): readonly ProductHandle[] {
  if (appFrame == null) {
    return [];
  }
  switch (observation.stepKind) {
    case ConfigurationStepKind.CreateAurelia:
      return [appFrame.container.productHandle, appFrame.aurelia.productHandle];
    case ConfigurationStepKind.AureliaApp:
      return appFrame.productHandles;
    case ConfigurationStepKind.AureliaRegister:
      return [appFrame.aurelia.productHandle];
    case ConfigurationStepKind.ContainerRegister:
    case ConfigurationStepKind.RegistryRegister:
    case ConfigurationStepKind.Customize:
    case ConfigurationStepKind.BuilderMutation:
    case ConfigurationStepKind.OptionContribution:
    case ConfigurationStepKind.AppTaskFactory:
    case ConfigurationStepKind.PluginConfigure:
    case ConfigurationStepKind.Unknown:
      return [];
  }
}

function configurationStepFieldProvenance(
  producedProductHandles: readonly ProductHandle[],
  registrationProductHandles: readonly ProductHandle[],
  appTaskEmissions: readonly AppTaskEmission[],
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<ConfigurationStepField>[] {
  return compactFieldProvenance<ConfigurationStepField>([
    new FieldProvenance('stepKind', provenanceHandle),
    new FieldProvenance('sequence', provenanceHandle),
    new FieldProvenance('ordinal', provenanceHandle),
    new FieldProvenance('receiver', provenanceHandle),
    producedProductHandles.length === 0 ? null : new FieldProvenance('producedProducts', provenanceHandle),
    registrationProductHandles.length === 0 ? null : new FieldProvenance('registrationAdmissions', provenanceHandle),
    appTaskEmissions.length === 0 ? null : new FieldProvenance('appTasks', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function claimHandlesForProduct(
  records: readonly KernelStoreRecord[],
  productHandle: ProductHandle,
): readonly ClaimHandle[] {
  return records
    .filter((record): record is SemanticClaim => record.kind === 'semantic-claim')
    .filter((claim) => claim.subjectHandle === productHandle || claim.objectHandle === productHandle)
    .map((claim) => claim.handle);
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
  if (!ts.isExpression(observation.registeredValue.node)) {
    return null;
  }
  const definition = resources.lookupExpression(observation.registeredValue.node, context.expressionReader);
  return definition?.productHandle == null
    ? null
    : definition;
}
