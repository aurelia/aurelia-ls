import { AppBuilderApplicationPatternId } from './application-pattern.js';
import { AppBuilderControlPatternId } from './control.js';
import { AppBuilderOntologyRowKind, type AppBuilderOntologyRowRef } from './relation.js';
import { appBuilderSourceLoweringSurfaceKindsForTarget, AppBuilderSourceLoweringSurfaceKind } from './source-lowering-surface.js';
import type {
  AppBuilderSourceLoweringRequestFieldRequirement,
  AppBuilderSourceLoweringRequestFieldSummary,
  AppBuilderSourceLoweringRequestFieldSummaryOptions,
  AppBuilderSourceLoweringRequestFieldSurfaceSummary,
  AppBuilderSourceLoweringSourcePlanRequestFieldSelection,
} from './source-lowering-request-field-contracts.js';
import {
  AppBuilderSourceLoweringRequestFieldId,
  AppBuilderSourceLoweringRequestFieldRequirementKind,
} from './source-lowering-request-field-contracts.js';

export const APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_NAMES = {
  [AppBuilderSourceLoweringRequestFieldId.RootDir]: 'rootDir',
  [AppBuilderSourceLoweringRequestFieldId.TemplatePath]: 'templatePath',
  [AppBuilderSourceLoweringRequestFieldId.SourceTargetPath]: 'sourceTargetPath',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringAppShell]: 'sourceLoweringAppShell',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringApplicationAssembly]: 'sourceLoweringApplicationAssembly',
  [AppBuilderSourceLoweringRequestFieldId.ApplicationAssemblyRouteAreas]: 'routeAreas',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringRouterBackedListDetail]: 'sourceLoweringRouterBackedListDetail',
  [AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailPrimaryEntityName]: 'primaryEntityName',
  [AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailCreateForm]: 'createForm',
  [AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollection]: 'serviceCollection',
  [AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollectionCreateMethodName]: 'createMethodName',
  [AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailDetailRelatedCollections]: 'detailRelatedCollections',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringDiStateClass]: 'sourceLoweringDiStateClass',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringLocalViewModelState]: 'sourceLoweringLocalViewModelState',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringInvocation]: 'sourceLoweringInvocation',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringComposition]: 'sourceLoweringComposition',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringComponentPair]: 'sourceLoweringComponentPair',
  [AppBuilderSourceLoweringRequestFieldId.SourceLoweringTemplateInvocations]: 'sourceLoweringTemplateInvocations',
  [AppBuilderSourceLoweringRequestFieldId.ComponentPairServiceCollections]: 'serviceCollections',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionSourceTargetPath]: 'sourceTargetPath',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionClassName]: 'serviceClassName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionComponentMemberName]: 'componentMemberName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionEntityName]: 'collectionEntityName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionRecordTypeName]: 'recordTypeName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionLoadMethodName]: 'loadMethodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFindMethodName]: 'findMethodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethods]: 'filterMethods',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethodName]: 'methodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterFieldName]: 'fieldName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterParameterName]: 'parameterName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterPredicateKind]: 'predicateKind',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethods]: 'createMethods',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethodName]: 'methodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateInputFieldNames]: 'inputFieldNames',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethods]: 'updateMethods',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethodName]: 'methodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateInputFieldNames]: 'inputFieldNames',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStates]: 'queryStates',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryControls]: 'queryControls',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateMemberName]: 'stateMemberName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateTypeText]: 'stateTypeText',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInitialValueExpression]: 'initialValueExpression',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInactiveValueExpression]: 'inactiveValueExpression',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryReloadMethodName]: 'reloadMethodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryResultMemberName]: 'resultMemberName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryFilterMethodName]: 'filterMethodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyActionName]: 'applyActionName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyButtonText]: 'applyButtonText',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearActionName]: 'clearActionName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearButtonText]: 'clearButtonText',
  [AppBuilderSourceLoweringRequestFieldId.FieldName]: 'fieldName',
  [AppBuilderSourceLoweringRequestFieldId.BindingExpression]: 'bindingExpression',
  [AppBuilderSourceLoweringRequestFieldId.InnerControlPatternId]: 'innerControlPatternId',
  [AppBuilderSourceLoweringRequestFieldId.ValueDomainExpression]: 'valueDomainExpression',
  [AppBuilderSourceLoweringRequestFieldId.ValueSetName]: 'valueSetName',
  [AppBuilderSourceLoweringRequestFieldId.OptionLocalName]: 'optionLocalName',
  [AppBuilderSourceLoweringRequestFieldId.OptionValueExpression]: 'optionValueExpression',
  [AppBuilderSourceLoweringRequestFieldId.OptionBindingKind]: 'optionBindingKind',
  [AppBuilderSourceLoweringRequestFieldId.OptionLabelExpression]: 'optionLabelExpression',
  [AppBuilderSourceLoweringRequestFieldId.MatcherExpression]: 'matcherExpression',
  [AppBuilderSourceLoweringRequestFieldId.EventName]: 'eventName',
  [AppBuilderSourceLoweringRequestFieldId.ButtonText]: 'buttonText',
  [AppBuilderSourceLoweringRequestFieldId.ButtonType]: 'buttonType',
  [AppBuilderSourceLoweringRequestFieldId.LabelText]: 'labelText',
  [AppBuilderSourceLoweringRequestFieldId.FieldControlId]: 'fieldControlId',
  [AppBuilderSourceLoweringRequestFieldId.MessageKind]: 'messageKind',
  [AppBuilderSourceLoweringRequestFieldId.MessageText]: 'messageText',
  [AppBuilderSourceLoweringRequestFieldId.MessageId]: 'messageId',
  [AppBuilderSourceLoweringRequestFieldId.CompositionKind]: 'compositionKind',
  [AppBuilderSourceLoweringRequestFieldId.FieldNames]: 'fieldNames',
  [AppBuilderSourceLoweringRequestFieldId.BindingRootExpression]: 'bindingRootExpression',
  [AppBuilderSourceLoweringRequestFieldId.FieldBindingExpressions]: 'fieldBindingExpressions',
  [AppBuilderSourceLoweringRequestFieldId.FieldControlSelections]: 'fieldControlSelections',
  [AppBuilderSourceLoweringRequestFieldId.RelationshipName]: 'relationshipName',
  [AppBuilderSourceLoweringRequestFieldId.RelationshipNames]: 'relationshipNames',
  [AppBuilderSourceLoweringRequestFieldId.RelationshipControlSelections]: 'relationshipControlSelections',
  [AppBuilderSourceLoweringRequestFieldId.ActionHandlerExpressions]: 'actionHandlerExpressions',
  [AppBuilderSourceLoweringRequestFieldId.BatchActionControls]: 'batchActionControls',
  [AppBuilderSourceLoweringRequestFieldId.SortHandlerExpressions]: 'sortHandlerExpressions',
  [AppBuilderSourceLoweringRequestFieldId.FilterBindingExpressions]: 'filterBindingExpressions',
  [AppBuilderSourceLoweringRequestFieldId.PaginationPreviousHandlerExpression]: 'paginationPreviousHandlerExpression',
  [AppBuilderSourceLoweringRequestFieldId.PaginationNextHandlerExpression]: 'paginationNextHandlerExpression',
  [AppBuilderSourceLoweringRequestFieldId.PaginationCurrentPageExpression]: 'paginationCurrentPageExpression',
  [AppBuilderSourceLoweringRequestFieldId.PaginationPageCountExpression]: 'paginationPageCountExpression',
  [AppBuilderSourceLoweringRequestFieldId.PaginationPreviousButtonText]: 'paginationPreviousButtonText',
  [AppBuilderSourceLoweringRequestFieldId.PaginationNextButtonText]: 'paginationNextButtonText',
  [AppBuilderSourceLoweringRequestFieldId.RowSelectionCheckedExpression]: 'rowSelectionCheckedExpression',
  [AppBuilderSourceLoweringRequestFieldId.RowSelectionToggleHandlerExpression]: 'rowSelectionToggleHandlerExpression',
  [AppBuilderSourceLoweringRequestFieldId.RowSelectionColumnHeaderText]: 'rowSelectionColumnHeaderText',
  [AppBuilderSourceLoweringRequestFieldId.RowSelectionCheckboxLabelExpression]: 'rowSelectionCheckboxLabelExpression',
  [AppBuilderSourceLoweringRequestFieldId.ActionName]: 'actionName',
  [AppBuilderSourceLoweringRequestFieldId.RouteInstruction]: 'routeInstruction',
  [AppBuilderSourceLoweringRequestFieldId.RouteParamsExpression]: 'routeParamsExpression',
  [AppBuilderSourceLoweringRequestFieldId.RouteContextExpression]: 'routeContextExpression',
  [AppBuilderSourceLoweringRequestFieldId.RouteActiveExpression]: 'routeActiveExpression',
  [AppBuilderSourceLoweringRequestFieldId.RouteTargetAttributeName]: 'routeTargetAttributeName',
  [AppBuilderSourceLoweringRequestFieldId.LinkText]: 'linkText',
  [AppBuilderSourceLoweringRequestFieldId.HandlerExpression]: 'handlerExpression',
  [AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodParameters]: 'methodParameters',
  [AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodBodyStatements]: 'methodBodyStatements',
  [AppBuilderSourceLoweringRequestFieldId.ServiceMemberName]: 'serviceMemberName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceMethodName]: 'serviceMethodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCallResultMemberName]: 'serviceCallResultMemberName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCallArgumentExpressions]: 'serviceCallArgumentExpressions',
  [AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateMemberName]: 'serviceQueryStateMemberName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateValueExpression]: 'serviceQueryStateValueExpression',
  [AppBuilderSourceLoweringRequestFieldId.ServiceQueryReloadMethodName]: 'serviceQueryReloadMethodName',
  [AppBuilderSourceLoweringRequestFieldId.ServiceCallRefreshMethodName]: 'serviceCallRefreshMethodName',
  [AppBuilderSourceLoweringRequestFieldId.AsyncDataMemberName]: 'asyncDataMemberName',
  [AppBuilderSourceLoweringRequestFieldId.AsyncDataPromiseType]: 'asyncDataPromiseType',
  [AppBuilderSourceLoweringRequestFieldId.AsyncDataInitializerExpression]: 'asyncDataInitializerExpression',
  [AppBuilderSourceLoweringRequestFieldId.AsyncDataMemberMutability]: 'asyncDataMemberMutability',
  [AppBuilderSourceLoweringRequestFieldId.SubmitButtonText]: 'submitButtonText',
  [AppBuilderSourceLoweringRequestFieldId.CollectionExpression]: 'collectionExpression',
  [AppBuilderSourceLoweringRequestFieldId.ItemLocalName]: 'itemLocalName',
  [AppBuilderSourceLoweringRequestFieldId.EmptyStateText]: 'emptyStateText',
  [AppBuilderSourceLoweringRequestFieldId.EmptyStateConditionExpression]: 'emptyStateConditionExpression',
  [AppBuilderSourceLoweringRequestFieldId.PromiseExpression]: 'promiseExpression',
  [AppBuilderSourceLoweringRequestFieldId.PendingText]: 'pendingText',
  [AppBuilderSourceLoweringRequestFieldId.FulfilledLocalName]: 'fulfilledLocalName',
  [AppBuilderSourceLoweringRequestFieldId.RejectedLocalName]: 'rejectedLocalName',
  [AppBuilderSourceLoweringRequestFieldId.RejectedText]: 'rejectedText',
  [AppBuilderSourceLoweringRequestFieldId.FulfilledContentComposition]: 'fulfilledContentComposition',
  [AppBuilderSourceLoweringRequestFieldId.ChildContent]: 'childContent',
  [AppBuilderSourceLoweringRequestFieldId.ChildCompositions]: 'childCompositions',
} as const satisfies Record<AppBuilderSourceLoweringRequestFieldId, string>;


