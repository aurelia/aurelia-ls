import type { ProjectBootFrame } from '../boot/frames.js';
import {
  ComputationCommitState,
  ComputationReadValidationScope,
  type ComputationGenerationAuthority,
  type ComputationLifecycleRegistry,
  type ComputationLocus,
  type ComputationRead,
  type ComputationReadValidation,
} from '../kernel/computation-lifecycle.js';
import type { ProductHandle } from '../kernel/handles.js';
import type {
  KernelStore,
  KernelStoreDisposalContext,
  KernelStoreSidecarIndex,
} from '../kernel/store.js';
import type { StaticProjectEvaluationGeneration } from '../evaluation/project-evaluation.js';
import type { TypeSystemProgramSourceCatalog } from './program-source-authority.js';
import {
  TypeSystemProjectBuilder,
  typeSystemEvaluatedSourceSnapshot,
  type TypeSystemProject,
} from './project.js';

export const enum TypeSystemProjectAcquisitionKind {
  /** A fresh Program/checker epoch was built and admitted. */
  Computed = 'computed',
  /** The current exact-input-valid Program/checker epoch was reused. */
  Reused = 'reused',
}

export class TypeSystemProjectAcquisitionProfile {
  constructor(
    readonly kind: TypeSystemProjectAcquisitionKind,
    readonly milliseconds: number,
    readonly constructionMilliseconds: number,
  ) {}
}

export class TypeSystemProjectAccess {
  constructor(
    readonly generation: TypeSystemProjectGeneration,
    readonly kind: TypeSystemProjectAcquisitionKind,
    readonly milliseconds: number,
    private readonly validationScope: ComputationReadValidationScope,
  ) {}

  readProfile(): TypeSystemProjectAcquisitionProfile {
    return new TypeSystemProjectAcquisitionProfile(
      this.kind,
      this.milliseconds,
      this.readProject().profile.totalMilliseconds,
    );
  }

  readProject(): TypeSystemProject {
    return this.generation.readProject(this.validationScope);
  }
}

/** Stable replacement locus for the base Program/checker generation of one logical project. */
export class TypeSystemProjectLocus implements ComputationLocus {
  readonly kind = 'type-system-project';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(readonly projectKey: string) {
    this.reconciliationKey = projectKey;
    this.summary = `Base TypeScript Program/checker generation for ${projectKey}.`;
  }
}

class TypeSystemProjectAuthority {
  private generation: TypeSystemProjectGeneration | null = null;

  constructor(readonly projectKey: string) {}

  current(
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationGeneration<null>,
    validationScope: ComputationReadValidationScope,
  ): TypeSystemProjectGeneration | null {
    const generation = this.committed();
    return generation?.tryRebaseFor(project, evaluation, validationScope) === true ? generation : null;
  }

  /** Retain an invalid incumbent privately so TypeScript may use its Program during atomic replacement. */
  committed(): TypeSystemProjectGeneration | null {
    if (this.generation != null && !this.isAdmitted(this.generation)) {
      this.generation = null;
    }
    return this.generation;
  }

  accept(
    authority: ComputationGenerationAuthority,
    project: ProjectBootFrame,
    evaluationSources: TypeSystemEvaluationSourceRead,
    typeSystem: TypeSystemProject,
  ): TypeSystemProjectGeneration {
    const generation = new TypeSystemProjectGeneration(
      this,
      authority,
      project,
      evaluationSources,
      typeSystem,
    );
    this.generation = generation;
    return generation;
  }

  isAdmitted(generation: TypeSystemProjectGeneration): boolean {
    return this.generation === generation && generation.computationAuthority.isCurrent();
  }

  currentRevision(): string {
    return this.committed()?.observedRevision ?? 'absent';
  }
}

