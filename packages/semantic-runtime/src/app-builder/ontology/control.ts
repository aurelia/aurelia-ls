import {
  APP_BUILDER_ACCESSIBILITY_HELP_ERROR_INPUT_SELECTION,
  APP_BUILDER_ACCESSIBILITY_LABEL_INPUT_SELECTION,
  APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
  APP_BUILDER_ACCESSIBILITY_RICH_CONTROL_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_CHOICE_FIELD_INPUT_SELECTION,
  APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
  APP_BUILDER_VISUAL_RICH_CONTROL_INPUT_SELECTION,
  AppBuilderInputContractId,
  type AppBuilderInputFacetSelection,
} from './input.js';
import {
  APP_BUILDER_CONTROLS,
  AppBuilderControlId,
} from '../control-catalog.js';
import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  appBuilderOntologyStatus,
  type AppBuilderOntologyStatus,
} from './status.js';

/** Semantic control patterns app-builder should understand before rich widget generation. */
export enum AppBuilderControlPatternId {
  /** Native text input bound through core Aurelia value channels. */
  NativeTextInput = 'native-text-input',
  /** Native number input with explicit numeric conversion/validation policy supplied later. */
  NativeNumberInput = 'native-number-input',
  /** Native date input with explicit date/value policy supplied later. */
  NativeDateInput = 'native-date-input',
  /** Native range input for bounded numeric interaction. */
  NativeRangeInput = 'native-range-input',
  /** Native checkbox for a single boolean field. */
  NativeBooleanCheckbox = 'native-boolean-checkbox',
  /** Native checkbox list for collection membership over an option domain. */
  NativeCheckboxList = 'native-checkbox-list',
  /** Native radio group with explicit option/value model. */
  NativeRadioGroup = 'native-radio-group',
  /** Native single-select control with option projection. */
  NativeSingleSelect = 'native-single-select',
  /** Native multi-select control with option projection. */
  NativeMultiSelect = 'native-multi-select',
  /** Native textarea for multiline text. */
  NativeTextarea = 'native-textarea',
  /** Native button or submit/action command. */
  NativeButton = 'native-button',
  /** Native anchor link that spends Aurelia router load navigation. */
  NativeLinkNavigation = 'native-link-navigation',
  /** Field group that ties label, control, help, and error affordances together. */
  FieldGroup = 'field-group',
  /** Form message or field feedback presentation. */
  FormMessage = 'form-message',
  /** Rich combobox/listbox widget that needs APG-grade contracts. */
  RichCombobox = 'rich-combobox',
  /** Dialog/modal widget that needs focus and lifecycle contracts. */
  RichDialog = 'rich-dialog',
}

/** Stable value list for control-pattern transport schemas. */
export const APP_BUILDER_CONTROL_PATTERN_IDS = [
  AppBuilderControlPatternId.NativeTextInput,
  AppBuilderControlPatternId.NativeNumberInput,
  AppBuilderControlPatternId.NativeDateInput,
  AppBuilderControlPatternId.NativeRangeInput,
  AppBuilderControlPatternId.NativeBooleanCheckbox,
  AppBuilderControlPatternId.NativeCheckboxList,
  AppBuilderControlPatternId.NativeRadioGroup,
  AppBuilderControlPatternId.NativeSingleSelect,
  AppBuilderControlPatternId.NativeMultiSelect,
  AppBuilderControlPatternId.NativeTextarea,
  AppBuilderControlPatternId.NativeButton,
  AppBuilderControlPatternId.NativeLinkNavigation,
  AppBuilderControlPatternId.FieldGroup,
  AppBuilderControlPatternId.FormMessage,
  AppBuilderControlPatternId.RichCombobox,
  AppBuilderControlPatternId.RichDialog,
] as const;

