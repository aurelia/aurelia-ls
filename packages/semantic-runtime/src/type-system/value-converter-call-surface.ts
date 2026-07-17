import type { ProductDetailReadView } from '../kernel/product-details.js';
import {
  checkerMemberStrictTrueComparisonKind,
  type CheckerStrictTrueComparisonKind,
  readOrProjectCheckerTypeMembersInProjection,
} from './checker-type-member-surface.js';
import type { CheckerTypeProjector } from './checker-projector.js';
import { TypeSystemProductDetails } from './product-details.js';
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
  projector: CheckerTypeProjector,
  typeReference: CheckerTypeReference | null | undefined,
  localKey: string,
): CheckerStrictTrueComparisonKind | null {
  const typeShape = typeReference?.productHandle == null
    ? null
    : projector.publication.readProductDetail(TypeSystemProductDetails.TypeShape, typeReference.productHandle);
  return typeShape == null
    ? null
    : valueConverterWithContextComparisonKind(projector, typeShape, localKey);
}

/** Reads the checker-visible value-converter `withContext === true` policy from a projected target type shape. */
export function valueConverterWithContextComparisonKind(
  projector: CheckerTypeProjector,
  converterType: CheckerTypeShape,
  localKey: string,
): CheckerStrictTrueComparisonKind {
  return valueConverterWithContextComparisonKindFromMembers(
    projector.publication,
    readOrProjectCheckerTypeMembersInProjection(projector, converterType, localKey),
  );
}

/** Reads the value-converter `withContext === true` policy from already-projected checker members. */
export function valueConverterWithContextComparisonKindFromMembers(
  store: ProductDetailReadView,
  members: readonly CheckerTypeMember[],
): CheckerStrictTrueComparisonKind {
  return checkerMemberStrictTrueComparisonKind(
    store,
    members.find((candidate) => candidate.name === VALUE_CONVERTER_WITH_CONTEXT_PROPERTY) ?? null,
  );
}
