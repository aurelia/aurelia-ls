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
  checkerTypeShapeIsDefinitelyNullish,
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
  CheckerExpressionTypeSynthesizer,
} from './expression-type-synthesis.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import { CheckerExpressionBranchScopeProjector } from './expression-branch-scope.js';
import {
  CheckerExpressionMemberOwnerProjector,
} from './expression-member-owner-projector.js';
import {
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
  type RuntimeValueConverterMethodName,
} from './expression-resource-projector.js';
import { CheckerExpressionScopeProjector } from './expression-scope-projector.js';

export type CheckerExpressionTypeEvaluationRuntimeContext = {
  /** Mirrors the runtime `IConnectable | null` argument that decides whether incrementing evaluation would resubscribe forever. */
  readonly connectable: boolean;
  /** Mirrors `IAstEvaluator.strict`; null means the caller has not proven the runtime evaluator mode. */
  readonly strict: boolean | null;
};

const nonConnectableEvaluationContext: CheckerExpressionTypeEvaluationRuntimeContext = {
  connectable: false,
  strict: null,
};

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
  private readonly scopes: CheckerExpressionScopeProjector;
  private readonly iterables: CheckerExpressionIterableProjector;
  private readonly resources: CheckerExpressionResourceProjector;
  private evaluationRuntimeContext: CheckerExpressionTypeEvaluationRuntimeContext = nonConnectableEvaluationContext;

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
      evaluateNode: (expression, scope, localKey, sourceAddressHandle) =>
        this.evaluateNode(expression, scope, localKey, sourceAddressHandle),
    });
    this.scopes = new CheckerExpressionScopeProjector(this.support, this.access);
    this.iterables = new CheckerExpressionIterableProjector(this.support, this.typeAccess, this.synthesis, {
      evaluateNode: (expression, scope, localKey, sourceAddressHandle) =>
        this.evaluateNode(expression, scope, localKey, sourceAddressHandle),
    });
    this.calls = new CheckerExpressionCallProjector(this.support, {
      evaluateNode: (expression, scope, localKey, sourceAddressHandle, contextualType) =>
        this.evaluateNode(expression, scope, localKey, sourceAddressHandle, contextualType),
    });
    this.resources = new CheckerExpressionResourceProjector(
      this.support,
      this.access,
      this.calls,
      resourceScope,
      new StateBindingScopeProjector(store, stateStores),
      {
        evaluateNode: (expression, scope, localKey, sourceAddressHandle) =>
          this.evaluateNode(expression, scope, localKey, sourceAddressHandle),
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
      evaluateCallScopeCallee: (expression, scope, localKey) =>
        this.evaluateCallScopeCallee(expression, scope, localKey),
      evaluateCallGlobalCallee: (expression, scope, localKey, sourceAddressHandle) =>
        this.evaluateCallGlobalCallee(expression, scope, localKey, sourceAddressHandle),
      evaluateCallMemberCallee: (expression, scope, localKey, sourceAddressHandle) =>
        this.evaluateCallMemberCallee(expression, scope, localKey, sourceAddressHandle),
      evaluateCallFunctionCallee: (expression, scope, localKey, sourceAddressHandle) =>
        this.evaluateCallFunctionCallee(expression, scope, localKey, sourceAddressHandle),
      evaluateNewConstructor: (expression, scope, localKey, sourceAddressHandle) =>
        this.evaluateNewConstructor(expression, scope, localKey, sourceAddressHandle),
      evaluateTaggedTemplateTag: (expression, scope, localKey, sourceAddressHandle) =>
        this.evaluateTaggedTemplateTag(expression, scope, localKey, sourceAddressHandle),
    });
    this.memberOwners = new CheckerExpressionMemberOwnerProjector({
      evaluateNode: (expression, scope, localKey, sourceAddressHandle, contextualType) =>
        this.evaluateNode(expression, scope, localKey, sourceAddressHandle, contextualType),
      arrowFunctionScope: (expression, scope, localKey, sourceAddressHandle, contextualType) =>
        this.contextualTypes.arrowFunctionScope(expression, scope, localKey, sourceAddressHandle, contextualType),
      contextualArgumentType: (expression, argumentIndex, scope, localKey, sourceAddressHandle) =>
        this.argumentContexts.contextualArgumentType(expression, argumentIndex, scope, localKey, sourceAddressHandle),
      contextualArrayElementType: (contextualType, elementIndex, localKey, sourceAddressHandle) =>
        this.contextualTypes.contextualArrayElementType(contextualType, elementIndex, localKey, sourceAddressHandle),
      contextualObjectPropertyType: (contextualType, propertyName, localKey, sourceAddressHandle) =>
        this.contextualTypes.contextualObjectPropertyType(contextualType, propertyName, localKey, sourceAddressHandle),
    });
  }

  evaluateWithScope(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
    contextualType: CheckerTypeReference | null = null,
    runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext = nonConnectableEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const previousRuntimeContext = this.evaluationRuntimeContext;
    this.evaluationRuntimeContext = runtimeContext;
    try {
      return this.evaluateNode(expression, scope, localKey, sourceAddressHandle, contextualType);
    } finally {
      this.evaluationRuntimeContext = previousRuntimeContext;
    }
  }

  evaluateValueConverterMethodFromType(
    expression: ValueConverterExpression,
    methodName: RuntimeValueConverterMethodName,
    inputType: CheckerTypeReference,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    const input = this.support.resolveReference(
      expression,
      inputType,
      `${localKey}:input`,
      CheckerExpressionTypeOpenKind.OpenValueConverter,
      `Value converter '${expression.name.name}' ${methodName} input type could not be hydrated.`,
      null,
      inputType.sourceAddressHandle ?? sourceAddressHandle,
    );
    return this.resources.evaluateValueConverterMethod(
      expression,
      methodName,
      input,
      scope,
      localKey,
      sourceAddressHandle,
    );
  }

  evaluateMemberOwnerAtOffset(
    expression: ExpressionAstNode,
    offset: number,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
    contextualType: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeEvaluation {
    const evaluation = this.memberOwners.evaluateAtOffset(
      expression,
      offset,
      scope,
      localKey,
      sourceAddressHandle,
      contextualType,
    );
    return evaluation ?? this.support.open(
      CheckerExpressionTypeOpenKind.MissingMember,
      expression,
      `No member-owner expression was reachable at offset ${offset}.`,
    );
  }

  evaluateMemberValueAccessAtOffset(
    expression: ExpressionAstNode,
    offset: number,
    memberName: string,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
    contextualType: CheckerTypeReference | null = null,
  ): CheckerTypeShapeMemberValueAccess | null {
    const owner = this.evaluateMemberOwnerAtOffset(
      expression,
      offset,
      scope,
      `${localKey}:owner`,
      sourceAddressHandle,
      contextualType,
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
      : this.typeAccess.memberValueAccess(ownerShape, memberName, `${localKey}:member:${localKeyPart(memberName)}`);
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
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    return this.iterables.evaluateIteratorElement(expression, scope, localKey, sourceAddressHandle);
  }

  evaluateIteratorLocals(
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation | CheckerBindingPatternLocalProjection {
    return this.iterables.evaluateIteratorLocals(expression, scope, localKey, sourceAddressHandle);
  }

  evaluateIteratorProjection(
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionIteratorProjection {
    return this.iterables.evaluateIteratorProjection(expression, scope, localKey, sourceAddressHandle);
  }

  private evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeEvaluation {
    const effectiveContextualType = contextualTypeForEvaluation(expression, contextualType);
    const cacheKey = expressionEvaluationCacheKey(
      localKey,
      expression,
      scope,
      this.resourceScope,
      sourceAddressHandle,
      this.evaluationRuntimeContext,
      effectiveContextualType,
    );
    return this.cache.readOrEvaluate(cacheKey, () =>
      this.evaluateNodeUncached(expression, scope, localKey, sourceAddressHandle, effectiveContextualType)
    );
  }

  private evaluateNodeUncached(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation {
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
        return this.access.evaluateAccessMember(expression, scope, localKey, sourceAddressHandle, this.evaluationRuntimeContext);
      case 'AccessKeyed':
        return this.access.evaluateAccessKeyed(expression, scope, localKey, sourceAddressHandle, this.evaluationRuntimeContext);
      case 'CallScope':
        return this.evaluateCallScope(expression, scope, localKey, sourceAddressHandle);
      case 'CallMember':
        return this.evaluateCallMember(expression, scope, localKey, sourceAddressHandle);
      case 'CallFunction':
        return this.evaluateCallFunction(expression, scope, localKey, sourceAddressHandle);
      case 'CallGlobal':
        return this.evaluateCallGlobal(expression, scope, localKey, sourceAddressHandle);
      case 'New':
        return this.evaluateNew(expression, scope, localKey, sourceAddressHandle);
      case 'Paren':
        return this.evaluateNode(expression.expression, scope, `${localKey}:paren`, sourceAddressHandle, contextualType);
      case 'PrimitiveLiteral':
        return this.evaluatePrimitiveLiteral(expression, scope, localKey, sourceAddressHandle);
      case 'Template':
        return this.evaluateTemplate(expression, scope, localKey, sourceAddressHandle);
      case 'Interpolation':
        return this.evaluateInterpolation(expression, scope, localKey, sourceAddressHandle);
      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(expression, scope, localKey, sourceAddressHandle, contextualType);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteral(expression, scope, localKey, sourceAddressHandle, contextualType);
      case 'Unary':
        return this.evaluateUnary(expression, scope, localKey, sourceAddressHandle);
      case 'Binary':
        return this.evaluateBinary(expression, scope, localKey, sourceAddressHandle);
      case 'Conditional':
        return this.evaluateConditional(expression, scope, localKey, sourceAddressHandle, contextualType);
      case 'Assign':
        if (this.evaluationRuntimeContext.connectable && expression.op !== '=') {
          return this.support.open(
            CheckerExpressionTypeOpenKind.IncrementInConnectableEvaluation,
            expression,
            `Aurelia astEvaluate rejects compound assignment '${expression.op}' while a binding connectable is collecting dependencies.`,
          );
        }
        return this.evaluateNode(expression.value, scope, `${localKey}:assign-value`, sourceAddressHandle);
      case 'ArrowFunction':
        return this.evaluateArrowFunction(expression, scope, localKey, sourceAddressHandle, contextualType);
      case 'ValueConverter':
        return this.resources.evaluateValueConverter(expression, scope, localKey, sourceAddressHandle);
      case 'BindingBehavior':
        return this.resources.evaluateBindingBehavior(expression, scope, localKey, sourceAddressHandle);
      case 'ForOfStatement':
        return this.iterables.evaluateForOfStatement(expression, scope, localKey, sourceAddressHandle);
      case 'TaggedTemplate':
        return this.evaluateTaggedTemplate(expression, scope, localKey, sourceAddressHandle);
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const callee = this.evaluateCallScopeCallee(expression, scope, localKey);
    if (callee.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return callee;
    }
    if (checkerTypeShapeIsDefinitelyNullish(callee.typeShape)) {
      return this.evaluateNullishCallTarget(
        expression,
        scope,
        `${localKey}:call-scope:${expression.name.name}:nullish`,
        sourceAddressHandle,
        expression.optional,
        `Call target '${expression.name.name}' reached definitely nullish type '${callee.typeShape.display ?? 'unknown'}'.`,
        callee.typeReference,
      );
    }

    return this.calls.evaluateCallReturn(
      expression,
      callee.typeShape,
      checkerExpressionCallArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:call-scope:${expression.name.name}`,
      sourceAddressHandle,
      callee.sourceAddressHandle,
    );
  }

  private evaluateCallGlobal(
    expression: CallGlobalExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const projected = this.evaluateCallGlobalCallee(expression, scope, localKey, sourceAddressHandle);
    if (projected == null) {
      if (this.evaluationRuntimeContext.strict === false) {
        return this.support.projectPrimitive(expression, scope, `${localKey}:global-call:${expression.name.name}:undefined`, 'undefined', sourceAddressHandle);
      }
      return this.support.open(
        this.evaluationRuntimeContext.strict === true
          ? CheckerExpressionTypeOpenKind.UnsupportedCallTarget
          : CheckerExpressionTypeOpenKind.UnsupportedGlobalAccess,
        expression,
        `Global call '${expression.name.name}' could not be resolved through the active TypeChecker.`,
      );
    }
    return this.calls.evaluateCallReturn(
      expression,
      projected.typeShape,
      checkerExpressionCallArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:global-call:${expression.name.name}`,
      sourceAddressHandle,
      projected.sourceAddressHandle,
    );
  }

  private evaluateNew(
    expression: NewExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const constructor = this.evaluateNewConstructor(expression, scope, localKey, sourceAddressHandle);
    if (constructor.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return constructor;
    }

    return this.calls.evaluateConstructReturn(
      expression,
      constructor.typeShape,
      checkerExpressionCallArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:construct-return`,
      sourceAddressHandle,
      constructor.sourceAddressHandle,
    );
  }

  private evaluateCallMember(
    expression: CallMemberExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const memberType = this.evaluateCallMemberCallee(expression, scope, localKey, sourceAddressHandle);
    if (memberType.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return memberType;
    }
    if (checkerTypeShapeIsDefinitelyNullish(memberType.typeShape)) {
      return this.evaluateNullishCallTarget(
        expression,
        scope,
        `${localKey}:call-member:${expression.name.name}:nullish-call`,
        sourceAddressHandle,
        expression.optionalCall,
        `Member call '${expression.name.name}' reached definitely nullish callable type '${memberType.typeShape.display ?? 'unknown'}'.`,
        memberType.typeReference,
      );
    }

    return this.calls.evaluateCallReturn(
      expression,
      memberType.typeShape,
      checkerExpressionCallArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:call-return:${expression.name.name}`,
      sourceAddressHandle,
      memberType.sourceAddressHandle,
    );
  }

  private evaluateCallFunction(
    expression: CallFunctionExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const callee = this.evaluateCallFunctionCallee(expression, scope, localKey, sourceAddressHandle);
    if (callee.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return callee;
    }
    if (checkerTypeShapeIsDefinitelyNullish(callee.typeShape)) {
      return this.evaluateNullishCallTarget(
        expression,
        scope,
        `${localKey}:call-function:nullish`,
        sourceAddressHandle,
        expression.optional,
        `Function call reached definitely nullish callable type '${callee.typeShape.display ?? 'unknown'}'.`,
        callee.typeReference,
      );
    }

    return this.calls.evaluateCallReturn(
      expression,
      callee.typeShape,
      checkerExpressionCallArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:call-function-return`,
      sourceAddressHandle,
      callee.sourceAddressHandle,
    );
  }

  private evaluateTaggedTemplate(
    expression: TaggedTemplateExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const tag = this.evaluateTaggedTemplateTag(expression, scope, localKey, sourceAddressHandle);
    if (tag.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return tag;
    }

    return this.calls.evaluateCallReturn(
      expression,
      tag.typeShape,
      [
        {
          expression,
          localKey: `${localKey}:tag-cooked`,
          precomputedEvaluation: this.evaluateTaggedTemplateCookedArgument(
            expression,
            scope,
            `${localKey}:tag-cooked`,
            sourceAddressHandle,
          ),
        },
        ...checkerExpressionCallArguments(expression.expressions, `${localKey}:tag-args`),
      ],
      scope,
      `${localKey}:tag-return`,
      sourceAddressHandle,
      tag.sourceAddressHandle,
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
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    return this.scopes.evaluateScopeName(
      expression,
      scope,
      expression.name.name,
      expression.ancestor,
      `${localKey}:callee:${expression.name.name}`,
    );
  }

  private evaluateCallGlobalCallee(
    expression: CallGlobalExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionType | null {
    const type = this.support.resolveGlobalType(scope, expression.name.name);
    return type == null
      ? null
      : this.support.projectType(expression, type.checker, type.type, `${localKey}:global-callee:${expression.name.name}`, sourceAddressHandle);
  }

  private evaluateCallMemberCallee(
    expression: CallMemberExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.access.evaluateCallMemberCallee(
      expression,
      scope,
      localKey,
      sourceAddressHandle,
      this.evaluationRuntimeContext,
    );
  }

  private evaluateCallFunctionCallee(
    expression: CallFunctionExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(
      expression.func,
      scope,
      `${localKey}:call-function`,
      sourceAddressHandle,
    );
  }

  private evaluateNewConstructor(
    expression: NewExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(
      expression.func,
      scope,
      `${localKey}:constructor`,
      sourceAddressHandle,
    );
  }

  private evaluateTaggedTemplateTag(
    expression: TaggedTemplateExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(
      expression.func,
      scope,
      `${localKey}:tag`,
      sourceAddressHandle,
    );
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation {
    const functionScope = this.contextualTypes.arrowFunctionScope(expression, scope, localKey, sourceAddressHandle, contextualType);
    const body = this.evaluateNode(expression.body, functionScope, `${localKey}:return`, sourceAddressHandle);
    const returnType = typeReferenceForEvaluation(body);
    return this.support.type(
      this.synthesis.arrowFunctionType(expression, returnType, localKey, sourceAddressHandle),
      arrowFunctionSummary(returnType),
    );
  }

  private evaluateArrayLiteral(
    expression: ArrayLiteralExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation {
    const members: CheckerSyntheticTypeMemberRequest[] = [];
    const elementTypes: CheckerTypeReference[] = [];
    const lengthType = this.support.projectPrimitive(expression, scope, `${localKey}:array:length`, 'number', sourceAddressHandle);
    const lengthReference = lengthType.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? lengthType.typeReference
      : null;

    if (lengthReference != null) {
      members.push({ name: 'length', valueType: lengthReference, memberKind: CheckerTypeMemberKind.Property });
    }

    expression.elements.forEach((element, index) => {
      const result = this.evaluateNode(
        element,
        scope,
        `${localKey}:array:${index}`,
        sourceAddressHandle,
        this.contextualTypes.contextualArrayElementType(contextualType, index, `${localKey}:array:${index}:context`, sourceAddressHandle),
      );
      const valueType = result.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? result.typeReference
        : null;
      if (valueType != null) {
        elementTypes.push(valueType);
      }
      members.push({ name: String(index), valueType, memberKind: CheckerTypeMemberKind.Property });
    });

    const typeShape = this.synthesis.arrayLiteralType(members, elementTypes, expression.elements.length, localKey, sourceAddressHandle);
    return this.support.type(typeShape, 'Synthesized ArrayLiteral type shape from evaluated element expressions.');
  }

  private evaluateObjectLiteral(
    expression: ObjectLiteralExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation {
    const memberByName = new Map<string, CheckerSyntheticTypeMemberRequest>();
    expression.keys.forEach((key, index) => {
      const propertyName = String(key);
      const value = expression.values[index] ?? null;
      const result = value == null
        ? null
        : this.evaluateNode(
          value,
          scope,
          `${localKey}:object:${index}:${localKeyPart(propertyName)}`,
          sourceAddressHandle,
          this.contextualTypes.contextualObjectPropertyType(
            contextualType,
            propertyName,
            `${localKey}:object:${index}:${localKeyPart(propertyName)}:context`,
            sourceAddressHandle,
          ),
        );
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
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
        if (this.evaluationRuntimeContext.connectable) {
          return this.support.open(
            CheckerExpressionTypeOpenKind.IncrementInConnectableEvaluation,
            expression,
            `Aurelia astEvaluate rejects '${expression.operation}' while a binding connectable is collecting dependencies.`,
          );
        }
        return this.support.projectPrimitive(expression, scope, `${localKey}:numeric`, 'number', sourceAddressHandle);
      default:
        return this.evaluateNode(expression.expression, scope, `${localKey}:unary`, sourceAddressHandle);
    }
  }

  private evaluateBinary(
    expression: BinaryExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
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
        return this.evaluatePlus(expression, scope, localKey, sourceAddressHandle);
      case '??':
      case '&&':
      case '||':
        return this.evaluateShortCircuitBinary(expression, scope, localKey, sourceAddressHandle);
    }
  }

  private evaluatePlus(
    expression: BinaryExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const left = this.evaluateNode(expression.left, scope, `${localKey}:left`, sourceAddressHandle);
    if (left.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return left;
    }
    const right = this.evaluateNode(expression.right, scope, `${localKey}:right`, sourceAddressHandle);
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const left = this.evaluateNode(expression.left, scope, `${localKey}:left`, sourceAddressHandle);
    if (left.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return left;
    }
    const rightScope = this.branchScopes.shortCircuitRightScope(expression, scope, `${localKey}:right-scope`, sourceAddressHandle);
    const right = this.evaluateNode(expression.right, rightScope, `${localKey}:right`, sourceAddressHandle);
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation {
    const yesScope = this.branchScopes.truthyScope(
      expression.condition,
      scope,
      `${localKey}:condition:truthy`,
      sourceAddressHandle,
    );
    const yes = this.evaluateNode(expression.yes, yesScope, `${localKey}:yes`, sourceAddressHandle, contextualType);
    if (yes.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return yes;
    }
    const noScope = this.branchScopes.falsyScope(
      expression.condition,
      scope,
      `${localKey}:condition:falsy`,
      sourceAddressHandle,
    );
    const no = this.evaluateNode(expression.no, noScope, `${localKey}:no`, sourceAddressHandle, contextualType);
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
    openSummary: string,
    partialTypeReference: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation {
    if (optional || this.evaluationRuntimeContext.strict === false) {
      return this.support.projectPrimitive(expression, scope, `${localKey}:undefined`, 'undefined', sourceAddressHandle);
    }
    return this.support.open(CheckerExpressionTypeOpenKind.NullishCallTarget, expression, openSummary, partialTypeReference);
  }

}

function contextualEvaluationLocalKey(
  localKey: string,
  contextualType: CheckerTypeReference | null,
): string {
  if (contextualType == null) {
    return localKey;
  }
  const contextKey = contextualType.checkerKey
    ?? contextualType.productHandle
    ?? contextualType.display
    ?? contextualType.shapeKind;
  return `${localKey}:contextual:${contextKey}`;
}

function expressionEvaluationCacheKey(
  localKey: string,
  expression: ExpressionAstNode,
  scope: BindingScope,
  resourceScope: TemplateResourceScope | null,
  sourceAddressHandle: AddressHandle | null,
  runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext,
  contextualType: CheckerTypeReference | null,
): string {
  const scopedLocalKey = runtimeContextualEvaluationLocalKey(
    contextualEvaluationLocalKey(localKey, contextualType),
    runtimeContext,
  );
  const source = sourceAddressHandle ?? expressionSourceSpanKey(expression);
  const resource = resourceScope?.productHandle ?? 'no-resource-scope';
  return `${scopedLocalKey}:scope:${scope.productHandle}:resource:${resource}:expr:${expression.$kind}:${source}`;
}

function runtimeContextualEvaluationLocalKey(
  localKey: string,
  runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext,
): string {
  const connectable = runtimeContext.connectable ? ':runtime-connectable' : '';
  const strict = runtimeContext.strict == null ? '' : `:runtime-strict:${runtimeContext.strict}`;
  return connectable === '' && strict === '' ? localKey : `${localKey}${connectable}${strict}`;
}

function expressionSourceSpanKey(expression: ExpressionAstNode): string {
  return `${expression.span.start}-${expression.span.end}`;
}

function contextualTypeForEvaluation(
  expression: ExpressionAstNode,
  contextualType: CheckerTypeReference | null,
): CheckerTypeReference | null {
  if (contextualType == null) {
    return null;
  }
  if (expression.$kind === 'Paren') {
    return contextualTypeForEvaluation(expression.expression, contextualType);
  }
  return expression.$kind === 'ArrowFunction'
    || expression.$kind === 'ArrayLiteral'
    || expression.$kind === 'ObjectLiteral'
    || expression.$kind === 'Conditional'
    ? contextualType
    : null;
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