const SOURCE_PLAN_PREVIEW_PLACEMENT_REQUEST_FIELDS = [
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RootDir,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'SourcePlan preview needs rootDir or a supplied SourceRoot facet; app-builder will not invent project placement.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_TEMPLATE_PLACEMENT_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.TemplatePath,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Fragment-backed SourcePlan preview needs templatePath or a supplied SourceTargetPath facet; app-builder will not invent filenames.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_SOURCE_TARGET_PLACEMENT_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceTargetPath,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'SourcePlan preview over TypeScript source artifacts needs sourceTargetPath or a supplied SourceTargetPath facet; app-builder will not invent filenames.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_INVOCATION_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_TEMPLATE_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringInvocation,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'SourcePlan preview over one-target fragments needs the nested sourceLoweringInvocation envelope that selects the exact lowerer.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_COMPOSITION_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_TEMPLATE_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringComposition,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'SourcePlan preview over composed fragments needs the nested sourceLoweringComposition envelope that selects the exact composition lowerer.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_COMPONENT_PAIR_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_SOURCE_TARGET_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.TemplatePath,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Component-pair SourcePlan preview needs an explicit templatePath because SourceTargetPath is reserved for the TypeScript view-model file.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringComponentPair,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Component-pair SourcePlan preview needs the nested sourceLoweringComponentPair envelope that selects template fragments and class-member fragments.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringTemplateInvocations,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Component-pair SourcePlan previews may include direct one-target template invocations beside a higher-level template composition.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ComponentPairServiceCollections,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Component-pair SourcePlan previews may include generated service collection support files when the caller wants an explicit service boundary.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionSourceTargetPath,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each generated service collection needs sourceTargetPath when serviceCollections is supplied.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionClassName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each generated service collection needs serviceClassName when serviceCollections is supplied.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionComponentMemberName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Generated service collections may override the component view-model member that resolves the service.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionEntityName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Generated service collections need collectionEntityName when more than one supplied domain entity could back the service.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionRecordTypeName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Generated service collections may override the emitted record interface name.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionLoadMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each generated service collection needs loadMethodName when serviceCollections is supplied.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethods,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Generated service collections may include explicit equality-filter methods for caller-selected query refinements.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection filter method needs an explicit TypeScript methodName.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterFieldName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection filter method needs an explicit domain fieldName to compare.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterParameterName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection filter method needs an explicit TypeScript parameterName.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterPredicateKind,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Service collection filter methods may select an explicit predicateKind; omitted filter methods default to strict equality.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethods,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Generated service collections may include explicit create/write methods when the caller wants a service-backed mutation boundary.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection create method needs an explicit TypeScript methodName.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateInputFieldNames,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection create method needs explicit inputFieldNames so app-builder does not infer write payload shape from the domain by itself.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethods,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Generated service collections may include explicit update methods when the caller wants a service-backed row mutation boundary.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection update method needs an explicit TypeScript methodName.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateInputFieldNames,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection update method needs explicit inputFieldNames so app-builder only mutates caller-selected fields after the domain identity.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStates,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Generated service collections may include component query-state members and reload methods that preserve active service filters across writes.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryControls,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed service collections may include visible query controls that reload the routed collection promise through generated service filters.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateMemberName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection query-state row needs a TypeScript-safe stateMemberName.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateTypeText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection query-state row needs exact stateTypeText because app-builder will not infer query-state unions.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInitialValueExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection query-state row needs an explicit initialValueExpression for the inactive query state.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInactiveValueExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection query-state row needs an inactiveValueExpression so reload source can choose between load and filter methods.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryReloadMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection query-state row needs a TypeScript-safe reloadMethodName.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryResultMemberName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection query-state row needs a resultMemberName for the promise-valued component member it refreshes.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryFilterMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each service collection query-state row needs a filterMethodName that matches a generated service collection filter method.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyActionName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each routed service query control needs an integration-scoped applyActionName from DomainActions.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyButtonText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each routed service query control needs explicit visible applyButtonText.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearActionName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each routed service query control needs an integration-scoped clearActionName from DomainActions.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearButtonText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each routed service query control needs explicit visible clearButtonText.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_SERVICE_BACKED_LOAD_SAVE_REQUEST_FIELDS = SOURCE_PLAN_PREVIEW_COMPONENT_PAIR_REQUEST_FIELDS.map((field) =>
  field.fieldId === AppBuilderSourceLoweringRequestFieldId.ComponentPairServiceCollections
    ? {
        ...field,
        requirementKind: AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
        summary: 'Service-backed load/save SourcePlan preview needs at least one serviceCollections row so the selected target actually emits a service boundary.',
      }
    : field
);

const SOURCE_PLAN_PREVIEW_APP_SHELL_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringAppShell,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Direct AppShell SourcePlan preview needs the nested sourceLoweringAppShell envelope that selects the AppShell target and inputs.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_APPLICATION_ASSEMBLY_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringApplicationAssembly,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Direct ApplicationAssembly SourcePlan preview needs the nested sourceLoweringApplicationAssembly envelope that selects the assembly target and inputs.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ApplicationAssemblyRouteAreas,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'ApplicationAssembly SourcePlan preview needs routeAreas entries so the generated shell can assemble child routed app areas.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_ROUTER_BACKED_LIST_DETAIL_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringRouterBackedListDetail,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Direct router-backed list/detail SourcePlan preview needs the nested sourceLoweringRouterBackedListDetail envelope that selects the pattern target and inputs.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailPrimaryEntityName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Router-backed list/detail needs primaryEntityName when more than one supplied domain entity could back the routed collection.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ActionName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail can optionally render an explicit navigation-scoped domain action as the visible row-to-detail link.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.LinkText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Router-backed list/detail needs explicit linkText when actionName selects a navigation-scoped row-to-detail action.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailCreateForm,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail may include a list-route createForm envelope when the caller wants routed browsing plus local create source in the same app.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollection,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail may include a serviceCollection envelope when the caller wants generated DI state to delegate routed load/find/create operations through a service boundary.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailDetailRelatedCollections,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail may include explicit detailRelatedCollections for inverse related sections on detail routes.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldNames,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Router-backed list/detail createForm needs explicit ordered fieldNames when createForm is supplied.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SubmitButtonText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Router-backed list/detail createForm needs explicit submitButtonText when createForm is supplied.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionSourceTargetPath,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail serviceCollection may override the derived service source file path.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionClassName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail serviceCollection may override the derived service class name.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionLoadMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail serviceCollection may override the derived collection load method name.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFindMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail serviceCollection may override the derived detail lookup method name.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollectionCreateMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail serviceCollection may override the derived create method name used by the generated create form.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethods,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail serviceCollection may include explicit filterMethods for routed query controls.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethods,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail serviceCollection may include explicit updateMethods for entity-scoped row command actions.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryControls,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Router-backed list/detail serviceCollection may include explicit queryControls that render search/reset UI and reload the routed collection promise.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_DI_STATE_CLASS_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_SOURCE_TARGET_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringDiStateClass,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Direct DI state-class SourcePlan preview needs the nested sourceLoweringDiStateClass envelope that selects the state target and inputs.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const SOURCE_PLAN_PREVIEW_LOCAL_VIEW_MODEL_STATE_REQUEST_FIELDS = [
  ...SOURCE_PLAN_PREVIEW_SOURCE_TARGET_PLACEMENT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringLocalViewModelState,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Direct local view-model state SourcePlan preview needs the nested sourceLoweringLocalViewModelState envelope that selects the state target and inputs.',
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ),
] as const;

