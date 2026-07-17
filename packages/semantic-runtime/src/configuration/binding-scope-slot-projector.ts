import type { KernelStore } from '../kernel/store.js';
import type { HotDetailReadView } from '../kernel/hot-details.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { TypeSystemHotDetails, TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerTypeMember,
  CheckerTypeProjectionOrigin,
  CheckerTypeShape,
} from '../type-system/type-shape.js';
import { checkerTypeMemberReachableIdentityHandle } from '../type-system/type-shape.js';
import { checkerTypeReferenceWithSource } from '../type-system/type-shape.js';
import { sameCheckerTypeReference } from '../type-system/type-shape.js';
import { CheckerTypeMemberProjectionPolicy, CheckerTypeProjector } from '../type-system/checker-projector.js';
import { readOrProjectCheckerTypeMembersInProjection } from '../type-system/checker-type-member-surface.js';
import {
  type BindingContextSlot,
  BindingContextSlotDraft,
  type BindingScope,
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
    readonly projector: CheckerTypeProjector,
  ) {}

  contextSlotsFor(
    explicitSlots: readonly BindingContextSlotDraft[],
    contextType: BindingScopeConstructionRequest['bindingContextType'],
  ): readonly BindingContextSlotDraft[] {
    const slotsByName = explicitContextSlotsByName(explicitSlots);
    const typeShape = this.typeShapeForContext(contextType);
    if (typeShape != null) {
      addTypeShapeSlots(this.store, this.projector, slotsByName, typeShape);
    }
    return [...slotsByName.values()];
  }

  private typeShapeForContext(
    contextType: BindingScopeConstructionRequest['bindingContextType'],
  ): CheckerTypeShape | null {
    return contextType?.productHandle == null
      ? null
      : this.projector.publication.readProductDetail(TypeSystemProductDetails.TypeShape, contextType.productHandle);
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
  projector: CheckerTypeProjector,
  slotsByName: Map<string, BindingContextSlotDraft>,
  typeShape: CheckerTypeShape,
): void {
  const members = readOrProjectCheckerTypeMembersInProjection(projector, typeShape, typeShape.productHandle);
  for (const member of members) {
    if (slotsByName.has(member.name)) {
      continue;
    }
    slotsByName.set(member.name, bindingContextSlotDraftForTypeMember(store, projector, member));
  }
}

export function bindingContextSlotDraftForTypeMember(
  store: KernelStore,
  projector: CheckerTypeProjector,
  member: CheckerTypeMember,
): BindingContextSlotDraft {
  const valueSourceAddressHandle = checkerTypeMemberValueSourceAddressHandle(store, projector.publication, member);
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
    checkerTypeMemberSourceAddressHandle(projector.publication, member),
    [],
  );
}

export function bindingContextSlotDraftForContextTypeMember(
  store: KernelStore,
  projector: CheckerTypeProjector,
  contextType: BindingScopeConstructionRequest['bindingContextType'],
  memberName: string,
): BindingContextSlotDraft | null {
  const typeShape = contextType?.productHandle == null
    ? null
    : projector.publication.readProductDetail(TypeSystemProductDetails.TypeShape, contextType.productHandle);
  const member = typeShape == null
    ? null
    : readOrProjectCheckerTypeMembersInProjection(projector, typeShape, typeShape.productHandle)
      .find((candidate) => candidate.name === memberName) ?? null;
  return member == null ? null : bindingContextSlotDraftForTypeMember(store, projector, member);
}

export function bindingContextSlotTargetTypeSourceMember(
  details: HotDetailReadView,
  slot: BindingContextSlot | BindingContextSlotDraft,
): CheckerTypeMember | null {
  const sourceProductHandle = slot.targetTypeSourceProductHandle ?? slot.targetProductHandle;
  const member = sourceProductHandle == null
    ? null
    : details.readHotDetail(TypeSystemHotDetails.TypeMember, sourceProductHandle);
  if (member == null || slot.targetTypeSourceProductHandle != null) {
    return member;
  }
  return slot.targetType == null
    || member.valueType == null
    || sameCheckerTypeReference(slot.targetType, member.valueType)
    ? member
    : null;
}

export function bindingContextSlotTargetTypeShape(
  projector: CheckerTypeProjector,
  slot: BindingContextSlot | BindingContextSlotDraft,
  localKey: string,
): CheckerTypeShape | null {
  const typeShape = slot.targetType?.productHandle == null
    ? null
    : projector.publication.readProductDetail(TypeSystemProductDetails.TypeShape, slot.targetType.productHandle);
  if (typeShape != null) {
    return typeShape;
  }
  const member = bindingContextSlotTargetTypeSourceMember(projector.publication, slot);
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

/** Projects an Aurelia source expression to the exact slot-shaped value it preserves through transparent wrappers. */
export function bindingContextSlotDraftForExpressionAccess(
  store: KernelStore,
  projector: CheckerTypeProjector,
  sourceScope: BindingScope,
  expression: ExpressionAstNode,
  localKey: string,
): BindingContextSlotDraft | null {
  switch (expression.$kind) {
    case 'AccessScope':
      return draftFromSlot(sourceScope.locate(expression.name.name, expression.ancestor).slot);
    case 'AccessMember': {
      if (expression.object.$kind === 'AccessThis') {
        return draftFromSlot(sourceScope.locateThis(expression.object.ancestor).context?.lookup(expression.name.name) ?? null);
      }
      const owner = bindingContextSlotDraftForExpressionAccess(
        store,
        projector,
        sourceScope,
        expression.object,
        `${localKey}:owner`,
      );
      return owner == null
        ? null
        : bindingContextSlotDraftForMemberAccess(store, projector, owner, expression.name.name, `${localKey}:member:${expression.name.name}`);
    }
    case 'BindingBehavior':
      return bindingContextSlotDraftForExpressionAccess(store, projector, sourceScope, expression.expression, `${localKey}:binding-behavior`);
    case 'Paren':
      return bindingContextSlotDraftForExpressionAccess(store, projector, sourceScope, expression.expression, `${localKey}:paren`);
    default:
      return null;
  }
}

function bindingContextSlotDraftForMemberAccess(
  store: KernelStore,
  projector: CheckerTypeProjector,
  owner: BindingContextSlotDraft,
  memberName: string,
  localKey: string,
): BindingContextSlotDraft | null {
  const ownerTypeShape = bindingContextSlotTargetTypeShape(projector, owner, `${localKey}:owner:${owner.name}`);
  const member = ownerTypeShape == null
    ? null
    : readOrProjectCheckerTypeMembersInProjection(projector, ownerTypeShape, localKey)
      .find((candidate) => candidate.name === memberName) ?? null;
  return member == null
    ? null
    : bindingContextSlotDraftForTypeMember(store, projector, member);
}

function draftFromSlot(slot: BindingContextSlot | null): BindingContextSlotDraft | null {
  return slot == null ? null : BindingContextSlotDraft.fromSlot(slot);
}
