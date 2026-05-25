import {
  BindingScope,
  BindingScopeLookupKind,
  type BindingContextReference,
  type BindingScopeLookup,
} from '../configuration/scope.js';
import type {
  AccessGlobalExpression,
  AccessScopeExpression,
  AccessThisExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import { CheckerExpressionAccessProjector } from './expression-access-projector.js';
import {
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import type { CheckerTypeReference } from './type-shape.js';

/** Projects Aurelia runtime Scope lookup semantics into TypeChecker expression results. */
export class CheckerExpressionScopeProjector {
  constructor(
    private readonly support: CheckerExpressionTypeSupport,
    private readonly access: CheckerExpressionAccessProjector,
  ) {}

  evaluateAccessThis(
    expression: AccessThisExpression,
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    const lookup = scope.lookupThis(expression.ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingAncestor,
        expression,
        `Could not resolve $this ancestor ${expression.ancestor}.`,
      );
    }
    if (lookup.context == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingContext,
        expression,
        `No context was available for $this ancestor ${expression.ancestor}.`,
      );
    }

    return this.resolveContextType(expression, lookup.context, `${localKey}:this:${expression.ancestor}`);
  }

  evaluateAccessBoundary(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    const current = scope.locateBoundary();
    if (current == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingContext,
        expression,
        'No boundary scope was reachable for AccessBoundary.',
      );
    }
    return this.resolveContextType(expression, current.bindingContext.toReference(), `${localKey}:boundary`);
  }

  evaluateAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateScopeName(expression, scope, expression.name.name, expression.ancestor, localKey);
  }

  evaluateAccessGlobal(
    expression: AccessGlobalExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const type = this.support.resolveGlobalType(scope, expression.name.name);
    if (type == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.UnsupportedGlobalAccess,
        expression,
        `Global '${expression.name.name}' could not be resolved through the active TypeChecker.`,
      );
    }
    return this.support.projectType(expression, type.checker, type.type, `${localKey}:global:${expression.name.name}`, sourceAddressHandle);
  }

  evaluateScopeName(
    expression: ExpressionAstNode,
    scope: BindingScope,
    name: string,
    ancestor: number,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    const lookup = scope.lookup(name, ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingAncestor,
        expression,
        `Could not resolve ancestor ${ancestor} for '${name}'.`,
      );
    }

    if (lookup.slot?.targetType != null) {
      const slotType = this.support.ensureProjectedSlotType(lookup.slot, lookup.slot.targetType, `${localKey}:slot:${name}`);
      return this.support.resolveReference(
        expression,
        slotType,
        `${localKey}:slot:${name}`,
        CheckerExpressionTypeOpenKind.MissingSlotType,
        `Slot '${name}' had a type reference but no projected type detail.`,
        this.support.openSubject('scope-slot', name, lookup.slot.sourceAddressHandle, slotType),
      );
    }

    if (name === '$host' && ancestor === 0 && lookup.slot == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.HostContextNotFound,
        expression,
        'Aurelia astEvaluate could not find a $host context for this binding scope.',
      );
    }

    const contextType = this.readContextType(lookup);
    if (contextType == null) {
      return this.support.open(
        lookup.slot == null
          ? CheckerExpressionTypeOpenKind.MissingContextType
          : CheckerExpressionTypeOpenKind.MissingSlotType,
        expression,
        lookup.slot == null
          ? `No slot or context type was available for '${name}'.`
          : `Slot '${name}' does not carry a target type yet.`,
        null,
        lookup.slot == null
          ? this.support.openSubject('scope-context', name, lookup.context?.sourceAddressHandle ?? lookup.scope?.sourceAddressHandle ?? null)
          : this.support.openSubject('scope-slot', name, lookup.slot.sourceAddressHandle),
      );
    }

    const contextShape = this.support.resolveReference(
      expression,
      contextType,
      `${localKey}:context:${name}`,
      CheckerExpressionTypeOpenKind.MissingContextType,
      `Context type for '${name}' had no projected type detail.`,
      this.support.openSubject('scope-context', name, lookup.context?.sourceAddressHandle ?? lookup.scope?.sourceAddressHandle ?? null, contextType),
    );
    if (contextShape.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return contextShape;
    }

    return this.access.evaluateMemberOnType(
      expression,
      contextShape.typeShape,
      name,
      `${localKey}:context-member:${name}`,
    );
  }

  private readContextType(lookup: BindingScopeLookup): CheckerTypeReference | null {
    return lookup.context?.contextType ?? null;
  }

  private resolveContextType(
    expression: ExpressionAstNode,
    context: BindingContextReference | null,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    if (context == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingContext,
        expression,
        'Binding scope lookup did not yield a context.',
      );
    }
    if (context.contextType == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingContextType,
        expression,
        `Context '${context.contextKind}' does not carry a type-system projection yet.`,
      );
    }
    return this.support.resolveReference(
      expression,
      context.contextType,
      localKey,
      CheckerExpressionTypeOpenKind.MissingContextType,
      `Context '${context.contextKind}' type reference could not be hydrated.`,
    );
  }
}
