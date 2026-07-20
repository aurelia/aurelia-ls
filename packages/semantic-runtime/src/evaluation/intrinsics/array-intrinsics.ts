import ts from 'typescript';
import type { StaticInvocationFrame } from '../invocation.js';
import {
  EvaluationArrayCallbackClosure,
  EvaluationArrayCallbackRead,
  type EvaluationArrayMethodDecision,
  EvaluationArrayMethodDecisionKind,
  evaluationArrayFilterDecision,
  evaluationArrayFindDecision,
  evaluationArrayFindIndexDecision,
  evaluationArrayFlatMapDecision,
  evaluationArrayForEachDecision,
  evaluationArrayMapDecision,
  evaluationArrayQuantifierDecision,
  evaluationArrayReduceDecision,
} from '../array-callback-values.js';
import {
  evaluationArrayConcat,
  denseEvaluationArrayElements,
  evaluationArrayIncludes,
  evaluationArrayIndexOf,
  evaluationArrayJoin,
  evaluationArrayFlat,
  evaluationArraySlice,
  evaluationArraySplice,
  evaluationArraySortedElements,
  evaluationArrayToSpliced,
  evaluationArrayToReversed,
  evaluationArrayWith,
  rebaseEvaluationArrayElements,
  defaultEvaluationArraySortCompare,
  isValidEvaluationArrayLength,
} from '../array-value-operations.js';
import {
  compactEvaluationOpenSeams,
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from '../seams.js';
import { OpenSeamReasonKind } from '../../kernel/open-seam.js';
import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayUncertaintyKind,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import {
  boundaryIntrinsicCallValue,
  evaluatePositionalIntrinsicArguments,
  IntrinsicCallbackEvaluationKind,
  IntrinsicCallbackFrame,
  type IntrinsicCallbackEvaluation,
  isBoundaryEvaluationValue,
  readArrayStartIndex,
  readArraySpliceDeleteCount,
  readArrayWithIndex,
  readSliceBound,
  readSliceRange,
  stringCoercionText,
} from './shared.js';
import { readArrayAtIndex, readArrayLastIndexStart } from '../value-coercion.js';
import { evaluateStringPredicateFromReceiver } from './string-intrinsics.js';
import {
  EvaluationValueEvidence,
} from '../value-pressure.js';

interface StaticArrayCallbackInvocation {
  readonly callback: EvaluationFunctionValue;
  readonly arguments: readonly EvaluationValueEvidence[];
  readonly thisValue: EvaluationValueEvidence | null;
}

function staticArrayCallbackRead(
  frame: IntrinsicCallbackFrame,
  callback: EvaluationFunctionValue,
  argumentValues: readonly EvaluationValueEvidence[],
): EvaluationArrayCallbackRead<never, IntrinsicCallbackEvaluation> {
  const read = frame.evaluate(callback, argumentValues);
  return read.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted
    ? EvaluationArrayCallbackRead.blocked(read)
    : EvaluationArrayCallbackRead.value(
        read.evidence,
        read.evidence.openSeams.length === 0
          ? EvaluationArrayCallbackClosure.Value
          : EvaluationArrayCallbackClosure.Open,
      );
}

function evaluateArrayCallbackInvocation(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  label: string,
  thisArgumentIndex: number | null = 1,
): { readonly kind: 'known'; readonly value: StaticArrayCallbackInvocation }
  | { readonly kind: 'open'; readonly value: EvaluationValue } {
  const call = frame.node;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    frame.moduleKey,
    host,
    `${label} argument list did not close.`,
  );
  if (argumentRead.kind === 'open') {
    return argumentRead;
  }
  const arguments_ = argumentRead.evidence;
  const callback = arguments_[0] ?? null;
  if (callback == null || callback.openSeams.length > 0 || callback.value.kind !== EvaluationValueKind.Function) {
    host.replayOpenSeams(callback?.openSeams ?? []);
    return {
      kind: 'open',
      value: host.unknown(`${label} did not reduce to a known function.`, call, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall),
    };
  }
  return {
    kind: 'known',
    value: {
      callback: callback.value,
      arguments: arguments_,
      thisValue: thisArgumentIndex == null
        ? null
        : arguments_[thisArgumentIndex] ?? new EvaluationValueEvidence(EvaluationUndefined, []),
    },
  };
}

function prepareStaticArrayCallbackFrame(
  plannedEvaluations: number,
  label: string,
  call: ts.CallExpression,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
  thisValue: EvaluationValueEvidence | null = null,
): { readonly kind: 'known'; readonly frame: IntrinsicCallbackFrame }
  | { readonly kind: 'open'; readonly value: EvaluationUnknownValue } {
  const frame = new IntrinsicCallbackFrame(host, call, moduleKey, depth, thisValue);
  return frame.admits(plannedEvaluations)
    ? { kind: 'known', frame }
    : {
        kind: 'open',
        value: host.unknown(
          `${label} exceeds the intrinsic callback guardrail.`,
          call,
          moduleKey,
          EvaluationOpenSeamKind.DynamicCall,
        ),
      };
}

function replayEvidence(
  evidence: EvaluationValueEvidence,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  host.replayOpenSeams(evidence.openSeams);
  return evidence.value;
}

function unknownFromEvidence(
  evidence: EvaluationValueEvidence,
  reason: string,
  node: ts.Node,
  host: StaticIntrinsicEvaluationHost,
): EvaluationUnknownValue {
  host.replayOpenSeams(evidence.openSeams);
  return new EvaluationUnknownValue(reason, node, true);
}

