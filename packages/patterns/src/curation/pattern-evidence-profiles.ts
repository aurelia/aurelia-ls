import { bindableBasicEvidenceProfile } from './bindable-basic-evidence.js';
import { collectionBatchSelectionEvidenceProfile } from './collection-batch-selection-evidence.js';
import { collectionPaginationEvidenceProfile } from './collection-pagination-evidence.js';
import { collectionServerQueryEvidenceProfile } from './collection-server-query-evidence.js';
import { collectionVirtualRepeatEvidenceProfile } from './collection-virtual-repeat-evidence.js';
import { componentAttributeTransferEvidenceProfile } from './component-attribute-transfer-evidence.js';
import { componentCustomEventEvidenceProfile } from './component-custom-event-evidence.js';
import { componentDynamicCompositionEvidenceProfile } from './component-dynamic-composition-evidence.js';
import { componentLifecycleCleanupEvidenceProfile } from './component-lifecycle-cleanup-evidence.js';
import { componentSlottedLayoutEvidenceProfile } from './component-slotted-layout-evidence.js';
import { dialogConfirmEditEvidenceProfile } from './dialog-confirm-edit-evidence.js';
import { formChoiceControlsEvidenceProfile } from './form-choice-controls-evidence.js';
import { formFileUploadEvidenceProfile } from './form-file-upload-evidence.js';
import { formServerValidationErrorsEvidenceProfile } from './form-server-validation-errors-evidence.js';
import { formValidationSubmitEvidenceProfile } from './form-validation-submit-evidence.js';
import { localCollectionEvidenceProfile } from './local-collection-evidence.js';
import { localizationI18nLocaleServiceEvidenceProfile } from './localization-i18n-locale-service-evidence.js';
import { nativeFormSubmitEvidenceProfile } from './native-form-submit-evidence.js';
import { resourceCustomAttributeEvidenceProfile } from './resource-custom-attribute-evidence.js';
import { resourceTemplateControllerEvidenceProfile } from './resource-template-controller-evidence.js';
import { routerActiveNavigationEvidenceProfile } from './router-active-navigation-evidence.js';
import { routerCanUnloadDirtyFormEvidenceProfile } from './router-can-unload-dirty-form-evidence.js';
import { routerCriticalLoadingEvidenceProfile } from './router-critical-loading-evidence.js';
import { routerErrorFallbackEvidenceProfile } from './router-error-fallback-evidence.js';
import { routerGuardRedirectEvidenceProfile } from './router-guard-redirect-evidence.js';
import { routerAuthSessionGuardEvidenceProfile } from './router-auth-session-guard-evidence.js';
import { routerNavigationLinksEvidenceProfile } from './router-navigation-links-evidence.js';
import { routerRelativeContextNavigationEvidenceProfile } from './router-relative-context-navigation-evidence.js';
import { routerRouteParametersEvidenceProfile } from './router-route-parameters-evidence.js';
import { serviceFetchCancellationEvidenceProfile } from './service-fetch-cancellation-evidence.js';
import { serviceFetchCachePolicyEvidenceProfile } from './service-fetch-cache-policy-evidence.js';
import { serviceFetchClientEvidenceProfile } from './service-fetch-client-evidence.js';
import { serviceFetchConfigurationEvidenceProfile } from './service-fetch-configuration-evidence.js';
import { serviceFetchInterceptorEvidenceProfile } from './service-fetch-interceptor-evidence.js';
import { serviceInjectedStateEvidenceProfile } from './service-injected-state-evidence.js';
import { shellNavigationProgressEvidenceProfile } from './shell-navigation-progress-evidence.js';
import { templateAttributeBindingEvidenceProfile } from './template-attribute-binding-evidence.js';
import { templateClassStyleBindingEvidenceProfile } from './template-class-style-binding-evidence.js';
import { templateConditionalRenderingEvidenceProfile } from './template-conditional-rendering-evidence.js';
import { templateDebouncedInputEvidenceProfile } from './template-debounced-input-evidence.js';
import { templateDomRefEvidenceProfile } from './template-dom-ref-evidence.js';
import { templateEventSelfEvidenceProfile } from './template-event-self-evidence.js';
import { templateFocusControlEvidenceProfile } from './template-focus-control-evidence.js';
import { templateLetVariablesEvidenceProfile } from './template-let-variables-evidence.js';
import { templatePortalOverlayEvidenceProfile } from './template-portal-overlay-evidence.js';
import { templatePromiseSecondaryEvidenceProfile } from './template-promise-secondary-evidence.js';
import { templateThrottledEventEvidenceProfile } from './template-throttled-event-evidence.js';
import { templateUpdateTriggerEvidenceProfile } from './template-update-trigger-evidence.js';
import { templateValueConverterDisplayEvidenceProfile } from './template-value-converter-display-evidence.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

