import {
  EvaluationUndefined,
  type EvaluationValue,
} from './values.js';

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

  constructor(
    /** Returned evaluator-local value. */
    readonly value: EvaluationValue = EvaluationUndefined,
  ) {}
}

/** Throw completion from a throw statement or unsupported effect. */
export class ThrowEvaluationCompletion {
  readonly kind = EvaluationCompletionKind.Throw;

  constructor(
    /** Thrown evaluator-local value. */
    readonly value: EvaluationValue = EvaluationUndefined,
  ) {}
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
