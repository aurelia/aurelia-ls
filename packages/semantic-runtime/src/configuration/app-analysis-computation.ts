import {
  ComputationCommitState,
  type ComputationCommitResult,
  type ComputationGenerationAuthority,
  type ComputationId,
  type ComputationLifecycleRegistry,
  type ComputationLocus,
  type ComputationRun,
} from '../kernel/computation-lifecycle.js';
import type { ProductHandle } from '../kernel/handles.js';
import type {
  KernelStore,
  KernelStoreDisposalContext,
  KernelStoreSidecarIndex,
} from '../kernel/store.js';
import type { ProjectBootFrame } from '../boot/frames.js';
import {
  type StaticProjectEvaluationAccess,
  type StaticProjectEvaluationComputationService,
  type StaticProjectEvaluationGeneration,
} from '../evaluation/project-evaluation.js';
import type { SemanticRuntimeSupport } from '../framework/framework-support-authority.js';
import {
  resourceConventionToolingEvaluationProfile,
  type ResourceConventionToolingEvaluationContext,
} from '../resources/resource-convention-transform-admission.js';
import {
  AureliaAppWorldProjectPass,
  type AureliaAppWorldProjectEmission,
  type AureliaAppWorldProjectOptions,
} from './app-world-project-pass.js';
import { aureliaAppProjectEvaluationProfile } from './aurelia-project-evaluation.js';

/** Stable replacement locus for one complete project semantic generation. */
export class AureliaAppAnalysisLocus implements ComputationLocus {
  readonly kind = 'aurelia-app-analysis';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(readonly projectKey: string) {
    this.reconciliationKey = projectKey;
    this.summary = `Aurelia app-analysis generation for ${projectKey}.`;
  }
}

/** One committed app object graph guarded by the computation that owns all of its kernel publications. */
export class AureliaAppWorldProjectGeneration {
  readonly key: string;

  constructor(
    private readonly authority: ComputationGenerationAuthority,
    private readonly currentEmission: AureliaAppWorldProjectEmission,
    private readonly appEvaluation: StaticProjectEvaluationGeneration<null>,
    private readonly conventionToolingEvaluation: StaticProjectEvaluationGeneration<ResourceConventionToolingEvaluationContext>,
  ) {
    this.key = authority.key;
  }

  get computationId(): ComputationId {
    return this.authority.computationId;
  }

  get runSequence(): number {
    return this.authority.runSequence;
  }

  isCurrent(): boolean {
    return this.isAdmitted()
      && this.currentEmission.project.inputGeneration.isCurrent()
      && this.appEvaluation.isCurrent()
      && this.conventionToolingEvaluation.isCurrent();
  }

  /** Whether the atomic app publication remains the private committed incumbent. */
  isAdmitted(): boolean {
    return this.authority.isCurrent();
  }

  requireCurrent(): void {
    this.authority.requireCurrent();
    this.currentEmission.project.inputGeneration.requireCurrent();
    this.appEvaluation.requireCurrent();
    this.conventionToolingEvaluation.requireCurrent();
  }

  get emission(): AureliaAppWorldProjectEmission {
    this.requireCurrent();
    return this.currentEmission;
  }

  /** Private replacement input; unlike the public emission it may be read while source inputs are temporarily stale. */
  readCommittedEmission(): AureliaAppWorldProjectEmission {
    this.authority.requireCurrent();
    return this.currentEmission;
  }
}

/** Current committed app generation at one project locus. */
export class AureliaAppWorldProjectAuthority {
  private generation: AureliaAppWorldProjectGeneration | null = null;

  constructor(
    readonly projectKey: string,
    private readonly lifecycle: ComputationLifecycleRegistry,
  ) {}

  current(): AureliaAppWorldProjectGeneration | null {
    const generation = this.committed();
    return generation?.isCurrent() === true ? generation : null;
  }

  /** Private committed incumbent retained across temporary input invalidity until replacement or retirement. */
  committed(): AureliaAppWorldProjectGeneration | null {
    if (this.generation?.isAdmitted() !== true) {
      this.generation = null;
    }
    return this.generation;
  }

  accept(
    computationId: ComputationId,
    runSequence: number,
    candidate: AureliaAppWorldProjectEmission,
    appEvaluation: StaticProjectEvaluationGeneration<null>,
    conventionToolingEvaluation: StaticProjectEvaluationGeneration<ResourceConventionToolingEvaluationContext>,
  ): AureliaAppWorldProjectGeneration {
    const state = this.lifecycle.readState(computationId);
    if (state?.committedRunSequence !== runSequence) {
      throw new Error(`Cannot admit uncommitted app-analysis run ${computationId}@${runSequence}.`);
    }
    if (
      state.locus.kind !== 'aurelia-app-analysis'
      || state.locus.reconciliationKey !== this.projectKey
    ) {
      throw new Error(`App-analysis run ${computationId}@${runSequence} belongs to another project locus.`);
    }
    if (candidate.project.projectKey !== this.projectKey) {
      throw new Error(
        `Cannot admit app-analysis candidate for ${candidate.project.projectKey} at project ${this.projectKey}.`,
      );
    }
    const generationAuthority = this.lifecycle.admitCommittedGeneration(
      computationId,
      runSequence,
      'aurelia-app-analysis',
    );
    const generation = new AureliaAppWorldProjectGeneration(
      generationAuthority,
      candidate.forCommittedGeneration(generationAuthority),
      appEvaluation,
      conventionToolingEvaluation,
    );
    this.generation = generation;
    return generation;
  }
}

