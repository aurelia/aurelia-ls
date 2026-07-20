import type ts from 'typescript';
import {
  StaticEvaluationGlobalName,
  isStaticEvaluationCallableGlobalName,
  isStaticEvaluationGlobalName,
} from '../expression/global-names.js';
import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayValue,
  EvaluationBigIntValue,
  EvaluationBooleanValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationDateValue,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationRegularExpressionValue,
  EvaluationSetElement,
  EvaluationSetValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  type EvaluationValue,
} from './values.js';
import { readEvaluationEnumerableOwnEntries } from './enumerable-own-properties.js';
import { DefaultStaticEvaluationGuardrails } from './policy.js';
import {
  isValidEvaluationArrayLength,
} from './array-value-operations.js';
import { evaluationIteratorProjection } from './iterator-projection.js';
import {
  addEvaluationSetElement,
  setEvaluationMapEntry,
} from './keyed-collection-operations.js';
import { EvaluationValueEvidence } from './value-pressure.js';
import {
  regularExpressionFlagsText,
  regularExpressionPatternText,
} from './intrinsics/regexp-intrinsics.js';
import { stringCoercionText } from './intrinsics/shared.js';

export const enum StaticGlobalIntrinsicEvaluationKind {
  /** The admitted global expression reduced to an evaluator-local value. */
  Value = 'value',
  /** The admitted global expression is valid but depends on host runtime state. */
  RuntimeOpen = 'runtime-open',
  /** The admitted global expression is outside the currently modeled intrinsic set. */
  Unsupported = 'unsupported',
}

export type StaticGlobalIntrinsicEvaluation =
  | {
    readonly kind: StaticGlobalIntrinsicEvaluationKind.Value;
    readonly value: EvaluationValue;
  }
  | {
    readonly kind: StaticGlobalIntrinsicEvaluationKind.RuntimeOpen;
    readonly reason: string;
  }
  | {
    readonly kind: StaticGlobalIntrinsicEvaluationKind.Unsupported;
    readonly reason: string;
  };

/** Returns the evaluator value for a modeled ECMAScript global identifier. */
export function evaluateStaticGlobalAccess(
  name: string,
  node: ts.Node | null = null,
): EvaluationValue | null {
  switch (name) {
    case StaticEvaluationGlobalName.Infinity:
      return new EvaluationNumberValue(Infinity, node);
    case StaticEvaluationGlobalName.NaN:
      return new EvaluationNumberValue(NaN, node);
    case StaticEvaluationGlobalName.Math:
      return mathGlobalObject(node);
    case StaticEvaluationGlobalName.JSON:
      return hostGlobalObject(name, node);
    case StaticEvaluationGlobalName.Array:
    case StaticEvaluationGlobalName.BigInt:
    case StaticEvaluationGlobalName.Boolean:
    case StaticEvaluationGlobalName.Date:
    case StaticEvaluationGlobalName.Map:
    case StaticEvaluationGlobalName.WeakMap:
    case StaticEvaluationGlobalName.Number:
    case StaticEvaluationGlobalName.Object:
    case StaticEvaluationGlobalName.Promise:
    case StaticEvaluationGlobalName.RegExp:
    case StaticEvaluationGlobalName.Set:
    case StaticEvaluationGlobalName.WeakSet:
    case StaticEvaluationGlobalName.String:
    case StaticEvaluationGlobalName.Intl:
      return hostGlobalObject(name, node);
    default:
      if (!isStaticEvaluationGlobalName(name)) {
        return null;
      }
      return isStaticEvaluationCallableGlobalName(name)
        ? hostGlobalObject(name, node)
        : new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, name, node);
  }
}

