import { AppBuilderChoiceOptionBindingKind } from '../control-catalog.js';
import type {
  AppBuilderDomainActionDescriptor,
  AppBuilderDomainRelationshipDescriptor,
} from '../domain-model.js';
import type { AppBuilderDomainFieldSourceModel } from '../domain-field-source.js';
import type { AppBuilderPartSourceLowering } from '../part-source-lowering.js';
import type {
  AppBuilderPartSourceFragment,
  AppBuilderPartSourceInvocation,
  AppBuilderTemplateAttributePartSourceFragment,
  AppBuilderTemplateElementPartSourceFragment,
} from '../part-source-invocation.js';
import { AppBuilderStructuralPartId } from '../structural-part-catalog.js';
import { AppBuilderCollectionFeatureId } from './collection.js';
import type {
  AppBuilderCollectionDisplayFieldPayload,
  AppBuilderCollectionTableColumnPayload,
} from './collection-projection.js';
import { AppBuilderControlPatternId } from './control.js';
import type { AppBuilderControlUseInventoryRow } from './control-use-inventory.js';
import type { AppBuilderEffectContractId } from './effect.js';
import type { AppBuilderSuppliedInput } from './input-readiness.js';
import type { AppBuilderOntologyRowRef } from './relation.js';
import type { AppBuilderSourceLoweringEmissionContext } from './source-lowering-context.js';
import {
  type AppBuilderSourceLoweringHandlerExpressionSource,
  AppBuilderSourceLoweringMessageKind,
  type AppBuilderSourceLoweringInvocation,
  type AppBuilderSourceLoweringInvocationRequest,
} from './source-lowering-invocation.js';
import type {
  AppBuilderSourceLoweringActionFeedbackPayload,
} from './source-lowering-inputs.js';
import type {
  AppBuilderSourceLoweringPreflight,
  AppBuilderSourceLoweringPreflightIssue,
  AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import type { AppBuilderDecisionBundle } from '../policy/decision-bundle.js';

/** App-builder source-lowering composition kinds that orchestrate several target invocations. */
export enum AppBuilderSourceLoweringCompositionKind {
  /** Compose caller-selected child compositions into one coherent app section. */
  AppSection = 'app-section',
  /** Compose repeat and text-interpolation fragments for a list-oriented collection projection. */
  CollectionList = 'collection-list',
  /** Compose repeat and text-interpolation fragments for a card-oriented collection projection. */
  CollectionCard = 'collection-card',
  /** Compose repeat and text-interpolation fragments for a native table collection projection. */
  CollectionTable = 'collection-table',
  /** Compose promise/pending/then/catch and empty-state fragments for async status projection. */
  LoadingEmptyErrorState = 'loading-empty-error-state',
  /** Compose conditional status markup for a caller-supplied action outcome payload. */
  ActionFeedbackStatus = 'action-feedback-status',
  /** Compose field-group invocations and a form submit listener for the Native Submit Form pattern. */
  NativeSubmitForm = 'native-submit-form',
}

/** Stable value list for app-builder source-lowering composition kinds. */
export const APP_BUILDER_SOURCE_LOWERING_COMPOSITION_KINDS = [
  AppBuilderSourceLoweringCompositionKind.AppSection,
  AppBuilderSourceLoweringCompositionKind.CollectionList,
  AppBuilderSourceLoweringCompositionKind.CollectionCard,
  AppBuilderSourceLoweringCompositionKind.CollectionTable,
  AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
  AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
  AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
] as const;

/** Issue kind produced while composing several app-builder source-lowering invocations. */
export enum AppBuilderSourceLoweringCompositionIssueKind {
  /** The request did not name an exact app-builder ontology target. */
  MissingTargetRef = 'missing-target-ref',
  /** The requested ontology target is not admitted into the ontology. */
  UnknownTarget = 'unknown-target',
  /** The requested composition kind is not part of the app-builder source-lowering composition vocabulary. */
  UnknownCompositionKind = 'unknown-composition-kind',
  /** The requested target is known but not supported by this composition query. */
  UnsupportedTarget = 'unsupported-target',
  /** The requested composition kind does not match the requested target. */
  CompositionTargetMismatch = 'composition-target-mismatch',
  /** The requested target has no fragment-composition source-lowering surface. */
  SourceLoweringCompositionNotImplemented = 'source-lowering-composition-not-implemented',
  /** Required input is missing according to app-builder input-readiness. */
  MissingRequiredInput = 'missing-required-input',
  /** At least one supplied payload is invalid according to modeled input schemas. */
  InvalidSuppliedPayload = 'invalid-supplied-payload',
  /** Target-specific preflight facts are missing or invalid. */
  TargetRequirementIssue = 'target-requirement-issue',
  /** No domain-fields payload was supplied for a form that needs fields. */
  MissingDomainFieldsPayload = 'missing-domain-fields-payload',
  /** The caller omitted the explicit field order. */
  MissingFieldSelection = 'missing-field-selection',
  /** The caller named a field that is absent from supplied domain fields. */
  UnknownRequestedField = 'unknown-requested-field',
  /** The caller named the same field more than once. */
  DuplicateFieldSelection = 'duplicate-field-selection',
  /** A field binding expression could not be derived from the supplied root/field names. */
  MissingFieldBindingExpression = 'missing-field-binding-expression',
  /** The caller named a relationship that is absent from supplied domain relationships. */
  UnknownRequestedRelationship = 'unknown-requested-relationship',
  /** The caller named the same relationship more than once. */
  DuplicateRelationshipSelection = 'duplicate-relationship-selection',
  /** A relationship binding expression could not be derived from the supplied relationship model. */
  MissingRelationshipBindingExpression = 'missing-relationship-binding-expression',
  /** The caller named a control-selection relationship that is absent from the selected form relationships. */
  UnknownRelationshipControlSelectionRelationship = 'unknown-relationship-control-selection-relationship',
  /** The caller supplied more than one inner-control selection for the same relationship. */
  DuplicateRelationshipControlSelection = 'duplicate-relationship-control-selection',
  /** The caller named a relationship control pattern that the current relationship-control lowerer cannot spend. */
  UnsupportedRelationshipControlSelection = 'unsupported-relationship-control-selection',
  /** A relationship control could not derive or receive a related collection expression. */
  MissingRelationshipValueDomainExpression = 'missing-relationship-value-domain-expression',
  /** The caller named a control-selection field that is absent from the selected form fields. */
  UnknownFieldControlSelectionField = 'unknown-field-control-selection-field',
  /** The caller supplied more than one inner-control selection for the same field. */
  DuplicateFieldControlSelection = 'duplicate-field-control-selection',
  /** The caller named an inner-control pattern that is absent from the enum-backed control-pattern vocabulary. */
  UnknownFieldControlSelectionControlPattern = 'unknown-field-control-selection-control-pattern',
  /** The caller scoped an accessibility help/error/status payload to a field absent from the selected form fields. */
  UnknownFieldAccessibilityMessageField = 'unknown-field-accessibility-message-field',
  /** The caller scoped a visual class/data hook payload to a field absent from the selected form fields. */
  UnknownFieldVisualHookField = 'unknown-field-visual-hook-field',
  /** The caller scoped a submit-button visual hook to an action this form does not emit. */
  UnmatchedSubmitButtonVisualHookAction = 'unmatched-submit-button-visual-hook-action',
  /** No domain-actions payload was supplied for a form that needs a submit action. */
  MissingDomainActionsPayload = 'missing-domain-actions-payload',
  /** The caller omitted the explicit form action selection. */
  MissingActionSelection = 'missing-action-selection',
  /** The caller named an action that is absent from supplied domain actions. */
  UnknownRequestedAction = 'unknown-requested-action',
  /** The submit action cannot safely derive a handler expression and none was supplied. */
  MissingHandlerExpression = 'missing-handler-expression',
  /** The form submit button needs explicit visible text. */
  MissingSubmitButtonText = 'missing-submit-button-text',
  /** A domain-backed submit form was selected without a local object binding root. */
  MissingDomainBackedBindingRoot = 'missing-domain-backed-binding-root',
  /** A domain-backed submit form had no required selected field from which to derive submit readiness. */
  MissingDomainBackedReadinessField = 'missing-domain-backed-readiness-field',
  /** The caller omitted the explicit collection expression for a collection projection. */
  MissingCollectionExpression = 'missing-collection-expression',
  /** The caller omitted the local item name for a collection repeat. */
  MissingItemLocalName = 'missing-item-local-name',
  /** The local item name cannot safely lower into repeat source. */
  InvalidItemLocalName = 'invalid-item-local-name',
  /** No collection display-field payload was supplied for a list/card/table projection. */
  MissingCollectionDisplayFieldsPayload = 'missing-collection-display-fields-payload',
  /** The caller named a display field that is absent from supplied domain fields. */
  UnknownCollectionDisplayField = 'unknown-collection-display-field',
  /** The same collection display field/role pair was supplied more than once. */
  DuplicateCollectionDisplayField = 'duplicate-collection-display-field',
  /** No collection table-column payload was supplied for a table projection. */
  MissingCollectionTableColumnsPayload = 'missing-collection-table-columns-payload',
  /** The caller named a table column field that is absent from supplied domain fields. */
  UnknownCollectionTableColumnField = 'unknown-collection-table-column-field',
  /** The caller named a table column action that is absent from supplied domain actions. */
  UnknownCollectionTableColumnAction = 'unknown-collection-table-column-action',
  /** The caller named a table column relationship that is absent from supplied domain relationships. */
  UnknownCollectionTableColumnRelationship = 'unknown-collection-table-column-relationship',
  /** The same table column field/action/header key was supplied more than once. */
  DuplicateCollectionTableColumn = 'duplicate-collection-table-column',
  /** A table column payload was structurally valid but cannot lower through the current table surface. */
  InvalidCollectionTableColumn = 'invalid-collection-table-column',
  /** The caller supplied more than one handler expression for the same action. */
  DuplicateActionHandlerExpression = 'duplicate-action-handler-expression',
  /** The caller supplied more than one sort handler expression for the same field. */
  DuplicateSortHandlerExpression = 'duplicate-sort-handler-expression',
  /** A sortable table column was requested without an explicit sort handler expression. */
  MissingSortHandlerExpression = 'missing-sort-handler-expression',
  /** The caller supplied more than one filter binding expression for the same field. */
  DuplicateFilterBindingExpression = 'duplicate-filter-binding-expression',
  /** A filterable table column was requested without an explicit filter binding expression. */
  MissingFilterBindingExpression = 'missing-filter-binding-expression',
  /** Local pagination was requested without an explicit previous or next handler expression. */
  MissingPaginationHandlerExpression = 'missing-pagination-handler-expression',
  /** Local pagination was requested without explicit current-page or page-count expressions. */
  MissingPaginationStatusExpression = 'missing-pagination-status-expression',
  /** Local pagination was requested without explicit visible previous or next button text. */
  MissingPaginationButtonText = 'missing-pagination-button-text',
  /** The lower-level pagination button event part invocation reported one or more issues. */
  PaginationEventLoweringIssue = 'pagination-event-lowering-issue',
  /** Local row selection was requested without an explicit checked-state expression. */
  MissingRowSelectionCheckedExpression = 'missing-row-selection-checked-expression',
  /** Local row selection was requested without an explicit toggle handler expression. */
  MissingRowSelectionToggleHandlerExpression = 'missing-row-selection-toggle-handler-expression',
  /** Local row selection was requested without explicit header or checkbox label expressions. */
  MissingRowSelectionText = 'missing-row-selection-text',
  /** The lower-level row-selection checkbox event part invocation reported one or more issues. */
  RowSelectionEventLoweringIssue = 'row-selection-event-lowering-issue',
  /** Batch actions were requested without explicit action/control rows. */
  MissingBatchActionControls = 'missing-batch-action-controls',
  /** A batch action control row was structurally invalid. */
  InvalidBatchActionControl = 'invalid-batch-action-control',
  /** A batch action control named an action absent from supplied domain actions. */
  UnknownBatchActionControlAction = 'unknown-batch-action-control-action',
  /** The same batch action control action was supplied more than once. */
  DuplicateBatchActionControl = 'duplicate-batch-action-control',
  /** The lower-level batch action native-button invocation reported one or more issues. */
  BatchActionInvocationIssue = 'batch-action-invocation-issue',
  /** The lower-level sort event part invocation reported one or more issues. */
  SortEventLoweringIssue = 'sort-event-lowering-issue',
  /** The caller supplied empty-state text without an explicit condition expression. */
  MissingEmptyStateConditionExpression = 'missing-empty-state-condition-expression',
  /** The caller omitted ordered child compositions for an app-section composition. */
  MissingChildCompositions = 'missing-child-compositions',
  /** The caller omitted ordered child content for an app-section composition. */
  MissingSectionChildren = 'missing-section-children',
  /** A caller-supplied app-section child content row was structurally invalid. */
  InvalidSectionChildContent = 'invalid-section-child-content',
  /** A caller-supplied child composition reported one or more issues. */
  ChildCompositionIssue = 'child-composition-issue',
  /** A caller-supplied child invocation reported one or more issues. */
  ChildInvocationIssue = 'child-invocation-issue',
  /** The caller omitted the promise expression for a loading/empty/error state region. */
  MissingPromiseExpression = 'missing-promise-expression',
  /** The caller omitted pending-state text for a loading/empty/error state region. */
  MissingPendingText = 'missing-pending-text',
  /** The caller omitted empty-state text for a loading/empty/error state region. */
  MissingEmptyStateText = 'missing-empty-state-text',
  /** The caller omitted rejected-state text for a loading/empty/error state region. */
  MissingRejectedText = 'missing-rejected-text',
  /** The fulfilled branch local name cannot safely lower into promise branch source. */
  InvalidFulfilledLocalName = 'invalid-fulfilled-local-name',
  /** The rejected branch local name cannot safely lower into promise branch source. */
  InvalidRejectedLocalName = 'invalid-rejected-local-name',
  /** The caller-supplied fulfilled-content composition reported one or more issues. */
  FulfilledContentCompositionIssue = 'fulfilled-content-composition-issue',
  /** No action-feedback payload was supplied for an action feedback status composition. */
  MissingActionFeedbackPayload = 'missing-action-feedback-payload',
  /** The caller supplied action feedback for an action absent from supplied domain actions. */
  UnknownActionFeedbackAction = 'unknown-action-feedback-action',
  /** More than one action-feedback payload targeted the same action. */
  DuplicateActionFeedback = 'duplicate-action-feedback',
  /** The action-feedback status member cannot safely lower as a TypeScript member access. */
  InvalidActionFeedbackStatusMember = 'invalid-action-feedback-status-member',
  /** A member target invocation reported one or more lowering issues. */
  MemberInvocationIssue = 'member-invocation-issue',
  /** An action target invocation reported one or more lowering issues. */
  ActionInvocationIssue = 'action-invocation-issue',
  /** A structural template-controller part invocation reported one or more lowering issues. */
  StructuralPartLoweringIssue = 'structural-part-lowering-issue',
  /** The lower-level submit event part invocation reported one or more issues. */
  SubmitEventLoweringIssue = 'submit-event-lowering-issue',
}

/** Stable value list for app-builder source-lowering composition issue kinds. */
export const APP_BUILDER_SOURCE_LOWERING_COMPOSITION_ISSUE_KINDS = [
  AppBuilderSourceLoweringCompositionIssueKind.MissingTargetRef,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownTarget,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownCompositionKind,
  AppBuilderSourceLoweringCompositionIssueKind.UnsupportedTarget,
  AppBuilderSourceLoweringCompositionIssueKind.CompositionTargetMismatch,
  AppBuilderSourceLoweringCompositionIssueKind.SourceLoweringCompositionNotImplemented,
  AppBuilderSourceLoweringCompositionIssueKind.MissingRequiredInput,
  AppBuilderSourceLoweringCompositionIssueKind.InvalidSuppliedPayload,
  AppBuilderSourceLoweringCompositionIssueKind.TargetRequirementIssue,
  AppBuilderSourceLoweringCompositionIssueKind.MissingDomainFieldsPayload,
  AppBuilderSourceLoweringCompositionIssueKind.MissingFieldSelection,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownRequestedField,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateFieldSelection,
  AppBuilderSourceLoweringCompositionIssueKind.MissingFieldBindingExpression,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownRequestedRelationship,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateRelationshipSelection,
  AppBuilderSourceLoweringCompositionIssueKind.MissingRelationshipBindingExpression,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownRelationshipControlSelectionRelationship,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateRelationshipControlSelection,
  AppBuilderSourceLoweringCompositionIssueKind.UnsupportedRelationshipControlSelection,
  AppBuilderSourceLoweringCompositionIssueKind.MissingRelationshipValueDomainExpression,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldControlSelectionField,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateFieldControlSelection,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldControlSelectionControlPattern,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldAccessibilityMessageField,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldVisualHookField,
  AppBuilderSourceLoweringCompositionIssueKind.UnmatchedSubmitButtonVisualHookAction,
  AppBuilderSourceLoweringCompositionIssueKind.MissingDomainActionsPayload,
  AppBuilderSourceLoweringCompositionIssueKind.MissingActionSelection,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownRequestedAction,
  AppBuilderSourceLoweringCompositionIssueKind.MissingHandlerExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingSubmitButtonText,
  AppBuilderSourceLoweringCompositionIssueKind.MissingDomainBackedBindingRoot,
  AppBuilderSourceLoweringCompositionIssueKind.MissingDomainBackedReadinessField,
  AppBuilderSourceLoweringCompositionIssueKind.MissingCollectionExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingItemLocalName,
  AppBuilderSourceLoweringCompositionIssueKind.InvalidItemLocalName,
  AppBuilderSourceLoweringCompositionIssueKind.MissingCollectionDisplayFieldsPayload,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionDisplayField,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateCollectionDisplayField,
  AppBuilderSourceLoweringCompositionIssueKind.MissingCollectionTableColumnsPayload,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionTableColumnField,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionTableColumnAction,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownCollectionTableColumnRelationship,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateCollectionTableColumn,
  AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateActionHandlerExpression,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateSortHandlerExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingSortHandlerExpression,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateFilterBindingExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingFilterBindingExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingPaginationHandlerExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingPaginationStatusExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingPaginationButtonText,
  AppBuilderSourceLoweringCompositionIssueKind.PaginationEventLoweringIssue,
  AppBuilderSourceLoweringCompositionIssueKind.MissingRowSelectionCheckedExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingRowSelectionToggleHandlerExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingRowSelectionText,
  AppBuilderSourceLoweringCompositionIssueKind.RowSelectionEventLoweringIssue,
  AppBuilderSourceLoweringCompositionIssueKind.MissingBatchActionControls,
  AppBuilderSourceLoweringCompositionIssueKind.InvalidBatchActionControl,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownBatchActionControlAction,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateBatchActionControl,
  AppBuilderSourceLoweringCompositionIssueKind.BatchActionInvocationIssue,
  AppBuilderSourceLoweringCompositionIssueKind.SortEventLoweringIssue,
  AppBuilderSourceLoweringCompositionIssueKind.MissingEmptyStateConditionExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingChildCompositions,
  AppBuilderSourceLoweringCompositionIssueKind.MissingSectionChildren,
  AppBuilderSourceLoweringCompositionIssueKind.InvalidSectionChildContent,
  AppBuilderSourceLoweringCompositionIssueKind.ChildCompositionIssue,
  AppBuilderSourceLoweringCompositionIssueKind.ChildInvocationIssue,
  AppBuilderSourceLoweringCompositionIssueKind.MissingPromiseExpression,
  AppBuilderSourceLoweringCompositionIssueKind.MissingPendingText,
  AppBuilderSourceLoweringCompositionIssueKind.MissingEmptyStateText,
  AppBuilderSourceLoweringCompositionIssueKind.MissingRejectedText,
  AppBuilderSourceLoweringCompositionIssueKind.InvalidFulfilledLocalName,
  AppBuilderSourceLoweringCompositionIssueKind.InvalidRejectedLocalName,
  AppBuilderSourceLoweringCompositionIssueKind.FulfilledContentCompositionIssue,
  AppBuilderSourceLoweringCompositionIssueKind.MissingActionFeedbackPayload,
  AppBuilderSourceLoweringCompositionIssueKind.UnknownActionFeedbackAction,
  AppBuilderSourceLoweringCompositionIssueKind.DuplicateActionFeedback,
  AppBuilderSourceLoweringCompositionIssueKind.InvalidActionFeedbackStatusMember,
  AppBuilderSourceLoweringCompositionIssueKind.MemberInvocationIssue,
  AppBuilderSourceLoweringCompositionIssueKind.ActionInvocationIssue,
  AppBuilderSourceLoweringCompositionIssueKind.StructuralPartLoweringIssue,
  AppBuilderSourceLoweringCompositionIssueKind.SubmitEventLoweringIssue,
] as const;

/** Caller-supplied binding expression for one selected field in a composed source-lowering request. */
export interface AppBuilderSourceLoweringCompositionFieldBinding {
  /** Selected domain field name. */
  readonly fieldName: string;
  /** Exact Aurelia binding expression to spend for this field. */
  readonly bindingExpression: string;
}

/** Caller-supplied inner control selection for one field in a composed form. */
export interface AppBuilderSourceLoweringCompositionFieldControlSelection {
  /** Selected domain field name. */
  readonly fieldName: string;
  /** Native/control pattern to use inside the generated field group. */
  readonly innerControlPatternId: AppBuilderControlPatternId;
  /** Exact DOM id for the generated field control; omitted derives from the selected field. */
  readonly fieldControlId?: string | null;
  /** Exact label/legend text for the generated field group; omitted derives from the selected field title. */
  readonly labelText?: string | null;
  /** Help/error/status message kind to render for this field group. */
  readonly messageKind?: AppBuilderSourceLoweringMessageKind | null;
  /** Exact help/error/status message text to render for this field group. */
  readonly messageText?: string | null;
  /** Optional DOM id for the generated field-group message. */
  readonly messageId?: string | null;
  /** Option/value-domain expression for choice controls; omitted can derive from selected field options. */
  readonly valueDomainExpression?: string | null;
  /** Named reusable value set to spend when finite options are supplied separately from field-local options. */
  readonly valueSetName?: string | null;
  /** Template local name for one option row; omitted defaults to `option`. */
  readonly optionLocalName?: string | null;
  /** Option value/model expression; omitted defaults to `<local>.value` for derived field options. */
  readonly optionValueExpression?: string | null;
  /** Whether generated options use native `value.bind` or Aurelia `model.bind`; omitted defaults to model identity. */
  readonly optionBindingKind?: AppBuilderChoiceOptionBindingKind | null;
  /** Option label expression; omitted defaults to `<local>.title` for derived field options. */
  readonly optionLabelExpression?: string | null;
  /** Optional matcher expression for object/identity comparison in choice controls. */
  readonly matcherExpression?: string | null;
}

/** Caller-supplied control selection for one object-valued relationship in a composed form. */
export interface AppBuilderSourceLoweringCompositionRelationshipControlSelection {
  /** Selected domain relationship name. */
  readonly relationshipName: string;
  /** Native/control pattern to use inside the generated relationship field group. */
  readonly innerControlPatternId?: AppBuilderControlPatternId | null;
  /** Exact binding expression for the selected relationship value; omitted derives from localFieldName. */
  readonly bindingExpression?: string | null;
  /** Exact DOM id for the generated relationship control; omitted derives from the relationship name. */
  readonly fieldControlId?: string | null;
  /** Exact label text for the generated relationship field group; omitted derives from the relationship title/name. */
  readonly labelText?: string | null;
  /** Option/value-domain expression for related entity choices; omitted can derive from the related entity collection. */
  readonly valueDomainExpression?: string | null;
  /** Template local name for one related option row. */
  readonly optionLocalName?: string | null;
  /** Option value/model expression; object-valued relationships usually spend the option object itself. */
  readonly optionValueExpression?: string | null;
  /** Whether generated options use native `value.bind` or Aurelia `model.bind`. */
  readonly optionBindingKind?: AppBuilderChoiceOptionBindingKind | null;
  /** Option label expression for each related option row. */
  readonly optionLabelExpression?: string | null;
  /** Optional matcher expression for object identity comparison. */
  readonly matcherExpression?: string | null;
}

/** Caller-supplied handler expression for one selected action in a composed source-lowering request. */
export interface AppBuilderSourceLoweringCompositionActionBinding {
  /** Selected domain action name. */
  readonly actionName: string;
  /** Exact Aurelia handler expression to spend for this action. */
  readonly handlerExpression: string;
}

/** Caller-supplied button/control row for one selected batch action. */
export interface AppBuilderSourceLoweringCompositionBatchActionControl {
  /** Selected domain action name. */
  readonly actionName: string;
  /** Exact Aurelia handler expression to spend for this batch action. */
  readonly handlerExpression: string;
  /** Visible button text for this batch action. */
  readonly buttonText: string;
}

/** Caller-supplied sort handler expression for one selected table field. */
export interface AppBuilderSourceLoweringCompositionSortBinding {
  /** Selected domain field name for the sortable table column. */
  readonly fieldName: string;
  /** Exact Aurelia handler expression to spend for this sort control. */
  readonly handlerExpression: string;
}

/** Caller-supplied filter binding expression for one selected table field. */
export interface AppBuilderSourceLoweringCompositionFilterBinding {
  /** Selected domain field name for the filterable table column. */
  readonly fieldName: string;
  /** Exact Aurelia binding expression to spend for this filter control. */
  readonly bindingExpression: string;
}

/** Ordered child content row rendered inside an app-section composition. */
export interface AppBuilderSourceLoweringCompositionChildRequest {
  /** Nested fragment composition rendered at this app-section position. */
  readonly composition?: AppBuilderSourceLoweringCompositionRequest | null;
  /** Direct one-target invocation rendered at this app-section position. */
  readonly invocation?: AppBuilderSourceLoweringInvocationRequest | null;
}

/** Request for lowering a app-builder ontology target that owns several source fragments. */
export interface AppBuilderSourceLoweringCompositionRequest {
  /** Exact app-builder ontology target selected from target-catalog or preflight. */
  readonly targetRef?: AppBuilderOntologyRowRef | null;
  /** Composition kind to spend; omitted derives from the selected target when possible. */
  readonly compositionKind?: AppBuilderSourceLoweringCompositionKind | null;
  /** Input markers and facet payloads already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before preflight and composition. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Explicit ordered field names to render in the composed form. */
  readonly fieldNames?: readonly string[] | null;
  /** Optional receiver expression prepended to selected field names when fieldBindingExpressions does not override them. */
  readonly bindingRootExpression?: string | null;
  /** Exact per-field binding expressions when a field name is not directly bindable from the current context. */
  readonly fieldBindingExpressions?: readonly AppBuilderSourceLoweringCompositionFieldBinding[] | null;
  /** Optional per-field inner control selections for generated field groups. */
  readonly fieldControlSelections?: readonly AppBuilderSourceLoweringCompositionFieldControlSelection[] | null;
  /** Explicit ordered object-valued relationship names to render in the composed form. */
  readonly relationshipNames?: readonly string[] | null;
  /** Optional per-relationship control selections for generated relationship field groups. */
  readonly relationshipControlSelections?: readonly AppBuilderSourceLoweringCompositionRelationshipControlSelection[] | null;
  /** Exact per-action handler expressions when default action invocation would be unsafe or insufficient. */
  readonly actionHandlerExpressions?: readonly AppBuilderSourceLoweringCompositionActionBinding[] | null;
  /** Exact per-action batch controls when BatchActions is selected. */
  readonly batchActionControls?: readonly AppBuilderSourceLoweringCompositionBatchActionControl[] | null;
  /** Exact per-field sort handler expressions for sortable table columns. */
  readonly sortHandlerExpressions?: readonly AppBuilderSourceLoweringCompositionSortBinding[] | null;
  /** Exact per-field filter binding expressions for filterable table columns. */
  readonly filterBindingExpressions?: readonly AppBuilderSourceLoweringCompositionFilterBinding[] | null;
  /** Exact previous-page handler expression for local pagination controls. */
  readonly paginationPreviousHandlerExpression?: string | null;
  /** Exact next-page handler expression for local pagination controls. */
  readonly paginationNextHandlerExpression?: string | null;
  /** Exact current-page expression displayed by local pagination status. */
  readonly paginationCurrentPageExpression?: string | null;
  /** Exact page-count expression displayed by local pagination status. */
  readonly paginationPageCountExpression?: string | null;
  /** Visible previous-page button text for local pagination controls. */
  readonly paginationPreviousButtonText?: string | null;
  /** Visible next-page button text for local pagination controls. */
  readonly paginationNextButtonText?: string | null;
  /** Exact checked-state expression for local row-selection checkboxes. */
  readonly rowSelectionCheckedExpression?: string | null;
  /** Exact toggle handler expression for local row-selection checkboxes. */
  readonly rowSelectionToggleHandlerExpression?: string | null;
  /** Visible table-column header for local row-selection checkboxes. */
  readonly rowSelectionColumnHeaderText?: string | null;
  /** Exact aria-label expression for local row-selection checkboxes. */
  readonly rowSelectionCheckboxLabelExpression?: string | null;
  /** Explicit domain action name to invoke on native form submit. */
  readonly actionName?: string | null;
  /** Exact submit handler expression; omitted derives from actionName only when actionName is a TypeScript identifier. */
  readonly handlerExpression?: string | null;
  /** Visible text for the submit button. */
  readonly submitButtonText?: string | null;
  /** Exact iterable expression to spend in a collection repeat. */
  readonly collectionExpression?: string | null;
  /** Local item name to introduce for each collection row. */
  readonly itemLocalName?: string | null;
  /** Optional visible text for an empty collection state. */
  readonly emptyStateText?: string | null;
  /** Exact condition expression for an empty collection state. */
  readonly emptyStateConditionExpression?: string | null;
  /** Exact promise expression to spend for a loading/empty/error state region. */
  readonly promiseExpression?: string | null;
  /** Visible text for the pending branch of a loading/empty/error state region. */
  readonly pendingText?: string | null;
  /** Optional local name introduced by the fulfilled promise branch. */
  readonly fulfilledLocalName?: string | null;
  /** Optional local name introduced by the rejected promise branch. */
  readonly rejectedLocalName?: string | null;
  /** Visible text for the rejected branch of a loading/empty/error state region. */
  readonly rejectedText?: string | null;
  /** Optional nested composition rendered in the fulfilled non-empty branch. */
  readonly fulfilledContentComposition?: AppBuilderSourceLoweringCompositionRequest | null;
  /** Ordered section children that may mix fragment compositions and direct target invocations. */
  readonly childContent?: readonly AppBuilderSourceLoweringCompositionChildRequest[] | null;
  /** Ordered child compositions rendered inside an app-section composition. */
  readonly childCompositions?: readonly AppBuilderSourceLoweringCompositionRequest[] | null;
  /** Include the preflight answer that gated this composition; defaults to false. */
  readonly includePreflight?: boolean | null;
  /** Stateful emission scope shared by whole-template/source-plan lowerers that need unique generated names. */
  readonly emissionContext?: AppBuilderSourceLoweringEmissionContext | null;
}

/** Issue produced by app-builder source-lowering composition. */
export interface AppBuilderSourceLoweringCompositionIssue {
  /** Stable issue category. */
  readonly issueKind: AppBuilderSourceLoweringCompositionIssueKind;
  /** Target row involved in the issue when applicable. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** Requested composition kind involved in the issue when applicable. */
  readonly compositionKind?: AppBuilderSourceLoweringCompositionKind | null;
  /** Raw invalid composition kind supplied by a caller when it did not match the enum-backed vocabulary. */
  readonly requestedCompositionKind?: string | null;
  /** Requested or candidate field names involved in the issue. */
  readonly fieldNames?: readonly string[];
  /** Requested or candidate action names involved in the issue. */
  readonly actionNames?: readonly string[];
  /** Action-feedback payload involved in the issue. */
  readonly actionFeedback?: AppBuilderSourceLoweringActionFeedbackPayload;
  /** Requested or candidate action-feedback status members involved in the issue. */
  readonly statusMemberNames?: readonly string[];
  /** Requested or candidate relationship names involved in the issue. */
  readonly relationshipNames?: readonly string[];
  /** Requested or candidate collection expressions involved in the issue. */
  readonly collectionExpression?: string | null;
  /** Requested or candidate item local name involved in the issue. */
  readonly itemLocalName?: string | null;
  /** Requested or candidate promise expression involved in the issue. */
  readonly promiseExpression?: string | null;
  /** Requested local branch names involved in the issue. */
  readonly localNames?: readonly string[];
  /** Requested or candidate table column headers involved in the issue. */
  readonly columnHeaders?: readonly string[];
  /** Route instruction values involved in an action or navigation issue. */
  readonly routeInstructions?: readonly string[];
  /** Collection query features involved in the issue. */
  readonly collectionFeatureIds?: readonly AppBuilderCollectionFeatureId[];
  /** Control pattern ids involved in the issue. */
  readonly controlPatternIds?: readonly AppBuilderControlPatternId[];
  /** Member invocation whose issues were bridged into this composition issue. */
  readonly memberInvocation?: AppBuilderSourceLoweringInvocation;
  /** Action invocation whose issues were bridged into this composition issue. */
  readonly actionInvocation?: AppBuilderSourceLoweringInvocation;
  /** Structural part whose source-lowering result was bridged into this composition issue. */
  readonly structuralPartId?: AppBuilderStructuralPartId;
  /** Structural template-controller source lowering whose issues were bridged into this composition issue. */
  readonly structuralPartLowering?: AppBuilderPartSourceLowering;
  /** Nested fulfilled-content composition whose issues were bridged into this composition issue. */
  readonly fulfilledContentComposition?: AppBuilderSourceLoweringComposition;
  /** Child composition whose issues were bridged into this composition issue. */
  readonly childComposition?: AppBuilderSourceLoweringComposition;
  /** Child invocation whose issues were bridged into this composition issue. */
  readonly childInvocation?: AppBuilderSourceLoweringInvocation;
  /** Zero-based child content index involved in an app-section issue. */
  readonly childContentIndex?: number;
  /** Zero-based child composition index involved in an app-section issue. */
  readonly childCompositionIndex?: number;
  /** Submit event part lowering whose issues were bridged into this composition issue. */
  readonly submitEventLowering?: AppBuilderPartSourceLowering;
  /** Sort event part lowering whose issues were bridged into this composition issue. */
  readonly sortEventLowering?: AppBuilderPartSourceLowering;
  /** Pagination event part lowering whose issues were bridged into this composition issue. */
  readonly paginationEventLowering?: AppBuilderPartSourceLowering;
  /** Row-selection checkbox event part lowering whose issues were bridged into this composition issue. */
  readonly rowSelectionEventLowering?: AppBuilderPartSourceLowering;
  /** Batch action native-button invocation whose issues were bridged into this composition issue. */
  readonly batchActionInvocation?: AppBuilderSourceLoweringInvocation;
  /** Source-lowering preflight issue bridged into this composition issue. */
  readonly sourceLoweringPreflightIssue?: AppBuilderSourceLoweringPreflightIssue;
  /** Compact explanation suitable for MCP/IDE display. */
  readonly summary: string;
}

/** Selected field row inside a app-builder source-lowering composition. */
export interface AppBuilderSourceLoweringCompositionField {
  /** Selected source-oriented field row. */
  readonly field: AppBuilderDomainFieldSourceModel;
  /** Binding expression passed to the member target invocation. */
  readonly bindingExpression: string;
  /** Member source-lowering invocation produced for this field. */
  readonly memberInvocation: AppBuilderSourceLoweringInvocation | null;
}

/** Selected relationship control inside a app-builder source-lowering composition. */
export interface AppBuilderSourceLoweringCompositionRelationshipControl {
  /** Selected domain relationship descriptor. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Binding expression connected to the selected related value. */
  readonly bindingExpression: string;
  /** Control pattern selected for the relationship value channel. */
  readonly controlPatternId: AppBuilderControlPatternId;
  /** DOM id assigned to the relationship control. */
  readonly fieldControlId: string;
  /** Human-facing label for the relationship control. */
  readonly labelText: string;
  /** Related collection expression used as the option domain. */
  readonly valueDomainExpression: string;
  /** Template local name introduced for one related option row. */
  readonly optionLocalName: string;
  /** Option value/model expression emitted for each related row. */
  readonly optionValueExpression: string;
  /** Option binding form emitted by the select options. */
  readonly optionBindingKind: AppBuilderChoiceOptionBindingKind;
  /** Option label expression emitted for each related row. */
  readonly optionLabelExpression: string;
  /** Matcher expression emitted by the select, when supplied or derived. */
  readonly matcherExpression: string | null;
  /** Structured select fragment produced for the relationship. */
  readonly controlFragment: AppBuilderTemplateElementPartSourceFragment | null;
}

/** Selected action row inside a app-builder source-lowering composition. */
export interface AppBuilderSourceLoweringCompositionAction {
  /** Selected domain action descriptor. */
  readonly action: AppBuilderDomainActionDescriptor;
  /** Submit handler expression spent by the composed form. */
  readonly handlerExpression: string;
  /** Provenance for the composed form's handler expression. */
  readonly handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource;
}

/** Selected collection display field inside a app-builder source-lowering composition. */
export interface AppBuilderSourceLoweringCollectionDisplayField {
  /** Caller-supplied display projection row. */
  readonly projection: AppBuilderCollectionDisplayFieldPayload;
  /** Selected source-oriented domain field row. */
  readonly field: AppBuilderDomainFieldSourceModel;
  /** Binding expression spent by text interpolation. */
  readonly bindingExpression: string;
  /** Human-facing label used when the markup includes one. */
  readonly label: string;
}

/** Selected collection table column inside a app-builder source-lowering composition. */
export interface AppBuilderSourceLoweringCollectionTableColumn {
  /** Caller-supplied table column row. */
  readonly column: AppBuilderCollectionTableColumnPayload;
  /** Selected source-oriented domain field row for field-backed columns. */
  readonly field: AppBuilderDomainFieldSourceModel | null;
  /** Selected domain action for action-backed columns. */
  readonly action: AppBuilderDomainActionDescriptor | null;
  /** Selected domain relationship for relationship-backed columns. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor | null;
  /** Action source-lowering invocation produced for action-backed columns. */
  readonly actionInvocation: AppBuilderSourceLoweringInvocation | null;
  /** Binding expression spent by text interpolation for field-backed or relationship-backed columns. */
  readonly bindingExpression: string | null;
  /** Sort handler expression spent by a sortable field-backed header. */
  readonly sortHandlerExpression: string | null;
  /** Provenance for a sortable field-backed header handler expression. */
  readonly sortHandlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource | null;
  /** Sort event part invocation produced for sortable field-backed columns. */
  readonly sortEventInvocation: AppBuilderPartSourceInvocation | null;
  /** Sort event part lowering produced for sortable field-backed columns. */
  readonly sortEventLowering: AppBuilderPartSourceLowering | null;
  /** Sort event template attribute produced for sortable field-backed columns. */
  readonly sortEventAttributeFragment: AppBuilderTemplateAttributePartSourceFragment | null;
  /** Filter control binding expression spent by a filterable field-backed header. */
  readonly filterBindingExpression: string | null;
  /** Human-facing table column header. */
  readonly header: string;
}

/** Selected batch action inside a collection table composition. */
export interface AppBuilderSourceLoweringCollectionBatchAction {
  /** Selected domain action descriptor. */
  readonly action: AppBuilderDomainActionDescriptor;
  /** Exact handler expression spent by the batch button. */
  readonly handlerExpression: string;
  /** Visible button text spent by the batch button. */
  readonly buttonText: string;
  /** Native-button source-lowering invocation produced for this batch action. */
  readonly actionInvocation: AppBuilderSourceLoweringInvocation;
}

/** Lowered ordered child content row inside an app-section composition. */
export interface AppBuilderSourceLoweringCompositionChild {
  /** Nested fragment composition rendered at this app-section position. */
  readonly composition: AppBuilderSourceLoweringComposition | null;
  /** Direct one-target invocation rendered at this app-section position. */
  readonly invocation: AppBuilderSourceLoweringInvocation | null;
}

/** Generated-source result for one app-builder source-lowering composition. */
export interface AppBuilderSourceLoweringComposition {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Target row requested by the caller, if present. */
  readonly targetRef: AppBuilderOntologyRowRef | null;
  /** Composition kind selected for the target, if present. */
  readonly compositionKind: AppBuilderSourceLoweringCompositionKind | null;
  /** App-builder ontology rows exercised by the top-level composition and member invocations. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the top-level and member ontology targets. */
  readonly effectContractIds: readonly AppBuilderEffectContractId[];
  /** Preflight row for the requested target, if it resolved. */
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  /** Full preflight answer when requested. */
  readonly preflight?: AppBuilderSourceLoweringPreflight;
  /** Selected domain fields in generated form order. */
  readonly selectedFields: readonly AppBuilderSourceLoweringCompositionField[];
  /** Candidate field names available from supplied domain input. */
  readonly availableFieldNames: readonly string[];
  /** Selected object-valued relationship controls in generated form order. */
  readonly selectedRelationships: readonly AppBuilderSourceLoweringCompositionRelationshipControl[];
  /** Candidate relationship names available from supplied domain input. */
  readonly availableRelationshipNames: readonly string[];
  /** Selected domain action for submit, if any. */
  readonly selectedAction: AppBuilderSourceLoweringCompositionAction | null;
  /** Candidate action names available from supplied domain input. */
  readonly availableActionNames: readonly string[];
  /** Selected action-feedback payload for a generated status composition, if any. */
  readonly selectedActionFeedback: AppBuilderSourceLoweringActionFeedbackPayload | null;
  /** Candidate action names available from supplied action-feedback input. */
  readonly availableActionFeedbackActionNames: readonly string[];
  /** Collection expression selected for collection projection compositions. */
  readonly collectionExpression: string | null;
  /** Local item name selected for collection projection compositions. */
  readonly itemLocalName: string | null;
  /** Promise expression selected for loading/empty/error state compositions. */
  readonly promiseExpression: string | null;
  /** Pending text selected for loading/empty/error state compositions. */
  readonly pendingText: string | null;
  /** Fulfilled branch local name selected for loading/empty/error state compositions. */
  readonly fulfilledLocalName: string | null;
  /** Empty-state text selected for loading/empty/error state compositions. */
  readonly emptyStateText: string | null;
  /** Empty-state condition selected for loading/empty/error state compositions. */
  readonly emptyStateConditionExpression: string | null;
  /** Rejected branch local name selected for loading/empty/error state compositions. */
  readonly rejectedLocalName: string | null;
  /** Rejected text selected for loading/empty/error state compositions. */
  readonly rejectedText: string | null;
  /** Nested composition rendered inside the fulfilled non-empty branch, if supplied. */
  readonly fulfilledContentComposition: AppBuilderSourceLoweringComposition | null;
  /** Ordered child compositions rendered inside an app-section composition. */
  readonly childCompositions: readonly AppBuilderSourceLoweringComposition[];
  /** Ordered section children rendered inside an app-section composition. */
  readonly childContent: readonly AppBuilderSourceLoweringCompositionChild[];
  /** Selected display fields for collection list/card/table projections. */
  readonly selectedCollectionDisplayFields: readonly AppBuilderSourceLoweringCollectionDisplayField[];
  /** Selected table columns for table projections. */
  readonly selectedCollectionTableColumns: readonly AppBuilderSourceLoweringCollectionTableColumn[];
  /** Selected batch actions for collection table projections. */
  readonly selectedCollectionBatchActions: readonly AppBuilderSourceLoweringCollectionBatchAction[];
  /** Candidate display field names available from supplied collection/domain input. */
  readonly availableCollectionDisplayFieldNames: readonly string[];
  /** Candidate table column headers available from supplied collection input. */
  readonly availableCollectionTableColumnHeaders: readonly string[];
  /** Submit event part invocation, if all submit inputs were ready. */
  readonly submitEventInvocation: AppBuilderPartSourceInvocation | null;
  /** Submit event source-lowering result, if invoked. */
  readonly submitEventLowering: AppBuilderPartSourceLowering | null;
  /** Concrete control-use rows proven by generated member and composition source. */
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
  /** Top-level composed source fragments; source-plan writers usually spend these. */
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  /** Child/member fragments that explain what participated in the composition. */
  readonly contributingFragments: readonly AppBuilderPartSourceFragment[];
  /** Composition and bridged member-source issues. */
  readonly issues: readonly AppBuilderSourceLoweringCompositionIssue[];
}