const PATTERN_EVIDENCE_PROFILES: readonly PatternEvidenceProfile[] = [
  localCollectionEvidenceProfile,
  collectionServerQueryEvidenceProfile,
  nativeFormSubmitEvidenceProfile,
  formValidationSubmitEvidenceProfile,
  formServerValidationErrorsEvidenceProfile,
  bindableBasicEvidenceProfile,
  componentSlottedLayoutEvidenceProfile,
  serviceInjectedStateEvidenceProfile,
  componentCustomEventEvidenceProfile,
  serviceFetchClientEvidenceProfile,
  formChoiceControlsEvidenceProfile,
  templateClassStyleBindingEvidenceProfile,
  templateValueConverterDisplayEvidenceProfile,
  localizationI18nLocaleServiceEvidenceProfile,
  templateFocusControlEvidenceProfile,
  templateDomRefEvidenceProfile,
  templateDebouncedInputEvidenceProfile,
  templateConditionalRenderingEvidenceProfile,
  componentLifecycleCleanupEvidenceProfile,
  resourceCustomAttributeEvidenceProfile,
  shellNavigationProgressEvidenceProfile,
  routerNavigationLinksEvidenceProfile,
  routerActiveNavigationEvidenceProfile,
  routerCriticalLoadingEvidenceProfile,
  routerRouteParametersEvidenceProfile,
  templatePromiseSecondaryEvidenceProfile,
  templateAttributeBindingEvidenceProfile,
  templateEventSelfEvidenceProfile,
  templateUpdateTriggerEvidenceProfile,
  templateThrottledEventEvidenceProfile,
  templateLetVariablesEvidenceProfile,
  componentAttributeTransferEvidenceProfile,
  componentDynamicCompositionEvidenceProfile,
  routerGuardRedirectEvidenceProfile,
  routerAuthSessionGuardEvidenceProfile,
  routerCanUnloadDirtyFormEvidenceProfile,
  routerRelativeContextNavigationEvidenceProfile,
  routerErrorFallbackEvidenceProfile,
  serviceFetchConfigurationEvidenceProfile,
  serviceFetchCancellationEvidenceProfile,
  serviceFetchInterceptorEvidenceProfile,
  serviceFetchCachePolicyEvidenceProfile,
  collectionPaginationEvidenceProfile,
  collectionVirtualRepeatEvidenceProfile,
  collectionBatchSelectionEvidenceProfile,
  formFileUploadEvidenceProfile,
  resourceTemplateControllerEvidenceProfile,
  dialogConfirmEditEvidenceProfile,
  templatePortalOverlayEvidenceProfile
];

export function listPatternEvidenceProfiles(): readonly PatternEvidenceProfile[] {
  return PATTERN_EVIDENCE_PROFILES;
}

export function getPatternEvidenceProfile(patternId: string): PatternEvidenceProfile | undefined {
  return PATTERN_EVIDENCE_PROFILES.find((profile) => profile.admission.patternId === patternId);
}

export const aureliaPatternEvidenceProfiles: readonly PatternEvidenceProfile[] = PATTERN_EVIDENCE_PROFILES;
