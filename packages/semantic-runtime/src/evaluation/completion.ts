import {
  EvaluationUndefined,
  type EvaluationValue,
} from './values.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';

export const enum EvaluationCompletionKind {
  /** Statement or expression completed normally. */
  Normal = 'normal',
  /** Function body returned a value. */
  Return = 'return',
  /** Evaluation encountered a throw completion. */
  Throw = 'throw',
  /** Evaluation encountered a break completion. */
  Break = 'break',
  /** Evaluation encountered a continue completion. */
  Continue = 'continue',
  /** Evaluation could not safely continue on this path. */
  Open = 'open',
}

/** Normal completion with an optional value. */
export class NormalEvaluationCompletion {
  readonly kind = EvaluationCompletionKind.Normal;

  constructor(
    /** Value produced by the completed statement or expression. */
    readonly value: EvaluationValue = EvaluationUndefined,
  ) {}
}

/** Return completion from a function body. */
export class ReturnEvaluationCompletion {
  readonly kind = EvaluationCompletionKind.Return;
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    /** Returned evaluator-local value. */
    readonly value: EvaluationValue = EvaluationUndefined,
    /** Exact pressure qualifying the returned value across the call-frame edge. */
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

/** Throw completion from a throw statement or unsupported effect. */
export class ThrowEvaluationCompletion {
  readonly kind = EvaluationCompletionKind.Throw;
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    /** Thrown evaluator-local value. */
    readonly value: EvaluationValue = EvaluationUndefined,
    /** Exact pressure qualifying the thrown value across throw/catch and module edges. */
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

/** Break completion with an optional label. */
export class BreakEvaluationCompletion {
  readonly kind = EvaluationCompletionKind.Break;

  constructor(
    /** Break label, when one was supplied. */
    readonly label: string | null = null,
  ) {}
}

/** Continue completion with an optional label. */
export class ContinueEvaluationCompletion {
  readonly kind = EvaluationCompletionKind.Continue;

  constructor(
    /** Continue label, when one was supplied. */
    readonly label: string | null = null,
  ) {}
}

/** Open completion when this evaluator refuses to guess control flow. */
export class OpenEvaluationCompletion {
  readonly kind = EvaluationCompletionKind.Open;

  constructor(
    /** Short explanation for the open completion. */
    readonly summary: string,
  ) {}
}

/** Evaluator-local completion union. */
export type EvaluationCompletion =
  | NormalEvaluationCompletion
  | ReturnEvaluationCompletion
  | ThrowEvaluationCompletion
  | BreakEvaluationCompletion
  | ContinueEvaluationCompletion
  | OpenEvaluationCompletion;

/** Completion that cannot be represented as an expression value. */
export type EvaluationAbruptCompletion = Exclude<EvaluationCompletion, NormalEvaluationCompletion>;

/** Abrupt completion that can cross an expression-shaped evaluator boundary. */
export type EvaluationExpressionAbruptCompletion = ThrowEvaluationCompletion;

/** Completion admitted by a value-returning expression boundary. */
export type EvaluationExpressionCompletion =
  | NormalEvaluationCompletion
  | EvaluationExpressionAbruptCompletion;

/** Internal bridge that carries a thrown value through value-returning expression evaluators. */
export class EvaluationAbruptCompletionSignal extends Error {
  constructor(
    readonly completion: EvaluationExpressionAbruptCompletion,
  ) {
    super(`Static evaluation produced an abrupt ${completion.kind} completion.`);
  }
}

/** Stable human explanation for consumers whose own result vocabulary cannot expose ECMAScript completion directly. */
export function evaluationAbruptCompletionSummary(
  completion: EvaluationAbruptCompletion,
): string {
  switch (completion.kind) {
    case EvaluationCompletionKind.Return:
      return 'Static evaluation reached a return completion outside a function result.';
    case EvaluationCompletionKind.Throw:
      return 'Static evaluation reached a thrown value.';
    case EvaluationCompletionKind.Break:
      return 'Static evaluation reached a break completion outside its target.';
    case EvaluationCompletionKind.Continue:
      return 'Static evaluation reached a continue completion outside its target.';
    case EvaluationCompletionKind.Open:
      return completion.summary;
  }
}
