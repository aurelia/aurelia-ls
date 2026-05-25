import ts from 'typescript';
import {
  BindingScope,
  BindingScopeLocatedLookup,
  BindingScopeLookupKind,
  BindingScopeOwnerKind,
  BindingContextSlot,
  type BindingScopeContext,
} from '../configuration/scope.js';
import type {
  AccessBoundaryExpression,
  AccessGlobalExpression,
  ArrayLiteralExpression,
  AccessMemberExpression,
  AccessKeyedExpression,
  AccessScopeExpression,
  AccessThisExpression,
  BindingBehaviorExpression,
  BinaryExpression,
  BinaryOperator,
  CallFunctionExpression,
  CallGlobalExpression,
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
  ValueConverterExpression,
} from '../expression/ast.js';
import {
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  evaluateStaticBinaryOperation,
  evaluateStaticUnaryOperation,
  evaluationPropertyKeyString,
  type StaticBinaryOperation,
} from '../evaluation/operators.js';
import {
  AureliaGlobalIntrinsicEvaluationKind,
  evaluateAureliaExpressionGlobalAccess,
  evaluateAureliaExpressionGlobalCall,
  evaluateAureliaExpressionGlobalConstructor,
  evaluateAureliaExpressionGlobalMemberCall,
  type AureliaGlobalIntrinsicEvaluation,
} from '../evaluation/global-intrinsics.js';
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
  type EvaluationClassValue,
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { KernelStore } from '../kernel/store.js';
import type { Container } from '../di/container.js';
import {
  TypeSystemHotDetails,
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import {
  CheckerStrictTrueComparisonKind,
} from '../type-system/checker-type-member-surface.js';
import {
  CheckerTypeMember,
} from '../type-system/type-shape.js';
import {
  type RuntimeValueConverterMethodName,
  VALUE_CONVERTER_TO_VIEW_METHOD,
  VALUE_CONVERTER_WITH_CONTEXT_PROPERTY,
  valueConverterWithContextComparisonKindForReference,
} from '../type-system/value-converter-call-surface.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { bindingExpressionAstForProduct } from '../template/expression-parse-product.js';
import { findVisibleTemplateResource } from '../template/compiler-resource-lookup.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import {
  PropertyBinding,
} from '../template/runtime-binding.js';
import { RuntimeBindingSourceEvaluationFrame } from './binding-source-evaluation-frame.js';
import { RuntimeBindingSourceArrayMethodEvaluator } from './binding-source-array-method-value.js';
import { RuntimeBindingSourceMemberValueReader } from './binding-source-member-value.js';
import {
  bindingSourceValueEvaluationResult,
  openBindingSourceMemberNoStaticValue,
  openBindingSourceNeedsRuntimeValue,
  openBindingSourceSlotNoStaticValue,
  openBindingSourceUnsupportedExpression,
  RuntimeBindingSourceValueEvaluation,
  RuntimeBindingSourceValueEvaluationKind,
} from './binding-source-value-evaluation.js';
import { RuntimeBindingSourceValueEvaluationContext } from './binding-source-value-evaluation-context.js';
import {
  runtimeBindingSourceValueExpressionSupportForKind,
} from './binding-source-value-expression-support.js';
import type { RuntimeBindingSourceActivationContext } from './binding-source-activation-context.js';
import {
  RuntimeBoundControllerValueTable,
  type RuntimeBoundControllerPropertyValue,
} from './runtime-bound-controller-value.js';
import { StateProductDetails } from '../state/product-details.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { ValueConverterDefinition } from '../resources/value-converter-definition.js';

type RuntimeBindingSourceClassValueTarget = {
  readonly classNode: ts.ClassLikeDeclarationBase;
  readonly classValue: EvaluationClassValue;
  readonly source: EvaluatedProjectSource;
};

type RuntimeBindingSourceClassValueTargetRead = {
  readonly target: RuntimeBindingSourceClassValueTarget;
  readonly openReason: null;
} | {
  readonly target: null;
  readonly openReason: string;
};

/**
 * Evaluates Aurelia binding-source expressions against modeled runtime Scope plus the static ECMAScript evaluator.
 *
 * This is intentionally binding-owned substrate. Consumers such as router resources can ask whether a binding source
 * carries a static value, but source lookup, view-model member access, and getter execution stay with the binding flow.
 */
export class RuntimeBindingSourceValueEvaluator {
  private readonly evaluationFrame: RuntimeBindingSourceEvaluationFrame;
  private readonly arrayMethods: RuntimeBindingSourceArrayMethodEvaluator;
  private readonly memberValues: RuntimeBindingSourceMemberValueReader;

  constructor(
    readonly store: KernelStore,
    readonly evaluation: StaticProjectEvaluationResult,
    readonly boundControllerValues: RuntimeBoundControllerValueTable = RuntimeBoundControllerValueTable.empty,
    readonly activationContext: RuntimeBindingSourceActivationContext | null = null,
    private readonly defaultActiveContainer: Container | null = null,
  ) {
    this.evaluationFrame = new RuntimeBindingSourceEvaluationFrame(
      evaluation,
      activationContext,
    );
    this.arrayMethods = new RuntimeBindingSourceArrayMethodEvaluator(
      store,
      (context) => this.evaluateNode(context),
    );
    this.memberValues = new RuntimeBindingSourceMemberValueReader(this.evaluationFrame);
  }

  /** Returns a source-value evaluator whose root requests default to the supplied DI activation container. */
  withDefaultActiveContainer(activeContainer: Container | null): RuntimeBindingSourceValueEvaluator {
    return new RuntimeBindingSourceValueEvaluator(
      this.store,
      this.evaluation,
      this.boundControllerValues,
      this.activationContext,
      activeContainer,
    );
  }

  evaluate(
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluationFrame.withActiveContainer(
      context.containerOrDefault(this.defaultActiveContainer),
      () => this.evaluateNode(context),
    );
  }

  private evaluateNode(
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const expression = context.expression;
    const scope = context.scope;
    switch (expression.$kind) {
      case 'PrimitiveLiteral':
        return RuntimeBindingSourceValueEvaluation.value(evaluationPrimitiveValueFromExpressionValue(expression.value));
      case 'AccessGlobal':
        return this.evaluateAccessGlobal(expression);
      case 'AccessScope':
        return this.evaluateAccessScope(expression, context);
      case 'AccessThis':
        return this.evaluateAccessThis(expression, scope);
      case 'AccessBoundary':
        return this.evaluateAccessBoundary(expression, scope);
      case 'AccessMember':
        return this.evaluateAccessMember(expression, context);
      case 'AccessKeyed':
        return this.evaluateAccessKeyed(expression, context);
      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(expression, context);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteral(expression, context);
      case 'New':
        return this.evaluateNew(expression, context);
      case 'CallScope':
        return this.evaluateCallScope(expression, context);
      case 'CallMember':
        return this.evaluateCallMember(expression, context);
      case 'CallGlobal':
        return this.evaluateCallGlobal(expression, context);
      case 'CallFunction':
        return this.evaluateCallFunction(expression, context);
      case 'TaggedTemplate':
        return this.evaluateTaggedTemplate(expression, context);
      case 'Paren':
        return this.evaluateNode(context.child(expression.expression));
      case 'BindingBehavior':
        return this.evaluateBindingBehavior(expression, context);
      case 'ValueConverter':
        return this.evaluateValueConverter(expression, context);
      case 'Template':
        return this.evaluateTemplate(expression, context);
      case 'Interpolation':
        return this.evaluateInterpolation(expression, context);
      case 'Binary':
        return this.evaluateBinary(expression, context);
      case 'Unary':
        return this.evaluateUnary(expression, context);
      case 'Conditional':
        return this.evaluateConditional(expression, context);
      default:
        return openBindingSourceUnsupportedExpression(runtimeBindingSourceValueExpressionSupportForKind(expression.$kind).summary);
    }
  }