/** Evaluates a modeled ECMAScript global call when the host function is static enough. */
export function evaluateStaticGlobalCall(
  name: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null = null,
): StaticGlobalIntrinsicEvaluation {
  switch (name) {
    case StaticEvaluationGlobalName.String:
      return stringGlobalCall(argumentValues, node);
    case StaticEvaluationGlobalName.Number:
      return numberGlobalCall(argumentValues, node);
    case StaticEvaluationGlobalName.Boolean:
      return booleanGlobalCall(argumentValues, node);
    case StaticEvaluationGlobalName.BigInt:
      return bigIntGlobalCall(argumentValues, node);
    case StaticEvaluationGlobalName.RegExp:
      return regexpGlobalCall(argumentValues, node);
    case StaticEvaluationGlobalName.Array:
      return arrayConstructorValue(argumentValues, node);
    case StaticEvaluationGlobalName.IsNaN:
      return numberPredicateGlobalCall(name, argumentValues, Number.isNaN, node);
    case StaticEvaluationGlobalName.IsFinite:
      return numberPredicateGlobalCall(name, argumentValues, Number.isFinite, node);
    case StaticEvaluationGlobalName.ParseFloat:
      return parseNumberGlobalCall(name, argumentValues, (text) => Number.parseFloat(text), node);
    case StaticEvaluationGlobalName.ParseInt:
      return parseIntGlobalCall(argumentValues, node);
    case StaticEvaluationGlobalName.EncodeURI:
      return uriGlobalCall(name, argumentValues, encodeURI, node);
    case StaticEvaluationGlobalName.EncodeURIComponent:
      return uriGlobalCall(name, argumentValues, encodeURIComponent, node);
    case StaticEvaluationGlobalName.DecodeURI:
      return uriGlobalCall(name, argumentValues, decodeURI, node);
    case StaticEvaluationGlobalName.DecodeURIComponent:
      return uriGlobalCall(name, argumentValues, decodeURIComponent, node);
    case StaticEvaluationGlobalName.Date:
      return runtimeOpen('Date() depends on host clock and locale state.');
    case StaticEvaluationGlobalName.JSON:
      return runtimeOpen('JSON is a host namespace object, not a global function.');
    case StaticEvaluationGlobalName.Map:
    case StaticEvaluationGlobalName.WeakMap:
    case StaticEvaluationGlobalName.Set:
    case StaticEvaluationGlobalName.WeakSet:
    case StaticEvaluationGlobalName.Promise:
    case StaticEvaluationGlobalName.Object:
    case StaticEvaluationGlobalName.Math:
    case StaticEvaluationGlobalName.Intl:
      return runtimeOpen(`Global '${name}' call depends on host constructor or namespace semantics.`);
    default:
      return unsupported(`Global '${name}' is not in the modeled static intrinsic set.`);
  }
}

/** Evaluates `new` over a modeled ECMAScript global constructor when construction is static enough. */
export function evaluateStaticGlobalConstructor(
  name: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null = null,
): StaticGlobalIntrinsicEvaluation {
  switch (name) {
    case StaticEvaluationGlobalName.Array:
      return arrayConstructorValue(argumentValues, node);
    case StaticEvaluationGlobalName.RegExp:
      return regexpGlobalCall(argumentValues, node);
    case StaticEvaluationGlobalName.Set:
      return setConstructorValue(argumentValues, node);
    case StaticEvaluationGlobalName.Map:
      return mapConstructorValue(argumentValues, node);
    case StaticEvaluationGlobalName.Object:
      return objectConstructorValue(argumentValues, node);
    case StaticEvaluationGlobalName.Date:
      return dateConstructorValue(argumentValues, node);
    case StaticEvaluationGlobalName.String:
    case StaticEvaluationGlobalName.Number:
    case StaticEvaluationGlobalName.Boolean:
    case StaticEvaluationGlobalName.BigInt:
      return runtimeOpen(`new ${name}(...) produces a host wrapper object outside local value reduction.`);
    default:
      return unsupported(`Global constructor '${name}' is not modeled as a static host intrinsic.`);
  }
}

/** Evaluates calls on known modeled global namespace receivers. */
export function evaluateStaticGlobalMemberCall(
  receiver: EvaluationValue,
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null = null,
): StaticGlobalIntrinsicEvaluation | null {
  const path = hostGlobalPath(receiver);
  if (path == null) {
    return null;
  }
  return evaluateStaticGlobalMemberCallFromPath(path, memberName, argumentValues, node);
}

