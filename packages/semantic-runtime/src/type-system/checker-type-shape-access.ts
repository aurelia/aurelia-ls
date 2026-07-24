import ts from 'typescript';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
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
  CheckerRuntimeObjectMemberAdmissionKind,
  checkerIndexKindForKeyType,
  checkerIterableElementType,
  checkerNumberIndexValueType,
  checkerNullishType,
  checkerRuntimeObjectMemberAdmission,
  checkerTupleElementType,
} from './checker-related-types.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
} from './checker-node-helpers.js';
import {
  checkerDeclarationsAreReadonly,
  checkerSymbolMemberKind,
  declarationsForCheckerSymbol,
} from './checker-member-surface.js';
import {
  checkerSymbolMemberSourceProjection,
  checkerSymbolMemberValueSourceProjection,
  checkerTypeMemberSourceAddressHandle,
  checkerTypeMemberValueSourceAddressHandle,
} from './checker-type-member-source.js';

export const enum CheckerTypeShapeMemberWriteAccessKind {
  /** Declared property or accessor can receive a runtime assignment. */
  Writable = 'writable',
  /** Declared property is TypeScript-readonly, but JavaScript runtime assignment can still be attempted. */
  Readonly = 'readonly',
  /** Declared accessor exposes a getter without a setter. */
  GetterWithoutSetter = 'getter-without-setter',
  /** Declared member is callable/constructable rather than assignable storage. */
  MethodLike = 'method-like',
  /** Checker exposed a member symbol but not enough declarations to prove mutability. */
  DeclarationMissing = 'declaration-missing',
  /** String index signature can receive a runtime assignment. */
  StringIndexWritable = 'string-index-writable',
  /** String index signature is TypeScript-readonly, but JavaScript runtime assignment can still be attempted. */
  StringIndexReadonly = 'string-index-readonly',
  /** Number index signature can receive a runtime assignment. */
  NumberIndexWritable = 'number-index-writable',
  /** Number index signature is TypeScript-readonly, but JavaScript runtime assignment can still be attempted. */
  NumberIndexReadonly = 'number-index-readonly',
  /** Neither a declared member nor a compatible index signature could be projected. */
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
  readonly sourceAddressHandle: AddressHandle | null;
  readonly checkerWritable: boolean | null;
}

export interface CheckerTypeShapeMemberValueAccess {
  readonly accessKind: CheckerTypeShapeMemberValueAccessKind;
  readonly memberName: string;
  readonly memberKind: CheckerTypeMemberKind | null;
  readonly valueType: CheckerTypeShape | null;
  readonly valueReference: CheckerTypeReference | null;
  readonly declarations: readonly ts.Declaration[];
  readonly memberSourceAddressHandle: AddressHandle | null;
  /** Source of the accessed value/type; may be a type annotation rather than the member declaration. */
  readonly sourceAddressHandle: AddressHandle | null;
}

/** Projected value type and certainty for an object/member runtime guard. */
export class CheckerTypeShapeRuntimeObjectMemberAccess {
  constructor(
    readonly admissionKind: CheckerRuntimeObjectMemberAdmissionKind,
    /** Value type on the branch where the object/member guard succeeds. */
    readonly valueType: CheckerTypeShape | null,
    readonly memberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null,
    /** Declaration source shared by every admitted runtime lane, when one can be proven. */
    readonly memberSourceAddressHandle: AddressHandle | null,
  ) {}
}

export function readCheckerTypeShape(
  store: ProductDetailReadView,
  reference: CheckerTypeReference | null | undefined,
): CheckerTypeShape | null {
  return readCheckerTypeShapeByProductHandle(store, reference?.productHandle);
}

