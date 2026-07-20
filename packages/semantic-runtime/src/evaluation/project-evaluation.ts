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
import type { KernelPublicationContext } from '../kernel/publication.js';
import {
  ComputationCommitState,
  type ComputationGenerationAuthority,
  type ComputationLifecycleRegistry,
  type ComputationLocus,
  type ComputationRead,
  type ComputationReadValidation,
} from '../kernel/computation-lifecycle.js';
import type { ProductHandle } from '../kernel/handles.js';
import type {
  SemanticRuntimeProjectInputReadScope,
} from '../kernel/project-input.js';
import type {
  KernelStore,
  KernelStoreDisposalContext,
  KernelStoreSidecarIndex,
} from '../kernel/store.js';
import type { StaticEvaluationRuntimeHost } from './evaluator.js';
import type { StaticModuleEvaluationResult } from './module-evaluation-result.js';
import { EvaluationKernelEmitter } from './kernel-emitter.js';
import type {
  EvaluationOpenSeamSource,
} from './kernel-emitter.js';
import {
  buildEvaluationModuleGraphForEntries,
  FileSystemEvaluationModuleSourceHost,
  type EvaluationModuleGraphBuildResult,
  type EvaluationModuleSourceHostProfile,
  type EvaluationModuleResolutionPolicy,
  type EvaluationModuleResolutionOpen,
} from './module-host.js';
import { StaticModuleGraphEvaluator, type StaticModuleGraphEvaluationResult } from './module-evaluator.js';
import type { StaticModuleExternalValueResolver } from './module-evaluator.js';
import {
  normalizeModuleKey,
  type EvaluationModuleGraph,
  type EvaluationModuleRecord,
} from './module-graph.js';
import type { EvaluationOpenSeam } from './seams.js';
import {
  DefaultStaticEvaluationPolicy,
  type StaticEvaluationPolicy,
} from './policy.js';
import {
  readStaticEvaluationAmbientGlobalDeclarations,
  type StaticEvaluationAmbientGlobalDeclarations,
  withStaticEvaluationAmbientGlobals,
} from './ambient-globals.js';
import { StaticEvaluationSessionFork } from './evaluation-session.js';
import { DefaultStaticEvaluationRuntimeHost } from './runtime-host.js';
import type { EvaluationUnknownValue } from './values.js';

export type EvaluatedProjectSource = StaticProjectEvaluationSourceResult & {
  readonly sourceFile: ts.SourceFile;
  readonly evaluation: StaticModuleEvaluationResult;
};

export type StaticProjectEvaluationPhaseName =
  | 'admission-index'
  | 'ambient-globals'
  | 'module-graph'
  | 'module-evaluation'
  | 'result-publication';

export interface StaticProjectEvaluationPhaseTiming {
  readonly name: StaticProjectEvaluationPhaseName;
  readonly milliseconds: number;
  readonly itemCount?: number;
}

export interface StaticProjectEvaluationPerformanceProfile {
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

export const enum StaticProjectEvaluationSourceOriginKind {
  /** The module was evaluated because boot admitted it as an app-world TS/JS source root. */
  StaticEvaluationRoot = 'static-evaluation-root',
  /** The module was reached through a runtime import/export edge from another evaluation root. */
  ModuleGraphDependency = 'module-graph-dependency',
}

/** Compact query-time provenance for why one source participated in static project evaluation. */
export class StaticProjectEvaluationSourceOrigin {
  constructor(
    /** Evaluation origin category for this source contribution. */
    readonly kind: StaticProjectEvaluationSourceOriginKind,
    /** Module key of the root that caused this contribution. */
    readonly entryModuleKey: string,
    /** Project-relative path for the entry source when known. */
    readonly entrySourcePath: string | null,
  ) {}
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
    /** Compact reasons this source entered static project evaluation. */
    readonly origins: readonly StaticProjectEvaluationSourceOrigin[] = [],
  ) {}
}

/** Static-evaluation result for one booted project frame. */
export class StaticProjectEvaluationResult {
  constructor(
    /** Project frame whose TS/JS source files were evaluated. */
    readonly project: ProjectBootFrame,
    /** Per-source static-evaluation results. */
    readonly sources: readonly StaticProjectEvaluationSourceResult[],
    /** Module keys in the order their modeled execution completed, dependencies before their importing entry. */
    readonly evaluationOrderModuleKeys: readonly string[],
    /** Timing profile for graph construction, evaluator execution, and result publication. */
    readonly profile: StaticProjectEvaluationPerformanceProfile,
    /** Project-level import/export/cycle values whose module linkage remained open. */
    readonly graphOpenValues: readonly EvaluationUnknownValue[] = [],
    /** Exact project-input reads made while constructing this evaluator graph. */
    private readonly inputReadScope: SemanticRuntimeProjectInputReadScope | null = null,
    /** Typed upstream products consumed while constructing this evaluator graph. */
    private readonly upstreamReads: readonly ComputationRead[] = [],
  ) {}

  readEvaluatedSources(): readonly EvaluatedProjectSource[] {
    return this.sources.filter(isEvaluatedProjectSource);
  }

