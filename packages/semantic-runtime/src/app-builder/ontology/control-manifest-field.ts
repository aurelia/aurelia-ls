import {
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlFieldLabelContainerKind,
  AppBuilderControlId,
  AppBuilderControlSemanticValueKind,
  AppBuilderControlTransportKind,
  APP_BUILDER_CONTROLS,
} from '../control-catalog.js';
import { RUNTIME_BINDING_VALUE_CHANNEL_KINDS } from '../../observation/runtime-binding-observation.js';
import {
  BuiltInBindingCommandName,
  BuiltInBindingCommandTargetName,
} from '../../template/built-in-syntax.js';
import {
  AppBuilderControlManifestRowId,
  AppBuilderControlRealizationPolicyId,
} from './control.js';
import {
  AppBuilderInputFacetId,
} from './input.js';
import {
  appBuilderEnumValues,
} from './detail-helpers.js';
import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  appBuilderOntologyStatus,
  type AppBuilderOntologyStatus,
} from './status.js';

/** Stable field ids for the canonical component/control manifest descriptor surface. */
export enum AppBuilderControlManifestFieldId {
  /** Reusable control-pattern row identity. */
  ControlPatternId = 'control-pattern-id',
  /** Leaf native control ids that a control pattern can realize. */
  ControlPatternLeafControlIds = 'control-pattern-leaf-control-ids',
  /** Source-realization policies attached to a control pattern. */
  ControlPatternRealizationPolicyIds = 'control-pattern-realization-policy-ids',
  /** Concrete leaf control identity. */
  LeafControlId = 'leaf-control-id',
  /** Semantic value shape of a leaf control. */
  LeafControlSemanticValueKind = 'leaf-control-semantic-value-kind',
  /** Native/control-side transport mechanism. */
  LeafControlTransportKind = 'leaf-control-transport-kind',
  /** Built-in binding target/property used by the control. */
  LeafControlBindingTargetName = 'leaf-control-binding-target-name',
  /** Built-in binding command used by the control. */
  LeafControlBindingCommandName = 'leaf-control-binding-command-name',
  /** Runtime value-channel kinds realized by the control. */
  LeafControlValueChannelKind = 'leaf-control-value-channel-kind',
  /** Label container generated field groups should use for the control source shape. */
  LeafControlFieldLabelContainerKind = 'leaf-control-field-label-container-kind',
  /** Native descendant tag that receives visual hooks for compound control fragments. */
  LeafControlVisualHookDescendantTagName = 'leaf-control-visual-hook-descendant-tag-name',
  /** Option-domain binding form for choice-like controls. */
  ChoiceOptionBindingKind = 'choice-option-binding-kind',
  /** Source reference for a concrete generated or existing control use. */
  ControlUseSourceReference = 'control-use-source-reference',
  /** Realization policy proven or selected for a concrete control use. */
  ControlUseRealizationPolicyId = 'control-use-realization-policy-id',
  /** Component/resource identity for a wrapper or existing local control. */
  ComponentResourceIdentity = 'component-resource-identity',
  /** Component bindable or public API member exposed by a wrapper/external component. */
  ComponentApiMember = 'component-api-member',
  /** Label/description/legend accessibility input or analyzed fact. */
  AccessibilityLabelFacet = 'accessibility-label-facet',
  /** Help/error/status accessibility relationship input or analyzed fact. */
  AccessibilityHelpErrorFacet = 'accessibility-help-error-facet',
  /** Role, state, and keyboard accessibility behavior for rich controls. */
  AccessibilityInteractionFacet = 'accessibility-interaction-facet',
  /** Domain/source binding expression connected to a control value surface. */
  ValueBindingSource = 'value-binding-source',
  /** Stable class/data hook surface used by generated/analyzed controls. */
  StyleClassHookFacet = 'style-class-hook-facet',
  /** Visual token or custom-property hook surface. */
  StyleTokenFacet = 'style-token-facet',
  /** External manifest or component metadata format being adapted. */
  ExternalManifestFormat = 'external-manifest-format',
  /** Adapter identity that produced a normalized external manifest projection. */
  ExternalManifestAdapterIdentity = 'external-manifest-adapter-identity',
}