/** Native-first control patterns that first-ring form/source work may coordinate. */
export const APP_BUILDER_NATIVE_FORM_CONTROL_PATTERN_IDS = [
  AppBuilderControlPatternId.NativeTextInput,
  AppBuilderControlPatternId.NativeNumberInput,
  AppBuilderControlPatternId.NativeDateInput,
  AppBuilderControlPatternId.NativeRangeInput,
  AppBuilderControlPatternId.NativeBooleanCheckbox,
  AppBuilderControlPatternId.NativeCheckboxList,
  AppBuilderControlPatternId.NativeRadioGroup,
  AppBuilderControlPatternId.NativeSingleSelect,
  AppBuilderControlPatternId.NativeMultiSelect,
  AppBuilderControlPatternId.NativeTextarea,
  AppBuilderControlPatternId.NativeButton,
  AppBuilderControlPatternId.NativeLinkNavigation,
  AppBuilderControlPatternId.FieldGroup,
  AppBuilderControlPatternId.FormMessage,
] as const;

/** How a control pattern is realized in source. */
export enum AppBuilderControlRealizationPolicyId {
  /** Emit native HTML/Aurelia inline at the use site. */
  InlineNative = 'inline-native',
  /** Emit a local Aurelia wrapper component when repetition or API clarity warrants it. */
  LocalWrapperComponent = 'local-wrapper-component',
  /** Integrate an external web component or control library manifest. */
  ExternalWebComponent = 'external-web-component',
  /** Use a control already present in the existing app. */
  ExistingAppControl = 'existing-app-control',
}

/** Stable value list for control-realization policy transport schemas. */
export const APP_BUILDER_CONTROL_REALIZATION_POLICY_IDS = [
  AppBuilderControlRealizationPolicyId.InlineNative,
  AppBuilderControlRealizationPolicyId.LocalWrapperComponent,
  AppBuilderControlRealizationPolicyId.ExternalWebComponent,
  AppBuilderControlRealizationPolicyId.ExistingAppControl,
] as const;

/** Public manifest category for app-builder and semantic-runtime control facts. */
export enum AppBuilderControlManifestKind {
  /** Reusable semantic control pattern independent of a source occurrence. */
  ControlPattern = 'control-pattern',
  /** Concrete use of a control pattern in generated or existing source. */
  ControlUse = 'control-use',
  /** Public component/control API that can project to external manifest formats. */
  ComponentManifest = 'component-manifest',
}

/** Canonical control/component manifest row ids for app-builder and semantic-runtime convergence. */
export enum AppBuilderControlManifestRowId {
  /** Catalog of reusable semantic control patterns. */
  ControlPatternCatalog = 'control-pattern-catalog',
  /** Inventory of concrete inline or component-backed control uses. */
  ControlUseInventory = 'control-use-inventory',
  /** Public component/control API rows for generated or existing local components. */
  ComponentApiManifest = 'component-api-manifest',
  /** Accessibility contract rows for labels, roles, state, help, errors, and keyboard obligations. */
  AccessibilityContract = 'accessibility-contract',
  /** Value contract rows for Aurelia value, checked, select, event, class, and style channels. */
  ValueContract = 'value-contract',
  /** Style contract rows for class hooks, tokens, utility-class policy, and supplied CSS hooks. */
  StyleContract = 'style-contract',
  /** Adapter/projection rows for external component metadata formats. */
  ExternalManifestAdapter = 'external-manifest-adapter',
}

/** Stable value list for control-manifest transport schemas. */
export const APP_BUILDER_CONTROL_MANIFEST_ROW_IDS = [
  AppBuilderControlManifestRowId.ControlPatternCatalog,
  AppBuilderControlManifestRowId.ControlUseInventory,
  AppBuilderControlManifestRowId.ComponentApiManifest,
  AppBuilderControlManifestRowId.AccessibilityContract,
  AppBuilderControlManifestRowId.ValueContract,
  AppBuilderControlManifestRowId.StyleContract,
  AppBuilderControlManifestRowId.ExternalManifestAdapter,
] as const;

