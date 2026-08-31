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
const occurrenceWorldTransferAuthority = {};
const occurrenceWorldClosureOwners = new WeakMap<
  TemplateCompilerOccurrenceCompilationIngressCohort,
  TemplateCompilerOccurrenceWorldClosureMaterializer
>();

/** Invocation traversal transition from the completed pre-local bootstrap to the projected post-local world. */
export class TemplateCompilerOccurrenceTraversalWorldProjection {
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
    const execution = this.closure.binding.execution;
    const lane = this.closure.lane;
    const bootstrapClosure = this.closure.bootstrapClosure;
    return this.#authority === occurrenceWorldClosureAuthority
      && execution.invocationPhase(lane) === TemplateCompilerInvocationPhase.BootstrapClosed
      && lane.targetPlan == null
      && execution.sequence.readLaneOperations(lane).length === bootstrapClosure.laneOperationCount
      && !execution.sequence.readContexts().some((context) => context.lane === lane);
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

/** Durable one-shot child hook-parent authority claimed while the complete sibling frontier is still atomic. */
export class TemplateCompilerOccurrenceChildHookParentWorldTransfer {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly projection: TemplateCompilerOccurrenceChildHookParentWorldProjection,
  ) {
    if (authority !== occurrenceWorldTransferAuthority || !projection.isPendingCurrent()) {
      throw new Error('Occurrence child hook-parent transfer requires one current claimed projection.');
    }
    this.#authority = authority;
  }

  get world(): TemplateCompilerWorldEmission {
    return this.projection.world;
  }

  get lane() {
    return this.projection.lane;
  }

  get ingress() {
    return this.projection.ingress;
  }

  get definitionEntry() {
    return this.projection.definitionEntry;
  }

  isPendingCurrent(): boolean {
    return this.#authority === occurrenceWorldTransferAuthority
      && this.projection.closure.isCurrent()
      && this.projection.hasPendingFrontier();
  }
}

/** Atomic claim over every direct sibling child-world transfer before any parent or child target work begins. */
export class TemplateCompilerOccurrenceChildHookParentWorldClaim {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly closure: TemplateCompilerOccurrencePostLocalWorldClosure,
    readonly transfers: readonly TemplateCompilerOccurrenceChildHookParentWorldTransfer[],
  ) {
    if (
      authority !== occurrenceWorldTransferAuthority
      || transfers.length !== closure.childHookParentProjections.length
      || transfers.some((transfer, ordinal) =>
        transfer.projection !== closure.childHookParentProjections[ordinal]
      )
    ) {
      throw new Error('Occurrence child hook-parent claim lost complete sibling transfer coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === occurrenceWorldTransferAuthority;
  }
}

/** Candidate-only world projection over one published direct-sibling occurrence cohort. */
export class TemplateCompilerOccurrencePostLocalWorldClosure {
  readonly #authority: object;
  readonly traversalProjection: TemplateCompilerOccurrenceTraversalWorldProjection;
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
    this.traversalProjection = new TemplateCompilerOccurrenceTraversalWorldProjection(
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
    return this.ingressCohort.definitionPreparation.ownerPartition.incoming.family.binding;
  }

  get lane() {
    return this.ingressCohort.definitionPreparation.ownerPartition.incoming.lane;
  }

  get bootstrapClosure() {
    return this.ingressCohort.definitionPreparation.ownerPartition.closure;
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
      && this.traversalProjection.hasPendingFrontier()
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
  private readonly claimsByClosure = new WeakMap<
    TemplateCompilerOccurrencePostLocalWorldClosure,
    TemplateCompilerOccurrenceChildHookParentWorldClaim
  >();

  constructor(readonly publication: ComputationRun) {
    this.worlds = TemplateCompilerInvocationWorldMaterializer.candidateStrict(publication);
  }

  projectCohort(
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
    const partition = preparation.ownerPartition;
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

    const ownerDefinition = definitionMaterialization.ownerDefinition;
    const sourceAddressHandle = ownerDefinition.template?.addressHandle ?? ownerDefinition.sourceAddressHandle;
    const preLocalWorld = partition.closure.hookBootstrap.compilerWorld;
    if (preLocalWorld == null) {
      throw new Error('Occurrence post-local world projection lost the exact hook compiler world.');
    }
    const postLocalWorld = this.worlds.projectPostLocalWorld(
      preLocalWorld,
      definitionMaterialization.definitions,
      partition.incoming.lane.localKey,
      sourceAddressHandle,
    );
    if (
      postLocalWorld === preLocalWorld
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
      preLocalWorld,
      postLocalWorld,
    );
    this.closuresByIngressCohort.set(ingressCohort, closure);
    occurrenceWorldClosureOwners.set(ingressCohort, this);
    return closure;
  }

  /** Claim the whole sibling child-world band before parent traversal can invalidate the immediate frontier. */
  claimChildHookParents(
    closure: TemplateCompilerOccurrencePostLocalWorldClosure,
  ): TemplateCompilerOccurrenceChildHookParentWorldClaim {
    const existing = this.claimsByClosure.get(closure) ?? null;
    if (existing != null) return existing;
    if (
      this.closuresByIngressCohort.get(closure.ingressCohort) !== closure
      || !closure.isClaimable()
    ) {
      throw new Error('Occurrence child hook-parent claim requires one current complete sibling frontier.');
    }
    const claim = new TemplateCompilerOccurrenceChildHookParentWorldClaim(
      occurrenceWorldTransferAuthority,
      closure,
      closure.childHookParentProjections.map((projection) =>
        new TemplateCompilerOccurrenceChildHookParentWorldTransfer(
          occurrenceWorldTransferAuthority,
          projection,
        )
      ),
    );
    this.claimsByClosure.set(closure, claim);
    return claim;
  }
}
