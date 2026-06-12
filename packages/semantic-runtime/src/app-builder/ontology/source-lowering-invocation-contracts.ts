import type {
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlId,
} from '../control-catalog.js';
import type {
  AppBuilderDomainActionDescriptor,
  AppBuilderDomainFieldDescriptor,
  AppBuilderDomainValueSetDescriptor,
} from '../domain-model.js';
import type {
  AppBuilderDomainFieldSourceModel,
} from '../domain-field-source.js';
import type {
  AppBuilderPartSourceLowering,
} from '../part-source-lowering.js';
import type {
  AppBuilderPartSourceFragment,
  AppBuilderPartSourceInvocation,
  AppBuilderPartSourceLoweringIssue,
} from '../part-source-invocation.js';
import type {
  AppBuilderCollectionFeatureId,
} from './collection.js';
import type {
  AppBuilderControlPatternId,
  AppBuilderControlPatternRow,
} from './control.js';
import type {
  AppBuilderControlUseInventoryRow,
} from './control-use-inventory.js';
import type {
  AppBuilderEffectContractId,
} from './effect.js';
import type {
  AppBuilderSuppliedInput,
} from './input-readiness.js';
import type {
  AppBuilderOntologyRowRef,
} from './relation.js';
import type {
  AppBuilderSourceLoweringEmissionContext,
} from './source-lowering-context.js';
import type {
  AppBuilderSourceLoweringPreflight,
  AppBuilderSourceLoweringPreflightIssue,
  AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import type {
  AppBuilderDecisionBundle,
} from '../policy/decision-bundle.js';

/** Explicitness of the domain field selected for a app-builder source-lowering invocation. */
export enum AppBuilderSourceLoweringFieldSelectionState {
  /** The caller named the selected domain field. */
  ExplicitFieldName = 'explicit-field-name',
  /** Exactly one supplied domain field was compatible with the selected target. */
  SingleCompatibleField = 'single-compatible-field',
  /** The caller omitted a field and no supplied field matched the selected target. */
  NoCompatibleField = 'no-compatible-field',
  /** The caller omitted a field and more than one supplied field matched the selected target. */
  AmbiguousCompatibleField = 'ambiguous-compatible-field',
  /** The caller named a field that is absent from the supplied domain fields. */
  UnknownRequestedField = 'unknown-requested-field',
  /** The caller named a field whose value kind does not fit the selected target. */
  IncompatibleRequestedField = 'incompatible-requested-field',
  /** No field selection was attempted because an earlier gate blocked lowering. */
  NotEvaluated = 'not-evaluated',
}

/** Stable value list for source-lowering field-selection states. */
export const APP_BUILDER_SOURCE_LOWERING_FIELD_SELECTION_STATES = [
  AppBuilderSourceLoweringFieldSelectionState.ExplicitFieldName,
  AppBuilderSourceLoweringFieldSelectionState.SingleCompatibleField,
  AppBuilderSourceLoweringFieldSelectionState.NoCompatibleField,
  AppBuilderSourceLoweringFieldSelectionState.AmbiguousCompatibleField,
  AppBuilderSourceLoweringFieldSelectionState.UnknownRequestedField,
  AppBuilderSourceLoweringFieldSelectionState.IncompatibleRequestedField,
  AppBuilderSourceLoweringFieldSelectionState.NotEvaluated,
] as const;

/** Provenance for the binding expression spent by app-builder source lowering. */
export enum AppBuilderSourceLoweringBindingExpressionSource {
  /** The caller supplied the exact binding expression for this invocation. */
  ExplicitRequest = 'explicit-request',
  /** The selected domain field name was used as the binding expression. */
  SelectedFieldName = 'selected-field-name',
  /** The selected relationship local value member was used as the binding expression. */
  SelectedRelationshipLocalValue = 'selected-relationship-local-value',
  /** A selected collection field plus item local produced the binding expression. */
  SelectedCollectionField = 'selected-collection-field',
}

/** Stable value list for app-builder source-lowering binding-expression provenance. */
export const APP_BUILDER_SOURCE_LOWERING_BINDING_EXPRESSION_SOURCES = [
  AppBuilderSourceLoweringBindingExpressionSource.ExplicitRequest,
  AppBuilderSourceLoweringBindingExpressionSource.SelectedFieldName,
  AppBuilderSourceLoweringBindingExpressionSource.SelectedRelationshipLocalValue,
  AppBuilderSourceLoweringBindingExpressionSource.SelectedCollectionField,
] as const;

/** Provenance for the option/value-domain expression spent by app-builder source lowering. */
export enum AppBuilderSourceLoweringValueDomainExpressionSource {
  /** The caller supplied the exact option/value-domain expression. */
  ExplicitRequest = 'explicit-request',
  /** The selected field's inline options implied the generated option-domain member. */
  FieldOptions = 'field-options',
  /** The selected field named a reusable domain value set. */
  FieldValueSetName = 'field-value-set-name',
  /** The caller named which reusable domain value set to spend. */
  ExplicitValueSetName = 'explicit-value-set-name',
  /** Exactly one supplied reusable domain value set fit the selected field. */
  SingleCompatibleValueSet = 'single-compatible-value-set',
  /** A declared domain relationship implied the related collection as the option domain. */
  RelationshipCollection = 'relationship-collection',
}

/** Stable value list for app-builder source-lowering value-domain provenance. */
export const APP_BUILDER_SOURCE_LOWERING_VALUE_DOMAIN_EXPRESSION_SOURCES = [
  AppBuilderSourceLoweringValueDomainExpressionSource.ExplicitRequest,
  AppBuilderSourceLoweringValueDomainExpressionSource.FieldOptions,
  AppBuilderSourceLoweringValueDomainExpressionSource.FieldValueSetName,
  AppBuilderSourceLoweringValueDomainExpressionSource.ExplicitValueSetName,
  AppBuilderSourceLoweringValueDomainExpressionSource.SingleCompatibleValueSet,
  AppBuilderSourceLoweringValueDomainExpressionSource.RelationshipCollection,
] as const;

/** Explicitness of the domain action selected for a app-builder source-lowering invocation. */
export enum AppBuilderSourceLoweringActionSelectionState {
  /** The caller named the selected domain action. */
  ExplicitActionName = 'explicit-action-name',
  /** Exactly one supplied domain action was available for the selected target. */
  SingleCompatibleAction = 'single-compatible-action',
  /** The caller omitted an action and no supplied action matched the selected target. */
  NoCompatibleAction = 'no-compatible-action',
  /** The caller omitted an action and more than one supplied action matched the selected target. */
  AmbiguousCompatibleAction = 'ambiguous-compatible-action',
  /** The caller named an action that is absent from the supplied domain actions. */
  UnknownRequestedAction = 'unknown-requested-action',
  /** No action selection was attempted because this target does not spend an action. */
  NotEvaluated = 'not-evaluated',
}

/** Stable value list for source-lowering action-selection states. */
export const APP_BUILDER_SOURCE_LOWERING_ACTION_SELECTION_STATES = [
  AppBuilderSourceLoweringActionSelectionState.ExplicitActionName,
  AppBuilderSourceLoweringActionSelectionState.SingleCompatibleAction,
  AppBuilderSourceLoweringActionSelectionState.NoCompatibleAction,
  AppBuilderSourceLoweringActionSelectionState.AmbiguousCompatibleAction,
  AppBuilderSourceLoweringActionSelectionState.UnknownRequestedAction,
  AppBuilderSourceLoweringActionSelectionState.NotEvaluated,
] as const;

/** Provenance for the event handler expression spent by app-builder source lowering. */
export enum AppBuilderSourceLoweringHandlerExpressionSource {
  /** The caller supplied the exact handler expression. */
  ExplicitRequest = 'explicit-request',
  /** The selected domain action name was used as a zero-argument handler call. */
  SelectedActionName = 'selected-action-name',
}

/** Stable value list for app-builder source-lowering handler-expression provenance. */
export const APP_BUILDER_SOURCE_LOWERING_HANDLER_EXPRESSION_SOURCES = [
  AppBuilderSourceLoweringHandlerExpressionSource.ExplicitRequest,
  AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
] as const;

/** Native HTML button type emitted by button source lowering. */
export enum AppBuilderSourceLoweringButtonType {
  /** Non-submit action button; safest default for generated event-handler buttons. */
  Button = 'button',
  /** Native submit button for forms that intentionally use submit semantics. */
  Submit = 'submit',
  /** Native reset button for forms that intentionally use browser reset semantics. */
  Reset = 'reset',
}

/** Stable value list for native button type source lowering. */
export const APP_BUILDER_SOURCE_LOWERING_BUTTON_TYPES = [
  AppBuilderSourceLoweringButtonType.Button,
  AppBuilderSourceLoweringButtonType.Submit,
  AppBuilderSourceLoweringButtonType.Reset,
] as const;

/** Mutability emitted for an async data-source member. */
export enum AppBuilderSourceLoweringAsyncDataMemberMutability {
  /** Emit a readonly promise member for one-time initialization flows. */
  Readonly = 'readonly',
  /** Emit a mutable promise member for explicit refresh/reload flows. */
  Mutable = 'mutable',
}

/** Stable value list for async data-source member mutability source lowering. */
export const APP_BUILDER_SOURCE_LOWERING_ASYNC_DATA_MEMBER_MUTABILITIES = [
  AppBuilderSourceLoweringAsyncDataMemberMutability.Readonly,
  AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
] as const;

/** Message role selected for an accessibility/message source-lowering invocation. */
export enum AppBuilderSourceLoweringMessageKind {
  /** Helpful descriptive text associated with a control or form. */
  Help = 'help',
  /** Error text associated with a control or form. */
  Error = 'error',
  /** Status text associated with a control, form, or action result. */
  Status = 'status',
}

/** Stable value list for source-lowering message kinds. */
export const APP_BUILDER_SOURCE_LOWERING_MESSAGE_KINDS = [
  AppBuilderSourceLoweringMessageKind.Help,
  AppBuilderSourceLoweringMessageKind.Error,
  AppBuilderSourceLoweringMessageKind.Status,
] as const;

/** Explicitness of the accessibility/message selected for a app-builder source-lowering invocation. */
export enum AppBuilderSourceLoweringMessageSelectionState {
  /** The caller named the selected message kind. */
  ExplicitMessageKind = 'explicit-message-kind',
  /** Exactly one supplied accessibility help/error/status message was available. */
  SinglePayloadMessage = 'single-payload-message',
  /** The caller omitted a message kind and no supplied message text was available. */
  NoPayloadMessage = 'no-payload-message',
  /** The caller omitted a message kind and more than one supplied message text was available. */
  AmbiguousPayloadMessage = 'ambiguous-payload-message',
  /** The caller named a message kind outside the source-lowering vocabulary. */
  UnknownRequestedMessageKind = 'unknown-requested-message-kind',
  /** The caller supplied text without a kind and no payload could supply the kind. */
  MissingMessageKind = 'missing-message-kind',
  /** No message selection was attempted because this target does not spend message text. */
  NotEvaluated = 'not-evaluated',
}

/** Stable value list for source-lowering message-selection states. */
export const APP_BUILDER_SOURCE_LOWERING_MESSAGE_SELECTION_STATES = [
  AppBuilderSourceLoweringMessageSelectionState.ExplicitMessageKind,
  AppBuilderSourceLoweringMessageSelectionState.SinglePayloadMessage,
  AppBuilderSourceLoweringMessageSelectionState.NoPayloadMessage,
  AppBuilderSourceLoweringMessageSelectionState.AmbiguousPayloadMessage,
  AppBuilderSourceLoweringMessageSelectionState.UnknownRequestedMessageKind,
  AppBuilderSourceLoweringMessageSelectionState.MissingMessageKind,
  AppBuilderSourceLoweringMessageSelectionState.NotEvaluated,
] as const;

/** Provenance for the message text spent by app-builder source lowering. */
export enum AppBuilderSourceLoweringMessageTextSource {
  /** The caller supplied the exact message text for this invocation. */
  ExplicitRequest = 'explicit-request',
  /** The selected accessibility help/error/status payload supplied the text. */
  AccessibilityHelpErrorPayload = 'accessibility-help-error-payload',
}

/** Stable value list for app-builder source-lowering message-text provenance. */
export const APP_BUILDER_SOURCE_LOWERING_MESSAGE_TEXT_SOURCES = [
  AppBuilderSourceLoweringMessageTextSource.ExplicitRequest,
  AppBuilderSourceLoweringMessageTextSource.AccessibilityHelpErrorPayload,
] as const;

/** Explicitness of the inner native control selected by a field-group invocation. */
export enum AppBuilderSourceLoweringInnerControlSelectionState {
  /** The caller named the inner control pattern. */
  ExplicitInnerControlPattern = 'explicit-inner-control-pattern',
  /** The selected domain field's value kind selected the native control pattern. */
  SelectedFieldValueKind = 'selected-field-value-kind',
  /** No inner-control selection was attempted because this target does not wrap an inner control. */
  NotEvaluated = 'not-evaluated',
}

/** Stable value list for field-group inner-control selection states. */
export const APP_BUILDER_SOURCE_LOWERING_INNER_CONTROL_SELECTION_STATES = [
  AppBuilderSourceLoweringInnerControlSelectionState.ExplicitInnerControlPattern,
  AppBuilderSourceLoweringInnerControlSelectionState.SelectedFieldValueKind,
  AppBuilderSourceLoweringInnerControlSelectionState.NotEvaluated,
] as const;

/** Provenance for label text or accessible-name text spent by control source lowering. */
export enum AppBuilderSourceLoweringLabelTextSource {
  /** The caller supplied the exact label text. */
  ExplicitRequest = 'explicit-request',
  /** A supplied accessibility label payload supplied the text. */
  AccessibilityLabelPayload = 'accessibility-label-payload',
  /** The selected domain field title supplied the text. */
  SelectedFieldTitle = 'selected-field-title',
  /** The selected relationship title supplied the text. */
  SelectedRelationshipTitle = 'selected-relationship-title',
}

/** Stable value list for control label/accessibility text provenance. */
export const APP_BUILDER_SOURCE_LOWERING_LABEL_TEXT_SOURCES = [
  AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
  AppBuilderSourceLoweringLabelTextSource.AccessibilityLabelPayload,
  AppBuilderSourceLoweringLabelTextSource.SelectedFieldTitle,
  AppBuilderSourceLoweringLabelTextSource.SelectedRelationshipTitle,
] as const;

/** Provenance for the DOM id spent by field-group label/control/message relationships. */
export enum AppBuilderSourceLoweringFieldControlIdSource {
  /** The caller supplied the exact DOM id for the generated field control. */
  ExplicitRequest = 'explicit-request',
  /** The selected domain field name supplied the deterministic DOM id stem. */
  SelectedFieldName = 'selected-field-name',
  /** The selected relationship local value member supplied the deterministic DOM id stem. */
  SelectedRelationshipLocalValue = 'selected-relationship-local-value',
}

/** Stable value list for field-group control-id provenance. */
export const APP_BUILDER_SOURCE_LOWERING_FIELD_CONTROL_ID_SOURCES = [
  AppBuilderSourceLoweringFieldControlIdSource.ExplicitRequest,
  AppBuilderSourceLoweringFieldControlIdSource.SelectedFieldName,
  AppBuilderSourceLoweringFieldControlIdSource.SelectedRelationshipLocalValue,
] as const;

/** Issue kind produced while lowering a app-builder ontology target to source fragments. */
export enum AppBuilderSourceLoweringInvocationIssueKind {
  /** The request did not name an exact app-builder ontology target. */
  MissingTargetRef = 'missing-target-ref',
  /** The requested ontology target is not admitted into the ontology. */
  UnknownTarget = 'unknown-target',
  /** The requested target family is not source-lowerable through this invocation query. */
  UnsupportedTargetKind = 'unsupported-target-kind',
  /** The requested control pattern is not in the control-pattern catalog. */
  UnknownControlPattern = 'unknown-control-pattern',
  /** The requested target row has no source-lowering-implemented source lowerer yet. */
  SourceLoweringNotImplemented = 'source-lowering-not-implemented',
  /** Required input is missing according to app-builder input-readiness. */
  MissingRequiredInput = 'missing-required-input',
  /** At least one supplied payload is invalid according to modeled input schemas. */
  InvalidSuppliedPayload = 'invalid-supplied-payload',
  /** Target-specific source facts are absent or invalid according to source-lowering preflight. */
  TargetRequirementIssue = 'target-requirement-issue',
  /** No domain-fields payload was supplied for a target that needs one. */
  MissingDomainFieldsPayload = 'missing-domain-fields-payload',
  /** A native range target needs explicit numeric minimum, maximum, and step facts. */
  MissingNumericRangeConstraints = 'missing-numeric-range-constraints',
  /** Supplied numeric constraints cannot be safely spent as native number/range attributes. */
  InvalidNumericConstraints = 'invalid-numeric-constraints',
  /** Supplied field-local constraints cannot be safely spent as native control attributes. */
  InvalidNativeFieldConstraints = 'invalid-native-field-constraints',
  /** A choice control needs an option-domain expression and none was supplied or derivable. */
  MissingValueDomainExpression = 'missing-value-domain-expression',
  /** The caller or selected field named a value set absent from the domain-value-sets payload. */
  UnknownRequestedValueSet = 'unknown-requested-value-set',
  /** The caller omitted a value set name and multiple supplied value sets fit the selected field. */
  AmbiguousDomainValueSet = 'ambiguous-domain-value-set',
  /** The caller omitted a field and no supplied field fit the target. */
  NoCompatibleDomainField = 'no-compatible-domain-field',
  /** The caller omitted a field and more than one supplied field fit the target. */
  AmbiguousDomainField = 'ambiguous-domain-field',
  /** The caller named a field that is absent from supplied domain fields. */
  UnknownRequestedField = 'unknown-requested-field',
  /** The caller named a field whose value kind does not fit the target. */
  IncompatibleRequestedField = 'incompatible-requested-field',
  /** No domain-actions payload was supplied for a target that needs one. */
  MissingDomainActionsPayload = 'missing-domain-actions-payload',
  /** The caller omitted an action and no supplied action fit the target. */
  NoCompatibleDomainAction = 'no-compatible-domain-action',
  /** The caller omitted an action and more than one supplied action fit the target. */
  AmbiguousDomainAction = 'ambiguous-domain-action',
  /** The caller omitted the explicit action name for a behavior source lowerer. */
  MissingActionSelection = 'missing-action-selection',
  /** The caller named an action that is absent from supplied domain actions. */
  UnknownRequestedAction = 'unknown-requested-action',
  /** The selected action is not navigation-scoped and cannot be spent by a route-navigation lowerer. */
  IncompatibleNavigationAction = 'incompatible-navigation-action',
  /** A route-navigation action needs an exact Aurelia router instruction. */
  MissingRouteInstruction = 'missing-route-instruction',
  /** A route-navigation action needs caller-supplied visible link text. */
  MissingLinkText = 'missing-link-text',
  /** The selected action name cannot be emitted as a TypeScript class method. */
  InvalidActionMethodName = 'invalid-action-method-name',
  /** The action-feedback status member cannot safely lower as a TypeScript member access. */
  InvalidActionFeedbackStatusMember = 'invalid-action-feedback-status-member',
  /** More than one action-feedback payload targeted the same selected action. */
  DuplicateActionFeedback = 'duplicate-action-feedback',
  /** A supplied TypeScript method parameter cannot be emitted in a method signature. */
  InvalidMethodParameter = 'invalid-method-parameter',
  /** A command/action method needs explicit TypeScript body statements. */
  MissingMethodBodyStatements = 'missing-method-body-statements',
  /** A service-call command supplied only part of the required service member/method pair. */
  IncompleteServiceCallFields = 'incomplete-service-call-fields',
  /** A service-call command member cannot safely be emitted as TypeScript member access. */
  InvalidServiceMemberName = 'invalid-service-member-name',
  /** A service-call command method cannot safely be emitted as TypeScript method access. */
  InvalidServiceMethodName = 'invalid-service-method-name',
  /** A service-call command result member cannot safely be emitted as TypeScript member access. */
  InvalidServiceCallResultMemberName = 'invalid-service-call-result-member-name',
  /** A service-call command argument list was not an array of expression strings. */
  InvalidServiceCallArgumentExpressions = 'invalid-service-call-argument-expressions',
  /** A query-state command supplied only part of the required state/reload/value triple. */
  IncompleteServiceQueryStateFields = 'incomplete-service-query-state-fields',
  /** A query-state command member cannot safely be emitted as TypeScript member access. */
  InvalidServiceQueryStateMemberName = 'invalid-service-query-state-member-name',
  /** A query-state command value expression was absent or empty. */
  InvalidServiceQueryStateValueExpression = 'invalid-service-query-state-value-expression',
  /** A query-state reload method cannot safely be emitted as TypeScript method access. */
  InvalidServiceQueryReloadMethodName = 'invalid-service-query-reload-method-name',
  /** A service-call refresh method cannot safely be emitted as TypeScript method access. */
  InvalidServiceCallRefreshMethodName = 'invalid-service-call-refresh-method-name',
  /** A service-call command tried to both assign a result member and refresh through another method. */
  ConflictingServiceCallResultAndRefresh = 'conflicting-service-call-result-and-refresh',
  /** An async data-source member needs an explicit TypeScript-safe member name. */
  MissingAsyncDataMemberName = 'missing-async-data-member-name',
  /** The supplied async data-source member name is not a TypeScript identifier. */
  InvalidAsyncDataMemberName = 'invalid-async-data-member-name',
  /** An async data-source member needs explicit promise type text. */
  MissingAsyncDataPromiseType = 'missing-async-data-promise-type',
  /** An async data-source member needs an explicit initializer expression. */
  MissingAsyncDataInitializerExpression = 'missing-async-data-initializer-expression',
  /** An async data-source member saw a mutability value outside the source-lowering vocabulary. */
  UnknownAsyncDataMemberMutability = 'unknown-async-data-member-mutability',
  /** A selected action cannot safely derive a handler expression and none was supplied. */
  MissingHandlerExpression = 'missing-handler-expression',
  /** A button/action target needs visible or accessible text before source can be lowered. */
  MissingButtonText = 'missing-button-text',
  /** A button/action target saw more than one accessibility label and no explicit text. */
  AmbiguousButtonText = 'ambiguous-button-text',
  /** A native button target saw a buttonType outside the source-lowering vocabulary. */
  UnknownButtonType = 'unknown-button-type',
  /** A message target needs a help/error/status kind and none was supplied or derivable. */
  MissingMessageKind = 'missing-message-kind',
  /** The caller named a help/error/status message kind outside the source-lowering vocabulary. */
  UnknownRequestedMessageKind = 'unknown-requested-message-kind',
  /** A message target needs help/error/status text before source can be lowered. */
  MissingMessageText = 'missing-message-text',
  /** A message target saw more than one help/error/status text and no explicit kind/text. */
  AmbiguousMessageText = 'ambiguous-message-text',
  /** A field group requested an inner control pattern outside the control-pattern catalog. */
  UnknownInnerControlPattern = 'unknown-inner-control-pattern',
  /** A field group requested an inner control pattern that cannot currently be lowered as a native field control. */
  UnsupportedInnerControlPattern = 'unsupported-inner-control-pattern',
  /** A field group needs label text and no explicit, accessibility, or field-title source supplied it. */
  MissingLabelText = 'missing-label-text',
  /** A field group saw multiple accessibility labels and no explicit label text. */
  AmbiguousLabelText = 'ambiguous-label-text',
  /** The lower-level part source invocation reported a lowering issue. */
  PartSourceLoweringIssue = 'part-source-lowering-issue',
}

/** Stable value list for app-builder source-lowering invocation issue kinds. */
export const APP_BUILDER_SOURCE_LOWERING_INVOCATION_ISSUE_KINDS = [
  AppBuilderSourceLoweringInvocationIssueKind.MissingTargetRef,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownTarget,
  AppBuilderSourceLoweringInvocationIssueKind.UnsupportedTargetKind,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownControlPattern,
  AppBuilderSourceLoweringInvocationIssueKind.SourceLoweringNotImplemented,
  AppBuilderSourceLoweringInvocationIssueKind.MissingRequiredInput,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidSuppliedPayload,
  AppBuilderSourceLoweringInvocationIssueKind.TargetRequirementIssue,
  AppBuilderSourceLoweringInvocationIssueKind.MissingDomainFieldsPayload,
  AppBuilderSourceLoweringInvocationIssueKind.MissingNumericRangeConstraints,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidNumericConstraints,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidNativeFieldConstraints,
  AppBuilderSourceLoweringInvocationIssueKind.MissingValueDomainExpression,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedValueSet,
  AppBuilderSourceLoweringInvocationIssueKind.AmbiguousDomainValueSet,
  AppBuilderSourceLoweringInvocationIssueKind.NoCompatibleDomainField,
  AppBuilderSourceLoweringInvocationIssueKind.AmbiguousDomainField,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedField,
  AppBuilderSourceLoweringInvocationIssueKind.IncompatibleRequestedField,
  AppBuilderSourceLoweringInvocationIssueKind.MissingDomainActionsPayload,
  AppBuilderSourceLoweringInvocationIssueKind.NoCompatibleDomainAction,
  AppBuilderSourceLoweringInvocationIssueKind.AmbiguousDomainAction,
  AppBuilderSourceLoweringInvocationIssueKind.MissingActionSelection,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedAction,
  AppBuilderSourceLoweringInvocationIssueKind.IncompatibleNavigationAction,
  AppBuilderSourceLoweringInvocationIssueKind.MissingRouteInstruction,
  AppBuilderSourceLoweringInvocationIssueKind.MissingLinkText,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidActionMethodName,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidActionFeedbackStatusMember,
  AppBuilderSourceLoweringInvocationIssueKind.DuplicateActionFeedback,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidMethodParameter,
  AppBuilderSourceLoweringInvocationIssueKind.MissingMethodBodyStatements,
  AppBuilderSourceLoweringInvocationIssueKind.IncompleteServiceCallFields,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceMemberName,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceMethodName,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceCallResultMemberName,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceCallArgumentExpressions,
  AppBuilderSourceLoweringInvocationIssueKind.IncompleteServiceQueryStateFields,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceQueryStateMemberName,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceQueryStateValueExpression,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceQueryReloadMethodName,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidServiceCallRefreshMethodName,
  AppBuilderSourceLoweringInvocationIssueKind.ConflictingServiceCallResultAndRefresh,
  AppBuilderSourceLoweringInvocationIssueKind.MissingAsyncDataMemberName,
  AppBuilderSourceLoweringInvocationIssueKind.InvalidAsyncDataMemberName,
  AppBuilderSourceLoweringInvocationIssueKind.MissingAsyncDataPromiseType,
  AppBuilderSourceLoweringInvocationIssueKind.MissingAsyncDataInitializerExpression,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownAsyncDataMemberMutability,
  AppBuilderSourceLoweringInvocationIssueKind.MissingHandlerExpression,
  AppBuilderSourceLoweringInvocationIssueKind.MissingButtonText,
  AppBuilderSourceLoweringInvocationIssueKind.AmbiguousButtonText,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownButtonType,
  AppBuilderSourceLoweringInvocationIssueKind.MissingMessageKind,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedMessageKind,
  AppBuilderSourceLoweringInvocationIssueKind.MissingMessageText,
  AppBuilderSourceLoweringInvocationIssueKind.AmbiguousMessageText,
  AppBuilderSourceLoweringInvocationIssueKind.UnknownInnerControlPattern,
  AppBuilderSourceLoweringInvocationIssueKind.UnsupportedInnerControlPattern,
  AppBuilderSourceLoweringInvocationIssueKind.MissingLabelText,
  AppBuilderSourceLoweringInvocationIssueKind.AmbiguousLabelText,
  AppBuilderSourceLoweringInvocationIssueKind.PartSourceLoweringIssue,
] as const;

/** Caller-owned TypeScript method parameter emitted by DomainCommandAction source lowering. */
export interface AppBuilderSourceLoweringTypeScriptMethodParameter {
  /** TypeScript-safe parameter name. */
  readonly name: string;
  /** Exact TypeScript type text emitted after the parameter colon. */
  readonly typeText: string;
}

/** Request for lowering one app-builder ontology target to source fragments. */
export interface AppBuilderSourceLoweringInvocationRequest {
  /** Exact app-builder ontology target selected from target-catalog or preflight. */
  readonly targetRef?: AppBuilderOntologyRowRef | null;
  /** Input markers and facet payloads already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before preflight and lowering. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Domain field to spend; omitted is accepted only when exactly one compatible field exists. */
  readonly fieldName?: string | null;
  /** Domain action to spend; omitted is accepted only when exactly one compatible action exists. */
  readonly actionName?: string | null;
  /** Exact Aurelia router instruction for a route-navigation action. */
  readonly routeInstruction?: string | null;
  /** Exact route params binding expression for a route-navigation action. */
  readonly routeParamsExpression?: string | null;
  /** Exact route context binding expression for a route-navigation action. */
  readonly routeContextExpression?: string | null;
  /** Exact active-state binding expression for a route-navigation action. */
  readonly routeActiveExpression?: string | null;
  /** Router target attribute name for a route-navigation action. */
  readonly routeTargetAttributeName?: string | null;
  /** Visible link text for a route-navigation action. */
  readonly linkText?: string | null;
  /** Inner native control pattern for a field group; omitted derives from the selected domain field value kind. */
  readonly innerControlPatternId?: AppBuilderControlPatternId | null;
  /** Exact Aurelia binding expression; omitted falls back to the selected field member name. */
  readonly bindingExpression?: string | null;
  /** Exact handler expression for action/event source; omitted may derive from a TypeScript-safe action name. */
  readonly handlerExpression?: string | null;
  /** Exact TypeScript method parameters inserted into a generated domain-command method signature. */
  readonly methodParameters?: readonly AppBuilderSourceLoweringTypeScriptMethodParameter[] | null;
  /** Exact TypeScript statements inserted into a generated domain-command method body. */
  readonly methodBodyStatements?: string | null;
  /** TypeScript-safe service member invoked by a generated domain-command method. */
  readonly serviceMemberName?: string | null;
  /** TypeScript-safe service method invoked by a generated domain-command method. */
  readonly serviceMethodName?: string | null;
  /** Optional TypeScript-safe component member assigned from the service call. */
  readonly serviceCallResultMemberName?: string | null;
  /** Exact TypeScript expressions passed to the generated service method call. */
  readonly serviceCallArgumentExpressions?: readonly string[] | null;
  /** TypeScript-safe member updated before a generated query-state reload. */
  readonly serviceQueryStateMemberName?: string | null;
  /** Exact TypeScript expression assigned into the query-state member before reload. */
  readonly serviceQueryStateValueExpression?: string | null;
  /** TypeScript-safe component method called after setting query state. */
  readonly serviceQueryReloadMethodName?: string | null;
  /** TypeScript-safe component method called after awaiting a generated service write. */
  readonly serviceCallRefreshMethodName?: string | null;
  /** TypeScript-safe member name emitted by async data-source source lowering. */
  readonly asyncDataMemberName?: string | null;
  /** Exact TypeScript type text for the emitted async data-source member. */
  readonly asyncDataPromiseType?: string | null;
  /** Exact initializer expression assigned to the emitted async data-source member. */
  readonly asyncDataInitializerExpression?: string | null;
  /** Whether the emitted async data-source member is readonly or mutable; omitted defaults to readonly. */
  readonly asyncDataMemberMutability?: AppBuilderSourceLoweringAsyncDataMemberMutability | null;
  /** DOM event name for action/event source; omitted defaults to `click` for native buttons. */
  readonly eventName?: string | null;
  /** Visible button text; omitted may come from the supplied accessibility label payload. */
  readonly buttonText?: string | null;
  /** Native HTML button type; omitted defaults to `button` to avoid accidental submit behavior. */
  readonly buttonType?: AppBuilderSourceLoweringButtonType | null;
  /** Label text for field-group source or standalone control aria-label; omitted may come from accessibility label payload or selected field title. */
  readonly labelText?: string | null;
  /** DOM id for a field-group control; omitted derives from the selected field name. */
  readonly fieldControlId?: string | null;
  /** Help/error/status message kind to lower; omitted is accepted only when exactly one payload message exists. */
  readonly messageKind?: AppBuilderSourceLoweringMessageKind | null;
  /** Exact help/error/status message text; omitted may come from the supplied accessibility payload. */
  readonly messageText?: string | null;
  /** Optional DOM id for the generated message element. */
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
  /** Include the preflight answer that gated this invocation; defaults to false. */
  readonly includePreflight?: boolean | null;
  /** Stateful emission scope shared by whole-template/source-plan lowerers that need unique generated names. */
  readonly emissionContext?: AppBuilderSourceLoweringEmissionContext | null;
}

/** Domain field chosen by app-builder source lowering. */
export interface AppBuilderSourceLoweringSelectedDomainField {
  /** Caller/domain field descriptor. */
  readonly field: AppBuilderDomainFieldDescriptor;
  /** Source-oriented field projection used by lowerers. */
  readonly sourceModel: AppBuilderDomainFieldSourceModel;
  /** How the field was selected. */
  readonly selectionState: AppBuilderSourceLoweringFieldSelectionState;
}

/** Domain action chosen by app-builder source lowering. */
export interface AppBuilderSourceLoweringSelectedDomainAction {
  /** Caller/domain action descriptor. */
  readonly action: AppBuilderDomainActionDescriptor;
  /** How the action was selected. */
  readonly selectionState: AppBuilderSourceLoweringActionSelectionState;
}

/** Issue produced by app-builder source-lowering invocation. */
export interface AppBuilderSourceLoweringInvocationIssue {
  /** Stable issue category. */
  readonly issueKind: AppBuilderSourceLoweringInvocationIssueKind;
  /** Target row involved in the issue when applicable. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** Requested or candidate field names involved in the issue. */
  readonly fieldNames?: readonly string[];
  /** Requested or candidate action names involved in the issue. */
  readonly actionNames?: readonly string[];
  /** Requested or candidate action-feedback status members involved in the issue. */
  readonly statusMemberNames?: readonly string[];
  /** Route instruction values involved in the issue. */
  readonly routeInstructions?: readonly string[];
  /** Requested method parameter names involved in the issue. */
  readonly methodParameterNames?: readonly string[];
  /** Requested async data-source member names involved in the issue. */
  readonly asyncDataMemberNames?: readonly string[];
  /** Raw async data-source mutability value rejected before typed source lowering could spend it. */
  readonly requestedAsyncDataMemberMutability?: string | null;
  /** Requested service member names involved in the issue. */
  readonly serviceMemberNames?: readonly string[];
  /** Requested service method names involved in the issue. */
  readonly serviceMethodNames?: readonly string[];
  /** Requested service call result member names involved in the issue. */
  readonly serviceCallResultMemberNames?: readonly string[];
  /** Requested query-state member names involved in the issue. */
  readonly serviceQueryStateMemberNames?: readonly string[];
  /** Requested query reload method names involved in the issue. */
  readonly serviceQueryReloadMethodNames?: readonly string[];
  /** Requested service-call refresh method names involved in the issue. */
  readonly serviceCallRefreshMethodNames?: readonly string[];
  /** Collection table headers involved in a target-specific requirement issue. */
  readonly columnHeaders?: readonly string[];
  /** Collection query features involved in a target-specific requirement issue. */
  readonly collectionFeatureIds?: readonly AppBuilderCollectionFeatureId[];
  /** Candidate message kinds involved in the issue. */
  readonly messageKinds?: readonly AppBuilderSourceLoweringMessageKind[];
  /** Raw requested message kind rejected before the typed source-lowering vocabulary could spend it. */
  readonly requestedMessageKind?: string | null;
  /** Candidate native button types involved in the issue. */
  readonly buttonTypes?: readonly AppBuilderSourceLoweringButtonType[];
  /** Raw requested native button type rejected before the typed source-lowering vocabulary could spend it. */
  readonly requestedButtonType?: string | null;
  /** Candidate control patterns involved in the issue. */
  readonly controlPatternIds?: readonly AppBuilderControlPatternId[];
  /** Raw requested inner-control pattern rejected before the typed control-pattern vocabulary could spend it. */
  readonly requestedInnerControlPatternId?: string | null;
  /** Lower-level part issue when source lowering delegated to a part invocation. */
  readonly partSourceLoweringIssue?: AppBuilderPartSourceLoweringIssue;
  /** Source-lowering preflight issue bridged into invocation when a target-specific fact blocks lowering. */
  readonly sourceLoweringPreflightIssue?: AppBuilderSourceLoweringPreflightIssue;
  /** Compact explanation suitable for MCP/IDE display. */
  readonly summary: string;
}

/** Generated-source result for one app-builder ontology target. */
export interface AppBuilderSourceLoweringInvocation {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Target row requested by the caller, if present. */
  readonly targetRef: AppBuilderOntologyRowRef | null;
  /** App-builder ontology rows exercised directly by this source-lowering result. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the selected target through app-builder affordance/pattern rows. */
  readonly effectContractIds: readonly AppBuilderEffectContractId[];
  /** Preflight row for the requested target, if it resolved. */
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  /** Full preflight answer when requested. */
  readonly preflight?: AppBuilderSourceLoweringPreflight;
  /** Control pattern row selected for source lowering. */
  readonly controlPattern: AppBuilderControlPatternRow | null;
  /** Leaf control part selected for the invocation. */
  readonly controlId: AppBuilderControlId | null;
  /** Domain field selected for the invocation, if any. */
  readonly selectedField: AppBuilderSourceLoweringSelectedDomainField | null;
  /** Field-selection state even when no field was selected. */
  readonly fieldSelectionState: AppBuilderSourceLoweringFieldSelectionState;
  /** Domain action selected for the invocation, if any. */
  readonly selectedAction: AppBuilderSourceLoweringSelectedDomainAction | null;
  /** Action-selection state even when no action was selected. */
  readonly actionSelectionState: AppBuilderSourceLoweringActionSelectionState;
  /** Caller-owned TypeScript method parameters emitted by DomainCommandAction source lowering. */
  readonly methodParameters: readonly AppBuilderSourceLoweringTypeScriptMethodParameter[];
  /** TypeScript service member invoked by DomainCommandAction source lowering, when structured service-call fields were spent. */
  readonly serviceMemberName: string | null;
  /** TypeScript service method invoked by DomainCommandAction source lowering, when structured service-call fields were spent. */
  readonly serviceMethodName: string | null;
  /** Component member assigned from the generated service call, when supplied. */
  readonly serviceCallResultMemberName: string | null;
  /** Argument expressions passed to the generated service method call. */
  readonly serviceCallArgumentExpressions: readonly string[];
  /** Query-state member assigned before a generated reload, when supplied. */
  readonly serviceQueryStateMemberName: string | null;
  /** Query-state value expression assigned before a generated reload, when supplied. */
  readonly serviceQueryStateValueExpression: string | null;
  /** Component method called after setting query state, when supplied. */
  readonly serviceQueryReloadMethodName: string | null;
  /** Component method called after awaiting a generated service write, when supplied. */
  readonly serviceCallRefreshMethodName: string | null;
  /** TypeScript-safe member name emitted by async data-source source lowering. */
  readonly asyncDataMemberName: string | null;
  /** Exact TypeScript type text emitted for the async data-source member. */
  readonly asyncDataPromiseType: string | null;
  /** Exact initializer expression emitted for the async data-source member. */
  readonly asyncDataInitializerExpression: string | null;
  /** Mutability emitted for the async data-source member. */
  readonly asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability | null;
  /** Binding expression spent by the part invocation. */
  readonly bindingExpression: string | null;
  /** Provenance for the binding expression when present. */
  readonly bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource | null;
  /** Handler expression spent by an action/event invocation. */
  readonly handlerExpression: string | null;
  /** Provenance for the handler expression when present. */
  readonly handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource | null;
  /** Route instruction spent by a route-navigation action. */
  readonly routeInstruction: string | null;
  /** Route params binding expression spent by a route-navigation action. */
  readonly routeParamsExpression: string | null;
  /** Route context binding expression spent by a route-navigation action. */
  readonly routeContextExpression: string | null;
  /** Router active-state expression spent by a route-navigation action. */
  readonly routeActiveExpression: string | null;
  /** Router target attribute name spent by a route-navigation action. */
  readonly routeTargetAttributeName: string | null;
  /** Visible link text spent by a route-navigation action. */
  readonly linkText: string | null;
  /** DOM event name spent by an action/event invocation. */
  readonly eventName: string | null;
  /** Visible text spent by a generated button/action element. */
  readonly buttonText: string | null;
  /** Native HTML button type spent by a generated button/action element. */
  readonly buttonType: AppBuilderSourceLoweringButtonType | null;
  /** Help/error/status message kind spent by a generated message element. */
  readonly messageKind: AppBuilderSourceLoweringMessageKind | null;
  /** Message-selection state even when no message was selected. */
  readonly messageSelectionState: AppBuilderSourceLoweringMessageSelectionState;
  /** Help/error/status message text spent by source lowering. */
  readonly messageText: string | null;
  /** Provenance for the selected message text when present. */
  readonly messageTextSource: AppBuilderSourceLoweringMessageTextSource | null;
  /** DOM id spent by the generated message element when supplied or derivable. */
  readonly messageId: string | null;
  /** Inner native control pattern spent by a field-group invocation. */
  readonly innerControlPatternId: AppBuilderControlPatternId | null;
  /** Inner-control selection state even when no inner control was selected. */
  readonly innerControlSelectionState: AppBuilderSourceLoweringInnerControlSelectionState;
  /** Label text or standalone accessible-name text spent by control source lowering. */
  readonly labelText: string | null;
  /** Provenance for label/accessibility text when present. */
  readonly labelTextSource: AppBuilderSourceLoweringLabelTextSource | null;
  /** DOM id spent by the generated field control when a wrapper needs label/description relationships. */
  readonly fieldControlId: string | null;
  /** Provenance for the generated field control id when present. */
  readonly fieldControlIdSource: AppBuilderSourceLoweringFieldControlIdSource | null;
  /** Help/error/status ids attached to the generated field control through aria-describedby. */
  readonly describedByIds: readonly string[];
  /** Option/value-domain expression spent by choice-control source lowering. */
  readonly valueDomainExpression: string | null;
  /** Provenance for the option/value-domain expression when present. */
  readonly valueDomainExpressionSource: AppBuilderSourceLoweringValueDomainExpressionSource | null;
  /** Reusable value set selected for choice controls, if one was spent. */
  readonly selectedValueSet: AppBuilderDomainValueSetDescriptor | null;
  /** Concrete delegated part invocation when all source-lowering gates closed. */
  readonly partInvocation: AppBuilderPartSourceInvocation | null;
  /** Lower-level part source-lowering result when invoked. */
  readonly partSourceLowering: AppBuilderPartSourceLowering | null;
  /** Concrete control-use rows proven by the generated source fragments. */
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
  /** Generated source fragments from the delegated part lowerer. */
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  /** Source-lowering invocation and bridged part-source issues. */
  readonly issues: readonly AppBuilderSourceLoweringInvocationIssue[];
}