  private evaluateBindingBehavior(
    expression: BindingBehaviorExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const projected = context.projectBindingSourceExpression(expression);
    if (projected == null) {
      return this.evaluateNode(context.child(expression.expression));
    }
    if (projected.scope == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        projected.openReason ?? `Binding behavior '${expression.name.name}' did not produce a source-evaluation Scope.`,
        [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
      );
    }
    return this.evaluateNode(context.child(projected.expression, projected.scope));
  }

  private evaluateValueConverter(
    expression: ValueConverterExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const input = this.evaluateNode(context.child(expression.expression));
    if (input.kind === RuntimeBindingSourceValueEvaluationKind.Open || input.value == null) {
      return input;
    }

    const argumentsRead = this.evaluateCallArguments(`ValueConverter '${expression.name.name}'`, expression.args, context);
    if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return argumentsRead.open
        ?? RuntimeBindingSourceValueEvaluation.open(`ValueConverter '${expression.name.name}' arguments did not close.`);
    }

    const definition = this.valueConverterDefinition(expression, context.resourceScope);
    if (definition == null) {
      return openBindingSourceUnsupportedExpression(
        `Value converter '${expression.name.name}' was not resolved through the current compiler resource scope.`,
      );
    }

    const instanceRead = this.evaluateValueConverterInstance(definition);
    if (instanceRead.kind === RuntimeBindingSourceValueEvaluationKind.Open || instanceRead.value == null) {
      return instanceRead;
    }

    const methodRead = this.evaluateValueConverterMethod(instanceRead.value, VALUE_CONVERTER_TO_VIEW_METHOD);
    if (methodRead.kind === RuntimeBindingSourceValueEvaluationKind.Open || methodRead.value == null) {
      return methodRead;
    }
    if (methodRead.value.kind === EvaluationValueKind.Undefined) {
      return input;
    }
    if (methodRead.value.kind !== EvaluationValueKind.Function) {
      return openBindingSourceNeedsRuntimeValue(
        `Value converter '${definition.name}' toView member did not reduce to an evaluator-local function.`,
      );
    }

