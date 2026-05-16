import type {
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  CallScopeExpression,
  NewExpression,
  TaggedTemplateExpression,
} from '../expression/ast.js';
import type { BindingScope } from '../configuration/scope.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  checkerTypeShapeIsDefinitelyNullish,
} from './checker-related-types.js';
import {
  CheckerExpressionType,
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
} from './expression-type-evaluation.js';
import { CheckerExpressionCallProjector } from './expression-call-projector.js';
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
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation;

  evaluateCallGlobalCallee(
    expression: CallGlobalExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionType | null;

  evaluateCallMemberCallee(
    expression: CallMemberExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation;

  evaluateCallFunctionCallee(
    expression: CallFunctionExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation;

  evaluateNewConstructor(
    expression: NewExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation;

  evaluateTaggedTemplateTag(
    expression: TaggedTemplateExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation;
}

type CheckerExpressionArgumentContextTarget =
  | {
    readonly kind: 'call';
    readonly callee: CheckerExpressionType;
    readonly signatureArgumentIndex: number;
    readonly runtimeArgumentCount: number;
    readonly localKey: string;
  }
  | {
    readonly kind: 'construct';
    readonly constructor: CheckerExpressionType;
    readonly argumentIndex: number;
    readonly runtimeArgumentCount: number;
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const target = this.contextualArgumentTarget(expression, argumentIndex, scope, localKey, sourceAddressHandle);
    if (target == null) {
      return null;
    }
    return target.kind === 'construct'
      ? this.calls.contextualConstructArgumentType(
        target.constructor.typeShape,
        target.argumentIndex,
        target.runtimeArgumentCount,
        target.localKey,
        sourceAddressHandle,
      )
      : this.calls.contextualCallArgumentType(
        target.callee.typeShape,
        target.signatureArgumentIndex,
        target.runtimeArgumentCount,
        target.localKey,
        sourceAddressHandle,
      );
  }

  private contextualArgumentTarget(
    expression: CheckerExpressionArgumentContextExpression,
    argumentIndex: number,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionArgumentContextTarget | null {
    switch (expression.$kind) {
      case 'CallScope':
        return this.callTarget(
          this.host.evaluateCallScopeCallee(expression, scope, localKey),
          argumentIndex,
          expression.args.length,
          `${localKey}:call-scope:${expression.name.name}`,
        );
      case 'CallGlobal': {
        const callee = this.host.evaluateCallGlobalCallee(expression, scope, localKey, sourceAddressHandle);
        return callee == null
          ? null
          : this.callTarget(callee, argumentIndex, expression.args.length, `${localKey}:global-call:${expression.name.name}`);
      }
      case 'CallMember':
        return this.callTarget(
          this.host.evaluateCallMemberCallee(expression, scope, localKey, sourceAddressHandle),
          argumentIndex,
          expression.args.length,
          `${localKey}:call-return:${expression.name.name}`,
        );
      case 'CallFunction':
        return this.callTarget(
          this.host.evaluateCallFunctionCallee(expression, scope, localKey, sourceAddressHandle),
          argumentIndex,
          expression.args.length,
          `${localKey}:call-function-return`,
        );
      case 'New':
        return this.constructTarget(
          this.host.evaluateNewConstructor(expression, scope, localKey, sourceAddressHandle),
          argumentIndex,
          expression.args.length,
          `${localKey}:construct-return`,
        );
      case 'TaggedTemplate':
        return this.callTarget(
          this.host.evaluateTaggedTemplateTag(expression, scope, localKey, sourceAddressHandle),
          argumentIndex + 1,
          expression.expressions.length + 1,
          `${localKey}:tag-return`,
        );
    }
  }

  private callTarget(
    callee: CheckerExpressionTypeEvaluation,
    signatureArgumentIndex: number,
    runtimeArgumentCount: number,
    localKey: string,
  ): CheckerExpressionArgumentContextTarget | null {
    return callee.kind === CheckerExpressionTypeEvaluationResultKind.Type
      && !checkerTypeShapeIsDefinitelyNullish(callee.typeShape)
      ? { kind: 'call', callee, signatureArgumentIndex, runtimeArgumentCount, localKey }
      : null;
  }

  private constructTarget(
    constructor: CheckerExpressionTypeEvaluation,
    argumentIndex: number,
    runtimeArgumentCount: number,
    localKey: string,
  ): CheckerExpressionArgumentContextTarget | null {
    return constructor.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? { kind: 'construct', constructor, argumentIndex, runtimeArgumentCount, localKey }
      : null;
  }
}
