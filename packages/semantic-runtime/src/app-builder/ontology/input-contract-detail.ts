import {
  APP_BUILDER_DOMAIN_ACTION_KINDS,
  APP_BUILDER_DOMAIN_ACTION_SCOPES,
  APP_BUILDER_DOMAIN_FIELD_AFFORDANCES,
  APP_BUILDER_DOMAIN_FIELD_VALUE_KINDS,
  APP_BUILDER_DOMAIN_IDENTITY_VALUE_KINDS,
  APP_BUILDER_DOMAIN_RELATIONSHIP_LOCAL_VALUE_KINDS,
  APP_BUILDER_DOMAIN_RELATIONSHIP_KINDS,
} from '../domain-model.js';
import {
  AppBuilderAppStateOwnershipMode,
  AppBuilderAreaNavigationPolicy,
  AppBuilderConventionPolicy,
  AppBuilderCustomElementDomEncapsulationMode,
  AppBuilderCustomElementStylePolicy,
  AppBuilderCustomElementViewForm,
  AppBuilderDomainModelingMode,
  AppBuilderLocalStatePolicy,
  AppBuilderPackageCapability,
  AppBuilderResourceCarrier,
  AppBuilderRouterAdmissionPolicy,
} from '../aurelia-lowering-option.js';
import {
  APP_BUILDER_COLLECTION_FEATURE_IDS,
  APP_BUILDER_COLLECTION_IDENTITY_MODES,
  APP_BUILDER_COLLECTION_IDENTITY_USES,
} from './collection.js';
import {
  APP_BUILDER_COLLECTION_DISPLAY_ROLES,
  APP_BUILDER_COLLECTION_TABLE_COLUMN_DISPLAY_KINDS,
} from './collection-projection.js';
import {
  APP_BUILDER_INPUT_CONTRACT_ROWS,
  APP_BUILDER_INPUT_FACET_ROWS,
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
  appBuilderInputFacetIdsByContractId,
  type AppBuilderInputFacetSelection,
  type AppBuilderInputContractRow,
  type AppBuilderInputFacetRow,
} from './input.js';
import {
  appBuilderSourceLoweringConsumersForInputFacet,
  type AppBuilderInputFacetSourceLoweringConsumerRow,
} from './input-source-lowering-consumers.js';
import {
  appBuilderInputFacetValueSourceLoweringSupportRows,
  type AppBuilderInputFacetValueSourceLoweringSupportRow,
} from './input-facet-value-support.js';
import {
  appBuilderEnumValues,
  appBuilderHasExplicitSelection,
  appBuilderIncludeDetail,
} from './detail-helpers.js';
import {
  SourcePlanBuildToolPolicy,
  SourcePlanPackageDependencyScope,
  SourcePlanPackageManager,
  SourcePlanProjectToolingFileKind,
  SourcePlanProjectToolingLanguage,
} from '../../source-plan/package-tooling.js';
import {
  SourcePatternParameterKey,
  SourcePlanTextAuthority,
} from '../../source-plan/source-plan.js';
import {
  APP_BUILDER_SOURCE_LOWERING_VISUAL_HOOK_TARGETS,
} from './source-lowering-inputs.js';
import {
  SemanticAppQueryKind,
} from '../../api/contracts.js';

/** Small schema vocabulary used to explain app-builder input payloads without owning a full JSON Schema engine. */
export enum AppBuilderInputPayloadSchemaKind {
  /** Null value. */
  Null = 'null',
  /** Plain string value. */
  String = 'string',
  /** String value constrained by a named regular-expression pattern. */
  PatternString = 'pattern-string',
  /** Boolean true/false value. */
  Boolean = 'boolean',
  /** Numeric scalar value. */
  Number = 'number',
  /** One of an explicit enum value set. */
  Enum = 'enum',
  /** One of several explicitly declared schema variants. */
  Union = 'union',
  /** Object with named properties. */
  Object = 'object',
  /** Object with dynamic property keys and homogeneous value schema. */
  Record = 'record',
  /** Array with homogeneous item schema. */
  Array = 'array',
}

/** Stable value list for input payload schema kind transport schemas. */
export const APP_BUILDER_INPUT_PAYLOAD_SCHEMA_KINDS = [
  AppBuilderInputPayloadSchemaKind.Null,
  AppBuilderInputPayloadSchemaKind.String,
  AppBuilderInputPayloadSchemaKind.PatternString,
  AppBuilderInputPayloadSchemaKind.Boolean,
  AppBuilderInputPayloadSchemaKind.Number,
  AppBuilderInputPayloadSchemaKind.Enum,
  AppBuilderInputPayloadSchemaKind.Union,
  AppBuilderInputPayloadSchemaKind.Object,
  AppBuilderInputPayloadSchemaKind.Record,
  AppBuilderInputPayloadSchemaKind.Array,
] as const;

/** Maturity of the payload schema for one input facet. */
export enum AppBuilderInputPayloadSchemaState {
  /** The facet has a concrete schema grounded in current app-builder substrate. */
  Modeled = 'modeled',
  /** The facet exists, but the payload shape still needs ontology work. */
  ToBeDetermined = 'to-be-determined',
  /** The facet belongs to a later feature ring. */
  Deferred = 'deferred',
  /** The facet is supplied by semantic-runtime app facts, not caller-authored payload. */
  NotCallerPayload = 'not-caller-payload',
}

/** Stable value list for input payload schema state transport schemas. */
export const APP_BUILDER_INPUT_PAYLOAD_SCHEMA_STATES = [
  AppBuilderInputPayloadSchemaState.Modeled,
  AppBuilderInputPayloadSchemaState.ToBeDetermined,
  AppBuilderInputPayloadSchemaState.Deferred,
  AppBuilderInputPayloadSchemaState.NotCallerPayload,
] as const;

/** Why one app-world query is useful for a deterministic existing-app fact facet. */
export enum AppBuilderExistingAppFactQueryPurpose {
  /** Discover concrete resource definitions, bindables, dependencies, and declaration modes. */
  ResourceDefinitionCatalog = 'resource-definition-catalog',
  /** Discover compiler-world visibility and scope for resources or syntax resources. */
  ResourceScopeVisibility = 'resource-scope-visibility',
  /** Discover authored native/control uses and their value/accessibility/action channels. */
  ControlUseInventory = 'control-use-inventory',
  /** Discover route topology, routeable components, viewports, and route parameters. */
  RouteTopology = 'route-topology',
  /** Discover optional plugin-specific products or diagnostics without generating plugin architecture. */
  PluginProductSurface = 'plugin-product-surface',
}

/** Stable value list for existing-app fact query purposes. */
export const APP_BUILDER_EXISTING_APP_FACT_QUERY_PURPOSES = [
  AppBuilderExistingAppFactQueryPurpose.ResourceDefinitionCatalog,
  AppBuilderExistingAppFactQueryPurpose.ResourceScopeVisibility,
  AppBuilderExistingAppFactQueryPurpose.ControlUseInventory,
  AppBuilderExistingAppFactQueryPurpose.RouteTopology,
  AppBuilderExistingAppFactQueryPurpose.PluginProductSurface,
] as const;

/** How app-builder may use a deterministic existing-app query result. */
export enum AppBuilderExistingAppFactUseKind {
  /** Report what exists so the caller/AI can decide whether it fits. */
  ReportAvailability = 'report-availability',
  /** Inform an explicit app-builder policy choice without selecting that policy by itself. */
  InformPolicySelection = 'inform-policy-selection',
  /** Mark a boundary where app-builder should hand off to the caller/AI instead of lowering source. */
  HandoffBoundary = 'handoff-boundary',
}

/** Stable value list for existing-app fact use kinds. */
export const APP_BUILDER_EXISTING_APP_FACT_USE_KINDS = [
  AppBuilderExistingAppFactUseKind.ReportAvailability,
  AppBuilderExistingAppFactUseKind.InformPolicySelection,
  AppBuilderExistingAppFactUseKind.HandoffBoundary,
] as const;

