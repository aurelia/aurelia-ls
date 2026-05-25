import type ts from 'typescript';
import {
  AureliaExpressionGlobalName,
  isAureliaExpressionGlobalName,
} from '../expression/global-names.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBigIntValue,
  EvaluationBooleanValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationMapEntry,
  EvaluationMapValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationRegularExpressionValue,
  EvaluationSetValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  type EvaluationValue,
} from './values.js';
import {
  regularExpressionFlagsText,
  regularExpressionPatternText,
} from './intrinsics/regexp-intrinsics.js';
import { stringCoercionText } from './intrinsics/shared.js';

export const enum AureliaGlobalIntrinsicEvaluationKind {
  /** The admitted global expression reduced to an evaluator-local value. */
  Value = 'value',
  /** The admitted global expression is valid but depends on host runtime state. */
  RuntimeOpen = 'runtime-open',
  /** The admitted global expression is outside the currently modeled intrinsic set. */
  Unsupported = 'unsupported',
}

export type AureliaGlobalIntrinsicEvaluation =
  | {
    readonly kind: AureliaGlobalIntrinsicEvaluationKind.Value;
    readonly value: EvaluationValue;
  }
  | {
    readonly kind: AureliaGlobalIntrinsicEvaluationKind.RuntimeOpen;
    readonly reason: string;
  }
  | {
    readonly kind: AureliaGlobalIntrinsicEvaluationKind.Unsupported;
    readonly reason: string;
  };

/** Returns the evaluator value for an Aurelia-admitted global identifier. */
export function evaluateAureliaExpressionGlobalAccess(
  name: string,
  node: ts.Node | null = null,
): EvaluationValue | null {
  switch (name) {
    case AureliaExpressionGlobalName.Infinity:
      return new EvaluationNumberValue(Infinity, node);
    case AureliaExpressionGlobalName.NaN:
      return new EvaluationNumberValue(NaN, node);
    case AureliaExpressionGlobalName.Math:
      return mathGlobalObject(node);
    case AureliaExpressionGlobalName.JSON:
      return hostGlobalObject(name, node);
    case AureliaExpressionGlobalName.Array:
    case AureliaExpressionGlobalName.BigInt:
    case AureliaExpressionGlobalName.Boolean:
    case AureliaExpressionGlobalName.Date:
    case AureliaExpressionGlobalName.Map:
    case AureliaExpressionGlobalName.Number:
    case AureliaExpressionGlobalName.Object:
    case AureliaExpressionGlobalName.RegExp:
    case AureliaExpressionGlobalName.Set:
    case AureliaExpressionGlobalName.String:
    case AureliaExpressionGlobalName.Intl:
      return hostGlobalObject(name, node);
    default:
      return isAureliaExpressionGlobalName(name)
        ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, name, node)
        : null;
  }
}

/** Evaluates an Aurelia `CallGlobal` expression when the admitted host function is static enough. */
export function evaluateAureliaExpressionGlobalCall(
  name: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null = null,
): AureliaGlobalIntrinsicEvaluation {
  switch (name) {
    case AureliaExpressionGlobalName.String:
      return stringGlobalCall(argumentValues, node);
    case AureliaExpressionGlobalName.Number:
      return numberGlobalCall(argumentValues, node);
    case AureliaExpressionGlobalName.Boolean:
      return booleanGlobalCall(argumentValues, node);
    case AureliaExpressionGlobalName.BigInt:
      return bigIntGlobalCall(argumentValues, node);
    case AureliaExpressionGlobalName.RegExp:
      return regexpGlobalCall(argumentValues, node);
    case AureliaExpressionGlobalName.Array:
      return value(arrayConstructorValue(argumentValues, node));
    case AureliaExpressionGlobalName.IsNaN:
      return numberPredicateGlobalCall(name, argumentValues, Number.isNaN, node);
    case AureliaExpressionGlobalName.IsFinite:
      return numberPredicateGlobalCall(name, argumentValues, Number.isFinite, node);
    case AureliaExpressionGlobalName.ParseFloat:
      return parseNumberGlobalCall(name, argumentValues, (text) => Number.parseFloat(text), node);
    case AureliaExpressionGlobalName.ParseInt:
      return parseIntGlobalCall(argumentValues, node);
    case AureliaExpressionGlobalName.EncodeURI:
      return uriGlobalCall(name, argumentValues, encodeURI, node);
    case AureliaExpressionGlobalName.EncodeURIComponent:
      return uriGlobalCall(name, argumentValues, encodeURIComponent, node);
    case AureliaExpressionGlobalName.DecodeURI:
      return uriGlobalCall(name, argumentValues, decodeURI, node);
    case AureliaExpressionGlobalName.DecodeURIComponent:
      return uriGlobalCall(name, argumentValues, decodeURIComponent, node);
    case AureliaExpressionGlobalName.Date:
      return runtimeOpen('Date() depends on host clock and locale state.');
    case AureliaExpressionGlobalName.JSON:
      return runtimeOpen('JSON is a host namespace object, not a global function.');
    case AureliaExpressionGlobalName.Map:
    case AureliaExpressionGlobalName.Set:
    case AureliaExpressionGlobalName.Object:
    case AureliaExpressionGlobalName.Math:
    case AureliaExpressionGlobalName.Intl:
      return runtimeOpen(`Global '${name}' call depends on host constructor or namespace semantics.`);
    default:
      return unsupported(`Global '${name}' is not in Aurelia's admitted global intrinsic set.`);
  }
}

