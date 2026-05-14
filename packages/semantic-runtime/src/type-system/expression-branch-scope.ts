import type {
  BinaryExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { BindingScope } from '../configuration/scope.js';
import type { CheckerTypeProjector } from './checker-projector.js';
import {
  CheckerExpressionScopeNarrower,
  CheckerExpressionScopeNarrowingPolarity,
} from './expression-scope-narrower.js';
import { speculativeBindingScopeOverlay } from './speculative-binding-scope.js';

/** Branch-local Scope projection for expression constructs that speculate on a narrowed runtime Scope. */
export class CheckerExpressionBranchScopeProjector {
  private readonly scopeNarrower: CheckerExpressionScopeNarrower;

  constructor(
    private readonly store: KernelStore,
    projector: CheckerTypeProjector,
  ) {
    this.scopeNarrower = new CheckerExpressionScopeNarrower(store, projector);
  }

  truthyScope(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingScope {
    return this.narrowedScopeForExpression(
      expression,
      scope,
      CheckerExpressionScopeNarrowingPolarity.Truthy,
      localKey,
      sourceAddressHandle,
    );
  }

  falsyScope(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingScope {
    return this.narrowedScopeForExpression(
      expression,
      scope,
      CheckerExpressionScopeNarrowingPolarity.Falsy,
      localKey,
      sourceAddressHandle,
    );
  }

  nullishScope(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingScope {
    return this.narrowedScopeForExpression(
      expression,
      scope,
      CheckerExpressionScopeNarrowingPolarity.Nullish,
      localKey,
      sourceAddressHandle,
    );
  }

  shortCircuitRightScope(
    expression: BinaryExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingScope {
    switch (expression.operation) {
      case '&&':
        return this.truthyScope(expression.left, scope, `${localKey}:truthy-left`, sourceAddressHandle);
      case '||':
        return this.falsyScope(expression.left, scope, `${localKey}:falsy-left`, sourceAddressHandle);
      case '??':
        return this.nullishScope(expression.left, scope, `${localKey}:nullish-left`, sourceAddressHandle);
      default:
        return scope;
    }
  }

  private narrowedScopeForExpression(
    expression: ExpressionAstNode,
    scope: BindingScope,
    polarity: CheckerExpressionScopeNarrowingPolarity,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingScope {
    const narrowing = this.scopeNarrower.narrow({
      localKey,
      expression,
      scope,
      polarity,
      sourceAddressHandle,
    });
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