  readUnresolvedModules(): readonly EvaluationModuleResolutionOpen[] {
    return this.sources.flatMap((source) => source.unresolvedModules);
  }

  readRegisteredInputs(): readonly ComputationRead[] {
    return [
      ...this.upstreamReads,
      ...(this.inputReadScope?.readRegisteredInputs() ?? []),
    ];
  }

  /** Fork mutable evaluator values and environments for one speculative follow-up analysis session. */
  forkSession(): StaticProjectEvaluationResult {
    const runtimeHost = this.readEvaluatedSources()[0]?.evaluation.runtimeHost
      ?? DefaultStaticEvaluationRuntimeHost;
    const session = new StaticEvaluationSessionFork(runtimeHost);
    return new StaticProjectEvaluationResult(
      this.project,
      this.sources.map((source) => isEvaluatedProjectSource(source)
        ? new StaticProjectEvaluationSourceResult(
            source.admission,
            source.moduleKey,
            source.sourceFile,
            session.forkModuleEvaluation(source.evaluation),
            source.unresolvedModules,
            source.origins,
          )
        : source),
      this.evaluationOrderModuleKeys,
      this.profile,
      this.graphOpenValues.map((value) => session.forkValue(value)),
      this.inputReadScope,
      this.upstreamReads,
    );
  }
}

export class StaticProjectEvaluationOptions {
  constructor(
    /** Product-specific ownership hooks for source effects that are intentionally modeled by later passes. */
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    /** Product-specific call intrinsics layered on top of generic ECMAScript evaluation. */
    readonly runtimeHost: StaticEvaluationRuntimeHost = DefaultStaticEvaluationRuntimeHost,
    /** Product-specific values for declaration/external imports that remain outside the local graph. */
    readonly externalValueResolver: StaticModuleExternalValueResolver | null = null,
    /** Module-source resolution completeness/performance policy for project-level graph construction. */
    readonly moduleResolutionPolicy?: EvaluationModuleResolutionPolicy,
    /** Boot source roles admitted as graph roots for this evaluation pass. */
    readonly admittedSourceRoles: readonly SourceFileRole[] = [SourceFileRole.AppSource],
  ) {}
}

/** Options plus profile-owned interpretation state prepared for one evaluation run. */
export class StaticProjectEvaluationComputationPreparation<TContext> {
  constructor(
    readonly options: StaticProjectEvaluationOptions,
    readonly context: TContext,
  ) {}
}

/** Stable semantic profile for one family of project-evaluation computations. */
export class StaticProjectEvaluationComputationProfile<TContext> implements ComputationRead {
  readonly domain = 'static-project-evaluation-profile';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    readonly key: string,
    readonly revision: string,
    readonly summary: string,
    private readonly prepareRun: () => StaticProjectEvaluationComputationPreparation<TContext>,
  ) {
    this.readKey = `static-project-evaluation-profile:${key}`;
    this.observedRevision = revision;
  }

  prepare(): StaticProjectEvaluationComputationPreparation<TContext> {
    return this.prepareRun();
  }

  validate(): ComputationReadValidation {
    return {
      isCurrent: true,
      currentRevision: this.observedRevision,
      changedFacets: [],
    };
  }
}

export const enum StaticProjectEvaluationAcquisitionKind {
  /** A new project/profile generation was evaluated and committed. */
  Computed = 'computed',
  /** The current project/profile generation was reused without evaluator execution. */
  Reused = 'reused',
}

/** One acquisition of a reusable project-evaluation generation. */
export class StaticProjectEvaluationAccess<TContext> {
  constructor(
    readonly generation: StaticProjectEvaluationGeneration<TContext>,
    readonly kind: StaticProjectEvaluationAcquisitionKind,
    readonly milliseconds: number,
  ) {}

  readProfile(): StaticProjectEvaluationAcquisitionProfile {
    return new StaticProjectEvaluationAcquisitionProfile(
      this.generation.profileKey,
      this.kind,
      this.milliseconds,
      this.generation.readConstructionProfile().totalMilliseconds,
    );
  }
}

/** Per-consumer timing and reuse facts for one acquired evaluator generation. */
export class StaticProjectEvaluationAcquisitionProfile {
  constructor(
    readonly profileKey: string,
    readonly kind: StaticProjectEvaluationAcquisitionKind,
    readonly milliseconds: number,
    readonly constructionMilliseconds: number,
  ) {}
}

/** Stable replacement locus for ambient declarations shared by every evaluator profile of one project. */
class StaticEvaluationAmbientGlobalLocus implements ComputationLocus {
  readonly kind = 'static-evaluation-ambient-globals';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(readonly projectKey: string) {
    this.reconciliationKey = projectKey;
    this.summary = `Static-evaluation ambient globals for ${projectKey}.`;
  }
}

class StaticEvaluationAmbientGlobalAuthority {
  private generation: StaticEvaluationAmbientGlobalGeneration | null = null;

  constructor(readonly projectKey: string) {}

