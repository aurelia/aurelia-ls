import {
  AppBuilderAffordanceId,
} from '../ontology/affordance.js';
import {
  AppBuilderApplicationPatternId,
} from '../ontology/application-pattern.js';
import {
  AppBuilderCollectionConceptId,
} from '../ontology/collection.js';
import {
  AppBuilderControlManifestRowId,
  AppBuilderControlPatternId,
  AppBuilderControlRealizationPolicyId,
} from '../ontology/control.js';
import {
  AppBuilderPolicyAxisId,
} from '../ontology/policy.js';
import {
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRowRef,
} from '../ontology/relation.js';
import {
  AppBuilderRecommendationStatus,
} from '../ontology/status.js';
import {
  AppBuilderStylingMechanismId,
  AppBuilderVisualPolicyId,
} from '../ontology/style.js';

/** Local policy area in which a row may serve as a fallback candidate after caller intent narrows the context. */
export enum AppBuilderDefaultingCandidatePolicyScope {
  /** Blank-slate intake and first menu orientation. */
  Intake = 'intake',
  /** App shell and runnable root assembly. */
  AppShell = 'app-shell',
  /** Application-pattern selection after a user task has narrowed the design problem. */
  ApplicationPattern = 'application-pattern',
  /** Collection source/query/projection modeling. */
  CollectionModeling = 'collection-modeling',
  /** Control realization mode for how one selected field/control becomes source. */
  ControlRealization = 'control-realization',
  /** Native browser control selection inside a chosen field/control context. */
  NativeControl = 'native-control',
  /** Component/control manifest facts used for generated and analyzed controls. */
  ControlManifest = 'control-manifest',
  /** App-builder policy axes that can receive caller/project defaults. */
  PolicyAxis = 'policy-axis',
  /** Styling mechanism choices after visual input and project policy narrow the context. */
  Styling = 'styling',
  /** Visual policy posture when app-builder spends caller-provided design hooks without inventing a style system. */
  VisualPolicy = 'visual-policy',
}

/** Operator-reviewable row explaining why a target can be a local defaulting candidate. */
export interface AppBuilderDefaultingCandidatePolicyRow {
  /** Exact target admitted into the local defaulting-candidate policy table. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Policy area where this candidate is allowed to act as a local fallback. */
  readonly scope: AppBuilderDefaultingCandidatePolicyScope;
  /** Review rationale; this is policy explanation, not source-lowering behavior. */
  readonly summary: string;
}

/** Return whether a recommendation posture can appear as a local defaulting candidate. */
export function appBuilderRecommendationAllowsDefaultingCandidate(
  recommendationStatus: AppBuilderRecommendationStatus,
): boolean {
  return recommendationStatus === AppBuilderRecommendationStatus.Recommendable
    || recommendationStatus === AppBuilderRecommendationStatus.Contextual;
}

/** Return whether a row is currently admitted into the reviewable local defaulting-candidate policy. */
export function appBuilderDefaultingCandidateForTarget(
  targetRef: AppBuilderOntologyRowRef,
  recommendationStatus: AppBuilderRecommendationStatus,
): boolean {
  return appBuilderRecommendationAllowsDefaultingCandidate(recommendationStatus)
    && appBuilderDefaultingCandidatePolicyIncludesTarget(targetRef);
}

/** Return whether the central policy table lists a row before recommendation-posture validation. */
export function appBuilderDefaultingCandidatePolicyIncludesTarget(
  targetRef: AppBuilderOntologyRowRef,
): boolean {
  return APP_BUILDER_DEFAULTING_CANDIDATE_REF_KEYS.has(appBuilderDefaultingPolicyTargetRefKey(targetRef));
}

