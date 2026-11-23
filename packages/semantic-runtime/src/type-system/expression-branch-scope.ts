import type {
  BinaryExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import type { CheckerExpressionTypeEvaluationContext } from './expression-type-context.js';
import type { KernelStore } from '../kernel/store.js';
import type { BindingScope } from '../configuration/scope.js';
import {
  type CheckerExpressionScopeNarrower,
  CheckerExpressionScopeNarrowingPolarity,
} from './expression-scope-narrower.js';
import { speculativeBindingScopeOverlay } from './speculative-binding-scope.js';

/** Branch-local Scope projection for expression constructs that speculate on a narrowed runtime Scope. */
export class CheckerExpressionBranchScopeProjector {
  constructor(
    private readonly store: KernelStore,
    private readonly scopeNarrower: CheckerExpressionScopeNarrower,
  ) {}

  truthyScope(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): BindingScope {
    return this.narrowedScopeForExpression(
      expression,
      context,
      CheckerExpressionScopeNarrowingPolarity.Truthy,
      localKey,
    );
  }

  falsyScope(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): BindingScope {
    return this.narrowedScopeForExpression(
      expression,
      context,
      CheckerExpressionScopeNarrowingPolarity.Falsy,
      localKey,
    );
  }

  nullishScope(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): BindingScope {
    return this.narrowedScopeForExpression(
      expression,
      context,
      CheckerExpressionScopeNarrowingPolarity.Nullish,
      localKey,
    );
  }

  shortCircuitRightScope(
    expression: BinaryExpression,
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): BindingScope {
    switch (expression.operation) {
      case '&&':
        return this.truthyScope(expression.left, context, `${localKey}:truthy-left`);
      case '||':
        return this.falsyScope(expression.left, context, `${localKey}:falsy-left`);
      case '??':
        return this.nullishScope(expression.left, context, `${localKey}:nullish-left`);
      default:
        return context.scope;
    }
  }

  private narrowedScopeForExpression(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
  ): BindingScope {
    const { scope, sourceAddressHandle } = context;
    const narrowing = this.scopeNarrower.narrow({ localKey, expression, context, polarity, sourceAddressHandle });
    return narrowing == null
      ? scope
      : speculativeBindingScopeOverlay(this.store, {
        localKey,
        base: scope,
        bindingContextSlots: narrowing.bindingContextSlots,
        overrideContextSlots: narrowing.overrideContextSlots,
        sourceAddressHandle,
      });
  }
}
