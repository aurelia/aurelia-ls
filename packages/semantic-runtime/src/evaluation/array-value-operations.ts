import type ts from 'typescript';

import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayValue,
  EvaluationUndefined,
  mergeEvaluationArrayUncertainties,
  type EvaluationArrayUncertainty,
  type EvaluationValue,
} from './values.js';
import {
  EvaluationValueRelationKind,
  evaluationSameValueZeroDecision,
  evaluationStrictEqualityDecision,
  evaluationValuesSameValueZero,
} from './value-relation.js';
import { stringCoercionText } from './value-coercion.js';
import type { EvaluationOpenSeam } from './seams.js';

export interface EvaluationArraySortResult {
  readonly elements: readonly EvaluationArrayElement[];
  readonly mayHaveUnknownOrder: boolean;
}

/** ECMAScript Array constructor length domain after the single-number overload has been selected. */
export function isValidEvaluationArrayLength(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

/** One scalar array search result plus only the visited slot pressure that prevents closure. */
export class EvaluationArraySearchRead<TResult> {
  constructor(
    readonly value: TResult | null,
    readonly openSeams: readonly EvaluationOpenSeam[] = [],
  ) {}
}

/** Whether every retained element and hole has an exact runtime position. */
export function evaluationArrayHasExactPositions(receiver: EvaluationArrayValue): boolean {
  return receiver.hasExactElementPositions;
}

/** Present elements in ascending runtime-index order. Exact arrays are normalized to this invariant at construction. */
export function evaluationArrayPresentElements(
  receiver: EvaluationArrayValue,
): readonly EvaluationArrayElement[] {
  return receiver.elements;
}

/** Rebase present elements onto consecutive runtime indices. */
export function rebaseEvaluationArrayElements(
  elements: readonly EvaluationArrayElement[],
  start = 0,
): EvaluationArrayElement[] {
  return elements.map((element, offset) => element.withRuntimeIndex(start + offset));
}

/** Shift exact retained positions without manufacturing values for holes. */
export function shiftEvaluationArrayElementIndices(
  elements: readonly EvaluationArrayElement[],
  delta: number,
): EvaluationArrayElement[] {
  return elements.map((element) => element.withRuntimeIndex(
    element.runtimeIndex == null ? null : element.runtimeIndex + delta,
  ));
}

/** Materialize Get-style indexed reads, where an exact hole reads as `undefined`. */
export function denseEvaluationArrayElements(
  receiver: EvaluationArrayValue,
): EvaluationArrayElement[] | null {
  if (!evaluationArrayHasExactPositions(receiver) || receiver.exactLength == null) {
    return null;
  }
  const elements: EvaluationArrayElement[] = [];
  let presentOffset = 0;
  for (let runtimeIndex = 0; runtimeIndex < receiver.exactLength; runtimeIndex += 1) {
    const present = receiver.elements[presentOffset];
    if (present?.runtimeIndex === runtimeIndex) {
      elements.push(present.withRuntimeIndex(runtimeIndex));
      presentOffset += 1;
    } else {
      elements.push(new EvaluationArrayElement(EvaluationUndefined, null, [], runtimeIndex));
    }
  }
  return elements;
}

/** Project exact iterator membership even when the source's final element order remains open. */
export function evaluationArrayIteratorElements(
  receiver: EvaluationArrayValue,
): EvaluationArrayElement[] | null {
  if (receiver.exactLength == null || receiver.mayHaveUnknownElements) {
    return null;
  }
  const dense = denseEvaluationArrayElements(receiver);
  if (dense != null) {
    return dense;
  }
  const holes = receiver.exactLength - receiver.elements.length;
  return [
    ...receiver.elements.map((element) => element.withRuntimeIndex(null)),
    ...Array.from({ length: holes }, () =>
      new EvaluationArrayElement(EvaluationUndefined, null)
    ),
  ];
}

/** Read Array.includes without comparing pressure-qualified element candidates. */
export function evaluationArrayIncludes(
  receiver: EvaluationArrayValue,
  search: EvaluationValue,
  start: number,
): EvaluationArraySearchRead<boolean> {
  const openSeams: EvaluationOpenSeam[] = [];
  let relationOpen = false;
  for (const element of receiver.elements) {
    if (element.runtimeIndex == null || element.runtimeIndex < start) {
      continue;
    }
    if (element.openSeams.length > 0) {
      openSeams.push(...element.openSeams);
      continue;
    }
    const decision = evaluationSameValueZeroDecision(element.value, search);
    if (decision === EvaluationValueRelationKind.Match) {
      return new EvaluationArraySearchRead(true);
    }
    relationOpen ||= decision === EvaluationValueRelationKind.Open;
  }
  if (
    evaluationValuesSameValueZero(EvaluationUndefined, search)
    && receiver.exactLength != null
    && receiver.exactLength - start > receiver.elements.filter((element) =>
      element.runtimeIndex != null && element.runtimeIndex >= start
    ).length
  ) {
    return new EvaluationArraySearchRead(true);
  }
  return openSeams.length > 0 || relationOpen
    ? new EvaluationArraySearchRead<boolean>(null, openSeams)
    : new EvaluationArraySearchRead(false);
}

/** Read Array.indexOf/lastIndexOf without letting an earlier open slot choose the returned index. */
export function evaluationArrayIndexOf(
  receiver: EvaluationArrayValue,
  search: EvaluationValue,
  start: number,
  rightToLeft: boolean,
): EvaluationArraySearchRead<number> {
  const candidates = rightToLeft ? receiver.elements.slice().reverse() : receiver.elements;
  for (const element of candidates) {
    const index = element.runtimeIndex;
    if (index == null || (rightToLeft ? index > start : index < start)) {
      continue;
    }
    if (element.openSeams.length > 0) {
      return new EvaluationArraySearchRead<number>(null, element.openSeams);
    }
    const decision = evaluationStrictEqualityDecision(element.value, search);
    if (decision === EvaluationValueRelationKind.Open) {
      return new EvaluationArraySearchRead<number>(null);
    }
    if (decision === EvaluationValueRelationKind.Match) {
      return new EvaluationArraySearchRead(index);
    }
  }
  return new EvaluationArraySearchRead(-1);
}

/** Read Array.join from an exact-position evaluator array, returning null for open slots or unmodeled coercion. */
export function evaluationArrayJoin(
  receiver: EvaluationArrayValue,
  separator: string,
): string | null {
  if (!evaluationArrayHasExactPositions(receiver) || receiver.exactLength == null) {
    return null;
  }
  const parts: string[] = [];
  for (let index = 0; index < receiver.exactLength; index += 1) {
    const element = receiver.elementAtRuntimeIndex(index);
    if (element == null) {
      parts.push('');
      continue;
    }
    if (element.openSeams.length > 0) {
      return null;
    }
    if (element.value.kind === 'undefined' || element.value.kind === 'null') {
      parts.push('');
      continue;
    }
    const text = stringCoercionText(element.value);
    if (text == null) {
      return null;
    }
    parts.push(text);
  }
  return parts.join(separator);
}

/** Concatenates evaluator-local Array values using native Array.concat one-level array argument spreading. */
export function evaluationArrayConcat(
  receiver: EvaluationArrayValue,
  argumentValues: readonly EvaluationArrayElement[],
  argumentShape: EvaluationArrayShape,
  node: ts.Expression | null,
): EvaluationArrayValue {
  const elements: EvaluationArrayElement[] = [...receiver.elements];
  let exactLength = receiver.exactLength;
  let hasExactElements = !receiver.mayHaveUnknownElements && argumentShape.hasExactElements;
  let hasExactOrder = !receiver.mayHaveUnknownOrder && argumentShape.hasExactOrder;
  const uncertainties: EvaluationArrayUncertainty[] = [...receiver.uncertainties];
  const extentOpenSeams: EvaluationOpenSeam[] = [
    ...receiver.extentOpenSeams,
    ...argumentShape.extentOpenSeams,
  ];
  const elementOpenSeams: EvaluationOpenSeam[] = [
    ...receiver.elementOpenSeams,
    ...argumentShape.elementOpenSeams,
  ];
  const orderOpenSeams: EvaluationOpenSeam[] = [
    ...receiver.orderOpenSeams,
    ...argumentShape.orderOpenSeams,
  ];
  if (argumentShape.exactLength == null) {
    exactLength = null;
  }
  for (const argument of argumentValues) {
    if (argument.openSeams.length > 0) {
      elements.push(argument.withRuntimeIndex(null));
      exactLength = null;
      hasExactElements = false;
      extentOpenSeams.push(...argument.openSeams);
      elementOpenSeams.push(...argument.openSeams);
    } else if (argument.value.kind === 'array') {
      const offset = exactLength;
      elements.push(...argument.value.elements.map((element) => element.withRuntimeIndex(
        offset == null || element.runtimeIndex == null ? null : offset + element.runtimeIndex,
      )));
      exactLength = exactLength == null || argument.value.exactLength == null
        ? null
        : exactLength + argument.value.exactLength;
      hasExactElements &&= !argument.value.mayHaveUnknownElements;
      hasExactOrder &&= !argument.value.mayHaveUnknownOrder;
      uncertainties.push(...argument.value.uncertainties);
      extentOpenSeams.push(...argument.value.extentOpenSeams);
      elementOpenSeams.push(...argument.value.elementOpenSeams);
      orderOpenSeams.push(...argument.value.orderOpenSeams);
    } else {
      elements.push(argument.withRuntimeIndex(exactLength));
      exactLength = exactLength == null ? null : exactLength + 1;
    }
  }
  return new EvaluationArrayValue(
    elements,
    node,
    EvaluationArrayShape.from({
      exactLength,
      hasExactElements,
      hasExactOrder,
      uncertainties: mergeEvaluationArrayUncertainties(uncertainties),
      extentOpenSeams,
      elementOpenSeams,
      orderOpenSeams,
    }),
  );
}

/** Slices an evaluator-local Array while preserving unknown membership/order metadata. */
export function evaluationArraySlice(
  receiver: EvaluationArrayValue,
  start: number,
  end: number,
  node: ts.Expression | null,
): EvaluationArrayValue {
  if (!evaluationArrayHasExactPositions(receiver) || receiver.exactLength == null) {
    return new EvaluationArrayValue(
      [],
      node,
      EvaluationArrayShape.from({
        exactLength: null,
        hasExactElements: false,
        hasExactOrder: false,
        uncertainties: receiver.uncertainties,
        extentOpenSeams: receiver.aggregateOpenSeams,
        elementOpenSeams: receiver.aggregateOpenSeams,
        orderOpenSeams: receiver.aggregateOpenSeams,
      }),
    );
  }
  const elements = receiver.elements
    .filter((element) => element.runtimeIndex! >= start && element.runtimeIndex! < end)
    .map((element) => element.withRuntimeIndex(element.runtimeIndex! - start));
  return new EvaluationArrayValue(
    elements,
    node,
    EvaluationArrayShape.exact(Math.max(0, end - start)),
  );
}

/** Flattens present slots while retaining the axes that prevent native hole-skipping semantics from closing. */
function flattenEvaluationArray(
  receiver: EvaluationArrayValue,
  depth: number,
): {
  readonly elements: readonly EvaluationArrayElement[];
  readonly hasExactElements: boolean;
  readonly hasExactOrder: boolean;
  readonly uncertainties: readonly EvaluationArrayUncertainty[];
  readonly extentOpenSeams: readonly EvaluationOpenSeam[];
  readonly elementOpenSeams: readonly EvaluationOpenSeam[];
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];
} {
  const flattened: EvaluationArrayElement[] = [];
  let hasExactElements = !receiver.mayHaveUnknownElements;
  let hasExactOrder = !receiver.mayHaveUnknownOrder;
  const uncertainties: EvaluationArrayUncertainty[] = [...receiver.uncertainties];
  const extentOpenSeams: EvaluationOpenSeam[] = [...receiver.extentOpenSeams, ...receiver.elementOpenSeams];
  const elementOpenSeams: EvaluationOpenSeam[] = [...receiver.elementOpenSeams];
  const orderOpenSeams: EvaluationOpenSeam[] = [...receiver.orderOpenSeams];
  for (const element of receiver.elements) {
    if (depth > 0 && element.openSeams.length > 0) {
      // The candidate remains useful evidence, but it cannot decide whether native flat treats this slot as an array.
      flattened.push(element.withRuntimeIndex(null));
      hasExactElements = false;
      hasExactOrder = false;
      extentOpenSeams.push(...element.openSeams);
      elementOpenSeams.push(...element.openSeams);
      orderOpenSeams.push(...element.openSeams);
      continue;
    }
    if (depth > 0 && element.value.kind === 'array') {
      const child = flattenEvaluationArray(element.value, depth - 1);
      flattened.push(...child.elements.map((childElement) => new EvaluationArrayElement(
        childElement.value,
        childElement.expression,
        [...element.openSeams, ...childElement.openSeams],
      )));
      hasExactElements &&= element.openSeams.length === 0 && child.hasExactElements;
      hasExactOrder &&= element.openSeams.length === 0 && child.hasExactOrder;
      uncertainties.push(...mergeEvaluationArrayUncertainties(element.value, child.uncertainties));
      elementOpenSeams.push(...element.openSeams, ...element.value.elementOpenSeams, ...child.elementOpenSeams);
      extentOpenSeams.push(...element.openSeams, ...element.value.extentOpenSeams, ...child.extentOpenSeams);
      orderOpenSeams.push(...element.openSeams, ...element.value.orderOpenSeams, ...child.orderOpenSeams);
      continue;
    }
    flattened.push(element.withRuntimeIndex(null));
  }
  return {
    elements: rebaseEvaluationArrayElements(flattened),
    hasExactElements,
    hasExactOrder,
    uncertainties: mergeEvaluationArrayUncertainties(uncertainties),
    extentOpenSeams,
    elementOpenSeams,
    orderOpenSeams,
  };
}

