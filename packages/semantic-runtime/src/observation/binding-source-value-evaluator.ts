import ts from 'typescript';
import {
  BindingScope,
  BindingScopeLookupKind,
  type BindingContextSlot,
} from '../configuration/scope.js';
import type {
  AccessMemberExpression,
  AccessScopeExpression,
  BinaryExpression,
  CallFunctionExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  ExpressionAstNode,
  Interpolation,
  TemplateExpression,
  UnaryExpression,
} from '../expression/ast.js';
import {
  StaticEvaluator,
} from '../evaluation/evaluator.js';
import {
  openSeamReasonKindForEvaluationBoundary,
} from '../evaluation/boundary-open-reason.js';
import {
  isEvaluatedProjectSource,
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  normalizeModuleKey,
} from '../evaluation/module-graph.js';
import {
  EvaluationBooleanValue,
  EvaluationBoundaryValue,
  EvaluationBoundaryKind,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationStringPatternBuilder,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  appendEvaluationStringLikePart,
  evaluationStringPatternFromConcatenation,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  type EvaluationClassValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { KernelStore } from '../kernel/store.js';
import type { ProductHandle } from '../kernel/handles.js';
import {
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import {
  CheckerTypeMember,
  sameCheckerTypeReference,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  TemplateBindingMode,
} from '../template/instruction-ir.js';
import {
  TemplateProductDetails,
} from '../template/product-details.js';
import {
  runtimeAcceptedBindingExpressionAstForParse,
} from '../template/expression-parse-projection.js';
import {
  PropertyBinding,
  InterpolationBinding,
  RuntimeBindingTargetKind,
  type RuntimeBinding,
} from '../template/runtime-binding.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { TemplateScopeConstructionEmission } from '../template/template-controller-scope-materializer.js';

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

export interface RuntimeBoundControllerPropertyValue {
  readonly controllerProductHandle: ProductHandle;
  readonly controllerDefinitionProductHandle: ProductHandle | null;
  readonly propertyName: string;
  readonly bindingProductHandle: ProductHandle;
  readonly expressionProductHandle: ProductHandle | null;
  readonly sourceScope: BindingScope | null;
}

export interface RuntimeControllerDefinitionReference {
  readonly controllerProductHandle: ProductHandle | null;
  readonly definitionProductHandle: ProductHandle | null;
  readonly definitionTargetType: CheckerTypeReference | null;
}

export interface RuntimeBindingSourceValueRuntimeAnalysis {
  readonly runtimeRendering: RuntimeRenderingEmission;
  readonly controllerBind: RuntimeControllerBindEmission;
  readonly scopes: TemplateScopeConstructionEmission;
}

export interface RuntimeBindingSourceValueTemplateResource {
  readonly compilation: {
    readonly definition: {
      readonly productHandle: ProductHandle | null;
      readonly target: {
        readonly targetType: CheckerTypeReference | null;
      };
    };
  };
  readonly runtimeAnalysis: RuntimeBindingSourceValueRuntimeAnalysis;
}

/**
 * Values delivered to child controller view-model properties by parent-owned runtime bindings.
 *
 * Aurelia's `CustomElementRenderer` renders bindable property instructions against the child controller target while
 * the binding itself belongs to the rendering parent controller. This table keeps that handoff available to static
 * binding-source value evaluation without making router/resources rediscover renderer semantics.
 */
export class RuntimeBoundControllerValueTable {
  static readonly empty = new RuntimeBoundControllerValueTable([], []);

  private readonly byController = new Map<ProductHandle, Map<string, RuntimeBoundControllerPropertyValue>>();
  private readonly byDefinition = new Map<ProductHandle, Map<string, RuntimeBoundControllerPropertyValue[]>>();
  private readonly definitionByController = new Map<ProductHandle, ProductHandle>();
  private readonly definitions: RuntimeControllerDefinitionReference[] = [];

  constructor(
    readonly values: readonly RuntimeBoundControllerPropertyValue[],
    controllerDefinitions: readonly RuntimeControllerDefinitionReference[],
  ) {
    for (const controller of controllerDefinitions) {
      this.definitions.push(controller);
      if (controller.controllerProductHandle != null && controller.definitionProductHandle != null) {
        this.definitionByController.set(controller.controllerProductHandle, controller.definitionProductHandle);
      }
    }
    for (const value of values) {
      let byProperty = this.byController.get(value.controllerProductHandle);
      if (byProperty === undefined) {
        byProperty = new Map();
        this.byController.set(value.controllerProductHandle, byProperty);
      }
      if (!byProperty.has(value.propertyName)) {
        byProperty.set(value.propertyName, value);
      }
      if (value.controllerDefinitionProductHandle == null) {
        continue;
      }
      let definitionProperties = this.byDefinition.get(value.controllerDefinitionProductHandle);
      if (definitionProperties === undefined) {
        definitionProperties = new Map();
        this.byDefinition.set(value.controllerDefinitionProductHandle, definitionProperties);
      }
      const definitionValues = definitionProperties.get(value.propertyName) ?? [];
      definitionProperties.set(value.propertyName, [...definitionValues, value]);
    }
  }

  read(
    controllerProductHandle: ProductHandle | null,
    propertyName: string,
    contextType: CheckerTypeReference | null = null,
  ): RuntimeBoundControllerPropertyValue | null {
    return (controllerProductHandle == null
      ? null
      : this.byController.get(controllerProductHandle)?.get(propertyName)
        ?? this.readDefinitionValue(controllerProductHandle, propertyName))
      ?? this.readContextTypeDefinitionValue(contextType, propertyName);
  }

  readAll(
    controllerProductHandle: ProductHandle | null,
    contextType: CheckerTypeReference | null = null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    const byProperty = new Map<string, RuntimeBoundControllerPropertyValue>();
    for (const value of this.readExactControllerValues(controllerProductHandle)) {
      byProperty.set(value.propertyName, value);
    }
    for (const value of this.readDefinitionValues(controllerProductHandle)) {
      if (!byProperty.has(value.propertyName)) {
        byProperty.set(value.propertyName, value);
      }
    }
    for (const value of this.readContextTypeDefinitionValues(contextType)) {
      if (!byProperty.has(value.propertyName)) {
        byProperty.set(value.propertyName, value);
      }
    }
    return [...byProperty.values()];
  }

  private readExactControllerValues(
    controllerProductHandle: ProductHandle | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    if (controllerProductHandle == null) {
      return [];
    }
    return [...(this.byController.get(controllerProductHandle)?.values() ?? [])];
  }

  private readDefinitionValue(
    controllerProductHandle: ProductHandle,
    propertyName: string,
  ): RuntimeBoundControllerPropertyValue | null {
    const definitionProductHandle = this.definitionByController.get(controllerProductHandle) ?? null;
    if (definitionProductHandle == null) {
      return null;
    }
    const values = this.byDefinition.get(definitionProductHandle)?.get(propertyName) ?? [];
    return values.length === 1 ? values[0]! : null;
  }

  private readDefinitionValues(
    controllerProductHandle: ProductHandle | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    if (controllerProductHandle == null) {
      return [];
    }
    const definitionProductHandle = this.definitionByController.get(controllerProductHandle) ?? null;
    return definitionProductHandle == null
      ? []
      : this.readUnambiguousDefinitionValues(definitionProductHandle);
  }

  private readContextTypeDefinitionValue(
    contextType: CheckerTypeReference | null,
    propertyName: string,
  ): RuntimeBoundControllerPropertyValue | null {
    const values = this.definitionHandlesForContextType(contextType)
      .flatMap((definitionProductHandle) =>
        this.byDefinition.get(definitionProductHandle)?.get(propertyName) ?? []
      );
    return values.length === 1 ? values[0]! : null;
  }

  private readContextTypeDefinitionValues(
    contextType: CheckerTypeReference | null,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    return this.definitionHandlesForContextType(contextType)
      .flatMap((definitionProductHandle) => this.readUnambiguousDefinitionValues(definitionProductHandle));
  }

  private readUnambiguousDefinitionValues(
    definitionProductHandle: ProductHandle,
  ): readonly RuntimeBoundControllerPropertyValue[] {
    const byProperty = this.byDefinition.get(definitionProductHandle);
    if (byProperty == null) {
      return [];
    }
    return [...byProperty.values()].flatMap((values) =>
      values.length === 1 ? [values[0]!] : []
    );
  }

  private definitionHandlesForContextType(
    contextType: CheckerTypeReference | null,
  ): readonly ProductHandle[] {
    if (contextType == null) {
      return [];
    }
    const handles = new Set<ProductHandle>();
    for (const definition of this.definitions) {
      if (
        definition.definitionProductHandle != null
        && definition.definitionTargetType != null
        && sameCheckerTypeReference(definition.definitionTargetType, contextType)
      ) {
        handles.add(definition.definitionProductHandle);
      }
    }
    return [...handles];
  }
}

export function runtimeBoundControllerValueTableForTemplateResources(
  resources: readonly RuntimeBindingSourceValueTemplateResource[],
): RuntimeBoundControllerValueTable {
  return new RuntimeBoundControllerValueTable(
    resources.flatMap((resource) => boundControllerValuesForRuntimeAnalysis(resource.runtimeAnalysis)),
    resources.flatMap((resource) => controllerDefinitionsForRuntimeAnalysis(resource)),
  );
}

/**
 * Evaluates Aurelia binding-source expressions against modeled runtime Scope plus the static ECMAScript evaluator.
 *
 * This is intentionally binding-owned substrate. Consumers such as router resources can ask whether a binding source
 * carries a static value, but source lookup, view-model member access, and getter execution stay with the binding flow.
 */
export class RuntimeBindingSourceValueEvaluator {
  private readonly evaluatedSourcesByFileName = new Map<string, EvaluatedProjectSource>();
  private readonly activeBoundControllerReads = new Set<string>();

  constructor(
    readonly store: KernelStore,
    readonly evaluation: StaticProjectEvaluationResult,
    readonly boundControllerValues: RuntimeBoundControllerValueTable = RuntimeBoundControllerValueTable.empty,
  ) {
    for (const source of evaluation.sources) {
      if (!isEvaluatedProjectSource(source)) {
        continue;
      }
      this.evaluatedSourcesByFileName.set(normalizeModuleKey(source.sourceFile.fileName), source);
      this.evaluatedSourcesByFileName.set(normalizeModuleKey(source.moduleKey), source);
    }
  }

  evaluate(
    expression: ExpressionAstNode,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateNode(expression, scope);
  }

  private evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    switch (expression.$kind) {
      case 'PrimitiveLiteral':
        return RuntimeBindingSourceValueEvaluation.value(primitiveValue(expression.value, null));
      case 'AccessScope':
        return this.evaluateAccessScope(expression, scope);
      case 'AccessThis':
      case 'AccessBoundary':
        return openNeedsRuntimeValue(`${expression.$kind} value evaluation needs a materialized binding-context instance.`);
      case 'AccessMember':
        return this.evaluateAccessMember(expression, scope);
      case 'CallScope':
        return this.evaluateCallScope(expression, scope);
      case 'CallMember':
        return this.evaluateCallMember(expression, scope);
      case 'CallFunction':
        return this.evaluateCallFunction(expression, scope);
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

  private evaluateScopeName(
    name: string,
    ancestor: number,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const lookup = locatedScopeSlot(scope, name, ancestor);
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
    const owner = this.evaluateNode(expression.object, scope);
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? `Owner for member '${expression.name.name}' did not close.`,
        owner.openReasonKinds,
      );
    }
    const source = evaluatedSourceForValue(owner.value, this.evaluatedSourcesByFileName);
    if (source == null) {
      return openMemberNoStaticValue(`Member '${expression.name.name}' owner did not retain an evaluated source module.`);
    }
    const evaluator = new StaticEvaluator(source.evaluation.policy, source.evaluation.runtimeHost);
    const read = evaluator.evaluatePropertyValue(owner.value, expression.name.name, source.moduleKey, source.sourceFile);
    return evaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
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
    const owner = this.evaluateNode(expression.object, scope);
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? `Owner for method '${expression.name.name}' did not close.`,
        owner.openReasonKinds,
      );
    }
    const source = evaluatedSourceForValue(owner.value, this.evaluatedSourcesByFileName);
    if (source == null) {
      return openMemberNoStaticValue(`CallMember '${expression.name.name}' owner did not retain an evaluated source module.`);
    }
    const evaluator = new StaticEvaluator(source.evaluation.policy, source.evaluation.runtimeHost);
    const read = evaluator.evaluatePropertyValue(owner.value, expression.name.name, source.moduleKey, source.sourceFile);
    if (read.value.kind === EvaluationValueKind.Unknown || read.value.kind === EvaluationValueKind.BoundaryValue) {
      return evaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
    }
    return this.evaluateFunctionLikeCall(
      `CallMember '${expression.name.name}'`,
      read.value,
      expression.args,
      scope,
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
    return this.evaluateFunctionLikeCall('CallFunction', callee.value, expression.args, scope);
  }

  private evaluateFunctionLikeCall(
    label: string,
    callee: EvaluationValue,
    args: readonly ExpressionAstNode[],
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    if (callee.kind !== EvaluationValueKind.Function) {
      return openNeedsRuntimeValue(`${label} callee did not reduce to an evaluator-local function.`);
    }
    const argumentsRead = this.evaluateCallArguments(label, args, scope);
    if (argumentsRead.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
      return argumentsRead.open
        ?? RuntimeBindingSourceValueEvaluation.open(`${label} arguments did not close.`);
    }
    const source = evaluatedSourceForValue(callee, this.evaluatedSourcesByFileName);
    if (source == null) {
      return openMemberNoStaticValue(`${label} function source module was not part of static project evaluation.`);
    }
    const evaluator = new StaticEvaluator(source.evaluation.policy, source.evaluation.runtimeHost);
    const read = evaluator.evaluateFunctionValue(
      callee,
      callee.node ?? source.sourceFile,
      source.moduleKey,
      argumentsRead.values,
    );
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
    if (slot.targetProductHandle == null) {
      if (slot.targetType != null) {
        return openSlotNoStaticValue(
          `Scope slot '${slot.name}' is runtime/local typed as '${slot.targetType.display ?? slot.targetType.shapeKind}', but it does not carry a static value carrier.`,
        );
      }
      return openSlotNoStaticValue(`Scope slot '${slot.name}' did not carry a TypeChecker member product.`);
    }
    const member = this.store.productDetails.read(TypeSystemProductDetails.TypeMember, slot.targetProductHandle);
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

    const source = this.evaluatedSourceForNode(classNode);
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
    const evaluator = new StaticEvaluator(source.evaluation.policy, source.evaluation.runtimeHost);
    const instance = evaluator.evaluateClassValueInstantiation(classValue, source.moduleKey, classNode);
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return evaluationResult(instance.value, instance.openSeams.map((seam) => seam.summary));
    }
    this.applyBoundControllerValues(instance.value, scope);
    const value = evaluator.evaluatePropertyValue(instance.value, memberName, source.moduleKey, classNode);
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
    if (expression.operation === '+') {
      return evaluatePlus(left.value, right.value);
    }
    return openUnsupportedExpression(`Binary operator '${expression.operation}' is type-visible but not value-reduced by binding-source value flow.`);
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
      return openUnsupportedExpression('Conditional expression condition did not reduce to known truthiness.');
    }
    return this.evaluateNode(truthy ? expression.yes : expression.no, scope);
  }

  private evaluatedSourceForNode(node: ts.Node): EvaluatedProjectSource | null {
    return this.evaluatedSourcesByFileName.get(normalizeModuleKey(node.getSourceFile().fileName)) ?? null;
  }
}

