import {
  type AuthoringSourcePatternAdaptationGroup,
  type AuthoringSourcePatternModule,
  type AuthoringSourcePatternParameter,
  recipeSourcePattern,
  referenceInstantiationSourcePattern,
  sourcePatternAdaptationGroup,
  sourcePatternParameter,
} from './source-plan.js';
import {
  routedSourcePatternDetailRouteParameter,
  routedSourcePatternIdentityGroup,
  routedSourcePatternListRoutePath,
} from './route-source-pattern.js';
import { SourcePatternModules } from './source-pattern-modules.js';
import type { RoutedSearchableDataTableSourcePlanModel } from './routed-searchable-data-table-source-plan.js';
import type { SearchableDataTableSourcePlanModel } from './searchable-data-table-source-plan.js';
import {
  type SearchableDataTableFeatureProfile,
  searchableDataTableFieldSchemaHasOptionDomains,
  searchableDataTableFieldSchemaOptionParameterValue,
  searchableDataTableUsesReferencePresentation,
} from './searchable-data-table-field-schema.js';

type TablePatternModel = Pick<SearchableDataTableSourcePlanModel, 'tableDomain' | 'tableFieldSchema' | 'tableFeatureProfile'>;

export function searchableDataTableSourcePattern(
  model: SearchableDataTableSourcePlanModel,
) {
  if (!searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)) {
    return recipeSourcePattern(
      'searchable-data-table.compact-starter',
      tablePatternTitle(model, 'table'),
      `A low-boilerplate DI-owned table/list state, service boundary, keyed rows, getter-observed derived projection, and ${tableFeatureSummary(model.tableFeatureProfile)}.`,
      'caller-applied',
      'none',
      [
        'Use this source as a caller-shaped starter when the requested feature is only a searchable list/table over one collection.',
        'Replace starter seed records with real service data when the app already has a backend or repository boundary.',
        'Add sort, pagination, selection, facet filters, or presentation files only when the feature goal asks for them.',
      ],
      starterTablePatternParameters(model, 'table'),
      searchableTableModules(model),
      [starterTableDomainSchemaGroup(model, tableFieldDescription(model))],
      'recommendable-recipe',
      'starter-sample-data',
      'production-terse',
    );
  }
  return referenceInstantiationSourcePattern(
    'searchable-data-table.reference-instantiation',
    tablePatternTitle(model, 'table'),
    `A complete reference instantiation of a DI-owned table state, service boundary, keyed rows, getter-observed derived projections, and ${tableFeatureSummary(model.tableFeatureProfile)}.`,
    [
      'Treat row class, table component, service names, field names, and sample records as replaceable defaults for a caller-specific entity and table.',
      'Keep the state/service/template value-channel shape when adapting the domain; do not copy sample data or presentation CSS unless that domain and design are intended.',
      'Use selected sourceFilePaths to inspect one file shape at a time; the reusable recipe is the table-state and binding architecture, not the sample vocabulary.',
    ],
    'reference-presentation',
    tablePatternParameters(model, 'table'),
    searchableTableModules(model),
    [tableDomainSchemaGroup(model, tableFieldDescription(model), 'sample records')],
  );
}

export function routedSearchableDataTableSourcePattern(model: RoutedSearchableDataTableSourcePlanModel) {
  if (!searchableDataTableUsesReferencePresentation(model.tableFeatureProfile)) {
    return recipeSourcePattern(
      'routed-searchable-data-table.compact-starter',
      tablePatternTitle(model, 'routed-table'),
      `A low-boilerplate routed list/detail starter with RouterConfiguration, list/detail routes, route parameter selection, DI-owned table/list state, data-driven row navigation, and ${tableFeatureSummary(model.tableFeatureProfile)}.`,
      'caller-applied',
      'none',
      [
        'Use this source as a caller-shaped starter when the requested feature is a routed searchable list/detail over one collection.',
        'Keep route-owned identity, DI-owned state, and table value channels together; add extra controls only when the feature goal asks for them.',
        'Replace starter seed records with real service data when the app already has a backend or repository boundary.',
      ],
      starterRoutedTablePatternParameters(model),
      routedSearchableTableModules(model),
      [
        routedSourcePatternIdentityGroup(),
        starterTableDomainSchemaGroup(model, tableFieldDescription(model)),
      ],
      'recommendable-recipe',
      'starter-sample-data',
      'production-terse',
    );
  }
  return referenceInstantiationSourcePattern(
    'routed-searchable-data-table.reference-instantiation',
    tablePatternTitle(model, 'routed-table'),
    `A complete reference instantiation of the table-state pattern plus RouterConfiguration, list/detail routes, au-viewport layout, route parameter selection, data-driven row navigation, and ${tableFeatureSummary(model.tableFeatureProfile)}.`,
    [
      'Treat row class, route IDs, detail parameter names, field names, and sample records as replaceable defaults for the caller list/detail entity.',
      'Keep route-owned identity and table-state value channels when adapting; do not split routing and table state into unrelated examples when the feature needs both.',
      'Treat CSS and sample table copy as fixture presentation rather than recipe ontology.',
    ],
    'reference-presentation',
    routedTablePatternParameters(model),
    routedSearchableTableModules(model),
    [
      routedSourcePatternIdentityGroup(),
      tableDomainSchemaGroup(model, tableFieldDescription(model), 'sample records, detail copy'),
    ],
  );
}

