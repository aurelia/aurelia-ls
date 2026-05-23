import ts from 'typescript';
import {
  BindingScope,
  BindingScopeLocatedLookup,
  BindingScopeLookupKind,
  type BindingScopeContext,
  type BindingContextSlot,
} from '../configuration/scope.js';
import type {
  AccessBoundaryExpression,
  ArrayLiteralExpression,
  AccessMemberExpression,
  AccessKeyedExpression,
  AccessScopeExpression,
  AccessThisExpression,
  BinaryExpression,
  BinaryOperator,
  CallFunctionExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  ExpressionAstNode,
  Interpolation,
  NewExpression,
  ObjectLiteralExpression,
  TaggedTemplateExpression,
  TemplateExpression,
  UnaryExpression,
} from '../expression/ast.js';
import {
  openSeamReasonKindForEvaluationBoundary,
} from '../evaluation/boundary-open-reason.js';
import {
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  evaluateStaticBinaryOperation,
  type StaticBinaryOperation,
} from '../evaluation/operators.js';
import { representativeEvaluationValues } from '../evaluation/representative-values.js';
import {
  EvaluationBoundaryValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationStringPatternBuilder,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  appendEvaluationStringLikePart,
  evaluationPrimitiveValueFromExpressionValue,
  evaluationStringPatternFromConcatenation,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  EvaluationBooleanValue,
  type EvaluationClassValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { KernelStore } from '../kernel/store.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { Container } from '../di/container.js';
import {
  TypeSystemHotDetails,
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import {
  CheckerTypeMember,
} from '../type-system/type-shape.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  TemplateProductDetails,
} from '../template/product-details.js';
import {
  runtimeAcceptedBindingExpressionAstForParse,
} from '../template/expression-parse-projection.js';
import {
  PropertyBinding,
} from '../template/runtime-binding.js';
import { RuntimeBindingSourceEvaluationFrame } from './binding-source-evaluation-frame.js';
import type { RuntimeBindingSourceActivationContext } from './binding-source-activation-context.js';
import {
  RuntimeBoundControllerValueTable,
  type RuntimeBoundControllerPropertyValue,
} from './runtime-bound-controller-value.js';

export const enum RuntimeBindingSourceValueEvaluationKind {
  Value = 'value',
  Open = 'open',
}

export class RuntimeBindingSourceValueEvaluation {
  constructor(
    readonly kind: RuntimeBindingSourceValueEvaluationKind,
    readonly value: EvaluationValue | null,
    readonly openReason: string | null,
    readonly openReasonKinds: readonly OpenSeamReasonKind[] = [],
  ) {}

  static value(value: EvaluationValue): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(RuntimeBindingSourceValueEvaluationKind.Value, value, null);
  }

  static open(
    reason: string,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(
      RuntimeBindingSourceValueEvaluationKind.Open,
      null,
      reason,
      compactOpenReasonKinds(reasonKinds),
    );
  }
}

/**
 * Evaluates Aurelia binding-source expressions against modeled runtime Scope plus the static ECMAScript evaluator.
 *
 * This is intentionally binding-owned substrate. Consumers such as router resources can ask whether a binding source
 * carries a static value, but source lookup, view-model member access, and getter execution stay with the binding flow.
 */
export class RuntimeBindingSourceValueEvaluator {
  private readonly evaluationFrame: RuntimeBindingSourceEvaluationFrame;
  private readonly activeBoundControllerReads = new Set<string>();
  private activeContainer: Container | null;

  constructor(
    readonly store: KernelStore,
    readonly evaluation: StaticProjectEvaluationResult,
    readonly boundControllerValues: RuntimeBoundControllerValueTable = RuntimeBoundControllerValueTable.empty,
    readonly activationContext: RuntimeBindingSourceActivationContext | null = null,
    defaultActiveContainer: Container | null = null,
  ) {
    this.activeContainer = defaultActiveContainer;
    this.evaluationFrame = new RuntimeBindingSourceEvaluationFrame(
      evaluation,
      activationContext,
      () => this.activeContainer,
    );
  }

  evaluate(
    expression: ExpressionAstNode,
    scope: BindingScope,
    activeContainer?: Container | null,
  ): RuntimeBindingSourceValueEvaluation {
    return activeContainer === undefined
      ? this.evaluateNode(expression, scope)
      : this.withActiveContainer(activeContainer, () => this.evaluateNode(expression, scope));
  }

  withActiveContainer<TValue>(
    activeContainer: Container | null,
    read: () => TValue,
  ): TValue {
    const previous = this.activeContainer;
    this.activeContainer = activeContainer;
    try {
      return read();
    } finally {
      this.activeContainer = previous;
    }
  }

