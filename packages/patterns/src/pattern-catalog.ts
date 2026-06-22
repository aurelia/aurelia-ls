import type {
  AureliaPatternExample,
  AureliaPatternMenuItem,
  PatternFollowUp
} from './pattern-contract.js';
import { collectionBatchSelectionPattern } from './patterns/collection-batch-selection.js';
import { collectionPaginationPattern } from './patterns/collection-pagination.js';
import { collectionServerQueryPattern } from './patterns/collection-server-query.js';
import { collectionVirtualRepeatPattern } from './patterns/collection-virtual-repeat.js';
import { componentBindableBasicPattern } from './patterns/component-bindable-basic.js';
import { componentAttributeTransferPattern } from './patterns/component-attribute-transfer.js';
import { componentCustomEventPattern } from './patterns/component-custom-event.js';
import { componentDynamicCompositionPattern } from './patterns/component-dynamic-composition.js';
import { componentLifecycleCleanupPattern } from './patterns/component-lifecycle-cleanup.js';
import { dialogConfirmEditPattern } from './patterns/dialog-confirm-edit.js';
import { formFileUploadPattern } from './patterns/form-file-upload.js';
import { formChoiceControlsPattern } from './patterns/form-choice-controls.js';
import { formServerValidationErrorsPattern } from './patterns/form-server-validation-errors.js';
import { formValidationSubmitPattern } from './patterns/form-validation-submit.js';
import { componentLocalCollectionPattern } from './patterns/component-local-collection.js';
import { componentSlottedLayoutPattern } from './patterns/component-slotted-layout.js';
import { formNativeSubmitPattern } from './patterns/form-native-submit.js';
import { localizationI18nLocaleServicePattern } from './patterns/localization-i18n-locale-service.js';
import { resourceCustomAttributePattern } from './patterns/resource-custom-attribute.js';
import { resourceTemplateControllerPattern } from './patterns/resource-template-controller.js';
import { routerActiveNavigationPattern } from './patterns/router-active-navigation.js';
import { routerCanUnloadDirtyFormPattern } from './patterns/router-can-unload-dirty-form.js';
import { routerCriticalLoadingPattern } from './patterns/router-critical-loading.js';
import { routerErrorFallbackPattern } from './patterns/router-error-fallback.js';
import { routerGuardRedirectPattern } from './patterns/router-guard-redirect.js';
import { routerAuthSessionGuardPattern } from './patterns/router-auth-session-guard.js';
import { routerNavigationLinksPattern } from './patterns/router-navigation-links.js';
import { routerRelativeContextNavigationPattern } from './patterns/router-relative-context-navigation.js';
import { routerRouteParametersPattern } from './patterns/router-route-parameters.js';
import { serviceFetchCancellationPattern } from './patterns/service-fetch-cancellation.js';
import { serviceFetchCachePolicyPattern } from './patterns/service-fetch-cache-policy.js';
import { serviceFetchClientPattern } from './patterns/service-fetch-client.js';
import { serviceFetchConfigurationPattern } from './patterns/service-fetch-configuration.js';
import { serviceFetchInterceptorPattern } from './patterns/service-fetch-interceptor.js';
import { serviceInjectedStatePattern } from './patterns/service-injected-state.js';
import { shellNavigationProgressPattern } from './patterns/shell-navigation-progress.js';
import { templateAttributeBindingPattern } from './patterns/template-attribute-binding.js';
import { templateClassStyleBindingPattern } from './patterns/template-class-style-binding.js';
import { templateConditionalRenderingPattern } from './patterns/template-conditional-rendering.js';
import { templateDebouncedInputPattern } from './patterns/template-debounced-input.js';
import { templateDomRefPattern } from './patterns/template-dom-ref.js';
import { templateEventSelfPattern } from './patterns/template-event-self.js';
import { templateFocusControlPattern } from './patterns/template-focus-control.js';
import { templateLetVariablesPattern } from './patterns/template-let-variables.js';
import { templatePortalOverlayPattern } from './patterns/template-portal-overlay.js';
import { templatePromiseSecondaryPattern } from './patterns/template-promise-secondary.js';
import { templateThrottledEventPattern } from './patterns/template-throttled-event.js';
import { templateUpdateTriggerPattern } from './patterns/template-update-trigger.js';
import { templateValueConverterDisplayPattern } from './patterns/template-value-converter-display.js';

