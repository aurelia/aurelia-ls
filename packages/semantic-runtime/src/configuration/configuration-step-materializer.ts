import ts from 'typescript';
import { readReferenceSeed } from '../evaluation/ts-syntax.js';
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
  diKeyIdentityRecord,
  localNameForDiKeyIdentitySeed,
  type DiKeyIdentitySeed,
} from '../kernel/di-key-identity.js';
import {
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  compactFieldProvenance,
  FieldProvenance,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
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
  AppTaskDefinition,
  ConfigurationCallbackReference,
  type AppTaskField,
} from './app-task.js';
import type {
  AureliaAppFrame,
} from './aurelia-app-frame-materializer.js';
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
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import {
  ConfigurationKernelPublication,
  ConfigurationProductHandles,
  ConfigurationSourceRecordSet as SourceRecordSet,
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
  constructor(
    private readonly store: KernelStore,
    private readonly publication: ConfigurationKernelPublication,
  ) {}

  recordsForSequenceSteps(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    sequenceLocal: string,
    stepReferences: readonly ConfigurationStepReferenceSeed[],
    appFrame: AureliaAppFrame | null,
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

  private recordsForStep(
    context: ConfigurationRecognitionContext,
    sequenceObservation: ConfigurationSequenceObservation,
    observation: ConfigurationStepObservation,
    sequenceLocal: string,
    index: number,
    referenceSeed: ConfigurationStepReferenceSeed,
    appFrame: AureliaAppFrame | null,
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
    const stepClaims = this.publication.recordsForStepClaims(
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
    appFrame: AureliaAppFrame | null,
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
      [],
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
        key == null || key.provenanceHandle === source.provenanceHandle ? null : new FieldProvenance('key', key.provenanceHandle),
        callback == null || callback.provenanceHandle === source.provenanceHandle ? null : new FieldProvenance('callback', callback.provenanceHandle),
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
    return this.publication.configurationProductRecords({
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
    const openSeams = this.publication.recordsForOpenSeams(context, observation.openSeams, `configuration-option:${local}`);
    const handles = this.publication.configurationProductHandles(`configuration-option:${local}`);
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
    source: SourceRecordSet,
    handles: ConfigurationProductHandles,
    value: ConfigurationOptionValueEmission,
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
        value.provenanceHandle == null || value.provenanceHandle === source.provenanceHandle
          ? null
          : new FieldProvenance('value', value.provenanceHandle),
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
    return this.publication.configurationProductRecords({
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
    const source = this.publication.recordsForSource(
      context,
      expression,
      `${local}:source`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration, EvidenceRole.Registration],
      'AppTask DI key expression.',
      SourceSpanRole.Value,
    );
    const identityHandle = this.store.handles.identity(local);
    const keySeed = readDiKeyIdentitySeed(expression);
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

function productHandlesForAppStep(
  observation: ConfigurationStepObservation,
  appFrame: AureliaAppFrame | null,
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
    case ConfigurationStepKind.PluginConfigure:
    case ConfigurationStepKind.Unknown:
      return [];
  }
}

function readDiKeyIdentitySeed(
  expression: ts.Expression,
): DiKeyIdentitySeed {
  const seed = readReferenceSeed(expression);
  switch (seed.kind) {
    case 'string-key':
      return { kind: 'string-key', candidateName: seed.candidateName };
    case 'identifier-name':
      return { kind: 'identifier-name', candidateName: seed.candidateName };
    case 'property-access-name':
      return { kind: 'property-access-name', candidateName: seed.candidateName };
    case 'open-expression':
      return { kind: 'open-expression', candidateName: null };
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
  if (!ts.isExpression(observation.registeredValue.node)) {
    return null;
  }
  const definition = resources.lookupExpression(observation.registeredValue.node, context.expressionReader);
  return definition?.productHandle == null
    ? null
    : definition;
}
