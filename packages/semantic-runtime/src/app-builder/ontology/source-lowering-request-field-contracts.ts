import type { AppBuilderOntologyRowRef } from './relation.js';
import type { AppBuilderSourceLoweringSurfaceKind } from './source-lowering-surface.js';

/** Request-field necessity for one source-lowering surface after durable input readiness has been checked. */
export enum AppBuilderSourceLoweringRequestFieldRequirementKind {
  /** The lowering surface cannot emit truthful source without this exact request field. */
  Required = 'required',
  /** The lowering surface needs this field only when default derivation would be ambiguous or unsafe. */
  Conditional = 'conditional',
  /** The field refines generated source but is not structurally required. */
  Optional = 'optional',
}

/** Stable value list for source-lowering request-field requirement kinds. */
export const APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_REQUIREMENT_KINDS = [
  AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
  AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
  AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
] as const;

/** Source-lowering request fields that are distinct from durable supplied-input facets. */
export enum AppBuilderSourceLoweringRequestFieldId {
  /** SourcePlan root directory selected for generated file previews. */
  RootDir = 'root-dir',
  /** HTML template path selected for fragment-backed SourcePlan previews. */
  TemplatePath = 'template-path',
  /** Non-template source path selected for TypeScript-backed SourcePlan previews. */
  SourceTargetPath = 'source-target-path',
  /** Direct AppShell source-lowering envelope selected for SourcePlan preview. */
  SourceLoweringAppShell = 'source-lowering-app-shell',
  /** Direct application-assembly source-lowering envelope selected for SourcePlan preview. */
  SourceLoweringApplicationAssembly = 'source-lowering-application-assembly',
  /** Child route-area envelopes assembled by a direct application-assembly SourcePlan preview. */
  ApplicationAssemblyRouteAreas = 'application-assembly-route-areas',
  /** Direct router-backed list/detail source-lowering envelope selected for SourcePlan preview. */
  SourceLoweringRouterBackedListDetail = 'source-lowering-router-backed-list-detail',
  /** Primary domain entity selected when router-backed list/detail lowering receives multiple domain entities. */
  RouterBackedListDetailPrimaryEntityName = 'router-backed-list-detail-primary-entity-name',
  /** Optional create-form envelope rendered on a router-backed list/detail list route. */
  RouterBackedListDetailCreateForm = 'router-backed-list-detail-create-form',
  /** Optional service boundary envelope emitted behind router-backed list/detail state. */
  RouterBackedListDetailServiceCollection = 'router-backed-list-detail-service-collection',
  /** Service method name used by a router-backed list/detail create form through its service boundary. */
  RouterBackedListDetailServiceCollectionCreateMethodName = 'router-backed-list-detail-service-collection-create-method-name',
  /** Inverse related collection sections rendered inside a router-backed detail route. */
  RouterBackedListDetailDetailRelatedCollections = 'router-backed-list-detail-detail-related-collections',
  /** Direct DI state-class source-lowering envelope selected for SourcePlan preview. */
  SourceLoweringDiStateClass = 'source-lowering-di-state-class',
  /** Direct local view-model state source-lowering envelope selected for SourcePlan preview. */
  SourceLoweringLocalViewModelState = 'source-lowering-local-view-model-state',
  /** One-target invocation envelope selected for SourcePlan preview. */
  SourceLoweringInvocation = 'source-lowering-invocation',
  /** Fragment-composition envelope selected for SourcePlan preview. */
  SourceLoweringComposition = 'source-lowering-composition',
  /** Component-pair envelope selected for a companion TypeScript/template SourcePlan preview. */
  SourceLoweringComponentPair = 'source-lowering-component-pair',
  /** Direct one-target invocations inserted into a component-pair template file. */
  SourceLoweringTemplateInvocations = 'source-lowering-template-invocations',
  /** Generated service collection support files attached to a component-pair SourcePlan. */
  ComponentPairServiceCollections = 'component-pair-service-collections',
  /** TypeScript service file path selected for a generated service collection. */
  ServiceCollectionSourceTargetPath = 'service-collection-source-target-path',
  /** Exported TypeScript class name selected for a generated service collection. */
  ServiceCollectionClassName = 'service-collection-class-name',
  /** Component view-model member name used to resolve a generated service collection. */
  ServiceCollectionComponentMemberName = 'service-collection-component-member-name',
  /** Domain entity name selected for a generated service collection. */
  ServiceCollectionEntityName = 'service-collection-entity-name',
  /** TypeScript record interface name emitted by a generated service collection. */
  ServiceCollectionRecordTypeName = 'service-collection-record-type-name',
  /** Service method name emitted by a generated service collection. */
  ServiceCollectionLoadMethodName = 'service-collection-load-method-name',
  /** Service method name emitted for routed/detail identity lookup. */
  ServiceCollectionFindMethodName = 'service-collection-find-method-name',
  /** Optional equality-filter methods emitted by a generated service collection. */
  ServiceCollectionFilterMethods = 'service-collection-filter-methods',
  /** Service method name emitted for one generated service collection filter method. */
  ServiceCollectionFilterMethodName = 'service-collection-filter-method-name',
  /** Domain field member compared by one generated service collection filter method. */
  ServiceCollectionFilterFieldName = 'service-collection-filter-field-name',
  /** TypeScript parameter name accepted by one generated service collection filter method. */
  ServiceCollectionFilterParameterName = 'service-collection-filter-parameter-name',
  /** Predicate kind emitted by one generated service collection filter method. */
  ServiceCollectionFilterPredicateKind = 'service-collection-filter-predicate-kind',
  /** Optional create/write methods emitted by a generated service collection. */
  ServiceCollectionCreateMethods = 'service-collection-create-methods',
  /** Service method name emitted for one generated service collection create method. */
  ServiceCollectionCreateMethodName = 'service-collection-create-method-name',
  /** Ordered domain field members accepted by one generated service collection create method. */
  ServiceCollectionCreateInputFieldNames = 'service-collection-create-input-field-names',
  /** Optional update methods emitted by a generated service collection. */
  ServiceCollectionUpdateMethods = 'service-collection-update-methods',
  /** Service method name emitted for one generated service collection update method. */
  ServiceCollectionUpdateMethodName = 'service-collection-update-method-name',
  /** Ordered domain field members accepted by one generated service collection update method after identity. */
  ServiceCollectionUpdateInputFieldNames = 'service-collection-update-input-field-names',
  /** Optional component query-state members and reload methods emitted beside a generated service collection. */
  ServiceCollectionQueryStates = 'service-collection-query-states',
  /** Optional routed query controls emitted beside a generated service collection. */
  ServiceCollectionQueryControls = 'service-collection-query-controls',
  /** Component member that stores one generated service query state. */
  ServiceCollectionQueryStateMemberName = 'service-collection-query-state-member-name',
  /** Exact TypeScript type text emitted for one generated service query-state member. */
  ServiceCollectionQueryStateTypeText = 'service-collection-query-state-type-text',
  /** Exact initializer expression emitted for one generated service query-state member. */
  ServiceCollectionQueryStateInitialValueExpression = 'service-collection-query-state-initial-value-expression',
  /** Exact inactive value expression compared by one generated service query reload method. */
  ServiceCollectionQueryStateInactiveValueExpression = 'service-collection-query-state-inactive-value-expression',
  /** Component method that refreshes the result member through one generated service query state. */
  ServiceCollectionQueryReloadMethodName = 'service-collection-query-reload-method-name',
  /** Promise-valued component member assigned by one generated service query reload method. */
  ServiceCollectionQueryResultMemberName = 'service-collection-query-result-member-name',
  /** Service filter method called by one generated service query reload method. */
  ServiceCollectionQueryFilterMethodName = 'service-collection-query-filter-method-name',
  /** Integration-scoped domain action applied by one generated routed service query control. */
  ServiceCollectionQueryApplyActionName = 'service-collection-query-apply-action-name',
  /** Visible button text applied by one generated routed service query control. */
  ServiceCollectionQueryApplyButtonText = 'service-collection-query-apply-button-text',
  /** Integration-scoped domain action cleared by one generated routed service query control. */
  ServiceCollectionQueryClearActionName = 'service-collection-query-clear-action-name',
  /** Visible button text cleared by one generated routed service query control. */
  ServiceCollectionQueryClearButtonText = 'service-collection-query-clear-button-text',
  /** Domain field selector spent by one-target field/control invocation. */
  FieldName = 'field-name',
  /** Exact Aurelia binding expression spent by one-target field/control invocation. */
  BindingExpression = 'binding-expression',
  /** Inner native control pattern selected for a composed field group. */
  InnerControlPatternId = 'inner-control-pattern-id',
  /** Exact value-domain expression repeated by a choice control invocation. */
  ValueDomainExpression = 'value-domain-expression',
  /** Named domain value set selected for a choice control invocation. */
  ValueSetName = 'value-set-name',
  /** Template local name introduced for each choice option row. */
  OptionLocalName = 'option-local-name',
  /** Exact option value/model expression spent by a choice control invocation. */
  OptionValueExpression = 'option-value-expression',
  /** Choice option binding form selected for native value versus Aurelia model identity. */
  OptionBindingKind = 'option-binding-kind',
  /** Exact option label expression spent by a choice control invocation. */
  OptionLabelExpression = 'option-label-expression',
  /** Matcher expression spent by choice controls that need custom identity comparison. */
  MatcherExpression = 'matcher-expression',
  /** DOM event name spent by one-target action invocation. */
  EventName = 'event-name',
  /** Visible button text spent by native button invocation. */
  ButtonText = 'button-text',
  /** Native HTML button type spent by native button invocation. */
  ButtonType = 'button-type',
  /** Visible label text or standalone control accessible-name text spent by invocation. */
  LabelText = 'label-text',
  /** DOM id used to link a field-group label and control. */
  FieldControlId = 'field-control-id',
  /** Help/error/status message kind spent by form-message invocation. */
  MessageKind = 'message-kind',
  /** Visible help/error/status message text spent by form-message invocation. */
  MessageText = 'message-text',
  /** DOM id for a generated form-message element. */
  MessageId = 'message-id',
  /** Exact composition kind to spend when the selected target cannot or should not derive it. */
  CompositionKind = 'composition-kind',
  /** Ordered domain field names selected for a generated form. */
  FieldNames = 'field-names',
  /** Receiver expression prepended to selected fields when direct field names are not the intended binding root. */
  BindingRootExpression = 'binding-root-expression',
  /** Exact per-field binding expressions used when default member-name binding is unsafe or insufficient. */
  FieldBindingExpressions = 'field-binding-expressions',
  /** Exact per-field inner control selections used when value-kind defaults are insufficient. */
  FieldControlSelections = 'field-control-selections',
  /** One domain relationship name selected inside a nested relationship-control selection. */
  RelationshipName = 'relationship-name',
  /** Ordered domain relationship names selected for object-valued controls in a generated form. */
  RelationshipNames = 'relationship-names',
  /** Exact per-relationship control selections used when object-valued relationship defaults are insufficient. */
  RelationshipControlSelections = 'relationship-control-selections',
  /** Exact per-action row handler expressions used when default row action calls are unsafe or insufficient. */
  ActionHandlerExpressions = 'action-handler-expressions',
  /** Exact per-action batch button controls used when BatchActions is selected. */
  BatchActionControls = 'batch-action-controls',
  /** Exact per-field sort handler expressions used by sortable collection table columns. */
  SortHandlerExpressions = 'sort-handler-expressions',
  /** Exact per-field filter control binding expressions used by filterable collection table columns. */
  FilterBindingExpressions = 'filter-binding-expressions',
  /** Exact previous-page handler expression used by local pagination controls. */
  PaginationPreviousHandlerExpression = 'pagination-previous-handler-expression',
  /** Exact next-page handler expression used by local pagination controls. */
  PaginationNextHandlerExpression = 'pagination-next-handler-expression',
  /** Exact current-page expression displayed by local pagination status. */
  PaginationCurrentPageExpression = 'pagination-current-page-expression',
  /** Exact page-count expression displayed by local pagination status. */
  PaginationPageCountExpression = 'pagination-page-count-expression',
  /** Visible previous-page button text for local pagination controls. */
  PaginationPreviousButtonText = 'pagination-previous-button-text',
  /** Visible next-page button text for local pagination controls. */
  PaginationNextButtonText = 'pagination-next-button-text',
  /** Exact checked-state expression used by local row-selection checkboxes. */
  RowSelectionCheckedExpression = 'row-selection-checked-expression',
  /** Exact toggle handler expression used by local row-selection checkboxes. */
  RowSelectionToggleHandlerExpression = 'row-selection-toggle-handler-expression',
  /** Visible table-column header for local row-selection checkboxes. */
  RowSelectionColumnHeaderText = 'row-selection-column-header-text',
  /** Exact aria-label expression used by local row-selection checkboxes. */
  RowSelectionCheckboxLabelExpression = 'row-selection-checkbox-label-expression',
  /** Domain action name selected for a generated form submit or command target. */
  ActionName = 'action-name',
  /** Exact Aurelia router instruction spent by a route-navigation action. */
  RouteInstruction = 'route-instruction',
  /** Exact route params binding expression spent by a route-navigation action. */
  RouteParamsExpression = 'route-params-expression',
  /** Exact route context binding expression spent by a route-navigation action. */
  RouteContextExpression = 'route-context-expression',
  /** Exact active-state binding expression spent by a route-navigation action. */
  RouteActiveExpression = 'route-active-expression',
  /** Router target attribute name spent by a route-navigation action. */
  RouteTargetAttributeName = 'route-target-attribute-name',
  /** Visible link text spent by a route-navigation action. */
  LinkText = 'link-text',
  /** Exact handler expression selected for a generated form submit. */
  HandlerExpression = 'handler-expression',
  /** Exact TypeScript method parameters emitted by a generated command method. */
  TypeScriptMethodParameters = 'typescript-method-parameters',
  /** Exact TypeScript statements inserted into a generated command method body. */
  TypeScriptMethodBodyStatements = 'typescript-method-body-statements',
  /** TypeScript member that owns an injected service instance for a generated command method. */
  ServiceMemberName = 'service-member-name',
  /** Service method invoked by a generated command method. */
  ServiceMethodName = 'service-method-name',
  /** Optional component member that receives the service call result. */
  ServiceCallResultMemberName = 'service-call-result-member-name',
  /** Exact argument expressions passed to the generated service method call. */
  ServiceCallArgumentExpressions = 'service-call-argument-expressions',
  /** Component member assigned before a generated query-state reload. */
  ServiceQueryStateMemberName = 'service-query-state-member-name',
  /** Exact value expression assigned into a generated query-state member. */
  ServiceQueryStateValueExpression = 'service-query-state-value-expression',
  /** Component method called after assigning a generated query-state member. */
  ServiceQueryReloadMethodName = 'service-query-reload-method-name',
  /** Component method called after awaiting a generated service write. */
  ServiceCallRefreshMethodName = 'service-call-refresh-method-name',
  /** TypeScript-safe member name emitted by async data-source source lowering. */
  AsyncDataMemberName = 'async-data-member-name',
  /** Exact promise member type emitted by async data-source source lowering. */
  AsyncDataPromiseType = 'async-data-promise-type',
  /** Exact initializer expression assigned to the emitted async data-source member. */
  AsyncDataInitializerExpression = 'async-data-initializer-expression',
  /** Whether an async data-source member is emitted as readonly or mutable. */
  AsyncDataMemberMutability = 'async-data-member-mutability',
  /** Visible submit button text for a generated form. */
  SubmitButtonText = 'submit-button-text',
  /** Exact iterable expression spent by a collection projection repeat. */
  CollectionExpression = 'collection-expression',
  /** Template local name introduced for each row of a collection projection. */
  ItemLocalName = 'item-local-name',
  /** Visible empty-state text for a collection or async-state projection. */
  EmptyStateText = 'empty-state-text',
  /** Exact condition expression that decides whether the empty-state branch renders. */
  EmptyStateConditionExpression = 'empty-state-condition-expression',
  /** Exact promise expression spent by an async loading/empty/error state region. */
  PromiseExpression = 'promise-expression',
  /** Visible pending-state text for an async loading/empty/error state region. */
  PendingText = 'pending-text',
  /** Optional fulfilled-branch local name introduced by the promise template controller. */
  FulfilledLocalName = 'fulfilled-local-name',
  /** Optional rejected-branch local name introduced by the promise template controller. */
  RejectedLocalName = 'rejected-local-name',
  /** Visible rejected-state text for an async loading/empty/error state region. */
  RejectedText = 'rejected-text',
  /** Optional nested composition rendered inside the fulfilled non-empty promise branch. */
  FulfilledContentComposition = 'fulfilled-content-composition',
  /** Ordered app-section children that may be compositions or direct target invocations. */
  ChildContent = 'child-content',
  /** Ordered child compositions rendered inside an app-section composition. */
  ChildCompositions = 'child-compositions',
}

