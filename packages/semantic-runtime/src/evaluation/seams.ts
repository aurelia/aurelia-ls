import type ts from 'typescript';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { OpenSeamKindKey } from '../kernel/vocabulary.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';

export const EvaluationOpenSeamKind = {
  /** Evaluation stopped because recursion protection prevented deeper interpretation. */
  DepthLimit: KernelVocabulary.Evaluation.DepthLimit.key,
  /** Evaluation stopped because statement protection prevented more interpretation. */
  StatementLimit: KernelVocabulary.Evaluation.StatementLimit.key,
  /** The evaluator reached a statement kind with runtime effects it does not model yet. */
  UnsupportedStatement: KernelVocabulary.Evaluation.UnsupportedStatement.key,
  /** The evaluator reached an expression kind with runtime effects it does not model yet. */
  UnsupportedExpression: KernelVocabulary.Evaluation.UnsupportedExpression.key,
  /** A binding pattern could not be represented in the environment record. */
  UnsupportedBindingPattern: KernelVocabulary.Evaluation.UnsupportedBindingPattern.key,
  /** A referenced identifier was not present in the current environment record. */
  UnresolvedIdentifier: KernelVocabulary.Evaluation.UnresolvedIdentifier.key,
  /** A module specifier could not be resolved to a source module. */
  UnresolvedModule: KernelVocabulary.Evaluation.UnresolvedModule.key,
  /** A call expression was not a known evaluator intrinsic or simple local function. */
  DynamicCall: KernelVocabulary.Evaluation.DynamicCall.key,
  /** A branch condition could not be reduced without guessing which path executes. */
  DynamicBranch: KernelVocabulary.Evaluation.DynamicBranch.key,
  /** A loop could not be reduced to a known finite set of iterations. */
  DynamicLoop: KernelVocabulary.Evaluation.DynamicLoop.key,
  /** A mutation could not be represented without executing user behavior. */
  DynamicMutation: KernelVocabulary.Evaluation.DynamicMutation.key,
  /** A dynamic import or non-literal module edge could not be linked statically. */
  DynamicImport: KernelVocabulary.Evaluation.DynamicImport.key,
} as const satisfies Record<string, OpenSeamKindKey>;

export type EvaluationOpenSeamKind =
  typeof EvaluationOpenSeamKind[keyof typeof EvaluationOpenSeamKind];

/** Evaluator-local unresolved point; kernel projection happens through evaluation/kernel-emitter.ts. */
export class EvaluationOpenSeam {
  readonly kind = 'evaluation-open-seam' as const;
  readonly sourceFile: ts.SourceFile;

  constructor(
    /** Machine-readable evaluator seam category. */
    readonly seamKind: EvaluationOpenSeamKind,
    /** Short explanation of the unsupported or unresolved evaluation pressure. */
    readonly summary: string,
    /** Syntax node where the pressure appeared. */
    readonly node: ts.Node,
    /** Module key whose evaluation produced the seam. */
    readonly moduleKey: string,
    /** Machine-readable lower-level reasons already known by the evaluator producer. */
    readonly reasonKinds: readonly OpenSeamReasonKind[] = [],
  ) {
    this.sourceFile = node.getSourceFile();
  }
}