const FRAGMENT_COMPOSITION_DISPATCH_REQUEST_FIELDS = [
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.CompositionKind,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Fragment compositions may supply compositionKind as an explicit discriminator; targetRef can derive it when omitted.',
    AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
  ),
] as const;

const TARGET_INVOCATION_FIELD_BINDING_REQUEST_FIELDS = [
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Field controls need fieldName when more than one compatible domain field exists or the caller wants a specific field.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.BindingExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Field controls may supply an exact bindingExpression when the selected member name is not the intended Aurelia binding expression.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const TARGET_INVOCATION_FIELD_CONTROL_REQUEST_FIELDS = [
  ...TARGET_INVOCATION_FIELD_BINDING_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.LabelText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Standalone field controls may supply labelText for generated aria-label or grouped-control legend text; omitted can fall back to accessibility-label input or selected field title.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const TARGET_INVOCATION_CHOICE_CONTROL_REQUEST_FIELDS = [
  ...TARGET_INVOCATION_FIELD_CONTROL_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ValueDomainExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Choice controls need valueDomainExpression when field-local options or a single compatible value set cannot derive the option domain.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ValueSetName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Choice controls need valueSetName when multiple supplied value sets could satisfy the selected field and no explicit valueDomainExpression is supplied.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.OptionLocalName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Choice controls may override the option local name introduced while repeating the value domain.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.OptionValueExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Choice controls may override the option value/model expression when option rows do not use the default value shape.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.OptionBindingKind,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Choice controls may choose native value binding or Aurelia model identity for generated option rows.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.OptionLabelExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Choice controls may override the option label expression when option rows do not use the default title shape.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.MatcherExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Choice controls may provide matcherExpression when object or identity comparison cannot rely on Aurelia defaults.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const TARGET_INVOCATION_NATIVE_BUTTON_REQUEST_FIELDS = [
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ActionName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Native buttons need actionName when more than one domain action exists or the caller wants a specific action.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.HandlerExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Native buttons need handlerExpression when the selected action name cannot derive a safe TypeScript call.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.EventName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Native buttons may override the DOM event name; omitted defaults to click.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ButtonText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Native buttons need buttonText when accessibility-label input is missing or ambiguous.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ButtonType,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Native buttons may override buttonType; omitted defaults to button to avoid accidental submit behavior.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const TARGET_INVOCATION_DOMAIN_COMMAND_ACTION_REQUEST_FIELDS = [
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ActionName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Domain command action source lowering needs explicit actionName so app-builder does not infer behavior ownership.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodParameters,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Domain command action source lowering may emit explicit methodParameters when caller-owned behavior receives a row, draft, or other typed value.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodBodyStatements,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Domain command action source lowering needs explicit methodBodyStatements unless a narrow local action or explicit service call fields can derive the method body.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceMemberName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Domain command action source lowering can derive a simple service-call method body when serviceMemberName and serviceMethodName are supplied.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Domain command action source lowering can derive a simple service-call method body when serviceMemberName and serviceMethodName are supplied.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCallResultMemberName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'A service-backed command may assign the service call result to a component member such as a promise-valued data source.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCallArgumentExpressions,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'A service-backed command may pass exact caller-owned argument expressions to the selected service method.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateMemberName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'A service-backed query command may name the serviceQueryStateMemberName it sets or reloads through serviceQueryReloadMethodName.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateValueExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'A service-backed query command may assign an exact serviceQueryStateValueExpression before refreshing; reload-only commands can omit it when the template already binds the state member.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceQueryReloadMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'A service-backed query command may call serviceQueryReloadMethodName after setting or reading query state.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ServiceCallRefreshMethodName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'A service-backed write command may await the service call and then refresh through serviceCallRefreshMethodName instead of assigning the direct service result.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const TARGET_INVOCATION_ROUTE_NAVIGATION_ACTION_REQUEST_FIELDS = [
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ActionName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Route-navigation actions need an explicit navigation-scoped actionName from DomainActions; app-builder will not guess which action is navigation.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouteInstruction,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Route-navigation actions need an exact Aurelia router instruction; app-builder will not invent route names or topology.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.LinkText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Route-navigation actions need visible linkText supplied by the caller; app-builder will not invent end-user copy.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouteParamsExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Route-navigation actions may supply params.bind when the route instruction needs parameters.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouteContextExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Route-navigation actions may supply context.bind when navigation should resolve relative to an explicit route context.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouteActiveExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Route-navigation actions may supply active.bind when generated source should expose router active state.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RouteTargetAttributeName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Route-navigation actions may override the target attribute that receives the router href.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const TARGET_INVOCATION_ASYNC_DATA_SOURCE_REQUEST_FIELDS = [
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.AsyncDataMemberName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Async data-source source lowering needs explicit asyncDataMemberName so templates bind to a caller-named promise member.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.AsyncDataPromiseType,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Async data-source source lowering needs explicit asyncDataPromiseType so the generated member is type-checkable without inference guesses.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.AsyncDataInitializerExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Async data-source source lowering needs explicit asyncDataInitializerExpression; app-builder will not invent fetching or loading behavior.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.AsyncDataMemberMutability,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Async data-source source lowering defaults to readonly members; refresh/reload flows may explicitly request mutable promise state.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const TARGET_INVOCATION_FIELD_GROUP_REQUEST_FIELDS = [
  ...TARGET_INVOCATION_FIELD_BINDING_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.InnerControlPatternId,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Field groups may choose an inner native control pattern instead of deriving one from the selected field value kind.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.LabelText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Field groups need labelText when accessibility labels are missing or ambiguous and the selected field has no title.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldControlId,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Field groups may override the DOM id used to connect the generated label and control.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const TARGET_INVOCATION_FORM_MESSAGE_REQUEST_FIELDS = [
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.MessageKind,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Form messages need messageKind when payload messages are missing, ambiguous, or messageText is supplied without exactly one payload kind.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.MessageText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Form messages need messageText when accessibility help/error/status input is missing or ambiguous.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.MessageId,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Form messages may override the DOM id for the generated message element.',
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
  ),
] as const;

const COLLECTION_BINDING_CONTEXT_REQUEST_FIELDS = [
  ...FRAGMENT_COMPOSITION_DISPATCH_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.CollectionExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Collection projections need the iterable expression to repeat; app-builder will not invent a data source.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ItemLocalName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Collection projections need the repeat local name so nested field bindings have a truthful scope.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldBindingExpressions,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection projections need explicit field bindings when field names are not safe TypeScript member expressions.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.EmptyStateText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Collection projections can add an empty state when the caller supplies visible empty-state text.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.EmptyStateConditionExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection projections need an explicit empty-state condition whenever empty-state text is supplied.',
  ),
] as const;

const COLLECTION_TABLE_REQUEST_FIELDS = [
  ...COLLECTION_BINDING_CONTEXT_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ActionHandlerExpressions,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table action columns need explicit row handlers when the action name cannot safely derive a row call.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.BatchActionControls,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table batch actions need explicit actionName, handlerExpression, and buttonText rows when BatchActions is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SortHandlerExpressions,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table sortable columns need explicit sort handlers; app-builder will not invent sort state or method names.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FilterBindingExpressions,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table filterable columns need explicit filter-control bindings; app-builder will not invent query state member names.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.PaginationPreviousHandlerExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local pagination needs an explicit previous-page handler expression when LocalPagination is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.PaginationNextHandlerExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local pagination needs an explicit next-page handler expression when LocalPagination is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.PaginationCurrentPageExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local pagination needs an explicit current-page expression when LocalPagination is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.PaginationPageCountExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local pagination needs an explicit page-count expression when LocalPagination is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.PaginationPreviousButtonText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local pagination needs explicit previous-button text when LocalPagination is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.PaginationNextButtonText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local pagination needs explicit next-button text when LocalPagination is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RowSelectionCheckedExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local row selection needs an explicit checked-state expression when RowSelection is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RowSelectionToggleHandlerExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local row selection needs an explicit toggle handler expression when RowSelection is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RowSelectionColumnHeaderText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local row selection needs explicit column header text when RowSelection is selected.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RowSelectionCheckboxLabelExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Collection table local row selection needs an explicit checkbox aria-label expression when RowSelection is selected.',
  ),
] as const;

const LOADING_EMPTY_ERROR_REQUEST_FIELDS = [
  ...FRAGMENT_COMPOSITION_DISPATCH_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.PromiseExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Loading/empty/error regions need the exact promise expression to spend in promise.bind.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.PendingText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Loading/empty/error regions need visible pending-state text.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.EmptyStateText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Loading/empty/error regions need visible empty-state text for the fulfilled empty branch.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.EmptyStateConditionExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Loading/empty/error regions need an explicit empty-state condition; app-builder will not guess empty semantics.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RejectedText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Loading/empty/error regions need visible rejected-state text.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FulfilledLocalName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Promise fulfilled branches may introduce a local name when the caller wants one.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RejectedLocalName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Promise rejected branches may introduce a local name when the caller wants one.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FulfilledContentComposition,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Loading/empty/error regions may render an explicit nested composition in the fulfilled non-empty branch.',
  ),
] as const;

const NATIVE_SUBMIT_FORM_REQUEST_FIELDS = [
  ...FRAGMENT_COMPOSITION_DISPATCH_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldNames,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Native submit forms need explicit fieldNames to choose field order rather than inheriting arbitrary domain order.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ActionName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Native submit forms need an explicit submit action name from the supplied domain actions.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SubmitButtonText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Native submit forms need visible submit button text.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.BindingRootExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Native submit forms may bind selected fields through a receiver expression such as a draft object.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldBindingExpressions,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Native submit forms need explicit field bindings when field names are not safe TypeScript member expressions.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldControlSelections,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Native submit forms may select a specific inner field-control pattern per selected field when value-kind defaults are insufficient.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RelationshipNames,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Native submit forms may render explicit object-valued reference relationships in caller-controlled order.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RelationshipControlSelections,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Native submit forms may select relationship control details such as option domain, model expression, and matcher expression.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RelationshipName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each native submit-form relationshipControlSelection needs relationshipName to select the object-valued relationship it configures.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.HandlerExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Native submit forms need an explicit handler expression when the selected action name cannot derive a safe submit call.',
  ),
] as const;

const DOMAIN_BACKED_SUBMIT_FORM_REQUEST_FIELDS = [
  ...FRAGMENT_COMPOSITION_DISPATCH_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldNames,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Domain-backed submit forms need explicit fieldNames to choose field order and derive local object state.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ActionName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Domain-backed submit forms need an explicit submit action name from the supplied domain actions.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.SubmitButtonText,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Domain-backed submit forms need visible submit button text.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.BindingRootExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Required,
    'Domain-backed submit forms need a receiver expression so fields bind through one local domain object.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldBindingExpressions,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Domain-backed submit forms need explicit field bindings when field names are not safe TypeScript member expressions.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.FieldControlSelections,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Domain-backed submit forms may select a specific inner field-control pattern per selected field when value-kind defaults are insufficient.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RelationshipNames,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Domain-backed submit forms may render explicit object-valued reference relationships in caller-controlled order.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RelationshipControlSelections,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Optional,
    'Domain-backed submit forms may select relationship control details such as option domain, model expression, and matcher expression.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.RelationshipName,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Each domain-backed submit-form relationshipControlSelection needs relationshipName to select the object-valued relationship it configures.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.HandlerExpression,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'Domain-backed submit forms need an explicit handler expression when the selected action name cannot derive a safe submit call.',
  ),
] as const;

const APP_SECTION_REQUEST_FIELDS = [
  ...FRAGMENT_COMPOSITION_DISPATCH_REQUEST_FIELDS,
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ChildContent,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'App sections may use ordered childContent when section children mix fragment compositions and direct target invocations.',
  ),
  requestFieldRequirement(
    AppBuilderSourceLoweringRequestFieldId.ChildCompositions,
    AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional,
    'App sections may use ordered childCompositions when every section child is a fragment composition.',
  ),
] as const;

/** Return per-call request fields that a selected target's source-lowering surfaces can consume. */
export function appBuilderSourceLoweringRequestFieldsForTarget(
  targetRef: AppBuilderOntologyRowRef,
): readonly AppBuilderSourceLoweringRequestFieldRequirement[] {
  const supportsSourcePlanPreview = appBuilderSourceLoweringSurfaceKindsForTarget(targetRef)
    .includes(AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview);
  if (targetRef.kind === AppBuilderOntologyRowKind.ControlPattern) {
    switch (targetRef.id) {
      case AppBuilderControlPatternId.NativeTextInput:
      case AppBuilderControlPatternId.NativeEmailInput:
      case AppBuilderControlPatternId.NativeUrlInput:
      case AppBuilderControlPatternId.NativeTelInput:
      case AppBuilderControlPatternId.NativePasswordInput:
      case AppBuilderControlPatternId.NativeSearchInput:
      case AppBuilderControlPatternId.NativeTimeInput:
      case AppBuilderControlPatternId.NativeDateTimeLocalInput:
      case AppBuilderControlPatternId.NativeMonthInput:
      case AppBuilderControlPatternId.NativeWeekInput:
      case AppBuilderControlPatternId.NativeNumberInput:
      case AppBuilderControlPatternId.NativeDateInput:
      case AppBuilderControlPatternId.NativeRangeInput:
      case AppBuilderControlPatternId.NativeTextarea:
      case AppBuilderControlPatternId.NativeBooleanCheckbox:
        return [
          ...TARGET_INVOCATION_FIELD_CONTROL_REQUEST_FIELDS,
          ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_INVOCATION_REQUEST_FIELDS : []),
        ];
      case AppBuilderControlPatternId.NativeCheckboxList:
      case AppBuilderControlPatternId.NativeRadioGroup:
      case AppBuilderControlPatternId.NativeSingleSelect:
      case AppBuilderControlPatternId.NativeMultiSelect:
        return [
          ...TARGET_INVOCATION_CHOICE_CONTROL_REQUEST_FIELDS,
          ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_INVOCATION_REQUEST_FIELDS : []),
        ];
      case AppBuilderControlPatternId.NativeButton:
        return [
          ...TARGET_INVOCATION_NATIVE_BUTTON_REQUEST_FIELDS,
          ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_INVOCATION_REQUEST_FIELDS : []),
        ];
      case AppBuilderControlPatternId.FieldGroup:
        return [
          ...TARGET_INVOCATION_FIELD_GROUP_REQUEST_FIELDS,
          ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_INVOCATION_REQUEST_FIELDS : []),
        ];
      case AppBuilderControlPatternId.FormMessage:
        return [
          ...TARGET_INVOCATION_FORM_MESSAGE_REQUEST_FIELDS,
          ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_INVOCATION_REQUEST_FIELDS : []),
        ];
      case AppBuilderControlPatternId.RichCombobox:
      case AppBuilderControlPatternId.RichDialog:
        return [];
    }
    return [];
  }
  if (targetRef.kind !== AppBuilderOntologyRowKind.ApplicationPattern) {
    return [];
  }
  switch (targetRef.id) {
    case AppBuilderApplicationPatternId.AppSection:
      return [
        ...APP_SECTION_REQUEST_FIELDS,
        ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_COMPOSITION_REQUEST_FIELDS : []),
      ];
    case AppBuilderApplicationPatternId.CollectionList:
    case AppBuilderApplicationPatternId.CollectionCard:
      return [
        ...COLLECTION_BINDING_CONTEXT_REQUEST_FIELDS,
        ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_COMPOSITION_REQUEST_FIELDS : []),
      ];
    case AppBuilderApplicationPatternId.CollectionTable:
      return [
        ...COLLECTION_TABLE_REQUEST_FIELDS,
        ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_COMPOSITION_REQUEST_FIELDS : []),
      ];
    case AppBuilderApplicationPatternId.LoadingEmptyErrorState:
      return [
        ...LOADING_EMPTY_ERROR_REQUEST_FIELDS,
        ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_COMPOSITION_REQUEST_FIELDS : []),
      ];
    case AppBuilderApplicationPatternId.NativeSubmitForm:
      return [
        ...NATIVE_SUBMIT_FORM_REQUEST_FIELDS,
        ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_COMPOSITION_REQUEST_FIELDS : []),
      ];
    case AppBuilderApplicationPatternId.DomainBackedSubmitForm:
      return [
        ...DOMAIN_BACKED_SUBMIT_FORM_REQUEST_FIELDS,
        ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_COMPOSITION_REQUEST_FIELDS : []),
      ];
    case AppBuilderApplicationPatternId.AppShell:
      return supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_APP_SHELL_REQUEST_FIELDS : [];
    case AppBuilderApplicationPatternId.ApplicationAssembly:
      return supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_APPLICATION_ASSEMBLY_REQUEST_FIELDS : [];
    case AppBuilderApplicationPatternId.DomainCommandAction:
      return TARGET_INVOCATION_DOMAIN_COMMAND_ACTION_REQUEST_FIELDS;
    case AppBuilderApplicationPatternId.RouteNavigationAction:
      return [
        ...TARGET_INVOCATION_ROUTE_NAVIGATION_ACTION_REQUEST_FIELDS,
        ...(supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_INVOCATION_REQUEST_FIELDS : []),
      ];
    case AppBuilderApplicationPatternId.AsyncDataSource:
      return TARGET_INVOCATION_ASYNC_DATA_SOURCE_REQUEST_FIELDS;
    case AppBuilderApplicationPatternId.RouterBackedListDetail:
      return supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_ROUTER_BACKED_LIST_DETAIL_REQUEST_FIELDS : [];
    case AppBuilderApplicationPatternId.ServiceBackedLoadSave:
      return supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_SERVICE_BACKED_LOAD_SAVE_REQUEST_FIELDS : [];
    case AppBuilderApplicationPatternId.DiStateClass:
      return supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_DI_STATE_CLASS_REQUEST_FIELDS : [];
    case AppBuilderApplicationPatternId.LocalViewModelState:
      return supportsSourcePlanPreview ? SOURCE_PLAN_PREVIEW_LOCAL_VIEW_MODEL_STATE_REQUEST_FIELDS : [];
    case AppBuilderApplicationPatternId.NativeControlBinding:
    case AppBuilderApplicationPatternId.EditBuffer:
    case AppBuilderApplicationPatternId.ValidationRules:
    case AppBuilderApplicationPatternId.Localization:
    case AppBuilderApplicationPatternId.StatePluginStore:
      return [];
  }
  return [];
}