/** Flattens an evaluator-local Array while preserving receiver unknown metadata. */
export function evaluationArrayFlat(
  receiver: EvaluationArrayValue,
  depth: number,
  node: ts.Expression | null,
): EvaluationArrayValue {
  const flattened = flattenEvaluationArray(receiver, depth);
  return new EvaluationArrayValue(
    flattened.elements,
    node,
    EvaluationArrayShape.from({
      exactLength: flattened.hasExactElements ? flattened.elements.length : null,
      hasExactElements: flattened.hasExactElements,
      hasExactOrder: flattened.hasExactOrder,
      uncertainties: flattened.uncertainties,
      extentOpenSeams: flattened.extentOpenSeams,
      elementOpenSeams: flattened.elementOpenSeams,
      orderOpenSeams: flattened.orderOpenSeams,
    }),
  );
}

/** Reverses an evaluator-local Array without mutating the receiver. */
export function evaluationArrayToReversed(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
): EvaluationArrayValue {
  const dense = denseEvaluationArrayElements(receiver);
  if (dense != null) {
    return new EvaluationArrayValue(
      rebaseEvaluationArrayElements(dense.reverse()),
      node,
      EvaluationArrayShape.exact(dense.length),
    );
  }
  const iterable = evaluationArrayIteratorElements(receiver);
  if (iterable == null) {
    return new EvaluationArrayValue([], node, receiver.shape.withUnknownOrder(receiver.aggregateOpenSeams));
  }
  return new EvaluationArrayValue(
    iterable.reverse(),
    node,
    receiver.shape,
  );
}

