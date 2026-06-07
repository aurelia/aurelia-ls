import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  appBuilderOntologyStatus,
  type AppBuilderOntologyStatus,
} from './status.js';

/** Role a caller, detected app fact, profile, or policy can play in app-builder input. */
export enum AppBuilderInputRole {
  /** Domain entities, fields, relationships, actions, and data shape. */
  DomainModel = 'domain-model',
  /** Project/source placement where generated files or fragments would belong. */
  SourcePlacement = 'source-placement',
  /** Explicit Aurelia policy such as routing, conventions, state, or styling mechanism. */
  AureliaPolicy = 'aurelia-policy',
  /** Deterministic facts from an existing app, not inferred business intent. */
  ExistingAppFact = 'existing-app-fact',
  /** Demo/sample records for blank-slate and preview workflows. */
  SeedData = 'seed-data',
  /** Caller-supplied design tokens, class hooks, CSS, utility classes, or design-system reference. */
  VisualStyle = 'visual-style',
  /** Collection projection details such as fields, labels, and table columns. */
  CollectionProjection = 'collection-projection',
  /** Accessibility details that cannot be guessed from a domain field alone. */
  Accessibility = 'accessibility',
  /** Dynamic command outcome feedback supplied by caller/AI instead of inferred from action names. */
  InteractionFeedback = 'interaction-feedback',
}

/** Necessity of an input for a specific app-builder move. */
export enum AppBuilderInputNecessity {
  /** The move cannot honestly proceed without this input. */
  Required = 'required',
  /** The move can proceed, but the caller should normally provide or confirm this input. */
  Recommended = 'recommended',
  /** The input adds quality or specificity but is not structurally required. */
  Optional = 'optional',
  /** The input belongs to a later feature ring and should be reported as such. */
  Deferred = 'deferred',
}

/** Provenance category for supplied app-builder inputs. */
export enum AppBuilderSuppliedInputSource {
  /** The caller or AI explicitly supplied the value for this inquiry. */
  ExplicitCallerInput = 'explicit-caller-input',
  /** Semantic-runtime detected the value from deterministic app facts. */
  ExistingAppFact = 'existing-app-fact',
  /** A request-local decision bundle expanded explicit policy/default decisions into this value. */
  DecisionBundle = 'decision-bundle',
  /** A public preset/sample data set supplied this value by explicit selection. */
  PublicPreset = 'public-preset',
  /** Future project/user policy could supply this value. */
  FuturePolicy = 'future-policy',
}

/** Stable value list for supplied-input source transport schemas. */
export const APP_BUILDER_SUPPLIED_INPUT_SOURCES = [
  AppBuilderSuppliedInputSource.ExplicitCallerInput,
  AppBuilderSuppliedInputSource.ExistingAppFact,
  AppBuilderSuppliedInputSource.DecisionBundle,
  AppBuilderSuppliedInputSource.PublicPreset,
  AppBuilderSuppliedInputSource.FuturePolicy,
] as const;

/** Stable input contract ids used by read-only app-builder ontology rows. */
export enum AppBuilderInputContractId {
  /** Minimum domain model required before app-builder can bind real source to user intent. */
  DomainModel = 'domain-model',
  /** Source placement root, names, and app shape needed before source plans can be actionable. */
  SourcePlacement = 'source-placement',
  /** Explicit policy bundle for source-form, routing, state, and related Aurelia choices. */
  AureliaPolicy = 'aurelia-policy',
  /** Existing app facts used only when semantic-runtime can detect them deterministically. */
  ExistingAppFacts = 'existing-app-facts',
  /** Optional seed records for demo/preview output; never a hidden domain substitute. */
  SeedData = 'seed-data',
  /** Visual input supplied by the AI/user/tooling rather than invented by app-builder. */
  VisualStyleInput = 'visual-style-input',
  /** Collection projection shape used for lists, cards, tables, and query affordances. */
  CollectionProjection = 'collection-projection',
  /** Accessibility labels, descriptions, error/help links, and interaction expectations. */
  ControlAccessibility = 'control-accessibility',
  /** Action outcome/status feedback that generated commands may render and mutate. */
  InteractionFeedback = 'interaction-feedback',
}

/** Stable value list for input-contract transport schemas. */
export const APP_BUILDER_INPUT_CONTRACT_IDS = [
  AppBuilderInputContractId.DomainModel,
  AppBuilderInputContractId.SourcePlacement,
  AppBuilderInputContractId.AureliaPolicy,
  AppBuilderInputContractId.ExistingAppFacts,
  AppBuilderInputContractId.SeedData,
  AppBuilderInputContractId.VisualStyleInput,
  AppBuilderInputContractId.CollectionProjection,
  AppBuilderInputContractId.ControlAccessibility,
  AppBuilderInputContractId.InteractionFeedback,
] as const;

