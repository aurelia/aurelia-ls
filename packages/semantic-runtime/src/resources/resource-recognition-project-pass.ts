import type { KernelStore } from '../kernel/store.js';
import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import type { EvaluationModuleResolutionOpen } from '../evaluation/module-host.js';
import {
  isEvaluatedProjectSource,
  StaticProjectEvaluationPass,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { ResourceRecognitionContext } from './resource-recognition-context.js';
import type { ResourceRecognitionObservation } from './resource-observation.js';
import { ResourceRecognitionPass } from './resource-recognition-pass.js';
import {
  ResourceRecognitionKernelEmission,
} from './resource-recognition-kernel-emitter.js';
import type { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import {
  ResourceDefinitionConvergenceEmission,
} from './resource-definition-converger.js';
import type { FullResourceDefinition } from './resource-definition.js';

/** Resource-recognition result for one boot-admitted source file. */
export class ResourceRecognitionSourceResult {
  constructor(
    /** Source admission that anchored emitted records. */
    readonly admission: SourceFileAdmission,
    /** Resource observations found in the admitted source module. */
    readonly observations: readonly ResourceRecognitionObservation[],
    /** Kernel emission result carrying typed definition-header handles. */
    readonly emission: ResourceRecognitionKernelEmission,
    /** Full definition convergence result for the source. */
    readonly convergence: ResourceDefinitionConvergenceEmission,
    /** Module edges left unresolved while preparing evaluation for this source. */
    readonly unresolvedModules: readonly EvaluationModuleResolutionOpen[],
  ) {}
}

/** Resource-recognition result for one booted project frame. */
export class ResourceRecognitionProjectResult {
  constructor(
    /** Project frame whose source files were recognized. */
    readonly project: ProjectBootFrame,
    /** Per-source recognition results. */
    readonly sources: readonly ResourceRecognitionSourceResult[],
  ) {}

  readObservations(): readonly ResourceRecognitionObservation[] {
    return this.sources.flatMap((source) => source.observations);
  }

  readDefinitionHeaders(): readonly ResourceDefinitionHeaderEmission[] {
    return this.sources.flatMap((source) => source.emission.definitions);
  }

  readDefinitions(): readonly FullResourceDefinition[] {
    return this.sources.flatMap((source) => source.convergence.definitions);
  }

  readUnresolvedModules(): readonly EvaluationModuleResolutionOpen[] {
    return this.sources.flatMap((source) => source.unresolvedModules);
  }
}

/** Run resource recognition over boot-admitted TS/JS sources using graph-linked static evaluation. */
export class ResourceRecognitionProjectPass {
  recognizeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationResult | null = null,
    typeSystem: TypeSystemProject | null = null,
  ): ResourceRecognitionProjectResult {
    const projectEvaluation = evaluation ?? new StaticProjectEvaluationPass().evaluateAndEmit(store, project);
    const recognition = new ResourceRecognitionPass();
    return new ResourceRecognitionProjectResult(
      project,
      projectEvaluation.sources.map((source) =>
        this.recognizeSource(store, project, recognition, source, typeSystem)
      ),
    );
  }

  private recognizeSource(
    store: KernelStore,
    project: ProjectBootFrame,
    recognition: ResourceRecognitionPass,
    source: StaticProjectEvaluationResult['sources'][number],
    typeSystem: TypeSystemProject | null,
  ): ResourceRecognitionSourceResult {
    if (!isEvaluatedProjectSource(source)) {
      return this.openSourceResult(source);
    }
    const result = recognition.recognizeAndEmit(
      store,
      new ResourceRecognitionContext(
        source.sourceFile,
        source.moduleKey,
        source.admission.addressHandle,
        source.evaluation,
        typeSystem,
        project.rootDir,
        project.sourceFiles,
      ),
    );
    return new ResourceRecognitionSourceResult(
      source.admission,
      result.observations,
      result.emission,
      result.convergence,
      source.unresolvedModules,
    );
  }

  private openSourceResult(
    source: StaticProjectEvaluationResult['sources'][number],
  ): ResourceRecognitionSourceResult {
    return new ResourceRecognitionSourceResult(
      source.admission,
      [],
      emptyResourceEmission(),
      emptyDefinitionConvergence(),
      source.unresolvedModules,
    );
  }
}

function emptyResourceEmission(): ResourceRecognitionKernelEmission {
  return new ResourceRecognitionKernelEmission([], []);
}

function emptyDefinitionConvergence(): ResourceDefinitionConvergenceEmission {
  return new ResourceDefinitionConvergenceEmission([], []);
}
