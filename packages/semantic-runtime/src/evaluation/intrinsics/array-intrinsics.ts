import ts from 'typescript';
import type { ModuleEnvironmentRecord } from '../environment.js';
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
  readSliceRange,
  stringCoercionText,
} from './shared.js';
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
  const elements: EvaluationArrayElement[] = [...receiver.elements];
  let mayHaveUnknownElements = receiver.mayHaveUnknownElements;
  let mayHaveUnknownOrder = receiver.mayHaveUnknownOrder;
  for (const value of evaluateCallArgumentValues(call, environment, moduleKey, depth + 1, host)) {
    if (value.kind === EvaluationValueKind.Array) {
      elements.push(...value.elements);
      mayHaveUnknownElements ||= value.mayHaveUnknownElements;
      mayHaveUnknownOrder ||= value.mayHaveUnknownOrder;
    } else {
      elements.push(new EvaluationArrayElement(value, call));
    }
  }
  return new EvaluationArrayValue(elements, mayHaveUnknownElements, call, mayHaveUnknownOrder);
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

function arrayIterationCallbackArguments(
  element: EvaluationArrayElement,
  index: number,
  receiver: EvaluationArrayValue,
  node: ts.Node,
): readonly EvaluationValue[] {
  return [
    element.value,
    new EvaluationNumberValue(index, node),
    receiver,
  ];
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
      arrayIterationCallbackArguments(element, index, receiver, call),
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
      arrayIterationCallbackArguments(element, index, receiver, call),
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
      arrayIterationCallbackArguments(element, index, receiver, call),
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
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'find', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.find receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const predicate = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, 'Array.find predicate');
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
      arrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (predicateResult.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return host.unknown('Array.find exceeded intrinsic callback budget.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
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
    ? host.unknown('Array.find result depended on an open predicate or unknown element membership.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : EvaluationUndefined;
}

export function evaluateArrayFindIndex(
  call: ts.CallExpression,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'findIndex', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.findIndex receiver did not reduce to a known array.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const predicate = arrayCallbackValue(call, environment, moduleKey, depth + 1, host, 'Array.findIndex predicate');
  if (predicate.kind !== 'known') {
    return predicate.value;
  }
  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  let sawOpenPredicate = receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder;
  for (let index = 0; index < receiver.elements.length; index++) {
    const element = receiver.elements[index];
    if (element == null) {
      continue;
    }
    const predicateResult = callbackFrame.evaluate(
      predicate.value,
      arrayIterationCallbackArguments(element, index, receiver, call),
    );
    if (predicateResult.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return host.unknown('Array.findIndex exceeded intrinsic callback budget.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
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
    ? host.unknown('Array.findIndex result depended on an open predicate, unknown order, or unknown membership.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
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
      arrayIterationCallbackArguments(element, index, receiver, call),
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
      arrayIterationCallbackArguments(element, index, receiver, call),
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
      [
        accumulator,
        element.value,
        new EvaluationNumberValue(originalIndex, call),
        receiver,
      ],
    );
    if (result.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      callbackFrame.restore();
      return host.unknown(`Array.${intrinsicName} exceeded intrinsic callback budget.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    accumulator = result.value;
  }
  if (receiver.mayHaveUnknownElements) {
    return host.unknown(`Array.${intrinsicName} result depended on unknown element membership.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
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
): EvaluationValue {
  const receiver = host.evaluateExpression(receiverExpression, environment, moduleKey, depth + 1);
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'indexOf', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array && receiver.kind !== EvaluationValueKind.String) {
    return host.unknown('indexOf receiver did not reduce to a known array or string.', receiverExpression, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const search = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  const start = call.arguments[1] == null
    ? 0
    : readArrayStartIndex(
      host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1),
      receiver.kind === EvaluationValueKind.String ? receiver.value.length : receiver.elements.length,
    );
  if (start == null) {
    return host.unknown('indexOf start index did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (receiver.kind === EvaluationValueKind.String) {
    const searchText = stringCoercionText(search);
    return searchText == null
      ? host.unknown('String.indexOf search value did not reduce to a static string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
      : new EvaluationNumberValue(receiver.value.indexOf(searchText, start), call);
  }
  if (search.kind === EvaluationValueKind.Unknown) {
    return search;
  }
  if (receiver.mayHaveUnknownOrder) {
    return host.unknown('Array.indexOf depended on unknown element order.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const offset = receiver.elements
    .slice(start)
    .findIndex((element) => evaluationValuesEqual(element.value, search));
  if (offset >= 0) {
    return new EvaluationNumberValue(start + offset, call);
  }
  return receiver.mayHaveUnknownElements
    ? host.unknown('Array.indexOf search did not match known elements and the array may contain unknown elements.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
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
  const flattened = flattenArrayElements(receiver.elements, Math.max(0, Math.trunc(depthValue.value)));
  return new EvaluationArrayValue(
    flattened.elements,
    receiver.mayHaveUnknownElements || flattened.mayHaveUnknownElements,
    call,
    receiver.mayHaveUnknownOrder,
  );
}

export function flattenArrayElements(
  elements: readonly EvaluationArrayElement[],
  depth: number,
): { readonly elements: readonly EvaluationArrayElement[]; readonly mayHaveUnknownElements: boolean } {
  const flattened: EvaluationArrayElement[] = [];
  let mayHaveUnknownElements = false;
  for (const element of elements) {
    if (depth > 0 && element.value.kind === EvaluationValueKind.Array) {
      const child = flattenArrayElements(element.value.elements, depth - 1);
      flattened.push(...child.elements);
      mayHaveUnknownElements ||= element.value.mayHaveUnknownElements || child.mayHaveUnknownElements;
      continue;
    }
    flattened.push(element);
  }
  return { elements: flattened, mayHaveUnknownElements };
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
  if (value.kind === EvaluationValueKind.Undefined) {
    return 0;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  return Math.min(Math.max(Math.trunc(value.value), 0), length - start);
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
      : new EvaluationArrayValue(
        receiver.elements.slice(range.start, range.end),
        receiver.mayHaveUnknownElements,
        call,
        receiver.mayHaveUnknownOrder,
      );
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
    return sortWithComparator(elements, defaultArraySortCompare);
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

  const sorted = sortWithComparator(elements, (left, right) => {
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

export function sortWithComparator(
  elements: readonly EvaluationArrayElement[],
  compare: (left: EvaluationArrayElement, right: EvaluationArrayElement) => number | null,
): {
  readonly elements: readonly EvaluationArrayElement[];
  readonly mayHaveUnknownOrder: boolean;
} {
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

export function defaultArraySortCompare(
  left: EvaluationArrayElement,
  right: EvaluationArrayElement,
): number | null {
  const leftText = defaultArraySortText(left.value);
  const rightText = defaultArraySortText(right.value);
  if (leftText == null || rightText == null) {
    return null;
  }
  return leftText.localeCompare(rightText);
}

export function defaultArraySortText(value: EvaluationValue): string | null {
  return stringCoercionText(value);
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
