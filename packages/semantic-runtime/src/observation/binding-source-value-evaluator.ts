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
import type { EvaluationAbruptCompletion } from '../evaluation/completion.js';
import { openSeamReasonKindsForEvaluationRead } from '../evaluation/boundary-open-reason.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import { unretainedEvaluationOpenSeams } from '../evaluation/value-pressure.js';
import {
  evaluateStaticBinaryOperation,
  evaluateStaticUnaryOperation,
  evaluationPropertyKeyString,
  type StaticBinaryOperation,
} from '../evaluation/operators.js';
import {
  StaticGlobalIntrinsicEvaluationKind,
  evaluateStaticGlobalAccess,
  evaluateStaticGlobalCall,
  evaluateStaticGlobalConstructor,
  evaluateStaticGlobalMemberCall,
  type StaticGlobalIntrinsicEvaluation,
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
  EvaluationObjectPropertyState,
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
  type EvaluationInstanceValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { KernelSourceFileReadView } from '../kernel/store.js';
import type { Container } from '../di/container.js';
import {
  TypeSystemHotDetails,
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import {
  CheckerStrictTrueComparisonKind,
} from '../type-system/checker-type-member-surface.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import {
  CheckerTypeMember,
  CheckerTypeMemberKind,
  CheckerTypeShapeKind,
} from '../type-system/type-shape.js';
import { readCheckerTypeShapeByProductHandle } from '../type-system/checker-type-shape-access.js';
import { readOrProjectCheckerTypeMembersInProjection } from '../type-system/checker-type-member-surface.js';
import {
  type RuntimeValueConverterMethodName,
  VALUE_CONVERTER_TO_VIEW_METHOD,
  VALUE_CONVERTER_WITH_CONTEXT_PROPERTY,
  valueConverterWithContextComparisonKindForReference,
} from '../type-system/value-converter-call-surface.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { bindingExpressionAstForProduct } from '../template/expression-parse-product.js';
import {
  findVisibleTemplateResource,
  readVisibleTemplateResourceDefinition,
} from '../template/compiler-resource-lookup.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import {
  PropertyBinding,
} from '../template/runtime-binding.js';
import { RuntimeBindingSourceEvaluationFrame } from './binding-source-evaluation-frame.js';
import { RuntimeBindingSourceArrayMethodEvaluator } from './binding-source-array-method-value.js';
import { RuntimeBindingSourceMemberValueReader } from './binding-source-member-value.js';
import {
  bindingSourceValueEvaluationForRead,
  bindingSourceValueEvaluationResult,
  bindingSourceValueEvaluationWithPressure,
  openBindingSourceMemberNoStaticValue,
  openBindingSourceNeedsRuntimeValue,
  openBindingSourceSlotNoStaticValue,
  openBindingSourceUnsupportedExpression,
  RuntimeBindingSourceValueEvaluation,
  RuntimeBindingSourceValueEvaluationClosure,
} from '../configuration/binding-source-value-evaluation.js';
import { RuntimeBindingSourceValueEvaluationContext } from './binding-source-value-evaluation-context.js';
import {
  runtimeBindingSourceValueExpressionSupportForKind,
} from './binding-source-value-expression-support.js';
import type { DiProviderActivationView } from '../di/provider-activation.js';
import {
  RuntimeBoundControllerValueTable,
  type RuntimeBoundControllerPropertyValue,
} from './runtime-bound-controller-value.js';
import { StateProductDetails } from '../state/product-details.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { ValueConverterDefinition } from '../resources/value-converter-definition.js';
import { RuntimeOperationReachability } from '../runtime-expression/runtime-operation.js';

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

export const enum RuntimeValueConverterInstancePropertyReadState {
  /** Checker and evaluator agree that the instance property has no runtime value. */
  Absent = 'absent',
  /** The evaluator retained one exact final property value. */
  Closed = 'closed',
  /** The property may exist or change, while any retained value remains useful evidence. */
  Open = 'open',
}

/** Raw converter-instance property evidence before a consumer applies domain-specific value policy. */
export class RuntimeValueConverterInstancePropertyRead {
  constructor(
    readonly state: RuntimeValueConverterInstancePropertyReadState,
    readonly value: EvaluationValue | null,
    readonly property: EvaluationObjectProperty | null,
    readonly openReasons: readonly string[],
    readonly openReasonKinds: readonly OpenSeamReasonKind[],
    readonly abruptCompletion: EvaluationAbruptCompletion | null = null,
  ) {}
}

interface RuntimeValueConverterInstanceRead {
  readonly instance: EvaluationInstanceValue | null;
  readonly open: RuntimeBindingSourceValueEvaluation | null;
  readonly openReasons: readonly string[];
  readonly openReasonKinds: readonly OpenSeamReasonKind[];
}

/**
 * Evaluates Aurelia binding-source expressions against modeled runtime Scope plus the static ECMAScript evaluator.
 *
 * This is intentionally binding-owned substrate. Consumers such as router resources can ask whether a binding source
 * carries a static value, but source lookup, view-model member access, and getter execution stay with the binding flow.
 */
export class RuntimeBindingSourceValueEvaluator {
  private readonly arrayMethods: RuntimeBindingSourceArrayMethodEvaluator;
  private readonly memberValues: RuntimeBindingSourceMemberValueReader;
  private readonly valueConverterInstances = new Map<string, RuntimeValueConverterInstanceRead>();

  private constructor(
    readonly kernel: KernelSourceFileReadView,
    readonly projector: CheckerTypeProjector,
    readonly evaluation: StaticProjectEvaluationResult,
    private readonly evaluationFrame: RuntimeBindingSourceEvaluationFrame,
    readonly boundControllerValues: RuntimeBoundControllerValueTable = RuntimeBoundControllerValueTable.empty,
    readonly activationView: DiProviderActivationView | null = null,
    private readonly defaultActiveContainer: Container | null = null,
  ) {
    this.arrayMethods = new RuntimeBindingSourceArrayMethodEvaluator(
      kernel,
      (context) => this.evaluateNode(context),
    );
    this.memberValues = new RuntimeBindingSourceMemberValueReader(this.evaluationFrame);
  }

  static create(
    kernel: KernelSourceFileReadView,
    projector: CheckerTypeProjector,
    evaluation: StaticProjectEvaluationResult,
    boundControllerValues: RuntimeBoundControllerValueTable = RuntimeBoundControllerValueTable.empty,
    activationView: DiProviderActivationView | null = null,
    defaultActiveContainer: Container | null = null,
  ): RuntimeBindingSourceValueEvaluator {
    return new RuntimeBindingSourceValueEvaluator(
      kernel,
      projector,
      evaluation,
      new RuntimeBindingSourceEvaluationFrame(evaluation, activationView),
      boundControllerValues,
      activationView,
      defaultActiveContainer,
    );
  }

  /** Returns a source-value evaluator whose root requests default to the supplied DI activation container. */
  /** Read one app-owned converter instance field without collapsing retained values when evaluation remains open. */
  readValueConverterInstanceProperty(
    definition: ValueConverterDefinition,
    propertyName: string,
    activeContainer: Container | null,
  ): RuntimeValueConverterInstancePropertyRead {
    return this.evaluationFrame.withActiveContainer(
      activeContainer,
      () => this.readValueConverterInstancePropertyInFrame(definition, propertyName, activeContainer),
    );
  }