/** Stable value list for control-manifest field transport schemas. */
export const APP_BUILDER_CONTROL_MANIFEST_FIELD_IDS = [
  AppBuilderControlManifestFieldId.ControlPatternId,
  AppBuilderControlManifestFieldId.ControlPatternLeafControlIds,
  AppBuilderControlManifestFieldId.ControlPatternRealizationPolicyIds,
  AppBuilderControlManifestFieldId.LeafControlId,
  AppBuilderControlManifestFieldId.LeafControlSemanticValueKind,
  AppBuilderControlManifestFieldId.LeafControlTransportKind,
  AppBuilderControlManifestFieldId.LeafControlBindingTargetName,
  AppBuilderControlManifestFieldId.LeafControlBindingCommandName,
  AppBuilderControlManifestFieldId.LeafControlValueChannelKind,
  AppBuilderControlManifestFieldId.LeafControlFieldLabelContainerKind,
  AppBuilderControlManifestFieldId.LeafControlVisualHookDescendantTagName,
  AppBuilderControlManifestFieldId.ChoiceOptionBindingKind,
  AppBuilderControlManifestFieldId.ControlUseSourceReference,
  AppBuilderControlManifestFieldId.ControlUseRealizationPolicyId,
  AppBuilderControlManifestFieldId.ComponentResourceIdentity,
  AppBuilderControlManifestFieldId.ComponentApiMember,
  AppBuilderControlManifestFieldId.AccessibilityLabelFacet,
  AppBuilderControlManifestFieldId.AccessibilityHelpErrorFacet,
  AppBuilderControlManifestFieldId.AccessibilityInteractionFacet,
  AppBuilderControlManifestFieldId.ValueBindingSource,
  AppBuilderControlManifestFieldId.StyleClassHookFacet,
  AppBuilderControlManifestFieldId.StyleTokenFacet,
  AppBuilderControlManifestFieldId.ExternalManifestFormat,
  AppBuilderControlManifestFieldId.ExternalManifestAdapterIdentity,
] as const;

