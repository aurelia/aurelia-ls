import ts from 'typescript';
import { uniqueStrings } from '../kernel/collections.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { HtmlElement, normalizeHtmlTagName } from '../template/html-ir.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import {
  PropertyBinding,
  type RuntimeBindingTargetAccess,
} from '../template/runtime-binding.js';
import {
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  arrayElementTypeFor,
  isRuntimeArrayInstanceType,
} from './checker-type-helpers.js';
import type {
  BindingSourceTypeReader,
  BindingValueChannelDraftContext,
  BindingValueExpression,
  RuntimeBindingValueChannelDraft,
  SelectMultipleMode,
} from './binding-value-channel-draft-types.js';
import {
  RuntimeBindingValueChannelDraftSupport,
  isBroadTypeShape,
  sourceTypeHasAssignableArrayPart,
  stringLiteralTypesForDomain,
  withCustomMatcherCoupling,
} from './binding-value-channel-draft-support.js';
import {
  runtimeBindingBooleanLiteralForExpression,
  uniqueRuntimeBindingPrimitiveValueDomain,
} from './runtime-binding-primitive-value.js';
import {
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelCouplingKind,
  RuntimeBindingValueChannelKind,
  type RuntimeBindingPrimitiveValue,
} from './runtime-binding-observation.js';

type SelectMultipleSourceShape = {
  readonly kind: 'collection' | 'dynamic' | 'other' | 'open';
  readonly elementType?: CheckerTypeReference | null;
  readonly sourceType?: CheckerTypeReference | null;
};

