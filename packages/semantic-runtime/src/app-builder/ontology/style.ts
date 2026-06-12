import {
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
  APP_BUILDER_VISUAL_DESIGN_SYSTEM_INPUT_SELECTION,
  APP_BUILDER_VISUAL_SUPPLIED_STYLE_INPUT_SELECTION,
  AppBuilderInputContractId,
  type AppBuilderInputFacetSelection,
} from './input.js';
import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  appBuilderOntologyStatus,
  type AppBuilderOntologyStatus,
} from './status.js';

/** Framework/tooling styling mechanisms app-builder should be able to name separately from visual taste. */
export enum AppBuilderStylingMechanismId {
  /** App-global stylesheet or global CSS entry. */
  GlobalStylesheet = 'global-stylesheet',
  /** Component-local stylesheet loaded with an Aurelia resource. */
  ComponentStylesheet = 'component-stylesheet',
  /** CSS Modules integration through package/build tooling. */
  CssModules = 'css-modules',
  /** Shadow DOM encapsulation and related style boundaries. */
  ShadowDom = 'shadow-dom',
  /** Aurelia class binding and class-token toggles. */
  ClassBinding = 'class-binding',
  /** Aurelia style binding and style-property toggles. */
  StyleBinding = 'style-binding',
}

/** Stable value list for styling-mechanism transport schemas. */
export const APP_BUILDER_STYLING_MECHANISM_IDS = [
  AppBuilderStylingMechanismId.GlobalStylesheet,
  AppBuilderStylingMechanismId.ComponentStylesheet,
  AppBuilderStylingMechanismId.CssModules,
  AppBuilderStylingMechanismId.ShadowDom,
  AppBuilderStylingMechanismId.ClassBinding,
  AppBuilderStylingMechanismId.StyleBinding,
] as const;

/** Visual policy ids for what app-builder should do with style input. */
export enum AppBuilderVisualPolicyId {
  /** Report that no visual input was supplied instead of inventing a fallback. */
  VisualInputMissing = 'visual-input-missing',
  /** Emit stable hooks/markers without authored visual CSS. */
  StructuralHooksOnly = 'structural-hooks-only',
  /** Accept token/class/CSS input supplied by caller, AI, or design tooling. */
  SuppliedStyleInput = 'supplied-style-input',
  /** Accept utility-class-friendly source when explicitly selected. */
  UtilityClassFriendly = 'utility-class-friendly',
  /** Accept caller-provided custom CSS as source-plan input. */
  CustomCssInput = 'custom-css-input',
  /** Carry a reference to an existing design system or component library. */
  ExistingDesignSystem = 'existing-design-system',
  /** Future app-local generated design system once style policy is grounded. */
  GeneratedLocalDesignSystem = 'generated-local-design-system',
}

/** Stable value list for visual-policy transport schemas. */
export const APP_BUILDER_VISUAL_POLICY_IDS = [
  AppBuilderVisualPolicyId.VisualInputMissing,
  AppBuilderVisualPolicyId.StructuralHooksOnly,
  AppBuilderVisualPolicyId.SuppliedStyleInput,
  AppBuilderVisualPolicyId.UtilityClassFriendly,
  AppBuilderVisualPolicyId.CustomCssInput,
  AppBuilderVisualPolicyId.ExistingDesignSystem,
  AppBuilderVisualPolicyId.GeneratedLocalDesignSystem,
] as const;

/** Read-only styling mechanism row. */
export interface AppBuilderStylingMechanismRow {
  /** Stable styling mechanism id. */
  readonly id: AppBuilderStylingMechanismId;
  /** Short display title. */
  readonly title: string;
  /** What the mechanism means in Aurelia/project source. */
  readonly summary: string;
  /** Whether app-builder should default to, defer, or require explicit selection of this mechanism. */
  readonly status: AppBuilderOntologyStatus;
}

