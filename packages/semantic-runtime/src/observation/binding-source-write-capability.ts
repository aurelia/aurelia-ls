import type {
  AccessKeyedExpression,
  AccessMemberExpression,
  AccessScopeExpression,
} from '../expression/ast.js';
import {
  BindingScope,
  BindingScopeCreatorKind,
  BindingScopeLookupKind,
  type BindingContextSlot,
} from '../configuration/scope.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  checkerTypeShapeIsDefinitelyNullish,
} from '../type-system/checker-related-types.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
  type CheckerExpressionTypeEvaluation,
} from '../type-system/expression-type-evaluation.js';
import type { CheckerExpressionTypeEvaluationContext } from '../type-system/expression-type-context.js';
import type { CheckerExpressionTypeEvaluator } from '../type-system/expression-type-evaluator.js';
import { TypeSystemHotDetails } from '../type-system/product-details.js';
import type {
  CheckerTypeReference,
  CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  CheckerTypeShapeMemberWriteAccessKind,
  checkerTypeMemberWriteAccess,
  type CheckerTypeShapeMemberWriteAccess,
} from '../type-system/checker-type-shape-access.js';
import {
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
} from './runtime-binding-observation.js';

/** Runtime assignment and checker-writability classification for an Aurelia binding source. */
export const enum SourceWriteCapabilityKind {
  /** Aurelia can assign to this source and TypeScript does not object to the modeled target. */
  Writable = 'writable',
  /** Aurelia can assign at runtime, but the TypeChecker surface reports a stricter write concern. */
  TypeScriptStrictness = 'typescript-strictness',
  /** Aurelia `astAssign` itself rejects this source shape. */
  RuntimeUnassignable = 'runtime-unassignable',
  /** The product cannot prove the source write policy yet. */
  Open = 'open',
}

export type SourceWriteCapability = {
  readonly capabilityKind: SourceWriteCapabilityKind;
  readonly checkerWritable: boolean | null;
  readonly reason: string | null;
  readonly reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind | null;
  readonly assignmentTargetType: CheckerTypeReference | null;
  readonly assignmentTargetSourceAddressHandle: AddressHandle | null;
};

export interface BindingDataFlowSourceWriteCapabilityTypeAccess {
  /** Reads a projected checker type shape from a retained type reference. */
  readTypeShape(reference: CheckerTypeReference | null): CheckerTypeShape | null;
  /** Classifies checker writability for a member of the projected owner shape. */
  memberWriteAccess(ownerType: CheckerTypeShape, memberName: string): CheckerTypeShapeMemberWriteAccess;
  /** Classifies checker writability for a keyed write through finite keys or compatible index signatures. */
  keyedWriteAccess(ownerType: CheckerTypeShape, keyType: CheckerTypeShape): CheckerTypeShapeMemberWriteAccess;
}

/** Projects source-write facts before row materialization turns them into data-flow diagnostics. */
export class BindingDataFlowSourceWriteCapabilityProjector {
  constructor(
    private readonly store: KernelStore,
    private readonly typeAccess: BindingDataFlowSourceWriteCapabilityTypeAccess,
  ) {}

  forAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
    targetValueType: CheckerTypeReference | null,
  ): SourceWriteCapability {
    if (isHostAccessScope(expression)) {
      return sourceWriteCapabilityRuntimeUnassignable(
        "Aurelia astAssign rejects assignment to the reserved '$host' access scope.",
        RuntimeBindingDataFlowSourceAssignmentReasonKind.HostAccessScopeAssignment,
      );
    }
    const lookup = scope.locate(expression.name.name, expression.ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return sourceWriteCapabilityOpen(
        'Scope lookup could not resolve the requested ancestor for runtime assignment.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeLookupMissingAncestor,
      );
    }
    if (lookup.slot == null && isSyntheticWritebackLocal(expression)) {
      return sourceWriteCapabilityWritable(targetValueType);
    }
    if (lookup.slot == null) {
      const contextType = lookup.context?.contextType ?? null;
      const contextShape = this.typeAccess.readTypeShape(contextType);
      if (contextShape != null) {
        return sourceWriteCapabilityForMemberAccess(
          this.typeAccess.memberWriteAccess(contextShape, expression.name.name),
          contextShape.display ?? contextType?.display ?? null,
          contextType,
          contextType?.sourceAddressHandle ?? contextShape.sourceAddressHandle,
        );
      }
    }
    if (lookup.slot == null) {
      return sourceWriteCapabilityTypeScriptStrictness(
        'Scope lookup did not expose a TypeChecker slot; Aurelia astAssign can still write to the runtime context.',
        null,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotMissingTypeCheckerMember,
      );
    }
    return isRuntimeAssignmentScopeSlot(lookup.scope, lookup.slot)
      ? sourceWriteCapabilityWritable(lookup.slot.targetType, lookup.slot.sourceAddressHandle)
      : this.forSlot(lookup.slot);
  }

  forAccessMember(
    expression: AccessMemberExpression,
    checkerContext: CheckerExpressionTypeEvaluationContext,
    evaluator: CheckerExpressionTypeEvaluator,
  ): SourceWriteCapability {
    const ownerEvaluation = evaluator.evaluate(checkerContext.child(
      expression.object,
      `owner:${localKeyPart(expression.name.name)}`,
    ));
    if (ownerEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return sourceWriteCapabilityOpen(
        ownerEvaluation.summary,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.OwnerTypeOpen,
      );
    }
    const ownerShape = ownerEvaluation.typeShape;
    if (checkerContext.runtimeContext.strict === true && checkerTypeShapeIsDefinitelyNullish(ownerShape)) {
      return sourceWriteCapabilityRuntimeUnassignable(
        `Aurelia strict astAssign rejects member assignment '${expression.name.name}' because the owner type is definitely nullish.`,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.NullishAssignment,
      );
    }
    return sourceWriteCapabilityForMemberAccess(
      this.typeAccess.memberWriteAccess(ownerShape, expression.name.name),
      ownerShape.display ?? ownerEvaluation.typeReference.display,
      ownerEvaluation.typeReference,
      ownerEvaluation.sourceAddressHandle,
    );
  }

  forAccessKeyed(
    expression: AccessKeyedExpression,
    checkerContext: CheckerExpressionTypeEvaluationContext,
    evaluator: CheckerExpressionTypeEvaluator,
  ): SourceWriteCapability {
    const ownerEvaluation = evaluator.evaluate(checkerContext.child(
      expression.object,
      'owner:keyed',
    ));
    if (ownerEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return sourceWriteCapabilityOpen(
        ownerEvaluation.summary,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.OwnerTypeOpen,
      );
    }
    const ownerShape = ownerEvaluation.typeShape;
    return checkerContext.runtimeContext.strict === true && checkerTypeShapeIsDefinitelyNullish(ownerShape)
      ? sourceWriteCapabilityRuntimeUnassignable(
        'Aurelia strict astAssign rejects keyed assignment because the owner type is definitely nullish.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.NullishAssignment,
        null,
        sourceWriteCapabilitySourceForOwnerEvaluation(ownerEvaluation),
      )
      : this.forKeyedOwner(expression, ownerEvaluation, checkerContext, evaluator);
  }

  private forKeyedOwner(
    expression: AccessKeyedExpression,
    ownerEvaluation: CheckerExpressionTypeEvaluation & {
      readonly kind: CheckerExpressionTypeEvaluationResultKind.Type;
    },
    checkerContext: CheckerExpressionTypeEvaluationContext,
    evaluator: CheckerExpressionTypeEvaluator,
  ): SourceWriteCapability {
    const keyEvaluation = evaluator.evaluate(checkerContext.child(expression.key, 'key'));
    if (keyEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return sourceWriteCapabilityOpen(
        keyEvaluation.summary,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.KeyTypeOpen,
        null,
        sourceWriteCapabilitySourceForOwnerEvaluation(ownerEvaluation),
      );
    }
    return sourceWriteCapabilityForMemberAccess(
      this.typeAccess.keyedWriteAccess(ownerEvaluation.typeShape, keyEvaluation.typeShape),
      ownerEvaluation.typeShape.display ?? ownerEvaluation.typeReference.display,
      ownerEvaluation.typeReference,
      ownerEvaluation.sourceAddressHandle,
    );
  }

  private forSlot(slot: BindingContextSlot): SourceWriteCapability {
    if (slot.targetProductHandle == null) {
      return sourceWriteCapabilityTypeScriptStrictness(
        'Scope slot is runtime-only and does not carry a TypeChecker member product; Aurelia astAssign can still write to the runtime context.',
        null,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotRuntimeOnly,
      );
    }
    const member = this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
    return member == null
      ? sourceWriteCapabilityOpen(
        'Scope slot member product was not available for runtime assignment policy.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotTypeCheckerMemberUnavailable,
      )
      : sourceWriteCapabilityForMemberAccess(
        checkerTypeMemberWriteAccess(member, this.store),
        member.ownerType.display,
        member.ownerType,
        member.ownerType.sourceAddressHandle,
      );
  }
}

export function isSyntheticWritebackLocal(expression: AccessScopeExpression): boolean {
  return expression.ancestor === 0
    && expression.name.name.startsWith('$')
    && !isHostAccessScope(expression);
}

