import type { KernelStore } from '../kernel/store.js';
import { TypeSystemHotDetails, TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerTypeMember,
  CheckerTypeProjectionOrigin,
  CheckerTypeShape,
} from '../type-system/type-shape.js';
import { checkerTypeMemberReachableIdentityHandle } from '../type-system/type-shape.js';
import { checkerTypeReferenceWithSource } from '../type-system/type-shape.js';
import { CheckerTypeMemberProjectionPolicy, CheckerTypeProjector } from '../type-system/checker-projector.js';
import { readOrProjectCheckerTypeMembers } from '../type-system/checker-type-member-surface.js';
import {
  type BindingContextSlot,
  BindingContextSlotDraft,
  type BindingScopeConstructionRequest,
} from './scope.js';
import {
  checkerTypeMemberSourceAddressHandle,
  checkerTypeMemberValueSourceAddressHandle,
} from '../type-system/checker-type-member-source.js';

/** Projects TypeChecker-backed context type surfaces into runtime binding-context slot drafts. */
export class BindingScopeSlotProjector {
  constructor(
    readonly store: KernelStore,
  ) {}

  contextSlotsFor(
    explicitSlots: readonly BindingContextSlotDraft[],
    contextType: BindingScopeConstructionRequest['bindingContextType'],
  ): readonly BindingContextSlotDraft[] {
    const slotsByName = explicitContextSlotsByName(explicitSlots);
    const typeShape = this.typeShapeForContext(contextType);
    if (typeShape != null) {
      addTypeShapeSlots(this.store, slotsByName, typeShape);
    }
    return [...slotsByName.values()];
  }

  private typeShapeForContext(
    contextType: BindingScopeConstructionRequest['bindingContextType'],
  ): CheckerTypeShape | null {
    return contextType?.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, contextType.productHandle);
  }
}

function explicitContextSlotsByName(
  explicitSlots: readonly BindingContextSlotDraft[],
): Map<string, BindingContextSlotDraft> {
  const slotsByName = new Map<string, BindingContextSlotDraft>();
  for (const slot of explicitSlots) {
    slotsByName.set(slot.name, slot);
  }
  return slotsByName;
}

function addTypeShapeSlots(
  store: KernelStore,
  slotsByName: Map<string, BindingContextSlotDraft>,
  typeShape: CheckerTypeShape,
): void {
  const members = readOrProjectCheckerTypeMembers(store, typeShape, typeShape.productHandle);
  for (const member of members) {
    if (slotsByName.has(member.name)) {
      continue;
    }
    slotsByName.set(member.name, bindingContextSlotDraftForTypeMember(store, member));
  }
}

export function bindingContextSlotDraftForTypeMember(
  store: KernelStore,
  member: CheckerTypeMember,
): BindingContextSlotDraft {
  const valueSourceAddressHandle = checkerTypeMemberValueSourceAddressHandle(store, member);
  return new BindingContextSlotDraft(
    member.name,
    checkerTypeMemberReachableIdentityHandle(member),
    member.productHandle,
    member.valueType == null
      ? null
      : checkerTypeReferenceWithSource(
        member.valueType,
        member.valueType.sourceAddressHandle ?? valueSourceAddressHandle,
      ),
    checkerTypeMemberSourceAddressHandle(store, member),
    [],
  );
}

export function bindingContextSlotTargetTypeShape(
  store: KernelStore,
  projector: CheckerTypeProjector,
  slot: BindingContextSlot | BindingContextSlotDraft,
  localKey: string,
): CheckerTypeShape | null {
  const typeShape = slot.targetType?.productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, slot.targetType.productHandle);
  if (typeShape != null) {
    return typeShape;
  }
  const member = slot.targetProductHandle == null
    ? null
    : store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
  if (member?.carrier?.valueType == null) {
    return null;
  }
  return projector.ensureProjection({
    localKey,
    checker: member.carrier.checker,
    type: member.carrier.valueType,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: member.carrier.declarations[0] ?? null,
    sourceAddressHandle: slot.targetType?.sourceAddressHandle ?? slot.sourceAddressHandle,
    ownerIdentityHandle: slot.targetIdentityHandle,
    display: slot.targetType?.display ?? member.valueType?.display ?? null,
    memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
  });
}