/** Evaluates a host-global member call by boundary path, shared by TS and Aurelia-expression evaluators. */
export function evaluateStaticGlobalMemberCallFromPath(
  receiverPath: string,
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null = null,
): StaticGlobalIntrinsicEvaluation | null {
  switch (receiverPath) {
    case StaticEvaluationGlobalName.Math:
      return mathGlobalMemberCall(memberName, argumentValues, node);
    case StaticEvaluationGlobalName.JSON:
      return jsonGlobalMemberCall(memberName, argumentValues, node);
    case StaticEvaluationGlobalName.Object:
      return objectGlobalMemberCall(memberName, argumentValues, node);
    case StaticEvaluationGlobalName.Array:
      return arrayGlobalMemberCall(memberName, argumentValues, node);
    case StaticEvaluationGlobalName.Number:
      return numberGlobalMemberCall(memberName, argumentValues, node);
    case 'Object.prototype.toString':
      return memberName === 'call'
        ? objectPrototypeToStringCall(argumentValues, node)
        : unsupported(`Object.prototype.toString.${memberName} is not modeled as a host global intrinsic.`);
    default:
      return null;
  }
}

/** Whether a dotted callee receiver is one of the namespace paths modeled by the shared global intrinsic evaluator. */
export function isStaticGlobalMemberCallReceiverPath(receiverPath: string): boolean {
  switch (receiverPath) {
    case StaticEvaluationGlobalName.Math:
    case StaticEvaluationGlobalName.JSON:
    case StaticEvaluationGlobalName.Object:
    case StaticEvaluationGlobalName.Array:
    case StaticEvaluationGlobalName.Number:
    case 'Object.prototype.toString':
      return true;
    default:
      return false;
  }
}

function stringGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const text = stringCoercionText(argumentValues[0] ?? EvaluationUndefined);
  return text == null
    ? runtimeOpen('String(...) argument depends on a runtime value.')
    : value(new EvaluationStringValue(text, node));
}

function numberGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const number = numberCoercion(argumentValues[0] ?? EvaluationUndefined);
  return number == null
    ? runtimeOpen('Number(...) argument depends on a runtime value.')
    : value(new EvaluationNumberValue(number, node));
}

function booleanGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const truthy = readEvaluationTruthiness(argumentValues[0] ?? EvaluationUndefined);
  return truthy == null
    ? runtimeOpen('Boolean(...) argument depends on a runtime value.')
    : value(new EvaluationBooleanValue(truthy, node));
}

function bigIntGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const primitive = primitiveHostValue(argumentValues[0] ?? EvaluationUndefined);
  if (primitive === unknownPrimitiveHostValue) {
    return runtimeOpen('BigInt(...) argument depends on a runtime value.');
  }
  if (primitive == null) {
    return runtimeOpen('BigInt(...) argument throws for the statically known value.');
  }
  try {
    return value(new EvaluationBigIntValue(`${BigInt(primitive)}n`, node));
  } catch {
    return runtimeOpen('BigInt(...) argument throws for the statically known value.');
  }
}

function regexpGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const pattern = regularExpressionPatternText(argumentValues[0] ?? EvaluationUndefined);
  const flags = argumentValues[1] == null || argumentValues[1].kind === EvaluationValueKind.Undefined
    ? argumentValues[0]?.kind === EvaluationValueKind.RegularExpression ? argumentValues[0].flags : ''
    : regularExpressionFlagsText(argumentValues[1]);
  if (pattern == null || flags == null) {
    return runtimeOpen('RegExp(...) pattern or flags depend on runtime values.');
  }
  try {
    new RegExp(pattern, flags);
  } catch {
    return runtimeOpen('RegExp(...) pattern or flags throw for the statically known values.');
  }
  return value(new EvaluationRegularExpressionValue(pattern, flags, node));
}

function dateConstructorValue(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  if (argumentValues.length === 0) {
    return runtimeOpen('new Date() depends on host clock state.');
  }
  if (argumentValues.length !== 1) {
    return runtimeOpen('new Date(year, month, ...) depends on host local time-zone semantics.');
  }
  const epoch = dateEpochMilliseconds(argumentValues[0]!);
  return epoch == null
    ? runtimeOpen('new Date(...) argument does not reduce to a deterministic date value.')
    : value(new EvaluationDateValue(epoch, node));
}