/** Stable value list for source-lowering request-field transport schemas. */
export const APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_IDS = [
  AppBuilderSourceLoweringRequestFieldId.RootDir,
  AppBuilderSourceLoweringRequestFieldId.TemplatePath,
  AppBuilderSourceLoweringRequestFieldId.SourceTargetPath,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringAppShell,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringRouterBackedListDetail,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailPrimaryEntityName,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailCreateForm,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollection,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollectionCreateMethodName,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailDetailRelatedCollections,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringDiStateClass,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringLocalViewModelState,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringInvocation,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringComposition,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringComponentPair,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringTemplateInvocations,
  AppBuilderSourceLoweringRequestFieldId.ComponentPairServiceCollections,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionSourceTargetPath,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionClassName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionComponentMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionEntityName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionRecordTypeName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionLoadMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFindMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethods,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterFieldName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterParameterName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterPredicateKind,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethods,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateInputFieldNames,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethods,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateInputFieldNames,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStates,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryControls,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateTypeText,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInitialValueExpression,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInactiveValueExpression,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryReloadMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryResultMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryFilterMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyActionName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyButtonText,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearActionName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearButtonText,
  AppBuilderSourceLoweringRequestFieldId.FieldName,
  AppBuilderSourceLoweringRequestFieldId.BindingExpression,
  AppBuilderSourceLoweringRequestFieldId.InnerControlPatternId,
  AppBuilderSourceLoweringRequestFieldId.ValueDomainExpression,
  AppBuilderSourceLoweringRequestFieldId.ValueSetName,
  AppBuilderSourceLoweringRequestFieldId.OptionLocalName,
  AppBuilderSourceLoweringRequestFieldId.OptionValueExpression,
  AppBuilderSourceLoweringRequestFieldId.OptionBindingKind,
  AppBuilderSourceLoweringRequestFieldId.OptionLabelExpression,
  AppBuilderSourceLoweringRequestFieldId.MatcherExpression,
  AppBuilderSourceLoweringRequestFieldId.EventName,
  AppBuilderSourceLoweringRequestFieldId.ButtonText,
  AppBuilderSourceLoweringRequestFieldId.ButtonType,
  AppBuilderSourceLoweringRequestFieldId.LabelText,
  AppBuilderSourceLoweringRequestFieldId.FieldControlId,
  AppBuilderSourceLoweringRequestFieldId.MessageKind,
  AppBuilderSourceLoweringRequestFieldId.MessageText,
  AppBuilderSourceLoweringRequestFieldId.MessageId,
  AppBuilderSourceLoweringRequestFieldId.CompositionKind,
  AppBuilderSourceLoweringRequestFieldId.FieldNames,
  AppBuilderSourceLoweringRequestFieldId.BindingRootExpression,
  AppBuilderSourceLoweringRequestFieldId.FieldBindingExpressions,
  AppBuilderSourceLoweringRequestFieldId.FieldControlSelections,
  AppBuilderSourceLoweringRequestFieldId.RelationshipName,
  AppBuilderSourceLoweringRequestFieldId.RelationshipNames,
  AppBuilderSourceLoweringRequestFieldId.RelationshipControlSelections,
  AppBuilderSourceLoweringRequestFieldId.ActionHandlerExpressions,
  AppBuilderSourceLoweringRequestFieldId.BatchActionControls,
  AppBuilderSourceLoweringRequestFieldId.SortHandlerExpressions,
  AppBuilderSourceLoweringRequestFieldId.FilterBindingExpressions,
  AppBuilderSourceLoweringRequestFieldId.PaginationPreviousHandlerExpression,
  AppBuilderSourceLoweringRequestFieldId.PaginationNextHandlerExpression,
  AppBuilderSourceLoweringRequestFieldId.PaginationCurrentPageExpression,
  AppBuilderSourceLoweringRequestFieldId.PaginationPageCountExpression,
  AppBuilderSourceLoweringRequestFieldId.PaginationPreviousButtonText,
  AppBuilderSourceLoweringRequestFieldId.PaginationNextButtonText,
  AppBuilderSourceLoweringRequestFieldId.RowSelectionCheckedExpression,
  AppBuilderSourceLoweringRequestFieldId.RowSelectionToggleHandlerExpression,
  AppBuilderSourceLoweringRequestFieldId.RowSelectionColumnHeaderText,
  AppBuilderSourceLoweringRequestFieldId.RowSelectionCheckboxLabelExpression,
  AppBuilderSourceLoweringRequestFieldId.ActionName,
  AppBuilderSourceLoweringRequestFieldId.RouteInstruction,
  AppBuilderSourceLoweringRequestFieldId.RouteParamsExpression,
  AppBuilderSourceLoweringRequestFieldId.RouteContextExpression,
  AppBuilderSourceLoweringRequestFieldId.RouteActiveExpression,
  AppBuilderSourceLoweringRequestFieldId.RouteTargetAttributeName,
  AppBuilderSourceLoweringRequestFieldId.LinkText,
  AppBuilderSourceLoweringRequestFieldId.HandlerExpression,
  AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodParameters,
  AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodBodyStatements,
  AppBuilderSourceLoweringRequestFieldId.ServiceMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCallResultMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCallArgumentExpressions,
  AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateValueExpression,
  AppBuilderSourceLoweringRequestFieldId.ServiceQueryReloadMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCallRefreshMethodName,
  AppBuilderSourceLoweringRequestFieldId.AsyncDataMemberName,
  AppBuilderSourceLoweringRequestFieldId.AsyncDataPromiseType,
  AppBuilderSourceLoweringRequestFieldId.AsyncDataInitializerExpression,
  AppBuilderSourceLoweringRequestFieldId.AsyncDataMemberMutability,
  AppBuilderSourceLoweringRequestFieldId.SubmitButtonText,
  AppBuilderSourceLoweringRequestFieldId.CollectionExpression,
  AppBuilderSourceLoweringRequestFieldId.ItemLocalName,
  AppBuilderSourceLoweringRequestFieldId.EmptyStateText,
  AppBuilderSourceLoweringRequestFieldId.EmptyStateConditionExpression,
  AppBuilderSourceLoweringRequestFieldId.PromiseExpression,
  AppBuilderSourceLoweringRequestFieldId.PendingText,
  AppBuilderSourceLoweringRequestFieldId.FulfilledLocalName,
  AppBuilderSourceLoweringRequestFieldId.RejectedLocalName,
  AppBuilderSourceLoweringRequestFieldId.RejectedText,
  AppBuilderSourceLoweringRequestFieldId.FulfilledContentComposition,
  AppBuilderSourceLoweringRequestFieldId.ChildContent,
  AppBuilderSourceLoweringRequestFieldId.ChildCompositions,
] as const;

