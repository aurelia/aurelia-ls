import type ts from 'typescript';

import {
  EvaluationArrayUncertaintyKind,
  EvaluationArrayShape,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationUndefined,
  readEvaluationTruthiness,
  EvaluationArrayElement,
  type EvaluationValue,
} from './values.js';
import { evaluationArrayHasExactPositions } from './array-value-operations.js';
import { EvaluationValueEvidence } from './value-pressure.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';

export const enum EvaluationArrayCallbackReadKind {
  /** Callback completed normally with a best-known value; pressure may remain. */
  Value = 'value',
  /** Callback execution could not continue, for example because it threw or exhausted its budget. */
  Blocked = 'blocked',
}

export const enum EvaluationArrayCallbackClosure {
  /** The callback result may drive control flow and subsequent evaluator execution. */
  Value = 'value',
  /** The result is a projection candidate only; retained pressure prevents semantic execution. */
  Open = 'open',
}

/** Host-neutral callback result used by TypeScript and Aurelia expression adapters. */
export class EvaluationArrayCallbackRead<TPressure, TBlocker> {
  private constructor(
    readonly kind: EvaluationArrayCallbackReadKind,
    readonly evidence: EvaluationValueEvidence | null,
    readonly closure: EvaluationArrayCallbackClosure,
    readonly pressure: readonly TPressure[],
    readonly blocker: TBlocker | null,
  ) {}