const diagnosticOverviewFollowUp = {
  tool: 'aurelia_diagnostic_overview',
  reason: 'Run after adapting the pattern to catch TypeScript, template, and modeled Aurelia diagnostics.'
} satisfies PatternFollowUp;

const templateDiagnosticsFollowUp = {
  tool: 'aurelia_template_diagnostics',
  reason: 'Use when the adapted source changes template commands, bindings, slots, or custom-element usage.'
} satisfies PatternFollowUp;

const bindingValueChannelFollowUp = {
  tool: 'aurelia_app_query',
  queryKind: 'binding-value-channel-summary',
  reason: 'Check value channels after adapting form controls, bindable inputs, class/style bindings, or focus bindings.'
} satisfies PatternFollowUp;

const bindingDataFlowFollowUp = {
  tool: 'aurelia_app_query',
  queryKind: 'binding-data-flow-summary',
  reason: 'Inspect source-to-template data flow after adapting view-model state, service state, or derived reads.'
} satisfies PatternFollowUp;

const observedDependencyFollowUp = {
  tool: 'aurelia_app_query',
  queryKind: 'binding-observed-dependency-summary',
  reason: 'Check observed dependencies when adapting derived getters, reactive reads, or shared state.'
} satisfies PatternFollowUp;

const routerOverviewFollowUp = {
  tool: 'aurelia_router_overview',
  reason: 'Inspect route, viewport, navigation, and route-context facts after adapting router code.'
} satisfies PatternFollowUp;

const typeScriptDiagnosticFollowUp = {
  tool: 'aurelia_app_query',
  queryKind: 'typescript-diagnostic-summary',
  reason: 'Use for a compact TypeScript diagnostic pass after adapting service, lifecycle, or router code.'
} satisfies PatternFollowUp;

const localStateFollowUp = [
  diagnosticOverviewFollowUp,
  bindingDataFlowFollowUp,
  observedDependencyFollowUp,
] as const satisfies readonly PatternFollowUp[];

const sharedStateFollowUp = [
  diagnosticOverviewFollowUp,
  bindingDataFlowFollowUp,
  observedDependencyFollowUp,
] as const satisfies readonly PatternFollowUp[];

const componentApiFollowUp = [
  templateDiagnosticsFollowUp,
  bindingValueChannelFollowUp,
  diagnosticOverviewFollowUp,
] as const satisfies readonly PatternFollowUp[];

const componentOutputFollowUp = [
  templateDiagnosticsFollowUp,
  diagnosticOverviewFollowUp,
] as const satisfies readonly PatternFollowUp[];

const formControlFollowUp = [
  templateDiagnosticsFollowUp,
  bindingValueChannelFollowUp,
  diagnosticOverviewFollowUp,
] as const satisfies readonly PatternFollowUp[];

const templateBindingFollowUp = [
  templateDiagnosticsFollowUp,
  bindingValueChannelFollowUp,
  diagnosticOverviewFollowUp,
] as const satisfies readonly PatternFollowUp[];

const derivedDisplayFollowUp = [
  templateDiagnosticsFollowUp,
  bindingDataFlowFollowUp,
  observedDependencyFollowUp,
] as const satisfies readonly PatternFollowUp[];

const conditionalTemplateFollowUp = [
  templateDiagnosticsFollowUp,
  bindingDataFlowFollowUp,
  diagnosticOverviewFollowUp,
] as const satisfies readonly PatternFollowUp[];

const promiseTemplateFollowUp = [
  templateDiagnosticsFollowUp,
  bindingDataFlowFollowUp,
  diagnosticOverviewFollowUp,
] as const satisfies readonly PatternFollowUp[];

const templateStructureFollowUp = [
  templateDiagnosticsFollowUp,
  diagnosticOverviewFollowUp,
] as const satisfies readonly PatternFollowUp[];

