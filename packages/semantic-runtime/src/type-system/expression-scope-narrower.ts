import ts from 'typescript';
import type {
  BinaryExpression,
  ExpressionPrimitiveLiteralValue,
  ExpressionAstNode,
} from '../expression/ast.js';
import {
  BindingContextSlotMemberType,
  BindingContextSlotDraft,
  BindingScope,
  BindingScopeLookupKind,
  type BindingContextSlot,
} from '../configuration/scope.js';
import type {
  AddressHandle,
} from '../kernel/handles.js';
import type {
  KernelStore,
} from '../kernel/store.js';
import {
  CheckerTypeProjector,
  type CheckerSyntheticTypeProjectionRequest,
  type CheckerTypeProjectionRequest,
} from './checker-projector.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShapeKind,
  checkerTypeMemberReachableIdentityHandle,
  sameCheckerTypeReference,
} from './type-shape.js';
import { TypeSystemHotDetails, TypeSystemProductDetails } from './product-details.js';
import { checkerNullishType } from './checker-related-types.js';
import {
  checkerPrimitiveLiteralType,
  checkerPrimitiveType,
  type CheckerPrimitiveName,
} from './checker-primitive-types.js';
import { checkerTypeMemberSourceAddressHandle } from './checker-type-member-source.js';
import { readOrProjectCheckerTypeMembers } from './checker-type-member-surface.js';
import { readCheckerTypeShape } from './checker-type-shape-access.js';
import { checkerRawTypeAssignable } from './checker-type-assignability.js';
import { checkerUnionTypeOrNever as checkerUnionType } from './checker-type-union.js';
import { checkerPropertySymbol, checkerSymbolValueType } from './checker-node-helpers.js';
import { checkerConstructReturnTypeUnion } from './checker-signature-parameters.js';

export const enum CheckerExpressionScopeNarrowingPolarity {
  Truthy = 'truthy',
  Falsy = 'falsy',
  Nullish = 'nullish',
  NonNullish = 'non-nullish',
}

export interface CheckerExpressionScopeNarrowingRequest {
  readonly localKey: string;
  readonly expression: ExpressionAstNode;
  readonly scope: BindingScope;
  readonly polarity: CheckerExpressionScopeNarrowingPolarity;
  readonly sourceAddressHandle: AddressHandle | null;
}

export interface CheckerExpressionScopeEqualityDomainNarrowingRequest {
  readonly localKey: string;
  readonly expression: ExpressionAstNode;
  readonly scope: BindingScope;
  readonly includeTypes?: readonly CheckerTypeReference[];
  readonly excludeTypes?: readonly CheckerTypeReference[];
  readonly sourceAddressHandle: AddressHandle | null;
}

export class CheckerExpressionScopeNarrowingResult {
  constructor(
    readonly bindingContextSlots: readonly BindingContextSlotDraft[],
    readonly overrideContextSlots: readonly BindingContextSlotDraft[],
  ) {}

  get isEmpty(): boolean {
    return this.bindingContextSlots.length === 0 && this.overrideContextSlots.length === 0;
  }
}

/** TypeChecker-backed branch-local scope narrowing for Aurelia expression ASTs. */
export class CheckerExpressionScopeNarrower {
  constructor(
    readonly store: KernelStore,
    readonly projector: CheckerTypeProjector,
  ) {}

  narrow(input: CheckerExpressionScopeNarrowingRequest): CheckerExpressionScopeNarrowingResult | null {
    const result = this.narrowExpression(
      input.expression,
      input.scope,
      input.polarity,
      input.localKey,
      input.sourceAddressHandle,
    );
    return result == null || result.isEmpty ? null : result;
  }

  narrowEqualityDomain(input: CheckerExpressionScopeEqualityDomainNarrowingRequest): CheckerExpressionScopeNarrowingResult | null {
    const target = this.narrowableEqualityTarget(input.expression, input.scope, input.localKey);
    if (target == null) {
      return null;
    }

    const narrowedType = this.equalityDomainNarrowedType(
      target.currentType,
      input.includeTypes ?? [],
      input.excludeTypes ?? [],
      `${input.localKey}:equality-domain`,
      input.sourceAddressHandle,
    );
    if (narrowedType == null || sameCheckerTypeReference(narrowedType, target.currentType)) {
      return null;
    }

    const narrowedSlot = target.narrowSlot(narrowedType, input.sourceAddressHandle);
    return target.lookupKind === BindingScopeLookupKind.OverrideContext
      ? new CheckerExpressionScopeNarrowingResult([], [narrowedSlot])
      : new CheckerExpressionScopeNarrowingResult([narrowedSlot], []);
  }

