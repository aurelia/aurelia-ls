import type {
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  CallScopeExpression,
  NewExpression,
  TaggedTemplateExpression,
} from '../expression/ast.js';
import {
  checkerTypeShapeIsDefinitelyNullish,
} from './checker-related-types.js';
import {
  CheckerExpressionType,
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
} from './expression-type-evaluation.js';
import {
  CheckerExpressionCallableParameterKind,
  CheckerExpressionCallProjector,
  checkerExpressionCallArguments,
  type CheckerExpressionCallArgument,
} from './expression-call-projector.js';
import type { CheckerExpressionTypeEvaluationContext } from './expression-type-context.js';
import type { CheckerTypeReference } from './type-shape.js';

export type CheckerExpressionArgumentContextExpression =
  | CallFunctionExpression
  | CallGlobalExpression
  | CallMemberExpression
  | CallScopeExpression
  | NewExpression
  | TaggedTemplateExpression;

export interface CheckerExpressionArgumentContextProjectorHost {
  evaluateCallScopeCallee(
    expression: CallScopeExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation;

  evaluateCallGlobalCallee(
    expression: CallGlobalExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionType | null;

  evaluateCallMemberCallee(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation;

  evaluateCallFunctionCallee(
    expression: CallFunctionExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation;

  evaluateNewConstructor(
    expression: NewExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation;

  evaluateTaggedTemplateTag(
    expression: TaggedTemplateExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation;
}

type CheckerExpressionArgumentContextTarget =
  | {
    readonly kind: 'call';
    readonly callee: CheckerExpressionType;
    readonly signatureArgumentIndex: number;
    readonly runtimeArgumentCount: number;
    readonly args: readonly CheckerExpressionCallArgument[] | null;
    readonly localKey: string;
  }
  | {
    readonly kind: 'construct';
    readonly constructor: CheckerExpressionType;
    readonly argumentIndex: number;
    readonly runtimeArgumentCount: number;
    readonly args: readonly CheckerExpressionCallArgument[] | null;
    readonly localKey: string;
  };

/** Projects contextual argument types for cursor/member-owner descent inside callable Aurelia expression forms. */
export class CheckerExpressionArgumentContextProjector {
  constructor(
    private readonly calls: CheckerExpressionCallProjector,
    private readonly host: CheckerExpressionArgumentContextProjectorHost,
  ) {}

  contextualArgumentType(
    expression: CheckerExpressionArgumentContextExpression,
    argumentIndex: number,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerTypeReference | null {
    const target = this.contextualArgumentTarget(expression, argumentIndex, context);
    if (target == null) {
      return null;
    }
    return target.kind === 'construct'
      ? this.calls.contextualConstructArgumentType(
        target.constructor.typeShape,
        target.argumentIndex,
        target.runtimeArgumentCount,
        target.localKey,
        context.sourceAddressHandle,
      )
      : this.calls.contextualCallArgumentType(
        target.callee.typeShape,
        target.signatureArgumentIndex,
        target.runtimeArgumentCount,
        target.localKey,
        context.sourceAddressHandle,
      );
  }

  contextualArgumentParameterTypes(
    expression: CheckerExpressionArgumentContextExpression,
    argumentIndex: number,
    parameterKinds: readonly CheckerExpressionCallableParameterKind[],
    context: CheckerExpressionTypeEvaluationContext,
  ): readonly CheckerTypeReference[] | null {
    const target = this.contextualArgumentTarget(expression, argumentIndex, context);
    if (target == null) {
      return null;
    }
    if (target.args == null) {
      return null;
    }
    return target.kind === 'construct'
      ? this.calls.contextualConstructArgumentParameterTypes(
        target.constructor.typeShape,
        target.argumentIndex,
        target.args,
        context,
        parameterKinds,
        target.localKey,
        context.sourceAddressHandle,
      )
      : this.calls.contextualCallArgumentParameterTypes(
        target.callee.typeShape,
        target.signatureArgumentIndex,
        target.args,
        context,
        parameterKinds,
        target.localKey,
        context.sourceAddressHandle,
      );
  }

  private contextualArgumentTarget(
    expression: CheckerExpressionArgumentContextExpression,
    argumentIndex: number,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionArgumentContextTarget | null {
    const localKey = context.projectionLocalKey();
    switch (expression.$kind) {
      case 'CallScope':
        return this.callTarget(
          this.host.evaluateCallScopeCallee(expression, context),
          argumentIndex,
          expression.args.length,
          checkerExpressionCallArguments(expression.args, `${localKey}:call-scope:${expression.name.name}:arg`),
          `${localKey}:call-scope:${expression.name.name}`,
        );
      case 'CallGlobal': {
        const callee = this.host.evaluateCallGlobalCallee(expression, context);
        return callee == null
          ? null
          : this.callTarget(
            callee,
            argumentIndex,
            expression.args.length,
            checkerExpressionCallArguments(expression.args, `${localKey}:global-call:${expression.name.name}:arg`),
            `${localKey}:global-call:${expression.name.name}`,
          );
      }
      case 'CallMember':
        return this.callTarget(
          this.host.evaluateCallMemberCallee(expression, context),
          argumentIndex,
          expression.args.length,
          checkerExpressionCallArguments(expression.args, `${localKey}:call-member:${expression.name.name}:arg`),
          `${localKey}:call-return:${expression.name.name}`,
        );
      case 'CallFunction':
        return this.callTarget(
          this.host.evaluateCallFunctionCallee(expression, context),
          argumentIndex,
          expression.args.length,
          checkerExpressionCallArguments(expression.args, `${localKey}:call-function:arg`),
          `${localKey}:call-function-return`,
        );
      case 'New':
        return this.constructTarget(
          this.host.evaluateNewConstructor(expression, context),
          argumentIndex,
          expression.args.length,
          checkerExpressionCallArguments(expression.args, `${localKey}:construct:arg`),
          `${localKey}:construct-return`,
        );
      case 'TaggedTemplate':
        return this.callTarget(
          this.host.evaluateTaggedTemplateTag(expression, context),
          argumentIndex + 1,
          expression.expressions.length + 1,
          null,
          `${localKey}:tag-return`,
        );
    }
  }

  private callTarget(
    callee: CheckerExpressionTypeEvaluation,
    signatureArgumentIndex: number,
    runtimeArgumentCount: number,
    args: readonly CheckerExpressionCallArgument[] | null,
    localKey: string,
  ): CheckerExpressionArgumentContextTarget | null {
    return callee.kind === CheckerExpressionTypeEvaluationResultKind.Type
      && !checkerTypeShapeIsDefinitelyNullish(callee.typeShape)
      ? { kind: 'call', callee, signatureArgumentIndex, runtimeArgumentCount, args, localKey }
      : null;
  }

  private constructTarget(
    constructor: CheckerExpressionTypeEvaluation,
    argumentIndex: number,
    runtimeArgumentCount: number,
    args: readonly CheckerExpressionCallArgument[] | null,
    localKey: string,
  ): CheckerExpressionArgumentContextTarget | null {
    return constructor.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? { kind: 'construct', constructor, argumentIndex, runtimeArgumentCount, args, localKey }
      : null;
  }
}