/** Rebasable evaluator-source facet; evaluator currentness remains the authority behind this derived fingerprint. */
class TypeSystemEvaluationSourceRead implements ComputationRead {
  readonly domain = 'type-system-evaluated-sources';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    projectKey: string,
    private evaluation: StaticProjectEvaluationGeneration<null>,
    validationScope: ComputationReadValidationScope,
  ) {
    this.readKey = `type-system-evaluated-sources:${projectKey}`;
    this.observedRevision = typeSystemEvaluatedSourceSnapshot(evaluation.readBaseline(validationScope)).revision;
  }

  validate(scope?: ComputationReadValidationScope): ComputationReadValidation {
    const isCurrent = scope == null
      ? this.evaluation.isCurrent()
      : scope.validate(this.evaluation).isCurrent;
    return {
      isCurrent,
      currentRevision: isCurrent ? this.observedRevision : `${this.observedRevision}:evaluation-stale`,
      changedFacets: isCurrent ? [] : ['evaluation-generation'],
    };
  }

  tryRebaseCurrent(): ComputationRead | null {
    return this.validate().isCurrent ? this : null;
  }

  canRebaseTo(
    evaluation: StaticProjectEvaluationGeneration<null>,
    validationScope: ComputationReadValidationScope,
  ): boolean {
    return validationScope.validate(evaluation).isCurrent
      && typeSystemEvaluatedSourceSnapshot(evaluation.readBaseline(validationScope)).revision === this.observedRevision;
  }

  rebaseTo(evaluation: StaticProjectEvaluationGeneration<null>): void {
    this.evaluation = evaluation;
  }
}

/** Current reusable Program/checker plus the exact evaluator, project, and host reads that produced it. */
export class TypeSystemProjectGeneration implements ComputationRead {
  readonly domain = 'type-system-project-generation';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    private readonly owner: TypeSystemProjectAuthority,
    readonly computationAuthority: ComputationGenerationAuthority,
    readonly project: ProjectBootFrame,
    private readonly evaluationSources: TypeSystemEvaluationSourceRead,
    private readonly typeSystem: TypeSystemProject,
  ) {
    this.readKey = `type-system-project-generation:${project.projectKey}`;
    this.observedRevision = `${project.observedRevision}:${evaluationSources.observedRevision}:${computationAuthority.key}`;
  }

  isCurrent(scope?: ComputationReadValidationScope): boolean {
    return (scope ?? new ComputationReadValidationScope()).validate(this).isCurrent;
  }

  requireCurrent(scope?: ComputationReadValidationScope): void {
    if (!this.isCurrent(scope)) {
      throw new Error(`Type-system project ${this.readKey}@${this.observedRevision} is no longer current.`);
    }
  }

  readProject(scope?: ComputationReadValidationScope): TypeSystemProject {
    this.requireCurrent(scope);
    return this.typeSystem;
  }

  /** Private structural-reuse input retained while this generation is invalid but not yet replaced. */
  readCommittedProject(): TypeSystemProject {
    this.computationAuthority.requireCurrent();
    return this.typeSystem;
  }

  validate(scope?: ComputationReadValidationScope): ComputationReadValidation {
    if (scope == null) {
      return new ComputationReadValidationScope().validate(this);
    }
    const generationAdmitted = this.owner.isAdmitted(this);
    const invalidInputs = generationAdmitted
      ? [
          ...this.project.readRegisteredInputs(),
          this.evaluationSources,
          ...this.typeSystem.readRegisteredInputs(),
        ]
          .map((read) => scope.validate(read))
          .filter((validation) => !validation.isCurrent)
      : [];
    const isCurrent = generationAdmitted && invalidInputs.length === 0;
    return {
      isCurrent,
      currentRevision: isCurrent
        ? this.observedRevision
        : generationAdmitted
          ? `${this.observedRevision}:inputs-changed`
          : this.owner.currentRevision(),
      changedFacets: isCurrent
        ? []
        : !generationAdmitted
          ? ['generation']
          : [...new Set(invalidInputs.flatMap((validation) => validation.changedFacets))],
    };
  }

  tryRebaseCurrent(): ComputationRead | null {
    return this.isCurrent() ? this : null;
  }

  tryRebaseFor(
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationGeneration<null>,
    validationScope: ComputationReadValidationScope,
  ): boolean {
    if (
      project.projectKey !== this.project.projectKey
      || project.observedRevision !== this.project.observedRevision
      || !this.owner.isAdmitted(this)
      || !this.project.readRegisteredInputs().every((read) => validationScope.validate(read).isCurrent)
      || !this.evaluationSources.canRebaseTo(evaluation, validationScope)
    ) {
      return false;
    }
    if (!this.typeSystem.tryRebaseCurrentInputGeneration(project.inputGeneration)) {
      return false;
    }
    this.evaluationSources.rebaseTo(evaluation);
    return true;
  }
}

