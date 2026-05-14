import ts from 'typescript';
import { splitWhitespace } from '../strings.js';
import {
  arrayElementTypeFor,
  booleanLiteralValuesForType,
  collectionElementTypeFor,
  isBooleanLike,
  mapKeyTypeFor,
  mapValueTypeFor,
  stringLiteralValuesForType,
} from './checker-type-helpers.js';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { checkerExpressionTypeLocalKey } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { BindingScope } from '../configuration/scope.js';
import {
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';
import {
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
  type CheckerSyntheticTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeShapeKind,
  sameCheckerTypeReference,
  type CheckerTypeShape,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  HtmlElement,
  HtmlIrNodeKind,
  HtmlText,
  normalizeHtmlTagName,
  type HtmlAttribute,
  type HtmlNodeReference,
} from '../template/html-ir.js';
import { TemplateProductDetails } from '../template/product-details.js';
import {
  AttributeBinding,
  ContentBinding,
  PropertyBinding,
  RefBinding,
  SpreadValueBinding,
  type RuntimeBinding,
  type RuntimeBindingSourceOperation,
  RuntimeBindingTargetAccessStrategy,
  type RuntimeBindingTargetAccess,
  RuntimeBindingTargetOperationKind,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import {
  expressionProductHandleForBinding,
  type RuntimeExpressionBinding,
} from './runtime-binding-expression.js';
import {
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';

export type RuntimeValueChannelBinding = RuntimeExpressionBinding;

export type RuntimeBindingValueChannelDraft = {
  readonly channelKind: RuntimeBindingValueChannelKind;
  readonly authority: RuntimeBindingValueChannelAuthority;
  readonly runtimeValueType: CheckerTypeReference | null;
  readonly valueDomain: readonly string[];
  readonly isCollection: boolean | null;
  readonly openReason: string | null;
  readonly openReasonKinds?: readonly OpenSeamReasonKind[];
};

export interface BindingValueChannelDraftContext {
  readonly input: {
    readonly runtimeBindings: RuntimeRenderingEmission;
  };
  readonly instructionScopes: ReadonlyMap<ProductHandle, BindingScope>;
  readonly evaluator: CheckerExpressionTypeEvaluator;
}

type BindingSourceTypeReader = () => CheckerTypeReference | null;

type CheckedSourceShape = {
  readonly kind: 'boolean' | 'collection' | 'map' | 'other' | 'open';
  readonly elementType?: CheckerTypeReference | null;
  readonly mapValueType?: CheckerTypeReference | null;
};

type SelectMultipleMode =
  | {
    readonly kind: 'single' | 'multiple';
  }
  | {
    readonly kind: 'dynamic';
  }
  | {
    readonly kind: 'open';
    readonly openReason: string;
    readonly openReasonKinds: readonly OpenSeamReasonKind[];
  };

type BindingValueExpression = {
  readonly valueType: CheckerTypeReference | null;
  readonly valueDomain: readonly string[];
};

/**
 * Computes the runtime value shape selected by binding/observer semantics before kernel publication.
 *
 * The publisher owns handles, claims, provenance, and open-seam records. This draft layer owns framework behavior such
 * as `CheckedObserver`, `SelectValueObserver`, class/style accessors, direct target operations, and `ref` source writes.
 */
export class RuntimeBindingValueChannelDraftMaterializer {
  private readonly support: RuntimeBindingValueChannelDraftSupport;
  private readonly directBinding: DirectBindingValueChannelDrafts;
  private readonly selectObserver: SelectValueObserverChannelDrafts;
  private readonly checkedObserver: CheckedObserverChannelDrafts;

  constructor(
    store: KernelStore,
    typeProjector: CheckerTypeProjector,
  ) {
    this.support = new RuntimeBindingValueChannelDraftSupport(store, typeProjector);
    this.directBinding = new DirectBindingValueChannelDrafts(this.support);
    this.selectObserver = new SelectValueObserverChannelDrafts(this.support);
    this.checkedObserver = new CheckedObserverChannelDrafts(this.support);
  }

  valueChannelDraftForBinding(
    local: string,
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    targetOperation: RuntimeBindingTargetOperation | null,
    sourceOperation: RuntimeBindingSourceOperation | null,
    context: BindingValueChannelDraftContext,
  ): RuntimeBindingValueChannelDraft {
    const scope = context.instructionScopes.get(binding.instructionProductHandle) ?? null;
    const readSourceType = this.support.sourceTypeReaderForBinding(
      binding,
      scope,
      context.evaluator,
      targetAccess?.targetProperty ?? null,
    );
    if (binding instanceof RefBinding) {
      return this.directBinding.valueChannelDraftForSourceOperation(sourceOperation);
    }
    if (binding instanceof SpreadValueBinding && targetAccess == null) {
      const sourceType = readSourceType();
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: sourceType,
        valueDomain: [],
        isCollection: null,
        openReason: 'SpreadValueBinding could not close its target bindable keys for per-bindable inner PropertyBinding materialization.',
      };
    }
    if (binding instanceof AttributeBinding || binding instanceof ContentBinding) {
      return this.directBinding.valueChannelDraftForTargetOperation(local, targetOperation, readSourceType);
    }
    if (targetAccess == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: null,
        valueDomain: [],
        isCollection: null,
        openReason: 'Runtime binding did not carry a target accessor or observer product for value-channel materialization.',
      };
    }
    if (targetAccess.openReason != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: targetAccess.openReason,
      };
    }

    switch (targetAccess.strategy) {
      case RuntimeBindingTargetAccessStrategy.ClassAttributeAccessor:
        return this.directBinding.classValueChannelDraft(binding, targetAccess, readSourceType);
      case RuntimeBindingTargetAccessStrategy.StyleAttributeAccessor:
        return this.directBinding.styleValueChannelDraft(binding, targetAccess, readSourceType);
      case RuntimeBindingTargetAccessStrategy.AttributeAccessor:
      case RuntimeBindingTargetAccessStrategy.DataAttributeAccessor:
        return this.directBinding.attributeValueChannelDraft(readSourceType, targetAccess);
      case RuntimeBindingTargetAccessStrategy.SelectValueObserver:
        if (!(binding instanceof PropertyBinding)) {
          return {
            channelKind: RuntimeBindingValueChannelKind.Open,
            authority: RuntimeBindingValueChannelAuthority.Open,
            runtimeValueType: targetAccess.propertyType,
            valueDomain: [],
            isCollection: null,
            openReason: 'SelectValueObserver value-channel materialization expected a runtime PropertyBinding product.',
          };
        }
        return this.selectObserver.valueChannelDraft(local, binding, targetAccess, readSourceType, context);
      case RuntimeBindingTargetAccessStrategy.CheckedObserver:
        if (!(binding instanceof PropertyBinding)) {
          return {
            channelKind: RuntimeBindingValueChannelKind.Open,
            authority: RuntimeBindingValueChannelAuthority.Open,
            runtimeValueType: targetAccess.propertyType,
            valueDomain: [],
            isCollection: null,
            openReason: 'CheckedObserver value-channel materialization expected a runtime PropertyBinding product.',
          };
        }
        return this.checkedObserver.valueChannelDraft(local, binding, targetAccess, readSourceType, context);
      default:
        return {
          channelKind: RuntimeBindingValueChannelKind.RawProperty,
          authority: RuntimeBindingValueChannelAuthority.TargetAccess,
          runtimeValueType: this.support.types.targetAccessRuntimeInputType(`${local}:target-access-input`, targetAccess),
          valueDomain: [],
          isCollection: null,
          openReason: null,
        };
    }
  }
}

