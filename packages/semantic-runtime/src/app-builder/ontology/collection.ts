import {
  APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
  APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION,
  APP_BUILDER_COLLECTION_IDENTITY_INPUT_SELECTION,
  APP_BUILDER_COLLECTION_QUERY_INPUT_SELECTION,
  APP_BUILDER_COLLECTION_TABLE_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
  AppBuilderInputContractId,
  type AppBuilderInputFacetSelection,
} from './input.js';
import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  appBuilderOntologyStatus,
  type AppBuilderOntologyStatus,
} from './status.js';

/** Collection concept ids for app-builder read-only ontology. */
export enum AppBuilderCollectionConceptId {
  /** Collection source shape: items, optional identity, status, selection, and totals. */
  CollectionSource = 'collection-source',
  /** Local client-side collection query before server-backed query complexity. */
  LocalCollectionQuery = 'local-collection-query',
  /** Service/server-backed query contract for later scaling rungs. */
  ServiceBackedCollectionQuery = 'service-backed-collection-query',
  /** Field projection used by lists, cards, and tables. */
  CollectionFieldProjection = 'collection-field-projection',
  /** Table column with explicit sorting/filtering/display metadata. */
  TableColumn = 'table-column',
  /** Local sorting rung for collection table/list query state. */
  LocalSorting = 'local-sorting',
  /** Local filtering/search rung for collection query state. */
  LocalFiltering = 'local-filtering',
  /** Local pagination rung before service/server query. */
  LocalPagination = 'local-pagination',
  /** Row selection and batch action state. */
  RowSelection = 'row-selection',
}

/** Stable value list for collection-concept transport schemas. */
export const APP_BUILDER_COLLECTION_CONCEPT_IDS = [
  AppBuilderCollectionConceptId.CollectionSource,
  AppBuilderCollectionConceptId.LocalCollectionQuery,
  AppBuilderCollectionConceptId.ServiceBackedCollectionQuery,
  AppBuilderCollectionConceptId.CollectionFieldProjection,
  AppBuilderCollectionConceptId.TableColumn,
  AppBuilderCollectionConceptId.LocalSorting,
  AppBuilderCollectionConceptId.LocalFiltering,
  AppBuilderCollectionConceptId.LocalPagination,
  AppBuilderCollectionConceptId.RowSelection,
] as const;

/** How a collection item identity is represented when a feature needs stable identity. */
export enum AppBuilderCollectionIdentityMode {
  /** Use runtime object identity; suitable for simple local repeats and close domain/view-model boundaries. */
  ObjectIdentity = 'object-identity',
  /** Use one scalar domain field as the stable item key. */
  ScalarField = 'scalar-field',
  /** Use multiple domain fields together as the stable item key. */
  CompositeFields = 'composite-fields',
  /** Use a caller-supplied key expression or helper when field identity is not enough. */
  CallerSuppliedKey = 'caller-supplied-key',
}

/** Stable value list for collection identity mode transport schemas. */
export const APP_BUILDER_COLLECTION_IDENTITY_MODES = [
  AppBuilderCollectionIdentityMode.ObjectIdentity,
  AppBuilderCollectionIdentityMode.ScalarField,
  AppBuilderCollectionIdentityMode.CompositeFields,
  AppBuilderCollectionIdentityMode.CallerSuppliedKey,
] as const;

/** Feature pressure that can require collection identity to become explicit. */
export enum AppBuilderCollectionIdentityUse {
  /** Explicit keyed-repeat source such as `key.bind` or an equivalent future repeat key. */
  ExplicitKeyedRepeat = 'explicit-keyed-repeat',
  /** Row/item selection state that must survive presentation changes. */
  RowSelection = 'row-selection',
  /** Batch actions over selected rows/items. */
  BatchAction = 'batch-action',
  /** Edit-buffer, dirty-state, reset, undo, or commit mechanics. */
  EditBuffer = 'edit-buffer',
  /** State carried across routes, pages, reloads, or persisted client storage. */
  CrossPageState = 'cross-page-state',
  /** Route parameter, href/load instruction, or route-context boundary selecting an item. */
  RouteBoundary = 'route-boundary',
}

/** Stable value list for collection identity use transport schemas. */
export const APP_BUILDER_COLLECTION_IDENTITY_USES = [
  AppBuilderCollectionIdentityUse.ExplicitKeyedRepeat,
  AppBuilderCollectionIdentityUse.RowSelection,
  AppBuilderCollectionIdentityUse.BatchAction,
  AppBuilderCollectionIdentityUse.EditBuffer,
  AppBuilderCollectionIdentityUse.CrossPageState,
  AppBuilderCollectionIdentityUse.RouteBoundary,
] as const;

