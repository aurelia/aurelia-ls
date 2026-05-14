import type { KernelStore } from '../kernel/store.js';
import type { BindableDefinition } from '../resources/bindable-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type { CheckerTypeShapeKind } from '../type-system/type-shape.js';
import { readCheckerMemberValueSurface } from '../type-system/type-surface.js';

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
  const surface = readCheckerMemberValueSurface(member);
  return {
    valueType: surface.display,
    valueTypeShapeKind: surface.shapeKind,
    effectiveValueTypeShapeKind: surface.effectiveShapeKind,
    valueTypeHasCallSignature: surface.hasCallSignature,
    valueTypeHasMembers: surface.hasMembers,
    valueTypeIsWeak: surface.isWeak,
  };
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
