import { auLink } from '../kernel/au-link.js';
import type {
  ArrayLiteralExpression,
  ArrowFunction,
  BinaryExpression,
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  ExpressionAstNode,
  ForOfStatement,
  Interpolation,
  NewExpression,
  ObjectLiteralExpression,
  PrimitiveLiteralExpression,
  TaggedTemplateExpression,
  TemplateExpression,
  UnaryExpression,
  ValueConverterExpression,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import type { StateStoreConfiguration } from '../state/model.js';
import { StateBindingScopeProjector } from '../state/state-binding-scope.js';
import {
  BindingScope,
} from '../configuration/scope.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import {
  CheckerTypeProjector,
  type CheckerSyntheticTypeMemberRequest,
} from './checker-projector.js';
import {
  CheckerTypeMemberKind,
  CheckerTypeReference,
  CheckerTypeShape,
  checkerTypeShapeIsPrimitiveDisplay,
  sameCheckerTypeReference,
} from './type-shape.js';
import {
  CheckerTypeNullishPresence,
  checkerTypeShapeNullishPresence,
} from './checker-related-types.js';
import {
  CheckerBindingPatternLocalProjection,
} from './binding-pattern-locals.js';
import {
  CheckerTypeShapeAccess,
  type CheckerTypeShapeMemberValueAccess,
} from './checker-type-shape-access.js';
import {
  CheckerExpressionType,
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationCache,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import {
  CheckerExpressionTypeEvaluationContext,
  type CheckerExpressionTypeEvaluationRuntimeContext,
} from './expression-type-context.js';
import {
  CheckerExpressionTypeSynthesizer,
} from './expression-type-synthesis.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import { CheckerExpressionBranchScopeProjector } from './expression-branch-scope.js';
import {
  CheckerExpressionMemberOwnerProjector,
} from './expression-member-owner-projector.js';
import {
  CheckerExpressionCallableParameterKind,
  CheckerExpressionCallProjector,
  checkerExpressionCallArguments,
} from './expression-call-projector.js';
import { CheckerExpressionArgumentContextProjector } from './expression-argument-context-projector.js';
import { CheckerExpressionContextualTypeProjector } from './expression-contextual-type-projector.js';
import { CheckerExpressionAccessProjector } from './expression-access-projector.js';
import { CheckerExpressionIterableProjector } from './expression-iterable-projector.js';
import type { CheckerExpressionIteratorProjection } from './expression-iterable-projector.js';
import {
  CheckerExpressionResourceProjector,
} from './expression-resource-projector.js';
import type { RuntimeValueConverterMethodName } from './value-converter-call-surface.js';
import { CheckerExpressionScopeProjector } from './expression-scope-projector.js';
import { CheckerExpressionArrayMethodProjector } from './expression-array-method-projector.js';
import { TypeSystemProductDetails } from './product-details.js';

type CheckerExpressionCallableCallExpression =
  | CallScopeExpression
  | CallMemberExpression
  | CallFunctionExpression;

interface CheckerExpressionCallableCallReturnRequest {
  readonly expression: CheckerExpressionCallableCallExpression;
  readonly context: CheckerExpressionTypeEvaluationContext;
  readonly callee: CheckerExpressionType;
  readonly optional: boolean;
  readonly definitelyNullishLocalKey: string;
  readonly maybeNullishLocalKey: string;
  readonly definitelyNullishSummary: string;
  readonly maybeNullishSummary: string;
  readonly returnLocalSuffix: string;
}

/**
 * Runtime-shaped TypeChecker evaluator for Aurelia expression AST.
 *
 * This walks the same expression families as runtime `astEvaluate`, but it produces static type-system projections
 * instead of runtime values. The evaluator spends the modeled runtime `Scope` for Aurelia name lookup and uses hot
 * checker carriers or synthetic expression shapes for member, call-return, and primitive projections.
 */
@auLink('runtime:astEvaluate')
export class CheckerExpressionTypeEvaluator {
  private readonly typeAccess: CheckerTypeShapeAccess;
  private readonly synthesis: CheckerExpressionTypeSynthesizer;
  private readonly support: CheckerExpressionTypeSupport;
  private readonly branchScopes: CheckerExpressionBranchScopeProjector;
  private readonly memberOwners: CheckerExpressionMemberOwnerProjector;
  private readonly calls: CheckerExpressionCallProjector;
  private readonly argumentContexts: CheckerExpressionArgumentContextProjector;
  private readonly contextualTypes: CheckerExpressionContextualTypeProjector;
  private readonly access: CheckerExpressionAccessProjector;
  private readonly arrayMethods: CheckerExpressionArrayMethodProjector;
  private readonly scopes: CheckerExpressionScopeProjector;
  private readonly iterables: CheckerExpressionIterableProjector;
  private readonly resources: CheckerExpressionResourceProjector;

  constructor(
    readonly store: KernelStore,
    readonly projector: CheckerTypeProjector,
    /** Compiler resource scope visible at this expression site, when template compilation supplied one. */
    readonly resourceScope: TemplateResourceScope | null = null,
    readonly cache: CheckerExpressionTypeEvaluationCache = new CheckerExpressionTypeEvaluationCache(),
    readonly stateStores: readonly StateStoreConfiguration[] = [],
  ) {
    this.typeAccess = new CheckerTypeShapeAccess(store, projector);
    this.synthesis = new CheckerExpressionTypeSynthesizer(projector);
    this.support = new CheckerExpressionTypeSupport(store, projector, this.typeAccess, this.synthesis);
    this.branchScopes = new CheckerExpressionBranchScopeProjector(store, projector);
    this.access = new CheckerExpressionAccessProjector(this.support, this.typeAccess, {
      evaluateNode: (context) => this.evaluateNode(context),
    });
    this.arrayMethods = new CheckerExpressionArrayMethodProjector(this.store, this.support, {
      evaluateNode: (context) => this.evaluateNode(context),
    });
    this.scopes = new CheckerExpressionScopeProjector(this.support, this.access);
    this.iterables = new CheckerExpressionIterableProjector(this.support, this.typeAccess, this.synthesis, {
      evaluateNode: (context) => this.evaluateNode(context),
    });
    this.calls = new CheckerExpressionCallProjector(this.support, {
      evaluateNode: (context) => this.evaluateNode(context),
    });
    this.resources = new CheckerExpressionResourceProjector(
      this.support,
      this.access,
      this.calls,
      resourceScope,
      new StateBindingScopeProjector(store, stateStores),
      {
        evaluateNode: (context) => this.evaluateNode(context),
      },
    );
    this.contextualTypes = new CheckerExpressionContextualTypeProjector(
      store,
      this.support,
      this.typeAccess,
      this.calls,
      this.synthesis,
    );
    this.argumentContexts = new CheckerExpressionArgumentContextProjector(this.calls, {
      evaluateCallScopeCallee: (expression, context) =>
        this.evaluateCallScopeCallee(expression, context),
      evaluateCallGlobalCallee: (expression, context) =>
        this.evaluateCallGlobalCallee(expression, context),
      evaluateCallMemberCallee: (expression, context) =>
        this.evaluateCallMemberCallee(expression, context),
      evaluateCallFunctionCallee: (expression, context) =>
        this.evaluateCallFunctionCallee(expression, context),
      evaluateNewConstructor: (expression, context) =>
        this.evaluateNewConstructor(expression, context),
      evaluateTaggedTemplateTag: (expression, context) =>
        this.evaluateTaggedTemplateTag(expression, context),
    });
    this.memberOwners = new CheckerExpressionMemberOwnerProjector({
      evaluateNode: (context) =>
        this.evaluate(context),
      arrowFunctionScope: (expression, context) =>
        this.contextualTypes.arrowFunctionScope(expression, context.scope, context.projectionLocalKey(), context.sourceAddressHandle, context.contextualType),
      contextualArgumentType: (expression, argumentIndex, context) =>
        this.argumentContexts.contextualArgumentType(expression, argumentIndex, context),
      contextualArgumentScope: (expression, argumentIndex, argumentExpression, context) =>
        this.contextualCallbackArgumentScope(expression, argumentIndex, argumentExpression, context),
      contextualArrayElementType: (contextualType, elementIndex, localKey, sourceAddressHandle) =>
        this.contextualTypes.contextualArrayElementType(contextualType, elementIndex, localKey, sourceAddressHandle),
      contextualObjectPropertyType: (contextualType, propertyName, localKey, sourceAddressHandle) =>
        this.contextualTypes.contextualObjectPropertyType(contextualType, propertyName, localKey, sourceAddressHandle),
    });
  }

  evaluate(context: CheckerExpressionTypeEvaluationContext): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(context);
  }

  evaluateValueConverterMethodFromType(
    context: CheckerExpressionTypeEvaluationContext<ValueConverterExpression>,
    methodName: RuntimeValueConverterMethodName,
    inputType: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation {
    const expression = context.expression;
    const input = this.support.resolveReference(
      expression,
      inputType,
      `${context.projectionLocalKey()}:input`,
      CheckerExpressionTypeOpenKind.OpenValueConverter,
      `Value converter '${expression.name.name}' ${methodName} input type could not be hydrated.`,
      null,
      inputType.sourceAddressHandle ?? context.sourceAddressHandle,
    );
    return this.resources.evaluateValueConverterMethod(
      expression,
      methodName,
      input,
      context,
    );
  }

  evaluateMemberOwnerAtOffset(
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
  ): CheckerExpressionTypeEvaluation {
    const evaluation = this.memberOwners.evaluateAtOffset(
      context,
      offset,
    );
    return evaluation ?? this.support.open(
      CheckerExpressionTypeOpenKind.MissingMember,
      context.expression,
      `No member-owner expression was reachable at offset ${offset}.`,
    );
  }

  evaluateMemberValueAccessAtOffset(
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
    memberName: string,
  ): CheckerTypeShapeMemberValueAccess | null {
    const owner = this.evaluateMemberOwnerAtOffset(
      context,
      offset,
    );
    const ownerReference = owner.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? owner.typeReference
      : owner.partialTypeReference;
    if (ownerReference == null) {
      return null;
    }
    const ownerShape = this.typeAccess.resolveReference(ownerReference);
    return ownerShape == null
      ? null
      : this.typeAccess.memberValueAccess(ownerShape, memberName, `${context.projectionLocalKey()}:member:${localKeyPart(memberName)}`);
  }

  memberValueAccessForReference(
    ownerReference: CheckerTypeReference | null,
    memberName: string,
    localKey: string,
  ): CheckerTypeShapeMemberValueAccess | null {
    if (ownerReference == null) {
      return null;
    }
    const ownerShape = this.typeAccess.resolveReference(ownerReference);
    return ownerShape == null
      ? null
      : this.typeAccess.memberValueAccess(ownerShape, memberName, `${localKey}:member:${localKeyPart(memberName)}`);
  }

  evaluateIteratorElement(
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    return this.iterables.evaluateIteratorElement(context);
  }

  evaluateIteratorLocals(
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation | CheckerBindingPatternLocalProjection {
    return this.iterables.evaluateIteratorLocals(context);
  }

  evaluateIteratorProjection(
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionIteratorProjection {
    return this.iterables.evaluateIteratorProjection(context);
  }

  private evaluateNode(
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const effectiveContext = context.withEffectiveContextualType();
    const cacheKey = effectiveContext.cacheKey(this.resourceScope);
    return this.cache.readOrEvaluate(
      cacheKey,
      () => this.evaluateNodeUncached(effectiveContext),
      (evaluation) => cachedExpressionEvaluationProductsAreLive(this.store, evaluation),
    );
  }

  private contextualCallbackArgumentScope(
    expression: CallFunctionExpression | CallGlobalExpression | CallMemberExpression | CallScopeExpression | NewExpression | TaggedTemplateExpression,
    argumentIndex: number,
    argumentExpression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
  ): BindingScope | null {
    if (argumentExpression.$kind !== 'ArrowFunction') {
      return null;
    }
    if (expression.$kind === 'CallMember') {
      const syntheticArrayScope = this.arrayMethods.callbackScopeForArgument(
        expression,
        argumentIndex,
        argumentExpression,
        context,
      );
      if (syntheticArrayScope != null) {
        return syntheticArrayScope;
      }
    }
    const parameterTypes = this.argumentContexts.contextualArgumentParameterTypes(
      expression,
      argumentIndex,
      argumentExpression.args.map((_, index) =>
        argumentExpression.rest && index === argumentExpression.args.length - 1
          ? CheckerExpressionCallableParameterKind.Rest
          : CheckerExpressionCallableParameterKind.Positional
      ),
      context,
    );
    return parameterTypes == null
      ? null
      : this.contextualTypes.arrowFunctionScopeForParameterTypes(
        argumentExpression,
        context.scope,
        `${context.projectionLocalKey()}:args:${argumentIndex}:checker-callback`,
        context.sourceAddressHandle,
        parameterTypes,
      );
  }

  private evaluateNodeUncached(
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const expression = context.expression;
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const contextualType = context.contextualType;
    switch (expression.$kind) {
      case 'Identifier':
        return this.support.open(
          CheckerExpressionTypeOpenKind.UnsupportedExpression,
          expression,
          'Standalone identifiers are syntax atoms; use AccessScope for runtime scope lookup.',
        );
      case 'AccessThis':
        return this.scopes.evaluateAccessThis(expression, scope, localKey);
      case 'AccessBoundary':
        return this.scopes.evaluateAccessBoundary(expression, scope, localKey);
      case 'AccessScope':
        return this.scopes.evaluateAccessScope(expression, scope, localKey);
      case 'AccessGlobal':
        return this.scopes.evaluateAccessGlobal(expression, scope, localKey, sourceAddressHandle);
      case 'AccessMember':
        return this.access.evaluateAccessMember(expression, context);
      case 'AccessKeyed':
        return this.access.evaluateAccessKeyed(expression, context);
      case 'CallScope':
        return this.evaluateCallScope(expression, context);
      case 'CallMember':
        return this.evaluateCallMember(expression, context);
      case 'CallFunction':
        return this.evaluateCallFunction(expression, context);
      case 'CallGlobal':
        return this.evaluateCallGlobal(expression, context);
      case 'New':
        return this.evaluateNew(expression, context);
      case 'Paren':
        return this.evaluateNode(context.child(expression.expression, 'paren', contextualType));
      case 'PrimitiveLiteral':
        return this.evaluatePrimitiveLiteral(expression, scope, localKey, sourceAddressHandle);
      case 'Template':
        return this.evaluateTemplate(expression, scope, localKey, sourceAddressHandle);
      case 'Interpolation':
        return this.evaluateInterpolation(expression, scope, localKey, sourceAddressHandle);
      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(expression, context);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteral(expression, context);
      case 'Unary':
        return this.evaluateUnary(expression, context);
      case 'Binary':
        return this.evaluateBinary(expression, context);
      case 'Conditional':
        return this.evaluateConditional(expression, context);
      case 'Assign':
        if (context.runtimeContext.connectable && expression.op !== '=') {
          return this.support.open(
            CheckerExpressionTypeOpenKind.IncrementInConnectableEvaluation,
            expression,
            `Aurelia astEvaluate rejects compound assignment '${expression.op}' while a binding connectable is collecting dependencies.`,
          );
        }
        return this.evaluateNode(context.child(expression.value, 'assign-value'));
      case 'ArrowFunction':
        return this.evaluateArrowFunction(expression, context);
      case 'ValueConverter':
        return this.resources.evaluateValueConverter(expression, context);
      case 'BindingBehavior':
        return this.resources.evaluateBindingBehavior(expression, context);
      case 'ForOfStatement':
        return this.iterables.evaluateForOfStatement(context);
      case 'TaggedTemplate':
        return this.evaluateTaggedTemplate(expression, context);
      case 'BindingIdentifier':
      case 'BindingPatternDefault':
      case 'BindingPatternHole':
      case 'ArrayBindingPattern':
      case 'ObjectBindingPattern':
      case 'DestructuringAssignment':
        return this.support.open(
          CheckerExpressionTypeOpenKind.UnsupportedBindingPattern,
          expression,
          `Binding-pattern expression kind '${expression.$kind}' does not produce a value type by itself.`,
        );
      case 'Custom':
        return this.support.open(
          CheckerExpressionTypeOpenKind.UnsupportedExpression,
          expression,
          'Custom expression type projection must be supplied by the custom expression implementation.',
        );
    }
  }

  private evaluateCallScope(
    expression: CallScopeExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const callee = this.evaluateCallScopeCallee(expression, context);
    if (callee.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return callee;
    }
    const localPrefix = `${context.projectionLocalKey()}:call-scope:${expression.name.name}`;
    return this.evaluateCallableCallReturn({
      expression,
      context,
      callee,
      optional: expression.optional,
      definitelyNullishLocalKey: `${localPrefix}:nullish`,
      maybeNullishLocalKey: `${localPrefix}:maybe-nullish`,
      definitelyNullishSummary: `Call target '${expression.name.name}' reached definitely nullish type '${callee.typeShape.display ?? 'unknown'}'.`,
      maybeNullishSummary: `Call target '${expression.name.name}' can reach nullish type '${callee.typeShape.display ?? 'unknown'}'.`,
      returnLocalSuffix: `call-scope:${expression.name.name}`,
    });
  }

  private evaluateCallGlobal(
    expression: CallGlobalExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const projected = this.evaluateCallGlobalCallee(expression, context);
    if (projected == null) {
      if (context.runtimeContext.strict === false) {
        return this.support.projectPrimitive(expression, scope, `${localKey}:global-call:${expression.name.name}:undefined`, 'undefined', sourceAddressHandle);
      }
      return this.support.open(
        context.runtimeContext.strict === true
          ? CheckerExpressionTypeOpenKind.UnsupportedCallTarget
          : CheckerExpressionTypeOpenKind.UnsupportedGlobalAccess,
        expression,
        `Global call '${expression.name.name}' could not be resolved through the active TypeChecker.`,
      );
    }
    return this.calls.evaluateCallReturn(
      context,
      projected.typeShape,
      checkerExpressionCallArguments(expression.args, 'args'),
      projected.sourceAddressHandle,
      `global-call:${expression.name.name}`,
    );
  }

  private evaluateNew(
    expression: NewExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const constructor = this.evaluateNewConstructor(expression, context);
    if (constructor.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return constructor;
    }

    return this.calls.evaluateConstructReturn(
      context,
      constructor.typeShape,
      checkerExpressionCallArguments(expression.args, 'args'),
      constructor.sourceAddressHandle,
      'construct-return',
    );
  }

  private evaluateCallMember(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const syntheticArrayMethod = this.arrayMethods.evaluateMemberCall(expression, context);
    if (syntheticArrayMethod != null) {
      return syntheticArrayMethod;
    }

    const localKey = context.projectionLocalKey();
    const memberType = this.access.evaluateCallMemberCallee(expression, context);
    if (memberType.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return memberType;
    }
    const localPrefix = `${localKey}:call-member:${expression.name.name}`;
    return this.evaluateCallableCallReturn({
      expression,
      context,
      callee: memberType,
      optional: expression.optionalCall,
      definitelyNullishLocalKey: `${localPrefix}:nullish-call`,
      maybeNullishLocalKey: `${localPrefix}:maybe-nullish-call`,
      definitelyNullishSummary: `Member call '${expression.name.name}' reached definitely nullish callable type '${memberType.typeShape.display ?? 'unknown'}'.`,
      maybeNullishSummary: `Member call '${expression.name.name}' can reach nullish callable type '${memberType.typeShape.display ?? 'unknown'}'.`,
      returnLocalSuffix: `call-return:${expression.name.name}`,
    });
  }

  private evaluateCallFunction(
    expression: CallFunctionExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const callee = this.evaluateCallFunctionCallee(expression, context);
    if (callee.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return callee;
    }
    const localPrefix = `${context.projectionLocalKey()}:call-function`;
    return this.evaluateCallableCallReturn({
      expression,
      context,
      callee,
      optional: expression.optional,
      definitelyNullishLocalKey: `${localPrefix}:nullish`,
      maybeNullishLocalKey: `${localPrefix}:maybe-nullish`,
      definitelyNullishSummary: `Function call reached definitely nullish callable type '${callee.typeShape.display ?? 'unknown'}'.`,
      maybeNullishSummary: `Function call can reach nullish callable type '${callee.typeShape.display ?? 'unknown'}'.`,
      returnLocalSuffix: 'call-function-return',
    });
  }

  private evaluateCallableCallReturn(
    request: CheckerExpressionCallableCallReturnRequest,
  ): CheckerExpressionTypeEvaluation {
    const {
      expression,
      context,
      callee,
      optional,
      definitelyNullishLocalKey,
      maybeNullishLocalKey,
      definitelyNullishSummary,
      maybeNullishSummary,
      returnLocalSuffix,
    } = request;
    const nullishPresence = checkerTypeShapeNullishPresence(callee.typeShape);
    if (nullishPresence === CheckerTypeNullishPresence.Definitely) {
      return this.evaluateNullishCallTarget(
        expression,
        context.scope,
        definitelyNullishLocalKey,
        context.sourceAddressHandle,
        optional,
        context.runtimeContext,
        definitelyNullishSummary,
        callee.typeReference,
      );
    }
    if (nullishPresence === CheckerTypeNullishPresence.Maybe) {
      return this.evaluatePossiblyNullishCallTarget(
        expression,
        context,
        callee,
        maybeNullishLocalKey,
        optional,
        maybeNullishSummary,
        returnLocalSuffix,
      );
    }

    return this.calls.evaluateCallReturn(
      context,
      callee.typeShape,
      checkerExpressionCallArguments(expression.args, 'args'),
      callee.sourceAddressHandle,
      returnLocalSuffix,
    );
  }

  private evaluateTaggedTemplate(
    expression: TaggedTemplateExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const tag = this.evaluateTaggedTemplateTag(expression, context);
    if (tag.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return tag;
    }

    return this.calls.evaluateCallReturn(
      context,
      tag.typeShape,
      [
        {
          expression,
          localSuffix: 'tag-cooked',
          precomputedEvaluation: this.evaluateTaggedTemplateCookedArgument(
            expression,
            scope,
            `${localKey}:tag-cooked`,
            sourceAddressHandle,
          ),
        },
        ...checkerExpressionCallArguments(expression.expressions, 'tag-args'),
      ],
      tag.sourceAddressHandle,
      'tag-return',
    );
  }

  private evaluateTaggedTemplateCookedArgument(
    expression: TaggedTemplateExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const stringType = this.support.projectPrimitive(expression, scope, `${localKey}:string`, 'string', sourceAddressHandle);
    const numberType = this.support.projectPrimitive(expression, scope, `${localKey}:length`, 'number', sourceAddressHandle);
    if (stringType.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return stringType;
    }
    if (numberType.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return numberType;
    }
    const rawArray = this.synthesis.arrayType(
      stringType.typeReference,
      numberType.typeReference,
      `${localKey}:raw`,
      sourceAddressHandle,
    );
    const cooked = this.synthesis.templateStringsArrayType(
      stringType.typeReference,
      numberType.typeReference,
      rawArray.toReference(),
      localKey,
      sourceAddressHandle,
    );
    return this.support.type(cooked, 'Synthesized tagged-template cooked string array argument.');
  }

  private evaluateCallScopeCallee(
    expression: CallScopeExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    return this.scopes.evaluateScopeName(
      expression,
      context.scope,
      expression.name.name,
      expression.ancestor,
      `${context.projectionLocalKey()}:callee:${expression.name.name}`,
    );
  }

  private evaluateCallGlobalCallee(
    expression: CallGlobalExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionType | null {
    const type = this.support.resolveGlobalType(context.scope, expression.name.name);
    return type == null
      ? null
      : this.support.projectType(
        expression,
        type.checker,
        type.type,
        `${context.projectionLocalKey()}:global-callee:${expression.name.name}`,
        context.sourceAddressHandle,
      );
  }

  private evaluateCallMemberCallee(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    return this.access.evaluateCallMemberCallee(expression, context);
  }

  private evaluateCallFunctionCallee(
    expression: CallFunctionExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(context.child(expression.func, 'call-function'));
  }

  private evaluateNewConstructor(
    expression: NewExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(context.child(expression.func, 'constructor'));
  }

  private evaluateTaggedTemplateTag(
    expression: TaggedTemplateExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(context.child(expression.func, 'tag'));
  }

  private evaluatePrimitiveLiteral(
    expression: PrimitiveLiteralExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.support.projectPrimitiveValue(expression, scope, localKey, expression.value, sourceAddressHandle);
  }

  private evaluateTemplate(
    expression: TemplateExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.support.projectPrimitive(expression, scope, `${localKey}:template`, 'string', sourceAddressHandle);
  }

  private evaluateInterpolation(
    expression: Interpolation,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.support.projectPrimitive(expression, scope, `${localKey}:interpolation`, 'string', sourceAddressHandle);
  }

  private evaluateArrowFunction(
    expression: ArrowFunction,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const contextualType = context.contextualType;
    const functionScope = this.contextualTypes.arrowFunctionScope(expression, scope, localKey, sourceAddressHandle, contextualType);
    const body = this.evaluateNode(context.childInScope(expression.body, functionScope, 'return'));
    const returnType = typeReferenceForEvaluation(body);
    return this.support.type(
      this.synthesis.arrowFunctionType(expression, returnType, localKey, sourceAddressHandle),
      arrowFunctionSummary(returnType),
    );
  }

  private evaluateArrayLiteral(
    expression: ArrayLiteralExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const contextualType = context.contextualType;
    const members: CheckerSyntheticTypeMemberRequest[] = [];
    const elementTypes: CheckerTypeShape[] = [];
    const lengthType = this.support.projectPrimitive(expression, scope, `${localKey}:array:length`, 'number', sourceAddressHandle);
    const lengthReference = lengthType.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? lengthType.typeReference
      : null;

    if (lengthReference != null) {
      members.push({ name: 'length', valueType: lengthReference, memberKind: CheckerTypeMemberKind.Property });
    }

    expression.elements.forEach((element, index) => {
      const result = this.evaluateNode(context.child(
        element,
        `array:${index}`,
        this.contextualTypes.contextualArrayElementType(contextualType, index, `${localKey}:array:${index}:context`, sourceAddressHandle),
      ));
      const valueType = result.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? result.typeReference
        : null;
      if (result.kind === CheckerExpressionTypeEvaluationResultKind.Type) {
        elementTypes.push(result.typeShape);
      }
      members.push({ name: String(index), valueType, memberKind: CheckerTypeMemberKind.Property });
    });

    const typeShape = this.synthesis.arrayLiteralType(members, elementTypes, expression.elements.length, localKey, sourceAddressHandle);
    return this.support.type(typeShape, 'Synthesized ArrayLiteral type shape from evaluated element expressions.');
  }

  private evaluateObjectLiteral(
    expression: ObjectLiteralExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const contextualType = context.contextualType;
    const memberByName = new Map<string, CheckerSyntheticTypeMemberRequest>();
    expression.keys.forEach((key, index) => {
      const propertyName = String(key);
      const value = expression.values[index] ?? null;
      const result = value == null
        ? null
        : this.evaluateNode(context.child(
          value,
          `object:${index}:${localKeyPart(propertyName)}`,
          this.contextualTypes.contextualObjectPropertyType(
            contextualType,
            propertyName,
            `${localKey}:object:${index}:${localKeyPart(propertyName)}:context`,
            sourceAddressHandle,
          ),
        ));
      const valueType = result?.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? result.typeReference
        : null;
      memberByName.set(propertyName, { name: propertyName, valueType, memberKind: CheckerTypeMemberKind.Property });
    });
    const members = [...memberByName.values()];

    const typeShape = this.synthesis.objectLiteralType(members, localKey, sourceAddressHandle);
    return this.support.type(typeShape, 'Synthesized ObjectLiteral type shape from evaluated property expressions.');
  }

  private evaluateUnary(
    expression: UnaryExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    switch (expression.operation) {
      case 'typeof':
        return this.support.projectPrimitive(expression, scope, `${localKey}:typeof`, 'string', sourceAddressHandle);
      case '!':
        return this.support.projectPrimitive(expression, scope, `${localKey}:not`, 'boolean', sourceAddressHandle);
      case 'void':
        return this.support.projectPrimitive(expression, scope, `${localKey}:void`, 'undefined', sourceAddressHandle);
      case '+':
      case '-':
        return this.support.projectPrimitive(expression, scope, `${localKey}:numeric`, 'number', sourceAddressHandle);
      case '++':
      case '--':
        if (context.runtimeContext.connectable) {
          return this.support.open(
            CheckerExpressionTypeOpenKind.IncrementInConnectableEvaluation,
            expression,
            `Aurelia astEvaluate rejects '${expression.operation}' while a binding connectable is collecting dependencies.`,
          );
        }
        return this.support.projectPrimitive(expression, scope, `${localKey}:numeric`, 'number', sourceAddressHandle);
      default:
        return this.evaluateNode(context.child(expression.expression, 'unary'));
    }
  }

  private evaluateBinary(
    expression: BinaryExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    switch (expression.operation) {
      case '==':
      case '===':
      case '!=':
      case '!==':
      case 'instanceof':
      case 'in':
      case '<':
      case '>':
      case '<=':
      case '>=':
        return this.support.projectPrimitive(expression, scope, `${localKey}:boolean`, 'boolean', sourceAddressHandle);
      case '-':
      case '*':
      case '/':
      case '%':
      case '**':
        return this.support.projectPrimitive(expression, scope, `${localKey}:number`, 'number', sourceAddressHandle);
      case '+':
        return this.evaluatePlus(expression, context);
      case '??':
      case '&&':
      case '||':
        return this.evaluateShortCircuitBinary(expression, context);
    }
  }

  private evaluatePlus(
    expression: BinaryExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const left = this.evaluateNode(context.child(expression.left, 'left'));
    if (left.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return left;
    }
    const right = this.evaluateNode(context.child(expression.right, 'right'));
    if (right.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return right;
    }

    if (checkerTypeShapeIsPrimitiveDisplay(left.typeShape, 'string') || checkerTypeShapeIsPrimitiveDisplay(right.typeShape, 'string')) {
      return this.support.projectPrimitive(expression, scope, `${localKey}:plus-string`, 'string', sourceAddressHandle);
    }
    if (checkerTypeShapeIsPrimitiveDisplay(left.typeShape, 'number') && checkerTypeShapeIsPrimitiveDisplay(right.typeShape, 'number')) {
      return this.support.projectPrimitive(expression, scope, `${localKey}:plus-number`, 'number', sourceAddressHandle);
    }

    const stringType = this.support.projectPrimitive(expression, scope, `${localKey}:plus-string-result-lane`, 'string', sourceAddressHandle);
    const numberType = this.support.projectPrimitive(expression, scope, `${localKey}:plus-number-result-lane`, 'number', sourceAddressHandle);
    if (
      stringType.kind === CheckerExpressionTypeEvaluationResultKind.Type
      && numberType.kind === CheckerExpressionTypeEvaluationResultKind.Type
    ) {
      return this.support.evaluateTypeUnion(
        [stringType, numberType],
        `${localKey}:plus-result`,
        sourceAddressHandle,
        `Binary operator '+' reached '${left.typeShape.display}' and '${right.typeShape.display}'; projected the JavaScript string-or-number result lane.`,
      );
    }

    return stringType.kind === CheckerExpressionTypeEvaluationResultKind.Open
      ? stringType
      : numberType;
  }

  private evaluateShortCircuitBinary(
    expression: BinaryExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const left = this.evaluateNode(context.child(expression.left, 'left'));
    if (left.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return left;
    }
    const rightScope = this.branchScopes.shortCircuitRightScope(expression, scope, `${localKey}:right-scope`, sourceAddressHandle);
    const right = this.evaluateNode(context.childInScope(expression.right, rightScope, 'right'));
    if (right.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return right;
    }
    if (sameCheckerTypeReference(left.typeReference, right.typeReference)) {
      return left;
    }

    return this.support.evaluateTypeUnion(
      [left, right],
      `${localKey}:short-circuit:${expression.operation}`,
      sourceAddressHandle,
      `Binary operator '${expression.operation}' can produce either operand type by runtime short-circuit semantics.`,
    );
  }

  private evaluateConditional(
    expression: ConditionalExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const scope = context.scope;
    const localKey = context.projectionLocalKey();
    const sourceAddressHandle = context.sourceAddressHandle;
    const contextualType = context.contextualType;
    const yesScope = this.branchScopes.truthyScope(
      expression.condition,
      scope,
      `${localKey}:condition:truthy`,
      sourceAddressHandle,
    );
    const yes = this.evaluateNode(context.childInScope(expression.yes, yesScope, 'yes', contextualType));
    if (yes.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return yes;
    }
    const noScope = this.branchScopes.falsyScope(
      expression.condition,
      scope,
      `${localKey}:condition:falsy`,
      sourceAddressHandle,
    );
    const no = this.evaluateNode(context.childInScope(expression.no, noScope, 'no', contextualType));
    if (no.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return no;
    }
    if (yes.typeShape.checkerKey === no.typeShape.checkerKey) {
      return yes;
    }
    return this.support.evaluateTypeUnion(
      [yes, no],
      `${localKey}:conditional`,
      sourceAddressHandle,
      'Conditional branches resolved to different types; projected a synthetic branch union.',
    );
  }

  private evaluateNullishCallTarget(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    optional: boolean,
    runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext,
    openSummary: string,
    partialTypeReference: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation {
    if (optional || runtimeContext.strict === false) {
      return this.support.projectPrimitive(expression, scope, `${localKey}:undefined`, 'undefined', sourceAddressHandle);
    }
    return this.support.open(CheckerExpressionTypeOpenKind.NullishCallTarget, expression, openSummary, partialTypeReference);
  }

  private evaluatePossiblyNullishCallTarget(
    expression: CallScopeExpression | CallMemberExpression | CallFunctionExpression,
    context: CheckerExpressionTypeEvaluationContext,
    callee: CheckerExpressionType,
    localKey: string,
    optional: boolean,
    openSummary: string,
    callReturnLocalSuffix: string = 'call-return',
  ): CheckerExpressionTypeEvaluation {
    if (!optional && context.runtimeContext.strict !== false) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.NullishCallTarget,
        expression,
        openSummary,
        callee.typeReference,
      );
    }
    const nonNullishCallee = this.typeAccess.nonNullishTypeShape(
      callee.typeShape,
      `${localKey}:non-nullish-callee`,
      callee.sourceAddressHandle,
    );
    if (nonNullishCallee == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingTypeDetail,
        expression,
        `Non-nullish call target lane for '${callee.typeShape.display}' could not be projected.`,
        callee.typeReference,
      );
    }
    const callReturn = this.calls.evaluateCallReturn(
      context,
      nonNullishCallee,
      checkerExpressionCallArguments(expression.args, 'args'),
      callee.sourceAddressHandle,
      callReturnLocalSuffix,
    );
    if (callReturn.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return callReturn;
    }
    const undefinedValue = this.support.projectPrimitive(
      expression,
      context.scope,
      `${localKey}:undefined`,
      'undefined',
      context.sourceAddressHandle,
    );
    return undefinedValue.kind === CheckerExpressionTypeEvaluationResultKind.Open
      ? undefinedValue
      : this.support.evaluateTypeUnion(
        [callReturn, undefinedValue],
        `${localKey}:result`,
        context.sourceAddressHandle,
        'Non-strict/optional call can return the call result or undefined.',
      );
  }

}

function cachedExpressionEvaluationProductsAreLive(
  store: KernelStore,
  evaluation: CheckerExpressionTypeEvaluation,
): boolean {
  const reference = evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
    ? evaluation.typeReference
    : evaluation.partialTypeReference;
  return reference?.productHandle == null
    || store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle) != null;
}

function typeReferenceForEvaluation(
  evaluation: CheckerExpressionTypeEvaluation,
): CheckerTypeReference | null {
  return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
    ? evaluation.typeReference
    : null;
}

function arrowFunctionSummary(returnType: CheckerTypeReference | null): string {
  return returnType == null
    ? 'Synthesized ArrowFunction shape; return type remains open because the body could not be projected.'
    : 'Synthesized ArrowFunction shape with projected body return type.';
}