/** Caller-selectable collection feature ids, distinct from internal gradual-ascent rungs. */
export enum AppBuilderCollectionFeatureId {
  /** Basic repeated presentation with no query controls. */
  BasicPresentation = 'basic-presentation',
  /** Explicit field projection for list, card, or table display. */
  DisplayProjection = 'display-projection',
  /** Table-specific column presentation. */
  TableColumns = 'table-columns',
  /** Local in-memory sorting over selected fields or columns. */
  LocalSorting = 'local-sorting',
  /** Local in-memory filtering or search. */
  LocalFiltering = 'local-filtering',
  /** Local in-memory pagination. */
  LocalPagination = 'local-pagination',
  /** Row/item selection state. */
  RowSelection = 'row-selection',
  /** Batch actions over selected rows/items. */
  BatchActions = 'batch-actions',
  /** Explicit service filter methods plus component query controls before full server-query contracts. */
  ServiceFiltering = 'service-filtering',
  /** Full service or server-backed collection query over filtering, sorting, paging, and totals. */
  ServiceBackedQuery = 'service-backed-query',
}

/** Stable value list for collection feature-selection payload schemas. */
export const APP_BUILDER_COLLECTION_FEATURE_IDS = [
  AppBuilderCollectionFeatureId.BasicPresentation,
  AppBuilderCollectionFeatureId.DisplayProjection,
  AppBuilderCollectionFeatureId.TableColumns,
  AppBuilderCollectionFeatureId.LocalSorting,
  AppBuilderCollectionFeatureId.LocalFiltering,
  AppBuilderCollectionFeatureId.LocalPagination,
  AppBuilderCollectionFeatureId.RowSelection,
  AppBuilderCollectionFeatureId.BatchActions,
  AppBuilderCollectionFeatureId.ServiceFiltering,
  AppBuilderCollectionFeatureId.ServiceBackedQuery,
] as const;

/** Caller-supplied collection feature selection carried by the CollectionQueryFeatures input facet. */
export interface AppBuilderCollectionQueryFeatureSelectionPayload {
  /** Collection feature selected by caller, AI, public preset, or composition. */
  readonly featureId: AppBuilderCollectionFeatureId;
  /** Domain fields affected by this feature when applicable, such as sortable or searchable fields. */
  readonly fieldNames?: readonly string[];
  /** Domain actions affected by this feature when applicable, such as batch actions. */
  readonly actionNames?: readonly string[];
  /** Explicit page size for local pagination; omitted means pagination cannot lower source yet. */
  readonly pageSize?: number;
  /** Optional initial one-based page number for local pagination source. */
  readonly initialPage?: number;
  /** Whether generated source should enable this feature immediately rather than merely leave space for it. */
  readonly initiallyEnabled?: boolean;
  /** Caller-authored explanation for AI/tooling; not source generation by itself. */
  readonly summary?: string;
}

/** Gradual ascent rung for collection features. */
export enum AppBuilderCollectionFeatureRung {
  /** Basic repeated presentation with no query controls. */
  BasicPresentation = 'basic-presentation',
  /** Local sorting over an in-memory collection. */
  LocalSort = 'local-sort',
  /** Local filtering or search over an in-memory collection. */
  LocalFilter = 'local-filter',
  /** Local pagination over an in-memory collection. */
  LocalPagination = 'local-pagination',
  /** Selection and batch actions. */
  Selection = 'selection',
  /** Server or service-backed query contract. */
  ServiceQuery = 'service-query',
}