class RuntimeBindingValueChannelTypeSupport {
  constructor(
    private readonly store: KernelStore,
    private readonly typeProjector: CheckerTypeProjector,
  ) {}

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
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
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
        origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
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

  targetOperationRuntimeInputType(
    local: string,
    sourceType: CheckerTypeReference | null,
    targetOperation: RuntimeBindingTargetOperation,
  ): CheckerTypeReference {
    return sourceType ?? this.unknownRuntimeInputType(local, targetOperation.sourceAddressHandle);
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

  stringLiteralDomainType(
    local: string,
    values: readonly string[],
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    const shape = this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: values.length > 1 ? CheckerTypeShapeKind.Union : CheckerTypeShapeKind.Primitive,
      display: values.map((value) => quoteStringLiteral(value)).join(' | '),
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
    const member = shape?.members.find((candidate) => candidate.name === propertyName) ?? null;
    return member?.valueType ?? null;
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
    const collectionElementType = collectionElementTypeFor(carrier.checker, carrier.type);
    if (collectionElementType != null) {
      return {
        kind: 'collection',
      };
    }
    const mapKeyType = mapKeyTypeFor(carrier.checker, carrier.type);
    if (mapKeyType != null) {
      const mapValueType = mapValueTypeFor(carrier.checker, carrier.type);
      return {
        kind: 'map',
        elementType: this.projectCheckerType(
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
    if (isBooleanLike(carrier.type)) {
      return {
        kind: 'boolean',
      };
    }
    return {
      kind: 'other',
    };
  }

  readTypeShape(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return reference?.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  }
}

class RuntimeBindingValueChannelDraftSupport {
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
    const binding = this.propertyBindingForNodeTarget(input, context.input, ['model', 'value']);
    if (binding != null) {
      return this.bindingValueExpression(`${local}:element-value`, binding, context);
    }
    const model = this.attributeValue(input, 'model');
    if (model != null) {
      return staticStringValue(model);
    }
    return staticStringValue(this.attributeValue(input, 'value') ?? 'on');
  }

  optionRuntimeValue(
    local: string,
    option: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): BindingValueExpression {
    const binding = this.propertyBindingForNodeTarget(option, context.input, ['model', 'value']);
    if (binding != null) {
      return this.bindingValueExpression(`${local}:element-value`, binding, context);
    }
    const model = this.attributeValue(option, 'model');
    if (model != null) {
      return staticStringValue(model);
    }
    return staticStringValue(this.optionStaticValue(option));
  }

  bindingValueExpression(
    local: string,
    binding: PropertyBinding,
    context: BindingValueChannelDraftContext,
  ): BindingValueExpression {
    const scope = context.instructionScopes.get(binding.instructionProductHandle) ?? null;
    const parse = this.readParse(binding.expressionProductHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    if (scope == null || ast == null) {
      return {
        valueType: null,
        valueDomain: [],
      };
    }
    const literalDomain = stringDomainForExpression(ast);
    if (literalDomain.length > 0) {
      return this.literalDomainBindingValueExpression(local, binding, literalDomain);
    }
    return this.evaluatedBindingValueExpression(binding, scope, ast, context);
  }

  private literalDomainBindingValueExpression(
    local: string,
    binding: PropertyBinding,
    literalDomain: readonly string[],
  ): BindingValueExpression {
    return {
      valueType: this.types.stringLiteralDomainType(`${local}:literal-domain`, literalDomain, binding.sourceAddressHandle),
      valueDomain: literalDomain,
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
      };
    }
    return {
      valueType: evaluation.typeReference,
      valueDomain: this.types.stringLiteralDomainForType(evaluation.typeReference),
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

class DirectBindingValueChannelDrafts {
  constructor(private readonly owner: RuntimeBindingValueChannelDraftSupport) {}

  valueChannelDraftForTargetOperation(
    local: string,
    targetOperation: RuntimeBindingTargetOperation | null,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    if (targetOperation == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: null,
        valueDomain: [],
        isCollection: null,
        openReason: 'Runtime binding did not carry a direct target-operation product for value-channel materialization.',
      };
    }
    const sourceType = readSourceType();
    const runtimeInputType = this.owner.types.targetOperationRuntimeInputType(`${local}:runtime-input`, sourceType, targetOperation);
    if (targetOperation.openReason != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: runtimeInputType,
        valueDomain: [],
        isCollection: null,
        openReason: targetOperation.openReason,
      };
    }

    switch (targetOperation.operationKind) {
      case RuntimeBindingTargetOperationKind.PropertySet:
      case RuntimeBindingTargetOperationKind.AttributeSet:
      case RuntimeBindingTargetOperationKind.ClassListAdd:
      case RuntimeBindingTargetOperationKind.StyleCssTextAppend:
      case RuntimeBindingTargetOperationKind.EventListenerAdd:
        return {
          channelKind: RuntimeBindingValueChannelKind.Open,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: targetOperation.affectedNames,
          isCollection: null,
          openReason: 'Renderer-owned static target operation reached AttributeBinding value-channel materialization.',
        };
      case RuntimeBindingTargetOperationKind.TextContentSet:
        return {
          channelKind: RuntimeBindingValueChannelKind.TextContent,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.TargetOperation
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: runtimeInputType,
          valueDomain: [],
          isCollection: false,
          openReason: null,
        };
      case RuntimeBindingTargetOperationKind.ClassListToggle:
        return this.classToggleValueChannelDraft(local, targetOperation, readSourceType);
      case RuntimeBindingTargetOperationKind.StyleSetProperty:
        return this.stylePropertyValueChannelDraft(local, targetOperation, readSourceType);
      case RuntimeBindingTargetOperationKind.AttributeSetOrRemove:
        return {
          channelKind: RuntimeBindingValueChannelKind.AttributeValue,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.TargetOperation
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: runtimeInputType,
          valueDomain: targetOperation.affectedNames,
          isCollection: null,
          openReason: null,
        };
      case RuntimeBindingTargetOperationKind.Open:
        return {
          channelKind: RuntimeBindingValueChannelKind.Open,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: [],
          isCollection: null,
          openReason: targetOperation.openReason ?? 'AttributeBinding target operation stayed open.',
        };
    }
  }

  valueChannelDraftForSourceOperation(
    sourceOperation: RuntimeBindingSourceOperation | null,
  ): RuntimeBindingValueChannelDraft {
    if (sourceOperation == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: null,
        valueDomain: [],
        isCollection: null,
        openReason: 'Runtime binding did not carry a source-operation product for value-channel materialization.',
      };
    }
    if (sourceOperation.openReason != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: sourceOperation.targetType,
        valueDomain: [],
        isCollection: null,
        openReason: sourceOperation.openReason,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.RefTarget,
      authority: RuntimeBindingValueChannelAuthority.SourceOperation,
      runtimeValueType: sourceOperation.targetType,
      valueDomain: [],
      isCollection: false,
      openReason: null,
    };
  }

  classValueChannelDraft(
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    if (binding instanceof AttributeBinding && binding.attr === 'class') {
      const classTokens = splitWhitespace(binding.target);
      if (classTokens.length === 0) {
        return {
          channelKind: RuntimeBindingValueChannelKind.ClassToggle,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: [],
          isCollection: false,
          openReason: 'Class attribute binding did not expose any class token to toggle.',
        };
      }
      return {
        channelKind: RuntimeBindingValueChannelKind.ClassToggle,
        authority: sourceType == null
          ? RuntimeBindingValueChannelAuthority.BindingExpression
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:class-toggle-input`, targetAccess.sourceAddressHandle),
        valueDomain: classTokens,
        isCollection: classTokens.length > 1,
        openReason: null,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.ClassAttributeTokens,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:class-attribute-input`, targetAccess.sourceAddressHandle),
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  styleValueChannelDraft(
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    if (binding instanceof AttributeBinding && binding.attr === 'style') {
      const styleTarget = binding.target.trim();
      if (styleTarget.length > 0 && styleTarget !== 'style') {
        return {
          channelKind: RuntimeBindingValueChannelKind.StylePropertyValue,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.BindingExpression
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:style-property-input`, targetAccess.sourceAddressHandle),
          valueDomain: [styleTarget],
          isCollection: false,
          openReason: null,
        };
      }
      return {
        channelKind: RuntimeBindingValueChannelKind.StyleAttributeRules,
        authority: sourceType == null
          ? RuntimeBindingValueChannelAuthority.BindingExpression
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:style-attribute-input`, targetAccess.sourceAddressHandle),
        valueDomain: [],
        isCollection: null,
        openReason: null,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.StyleAttributeRules,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? this.owner.types.unknownRuntimeInputType(`${targetAccess.productHandle}:style-attribute-input`, targetAccess.sourceAddressHandle),
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  attributeValueChannelDraft(
    readSourceType: BindingSourceTypeReader,
    targetAccess: RuntimeBindingTargetAccess,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    return {
      channelKind: RuntimeBindingValueChannelKind.AttributeValue,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? this.owner.types.targetAccessRuntimeInputType(`${targetAccess.productHandle}:attribute-input`, targetAccess),
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  private classToggleValueChannelDraft(
    local: string,
    targetOperation: RuntimeBindingTargetOperation,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    const runtimeInputType = this.owner.types.targetOperationRuntimeInputType(`${local}:class-toggle-input`, sourceType, targetOperation);
    if (targetOperation.affectedNames.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.ClassToggle,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: runtimeInputType,
        valueDomain: [],
        isCollection: false,
        openReason: 'Class attribute binding did not expose any class token to toggle.',
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.ClassToggle,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetOperation
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: runtimeInputType,
      valueDomain: targetOperation.affectedNames,
      isCollection: targetOperation.affectedNames.length > 1,
      openReason: null,
    };
  }

  private stylePropertyValueChannelDraft(
    local: string,
    targetOperation: RuntimeBindingTargetOperation,
    readSourceType: BindingSourceTypeReader,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    const runtimeInputType = this.owner.types.targetOperationRuntimeInputType(`${local}:style-property-input`, sourceType, targetOperation);
    return {
      channelKind: RuntimeBindingValueChannelKind.StylePropertyValue,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetOperation
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: runtimeInputType,
      valueDomain: targetOperation.affectedNames,
      isCollection: false,
      openReason: null,
    };
  }
}

class SelectValueObserverChannelDrafts {
  constructor(private readonly owner: RuntimeBindingValueChannelDraftSupport) {}

  valueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelDraftContext,
  ): RuntimeBindingValueChannelDraft {
    const select = this.owner.htmlElementFor(targetAccess.targetNode);
    if (select == null || normalizeHtmlTagName(select.tagName) !== 'SELECT') {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: 'SelectValueObserver value channel did not carry a closed authored <select> node.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectTargetOpen],
      };
    }

    const multiple = this.selectMultipleMode(select, context);
    const options = this.owner.optionElementsFor(select);
    if (multiple.kind === 'open') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: true,
        openReason: multiple.openReason,
        openReasonKinds: multiple.openReasonKinds,
      };
    }
    if (multiple.kind === 'multiple') {
      return this.selectMultipleValueChannelDraft(local, binding, targetAccess, readSourceType, context, options);
    }
    if (multiple.kind === 'dynamic') {
      return this.selectDynamicValueChannelDraft(local, binding, targetAccess, readSourceType, context, options);
    }

    return this.selectSingleValueChannelDraft(local, binding, targetAccess, readSourceType, context, options);
  }

  private selectMultipleValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelDraftContext,
    options: readonly HtmlElement[],
  ): RuntimeBindingValueChannelDraft {
    const optionValues = options.map((option, index) =>
      this.owner.optionRuntimeValue(`${local}:option:${index}`, option, context)
    );
    const openOption = optionValues.find((option) => option.valueType == null && option.valueDomain.length === 0);
    if (openOption != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: true,
        openReason: 'SelectValueObserver multiple option value channel could not close every option value through static value or expression-backed model/value binding.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen],
      };
    }
    const valueDomain = uniqueStrings(optionValues.flatMap((option) => option.valueDomain));
    const sourceShape = this.selectMultipleSourceShape(`${local}:source`, readSourceType());
    const runtimeValueType = this.selectOptionRuntimeValueType(
      `${local}:select-multiple-option-domain`,
      binding,
      targetAccess.propertyType,
      optionValues,
      sourceShape.elementType ?? null,
      valueDomain,
    );
    if (runtimeValueType == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: true,
        openReason: 'SelectValueObserver did not expose any static or TypeChecker-backed option value type for the multi-select value channel.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectOptionDomainOpen],
      };
    }
    if (sourceShape.kind === 'open') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType,
        valueDomain,
        isCollection: true,
        openReason: 'SelectValueObserver multiple mode requires a TypeChecker-visible array source before collection element mutation can close.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectMultipleSourceOpen],
      };
    }
    if (sourceShape.kind !== 'collection') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType,
        valueDomain,
        isCollection: true,
        openReason: 'SelectValueObserver multiple mode mutates an array source; the binding source did not close as an array.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectMultipleSourceOpen],
      };
    }

