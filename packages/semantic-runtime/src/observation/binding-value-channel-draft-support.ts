import ts from 'typescript';
import type { BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { uniqueStrings } from '../kernel/collections.js';
import { checkerExpressionTypeLocalKey } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  HtmlElement,
  HtmlIrNodeKind,
  HtmlText,
  normalizeHtmlTagName,
  type HtmlAttribute,
  type HtmlNodeReference,
} from '../template/html-ir.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import { TemplateProductDetails } from '../template/product-details.js';
import {
  PropertyBinding,
  RuntimeBindingTargetKind,
  SpreadValueBinding,
  type RuntimeBinding,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import {
  frameworkTemplateControllerSemanticsForName,
  type BuiltInTemplateControllerSemantics,
} from '../template/template-controller-semantics.js';
import type { RuntimeControllerFrame } from '../template/runtime-controller.js';
import { CheckerAsyncTypeProjector } from '../type-system/checker-async-type-projector.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import {
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';
import {
  checkerNullishType,
} from '../type-system/checker-related-types.js';
import {
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
  type CheckerSyntheticTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import {
  CheckerTypeShapeAccess,
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import {
  checkerBackedUnionTypeForReferences,
} from '../type-system/checker-type-union.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeShapeKind,
  checkerTypeReferenceWithSource,
  sameCheckerTypeReference,
  type CheckerTypeReference,
  type CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  arrayElementTypeFor,
  booleanLiteralValuesForType,
  collectionElementTypeFor,
  isBooleanLike,
  mapKeyTypeFor,
  mapValueTypeFor,
  stringLiteralValuesForType,
} from './checker-type-helpers.js';
import {
  expressionProductHandleForBinding,
} from './runtime-binding-expression.js';
import type {
  BindingSourceTypeReader,
  BindingValueChannelDraftContext,
  BindingValueExpression,
  CheckedSourceShape,
  RuntimeValueChannelBinding,
} from './binding-value-channel-draft-types.js';
import {
  RuntimeBindingValueChannelCouplingKind,
  type RuntimeBindingPrimitiveValue,
} from './runtime-binding-observation.js';
import {
  runtimeBindingPrimitiveValueDomString,
  runtimeBindingPrimitiveValueDomainForExpression,
  runtimeBindingPrimitiveValueTypeDisplay,
  runtimeBindingStringLiteralTypeDisplay,
  runtimeBindingStringDomainForPrimitiveValues,
  runtimeBindingStringPrimitiveDomain,
} from './runtime-binding-primitive-value.js';

export class RuntimeBindingValueChannelTypeSupport {
  private readonly asyncTypeProjector: CheckerAsyncTypeProjector;
  private readonly typeAccess: CheckerTypeShapeAccess;

  constructor(
    private readonly store: KernelStore,
    private readonly typeProjector: CheckerTypeProjector,
  ) {
    this.asyncTypeProjector = new CheckerAsyncTypeProjector(store, typeProjector);
    this.typeAccess = new CheckerTypeShapeAccess(store, typeProjector);
  }

  projectCheckerType(
    local: string,
    checker: ts.TypeChecker,
    type: ts.Type,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    return this.typeProjector.ensureProjection({
      localKey: local,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  booleanValueType(
    local: string,
    binding: PropertyBinding,
    sourceType: CheckerTypeReference | null,
  ): CheckerTypeReference {
    const sourceShape = this.readTypeShape(sourceType);
    const carrier = sourceShape?.carrier ?? null;
    if (carrier != null) {
      return this.typeProjector.ensureProjection({
        localKey: local,
        checker: carrier.checker,
        type: carrier.checker.getBooleanType(),
        origin: CheckerTypeProjectionOrigin.TypeChecker,
        sourceAddressHandle: binding.sourceAddressHandle,
        display: 'boolean',
      } satisfies CheckerTypeProjectionRequest).toReference();
    }
    return this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: CheckerTypeShapeKind.Primitive,
      display: 'boolean',
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle: binding.sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest).toReference();
  }

  customMatcherFunctionType(
    local: string,
    sourceType: CheckerTypeReference | null,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    const sourceCarrier = this.readTypeShape(sourceType)?.carrier ?? null;
    const booleanType = sourceCarrier == null
      ? this.typeProjector.ensureSyntheticProjection({
        localKey: `${local}:return`,
        shapeKind: CheckerTypeShapeKind.Primitive,
        display: 'boolean',
        members: [],
        origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
        sourceAddressHandle,
      } satisfies CheckerSyntheticTypeProjectionRequest).toReference()
      : this.projectCheckerType(
        `${local}:return`,
        sourceCarrier.checker,
        sourceCarrier.checker.getBooleanType(),
        sourceAddressHandle,
      );
    return this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: CheckerTypeShapeKind.Function,
      display: '(left: unknown, right: unknown) => boolean',
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
      callReturnType: booleanType,
    } satisfies CheckerSyntheticTypeProjectionRequest).toReference();
  }

  stringValueType(
    local: string,
    binding: PropertyBinding,
    checkerSource: CheckerTypeReference | null = null,
  ): CheckerTypeReference {
    const carrier = this.readTypeShape(checkerSource)?.carrier ?? null;
    if (carrier != null) {
      return this.projectCheckerType(
        local,
        carrier.checker,
        carrier.checker.getStringType(),
        binding.sourceAddressHandle,
      );
    }
    return this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: CheckerTypeShapeKind.Primitive,
      display: 'string',
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle: binding.sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest).toReference();
  }

  unionValueType(
    local: string,
    references: readonly CheckerTypeReference[],
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    if (references.length === 0) {
      return null;
    }
    const first = references[0]!;
    if (references.every((reference) => sameCheckerTypeReference(first, reference))) {
      return first;
    }

    const checkerBackedUnion = checkerBackedUnionTypeForReferences(this.store, references);
    if (checkerBackedUnion != null) {
      return this.projectCheckerType(
        local,
        checkerBackedUnion.checker,
        checkerBackedUnion.type,
        sourceAddressHandle,
      );
    }

    return this.syntheticUnionValueType(local, references, sourceAddressHandle);
  }

  private syntheticUnionValueType(
    local: string,
    references: readonly CheckerTypeReference[],
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    const display = uniqueStrings(references.map((reference) =>
      reference.display ?? reference.checkerKey ?? 'unknown'
    )).join(' | ');
    return this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: CheckerTypeShapeKind.Union,
      display,
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest).toReference();
  }

  targetOperationRuntimeInputType(
    local: string,
    sourceType: CheckerTypeReference | null,
    targetOperation: RuntimeBindingTargetOperation,
  ): CheckerTypeReference {
    return sourceType ?? this.unknownRuntimeInputType(local, targetOperation.sourceAddressHandle);
  }

  eventHandlerInvocationValueType(
    sourceType: CheckerTypeReference | null,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const shape = this.readTypeShape(sourceType);
    return shape?.callReturnType == null
      ? sourceType
      : checkerTypeReferenceWithSource(shape.callReturnType, sourceAddressHandle);
  }

  unknownRuntimeInputType(
    local: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    return this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: CheckerTypeShapeKind.Unknown,
      display: 'unknown',
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest).toReference();
  }

  targetAccessRuntimeInputType(
    local: string,
    targetAccess: RuntimeBindingTargetAccess,
  ): CheckerTypeReference {
    return targetAccess.propertyType ?? this.unknownRuntimeInputType(local, targetAccess.sourceAddressHandle);
  }

  awaitedTypeReference(
    local: string,
    promiseType: CheckerTypeReference | null,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    return promiseType == null
      ? null
      : this.asyncTypeProjector.awaitedTypeReference(promiseType, local, sourceAddressHandle);
  }

  stringLiteralDomainType(
    local: string,
    values: readonly string[],
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    const shape = this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: values.length > 1 ? CheckerTypeShapeKind.Union : CheckerTypeShapeKind.Primitive,
      display: values.map(runtimeBindingStringLiteralTypeDisplay).join(' | '),
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest);
    return shape.toReference();
  }

  primitiveLiteralDomainType(
    local: string,
    values: readonly RuntimeBindingPrimitiveValue[],
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    if (values.length === 0) {
      return null;
    }
    const shape = this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: values.length > 1 ? CheckerTypeShapeKind.Union : CheckerTypeShapeKind.Primitive,
      display: values.map(runtimeBindingPrimitiveValueTypeDisplay).join(' | '),
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest);
    return shape.toReference();
  }

  stringLiteralDomainForType(reference: CheckerTypeReference | null): readonly string[] {
    const shape = this.readTypeShape(reference);
    const carrier = shape?.carrier ?? null;
    return carrier == null ? [] : stringLiteralValuesForType(carrier.type) ?? [];
  }

  booleanLiteralDomainForType(reference: CheckerTypeReference | null): readonly boolean[] {
    const shape = this.readTypeShape(reference);
    const carrier = shape?.carrier ?? null;
    return carrier == null ? [] : booleanLiteralValuesForType(carrier.type) ?? [];
  }

  memberType(
    reference: CheckerTypeReference | null,
    propertyName: string,
  ): CheckerTypeReference | null {
    const shape = this.readTypeShape(reference);
    if (shape == null) {
      return null;
    }
    return this.typeAccess.memberValueAccess(
      shape,
      propertyName,
      `${reference?.productHandle ?? reference?.checkerKey ?? 'runtime-binding'}:member:${propertyName}`,
    ).valueReference;
  }

  checkedSourceShape(
    sourceType: CheckerTypeReference | null,
  ): CheckedSourceShape {
    const shape = this.readTypeShape(sourceType);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return {
        kind: 'open',
      };
    }
    const classification = checkedSourceShapeClassification(carrier.checker, carrier.type);
    if (classification.kind === 'open') {
      return {
        kind: 'open',
      };
    }
    if (classification.kind === 'dynamic') {
      const collectionElementType = classification.dynamicMode === 'collection-or-boolean'
        ? collectionElementTypeFor(carrier.checker, carrier.type)
        : mapKeyTypeFor(carrier.checker, carrier.type);
      return {
        kind: 'dynamic',
        dynamicMode: classification.dynamicMode,
        sourceType,
        elementType: collectionElementType == null
          ? null
          : this.projectCheckerType(
            `${sourceType?.productHandle ?? 'checked-source'}:${classification.dynamicMode}:element`,
            carrier.checker,
            collectionElementType,
            sourceType?.sourceAddressHandle ?? null,
          ),
        mapValueType: classification.dynamicMode === 'map-or-boolean'
          ? mapValueTypeForReference(this, sourceType, carrier.checker, carrier.type)
          : null,
      };
    }
    if (classification.kind === 'collection') {
      const collectionElementType = collectionElementTypeFor(carrier.checker, carrier.type);
      return {
        kind: 'collection',
        elementType: collectionElementType == null
          ? null
          : this.projectCheckerType(
            `${sourceType?.productHandle ?? 'checked-source'}:collection-element`,
            carrier.checker,
            collectionElementType,
            sourceType?.sourceAddressHandle ?? null,
          ),
      };
    }
    if (classification.kind === 'map') {
      const mapKeyType = mapKeyTypeFor(carrier.checker, carrier.type);
      const mapValueType = mapValueTypeFor(carrier.checker, carrier.type);
      return {
        kind: 'map',
        elementType: mapKeyType == null
          ? null
          : this.projectCheckerType(
            `${sourceType?.productHandle ?? 'checked-source'}:map-key`,
            carrier.checker,
            mapKeyType,
            sourceType?.sourceAddressHandle ?? null,
          ),
        mapValueType: mapValueType == null
          ? null
          : this.projectCheckerType(
            `${sourceType?.productHandle ?? 'checked-source'}:map-value`,
            carrier.checker,
            mapValueType,
            sourceType?.sourceAddressHandle ?? null,
          ),
      };
    }
    if (classification.kind === 'boolean') {
      return {
        kind: 'boolean',
      };
    }
    return {
      kind: 'other',
    };
  }

  readTypeShape(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return readCheckerTypeShape(this.store, reference);
  }
}

