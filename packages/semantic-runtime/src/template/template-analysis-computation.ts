import type { AureliaAppWorldEmission } from '../configuration/app-world-composer.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  type ComputationGenerationAuthority,
  ComputationCommitState,
  type ComputationCommitResult,
  type ComputationId,
  type ComputationLocus,
  type ComputationRead,
  type ComputationReadValidation,
  ComputationRecordReadView,
  type ComputationRun,
  type ComputationLifecycleRegistry,
} from '../kernel/computation-lifecycle.js';
import { sourceFileAddressForAddress } from '../kernel/source-address.js';
import {
  SourceTextSnapshotAuthority,
  SourceTextSnapshotState,
  type SourceTextSnapshot,
} from '../kernel/source-text-snapshot.js';
import type { ProductHandle } from '../kernel/handles.js';
import type {
  KernelStore,
  KernelStoreDisposalContext,
  KernelStoreSidecarIndex,
} from '../kernel/store.js';
import { authoredSourceHostPathCandidates } from '../kernel/authored-source-text.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { RouteConfigContextMaterializationProjectResult } from '../router/route-context-materialization.js';
import type { StateStoreConfiguration } from '../state/model.js';
import {
  normalizeSemanticAppAnalysisDepth,
  type SemanticAppAnalysisDepth,
} from '../configuration/app-analysis.js';
import type { SemanticRuntimeTelemetryOptions } from '../telemetry/options.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  encodeTemplateCompilationKeyParts,
  TemplateCompilationCohortProjectAuthority,
} from './template-compilation-cohort.js';
import {
  TemplateCompilationProjectPass,
  type TemplateCompilationProjectEmission,
} from './template-compilation-project-pass.js';

let nextTemplateAnalysisInputOrdinal = 1;

/** Complete immutable upstream input snapshot consumed by one project template-analysis generation. */
export class TemplateAnalysisProjectInput {
  readonly snapshotKey: string;
  readonly runtimeAnalysisDepth: SemanticAppAnalysisDepth;
  readonly stateStores: readonly StateStoreConfiguration[];
  readonly authoringTemplateSourceFiles: readonly string[];

