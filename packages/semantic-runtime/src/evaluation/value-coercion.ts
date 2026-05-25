import {
  EvaluationValueKind,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  type EvaluationValue,
} from './values.js';

/** Coerce evaluator-local primitive-like values with ECMAScript string conversion where static reduction is safe. */
export function stringCoercionText(value: EvaluationValue): string | null {
  if (value.kind === EvaluationValueKind.BigInt) {
    return value.text.endsWith('n') ? value.text.slice(0, -1) : value.text;
  }
  if (value.kind === EvaluationValueKind.RegularExpression) {
    return `/${value.pattern}/${value.flags}`;
  }
  if (!isEvaluationPrimitiveValue(value)) {
    return null;
  }
  return String(readEvaluationPrimitive(value));
}

/** Read the clamped forward start index used by Array/String indexOf-like methods. */
export function readArrayStartIndex(
  value: EvaluationValue,
  length: number,
): number | null {
  if (value.kind === EvaluationValueKind.Undefined) {
    return 0;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  const integer = Math.trunc(value.value);
  return Math.min(Math.max(integer < 0 ? length + integer : integer, 0), length);
}

/** Read the inclusive reverse start index used by Array/String lastIndexOf-like methods. */
export function readArrayLastIndexStart(value: EvaluationValue, length: number): number | null {
  if (value.kind === EvaluationValueKind.Undefined) {
    return Math.max(length - 1, -1);
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  const integer = Math.trunc(value.value);
  return integer < 0
    ? Math.max(length + integer, -1)
    : Math.min(integer, length - 1);
}

/** Read an Array.at index; out-of-range numeric indices deliberately point one past the end for undefined lookup. */
export function readArrayAtIndex(value: EvaluationValue, length: number): number | null {
  if (value.kind === EvaluationValueKind.Undefined) {
    return 0;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  const integer = Math.trunc(value.value);
  const index = integer < 0 ? length + integer : integer;
  return index < 0 || index >= length ? length : index;
}

/** Read the replacement index used by Array.with; out-of-range indices stay open for the caller. */
export function readArrayWithIndex(value: EvaluationValue, length: number): number | null {
  if (value.kind === EvaluationValueKind.Undefined) {
    return 0;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  const integer = Math.trunc(value.value);
  const index = integer < 0 ? length + integer : integer;
  return index < 0 || index >= length ? null : index;
}

/** Read one Array/String slice bound before final caller-specific clamping. */
export function readSliceBound(
  value: EvaluationValue,
  length: number,
  undefinedValue: number,
): number | null {
  if (value.kind === EvaluationValueKind.Undefined) {
    return undefinedValue;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  const integer = Math.trunc(value.value);
  return integer < 0
    ? length + integer
    : integer;
}

/** Read the delete count shared by Array.splice and Array.toSpliced source-value reducers. */
export function readArraySpliceDeleteCount(
  value: EvaluationValue | null,
  start: number,
  length: number,
  hasStartArgument: boolean,
  hasDeleteCountArgument: boolean,
): number | null {
  if (!hasDeleteCountArgument) {
    return hasStartArgument ? length - start : 0;
  }
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return 0;
  }
  if (value.kind !== EvaluationValueKind.Number || !Number.isFinite(value.value)) {
    return null;
  }
  return Math.min(Math.max(Math.trunc(value.value), 0), length - start);
}