function tableBehaviorModules(
  model: TablePatternModel,
): readonly AuthoringSourcePatternModule[] {
  return [
    SourcePatternModules.DiStateBoundary,
    SourcePatternModules.StateComposition,
    SourcePatternModules.StateOwnedServiceBoundary,
    SourcePatternModules.ServiceBackedLoading,
    SourcePatternModules.DomainClassModel,
    SourcePatternModules.CollectionControls,
    SourcePatternModules.SearchFilterControls,
    ...(model.tableFeatureProfile.hasSortControls ? [SourcePatternModules.SortControls] : []),
    ...(model.tableFeatureProfile.hasPaginationControls ? [SourcePatternModules.PaginationControls] : []),
    ...(model.tableFeatureProfile.hasSelectionControls ? [SourcePatternModules.SelectionSetControls] : []),
    SourcePatternModules.NativeFormValueChannels,
    SourcePatternModules.NativeTextValueChannel,
    ...(model.tableFeatureProfile.hasCheckedSelectionChannel ? [SourcePatternModules.CheckedCollectionChannel] : []),
    ...(model.tableFeatureProfile.hasFacetFilters && searchableDataTableFieldSchemaHasOptionDomains(model.tableFieldSchema)
      ? [SourcePatternModules.SelectOptionModelChannel]
      : []),
    SourcePatternModules.ListRendering,
    SourcePatternModules.TemplateControllerFlow,
    ...(model.tableFeatureProfile.hasTableStyleBindings ? [SourcePatternModules.ClassStyleChannels] : []),
  ];
}

function searchableTableModules(model: TablePatternModel): readonly AuthoringSourcePatternModule[] {
  return [
    SourcePatternModules.AppShell,
    ...tableBehaviorModules(model),
  ];
}

function routedSearchableTableModules(model: TablePatternModel): readonly AuthoringSourcePatternModule[] {
  return [
    SourcePatternModules.AppShell,
    SourcePatternModules.RouterShell,
    SourcePatternModules.RouteContextSelection,
    SourcePatternModules.RouteParameterSelection,
    SourcePatternModules.RouteLinkNavigation,
    ...tableBehaviorModules(model),
  ];
}

function tableFeatureSummary(featureProfile: SearchableDataTableFeatureProfile): string {
  const features = [
    'search filtering',
    ...(featureProfile.hasFacetFilters ? ['facet filters'] : []),
    ...(featureProfile.hasSortControls ? ['sort controls'] : []),
    ...(featureProfile.hasPaginationControls ? ['pagination controls'] : []),
    ...(featureProfile.hasSelectionControls ? ['selection controls'] : []),
    ...(featureProfile.hasTableStyleBindings ? ['class/style table channels'] : []),
  ];
  return features.join(', ');
}

function tablePatternTitle(
  model: TablePatternModel,
  variant: 'table' | 'routed-table',
): string {
  const featureProfile = model.tableFeatureProfile;
  const prefix = variant === 'routed-table' ? 'Routed ' : '';
  if (featureProfile.hasFacetFilters && featureProfile.hasSortControls) {
    return `${prefix}search/filter/sort table pattern`;
  }
  if (featureProfile.hasFacetFilters) {
    return `${prefix}search/filter table pattern`;
  }
  if (featureProfile.hasSortControls) {
    return `${prefix}search/sort table pattern`;
  }
  return `${prefix}searchable table/list starter pattern`;
}