  current(project: ProjectBootFrame): StaticEvaluationAmbientGlobalGeneration | null {
    const generation = this.currentGeneration();
    return generation?.project.observedRevision === project.observedRevision
        && generation.validate().isCurrent
      ? generation
      : null;
  }

  currentGeneration(): StaticEvaluationAmbientGlobalGeneration | null {
    if (this.generation != null && !this.isCurrent(this.generation)) {
      this.generation = null;
    }
    return this.generation;
  }

  accept(
    authority: ComputationGenerationAuthority,
    project: ProjectBootFrame,
    declarations: StaticEvaluationAmbientGlobalDeclarations,
    inputReadScope: SemanticRuntimeProjectInputReadScope,
  ): StaticEvaluationAmbientGlobalGeneration {
    const generation = new StaticEvaluationAmbientGlobalGeneration(
      this,
      authority,
      project,
      declarations,
      inputReadScope,
    );
    this.generation = generation;
    return generation;
  }

  isCurrent(generation: StaticEvaluationAmbientGlobalGeneration): boolean {
    return this.generation === generation
      && generation.computationAuthority.isCurrent()
      && generation.project.inputGeneration.isCurrent();
  }

  currentRevision(): string {
    return this.currentGeneration()?.observedRevision ?? 'absent';
  }
}

/** Current project/compiler ambient declaration set and the exact source reads that produced it. */
class StaticEvaluationAmbientGlobalGeneration implements ComputationRead {
  readonly domain = 'static-evaluation-ambient-globals';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    private readonly owner: StaticEvaluationAmbientGlobalAuthority,
    readonly computationAuthority: ComputationGenerationAuthority,
    readonly project: ProjectBootFrame,
    private readonly declarations: StaticEvaluationAmbientGlobalDeclarations,
    private readonly inputReadScope: SemanticRuntimeProjectInputReadScope,
  ) {
    this.readKey = `static-evaluation-ambient-globals:${project.projectKey}`;
    this.observedRevision = `${project.observedRevision}:${computationAuthority.key}`;
  }

  readDeclarations(): StaticEvaluationAmbientGlobalDeclarations {
    if (!this.owner.isCurrent(this)) {
      throw new Error(`Ambient-global generation ${this.readKey}@${this.observedRevision} is no longer current.`);
    }
    return this.declarations;
  }

  validate(): ComputationReadValidation {
    const generationCurrent = this.owner.isCurrent(this);
    const invalidInputs = [
      this.project.validate(),
      ...this.inputReadScope.readRegisteredInputs().map((read) => read.validate()),
    ].filter((validation) => !validation.isCurrent);
    const isCurrent = generationCurrent && invalidInputs.length === 0;
    return {
      isCurrent,
      currentRevision: isCurrent
        ? this.observedRevision
        : generationCurrent
          ? `${this.observedRevision}:inputs-changed`
          : this.owner.currentRevision(),
      changedFacets: isCurrent
        ? []
        : !generationCurrent
          ? ['generation']
          : [...new Set(invalidInputs.flatMap((validation) => validation.changedFacets))],
    };
  }
}

class StaticEvaluationAmbientGlobalAccess {
  constructor(
    readonly generation: StaticEvaluationAmbientGlobalGeneration,
    readonly kind: StaticProjectEvaluationAcquisitionKind,
    readonly milliseconds: number,
  ) {}
}

/** Stable replacement locus for one project and evaluation-profile family. */
export class StaticProjectEvaluationLocus implements ComputationLocus {
  readonly kind = 'static-project-evaluation';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(
    readonly projectKey: string,
    readonly profileKey: string,
  ) {
    this.reconciliationKey = `${projectKey}\0${profileKey}`;
    this.summary = `Static project evaluation for ${projectKey} using profile ${profileKey}.`;
  }
}

class StaticProjectEvaluationAuthority {
  private generation: StaticProjectEvaluationGeneration<unknown> | null = null;

  constructor(
    readonly projectKey: string,
    readonly profileKey: string,
  ) {}

  current<TContext>(
    project: ProjectBootFrame,
    profile: StaticProjectEvaluationComputationProfile<TContext>,
  ): StaticProjectEvaluationGeneration<TContext> | null {
    const generation = this.currentGeneration();
    return generation?.project.observedRevision === project.observedRevision
        && generation.profileRevision === profile.revision
        && generation.validate().isCurrent
      ? generation as StaticProjectEvaluationGeneration<TContext>
      : null;
  }

  currentGeneration(): StaticProjectEvaluationGeneration<unknown> | null {
    if (this.generation != null && !this.isCurrent(this.generation)) {
      this.generation = null;
    }
    return this.generation;
  }

  accept<TContext>(
    authority: ComputationGenerationAuthority,
    project: ProjectBootFrame,
    profile: StaticProjectEvaluationComputationProfile<TContext>,
    result: StaticProjectEvaluationResult,
    context: TContext,
  ): StaticProjectEvaluationGeneration<TContext> {
    const generation = new StaticProjectEvaluationGeneration(
      this,
      authority,
      project,
      profile,
      result,
      context,
    );
    this.generation = generation as StaticProjectEvaluationGeneration<unknown>;
    return generation;
  }

