import path from 'node:path';
import type ts from 'typescript';
import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import { admitSourceFile } from '../boot/boot-workspace.js';
import {
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
import type { KernelStore } from '../kernel/store.js';
import type { StaticModuleEvaluationResult } from './evaluator.js';
import type { StaticEvaluationRuntimeHost } from './evaluator.js';
import { EvaluationKernelEmitter } from './kernel-emitter.js';
import type {
  EvaluationOpenSeamSource,
} from './kernel-emitter.js';
import {
  buildEvaluationModuleGraph,
  FileSystemEvaluationModuleSourceHost,
  type EvaluationModuleResolutionOpen,
} from './module-host.js';
import { StaticModuleGraphEvaluator } from './module-evaluator.js';
import type { StaticModuleExternalValueResolver } from './module-evaluator.js';
import { normalizeModuleKey } from './module-graph.js';
import type { EvaluationOpenSeam } from './seams.js';
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
    /** Product-specific call intrinsics layered on top of generic ECMAScript evaluation. */
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
    /** Product-specific values for declaration/external imports that remain outside the local graph. */
    readonly externalValueResolver: StaticModuleExternalValueResolver | null = null,
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
    const sourceResultsByModuleKey = new Map<string, StaticProjectEvaluationSourceResult>();
    const admissionsByModuleKey = new Map<string, SourceFileAdmission>();
    for (const admission of project.sourceFiles) {
      indexSourceAdmission(admissionsByModuleKey, project, admission);
    }

    for (const admission of project.sourceFiles) {
      if (!isStaticEvaluationAdmission(admission)) {
        continue;
      }

      const moduleKey = normalizeModuleKey(admission.path);
      if (sourceResultsByModuleKey.has(moduleKey)) {
        continue;
      }
      const build = buildEvaluationModuleGraph(moduleKey, host);
      const record = build.graph.readModule(moduleKey);
      if (record == null) {
        const source = new StaticProjectEvaluationSourceResult(admission, moduleKey, null, null, build.unresolvedModules);
        sources.push(source);
        sourceResultsByModuleKey.set(moduleKey, source);
        continue;
      }

      const graphEvaluation = new StaticModuleGraphEvaluator(
        build.graph,
        options.policy,
        options.runtimeHost,
        options.externalValueResolver,
      ).evaluate(moduleKey);
      for (const graphRecord of build.graph.readModules()) {
        const graphModuleKey = normalizeModuleKey(graphRecord.moduleKey);
        if (sourceResultsByModuleKey.has(graphModuleKey)) {
          continue;
        }
        const graphAdmission = admissionsByModuleKey.get(graphModuleKey)
          ?? (kernelEmitter == null
            ? null
            : linkedSourceAdmission(kernelEmitter.store, project, graphRecord.sourceFile));
        if (graphAdmission == null) {
          continue;
        }
        indexSourceAdmission(admissionsByModuleKey, project, graphAdmission);
        admissionsByModuleKey.set(graphModuleKey, graphAdmission);
        admissionsByModuleKey.set(normalizeModuleKey(graphRecord.sourceFile.fileName), graphAdmission);
        const evaluation = graphEvaluation.modules.get(graphModuleKey) ?? null;
        if (evaluation == null) {
          const source = new StaticProjectEvaluationSourceResult(
            graphAdmission,
            graphModuleKey,
            graphRecord.sourceFile,
            null,
            graphModuleKey === moduleKey ? build.unresolvedModules : [],
          );
          sources.push(source);
          sourceResultsByModuleKey.set(graphModuleKey, source);
          continue;
        }

        kernelEmitter?.emitOpenSeams(evaluation, (seam) =>
          resolveOpenSeamSource(kernelEmitter.store, project, admissionsByModuleKey, seam)
        );
        const source = new StaticProjectEvaluationSourceResult(
          graphAdmission,
          graphModuleKey,
          graphRecord.sourceFile,
          evaluation,
          graphModuleKey === moduleKey ? build.unresolvedModules : [],
        );
        sources.push(source);
        sourceResultsByModuleKey.set(graphModuleKey, source);
      }

      if (!sourceResultsByModuleKey.has(moduleKey)) {
        const source = new StaticProjectEvaluationSourceResult(admission, moduleKey, record.sourceFile, null, build.unresolvedModules);
        sources.push(source);
        sourceResultsByModuleKey.set(moduleKey, source);
        continue;
      }
    }

    return new StaticProjectEvaluationResult(project, sources);
  }
}

function resolveOpenSeamSource(
  store: KernelStore,
  project: ProjectBootFrame,
  admissionsByModuleKey: Map<string, SourceFileAdmission>,
  seam: EvaluationOpenSeam,
): EvaluationOpenSeamSource {
  const sourceFile = seam.sourceFile;
  const sourceModuleKey = normalizeModuleKey(sourceFile.fileName);
  const existing = admissionsByModuleKey.get(sourceModuleKey);
  if (existing != null) {
    return {
      sourceFile,
      sourceFileAddressHandle: existing.addressHandle,
    };
  }
  const admitted = linkedSourceAdmission(store, project, sourceFile);
  indexSourceAdmission(admissionsByModuleKey, project, admitted);
  admissionsByModuleKey.set(sourceModuleKey, admitted);
  return {
    sourceFile,
    sourceFileAddressHandle: admitted.addressHandle,
  };
}

function indexSourceAdmission(
  admissionsByModuleKey: Map<string, SourceFileAdmission>,
  project: ProjectBootFrame,
  admission: SourceFileAdmission,
): void {
  admissionsByModuleKey.set(normalizeModuleKey(admission.path), admission);
  admissionsByModuleKey.set(normalizeModuleKey(path.resolve(project.rootDir, admission.path)), admission);
}

function linkedSourceAdmission(
  store: KernelStore,
  project: ProjectBootFrame,
  sourceFile: ts.SourceFile,
): SourceFileAdmission {
  return admitSourceFile(store, project.workspaceRootDir, project.rootDir, project.projectKey, {
    path: sourceFile.fileName,
    note: 'Source file admitted as a static evaluation dependency.',
  });
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

export function isStaticEvaluationAdmission(
  admission: Pick<SourceFileAdmission, 'language' | 'role'>,
): boolean {
  return isStaticEvaluationSource(admission.language) && admission.role === SourceFileRole.AppSource;
}

export function isEvaluatedProjectSource(
  source: StaticProjectEvaluationSourceResult,
): source is EvaluatedProjectSource {
  return source.sourceFile != null && source.evaluation != null;
}