function tableFieldDescription(model: TablePatternModel): string {
  const featureProfile = model.tableFeatureProfile;
  if (featureProfile.hasFacetFilters && featureProfile.hasSortControls) {
    return 'filter/sort fields';
  }
  if (featureProfile.hasFacetFilters) {
    return 'search/filter fields';
  }
  if (featureProfile.hasSortControls) {
    return 'search/sort fields';
  }
  return 'search fields';
}

function routedTablePatternParameters(
  model: RoutedSearchableDataTableSourcePlanModel,
): readonly AuthoringSourcePatternParameter[] {
  return [
    tableEntity(model, 'routed-table'),
    tableCollection(model, 'routed-table'),
    routedSourcePatternDetailRouteParameter(model),
    routedSourcePatternListRoutePath(model),
    listRouteTitle(model),
    tableFilterFields(model, 'routed-table'),
    ...tableOptions(model),
    tableSampleData('routed-table'),
    tablePresentation('routed-table'),
  ];
}

function starterRoutedTablePatternParameters(
  model: RoutedSearchableDataTableSourcePlanModel,
): readonly AuthoringSourcePatternParameter[] {
  return [
    tableEntity(model, 'routed-table'),
    tableCollection(model, 'routed-table'),
    routedSourcePatternDetailRouteParameter(model),
    routedSourcePatternListRoutePath(model),
    listRouteTitle(model),
    tableFilterFields(model, 'routed-table'),
    ...tableOptions(model),
    tableSampleData('routed-table'),
  ];
}

function tablePatternParameters(
  model: TablePatternModel,
  variant: 'table' | 'routed-table',
): readonly AuthoringSourcePatternParameter[] {
  return [
    tableEntity(model, variant),
    tableCollection(model, variant),
    tableFilterFields(model, variant),
    ...tableOptions(model),
    tableSampleData(variant),
    tablePresentation(variant),
  ];
}

function starterTablePatternParameters(
  model: TablePatternModel,
  variant: 'table' | 'routed-table',
): readonly AuthoringSourcePatternParameter[] {
  return [
    tableEntity(model, variant),
    tableCollection(model, variant),
    tableFilterFields(model, variant),
    ...tableOptions(model),
    tableSampleData(variant),
  ];
}

function tableOptions(
  model: TablePatternModel,
): readonly AuthoringSourcePatternParameter[] {
  if (!searchableDataTableFieldSchemaHasOptionDomains(model.tableFieldSchema)) {
    return [];
  }
  return [
    sourcePatternParameter(
      'table-options',
      'domain-collection',
      'Table option domains',
      searchableDataTableFieldSchemaOptionParameterValue(model.tableFieldSchema) ?? 'status: Active, Inactive, Pending',
      'Replace select/filter option values and labels while preserving table value-channel, filter-state, service-record, and display-label semantics.',
      'source-text-input',
      'option-schema-list',
    ),
  ];
}

function tableEntity(
  model: TablePatternModel,
  variant: 'table' | 'routed-table',
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'table-entity',
    'domain-entity',
    variant === 'routed-table' ? 'Table/detail entity' : 'Table row entity',
    model.tableDomain.entityTitle,
    variant === 'routed-table'
      ? 'Rename the row/detail class and core collection identity; field schema and derived labels still move through the table-domain-schema adaptation group.'
      : 'Rename the row class and core collection identity; field schema and derived labels still move through the table-domain-schema adaptation group.',
    'source-text-input',
    'domain-title',
  );
}

function tableCollection(
  model: TablePatternModel,
  variant: 'table' | 'routed-table',
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'table-collection',
    'domain-collection',
    'Table collection state',
    model.tableDomain.collectionPropertyName,
    tableCollectionSummary(model, variant),
    'source-text-input',
    'source-member-name',
  );
}

function tableCollectionSummary(
  model: TablePatternModel,
  variant: 'table' | 'routed-table',
): string {
  const preservedShape = [
    'DI-owned loading',
    'search state',
    ...(model.tableFeatureProfile.hasFacetFilters ? ['facet filter state'] : []),
    ...(model.tableFeatureProfile.hasSortControls ? ['sort state'] : []),
    ...(model.tableFeatureProfile.hasPaginationControls ? ['page state'] : []),
  ].join(', ');
  return variant === 'routed-table'
    ? `Adapt collection/state/service names while preserving ${preservedShape}, and routeable list/detail views.`
    : `Adapt collection/state/service names while preserving ${preservedShape}, and repeated row bindings.`;
}