type CheckedSourceShapeClassification =
  | { readonly kind: 'boolean' | 'collection' | 'map' | 'other' | 'open' }
  | {
    readonly kind: 'dynamic';
    readonly dynamicMode: 'collection-or-boolean' | 'map-or-boolean';
  };

function checkedSourceShapeClassification(
  checker: ts.TypeChecker,
  sourceType: ts.Type,
): CheckedSourceShapeClassification {
  const runtimeKinds = new Set<'booleanish' | 'collection' | 'map' | 'other'>();
  for (const part of sourceType.isUnion() ? sourceType.types : [sourceType]) {
    if (checkerTypeShapePartIsOpen(part)) {
      return { kind: 'open' };
    }
    if (mapKeyTypeFor(checker, part) != null) {
      runtimeKinds.add('map');
    } else if (collectionElementTypeFor(checker, part) != null) {
      runtimeKinds.add('collection');
    } else if (isBooleanLike(part)) {
      runtimeKinds.add('booleanish');
    } else if (checkerNullishType(checker, part)) {
      runtimeKinds.add('other');
    } else {
      runtimeKinds.add('other');
    }
  }

  if (runtimeKinds.has('collection') && runtimeKinds.has('map')) {
    return { kind: 'open' };
  }
  if (runtimeKinds.has('collection') && runtimeKinds.size > 1) {
    return { kind: 'dynamic', dynamicMode: 'collection-or-boolean' };
  }
  if (runtimeKinds.has('map') && runtimeKinds.size > 1) {
    return { kind: 'dynamic', dynamicMode: 'map-or-boolean' };
  }
  if (runtimeKinds.has('collection')) {
    return { kind: 'collection' };
  }
  if (runtimeKinds.has('map')) {
    return { kind: 'map' };
  }
  return runtimeKinds.has('booleanish') && !runtimeKinds.has('other')
    ? { kind: 'boolean' }
    : { kind: 'other' };
}

