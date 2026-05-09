import ts from 'typescript';
import type {
  AccessKeyedExpression,
  AccessGlobalExpression,
  AccessMemberExpression,
  AccessScopeExpression,
  AccessThisExpression,
  ArrayLiteralExpression,
  ArrowFunction,
  BindingIdentifierOrPattern,
  BindingPattern,
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
import type { ValueConverterDefinition } from '../resources/value-converter-definition.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import type { TemplateVisibleResource } from '../template/compiler-world-reference.js';
import {
  CheckerTypeProjector,
  type CheckerSyntheticTypeMemberRequest,
  type CheckerSyntheticTypeProjectionRequest,
  type CheckerTypeProjectionRequest,
} from './checker-projector.js';
import { TypeSystemProductDetails } from './product-details.js';
import {
  CheckerTypeMember,
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShape,
  CheckerTypeShapeKind,
} from './type-shape.js';

export const enum CheckerExpressionTypeEvaluationResultKind {
  Type = 'type',
  Open = 'open',
}

export const enum CheckerExpressionTypeOpenKind {
  MissingBindingScope = 'missing-binding-scope',
  MissingAncestor = 'missing-ancestor',
  MissingContext = 'missing-context',
  MissingContextType = 'missing-context-type',
  MissingSlotType = 'missing-slot-type',
  MissingTypeDetail = 'missing-type-detail',
  MissingMember = 'missing-member',
  MissingMemberValueType = 'missing-member-value-type',
  MissingIterableElementType = 'missing-iterable-element-type',
  MissingChecker = 'missing-checker',
  UnsupportedGlobalAccess = 'unsupported-global-access',
  UnsupportedKeyedAccess = 'unsupported-keyed-access',
  UnsupportedCallTarget = 'unsupported-call-target',
  UnsupportedConstruct = 'unsupported-construct',
  UnsupportedBindingPattern = 'unsupported-binding-pattern',
  UnsupportedExpression = 'unsupported-expression',
  OpenValueConverter = 'open-value-converter',
}

type CheckerLookupCarrier = {
  readonly checker: ts.TypeChecker;
  readonly location: ts.Node | null;
};

export class CheckerExpressionType {
  readonly kind = CheckerExpressionTypeEvaluationResultKind.Type;

  constructor(
    /** Projected type shape reached by the expression. */
    readonly typeShape: CheckerTypeShape,
    /** Handle-sized reference to the projected type. */
    readonly typeReference: CheckerTypeReference,
    /** Compact explanation of the route used to reach the type. */
    readonly summary: string,
  ) {}
}

export class CheckerExpressionTypeOpen {
  readonly kind = CheckerExpressionTypeEvaluationResultKind.Open;

  constructor(
    /** Why the evaluator could not honestly close the type. */
    readonly openKind: CheckerExpressionTypeOpenKind,
    /** AST kind that produced or exposed the open result. */
    readonly expressionKind: ExpressionAstNode['$kind'],
    /** Compact explanation for inquiry answers or tooling projection. */
    readonly summary: string,
    /** Partial type reference, when the evaluator reached one but could not hydrate/project it. */
    readonly partialTypeReference: CheckerTypeReference | null = null,
  ) {}
}

export type CheckerExpressionTypeEvaluation =
  | CheckerExpressionType
  | CheckerExpressionTypeOpen;

export class CheckerBindingPatternLocalType {
  constructor(
    /** Runtime binding-context name introduced by the pattern. */
    readonly name: string,
    /** Type reached by the pattern path, when checker projection could close it. */
    readonly typeReference: CheckerTypeReference | null,
  ) {}
}

/**
 * Runtime-shaped TypeChecker evaluator for Aurelia expression AST.
 *
 * This walks the same expression families as runtime `astEvaluate`, but it produces static type-system projections
 * instead of runtime values. The evaluator spends the modeled runtime `Scope` for Aurelia name lookup and uses hot
 * checker carriers or synthetic expression shapes for member, call-return, and primitive projections.
 */
export class CheckerExpressionTypeEvaluator {
  constructor(
    readonly store: KernelStore,
    readonly projector: CheckerTypeProjector,
    /** Compiler resource scope visible at this expression site, when template compilation supplied one. */
    readonly resourceScope: TemplateResourceScope | null = null,
  ) {}

  evaluateWithScope(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    return this.evaluateNode(expression, scope, localKey, sourceAddressHandle);
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
  ): CheckerExpressionTypeEvaluation | readonly CheckerBindingPatternLocalType[] {
    const element = this.evaluateIteratorElement(expression, scope, localKey, sourceAddressHandle);
    if (element.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return element;
    }
    return this.localTypesForBindingPattern(
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
        return this.evaluateNode(expression.expression, scope, `${localKey}:paren`, sourceAddressHandle);
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
        return this.evaluateNode(expression.value, scope, `${localKey}:assign-value`, sourceAddressHandle);
      case 'ArrowFunction':
        return this.evaluateArrowFunction(expression, scope, localKey, sourceAddressHandle);
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
      );
    }

    const contextShape = this.resolveReference(
      expression,
      contextType,
      `${localKey}:context:${name}`,
      CheckerExpressionTypeOpenKind.MissingContextType,
      `Context type for '${name}' had no projected type detail.`,
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

    if (owner.typeShape.indexedValueType != null) {
      return this.resolveReference(
        expression,
        owner.typeShape.indexedValueType,
        `${localKey}:keyed-index`,
        CheckerExpressionTypeOpenKind.MissingMemberValueType,
        `Indexed value type for '${owner.typeShape.display}' could not be hydrated.`,
      );
    }

    const indexSignature = this.evaluateIndexSignatureAccess(
      expression,
      owner.typeShape,
      scope,
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
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const checker = ownerType.carrier?.checker ?? null;
    const type = ownerType.carrier?.type ?? null;
    if (checker == null || type == null) {
      return null;
    }

    const key = this.evaluateNode(expression.key, scope, `${localKey}:key`, sourceAddressHandle);
    if (key.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return key;
    }

    const indexKind = indexKindForKeyType(key.typeShape);
    if (indexKind == null) {
      return null;
    }

    const valueType = checker.getIndexTypeOfType(type, indexKind);
    if (valueType == null) {
      return null;
    }

    return this.projectType(expression, checker, valueType, `${localKey}:index:${indexKind}`, sourceAddressHandle);
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

    return this.evaluateCallReturn(expression, callee.typeShape, `${localKey}:call-scope:${expression.name.name}`, sourceAddressHandle);
  }

  private evaluateCallGlobal(
    expression: CallGlobalExpression,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    const type = this.resolveGlobalType(scope, expression.name.name);
    if (type == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.UnsupportedGlobalAccess,
        expression,
        `Global call '${expression.name.name}' could not be resolved through the active TypeChecker.`,
      );
    }
    const projected = this.projectType(expression, type.checker, type.type, `${localKey}:global-callee:${expression.name.name}`, sourceAddressHandle);
    return this.evaluateCallReturn(expression, projected.typeShape, `${localKey}:global-call:${expression.name.name}`, sourceAddressHandle);
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

    return this.evaluateConstructReturn(expression, constructor.typeShape, `${localKey}:construct-return`, sourceAddressHandle);
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

    const memberType = this.evaluateMemberOnType(
      expression,
      owner.typeShape,
      expression.name.name,
      `${localKey}:call-member:${expression.name.name}`,
    );
    if (memberType.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return memberType;
    }

    return this.evaluateCallReturn(expression, memberType.typeShape, `${localKey}:call-return:${expression.name.name}`, sourceAddressHandle);
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

    return this.evaluateCallReturn(expression, callee.typeShape, `${localKey}:call-function-return`, sourceAddressHandle);
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

    return this.evaluateCallReturn(expression, tag.typeShape, `${localKey}:tag-return`, sourceAddressHandle);
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
  ): CheckerExpressionTypeEvaluation {
    const functionScope = this.arrowFunctionScope(expression, scope, localKey, sourceAddressHandle);
    const body = this.evaluateNode(expression.body, functionScope, `${localKey}:return`, sourceAddressHandle);
    const returnType = typeReferenceForEvaluation(body);
    return this.type(
      this.projectArrowFunctionType(expression, returnType, localKey, sourceAddressHandle),
      arrowFunctionSummary(returnType),
    );
  }

  private arrowFunctionScope(
    expression: ArrowFunction,
    parentScope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
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
        this.arrowParameterSlots(expression, parentScope, localKey, sourceAddressHandle),
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
  ): readonly BindingContextSlot[] {
    return expression.args.map((parameter, index) => new BindingContextSlot(
      parameter.name.name,
      null,
      null,
      this.arrowParameterType(expression, scope, localKey, sourceAddressHandle, parameter.name.name, index),
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
  ): CheckerTypeReference {
    const isRest = expression.rest && index === expression.args.length - 1;
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

  private projectArrowFunctionType(
    expression: ArrowFunction,
    returnType: CheckerTypeReference | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:arrow-function`,
      shapeKind: CheckerTypeShapeKind.Function,
      display: displayArrowFunctionType(expression, returnType),
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
      callReturnType: returnType,
    } satisfies CheckerSyntheticTypeProjectionRequest);
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

    const commonElementType = commonTypeReference(elementTypes, expression.elements.length);
    const typeShape = this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:array-literal`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: displayArrayLiteralType(commonElementType, expression.elements.length),
      members,
      indexedValueType: commonElementType,
      iteratedValueType: commonElementType,
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest);
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
        : this.evaluateNode(value, scope, `${localKey}:object:${index}:${encodeLocalPart(String(key))}`, sourceAddressHandle);
      const valueType = result?.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? result.typeReference
        : null;
      memberByName.set(String(key), { name: String(key), valueType, memberKind: CheckerTypeMemberKind.Property });
    });
    const members = [...memberByName.values()];

    const typeShape = this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:object-literal`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: displayObjectLiteralType(members),
      members,
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest);
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
      case '++':
      case '--':
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

    if (isPrimitiveTypeDisplay(left.typeShape, 'string') || isPrimitiveTypeDisplay(right.typeShape, 'string')) {
      return this.projectPrimitive(expression, scope, `${localKey}:plus-string`, 'string', sourceAddressHandle);
    }
    if (isPrimitiveTypeDisplay(left.typeShape, 'number') && isPrimitiveTypeDisplay(right.typeShape, 'number')) {
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
    const right = this.evaluateNode(expression.right, scope, `${localKey}:right`, sourceAddressHandle);
    if (right.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return right;
    }
    if (sameTypeReference(left.typeReference, right.typeReference)) {
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
    const yes = this.evaluateNode(expression.yes, scope, `${localKey}:yes`, sourceAddressHandle);
    if (yes.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return yes;
    }
    const no = this.evaluateNode(expression.no, scope, `${localKey}:no`, sourceAddressHandle);
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

    const shapes = alternatives.map((alternative) => alternative.typeShape);
    const typeShape = this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:union`,
      shapeKind: CheckerTypeShapeKind.Union,
      display: displayUnionType(shapes),
      members: commonMembersForUnion(shapes),
      indexedValueType: commonNullableTypeReference(shapes.map((shape) => shape.indexedValueType)),
      iteratedValueType: commonNullableTypeReference(shapes.map((shape) => shape.iteratedValueType)),
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
      callReturnType: commonNullableTypeReference(shapes.map((shape) => shape.callReturnType)),
      constructReturnType: commonNullableTypeReference(shapes.map((shape) => shape.constructReturnType)),
    } satisfies CheckerSyntheticTypeProjectionRequest);
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
        CheckerExpressionTypeOpenKind.OpenValueConverter,
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

    return this.evaluateCallReturn(
      expression,
      toView.typeShape,
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
    return this.evaluateValueConverterRoot(expression.expression, scope, `${localKey}:behavior:${expression.name.name}`, sourceAddressHandle);
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
  ): CheckerExpressionTypeEvaluation {
    if (reference.productHandle == null) {
      return this.open(openKind, expression, openSummary, reference);
    }
    const typeShape = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
    if (typeShape == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingTypeDetail,
        expression,
        openSummary,
        reference,
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
      return this.open(
        CheckerExpressionTypeOpenKind.MissingMember,
        expression,
        `Type '${ownerType.display}' has no projected member '${memberName}'.`,
      );
    }

    return this.evaluateMemberValueType(expression, member, localKey);
  }

  private evaluateMemberValueType(
    expression: ExpressionAstNode,
    member: CheckerTypeMember,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    if (member.valueType?.productHandle != null) {
      const existing = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, member.valueType.productHandle);
      if (existing != null) {
        return this.type(existing, `Resolved projected value type for member '${member.name}'.`);
      }
    }

    if (member.carrier?.valueType != null) {
      const sourceNode = member.carrier.declarations[0] ?? null;
      const typeShape = this.projector.ensureProjection({
        localKey: `${localKey}:value`,
        checker: member.carrier.checker,
        type: member.carrier.valueType,
        origin: CheckerTypeProjectionOrigin.TypeChecker,
        sourceNode,
        sourceAddressHandle: member.sourceAddressHandle,
        ownerIdentityHandle: member.identityHandle,
        display: member.valueType?.display ?? null,
      } satisfies CheckerTypeProjectionRequest);
      return this.type(typeShape, `Projected value type for member '${member.name}'.`);
    }

    return this.open(
      CheckerExpressionTypeOpenKind.MissingMemberValueType,
      expression,
      `Member '${member.name}' does not carry a value type that can be projected.`,
      member.valueType,
    );
  }

  private evaluateCallReturn(
    expression: ExpressionAstNode,
    calleeType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    if (calleeType.shapeKind === CheckerTypeShapeKind.Any) {
      return this.type(calleeType, 'Calling any remains any.');
    }
    if (calleeType.callReturnType?.productHandle != null) {
      return this.resolveReference(
        expression,
        calleeType.callReturnType,
        `${localKey}:synthetic-return`,
        CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        `Call target '${calleeType.display}' carries a return reference that could not be hydrated.`,
      );
    }

    const type = calleeType.carrier?.type ?? null;
    const checker = calleeType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return this.open(
        calleeType.callReturnType == null
          ? CheckerExpressionTypeOpenKind.MissingChecker
          : CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        expression,
        calleeType.callReturnType == null
          ? `Call target '${calleeType.display}' has no checker carrier for signature projection.`
          : `Call target '${calleeType.display}' has a return type reference without a hydrated product.`,
        calleeType.callReturnType ?? calleeType.toReference(),
      );
    }

    const signatures = type.getCallSignatures();
    if (signatures.length === 0) {
      return this.open(
        CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        expression,
        `Type '${calleeType.display}' has no call signature to project.`,
        calleeType.toReference(),
      );
    }

    const returns = signatures.map((signature, index) =>
      this.projectType(
        expression,
        checker,
        checker.getReturnTypeOfSignature(signature),
        `${localKey}:return:${index}`,
        sourceAddressHandle,
      )
    );
    return this.evaluateTypeUnion(
      returns,
      `${localKey}:return`,
      sourceAddressHandle,
      `Projected call return type for '${calleeType.display}'.`,
    );
  }

  private evaluateConstructReturn(
    expression: ExpressionAstNode,
    constructorType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    if (constructorType.constructReturnType?.productHandle != null) {
      return this.resolveReference(
        expression,
        constructorType.constructReturnType,
        `${localKey}:synthetic-construct-return`,
        CheckerExpressionTypeOpenKind.UnsupportedConstruct,
        `Construct target '${constructorType.display}' carries an instance reference that could not be hydrated.`,
      );
    }

    const type = constructorType.carrier?.type ?? null;
    const checker = constructorType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return this.open(
        constructorType.constructReturnType == null
          ? CheckerExpressionTypeOpenKind.MissingChecker
          : CheckerExpressionTypeOpenKind.UnsupportedConstruct,
        expression,
        constructorType.constructReturnType == null
          ? `Construct target '${constructorType.display}' has no checker carrier for construct-signature projection.`
          : `Construct target '${constructorType.display}' has an instance type reference without a hydrated product.`,
        constructorType.constructReturnType ?? constructorType.toReference(),
      );
    }

    const signatures = type.getConstructSignatures();
    if (signatures.length === 0) {
      return this.open(
        CheckerExpressionTypeOpenKind.UnsupportedConstruct,
        expression,
        `Type '${constructorType.display}' has no construct signature to project.`,
        constructorType.toReference(),
      );
    }

    const returns = signatures.map((signature, index) =>
      this.projectType(
        expression,
        checker,
        checker.getReturnTypeOfSignature(signature),
        `${localKey}:return:${index}`,
        sourceAddressHandle,
      )
    );
    return this.evaluateTypeUnion(
      returns,
      `${localKey}:construct-return`,
      sourceAddressHandle,
      `Projected construct return type for '${constructorType.display}'.`,
    );
  }

  private evaluateIterableElementType(
    expression: ExpressionAstNode,
    iterableType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    if (iterableType.iteratedValueType != null) {
      return this.resolveReference(
        expression,
        iterableType.iteratedValueType,
        localKey,
        CheckerExpressionTypeOpenKind.MissingIterableElementType,
        `Iterated value type for '${iterableType.display}' could not be hydrated.`,
      );
    }

    const checker = iterableType.carrier?.checker ?? null;
    const type = iterableType.carrier?.type ?? null;
    if (checker == null || type == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingChecker,
        expression,
        `Iterable type '${iterableType.display}' has no checker carrier for repeat-local projection.`,
        iterableType.toReference(),
      );
    }

    const mapEntryType = this.evaluateMapEntryElementType(expression, checker, type, `${localKey}:map-entry`, sourceAddressHandle);
    if (mapEntryType != null) {
      return mapEntryType;
    }

    const elementType = iterableElementType(checker, type);
    if (elementType == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingIterableElementType,
        expression,
        `Type '${iterableType.display}' did not expose an array-like, map/set-like, or numeric repeat element type.`,
        iterableType.toReference(),
      );
    }

    return this.projectType(expression, checker, elementType, `${localKey}:value`, sourceAddressHandle);
  }

  private evaluateMapEntryElementType(
    expression: ExpressionAstNode,
    checker: ts.TypeChecker,
    type: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const symbolName = collectionSymbolName(type);
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
    const indexedValueType = sameTypeReference(keyReference, valueReference)
      ? keyReference
      : null;
    const tupleType = this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:tuple`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: `[${keyReference.display ?? 'unknown'}, ${valueReference.display ?? 'unknown'}]`,
      members: [
        { name: '0', valueType: keyReference, memberKind: CheckerTypeMemberKind.Property },
        { name: '1', valueType: valueReference, memberKind: CheckerTypeMemberKind.Property },
        { name: 'length', valueType: lengthReference, memberKind: CheckerTypeMemberKind.Property },
      ],
      indexedValueType,
      iteratedValueType: indexedValueType,
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest);
    return this.type(tupleType, `Synthesized ${symbolName} repeat entry type for destructuring.`);
  }

  private localTypesForBindingPattern(
    pattern: BindingIdentifierOrPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerBindingPatternLocalType[] {
    return this.localTypesForPattern(pattern, sourceType, localKey, sourceAddressHandle);
  }

  private localTypesForPattern(
    pattern: BindingPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerBindingPatternLocalType[] {
    switch (pattern.$kind) {
      case 'BindingIdentifier':
        return [
          new CheckerBindingPatternLocalType(
            pattern.name.name,
            sourceType?.toReference() ?? null,
          ),
        ];
      case 'BindingPatternDefault':
        return this.localTypesForPattern(pattern.target, sourceType, `${localKey}:default`, sourceAddressHandle);
      case 'BindingPatternHole':
        return [];
      case 'ArrayBindingPattern': {
        const locals: CheckerBindingPatternLocalType[] = [];
        pattern.elements.forEach((element, index) => {
          const elementType = sourceType == null
            ? null
            : this.typeForArrayPatternElement(element, sourceType, index, `${localKey}:array:${index}`, sourceAddressHandle);
          locals.push(...this.localTypesForPattern(element, elementType, `${localKey}:array:${index}`, sourceAddressHandle));
        });
        if (pattern.rest != null) {
          locals.push(...this.localTypesForPattern(pattern.rest, null, `${localKey}:array:rest`, sourceAddressHandle));
        }
        return locals;
      }
      case 'ObjectBindingPattern': {
        const locals: CheckerBindingPatternLocalType[] = [];
        pattern.properties.forEach((property, index) => {
          const propertyType = sourceType == null
            ? null
            : this.typeForObjectPatternProperty(property.value, sourceType, String(property.key), `${localKey}:object:${encodeLocalPart(String(property.key))}:${index}`);
          locals.push(...this.localTypesForPattern(
            property.value,
            propertyType,
            `${localKey}:object:${encodeLocalPart(String(property.key))}:${index}`,
            sourceAddressHandle,
          ));
        });
        if (pattern.rest != null) {
          locals.push(...this.localTypesForPattern(pattern.rest, null, `${localKey}:object:rest`, sourceAddressHandle));
        }
        return locals;
      }
    }
  }

  private typeForArrayPatternElement(
    expression: ExpressionAstNode,
    sourceType: CheckerTypeShape,
    index: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape | null {
    const indexedMember = this.evaluateMemberOnType(expression, sourceType, String(index), `${localKey}:member`);
    if (indexedMember.kind === CheckerExpressionTypeEvaluationResultKind.Type) {
      return indexedMember.typeShape;
    }

    if (sourceType.indexedValueType != null) {
      const indexed = this.resolveReference(
        expression,
        sourceType.indexedValueType,
        `${localKey}:indexed`,
        CheckerExpressionTypeOpenKind.MissingMemberValueType,
        `Indexed value type for '${sourceType.display}' could not be hydrated while projecting an array binding pattern.`,
      );
      return indexed.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? indexed.typeShape
        : null;
    }

    const checker = sourceType.carrier?.checker ?? null;
    const type = sourceType.carrier?.type ?? null;
    const property = checker == null || type == null
      ? null
      : checker.getPropertyOfType(type, String(index));
    const propertyDeclaration = property?.valueDeclaration ?? property?.declarations?.[0] ?? null;
    const indexType = checker == null || type == null
      ? null
      : property != null && propertyDeclaration != null
        ? checker.getTypeOfSymbolAtLocation(property, propertyDeclaration)
        : checker.getIndexTypeOfType(type, ts.IndexKind.Number);
    if (checker == null || indexType == null) {
      return null;
    }

    return this.projectType(expression, checker, indexType, `${localKey}:checker-index`, sourceAddressHandle).typeShape;
  }

  private typeForObjectPatternProperty(
    expression: ExpressionAstNode,
    sourceType: CheckerTypeShape,
    propertyName: string,
    localKey: string,
  ): CheckerTypeShape | null {
    const member = this.evaluateMemberOnType(expression, sourceType, propertyName, `${localKey}:member`);
    return member.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? member.typeShape
      : null;
  }

  private synthesizeUnknownType(
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:unknown`,
      shapeKind: CheckerTypeShapeKind.Unknown,
      display: 'unknown',
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest).toReference();
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
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:array`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: `Array<${elementType.display ?? 'unknown'}>`,
      members: [
        { name: 'length', valueType: lengthReference, memberKind: CheckerTypeMemberKind.Property },
      ],
      indexedValueType: elementType,
      iteratedValueType: elementType,
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest);
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
  ): CheckerExpressionType {
    const typeShape = this.projector.ensureProjection({
      localKey,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      display: checker.typeToString(type),
    } satisfies CheckerTypeProjectionRequest);
    return this.type(typeShape, `Projected ${expression.$kind} through the TypeChecker.`);
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
  ): CheckerExpressionTypeOpen {
    return new CheckerExpressionTypeOpen(openKind, expression.$kind, summary, partialTypeReference);
  }
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

function commonTypeReference(
  references: readonly CheckerTypeReference[],
  expectedCount: number,
): CheckerTypeReference | null {
  if (references.length !== expectedCount || references.length === 0) {
    return null;
  }
  const first = references[0] ?? null;
  if (first == null) {
    return null;
  }
  return references.every((reference) => reference.checkerKey === first.checkerKey && reference.display === first.display)
    ? first
    : null;
}

function sameTypeReference(
  left: CheckerTypeReference,
  right: CheckerTypeReference,
): boolean {
  return left.checkerKey === right.checkerKey && left.display === right.display;
}

function commonNullableTypeReference(
  references: readonly (CheckerTypeReference | null)[],
): CheckerTypeReference | null {
  if (references.some((reference) => reference == null)) {
    return null;
  }
  return commonTypeReference(references as readonly CheckerTypeReference[], references.length);
}

function commonMembersForUnion(
  shapes: readonly CheckerTypeShape[],
): readonly CheckerSyntheticTypeMemberRequest[] {
  const [first, ...rest] = shapes;
  if (first == null) {
    return [];
  }

  const members: CheckerSyntheticTypeMemberRequest[] = [];
  for (const member of first.members) {
    const matches = rest.map((shape) => shape.members.find((candidate) => candidate.name === member.name) ?? null);
    if (matches.some((candidate) => candidate == null)) {
      continue;
    }
    const allMembers = [member, ...(matches as CheckerTypeMember[])];
    members.push({
      name: member.name,
      valueType: commonNullableTypeReference(allMembers.map((candidate) => candidate.valueType)),
      memberKind: allMembers.every((candidate) => candidate.memberKind === member.memberKind)
        ? member.memberKind
        : CheckerTypeMemberKind.Unknown,
      isOptional: allMembers.some((candidate) => candidate.isOptional),
      isReadonly: allMembers.every((candidate) => candidate.isReadonly),
      sourceAddressHandle: commonAddressHandle(allMembers.map((candidate) => candidate.sourceAddressHandle)),
    });
  }
  return members;
}

function commonAddressHandle(
  handles: readonly (AddressHandle | null)[],
): AddressHandle | null {
  const [first, ...rest] = handles;
  if (first == null) {
    return null;
  }
  return rest.every((handle) => handle === first)
    ? first
    : null;
}

function isPrimitiveTypeDisplay(
  typeShape: CheckerTypeShape,
  primitive: 'string' | 'number' | 'boolean' | 'undefined',
): boolean {
  return typeShape.shapeKind === CheckerTypeShapeKind.Primitive && typeShape.display === primitive;
}

function indexKindForKeyType(typeShape: CheckerTypeShape): ts.IndexKind | null {
  if (isPrimitiveTypeDisplay(typeShape, 'number')) {
    return ts.IndexKind.Number;
  }
  if (isPrimitiveTypeDisplay(typeShape, 'string')) {
    return ts.IndexKind.String;
  }
  return null;
}

function displayArrayLiteralType(
  elementType: CheckerTypeReference | null,
  elementCount: number,
): string {
  if (elementType != null) {
    return `Array<${elementType.display ?? elementType.checkerKey ?? 'unknown'}>`;
  }
  return elementCount === 0 ? 'Array<unknown>' : 'Array<mixed>';
}

function displayObjectLiteralType(members: readonly CheckerSyntheticTypeMemberRequest[]): string {
  if (members.length === 0) {
    return '{}';
  }
  return `{ ${members.map((member) => `${member.name}: ${member.valueType?.display ?? 'unknown'}`).join('; ')} }`;
}

function displayUnionType(shapes: readonly CheckerTypeShape[]): string {
  const displays = [...new Set(shapes.map((shape) => shape.display))];
  return displays.join(' | ');
}

function displayArrowFunctionType(
  expression: ArrowFunction,
  returnType: CheckerTypeReference | null,
): string {
  const parameters = expression.args.map((arg, index) => {
    const isRest = expression.rest && index === expression.args.length - 1;
    return `${isRest ? '...' : ''}${arg.name.name}: unknown`;
  }).join(', ');
  return `(${parameters}) => ${returnType?.display ?? 'unknown'}`;
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

function encodeLocalPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_$.-]+/g, '_');
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

function iterableElementType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  if ((type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) !== 0) {
    return checker.getNumberType();
  }

  const numberIndexType = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
  if (numberIndexType != null) {
    return numberIndexType;
  }

  const symbolName = collectionSymbolName(type);
  if (symbolName === 'Set' || symbolName === 'ReadonlySet') {
    return checker.getTypeArguments(type as ts.TypeReference)[0] ?? null;
  }
  return null;
}

function collectionSymbolName(type: ts.Type): string | null {
  return type.symbol?.getName() ?? type.aliasSymbol?.getName() ?? null;
}
