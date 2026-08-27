import type ts from 'typescript';

import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
  type StaticExpressionEvaluationResult,
} from './evaluator.js';
import { StaticEvaluationSessionFork } from './evaluation-session.js';
import {
  StaticEvaluationBranchMode,
  StaticEvaluationPolicy,
} from './policy.js';
import type { EvaluationOpenSeam } from './seams.js';
import type {
  EvaluationFunctionValue,
  EvaluationValue,
} from './values.js';
import {
  EvaluationValueKind,
  readEvaluationTruthiness,
} from './values.js';

/** Stable semantic slot whose executable function is supplied by the current app-analysis candidate. */
export class StaticCallableSlot {
  constructor(readonly key: string) {}
}

/** One closure-bearing function plus the evaluator state needed by a candidate-owned execution authority. */
export class StaticCallableTarget {
  constructor(
    readonly value: EvaluationFunctionValue,
    readonly policy: StaticEvaluationPolicy,
    readonly runtimeHost: StaticEvaluationRuntimeHost,
    /** Pressure retained while resolving the callable itself. */
    readonly openSeams: readonly EvaluationOpenSeam[] = [],
    /** Exact receiver supplied as `this` when the retained function came from a member read. */
    readonly receiver: EvaluationValue | null = null,
  ) {}
}

/** One candidate-local binding from stable semantic slot to exact evaluator authority. */
export class StaticCallableExecutionBinding {
  constructor(
    readonly slot: StaticCallableSlot,
    readonly target: StaticCallableTarget,
  ) {}
}

/** Candidate-owned callable authority; durable products retain slots, never evaluator values. */
export class StaticCallableExecutionBindings {
  static readonly empty = new StaticCallableExecutionBindings([]);

  private readonly bindingEntries: readonly StaticCallableExecutionBinding[];
  private readonly targetsBySlot: ReadonlyMap<string, StaticCallableTarget>;

  constructor(
    bindingEntries: readonly StaticCallableExecutionBinding[],
    private readonly requireCurrent: (() => void) | null = null,
  ) {
    this.bindingEntries = Object.freeze([...bindingEntries]);
    const targets = new Map<string, StaticCallableTarget>();
    for (const binding of this.bindingEntries) {
      if (targets.has(binding.slot.key)) {
        throw new Error(`Static callable slot '${binding.slot.key}' was bound more than once.`);
      }
      targets.set(binding.slot.key, binding.target);
    }
    this.targetsBySlot = targets;
  }

  target(slot: StaticCallableSlot): StaticCallableTarget | null {
    this.requireCurrent?.();
    return this.targetsBySlot.get(slot.key) ?? null;
  }

  /** Read exact targets only while this candidate authority remains current. */
  readBindings(): readonly StaticCallableExecutionBinding[] {
    this.requireCurrent?.();
    return this.bindingEntries;
  }
}

/** Merge disjoint candidate-local callable bindings under one currentness authority. */
export function mergeStaticCallableExecutionBindings(
  bindings: readonly StaticCallableExecutionBindings[],
  requireCurrent: (() => void) | null = null,
): StaticCallableExecutionBindings {
  return new StaticCallableExecutionBindings(
    bindings.flatMap((binding) => binding.readBindings()),
    requireCurrent,
  );
}

export const enum StaticCallableTruthinessKind {
  /** The invocation closed to a truthy value without modeled mutation. */
  True = 'true',
  /** The invocation closed to a falsy value without modeled mutation. */
  False = 'false',
  /** Pressure, abrupt completion, mutation, or unknown truthiness prevents a safe decision. */
  Open = 'open',
}

/** Truthiness result for one isolated invocation of a retained callable. */
export class StaticCallableTruthinessResult {
  constructor(
    readonly kind: StaticCallableTruthinessKind,
    readonly evaluation: StaticExpressionEvaluationResult | null,
    readonly reason: string | null,
  ) {}

  get value(): boolean | null {
    return this.kind === StaticCallableTruthinessKind.True
      ? true
      : this.kind === StaticCallableTruthinessKind.False
        ? false
        : null;
  }
}

export type StaticCallableRuntimeHostDecorator = (
  baseHost: StaticEvaluationRuntimeHost,
) => StaticEvaluationRuntimeHost;

/** Execute one retained function while admitting effects only from a statically proven path. */
export function executeStaticFunctionEffects(
  fn: EvaluationFunctionValue,
  invocationNode: ts.Node,
  basePolicy: StaticEvaluationPolicy,
  runtimeHost: StaticEvaluationRuntimeHost,
  argumentValues: readonly EvaluationValue[],
  thisValue: EvaluationValue | null = null,
): StaticExpressionEvaluationResult {
  const evaluator = new StaticEvaluator(
    new StaticEvaluationPolicy(
      basePolicy.expressionStatementPolicies,
      basePolicy.guardrails,
      StaticEvaluationBranchMode.PathProvenEffects,
    ),
    runtimeHost,
  );
  return evaluator.evaluateFunctionValue(
    fn,
    invocationNode,
    fn.environment.moduleKey,
    argumentValues,
    thisValue,
  );
}

/**
 * Execute one retained policy predicate inside an isolated value graph.
 *
 * Consumers may close only over effect-free truthiness. The fork prevents speculative writes from escaping even when
 * the answer remains open, while `mutationCount` prevents stateful policy code from masquerading as a pure decision.
 */
export function evaluateStaticCallableTruthiness(
  target: StaticCallableTarget,
  argumentValues: readonly EvaluationValue[],
  decorateRuntimeHost: StaticCallableRuntimeHostDecorator | null = null,
): StaticCallableTruthinessResult {
  if (target.openSeams.length > 0) {
    return new StaticCallableTruthinessResult(
      StaticCallableTruthinessKind.Open,
      null,
      'Callable resolution retained open evaluation pressure.',
    );
  }
  const session = new StaticEvaluationSessionFork(target.runtimeHost);
  const sessionHost = session.forkRuntimeHost(target.runtimeHost);
  const runtimeHost = decorateRuntimeHost == null
    ? sessionHost
    : decorateRuntimeHost(sessionHost);
  const result = executeStaticFunctionEffects(
    session.forkValue(target.value),
    target.value.declaration,
    target.policy,
    runtimeHost,
    argumentValues.map((value) => session.forkValue(value)),
    target.receiver == null ? null : session.forkValue(target.receiver),
  );
  if (result.abruptCompletion != null) {
    return new StaticCallableTruthinessResult(
      StaticCallableTruthinessKind.Open,
      result,
      'Callable execution completed abruptly.',
    );
  }
  if (result.auditOpenSeams.length > 0) {
    return new StaticCallableTruthinessResult(
      StaticCallableTruthinessKind.Open,
      result,
      'Callable execution retained open evaluation pressure.',
    );
  }
  if (result.mutationCount > 0) {
    return new StaticCallableTruthinessResult(
      StaticCallableTruthinessKind.Open,
      result,
      'Callable execution reached modeled mutation.',
    );
  }
  const truthiness = result.value == null || result.value.kind === EvaluationValueKind.Unknown
    ? null
    : readEvaluationTruthiness(result.value);
  return new StaticCallableTruthinessResult(
    truthiness === true
      ? StaticCallableTruthinessKind.True
      : truthiness === false
        ? StaticCallableTruthinessKind.False
        : StaticCallableTruthinessKind.Open,
    result,
    truthiness == null ? 'Callable result truthiness remained open.' : null,
  );
}
