import {
  ExpectedSemanticEffect,
  expectedSemanticEffectFilters,
} from './expected-effect.js';
import {
  bindingBehaviorApplicationEffect,
  checkedDataFlowEffect,
  checkedTargetAccessEffect,
  checkedValueChannelEffect,
  classToggleDataFlowEffect,
  classToggleStyleTasteEffect,
  classToggleTargetAccessEffect,
  classToggleValueChannelEffect,
  classTokenInterpolationDataFlowEffect,
  classTokenStyleTasteEffect,
  classTokenTargetAccessEffect,
  classTokenValueChannelEffect,
  componentStylesheetCapabilityEffect,
  componentStylesheetEffect,
  componentStylesheetTasteEffect,
  directStateDomainTemplateBindingTasteEffect,
  formValueChannelTasteEffects,
  nativeValueChannelEffect,
  nativeValueDataFlowEffect,
  nativeValueTargetAccessEffect,
  observerCouplingValueChannelEffect,
  sourceBackedGetterObservationTasteEffect,
  stylePropertyDataFlowEffect,
  stylePropertyStyleTasteEffect,
  stylePropertyTargetAccessEffect,
  stylePropertyValueChannelEffect,
  styleRuleInterpolationDataFlowEffect,
  styleRuleStyleTasteEffect,
  styleRuleTargetAccessEffect,
  styleRuleValueChannelEffect,
} from './form-expected-effects.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  syntheticViewRuntimeEffect,
  templateControllerRuntimeEffect,
} from './template-controller-expected-effects.js';
import type { SearchableDataTableDomainNames } from './searchable-data-table-source-plan.js';
import {
  searchableDataTableRowsGetterName,
  searchableDataTableUsesReferencePresentation,
  type SearchableDataTableFeatureProfile,
} from './searchable-data-table-field-schema.js';

export interface DataTableStateExpectedEffectsOptions {
  readonly stateClassName: string;
  readonly serviceClassName: string;
  readonly filteredRowsGetterName?: string;
  readonly sortedRowsGetterName?: string;
  readonly pageRowsGetterName?: string;
  readonly rowCollectionGetterName?: string;
  readonly tableFeatureProfile?: SearchableDataTableFeatureProfile;
}

export interface DataTableAppExpectedEffectsOptions extends DataTableStateExpectedEffectsOptions {
  readonly summaryPrefix: string;
  readonly componentCount: number;
  readonly componentCountSummary?: string;
  readonly externalTemplateCount: number;
  readonly compiledTemplateCount: number;
}

export interface DataTableDomainExpectedEffectsModel {
  readonly stateClassName: string;
  readonly serviceClassName: string;
  readonly tableDomain: SearchableDataTableDomainNames;
  readonly tableFeatureProfile?: SearchableDataTableFeatureProfile;
}

export function dataTableDomainExpectedEffectOptions(
  model: DataTableDomainExpectedEffectsModel,
): DataTableStateExpectedEffectsOptions {
  return {
    stateClassName: model.stateClassName,
    serviceClassName: model.serviceClassName,
    filteredRowsGetterName: model.tableDomain.filteredCollectionGetterName,
    sortedRowsGetterName: model.tableDomain.sortedCollectionGetterName,
    pageRowsGetterName: model.tableDomain.pageCollectionGetterName,
    rowCollectionGetterName: searchableDataTableRowsGetterName(model.tableDomain, dataTableFeatureProfile(model)),
    tableFeatureProfile: model.tableFeatureProfile,
  };
}