export class SelectValueObserverChannelDrafts {
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
        observerCouplings: [],
        openReason: 'SelectValueObserver value channel did not carry a closed authored <select> node.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectTargetOpen],
      };
    }

    const usesCustomMatcher = this.owner.hasCustomMatcherBinding(select, context);
    const multiple = this.selectMultipleMode(select, context);
    const options = this.owner.optionElementsFor(select);
    if (multiple.kind === 'open') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: true,
        usesCustomMatcher,
        observerCouplings: selectMultipleObserverCouplings(usesCustomMatcher),
        openReason: multiple.openReason,
        openReasonKinds: multiple.openReasonKinds,
      };
    }
    if (multiple.kind === 'multiple') {
      return this.selectMultipleValueChannelDraft(local, binding, targetAccess, readSourceType, context, options, usesCustomMatcher);
    }
    if (multiple.kind === 'dynamic') {
      return this.selectDynamicValueChannelDraft(local, binding, targetAccess, readSourceType, context, options, usesCustomMatcher);
    }

    return this.selectSingleValueChannelDraft(local, binding, targetAccess, readSourceType, context, options, usesCustomMatcher);
  }

  private selectMultipleValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelDraftContext,
    options: readonly HtmlElement[],
    usesCustomMatcher: boolean,
  ): RuntimeBindingValueChannelDraft {
    const optionValues = options.map((option, index) =>
      this.owner.optionRuntimeValue(`${local}:option:${index}`, option, context)
    );
    const openOption = optionValues.find((option) =>
      option.valueType == null && option.valueDomain.length === 0 && option.primitiveValueDomain.length === 0
    );
    if (openOption != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: true,
        usesCustomMatcher,
        observerCouplings: selectMultipleObserverCouplings(usesCustomMatcher),
        openReason: 'SelectValueObserver multiple option value channel could not close every option value through static value or expression-backed model/value binding.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen],
      };
    }
    const valueDomain = uniqueStrings(optionValues.flatMap((option) => option.valueDomain));
    const primitiveValueDomain = uniquePrimitiveValueDomain(optionValues);
    const sourceShape = this.selectMultipleSourceShape(`${local}:source`, readSourceType());
    const runtimeValueType = this.selectOptionRuntimeValueType(
      `${local}:select-multiple-option-domain`,
      binding,
      targetAccess.propertyType,
      optionValues,
      sourceShape.elementType ?? null,
      valueDomain,
      primitiveValueDomain,
    );
    if (runtimeValueType == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        primitiveValueDomain,
        isCollection: true,
        usesCustomMatcher,
        observerCouplings: selectMultipleObserverCouplings(usesCustomMatcher),
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
        primitiveValueDomain,
        isCollection: true,
        usesCustomMatcher,
        observerCouplings: selectMultipleObserverCouplings(usesCustomMatcher),
        openReason: 'SelectValueObserver multiple mode requires a TypeChecker-visible array source before collection element mutation can close.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectMultipleSourceOpen],
      };
    }
    if (sourceShape.kind === 'dynamic') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType,
        valueDomain,
        primitiveValueDomain,
        isCollection: true,
        usesCustomMatcher,
        observerCouplings: selectMultipleObserverCouplings(usesCustomMatcher, true),
        openReason: 'SelectValueObserver multiple mode only mutates the source when the current runtime value is an Array; the binding source type also permits non-array values.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectMultipleSourceOpen],
      };
    }
    if (sourceShape.kind !== 'collection') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType,
        valueDomain,
        primitiveValueDomain,
        isCollection: true,
        usesCustomMatcher,
        observerCouplings: selectMultipleObserverCouplings(usesCustomMatcher),
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
      primitiveValueDomain,
      isCollection: true,
      usesCustomMatcher,
      observerCouplings: selectMultipleObserverCouplings(usesCustomMatcher),
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
    usesCustomMatcher: boolean,
  ): RuntimeBindingValueChannelDraft {
    const optionValues = options.map((option, index) =>
      this.owner.optionRuntimeValue(`${local}:option:${index}`, option, context)
    );
    const openOption = optionValues.find((option) =>
      option.valueType == null && option.valueDomain.length === 0 && option.primitiveValueDomain.length === 0
    );
    if (openOption != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        usesCustomMatcher,
        observerCouplings: selectDynamicObserverCouplings(usesCustomMatcher),
        openReason: 'SelectValueObserver dynamic option value channel could not close every option value through static value or expression-backed model/value binding.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen],
      };
    }
    const valueDomain = uniqueStrings(optionValues.flatMap((option) => option.valueDomain));
    const primitiveValueDomain = uniquePrimitiveValueDomain(optionValues);
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
        primitiveValueDomain,
        isCollection: null,
        usesCustomMatcher,
        observerCouplings: selectDynamicObserverCouplings(usesCustomMatcher),
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
      primitiveValueDomain,
      isCollection: null,
      usesCustomMatcher,
      observerCouplings: selectDynamicObserverCouplings(usesCustomMatcher),
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
    return this.optionValueUnionType(local, binding, optionValues);
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
    const literal = ast == null ? null : runtimeBindingBooleanLiteralForExpression(ast);
    if (literal != null) {
      return literal;
    }
    const scope = context.instructionScopes.scopeForBinding(context.input.runtimeBindings, binding);
    const sourceType = this.owner.sourceTypeForBinding(binding, scope, context.evaluator);
    const literalValues = this.owner.types.booleanLiteralDomainForType(sourceType);
    return literalValues.length === 1 ? literalValues[0]! : null;
  }

  private selectMultipleSourceShape(
    local: string,
    sourceType: CheckerTypeReference | null,
  ): SelectMultipleSourceShape {
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
      kind: isRuntimeArrayInstanceType(carrier.checker, carrier.type)
        ? 'collection'
        : 'dynamic',
      sourceType,
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
    usesCustomMatcher: boolean,
  ): RuntimeBindingValueChannelDraft {
    const optionValues = options.map((option, index) =>
      this.owner.optionRuntimeValue(`${local}:option:${index}`, option, context)
    );
    const openOption = optionValues.find((option) =>
      option.valueType == null && option.valueDomain.length === 0 && option.primitiveValueDomain.length === 0
    );
    if (openOption != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectSingleOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: false,
        usesCustomMatcher,
        observerCouplings: selectSingleObserverCouplings(usesCustomMatcher),
        openReason: 'SelectValueObserver option value channel could not close every option value through static value or expression-backed model/value binding.',
        openReasonKinds: [OpenSeamReasonKind.BindingValueChannelSelectOptionValueOpen],
      };
    }
    const valueDomain = uniqueStrings(optionValues.flatMap((option) => option.valueDomain));
    const primitiveValueDomain = uniquePrimitiveValueDomain(optionValues);
    const runtimeValueType = this.selectOptionRuntimeValueType(
      `${local}:select-option-domain`,
      binding,
      targetAccess.propertyType,
      optionValues,
      readSourceType(),
      valueDomain,
      primitiveValueDomain,
    );
    if (runtimeValueType == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectSingleOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: false,
        usesCustomMatcher,
        observerCouplings: selectSingleObserverCouplings(usesCustomMatcher),
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
      primitiveValueDomain,
      isCollection: false,
      usesCustomMatcher,
      observerCouplings: selectSingleObserverCouplings(usesCustomMatcher),
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
    primitiveValueDomain: readonly RuntimeBindingPrimitiveValue[],
  ): CheckerTypeReference | null {
    if (valueDomain.length > 0) {
      return this.owner.types.primitiveLiteralDomainType(local, primitiveValueDomain, binding.sourceAddressHandle)
        ?? this.owner.types.stringLiteralDomainType(local, valueDomain, binding.sourceAddressHandle);
    }
    return this.optionValueUnionType(local, binding, optionValues)
      ?? sourceType
      ?? fallbackType;
  }

  private optionValueUnionType(
    local: string,
    binding: PropertyBinding,
    optionValues: readonly BindingValueExpression[],
  ): CheckerTypeReference | null {
    const typed = this.typedOptionValues(optionValues);
    return typed.length === 0
      ? null
      : this.owner.types.unionValueType(`${local}:typed-options`, typed, binding.sourceAddressHandle);
  }

  private typedOptionValues(
    optionValues: readonly BindingValueExpression[],
  ): readonly CheckerTypeReference[] {
    return optionValues
      .map((option) => option.valueType)
      .filter((valueType): valueType is CheckerTypeReference => valueType != null);
  }
}

