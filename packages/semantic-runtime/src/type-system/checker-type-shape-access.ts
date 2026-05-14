import ts from 'typescript';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  CheckerTypeProjectionRequest,
  CheckerTypeProjector,
} from './checker-projector.js';
import { TypeSystemProductDetails } from './product-details.js';
import {
  CheckerTypeMember,
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShape,
  CheckerTypeShapeKind,
  checkerIndexedAccessSupportsNumber,
  checkerIndexedAccessSupportsString,
  checkerTypeShapeIsPrimitiveDisplay,
} from './type-shape.js';
import {
  checkerIndexKindForKeyType,
  checkerNullishType,
  checkerStringIndexValueType,
} from './checker-related-types.js';

/**
 * Shared TypeChecker-backed value-shape access for expression evaluation and pattern-local projection.
 *
 * The expression evaluator decides how an open access should be reported. This resolver only answers the lower-level
 * question: can the current type-shape graph or its hot checker carrier produce the reached value shape?
 */
export class CheckerTypeShapeAccess {
  constructor(
    readonly store: KernelStore,
    readonly projector: CheckerTypeProjector,
  ) {}

  resolveReference(reference: CheckerTypeReference): CheckerTypeShape | null {
    return reference.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  }

  memberValueType(
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
  ): CheckerTypeShape | null {
    if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
      return ownerType;
    }

    const member = ownerType.members.find((candidate) => candidate.name === memberName) ?? null;
    if (member != null) {
      return this.declaredMemberValueType(member, localKey);
    }

    return this.stringIndexMemberValueType(ownerType, memberName, `${localKey}:string-index`);
  }

  numericIndexValueType(
    ownerType: CheckerTypeShape,
    index: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape | null {
    const memberType = this.memberValueType(ownerType, String(index), `${localKey}:member`);
    if (memberType != null) {
      return memberType;
    }

    if (ownerType.indexedValueType != null && checkerIndexedAccessSupportsNumber(ownerType.indexedAccessKeyKind)) {
      return this.resolveReference(ownerType.indexedValueType);
    }

    const checker = ownerType.carrier?.checker ?? null;
    const type = ownerType.carrier?.type ?? null;
    const property = checker == null || type == null
      ? null
      : checker.getPropertyOfType(type, String(index));
    const propertyDeclaration = property?.valueDeclaration ?? property?.declarations?.[0] ?? null;
    const indexType = checker == null || type == null
      ? null
      : property != null && propertyDeclaration != null
        ? checker.getTypeOfSymbolAtLocation(property, propertyDeclaration)
        : checker.getIndexTypeOfType(type, ts.IndexKind.Number);
    if (checker == null || indexType == null) {
      return null;
    }

    return this.projector.ensureProjection({
      localKey: `${localKey}:checker-index`,
      checker,
      type: indexType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      display: checker.typeToString(indexType),
    } satisfies CheckerTypeProjectionRequest);
  }

  indexedValueReferenceForKeyType(
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
  ): CheckerTypeReference | null {
    if (ownerType.indexedValueType == null) {
      return null;
    }
    const indexKind = indexKindForKeyType(keyType);
    if (indexKind === ts.IndexKind.String && checkerIndexedAccessSupportsString(ownerType.indexedAccessKeyKind)) {
      return ownerType.indexedValueType;
    }
    if (indexKind === ts.IndexKind.Number && checkerIndexedAccessSupportsNumber(ownerType.indexedAccessKeyKind)) {
      return ownerType.indexedValueType;
    }
    return null;
  }

  indexSignatureValueType(
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape | null {
    const checker = ownerType.carrier?.checker ?? null;
    const type = ownerType.carrier?.type ?? null;
    if (checker == null || type == null) {
      return null;
    }

    const indexKind = indexKindForKeyType(keyType);
    if (indexKind == null) {
      return null;
    }

    const valueType = checker.getIndexTypeOfType(type, indexKind);
    if (valueType == null) {
      return null;
    }

    return this.projector.ensureProjection({
      localKey: `${localKey}:index:${indexKind}`,
      checker,
      type: valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      display: checker.typeToString(valueType),
    } satisfies CheckerTypeProjectionRequest);
  }

  finiteKeyedValueTypes(
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
    localKey: string,
  ): readonly CheckerTypeShape[] | null {
    const propertyKeys = finitePropertyKeysForKeyType(keyType);
    if (propertyKeys.length === 0) {
      return null;
    }

    const valueTypes: CheckerTypeShape[] = [];
    for (const propertyKey of propertyKeys) {
      const valueType = this.memberValueType(ownerType, propertyKey, `${localKey}:${localKeyPart(propertyKey)}`);
      if (valueType == null) {
        return null;
      }
      valueTypes.push(valueType);
    }
    return valueTypes;
  }

  stringIndexMemberValueType(
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
  ): CheckerTypeShape | null {
    if (ownerType.indexedValueType?.productHandle != null && checkerIndexedAccessSupportsString(ownerType.indexedAccessKeyKind)) {
      return this.resolveReference(ownerType.indexedValueType);
    }

    const checker = ownerType.carrier?.checker ?? null;
    const type = ownerType.carrier?.type ?? null;
    if (checker == null || type == null) {
      return null;
    }

    const valueType = checkerStringIndexValueType(checker, type);
    if (valueType == null) {
      return null;
    }

    return this.projector.ensureProjection({
      localKey,
      checker,
      type: valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle: ownerType.sourceAddressHandle,
      display: checker.typeToString(valueType),
    } satisfies CheckerTypeProjectionRequest);
  }

  declaredMemberValueType(
    member: CheckerTypeMember,
    localKey: string,
  ): CheckerTypeShape | null {
    if (member.valueType?.productHandle != null) {
      const existing = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, member.valueType.productHandle);
      if (existing != null) {
        return existing;
      }
    }

    if (member.carrier?.valueType == null) {
      return null;
    }

    return this.projector.ensureProjection({
      localKey: `${localKey}:value`,
      checker: member.carrier.checker,
      type: member.carrier.valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: member.carrier.declarations[0] ?? null,
      sourceAddressHandle: member.sourceAddressHandle,
      ownerIdentityHandle: member.identityHandle,
      display: member.valueType?.display ?? null,
    } satisfies CheckerTypeProjectionRequest);
  }
}