/** Owner surface that carried one observed source-lowering request field value. */
export enum AppBuilderSourceLoweringRequestFieldUsageOwnerKind {
  /** Top-level SourcePlan preview request envelope carried the field. */
  SourcePlan = 'source-plan',
  /** One-target invocation request carried the field. */
  Invocation = 'invocation',
  /** Fragment-composition request carried the field. */
  Composition = 'composition',
  /** Nested field-control selection in a form composition carried invocation-compatible field-control details. */
  CompositionFieldControlSelection = 'composition-field-control-selection',
  /** Nested relationship-control selection in a form composition carried object-valued relationship control details. */
  CompositionRelationshipControlSelection = 'composition-relationship-control-selection',
  /** Component-pair template side carried the nested composition field. */
  ComponentPairTemplate = 'component-pair-template',
  /** Component-pair template side carried one nested invocation field. */
  ComponentPairTemplateInvocation = 'component-pair-template-invocation',
  /** Component-pair class side carried the nested local state field. */
  ComponentPairClass = 'component-pair-class',
  /** Component-pair class member carried one nested invocation field. */
  ComponentPairClassMember = 'component-pair-class-member',
  /** Component-pair service collection support request carried one service boundary field. */
  ComponentPairServiceCollection = 'component-pair-service-collection',
}

