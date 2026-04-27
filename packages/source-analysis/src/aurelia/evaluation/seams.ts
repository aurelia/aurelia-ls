import type ts from 'typescript';

export const enum EvaluationOpenSeamKind {
  /** Evaluation stopped because recursion protection prevented deeper interpretation. */
  DepthLimit = 'depth-limit',
  /** Evaluation stopped because statement protection prevented more interpretation. */
  StatementLimit = 'statement-limit',
  /** The evaluator reached a statement kind with runtime effects it does not model yet. */
  UnsupportedStatement = 'unsupported-statement',
  /** The evaluator reached an expression kind with runtime effects it does not model yet. */
  UnsupportedExpression = 'unsupported-expression',
  /** A binding pattern could not be represented in the environment record. */
  UnsupportedBindingPattern = 'unsupported-binding-pattern',
  /** A referenced identifier was not present in the current environment record. */
  UnresolvedIdentifier = 'unresolved-identifier',
  /** A module specifier could not be resolved to a source module. */
  UnresolvedModule = 'unresolved-module',
  /** A call expression was not a known evaluator intrinsic or simple local function. */
  DynamicCall = 'dynamic-call',
  /** A branch condition could not be reduced without guessing which path executes. */
  DynamicBranch = 'dynamic-branch',
  /** A loop could not be reduced to a known finite set of iterations. */
  DynamicLoop = 'dynamic-loop',
  /** A mutation could not be represented without executing user behavior. */
  DynamicMutation = 'dynamic-mutation',
  /** A dynamic import or non-literal module edge could not be linked statically. */
  DynamicImport = 'dynamic-import',
}

/** Evaluator-local unresolved point; kernel projection happens through evaluation/kernel-bridge.ts. */
export class EvaluationOpenSeam {
  readonly kind = 'evaluation-open-seam' as const;

  constructor(
    /** Machine-readable evaluator seam category. */
    readonly seamKind: EvaluationOpenSeamKind,
    /** Short explanation of the unsupported or unresolved evaluation pressure. */
    readonly summary: string,
    /** Syntax node where the pressure appeared. */
    readonly node: ts.Node,
    /** Module key whose evaluation produced the seam. */
    readonly moduleKey: string,
  ) {}
}