export function dataTableStatePlanStepExpectedEffects(
  options: DataTableStateExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const names = dataTableRowGetterNames(options);
  const featureProfile = dataTableFeatureProfile(options);
  const composedStateCount = 1
    + (featureProfile.hasSortControls ? 1 : 0)
    + (featureProfile.hasPaginationControls ? 1 : 0)
    + (featureProfile.hasSelectionControls ? 1 : 0);
  return [
    stateClassEffect('Data table state source should be visible in app topology.', options.stateClassName),
    ExpectedSemanticEffect.signatureAtLeast(`Data table state should expose composed ${dataTableStateCompositionSummary(featureProfile)} state.`, 'state-composition', 'di', composedStateCount, 'state-model', expectedSemanticEffectFilters(
      ['ownerClassName', options.stateClassName],
    )),
    dataTableComputedObserverSourceEffect('Data table filtered rows should use plain getter observation.', options.stateClassName, names.filteredRowsGetterName),
    ...(featureProfile.hasSortControls
      ? [dataTableComputedObserverSourceEffect('Data table sorted rows should use plain getter observation.', options.stateClassName, names.sortedRowsGetterName)]
      : []),
    ...(featureProfile.hasPaginationControls
      ? [dataTableComputedObserverSourceEffect('Data table current page rows should use plain getter observation.', options.stateClassName, names.pageRowsGetterName)]
      : []),
    ExpectedSemanticEffect.signatureTaste('Data table authoring orientation should recognize DI-owned state.', 'state-ownership', 'di-owned-state-class', 'state-model'),
    directStateDomainTemplateBindingTasteEffect('Data table state should favor direct state/domain template binding.'),
    sourceBackedGetterObservationTasteEffect('Data table state should favor source-backed getter observation.'),
  ];
}

export function dataTableServicePlanStepExpectedEffects(
  options: DataTableStateExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  return [
    serviceClassEffect('Data table service source should be visible in app topology.', options.serviceClassName),
    ExpectedSemanticEffect.discriminatorTaste('Data table authoring orientation should recognize a DI-owned service layer.', 'state-ownership', 'di-owned-service-layer', 'service'),
  ];
}

export function dataTableControlsExpectedEffects(
  summaryPrefix: string,
  featureProfile: SearchableDataTableFeatureProfile = dataTableFeatureProfile({}),
): readonly ExpectedSemanticEffect[] {
  return [
    nativeValueTargetAccessEffect(`${summaryPrefix} should expose native value target access.`),
    nativeValueChannelEffect(`${summaryPrefix} should expose native value channels.`),
    nativeValueDataFlowEffect(`${summaryPrefix} should expose native value data flow.`),
    ...(featureProfile.hasCheckedSelectionChannel
      ? [
        checkedTargetAccessEffect(`${summaryPrefix} should expose checked target access.`),
        checkedValueChannelEffect(`${summaryPrefix} should expose checked value channels.`),
        checkedDataFlowEffect(`${summaryPrefix} should expose checked data flow.`),
        observerCouplingValueChannelEffect(`${summaryPrefix} should expose checked collection observer coupling.`, 'checked-collection-observer'),
        observerCouplingValueChannelEffect(`${summaryPrefix} should expose checked collection mutation coupling.`, 'checked-collection-membership-mutation'),
      ]
      : []),
    ...(featureProfile.hasFacetFilters
      ? [observerCouplingValueChannelEffect(`${summaryPrefix} should expose select option-list mutation observer coupling.`, 'select-option-list-mutation-observer')]
      : []),
    bindingBehaviorApplicationEffect(`${summaryPrefix} should expose debounce binding behavior application.`, 'debounce'),
    ...formValueChannelTasteEffects(
      `${summaryPrefix} should recognize native control value binding taste.`,
      featureProfile.hasCheckedSelectionChannel ? `${summaryPrefix} should recognize checked/model binding taste.` : null,
      featureProfile.hasFacetFilters ? `${summaryPrefix} should recognize select/model binding taste.` : null,
    ),
    ExpectedSemanticEffect.absentTaste(
      `${summaryPrefix} should not classify built-in template controllers as custom controls.`,
      'form-value-channel',
      'custom-control-binding',
      'template-binding',
    ),
  ];
}