interface LocatedScopeSlot {
  readonly lookupKind: BindingScopeLookupKind;
  readonly scope: BindingScope | null;
  readonly slot: BindingContextSlot | null;
}

function locatedScopeSlot(
  scope: BindingScope,
  name: string,
  ancestor: number,
): LocatedScopeSlot {
  let current: BindingScope | null = scope;

  if (ancestor > 0) {
    while (ancestor > 0 && current != null) {
      ancestor--;
      current = current.parent;
    }
    if (current == null) {
      return {
        lookupKind: BindingScopeLookupKind.MissingAncestor,
        scope: null,
        slot: null,
      };
    }
    const overrideSlot = current.overrideContext.lookup(name);
    return overrideSlot != null
      ? {
          lookupKind: BindingScopeLookupKind.OverrideContext,
          scope: current,
          slot: overrideSlot,
        }
      : {
          lookupKind: BindingScopeLookupKind.BindingContext,
          scope: current,
          slot: current.bindingContext.lookup(name),
        };
  }

  while (
    current != null
    && !current.isBoundary
    && current.overrideContext.lookup(name) == null
    && current.bindingContext.lookup(name) == null
  ) {
    current = current.parent;
  }

  if (current == null) {
    return {
      lookupKind: BindingScopeLookupKind.FallbackBindingContext,
      scope,
      slot: null,
    };
  }

  const overrideSlot = current.overrideContext.lookup(name);
  return overrideSlot != null
    ? {
        lookupKind: BindingScopeLookupKind.OverrideContext,
        scope: current,
        slot: overrideSlot,
      }
    : {
        lookupKind: BindingScopeLookupKind.BindingContext,
        scope: current,
        slot: current.bindingContext.lookup(name),
      };
}