/** Compact request-field value-shape families used in generated fixture coverage rows. */
export enum AppBuilderSourceLoweringRequestFieldValueShapeKind {
  /** Request field value was an array. */
  Array = 'array',
  /** Request field value was an object record. */
  Object = 'object',
  /** Request field value was a string. */
  String = 'string',
  /** Request field value was a number. */
  Number = 'number',
  /** Request field value was a boolean. */
  Boolean = 'boolean',
  /** Request field value was a bigint. */
  BigInt = 'bigint',
  /** Request field value was a symbol. */
  Symbol = 'symbol',
  /** Request field value was a function. */
  Function = 'function',
  /** Request field value was undefined before usage filtering. */
  Undefined = 'undefined',
}

/** Stable value list for request-field value-shape transport schemas. */
export const APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_VALUE_SHAPE_KINDS = [
  AppBuilderSourceLoweringRequestFieldValueShapeKind.Array,
  AppBuilderSourceLoweringRequestFieldValueShapeKind.Object,
  AppBuilderSourceLoweringRequestFieldValueShapeKind.String,
  AppBuilderSourceLoweringRequestFieldValueShapeKind.Number,
  AppBuilderSourceLoweringRequestFieldValueShapeKind.Boolean,
  AppBuilderSourceLoweringRequestFieldValueShapeKind.BigInt,
  AppBuilderSourceLoweringRequestFieldValueShapeKind.Symbol,
  AppBuilderSourceLoweringRequestFieldValueShapeKind.Function,
  AppBuilderSourceLoweringRequestFieldValueShapeKind.Undefined,
] as const;