  isCurrent(generation: StaticProjectEvaluationGeneration<unknown>): boolean {
    return this.generation === generation
      && generation.computationAuthority.isCurrent()
      && generation.project.inputGeneration.isCurrent();
  }

  currentRevision(): string {
    return this.currentGeneration()?.observedRevision ?? 'absent';
  }
}

/** Current reusable evaluator graph plus the exact computation read consumed by dependents. */
export class StaticProjectEvaluationGeneration<TContext> implements ComputationRead {
  readonly domain = 'static-project-evaluation-generation';
  readonly readKey: string;
  readonly observedRevision: string;
  readonly profileKey: string;
  readonly profileRevision: string;

  constructor(
    private readonly owner: StaticProjectEvaluationAuthority,
    readonly computationAuthority: ComputationGenerationAuthority,
    readonly project: ProjectBootFrame,
    private readonly profile: StaticProjectEvaluationComputationProfile<TContext>,
    private readonly baseline: StaticProjectEvaluationResult,
    private readonly context: TContext,
  ) {
    this.profileKey = profile.key;
    this.profileRevision = profile.revision;
    this.readKey = `static-project-evaluation-generation:${project.projectKey}:${profile.key}`;
    this.observedRevision = `${project.observedRevision}:${profile.revision}:${computationAuthority.key}`;
  }

  isCurrent(): boolean {
    return this.owner.isCurrent(this as StaticProjectEvaluationGeneration<unknown>);
  }

  requireCurrent(): void {
    if (!this.isCurrent()) {
      throw new Error(`Static project evaluation ${this.readKey}@${this.observedRevision} is no longer current.`);
    }
  }

  /**
   * Read the admitted evaluator graph without cloning it.
   *
   * This is only for consumers that inspect evaluator facts without executing evaluator functions or mutating values.
   * Candidate analyses must use {@link forkSession}.
   */
  readBaseline(): StaticProjectEvaluationResult {
    this.requireCurrent();
    return this.baseline;
  }

  /** Fork one candidate-owned evaluator graph from the admitted reusable baseline. */
  forkSession(): StaticProjectEvaluationResult {
    this.requireCurrent();
    return this.baseline.forkSession();
  }

  readConstructionProfile(): StaticProjectEvaluationPerformanceProfile {
    this.requireCurrent();
    return this.baseline.profile;
  }

  /** Read profile-owned interpretation state only alongside the admitted baseline graph it indexes. */
  readBaselineContext(): TContext {
    this.requireCurrent();
    return this.context;
  }

  validate(): ComputationReadValidation {
    const generationCurrent = this.isCurrent();
    const invalidInputs = this.inputClosureValidations().filter((validation) => !validation.isCurrent);
    const isCurrent = generationCurrent && invalidInputs.length === 0;
    return {
      isCurrent,
      currentRevision: isCurrent
        ? this.observedRevision
        : generationCurrent
          ? `${this.observedRevision}:inputs-changed`
          : this.owner.currentRevision(),
      changedFacets: isCurrent
        ? []
        : !generationCurrent
          ? ['generation']
          : [...new Set(invalidInputs.flatMap((validation) => validation.changedFacets))],
    };
  }

  private inputClosureValidations(): readonly ComputationReadValidation[] {
    return [
      this.project.validate(),
      this.profile.validate(),
      ...this.baseline.readRegisteredInputs().map((read) => read.validate()),
    ];
  }
}

/** Owns one committed evaluator graph per project/profile locus. */
export class StaticProjectEvaluationComputationService implements KernelStoreSidecarIndex {
  private readonly authoritiesByLocus = new Map<string, StaticProjectEvaluationAuthority>();
  private readonly ambientAuthoritiesByProject = new Map<string, StaticEvaluationAmbientGlobalAuthority>();
  private readonly profilesByKey = new Map<string, StaticProjectEvaluationComputationProfile<unknown>>();
  readonly key = 'static-project-evaluation-generations';
  readonly summary = 'Current reusable static project-evaluation generations by project and semantic profile.';

  constructor(
    private readonly store: KernelStore,
    private readonly lifecycle: ComputationLifecycleRegistry,
  ) {
    store.registerSidecarIndex(this);
  }

  readEntryCount(): number {
    return [...this.authoritiesByLocus.values()]
      .filter((authority) => authority.currentGeneration() != null).length;
  }

  dispose(_context: KernelStoreDisposalContext): void {
    for (const [key, authority] of this.authoritiesByLocus) {
      if (authority.currentGeneration() == null) {
        this.authoritiesByLocus.delete(key);
      }
    }
    for (const [key, authority] of this.ambientAuthoritiesByProject) {
      if (authority.currentGeneration() == null) {
        this.ambientAuthoritiesByProject.delete(key);
      }
    }
  }

  hasProductDetail(_productHandle: ProductHandle): boolean {
    return false;
  }