/** Evaluates `new` over an Aurelia-admitted global constructor when value construction is static enough. */
export function evaluateAureliaExpressionGlobalConstructor(
  name: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null = null,
): AureliaGlobalIntrinsicEvaluation {
  switch (name) {
    case AureliaExpressionGlobalName.Array:
      return value(arrayConstructorValue(argumentValues, node));
    case AureliaExpressionGlobalName.RegExp:
      return regexpGlobalCall(argumentValues, node);
    case AureliaExpressionGlobalName.Set:
      return setConstructorValue(argumentValues, node);
    case AureliaExpressionGlobalName.Map:
      return mapConstructorValue(argumentValues, node);
    case AureliaExpressionGlobalName.Object:
      return objectConstructorValue(argumentValues, node);
    case AureliaExpressionGlobalName.Date:
      return runtimeOpen('new Date(...) depends on host clock and Date parsing semantics.');
    case AureliaExpressionGlobalName.String:
    case AureliaExpressionGlobalName.Number:
    case AureliaExpressionGlobalName.Boolean:
    case AureliaExpressionGlobalName.BigInt:
      return runtimeOpen(`new ${name}(...) produces a host wrapper object outside local value reduction.`);
    default:
      return unsupported(`Global constructor '${name}' is not modeled as a static host intrinsic.`);
  }
}

/** Evaluates calls on known Aurelia-admitted global namespace receivers. */
export function evaluateAureliaExpressionGlobalMemberCall(
  receiver: EvaluationValue,
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null = null,
): AureliaGlobalIntrinsicEvaluation | null {
  const path = hostGlobalPath(receiver);
  if (path == null) {
    return null;
  }
  return evaluateAureliaExpressionGlobalMemberCallFromPath(path, memberName, argumentValues, node);
}

/** Evaluates a host-global member call by boundary path, shared by TS and Aurelia-expression evaluators. */
export function evaluateAureliaExpressionGlobalMemberCallFromPath(
  receiverPath: string,
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null = null,
): AureliaGlobalIntrinsicEvaluation | null {
  switch (receiverPath) {
    case AureliaExpressionGlobalName.Math:
      return mathGlobalMemberCall(memberName, argumentValues, node);
    case AureliaExpressionGlobalName.JSON:
      return jsonGlobalMemberCall(memberName, argumentValues, node);
    case AureliaExpressionGlobalName.Object:
      return objectGlobalMemberCall(memberName, argumentValues, node);
    case AureliaExpressionGlobalName.Array:
      return arrayGlobalMemberCall(memberName, argumentValues, node);
    case AureliaExpressionGlobalName.Number:
      return numberGlobalMemberCall(memberName, argumentValues, node);
    case 'Object.prototype.toString':
      return memberName === 'call'
        ? objectPrototypeToStringCall(argumentValues, node)
        : unsupported(`Object.prototype.toString.${memberName} is not modeled as a host global intrinsic.`);
    default:
      return null;
  }
}

function stringGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
  const text = stringCoercionText(argumentValues[0] ?? EvaluationUndefined);
  return text == null
    ? runtimeOpen('String(...) argument depends on a runtime value.')
    : value(new EvaluationStringValue(text, node));
}

function numberGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
  const number = numberCoercion(argumentValues[0] ?? EvaluationUndefined);
  return number == null
    ? runtimeOpen('Number(...) argument depends on a runtime value.')
    : value(new EvaluationNumberValue(number, node));
}

function booleanGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
  const truthy = readEvaluationTruthiness(argumentValues[0] ?? EvaluationUndefined);
  return truthy == null
    ? runtimeOpen('Boolean(...) argument depends on a runtime value.')
    : value(new EvaluationBooleanValue(truthy, node));
}

function bigIntGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
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
): AureliaGlobalIntrinsicEvaluation {
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

function numberPredicateGlobalCall(
  name: string,
  argumentValues: readonly EvaluationValue[],
  predicate: (value: number) => boolean,
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
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
): AureliaGlobalIntrinsicEvaluation {
  const text = stringCoercionText(argumentValues[0] ?? EvaluationUndefined);
  return text == null
    ? runtimeOpen(`${name}(...) argument depends on a runtime value.`)
    : value(new EvaluationNumberValue(parse(text), node));
}

function parseIntGlobalCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
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
): AureliaGlobalIntrinsicEvaluation {
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
): AureliaGlobalIntrinsicEvaluation {
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
): AureliaGlobalIntrinsicEvaluation {
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
): AureliaGlobalIntrinsicEvaluation {
  const source = argumentValues[0];
  switch (memberName) {
    case 'keys': {
      const keys = enumerableOwnPropertyNames(source);
      return keys == null
        ? runtimeOpen('Object.keys(...) argument depends on runtime object shape.')
        : value(new EvaluationArrayValue(keys.map((key) =>
          new EvaluationArrayElement(new EvaluationStringValue(key, node), null)
        ), false, node));
    }
    case 'values': {
      const values = enumerableOwnPropertyValues(source);
      return values == null
        ? runtimeOpen('Object.values(...) argument depends on runtime object shape.')
        : value(new EvaluationArrayValue(values.map((entry) =>
          new EvaluationArrayElement(entry, null)
        ), false, node));
    }
    case 'entries': {
      const entries = enumerableOwnPropertyEntries(source);
      return entries == null
        ? runtimeOpen('Object.entries(...) argument depends on runtime object shape.')
        : value(new EvaluationArrayValue(entries.map(([key, entry]) =>
          new EvaluationArrayElement(new EvaluationArrayValue([
            new EvaluationArrayElement(new EvaluationStringValue(key, node), null),
            new EvaluationArrayElement(entry, null),
          ], false, node), null)
        ), false, node));
    }
    default:
      return unsupported(`Object.${memberName} is not modeled as a host global intrinsic.`);
  }
}