function dateEpochMilliseconds(
  argumentValue: EvaluationValue,
): number | null {
  if (argumentValue.kind === EvaluationValueKind.Number) {
    return Number.isFinite(argumentValue.value) ? argumentValue.value : null;
  }
  if (argumentValue.kind !== EvaluationValueKind.String) {
    return null;
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(argumentValue.value);
  if (dateOnly != null) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const epoch = Date.UTC(year, month - 1, day);
    const parsed = new Date(epoch);
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day
      ? epoch
      : null;
  }
  if (!/\dT.*(?:Z|[+-]\d{2}:\d{2})$/.test(argumentValue.value)) {
    return null;
  }
  const epoch = Date.parse(argumentValue.value);
  return Number.isFinite(epoch) ? epoch : null;
}

function numberPredicateGlobalCall(
  name: string,
  argumentValues: readonly EvaluationValue[],
  predicate: (value: number) => boolean,
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const number = numberCoercion(argumentValues[0] ?? EvaluationUndefined);
  return number == null
    ? runtimeOpen(`${name}(...) argument depends on a runtime value.`)
    : value(new EvaluationBooleanValue(predicate(number), node));
}

function parseNumberGlobalCall(
  name: string,
  argumentValues: readonly EvaluationValue[],
  parse: (text: string) => number,
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const text = stringCoercionText(argumentValues[0] ?? EvaluationUndefined);
  return text == null
    ? runtimeOpen(`${name}(...) argument depends on a runtime value.`)
    : value(new EvaluationNumberValue(parse(text), node));
}

function parseIntGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const text = stringCoercionText(argumentValues[0] ?? EvaluationUndefined);
  const radix = argumentValues[1] == null || argumentValues[1].kind === EvaluationValueKind.Undefined
    ? undefined
    : numberCoercion(argumentValues[1]);
  if (text == null || radix === null) {
    return runtimeOpen('parseInt(...) arguments depend on runtime values.');
  }
  return value(new EvaluationNumberValue(Number.parseInt(text, radix), node));
}

function uriGlobalCall(
  name: string,
  argumentValues: readonly EvaluationValue[],
  operation: (value: string) => string,
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const text = stringCoercionText(argumentValues[0] ?? EvaluationUndefined);
  if (text == null) {
    return runtimeOpen(`${name}(...) argument depends on a runtime value.`);
  }
  try {
    return value(new EvaluationStringValue(operation(text), node));
  } catch {
    return runtimeOpen(`${name}(...) throws for the statically known value.`);
  }
}

function mathGlobalMemberCall(
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const operation = mathNumberOperation(memberName);
  if (operation == null) {
    return memberName === 'random'
      ? runtimeOpen('Math.random() depends on host entropy.')
      : unsupported(`Math.${memberName} is not modeled as a host global intrinsic.`);
  }
  const numbers = argumentValues.map(numberCoercion);
  if (numbers.some((number) => number == null)) {
    return runtimeOpen(`Math.${memberName}(...) arguments depend on runtime values.`);
  }
  return value(new EvaluationNumberValue(operation(...(numbers as number[])), node));
}

function jsonGlobalMemberCall(
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  switch (memberName) {
    case 'parse': {
      const text = argumentValues[0];
      if (text?.kind !== EvaluationValueKind.String) {
        return runtimeOpen('JSON.parse(...) input depends on a runtime value.');
      }
      try {
        return value(evaluationValueFromHostValue(JSON.parse(text.value), node));
      } catch {
        return runtimeOpen('JSON.parse(...) throws for the statically known input.');
      }
    }
    case 'stringify': {
      const hostValue = argumentValues[0] == null ? undefined : hostValueFromEvaluationValue(argumentValues[0]);
      if (hostValue === unknownHostValue) {
        return runtimeOpen('JSON.stringify(...) input depends on a runtime value.');
      }
      try {
        const text = JSON.stringify(hostValue);
        return value(text === undefined ? EvaluationUndefined : new EvaluationStringValue(text, node));
      } catch {
        return runtimeOpen('JSON.stringify(...) throws for the statically known input.');
      }
    }
    default:
      return unsupported(`JSON.${memberName} is not modeled as a host global intrinsic.`);
  }
}