  acquire<TContext>(
    project: ProjectBootFrame,
    profile: StaticProjectEvaluationComputationProfile<TContext>,
  ): StaticProjectEvaluationAccess<TContext> {
    project.requireCurrent();
    this.requireProfileOwnership(profile);
    const started = performance.now();
    const authority = this.authorityFor(project.projectKey, profile.key);
    const current = authority.current(project, profile);
    if (current != null) {
      return new StaticProjectEvaluationAccess(
        current,
        StaticProjectEvaluationAcquisitionKind.Reused,
        performance.now() - started,
      );
    }

    const ambientAccess = this.acquireAmbientGlobals(project);
    const run = this.lifecycle.begin(new StaticProjectEvaluationLocus(project.projectKey, profile.key));
    let finished = false;
    try {
      const preparation = profile.prepare();
      const result = new StaticProjectEvaluationPass().evaluateAndEmit(
        this.store,
        project,
        preparation.options,
        run,
        profile.readKey,
        ambientAccess,
        started,
      );
      run.observe(profile);
      run.observe(project);
      for (const read of project.readRegisteredInputs()) {
        run.observe(read);
      }
      for (const read of result.readRegisteredInputs()) {
        run.observe(read);
      }
      finished = true;
      const commit = run.commit();
      if (commit.state !== ComputationCommitState.Committed) {
        throw new Error(
          `Static project evaluation ${project.projectKey}/${profile.key} was rejected as ${commit.state}.`,
        );
      }
      const generation = authority.accept(
        this.lifecycle.admitCommittedGeneration(
          run.computationId,
          run.runSequence,
          'static-project-evaluation',
        ),
        project,
        profile,
        result,
        preparation.context,
      );
      return new StaticProjectEvaluationAccess(
        generation,
        StaticProjectEvaluationAcquisitionKind.Computed,
        performance.now() - started,
      );
    } catch (error) {
      if (!finished) {
        run.abort();
      }
      throw error;
    }
  }

  retireAll(): number {
    let retired = 0;
    for (const authority of this.authoritiesByLocus.values()) {
      const generation = authority.currentGeneration();
      if (
        generation != null
        && this.lifecycle.retireCommittedGeneration(
          generation.computationAuthority.computationId,
          generation.computationAuthority.runSequence,
        )
      ) {
        retired += 1;
      }
    }
    for (const authority of this.ambientAuthoritiesByProject.values()) {
      const generation = authority.currentGeneration();
      if (generation != null) {
        // The public count is profile-shaped; ambient declarations are one shared upstream compiler-world input.
        this.lifecycle.retireCommittedGeneration(
          generation.computationAuthority.computationId,
          generation.computationAuthority.runSequence,
        );
      }
    }
    return retired;
  }

  private acquireAmbientGlobals(project: ProjectBootFrame): StaticEvaluationAmbientGlobalAccess {
    const started = performance.now();
    const authority = this.ambientAuthorityFor(project.projectKey);
    const current = authority.current(project);
    if (current != null) {
      return new StaticEvaluationAmbientGlobalAccess(
        current,
        StaticProjectEvaluationAcquisitionKind.Reused,
        performance.now() - started,
      );
    }

    const run = this.lifecycle.begin(new StaticEvaluationAmbientGlobalLocus(project.projectKey));
    const inputReadScope = project.inputGeneration.createReadScope('static-evaluation-ambient-globals');
    let finished = false;
    try {
      const declarations = readStaticEvaluationAmbientGlobalDeclarations(project, inputReadScope.host);
      run.observe(project);
      for (const read of project.readRegisteredInputs()) {
        run.observe(read);
      }
      for (const read of inputReadScope.readRegisteredInputs()) {
        run.observe(read);
      }
      finished = true;
      const commit = run.commit();
      if (commit.state !== ComputationCommitState.Committed) {
        throw new Error(
          `Static-evaluation ambient globals for ${project.projectKey} were rejected as ${commit.state}.`,
        );
      }
      const generation = authority.accept(
        this.lifecycle.admitCommittedGeneration(
          run.computationId,
          run.runSequence,
          'static-evaluation-ambient-globals',
        ),
        project,
        declarations,
        inputReadScope,
      );
      return new StaticEvaluationAmbientGlobalAccess(
        generation,
        StaticProjectEvaluationAcquisitionKind.Computed,
        performance.now() - started,
      );
    } catch (error) {
      if (!finished) {
        run.abort();
      }
      throw error;
    }
  }

  private authorityFor(projectKey: string, profileKey: string): StaticProjectEvaluationAuthority {
    const key = `${projectKey}\0${profileKey}`;
    let authority = this.authoritiesByLocus.get(key);
    if (authority == null) {
      authority = new StaticProjectEvaluationAuthority(projectKey, profileKey);
      this.authoritiesByLocus.set(key, authority);
    }
    return authority;
  }

  private ambientAuthorityFor(projectKey: string): StaticEvaluationAmbientGlobalAuthority {
    let authority = this.ambientAuthoritiesByProject.get(projectKey);
    if (authority == null) {
      authority = new StaticEvaluationAmbientGlobalAuthority(projectKey);
      this.ambientAuthoritiesByProject.set(projectKey, authority);
    }
    return authority;
  }

