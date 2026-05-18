import path from 'node:path';
import { performance } from 'node:perf_hooks';
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
  type EvaluationModuleGraphBuildResult,
  type EvaluationModuleSourceHostProfile,
  type EvaluationModuleResolutionPolicy,
  type EvaluationModuleResolutionOpen,
} from './module-host.js';
import { StaticModuleGraphEvaluator, type StaticModuleGraphEvaluationResult } from './module-evaluator.js';
import type { StaticModuleExternalValueResolver } from './module-evaluator.js';
import { normalizeModuleKey, type EvaluationModuleRecord } from './module-graph.js';
import type { EvaluationOpenSeam } from './seams.js';
import {
  DefaultStaticEvaluationPolicy,
  type StaticEvaluationPolicy,
} from './policy.js';

export type EvaluatedProjectSource = StaticProjectEvaluationSourceResult & {
  readonly sourceFile: ts.SourceFile;
  readonly evaluation: StaticModuleEvaluationResult;
};

export type StaticProjectEvaluationPhaseName =
  | 'admission-index'
  | 'module-graph'
  | 'module-evaluation'
  | 'result-publication';

export interface StaticProjectEvaluationPhaseTiming {
  readonly name: StaticProjectEvaluationPhaseName;
  readonly milliseconds: number;
  readonly itemCount?: number;
}

export interface StaticProjectEvaluationProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly StaticProjectEvaluationPhaseTiming[];
  readonly sourceHost: EvaluationModuleSourceHostProfile;
  readonly sourceFiles: StaticProjectEvaluationSourceFileStats;
}

export interface StaticProjectEvaluationSourceFileStats {
  readonly total: number;
  readonly evaluated: number;
  readonly open: number;
  readonly projectSources: number;
  readonly nodeModuleSources: number;
  readonly externalSources: number;
  readonly typeScriptJavaScriptSources: number;
  readonly assetSources: number;
  readonly sourceTextCharacters: number;
  readonly projectSourceTextCharacters: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly externalSourceTextCharacters: number;
}

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
    /** Timing profile for graph construction, evaluator execution, and result publication. */
    readonly profile: StaticProjectEvaluationProfile,
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
    /** Module-source resolution completeness/performance policy for project-level graph construction. */
    readonly moduleResolutionPolicy?: EvaluationModuleResolutionPolicy,
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
    return new StaticProjectEvaluationFrame(project, kernelEmitter, options).evaluate();
  }
}

class StaticProjectEvaluationFrame {
  private readonly started = performance.now();
  private readonly phases: StaticProjectEvaluationPhaseTiming[] = [];
  private readonly host: FileSystemEvaluationModuleSourceHost;
  private readonly sources: StaticProjectEvaluationSourceResult[] = [];
  private readonly sourceResultsByModuleKey = new Map<string, StaticProjectEvaluationSourceResult>();
  private readonly admissionsByModuleKey = new Map<string, SourceFileAdmission>();

  constructor(
    private readonly project: ProjectBootFrame,
    private readonly kernelEmitter: EvaluationKernelEmitter | null,
    private readonly options: StaticProjectEvaluationOptions,
  ) {
    this.host = new FileSystemEvaluationModuleSourceHost(
      this.project.rootDir,
      undefined,
      this.options.moduleResolutionPolicy,
    );
  }

  evaluate(): StaticProjectEvaluationResult {
    this.indexProjectAdmissions();
    for (const admission of this.project.sourceFiles) {
      this.evaluateAdmission(admission);
    }
    return new StaticProjectEvaluationResult(this.project, this.sources, {
      totalMilliseconds: performance.now() - this.started,
      phases: this.phases,
      sourceHost: this.host.snapshotProfile(),
      sourceFiles: staticProjectEvaluationSourceFileStats(this.project.rootDir, this.sources),
    });
  }

  private indexProjectAdmissions(): void {
    measureStaticProjectEvaluationPhase(
      this.phases,
      'admission-index',
      () => {
        for (const admission of this.project.sourceFiles) {
          indexSourceAdmission(this.admissionsByModuleKey, this.project, admission);
        }
      },
      () => this.project.sourceFiles.length,
    );
  }

  private evaluateAdmission(admission: SourceFileAdmission): void {
    if (!isStaticEvaluationAdmission(admission)) {
      return;
    }

    const moduleKey = normalizeModuleKey(admission.path);
    if (this.sourceResultsByModuleKey.has(moduleKey)) {
      return;
    }
    const build = measureStaticProjectEvaluationPhase(
      this.phases,
      'module-graph',
      () => buildEvaluationModuleGraph(moduleKey, this.host),
      (result) => result.graph.readModules().length,
    );
    const graphModules = build.graph.readModules();
    const record = build.graph.readModule(moduleKey);
    if (record == null) {
      this.publishSourceResult(new StaticProjectEvaluationSourceResult(
        admission,
        moduleKey,
        null,
        null,
        build.unresolvedModules,
      ));
      return;
    }

    const graphEvaluation = measureStaticProjectEvaluationPhase(
      this.phases,
      'module-evaluation',
      () => new StaticModuleGraphEvaluator(
        build.graph,
        this.options.policy,
        this.options.runtimeHost,
        this.options.externalValueResolver,
      ).evaluate(moduleKey),
      (result) => result.modules.size,
    );
    this.publishGraphResults(moduleKey, build, graphEvaluation, graphModules);

    if (!this.sourceResultsByModuleKey.has(moduleKey)) {
      this.publishSourceResult(new StaticProjectEvaluationSourceResult(
        admission,
        moduleKey,
        record.sourceFile,
        null,
        build.unresolvedModules,
      ));
    }
  }

