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
  OpenSeamHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { projectModuleSourceNodeOrdinalLocalKey } from '../kernel/local-key.js';
import type { OpenSeam } from '../kernel/open-seam.js';
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
  ConfigurationSourceRecordSet,
} from './configuration-publication.js';
import {
  ConfigurationStepEmissionSet,
  ConfigurationStepMaterializer,
  ConfigurationStepReferenceSeed,
} from './configuration-step-materializer.js';
import {
  ConfigurationEvaluationBindingFrame,
  ConfigurationEvaluationBindings,
} from './configuration-evaluation-bindings.js';

/** Configuration uncertainty together with the app/container locus that can be affected by it. */
export class ConfigurationOpenSeamScope {
  constructor(
    readonly seam: OpenSeam,
    /** Every known receiving container; null means the configuration target itself stayed unresolved. */
    readonly containerIdentityHandles: readonly IdentityHandle[] | null,
  ) {}
}

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
    /** Open configuration recognition seams retained with their exact app/container scope. */
    readonly openSeamScopes: readonly ConfigurationOpenSeamScope[],
    /** Project-run links from evaluator facade/container identity to emitted configuration products. */
    readonly evaluationBindings: ConfigurationEvaluationBindings,
    /** Kernel records published for configuration products and registration admissions by this emission. */
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
  readonly openSeamScopes: readonly ConfigurationOpenSeamScope[];
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
  readonly openSeamScopes: ConfigurationOpenSeamScope[] = [];

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
    this.openSeamScopes.push(...emission.openSeamScopes);
  }

  toEmission(evaluationBindings: ConfigurationEvaluationBindings): ConfigurationKernelEmission {
    return new ConfigurationKernelEmission(
      this.sequences,
      this.steps,
      this.aurelias,
      this.appRoots,
      this.containers,
      this.appTasks,
      this.optionContributions,
      this.registrationAdmissions,
      this.openSeamScopes,
      evaluationBindings,
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

/** Emits configuration observations into the caller-owned kernel publication. */
export class ConfigurationKernelEmitter {
  private readonly publication: ConfigurationKernelPublication;
  private readonly steps: ConfigurationStepMaterializer;

  constructor(
    /** Hot analysis store used only for deterministic handle allocation. */
    readonly store: KernelStore,
    /** Caller-owned app-generation publication. */
    readonly kernelPublication: KernelPublicationContext,
    readonly evaluationBindings: ConfigurationEvaluationBindingFrame,
  ) {
    this.publication = new ConfigurationKernelPublication(store);
    this.steps = new ConfigurationStepMaterializer(store, this.publication, kernelPublication, evaluationBindings);
  }

  emit(
    context: ConfigurationRecognitionContext,
    observations: readonly ConfigurationSequenceObservation[],
    resources: ResourceDefinitionIndex | null = null,
  ): ConfigurationKernelEmission {
    const bindingMark = this.evaluationBindings.mark();
    const frame = new ConfigurationKernelEmissionFrame();

    observations.forEach((observation, index) => {
      const emission = this.recordsForSequence(context, observation, index, resources);
      frame.recordSequence(emission);
    });

    if (frame.records.length > 0) {
      this.kernelPublication.publish(new KernelPublicationPlan(
        new KernelStoreBatch(frame.records, `configuration:${context.moduleKey}`),
      ));
    }

    return frame.toEmission(this.evaluationBindings.readSince(bindingMark));
  }

  /** Emit one source-ordinal sequence while sharing evaluator identity with other project modules. */
  emitSequence(
    context: ConfigurationRecognitionContext,
    observation: ConfigurationSequenceObservation,
    ordinal: number,
    resources: ResourceDefinitionIndex | null = null,
  ): ConfigurationKernelEmission {
    const bindingMark = this.evaluationBindings.mark();
    const frame = new ConfigurationKernelEmissionFrame();
    const emission = this.recordsForSequence(context, observation, ordinal, resources);
    frame.recordSequence(emission);
    if (frame.records.length > 0) {
      this.kernelPublication.publish(new KernelPublicationPlan(
        new KernelStoreBatch(frame.records, `configuration:${context.moduleKey}:${ordinal}`),
      ));
    }
    return frame.toEmission(this.evaluationBindings.readSince(bindingMark));
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

    const stepReferences = this.stepReferenceSeedsForSequence(local, observation);
    const stepSet = this.steps.recordsForSequenceSteps(context, observation, local, stepReferences, resources);
    records.push(...stepSet.records);

    const openSeams = this.publication.recordsForOpenSeams(
      context,
      observation.openSeams,
      `configuration-sequence:${local}`,
    );
    records.push(...openSeams.records);

    const sequenceEmission = this.recordsForSequenceProduct(
      observation,
      local,
      stepSet,
      stepReferences,
      source,
      openSeams.handles,
    );
    records.push(...sequenceEmission.records);
    this.evaluationBindings.bindProductSource(
      sequenceEmission.sequence.productHandle,
      observation.sourceNode,
    );
    const preferredOpenSeamContainerIdentityHandle = stepSet.sequenceAppRoot?.container.identityHandle
      ?? stepSet.sequenceAurelia?.container.identityHandle
      ?? null;
    const openSeamContainerIdentityHandles = preferredOpenSeamContainerIdentityHandle == null
      ? knownContainerIdentityHandles(stepSet.containers)
      : [preferredOpenSeamContainerIdentityHandle];

    return {
      records,
      sequence: sequenceEmission.sequence,
      steps: stepSet.steps,
      aurelias: stepSet.aurelias,
      appRoots: stepSet.appRoots,
      containers: stepSet.containers,
      appTasks: stepSet.appTasks,
      optionContributions: stepSet.optionContributions,
      registrationAdmissions: stepSet.registrationAdmissions,
      openSeamScopes: openSeams.seams.map((seam) => new ConfigurationOpenSeamScope(
        seam,
        openSeamContainerIdentityHandles,
      )),
    };
  }

  private recordsForSequenceProduct(
    observation: ConfigurationSequenceObservation,
    local: string,
    stepSet: ConfigurationStepEmissionSet,
    stepReferences: readonly ConfigurationStepReferenceSeed[],
    source: ConfigurationSourceRecordSet,
    openSeamHandles: readonly OpenSeamHandle[],
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
      stepSet,
      stepReferences,
      source,
    );
    return this.sequenceProductEmission(
      local,
      observation,
      stepSet,
      source,
      handles,
      sequenceClaims,
      sequence,
      openSeamHandles,
    );
  }

  private sequenceProductEmission(
    local: string,
    observation: ConfigurationSequenceObservation,
    stepSet: ConfigurationStepEmissionSet,
    source: ConfigurationSourceRecordSet,
    handles: ConfigurationProductHandles,
    sequenceClaims: ConfigurationClaimSet,
    sequence: ConfigurationSequence,
    openSeamHandles: readonly OpenSeamHandle[],
  ): ConfigurationSequenceProductEmission {
    return new ConfigurationSequenceProductEmission(
      [
        ...sequenceClaims.records,
        ...this.recordsForConfigurationSequenceProduct(
          local,
          observation,
          stepSet,
          source,
          handles.productHandle,
          handles.identityHandle,
          sequenceClaims.handles,
          openSeamHandles,
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
    stepSet: ConfigurationStepEmissionSet,
    stepReferences: readonly ConfigurationStepReferenceSeed[],
    source: ConfigurationSourceRecordSet,
  ): ConfigurationSequence {
    return new ConfigurationSequence(
      productHandle,
      identityHandle,
      observation.sequenceKind,
      stepSet.sequenceAurelia?.toReference() ?? null,
      stepSet.sequenceAppRoot?.toReference() ?? null,
      stepReferences.map((step) => step.toReference()),
      source.addressHandle,
      [],
    );
  }

  private recordsForConfigurationSequenceProduct(
    local: string,
    observation: ConfigurationSequenceObservation,
    stepSet: ConfigurationStepEmissionSet,
    source: ConfigurationSourceRecordSet,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    claimHandles: readonly ClaimHandle[],
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return this.publication.configurationProductRecords({
      local: `configuration-sequence:${local}`,
      productHandle,
      identityHandle,
      productKindKey: KernelVocabulary.Configuration.Sequence.key,
      ownerHandle: stepSet.sequenceAurelia?.identityHandle ?? null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: observation.localName,
      claimHandles,
      openSeamHandles,
    });
  }

}

function knownContainerIdentityHandles(containers: readonly Container[]): readonly IdentityHandle[] | null {
  const handles = [...new Set(containers.map((container) => container.identityHandle))];
  return handles.length === 0 ? null : handles;
}