  private requireProfileOwnership<TContext>(profile: StaticProjectEvaluationComputationProfile<TContext>): void {
    const existing = this.profilesByKey.get(profile.key) ?? null;
    if (existing != null && existing !== profile) {
      throw new Error(
        `Static project-evaluation profile '${profile.key}' has more than one in-process owner. `
        + 'Reuse one profile object so its revision and preparation semantics cannot diverge behind the same key.',
      );
    }
    this.profilesByKey.set(profile.key, profile as StaticProjectEvaluationComputationProfile<unknown>);
  }
}

/** Project-level static evaluation shared by Aurelia semantic passes. */
export class StaticProjectEvaluationPass {
  evaluate(
    project: ProjectBootFrame,
    options: StaticProjectEvaluationOptions = new StaticProjectEvaluationOptions(),
  ): StaticProjectEvaluationResult {
    const started = performance.now();
    return this.evaluateCore(
      project,
      null,
      options,
      project.inputGeneration.createReadScope('static-project-evaluation:standalone'),
      null,
      started,
    );
  }

  evaluateAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    options: StaticProjectEvaluationOptions,
    publication: KernelPublicationContext,
    readScopeKey = 'static-project-evaluation:publication',
    ambientAccess: StaticEvaluationAmbientGlobalAccess | null = null,
    started = performance.now(),
  ): StaticProjectEvaluationResult {
    return this.evaluateCore(
      project,
      new EvaluationKernelEmitter(store, publication),
      options,
      project.inputGeneration.createReadScope(readScopeKey),
      ambientAccess,
      started,
    );
  }

  private evaluateCore(
    project: ProjectBootFrame,
    kernelEmitter: EvaluationKernelEmitter | null,
    options: StaticProjectEvaluationOptions,
    inputReadScope: SemanticRuntimeProjectInputReadScope,
    ambientAccess: StaticEvaluationAmbientGlobalAccess | null,
    started: number,
  ): StaticProjectEvaluationResult {
    return new StaticProjectEvaluationFrame(
      project,
      kernelEmitter,
      options,
      inputReadScope,
      ambientAccess,
      started,
    ).evaluate();
  }
}

class StaticProjectEvaluationFrame {
  private readonly phases: StaticProjectEvaluationPhaseTiming[] = [];
  private readonly host: FileSystemEvaluationModuleSourceHost;
  private readonly runtimeHost: StaticEvaluationRuntimeHost;
  private readonly sources: StaticProjectEvaluationSourceResult[] = [];
  private readonly sourceResultsByModuleKey = new Map<string, StaticProjectEvaluationSourceResult>();
  private readonly admissionsByModuleKey = new Map<string, SourceFileAdmission>();
  private readonly originsByModuleKey = new Map<string, StaticProjectEvaluationSourceOrigin[]>();

  constructor(
    private readonly project: ProjectBootFrame,
    private readonly kernelEmitter: EvaluationKernelEmitter | null,
    private readonly options: StaticProjectEvaluationOptions,
    private readonly inputReadScope: SemanticRuntimeProjectInputReadScope,
    private readonly ambientAccess: StaticEvaluationAmbientGlobalAccess | null,
    private readonly started: number,
  ) {
    this.host = new FileSystemEvaluationModuleSourceHost(
      this.project.rootDir,
      this.inputReadScope.host,
      this.project.compilerOptions.options,
      this.options.moduleResolutionPolicy,
    );
    const ambientGlobals = this.ambientAccess == null
      ? measureStaticProjectEvaluationPhase(
          this.phases,
          'ambient-globals',
          () => readStaticEvaluationAmbientGlobalDeclarations(this.project, this.inputReadScope.host),
          (result) => result.readNameCount(),
        )
      : this.readAmbientGlobals();
    this.runtimeHost = withStaticEvaluationAmbientGlobals(this.options.runtimeHost, ambientGlobals);
  }

  private readAmbientGlobals(): StaticEvaluationAmbientGlobalDeclarations {
    const access = this.ambientAccess;
    if (access == null) {
      throw new Error('Static project evaluation has no admitted ambient-global generation.');
    }
    const declarations = access.generation.readDeclarations();
    this.phases.push({
      name: 'ambient-globals',
      milliseconds: access.milliseconds,
      itemCount: declarations.readNameCount(),
    });
    return declarations;
  }