/** Return request fields owned by the selected SourcePlan envelope rather than by a single target row. */
export function appBuilderSourceLoweringRequestFieldsForSourcePlanSelection(
  selection: AppBuilderSourceLoweringSourcePlanRequestFieldSelection,
): readonly AppBuilderSourceLoweringRequestFieldRequirement[] {
  if (selection.sourceLoweringAppShell === true) {
    return SOURCE_PLAN_PREVIEW_APP_SHELL_REQUEST_FIELDS;
  }
  if (selection.sourceLoweringApplicationAssembly === true) {
    return SOURCE_PLAN_PREVIEW_APPLICATION_ASSEMBLY_REQUEST_FIELDS;
  }
  if (selection.sourceLoweringRouterBackedListDetail === true) {
    return SOURCE_PLAN_PREVIEW_ROUTER_BACKED_LIST_DETAIL_REQUEST_FIELDS;
  }
  if (selection.sourceLoweringDiStateClass === true) {
    return SOURCE_PLAN_PREVIEW_DI_STATE_CLASS_REQUEST_FIELDS;
  }
  if (selection.sourceLoweringLocalViewModelState === true) {
    return SOURCE_PLAN_PREVIEW_LOCAL_VIEW_MODEL_STATE_REQUEST_FIELDS;
  }
  if (selection.sourceLoweringInvocation === true) {
    return SOURCE_PLAN_PREVIEW_INVOCATION_REQUEST_FIELDS;
  }
  if (selection.sourceLoweringComposition === true) {
    return SOURCE_PLAN_PREVIEW_COMPOSITION_REQUEST_FIELDS;
  }
  if (selection.sourceLoweringComponentPair === true) {
    return SOURCE_PLAN_PREVIEW_COMPONENT_PAIR_REQUEST_FIELDS;
  }
  return [];
}

