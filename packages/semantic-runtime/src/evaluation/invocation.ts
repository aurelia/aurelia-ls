import ts from 'typescript';

import type { EvaluationArgumentList } from './argument-list.js';
import {
  NormalEvaluationCompletion,
  type EvaluationExpressionCompletion,
} from './completion.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import type { EvaluationValue } from './values.js';
import type { EvaluationValueEvidence } from './value-pressure.js';

export const enum StaticInvocationKind {
  /** Invoke an evaluated callable with ECMAScript call receiver semantics. */
  Call = 'call',
  /** Construct through an evaluated constructor with no call receiver. */
  Construct = 'construct',
}

export const enum StaticInvocationEvaluationKind {
  /** Invocation preparation stopped before the ECMAScript invocation operation. */
  PreparationBoundary = 'preparation-boundary',
  /** The ECMAScript invocation operation was reached. */
  Occurrence = 'occurrence',
}

export const enum StaticInvocationPreparationBoundaryKind {
  /** Argument evaluation or spread iteration did not prove that control reaches invocation. */
  ArgumentListOpen = 'argument-list-open',
}

/** One evaluated ECMAScript reference, preserving every value-bearing edge needed by invocation consumers. */
export class StaticInvocationReference {
  constructor(
    readonly calleeNode: ts.Expression,
    readonly callee: EvaluationValueEvidence,
    readonly receiverNode: ts.Expression | null,
    readonly thisValue: EvaluationValueEvidence | null,
    readonly propertyKeyNode: ts.Node | null,
    readonly propertyKey: string | null,
    readonly propertyKeyEvidence: EvaluationValueEvidence | null,
  ) {}
}

/**
 * One fully prepared ECMAScript invocation point. Reference evaluation and the
 * argument list have completed exactly once before any dispatcher sees it.
 */
export class StaticInvocationFrame<
  TNode extends ts.CallExpression | ts.NewExpression = ts.CallExpression | ts.NewExpression,
> {
  constructor(
    readonly kind: StaticInvocationKind,
    readonly node: TNode,
    readonly environment: ModuleEnvironmentRecord,
    readonly moduleKey: string,
    readonly depth: number,
    readonly reference: StaticInvocationReference,
    readonly argumentList: EvaluationArgumentList,
  ) {}

  get calleeNode(): ts.Expression {
    return this.reference.calleeNode;
  }

  get callee(): EvaluationValueEvidence {
    return this.reference.callee;
  }

  get thisValue(): EvaluationValueEvidence | null {
    return this.reference.thisValue;
  }

  get propertyKey(): string | null {
    return this.reference.propertyKey;
  }
}

/** Immutable evidence from one invocation point reached by modeled execution. */
export class StaticInvocationOccurrence<
  TNode extends ts.CallExpression | ts.NewExpression = ts.CallExpression | ts.NewExpression,
> {
  readonly evaluationKind = StaticInvocationEvaluationKind.Occurrence;
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly ordinal: number,
    readonly kind: StaticInvocationKind,
    readonly node: TNode,
    readonly moduleKey: string,
    readonly reference: StaticInvocationReference,
    readonly argumentList: EvaluationArgumentList,
    readonly completion: EvaluationExpressionCompletion,
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }

  get callee(): EvaluationValueEvidence {
    return this.reference.callee;
  }

  get thisValue(): EvaluationValueEvidence | null {
    return this.reference.thisValue;
  }

  get propertyKey(): string | null {
    return this.reference.propertyKey;
  }
}

/**
 * Immutable evidence from invocation preparation that ran but could not prove
 * that the invocation operation itself was reached.
 */
export class StaticInvocationPreparationBoundary<
  TNode extends ts.CallExpression | ts.NewExpression = ts.CallExpression | ts.NewExpression,
> {
  readonly evaluationKind = StaticInvocationEvaluationKind.PreparationBoundary;
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly ordinal: number,
    readonly boundaryKind: StaticInvocationPreparationBoundaryKind,
    readonly kind: StaticInvocationKind,
    readonly node: TNode,
    readonly moduleKey: string,
    readonly reference: StaticInvocationReference,
    readonly argumentList: EvaluationArgumentList,
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }

  get callee(): EvaluationValueEvidence {
    return this.reference.callee;
  }

  get thisValue(): EvaluationValueEvidence | null {
    return this.reference.thisValue;
  }

  get propertyKey(): string | null {
    return this.reference.propertyKey;
  }
}

export type StaticInvocationEvaluation =
  | StaticInvocationPreparationBoundary
  | StaticInvocationOccurrence;

export function isStaticInvocationOccurrence(
  evaluation: StaticInvocationEvaluation,
): evaluation is StaticInvocationOccurrence {
  return evaluation.evaluationKind === StaticInvocationEvaluationKind.Occurrence;
}

export function isStaticCallInvocationOccurrence(
  occurrence: StaticInvocationEvaluation,
): occurrence is StaticInvocationOccurrence<ts.CallExpression> {
  return isStaticInvocationOccurrence(occurrence)
    && occurrence.kind === StaticInvocationKind.Call
    && ts.isCallExpression(occurrence.node);
}

/** Read one exact value-bearing invocation edge without replaying its source expression. */
export function staticInvocationEvidenceForExpression(
  occurrence: StaticInvocationEvaluation,
  expression: ts.Expression,
): EvaluationValueEvidence | null {
  const reference = occurrence.reference;
  if (reference.calleeNode === expression) {
    return reference.callee;
  }
  if (reference.receiverNode === expression) {
    return reference.thisValue;
  }
  if (reference.propertyKeyNode === expression) {
    return reference.propertyKeyEvidence;
  }
  const argument = occurrence.argumentList.authoredArguments.find((candidate) =>
    candidate.node === expression || candidate.valueExpression === expression
  );
  return argument?.evidence ?? null;
}

export const enum StaticInvocationDispatchKind {
  /** Dispatcher does not own this evaluated invocation identity. */
  NotApplicable = 'not-applicable',
  /** Dispatcher handled the invocation and produced its modeled value. */
  Handled = 'handled',
}

export interface StaticInvocationNotApplicable {
  readonly kind: StaticInvocationDispatchKind.NotApplicable;
}

export class StaticInvocationHandled {
  readonly kind = StaticInvocationDispatchKind.Handled;
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly completion: EvaluationExpressionCompletion,
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

export type StaticInvocationDispatch =
  | StaticInvocationNotApplicable
  | StaticInvocationHandled;

export const StaticInvocationNotApplicable: StaticInvocationNotApplicable = {
  kind: StaticInvocationDispatchKind.NotApplicable,
};

export function staticInvocationValue(
  value: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[] = [],
): StaticInvocationHandled {
  return new StaticInvocationHandled(new NormalEvaluationCompletion(value), openSeams);
}
