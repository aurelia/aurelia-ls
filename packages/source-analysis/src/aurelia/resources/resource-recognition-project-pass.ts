import { SourceLanguage } from '../kernel/address.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import { EvaluationKernelBridge } from '../evaluation/kernel-bridge.js';
import {
  buildEvaluationModuleGraph,
  FileSystemEvaluationModuleSourceHost,
  type EvaluationModuleResolutionOpen,
} from '../evaluation/module-host.js';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import { StaticModuleGraphEvaluator } from '../evaluation/module-evaluator.js';
import { ResourceRecognitionContext } from './resource-recognition-context.js';
import type { ResourceRecognitionObservation } from './resource-observation.js';
import { ResourceRecognitionPass } from './resource-recognition-pass.js';
import {
  ResourceRecognitionKernelEmission,
  type ResourceDefinitionHeaderEmission,
} from './resource-recognition-kernel-emitter.js';

/** Resource-recognition result for one boot-admitted source file. */
export class ResourceRecognitionSourceResult {
  constructor(
    /** Source admission that anchored emitted records. */
    readonly admission: SourceFileAdmission,
    /** Resource observations found in the admitted source module. */
    readonly observations: readonly ResourceRecognitionObservation[],
    /** Kernel emission result carrying typed definition-header handles. */
    readonly emission: ResourceRecognitionKernelEmission,
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

  readUnresolvedModules(): readonly EvaluationModuleResolutionOpen[] {
    return this.sources.flatMap((source) => source.unresolvedModules);
  }
}

/** Run resource recognition over boot-admitted TS/JS sources using graph-linked static evaluation. */
export class ResourceRecognitionProjectPass {
  recognizeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
  ): ResourceRecognitionProjectResult {
    const host = new FileSystemEvaluationModuleSourceHost(project.rootDir);
    const evaluationBridge = new EvaluationKernelBridge(store);
    const recognition = new ResourceRecognitionPass();
    const sources: ResourceRecognitionSourceResult[] = [];

    for (const admission of project.sourceFiles) {
      if (!isStaticEvaluationSource(admission.language)) {
        continue;
      }

      const moduleKey = normalizeModuleKey(admission.path);
      const build = buildEvaluationModuleGraph(moduleKey, host);
      const record = build.graph.readModule(moduleKey);
      if (record == null) {
        sources.push(new ResourceRecognitionSourceResult(admission, [], emptyResourceEmission(), build.unresolvedModules));
        continue;
      }

      const graphEvaluation = new StaticModuleGraphEvaluator(build.graph).evaluate(moduleKey);
      const moduleEvaluation = graphEvaluation.modules.get(moduleKey) ?? null;
      if (moduleEvaluation == null) {
        sources.push(new ResourceRecognitionSourceResult(admission, [], emptyResourceEmission(), build.unresolvedModules));
        continue;
      }

      evaluationBridge.emitOpenSeams(record.sourceFile, admission.addressHandle, moduleEvaluation);
      const result = recognition.recognizeAndEmit(
        store,
        new ResourceRecognitionContext(
          record.sourceFile,
          moduleKey,
          admission.addressHandle,
          moduleEvaluation,
        ),
      );
      sources.push(new ResourceRecognitionSourceResult(
        admission,
        result.observations,
        result.emission,
        build.unresolvedModules,
      ));
    }

    return new ResourceRecognitionProjectResult(project, sources);
  }
}

function isStaticEvaluationSource(language: SourceLanguage): boolean {
  switch (language) {
    case SourceLanguage.TypeScript:
    case SourceLanguage.JavaScript:
      return true;
    default:
      return false;
  }
}

function emptyResourceEmission(): ResourceRecognitionKernelEmission {
  return new ResourceRecognitionKernelEmission([], []);
}