function boundControllerValuesForRuntimeAnalysis(
  analysis: RuntimeBindingSourceValueRuntimeAnalysis,
): readonly RuntimeBoundControllerPropertyValue[] {
  const bindingsByProductHandle = new Map<ProductHandle, RuntimeBinding>(analysis.runtimeRendering.bindings
    .map((binding) => [binding.productHandle, binding]));
  const controllersByProductHandle = new Map(analysis.runtimeRendering.controllers
    .map((controller) => [controller.productHandle, controller]));
  const scopesByInstructionHandle = new Map<ProductHandle, BindingScope>(analysis.scopes.instructionScopes
    .map((application) => [application.instructionProductHandle, application.scope]));
  const values: RuntimeBoundControllerPropertyValue[] = [];
  for (const targetAccess of analysis.controllerBind.targetAccesses) {
    if (
      targetAccess.targetKind !== RuntimeBindingTargetKind.ControllerViewModel
      || targetAccess.targetControllerProductHandle == null
      || targetAccess.binding.productHandle == null
    ) {
      continue;
    }
    const binding = bindingsByProductHandle.get(targetAccess.binding.productHandle) ?? null;
    const expressionProductHandle = sourceExpressionProductHandleForBoundControllerBinding(binding);
    if (binding == null || expressionProductHandle === undefined) {
      continue;
    }
    const targetController = controllersByProductHandle.get(targetAccess.targetControllerProductHandle) ?? null;
    values.push({
      controllerProductHandle: targetAccess.targetControllerProductHandle,
      controllerDefinitionProductHandle: targetController?.definitionProductHandle ?? null,
      propertyName: targetAccess.targetProperty,
      bindingProductHandle: binding.productHandle,
      expressionProductHandle,
      sourceScope: scopesByInstructionHandle.get(binding.instructionProductHandle) ?? null,
    });
  }
  return values;
}