/** Read-only row for native/rich control terrain. */
export interface AppBuilderControlPatternRow {
  /** Stable control pattern id. */
  readonly id: AppBuilderControlPatternId;
  /** Manifest category that this row represents. */
  readonly manifestKind: AppBuilderControlManifestKind;
  /** Concrete native leaf-control descriptors coordinated by this pattern. */
  readonly leafControlIds: readonly AppBuilderControlId[];
  /** Default or relevant source realization policies. */
  readonly realizationPolicyIds: readonly AppBuilderControlRealizationPolicyId[];
  /** Short display title. */
  readonly title: string;
  /** Value, accessibility, or interaction contract this control pattern requires. */
  readonly summary: string;
  /** Required inputs before generation can emit this control honestly. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Relevant facets for those contracts when the whole contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
  /** Whether this control is modeled, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Read-only row for how a control pattern can be realized in source or existing apps. */
export interface AppBuilderControlRealizationPolicyRow {
  /** Stable control-realization policy id. */
  readonly id: AppBuilderControlRealizationPolicyId;
  /** Short display title. */
  readonly title: string;
  /** What this realization policy means and when it should stay visible. */
  readonly summary: string;
  /** Inputs needed before this realization policy can be chosen honestly. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Relevant facets for those contracts when the whole contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
  /** Whether this policy is modeled, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Read-only scaffold row for canonical control/component manifests. */
export interface AppBuilderControlManifestRow {
  /** Stable manifest scaffold id. */
  readonly id: AppBuilderControlManifestRowId;
  /** Manifest category represented by this row. */
  readonly manifestKind: AppBuilderControlManifestKind;
  /** Short display title. */
  readonly title: string;
  /** What this manifest row will eventually describe or project. */
  readonly summary: string;
  /** Required inputs before a generated manifest row can be complete. */
  readonly inputContractIds: readonly AppBuilderInputContractId[];
  /** Relevant facets for those contracts when the whole contract would be too broad. */
  readonly inputFacetSelections?: readonly AppBuilderInputFacetSelection[];
  /** Whether this manifest row is modeled, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

const APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS = [
  AppBuilderInputContractId.DomainModel,
  AppBuilderInputContractId.ControlAccessibility,
  AppBuilderInputContractId.VisualStyleInput,
] as const satisfies readonly AppBuilderInputContractId[];

const APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_SELECTIONS = [
  APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
  APP_BUILDER_ACCESSIBILITY_LABEL_INPUT_SELECTION,
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
] as const satisfies readonly AppBuilderInputFacetSelection[];

const APP_BUILDER_NATIVE_CHOICE_CONTROL_INPUT_SELECTIONS = [
  APP_BUILDER_DOMAIN_CHOICE_FIELD_INPUT_SELECTION,
  APP_BUILDER_ACCESSIBILITY_LABEL_INPUT_SELECTION,
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
] as const satisfies readonly AppBuilderInputFacetSelection[];

const APP_BUILDER_NATIVE_BUTTON_INPUT_SELECTIONS = [
  APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
  APP_BUILDER_ACCESSIBILITY_LABEL_INPUT_SELECTION,
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
] as const satisfies readonly AppBuilderInputFacetSelection[];

const APP_BUILDER_FIELD_GROUP_INPUT_SELECTIONS = [
  APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
  APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
] as const satisfies readonly AppBuilderInputFacetSelection[];

const APP_BUILDER_FORM_MESSAGE_INPUT_CONTRACT_IDS = [
  AppBuilderInputContractId.ControlAccessibility,
  AppBuilderInputContractId.VisualStyleInput,
] as const satisfies readonly AppBuilderInputContractId[];

const APP_BUILDER_FORM_MESSAGE_INPUT_SELECTIONS = [
  APP_BUILDER_ACCESSIBILITY_HELP_ERROR_INPUT_SELECTION,
  APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
] as const satisfies readonly AppBuilderInputFacetSelection[];

/** Initial source-realization policy terrain for generated or analyzed controls. */
export const APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS: readonly AppBuilderControlRealizationPolicyRow[] = [
  {
    id: AppBuilderControlRealizationPolicyId.InlineNative,
    title: 'Inline Native Control',
    summary: 'Use ordinary native HTML plus Aurelia bindings at the control use site; recommended until repetition, API clarity, or behavior warrants a wrapper.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Realization policies are selectable inputs for source lowerers; source-lowering invocation targets the concrete control pattern that spends the policy.',
    }),
  },
  {
    id: AppBuilderControlRealizationPolicyId.LocalWrapperComponent,
    title: 'Local Wrapper Component',
    summary: 'Generate or use an app-local Aurelia custom element when repeated control structure, accessibility wiring, or API clarity beats inline markup.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
      AppBuilderInputContractId.SourcePlacement,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Keep visible for the future local controls-library lane, but do not make wrapper extraction a v1 edit/source mutation; source-lowering invocation targets concrete control patterns.',
    }),
  },
  {
    id: AppBuilderControlRealizationPolicyId.ExternalWebComponent,
    title: 'External Web Component',
    summary: 'Integrate a package-provided or design-system web component through normalized component/control manifest facts when external metadata exists.',
    inputContractIds: [
      AppBuilderInputContractId.ExistingAppFacts,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_VISUAL_RICH_CONTROL_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'External component metadata should normalize into semantic-runtime manifests before app-builder treats it as source-generation terrain.',
    }),
  },
  {
    id: AppBuilderControlRealizationPolicyId.ExistingAppControl,
    title: 'Existing App Control',
    summary: 'Use a control already present in an opened app when semantic-runtime can prove the component/control manifest facts and the AI decides it fits.',
    inputContractIds: [AppBuilderInputContractId.ExistingAppFacts],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Existing controls are app facts that an AI may choose after analysis; they are not generated by source-lowering-implemented source invocation.',
    }),
  },
];

