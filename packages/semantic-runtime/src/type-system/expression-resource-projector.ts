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
import { findVisibleTemplateResource } from '../template/compiler-resource-lookup.js';
import {
  STATE_BINDING_BEHAVIOR_NAME,
  type StateBindingScopeProjector,
} from '../state/state-binding-scope.js';
import { CheckerExpressionAccessProjector } from './expression-access-projector.js';
import {
  checkerExpressionCallArguments,
  type CheckerExpressionCallArgument,
  CheckerExpressionCallProjector,
} from './expression-call-projector.js';
import {
  CheckerStrictTrueComparisonKind,
} from './checker-type-member-surface.js';
import {
  VALUE_CONVERTER_TO_VIEW_METHOD,
  type RuntimeValueConverterMethodName,
  valueConverterWithContextComparisonKind,
} from './value-converter-call-surface.js';
import {
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import {
  CheckerExpressionTypeEvaluationContext,
  CheckerExpressionTypeBindingBehaviorEvaluation,
} from './expression-type-context.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  CheckerTypeMemberKind,
  type CheckerTypeShape,
} from './type-shape.js';

export interface CheckerExpressionResourceProjectorHost {
  evaluateNode(context: CheckerExpressionTypeEvaluationContext): CheckerExpressionTypeEvaluation;
}

