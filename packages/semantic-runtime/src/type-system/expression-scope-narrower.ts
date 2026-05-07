import ts from 'typescript';
import type {
  BinaryExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import {
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
  CheckerSyntheticTypeProjectionInput,
  CheckerTypeProjectionInput,
  CheckerTypeProjector,
} from './checker-projector.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShapeKind,
} from './type-shape.js';
import { TypeSystemProductDetails } from './product-details.js';

export const enum CheckerExpressionScopeNarrowingPolarity {
  Truthy = 'truthy',
  Falsy = 'falsy',
}

export class CheckerExpressionScopeNarrowingInput {
  constructor(
    readonly localKey: string,
    readonly expression: ExpressionAstNode,
    readonly scope: BindingScope,
    readonly polarity: CheckerExpressionScopeNarrowingPolarity,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
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

  narrow(input: CheckerExpressionScopeNarrowingInput): CheckerExpressionScopeNarrowingResult | null {
    const result = this.narrowExpression(
      input.expression,
      input.scope,
      input.polarity,
      input.localKey,
      input.sourceAddressHandle,
    );
    return result == null || result.isEmpty ? null : result;
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

    return null;
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
    const narrowedType = polarity === CheckerExpressionScopeNarrowingPolarity.Truthy
      ? this.truthyTypeReference(projectedType, `${localKey}:truthy:${name}`, sourceAddressHandle)
      : this.falsyTypeReference(projectedType, `${localKey}:falsy:${name}`, sourceAddressHandle);
    if (narrowedType == null || sameTypeReference(narrowedType, projectedType)) {
      return null;
    }

    const narrowedSlot = new BindingContextSlotDraft(
      slot.name,
      slot.targetIdentityHandle,
      slot.targetProductHandle,
      narrowedType,
      slot.sourceAddressHandle ?? sourceAddressHandle,
      slot.fieldProvenance,
    );
    return lookup.lookupKind === BindingScopeLookupKind.OverrideContext
      ? new CheckerExpressionScopeNarrowingResult([], [narrowedSlot])
      : new CheckerExpressionScopeNarrowingResult([narrowedSlot], []);
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
      : this.store.productDetails.read(TypeSystemProductDetails.TypeMember, slot.targetProductHandle);
    if (member?.carrier?.valueType == null) {
      return reference;
    }

    const sourceNode = member.carrier.declarations[0] ?? null;
    return this.projector.ensureProjection(new CheckerTypeProjectionInput(
      `${localKey}:projected-type`,
      member.carrier.checker,
      member.carrier.valueType,
      CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode,
      slot.sourceAddressHandle ?? member.sourceAddressHandle,
      member.identityHandle,
      reference.display ?? member.valueType?.display ?? null,
    )).toReference();
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

    const falsyTypes = nullishConstituents(carrier.checker, carrier.type);
    if (falsyTypes.length === 0) {
      return null;
    }
    if (falsyTypes.length === 1) {
      return this.projectType(carrier, falsyTypes[0]!, localKey, sourceAddressHandle);
    }

    const references = falsyTypes.map((type, index) =>
      this.projectType(carrier, type, `${localKey}:part:${index}`, sourceAddressHandle)
    );
    return this.projector.ensureSyntheticProjection(new CheckerSyntheticTypeProjectionInput(
      localKey,
      CheckerTypeShapeKind.Union,
      references.map((part) => part.display ?? 'unknown').join(' | '),
      [],
      null,
      null,
      CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    )).toReference();
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
    return this.projector.ensureProjection(new CheckerTypeProjectionInput(
      localKey,
      carrier.checker,
      type,
      CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceNode,
      sourceAddressHandle,
      null,
      carrier.checker.typeToString(type, sourceNode ?? undefined),
    )).toReference();
  }
}

type CheckerTypeCarrierInput = {
  readonly checker: ts.TypeChecker;
  readonly type: ts.Type;
  readonly declarations: readonly ts.Declaration[];
};

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
    ? CheckerExpressionScopeNarrowingPolarity.Falsy
    : CheckerExpressionScopeNarrowingPolarity.Truthy;
  return {
    expression: narrowed,
    polarity: polarity === CheckerExpressionScopeNarrowingPolarity.Truthy
      ? positiveNullish
      : invertPolarity(positiveNullish),
  };
}

function isNullishLiteral(expression: ExpressionAstNode): boolean {
  return expression.$kind === 'PrimitiveLiteral' && (expression.value == null);
}

function invertPolarity(
  polarity: CheckerExpressionScopeNarrowingPolarity,
): CheckerExpressionScopeNarrowingPolarity {
  return polarity === CheckerExpressionScopeNarrowingPolarity.Truthy
    ? CheckerExpressionScopeNarrowingPolarity.Falsy
    : CheckerExpressionScopeNarrowingPolarity.Truthy;
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
  const result = parts.filter((part) => isNullishType(checker, part));
  return result.length === 0 && isNullishType(checker, type)
    ? [type]
    : result;
}

function isNullishType(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  const flags = type.getFlags();
  return (flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) !== 0
    || checker.typeToString(type) === 'null'
    || checker.typeToString(type) === 'undefined';
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

function sameTypeReference(
  left: CheckerTypeReference,
  right: CheckerTypeReference,
): boolean {
  return left.productHandle === right.productHandle
    || (left.checkerKey === right.checkerKey && left.display === right.display);
}
