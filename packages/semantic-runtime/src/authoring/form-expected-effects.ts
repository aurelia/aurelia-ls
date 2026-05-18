import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  type ExpectedSemanticEffectScope,
} from './expected-effect.js';

function nativeValueTargetFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('targetProperty', 'value'),
  ];
}

function checkedTargetFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('targetProperty', 'checked'),
  ];
}

function customMatcherValueChannelFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('usesCustomMatcher', true),
  ];
}

function primitiveValueChannelFilters(
  primitiveValueDisplay: string,
): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('primitiveValueDomainDisplays', primitiveValueDisplay),
  ];
}

function capturedFieldShellInputTypeFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('targetProperty', 'type'),
    new ExpectedSemanticEffectFilter('staticValue', 'email'),
  ];
}

function capturedFieldShellValueDataFlowFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('valueSiteKind', 'captured-value'),
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('targetProperty', 'value'),
    new ExpectedSemanticEffectFilter('direction', 'two-way'),
    new ExpectedSemanticEffectFilter('valueChannelKind', 'raw-property'),
    new ExpectedSemanticEffectFilter('sourceAssignmentKind', 'runtime-assignable'),
  ];
}

function validationErrorsTargetFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'controller-view-model'),
    new ExpectedSemanticEffectFilter('targetProperty', 'errors'),
  ];
}

function validationErrorsTargetAccessFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...validationErrorsTargetFilters(),
    new ExpectedSemanticEffectFilter('lookup', 'observer'),
    new ExpectedSemanticEffectFilter('strategy', 'setter-observer'),
    new ExpectedSemanticEffectFilter('isObservable', true),
  ];
}

function validationErrorsValueChannelFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...validationErrorsTargetFilters(),
    new ExpectedSemanticEffectFilter('channelKind', 'raw-property'),
  ];
}

function validationErrorsDataFlowFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...validationErrorsTargetFilters(),
    new ExpectedSemanticEffectFilter('direction', 'target-to-source'),
    new ExpectedSemanticEffectFilter('valueChannelKind', 'raw-property'),
    new ExpectedSemanticEffectFilter('sourceAssignmentKind', 'runtime-assignable'),
  ];
}

function classTokenTargetFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('targetProperty', 'class'),
  ];
}

function classTokenTargetAccessFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...classTokenTargetFilters(),
    new ExpectedSemanticEffectFilter('strategy', 'class-attribute-accessor'),
  ];
}

function classTokenValueChannelFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...classTokenTargetFilters(),
    new ExpectedSemanticEffectFilter('channelKind', 'class-attribute-tokens'),
  ];
}

function classTokenInterpolationDataFlowFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...classTokenTargetFilters(),
    new ExpectedSemanticEffectFilter('valueChannelKind', 'class-attribute-tokens'),
    new ExpectedSemanticEffectFilter('valueSiteKind', 'plain-attribute-interpolation'),
  ];
}

function classToggleTargetAccessFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...classTokenTargetFilters(),
    new ExpectedSemanticEffectFilter('strategy', 'class-attribute-accessor'),
  ];
}

function classToggleValueChannelFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('channelKind', 'class-toggle'),
  ];
}

function classToggleDataFlowFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('valueChannelKind', 'class-toggle'),
  ];
}

function styleRuleTargetFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('targetProperty', 'style'),
  ];
}

function styleRuleTargetAccessFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...styleRuleTargetFilters(),
    new ExpectedSemanticEffectFilter('strategy', 'style-attribute-accessor'),
  ];
}

function styleRuleValueChannelFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...styleRuleTargetFilters(),
    new ExpectedSemanticEffectFilter('channelKind', 'style-attribute-rules'),
  ];
}

function styleRuleInterpolationDataFlowFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...styleRuleTargetFilters(),
    new ExpectedSemanticEffectFilter('valueChannelKind', 'style-attribute-rules'),
    new ExpectedSemanticEffectFilter('valueSiteKind', 'plain-attribute-interpolation'),
  ];
}

function stylePropertyTargetAccessFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    ...styleRuleTargetFilters(),
    new ExpectedSemanticEffectFilter('strategy', 'style-attribute-accessor'),
  ];
}

function stylePropertyValueChannelFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('channelKind', 'style-property-value'),
  ];
}

function stylePropertyDataFlowFilters(): readonly ExpectedSemanticEffectFilter[] {
  return [
    new ExpectedSemanticEffectFilter('targetKind', 'node'),
    new ExpectedSemanticEffectFilter('valueChannelKind', 'style-property-value'),
  ];
}

function formBindingEffect(
  summary: string,
  effectKind: 'binding-target-access' | 'binding-value-channel' | 'binding-data-flow',
  filters: readonly ExpectedSemanticEffectFilter[],
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.fact(
    summary,
    effectKind,
    scope,
    'template-binding',
    'present',
    null,
    filters,
  );
}