  static value<TPressure, TBlocker>(
    evidence: EvaluationValueEvidence,
    closure: EvaluationArrayCallbackClosure,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayCallbackRead<TPressure, TBlocker> {
    return new EvaluationArrayCallbackRead<TPressure, TBlocker>(
      EvaluationArrayCallbackReadKind.Value,
      evidence,
      closure,
      pressure,
      null,
    );
  }

  static blocked<TPressure, TBlocker>(
    blocker: TBlocker,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayCallbackRead<TPressure, TBlocker> {
    return new EvaluationArrayCallbackRead(
      EvaluationArrayCallbackReadKind.Blocked,
      null,
      EvaluationArrayCallbackClosure.Open,
      pressure,
      blocker,
    );
  }
}

export const enum EvaluationArrayMethodDecisionKind {
  /** Method result is exact relative to the values and pressure supplied by the host. */
  Value = 'value',
  /** Method retains a best-known value, if any, but its result is not closed. */
  Open = 'open',
  /** Method stopped at a host-owned blocker such as abrupt completion or callback budget exhaustion. */
  Blocked = 'blocked',
}

/** Host-neutral array method decision; hosts retain ownership of pressure publication and abrupt completion. */
export class EvaluationArrayMethodDecision<TPressure, TBlocker> {
  readonly openSeams: readonly EvaluationOpenSeam[];

  private constructor(
    readonly kind: EvaluationArrayMethodDecisionKind,
    readonly evidence: EvaluationValueEvidence | null,
    readonly pressure: readonly TPressure[],
    readonly blocker: TBlocker | null,
    readonly openReason: string | null,
    openSeams: readonly EvaluationOpenSeam[],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }

  static value<TPressure, TBlocker>(
    value: EvaluationValue,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayMethodDecision<TPressure, TBlocker> {
    return new EvaluationArrayMethodDecision<TPressure, TBlocker>(
      EvaluationArrayMethodDecisionKind.Value,
      new EvaluationValueEvidence(value, []),
      pressure,
      null,
      null,
      [],
    );
  }

  static valueEvidence<TPressure, TBlocker>(
    evidence: EvaluationValueEvidence,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayMethodDecision<TPressure, TBlocker> {
    return new EvaluationArrayMethodDecision<TPressure, TBlocker>(
      EvaluationArrayMethodDecisionKind.Value,
      evidence,
      pressure,
      null,
      null,
      [],
    );
  }

  static open<TPressure, TBlocker>(
    value: EvaluationValue | null,
    reason: string,
    pressure: readonly TPressure[] = [],
    openSeams: readonly EvaluationOpenSeam[] = [],
  ): EvaluationArrayMethodDecision<TPressure, TBlocker> {
    return new EvaluationArrayMethodDecision<TPressure, TBlocker>(
      EvaluationArrayMethodDecisionKind.Open,
      value == null ? null : new EvaluationValueEvidence(value, []),
      pressure,
      null,
      reason,
      openSeams,
    );
  }

  static openEvidence<TPressure, TBlocker>(
    evidence: EvaluationValueEvidence | null,
    reason: string,
    pressure: readonly TPressure[] = [],
    openSeams: readonly EvaluationOpenSeam[] = [],
  ): EvaluationArrayMethodDecision<TPressure, TBlocker> {
    return new EvaluationArrayMethodDecision<TPressure, TBlocker>(
      EvaluationArrayMethodDecisionKind.Open,
      evidence,
      pressure,
      null,
      reason,
      openSeams,
    );
  }

  static blocked<TPressure, TBlocker>(
    blocker: TBlocker,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayMethodDecision<TPressure, TBlocker> {
    return new EvaluationArrayMethodDecision(EvaluationArrayMethodDecisionKind.Blocked, null, pressure, blocker, null, []);
  }
}

export type EvaluationArrayIterationCallback<TPressure, TBlocker> = (
  arguments_: readonly EvaluationValueEvidence[],
  index: number,
) => EvaluationArrayCallbackRead<TPressure, TBlocker>;

/** Standard JavaScript/Aurelia array iteration callback arguments: value, index, and receiver array. */
export function evaluationArrayIterationCallbackArguments(
  element: EvaluationArrayElement,
  index: number,
  receiver: EvaluationArrayValue,
  node: ts.Node | null,
): readonly EvaluationValueEvidence[] {
  return [
    new EvaluationValueEvidence(element.value, element.openSeams),
    new EvaluationValueEvidence(new EvaluationNumberValue(index, node), []),
    new EvaluationValueEvidence(receiver, []),
  ];
}

/** Standard JavaScript/Aurelia array reducer callback arguments: accumulator, value, index, and receiver array. */
export function evaluationArrayReducerCallbackArguments(
  accumulator: EvaluationValueEvidence,
  element: EvaluationArrayElement,
  index: number,
  receiver: EvaluationArrayValue,
  node: ts.Node | null,
): readonly EvaluationValueEvidence[] {
  return [
    accumulator,
    new EvaluationValueEvidence(element.value, element.openSeams),
    new EvaluationValueEvidence(new EvaluationNumberValue(index, node), []),
    new EvaluationValueEvidence(receiver, []),
  ];
}

/** Snapshot native callback bounds while leaving each indexed property read live. */
function evaluationArrayIterationIndices(length: number, rightToLeft: boolean): readonly number[] {
  const indices = Array.from({ length }, (_, index) => index);
  return rightToLeft ? indices.reverse() : indices;
}

function openIterationArray(
  elements: readonly EvaluationArrayElement[],
  node: ts.Expression | null,
  exactLength: number | null,
  receiver: EvaluationArrayValue,
): EvaluationArrayValue {
  const openSeams = receiver.aggregateOpenSeams;
  return new EvaluationArrayValue(
    elements,
    node,
    EvaluationArrayShape.from({
      exactLength,
      hasExactElements: false,
      hasExactOrder: true,
      uncertainties: receiver.uncertainties,
      extentOpenSeams: exactLength == null ? openSeams : [],
      elementOpenSeams: openSeams,
      orderOpenSeams: [],
    }),
  );
}

/** Execute Array.map traversal once for both evaluator hosts. */
export function evaluationArrayMapDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, 'Array.map receiver membership or order did not close.', [], receiver.aggregateOpenSeams);
  }
  const length = receiver.exactLength!;
  const elements: EvaluationArrayElement[] = [];
  const pressure: TPressure[] = [];
  for (const index of evaluationArrayIterationIndices(length, false)) {
    if (!evaluationArrayHasExactPositions(receiver)) {
      return EvaluationArrayMethodDecision.open(
        openIterationArray(elements, node, length, receiver),
        'Array.map receiver became open during callback traversal.',
        pressure,
        receiver.aggregateOpenSeams,
      );
    }
    const element = receiver.elementAtRuntimeIndex(index);
    if (element == null) {
      continue;
    }
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    elements.push(new EvaluationArrayElement(
      read.evidence!.value,
      element.expression,
      read.evidence!.openSeams,
      index,
    ));
  }
  return EvaluationArrayMethodDecision.value(
    new EvaluationArrayValue(elements, node, EvaluationArrayShape.exact(length)),
    pressure,
  );
}

/** Execute Array.flatMap traversal once for both evaluator hosts. */
export function evaluationArrayFlatMapDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, 'Array.flatMap receiver membership or order did not close.', [], receiver.aggregateOpenSeams);
  }
  const length = receiver.exactLength!;
  const elements: EvaluationArrayElement[] = [];
  const pressure: TPressure[] = [];
  let mayHaveUnknownElements = false;
  const membershipOpenSeams: EvaluationOpenSeam[] = [];
  let hasExactOrder = true;
  const orderOpenSeams: EvaluationOpenSeam[] = [];
  for (const index of evaluationArrayIterationIndices(length, false)) {
    if (!evaluationArrayHasExactPositions(receiver)) {
      return EvaluationArrayMethodDecision.open(
        openIterationArray(elements, node, null, receiver),
        'Array.flatMap receiver became open during callback traversal.',
        pressure,
        receiver.aggregateOpenSeams,
      );
    }
    const element = receiver.elementAtRuntimeIndex(index);
    if (element == null) {
      continue;
    }
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    if (read.closure === EvaluationArrayCallbackClosure.Open) {
      mayHaveUnknownElements = true;
      membershipOpenSeams.push(...read.evidence!.openSeams);
      continue;
    }
    const value = read.evidence!.value;
    if (value.kind === 'array') {
      elements.push(...value.elements);
      mayHaveUnknownElements ||= value.mayHaveUnknownElements;
      membershipOpenSeams.push(...value.extentOpenSeams, ...value.elementOpenSeams);
      hasExactOrder &&= !value.mayHaveUnknownOrder;
      orderOpenSeams.push(...value.orderOpenSeams);
    } else if (value.kind === 'unknown' || value.kind === 'boundary-value' || value.kind === 'boundary-object') {
      mayHaveUnknownElements = true;
    } else {
      elements.push(new EvaluationArrayElement(value, element.expression));
    }
  }
  const result = new EvaluationArrayValue(
    elements,
    node,
    EvaluationArrayShape.from({
      exactLength: mayHaveUnknownElements ? null : elements.length,
      hasExactElements: !mayHaveUnknownElements,
      hasExactOrder,
      uncertainties: mayHaveUnknownElements
        ? [{ kind: EvaluationArrayUncertaintyKind.ConditionalBranch, node }]
        : [],
      extentOpenSeams: membershipOpenSeams,
      elementOpenSeams: membershipOpenSeams,
      orderOpenSeams,
    }),
  );
  return mayHaveUnknownElements
    ? EvaluationArrayMethodDecision.open(result, 'Array.flatMap result membership depended on an open callback value.', pressure)
    : EvaluationArrayMethodDecision.value(result, pressure);
}

