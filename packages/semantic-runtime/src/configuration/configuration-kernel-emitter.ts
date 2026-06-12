import {
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { projectModuleSourceNodeOrdinalLocalKey } from '../kernel/local-key.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import { Container } from '../di/container.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  AppRoot,
} from './app-root.js';
import {
  AppTaskDefinition,
} from './app-task.js';
import { Aurelia } from './aurelia.js';
import {
  ConfigurationOptionContribution,
} from './configuration-option.js';
import {
  ConfigurationSequence,
  ConfigurationSequenceReference,
  ConfigurationStep,
} from './configuration-sequence.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import {
  ConfigurationSequenceObservation,
} from './configuration-observation.js';
import {
  ConfigurationClaimSet,
  ConfigurationKernelPublication,
  ConfigurationProductHandles,
  ConfigurationSourceRecordSet as SourceRecordSet,
} from './configuration-publication.js';
import {
  AureliaAppFrame,
  AureliaAppFrameMaterializer,
} from './aurelia-app-frame-materializer.js';
import {
  ConfigurationStepMaterializer,
  ConfigurationStepReferenceSeed,
} from './configuration-step-materializer.js';

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

/** Emits configuration observations into the durable kernel graph. */
export class ConfigurationKernelEmitter {
  private readonly publication: ConfigurationKernelPublication;
  private readonly appFrames: AureliaAppFrameMaterializer;
  private readonly steps: ConfigurationStepMaterializer;

  constructor(
    /** Hot analysis store that receives configuration records. */
    readonly store: KernelStore,
  ) {
    this.publication = new ConfigurationKernelPublication(store);
    this.appFrames = new AureliaAppFrameMaterializer(store, this.publication);
    this.steps = new ConfigurationStepMaterializer(store, this.publication);
  }

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
    const source = this.publication.recordsForSource(
      context,
      observation.sourceNode,
      `configuration-sequence:${local}`,
      EvidenceKind.ConfigurationFlow,
      [EvidenceRole.Configuration],
      `Configuration sequence recognized as ${observation.sequenceKind}.`,
      SourceSpanRole.Range,
    );
    records.push(...source.records);

    const appFrame = this.appFrames.materialize(context, observation, local, source.provenanceHandle, resources);
    if (appFrame != null) {
      records.push(...appFrame.records);
    }

    const stepReferences = this.stepReferenceSeedsForSequence(local, observation);
    const stepSet = this.steps.recordsForSequenceSteps(context, observation, local, stepReferences, appFrame, resources);
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
    appFrame: AureliaAppFrame | null,
    stepReferences: readonly ConfigurationStepReferenceSeed[],
    source: SourceRecordSet,
  ): ConfigurationSequenceProductEmission {
    const handles = this.publication.configurationProductHandles(`configuration-sequence:${local}`);
    const sequenceClaims = this.publication.recordsForSequenceClaims(
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
    appFrame: AureliaAppFrame | null,
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

  private configurationSequenceForObservation(
    observation: ConfigurationSequenceObservation,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    appFrame: AureliaAppFrame | null,
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
      [],
    );
  }

  private recordsForConfigurationSequenceProduct(
    local: string,
    observation: ConfigurationSequenceObservation,
    appFrame: AureliaAppFrame | null,
    source: SourceRecordSet,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    claimHandles: readonly ClaimHandle[],
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
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

}