/** Summarize request fields for compact public menus and preflight answers. */
export function appBuilderSourceLoweringRequestFieldSummary(
  requestFields: readonly AppBuilderSourceLoweringRequestFieldRequirement[],
  options: AppBuilderSourceLoweringRequestFieldSummaryOptions = {},
): AppBuilderSourceLoweringRequestFieldSummary {
  const includeRequestFieldNames = options.includeRequestFieldNames !== false;
  const surfaces = new Map<AppBuilderSourceLoweringSurfaceKind, {
    readonly surfaceKind: AppBuilderSourceLoweringSurfaceKind;
    readonly fields: AppBuilderSourceLoweringRequestFieldRequirement[];
  }>();
  for (const field of requestFields) {
    const entry = surfaces.get(field.surfaceKind) ?? {
      surfaceKind: field.surfaceKind,
      fields: [],
    };
    entry.fields.push(field);
    surfaces.set(field.surfaceKind, entry);
  }
  const surfaceSummaries = [...surfaces.values()]
    .map((entry): AppBuilderSourceLoweringRequestFieldSurfaceSummary => ({
      surfaceKind: entry.surfaceKind,
      requestFieldCount: entry.fields.length,
      requiredCount: requestFieldCount(entry.fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Required),
      conditionalCount: requestFieldCount(entry.fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional),
      optionalCount: requestFieldCount(entry.fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional),
      ...(includeRequestFieldNames ? {
        requiredRequestFieldNames: requestFieldNames(entry.fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Required),
        conditionalRequestFieldNames: requestFieldNames(entry.fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional),
        optionalRequestFieldNames: requestFieldNames(entry.fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional),
      } : {}),
    }));
  const requiredCount = requestFieldCount(requestFields, AppBuilderSourceLoweringRequestFieldRequirementKind.Required);
  return {
    requestFieldCount: requestFields.length,
    requiredCount,
    conditionalCount: requestFieldCount(requestFields, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional),
    optionalCount: requestFieldCount(requestFields, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional),
    hasRequiredRequestFields: requiredCount > 0,
    surfaces: surfaceSummaries,
  };
}


function requestFieldRequirement(
  fieldId: AppBuilderSourceLoweringRequestFieldId,
  requirementKind: AppBuilderSourceLoweringRequestFieldRequirementKind,
  summary: string,
  surfaceKind: AppBuilderSourceLoweringSurfaceKind = AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
): AppBuilderSourceLoweringRequestFieldRequirement {
  return {
    fieldId,
    requestFieldName: APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_NAMES[fieldId],
    surfaceKind,
    requirementKind,
    summary,
  };
}

function requestFieldCount(
  fields: readonly AppBuilderSourceLoweringRequestFieldRequirement[],
  requirementKind: AppBuilderSourceLoweringRequestFieldRequirementKind,
): number {
  return fields.filter((field) => field.requirementKind === requirementKind).length;
}

function requestFieldNames(
  fields: readonly AppBuilderSourceLoweringRequestFieldRequirement[],
  requirementKind: AppBuilderSourceLoweringRequestFieldRequirementKind,
): readonly string[] {
  return fields
    .filter((field) => field.requirementKind === requirementKind)
    .map((field) => field.requestFieldName);
}