function objectGlobalMemberCall(
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const source = argumentValues[0];
  const enumerable = readEvaluationEnumerableOwnEntries(source);
  switch (memberName) {
    case 'keys': {
      return enumerable == null
        ? runtimeOpen('Object.keys(...) argument depends on runtime object shape.')
        : value(new EvaluationArrayValue(enumerable.entries.map((entry) =>
          new EvaluationArrayElement(new EvaluationStringValue(entry.name, node), entry.expression)
        ), node, enumerable.toArrayShape()));
    }
    case 'values': {
      return enumerable == null
        ? runtimeOpen('Object.values(...) argument depends on runtime object shape.')
        : value(new EvaluationArrayValue(enumerable.entries.map((entry) =>
          new EvaluationArrayElement(entry.value, entry.expression, entry.openSeams)
        ), node, enumerable.toArrayShape()));
    }
    case 'entries': {
      return enumerable == null
        ? runtimeOpen('Object.entries(...) argument depends on runtime object shape.')
        : value(new EvaluationArrayValue(enumerable.entries.map((entry) =>
          new EvaluationArrayElement(new EvaluationArrayValue([
            new EvaluationArrayElement(new EvaluationStringValue(entry.name, node), entry.expression),
            new EvaluationArrayElement(entry.value, entry.expression, entry.openSeams),
          ], node), entry.expression)
        ), node, enumerable.toArrayShape()));
    }
    default:
      return unsupported(`Object.${memberName} is not modeled as a host global intrinsic.`);
  }
}

function arrayGlobalMemberCall(
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  switch (memberName) {
    case 'isArray':
      return value(new EvaluationBooleanValue(argumentValues[0]?.kind === EvaluationValueKind.Array, node));
    case 'of':
      return value(new EvaluationArrayValue(argumentValues.map((argument) =>
        new EvaluationArrayElement(argument, null)
      ), node));
    case 'from':
      return arrayFromGlobalCall(argumentValues, node);
    default:
      return unsupported(`Array.${memberName} is not modeled as a host global intrinsic.`);
  }
}

function numberGlobalMemberCall(
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  switch (memberName) {
    case 'isFinite':
      return argumentValues[0]?.kind === EvaluationValueKind.Number
        ? value(new EvaluationBooleanValue(Number.isFinite(argumentValues[0].value), node))
        : value(new EvaluationBooleanValue(false, node));
    case 'isNaN':
      return value(new EvaluationBooleanValue(argumentValues[0]?.kind === EvaluationValueKind.Number && Number.isNaN(argumentValues[0].value), node));
    case 'parseFloat':
      return parseNumberGlobalCall('Number.parseFloat', argumentValues, (text) => Number.parseFloat(text), node);
    case 'parseInt':
      return parseIntGlobalCall(argumentValues, node);
    default:
      return unsupported(`Number.${memberName} is not modeled as a host global intrinsic.`);
  }
}

function arrayFromGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  if (argumentValues.length > 1) {
    return runtimeOpen('Array.from(...) mapper execution requires the syntax-aware intrinsic host.');
  }
  const source = argumentValues[0] ?? EvaluationUndefined;
  const projection = evaluationIteratorProjection(source, node);
  if (projection == null) {
    return runtimeOpen('Array.from(...) source depends on runtime iterable semantics.');
  }
  if (
    projection.shape.exactLength == null
    || projection.shape.exactLength > DefaultStaticEvaluationGuardrails.maxLoopIterations
  ) {
    return runtimeOpen('Array.from(...) source exceeds the static iteration guardrail.');
  }
  return projection.shape.hasExactPositions
    ? value(new EvaluationArrayValue(projection.elements, node, projection.shape))
    : runtimeOpen('Array.from(...) source iteration order depends on runtime iterable shape.');
}

function objectPrototypeToStringCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const source = argumentValues[0] ?? EvaluationUndefined;
  const tag = objectPrototypeToStringTag(source);
  return tag == null
    ? runtimeOpen('Object.prototype.toString.call(...) argument depends on runtime object identity.')
    : value(new EvaluationStringValue(`[object ${tag}]`, node));
}

