import type ts from 'typescript';

import {
  EvaluationArrayUncertaintyKind,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationUndefined,
  readEvaluationTruthiness,
  EvaluationArrayElement,
  type EvaluationValue,
} from './values.js';
import { evaluationArrayHasExactPositions } from './array-value-operations.js';

export const enum EvaluationArrayCallbackReadKind {
  /** Callback completed normally with a best-known value; pressure may remain. */
  Value = 'value',
  /** Callback execution could not continue, for example because it threw or exhausted its budget. */
  Blocked = 'blocked',
}

/** Host-neutral callback result used by TypeScript and Aurelia expression adapters. */
export class EvaluationArrayCallbackRead<TPressure, TBlocker> {
  private constructor(
    readonly kind: EvaluationArrayCallbackReadKind,
    readonly value: EvaluationValue | null,
    readonly pressure: readonly TPressure[],
    readonly blocker: TBlocker | null,
  ) {}

  static value<TPressure, TBlocker>(
    value: EvaluationValue,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayCallbackRead<TPressure, TBlocker> {
    return new EvaluationArrayCallbackRead<TPressure, TBlocker>(
      EvaluationArrayCallbackReadKind.Value,
      value,
      pressure,
      null,
    );
  }

  static blocked<TPressure, TBlocker>(
    blocker: TBlocker,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayCallbackRead<TPressure, TBlocker> {
    return new EvaluationArrayCallbackRead(EvaluationArrayCallbackReadKind.Blocked, null, pressure, blocker);
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
  private constructor(
    readonly kind: EvaluationArrayMethodDecisionKind,
    readonly value: EvaluationValue | null,
    readonly pressure: readonly TPressure[],
    readonly blocker: TBlocker | null,
    readonly openReason: string | null,
  ) {}

  static value<TPressure, TBlocker>(
    value: EvaluationValue,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayMethodDecision<TPressure, TBlocker> {
    return new EvaluationArrayMethodDecision<TPressure, TBlocker>(
      EvaluationArrayMethodDecisionKind.Value,
      value,
      pressure,
      null,
      null,
    );
  }

  static open<TPressure, TBlocker>(
    value: EvaluationValue | null,
    reason: string,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayMethodDecision<TPressure, TBlocker> {
    return new EvaluationArrayMethodDecision<TPressure, TBlocker>(
      EvaluationArrayMethodDecisionKind.Open,
      value,
      pressure,
      null,
      reason,
    );
  }

  static blocked<TPressure, TBlocker>(
    blocker: TBlocker,
    pressure: readonly TPressure[] = [],
  ): EvaluationArrayMethodDecision<TPressure, TBlocker> {
    return new EvaluationArrayMethodDecision(EvaluationArrayMethodDecisionKind.Blocked, null, pressure, blocker, null);
  }
}

export type EvaluationArrayIterationCallback<TPressure, TBlocker> = (
  arguments_: readonly EvaluationValue[],
  index: number,
) => EvaluationArrayCallbackRead<TPressure, TBlocker>;

/** Standard JavaScript/Aurelia array iteration callback arguments: value, index, and receiver array. */
export function evaluationArrayIterationCallbackArguments(
  element: EvaluationArrayElement,
  index: number,
  receiver: EvaluationArrayValue,
  node: ts.Node | null,
): readonly EvaluationValue[] {
  return [
    element.value,
    new EvaluationNumberValue(index, node),
    receiver,
  ];
}

/** Standard JavaScript/Aurelia array reducer callback arguments: accumulator, value, index, and receiver array. */
export function evaluationArrayReducerCallbackArguments(
  accumulator: EvaluationValue,
  element: EvaluationArrayElement,
  index: number,
  receiver: EvaluationArrayValue,
  node: ts.Node | null,
): readonly EvaluationValue[] {
  return [
    accumulator,
    element.value,
    new EvaluationNumberValue(index, node),
    receiver,
  ];
}

/** Enumerate known array elements in the callback order used by forward and reverse native array methods. */
export function evaluationArrayElementsInIterationOrder(
  receiver: EvaluationArrayValue,
  rightToLeft: boolean,
): readonly { readonly element: EvaluationArrayElement | undefined; readonly index: number }[] {
  const ordered = receiver.elements.map((element, index) => ({ element, index }));
  return rightToLeft ? ordered.reverse() : ordered;
}

/** Execute Array.map traversal once for both evaluator hosts. */
export function evaluationArrayMapDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, 'Array.map receiver membership or order did not close.');
  }
  const elements: EvaluationArrayElement[] = [];
  const pressure: TPressure[] = [];
  for (let index = 0; index < receiver.elements.length; index += 1) {
    const element = receiver.elements[index]!;
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    elements.push(new EvaluationArrayElement(read.value!, element.expression));
  }
  return EvaluationArrayMethodDecision.value(new EvaluationArrayValue(elements, false, node), pressure);
}

/** Execute Array.flatMap traversal once for both evaluator hosts. */
export function evaluationArrayFlatMapDecision<TPressure, TBlocker>(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, 'Array.flatMap receiver membership or order did not close.');
  }
  const elements: EvaluationArrayElement[] = [];
  const pressure: TPressure[] = [];
  let mayHaveUnknownElements = false;
  for (let index = 0; index < receiver.elements.length; index += 1) {
    const element = receiver.elements[index]!;
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    const value = read.value!;
    if (value.kind === 'array') {
      elements.push(...value.elements);
      mayHaveUnknownElements ||= value.mayHaveUnknownElements || value.mayHaveUnknownOrder;
    } else if (value.kind === 'unknown' || value.kind === 'boundary-value' || value.kind === 'boundary-object') {
      mayHaveUnknownElements = true;
    } else {
      elements.push(new EvaluationArrayElement(value, element.expression));
    }
  }
  const result = new EvaluationArrayValue(elements, mayHaveUnknownElements, node, mayHaveUnknownElements);
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
    return EvaluationArrayMethodDecision.open(null, 'Array.filter receiver membership or order did not close.');
  }
  const elements: EvaluationArrayElement[] = [];
  const pressure: TPressure[] = [];
  let openMembership = false;
  for (let index = 0; index < receiver.elements.length; index += 1) {
    const element = receiver.elements[index]!;
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    const keep = readEvaluationTruthiness(read.value!);
    if (keep == null) {
      openMembership = true;
    } else if (keep) {
      elements.push(element);
    }
  }
  const result = new EvaluationArrayValue(
    elements,
    openMembership,
    node,
    openMembership,
    openMembership
      ? [{ kind: EvaluationArrayUncertaintyKind.ConditionalBranch, node }]
      : [],
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
    return EvaluationArrayMethodDecision.open(null, `Array.${method} receiver membership or order did not close.`);
  }
  const pressure: TPressure[] = [];
  for (const { element, index } of evaluationArrayElementsInIterationOrder(receiver, rightToLeft)) {
    const read = callback(evaluationArrayIterationCallbackArguments(element!, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    const keep = readEvaluationTruthiness(read.value!);
    if (keep == null) {
      return EvaluationArrayMethodDecision.open(null, `Array.${method} stopped at an open predicate.`, pressure);
    }
    if (keep) {
      return EvaluationArrayMethodDecision.value(element!.value, pressure);
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
    return EvaluationArrayMethodDecision.open(null, `Array.${method} receiver membership or order did not close.`);
  }
  const pressure: TPressure[] = [];
  for (const { element, index } of evaluationArrayElementsInIterationOrder(receiver, rightToLeft)) {
    const read = callback(evaluationArrayIterationCallbackArguments(element!, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    const keep = readEvaluationTruthiness(read.value!);
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
    return EvaluationArrayMethodDecision.open(null, `Array.${kind} receiver membership or order did not close.`);
  }
  const pressure: TPressure[] = [];
  for (let index = 0; index < receiver.elements.length; index += 1) {
    const element = receiver.elements[index]!;
    const read = callback(evaluationArrayIterationCallbackArguments(element, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    const keep = readEvaluationTruthiness(read.value!);
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
    return EvaluationArrayMethodDecision.open(null, 'Array.forEach receiver membership or order did not close.');
  }
  const pressure: TPressure[] = [];
  for (let index = 0; index < receiver.elements.length; index += 1) {
    const element = receiver.elements[index]!;
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
  initialValue: EvaluationValue | null,
  initialPressure: readonly TPressure[],
  callback: EvaluationArrayIterationCallback<TPressure, TBlocker>,
): EvaluationArrayMethodDecision<TPressure, TBlocker> {
  const method = rightToLeft ? 'reduceRight' : 'reduce';
  if (!evaluationArrayHasExactPositions(receiver)) {
    return EvaluationArrayMethodDecision.open(null, `Array.${method} receiver membership or order did not close.`, initialPressure);
  }
  const ordered = evaluationArrayElementsInIterationOrder(receiver, rightToLeft);
  let accumulator = initialValue;
  let start = 0;
  if (accumulator == null) {
    const first = ordered[0]?.element ?? null;
    if (first == null) {
      return EvaluationArrayMethodDecision.open(null, `Array.${method} had no initial value and no first element.`, initialPressure);
    }
    accumulator = first.value;
    start = 1;
  }
  const pressure = [...initialPressure];
  for (let position = start; position < ordered.length; position += 1) {
    const { element, index } = ordered[position]!;
    const read = callback(evaluationArrayReducerCallbackArguments(accumulator, element!, index, receiver, node), index);
    pressure.push(...read.pressure);
    if (read.kind === EvaluationArrayCallbackReadKind.Blocked) {
      return EvaluationArrayMethodDecision.blocked(read.blocker!, pressure);
    }
    accumulator = read.value!;
  }
  return EvaluationArrayMethodDecision.value(accumulator, pressure);
}
