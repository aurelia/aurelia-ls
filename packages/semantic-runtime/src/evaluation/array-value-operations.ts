import type ts from 'typescript';

import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  type EvaluationValue,
} from './values.js';
import { stringCoercionText } from './value-coercion.js';

export interface EvaluationArraySortResult {
  readonly elements: readonly EvaluationArrayElement[];
  readonly mayHaveUnknownOrder: boolean;
}

/** Concatenates evaluator-local Array values using native Array.concat one-level array argument spreading. */
export function evaluationArrayConcat(
  receiver: EvaluationArrayValue,
  argumentValues: readonly EvaluationValue[],
  node: ts.Expression | null,
): EvaluationArrayValue {
  const elements: EvaluationArrayElement[] = [...receiver.elements];
  let mayHaveUnknownElements = receiver.mayHaveUnknownElements;
  let mayHaveUnknownOrder = receiver.mayHaveUnknownOrder;
  for (const value of argumentValues) {
    if (value.kind === 'array') {
      elements.push(...value.elements);
      mayHaveUnknownElements ||= value.mayHaveUnknownElements;
      mayHaveUnknownOrder ||= value.mayHaveUnknownOrder;
    } else {
      elements.push(new EvaluationArrayElement(value, node));
    }
  }
  return new EvaluationArrayValue(elements, mayHaveUnknownElements, node, mayHaveUnknownOrder);
}

/** Slices an evaluator-local Array while preserving unknown membership/order metadata. */
export function evaluationArraySlice(
  receiver: EvaluationArrayValue,
  start: number,
  end: number,
  node: ts.Expression | null,
): EvaluationArrayValue {
  return new EvaluationArrayValue(
    receiver.elements.slice(start, end),
    receiver.mayHaveUnknownElements,
    node,
    receiver.mayHaveUnknownOrder,
  );
}

/** Flattens evaluator-local Array elements with native Array.flat depth semantics over known nested arrays. */
export function flattenEvaluationArrayElements(
  elements: readonly EvaluationArrayElement[],
  depth: number,
): { readonly elements: readonly EvaluationArrayElement[]; readonly mayHaveUnknownElements: boolean } {
  const flattened: EvaluationArrayElement[] = [];
  let mayHaveUnknownElements = false;
  for (const element of elements) {
    if (depth > 0 && element.value.kind === 'array') {
      const child = flattenEvaluationArrayElements(element.value.elements, depth - 1);
      flattened.push(...child.elements);
      mayHaveUnknownElements ||= element.value.mayHaveUnknownElements || child.mayHaveUnknownElements;
      continue;
    }
    flattened.push(element);
  }
  return { elements: flattened, mayHaveUnknownElements };
}

/** Flattens an evaluator-local Array while preserving receiver unknown metadata. */
export function evaluationArrayFlat(
  receiver: EvaluationArrayValue,
  depth: number,
  node: ts.Expression | null,
): EvaluationArrayValue {
  const flattened = flattenEvaluationArrayElements(receiver.elements, depth);
  return new EvaluationArrayValue(
    flattened.elements,
    receiver.mayHaveUnknownElements || flattened.mayHaveUnknownElements,
    node,
    receiver.mayHaveUnknownOrder,
  );
}

/** Reverses an evaluator-local Array without mutating the receiver. */
export function evaluationArrayToReversed(
  receiver: EvaluationArrayValue,
  node: ts.Expression | null,
): EvaluationArrayValue {
  return new EvaluationArrayValue(
    receiver.elements.slice().reverse(),
    receiver.mayHaveUnknownElements,
    node,
    receiver.mayHaveUnknownOrder || receiver.mayHaveUnknownElements,
  );
}

/** Returns an evaluator-local Array copy with native Array.toSpliced element replacement semantics. */
export function evaluationArrayToSpliced(
  receiver: EvaluationArrayValue,
  start: number,
  deleteCount: number,
  inserted: readonly EvaluationArrayElement[],
  insertedMayHaveUnknownElements: boolean,
  insertedMayHaveUnknownOrder: boolean,
  node: ts.Expression | null,
): EvaluationArrayValue {
  const elements = receiver.elements.slice();
  elements.splice(start, deleteCount, ...inserted);
  return new EvaluationArrayValue(
    elements,
    receiver.mayHaveUnknownElements || insertedMayHaveUnknownElements,
    node,
    receiver.mayHaveUnknownOrder || insertedMayHaveUnknownOrder,
  );
}

/** Returns an evaluator-local Array copy with native Array.with element replacement semantics. */
export function evaluationArrayWith(
  receiver: EvaluationArrayValue,
  index: number,
  value: EvaluationValue,
  node: ts.Expression | null,
): EvaluationArrayValue {
  const elements = receiver.elements.slice();
  elements[index] = new EvaluationArrayElement(value, node);
  return new EvaluationArrayValue(
    elements,
    receiver.mayHaveUnknownElements,
    node,
    receiver.mayHaveUnknownOrder,
  );
}

/** Sorts evaluator-local Array elements with stable fallback ordering and explicit unknown-order metadata. */
export function evaluationArraySortedElements(
  elements: readonly EvaluationArrayElement[],
  compare: (left: EvaluationArrayElement, right: EvaluationArrayElement) => number | null,
): EvaluationArraySortResult {
  let mayHaveUnknownOrder = false;
  const decorated = elements.map((element, index) => ({ element, index }));
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
    elements: decorated.map((entry) => entry.element),
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
    : leftText.localeCompare(rightText);
}