/** Compact value shape for reviewable request-field usage without copying request values. */
export interface AppBuilderSourceLoweringRequestFieldValueShape {
  /** JSON-ish broad value kind observed at the request field. */
  readonly kind: AppBuilderSourceLoweringRequestFieldValueShapeKind;
  /** Array length when the request value was an array. */
  readonly itemCount?: number;
  /** Object key count when the request value was an object. */
  readonly keyCount?: number;
}

/** One observed request-field value inside a source-lowering request tree. */
export interface AppBuilderSourceLoweringRequestFieldUsageRow {
  /** Dot/index path to the request field inside the public request tree. */
  readonly requestPath: string;
  /** Request owner surface that carried the field. */
  readonly ownerKind: AppBuilderSourceLoweringRequestFieldUsageOwnerKind;
  /** Enum-backed request field identity. */
  readonly fieldId: AppBuilderSourceLoweringRequestFieldId;
  /** Public request property name that carried the field value. */
  readonly requestFieldName: string;
  /** Compact value shape; actual request values stay in the stored request snapshot. */
  readonly valueShape: AppBuilderSourceLoweringRequestFieldValueShape;
}

/** Registry owner that explains why one source-lowering request field is public. */
export enum AppBuilderSourceLoweringRequestFieldRegistryOwnerKind {
  /** Request field is attached to one executable source-lowering ontology target. */
  SourceLoweringTarget = 'source-lowering-target',
  /** Request field is attached to a SourcePlan envelope selection rather than one target. */
  SourcePlanSelection = 'source-plan-selection',
}

