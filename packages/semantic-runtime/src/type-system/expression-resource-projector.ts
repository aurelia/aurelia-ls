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
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  CheckerTypeMemberKind,
  type CheckerTypeShape,
} from './type-shape.js';

export interface CheckerExpressionResourceProjectorHost {
  evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation;
}

export type RuntimeValueConverterMethodName = 'toView' | 'fromView';

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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const inner = this.evaluateValueConverterRoot(expression.expression, scope, `${localKey}:converter-input`, sourceAddressHandle);
    if (inner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return inner;
    }

    return this.evaluateValueConverterMethod(
      expression,
      'toView',
      inner,
      scope,
      localKey,
      sourceAddressHandle,
    );
  }

  evaluateValueConverterMethod(
    expression: ValueConverterExpression,
    methodName: RuntimeValueConverterMethodName,
    input: CheckerExpressionTypeEvaluation,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    if (input.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return input;
    }

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

    return this.calls.evaluateCallReturn(
      expression,
      method.typeShape,
      this.valueConverterMethodArguments(
        expression,
        input,
        converterType.typeShape,
        `${localKey}:converter:${definition.name}:${methodName}`,
        sourceAddressHandle,
      ),
      scope,
      `${localKey}:converter:${definition.name}:${methodName}-return`,
      sourceAddressHandle,
      method.sourceAddressHandle,
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

  private valueConverterMethodArguments(
    expression: ValueConverterExpression,
    input: CheckerExpressionTypeEvaluation,
    converterType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerExpressionCallArgument[] {
    const args: CheckerExpressionCallArgument[] = [{
      expression: expression.expression,
      localKey: `${localKey}-input`,
      precomputedEvaluation: input,
    }];
    if (this.valueConverterUsesCallerContext(expression, converterType, `${localKey}:with-context`)) {
      args.push({
        expression,
        localKey: `${localKey}:caller-context`,
        precomputedEvaluation: this.valueConverterCallerContext(expression, `${localKey}:caller-context`, sourceAddressHandle),
      });
    }
    args.push(...checkerExpressionCallArguments(expression.args, `${localKey}-args`));
    return args;
  }

  private valueConverterUsesCallerContext(
    expression: ValueConverterExpression,
    converterType: CheckerTypeShape,
    localKey: string,
  ): boolean {
    const evaluation = this.access.evaluateMemberOnType(
      expression,
      converterType,
      'withContext',
      localKey,
      converterType.sourceAddressHandle,
    );
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      && evaluation.typeShape.display === 'true';
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