const lifecycleFollowUp = [
  diagnosticOverviewFollowUp,
  typeScriptDiagnosticFollowUp,
] as const satisfies readonly PatternFollowUp[];

const resourceAuthoringFollowUp = [
  templateDiagnosticsFollowUp,
  diagnosticOverviewFollowUp,
  typeScriptDiagnosticFollowUp,
] as const satisfies readonly PatternFollowUp[];

const serviceFollowUp = [
  diagnosticOverviewFollowUp,
  typeScriptDiagnosticFollowUp,
  bindingDataFlowFollowUp,
] as const satisfies readonly PatternFollowUp[];

const routerFollowUp = [
  routerOverviewFollowUp,
  diagnosticOverviewFollowUp,
  typeScriptDiagnosticFollowUp,
] as const satisfies readonly PatternFollowUp[];

const shellRouterFollowUp = [
  routerOverviewFollowUp,
  diagnosticOverviewFollowUp,
  bindingDataFlowFollowUp,
] as const satisfies readonly PatternFollowUp[];

const dialogFollowUp = [
  diagnosticOverviewFollowUp,
  typeScriptDiagnosticFollowUp,
  bindingValueChannelFollowUp,
] as const satisfies readonly PatternFollowUp[];

const localizationFollowUp = [
  templateDiagnosticsFollowUp,
  diagnosticOverviewFollowUp,
  bindingDataFlowFollowUp,
] as const satisfies readonly PatternFollowUp[];

function withFollowUp(
  pattern: AureliaPatternExample,
  followUp: readonly PatternFollowUp[]
): AureliaPatternExample {
  return {
    ...pattern,
    support: {
      ...pattern.support,
      followUp,
    },
  };
}

const PATTERN_EXAMPLES: readonly AureliaPatternExample[] = [
  withFollowUp(componentLocalCollectionPattern, localStateFollowUp),
  withFollowUp(collectionServerQueryPattern, routerFollowUp),
  withFollowUp(formNativeSubmitPattern, formControlFollowUp),
  withFollowUp(formValidationSubmitPattern, formControlFollowUp),
  withFollowUp(formServerValidationErrorsPattern, formControlFollowUp),
  withFollowUp(componentBindableBasicPattern, componentApiFollowUp),
  withFollowUp(componentSlottedLayoutPattern, templateStructureFollowUp),
  withFollowUp(serviceInjectedStatePattern, sharedStateFollowUp),
  withFollowUp(componentCustomEventPattern, componentOutputFollowUp),
  withFollowUp(serviceFetchClientPattern, serviceFollowUp),
  withFollowUp(formChoiceControlsPattern, formControlFollowUp),
  withFollowUp(templateClassStyleBindingPattern, templateBindingFollowUp),
  withFollowUp(templateValueConverterDisplayPattern, derivedDisplayFollowUp),
  withFollowUp(localizationI18nLocaleServicePattern, localizationFollowUp),
  withFollowUp(templateFocusControlPattern, formControlFollowUp),
  withFollowUp(templateDomRefPattern, templateStructureFollowUp),
  withFollowUp(templateDebouncedInputPattern, formControlFollowUp),
  withFollowUp(templateConditionalRenderingPattern, conditionalTemplateFollowUp),
  withFollowUp(componentLifecycleCleanupPattern, lifecycleFollowUp),
  withFollowUp(resourceCustomAttributePattern, resourceAuthoringFollowUp),
  withFollowUp(shellNavigationProgressPattern, shellRouterFollowUp),
  withFollowUp(routerNavigationLinksPattern, routerFollowUp),
  withFollowUp(routerActiveNavigationPattern, routerFollowUp),
  withFollowUp(routerCriticalLoadingPattern, routerFollowUp),
  withFollowUp(routerRouteParametersPattern, routerFollowUp),
  withFollowUp(templatePromiseSecondaryPattern, promiseTemplateFollowUp),
  withFollowUp(templateAttributeBindingPattern, templateBindingFollowUp),
  withFollowUp(templateEventSelfPattern, templateBindingFollowUp),
  withFollowUp(templateUpdateTriggerPattern, formControlFollowUp),
  withFollowUp(templateThrottledEventPattern, templateBindingFollowUp),
  withFollowUp(templateLetVariablesPattern, derivedDisplayFollowUp),
  withFollowUp(componentAttributeTransferPattern, componentApiFollowUp),
  withFollowUp(componentDynamicCompositionPattern, templateStructureFollowUp),
  withFollowUp(routerGuardRedirectPattern, routerFollowUp),
  withFollowUp(routerAuthSessionGuardPattern, routerFollowUp),
  withFollowUp(routerCanUnloadDirtyFormPattern, routerFollowUp),
  withFollowUp(routerRelativeContextNavigationPattern, routerFollowUp),
  withFollowUp(routerErrorFallbackPattern, routerFollowUp),
  withFollowUp(serviceFetchConfigurationPattern, serviceFollowUp),
  withFollowUp(serviceFetchCancellationPattern, serviceFollowUp),
  withFollowUp(serviceFetchInterceptorPattern, serviceFollowUp),
  withFollowUp(serviceFetchCachePolicyPattern, serviceFollowUp),
  withFollowUp(collectionPaginationPattern, localStateFollowUp),
  withFollowUp(collectionVirtualRepeatPattern, conditionalTemplateFollowUp),
  withFollowUp(collectionBatchSelectionPattern, localStateFollowUp),
  withFollowUp(formFileUploadPattern, formControlFollowUp),
  withFollowUp(resourceTemplateControllerPattern, resourceAuthoringFollowUp),
  withFollowUp(dialogConfirmEditPattern, dialogFollowUp),
  withFollowUp(templatePortalOverlayPattern, templateStructureFollowUp)
];