/** Fine-grained facts that make an input contract actionable for an AI caller. */
export enum AppBuilderInputFacetId {
  /** Domain entity names, collection names, and type names. */
  DomainEntities = 'domain-entities',
  /** Domain fields, value kinds, labels, and optional field constraints. */
  DomainFields = 'domain-fields',
  /** Domain value sets, enums, and finite option domains used by choice controls. */
  DomainValueSets = 'domain-value-sets',
  /** Domain relationships such as ownership, references, and nested value objects. */
  DomainRelationships = 'domain-relationships',
  /** Domain actions such as create, update, archive, complete, or assign. */
  DomainActions = 'domain-actions',
  /** Domain validation rules when validation generation or diagnostics need them. */
  DomainValidationRules = 'domain-validation-rules',
  /** Target root, source folder, or host project area for generated artifacts. */
  SourceRoot = 'source-root',
  /** Concrete generated artifact path when a preview or write plan targets one file. */
  SourceTargetPath = 'source-target-path',
  /** App/resource naming policy for files, classes, elements, routes, and stores. */
  SourceNaming = 'source-naming',
  /** File layout policy such as convention companion files or explicit metadata carriers. */
  SourceFileLayout = 'source-file-layout',
  /** Project tooling consequences such as package dependencies, scripts, tsconfig, or CSS declarations. */
  SourceProjectTooling = 'source-project-tooling',
  /** Global convention-admission policy for generated Aurelia resources. */
  AureliaConventionPolicy = 'aurelia-convention-policy',
  /** Global and area-local routing policy for generated app sections. */
  AureliaRoutingPolicy = 'aurelia-routing-policy',
  /** State ownership policy such as local view-model state, DI/domain classes, or later store plugins. */
  AureliaStatePolicy = 'aurelia-state-policy',
  /** Styling mechanism policy such as global CSS, component CSS, Shadow DOM, or supplied hooks. */
  AureliaStylingPolicy = 'aurelia-styling-policy',
  /** Optional plugin admission policy for validation, i18n, state, virtual-repeat, fetch, or later plugins. */
  AureliaPluginPolicy = 'aurelia-plugin-policy',
  /** Deterministic existing-resource facts such as custom elements, attributes, bindables, and conventions. */
  ExistingResourceFacts = 'existing-resource-facts',
  /** Deterministic existing routing facts such as configured routes, viewports, and route parameters. */
  ExistingRouteFacts = 'existing-route-facts',
  /** Deterministic existing package/plugin facts from manifests and framework admissions. */
  ExistingPluginFacts = 'existing-plugin-facts',
  /** Seed records supplied by a caller, public preset, or selected seed data set. */
  SeedRecordSet = 'seed-record-set',
  /** Seed data audience, density, and purpose such as none, public-small, demo, or inspection. */
  SeedDensityPurpose = 'seed-density-purpose',
  /** Design tokens or CSS custom properties supplied by caller, AI, or tooling. */
  VisualTokens = 'visual-tokens',
  /** Stable class/data hooks or utility-class posture supplied by caller, AI, or tooling. */
  VisualClassHooks = 'visual-class-hooks',
  /** Caller-supplied CSS fragments or stylesheet assets for SourcePlan output. */
  VisualCssFragments = 'visual-css-fragments',
  /** Existing or external design-system reference for the AI/tooling to follow. */
  VisualDesignSystemReference = 'visual-design-system-reference',
  /** Field-backed collection display roles such as title, summary, status, date, number, boolean, or relation. */
  CollectionDisplayFields = 'collection-display-fields',
  /** Table column definitions such as header, accessor, display kind, and modeled sort/filter flags. */
  CollectionTableColumns = 'collection-table-columns',
  /** Collection query feature selection such as local sorting, filtering, pagination, selection, or service query. */
  CollectionQueryFeatures = 'collection-query-features',
  /** Identity/key policy for selection, batch actions, edit buffers, and cross-page state. */
  CollectionIdentityPolicy = 'collection-identity-policy',
  /** Labels, legends, descriptions, and name computation expectations for controls. */
  AccessibilityLabels = 'accessibility-labels',
  /** Help, error, validation, and status message relationships for controls and forms. */
  AccessibilityHelpError = 'accessibility-help-error',
  /** Keyboard, focus, ARIA role/state, and interaction expectations for rich controls. */
  AccessibilityInteraction = 'accessibility-interaction',
  /** Action-scoped status member, copy, and optional DOM id for command outcome feedback. */
  ActionFeedback = 'action-feedback',
}

/** Stable value list for input-facet transport schemas. */
export const APP_BUILDER_INPUT_FACET_IDS = [
  AppBuilderInputFacetId.DomainEntities,
  AppBuilderInputFacetId.DomainFields,
  AppBuilderInputFacetId.DomainValueSets,
  AppBuilderInputFacetId.DomainRelationships,
  AppBuilderInputFacetId.DomainActions,
  AppBuilderInputFacetId.DomainValidationRules,
  AppBuilderInputFacetId.SourceRoot,
  AppBuilderInputFacetId.SourceTargetPath,
  AppBuilderInputFacetId.SourceNaming,
  AppBuilderInputFacetId.SourceFileLayout,
  AppBuilderInputFacetId.SourceProjectTooling,
  AppBuilderInputFacetId.AureliaConventionPolicy,
  AppBuilderInputFacetId.AureliaRoutingPolicy,
  AppBuilderInputFacetId.AureliaStatePolicy,
  AppBuilderInputFacetId.AureliaStylingPolicy,
  AppBuilderInputFacetId.AureliaPluginPolicy,
  AppBuilderInputFacetId.ExistingResourceFacts,
  AppBuilderInputFacetId.ExistingRouteFacts,
  AppBuilderInputFacetId.ExistingPluginFacts,
  AppBuilderInputFacetId.SeedRecordSet,
  AppBuilderInputFacetId.SeedDensityPurpose,
  AppBuilderInputFacetId.VisualTokens,
  AppBuilderInputFacetId.VisualClassHooks,
  AppBuilderInputFacetId.VisualCssFragments,
  AppBuilderInputFacetId.VisualDesignSystemReference,
  AppBuilderInputFacetId.CollectionDisplayFields,
  AppBuilderInputFacetId.CollectionTableColumns,
  AppBuilderInputFacetId.CollectionQueryFeatures,
  AppBuilderInputFacetId.CollectionIdentityPolicy,
  AppBuilderInputFacetId.AccessibilityLabels,
  AppBuilderInputFacetId.AccessibilityHelpError,
  AppBuilderInputFacetId.AccessibilityInteraction,
  AppBuilderInputFacetId.ActionFeedback,
] as const;

