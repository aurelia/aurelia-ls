import type { ProductHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  CheckerTypeMemberProjectionPolicy,
  CheckerTypeProjector,
} from './checker-projector.js';
import { TypeSystemProductDetails } from './product-details.js';
import type {
  CheckerTypeMember,
  CheckerTypeShape,
} from './type-shape.js';

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
  if (typeShape.members.length > 0) {
    return typeShape.members;
  }
  return projectCheckerTypeMemberSurface(store, typeShape, localKeySeed)?.members ?? [];
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