    return {
      channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
      authority: optionValues.some((option) => option.valueType != null)
        ? RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker
        : RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker,
      runtimeValueType,
      valueDomain,
      isCollection: true,
      openReason: null,
    };
  }

  private selectMultipleMode(
    select: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): SelectMultipleMode {
    const binding = this.owner.propertyBindingForNodeTarget(select, context.input, ['multiple']);
    if (binding != null) {
      const literal = this.bindingBooleanLiteral(binding, context);
      if (literal != null) {
        return {
          kind: literal ? 'multiple' : 'single',
        };
      }
      return {
        kind: 'dynamic',
      };
    }
    return {
      kind: this.owner.hasAttribute(select, 'multiple') ? 'multiple' : 'single',
    };
  }

  private selectDynamicValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelDraftContext,
    options: readonly HtmlElement[],
  ): RuntimeBindingValueChannelDraft {
    const optionValues = options.map((option, index) =>
      this.owner.optionRuntimeValue(`${local}:option:${index}`, option, context)
    );
    const openOption = optionValues.find((option) => option.valueType == null && option.valueDomain.length === 0);
    if (openOption != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: 'SelectValueObserver dynamic option value channel could not close every option value through static value or expression-backed model/value binding.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen],
      };
    }
    const valueDomain = uniqueStrings(optionValues.flatMap((option) => option.valueDomain));
    const optionValueType = this.selectDynamicOptionValueType(
      `${local}:select-dynamic-option-domain`,
      binding,
      optionValues,
      valueDomain,
    );
    const sourceType = readSourceType();
    const runtimeValueType = this.selectDynamicRuntimeValueType(sourceType, optionValueType, valueDomain);
    if (runtimeValueType == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: optionValueType ?? targetAccess.propertyType,
        valueDomain,
        isCollection: null,
        openReason: 'SelectValueObserver dynamic multiple mode needs a source type that can accept both single option values and array-valued selection updates.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelDynamicSelectMultiple],
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
      authority: optionValues.some((option) => option.valueType != null)
        ? RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker
        : valueDomain.length > 0
          ? RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker
          : RuntimeBindingValueChannelAuthority.ObserverSemantics,
      runtimeValueType,
      valueDomain,
      isCollection: null,
      openReason: null,
    };
  }

  private selectDynamicOptionValueType(
    local: string,
    binding: PropertyBinding,
    optionValues: readonly BindingValueExpression[],
    valueDomain: readonly string[],
  ): CheckerTypeReference | null {
    if (valueDomain.length > 0) {
      return this.owner.types.stringLiteralDomainType(local, valueDomain, binding.sourceAddressHandle);
    }
    return this.commonOptionValueType(optionValues);
  }

  private selectDynamicRuntimeValueType(
    sourceType: CheckerTypeReference | null,
    optionValueType: CheckerTypeReference | null,
    valueDomain: readonly string[],
  ): CheckerTypeReference | null {
    if (sourceType == null || !this.sourceTypeSupportsDynamicSelect(sourceType, optionValueType, valueDomain)) {
      return null;
    }
    return sourceType;
  }

  private sourceTypeSupportsDynamicSelect(
    sourceType: CheckerTypeReference,
    optionValueType: CheckerTypeReference | null,
    valueDomain: readonly string[],
  ): boolean {
    const sourceShape = this.owner.types.readTypeShape(sourceType);
    if (isBroadTypeShape(sourceShape, sourceType)) {
      return true;
    }
    const sourceCarrier = sourceShape?.carrier ?? null;
    const optionCarrier = this.owner.types.readTypeShape(optionValueType)?.carrier ?? null;
    if (sourceCarrier == null || (optionCarrier != null && sourceCarrier.checker !== optionCarrier.checker)) {
      return false;
    }
    const checker = sourceCarrier.checker;
    const optionTypes = optionCarrier == null
      ? stringLiteralTypesForDomain(checker, valueDomain)
      : [optionCarrier.type];
    if (optionTypes.length === 0) {
      return false;
    }
    const acceptsSingleValue = optionTypes.every((optionType) =>
      checker.isTypeAssignableTo(optionType, sourceCarrier.type)
    );
    const acceptsArrayValues = optionTypes.every((optionType) =>
      sourceTypeHasAssignableArrayPart(checker, sourceCarrier.type, optionType)
    );
    return acceptsSingleValue && acceptsArrayValues;
  }

  private bindingBooleanLiteral(
    binding: PropertyBinding,
    context: BindingValueChannelDraftContext,
  ): boolean | null {
    const parse = this.owner.readParse(binding.expressionProductHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    const literal = ast == null ? null : booleanLiteralForExpression(ast);
    if (literal != null) {
      return literal;
    }
    const scope = context.instructionScopes.get(binding.instructionProductHandle) ?? null;
    const sourceType = this.owner.sourceTypeForBinding(binding, scope, context.evaluator);
    const literalValues = this.owner.types.booleanLiteralDomainForType(sourceType);
    return literalValues.length === 1 ? literalValues[0]! : null;
  }

  private selectMultipleSourceShape(
    local: string,
    sourceType: CheckerTypeReference | null,
  ): CheckedSourceShape {
    const shape = this.owner.types.readTypeShape(sourceType);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return {
        kind: 'open',
      };
    }
    const elementType = arrayElementTypeFor(carrier.checker, carrier.type);
    if (elementType == null) {
      return {
        kind: 'other',
      };
    }
    return {
      kind: 'collection',
      elementType: this.owner.types.projectCheckerType(
        `${local}:element`,
        carrier.checker,
        elementType,
        sourceType?.sourceAddressHandle ?? null,
      ),
    };
  }

  private selectSingleValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelDraftContext,
    options: readonly HtmlElement[],
  ): RuntimeBindingValueChannelDraft {
    const optionValues = options.map((option, index) =>
      this.owner.optionRuntimeValue(`${local}:option:${index}`, option, context)
    );
    const openOption = optionValues.find((option) => option.valueType == null && option.valueDomain.length === 0);
    if (openOption != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectSingleOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: false,
        openReason: 'SelectValueObserver option value channel could not close every option value through static value or expression-backed model/value binding.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen],
      };
    }
    const valueDomain = uniqueStrings(optionValues.flatMap((option) => option.valueDomain));
    const runtimeValueType = this.selectOptionRuntimeValueType(
      `${local}:select-option-domain`,
      binding,
      targetAccess.propertyType,
      optionValues,
      readSourceType(),
      valueDomain,
    );
    if (runtimeValueType == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectSingleOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: false,
        openReason: 'SelectValueObserver did not expose any static or TypeChecker-backed <option> value type for the single-select value channel.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectOptionDomainOpen],
      };
    }

    return {
      channelKind: RuntimeBindingValueChannelKind.SelectSingleOptionValue,
      authority: optionValues.some((option) => option.valueType != null)
        ? RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker
        : valueDomain.length > 0
          ? RuntimeBindingValueChannelAuthority.StaticTemplate
          : RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker,
      runtimeValueType,
      valueDomain,
      isCollection: false,
      openReason: null,
    };
  }

  private selectOptionRuntimeValueType(
    local: string,
    binding: PropertyBinding,
    fallbackType: CheckerTypeReference | null,
    optionValues: readonly BindingValueExpression[],
    sourceType: CheckerTypeReference | null,
    valueDomain: readonly string[],
  ): CheckerTypeReference | null {
    if (valueDomain.length > 0) {
      return this.owner.types.stringLiteralDomainType(local, valueDomain, binding.sourceAddressHandle);
    }
    return this.commonOptionValueType(optionValues) ?? sourceType ?? fallbackType;
  }

  private commonOptionValueType(
    optionValues: readonly BindingValueExpression[],
  ): CheckerTypeReference | null {
    const typed = optionValues
      .map((option) => option.valueType)
      .filter((valueType): valueType is CheckerTypeReference => valueType != null);
    if (typed.length === 0) {
      return null;
    }
    const first = typed[0]!;
    return typed.every((valueType) => sameCheckerTypeReference(first, valueType))
      ? first
      : null;
  }
}