/** Public app query that supplies one deterministic existing-app fact facet. */
export interface AppBuilderExistingAppFactQueryRow {
  /** Existing-app input facet supplied by this app-world query. */
  readonly inputFacetId: AppBuilderInputFacetId;
  /** Public semantic-runtime app query that produces the fact rows. */
  readonly queryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  /** Why this query belongs to the facet. */
  readonly purpose: AppBuilderExistingAppFactQueryPurpose;
  /** How app-builder may use the facts without inventing intent. */
  readonly useKind: AppBuilderExistingAppFactUseKind;
  /** Compact explanation for MCP/AI callers. */
  readonly summary: string;
}

/** One property in the compact app-builder input payload schema vocabulary. */
export interface AppBuilderInputPayloadPropertySchema {
  /** Property name expected in the payload object. */
  readonly name: string;
  /** Whether the property is required for this schema level. */
  readonly required: boolean;
  /** Property value schema. */
  readonly schema: AppBuilderInputPayloadSchema;
  /** Compact explanation of the property. */
  readonly summary?: string;
}

/** Compact read-only input payload schema for AI/MCP callers. */
export interface AppBuilderInputPayloadSchema {
  /** Schema kind. */
  readonly kind: AppBuilderInputPayloadSchemaKind;
  /** Short display title. */
  readonly title: string;
  /** Compact explanation of what this payload value represents. */
  readonly summary: string;
  /** Allowed values when kind is enum. */
  readonly enumValues?: readonly string[];
  /** JavaScript regular expression source when kind is pattern-string. */
  readonly pattern?: string;
  /** Human-readable explanation of the pattern-string constraint. */
  readonly patternSummary?: string;
  /** Schema variants when kind is union. */
  readonly variants?: readonly AppBuilderInputPayloadSchema[];
  /** Object properties when kind is object. */
  readonly properties?: readonly AppBuilderInputPayloadPropertySchema[];
  /** Dynamic record value schema when kind is record. */
  readonly valueSchema?: AppBuilderInputPayloadSchema;
  /** Array item schema when kind is array. */
  readonly items?: AppBuilderInputPayloadSchema;
}

/** Filter request for input contract detail rows and their payload schemas. */
export interface AppBuilderInputContractDetailRequest {
  /** Include only these input contracts; omitted returns all compact contract/facet rows. */
  readonly inputContractIds?: readonly AppBuilderInputContractId[] | null;
  /** Include only these input facets; omitted means all facets owned by returned contracts. */
  readonly inputFacetIds?: readonly AppBuilderInputFacetId[] | null;
  /** Include only selected facets per input contract; contracts without a selection stay whole when inputContractIds names them. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[] | null;
  /** Include only facets with these payload schema states. */
  readonly payloadSchemaStates?: readonly AppBuilderInputPayloadSchemaState[] | null;
  /** Include concrete payload schemas where modeled; defaults to true only for filtered/selected detail. */
  readonly includePayloadSchemas?: boolean | null;
  /** Include target rows that consume returned facets through executable source-lowering targets. */
  readonly includeSourceLoweringConsumers?: boolean | null;
  /** Include value-level source-lowering support rows for enum-like facet payload values. */
  readonly includeSourceLoweringValueSupport?: boolean | null;
  /** Include app-world query rows that supply deterministic existing-app fact facets. */
  readonly includeExistingAppFactQueries?: boolean | null;
}

/** Detail row for one fine-grained input facet. */
export interface AppBuilderInputFacetDetailRow {
  /** The input facet row from the app-builder ontology. */
  readonly facet: AppBuilderInputFacetRow;
  /** Whether this facet has a modeled payload schema, is TBD, deferred, or app-fact supplied. */
  readonly payloadSchemaState: AppBuilderInputPayloadSchemaState;
  /** Concrete payload schema when modeled and requested. */
  readonly payloadSchema?: AppBuilderInputPayloadSchema;
  /** Number of executable source-lowering targets that consume this input facet. */
  readonly sourceLoweringConsumerCount: number;
  /** Source-lowering targets that consume this facet when consumer detail is requested. */
  readonly sourceLoweringConsumerRows?: readonly AppBuilderInputFacetSourceLoweringConsumerRow[];
  /** Number of source-lowering support rows for enum-like values inside this facet. */
  readonly sourceLoweringValueSupportCount: number;
  /** Source-lowering support rows for enum-like values inside this facet when requested. */
  readonly sourceLoweringValueSupportRows?: readonly AppBuilderInputFacetValueSourceLoweringSupportRow[];
  /** Number of app-world query families that can supply this deterministic existing-app fact facet. */
  readonly existingAppFactQueryCount: number;
  /** App-world query families that can supply this deterministic existing-app fact facet when detail is requested. */
  readonly existingAppFactQueryRows?: readonly AppBuilderExistingAppFactQueryRow[];
  /** Compact explanation for caller/AI negotiation. */
  readonly summary: string;
}

/** Detail row for one input contract and its selected facets. */
export interface AppBuilderInputContractDetailRow {
  /** The input contract row from the app-builder ontology. */
  readonly inputContract: AppBuilderInputContractRow;
  /** Selected fine-grained facet detail rows. */
  readonly inputFacets: readonly AppBuilderInputFacetDetailRow[];
}

/** Read-only detail result that tells callers what missing app-builder input should look like. */
export interface AppBuilderInputContractDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Returned input contract detail rows. */
  readonly rows: readonly AppBuilderInputContractDetailRow[];
  /** Whether concrete payload schemas were included when modeled. */
  readonly payloadSchemasIncluded: boolean;
  /** Whether source-lowering consumer target rows were included for returned facets. */
  readonly sourceLoweringConsumersIncluded: boolean;
  /** Whether value-level source-lowering support rows were included for returned facets. */
  readonly sourceLoweringValueSupportIncluded: boolean;
  /** Whether existing-app fact query rows were included for returned facets. */
  readonly existingAppFactQueriesIncluded: boolean;
  /** Number of selected facet details. */
  readonly facetCount: number;
  /** Number of selected facet details consumed by at least one executable source-lowering target. */
  readonly sourceLoweringConsumerFacetCount: number;
  /** Number of unique executable source-lowering targets that consume returned facets. */
  readonly sourceLoweringConsumerTargetCount: number;
  /** Number of selected facet details that expose value-level source-lowering support rows. */
  readonly sourceLoweringValueSupportFacetCount: number;
  /** Number of value-level source-lowering support rows across selected facets. */
  readonly sourceLoweringValueSupportRowCount: number;
  /** Number of selected app-fact facets with app-world query suppliers. */
  readonly existingAppFactQueryFacetCount: number;
  /** Number of app-world query supplier rows across selected app-fact facets. */
  readonly existingAppFactQueryRowCount: number;
  /** Number of selected facet details with modeled payload schemas. */
  readonly modeledPayloadSchemaCount: number;
  /** Number of selected facet details whose payload schema is still TBD. */
  readonly toBeDeterminedCount: number;
  /** Number of selected facet details belonging to deferred feature rings. */
  readonly deferredCount: number;
  /** Number of selected facet details supplied by semantic-runtime app facts rather than caller payload. */
  readonly notCallerPayloadCount: number;
}

type AppBuilderInputFacetPayloadDetail = Omit<
  AppBuilderInputFacetDetailRow,
  | 'facet'
  | 'sourceLoweringConsumerCount'
  | 'sourceLoweringConsumerRows'
  | 'sourceLoweringValueSupportCount'
  | 'sourceLoweringValueSupportRows'
  | 'existingAppFactQueryCount'
  | 'existingAppFactQueryRows'
>;

const INPUT_FACETS_BY_CONTRACT_ID = APP_BUILDER_INPUT_FACET_ROWS.reduce(
  (map, facet) => {
    const existing = map.get(facet.contractId) ?? [];
    map.set(facet.contractId, [...existing, facet]);
    return map;
  },
  new Map<AppBuilderInputContractId, readonly AppBuilderInputFacetRow[]>(),
);