export function dataTableControlsPlanStepSummary(
  featureProfile: SearchableDataTableFeatureProfile,
  extra: string | null = null,
): string {
  const parts = [
    'native controls',
    'debounce binding behavior',
    ...(featureProfile.hasCheckedSelectionChannel ? ['checked/model selection'] : []),
    ...(featureProfile.hasFacetFilters ? ['select/checked facet filters'] : []),
    'direct state bindings',
    ...(extra == null ? [] : [extra]),
  ];
  return parts.length < 3
    ? parts.join(' and ')
    : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

export function dataTableListExpectedEffects(
  summaryPrefix: string,
  options: Pick<DataTableStateExpectedEffectsOptions, 'pageRowsGetterName' | 'rowCollectionGetterName' | 'tableFeatureProfile'> = {},
): readonly ExpectedSemanticEffect[] {
  const rowCollectionGetterName = options.rowCollectionGetterName ?? options.pageRowsGetterName ?? 'pageUsers';
  const featureProfile = dataTableFeatureProfile(options);
  return [
    ExpectedSemanticEffect.signatureFact(`${summaryPrefix} should expose list-renderer component role.`, 'component-role', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'list-renderer'],
    )),
    templateControllerRuntimeEffect(`${summaryPrefix} should materialize header repeat controllers.`, 'iteration', 'many'),
    syntheticViewRuntimeEffect(`${summaryPrefix} should materialize row synthetic views.`, 'iteration', 'many'),
    directRowsObservedDependencyEffect(`${summaryPrefix} should observe direct DI state rows.`, rowCollectionGetterName),
    ...(featureProfile.hasSortControls
      ? [directSortColumnObservedDependencyEffect(`${summaryPrefix} should observe the active sort column directly.`)]
      : []),
    ...(featureProfile.hasTableStyleBindings
      ? [
        classTokenStyleTasteEffect(`${summaryPrefix} should recognize class-token style binding.`),
        classToggleStyleTasteEffect(`${summaryPrefix} should recognize class-toggle style binding.`),
        styleRuleStyleTasteEffect(`${summaryPrefix} should recognize style-rule binding.`),
        stylePropertyStyleTasteEffect(`${summaryPrefix} should recognize style-property binding.`),
      ]
      : []),
  ];
}