/** Returns an evaluator-local Array copy with native Array.toSpliced element replacement semantics. */
export function evaluationArrayToSpliced(
  receiver: EvaluationArrayValue,
  start: number,
  deleteCount: number,
  inserted: readonly EvaluationArrayElement[],
  insertedShape: EvaluationArrayShape,
  node: ts.Expression | null,
): EvaluationArrayValue {
  const dense = denseEvaluationArrayElements(receiver);
  if (dense == null) {
    return new EvaluationArrayValue([], node, receiver.shape.withUnknownElements(receiver.aggregateOpenSeams));
  }
  const elements = dense;
  elements.splice(start, deleteCount, ...inserted);
  const exactLength = receiver.exactLength == null || insertedShape.exactLength == null
    ? null
    : receiver.exactLength - deleteCount + insertedShape.exactLength;
  const hasExactElements = insertedShape.hasExactElements && exactLength != null;
  const hasExactOrder = insertedShape.hasExactOrder;
  return new EvaluationArrayValue(
    rebaseEvaluationArrayElements(elements),
    node,
    EvaluationArrayShape.from({
      exactLength,
      hasExactElements,
      hasExactOrder,
      uncertainties: receiver.uncertainties,
      extentOpenSeams: [...receiver.extentOpenSeams, ...insertedShape.extentOpenSeams],
      elementOpenSeams: [...receiver.elementOpenSeams, ...insertedShape.elementOpenSeams],
      orderOpenSeams: [...receiver.orderOpenSeams, ...insertedShape.orderOpenSeams],
    }),
  );
}