/** Read-only visual policy row. */
export interface AppBuilderVisualPolicyRow {
  /** Stable visual policy id. */
  readonly id: AppBuilderVisualPolicyId;
  /** Short display title. */
  readonly title: string;
  /** How this policy handles visual style responsibility. */
  readonly summary: string;
  /** Input contracts needed for this policy. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Relevant facets for those contracts when the whole contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
  /** Whether this visual policy is modeled, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Initial styling mechanisms separated from app-builder recommendation policy. */
export const APP_BUILDER_STYLING_MECHANISM_ROWS: readonly AppBuilderStylingMechanismRow[] = [
  {
    id: AppBuilderStylingMechanismId.GlobalStylesheet,
    title: 'Global Stylesheet',
    summary: 'Global CSS entry or app-wide stylesheet; straightforward for AI-authored style input and existing tooling.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderStylingMechanismId.ComponentStylesheet,
    title: 'Component Stylesheet',
    summary: 'Component-local CSS asset associated with Aurelia resources.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderStylingMechanismId.CssModules,
    title: 'CSS Modules',
    summary: 'Build-tool-mediated style scoping capability; real but not the native-first default.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderStylingMechanismId.ShadowDom,
    title: 'Shadow DOM',
    summary: 'Native encapsulation mechanism; useful in some component-library contexts but not a blanket app-builder default.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderStylingMechanismId.ClassBinding,
    title: 'Class Binding',
    summary: 'Aurelia observer-backed class/object/token binding surface for state-dependent styling.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderStylingMechanismId.StyleBinding,
    title: 'Style Binding',
    summary: 'Aurelia observer-backed whole-style or property-style binding surface.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
];

/** Initial visual policies for style input responsibility. */
export const APP_BUILDER_VISUAL_POLICY_ROWS: readonly AppBuilderVisualPolicyRow[] = [
  {
    id: AppBuilderVisualPolicyId.VisualInputMissing,
    title: 'Visual Input Missing',
    summary: 'Report missing visual input and available options; do not silently invent a product taste fallback.',
    inputContractIds: [],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderVisualPolicyId.StructuralHooksOnly,
    title: 'Structural Hooks Only',
    summary: 'Emit semantic class/data hooks for AI/design tooling without committing to visual CSS.',
    inputContractIds: [AppBuilderInputContractId.VisualStyleInput],
    inputFacetSelections: [APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderVisualPolicyId.SuppliedStyleInput,
    title: 'Supplied Style Input',
    summary: 'Carry caller/AI/design-tool tokens, classes, or CSS through SourcePlan provenance.',
    inputContractIds: [AppBuilderInputContractId.VisualStyleInput],
    inputFacetSelections: [APP_BUILDER_VISUAL_SUPPLIED_STYLE_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderVisualPolicyId.UtilityClassFriendly,
    title: 'Utility-Class Friendly',
    summary: 'Allow explicit utility-class output when the caller/project policy chooses that ecosystem.',
    inputContractIds: [AppBuilderInputContractId.VisualStyleInput],
    inputFacetSelections: [APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderVisualPolicyId.CustomCssInput,
    title: 'Custom CSS Input',
    summary: 'Accept custom CSS supplied by caller/AI/design tooling as app-builder input rather than app-builder taste.',
    inputContractIds: [AppBuilderInputContractId.VisualStyleInput],
    inputFacetSelections: [APP_BUILDER_VISUAL_SUPPLIED_STYLE_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderVisualPolicyId.ExistingDesignSystem,
    title: 'Existing Design System',
    summary: 'Carry a project/external design-system reference for AI/tooling use; semantic-runtime should not infer design taste from prose.',
    inputContractIds: [AppBuilderInputContractId.VisualStyleInput],
    inputFacetSelections: [APP_BUILDER_VISUAL_DESIGN_SYSTEM_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderVisualPolicyId.GeneratedLocalDesignSystem,
    title: 'Generated Local Design System',
    summary: 'Future possibility for a generated app-local control/style system after style policy is better grounded.',
    inputContractIds: [AppBuilderInputContractId.VisualStyleInput],
    inputFacetSelections: [
      APP_BUILDER_VISUAL_SUPPLIED_STYLE_INPUT_SELECTION,
      APP_BUILDER_VISUAL_DESIGN_SYSTEM_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.ToBeDetermined,
      note: 'Generated local design-system output is intentionally parked until visual policy, component manifests, and peer-tooling boundaries are grounded.',
    }),
  },
];
