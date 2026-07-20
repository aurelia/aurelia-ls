import ts from 'typescript';
import type { StaticInvocationFrame } from './invocation.js';
import {
  evaluateArrayConcat,
  evaluateArrayConstructor,
  evaluateArrayEvery,
  evaluateArrayFill,
  evaluateArrayFilter,
  evaluateArrayFind,
  evaluateArrayFindIndex,
  evaluateArrayFlat,
  evaluateArrayFlatMap,
  evaluateArrayForEach,
  evaluateArrayFrom,
  evaluateArrayIndexOf,
  evaluateArrayIsArray,
  evaluateArrayJoin,
  evaluateArrayMap,
  evaluateArrayOf,
  evaluateArrayOrStringIncludes,
  evaluateArrayOrStringAt,
  evaluateArrayOrStringSlice,
  evaluateArrayPop,
  evaluateArrayPush,
  evaluateArrayReduce,
  evaluateArrayReverse,
  evaluateArrayShift,
  evaluateArraySome,
  evaluateArraySort,
  evaluateArraySplice,
  evaluateArrayToReversed,
  evaluateArrayToSorted,
  evaluateArrayUnshift,
  evaluateArrayToSpliced,
  evaluateArrayWith,
} from './intrinsics/array-intrinsics.js';
import {
  evaluateCollectionClear,
  evaluateCollectionDelete,
  evaluateCollectionHas,
  evaluateMapConstructor,
  evaluateMapGet,
  evaluateMapSet,
  evaluateSetAdd,
  evaluateSetConstructor,
} from './intrinsics/collection-intrinsics.js';
import type { StaticIntrinsicEvaluationHost } from './intrinsics/contracts.js';
import {
  StaticGlobalIntrinsicEvaluationKind,
  evaluateStaticGlobalCall,
  evaluateStaticGlobalConstructor,
  evaluateStaticGlobalMemberCallFromPath,
  isStaticGlobalMemberCallReceiverPath,
} from './global-intrinsics.js';
import { isStaticEvaluationGlobalName } from '../expression/global-names.js';
import { evaluateDynamicImport, evaluateCommonJsRequire } from './intrinsics/module-intrinsics.js';
import {
  evaluateObjectAssign,
  evaluateObjectEntries,
  evaluateObjectFromEntries,
  evaluateObjectKeys,
  evaluateObjectValues,
} from './intrinsics/object-intrinsics.js';
import {
  evaluatePromiseCatch,
  evaluatePromiseFinally,
  evaluatePromiseReject,
  evaluatePromiseResolve,
  evaluatePromiseThen,
} from './intrinsics/promise-intrinsics.js';
import { evaluateRegExpCall, evaluateRegExpConstructor } from './intrinsics/regexp-intrinsics.js';
import { evaluatePositionalIntrinsicArguments } from './intrinsics/shared.js';
import {
  evaluateStringCall,
  evaluateStringAt,
  evaluateStringLocaleCompare,
  evaluateStringPad,
  evaluateStringPredicate,
  evaluateStringReplace,
  evaluateStringRepeat,
  evaluateStringSplit,
  evaluateStringSubstring,
  evaluateStringTransform,
} from './intrinsics/string-intrinsics.js';
import { EvaluationOpenSeamKind } from './seams.js';
import {
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from './values.js';

export type {
  StaticIntrinsicEvaluationCheckpoint,
  StaticIntrinsicEvaluationHost,
} from './intrinsics/contracts.js';

export function evaluateKnownConstructor(
  frame: StaticInvocationFrame<ts.NewExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const constructorName = invocationBoundaryPath(frame.callee.value);
  switch (constructorName) {
    case 'Set':
      return evaluateSetConstructor(frame, host, false);
    case 'WeakSet':
      return evaluateSetConstructor(frame, host, true);
    case 'Map':
      return evaluateMapConstructor(frame, host, false);
    case 'WeakMap':
      return evaluateMapConstructor(frame, host, true);
    case 'Array':
      return evaluateArrayConstructor(frame, host);
    case 'RegExp':
      return evaluateRegExpConstructor(frame, host);
    default:
      return evaluateGlobalIntrinsicConstructor(frame, constructorName, host);
  }
}

function evaluateGlobalIntrinsicConstructor(
  frame: StaticInvocationFrame<ts.NewExpression>,
  constructorName: string | null,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const expression = frame.node;
  if (constructorName == null || !isStaticEvaluationGlobalName(constructorName)) {
    return null;
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    expression,
    frame.moduleKey,
    host,
    'Global constructor argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const argumentEvidence = argumentRead.evidence;
  const argumentOpenSeams = argumentEvidence.flatMap((argument) => argument.openSeams);
  if (argumentOpenSeams.length > 0) {
    host.replayOpenSeams(argumentOpenSeams);
    return new EvaluationUnknownValue('Global constructor arguments retained open pressure.', expression, true);
  }
  const argumentValues = argumentEvidence.map((argument) => argument.value);
  const result = evaluateStaticGlobalConstructor(constructorName, argumentValues, expression);
  switch (result.kind) {
    case StaticGlobalIntrinsicEvaluationKind.Value:
      return result.value;
    case StaticGlobalIntrinsicEvaluationKind.RuntimeOpen:
      return host.unknown(result.reason, expression, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall);
    case StaticGlobalIntrinsicEvaluationKind.Unsupported:
      return host.unknown(result.reason, expression, frame.moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
  }
}

export function evaluateKnownIntrinsic(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const calleePath = invocationBoundaryPath(frame.callee.value);
  if (calleePath === 'import') {
    return evaluateDynamicImport(frame, host);
  }
  if (calleePath === 'require') {
    return evaluateCommonJsRequire(frame, host);
  }

  const staticIntrinsic = evaluateStaticIntrinsicCall(frame, calleePath, host);
  if (staticIntrinsic != null) {
    return staticIntrinsic;
  }

  const globalIntrinsic = evaluateGlobalIntrinsicCall(frame, calleePath, host);
  if (globalIntrinsic != null) {
    return globalIntrinsic;
  }

  return calleePath == null || frame.thisValue == null || frame.propertyKey == null
    ? null
    : evaluatePrototypeIntrinsicCall(frame, frame.propertyKey, host);
}

function evaluateGlobalIntrinsicCall(
  frame: StaticInvocationFrame<ts.CallExpression>,
  calleeText: string | null,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const call = frame.node;
  if (calleeText == null) {
    return null;
  }
  const memberDot = calleeText.lastIndexOf('.');
  const receiverPath = memberDot < 0 ? null : calleeText.slice(0, memberDot);
  if (
    memberDot < 0
      ? !isStaticEvaluationGlobalName(calleeText)
      : receiverPath == null || !isStaticGlobalMemberCallReceiverPath(receiverPath)
  ) {
    return null;
  }
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    call,
    frame.moduleKey,
    host,
    'Global intrinsic argument list did not close.',
  );
  if (argumentRead.kind === 'open') {
    return argumentRead.value;
  }
  const argumentEvidence = argumentRead.evidence;
  const argumentOpenSeams = argumentEvidence.flatMap((argument) => argument.openSeams);
  if (argumentOpenSeams.length > 0) {
    host.replayOpenSeams(argumentOpenSeams);
    return new EvaluationUnknownValue('Global intrinsic arguments retained open pressure.', call, true);
  }
  const argumentValues = argumentEvidence.map((argument) => argument.value);
  const result = memberDot < 0
    ? evaluateStaticGlobalCall(calleeText, argumentValues, call)
    : evaluateStaticGlobalMemberCallFromPath(
      receiverPath!,
      calleeText.slice(memberDot + 1),
      argumentValues,
      call,
    );
  if (result == null) {
    return null;
  }
  switch (result.kind) {
    case StaticGlobalIntrinsicEvaluationKind.Value:
      return result.value;
    case StaticGlobalIntrinsicEvaluationKind.RuntimeOpen:
      return host.unknown(result.reason, call, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall);
    case StaticGlobalIntrinsicEvaluationKind.Unsupported:
      return host.unknown(result.reason, call, frame.moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
  }
}

function evaluateStaticIntrinsicCall(
  frame: StaticInvocationFrame<ts.CallExpression>,
  calleeText: string | null,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const call = frame.node;
  if (calleeText === 'RegExp') {
    return evaluateRegExpCall(frame, host);
  }
  if (calleeText === 'String') {
    return evaluateStringCall(frame, host);
  }
  if (calleeText === 'Array.isArray') {
    return evaluateArrayIsArray(frame, host);
  }
  if (calleeText === 'Array.from') {
    return evaluateArrayFrom(frame, host);
  }
  if (calleeText === 'Object.freeze') {
    const argumentRead = evaluatePositionalIntrinsicArguments(
      frame.argumentList,
      call,
      frame.moduleKey,
      host,
      'Object.freeze argument list did not close.',
    );
    return argumentRead.kind === 'open'
      ? argumentRead.value
      : argumentRead.evidence[0]?.value ?? null;
  }
  if (calleeText === 'Object.assign') {
    return evaluateObjectAssign(frame, host);
  }
  if (calleeText === 'Object.values') {
    return evaluateObjectValues(frame, host);
  }
  if (calleeText === 'Object.keys') {
    return evaluateObjectKeys(frame, host);
  }
  if (calleeText === 'Object.entries') {
    return evaluateObjectEntries(frame, host);
  }
  if (calleeText === 'Object.fromEntries') {
    return evaluateObjectFromEntries(frame, host);
  }
  if (calleeText === 'Array.of') {
    return evaluateArrayOf(frame, host);
  }
  if (calleeText === 'Promise.resolve') {
    return evaluatePromiseResolve(frame, host);
  }
  if (calleeText === 'Promise.reject') {
    return evaluatePromiseReject(frame, host);
  }
  return null;
}

function evaluatePrototypeIntrinsicCall(
  frame: StaticInvocationFrame<ts.CallExpression>,
  methodName: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  switch (methodName) {
    case 'concat':
      return evaluateArrayConcat(frame, host);
    case 'map':
      return evaluateArrayMap(frame, host);
    case 'flatMap':
      return evaluateArrayFlatMap(frame, host);
    case 'filter':
      return evaluateArrayFilter(frame, host);
    case 'find':
      return evaluateArrayFind(frame, host, false);
    case 'findLast':
      return evaluateArrayFind(frame, host, true);
    case 'findIndex':
      return evaluateArrayFindIndex(frame, host, false);
    case 'findLastIndex':
      return evaluateArrayFindIndex(frame, host, true);
    case 'some':
      return evaluateArraySome(frame, host);
    case 'every':
      return evaluateArrayEvery(frame, host);
    case 'forEach':
      return evaluateArrayForEach(frame, host);
    case 'reduce':
      return evaluateArrayReduce(frame, host, false);
    case 'reduceRight':
      return evaluateArrayReduce(frame, host, true);
    case 'includes':
      return evaluateArrayOrStringIncludes(frame, host);
    case 'indexOf':
      return evaluateArrayIndexOf(frame, host, false);
    case 'lastIndexOf':
      return evaluateArrayIndexOf(frame, host, true);
    case 'join':
      return evaluateArrayJoin(frame, host);
    case 'flat':
      return evaluateArrayFlat(frame, host);
    case 'fill':
      return evaluateArrayFill(frame, host);
    case 'push':
      return evaluateArrayPush(frame, host);
    case 'unshift':
      return evaluateArrayUnshift(frame, host);
    case 'pop':
      return evaluateArrayPop(frame, host);
    case 'shift':
      return evaluateArrayShift(frame, host);
    case 'reverse':
      return evaluateArrayReverse(frame, host);
    case 'toReversed':
      return evaluateArrayToReversed(frame, host);
    case 'toSpliced':
      return evaluateArrayToSpliced(frame, host);
    case 'with':
      return evaluateArrayWith(frame, host);
    case 'splice':
      return evaluateArraySplice(frame, host);
    case 'slice':
      return evaluateArrayOrStringSlice(frame, host);
    case 'at':
      return evaluateArrayOrStringAt(frame, host);
    case 'charAt':
      return evaluateStringAt(frame, host, 'charAt');
    case 'charCodeAt':
      return evaluateStringAt(frame, host, 'charCodeAt');
    case 'repeat':
      return evaluateStringRepeat(frame, host);
    case 'padStart':
    case 'padEnd':
      return evaluateStringPad(frame, host, methodName);
    case 'substring':
      return evaluateStringSubstring(frame, host);
    case 'toUpperCase':
      return evaluateStringTransform(frame, host, 'toUpperCase');
    case 'toLowerCase':
      return evaluateStringTransform(frame, host, 'toLowerCase');
    case 'trim':
      return evaluateStringTransform(frame, host, 'trim');
    case 'startsWith':
    case 'endsWith':
      return evaluateStringPredicate(frame, host, methodName);
    case 'split':
      return evaluateStringSplit(frame, host);
    case 'replace':
    case 'replaceAll':
      return evaluateStringReplace(frame, host, methodName);
    case 'sort':
      return evaluateArraySort(frame, host);
    case 'toSorted':
      return evaluateArrayToSorted(frame, host);
    case 'localeCompare':
      return evaluateStringLocaleCompare(frame, host);
    case 'get':
      return evaluateMapGet(frame, host);
    case 'set':
      return evaluateMapSet(frame, host);
    case 'has':
      return evaluateCollectionHas(frame, host);
    case 'add':
      return evaluateSetAdd(frame, host);
    case 'delete':
      return evaluateCollectionDelete(frame, host);
    case 'clear':
      return evaluateCollectionClear(frame, host);
    case 'then':
      return evaluatePromiseThen(frame, host);
    case 'catch':
      return evaluatePromiseCatch(frame, host);
    case 'finally':
      return evaluatePromiseFinally(frame, host);
  }
  return null;
}

function invocationBoundaryPath(
  value: EvaluationValue,
): string | null {
  return value.kind === EvaluationValueKind.BoundaryValue
    || value.kind === EvaluationValueKind.BoundaryObject
    ? value.path
    : null;
}