  private narrowExpression(
    expression: ExpressionAstNode,
    scope: BindingScope,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionScopeNarrowingResult | null {
    switch (expression.$kind) {
      case 'AccessScope':
        return expression.ancestor === 0
          ? this.narrowAccessScope(expression.name.name, scope, polarity, localKey, sourceAddressHandle)
          : null;
      case 'Paren':
        return this.narrowExpression(expression.expression, scope, polarity, `${localKey}:paren`, sourceAddressHandle);
      case 'Unary':
        return expression.operation === '!'
          ? this.narrowExpression(expression.expression, scope, invertPolarity(polarity), `${localKey}:not`, sourceAddressHandle)
          : null;
      case 'Binary':
        return this.narrowBinaryExpression(expression, scope, polarity, localKey, sourceAddressHandle);
      default:
        return null;
    }
  }

  private narrowBinaryExpression(
    expression: BinaryExpression,
    scope: BindingScope,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionScopeNarrowingResult | null {
    if (expression.operation === '&&' && polarity === CheckerExpressionScopeNarrowingPolarity.Truthy) {
      return combineNarrowings([
        this.narrowExpression(expression.left, scope, polarity, `${localKey}:and:left`, sourceAddressHandle),
        this.narrowExpression(expression.right, scope, polarity, `${localKey}:and:right`, sourceAddressHandle),
      ]);
    }

    if (expression.operation === '||' && polarity === CheckerExpressionScopeNarrowingPolarity.Falsy) {
      return combineNarrowings([
        this.narrowExpression(expression.left, scope, polarity, `${localKey}:or:left`, sourceAddressHandle),
        this.narrowExpression(expression.right, scope, polarity, `${localKey}:or:right`, sourceAddressHandle),
      ]);
    }

    const nullish = nullishComparisonNarrowing(expression, polarity);
    if (nullish != null) {
      return this.narrowExpression(
        nullish.expression,
        scope,
        nullish.polarity,
        `${localKey}:nullish-compare`,
        sourceAddressHandle,
      );
    }

    const typeofNarrowing = this.narrowTypeofEquality(expression, scope, polarity, localKey, sourceAddressHandle);
    if (typeofNarrowing != null) {
      return typeofNarrowing;
    }

    const propertyPresence = this.narrowPropertyPresence(expression, scope, polarity, localKey, sourceAddressHandle);
    if (propertyPresence != null) {
      return propertyPresence;
    }

    const instance = this.narrowInstanceof(expression, scope, polarity, localKey, sourceAddressHandle);
    if (instance != null) {
      return instance;
    }

    return this.narrowStrictLiteralEquality(expression, scope, polarity, localKey, sourceAddressHandle);
  }

  private narrowAccessScope(
    name: string,
    scope: BindingScope,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionScopeNarrowingResult | null {
    const lookup = scope.lookup(name);
    const slot = lookup.slot;
    if (slot?.targetType == null) {
      return null;
    }

    const projectedType = this.ensureProjectedSlotType(slot, slot.targetType, `${localKey}:slot:${name}`);
    const narrowedType = this.narrowedTypeReference(projectedType, polarity, `${localKey}:${polarity}:${name}`, sourceAddressHandle);
    if (narrowedType == null || sameCheckerTypeReference(narrowedType, projectedType)) {
      return null;
    }

    const narrowedSlot = bindingContextSlotWithTargetType(
      slot.name,
      slot.targetIdentityHandle,
      slot.targetProductHandle,
      narrowedType,
      slot.sourceAddressHandle ?? sourceAddressHandle,
      slot,
    );
    return lookup.lookupKind === BindingScopeLookupKind.OverrideContext
      ? new CheckerExpressionScopeNarrowingResult([], [narrowedSlot])
      : new CheckerExpressionScopeNarrowingResult([narrowedSlot], []);
  }

  private narrowableEqualityTarget(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
  ): NarrowableEqualityTarget | null {
    if (expression.$kind === 'Paren') {
      return this.narrowableEqualityTarget(expression.expression, scope, `${localKey}:paren`);
    }
    if (expression.$kind === 'AccessScope' && expression.ancestor === 0) {
      const lookup = scope.locate(expression.name.name);
      const slot = lookup.slot;
      if (slot?.targetType == null) {
        return null;
      }
      const currentType = this.ensureProjectedSlotType(slot, slot.targetType, `${localKey}:slot:${slot.name}`);
      return {
        lookupKind: lookup.lookupKind,
        currentType,
        narrowSlot: (targetType, sourceAddressHandle) => bindingContextSlotWithTargetType(
          slot.name,
          slot.targetIdentityHandle,
          slot.targetProductHandle,
          targetType,
          slot.sourceAddressHandle ?? sourceAddressHandle,
          slot,
        ),
      };
    }
    if (expression.$kind === 'AccessMember' && expression.object.$kind === 'AccessScope' && expression.object.ancestor === 0) {
      const lookup = scope.locate(expression.object.name.name);
      const slot = lookup.slot;
      if (slot == null) {
        return null;
      }
      const memberType = this.slotMemberTypeReference(
        slot,
        expression.name.name,
        `${localKey}:slot:${slot.name}:member:${expression.name.name}`,
      );
      if (memberType == null) {
        return null;
      }
      return {
        lookupKind: lookup.lookupKind,
        currentType: memberType,
        narrowSlot: (targetType, sourceAddressHandle) => this.bindingContextSlotWithMemberType(
          slot,
          expression.name.name,
          targetType,
          `${localKey}:slot:${slot.name}:member:${expression.name.name}:owner-narrow`,
          sourceAddressHandle,
        ),
      };
    }
    return null;
  }

  private narrowStrictLiteralEquality(
    expression: BinaryExpression,
    scope: BindingScope,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionScopeNarrowingResult | null {
    const comparison = strictLiteralEqualityComparison(expression);
    if (comparison == null) {
      return null;
    }
    const target = this.narrowableEqualityTarget(comparison.expression, scope, `${localKey}:equality-target`);
    if (target == null) {
      return null;
    }
    const literalType = this.literalTypeReference(
      target.currentType,
      comparison.literal,
      `${localKey}:literal-equality:${String(comparison.literal)}`,
      sourceAddressHandle,
    );
    if (literalType == null) {
      return null;
    }
    const equalityBranch = expression.operation === '==='
      ? CheckerExpressionScopeNarrowingPolarity.Truthy
      : CheckerExpressionScopeNarrowingPolarity.Falsy;
    const includeLiteral = polarity === equalityBranch;
    const narrowedType = this.equalityDomainNarrowedType(
      target.currentType,
      includeLiteral ? [literalType] : [],
      includeLiteral ? [] : [literalType],
      `${localKey}:literal-equality-domain`,
      sourceAddressHandle,
    );
    if (narrowedType == null || sameCheckerTypeReference(narrowedType, target.currentType)) {
      return null;
    }
    const narrowedSlot = target.narrowSlot(narrowedType, sourceAddressHandle);
    return target.lookupKind === BindingScopeLookupKind.OverrideContext
      ? new CheckerExpressionScopeNarrowingResult([], [narrowedSlot])
      : new CheckerExpressionScopeNarrowingResult([narrowedSlot], []);
  }

  private narrowTypeofEquality(
    expression: BinaryExpression,
    scope: BindingScope,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionScopeNarrowingResult | null {
    const comparison = typeofEqualityComparison(expression);
    if (comparison == null) {
      return null;
    }
    const target = this.narrowableEqualityTarget(comparison.expression, scope, `${localKey}:typeof-target`);
    if (target == null) {
      return null;
    }
    const type = this.primitiveTypeReference(
      target.currentType,
      comparison.primitive,
      `${localKey}:typeof:${comparison.primitive}`,
      sourceAddressHandle,
    );
    if (type == null) {
      return null;
    }
    const equalityBranch = expression.operation === '==='
      ? CheckerExpressionScopeNarrowingPolarity.Truthy
      : CheckerExpressionScopeNarrowingPolarity.Falsy;
    const includeType = polarity === equalityBranch;
    const narrowedType = this.equalityDomainNarrowedType(
      target.currentType,
      includeType ? [type] : [],
      includeType ? [] : [type],
      `${localKey}:typeof-domain`,
      sourceAddressHandle,
    );
    if (narrowedType == null || sameCheckerTypeReference(narrowedType, target.currentType)) {
      return null;
    }
    const narrowedSlot = target.narrowSlot(narrowedType, sourceAddressHandle);
    return target.lookupKind === BindingScopeLookupKind.OverrideContext
      ? new CheckerExpressionScopeNarrowingResult([], [narrowedSlot])
      : new CheckerExpressionScopeNarrowingResult([narrowedSlot], []);
  }

  private narrowPropertyPresence(
    expression: BinaryExpression,
    scope: BindingScope,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionScopeNarrowingResult | null {
    const comparison = propertyPresenceComparison(expression);
    if (comparison == null) {
      return null;
    }
    const target = this.narrowableEqualityTarget(comparison.expression, scope, `${localKey}:property-presence-target`);
    if (target == null) {
      return null;
    }
    const present = polarity === CheckerExpressionScopeNarrowingPolarity.Truthy;
    const narrowedType = this.propertyPresenceNarrowedType(
      target.currentType,
      comparison.propertyName,
      present,
      `${localKey}:property-presence:${comparison.propertyName}`,
      sourceAddressHandle,
    );
    if (narrowedType == null || sameCheckerTypeReference(narrowedType, target.currentType)) {
      return null;
    }
    const narrowedSlot = target.narrowSlot(narrowedType, sourceAddressHandle);
    return target.lookupKind === BindingScopeLookupKind.OverrideContext
      ? new CheckerExpressionScopeNarrowingResult([], [narrowedSlot])
      : new CheckerExpressionScopeNarrowingResult([narrowedSlot], []);
  }

  private narrowInstanceof(
    expression: BinaryExpression,
    scope: BindingScope,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionScopeNarrowingResult | null {
    const comparison = instanceofComparison(expression);
    if (comparison == null) {
      return null;
    }
    const target = this.narrowableEqualityTarget(comparison.expression, scope, `${localKey}:instanceof-target`);
    const constructorTarget = this.narrowableEqualityTarget(
      comparison.constructorExpression,
      scope,
      `${localKey}:instanceof-constructor`,
    );
    if (target == null || constructorTarget == null) {
      return null;
    }
    const instanceType = this.constructedInstanceTypeReference(
      constructorTarget.currentType,
      `${localKey}:instanceof-instance`,
      sourceAddressHandle,
    );
    if (instanceType == null) {
      return null;
    }

    const includeInstance = polarity === CheckerExpressionScopeNarrowingPolarity.Truthy;
    const narrowedType = this.equalityDomainNarrowedType(
      target.currentType,
      includeInstance ? [instanceType] : [],
      includeInstance ? [] : [instanceType],
      `${localKey}:instanceof-domain`,
      sourceAddressHandle,
    );
    if (narrowedType == null || sameCheckerTypeReference(narrowedType, target.currentType)) {
      return null;
    }
    const narrowedSlot = target.narrowSlot(narrowedType, sourceAddressHandle);
    return target.lookupKind === BindingScopeLookupKind.OverrideContext
      ? new CheckerExpressionScopeNarrowingResult([], [narrowedSlot])
      : new CheckerExpressionScopeNarrowingResult([narrowedSlot], []);
  }

  private literalTypeReference(
    targetType: CheckerTypeReference,
    value: ExpressionPrimitiveLiteralValue,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(targetType);
    if (carrier == null) {
      return null;
    }
    return this.projectType(
      carrier,
      checkerPrimitiveLiteralType(carrier.checker, value),
      localKey,
      sourceAddressHandle,
    );
  }

  private constructedInstanceTypeReference(
    constructorType: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(constructorType);
    if (carrier == null) {
      return null;
    }
    const constructed = checkerConstructReturnTypeUnion(carrier.checker, carrier.type);
    if (constructed == null) {
      return null;
    }
    return this.projectType(
      carrier,
      constructed,
      localKey,
      sourceAddressHandle,
    );
  }

  private propertyPresenceNarrowedType(
    source: CheckerTypeReference,
    propertyName: string,
    present: boolean,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(source);
    if (carrier == null) {
      return null;
    }
    const parts = unionConstituents(carrier.type);
    const selected = parts.filter((part) =>
      (checkerPropertyValueType(carrier.checker, part, propertyName, carrier.declarations[0] ?? null) != null) === present
    );
    if (selected.length === 0 || selected.length === parts.length) {
      return null;
    }
    return this.projectType(
      carrier,
      checkerUnionType(carrier.checker, selected),
      localKey,
      sourceAddressHandle,
    );
  }

  private primitiveTypeReference(
    targetType: CheckerTypeReference,
    primitive: CheckerPrimitiveName,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(targetType);
    if (carrier == null) {
      return null;
    }
    return this.projectType(
      carrier,
      checkerPrimitiveType(carrier.checker, primitive),
      localKey,
      sourceAddressHandle,
    );
  }

  private bindingContextSlotWithMemberType(
    slot: BindingContextSlot,
    memberName: string,
    memberType: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingContextSlotDraft {
    const ownerReference = slot.targetType == null
      ? null
      : this.ensureProjectedSlotType(slot, slot.targetType, `${localKey}:owner`);
    const ownerType = this.ownerTypeNarrowedByMemberType(
      ownerReference,
      memberName,
      memberType,
      localKey,
      sourceAddressHandle,
    ) ?? ownerReference ?? slot.targetType;
    const memberRefinement = new BindingContextSlotMemberType(memberName, memberType, sourceAddressHandle);
    return new BindingContextSlotDraft(
      slot.name,
      slot.targetIdentityHandle,
      slot.targetProductHandle,
      ownerType,
      slot.sourceAddressHandle,
      slot.fieldProvenance,
      slot.staticValue,
      [
        ...slot.memberTypes.filter((candidate) => candidate.name !== memberName),
        memberRefinement,
      ],
    );
  }

  private ownerTypeNarrowedByMemberType(
    ownerReference: CheckerTypeReference | null,
    memberName: string,
    memberType: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    if (ownerReference == null) {
      return null;
    }
    const ownerCarrier = this.carrierForReference(ownerReference);
    const memberCarrier = this.carrierForReference(memberType);
    if (ownerCarrier == null || memberCarrier == null || ownerCarrier.checker !== memberCarrier.checker) {
      return null;
    }

    const ownerParts = unionConstituents(ownerCarrier.type);
    const selected = ownerParts.filter((part) => {
      const propertyType = checkerPropertyValueType(ownerCarrier.checker, part, memberName, ownerCarrier.declarations[0] ?? null);
      return propertyType != null && typeOverlaps(ownerCarrier.checker, propertyType, memberCarrier.type);
    });
    if (selected.length === 0 || selected.length === ownerParts.length) {
      return null;
    }

    return this.projectType(
      ownerCarrier,
      checkerUnionType(ownerCarrier.checker, selected),
      localKey,
      sourceAddressHandle,
    );
  }

  private ensureProjectedSlotType(
    slot: BindingContextSlot,
    reference: CheckerTypeReference,
    localKey: string,
  ): CheckerTypeReference {
    if (reference.productHandle != null) {
      return reference;
    }

    const member = slot.targetProductHandle == null
      ? null
      : this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
    if (member?.carrier?.valueType == null) {
      return reference;
    }

    const sourceNode = member.carrier.declarations[0] ?? null;
    return this.projector.ensureProjection({
      localKey: `${localKey}:projected-type`,
      checker: member.carrier.checker,
      type: member.carrier.valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode,
      sourceAddressHandle: slot.sourceAddressHandle ?? checkerTypeMemberSourceAddressHandle(this.store, member),
      ownerIdentityHandle: checkerTypeMemberReachableIdentityHandle(member),
      display: reference.display ?? member.valueType?.display ?? null,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private slotMemberTypeReference(
    slot: BindingContextSlot,
    memberName: string,
    localKey: string,
  ): CheckerTypeReference | null {
    const refined = slot.memberTypes.find((member) => member.name === memberName)?.targetType ?? null;
    if (refined != null) {
      return refined;
    }
    const ownerReference = slot.targetType == null
      ? null
      : this.ensureProjectedSlotType(slot, slot.targetType, `${localKey}:owner`);
    const ownerShape = readCheckerTypeShape(this.store, ownerReference);
    if (ownerShape == null) {
      return null;
    }
    const member = readOrProjectCheckerTypeMembers(this.store, ownerShape, `${localKey}:members`)
      .find((candidate) => candidate.name === memberName) ?? null;
    if (member?.valueType != null) {
      if (member.valueType.productHandle != null || member.carrier?.valueType == null) {
        return member.valueType;
      }
      return this.projector.ensureProjection({
        localKey: `${localKey}:projected-member-type`,
        checker: member.carrier.checker,
        type: member.carrier.valueType,
        origin: CheckerTypeProjectionOrigin.TypeChecker,
        sourceNode: member.carrier.declarations[0] ?? null,
        sourceAddressHandle: member.sourceAddressHandle ?? slot.sourceAddressHandle ?? checkerTypeMemberSourceAddressHandle(this.store, member),
        ownerIdentityHandle: checkerTypeMemberReachableIdentityHandle(member),
        display: member.carrier.checker.typeToString(member.carrier.valueType),
      } satisfies CheckerTypeProjectionRequest).toReference();
    }
    if (member?.carrier?.valueType == null) {
      return null;
    }
    return this.projector.ensureProjection({
      localKey: `${localKey}:projected-member-type`,
      checker: member.carrier.checker,
      type: member.carrier.valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: member.carrier.declarations[0] ?? null,
      sourceAddressHandle: member.sourceAddressHandle ?? slot.sourceAddressHandle ?? checkerTypeMemberSourceAddressHandle(this.store, member),
      ownerIdentityHandle: checkerTypeMemberReachableIdentityHandle(member),
      display: member.carrier.checker.typeToString(member.carrier.valueType),
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private equalityDomainNarrowedType(
    source: CheckerTypeReference,
    includeTypes: readonly CheckerTypeReference[],
    excludeTypes: readonly CheckerTypeReference[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    let current = source;
    if (includeTypes.length > 0) {
      const included = this.includeEqualityDomainType(current, includeTypes, `${localKey}:include`, sourceAddressHandle);
      if (included == null) {
        return null;
      }
      current = included;
    }
    if (excludeTypes.length > 0) {
      const excluded = this.excludeEqualityDomainType(current, excludeTypes, `${localKey}:exclude`, sourceAddressHandle);
      if (excluded == null) {
        return null;
      }
      current = excluded;
    }
    return current;
  }

  private includeEqualityDomainType(
    source: CheckerTypeReference,
    includeTypes: readonly CheckerTypeReference[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const sourceCarrier = this.carrierForReference(source);
    const includeCarriers = sameCheckerCarriers(this.store, includeTypes, sourceCarrier?.checker ?? null);
    if (sourceCarrier == null || includeCarriers == null) {
      return null;
    }

    const includeType = checkerUnionType(sourceCarrier.checker, includeCarriers.map((carrier) => carrier.type));
    const selected = equalityIncludedTypes(sourceCarrier.checker, sourceCarrier.type, includeType);
    if (selected.length === 0) {
      return null;
    }
    return this.projectType(
      sourceCarrier,
      checkerUnionType(sourceCarrier.checker, selected),
      localKey,
      sourceAddressHandle,
    );
  }

  private excludeEqualityDomainType(
    source: CheckerTypeReference,
    excludeTypes: readonly CheckerTypeReference[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const sourceCarrier = this.carrierForReference(source);
    const excludeCarriers = sameCheckerCarriers(this.store, excludeTypes, sourceCarrier?.checker ?? null);
    if (sourceCarrier == null || excludeCarriers == null) {
      return null;
    }

    const sourceParts = unionConstituents(sourceCarrier.type);
    if (sourceParts.length === 1 && !sourceCarrier.type.isUnion()) {
      return source;
    }
    const excludeType = checkerUnionType(sourceCarrier.checker, excludeCarriers.map((carrier) => carrier.type));
    const retained = sourceParts.filter((part) => !typeOverlaps(sourceCarrier.checker, part, excludeType));
    return this.projectType(
      sourceCarrier,
      checkerUnionType(sourceCarrier.checker, retained),
      localKey,
      sourceAddressHandle,
    );
  }

  private truthyTypeReference(
    reference: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(reference);
    if (carrier == null) {
      return null;
    }
    const narrowed = booleanKind(carrier.checker, carrier.type) === BooleanTypeKind.Boolean
      ? carrier.checker.getTrueType()
      : carrier.checker.getNonNullableType(carrier.type);
    if (narrowed === carrier.type) {
      return reference;
    }
    return this.projectType(carrier, narrowed, localKey, sourceAddressHandle);
  }

  private falsyTypeReference(
    reference: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(reference);
    if (carrier == null) {
      return null;
    }

    const boolean = booleanKind(carrier.checker, carrier.type);
    if (boolean === BooleanTypeKind.Boolean || boolean === BooleanTypeKind.False) {
      return this.projectType(carrier, carrier.checker.getFalseType(), localKey, sourceAddressHandle);
    }

    return this.nullishTypeReference(reference, localKey, sourceAddressHandle);
  }

  private nullishTypeReference(
    reference: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(reference);
    if (carrier == null) {
      return null;
    }

    const nullishTypes = nullishConstituents(carrier.checker, carrier.type);
    if (nullishTypes.length === 0) {
      return null;
    }
    if (nullishTypes.length === 1) {
      return this.projectType(carrier, nullishTypes[0]!, localKey, sourceAddressHandle);
    }

    const references = nullishTypes.map((type, index) =>
      this.projectType(carrier, type, `${localKey}:part:${index}`, sourceAddressHandle)
    );
    return this.projector.ensureSyntheticProjection({
      localKey,
      shapeKind: CheckerTypeShapeKind.Union,
      display: references.map((part) => part.display ?? 'unknown').join(' | '),
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest).toReference();
  }

  private nonNullishTypeReference(
    reference: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(reference);
    if (carrier == null) {
      return null;
    }
    const narrowed = carrier.checker.getNonNullableType(carrier.type);
    return narrowed === carrier.type
      ? reference
      : this.projectType(carrier, narrowed, localKey, sourceAddressHandle);
  }

  private narrowedTypeReference(
    reference: CheckerTypeReference,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    switch (polarity) {
      case CheckerExpressionScopeNarrowingPolarity.Truthy:
        return this.truthyTypeReference(reference, localKey, sourceAddressHandle);
      case CheckerExpressionScopeNarrowingPolarity.Falsy:
        return this.falsyTypeReference(reference, localKey, sourceAddressHandle);
      case CheckerExpressionScopeNarrowingPolarity.Nullish:
        return this.nullishTypeReference(reference, localKey, sourceAddressHandle);
      case CheckerExpressionScopeNarrowingPolarity.NonNullish:
        return this.nonNullishTypeReference(reference, localKey, sourceAddressHandle);
    }
  }

  private carrierForReference(reference: CheckerTypeReference): CheckerTypeCarrierInput | null {
    if (reference.productHandle == null) {
      return null;
    }
    const carrier = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle)?.carrier ?? null;
    if (carrier == null) {
      return null;
    }
    return {
      checker: carrier.checker,
      type: carrier.type,
      declarations: carrier.declarations,
    };
  }

  private projectType(
    carrier: CheckerTypeCarrierInput,
    type: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    const sourceNode = carrier.declarations[0] ?? null;
    return this.projector.ensureProjection({
      localKey,
      checker: carrier.checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode,
      sourceAddressHandle,
      display: carrier.checker.typeToString(type, sourceNode ?? undefined),
    } satisfies CheckerTypeProjectionRequest).toReference();
  }
}

type CheckerTypeCarrierInput = {
  readonly checker: ts.TypeChecker;
  readonly type: ts.Type;
  readonly declarations: readonly ts.Declaration[];
};

interface NarrowableEqualityTarget {
  readonly lookupKind: BindingScopeLookupKind;
  readonly currentType: CheckerTypeReference;
  narrowSlot(targetType: CheckerTypeReference, sourceAddressHandle: AddressHandle | null): BindingContextSlotDraft;
}

const enum BooleanTypeKind {
  Boolean = 'boolean',
  True = 'true',
  False = 'false',
  Other = 'other',
}

function nullishComparisonNarrowing(
  expression: BinaryExpression,
  polarity: CheckerExpressionScopeNarrowingPolarity,
): { readonly expression: ExpressionAstNode; readonly polarity: CheckerExpressionScopeNarrowingPolarity } | null {
  if (expression.operation !== '==' && expression.operation !== '!=') {
    return null;
  }
  const leftNullish = isNullishLiteral(expression.left);
  const rightNullish = isNullishLiteral(expression.right);
  const narrowed = leftNullish ? expression.right : rightNullish ? expression.left : null;
  if (narrowed == null) {
    return null;
  }
  const positiveNullish = expression.operation === '=='
    ? CheckerExpressionScopeNarrowingPolarity.Nullish
    : CheckerExpressionScopeNarrowingPolarity.NonNullish;
  return {
    expression: narrowed,
    polarity: polarity === CheckerExpressionScopeNarrowingPolarity.Truthy
      ? positiveNullish
      : invertPolarity(positiveNullish),
  };
}

function strictLiteralEqualityComparison(
  expression: BinaryExpression,
): { readonly expression: ExpressionAstNode; readonly literal: ExpressionPrimitiveLiteralValue } | null {
  if (expression.operation !== '===' && expression.operation !== '!==') {
    return null;
  }
  if (expression.left.$kind === 'PrimitiveLiteral') {
    return {
      expression: expression.right,
      literal: expression.left.value,
    };
  }
  if (expression.right.$kind === 'PrimitiveLiteral') {
    return {
      expression: expression.left,
      literal: expression.right.value,
    };
  }
  return null;
}

function typeofEqualityComparison(
  expression: BinaryExpression,
): { readonly expression: ExpressionAstNode; readonly primitive: CheckerPrimitiveName } | null {
  if (expression.operation !== '===' && expression.operation !== '!==') {
    return null;
  }
  const left = typeofOperand(expression.left);
  const right = typeofOperand(expression.right);
  if (left != null && expression.right.$kind === 'PrimitiveLiteral') {
    const primitive = typeofPrimitiveName(expression.right.value);
    return primitive == null ? null : { expression: left, primitive };
  }
  if (right != null && expression.left.$kind === 'PrimitiveLiteral') {
    const primitive = typeofPrimitiveName(expression.left.value);
    return primitive == null ? null : { expression: right, primitive };
  }
  return null;
}

function typeofOperand(expression: ExpressionAstNode): ExpressionAstNode | null {
  return expression.$kind === 'Unary' && expression.operation === 'typeof'
    ? expression.expression
    : null;
}

function typeofPrimitiveName(value: ExpressionPrimitiveLiteralValue): CheckerPrimitiveName | null {
  switch (value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'undefined':
      return value;
    default:
      return null;
  }
}

function propertyPresenceComparison(
  expression: BinaryExpression,
): { readonly expression: ExpressionAstNode; readonly propertyName: string } | null {
  if (expression.operation !== 'in' || expression.left.$kind !== 'PrimitiveLiteral') {
    return null;
  }
  const value = expression.left.value;
  return typeof value === 'string' || typeof value === 'number'
    ? {
      expression: expression.right,
      propertyName: String(value),
    }
    : null;
}

function instanceofComparison(
  expression: BinaryExpression,
): { readonly expression: ExpressionAstNode; readonly constructorExpression: ExpressionAstNode } | null {
  return expression.operation === 'instanceof'
    ? {
      expression: expression.left,
      constructorExpression: expression.right,
    }
    : null;
}

function isNullishLiteral(expression: ExpressionAstNode): boolean {
  return expression.$kind === 'PrimitiveLiteral' && (expression.value == null);
}

function invertPolarity(
  polarity: CheckerExpressionScopeNarrowingPolarity,
): CheckerExpressionScopeNarrowingPolarity {
  switch (polarity) {
    case CheckerExpressionScopeNarrowingPolarity.Truthy:
      return CheckerExpressionScopeNarrowingPolarity.Falsy;
    case CheckerExpressionScopeNarrowingPolarity.Falsy:
      return CheckerExpressionScopeNarrowingPolarity.Truthy;
    case CheckerExpressionScopeNarrowingPolarity.Nullish:
      return CheckerExpressionScopeNarrowingPolarity.NonNullish;
    case CheckerExpressionScopeNarrowingPolarity.NonNullish:
      return CheckerExpressionScopeNarrowingPolarity.Nullish;
  }
}

function combineNarrowings(
  results: readonly (CheckerExpressionScopeNarrowingResult | null)[],
): CheckerExpressionScopeNarrowingResult | null {
  const bindingContextSlots = mergeSlotDrafts(results.flatMap((result) => result?.bindingContextSlots ?? []));
  const overrideContextSlots = mergeSlotDrafts(results.flatMap((result) => result?.overrideContextSlots ?? []));
  return bindingContextSlots.length === 0 && overrideContextSlots.length === 0
    ? null
    : new CheckerExpressionScopeNarrowingResult(bindingContextSlots, overrideContextSlots);
}

function mergeSlotDrafts(slots: readonly BindingContextSlotDraft[]): readonly BindingContextSlotDraft[] {
  const byName = new Map<string, BindingContextSlotDraft>();
  for (const slot of slots) {
    byName.set(slot.name, slot);
  }
  return [...byName.values()];
}

function nullishConstituents(
  checker: ts.TypeChecker,
  type: ts.Type,
): readonly ts.Type[] {
  const parts = type.isUnion() ? type.types : [type];
  const result = parts.filter((part) => checkerNullishType(checker, part));
  return result.length === 0 && checkerNullishType(checker, type)
    ? [type]
    : result;
}

function booleanKind(
  checker: ts.TypeChecker,
  type: ts.Type,
): BooleanTypeKind {
  const display = checker.typeToString(type);
  if (display === 'true') {
    return BooleanTypeKind.True;
  }
  if (display === 'false') {
    return BooleanTypeKind.False;
  }
  return (type.getFlags() & ts.TypeFlags.Boolean) !== 0 || display === 'boolean'
    ? BooleanTypeKind.Boolean
    : BooleanTypeKind.Other;
}

function bindingContextSlotWithTargetType(
  name: string,
  targetIdentityHandle: BindingContextSlot['targetIdentityHandle'],
  targetProductHandle: BindingContextSlot['targetProductHandle'],
  targetType: CheckerTypeReference,
  sourceAddressHandle: AddressHandle | null,
  source: BindingContextSlot,
): BindingContextSlotDraft {
  return new BindingContextSlotDraft(
    name,
    targetIdentityHandle,
    targetProductHandle,
    targetType,
    sourceAddressHandle,
    source.fieldProvenance,
    source.staticValue,
    source.memberTypes,
  );
}

function sameCheckerCarriers(
  store: KernelStore,
  references: readonly CheckerTypeReference[],
  checker: ts.TypeChecker | null,
): readonly CheckerTypeCarrierInput[] | null {
  const carriers = references.map((reference) => {
    const carrier = reference.productHandle == null
      ? null
      : store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle)?.carrier ?? null;
    return carrier == null
      ? null
      : {
        checker: carrier.checker,
        type: carrier.type,
        declarations: carrier.declarations,
      };
  });
  if (checker == null || carriers.some((carrier) => carrier == null || carrier.checker !== checker)) {
    return null;
  }
  return carriers as readonly CheckerTypeCarrierInput[];
}

function equalityIncludedTypes(
  checker: ts.TypeChecker,
  source: ts.Type,
  include: ts.Type,
): readonly ts.Type[] {
  const sourceParts = unionConstituents(source);
  const selected = sourceParts.filter((part) => checkerRawTypeAssignable(checker, part, include));
  if (selected.length > 0) {
    return selected;
  }
  return checkerRawTypeAssignable(checker, include, source)
    ? unionConstituents(include)
    : [];
}

function typeOverlaps(
  checker: ts.TypeChecker,
  left: ts.Type,
  right: ts.Type,
): boolean {
  return checkerRawTypeAssignable(checker, left, right) || checkerRawTypeAssignable(checker, right, left);
}

function unionConstituents(type: ts.Type): readonly ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

function checkerPropertyValueType(
  checker: ts.TypeChecker,
  owner: ts.Type,
  memberName: string,
  fallbackLocation: ts.Node | null,
): ts.Type | null {
  const symbol = checkerPropertySymbol(checker, owner, memberName);
  return symbol == null ? null : checkerSymbolValueType(checker, symbol, fallbackLocation);
}