/** Returns an evaluator-local Array copy with native Array.with element replacement semantics. */
export function evaluationArrayWith(
  receiver: EvaluationArrayValue,
  index: number,
  value: EvaluationArrayElement,
  node: ts.Expression | null,
): EvaluationArrayValue {
  const elements = denseEvaluationArrayElements(receiver);
  if (elements == null) {
    return new EvaluationArrayValue([], node, receiver.shape.withUnknownElements(receiver.aggregateOpenSeams));
  }
  elements[index] = value.withRuntimeIndex(index);
  return new EvaluationArrayValue(
    elements,
    node,
    EvaluationArrayShape.exact(elements.length),
  );
}

export interface EvaluationArraySpliceResult {
  readonly remaining: readonly EvaluationArrayElement[];
  readonly removed: readonly EvaluationArrayElement[];
  readonly remainingShape: EvaluationArrayShape;
  readonly removedShape: EvaluationArrayShape;
}

/** Native sparse-preserving splice transform over exact positions. */
export function evaluationArraySplice(
  receiver: EvaluationArrayValue,
  start: number,
  deleteCount: number,
  inserted: readonly EvaluationArrayElement[],
  insertedShape: EvaluationArrayShape,
): EvaluationArraySpliceResult | null {
  if (
    !evaluationArrayHasExactPositions(receiver)
    || receiver.exactLength == null
    || !insertedShape.hasExactPositions
    || insertedShape.exactLength == null
  ) {
    return null;
  }
  const delta = insertedShape.exactLength - deleteCount;
  const before = receiver.elements.filter((element) => element.runtimeIndex! < start);
  const removed = receiver.elements
    .filter((element) => element.runtimeIndex! >= start && element.runtimeIndex! < start + deleteCount)
    .map((element) => element.withRuntimeIndex(element.runtimeIndex! - start));
  const insertion = shiftEvaluationArrayElementIndices(inserted, start);
  const after = receiver.elements
    .filter((element) => element.runtimeIndex! >= start + deleteCount)
    .map((element) => element.withRuntimeIndex(element.runtimeIndex! + delta));
  return {
    remaining: [...before, ...insertion, ...after],
    removed,
    remainingShape: EvaluationArrayShape.exact(receiver.exactLength + delta),
    removedShape: EvaluationArrayShape.exact(deleteCount),
  };
}

