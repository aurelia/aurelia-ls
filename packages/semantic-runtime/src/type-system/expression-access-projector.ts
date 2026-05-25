import type { BindingContextSlot, BindingScope } from '../configuration/scope.js';
import type {
  AccessKeyedExpression,
  AccessMemberExpression,
  CallMemberExpression,
  ExpressionAstNode,
  IsAssign,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  CheckerTypeNullishPresence,
  checkerTypeShapeNullishPresence,
} from './checker-related-types.js';
import {
  CheckerTypeShapeAccess,
  CheckerTypeShapeMemberValueAccessKind,
} from './checker-type-shape-access.js';
import {
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import type { CheckerExpressionTypeEvaluationContext } from './expression-type-context.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  type CheckerTypeReference,
  type CheckerTypeShape,
  CheckerTypeShapeKind,
} from './type-shape.js';

export interface CheckerExpressionAccessProjectorHost {
  evaluateNode(context: CheckerExpressionTypeEvaluationContext): CheckerExpressionTypeEvaluation;
}

/**
 * Projects Aurelia member/keyed access semantics through the TypeChecker type-shape surface.
 *
 * The lower `CheckerTypeShapeAccess` substrate answers whether a projected type has a member, finite keyed value, or
 * index-signature value. This projector owns the Aurelia expression-layer policy around evaluating owners/keys,
 * optional/nullish reads, and turning those lower access facts into expression evaluation results.
 */
export class CheckerExpressionAccessProjector {
  constructor(
    private readonly support: CheckerExpressionTypeSupport,
    private readonly typeAccess: CheckerTypeShapeAccess,
    private readonly host: CheckerExpressionAccessProjectorHost,
  ) {}