function checkerTypeShapePartIsOpen(type: ts.Type): boolean {
  return (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) !== 0;
}

function mapValueTypeForReference(
  support: RuntimeBindingValueChannelTypeSupport,
  sourceType: CheckerTypeReference | null,
  checker: ts.TypeChecker,
  type: ts.Type,
): CheckerTypeReference | null {
  const mapValueType = mapValueTypeFor(checker, type);
  return mapValueType == null
    ? null
    : support.projectCheckerType(
      `${sourceType?.productHandle ?? 'checked-source'}:map-value`,
      checker,
      mapValueType,
      sourceType?.sourceAddressHandle ?? null,
    );
}

export class RuntimeBindingValueChannelDraftSupport {
  readonly types: RuntimeBindingValueChannelTypeSupport;

  constructor(
    private readonly store: KernelStore,
    typeProjector: CheckerTypeProjector,
  ) {
    this.types = new RuntimeBindingValueChannelTypeSupport(store, typeProjector);
  }

  inputRuntimeValue(
    local: string,
    input: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): BindingValueExpression {
    const modelBinding = this.propertyBindingForNodeTarget(input, context.input, ['model']);
    if (modelBinding != null) {
      return this.bindingValueExpression(`${local}:element-model`, modelBinding, context);
    }
    const model = this.attributeValue(input, 'model');
    if (model != null) {
      return staticStringValue(model);
    }
    const valueBinding = this.propertyBindingForNodeTarget(input, context.input, ['value']);
    if (valueBinding != null) {
      return this.domValueBindingExpression(`${local}:element-value`, valueBinding, context, '');
    }
    return staticStringValue(this.attributeValue(input, 'value') ?? 'on');
  }