/** Return unique input-facet ids while preserving first-seen facet order. */
export function appBuilderUniqueInputFacetIds(
  values: readonly AppBuilderInputFacetId[],
): readonly AppBuilderInputFacetId[] {
  return [...new Set(values)];
}

/** Read-only contract row describing what an app-builder move may need. */
export interface AppBuilderInputContractRow {
  /** Stable ontology id for this input contract. */
  readonly id: AppBuilderInputContractId;
  /** High-level role this input plays across app-builder moves. */
  readonly role: AppBuilderInputRole;
  /** Short display title for AI-facing menus and human review. */
  readonly title: string;
  /** Compact explanation of the missing or supplied input. */
  readonly summary: string;
  /** Default necessity before a more specific affordance overrides it. */
  readonly necessity: AppBuilderInputNecessity;
  /** Sources that may honestly supply this input contract. */
  readonly acceptedSourceIds: readonly AppBuilderSuppliedInputSource[];
  /** Fine-grained facets that explain what this input contract may contain. */
  readonly facetIds: readonly AppBuilderInputFacetId[];
  /** Whether the input is modeled, source-lowerable, defaulted, or still provisional. */
  readonly status: AppBuilderOntologyStatus;
}

/** Read-only row for one fine-grained input facet. */
export interface AppBuilderInputFacetRow {
  /** Stable input facet id. */
  readonly id: AppBuilderInputFacetId;
  /** Input contract that owns this facet. */
  readonly contractId: AppBuilderInputContractId;
  /** Whether this facet is required, recommended, optional, or deferred inside the contract. */
  readonly necessity: AppBuilderInputNecessity;
  /** Short display title. */
  readonly title: string;
  /** Compact explanation of what a caller or AI can supply for this facet. */
  readonly summary: string;
  /** Whether this facet is modeled, source-lowerable, defaulted, or still provisional. */
  readonly status: AppBuilderOntologyStatus;
}

/** Row-local narrowing of which facets of an input contract are relevant. */
export interface AppBuilderInputFacetSelection {
  /** Input contract whose facets are being narrowed for one ontology row. */
  readonly inputContractId: AppBuilderInputContractId;
  /** Relevant input facets under that contract. */
  readonly facetIds: readonly AppBuilderInputFacetId[];
}

/** Ontology row shape that declares app-builder input dependencies and optional row-local facet narrowing. */
export interface AppBuilderInputDependencyFacetOwner {
  /** Input contracts named by the row. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Facet selections for dependencies where the whole input contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
}

/** Domain entities and fields needed when source needs ordinary record structure but not relationships/actions. */
export const APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.DomainModel,
  facetIds: [
    AppBuilderInputFacetId.DomainEntities,
    AppBuilderInputFacetId.DomainFields,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Domain fields needed by scalar controls or projections that do not require entities or value sets. */
export const APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.DomainModel,
  facetIds: [AppBuilderInputFacetId.DomainFields],
} as const satisfies AppBuilderInputFacetSelection;

/** Domain fields plus finite value domains needed by select/radio/checkbox-list style controls. */
export const APP_BUILDER_DOMAIN_CHOICE_FIELD_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.DomainModel,
  facetIds: [
    AppBuilderInputFacetId.DomainFields,
    AppBuilderInputFacetId.DomainValueSets,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Domain actions needed by command/action affordances before event, service, state, or route realization is chosen. */
export const APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.DomainModel,
  facetIds: [AppBuilderInputFacetId.DomainActions],
} as const satisfies AppBuilderInputFacetSelection;

/** Domain relationships needed by list/detail, nested value, or reference-oriented app sections. */
export const APP_BUILDER_DOMAIN_RELATIONSHIP_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.DomainModel,
  facetIds: [
    AppBuilderInputFacetId.DomainEntities,
    AppBuilderInputFacetId.DomainFields,
    AppBuilderInputFacetId.DomainRelationships,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Domain validation rules kept visible while validation generation remains a deferred ring. */
export const APP_BUILDER_DOMAIN_VALIDATION_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.DomainModel,
  facetIds: [AppBuilderInputFacetId.DomainValidationRules],
} as const satisfies AppBuilderInputFacetSelection;

/** Source placement facets needed before a generated source plan can become actionable. */
export const APP_BUILDER_SOURCE_PLACEMENT_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  facetIds: [
    AppBuilderInputFacetId.SourceRoot,
    AppBuilderInputFacetId.SourceNaming,
    AppBuilderInputFacetId.SourceFileLayout,
    AppBuilderInputFacetId.SourceProjectTooling,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Source placement facets needed by direct app/source-plan lowerers. */
export const APP_BUILDER_APP_SOURCE_PLACEMENT_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  facetIds: [
    AppBuilderInputFacetId.SourceRoot,
    AppBuilderInputFacetId.SourceNaming,
    AppBuilderInputFacetId.SourceFileLayout,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Source placement facets needed by a concrete single-file SourcePlan preview. */
export const APP_BUILDER_SOURCE_PLAN_PREVIEW_PLACEMENT_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  facetIds: [
    AppBuilderInputFacetId.SourceRoot,
    AppBuilderInputFacetId.SourceTargetPath,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Source file-layout facet for resource carrier and view-form choices without requiring root/tooling input. */
export const APP_BUILDER_SOURCE_FILE_LAYOUT_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  facetIds: [AppBuilderInputFacetId.SourceFileLayout],
} as const satisfies AppBuilderInputFacetSelection;

/** Aurelia convention policy facet for app-global convention versus explicit resource declaration. */
export const APP_BUILDER_AURELIA_CONVENTION_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  facetIds: [AppBuilderInputFacetId.AureliaConventionPolicy],
} as const satisfies AppBuilderInputFacetSelection;

/** Aurelia routing policy facet for router admission and area-local navigation choices. */
export const APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  facetIds: [AppBuilderInputFacetId.AureliaRoutingPolicy],
} as const satisfies AppBuilderInputFacetSelection;

/** Aurelia state policy facet for local, DI/domain, service, or plugin-store ownership choices. */
export const APP_BUILDER_AURELIA_STATE_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  facetIds: [AppBuilderInputFacetId.AureliaStatePolicy],
} as const satisfies AppBuilderInputFacetSelection;