/** Return input contract details and compact payload schemas without lowering source. */
export function appBuilderInputContractDetail(
  request: AppBuilderInputContractDetailRequest = {},
): AppBuilderInputContractDetail {
  const hasExplicitSelection = appBuilderHasExplicitSelection(
    request.inputContractIds,
    request.inputFacetIds,
    request.inputFacetSelections,
    request.payloadSchemaStates,
  );
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const includeSourceLoweringConsumers = appBuilderIncludeDetail(
    request.includeSourceLoweringConsumers,
    hasExplicitSelection,
  );
  const includeSourceLoweringValueSupport = appBuilderIncludeDetail(
    request.includeSourceLoweringValueSupport,
    hasExplicitSelection,
  );
  const includeExistingAppFactQueries = appBuilderIncludeDetail(
    request.includeExistingAppFactQueries,
    hasExplicitSelection,
  );
  const inputFacetSelections = request.inputFacetSelections == null || request.inputFacetSelections.length === 0
    ? null
    : request.inputFacetSelections;
  const contractIds = request.inputContractIds == null || request.inputContractIds.length === 0
    ? inputFacetSelections == null
      ? null
      : new Set(inputFacetSelections.map((selection) => selection.inputContractId))
    : new Set(request.inputContractIds);
  const facetIdsByContractId = appBuilderInputFacetIdsByContractId(inputFacetSelections);
  const facetIds = request.inputFacetIds == null || request.inputFacetIds.length === 0
    ? null
    : new Set(request.inputFacetIds);
  const payloadSchemaStates = request.payloadSchemaStates == null || request.payloadSchemaStates.length === 0
    ? null
    : new Set(request.payloadSchemaStates);
  const facetFilterApplied = facetIdsByContractId != null || facetIds != null || payloadSchemaStates != null;
  const rows = APP_BUILDER_INPUT_CONTRACT_ROWS
    .filter((contract) => contractIds == null || contractIds.has(contract.id))
    .map((contract): AppBuilderInputContractDetailRow => ({
      inputContract: contract,
      inputFacets: (INPUT_FACETS_BY_CONTRACT_ID.get(contract.id) ?? [])
        .filter((facet) => {
          const selectedForContract = facetIdsByContractId?.get(contract.id);
          return (selectedForContract == null || selectedForContract.includes(facet.id))
            && (facetIds == null || facetIds.has(facet.id));
        })
        .map((facet) =>
          appBuilderInputFacetDetail(
            facet,
            includePayloadSchemas,
            includeSourceLoweringConsumers,
            includeSourceLoweringValueSupport,
            includeExistingAppFactQueries,
          )
        )
        .filter((detail) => payloadSchemaStates == null || payloadSchemaStates.has(detail.payloadSchemaState)),
    }))
    .filter((row) => row.inputFacets.length > 0 || !facetFilterApplied);
  const facetDetails = rows.flatMap((row) => row.inputFacets);
  const modeledPayloadSchemaCount = facetDetails.filter((detail) =>
    detail.payloadSchemaState === AppBuilderInputPayloadSchemaState.Modeled
  ).length;
  const toBeDeterminedCount = facetDetails.filter((detail) =>
    detail.payloadSchemaState === AppBuilderInputPayloadSchemaState.ToBeDetermined
  ).length;
  const deferredCount = facetDetails.filter((detail) =>
    detail.payloadSchemaState === AppBuilderInputPayloadSchemaState.Deferred
  ).length;
  const notCallerPayloadCount = facetDetails.filter((detail) =>
    detail.payloadSchemaState === AppBuilderInputPayloadSchemaState.NotCallerPayload
  ).length;
  const sourceLoweringConsumerFacetCount = facetDetails.filter((detail) =>
    detail.sourceLoweringConsumerCount > 0
  ).length;
  const sourceLoweringConsumerTargetKeys = new Set(facetDetails.flatMap((detail) =>
    appBuilderInputFacetDetailConsumerTargetKeys(detail)
  ));
  const sourceLoweringValueSupportFacetCount = facetDetails.filter((detail) =>
    detail.sourceLoweringValueSupportCount > 0
  ).length;
  const sourceLoweringValueSupportRowCount = facetDetails.reduce((sum, detail) =>
    sum + detail.sourceLoweringValueSupportCount, 0);
  const existingAppFactQueryFacetCount = facetDetails.filter((detail) =>
    detail.existingAppFactQueryCount > 0
  ).length;
  const existingAppFactQueryRowCount = facetDetails.reduce((sum, detail) =>
    sum + detail.existingAppFactQueryCount, 0);
  return {
    rows,
    payloadSchemasIncluded: includePayloadSchemas,
    sourceLoweringConsumersIncluded: includeSourceLoweringConsumers,
    sourceLoweringValueSupportIncluded: includeSourceLoweringValueSupport,
    existingAppFactQueriesIncluded: includeExistingAppFactQueries,
    facetCount: facetDetails.length,
    sourceLoweringConsumerFacetCount,
    sourceLoweringConsumerTargetCount: sourceLoweringConsumerTargetKeys.size,
    sourceLoweringValueSupportFacetCount,
    sourceLoweringValueSupportRowCount,
    existingAppFactQueryFacetCount,
    existingAppFactQueryRowCount,
    modeledPayloadSchemaCount,
    toBeDeterminedCount,
    deferredCount,
    notCallerPayloadCount,
    displayText: `App-builder input contract detail: ${rows.length} contract(s), ${facetDetails.length} facet(s), ${modeledPayloadSchemaCount} modeled payload schema(s), ${toBeDeterminedCount} TBD, ${deferredCount} deferred, ${notCallerPayloadCount} app-fact supplied, sourceLoweringConsumerFacets=${sourceLoweringConsumerFacetCount}, sourceLoweringConsumerTargets=${sourceLoweringConsumerTargetKeys.size}, sourceLoweringValueSupportFacets=${sourceLoweringValueSupportFacetCount}, sourceLoweringValueSupportRows=${sourceLoweringValueSupportRowCount}, existingAppFactQueryFacets=${existingAppFactQueryFacetCount}, existingAppFactQueryRows=${existingAppFactQueryRowCount}${includePayloadSchemas ? '' : '; payloadSchemas=false'}${includeSourceLoweringConsumers ? '' : '; sourceLoweringConsumers=false'}${includeSourceLoweringValueSupport ? '' : '; sourceLoweringValueSupport=false'}${includeExistingAppFactQueries ? '' : '; existingAppFactQueries=false'}.`,
  };
}

/** Return payload detail for one input facet without walking the whole input-contract detail query. */
export function appBuilderInputFacetDetail(
  facet: AppBuilderInputFacetRow,
  includePayloadSchema: boolean,
  includeSourceLoweringConsumers = false,
  includeSourceLoweringValueSupport = false,
  includeExistingAppFactQueries = false,
): AppBuilderInputFacetDetailRow {
  const detail = facetDetail(facet);
  const sourceLoweringConsumerRows = appBuilderSourceLoweringConsumersForInputFacet(facet);
  const sourceLoweringValueSupportRows = appBuilderInputFacetValueSourceLoweringSupportRows(facet);
  const existingAppFactQueryRows = appBuilderExistingAppFactQueryRowsForInputFacet(facet);
  return {
    facet,
    payloadSchemaState: detail.payloadSchemaState,
    ...(includePayloadSchema && detail.payloadSchema != null
      ? { payloadSchema: detail.payloadSchema }
      : {}),
    sourceLoweringConsumerCount: sourceLoweringConsumerRows.length,
    ...(includeSourceLoweringConsumers
      ? { sourceLoweringConsumerRows }
      : {}),
    sourceLoweringValueSupportCount: sourceLoweringValueSupportRows.length,
    ...(includeSourceLoweringValueSupport
      ? { sourceLoweringValueSupportRows }
      : {}),
    existingAppFactQueryCount: existingAppFactQueryRows.length,
    ...(includeExistingAppFactQueries
      ? { existingAppFactQueryRows }
      : {}),
    summary: detail.summary,
  };
}

