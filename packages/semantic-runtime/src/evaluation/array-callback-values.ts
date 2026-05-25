import type ts from 'typescript';

import {
  EvaluationArrayValue,
  EvaluationNumberValue,
  type EvaluationArrayElement,
  type EvaluationValue,
} from './values.js';

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
