import type { BindingScope } from '../configuration/scope.js';
import type {
  AccessKeyedExpression,
  AccessMemberExpression,
  CallMemberExpression,
  ExpressionAstNode,
  IsAssign,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  checkerTypeShapeIsDefinitelyNullish,
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
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  type CheckerTypeReference,
  type CheckerTypeShape,
  CheckerTypeShapeKind,
} from './type-shape.js';

export interface CheckerExpressionAccessProjectorHost {
  evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation;
}

export interface CheckerExpressionAccessRuntimeContext {
  readonly strict: boolean | null;
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    runtimeContext: CheckerExpressionAccessRuntimeContext,
  ): CheckerExpressionTypeEvaluation {
    const owner = this.host.evaluateNode(
      expression.object,
      scope,
      `${localKey}:owner:${expression.name.name}`,
      sourceAddressHandle,
    );
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    if (checkerTypeShapeIsDefinitelyNullish(owner.typeShape)) {
      return this.evaluateNullishAccess(
        expression,
        scope,
        `${localKey}:member:${expression.name.name}:nullish`,
        sourceAddressHandle,
        expression.optional,
        runtimeContext,
        CheckerExpressionTypeOpenKind.NullishMemberAccess,
        `Member access '${expression.name.name}' reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    return this.evaluateMemberOnType(
      expression,
      owner.typeShape,
      expression.name.name,
      `${localKey}:member:${expression.name.name}`,
    );
  }

  evaluateAccessKeyed(
    expression: AccessKeyedExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    runtimeContext: CheckerExpressionAccessRuntimeContext,
  ): CheckerExpressionTypeEvaluation {
    const owner = this.host.evaluateNode(
      expression.object,
      scope,
      `${localKey}:keyed-owner`,
      sourceAddressHandle,
    );
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    if (checkerTypeShapeIsDefinitelyNullish(owner.typeShape)) {
      return this.evaluateNullishAccess(
        expression,
        scope,
        `${localKey}:keyed:nullish`,
        sourceAddressHandle,
        expression.optional,
        runtimeContext,
        CheckerExpressionTypeOpenKind.NullishKeyedAccess,
        `Keyed access reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    const literalKey = literalPropertyKey(expression.key);
    if (literalKey != null) {
      const literalMember = this.evaluateMemberOnType(
        expression,
        owner.typeShape,
        literalKey,
        `${localKey}:keyed-member:${literalKey}`,
      );
      if (
        literalMember.kind === CheckerExpressionTypeEvaluationResultKind.Type
        || literalMember.openKind !== CheckerExpressionTypeOpenKind.MissingMember
      ) {
        return literalMember;
      }
    }

    const key = this.host.evaluateNode(expression.key, scope, `${localKey}:key`, sourceAddressHandle);
    if (key.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return key;
    }

    const finiteKeyAccess = this.evaluateFiniteKeyedAccess(
      expression,
      owner.typeShape,
      key.typeShape,
      `${localKey}:finite-key`,
      sourceAddressHandle,
    );
    if (finiteKeyAccess != null) {
      return finiteKeyAccess;
    }

    const indexedValueType = this.typeAccess.indexedValueReferenceForKeyType(owner.typeShape, key.typeShape);
    if (indexedValueType?.productHandle != null) {
      return this.support.resolveReference(
        expression,
        indexedValueType,
        `${localKey}:keyed-index`,
        CheckerExpressionTypeOpenKind.MissingMemberValueType,
        `Indexed value type for '${owner.typeShape.display}' could not be hydrated.`,
      );
    }

    const indexSignature = this.evaluateIndexSignatureAccess(
      expression,
      owner.typeShape,
      key.typeShape,
      localKey,
      sourceAddressHandle,
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    runtimeContext: CheckerExpressionAccessRuntimeContext,
  ): CheckerExpressionTypeEvaluation {
    const owner = this.host.evaluateNode(
      expression.object,
      scope,
      `${localKey}:call-owner:${expression.name.name}`,
      sourceAddressHandle,
    );
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    if (checkerTypeShapeIsDefinitelyNullish(owner.typeShape)) {
      return this.evaluateNullishAccess(
        expression,
        scope,
        `${localKey}:call-member:${expression.name.name}:nullish-owner`,
        sourceAddressHandle,
        expression.optionalMember,
        runtimeContext,
        CheckerExpressionTypeOpenKind.NullishMemberAccess,
        `Member call '${expression.name.name}' reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    return this.evaluateMemberOnType(
      expression,
      owner.typeShape,
      expression.name.name,
      `${localKey}:call-member:${expression.name.name}`,
    );
  }

  evaluateMemberOnType(
    expression: ExpressionAstNode,
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
      return this.support.type(ownerType, `Member '${memberName}' on any remains any.`);
    }
    const access = this.typeAccess.memberValueAccess(ownerType, memberName, localKey);
    if (access.accessKind === CheckerTypeShapeMemberValueAccessKind.Type && access.valueType != null) {
      return this.support.type(access.valueType, `Resolved member '${memberName}' value type for '${ownerType.display}'.`);
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

  private evaluateIndexSignatureAccess(
    expression: AccessKeyedExpression,
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const valueType = this.typeAccess.indexSignatureValueType(ownerType, keyType, localKey, sourceAddressHandle);
    if (valueType == null) {
      return null;
    }
    return this.support.type(valueType, `Projected index-signature value type for keyed access on '${ownerType.display}'.`);
  }

  private evaluateFiniteKeyedAccess(
    expression: AccessKeyedExpression,
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const valueTypes = this.typeAccess.finiteKeyedValueTypes(ownerType, keyType, localKey);
    if (valueTypes == null) {
      return null;
    }

    return this.support.evaluateTypeUnion(
      valueTypes.map((valueType) => this.support.type(valueType, `Projected finite keyed access member for '${ownerType.display}'.`)),
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
    runtimeContext: CheckerExpressionAccessRuntimeContext,
    openKind: CheckerExpressionTypeOpenKind.NullishMemberAccess | CheckerExpressionTypeOpenKind.NullishKeyedAccess,
    openSummary: string,
    partialTypeReference: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation {
    if (optional || runtimeContext.strict === false) {
      return this.support.projectPrimitive(expression, scope, `${localKey}:undefined`, 'undefined', sourceAddressHandle);
    }
    return this.support.open(openKind, expression, openSummary, partialTypeReference);
  }
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