  private publishGraphResults(
    entryModuleKey: string,
    build: EvaluationModuleGraphBuildResult,
    graphEvaluation: StaticModuleGraphEvaluationResult,
    graphModules: readonly EvaluationModuleRecord[],
  ): void {
    measureStaticProjectEvaluationPhase(
      this.phases,
      'result-publication',
      () => {
        for (const graphRecord of graphModules) {
          this.publishGraphRecord(entryModuleKey, build, graphEvaluation, graphRecord);
        }
      },
      () => graphModules.length,
    );
  }

  private publishGraphRecord(
    entryModuleKey: string,
    build: EvaluationModuleGraphBuildResult,
    graphEvaluation: StaticModuleGraphEvaluationResult,
    graphRecord: EvaluationModuleRecord,
  ): void {
    const graphModuleKey = normalizeModuleKey(graphRecord.moduleKey);
    if (this.sourceResultsByModuleKey.has(graphModuleKey)) {
      return;
    }
    const graphAdmission = this.graphRecordAdmission(graphModuleKey, graphRecord.sourceFile);
    if (graphAdmission == null) {
      return;
    }
    const evaluation = graphEvaluation.modules.get(graphModuleKey) ?? null;
    if (evaluation == null) {
      this.publishSourceResult(new StaticProjectEvaluationSourceResult(
        graphAdmission,
        graphModuleKey,
        graphRecord.sourceFile,
        null,
        graphModuleKey === entryModuleKey ? build.unresolvedModules : [],
      ));
      return;
    }

    const kernelEmitter = this.kernelEmitter;
    if (kernelEmitter != null) {
      kernelEmitter.emitOpenSeams(evaluation, (seam) =>
        resolveOpenSeamSource(kernelEmitter.store, this.project, this.admissionsByModuleKey, seam)
      );
    }
    this.publishSourceResult(new StaticProjectEvaluationSourceResult(
      graphAdmission,
      graphModuleKey,
      graphRecord.sourceFile,
      evaluation,
      graphModuleKey === entryModuleKey ? build.unresolvedModules : [],
    ));
  }

  private graphRecordAdmission(
    graphModuleKey: string,
    sourceFile: ts.SourceFile,
  ): SourceFileAdmission | null {
    const existing = this.admissionsByModuleKey.get(graphModuleKey);
    if (existing != null) {
      return existing;
    }
    if (this.kernelEmitter == null) {
      return null;
    }
    const admitted = linkedSourceAdmission(this.kernelEmitter.store, this.project, sourceFile);
    indexSourceAdmission(this.admissionsByModuleKey, this.project, admitted);
    this.admissionsByModuleKey.set(graphModuleKey, admitted);
    this.admissionsByModuleKey.set(normalizeModuleKey(sourceFile.fileName), admitted);
    return admitted;
  }

  private publishSourceResult(source: StaticProjectEvaluationSourceResult): void {
    this.sources.push(source);
    this.sourceResultsByModuleKey.set(source.moduleKey, source);
  }
}

function measureStaticProjectEvaluationPhase<TValue>(
  phases: StaticProjectEvaluationPhaseTiming[],
  name: StaticProjectEvaluationPhaseName,
  read: () => TValue,
  itemCount?: (value: TValue) => number | undefined,
): TValue {
  const started = performance.now();
  const value = read();
  phases.push({
    name,
    milliseconds: performance.now() - started,
    itemCount: itemCount?.(value),
  });
  return value;
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

function staticProjectEvaluationSourceFileStats(
  projectRootDir: string,
  sources: readonly StaticProjectEvaluationSourceResult[],
): StaticProjectEvaluationSourceFileStats {
  const projectRootPath = normalizeModuleKey(path.resolve(projectRootDir)).toLowerCase();
  let evaluated = 0;
  let projectSources = 0;
  let nodeModuleSources = 0;
  let externalSources = 0;
  let typeScriptJavaScriptSources = 0;
  let assetSources = 0;
  let sourceTextCharacters = 0;
  let projectSourceTextCharacters = 0;
  let nodeModuleSourceTextCharacters = 0;
  let externalSourceTextCharacters = 0;

  for (const source of sources) {
    if (isEvaluatedProjectSource(source)) {
      evaluated += 1;
    }
    const fileName = source.sourceFile?.fileName ?? path.resolve(projectRootDir, source.admission.path);
    const normalized = normalizeModuleKey(path.resolve(fileName)).toLowerCase();
    const sourceTextLength = source.sourceFile?.text.length ?? 0;
    const isProjectSource = isNormalizedPathAtOrUnder(normalized, projectRootPath);
    const isNodeModuleSource = normalized.includes('/node_modules/');
    if (isProjectSource) {
      projectSources += 1;
      projectSourceTextCharacters += sourceTextLength;
    } else if (isNodeModuleSource) {
      nodeModuleSources += 1;
      nodeModuleSourceTextCharacters += sourceTextLength;
    } else {
      externalSources += 1;
      externalSourceTextCharacters += sourceTextLength;
    }
    if (isStaticEvaluationSource(source.admission.language)) {
      typeScriptJavaScriptSources += 1;
    } else {
      assetSources += 1;
    }
    sourceTextCharacters += sourceTextLength;
  }

  return {
    total: sources.length,
    evaluated,
    open: sources.length - evaluated,
    projectSources,
    nodeModuleSources,
    externalSources,
    typeScriptJavaScriptSources,
    assetSources,
    sourceTextCharacters,
    projectSourceTextCharacters,
    nodeModuleSourceTextCharacters,
    externalSourceTextCharacters,
  };
}

function isNormalizedPathAtOrUnder(
  normalizedPath: string,
  normalizedRoot: string,
): boolean {
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
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