/** Aurelia style mechanism policy facet for framework/tooling style integration choices. */
export const APP_BUILDER_AURELIA_STYLING_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  facetIds: [AppBuilderInputFacetId.AureliaStylingPolicy],
} as const satisfies AppBuilderInputFacetSelection;

/** Aurelia plugin policy facet for optional validation/i18n/state/virtual-repeat/fetch style plugin admission. */
export const APP_BUILDER_AURELIA_PLUGIN_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  facetIds: [AppBuilderInputFacetId.AureliaPluginPolicy],
} as const satisfies AppBuilderInputFacetSelection;

/** Caller-supplied seed records needed only when a source lowerer should emit sample data. */
export const APP_BUILDER_SEED_RECORD_SET_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.SeedData,
  facetIds: [AppBuilderInputFacetId.SeedRecordSet],
} as const satisfies AppBuilderInputFacetSelection;

/** Collection display fields needed by list/card/table projections before source can choose markup. */
export const APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.CollectionProjection,
  facetIds: [AppBuilderInputFacetId.CollectionDisplayFields],
} as const satisfies AppBuilderInputFacetSelection;

/** Collection table columns needed when table presentation is selected. */
export const APP_BUILDER_COLLECTION_TABLE_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.CollectionProjection,
  facetIds: [
    AppBuilderInputFacetId.CollectionDisplayFields,
    AppBuilderInputFacetId.CollectionTableColumns,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Collection display, table, and query facets needed when dense table workflows ask for more than columns. */
export const APP_BUILDER_COLLECTION_TABLE_QUERY_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.CollectionProjection,
  facetIds: [
    AppBuilderInputFacetId.CollectionDisplayFields,
    AppBuilderInputFacetId.CollectionTableColumns,
    AppBuilderInputFacetId.CollectionQueryFeatures,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Collection query feature selections such as local sort/filter/page or deferred service query. */
export const APP_BUILDER_COLLECTION_QUERY_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.CollectionProjection,
  facetIds: [AppBuilderInputFacetId.CollectionQueryFeatures],
} as const satisfies AppBuilderInputFacetSelection;

/** Collection identity policy required by selection, batch actions, edit buffers, routes, or keyed state. */
export const APP_BUILDER_COLLECTION_IDENTITY_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.CollectionProjection,
  facetIds: [AppBuilderInputFacetId.CollectionIdentityPolicy],
} as const satisfies AppBuilderInputFacetSelection;

/** Accessibility label/description facets for controls whose generated source directly owns its accessible name. */
export const APP_BUILDER_ACCESSIBILITY_LABEL_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.ControlAccessibility,
  facetIds: [AppBuilderInputFacetId.AccessibilityLabels],
} as const satisfies AppBuilderInputFacetSelection;

/** Accessibility labels and help/error relationships for field groups and forms that own label/message structure. */
export const APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.ControlAccessibility,
  facetIds: [
    AppBuilderInputFacetId.AccessibilityLabels,
    AppBuilderInputFacetId.AccessibilityHelpError,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Accessibility help/error relationship facet for messages that do not themselves need a label contract. */
export const APP_BUILDER_ACCESSIBILITY_HELP_ERROR_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.ControlAccessibility,
  facetIds: [AppBuilderInputFacetId.AccessibilityHelpError],
} as const satisfies AppBuilderInputFacetSelection;

/** Accessibility interaction contract needed for rich APG-style custom controls. */
export const APP_BUILDER_ACCESSIBILITY_RICH_CONTROL_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.ControlAccessibility,
  facetIds: [
    AppBuilderInputFacetId.AccessibilityLabels,
    AppBuilderInputFacetId.AccessibilityHelpError,
    AppBuilderInputFacetId.AccessibilityInteraction,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Action feedback payload needed to render and mutate user-visible command outcome state. */
export const APP_BUILDER_ACTION_FEEDBACK_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.InteractionFeedback,
  facetIds: [AppBuilderInputFacetId.ActionFeedback],
} as const satisfies AppBuilderInputFacetSelection;

/** Visual class/data hooks for semantic structure without requiring visual CSS. */
export const APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.VisualStyleInput,
  facetIds: [AppBuilderInputFacetId.VisualClassHooks],
} as const satisfies AppBuilderInputFacetSelection;

/** Visual token, class hook, and CSS inputs for caller/AI/design-tool supplied styles. */
export const APP_BUILDER_VISUAL_SUPPLIED_STYLE_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.VisualStyleInput,
  facetIds: [
    AppBuilderInputFacetId.VisualTokens,
    AppBuilderInputFacetId.VisualClassHooks,
    AppBuilderInputFacetId.VisualCssFragments,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Visual design-system reference facet for external design-system or component-library context. */
export const APP_BUILDER_VISUAL_DESIGN_SYSTEM_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.VisualStyleInput,
  facetIds: [AppBuilderInputFacetId.VisualDesignSystemReference],
} as const satisfies AppBuilderInputFacetSelection;

/** Visual facets needed by rich controls that need stable hooks plus optional design-system context. */
export const APP_BUILDER_VISUAL_RICH_CONTROL_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.VisualStyleInput,
  facetIds: [
    AppBuilderInputFacetId.VisualClassHooks,
    AppBuilderInputFacetId.VisualDesignSystemReference,
  ],
} as const satisfies AppBuilderInputFacetSelection;

