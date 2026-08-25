import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import {
  isEvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import { StaticModuleEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import type { EvaluationModuleResolutionOpen } from '../evaluation/module-host.js';
import { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import type { KernelStore } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  ConfigurationKernelEmission,
  ConfigurationKernelEmitter,
} from './configuration-kernel-emitter.js';
import {
  ConfigurationRecognitionContext,
} from './configuration-recognition-context.js';
import {
  ConfigurationRecognitionPass,
} from './configuration-recognition-pass.js';
import type { ConfigurationSequenceObservation } from './configuration-observation.js';
import {
  ConfigurationEvaluationBindingFrame,
  mergeConfigurationEvaluationBindings,
} from './configuration-evaluation-bindings.js';
import {
  AureliaContainerEvaluationKind,
  type AureliaContainerEvaluation,
} from './aurelia-evaluation-runtime.js';
import { ConfigurationStepKind } from './configuration-sequence.js';

/** Configuration-recognition result for one boot-admitted source file. */
export class ConfigurationRecognitionSourceResult {
  constructor(
    /** Source admission that anchored emitted records. */
    readonly admission: SourceFileAdmission,
    /** Source observations recognized before kernel emission. */
    readonly observations: readonly ConfigurationSequenceObservation[],
    /** Kernel emission result carrying typed configuration and registration products. */
    readonly emission: ConfigurationKernelEmission,
    /** Module edges left unresolved while preparing evaluation for this source. */
    readonly unresolvedModules: readonly EvaluationModuleResolutionOpen[],
  ) {}
}

class ConfigurationRecognitionSourceDraft {
  constructor(
    readonly admission: SourceFileAdmission,
    readonly context: ConfigurationRecognitionContext | null,
    readonly observations: readonly ConfigurationSequenceObservation[],
    readonly unresolvedModules: readonly EvaluationModuleResolutionOpen[],
  ) {}
}

class ConfigurationObservationEmissionRequest {
  constructor(
    readonly moduleOrder: number,
    readonly sourceIndex: number,
    readonly observationIndex: number,
    readonly context: ConfigurationRecognitionContext,
    readonly observation: ConfigurationSequenceObservation,
  ) {}
}

/** Configuration-recognition result for one booted project frame. */
export class ConfigurationRecognitionProjectResult {
  constructor(
    /** Project frame whose source files were recognized. */
    readonly project: ProjectBootFrame,
    /** Static evaluation shared by configuration recognition. */
    readonly evaluation: StaticProjectEvaluationResult,
    /** Per-source recognition results. */
    readonly sources: readonly ConfigurationRecognitionSourceResult[],
    /** Project configuration in modeled ECMAScript execution order, independent from materialization scheduling. */
    private readonly executionConfiguration: ConfigurationKernelEmission,
  ) {}

  readObservations(): readonly ConfigurationSequenceObservation[] {
    return this.sources.flatMap((source) => source.observations);
  }

  readEmissions(): readonly ConfigurationKernelEmission[] {
    return this.sources.map((source) => source.emission);
  }

  readConfiguration(): ConfigurationKernelEmission {
    return this.executionConfiguration;
  }

  readUnresolvedModules(): readonly EvaluationModuleResolutionOpen[] {
    return this.sources.flatMap((source) => source.unresolvedModules);
  }
}

/** Run configuration recognition over boot-admitted TS/JS sources using shared project evaluation. */
export class ConfigurationRecognitionProjectPass {
  recognizeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    resources: ResourceDefinitionIndex | null,
    evaluation: StaticProjectEvaluationResult,
    typeSystem: TypeSystemProject | null,
    publication: KernelPublicationContext,
  ): ConfigurationRecognitionProjectResult {
    const recognition = new ConfigurationRecognitionPass();
    const sourceIndex = new StaticProjectEvaluationSourceIndex(evaluation);
    const drafts = evaluation.sources.map((source) => this.recognizeSource(
      recognition,
      source,
      typeSystem,
      sourceIndex,
    ));
    const evaluationBindings = new ConfigurationEvaluationBindingFrame();
    const emitter = new ConfigurationKernelEmitter(store, publication, evaluationBindings);
    const moduleOrderByKey = new Map(evaluation.evaluationOrderModuleKeys.map((moduleKey, index) => [moduleKey, index]));
    const emissionsBySource = drafts.map((draft) =>
      new Array<ConfigurationKernelEmission | null>(draft.observations.length).fill(null)
    );
    const requests = drafts.flatMap((draft, sourceIndex) => {
      const context = draft.context;
      return context == null
        ? []
        : draft.observations.map((observation, observationIndex) =>
          new ConfigurationObservationEmissionRequest(
            moduleOrderByKey.get(context.moduleKey) ?? Number.MAX_SAFE_INTEGER,
            sourceIndex,
            observationIndex,
            context,
            observation,
          )
        );
    });
    requests.sort(compareConfigurationEmissionRequests);
    for (const request of requests) {
      emissionsBySource[request.sourceIndex]![request.observationIndex] = emitter.emitSequence(
        request.context,
        request.observation,
        request.observationIndex,
        resources,
      );
    }
    const executionEmissions = [...requests]
      .sort(compareConfigurationExecutionRequests)
      .map((request) => emissionsBySource[request.sourceIndex]![request.observationIndex])
      .filter(isConfigurationEmission);
    return new ConfigurationRecognitionProjectResult(
      project,
      evaluation,
      drafts.map((draft, sourceIndex) => new ConfigurationRecognitionSourceResult(
        draft.admission,
        draft.observations,
        aggregateConfigurationEmission(emissionsBySource[sourceIndex]!.filter(isConfigurationEmission)),
        draft.unresolvedModules,
      )),
      aggregateConfigurationEmission(executionEmissions),
    );
  }

  private recognizeSource(
    recognition: ConfigurationRecognitionPass,
    source: StaticProjectEvaluationResult['sources'][number],
    typeSystem: TypeSystemProject | null,
    sourceIndex: StaticProjectEvaluationSourceIndex,
  ): ConfigurationRecognitionSourceDraft {
    if (!isEvaluatedProjectSource(source)) {
      return new ConfigurationRecognitionSourceDraft(
        source.admission,
        null,
        [],
        source.unresolvedModules,
      );
    }
    const context = new ConfigurationRecognitionContext(
      source.sourceFile,
      source.moduleKey,
      source.admission.projectKey,
      source.admission.addressHandle,
      source.evaluation,
      new StaticModuleEvaluationExpressionReader(source.evaluation),
      typeSystem,
      sourceIndex,
    );
    return new ConfigurationRecognitionSourceDraft(
      source.admission,
      context,
      recognition.recognize(context),
      source.unresolvedModules,
    );
  }
}

function compareConfigurationExecutionRequests(
  left: ConfigurationObservationEmissionRequest,
  right: ConfigurationObservationEmissionRequest,
): number {
  const moduleOrder = left.moduleOrder - right.moduleOrder;
  if (moduleOrder !== 0) {
    return moduleOrder;
  }
  const source = left.sourceIndex - right.sourceIndex;
  return source === 0 ? left.observationIndex - right.observationIndex : source;
}

function isConfigurationEmission(
  emission: ConfigurationKernelEmission | null | undefined,
): emission is ConfigurationKernelEmission {
  return emission != null;
}

function compareConfigurationEmissionRequests(
  left: ConfigurationObservationEmissionRequest,
  right: ConfigurationObservationEmissionRequest,
): number {
  const rank = configurationObservationEmissionRank(left.observation)
    - configurationObservationEmissionRank(right.observation);
  if (rank !== 0) {
    return rank;
  }
  const source = left.sourceIndex - right.sourceIndex;
  const moduleOrder = left.moduleOrder - right.moduleOrder;
  if (moduleOrder !== 0) {
    return moduleOrder;
  }
  return source === 0 ? left.observationIndex - right.observationIndex : source;
}

const enum ConfigurationMaterializationRank {
  /** Source-created containers must exist before their registrations and app facades spend them. */
  ContainerCreation = 0,
  /** Direct container registration follows construction while preserving evaluator module order. */
  ContainerRegistration = 100,
  /** Facade construction follows its selected container and precedes every cross-module facade use. */
  FacadeCreation = 200,
  /** Non-container sequences have no evaluator-identity prerequisite. */
  Independent = 300,
  /** Register/app operations against an existing facade follow its exact creation operation. */
  FacadeUse = 500,
}

function configurationObservationEmissionRank(
  observation: ConfigurationSequenceObservation,
): number {
  const createdContainers = observation.steps
    .filter((step) =>
      step.stepKind === ConfigurationStepKind.CreateContainer
      || step.stepKind === ConfigurationStepKind.CreateChildContainer
    )
    .flatMap((step) => step.containerEvaluation == null ? [] : [step.containerEvaluation]);
  if (createdContainers.length > 0) {
    return ConfigurationMaterializationRank.ContainerCreation
      + Math.min(...createdContainers.map(containerEvaluationDepth));
  }

  if (observation.steps.some((step) => step.stepKind === ConfigurationStepKind.ContainerRegister)) {
    return ConfigurationMaterializationRank.ContainerRegistration;
  }

  if (observation.steps.some((step) =>
    step.aureliaEvaluation != null
    && step.aureliaEvaluation.sourceNode === step.sourceNode
  )) {
    return ConfigurationMaterializationRank.FacadeCreation;
  }

  const facadeContainers = observation.steps.flatMap((step) =>
    step.aureliaEvaluation?.containerEvaluation == null
      ? []
      : [step.aureliaEvaluation.containerEvaluation]
  );
  if (facadeContainers.length > 0) {
    return ConfigurationMaterializationRank.FacadeUse;
  }
  return ConfigurationMaterializationRank.Independent;
}

function containerEvaluationDepth(
  evaluation: AureliaContainerEvaluation,
): number {
  let depth = 0;
  let current: AureliaContainerEvaluation | null = evaluation;
  const visited = new Set<AureliaContainerEvaluation>();
  while (current?.kind === AureliaContainerEvaluationKind.AuthoredChild && current.parent != null) {
    if (visited.has(current)) {
      return Number.MAX_SAFE_INTEGER;
    }
    visited.add(current);
    depth += 1;
    current = current.parent;
  }
  return depth;
}

function aggregateConfigurationEmission(
  emissions: readonly ConfigurationKernelEmission[],
): ConfigurationKernelEmission {
  const steps = emissions.flatMap((emission) => emission.steps);
  steps.sort(compareConfigurationStepExecution);
  return new ConfigurationKernelEmission(
    emissions.flatMap((emission) => emission.sequences),
    steps,
    emissions.flatMap((emission) => emission.aurelias),
    emissions.flatMap((emission) => emission.appRoots),
    emissions.flatMap((emission) => emission.containers),
    emissions.flatMap((emission) => emission.appTasks),
    emissions.flatMap((emission) => emission.optionContributions),
    emissions.flatMap((emission) => emission.registrationAdmissions),
    emissions.flatMap((emission) => emission.openSeamScopes),
    mergeConfigurationEvaluationBindings(emissions.map((emission) => emission.evaluationBindings)),
    emissions.flatMap((emission) => emission.records),
  );
}

function compareConfigurationStepExecution(
  left: ConfigurationKernelEmission['steps'][number],
  right: ConfigurationKernelEmission['steps'][number],
): number {
  if (left.executionOrdinal == null) {
    return right.executionOrdinal == null ? 0 : 1;
  }
  return right.executionOrdinal == null
    ? -1
    : left.executionOrdinal - right.executionOrdinal;
}
