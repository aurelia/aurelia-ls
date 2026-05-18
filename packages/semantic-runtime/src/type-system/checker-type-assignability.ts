import type { KernelStore } from '../kernel/store.js';
import { readCheckerTypeShape } from './checker-type-shape-access.js';
import type {
  CheckerTypeReference,
  CheckerTypeShape,
} from './type-shape.js';

/** Checker-backed assignability for two retained type references. */
export function checkerTypeReferenceAssignable(
  store: KernelStore,
  from: CheckerTypeReference | null,
  to: CheckerTypeReference | null,
): boolean | null {
  const fromShape = readCheckerTypeShape(store, from);
  const toShape = readCheckerTypeShape(store, to);
  return checkerTypeShapeAssignable(fromShape, toShape, from, to);
}

/** Checker-backed assignability for two retained type shapes. */
export function checkerTypeShapeAssignable(
  fromShape: CheckerTypeShape | null,
  toShape: CheckerTypeShape | null,
  fromReference: CheckerTypeReference | null = null,
  toReference: CheckerTypeReference | null = null,
): boolean | null {
  const fromCarrier = fromShape?.carrier ?? null;
  const toCarrier = toShape?.carrier ?? null;
  if (fromCarrier == null || toCarrier == null || fromCarrier.checker !== toCarrier.checker) {
    const fromDisplay = fromReference?.display ?? fromShape?.display ?? null;
    const toDisplay = toReference?.display ?? toShape?.display ?? null;
    return fromDisplay != null && toDisplay != null && fromDisplay === toDisplay
      ? true
      : null;
  }
  return fromCarrier.checker.isTypeAssignableTo(fromCarrier.type, toCarrier.type);
}