class CheckedObserverChannelDrafts {
  constructor(private readonly owner: RuntimeBindingValueChannelDraftSupport) {}

  valueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelDraftContext,
  ): RuntimeBindingValueChannelDraft {
    const input = this.owner.htmlElementFor(targetAccess.targetNode);
    if (input == null || normalizeHtmlTagName(input.tagName) !== 'INPUT') {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: 'CheckedObserver value channel did not carry a closed authored <input> node.',
      };
    }

    const type = (this.owner.attributeValue(input, 'type') ?? 'text').toLowerCase();
    switch (type) {
      case 'radio':
        return this.checkedRadioValueChannelDraft(local, binding, targetAccess, input, context);
      case 'checkbox':
        return this.checkedCheckboxValueChannelDraft(local, binding, targetAccess, readSourceType, input, context);
      default:
        return {
          channelKind: RuntimeBindingValueChannelKind.CheckedModel,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: targetAccess.propertyType,
          valueDomain: [],
          isCollection: null,
          openReason: `CheckedObserver '${type}' mode can write booleans, radio/model values, arrays, sets, or maps depending on source value shape; this branch is not closed yet.`,
        };
    }
  }

  private checkedRadioValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    input: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): RuntimeBindingValueChannelDraft {
    const elementValue = this.owner.inputRuntimeValue(local, input, context);
    if (elementValue.valueType == null && elementValue.valueDomain.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedModel,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: false,
        openReason: 'CheckedObserver radio value channel could not close the input model/value through static value or expression-backed binding.',
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.CheckedRadioValue,
      authority: elementValue.valueType == null
        ? RuntimeBindingValueChannelAuthority.StaticTemplate
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: elementValue.valueType
        ?? this.owner.types.stringLiteralDomainType(
          `${binding.productHandle}:checked-radio-domain`,
          elementValue.valueDomain,
          binding.sourceAddressHandle,
        ),
      valueDomain: elementValue.valueDomain,
      isCollection: false,
      openReason: null,
    };
  }

  private checkedCheckboxValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    input: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): RuntimeBindingValueChannelDraft {
    const sourceType = readSourceType();
    const sourceShape = this.owner.types.checkedSourceShape(sourceType);
    if (sourceShape.kind === 'boolean' || sourceShape.kind === 'other') {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedBoolean,
        authority: RuntimeBindingValueChannelAuthority.ObserverSemantics,
        runtimeValueType: this.owner.types.booleanValueType(`${local}:checked-boolean`, binding, sourceType),
        valueDomain: [],
        isCollection: false,
        openReason: null,
      };
    }
    if (sourceShape.kind === 'open') {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedModel,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: 'CheckedObserver checkbox mode depends on the bound source value shape; static evaluation did not close boolean, collection, or map mode.',
      };
    }
    return this.checkedCheckboxModelValueChannelDraft(local, binding, targetAccess, sourceShape, input, context);
  }

  private checkedCheckboxModelValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    sourceShape: CheckedSourceShape,
    input: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): RuntimeBindingValueChannelDraft {
    const elementValue = this.owner.inputRuntimeValue(local, input, context);
    const valueDomain = elementValue.valueDomain;
    if (elementValue.valueType == null && valueDomain.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedModel,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: sourceShape.kind === 'collection' || sourceShape.kind === 'map' ? true : null,
        openReason: 'CheckedObserver checkbox value channel could not close the input model/value through static value or expression-backed binding.',
      };
    }
    if (sourceShape.kind === 'collection') {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedCollectionMembership,
        authority: elementValue.valueType == null
          ? RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: elementValue.valueType
          ?? this.owner.types.stringLiteralDomainType(
            `${local}:checked-collection-domain`,
            valueDomain,
            binding.sourceAddressHandle,
          ),
        valueDomain,
        isCollection: true,
        openReason: null,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean,
      authority: elementValue.valueType == null
        ? RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: elementValue.valueType
        ?? this.owner.types.stringLiteralDomainType(
          `${local}:checked-map-key-domain`,
          valueDomain,
          binding.sourceAddressHandle,
        ),
      valueDomain,
      isCollection: true,
      openReason: null,
    };
  }
}

