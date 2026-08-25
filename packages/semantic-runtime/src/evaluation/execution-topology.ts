import type ts from 'typescript';

import {
  EvaluationArgumentList,
  EvaluationAuthoredArgument,
} from './argument-list.js';
import {
  EvaluationCompletionKind,
  NormalEvaluationCompletion,
  ThrowEvaluationCompletion,
  type EvaluationExpressionCompletion,
} from './completion.js';
import {
  StaticInvocationOccurrence,
  StaticInvocationPreparationBoundary,
  StaticInvocationReference,
  isStaticInvocationOccurrence,
  type StaticInvocationEvaluation,
} from './invocation.js';
import type { EvaluationOpenSeam } from './seams.js';
import {
  EvaluationArrayElement,
  type EvaluationValue,
} from './values.js';
import { EvaluationValueEvidence } from './value-pressure.js';

/** One unresolved conditional whose alternatives were evaluated in mutually exclusive graph-isolated lanes. */
export class StaticConditionalExecution {
  constructor(
    /** Position of this branch among definitely reached events in its owning execution lane. */
    readonly ordinal: number,
    readonly node: ts.ConditionalExpression,
    readonly moduleKey: string,
    /** Selector value read before the sibling lanes diverged. */
    readonly condition: EvaluationValueEvidence,
    /** Causal boundary that qualifies both alternatives. */
    readonly branchSeam: EvaluationOpenSeam,
    readonly whenTrue: StaticEvaluationExecutionTopology,
    readonly whenFalse: StaticEvaluationExecutionTopology,
  ) {}
}

/** Retained evaluator event whose ordinal is meaningful only inside its owning execution lane. */
export type StaticEvaluationExecutionEvent =
  | StaticInvocationEvaluation
  | StaticConditionalExecution;

/** Partial-order execution evidence: definite root events plus nested mutually exclusive lanes. */
export class StaticEvaluationExecutionTopology {
  static readonly Empty = new StaticEvaluationExecutionTopology([]);

  /** Compatibility projection containing only invocations definitely reached in this exact lane. */
  readonly invocationEvaluations: readonly StaticInvocationEvaluation[];

  constructor(
    readonly events: readonly StaticEvaluationExecutionEvent[],
  ) {
    this.invocationEvaluations = events.filter(isStaticEvaluationInvocationEvent);
  }
}

/** Project every value-bearing edge while preserving the execution topology and authored source identity. */
export function mapStaticEvaluationExecutionTopologyValues(
  topology: StaticEvaluationExecutionTopology,
  mapValue: (value: EvaluationValue, path: string) => EvaluationValue,
  path: string,
): StaticEvaluationExecutionTopology {
  if (topology.events.length === 0) {
    return StaticEvaluationExecutionTopology.Empty;
  }
  return new StaticEvaluationExecutionTopology(topology.events.map((event, index) =>
    event instanceof StaticConditionalExecution
      ? new StaticConditionalExecution(
          event.ordinal,
          event.node,
          event.moduleKey,
          mapEvidence(event.condition, mapValue, `${path}.${index}.condition`),
          event.branchSeam,
          mapStaticEvaluationExecutionTopologyValues(
            event.whenTrue,
            mapValue,
            `${path}.${index}.whenTrue`,
          ),
          mapStaticEvaluationExecutionTopologyValues(
            event.whenFalse,
            mapValue,
            `${path}.${index}.whenFalse`,
          ),
        )
      : mapInvocationEvaluation(event, mapValue, `${path}.${index}`)
  ));
}

function isStaticEvaluationInvocationEvent(
  event: StaticEvaluationExecutionEvent,
): event is StaticInvocationEvaluation {
  return event instanceof StaticInvocationOccurrence
    || event instanceof StaticInvocationPreparationBoundary;
}

function mapInvocationEvaluation(
  invocation: StaticInvocationEvaluation,
  mapValue: (value: EvaluationValue, path: string) => EvaluationValue,
  path: string,
): StaticInvocationEvaluation {
  const reference = mapStaticInvocationReferenceValues(invocation.reference, mapValue, path);
  const argumentList = mapEvaluationArgumentListValues(invocation.argumentList, mapValue, path);
  return isStaticInvocationOccurrence(invocation)
    ? new StaticInvocationOccurrence(
        invocation.identity,
        invocation.ordinal,
        invocation.kind,
        invocation.node,
        invocation.moduleKey,
        reference,
        argumentList,
        mapEvaluationExpressionCompletionValues(invocation.completion, mapValue, `${path}.completion`),
        invocation.openSeams,
      )
    : new StaticInvocationPreparationBoundary(
        invocation.identity,
        invocation.ordinal,
        invocation.boundaryKind,
        invocation.kind,
        invocation.node,
        invocation.moduleKey,
        reference,
        argumentList,
        invocation.openSeams,
      );
}

export function mapStaticInvocationReferenceValues(
  reference: StaticInvocationReference,
  mapValue: (value: EvaluationValue, path: string) => EvaluationValue,
  path: string,
): StaticInvocationReference {
  return new StaticInvocationReference(
    reference.calleeNode,
    mapEvidence(reference.callee, mapValue, `${path}.callee`),
    reference.receiverNode,
    reference.thisValue == null
      ? null
      : mapEvidence(reference.thisValue, mapValue, `${path}.receiver`),
    reference.propertyKeyNode,
    reference.propertyKey,
    reference.propertyKeyEvidence == null
      ? null
      : mapEvidence(reference.propertyKeyEvidence, mapValue, `${path}.propertyKey`),
  );
}

export function mapEvaluationArgumentListValues(
  argumentList: EvaluationArgumentList,
  mapValue: (value: EvaluationValue, path: string) => EvaluationValue,
  path: string,
): EvaluationArgumentList {
  return new EvaluationArgumentList(
    argumentList.authoredArguments.map((argument, index) => new EvaluationAuthoredArgument(
      argument.node,
      argument.valueExpression,
      mapEvidence(argument.evidence, mapValue, `${path}.authoredArgument.${index}`),
    )),
    argumentList.elements.map((element, index) => new EvaluationArrayElement(
      mapValue(element.value, `${path}.runtimeArgument.${index}`),
      element.expression,
      element.openSeams,
      element.runtimeIndex,
    )),
    argumentList.shape,
    argumentList.outcome,
  );
}

export function mapEvaluationExpressionCompletionValues(
  completion: EvaluationExpressionCompletion,
  mapValue: (value: EvaluationValue, path: string) => EvaluationValue,
  path: string,
): EvaluationExpressionCompletion {
  return completion.kind === EvaluationCompletionKind.Normal
    ? new NormalEvaluationCompletion(mapValue(completion.value, path))
    : new ThrowEvaluationCompletion(mapValue(completion.value, path), completion.openSeams);
}

function mapEvidence(
  evidence: EvaluationValueEvidence,
  mapValue: (value: EvaluationValue, path: string) => EvaluationValue,
  path: string,
): EvaluationValueEvidence {
  return new EvaluationValueEvidence(mapValue(evidence.value, path), evidence.openSeams);
}