/** Return the reviewable local defaulting-candidate policy row for a target, when present. */
export function appBuilderDefaultingCandidatePolicyRow(
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderDefaultingCandidatePolicyRow | null {
  return APP_BUILDER_DEFAULTING_CANDIDATE_POLICY_ROWS_BY_KEY.get(
    appBuilderDefaultingPolicyTargetRefKey(targetRef),
  ) ?? null;
}

/** Provisional operator-reviewable local defaulting candidate policy table migrated out of row-local status. */
export const APP_BUILDER_DEFAULTING_CANDIDATE_POLICY_ROWS: readonly AppBuilderDefaultingCandidatePolicyRow[] = [
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.Affordance, AppBuilderAffordanceId.BlankSlateIntake, AppBuilderDefaultingCandidatePolicyScope.Intake, 'The blank-slate intake affordance is the safe first orientation handle when there is not yet an existing app context.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.Affordance, AppBuilderAffordanceId.NativeControlManifest, AppBuilderDefaultingCandidatePolicyScope.Intake, 'Native control manifests are useful early orientation facts for AI callers without forcing source generation.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.Affordance, AppBuilderAffordanceId.CreateSubmitForm, AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern, 'Create-and-submit form flow is a common app-building move once a domain action is selected.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.Affordance, AppBuilderAffordanceId.CollectionBrowse, AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern, 'Collection browsing is a common app-building move once a collection source and display projection are selected.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.AppShell, AppBuilderDefaultingCandidatePolicyScope.AppShell, 'A runnable app shell is the local fallback once the caller asks for a new app or runnable generated output.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.NativeControlBinding, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native control binding is the low-boilerplate local fallback when the selected field can be represented by a browser control.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.CollectionList, AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern, 'Collection list is the simplest collection presentation fallback when caller projection does not require card or table mechanics.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.LoadingEmptyErrorState, AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern, 'Loading/empty/error state is a compact framework-native wrapper when the caller supplies a promise or async boundary.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.DomainCommandAction, AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern, 'Domain command action is the local class-member fallback once a domain action needs an explicit method.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.NativeSubmitForm, AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern, 'Native Submit Form is the first-ring form composition after fields, action, and accessibility inputs are supplied.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.LocalViewModelState, AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern, 'Local view-model state is the compact state fallback for small generated components and generated fixture canaries.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.DiStateClass, AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern, 'DI state class is the scalable state fallback when state should be separated from the generated view-model.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.CollectionConcept, AppBuilderCollectionConceptId.CollectionSource, AppBuilderDefaultingCandidatePolicyScope.CollectionModeling, 'Collection source is the required modeling anchor before any collection presentation can be selected.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.CollectionConcept, AppBuilderCollectionConceptId.LocalCollectionQuery, AppBuilderDefaultingCandidatePolicyScope.CollectionModeling, 'Local collection query is the first query rung before service/server-backed querying is modeled.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.CollectionConcept, AppBuilderCollectionConceptId.CollectionFieldProjection, AppBuilderDefaultingCandidatePolicyScope.CollectionModeling, 'Field projection is the local fallback for list/card/table display once fields are known.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlRealizationPolicy, AppBuilderControlRealizationPolicyId.InlineNative, AppBuilderDefaultingCandidatePolicyScope.ControlRealization, 'Inline native realization is the first-ring fallback before wrapper controls or external control libraries are selected.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeTextInput, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native text input is the ordinary fallback for string-like scalar fields.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeNumberInput, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native number input is the ordinary fallback for numeric scalar fields, with constraints supplied separately when needed.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeDateInput, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native date input is the ordinary fallback for date-like fields after the domain chooses a Date/null value boundary.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeBooleanCheckbox, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native checkbox is the ordinary fallback for boolean checked-channel fields.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeSingleSelect, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native single select is the ordinary fallback for scalar finite-choice fields.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeMultiSelect, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native multi-select is the ordinary fallback for finite choice-set fields.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeTextarea, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native textarea is the ordinary fallback for multiline text fields.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeButton, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Native button is the ordinary event-command fallback after a domain action or handler target is selected.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.FieldGroup, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Field group is the local fallback when a selected field/control needs visible label and help/error/status relationships.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.FormMessage, AppBuilderDefaultingCandidatePolicyScope.NativeControl, 'Form message is the local fallback when a selected form or field needs explicit help/error/status text.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlManifest, AppBuilderControlManifestRowId.ControlPatternCatalog, AppBuilderDefaultingCandidatePolicyScope.ControlManifest, 'Control pattern catalog is an orientation fallback for AI callers asking what controls can be generated or analyzed.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlManifest, AppBuilderControlManifestRowId.ControlUseInventory, AppBuilderDefaultingCandidatePolicyScope.ControlManifest, 'Control-use inventory is the deterministic analysis fallback for reviewing generated or existing controls.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlManifest, AppBuilderControlManifestRowId.AccessibilityContract, AppBuilderDefaultingCandidatePolicyScope.ControlManifest, 'Accessibility contract is the fallback manifest lane for label, help, error, role, and interaction obligations.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlManifest, AppBuilderControlManifestRowId.ValueContract, AppBuilderDefaultingCandidatePolicyScope.ControlManifest, 'Value contract is the fallback manifest lane for Aurelia value, checked, select, event, class, and style channels.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.ControlManifest, AppBuilderControlManifestRowId.StyleContract, AppBuilderDefaultingCandidatePolicyScope.ControlManifest, 'Style contract is the fallback manifest lane for structural hooks and caller-supplied styling inputs.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.PolicyAxis, AppBuilderPolicyAxisId.ConventionAdmission, AppBuilderDefaultingCandidatePolicyScope.PolicyAxis, 'Convention admission is an app-level policy axis that can receive a caller/project default.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.PolicyAxis, AppBuilderPolicyAxisId.StateOwnership, AppBuilderDefaultingCandidatePolicyScope.PolicyAxis, 'State ownership is a core app-design policy axis that can receive a caller/project default.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.PolicyAxis, AppBuilderPolicyAxisId.LocalState, AppBuilderDefaultingCandidatePolicyScope.PolicyAxis, 'Local state policy is a smaller-scope axis that can receive a caller/project default after scale is known.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.PolicyAxis, AppBuilderPolicyAxisId.CustomElementViewForm, AppBuilderDefaultingCandidatePolicyScope.PolicyAxis, 'Custom-element view form is a source-shape policy axis that can receive a caller/project default.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.PolicyAxis, AppBuilderPolicyAxisId.StylingMechanism, AppBuilderDefaultingCandidatePolicyScope.PolicyAxis, 'Styling mechanism is a project/app policy axis, but app-builder should only spend supplied visual input for now.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.StylingMechanism, AppBuilderStylingMechanismId.GlobalStylesheet, AppBuilderDefaultingCandidatePolicyScope.Styling, 'Global stylesheet is the simple styling fallback when a caller/project chooses app-level CSS.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.StylingMechanism, AppBuilderStylingMechanismId.ClassBinding, AppBuilderDefaultingCandidatePolicyScope.Styling, 'Class binding is the fallback for state-dependent structural style hooks without inventing CSS.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.VisualPolicy, AppBuilderVisualPolicyId.VisualInputMissing, AppBuilderDefaultingCandidatePolicyScope.VisualPolicy, 'Visual-input-missing is the explicit fallback posture when app-builder lacks caller or design-tool styling inputs.'),
  defaultingCandidatePolicyRow(AppBuilderOntologyRowKind.VisualPolicy, AppBuilderVisualPolicyId.StructuralHooksOnly, AppBuilderDefaultingCandidatePolicyScope.VisualPolicy, 'Structural hooks only is the fallback posture for spending caller-supplied classes/data hooks without generating a style system.'),
] as const;

const APP_BUILDER_DEFAULTING_CANDIDATE_REF_KEYS = new Set(
  APP_BUILDER_DEFAULTING_CANDIDATE_POLICY_ROWS.map((row) =>
    appBuilderDefaultingPolicyTargetRefKey(row.targetRef)
  ),
);

const APP_BUILDER_DEFAULTING_CANDIDATE_POLICY_ROWS_BY_KEY = new Map(
  APP_BUILDER_DEFAULTING_CANDIDATE_POLICY_ROWS.map((row) => [
    appBuilderDefaultingPolicyTargetRefKey(row.targetRef),
    row,
  ]),
);

function defaultingCandidatePolicyRow(
  kind: AppBuilderOntologyRowKind,
  id: string,
  scope: AppBuilderDefaultingCandidatePolicyScope,
  summary: string,
): AppBuilderDefaultingCandidatePolicyRow {
  return {
    targetRef: appBuilderOntologyRowRef(kind, id),
    scope,
    summary,
  };
}

function appBuilderDefaultingPolicyTargetRefKey(
  ref: AppBuilderOntologyRowRef,
): string {
  return `${ref.kind}\0${ref.domain}\0${ref.id}`;
}