  evaluateAccessMember(
    expression: AccessMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const localKey = context.projectionLocalKey();
    const slotMember = this.evaluateSlotMemberRefinement(
      expression,
      context.scope,
      `${localKey}:member:${expression.name.name}:slot-refinement`,
    );
    if (slotMember != null) {
      return slotMember;
    }

    const owner = this.host.evaluateNode(context.child(
      expression.object,
      `owner:${expression.name.name}`,
    ));
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    const nullishPresence = checkerTypeShapeNullishPresence(owner.typeShape);
    if (nullishPresence === CheckerTypeNullishPresence.Definitely) {
      return this.evaluateNullishAccess(
        expression,
        context.scope,
        `${localKey}:member:${expression.name.name}:nullish`,
        context.sourceAddressHandle,
        expression.optional,
        context.runtimeContext,
        CheckerExpressionTypeOpenKind.NullishMemberAccess,
        `Member access '${expression.name.name}' reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }
    if (nullishPresence === CheckerTypeNullishPresence.Maybe) {
      return this.evaluatePossiblyNullishMemberAccess(
        expression,
        context,
        owner.typeShape,
        expression.name.name,
        `${localKey}:member:${expression.name.name}:maybe-nullish`,
        owner.sourceAddressHandle,
        expression.optional,
        CheckerExpressionTypeOpenKind.NullishMemberAccess,
        `Member access '${expression.name.name}' can reach nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    return this.evaluateMemberOnType(
      expression,
      owner.typeShape,
      expression.name.name,
      `${localKey}:member:${expression.name.name}`,
      owner.sourceAddressHandle,
    );
  }

  evaluateAccessKeyed(
    expression: AccessKeyedExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const localKey = context.projectionLocalKey();
    const owner = this.host.evaluateNode(context.child(
      expression.object,
      'keyed-owner',
    ));
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    const nullishPresence = checkerTypeShapeNullishPresence(owner.typeShape);
    if (nullishPresence === CheckerTypeNullishPresence.Definitely) {
      return this.evaluateNullishAccess(
        expression,
        context.scope,
        `${localKey}:keyed:nullish`,
        context.sourceAddressHandle,
        expression.optional,
        context.runtimeContext,
        CheckerExpressionTypeOpenKind.NullishKeyedAccess,
        `Keyed access reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }
    if (nullishPresence === CheckerTypeNullishPresence.Maybe) {
      return this.evaluatePossiblyNullishKeyedAccess(
        expression,
        context,
        owner.typeShape,
        `${localKey}:keyed:maybe-nullish`,
        owner.sourceAddressHandle,
        expression.optional,
        CheckerExpressionTypeOpenKind.NullishKeyedAccess,
        `Keyed access can reach nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    return this.evaluateKeyedOnType(expression, context, owner.typeShape, owner.sourceAddressHandle, localKey);
  }

  private evaluateKeyedOnType(
    expression: AccessKeyedExpression,
    context: CheckerExpressionTypeEvaluationContext,
    ownerType: CheckerTypeShape,
    ownerSourceAddressHandle: AddressHandle | null,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    const literalKey = literalPropertyKey(expression.key);
    if (literalKey != null) {
      const literalMember = this.evaluateMemberOnType(
        expression,
        ownerType,
        literalKey,
        `${localKey}:keyed-member:${literalKey}`,
        ownerSourceAddressHandle,
      );
      if (
        literalMember.kind === CheckerExpressionTypeEvaluationResultKind.Type
        || literalMember.openKind !== CheckerExpressionTypeOpenKind.MissingMember
      ) {
        return literalMember;
      }
    }

    const key = this.host.evaluateNode(context.child(expression.key, 'key'));
    if (key.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return key;
    }

    const finiteKeyAccess = this.evaluateFiniteKeyedAccess(
      expression,
      ownerType,
      key.typeShape,
      `${localKey}:finite-key`,
      context.sourceAddressHandle,
      ownerSourceAddressHandle,
    );
    if (finiteKeyAccess != null) {
      return finiteKeyAccess;
    }

    const indexedValueType = this.typeAccess.indexedValueReferenceForKeyType(ownerType, key.typeShape);
    if (indexedValueType?.productHandle != null) {
      return this.support.resolveReference(
        expression,
        indexedValueType,
        `${localKey}:keyed-index`,
        CheckerExpressionTypeOpenKind.MissingMemberValueType,
        `Indexed value type for '${ownerType.display}' could not be hydrated.`,
        null,
        ownerSourceAddressHandle ?? indexedValueType.sourceAddressHandle,
      );
    }

    const indexSignature = this.evaluateIndexSignatureAccess(
      expression,
      ownerType,
      key.typeShape,
      localKey,
      context.sourceAddressHandle,
      ownerSourceAddressHandle,
    );
    if (indexSignature != null) {
      return indexSignature;
    }

    return this.support.open(
      CheckerExpressionTypeOpenKind.UnsupportedKeyedAccess,
      expression,
      'Keyed access needs literal-key or index-signature projection before it can close.',
    );
  }

  evaluateCallMemberCallee(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const localKey = context.projectionLocalKey();
    const owner = this.host.evaluateNode(context.child(
      expression.object,
      `call-owner:${expression.name.name}`,
    ));
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    const nullishPresence = checkerTypeShapeNullishPresence(owner.typeShape);
    if (nullishPresence === CheckerTypeNullishPresence.Definitely) {
      return this.evaluateNullishAccess(
        expression,
        context.scope,
        `${localKey}:call-member:${expression.name.name}:nullish-owner`,
        context.sourceAddressHandle,
        expression.optionalMember,
        context.runtimeContext,
        CheckerExpressionTypeOpenKind.NullishMemberAccess,
        `Member call '${expression.name.name}' reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }
    if (nullishPresence === CheckerTypeNullishPresence.Maybe) {
      return this.evaluatePossiblyNullishMemberAccess(
        expression,
        context,
        owner.typeShape,
        expression.name.name,
        `${localKey}:call-member:${expression.name.name}:maybe-nullish-owner`,
        owner.sourceAddressHandle,
        expression.optionalMember,
        CheckerExpressionTypeOpenKind.NullishMemberAccess,
        `Member call '${expression.name.name}' can reach nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    return this.evaluateMemberOnType(
      expression,
      owner.typeShape,
      expression.name.name,
      `${localKey}:call-member:${expression.name.name}`,
      owner.sourceAddressHandle,
    );
  }

  evaluateMemberOnType(
    expression: ExpressionAstNode,
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
    ownerSourceAddressHandle: AddressHandle | null = ownerType.sourceAddressHandle,
  ): CheckerExpressionTypeEvaluation {
    if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
      return this.support.type(ownerType, `Member '${memberName}' on any remains any.`, ownerSourceAddressHandle);
    }
    const access = this.typeAccess.memberValueAccess(ownerType, memberName, localKey);
    if (access.accessKind === CheckerTypeShapeMemberValueAccessKind.Type && access.valueType != null) {
      return this.support.type(
        access.valueType,
        `Resolved member '${memberName}' value type for '${ownerType.display}'.`,
        access.sourceAddressHandle,
      );
    }
    if (access.accessKind === CheckerTypeShapeMemberValueAccessKind.Missing) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingMember,
        expression,
        `Type '${ownerType.display}' has no projected member '${memberName}'.`,
      );
    }

    return this.support.open(
      CheckerExpressionTypeOpenKind.MissingMemberValueType,
      expression,
      `Member '${memberName}' does not carry a value type that can be projected.`,
      access.valueReference,
    );
  }

  private evaluateSlotMemberRefinement(
    expression: AccessMemberExpression,
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation | null {
    const slot = accessScopeOwnerSlot(expression, scope);
    if (slot == null) {
      return null;
    }
    const memberType = slot.memberTypes.find((candidate) => candidate.name === expression.name.name) ?? null;
    if (memberType == null) {
      return null;
    }

    return this.support.resolveReference(
      expression,
      memberType.targetType,
      localKey,
      CheckerExpressionTypeOpenKind.MissingSlotType,
      `Slot '${slot.name}' member '${expression.name.name}' had a type refinement but no projected type detail.`,
      this.support.openSubject(
        'scope-slot',
        `${slot.name}.${expression.name.name}`,
        memberType.sourceAddressHandle,
        memberType.targetType,
      ),
    );
  }

  private evaluateIndexSignatureAccess(
    expression: AccessKeyedExpression,
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    ownerSourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const valueType = this.typeAccess.indexSignatureValueType(ownerType, keyType, localKey, sourceAddressHandle);
    if (valueType == null) {
      return null;
    }
    return this.support.type(
      valueType,
      `Projected index-signature value type for keyed access on '${ownerType.display}'.`,
      ownerSourceAddressHandle ?? ownerType.sourceAddressHandle,
    );
  }

  private evaluatePossiblyNullishMemberAccess(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
    ownerSourceAddressHandle: AddressHandle | null,
    optional: boolean,
    openKind: CheckerExpressionTypeOpenKind.NullishMemberAccess,
    openSummary: string,
    partialTypeReference: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation {
    if (!optional && context.runtimeContext.strict !== false) {
      return this.support.open(openKind, expression, openSummary, partialTypeReference);
    }
    const nonNullishOwner = this.typeAccess.nonNullishTypeShape(
      ownerType,
      `${localKey}:non-nullish-owner`,
      ownerSourceAddressHandle,
    );
    if (nonNullishOwner == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingTypeDetail,
        expression,
        `Non-nullish lane for '${ownerType.display}' could not be projected before member access '${memberName}'.`,
        partialTypeReference,
      );
    }
    const member = this.evaluateMemberOnType(
      expression,
      nonNullishOwner,
      memberName,
      `${localKey}:member`,
      ownerSourceAddressHandle,
    );
    if (member.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return member;
    }
    return this.unionWithUndefined(
      expression,
      context,
      member,
      `${localKey}:result`,
      `Non-strict/optional member access '${memberName}' can return the reached member value or undefined.`,
    );
  }

  private evaluatePossiblyNullishKeyedAccess(
    expression: AccessKeyedExpression,
    context: CheckerExpressionTypeEvaluationContext,
    ownerType: CheckerTypeShape,
    localKey: string,
    ownerSourceAddressHandle: AddressHandle | null,
    optional: boolean,
    openKind: CheckerExpressionTypeOpenKind.NullishKeyedAccess,
    openSummary: string,
    partialTypeReference: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation {
    if (!optional && context.runtimeContext.strict !== false) {
      return this.support.open(openKind, expression, openSummary, partialTypeReference);
    }
    const nonNullishOwner = this.typeAccess.nonNullishTypeShape(
      ownerType,
      `${localKey}:non-nullish-owner`,
      ownerSourceAddressHandle,
    );
    if (nonNullishOwner == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingTypeDetail,
        expression,
        `Non-nullish lane for '${ownerType.display}' could not be projected before keyed access.`,
        partialTypeReference,
      );
    }
    const keyed = this.evaluateKeyedOnType(
      expression,
      context,
      nonNullishOwner,
      ownerSourceAddressHandle,
      `${localKey}:keyed`,
    );
    if (keyed.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return keyed;
    }
    return this.unionWithUndefined(
      expression,
      context,
      keyed,
      `${localKey}:result`,
      'Non-strict/optional keyed access can return the reached value or undefined.',
    );
  }

  private evaluateFiniteKeyedAccess(
    expression: AccessKeyedExpression,
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    ownerSourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const valueTypes = this.typeAccess.finiteKeyedValueTypes(ownerType, keyType, localKey);
    if (valueTypes == null) {
      return null;
    }

    return this.support.evaluateTypeUnion(
      valueTypes.map((valueType) => this.support.type(
        valueType,
        `Projected finite keyed access member for '${ownerType.display}'.`,
        valueType.sourceAddressHandle ?? ownerSourceAddressHandle ?? ownerType.sourceAddressHandle,
      )),
      `${localKey}:result`,
      sourceAddressHandle,
      `Projected finite keyed access for '${ownerType.display}' through '${keyType.display}'.`,
    );
  }

  private evaluateNullishAccess(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    optional: boolean,
    runtimeContext: Pick<CheckerExpressionTypeEvaluationContext['runtimeContext'], 'strict'>,
    openKind: CheckerExpressionTypeOpenKind.NullishMemberAccess | CheckerExpressionTypeOpenKind.NullishKeyedAccess,
    openSummary: string,
    partialTypeReference: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation {
    if (optional || runtimeContext.strict === false) {
      return this.support.projectPrimitive(expression, scope, `${localKey}:undefined`, 'undefined', sourceAddressHandle);
    }
    return this.support.open(openKind, expression, openSummary, partialTypeReference);
  }

  private unionWithUndefined(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    value: CheckerExpressionTypeEvaluation & { readonly kind: CheckerExpressionTypeEvaluationResultKind.Type },
    localKey: string,
    summary: string,
  ): CheckerExpressionTypeEvaluation {
    const undefinedValue = this.support.projectPrimitive(
      expression,
      context.scope,
      `${localKey}:undefined`,
      'undefined',
      context.sourceAddressHandle,
    );
    return undefinedValue.kind === CheckerExpressionTypeEvaluationResultKind.Open
      ? undefinedValue
      : this.support.evaluateTypeUnion(
        [value, undefinedValue],
        localKey,
        context.sourceAddressHandle,
        summary,
      );
  }
}

function accessScopeOwnerSlot(
  expression: AccessMemberExpression,
  scope: BindingScope,
): BindingContextSlot | null {
  if (expression.object.$kind !== 'AccessScope') {
    return null;
  }
  return scope.lookup(expression.object.name.name, expression.object.ancestor).slot;
}

function literalPropertyKey(expression: IsAssign): string | null {
  if (expression.$kind !== 'PrimitiveLiteral') {
    return null;
  }
  if (typeof expression.value === 'string' || typeof expression.value === 'number') {
    return String(expression.value);
  }
  return null;
}