/** Owns one reusable base TypeScript Program/checker generation per logical project. */
export class TypeSystemProjectComputationService implements KernelStoreSidecarIndex {
  private readonly authoritiesByProjectKey = new Map<string, TypeSystemProjectAuthority>();
  readonly key = 'type-system-project-generations';
  readonly summary = 'Current reusable base TypeScript Program/checker generations by project.';

  constructor(
    private readonly store: KernelStore,
    private readonly lifecycle: ComputationLifecycleRegistry,
    private readonly programSources: TypeSystemProgramSourceCatalog,
  ) {
    store.registerSidecarIndex(this);
  }

  readEntryCount(): number {
    return [...this.authoritiesByProjectKey.values()]
      .filter((authority) => authority.committed() != null).length;
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

  acquire(
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationGeneration<null>,
    validationScope: ComputationReadValidationScope = new ComputationReadValidationScope(),
  ): TypeSystemProjectAccess {
    project.requireCurrent();
    evaluation.requireCurrent(validationScope);
    const started = performance.now();
    const authority = this.authorityFor(project.projectKey);
    const current = authority.current(project, evaluation, validationScope);
    if (current != null) {
      return new TypeSystemProjectAccess(
        current,
        TypeSystemProjectAcquisitionKind.Reused,
        performance.now() - started,
        validationScope,
      );
    }

    const incumbent = authority.committed()?.readCommittedProject() ?? null;
    const run = this.lifecycle.begin(new TypeSystemProjectLocus(project.projectKey));
    let finished = false;
    try {
      run.guardCurrent(project.inputGeneration.currentnessGuardKey, project.inputGeneration);
      const evaluationSources = new TypeSystemEvaluationSourceRead(project.projectKey, evaluation, validationScope);
      run.observe(evaluationSources);
      for (const read of project.readRegisteredInputs()) {
        run.observe(read);
      }
      const typeSystem = new TypeSystemProjectBuilder(this.programSources).build(
        project,
        evaluation.readBaseline(validationScope),
        { previousProject: incumbent },
      );
      for (const read of typeSystem.readRegisteredInputs()) {
        run.observe(read);
      }
      finished = true;
      const commit = run.commit();
      if (commit.state !== ComputationCommitState.Committed) {
        throw new Error(`Type-system project ${project.projectKey} was rejected as ${commit.state}.`);
      }
      const generation = authority.accept(
        this.lifecycle.admitCommittedGeneration(
          run.computationId,
          run.runSequence,
          'type-system-project',
        ),
        project,
        evaluationSources,
        typeSystem,
      );
      return new TypeSystemProjectAccess(
        generation,
        TypeSystemProjectAcquisitionKind.Computed,
        performance.now() - started,
        validationScope,
      );
    } catch (error) {
      if (!finished) {
        run.abort();
      }
      throw error;
    }
  }

  retire(projectKey: string): boolean {
    const generation = this.authoritiesByProjectKey.get(projectKey)?.committed() ?? null;
    return generation != null
      && this.lifecycle.retireCommittedGeneration(
        generation.computationAuthority.computationId,
        generation.computationAuthority.runSequence,
      );
  }

  retireAll(): number {
    let retired = 0;
    for (const authority of this.authoritiesByProjectKey.values()) {
      const generation = authority.committed();
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
    return retired;
  }

  private authorityFor(projectKey: string): TypeSystemProjectAuthority {
    let authority = this.authoritiesByProjectKey.get(projectKey);
    if (authority == null) {
      authority = new TypeSystemProjectAuthority(projectKey);
      this.authoritiesByProjectKey.set(projectKey, authority);
    }
    return authority;
  }
}
