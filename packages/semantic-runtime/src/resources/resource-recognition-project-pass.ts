import { performance } from 'node:perf_hooks';

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
import type {
  ResourceRecognitionPhaseTiming,
  ResourceRecognitionProfile,
} from './resource-recognition-pass.js';
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
    /** Module key used by the static evaluator for this source. */
    readonly moduleKey: string,
    /** Resource observations found in the admitted source module. */
    readonly observations: readonly ResourceRecognitionObservation[],
    /** Kernel emission result carrying typed definition-header handles. */
    readonly emission: ResourceRecognitionKernelEmission,
    /** Full definition convergence result for the source. */
    readonly convergence: ResourceDefinitionConvergenceEmission,
    /** Module edges left unresolved while preparing evaluation for this source. */
    readonly unresolvedModules: readonly EvaluationModuleResolutionOpen[],
    /** Phase timings for this source's recognition work. */
    readonly profile: ResourceRecognitionProfile,
  ) {}
}

export type ResourceRecognitionProjectPhaseName =
  | 'source-file-selection'
  | 'evaluated-source'
  | 'open-source'
  | ResourceRecognitionPhaseTiming['name'];

export interface ResourceRecognitionProjectPhaseTiming {
  readonly name: ResourceRecognitionProjectPhaseName;
  readonly milliseconds: number;
}

export interface ResourceRecognitionProjectProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly ResourceRecognitionProjectPhaseTiming[];
}

/** Resource-recognition result for one booted project frame. */
export class ResourceRecognitionProjectResult {
  constructor(
    /** Project frame whose source files were recognized. */
    readonly project: ProjectBootFrame,
    /** Per-source recognition results. */
    readonly sources: readonly ResourceRecognitionSourceResult[],
    /** Aggregate resource-recognition timings for app-world pressure. */
    readonly profile: ResourceRecognitionProjectProfile,
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
    const started = performance.now();
    const phases: ResourceRecognitionProjectPhaseTiming[] = [];
    const projectEvaluation = evaluation ?? new StaticProjectEvaluationPass().evaluateAndEmit(store, project);
    const recognition = new ResourceRecognitionPass();
    const sourceFiles = measureResourceRecognitionProjectPhase(phases, 'source-file-selection', () =>
      resourceRecognitionSourceFiles(project, projectEvaluation)
    );
    const sources = projectEvaluation.sources.map((source) => {
      const sourceStarted = performance.now();
      const result = this.recognizeSource(store, project, recognition, source, typeSystem, sourceFiles);
      phases.push({
        name: isEvaluatedProjectSource(source) ? 'evaluated-source' : 'open-source',
        milliseconds: performance.now() - sourceStarted,
      });
      phases.push(...result.profile.phases);
      return result;
    });
    return new ResourceRecognitionProjectResult(
      project,
      sources,
      {
        totalMilliseconds: performance.now() - started,
        phases,
      },
    );
  }

  private recognizeSource(
    store: KernelStore,
    project: ProjectBootFrame,
    recognition: ResourceRecognitionPass,
    source: StaticProjectEvaluationResult['sources'][number],
    typeSystem: TypeSystemProject | null,
    sourceFiles: readonly SourceFileAdmission[],
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
        project.projectKey,
        source.evaluation,
        typeSystem,
        project.rootDir,
        sourceFiles,
      ),
    );
    return new ResourceRecognitionSourceResult(
      source.admission,
      source.moduleKey,
      result.observations,
      result.emission,
      result.convergence,
      source.unresolvedModules,
      result.profile,
    );
  }

  private openSourceResult(
    source: StaticProjectEvaluationResult['sources'][number],
  ): ResourceRecognitionSourceResult {
    return new ResourceRecognitionSourceResult(
      source.admission,
      source.moduleKey,
      [],
      emptyResourceEmission(),
      emptyDefinitionConvergence(),
      source.unresolvedModules,
      emptyResourceRecognitionProfile(),
    );
  }
}

function resourceRecognitionSourceFiles(
  project: ProjectBootFrame,
  evaluation: StaticProjectEvaluationResult,
): readonly SourceFileAdmission[] {
  const sourceFiles = new Map(project.sourceFiles.map((source) => [source.addressHandle, source] as const));
  for (const source of evaluation.sources) {
    sourceFiles.set(source.admission.addressHandle, source.admission);
  }
  return [...sourceFiles.values()];
}

function emptyResourceEmission(): ResourceRecognitionKernelEmission {
  return new ResourceRecognitionKernelEmission([], []);
}

function emptyDefinitionConvergence(): ResourceDefinitionConvergenceEmission {
  return new ResourceDefinitionConvergenceEmission([], []);
}

function emptyResourceRecognitionProfile(): ResourceRecognitionProfile {
  return {
    totalMilliseconds: 0,
    phases: [],
  };
}

function measureResourceRecognitionProjectPhase<TValue>(
  phases: ResourceRecognitionProjectPhaseTiming[],
  name: ResourceRecognitionProjectPhaseName,
  read: () => TValue,
): TValue {
  const started = performance.now();
  const value = read();
  phases.push({
    name,
    milliseconds: performance.now() - started,
  });
  return value;
}
