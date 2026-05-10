import ts from 'typescript';
import type { AddressHandle } from '../kernel/handles.js';
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
} from './type-shape.js';
import { checkerStringIndexValueType } from './checker-related-types.js';

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

    if (ownerType.indexedValueType != null) {
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

  stringIndexMemberValueType(
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
  ): CheckerTypeShape | null {
    if (ownerType.indexedValueType?.productHandle != null) {
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