function indexKindForKeyType(typeShape: CheckerTypeShape): ts.IndexKind | null {
  const carrierType = typeShape.carrier?.type ?? null;
  if (carrierType != null) {
    return checkerIndexKindForKeyType(carrierType);
  }
  if (checkerTypeShapeIsPrimitiveDisplay(typeShape, 'number')) {
    return ts.IndexKind.Number;
  }
  if (checkerTypeShapeIsPrimitiveDisplay(typeShape, 'string')) {
    return ts.IndexKind.String;
  }
  return null;
}

function finitePropertyKeysForKeyType(typeShape: CheckerTypeShape): readonly string[] {
  const carrierType = typeShape.carrier?.type ?? null;
  if (carrierType == null) {
    return [];
  }
  return [...new Set(finitePropertyKeysForType(carrierType))].sort((left, right) => left.localeCompare(right));
}

function finitePropertyKeysForType(type: ts.Type): readonly string[] {
  if (type.isUnion()) {
    const keys: string[] = [];
    for (const constituent of type.types) {
      if (checkerNullishType(null, constituent)) {
        continue;
      }
      const constituentKeys = finitePropertyKeysForType(constituent);
      if (constituentKeys.length === 0) {
        return [];
      }
      keys.push(...constituentKeys);
    }
    return keys;
  }

  const stringLiteral = stringLiteralTypeValue(type);
  if (stringLiteral != null) {
    return [stringLiteral];
  }

  const numberLiteral = numberLiteralTypeValue(type);
  if (numberLiteral != null) {
    return [String(numberLiteral)];
  }

  return [];
}

function stringLiteralTypeValue(type: ts.Type): string | null {
  return (type.flags & ts.TypeFlags.StringLiteral) !== 0
    ? (type as ts.StringLiteralType).value
    : null;
}

function numberLiteralTypeValue(type: ts.Type): number | null {
  return (type.flags & ts.TypeFlags.NumberLiteral) !== 0
    ? (type as ts.NumberLiteralType).value
    : null;
}
