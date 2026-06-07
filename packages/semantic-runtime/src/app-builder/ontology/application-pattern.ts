import {
  APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
  APP_BUILDER_ACTION_FEEDBACK_INPUT_SELECTION,
  APP_BUILDER_APP_SOURCE_PLACEMENT_INPUT_SELECTION,
  APP_BUILDER_AURELIA_CONVENTION_INPUT_SELECTION,
  APP_BUILDER_AURELIA_PLUGIN_INPUT_SELECTION,
  APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION,
  APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
  APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION,
  APP_BUILDER_COLLECTION_TABLE_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_CHOICE_FIELD_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_VALIDATION_INPUT_SELECTION,
  APP_BUILDER_SEED_RECORD_SET_INPUT_SELECTION,
  APP_BUILDER_SOURCE_PLAN_PREVIEW_PLACEMENT_INPUT_SELECTION,
  APP_BUILDER_SOURCE_PLACEMENT_INPUT_SELECTION,
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
  AppBuilderInputContractId,
  type AppBuilderInputFacetSelection,
} from './input.js';
import { AppBuilderCollectionConceptId } from './collection.js';
import {
  APP_BUILDER_NATIVE_FORM_CONTROL_PATTERN_IDS,
  AppBuilderControlManifestRowId,
  AppBuilderControlPatternId,
} from './control.js';
import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  appBuilderOntologyStatus,
  type AppBuilderOntologyStatus,
} from './status.js';
import {
  AppBuilderStylingMechanismId,
  AppBuilderVisualPolicyId,
} from './style.js';
import { ExpectedSemanticEffectKind } from '../../fixture-verification/expected-effect.js';

/** Coarse level of an application design pattern in the app-builder ontology. */
export enum AppBuilderApplicationPatternLevel {
  /** Small reusable building block that can appear inside many compositions. */
  Primitive = 'primitive',
  /** Coherent source structure assembled from multiple primitives. */
  Composition = 'composition',
  /** User-visible workflow or screen family. */
  Workflow = 'workflow',
  /** Cross-cutting app policy or architecture choice. */
  CrossCutting = 'cross-cutting',
}

/** State ownership or state boundary shape coordinated by an application pattern. */
export enum AppBuilderApplicationStateShapeId {
  /** Pattern does not own state beyond existing binding context. */
  None = 'none',
  /** Small local fields or presentation state live in the view-model. */
  LocalViewModelState = 'local-view-model-state',
  /** Shared state or domain behavior lives in an injected ordinary TypeScript class. */
  DiStateClass = 'di-state-class',
  /** IO or persistence crosses an injected service boundary. */
  ServiceBoundary = 'service-boundary',
  /** Draft, clone, dirty, reset, undo, or commit mechanics own editable state. */
  EditBuffer = 'edit-buffer',
  /** State is owned by a plugin store such as @aurelia/state. */
  PluginStore = 'plugin-store',
}

/** Stable value list for application state-shape transport schemas. */
export const APP_BUILDER_APPLICATION_STATE_SHAPE_IDS = [
  AppBuilderApplicationStateShapeId.None,
  AppBuilderApplicationStateShapeId.LocalViewModelState,
  AppBuilderApplicationStateShapeId.DiStateClass,
  AppBuilderApplicationStateShapeId.ServiceBoundary,
  AppBuilderApplicationStateShapeId.EditBuffer,
  AppBuilderApplicationStateShapeId.PluginStore,
] as const;

/** Navigation or addressability shape coordinated by an application pattern. */
export enum AppBuilderApplicationNavigationShapeId {
  /** Pattern has no navigation consequence. */
  None = 'none',
  /** Pattern uses local/binding-driven state rather than route changes. */
  LocalState = 'local-state',
  /** Pattern can be expressed as route-backed screens or areas. */
  RouteBacked = 'route-backed',
  /** Pattern may introduce nested routed areas or viewport placement. */
  NestedViewport = 'nested-viewport',
  /** Pattern may advance through explicit steps without assuming router use. */
  StepFlow = 'step-flow',
}

/** Stable value list for application navigation-shape transport schemas. */
export const APP_BUILDER_APPLICATION_NAVIGATION_SHAPE_IDS = [
  AppBuilderApplicationNavigationShapeId.None,
  AppBuilderApplicationNavigationShapeId.LocalState,
  AppBuilderApplicationNavigationShapeId.RouteBacked,
  AppBuilderApplicationNavigationShapeId.NestedViewport,
  AppBuilderApplicationNavigationShapeId.StepFlow,
] as const;

/** Domain/data shape coordinated by an application pattern. */
export enum AppBuilderApplicationDataShapeId {
  /** Pattern does not depend on domain data. */
  None = 'none',
  /** Pattern works over a domain entity or record. */
  Entity = 'entity',
  /** Pattern works over a scalar or small value object. */
  ValueObject = 'value-object',
  /** Pattern works over a collection of records. */
  Collection = 'collection',
  /** Pattern introduces local or service-backed query state. */
  Query = 'query',
  /** Pattern may spend caller/domain references, ownership, or nested value objects. */
  Relationship = 'relationship',
  /** Pattern spends explicit domain/user action descriptors. */
  CommandAction = 'command-action',
  /** Pattern carries loading, empty, error, or status state. */
  StatusState = 'status-state',
}

