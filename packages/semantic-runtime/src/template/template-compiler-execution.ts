import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type {
  AddressHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  TemplateCompilerTargetContextPlan,
  TemplateCompilerTargetPlan,
} from './compiler-target-plan.js';
import type { TemplateCompilerHookSet } from './compiler-hook-world.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerNodeOccurrence,
  TemplateCompilerOccurrenceForest,
} from './template-compiler-occurrence.js';
import type { TemplateCompilerStructuralExecutionSession } from './template-compiler-structural-execution.js';

const compilerExecutionForests = new WeakSet<TemplateCompilerOccurrenceForest>();
const compilerExecutionStructuralFamilies = new WeakSet<TemplateCompilerStructuralExecutionSession>();

/** Current executable phase of one compiler invocation lane. */
export const enum TemplateCompilerInvocationPhase {
  CompilerHooks = 'compiler-hooks',
  LocalTemplateExtraction = 'local-template-extraction',
  TargetExecution = 'target-execution',
}

/** Semantic compiler boundary retained in one family-wide execution sequence. */
export const enum TemplateCompilerOperationKind {
  CompilerHook = 'compiler-hook',
  LocalTemplateExtraction = 'local-template-extraction',
  ProcessContent = 'process-content',
  ProjectionExtraction = 'projection-extraction',
  TemplateControllerWrapping = 'template-controller-wrapping',
  ContainerlessReplacement = 'containerless-replacement',
  TextInterpolationExpansion = 'text-interpolation-expansion',
  HydrationTargetCreation = 'hydration-target-creation',
  AttributeDisposition = 'attribute-disposition',
}

/** Mechanism through which execution of one reached compiler operation was attempted. */
export const enum TemplateCompilerOperationExecutionMechanism {
  BuiltIn = 'built-in',
  StaticCallable = 'static-callable',
  AuthorizedHost = 'authorized-host',
  /** The operation was observed but no mechanism was admitted to execute it. */
  NotAttempted = 'not-attempted',
}

/** Completion posture of one reached compiler operation. */
export const enum TemplateCompilerOperationCompletionKind {
  Complete = 'complete',
  /** The operation ran and explicitly declined its optional transformation, such as `processContent` returning false. */
  Declined = 'declined',
  Open = 'open',
  Refused = 'refused',
  Abrupt = 'abrupt',
}

/** Completion details whose shape is independent of the operation family. */
export class TemplateCompilerOperationCompletion {
  readonly completionKind: TemplateCompilerOperationCompletionKind;
  readonly openSeamHandles: readonly OpenSeamHandle[];
  readonly detail: string | null;

  constructor(
    completionKind: TemplateCompilerOperationCompletionKind,
    openSeamHandles: readonly OpenSeamHandle[] = [],
    /** Human-readable refusal or abrupt-completion fact; policy diagnostics remain a later projection. */
    detail: string | null = null,
  ) {
    if (new Set(openSeamHandles).size !== openSeamHandles.length) {
      throw new Error('Compiler operation completion repeats an open-seam handle.');
    }
    switch (completionKind) {
      case TemplateCompilerOperationCompletionKind.Complete:
      case TemplateCompilerOperationCompletionKind.Declined:
        if (openSeamHandles.length > 0 || detail != null) {
          throw new Error(`Compiler operation completion '${completionKind}' cannot carry open or failure details.`);
        }
        break;
      case TemplateCompilerOperationCompletionKind.Open:
        if (openSeamHandles.length === 0) {
          throw new Error('Open compiler operation completion requires at least one open seam.');
        }
        if (detail != null) {
          throw new Error('Open compiler operation completion takes its explanation from open seams.');
        }
        break;
      case TemplateCompilerOperationCompletionKind.Refused:
      case TemplateCompilerOperationCompletionKind.Abrupt:
        if (detail == null || detail.length === 0) {
          throw new Error(`Compiler operation completion '${completionKind}' requires a detail.`);
        }
        break;
    }
    this.completionKind = completionKind;
    this.openSeamHandles = [...openSeamHandles];
    this.detail = detail;
  }
}

export const enum TemplateCompilerOperationTargetKind {
  Occurrence = 'occurrence',
  Resource = 'resource',
  Instruction = 'instruction',
  CallableEffect = 'callable-effect',
  CompilerHook = 'compiler-hook',
}

/** Exact run-local node or attribute occurrence acted upon by a compiler operation. */
export class TemplateCompilerOccurrenceOperationTarget {
  readonly targetKind = TemplateCompilerOperationTargetKind.Occurrence;
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly context: TemplateCompilerOperationContextReference,
    readonly occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ) {
    this.#familyAuthority = familyAuthority;
  }

  isOwnedBy(familyAuthority: object): boolean {
    return this.#familyAuthority === familyAuthority;
  }
}

/** Exact materialized resource definition acted upon by a compiler operation. */
export class TemplateCompilerResourceOperationTarget {
  readonly targetKind = TemplateCompilerOperationTargetKind.Resource;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

/** Exact instruction acted upon by a compiler operation. */
export class TemplateCompilerInstructionOperationTarget {
  readonly targetKind = TemplateCompilerOperationTargetKind.Instruction;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

/** Exact callable authority retained independently from the structure on which it acts. */
export class TemplateCompilerCallableReference {
  constructor(
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {
    if (productHandle == null && identityHandle == null && sourceAddressHandle == null) {
      throw new Error('Compiler callable reference requires a product, identity, or source address.');
    }
  }
}

/** `processContent` target retaining both the callable and exact acted-on structure. */
export class TemplateCompilerCallableEffectOperationTarget {
  readonly targetKind = TemplateCompilerOperationTargetKind.CallableEffect;
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly callable: TemplateCompilerCallableReference,
    readonly actedOn: TemplateCompilerOccurrenceOperationTarget,
  ) {
    this.#familyAuthority = familyAuthority;
  }