/**
 * Projects expression-level resource semantics for value converters and binding behaviors.
 *
 * The evaluator owns AST dispatch, while this projector owns compiler resource-scope lookup, converter target hydration,
 * value-converter method call projection, and duplicate binding-behavior policy.
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
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const localKey = context.projectionLocalKey();
    const inner = this.evaluateValueConverterRoot(
      context.child(expression.expression, 'converter-input'),
    );
    if (inner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return inner;
    }

    return this.evaluateValueConverterMethod(
      expression,
      VALUE_CONVERTER_TO_VIEW_METHOD,
      inner,
      context,
    );
  }

  evaluateValueConverterMethod(
    expression: ValueConverterExpression,
    methodName: RuntimeValueConverterMethodName,
    input: CheckerExpressionTypeEvaluation,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    if (input.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return input;
    }

    const localKey = context.projectionLocalKey();
    const definition = this.findValueConverterDefinition(expression.name.name);
    if (definition == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingValueConverterResource,
        expression,
        `Value converter '${expression.name.name}' was not resolved through the current compiler resource scope.`,
        input.typeReference,
      );
    }

    if (definition.target.targetType == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.OpenValueConverter,
        expression,
        `Value converter '${definition.name}' does not carry a checker-visible target type yet.`,
        input.typeReference,
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

    const method = this.access.evaluateMemberOnType(
      expression,
      converterType.typeShape,
      methodName,
      `${localKey}:converter:${definition.name}:${methodName}`,
    );
    if (method.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      if (method.openKind === CheckerExpressionTypeOpenKind.MissingMember) {
        return input;
      }
      return this.support.open(
        CheckerExpressionTypeOpenKind.OpenValueConverter,
        expression,
        `Value converter '${definition.name}' target type did not expose a checker-visible ${methodName} method.`,
        converterType.typeReference,
      );
    }

    const callerContextKind = this.valueConverterCallerContextKind(
      converterType.typeShape,
      `converter:${definition.name}:${methodName}:with-context`,
    );
    if (callerContextKind === CheckerStrictTrueComparisonKind.MaybeTrue) {
      const withoutContext = this.evaluateValueConverterMethodCall(
        expression,
        method.typeShape,
        input,
        false,
        `converter:${definition.name}:${methodName}`,
        method.sourceAddressHandle,
        context,
      );
      if (withoutContext.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
        return withoutContext;
      }
      const withContext = this.evaluateValueConverterMethodCall(
        expression,
        method.typeShape,
        input,
        true,
        `converter:${definition.name}:${methodName}:with-context-branch`,
        method.sourceAddressHandle,
        context,
      );
      if (withContext.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
        return withContext;
      }
      return this.support.evaluateTypeUnion(
        [withoutContext, withContext],
        `${localKey}:converter:${definition.name}:${methodName}:dynamic-with-context-return`,
        method.sourceAddressHandle,
        `Projected value-converter '${definition.name}' ${methodName} return across dynamic withContext branches.`,
      );
    }

    return this.evaluateValueConverterMethodCall(
      expression,
      method.typeShape,
      input,
      callerContextKind === CheckerStrictTrueComparisonKind.DefinitelyTrue,
      `converter:${definition.name}:${methodName}`,
      method.sourceAddressHandle,
      context,
    );
  }

  private evaluateValueConverterMethodCall(
    expression: ValueConverterExpression,
    methodType: CheckerTypeShape,
    input: CheckerExpressionTypeEvaluation,
    includeCallerContext: boolean,
    localSuffix: string,
    methodSourceAddressHandle: AddressHandle | null,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    return this.calls.evaluateCallReturn(
      context,
      methodType,
      this.valueConverterMethodArguments(
        expression,
        input,
        includeCallerContext,
        localSuffix,
        context.sourceAddressHandle,
      ),
      methodSourceAddressHandle,
      `${localSuffix}-return`,
    );
  }

  evaluateBindingBehavior(
    expression: BindingBehaviorExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    if (context.runtimeContext.bindingBehavior === CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly) {
      return this.evaluateValueConverterRoot(
        context.child(expression.expression, `behavior:${expression.name.name}:evaluate-only`),
      );
    }

    if (expression.name.name === STATE_BINDING_BEHAVIOR_NAME) {
      return this.evaluateStateBindingBehavior(expression, context);
    }

    const localKey = context.projectionLocalKey();
    const inner = this.evaluateValueConverterRoot(
      context.child(expression.expression, `behavior:${expression.name.name}`),
    );
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
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const localKey = context.projectionLocalKey();
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
      context.scope,
      `${localKey}:behavior:${expression.name.name}`,
      context.sourceAddressHandle,
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
      context.childInScope(expression.expression, stateScope.scope, `behavior:${expression.name.name}:state-scope`),
    );
  }

  private evaluateValueConverterRoot(
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    return this.host.evaluateNode(context);
  }

  private valueConverterMethodArguments(
    expression: ValueConverterExpression,
    input: CheckerExpressionTypeEvaluation,
    includeCallerContext: boolean,
    localSuffix: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerExpressionCallArgument[] {
    const args: CheckerExpressionCallArgument[] = [{
      expression: expression.expression,
      localSuffix: `${localSuffix}-input`,
      precomputedEvaluation: input,
    }];
    if (includeCallerContext) {
      args.push({
        expression,
        localSuffix: `${localSuffix}:caller-context`,
        precomputedEvaluation: this.valueConverterCallerContext(expression, `${localSuffix}:caller-context`, sourceAddressHandle),
      });
    }
    args.push(...checkerExpressionCallArguments(expression.args, `${localSuffix}-args`));
    return args;
  }

  private valueConverterCallerContextKind(
    converterType: CheckerTypeShape,
    localKey: string,
  ): CheckerStrictTrueComparisonKind {
    return valueConverterWithContextComparisonKind(this.support.store, converterType, localKey);
  }

  private valueConverterCallerContext(
    expression: ValueConverterExpression,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const unknown = this.support.synthesis.unknownTypeReference(`${localKey}:unknown`, sourceAddressHandle);
    const contextType = this.support.synthesis.objectLiteralType(
      [
        {
          name: 'source',
          valueType: unknown,
          memberKind: CheckerTypeMemberKind.Property,
          isOptional: true,
        },
        {
          name: 'binding',
          valueType: unknown,
          memberKind: CheckerTypeMemberKind.Property,
        },
      ],
      localKey,
      sourceAddressHandle,
    );
    return this.support.type(
      contextType,
      'Synthesized value-converter caller context for withContext invocation.',
      sourceAddressHandle,
    );
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
  ) {
    return findVisibleTemplateResource(this.resourceScope, resourceKind, name);
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