/** Stable value list for application data-shape transport schemas. */
export const APP_BUILDER_APPLICATION_DATA_SHAPE_IDS = [
  AppBuilderApplicationDataShapeId.None,
  AppBuilderApplicationDataShapeId.Entity,
  AppBuilderApplicationDataShapeId.ValueObject,
  AppBuilderApplicationDataShapeId.Collection,
  AppBuilderApplicationDataShapeId.Query,
  AppBuilderApplicationDataShapeId.Relationship,
  AppBuilderApplicationDataShapeId.CommandAction,
  AppBuilderApplicationDataShapeId.StatusState,
] as const;

/** User interaction shape coordinated by an application pattern. */
export enum AppBuilderApplicationInteractionShapeId {
  /** Read-only presentation or inspection. */
  View = 'view',
  /** New entity/value input and submit. */
  Create = 'create',
  /** Editing an existing entity or value. */
  Edit = 'edit',
  /** Explicit command/action invocation. */
  Command = 'command',
  /** Item or option selection. */
  Select = 'select',
  /** Querying, searching, filtering, sorting, or paging. */
  Query = 'query',
  /** Navigation to another area, route, or detail. */
  Navigate = 'navigate',
  /** Loading, empty, error, help, validation, or status feedback. */
  Feedback = 'feedback',
  /** Batch operation over a selected set. */
  Batch = 'batch',
}

/** Stable value list for application interaction-shape transport schemas. */
export const APP_BUILDER_APPLICATION_INTERACTION_SHAPE_IDS = [
  AppBuilderApplicationInteractionShapeId.View,
  AppBuilderApplicationInteractionShapeId.Create,
  AppBuilderApplicationInteractionShapeId.Edit,
  AppBuilderApplicationInteractionShapeId.Command,
  AppBuilderApplicationInteractionShapeId.Select,
  AppBuilderApplicationInteractionShapeId.Query,
  AppBuilderApplicationInteractionShapeId.Navigate,
  AppBuilderApplicationInteractionShapeId.Feedback,
  AppBuilderApplicationInteractionShapeId.Batch,
] as const;

/** Aurelia/framework realization surface coordinated by an application pattern. */
export enum AppBuilderApplicationAureliaRealizationId {
  /** Aurelia custom element or root component source. */
  CustomElement = 'custom-element',
  /** Core template binding commands and value channels. */
  BindingCommand = 'binding-command',
  /** Built-in template controller such as repeat/if/promise/switch. */
  TemplateController = 'template-controller',
  /** Aurelia DI registration, resolve, or injected class boundary. */
  DependencyInjection = 'dependency-injection',
  /** Router configuration, route context, route instruction, or viewport use. */
  Router = 'router',
  /** Native DOM/control semantics observed through Aurelia. */
  NativeDomControl = 'native-dom-control',
  /** SourcePlan file/contribution boundary before host writes. */
  SourcePlan = 'source-plan',
  /** Semantic-runtime component/control manifest product. */
  ControlManifest = 'control-manifest',
  /** Optional plugin admission or plugin-owned syntax. */
  Plugin = 'plugin',
}

/** Stable value list for application Aurelia-realization transport schemas. */
export const APP_BUILDER_APPLICATION_AURELIA_REALIZATION_IDS = [
  AppBuilderApplicationAureliaRealizationId.CustomElement,
  AppBuilderApplicationAureliaRealizationId.BindingCommand,
  AppBuilderApplicationAureliaRealizationId.TemplateController,
  AppBuilderApplicationAureliaRealizationId.DependencyInjection,
  AppBuilderApplicationAureliaRealizationId.Router,
  AppBuilderApplicationAureliaRealizationId.NativeDomControl,
  AppBuilderApplicationAureliaRealizationId.SourcePlan,
  AppBuilderApplicationAureliaRealizationId.ControlManifest,
  AppBuilderApplicationAureliaRealizationId.Plugin,
] as const;

/** Application design pattern ids admitted before source generation is authoritative. */
export enum AppBuilderApplicationPatternId {
  /** App shell with root component, startup, and optional navigation frame. */
  AppShell = 'app-shell',
  /** Root app shell that coordinates multiple generated app areas under one route/navigation frame. */
  ApplicationAssembly = 'application-assembly',
  /** Coherent generated component section assembled from explicit child compositions. */
  AppSection = 'app-section',
  /** Native form/control binding through core Aurelia channels. */
  NativeControlBinding = 'native-control-binding',
  /** Collection list presentation over a supplied collection projection. */
  CollectionList = 'collection-list',
  /** Collection card presentation over a supplied collection projection. */
  CollectionCard = 'collection-card',
  /** Collection table presentation with explicit column/query contracts. */
  CollectionTable = 'collection-table',
  /** Loading, empty, and error state presentation around async or absent data. */
  LoadingEmptyErrorState = 'loading-empty-error-state',
  /** User-visible action outcome/status feedback bound to local status state. */
  ActionFeedbackStatus = 'action-feedback-status',
  /** Promise-valued component member that backs async template-controller status regions. */
  AsyncDataSource = 'async-data-source',
  /** Domain action represented as an explicit user command before choosing event/service/state/route realization. */
  DomainCommandAction = 'domain-command-action',
  /** Domain action represented as explicit router navigation through a real `load` route instruction. */
  RouteNavigationAction = 'route-navigation-action',
  /** Native form submit workflow with local view-model fields for small first-ring commands. */
  NativeSubmitForm = 'native-submit-form',
  /** Domain-backed submit workflow where a domain object owns simple behavior or readiness. */
  DomainBackedSubmitForm = 'domain-backed-submit-form',
  /** Route-backed list/detail or browse/detail structure. */
  RouterBackedListDetail = 'router-backed-list-detail',
  /** DI service-backed load/save boundary. */
  ServiceBackedLoadSave = 'service-backed-load-save',
  /** Local view-model state for small UI-only concerns. */
  LocalViewModelState = 'local-view-model-state',
  /** DI state/domain class owned outside the template component. */
  DiStateClass = 'di-state-class',
  /** Edit buffer, dirty-state, undo/redo, or clone/commit model. */
  EditBuffer = 'edit-buffer',
  /** Validation rules and presentation. */
  ValidationRules = 'validation-rules',
  /** Localization and translated seed/content shape. */
  Localization = 'localization',
  /** State plugin store pattern. */
  StatePluginStore = 'state-plugin-store',
}