  isOwnedBy(familyAuthority: object): boolean {
    return this.#familyAuthority === familyAuthority;
  }
}

export const enum TemplateCompilerHookOperationStage {
  HookSetResolution = 'hook-set-resolution',
  ProviderResolution = 'provider-resolution',
  CallableInspection = 'callable-inspection',
  Invocation = 'invocation',
}

/** Hook-set resolution/member boundary paired with the pre-plan compiler carrier it can affect. */
export class TemplateCompilerHookOperationTarget {
  readonly targetKind = TemplateCompilerOperationTargetKind.CompilerHook;
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly hookSet: TemplateCompilerHookSet,
    readonly operationStage: TemplateCompilerHookOperationStage,
    /** Null addresses whole-set membership/provider resolution; otherwise the exact ordered member boundary. */
    readonly entryOrdinal: number | null,
    /** Present only when the selected member retained an exact callable identity. */
    readonly callable: TemplateCompilerCallableReference | null,
    readonly actedOn: TemplateCompilerOccurrenceOperationTarget,
  ) {
    this.#familyAuthority = familyAuthority;
    if (
      entryOrdinal != null
      && (!Number.isSafeInteger(entryOrdinal) || entryOrdinal < 0 || entryOrdinal >= hookSet.entries.length)
    ) {
      throw new Error(`Compiler hook entry ordinal '${entryOrdinal}' is outside the retained hook set.`);
    }
    switch (operationStage) {
      case TemplateCompilerHookOperationStage.HookSetResolution:
        if (entryOrdinal != null || callable != null) {
          throw new Error('Whole-set compiler hook resolution cannot carry a member or callable.');
        }
        break;
      case TemplateCompilerHookOperationStage.ProviderResolution:
      case TemplateCompilerHookOperationStage.CallableInspection:
        if (entryOrdinal == null || callable != null) {
          throw new Error(`Compiler hook stage '${operationStage}' requires one member without a callable.`);
        }
        break;
      case TemplateCompilerHookOperationStage.Invocation:
        if (entryOrdinal == null || callable == null) {
          throw new Error('Compiler hook invocation requires one exact member and callable.');
        }
        break;
    }
  }

  isOwnedBy(familyAuthority: object): boolean {
    return this.#familyAuthority === familyAuthority;
  }
}

export type TemplateCompilerOperationTarget =
  | TemplateCompilerOccurrenceOperationTarget
  | TemplateCompilerResourceOperationTarget
  | TemplateCompilerInstructionOperationTarget
  | TemplateCompilerCallableEffectOperationTarget
  | TemplateCompilerHookOperationTarget;

/** Family-owned compiler invocation lane, admitted before its eventual target plan exists. */
export class TemplateCompilerExecutionLaneReference {
  readonly #familyAuthority: object;
  #targetPlan: TemplateCompilerTargetPlan | null = null;

  constructor(
    familyAuthority: object,
    readonly localKey: string,
    /** Exact carrier/content pair passed to this compiler invocation. */
    readonly compilerCarrier: TemplateCompilerElementOccurrence,
    readonly compilerContent: TemplateCompilerFragmentOccurrence,
    readonly ordinal: number,
  ) {
    this.#familyAuthority = familyAuthority;
    if (localKey.length === 0) {
      throw new Error('Compiler invocation lane requires a non-empty key.');
    }
  }

  get targetPlan(): TemplateCompilerTargetPlan | null {
    return this.#targetPlan;
  }

  isOwnedBy(familyAuthority: object): boolean {
    return this.#familyAuthority === familyAuthority;
  }

  bindTargetPlan(familyAuthority: object, targetPlan: TemplateCompilerTargetPlan): void {
    if (!this.isOwnedBy(familyAuthority)) {
      throw new Error(`Compiler execution lane '${this.localKey}' belongs to another family.`);
    }
    if (this.#targetPlan != null && this.#targetPlan !== targetPlan) {
      throw new Error(`Compiler execution lane '${this.localKey}' already owns another target plan.`);
    }
    if (targetPlan.localKey !== this.localKey) {
      throw new Error(
        `Compiler execution lane '${this.localKey}' cannot attach target plan '${targetPlan.localKey}'.`,
      );
    }
    this.#targetPlan = targetPlan;
  }
}

/** Pre-plan context whose authority is the exact carrier subtree of one compiler invocation. */
export class TemplateCompilerBootstrapContextReference {
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly lane: TemplateCompilerExecutionLaneReference,
    readonly ordinal: number,
  ) {
    this.#familyAuthority = familyAuthority;
  }

  get localKey(): string {
    return `${this.lane.localKey}:bootstrap`;
  }

  get compilerCarrier(): TemplateCompilerElementOccurrence {
    return this.lane.compilerCarrier;
  }

  get compilerContent(): TemplateCompilerFragmentOccurrence {
    return this.lane.compilerContent;
  }

  isOwnedBy(familyAuthority: object): boolean {
    return this.#familyAuthority === familyAuthority;
  }
}

/** Canonical family-local reference to one exact structural target context. */
export class TemplateCompilerExecutionContextReference {
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly lane: TemplateCompilerExecutionLaneReference,
    readonly targetContext: TemplateCompilerTargetContextPlan,
    readonly ordinal: number,
    readonly laneOrdinal: number,
  ) {
    this.#familyAuthority = familyAuthority;
  }

  get localKey(): string {
    return this.targetContext.localKey;
  }

  isOwnedBy(familyAuthority: object): boolean {
    return this.#familyAuthority === familyAuthority;
  }
}

export type TemplateCompilerOperationContextReference =
  | TemplateCompilerBootstrapContextReference
  | TemplateCompilerExecutionContextReference;

