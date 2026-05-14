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

export function nativeValueTargetAccessEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.fact(
    summary,
    'binding-target-access',
    scope,
    'template-binding',
    'present',
    null,
    nativeValueTargetFilters(),
  );
}

export function nativeValueChannelEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.fact(
    summary,
    'binding-value-channel',
    scope,
    'template-binding',
    'present',
    null,
    nativeValueTargetFilters(),
  );
}

export function nativeValueDataFlowEffect(
  summary: string,
  scope: ExpectedSemanticEffectScope = 'template',
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.fact(
    summary,
    'binding-data-flow',
    scope,
    'template-binding',
    'present',
    null,
    nativeValueTargetFilters(),
  );
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

export function nativeFormValueTasteEffects(
  nativeValueSummary: string,
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
      selectModelSummary,
      'form-value-channel',
      'select-model-binding',
      'template-binding',
    ),
  ];
}
