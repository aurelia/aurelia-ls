import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
import {
  evaluationArrayElementsInIterationOrder,
  evaluationArrayIterationCallbackArguments,
  evaluationArrayReducerCallbackArguments,
} from '../array-callback-values.js';
import {
  evaluationArrayConcat,
  evaluationArrayFlat,
  evaluationArraySlice,
  evaluationArraySortedElements,
  evaluationArrayToSpliced,
  evaluationArrayToReversed,
  evaluationArrayWith,
  defaultEvaluationArraySortCompare,
} from '../array-value-operations.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  evaluationValuesEqual,
  readEvaluationTruthiness,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import {
  arrayCallbackValue,
  boundaryIntrinsicCallValue,
  evaluateCallArgumentValues,
  IntrinsicCallbackEvaluationKind,
  IntrinsicCallbackFrame,
  isBoundaryEvaluationValue,
  readArrayStartIndex,
  readArraySpliceDeleteCount,
  readArrayWithIndex,
  readSliceRange,
  stringCoercionText,
} from './shared.js';
import { readArrayLastIndexStart } from '../value-coercion.js';
import { evaluateStringPredicateFromReceiver } from './string-intrinsics.js';

export function evaluateArrayConstructor(
  expression: ts.NewExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const args = expression.arguments ?? [];
  if (args.length !== 1) {
    return new EvaluationArrayValue(
      args.map((argument) => new EvaluationArrayElement(
        host.evaluateExpression(argument, environment, moduleKey, depth + 1),
        argument,
      )),
      false,
      expression,
    );
  }

  const lengthValue = host.evaluateExpression(args[0]!, environment, moduleKey, depth + 1);
  if (lengthValue.kind !== EvaluationValueKind.Number) {
    return new EvaluationArrayValue([], true, expression);
  }
  const length = Math.max(0, Math.min(1_000, Math.trunc(lengthValue.value)));
  return new EvaluationArrayValue(
    Array.from({ length }, () => new EvaluationArrayElement(EvaluationUndefined, args[0]!)),
    length !== lengthValue.value || lengthValue.value > 1_000,
    expression,
  );
}

export function evaluateArrayConcat(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'concat', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.concat receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return evaluationArrayConcat(
    receiver,
    evaluateCallArgumentValues(call, environment, moduleKey, depth + 1, host),
    call,
  );
}