/** Return app-world query families that can supply deterministic existing-app fact facets. */
export function appBuilderExistingAppFactQueryRowsForInputFacet(
  facet: AppBuilderInputFacetRow,
): readonly AppBuilderExistingAppFactQueryRow[] {
  switch (facet.id) {
    case AppBuilderInputFacetId.ExistingResourceFacts:
      return [
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.ResourceDefinitions,
          AppBuilderExistingAppFactQueryPurpose.ResourceDefinitionCatalog,
          AppBuilderExistingAppFactUseKind.ReportAvailability,
          'Reports detected custom elements, custom attributes, template controllers, value converters, binding behaviors, binding commands, bindables, aliases, declaration modes, and local dependencies.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.ResourceVisibility,
          AppBuilderExistingAppFactQueryPurpose.ResourceScopeVisibility,
          AppBuilderExistingAppFactUseKind.ReportAvailability,
          'Reports which resources are visible in each compiler world, including local, inherited, configured, and routeable scope visibility.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.ControlUseInventory,
          AppBuilderExistingAppFactQueryPurpose.ControlUseInventory,
          AppBuilderExistingAppFactUseKind.ReportAvailability,
          'Reports authored native/control uses and their generated or existing value, action, label, and message channels.',
        ),
      ];
    case AppBuilderInputFacetId.ExistingRouteFacts:
      return [
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.RouterOverview,
          AppBuilderExistingAppFactQueryPurpose.RouteTopology,
          AppBuilderExistingAppFactUseKind.ReportAvailability,
          'Summarizes routes, route contexts, viewports, navigation, route trees, and router issues before app-builder extends a routed area.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.Routes,
          AppBuilderExistingAppFactQueryPurpose.RouteTopology,
          AppBuilderExistingAppFactUseKind.ReportAvailability,
          'Reports concrete route configuration rows, including route ids, paths, titles, and configured component references where modeled.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.RouteContexts,
          AppBuilderExistingAppFactQueryPurpose.RouteTopology,
          AppBuilderExistingAppFactUseKind.ReportAvailability,
          'Reports route-context products and parameter reads that can keep generated route-aware source aligned with existing routing facts.',
        ),
      ];
    case AppBuilderInputFacetId.ExistingPluginFacts:
      return [
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.StateStores,
          AppBuilderExistingAppFactQueryPurpose.PluginProductSurface,
          AppBuilderExistingAppFactUseKind.HandoffBoundary,
          'Reports modeled @aurelia/state stores when present; app-builder may report this availability but should not generate store architecture in the v1 handoff posture.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.I18nTranslationKeys,
          AppBuilderExistingAppFactQueryPurpose.PluginProductSurface,
          AppBuilderExistingAppFactUseKind.HandoffBoundary,
          'Reports modeled i18n translation keys when present; localization resources and generated translation copy remain caller/plugin owned for v1.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.I18nTranslationBindings,
          AppBuilderExistingAppFactQueryPurpose.PluginProductSurface,
          AppBuilderExistingAppFactUseKind.HandoffBoundary,
          'Reports modeled i18n translation bindings when present; app-builder should treat localization integration as explicit existing-app/plugin context.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.ValidationIssues,
          AppBuilderExistingAppFactQueryPurpose.PluginProductSurface,
          AppBuilderExistingAppFactUseKind.InformPolicySelection,
          'Reports validation-library diagnostics when semantic-runtime models them; absence of issues is not proof that validation is unavailable.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.FetchClientIssues,
          AppBuilderExistingAppFactQueryPurpose.PluginProductSurface,
          AppBuilderExistingAppFactUseKind.InformPolicySelection,
          'Reports fetch-client diagnostics when semantic-runtime models them; server/API contracts and fetch-client configuration remain handoff territory for v1.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.DialogIssues,
          AppBuilderExistingAppFactQueryPurpose.PluginProductSurface,
          AppBuilderExistingAppFactUseKind.InformPolicySelection,
          'Reports dialog diagnostics when semantic-runtime models them; dialog source generation is not part of the current app-builder v1 floor.',
        ),
        existingAppFactQueryRow(
          facet.id,
          SemanticAppQueryKind.FrameworkCapabilityDemands,
          AppBuilderExistingAppFactQueryPurpose.PluginProductSurface,
          AppBuilderExistingAppFactUseKind.InformPolicySelection,
          'Reports authored framework/plugin capability demands, registration admission, and package/import evidence; absence of issue rows is not proof that a plugin capability is unavailable.',
        ),
      ];
    default:
      return [];
  }
}

function existingAppFactQueryRow(
  inputFacetId: AppBuilderInputFacetId,
  queryKind: SemanticAppQueryKind,
  purpose: AppBuilderExistingAppFactQueryPurpose,
  useKind: AppBuilderExistingAppFactUseKind,
  summary: string,
): AppBuilderExistingAppFactQueryRow {
  return {
    inputFacetId,
    queryKind,
    purpose,
    useKind,
    summary,
  };
}

function appBuilderInputFacetDetailConsumerTargetKeys(
  detail: AppBuilderInputFacetDetailRow,
): readonly string[] {
  const rows = detail.sourceLoweringConsumerRows ?? appBuilderSourceLoweringConsumersForInputFacet(detail.facet);
  return rows.map((row) =>
    `${row.targetRef.kind}\0${row.targetRef.domain}\0${row.targetRef.id}`
  );
}

function facetDetail(
  facet: AppBuilderInputFacetRow,
): AppBuilderInputFacetPayloadDetail {
  switch (facet.id) {
    case AppBuilderInputFacetId.DomainEntities:
      return modeled('Entity names and collection names supplied by caller, AI, or public preset.', entityIdentitySchema());
    case AppBuilderInputFacetId.DomainFields:
      return modeled('Field schema used by controls, collection projections, seed records, and source lowerers.', domainFieldSchema());
    case AppBuilderInputFacetId.DomainValueSets:
      return modeled('Finite option domains used by choice controls and choice-like fields.', domainValueSetSchema());
    case AppBuilderInputFacetId.DomainRelationships:
      return modeled('Relationship payloads describe references, ownership, and nested value objects before source lowerers decide how to realize them.', domainRelationshipSchema());
    case AppBuilderInputFacetId.DomainActions:
      return modeled('Action payloads describe user/domain commands before source lowerers decide event, service, state, or route realization.', domainActionSchema());
    case AppBuilderInputFacetId.DomainValidationRules:
      return deferred('Validation rule input is deferred until validation generation and diagnostics share one contract.');
    case AppBuilderInputFacetId.SourceRoot:
      return modeled('Target root or source area where generated files or fragments would be placed.', stringSchema('Source Root', 'Project-relative or absolute source root/area selected by the caller or existing app fact.'));
    case AppBuilderInputFacetId.SourceTargetPath:
      return modeled('Concrete artifact path where a SourcePlan preview or write plan should place one generated file.', stringSchema('Source Target Path', 'Project-relative generated file path such as src/create-task.html.'));
    case AppBuilderInputFacetId.SourceNaming:
      return modeled('App/source naming input grounded in source-name derivation and source-pattern parameter values.', sourceNamingSchema());
    case AppBuilderInputFacetId.SourceFileLayout:
      return modeled('Custom-element view/source layout choices that current lowerers can name.', sourceFileLayoutSchema());
    case AppBuilderInputFacetId.SourceProjectTooling:
      return modeled('Package/build tooling input grounded in SourcePlanProjectTooling, not ordinary app source files.', sourceProjectToolingSchema());
    case AppBuilderInputFacetId.AureliaConventionPolicy:
      return modeled('App-global convention admission choice.', enumSchema('Convention Policy', 'Whether generated source may rely on Aurelia conventions.', appBuilderEnumValues(AppBuilderConventionPolicy)));
    case AppBuilderInputFacetId.AureliaRoutingPolicy:
      return modeled('Router admission and area-local navigation choices.', routingPolicySchema());
    case AppBuilderInputFacetId.AureliaStatePolicy:
      return modeled('State ownership, local-state, and domain-modeling choices.', statePolicySchema());
    case AppBuilderInputFacetId.AureliaStylingPolicy:
      return modeled('Style mechanism choices separated from visual taste.', stylingPolicySchema());
    case AppBuilderInputFacetId.AureliaPluginPolicy:
      return modeled('Optional plugin admission choices; many plugin-specific source lowerers remain deferred or handoff-only.', pluginPolicySchema());
    case AppBuilderInputFacetId.ExistingResourceFacts:
    case AppBuilderInputFacetId.ExistingRouteFacts:
    case AppBuilderInputFacetId.ExistingPluginFacts:
      return notCallerPayload('Existing app facts should come from semantic-runtime app analysis, not arbitrary caller payload.');
    case AppBuilderInputFacetId.SeedRecordSet:
      return modeled('Seed records are domain-shaped dynamic records validated against the selected domain descriptor.', seedRecordSetSchema());
    case AppBuilderInputFacetId.SeedDensityPurpose:
      return deferred('Seed density/purpose selection is deferred until public seed presets or defaulting bundles consume it. Current source lowerers spend explicit SeedRecordSet payloads only.');
    case AppBuilderInputFacetId.VisualTokens:
    case AppBuilderInputFacetId.VisualCssFragments:
    case AppBuilderInputFacetId.VisualDesignSystemReference:
      return tbd('Visual/style payload names and fields are intentionally left open until design-tooling policy is settled.');
    case AppBuilderInputFacetId.VisualClassHooks:
      return modeled('Class and data hooks supplied by caller/AI and carried by source lowerers without inventing CSS.', visualClassHooksSchema());
    case AppBuilderInputFacetId.CollectionDisplayFields:
      return modeled('Projection roles for list, card, and table presentation.', collectionDisplayFieldSchema());
    case AppBuilderInputFacetId.CollectionTableColumns:
      return modeled('Table-specific column metadata when table presentation is selected.', collectionTableColumnSchema());
    case AppBuilderInputFacetId.CollectionQueryFeatures:
      return modeled('Collection query and presentation features selected by caller or composition.', collectionQueryFeatureSelectionSchema());
    case AppBuilderInputFacetId.CollectionIdentityPolicy:
      return modeled('Identity policy is feature-driven: simple repeats may use object identity, while selection, routes, edit buffers, and keyed repeats may require stable keys.', collectionIdentityPolicySchema());
    case AppBuilderInputFacetId.AccessibilityLabels:
      return modeled('Labels and descriptions needed for controls and field groups.', accessibilityLabelsSchema());
    case AppBuilderInputFacetId.AccessibilityHelpError:
      return modeled('Help/error/status message relationships for controls and forms.', accessibilityHelpErrorSchema());
    case AppBuilderInputFacetId.AccessibilityInteraction:
      return deferred('APG-grade keyboard/focus/ARIA interaction contracts are a later rich-control feature ring.');
    case AppBuilderInputFacetId.ActionFeedback:
      return modeled('Action feedback payloads tie a selected domain action to explicit status state and user-visible status copy.', actionFeedbackSchema());
  }
}

