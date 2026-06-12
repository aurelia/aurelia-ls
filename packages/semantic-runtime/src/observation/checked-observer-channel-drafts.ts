import type { HtmlElement } from '../template/html-ir.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import { normalizeHtmlTagName } from '../template/html-ir.js';
import {
  PropertyBinding,
  type RuntimeBindingTargetAccess,
} from '../template/runtime-binding.js';
import type {
  BindingSourceTypeReader,
  BindingValueExpression,
  BindingValueChannelDraftContext,
  CheckedSourceShape,
  RuntimeBindingValueChannelDraft,
} from './binding-value-channel-draft-types.js';
import {
  RuntimeBindingValueChannelDraftSupport,
  withCustomMatcherCoupling,
} from './binding-value-channel-draft-support.js';
import {
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelCouplingKind,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';

export class CheckedObserverChannelDrafts {
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
        observerCouplings: [],
        openReason: 'CheckedObserver value channel did not carry a closed authored <input> node.',
      };
    }

    const usesCustomMatcher = this.owner.hasCustomMatcherBinding(input, context);
    const type = (this.owner.attributeValue(input, 'type') ?? 'text').toLowerCase();
    switch (type) {
      case 'radio':
        return this.checkedRadioValueChannelDraft(local, binding, targetAccess, input, context, usesCustomMatcher);
      case 'checkbox':
        return this.checkedCheckboxValueChannelDraft(local, binding, targetAccess, readSourceType, input, context, usesCustomMatcher);
      default:
        return {
          channelKind: RuntimeBindingValueChannelKind.CheckedModel,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: targetAccess.propertyType,
          valueDomain: [],
          isCollection: null,
          usesCustomMatcher,
          observerCouplings: checkedElementValueObserverCouplings(usesCustomMatcher),
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
    usesCustomMatcher: boolean,
  ): RuntimeBindingValueChannelDraft {
    const elementValue = this.owner.inputRuntimeValue(local, input, context);
    if (elementValue.valueType == null && elementValue.valueDomain.length === 0 && elementValue.primitiveValueDomain.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedModel,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: false,
        usesCustomMatcher,
        observerCouplings: checkedRadioObserverCouplings(usesCustomMatcher),
        openReason: 'CheckedObserver radio value channel could not close the input model/value through static value or expression-backed binding.',
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.CheckedRadioValue,
      authority: elementValue.valueType == null
        ? RuntimeBindingValueChannelAuthority.StaticTemplate
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: this.elementValueType(`${binding.productHandle}:checked-radio-domain`, binding, elementValue),
        valueDomain: elementValue.valueDomain,
        primitiveValueDomain: elementValue.primitiveValueDomain,
        isCollection: false,
        usesCustomMatcher,
        observerCouplings: checkedRadioObserverCouplings(usesCustomMatcher),
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
    usesCustomMatcher: boolean,
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
        usesCustomMatcher: false,
        observerCouplings: checkedBooleanObserverCouplings(),
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
        usesCustomMatcher,
        observerCouplings: checkedElementValueObserverCouplings(usesCustomMatcher),
        openReason: 'CheckedObserver checkbox mode depends on the bound source value shape; static evaluation did not close boolean, collection, or map mode.',
      };
    }
    if (sourceShape.kind === 'dynamic') {
      return this.checkedCheckboxDynamicValueChannelDraft(local, binding, targetAccess, sourceShape, input, context, usesCustomMatcher);
    }
    return this.checkedCheckboxModelValueChannelDraft(local, binding, targetAccess, sourceShape, input, context, usesCustomMatcher);
  }

  private checkedCheckboxDynamicValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    sourceShape: CheckedSourceShape,
    input: HtmlElement,
    context: BindingValueChannelDraftContext,
    usesCustomMatcher: boolean,
  ): RuntimeBindingValueChannelDraft {
    const elementValue = this.owner.inputRuntimeValue(local, input, context);
    if (elementValue.valueType == null && elementValue.valueDomain.length === 0 && elementValue.primitiveValueDomain.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedDynamicModelValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        usesCustomMatcher,
        observerCouplings: checkedDynamicObserverCouplings(sourceShape.dynamicMode, usesCustomMatcher),
        openReason: 'CheckedObserver dynamic checkbox mode could not close the input model/value used by the collection or map branch.',
      };
    }
    const elementValueType = this.elementValueType(`${local}:checked-dynamic-element-domain`, binding, elementValue);
    return {
      channelKind: RuntimeBindingValueChannelKind.CheckedDynamicModelValue,
      authority: elementValue.valueType == null
        ? RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: elementValueType,
      valueDomain: elementValue.valueDomain,
      primitiveValueDomain: elementValue.primitiveValueDomain,
      isCollection: null,
      usesCustomMatcher,
      observerCouplings: checkedDynamicObserverCouplings(sourceShape.dynamicMode, usesCustomMatcher),
      openReason: null,
    };
  }

  private checkedCheckboxModelValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    sourceShape: CheckedSourceShape,
    input: HtmlElement,
    context: BindingValueChannelDraftContext,
    usesCustomMatcher: boolean,
  ): RuntimeBindingValueChannelDraft {
    const elementValue = this.owner.inputRuntimeValue(local, input, context);
    const valueDomain = elementValue.valueDomain;
    if (elementValue.valueType == null && valueDomain.length === 0 && elementValue.primitiveValueDomain.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedModel,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: sourceShape.kind === 'collection' || sourceShape.kind === 'map' ? true : null,
        usesCustomMatcher,
        observerCouplings: sourceShape.kind === 'map'
          ? checkedMapObserverCouplings(usesCustomMatcher)
          : checkedCollectionObserverCouplings(usesCustomMatcher),
        openReason: 'CheckedObserver checkbox value channel could not close the input model/value through static value or expression-backed binding.',
      };
    }
    if (sourceShape.kind === 'collection') {
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedCollectionMembership,
        authority: elementValue.valueType == null
          ? RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: this.elementValueType(`${local}:checked-collection-domain`, binding, elementValue),
        valueDomain,
        primitiveValueDomain: elementValue.primitiveValueDomain,
        isCollection: true,
        usesCustomMatcher,
        observerCouplings: checkedCollectionObserverCouplings(usesCustomMatcher),
        openReason: null,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean,
      authority: elementValue.valueType == null
        ? RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: this.elementValueType(`${local}:checked-map-key-domain`, binding, elementValue),
      valueDomain,
      primitiveValueDomain: elementValue.primitiveValueDomain,
      isCollection: true,
      usesCustomMatcher,
      observerCouplings: checkedMapObserverCouplings(usesCustomMatcher),
      openReason: null,
    };
  }

  private elementValueType(
    local: string,
    binding: PropertyBinding,
    elementValue: BindingValueExpression,
  ): CheckerTypeReference {
    return elementValue.valueType
      ?? this.owner.types.primitiveLiteralDomainType(local, elementValue.primitiveValueDomain, binding.sourceAddressHandle)
      ?? this.owner.types.stringLiteralDomainType(local, elementValue.valueDomain, binding.sourceAddressHandle);
  }
}