export function readCheckerTypeShapeByProductHandle(
  store: ProductDetailReadView,
  productHandle: ProductHandle | null | undefined,
): CheckerTypeShape | null {
  return productHandle == null
    ? null
    : store.readProductDetail(TypeSystemProductDetails.TypeShape, productHandle);
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
    return readCheckerTypeShape(this.projector.publication, reference);
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
        null,
        ownerType.sourceAddressHandle,
      );
    }

    const member = ownerType.members.find((candidate) => candidate.name === memberName) ?? null;
    if (member != null) {
      const valueType = this.declaredMemberValueType(member, localKey);
      const memberSourceAddressHandle = checkerTypeMemberSourceAddressHandle(this.projector.publication, member);
      const sourceAddressHandle = checkerTypeMemberValueSourceAddressHandle(
        this.projector.publication,
        member,
      )
        ?? memberSourceAddressHandle;
      return checkerTypeMemberValueAccessResult(
        valueType == null
          ? CheckerTypeShapeMemberValueAccessKind.MissingValueType
          : CheckerTypeShapeMemberValueAccessKind.Type,
        memberName,
        member.memberKind,
        valueType,
        valueType?.toReference() ?? member.valueType,
        member.carrier?.declarations ?? [],
        memberSourceAddressHandle,
        sourceAddressHandle,
      );
    }

    const checkerMember = checkerMemberForOwnerType(ownerType, memberName);
    if (checkerMember != null) {
      const memberSourceAddressHandle = this.checkerMemberSourceAddressHandle(checkerMember);
      const checkerMemberType = this.checkerMemberValueType(ownerType, checkerMember, memberName, localKey);
      if (checkerMemberType != null) {
        return checkerTypeMemberValueAccessResult(
          CheckerTypeShapeMemberValueAccessKind.Type,
          memberName,
          checkerSymbolMemberKind(checkerMember.symbol, checkerMember.declarations),
          checkerMemberType,
          checkerMemberType.toReference(),
          checkerMember.declarations,
          memberSourceAddressHandle,
          this.checkerMemberValueSourceAddressHandle(checkerMember)
            ?? memberSourceAddressHandle,
        );
      }
      return checkerTypeMemberValueAccessResult(
        CheckerTypeShapeMemberValueAccessKind.MissingValueType,
        memberName,
        checkerSymbolMemberKind(checkerMember.symbol, checkerMember.declarations),
        null,
        null,
        checkerMember.declarations,
        memberSourceAddressHandle,
        this.checkerMemberValueSourceAddressHandle(checkerMember)
          ?? memberSourceAddressHandle,
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
        null,
        ownerType.sourceAddressHandle,
      );
    }

    return checkerTypeMemberValueAccessResult(
      CheckerTypeShapeMemberValueAccessKind.Missing,
      memberName,
      null,
      null,
      null,
      [],
      null,
      null,
    );
  }

  /**
   * Project a member read guarded by `typeof value === 'object' && value !== null && memberName in value`.
   *
   * This keeps framework runtime admission separate from ordinary expression member access: rejected union lanes do
   * not contribute `undefined` or missing-member pressure, while optional/index-signature lanes remain conditional.
   */
  runtimeObjectMemberValueAccess(
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
  ): CheckerTypeShapeRuntimeObjectMemberAccess {
    const carrier = ownerType.carrier;
    if (carrier != null) {
      const admission = checkerRuntimeObjectMemberAdmission(
        carrier.checker,
        carrier.type,
        memberName,
        carrier.declarations[0] ?? null,
      );
      const memberSource = admission.memberSymbol == null
        ? null
        : checkerSymbolMemberSourceProjection(
            this.projector.publication,
            carrier.checker,
            admission.memberSymbol,
          );
      const memberValueSource = admission.memberSymbol == null
        ? null
        : checkerSymbolMemberValueSourceProjection(
            this.projector.publication,
            carrier.checker,
            admission.memberSymbol,
          );
      const valueType = admission.valueType == null
        ? null
        : this.projector.ensureProjection({
          localKey: `${localKey}:guarded-member`,
          checker: carrier.checker,
          type: admission.valueType,
          origin: CheckerTypeProjectionOrigin.TypeChecker,
          sourceNode: carrier.declarations[0] ?? null,
          sourceAddressHandle: memberValueSource?.sourceAddressHandle
            ?? memberSource?.sourceAddressHandle
            ?? ownerType.sourceAddressHandle,
          ownerIdentityHandle: ownerType.identityHandle,
          display: carrier.checker.typeToString(admission.valueType),
          memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
        } satisfies CheckerTypeProjectionRequest);
      return new CheckerTypeShapeRuntimeObjectMemberAccess(
        admission.kind,
        valueType,
        memberSource?.memberKind ?? null,
        memberSource?.sourceAddressHandle ?? null,
      );
    }

    const member = ownerType.members.find((candidate) => candidate.name === memberName) ?? null;
    if (member != null) {
      return new CheckerTypeShapeRuntimeObjectMemberAccess(
        member.isOptional
          ? CheckerRuntimeObjectMemberAdmissionKind.Conditional
          : CheckerRuntimeObjectMemberAdmissionKind.Guaranteed,
        this.declaredMemberValueType(member, localKey),
        member.memberKind,
        checkerTypeMemberSourceAddressHandle(this.projector.publication, member),
      );
    }
    if (ownerType.indexedValueType != null && checkerIndexedAccessSupportsString(ownerType.indexedAccessKeyKind)) {
      return new CheckerTypeShapeRuntimeObjectMemberAccess(
        CheckerRuntimeObjectMemberAdmissionKind.Conditional,
        this.resolveReference(ownerType.indexedValueType),
        CheckerTypeMemberKind.IndexSignature,
        null,
      );
    }
    switch (ownerType.shapeKind) {
      case CheckerTypeShapeKind.Any:
        return new CheckerTypeShapeRuntimeObjectMemberAccess(
          CheckerRuntimeObjectMemberAdmissionKind.Open,
          ownerType,
          null,
          null,
        );
      case CheckerTypeShapeKind.Unknown:
      case CheckerTypeShapeKind.TypeParameter:
      case CheckerTypeShapeKind.Unclassified:
      case CheckerTypeShapeKind.Union:
        return new CheckerTypeShapeRuntimeObjectMemberAccess(
          CheckerRuntimeObjectMemberAdmissionKind.Open,
          null,
          null,
          null,
        );
      case CheckerTypeShapeKind.Object:
      case CheckerTypeShapeKind.Class:
      case CheckerTypeShapeKind.Interface:
      case CheckerTypeShapeKind.Intersection:
        return new CheckerTypeShapeRuntimeObjectMemberAccess(
          ownerType.origin === CheckerTypeProjectionOrigin.SyntheticExpressionType
            ? CheckerRuntimeObjectMemberAdmissionKind.Impossible
            : CheckerRuntimeObjectMemberAdmissionKind.Open,
          ownerType.origin === CheckerTypeProjectionOrigin.SyntheticExpressionType
            ? null
            : this.projector.ensureSyntheticProjection({
                localKey: `${localKey}:guarded-member-open`,
                shapeKind: CheckerTypeShapeKind.Unknown,
                display: 'unknown',
                members: [],
                origin: CheckerTypeProjectionOrigin.Open,
                sourceAddressHandle: ownerType.sourceAddressHandle,
              }),
          null,
          null,
        );
      case CheckerTypeShapeKind.Primitive:
      case CheckerTypeShapeKind.Function:
      case CheckerTypeShapeKind.Never:
        return new CheckerTypeShapeRuntimeObjectMemberAccess(
          CheckerRuntimeObjectMemberAdmissionKind.Impossible,
          null,
          null,
          null,
        );
    }
  }

  /** Projects the non-nullish lane of a checker-backed type shape for Aurelia non-strict access/call semantics. */
  nonNullishTypeShape(
    ownerType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = ownerType.sourceAddressHandle,
  ): CheckerTypeShape | null {
    const carrier = ownerType.carrier;
    if (carrier == null) {
      return null;
    }
    const narrowed = carrier.checker.getNonNullableType(carrier.type);
    if (narrowed === carrier.type) {
      return ownerType;
    }
    return this.projector.ensureProjection({
      localKey,
      checker: carrier.checker,
      type: narrowed,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: carrier.declarations[0] ?? null,
      sourceAddressHandle,
      ownerIdentityHandle: ownerType.identityHandle,
      display: carrier.checker.typeToString(narrowed),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest);
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
        null,
        true,
      );
    }

    const member = ownerType.members.find((candidate) => candidate.name === memberName) ?? null;
    if (member != null) {
      return checkerTypeMemberWriteAccess(member, this.projector.publication);
    }

    const checkerMember = checkerMemberForOwnerType(ownerType, memberName);
    if (checkerMember != null) {
      const memberKind = checkerSymbolMemberKind(checkerMember.symbol, checkerMember.declarations);
      const mappedReadonly = checkerMember.declarations.length === 0 && memberKind === CheckerTypeMemberKind.Property
        ? checkerSyntheticMappedPropertyReadonly(checkerMember.symbol)
        : null;
      if (mappedReadonly != null) {
        return checkerTypeMemberWriteAccessResult(
          mappedReadonly
            ? CheckerTypeShapeMemberWriteAccessKind.Readonly
            : CheckerTypeShapeMemberWriteAccessKind.Writable,
          checkerMember.symbol.getName(),
          memberKind,
          [],
          null,
          !mappedReadonly,
        );
      }
      return checkerTypeMemberWriteAccessFromSurface(
        checkerMember.symbol.getName(),
        memberKind,
        checkerDeclarationsAreReadonly(checkerMember.declarations),
        checkerMember.declarations,
        this.checkerMemberValueSourceAddressHandle(checkerMember)
          ?? this.checkerMemberSourceAddressHandle(checkerMember),
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
        sourceAddressHandle: ownerType.sourceAddressHandle,
        checkerWritable: stringIndexInfo.isReadonly ? false : true,
      };
    }

    return {
      accessKind: CheckerTypeShapeMemberWriteAccessKind.Missing,
      memberName,
      memberKind: null,
      declarations: [],
      sourceAddressHandle: null,
      checkerWritable: null,
    };
  }

  keyedWriteAccess(
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
  ): CheckerTypeShapeMemberWriteAccess {
    if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
      return checkerTypeMemberWriteAccessResult(
        CheckerTypeShapeMemberWriteAccessKind.Writable,
        keyType.display ?? '[key]',
        CheckerTypeMemberKind.Property,
        [],
        null,
        true,
      );
    }

    const finiteKeys = finitePropertyKeysForKeyType(keyType);
    const finiteKeyAccess = finiteKeys.length === 0
      ? null
      : combineFiniteKeyMemberWriteAccess(
        finiteKeys.map((key) => this.memberWriteAccess(ownerType, key)),
        keyType.display ?? finiteKeys.join(' | '),
      );
    if (finiteKeyAccess != null && finiteKeyAccess.accessKind !== CheckerTypeShapeMemberWriteAccessKind.Missing) {
      return finiteKeyAccess;
    }

    const indexKind = indexKindForKeyType(keyType);
    if (indexKind != null) {
      const indexInfo = checkerTypeShapeIndexInfo(ownerType, indexKind);
      if (indexInfo != null) {
        return checkerTypeIndexWriteAccessResult(
          indexKind,
          keyType.display ?? `[${indexKind}]`,
          indexInfo.isReadonly,
          ownerType.sourceAddressHandle,
        );
      }
    }

    if (finiteKeyAccess != null) {
      return finiteKeyAccess;
    }

    return {
      accessKind: CheckerTypeShapeMemberWriteAccessKind.Missing,
      memberName: keyType.display ?? '[key]',
      memberKind: null,
      declarations: [],
      sourceAddressHandle: null,
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
    const tupleElementType = checker == null || type == null
      ? null
      : checkerTupleElementType(checker, type, index);
    if (checker != null && tupleElementType != null) {
      return this.projector.ensureProjection({
        localKey: `${localKey}:checker-tuple-index`,
        checker,
        type: tupleElementType,
        origin: CheckerTypeProjectionOrigin.TypeChecker,
        sourceAddressHandle,
        display: checker.typeToString(tupleElementType),
        memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
      } satisfies CheckerTypeProjectionRequest);
    }

    const property = checker == null || type == null
      ? null
      : checkerPropertySymbol(checker, type, String(index));
    const indexType = checker == null || type == null
      ? null
      : (property == null ? null : checkerSymbolValueType(checker, property))
        ?? checkerNumberIndexValueType(checker, type);
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

  iteratedValueType(
    ownerType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = ownerType.sourceAddressHandle,
  ): CheckerTypeShape | null {
    if (ownerType.iteratedValueType?.productHandle != null) {
      const iteratedValueType = this.resolveReference(ownerType.iteratedValueType);
      if (iteratedValueType != null) {
        return iteratedValueType;
      }
    }

    const checker = ownerType.carrier?.checker ?? null;
    const type = ownerType.carrier?.type ?? null;
    if (checker == null || type == null) {
      return null;
    }

    const iteratedType = checkerIterableElementType(checker, type);
    if (iteratedType == null) {
      return null;
    }

    return this.projector.ensureProjection({
      localKey,
      checker,
      type: iteratedType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: ownerType.carrier?.declarations[0] ?? null,
      sourceAddressHandle,
      display: checker.typeToString(iteratedType),
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
      const existing = readCheckerTypeShape(this.projector.publication, member.valueType);
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
      sourceAddressHandle: checkerTypeMemberValueSourceAddressHandle(
        this.projector.publication,
        member,
      )
        ?? checkerTypeMemberSourceAddressHandle(this.projector.publication, member),
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
      sourceAddressHandle: this.checkerMemberValueSourceAddressHandle(member)
        ?? this.checkerMemberSourceAddressHandle(member)
        ?? ownerType.sourceAddressHandle,
      ownerIdentityHandle: ownerType.identityHandle,
      display: carrier.checker.typeToString(valueType),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest);
  }

  private checkerMemberValueSourceAddressHandle(
    member: CheckerTypeShapeCheckerMember,
  ): AddressHandle | null {
    return checkerSymbolMemberValueSourceProjection(
      this.projector.publication,
      member.checker,
      member.symbol,
      member.declarations,
    ).sourceAddressHandle;
  }

  private checkerMemberSourceAddressHandle(
    member: CheckerTypeShapeCheckerMember,
  ): AddressHandle | null {
    return checkerSymbolMemberSourceProjection(
      this.projector.publication,
      member.checker,
      member.symbol,
      member.declarations,
    ).sourceAddressHandle;
  }
}

export function checkerTypeMemberWriteAccess(
  member: CheckerTypeMember,
  publication: KernelPublicationContext,
): CheckerTypeShapeMemberWriteAccess {
  return checkerTypeMemberWriteAccessFromSurface(
    member.name,
    member.memberKind,
    member.isReadonly,
    member.carrier?.declarations ?? [],
    checkerTypeMemberValueSourceAddressHandle(publication, member)
      ?? checkerTypeMemberSourceAddressHandle(publication, member),
  );
}

function checkerTypeMemberWriteAccessFromSurface(
  memberName: string,
  memberKind: CheckerTypeMemberKind,
  isReadonly: boolean,
  declarations: readonly ts.Declaration[],
  sourceAddressHandle: AddressHandle | null,
): CheckerTypeShapeMemberWriteAccess {
  if (memberKind === CheckerTypeMemberKind.Method
    || memberKind === CheckerTypeMemberKind.Constructor
    || memberKind === CheckerTypeMemberKind.CallSignature) {
    return checkerTypeMemberWriteAccessResult(
      CheckerTypeShapeMemberWriteAccessKind.MethodLike,
      memberName,
      memberKind,
      declarations,
      sourceAddressHandle,
      false,
    );
  }
  if (declarations.some((declaration) => ts.isSetAccessorDeclaration(declaration))) {
    return checkerTypeMemberWriteAccessResult(
      CheckerTypeShapeMemberWriteAccessKind.Writable,
      memberName,
      memberKind,
      declarations,
      sourceAddressHandle,
      true,
    );
  }
  if (declarations.some((declaration) => ts.isGetAccessorDeclaration(declaration))) {
    return checkerTypeMemberWriteAccessResult(
      CheckerTypeShapeMemberWriteAccessKind.GetterWithoutSetter,
      memberName,
      memberKind,
      declarations,
      sourceAddressHandle,
      false,
    );
  }
  if (isReadonly) {
    return checkerTypeMemberWriteAccessResult(
      CheckerTypeShapeMemberWriteAccessKind.Readonly,
      memberName,
      memberKind,
      declarations,
      sourceAddressHandle,
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
    sourceAddressHandle,
    declarations.length === 0 ? null : true,
  );
}

function checkerTypeMemberWriteAccessResult(
  accessKind: CheckerTypeShapeMemberWriteAccessKind,
  memberName: string,
  memberKind: CheckerTypeMemberKind | null,
  declarations: readonly ts.Declaration[],
  sourceAddressHandle: AddressHandle | null,
  checkerWritable: boolean | null,
): CheckerTypeShapeMemberWriteAccess {
  return {
    accessKind,
    memberName,
    memberKind,
    declarations,
    sourceAddressHandle,
    checkerWritable,
  };
}

function checkerTypeIndexWriteAccessResult(
  indexKind: ts.IndexKind,
  memberName: string,
  isReadonly: boolean,
  sourceAddressHandle: AddressHandle | null,
): CheckerTypeShapeMemberWriteAccess {
  const accessKind = indexKind === ts.IndexKind.Number
    ? isReadonly
      ? CheckerTypeShapeMemberWriteAccessKind.NumberIndexReadonly
      : CheckerTypeShapeMemberWriteAccessKind.NumberIndexWritable
    : isReadonly
      ? CheckerTypeShapeMemberWriteAccessKind.StringIndexReadonly
      : CheckerTypeShapeMemberWriteAccessKind.StringIndexWritable;
  return checkerTypeMemberWriteAccessResult(
    accessKind,
    memberName,
    CheckerTypeMemberKind.IndexSignature,
    [],
    sourceAddressHandle,
    !isReadonly,
  );
}

function combineFiniteKeyMemberWriteAccess(
  accesses: readonly CheckerTypeShapeMemberWriteAccess[],
  memberName: string,
): CheckerTypeShapeMemberWriteAccess {
  const blocking = accesses.find((access) => !checkerTypeMemberWriteAccessKindIsWritable(access.accessKind));
  if (blocking != null) {
    return {
      ...blocking,
      memberName,
    };
  }
  return checkerTypeMemberWriteAccessResult(
    CheckerTypeShapeMemberWriteAccessKind.Writable,
    memberName,
    accesses[0]?.memberKind ?? CheckerTypeMemberKind.Property,
    accesses.flatMap((access) => access.declarations),
    accesses.find((access) => access.sourceAddressHandle != null)?.sourceAddressHandle ?? null,
    accesses.every((access) => access.checkerWritable === true) ? true : null,
  );
}

function checkerTypeMemberWriteAccessKindIsWritable(
  accessKind: CheckerTypeShapeMemberWriteAccessKind,
): boolean {
  switch (accessKind) {
    case CheckerTypeShapeMemberWriteAccessKind.Writable:
    case CheckerTypeShapeMemberWriteAccessKind.StringIndexWritable:
    case CheckerTypeShapeMemberWriteAccessKind.NumberIndexWritable:
      return true;
    case CheckerTypeShapeMemberWriteAccessKind.Readonly:
    case CheckerTypeShapeMemberWriteAccessKind.GetterWithoutSetter:
    case CheckerTypeShapeMemberWriteAccessKind.MethodLike:
    case CheckerTypeShapeMemberWriteAccessKind.DeclarationMissing:
    case CheckerTypeShapeMemberWriteAccessKind.StringIndexReadonly:
    case CheckerTypeShapeMemberWriteAccessKind.NumberIndexReadonly:
    case CheckerTypeShapeMemberWriteAccessKind.Missing:
      return false;
  }
}

function checkerTypeMemberValueAccessResult(
  accessKind: CheckerTypeShapeMemberValueAccessKind,
  memberName: string,
  memberKind: CheckerTypeMemberKind | null,
  valueType: CheckerTypeShape | null,
  valueReference: CheckerTypeReference | null,
  declarations: readonly ts.Declaration[],
  memberSourceAddressHandle: AddressHandle | null,
  sourceAddressHandle: AddressHandle | null,
): CheckerTypeShapeMemberValueAccess {
  return {
    accessKind,
    memberName,
    memberKind,
    valueType,
    valueReference,
    declarations,
    memberSourceAddressHandle,
    sourceAddressHandle,
  };
}

interface CheckerTypeShapeCheckerMember {
  readonly checker: ts.TypeChecker;
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
  const symbol = checkerPropertySymbol(carrier.checker, carrier.type, memberName);
  if (symbol == null) {
    return null;
  }
  return {
    checker: carrier.checker,
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

function checkerSyntheticMappedPropertyReadonly(symbol: ts.Symbol): boolean | null {
  const mappedType = (symbol as {
    readonly links?: {
      readonly mappedType?: {
        readonly declaration?: ts.MappedTypeNode;
      };
    };
  }).links?.mappedType;
  const readonlyToken = mappedType?.declaration?.readonlyToken ?? null;
  if (mappedType == null) {
    return null;
  }
  return readonlyToken != null && readonlyToken.kind !== ts.SyntaxKind.MinusToken;
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