  /** Recover the evaluated source module that owns an evaluator-retained syntax node. */
  readEvaluatedSourceForNode(node: ts.Node): EvaluatedProjectSource | null {
    return this.evaluationFrame.sourceForNode(node);
  }

  evaluate(
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluationFrame.withActiveContainer(
      context.containerOrDefault(this.defaultActiveContainer),
      () => this.evaluateNode(context),
    );
  }

  /** Evaluate one exact parent binding that supplies a child-controller property. */
  evaluateBoundControllerPropertyValue(
    bound: RuntimeBoundControllerPropertyValue,
  ): RuntimeBindingSourceValueEvaluation {
    const sourceScope = bound.sourceScope;
    if (sourceScope == null) {
      return openBindingSourceSlotNoStaticValue(
        `Bound controller property '${bound.propertyName}' did not retain its parent binding Scope.`,
      );
    }
    const expression = bindingExpressionAstForProduct(this.projector.publication, bound.expressionProductHandle);
    if (expression == null) {
      return openBindingSourceSlotNoStaticValue(
        `Bound controller property '${bound.propertyName}' did not retain a runtime-accepted binding expression.`,
      );
    }
    const context = RuntimeBindingSourceValueEvaluationContext.knownScope(
      expression,
      sourceScope,
      bound.sourceDefaultContainer,
      bound.sourceResourceScope,
      bound.sourceStrictBinding,
    );
    return this.evaluationFrame.withActiveContainer(
      context.containerOrDefault(this.defaultActiveContainer),
      () => this.evaluateBoundControllerValueRow(bound, expression, sourceScope, context),
    );
  }

  private evaluateNode(
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (context.sourceEvaluationReachability !== RuntimeOperationReachability.Reached) {
      return RuntimeBindingSourceValueEvaluation.open(
        `Runtime binding source evaluation was blocked because its expression-resource bind phase was '${context.sourceEvaluationReachability}'.`,
        [OpenSeamReasonKind.BindingSourceResourceOpen],
      );
    }
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
    const inputValue = input.executableValue;
    if (inputValue == null) {
      return input;
    }

    const argumentsRead = this.evaluateCallArguments(`ValueConverter '${expression.name.name}'`, expression.args, context);
    if (argumentsRead.blocking != null) {
      return bindingSourceValueEvaluationWithPressure(argumentsRead.blocking, [input]);
    }
    const inputPressure = [input, ...argumentsRead.pressure];

    const definition = this.valueConverterDefinition(expression, context.resourceScope);
    if (definition == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceUnsupportedExpression(
          `Value converter '${expression.name.name}' was not resolved through the current compiler resource scope.`,
        ),
        inputPressure,
      );
    }

    const instanceRead = this.readValueConverterInstance(
      definition,
      context.containerOrDefault(this.defaultActiveContainer),
    );
    if (instanceRead.instance == null) {
      return bindingSourceValueEvaluationWithPressure(
        instanceRead.open
          ?? openBindingSourceNeedsRuntimeValue(`Value converter '${definition.name}' instance did not close.`),
        inputPressure,
      );
    }
    const instancePressure = bindingSourceValueEvaluationResult(
      instanceRead.instance,
      instanceRead.openReasons,
      null,
      instanceRead.openReasonKinds,
    );