export function listAureliaPatternMenuItems(): readonly AureliaPatternMenuItem[] {
  return PATTERN_EXAMPLES.map((pattern) => ({
    patternId: pattern.patternId,
    title: pattern.title,
    summary: pattern.guidance.summary
  }));
}

export function searchAureliaPatternMenuItems(query: string | null | undefined): readonly AureliaPatternMenuItem[] {
  const normalizedQuery = query?.trim() ?? '';
  const menuItems = listAureliaPatternMenuItems();
  if (normalizedQuery.length === 0) {
    return menuItems;
  }
  if (isExcludedPatternSearchQuery(normalizedQuery)) {
    return [];
  }

  const queryTerms = patternSearchTerms(normalizedQuery);
  if (queryTerms.length === 0) {
    return [];
  }
  const normalizedSearchQuery = patternSearchText([normalizedQuery]);
  return PATTERN_EXAMPLES
    .map((pattern, index) => ({
      index,
      item: menuItems[index]!,
      score: patternSearchScore(pattern, normalizedSearchQuery, queryTerms),
    }))
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((row) => row.item);
}

export function getAureliaPatternExample(patternId: string): AureliaPatternExample | undefined {
  return PATTERN_EXAMPLES.find((pattern) => pattern.patternId === patternId);
}

export const aureliaPatternExamples: readonly AureliaPatternExample[] = PATTERN_EXAMPLES;