  evaluate(): StaticProjectEvaluationResult {
    this.indexProjectAdmissions();
    const entries = this.staticEvaluationEntries();
    const entryModuleKeys = entries.map((entry) => entry.moduleKey);
    const build = measureStaticProjectEvaluationPhase(
      this.phases,
      'module-graph',
      () => buildEvaluationModuleGraphForEntries(entryModuleKeys, this.host),
      (result) => result.graph.readModules().length,
    );
    const unresolvedByEntry = this.recordGraphOriginsAndUnresolvedModules(entryModuleKeys, build);
    const graphEvaluation = measureStaticProjectEvaluationPhase(
      this.phases,
      'module-evaluation',
      () => new StaticModuleGraphEvaluator(
        build.graph,
        this.options.policy,
        this.runtimeHost,
        this.options.externalValueResolver,
      ).evaluateEntries(entryModuleKeys),
      (result) => result.modules.size,
    );
    this.publishGraphResults(graphEvaluation, build.graph.readModules(), unresolvedByEntry);
    this.publishMissingEntryResults(entries, build, unresolvedByEntry);
    return new StaticProjectEvaluationResult(this.project, this.sources, [...graphEvaluation.modules.keys()], {
      totalMilliseconds: performance.now() - this.started,
      phases: this.phases,
      sourceHost: this.host.snapshotProfile(),
      sourceFiles: staticProjectEvaluationSourceFileStats(this.project.rootDir, this.sources),
    }, graphEvaluation.openValues, this.inputReadScope, this.ambientAccess == null
      ? []
      : [this.ambientAccess.generation]);
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

  private staticEvaluationEntries(): readonly {
    readonly admission: SourceFileAdmission;
    readonly moduleKey: string;
  }[] {
    return this.project.sourceFiles
      .filter((admission) => isStaticEvaluationAdmission(admission, this.options.admittedSourceRoles))
      .map((admission) => ({ admission, moduleKey: normalizeModuleKey(admission.path) }));
  }

  private publishGraphResults(
    graphEvaluation: StaticModuleGraphEvaluationResult,
    graphModules: readonly EvaluationModuleRecord[],
    unresolvedByEntry: ReadonlyMap<string, readonly EvaluationModuleResolutionOpen[]>,
  ): void {
    measureStaticProjectEvaluationPhase(
      this.phases,
      'result-publication',
      () => {
        for (const graphRecord of graphModules) {
          this.publishGraphRecord(graphEvaluation, graphRecord, unresolvedByEntry);
        }
      },
      () => graphModules.length,
    );
  }

  private publishGraphRecord(
    graphEvaluation: StaticModuleGraphEvaluationResult,
    graphRecord: EvaluationModuleRecord,
    unresolvedByEntry: ReadonlyMap<string, readonly EvaluationModuleResolutionOpen[]>,
  ): void {
    const graphModuleKey = normalizeModuleKey(graphRecord.moduleKey);
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
        unresolvedByEntry.get(graphModuleKey) ?? [],
        this.originsForModule(graphModuleKey),
      ));
      return;
    }

    const kernelEmitter = this.kernelEmitter;
    if (kernelEmitter != null) {
      kernelEmitter.emitOpenSeams(evaluation, (seam) =>
        resolveOpenSeamSource(kernelEmitter.publication, this.project, this.admissionsByModuleKey, seam)
      );
    }
    this.publishSourceResult(new StaticProjectEvaluationSourceResult(
      graphAdmission,
      graphModuleKey,
      graphRecord.sourceFile,
      evaluation,
      unresolvedByEntry.get(graphModuleKey) ?? [],
      this.originsForModule(graphModuleKey),
    ));
  }

  private publishMissingEntryResults(
    entries: readonly { readonly admission: SourceFileAdmission; readonly moduleKey: string }[],
    build: EvaluationModuleGraphBuildResult,
    unresolvedByEntry: ReadonlyMap<string, readonly EvaluationModuleResolutionOpen[]>,
  ): void {
    for (const entry of entries) {
      if (this.sourceResultsByModuleKey.has(entry.moduleKey)) {
        continue;
      }
      this.publishSourceResult(new StaticProjectEvaluationSourceResult(
        entry.admission,
        entry.moduleKey,
        build.graph.readModule(entry.moduleKey)?.sourceFile ?? null,
        null,
        unresolvedByEntry.get(entry.moduleKey) ?? [],
        this.originsForModule(entry.moduleKey),
      ));
    }
  }

  private recordGraphOriginsAndUnresolvedModules(
    entryModuleKeys: readonly string[],
    build: EvaluationModuleGraphBuildResult,
  ): ReadonlyMap<string, readonly EvaluationModuleResolutionOpen[]> {
    const reachability = entryModuleKeys.map((entryModuleKey) => ({
      entryModuleKey,
      reachable: reachableEvaluationModuleKeys(build.graph, entryModuleKey),
    }));
    const unresolvedByEntry = new Map<string, EvaluationModuleResolutionOpen[]>(
      entryModuleKeys.map((entryModuleKey) => [entryModuleKey, []]),
    );
    for (const { entryModuleKey, reachable } of reachability) {
      this.recordSourceOrigin(
        entryModuleKey,
        StaticProjectEvaluationSourceOriginKind.StaticEvaluationRoot,
        entryModuleKey,
      );
      for (const moduleKey of reachable) {
        if (moduleKey !== entryModuleKey) {
          this.recordSourceOrigin(
            moduleKey,
            StaticProjectEvaluationSourceOriginKind.ModuleGraphDependency,
            entryModuleKey,
          );
        }
      }
    }
    for (const unresolved of build.unresolvedModules) {
      const fromModuleKey = normalizeModuleKey(unresolved.fromModuleKey);
      const owner = reachability.find((entry) => entry.reachable.has(fromModuleKey)) ?? null;
      if (owner != null) {
        unresolvedByEntry.get(owner.entryModuleKey)!.push(unresolved);
      }
    }
    return unresolvedByEntry;
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
    const admitted = linkedSourceAdmission(this.kernelEmitter.publication, this.project, sourceFile);
    indexSourceAdmission(this.admissionsByModuleKey, this.project, admitted);
    this.admissionsByModuleKey.set(graphModuleKey, admitted);
    this.admissionsByModuleKey.set(normalizeModuleKey(sourceFile.fileName), admitted);
    return admitted;
  }

  private publishSourceResult(source: StaticProjectEvaluationSourceResult): void {
    const existing = this.sourceResultsByModuleKey.get(source.moduleKey) ?? null;
    const index = existing == null ? -1 : this.sources.indexOf(existing);
    if (index === -1) {
      this.sources.push(source);
    } else {
      this.sources[index] = source;
    }
    this.sourceResultsByModuleKey.set(source.moduleKey, source);
  }

  private recordSourceOrigin(
    moduleKey: string,
    kind: StaticProjectEvaluationSourceOriginKind,
    entryModuleKey: string,
  ): void {
    const normalizedModuleKey = normalizeModuleKey(moduleKey);
    const normalizedEntryModuleKey = normalizeModuleKey(entryModuleKey);
    const entrySourcePath = this.admissionsByModuleKey.get(normalizedEntryModuleKey)?.path ?? null;
    const origins = this.originsByModuleKey.get(normalizedModuleKey) ?? [];
    if (origins.some((origin) =>
      origin.kind === kind && origin.entryModuleKey === normalizedEntryModuleKey
    )) {
      return;
    }
    this.originsByModuleKey.set(normalizedModuleKey, [
      ...origins,
      new StaticProjectEvaluationSourceOrigin(kind, normalizedEntryModuleKey, entrySourcePath),
    ]);
    this.refreshPublishedSourceResultOrigins(normalizedModuleKey);
  }

  private originsForModule(moduleKey: string): readonly StaticProjectEvaluationSourceOrigin[] {
    return [...(this.originsByModuleKey.get(normalizeModuleKey(moduleKey)) ?? [])]
      .sort((left, right) =>
        left.kind.localeCompare(right.kind)
        || left.entryModuleKey.localeCompare(right.entryModuleKey)
      );
  }

  private refreshPublishedSourceResultOrigins(moduleKey: string): void {
    const existing = this.sourceResultsByModuleKey.get(moduleKey);
    if (existing == null) {
      return;
    }
    const refreshed = new StaticProjectEvaluationSourceResult(
      existing.admission,
      existing.moduleKey,
      existing.sourceFile,
      existing.evaluation,
      existing.unresolvedModules,
      this.originsForModule(moduleKey),
    );
    const index = this.sources.indexOf(existing);
    if (index !== -1) {
      this.sources[index] = refreshed;
    }
    this.sourceResultsByModuleKey.set(moduleKey, refreshed);
  }
}

