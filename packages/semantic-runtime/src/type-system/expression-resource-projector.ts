import type { BindingScope } from '../configuration/scope.js';
import type {
  BindingBehaviorExpression,
  ExpressionAstNode,
  IsBindingBehavior,
  ValueConverterExpression,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { BindingBehaviorDefinition } from '../resources/binding-behavior-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { ValueConverterDefinition } from '../resources/value-converter-definition.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import type { TemplateVisibleResource } from '../template/compiler-world-reference.js';
import {
  STATE_BINDING_BEHAVIOR_NAME,
  type StateBindingScopeProjector,
} from '../state/state-binding-scope.js';
import { CheckerExpressionAccessProjector } from './expression-access-projector.js';
import {
  checkerExpressionCallArguments,
  CheckerExpressionCallProjector,
} from './expression-call-projector.js';
import {
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';

export interface CheckerExpressionResourceProjectorHost {
  evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation;
}

/**
 * Projects expression-level resource semantics for value converters and binding behaviors.
 *
 * The evaluator owns AST dispatch, while this projector owns compiler resource-scope lookup, converter target hydration,
 * `toView` call projection, and duplicate binding-behavior policy.
 */
export class CheckerExpressionResourceProjector {
  constructor(
    private readonly support: CheckerExpressionTypeSupport,
    private readonly access: CheckerExpressionAccessProjector,
    private readonly calls: CheckerExpressionCallProjector,
    private readonly resourceScope: TemplateResourceScope | null,
    private readonly stateScopes: StateBindingScopeProjector,
    private readonly host: CheckerExpressionResourceProjectorHost,
  ) {}

  evaluateValueConverter(
    expression: ValueConverterExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const inner = this.evaluateValueConverterRoot(expression.expression, scope, `${localKey}:converter-input`, sourceAddressHandle);
    if (inner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return inner;
    }

    const definition = this.findValueConverterDefinition(expression.name.name);
    if (definition == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingValueConverterResource,
        expression,
        `Value converter '${expression.name.name}' was not resolved through the current compiler resource scope.`,
        inner.typeReference,
      );
    }

    if (definition.target.targetType == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.OpenValueConverter,
        expression,
        `Value converter '${definition.name}' does not carry a checker-visible target type yet.`,
        inner.typeReference,
      );
    }

    const converterType = this.support.resolveReference(
      expression,
      definition.target.targetType,
      `${localKey}:converter:${definition.name}`,
      CheckerExpressionTypeOpenKind.OpenValueConverter,
      `Value converter '${definition.name}' target type could not be hydrated.`,
    );
    if (converterType.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return converterType;
    }

    const toView = this.access.evaluateMemberOnType(
      expression,
      converterType.typeShape,
      'toView',
      `${localKey}:converter:${definition.name}:toView`,
    );
    if (toView.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.OpenValueConverter,
        expression,
        `Value converter '${definition.name}' target type did not expose a checker-visible toView method.`,
        converterType.typeReference,
      );
    }

    return this.calls.evaluateCallReturn(
      expression,
      toView.typeShape,
      [
        {
          expression: expression.expression,
          localKey: `${localKey}:converter:${definition.name}:toView-input`,
          precomputedEvaluation: inner,
        },
        ...checkerExpressionCallArguments(expression.args, `${localKey}:converter:${definition.name}:toView-args`),
      ],
      scope,
      `${localKey}:converter:${definition.name}:toView-return`,
      sourceAddressHandle,
      toView.sourceAddressHandle,
    );
  }

  evaluateBindingBehavior(
    expression: BindingBehaviorExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    if (expression.name.name === STATE_BINDING_BEHAVIOR_NAME) {
      return this.evaluateStateBindingBehavior(expression, scope, localKey, sourceAddressHandle);
    }

    const inner = this.evaluateValueConverterRoot(expression.expression, scope, `${localKey}:behavior:${expression.name.name}`, sourceAddressHandle);
    if (inner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return inner;
    }
    const definition = this.findBindingBehaviorDefinition(expression.name.name);
    if (definition == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingBindingBehaviorResource,
        expression,
        `Binding behavior '${expression.name.name}' was not resolved through the current compiler resource scope.`,
        inner.typeReference,
      );
    }
    if (bindingBehaviorAlreadyApplied(expression.expression, expression.name.name)) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.DuplicateBindingBehavior,
        expression,
        `Binding behavior '${expression.name.name}' is applied more than once in this expression.`,
        inner.typeReference,
      );
    }
    return inner;
  }

  private evaluateStateBindingBehavior(
    expression: BindingBehaviorExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const definition = this.findBindingBehaviorDefinition(expression.name.name);
    if (definition == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingBindingBehaviorResource,
        expression,
        `Binding behavior '${expression.name.name}' was not resolved through the current compiler resource scope.`,
      );
    }
    if (bindingBehaviorAlreadyApplied(expression.expression, expression.name.name)) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.DuplicateBindingBehavior,
        expression,
        `Binding behavior '${expression.name.name}' is applied more than once in this expression.`,
      );
    }
    const stateScope = this.stateScopes.scopeForBindingBehavior(
      expression,
      scope,
      `${localKey}:behavior:${expression.name.name}`,
      sourceAddressHandle,
    );
    if (stateScope.scope == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingStateStore,
        expression,
        stateScope.openReason ?? 'The state binding behavior could not produce a store-backed binding scope.',
        stateScope.store?.initialStateType ?? null,
      );
    }
    return this.evaluateValueConverterRoot(
      expression.expression,
      stateScope.scope,
      `${localKey}:behavior:${expression.name.name}:state-scope`,
      sourceAddressHandle,
    );
  }

  private evaluateValueConverterRoot(
    expression: IsBindingBehavior,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.host.evaluateNode(expression, scope, localKey, sourceAddressHandle);
  }

  private findValueConverterDefinition(name: string): ValueConverterDefinition | null {
    const resource = this.findVisibleResource(ResourceDefinitionKind.ValueConverter, name);
    const definition = resource?.definition ?? null;
    return definition?.type === ResourceDefinitionKind.ValueConverter
      ? definition
      : null;
  }

  private findBindingBehaviorDefinition(name: string): BindingBehaviorDefinition | null {
    const resource = this.findVisibleResource(ResourceDefinitionKind.BindingBehavior, name);
    const definition = resource?.definition ?? null;
    return definition?.type === ResourceDefinitionKind.BindingBehavior
      ? definition
      : null;
  }

  private findVisibleResource(
    resourceKind: ResourceDefinitionKind,
    name: string,
  ): TemplateVisibleResource | null {
    if (this.resourceScope == null) {
      return null;
    }
    const lookup = name.toLowerCase();
    return this.resourceScope.resources.find((resource) =>
      resource.resourceKind === resourceKind
      && (
        resource.name.toLowerCase() === lookup
        || resource.aliases.some((alias) => alias.toLowerCase() === lookup)
      )
    ) ?? null;
  }
}

function bindingBehaviorAlreadyApplied(
  expression: IsBindingBehavior,
  behaviorName: string,
): boolean {
  return expression.$kind === 'BindingBehavior'
    && (
      expression.name.name === behaviorName
      || bindingBehaviorAlreadyApplied(expression.expression, behaviorName)
    );
}
