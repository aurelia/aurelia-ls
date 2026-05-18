import ts from 'typescript';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  CheckerTypeProjectionRequest,
  CheckerTypeProjector,
} from './checker-projector.js';
import {
  CheckerTypeMemberProjectionPolicy,
} from './checker-projector.js';
import { TypeSystemProductDetails } from './product-details.js';
import {
  CheckerTypeMember,
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShape,
  CheckerTypeShapeKind,
  checkerIndexedAccessSupportsNumber,
  checkerIndexedAccessSupportsString,
  checkerTypeMemberReachableIdentityHandle,
  checkerTypeShapeIsPrimitiveDisplay,
} from './type-shape.js';
import {
  checkerIndexKindForKeyType,
  checkerNullishType,
} from './checker-related-types.js';
import {
  checkerDeclarationsAreReadonly,
  checkerSymbolMemberKind,
  declarationsForCheckerSymbol,
} from './checker-member-surface.js';
import { checkerTypeMemberSourceAddressHandle } from './checker-type-member-source.js';

export const enum CheckerTypeShapeMemberWriteAccessKind {
  Writable = 'writable',
  Readonly = 'readonly',
  GetterWithoutSetter = 'getter-without-setter',
  MethodLike = 'method-like',
  DeclarationMissing = 'declaration-missing',
  StringIndexWritable = 'string-index-writable',
  StringIndexReadonly = 'string-index-readonly',
  Missing = 'missing',
}

export const enum CheckerTypeShapeMemberValueAccessKind {
  Type = 'type',
  Missing = 'missing',
  MissingValueType = 'missing-value-type',
}

export interface CheckerTypeShapeMemberWriteAccess {
  readonly accessKind: CheckerTypeShapeMemberWriteAccessKind;
  readonly memberName: string;
  readonly memberKind: CheckerTypeMemberKind | null;
  readonly declarations: readonly ts.Declaration[];
  readonly checkerWritable: boolean | null;
}

export interface CheckerTypeShapeMemberValueAccess {
  readonly accessKind: CheckerTypeShapeMemberValueAccessKind;
  readonly memberName: string;
  readonly memberKind: CheckerTypeMemberKind | null;
  readonly valueType: CheckerTypeShape | null;
  readonly valueReference: CheckerTypeReference | null;
  readonly declarations: readonly ts.Declaration[];
}

export function readCheckerTypeShape(
  store: KernelStore,
  reference: CheckerTypeReference | null | undefined,
): CheckerTypeShape | null {
  return readCheckerTypeShapeByProductHandle(store, reference?.productHandle);
}