function controllerDefinitionsForRuntimeAnalysis(
  resource: RuntimeBindingSourceValueTemplateResource,
): readonly RuntimeControllerDefinitionReference[] {
  const definition = resource.compilation.definition;
  return [
    {
      controllerProductHandle: null,
      definitionProductHandle: definition.productHandle,
      definitionTargetType: definition.target.targetType,
    },
    ...resource.runtimeAnalysis.runtimeRendering.controllers.map((controller) => ({
      controllerProductHandle: controller.productHandle,
      definitionProductHandle: controller.definitionProductHandle,
      definitionTargetType: null,
    })),
  ];
}

function sourceExpressionProductHandleForBoundControllerBinding(
  binding: RuntimeBinding | null,
): ProductHandle | null | undefined {
  if (binding instanceof PropertyBinding) {
    return propertyBindingCarriesSourceToTarget(binding)
      ? binding.expressionProductHandle
      : undefined;
  }
  if (binding instanceof InterpolationBinding) {
    return binding.expressionProductHandles[0] ?? null;
  }
  return undefined;
}

function propertyBindingCarriesSourceToTarget(binding: PropertyBinding): boolean {
  switch (binding.bindingMode) {
    case TemplateBindingMode.OneTime:
    case TemplateBindingMode.ToView:
    case TemplateBindingMode.TwoWay:
      return true;
    case TemplateBindingMode.FromView:
    case TemplateBindingMode.Default:
    case TemplateBindingMode.Open:
      return false;
  }
}

function bindingExpressionAstForProduct(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): ExpressionAstNode | null {
  if (expressionProductHandle == null) {
    return null;
  }
  const parse = store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  return parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
}

function evaluatedSourceForValue(
  value: EvaluationValue,
  evaluatedSourcesByFileName: ReadonlyMap<string, EvaluatedProjectSource>,
): EvaluatedProjectSource | null {
  const sourceFile = value.node?.getSourceFile() ?? null;
  return sourceFile == null
    ? null
    : evaluatedSourcesByFileName.get(normalizeModuleKey(sourceFile.fileName)) ?? null;
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

function compactOpenReasonKinds(
  values: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return [...new Set(values)];
}

function primitiveValue(
  value: null | undefined | number | boolean | string,
  node: ts.Node | null,
): EvaluationValue {
  switch (typeof value) {
    case 'string':
      return new EvaluationStringValue(value, node);
    case 'number':
      return new EvaluationNumberValue(value, node);
    case 'boolean':
      return new EvaluationBooleanValue(value, node);
    case 'undefined':
      return EvaluationUndefined;
    default:
      return value === null ? new EvaluationNullValue(node) : EvaluationUndefined;
  }
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