const PATTERN_SEARCH_ALIASES = new Map<string, readonly string[]>([
  ['component.local-collection', [
    'local list',
    'filter list',
    'search list',
    'select row',
    'small collection',
  ]],
  ['collection.server-query', [
    'server pagination',
    'server filtering',
    'server sorting',
    'server filter sort',
    'server query state',
    'remote data table',
    'url query filters',
  ]],
  ['form.native-submit', [
    'simple form submit',
    'native form validation',
    'browser constraints',
    'contact form',
    'submit.trigger',
  ]],
  ['form.validation-submit', [
    'validation',
    'form validation',
    'validation plugin',
    'validation rules',
    'cross field validation',
    'validated submit',
    'inline field errors',
  ]],
  ['form.server-validation-errors', [
    'server validation',
    'api field errors',
    'server field errors',
    'validation response errors',
    'merge server errors',
  ]],
  ['component.bindable-basic', [
    'pass data to child component',
    'parent to child input',
    'component input',
    'presenter component',
    'bindable props',
  ]],
  ['component.slotted-layout', [
    'slots layout',
    'slot content',
    'named slots',
    'project content',
    'layout component',
  ]],
  ['service.injected-state', [
    'shared state between sibling components',
    'component communication',
    'sibling communication',
    'shared feature state',
    'di state service',
  ]],
  ['component.custom-event', [
    'child emits event',
    'child to parent',
    'child to parent event',
    'emit event to parent',
    'component communication',
    'parent child output',
    'custom event output',
    'button event to parent',
  ]],
  ['service.fetch-client', [
    'fetch data from api',
    'http data service',
    'api client',
    'json request',
    'load remote data',
  ]],
  ['form.choice-controls', [
    'select radio checkbox',
    'choice controls',
    'checkbox group',
    'radio buttons',
    'select options',
  ]],
  ['template.class-style-binding', [
    'class binding',
    'style binding',
    'conditional classes',
    'visual state',
  ]],
  ['template.value-converter-display', [
    'value converter',
    'format display',
    'display formatting',
    'derived display text',
  ]],
  ['localization.i18n-locale-service', [
    'i18n',
    'internationalization',
    'localization',
    'locale switcher',
    'translated text',
    'translation keys',
  ]],
  ['template.focus-control', [
    'focus input',
    'focus control',
    'focus.to-view',
    'open and focus',
  ]],
  ['template.dom-ref', [
    'dom ref',
    'element ref',
    'template reference',
    'ref attribute',
  ]],
  ['template.debounced-input', [
    'debounce input',
    'delayed input',
    'typing delay',
    'debounced value',
  ]],
  ['template.conditional-rendering', [
    'conditional rendering',
    'if else',
    'show hide',
    'switch case',
  ]],
  ['component.lifecycle-cleanup', [
    'lifecycle cleanup',
    'remove event listener',
    'attached detaching',
    'browser listener',
  ]],
  ['resource.custom-attribute', [
    'custom attribute',
    'host attribute',
    'attribute resource',
    'bindable attribute',
  ]],
  ['shell.navigation-progress', [
    'navigation progress',
    'route loading indicator',
    'router events',
    'shell progress',
  ]],
  ['router.navigation-links', [
    'navigation links',
    'route links',
    'router links',
    'anchor navigation',
  ]],
  ['router.active-navigation', [
    'active link',
    'active navigation',
    'current route link',
    'selected nav item',
  ]],
  ['router.critical-loading', [
    'route data loading',
    'critical data loading',
    'loading hook',
    'canLoad loading',
  ]],
  ['router.route-parameters', [
    'route params',
    'route parameters',
    'getRouteParameters',
    'parent child params',
    'query params',
  ]],
  ['template.promise-secondary', [
    'promise loading error',
    'promise.bind',
    'async panel',
    'secondary async content',
  ]],
  ['template.attribute-binding', [
    'attribute binding',
    'aria binding',
    'data attribute',
    'boolean attribute',
  ]],
  ['template.event-self', [
    'event self',
    'self trigger',
    'ignore child click',
    'event target',
  ]],
  ['template.update-trigger', [
    'update trigger',
    'change instead of input',
    'input commit timing',
    'blur update',
  ]],
  ['template.throttled-event', [
    'throttle click',
    'throttled event',
    'limit repeated events',
    'scroll throttle',
  ]],
  ['template.let-variables', [
    'let variables',
    'template local variables',
    'alias expression',
    'derived local',
  ]],
  ['component.attribute-transfer', [
    'attribute transfer',
    'attrs transfer',
    'wrapper attributes',
    'pass native attributes',
  ]],
  ['component.dynamic-composition', [
    'dynamic composition',
    'dynamic component',
    'compose component',
    'choose component at runtime',
  ]],
  ['router.guard-redirect', [
    'guard redirect',
    'canLoad redirect',
    'auth redirect',
    'deny route',
  ]],
  ['router.auth-session-guard', [
    'auth guard',
    'session guard',
    'protected route',
    'role based route',
    'route roles',
    'authorization route',
  ]],
  ['router.can-unload-dirty-form', [
    'dirty form leave page',
    'unsaved changes',
    'canUnload dirty',
    'confirm navigation away',
  ]],
  ['router.relative-context-navigation', [
    'relative navigation',
    'route context navigation',
    'router.load context',
    'child route navigation',
  ]],
  ['router.error-fallback', [
    'unknown route',
    'not found route',
    'fallback route',
    '404 route',
  ]],
  ['service.fetch-configuration', [
    'fetch configuration',
    'base url',
    'http defaults',
    'configure fetch client',
  ]],
  ['service.fetch-cancellation', [
    'cancel stale request',
    'abort fetch',
    'AbortController',
    'cancel search',
  ]],
  ['service.fetch-interceptor', [
    'http interceptor',
    'fetch interceptor',
    'fetch client request',
    'request interceptor',
    'response interceptor',
  ]],
  ['service.fetch-cache-policy', [
    'cache fetch response',
    'fetch cache',
    'cache policy',
    'reuse http response',
  ]],
  ['collection.pagination', [
    'pagination',
    'page list',
    'local page',
    'paged collection',
  ]],
  ['collection.virtual-repeat', [
    'virtual repeat',
    'virtualization',
    'large list',
    'recycled rows',
    'scroll large collection',
  ]],
  ['collection.batch-selection', [
    'batch selection',
    'select many rows',
    'selected ids',
    'bulk action',
  ]],
  ['form.file-upload', [
    'file upload',
    'FormData upload',
    'native file input',
    'multipart form',
  ]],
  ['resource.template-controller', [
    'template controller',
    'structural attribute',
    'custom template controller',
    'stamp view',
  ]],
  ['dialog.confirm-edit', [
    'dialog',
    'modal dialog',
    'confirm dialog',
    'confirm delete dialog',
    'edit dialog',
    'modal edit form',
  ]],
  ['template.portal-overlay', [
    'portal notification overlay',
    'toast overlay',
    'portal overlay',
    'portalled content',
  ]],
]);