  private evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    switch (expression.$kind) {
      case 'PrimitiveLiteral':
        return RuntimeBindingSourceValueEvaluation.value(evaluationPrimitiveValueFromExpressionValue(expression.value));
      case 'AccessScope':
        return this.evaluateAccessScope(expression, scope);
      case 'AccessThis':
        return this.evaluateAccessThis(expression, scope);
      case 'AccessBoundary':
        return this.evaluateAccessBoundary(expression, scope);
      case 'AccessMember':
        return this.evaluateAccessMember(expression, scope);
      case 'AccessKeyed':
        return this.evaluateAccessKeyed(expression, scope);
      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(expression, scope);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteral(expression, scope);
      case 'New':
        return this.evaluateNew(expression, scope);
      case 'CallScope':
        return this.evaluateCallScope(expression, scope);
      case 'CallMember':
        return this.evaluateCallMember(expression, scope);
      case 'CallFunction':
        return this.evaluateCallFunction(expression, scope);
      case 'TaggedTemplate':
        return this.evaluateTaggedTemplate(expression, scope);
      case 'Paren':
      case 'BindingBehavior':
        return this.evaluateNode(expression.expression, scope);
      case 'ValueConverter':
        return openUnsupportedExpression(`Value converter '${expression.name.name}' is not statically evaluated by binding-source value flow.`);
      case 'Template':
        return this.evaluateTemplate(expression, scope);
      case 'Interpolation':
        return this.evaluateInterpolation(expression, scope);
      case 'Binary':
        return this.evaluateBinary(expression, scope);
      case 'Unary':
        return this.evaluateUnary(expression, scope);
      case 'Conditional':
        return this.evaluateConditional(expression, scope);
      default:
        return openUnsupportedExpression(`Expression kind '${expression.$kind}' is not in the binding-source value evaluator set.`);
    }
  }

  private evaluateAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateScopeName(expression.name.name, expression.ancestor, scope);
  }

  private evaluateAccessThis(
    expression: AccessThisExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateContextObjectForLookup(
      scope.locateThis(expression.ancestor),
      `$this ancestor ${expression.ancestor}`,
    );
  }

  private evaluateAccessBoundary(
    _expression: AccessBoundaryExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const boundary = this.boundaryScope(scope);
    if (boundary == null) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    return this.evaluateContextObject(
      boundary,
      boundary.bindingContext,
      'boundary binding context',
    );
  }

  private evaluateScopeName(
    name: string,
    ancestor: number,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const lookup = scope.locate(name, ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return openSlotNoStaticValue(`Could not resolve ancestor ${ancestor} for '${name}'.`);
    }
    if (lookup.slot == null) {
      return openSlotNoStaticValue(`Scope lookup for '${name}' did not expose a TypeChecker member slot.`);
    }
    const bound = lookup.lookupKind === BindingScopeLookupKind.BindingContext
      ? this.evaluateBoundControllerValue(lookup.scope, lookup.slot.name)
      : null;
    return bound ?? this.evaluateSlot(lookup.slot, lookup.scope);
  }

  private evaluateBoundControllerValue(
    scope: BindingScope | null,
    propertyName: string,
  ): RuntimeBindingSourceValueEvaluation | null {
    const bound = this.boundControllerValues.read(
      scope?.bindingContext.ownerProductHandle ?? null,
      propertyName,
      scope?.bindingContext.contextType ?? null,
    );
    if (bound == null) {
      return null;
    }
    const key = `${bound.controllerProductHandle}:${propertyName}:${bound.bindingProductHandle}`;
    if (this.activeBoundControllerReads.has(key)) {
      return openNeedsRuntimeValue(`Bound controller property '${propertyName}' recursively depends on itself.`);
    }
    if (bound.sourceScope == null) {
      return openSlotNoStaticValue(`Bound controller property '${propertyName}' did not retain its parent binding Scope.`);
    }
    const expression = bindingExpressionAstForProduct(this.store, bound.expressionProductHandle);
    if (expression == null) {
      return openSlotNoStaticValue(`Bound controller property '${propertyName}' did not retain a runtime-accepted binding expression.`);
    }
    this.activeBoundControllerReads.add(key);
    try {
      return this.evaluateNode(expression, bound.sourceScope);
    } finally {
      this.activeBoundControllerReads.delete(key);
    }
  }

  private evaluateAccessMember(
    expression: AccessMemberExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const contextMember = this.evaluateContextMemberForOwner(
      expression.object,
      expression.name.name,
      scope,
    );
    if (contextMember != null) {
      return contextMember;
    }

    const owner = this.evaluateNode(expression.object, scope);
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? `Owner for member '${expression.name.name}' did not close.`,
        owner.openReasonKinds,
      );
    }
    if (expression.optional && isNullishValue(owner.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    const localValue = localPropertyValue(owner.value, expression.name.name);
    if (localValue != null) {
      return RuntimeBindingSourceValueEvaluation.value(localValue);
    }
    const source = this.evaluationFrame.sourceForValue(owner.value);
    if (source == null) {
      return openMemberNoStaticValue(`Member '${expression.name.name}' owner did not retain an evaluated source module.`);
    }
    const read = this.evaluationFrame.readPropertyValue(source, owner.value, expression.name.name, source.sourceFile);
    return evaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
  }

  private evaluateAccessKeyed(
    expression: AccessKeyedExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const contextMember = this.evaluateContextKeyedMemberForOwner(expression, scope);
    if (contextMember != null) {
      return contextMember;
    }

    const owner = this.evaluateNode(expression.object, scope);
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? 'Owner for keyed access did not close.',
        owner.openReasonKinds,
      );
    }
    if (expression.optional && isNullishValue(owner.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    const key = this.evaluateNode(expression.key, scope);
    if (key.kind === RuntimeBindingSourceValueEvaluationKind.Open || key.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        key.openReason ?? 'Keyed access key did not close.',
        key.openReasonKinds,
      );
    }
    const localValue = localKeyedValue(owner.value, key.value);
    if (localValue != null) {
      return RuntimeBindingSourceValueEvaluation.value(localValue);
    }
    const propertyName = propertyKeyString(key.value);
    if (propertyName == null) {
      return openUnsupportedExpression(`Keyed access key reduced to '${key.value.kind}', which is not a static property key.`);
    }
    const source = this.evaluationFrame.sourceForValue(owner.value);
    if (source == null) {
      return openMemberNoStaticValue(`Keyed access '${propertyName}' owner did not retain an evaluated source module.`);
    }
    const read = this.evaluationFrame.readPropertyValue(source, owner.value, propertyName, source.sourceFile);
    return evaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
  }

  private evaluateArrayLiteral(
    expression: ArrayLiteralExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const elements: EvaluationArrayElement[] = [];
    for (let index = 0; index < expression.elements.length; index += 1) {
      const element = expression.elements[index]!;
      const evaluated = this.evaluateNode(element, scope);
      const value = valueOrBoundaryForOpen(evaluated, element);
      if (value == null) {
        return RuntimeBindingSourceValueEvaluation.open(
          evaluated.openReason ?? `Array literal element ${index} did not close.`,
          evaluated.openReasonKinds,
        );
      }
      elements.push(new EvaluationArrayElement(value, null));
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationArrayValue(elements, false, null));
  }

  private evaluateObjectLiteral(
    expression: ObjectLiteralExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    if (expression.keys.length !== expression.values.length) {
      return openUnsupportedExpression('Object literal keys and values do not align.');
    }
    const properties = new Map<string, EvaluationObjectProperty>();
    for (let index = 0; index < expression.keys.length; index += 1) {
      const valueExpression = expression.values[index]!;
      const evaluated = this.evaluateNode(valueExpression, scope);
      const value = valueOrBoundaryForOpen(evaluated, valueExpression);
      if (value == null) {
        return RuntimeBindingSourceValueEvaluation.open(
          evaluated.openReason ?? `Object literal property '${String(expression.keys[index])}' did not close.`,
          evaluated.openReasonKinds,
        );
      }
      const name = String(expression.keys[index]);
      properties.set(name, new EvaluationObjectProperty(name, value, null));
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationObjectValue(properties, false, null));
  }

  private evaluateCallScope(
    expression: CallScopeExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateScopeName(expression.name.name, expression.ancestor, scope);
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? `CallScope '${expression.name.name}' callee did not close.`,
        callee.openReasonKinds,
      );
    }
    if (expression.optional && isNullishValue(callee.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    return this.evaluateFunctionLikeCall(
      `CallScope '${expression.name.name}'`,
      callee.value,
      expression.args,
      scope,
    );
  }

  private evaluateCallMember(
    expression: CallMemberExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const contextMember = this.evaluateContextMemberForOwner(
      expression.object,
      expression.name.name,
      scope,
    );
    if (contextMember != null) {
      if (contextMember.kind === RuntimeBindingSourceValueEvaluationKind.Open || contextMember.value == null) {
        return contextMember;
      }
      return this.evaluateFunctionLikeCall(
        `CallMember '${expression.name.name}'`,
        contextMember.value,
        expression.args,
        scope,
        null,
      );
    }

    const owner = this.evaluateNode(expression.object, scope);
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? `Owner for method '${expression.name.name}' did not close.`,
        owner.openReasonKinds,
      );
    }
    if (expression.optionalMember && isNullishValue(owner.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    const source = this.evaluationFrame.sourceForValue(owner.value);
    if (source == null) {
      return openMemberNoStaticValue(`CallMember '${expression.name.name}' owner did not retain an evaluated source module.`);
    }
    const read = this.evaluationFrame.readPropertyValue(source, owner.value, expression.name.name, source.sourceFile);
    if (expression.optionalCall && isNullishValue(read.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    if (read.value.kind === EvaluationValueKind.Unknown || read.value.kind === EvaluationValueKind.BoundaryValue) {
      return evaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
    }
    return this.evaluateFunctionLikeCall(
      `CallMember '${expression.name.name}'`,
      read.value,
      expression.args,
      scope,
      owner.value,
    );
  }

  private evaluateCallFunction(
    expression: CallFunctionExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateNode(expression.func, scope);
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? 'CallFunction callee did not close.',
        callee.openReasonKinds,
      );
    }
    if (expression.optional && isNullishValue(callee.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    return this.evaluateFunctionLikeCall('CallFunction', callee.value, expression.args, scope);
  }

  private evaluateNew(
    expression: NewExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateNode(expression.func, scope);
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? 'New expression constructor did not close.',
        callee.openReasonKinds,
      );
    }
    if (callee.value.kind === EvaluationValueKind.BoundaryValue) {
      return evaluationResult(callee.value, []);
    }
    if (callee.value.kind !== EvaluationValueKind.Class) {
      return openNeedsRuntimeValue('New expression constructor did not reduce to an evaluator-local class.');
    }
    const argumentsRead = this.evaluateCallArguments('New expression', expression.args, scope);
    if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return argumentsRead.open
        ?? RuntimeBindingSourceValueEvaluation.open('New expression arguments did not close.');
    }
    const source = this.evaluationFrame.sourceForValue(callee.value);
    if (source == null) {
      return openMemberNoStaticValue('New expression class source module was not part of static project evaluation.');
    }
    const instance = this.evaluationFrame.instantiateClassValue(
      source,
      callee.value,
      callee.value.node ?? callee.value.declaration,
      argumentsRead.values,
    );
    return evaluationResult(instance.value, instance.openSeams.map((seam) => seam.summary));
  }

  private evaluateTaggedTemplate(
    expression: TaggedTemplateExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateNode(expression.func, scope);
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? 'TaggedTemplate tag function did not close.',
        callee.openReasonKinds,
      );
    }
    const expressions = this.evaluateCallArguments('TaggedTemplate expressions', expression.expressions, scope);
    if (expressions.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return expressions.open
        ?? RuntimeBindingSourceValueEvaluation.open('TaggedTemplate expressions did not close.');
    }
    return this.evaluateFunctionLikeCallWithValues(
      'TaggedTemplate',
      callee.value,
      [cookedTemplateArrayValue(expression), ...expressions.values],
    );
  }

  private evaluateFunctionLikeCall(
    label: string,
    callee: EvaluationValue,
    args: readonly ExpressionAstNode[],
    scope: BindingScope,
    thisValue: EvaluationValue | null = null,
  ): RuntimeBindingSourceValueEvaluation {
    const argumentsRead = this.evaluateCallArguments(label, args, scope);
    if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return argumentsRead.open
        ?? RuntimeBindingSourceValueEvaluation.open(`${label} arguments did not close.`);
    }
    return this.evaluateFunctionLikeCallWithValues(label, callee, argumentsRead.values, thisValue);
  }

  private evaluateFunctionLikeCallWithValues(
    label: string,
    callee: EvaluationValue,
    argumentValues: readonly EvaluationValue[],
    thisValue: EvaluationValue | null = null,
  ): RuntimeBindingSourceValueEvaluation {
    if (callee.kind !== EvaluationValueKind.Function) {
      return openNeedsRuntimeValue(`${label} callee did not reduce to an evaluator-local function.`);
    }
    const source = this.evaluationFrame.sourceForValue(callee);
    if (source == null) {
      return openMemberNoStaticValue(`${label} function source module was not part of static project evaluation.`);
    }
    const read = this.evaluationFrame.callFunctionValue(source, callee, callee.node ?? source.sourceFile, argumentValues, thisValue);
    return evaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
  }

  private evaluateCallArguments(
    label: string,
    args: readonly ExpressionAstNode[],
    scope: BindingScope,
  ): RuntimeBindingSourceArgumentsEvaluation {
    const values: EvaluationValue[] = [];
    for (let index = 0; index < args.length; index += 1) {
      const argument = this.evaluateNode(args[index]!, scope);
      if (argument.kind === RuntimeBindingSourceValueEvaluationKind.Value && argument.value != null) {
        values.push(argument.value);
        continue;
      }
      const boundary = boundaryValueForOpenArgument(argument, args[index]!);
      if (boundary != null) {
        values.push(boundary);
        continue;
      }
      return RuntimeBindingSourceArgumentsEvaluation.open(
        RuntimeBindingSourceValueEvaluation.open(
          `${label} argument ${index} did not close.${argument.openReason == null ? '' : ` ${argument.openReason}`}`,
          argument.openReasonKinds,
        ),
      );
    }
    return RuntimeBindingSourceArgumentsEvaluation.value(values);
  }

  private evaluateSlot(
    slot: BindingContextSlot,
    scope: BindingScope | null,
  ): RuntimeBindingSourceValueEvaluation {
    if (slot.staticValue != null) {
      return RuntimeBindingSourceValueEvaluation.value(slot.staticValue);
    }
    if (slot.targetProductHandle == null) {
      if (slot.targetType != null) {
        return openSlotNoStaticValue(
          `Scope slot '${slot.name}' is runtime/local typed as '${slot.targetType.display ?? slot.targetType.shapeKind}', but it does not carry a static value carrier.`,
        );
      }
      return openSlotNoStaticValue(`Scope slot '${slot.name}' did not carry a TypeChecker member product.`);
    }
    const member = this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
    if (!(member instanceof CheckerTypeMember)) {
      return openSlotNoStaticValue(`Scope slot '${slot.name}' target product is not a TypeChecker member.`);
    }
    return this.evaluateMember(member, scope);
  }

  private evaluateMember(
    member: CheckerTypeMember,
    scope: BindingScope | null,
  ): RuntimeBindingSourceValueEvaluation {
    const declaration = member.carrier?.declarations[0] ?? null;
    const classNode = declaration == null ? null : enclosingClassLike(declaration);
    if (declaration == null || classNode == null || classNode.name == null) {
      return openMemberNoStaticValue(`Member '${member.name}' does not have a named class declaration for static value evaluation.`);
    }

    const source = this.evaluationFrame.sourceForNode(classNode);
    if (source == null) {
      return openMemberNoStaticValue(`Member '${member.name}' source module was not part of static project evaluation.`);
    }
    const classValue = source.evaluation.environment.readValue(classNode.name.text);
    if (classValue?.kind !== EvaluationValueKind.Class) {
      return openMemberNoStaticValue(`Class '${classNode.name.text}' was not available as an evaluator class value.`);
    }

    return this.evaluateClassMemberValue(classValue, member.name, classNode, source, scope);
  }

  private evaluateClassMemberValue(
    classValue: EvaluationClassValue,
    memberName: string,
    classNode: ts.ClassLikeDeclarationBase,
    source: EvaluatedProjectSource,
    scope: BindingScope | null,
  ): RuntimeBindingSourceValueEvaluation {
    const instance = this.evaluationFrame.instantiateClassValue(source, classValue, classNode);
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return evaluationResult(instance.value, instance.openSeams.map((seam) => seam.summary));
    }
    this.applyBoundControllerValues(instance.value, scope);
    const value = this.evaluationFrame.readPropertyValue(source, instance.value, memberName, classNode);
    return evaluationResult(value.value, [
      ...instance.openSeams.map((seam) => seam.summary),
      ...value.openSeams.map((seam) => seam.summary),
    ]);
  }

  private applyBoundControllerValues(
    instance: EvaluationValue,
    scope: BindingScope | null,
  ): void {
    if (instance.kind !== EvaluationValueKind.Instance) {
      return;
    }
    for (const bound of this.boundControllerValues.readAll(
      scope?.bindingContext.ownerProductHandle ?? null,
      scope?.bindingContext.contextType ?? null,
    )) {
      const expression = bindingExpressionAstForProduct(this.store, bound.expressionProductHandle);
      if (expression == null || bound.sourceScope == null) {
        continue;
      }
      const value = this.evaluateBoundControllerValueExpression(bound, expression);
      if (value == null) {
        continue;
      }
      instance.properties.set(bound.propertyName, new EvaluationObjectProperty(
        bound.propertyName,
        value,
        value.node ?? instance.node ?? instance.classValue.node ?? instance.classValue.declaration,
      ));
    }
  }

  private evaluateBoundControllerValueExpression(
    bound: RuntimeBoundControllerPropertyValue,
    expression: ExpressionAstNode,
  ): EvaluationValue | null {
    if (bound.sourceScope == null) {
      return null;
    }
    const key = `${bound.controllerProductHandle}:${bound.propertyName}:${bound.bindingProductHandle}`;
    if (this.activeBoundControllerReads.has(key)) {
      return new EvaluationBoundaryValue(
        EvaluationBoundaryKind.BindingScope,
        `Bound controller property '${bound.propertyName}' recursively depends on itself.`,
        null,
      );
    }
    this.activeBoundControllerReads.add(key);
    try {
      const evaluated = this.evaluateNode(expression, bound.sourceScope);
      if (evaluated.kind === RuntimeBindingSourceValueEvaluationKind.Value && evaluated.value != null) {
        return evaluated.value;
      }
      return boundaryValueForOpenArgument(evaluated, expression);
    } finally {
      this.activeBoundControllerReads.delete(key);
    }
  }

  private evaluateTemplate(
    expression: TemplateExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateStringParts(expression.cooked, expression.expressions, scope);
  }

  private evaluateInterpolation(
    expression: Interpolation,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateStringParts(expression.parts, expression.expressions, scope);
  }

  private evaluateStringParts(
    parts: readonly string[],
    expressions: readonly ExpressionAstNode[],
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    if (parts.length !== expressions.length + 1) {
      return openUnsupportedExpression('Template/interpolation parts do not align with expression holes.');
    }
    const builder = new EvaluationStringPatternBuilder(parts[0] ?? '');
    for (let index = 0; index < expressions.length; index += 1) {
      const evaluated = this.evaluateNode(expressions[index]!, scope);
      if (evaluated.kind === RuntimeBindingSourceValueEvaluationKind.Open || evaluated.value == null) {
        const boundary = boundaryValueForOpenArgument(evaluated, expressions[index]!);
        if (boundary == null) {
          return RuntimeBindingSourceValueEvaluation.open(
            evaluated.openReason ?? `Expression hole ${index} did not close.`,
            evaluated.openReasonKinds,
          );
        }
        builder.appendBoundary(boundary, parts[index + 1] ?? '');
        continue;
      }
      if (!appendEvaluationStringLikePart(builder, evaluated.value, parts[index + 1] ?? '')) {
        return openUnsupportedExpression(`Expression hole ${index} did not reduce to a primitive value.`);
      }
    }
    return RuntimeBindingSourceValueEvaluation.value(builder.build(null));
  }

  private evaluateBinary(
    expression: BinaryExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    if (expression.operation === '||' || expression.operation === '&&' || expression.operation === '??') {
      return this.evaluateShortCircuitBinary(expression, scope);
    }
    const left = this.evaluateNode(expression.left, scope);
    if (expression.operation === '+') {
      const leftValue = valueOrBoundaryForOpen(left, expression.left);
      if (leftValue == null) {
        return RuntimeBindingSourceValueEvaluation.open(
          left.openReason ?? "Left operand for '+' did not close.",
          left.openReasonKinds,
        );
      }
      const right = this.evaluateNode(expression.right, scope);
      const rightValue = valueOrBoundaryForOpen(right, expression.right);
      if (rightValue == null) {
        return RuntimeBindingSourceValueEvaluation.open(
          right.openReason ?? "Right operand for '+' did not close.",
          right.openReasonKinds,
        );
      }
      return evaluatePlus(leftValue, rightValue);
    }
    if (left.kind === RuntimeBindingSourceValueEvaluationKind.Open || left.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        left.openReason ?? `Left operand for '${expression.operation}' did not close.`,
        left.openReasonKinds,
      );
    }
    const right = this.evaluateNode(expression.right, scope);
    if (right.kind === RuntimeBindingSourceValueEvaluationKind.Open || right.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        right.openReason ?? `Right operand for '${expression.operation}' did not close.`,
        right.openReasonKinds,
      );
    }
    const operation = staticBinaryOperationForRuntimeBinding(expression.operation);
    if (operation == null) {
      return openUnsupportedExpression(`Binary operator '${expression.operation}' is type-visible but not value-reduced by binding-source value flow.`);
    }
    const value = evaluateStaticBinaryOperation(operation, left.value, right.value, null);
    return value == null
      ? openUnsupportedExpression(`Binary operator '${expression.operation}' did not reduce over known operands.`)
      : RuntimeBindingSourceValueEvaluation.value(value);
  }

  private evaluateShortCircuitBinary(
    expression: BinaryExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const left = this.evaluateNode(expression.left, scope);
    if (left.kind === RuntimeBindingSourceValueEvaluationKind.Open || left.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        left.openReason ?? `Left operand for '${expression.operation}' did not close.`,
        left.openReasonKinds,
      );
    }
    if (expression.operation === '??') {
      return left.value.kind === EvaluationValueKind.Null || left.value.kind === EvaluationValueKind.Undefined
        ? this.evaluateNode(expression.right, scope)
        : left;
    }
    const truthy = readEvaluationTruthiness(left.value);
    if (truthy == null) {
      return openUnsupportedExpression(`Left operand for '${expression.operation}' did not reduce to known truthiness.`);
    }
    return expression.operation === '||'
      ? truthy ? left : this.evaluateNode(expression.right, scope)
      : truthy ? this.evaluateNode(expression.right, scope) : left;
  }

  private evaluateUnary(
    expression: UnaryExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const value = this.evaluateNode(expression.expression, scope);
    if (value.kind === RuntimeBindingSourceValueEvaluationKind.Open || value.value == null) {
      return value;
    }
    switch (expression.operation) {
      case '!': {
        const truthy = readEvaluationTruthiness(value.value);
        return truthy == null
          ? openUnsupportedExpression('Logical-not operand did not reduce to known truthiness.')
          : RuntimeBindingSourceValueEvaluation.value(new EvaluationBooleanValue(!truthy, null));
      }
      default:
        return openUnsupportedExpression(`Unary operator '${expression.operation}' is not value-reduced by binding-source value flow.`);
    }
  }

  private evaluateConditional(
    expression: ConditionalExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const condition = this.evaluateNode(expression.condition, scope);
    if (condition.kind === RuntimeBindingSourceValueEvaluationKind.Open || condition.value == null) {
      return condition;
    }
    const truthy = readEvaluationTruthiness(condition.value);
    if (truthy == null) {
      return this.evaluateConditionalBranchRepresentative(expression, scope)
        ?? openUnsupportedExpression('Conditional expression condition did not reduce to known truthiness.');
    }
    return this.evaluateNode(truthy ? expression.yes : expression.no, scope);
  }

  private evaluateConditionalBranchRepresentative(
    expression: ConditionalExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation | null {
    const yes = valueOrBoundaryForOpen(this.evaluateNode(expression.yes, scope), expression.yes);
    const no = valueOrBoundaryForOpen(this.evaluateNode(expression.no, scope), expression.no);
    if (yes == null || no == null) {
      return null;
    }
    const representative = representativeEvaluationValues([yes, no], `binding.conditional.${expression.$kind}`, null);
    return representative == null
      ? null
      : RuntimeBindingSourceValueEvaluation.value(representative);
  }

  private evaluateContextKeyedMemberForOwner(
    expression: AccessKeyedExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation | null {
    if (contextAccessExpression(expression.object) == null) {
      return null;
    }
    const key = this.evaluateNode(expression.key, scope);
    if (key.kind === RuntimeBindingSourceValueEvaluationKind.Open || key.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        key.openReason ?? 'Keyed context access key did not close.',
        key.openReasonKinds,
      );
    }
    const propertyName = propertyKeyString(key.value);
    return propertyName == null
      ? openUnsupportedExpression(`Keyed context access key reduced to '${key.value.kind}', which is not a static property key.`)
      : this.evaluateContextMemberForOwner(expression.object, propertyName, scope);
  }

  private evaluateContextMemberForOwner(
    owner: ExpressionAstNode,
    propertyName: string,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation | null {
    const contextOwner = contextAccessExpression(owner);
    if (contextOwner == null) {
      return null;
    }
    switch (contextOwner.$kind) {
      case 'AccessThis':
        return this.evaluateContextMemberForLookup(
          scope.locateThis(contextOwner.ancestor),
          propertyName,
          `$this ancestor ${contextOwner.ancestor}`,
        );
      case 'AccessBoundary': {
        const boundary = this.boundaryScope(scope);
        return boundary == null
          ? RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined)
          : this.evaluateContextMember(boundary, boundary.bindingContext, propertyName, 'boundary binding context');
      }
      default:
        return null;
    }
  }

  private evaluateContextObjectForLookup(
    lookup: BindingScopeLocatedLookup,
    label: string,
  ): RuntimeBindingSourceValueEvaluation {
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    return this.evaluateContextObject(lookup.scope, lookup.context, label);
  }

  private evaluateContextObject(
    scope: BindingScope | null,
    context: BindingScopeContext | null,
    label: string,
  ): RuntimeBindingSourceValueEvaluation {
    if (context == null) {
      return openSlotNoStaticValue(`${label} did not resolve to a binding context.`);
    }
    return RuntimeBindingSourceValueEvaluation.value(
      new EvaluationBoundaryObjectValue(
        EvaluationBoundaryKind.BindingScope,
        scope == null ? label : `${label}:${scope.productHandle}`,
      ),
    );
  }

  private evaluateContextMemberForLookup(
    lookup: BindingScopeLocatedLookup,
    propertyName: string,
    label: string,
  ): RuntimeBindingSourceValueEvaluation {
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    return this.evaluateContextMember(lookup.scope, lookup.context, propertyName, label);
  }

  private evaluateContextMember(
    scope: BindingScope | null,
    context: BindingScopeContext | null,
    propertyName: string,
    label: string,
  ): RuntimeBindingSourceValueEvaluation {
    if (context == null) {
      return openSlotNoStaticValue(`${label} did not resolve to a binding context for member '${propertyName}'.`);
    }
    const slot = context.lookup(propertyName);
    return slot == null
      ? openSlotNoStaticValue(`${label} did not expose a TypeChecker member slot for '${propertyName}'.`)
      : this.evaluateSlot(slot, scope);
  }

  private boundaryScope(scope: BindingScope): BindingScope | null {
    let current: BindingScope | null = scope;
    while (current != null && !current.isBoundary) {
      current = current.parent;
    }
    return current;
  }
}