function objectPrototypeToStringTag(value: EvaluationValue): string | null {
  switch (value.kind) {
    case EvaluationValueKind.Undefined:
      return 'Undefined';
    case EvaluationValueKind.Null:
      return 'Null';
    case EvaluationValueKind.Boolean:
      return 'Boolean';
    case EvaluationValueKind.Number:
      return 'Number';
    case EvaluationValueKind.BigInt:
      return 'BigInt';
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
      return 'String';
    case EvaluationValueKind.RegularExpression:
      return 'RegExp';
    case EvaluationValueKind.Date:
      return 'Date';
    case EvaluationValueKind.Array:
      return 'Array';
    case EvaluationValueKind.Set:
      return value.weak ? 'WeakSet' : 'Set';
    case EvaluationValueKind.Map:
      return value.weak ? 'WeakMap' : 'Map';
    case EvaluationValueKind.Object:
      return 'Object';
    case EvaluationValueKind.Function:
      return 'Function';
    case EvaluationValueKind.Class:
      return 'Function';
    case EvaluationValueKind.Instance:
      return 'Object';
    case EvaluationValueKind.Promise:
      return 'Promise';
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Unknown:
      return null;
  }
}

function arrayConstructorValue(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  if (argumentValues.length === 1 && argumentValues[0]?.kind === EvaluationValueKind.Number) {
    return isValidEvaluationArrayLength(argumentValues[0].value)
      ? value(new EvaluationArrayValue([], node, EvaluationArrayShape.exact(argumentValues[0].value)))
      : runtimeOpen('Array constructor numeric length throws RangeError.');
  }
  return value(new EvaluationArrayValue(argumentValues.map((argument) =>
    new EvaluationArrayElement(argument, null)
  ), node));
}

function setConstructorValue(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const iterable = argumentValues[0] ?? null;
  if (iterable == null || iterable.kind === EvaluationValueKind.Null || iterable.kind === EvaluationValueKind.Undefined) {
    return value(new EvaluationSetValue([], node));
  }
  const projection = evaluationIteratorProjection(iterable, node);
  if (projection == null || !projection.shape.hasExactPositions || projection.shape.exactLength == null) {
    return runtimeOpen('Set constructor iterable depends on runtime iterable semantics.');
  }
  if (projection.shape.exactLength > DefaultStaticEvaluationGuardrails.maxLoopIterations) {
    return runtimeOpen('Set constructor iterable exceeds the static iteration guardrail.');
  }
  const result = new EvaluationSetValue([], node);
  for (const element of projection.elements) {
    addEvaluationSetElement(
      result,
      new EvaluationValueEvidence(element.value, element.openSeams),
      element.expression,
    );
  }
  return value(result);
}

function mapConstructorValue(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const iterable = argumentValues[0] ?? null;
  if (iterable == null || iterable.kind === EvaluationValueKind.Null || iterable.kind === EvaluationValueKind.Undefined) {
    return value(new EvaluationMapValue([], node));
  }
  const projection = evaluationIteratorProjection(iterable, node);
  if (projection == null || !projection.shape.hasExactPositions || projection.shape.exactLength == null) {
    return runtimeOpen('Map constructor iterable depends on runtime iterable semantics.');
  }
  if (projection.shape.exactLength > DefaultStaticEvaluationGuardrails.maxLoopIterations) {
    return runtimeOpen('Map constructor iterable exceeds the static iteration guardrail.');
  }
  const result = new EvaluationMapValue([], node);
  for (const element of projection.elements) {
    const entry = element.value;
    if (
      entry.kind !== EvaluationValueKind.Array
      || !entry.shape.hasExactPositions
    ) {
      return runtimeOpen('Map constructor iterator produced a non-entry value.');
    }
    const key = entry.elementAtRuntimeIndex(0);
    const entryValue = entry.elementAtRuntimeIndex(1);
    setEvaluationMapEntry(
      result,
      new EvaluationValueEvidence(key?.value ?? EvaluationUndefined, [
        ...element.openSeams,
        ...(key?.openSeams ?? []),
      ]),
      new EvaluationValueEvidence(entryValue?.value ?? EvaluationUndefined, [
        ...element.openSeams,
        ...(entryValue?.openSeams ?? []),
      ]),
      key?.expression ?? element.expression,
      entryValue?.expression ?? element.expression,
    );
  }
  return value(result);
}