/** Execute Array.filter traversal once for both evaluator hosts. */
export function evaluationArrayFilterDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, 'Array.filter receiver membership or order did not close.', [], receiver.aggregateOpenSeams);
  }
  const length = receiver.exactLength!;
  const elements: EvaluationArrayElement[] = [];
  const pressure: TPressure[] = [];
  let openMembership = false;
  const membershipOpenSeams: EvaluationOpenSeam[] = [];
  for (const index of evaluationArrayIterationIndices(length, false)) {
    if (!evaluationArrayHasExactPositions(receiver)) {
      return EvaluationArrayMethodDecision.open(
        openIterationArray(elements, node, null, receiver),
        'Array.filter receiver became open during callback traversal.',
        pressure,
        receiver.aggregateOpenSeams,
      );
    }
    const element = receiver.elementAtRuntimeIndex(index);
    if (element == null) {
      continue;
    }
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    if (read.closure === EvaluationArrayCallbackClosure.Open) {
      openMembership = true;
      membershipOpenSeams.push(...read.evidence!.openSeams);
      continue;
    }
    const keep = readEvaluationTruthiness(read.evidence!.value);
    if (keep == null) {
      openMembership = true;
    } else if (keep) {
      elements.push(element);
    }
  }
  const result = new EvaluationArrayValue(
    elements,
    node,
    EvaluationArrayShape.from({
      exactLength: openMembership ? null : elements.length,
      hasExactElements: !openMembership,
      hasExactOrder: true,
      uncertainties: openMembership
        ? [{ kind: EvaluationArrayUncertaintyKind.ConditionalBranch, node }]
        : [],
      extentOpenSeams: membershipOpenSeams,
      elementOpenSeams: membershipOpenSeams,
      orderOpenSeams: [],
    }),
  );
  return openMembership
    ? EvaluationArrayMethodDecision.open(result, 'Array.filter result membership depended on an open predicate.', pressure)
    : EvaluationArrayMethodDecision.value(result, pressure);
}