function tableFilterFields(
  model: TablePatternModel,
  variant: 'table' | 'routed-table',
): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'table-filter-fields',
    'field-schema',
    tableFieldParameterTitle(model),
    model.tableFieldSchema.sourceParameterValue,
    tableFieldParameterSummary(model, variant),
    'source-text-input',
    'field-schema-list',
  );
}

function tableFieldParameterTitle(model: TablePatternModel): string {
  const featureProfile = model.tableFeatureProfile;
  if (featureProfile.hasFacetFilters && featureProfile.hasSortControls) {
    return 'Filter and sort fields';
  }
  if (featureProfile.hasFacetFilters) {
    return 'Search and filter fields';
  }
  if (featureProfile.hasSortControls) {
    return 'Search and sort fields';
  }
  return 'Search fields';
}

function tableFieldParameterSummary(
  model: TablePatternModel,
  variant: 'table' | 'routed-table',
): string {
  const generatedParts = [
    'row fields',
    'search state',
    ...(model.tableFeatureProfile.hasFacetFilters ? ['facet filter state'] : []),
    ...(model.tableFeatureProfile.hasSortControls ? ['sortable columns'] : []),
    'service records',
    variant === 'routed-table' ? 'table/detail cells' : 'table cells',
    ...(model.tableFeatureProfile.hasFacetFilters ? ['table value-channel coverage'] : ['search binding coverage']),
  ];
  return `Generate ${generatedParts.join(', ')} from caller fields.`;
}

function tableSampleData(variant: 'table' | 'routed-table'): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'table-sample-data',
    'sample-data',
    'Reference table records',
    'reference table records',
    variant === 'routed-table'
      ? 'Replace all sample records, route copy, labels, and placeholder text before emitting caller-specific code.'
      : 'Replace all sample records, emails, labels, and placeholder text before emitting caller-specific code.',
    'advisory-only',
    'sample-data-summary',
  );
}

function tablePresentation(variant: 'table' | 'routed-table'): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'table-presentation',
    'presentation',
    variant === 'routed-table' ? 'Reference routed table presentation' : 'Reference table presentation',
    variant === 'routed-table' ? 'table-shell/data-table/detail-card CSS' : 'table-shell/data-table CSS',
    'Treat generated layout and colors as fixture presentation unless the caller wants the reference look.',
    'advisory-only',
    'presentation-summary',
  );
}

function listRouteTitle(model: RoutedSearchableDataTableSourcePlanModel): AuthoringSourcePatternParameter {
  return sourcePatternParameter(
    'list-route-title',
    'feature-copy',
    'List route title',
    model.listRouteTitle,
    'Rename the list route title and navigation label without changing the table-state architecture.',
    'source-text-input',
    'route-title',
  );
}

function tableDomainSchemaGroup(
  model: TablePatternModel,
  fieldDescription: string,
  sampleDescription: string,
): AuthoringSourcePatternAdaptationGroup {
  const optionKeys = searchableDataTableFieldSchemaHasOptionDomains(model.tableFieldSchema)
    ? ['table-options']
    : [];
  return sourcePatternAdaptationGroup(
    'table-domain-schema',
    'Table domain schema',
    `Row entity, collection state, source-applicable ${fieldDescription}, ${sampleDescription}, and reference presentation move together; a table-entity value alone is not enough for caller-specific source generation.`,
    ['table-entity', 'table-collection', 'table-filter-fields', ...optionKeys, 'table-sample-data', 'table-presentation'],
  );
}

function starterTableDomainSchemaGroup(
  model: TablePatternModel,
  fieldDescription: string,
): AuthoringSourcePatternAdaptationGroup {
  const optionKeys = searchableDataTableFieldSchemaHasOptionDomains(model.tableFieldSchema)
    ? ['table-options']
    : [];
  return sourcePatternAdaptationGroup(
    'table-domain-schema',
    'Table domain schema',
    `Row entity, collection state, source-applicable ${fieldDescription}, and starter records move together; a table-entity value alone is not enough for caller-specific source generation.`,
    ['table-entity', 'table-collection', 'table-filter-fields', ...optionKeys, 'table-sample-data'],
  );
}
