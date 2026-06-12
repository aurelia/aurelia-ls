import type {
  AddressHandle,
} from '../kernel/handles.js';
import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import {
  isEvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import type { EvaluationModuleResolutionOpen } from '../evaluation/module-host.js';
import type { KernelStore } from '../kernel/store.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  ConfigurationKernelEmission,
} from './configuration-kernel-emitter.js';
import {
  ConfigurationRecognitionContext,
} from './configuration-recognition-context.js';
import {
  ConfigurationRecognitionPass,
  type ConfigurationRecognitionResult,
} from './configuration-recognition-pass.js';
import {
  evaluateAndEmitAureliaProject,
} from './aurelia-project-evaluation.js';
import type { ConfigurationSequenceObservation } from './configuration-observation.js';
import { normalizeConfigurationSourceFileName } from './source-file-names.js';

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

/** Configuration-recognition result for one booted project frame. */
export class ConfigurationRecognitionProjectResult {
  constructor(
    /** Project frame whose source files were recognized. */
    readonly project: ProjectBootFrame,
    /** Static evaluation shared by configuration recognition. */
    readonly evaluation: StaticProjectEvaluationResult,
    /** Per-source recognition results. */
    readonly sources: readonly ConfigurationRecognitionSourceResult[],
  ) {}

  readObservations(): readonly ConfigurationSequenceObservation[] {
    return this.sources.flatMap((source) => source.observations);
  }

  readEmissions(): readonly ConfigurationKernelEmission[] {
    return this.sources.map((source) => source.emission);
  }

  readConfiguration(): ConfigurationKernelEmission {
    return aggregateConfigurationEmission(this.readEmissions());
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
    resources: ResourceDefinitionIndex | null = null,
    evaluation: StaticProjectEvaluationResult | null = null,
    typeSystem: TypeSystemProject | null = null,
  ): ConfigurationRecognitionProjectResult {
    const projectEvaluation = evaluation ?? evaluateAndEmitAureliaProject(store, project);
    const recognition = new ConfigurationRecognitionPass();
    const sourceFileAddressHandlesByFileName = readSourceFileAddressHandlesByFileName(projectEvaluation);
    return new ConfigurationRecognitionProjectResult(
      project,
      projectEvaluation,
      projectEvaluation.sources.map((source) =>
        this.recognizeSource(store, recognition, source, resources, typeSystem, sourceFileAddressHandlesByFileName)
      ),
    );
  }

  private recognizeSource(
    store: KernelStore,
    recognition: ConfigurationRecognitionPass,
    source: StaticProjectEvaluationResult['sources'][number],
    resources: ResourceDefinitionIndex | null,
    typeSystem: TypeSystemProject | null,
    sourceFileAddressHandlesByFileName: ReadonlyMap<string, AddressHandle>,
  ): ConfigurationRecognitionSourceResult {
    if (!isEvaluatedProjectSource(source)) {
      return new ConfigurationRecognitionSourceResult(
        source.admission,
        [],
        emptyConfigurationEmission(),
        source.unresolvedModules,
      );
    }
    const result: ConfigurationRecognitionResult = recognition.recognizeAndEmit(
      store,
      new ConfigurationRecognitionContext(
        source.sourceFile,
        source.moduleKey,
        source.admission.projectKey,
        source.admission.addressHandle,
        source.evaluation,
        typeSystem,
        sourceFileAddressHandlesByFileName,
      ),
      resources,
    );
    return new ConfigurationRecognitionSourceResult(
      source.admission,
      result.observations,
      result.emission,
      source.unresolvedModules,
    );
  }
}

export function readSourceFileAddressHandlesByFileName(
  evaluation: StaticProjectEvaluationResult,
): ReadonlyMap<string, AddressHandle> {
  const result = new Map<string, AddressHandle>();
  for (const source of evaluation.sources) {
    if (source.sourceFile == null) {
      continue;
    }
    result.set(normalizeConfigurationSourceFileName(source.sourceFile.fileName), source.admission.addressHandle);
  }
  return result;
}

function aggregateConfigurationEmission(
  emissions: readonly ConfigurationKernelEmission[],
): ConfigurationKernelEmission {
  return new ConfigurationKernelEmission(
    emissions.flatMap((emission) => emission.sequences),
    emissions.flatMap((emission) => emission.steps),
    emissions.flatMap((emission) => emission.aurelias),
    emissions.flatMap((emission) => emission.appRoots),
    emissions.flatMap((emission) => emission.containers),
    emissions.flatMap((emission) => emission.appTasks),
    emissions.flatMap((emission) => emission.optionContributions),
    emissions.flatMap((emission) => emission.registrationAdmissions),
    emissions.flatMap((emission) => emission.records),
  );
}

function emptyConfigurationEmission(): ConfigurationKernelEmission {
  return aggregateConfigurationEmission([]);
}
