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
  SpreadValueBinding,
  type RuntimeBinding,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
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
import {
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeShapeKind,
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
  RuntimeBindingPrimitiveValueKind,
  type RuntimeBindingPrimitiveValue,
} from './runtime-binding-observation.js';

export class RuntimeBindingValueChannelTypeSupport {
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
    return readCheckerTypeShape(this.store, reference);
  }
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
        primitiveValueDomain: [],
      };
    }
    const primitiveDomain = primitiveValueDomainForExpression(ast);
    const stringDomain = stringDomainForPrimitiveValues(primitiveDomain);
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

  hasCustomMatcherBinding(
    node: HtmlElement,
    context: BindingValueChannelDraftContext,
  ): boolean {
    return this.propertyBindingForNodeTarget(node, context.input, ['matcher']) != null;
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

function primitiveValueDomainForExpression(expression: ExpressionAstNode): readonly RuntimeBindingPrimitiveValue[] {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return [primitiveValueForExpressionValue(expression.value)];
    case 'Paren':
      return primitiveValueDomainForExpression(expression.expression);
    default:
      return [];
  }
}

function primitiveValueForExpressionValue(
  value: null | undefined | number | boolean | string,
): RuntimeBindingPrimitiveValue {
  switch (typeof value) {
    case 'string':
      return { kind: RuntimeBindingPrimitiveValueKind.String, value };
    case 'number':
      return { kind: RuntimeBindingPrimitiveValueKind.Number, value };
    case 'boolean':
      return { kind: RuntimeBindingPrimitiveValueKind.Boolean, value };
    case 'undefined':
      return { kind: RuntimeBindingPrimitiveValueKind.Undefined };
    default:
      return { kind: RuntimeBindingPrimitiveValueKind.Null };
  }
}

function stringDomainForPrimitiveValues(values: readonly RuntimeBindingPrimitiveValue[]): readonly string[] {
  return values.flatMap((value) =>
    value.kind === RuntimeBindingPrimitiveValueKind.String ? [value.value] : []
  );
}

export function booleanLiteralForExpression(expression: ExpressionAstNode): boolean | null {
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
    primitiveValueDomain: [{ kind: RuntimeBindingPrimitiveValueKind.String, value }],
  };
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

function quoteStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
