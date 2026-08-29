import type { ComputationRun } from '../kernel/computation-lifecycle.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import { TemplateCompilerInvocationWorldMaterializer } from './compiler-invocation-world-materializer.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type {
  LocalTemplateOccurrenceDefinitionEntry,
  LocalTemplateOccurrenceDefinitionMaterialization,
} from './local-template-definition-materializer.js';
import { TemplateCompilerInvocationPhase } from './template-compiler-execution.js';
import type {
  TemplateCompilerOccurrenceCompilationIngressCohort,
  TemplateCompilerOccurrenceCompilationIngressPreparation,
} from './template-compiler-occurrence-compilation-ingress.js';

const occurrenceWorldClosureAuthority = {};
const occurrenceWorldClosureOwners = new WeakMap<
  TemplateCompilerOccurrenceCompilationIngressCohort,
  TemplateCompilerOccurrenceWorldClosureMaterializer
>();

/** Root traversal transition from the completed pre-local bootstrap to the projected post-local world. */
export class TemplateCompilerOccurrenceRootTraversalWorldProjection {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly closure: TemplateCompilerOccurrencePostLocalWorldClosure,
  ) {
    if (authority !== occurrenceWorldClosureAuthority) {
      throw new Error('Occurrence root traversal worlds are closure-owned capabilities.');
    }
    this.#authority = authority;
  }

  get world(): TemplateCompilerWorldEmission {
    return this.closure.postLocalWorld;
  }

  isPendingCurrent(): boolean {
    return this.closure.isCurrent()
      && this.closure.ingressCohort.hasImmediateFrontier()
      && this.hasPendingFrontier();
  }

  hasPendingFrontier(): boolean {
    const binding = this.closure.binding;
    const execution = binding.execution;
    return this.#authority === occurrenceWorldClosureAuthority
      && execution.invocationPhase(binding.lane) === TemplateCompilerInvocationPhase.BootstrapClosed
      && binding.lane.targetPlan == null
      && execution.sequence.readLaneOperations(binding.lane).length === binding.bootstrapClosure.laneOperationCount
      && !execution.sequence.readContexts().some((context) => context.lane === binding.lane);
  }
}

/** One occurrence-defined child paired with the shared post-local hook-parent world. */
export class TemplateCompilerOccurrenceChildHookParentWorldProjection {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly closure: TemplateCompilerOccurrencePostLocalWorldClosure,
    readonly ordinal: number,
    readonly ingress: TemplateCompilerOccurrenceCompilationIngressPreparation,
    readonly definitionEntry: LocalTemplateOccurrenceDefinitionEntry,
  ) {
    if (
      authority !== occurrenceWorldClosureAuthority
      || ingress.definitionEntry !== definitionEntry
      || ingress.siteTransfer !== definitionEntry.siteTransfer
    ) {
      throw new Error('Occurrence child hook-parent worlds are closure-owned sibling capabilities.');
    }
    this.#authority = authority;
  }

  get world(): TemplateCompilerWorldEmission {
    return this.closure.postLocalWorld;
  }

  get lane() {
    return this.ingress.lane;
  }

  isPendingCurrent(): boolean {
    return this.closure.isCurrent()
      && this.closure.ingressCohort.hasImmediateFrontier()
      && this.hasPendingFrontier();
  }

  hasPendingFrontier(): boolean {
    const execution = this.closure.binding.execution;
    return this.#authority === occurrenceWorldClosureAuthority
      && execution.invocationPhase(this.lane) === TemplateCompilerInvocationPhase.CompilerHooks
      && execution.sequence.readLaneOperations(this.lane).length === 0
      && this.lane.targetPlan == null
      && execution.bootstrapClosure(this.lane) == null
      && !execution.sequence.readContexts().some((context) => context.lane === this.lane);
  }
}

/** Candidate-only world projection over one published direct-sibling occurrence cohort. */
export class TemplateCompilerOccurrencePostLocalWorldClosure {
  readonly #authority: object;
  readonly rootTraversalProjection: TemplateCompilerOccurrenceRootTraversalWorldProjection;
  readonly childHookParentProjections: readonly TemplateCompilerOccurrenceChildHookParentWorldProjection[];

  constructor(
    authority: object,
    readonly publication: ComputationRun,
    readonly definitionMaterialization: LocalTemplateOccurrenceDefinitionMaterialization,
    readonly ingressCohort: TemplateCompilerOccurrenceCompilationIngressCohort,
    readonly preLocalWorld: TemplateCompilerWorldEmission,
    readonly postLocalWorld: TemplateCompilerWorldEmission,
  ) {
    if (authority !== occurrenceWorldClosureAuthority) {
      throw new Error('Occurrence post-local world closures are materializer-owned capabilities.');
    }
    this.#authority = authority;
    this.rootTraversalProjection = new TemplateCompilerOccurrenceRootTraversalWorldProjection(
      occurrenceWorldClosureAuthority,
      this,
    );
    this.childHookParentProjections = ingressCohort.entries.map((ingress, ordinal) =>
      new TemplateCompilerOccurrenceChildHookParentWorldProjection(
        occurrenceWorldClosureAuthority,
        this,
        ordinal,
        ingress,
        definitionMaterialization.entries[ordinal]!,
      )
    );
  }