    const methodRead = this.evaluateValueConverterMethod(instanceRead.instance, VALUE_CONVERTER_TO_VIEW_METHOD);
    const method = methodRead.executableValue;
    if (method == null) {
      return bindingSourceValueEvaluationWithPressure(methodRead, [...inputPressure, instancePressure]);
    }
    if (method.kind === EvaluationValueKind.Undefined) {
      return bindingSourceValueEvaluationWithPressure(input, [
        ...argumentsRead.pressure,
        instancePressure,
        methodRead,
      ]);
    }
    if (method.kind !== EvaluationValueKind.Function) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue(
          `Value converter '${definition.name}' toView member did not reduce to an evaluator-local function.`,
        ),
        [...inputPressure, instancePressure, methodRead],
      );
    }

    const withContext = this.valueConverterUsesCallerContext(instanceRead.instance, definition);
    if (withContext.open != null) {
      return bindingSourceValueEvaluationWithPressure(
        withContext.open,
        [...inputPressure, instancePressure, methodRead],
      );
    }
    const callArguments = [
      inputValue,
      ...(withContext.value ? [valueConverterCallerContext(expression)] : []),
      ...argumentsRead.values,
    ];
    return bindingSourceValueEvaluationWithPressure(
      this.evaluateValueConverterCall(definition, method, instanceRead.instance, callArguments),
      [...inputPressure, instancePressure, methodRead],
    );
  }

  private valueConverterDefinition(
    expression: ValueConverterExpression,
    resourceScope: TemplateResourceScope | null,
  ): ValueConverterDefinition | null {
    const resource = findVisibleTemplateResource(resourceScope, ResourceDefinitionKind.ValueConverter, expression.name.name);
    const definition = readVisibleTemplateResourceDefinition(this.projector.publication, resource);
    return definition?.type === ResourceDefinitionKind.ValueConverter
      ? definition
      : null;
  }

  private readValueConverterInstance(
    definition: ValueConverterDefinition,
    activeContainer: Container | null,
  ): RuntimeValueConverterInstanceRead {
    const cacheKey = `${definition.productHandle ?? definition.target.addressHandle ?? definition.name}:${activeContainer?.identityHandle ?? 'no-container'}`;
    const cached = this.valueConverterInstances.get(cacheKey);
    if (cached != null) {
      return cached;
    }
    const read = this.readUncachedValueConverterInstance(definition);
    this.valueConverterInstances.set(cacheKey, read);
    return read;
  }

  private readUncachedValueConverterInstance(
    definition: ValueConverterDefinition,
  ): RuntimeValueConverterInstanceRead {
    if (definition.target.addressHandle == null) {
      return openValueConverterInstance(`Value converter '${definition.name}' target does not carry an authored value address.`);
    }
    const target = this.evaluationFrame.evaluateSourceAddressExpression(
      this.kernel,
      definition.target.addressHandle,
    );
    if (target == null) {
      return openValueConverterInstance(`Value converter '${definition.name}' target was not part of static project evaluation.`);
    }
    if (target.value == null) {
      return openValueConverterInstance(
        `Value converter '${definition.name}' target evaluation completed abruptly.`,
        target.abruptCompletion,
      );
    }
    const targetOpenReasons = target.openSeams.map((seam) => seam.summary);
    if (target.value.kind === EvaluationValueKind.Instance) {
      return {
        instance: target.value,
        open: null,
        openReasons: targetOpenReasons,
        openReasonKinds: openSeamReasonKindsForEvaluationRead(target),
      };
    }
    if (target.value.kind !== EvaluationValueKind.Class) {
      return openValueConverterInstance(`Value converter '${definition.name}' target did not reduce to an evaluator-local class or instance.`);
    }
    const source = this.evaluationFrame.sourceForValue(target.value);
    if (source == null) {
      return openValueConverterInstance(`Value converter '${definition.name}' target class source module was not part of static project evaluation.`);
    }
    const instance = this.evaluationFrame.instantiateClassValue(
      source,
      target.value,
      target.value.node ?? target.value.declaration,
    );
    if (instance.value == null) {
      return openValueConverterInstance(
        `Value converter '${definition.name}' constructor completed abruptly.`,
        instance.abruptCompletion,
      );
    }
    return instance.value.kind === EvaluationValueKind.Instance
      ? {
          instance: instance.value,
          open: null,
          openReasons: [
            ...targetOpenReasons,
            ...instance.value.constructionOpenSeams.map((seam) => seam.summary),
          ],
          openReasonKinds: [
            ...new Set([
              ...openSeamReasonKindsForEvaluationRead(target),
              ...openSeamReasonKindsForEvaluationRead({
                value: instance.value,
                openSeams: instance.value.constructionOpenSeams,
                abruptCompletion: null,
              }),
            ]),
          ],
        }
      : openValueConverterInstance(`Value converter '${definition.name}' constructor did not produce an evaluator-local instance.`);
  }

  private readValueConverterInstancePropertyInFrame(
    definition: ValueConverterDefinition,
    propertyName: string,
    activeContainer: Container | null,
  ): RuntimeValueConverterInstancePropertyRead {
    const checker = this.readValueConverterCheckerProperty(definition, propertyName);
    const instanceRead = this.readValueConverterInstance(definition, activeContainer);
    if (instanceRead.instance == null) {
      return checker.absenceProven && instanceRead.open?.abruptCompletion == null
        ? new RuntimeValueConverterInstancePropertyRead(
            RuntimeValueConverterInstancePropertyReadState.Absent,
            null,
            null,
            [],
            [],
          )
        : new RuntimeValueConverterInstancePropertyRead(
            RuntimeValueConverterInstancePropertyReadState.Open,
            null,
            null,
            [
              instanceRead.open?.openReason
                ?? checker.openReason
                ?? `Value converter '${definition.name}' property '${propertyName}' could not be read from a static instance.`,
            ],
            instanceRead.open?.openReasonKinds ?? [],
            instanceRead.open?.abruptCompletion ?? null,
          );
    }

    const instance = instanceRead.instance;
    const property = instance.properties.get(propertyName) ?? null;
    const source = this.evaluationFrame.sourceForValue(instance);
    if (source == null) {
      return new RuntimeValueConverterInstancePropertyRead(
        RuntimeValueConverterInstancePropertyReadState.Open,
        property?.value ?? null,
        property,
        [
          ...instanceRead.openReasons,
          `Value converter '${definition.name}' instance source was not part of static project evaluation.`,
        ],
        instanceRead.openReasonKinds,
      );
    }

    const valueRead = this.evaluationFrame.readPropertyValue(
      source,
      instance,
      propertyName,
      property?.node ?? instance.node ?? source.sourceFile,
    );
    const openReasons = [
      ...instanceRead.openReasons,
      ...valueRead.openSeams.map((seam) => seam.summary),
    ];
    if (valueRead.value == null) {
      return new RuntimeValueConverterInstancePropertyRead(
        RuntimeValueConverterInstancePropertyReadState.Open,
        null,
        property,
        openReasons.length > 0
          ? openReasons
          : [`Value converter '${definition.name}' property '${propertyName}' completed abruptly.`],
        [
          ...new Set([
            ...instanceRead.openReasonKinds,
            ...openSeamReasonKindsForEvaluationRead(valueRead),
          ]),
        ],
        valueRead.abruptCompletion,
      );
    }
    if ((valueRead.value.kind === EvaluationValueKind.Undefined || valueRead.value.kind === EvaluationValueKind.Null)
      && openReasons.length === 0
      && property?.state !== EvaluationObjectPropertyState.Open) {
      return new RuntimeValueConverterInstancePropertyRead(
        RuntimeValueConverterInstancePropertyReadState.Absent,
        valueRead.value,
        property,
        [],
        [],
      );
    }
    const valueIsOpen = valueRead.value.kind === EvaluationValueKind.Unknown
      || valueRead.value.kind === EvaluationValueKind.BoundaryValue;
    return new RuntimeValueConverterInstancePropertyRead(
      openReasons.length > 0 || valueIsOpen || property?.state === EvaluationObjectPropertyState.Open
        ? RuntimeValueConverterInstancePropertyReadState.Open
        : RuntimeValueConverterInstancePropertyReadState.Closed,
      valueRead.value,
      property,
      valueIsOpen
        ? [
            ...openReasons,
            valueRead.value.kind === EvaluationValueKind.Unknown
              ? valueRead.value.reason
              : valueRead.value.reason,
          ]
        : openReasons,
      [
        ...new Set([
          ...instanceRead.openReasonKinds,
          ...openSeamReasonKindsForEvaluationRead(valueRead),
        ]),
      ],
    );
  }

  private readValueConverterCheckerProperty(
    definition: ValueConverterDefinition,
    propertyName: string,
  ): { readonly absenceProven: boolean; readonly openReason: string | null } {
    const shape = readCheckerTypeShapeByProductHandle(
      this.projector.publication,
      definition.target.targetType?.productHandle,
    );
    if (shape == null
      || shape.shapeKind === CheckerTypeShapeKind.Any
      || shape.shapeKind === CheckerTypeShapeKind.Unknown
      || shape.shapeKind === CheckerTypeShapeKind.TypeParameter
      || shape.shapeKind === CheckerTypeShapeKind.Unclassified
      || shape.shapeKind === CheckerTypeShapeKind.Union) {
      return {
        absenceProven: false,
        openReason: `Value converter '${definition.name}' checker surface cannot prove whether '${propertyName}' is present.`,
      };
    }
    const members = readOrProjectCheckerTypeMembersInProjection(
      this.projector,
      shape,
      `value-converter:${definition.productHandle ?? definition.name}:${propertyName}`,
    );
    const memberIsVisible = members.some((member) => member.name === propertyName);
    const hasIndexSignature = members.some((member) => member.memberKind === CheckerTypeMemberKind.IndexSignature);
    return {
      absenceProven: !memberIsVisible && !hasIndexSignature,
      openReason: memberIsVisible || !hasIndexSignature
        ? null
        : `Value converter '${definition.name}' has an open checker index surface for '${propertyName}'.`,
    };
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
    return bindingSourceValueEvaluationForRead(read);
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
      this.projector,
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
    if (read.value == null) {
      return {
        value: false,
        open: bindingSourceValueEvaluationForRead(read),
      };
    }
    if (read.openSeams.length > 0) {
      return {
        value: false,
        open: bindingSourceValueEvaluationForRead(read),
      };
    }
    if (read.value.kind === EvaluationValueKind.Unknown || read.value.kind === EvaluationValueKind.BoundaryValue) {
      return {
        value: false,
        open: bindingSourceValueEvaluationForRead(read),
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
    return bindingSourceValueEvaluationForRead(read);
  }

  private evaluateAccessScope(
    expression: AccessScopeExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateScopeName(
      expression.name.name,
      expression.ancestor,
      context,
      expression.optional,
    );
  }

  private evaluateAccessGlobal(
    expression: AccessGlobalExpression,
  ): RuntimeBindingSourceValueEvaluation {
    const value = evaluateStaticGlobalAccess(expression.name.name);
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
    optionalAccess: boolean = false,
  ): RuntimeBindingSourceValueEvaluation {
    const scope = context.scope;
    const lookup = scope.locate(name, ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      if (optionalAccess) {
        return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
      }
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
    if (bound.sourceScope == null) {
      return openBindingSourceSlotNoStaticValue(`Bound controller property '${propertyName}' did not retain its parent binding Scope.`);
    }
    const expression = bindingExpressionAstForProduct(this.projector.publication, bound.expressionProductHandle);
    if (expression == null) {
      return openBindingSourceSlotNoStaticValue(`Bound controller property '${propertyName}' did not retain a runtime-accepted binding expression.`);
    }
    return this.evaluateBoundControllerValueRow(bound, expression, bound.sourceScope, context);
  }

  private evaluateBoundControllerValueRow(
    bound: RuntimeBoundControllerPropertyValue,
    expression: ExpressionAstNode,
    sourceScope: BindingScope,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const key = `${bound.controllerProductHandle}:${bound.propertyName}:${bound.bindingProductHandle}`;
    const sourceContext = context.projectBindingSourceValueContext(
      expression,
      sourceScope,
      bound.sourceBindingExpressionScopes,
      bound.bindingProductHandle,
      bound.sourceBindingBehavior,
      `bound-controller:${bound.propertyName}:${bound.bindingProductHandle}`,
      bound.sourceAddressHandle,
      bound.sourceStrictBinding,
      bound.sourceResourceScope,
      bound.sourceDefaultContainer,
    );
    if (sourceContext.context == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        sourceContext.openReason ?? `Bound controller property '${bound.propertyName}' did not project to a source-value context.`,
        [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
      );
    }
    return context.withBoundControllerRead(
      key,
      () => openBindingSourceNeedsRuntimeValue(`Bound controller property '${bound.propertyName}' recursively depends on itself.`),
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
    const ownerValue = owner.addressableValue;
    if (ownerValue == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue(
          `Member access '${expression.name.name}' requires an executable or addressable owner value.`,
        ),
        [owner],
      );
    }
    if (expression.optional && isNullishValue(ownerValue)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    if (isNullishValue(ownerValue)) {
      return nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects member access '${expression.name.name}' because the owner value is ${ownerValue.kind}.`,
      );
    }
    return this.memberValues.property(ownerValue, expression.name.name);
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
    const ownerValue = owner.addressableValue;
    if (ownerValue == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('Keyed access requires an executable or addressable owner value.'),
        [owner],
      );
    }
    if (expression.optional && isNullishValue(ownerValue)) {
      return RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined);
    }
    const key = this.evaluateNode(context.child(expression.key));
    const keyValue = key.executableValue;
    if (keyValue == null) {
      return bindingSourceValueEvaluationWithPressure(key, [owner]);
    }
    if (isNullishValue(ownerValue)) {
      return nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects keyed access because the owner value is ${ownerValue.kind}.`,
      );
    }
    return this.memberValues.element(ownerValue, keyValue);
  }

  private evaluateArrayLiteral(
    expression: ArrayLiteralExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const elements: EvaluationArrayElement[] = [];
    const pressure: RuntimeBindingSourceValueEvaluation[] = [];
    for (let index = 0; index < expression.elements.length; index += 1) {
      const element = expression.elements[index]!;
      const evaluated = this.evaluateNode(context.child(element));
      const value = retainedSlotValueForOpen(evaluated, element);
      if (value == null) {
        return evaluated;
      }
      const edgeOpenSeams = unretainedEvaluationOpenSeams(value, evaluated.openSeams);
      elements.push(new EvaluationArrayElement(value, null, edgeOpenSeams));
      if (evaluated.closure === RuntimeBindingSourceValueEvaluationClosure.Open && edgeOpenSeams.length === 0) {
        pressure.push(evaluated);
      }
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(new EvaluationArrayValue(elements, null)),
      pressure,
    );
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
      const value = retainedSlotValueForOpen(evaluated, valueExpression);
      if (value == null) {
        return evaluated;
      }
      const name = String(expression.keys[index]);
      const edgeOpenSeams = unretainedEvaluationOpenSeams(value, evaluated.openSeams);
      properties.set(name, new EvaluationObjectProperty(
        name,
        value,
        null,
        evaluated.closure === RuntimeBindingSourceValueEvaluationClosure.Open
          && evaluated.addressableValue == null
          && edgeOpenSeams.length === 0
          ? EvaluationObjectPropertyState.Open
          : EvaluationObjectPropertyState.Closed,
        edgeOpenSeams,
      ));
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationObjectValue(properties, false, null));
  }

  private evaluateCallScope(
    expression: CallScopeExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const target = this.evaluateScopeCallTarget(
      expression.name.name,
      expression.ancestor,
      context,
      expression.optionalAccess,
    );
    const callee = target.callee.executableValue;
    if (callee == null) {
      return target.callee;
    }
    if (isNullishValue(callee)) {
      const nullishKind = target.nullishKind ?? RuntimeBindingSourceCallTargetNullishKind.Callee;
      if (
        (expression.optionalAccess && nullishKind === RuntimeBindingSourceCallTargetNullishKind.Owner)
        || (expression.optional && nullishKind === RuntimeBindingSourceCallTargetNullishKind.Callee)
      ) {
        return bindingSourceValueEvaluationWithPressure(
          RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined),
          [target.callee],
        );
      }
      return bindingSourceValueEvaluationWithPressure(
        nullishSourceValueResult(
          context,
          `Aurelia strict astEvaluate rejects CallScope '${expression.name.name}' because the callee value is ${callee.kind}.`,
        ),
        [target.callee],
      );
    }
    return this.evaluateFunctionLikeCall(
      `CallScope '${expression.name.name}'`,
      callee,
      expression.args,
      context,
      target.thisValue,
      [target.callee],
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
      const callee = contextMember.callee.executableValue;
      if (callee == null) {
        return contextMember.callee;
      }
      if (isNullishValue(callee)) {
        const nullishKind = contextMember.nullishKind ?? RuntimeBindingSourceCallTargetNullishKind.Callee;
        if (expression.optionalMember && nullishKind === RuntimeBindingSourceCallTargetNullishKind.Owner) {
          return bindingSourceValueEvaluationWithPressure(
            RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined),
            [contextMember.callee],
          );
        }
        if (expression.optionalCall && nullishKind === RuntimeBindingSourceCallTargetNullishKind.Callee) {
          return bindingSourceValueEvaluationWithPressure(
            RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined),
            [contextMember.callee],
          );
        }
        return bindingSourceValueEvaluationWithPressure(
          nullishSourceValueResult(
            context,
            nullishKind === RuntimeBindingSourceCallTargetNullishKind.Owner
              ? `Aurelia strict astEvaluate rejects method access '${expression.name.name}' because the owner value is ${callee.kind}.`
              : `Aurelia strict astEvaluate rejects CallMember '${expression.name.name}' because the callee value is ${callee.kind}.`,
          ),
          [contextMember.callee],
        );
      }
      return this.evaluateFunctionLikeCall(
        `CallMember '${expression.name.name}'`,
        callee,
        expression.args,
        context,
        contextMember.thisValue,
        [contextMember.callee],
      );
    }

    const owner = this.evaluateNode(context.child(expression.object));
    const ownerValue = owner.addressableValue;
    if (ownerValue == null) {
      return owner;
    }
    if (isNullishValue(ownerValue)) {
      return bindingSourceValueEvaluationWithPressure(
        expression.optionalMember
          ? RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined)
          : nullishSourceValueResult(
            context,
            `Aurelia strict astEvaluate rejects method access '${expression.name.name}' because the owner value is ${ownerValue.kind}.`,
          ),
        [owner],
      );
    }
    const arrayMethodCall = this.arrayMethods.evaluateMemberCall(expression, ownerValue, context);
    if (arrayMethodCall != null) {
      return bindingSourceValueEvaluationWithPressure(arrayMethodCall, [owner]);
    }
    const globalMemberCall = this.evaluateGlobalMemberCall(expression, ownerValue, context);
    if (globalMemberCall != null) {
      return bindingSourceValueEvaluationWithPressure(globalMemberCall, [owner]);
    }
    const source = this.evaluationFrame.sourceForValue(ownerValue);
    if (source == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceMemberNoStaticValue(`CallMember '${expression.name.name}' owner did not retain an evaluated source module.`),
        [owner],
      );
    }
    const read = this.evaluationFrame.readPropertyValue(source, ownerValue, expression.name.name, source.sourceFile);
    const readEvaluation = bindingSourceValueEvaluationForRead(read);
    const callee = readEvaluation.executableValue;
    if (callee == null) {
      return bindingSourceValueEvaluationWithPressure(readEvaluation, [owner]);
    }
    if (expression.optionalCall && isNullishValue(callee)) {
      return bindingSourceValueEvaluationWithPressure(
        RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined),
        [owner, readEvaluation],
      );
    }
    if (isNullishValue(callee)) {
      return bindingSourceValueEvaluationWithPressure(nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects CallMember '${expression.name.name}' because the callee value is ${callee.kind}.`,
      ), [owner, readEvaluation]);
    }
    return this.evaluateFunctionLikeCall(
      `CallMember '${expression.name.name}'`,
      callee,
      expression.args,
      context,
      ownerValue,
      [owner, readEvaluation],
    );
  }

  private evaluateCallGlobal(
    expression: CallGlobalExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const argumentsRead = this.evaluateCallArguments(`CallGlobal '${expression.name.name}'`, expression.args, context);
    if (argumentsRead.blocking != null) {
      return argumentsRead.blocking;
    }
    return bindingSourceValueEvaluationWithPressure(
      runtimeBindingSourceValueFromGlobalIntrinsic(
        evaluateStaticGlobalCall(expression.name.name, argumentsRead.values),
      ),
      argumentsRead.pressure,
    );
  }

  private evaluateGlobalMemberCall(
    expression: CallMemberExpression,
    receiver: EvaluationValue,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
    const argumentsRead = this.evaluateCallArguments(`CallMember '${expression.name.name}'`, expression.args, context);
    if (argumentsRead.blocking != null) {
      return argumentsRead.blocking;
    }
    const result = evaluateStaticGlobalMemberCall(
      receiver,
      expression.name.name,
      argumentsRead.values,
    );
    return result == null
      ? null
      : bindingSourceValueEvaluationWithPressure(
          runtimeBindingSourceValueFromGlobalIntrinsic(result),
          argumentsRead.pressure,
        );
  }

  private evaluateCallFunction(
    expression: CallFunctionExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateNode(context.child(expression.func));
    const calleeValue = callee.executableValue;
    if (calleeValue == null) {
      return callee;
    }
    if (expression.optional && isNullishValue(calleeValue)) {
      return bindingSourceValueEvaluationWithPressure(
        RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined),
        [callee],
      );
    }
    if (isNullishValue(calleeValue)) {
      return bindingSourceValueEvaluationWithPressure(nullishSourceValueResult(
        context,
        `Aurelia strict astEvaluate rejects CallFunction because the callee value is ${calleeValue.kind}.`,
      ), [callee]);
    }
    return this.evaluateFunctionLikeCall('CallFunction', calleeValue, expression.args, context, null, [callee]);
  }

  private evaluateNew(
    expression: NewExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const globalConstructorName = accessGlobalName(expression.func);
    if (globalConstructorName != null) {
      const argumentsRead = this.evaluateCallArguments(`New '${globalConstructorName}'`, expression.args, context);
      if (argumentsRead.blocking != null) {
        return argumentsRead.blocking;
      }
      return bindingSourceValueEvaluationWithPressure(
        runtimeBindingSourceValueFromGlobalIntrinsic(
          evaluateStaticGlobalConstructor(globalConstructorName, argumentsRead.values),
        ),
        argumentsRead.pressure,
      );
    }
    const callee = this.evaluateNode(context.child(expression.func));
    const calleeValue = callee.executableValue;
    if (calleeValue == null) {
      return callee;
    }
    if (calleeValue.kind === EvaluationValueKind.BoundaryValue) {
      return bindingSourceValueEvaluationWithPressure(bindingSourceValueEvaluationResult(calleeValue, []), [callee]);
    }
    if (calleeValue.kind !== EvaluationValueKind.Class) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue('New expression constructor did not reduce to an evaluator-local class.'),
        [callee],
      );
    }
    const argumentsRead = this.evaluateCallArguments('New expression', expression.args, context);
    if (argumentsRead.blocking != null) {
      return bindingSourceValueEvaluationWithPressure(argumentsRead.blocking, [callee]);
    }
    const source = this.evaluationFrame.sourceForValue(calleeValue);
    if (source == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceMemberNoStaticValue('New expression class source module was not part of static project evaluation.'),
        [callee, ...argumentsRead.pressure],
      );
    }
    const instance = this.evaluationFrame.instantiateClassValue(
      source,
      calleeValue,
      calleeValue.node ?? calleeValue.declaration,
      argumentsRead.values,
    );
    return bindingSourceValueEvaluationWithPressure(
      bindingSourceValueEvaluationForInstanceRead(instance),
      [callee, ...argumentsRead.pressure],
    );
  }

  private evaluateTaggedTemplate(
    expression: TaggedTemplateExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateNode(context.child(expression.func));
    const calleeValue = callee.executableValue;
    if (calleeValue == null) {
      return callee;
    }
    const expressions = this.evaluateCallArguments('TaggedTemplate expressions', expression.expressions, context);
    if (expressions.blocking != null) {
      return bindingSourceValueEvaluationWithPressure(expressions.blocking, [callee]);
    }
    return this.evaluateFunctionLikeCallWithValues(
      'TaggedTemplate',
      calleeValue,
      [cookedTemplateArrayValue(expression), ...expressions.values],
      null,
      [callee, ...expressions.pressure],
    );
  }

  private evaluateFunctionLikeCall(
    label: string,
    callee: EvaluationValue,
    args: readonly ExpressionAstNode[],
    context: RuntimeBindingSourceValueEvaluationContext,
    thisValue: EvaluationValue | null = null,
    pressure: readonly RuntimeBindingSourceValueEvaluation[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    const argumentsRead = this.evaluateCallArguments(label, args, context);
    if (argumentsRead.blocking != null) {
      return bindingSourceValueEvaluationWithPressure(argumentsRead.blocking, pressure);
    }
    return this.evaluateFunctionLikeCallWithValues(
      label,
      callee,
      argumentsRead.values,
      thisValue,
      [...pressure, ...argumentsRead.pressure],
    );
  }

  private evaluateFunctionLikeCallWithValues(
    label: string,
    callee: EvaluationValue,
    argumentValues: readonly EvaluationValue[],
    thisValue: EvaluationValue | null = null,
    pressure: readonly RuntimeBindingSourceValueEvaluation[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    if (callee.kind !== EvaluationValueKind.Function) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceNeedsRuntimeValue(`${label} callee did not reduce to an evaluator-local function.`),
        pressure,
      );
    }
    const source = this.evaluationFrame.sourceForValue(callee);
    if (source == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceMemberNoStaticValue(`${label} function source module was not part of static project evaluation.`),
        pressure,
      );
    }
    const read = this.evaluationFrame.callFunctionValue(source, callee, callee.node ?? source.sourceFile, argumentValues, thisValue);
    return bindingSourceValueEvaluationWithPressure(bindingSourceValueEvaluationForRead(read), pressure);
  }

  private evaluateCallArguments(
    label: string,
    args: readonly ExpressionAstNode[],
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceArgumentsEvaluation {
    const values: EvaluationValue[] = [];
    const pressure: RuntimeBindingSourceValueEvaluation[] = [];
    for (let index = 0; index < args.length; index += 1) {
      const argument = this.evaluateNode(context.child(args[index]!));
      const value = argument.executableValue;
      if (value != null) {
        values.push(value);
        pressure.push(argument);
        continue;
      }
      const boundary = boundaryValueForOpenArgument(argument, args[index]!);
      if (boundary != null) {
        values.push(boundary);
        pressure.push(argument);
        continue;
      }
      return RuntimeBindingSourceArgumentsEvaluation.blocked(
        bindingSourceValueEvaluationWithPressure(RuntimeBindingSourceValueEvaluation.open(
          `${label} argument ${index} did not close.${argument.openReason == null ? '' : ` ${argument.openReason}`}`,
          argument.openReasonKinds,
          argument.abruptCompletion,
        ), pressure),
      );
    }
    return RuntimeBindingSourceArgumentsEvaluation.values(values, pressure);
  }

  private evaluateSlot(
    slot: BindingContextSlot,
    scope: BindingScope | null,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (slot.staticValueEvaluation != null) {
      return slot.staticValueEvaluation;
    }
    const stateInitialValue = this.evaluateStateBindingInitialStateSlot(slot, scope);
    if (stateInitialValue != null) {
      return stateInitialValue;
    }
    if (slot.targetTypeMemberHandle == null) {
      if (slot.targetType != null) {
        return openBindingSourceSlotNoStaticValue(
          `Scope slot '${slot.name}' is runtime/local typed as '${slot.targetType.display ?? slot.targetType.shapeKind}', but it does not carry a static value carrier.`,
        );
      }
      return openBindingSourceSlotNoStaticValue(`Scope slot '${slot.name}' did not carry a TypeChecker member product.`);
    }
    const member = this.projector.publication.readHotDetail(TypeSystemHotDetails.TypeMember, slot.targetTypeMemberHandle);
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
    const storeConfiguration = this.projector.publication.readProductDetail(
      StateProductDetails.StoreConfiguration,
      scope.bindingContext.ownerProductHandle,
    );
    if (storeConfiguration?.initialStateSourceAddressHandle == null) {
      return null;
    }
    const initialState = this.evaluationFrame.evaluateSourceAddressExpression(
      this.kernel,
      storeConfiguration.initialStateSourceAddressHandle,
    );
    if (initialState == null) {
      return openBindingSourceSlotNoStaticValue(
        `State store '${storeConfiguration.name ?? 'default'}' initial-state source was not part of static project evaluation.`,
      );
    }
    if (initialState.value == null) {
      return bindingSourceValueEvaluationForRead(initialState);
    }
    return this.memberValues.property(
      initialState.value,
      slot.name,
      initialState.openSeams.map((seam) => seam.summary),
      openSeamReasonKindsForEvaluationRead(initialState),
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
    if (instance.value == null) {
      return RuntimeBindingSourceCallTargetEvaluation.open(bindingSourceValueEvaluationForRead(instance));
    }
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return RuntimeBindingSourceCallTargetEvaluation.open(
        bindingSourceValueEvaluationForRead(instance),
      );
    }
    const boundValues = this.applyBoundControllerValues(instance.value, scope, context);
    const boundValue = boundValues.get(member.name) ?? null;
    const read = boundValue ?? this.memberValues.property(instance.value, member.name);
    return new RuntimeBindingSourceCallTargetEvaluation(
      read,
      instance.value,
    );
  }

  private evaluateClassMemberValue(
    target: RuntimeBindingSourceClassValueTarget,
    memberName: string,
    scope: BindingScope | null,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const instance = this.evaluationFrame.instantiateClassValue(target.source, target.classValue, target.classNode);
    if (instance.value == null) {
      return bindingSourceValueEvaluationForRead(instance);
    }
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return bindingSourceValueEvaluationForRead(instance);
    }
    const boundValues = this.applyBoundControllerValues(instance.value, scope, context);
    return boundValues.get(memberName)
      ?? this.memberValues.property(instance.value, memberName);
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
  ): ReadonlyMap<string, RuntimeBindingSourceValueEvaluation> {
    if (instance.kind !== EvaluationValueKind.Instance) {
      return new Map();
    }
    const values = new Map<string, RuntimeBindingSourceValueEvaluation>();
    for (const bound of this.boundControllerValues.readAll(
      scope?.bindingContext.ownerProductHandle ?? null,
      scope?.bindingContext.contextType ?? null,
    )) {
      const expression = bindingExpressionAstForProduct(this.projector.publication, bound.expressionProductHandle);
      if (expression == null || bound.sourceScope == null) {
        continue;
      }
      const evaluation = this.evaluateBoundControllerValueExpression(bound, expression, context);
      values.set(bound.propertyName, evaluation);
      const value = valueOrBoundaryForOpen(evaluation, expression);
      if (value == null) {
        continue;
      }
      instance.properties.set(bound.propertyName, new EvaluationObjectProperty(
        bound.propertyName,
        value,
        value.node ?? instance.node ?? instance.classValue.node ?? instance.classValue.declaration,
        evaluation.closure === RuntimeBindingSourceValueEvaluationClosure.Open
          ? EvaluationObjectPropertyState.Open
          : EvaluationObjectPropertyState.Closed,
        evaluation.openSeams,
      ));
    }
    return values;
  }

  private evaluateBoundControllerValueExpression(
    bound: RuntimeBoundControllerPropertyValue,
    expression: ExpressionAstNode,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    if (bound.sourceScope == null) {
      return openBindingSourceSlotNoStaticValue(
        `Bound controller property '${bound.propertyName}' did not retain its parent binding Scope.`,
      );
    }
    const key = `${bound.controllerProductHandle}:${bound.propertyName}:${bound.bindingProductHandle}`;
    const sourceContext = context.projectBindingSourceValueContext(
      expression,
      bound.sourceScope,
      bound.sourceBindingExpressionScopes,
      bound.bindingProductHandle,
      bound.sourceBindingBehavior,
      `bound-controller:${bound.propertyName}:${bound.bindingProductHandle}`,
      bound.sourceAddressHandle,
      bound.sourceStrictBinding,
      bound.sourceResourceScope,
      bound.sourceDefaultContainer,
    );
    if (sourceContext.context == null) {
      const reason = sourceContext.openReason
        ?? `Bound controller property '${bound.propertyName}' did not project to a source-value context.`;
      return RuntimeBindingSourceValueEvaluation.openWithValue(
        new EvaluationBoundaryValue(EvaluationBoundaryKind.BindingScope, reason, null),
        reason,
        [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
      );
    }
    return context.withBoundControllerRead(
      key,
      () => {
        const reason = `Bound controller property '${bound.propertyName}' recursively depends on itself.`;
        return RuntimeBindingSourceValueEvaluation.openWithValue(
          new EvaluationBoundaryValue(EvaluationBoundaryKind.BindingScope, reason, null),
          reason,
          [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
        );
      },
      () => this.evaluateNode(sourceContext.context!),
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
    const pressure: RuntimeBindingSourceValueEvaluation[] = [];
    for (let index = 0; index < expressions.length; index += 1) {
      const evaluated = this.evaluateNode(context.child(expressions[index]!));
      pressure.push(evaluated);
      const value = evaluated.executableValue;
      if (value == null) {
        const boundary = boundaryValueForOpenArgument(evaluated, expressions[index]!);
        if (boundary == null) {
          return bindingSourceValueEvaluationWithPressure(evaluated, pressure.slice(0, -1));
        }
        builder.appendBoundary(boundary, parts[index + 1] ?? '');
        continue;
      }
      if (!appendEvaluationStringLikePart(builder, value, parts[index + 1] ?? '')) {
        return bindingSourceValueEvaluationWithPressure(
          openBindingSourceUnsupportedExpression(`Expression hole ${index} did not reduce to a primitive value.`),
          pressure,
        );
      }
    }
    return bindingSourceValueEvaluationWithPressure(
      RuntimeBindingSourceValueEvaluation.value(builder.build(null)),
      pressure,
    );
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
        return left;
      }
      const right = this.evaluateNode(context.child(expression.right));
      const rightValue = valueOrBoundaryForOpen(right, expression.right);
      if (rightValue == null) {
        return bindingSourceValueEvaluationWithPressure(right, [left]);
      }
      return bindingSourceValueEvaluationWithPressure(evaluatePlus(leftValue, rightValue), [left, right]);
    }
    const leftValue = left.executableValue;
    if (leftValue == null) {
      return left;
    }
    const right = this.evaluateNode(context.child(expression.right));
    const rightValue = right.executableValue;
    if (rightValue == null) {
      return bindingSourceValueEvaluationWithPressure(right, [left]);
    }
    const operation = staticBinaryOperationForRuntimeBinding(expression.operation);
    if (operation == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceUnsupportedExpression(`Binary operator '${expression.operation}' is type-visible but not value-reduced by binding-source value flow.`),
        [left, right],
      );
    }
    const value = evaluateStaticBinaryOperation(operation, leftValue, rightValue, null);
    return bindingSourceValueEvaluationWithPressure(
      value == null
        ? openBindingSourceUnsupportedExpression(`Binary operator '${expression.operation}' did not reduce over known operands.`)
        : RuntimeBindingSourceValueEvaluation.value(value),
      [left, right],
    );
  }

  private evaluateShortCircuitBinary(
    expression: BinaryExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const left = this.evaluateNode(context.child(expression.left));
    const leftValue = left.executableValue;
    if (leftValue == null) {
      return left;
    }
    if (expression.operation === '??') {
      return leftValue.kind === EvaluationValueKind.Null || leftValue.kind === EvaluationValueKind.Undefined
        ? bindingSourceValueEvaluationWithPressure(this.evaluateNode(context.child(expression.right)), [left])
        : left;
    }
    const truthy = readEvaluationTruthiness(leftValue);
    if (truthy == null) {
      return bindingSourceValueEvaluationWithPressure(
        openBindingSourceUnsupportedExpression(`Left operand for '${expression.operation}' did not reduce to known truthiness.`),
        [left],
      );
    }
    return expression.operation === '||'
      ? truthy ? left : bindingSourceValueEvaluationWithPressure(this.evaluateNode(context.child(expression.right)), [left])
      : truthy ? bindingSourceValueEvaluationWithPressure(this.evaluateNode(context.child(expression.right)), [left]) : left;
  }

  private evaluateUnary(
    expression: UnaryExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const value = this.evaluateNode(context.child(expression.expression));
    const operand = value.executableValue;
    if (operand == null) {
      return value;
    }
    switch (expression.operation) {
      case '!':
      case '+':
      case '-':
      case 'typeof':
      case 'void': {
        const unaryValue = evaluateStaticUnaryOperation(expression.operation, operand, null);
        return bindingSourceValueEvaluationWithPressure(
          unaryValue == null
            ? openBindingSourceUnsupportedExpression(`Unary operator '${expression.operation}' did not reduce over a known operand.`)
            : RuntimeBindingSourceValueEvaluation.value(unaryValue),
          [value],
        );
      }
      default:
        return bindingSourceValueEvaluationWithPressure(
          openBindingSourceUnsupportedExpression(`Unary operator '${expression.operation}' is not value-reduced by binding-source value flow.`),
          [value],
        );
    }
  }

  private evaluateConditional(
    expression: ConditionalExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const condition = this.evaluateNode(context.child(expression.condition));
    const conditionValue = condition.executableValue;
    if (conditionValue == null) {
      return condition;
    }
    const truthy = readEvaluationTruthiness(conditionValue);
    if (truthy == null) {
      return bindingSourceValueEvaluationWithPressure(
        this.evaluateConditionalBranchRepresentative(expression, context)
          ?? openBindingSourceUnsupportedExpression('Conditional expression condition did not reduce to known truthiness.'),
        [condition],
      );
    }
    return bindingSourceValueEvaluationWithPressure(
      this.evaluateNode(context.child(truthy ? expression.yes : expression.no)),
      [condition],
    );
  }

  private evaluateConditionalBranchRepresentative(
    expression: ConditionalExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
    const yesEvaluation = this.evaluateNode(context.child(expression.yes));
    const noEvaluation = this.evaluateNode(context.child(expression.no));
    const yes = valueOrBoundaryForOpen(yesEvaluation, expression.yes);
    const no = valueOrBoundaryForOpen(noEvaluation, expression.no);
    if (yes == null || no == null) {
      return null;
    }
    const representative = representativeEvaluationValues([yes, no], `binding.conditional.${expression.$kind}`, null);
    return representative == null
      ? null
      : bindingSourceValueEvaluationWithPressure(
          RuntimeBindingSourceValueEvaluation.value(representative),
          [yesEvaluation, noEvaluation],
        );
  }

  private evaluateContextKeyedMemberForOwner(
    expression: AccessKeyedExpression,
    context: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
    if (contextAccessExpression(expression.object) == null) {
      return null;
    }
    const key = this.evaluateNode(context.child(expression.key));
    const keyValue = key.executableValue;
    if (keyValue == null) {
      return key;
    }
    const propertyName = evaluationPropertyKeyString(keyValue);
    return bindingSourceValueEvaluationWithPressure(
      propertyName == null
        ? openBindingSourceUnsupportedExpression(`Keyed context access key reduced to '${keyValue.kind}', which is not a static property key.`)
        : this.evaluateContextMemberForOwner(expression.object, propertyName, context)!,
      [key],
    );
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
    optionalAccess: boolean,
  ): RuntimeBindingSourceCallTargetEvaluation {
    const lookup = context.scope.locate(name, ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      if (optionalAccess) {
        return RuntimeBindingSourceCallTargetEvaluation.nullishOwner(
          RuntimeBindingSourceValueEvaluation.value(EvaluationUndefined),
        );
      }
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
    if (bound == null) {
      const member = this.checkerMemberForSlot(slot);
      if (member != null && bindingContext === scope?.bindingContext) {
        return this.evaluateMemberCallTarget(member, scope, context);
      }
    }

    const callee = bound ?? this.evaluateSlot(slot, scope, context);
    const receiver = this.contextReceiverValue(scope, bindingContext, label, context);
    if (receiver.value == null) {
      return RuntimeBindingSourceCallTargetEvaluation.open(receiver);
    }
    return new RuntimeBindingSourceCallTargetEvaluation(
      bindingSourceValueEvaluationWithPressure(callee, [receiver]),
      receiver.value,
    );
  }

  private contextReceiverValue(
    scope: BindingScope | null,
    context: BindingScopeContext,
    label: string,
    request: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation {
    const instance = context === scope?.bindingContext
      ? this.evaluateBindingContextInstance(scope, context, request)
      : null;
    return instance ?? RuntimeBindingSourceValueEvaluation.value(this.contextBoundaryObject(scope, context, label));
  }

  private evaluateBindingContextInstance(
    scope: BindingScope | null,
    context: BindingScopeContext,
    request: RuntimeBindingSourceValueEvaluationContext,
  ): RuntimeBindingSourceValueEvaluation | null {
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
    if (instance.value == null) {
      return bindingSourceValueEvaluationForRead(instance);
    }
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return null;
    }
    this.applyBoundControllerValues(instance.value, scope, request);
    return bindingSourceValueEvaluationForInstanceRead(instance);
  }

  private classNodeForContextType(
    context: BindingScopeContext,
  ): ts.ClassLikeDeclarationBase | null {
    const productHandle = context.contextType?.productHandle ?? null;
    if (productHandle == null) {
      return null;
    }
    const typeShape = this.projector.publication.readProductDetail(TypeSystemProductDetails.TypeShape, productHandle);
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
      if (slot.staticValueEvaluation?.value != null) {
        properties.set(slot.name, new EvaluationObjectProperty(
          slot.name,
          slot.staticValueEvaluation.value,
          null,
          slot.staticValueEvaluation.closure === RuntimeBindingSourceValueEvaluationClosure.Value
            ? EvaluationObjectPropertyState.Closed
            : EvaluationObjectPropertyState.Open,
        ));
      }
    }
    return new EvaluationBoundaryObjectValue(
      EvaluationBoundaryKind.BindingScope,
      scope == null ? label : `${label}:${scope.productHandle}`,
      properties,
    );
  }

  private checkerMemberForSlot(slot: BindingContextSlot): CheckerTypeMember | null {
    if (slot.targetTypeMemberHandle == null) {
      return null;
    }
    const member = this.projector.publication.readHotDetail(TypeSystemHotDetails.TypeMember, slot.targetTypeMemberHandle);
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
  result: StaticGlobalIntrinsicEvaluation,
): RuntimeBindingSourceValueEvaluation {
  switch (result.kind) {
    case StaticGlobalIntrinsicEvaluationKind.Value:
      return RuntimeBindingSourceValueEvaluation.value(result.value);
    case StaticGlobalIntrinsicEvaluationKind.RuntimeOpen:
      return openBindingSourceNeedsRuntimeValue(result.reason);
    case StaticGlobalIntrinsicEvaluationKind.Unsupported:
      return openBindingSourceUnsupportedExpression(result.reason);
  }
}

class RuntimeBindingSourceArgumentsEvaluation {
  private constructor(
    readonly values: readonly EvaluationValue[],
    readonly pressure: readonly RuntimeBindingSourceValueEvaluation[],
    readonly blocking: RuntimeBindingSourceValueEvaluation | null,
  ) {}

  static values(
    values: readonly EvaluationValue[],
    pressure: readonly RuntimeBindingSourceValueEvaluation[],
  ): RuntimeBindingSourceArgumentsEvaluation {
    return new RuntimeBindingSourceArgumentsEvaluation(values, pressure, null);
  }

  static blocked(blocking: RuntimeBindingSourceValueEvaluation): RuntimeBindingSourceArgumentsEvaluation {
    return new RuntimeBindingSourceArgumentsEvaluation([], [], blocking);
  }
}

/** Callee plus Aurelia receiver object for a binding-source call before argument evaluation. */
class RuntimeBindingSourceCallTargetEvaluation {
  constructor(
    readonly callee: RuntimeBindingSourceValueEvaluation,
    readonly thisValue: EvaluationValue | null,
    readonly nullishKind: RuntimeBindingSourceCallTargetNullishKind | null = null,
  ) {}

  static open(callee: RuntimeBindingSourceValueEvaluation): RuntimeBindingSourceCallTargetEvaluation {
    return new RuntimeBindingSourceCallTargetEvaluation(callee, null);
  }

  static nullishOwner(callee: RuntimeBindingSourceValueEvaluation): RuntimeBindingSourceCallTargetEvaluation {
    return new RuntimeBindingSourceCallTargetEvaluation(callee, null, RuntimeBindingSourceCallTargetNullishKind.Owner);
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
        EvaluationObjectPropertyState.Closed,
      )],
      ['binding', new EvaluationObjectProperty(
        'binding',
        new EvaluationBoundaryObjectValue(
          EvaluationBoundaryKind.BindingScope,
          `value-converter.${expression.name.name}.caller.binding`,
        ),
        null,
        EvaluationObjectPropertyState.Closed,
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

function bindingSourceValueEvaluationForInstanceRead(
  read: {
    readonly value: EvaluationValue | null;
    readonly openSeams: readonly EvaluationOpenSeam[];
    readonly abruptCompletion: EvaluationAbruptCompletion | null;
  },
): RuntimeBindingSourceValueEvaluation {
  if (read.value?.kind !== EvaluationValueKind.Instance || read.abruptCompletion != null) {
    return bindingSourceValueEvaluationForRead(read);
  }
  return bindingSourceValueEvaluationForRead({
    value: read.value,
    openSeams: read.value.constructionOpenSeams,
    abruptCompletion: null,
  });
}

function openValueConverterInstance(
  reason: string,
  abruptCompletion: EvaluationAbruptCompletion | null = null,
): RuntimeValueConverterInstanceRead {
  const open = abruptCompletion == null
    ? openBindingSourceNeedsRuntimeValue(reason)
    : bindingSourceValueEvaluationResult(null, [reason], abruptCompletion);
  return {
    instance: null,
    open,
    openReasons: [reason],
    openReasonKinds: open.openReasonKinds,
  };
}

function valueOrBoundaryForOpen(
  evaluation: RuntimeBindingSourceValueEvaluation,
  expression: ExpressionAstNode,
): EvaluationValue | null {
  if (evaluation.executableValue != null) {
    return evaluation.executableValue;
  }
  return boundaryValueForOpenArgument(evaluation, expression);
}

function retainedSlotValueForOpen(
  evaluation: RuntimeBindingSourceValueEvaluation,
  expression: ExpressionAstNode,
): EvaluationValue | null {
  return evaluation.value ?? boundaryValueForOpenArgument(evaluation, expression);
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
