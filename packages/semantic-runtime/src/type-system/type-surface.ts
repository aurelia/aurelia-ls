import ts from 'typescript';
import type { KernelStore } from '../kernel/store.js';
import { readCheckerTypeShape } from './checker-type-shape-access.js';
import {
  CheckerTypeShapeKind,
  classifyCheckerTypeShape,
  type CheckerTypeMember,
  type CheckerTypeReference,
  type CheckerTypeShape,
} from './type-shape.js';

export interface CheckerTypeSurface {
  readonly display: string | null;
  readonly shapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly effectiveShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly hasCallSignature: boolean | null;
  readonly hasMembers: boolean | null;
  readonly isWeak: boolean | null;
}

export function readCheckerReferenceSurface(
  store: KernelStore,
  reference: CheckerTypeReference | null,
): CheckerTypeSurface {
  if (reference == null) {
    return emptyTypeSurface();
  }
  const shape = readCheckerTypeShape(store, reference);
  return checkerSurfaceFromReference(reference, shape);
}

export function readCheckerMemberValueSurface(member: CheckerTypeMember | null): CheckerTypeSurface {
  if (member?.valueType == null) {
    return emptyTypeSurface();
  }
  const carrierType = member.carrier?.valueType ?? null;
  if (carrierType == null) {
    return checkerSurfaceFromReference(member.valueType, null);
  }
  const effectiveType = nonNullableSingleType(carrierType);
  const effectiveSymbol = effectiveType.aliasSymbol ?? effectiveType.symbol ?? null;
  const effectiveShapeKind = classifyCheckerTypeShape(effectiveType, effectiveSymbol);
  return {
    display: member.valueType.display,
    shapeKind: member.valueType.shapeKind,
    effectiveShapeKind,
    hasCallSignature: effectiveType.getCallSignatures().length > 0,
    hasMembers: effectiveType.getProperties().length > 0,
    isWeak: isWeakShape(member.valueType.shapeKind) || isWeakShape(effectiveShapeKind),
  };
}

function checkerSurfaceFromReference(
  reference: CheckerTypeReference,
  shape: CheckerTypeShape | null,
): CheckerTypeSurface {
  const shapeKind = shape?.shapeKind ?? reference.shapeKind;
  const callReturnType = shape?.callReturnType ?? null;
  return {
    display: shape?.display ?? reference.display,
    shapeKind,
    effectiveShapeKind: shapeKind,
    hasCallSignature: callReturnType != null || shapeKind === CheckerTypeShapeKind.Function,
    hasMembers: shape == null ? null : shape.members.length > 0,
    isWeak: isWeakShape(shapeKind),
  };
}

function nonNullableSingleType(type: ts.Type): ts.Type {
  if (!type.isUnion()) {
    return type;
  }
  const nonNullableTypes = type.types.filter((part) => !isNullishType(part));
  return nonNullableTypes.length === 1 ? nonNullableTypes[0]! : type;
}

function isNullishType(type: ts.Type): boolean {
  return (type.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0;
}

function isWeakShape(shapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null): boolean | null {
  if (shapeKind == null) {
    return null;
  }
  return shapeKind === CheckerTypeShapeKind.Any || shapeKind === CheckerTypeShapeKind.Unknown;
}

function emptyTypeSurface(): CheckerTypeSurface {
  return {
    display: null,
    shapeKind: null,
    effectiveShapeKind: null,
    hasCallSignature: null,
    hasMembers: null,
    isWeak: null,
  };
}