/** Event-time authority retained while one semantic compiler boundary performs its mechanical work. */
export class TemplateCompilerPendingOperationAttempt {
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly operationKey: string,
    readonly executionOrdinal: number,
    readonly context: TemplateCompilerOperationContextReference,
    readonly operationKind: TemplateCompilerOperationKind,
    readonly executionMechanism: TemplateCompilerOperationExecutionMechanism,
    readonly target: TemplateCompilerOperationTarget,
    readonly causeHandles: readonly ClaimEndpointHandle[],
    readonly producedProductHandles: readonly ProductHandle[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {
    this.#familyAuthority = familyAuthority;
  }

  get lane(): TemplateCompilerExecutionLaneReference {
    return this.context.lane;
  }

  isOwnedBy(familyAuthority: object): boolean {
    return this.#familyAuthority === familyAuthority;
  }
}

/** One reached semantic compiler boundary in exact family execution order. */
export class TemplateCompilerOperation {
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly operationKey: string,
    readonly executionOrdinal: number,
    readonly context: TemplateCompilerOperationContextReference,
    readonly operationKind: TemplateCompilerOperationKind,
    readonly executionMechanism: TemplateCompilerOperationExecutionMechanism,
    readonly target: TemplateCompilerOperationTarget,
    readonly completion: TemplateCompilerOperationCompletion,
    readonly causeHandles: readonly ClaimEndpointHandle[],
    readonly producedProductHandles: readonly ProductHandle[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {
    this.#familyAuthority = familyAuthority;
  }

  get lane(): TemplateCompilerExecutionLaneReference {
    return this.context.lane;
  }

  isOwnedBy(familyAuthority: object): boolean {
    return this.#familyAuthority === familyAuthority;
  }
}

/** Input retained before one semantic compiler boundary begins mechanical execution. */
export interface TemplateCompilerOperationAttemptRequest {
  readonly operationKey: string;
  readonly context: TemplateCompilerOperationContextReference;
  readonly operationKind: TemplateCompilerOperationKind;
  readonly executionMechanism: TemplateCompilerOperationExecutionMechanism;
  readonly target: TemplateCompilerOperationTarget;
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly producedProductHandles?: readonly ProductHandle[];
  readonly sourceAddressHandle?: AddressHandle | null;
}

/** Read-only view over the run-local execution topology owned by one compiler family session. */
export class TemplateCompilerExecutionSequence {
  constructor(
    private readonly familyAuthority: object,
    readonly familyKey: string,
    private readonly lanes: TemplateCompilerExecutionLaneReference[],
    private readonly bootstrapContexts: TemplateCompilerBootstrapContextReference[],
    private readonly contexts: TemplateCompilerExecutionContextReference[],
    private readonly operations: TemplateCompilerOperation[],
    private readonly operationsByLane: Map<TemplateCompilerExecutionLaneReference, TemplateCompilerOperation[]>,
    private readonly operationsByContext: Map<TemplateCompilerOperationContextReference, TemplateCompilerOperation[]>,
  ) {}

  readLanes(): readonly TemplateCompilerExecutionLaneReference[] {
    return this.lanes;
  }

  readContexts(): readonly TemplateCompilerExecutionContextReference[] {
    return this.contexts;
  }

  readBootstrapContexts(): readonly TemplateCompilerBootstrapContextReference[] {
    return this.bootstrapContexts;
  }

  readOperations(): readonly TemplateCompilerOperation[] {
    return this.operations;
  }

  readLaneOperations(lane: TemplateCompilerExecutionLaneReference): readonly TemplateCompilerOperation[] {
    if (!lane.isOwnedBy(this.familyAuthority) || !this.operationsByLane.has(lane)) {
      throw new Error(`Compiler execution lane '${lane.localKey}' belongs to another family sequence.`);
    }
    return this.operationsByLane.get(lane)!;
  }

  readContextOperations(context: TemplateCompilerOperationContextReference): readonly TemplateCompilerOperation[] {
    if (!context.isOwnedBy(this.familyAuthority) || !this.operationsByContext.has(context)) {
      throw new Error(`Compiler execution context '${context.localKey}' belongs to another family sequence.`);
    }
    return this.operationsByContext.get(context)!;
  }
}

/**
 * Product-free forest-first owner for one exact compiler family/cohort invocation.
 *
 * Invocation lanes and bootstrap effects exist before target plans. Sealed plans and structural contexts attach only
 * after the hook/local pre-walk phase closes. Lanes may interleave in one global order, while open, refused, and abrupt
 * boundaries terminate only the affected exact lane.
 */
export class TemplateCompilerExecutionSession {
  /** Compatibility entry for already-planned structural replay. New compiler execution starts with `createForForest`. */
  static create(
    familyKey: string,
    structuralExecution: TemplateCompilerStructuralExecutionSession,
  ): TemplateCompilerExecutionSession {
    const session = TemplateCompilerExecutionSession.createForForest(familyKey, structuralExecution.forest);
    session.attachStructuralExecution(structuralExecution);
    return session;
  }

  static createForForest(
    familyKey: string,
    forest: TemplateCompilerOccurrenceForest,
  ): TemplateCompilerExecutionSession {
    if (compilerExecutionForests.has(forest)) {
      throw new Error('Compiler occurrence forest already owns an ordered execution session.');
    }
    const session = new TemplateCompilerExecutionSession(familyKey, forest);
    compilerExecutionForests.add(forest);
    return session;
  }

  readonly sequence: TemplateCompilerExecutionSequence;
  private readonly familyAuthority = {};
  private readonly lanes: TemplateCompilerExecutionLaneReference[] = [];
  private readonly lanesByTargetPlan = new Map<TemplateCompilerTargetPlan, TemplateCompilerExecutionLaneReference>();
  private readonly lanesByLocalKey = new Map<string, TemplateCompilerExecutionLaneReference>();
  private readonly bootstrapContexts: TemplateCompilerBootstrapContextReference[] = [];
  private readonly bootstrapContextsByLane = new Map<
    TemplateCompilerExecutionLaneReference,
    TemplateCompilerBootstrapContextReference
  >();
  private readonly invocationPhases = new Map<
    TemplateCompilerExecutionLaneReference,
    TemplateCompilerInvocationPhase
  >();
  private readonly contexts: TemplateCompilerExecutionContextReference[] = [];
  private readonly contextsByTargetContext = new Map<
    TemplateCompilerTargetContextPlan,
    TemplateCompilerExecutionContextReference
  >();
  private readonly contextsByLocalKey = new Map<string, TemplateCompilerExecutionContextReference>();
  private readonly contextsByLane = new Map<
    TemplateCompilerExecutionLaneReference,
    TemplateCompilerExecutionContextReference[]
  >();
  private readonly operations: TemplateCompilerOperation[] = [];
  private readonly operationsByKey = new Map<string, TemplateCompilerOperation>();
  private readonly operationsByLane = new Map<
    TemplateCompilerExecutionLaneReference,
    TemplateCompilerOperation[]
  >();
  private readonly operationsByContext = new Map<
    TemplateCompilerOperationContextReference,
    TemplateCompilerOperation[]
  >();
  private readonly producedProducts = new Map<ProductHandle, TemplateCompilerOperation>();
  private readonly terminalOperationsByLane = new Map<
    TemplateCompilerExecutionLaneReference,
    TemplateCompilerOperation
  >();
  private structuralFamily: TemplateCompilerStructuralExecutionSession | null = null;
  private pendingAttempt: TemplateCompilerPendingOperationAttempt | null = null;
  private sealed = false;