/** Existing resource facts useful for extension without semantic-runtime inferring business intent. */
export const APP_BUILDER_EXISTING_RESOURCE_FACT_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.ExistingAppFacts,
  facetIds: [AppBuilderInputFacetId.ExistingResourceFacts],
} as const satisfies AppBuilderInputFacetSelection;

/** Existing route facts useful when extending or aligning route-backed app areas. */
export const APP_BUILDER_EXISTING_ROUTE_FACT_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.ExistingAppFacts,
  facetIds: [AppBuilderInputFacetId.ExistingRouteFacts],
} as const satisfies AppBuilderInputFacetSelection;

/** Existing plugin/package facts useful for extension without inventing policy from prose. */
export const APP_BUILDER_EXISTING_PLUGIN_FACT_INPUT_SELECTION = {
  inputContractId: AppBuilderInputContractId.ExistingAppFacts,
  facetIds: [AppBuilderInputFacetId.ExistingPluginFacts],
} as const satisfies AppBuilderInputFacetSelection;

/** Return unique input-contract ids while preserving the row's declaration order. */
export function appBuilderInputContractIdsForDependency(
  row: AppBuilderInputDependencyFacetOwner,
): readonly AppBuilderInputContractId[] {
  return [...new Set(row.inputContractIds)];
}

/** Return row-local facet selections when at least one dependency narrows a broad input contract. */
export function appBuilderInputFacetSelectionsForDependency(
  row: AppBuilderInputDependencyFacetOwner,
): readonly AppBuilderInputFacetSelection[] | undefined {
  return row.inputFacetSelections == null || row.inputFacetSelections.length === 0
    ? undefined
    : row.inputFacetSelections;
}

/** Group row-local facet selections by contract while preserving first-seen facet order. */
export function appBuilderInputFacetIdsByContractId(
  selections: readonly AppBuilderInputFacetSelection[] | null | undefined,
): ReadonlyMap<AppBuilderInputContractId, readonly AppBuilderInputFacetId[]> | undefined {
  if (selections == null || selections.length === 0) {
    return undefined;
  }
  const facetIdsByContractId = new Map<AppBuilderInputContractId, AppBuilderInputFacetId[]>();
  for (const selection of selections) {
    const facetIds = facetIdsByContractId.get(selection.inputContractId) ?? [];
    for (const facetId of selection.facetIds) {
      if (!facetIds.includes(facetId)) {
        facetIds.push(facetId);
      }
    }
    facetIdsByContractId.set(selection.inputContractId, facetIds);
  }
  return facetIdsByContractId;
}