/** Initial native-first control terrain for app-builder v1. */
export const APP_BUILDER_CONTROL_PATTERN_ROWS: readonly AppBuilderControlPatternRow[] = [
  {
    id: AppBuilderControlPatternId.NativeTextInput,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.TextInput],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Text Input',
    summary: 'Core text value channel with an accessible-name contract and optional style hooks.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeNumberInput,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.NumberInput],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Number Input',
    summary: 'Native numeric input; conversion, range, and validation policy should be explicit rather than guessed.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeDateInput,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.DateInput],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Date Input',
    summary: 'Native date value channel for date-like domain fields; caller/domain policy still owns formatting outside the control value boundary.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeRangeInput,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.RangeInput],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Range Input',
    summary: 'Native range slider over a bounded numeric field; min/max/step policy should be explicit.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeBooleanCheckbox,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.Checkbox],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Boolean Checkbox',
    summary: 'Single boolean checked channel for on/off domain fields.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeCheckboxList,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.CheckboxList],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Checkbox List',
    summary: 'Checked collection-membership channel over an explicit option/value domain.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_CHOICE_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeRadioGroup,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.RadioGroup],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Radio Group',
    summary: 'Choice set where one option is selected; app-builder needs option/value projection rather than inventing option labels.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_CHOICE_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeSingleSelect,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.SingleSelect],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Single Select',
    summary: 'Single-select option projection through core Aurelia option/value channels for scalar choice fields.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_CHOICE_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeMultiSelect,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.MultiSelect],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Multi Select',
    summary: 'Multi-select option projection through core Aurelia option/value channels for choice-set fields.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_CHOICE_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeTextarea,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [AppBuilderControlId.TextArea],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Textarea',
    summary: 'Multiline text value channel with ordinary Aurelia binding, accessible-name input, and optional style hooks.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeButton,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Button',
    summary: 'Native action button using ordinary event binding now, with submit/reset button type visible before full submit workflow policy is modeled.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: APP_BUILDER_NATIVE_BUTTON_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'App-builder source lowering emits explicit native button type and event binding; full form submit workflow semantics remain a separate future policy.',
    }),
  },
  {
    id: AppBuilderControlPatternId.NativeLinkNavigation,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Native Link Navigation',
    summary: 'Native anchor using Aurelia router load navigation for navigation-scoped domain actions.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.AureliaPolicy,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_ACTION_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_LABEL_INPUT_SELECTION,
      APP_BUILDER_VISUAL_CLASS_HOOK_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'RouteNavigationAction source lowering emits this control occurrence from explicit navigation action, route instruction, and link text; the control pattern itself is not a standalone source-lowering target.',
    }),
  },
  {
    id: AppBuilderControlPatternId.FieldGroup,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [],
    realizationPolicyIds: [
      AppBuilderControlRealizationPolicyId.InlineNative,
      AppBuilderControlRealizationPolicyId.LocalWrapperComponent,
    ],
    title: 'Field Group',
    summary: 'Groups label, control, help, and errors; may stay inline until repetition proves a wrapper component is useful.',
    inputContractIds: APP_BUILDER_NATIVE_FIELD_CONTROL_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_FIELD_GROUP_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.FormMessage,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [],
    realizationPolicyIds: [AppBuilderControlRealizationPolicyId.InlineNative],
    title: 'Form Message',
    summary: 'Help, error, or status message associated with a field or form action.',
    inputContractIds: APP_BUILDER_FORM_MESSAGE_INPUT_CONTRACT_IDS,
    inputFacetSelections: APP_BUILDER_FORM_MESSAGE_INPUT_SELECTIONS,
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: true,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderControlPatternId.RichCombobox,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [],
    realizationPolicyIds: [
      AppBuilderControlRealizationPolicyId.LocalWrapperComponent,
      AppBuilderControlRealizationPolicyId.ExternalWebComponent,
    ],
    title: 'Rich Combobox',
    summary: 'Deferred APG-grade rich widget that needs keyboard, ARIA, filtering, and manifest contracts before generation.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_CHOICE_FIELD_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_RICH_CONTROL_INPUT_SELECTION,
      APP_BUILDER_VISUAL_RICH_CONTROL_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderControlPatternId.RichDialog,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    leafControlIds: [],
    realizationPolicyIds: [
      AppBuilderControlRealizationPolicyId.LocalWrapperComponent,
      AppBuilderControlRealizationPolicyId.ExternalWebComponent,
    ],
    title: 'Rich Dialog',
    summary: 'Deferred rich widget with focus, lifecycle, overlay, and accessibility obligations.',
    inputContractIds: [
      AppBuilderInputContractId.ControlAccessibility,
      AppBuilderInputContractId.VisualStyleInput,
    ],
    inputFacetSelections: [
      APP_BUILDER_ACCESSIBILITY_RICH_CONTROL_INPUT_SELECTION,
      APP_BUILDER_VISUAL_RICH_CONTROL_INPUT_SELECTION,
    ],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
];