  private constructor(
    readonly familyKey: string,
    readonly forest: TemplateCompilerOccurrenceForest,
  ) {
    if (familyKey.length === 0) {
      throw new Error('Compiler execution family requires a non-empty key.');
    }
    this.sequence = new TemplateCompilerExecutionSequence(
      this.familyAuthority,
      familyKey,
      this.lanes,
      this.bootstrapContexts,
      this.contexts,
      this.operations,
      this.operationsByLane,
      this.operationsByContext,
    );
  }

  get structuralExecution(): TemplateCompilerStructuralExecutionSession | null {
    return this.structuralFamily;
  }

  attachStructuralExecution(structuralExecution: TemplateCompilerStructuralExecutionSession): void {
    this.requireMutable();
    this.requireNoPendingAttempt('attach structural execution');
    if (this.structuralFamily === structuralExecution) return;
    if (this.structuralFamily != null) {
      throw new Error('Compiler execution family already owns another structural execution session.');
    }
    if (compilerExecutionStructuralFamilies.has(structuralExecution)) {
      throw new Error('Compiler structural execution family already owns an ordered execution session.');
    }
    if (structuralExecution.forest !== this.forest) {
      throw new Error('Compiler structural execution belongs to another occurrence forest.');
    }
    this.structuralFamily = structuralExecution;
    compilerExecutionStructuralFamilies.add(structuralExecution);
  }

  get isSealed(): boolean {
    return this.sealed;
  }

  readPendingAttempt(): TemplateCompilerPendingOperationAttempt | null {
    return this.pendingAttempt;
  }

  /** Admit the root compiler invocation before hooks or local-template discovery. */
  admitRootInvocation(localKey: string): TemplateCompilerExecutionLaneReference {
    if (this.lanes.length > 0) {
      throw new Error('Compiler execution family root invocation must be admitted first.');
    }
    return this.admitInvocation(localKey, this.forest.compilerCarrier, this.forest.compilerContent);
  }

  /** Admit a detached local-template invocation only after its parent extraction operation completed exactly. */
  admitExtractedInvocation(
    localKey: string,
    compilerCarrier: TemplateCompilerElementOccurrence,
    compilerContent: TemplateCompilerFragmentOccurrence,
    extraction: TemplateCompilerOperation,
  ): TemplateCompilerExecutionLaneReference {
    if (
      !extraction.isOwnedBy(this.familyAuthority)
      || extraction.operationKind !== TemplateCompilerOperationKind.LocalTemplateExtraction
      || extraction.completion.completionKind !== TemplateCompilerOperationCompletionKind.Complete
      || !(extraction.target instanceof TemplateCompilerOccurrenceOperationTarget)
      || extraction.target.occurrence !== compilerCarrier
    ) {
      throw new Error('Local compiler invocation requires its exact completed carrier-extraction operation.');
    }
    return this.admitInvocation(localKey, compilerCarrier, compilerContent);
  }

  bootstrapContext(
    lane: TemplateCompilerExecutionLaneReference,
  ): TemplateCompilerBootstrapContextReference {
    this.requireLane(lane);
    return this.bootstrapContextsByLane.get(lane)!;
  }

  invocationPhase(lane: TemplateCompilerExecutionLaneReference): TemplateCompilerInvocationPhase {
    this.requireLane(lane);
    return this.invocationPhases.get(lane)!;
  }

  admitTargetPlan(targetPlan: TemplateCompilerTargetPlan): TemplateCompilerExecutionLaneReference {
    this.requireMutable();
    this.requireNoPendingAttempt('admit a target plan');
    const structuralExecution = this.requireStructuralExecution();
    if (!structuralExecution.readTargetPlans().includes(targetPlan)) {
      throw new Error(`Compiler target plan '${targetPlan.localKey}' belongs to another structural family.`);
    }
    const existing = this.lanesByTargetPlan.get(targetPlan);
    if (existing != null) return existing;
    let lane = this.lanesByLocalKey.get(targetPlan.localKey) ?? null;
    if (lane == null) {
      const structure = structuralExecution.readContextStructure(targetPlan.root);
      if (structure == null) {
        throw new Error(`Compiler target plan '${targetPlan.localKey}' has no attached root carrier structure.`);
      }
      lane = this.admitInvocation(
        targetPlan.localKey,
        structure.compilerCarrier,
        structure.compilerContent,
      );
    } else if (lane.targetPlan != null) {
      throw new Error(`Compiler execution lane key '${targetPlan.localKey}' collides with another target plan.`);
    }
    return this.attachTargetPlan(lane, targetPlan);
  }

  /** Attach one sealed post-bootstrap target plan to its existing compiler invocation lane. */
  attachTargetPlan(
    lane: TemplateCompilerExecutionLaneReference,
    targetPlan: TemplateCompilerTargetPlan,
  ): TemplateCompilerExecutionLaneReference {
    this.requireMutable();
    this.requireNoPendingAttempt('attach a target plan');
    this.requireLane(lane);
    this.requireOpenLane(lane);
    if (!targetPlan.isSealed) {
      throw new Error(`Compiler target plan '${targetPlan.localKey}' must be sealed before invocation attachment.`);
    }
    const structuralExecution = this.requireStructuralExecution();
    if (!structuralExecution.readTargetPlans().includes(targetPlan)) {
      throw new Error(`Compiler target plan '${targetPlan.localKey}' belongs to another structural family.`);
    }
    const structure = structuralExecution.readContextStructure(targetPlan.root);
    if (
      structure == null
      || structure.compilerCarrier !== lane.compilerCarrier
      || structure.compilerContent !== lane.compilerContent
    ) {
      throw new Error(`Compiler target plan '${targetPlan.localKey}' does not own invocation lane '${lane.localKey}'.`);
    }
    const existing = this.lanesByTargetPlan.get(targetPlan) ?? null;
    if (existing != null && existing !== lane) {
      throw new Error(`Compiler target plan '${targetPlan.localKey}' already belongs to another invocation lane.`);
    }
    lane.bindTargetPlan(this.familyAuthority, targetPlan);
    this.lanesByTargetPlan.set(targetPlan, lane);
    return lane;
  }