    const withContext = this.valueConverterUsesCallerContext(instanceRead.value, definition);
    if (withContext.open != null) {
      return withContext.open;
    }
    const callArguments = [
      input.value,
      ...(withContext.value ? [valueConverterCallerContext(expression)] : []),
      ...argumentsRead.values,
    ];
    return this.evaluateValueConverterCall(definition, methodRead.value, instanceRead.value, callArguments);
  }

  private valueConverterDefinition(
    expression: ValueConverterExpression,
    resourceScope: TemplateResourceScope | null,
  ): ValueConverterDefinition | null {
    const resource = findVisibleTemplateResource(resourceScope, ResourceDefinitionKind.ValueConverter, expression.name.name);
    const definition = resource?.definition ?? null;
    return definition?.type === ResourceDefinitionKind.ValueConverter
      ? definition
      : null;
  }

  private evaluateValueConverterInstance(
    definition: ValueConverterDefinition,
  ): RuntimeBindingSourceValueEvaluation {
    if (definition.target.addressHandle == null) {
      return openBindingSourceNeedsRuntimeValue(`Value converter '${definition.name}' target does not carry an authored value address.`);
    }
    const target = this.evaluationFrame.evaluateSourceAddressExpression(
      this.store,
      definition.target.addressHandle,
    );
    if (target == null) {
      return openBindingSourceNeedsRuntimeValue(
        `Value converter '${definition.name}' target was not part of static project evaluation.`,
      );
    }
    const targetResult = bindingSourceValueEvaluationResult(target.value, target.openSeams.map((seam) => seam.summary));
    if (targetResult.kind === RuntimeBindingSourceValueEvaluationKind.Open || targetResult.value == null) {
      return targetResult;
    }
    if (targetResult.value.kind === EvaluationValueKind.Instance) {
      return targetResult;
    }
    if (targetResult.value.kind !== EvaluationValueKind.Class) {
      return openBindingSourceNeedsRuntimeValue(
        `Value converter '${definition.name}' target did not reduce to an evaluator-local class or instance.`,
      );
    }
    const source = this.evaluationFrame.sourceForValue(targetResult.value);
    if (source == null) {
      return openBindingSourceMemberNoStaticValue(
        `Value converter '${definition.name}' target class source module was not part of static project evaluation.`,
      );
    }
    const instance = this.evaluationFrame.instantiateClassValue(
      source,
      targetResult.value,
      targetResult.value.node ?? targetResult.value.declaration,
    );
    return bindingSourceValueEvaluationResult(instance.value, instance.openSeams.map((seam) => seam.summary));
  }

  private evaluateValueConverterMethod(
    instance: EvaluationValue,
    methodName: RuntimeValueConverterMethodName,
  ): RuntimeBindingSourceValueEvaluation {
    const source = this.evaluationFrame.sourceForValue(instance);
    if (source == null) {
      return openBindingSourceMemberNoStaticValue(`Value converter ${methodName} owner did not retain an evaluated source module.`);
    }
    const read = this.evaluationFrame.readPropertyValue(
      source,
      instance,
      methodName,
      instance.node ?? source.sourceFile,
    );
    return bindingSourceValueEvaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
  }

  private valueConverterUsesCallerContext(
    instance: EvaluationValue,
    definition: ValueConverterDefinition,
  ): ValueConverterCallerContextRead {
    const checkerPolicy = this.valueConverterCheckerCallerContextKind(definition);
    switch (checkerPolicy) {
      case CheckerStrictTrueComparisonKind.Missing:
      case CheckerStrictTrueComparisonKind.DefinitelyFalse:
        return {
          value: false,
          open: null,
        };
      case CheckerStrictTrueComparisonKind.DefinitelyTrue:
        return {
          value: true,
          open: null,
        };
      case CheckerStrictTrueComparisonKind.MaybeTrue:
        return {
          value: false,
          open: RuntimeBindingSourceValueEvaluation.open(
            `Value converter '${definition.name}' withContext may be true or false; static source-value reduction cannot choose a concrete toView arity.`,
            [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
          ),
        };
    }
    return this.valueConverterUsesCallerContextFromStaticInstance(instance, definition);
  }

  private valueConverterCheckerCallerContextKind(
    definition: ValueConverterDefinition,
  ): CheckerStrictTrueComparisonKind | null {
    return valueConverterWithContextComparisonKindForReference(
      this.store,
      definition.target.targetType,
      `source-value:value-converter:${definition.name}:with-context`,
    );
  }

  private valueConverterUsesCallerContextFromStaticInstance(
    instance: EvaluationValue,
    definition: ValueConverterDefinition,
  ): ValueConverterCallerContextRead {
    if (
      (
        instance.kind === EvaluationValueKind.Object
        || instance.kind === EvaluationValueKind.Function
        || instance.kind === EvaluationValueKind.Class
        || instance.kind === EvaluationValueKind.Instance
      )
      && !instance.properties.has(VALUE_CONVERTER_WITH_CONTEXT_PROPERTY)
    ) {
      return {
        value: false,
        open: null,
      };
    }
    const source = this.evaluationFrame.sourceForValue(instance);
    if (source == null) {
      return {
        value: false,
        open: RuntimeBindingSourceValueEvaluation.open(
          `Value converter '${definition.name}' withContext owner did not retain an evaluated source module.`,
          [OpenSeamReasonKind.BindingSourceMemberNoStaticValue],
        ),
      };
    }
    const read = this.evaluationFrame.readPropertyValue(
      source,
      instance,
      VALUE_CONVERTER_WITH_CONTEXT_PROPERTY,
      instance.node ?? source.sourceFile,
    );
    if (read.openSeams.length > 0) {
      return {
        value: false,
        open: RuntimeBindingSourceValueEvaluation.open(
          read.openSeams.map((seam) => seam.summary).join(' '),
          [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
        ),
      };
    }
    if (read.value.kind === EvaluationValueKind.Unknown || read.value.kind === EvaluationValueKind.BoundaryValue) {
      return {
        value: false,
        open: bindingSourceValueEvaluationResult(read.value, []),
      };
    }
    return {
      value: read.value.kind === EvaluationValueKind.Boolean && read.value.value === true,
      open: null,
    };
  }

  private evaluateValueConverterCall(
    definition: ValueConverterDefinition,
    method: EvaluationFunctionValue,
    instance: EvaluationValue,
    argumentValues: readonly EvaluationValue[],
  ): RuntimeBindingSourceValueEvaluation {
    const source = this.evaluationFrame.sourceForValue(method);
    if (source == null) {
      return openBindingSourceMemberNoStaticValue(`Value converter '${definition.name}' toView function source module was not part of static project evaluation.`);
    }
    const read = this.evaluationFrame.callFunctionValue(
      source,
      method,
      method.node ?? source.sourceFile,
      argumentValues,
      instance,
    );
    return bindingSourceValueEvaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
  }

  private evaluateAccessScope(
    expression: AccessScopeExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateScopeName(expression.name.name, expression.ancestor, context);
  }

  private evaluateAccessGlobal(
    expression: AccessGlobalExpression,
  ): RuntimeBindingSourceValueEvaluation {
    const value = evaluateAureliaExpressionGlobalAccess(expression.name.name);
    return value == null
      ? openBindingSourceUnsupportedExpression(`Global '${expression.name.name}' is not in Aurelia's admitted global intrinsic set.`)
      : RuntimeBindingSourceValueEvaluation.value(value);
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
    const boundary = scope.locateBoundary();
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
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const scope = context.scope;
    const lookup = scope.locate(name, ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return openBindingSourceSlotNoStaticValue(`Could not resolve ancestor ${ancestor} for '${name}'.`);
    }
    if (lookup.slot == null) {
      return openBindingSourceSlotNoStaticValue(`Scope lookup for '${name}' did not expose a TypeChecker member slot.`);
    }
    const bound = lookup.lookupKind === BindingScopeLookupKind.BindingContext
      ? this.evaluateBoundControllerValue(lookup.scope, lookup.slot.name, context)
      : null;
    return bound ?? this.evaluateSlot(lookup.slot, lookup.scope, context);
  }

  private evaluateBoundControllerValue(
    scope: BindingScope | null,
    propertyName: string,
    context: RuntimeBindingSourceValueEvaluationContext,
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
    if (bound.sourceScope == null) {
      return openBindingSourceSlotNoStaticValue(`Bound controller property '${propertyName}' did not retain its parent binding Scope.`);
    }
    const expression = bindingExpressionAstForProduct(this.store, bound.expressionProductHandle);
    if (expression == null) {
      return openBindingSourceSlotNoStaticValue(`Bound controller property '${propertyName}' did not retain a runtime-accepted binding expression.`);
    }
    const sourceContext = context.projectBindingSourceValueContext(
      expression,
      bound.sourceScope,
      bound.sourceBindingBehavior,
      `bound-controller:${propertyName}:${bound.bindingProductHandle}`,
      bound.sourceAddressHandle,
      bound.sourceStrictBinding,
      bound.sourceResourceScope,
      bound.sourceDefaultContainer,
    );
    if (sourceContext.context == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        sourceContext.openReason ?? `Bound controller property '${propertyName}' did not project to a source-value context.`,
        [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
      );
    }
    return context.withBoundControllerRead(
      key,
      () => openBindingSourceNeedsRuntimeValue(`Bound controller property '${propertyName}' recursively depends on itself.`),
      () => this.evaluateNode(sourceContext.context!),
    );
  }

  private evaluateAccessMember(
    expression: AccessMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const scope = context.scope;
    const contextMember = this.evaluateContextMemberForOwner(
      expression.object,
      expression.name.name,
      context,
    );
    if (contextMember != null) {
      return contextMember;
    }

    const owner = this.evaluateNode(context.child(expression.object));
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? `Owner for member '${expression.name.name}' did not close.`,
        owner.openReasonKinds,
      );
    }
    if (expression.optional && isNullishValue(owner.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    if (isNullishValue(owner.value)) {
      return nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects member access '${expression.name.name}' because the owner value is ${owner.value.kind}.`,
      );
    }
    return this.memberValues.property(owner.value, expression.name.name);
  }

  private evaluateAccessKeyed(
    expression: AccessKeyedExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const scope = context.scope;
    const contextMember = this.evaluateContextKeyedMemberForOwner(expression, context);
    if (contextMember != null) {
      return contextMember;
    }

    const owner = this.evaluateNode(context.child(expression.object));
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? 'Owner for keyed access did not close.',
        owner.openReasonKinds,
      );
    }
    const key = this.evaluateNode(context.child(expression.key));
    if (key.kind === RuntimeBindingSourceValueEvaluationKind.Open || key.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        key.openReason ?? 'Keyed access key did not close.',
        key.openReasonKinds,
      );
    }
    if (expression.optional && isNullishValue(owner.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    if (isNullishValue(owner.value)) {
      return nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects keyed access because the owner value is ${owner.value.kind}.`,
      );
    }
    return this.memberValues.element(owner.value, key.value);
  }

  private evaluateArrayLiteral(
    expression: ArrayLiteralExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const elements: EvaluationArrayElement[] = [];
    for (let index = 0; index < expression.elements.length; index += 1) {
      const element = expression.elements[index]!;
      const evaluated = this.evaluateNode(context.child(element));
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
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (expression.keys.length !== expression.values.length) {
      return openBindingSourceUnsupportedExpression('Object literal keys and values do not align.');
    }
    const properties = new Map<string, EvaluationObjectProperty>();
    for (let index = 0; index < expression.keys.length; index += 1) {
      const valueExpression = expression.values[index]!;
      const evaluated = this.evaluateNode(context.child(valueExpression));
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
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const target = this.evaluateScopeCallTarget(expression.name.name, expression.ancestor, context);
    if (target.callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || target.callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        target.callee.openReason ?? `CallScope '${expression.name.name}' callee did not close.`,
        target.callee.openReasonKinds,
      );
    }
    if (expression.optional && isNullishValue(target.callee.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    if (isNullishValue(target.callee.value)) {
      return nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects CallScope '${expression.name.name}' because the callee value is ${target.callee.value.kind}.`,
      );
    }
    return this.evaluateFunctionLikeCall(
      `CallScope '${expression.name.name}'`,
      target.callee.value,
      expression.args,
      context,
      target.thisValue,
      target.openSummaries,
    );
  }

  private evaluateCallMember(
    expression: CallMemberExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const contextMember = this.evaluateContextMemberCallTargetForOwner(
      expression.object,
      expression.name.name,
      context,
    );
    if (contextMember != null) {
      if (contextMember.callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || contextMember.callee.value == null) {
        return contextMember.callee;
      }
      if (isNullishValue(contextMember.callee.value)) {
        const nullishKind = contextMember.nullishKind ?? RuntimeBindingSourceCallTargetNullishKind.Callee;
        if (expression.optionalMember && nullishKind === RuntimeBindingSourceCallTargetNullishKind.Owner) {
          return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
        }
        if (expression.optionalCall && nullishKind === RuntimeBindingSourceCallTargetNullishKind.Callee) {
          return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
        }
        return nullishSourceValueResult(
          context,
          nullishKind === RuntimeBindingSourceCallTargetNullishKind.Owner
            ? `Aurelia strict astEvaluate rejects method access '${expression.name.name}' because the owner value is ${contextMember.callee.value.kind}.`
            : `Aurelia strict astEvaluate rejects CallMember '${expression.name.name}' because the callee value is ${contextMember.callee.value.kind}.`,
        );
      }
      return this.evaluateFunctionLikeCall(
        `CallMember '${expression.name.name}'`,
        contextMember.callee.value,
        expression.args,
        context,
        contextMember.thisValue,
        contextMember.openSummaries,
      );
    }

    const owner = this.evaluateNode(context.child(expression.object));
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? `Owner for method '${expression.name.name}' did not close.`,
        owner.openReasonKinds,
      );
    }
    if (isNullishValue(owner.value)) {
      return expression.optionalMember
        ? RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined)
        : nullishSourceValueResult(
            context,
            `Aurelia strict astEvaluate rejects method access '${expression.name.name}' because the owner value is ${owner.value.kind}.`,
          );
    }
    const arrayMethodCall = this.arrayMethods.evaluateMemberCall(expression, owner.value, context);
    if (arrayMethodCall != null) {
      return arrayMethodCall;
    }
    const globalMemberCall = this.evaluateGlobalMemberCall(expression, owner.value, context);
    if (globalMemberCall != null) {
      return globalMemberCall;
    }
    const source = this.evaluationFrame.sourceForValue(owner.value);
    if (source == null) {
      return openBindingSourceMemberNoStaticValue(`CallMember '${expression.name.name}' owner did not retain an evaluated source module.`);
    }
    const read = this.evaluationFrame.readPropertyValue(source, owner.value, expression.name.name, source.sourceFile);
    if (expression.optionalCall && isNullishValue(read.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    if (isNullishValue(read.value)) {
      return nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects CallMember '${expression.name.name}' because the callee value is ${read.value.kind}.`,
      );
    }
    if (read.value.kind === EvaluationValueKind.Unknown || read.value.kind === EvaluationValueKind.BoundaryValue) {
      return bindingSourceValueEvaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
    }
    return this.evaluateFunctionLikeCall(
      `CallMember '${expression.name.name}'`,
      read.value,
      expression.args,
      context,
      owner.value,
    );
  }

  private evaluateCallGlobal(
    expression: CallGlobalExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const argumentsRead = this.evaluateCallArguments(`CallGlobal '${expression.name.name}'`, expression.args, context);
    if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return argumentsRead.open
        ?? RuntimeBindingSourceValueEvaluation.open(`CallGlobal '${expression.name.name}' arguments did not close.`);
    }
    return runtimeBindingSourceValueFromGlobalIntrinsic(
      evaluateAureliaExpressionGlobalCall(expression.name.name, argumentsRead.values),
    );
  }

  private evaluateGlobalMemberCall(
    expression: CallMemberExpression,
    receiver: EvaluationValue,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
    const argumentsRead = this.evaluateCallArguments(`CallMember '${expression.name.name}'`, expression.args, context);
    if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return argumentsRead.open
        ?? RuntimeBindingSourceValueEvaluation.open(`CallMember '${expression.name.name}' arguments did not close.`);
    }
    const result = evaluateAureliaExpressionGlobalMemberCall(
      receiver,
      expression.name.name,
      argumentsRead.values,
    );
    return result == null ? null : runtimeBindingSourceValueFromGlobalIntrinsic(result);
  }

  private evaluateCallFunction(
    expression: CallFunctionExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateNode(context.child(expression.func));
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? 'CallFunction callee did not close.',
        callee.openReasonKinds,
      );
    }
    if (expression.optional && isNullishValue(callee.value)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    if (isNullishValue(callee.value)) {
      return nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects CallFunction because the callee value is ${callee.value.kind}.`,
      );
    }
    return this.evaluateFunctionLikeCall('CallFunction', callee.value, expression.args, context);
  }

  private evaluateNew(
    expression: NewExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const globalConstructorName = accessGlobalName(expression.func);
    if (globalConstructorName != null) {
      const argumentsRead = this.evaluateCallArguments(`New '${globalConstructorName}'`, expression.args, context);
      if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
        return argumentsRead.open
          ?? RuntimeBindingSourceValueEvaluation.open(`New '${globalConstructorName}' arguments did not close.`);
      }
      return runtimeBindingSourceValueFromGlobalIntrinsic(
        evaluateAureliaExpressionGlobalConstructor(globalConstructorName, argumentsRead.values),
      );
    }
    const callee = this.evaluateNode(context.child(expression.func));
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? 'New expression constructor did not close.',
        callee.openReasonKinds,
      );
    }
    if (callee.value.kind === EvaluationValueKind.BoundaryValue) {
      return bindingSourceValueEvaluationResult(callee.value, []);
    }
    if (callee.value.kind !== EvaluationValueKind.Class) {
      return openBindingSourceNeedsRuntimeValue('New expression constructor did not reduce to an evaluator-local class.');
    }
    const argumentsRead = this.evaluateCallArguments('New expression', expression.args, context);
    if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return argumentsRead.open
        ?? RuntimeBindingSourceValueEvaluation.open('New expression arguments did not close.');
    }
    const source = this.evaluationFrame.sourceForValue(callee.value);
    if (source == null) {
      return openBindingSourceMemberNoStaticValue('New expression class source module was not part of static project evaluation.');
    }
    const instance = this.evaluationFrame.instantiateClassValue(
      source,
      callee.value,
      callee.value.node ?? callee.value.declaration,
      argumentsRead.values,
    );
    return bindingSourceValueEvaluationResult(instance.value, instance.openSeams.map((seam) => seam.summary));
  }

  private evaluateTaggedTemplate(
    expression: TaggedTemplateExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateNode(context.child(expression.func));
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? 'TaggedTemplate tag function did not close.',
        callee.openReasonKinds,
      );
    }
    const expressions = this.evaluateCallArguments('TaggedTemplate expressions', expression.expressions, context);
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
    context: RuntimeBindingSourceValueEvaluationContext,
    thisValue: EvaluationValue | null = null,
    openSummaries: readonly string[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    const argumentsRead = this.evaluateCallArguments(label, args, context);
    if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return argumentsRead.open
        ?? RuntimeBindingSourceValueEvaluation.open(`${label} arguments did not close.`);
    }
    return this.evaluateFunctionLikeCallWithValues(label, callee, argumentsRead.values, thisValue, openSummaries);
  }

  private evaluateFunctionLikeCallWithValues(
    label: string,
    callee: EvaluationValue,
    argumentValues: readonly EvaluationValue[],
    thisValue: EvaluationValue | null = null,
    openSummaries: readonly string[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    if (callee.kind !== EvaluationValueKind.Function) {
      return openBindingSourceNeedsRuntimeValue(`${label} callee did not reduce to an evaluator-local function.`);
    }
    const source = this.evaluationFrame.sourceForValue(callee);
    if (source == null) {
      return openBindingSourceMemberNoStaticValue(`${label} function source module was not part of static project evaluation.`);
    }
    const read = this.evaluationFrame.callFunctionValue(source, callee, callee.node ?? source.sourceFile, argumentValues, thisValue);
    return bindingSourceValueEvaluationResult(read.value, [
      ...openSummaries,
      ...read.openSeams.map((seam) => seam.summary),
    ]);
  }

  private evaluateCallArguments(
    label: string,
    args: readonly ExpressionAstNode[],
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceArgumentsEvaluation {
    const values: EvaluationValue[] = [];
    for (let index = 0; index < args.length; index += 1) {
      const argument = this.evaluateNode(context.child(args[index]!));
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
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (slot.staticValue != null) {
      return RuntimeBindingSourceValueEvaluation.value(slot.staticValue);
    }
    const stateInitialValue = this.evaluateStateBindingInitialStateSlot(slot, scope);
    if (stateInitialValue != null) {
      return stateInitialValue;
    }
    if (slot.targetProductHandle == null) {
      if (slot.targetType != null) {
        return openBindingSourceSlotNoStaticValue(
          `Scope slot '${slot.name}' is runtime/local typed as '${slot.targetType.display ?? slot.targetType.shapeKind}', but it does not carry a static value carrier.`,
        );
      }
      return openBindingSourceSlotNoStaticValue(`Scope slot '${slot.name}' did not carry a TypeChecker member product.`);
    }
    const member = this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
    if (!(member instanceof CheckerTypeMember)) {
      return openBindingSourceSlotNoStaticValue(`Scope slot '${slot.name}' target product is not a TypeChecker member.`);
    }
    return this.evaluateMember(member, scope, context);
  }

  private evaluateStateBindingInitialStateSlot(
    slot: BindingContextSlot,
    scope: BindingScope | null,
  ): RuntimeBindingSourceValueEvaluation | null {
    if (scope?.ownerKind !== BindingScopeOwnerKind.StateBinding || scope.bindingContext.ownerProductHandle == null) {
      return null;
    }
    const storeConfiguration = this.store.productDetails.read(
      StateProductDetails.StoreConfiguration,
      scope.bindingContext.ownerProductHandle,
    );
    if (storeConfiguration?.initialStateSourceAddressHandle == null) {
      return null;
    }
    const initialState = this.evaluationFrame.evaluateSourceAddressExpression(
      this.store,
      storeConfiguration.initialStateSourceAddressHandle,
    );
    if (initialState == null) {
      return openBindingSourceSlotNoStaticValue(
        `State store '${storeConfiguration.name ?? 'default'}' initial-state source was not part of static project evaluation.`,
      );
    }
    return this.memberValues.property(
      initialState.value,
      slot.name,
      initialState.openSeams.map((seam) => seam.summary),
    );
  }

  private evaluateMember(
    member: CheckerTypeMember,
    scope: BindingScope | null,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const target = this.classValueTargetForMember(member, 'static value evaluation');
    if (target.target == null) {
      return openBindingSourceMemberNoStaticValue(target.openReason);
    }

    return this.evaluateClassMemberValue(target.target, member.name, scope, context);
  }

  private evaluateMemberCallTarget(
    member: CheckerTypeMember,
    scope: BindingScope | null,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceCallTargetEvaluation {
    const target = this.classValueTargetForMember(member, 'static call-target evaluation');
    if (target.target == null) {
      return RuntimeBindingSourceCallTargetEvaluation.open(
        openBindingSourceMemberNoStaticValue(target.openReason),
      );
    }

    const instance = this.evaluationFrame.instantiateClassValue(target.target.source, target.target.classValue, target.target.classNode);
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return RuntimeBindingSourceCallTargetEvaluation.open(
        bindingSourceValueEvaluationResult(instance.value, instance.openSeams.map((seam) => seam.summary)),
      );
    }
    this.applyBoundControllerValues(instance.value, scope, context);
    const read = this.evaluationFrame.readPropertyValue(target.target.source, instance.value, member.name, target.target.classNode);
    return new RuntimeBindingSourceCallTargetEvaluation(
      bindingSourceValueEvaluationResult(read.value, [
        ...instance.openSeams.map((seam) => seam.summary),
        ...read.openSeams.map((seam) => seam.summary),
      ]),
      instance.value,
      [],
    );
  }

  private evaluateClassMemberValue(
    target: RuntimeBindingSourceClassValueTarget,
    memberName: string,
    scope: BindingScope | null,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const instance = this.evaluationFrame.instantiateClassValue(target.source, target.classValue, target.classNode);
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return bindingSourceValueEvaluationResult(instance.value, instance.openSeams.map((seam) => seam.summary));
    }
    this.applyBoundControllerValues(instance.value, scope, context);
    const value = this.evaluationFrame.readPropertyValue(target.source, instance.value, memberName, target.classNode);
    return bindingSourceValueEvaluationResult(value.value, [
      ...instance.openSeams.map((seam) => seam.summary),
      ...value.openSeams.map((seam) => seam.summary),
    ]);
  }

  private classValueTargetForMember(
    member: CheckerTypeMember,
    purpose: string,
  ): RuntimeBindingSourceClassValueTargetRead {
    const declaration = member.carrier?.declarations[0] ?? null;
    const classNode = declaration == null ? null : enclosingClassLike(declaration);
    if (declaration == null || classNode == null || classNode.name == null) {
      return {
        target: null,
        openReason: `Member '${member.name}' does not have a named class declaration for ${purpose}.`,
      };
    }
    return this.classValueTargetForClassNode(
      classNode,
      classNode.name.text,
      `Member '${member.name}' source module was not part of static project evaluation.`,
      `Class '${classNode.name.text}' was not available as an evaluator class value.`,
    );
  }

  private classValueTargetForClassNode(
    classNode: ts.ClassLikeDeclarationBase,
    className: string,
    missingSourceReason: string,
    missingClassValueReason: string,
  ): RuntimeBindingSourceClassValueTargetRead {
    const source = this.evaluationFrame.sourceForNode(classNode);
    if (source == null) {
      return {
        target: null,
        openReason: missingSourceReason,
      };
    }
    const classValue = source.evaluation.environment.readValue(className);
    if (classValue?.kind !== EvaluationValueKind.Class) {
      return {
        target: null,
        openReason: missingClassValueReason,
      };
    }
    return {
      target: {
        classNode,
        classValue,
        source,
      },
      openReason: null,
    };
  }

  private applyBoundControllerValues(
    instance: EvaluationValue,
    scope: BindingScope | null,
    context: RuntimeBindingSourceValueEvaluationContext,
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
      const value = this.evaluateBoundControllerValueExpression(bound, expression, context);
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
    context: RuntimeBindingSourceValueEvaluationContext,
  ): EvaluationValue | null {
    if (bound.sourceScope == null) {
      return null;
    }
    const key = `${bound.controllerProductHandle}:${bound.propertyName}:${bound.bindingProductHandle}`;
    const sourceContext = context.projectBindingSourceValueContext(
      expression,
      bound.sourceScope,
      bound.sourceBindingBehavior,
      `bound-controller:${bound.propertyName}:${bound.bindingProductHandle}`,
      bound.sourceAddressHandle,
      bound.sourceStrictBinding,
      bound.sourceResourceScope,
      bound.sourceDefaultContainer,
    );
    if (sourceContext.context == null) {
      return new EvaluationBoundaryValue(
        EvaluationBoundaryKind.BindingScope,
        sourceContext.openReason ?? `Bound controller property '${bound.propertyName}' did not project to a source-value context.`,
        null,
      );
    }
    return context.withBoundControllerRead(
      key,
      () => new EvaluationBoundaryValue(
        EvaluationBoundaryKind.BindingScope,
        `Bound controller property '${bound.propertyName}' recursively depends on itself.`,
        null,
      ),
      () => {
        const evaluated = this.evaluateNode(sourceContext.context!);
        if (evaluated.kind === RuntimeBindingSourceValueEvaluationKind.Value && evaluated.value != null) {
          return evaluated.value;
        }
        return boundaryValueForOpenArgument(evaluated, expression);
      },
    );
  }

  private evaluateTemplate(
    expression: TemplateExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateStringParts(expression.cooked, expression.expressions, context);
  }

  private evaluateInterpolation(
    expression: Interpolation,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateStringParts(expression.parts, expression.expressions, context);
  }

  private evaluateStringParts(
    parts: readonly string[],
    expressions: readonly ExpressionAstNode[],
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (parts.length !== expressions.length + 1) {
      return openBindingSourceUnsupportedExpression('Template/interpolation parts do not align with expression holes.');
    }
    const builder = new EvaluationStringPatternBuilder(parts[0] ?? '');
    for (let index = 0; index < expressions.length; index += 1) {
      const evaluated = this.evaluateNode(context.child(expressions[index]!));
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
        return openBindingSourceUnsupportedExpression(`Expression hole ${index} did not reduce to a primitive value.`);
      }
    }
    return RuntimeBindingSourceValueEvaluation.value(builder.build(null));
  }

  private evaluateBinary(
    expression: BinaryExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (expression.operation === '||' || expression.operation === '&&' || expression.operation === '??') {
      return this.evaluateShortCircuitBinary(expression, context);
    }
    const left = this.evaluateNode(context.child(expression.left));
    if (expression.operation === '+') {
      const leftValue = valueOrBoundaryForOpen(left, expression.left);
      if (leftValue == null) {
        return RuntimeBindingSourceValueEvaluation.open(
          left.openReason ?? "Left operand for '+' did not close.",
          left.openReasonKinds,
        );
      }
      const right = this.evaluateNode(context.child(expression.right));
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
    const right = this.evaluateNode(context.child(expression.right));
    if (right.kind === RuntimeBindingSourceValueEvaluationKind.Open || right.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        right.openReason ?? `Right operand for '${expression.operation}' did not close.`,
        right.openReasonKinds,
      );
    }
    const operation = staticBinaryOperationForRuntimeBinding(expression.operation);
    if (operation == null) {
      return openBindingSourceUnsupportedExpression(`Binary operator '${expression.operation}' is type-visible but not value-reduced by binding-source value flow.`);
    }
    const value = evaluateStaticBinaryOperation(operation, left.value, right.value, null);
    return value == null
      ? openBindingSourceUnsupportedExpression(`Binary operator '${expression.operation}' did not reduce over known operands.`)
      : RuntimeBindingSourceValueEvaluation.value(value);
  }

  private evaluateShortCircuitBinary(
    expression: BinaryExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const left = this.evaluateNode(context.child(expression.left));
    if (left.kind === RuntimeBindingSourceValueEvaluationKind.Open || left.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        left.openReason ?? `Left operand for '${expression.operation}' did not close.`,
        left.openReasonKinds,
      );
    }
    if (expression.operation === '??') {
      return left.value.kind === EvaluationValueKind.Null || left.value.kind === EvaluationValueKind.Undefined
        ? this.evaluateNode(context.child(expression.right))
        : left;
    }
    const truthy = readEvaluationTruthiness(left.value);
    if (truthy == null) {
      return openBindingSourceUnsupportedExpression(`Left operand for '${expression.operation}' did not reduce to known truthiness.`);
    }
    return expression.operation === '||'
      ? truthy ? left : this.evaluateNode(context.child(expression.right))
      : truthy ? this.evaluateNode(context.child(expression.right)) : left;
  }

  private evaluateUnary(
    expression: UnaryExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const value = this.evaluateNode(context.child(expression.expression));
    if (value.kind === RuntimeBindingSourceValueEvaluationKind.Open || value.value == null) {
      return value;
    }
    switch (expression.operation) {
      case '!':
      case '+':
      case '-':
      case 'typeof':
      case 'void': {
        const unaryValue = evaluateStaticUnaryOperation(expression.operation, value.value, null);
        return unaryValue == null
          ? openBindingSourceUnsupportedExpression(`Unary operator '${expression.operation}' did not reduce over a known operand.`)
          : RuntimeBindingSourceValueEvaluation.value(unaryValue);
      }
      default:
        return openBindingSourceUnsupportedExpression(`Unary operator '${expression.operation}' is not value-reduced by binding-source value flow.`);
    }
  }

  private evaluateConditional(
    expression: ConditionalExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const condition = this.evaluateNode(context.child(expression.condition));
    if (condition.kind === RuntimeBindingSourceValueEvaluationKind.Open || condition.value == null) {
      return condition;
    }
    const truthy = readEvaluationTruthiness(condition.value);
    if (truthy == null) {
      return this.evaluateConditionalBranchRepresentative(expression, context)
        ?? openBindingSourceUnsupportedExpression('Conditional expression condition did not reduce to known truthiness.');
    }
    return this.evaluateNode(context.child(truthy ? expression.yes : expression.no));
  }

  private evaluateConditionalBranchRepresentative(
    expression: ConditionalExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
    const yes = valueOrBoundaryForOpen(this.evaluateNode(context.child(expression.yes)), expression.yes);
    const no = valueOrBoundaryForOpen(this.evaluateNode(context.child(expression.no)), expression.no);
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
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
    if (contextAccessExpression(expression.object) == null) {
      return null;
    }
    const key = this.evaluateNode(context.child(expression.key));
    if (key.kind === RuntimeBindingSourceValueEvaluationKind.Open || key.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        key.openReason ?? 'Keyed context access key did not close.',
        key.openReasonKinds,
      );
    }
    const propertyName = evaluationPropertyKeyString(key.value);
    return propertyName == null
      ? openBindingSourceUnsupportedExpression(`Keyed context access key reduced to '${key.value.kind}', which is not a static property key.`)
      : this.evaluateContextMemberForOwner(expression.object, propertyName, context);
  }

  private evaluateContextMemberForOwner(
    owner: ExpressionAstNode,
    propertyName: string,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
    const scope = context.scope;
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
          context,
        );
      case 'AccessBoundary': {
        const boundary = scope.locateBoundary();
        return boundary == null
          ? RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined)
          : this.evaluateContextMember(boundary, boundary.bindingContext, propertyName, 'boundary binding context', context);
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
      return openBindingSourceSlotNoStaticValue(`${label} did not resolve to a binding context.`);
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
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    return this.evaluateContextMember(lookup.scope, lookup.context, propertyName, label, context);
  }

  private evaluateContextMember(
    scope: BindingScope | null,
    context: BindingScopeContext | null,
    propertyName: string,
    label: string,
    request: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (context == null) {
      return openBindingSourceSlotNoStaticValue(`${label} did not resolve to a binding context for member '${propertyName}'.`);
    }
    const slot = context.lookup(propertyName);
    return slot == null
      ? openBindingSourceSlotNoStaticValue(`${label} did not expose a TypeChecker member slot for '${propertyName}'.`)
      : this.evaluateSlot(slot, scope, request);
  }

  private evaluateScopeCallTarget(
    name: string,
    ancestor: number,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceCallTargetEvaluation {
    const lookup = context.scope.locate(name, ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return RuntimeBindingSourceCallTargetEvaluation.open(
        openBindingSourceSlotNoStaticValue(`Could not resolve ancestor ${ancestor} for '${name}'.`),
      );
    }
    if (lookup.slot == null) {
      return RuntimeBindingSourceCallTargetEvaluation.open(
        openBindingSourceSlotNoStaticValue(`Scope lookup for '${name}' did not expose a TypeChecker member slot.`),
      );
    }
    return this.evaluateContextSlotCallTarget(
      lookup.scope,
      lookup.context,
      lookup.slot,
      `${lookup.lookupKind}:${name}`,
      context,
    );
  }

  private evaluateContextMemberCallTargetForOwner(
    owner: ExpressionAstNode,
    propertyName: string,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceCallTargetEvaluation | null {
    const contextOwner = contextAccessExpression(owner);
    if (contextOwner == null) {
      return null;
    }
    switch (contextOwner.$kind) {
      case 'AccessThis':
        return this.evaluateContextMemberCallTargetForLookup(
          context.scope.locateThis(contextOwner.ancestor),
          propertyName,
          `$this ancestor ${contextOwner.ancestor}`,
          context,
        );
      case 'AccessBoundary': {
        const boundary = context.scope.locateBoundary();
        return boundary == null
          ? RuntimeBindingSourceCallTargetEvaluation.nullishOwner(RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined))
          : this.evaluateContextSlotCallTarget(
              boundary,
              boundary.bindingContext,
              boundary.bindingContext.lookup(propertyName),
              'boundary binding context',
              context,
            );
      }
      default:
        return null;
    }
  }

  private evaluateContextMemberCallTargetForLookup(
    lookup: BindingScopeLocatedLookup,
    propertyName: string,
    label: string,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceCallTargetEvaluation {
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return RuntimeBindingSourceCallTargetEvaluation.nullishOwner(RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined));
    }
    return this.evaluateContextSlotCallTarget(
      lookup.scope,
      lookup.context,
      lookup.context?.lookup(propertyName) ?? null,
      label,
      context,
    );
  }

  private evaluateContextSlotCallTarget(
    scope: BindingScope | null,
    bindingContext: BindingScopeContext | null,
    slot: BindingContextSlot | null,
    label: string,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceCallTargetEvaluation {
    if (bindingContext == null) {
      return RuntimeBindingSourceCallTargetEvaluation.open(
        openBindingSourceSlotNoStaticValue(`${label} did not resolve to a binding context for a call target.`),
      );
    }
    if (slot == null) {
      return RuntimeBindingSourceCallTargetEvaluation.open(
        openBindingSourceSlotNoStaticValue(`${label} did not expose a TypeChecker member slot for a call target.`),
      );
    }

    const bound = bindingContext === scope?.bindingContext
      ? this.evaluateBoundControllerValue(scope, slot.name, context)
      : null;
    if (bound != null) {
      return new RuntimeBindingSourceCallTargetEvaluation(
        bound,
        this.contextReceiverValue(scope, bindingContext, label, context),
        [],
      );
    }

    const member = this.checkerMemberForSlot(slot);
    if (member != null && bindingContext === scope?.bindingContext) {
      return this.evaluateMemberCallTarget(member, scope, context);
    }

    const callee = this.evaluateSlot(slot, scope, context);
    return new RuntimeBindingSourceCallTargetEvaluation(
      callee,
      this.contextReceiverValue(scope, bindingContext, label, context),
      [],
    );
  }

  private contextReceiverValue(
    scope: BindingScope | null,
    context: BindingScopeContext,
    label: string,
    request: RuntimeBindingSourceValueEvaluationContext,
  ): EvaluationValue {
    const instance = context === scope?.bindingContext
      ? this.evaluateBindingContextInstance(scope, context, request)
      : null;
    return instance ?? this.contextBoundaryObject(scope, context, label);
  }

  private evaluateBindingContextInstance(
    scope: BindingScope | null,
    context: BindingScopeContext,
    request: RuntimeBindingSourceValueEvaluationContext,
  ): EvaluationValue | null {
    const classNode = this.classNodeForContextType(context);
    if (classNode?.name == null) {
      return null;
    }
    const target = this.classValueTargetForClassNode(
      classNode,
      classNode.name.text,
      `Binding context class '${classNode.name.text}' source module was not part of static project evaluation.`,
      `Binding context class '${classNode.name.text}' was not available as an evaluator class value.`,
    );
    if (target.target == null) {
      return null;
    }
    const instance = this.evaluationFrame.instantiateClassValue(
      target.target.source,
      target.target.classValue,
      target.target.classNode,
    );
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return null;
    }
    this.applyBoundControllerValues(instance.value, scope, request);
    return instance.value;
  }

  private classNodeForContextType(
    context: BindingScopeContext,
  ): ts.ClassLikeDeclarationBase | null {
    const productHandle = context.contextType?.productHandle ?? null;
    if (productHandle == null) {
      return null;
    }
    const typeShape = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
    for (const declaration of typeShape?.carrier?.declarations ?? []) {
      const classNode = enclosingClassLike(declaration);
      if (classNode != null) {
        return classNode;
      }
    }
    return null;
  }

  private contextBoundaryObject(
    scope: BindingScope | null,
    context: BindingScopeContext,
    label: string,
  ): EvaluationBoundaryObjectValue {
    const properties = new Map<string, EvaluationObjectProperty>();
    for (const slot of context.slots) {
      if (slot.staticValue != null) {
        properties.set(slot.name, new EvaluationObjectProperty(slot.name, slot.staticValue, null));
      }
    }
    return new EvaluationBoundaryObjectValue(
      EvaluationBoundaryKind.BindingScope,
      scope == null ? label : `${label}:${scope.productHandle}`,
      properties,
    );
  }

  private checkerMemberForSlot(slot: BindingContextSlot): CheckerTypeMember | null {
    if (slot.targetProductHandle == null) {
      return null;
    }
    const member = this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
    return member instanceof CheckerTypeMember ? member : null;
  }

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

function isNullishValue(value: EvaluationValue): boolean {
  return value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined;
}

function nullishSourceValueResult(
  context: RuntimeBindingSourceValueEvaluationContext,
  strictReason: string,
): RuntimeBindingSourceValueEvaluation {
  if (context.strictBinding === false) {
    return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
  }
  return RuntimeBindingSourceValueEvaluation.open(
    context.strictBinding === true
      ? strictReason
      : `${strictReason} Binding strictness is unknown, so source-value reduction cannot choose between a thrown runtime error and undefined.`,
    [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
  );
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

function accessGlobalName(
  expression: ExpressionAstNode,
): string | null {
  return expression.$kind === 'AccessGlobal' ? expression.name.name : null;
}

function runtimeBindingSourceValueFromGlobalIntrinsic(
  result: AureliaGlobalIntrinsicEvaluation,
): RuntimeBindingSourceValueEvaluation {
  switch (result.kind) {
    case AureliaGlobalIntrinsicEvaluationKind.Value:
      return RuntimeBindingSourceValueEvaluation.value(result.value);
    case AureliaGlobalIntrinsicEvaluationKind.RuntimeOpen:
      return openBindingSourceNeedsRuntimeValue(result.reason);
    case AureliaGlobalIntrinsicEvaluationKind.Unsupported:
      return openBindingSourceUnsupportedExpression(result.reason);
  }
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

/** Callee plus Aurelia receiver object for a binding-source call before argument evaluation. */
class RuntimeBindingSourceCallTargetEvaluation {
  constructor(
    readonly callee: RuntimeBindingSourceValueEvaluation,
    readonly thisValue: EvaluationValue | null,
    readonly openSummaries: readonly string[] = [],
    readonly nullishKind: RuntimeBindingSourceCallTargetNullishKind | null = null,
  ) {}

  static open(callee: RuntimeBindingSourceValueEvaluation): RuntimeBindingSourceCallTargetEvaluation {
    return new RuntimeBindingSourceCallTargetEvaluation(callee, null);
  }

  static nullishOwner(callee: RuntimeBindingSourceValueEvaluation): RuntimeBindingSourceCallTargetEvaluation {
    return new RuntimeBindingSourceCallTargetEvaluation(callee, null, [], RuntimeBindingSourceCallTargetNullishKind.Owner);
  }
}

const enum RuntimeBindingSourceCallTargetNullishKind {
  /** The call target is nullish because the call owner could not be reached before member lookup. */
  Owner = 'owner',
  /** The call target is nullish after member lookup reached a nullish callee value. */
  Callee = 'callee',
}

interface ValueConverterCallerContextRead {
  readonly value: boolean;
  readonly open: RuntimeBindingSourceValueEvaluation | null;
}

function valueConverterCallerContext(
  expression: ValueConverterExpression,
): EvaluationObjectValue {
  return new EvaluationObjectValue(
    new Map([
      ['source', new EvaluationObjectProperty(
        'source',
        new EvaluationBoundaryObjectValue(
          EvaluationBoundaryKind.BindingScope,
          `value-converter.${expression.name.name}.caller.source`,
        ),
        null,
      )],
      ['binding', new EvaluationObjectProperty(
        'binding',
        new EvaluationBoundaryObjectValue(
          EvaluationBoundaryKind.BindingScope,
          `value-converter.${expression.name.name}.caller.binding`,
        ),
        null,
      )],
    ]),
    false,
    null,
  );
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

function evaluatePlus(
  left: EvaluationValue,
  right: EvaluationValue,
): RuntimeBindingSourceValueEvaluation {
  const pattern = evaluationStringPatternFromConcatenation(left, right, null);
  if (pattern != null) {
    return RuntimeBindingSourceValueEvaluation.value(pattern);
  }
  if (!isEvaluationPrimitiveValue(left) || !isEvaluationPrimitiveValue(right)) {
    return openBindingSourceUnsupportedExpression("Binary '+' operands did not both reduce to primitive values.");
  }
  const leftPrimitive = readEvaluationPrimitive(left);
  const rightPrimitive = readEvaluationPrimitive(right);
  if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationStringValue(String(leftPrimitive) + String(rightPrimitive), null));
  }
  if (typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number') {
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(leftPrimitive + rightPrimitive, null));
  }
  return openBindingSourceUnsupportedExpression("Binary '+' operands did not reduce to a string or numeric result.");
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
    case 'in':
    case 'instanceof':
      return operation;
    default:
      return null;
  }
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