/** Read-only descriptor for one field in a canonical control/component manifest row. */
export interface AppBuilderControlManifestFieldDescriptorRow {
  /** Stable field descriptor id. */
  readonly id: AppBuilderControlManifestFieldId;
  /** Manifest row this field belongs to. */
  readonly manifestRowId: AppBuilderControlManifestRowId;
  /** Short display title. */
  readonly title: string;
  /** What this field means in the canonical manifest contract. */
  readonly summary: string;
  /** Existing source/API path, input facet, or future product family that grounds the field. */
  readonly sourcePath: string;
  /** Known enum/value inventory when this field is already grounded by semantic-runtime substrate. */
  readonly valueSet?: readonly string[];
  /** Whether this field is modeled, source-lowerable, defaulted, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Initial manifest field descriptor rows for the read-only app-builder control manifest. */
export const APP_BUILDER_CONTROL_MANIFEST_FIELD_DESCRIPTOR_ROWS: readonly AppBuilderControlManifestFieldDescriptorRow[] = [
  descriptor(
    AppBuilderControlManifestFieldId.ControlPatternId,
    AppBuilderControlManifestRowId.ControlPatternCatalog,
    'Control Pattern Id',
    'Identifies one reusable control pattern row independently of any source occurrence.',
    'APP_BUILDER_CONTROL_PATTERN_ROWS[].id',
    undefined,
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ControlPatternLeafControlIds,
    AppBuilderControlManifestRowId.ControlPatternCatalog,
    'Leaf Control Ids',
    'Connects a semantic control pattern to concrete native leaf controls from the existing control catalog.',
    'APP_BUILDER_CONTROL_PATTERN_ROWS[].leafControlIds',
    enumValuesFromRows(APP_BUILDER_CONTROLS.map((row) => row.id)),
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ControlPatternRealizationPolicyIds,
    AppBuilderControlManifestRowId.ControlPatternCatalog,
    'Realization Policy Ids',
    'Names the inline, wrapper, external, or existing-control source realization policies a control pattern can use.',
    'APP_BUILDER_CONTROL_PATTERN_ROWS[].realizationPolicyIds',
    appBuilderEnumValues(AppBuilderControlRealizationPolicyId),
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.LeafControlId,
    AppBuilderControlManifestRowId.ValueContract,
    'Leaf Control Id',
    'Concrete native leaf control participating in the value contract.',
    'APP_BUILDER_CONTROLS[].id',
    appBuilderEnumValues(AppBuilderControlId),
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.LeafControlSemanticValueKind,
    AppBuilderControlManifestRowId.ValueContract,
    'Semantic Value Kind',
    'Semantic value shape naturally represented by the control before validation or domain policy is applied.',
    'APP_BUILDER_CONTROLS[].semanticValueKind',
    appBuilderEnumValues(AppBuilderControlSemanticValueKind),
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.LeafControlTransportKind,
    AppBuilderControlManifestRowId.ValueContract,
    'Transport Kind',
    'Native/control-side transport mechanism, such as value string, checked boolean, choice, or collection membership.',
    'APP_BUILDER_CONTROLS[].transportKind',
    appBuilderEnumValues(AppBuilderControlTransportKind),
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.LeafControlBindingTargetName,
    AppBuilderControlManifestRowId.ValueContract,
    'Binding Target',
    'Built-in binding target or DOM property that the control binds.',
    'APP_BUILDER_CONTROLS[].bindingTargetName',
    appBuilderEnumValues(BuiltInBindingCommandTargetName),
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.LeafControlBindingCommandName,
    AppBuilderControlManifestRowId.ValueContract,
    'Binding Command',
    'Built-in binding command used to connect the source expression to the control target.',
    'APP_BUILDER_CONTROLS[].syntax.commandName',
    appBuilderEnumValues(BuiltInBindingCommandName),
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.LeafControlValueChannelKind,
    AppBuilderControlManifestRowId.ValueContract,
    'Value Channel Kind',
    'Runtime binding value-channel family that the control realizes in semantic-runtime observation products.',
    'APP_BUILDER_CONTROLS[].valueChannels',
    RUNTIME_BINDING_VALUE_CHANNEL_KINDS,
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.LeafControlFieldLabelContainerKind,
    AppBuilderControlManifestRowId.ValueContract,
    'Field Label Container',
    'Whether generated field groups should label the control with a direct label or a fieldset/legend group.',
    'APP_BUILDER_CONTROLS[].fieldLabelContainerKind',
    appBuilderEnumValues(AppBuilderControlFieldLabelContainerKind),
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.LeafControlVisualHookDescendantTagName,
    AppBuilderControlManifestRowId.ValueContract,
    'Visual Hook Descendant Tag',
    'Native descendant tag that receives generated visual hook attributes when the control source fragment is a compound wrapper.',
    'APP_BUILDER_CONTROLS[].visualHookDescendantTagName',
    enumValuesFromRows(APP_BUILDER_CONTROLS.map((row) => row.visualHookDescendantTagName ?? 'control-fragment')),
    AppBuilderRecommendationStatus.Contextual,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ChoiceOptionBindingKind,
    AppBuilderControlManifestRowId.ValueContract,
    'Choice Option Binding Kind',
    'Choice-domain binding form for option values, including native value semantics and Aurelia model binding.',
    'APP_BUILDER_CONTROLS[].optionBindingKinds',
    appBuilderEnumValues(AppBuilderChoiceOptionBindingKind),
    AppBuilderRecommendationStatus.Contextual,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ControlUseSourceReference,
    AppBuilderControlManifestRowId.ControlUseInventory,
    'Control Use Source Reference',
    'Authored source locus for a concrete inline native, wrapper, external, or existing control use.',
    'AppBuilderControlUseInventoryRow.sourceReference',
    undefined,
    AppBuilderRecommendationStatus.Contextual,
    'App-builder source lowering emits generated-source control-use rows; semantic-runtime control-use-inventory emits authored native control source rows. Wrapper/external component grouping remains future product work.',
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ControlUseRealizationPolicyId,
    AppBuilderControlManifestRowId.ControlUseInventory,
    'Control Use Realization Policy',
    'Realization policy proven or selected for a concrete control use.',
    'AppBuilderControlUseInventoryRow.realizationPolicyId',
    appBuilderEnumValues(AppBuilderControlRealizationPolicyId),
    AppBuilderRecommendationStatus.Contextual,
    'Generated lowerers prove inline-native control uses, while authored-source inventory reports existing inline-native rows through control-use-inventory. Wrapper and external rows remain visible future terrain.',
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ComponentResourceIdentity,
    AppBuilderControlManifestRowId.ComponentApiManifest,
    'Component Resource Identity',
    'Canonical component/resource identity for generated, existing, or external controls.',
    'semantic-runtime resource-definition/source-reference products',
    undefined,
    AppBuilderRecommendationStatus.Contextual,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ComponentApiMember,
    AppBuilderControlManifestRowId.ComponentApiManifest,
    'Component API Member',
    'Public bindable/member/event slot exposed by a component-backed control.',
    'semantic-runtime resource bindable/member products',
    undefined,
    AppBuilderRecommendationStatus.Contextual,
    'The manifest contract is modeled; component API rows need deeper generated/existing component manifest products.',
  ),
  descriptor(
    AppBuilderControlManifestFieldId.AccessibilityLabelFacet,
    AppBuilderControlManifestRowId.AccessibilityContract,
    'Accessibility Label Facet',
    'Label, description, and legend payload or analyzed fact for control accessibility.',
    `AppBuilderInputFacetId.${AppBuilderInputFacetId.AccessibilityLabels}`,
    [AppBuilderInputFacetId.AccessibilityLabels],
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.AccessibilityHelpErrorFacet,
    AppBuilderControlManifestRowId.AccessibilityContract,
    'Accessibility Help/Error Facet',
    'Help text, error text, and status relationship payload or analyzed fact for controls and forms.',
    `AppBuilderInputFacetId.${AppBuilderInputFacetId.AccessibilityHelpError}`,
    [AppBuilderInputFacetId.AccessibilityHelpError],
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.AccessibilityInteractionFacet,
    AppBuilderControlManifestRowId.AccessibilityContract,
    'Accessibility Interaction Facet',
    'Role, state, keyboard, and rich-control behavior payload or analyzed fact.',
    `AppBuilderInputFacetId.${AppBuilderInputFacetId.AccessibilityInteraction}`,
    [AppBuilderInputFacetId.AccessibilityInteraction],
    AppBuilderRecommendationStatus.Contextual,
    'Rich-control interaction contracts are visible but deferred until APG/widget behavior is modeled.',
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ValueBindingSource,
    AppBuilderControlManifestRowId.ValueContract,
    'Value Binding Source',
    'Domain/source expression connected to a control value, checked, select, or event surface.',
    'semantic-runtime binding source/value-channel products',
    undefined,
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.StyleClassHookFacet,
    AppBuilderControlManifestRowId.StyleContract,
    'Style Class Hook Facet',
    'Stable classes, data attributes, or utility-class posture accepted as style input.',
    `AppBuilderInputFacetId.${AppBuilderInputFacetId.VisualClassHooks}`,
    [AppBuilderInputFacetId.VisualClassHooks],
    AppBuilderRecommendationStatus.Recommendable,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.StyleTokenFacet,
    AppBuilderControlManifestRowId.StyleContract,
    'Style Token Facet',
    'Design tokens or CSS custom-property hooks accepted as style input.',
    `AppBuilderInputFacetId.${AppBuilderInputFacetId.VisualTokens}`,
    [AppBuilderInputFacetId.VisualTokens],
    AppBuilderRecommendationStatus.Contextual,
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ExternalManifestFormat,
    AppBuilderControlManifestRowId.ExternalManifestAdapter,
    'External Manifest Format',
    'External metadata format being adapted into the canonical semantic-runtime manifest.',
    'future external manifest adapter projection',
    ['custom-elements-manifest', 'vscode-custom-data', 'web-types', 'storybook-csf', 'design-tool-registry'],
    AppBuilderRecommendationStatus.Deferred,
    'External adapters are interoperability projections, not the canonical manifest source.',
  ),
  descriptor(
    AppBuilderControlManifestFieldId.ExternalManifestAdapterIdentity,
    AppBuilderControlManifestRowId.ExternalManifestAdapter,
    'External Manifest Adapter Identity',
    'Adapter or detector identity that produced a normalized external component/control manifest projection.',
    'future external manifest adapter projection',
    undefined,
    AppBuilderRecommendationStatus.Deferred,
  ),
];

function descriptor(
  id: AppBuilderControlManifestFieldId,
  manifestRowId: AppBuilderControlManifestRowId,
  title: string,
  summary: string,
  sourcePath: string,
  valueSet: readonly string[] | undefined,
  recommendationStatus: AppBuilderRecommendationStatus,
  note?: string,
): AppBuilderControlManifestFieldDescriptorRow {
  return {
    id,
    manifestRowId,
    title,
    summary,
    sourcePath,
    ...(valueSet == null ? {} : { valueSet }),
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      ...(note == null ? {} : { note }),
    }),
  };
}

function enumValuesFromRows(
  values: readonly string[],
): readonly string[] {
  return [...new Set(values)];
}
