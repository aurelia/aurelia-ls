import type {
  ExpressionAstNode,
} from '../expression/ast.js';
import {
  expressionSourceName,
  expressionSourceRootName,
} from '../expression/expression-source-name.js';
import {
  runtimeAssignmentTargetAstForExpression,
} from '../expression/runtime-assignment.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
  type CheckerExpressionTypeOpenKind,
} from '../type-system/expression-type-evaluation.js';
import type {
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import type {
  CheckerExpressionTypeEvaluationContext,
} from '../type-system/expression-type-context.js';
import type {
  CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  projectRuntimeAssignmentValueConverterWriteback,
  type RuntimeAssignmentValueConverterWritebackStage,
} from '../type-system/value-converter-writeback.js';
import {
  checkerContextForRuntimeBindingSourceExpressionProjection,
  type RuntimeBindingSourceExpressionContextProjection,
} from './runtime-binding-source-expression-context.js';
import {
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
  RuntimeBindingDataFlowSourceKind,
} from './runtime-binding-observation.js';
import {
  type BindingDataFlowSourceWriteCapabilityProjector,
  type SourceWriteCapability,
  sourceWriteCapabilityOpen,
  sourceWriteCapabilityRuntimeUnassignable,
} from './binding-source-write-capability.js';

/** Source descriptor facts used by binding data-flow before row publication. */
export type SourceExpressionInfo = {
  readonly sourceKind: RuntimeBindingDataFlowSourceKind;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly sourceWriteCapability: SourceWriteCapability | null;
  readonly sourceTypeHint?: CheckerTypeReference | null;
  readonly sourceAssignmentValueTypeHint?: CheckerTypeReference | null;
  readonly targetToSourceValueTypeHint?: CheckerTypeReference | null;
  readonly targetToSourceValueTypeOpenReason?: string | null;
  readonly targetToSourceValueTypeOpenKind?: CheckerExpressionTypeOpenKind | null;
  readonly valueConverterWritebackStages: readonly RuntimeAssignmentValueConverterWritebackStage[];
};

/** Projects authored binding-source expressions into data-flow source descriptors and writeback hints. */
export class BindingDataFlowSourceInfoProjector {
  constructor(private readonly sourceWriteCapability: BindingDataFlowSourceWriteCapabilityProjector) {}

  open(needsSourceWriteCapability: boolean): SourceExpressionInfo {
    return {
      sourceKind: RuntimeBindingDataFlowSourceKind.Open,
      sourceName: null,
      sourceRootName: null,
      sourceWriteCapability: needsSourceWriteCapability
        ? sourceWriteCapabilityOpen(
          'Binding expression source could not be resolved.',
          RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceUnresolved,
        )
        : null,
      valueConverterWritebackStages: [],
    };
  }

  forExpression(
    expressionSite: RuntimeBindingSourceExpressionContextProjection,
    evaluator: CheckerExpressionTypeEvaluator,
    needsSourceWriteCapability: boolean,
    targetValueType: CheckerTypeReference | null,
  ): SourceExpressionInfo {
    const expression = expressionSite.expression;
    const checkerContext = checkerContextForRuntimeBindingSourceExpressionProjection(expressionSite, false);
    const unwrapped = runtimeAssignmentTargetAstForExpression(expression);
    const writeback = needsSourceWriteCapability
      ? this.valueConverterWritebackProjection(
        expression,
        unwrapped,
        evaluator,
        checkerContext,
        targetValueType,
      )
      : { valueConverterWritebackStages: [] };
    return {
      sourceKind: bindingDataFlowSourceKindForRuntimeAssignmentTarget(unwrapped),
      sourceName: bindingDataFlowSourceNameForRuntimeAssignmentTarget(unwrapped),
      sourceRootName: bindingDataFlowSourceRootNameForRuntimeAssignmentTarget(unwrapped),
      sourceWriteCapability: needsSourceWriteCapability
        ? this.sourceWriteCapabilityForRuntimeAssignmentTarget(unwrapped, checkerContext, evaluator)
        : null,
      ...writeback,
    };
  }

  private sourceWriteCapabilityForRuntimeAssignmentTarget(
    unwrapped: ExpressionAstNode,
    checkerContext: CheckerExpressionTypeEvaluationContext,
    evaluator: CheckerExpressionTypeEvaluator,
  ): SourceWriteCapability {
    switch (unwrapped.$kind) {
      case 'AccessScope':
        return this.sourceWriteCapability.forAccessScope(unwrapped, checkerContext.scope);
      case 'AccessMember':
        return this.sourceWriteCapability.forAccessMember(unwrapped, checkerContext, evaluator);
      case 'AccessKeyed':
        return this.sourceWriteCapability.forAccessKeyed(unwrapped, checkerContext, evaluator);
      case 'AccessThis':
        return sourceWriteCapabilityRuntimeUnassignable(
          'Aurelia astAssign does not assign to AccessThis expressions.',
          RuntimeBindingDataFlowSourceAssignmentReasonKind.RuntimeExpressionUnassignable,
        );
      default:
        return sourceWriteCapabilityRuntimeUnassignable(
          `Aurelia astAssign does not assign to expression kind '${unwrapped.$kind}'.`,
          RuntimeBindingDataFlowSourceAssignmentReasonKind.RuntimeExpressionUnassignable,
        );
    }
  }

  private valueConverterWritebackProjection(
    expression: ExpressionAstNode,
    unwrapped: ExpressionAstNode,
    evaluator: CheckerExpressionTypeEvaluator,
    checkerContext: CheckerExpressionTypeEvaluationContext,
    targetValueType: CheckerTypeReference | null,
  ): Pick<
    SourceExpressionInfo,
    | 'sourceAssignmentValueTypeHint'
    | 'targetToSourceValueTypeHint'
    | 'targetToSourceValueTypeOpenReason'
    | 'targetToSourceValueTypeOpenKind'
    | 'valueConverterWritebackStages'
  > {
    const writeback = projectRuntimeAssignmentValueConverterWriteback({
      expression,
      evaluator,
      context: checkerContext,
      targetValueType,
    });
    if (writeback == null) {
      return { valueConverterWritebackStages: [] };
    }

    const targetEvaluation = evaluator.evaluate(checkerContext.child(
      unwrapped,
      'assignment-target',
    ));
    const sourceAssignmentValueTypeHint = targetEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? targetEvaluation.typeReference
      : null;
    if (targetValueType == null) {
      return {
        sourceAssignmentValueTypeHint,
        targetToSourceValueTypeHint: null,
        targetToSourceValueTypeOpenReason: writeback.openReason,
        targetToSourceValueTypeOpenKind: writeback.openKind,
        valueConverterWritebackStages: writeback.stages,
      };
    }

    if (writeback.openReason != null) {
      return {
        sourceAssignmentValueTypeHint,
        targetToSourceValueTypeHint: null,
        targetToSourceValueTypeOpenReason: writeback.openReason,
        targetToSourceValueTypeOpenKind: writeback.openKind,
        valueConverterWritebackStages: writeback.stages,
      };
    }

    return {
      sourceAssignmentValueTypeHint,
      targetToSourceValueTypeHint: writeback.targetToSourceValueType,
      valueConverterWritebackStages: writeback.stages,
    };
  }
}

function bindingDataFlowSourceKindForRuntimeAssignmentTarget(
  expression: ExpressionAstNode,
): RuntimeBindingDataFlowSourceKind {
  switch (expression.$kind) {
    case 'AccessScope':
      return RuntimeBindingDataFlowSourceKind.ScopeName;
    case 'AccessMember':
      return RuntimeBindingDataFlowSourceKind.Member;
    case 'AccessKeyed':
      return RuntimeBindingDataFlowSourceKind.Keyed;
    case 'AccessThis':
      return RuntimeBindingDataFlowSourceKind.This;
    default:
      return RuntimeBindingDataFlowSourceKind.Other;
  }
}

function bindingDataFlowSourceNameForRuntimeAssignmentTarget(
  expression: ExpressionAstNode,
): string | null {
  return expression.$kind === 'AccessThis' ? '$this' : expressionSourceName(expression);
}

function bindingDataFlowSourceRootNameForRuntimeAssignmentTarget(
  expression: ExpressionAstNode,
): string | null {
  return expression.$kind === 'AccessThis' ? '$this' : expressionSourceRootName(expression);
}

/** Retargets a spread binding source descriptor to the concrete property being spread into. */
export function spreadSourceInfo(
  base: SourceExpressionInfo,
  targetProperty: string,
): SourceExpressionInfo {
  return {
    sourceKind: RuntimeBindingDataFlowSourceKind.Member,
    sourceName: base.sourceName == null ? targetProperty : `${base.sourceName}.${targetProperty}`,
    sourceRootName: base.sourceRootName,
    sourceWriteCapability: base.sourceWriteCapability == null
      ? null
      : sourceWriteCapabilityOpen(
        'SpreadValueBinding source property assignment policy has not been projected from the spread source member.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SpreadSourceMemberPolicyOpen,
      ),
    valueConverterWritebackStages: base.valueConverterWritebackStages,
  };
}
