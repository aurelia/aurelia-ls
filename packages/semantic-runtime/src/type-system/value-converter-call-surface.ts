import type { KernelStore } from '../kernel/store.js';
import { TypeSystemProductDetails } from './product-details.js';
import {
  checkerMemberStrictTrueComparisonKind,
  type CheckerStrictTrueComparisonKind,
  readOrProjectCheckerTypeMembers,
} from './checker-type-member-surface.js';
import type {
  CheckerTypeMember,
  CheckerTypeReference,
  CheckerTypeShape,
} from './type-shape.js';

export const VALUE_CONVERTER_TO_VIEW_METHOD = 'toView';
export const VALUE_CONVERTER_FROM_VIEW_METHOD = 'fromView';
export const VALUE_CONVERTER_WITH_CONTEXT_PROPERTY = 'withContext';

/** Runtime value-converter method names whose call surfaces affect expression typing and writeback. */
export type RuntimeValueConverterMethodName =
  | typeof VALUE_CONVERTER_TO_VIEW_METHOD
  | typeof VALUE_CONVERTER_FROM_VIEW_METHOD;

/** Reads the checker-visible value-converter `withContext === true` policy from a target type reference. */
export function valueConverterWithContextComparisonKindForReference(
  store: KernelStore,
  typeReference: CheckerTypeReference | null | undefined,
  localKey: string,
): CheckerStrictTrueComparisonKind | null {
  const typeShape = typeReference?.productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, typeReference.productHandle);
  return typeShape == null
    ? null
    : valueConverterWithContextComparisonKind(store, typeShape, localKey);
}

/** Reads the checker-visible value-converter `withContext === true` policy from a projected target type shape. */
export function valueConverterWithContextComparisonKind(
  store: KernelStore,
  converterType: CheckerTypeShape,
  localKey: string,
): CheckerStrictTrueComparisonKind {
  return valueConverterWithContextComparisonKindFromMembers(
    store,
    readOrProjectCheckerTypeMembers(store, converterType, localKey),
  );
}

/** Reads the value-converter `withContext === true` policy from already-projected checker members. */
export function valueConverterWithContextComparisonKindFromMembers(
  store: KernelStore,
  members: readonly CheckerTypeMember[],
): CheckerStrictTrueComparisonKind {
  return checkerMemberStrictTrueComparisonKind(
    store,
    members.find((candidate) => candidate.name === VALUE_CONVERTER_WITH_CONTEXT_PROPERTY) ?? null,
  );
}