const APP_BUILDER_LEAF_CONTROL_ID_BY_PATTERN_ID = new Map<AppBuilderControlPatternId, AppBuilderControlId>(
  APP_BUILDER_CONTROL_PATTERN_ROWS.flatMap((row) =>
    row.leafControlIds.length === 1
      ? [[row.id, row.leafControlIds[0] as AppBuilderControlId]]
      : []
  ),
);

const APP_BUILDER_CONTROL_PATTERN_ID_BY_LEAF_CONTROL_ID = new Map<AppBuilderControlId, AppBuilderControlPatternId>(
  APP_BUILDER_CONTROL_PATTERN_ROWS.flatMap((row) =>
    row.leafControlIds.map((controlId) => [controlId, row.id])
  ),
);

assertCompleteLeafControlPatternMapping();

/** Return the single leaf control realized by a control pattern, if the pattern is a leaf-control pattern. */
export function appBuilderLeafControlIdForControlPatternId(
  controlPatternId: AppBuilderControlPatternId,
): AppBuilderControlId | null {
  return APP_BUILDER_LEAF_CONTROL_ID_BY_PATTERN_ID.get(controlPatternId) ?? null;
}

/** Return the app-builder control pattern that owns a leaf control descriptor. */
export function appBuilderControlPatternIdForLeafControlId(
  controlId: AppBuilderControlId,
): AppBuilderControlPatternId {
  const patternId = APP_BUILDER_CONTROL_PATTERN_ID_BY_LEAF_CONTROL_ID.get(controlId);
  if (patternId == null) {
    throw new Error(`Leaf control '${controlId}' has no app-builder control-pattern row.`);
  }
  return patternId;
}