/** Stable value list for request-field registry-owner summaries. */
export const APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_REGISTRY_OWNER_KINDS = [
  AppBuilderSourceLoweringRequestFieldRegistryOwnerKind.SourceLoweringTarget,
  AppBuilderSourceLoweringRequestFieldRegistryOwnerKind.SourcePlanSelection,
] as const;

/** SourcePlan envelope selector used when registry ownership is not target-local. */
export enum AppBuilderSourceLoweringSourcePlanSelectionKind {
  /** Direct AppShell SourcePlan envelope. */
  AppShell = 'app-shell',
  /** Direct ApplicationAssembly SourcePlan envelope. */
  ApplicationAssembly = 'application-assembly',
  /** Direct router-backed list/detail SourcePlan envelope. */
  RouterBackedListDetail = 'router-backed-list-detail',
  /** Direct DI state-class SourcePlan envelope. */
  DiStateClass = 'di-state-class',
  /** Direct local view-model state SourcePlan envelope. */
  LocalViewModelState = 'local-view-model-state',
  /** One-target invocation SourcePlan envelope. */
  TargetInvocation = 'target-invocation',
  /** Fragment-composition SourcePlan envelope. */
  FragmentComposition = 'fragment-composition',
  /** Component-pair SourcePlan envelope. */
  ComponentPair = 'component-pair',
}