function modeled(
  summary: string,
  payloadSchema: AppBuilderInputPayloadSchema,
): AppBuilderInputFacetPayloadDetail {
  return {
    payloadSchemaState: AppBuilderInputPayloadSchemaState.Modeled,
    payloadSchema,
    summary,
  };
}

function tbd(
  summary: string,
): AppBuilderInputFacetPayloadDetail {
  return {
    payloadSchemaState: AppBuilderInputPayloadSchemaState.ToBeDetermined,
    summary,
  };
}

function deferred(
  summary: string,
): AppBuilderInputFacetPayloadDetail {
  return {
    payloadSchemaState: AppBuilderInputPayloadSchemaState.Deferred,
    summary,
  };
}

function notCallerPayload(
  summary: string,
): AppBuilderInputFacetPayloadDetail {
  return {
    payloadSchemaState: AppBuilderInputPayloadSchemaState.NotCallerPayload,
    summary,
  };
}

function entityIdentitySchema(): AppBuilderInputPayloadSchema {
  const entitySchema = entityIdentityObjectSchema();
  return unionSchema('Domain Entity Identity Input', 'One primary domain entity, or an array of entity identities when a generated app spends relationships across entities.', [
    entitySchema,
    arraySchema('Domain Entity Identities', 'Array of domain entity identities for relationship-aware generated apps.', entitySchema),
  ]);
}

function entityIdentityObjectSchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Domain Entity Identity', 'Names for the primary entity/collection that generated TypeScript and templates can spend.', [
    property('entityTitle', true, stringSchema('Entity Title', 'Human-readable entity label, such as Support Ticket or Product Tier.')),
    property('entityTypeName', false, stringSchema('Entity Type Name', 'TypeScript-safe entity type/class name when the caller wants to override derivation.')),
    property('collectionMemberName', false, stringSchema('Collection Member Name', 'TypeScript-safe collection member/property name when the caller wants to override derivation.')),
    property('identityMemberName', false, stringSchema('Identity Member Name', 'Scalar identity member used by records, route params, or lookups when identity is needed.')),
    property('identityValueKind', false, enumSchema('Identity Value Kind', 'Explicit scalar identity type emitted by generated entity constructors and validated against seed records when identity is needed.', APP_BUILDER_DOMAIN_IDENTITY_VALUE_KINDS)),
  ]);
}

function domainFieldSchema(): AppBuilderInputPayloadSchema {
  return arraySchema('Domain Fields', 'Array of domain field descriptors.', objectSchema('Domain Field', 'One field available to controls, projections, seed data, and source lowerers.', [
    property('entityName', false, stringSchema('Entity Name', 'Entity type/name this field belongs to when DomainFields describes multiple entities.')),
    property('name', true, stringSchema('Field Name', 'TypeScript-safe property name.')),
    property('title', true, stringSchema('Field Title', 'Human-facing field label.')),
    property('valueKind', true, enumSchema('Field Value Kind', 'Field value kind supported by app-builder domain fields.', APP_BUILDER_DOMAIN_FIELD_VALUE_KINDS)),
    property('fieldAffordance', false, enumSchema('Field Affordance', 'Semantic field affordance used when text value kind alone is too broad, such as email, URL, phone, password, search, or temporal string controls.', APP_BUILDER_DOMAIN_FIELD_AFFORDANCES)),
    property('required', false, booleanSchema('Required', 'Whether the field should be treated as required by generated controls/data.')),
    property('defaultValue', false, seedRecordValueSchema(), 'Explicit empty/draft value emitted when generated source initializes this field; omitted fields use the current field-kind default.'),
    property('textConstraints', false, objectSchema('Text Constraints', 'Static text facts that native text-like controls can spend as required/minlength/maxlength/pattern attributes; these are not validation rules by themselves.', [
      property('minLength', false, numberSchema('Minimum Length', 'Static minimum character count for native text controls.')),
      property('maxLength', false, numberSchema('Maximum Length', 'Static maximum character count for native text controls.')),
      property('pattern', false, stringSchema('Pattern', 'Native pattern attribute value for simple field-local format constraints.')),
    ]), 'Only meaningful when valueKind is text and the selected control is text-like.'),
    property('numericConstraints', false, objectSchema('Numeric Constraints', 'Static numeric facts that native number/range controls can spend as min/max/step attributes; these are not validation rules by themselves.', [
      property('minimum', false, numberSchema('Minimum', 'Static lower bound for native numeric controls.')),
      property('maximum', false, numberSchema('Maximum', 'Static upper bound for native numeric controls.')),
      property('step', false, numberSchema('Step', 'Static step interval for native numeric controls.')),
    ]), 'Only meaningful when valueKind is number.'),
    property('valueSetName', false, stringSchema('Value Set Name', 'Named domain value set used when finite options are supplied independently from the field descriptor.')),
    property('optionTypeName', false, stringSchema('Option Type Name', 'TypeScript-safe alias name for one finite option value; useful when a choice-set field has a plural member name.')),
    property('options', false, arraySchema('Field Options', 'Finite option values for choice and choice-set fields.', objectSchema('Field Option', 'One finite option for a choice-like field.', [
      property('value', true, stringSchema('Option Value', 'Stable source/data value.')),
      property('title', true, stringSchema('Option Title', 'Human-facing option label.')),
    ])), 'Provide when the field owns a finite option domain; otherwise a source-lowering request must provide a value-domain expression or compatible value set before rendering a choice control.'),
  ]));
}