function assertCompleteLeafControlPatternMapping(): void {
  const seenControlIds = new Set<AppBuilderControlId>();
  for (const [patternId, controlId] of APP_BUILDER_LEAF_CONTROL_ID_BY_PATTERN_ID) {
    if (seenControlIds.has(controlId)) {
      throw new Error(`Leaf control '${controlId}' is mapped by more than one control-pattern row.`);
    }
    seenControlIds.add(controlId);
    const controlPattern = APP_BUILDER_CONTROL_PATTERN_ROWS.find((row) => row.id === patternId);
    if (controlPattern == null) {
      throw new Error(`Leaf control '${controlId}' maps to unknown control-pattern '${patternId}'.`);
    }
  }
  for (const control of APP_BUILDER_CONTROLS) {
    if (!seenControlIds.has(control.id)) {
      throw new Error(`Leaf control '${control.id}' has no app-builder control-pattern row.`);
    }
  }
}

/** Initial canonical manifest scaffold for generated and analyzed controls. */
export const APP_BUILDER_CONTROL_MANIFEST_ROWS: readonly AppBuilderControlManifestRow[] = [
  {
    id: AppBuilderControlManifestRowId.ControlPatternCatalog,
    manifestKind: AppBuilderControlManifestKind.ControlPattern,
    title: 'Control Pattern Catalog',
    summary: 'Reusable semantic control patterns independent of one source occurrence or component wrapper.',
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
    id: AppBuilderControlManifestRowId.ControlUseInventory,
    manifestKind: AppBuilderControlManifestKind.ControlUse,
    title: 'Control Use Inventory',
    summary: 'Concrete control occurrences in generated or existing source, including inline native controls when no marker is present.',
    inputContractIds: [AppBuilderInputContractId.SourcePlacement],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'App-builder source-lowering invocation/composition answers emit generated control-use rows, and semantic-runtime exposes authored native control uses through the control-use-inventory app query. Wrapper/external manifests and richer grouping remain future manifest work.',
    }),
  },
  {
    id: AppBuilderControlManifestRowId.ComponentApiManifest,
    manifestKind: AppBuilderControlManifestKind.ComponentManifest,
    title: 'Component API Manifest',
    summary: 'Canonical semantic-runtime component/control API rows before projecting to Custom Elements Manifest, VS Code custom data, web-types, or other external formats.',
    inputContractIds: [
      AppBuilderInputContractId.DomainModel,
      AppBuilderInputContractId.ControlAccessibility,
    ],
    inputFacetSelections: [
      APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION,
      APP_BUILDER_ACCESSIBILITY_LABEL_HELP_INPUT_SELECTION,
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
    id: AppBuilderControlManifestRowId.AccessibilityContract,
    manifestKind: AppBuilderControlManifestKind.ComponentManifest,
    title: 'Accessibility Contract',
    summary: 'Label, role, described-by, error, help, state, and keyboard obligations that generated or analyzed controls should expose structurally.',
    inputContractIds: [AppBuilderInputContractId.ControlAccessibility],
    inputFacetSelections: [APP_BUILDER_ACCESSIBILITY_RICH_CONTROL_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderControlManifestRowId.ValueContract,
    manifestKind: AppBuilderControlManifestKind.ComponentManifest,
    title: 'Value Contract',
    summary: 'Aurelia value, checked, select, event, class, and style channels as the generated/analyzed control value surface.',
    inputContractIds: [AppBuilderInputContractId.DomainModel],
    inputFacetSelections: [APP_BUILDER_DOMAIN_FIELD_INPUT_SELECTION],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.SourceBacked,
    }),
  },
  {
    id: AppBuilderControlManifestRowId.StyleContract,
    manifestKind: AppBuilderControlManifestKind.ComponentManifest,
    title: 'Style Contract',
    summary: 'Class hooks, token hooks, utility-class posture, and supplied CSS hooks; visual CSS remains caller/AI/design-tool input.',
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
    id: AppBuilderControlManifestRowId.ExternalManifestAdapter,
    manifestKind: AppBuilderControlManifestKind.ComponentManifest,
    title: 'External Manifest Adapter',
    summary: 'Projection/adaptation to external component metadata such as Custom Elements Manifest, VS Code custom data, web-types, Storybook, or design-tool registries.',
    inputContractIds: [AppBuilderInputContractId.ExistingAppFacts],
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Deferred,
      requiresExplicitInput: true,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
];
