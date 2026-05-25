import type { ProductHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  CheckerTypeMemberProjectionPolicy,
  CheckerTypeProjector,
} from './checker-projector.js';
import {
  checkerRawTypeAssignable,
} from './checker-type-assignability.js';
import { TypeSystemProductDetails } from './product-details.js';
import {
  CheckerTypeMember,
  CheckerTypeShape,
  CheckerTypeShapeKind,
} from './type-shape.js';
import { syntheticRuntimeArrayTypeMembers } from './synthetic-array-type-surface.js';

export const enum CheckerStrictTrueComparisonKind {
  /** The member is absent, so Aurelia's `value === true` runtime branch is definitely not taken. */
  Missing = 'missing',
  /** The member type is exactly literal `true`, so the strict-true runtime branch is always taken. */
  DefinitelyTrue = 'definitely-true',
  /** The member type cannot contain literal `true`, so the strict-true runtime branch is never taken. */
  DefinitelyFalse = 'definitely-false',
  /** The member type may contain `true`, but the checker cannot prove that it is always literal `true`. */
  MaybeTrue = 'maybe-true',
}

/**
 * Read an enumerable member surface, projecting it only when an answer actually needs members.
 *
 * Flow-oriented type projections may intentionally keep members lazy. Completion and cursor-info answers can pay the
 * eager member cost at the API edge, where query-claim retention/disposal policy can account for the trade-off.
 */
export function readOrProjectCheckerTypeMembers(
  store: KernelStore,
  typeShape: CheckerTypeShape,
  localKeySeed: ProductHandle | string,
): readonly CheckerTypeMember[] {
  const localKey = localKeyPart(localKeySeed);
  if (typeShape.members.length > 0) {
    return withSyntheticRuntimeArrayMembers(store, typeShape, typeShape.members, localKey);
  }
  const projected = projectCheckerTypeMemberSurface(store, typeShape, localKeySeed);
  return projected == null
    ? withSyntheticRuntimeArrayMembers(store, typeShape, [], localKey)
    : withSyntheticRuntimeArrayMembers(store, projected, projected.members, localKey);
}

export function projectCheckerTypeMemberSurface(
  store: KernelStore,
  typeShape: CheckerTypeShape,
  localKeySeed: ProductHandle | string,
): CheckerTypeShape | null {
  const carrier = typeShape.carrier;
  if (carrier == null) {
    return null;
  }
  const localKey = `query-member-surface:${localKeyPart(localKeySeed)}`;
  const projectedProductHandle = store.handles.product(`type-shape:${localKey}`);
  const existing = store.productDetails.read(TypeSystemProductDetails.TypeShape, projectedProductHandle);
  if (existing != null) {
    return existing;
  }
  return new CheckerTypeProjector(store).project({
    localKey,
    checker: carrier.checker,
    type: carrier.type,
    origin: typeShape.origin,
    sourceNode: carrier.declarations[0] ?? null,
    sourceAddressHandle: typeShape.sourceAddressHandle,
    ownerIdentityHandle: typeShape.identityHandle,
    display: typeShape.display,
    memberProjection: CheckerTypeMemberProjectionPolicy.Eager,
  }).typeShape;
}

function withSyntheticRuntimeArrayMembers(
  store: KernelStore,
  typeShape: CheckerTypeShape,
  members: readonly CheckerTypeMember[],
  localKey: string,
): readonly CheckerTypeMember[] {
  const syntheticMembers = syntheticRuntimeArrayTypeMembers(store, typeShape, localKey);
  if (syntheticMembers.length === 0) {
    return members;
  }
  const existingNames = new Set(members.map((member) => member.name));
  const missingSyntheticMembers = syntheticMembers.filter((member) => !existingNames.has(member.name));
  return missingSyntheticMembers.length === 0
    ? members
    : [...members, ...missingSyntheticMembers];
}

/**
 * Classify a checker-visible member for framework branches that use a strict `member === true` test.
 *
 * This is deliberately phrased as a runtime comparison policy rather than a generic boolean classifier: callers such
 * as value-converter `withContext` need to distinguish "missing is false" from "the value may become true".
 */
export function checkerMemberStrictTrueComparisonKind(
  store: KernelStore,
  member: CheckerTypeMember | null,
): CheckerStrictTrueComparisonKind {
  if (member == null) {
    return CheckerStrictTrueComparisonKind.Missing;
  }
  const reference = member.valueType;
  if (reference == null) {
    return CheckerStrictTrueComparisonKind.MaybeTrue;
  }
  const shape = reference.productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  const display = shape?.display ?? reference.display;
  if (display === 'true') {
    return CheckerStrictTrueComparisonKind.DefinitelyTrue;
  }
  if (display === 'false') {
    return CheckerStrictTrueComparisonKind.DefinitelyFalse;
  }
  const checker = shape?.carrier?.checker ?? member.carrier?.checker ?? null;
  const type = shape?.carrier?.type ?? member.carrier?.valueType ?? null;
  if (checker == null || type == null || shape?.shapeKind === CheckerTypeShapeKind.Any || shape?.shapeKind === CheckerTypeShapeKind.Unknown) {
    return CheckerStrictTrueComparisonKind.MaybeTrue;
  }
  const trueType = checker.getTrueType();
  if (!checkerRawTypeAssignable(checker, trueType, type)) {
    return CheckerStrictTrueComparisonKind.DefinitelyFalse;
  }
  return checkerRawTypeAssignable(checker, type, trueType)
    ? CheckerStrictTrueComparisonKind.DefinitelyTrue
    : CheckerStrictTrueComparisonKind.MaybeTrue;
}