  admitContext(
    lane: TemplateCompilerExecutionLaneReference,
    targetContext: TemplateCompilerTargetContextPlan,
  ): TemplateCompilerExecutionContextReference {
    this.requireMutable();
    this.requireNoPendingAttempt('admit a target context');
    this.requireLane(lane);
    this.requireOpenLane(lane);
    const targetPlan = lane.targetPlan;
    const structuralExecution = this.requireStructuralExecution();
    if (
      targetPlan == null
      || targetPlan.contextForLocalKey(targetContext.localKey) !== targetContext
      || structuralExecution.contextForLocalKey(targetContext.localKey) !== targetContext
    ) {
      throw new Error(`Compiler target context '${targetContext.localKey}' belongs to another structural family lane.`);
    }
    const existing = this.contextsByTargetContext.get(targetContext);
    if (existing != null) {
      if (existing.lane !== lane) {
        throw new Error(`Compiler target context '${targetContext.localKey}' belongs to another execution lane.`);
      }
      return existing;
    }
    if (this.contextsByLocalKey.has(targetContext.localKey)) {
      throw new Error(`Compiler target context key '${targetContext.localKey}' collides in the execution family.`);
    }
    const laneContexts = this.contextsByLane.get(lane)!;
    const context = new TemplateCompilerExecutionContextReference(
      this.familyAuthority,
      lane,
      targetContext,
      this.contexts.length,
      laneContexts.length,
    );
    this.contexts.push(context);
    laneContexts.push(context);
    this.contextsByTargetContext.set(targetContext, context);
    this.contextsByLocalKey.set(targetContext.localKey, context);
    this.operationsByContext.set(context, []);
    return context;
  }

  private admitInvocation(
    localKey: string,
    compilerCarrier: TemplateCompilerElementOccurrence,
    compilerContent: TemplateCompilerFragmentOccurrence,
  ): TemplateCompilerExecutionLaneReference {
    this.requireMutable();
    this.requireNoPendingAttempt('admit a compiler invocation');
    if (this.lanesByLocalKey.has(localKey)) {
      throw new Error(`Compiler execution lane key '${localKey}' is already admitted.`);
    }
    if (this.lanes.length === 0 && compilerCarrier !== this.forest.compilerCarrier) {
      throw new Error(`Compiler invocation '${localKey}' cannot precede the root compiler carrier.`);
    }
    if (
      this.forest.nodeForOccurrenceKey(compilerCarrier.occurrenceKey) !== compilerCarrier
      || this.forest.nodeForOccurrenceKey(compilerContent.occurrenceKey) !== compilerContent
      || compilerCarrier.templateContent !== compilerContent
      || compilerContent.parent !== compilerCarrier
    ) {
      throw new Error(`Compiler invocation '${localKey}' does not own one exact carrier/content pair in this forest.`);
    }
    const lane = new TemplateCompilerExecutionLaneReference(
      this.familyAuthority,
      localKey,
      compilerCarrier,
      compilerContent,
      this.lanes.length,
    );
    const bootstrapContext = new TemplateCompilerBootstrapContextReference(
      this.familyAuthority,
      lane,
      this.bootstrapContexts.length,
    );
    this.lanes.push(lane);
    this.lanesByLocalKey.set(localKey, lane);
    this.bootstrapContexts.push(bootstrapContext);
    this.bootstrapContextsByLane.set(lane, bootstrapContext);
    this.invocationPhases.set(lane, TemplateCompilerInvocationPhase.CompilerHooks);
    this.contextsByLane.set(lane, []);
    this.operationsByLane.set(lane, []);
    this.operationsByContext.set(bootstrapContext, []);
    return lane;
  }

  occurrenceTarget(
    context: TemplateCompilerOperationContextReference,
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): TemplateCompilerOccurrenceOperationTarget {
    this.requireContext(context);
    this.requireOccurrenceContext(context, occurrence);
    return new TemplateCompilerOccurrenceOperationTarget(
      this.familyAuthority,
      context,
      occurrence,
    );
  }

  callableEffectTarget(
    context: TemplateCompilerOperationContextReference,
    callable: TemplateCompilerCallableReference,
    actedOnOccurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): TemplateCompilerCallableEffectOperationTarget {
    const actedOn = this.occurrenceTarget(context, actedOnOccurrence);
    return new TemplateCompilerCallableEffectOperationTarget(
      this.familyAuthority,
      callable,
      actedOn,
    );
  }

  compilerHookTarget(
    context: TemplateCompilerBootstrapContextReference,
    hookSet: TemplateCompilerHookSet,
    operationStage: TemplateCompilerHookOperationStage,
    entryOrdinal: number | null,
    callable: TemplateCompilerCallableReference | null = null,
  ): TemplateCompilerHookOperationTarget {
    const actedOn = this.occurrenceTarget(context, context.compilerCarrier);
    return new TemplateCompilerHookOperationTarget(
      this.familyAuthority,
      hookSet,
      operationStage,
      entryOrdinal,
      callable,
      actedOn,
    );
  }

  beginOperation(request: TemplateCompilerOperationAttemptRequest): TemplateCompilerPendingOperationAttempt {
    this.requireMutable();
    this.requireNoPendingAttempt('begin another operation');
    this.requireContext(request.context);
    this.requireOpenLane(request.context.lane);
    if (request.operationKey.length === 0) {
      throw new Error('Compiler operation requires a non-empty key.');
    }
    if (this.operationsByKey.has(request.operationKey)) {
      throw new Error(`Compiler operation '${request.operationKey}' already exists.`);
    }
    if (request.causeHandles.length === 0) {
      throw new Error(`Compiler operation '${request.operationKey}' requires at least one semantic cause.`);
    }
    this.requireCurrentTarget(request.context, request.operationKind, request.target);
    const producedProductHandles = request.producedProductHandles ?? [];
    this.assertProducedProductsAvailable(request.operationKey, producedProductHandles);
    this.advanceInvocationPhase(request.context, request.operationKind);

    // Attempt data crosses the driver/session boundary before mechanical execution. This snapshot is the event-time
    // authority that remains valid when the operation intentionally moves or consumes its target occurrence.
    const attempt = new TemplateCompilerPendingOperationAttempt(
      this.familyAuthority,
      request.operationKey,
      this.operations.length,
      request.context,
      request.operationKind,
      request.executionMechanism,
      request.target,
      [...request.causeHandles],
      [...producedProductHandles],
      request.sourceAddressHandle ?? null,
    );
    this.pendingAttempt = attempt;
    return attempt;
  }

