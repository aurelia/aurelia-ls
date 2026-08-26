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
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';
import type { TemplateCompilerStructuralExecutionSession } from './template-compiler-structural-execution.js';

const compilerExecutionStructuralFamilies = new WeakSet<TemplateCompilerStructuralExecutionSession>();

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
}

/** Exact run-local node or attribute occurrence acted upon by a compiler operation. */
export class TemplateCompilerOccurrenceOperationTarget {
  readonly targetKind = TemplateCompilerOperationTargetKind.Occurrence;
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly context: TemplateCompilerExecutionContextReference,
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

/** Hook or `processContent` target retaining both the callable and exact acted-on structure. */
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

export type TemplateCompilerOperationTarget =
  | TemplateCompilerOccurrenceOperationTarget
  | TemplateCompilerResourceOperationTarget
  | TemplateCompilerInstructionOperationTarget
  | TemplateCompilerCallableEffectOperationTarget;

/** Family-owned exact execution lane corresponding to one admitted root target plan. */
export class TemplateCompilerExecutionLaneReference {
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly targetPlan: TemplateCompilerTargetPlan,
    readonly ordinal: number,
  ) {
    this.#familyAuthority = familyAuthority;
  }

  get localKey(): string {
    return this.targetPlan.localKey;
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

/** Event-time authority retained while one semantic compiler boundary performs its mechanical work. */
export class TemplateCompilerPendingOperationAttempt {
  readonly #familyAuthority: object;

  constructor(
    familyAuthority: object,
    readonly operationKey: string,
    readonly executionOrdinal: number,
    readonly context: TemplateCompilerExecutionContextReference,
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
    readonly context: TemplateCompilerExecutionContextReference,
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
  readonly context: TemplateCompilerExecutionContextReference;
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
    private readonly contexts: TemplateCompilerExecutionContextReference[],
    private readonly operations: TemplateCompilerOperation[],
    private readonly operationsByLane: Map<TemplateCompilerExecutionLaneReference, TemplateCompilerOperation[]>,
    private readonly operationsByContext: Map<TemplateCompilerExecutionContextReference, TemplateCompilerOperation[]>,
  ) {}

  readLanes(): readonly TemplateCompilerExecutionLaneReference[] {
    return this.lanes;
  }

  readContexts(): readonly TemplateCompilerExecutionContextReference[] {
    return this.contexts;
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

  readContextOperations(context: TemplateCompilerExecutionContextReference): readonly TemplateCompilerOperation[] {
    if (!context.isOwnedBy(this.familyAuthority) || !this.operationsByContext.has(context)) {
      throw new Error(`Compiler execution context '${context.localKey}' belongs to another family sequence.`);
    }
    return this.operationsByContext.get(context)!;
  }
}

/**
 * Product-free ordered-effect owner bound to one exact structural compiler family.
 *
 * Target-plan lanes may interleave in one global order, but open, refused, and abrupt boundaries terminate only the
 * affected exact lane. Mechanical DOM edits remain in the structural session and durable publication remains later.
 */
export class TemplateCompilerExecutionSession {
  static create(
    familyKey: string,
    structuralExecution: TemplateCompilerStructuralExecutionSession,
  ): TemplateCompilerExecutionSession {
    if (compilerExecutionStructuralFamilies.has(structuralExecution)) {
      throw new Error('Compiler structural execution family already owns an ordered execution session.');
    }
    const session = new TemplateCompilerExecutionSession(familyKey, structuralExecution);
    compilerExecutionStructuralFamilies.add(structuralExecution);
    return session;
  }

  readonly sequence: TemplateCompilerExecutionSequence;
  private readonly familyAuthority = {};
  private readonly lanes: TemplateCompilerExecutionLaneReference[] = [];
  private readonly lanesByTargetPlan = new Map<TemplateCompilerTargetPlan, TemplateCompilerExecutionLaneReference>();
  private readonly lanesByLocalKey = new Map<string, TemplateCompilerExecutionLaneReference>();
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
    TemplateCompilerExecutionContextReference,
    TemplateCompilerOperation[]
  >();
  private readonly producedProducts = new Map<ProductHandle, TemplateCompilerOperation>();
  private readonly terminalOperationsByLane = new Map<
    TemplateCompilerExecutionLaneReference,
    TemplateCompilerOperation
  >();
  private pendingAttempt: TemplateCompilerPendingOperationAttempt | null = null;
  private sealed = false;

  private constructor(
    readonly familyKey: string,
    readonly structuralExecution: TemplateCompilerStructuralExecutionSession,
  ) {
    if (familyKey.length === 0) {
      throw new Error('Compiler execution family requires a non-empty key.');
    }
    this.sequence = new TemplateCompilerExecutionSequence(
      this.familyAuthority,
      familyKey,
      this.lanes,
      this.contexts,
      this.operations,
      this.operationsByLane,
      this.operationsByContext,
    );
  }

  get isSealed(): boolean {
    return this.sealed;
  }

  readPendingAttempt(): TemplateCompilerPendingOperationAttempt | null {
    return this.pendingAttempt;
  }

  admitTargetPlan(targetPlan: TemplateCompilerTargetPlan): TemplateCompilerExecutionLaneReference {
    this.requireMutable();
    this.requireNoPendingAttempt('admit a target plan');
    if (!this.structuralExecution.readTargetPlans().includes(targetPlan)) {
      throw new Error(`Compiler target plan '${targetPlan.localKey}' belongs to another structural family.`);
    }
    const existing = this.lanesByTargetPlan.get(targetPlan);
    if (existing != null) return existing;
    if (this.lanesByLocalKey.has(targetPlan.localKey)) {
      throw new Error(`Compiler execution lane key '${targetPlan.localKey}' collides with another target plan.`);
    }
    const lane = new TemplateCompilerExecutionLaneReference(
      this.familyAuthority,
      targetPlan,
      this.lanes.length,
    );
    this.lanes.push(lane);
    this.lanesByTargetPlan.set(targetPlan, lane);
    this.lanesByLocalKey.set(targetPlan.localKey, lane);
    this.contextsByLane.set(lane, []);
    this.operationsByLane.set(lane, []);
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
    if (
      lane.targetPlan.contextForLocalKey(targetContext.localKey) !== targetContext
      || this.structuralExecution.contextForLocalKey(targetContext.localKey) !== targetContext
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

  occurrenceTarget(
    context: TemplateCompilerExecutionContextReference,
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
    context: TemplateCompilerExecutionContextReference,
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
    const structuralTargetPlans = this.structuralExecution.readTargetPlans();
    if (
      structuralTargetPlans.length !== this.lanes.length
      || structuralTargetPlans.some((targetPlan) => !this.lanesByTargetPlan.has(targetPlan))
      || this.lanesByLocalKey.size !== this.lanes.length
    ) {
      throw new Error(`Compiler execution family '${this.familyKey}' has incomplete structural-plan coverage.`);
    }
    const visitedContexts = new Set<TemplateCompilerExecutionContextReference>();
    for (const [laneOrdinal, lane] of this.lanes.entries()) {
      if (
        !lane.isOwnedBy(this.familyAuthority)
        || lane.ordinal !== laneOrdinal
        || this.lanesByTargetPlan.get(lane.targetPlan) !== lane
        || this.lanesByLocalKey.get(lane.localKey) !== lane
      ) {
        throw new Error(`Compiler execution lane '${lane.localKey}' has incoherent family ownership.`);
      }
      const laneContexts = this.contextsByLane.get(lane);
      if (laneContexts == null || laneContexts.length === 0) {
        throw new Error(`Compiler execution lane '${lane.localKey}' has no target contexts.`);
      }
      for (const [laneContextOrdinal, context] of laneContexts.entries()) {
        if (
          visitedContexts.has(context)
          || !context.isOwnedBy(this.familyAuthority)
          || context.lane !== lane
          || context.laneOrdinal !== laneContextOrdinal
          || this.contextsByTargetContext.get(context.targetContext) !== context
          || this.contextsByLocalKey.get(context.localKey) !== context
          || lane.targetPlan.contextForLocalKey(context.localKey) !== context.targetContext
          || this.structuralExecution.contextForLocalKey(context.localKey) !== context.targetContext
        ) {
          throw new Error(`Compiler execution context '${context.localKey}' has incoherent structural ownership.`);
        }
        visitedContexts.add(context);
      }
    }
    const structuralContexts = this.structuralExecution.readContexts();
    if (
      visitedContexts.size !== this.contexts.length
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
      this.contexts.map((context) => [context, [] as TemplateCompilerOperation[]]),
    );
    for (const [executionOrdinal, operation] of this.operations.entries()) {
      if (
        !operation.isOwnedBy(this.familyAuthority)
        || operation.executionOrdinal !== executionOrdinal
        || operationKeys.has(operation.operationKey)
        || this.operationsByKey.get(operation.operationKey) !== operation
        || !visitedContexts.has(operation.context)
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
    if (
      !lane.isOwnedBy(this.familyAuthority)
      || this.lanesByTargetPlan.get(lane.targetPlan) !== lane
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

  private requireContext(context: TemplateCompilerExecutionContextReference): void {
    this.requireLane(context.lane);
    if (
      !context.isOwnedBy(this.familyAuthority)
      || this.contextsByTargetContext.get(context.targetContext) !== context
      || this.contextsByLocalKey.get(context.localKey) !== context
    ) {
      throw new Error(`Compiler execution context '${context.localKey}' belongs to another family.`);
    }
  }

  private requireOccurrenceContext(
    context: TemplateCompilerExecutionContextReference,
    occurrence: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
  ): void {
    const structuralContext = this.structuralExecution.contextForOccurrence(occurrence);
    if (structuralContext !== context.targetContext) {
      throw new Error(
        `Compiler occurrence '${occurrence.occurrenceKey}' does not belong to structural context '${context.localKey}'.`,
      );
    }
  }

  private requireCurrentTarget(
    context: TemplateCompilerExecutionContextReference,
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
    context: TemplateCompilerExecutionContextReference,
    operationKind: TemplateCompilerOperationKind,
    target: TemplateCompilerOperationTarget,
  ): void {
    const isCallableEffect = target instanceof TemplateCompilerCallableEffectOperationTarget;
    const requiresCallableEffect = operationKind === TemplateCompilerOperationKind.CompilerHook
      || operationKind === TemplateCompilerOperationKind.ProcessContent;
    if (requiresCallableEffect !== isCallableEffect) {
      throw new Error(
        `Compiler operation '${operationKind}' ${requiresCallableEffect ? 'requires' : 'cannot use'} a callable-effect target.`,
      );
    }
    if (target instanceof TemplateCompilerOccurrenceOperationTarget) {
      if (!target.isOwnedBy(this.familyAuthority) || target.context !== context) {
        throw new Error('Compiler occurrence operation target belongs to another structural family context.');
      }
      return;
    }
    if (target instanceof TemplateCompilerCallableEffectOperationTarget) {
      if (
        !target.isOwnedBy(this.familyAuthority)
        || !target.actedOn.isOwnedBy(this.familyAuthority)
        || target.actedOn.context !== context
      ) {
        throw new Error('Compiler callable-effect target belongs to another structural family context.');
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
}

function isTerminalCompilerCompletion(completionKind: TemplateCompilerOperationCompletionKind): boolean {
  return completionKind === TemplateCompilerOperationCompletionKind.Open
    || completionKind === TemplateCompilerOperationCompletionKind.Refused
    || completionKind === TemplateCompilerOperationCompletionKind.Abrupt;
}

function sameOccurrences<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