function isRuntimeAssignmentScopeSlot(scope: BindingScope | null, slot: BindingContextSlot): boolean {
  return scope?.scopeCreators.some((creator) =>
    creator.creatorKind === BindingScopeCreatorKind.RuntimeAssignment
    && creator.introducedSlotNames.includes(slot.name)
  ) === true;
}

function isHostAccessScope(expression: AccessScopeExpression): boolean {
  return expression.ancestor === 0 && expression.name.name === '$host';
}

export function sourceWriteCapabilityWritable(
  assignmentTargetType: CheckerTypeReference | null = null,
  assignmentTargetSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.Writable,
    checkerWritable: true,
    reason: null,
    reasonKind: null,
    assignmentTargetType,
    assignmentTargetSourceAddressHandle,
  };
}

function sourceWriteCapabilityTypeScriptStrictness(
  reason: string,
  checkerWritable: boolean | null,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
  assignmentTargetType: CheckerTypeReference | null = null,
  assignmentTargetSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.TypeScriptStrictness,
    checkerWritable,
    reason,
    reasonKind,
    assignmentTargetType,
    assignmentTargetSourceAddressHandle,
  };
}

export function sourceWriteCapabilityRuntimeUnassignable(
  reason: string,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
  assignmentTargetType: CheckerTypeReference | null = null,
  assignmentTargetSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.RuntimeUnassignable,
    checkerWritable: false,
    reason,
    reasonKind,
    assignmentTargetType,
    assignmentTargetSourceAddressHandle,
  };
}

export function sourceWriteCapabilityOpen(
  reason: string,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
  assignmentTargetType: CheckerTypeReference | null = null,
  assignmentTargetSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.Open,
    checkerWritable: null,
    reason,
    reasonKind,
    assignmentTargetType,
    assignmentTargetSourceAddressHandle,
  };
}

function sourceWriteCapabilityForMemberAccess(
  access: CheckerTypeShapeMemberWriteAccess,
  ownerDisplay: string | null,
  assignmentTargetType: CheckerTypeReference | null,
  fallbackSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  const sourceAddressHandle = access.sourceAddressHandle ?? fallbackSourceAddressHandle;
  switch (access.accessKind) {
    case CheckerTypeShapeMemberWriteAccessKind.Writable:
    case CheckerTypeShapeMemberWriteAccessKind.StringIndexWritable:
    case CheckerTypeShapeMemberWriteAccessKind.NumberIndexWritable:
      return sourceWriteCapabilityWritable(null, sourceAddressHandle);
    case CheckerTypeShapeMemberWriteAccessKind.MethodLike:
      return sourceWriteCapabilityRuntimeUnassignable(
        `Source member '${access.memberName}' is a ${access.memberKind ?? 'member'} and is not an Aurelia astAssign target.`,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberRuntimeUnassignable,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.GetterWithoutSetter:
      return sourceWriteCapabilityRuntimeUnassignable(
        `Source member '${access.memberName}' is a getter without a setter at runtime.`,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberGetterWithoutSetter,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.Readonly:
      return sourceWriteCapabilityTypeScriptStrictness(
        `Source member '${access.memberName}' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment.`,
        access.checkerWritable,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberReadonly,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.StringIndexReadonly:
      return sourceWriteCapabilityTypeScriptStrictness(
        `Owner type '${ownerDisplay ?? 'unknown'}' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects.`,
        access.checkerWritable,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberReadonly,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.NumberIndexReadonly:
      return sourceWriteCapabilityTypeScriptStrictness(
        `Owner type '${ownerDisplay ?? 'unknown'}' exposes a readonly number index signature; Aurelia astAssign still writes to runtime objects.`,
        access.checkerWritable,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberReadonly,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.DeclarationMissing:
      return sourceWriteCapabilityOpen(
        `Source member '${access.memberName}' did not expose declarations for assignment policy.`,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberDeclarationMissing,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.Missing:
      return sourceWriteCapabilityTypeScriptStrictness(
        `Owner type '${ownerDisplay ?? 'unknown'}' did not project member '${access.memberName}'; Aurelia astAssign can still write to runtime objects.`,
        access.checkerWritable,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.OwnerMemberNotProjected,
        assignmentTargetType,
        sourceAddressHandle,
      );
  }
}

function sourceWriteCapabilitySourceForOwnerEvaluation(
  evaluation: CheckerExpressionTypeEvaluation,
): AddressHandle | null {
  return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
    ? evaluation.sourceAddressHandle
    : evaluation.subject?.sourceAddressHandle
      ?? evaluation.partialTypeReference?.sourceAddressHandle
      ?? null;
}
