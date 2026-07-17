import { aureliaArrayMethodTypeProjectionNames } from '../expression/array-method-semantics.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelHandleFactory } from '../kernel/handles.js';
import {
  checkerIndexedAccessSupportsNumber,
  CheckerTypeMember,
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  type CheckerTypeShape,
} from './type-shape.js';

/** True when a product-owned synthetic type shape models an Array-like value with known numeric elements. */
export function checkerTypeShapeIsSyntheticRuntimeArray(shape: CheckerTypeShape): boolean {
  return (shape.origin === CheckerTypeProjectionOrigin.SyntheticExpressionType
      || shape.origin === CheckerTypeProjectionOrigin.SyntheticTemplateType)
    && checkerIndexedAccessSupportsNumber(shape.indexedAccessKeyKind)
    && shape.iteratedValueType != null;
}

/** Synthetic Array prototype members that API member-surface inquiries can enumerate without checker carriers. */
export function syntheticRuntimeArrayTypeMembers(
  handles: KernelHandleFactory,
  typeShape: CheckerTypeShape,
  localKeySeed: string,
): readonly CheckerTypeMember[] {
  if (!checkerTypeShapeIsSyntheticRuntimeArray(typeShape)) {
    return [];
  }
  const ownerType = typeShape.toReference();
  const localKey = `synthetic-array-member-surface:${localKeyPart(localKeySeed)}:${localKeyPart(typeShape.checkerKey)}`;
  return aureliaArrayMethodTypeProjectionNames.map((name, index) =>
    new CheckerTypeMember(
      handles.product(`type-member:${localKey}:${index}:${localKeyPart(name)}`),
      name,
      CheckerTypeMemberKind.Method,
      ownerType,
      null,
      false,
      true,
      null,
      null,
      [],
      null,
    )
  );
}
