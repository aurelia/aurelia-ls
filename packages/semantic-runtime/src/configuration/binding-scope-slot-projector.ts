import type { KernelStore } from '../kernel/store.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type {
  CheckerTypeMember,
  CheckerTypeShape,
} from '../type-system/type-shape.js';
import { checkerTypeMemberReachableIdentityHandle } from '../type-system/type-shape.js';
import { readOrProjectCheckerTypeMembers } from '../type-system/checker-type-member-surface.js';
import {
  BindingContextSlotDraft,
  type BindingScopeConstructionRequest,
} from './scope.js';
import { checkerTypeMemberSourceAddressHandle } from '../type-system/checker-type-member-source.js';

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
    slotsByName.set(member.name, slotDraftForTypeMember(store, member));
  }
}

function slotDraftForTypeMember(
  store: KernelStore,
  member: CheckerTypeMember,
): BindingContextSlotDraft {
  return new BindingContextSlotDraft(
    member.name,
    checkerTypeMemberReachableIdentityHandle(member),
    member.productHandle,
    member.valueType,
    checkerTypeMemberSourceAddressHandle(store, member),
    [],
  );
}
