import {
  EvaluationUndefined,
  type EvaluationValue,
} from "./value.js";

/** Evaluator-local statement completion category. */
export const enum EvaluationCompletionKind {
  /** Statement completed normally. */
  Normal = "normal",
  /** Function body returned a value. */
  Return = "return",
  /** Statement threw a value. */
  Throw = "throw",
  /** Evaluation reached a break statement. */
  Break = "break",
  /** Evaluation reached a continue statement. */
  Continue = "continue",
  /** Evaluation refused to guess this control-flow path. */
  Open = "open",
}

/** Normal completion with an optional value. */
export class NormalEvaluationCompletion {
  /** Completion category discriminator. */
  readonly kind = EvaluationCompletionKind.Normal;

  constructor(
    /** Value produced by the completed statement, when one exists. */
    readonly value: EvaluationValue = EvaluationUndefined,
  ) {}
}

/** Return completion from a supported function body. */
export class ReturnEvaluationCompletion {
  /** Completion category discriminator. */
  readonly kind = EvaluationCompletionKind.Return;

  constructor(
    /** Returned evaluator-local value. */
    readonly value: EvaluationValue = EvaluationUndefined,
  ) {}
}

/** Throw completion from a throw statement or unsupported effect. */
export class ThrowEvaluationCompletion {
  /** Completion category discriminator. */
  readonly kind = EvaluationCompletionKind.Throw;

  constructor(
    /** Thrown evaluator-local value. */
    readonly value: EvaluationValue = EvaluationUndefined,
  ) {}
}

/** Break completion with an optional label. */
export class BreakEvaluationCompletion {
  /** Completion category discriminator. */
  readonly kind = EvaluationCompletionKind.Break;

  constructor(
    /** Break label, when one was supplied. */
    readonly label: string | null = null,
  ) {}
}

/** Continue completion with an optional label. */
export class ContinueEvaluationCompletion {
  /** Completion category discriminator. */
  readonly kind = EvaluationCompletionKind.Continue;

  constructor(
    /** Continue label, when one was supplied. */
    readonly label: string | null = null,
  ) {}
}

/** Open completion when the evaluator refuses to guess control flow. */
export class OpenEvaluationCompletion {
  /** Completion category discriminator. */
  readonly kind = EvaluationCompletionKind.Open;

  constructor(
    /** Short explanation of the open completion. */
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