  optionRuntimeValue(
    local: string,
    option: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): BindingValueExpression {
    const modelBinding = this.propertyBindingForNodeTarget(option, context.input, ['model']);
    if (modelBinding != null) {
      return this.bindingValueExpression(`${local}:element-model`, modelBinding, context);
    }
    const model = this.attributeValue(option, 'model');
    if (model != null) {
      return staticStringValue(model);
    }
    const valueBinding = this.propertyBindingForNodeTarget(option, context.input, ['value']);
    if (valueBinding != null) {
      return this.domValueBindingExpression(`${local}:element-value`, valueBinding, context, null);
    }
    return staticStringValue(this.optionStaticValue(option));
  }

  bindingValueExpression(
    local: string,
    binding: PropertyBinding,
    context: BindingValueChannelDraftContext,
  ): BindingValueExpression {
    const scope = context.instructionScopes.scopeForBinding(context.input.runtimeBindings, binding);
    const parse = this.readParse(binding.expressionProductHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    if (scope == null || ast == null) {
      return {
        valueType: null,
        valueDomain: [],
        primitiveValueDomain: [],
      };
    }
    const primitiveDomain = runtimeBindingPrimitiveValueDomainForExpression(ast);
    const stringDomain = runtimeBindingStringDomainForPrimitiveValues(primitiveDomain);
    if (stringDomain.length > 0 && stringDomain.length === primitiveDomain.length) {
      return this.literalDomainBindingValueExpression(local, binding, stringDomain, primitiveDomain);
    }
    const evaluated = this.evaluatedBindingValueExpression(binding, scope, ast, context);
    return primitiveDomain.length === 0
      ? evaluated
      : {
        ...evaluated,
        primitiveValueDomain: primitiveDomain,
      };
  }

  private domValueBindingExpression(
    local: string,
    binding: PropertyBinding,
    context: BindingValueChannelDraftContext,
    nullishDefault: string | null,
  ): BindingValueExpression {
    const parse = this.readParse(binding.expressionProductHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    if (ast == null) {
      return {
        valueType: this.types.stringValueType(`${local}:dom-string`, binding),
        valueDomain: [],
        primitiveValueDomain: [],
      };
    }
    const primitiveDomain = runtimeBindingPrimitiveValueDomainForExpression(ast);
    const stringDomain = uniqueStrings(primitiveDomain.map((value) =>
      runtimeBindingPrimitiveValueDomString(value, nullishDefault)
    ));
    if (stringDomain.length > 0 && stringDomain.length === primitiveDomain.length) {
      return this.literalDomainBindingValueExpression(local, binding, stringDomain, runtimeBindingStringPrimitiveDomain(stringDomain));
    }

    const scope = context.instructionScopes.scopeForBinding(context.input.runtimeBindings, binding);
    const evaluated = scope == null
      ? null
      : this.evaluatedBindingValueExpression(binding, scope, ast, context);
    const evaluatedStringDomain = this.types.stringLiteralDomainForType(evaluated?.valueType ?? null);
    if (evaluatedStringDomain.length > 0) {
      return this.literalDomainBindingValueExpression(
        `${local}:checker-string-domain`,
        binding,
        evaluatedStringDomain,
        runtimeBindingStringPrimitiveDomain(evaluatedStringDomain),
      );
    }

    return {
      valueType: this.types.stringValueType(`${local}:dom-string`, binding, evaluated?.valueType ?? null),
      valueDomain: [],
      primitiveValueDomain: [],
    };
  }

  private literalDomainBindingValueExpression(
    local: string,
    binding: PropertyBinding,
    literalDomain: readonly string[],
    primitiveDomain: readonly RuntimeBindingPrimitiveValue[],
  ): BindingValueExpression {
    return {
      valueType: this.types.stringLiteralDomainType(`${local}:literal-domain`, literalDomain, binding.sourceAddressHandle),
      valueDomain: literalDomain,
      primitiveValueDomain: primitiveDomain,
    };
  }

  private evaluatedBindingValueExpression(
    binding: PropertyBinding,
    scope: BindingScope,
    ast: ExpressionAstNode,
    context: BindingValueChannelDraftContext,
  ): BindingValueExpression {
    const evaluation = context.evaluator.evaluateWithScope(
      ast,
      scope,
      checkerExpressionTypeLocalKey(scope.productHandle, binding.productHandle, binding.expressionProductHandle),
      binding.sourceAddressHandle,
    );
    if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return {
        valueType: null,
        valueDomain: [],
        primitiveValueDomain: [],
      };
    }
    return {
      valueType: evaluation.typeReference,
      valueDomain: [],
      primitiveValueDomain: [],
    };
  }

  propertyBindingForNodeTarget(
    node: HtmlElement,
    input: { readonly runtimeBindings: RuntimeRenderingEmission },
    targets: readonly string[],
  ): PropertyBinding | null {
    return input.runtimeBindings.bindings.find((binding: RuntimeBinding): binding is PropertyBinding =>
      binding instanceof PropertyBinding
      && binding.node.productHandle === node.productHandle
      && targets.includes(binding.target)
    ) ?? null;
  }

  propertyBindingForControllerTarget(
    controller: RuntimeControllerFrame,
    context: BindingValueChannelDraftContext,
    targets: readonly string[],
  ): PropertyBinding | null {
    const targetAccess = context.input.controllerBind.targetAccesses.find((candidate) =>
      candidate.targetKind === RuntimeBindingTargetKind.ControllerViewModel
      && candidate.targetControllerProductHandle === controller.productHandle
      && targets.includes(candidate.targetProperty)
      && candidate.binding.productHandle != null
    ) ?? null;
    if (targetAccess?.binding.productHandle == null) {
      return null;
    }
    return context.input.runtimeBindings.bindings.find((binding): binding is PropertyBinding =>
      binding instanceof PropertyBinding
      && binding.productHandle === targetAccess.binding.productHandle
    ) ?? null;
  }

  hasCustomMatcherBinding(
    node: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): boolean {
    return this.propertyBindingForNodeTarget(node, context.input, ['matcher']) != null;
  }

  templateControllerSemanticsForTargetAccess(
    targetAccess: RuntimeBindingTargetAccess,
    context: BindingValueChannelDraftContext,
  ): BuiltInTemplateControllerSemantics | null {
    const controller = this.controllerForTargetAccess(targetAccess, context);
    return controller?.name == null
      ? null
      : frameworkTemplateControllerSemanticsForName(controller.name);
  }

  controllerForTargetAccess(
    targetAccess: RuntimeBindingTargetAccess,
    context: BindingValueChannelDraftContext,
  ): RuntimeControllerFrame | null {
    if (
      targetAccess.targetKind !== RuntimeBindingTargetKind.ControllerViewModel
      || targetAccess.targetControllerProductHandle == null
    ) {
      return null;
    }
    return context.input.runtimeBindings.controllers.find((candidate) =>
      candidate.productHandle === targetAccess.targetControllerProductHandle
    ) ?? null;
  }

  promiseFulfilledValueTypeForTemplateControllerBranch(
    local: string,
    targetAccess: RuntimeBindingTargetAccess,
    context: BindingValueChannelDraftContext,
  ): CheckerTypeReference | null {
    const branchController = this.controllerForTargetAccess(targetAccess, context);
    const promiseController = nearestNamedControllerAncestor(branchController, 'promise');
    const promiseValueBinding = promiseController == null
      ? null
      : this.propertyBindingForControllerTarget(promiseController, context, ['value']);
    if (promiseValueBinding == null) {
      return null;
    }
    const promiseValueScope = context.instructionScopes.scopeForBinding(context.input.runtimeBindings, promiseValueBinding);
    const promiseType = this.sourceTypeForBinding(promiseValueBinding, promiseValueScope, context.evaluator, 'value');
    return this.types.awaitedTypeReference(
      `${local}:promise-fulfilled-value`,
      promiseType,
      targetAccess.sourceAddressHandle,
    );
  }

  sourceTypeForBinding(
    binding: RuntimeValueChannelBinding,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    targetProperty: string | null = null,
  ): CheckerTypeReference | null {
    if (scope == null) {
      return null;
    }
    const parse = this.readParse(expressionProductHandleForBinding(binding));
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    if (ast == null) {
      return null;
    }
    const evaluation = evaluator.evaluateWithScope(
      ast,
      scope,
      checkerExpressionTypeLocalKey(scope.productHandle, binding.productHandle, expressionProductHandleForBinding(binding)),
      binding.sourceAddressHandle,
    );
    if (evaluation.kind !== CheckerExpressionTypeEvaluationResultKind.Type) {
      return null;
    }
    if (binding instanceof SpreadValueBinding && targetProperty != null) {
      return this.types.memberType(evaluation.typeReference, targetProperty);
    }
    return evaluation.typeReference;
  }

  sourceTypeReaderForBinding(
    binding: RuntimeValueChannelBinding,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    targetProperty: string | null = null,
  ): BindingSourceTypeReader {
    let evaluated = false;
    let sourceType: CheckerTypeReference | null = null;
    return () => {
      if (!evaluated) {
        sourceType = this.sourceTypeForBinding(binding, scope, evaluator, targetProperty);
        evaluated = true;
      }
      return sourceType;
    };
  }

  readParse(productHandle: ProductHandle | null): TemplateExpressionParse | null {
    return productHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
  }

  optionElementsFor(select: HtmlElement): readonly HtmlElement[] {
    const result: HtmlElement[] = [];
    const visit = (reference: HtmlNodeReference): void => {
      const element = this.htmlElementFor(reference);
      if (element == null) {
        return;
      }
      const tagName = normalizeHtmlTagName(element.tagName);
      if (tagName === 'OPTION') {
        result.push(element);
        return;
      }
      if (tagName === 'OPTGROUP') {
        for (const child of element.children) {
          visit(child);
        }
      }
    };
    for (const child of select.children) {
      visit(child);
    }
    return result;
  }

  private optionStaticValue(option: HtmlElement): string {
    return this.attributeValue(option, 'value') ?? this.textContent(option).trim();
  }

  private textContent(element: HtmlElement): string {
    return element.children.map((child) => {
      if (child.nodeKind === HtmlIrNodeKind.Text && child.productHandle != null) {
        const text = this.store.productDetails.read(TemplateProductDetails.HtmlNode, child.productHandle);
        return text instanceof HtmlText ? text.text : '';
      }
      const childElement = this.htmlElementFor(child);
      return childElement == null ? '' : this.textContent(childElement);
    }).join('');
  }

  htmlElementFor(reference: HtmlNodeReference | null): HtmlElement | null {
    if (reference?.productHandle == null) {
      return null;
    }
    const node = this.store.productDetails.read(TemplateProductDetails.HtmlNode, reference.productHandle);
    return node instanceof HtmlElement ? node : null;
  }

  private attributesFor(element: HtmlElement): readonly HtmlAttribute[] {
    return element.attributes
      .map((attribute) => attribute.productHandle == null
        ? null
        : this.store.productDetails.read(TemplateProductDetails.HtmlAttribute, attribute.productHandle))
      .filter((attribute): attribute is HtmlAttribute => attribute != null);
  }

  attributeValue(element: HtmlElement, rawName: string): string | null {
    const attribute = this.attributesFor(element).find((candidate) =>
      candidate.rawName.toLowerCase() === rawName.toLowerCase()
    );
    return attribute?.rawValue ?? null;
  }

  hasAttribute(element: HtmlElement, rawName: string): boolean {
    return this.attributesFor(element).some((candidate) =>
      candidate.rawName.toLowerCase() === rawName.toLowerCase()
    );
  }
}

function nearestNamedControllerAncestor(
  controller: RuntimeControllerFrame | null,
  name: string,
): RuntimeControllerFrame | null {
  let current = controller?.parent ?? null;
  while (current != null) {
    if (current.name === name) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function staticStringValue(value: string): BindingValueExpression {
  return {
    valueType: null,
    valueDomain: [value],
    primitiveValueDomain: runtimeBindingStringPrimitiveDomain([value]),
  };
}

export function withCustomMatcherCoupling(
  couplings: readonly RuntimeBindingValueChannelCouplingKind[],
  usesCustomMatcher: boolean,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  return usesCustomMatcher
    ? [...couplings, RuntimeBindingValueChannelCouplingKind.CustomMatcherComparison]
    : couplings;
}

export function isBroadTypeShape(
  shape: CheckerTypeShape | null | undefined,
  reference: CheckerTypeReference,
): boolean {
  return shape?.shapeKind === CheckerTypeShapeKind.Any
    || shape?.shapeKind === CheckerTypeShapeKind.Unknown
    || reference.display === 'any'
    || reference.display === 'unknown';
}

export function sourceTypeHasAssignableArrayPart(
  checker: ts.TypeChecker,
  sourceType: ts.Type,
  optionValueType: ts.Type,
): boolean {
  return checkerTypeParts(sourceType).some((part) => {
    const elementType = arrayElementTypeFor(checker, part);
    return elementType != null && checker.isTypeAssignableTo(optionValueType, elementType);
  });
}

export function stringLiteralTypesForDomain(
  checker: ts.TypeChecker,
  values: readonly string[],
): readonly ts.Type[] {
  return uniqueStrings(values).map((value) => checker.getStringLiteralType(value));
}

function checkerTypeParts(type: ts.Type): readonly ts.Type[] {
  return type.isUnion() ? type.types : [type];
}