function domainValueSetSchema(): AppBuilderInputPayloadSchema {
  return arraySchema('Domain Value Sets', 'Array of finite value sets used by choice controls and choice-like fields.', objectSchema('Domain Value Set', 'One named option/value domain supplied by caller, AI, or public preset.', [
    property('name', true, stringSchema('Value Set Name', 'Stable value-set name in caller/app vocabulary.')),
    property('title', false, stringSchema('Value Set Title', 'Human-facing value-set label.')),
    property('valueKind', false, enumSchema('Value Kind', 'Primitive/domain value kind for option values.', APP_BUILDER_DOMAIN_FIELD_VALUE_KINDS)),
    property('options', true, arraySchema('Options', 'Finite options in this value set.', objectSchema('Value Set Option', 'One finite option value and label.', [
      property('value', true, stringSchema('Option Value', 'Stable source/data value.')),
      property('title', true, stringSchema('Option Title', 'Human-facing option label.')),
      property('summary', false, stringSchema('Option Summary', 'Optional caller-authored explanation for AI/tooling.')),
    ]))),
  ]));
}

function domainRelationshipSchema(): AppBuilderInputPayloadSchema {
  return arraySchema('Domain Relationships', 'Array of domain relationship descriptors for references, ownership, and nested value objects.', objectSchema('Domain Relationship', 'One relationship between domain entities or value objects.', [
    property('name', true, stringSchema('Relationship Name', 'Stable relationship name in caller/app vocabulary.')),
    property('title', false, stringSchema('Relationship Title', 'Human-facing relationship label when generated source renders the relationship.')),
    property('kind', true, enumSchema('Relationship Kind', 'Reference, ownership, or nested value-object relationship shape.', APP_BUILDER_DOMAIN_RELATIONSHIP_KINDS)),
    property('fromEntityName', false, stringSchema('From Entity Name', 'Source entity name when the domain has multiple entities.')),
    property('toEntityName', true, stringSchema('To Entity Name', 'Target entity or value-object name.')),
    property('localFieldName', false, stringSchema('Local Field Name', 'Local field that stores the relationship identity or value.')),
    property('localValueKind', false, enumSchema('Local Value Kind', 'Whether a reference relationship stores the related identity or the related domain object locally.', APP_BUILDER_DOMAIN_RELATIONSHIP_LOCAL_VALUE_KINDS)),
    property('foreignFieldName', false, stringSchema('Foreign Field Name', 'Related field referenced by the local field when scalar identity is used.')),
    property('displayFieldName', false, stringSchema('Display Field Name', 'Related field suitable for labels, cards, or table display.')),
    property('required', false, booleanSchema('Required', 'Whether generated UI/domain code should treat the relationship as required.')),
  ]));
}

function domainActionSchema(): AppBuilderInputPayloadSchema {
  return arraySchema('Domain Actions', 'Array of user/domain action descriptors for commands, forms, navigation, and integration boundaries.', objectSchema('Domain Action', 'One action the generated app may expose or wire.', [
    property('name', true, stringSchema('Action Name', 'Stable action name in caller/app vocabulary.')),
    property('kind', true, enumSchema('Action Kind', 'General action kind such as create, save, archive, assign, submit, refresh, or custom.', APP_BUILDER_DOMAIN_ACTION_KINDS)),
    property('scope', false, enumSchema('Action Scope', 'Primary scope where the action applies.', APP_BUILDER_DOMAIN_ACTION_SCOPES)),
    property('targetEntityName', false, stringSchema('Target Entity Name', 'Entity the action targets when applicable.')),
    property('inputFieldNames', false, arraySchema('Input Field Names', 'Domain field names the action reads or writes when applicable.', stringSchema('Input Field Name', 'One domain field name.'))),
    property('mutatesState', false, booleanSchema('Mutates State', 'Whether the action changes durable state rather than only navigating or refreshing.')),
    property('summary', false, stringSchema('Action Summary', 'Caller-authored explanation for AI/tooling; not source generation by itself.')),
  ]));
}

function sourceFileLayoutSchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Source File Layout', 'Source layout values current custom-element lowerers can name.', [
    property('resourceCarrier', false, enumSchema('Resource Carrier', 'Primary carrier that establishes a generated resource.', appBuilderEnumValues(AppBuilderResourceCarrier))),
    property('customElementViewForm', false, enumSchema('Custom Element View Form', 'Whether a generated custom element uses a companion template or inline markup.', appBuilderEnumValues(AppBuilderCustomElementViewForm))),
  ]);
}

function sourceNamingSchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Source Naming', 'Names that can be supplied before lowering, with source-pattern parameters carrying coordinated source rewrites.', [
    property('appName', false, stringSchema('App Name', 'User-facing app name spent by entrypoint/title/package baseline generation when source is emitted.')),
    property('baseName', false, stringSchema('Base Source Name', 'Human/source phrase that source-name.ts can split into PascalCase, lowerCamelCase, kebab-case, title, and related source forms.')),
    property('sourcePatternParameterValues', false, arraySchema('Source Pattern Parameter Values', 'Coordinated source-applicable parameter values declared by the selected SourcePattern.', objectSchema('Source Pattern Parameter Value', 'One value for a selected source pattern parameter.', [
      property('key', true, enumSchema('Source Pattern Parameter Key', 'Known source-pattern parameter key; only keys declared by the selected sourcePattern.parameters are applicable.', appBuilderEnumValues(SourcePatternParameterKey))),
      property('value', true, stringSchema('Source Pattern Parameter Value', 'Value validated against the selected parameter valueShape, such as route path or route parameter identifier.')),
    ]))),
  ]);
}

function sourceProjectToolingSchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Source Project Tooling', 'Package/build/tooling facts carried through SourcePlanProjectTooling when a source plan owns runnable project setup.', [
    property('packageManager', false, enumSchema('Package Manager', 'Package manager ownership for installation and script execution.', appBuilderEnumValues(SourcePlanPackageManager))),
    property('buildToolPolicy', false, enumSchema('Build Tool Policy', 'Whether build tooling is host-owned, not modeled, or follows a source-plan baseline.', appBuilderEnumValues(SourcePlanBuildToolPolicy))),
    property('dependencySpecifiers', false, arraySchema('Dependency Specifiers', 'Package specifiers that a source-plan helper can materialize into dependency rows.', stringSchema('Dependency Specifier', 'Package module specifier such as aurelia or @aurelia/router.'))),
    property('packageDependencies', false, arraySchema('Package Dependencies', 'Concrete package dependency rows when the caller or source-plan helper owns exact package metadata.', objectSchema('Package Dependency', 'One package.json dependency/devDependency row.', [
      property('specifier', true, stringSchema('Specifier', 'Package module specifier.')),
      property('versionRange', false, stringSchema('Version Range', 'Package version range when exact package metadata is supplied.')),
      property('scope', false, enumSchema('Dependency Scope', 'package.json dependency bucket.', appBuilderEnumValues(SourcePlanPackageDependencyScope))),
    ]))),
    property('scripts', false, arraySchema('Package Scripts', 'package.json scripts that belong to project tooling rather than app source.', objectSchema('Package Script', 'One package script entry.', [
      property('name', true, stringSchema('Script Name', 'package.json script key.')),
      property('command', true, stringSchema('Script Command', 'Command text for the script.')),
    ]))),
    property('toolingFiles', false, arraySchema('Tooling Files', 'Generated package/root-document/build-config/tsconfig/declaration artifacts carried beside app source files.', objectSchema('Project Tooling File', 'One project tooling file carried by SourcePlanProjectTooling.', [
      property('path', true, stringSchema('Path', 'Project-relative tooling file path.')),
      property('fileKind', true, enumSchema('File Kind', 'Kind of project tooling file.', appBuilderEnumValues(SourcePlanProjectToolingFileKind))),
      property('language', true, enumSchema('Language', 'Tooling file source language.', appBuilderEnumValues(SourcePlanProjectToolingLanguage))),
      property('textAuthority', false, enumSchema('Text Authority', 'Who owns concrete tooling file text when supplied or generated.', appBuilderEnumValues(SourcePlanTextAuthority))),
    ]))),
  ]);
}

function routingPolicySchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Routing Policy', 'App-global router admission plus area-local navigation policy.', [
    property('routerAdmission', true, enumSchema('Router Admission', 'Whether the generated app admits router configuration.', appBuilderEnumValues(AppBuilderRouterAdmissionPolicy))),
    property('areaNavigationPolicies', false, arraySchema('Area Navigation Policies', 'Area-local navigation composition choices.', enumSchema('Area Navigation Policy', 'Binding-driven or router-driven view selection.', appBuilderEnumValues(AppBuilderAreaNavigationPolicy)))),
  ]);
}

