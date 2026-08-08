import type { KernelStore } from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { BindableDefinition } from '../resources/bindable-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import { CheckerTypeProjector } from '../type-system/checker-projector.js';
import { CheckerTypeShapeAccess } from '../type-system/checker-type-shape-access.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type { CheckerTypeShapeKind } from '../type-system/type-shape.js';
import { readCheckerMemberValueSurface, readCheckerReferenceSurface } from '../type-system/type-surface.js';
import {
  describeAddress,
  type SemanticSourceReference,
} from './source-reference.js';

/** Checker-backed value facts shared by application, resource, and cursor projections. */
export interface SemanticBindableTypeSurfaceProjection {
  readonly valueType: string | null;
  readonly valueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly effectiveValueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly valueTypeHasCallSignature: boolean | null;
  readonly valueTypeHasMembers: boolean | null;
  readonly valueTypeIsWeak: boolean | null;
}

export interface SemanticBindableDefinitionSurfaceProjection extends SemanticBindableTypeSurfaceProjection {
  readonly setterKind: BindableDefinition['set']['kind'];
  readonly setterTargetName: string | null;
  readonly nullable: boolean | null;
}

export interface SemanticBindableDefinitionSourceProjection {
  readonly source: SemanticSourceReference | null;
  readonly nameSource: SemanticSourceReference | null;
  readonly attributeSource: SemanticSourceReference | null;
  readonly propertySource: SemanticSourceReference | null;
  readonly callbackSource: SemanticSourceReference | null;
  readonly callbackTargetSource: SemanticSourceReference | null;
  readonly modeSource: SemanticSourceReference | null;
  readonly setSource: SemanticSourceReference | null;
  readonly setterTargetSource: SemanticSourceReference | null;
  readonly typeSource: SemanticSourceReference | null;
  readonly nullableSource: SemanticSourceReference | null;
}

export interface SemanticBindableDefinitionSurfaceOptions {
  /** Spend query-local checker work for the bindable value surface. Defaults to true for explicit definition reads. */
  readonly includeTypeSurface?: boolean;
}

/** Project the semantic bindable contract shared by resource and cursor inquiries. */
export function projectBindableDefinitionSurface(
  store: KernelStore,
  projector: CheckerTypeProjector,
  bindable: BindableDefinition,
  ownerTarget: ResourceTargetReference | null,
  options: SemanticBindableDefinitionSurfaceOptions = {},
): SemanticBindableDefinitionSurfaceProjection {
  return {
    setterKind: bindable.set.kind,
    setterTargetName: bindable.set.target?.localName ?? null,
    nullable: bindable.set.nullable,
    ...(options.includeTypeSurface === false
      ? emptyBindableTypeSurface()
      : projectBindableTypeSurface(store, projector, bindable, ownerTarget)),
  };
}

/** Project only the checker-backed value surface used by application topology. */
export function projectBindableTypeSurface(
  store: KernelStore,
  projector: CheckerTypeProjector,
  bindable: BindableDefinition,
  ownerTarget: ResourceTargetReference | null,
): SemanticBindableTypeSurfaceProjection {
  const surface = bindableTypeSurface(store, projector, bindable, ownerTarget);
  return {
    valueType: surface.display,
    valueTypeShapeKind: surface.shapeKind,
    effectiveValueTypeShapeKind: surface.effectiveShapeKind,
    valueTypeHasCallSignature: surface.hasCallSignature,
    valueTypeHasMembers: surface.hasMembers,
    valueTypeIsWeak: surface.isWeak,
  };
}

/** Null projection used when a summary/catalog answer deliberately does not spend checker-backed type detail. */
export function emptyBindableTypeSurface(): SemanticBindableTypeSurfaceProjection {
  return {
    valueType: null,
    valueTypeShapeKind: null,
    effectiveValueTypeShapeKind: null,
    valueTypeHasCallSignature: null,
    valueTypeHasMembers: null,
    valueTypeIsWeak: null,
  };
}

/** Project authored bindable loci without making each public inquiry rebuild the field map. */
export function projectBindableDefinitionSources(
  store: KernelStore,
  bindable: BindableDefinition,
): SemanticBindableDefinitionSourceProjection {
  return {
    source: describeAddress(store, bindable.sourceAddressHandle),
    nameSource: describeAddress(store, bindable.nameSourceAddressHandle),
    attributeSource: describeAddress(store, bindable.attributeSourceAddressHandle),
    propertySource: describeAddress(store, bindable.propertyTarget?.addressHandle ?? null),
    callbackSource: describeAddress(store, bindable.callbackSourceAddressHandle),
    callbackTargetSource: describeAddress(store, bindable.callbackTarget?.addressHandle ?? null),
    modeSource: describeAddress(store, bindable.modeSourceAddressHandle),
    setSource: describeAddress(store, bindable.setSourceAddressHandle),
    setterTargetSource: describeAddress(store, bindable.set.target?.addressHandle ?? null),
    typeSource: describeAddress(store, bindable.typeSourceAddressHandle),
    nullableSource: describeAddress(store, bindable.nullableSourceAddressHandle),
  };
}

function bindableTypeSurface(
  store: KernelStore,
  projector: CheckerTypeProjector,
  bindable: BindableDefinition,
  ownerTarget: ResourceTargetReference | null,
) {
  if (ownerTarget?.targetType?.productHandle != null) {
    const targetTypeProductHandle = ownerTarget.targetType.productHandle;
    const targetType = store.productDetails.read(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
    const member = targetType?.members.find((candidate) => candidate.name === bindable.name) ?? null;
    if (member != null) {
      return readCheckerMemberValueSurface(member);
    }
    return lazyBindableTypeSurface(store, projector, ownerTarget, bindable);
  }
  return readCheckerReferenceSurface(store, bindable.propertyTarget?.targetType ?? null);
}

function lazyBindableTypeSurface(
  store: KernelStore,
  projector: CheckerTypeProjector,
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
  const access = new CheckerTypeShapeAccess(store, projector);
  const value = access.memberValueAccess(
    targetType,
    bindable.name,
    `bindable-type-surface:${localKeyPart(target.targetType?.semanticKey ?? target.localName ?? 'anonymous')}:${localKeyPart(bindable.name)}`,
  );
  return readCheckerReferenceSurface(store, value.valueType?.toReference() ?? value.valueReference);
}