export function dataTableAppExpectedEffects(
  options: DataTableAppExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const prefix = options.summaryPrefix;
  const names = dataTableRowGetterNames(options);
  const featureProfile = dataTableFeatureProfile(options);
  const composedStateCount = 1
    + (featureProfile.hasSortControls ? 1 : 0)
    + (featureProfile.hasPaginationControls ? 1 : 0)
    + (featureProfile.hasSelectionControls ? 1 : 0);
  return [
    ExpectedSemanticEffect.fact(`${prefix} reopens as an Aurelia project.`, 'project-shape'),
    ...projectToolingExpectedEffects(prefix),
    ExpectedSemanticEffect.fact(`${prefix} has an app root.`, 'app-root'),
    ExpectedSemanticEffect.atLeast(
      `${prefix} has ${options.componentCountSummary ?? 'root and data-table custom elements'}.`,
      'component',
      'resource',
      options.componentCount,
      'component',
    ),
    ExpectedSemanticEffect.fact(`${prefix} has an app-root component role.`, 'component-role', 'resource', 'app-root', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'app-root'],
    )),
    ExpectedSemanticEffect.signatureFact(`${prefix} has a component-composition host role.`, 'component-role', 'resource', 'component', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'component-composition-host'],
    )),
    ExpectedSemanticEffect.signatureFact(`${prefix} has a list-renderer component role.`, 'component-role', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'list-renderer'],
    )),
    ExpectedSemanticEffect.signatureFact(`${prefix} has an event-surface component role.`, 'component-role', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
      ['roleKind', 'event-surface'],
    )),
    ExpectedSemanticEffect.atLeast(`${prefix} has external templates.`, 'external-template', 'template', options.externalTemplateCount, 'template'),
    ...(searchableDataTableUsesReferencePresentation(featureProfile)
      ? [
        componentStylesheetEffect(`${prefix} has a component stylesheet.`),
        componentStylesheetCapabilityEffect(`${prefix} exposes verifiable style asset authoring.`),
      ]
      : []),
    ExpectedSemanticEffect.atLeast(`${prefix} has compiled template facts.`, 'template-compilation', 'template', options.compiledTemplateCount, 'template'),
    ExpectedSemanticEffect.fact(`${prefix} has runtime controller facts.`, 'runtime-controller', 'template', 'component'),
    stateClassEffect(`${prefix} has a state service-class row.`, options.stateClassName),
    serviceClassEffect(`${prefix} has a service-layer service-class row.`, options.serviceClassName),
    ExpectedSemanticEffect.signatureAtLeast(`${prefix} has composed state rows.`, 'state-composition', 'di', composedStateCount, 'state-model', expectedSemanticEffectFilters(
      ['ownerClassName', options.stateClassName],
    )),
    ExpectedSemanticEffect.signatureFact(`${prefix} component calls the DI-owned state layer.`, 'service-interaction', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
      ['consumerRole', 'component-source'],
      ['targetRole', 'state-source'],
      ['operationKind', 'call'],
      ['isSelfInteraction', false],
    )),
    ExpectedSemanticEffect.discriminatorFact(`${prefix} state calls the injected service boundary.`, 'service-interaction', 'di', 'service', 'present', null, expectedSemanticEffectFilters(
      ['consumerRole', 'state-source'],
      ['targetRole', 'service-source'],
      ['operationKind', 'call'],
      ['isSelfInteraction', false],
    )),
    ...dataTableControlsExpectedEffects(prefix, featureProfile),
    ...dataTableListExpectedEffects(prefix, {
      ...names,
      tableFeatureProfile: featureProfile,
    }),
    ...dataTableStyleEffects(prefix, featureProfile),
    dataTableComputedObserverSourceEffect(`${prefix} exposes ${names.filteredRowsGetterName} getter observation.`, options.stateClassName, names.filteredRowsGetterName),
    ...(featureProfile.hasSortControls
      ? [dataTableComputedObserverSourceEffect(`${prefix} exposes ${names.sortedRowsGetterName} getter observation.`, options.stateClassName, names.sortedRowsGetterName)]
      : []),
    ...(featureProfile.hasPaginationControls
      ? [dataTableComputedObserverSourceEffect(`${prefix} exposes ${names.pageRowsGetterName} getter observation.`, options.stateClassName, names.pageRowsGetterName)]
      : []),
    directFilterObservedDependencyEffect(`${prefix} exposes observed dependencies for direct filter search binding.`),
    ExpectedSemanticEffect.absent(`${prefix} has no open semantic seams.`, 'open-seam-closure'),
    ExpectedSemanticEffect.capability(`${prefix} exposes verifiable template composition.`, 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste(`${prefix} reports DI-owned state.`, 'state-ownership', 'di-owned-state-class', 'state-model'),
    ExpectedSemanticEffect.discriminatorTaste(`${prefix} reports a DI-owned service layer.`, 'state-ownership', 'di-owned-service-layer', 'service'),
    directStateDomainTemplateBindingTasteEffect(`${prefix} reports direct state/domain template binding taste.`),
    sourceBackedGetterObservationTasteEffect(`${prefix} reports plain getter observation taste.`),
    ExpectedSemanticEffect.signatureTaste(`${prefix} reports template-controller composition.`, 'template-rendering-boundary', 'template-controller-composition', 'template-controller'),
    ...(searchableDataTableUsesReferencePresentation(featureProfile)
      ? [componentStylesheetTasteEffect(`${prefix} reports component stylesheet taste.`)]
      : []),
    ...(featureProfile.hasTableStyleBindings
      ? [
        classTokenStyleTasteEffect(`${prefix} reports class-token style binding taste.`),
        classToggleStyleTasteEffect(`${prefix} reports class-toggle style binding taste.`),
        styleRuleStyleTasteEffect(`${prefix} reports style-rule binding taste.`),
        stylePropertyStyleTasteEffect(`${prefix} reports style-property binding taste.`),
      ]
      : []),
  ];
}

function dataTableStyleEffects(
  prefix: string,
  featureProfile: SearchableDataTableFeatureProfile,
): readonly ExpectedSemanticEffect[] {
  if (!featureProfile.hasTableStyleBindings) {
    return [];
  }
  return [
    classTokenTargetAccessEffect(`${prefix} has class interpolation target access.`),
    classTokenValueChannelEffect(`${prefix} has class-token value channels.`),
    classTokenInterpolationDataFlowEffect(`${prefix} has class interpolation data flow.`),
    ...(featureProfile.hasTableStyleBindings
      ? [
        classToggleTargetAccessEffect(`${prefix} has class-toggle target access.`),
        classToggleValueChannelEffect(`${prefix} has class-toggle value channels.`),
        classToggleDataFlowEffect(`${prefix} has class-toggle data flow.`),
        styleRuleTargetAccessEffect(`${prefix} has style interpolation target access.`),
        styleRuleValueChannelEffect(`${prefix} has style-rule value channels.`),
        styleRuleInterpolationDataFlowEffect(`${prefix} has style interpolation data flow.`),
        stylePropertyTargetAccessEffect(`${prefix} has style-property target access.`),
        stylePropertyValueChannelEffect(`${prefix} has style-property value channels.`),
        stylePropertyDataFlowEffect(`${prefix} has style-property data flow.`),
      ]
      : []),
  ];
}