function reachableEvaluationModuleKeys(
  graph: EvaluationModuleGraph,
  entryModuleKey: string,
): ReadonlySet<string> {
  const reachable = new Set<string>();
  const visit = (moduleKey: string): void => {
    const normalizedModuleKey = normalizeModuleKey(moduleKey);
    if (reachable.has(normalizedModuleKey)) {
      return;
    }
    reachable.add(normalizedModuleKey);
    const record = graph.readModule(normalizedModuleKey);
    if (record == null) {
      return;
    }
    const moduleSpecifiers = new Set([
      ...record.imports.map((entry) => entry.moduleSpecifier),
      ...record.exports.flatMap((entry) => entry.moduleSpecifier == null ? [] : [entry.moduleSpecifier]),
    ]);
    for (const moduleSpecifier of moduleSpecifiers) {
      const linked = graph.readLinkedModule(normalizedModuleKey, moduleSpecifier);
      if (linked != null) {
        visit(linked);
      }
    }
  };
  visit(entryModuleKey);
  return reachable;
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
  publication: KernelPublicationContext,
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
  const admitted = linkedSourceAdmission(publication, project, sourceFile);
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
  publication: KernelPublicationContext,
  project: ProjectBootFrame,
  sourceFile: ts.SourceFile,
): SourceFileAdmission {
  return admitSourceFile(publication, project.workspaceRootDir, project.rootDir, project.projectKey, {
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
  admittedSourceRoles: readonly SourceFileRole[] = [SourceFileRole.AppSource],
): boolean {
  return isStaticEvaluationSource(admission.language) && admittedSourceRoles.includes(admission.role);
}

export function isEvaluatedProjectSource(
  source: StaticProjectEvaluationSourceResult,
): source is EvaluatedProjectSource {
  return source.sourceFile != null && source.evaluation != null;
}