/** Initial read-only input contracts for the app-builder ontology. */
export const APP_BUILDER_INPUT_CONTRACT_ROWS: readonly AppBuilderInputContractRow[] = [
  {
    id: AppBuilderInputContractId.DomainModel,
    role: AppBuilderInputRole.DomainModel,
    title: 'Domain Model',
    summary: 'Entities, fields, relationships, and actions are caller/AI input; app-builder should not silently invent a reusable business domain.',
    necessity: AppBuilderInputNecessity.Required,
    acceptedSourceIds: [
      AppBuilderSuppliedInputSource.ExplicitCallerInput,
      AppBuilderSuppliedInputSource.PublicPreset,
    ],
    facetIds: [
      AppBuilderInputFacetId.DomainEntities,
      AppBuilderInputFacetId.DomainFields,
      AppBuilderInputFacetId.DomainValueSets,
      AppBuilderInputFacetId.DomainRelationships,
      AppBuilderInputFacetId.DomainActions,
      AppBuilderInputFacetId.DomainValidationRules,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Blank-slate samples may offer explicit presets, but presets are input, not hidden inference.',
    }),
  },
  {
    id: AppBuilderInputContractId.SourcePlacement,
    role: AppBuilderInputRole.SourcePlacement,
    title: 'Source Placement',
    summary: 'Generated source needs a target root, naming, and file-layout policy before SourcePlan output can be useful.',
    necessity: AppBuilderInputNecessity.Required,
    acceptedSourceIds: [
      AppBuilderSuppliedInputSource.ExplicitCallerInput,
      AppBuilderSuppliedInputSource.ExistingAppFact,
      AppBuilderSuppliedInputSource.DecisionBundle,
    ],
    facetIds: [
      AppBuilderInputFacetId.SourceRoot,
      AppBuilderInputFacetId.SourceTargetPath,
      AppBuilderInputFacetId.SourceNaming,
      AppBuilderInputFacetId.SourceFileLayout,
      AppBuilderInputFacetId.SourceProjectTooling,
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
    id: AppBuilderInputContractId.AureliaPolicy,
    role: AppBuilderInputRole.AureliaPolicy,
    title: 'Aurelia Policy',
    summary: 'Aurelia choices such as conventions, routing, state ownership, and styling mechanism should be explicit policy, not hidden taste.',
    necessity: AppBuilderInputNecessity.Required,
    acceptedSourceIds: [
      AppBuilderSuppliedInputSource.ExplicitCallerInput,
      AppBuilderSuppliedInputSource.ExistingAppFact,
      AppBuilderSuppliedInputSource.DecisionBundle,
      AppBuilderSuppliedInputSource.FuturePolicy,
    ],
    facetIds: [
      AppBuilderInputFacetId.AureliaConventionPolicy,
      AppBuilderInputFacetId.AureliaRoutingPolicy,
      AppBuilderInputFacetId.AureliaStatePolicy,
      AppBuilderInputFacetId.AureliaStylingPolicy,
      AppBuilderInputFacetId.AureliaPluginPolicy,
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
    id: AppBuilderInputContractId.ExistingAppFacts,
    role: AppBuilderInputRole.ExistingAppFact,
    title: 'Existing App Facts',
    summary: 'Existing-app workflows should consume deterministic semantic-runtime facts such as plugins, routes, resources, and conventions, not inferred domain intent.',
    necessity: AppBuilderInputNecessity.Recommended,
    acceptedSourceIds: [AppBuilderSuppliedInputSource.ExistingAppFact],
    facetIds: [
      AppBuilderInputFacetId.ExistingResourceFacts,
      AppBuilderInputFacetId.ExistingRouteFacts,
      AppBuilderInputFacetId.ExistingPluginFacts,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderInputContractId.SeedData,
    role: AppBuilderInputRole.SeedData,
    title: 'Seed Data',
    summary: 'Seed data is first-class preview/demo input and may be disabled; it should be domain-specific only when explicitly selected or supplied.',
    necessity: AppBuilderInputNecessity.Optional,
    acceptedSourceIds: [
      AppBuilderSuppliedInputSource.ExplicitCallerInput,
      AppBuilderSuppliedInputSource.PublicPreset,
      AppBuilderSuppliedInputSource.DecisionBundle,
    ],
    facetIds: [
      AppBuilderInputFacetId.SeedRecordSet,
      AppBuilderInputFacetId.SeedDensityPurpose,
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
    id: AppBuilderInputContractId.VisualStyleInput,
    role: AppBuilderInputRole.VisualStyle,
    title: 'Visual Style Input',
    summary: 'Style tokens, class hooks, utility classes, CSS, or design-system references should be accepted as input; no built-in visual fallback is approved yet.',
    necessity: AppBuilderInputNecessity.Recommended,
    acceptedSourceIds: [
      AppBuilderSuppliedInputSource.ExplicitCallerInput,
      AppBuilderSuppliedInputSource.ExistingAppFact,
      AppBuilderSuppliedInputSource.DecisionBundle,
      AppBuilderSuppliedInputSource.FuturePolicy,
    ],
    facetIds: [
      AppBuilderInputFacetId.VisualTokens,
      AppBuilderInputFacetId.VisualClassHooks,
      AppBuilderInputFacetId.VisualCssFragments,
      AppBuilderInputFacetId.VisualDesignSystemReference,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Missing visual input should surface as an honest input state rather than app-builder inventing design taste.',
    }),
  },
  {
    id: AppBuilderInputContractId.CollectionProjection,
    role: AppBuilderInputRole.CollectionProjection,
    title: 'Collection Projection',
    summary: 'Lists, cards, and tables need projection details such as labels, summaries, status fields, and table columns.',
    necessity: AppBuilderInputNecessity.Recommended,
    acceptedSourceIds: [
      AppBuilderSuppliedInputSource.ExplicitCallerInput,
      AppBuilderSuppliedInputSource.PublicPreset,
      AppBuilderSuppliedInputSource.DecisionBundle,
    ],
    facetIds: [
      AppBuilderInputFacetId.CollectionDisplayFields,
      AppBuilderInputFacetId.CollectionTableColumns,
      AppBuilderInputFacetId.CollectionQueryFeatures,
      AppBuilderInputFacetId.CollectionIdentityPolicy,
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
    id: AppBuilderInputContractId.ControlAccessibility,
    role: AppBuilderInputRole.Accessibility,
    title: 'Control Accessibility',
    summary: 'Labels, help text, validation messages, and interaction expectations should be explicit when the domain field does not determine them.',
    necessity: AppBuilderInputNecessity.Recommended,
    acceptedSourceIds: [
      AppBuilderSuppliedInputSource.ExplicitCallerInput,
      AppBuilderSuppliedInputSource.DecisionBundle,
      AppBuilderSuppliedInputSource.FuturePolicy,
    ],
    facetIds: [
      AppBuilderInputFacetId.AccessibilityLabels,
      AppBuilderInputFacetId.AccessibilityHelpError,
      AppBuilderInputFacetId.AccessibilityInteraction,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
      note: 'Grounded by the native-control and web-standards direction, but exact APG-rich widgets remain deferred.',
    }),
  },
  {
    id: AppBuilderInputContractId.InteractionFeedback,
    role: AppBuilderInputRole.InteractionFeedback,
    title: 'Interaction Feedback',
    summary: 'Action outcome/status feedback is explicit caller/AI input; app-builder can wire it but should not invent success copy or status member names.',
    necessity: AppBuilderInputNecessity.Recommended,
    acceptedSourceIds: [
      AppBuilderSuppliedInputSource.ExplicitCallerInput,
      AppBuilderSuppliedInputSource.DecisionBundle,
      AppBuilderSuppliedInputSource.FuturePolicy,
    ],
    facetIds: [AppBuilderInputFacetId.ActionFeedback],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'This contract models dynamic user-visible command outcomes, not static help/error copy or async loading/error state.',
    }),
  },
];