function statePolicySchema(): AppBuilderInputPayloadSchema {
  return objectSchema('State Policy', 'State ownership and local state choices.', [
    property('appStateOwnership', false, enumSchema('App State Ownership', 'Shared state ownership mode when generated source needs shared state.', appBuilderEnumValues(AppBuilderAppStateOwnershipMode))),
    property('localStatePolicies', false, arraySchema('Local State Policies', 'Stackable local state mechanics.', enumSchema('Local State Policy', 'Compact scalar view-model state, local collection state, or bindable pass-through.', appBuilderEnumValues(AppBuilderLocalStatePolicy)))),
    property('domainModeling', false, enumSchema('Domain Modeling', 'How plain domain objects compose with view-models, state, and services.', appBuilderEnumValues(AppBuilderDomainModelingMode))),
  ]);
}

function stylingPolicySchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Styling Policy', 'Style mechanism choices, not visual taste.', [
    property('domEncapsulation', false, enumSchema('DOM Encapsulation', 'Light DOM or Shadow DOM posture for custom elements.', appBuilderEnumValues(AppBuilderCustomElementDomEncapsulationMode))),
    property('customElementStylePolicies', false, arraySchema('Custom Element Style Policies', 'Component-local stylesheet/style registry choices.', enumSchema('Custom Element Style Policy', 'Component stylesheet, CSS Modules, or Shadow CSS registry.', appBuilderEnumValues(AppBuilderCustomElementStylePolicy)))),
  ]);
}

function pluginPolicySchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Plugin Policy', 'Optional Aurelia package/plugin capabilities selected by caller, AI, existing-app facts, or future policy.', [
    property('packageCapabilities', false, arraySchema('Package Capabilities', 'Plugin/package capability ids that app-builder should admit, report, or hand off without inventing plugin-specific architecture.', enumSchema('Package Capability', 'Optional Aurelia package/plugin capability.', appBuilderEnumValues(AppBuilderPackageCapability)))),
  ]);
}

function collectionDisplayFieldSchema(): AppBuilderInputPayloadSchema {
  return arraySchema('Collection Display Fields', 'Array of field projection roles for list/card/table output.', objectSchema('Collection Display Field', 'One domain field projected into a collection presentation role.', [
    property('fieldName', true, stringSchema('Field Name', 'Domain field name to project.')),
    property('role', true, enumSchema('Display Role', 'Collection display role.', APP_BUILDER_COLLECTION_DISPLAY_ROLES)),
    property('label', false, stringSchema('Display Label', 'Optional human-facing label/header override for roles that render labels.')),
    property('booleanTrueText', false, stringSchema('Boolean True Text', 'Visible text rendered when a boolean display field evaluates to true; supply together with booleanFalseText.')),
    property('booleanFalseText', false, stringSchema('Boolean False Text', 'Visible text rendered when a boolean display field evaluates to false; supply together with booleanTrueText.')),
  ]));
}

function collectionTableColumnSchema(): AppBuilderInputPayloadSchema {
  return arraySchema('Collection Table Columns', 'Array of table column descriptors.', objectSchema('Table Column', 'One table column over a domain field, relationship, or action.', [
    property('fieldName', false, stringSchema('Field Name', 'Domain field name used as the accessor for field-backed columns.')),
    property('actionName', false, stringSchema('Action Name', 'Domain action name used for action columns.')),
    property('relationshipName', false, stringSchema('Relationship Name', 'Domain relationship name used for relationship-backed display columns.')),
    property('header', true, stringSchema('Header', 'Human-facing table column header.')),
    property('displayKind', false, enumSchema('Display Kind', 'How the column value is presented.', APP_BUILDER_COLLECTION_TABLE_COLUMN_DISPLAY_KINDS)),
    property('routeInstruction', false, stringSchema('Route Instruction', 'Exact Aurelia router instruction for navigation-scoped action columns or relationship columns that link to another route.')),
    property('routeBindingExpression', false, stringSchema('Route Binding Expression', 'Exact Aurelia binding expression for `load.bind` when a navigation-scoped column computes one route expression.')),
    property('routeParamsExpression', false, stringSchema('Route Params Expression', 'Exact route params binding expression for navigation-scoped action columns or relationship columns that link to another route.')),
    property('routeContextExpression', false, stringSchema('Route Context Expression', 'Exact route context binding expression for navigation-scoped action columns or relationship columns that link to another route.')),
    property('routeActiveExpression', false, stringSchema('Route Active Expression', 'Exact active-state binding expression for navigation-scoped action columns or relationship columns that link to another route.')),
    property('routeTargetAttributeName', false, stringSchema('Route Target Attribute Name', 'Router target attribute name for navigation-scoped action columns or relationship columns that link to another route.')),
    property('linkText', false, stringSchema('Link Text', 'Visible link text for navigation-scoped action columns; omitted reuses the explicit table-column header.')),
    property('booleanTrueText', false, stringSchema('Boolean True Text', 'Visible text rendered when a boolean field-backed column evaluates to true; supply together with booleanFalseText.')),
    property('booleanFalseText', false, stringSchema('Boolean False Text', 'Visible text rendered when a boolean field-backed column evaluates to false; supply together with booleanTrueText.')),
    property('sortable', false, booleanSchema('Sortable', 'Whether local/server sorting should be offered for this field-backed column.')),
    property('filterable', false, booleanSchema('Filterable', 'Whether local/server filtering should be offered for this field-backed column.')),
  ]));
}

function collectionQueryFeatureSelectionSchema(): AppBuilderInputPayloadSchema {
  return arraySchema('Collection Query Features', 'Array of selected collection feature descriptors; this is caller intent, not the internal gradual-ascent rung label.', objectSchema('Collection Feature Selection', 'One selected collection presentation/query feature and its optional affected fields/actions.', [
    property('featureId', true, enumSchema('Collection Feature', 'Collection feature selected by caller, AI, public preset, or composition.', APP_BUILDER_COLLECTION_FEATURE_IDS)),
    property('fieldNames', false, arraySchema('Field Names', 'Domain fields affected by this feature when applicable, such as sortable or searchable fields.', stringSchema('Field Name', 'One domain field name.'))),
    property('actionNames', false, arraySchema('Action Names', 'Domain actions affected by this feature when applicable, such as batch actions.', stringSchema('Action Name', 'One domain action name.'))),
    property('pageSize', false, numberSchema('Page Size', 'Positive page size used when local pagination is selected; app-builder does not invent this value.')),
    property('initialPage', false, numberSchema('Initial Page', 'Optional one-based starting page used when local pagination is selected.')),
    property('initiallyEnabled', false, booleanSchema('Initially Enabled', 'Whether generated source should enable this feature immediately rather than merely leave space for it.')),
    property('summary', false, stringSchema('Feature Summary', 'Caller-authored explanation for AI/tooling; not source generation by itself.')),
  ]));
}

function collectionIdentityPolicySchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Collection Identity Policy', 'Identity/key policy for collection features that need more than runtime object identity.', [
    property('mode', true, enumSchema('Identity Mode', 'How item identity should be represented when a feature requires stable identity.', APP_BUILDER_COLLECTION_IDENTITY_MODES)),
    property('requiredBy', false, arraySchema('Identity Uses', 'Feature pressures that make identity explicit for this collection.', enumSchema('Identity Use', 'Feature that can require explicit collection identity.', APP_BUILDER_COLLECTION_IDENTITY_USES))),
    property('fieldName', false, stringSchema('Scalar Field Name', 'Domain field used when mode is scalar-field.')),
    property('fieldNames', false, arraySchema('Composite Field Names', 'Domain fields used together when mode is composite-fields.', stringSchema('Composite Field Name', 'One domain field participating in the composite key.'))),
    property('keyExpression', false, stringSchema('Caller-Supplied Key Expression', 'Caller-owned expression/helper name used when mode is caller-supplied-key.')),
  ]);
}

function accessibilityLabelsSchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Accessibility Labels', 'Labels and descriptions for controls or groups.', [
    property('label', true, stringSchema('Label', 'Accessible label or visible field label.')),
    property('description', false, stringSchema('Description', 'Optional longer description.')),
    property('legend', false, stringSchema('Legend', 'Optional group legend for grouped controls.')),
  ]);
}

function accessibilityHelpErrorSchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Accessibility Help And Error', 'Help/error/status message relationships for controls and forms.', [
    property('fieldName', false, stringSchema('Field Name Scope', 'Optional domain field name; when present, the message applies only to the generated field group for that field.')),
    property('helpText', false, stringSchema('Help Text', 'Optional help text associated with the control.')),
    property('errorText', false, stringSchema('Error Text', 'Optional static or initial error text.')),
    property('statusText', false, stringSchema('Status Text', 'Optional status message associated with the control/form.')),
    property('helpId', false, stringSchema('Help Id', 'Optional DOM id for the generated or existing help message.')),
    property('errorId', false, stringSchema('Error Id', 'Optional DOM id for the generated or existing error message.')),
    property('statusId', false, stringSchema('Status Id', 'Optional DOM id for the generated or existing status message.')),
  ]);
}

function actionFeedbackSchema(): AppBuilderInputPayloadSchema {
  return arraySchema(
    'Action Feedback',
    'Array of action-scoped feedback rows used by generated status regions and local command bodies.',
    objectSchema('Action Feedback Row', 'One user-visible status outcome tied to a domain action.', [
      property('actionName', true, stringSchema('Action Name', 'Domain action name this feedback belongs to.')),
      property('statusMemberName', true, stringSchema('Status Member Name', 'TypeScript-safe view-model member that stores the current status text.')),
      property('statusText', true, stringSchema('Status Text', 'Exact caller/AI supplied text assigned after the action succeeds.')),
      property('statusId', false, stringSchema('Status Id', 'Optional DOM id for the generated role=status element.')),
    ]),
  );
}

function seedRecordSetSchema(): AppBuilderInputPayloadSchema {
  const seedRecord = recordSchema(
    'Seed Record',
    'Dynamic record whose keys must match the selected identity member or declared domain fields.',
    seedRecordValueSchema(),
  );
  return unionSchema('Seed Record Set', 'Caller-supplied seed records, either unscoped for one selected entity or grouped by entityName for relationship-aware source lowering.', [
    arraySchema(
      'Unscoped Seed Records',
      'Array of caller-supplied seed records keyed by the selected domain identity member and field names.',
      seedRecord,
    ),
    arraySchema(
      'Entity Seed Record Groups',
      'Array of entity-scoped seed record groups used when generated source initializes more than one domain collection.',
      objectSchema('Entity Seed Record Group', 'One seed record group for an entity type/name.', [
        property('entityName', true, stringSchema('Entity Name', 'Entity type/name these records initialize.')),
        property('records', true, arraySchema('Entity Seed Records', 'Seed records for this entity.', seedRecord)),
      ]),
    ),
  ]);
}

function seedRecordValueSchema(): AppBuilderInputPayloadSchema {
  const primitive = seedRecordPrimitiveSchema();
  const nestedRecord = recordSchema(
    'Nested Seed Record',
    'Nested dynamic record used by owned child/value-object relationships.',
    primitive,
  );
  return unionSchema('Seed Record Value', 'Seed record primitive, primitive array, nested record, or nested record array accepted by current source lowerers.', [
    ...(primitive.variants ?? []),
    arraySchema('Seed Record Primitive Array', 'Array form used by choice-set and other finite multi-value fields.', primitive),
    nestedRecord,
    arraySchema('Nested Seed Record Array', 'Array form used by owned child/value-object relationships.', nestedRecord),
  ]);
}

function seedRecordPrimitiveSchema(): AppBuilderInputPayloadSchema {
  return unionSchema('Seed Record Primitive', 'Primitive value that can be emitted directly as a TypeScript literal.', [
    stringSchema('String Seed Value', 'String seed value.'),
    numberSchema('Number Seed Value', 'Numeric seed value.'),
    booleanSchema('Boolean Seed Value', 'Boolean seed value.'),
    nullSchema('Null Seed Value', 'Null seed value.'),
  ]);
}

function visualClassHooksSchema(): AppBuilderInputPayloadSchema {
  return arraySchema(
    'Visual Class Hooks',
    'Class/data hook rows that can be attached to generated source-lowering elements without asking app-builder to invent visual style.',
    objectSchema('Visual Class Hook', 'One scoped hook row for a generated form, field group, field label, field control, field message, or button.', [
      property('target', true, enumSchema('Visual Hook Target', 'Generated element target that receives this hook.', APP_BUILDER_SOURCE_LOWERING_VISUAL_HOOK_TARGETS)),
      property('classTokens', false, arraySchema('Class Tokens', 'CSS class tokens or utility classes supplied by the caller/AI.', visualClassTokenSchema())),
      property('dataAttributes', false, arraySchema('Data Attributes', 'Caller/AI supplied data-* attributes carried for styling, tests, or future design tooling.', visualDataAttributeSchema())),
      property('fieldName', false, stringSchema('Field Name Scope', 'Optional domain field name; when present, the hook applies only to generated elements for that field.')),
      property('actionName', false, stringSchema('Action Name Scope', 'Optional domain action name; when present, the hook applies only to generated elements for that action.')),
    ]),
  );
}

function visualClassTokenSchema(): AppBuilderInputPayloadSchema {
  return patternStringSchema(
    'Class Token',
    'One CSS class token or utility-class token without whitespace or authored-template delimiters.',
    '^[^\\s"\\\'<>`=]+$',
    'a CSS class token with no whitespace, quote, angle bracket, backtick, or equals sign',
  );
}

function visualDataAttributeSchema(): AppBuilderInputPayloadSchema {
  return objectSchema('Data Attribute', 'One data-* attribute carried onto a generated element.', [
    property('name', true, patternStringSchema(
      'Data Attribute Name',
      'Full data-* attribute name to emit, such as data-au-control or data-testid.',
      '^data-[a-z0-9_.:-]+$',
      'a lowercase data-* attribute name',
    )),
    property('value', false, stringSchema('Data Attribute Value', 'Optional string value; omitted emits a valueless data attribute.')),
  ]);
}

function property(
  name: string,
  required: boolean,
  schema: AppBuilderInputPayloadSchema,
  summary?: string,
): AppBuilderInputPayloadPropertySchema {
  return {
    name,
    required,
    schema,
    ...(summary == null ? {} : { summary }),
  };
}

function stringSchema(
  title: string,
  summary: string,
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.String,
    title,
    summary,
  };
}

function patternStringSchema(
  title: string,
  summary: string,
  pattern: string,
  patternSummary: string,
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.PatternString,
    title,
    summary,
    pattern,
    patternSummary,
  };
}

function nullSchema(
  title: string,
  summary: string,
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.Null,
    title,
    summary,
  };
}

function booleanSchema(
  title: string,
  summary: string,
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.Boolean,
    title,
    summary,
  };
}

function numberSchema(
  title: string,
  summary: string,
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.Number,
    title,
    summary,
  };
}

function enumSchema(
  title: string,
  summary: string,
  enumValues: readonly string[],
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.Enum,
    title,
    summary,
    enumValues,
  };
}

function unionSchema(
  title: string,
  summary: string,
  variants: readonly AppBuilderInputPayloadSchema[],
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.Union,
    title,
    summary,
    variants,
  };
}

function objectSchema(
  title: string,
  summary: string,
  properties: readonly AppBuilderInputPayloadPropertySchema[],
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.Object,
    title,
    summary,
    properties,
  };
}

function recordSchema(
  title: string,
  summary: string,
  valueSchema: AppBuilderInputPayloadSchema,
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.Record,
    title,
    summary,
    valueSchema,
  };
}

function arraySchema(
  title: string,
  summary: string,
  items: AppBuilderInputPayloadSchema,
): AppBuilderInputPayloadSchema {
  return {
    kind: AppBuilderInputPayloadSchemaKind.Array,
    title,
    summary,
    items,
  };
}