function checkedElementValueObserverCouplings(
  usesCustomMatcher: boolean,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  return withCustomMatcherCoupling([
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueDomain,
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueObserver,
  ], usesCustomMatcher);
}

function checkedRadioObserverCouplings(
  usesCustomMatcher: boolean,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  return withCustomMatcherCoupling([
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueDomain,
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueObserver,
    RuntimeBindingValueChannelCouplingKind.CheckedRadioValueSync,
  ], usesCustomMatcher);
}

function checkedBooleanObserverCouplings(): readonly RuntimeBindingValueChannelCouplingKind[] {
  return [
    RuntimeBindingValueChannelCouplingKind.CheckedBooleanSync,
  ];
}

function checkedDynamicObserverCouplings(
  dynamicMode: CheckedSourceShape['dynamicMode'],
  usesCustomMatcher: boolean,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  const collectionCoupling = dynamicMode === 'map-or-boolean'
    ? RuntimeBindingValueChannelCouplingKind.CheckedMapKeyedBooleanMutation
    : RuntimeBindingValueChannelCouplingKind.CheckedCollectionMembershipMutation;
  return withCustomMatcherCoupling([
    RuntimeBindingValueChannelCouplingKind.CheckedBooleanSync,
    RuntimeBindingValueChannelCouplingKind.CheckedDynamicSourceShape,
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueDomain,
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueObserver,
    RuntimeBindingValueChannelCouplingKind.CheckedCollectionObserver,
    collectionCoupling,
  ], usesCustomMatcher);
}

function checkedCollectionObserverCouplings(
  usesCustomMatcher: boolean,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  return withCustomMatcherCoupling([
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueDomain,
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueObserver,
    RuntimeBindingValueChannelCouplingKind.CheckedCollectionObserver,
    RuntimeBindingValueChannelCouplingKind.CheckedCollectionMembershipMutation,
  ], usesCustomMatcher);
}

function checkedMapObserverCouplings(
  usesCustomMatcher: boolean,
): readonly RuntimeBindingValueChannelCouplingKind[] {
  return withCustomMatcherCoupling([
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueDomain,
    RuntimeBindingValueChannelCouplingKind.CheckedElementValueObserver,
    RuntimeBindingValueChannelCouplingKind.CheckedCollectionObserver,
    RuntimeBindingValueChannelCouplingKind.CheckedMapKeyedBooleanMutation,
  ], usesCustomMatcher);
}