  completeOperation(
    attempt: TemplateCompilerPendingOperationAttempt,
    completion: TemplateCompilerOperationCompletion,
  ): TemplateCompilerOperation {
    this.requireMutable();
    if (
      this.pendingAttempt !== attempt
      || !attempt.isOwnedBy(this.familyAuthority)
    ) {
      throw new Error(`Compiler operation attempt '${attempt.operationKey}' is not the pending family attempt.`);
    }
    this.assertMechanismCompletion(
      attempt.executionMechanism,
      completion,
      attempt.operationKey,
    );

    // No current-occurrence lookup belongs here: successful structural execution may intentionally have moved or
    // consumed the target. The pending attempt already proved its exact context immediately before that work began.
    const operation = new TemplateCompilerOperation(
      this.familyAuthority,
      attempt.operationKey,
      attempt.executionOrdinal,
      attempt.context,
      attempt.operationKind,
      attempt.executionMechanism,
      attempt.target,
      completion,
      attempt.causeHandles,
      attempt.producedProductHandles,
      attempt.sourceAddressHandle,
    );
    this.operations.push(operation);
    this.operationsByKey.set(operation.operationKey, operation);
    this.operationsByLane.get(operation.lane)!.push(operation);
    this.operationsByContext.get(operation.context)!.push(operation);
    for (const productHandle of operation.producedProductHandles) {
      this.producedProducts.set(productHandle, operation);
    }
    if (isTerminalCompilerCompletion(operation.completion.completionKind)) {
      this.terminalOperationsByLane.set(operation.lane, operation);
    }
    this.pendingAttempt = null;
    return operation;
  }

  private assertProducedProductsAvailable(
    operationKey: string,
    producedProductHandles: readonly ProductHandle[],
  ): void {
    const localProducts = new Set<ProductHandle>();
    for (const productHandle of producedProductHandles) {
      if (localProducts.has(productHandle)) {
        throw new Error(`Compiler operation '${operationKey}' repeats produced product '${productHandle}'.`);
      }
      const prior = this.producedProducts.get(productHandle);
      if (prior != null) {
        throw new Error(
          `Compiler product '${productHandle}' is produced by both '${prior.operationKey}' and '${operationKey}'.`,
        );
      }
      localProducts.add(productHandle);
    }
  }

  seal(): TemplateCompilerExecutionSequence {
    if (this.sealed) return this.sequence;
    this.requireNoPendingAttempt('seal the execution family');
    this.assertCoherent();
    this.sealed = true;
    return this.sequence;
  }

  assertCoherent(): void {
    this.requireNoPendingAttempt('assert family coherence');
    if (this.lanes.length === 0) {
      throw new Error(`Compiler execution family '${this.familyKey}' has no root invocation lane.`);
    }
    const structuralExecution = this.structuralFamily;
    const structuralTargetPlans = structuralExecution?.readTargetPlans() ?? [];
    const plannedLanes = this.lanes.filter((lane) => lane.targetPlan != null);
    if (
      structuralTargetPlans.length !== plannedLanes.length
      || structuralTargetPlans.some((targetPlan) => !this.lanesByTargetPlan.has(targetPlan))
      || this.lanesByLocalKey.size !== this.lanes.length
      || this.invocationPhases.size !== this.lanes.length
      || (structuralExecution == null && plannedLanes.length > 0)
    ) {
      throw new Error(`Compiler execution family '${this.familyKey}' has incomplete structural-plan coverage.`);
    }
    const visitedBootstrapContexts = new Set<TemplateCompilerBootstrapContextReference>();
    const visitedContexts = new Set<TemplateCompilerExecutionContextReference>();
    for (const [laneOrdinal, lane] of this.lanes.entries()) {
      const targetPlan = lane.targetPlan;
      const bootstrapContext = this.bootstrapContextsByLane.get(lane) ?? null;
      if (targetPlan == null && !this.terminalOperationsByLane.has(lane)) {
        throw new Error(
          `Compiler execution lane '${lane.localKey}' has no target plan or terminal bootstrap outcome.`,
        );
      }
      if (
        !lane.isOwnedBy(this.familyAuthority)
        || lane.ordinal !== laneOrdinal
        || this.lanesByLocalKey.get(lane.localKey) !== lane
        || !this.invocationPhases.has(lane)
        || bootstrapContext == null
        || !bootstrapContext.isOwnedBy(this.familyAuthority)
        || bootstrapContext.lane !== lane
        || bootstrapContext.ordinal !== laneOrdinal
        || this.bootstrapContexts[laneOrdinal] !== bootstrapContext
        || (targetPlan != null && this.lanesByTargetPlan.get(targetPlan) !== lane)
      ) {
        throw new Error(`Compiler execution lane '${lane.localKey}' has incoherent family ownership.`);
      }
      visitedBootstrapContexts.add(bootstrapContext);
      const laneContexts = this.contextsByLane.get(lane);
      if (
        laneContexts == null
        || (targetPlan != null && laneContexts.length === 0)
        || (targetPlan == null && laneContexts.length > 0)
      ) {
        throw new Error(`Compiler execution lane '${lane.localKey}' has no target contexts.`);
      }
      for (const [laneContextOrdinal, context] of laneContexts.entries()) {
        if (
          targetPlan == null
          || structuralExecution == null
          || visitedContexts.has(context)
          || !context.isOwnedBy(this.familyAuthority)
          || context.lane !== lane
          || context.laneOrdinal !== laneContextOrdinal
          || this.contextsByTargetContext.get(context.targetContext) !== context
          || this.contextsByLocalKey.get(context.localKey) !== context
          || targetPlan.contextForLocalKey(context.localKey) !== context.targetContext
          || structuralExecution.contextForLocalKey(context.localKey) !== context.targetContext
        ) {
          throw new Error(`Compiler execution context '${context.localKey}' has incoherent structural ownership.`);
        }
        visitedContexts.add(context);
      }
    }
    const structuralContexts = structuralExecution?.readContexts() ?? [];
    if (
      visitedBootstrapContexts.size !== this.bootstrapContexts.length
      || visitedContexts.size !== this.contexts.length
      || structuralContexts.length !== this.contexts.length
      || structuralContexts.some((context) => !this.contextsByTargetContext.has(context))
      || this.contexts.some((context, ordinal) => context.ordinal !== ordinal || !visitedContexts.has(context))
    ) {
      throw new Error(`Compiler execution family '${this.familyKey}' has incomplete structural-context coverage.`);
    }

    const operationKeys = new Set<string>();
    const producedProducts = new Map<ProductHandle, TemplateCompilerOperation>();
    const terminalOperations = new Map<TemplateCompilerExecutionLaneReference, TemplateCompilerOperation>();
    const expectedLaneOperations = new Map(
      this.lanes.map((lane) => [lane, [] as TemplateCompilerOperation[]]),
    );
    const expectedContextOperations = new Map(
      [...this.bootstrapContexts, ...this.contexts]
        .map((context) => [context, [] as TemplateCompilerOperation[]] as const),
    );
    const admittedOperationContexts = new Set<TemplateCompilerOperationContextReference>([
      ...this.bootstrapContexts,
      ...this.contexts,
    ]);
    for (const [executionOrdinal, operation] of this.operations.entries()) {
      if (
        !operation.isOwnedBy(this.familyAuthority)
        || operation.executionOrdinal !== executionOrdinal
        || operationKeys.has(operation.operationKey)
        || this.operationsByKey.get(operation.operationKey) !== operation
        || !admittedOperationContexts.has(operation.context)
      ) {
        throw new Error(`Compiler operation '${operation.operationKey}' has incoherent family order or ownership.`);
      }
      if (terminalOperations.has(operation.lane)) {
        throw new Error(`Compiler execution lane '${operation.lane.localKey}' continues after terminal completion.`);
      }
      if (operation.causeHandles.length === 0) {
        throw new Error(`Compiler operation '${operation.operationKey}' has no semantic cause.`);
      }
      this.assertMechanismCompletion(
        operation.executionMechanism,
        operation.completion,
        operation.operationKey,
      );
      this.requireRecordedTarget(operation.context, operation.operationKind, operation.target);
      operationKeys.add(operation.operationKey);
      expectedLaneOperations.get(operation.lane)!.push(operation);
      expectedContextOperations.get(operation.context)!.push(operation);
      for (const productHandle of operation.producedProductHandles) {
        const prior = producedProducts.get(productHandle);
        if (prior != null) {
          throw new Error(
            `Compiler product '${productHandle}' is produced by both '${prior.operationKey}' and '${operation.operationKey}'.`,
          );
        }
        producedProducts.set(productHandle, operation);
      }
      if (isTerminalCompilerCompletion(operation.completion.completionKind)) {
        terminalOperations.set(operation.lane, operation);
      }
    }
    if (
      operationKeys.size !== this.operationsByKey.size
      || producedProducts.size !== this.producedProducts.size
      || [...producedProducts].some(([handle, operation]) => this.producedProducts.get(handle) !== operation)
      || terminalOperations.size !== this.terminalOperationsByLane.size
      || [...terminalOperations].some(([lane, operation]) => this.terminalOperationsByLane.get(lane) !== operation)
      || [...expectedLaneOperations].some(([lane, operations]) =>
        !sameOccurrences(this.operationsByLane.get(lane) ?? [], operations)
      )
      || [...expectedContextOperations].some(([context, operations]) =>
        !sameOccurrences(this.operationsByContext.get(context) ?? [], operations)
      )
    ) {
      throw new Error(`Compiler execution family '${this.familyKey}' has incoherent operation indexes.`);
    }
  }