/** Execute Array.find/findLast traversal without selecting a later match past an unresolved earlier predicate. */
export function evaluationArrayFindDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  rightToLeft: boolean,
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  const method = rightToLeft ? 'findLast' : 'find';
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, `Array.${method} receiver membership or order did not close.`, [], receiver.aggregateOpenSeams);
  }
  const length = receiver.exactLength!;
  const pressure: TPressure[] = [];
  for (const index of evaluationArrayIterationIndices(length, rightToLeft)) {
    if (!evaluationArrayHasExactPositions(receiver)) {
      return EvaluationArrayMethodDecision.open(
        null,
        `Array.${method} receiver became open during callback traversal.`,
        pressure,
        receiver.aggregateOpenSeams,
      );
    }
    const element = receiver.elementAtRuntimeIndex(index)
      ?? new EvaluationArrayElement(EvaluationUndefined, null, [], index);
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    if (read.closure === EvaluationArrayCallbackClosure.Open) {
      return EvaluationArrayMethodDecision.open(null, `Array.${method} stopped at an open predicate.`, pressure, read.evidence!.openSeams);
    }
    const keep = readEvaluationTruthiness(read.evidence!.value);
    if (keep == null) {
      return EvaluationArrayMethodDecision.open(null, `Array.${method} stopped at an open predicate.`, pressure);
    }
    if (keep) {
      return EvaluationArrayMethodDecision.valueEvidence(
        new EvaluationValueEvidence(element.value, element.openSeams),
        pressure,
      );
    }
  }
  return EvaluationArrayMethodDecision.value(EvaluationUndefined, pressure);
}

/** Execute Array.findIndex/findLastIndex traversal without manufacturing compacted indices. */
export function evaluationArrayFindIndexDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  rightToLeft: boolean,
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  const method = rightToLeft ? 'findLastIndex' : 'findIndex';
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, `Array.${method} receiver membership or order did not close.`, [], receiver.aggregateOpenSeams);
  }
  const length = receiver.exactLength!;
  const pressure: TPressure[] = [];
  for (const index of evaluationArrayIterationIndices(length, rightToLeft)) {
    if (!evaluationArrayHasExactPositions(receiver)) {
      return EvaluationArrayMethodDecision.open(
        null,
        `Array.${method} receiver became open during callback traversal.`,
        pressure,
        receiver.aggregateOpenSeams,
      );
    }
    const element = receiver.elementAtRuntimeIndex(index)
      ?? new EvaluationArrayElement(EvaluationUndefined, null, [], index);
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    if (read.closure === EvaluationArrayCallbackClosure.Open) {
      return EvaluationArrayMethodDecision.open(null, `Array.${method} stopped at an open predicate.`, pressure, read.evidence!.openSeams);
    }
    const keep = readEvaluationTruthiness(read.evidence!.value);
    if (keep == null) {
      return EvaluationArrayMethodDecision.open(null, `Array.${method} stopped at an open predicate.`, pressure);
    }
    if (keep) {
      return EvaluationArrayMethodDecision.value(new EvaluationNumberValue(index, node), pressure);
    }
  }
  return EvaluationArrayMethodDecision.value(new EvaluationNumberValue(-1, node), pressure);
}