/** Initial fine-grained facets that make missing input contracts actionable. */
export const APP_BUILDER_INPUT_FACET_ROWS: readonly AppBuilderInputFacetRow[] = [
  {
    id: AppBuilderInputFacetId.DomainEntities,
    contractId: AppBuilderInputContractId.DomainModel,
    necessity: AppBuilderInputNecessity.Required,
    title: 'Domain Entities',
    summary: 'Entity, collection, type names, and explicit identity value kind when generated source needs typed records, routes, seed data, or lookup code.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Recommendable, true),
  },
  {
    id: AppBuilderInputFacetId.DomainFields,
    contractId: AppBuilderInputContractId.DomainModel,
    necessity: AppBuilderInputNecessity.Required,
    title: 'Domain Fields',
    summary: 'Field names, value kinds, labels, and source-lowering constraints for controls, lists, cards, and tables.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Recommendable, true),
  },
  {
    id: AppBuilderInputFacetId.DomainValueSets,
    contractId: AppBuilderInputContractId.DomainModel,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Domain Value Sets',
    summary: 'Finite option domains, enum-like values, and labels used by radio, select, checkbox-list, and choice field controls.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.DomainRelationships,
    contractId: AppBuilderInputContractId.DomainModel,
    necessity: AppBuilderInputNecessity.Optional,
    title: 'Domain Relationships',
    summary: 'Relationships, references, ownership, and nested value objects when the generated app needs more than flat records.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.DomainActions,
    contractId: AppBuilderInputContractId.DomainModel,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Domain Actions',
    summary: 'User/domain actions such as create, update, archive, complete, assign, or save that generated components should expose.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.DomainValidationRules,
    contractId: AppBuilderInputContractId.DomainModel,
    necessity: AppBuilderInputNecessity.Deferred,
    title: 'Domain Validation Rules',
    summary: 'Validation rules and messages; visible now, but source generation is deferred until validation contracts are designed.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Deferred, true),
  },
  {
    id: AppBuilderInputFacetId.SourceRoot,
    contractId: AppBuilderInputContractId.SourcePlacement,
    necessity: AppBuilderInputNecessity.Required,
    title: 'Source Root',
    summary: 'Target root, source folder, or existing app area where generated source would belong.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Recommendable, true),
  },
  {
    id: AppBuilderInputFacetId.SourceTargetPath,
    contractId: AppBuilderInputContractId.SourcePlacement,
    necessity: AppBuilderInputNecessity.Required,
    title: 'Source Target Path',
    summary: 'Concrete generated file path selected for a single-file SourcePlan preview or write plan.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Recommendable, true),
  },
  {
    id: AppBuilderInputFacetId.SourceNaming,
    contractId: AppBuilderInputContractId.SourcePlacement,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Source Naming',
    summary: 'File, class, element, route, and store naming inputs or defaults with explicit provenance.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.SourceFileLayout,
    contractId: AppBuilderInputContractId.SourcePlacement,
    necessity: AppBuilderInputNecessity.Required,
    title: 'Source File Layout',
    summary: 'File layout policy such as convention companion files, explicit decorators, static metadata, or future source forms.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Recommendable, true),
  },
  {
    id: AppBuilderInputFacetId.SourceProjectTooling,
    contractId: AppBuilderInputContractId.SourcePlacement,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Source Project Tooling',
    summary: 'Package dependencies, scripts, TypeScript config, style declarations, and generated project-tooling artifacts.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.AureliaConventionPolicy,
    contractId: AppBuilderInputContractId.AureliaPolicy,
    necessity: AppBuilderInputNecessity.Required,
    title: 'Aurelia Convention Policy',
    summary: 'Global choice for convention-enabled versus explicit resource declaration in generated source.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.AureliaRoutingPolicy,
    contractId: AppBuilderInputContractId.AureliaPolicy,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Aurelia Routing Policy',
    summary: 'Global router admission and area-local router-driven versus binding-driven navigation decisions.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.AureliaStatePolicy,
    contractId: AppBuilderInputContractId.AureliaPolicy,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Aurelia State Policy',
    summary: 'State ownership choice such as compact view-model state, DI/domain classes, or later plugin-store variants.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.AureliaStylingPolicy,
    contractId: AppBuilderInputContractId.AureliaPolicy,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Aurelia Styling Policy',
    summary: 'Styling mechanism choice such as global CSS, component CSS, class hooks, Shadow DOM, or CSS Modules.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.AureliaPluginPolicy,
    contractId: AppBuilderInputContractId.AureliaPolicy,
    necessity: AppBuilderInputNecessity.Deferred,
    title: 'Aurelia Plugin Policy',
    summary: 'Optional plugin admission such as validation, i18n, state, virtual-repeat, or fetch when user intent calls for them.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Deferred, true),
  },
  {
    id: AppBuilderInputFacetId.ExistingResourceFacts,
    contractId: AppBuilderInputContractId.ExistingAppFacts,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Existing Resource Facts',
    summary: 'Detected resources, bindables, conventions, local dependencies, and component/control inventory.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Contextual, false),
  },
  {
    id: AppBuilderInputFacetId.ExistingRouteFacts,
    contractId: AppBuilderInputContractId.ExistingAppFacts,
    necessity: AppBuilderInputNecessity.Optional,
    title: 'Existing Route Facts',
    summary: 'Detected route configuration, viewports, route parameters, and routeable components.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Contextual, false),
  },
  {
    id: AppBuilderInputFacetId.ExistingPluginFacts,
    contractId: AppBuilderInputContractId.ExistingAppFacts,
    necessity: AppBuilderInputNecessity.Optional,
    title: 'Existing Plugin Facts',
    summary: 'Detected framework/package plugin admissions and package capabilities from source and manifests.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Contextual, false),
  },
  {
    id: AppBuilderInputFacetId.SeedRecordSet,
    contractId: AppBuilderInputContractId.SeedData,
    necessity: AppBuilderInputNecessity.Optional,
    title: 'Seed Record Set',
    summary: 'Caller-supplied or selected public seed records; disabled seed data should also be an explicit selection.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.SeedDensityPurpose,
    contractId: AppBuilderInputContractId.SeedData,
    necessity: AppBuilderInputNecessity.Deferred,
    title: 'Seed Density And Purpose',
    summary: 'Deferred selector for future public seed presets or defaulting bundles; current source lowerers spend explicit seed records only.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Deferred, true),
  },
  {
    id: AppBuilderInputFacetId.VisualTokens,
    contractId: AppBuilderInputContractId.VisualStyleInput,
    necessity: AppBuilderInputNecessity.Optional,
    title: 'Visual Tokens',
    summary: 'Design tokens or CSS custom properties supplied by the caller, AI, design tooling, or existing project.',
    status: toBeDeterminedFacetStatus(
      AppBuilderRecommendationStatus.Contextual,
      true,
      'Visual token payload vocabulary remains intentionally open until design-tooling policy and consumers are grounded.',
    ),
  },
  {
    id: AppBuilderInputFacetId.VisualClassHooks,
    contractId: AppBuilderInputContractId.VisualStyleInput,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Visual Class Hooks',
    summary: 'Stable classes, data attributes, or utility-class posture that generated source can carry without inventing visual taste.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.VisualCssFragments,
    contractId: AppBuilderInputContractId.VisualStyleInput,
    necessity: AppBuilderInputNecessity.Optional,
    title: 'Visual CSS Fragments',
    summary: 'Caller/AI/tool-supplied CSS or stylesheet assets that app-builder can carry through SourcePlan output.',
    status: toBeDeterminedFacetStatus(
      AppBuilderRecommendationStatus.Contextual,
      true,
      'CSS fragment payload shape remains provisional because app-builder is not yet a visual design engine.',
    ),
  },
  {
    id: AppBuilderInputFacetId.VisualDesignSystemReference,
    contractId: AppBuilderInputContractId.VisualStyleInput,
    necessity: AppBuilderInputNecessity.Optional,
    title: 'Visual Design System Reference',
    summary: 'Existing component library, design system, token source, or external design-tool reference for AI/tooling use.',
    status: toBeDeterminedFacetStatus(
      AppBuilderRecommendationStatus.Contextual,
      true,
      'External design-system reference shape remains provisional pending component/control manifest and peer-tooling adapters.',
    ),
  },
  {
    id: AppBuilderInputFacetId.CollectionDisplayFields,
    contractId: AppBuilderInputContractId.CollectionProjection,
    necessity: AppBuilderInputNecessity.Required,
    title: 'Collection Display Fields',
    summary: 'Field-backed projection roles such as title, summary, status, date, number, boolean, and relation display fields.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Recommendable, true),
  },
  {
    id: AppBuilderInputFacetId.CollectionTableColumns,
    contractId: AppBuilderInputContractId.CollectionProjection,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Collection Table Columns',
    summary: 'Table headers, accessors, display kinds, and modeled sort/filter flags when table presentation is selected.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.CollectionQueryFeatures,
    contractId: AppBuilderInputContractId.CollectionProjection,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Collection Query Features',
    summary: 'Local sorting, filtering, pagination, row selection, or service-backed query rungs selected by user intent.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.CollectionIdentityPolicy,
    contractId: AppBuilderInputContractId.CollectionProjection,
    necessity: AppBuilderInputNecessity.Optional,
    title: 'Collection Identity Policy',
    summary: 'Identity/key policy needed for selection, batch actions, edit buffers, and cross-page state; simple repeats may use object identity.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.AccessibilityLabels,
    contractId: AppBuilderInputContractId.ControlAccessibility,
    necessity: AppBuilderInputNecessity.Required,
    title: 'Accessibility Labels',
    summary: 'Labels, legends, descriptions, and name computation expectations for fields, groups, and controls.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Recommendable, true),
  },
  {
    id: AppBuilderInputFacetId.AccessibilityHelpError,
    contractId: AppBuilderInputContractId.ControlAccessibility,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Accessibility Help And Error',
    summary: 'Help text, error text, validation state, status messages, and described-by relationships.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
  {
    id: AppBuilderInputFacetId.AccessibilityInteraction,
    contractId: AppBuilderInputContractId.ControlAccessibility,
    necessity: AppBuilderInputNecessity.Deferred,
    title: 'Accessibility Interaction',
    summary: 'Keyboard, focus, ARIA role/state, and rich-widget interaction contracts for APG-grade controls.',
    status: sourceBackedFacetStatus(AppBuilderRecommendationStatus.Deferred, true),
  },
  {
    id: AppBuilderInputFacetId.ActionFeedback,
    contractId: AppBuilderInputContractId.InteractionFeedback,
    necessity: AppBuilderInputNecessity.Recommended,
    title: 'Action Feedback',
    summary: 'Action-scoped status member, status copy, and optional DOM id for user-visible command outcomes.',
    status: operatorConfirmedFacetStatus(AppBuilderRecommendationStatus.Contextual, true),
  },
];

function operatorConfirmedFacetStatus(
  recommendationStatus: AppBuilderRecommendationStatus,
  requiresExplicitInput: boolean,
): AppBuilderOntologyStatus {
  return facetStatus(recommendationStatus, requiresExplicitInput, AppBuilderOntologyReasonAuthority.OperatorConfirmed);
}

function sourceBackedFacetStatus(
  recommendationStatus: AppBuilderRecommendationStatus,
  requiresExplicitInput: boolean,
): AppBuilderOntologyStatus {
  return facetStatus(recommendationStatus, requiresExplicitInput, AppBuilderOntologyReasonAuthority.SourceBacked);
}

function toBeDeterminedFacetStatus(
  recommendationStatus: AppBuilderRecommendationStatus,
  requiresExplicitInput: boolean,
  note: string,
): AppBuilderOntologyStatus {
  return facetStatus(recommendationStatus, requiresExplicitInput, AppBuilderOntologyReasonAuthority.ToBeDetermined, note);
}

function facetStatus(
  recommendationStatus: AppBuilderRecommendationStatus,
  requiresExplicitInput: boolean,
  reasonAuthority: AppBuilderOntologyReasonAuthority,
  note?: string,
): AppBuilderOntologyStatus {
  return appBuilderOntologyStatus({
    modeled: true,
    sourceLoweringImplemented: false,
    recommendationStatus,
    requiresExplicitInput,
    reasonAuthority,
    ...(note == null ? {} : { note }),
  });
}
