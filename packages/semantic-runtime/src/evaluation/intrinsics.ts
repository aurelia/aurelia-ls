import ts from 'typescript';
import type { ModuleEnvironmentRecord } from './environment.js';
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
  evaluateArrayOrStringSlice,
  evaluateArrayPop,
  evaluateArrayPush,
  evaluateArrayReduce,
  evaluateArrayReverse,
  evaluateArrayShift,
  evaluateArraySome,
  evaluateArraySort,
  evaluateArraySplice,
  evaluateArrayUnshift,
} from './intrinsics/array-intrinsics.js';
import {
  evaluateCollectionDelete,
  evaluateCollectionHas,
  evaluateMapConstructor,
  evaluateMapGet,
  evaluateMapSet,
  evaluateSetAdd,
  evaluateSetConstructor,
} from './intrinsics/collection-intrinsics.js';
import type { StaticIntrinsicEvaluationHost } from './intrinsics/contracts.js';
import { evaluateDynamicImport, evaluateCommonJsRequire } from './intrinsics/module-intrinsics.js';
import {
  evaluateObjectAssign,
  evaluateObjectEntries,
  evaluateObjectFromEntries,
  evaluateObjectKeys,
  evaluateObjectValues,
} from './intrinsics/object-intrinsics.js';
import { evaluatePromiseContinuation, evaluatePromiseThen } from './intrinsics/promise-intrinsics.js';
import { evaluateRegExpCall, evaluateRegExpConstructor } from './intrinsics/regexp-intrinsics.js';
import {
  evaluateStringCall,
  evaluateStringLocaleCompare,
  evaluateStringPredicate,
  evaluateStringReplace,
  evaluateStringSplit,
  evaluateStringTransform,
} from './intrinsics/string-intrinsics.js';
import type { EvaluationValue } from './values.js';
import { readCallCalleeText, unwrapExpression } from './ts-syntax.js';

export type {
  StaticIntrinsicEvaluationCheckpoint,
  StaticIntrinsicEvaluationHost,
} from './intrinsics/contracts.js';

export function evaluateKnownConstructor(
  expression: ts.NewExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const constructorName = readCallCalleeText(expression.expression);
  switch (constructorName) {
    case 'Set':
      return evaluateSetConstructor(expression, environment, moduleKey, depth + 1, host, false);
    case 'WeakSet':
      return evaluateSetConstructor(expression, environment, moduleKey, depth + 1, host, true);
    case 'Map':
      return evaluateMapConstructor(expression, environment, moduleKey, depth + 1, host, false);
    case 'WeakMap':
      return evaluateMapConstructor(expression, environment, moduleKey, depth + 1, host, true);
    case 'Array':
      return evaluateArrayConstructor(expression, environment, moduleKey, depth + 1, host);
    case 'RegExp':
      return evaluateRegExpConstructor(expression, environment, moduleKey, depth + 1, host);
    default:
      return null;
  }
}

export function evaluateKnownIntrinsic(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const hostValue = host.evaluateCallExpression(call, environment, moduleKey, depth, host);
  if (hostValue != null) {
    return hostValue;
  }

  const calleeText = readCallCalleeText(call.expression);
  if (call.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return evaluateDynamicImport(call, moduleKey, host);
  }
  if (calleeText === 'require') {
    return evaluateCommonJsRequire(call, moduleKey, host);
  }

  const staticIntrinsic = evaluateStaticIntrinsicCall(call, calleeText, environment, moduleKey, depth, host);
  if (staticIntrinsic != null) {
    return staticIntrinsic;
  }

  const callee = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(callee)
    ? evaluatePrototypeIntrinsicCall(call, callee.name.text, callee.expression, environment, moduleKey, depth, host)
    : null;
}

function evaluateStaticIntrinsicCall(
  call: ts.CallExpression,
  calleeText: string | null,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  if (calleeText === 'RegExp') {
    return evaluateRegExpCall(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'String') {
    return evaluateStringCall(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Array.isArray') {
    return evaluateArrayIsArray(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Array.from') {
    return evaluateArrayFrom(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Object.freeze' && call.arguments[0] != null) {
    return host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  }
  if (calleeText === 'Object.assign') {
    return evaluateObjectAssign(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Object.values') {
    return evaluateObjectValues(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Object.keys') {
    return evaluateObjectKeys(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Object.entries') {
    return evaluateObjectEntries(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Object.fromEntries') {
    return evaluateObjectFromEntries(call, environment, moduleKey, depth + 1, host);
  }
  if (calleeText === 'Array.of') {
    return evaluateArrayOf(call, environment, moduleKey, depth + 1, host);
  }
  return null;
}

function evaluatePrototypeIntrinsicCall(
  call: ts.CallExpression,
  methodName: string,
  receiverExpression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  switch (methodName) {
    case 'concat':
      return evaluateArrayConcat(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'map':
      return evaluateArrayMap(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'flatMap':
      return evaluateArrayFlatMap(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'filter':
      return evaluateArrayFilter(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'find':
      return evaluateArrayFind(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'findIndex':
      return evaluateArrayFindIndex(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'some':
      return evaluateArraySome(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'every':
      return evaluateArrayEvery(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'forEach':
      return evaluateArrayForEach(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'reduce':
      return evaluateArrayReduce(call, receiverExpression, environment, moduleKey, depth + 1, host, false);
    case 'reduceRight':
      return evaluateArrayReduce(call, receiverExpression, environment, moduleKey, depth + 1, host, true);
    case 'includes':
      return evaluateArrayOrStringIncludes(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'indexOf':
      return evaluateArrayIndexOf(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'join':
      return evaluateArrayJoin(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'flat':
      return evaluateArrayFlat(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'fill':
      return evaluateArrayFill(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'push':
      return evaluateArrayPush(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'unshift':
      return evaluateArrayUnshift(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'pop':
      return evaluateArrayPop(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'shift':
      return evaluateArrayShift(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'reverse':
      return evaluateArrayReverse(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'splice':
      return evaluateArraySplice(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'slice':
      return evaluateArrayOrStringSlice(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'toUpperCase':
      return evaluateStringTransform(call, receiverExpression, environment, moduleKey, depth + 1, host, 'toUpperCase');
    case 'toLowerCase':
      return evaluateStringTransform(call, receiverExpression, environment, moduleKey, depth + 1, host, 'toLowerCase');
    case 'trim':
      return evaluateStringTransform(call, receiverExpression, environment, moduleKey, depth + 1, host, 'trim');
    case 'startsWith':
    case 'endsWith':
      return evaluateStringPredicate(call, receiverExpression, environment, moduleKey, depth + 1, host, methodName);
    case 'split':
      return evaluateStringSplit(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'replace':
    case 'replaceAll':
      return evaluateStringReplace(call, receiverExpression, environment, moduleKey, depth + 1, host, methodName);
    case 'sort':
      return evaluateArraySort(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'localeCompare':
      return evaluateStringLocaleCompare(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'get':
      return evaluateMapGet(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'set':
      return evaluateMapSet(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'has':
      return evaluateCollectionHas(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'add':
      return evaluateSetAdd(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'delete':
      return evaluateCollectionDelete(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'then':
      return evaluatePromiseThen(call, receiverExpression, environment, moduleKey, depth + 1, host);
    case 'catch':
    case 'finally':
      return evaluatePromiseContinuation(call, receiverExpression, environment, moduleKey, depth + 1, host);
  }
  return null;
}