function uniquePrimitiveValueDomain(
  optionValues: readonly BindingValueExpression[],
): readonly RuntimeBindingPrimitiveValue[] {
  return uniqueRuntimeBindingPrimitiveValueDomain(optionValues.flatMap((option) => option.primitiveValueDomain));
}

function selectSingleObserverCouplings(
  usesCustomMatcher: boolean,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  return withCustomMatcherCoupling([
    RuntimeBindingValueChannelCouplingKind.SelectOptionValueDomain,
    RuntimeBindingValueChannelCouplingKind.SelectOptionListMutationObserver,
  ], usesCustomMatcher);
}

function selectMultipleObserverCouplings(
  usesCustomMatcher: boolean,
  dynamicArraySource: boolean = false,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  const couplings = [
    RuntimeBindingValueChannelCouplingKind.SelectOptionValueDomain,
    RuntimeBindingValueChannelCouplingKind.SelectOptionListMutationObserver,
    RuntimeBindingValueChannelCouplingKind.SelectArrayObserver,
    RuntimeBindingValueChannelCouplingKind.SelectArrayMutation,
  ];
  return withCustomMatcherCoupling(
    dynamicArraySource
      ? [...couplings, RuntimeBindingValueChannelCouplingKind.SelectDynamicArraySourceShape]
      : couplings,
    usesCustomMatcher,
  );
}

function selectDynamicObserverCouplings(
  usesCustomMatcher: boolean,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  return withCustomMatcherCoupling([
    RuntimeBindingValueChannelCouplingKind.SelectOptionValueDomain,
    RuntimeBindingValueChannelCouplingKind.SelectOptionListMutationObserver,
    RuntimeBindingValueChannelCouplingKind.SelectDynamicMultipleMode,
  ], usesCustomMatcher);
}