const PATTERN_SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'from',
  'in',
  'of',
  'on',
  'the',
  'to',
  'with',
]);

function patternSearchScore(
  pattern: AureliaPatternExample,
  normalizedQuery: string,
  queryTerms: readonly string[]
): number {
  const patternIdText = patternSearchText([pattern.patternId]);
  const titleText = patternSearchText([pattern.title]);
  const visibleText = patternSearchText([
    pattern.patternId,
    pattern.title,
    pattern.guidance.summary,
  ]);
  const aliasText = patternSearchText(PATTERN_SEARCH_ALIASES.get(pattern.patternId) ?? []);
  const sourcePathText = patternSearchText(pattern.source.files.map((file) => file.path));

  let score = 0;
  if (patternIdText === normalizedQuery) score += 1000;
  if (titleText === normalizedQuery) score += 800;
  score += patternTextScore(visibleText, normalizedQuery, queryTerms, 12);
  score += patternTextScore(aliasText, normalizedQuery, queryTerms, 16);
  score += patternTextScore(sourcePathText, normalizedQuery, queryTerms, 4);
  return score;
}

function isExcludedPatternSearchQuery(query: string): boolean {
  const normalized = patternSearchText([query]);
  return [
    'app builder',
    'callback',
    'callback bindable',
    'callback bindables',
    'eventaggregator',
    'event aggregator',
    'state plugin',
    'state store',
    'store plugin',
    'router direct',
    'sourceplan',
    'source plan',
    'source lowering',
  ].includes(normalized);
}

function patternTextScore(
  text: string,
  normalizedQuery: string,
  queryTerms: readonly string[],
  weight: number
): number {
  let score = text.includes(normalizedQuery) ? weight * 4 : 0;
  for (const term of queryTerms) {
    if (text.includes(term)) {
      score += weight;
    }
  }
  return score;
}

function patternSearchText(parts: readonly string[]): string {
  return parts.join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function patternSearchTerms(query: string): readonly string[] {
  return patternSearchText([query])
    .split(' ')
    .filter((term) => term.length > 1 && !PATTERN_SEARCH_STOP_WORDS.has(term));
}
