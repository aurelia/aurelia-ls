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
