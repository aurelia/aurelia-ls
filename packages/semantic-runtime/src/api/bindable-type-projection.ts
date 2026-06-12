import type { KernelStore } from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { BindableDefinition } from '../resources/bindable-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import { CheckerTypeProjector } from '../type-system/checker-projector.js';
import { CheckerTypeShapeAccess } from '../type-system/checker-type-shape-access.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type { CheckerTypeShapeKind } from '../type-system/type-shape.js';
import { readCheckerMemberValueSurface, readCheckerReferenceSurface } from '../type-system/type-surface.js';

export interface SemanticBindableTypeSurfaceProjection {
  readonly valueType: string | null;
  readonly valueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly effectiveValueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly valueTypeHasCallSignature: boolean | null;
  readonly valueTypeHasMembers: boolean | null;
  readonly valueTypeIsWeak: boolean | null;
}

export function projectBindableTypeSurface(
  store: KernelStore,
  target: ResourceTargetReference,
  bindable: BindableDefinition,
): SemanticBindableTypeSurfaceProjection {
  const targetTypeProductHandle = target.targetType?.productHandle ?? null;
  if (targetTypeProductHandle == null) {
    return emptyBindableTypeSurfaceProjection();
  }
  const targetType = store.productDetails.read(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
  const member = targetType?.members.find((candidate) => candidate.name === bindable.name) ?? null;
  const surface = member != null
    ? readCheckerMemberValueSurface(member)
    : lazyBindableTypeSurface(store, target, bindable);
  return {
    valueType: surface.display,
    valueTypeShapeKind: surface.shapeKind,
    effectiveValueTypeShapeKind: surface.effectiveShapeKind,
    valueTypeHasCallSignature: surface.hasCallSignature,
    valueTypeHasMembers: surface.hasMembers,
    valueTypeIsWeak: surface.isWeak,
  };
}

function lazyBindableTypeSurface(
  store: KernelStore,
  target: ResourceTargetReference,
  bindable: BindableDefinition,
) {
  const targetTypeProductHandle = target.targetType?.productHandle ?? null;
  const targetType = targetTypeProductHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
  if (targetType == null) {
    return readCheckerReferenceSurface(store, null);
  }
  const access = new CheckerTypeShapeAccess(store, new CheckerTypeProjector(store));
  const value = access.memberValueAccess(
    targetType,
    bindable.name,
    `bindable-type-surface:${localKeyPart(target.targetType?.checkerKey ?? target.localName ?? 'anonymous')}:${localKeyPart(bindable.name)}`,
  );
  return readCheckerReferenceSurface(store, value.valueType?.toReference() ?? value.valueReference);
}

function emptyBindableTypeSurfaceProjection(): SemanticBindableTypeSurfaceProjection {
  return {
    valueType: null,
    valueTypeShapeKind: null,
    effectiveValueTypeShapeKind: null,
    valueTypeHasCallSignature: null,
    valueTypeHasMembers: null,
    valueTypeIsWeak: null,
  };
}