export function evaluateArrayFrom(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const source = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(source)) {
    return boundaryIntrinsicCallValue(source, 'Array.from', call);
  }
  const sourceElements = arrayFromSourceElements(source, call);
  if (sourceElements == null) {
    return host.unknown('Array.from source did not reduce to a known iterable or array-like value.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (call.arguments[1] == null) {
    return new EvaluationArrayValue(
      sourceElements.elements,
      sourceElements.mayHaveUnknownElements,
      call,
      sourceElements.mayHaveUnknownOrder,
    );
  }
  if (ts.isSpreadElement(call.arguments[1])) {
    return host.unknown('Array.from map function was provided through a spread argument.', call.arguments[1], moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const mapper = host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1);
  if (mapper.kind !== EvaluationValueKind.Function) {
    return host.unknown('Array.from map function did not reduce to a known function.', call.arguments[1], moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  const elements: EvaluationArrayElement[] = [];
  for (let index = 0; index < sourceElements.elements.length; index++) {
    const element = sourceElements.elements[index];
    if (element == null) {
      continue;
    }
    const mapped = callbackFrame.evaluate(
      mapper,
      [
        element.value,
        new EvaluationNumberValue(index, call),
      ],
    );
    if (mapped.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return new EvaluationArrayValue([], true, call, true);
    }
    elements.push(new EvaluationArrayElement(mapped.value, element.expression));
  }
  return new EvaluationArrayValue(
    elements,
    sourceElements.mayHaveUnknownElements,
    call,
    sourceElements.mayHaveUnknownOrder,
  );
}

export function arrayFromSourceElements(
  source: EvaluationValue,
  node: ts.Node,
): { readonly elements: readonly EvaluationArrayElement[]; readonly mayHaveUnknownElements: boolean; readonly mayHaveUnknownOrder: boolean } | null {
  switch (source.kind) {
    case EvaluationValueKind.Array:
      return {
        elements: source.elements,
        mayHaveUnknownElements: source.mayHaveUnknownElements,
        mayHaveUnknownOrder: source.mayHaveUnknownOrder,
      };
    case EvaluationValueKind.Set:
      return {
        elements: source.elements,
        mayHaveUnknownElements: source.mayHaveUnknownElements,
        mayHaveUnknownOrder: false,
      };
    case EvaluationValueKind.Map:
      return {
        elements: source.entries.map((entry) =>
          new EvaluationArrayElement(
            new EvaluationArrayValue([
              new EvaluationArrayElement(entry.key, entry.expression),
              new EvaluationArrayElement(entry.value, entry.expression),
            ], false, node),
            entry.expression,
          )
        ),
        mayHaveUnknownElements: source.mayHaveUnknownEntries,
        mayHaveUnknownOrder: false,
      };
    case EvaluationValueKind.String:
      return {
        elements: [...source.value].map((character) =>
          new EvaluationArrayElement(new EvaluationStringValue(character, node), null)
        ),
        mayHaveUnknownElements: false,
        mayHaveUnknownOrder: false,
      };
    default:
      return null;
  }
}

export function evaluateArrayMap(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'map', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.map receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const callback = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, 'Array.map callback');
  if (callback.kind !== 'known') {
    return callback.value;
  }

  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  const elements: EvaluationArrayElement[] = [];
  for (let index = 0; index < receiver.elements.length; index++) {
    const element = receiver.elements[index];
    if (element == null) {
      continue;
    }
    const mapped = callbackFrame.evaluate(
      callback.value,
      evaluationArrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (mapped.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return new EvaluationArrayValue([], true, call, true);
    }
    elements.push(new EvaluationArrayElement(mapped.value, element.expression));
  }
  return new EvaluationArrayValue(elements, receiver.mayHaveUnknownElements, call, receiver.mayHaveUnknownOrder);
}

export function evaluateArrayFlatMap(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'flatMap', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.flatMap receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const callback = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, 'Array.flatMap callback');
  if (callback.kind !== 'known') {
    return callback.value;
  }
  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  const elements: EvaluationArrayElement[] = [];
  let mayHaveUnknownElements = receiver.mayHaveUnknownElements;
  for (let index = 0; index < receiver.elements.length; index++) {
    const element = receiver.elements[index];
    if (element == null) {
      continue;
    }
    const mapped = callbackFrame.evaluate(
      callback.value,
      evaluationArrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (mapped.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return new EvaluationArrayValue([], true, call, true);
    }
    if (mapped.value.kind === EvaluationValueKind.Array) {
      elements.push(...mapped.value.elements);
      mayHaveUnknownElements ||= mapped.value.mayHaveUnknownElements;
      continue;
    }
    elements.push(new EvaluationArrayElement(mapped.value, element.expression));
  }
  return new EvaluationArrayValue(elements, mayHaveUnknownElements, call, receiver.mayHaveUnknownOrder);
}

export function evaluateArrayFilter(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'filter', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.filter receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const predicate = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, 'Array.filter predicate');
  if (predicate.kind !== 'known') {
    return predicate.value;
  }

  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  const elements: EvaluationArrayElement[] = [];
  let mayHaveUnknownElements = receiver.mayHaveUnknownElements;
  let mayHaveUnknownOrder = receiver.mayHaveUnknownOrder;
  for (let index = 0; index < receiver.elements.length; index++) {
    const element = receiver.elements[index];
    if (element == null) {
      continue;
    }
    const predicateResult = callbackFrame.evaluate(
      predicate.value,
      evaluationArrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (predicateResult.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return new EvaluationArrayValue([], true, call, true);
    }
    const keep = readEvaluationTruthiness(predicateResult.value);
    if (keep == null) {
      mayHaveUnknownElements = true;
      continue;
    }
    if (keep) {
      elements.push(element);
    }
  }
  return new EvaluationArrayValue(elements, mayHaveUnknownElements, call, mayHaveUnknownOrder);
}

export function evaluateArrayFind(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  rightToLeft: boolean,
): EvaluationValue {
  const intrinsicName = rightToLeft ? 'findLast' : 'find';
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, intrinsicName, call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown(`Array.${intrinsicName} receiver did not reduce to a known array.`, receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const predicate = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, `Array.${intrinsicName} predicate`);
  if (predicate.kind !== 'known') {
    return predicate.value;
  }
  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  let sawOpenPredicate = receiver.mayHaveUnknownElements;
  for (const { element, index } of evaluationArrayElementsInIterationOrder(receiver, rightToLeft)) {
    if (element == null) {
      continue;
    }
    const predicateResult = callbackFrame.evaluate(
      predicate.value,
      evaluationArrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (predicateResult.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return host.unknown(`Array.${intrinsicName} exceeded intrinsic callback budget.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    const keep = readEvaluationTruthiness(predicateResult.value);
    if (keep == null) {
      sawOpenPredicate = true;
      continue;
    }
    if (keep) {
      return element.value;
    }
  }
  return sawOpenPredicate
    ? host.unknown(`Array.${intrinsicName} result depended on an open predicate or unknown element membership.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : EvaluationUndefined;
}

export function evaluateArrayFindIndex(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  rightToLeft: boolean,
): EvaluationValue {
  const intrinsicName = rightToLeft ? 'findLastIndex' : 'findIndex';
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, intrinsicName, call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown(`Array.${intrinsicName} receiver did not reduce to a known array.`, receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const predicate = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, `Array.${intrinsicName} predicate`);
  if (predicate.kind !== 'known') {
    return predicate.value;
  }
  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  let sawOpenPredicate = receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder;
  for (const { element, index } of evaluationArrayElementsInIterationOrder(receiver, rightToLeft)) {
    if (element == null) {
      continue;
    }
    const predicateResult = callbackFrame.evaluate(
      predicate.value,
      evaluationArrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (predicateResult.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return host.unknown(`Array.${intrinsicName} exceeded intrinsic callback budget.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    const keep = readEvaluationTruthiness(predicateResult.value);
    if (keep == null) {
      sawOpenPredicate = true;
      continue;
    }
    if (keep) {
      return new EvaluationNumberValue(index, call);
    }
  }
  return sawOpenPredicate
    ? host.unknown(`Array.${intrinsicName} result depended on an open predicate, unknown order, or unknown membership.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationNumberValue(-1, call);
}

export function evaluateArraySome(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateArrayQuantifier(call, receiverExpression, environment, moduleKey, depth, host, 'some');
}

export function evaluateArrayEvery(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateArrayQuantifier(call, receiverExpression, environment, moduleKey, depth, host, 'every');
}

export function evaluateArrayQuantifier(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  kind: 'some' | 'every',
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, kind, call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown(`Array.${kind} receiver did not reduce to a known array.`, receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const predicate = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, `Array.${kind} predicate`);
  if (predicate.kind !== 'known') {
    return predicate.value;
  }
  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  let sawOpenPredicate = receiver.mayHaveUnknownElements;
  for (let index = 0; index < receiver.elements.length; index++) {
    const element = receiver.elements[index];
    if (element == null) {
      continue;
    }
    const predicateResult = callbackFrame.evaluate(
      predicate.value,
      evaluationArrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (predicateResult.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return host.unknown(`Array.${kind} exceeded intrinsic callback budget.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    const keep = readEvaluationTruthiness(predicateResult.value);
    if (keep == null) {
      sawOpenPredicate = true;
      continue;
    }
    if (kind === 'some' && keep) {
      return new EvaluationBooleanValue(true, call);
    }
    if (kind === 'every' && !keep) {
      return new EvaluationBooleanValue(false, call);
    }
  }
  if (sawOpenPredicate) {
    return host.unknown(`Array.${kind} result depended on an open predicate or unknown element membership.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return new EvaluationBooleanValue(kind === 'every', call);
}

export function evaluateArrayForEach(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'forEach', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.forEach receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const callback = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, 'Array.forEach callback');
  if (callback.kind !== 'known') {
    return callback.value;
  }
  if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
    return host.unknown('Array.forEach receiver has unknown membership or order.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  for (let index = 0; index < receiver.elements.length; index++) {
    const element = receiver.elements[index];
    if (element == null) {
      continue;
    }
    const result = callbackFrame.evaluate(
      callback.value,
      evaluationArrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (result.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return host.unknown('Array.forEach exceeded intrinsic callback budget.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
  }
  return EvaluationUndefined;
}

export function evaluateArrayReduce(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  rightToLeft: boolean,
): EvaluationValue {
  const intrinsicName = rightToLeft ? 'reduceRight' : 'reduce';
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, intrinsicName, call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown(`Array.${intrinsicName} receiver did not reduce to a known array.`, receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const reducer = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, `Array.${intrinsicName} reducer`);
  if (reducer.kind !== 'known') {
    return reducer.value;
  }
  const ordered = rightToLeft
    ? receiver.elements.slice().reverse()
    : receiver.elements;
  let accumulator: EvaluationValue;
  let start = 0;
  if (call.arguments[1] == null) {
    const first = ordered[0];
    if (first == null) {
      return host.unknown(`Array.${intrinsicName} had no initial value and no known first element.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    accumulator = first.value;
    start = 1;
  } else {
    accumulator = host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1);
  }

  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  for (let position = start; position < ordered.length; position++) {
    const element = ordered[position];
    if (element == null) {
      continue;
    }
    const originalIndex = rightToLeft
      ? receiver.elements.length - position - 1
      : position;
    const result = callbackFrame.evaluate(
      reducer.value,
      evaluationArrayReducerCallbackArguments(accumulator, element, originalIndex, receiver, call),
    );
    if (result.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return host.unknown(`Array.${intrinsicName} exceeded intrinsic callback budget.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    accumulator = result.value;
  }
  if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
    return host.unknown(`Array.${intrinsicName} result depended on unknown element membership or order.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return accumulator;
}

export function evaluateArrayOrStringIncludes(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (receiver.kind === EvaluationValueKind.String) {
    return evaluateStringPredicateFromReceiver(call, receiver, environment, moduleKey, depth + 1, host, 'includes');
  }
  return evaluateArrayIncludesFromReceiver(call, receiver, environment, moduleKey, depth + 1, host);
}

export function evaluateArrayIncludesFromReceiver(
  call: ts.CallExpression,
  receiver: EvaluationValue,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'includes', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.includes receiver did not reduce to a known array.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const search = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (search.kind === EvaluationValueKind.Unknown) {
    return search;
  }
  const startIndex = call.arguments[1] == null
    ? 0
    : readArrayStartIndex(host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1), receiver.elements.length);
  if (startIndex == null || receiver.mayHaveUnknownOrder) {
    return host.unknown('Array.includes start index or element order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const found = receiver.elements
    .slice(startIndex)
    .some((element) => evaluationValuesEqual(element.value, search));
  return found || !receiver.mayHaveUnknownElements
    ? new EvaluationBooleanValue(found, call)
    : host.unknown('Array.includes search did not match known elements and the array may contain unknown elements.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
}

export function evaluateArrayIndexOf(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  rightToLeft: boolean,
): EvaluationValue {
  const intrinsicName = rightToLeft ? 'lastIndexOf' : 'indexOf';
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, intrinsicName, call);
  }
  if (receiver.kind !== EvaluationValueKind.Array && receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`${intrinsicName} receiver did not reduce to a known array or string.`, receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const search = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  const receiverLength = receiver.kind === EvaluationValueKind.String ? receiver.value.length : receiver.elements.length;
  const start = rightToLeft
    ? readArrayLastIndexStart(call.arguments[1] == null
      ? EvaluationUndefined
      : host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1), receiverLength)
    : call.arguments[1] == null
      ? 0
      : readArrayStartIndex(
        host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1),
        receiverLength,
      );
  if (start == null) {
    return host.unknown(`${intrinsicName} start index did not close statically.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (receiver.kind === EvaluationValueKind.String) {
    const searchText = stringCoercionText(search);
    return searchText == null
      ? host.unknown(`String.${intrinsicName} search value did not reduce to a static string.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
      : new EvaluationNumberValue(rightToLeft
        ? receiver.value.lastIndexOf(searchText, start)
        : receiver.value.indexOf(searchText, start), call);
  }
  if (search.kind === EvaluationValueKind.Unknown) {
    return search;
  }
  if (receiver.mayHaveUnknownOrder) {
    return host.unknown(`Array.${intrinsicName} depended on unknown element order.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const foundIndex = rightToLeft
    ? receiver.elements.slice(0, start + 1).findLastIndex((element) => evaluationValuesEqual(element.value, search))
    : receiver.elements.slice(start).findIndex((element) => evaluationValuesEqual(element.value, search));
  if (foundIndex >= 0) {
    return new EvaluationNumberValue(rightToLeft ? foundIndex : start + foundIndex, call);
  }
  return receiver.mayHaveUnknownElements
    ? host.unknown(`Array.${intrinsicName} search did not match known elements and the array may contain unknown elements.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationNumberValue(-1, call);
}

export function evaluateArrayJoin(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'join', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.join receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
    return host.unknown('Array.join receiver has unknown membership or order.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const separator = call.arguments[0] == null
    ? ','
    : stringCoercionText(host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1));
  if (separator == null) {
    return host.unknown('Array.join separator did not reduce to a static string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const parts: string[] = [];
  for (const element of receiver.elements) {
    const value = element.value;
    if (value.kind === EvaluationValueKind.Undefined || value.kind === EvaluationValueKind.Null) {
      parts.push('');
      continue;
    }
    const text = stringCoercionText(value);
    if (text == null) {
      return host.unknown('Array.join element did not reduce to a string-coercible primitive.', element.expression ?? call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    parts.push(text);
  }
  return new EvaluationStringValue(parts.join(separator), call);
}

export function evaluateArrayFlat(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'flat', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.flat receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const depthValue = call.arguments[0] == null
    ? new EvaluationNumberValue(1, call)
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (depthValue.kind !== EvaluationValueKind.Number || !Number.isFinite(depthValue.value)) {
    return host.unknown('Array.flat depth did not reduce to a finite number.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return evaluationArrayFlat(receiver, Math.max(0, Math.trunc(depthValue.value)), call);
}

export function evaluateArrayFill(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'fill', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.fill receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const value = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  const range = readSliceRange(call, receiver.elements.length, environment, moduleKey, depth + 1, host);
  if (range == null) {
    receiver.markUnknownElements();
    return receiver;
  }
  for (let index = range.start; index < range.end; index++) {
    receiver.elements[index] = new EvaluationArrayElement(value, call.arguments[0] ?? null);
  }
  return receiver;
}

export function evaluateArrayPush(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = evaluateArrayReceiverForMutation(call, receiverExpression, environment, moduleKey, depth + 1, host, 'push');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }

  const insert = evaluateArrayMutationElements(call.arguments, environment, moduleKey, depth + 1, host);
  receiver.value.elements.push(...insert.elements);
  applyArrayMutationUncertainty(receiver.value, insert);
  return receiver.value.mayHaveUnknownElements
    ? host.unknown('Array.push result length depended on unknown element membership.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationNumberValue(receiver.value.elements.length, call);
}

export function evaluateArrayUnshift(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = evaluateArrayReceiverForMutation(call, receiverExpression, environment, moduleKey, depth + 1, host, 'unshift');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }

  const insert = evaluateArrayMutationElements(call.arguments, environment, moduleKey, depth + 1, host);
  receiver.value.elements.splice(0, 0, ...insert.elements);
  applyArrayMutationUncertainty(receiver.value, insert);
  return receiver.value.mayHaveUnknownElements
    ? host.unknown('Array.unshift result length depended on unknown element membership.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationNumberValue(receiver.value.elements.length, call);
}

export function evaluateArrayPop(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = evaluateArrayReceiverForMutation(call, receiverExpression, environment, moduleKey, depth + 1, host, 'pop');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }
  if (!hasExactArrayMutationOrder(receiver.value)) {
    return host.unknown('Array.pop receiver membership or order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return receiver.value.elements.pop()?.value ?? EvaluationUndefined;
}

export function evaluateArrayShift(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = evaluateArrayReceiverForMutation(call, receiverExpression, environment, moduleKey, depth + 1, host, 'shift');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }
  if (!hasExactArrayMutationOrder(receiver.value)) {
    return host.unknown('Array.shift receiver membership or order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return receiver.value.elements.shift()?.value ?? EvaluationUndefined;
}

export function evaluateArrayReverse(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = evaluateArrayReceiverForMutation(call, receiverExpression, environment, moduleKey, depth + 1, host, 'reverse');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }
  receiver.value.elements.reverse();
  receiver.value.mayHaveUnknownOrder ||= receiver.value.mayHaveUnknownElements;
  return receiver.value;
}

export function evaluateArrayToReversed(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'toReversed', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.toReversed receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return evaluationArrayToReversed(receiver, call);
}

export function evaluateArrayToSpliced(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'toSpliced', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.toSpliced receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const start = readSpliceStart(call, receiver.elements.length, environment, moduleKey, depth + 1, host);
  if (start == null) {
    return host.unknown('Array.toSpliced start index did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const deleteCount = readSpliceDeleteCount(call, start, receiver.elements.length, environment, moduleKey, depth + 1, host);
  if (deleteCount == null) {
    return host.unknown('Array.toSpliced delete count did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const inserted = evaluateArrayMutationElements(call.arguments.slice(2), environment, moduleKey, depth + 1, host);
  return evaluationArrayToSpliced(
    receiver,
    start,
    deleteCount,
    inserted.elements,
    inserted.mayHaveUnknownElements,
    inserted.mayHaveUnknownOrder,
    call,
  );
}

export function evaluateArrayWith(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'with', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.with receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const indexExpression = call.arguments[0];
  if (indexExpression != null && ts.isSpreadElement(indexExpression)) {
    return host.unknown('Array.with index did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const indexValue = indexExpression == null
    ? EvaluationUndefined
    : host.evaluateExpression(indexExpression, environment, moduleKey, depth + 1);
  const index = readArrayWithIndex(indexValue, receiver.elements.length);
  if (index == null) {
    return host.unknown('Array.with index did not close to an in-range index.', indexExpression ?? call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const valueExpression = call.arguments[1];
  const value = valueExpression == null || ts.isSpreadElement(valueExpression)
    ? EvaluationUndefined
    : host.evaluateExpression(valueExpression, environment, moduleKey, depth + 1);
  return evaluationArrayWith(receiver, index, value, call);
}

export function evaluateArraySplice(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = evaluateArrayReceiverForMutation(call, receiverExpression, environment, moduleKey, depth + 1, host, 'splice');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }
  if (!hasExactArrayMutationOrder(receiver.value)) {
    return host.unknown('Array.splice receiver membership or order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const start = readSpliceStart(call, receiver.value.elements.length, environment, moduleKey, depth + 1, host);
  if (start == null) {
    return host.unknown('Array.splice start index did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const deleteCount = readSpliceDeleteCount(call, start, receiver.value.elements.length, environment, moduleKey, depth + 1, host);
  if (deleteCount == null) {
    return host.unknown('Array.splice delete count did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  const insert = evaluateArrayMutationElements(call.arguments.slice(2), environment, moduleKey, depth + 1, host);
  const removed = receiver.value.elements.splice(start, deleteCount, ...insert.elements);
  applyArrayMutationUncertainty(receiver.value, insert);
  return new EvaluationArrayValue(removed, false, call);
}

function evaluateArrayReceiverForMutation(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  methodName: string,
): { readonly kind: 'known'; readonly value: EvaluationArrayValue } | { readonly kind: 'open'; readonly value: EvaluationValue } {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return { kind: 'open', value: boundaryIntrinsicCallValue(receiver, methodName, call) };
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return {
      kind: 'open',
      value: host.unknown(`Array.${methodName} receiver did not reduce to a known array.`, receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall),
    };
  }
  return { kind: 'known', value: receiver };
}

function evaluateArrayMutationElements(
  args: readonly ts.Expression[],
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): { readonly elements: readonly EvaluationArrayElement[]; readonly mayHaveUnknownElements: boolean; readonly mayHaveUnknownOrder: boolean } {
  const elements: EvaluationArrayElement[] = [];
  let mayHaveUnknownElements = false;
  let mayHaveUnknownOrder = false;
  for (const argument of args) {
    const expression = ts.isSpreadElement(argument)
      ? argument.expression
      : argument;
    const value = host.evaluateExpression(expression, environment, moduleKey, depth + 1);
    if (ts.isSpreadElement(argument)) {
      if (value.kind === EvaluationValueKind.Array) {
        elements.push(...value.elements);
        mayHaveUnknownElements ||= value.mayHaveUnknownElements;
        mayHaveUnknownOrder ||= value.mayHaveUnknownOrder;
      } else {
        mayHaveUnknownElements = true;
        mayHaveUnknownOrder = true;
      }
      continue;
    }
    elements.push(new EvaluationArrayElement(value, argument));
  }
  return { elements, mayHaveUnknownElements, mayHaveUnknownOrder };
}

function applyArrayMutationUncertainty(
  receiver: EvaluationArrayValue,
  mutation: { readonly mayHaveUnknownElements: boolean; readonly mayHaveUnknownOrder: boolean },
): void {
  if (mutation.mayHaveUnknownElements) {
    receiver.markUnknownElements();
  }
  receiver.mayHaveUnknownOrder ||= mutation.mayHaveUnknownOrder;
}

function hasExactArrayMutationOrder(receiver: EvaluationArrayValue): boolean {
  return !receiver.mayHaveUnknownElements && !receiver.mayHaveUnknownOrder;
}

function readSpliceStart(
  call: ts.CallExpression,
  length: number,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): number | null {
  const startExpression = call.arguments[0];
  if (startExpression == null) {
    return 0;
  }
  if (ts.isSpreadElement(startExpression)) {
    return null;
  }
  return readArrayStartIndex(host.evaluateExpression(startExpression, environment, moduleKey, depth + 1), length);
}

function readSpliceDeleteCount(
  call: ts.CallExpression,
  start: number,
  length: number,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): number | null {
  const deleteCountExpression = call.arguments[1];
  if (deleteCountExpression == null) {
    return call.arguments.length === 0
      ? 0
      : length - start;
  }
  if (ts.isSpreadElement(deleteCountExpression)) {
    return null;
  }
  const value = host.evaluateExpression(deleteCountExpression, environment, moduleKey, depth + 1);
  return readArraySpliceDeleteCount(value, start, length, call.arguments.length > 0, true);
}

export function evaluateArrayOrStringSlice(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'slice', call);
  }
  if (receiver.kind === EvaluationValueKind.Array) {
    const range = readSliceRange(call, receiver.elements.length, environment, moduleKey, depth + 1, host);
    return range == null
      ? new EvaluationArrayValue(receiver.elements, true, call, true)
      : evaluationArraySlice(receiver, range.start, range.end, call);
  }
  if (receiver.kind === EvaluationValueKind.String) {
    const range = readSliceRange(call, receiver.value.length, environment, moduleKey, depth + 1, host);
    return range == null
      ? host.unknown('String.slice bounds did not reduce to static numbers.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
      : new EvaluationStringValue(receiver.value.slice(range.start, range.end), call);
  }
  return host.unknown('slice receiver did not reduce to a known array or string.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
}

export function evaluateArrayIsArray(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const value = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  if (value.kind === EvaluationValueKind.Unknown) {
    return value;
  }
  if (isBoundaryEvaluationValue(value)) {
    return boundaryIntrinsicCallValue(value, 'Array.isArray', call);
  }
  return new EvaluationBooleanValue(value.kind === EvaluationValueKind.Array, call);
}

export function evaluateArraySort(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'sort', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.sort receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  const sorted = sortArrayElements(call, receiver.elements, environment, moduleKey, depth + 1, host);
  receiver.replaceElementOrder(sorted.elements, sorted.mayHaveUnknownOrder);
  return receiver;
}

export function evaluateArrayToSorted(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'toSorted', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.toSorted receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  const sorted = sortArrayElements(call, receiver.elements, environment, moduleKey, depth + 1, host);
  return new EvaluationArrayValue(
    sorted.elements,
    receiver.mayHaveUnknownElements,
    call,
    sorted.mayHaveUnknownOrder,
  );
}

export function sortArrayElements(
  call: ts.CallExpression,
  elements: readonly EvaluationArrayElement[],
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): {
  readonly elements: readonly EvaluationArrayElement[];
  readonly mayHaveUnknownOrder: boolean;
} {
  const compareExpression = call.arguments[0];
  if (compareExpression == null) {
    return evaluationArraySortedElements(elements, defaultEvaluationArraySortCompare);
  }

  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  const compareValue = host.evaluateExpression(compareExpression, environment, moduleKey, depth + 1);
  if (compareValue.kind !== EvaluationValueKind.Function) {
    callbackFrame.restore();
    return {
      elements,
      mayHaveUnknownOrder: true,
    };
  }

  const sorted = evaluationArraySortedElements(elements, (left, right) => {
    const result = callbackFrame.evaluate(
      compareValue,
      [left.value, right.value],
    );
    if (result.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      return null;
    }
    return result.value.kind === EvaluationValueKind.Number
      ? result.value.value
      : null;
  });
  if (sorted.mayHaveUnknownOrder) {
    callbackFrame.restore();
  }
  return sorted;
}

export function evaluateArrayOf(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return new EvaluationArrayValue(
    call.arguments.map((argument) => new EvaluationArrayElement(
      host.evaluateExpression(argument, environment, moduleKey, depth + 1),
      argument,
    )),
    false,
    call,
  );
}