/** Read-only descriptor for one caller-selectable collection feature value. */
export interface AppBuilderCollectionFeatureRow {
  /** Caller-selectable collection feature id. */
  readonly id: AppBuilderCollectionFeatureId;
  /** Gradual-ascent rung where this feature belongs. */
  readonly rung: AppBuilderCollectionFeatureRung;
  /** Short display title. */
  readonly title: string;
  /** What this feature asks the collection substrate to coordinate. */
  readonly summary: string;
  /** Collection concepts that become relevant when this feature is selected. */
  readonly conceptIds: readonly AppBuilderCollectionConceptId[];
  /** Identity pressures introduced by this feature. */
  readonly identityUseIds: readonly AppBuilderCollectionIdentityUse[];
  /** Whether this feature is modeled, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Caller-facing collection feature descriptors used by detail queries and input explanations. */
export const APP_BUILDER_COLLECTION_FEATURE_ROWS: readonly AppBuilderCollectionFeatureRow[] = [
  {
    id: AppBuilderCollectionFeatureId.BasicPresentation,
    rung: AppBuilderCollectionFeatureRung.BasicPresentation,
    title: 'Basic Presentation',
    summary: 'Repeat and display collection items without query controls or explicit stable identity.',
    conceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.CollectionFieldProjection,
    ],
    identityUseIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable through collection list/card/table composition after caller supplies collection expression, item local, and display projection inputs.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.DisplayProjection,
    rung: AppBuilderCollectionFeatureRung.BasicPresentation,
    title: 'Display Projection',
    summary: 'Explicitly map fields to list, card, or table presentation roles.',
    conceptIds: [AppBuilderCollectionConceptId.CollectionFieldProjection],
    identityUseIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable by collection list/card/table composition as field-backed display fragments; not a standalone source-lowering target.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.TableColumns,
    rung: AppBuilderCollectionFeatureRung.BasicPresentation,
    title: 'Table Columns',
    summary: 'Provide table-specific headers, accessors, and display kinds before query rungs are added.',
    conceptIds: [AppBuilderCollectionConceptId.TableColumn],
    identityUseIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable by collection-table composition after caller supplies explicit table columns.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.LocalSorting,
    rung: AppBuilderCollectionFeatureRung.LocalSort,
    title: 'Local Sorting',
    summary: 'Sort an in-memory collection over selected fields or table columns.',
    conceptIds: [
      AppBuilderCollectionConceptId.LocalCollectionQuery,
      AppBuilderCollectionConceptId.LocalSorting,
    ],
    identityUseIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable by collection-table composition only as explicit sortable-column handler wiring; app-builder still does not invent sort state, method names, row selection, batch actions, or service-backed query contracts.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.LocalFiltering,
    rung: AppBuilderCollectionFeatureRung.LocalFilter,
    title: 'Local Filtering',
    summary: 'Filter or search an in-memory collection before service-backed query contracts are needed.',
    conceptIds: [
      AppBuilderCollectionConceptId.LocalCollectionQuery,
      AppBuilderCollectionConceptId.LocalFiltering,
    ],
    identityUseIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable by collection-table composition when filterable columns, CollectionQueryFeatures, explicit filterBindingExpressions, and local view-model query state are supplied.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.LocalPagination,
    rung: AppBuilderCollectionFeatureRung.LocalPagination,
    title: 'Local Pagination',
    summary: 'Page larger in-memory collections without implying a server-backed query boundary.',
    conceptIds: [
      AppBuilderCollectionConceptId.LocalCollectionQuery,
      AppBuilderCollectionConceptId.LocalPagination,
    ],
    identityUseIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable by local view-model state plus collection-table composition when CollectionQueryFeatures.pageSize and explicit pagination control request fields are supplied.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.RowSelection,
    rung: AppBuilderCollectionFeatureRung.Selection,
    title: 'Row Selection',
    summary: 'Track selected items separately from presentation so selection can survive display changes.',
    conceptIds: [AppBuilderCollectionConceptId.RowSelection],
    identityUseIds: [AppBuilderCollectionIdentityUse.RowSelection],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable for first-ring local scalar-field row selection when CollectionQueryFeatures, CollectionIdentityPolicy, and explicit table checked/toggle/label request fields are supplied. Composite/caller-key identity, cross-page selection, and batch actions remain deferred.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.BatchActions,
    rung: AppBuilderCollectionFeatureRung.Selection,
    title: 'Batch Actions',
    summary: 'Invoke actions over selected items after selection and identity policy are explicit.',
    conceptIds: [AppBuilderCollectionConceptId.RowSelection],
    identityUseIds: [
      AppBuilderCollectionIdentityUse.RowSelection,
      AppBuilderCollectionIdentityUse.BatchAction,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable for first-ring local collection-scoped batch buttons when RowSelection, scalar CollectionIdentityPolicy, and explicit batchActionControls are supplied. Select-all, service/cross-page selection, and richer batch semantics remain deferred.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.ServiceFiltering,
    rung: AppBuilderCollectionFeatureRung.ServiceQuery,
    title: 'Service Filtering',
    summary: 'Route explicit collection filter controls through generated service methods and component query-state reload source.',
    conceptIds: [AppBuilderCollectionConceptId.ServiceBackedCollectionQuery],
    identityUseIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Spendable through component-pair service collection filterMethods, queryStates, and matching DomainCommandAction query-state invocations. This is a narrow in-memory service-boundary rung; it does not imply remote fetch, sorting, pagination, totals, caching, retries, or full server-query contracts.',
    }),
  },
  {
    id: AppBuilderCollectionFeatureId.ServiceBackedQuery,
    rung: AppBuilderCollectionFeatureRung.ServiceQuery,
    title: 'Service-Backed Query',
    summary: 'Move collection query state across a service/server boundary for filtering, sorting, paging, totals, and loading state.',
    conceptIds: [AppBuilderCollectionConceptId.ServiceBackedCollectionQuery],
    identityUseIds: [AppBuilderCollectionIdentityUse.CrossPageState],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Deferred full service/server query feature. Use ServiceFiltering for the current narrow generated service filter/query-state rung; this broader row remains blocked on explicit server-query contracts for sorting, pagination, totals, remote fetch, caching, retries, and lifecycle policy.',
    }),
  },
];