/** Sorts evaluator-local Array elements with stable fallback ordering and explicit unknown-order metadata. */
export function evaluationArraySortedElements(
  elements: readonly EvaluationArrayElement[],
  compare: (left: EvaluationArrayElement, right: EvaluationArrayElement) => number | null,
): EvaluationArraySortResult {
  let mayHaveUnknownOrder = false;
  const undefinedElements = elements.filter((element) => element.value.kind === 'undefined');
  const decorated = elements
    .map((element, index) => ({ element, index }))
    .filter((entry) => entry.element.value.kind !== 'undefined');
  decorated.sort((left, right) => {
    const result = compare(left.element, right.element);
    if (result == null || Number.isNaN(result)) {
      mayHaveUnknownOrder = true;
      return left.index - right.index;
    }
    return result === 0
      ? left.index - right.index
      : result;
  });
  return {
    elements: [...decorated.map((entry) => entry.element), ...undefinedElements],
    mayHaveUnknownOrder,
  };
}

/** Native Array.sort default comparison over evaluator-local primitive/string-coercible values. */
export function defaultEvaluationArraySortCompare(
  left: EvaluationArrayElement,
  right: EvaluationArrayElement,
): number | null {
  const leftText = stringCoercionText(left.value);
  const rightText = stringCoercionText(right.value);
  return leftText == null || rightText == null
    ? null
    : leftText < rightText
      ? -1
      : leftText > rightText
        ? 1
        : 0;
}
