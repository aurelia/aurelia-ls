import ts from 'typescript';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import {
  AddressStability,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  DerivationPhase,
  OpenSeam,
  OpenSeamSeverity,
} from '../kernel/derivation.js';
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
  ConfigurationIdentityKind,
  ContainerIdentity,
  ContainerIdentityKind,
  IdentityStability,
  InterfaceDiKeyIdentity,
  StringDiKeyIdentity,
  TypeScriptDeclarationIdentity,
  UnknownDiKeyIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializationState,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceMode,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import { ContainerConfiguration } from '../di/container-configuration.js';
import { Container } from '../di/container.js';
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
import type { RegistrationAdmissionProduct } from '../registration/registration-admission.js';
import {
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

class AppTaskEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly task: AppTaskDefinition,
    readonly sourceNode: ts.CallExpression,
    readonly openSeamHandles: readonly OpenSeamHandle[],
  ) {}
}

class OptionContributionEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly contribution: ConfigurationOptionContribution,
    readonly openSeamHandles: readonly OpenSeamHandle[],
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
  ): ConfigurationKernelEmission {
    const records: KernelStoreRecord[] = [];
    const sequences: ConfigurationSequence[] = [];
    const steps: ConfigurationStep[] = [];
    const aurelias: Aurelia[] = [];
    const appRoots: AppRoot[] = [];
    const appTasks: AppTaskDefinition[] = [];
    const optionContributions: ConfigurationOptionContribution[] = [];
    const registrationAdmissions: RegistrationAdmissionProduct[] = [];

    observations.forEach((observation, index) => {
      const emission = this.recordsForSequence(context, observation, index);
      records.push(...emission.records);
      sequences.push(emission.sequence);
      steps.push(...emission.steps);
      aurelias.push(...emission.aurelias);
      appRoots.push(...emission.appRoots);
      appTasks.push(...emission.appTasks);
      optionContributions.push(...emission.optionContributions);
      registrationAdmissions.push(...emission.registrationAdmissions);
    });

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `configuration:${context.moduleKey}`));
    }

    return new ConfigurationKernelEmission(
      sequences,
      steps,
      aurelias,
      appRoots,
      appTasks,
      optionContributions,
      registrationAdmissions,
      records,
    );
  }

  private recordsForSequence(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    index: number,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly sequence: ConfigurationSequence;
    readonly steps: readonly ConfigurationStep[];
    readonly aurelias: readonly Aurelia[];
    readonly appRoots: readonly AppRoot[];
    readonly appTasks: readonly AppTaskDefinition[];
    readonly optionContributions: readonly ConfigurationOptionContribution[];
    readonly registrationAdmissions: readonly RegistrationAdmissionProduct[];
  } {
    const records: KernelStoreRecord[] = [];
    const steps: ConfigurationStep[] = [];
    const appTasks: AppTaskDefinition[] = [];
    const optionContributions: ConfigurationOptionContribution[] = [];
    const registrationAdmissions: RegistrationAdmissionProduct[] = [];
    const local = observationLocalKey(context, observation.sourceNode, index);
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-sequence:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      `Configuration sequence recognized as ${observation.sequenceKind}.`,
      'Configuration sequence observation.',
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const appFrame = this.recordsForAppFrame(context, observation, local, source.provenanceHandle);
    if (appFrame != null) {
      records.push(...appFrame.records);
    }

    const stepReferences = observation.steps.map((_, stepIndex) => new ConfigurationStepReferenceSeed(
      this.store.handles.identity(`configuration-step:${local}:${stepIndex}`),
      this.store.handles.product(`configuration-step:${local}:${stepIndex}`),
      this.store.handles.address(`configuration-step:${local}:${stepIndex}:source`),
      stepIndex,
    ));

    observation.steps.forEach((stepObservation, stepIndex) => {
      const stepEmission = this.recordsForStep(
        context,
        observation,
        stepObservation,
        local,
        stepIndex,
        stepReferences[stepIndex]!,
        appFrame,
      );
      records.push(...stepEmission.records);
      steps.push(stepEmission.step);
      appTasks.push(...stepEmission.appTasks);
      optionContributions.push(...stepEmission.optionContributions);
      registrationAdmissions.push(...stepEmission.registrationAdmissions);
    });

    const sequenceProductHandle = this.store.handles.product(`configuration-sequence:${local}`);
    const sequenceIdentityHandle = this.store.handles.identity(`configuration-sequence:${local}`);
    const sequenceClaims = this.recordsForSequenceClaims(local, sequenceProductHandle, stepReferences, source.provenanceHandle);
    records.push(...sequenceClaims.records);
    const sequence = new ConfigurationSequence(
      sequenceProductHandle,
      sequenceIdentityHandle,
      observation.sequenceKind,
      appFrame?.aurelia.toReference() ?? null,
      appFrame?.appRoot?.toReference() ?? null,
      null,
      stepReferences.map((step) => step.toReference()),
      source.addressHandle,
      compactFieldProvenance<ConfigurationSequenceField>([
        new FieldProvenance('sequenceKind', source.provenanceHandle),
        new FieldProvenance('steps', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new ConfigurationIdentity(
        sequenceIdentityHandle,
        IdentityStability.SourceStable,
        ConfigurationIdentityKind.Sequence,
        appFrame?.aurelia.identityHandle ?? null,
        source.addressHandle,
        observation.localName,
      ),
      new MaterializedProduct(
        sequenceProductHandle,
        KernelVocabulary.Configuration.Sequence.key,
        sequenceIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
        sequenceClaims.handles,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`configuration-sequence:${local}`),
        DerivationPhase.Materialization,
        sequenceIdentityHandle,
        MaterializationState.Complete,
        [sequenceProductHandle],
        sequenceClaims.handles,
        [],
        [],
      ),
    );

    return {
      records,
      sequence,
      steps,
      aurelias: appFrame == null ? [] : [appFrame.aurelia],
      appRoots: appFrame?.appRoot == null ? [] : [appFrame.appRoot],
      appTasks,
      optionContributions,
      registrationAdmissions,
    };
  }

  private recordsForStep(
    context: ConfigurationRecognitionContext,
    sequenceObservation: ConfigurationSequenceObservation,
    observation: ConfigurationStepObservation,
    sequenceLocal: string,
    index: number,
    referenceSeed: ConfigurationStepReferenceSeed,
    appFrame: AppFrame | null,
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
      'Configuration step observation.',
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const openSeams = this.recordsForOpenSeams(context, observation.openSeams, `configuration-step:${local}`);
    records.push(...openSeams.records);

    const appTaskEmissions: AppTaskEmission[] = [];
    for (const [appTaskIndex, appTask] of observation.appTasks.entries()) {
      const appTaskEmission = this.recordsForAppTask(context, appTask, `${local}:app-task:${appTaskIndex}`);
      records.push(...appTaskEmission.records);
      appTaskEmissions.push(appTaskEmission);
    }

    const optionEmissions = observation.optionContributions.map((contribution, optionIndex) =>
      this.recordsForOptionContribution(context, contribution, `${local}:option:${optionIndex}`)
    );
    for (const emission of optionEmissions) {
      records.push(...emission.records);
    }

    const registrationEmission = this.emitStepRegistrations(
      context,
      observation,
      appTaskEmissions,
      local,
    );
    records.push(...registrationEmission.records);

    const producedProductHandles = [
      ...productHandlesForAppStep(observation, appFrame),
      ...appTaskEmissions.map((emission) => emission.task.productHandle),
      ...optionEmissions.map((emission) => emission.contribution.productHandle),
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

    const sequenceReference = new ConfigurationSequenceReference(
      this.store.handles.identity(`configuration-sequence:${sequenceLocal}`),
      this.store.handles.product(`configuration-sequence:${sequenceLocal}`),
      this.store.handles.address(`configuration-sequence:${sequenceLocal}:source`),
      sequenceObservation.localName,
    );
    const step = new ConfigurationStep(
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
      compactFieldProvenance<ConfigurationStepField>([
        new FieldProvenance('stepKind', source.provenanceHandle),
        new FieldProvenance('sequence', source.provenanceHandle),
        new FieldProvenance('ordinal', source.provenanceHandle),
        new FieldProvenance('receiver', source.provenanceHandle),
        producedProductHandles.length === 0 ? null : new FieldProvenance('producedProducts', source.provenanceHandle),
        registrationProductHandles.length === 0 ? null : new FieldProvenance('registrationAdmissions', source.provenanceHandle),
        appTaskEmissions.length === 0 ? null : new FieldProvenance('appTasks', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new ConfigurationIdentity(
        referenceSeed.identityHandle,
        IdentityStability.SourceStable,
        ConfigurationIdentityKind.Step,
        sequenceReference.identityHandle,
        source.addressHandle,
        observation.receiverLocalName,
      ),
      new MaterializedProduct(
        referenceSeed.productHandle,
        KernelVocabulary.Configuration.Step.key,
        referenceSeed.identityHandle,
        source.addressHandle,
        source.provenanceHandle,
        stepClaims.handles,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`configuration-step:${local}`),
        DerivationPhase.Materialization,
        referenceSeed.identityHandle,
        materializationState(openSeams.handles),
        [referenceSeed.productHandle],
        stepClaims.handles,
        [],
        openSeams.handles,
      ),
    );

    return {
      records,
      step,
      appTasks: appTaskEmissions.map((emission) => emission.task),
      optionContributions: optionEmissions.map((emission) => emission.contribution),
      registrationAdmissions: registrationEmission.admissions,
    };
  }

  private recordsForAppFrame(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    sequenceLocal: string,
    provenanceHandle: ProvenanceHandle,
  ): AppFrame | null {
    const appStep = observation.steps.find((step) =>
      step.stepKind === ConfigurationStepKind.CreateAurelia
      || step.stepKind === ConfigurationStepKind.AureliaRegister
      || step.stepKind === ConfigurationStepKind.AureliaApp
    ) ?? null;
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
      'Aurelia app boundary observation.',
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const containerProductHandle = this.store.handles.product(`di-container:${appLocal}`);
    const containerIdentityHandle = this.store.handles.identity(`di-container:${appLocal}`);
    const container = new Container(
      containerProductHandle,
      containerIdentityHandle,
      ContainerIdentityKind.Root,
      null,
      null,
      source.addressHandle,
      [],
      ContainerConfiguration.DEFAULT,
    );
    records.push(
      new ContainerIdentity(
        containerIdentityHandle,
        IdentityStability.SourceStable,
        ContainerIdentityKind.Root,
        null,
        null,
        source.addressHandle,
        appStep.receiverLocalName,
      ),
      new MaterializedProduct(
        containerProductHandle,
        KernelVocabulary.Di.Container.key,
        containerIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`di-container:${appLocal}`),
        DerivationPhase.Materialization,
        containerIdentityHandle,
        MaterializationState.Complete,
        [containerProductHandle],
      ),
    );

    const appRootConfigObservation = observation.steps.find((step) => step.appRootConfig != null)?.appRootConfig ?? null;
    const appRootConfig = appRootConfigObservation == null
      ? null
      : this.recordsForAppRootConfig(context, appRootConfigObservation, appLocal);
    if (appRootConfig != null) {
      records.push(...appRootConfig.records);
    }

    const appRootProductHandle = appRootConfig == null ? null : this.store.handles.product(`configuration-app-root:${appLocal}`);
    const appRootIdentityHandle = appRootConfig == null ? null : this.store.handles.identity(`configuration-app-root:${appLocal}`);
    const appRoot = appRootConfig == null || appRootProductHandle == null || appRootIdentityHandle == null
      ? null
      : new AppRoot(
        appRootProductHandle,
        appRootIdentityHandle,
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
    if (appRoot != null) {
      records.push(
        new ConfigurationIdentity(
          appRoot.identityHandle,
          IdentityStability.SourceStable,
          ConfigurationIdentityKind.AppRoot,
          null,
          appRoot.sourceAddressHandle,
          appStep.receiverLocalName,
        ),
        new MaterializedProduct(
          appRoot.productHandle,
          KernelVocabulary.Configuration.AppRoot.key,
          appRoot.identityHandle,
          appRoot.sourceAddressHandle,
          provenanceHandle,
        ),
        new MaterializationRecord(
          this.store.handles.materialization(`configuration-app-root:${appLocal}`),
          DerivationPhase.Materialization,
          appRoot.identityHandle,
          MaterializationState.Complete,
          [appRoot.productHandle],
        ),
      );
    }

    const aureliaProductHandle = this.store.handles.product(`configuration-aurelia:${appLocal}`);
    const aureliaIdentityHandle = this.store.handles.identity(`configuration-aurelia:${appLocal}`);
    const appClaims = this.recordsForAureliaClaims(
      appLocal,
      aureliaProductHandle,
      containerProductHandle,
      appRoot?.productHandle ?? null,
      provenanceHandle,
    );
    records.push(...appClaims.records);
    const aurelia = new Aurelia(
      aureliaProductHandle,
      aureliaIdentityHandle,
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
    records.push(
      new ConfigurationIdentity(
        aureliaIdentityHandle,
        IdentityStability.SourceStable,
        ConfigurationIdentityKind.Aurelia,
        null,
        source.addressHandle,
        appStep.receiverLocalName,
      ),
      new MaterializedProduct(
        aureliaProductHandle,
        KernelVocabulary.Configuration.Aurelia.key,
        aureliaIdentityHandle,
        source.addressHandle,
        source.provenanceHandle,
        appClaims.handles,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`configuration-aurelia:${appLocal}`),
        DerivationPhase.Materialization,
        aureliaIdentityHandle,
        MaterializationState.Complete,
        [aureliaProductHandle],
        appClaims.handles,
      ),
    );

    return new AppFrame(
      records,
      container,
      aurelia,
      appRootConfig?.config ?? null,
      appRoot,
      [
        containerProductHandle,
        aureliaProductHandle,
        ...(appRootConfig?.productHandle == null ? [] : [appRootConfig.productHandle]),
        ...(appRoot == null ? [] : [appRoot.productHandle]),
      ],
      appClaims.handles,
    );
  }

  private recordsForAppRootConfig(
    context: ConfigurationRecognitionContext,
    observation: AppRootConfigObservation,
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly productHandle: ProductHandle;
    readonly config: AppRootConfig;
  } {
    const records: KernelStoreRecord[] = [];
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-app-root-config:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'AppRoot config admitted by Aurelia app flow.',
      'AppRoot config observation.',
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const hostAddressHandle = observation.hostExpression == null
      ? null
      : this.recordsForSource(
        context,
        observation.hostExpression,
        `configuration-app-root-config:${local}:host`,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Configuration],
        'AppRoot host expression.',
        'AppRoot host field observation.',
        SourceSpanRole.Value,
      );
    if (hostAddressHandle != null) {
      records.push(...hostAddressHandle.records);
    }

    const component = observation.component == null
      ? null
      : this.recordsForTarget(context, observation.component, `configuration-app-root-config:${local}:component`);
    if (component != null) {
      records.push(...component.records);
    }

    const productHandle = this.store.handles.product(`configuration-app-root-config:${local}`);
    const identityHandle = this.store.handles.identity(`configuration-app-root-config:${local}`);
    const config = new AppRootConfig(
      hostAddressHandle?.addressHandle ?? null,
      component?.target ?? null,
      observation.allowActionlessForm,
      observation.strictBinding,
      null,
      source.addressHandle,
      compactFieldProvenance<AppRootConfigField>([
        hostAddressHandle == null ? null : new FieldProvenance('host', hostAddressHandle.provenanceHandle),
        component == null ? null : new FieldProvenance('component', component.provenanceHandle),
        observation.allowActionlessForm == null ? null : new FieldProvenance('allowActionlessForm', source.provenanceHandle),
        observation.strictBinding == null ? null : new FieldProvenance('strictBinding', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new ConfigurationIdentity(
        identityHandle,
        IdentityStability.SourceStable,
        ConfigurationIdentityKind.AppRootConfig,
        null,
        source.addressHandle,
        observation.component?.localName ?? null,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Configuration.AppRootConfig.key,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`configuration-app-root-config:${local}`),
        DerivationPhase.Materialization,
        identityHandle,
        MaterializationState.Complete,
        [productHandle],
      ),
    );
    return { records, productHandle, config };
  }

  private recordsForAppTask(
    context: ConfigurationRecognitionContext,
    observation: AppTaskObservation,
    local: string,
  ): AppTaskEmission {
    const records: KernelStoreRecord[] = [];
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-app-task:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration, EvidenceRole.Registration],
      `AppTask.${observation.slot}(...) factory produced a deferred lifecycle task.`,
      'AppTask factory observation.',
      SourceSpanRole.Range,
    );
    records.push(...source.records);
    const key = observation.keyExpression == null
      ? null
      : this.recordsForRegistrationKey(context, observation.keyExpression, `configuration-app-task:${local}:key`);
    if (key != null) {
      records.push(...key.records);
    }
    const callback = observation.callback == null
      ? null
      : this.recordsForCallback(context, observation.callback, `configuration-app-task:${local}:callback`);
    if (callback != null) {
      records.push(...callback.records);
    }
    const openSeams = this.recordsForOpenSeams(context, observation.openSeams, `configuration-app-task:${local}`);
    records.push(...openSeams.records);

    const productHandle = this.store.handles.product(`configuration-app-task:${local}`);
    const identityHandle = this.store.handles.identity(`configuration-app-task:${local}`);
    const task = new AppTaskDefinition(
      productHandle,
      identityHandle,
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
    records.push(
      new ConfigurationIdentity(
        identityHandle,
        IdentityStability.SourceStable,
        ConfigurationIdentityKind.AppTask,
        null,
        source.addressHandle,
        `AppTask.${observation.slot}`,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Configuration.AppTask.key,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`configuration-app-task:${local}`),
        DerivationPhase.Materialization,
        identityHandle,
        materializationState(openSeams.handles),
        [productHandle],
        [],
        [],
        openSeams.handles,
      ),
    );
    return new AppTaskEmission(records, task, observation.sourceNode, openSeams.handles);
  }

  private recordsForOptionContribution(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionContributionObservation,
    local: string,
  ): OptionContributionEmission {
    const records: KernelStoreRecord[] = [];
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-option:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      `Configuration option contribution for ${observation.optionPath.join('.') || '(root)'}.`,
      'Configuration option contribution observation.',
      SourceSpanRole.Range,
    );
    records.push(...source.records);
    const value = this.recordsForOptionValue(context, observation.value, local);
    records.push(...value.records);
    const openSeams = this.recordsForOpenSeams(context, observation.openSeams, `configuration-option:${local}`);
    records.push(...openSeams.records);

    const productHandle = this.store.handles.product(`configuration-option:${local}`);
    const identityHandle = this.store.handles.identity(`configuration-option:${local}`);
    const contribution = new ConfigurationOptionContribution(
      productHandle,
      identityHandle,
      observation.contributionKind,
      observation.optionPath,
      value.value,
      source.addressHandle,
      compactFieldProvenance<ConfigurationOptionField>([
        new FieldProvenance('contributionKind', source.provenanceHandle),
        new FieldProvenance('optionPath', source.provenanceHandle),
        new FieldProvenance('value', value.provenanceHandle ?? source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
    records.push(
      new ConfigurationIdentity(
        identityHandle,
        IdentityStability.SourceStable,
        ConfigurationIdentityKind.OptionContribution,
        null,
        source.addressHandle,
        observation.optionPath.join('.'),
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Configuration.OptionContribution.key,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`configuration-option:${local}`),
        DerivationPhase.Materialization,
        identityHandle,
        materializationState(openSeams.handles),
        [productHandle],
        [],
        [],
        openSeams.handles,
      ),
    );
    return new OptionContributionEmission(records, contribution, openSeams.handles);
  }

  private recordsForOptionValue(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationOptionValueObservation,
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly value: ConfigurationOptionContribution['value'];
    readonly provenanceHandle: ProvenanceHandle | null;
  } {
    const source = observation.node == null
      ? null
      : this.recordsForSource(
        context,
        observation.node,
        `configuration-option-value:${local}`,
        EvidenceKind.ConfigurationFlow,
        [EvidenceRole.Configuration],
        `Configuration option value classified as ${observation.valueKind}.`,
        'Configuration option value observation.',
        SourceSpanRole.Value,
      );
    const records = source == null ? [] : [...source.records];
    const addressHandle = source?.addressHandle ?? null;
    switch (observation.valueKind) {
      case ConfigurationOptionValueKind.Boolean:
        return { records, value: new BooleanConfigurationOptionValue(Boolean(observation.primitive), addressHandle), provenanceHandle: source?.provenanceHandle ?? null };
      case ConfigurationOptionValueKind.String:
        return { records, value: new StringConfigurationOptionValue(String(observation.primitive ?? ''), addressHandle), provenanceHandle: source?.provenanceHandle ?? null };
      case ConfigurationOptionValueKind.Number:
        return { records, value: new NumberConfigurationOptionValue(typeof observation.primitive === 'number' ? observation.primitive : Number.NaN, addressHandle), provenanceHandle: source?.provenanceHandle ?? null };
      case ConfigurationOptionValueKind.Null:
        return { records, value: new NullConfigurationOptionValue(addressHandle), provenanceHandle: source?.provenanceHandle ?? null };
      case ConfigurationOptionValueKind.Object:
        return { records, value: new ObjectConfigurationOptionValue(null, addressHandle, observation.localName), provenanceHandle: source?.provenanceHandle ?? null };
      case ConfigurationOptionValueKind.Array:
        return { records, value: new ArrayConfigurationOptionValue(null, addressHandle, observation.localName), provenanceHandle: source?.provenanceHandle ?? null };
      case ConfigurationOptionValueKind.Callback:
        return { records, value: new CallbackConfigurationOptionValue(null, null, addressHandle, observation.localName), provenanceHandle: source?.provenanceHandle ?? null };
      case ConfigurationOptionValueKind.Identity: {
        const identityHandle = this.store.handles.identity(`configuration-option-value:${local}`);
        records.push(new TypeScriptDeclarationIdentity(
          identityHandle,
          IdentityStability.SourceStable,
          context.moduleKey,
          null,
          observation.localName,
          addressHandle,
        ));
        return { records, value: new IdentityConfigurationOptionValue(identityHandle, addressHandle, observation.localName), provenanceHandle: source?.provenanceHandle ?? null };
      }
      case ConfigurationOptionValueKind.Product:
        return { records, value: new UnknownConfigurationOptionValue(addressHandle, observation.localName), provenanceHandle: source?.provenanceHandle ?? null };
      case ConfigurationOptionValueKind.Absent:
      case ConfigurationOptionValueKind.Unknown:
        return { records, value: new UnknownConfigurationOptionValue(addressHandle, observation.localName), provenanceHandle: source?.provenanceHandle ?? null };
    }
  }

  private emitStepRegistrations(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationStepObservation,
    appTaskEmissions: readonly AppTaskEmission[],
    stepLocal: string,
  ): RegistrationKernelEmission {
    if (observation.registrationAdmissions.length === 0) {
      return new RegistrationKernelEmission([], []);
    }
    const enriched = observation.registrationAdmissions.map((admission) =>
      enrichAppTaskRegistration(admission, appTaskEmissions)
    );
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
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly reference: RegistrationKeyReference;
    readonly provenanceHandle: ProvenanceHandle;
  } {
    const source = this.recordsForSource(
      context,
      expression,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration, EvidenceRole.Registration],
      'AppTask DI key expression.',
      'AppTask key observation.',
      SourceSpanRole.Value,
    );
    const identityHandle = this.store.handles.identity(local);
    const localName = readLocalName(expression);
    const records: KernelStoreRecord[] = [...source.records];
    const current = unwrapExpression(expression);
    if (isStringLiteral(current)) {
      records.push(new StringDiKeyIdentity(identityHandle, IdentityStability.SemanticStable, current.text, source.addressHandle));
    } else if (isInterfaceKeyName(localName)) {
      records.push(new InterfaceDiKeyIdentity(identityHandle, IdentityStability.SemanticStable, localName, null, source.addressHandle));
    } else {
      records.push(new UnknownDiKeyIdentity(identityHandle, IdentityStability.SourceStable, source.addressHandle, 'AppTask key expression still needs DI key classification.'));
    }
    return {
      records,
      reference: new RegistrationKeyReference(identityHandle, source.addressHandle, localName),
      provenanceHandle: source.provenanceHandle,
    };
  }

  private recordsForCallback(
    context: ConfigurationRecognitionContext,
    observation: import('./configuration-observation.js').ConfigurationCallbackObservation,
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly reference: ConfigurationCallbackReference;
    readonly provenanceHandle: ProvenanceHandle;
  } {
    const source = this.recordsForSource(
      context,
      observation.node,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'Configuration callback expression.',
      'Configuration callback observation.',
      SourceSpanRole.Value,
    );
    const records: KernelStoreRecord[] = [...source.records];
    const identityHandle = observation.isDeclaration && observation.localName != null
      ? this.store.handles.identity(local)
      : null;
    if (identityHandle != null) {
      records.push(new TypeScriptDeclarationIdentity(
        identityHandle,
        IdentityStability.SourceStable,
        context.moduleKey,
        null,
        observation.localName,
        source.addressHandle,
      ));
    }
    return {
      records,
      reference: new ConfigurationCallbackReference(identityHandle, null, source.addressHandle, observation.localName),
      provenanceHandle: source.provenanceHandle,
    };
  }

  private recordsForTarget(
    context: ConfigurationRecognitionContext,
    observation: import('./configuration-observation.js').ConfigurationTargetObservation,
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly target: ResourceTargetReference;
    readonly provenanceHandle: ProvenanceHandle;
  } {
    const source = this.recordsForSource(
      context,
      observation.node,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      'AppRoot component target expression.',
      'AppRoot component target observation.',
      SourceSpanRole.Value,
    );
    const records: KernelStoreRecord[] = [...source.records];
    const identityHandle = observation.isDeclaration && observation.localName != null
      ? this.store.handles.identity(local)
      : null;
    if (identityHandle != null) {
      records.push(new TypeScriptDeclarationIdentity(
        identityHandle,
        IdentityStability.SourceStable,
        context.moduleKey,
        null,
        observation.localName,
        source.addressHandle,
      ));
    }
    return {
      records,
      target: new ResourceTargetReference(identityHandle, source.addressHandle, observation.localName),
      provenanceHandle: source.provenanceHandle,
    };
  }

  private recordsForSource(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    local: string,
    evidenceKind: EvidenceKind,
    evidenceRoles: readonly EvidenceRole[],
    evidenceSummary: string,
    provenanceNote: string,
    spanRole: SourceSpanRole,
  ): SourceRecordSet {
    const addressHandle = this.store.handles.address(`${local}:source`);
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    return new SourceRecordSet(
      [
        new SourceSpanAddress(
          addressHandle,
          AddressStability.SourceStable,
          context.sourceFileAddressHandle,
          node.getStart(context.sourceFile),
          node.end,
          spanRole,
        ),
        new EvidenceRecord(
          evidenceHandle,
          evidenceKind,
          evidenceRoles,
          evidenceSummary,
          addressHandle,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          ProvenanceMode.Direct,
          [evidenceHandle],
          [],
          provenanceNote,
        ),
      ],
      addressHandle,
      evidenceHandle,
      provenanceHandle,
    );
  }

  private recordsForOpenSeams(
    context: ConfigurationRecognitionContext,
    seams: readonly ConfigurationRecognitionOpen[],
    local: string,
  ): {
    readonly records: readonly KernelStoreRecord[];
    readonly handles: readonly OpenSeamHandle[];
  } {
    const records: KernelStoreRecord[] = [];
    const handles: OpenSeamHandle[] = [];
    seams.forEach((seam, index) => {
      const seamLocal = `${local}:open:${index}`;
      const source = this.recordsForSource(
        context,
        seam.node,
        seamLocal,
        EvidenceKind.Open,
        [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
        seam.summary,
        `Configuration recognition left an open seam: ${seam.openKind}.`,
        SourceSpanRole.Range,
      );
      const openSeamHandle = this.store.handles.openSeam(seamLocal);
      handles.push(openSeamHandle);
      records.push(
        ...source.records,
        new OpenSeam(
          openSeamHandle,
          seam.openKind,
          OpenSeamSeverity.Warning,
          seam.summary,
          source.addressHandle,
          source.evidenceHandle,
        ),
      );
    });
    return { records, handles };
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
    const records: KernelStoreRecord[] = [];
    const handles: ClaimHandle[] = [];
    producedProductHandles.forEach((productHandle, index) => {
      const claimHandle = this.store.handles.claim(`configuration-step-produces-product:${local}:${index}`);
      handles.push(claimHandle);
      records.push(new SemanticClaim(
        claimHandle,
        stepProductHandle,
        KernelVocabulary.Configuration.ProducesProduct.key,
        productHandle,
        provenanceHandle,
      ));
    });
    registrationProductHandles.forEach((productHandle, index) => {
      const claimHandle = this.store.handles.claim(`configuration-step-admits-registration:${local}:${index}`);
      handles.push(claimHandle);
      records.push(new SemanticClaim(
        claimHandle,
        stepProductHandle,
        KernelVocabulary.Configuration.AdmitsRegistration.key,
        productHandle,
        provenanceHandle,
      ));
    });
    return { records, handles };
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
    case ConfigurationStepKind.AppTaskSlotDispatch:
    case ConfigurationStepKind.PluginConfigure:
    case ConfigurationStepKind.Unknown:
      return [];
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
    ),
    observation.registryParameters,
    observation.openSeams,
  );
}

function materializationState(openSeamHandles: readonly OpenSeamHandle[]): MaterializationState {
  return openSeamHandles.length === 0 ? MaterializationState.Complete : MaterializationState.Partial;
}

function readLocalName(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

function isStringLiteral(expression: ts.Expression): expression is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression);
}

function isInterfaceKeyName(name: string | null): name is string {
  return name != null && /^I[A-Z][A-Za-z0-9]*$/.test(name);
}

function observationLocalKey(
  context: ConfigurationRecognitionContext,
  node: ts.Node,
  index: number,
): string {
  return `${context.moduleKey}:${node.getStart(context.sourceFile)}:${node.end}:${index}`;
}