  private requireMutable(): void {
    if (this.sealed) {
      throw new Error(`Compiler execution family '${this.familyKey}' is sealed.`);
    }
  }

  private requireNoPendingAttempt(action: string): void {
    if (this.pendingAttempt != null) {
      throw new Error(
        `Cannot ${action} while compiler operation '${this.pendingAttempt.operationKey}' is pending.`,
      );
    }
  }

  private requireLane(lane: TemplateCompilerExecutionLaneReference): void {
    const targetPlan = lane.targetPlan;
    if (
      !lane.isOwnedBy(this.familyAuthority)
      || this.lanesByLocalKey.get(lane.localKey) !== lane
      || (targetPlan != null && this.lanesByTargetPlan.get(targetPlan) !== lane)
    ) {
      throw new Error(`Compiler execution lane '${lane.localKey}' belongs to another family.`);
    }
  }

  private requireOpenLane(lane: TemplateCompilerExecutionLaneReference): void {
    const terminal = this.terminalOperationsByLane.get(lane);
    if (terminal != null) {
      throw new Error(
        `Compiler execution lane '${lane.localKey}' ended with '${terminal.completion.completionKind}' at '${terminal.operationKey}'.`,
      );
    }
  }

  private requireContext(context: TemplateCompilerOperationContextReference): void {
    this.requireLane(context.lane);
    if (context instanceof TemplateCompilerBootstrapContextReference) {
      if (
        !context.isOwnedBy(this.familyAuthority)
        || this.bootstrapContextsByLane.get(context.lane) !== context
        || this.bootstrapContexts[context.ordinal] !== context
      ) {
        throw new Error(`Compiler bootstrap context '${context.localKey}' belongs to another family.`);
      }
      return;
    }
    if (
      !context.isOwnedBy(this.familyAuthority)
      || this.contextsByTargetContext.get(context.targetContext) !== context
      || this.contextsByLocalKey.get(context.localKey) !== context
    ) {
      throw new Error(`Compiler execution context '${context.localKey}' belongs to another family.`);
    }
  }

  private requireOccurrenceContext(
    context: TemplateCompilerOperationContextReference,
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): void {
    if (context instanceof TemplateCompilerBootstrapContextReference) {
      const node = this.forest.nodeForOccurrenceKey(occurrence.occurrenceKey);
      const attribute = node == null
        ? this.forest.attributeForOccurrenceKey(occurrence.occurrenceKey)
        : null;
      if (
        (node !== occurrence && attribute !== occurrence)
        || !this.occurrenceBelongsToBootstrapContext(context, occurrence)
      ) {
        throw new Error(
          `Compiler occurrence '${occurrence.occurrenceKey}' does not belong to bootstrap context '${context.localKey}'.`,
        );
      }
      return;
    }
    const structuralContext = this.requireStructuralExecution().contextForOccurrence(occurrence);
    if (structuralContext !== context.targetContext) {
      throw new Error(
        `Compiler occurrence '${occurrence.occurrenceKey}' does not belong to structural context '${context.localKey}'.`,
      );
    }
  }

  private requireCurrentTarget(
    context: TemplateCompilerOperationContextReference,
    operationKind: TemplateCompilerOperationKind,
    target: TemplateCompilerOperationTarget,
  ): void {
    this.requireRecordedTarget(context, operationKind, target);
    if (target instanceof TemplateCompilerOccurrenceOperationTarget) {
      this.requireOccurrenceContext(context, target.occurrence);
    } else if (target instanceof TemplateCompilerCallableEffectOperationTarget) {
      this.requireOccurrenceContext(context, target.actedOn.occurrence);
    }
  }

