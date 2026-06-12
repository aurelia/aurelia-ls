import type ts from "typescript";

/** Evaluator-local open seam category. */
export const enum EvaluationOpenKind {
  /** Recursion or expression-depth guard stopped evaluation. */
  DepthLimit = "depth-limit",
  /** Statement guard stopped evaluation. */
  StatementLimit = "statement-limit",
  /** Statement syntax is not modeled by this evaluator. */
  UnsupportedStatement = "unsupported-statement",
  /** Expression syntax is not modeled by this evaluator. */
  UnsupportedExpression = "unsupported-expression",
  /** Binding pattern could not be represented in the local environment. */
  UnsupportedBindingPattern = "unsupported-binding-pattern",
  /** Identifier lookup missed the current environment. */
  UnresolvedIdentifier = "unresolved-identifier",
  /** Call expression could not be reduced within the evaluator's call model. */
  DynamicCall = "dynamic-call",
  /** Branch condition could not be reduced to known truthiness. */
  DynamicBranch = "dynamic-branch",
  /** Loop iteration is not represented by the evaluator's statement model. */
  DynamicLoop = "dynamic-loop",
  /** Mutation target or effect could not be represented in the local environment. */
  DynamicMutation = "dynamic-mutation",
}

/** Evaluator-local unresolved point; semantic projection happens above this layer. */
export class EvaluationOpenSeam {
  /** Record discriminator for evaluator open seams. */
  readonly kind = "evaluation-open-seam";

  constructor(
    /** Machine-readable evaluator seam category. */
    readonly openKind: EvaluationOpenKind,
    /** Short explanation of the unsupported or unresolved pressure. */
    readonly summary: string,
    /** Syntax node where the pressure appeared. */
    readonly node: ts.Node,
    /** Module key whose evaluation produced the seam. */
    readonly moduleKey: string,
  ) {}
}
