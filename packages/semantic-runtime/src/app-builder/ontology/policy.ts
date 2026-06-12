import {
  APP_BUILDER_AURELIA_CONVENTION_INPUT_SELECTION,
  APP_BUILDER_AURELIA_PLUGIN_INPUT_SELECTION,
  APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION,
  APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
  APP_BUILDER_AURELIA_STYLING_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
  APP_BUILDER_SOURCE_FILE_LAYOUT_INPUT_SELECTION,
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

/** Scope where an app-builder policy axis is selected or applied. */
export enum AppBuilderPolicyScope {
  /** App- or project-wide policy. */
  AppGlobal = 'app-global',
  /** Policy applied to one Aurelia resource. */
  ResourceLocal = 'resource-local',
  /** Policy applied to one routed/binding-driven app area. */
  AreaLocal = 'area-local',
  /** Policy applied to one component/control implementation. */
  ComponentLocal = 'component-local',
  /** Policy applied to one control occurrence or field group. */
  ControlLocal = 'control-local',
}

/** App-builder policy axes; these are choices, not framework capability identity. */
export enum AppBuilderPolicyAxisId {
  /** Whether the generated project uses Aurelia conventions or explicit declarations globally. */
  ConventionAdmission = 'convention-admission',
  /** Whether the generated project admits router configuration globally. */
  RouterAdmission = 'router-admission',
  /** Whether a specific area uses router-driven or binding-driven view selection. */
  AreaNavigation = 'area-navigation',
  /** Whether shared state is owned by DI/domain classes, state plugin stores, or later variants. */
  StateOwnership = 'state-ownership',
  /** Whether a local section keeps small UI state on the view model or passes it through bindables. */
  LocalState = 'local-state',
  /** How a resource is established: convention, decorator, static metadata, define call, or future forms. */
  ResourceCarrier = 'resource-carrier',
  /** Whether a custom element uses inline-only or companion-file view form. */
  CustomElementViewForm = 'custom-element-view-form',
  /** Whether a component uses light DOM or Shadow DOM encapsulation. */
  DomEncapsulation = 'dom-encapsulation',
  /** Which styling mechanism is used for source/tooling integration. */
  StylingMechanism = 'styling-mechanism',
  /** How field-local validation facts are spent as native constraints, plugin rules, or handoff. */
  ValidationMechanism = 'validation-mechanism',
  /** Whether optional plugins such as validation, i18n, state, or virtual-repeat are admitted. */
  PluginAdmission = 'plugin-admission',
}

/** Stable value list for policy-axis transport schemas. */
export const APP_BUILDER_POLICY_AXIS_IDS = [
  AppBuilderPolicyAxisId.ConventionAdmission,
  AppBuilderPolicyAxisId.RouterAdmission,
  AppBuilderPolicyAxisId.AreaNavigation,
  AppBuilderPolicyAxisId.StateOwnership,
  AppBuilderPolicyAxisId.LocalState,
  AppBuilderPolicyAxisId.ResourceCarrier,
  AppBuilderPolicyAxisId.CustomElementViewForm,
  AppBuilderPolicyAxisId.DomEncapsulation,
  AppBuilderPolicyAxisId.StylingMechanism,
  AppBuilderPolicyAxisId.ValidationMechanism,
  AppBuilderPolicyAxisId.PluginAdmission,
] as const;

/** Read-only app-builder policy axis row. */
export interface AppBuilderPolicyAxisRow {
  /** Stable policy axis id. */
  readonly id: AppBuilderPolicyAxisId;
  /** Scope where the policy is selected or applied. */
  readonly scope: AppBuilderPolicyScope;
  /** Short display title. */
  readonly title: string;
  /** What the axis decides and what it must not be confused with. */
  readonly summary: string;
  /** Input contracts that can supply or confirm this policy axis. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Relevant facets for those contracts when the whole contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
  /** Whether this policy axis is modeled, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Initial app-builder policy axes kept separate from framework capability identity. */
export const APP_BUILDER_POLICY_AXIS_ROWS: readonly AppBuilderPolicyAxisRow[] = [
  {
    id: AppBuilderPolicyAxisId.ConventionAdmission,
    scope: AppBuilderPolicyScope.AppGlobal,
    title: 'Convention Admission',
    summary: 'Global project policy for convention-enabled versus explicit resource declarations; inline custom elements are a separate resource/view-form choice.',
    inputContractIds: [AppBuilderInputContractId.AureliaPolicy],
    inputFacetSelections: [APP_BUILDER_AURELIA_CONVENTION_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderPolicyAxisId.RouterAdmission,
    scope: AppBuilderPolicyScope.AppGlobal,
    title: 'Router Admission',
    summary: 'Global admission of Aurelia router configuration; individual areas still decide router-driven versus binding-driven selection.',
    inputContractIds: [AppBuilderInputContractId.AureliaPolicy],
    inputFacetSelections: [APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderPolicyAxisId.AreaNavigation,
    scope: AppBuilderPolicyScope.AreaLocal,
    title: 'Area Navigation',
    summary: 'Per-area choice between binding-driven view selection and router-driven navigation; nested viewports are consequences, not a global knob.',
    inputContractIds: [
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.DomainModel,
    ],
    inputFacetSelections: [
      APP_BUILDER_AURELIA_ROUTING_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
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
    id: AppBuilderPolicyAxisId.StateOwnership,
    scope: AppBuilderPolicyScope.AppGlobal,
    title: 'State Ownership',
    summary: 'Shared state policy for DI/domain classes versus state-plugin stores; small local state remains a separate lower-level policy.',
    inputContractIds: [
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.DomainModel,
    ],
    inputFacetSelections: [
      APP_BUILDER_AURELIA_STATE_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
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
    id: AppBuilderPolicyAxisId.LocalState,
    scope: AppBuilderPolicyScope.ComponentLocal,
    title: 'Local State',
    summary: 'Compact component-local state and bindable pass-through policy for small app sections or individual controls.',
    inputContractIds: [AppBuilderInputContractId.AureliaPolicy],
    inputFacetSelections: [APP_BUILDER_AURELIA_STATE_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderPolicyAxisId.ResourceCarrier,
    scope: AppBuilderPolicyScope.ResourceLocal,
    title: 'Resource Carrier',
    summary: 'Per-resource establishment form such as convention, decorator, static metadata, or define call; not the same axis as app-wide conventions.',
    inputContractIds: [AppBuilderInputContractId.SourcePlacement],
    inputFacetSelections: [APP_BUILDER_SOURCE_FILE_LAYOUT_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderPolicyAxisId.CustomElementViewForm,
    scope: AppBuilderPolicyScope.ResourceLocal,
    title: 'Custom Element View Form',
    summary: 'Custom-element source shape such as companion template file or inline custom element; orthogonal to convention versus decorator policy.',
    inputContractIds: [AppBuilderInputContractId.SourcePlacement],
    inputFacetSelections: [APP_BUILDER_SOURCE_FILE_LAYOUT_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderPolicyAxisId.DomEncapsulation,
    scope: AppBuilderPolicyScope.ComponentLocal,
    title: 'DOM Encapsulation',
    summary: 'Light DOM versus Shadow DOM component policy; real Aurelia capability but not a blanket first-ring default.',
    inputContractIds: [AppBuilderInputContractId.AureliaPolicy],
    inputFacetSelections: [APP_BUILDER_AURELIA_STYLING_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderPolicyAxisId.StylingMechanism,
    scope: AppBuilderPolicyScope.ComponentLocal,
    title: 'Styling Mechanism',
    summary: 'Source/tooling style mechanism such as global CSS, component CSS, CSS Modules, class binding, or supplied style hooks; visual taste remains separate input.',
    inputContractIds: [
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_AURELIA_STYLING_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
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
    id: AppBuilderPolicyAxisId.ValidationMechanism,
    scope: AppBuilderPolicyScope.ControlLocal,
    title: 'Validation Mechanism',
    summary: 'Field/control policy for spending field-local scalar rules as native browser constraints, validation-plugin rules, both, or explicit LLM handoff; cross-field and business validation remain separate domain design.',
    inputContractIds: [
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.DomainModel,
    ],
    inputFacetSelections: [
      APP_BUILDER_AURELIA_PLUGIN_INPUT_SELECTION,
      APP_BUILDER_DOMAIN_ENTITY_FIELD_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Native constraint slots can spend required/text/numeric field facts today; validation-library rule generation remains deferred until a shared rule contract exists.',
    }),
  },
  {
    id: AppBuilderPolicyAxisId.PluginAdmission,
    scope: AppBuilderPolicyScope.AppGlobal,
    title: 'Plugin Admission',
    summary: 'Admission of optional plugin families such as validation, i18n, state, virtual-repeat, or fetch when user/app intent calls for them.',
    inputContractIds: [AppBuilderInputContractId.AureliaPolicy],
    inputFacetSelections: [APP_BUILDER_AURELIA_PLUGIN_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
];