function arrayGlobalMemberCall(
  memberName: string,
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
  switch (memberName) {
    case 'isArray':
      return value(new EvaluationBooleanValue(argumentValues[0]?.kind === EvaluationValueKind.Array, node));
    case 'of':
      return value(new EvaluationArrayValue(argumentValues.map((argument) =>
        new EvaluationArrayElement(argument, null)
      ), false, node));
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
): AureliaGlobalIntrinsicEvaluation {
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
): AureliaGlobalIntrinsicEvaluation {
  const source = argumentValues[0] ?? EvaluationUndefined;
  if (source.kind === EvaluationValueKind.Array) {
    return value(new EvaluationArrayValue(source.elements, source.mayHaveUnknownElements, node, source.mayHaveUnknownOrder));
  }
  if (source.kind === EvaluationValueKind.String) {
    return value(new EvaluationArrayValue([...source.value].map((part) =>
      new EvaluationArrayElement(new EvaluationStringValue(part, node), null)
    ), false, node));
  }
  return runtimeOpen('Array.from(...) source depends on runtime iterable semantics.');
}

function objectPrototypeToStringCall(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
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
    case EvaluationValueKind.Array:
      return 'Array';
    case EvaluationValueKind.Set:
      return 'Set';
    case EvaluationValueKind.Map:
      return 'Map';
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
): EvaluationArrayValue {
  if (argumentValues.length === 1 && argumentValues[0]?.kind === EvaluationValueKind.Number) {
    const length = Math.max(0, Math.min(1_000, Math.trunc(argumentValues[0].value)));
    return new EvaluationArrayValue(
      Array.from({ length }, () => new EvaluationArrayElement(EvaluationUndefined, null)),
      length !== argumentValues[0].value || argumentValues[0].value > 1_000,
      node,
    );
  }
  return new EvaluationArrayValue(argumentValues.map((argument) =>
    new EvaluationArrayElement(argument, null)
  ), false, node);
}

function setConstructorValue(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
  const iterable = argumentValues[0] ?? null;
  if (iterable == null) {
    return value(new EvaluationSetValue([], false, node));
  }
  if (iterable.kind !== EvaluationValueKind.Array) {
    return runtimeOpen('Set constructor iterable depends on runtime iterable semantics.');
  }
  return value(new EvaluationSetValue(iterable.elements, iterable.mayHaveUnknownElements, node));
}

function mapConstructorValue(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
  const iterable = argumentValues[0] ?? null;
  if (iterable == null) {
    return value(new EvaluationMapValue([], false, node));
  }
  if (iterable.kind !== EvaluationValueKind.Array) {
    return runtimeOpen('Map constructor iterable depends on runtime iterable semantics.');
  }
  const entries: EvaluationMapEntry[] = [];
  let mayHaveUnknownEntries = iterable.mayHaveUnknownElements;
  for (const element of iterable.elements) {
    const entry = element.value;
    if (entry.kind !== EvaluationValueKind.Array || entry.elements.length < 2) {
      mayHaveUnknownEntries = true;
      continue;
    }
    entries.push(new EvaluationMapEntry(
      entry.elements[0]!.value,
      entry.elements[1]!.value,
      null,
    ));
  }
  return value(new EvaluationMapValue(entries, mayHaveUnknownEntries, node));
}

function objectConstructorValue(
  argumentValues: readonly EvaluationValue[],
  node: ts.Node | null,
): AureliaGlobalIntrinsicEvaluation {
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
  return new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, AureliaExpressionGlobalName.Math, new Map([
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
  return new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, name, new Map(), node);
}

function mathConstantProperty(
  name: string,
  value: number,
  node: ts.Node | null,
): [string, EvaluationObjectProperty] {
  return [name, new EvaluationObjectProperty(name, new EvaluationNumberValue(value, node), node)];
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

function enumerableOwnPropertyNames(
  source: EvaluationValue | undefined,
): readonly string[] | null {
  const properties = enumerableOwnProperties(source);
  return properties == null ? null : properties.map(([name]) => name);
}

function enumerableOwnPropertyValues(
  source: EvaluationValue | undefined,
): readonly EvaluationValue[] | null {
  const properties = enumerableOwnProperties(source);
  return properties == null ? null : properties.map(([, value]) => value);
}

function enumerableOwnPropertyEntries(
  source: EvaluationValue | undefined,
): readonly (readonly [string, EvaluationValue])[] | null {
  return enumerableOwnProperties(source);
}

/** Enumerates source-modeled Object.keys/values/entries properties through one host-intrinsic policy. */
function enumerableOwnProperties(
  source: EvaluationValue | undefined,
): readonly (readonly [string, EvaluationValue])[] | null {
  if (source == null) {
    return null;
  }
  switch (source.kind) {
    case EvaluationValueKind.Object:
      return source.mayHaveUnknownProperties
        ? null
        : [...source.properties.values()].map((property) => [property.name, property.value] as const);
    case EvaluationValueKind.Array:
      return source.mayHaveUnknownElements
        ? null
        : source.elements.map((element, index) => [String(index), element.value] as const);
    case EvaluationValueKind.String:
      return [...source.value].map((part, index) => [String(index), new EvaluationStringValue(part, source.node)] as const);
    default:
      return isEvaluationPrimitiveValue(source) ? [] : null;
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
        ), false, node);
      }
      if (hostValue instanceof Set) {
        return new EvaluationSetValue([...hostValue].map((element) =>
          new EvaluationArrayElement(evaluationValueFromHostValue(element, node), null)
        ), false, node);
      }
      if (hostValue instanceof Map) {
        return new EvaluationMapValue([...hostValue.entries()].map(([key, entry]) =>
          new EvaluationMapEntry(
            evaluationValueFromHostValue(key, node),
            evaluationValueFromHostValue(entry, node),
            null,
          )
        ), false, node);
      }
      return new EvaluationObjectValue(new Map(Object.entries(hostValue as Record<string, unknown>).map(([key, entry]) => [
        key,
        new EvaluationObjectProperty(key, evaluationValueFromHostValue(entry, node), node),
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

function value(value: EvaluationValue): AureliaGlobalIntrinsicEvaluation {
  return {
    kind: AureliaGlobalIntrinsicEvaluationKind.Value,
    value,
  };
}

function runtimeOpen(reason: string): AureliaGlobalIntrinsicEvaluation {
  return {
    kind: AureliaGlobalIntrinsicEvaluationKind.RuntimeOpen,
    reason,
  };
}

function unsupported(reason: string): AureliaGlobalIntrinsicEvaluation {
  return {
    kind: AureliaGlobalIntrinsicEvaluationKind.Unsupported,
    reason,
  };
}