function localPropertyValue(
  value: EvaluationValue,
  propertyName: string,
): EvaluationValue | null {
  if (value.kind === EvaluationValueKind.Array && propertyName === 'length') {
    return new EvaluationNumberValue(value.elements.length, null);
  }
  if (
    value.kind === EvaluationValueKind.Object
    || value.kind === EvaluationValueKind.BoundaryObject
    || value.kind === EvaluationValueKind.Instance
  ) {
    const property = value.properties.get(propertyName)?.value ?? null;
    if (property != null) {
      return property;
    }
    if (value.kind === EvaluationValueKind.Object && !value.mayHaveUnknownProperties) {
      return EvaluationUndefined;
    }
    if (value.kind === EvaluationValueKind.BoundaryObject) {
      return new EvaluationBoundaryValue(
        value.boundaryKind,
        `${value.path}.${propertyName}`,
        value.node,
      );
    }
    return null;
  }
  if (value.kind === EvaluationValueKind.ModuleNamespace) {
    return value.exports.get(propertyName) ?? null;
  }
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    return new EvaluationBoundaryValue(
      value.boundaryKind,
      `${value.path}.${propertyName}`,
      value.node,
    );
  }
  return null;
}

function cookedTemplateArrayValue(
  expression: TaggedTemplateExpression,
): EvaluationArrayValue {
  return new EvaluationArrayValue(
    expression.cooked.map((part) =>
      new EvaluationArrayElement(new EvaluationStringValue(part, null), null)
    ),
    false,
    null,
  );
}

