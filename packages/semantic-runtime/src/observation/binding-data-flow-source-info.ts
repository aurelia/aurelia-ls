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
  isSyntheticWritebackLocal,
  sourceWriteCapabilityOpen,
  sourceWriteCapabilityRuntimeUnassignable,
  sourceWriteCapabilityWritable,
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
    };
  }

  templateControllerAlias(alias: string, needsSourceWriteCapability: boolean): SourceExpressionInfo {
    return {
      sourceKind: RuntimeBindingDataFlowSourceKind.ScopeName,
      sourceName: alias,
      sourceRootName: alias,
      sourceWriteCapability: needsSourceWriteCapability ? sourceWriteCapabilityWritable() : null,
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
      : {};
    switch (unwrapped.$kind) {
      case 'AccessScope':
        const syntheticWritebackTypeHint = needsSourceWriteCapability && isSyntheticWritebackLocal(unwrapped)
          ? targetValueType
          : null;
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.ScopeName,
          sourceName: expressionSourceName(unwrapped),
          sourceRootName: expressionSourceRootName(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? this.sourceWriteCapability.forAccessScope(unwrapped, checkerContext.scope, targetValueType)
            : null,
          sourceTypeHint: syntheticWritebackTypeHint,
          ...writeback,
        };
      case 'AccessMember':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Member,
          sourceName: expressionSourceName(unwrapped),
          sourceRootName: expressionSourceRootName(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? this.sourceWriteCapability.forAccessMember(
              unwrapped,
              checkerContext,
              evaluator,
            )
            : null,
          ...writeback,
        };
      case 'AccessKeyed':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Keyed,
          sourceName: expressionSourceName(unwrapped),
          sourceRootName: expressionSourceRootName(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? this.sourceWriteCapability.forAccessKeyed(
              unwrapped,
              checkerContext,
              evaluator,
            )
            : null,
          ...writeback,
        };
      case 'AccessThis':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.This,
          sourceName: '$this',
          sourceRootName: '$this',
          sourceWriteCapability: needsSourceWriteCapability
            ? sourceWriteCapabilityRuntimeUnassignable(
              'Aurelia astAssign does not assign to AccessThis expressions.',
              RuntimeBindingDataFlowSourceAssignmentReasonKind.RuntimeExpressionUnassignable,
            )
            : null,
          ...writeback,
        };
      default:
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Other,
          sourceName: expressionSourceName(unwrapped),
          sourceRootName: expressionSourceRootName(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? sourceWriteCapabilityRuntimeUnassignable(
              `Aurelia astAssign does not assign to expression kind '${unwrapped.$kind}'.`,
              RuntimeBindingDataFlowSourceAssignmentReasonKind.RuntimeExpressionUnassignable,
            )
            : null,
          ...writeback,
        };
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
  > {
    const writeback = projectRuntimeAssignmentValueConverterWriteback({
      expression,
      evaluator,
      context: checkerContext,
      targetValueType,
    });
    if (writeback == null) {
      return {};
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
      };
    }

    if (writeback.openReason != null) {
      return {
        sourceAssignmentValueTypeHint,
        targetToSourceValueTypeHint: null,
        targetToSourceValueTypeOpenReason: writeback.openReason,
        targetToSourceValueTypeOpenKind: writeback.openKind,
      };
    }

    return {
      sourceAssignmentValueTypeHint,
      targetToSourceValueTypeHint: writeback.targetToSourceValueType,
    };
  }
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
  };
}