function stateClassEffect(summary: string, stateClassName: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'service-class', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
    ['role', 'state-source'],
    ['className', stateClassName],
  ));
}

function serviceClassEffect(summary: string, serviceClassName: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.discriminatorFact(summary, 'service-class', 'di', 'service', 'present', null, expectedSemanticEffectFilters(
    ['role', 'service-source'],
    ['className', serviceClassName],
  ));
}

function dataTableComputedObserverSourceEffect(
  summary: string,
  className: string,
  memberName: string,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'computed-observer-source', 'di', 'state-model', 'present', null, expectedSemanticEffectFilters(
    ['className', className],
    ['memberName', memberName],
    ['observerKind', 'computed-observer'],
    ['triggerKind', 'accessor-descriptor'],
    ['dependencyMode', 'proxy-auto-track'],
  ));
}

function dataTableRowGetterNames(
  options: DataTableStateExpectedEffectsOptions,
): Required<Pick<DataTableStateExpectedEffectsOptions, 'filteredRowsGetterName' | 'sortedRowsGetterName' | 'pageRowsGetterName' | 'rowCollectionGetterName'>> {
  const featureProfile = dataTableFeatureProfile(options);
  const filteredRowsGetterName = options.filteredRowsGetterName ?? 'filteredUsers';
  const sortedRowsGetterName = options.sortedRowsGetterName ?? 'sortedUsers';
  const pageRowsGetterName = options.pageRowsGetterName ?? 'pageUsers';
  return {
    filteredRowsGetterName,
    sortedRowsGetterName,
    pageRowsGetterName,
    rowCollectionGetterName: options.rowCollectionGetterName ?? searchableDataTableRowsGetterName({
      filteredCollectionGetterName: filteredRowsGetterName,
      sortedCollectionGetterName: sortedRowsGetterName,
      pageCollectionGetterName: pageRowsGetterName,
    }, featureProfile),
  };
}

function dataTableFeatureProfile(
  options: Pick<DataTableStateExpectedEffectsOptions, 'tableFeatureProfile'>,
): SearchableDataTableFeatureProfile {
  return options.tableFeatureProfile ?? {
    hasFacetFilters: true,
    hasSortControls: true,
    hasPaginationControls: true,
    hasSelectionControls: true,
    hasCheckedSelectionChannel: true,
    hasTableStyleBindings: true,
  };
}

function dataTableStateCompositionSummary(featureProfile: SearchableDataTableFeatureProfile): string {
  const names = [
    'filter',
    ...(featureProfile.hasSortControls ? ['sort'] : []),
    ...(featureProfile.hasPaginationControls ? ['pagination'] : []),
    ...(featureProfile.hasSelectionControls ? ['selection'] : []),
  ];
  if (names.length === 1) {
    return names[0]!;
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function directRowsObservedDependencyEffect(
  summary: string,
  rowsGetterName: string,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-observed-dependency', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', `state.${rowsGetterName}`],
    ['dependencyKind', 'template-expression-read'],
  ));
}

function directSortColumnObservedDependencyEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-observed-dependency', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', 'state.sort.column'],
    ['sourceRootName', 'state'],
    ['dependencyKind', 'template-expression-read'],
  ));
}

function directFilterObservedDependencyEffect(summary: string): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'binding-observed-dependency', 'template', 'template-binding', 'present', null, expectedSemanticEffectFilters(
    ['sourceName', 'state.filters.searchQuery'],
    ['sourceRootName', 'state'],
    ['dependencyKind', 'template-expression-read'],
  ));
}