export function nativeValueTargetAccessEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-target-access', nativeValueTargetFilters(), scope);
}

export function nativeValueChannelEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', nativeValueTargetFilters(), scope);
}

export function nativeValueDataFlowEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-data-flow', nativeValueTargetFilters(), scope);
}

export function checkedTargetAccessEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-target-access', checkedTargetFilters(), scope);
}

export function checkedValueChannelEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', checkedTargetFilters(), scope);
}

export function checkedDataFlowEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-data-flow', checkedTargetFilters(), scope);
}

export function customMatcherValueChannelEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', customMatcherValueChannelFilters(), scope);
}

export function primitiveValueChannelEffect(
  summary: string,
  primitiveValueDisplay: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', primitiveValueChannelFilters(primitiveValueDisplay), scope);
}

export function capturedFieldShellInputTypeEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.fact(
    summary,
    'target-operation',
    'template',
    'template-binding',
    'present',
    null,
    capturedFieldShellInputTypeFilters(),
  );
}

export function capturedFieldShellValueDataFlowEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-data-flow', capturedFieldShellValueDataFlowFilters());
}

export function validationErrorsTargetAccessEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-target-access', validationErrorsTargetAccessFilters());
}

export function validationErrorsValueChannelEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', validationErrorsValueChannelFilters());
}

export function validationErrorsDataFlowEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-data-flow', validationErrorsDataFlowFilters());
}

export function classTokenTargetAccessEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-target-access', classTokenTargetAccessFilters());
}

export function classTokenValueChannelEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', classTokenValueChannelFilters());
}

export function classTokenInterpolationDataFlowEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-data-flow', classTokenInterpolationDataFlowFilters());
}

export function classToggleTargetAccessEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-target-access', classToggleTargetAccessFilters());
}

export function classToggleValueChannelEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', classToggleValueChannelFilters());
}

export function classToggleDataFlowEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-data-flow', classToggleDataFlowFilters());
}

export function styleRuleTargetAccessEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-target-access', styleRuleTargetAccessFilters());
}

export function styleRuleValueChannelEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', styleRuleValueChannelFilters());
}

export function styleRuleInterpolationDataFlowEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-data-flow', styleRuleInterpolationDataFlowFilters());
}

export function stylePropertyTargetAccessEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-target-access', stylePropertyTargetAccessFilters());
}

export function stylePropertyValueChannelEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-value-channel', stylePropertyValueChannelFilters());
}

export function stylePropertyDataFlowEffect(summary: string): ExpectedSemanticEffect {
  return formBindingEffect(summary, 'binding-data-flow', stylePropertyDataFlowFilters());
}

export function componentStylesheetEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.fact(
    summary,
    'style-resource',
    'style',
    'style',
    'present',
    null,
    [
      new ExpectedSemanticEffectFilter('ownerKind', 'component'),
      new ExpectedSemanticEffectFilter('assetKind', 'component-stylesheet'),
    ],
  );
}

export function componentStylesheetCapabilityEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureCapability(
    summary,
    'style-asset-authoring',
    'verifiable',
    'style',
  );
}

export function componentStylesheetTasteEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureTaste(
    summary,
    'style-resource-ownership',
    'component-stylesheet',
    'style',
  );
}

export function classTokenStyleTasteEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureTaste(
    summary,
    'style-binding-model',
    'class-token-binding',
    'template-binding',
  );
}

export function classToggleStyleTasteEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureTaste(
    summary,
    'style-binding-model',
    'class-toggle-binding',
    'template-binding',
  );
}

export function styleRuleStyleTasteEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureTaste(
    summary,
    'style-binding-model',
    'style-rule-binding',
    'template-binding',
  );
}

export function stylePropertyStyleTasteEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureTaste(
    summary,
    'style-binding-model',
    'style-property-binding',
    'template-binding',
  );
}

export function customMatcherComparisonTasteEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureTaste(
    summary,
    'form-value-channel',
    'custom-matcher-comparison',
    'template-binding',
  );
}

export function formValueChannelTasteEffects(
  nativeValueSummary: string,
  checkedModelSummary: string,
  selectModelSummary: string,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.signatureTaste(
      nativeValueSummary,
      'form-value-channel',
      'native-control-value-binding',
      'template-binding',
    ),
    ExpectedSemanticEffect.signatureTaste(
      checkedModelSummary,
      'form-value-channel',
      'checked-model-binding',
      'template-binding',
    ),
    ExpectedSemanticEffect.signatureTaste(
      selectModelSummary,
      'form-value-channel',
      'select-model-binding',
      'template-binding',
    ),
  ];
}
