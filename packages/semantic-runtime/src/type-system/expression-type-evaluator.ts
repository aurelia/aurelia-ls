import ts from 'typescript';
import { auLink } from '../kernel/au-link.js';
import type {
  AccessKeyedExpression,
  AccessGlobalExpression,
  AccessMemberExpression,
  AccessScopeExpression,
  AccessThisExpression,
  ArrayLiteralExpression,
  ArrowFunction,
  BinaryExpression,
  BindingBehaviorExpression,
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  ExpressionAstNode,
  ForOfStatement,
  Interpolation,
  IsAssign,
  IsBindingBehavior,
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
import {
  BindingContext,
  BindingContextKind,
  BindingContextSlot,
  BindingScope,
  BindingScopeOwnerKind,
  BindingScopeLookupKind,
  OverrideContext,
  type BindingContextReference,
  type BindingScopeLookup,
} from '../configuration/scope.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { BindingBehaviorDefinition } from '../resources/binding-behavior-definition.js';
import type { ValueConverterDefinition } from '../resources/value-converter-definition.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import type { TemplateVisibleResource } from '../template/compiler-world-reference.js';
import {
  CheckerTypeProjector,
  type CheckerSyntheticTypeMemberRequest,
  type CheckerTypeProjectionRequest,
} from './checker-projector.js';
import { TypeSystemProductDetails } from './product-details.js';
import {
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShape,
  CheckerTypeShapeKind,
  checkerTypeShapeIsPrimitiveDisplay,
  sameCheckerTypeReference,
} from './type-shape.js';
import {
  checkerCollectionSymbolName,
  checkerRepeatableElementTypeInfo,
  checkerTypeShapeIsDefinitelyNullish,
} from './checker-related-types.js';
import {
  CheckerBindingPatternLocalProjection,
  CheckerBindingPatternLocalTypeProjector,
} from './binding-pattern-locals.js';
import { CheckerTypeShapeAccess } from './checker-type-shape-access.js';
import {
  CheckerExpressionType,
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationCache,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpen,
  CheckerExpressionTypeOpenKind,
  CheckerExpressionTypeOpenSubject,
  type CheckerExpressionTypeOpenSubjectKind,
} from './expression-type-evaluation.js';
import {
  CheckerExpressionTypeSynthesizer,
  commonTypeReference,
} from './expression-type-synthesis.js';
import { CheckerExpressionBranchScopeProjector } from './expression-branch-scope.js';
import { CheckerExpressionMemberOwnerProjector } from './expression-member-owner-projector.js';
import {
  CheckerExpressionCallProjector,
  type CheckerExpressionCallArgument,
} from './expression-call-projector.js';

type CheckerLookupCarrier = {
  readonly checker: ts.TypeChecker;
  readonly location: ts.Node | null;
};

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
  private readonly bindingPatternLocals: CheckerBindingPatternLocalTypeProjector;
  private readonly synthesis: CheckerExpressionTypeSynthesizer;
  private readonly branchScopes: CheckerExpressionBranchScopeProjector;
  private readonly memberOwners: CheckerExpressionMemberOwnerProjector;
  private readonly calls: CheckerExpressionCallProjector;
  private evaluationRuntimeContext: CheckerExpressionTypeEvaluationRuntimeContext = nonConnectableEvaluationContext;

  constructor(
    readonly store: KernelStore,
    readonly projector: CheckerTypeProjector,
    /** Compiler resource scope visible at this expression site, when template compilation supplied one. */
    readonly resourceScope: TemplateResourceScope | null = null,
    readonly cache: CheckerExpressionTypeEvaluationCache = new CheckerExpressionTypeEvaluationCache(),
  ) {
    this.typeAccess = new CheckerTypeShapeAccess(store, projector);
    this.bindingPatternLocals = new CheckerBindingPatternLocalTypeProjector(this.typeAccess);
    this.synthesis = new CheckerExpressionTypeSynthesizer(projector);
    this.branchScopes = new CheckerExpressionBranchScopeProjector(store, projector);
    this.calls = new CheckerExpressionCallProjector(store, projector, this.typeAccess, this.synthesis, {
      evaluateNode: (expression, scope, localKey, sourceAddressHandle, contextualType) =>
        this.evaluateNode(expression, scope, localKey, sourceAddressHandle, contextualType),
    });
    this.memberOwners = new CheckerExpressionMemberOwnerProjector({
      evaluateNode: (expression, scope, localKey, sourceAddressHandle, contextualType) =>
        this.evaluateNode(expression, scope, localKey, sourceAddressHandle, contextualType),
      arrowFunctionScope: (expression, scope, localKey, sourceAddressHandle, contextualType) =>
        this.arrowFunctionScope(expression, scope, localKey, sourceAddressHandle, contextualType),
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
    return evaluation ?? this.open(
      CheckerExpressionTypeOpenKind.MissingMember,
      expression,
      `No member-owner expression was reachable at offset ${offset}.`,
    );
  }

  evaluateIteratorElement(
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    const iterable = this.evaluateValueConverterRoot(
      expression.iterable,
      scope,
      `${localKey}:iterator-source`,
      sourceAddressHandle,
    );
    if (iterable.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return iterable;
    }
    return this.evaluateIterableElementType(expression, iterable.typeShape, `${localKey}:iterator-element`, sourceAddressHandle);
  }

  evaluateIteratorLocals(
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation | CheckerBindingPatternLocalProjection {
    const element = this.evaluateIteratorElement(expression, scope, localKey, sourceAddressHandle);
    if (element.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return element;
    }
    return this.bindingPatternLocals.projectBindingPattern(
      expression.declaration,
      element.typeShape,
      `${localKey}:iterator-local`,
      sourceAddressHandle,
    );
  }

  private evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeEvaluation {
    const effectiveContextualType = contextualTypeForEvaluation(expression, contextualType);
    const cacheKey = contextualEvaluationLocalKey(runtimeContextualEvaluationLocalKey(localKey, this.evaluationRuntimeContext), effectiveContextualType);
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
        return this.open(
          CheckerExpressionTypeOpenKind.UnsupportedExpression,
          expression,
          'Standalone identifiers are syntax atoms; use AccessScope for runtime scope lookup.',
        );
      case 'AccessThis':
        return this.evaluateAccessThis(expression, scope, localKey);
      case 'AccessBoundary':
        return this.evaluateAccessBoundary(expression, scope, localKey);
      case 'AccessScope':
        return this.evaluateAccessScope(expression, scope, localKey);
      case 'AccessGlobal':
        return this.evaluateAccessGlobal(expression, scope, localKey, sourceAddressHandle);
      case 'AccessMember':
        return this.evaluateAccessMember(expression, scope, localKey, sourceAddressHandle);
      case 'AccessKeyed':
        return this.evaluateAccessKeyed(expression, scope, localKey, sourceAddressHandle);
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
        return this.evaluateArrayLiteral(expression, scope, localKey, sourceAddressHandle);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteral(expression, scope, localKey, sourceAddressHandle);
      case 'Unary':
        return this.evaluateUnary(expression, scope, localKey, sourceAddressHandle);
      case 'Binary':
        return this.evaluateBinary(expression, scope, localKey, sourceAddressHandle);
      case 'Conditional':
        return this.evaluateConditional(expression, scope, localKey, sourceAddressHandle);
      case 'Assign':
        if (this.evaluationRuntimeContext.connectable && expression.op !== '=') {
          return this.open(
            CheckerExpressionTypeOpenKind.IncrementInConnectableEvaluation,
            expression,
            `Aurelia astEvaluate rejects compound assignment '${expression.op}' while a binding connectable is collecting dependencies.`,
          );
        }
        return this.evaluateNode(expression.value, scope, `${localKey}:assign-value`, sourceAddressHandle);
      case 'ArrowFunction':
        return this.evaluateArrowFunction(expression, scope, localKey, sourceAddressHandle, contextualType);
      case 'ValueConverter':
        return this.evaluateValueConverter(expression, scope, localKey, sourceAddressHandle);
      case 'BindingBehavior':
        return this.evaluateBindingBehavior(expression, scope, localKey, sourceAddressHandle);
      case 'ForOfStatement':
        return this.evaluateForOfStatement(expression, scope, localKey, sourceAddressHandle);
      case 'TaggedTemplate':
        return this.evaluateTaggedTemplate(expression, scope, localKey, sourceAddressHandle);
      case 'BindingIdentifier':
      case 'BindingPatternDefault':
      case 'BindingPatternHole':
      case 'ArrayBindingPattern':
      case 'ObjectBindingPattern':
      case 'DestructuringAssignment':
        return this.open(
          CheckerExpressionTypeOpenKind.UnsupportedBindingPattern,
          expression,
          `Binding-pattern expression kind '${expression.$kind}' does not produce a value type by itself.`,
        );
      case 'Custom':
        return this.open(
          CheckerExpressionTypeOpenKind.UnsupportedExpression,
          expression,
          'Custom expression type projection must be supplied by the custom expression implementation.',
        );
    }
  }

  private evaluateAccessThis(
    expression: AccessThisExpression,
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    const lookup = scope.lookupThis(expression.ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingAncestor,
        expression,
        `Could not resolve $this ancestor ${expression.ancestor}.`,
      );
    }

    return this.resolveContextType(expression, lookup.context, `${localKey}:this:${expression.ancestor}`);
  }

  private evaluateAccessBoundary(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    let current: BindingScope | null = scope;
    while (current != null && !current.isBoundary) {
      current = current.parent;
    }
    if (current == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingContext,
        expression,
        'No boundary scope was reachable for AccessBoundary.',
      );
    }
    return this.resolveContextType(expression, current.bindingContext.toReference(), `${localKey}:boundary`);
  }

  private evaluateAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateScopeName(expression, scope, expression.name.name, expression.ancestor, localKey);
  }

  private evaluateAccessGlobal(
    expression: AccessGlobalExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const type = this.resolveGlobalType(scope, expression.name.name);
    if (type == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.UnsupportedGlobalAccess,
        expression,
        `Global '${expression.name.name}' could not be resolved through the active TypeChecker.`,
      );
    }
    return this.projectType(expression, type.checker, type.type, `${localKey}:global:${expression.name.name}`, sourceAddressHandle);
  }

  private evaluateScopeName(
    expression: ExpressionAstNode,
    scope: BindingScope,
    name: string,
    ancestor: number,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    const lookup = scope.lookup(name, ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingAncestor,
        expression,
        `Could not resolve ancestor ${ancestor} for '${name}'.`,
      );
    }

    if (lookup.slot?.targetType != null) {
      const slotType = this.ensureProjectedSlotType(lookup.slot, lookup.slot.targetType, `${localKey}:slot:${name}`);
      return this.resolveReference(
        expression,
        slotType,
        `${localKey}:slot:${name}`,
        CheckerExpressionTypeOpenKind.MissingSlotType,
        `Slot '${name}' had a type reference but no projected type detail.`,
        this.openSubject('scope-slot', name, lookup.slot.sourceAddressHandle, slotType),
      );
    }

    if (name === '$host' && ancestor === 0 && lookup.slot == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.HostContextNotFound,
        expression,
        "Aurelia astEvaluate could not find a $host context for this binding scope.",
      );
    }

    const contextType = this.readContextType(lookup);
    if (contextType == null) {
      return this.open(
        lookup.slot == null
          ? CheckerExpressionTypeOpenKind.MissingContextType
          : CheckerExpressionTypeOpenKind.MissingSlotType,
        expression,
        lookup.slot == null
          ? `No slot or context type was available for '${name}'.`
          : `Slot '${name}' does not carry a target type yet.`,
        null,
        lookup.slot == null
          ? this.openSubject('scope-context', name, lookup.context?.sourceAddressHandle ?? lookup.scope?.sourceAddressHandle ?? null)
          : this.openSubject('scope-slot', name, lookup.slot.sourceAddressHandle),
      );
    }

    const contextShape = this.resolveReference(
      expression,
      contextType,
      `${localKey}:context:${name}`,
      CheckerExpressionTypeOpenKind.MissingContextType,
      `Context type for '${name}' had no projected type detail.`,
      this.openSubject('scope-context', name, lookup.context?.sourceAddressHandle ?? lookup.scope?.sourceAddressHandle ?? null, contextType),
    );
    if (contextShape.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return contextShape;
    }

    return this.evaluateMemberOnType(
      expression,
      contextShape.typeShape,
      name,
      `${localKey}:context-member:${name}`,
    );
  }

  private ensureProjectedSlotType(
    slot: BindingContextSlot,
    reference: CheckerTypeReference,
    localKey: string,
  ): CheckerTypeReference {
    if (reference.productHandle != null) {
      return reference;
    }

    const member = slot.targetProductHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeMember, slot.targetProductHandle);
    if (member?.carrier?.valueType == null) {
      return reference;
    }

    const sourceNode = member.carrier.declarations[0] ?? null;
    return this.projector.ensureProjection({
      localKey: `${localKey}:projected-type`,
      checker: member.carrier.checker,
      type: member.carrier.valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode,
      sourceAddressHandle: slot.sourceAddressHandle ?? member.sourceAddressHandle,
      ownerIdentityHandle: member.identityHandle,
      display: reference.display ?? member.valueType?.display ?? null,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private evaluateAccessMember(
    expression: AccessMemberExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const owner = this.evaluateNode(
      expression.object,
      scope,
      `${localKey}:owner:${expression.name.name}`,
      sourceAddressHandle,
    );
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    if (checkerTypeShapeIsDefinitelyNullish(owner.typeShape)) {
      return this.evaluateNullishAccess(
        expression,
        scope,
        `${localKey}:member:${expression.name.name}:nullish`,
        sourceAddressHandle,
        expression.optional,
        CheckerExpressionTypeOpenKind.NullishMemberAccess,
        `Member access '${expression.name.name}' reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    return this.evaluateMemberOnType(
      expression,
      owner.typeShape,
      expression.name.name,
      `${localKey}:member:${expression.name.name}`,
    );
  }

  private evaluateAccessKeyed(
    expression: AccessKeyedExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const owner = this.evaluateNode(
      expression.object,
      scope,
      `${localKey}:keyed-owner`,
      sourceAddressHandle,
    );
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    const literalKey = literalPropertyKey(expression.key);
    if (literalKey != null) {
      const literalMember = this.evaluateMemberOnType(
        expression,
        owner.typeShape,
        literalKey,
        `${localKey}:keyed-member:${literalKey}`,
      );
      if (
        literalMember.kind === CheckerExpressionTypeEvaluationResultKind.Type
        || literalMember.openKind !== CheckerExpressionTypeOpenKind.MissingMember
      ) {
        return literalMember;
      }
    }

    const key = this.evaluateNode(expression.key, scope, `${localKey}:key`, sourceAddressHandle);
    if (key.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return key;
    }

    if (checkerTypeShapeIsDefinitelyNullish(owner.typeShape)) {
      return this.evaluateNullishAccess(
        expression,
        scope,
        `${localKey}:keyed:nullish`,
        sourceAddressHandle,
        expression.optional,
        CheckerExpressionTypeOpenKind.NullishKeyedAccess,
        `Keyed access reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    const finiteKeyAccess = this.evaluateFiniteKeyedAccess(
      expression,
      owner.typeShape,
      key.typeShape,
      `${localKey}:finite-key`,
      sourceAddressHandle,
    );
    if (finiteKeyAccess != null) {
      return finiteKeyAccess;
    }

    const indexedValueType = this.typeAccess.indexedValueReferenceForKeyType(owner.typeShape, key.typeShape);
    if (indexedValueType?.productHandle != null) {
      return this.resolveReference(
        expression,
        indexedValueType,
        `${localKey}:keyed-index`,
        CheckerExpressionTypeOpenKind.MissingMemberValueType,
        `Indexed value type for '${owner.typeShape.display}' could not be hydrated.`,
      );
    }

    const indexSignature = this.evaluateIndexSignatureAccess(
      expression,
      owner.typeShape,
      key.typeShape,
      localKey,
      sourceAddressHandle,
    );
    if (indexSignature != null) {
      return indexSignature;
    }

    return this.open(
      CheckerExpressionTypeOpenKind.UnsupportedKeyedAccess,
      expression,
      'Keyed access needs literal-key or index-signature projection before it can close.',
    );
  }

  private evaluateIndexSignatureAccess(
    expression: AccessKeyedExpression,
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const valueType = this.typeAccess.indexSignatureValueType(ownerType, keyType, localKey, sourceAddressHandle);
    if (valueType == null) {
      return null;
    }
    return this.type(valueType, `Projected index-signature value type for keyed access on '${ownerType.display}'.`);
  }

  private evaluateFiniteKeyedAccess(
    expression: AccessKeyedExpression,
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const valueTypes = this.typeAccess.finiteKeyedValueTypes(ownerType, keyType, localKey);
    if (valueTypes == null) {
      return null;
    }

    return this.evaluateTypeUnion(
      valueTypes.map((valueType) => this.type(valueType, `Projected finite keyed access member for '${ownerType.display}'.`)),
      `${localKey}:result`,
      sourceAddressHandle,
      `Projected finite keyed access for '${ownerType.display}' through '${keyType.display}'.`,
    );
  }

  private evaluateCallScope(
    expression: CallScopeExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const callee = this.evaluateScopeName(
      expression,
      scope,
      expression.name.name,
      expression.ancestor,
      `${localKey}:callee:${expression.name.name}`,
    );
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
      callArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:call-scope:${expression.name.name}`,
      sourceAddressHandle,
    );
  }

  private evaluateCallGlobal(
    expression: CallGlobalExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const type = this.resolveGlobalType(scope, expression.name.name);
    if (type == null) {
      if (this.evaluationRuntimeContext.strict === false) {
        return this.projectPrimitive(expression, scope, `${localKey}:global-call:${expression.name.name}:undefined`, 'undefined', sourceAddressHandle);
      }
      return this.open(
        this.evaluationRuntimeContext.strict === true
          ? CheckerExpressionTypeOpenKind.UnsupportedCallTarget
          : CheckerExpressionTypeOpenKind.UnsupportedGlobalAccess,
        expression,
        `Global call '${expression.name.name}' could not be resolved through the active TypeChecker.`,
      );
    }
    const projected = this.projectType(expression, type.checker, type.type, `${localKey}:global-callee:${expression.name.name}`, sourceAddressHandle);
    return this.calls.evaluateCallReturn(
      expression,
      projected.typeShape,
      callArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:global-call:${expression.name.name}`,
      sourceAddressHandle,
    );
  }

  private evaluateNew(
    expression: NewExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const constructor = this.evaluateNode(
      expression.func,
      scope,
      `${localKey}:constructor`,
      sourceAddressHandle,
    );
    if (constructor.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return constructor;
    }

    return this.calls.evaluateConstructReturn(
      expression,
      constructor.typeShape,
      callArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:construct-return`,
      sourceAddressHandle,
    );
  }

  private evaluateCallMember(
    expression: CallMemberExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const owner = this.evaluateNode(
      expression.object,
      scope,
      `${localKey}:call-owner:${expression.name.name}`,
      sourceAddressHandle,
    );
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return owner;
    }
    if (checkerTypeShapeIsDefinitelyNullish(owner.typeShape)) {
      return this.evaluateNullishAccess(
        expression,
        scope,
        `${localKey}:call-member:${expression.name.name}:nullish-owner`,
        sourceAddressHandle,
        expression.optionalMember,
        CheckerExpressionTypeOpenKind.NullishMemberAccess,
        `Member call '${expression.name.name}' reached definitely nullish owner type '${owner.typeShape.display ?? 'unknown'}'.`,
        owner.typeReference,
      );
    }

    const memberType = this.evaluateMemberOnType(
      expression,
      owner.typeShape,
      expression.name.name,
      `${localKey}:call-member:${expression.name.name}`,
    );
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
      callArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:call-return:${expression.name.name}`,
      sourceAddressHandle,
    );
  }

  private evaluateCallFunction(
    expression: CallFunctionExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const callee = this.evaluateNode(
      expression.func,
      scope,
      `${localKey}:call-function`,
      sourceAddressHandle,
    );
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
      callArguments(expression.args, `${localKey}:args`),
      scope,
      `${localKey}:call-function-return`,
      sourceAddressHandle,
    );
  }

  private evaluateTaggedTemplate(
    expression: TaggedTemplateExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const tag = this.evaluateNode(
      expression.func,
      scope,
      `${localKey}:tag`,
      sourceAddressHandle,
    );
    if (tag.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return tag;
    }

    return this.calls.evaluateCallReturn(
      expression,
      tag.typeShape,
      callArguments(expression.expressions, `${localKey}:tag-args`),
      scope,
      `${localKey}:tag-return`,
      sourceAddressHandle,
    );
  }

  private evaluatePrimitiveLiteral(
    expression: PrimitiveLiteralExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const checker = this.findChecker(scope);
    if (checker == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingChecker,
        expression,
        'Primitive literal projection needs a TypeChecker from the current binding scope.',
      );
    }

    const type = primitiveType(checker, expression.value);
    return this.projectType(expression, checker, type, `${localKey}:primitive:${typeof expression.value}`, sourceAddressHandle);
  }

  private evaluateTemplate(
    expression: TemplateExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.projectPrimitive(expression, scope, `${localKey}:template`, 'string', sourceAddressHandle);
  }

  private evaluateInterpolation(
    expression: Interpolation,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.projectPrimitive(expression, scope, `${localKey}:interpolation`, 'string', sourceAddressHandle);
  }

  private evaluateArrowFunction(
    expression: ArrowFunction,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation {
    const functionScope = this.arrowFunctionScope(expression, scope, localKey, sourceAddressHandle, contextualType);
    const body = this.evaluateNode(expression.body, functionScope, `${localKey}:return`, sourceAddressHandle);
    const returnType = typeReferenceForEvaluation(body);
    return this.type(
      this.synthesis.arrowFunctionType(expression, returnType, localKey, sourceAddressHandle),
      arrowFunctionSummary(returnType),
    );
  }

  private arrowFunctionScope(
    expression: ArrowFunction,
    parentScope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null = null,
  ): BindingScope {
    return new BindingScope(
      this.store.handles.product(`type-system:arrow-scope:${localKey}`),
      this.store.handles.identity(`type-system:arrow-scope:${localKey}`),
      parentScope,
      new BindingContext(
        this.store.handles.product(`type-system:arrow-binding-context:${localKey}`),
        this.store.handles.identity(`type-system:arrow-binding-context:${localKey}`),
        BindingContextKind.Object,
        null,
        null,
        this.arrowParameterSlots(expression, parentScope, localKey, sourceAddressHandle, contextualType),
        sourceAddressHandle,
      ),
      new OverrideContext(
        this.store.handles.product(`type-system:arrow-override-context:${localKey}`),
        this.store.handles.identity(`type-system:arrow-override-context:${localKey}`),
        null,
        null,
        [],
        sourceAddressHandle,
      ),
      false,
      BindingScopeOwnerKind.SyntheticView,
      sourceAddressHandle,
    );
  }

  private arrowParameterSlots(
    expression: ArrowFunction,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): readonly BindingContextSlot[] {
    return expression.args.map((parameter, index) => new BindingContextSlot(
      parameter.name.name,
      null,
      null,
      this.arrowParameterType(expression, scope, localKey, sourceAddressHandle, parameter.name.name, index, contextualType),
      sourceAddressHandle,
    ));
  }

  private arrowParameterType(
    expression: ArrowFunction,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    name: string,
    index: number,
    contextualType: CheckerTypeReference | null,
  ): CheckerTypeReference {
    const isRest = expression.rest && index === expression.args.length - 1;
    const listenerEventType = index === 0 && !isRest
      ? scope.lookup('$event').slot?.targetType ?? null
      : null;
    if (listenerEventType != null) {
      return listenerEventType;
    }
    const contextualParameterType = !isRest
      ? this.contextualArrowParameterType(expression, contextualType, index, `${localKey}:param:${index}:${name}:context`, sourceAddressHandle)
      : null;
    if (contextualParameterType != null) {
      return contextualParameterType;
    }
    return isRest
      ? this.synthesizeArrayType(
        expression,
        scope,
        this.synthesizeUnknownType(`${localKey}:param:${index}:${name}:rest-element`, sourceAddressHandle),
        `${localKey}:param:${index}:${name}:rest-array`,
        sourceAddressHandle,
      ).toReference()
      : this.synthesizeUnknownType(`${localKey}:param:${index}:${name}`, sourceAddressHandle);
  }

  private contextualArrowParameterType(
    expression: ArrowFunction,
    contextualType: CheckerTypeReference | null,
    index: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const typeShape = this.typeShapeForReference(contextualType);
    const carrier = typeShape?.carrier;
    const signature = carrier?.type.getCallSignatures()[0] ?? null;
    const symbol = signature?.getParameters()[index] ?? null;
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? carrier?.declarations[0] ?? null;
    if (carrier == null || signature == null || symbol == null || declaration == null) {
      return null;
    }
    const parameterType = carrier.checker.getTypeOfSymbolAtLocation(symbol, declaration);
    return this.projectType(
      expression,
      carrier.checker,
      parameterType,
      localKey,
      sourceAddressHandle,
      'Projected arrow-function parameter through contextual target type.',
    ).typeReference;
  }

  private typeShapeForReference(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return reference?.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  }

  private evaluateArrayLiteral(
    expression: ArrayLiteralExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const members: CheckerSyntheticTypeMemberRequest[] = [];
    const elementTypes: CheckerTypeReference[] = [];
    const lengthType = this.projectPrimitive(expression, scope, `${localKey}:array:length`, 'number', sourceAddressHandle);
    const lengthReference = lengthType.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? lengthType.typeReference
      : null;

    if (lengthReference != null) {
      members.push({ name: 'length', valueType: lengthReference, memberKind: CheckerTypeMemberKind.Property });
    }

    expression.elements.forEach((element, index) => {
      const result = this.evaluateNode(element, scope, `${localKey}:array:${index}`, sourceAddressHandle);
      const valueType = result.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? result.typeReference
        : null;
      if (valueType != null) {
        elementTypes.push(valueType);
      }
      members.push({ name: String(index), valueType, memberKind: CheckerTypeMemberKind.Property });
    });

    const typeShape = this.synthesis.arrayLiteralType(members, elementTypes, expression.elements.length, localKey, sourceAddressHandle);
    return this.type(typeShape, 'Synthesized ArrayLiteral type shape from evaluated element expressions.');
  }

  private evaluateObjectLiteral(
    expression: ObjectLiteralExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const memberByName = new Map<string, CheckerSyntheticTypeMemberRequest>();
    expression.keys.forEach((key, index) => {
      const value = expression.values[index] ?? null;
      const result = value == null
        ? null
        : this.evaluateNode(value, scope, `${localKey}:object:${index}:${localKeyPart(String(key))}`, sourceAddressHandle);
      const valueType = result?.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? result.typeReference
        : null;
      memberByName.set(String(key), { name: String(key), valueType, memberKind: CheckerTypeMemberKind.Property });
    });
    const members = [...memberByName.values()];

    const typeShape = this.synthesis.objectLiteralType(members, localKey, sourceAddressHandle);
    return this.type(typeShape, 'Synthesized ObjectLiteral type shape from evaluated property expressions.');
  }

  private evaluateUnary(
    expression: UnaryExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    switch (expression.operation) {
      case 'typeof':
        return this.projectPrimitive(expression, scope, `${localKey}:typeof`, 'string', sourceAddressHandle);
      case '!':
        return this.projectPrimitive(expression, scope, `${localKey}:not`, 'boolean', sourceAddressHandle);
      case 'void':
        return this.projectPrimitive(expression, scope, `${localKey}:void`, 'undefined', sourceAddressHandle);
      case '+':
      case '-':
        return this.projectPrimitive(expression, scope, `${localKey}:numeric`, 'number', sourceAddressHandle);
      case '++':
      case '--':
        if (this.evaluationRuntimeContext.connectable) {
          return this.open(
            CheckerExpressionTypeOpenKind.IncrementInConnectableEvaluation,
            expression,
            `Aurelia astEvaluate rejects '${expression.operation}' while a binding connectable is collecting dependencies.`,
          );
        }
        return this.projectPrimitive(expression, scope, `${localKey}:numeric`, 'number', sourceAddressHandle);
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
        return this.projectPrimitive(expression, scope, `${localKey}:boolean`, 'boolean', sourceAddressHandle);
      case '-':
      case '*':
      case '/':
      case '%':
      case '**':
        return this.projectPrimitive(expression, scope, `${localKey}:number`, 'number', sourceAddressHandle);
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
      return this.projectPrimitive(expression, scope, `${localKey}:plus-string`, 'string', sourceAddressHandle);
    }
    if (checkerTypeShapeIsPrimitiveDisplay(left.typeShape, 'number') && checkerTypeShapeIsPrimitiveDisplay(right.typeShape, 'number')) {
      return this.projectPrimitive(expression, scope, `${localKey}:plus-number`, 'number', sourceAddressHandle);
    }

    const stringType = this.projectPrimitive(expression, scope, `${localKey}:plus-string-result-lane`, 'string', sourceAddressHandle);
    const numberType = this.projectPrimitive(expression, scope, `${localKey}:plus-number-result-lane`, 'number', sourceAddressHandle);
    if (
      stringType.kind === CheckerExpressionTypeEvaluationResultKind.Type
      && numberType.kind === CheckerExpressionTypeEvaluationResultKind.Type
    ) {
      return this.evaluateTypeUnion(
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

    return this.evaluateTypeUnion(
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
  ): CheckerExpressionTypeEvaluation {
    const yesScope = this.branchScopes.truthyScope(
      expression.condition,
      scope,
      `${localKey}:condition:truthy`,
      sourceAddressHandle,
    );
    const yes = this.evaluateNode(expression.yes, yesScope, `${localKey}:yes`, sourceAddressHandle);
    if (yes.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return yes;
    }
    const noScope = this.branchScopes.falsyScope(
      expression.condition,
      scope,
      `${localKey}:condition:falsy`,
      sourceAddressHandle,
    );
    const no = this.evaluateNode(expression.no, noScope, `${localKey}:no`, sourceAddressHandle);
    if (no.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return no;
    }
    if (yes.typeShape.checkerKey === no.typeShape.checkerKey) {
      return yes;
    }
    return this.evaluateTypeUnion(
      [yes, no],
      `${localKey}:conditional`,
      sourceAddressHandle,
      'Conditional branches resolved to different types; projected a synthetic branch union.',
    );
  }

  private evaluateTypeUnion(
    alternatives: readonly CheckerExpressionType[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    summary: string,
  ): CheckerExpressionTypeEvaluation {
    const commonReference = commonTypeReference(
      alternatives.map((alternative) => alternative.typeReference),
      alternatives.length,
    );
    if (commonReference != null) {
      return alternatives[0]!;
    }

    const typeShape = this.synthesis.unionType(
      alternatives.map((alternative) => alternative.typeShape),
      localKey,
      sourceAddressHandle,
    );
    return this.type(typeShape, summary);
  }

  private evaluateValueConverter(
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
      return this.open(
        CheckerExpressionTypeOpenKind.MissingValueConverterResource,
        expression,
        `Value converter '${expression.name.name}' was not resolved through the current compiler resource scope.`,
        inner.typeReference,
      );
    }

    if (definition.target.targetType == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.OpenValueConverter,
        expression,
        `Value converter '${definition.name}' does not carry a checker-visible target type yet.`,
        inner.typeReference,
      );
    }

    const converterType = this.resolveReference(
      expression,
      definition.target.targetType,
      `${localKey}:converter:${definition.name}`,
      CheckerExpressionTypeOpenKind.OpenValueConverter,
      `Value converter '${definition.name}' target type could not be hydrated.`,
    );
    if (converterType.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return converterType;
    }

    const toView = this.evaluateMemberOnType(
      expression,
      converterType.typeShape,
      'toView',
      `${localKey}:converter:${definition.name}:toView`,
    );
    if (toView.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return this.open(
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
        ...callArguments(expression.args, `${localKey}:converter:${definition.name}:toView-args`),
      ],
      scope,
      `${localKey}:converter:${definition.name}:toView-return`,
      sourceAddressHandle,
    );
  }

  private evaluateBindingBehavior(
    expression: BindingBehaviorExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const inner = this.evaluateValueConverterRoot(expression.expression, scope, `${localKey}:behavior:${expression.name.name}`, sourceAddressHandle);
    if (inner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return inner;
    }
    const definition = this.findBindingBehaviorDefinition(expression.name.name);
    if (definition == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingBindingBehaviorResource,
        expression,
        `Binding behavior '${expression.name.name}' was not resolved through the current compiler resource scope.`,
        inner.typeReference,
      );
    }
    if (bindingBehaviorAlreadyApplied(expression.expression, expression.name.name)) {
      return this.open(
        CheckerExpressionTypeOpenKind.DuplicateBindingBehavior,
        expression,
        `Binding behavior '${expression.name.name}' is applied more than once in this expression.`,
        inner.typeReference,
      );
    }
    return inner;
  }

  private evaluateForOfStatement(
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateValueConverterRoot(expression.iterable, scope, `${localKey}:iterable`, sourceAddressHandle);
  }

  private evaluateValueConverterRoot(
    expression: IsBindingBehavior,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(expression, scope, localKey, sourceAddressHandle);
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
      return this.open(
        CheckerExpressionTypeOpenKind.MissingContext,
        expression,
        'Binding scope lookup did not yield a context.',
      );
    }
    if (context.contextType == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingContextType,
        expression,
        `Context '${context.contextKind}' does not carry a type-system projection yet.`,
      );
    }
    return this.resolveReference(
      expression,
      context.contextType,
      localKey,
      CheckerExpressionTypeOpenKind.MissingContextType,
      `Context '${context.contextKind}' type reference could not be hydrated.`,
    );
  }

  private resolveReference(
    expression: ExpressionAstNode,
    reference: CheckerTypeReference,
    localKey: string,
    openKind: CheckerExpressionTypeOpenKind,
    openSummary: string,
    subject: CheckerExpressionTypeOpenSubject | null = null,
  ): CheckerExpressionTypeEvaluation {
    if (reference.productHandle == null) {
      return this.open(openKind, expression, openSummary, reference, subject);
    }
    const typeShape = this.typeAccess.resolveReference(reference);
    if (typeShape == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingTypeDetail,
        expression,
        openSummary,
        reference,
        subject,
      );
    }
    return this.type(typeShape, `Resolved type reference for ${localKey}.`);
  }

  private evaluateMemberOnType(
    expression: ExpressionAstNode,
    ownerType: CheckerTypeShape,
    memberName: string,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    if (ownerType.shapeKind === CheckerTypeShapeKind.Any) {
      return this.type(ownerType, `Member '${memberName}' on any remains any.`);
    }
    const member = ownerType.members.find((candidate) => candidate.name === memberName) ?? null;
    if (member == null) {
      const indexedMember = this.typeAccess.stringIndexMemberValueType(ownerType, memberName, `${localKey}:string-index`);
      if (indexedMember != null) {
        return this.type(indexedMember, `Projected string-index value type for member '${memberName}' on '${ownerType.display}'.`);
      }
      return this.open(
        CheckerExpressionTypeOpenKind.MissingMember,
        expression,
        `Type '${ownerType.display}' has no projected member '${memberName}'.`,
      );
    }

    const valueType = this.typeAccess.declaredMemberValueType(member, localKey);
    if (valueType != null) {
      return this.type(valueType, `Resolved projected value type for member '${member.name}'.`);
    }

    return this.open(
      CheckerExpressionTypeOpenKind.MissingMemberValueType,
      expression,
      `Member '${member.name}' does not carry a value type that can be projected.`,
      member.valueType,
    );
  }

  private evaluateNullishAccess(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    optional: boolean,
    openKind: CheckerExpressionTypeOpenKind.NullishMemberAccess | CheckerExpressionTypeOpenKind.NullishKeyedAccess,
    openSummary: string,
    partialTypeReference: CheckerTypeReference,
  ): CheckerExpressionTypeEvaluation {
    if (optional || this.evaluationRuntimeContext.strict === false) {
      return this.projectPrimitive(expression, scope, `${localKey}:undefined`, 'undefined', sourceAddressHandle);
    }
    return this.open(openKind, expression, openSummary, partialTypeReference);
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
      return this.projectPrimitive(expression, scope, `${localKey}:undefined`, 'undefined', sourceAddressHandle);
    }
    return this.open(CheckerExpressionTypeOpenKind.NullishCallTarget, expression, openSummary, partialTypeReference);
  }

  private evaluateIterableElementType(
    expression: ExpressionAstNode,
    iterableType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    if (iterableType.shapeKind === CheckerTypeShapeKind.Any) {
      return this.type(iterableType, `Repeat local from iterable '${iterableType.display}' remains any.`);
    }

    const checker = iterableType.carrier?.checker ?? null;
    const type = iterableType.carrier?.type ?? null;
    if (checker == null || type == null) {
      if (iterableType.iteratedValueType?.productHandle != null) {
        return this.resolveReference(
          expression,
          iterableType.iteratedValueType,
          localKey,
          CheckerExpressionTypeOpenKind.MissingIterableElementType,
          `Iterated value type for '${iterableType.display}' could not be hydrated.`,
        );
      }
      return this.open(
        CheckerExpressionTypeOpenKind.MissingChecker,
        expression,
        `Iterable type '${iterableType.display}' has no checker carrier for repeat-local projection.`,
        iterableType.toReference(),
      );
    }

    if (checkerCollectionSymbolName(type) === 'Map' || checkerCollectionSymbolName(type) === 'ReadonlyMap') {
      const mapEntryType = this.evaluateMapEntryElementType(expression, checker, type, `${localKey}:map-entry`, sourceAddressHandle);
      if (mapEntryType != null) {
        return mapEntryType;
      }
    }

    const repeatable = checkerRepeatableElementTypeInfo(checker, type);
    if (repeatable.elementType == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingIterableElementType,
        expression,
        repeatable.unsupportedConstituents > 0
          ? `Type '${iterableType.display}' does not match the built-in RepeatableHandlerResolver source categories.`
          : `Type '${iterableType.display}' is repeatable, but its repeat element type could not be represented as one TypeChecker type.`,
        iterableType.toReference(),
      );
    }

    return this.projectType(expression, checker, repeatable.elementType, `${localKey}:value`, sourceAddressHandle);
  }

  private evaluateMapEntryElementType(
    expression: ExpressionAstNode,
    checker: ts.TypeChecker,
    type: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const symbolName = checkerCollectionSymbolName(type);
    if (symbolName !== 'Map' && symbolName !== 'ReadonlyMap') {
      return null;
    }

    const [keyType, valueType] = checker.getTypeArguments(type as ts.TypeReference);
    if (keyType == null || valueType == null) {
      return null;
    }

    const keyReference = this.projectType(expression, checker, keyType, `${localKey}:key`, sourceAddressHandle).typeReference;
    const valueReference = this.projectType(expression, checker, valueType, `${localKey}:value`, sourceAddressHandle).typeReference;
    const lengthReference = this.projectType(expression, checker, checker.getNumberType(), `${localKey}:length`, sourceAddressHandle).typeReference;
    const tupleType = this.synthesis.mapEntryType(keyReference, valueReference, lengthReference, localKey, sourceAddressHandle);
    return this.type(tupleType, `Synthesized ${symbolName} repeat entry type for destructuring.`);
  }

  private synthesizeUnknownType(
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    return this.synthesis.unknownTypeReference(localKey, sourceAddressHandle);
  }

  private synthesizeArrayType(
    expression: ExpressionAstNode,
    scope: BindingScope,
    elementType: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    const lengthType = this.projectPrimitive(expression, scope, `${localKey}:length`, 'number', sourceAddressHandle);
    const lengthReference = lengthType.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? lengthType.typeReference
      : null;
    return this.synthesis.arrayType(elementType, lengthReference, localKey, sourceAddressHandle);
  }

  private projectPrimitive(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    primitive: 'string' | 'number' | 'boolean' | 'undefined',
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    const checker = this.findChecker(scope);
    if (checker == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingChecker,
        expression,
        `Primitive ${primitive} projection needs a TypeChecker from the current binding scope.`,
      );
    }
    const type = primitiveTypeByName(checker, primitive);
    return this.projectType(expression, checker, type, localKey, sourceAddressHandle);
  }

  private projectType(
    expression: ExpressionAstNode,
    checker: ts.TypeChecker,
    type: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
    summary: string = `Projected ${expression.$kind} through the TypeChecker.`,
  ): CheckerExpressionType {
    const typeShape = this.projector.ensureProjection({
      localKey,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      display: checker.typeToString(type),
    } satisfies CheckerTypeProjectionRequest);
    return this.type(typeShape, summary);
  }

  private findChecker(scope: BindingScope): ts.TypeChecker | null {
    return this.findCheckerCarrier(scope)?.checker ?? null;
  }

  private findCheckerCarrier(scope: BindingScope): CheckerLookupCarrier | null {
    let current: BindingScope | null = scope;
    while (current != null) {
      const bindingChecker = this.checkerCarrierForReference(current.bindingContext.contextType);
      if (bindingChecker != null) {
        return bindingChecker;
      }
      const overrideChecker = this.checkerCarrierForReference(current.overrideContext.contextType);
      if (overrideChecker != null) {
        return overrideChecker;
      }
      for (const slot of [...current.overrideContext.slots, ...current.bindingContext.slots]) {
        const slotChecker = this.checkerCarrierForReference(slot.targetType);
        if (slotChecker != null) {
          return slotChecker;
        }
      }
      current = current.parent;
    }
    return null;
  }

  private checkerCarrierForReference(reference: CheckerTypeReference | null): CheckerLookupCarrier | null {
    if (reference?.productHandle == null) {
      return null;
    }
    const carrier = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle)?.carrier ?? null;
    if (carrier == null) {
      return null;
    }
    return {
      checker: carrier.checker,
      location: carrier.declarations[0] ?? null,
    };
  }

  private resolveGlobalType(
    scope: BindingScope,
    name: string,
  ): { readonly checker: ts.TypeChecker; readonly type: ts.Type } | null {
    const carrier = this.findCheckerCarrier(scope);
    if (carrier == null) {
      return null;
    }
    const { checker, location } = carrier;

    switch (name) {
      case 'undefined':
        return { checker, type: checker.getUndefinedType() };
      case 'NaN':
      case 'Infinity':
        return { checker, type: checker.getNumberType() };
    }

    const scopedSymbol = location == null
      ? null
      : checker.getSymbolsInScope(location, ts.SymbolFlags.Value).find((symbol) => symbol.getName() === name) ?? null;
    const symbol = scopedSymbol ?? checker.resolveName(name, location ?? undefined, ts.SymbolFlags.Value, false);
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null;
    if (symbol != null && declaration != null) {
      return {
        checker,
        type: checker.getTypeOfSymbolAtLocation(symbol, declaration),
      };
    }

    const globalThis = checker.resolveName('globalThis', location ?? undefined, ts.SymbolFlags.Value, false);
    const globalDeclaration = globalThis?.valueDeclaration ?? globalThis?.declarations?.[0] ?? location;
    if (globalThis != null && globalDeclaration != null) {
      const globalType = checker.getTypeOfSymbolAtLocation(globalThis, globalDeclaration);
      const property = checker.getPropertyOfType(globalType, name);
      const propertyDeclaration = property?.valueDeclaration ?? property?.declarations?.[0] ?? globalDeclaration;
      if (property != null && propertyDeclaration != null) {
        return {
          checker,
          type: checker.getTypeOfSymbolAtLocation(property, propertyDeclaration),
        };
      }
    }
    return null;
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

  private type(
    typeShape: CheckerTypeShape,
    summary: string,
  ): CheckerExpressionType {
    return new CheckerExpressionType(typeShape, typeShape.toReference(), summary);
  }

  private open(
    openKind: CheckerExpressionTypeOpenKind,
    expression: ExpressionAstNode,
    summary: string,
    partialTypeReference: CheckerTypeReference | null = null,
    subject: CheckerExpressionTypeOpenSubject | null = null,
  ): CheckerExpressionTypeOpen {
    return new CheckerExpressionTypeOpen(openKind, expression.$kind, summary, partialTypeReference, subject);
  }

  private openSubject(
    subjectKind: CheckerExpressionTypeOpenSubjectKind,
    name: string | null,
    sourceAddressHandle: AddressHandle | null,
    typeReference: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeOpenSubject {
    return new CheckerExpressionTypeOpenSubject(subjectKind, name, sourceAddressHandle, typeReference);
  }
}

function callArguments(
  expressions: readonly ExpressionAstNode[],
  localKey: string,
): readonly CheckerExpressionCallArgument[] {
  return expressions.map((expression, index) => ({
    expression,
    localKey: `${localKey}:${index}`,
  }));
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

function literalPropertyKey(expression: IsAssign): string | null {
  if (expression.$kind !== 'PrimitiveLiteral') {
    return null;
  }
  if (typeof expression.value === 'string' || typeof expression.value === 'number') {
    return String(expression.value);
  }
  return null;
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

function runtimeContextualEvaluationLocalKey(
  localKey: string,
  runtimeContext: CheckerExpressionTypeEvaluationRuntimeContext,
): string {
  const connectable = runtimeContext.connectable ? ':runtime-connectable' : '';
  const strict = runtimeContext.strict == null ? '' : `:runtime-strict:${runtimeContext.strict}`;
  return connectable === '' && strict === '' ? localKey : `${localKey}${connectable}${strict}`;
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
  return expression.$kind === 'ArrowFunction' ? contextualType : null;
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

function primitiveType(
  checker: ts.TypeChecker,
  value: PrimitiveLiteralExpression['value'],
): ts.Type {
  switch (typeof value) {
    case 'string':
      return checker.getStringType();
    case 'number':
      return checker.getNumberType();
    case 'boolean':
      return checker.getBooleanType();
    case 'undefined':
      return checker.getUndefinedType();
    default:
      return checker.getNullType();
  }
}

function primitiveTypeByName(
  checker: ts.TypeChecker,
  primitive: 'string' | 'number' | 'boolean' | 'undefined',
): ts.Type {
  switch (primitive) {
    case 'string':
      return checker.getStringType();
    case 'number':
      return checker.getNumberType();
    case 'boolean':
      return checker.getBooleanType();
    case 'undefined':
      return checker.getUndefinedType();
  }
}