function objectConstructorValue(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): StaticGlobalIntrinsicEvaluation {
  const source = argumentValues[0] ?? EvaluationUndefined;
  if (source.kind === EvaluationValueKind.Undefined || source.kind === EvaluationValueKind.Null) {
    return value(new EvaluationObjectValue(new Map(), false, node));
  }
  if (source.kind === EvaluationValueKind.Object) {
    return value(source);
  }
  return runtimeOpen('Object constructor wrapper semantics are host object values outside local value reduction.');
}

function mathGlobalObject(node: ts.Node | null): EvaluationBoundaryObjectValue {
  return new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, StaticEvaluationGlobalName.Math, new Map([
    mathConstantProperty('E', Math.E, node),
    mathConstantProperty('LN10', Math.LN10, node),
    mathConstantProperty('LN2', Math.LN2, node),
    mathConstantProperty('LOG10E', Math.LOG10E, node),
    mathConstantProperty('LOG2E', Math.LOG2E, node),
    mathConstantProperty('PI', Math.PI, node),
    mathConstantProperty('SQRT1_2', Math.SQRT1_2, node),
    mathConstantProperty('SQRT2', Math.SQRT2, node),
  ]), node);
}

function hostGlobalObject(
  name: string,
  node: ts.Node | null,
): EvaluationBoundaryObjectValue {
  return new EvaluationBoundaryObjectValue(
    EvaluationBoundaryKind.HostEnvironment,
    name,
    new Map(),
    node,
    isStaticEvaluationCallableGlobalName(name),
  );
}

function mathConstantProperty(
  name: string,
  value: number,
  node: ts.Node | null,
): [string, EvaluationObjectProperty] {
  return [name, new EvaluationObjectProperty(name, new EvaluationNumberValue(value, node), node, EvaluationObjectPropertyState.Closed)];
}

function mathNumberOperation(
  memberName: string,
): ((...values: number[]) => number) | null {
  switch (memberName) {
    case 'abs':
      return (value) => Math.abs(value);
    case 'acos':
      return (value) => Math.acos(value);
    case 'asin':
      return (value) => Math.asin(value);
    case 'atan':
      return (value) => Math.atan(value);
    case 'atan2':
      return (y, x) => Math.atan2(y, x);
    case 'ceil':
      return (value) => Math.ceil(value);
    case 'cos':
      return (value) => Math.cos(value);
    case 'exp':
      return (value) => Math.exp(value);
    case 'floor':
      return (value) => Math.floor(value);
    case 'log':
      return (value) => Math.log(value);
    case 'max':
      return (...values) => Math.max(...values);
    case 'min':
      return (...values) => Math.min(...values);
    case 'pow':
      return (base, exponent) => Math.pow(base, exponent);
    case 'round':
      return (value) => Math.round(value);
    case 'sin':
      return (value) => Math.sin(value);
    case 'sqrt':
      return (value) => Math.sqrt(value);
    case 'tan':
      return (value) => Math.tan(value);
    case 'trunc':
      return (value) => Math.trunc(value);
    default:
      return null;
  }
}

const unknownHostValue = Symbol('semantic-runtime:unknown-host-value');

function hostValueFromEvaluationValue(
  value: EvaluationValue,
): unknown {
  switch (value.kind) {
    case EvaluationValueKind.Undefined:
      return undefined;
    case EvaluationValueKind.Null:
      return null;
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.String:
      return value.value;
    case EvaluationValueKind.BigInt:
      return BigInt(value.text.endsWith('n') ? value.text.slice(0, -1) : value.text);
    case EvaluationValueKind.Date:
      return new Date(value.epochMilliseconds);
    case EvaluationValueKind.Array: {
      if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
        return unknownHostValue;
      }
      const elements = value.elements.map((element) => hostValueFromEvaluationValue(element.value));
      return elements.some((element) => element === unknownHostValue) ? unknownHostValue : elements;
    }
    case EvaluationValueKind.Object: {
      if (value.mayHaveUnknownProperties) {
        return unknownHostValue;
      }
      const object: Record<string, unknown> = {};
      for (const property of value.properties.values()) {
        const propertyValue = hostValueFromEvaluationValue(property.value);
        if (propertyValue === unknownHostValue) {
          return unknownHostValue;
        }
        object[property.name] = propertyValue;
      }
      return object;
    }
    default:
      return unknownHostValue;
  }
}

