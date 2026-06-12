import { AppBuilderEffectContractId } from './effect.js';
import { AppBuilderApplicationPatternId } from './application-pattern.js';
import {
  APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
  APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION,
  APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION,
  APP_BUILDER_COLLECTION_TABLE_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_CHOICE_FIELD_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
  APP_BUILDER_EXISTING_PLUGIN_FACT_INPUT_SELECTION,
  APP_BUILDER_EXISTING_RESOURCE_FACT_INPUT_SELECTION,
  APP_BUILDER_EXISTING_ROUTE_FACT_INPUT_SELECTION,
  APP_BUILDER_SOURCE_PLACEMENT_INPUT_SELECTION,
  APP_BUILDER_SOURCE_PLAN_PREVIEW_PLACEMENT_INPUT_SELECTION,
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
  AppBuilderInputContractId,
  type AppBuilderInputFacetSelection,
} from './input.js';
import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  appBuilderOntologyStatus,
  type AppBuilderOntologyStatus,
} from './status.js';

/** App-building move ids exposed by the read-only app-builder ontology. */
export enum AppBuilderAffordanceId {
  /** Start a blank-slate conversation by asking for input contracts rather than guessing an app. */
  BlankSlateIntake = 'blank-slate-intake',
  /** Add a coherent app section to a new or existing app once needed inputs are supplied. */
  AddAppSection = 'add-app-section',
  /** Describe or generate a native-first control manifest for source and IDE/MCP consumers. */
  NativeControlManifest = 'native-control-manifest',
  /** Build a native-first create/submit form from explicit domain actions and field/control input. */
  CreateSubmitForm = 'create-submit-form',
  /** Create a collection browse surface without assuming one presentation fits all domains. */
  CollectionBrowse = 'collection-browse',
  /** Create a table-oriented collection surface with explicit column intent. */
  CollectionTable = 'collection-table',
  /** Model route-backed areas when navigation is policy/input, not a hidden default. */
  RouteBackedArea = 'route-backed-area',
  /** Preview source-plan effects without writing files. */
  SourcePlanPreview = 'source-plan-preview',
}

/** Stable value list for app-builder affordance transport schemas. */
export const APP_BUILDER_AFFORDANCE_IDS = [
  AppBuilderAffordanceId.BlankSlateIntake,
  AppBuilderAffordanceId.AddAppSection,
  AppBuilderAffordanceId.NativeControlManifest,
  AppBuilderAffordanceId.CreateSubmitForm,
  AppBuilderAffordanceId.CollectionBrowse,
  AppBuilderAffordanceId.CollectionTable,
  AppBuilderAffordanceId.RouteBackedArea,
  AppBuilderAffordanceId.SourcePlanPreview,
] as const;