export function readCheckerTypeShapeByProductHandle(
  store: KernelStore,
  productHandle: ProductHandle | null | undefined,
): CheckerTypeShape | null {
  return productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
}

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
    return readCheckerTypeShape(this.store, reference);
  }

  memberValueType(
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
  ): CheckerTypeShape | null {
    return this.memberValueAccess(ownerType, memberName, localKey).valueType;
  }

  memberValueAccess(
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
  ): CheckerTypeShapeMemberValueAccess {
    if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
      return checkerTypeMemberValueAccessResult(
        CheckerTypeShapeMemberValueAccessKind.Type,
        memberName,
        CheckerTypeMemberKind.Property,
        ownerType,
        ownerType.toReference(),
        [],
      );
    }

    const member = ownerType.members.find((candidate) => candidate.name === memberName) ?? null;
    if (member != null) {
      const valueType = this.declaredMemberValueType(member, localKey);
      return checkerTypeMemberValueAccessResult(
        valueType == null
          ? CheckerTypeShapeMemberValueAccessKind.MissingValueType
          : CheckerTypeShapeMemberValueAccessKind.Type,
        memberName,
        member.memberKind,
        valueType,
        valueType?.toReference() ?? member.valueType,
        member.carrier?.declarations ?? [],
      );
    }

    const checkerMember = checkerMemberForOwnerType(ownerType, memberName);
    if (checkerMember != null) {
      const checkerMemberType = this.checkerMemberValueType(ownerType, checkerMember, memberName, localKey);
      if (checkerMemberType != null) {
        return checkerTypeMemberValueAccessResult(
          CheckerTypeShapeMemberValueAccessKind.Type,
          memberName,
          checkerSymbolMemberKind(checkerMember.symbol, checkerMember.declarations),
          checkerMemberType,
          checkerMemberType.toReference(),
          checkerMember.declarations,
        );
      }
      return checkerTypeMemberValueAccessResult(
        CheckerTypeShapeMemberValueAccessKind.MissingValueType,
        memberName,
        checkerSymbolMemberKind(checkerMember.symbol, checkerMember.declarations),
        null,
        null,
        checkerMember.declarations,
      );
    }

    const stringIndexMemberType = this.stringIndexMemberValueType(ownerType, memberName, `${localKey}:string-index`);
    if (stringIndexMemberType != null) {
      return checkerTypeMemberValueAccessResult(
        CheckerTypeShapeMemberValueAccessKind.Type,
        memberName,
        CheckerTypeMemberKind.IndexSignature,
        stringIndexMemberType,
        stringIndexMemberType.toReference(),
        [],
      );
    }

    return checkerTypeMemberValueAccessResult(
      CheckerTypeShapeMemberValueAccessKind.Missing,
      memberName,
      null,
      null,
      null,
      [],
    );
  }

  memberWriteAccess(
    ownerType: CheckerTypeShape,
    memberName: string,
  ): CheckerTypeShapeMemberWriteAccess {
    if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
      return checkerTypeMemberWriteAccessResult(
        CheckerTypeShapeMemberWriteAccessKind.Writable,
        memberName,
        CheckerTypeMemberKind.Property,
        [],
        true,
      );
    }

    const member = ownerType.members.find((candidate) => candidate.name === memberName) ?? null;
    if (member != null) {
      return checkerTypeMemberWriteAccess(member);
    }

    const checkerMember = checkerMemberForOwnerType(ownerType, memberName);
    if (checkerMember != null) {
      return checkerTypeMemberWriteAccessFromSurface(
        checkerMember.symbol.getName(),
        checkerSymbolMemberKind(checkerMember.symbol, checkerMember.declarations),
        checkerDeclarationsAreReadonly(checkerMember.declarations),
        checkerMember.declarations,
      );
    }

    const stringIndexInfo = checkerTypeShapeIndexInfo(ownerType, ts.IndexKind.String);
    if (stringIndexInfo != null) {
      return {
        accessKind: stringIndexInfo.isReadonly
          ? CheckerTypeShapeMemberWriteAccessKind.StringIndexReadonly
          : CheckerTypeShapeMemberWriteAccessKind.StringIndexWritable,
        memberName,
        memberKind: CheckerTypeMemberKind.IndexSignature,
        declarations: [],
        checkerWritable: stringIndexInfo.isReadonly ? false : true,
      };
    }

    return {
      accessKind: CheckerTypeShapeMemberWriteAccessKind.Missing,
      memberName,
      memberKind: null,
      declarations: [],
      checkerWritable: null,
    };
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

    if (ownerType.indexedValueType?.productHandle != null && checkerIndexedAccessSupportsNumber(ownerType.indexedAccessKeyKind)) {
      const indexedValueType = this.resolveReference(ownerType.indexedValueType);
      if (indexedValueType != null) {
        return indexedValueType;
      }
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
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
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

    const indexInfo = checkerTypeShapeIndexInfo(ownerType, indexKind);
    if (indexInfo == null) {
      return null;
    }

    return this.projector.ensureProjection({
      localKey: `${localKey}:index:${indexKind}`,
      checker,
      type: indexInfo.type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      display: checker.typeToString(indexInfo.type),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
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

    const indexInfo = checkerTypeShapeIndexInfo(ownerType, ts.IndexKind.String);
    if (indexInfo == null) {
      return null;
    }

    return this.projector.ensureProjection({
      localKey,
      checker,
      type: indexInfo.type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle: ownerType.sourceAddressHandle,
      display: checker.typeToString(indexInfo.type),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest);
  }

  declaredMemberValueType(
    member: CheckerTypeMember,
    localKey: string,
  ): CheckerTypeShape | null {
    if (member.valueType?.productHandle != null) {
      const existing = readCheckerTypeShape(this.store, member.valueType);
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
      sourceAddressHandle: checkerTypeMemberSourceAddressHandle(this.store, member),
      ownerIdentityHandle: checkerTypeMemberReachableIdentityHandle(member),
      display: member.valueType?.display ?? null,
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest);
  }

  private checkerMemberValueType(
    ownerType: CheckerTypeShape,
    member: CheckerTypeShapeCheckerMember,
    memberName: string,
    localKey: string,
  ): CheckerTypeShape | null {
    const carrier = ownerType.carrier;
    if (carrier == null) {
      return null;
    }
    const location = carrier.declarations[0]
      ?? member.symbol.valueDeclaration
      ?? member.declarations[0]
      ?? null;
    if (location == null) {
      return null;
    }
    const valueType = carrier.checker.getTypeOfSymbolAtLocation(member.symbol, location);
    return this.projector.ensureProjection({
      localKey: `${localKey}:checker-member`,
      checker: carrier.checker,
      type: valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: location,
      sourceAddressHandle: ownerType.sourceAddressHandle,
      ownerIdentityHandle: ownerType.identityHandle,
      display: carrier.checker.typeToString(valueType),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest);
  }
}

export function checkerTypeMemberWriteAccess(
  member: CheckerTypeMember,
): CheckerTypeShapeMemberWriteAccess {
  return checkerTypeMemberWriteAccessFromSurface(
    member.name,
    member.memberKind,
    member.isReadonly,
    member.carrier?.declarations ?? [],
  );
}

function checkerTypeMemberWriteAccessFromSurface(
  memberName: string,
  memberKind: CheckerTypeMemberKind,
  isReadonly: boolean,
  declarations: readonly ts.Declaration[],
): CheckerTypeShapeMemberWriteAccess {
  if (memberKind === CheckerTypeMemberKind.Method
    || memberKind === CheckerTypeMemberKind.Constructor
    || memberKind === CheckerTypeMemberKind.CallSignature) {
    return checkerTypeMemberWriteAccessResult(
      CheckerTypeShapeMemberWriteAccessKind.MethodLike,
      memberName,
      memberKind,
      declarations,
      false,
    );
  }
  if (declarations.some((declaration) => ts.isSetAccessorDeclaration(declaration))) {
    return checkerTypeMemberWriteAccessResult(
      CheckerTypeShapeMemberWriteAccessKind.Writable,
      memberName,
      memberKind,
      declarations,
      true,
    );
  }
  if (declarations.some((declaration) => ts.isGetAccessorDeclaration(declaration))) {
    return checkerTypeMemberWriteAccessResult(
      CheckerTypeShapeMemberWriteAccessKind.GetterWithoutSetter,
      memberName,
      memberKind,
      declarations,
      false,
    );
  }
  if (isReadonly) {
    return checkerTypeMemberWriteAccessResult(
      CheckerTypeShapeMemberWriteAccessKind.Readonly,
      memberName,
      memberKind,
      declarations,
      false,
    );
  }
  return checkerTypeMemberWriteAccessResult(
    declarations.length === 0
      ? CheckerTypeShapeMemberWriteAccessKind.DeclarationMissing
      : CheckerTypeShapeMemberWriteAccessKind.Writable,
    memberName,
    memberKind,
    declarations,
    declarations.length === 0 ? null : true,
  );
}

function checkerTypeMemberWriteAccessResult(
  accessKind: CheckerTypeShapeMemberWriteAccessKind,
  memberName: string,
  memberKind: CheckerTypeMemberKind | null,
  declarations: readonly ts.Declaration[],
  checkerWritable: boolean | null,
): CheckerTypeShapeMemberWriteAccess {
  return {
    accessKind,
    memberName,
    memberKind,
    declarations,
    checkerWritable,
  };
}

function checkerTypeMemberValueAccessResult(
  accessKind: CheckerTypeShapeMemberValueAccessKind,
  memberName: string,
  memberKind: CheckerTypeMemberKind | null,
  valueType: CheckerTypeShape | null,
  valueReference: CheckerTypeReference | null,
  declarations: readonly ts.Declaration[],
): CheckerTypeShapeMemberValueAccess {
  return {
    accessKind,
    memberName,
    memberKind,
    valueType,
    valueReference,
    declarations,
  };
}

interface CheckerTypeShapeCheckerMember {
  readonly symbol: ts.Symbol;
  readonly declarations: readonly ts.Declaration[];
}

function checkerMemberForOwnerType(
  ownerType: CheckerTypeShape,
  memberName: string,
): CheckerTypeShapeCheckerMember | null {
  const carrier = ownerType.carrier;
  if (carrier == null) {
    return null;
  }
  const symbol = carrier.checker.getPropertyOfType(carrier.type, memberName)
    ?? carrier.checker.getPropertyOfType(carrier.checker.getApparentType(carrier.type), memberName);
  if (symbol == null) {
    return null;
  }
  return {
    symbol,
    declarations: declarationsForCheckerSymbol(symbol),
  };
}

function checkerTypeShapeIndexInfo(
  ownerType: CheckerTypeShape,
  indexKind: ts.IndexKind,
): ts.IndexInfo | null {
  const carrier = ownerType.carrier;
  if (carrier == null) {
    return null;
  }
  return carrier.checker.getIndexInfoOfType(carrier.type, indexKind)
    ?? carrier.checker.getIndexInfoOfType(carrier.checker.getApparentType(carrier.type), indexKind)
    ?? null;
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
