import type { KernelStore } from '../kernel/store.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type {
  CheckerTypeMember,
  CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  BindingContextSlotDraft,
  type BindingScopeConstructionRequest,
} from './scope.js';

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
      addTypeShapeSlots(slotsByName, typeShape);
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
  slotsByName: Map<string, BindingContextSlotDraft>,
  typeShape: CheckerTypeShape,
): void {
  for (const member of typeShape.members) {
    if (slotsByName.has(member.name)) {
      continue;
    }
    slotsByName.set(member.name, slotDraftForTypeMember(member));
  }
}

function slotDraftForTypeMember(
  member: CheckerTypeMember,
): BindingContextSlotDraft {
  return new BindingContextSlotDraft(
    member.name,
    member.identityHandle,
    member.productHandle,
    member.valueType,
    member.sourceAddressHandle,
    [],
  );
}