/** Stable value list for application-pattern transport schemas. */
export const APP_BUILDER_APPLICATION_PATTERN_IDS = [
  AppBuilderApplicationPatternId.AppShell,
  AppBuilderApplicationPatternId.ApplicationAssembly,
  AppBuilderApplicationPatternId.AppSection,
  AppBuilderApplicationPatternId.NativeControlBinding,
  AppBuilderApplicationPatternId.CollectionList,
  AppBuilderApplicationPatternId.CollectionCard,
  AppBuilderApplicationPatternId.CollectionTable,
  AppBuilderApplicationPatternId.LoadingEmptyErrorState,
  AppBuilderApplicationPatternId.ActionFeedbackStatus,
  AppBuilderApplicationPatternId.AsyncDataSource,
  AppBuilderApplicationPatternId.DomainCommandAction,
  AppBuilderApplicationPatternId.RouteNavigationAction,
  AppBuilderApplicationPatternId.NativeSubmitForm,
  AppBuilderApplicationPatternId.DomainBackedSubmitForm,
  AppBuilderApplicationPatternId.RouterBackedListDetail,
  AppBuilderApplicationPatternId.ServiceBackedLoadSave,
  AppBuilderApplicationPatternId.LocalViewModelState,
  AppBuilderApplicationPatternId.DiStateClass,
  AppBuilderApplicationPatternId.EditBuffer,
  AppBuilderApplicationPatternId.ValidationRules,
  AppBuilderApplicationPatternId.Localization,
  AppBuilderApplicationPatternId.StatePluginStore,
] as const;