function evaluationValueFromHostValue(
  hostValue: unknown,
  node: ts.Node | null,
): EvaluationValue {
  if (hostValue === undefined) {
    return EvaluationUndefined;
  }
  if (hostValue === null) {
    return new EvaluationNullValue(node);
  }
  switch (typeof hostValue) {
    case 'boolean':
      return new EvaluationBooleanValue(hostValue, node);
    case 'number':
      return new EvaluationNumberValue(hostValue, node);
    case 'bigint':
      return new EvaluationBigIntValue(`${hostValue}n`, node);
    case 'string':
      return new EvaluationStringValue(hostValue, node);
    case 'object':
      if (Array.isArray(hostValue)) {
        return new EvaluationArrayValue(hostValue.map((element) =>
          new EvaluationArrayElement(evaluationValueFromHostValue(element, node), null)
        ), node);
      }
      if (hostValue instanceof Set) {
        return new EvaluationSetValue([...hostValue].map((element) =>
          new EvaluationSetElement(evaluationValueFromHostValue(element, node), null)
        ), node);
      }
      if (hostValue instanceof Map) {
        return new EvaluationMapValue([...hostValue.entries()].map(([key, entry]) =>
          new EvaluationMapEntry(
            evaluationValueFromHostValue(key, node),
            evaluationValueFromHostValue(entry, node),
            null,
            null,
          )
        ), node);
      }
      if (hostValue instanceof Date) {
        return new EvaluationDateValue(hostValue.getTime(), node);
      }
      return new EvaluationObjectValue(new Map(Object.entries(hostValue as Record<string, unknown>).map(([key, entry]) => [
        key,
        new EvaluationObjectProperty(key, evaluationValueFromHostValue(entry, node), node, EvaluationObjectPropertyState.Closed),
      ])), false, node);
    default:
      return new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, typeof hostValue, node);
  }
}

function numberCoercion(value: EvaluationValue): number | null {
  const primitive = primitiveHostValue(value);
  if (primitive === unknownPrimitiveHostValue) {
    return null;
  }
  return Number(primitive);
}

const unknownPrimitiveHostValue = Symbol('semantic-runtime:unknown-primitive-host-value');

function primitiveHostValue(
  value: EvaluationValue,
): string | number | boolean | bigint | null | undefined | typeof unknownPrimitiveHostValue {
  if (isEvaluationPrimitiveValue(value)) {
    return readEvaluationPrimitive(value);
  }
  if (value.kind === EvaluationValueKind.BigInt) {
    return BigInt(value.text.endsWith('n') ? value.text.slice(0, -1) : value.text);
  }
  return unknownPrimitiveHostValue;
}

function hostGlobalPath(value: EvaluationValue): string | null {
  if (
    (value.kind === EvaluationValueKind.BoundaryObject || value.kind === EvaluationValueKind.BoundaryValue)
    && value.boundaryKind === EvaluationBoundaryKind.HostEnvironment
  ) {
    return value.path;
  }
  return null;
}

function value(value: EvaluationValue): StaticGlobalIntrinsicEvaluation {
  return {
    kind: StaticGlobalIntrinsicEvaluationKind.Value,
    value,
  };
}

function runtimeOpen(reason: string): StaticGlobalIntrinsicEvaluation {
  return {
    kind: StaticGlobalIntrinsicEvaluationKind.RuntimeOpen,
    reason,
  };
}

function unsupported(reason: string): StaticGlobalIntrinsicEvaluation {
  return {
    kind: StaticGlobalIntrinsicEvaluationKind.Unsupported,
    reason,
  };
}