/** Read-only collection concept row. */
export interface AppBuilderCollectionConceptRow {
  /** Stable collection concept id. */
  readonly id: AppBuilderCollectionConceptId;
  /** Collection feature rung where this concept first becomes relevant. */
  readonly rung: AppBuilderCollectionFeatureRung;
  /** Short display title. */
  readonly title: string;
  /** What this concept contributes to generated/read app structure. */
  readonly summary: string;
  /** Input contracts that should feed this concept. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Relevant facets for those contracts when the whole contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
  /** Whether this concept is modeled, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Initial collection concept terrain for list/card/table app-builder work. */
export const APP_BUILDER_COLLECTION_CONCEPT_ROWS: readonly AppBuilderCollectionConceptRow[] = [
  {
    id: AppBuilderCollectionConceptId.CollectionSource,
    rung: AppBuilderCollectionFeatureRung.BasicPresentation,
    title: 'Collection Source',
    summary: 'A typed item collection plus optional identity, status, total, selection, and query state as features demand them.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.CollectionProjection,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderCollectionConceptId.LocalCollectionQuery,
    rung: AppBuilderCollectionFeatureRung.LocalSort,
    title: 'Local Collection Query',
    summary: 'In-memory sort/filter/search state before service-backed query contracts are needed.',
    inputContractIds: [AppBuilderInputContractId.CollectionProjection],
    inputFacetSelections: [
      APP_BUILDER_COLLECTION_QUERY_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderCollectionConceptId.ServiceBackedCollectionQuery,
    rung: AppBuilderCollectionFeatureRung.ServiceQuery,
    title: 'Service-Backed Collection Query',
    summary: 'Deferred query contract for server/service-backed filtering, sorting, paging, totals, and loading state.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.CollectionProjection,
      AppBuilderInputContractId.AureliaPolicy,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_QUERY_INPUT_SELECTION,
      APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderCollectionConceptId.CollectionFieldProjection,
    rung: AppBuilderCollectionFeatureRung.BasicPresentation,
    title: 'Collection Field Projection',
    summary: 'Maps entity fields to title, summary, status, date, number, boolean, or relation display roles.',
    inputContractIds: [AppBuilderInputContractId.CollectionProjection],
    inputFacetSelections: [APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderCollectionConceptId.TableColumn,
    rung: AppBuilderCollectionFeatureRung.BasicPresentation,
    title: 'Table Column',
    summary: 'Table-specific projection with header, accessor, display kind, and later sort/filter metadata.',
    inputContractIds: [AppBuilderInputContractId.CollectionProjection],
    inputFacetSelections: [APP_BUILDER_COLLECTION_TABLE_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderCollectionConceptId.LocalSorting,
    rung: AppBuilderCollectionFeatureRung.LocalSort,
    title: 'Local Sorting',
    summary: 'First query rung for sortable columns or fields, before filtering and paging add more state.',
    inputContractIds: [AppBuilderInputContractId.CollectionProjection],
    inputFacetSelections: [APP_BUILDER_COLLECTION_QUERY_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderCollectionConceptId.LocalFiltering,
    rung: AppBuilderCollectionFeatureRung.LocalFilter,
    title: 'Local Filtering',
    summary: 'Search/filter state over local collections; useful early, but should not be conflated with server query semantics.',
    inputContractIds: [AppBuilderInputContractId.CollectionProjection],
    inputFacetSelections: [APP_BUILDER_COLLECTION_QUERY_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderCollectionConceptId.LocalPagination,
    rung: AppBuilderCollectionFeatureRung.LocalPagination,
    title: 'Local Pagination',
    summary: 'Local page state for larger in-memory collections; a stepping stone before server-backed query contracts.',
    inputContractIds: [AppBuilderInputContractId.CollectionProjection],
    inputFacetSelections: [APP_BUILDER_COLLECTION_QUERY_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderCollectionConceptId.RowSelection,
    rung: AppBuilderCollectionFeatureRung.Selection,
    title: 'Row Selection',
    summary: 'Selection state; stable identity becomes important here even when basic repeat did not need it, and batch actions build on it later.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.CollectionProjection,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_IDENTITY_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_QUERY_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Concept drill-down for row selection; narrow source lowering exists on the concrete RowSelection feature and CollectionTable/LocalViewModelState surfaces, while batch actions and richer selection policies remain separate deferred feature rows.',
    }),
  },
];