  get binding() {
    return this.ingressCohort.definitionPreparation.rootPartition.incoming.family.binding;
  }

  isCurrent(): boolean {
    return this.#authority === occurrenceWorldClosureAuthority
      && this.binding.isCurrent()
      && this.publication.isCurrent()
      && this.definitionMaterialization.entries.every((entry) =>
        entry.definition.productHandle != null
        && this.publication.domainReadProjection.readProductDetail(
          ResourceProductDetails.Definition,
          entry.definition.productHandle,
        ) === entry.definition
      );
  }

  isClaimable(): boolean {
    return this.isCurrent()
      && this.ingressCohort.hasImmediateFrontier()
      && this.rootTraversalProjection.hasPendingFrontier()
      && this.childHookParentProjections.every((entry) => entry.hasPendingFrontier());
  }
}

/** Projects one complete sibling world without publishing its legacy-colliding products. */
export class TemplateCompilerOccurrenceWorldClosureMaterializer {
  private readonly worlds: TemplateCompilerInvocationWorldMaterializer;
  private readonly closuresByIngressCohort = new WeakMap<
    TemplateCompilerOccurrenceCompilationIngressCohort,
    TemplateCompilerOccurrencePostLocalWorldClosure
  >();

  constructor(readonly publication: ComputationRun) {
    this.worlds = TemplateCompilerInvocationWorldMaterializer.candidateStrict(publication);
  }

  projectRootCohort(
    definitionMaterialization: LocalTemplateOccurrenceDefinitionMaterialization,
    ingressCohort: TemplateCompilerOccurrenceCompilationIngressCohort,
  ): TemplateCompilerOccurrencePostLocalWorldClosure {
    const existing = this.closuresByIngressCohort.get(ingressCohort);
    if (existing != null) {
      if (
        existing.definitionMaterialization !== definitionMaterialization
        || existing.ingressCohort !== ingressCohort
        || existing.publication !== this.publication
      ) {
        throw new Error('Occurrence post-local world closure cache received a foreign sibling materialization.');
      }
      if (!existing.isClaimable()) {
        throw new Error('Occurrence post-local world closure is no longer at its claimable sibling frontier.');
      }
      return existing;
    }
    const owner = occurrenceWorldClosureOwners.get(ingressCohort);
    if (owner != null && owner !== this) {
      throw new Error('Occurrence post-local world closure belongs to another materializer.');
    }
    const preparation = ingressCohort.definitionPreparation;
    const partition = preparation.rootPartition;
    const binding = partition.incoming.family.binding;
    if (
      !definitionMaterialization.isModuleConstructed()
      || !ingressCohort.isModuleConstructed()
      || !ingressCohort.isCurrent()
      || definitionMaterialization.preparation !== preparation
      || definitionMaterialization.entries.length !== ingressCohort.entries.length
      || definitionMaterialization.entries.some((entry, ordinal) =>
        entry !== preparation.entries[ordinal]
        || ingressCohort.entries[ordinal]?.definitionEntry !== entry
      )
      || this.publication !== binding.browserEmission.publication
      || definitionMaterialization.entries.some((entry) =>
        entry.definition.productHandle == null
        || this.publication.readProductDetail(
          ResourceProductDetails.Definition,
          entry.definition.productHandle,
        ) !== entry.definition
      )
    ) {
      throw new Error('Occurrence post-local world projection requires one current published sibling cohort.');
    }

    const sourceAddressHandle = binding.definition.template?.addressHandle ?? binding.definition.sourceAddressHandle;
    const postLocalWorld = this.worlds.projectPostLocalWorld(
      binding.preLocalCompilerWorld,
      definitionMaterialization.definitions,
      binding.lane.localKey,
      sourceAddressHandle,
    );
    if (
      postLocalWorld === binding.preLocalCompilerWorld
      || definitionMaterialization.entries.some((entry) =>
        postLocalWorld.resourceResolver.el(entry.definition.name)?.definitionProductHandle
          !== entry.definition.productHandle
      )
    ) {
      throw new Error('Projected occurrence post-local world lost one or more direct sibling lookup winners.');
    }
    const closure = new TemplateCompilerOccurrencePostLocalWorldClosure(
      occurrenceWorldClosureAuthority,
      this.publication,
      definitionMaterialization,
      ingressCohort,
      binding.preLocalCompilerWorld,
      postLocalWorld,
    );
    this.closuresByIngressCohort.set(ingressCohort, closure);
    occurrenceWorldClosureOwners.set(ingressCohort, this);
    return closure;
  }
}