/** Execute Array.some/every traversal with ECMAScript short-circuit order. */
export function evaluationArrayQuantifierDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  kind: 'some' | 'every',
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, `Array.${kind} receiver membership or order did not close.`, [], receiver.aggregateOpenSeams);
  }
  const length = receiver.exactLength!;
  const pressure: TPressure[] = [];
  for (const index of evaluationArrayIterationIndices(length, false)) {
    if (!evaluationArrayHasExactPositions(receiver)) {
      return EvaluationArrayMethodDecision.open(
        null,
        `Array.${kind} receiver became open during callback traversal.`,
        pressure,
        receiver.aggregateOpenSeams,
      );
    }
    const element = receiver.elementAtRuntimeIndex(index);
    if (element == null) {
      continue;
    }
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    if (read.closure === EvaluationArrayCallbackClosure.Open) {
      return EvaluationArrayMethodDecision.open(null, `Array.${kind} stopped at an open predicate.`, pressure, read.evidence!.openSeams);
    }
    const keep = readEvaluationTruthiness(read.evidence!.value);
    if (keep == null) {
      return EvaluationArrayMethodDecision.open(null, `Array.${kind} stopped at an open predicate.`, pressure);
    }
    if (kind === 'some' && keep || kind === 'every' && !keep) {
      return EvaluationArrayMethodDecision.value(new EvaluationBooleanValue(kind === 'some', node), pressure);
    }
  }
  return EvaluationArrayMethodDecision.value(new EvaluationBooleanValue(kind === 'every', node), pressure);
}

/** Execute Array.forEach traversal while ignoring callback return values but retaining host pressure. */
export function evaluationArrayForEachDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, 'Array.forEach receiver membership or order did not close.', [], receiver.aggregateOpenSeams);
  }
  const length = receiver.exactLength!;
  const pressure: TPressure[] = [];
  for (const index of evaluationArrayIterationIndices(length, false)) {
    if (!evaluationArrayHasExactPositions(receiver)) {
      return EvaluationArrayMethodDecision.open(
        null,
        'Array.forEach receiver became open during callback traversal.',
        pressure,
        receiver.aggregateOpenSeams,
      );
    }
    const element = receiver.elementAtRuntimeIndex(index);
    if (element == null) {
      continue;
    }
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
  }
  return EvaluationArrayMethodDecision.value(EvaluationUndefined, pressure);
}

/** Execute Array.reduce/reduceRight traversal over an exact receiver. */
export function evaluationArrayReduceDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  rightToLeft: boolean,
  initialValue: EvaluationValueEvidence | null,
  initialPressure: readonly TPressure[],
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  const method = rightToLeft ? 'reduceRight' : 'reduce';
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, `Array.${method} receiver membership or order did not close.`, initialPressure, receiver.aggregateOpenSeams);
  }
  const length = receiver.exactLength!;
  const indices = evaluationArrayIterationIndices(length, rightToLeft);
  let accumulator = initialValue;
  let start = 0;
  if (accumulator == null) {
    while (start < indices.length) {
      const first = receiver.elementAtRuntimeIndex(indices[start]!);
      start += 1;
      if (first != null) {
        accumulator = new EvaluationValueEvidence(first.value, first.openSeams);
        break;
      }
    }
    if (accumulator == null) {
      return EvaluationArrayMethodDecision.open(null, `Array.${method} had no initial value and no first element.`, initialPressure);
    }
  }
  const pressure = [...initialPressure];
  for (let position = start; position < indices.length; position += 1) {
    if (!evaluationArrayHasExactPositions(receiver)) {
      return EvaluationArrayMethodDecision.openEvidence(
        accumulator,
        `Array.${method} receiver became open during callback traversal.`,
        pressure,
        receiver.aggregateOpenSeams,
      );
    }
    const index = indices[position]!;
    const element = receiver.elementAtRuntimeIndex(index);
    if (element == null) {
      continue;
    }
    const read = callback(evaluationArrayReducerCallbackArguments(accumulator, element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    if (read.closure === EvaluationArrayCallbackClosure.Open) {
      return EvaluationArrayMethodDecision.openEvidence(
        read.evidence,
        `Array.${method} reducer returned an open accumulator.`,
        pressure,
      );
    }
    accumulator = read.evidence!;
  }
  return EvaluationArrayMethodDecision.valueEvidence(accumulator, pressure);
}