function openArrayMutationShape(
  receiver: EvaluationArrayValue,
  reason: string,
  node: ts.Node,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationUnknownValue {
  const checkpoint = host.checkpoint();
  const result = host.unknown(reason, node, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  const openSeams = host.consumeOpenSeamsSince(checkpoint);
  receiver.markUnknownExtent(openSeams);
  receiver.markUnknownElements(openSeams);
  receiver.markUnknownOrder(openSeams);
  host.replayOpenSeams(openSeams);
  return result;
}

function retainArrayElementPressure(
  receiver: EvaluationArrayValue,
  openSeams: readonly EvaluationOpenSeam[],
): void {
  for (let index = 0; index < receiver.elements.length; index += 1) {
    const element = receiver.elements[index]!;
    receiver.elements[index] = new EvaluationArrayElement(
      element.value,
      element.expression,
      [...element.openSeams, ...openSeams],
      element.runtimeIndex,
    );
  }
}

function materializeStaticArrayDecision(
  decision: EvaluationArrayMethodDecision<never, IntrinsicCallbackEvaluation>,
  callbackFrame: IntrinsicCallbackFrame,
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  if (decision.kind === EvaluationArrayMethodDecisionKind.Blocked) {
    throw new Error('Array callback preflight invariant violated.');
  }
  if (decision.kind === EvaluationArrayMethodDecisionKind.Open) {
    if (decision.evidence == null) {
      if (decision.openSeams.length > 0) {
        host.replayOpenSeams(decision.openSeams);
        return new EvaluationUnknownValue(decision.openReason!, call, true);
      }
      return host.unknown(decision.openReason!, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    const edgeOpenSeams = compactEvaluationOpenSeams([
      ...decision.openSeams,
      ...decision.evidence.openSeams,
    ]);
    if (decision.evidence.value.kind === EvaluationValueKind.Array) {
      let openSeams = edgeOpenSeams;
      if (openSeams.length === 0 && decision.evidence.value.aggregateOpenSeams.length === 0) {
        const checkpoint = host.checkpoint();
        host.open(
          EvaluationOpenSeamKind.DynamicCall,
          decision.openReason!,
          call,
          moduleKey,
          [OpenSeamReasonKind.StaticEvaluationDynamicCall],
        );
        openSeams = host.consumeOpenSeamsSince(checkpoint);
      }
      if (decision.evidence.value.exactLength == null) {
        decision.evidence.value.markUnknownExtent(openSeams);
      } else if (!decision.evidence.value.shape.hasExactElements) {
        decision.evidence.value.markUnknownElements(openSeams);
      }
      if (!decision.evidence.value.shape.hasExactOrder) {
        decision.evidence.value.markUnknownOrder(openSeams);
      }
    } else {
      if (edgeOpenSeams.length > 0) {
        host.replayOpenSeams(edgeOpenSeams);
      } else {
        host.open(
          EvaluationOpenSeamKind.DynamicCall,
          decision.openReason!,
          call,
          moduleKey,
          [OpenSeamReasonKind.StaticEvaluationDynamicCall],
        );
      }
    }
  }
  if (decision.kind !== EvaluationArrayMethodDecisionKind.Open) {
    host.replayOpenSeams(decision.evidence!.openSeams);
  }
  return decision.evidence!.value;
}

export function evaluateArrayConstructor(
  frame: StaticInvocationFrame<ts.NewExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const expression = frame.node;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    expression,
    frame.moduleKey,
    host,
    'Array constructor argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const arguments_ = argumentRead.argumentList;
  if (arguments_.shape.exactLength !== 1) {
    return new EvaluationArrayValue(arguments_.elements, expression, arguments_.shape);
  }

  const argument = arguments_.elements[0]!;
  if (argument.openSeams.length > 0) {
    return new EvaluationArrayValue(
      [argument.withRuntimeIndex(null)],
      expression,
      EvaluationArrayShape.from({
        exactLength: null,
        hasExactElements: false,
        hasExactOrder: true,
        uncertainties: [],
        extentOpenSeams: argument.openSeams,
        elementOpenSeams: argument.openSeams,
        orderOpenSeams: [],
      }),
    );
  }
  if (argument.value.kind !== EvaluationValueKind.Number) {
    return new EvaluationArrayValue([argument], expression);
  }
  if (!isValidEvaluationArrayLength(argument.value.value)) {
    return host.unknown(
      'Array constructor numeric length would throw RangeError.',
      expression,
      frame.moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  return new EvaluationArrayValue(
    [],
    expression,
    EvaluationArrayShape.exact(argument.value.value),
  );
}

export function evaluateArrayConcat(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const call = frame.node;
  const receiverRead = evaluateArrayReceiver(frame, host, 'concat');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    frame.moduleKey,
    host,
    'Array.concat argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const arguments_ = argumentRead.argumentList;
  return evaluationArrayConcat(receiver, arguments_.elements, arguments_.shape, call);
}

export function evaluateArrayFrom(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const call = frame.node;
  const moduleKey = frame.moduleKey;
  const depth = frame.depth;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.from argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const arguments_ = argumentRead.evidence;
  const sourceEvidence = arguments_[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (sourceEvidence.openSeams.length > 0) {
    return unknownFromEvidence(sourceEvidence, 'Array.from source retained open pressure.', call, host);
  }
  const source = sourceEvidence.value;
  if (isBoundaryEvaluationValue(source)) {
    return boundaryIntrinsicCallValue(source, 'Array.from', call);
  }
  const sourceElements = arrayFromSourceElements(source, call);
  if (sourceElements == null) {
    return host.unknown('Array.from source did not reduce to a known iterable or array-like value.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (!sourceElements.shape.hasExactPositions || sourceElements.shape.exactLength == null) {
    return host.unknown('Array.from source iteration order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (sourceElements.shape.exactLength > host.guardrails.maxLoopIterations) {
    return host.unknown('Array.from source exceeds the static iteration guardrail.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const denseSource = denseEvaluationArrayElements(new EvaluationArrayValue(
    sourceElements.elements,
    call,
    sourceElements.shape,
  ))!;
  const mapperEvidence = arguments_[1] ?? null;
  if (mapperEvidence == null) {
    return new EvaluationArrayValue(
      denseSource,
      call,
    );
  }
  if (mapperEvidence.openSeams.length > 0 || mapperEvidence.value.kind !== EvaluationValueKind.Function) {
    host.replayOpenSeams(mapperEvidence.openSeams);
    return host.unknown('Array.from map function did not reduce to a known function.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const mapper = mapperEvidence.value;
  const thisValue = arguments_[2] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  const preparedFrame = prepareStaticArrayCallbackFrame(denseSource.length, 'Array.from mapper', call, moduleKey, depth + 1, host, thisValue);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  const elements: EvaluationArrayElement[] = [];
  for (let index = 0; index < denseSource.length; index++) {
    const element = denseSource[index]!;
    const mapped = callbackFrame.evaluate(
      mapper,
      [
        new EvaluationValueEvidence(element.value, element.openSeams),
        new EvaluationValueEvidence(new EvaluationNumberValue(index, call), []),
      ],
    );
    if (mapped.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      throw new Error('Array.from callback preflight invariant violated.');
    }
    elements.push(new EvaluationArrayElement(
      mapped.evidence.value,
      element.expression,
      mapped.evidence.openSeams,
      index,
    ));
  }
  return new EvaluationArrayValue(
    elements,
    call,
  );
}

export function arrayFromSourceElements(
  source: EvaluationValue,
  node: ts.Node,
): {
  readonly elements: readonly EvaluationArrayElement[];
  readonly shape: EvaluationArrayShape;
} | null {
  switch (source.kind) {
    case EvaluationValueKind.Array:
      return {
        elements: source.elements,
        shape: source.shape,
      };
    case EvaluationValueKind.Set:
      return {
        elements: source.elements,
        shape: iterableArrayShape(source.elements.length, source.mayHaveUnknownElements),
      };
    case EvaluationValueKind.Map:
      return {
        elements: source.entries.map((entry) =>
          new EvaluationArrayElement(
            new EvaluationArrayValue([
              new EvaluationArrayElement(entry.key, entry.expression),
              new EvaluationArrayElement(entry.value, entry.expression),
            ], node),
            entry.expression,
          )
        ),
        shape: iterableArrayShape(source.entries.length, source.mayHaveUnknownEntries),
      };
    case EvaluationValueKind.String:
      return {
        elements: [...source.value].map((character) =>
          new EvaluationArrayElement(new EvaluationStringValue(character, node), null)
        ),
        shape: EvaluationArrayShape.exact([...source.value].length),
      };
    default:
      return null;
  }
}

function iterableArrayShape(knownLength: number, open: boolean): EvaluationArrayShape {
  return open
    ? EvaluationArrayShape.from({
        exactLength: null,
        hasExactElements: false,
        hasExactOrder: true,
        uncertainties: [],
        extentOpenSeams: [],
        elementOpenSeams: [],
        orderOpenSeams: [],
      })
    : EvaluationArrayShape.exact(knownLength);
}

export function evaluateArrayMap(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'map');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const invocation = evaluateArrayCallbackInvocation(frame, host, 'Array.map callback');
  if (invocation.kind !== 'known') {
    return invocation.value;
  }
  const preparedFrame = prepareStaticArrayCallbackFrame(receiver.exactLength ?? Number.POSITIVE_INFINITY, 'Array.map callback', call, moduleKey, depth + 1, host, invocation.value.thisValue);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  return materializeStaticArrayDecision(
    evaluationArrayMapDecision(receiver, call, (arguments_) => staticArrayCallbackRead(callbackFrame, invocation.value.callback, arguments_)),
    callbackFrame,
    call,
    moduleKey,
    host,
  );
}

export function evaluateArrayFlatMap(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'flatMap');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const invocation = evaluateArrayCallbackInvocation(frame, host, 'Array.flatMap callback');
  if (invocation.kind !== 'known') {
    return invocation.value;
  }
  const preparedFrame = prepareStaticArrayCallbackFrame(receiver.exactLength ?? Number.POSITIVE_INFINITY, 'Array.flatMap callback', call, moduleKey, depth + 1, host, invocation.value.thisValue);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  return materializeStaticArrayDecision(
    evaluationArrayFlatMapDecision(receiver, call, (arguments_) => staticArrayCallbackRead(callbackFrame, invocation.value.callback, arguments_)),
    callbackFrame,
    call,
    moduleKey,
    host,
  );
}

export function evaluateArrayFilter(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'filter');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const invocation = evaluateArrayCallbackInvocation(frame, host, 'Array.filter predicate');
  if (invocation.kind !== 'known') {
    return invocation.value;
  }
  const preparedFrame = prepareStaticArrayCallbackFrame(receiver.exactLength ?? Number.POSITIVE_INFINITY, 'Array.filter predicate', call, moduleKey, depth + 1, host, invocation.value.thisValue);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  return materializeStaticArrayDecision(
    evaluationArrayFilterDecision(receiver, call, (arguments_) => staticArrayCallbackRead(callbackFrame, invocation.value.callback, arguments_)),
    callbackFrame,
    call,
    moduleKey,
    host,
  );
}

export function evaluateArrayFind(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  rightToLeft: boolean,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const intrinsicName = rightToLeft ? 'findLast' : 'find';
  const receiverRead = evaluateArrayReceiver(frame, host, intrinsicName);
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const invocation = evaluateArrayCallbackInvocation(frame, host, `Array.${intrinsicName} predicate`);
  if (invocation.kind !== 'known') {
    return invocation.value;
  }
  const preparedFrame = prepareStaticArrayCallbackFrame(receiver.exactLength ?? Number.POSITIVE_INFINITY, `Array.${intrinsicName} predicate`, call, moduleKey, depth + 1, host, invocation.value.thisValue);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  return materializeStaticArrayDecision(
    evaluationArrayFindDecision(
      receiver,
      call,
      rightToLeft,
      (arguments_) => staticArrayCallbackRead(callbackFrame, invocation.value.callback, arguments_),
    ),
    callbackFrame,
    call,
    moduleKey,
    host,
  );
}

export function evaluateArrayFindIndex(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  rightToLeft: boolean,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const intrinsicName = rightToLeft ? 'findLastIndex' : 'findIndex';
  const receiverRead = evaluateArrayReceiver(frame, host, intrinsicName);
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const invocation = evaluateArrayCallbackInvocation(frame, host, `Array.${intrinsicName} predicate`);
  if (invocation.kind !== 'known') {
    return invocation.value;
  }
  const preparedFrame = prepareStaticArrayCallbackFrame(receiver.exactLength ?? Number.POSITIVE_INFINITY, `Array.${intrinsicName} predicate`, call, moduleKey, depth + 1, host, invocation.value.thisValue);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  return materializeStaticArrayDecision(
    evaluationArrayFindIndexDecision(
      receiver,
      call,
      rightToLeft,
      (arguments_) => staticArrayCallbackRead(callbackFrame, invocation.value.callback, arguments_),
    ),
    callbackFrame,
    call,
    moduleKey,
    host,
  );
}

export function evaluateArraySome(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateArrayQuantifier(frame, host, 'some');
}

export function evaluateArrayEvery(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return evaluateArrayQuantifier(frame, host, 'every');
}

export function evaluateArrayQuantifier(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  kind: 'some' | 'every',
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, kind);
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const invocation = evaluateArrayCallbackInvocation(frame, host, `Array.${kind} predicate`);
  if (invocation.kind !== 'known') {
    return invocation.value;
  }
  const preparedFrame = prepareStaticArrayCallbackFrame(receiver.exactLength ?? Number.POSITIVE_INFINITY, `Array.${kind} predicate`, call, moduleKey, depth + 1, host, invocation.value.thisValue);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  return materializeStaticArrayDecision(
    evaluationArrayQuantifierDecision(
      receiver,
      call,
      kind,
      (arguments_) => staticArrayCallbackRead(callbackFrame, invocation.value.callback, arguments_),
    ),
    callbackFrame,
    call,
    moduleKey,
    host,
  );
}

export function evaluateArrayForEach(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'forEach');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const invocation = evaluateArrayCallbackInvocation(frame, host, 'Array.forEach callback');
  if (invocation.kind !== 'known') {
    return invocation.value;
  }
  const preparedFrame = prepareStaticArrayCallbackFrame(receiver.exactLength ?? Number.POSITIVE_INFINITY, 'Array.forEach callback', call, moduleKey, depth + 1, host, invocation.value.thisValue);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  return materializeStaticArrayDecision(
    evaluationArrayForEachDecision(
      receiver,
      call,
      (arguments_) => staticArrayCallbackRead(callbackFrame, invocation.value.callback, arguments_),
    ),
    callbackFrame,
    call,
    moduleKey,
    host,
  );
}

export function evaluateArrayReduce(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  rightToLeft: boolean,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const intrinsicName = rightToLeft ? 'reduceRight' : 'reduce';
  const receiverRead = evaluateArrayReceiver(frame, host, intrinsicName);
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const invocation = evaluateArrayCallbackInvocation(frame, host, `Array.${intrinsicName} reducer`, null);
  if (invocation.kind !== 'known') {
    return invocation.value;
  }
  const initialValue = invocation.value.arguments[1] ?? null;

  const plannedEvaluations = receiver.exactLength == null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, receiver.exactLength - (initialValue == null ? 1 : 0));
  const preparedFrame = prepareStaticArrayCallbackFrame(plannedEvaluations, `Array.${intrinsicName} reducer`, call, moduleKey, depth + 1, host);
  if (preparedFrame.kind === 'open') {
    return preparedFrame.value;
  }
  const callbackFrame = preparedFrame.frame;
  return materializeStaticArrayDecision(
    evaluationArrayReduceDecision(
      receiver,
      call,
      rightToLeft,
      initialValue,
      [],
      (arguments_) => staticArrayCallbackRead(callbackFrame, invocation.value.callback, arguments_),
    ),
    callbackFrame,
    call,
    moduleKey,
    host,
  );
}

export function evaluateArrayOrStringIncludes(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const call = frame.node;
  const receiverRead = evaluateClosedIntrinsicInput(
    frame.thisValue,
    call,
    host,
    'Array/String.includes receiver retained open pressure.',
  );
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (receiver.kind === EvaluationValueKind.String) {
    return evaluateStringPredicateFromReceiver(frame, receiver, host, 'includes');
  }
  return evaluateArrayIncludesFromReceiver(frame, receiver, host);
}

export function evaluateArrayOrStringAt(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateClosedIntrinsicInput(
    frame.thisValue,
    call,
    host,
    'Array/String.at receiver retained open pressure.',
  );
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'at', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array && receiver.kind !== EvaluationValueKind.String) {
    return host.unknown('Array/String.at receiver did not reduce to a known array or string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array/String.at argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const indexEvidence = argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (indexEvidence.openSeams.length > 0) {
    return unknownFromEvidence(indexEvidence, 'Array/String.at index retained open pressure.', call, host);
  }
  const length = receiver.kind === EvaluationValueKind.Array ? receiver.exactLength : receiver.value.length;
  if (length == null) {
    return host.unknown('Array.at receiver extent did not close.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const index = readArrayAtIndex(indexEvidence.value, length);
  if (index == null) {
    return host.unknown('Array/String.at index did not reduce to a finite number.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (receiver.kind === EvaluationValueKind.Array) {
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return host.unknown('Array.at receiver membership or order did not close.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    const element = receiver.elementAtRuntimeIndex(index);
    return element == null
      ? EvaluationUndefined
      : replayEvidence(new EvaluationValueEvidence(element.value, element.openSeams), host);
  }
  const value = receiver.value[index];
  return value == null ? EvaluationUndefined : new EvaluationStringValue(value, call);
}

export function evaluateArrayIncludesFromReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  receiver: EvaluationValue,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'includes', call);
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return host.unknown('Array.includes receiver did not reduce to a known array.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.includes argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const searchEvidence = argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (searchEvidence.openSeams.length > 0) {
    return unknownFromEvidence(searchEvidence, 'Array.includes search value retained open pressure.', call, host);
  }
  const startEvidence = argumentRead.evidence[1] ?? null;
  if (startEvidence != null && startEvidence.openSeams.length > 0) {
    return unknownFromEvidence(startEvidence, 'Array.includes start index retained open pressure.', call, host);
  }
  const startIndex = startEvidence == null
    ? 0
    : readArrayStartIndex(startEvidence.value, receiver.exactLength ?? 0);
  if (startIndex == null || receiver.exactLength == null || receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
    return host.unknown('Array.includes start index or receiver positions did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const included = evaluationArrayIncludes(receiver, searchEvidence.value, startIndex);
  if (included.value == null) {
    return unknownFromEvidence(
      new EvaluationValueEvidence(EvaluationUndefined, included.openSeams),
      'Array.includes encountered a pressure-qualified element.',
      call,
      host,
    );
  }
  return new EvaluationBooleanValue(included.value, call);
}

export function evaluateArrayIndexOf(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  rightToLeft: boolean,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const intrinsicName = rightToLeft ? 'lastIndexOf' : 'indexOf';
  const receiverRead = evaluateClosedIntrinsicInput(
    frame.thisValue,
    call,
    host,
    `${intrinsicName} receiver retained open pressure.`,
  );
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, intrinsicName, call);
  }
  if (receiver.kind !== EvaluationValueKind.Array && receiver.kind !== EvaluationValueKind.String) {
    return host.unknown(`${intrinsicName} receiver did not reduce to a known array or string.`, frame.calleeNode, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    `Array/String.${intrinsicName} argument list did not close.`,
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const searchEvidence = argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (searchEvidence.openSeams.length > 0) {
    return unknownFromEvidence(searchEvidence, `${intrinsicName} search value retained open pressure.`, call, host);
  }
  const search = searchEvidence.value;
  const receiverLength = receiver.kind === EvaluationValueKind.String ? receiver.value.length : receiver.exactLength;
  if (receiverLength == null) {
    return host.unknown(`Array.${intrinsicName} extent did not close statically.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const startEvidence = argumentRead.evidence[1] ?? null;
  if (startEvidence != null && startEvidence.openSeams.length > 0) {
    return unknownFromEvidence(startEvidence, `${intrinsicName} start index retained open pressure.`, call, host);
  }
  const start = rightToLeft
    ? readArrayLastIndexStart(startEvidence?.value ?? EvaluationUndefined, receiverLength)
    : startEvidence == null
      ? 0
      : readArrayStartIndex(startEvidence!.value, receiverLength);
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
  if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
    return host.unknown(`Array.${intrinsicName} depended on unknown membership or order.`, call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const index = evaluationArrayIndexOf(receiver, search, start, rightToLeft);
  if (index.value == null) {
    return unknownFromEvidence(
      new EvaluationValueEvidence(EvaluationUndefined, index.openSeams),
      `Array.${intrinsicName} encountered a pressure-qualified element.`,
      call,
      host,
    );
  }
  return new EvaluationNumberValue(index.value, call);
}

export function evaluateArrayJoin(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'join');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.join argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
    return host.unknown('Array.join receiver has unknown membership or order.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  if (receiver.exactLength == null || receiver.exactLength > host.guardrails.maxLoopIterations) {
    return host.unknown('Array.join receiver exceeds the static iteration guardrail.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const separatorEvidence = argumentRead.evidence[0] ?? null;
  if (separatorEvidence != null && separatorEvidence.openSeams.length > 0) {
    return unknownFromEvidence(separatorEvidence, 'Array.join separator retained open pressure.', call, host);
  }
  const separator = separatorEvidence == null
    ? ','
    : stringCoercionText(separatorEvidence.value);
  if (separator == null) {
    return host.unknown('Array.join separator did not reduce to a static string.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const joined = evaluationArrayJoin(receiver, separator);
  if (joined == null) {
    const elementOpenSeams = receiver.elements.flatMap((element) => element.openSeams);
    return elementOpenSeams.length === 0
      ? host.unknown('Array.join element did not reduce to a string-coercible primitive.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
      : unknownFromEvidence(
          new EvaluationValueEvidence(EvaluationUndefined, elementOpenSeams),
          'Array.join encountered a pressure-qualified element.',
          call,
          host,
        );
  }
  return new EvaluationStringValue(joined, call);
}

export function evaluateArrayFlat(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'flat');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.flat argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const depthEvidence = argumentRead.evidence[0]
    ?? new EvaluationValueEvidence(new EvaluationNumberValue(1, call), []);
  if (depthEvidence.openSeams.length > 0) {
    return unknownFromEvidence(depthEvidence, 'Array.flat depth retained open pressure.', call, host);
  }
  if (depthEvidence.value.kind !== EvaluationValueKind.Number || !Number.isFinite(depthEvidence.value.value)) {
    return host.unknown('Array.flat depth did not reduce to a finite number.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return evaluationArrayFlat(receiver, Math.max(0, Math.trunc(depthEvidence.value.value)), call);
}

export function evaluateArrayFill(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'fill');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.fill argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const valueEvidence = argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  const rangeRead = readArrayFillRange(argumentRead.evidence, receiver.exactLength ?? 0);
  const range = rangeRead.range;
  const rangeOpenSeams = rangeRead.openSeams;
  const receiverWasDense = receiver.isDense;
  if (
    range == null
    || rangeOpenSeams.length > 0
    || receiver.exactLength == null
    || receiver.mayHaveUnknownElements
    || receiver.mayHaveUnknownOrder
    || range.end - range.start > host.guardrails.maxLoopIterations
  ) {
    const openSeams = [
      ...valueEvidence.openSeams,
      ...rangeOpenSeams,
      ...receiver.aggregateOpenSeams,
    ];
    if (openSeams.length > 0) {
      retainArrayElementPressure(receiver, openSeams);
      if (!receiverWasDense) {
        receiver.markUnknownElements(openSeams);
      }
      return unknownFromEvidence(
        new EvaluationValueEvidence(receiver, openSeams),
        'Array.fill target positions retained open pressure.',
        call,
        host,
      );
    }
    const checkpoint = host.checkpoint();
    const result = host.unknown(
      'Array.fill target positions did not close statically.',
      call,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
    const generatedOpenSeams = host.consumeOpenSeamsSince(checkpoint);
    retainArrayElementPressure(receiver, generatedOpenSeams);
    if (!receiverWasDense) {
      receiver.markUnknownElements(generatedOpenSeams);
    }
    host.replayOpenSeams(generatedOpenSeams);
    return result;
  }
  const retained = receiver.elements.filter((element) =>
    element.runtimeIndex! < range.start || element.runtimeIndex! >= range.end
  );
  const filled: EvaluationArrayElement[] = [];
  for (let index = range.start; index < range.end; index++) {
    filled.push(new EvaluationArrayElement(
      valueEvidence.value,
      argumentRead.argumentList.elements[0]?.expression ?? null,
      valueEvidence.openSeams,
      index,
    ));
  }
  receiver.replaceElements([...retained, ...filled].sort((left, right) => left.runtimeIndex! - right.runtimeIndex!));
  return receiver;
}

export function evaluateArrayPush(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = evaluateArrayReceiver(frame, host, 'push');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }

  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.push argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const insert = argumentRead.argumentList;
  const mutation = receiver.value.exactLength == null
    ? null
    : evaluationArraySplice(receiver.value, receiver.value.exactLength, 0, insert.elements, insert.shape);
  if (mutation == null) {
    applyArrayMutationUncertainty(receiver.value, insert, 'append');
  } else {
    receiver.value.replaceElements(mutation.remaining, mutation.remainingShape);
  }
  return receiver.value.exactLength == null
    ? host.unknown('Array.push result length depended on unknown element membership.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationNumberValue(receiver.value.exactLength, call);
}

export function evaluateArrayUnshift(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = evaluateArrayReceiver(frame, host, 'unshift');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }

  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.unshift argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const insert = argumentRead.argumentList;
  const mutation = evaluationArraySplice(receiver.value, 0, 0, insert.elements, insert.shape);
  if (mutation == null) {
    applyArrayMutationUncertainty(receiver.value, insert, 'prepend');
  } else {
    receiver.value.replaceElements(mutation.remaining, mutation.remainingShape);
  }
  return receiver.value.exactLength == null
    ? host.unknown('Array.unshift result length depended on unknown element membership.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
    : new EvaluationNumberValue(receiver.value.exactLength, call);
}

export function evaluateArrayPop(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = evaluateArrayReceiver(frame, host, 'pop');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.pop argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (!hasExactArrayMutationOrder(receiver.value)) {
    return evaluateOpenArrayEndRemoval(receiver.value, 'pop', call, moduleKey, host);
  }
  const length = receiver.value.exactLength!;
  if (length === 0) {
    return EvaluationUndefined;
  }
  const mutation = evaluationArraySplice(receiver.value, length - 1, 1, [], EvaluationArrayShape.exact(0))!;
  receiver.value.replaceElements(mutation.remaining, mutation.remainingShape);
  const element = mutation.removed[0] ?? null;
  return element == null
    ? EvaluationUndefined
    : replayEvidence(new EvaluationValueEvidence(element.value, element.openSeams), host);
}

export function evaluateArrayShift(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = evaluateArrayReceiver(frame, host, 'shift');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.shift argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (!hasExactArrayMutationOrder(receiver.value)) {
    return evaluateOpenArrayEndRemoval(receiver.value, 'shift', call, moduleKey, host);
  }
  const length = receiver.value.exactLength!;
  if (length === 0) {
    return EvaluationUndefined;
  }
  const mutation = evaluationArraySplice(receiver.value, 0, 1, [], EvaluationArrayShape.exact(0))!;
  receiver.value.replaceElements(mutation.remaining, mutation.remainingShape);
  const element = mutation.removed[0] ?? null;
  return element == null
    ? EvaluationUndefined
    : replayEvidence(new EvaluationValueEvidence(element.value, element.openSeams), host);
}

export function evaluateArrayReverse(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = evaluateArrayReceiver(frame, host, 'reverse');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.reverse argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (!hasExactArrayMutationOrder(receiver.value) || receiver.value.exactLength == null) {
    return host.unknown('Array.reverse receiver membership or order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  receiver.value.replaceElements(receiver.value.elements
    .map((element) => element.withRuntimeIndex(receiver.value.exactLength! - 1 - element.runtimeIndex!))
    .sort((left, right) => left.runtimeIndex! - right.runtimeIndex!));
  return receiver.value;
}

export function evaluateArrayToReversed(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'toReversed');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.toReversed argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (receiver.exactLength == null || receiver.exactLength > host.guardrails.maxLoopIterations) {
    return host.unknown('Array.toReversed receiver exceeds the static iteration guardrail.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return evaluationArrayToReversed(receiver, call);
}

export function evaluateArrayToSpliced(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'toSpliced');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.toSpliced argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (receiver.exactLength == null || receiver.exactLength > host.guardrails.maxLoopIterations) {
    return host.unknown('Array.toSpliced receiver exceeds the static iteration guardrail.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const startRead = readSpliceStart(argumentRead.evidence, receiver.exactLength);
  if (startRead.openSeams.length > 0) {
    return unknownFromEvidence(
      new EvaluationValueEvidence(EvaluationUndefined, startRead.openSeams),
      'Array.toSpliced start index retained open pressure.',
      call,
      host,
    );
  }
  const start = startRead.value;
  if (start == null) {
    return host.unknown('Array.toSpliced start index did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const deleteRead = readSpliceDeleteCount(argumentRead.evidence, start, receiver.exactLength);
  if (deleteRead.openSeams.length > 0) {
    return unknownFromEvidence(
      new EvaluationValueEvidence(EvaluationUndefined, deleteRead.openSeams),
      'Array.toSpliced delete count retained open pressure.',
      call,
      host,
    );
  }
  const deleteCount = deleteRead.value;
  if (deleteCount == null) {
    return host.unknown('Array.toSpliced delete count did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const inserted = rebaseEvaluationArrayElements(argumentRead.argumentList.elements.slice(2));
  if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
    return host.unknown('Array.toSpliced receiver membership or order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return evaluationArrayToSpliced(
    receiver,
    start,
    deleteCount,
    inserted,
    EvaluationArrayShape.exact(inserted.length),
    call,
  );
}

export function evaluateArrayWith(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'with');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.with argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const indexEvidence = argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (indexEvidence.openSeams.length > 0) {
    return unknownFromEvidence(indexEvidence, 'Array.with index retained open pressure.', call, host);
  }
  if (receiver.exactLength == null || receiver.exactLength > host.guardrails.maxLoopIterations) {
    return host.unknown('Array.with receiver exceeds the static iteration guardrail.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const index = readArrayWithIndex(indexEvidence.value, receiver.exactLength);
  if (index == null) {
    return host.unknown('Array.with index did not close to an in-range index.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const valueEvidence = argumentRead.evidence[1] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
    return host.unknown('Array.with receiver membership or order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  return evaluationArrayWith(
    receiver,
    index,
    new EvaluationArrayElement(
      valueEvidence.value,
      argumentRead.argumentList.elements[1]?.expression ?? null,
      valueEvidence.openSeams,
    ),
    call,
  );
}

export function evaluateArraySplice(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiver = evaluateArrayReceiver(frame, host, 'splice');
  if (receiver.kind !== 'known') {
    return receiver.value;
  }
  if (!hasExactArrayMutationOrder(receiver.value)) {
    return openArrayMutationShape(
      receiver.value,
      'Array.splice receiver membership or order did not close statically.',
      call,
      moduleKey,
      host,
    );
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.splice argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const startRead = readSpliceStart(argumentRead.evidence, receiver.value.exactLength!);
  const start = startRead.value;
  const startOpenSeams = startRead.openSeams;
  if (start == null || startOpenSeams.length > 0) {
    receiver.value.markUnknownExtent(startOpenSeams);
    receiver.value.markUnknownElements(startOpenSeams);
    receiver.value.markUnknownOrder(startOpenSeams);
    if (startOpenSeams.length > 0) {
      return unknownFromEvidence(
        new EvaluationValueEvidence(receiver.value, startOpenSeams),
        'Array.splice start index retained open pressure.',
        call,
        host,
      );
    }
    return openArrayMutationShape(
      receiver.value,
      'Array.splice start index did not close statically.',
      call,
      moduleKey,
      host,
    );
  }
  const deleteRead = readSpliceDeleteCount(argumentRead.evidence, start, receiver.value.exactLength!);
  const deleteCount = deleteRead.value;
  const deleteOpenSeams = deleteRead.openSeams;
  if (deleteCount == null || deleteOpenSeams.length > 0) {
    receiver.value.markUnknownExtent(deleteOpenSeams);
    receiver.value.markUnknownElements(deleteOpenSeams);
    receiver.value.markUnknownOrder(deleteOpenSeams);
    if (deleteOpenSeams.length > 0) {
      return unknownFromEvidence(
        new EvaluationValueEvidence(receiver.value, deleteOpenSeams),
        'Array.splice delete count retained open pressure.',
        call,
        host,
      );
    }
    return openArrayMutationShape(
      receiver.value,
      'Array.splice delete count did not close statically.',
      call,
      moduleKey,
      host,
    );
  }

  const insert = rebaseEvaluationArrayElements(argumentRead.argumentList.elements.slice(2));
  const mutation = evaluationArraySplice(
    receiver.value,
    start,
    deleteCount,
    insert,
    EvaluationArrayShape.exact(insert.length),
  );
  if (mutation == null) {
    return openArrayMutationShape(
      receiver.value,
      'Array.splice argument-list shape did not close statically.',
      call,
      moduleKey,
      host,
    );
  }
  receiver.value.replaceElements(mutation.remaining, mutation.remainingShape);
  return new EvaluationArrayValue(mutation.removed, call, mutation.removedShape);
}

function evaluateClosedIntrinsicInput(
  evidence: EvaluationValueEvidence | null,
  call: ts.CallExpression,
  host: StaticIntrinsicEvaluationHost,
  openReason: string,
): { readonly kind: 'known'; readonly value: EvaluationValue }
  | { readonly kind: 'open'; readonly value: EvaluationValue } {
  const current = evidence ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  return current.openSeams.length === 0
    ? { kind: 'known', value: current.value }
    : {
        kind: 'open',
        value: unknownFromEvidence(current, openReason, call, host),
      };
}

function evaluateArrayReceiver(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  methodName: string,
): { readonly kind: 'known'; readonly value: EvaluationArrayValue } | { readonly kind: 'open'; readonly value: EvaluationValue } {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateClosedIntrinsicInput(
    frame.thisValue,
    call,
    host,
    `Array.${methodName} receiver retained open pressure.`,
  );
  if (receiverRead.kind !== 'known') {
    return receiverRead;
  }
  const receiver = receiverRead.value;
  if (isBoundaryEvaluationValue(receiver)) {
    return { kind: 'open', value: boundaryIntrinsicCallValue(receiver, methodName, call) };
  }
  if (receiver.kind !== EvaluationValueKind.Array) {
    return {
      kind: 'open',
      value: host.unknown(`Array.${methodName} receiver did not reduce to a known array.`, frame.calleeNode, moduleKey, EvaluationOpenSeamKind.DynamicCall),
    };
  }
  return { kind: 'known', value: receiver };
}

function applyArrayMutationUncertainty(
  receiver: EvaluationArrayValue,
  mutation: {
    readonly elements: readonly EvaluationArrayElement[];
    readonly shape: EvaluationArrayShape;
  },
  placement: 'append' | 'prepend',
): void {
  if (mutation.shape.exactLength == null) {
    receiver.markUnknownExtent(mutation.shape.extentOpenSeams);
  } else {
    receiver.adjustExactLength(mutation.shape.exactLength);
  }
  if (!mutation.shape.hasExactElements) {
    receiver.markUnknownElements(mutation.shape.elementOpenSeams);
  }
  if (!mutation.shape.hasExactOrder) {
    receiver.markUnknownOrder(mutation.shape.orderOpenSeams);
  }
  const inserted = mutation.elements.map((element) => element.withRuntimeIndex(null));
  if (placement === 'append') {
    receiver.elements.push(...inserted);
  } else {
    receiver.elements.unshift(...inserted);
  }
}

interface ArrayNumericControlRead {
  readonly value: number | null;
  readonly openSeams: readonly EvaluationOpenSeam[];
}

interface ArrayRangeControlRead {
  readonly range: { readonly start: number; readonly end: number } | null;
  readonly openSeams: readonly EvaluationOpenSeam[];
}

function readArrayFillRange(
  arguments_: readonly EvaluationValueEvidence[],
  length: number,
): ArrayRangeControlRead {
  const startEvidence = arguments_[1] ?? null;
  const endEvidence = arguments_[2] ?? null;
  const openSeams = [
    ...(startEvidence?.openSeams ?? []),
    ...(endEvidence?.openSeams ?? []),
  ];
  if (openSeams.length > 0) {
    return { range: null, openSeams };
  }
  const start = startEvidence == null ? 0 : readSliceBound(startEvidence.value, length, 0);
  const end = endEvidence == null ? length : readSliceBound(endEvidence.value, length, length);
  return start == null || end == null
    ? { range: null, openSeams: [] }
    : {
        range: {
          start: Math.min(Math.max(start, 0), length),
          end: Math.min(Math.max(end, 0), length),
        },
        openSeams: [],
      };
}

function hasExactArrayMutationOrder(receiver: EvaluationArrayValue): boolean {
  return !receiver.mayHaveUnknownElements && !receiver.mayHaveUnknownOrder;
}

function readSpliceStart(
  arguments_: readonly EvaluationValueEvidence[],
  length: number,
): ArrayNumericControlRead {
  const evidence = arguments_[0] ?? null;
  if (evidence == null) {
    return { value: 0, openSeams: [] };
  }
  return {
    value: evidence.openSeams.length === 0 ? readArrayStartIndex(evidence.value, length) : null,
    openSeams: evidence.openSeams,
  };
}

function readSpliceDeleteCount(
  arguments_: readonly EvaluationValueEvidence[],
  start: number,
  length: number,
): ArrayNumericControlRead {
  const evidence = arguments_[1] ?? null;
  if (evidence == null) {
    return {
      value: arguments_.length === 0 ? 0 : length - start,
      openSeams: [],
    };
  }
  return {
    value: evidence.openSeams.length === 0
      ? readArraySpliceDeleteCount(evidence.value, start, length, arguments_.length > 0, true)
      : null,
    openSeams: evidence.openSeams,
  };
}

export function evaluateArrayOrStringSlice(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const receiverRead = evaluateClosedIntrinsicInput(
    frame.thisValue,
    call,
    host,
    'Array/String.slice receiver retained open pressure.',
  );
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  if (isBoundaryEvaluationValue(receiver)) {
    return boundaryIntrinsicCallValue(receiver, 'slice', call);
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array/String.slice argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (receiver.kind === EvaluationValueKind.Array) {
    if (receiver.mayHaveUnknownElements || receiver.mayHaveUnknownOrder) {
      return host.unknown('Array.slice receiver membership or order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
    }
    const rangeRead = readSliceRange(argumentRead.evidence, receiver.exactLength!);
    if (rangeRead.openSeams.length > 0) {
      return unknownFromEvidence(
        new EvaluationValueEvidence(EvaluationUndefined, rangeRead.openSeams),
        'Array.slice bounds retained open pressure.',
        call,
        host,
      );
    }
    return rangeRead.range == null
      ? host.unknown('Array.slice bounds did not reduce to static numbers.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
      : evaluationArraySlice(receiver, rangeRead.range.start, rangeRead.range.end, call);
  }
  if (receiver.kind === EvaluationValueKind.String) {
    const rangeRead = readSliceRange(argumentRead.evidence, receiver.value.length);
    if (rangeRead.openSeams.length > 0) {
      return unknownFromEvidence(
        new EvaluationValueEvidence(EvaluationUndefined, rangeRead.openSeams),
        'String.slice bounds retained open pressure.',
        call,
        host,
      );
    }
    return rangeRead.range == null
      ? host.unknown('String.slice bounds did not reduce to static numbers.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall)
      : new EvaluationStringValue(receiver.value.slice(rangeRead.range.start, rangeRead.range.end), call);
  }
  return host.unknown('slice receiver did not reduce to a known array or string.', frame.calleeNode, moduleKey, EvaluationOpenSeamKind.DynamicCall);
}

export function evaluateArrayIsArray(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.isArray argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const valueEvidence = argumentRead.evidence[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []);
  if (valueEvidence.openSeams.length > 0) {
    return unknownFromEvidence(valueEvidence, 'Array.isArray argument retained open pressure.', call, host);
  }
  const value = valueEvidence.value;
  if (value.kind === EvaluationValueKind.Unknown) {
    return value;
  }
  if (isBoundaryEvaluationValue(value)) {
    return boundaryIntrinsicCallValue(value, 'Array.isArray', call);
  }
  return new EvaluationBooleanValue(value.kind === EvaluationValueKind.Array, call);
}

export function evaluateArraySort(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'sort');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.sort argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (!hasExactArrayMutationOrder(receiver) || receiver.exactLength == null) {
    return host.unknown('Array.sort receiver membership or order did not close statically.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const sorted = sortArrayElements(call, receiver.elements, argumentRead.evidence, moduleKey, depth + 1, host);
  receiver.replaceElementOrder(sorted.elements, sorted.mayHaveUnknownOrder, sorted.orderOpenSeams);
  return receiver;
}

export function evaluateArrayToSorted(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey, depth } = frame;
  const receiverRead = evaluateArrayReceiver(frame, host, 'toSorted');
  if (receiverRead.kind !== 'known') {
    return receiverRead.value;
  }
  const receiver = receiverRead.value;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.toSorted argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  if (
    !hasExactArrayMutationOrder(receiver)
    || receiver.exactLength == null
    || receiver.exactLength > host.guardrails.maxLoopIterations
  ) {
    return host.unknown('Array.toSorted receiver positions exceed static closure or iteration guardrails.', call, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
  const dense = denseEvaluationArrayElements(receiver)!;
  const sorted = sortArrayElements(call, dense, argumentRead.evidence, moduleKey, depth + 1, host);
  const shape = sorted.mayHaveUnknownOrder
    ? receiver.shape.withUnknownOrder(sorted.orderOpenSeams, {
        kind: EvaluationArrayUncertaintyKind.UnknownOrder,
        node: call,
      })
    : EvaluationArrayShape.exact(receiver.exactLength);
  return new EvaluationArrayValue(sorted.elements, call, shape);
}

export function sortArrayElements(
  call: ts.CallExpression,
  elements: readonly EvaluationArrayElement[],
  arguments_: readonly EvaluationValueEvidence[],
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): {
  readonly elements: readonly EvaluationArrayElement[];
  readonly mayHaveUnknownOrder: boolean;
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];
} {
  const openOrder = (reason: string, node: ts.Node): readonly EvaluationOpenSeam[] => {
    const checkpoint = host.checkpoint();
    host.open(
      EvaluationOpenSeamKind.DynamicCall,
      reason,
      node,
      moduleKey,
      [OpenSeamReasonKind.StaticEvaluationDynamicCall],
    );
    return host.consumeOpenSeamsSince(checkpoint);
  };
  const compareEvidence = arguments_[0] ?? null;
  if (compareEvidence == null) {
    const orderOpenSeams: EvaluationOpenSeam[] = [];
    const sorted = evaluationArraySortedElements(
      elements,
      (left, right) => {
        if (left.openSeams.length > 0 || right.openSeams.length > 0) {
          orderOpenSeams.push(...left.openSeams, ...right.openSeams);
          return null;
        }
        const comparison = defaultEvaluationArraySortCompare(left, right);
        if (comparison == null) {
          orderOpenSeams.push(...openOrder(
            'Array.sort default comparison depended on unmodeled primitive coercion.',
            call,
          ));
        }
        return comparison;
      },
    );
    return { ...sorted, orderOpenSeams };
  }

  if (compareEvidence.openSeams.length > 0 || compareEvidence.value.kind !== EvaluationValueKind.Function) {
    host.replayOpenSeams(compareEvidence.openSeams);
    const orderOpenSeams = compareEvidence.openSeams.length > 0
      ? compareEvidence.openSeams
      : openOrder('Array.sort comparator did not reduce to a known function.', call);
    return {
      elements,
      mayHaveUnknownOrder: true,
      orderOpenSeams,
    };
  }
  const compareValue = compareEvidence.value;
  const callbackFrame = new IntrinsicCallbackFrame(host, call, moduleKey, depth + 1);
  const maximumComparisons = elements.length <= 1 ? 0 : elements.length * elements.length;
  if (!callbackFrame.admits(maximumComparisons)) {
    return {
      elements,
      mayHaveUnknownOrder: true,
      orderOpenSeams: openOrder(
        'Array.sort comparator exceeds the intrinsic callback guardrail.',
        call,
      ),
    };
  }

  const orderOpenSeams: EvaluationOpenSeam[] = [];
  const sorted = evaluationArraySortedElements(elements, (left, right) => {
    const result = callbackFrame.evaluate(
      compareValue,
      [
        new EvaluationValueEvidence(left.value, left.openSeams),
        new EvaluationValueEvidence(right.value, right.openSeams),
      ],
    );
    if (result.kind === IntrinsicCallbackEvaluationKind.BudgetExhausted) {
      orderOpenSeams.push(...openOrder(
        'Array.sort comparator evaluation exceeded the intrinsic callback budget.',
        call,
      ));
      return null;
    }
    orderOpenSeams.push(...result.evidence.openSeams);
    if (result.evidence.openSeams.length > 0) {
      return null;
    }
    if (result.evidence.value.kind !== EvaluationValueKind.Number) {
      orderOpenSeams.push(...openOrder(
        'Array.sort comparator result depended on unmodeled numeric coercion.',
        call,
      ));
      return null;
    }
    return result.evidence.value.value;
  });
  return { ...sorted, orderOpenSeams };
}

export function evaluateArrayOf(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    moduleKey,
    host,
    'Array.of argument list did not close.',
  );
  return argumentRead.kind === 'open'
    ? argumentRead.value
    : new EvaluationArrayValue(argumentRead.argumentList.elements, call, argumentRead.argumentList.shape);
}

function evaluateOpenArrayEndRemoval(
  receiver: EvaluationArrayValue,
  method: 'pop' | 'shift',
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  if (receiver.exactLength === 0) {
    return EvaluationUndefined;
  }
  if (receiver.exactLength == null) {
    return openArrayMutationShape(
      receiver,
      `Array.${method} receiver extent did not close statically.`,
      call,
      moduleKey,
      host,
    );
  }
  let openSeams = receiver.aggregateOpenSeams;
  if (openSeams.length === 0) {
    const checkpoint = host.checkpoint();
    host.open(
      EvaluationOpenSeamKind.DynamicCall,
      `Array.${method} receiver membership or order did not close statically.`,
      call,
      moduleKey,
      [OpenSeamReasonKind.StaticEvaluationDynamicCall],
    );
    openSeams = host.consumeOpenSeamsSince(checkpoint);
  }
  receiver.adjustExactLength(-1);
  receiver.markUnknownElements(openSeams);
  receiver.markUnknownOrder(openSeams);
  return unknownFromEvidence(
    new EvaluationValueEvidence(EvaluationUndefined, openSeams),
    `Array.${method} removed value retained open pressure.`,
    call,
    host,
  );
}