/** Read-only row for application design patterns. */
export interface AppBuilderApplicationPatternRow {
  /** Stable application pattern id. */
  readonly id: AppBuilderApplicationPatternId;
  /** Abstraction level for composition and reporting. */
  readonly level: AppBuilderApplicationPatternLevel;
  /** Short display title. */
  readonly title: string;
  /** Problem this pattern helps solve. */
  readonly problemSolved: string;
  /** Cases where this pattern should not be the default answer. */
  readonly notFor: string;
  /** State ownership or boundary shapes this pattern coordinates. */
  readonly stateShapeIds: readonly AppBuilderApplicationStateShapeId[];
  /** Navigation or addressability shapes this pattern coordinates. */
  readonly navigationShapeIds: readonly AppBuilderApplicationNavigationShapeId[];
  /** Domain/data shapes this pattern coordinates. */
  readonly dataShapeIds: readonly AppBuilderApplicationDataShapeId[];
  /** User interaction shapes this pattern coordinates. */
  readonly interactionShapeIds: readonly AppBuilderApplicationInteractionShapeId[];
  /** Aurelia/framework realization surfaces this pattern coordinates. */
  readonly aureliaRealizationIds: readonly AppBuilderApplicationAureliaRealizationId[];
  /** Semantic-runtime product families this pattern should eventually prove after source is reopened. */
  readonly semanticEffectKinds: readonly ExpectedSemanticEffectKind[];
  /** Inputs that this pattern needs before generation can be honest. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Relevant facets for those contracts when the whole contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
  /** Application patterns commonly coordinated with this pattern without making them hidden defaults. */
  readonly companionPatternIds?: readonly AppBuilderApplicationPatternId[];
  /** Collection concepts this pattern coordinates without implying they are all source-lowerable. */
  readonly collectionConceptIds: readonly AppBuilderCollectionConceptId[];
  /** Control patterns this application pattern may spend or coordinate. */
  readonly controlPatternIds: readonly AppBuilderControlPatternId[];
  /** Control/component manifest rows this pattern should eventually populate or consult. */
  readonly controlManifestIds: readonly AppBuilderControlManifestRowId[];
  /** Styling mechanisms relevant to this pattern as framework/tooling facts, not visual taste. */
  readonly stylingMechanismIds: readonly AppBuilderStylingMechanismId[];
  /** Visual policy rows relevant to this pattern's style responsibility. */
  readonly visualPolicyIds: readonly AppBuilderVisualPolicyId[];
  /** Whether this pattern is modeled, recommended, source-lowerable, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Initial application design patterns for the app-builder ontology. */
export const APP_BUILDER_APPLICATION_PATTERN_ROWS: readonly AppBuilderApplicationPatternRow[] = [
  {
    id: AppBuilderApplicationPatternId.AppShell,
    level: AppBuilderApplicationPatternLevel.Composition,
    title: 'App Shell',
    problemSolved: 'Provides startup/root component structure for a new app or new isolated generated area.',
    notFor: 'Pure source fragments that should be integrated into an existing shell by the caller.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.None,
      AppBuilderApplicationStateShapeId.LocalViewModelState,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.LocalState,
    ],
    dataShapeIds: [AppBuilderApplicationDataShapeId.None],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Navigate,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.DependencyInjection,
      AppBuilderApplicationAureliaRealizationId.SourcePlan,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.ProjectTooling,
      ExpectedSemanticEffectKind.ResourceDefinition,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ],
    inputContractIds: [
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_APP_SOURCE_PLACEMENT_INPUT_SELECTION,
      APP_BUILDER_AURELIA_CONVENTION_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    collectionConceptIds: [],
    controlPatternIds: [],
    controlManifestIds: [AppBuilderControlManifestRowId.ComponentApiManifest],
    stylingMechanismIds: [
      AppBuilderStylingMechanismId.GlobalStylesheet,
      AppBuilderStylingMechanismId.ClassBinding,
    ],
    visualPolicyIds: [
      AppBuilderVisualPolicyId.VisualInputMissing,
      AppBuilderVisualPolicyId.StructuralHooksOnly,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.ApplicationAssembly,
    level: AppBuilderApplicationPatternLevel.Composition,
    title: 'Application Assembly',
    problemSolved: 'Coordinates one generated app shell with multiple routed app areas so larger generated apps do not duplicate startup, tooling, or root navigation.',
    notFor: 'Single-screen component sections, one isolated app shell, or caller-owned integration into an existing app where the AI should make edits directly.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.DiStateClass,
      AppBuilderApplicationStateShapeId.ServiceBoundary,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.RouteBacked,
      AppBuilderApplicationNavigationShapeId.NestedViewport,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.Query,
      AppBuilderApplicationDataShapeId.CommandAction,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Select,
      AppBuilderApplicationInteractionShapeId.Query,
      AppBuilderApplicationInteractionShapeId.Navigate,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.DependencyInjection,
      AppBuilderApplicationAureliaRealizationId.Router,
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.SourcePlan,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.ProjectTooling,
      ExpectedSemanticEffectKind.Route,
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ],
    inputContractIds: [
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.AureliaPolicy,
    ],
    inputFacetSelections: [
      APP_BUILDER_APP_SOURCE_PLACEMENT_INPUT_SELECTION,
      APP_BUILDER_AURELIA_CONVENTION_INPUT_SELECTION,
    ],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.CollectionFieldProjection,
    ],
    controlPatternIds: [AppBuilderControlPatternId.NativeButton],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.ValueContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.AppSection,
    level: AppBuilderApplicationPatternLevel.Composition,
    title: 'App Section',
    problemSolved: 'Assembles caller-selected child compositions into one coherent custom-element section without turning the selection into a named starter profile.',
    notFor: 'Implicit app generation where the caller has not selected the child patterns, or cross-file route/application shell wiring.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
      AppBuilderApplicationStateShapeId.ServiceBoundary,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.LocalState,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.CommandAction,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Query,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectKind.BindingSourceOperation,
    ],
    inputContractIds: [],
    companionPatternIds: [
      AppBuilderApplicationPatternId.NativeSubmitForm,
      AppBuilderApplicationPatternId.CollectionList,
      AppBuilderApplicationPatternId.CollectionTable,
      AppBuilderApplicationPatternId.LoadingEmptyErrorState,
    ],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.CollectionFieldProjection,
    ],
    controlPatternIds: [
      ...APP_BUILDER_NATIVE_FORM_CONTROL_PATTERN_IDS,
      AppBuilderControlPatternId.NativeButton,
    ],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.ComponentApiManifest,
      AppBuilderControlManifestRowId.StyleContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'The source-lowering surface requires explicit childContent or childCompositions; app-builder coordinates the selected children but does not infer the section contents.',
    }),
  },
  {
    id: AppBuilderApplicationPatternId.NativeControlBinding,
    level: AppBuilderApplicationPatternLevel.Primitive,
    title: 'Native Control Binding',
    problemSolved: 'Keeps generated UI close to web standards and core Aurelia binding/value channels.',
    notFor: 'Rich APG widgets or external control libraries that need their own manifest/contracts.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
    ],
    navigationShapeIds: [AppBuilderApplicationNavigationShapeId.None],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.ValueObject,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Edit,
      AppBuilderApplicationInteractionShapeId.Select,
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingTargetAccess,
      ExpectedSemanticEffectKind.BindingObservedDependency,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    collectionConceptIds: [],
    controlPatternIds: [
      ...APP_BUILDER_NATIVE_FORM_CONTROL_PATTERN_IDS,
    ],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlPatternCatalog,
      AppBuilderControlManifestRowId.AccessibilityContract,
      AppBuilderControlManifestRowId.ValueContract,
      AppBuilderControlManifestRowId.StyleContract,
    ],
    stylingMechanismIds: [
      AppBuilderStylingMechanismId.ClassBinding,
      AppBuilderStylingMechanismId.StyleBinding,
    ],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.CollectionList,
    level: AppBuilderApplicationPatternLevel.Composition,
    title: 'Collection List',
    problemSolved: 'Shows repeated records with compact source and flexible projection.',
    notFor: 'Column-heavy workflows where table semantics are the user intent.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.LocalState,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Select,
      AppBuilderApplicationInteractionShapeId.Navigate,
      AppBuilderApplicationInteractionShapeId.Command,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingValueChannel,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.CollectionProjection,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION,
    ],
    companionPatternIds: [AppBuilderApplicationPatternId.LoadingEmptyErrorState],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.CollectionFieldProjection,
    ],
    controlPatternIds: [AppBuilderControlPatternId.NativeButton],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.ValueContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.CollectionCard,
    level: AppBuilderApplicationPatternLevel.Composition,
    title: 'Collection Card',
    problemSolved: 'Shows records as visual summaries when field hierarchy matters more than dense comparison.',
    notFor: 'Data-dense comparison, sorting, and scanning workflows.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.LocalState,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Select,
      AppBuilderApplicationInteractionShapeId.Navigate,
      AppBuilderApplicationInteractionShapeId.Command,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingValueChannel,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.CollectionProjection,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_DISPLAY_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    companionPatternIds: [AppBuilderApplicationPatternId.LoadingEmptyErrorState],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.CollectionFieldProjection,
    ],
    controlPatternIds: [AppBuilderControlPatternId.NativeButton],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.StyleContract,
    ],
    stylingMechanismIds: [
      AppBuilderStylingMechanismId.ClassBinding,
      AppBuilderStylingMechanismId.GlobalStylesheet,
    ],
    visualPolicyIds: [
      AppBuilderVisualPolicyId.VisualInputMissing,
      AppBuilderVisualPolicyId.SuppliedStyleInput,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.CollectionTable,
    level: AppBuilderApplicationPatternLevel.Composition,
    title: 'Collection Table',
    problemSolved: 'Supports field comparison, sorting, filtering, local pagination, and later selection ladders.',
    notFor: 'Tiny collections where a list or cards communicate the domain more clearly.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.LocalState,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.Query,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Query,
      AppBuilderApplicationInteractionShapeId.Select,
      AppBuilderApplicationInteractionShapeId.Batch,
      AppBuilderApplicationInteractionShapeId.Navigate,
      AppBuilderApplicationInteractionShapeId.Command,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectKind.BindingSourceOperation,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.CollectionProjection,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_COLLECTION_TABLE_INPUT_SELECTION,
    ],
    companionPatternIds: [AppBuilderApplicationPatternId.LoadingEmptyErrorState],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.CollectionFieldProjection,
      AppBuilderCollectionConceptId.TableColumn,
      AppBuilderCollectionConceptId.LocalSorting,
      AppBuilderCollectionConceptId.LocalFiltering,
      AppBuilderCollectionConceptId.LocalPagination,
    ],
    controlPatternIds: [AppBuilderControlPatternId.NativeButton],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.ValueContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.LoadingEmptyErrorState,
    level: AppBuilderApplicationPatternLevel.Primitive,
    title: 'Loading / Empty / Error State',
    problemSolved: 'Makes async or absent data states explicit and user-visible without jumping to plugin-specific machinery.',
    notFor: 'Purely synchronous local-only screens where those states are not part of the user story.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
      AppBuilderApplicationStateShapeId.ServiceBoundary,
    ],
    navigationShapeIds: [AppBuilderApplicationNavigationShapeId.None],
    dataShapeIds: [AppBuilderApplicationDataShapeId.StatusState],
    interactionShapeIds: [AppBuilderApplicationInteractionShapeId.Feedback],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ],
    inputContractIds: [AppBuilderInputContractId.VisualStyleInput],
    inputFacetSelections: [APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION],
    collectionConceptIds: [],
    controlPatternIds: [],
    controlManifestIds: [],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.ActionFeedbackStatus,
    level: AppBuilderApplicationPatternLevel.Primitive,
    title: 'Action Feedback Status',
    problemSolved: 'Shows user-visible outcome/status feedback after an explicit command without inventing copy or jumping to validation, toast, or plugin machinery.',
    notFor: 'Async loading/error states, static field help/error text, or validation feedback; use LoadingEmptyErrorState or control accessibility inputs for those shapes.',
    stateShapeIds: [AppBuilderApplicationStateShapeId.LocalViewModelState],
    navigationShapeIds: [AppBuilderApplicationNavigationShapeId.None],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.CommandAction,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.SourcePlan,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingObservedDependency,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.InteractionFeedback,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_ACTION_FEEDBACK_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    companionPatternIds: [AppBuilderApplicationPatternId.DomainCommandAction],
    collectionConceptIds: [],
    controlPatternIds: [],
    controlManifestIds: [AppBuilderControlManifestRowId.StyleContract],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Action outcome copy and status member names are explicit interaction-feedback input; source lowering only wires them.',
    }),
  },
  {
    id: AppBuilderApplicationPatternId.DomainCommandAction,
    level: AppBuilderApplicationPatternLevel.Primitive,
    title: 'Domain Command Action',
    problemSolved: 'Keeps user/domain commands explicit before app-builder chooses event, service, or state realization.',
    notFor: 'Route navigation actions; use RouteNavigationAction so navigation spends router semantics instead of a class-member command.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
      AppBuilderApplicationStateShapeId.ServiceBoundary,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.None,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.CommandAction,
    ],
    interactionShapeIds: [AppBuilderApplicationInteractionShapeId.Command],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.DependencyInjection,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.BindingSourceOperation,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.DependencyInjection,
    ],
    inputContractIds: [AppBuilderInputContractId.DomainModel],
    inputFacetSelections: [APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION],
    collectionConceptIds: [],
    controlPatternIds: [AppBuilderControlPatternId.NativeButton],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.ValueContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'App-builder source lowering emits a TypeScript class-member method from explicit actionName and optional methodParameters. methodBodyStatements remain caller-owned except for narrow first-ring local create and entity-complete actions derived from domain, local collection, and field/action input.',
    }),
  },
  {
    id: AppBuilderApplicationPatternId.RouteNavigationAction,
    level: AppBuilderApplicationPatternLevel.Primitive,
    title: 'Route Navigation Action',
    problemSolved: 'Spends a navigation-scoped domain action as an Aurelia router load link without treating navigation as business-command source.',
    notFor: 'Business behavior, service/state mutation, or route configuration generation; use DomainCommandAction or RouterBackedListDetail for those surfaces.',
    stateShapeIds: [AppBuilderApplicationStateShapeId.None],
    navigationShapeIds: [AppBuilderApplicationNavigationShapeId.RouteBacked],
    dataShapeIds: [AppBuilderApplicationDataShapeId.CommandAction],
    interactionShapeIds: [AppBuilderApplicationInteractionShapeId.Navigate],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.Router,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.Route,
    ],
    inputContractIds: [AppBuilderInputContractId.DomainModel, AppBuilderInputContractId.AureliaPolicy],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION,
    ],
    collectionConceptIds: [],
    controlPatternIds: [AppBuilderControlPatternId.NativeLinkNavigation],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.ValueContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Source lowering requires explicit actionName, routeInstruction, and linkText; route params/context/active expressions are caller-owned so app-builder does not invent route topology or visible copy.',
    }),
  },
  {
    id: AppBuilderApplicationPatternId.AsyncDataSource,
    level: AppBuilderApplicationPatternLevel.Primitive,
    title: 'Async Data Source Member',
    problemSolved: 'Names a promise-valued component member so async template-controller regions bind to stable state instead of calling a method from the template.',
    notFor: 'Business fetching, retry behavior, or data-service orchestration that needs domain-specific code outside an explicit caller-supplied initializer.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
      AppBuilderApplicationStateShapeId.ServiceBoundary,
    ],
    navigationShapeIds: [AppBuilderApplicationNavigationShapeId.None],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.StatusState,
      AppBuilderApplicationDataShapeId.Collection,
    ],
    interactionShapeIds: [AppBuilderApplicationInteractionShapeId.Feedback],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingObservedDependency,
    ],
    inputContractIds: [],
    inputFacetSelections: [],
    collectionConceptIds: [],
    controlPatternIds: [],
    controlManifestIds: [],
    stylingMechanismIds: [],
    visualPolicyIds: [],
    companionPatternIds: [AppBuilderApplicationPatternId.LoadingEmptyErrorState],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Source lowering emits a promise-valued TypeScript class member from explicit member name, type, and initializer input; app-builder does not invent async behavior.',
    }),
  },
  {
    id: AppBuilderApplicationPatternId.NativeSubmitForm,
    level: AppBuilderApplicationPatternLevel.Workflow,
    title: 'Native Submit Form',
    problemSolved: 'Captures caller-selected fields through native controls and submits one explicit command before edit-buffer, validation, or plugin complexity is needed.',
    notFor: 'Editing existing records, dirty/reset/undo workflows, or forms whose behavior belongs on a durable domain object.',
    stateShapeIds: [AppBuilderApplicationStateShapeId.LocalViewModelState],
    navigationShapeIds: [AppBuilderApplicationNavigationShapeId.LocalState],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.ValueObject,
      AppBuilderApplicationDataShapeId.CommandAction,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.Component,
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingTargetAccess,
      ExpectedSemanticEffectKind.BindingSourceOperation,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    collectionConceptIds: [],
    controlPatternIds: [
      ...APP_BUILDER_NATIVE_FORM_CONTROL_PATTERN_IDS,
    ],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.AccessibilityContract,
      AppBuilderControlManifestRowId.ValueContract,
      AppBuilderControlManifestRowId.StyleContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'App-builder source lowering is implemented through fragment composition, not the single-target invocation surface; callers must supply explicit field and action selections.',
    }),
  },
  {
    id: AppBuilderApplicationPatternId.DomainBackedSubmitForm,
    level: AppBuilderApplicationPatternLevel.Workflow,
    title: 'Domain-Backed Submit Form',
    problemSolved: 'Lets an ordinary TypeScript domain object own simple submit readiness or behavior when that is cleaner than view-model-only fields.',
    notFor: 'Tiny leaf controls where a domain object would only add boilerplate, or advanced edit-buffer workflows.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
    ],
    navigationShapeIds: [AppBuilderApplicationNavigationShapeId.LocalState],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.ValueObject,
      AppBuilderApplicationDataShapeId.CommandAction,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.DependencyInjection,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.Component,
      ExpectedSemanticEffectKind.StateComposition,
      ExpectedSemanticEffectKind.ComputedObserverSource,
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingSourceOperation,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.ControlAccessibility,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
    ],
    collectionConceptIds: [],
    controlPatternIds: [
      ...APP_BUILDER_NATIVE_FORM_CONTROL_PATTERN_IDS,
    ],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.AccessibilityContract,
      AppBuilderControlManifestRowId.ValueContract,
      AppBuilderControlManifestRowId.StyleContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.RouterBackedListDetail,
    level: AppBuilderApplicationPatternLevel.Workflow,
    title: 'Router-Backed List / Detail',
    problemSolved: 'Provides addressable navigation when the user intent calls for screens or shareable detail state.',
    notFor: 'Small local view switches where binding-driven state is simpler and policy permits it.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
      AppBuilderApplicationStateShapeId.ServiceBoundary,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.RouteBacked,
      AppBuilderApplicationNavigationShapeId.NestedViewport,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Select,
      AppBuilderApplicationInteractionShapeId.Navigate,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.Router,
      AppBuilderApplicationAureliaRealizationId.TemplateController,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.Route,
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.SeedData,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_APP_SOURCE_PLACEMENT_INPUT_SELECTION,
      APP_BUILDER_AURELIA_CONVENTION_INPUT_SELECTION,
      APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION,
      APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
      APP_BUILDER_SEED_RECORD_SET_INPUT_SELECTION,
    ],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.CollectionFieldProjection,
    ],
    controlPatternIds: [AppBuilderControlPatternId.NativeButton],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.ValueContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.ServiceBackedLoadSave,
    level: AppBuilderApplicationPatternLevel.CrossCutting,
    title: 'Service-Backed Load / Save',
    problemSolved: 'Keeps IO and durable app operations out of template components while staying ordinary TypeScript.',
    notFor: 'Tiny demo-only local data where the service boundary is noise.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.DiStateClass,
      AppBuilderApplicationStateShapeId.ServiceBoundary,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.None,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.Query,
      AppBuilderApplicationDataShapeId.CommandAction,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Edit,
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Query,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.DependencyInjection,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.TemplateController,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.ServiceClass,
      ExpectedSemanticEffectKind.ServiceInteraction,
      ExpectedSemanticEffectKind.ServiceInteractionBinding,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.RuntimeController,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.AureliaPolicy,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
    ],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.ServiceBackedCollectionQuery,
    ],
    controlPatternIds: [AppBuilderControlPatternId.NativeButton],
    controlManifestIds: [AppBuilderControlManifestRowId.ValueContract],
    stylingMechanismIds: [],
    visualPolicyIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.LocalViewModelState,
    level: AppBuilderApplicationPatternLevel.CrossCutting,
    title: 'Local View-Model State',
    problemSolved: 'Allows compact source for small local UI concerns and simple controls.',
    notFor: 'Large app state, shared domain state, or workflows that need durable coordination.',
    stateShapeIds: [AppBuilderApplicationStateShapeId.LocalViewModelState],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.None,
      AppBuilderApplicationNavigationShapeId.LocalState,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.None,
      AppBuilderApplicationDataShapeId.ValueObject,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Edit,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.Component,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingObservedDependency,
      ExpectedSemanticEffectKind.ComputedObserverSource,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.SourcePlacement,
      AppBuilderInputContractId.AureliaPolicy,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_SOURCE_PLAN_PREVIEW_PLACEMENT_INPUT_SELECTION,
      APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
    ],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.LocalCollectionQuery,
    ],
    controlPatternIds: [],
    controlManifestIds: [],
    stylingMechanismIds: [],
    visualPolicyIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Direct SourcePlan lowering emits explicit scalar field state or explicit caller-supplied local collection state; domain-command behavior remains a follow-up target.',
    }),
  },
  {
    id: AppBuilderApplicationPatternId.DiStateClass,
    level: AppBuilderApplicationPatternLevel.CrossCutting,
    title: 'DI State Class',
    problemSolved: 'Keeps shared state/domain behavior in ordinary TypeScript classes that Aurelia can observe and inject.',
    notFor: 'One-off fields where an extra class only adds boilerplate.',
    stateShapeIds: [AppBuilderApplicationStateShapeId.DiStateClass],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.None,
      AppBuilderApplicationNavigationShapeId.LocalState,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.CommandAction,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Edit,
      AppBuilderApplicationInteractionShapeId.Command,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.DependencyInjection,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.DependencyInjection,
      ExpectedSemanticEffectKind.StateComposition,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.ComputedObserverSource,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.SourcePlacement,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_SOURCE_PLAN_PREVIEW_PLACEMENT_INPUT_SELECTION,
    ],
    collectionConceptIds: [],
    controlPatternIds: [],
    controlManifestIds: [],
    stylingMechanismIds: [],
    visualPolicyIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.EditBuffer,
    level: AppBuilderApplicationPatternLevel.Workflow,
    title: 'Edit Buffer',
    problemSolved: 'Supports clone/edit/commit, dirty state, undo/redo, and reset workflows.',
    notFor: 'First-ring generation until the domain/modeling policy is better settled.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.EditBuffer,
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
    ],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.None,
      AppBuilderApplicationNavigationShapeId.LocalState,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.ValueObject,
      AppBuilderApplicationDataShapeId.CommandAction,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.Edit,
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.DependencyInjection,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.StateComposition,
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.ComputedObserverSource,
      ExpectedSemanticEffectKind.BindingSourceOperation,
    ],
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.AureliaPolicy,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
    ],
    collectionConceptIds: [],
    controlPatternIds: [
      ...APP_BUILDER_NATIVE_FORM_CONTROL_PATTERN_IDS,
    ],
    controlManifestIds: [
      AppBuilderControlManifestRowId.ControlUseInventory,
      AppBuilderControlManifestRowId.ValueContract,
    ],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Keep visible, but do not generate in v1 until state/validation/i18n/edit-policy pressure matures.',
    }),
  },
  {
    id: AppBuilderApplicationPatternId.ValidationRules,
    level: AppBuilderApplicationPatternLevel.CrossCutting,
    title: 'Validation Rules',
    problemSolved: 'Represents validation policy as domain input rather than guessed UI behavior.',
    notFor: 'First-ring source generation before validation-domain contracts are defined.',
    stateShapeIds: [
      AppBuilderApplicationStateShapeId.LocalViewModelState,
      AppBuilderApplicationStateShapeId.DiStateClass,
    ],
    navigationShapeIds: [AppBuilderApplicationNavigationShapeId.None],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.ValueObject,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Edit,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.NativeDomControl,
      AppBuilderApplicationAureliaRealizationId.Plugin,
      AppBuilderApplicationAureliaRealizationId.ControlManifest,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.BindingBehaviorApplication,
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectKind.TemplateDiagnostic,
      ExpectedSemanticEffectKind.BindingDataFlow,
    ],
    inputContractIds: [AppBuilderInputContractId.DomainModel],
    inputFacetSelections: [APP_BUILDER_DOMAIN_VALIDATION_INPUT_SELECTION],
    collectionConceptIds: [],
    controlPatternIds: [AppBuilderControlPatternId.FormMessage],
    controlManifestIds: [AppBuilderControlManifestRowId.AccessibilityContract],
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.Localization,
    level: AppBuilderApplicationPatternLevel.CrossCutting,
    title: 'Localization',
    problemSolved: 'Represents translated text and multilingual seed/content shape when the user asks for it.',
    notFor: 'First-ring generation before translation domain/seed input contracts are defined.',
    stateShapeIds: [AppBuilderApplicationStateShapeId.None],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.None,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.ValueObject,
      AppBuilderApplicationDataShapeId.StatusState,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Feedback,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.CustomElement,
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.Plugin,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.I18nTranslationKey,
      ExpectedSemanticEffectKind.I18nTranslationBinding,
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.RuntimeController,
    ],
    inputContractIds: [AppBuilderInputContractId.DomainModel],
    inputFacetSelections: [APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION],
    collectionConceptIds: [],
    controlPatternIds: [],
    controlManifestIds: [AppBuilderControlManifestRowId.ComponentApiManifest],
    stylingMechanismIds: [],
    visualPolicyIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderApplicationPatternId.StatePluginStore,
    level: AppBuilderApplicationPatternLevel.CrossCutting,
    title: 'State Plugin Store',
    problemSolved: 'Uses the state plugin when project policy or app scale calls for store-shaped state.',
    notFor: 'First-ring generation where ordinary TypeScript/DI state is sufficient and easier to analyze.',
    stateShapeIds: [AppBuilderApplicationStateShapeId.PluginStore],
    navigationShapeIds: [
      AppBuilderApplicationNavigationShapeId.None,
      AppBuilderApplicationNavigationShapeId.LocalState,
      AppBuilderApplicationNavigationShapeId.RouteBacked,
    ],
    dataShapeIds: [
      AppBuilderApplicationDataShapeId.Entity,
      AppBuilderApplicationDataShapeId.Collection,
      AppBuilderApplicationDataShapeId.Query,
      AppBuilderApplicationDataShapeId.CommandAction,
    ],
    interactionShapeIds: [
      AppBuilderApplicationInteractionShapeId.View,
      AppBuilderApplicationInteractionShapeId.Create,
      AppBuilderApplicationInteractionShapeId.Edit,
      AppBuilderApplicationInteractionShapeId.Command,
      AppBuilderApplicationInteractionShapeId.Query,
      AppBuilderApplicationInteractionShapeId.Select,
    ],
    aureliaRealizationIds: [
      AppBuilderApplicationAureliaRealizationId.BindingCommand,
      AppBuilderApplicationAureliaRealizationId.Plugin,
    ],
    semanticEffectKinds: [
      ExpectedSemanticEffectKind.StateStore,
      ExpectedSemanticEffectKind.BindingBehaviorApplication,
      ExpectedSemanticEffectKind.BindingSourceOperation,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.BindingValueChannel,
    ],
    inputContractIds: [AppBuilderInputContractId.AureliaPolicy],
    inputFacetSelections: [
      APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
      APP_BUILDER_AURELIA_PLUGIN_INPUT_SELECTION,
    ],
    collectionConceptIds: [
      AppBuilderCollectionConceptId.CollectionSource,
      AppBuilderCollectionConceptId.LocalCollectionQuery,
    ],
    controlPatternIds: [],
    controlManifestIds: [],
    stylingMechanismIds: [],
    visualPolicyIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
];