  constructor(
    readonly projectKey: string,
    readonly appWorld: AureliaAppWorldEmission,
    readonly typeSystem: TypeSystemProject,
    readonly resourceDefinitions: ResourceDefinitionIndex,
    readonly routeContexts: RouteConfigContextMaterializationProjectResult,
    readonly evaluation: StaticProjectEvaluationResult,
    stateStores: readonly StateStoreConfiguration[],
    runtimeAnalysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`,
    readonly includeAuthoringTemplates: boolean,
    authoringTemplateSourceFiles: readonly string[],
    readonly authoringTemplateLimit: number | null,
  ) {
    this.snapshotKey = encodeTemplateCompilationKeyParts([
      projectKey,
      typeSystem.epoch.key,
      `input:${nextTemplateAnalysisInputOrdinal++}`,
    ]);
    this.runtimeAnalysisDepth = normalizeSemanticAppAnalysisDepth(runtimeAnalysisDepth);
    this.stateStores = [...stateStores];
    this.authoringTemplateSourceFiles = [...authoringTemplateSourceFiles];
  }
}

/** Current complete upstream snapshot at one project template-analysis locus. */
export class TemplateAnalysisProjectInputAuthority {
  constructor(
    private readonly read: () => TemplateAnalysisProjectInput | null,
  ) {}

  current(): TemplateAnalysisProjectInput | null {
    return this.read();
  }

  static fixed(input: TemplateAnalysisProjectInput): TemplateAnalysisProjectInputAuthority {
    return new TemplateAnalysisProjectInputAuthority(() => input);
  }
}

class TemplateAnalysisProjectInputRead implements ComputationRead {
  readonly domain = 'template-analysis-project-input';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    private readonly authority: TemplateAnalysisProjectInputAuthority,
    readonly input: TemplateAnalysisProjectInput,
  ) {
    this.readKey = `template-analysis-project-input:${input.projectKey}`;
    this.observedRevision = input.snapshotKey;
  }

  validate(): ComputationReadValidation {
    const current = this.authority.current();
    if (current == null) {
      return {
        isCurrent: false,
        currentRevision: 'absent',
        changedFacets: ['existence'],
      };
    }
    const changedFacets = templateAnalysisInputChangedFacets(this.input, current);
    return {
      isCurrent: current.snapshotKey === this.observedRevision,
      currentRevision: current.snapshotKey,
      changedFacets,
    };
  }
}

/** Stable project locus for the complete compiler/runtime template-analysis generation. */
export class TemplateAnalysisProjectLocus implements ComputationLocus {
  readonly kind = 'template-analysis-project';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(readonly projectKey: string) {
    this.reconciliationKey = encodeTemplateCompilationKeyParts([projectKey]);
    this.summary = `template-analysis generation for ${projectKey}`;
  }
}

/** One committed project template-analysis object graph tied to its kernel publication state. */
export class TemplateAnalysisProjectGeneration {
  readonly key: string;

  constructor(
    private readonly authority: ComputationGenerationAuthority,
    private readonly currentEmission: TemplateCompilationProjectEmission,
    /** Dynamic project authority used by family computations that intentionally follow committed replacement. */
    readonly cohortAuthority: TemplateCompilationCohortProjectAuthority,
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
    return this.authority.isCurrent();
  }

  /** Current project emission. Stale generation objects cannot expose their former object graph. */
  get emission(): TemplateCompilationProjectEmission {
    return this.requireCurrentEmission();
  }

  requireCurrentEmission(): TemplateCompilationProjectEmission {
    this.authority.requireCurrent();
    return this.currentEmission;
  }
}

/** Current committed template-analysis generation for one project locus. */
export class TemplateAnalysisProjectAuthority {
  private generation: TemplateAnalysisProjectGeneration | null = null;
  readonly cohortAuthority = new TemplateCompilationCohortProjectAuthority(
    () => this.current()?.emission.cohortPlan ?? null,
  );

  constructor(
    readonly projectKey: string,
    private readonly lifecycle: ComputationLifecycleRegistry,
  ) {}

  current(): TemplateAnalysisProjectGeneration | null {
    if (this.generation?.isCurrent() !== true) {
      this.generation = null;
    }
    return this.generation;
  }

  accept(
    computationId: ComputationId,
    runSequence: number,
    candidateEmission: TemplateCompilationProjectEmission,
  ): TemplateAnalysisProjectGeneration {
    const state = this.lifecycle.readState(computationId);
    if (state?.committedRunSequence !== runSequence) {
      throw new Error(`Cannot make uncommitted template-analysis run ${computationId}@${runSequence} current.`);
    }
    if (!(state.locus instanceof TemplateAnalysisProjectLocus) || state.locus.projectKey !== this.projectKey) {
      throw new Error(
        `Cannot admit template-analysis run ${computationId}@${runSequence} at project ${this.projectKey}; `
        + 'its computation locus belongs to another project.',
      );
    }
    if (candidateEmission.cohortPlan.projectKey !== this.projectKey) {
      throw new Error(
        `Cannot admit template-analysis emission for ${candidateEmission.cohortPlan.projectKey} `
        + `at project ${this.projectKey}.`,
      );
    }
    const existing = this.current();
    if (existing?.computationId === computationId && existing.runSequence === runSequence) {
      throw new Error(`Template-analysis run ${computationId}@${runSequence} was already admitted.`);
    }
    const generationAuthority = this.lifecycle.admitCommittedGeneration(
      computationId,
      runSequence,
      'template-analysis-project',
    );
    const emission = candidateEmission.forCommittedGeneration(generationAuthority);
    const generation = new TemplateAnalysisProjectGeneration(
      generationAuthority,
      emission,
      this.cohortAuthority,
    );
    this.generation = generation;
    return generation;
  }
}

/** Inputs needed to prepare one complete project template-analysis candidate. */
export class TemplateAnalysisProjectComputationRequest {
  constructor(
    readonly projectKey: string,
    readonly inputAuthority: TemplateAnalysisProjectInputAuthority,
  ) {}
}

/** Prepared full project candidate whose object graph is not current until its publication commits. */
export class TemplateAnalysisProjectComputationAttempt {
  constructor(
    private readonly run: ComputationRun,
    private readonly authority: TemplateAnalysisProjectAuthority,
    readonly locus: TemplateAnalysisProjectLocus,
    readonly input: TemplateAnalysisProjectInput,
    readonly sourceSnapshots: readonly SourceTextSnapshot[],
    readonly candidateEmission: TemplateCompilationProjectEmission,
  ) {}

  get computationId(): ComputationId {
    return this.run.computationId;
  }

  get runSequence(): number {
    return this.run.runSequence;
  }

  commit(): TemplateAnalysisProjectComputationResult {
    const commit = this.run.commit();
    const generation = commit.state === ComputationCommitState.Committed
      ? this.authority.accept(
          this.run.computationId,
          this.run.runSequence,
          this.candidateEmission,
        )
      : null;
    return new TemplateAnalysisProjectComputationResult(
      this.locus,
      this.input,
      this.candidateEmission,
      commit,
      generation,
      this.authority.current(),
    );
  }
}

/** Outcome of validating and atomically replacing one complete project template-analysis generation. */
export class TemplateAnalysisProjectComputationResult {
  constructor(
    readonly locus: TemplateAnalysisProjectLocus,
    readonly input: TemplateAnalysisProjectInput,
    /** Run-bound assembly candidate retained for transition inspection, never as the public current emission. */
    readonly candidateEmission: TemplateCompilationProjectEmission,
    readonly commit: ComputationCommitResult,
    /** Newly committed generation, or null when this attempt was rejected. */
    readonly committedGeneration: TemplateAnalysisProjectGeneration | null,
    /** Current generation after this attempt; a rejected attempt preserves the previous generation. */
    readonly currentGeneration: TemplateAnalysisProjectGeneration | null,
  ) {}
}

/** Same-runtime orchestration for complete compiler/runtime project generations. */
export class TemplateAnalysisProjectComputationService implements KernelStoreSidecarIndex {
  private readonly authoritiesByProjectKey = new Map<string, TemplateAnalysisProjectAuthority>();
  readonly key = 'template-analysis-project-authorities';
  readonly summary = 'Current committed project template-analysis generations and cohort authorities.';

  constructor(
    private readonly store: KernelStore,
    private readonly lifecycle: ComputationLifecycleRegistry,
  ) {
    store.registerSidecarIndex(this);
  }

  readEntryCount(): number {
    return [...this.authoritiesByProjectKey.values()]
      .filter((authority) => authority.current() != null)
      .length;
  }

  dispose(_context: KernelStoreDisposalContext): void {
    for (const [projectKey, authority] of this.authoritiesByProjectKey) {
      if (authority.current() == null) {
        this.authoritiesByProjectKey.delete(projectKey);
      }
    }
  }

  hasProductDetail(_productHandle: ProductHandle): boolean {
    return false;
  }

  authorityFor(projectKey: string): TemplateAnalysisProjectAuthority {
    let authority = this.authoritiesByProjectKey.get(projectKey);
    if (authority == null) {
      authority = new TemplateAnalysisProjectAuthority(projectKey, this.lifecycle);
      this.authoritiesByProjectKey.set(projectKey, authority);
    }
    return authority;
  }

  prepare(
    request: TemplateAnalysisProjectComputationRequest,
    telemetry: SemanticRuntimeTelemetryOptions | null = null,
  ): TemplateAnalysisProjectComputationAttempt {
    const input = request.inputAuthority.current();
    if (input == null) {
      throw new Error(`Template-analysis input for ${request.projectKey} is no longer available.`);
    }
    if (input.projectKey !== request.projectKey) {
      throw new Error(
        `Template-analysis input project ${input.projectKey} does not match requested project ${request.projectKey}.`,
      );
    }

    const locus = new TemplateAnalysisProjectLocus(request.projectKey);
    const run = this.lifecycle.begin(locus);
    try {
      const candidateEmission = new TemplateCompilationProjectPass(this.store, run).compile(
        input.appWorld,
        input.typeSystem,
        input.resourceDefinitions,
        input.routeContexts,
        {
          projectKey: input.projectKey,
          evaluation: input.evaluation,
          stateStores: input.stateStores,
          runtimeAnalysisDepth: input.runtimeAnalysisDepth,
          includeAuthoringTemplates: input.includeAuthoringTemplates,
          authoringTemplateSourceFiles: input.authoringTemplateSourceFiles,
          authoringTemplateLimit: input.authoringTemplateLimit,
          telemetry,
        },
      );

      run.observe(new TemplateAnalysisProjectInputRead(request.inputAuthority, input));
      for (const resource of [...candidateEmission.resources, ...candidateEmission.authoringResources]) {
        for (const read of resource.compilation.registeredReads) {
          run.observe(read);
        }
      }
      const sourceSnapshots = this.captureSourceSnapshots(input, candidateEmission, run);
      return new TemplateAnalysisProjectComputationAttempt(
        run,
        this.authorityFor(request.projectKey),
        locus,
        input,
        sourceSnapshots,
        candidateEmission,
      );
    } catch (error) {
      run.abort();
      throw error;
    }
  }

  private captureSourceSnapshots(
    input: TemplateAnalysisProjectInput,
    emission: TemplateCompilationProjectEmission,
    run: ComputationRun,
  ): readonly SourceTextSnapshot[] {
    const recordReads = new ComputationRecordReadView(this.store);
    const sourceText = new SourceTextSnapshotAuthority(input.typeSystem.project.sourceTextProvider);
    const snapshotsByFileName = new Map<string, SourceTextSnapshot>();
    for (const owner of emission.cohortPlan.ownerPlans) {
      const sourceAddressHandle = owner.definition.template?.addressHandle ?? null;
      if (sourceAddressHandle == null) {
        continue;
      }
      const sourceFile = sourceFileAddressForAddress(recordReads, sourceAddressHandle);
      if (sourceFile == null) {
        throw new Error(`Template owner ${owner.definition.name} has no authored source-file address.`);
      }
      const candidates = authoredSourceHostPathCandidates(
        input.typeSystem.project.workspaceRootDir,
        input.typeSystem.project.rootDir,
        sourceFile.path,
      );
      let admitted = false;
      for (const fileName of candidates) {
        let snapshot = snapshotsByFileName.get(fileName);
        if (snapshot == null) {
          snapshot = sourceText.capture(fileName);
          snapshotsByFileName.set(fileName, snapshot);
          run.observe(snapshot);
        }
        if (snapshot.state === SourceTextSnapshotState.Present) {
          const admittedRevision = owner.definition.template?.authoredSourceRevision ?? null;
          if (admittedRevision == null) {
            throw new Error(
              `Template owner ${owner.definition.name} has no authored source revision for ${sourceFile.path}.`,
            );
          }
          if (snapshot.contentRevision !== admittedRevision) {
            throw new Error(
              `Template source ${sourceFile.path} changed after its resource definition was admitted.`,
            );
          }
          admitted = true;
          break;
        }
        if (snapshot.state === SourceTextSnapshotState.Unavailable) {
          throw new Error(`Template source ${fileName} exists but its text is unavailable.`);
        }
      }
      if (!admitted) {
        throw new Error(`Template source ${sourceFile.path} is absent from every authored source root.`);
      }
    }
    for (const read of recordReads.readAll()) {
      run.observe(read);
    }
    return [...snapshotsByFileName.values()].sort((left, right) => left.fileName.localeCompare(right.fileName));
  }
}

function templateAnalysisInputChangedFacets(
  observed: TemplateAnalysisProjectInput,
  current: TemplateAnalysisProjectInput,
): readonly string[] {
  if (observed.snapshotKey === current.snapshotKey) {
    return [];
  }
  return [
    'input-generation',
    ...(observed.appWorld === current.appWorld ? [] : ['app-world']),
    ...(observed.typeSystem.epoch.key === current.typeSystem.epoch.key ? [] : ['type-system']),
    ...(observed.resourceDefinitions === current.resourceDefinitions ? [] : ['resource-definitions']),
    ...(observed.routeContexts === current.routeContexts ? [] : ['route-contexts']),
    ...(observed.evaluation === current.evaluation ? [] : ['static-evaluation']),
    ...(sameReferences(observed.stateStores, current.stateStores) ? [] : ['state-stores']),
    ...(observed.runtimeAnalysisDepth === current.runtimeAnalysisDepth ? [] : ['analysis-depth']),
    ...(
      observed.includeAuthoringTemplates === current.includeAuthoringTemplates
      && observed.authoringTemplateLimit === current.authoringTemplateLimit
      && sameValues(observed.authoringTemplateSourceFiles, current.authoringTemplateSourceFiles)
        ? []
        : ['authoring-policy']
    ),
  ];
}

function sameReferences<TValue>(left: readonly TValue[], right: readonly TValue[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
