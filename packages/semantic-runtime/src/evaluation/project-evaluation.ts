import type ts from 'typescript';
import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import { SourceLanguage } from '../kernel/address.js';
import type { KernelStore } from '../kernel/store.js';
import type { StaticModuleEvaluationResult } from './evaluator.js';
import { EvaluationKernelEmitter } from './kernel-emitter.js';
import {
  buildEvaluationModuleGraph,
  FileSystemEvaluationModuleSourceHost,
  type EvaluationModuleResolutionOpen,
} from './module-host.js';
import { StaticModuleGraphEvaluator } from './module-evaluator.js';
import { normalizeModuleKey } from './module-graph.js';
import {
  DefaultStaticEvaluationPolicy,
  type StaticEvaluationPolicy,
} from './policy.js';

export type EvaluatedProjectSource = StaticProjectEvaluationSourceResult & {
  readonly sourceFile: ts.SourceFile;
  readonly evaluation: StaticModuleEvaluationResult;
};

/** Static-evaluation result for one boot-admitted source file. */
export class StaticProjectEvaluationSourceResult {
  constructor(
    /** Source admission that anchored evaluation. */
    readonly admission: SourceFileAdmission,
    /** Module key used by the static evaluator. */
    readonly moduleKey: string,
    /** Parsed source file when module graph construction reached the admission. */
    readonly sourceFile: ts.SourceFile | null,
    /** Static evaluator result for the admitted module when evaluation closed enough for materializers. */
    readonly evaluation: StaticModuleEvaluationResult | null,
    /** Module edges left unresolved while preparing evaluation for this source. */
    readonly unresolvedModules: readonly EvaluationModuleResolutionOpen[],
  ) {}
}

/** Static-evaluation result for one booted project frame. */
export class StaticProjectEvaluationResult {
  constructor(
    /** Project frame whose TS/JS source files were evaluated. */
    readonly project: ProjectBootFrame,
    /** Per-source static-evaluation results. */
    readonly sources: readonly StaticProjectEvaluationSourceResult[],
  ) {}

  readEvaluatedSources(): readonly EvaluatedProjectSource[] {
    return this.sources.filter(isEvaluatedProjectSource);
  }

  readUnresolvedModules(): readonly EvaluationModuleResolutionOpen[] {
    return this.sources.flatMap((source) => source.unresolvedModules);
  }
}

export class StaticProjectEvaluationOptions {
  constructor(
    /** Product-specific ownership hooks for source effects that are intentionally modeled by later passes. */
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
  ) {}
}

/** Project-level static evaluation shared by Aurelia semantic passes. */
export class StaticProjectEvaluationPass {
  evaluate(
    project: ProjectBootFrame,
    options: StaticProjectEvaluationOptions = new StaticProjectEvaluationOptions(),
  ): StaticProjectEvaluationResult {
    return this.evaluateCore(project, null, options);
  }

  evaluateAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    options: StaticProjectEvaluationOptions = new StaticProjectEvaluationOptions(),
  ): StaticProjectEvaluationResult {
    return this.evaluateCore(project, new EvaluationKernelEmitter(store), options);
  }

  private evaluateCore(
    project: ProjectBootFrame,
    kernelEmitter: EvaluationKernelEmitter | null,
    options: StaticProjectEvaluationOptions,
  ): StaticProjectEvaluationResult {
    const host = new FileSystemEvaluationModuleSourceHost(project.rootDir);
    const sources: StaticProjectEvaluationSourceResult[] = [];

    for (const admission of project.sourceFiles) {
      if (!isStaticEvaluationSource(admission.language)) {
        continue;
      }

      const moduleKey = normalizeModuleKey(admission.path);
      const build = buildEvaluationModuleGraph(moduleKey, host);
      const record = build.graph.readModule(moduleKey);
      if (record == null) {
        sources.push(new StaticProjectEvaluationSourceResult(admission, moduleKey, null, null, build.unresolvedModules));
        continue;
      }

      const graphEvaluation = new StaticModuleGraphEvaluator(build.graph, options.policy).evaluate(moduleKey);
      const evaluation = graphEvaluation.modules.get(moduleKey) ?? null;
      if (evaluation == null) {
        sources.push(new StaticProjectEvaluationSourceResult(admission, moduleKey, record.sourceFile, null, build.unresolvedModules));
        continue;
      }

      kernelEmitter?.emitOpenSeams(record.sourceFile, admission.addressHandle, evaluation);
      sources.push(new StaticProjectEvaluationSourceResult(
        admission,
        moduleKey,
        record.sourceFile,
        evaluation,
        build.unresolvedModules,
      ));
    }

    return new StaticProjectEvaluationResult(project, sources);
  }
}

export function isStaticEvaluationSource(language: SourceLanguage): boolean {
  switch (language) {
    case SourceLanguage.TypeScript:
    case SourceLanguage.JavaScript:
      return true;
    default:
      return false;
  }
}

export function isEvaluatedProjectSource(
  source: StaticProjectEvaluationSourceResult,
): source is EvaluatedProjectSource {
  return source.sourceFile != null && source.evaluation != null;
}