/** One registry row that admits a source-lowering request field. */
export interface AppBuilderSourceLoweringRequestFieldRegistryRow {
  /** Registry owner kind for this request-field admission. */
  readonly ownerKind: AppBuilderSourceLoweringRequestFieldRegistryOwnerKind;
  /** Target that owns the field when ownerKind is source-lowering-target. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** SourcePlan selector that owns the field when ownerKind is source-plan-selection. */
  readonly sourcePlanSelectionKind?: AppBuilderSourceLoweringSourcePlanSelectionKind;
  /** Enum-backed request field identity. */
  readonly fieldId: AppBuilderSourceLoweringRequestFieldId;
  /** Public request property that carries the field. */
  readonly requestFieldName: string;
  /** Public source-lowering surface that consumes the field. */
  readonly surfaceKind: AppBuilderSourceLoweringSurfaceKind;
  /** Necessity of the field for that surface after durable input readiness. */
  readonly requirementKind: AppBuilderSourceLoweringRequestFieldRequirementKind;
}

/** Named usage source, usually one generated or pressure fixture row. */
export interface AppBuilderSourceLoweringRequestFieldCoverageUsageSource {
  /** Stable source id used in coverage rows, for example a fixture id. */
  readonly sourceId: string;
  /** Usage rows observed inside the source. */
  readonly usageRows: readonly AppBuilderSourceLoweringRequestFieldUsageRow[];
}

/** One registry-versus-usage coverage row for source-lowering request fields. */
export interface AppBuilderSourceLoweringRequestFieldRegistryCoverageRow {
  /** Enum-backed request field being reviewed. */
  readonly fieldId: AppBuilderSourceLoweringRequestFieldId;
  /** Public request property names observed or registered for the field. */
  readonly requestFieldNames: readonly string[];
  /** True when the field is admitted by the registry. */
  readonly registeredBySourceLoweringRegistry: boolean;
  /** Registry owner kinds that admitted this field. */
  readonly registryOwnerKinds: readonly AppBuilderSourceLoweringRequestFieldRegistryOwnerKind[];
  /** Target refs that admit this field, when target-owned. */
  readonly registeredTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** SourcePlan envelope selections that admit this field, when selection-owned. */
  readonly registeredSourcePlanSelectionKinds: readonly AppBuilderSourceLoweringSourcePlanSelectionKind[];
  /** Source-lowering surfaces that admit this field. */
  readonly registeredSurfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[];
  /** Requirement kinds observed across registry rows. */
  readonly registeredRequirementKinds: readonly AppBuilderSourceLoweringRequestFieldRequirementKind[];
  /** Number of required registry rows for this field. */
  readonly requiredRegistryRowCount: number;
  /** Number of conditional registry rows for this field. */
  readonly conditionalRegistryRowCount: number;
  /** Number of optional registry rows for this field. */
  readonly optionalRegistryRowCount: number;
  /** True when any usage source spent this field. */
  readonly usedBySource: boolean;
  /** Usage source ids that spent this field. */
  readonly usageSourceIds: readonly string[];
  /** Request owner kinds that carried this field in usage rows. */
  readonly usageOwnerKinds: readonly AppBuilderSourceLoweringRequestFieldUsageOwnerKind[];
  /** Compact value shapes observed for this field. */
  readonly usageValueShapes: readonly AppBuilderSourceLoweringRequestFieldValueShape[];
  /** Total usage-row count for this field. */
  readonly usageCount: number;
}

/** Compact summary over source-lowering request-field registry coverage rows. */
export interface AppBuilderSourceLoweringRequestFieldRegistryCoverageSummary {
  /** Registry owner kinds included in the compact count fields for this summary. */
  readonly summarizedRegistryOwnerKinds: readonly AppBuilderSourceLoweringRequestFieldRegistryOwnerKind[];
  /** Source-lowering surfaces included in the compact count fields for this summary. */
  readonly summarizedSurfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[];
  /** Request-field rows in the registry/usage union. */
  readonly requestFieldCount: number;
  /** Rows admitted by source-lowering request-field registry ownership. */
  readonly registeredFieldCount: number;
  /** Rows observed in at least one usage source. */
  readonly usedFieldCount: number;
  /** Registered rows not observed in any usage source. */
  readonly unusedFieldCount: number;
  /** Used fields that lack registry ownership. */
  readonly unregisteredUsedFieldCount: number;
  /** Required registry fields not observed in any usage source. */
  readonly unusedRequiredFieldCount: number;
  /** Non-required conditional-only registry fields not observed in any usage source. */
  readonly unusedConditionalOnlyFieldCount: number;
  /** Optional-only registry fields not observed in any usage source. */
  readonly unusedOptionalOnlyFieldCount: number;
  /** Non-required fields with mixed conditional/optional registrations not observed in any usage source. */
  readonly unusedMixedRequirementFieldCount: number;
  /** Registry owner kinds present in the coverage rows. */
  readonly registryOwnerKinds: readonly AppBuilderSourceLoweringRequestFieldRegistryOwnerKind[];
  /** Requirement kinds present in the coverage rows. */
  readonly registeredRequirementKinds: readonly AppBuilderSourceLoweringRequestFieldRequirementKind[];
}