function localKeyedValue(
  value: EvaluationValue,
  key: EvaluationValue,
): EvaluationValue | null {
  if (value.kind === EvaluationValueKind.Array && key.kind === EvaluationValueKind.Number) {
    if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
      return null;
    }
    return value.elements.at(key.value)?.value ?? EvaluationUndefined;
  }
  const propertyName = propertyKeyString(key);
  return propertyName == null ? null : localPropertyValue(value, propertyName);
}

function propertyKeyString(value: EvaluationValue): string | null {
  if (!isEvaluationPrimitiveValue(value)) {
    return null;
  }
  return String(readEvaluationPrimitive(value));
}

function isNullishValue(value: EvaluationValue): boolean {
  return value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined;
}

function contextAccessExpression(
  expression: ExpressionAstNode,
): AccessThisExpression | AccessBoundaryExpression | null {
  if (expression.$kind === 'Paren') {
    return contextAccessExpression(expression.expression);
  }
  return expression.$kind === 'AccessThis' || expression.$kind === 'AccessBoundary'
    ? expression
    : null;
}

export function bindingExpressionAstForProduct(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): ExpressionAstNode | null {
  if (expressionProductHandle == null) {
    return null;
  }
  const parse = store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  return parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
}

function evaluationResult(
  value: EvaluationValue,
  openSummaries: readonly string[],
): RuntimeBindingSourceValueEvaluation {
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    return RuntimeBindingSourceValueEvaluation.open(
      [value.reason, ...openSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
      [openSeamReasonKindForEvaluationBoundary(value.boundaryKind)],
    );
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    return RuntimeBindingSourceValueEvaluation.open(
      [value.reason, ...openSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
      [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
    );
  }
  if (openSummaries.length > 0) {
    return RuntimeBindingSourceValueEvaluation.open(
      openSummaries.join(' '),
      [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
    );
  }
  return RuntimeBindingSourceValueEvaluation.value(value);
}

class RuntimeBindingSourceArgumentsEvaluation {
  private constructor(
    readonly kind: RuntimeBindingSourceValueEvaluationKind,
    readonly values: readonly EvaluationValue[],
    readonly open: RuntimeBindingSourceValueEvaluation | null,
  ) {}

  static value(values: readonly EvaluationValue[]): RuntimeBindingSourceArgumentsEvaluation {
    return new RuntimeBindingSourceArgumentsEvaluation(RuntimeBindingSourceValueEvaluationKind.Value, values, null);
  }

  static open(open: RuntimeBindingSourceValueEvaluation): RuntimeBindingSourceArgumentsEvaluation {
    return new RuntimeBindingSourceArgumentsEvaluation(RuntimeBindingSourceValueEvaluationKind.Open, [], open);
  }
}

function boundaryValueForOpenArgument(
  argument: RuntimeBindingSourceValueEvaluation,
  expression: ExpressionAstNode,
): EvaluationBoundaryValue | null {
  if (!argument.openReasonKinds.includes(OpenSeamReasonKind.BindingSourceSlotNoStaticValue)) {
    return null;
  }
  return new EvaluationBoundaryValue(
    EvaluationBoundaryKind.BindingScope,
    argument.openReason ?? `binding expression ${expression.$kind}`,
    null,
  );
}

function valueOrBoundaryForOpen(
  evaluation: RuntimeBindingSourceValueEvaluation,
  expression: ExpressionAstNode,
): EvaluationValue | null {
  if (evaluation.kind === RuntimeBindingSourceValueEvaluationKind.Value && evaluation.value != null) {
    return evaluation.value;
  }
  return boundaryValueForOpenArgument(evaluation, expression);
}

function compactOpenReasonKinds(
  values: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return [...new Set(values)];
}

function evaluatePlus(
  left: EvaluationValue,
  right: EvaluationValue,
): RuntimeBindingSourceValueEvaluation {
  const pattern = evaluationStringPatternFromConcatenation(left, right, null);
  if (pattern != null) {
    return RuntimeBindingSourceValueEvaluation.value(pattern);
  }
  if (!isEvaluationPrimitiveValue(left) || !isEvaluationPrimitiveValue(right)) {
    return openUnsupportedExpression("Binary '+' operands did not both reduce to primitive values.");
  }
  const leftPrimitive = readEvaluationPrimitive(left);
  const rightPrimitive = readEvaluationPrimitive(right);
  if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationStringValue(String(leftPrimitive) + String(rightPrimitive), null));
  }
  if (typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number') {
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(leftPrimitive + rightPrimitive, null));
  }
  return openUnsupportedExpression("Binary '+' operands did not reduce to a string or numeric result.");
}

function staticBinaryOperationForRuntimeBinding(operation: BinaryOperator): StaticBinaryOperation | null {
  switch (operation) {
    case '==':
    case '===':
    case '!=':
    case '!==':
    case '+':
    case '-':
    case '*':
    case '/':
    case '%':
    case '**':
    case '<':
    case '<=':
    case '>':
    case '>=':
      return operation;
    default:
      return null;
  }
}

function openNeedsRuntimeValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
  );
}

function openSlotNoStaticValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
  );
}

function openMemberNoStaticValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceMemberNoStaticValue],
  );
}

function openUnsupportedExpression(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
  );
}

function enclosingClassLike(node: ts.Node): ts.ClassLikeDeclarationBase | null {
  let current: ts.Node | undefined = node;
  while (current != null) {
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}
