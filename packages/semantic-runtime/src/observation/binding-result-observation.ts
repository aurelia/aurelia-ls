import type { ExpressionAstNode } from '../expression/ast.js';
import { auLink } from '../kernel/au-link.js';
import type { RuntimeExpressionAccessPublicationDraft } from '../runtime-expression/runtime-expression-access-draft.js';
import {
  RuntimeExpressionAccessCoverage,
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessOrigin,
  RuntimeExpressionAccessPhase,
  RuntimeExpressionAccessRole,
  RuntimeExpressionExecutionMaximum,
  RuntimeExpressionExecutionMinimum,
  RuntimeExpressionExecutionQualifierKind,
} from '../runtime-expression/runtime-expression-access-use.js';
import { ContentBinding, InterpolationBinding } from '../template/runtime-binding.js';
import type { RuntimeExpressionBinding } from './runtime-binding-expression.js';

/** One framework call that observes a source result, separately from the source AST's connectable reads. */
@auLink('runtime-html:ContentBinding')
@auLink('runtime-html:InterpolationPartBinding')
export class BindingResultObservation {
  constructor(
    readonly phase: RuntimeExpressionAccessPhase,
    readonly access: RuntimeExpressionAccessPublicationDraft,
  ) {}
}

/**
 * Both bindings observe Array results even when a mode behavior disables AST dependency collection.
 * RC2 ContentBinding's source-change path clears stale subscriptions before testing result identity, so an unchanged
 * Array is not re-observed there. Its collection-change path and both interpolation-part paths do re-observe it.
 * These are call-site facts, not a promise that three subscriptions coexist or that a notification will ever occur.
 */
export function bindingResultObservations(
  binding: RuntimeExpressionBinding,
  expression: ExpressionAstNode,
): readonly BindingResultObservation[] {
  if (
    !(binding instanceof ContentBinding || binding instanceof InterpolationBinding)
    || hasPrimitiveLiteralResult(expression)
  ) {
    return [];
  }
  return [
    RuntimeExpressionAccessPhase.Bind,
    RuntimeExpressionAccessPhase.SourceEvaluation,
    RuntimeExpressionAccessPhase.BindingCollectionRefresh,
  ].map((phase) => new BindingResultObservation(phase, {
    origin: RuntimeExpressionAccessOrigin.Generated,
    accessForm: RuntimeExpressionAccessForm.Result,
    role: RuntimeExpressionAccessRole.Read,
    scopeLookupAncestor: null,
    authoredScopeAncestor: null,
    callbackScopeDepth: null,
    lexicalLocal: false,
    executionQualifiers: [
      {
        kind: RuntimeExpressionExecutionQualifierKind.RuntimeArrayResultGuard,
        sourceSpan: expression.span,
        operationName: 'Array.isArray',
      },
      ...(binding instanceof ContentBinding && phase === RuntimeExpressionAccessPhase.SourceEvaluation
        ? [{
            kind: RuntimeExpressionExecutionQualifierKind.BindingResultChangedGuard,
            sourceSpan: null,
            operationName: 'ContentBinding.handleChange',
          }]
        : []),
    ],
    minimumExecutions: RuntimeExpressionExecutionMinimum.Zero,
    maximumExecutions: RuntimeExpressionExecutionMaximum.One,
    coverage: RuntimeExpressionAccessCoverage.Complete,
    coverageReason: null,
    sourceSpan: expression.span,
    nameSourceSpan: null,
  }));
}

function hasPrimitiveLiteralResult(expression: ExpressionAstNode): boolean {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return true;
    case 'Paren':
      return hasPrimitiveLiteralResult(expression.expression);
    default:
      // Declared/inferred primitive types do not guarantee runtime values. Resource wrappers can replace evaluation,
      // including binding behaviors which rewrite the source AST during bind.
      return false;
  }
}