  private requireRecordedTarget(
    context: TemplateCompilerOperationContextReference,
    operationKind: TemplateCompilerOperationKind,
    target: TemplateCompilerOperationTarget,
  ): void {
    const isBootstrap = context instanceof TemplateCompilerBootstrapContextReference;
    const requiresBootstrap = operationKind === TemplateCompilerOperationKind.CompilerHook
      || operationKind === TemplateCompilerOperationKind.LocalTemplateExtraction;
    if (requiresBootstrap !== isBootstrap) {
      throw new Error(
        `Compiler operation '${operationKind}' ${requiresBootstrap ? 'requires' : 'cannot use'} a bootstrap context.`,
      );
    }
    const isCompilerHook = target instanceof TemplateCompilerHookOperationTarget;
    if ((operationKind === TemplateCompilerOperationKind.CompilerHook) !== isCompilerHook) {
      throw new Error(
        `Compiler operation '${operationKind}' ${operationKind === TemplateCompilerOperationKind.CompilerHook ? 'requires' : 'cannot use'} a hook-set target.`,
      );
    }
    const isCallableEffect = target instanceof TemplateCompilerCallableEffectOperationTarget;
    const requiresCallableEffect = operationKind === TemplateCompilerOperationKind.ProcessContent;
    if (requiresCallableEffect !== isCallableEffect) {
      throw new Error(
        `Compiler operation '${operationKind}' ${requiresCallableEffect ? 'requires' : 'cannot use'} a callable-effect target.`,
      );
    }
    if (target instanceof TemplateCompilerOccurrenceOperationTarget) {
      if (!target.isOwnedBy(this.familyAuthority) || target.context !== context) {
        throw new Error('Compiler occurrence operation target belongs to another compiler family context.');
      }
      return;
    }
    if (target instanceof TemplateCompilerCallableEffectOperationTarget) {
      if (
        !target.isOwnedBy(this.familyAuthority)
        || !target.actedOn.isOwnedBy(this.familyAuthority)
        || target.actedOn.context !== context
      ) {
        throw new Error('Compiler callable-effect target belongs to another compiler family context.');
      }
      return;
    }
    if (target instanceof TemplateCompilerHookOperationTarget) {
      if (
        !target.isOwnedBy(this.familyAuthority)
        || !target.actedOn.isOwnedBy(this.familyAuthority)
        || target.actedOn.context !== context
        || target.actedOn.occurrence !== context.lane.compilerCarrier
      ) {
        throw new Error('Compiler hook-set target belongs to another compiler invocation carrier.');
      }
      return;
    }
    if (
      !(target instanceof TemplateCompilerResourceOperationTarget)
      && !(target instanceof TemplateCompilerInstructionOperationTarget)
    ) {
      throw new Error('Compiler operation target is not an exact supported target.');
    }
  }

  private assertMechanismCompletion(
    executionMechanism: TemplateCompilerOperationExecutionMechanism,
    completion: TemplateCompilerOperationCompletion,
    operationKey: string,
  ): void {
    if (!(completion instanceof TemplateCompilerOperationCompletion)) {
      throw new Error(`Compiler operation '${operationKey}' has no typed completion.`);
    }
    const wasAttempted = executionMechanism !== TemplateCompilerOperationExecutionMechanism.NotAttempted;
    const requiresAttempt = completion.completionKind === TemplateCompilerOperationCompletionKind.Complete
      || completion.completionKind === TemplateCompilerOperationCompletionKind.Declined
      || completion.completionKind === TemplateCompilerOperationCompletionKind.Abrupt;
    const forbidsAttempt = completion.completionKind === TemplateCompilerOperationCompletionKind.Refused;
    if ((requiresAttempt && !wasAttempted) || (forbidsAttempt && wasAttempted)) {
      throw new Error(
        `Compiler operation '${operationKey}' has incoherent execution mechanism '${executionMechanism}' and completion '${completion.completionKind}'.`,
      );
    }
  }

  private requireStructuralExecution(): TemplateCompilerStructuralExecutionSession {
    if (this.structuralFamily == null) {
      throw new Error(`Compiler execution family '${this.familyKey}' has no attached structural execution session.`);
    }
    return this.structuralFamily;
  }

  private advanceInvocationPhase(
    context: TemplateCompilerOperationContextReference,
    operationKind: TemplateCompilerOperationKind,
  ): void {
    const current = this.invocationPhases.get(context.lane)!;
    if (context instanceof TemplateCompilerBootstrapContextReference) {
      if (operationKind === TemplateCompilerOperationKind.CompilerHook) {
        if (current !== TemplateCompilerInvocationPhase.CompilerHooks) {
          throw new Error(
            `Compiler hook cannot run after lane '${context.lane.localKey}' entered '${current}'.`,
          );
        }
        return;
      }
      if (current === TemplateCompilerInvocationPhase.TargetExecution) {
        throw new Error(
          `Local-template extraction cannot run after lane '${context.lane.localKey}' entered target execution.`,
        );
      }
      this.invocationPhases.set(context.lane, TemplateCompilerInvocationPhase.LocalTemplateExtraction);
      return;
    }
    this.invocationPhases.set(context.lane, TemplateCompilerInvocationPhase.TargetExecution);
  }

  private occurrenceBelongsToBootstrapContext(
    context: TemplateCompilerBootstrapContextReference,
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): boolean {
    let node: TemplateCompilerNodeOccurrence | null = this.forest.nodeForOccurrenceKey(occurrence.occurrenceKey);
    if (node !== occurrence) {
      const attribute = this.forest.attributeForOccurrenceKey(occurrence.occurrenceKey);
      if (attribute !== occurrence || attribute.owner == null) return false;
      node = attribute.owner;
    }
    while (node != null) {
      if (node === context.compilerCarrier) return true;
      node = node.parent;
    }
    return false;
  }
}

function isTerminalCompilerCompletion(completionKind: TemplateCompilerOperationCompletionKind): boolean {
  return completionKind === TemplateCompilerOperationCompletionKind.Open
    || completionKind === TemplateCompilerOperationCompletionKind.Refused
    || completionKind === TemplateCompilerOperationCompletionKind.Abrupt;
}

function sameOccurrences<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