/** Read-only affordance row; this is not the old starter composition enum. */
export interface AppBuilderAffordanceRow {
  /** Stable affordance id. */
  readonly id: AppBuilderAffordanceId;
  /** Short display title for public menus. */
  readonly title: string;
  /** What this move helps an AI or developer do. */
  readonly summary: string;
  /** Input contracts that should be satisfied or reported missing. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Relevant facets for those contracts when the whole contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
  /** Effect contracts this move should eventually satisfy before it writes source. */
  readonly effectContractIds: readonly AppBuilderEffectContractId[];
  /** Application design patterns this move coordinates or may spend. */
  readonly applicationPatternIds: readonly AppBuilderApplicationPatternId[];
  /** Optional follow-up moves that become relevant after this one. */
  readonly followUpIds: readonly AppBuilderAffordanceId[];
  /** Whether this move is read-only, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Initial app-building moves for the app-builder ontology. */
export const APP_BUILDER_AFFORDANCE_ROWS: readonly AppBuilderAffordanceRow[] = [
  {
    id: AppBuilderAffordanceId.BlankSlateIntake,
    title: 'Blank Slate Intake',
    summary: 'Expose the information app-builder needs for a new app instead of generating from hidden sample assumptions.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.SourcePlacement,
    ],
    effectContractIds: [AppBuilderEffectContractId.SourcePlanPreview],
    applicationPatternIds: [],
    followUpIds: [
      AppBuilderAffordanceId.CollectionBrowse,
      AppBuilderAffordanceId.CreateSubmitForm,
      AppBuilderAffordanceId.NativeControlManifest,
      AppBuilderAffordanceId.RouteBackedArea,
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
    id: AppBuilderAffordanceId.AddAppSection,
    title: 'Add App Section',
    summary: 'Use supplied domain/policy and deterministic existing-app facts to shape a coherent section without inferring the user business domain.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.ExistingAppFacts,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_SOURCE_PLACEMENT_INPUT_SELECTION,
      APP_BUILDER_EXISTING_RESOURCE_FACT_INPUT_SELECTION,
      APP_BUILDER_EXISTING_ROUTE_FACT_INPUT_SELECTION,
      APP_BUILDER_EXISTING_PLUGIN_FACT_INPUT_SELECTION,
    ],
    effectContractIds: [
      AppBuilderEffectContractId.ExistingAppFactRead,
      AppBuilderEffectContractId.SourcePlanPreview,
      AppBuilderEffectContractId.SemanticRuntimeReopen,
    ],
    applicationPatternIds: [AppBuilderApplicationPatternId.AppSection],
    followUpIds: [
      AppBuilderAffordanceId.CollectionBrowse,
      AppBuilderAffordanceId.CreateSubmitForm,
      AppBuilderAffordanceId.CollectionTable,
      AppBuilderAffordanceId.RouteBackedArea,
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
    id: AppBuilderAffordanceId.NativeControlManifest,
    title: 'Native Control Manifest',
    summary: 'Describe native-first control patterns, value channels, accessibility contracts, and style hooks before generating local components.',
    inputContractIds: [
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    effectContractIds: [
      AppBuilderEffectContractId.ComponentManifestPublication,
      AppBuilderEffectContractId.ControlUseInventory,
    ],
    applicationPatternIds: [AppBuilderApplicationPatternId.NativeControlBinding],
    followUpIds: [AppBuilderAffordanceId.SourcePlanPreview],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderAffordanceId.CreateSubmitForm,
    title: 'Create / Submit Form',
    summary: 'Create a native-first form from explicit domain fields/actions without jumping to edit-buffer, validation, or plugin-specific form machinery.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_CHOICE_FIELD_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_SOURCE_PLACEMENT_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    effectContractIds: [
      AppBuilderEffectContractId.SourcePlanPreview,
      AppBuilderEffectContractId.SemanticRuntimeReopen,
      AppBuilderEffectContractId.ControlUseInventory,
    ],
    applicationPatternIds: [
      AppBuilderApplicationPatternId.DomainCommandAction,
      AppBuilderApplicationPatternId.NativeSubmitForm,
      AppBuilderApplicationPatternId.DomainBackedSubmitForm,
      AppBuilderApplicationPatternId.NativeControlBinding,
      AppBuilderApplicationPatternId.LocalViewModelState,
      AppBuilderApplicationPatternId.DiStateClass,
    ],
    followUpIds: [
      AppBuilderAffordanceId.CollectionBrowse,
      AppBuilderAffordanceId.RouteBackedArea,
      AppBuilderAffordanceId.SourcePlanPreview,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'First-ring forms are simple create/submit flows; edit-buffer, validation, i18n, and plugin-store variants stay visible but deferred.',
    }),
  },
  {
    id: AppBuilderAffordanceId.CollectionBrowse,
    title: 'Collection Browse',
    summary: 'Create list or card browsing surfaces from explicit collection/domain projection, with loading/empty/error states as early UX structure.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.CollectionProjection,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    effectContractIds: [
      AppBuilderEffectContractId.SourcePlanPreview,
      AppBuilderEffectContractId.SemanticRuntimeReopen,
    ],
    applicationPatternIds: [
      AppBuilderApplicationPatternId.CollectionList,
      AppBuilderApplicationPatternId.CollectionCard,
      AppBuilderApplicationPatternId.LoadingEmptyErrorState,
      AppBuilderApplicationPatternId.LocalViewModelState,
    ],
    followUpIds: [
      AppBuilderAffordanceId.CollectionTable,
      AppBuilderAffordanceId.RouteBackedArea,
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
    id: AppBuilderAffordanceId.CollectionTable,
    title: 'Collection Table',
    summary: 'Create table-oriented collection surfaces only after table-column intent is explicit; query, sorting, filtering, and pagination features are selected rungs on top.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.CollectionProjection,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_TABLE_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    effectContractIds: [
      AppBuilderEffectContractId.SourcePlanPreview,
      AppBuilderEffectContractId.SemanticRuntimeReopen,
    ],
    applicationPatternIds: [
      AppBuilderApplicationPatternId.CollectionTable,
      AppBuilderApplicationPatternId.LoadingEmptyErrorState,
      AppBuilderApplicationPatternId.LocalViewModelState,
    ],
    followUpIds: [AppBuilderAffordanceId.SourcePlanPreview],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderAffordanceId.RouteBackedArea,
    title: 'Route-Backed Area',
    summary: 'Use Aurelia router when the user/app policy calls for navigable areas, list/detail flows, or independently addressable screens.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.SourcePlacement,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION,
      APP_BUILDER_SOURCE_PLACEMENT_INPUT_SELECTION,
    ],
    effectContractIds: [
      AppBuilderEffectContractId.SourcePlanPreview,
      AppBuilderEffectContractId.SemanticRuntimeReopen,
    ],
    applicationPatternIds: [
      AppBuilderApplicationPatternId.RouterBackedListDetail,
      AppBuilderApplicationPatternId.AppShell,
    ],
    followUpIds: [AppBuilderAffordanceId.SourcePlanPreview],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderAffordanceId.SourcePlanPreview,
    title: 'SourcePlan Preview',
    summary: 'Return generated-source intent, contributions, and expected effects without writing files.',
    inputContractIds: [AppBuilderInputContractId.SourcePlacement],
    inputFacetSelections: [APP_BUILDER_SOURCE_PLAN_PREVIEW_PLACEMENT_INPUT_SELECTION],
    effectContractIds: [AppBuilderEffectContractId.SourcePlanPreview],
    applicationPatternIds: [],
    followUpIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Current direct SourcePlan surfaces are review canaries; source lowerers should spend this affordance later.',
    }),
  },
];