function stringDomainForExpression(expression: ExpressionAstNode): readonly string[] {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return typeof expression.value === 'string' ? [expression.value] : [];
    case 'ArrayLiteral':
      return uniqueStrings(expression.elements.flatMap((element) => stringDomainForExpression(element)));
    case 'Paren':
      return stringDomainForExpression(expression.expression);
    default:
      return [];
  }
}

function booleanLiteralForExpression(expression: ExpressionAstNode): boolean | null {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return typeof expression.value === 'boolean' ? expression.value : null;
    case 'Paren':
      return booleanLiteralForExpression(expression.expression);
    default:
      return null;
  }
}

function staticStringValue(value: string): BindingValueExpression {
  return {
    valueType: null,
    valueDomain: [value],
  };
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function isBroadTypeShape(
  shape: CheckerTypeShape | null | undefined,
  reference: CheckerTypeReference,
): boolean {
  return shape?.shapeKind === CheckerTypeShapeKind.Any
    || shape?.shapeKind === CheckerTypeShapeKind.Unknown
    || reference.display === 'any'
    || reference.display === 'unknown';
}

function sourceTypeHasAssignableArrayPart(
  checker: ts.TypeChecker,
  sourceType: ts.Type,
  optionValueType: ts.Type,
): boolean {
  return checkerTypeParts(sourceType).some((part) => {
    const elementType = arrayElementTypeFor(checker, part);
    return elementType != null && checker.isTypeAssignableTo(optionValueType, elementType);
  });
}

function stringLiteralTypesForDomain(
  checker: ts.TypeChecker,
  values: readonly string[],
): readonly ts.Type[] {
  return uniqueStrings(values).map((value) => checker.getStringLiteralType(value));
}

function checkerTypeParts(type: ts.Type): readonly ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

function quoteStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