/** Options for compact request-field coverage summaries in fixture/review indexes. */
export interface AppBuilderSourceLoweringRequestFieldRegistryCoverageSummaryOptions {
  /** Registry owner kinds counted as in-scope for missing/unused registry-field summaries. */
  readonly summarizedRegistryOwnerKinds?: readonly AppBuilderSourceLoweringRequestFieldRegistryOwnerKind[];
  /** Source-lowering surfaces counted as in-scope for missing/unused registry-field summaries. */
  readonly summarizedSurfaceKinds?: readonly AppBuilderSourceLoweringSurfaceKind[];
}

/** Request field owned by a source-lowering surface outside durable supplied-input facets. */
export interface AppBuilderSourceLoweringRequestFieldRequirement {
  /** Stable enum id for the request field. */
  readonly fieldId: AppBuilderSourceLoweringRequestFieldId;
  /** Exact public request property that carries the field. */
  readonly requestFieldName: string;
  /** Source-lowering surface that consumes the request field. */
  readonly surfaceKind: AppBuilderSourceLoweringSurfaceKind;
  /** Whether the field is required, conditional, or optional for this target/surface. */
  readonly requirementKind: AppBuilderSourceLoweringRequestFieldRequirementKind;
  /** Compact reason why this field is needed or useful. */
  readonly summary: string;
}

/** Compact per-surface rollup for source-lowering request-field contract rows. */
export interface AppBuilderSourceLoweringRequestFieldSurfaceSummary {
  /** Source-lowering surface whose request fields were counted. */
  readonly surfaceKind: AppBuilderSourceLoweringSurfaceKind;
  /** Total fields on this surface. */
  readonly requestFieldCount: number;
  /** Required fields on this surface. */
  readonly requiredCount: number;
  /** Conditional fields on this surface. */
  readonly conditionalCount: number;
  /** Optional fields on this surface. */
  readonly optionalCount: number;
  /** Public request property names required before this surface can lower truthfully when detail is requested. */
  readonly requiredRequestFieldNames?: readonly string[];
  /** Public request property names needed only when default derivation would be ambiguous or unsafe when detail is requested. */
  readonly conditionalRequestFieldNames?: readonly string[];
  /** Public request property names that refine this surface without being structurally required when detail is requested. */
  readonly optionalRequestFieldNames?: readonly string[];
}

/** Compact rollup for source-lowering request-field contract rows. */
export interface AppBuilderSourceLoweringRequestFieldSummary {
  /** Total request-field rows. */
  readonly requestFieldCount: number;
  /** Required request-field rows. */
  readonly requiredCount: number;
  /** Conditional request-field rows. */
  readonly conditionalCount: number;
  /** Optional request-field rows. */
  readonly optionalCount: number;
  /** True when the selected surface contract has at least one required request field outside durable input facets. */
  readonly hasRequiredRequestFields: boolean;
  /** Surface-scoped request-field counts, with public property names only when detail is requested. */
  readonly surfaces: readonly AppBuilderSourceLoweringRequestFieldSurfaceSummary[];
}

/** Detail options for compact source-lowering request-field summaries. */
export interface AppBuilderSourceLoweringRequestFieldSummaryOptions {
  /** Include public request property name arrays on surface summaries. */
  readonly includeRequestFieldNames?: boolean | null;
}

/** SourcePlan envelope selection whose request fields are not owned by one ontology target row. */
export interface AppBuilderSourceLoweringSourcePlanRequestFieldSelection {
  /** Direct AppShell source-lowering envelope was selected. */
  readonly sourceLoweringAppShell?: boolean;
  /** Direct application-assembly source-lowering envelope was selected. */
  readonly sourceLoweringApplicationAssembly?: boolean;
  /** Direct router-backed list/detail source-lowering envelope was selected. */
  readonly sourceLoweringRouterBackedListDetail?: boolean;
  /** Direct DI state-class source-lowering envelope was selected. */
  readonly sourceLoweringDiStateClass?: boolean;
  /** Direct local view-model state source-lowering envelope was selected. */
  readonly sourceLoweringLocalViewModelState?: boolean;
  /** One-target invocation source-lowering envelope was selected. */
  readonly sourceLoweringInvocation?: boolean;
  /** Fragment-composition source-lowering envelope was selected. */
  readonly sourceLoweringComposition?: boolean;
  /** Component-pair assembly source-lowering envelope was selected. */
  readonly sourceLoweringComponentPair?: boolean;
}