/** Prepared full-app candidate whose semantic incumbent remains current until this attempt commits. */
export class AureliaAppWorldProjectComputationAttempt {
  constructor(
    private readonly run: ComputationRun,
    private readonly authority: AureliaAppWorldProjectAuthority,
    readonly locus: AureliaAppAnalysisLocus,
    readonly appEvaluationAccess: StaticProjectEvaluationAccess<null>,
    readonly conventionToolingEvaluationAccess: StaticProjectEvaluationAccess<ResourceConventionToolingEvaluationContext>,
    readonly candidateEmission: AureliaAppWorldProjectEmission,
  ) {}

  get computationId(): ComputationId {
    return this.run.computationId;
  }

  get runSequence(): number {
    return this.run.runSequence;
  }

  commit(): AureliaAppWorldProjectComputationResult {
    const commit = this.run.commit();
    const committedGeneration = commit.state === ComputationCommitState.Committed
      ? this.authority.accept(
          this.run.computationId,
          this.run.runSequence,
          this.candidateEmission,
          this.appEvaluationAccess.generation,
          this.conventionToolingEvaluationAccess.generation,
        )
      : null;
    return new AureliaAppWorldProjectComputationResult(
      this.locus,
      this.candidateEmission,
      commit,
      committedGeneration,
      this.authority.current(),
    );
  }
}

/** Atomic app-analysis replacement outcome. */
export class AureliaAppWorldProjectComputationResult {
  constructor(
    readonly locus: AureliaAppAnalysisLocus,
    readonly candidateEmission: AureliaAppWorldProjectEmission,
    readonly commit: ComputationCommitResult,
    readonly committedGeneration: AureliaAppWorldProjectGeneration | null,
    readonly currentGeneration: AureliaAppWorldProjectGeneration | null,
  ) {}
}

/** Prepares and atomically publishes one complete Aurelia app-analysis generation. */
export class AureliaAppWorldProjectComputationService implements KernelStoreSidecarIndex {
  private readonly authoritiesByProjectKey = new Map<string, AureliaAppWorldProjectAuthority>();
  readonly key = 'aurelia-app-analysis-authorities';
  readonly summary = 'Current committed complete Aurelia app-analysis generations.';

  constructor(
    private readonly store: KernelStore,
    private readonly lifecycle: ComputationLifecycleRegistry,
    private readonly support: SemanticRuntimeSupport,
    private readonly projectEvaluations: StaticProjectEvaluationComputationService,
  ) {
    store.registerSidecarIndex(this);
  }

  readEntryCount(): number {
    return [...this.authoritiesByProjectKey.values()]
      .filter((authority) => authority.committed() != null)
      .length;
  }

  dispose(_context: KernelStoreDisposalContext): void {
    for (const [projectKey, authority] of this.authoritiesByProjectKey) {
      if (authority.committed() == null) {
        this.authoritiesByProjectKey.delete(projectKey);
      }
    }
  }

  hasProductDetail(_productHandle: ProductHandle): boolean {
    return false;
  }

  authorityFor(projectKey: string): AureliaAppWorldProjectAuthority {
    let authority = this.authoritiesByProjectKey.get(projectKey);
    if (authority == null) {
      authority = new AureliaAppWorldProjectAuthority(projectKey, this.lifecycle);
      this.authoritiesByProjectKey.set(projectKey, authority);
    }
    return authority;
  }

  retire(generation: AureliaAppWorldProjectGeneration): boolean {
    return this.lifecycle.retireCommittedGeneration(generation.computationId, generation.runSequence);
  }

  prepare(
    project: ProjectBootFrame,
    options: AureliaAppWorldProjectOptions = {},
  ): AureliaAppWorldProjectComputationAttempt {
    project.requireCurrent();
    const appEvaluationAccess = this.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
    const conventionToolingEvaluationAccess = this.projectEvaluations.acquire(
      project,
      resourceConventionToolingEvaluationProfile,
    );
    const appEvaluationProfile = appEvaluationAccess.readProfile();
    const conventionToolingEvaluationProfile = conventionToolingEvaluationAccess.readProfile();
    const locus = new AureliaAppAnalysisLocus(project.projectKey);
    const authority = this.authorityFor(project.projectKey);
    const incumbent = authority.committed()?.readCommittedEmission() ?? null;
    const run = this.lifecycle.begin(locus);
    try {
      run.guardCurrent(project.inputGeneration.currentnessGuardKey, project.inputGeneration);
      const candidate = new AureliaAppWorldProjectPass(this.support).constructAndEmit(
        this.store,
        run,
        project,
        appEvaluationAccess.generation.forkSession(),
        conventionToolingEvaluationAccess.generation,
        [
          appEvaluationProfile,
          conventionToolingEvaluationProfile,
        ],
        [
          appEvaluationAccess.generation,
          conventionToolingEvaluationAccess.generation,
        ],
        options,
        incumbent,
      );
      return new AureliaAppWorldProjectComputationAttempt(
        run,
        authority,
        locus,
        appEvaluationAccess,
        conventionToolingEvaluationAccess,
        candidate,
      );
    } catch (error) {
      run.abort();
      throw error;
    }
  }
}
