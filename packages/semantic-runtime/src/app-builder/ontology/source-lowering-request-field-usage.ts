import { APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_NAMES } from './source-lowering-request-field-requirements.js';
import {
  AppBuilderSourceLoweringRequestFieldId,
  AppBuilderSourceLoweringRequestFieldUsageOwnerKind,
  AppBuilderSourceLoweringRequestFieldValueShapeKind,
  type AppBuilderSourceLoweringRequestFieldUsageRow,
  type AppBuilderSourceLoweringRequestFieldValueShape,
} from './source-lowering-request-field-contracts.js';

const SOURCE_LOWERING_SOURCE_PLAN_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.RootDir,
  AppBuilderSourceLoweringRequestFieldId.TemplatePath,
  AppBuilderSourceLoweringRequestFieldId.SourceTargetPath,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringAppShell,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringApplicationAssembly,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringRouterBackedListDetail,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringDiStateClass,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringLocalViewModelState,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringInvocation,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringComposition,
  AppBuilderSourceLoweringRequestFieldId.SourceLoweringComponentPair,
]);

const SOURCE_LOWERING_INVOCATION_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
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
]);

const SOURCE_LOWERING_ROUTER_BACKED_LIST_DETAIL_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailPrimaryEntityName,
  AppBuilderSourceLoweringRequestFieldId.ActionName,
  AppBuilderSourceLoweringRequestFieldId.LinkText,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailCreateForm,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollection,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailDetailRelatedCollections,
]);

const SOURCE_LOWERING_APPLICATION_ASSEMBLY_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ApplicationAssemblyRouteAreas,
]);

const SOURCE_LOWERING_ROUTER_BACKED_LIST_DETAIL_CREATE_FORM_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ActionName,
  AppBuilderSourceLoweringRequestFieldId.FieldNames,
  AppBuilderSourceLoweringRequestFieldId.SubmitButtonText,
]);

const SOURCE_LOWERING_ROUTER_BACKED_LIST_DETAIL_SERVICE_COLLECTION_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionSourceTargetPath,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionClassName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionLoadMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFindMethodName,
  AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollectionCreateMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethods,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethods,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryControls,
]);

const SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionSourceTargetPath,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionClassName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionComponentMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionEntityName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionRecordTypeName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionLoadMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethods,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethods,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethods,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStates,
]);

const SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_FILTER_METHOD_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterFieldName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterParameterName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterPredicateKind,
]);

const SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_CREATE_METHOD_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateInputFieldNames,
]);

const SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_UPDATE_METHOD_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateInputFieldNames,
]);

const SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_QUERY_STATE_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateTypeText,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInitialValueExpression,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInactiveValueExpression,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryReloadMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryResultMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryFilterMethodName,
]);

const SOURCE_LOWERING_ROUTER_BACKED_LIST_DETAIL_SERVICE_QUERY_CONTROL_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateTypeText,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInitialValueExpression,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInactiveValueExpression,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryReloadMethodName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryResultMemberName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryFilterMethodName,
  AppBuilderSourceLoweringRequestFieldId.FieldControlId,
  AppBuilderSourceLoweringRequestFieldId.LabelText,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyActionName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyButtonText,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearActionName,
  AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearButtonText,
]);

const SOURCE_LOWERING_COMPOSITION_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.CompositionKind,
  AppBuilderSourceLoweringRequestFieldId.FieldNames,
  AppBuilderSourceLoweringRequestFieldId.BindingRootExpression,
  AppBuilderSourceLoweringRequestFieldId.FieldBindingExpressions,
  AppBuilderSourceLoweringRequestFieldId.FieldControlSelections,
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
  AppBuilderSourceLoweringRequestFieldId.HandlerExpression,
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
]);

const SOURCE_LOWERING_COMPOSITION_FIELD_CONTROL_SELECTION_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.FieldName,
  AppBuilderSourceLoweringRequestFieldId.InnerControlPatternId,
  AppBuilderSourceLoweringRequestFieldId.ValueDomainExpression,
  AppBuilderSourceLoweringRequestFieldId.ValueSetName,
  AppBuilderSourceLoweringRequestFieldId.OptionLocalName,
  AppBuilderSourceLoweringRequestFieldId.OptionValueExpression,
  AppBuilderSourceLoweringRequestFieldId.OptionBindingKind,
  AppBuilderSourceLoweringRequestFieldId.OptionLabelExpression,
  AppBuilderSourceLoweringRequestFieldId.MatcherExpression,
  AppBuilderSourceLoweringRequestFieldId.LabelText,
  AppBuilderSourceLoweringRequestFieldId.FieldControlId,
  AppBuilderSourceLoweringRequestFieldId.MessageKind,
  AppBuilderSourceLoweringRequestFieldId.MessageText,
  AppBuilderSourceLoweringRequestFieldId.MessageId,
]);

const SOURCE_LOWERING_COMPOSITION_RELATIONSHIP_CONTROL_SELECTION_REQUEST_FIELD_IDS = sourceLoweringRequestFieldIdsByName([
  AppBuilderSourceLoweringRequestFieldId.RelationshipName,
  AppBuilderSourceLoweringRequestFieldId.InnerControlPatternId,
  AppBuilderSourceLoweringRequestFieldId.BindingExpression,
  AppBuilderSourceLoweringRequestFieldId.ValueDomainExpression,
  AppBuilderSourceLoweringRequestFieldId.OptionLocalName,
  AppBuilderSourceLoweringRequestFieldId.OptionValueExpression,
  AppBuilderSourceLoweringRequestFieldId.OptionBindingKind,
  AppBuilderSourceLoweringRequestFieldId.OptionLabelExpression,
  AppBuilderSourceLoweringRequestFieldId.MatcherExpression,
  AppBuilderSourceLoweringRequestFieldId.LabelText,
  AppBuilderSourceLoweringRequestFieldId.FieldControlId,
]);


/** Return request-field usage rows from a public app-builder request envelope. */
export function appBuilderSourceLoweringRequestFieldUsageRowsFromAppBuilderRequest(
  request: unknown,
): readonly AppBuilderSourceLoweringRequestFieldUsageRow[] {
  return appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest(
    recordValue(request)?.sourceLoweringSourcePlan ?? null,
    'sourceLoweringSourcePlan',
  );
}

/** Return request-field usage rows from a SourcePlan preview request envelope. */
export function appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest(
  sourcePlanRequest: unknown,
  requestPath = 'sourceLoweringSourcePlan',
): readonly AppBuilderSourceLoweringRequestFieldUsageRow[] {
  const rows: AppBuilderSourceLoweringRequestFieldUsageRow[] = [];
  collectSourcePlanRequestFieldUsageRows(
    sourcePlanRequest,
    requestPath,
    rows,
  );
  return rows;
}

/** Return request-field usage rows from a one-target invocation request envelope. */
export function appBuilderSourceLoweringRequestFieldUsageRowsFromInvocationRequest(
  invocationRequest: unknown,
  requestPath = 'sourceLoweringInvocation',
): readonly AppBuilderSourceLoweringRequestFieldUsageRow[] {
  const rows: AppBuilderSourceLoweringRequestFieldUsageRow[] = [];
  collectInvocationRequestFieldUsageRows(
    invocationRequest,
    requestPath,
    rows,
  );
  return rows;
}

/** Return request-field usage rows from a fragment-composition request envelope. */
export function appBuilderSourceLoweringRequestFieldUsageRowsFromCompositionRequest(
  compositionRequest: unknown,
  requestPath = 'sourceLoweringComposition',
): readonly AppBuilderSourceLoweringRequestFieldUsageRow[] {
  const rows: AppBuilderSourceLoweringRequestFieldUsageRow[] = [];
  collectCompositionRequestFieldUsageRows(
    compositionRequest,
    requestPath,
    rows,
  );
  return rows;
}


function collectSourcePlanRequestFieldUsageRows(
  sourcePlanRequest: unknown,
  requestPath: string,
  rows: AppBuilderSourceLoweringRequestFieldUsageRow[],
): void {
  const requestObject = recordValue(sourcePlanRequest);
  if (requestObject == null) {
    return;
  }
  collectRequestObjectFieldUsageRows(
    requestObject,
    requestPath,
    SOURCE_LOWERING_SOURCE_PLAN_REQUEST_FIELD_IDS,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.SourcePlan,
    rows,
  );
  collectInvocationRequestFieldUsageRows(
    requestObject.sourceLoweringInvocation ?? null,
    `${requestPath}.sourceLoweringInvocation`,
    rows,
  );
  collectApplicationAssemblyRequestFieldUsageRows(
    requestObject.sourceLoweringApplicationAssembly ?? null,
    `${requestPath}.sourceLoweringApplicationAssembly`,
    rows,
  );
  collectRouterBackedListDetailRequestFieldUsageRows(
    requestObject.sourceLoweringRouterBackedListDetail ?? null,
    `${requestPath}.sourceLoweringRouterBackedListDetail`,
    rows,
  );
  collectCompositionRequestFieldUsageRows(
    requestObject.sourceLoweringComposition ?? null,
    `${requestPath}.sourceLoweringComposition`,
    rows,
  );
  collectComponentPairRequestFieldUsageRows(
    requestObject.sourceLoweringComponentPair ?? null,
    `${requestPath}.sourceLoweringComponentPair`,
    rows,
  );
}

function collectApplicationAssemblyRequestFieldUsageRows(
  applicationAssemblyRequest: unknown,
  requestPath: string,
  rows: AppBuilderSourceLoweringRequestFieldUsageRow[],
): void {
  const requestObject = recordValue(applicationAssemblyRequest);
  if (requestObject == null) {
    return;
  }
  collectRequestObjectFieldUsageRows(
    requestObject,
    requestPath,
    SOURCE_LOWERING_APPLICATION_ASSEMBLY_REQUEST_FIELD_IDS,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.SourcePlan,
    rows,
  );
  const routeAreas = Array.isArray(requestObject.routeAreas) ? requestObject.routeAreas : [];
  routeAreas.forEach((routeAreaRequest, index) => {
    collectRouterBackedListDetailRequestFieldUsageRows(
      routeAreaRequest,
      `${requestPath}.routeAreas[${index}]`,
      rows,
    );
  });
}

function collectRouterBackedListDetailRequestFieldUsageRows(
  routerBackedListDetailRequest: unknown,
  requestPath: string,
  rows: AppBuilderSourceLoweringRequestFieldUsageRow[],
): void {
  const requestObject = recordValue(routerBackedListDetailRequest);
  if (requestObject == null) {
    return;
  }
  collectRequestObjectFieldUsageRows(
    requestObject,
    requestPath,
    SOURCE_LOWERING_ROUTER_BACKED_LIST_DETAIL_REQUEST_FIELD_IDS,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.SourcePlan,
    rows,
  );
  collectRequestObjectFieldUsageRows(
    recordValue(requestObject.createForm) ?? {},
    `${requestPath}.createForm`,
    SOURCE_LOWERING_ROUTER_BACKED_LIST_DETAIL_CREATE_FORM_REQUEST_FIELD_IDS,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.SourcePlan,
    rows,
  );
  collectRequestObjectFieldUsageRows(
    recordValue(requestObject.serviceCollection) ?? {},
    `${requestPath}.serviceCollection`,
    SOURCE_LOWERING_ROUTER_BACKED_LIST_DETAIL_SERVICE_COLLECTION_REQUEST_FIELD_IDS,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.SourcePlan,
    rows,
  );
  const serviceCollectionObject = recordValue(requestObject.serviceCollection);
  if (serviceCollectionObject == null) {
    return;
  }
  const filterMethodValue = serviceCollectionObject.filterMethods ?? null;
  const filterMethods = Array.isArray(filterMethodValue)
    ? filterMethodValue
    : [];
  filterMethods.forEach((filterMethod, filterMethodIndex) => {
    const filterMethodObject = recordValue(filterMethod);
    if (filterMethodObject == null) {
      return;
    }
    collectRequestObjectFieldUsageRows(
      filterMethodObject,
      `${requestPath}.serviceCollection.filterMethods[${filterMethodIndex}]`,
      SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_FILTER_METHOD_REQUEST_FIELD_IDS,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.SourcePlan,
      rows,
    );
  });
  const updateMethodValue = serviceCollectionObject.updateMethods ?? null;
  const updateMethods = Array.isArray(updateMethodValue)
    ? updateMethodValue
    : [];
  updateMethods.forEach((updateMethod, updateMethodIndex) => {
    const updateMethodObject = recordValue(updateMethod);
    if (updateMethodObject == null) {
      return;
    }
    collectRequestObjectFieldUsageRows(
      updateMethodObject,
      `${requestPath}.serviceCollection.updateMethods[${updateMethodIndex}]`,
      SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_UPDATE_METHOD_REQUEST_FIELD_IDS,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.SourcePlan,
      rows,
    );
  });
  const queryControlValue = serviceCollectionObject.queryControls ?? null;
  const queryControls = Array.isArray(queryControlValue)
    ? queryControlValue
    : [];
  queryControls.forEach((queryControl, queryControlIndex) => {
    const queryControlObject = recordValue(queryControl);
    if (queryControlObject == null) {
      return;
    }
    collectRequestObjectFieldUsageRows(
      queryControlObject,
      `${requestPath}.serviceCollection.queryControls[${queryControlIndex}]`,
      SOURCE_LOWERING_ROUTER_BACKED_LIST_DETAIL_SERVICE_QUERY_CONTROL_REQUEST_FIELD_IDS,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.SourcePlan,
      rows,
    );
  });
}

function collectComponentPairRequestFieldUsageRows(
  componentPairRequest: unknown,
  requestPath: string,
  rows: AppBuilderSourceLoweringRequestFieldUsageRow[],
): void {
  const requestObject = recordValue(componentPairRequest);
  if (requestObject == null) {
    return;
  }
  addRequestFieldUsageRow(
    rows,
    requestPath,
    'sourceLoweringComposition',
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringComposition,
    requestObject.sourceLoweringComposition ?? null,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairTemplate,
  );
  collectCompositionRequestFieldUsageRows(
    requestObject.sourceLoweringComposition ?? null,
    `${requestPath}.sourceLoweringComposition`,
    rows,
  );
  addRequestFieldUsageRow(
    rows,
    requestPath,
    'sourceLoweringLocalViewModelState',
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringLocalViewModelState,
    requestObject.sourceLoweringLocalViewModelState ?? null,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairClass,
  );
  const templateInvocationValue = requestObject.sourceLoweringTemplateInvocations ?? null;
  const templateInvocations = Array.isArray(templateInvocationValue)
    ? templateInvocationValue
    : [];
  addRequestFieldUsageRow(
    rows,
    requestPath,
    'sourceLoweringTemplateInvocations',
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringTemplateInvocations,
    templateInvocationValue,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairTemplate,
  );
  templateInvocations.forEach((invocation, index) => {
    collectInvocationRequestFieldUsageRows(
      invocation,
      `${requestPath}.sourceLoweringTemplateInvocations[${index}]`,
      rows,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairTemplateInvocation,
    );
  });
  const serviceCollectionValue = requestObject.serviceCollections ?? null;
  const serviceCollections = Array.isArray(serviceCollectionValue)
    ? serviceCollectionValue
    : [];
  addRequestFieldUsageRow(
    rows,
    requestPath,
    'serviceCollections',
    AppBuilderSourceLoweringRequestFieldId.ComponentPairServiceCollections,
    serviceCollectionValue,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairServiceCollection,
  );
  serviceCollections.forEach((serviceCollection, index) => {
    const serviceCollectionObject = recordValue(serviceCollection);
    if (serviceCollectionObject == null) {
      return;
    }
    collectRequestObjectFieldUsageRows(
      serviceCollectionObject,
      `${requestPath}.serviceCollections[${index}]`,
      SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_REQUEST_FIELD_IDS,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairServiceCollection,
      rows,
    );
    const filterMethodValue = serviceCollectionObject.filterMethods ?? null;
    const filterMethods = Array.isArray(filterMethodValue)
      ? filterMethodValue
      : [];
    filterMethods.forEach((filterMethod, filterMethodIndex) => {
      const filterMethodObject = recordValue(filterMethod);
      if (filterMethodObject == null) {
        return;
      }
      collectRequestObjectFieldUsageRows(
        filterMethodObject,
        `${requestPath}.serviceCollections[${index}].filterMethods[${filterMethodIndex}]`,
        SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_FILTER_METHOD_REQUEST_FIELD_IDS,
        AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairServiceCollection,
        rows,
      );
    });
    const createMethodValue = serviceCollectionObject.createMethods ?? null;
    const createMethods = Array.isArray(createMethodValue)
      ? createMethodValue
      : [];
    createMethods.forEach((createMethod, createMethodIndex) => {
      const createMethodObject = recordValue(createMethod);
      if (createMethodObject == null) {
        return;
      }
      collectRequestObjectFieldUsageRows(
        createMethodObject,
        `${requestPath}.serviceCollections[${index}].createMethods[${createMethodIndex}]`,
        SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_CREATE_METHOD_REQUEST_FIELD_IDS,
        AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairServiceCollection,
        rows,
      );
    });
    const updateMethodValue = serviceCollectionObject.updateMethods ?? null;
    const updateMethods = Array.isArray(updateMethodValue)
      ? updateMethodValue
      : [];
    updateMethods.forEach((updateMethod, updateMethodIndex) => {
      const updateMethodObject = recordValue(updateMethod);
      if (updateMethodObject == null) {
        return;
      }
      collectRequestObjectFieldUsageRows(
        updateMethodObject,
        `${requestPath}.serviceCollections[${index}].updateMethods[${updateMethodIndex}]`,
        SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_UPDATE_METHOD_REQUEST_FIELD_IDS,
        AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairServiceCollection,
        rows,
      );
    });
    const queryStateValue = serviceCollectionObject.queryStates ?? null;
    const queryStates = Array.isArray(queryStateValue)
      ? queryStateValue
      : [];
    queryStates.forEach((queryState, queryStateIndex) => {
      const queryStateObject = recordValue(queryState);
      if (queryStateObject == null) {
        return;
      }
      collectRequestObjectFieldUsageRows(
        queryStateObject,
        `${requestPath}.serviceCollections[${index}].queryStates[${queryStateIndex}]`,
        SOURCE_LOWERING_COMPONENT_PAIR_SERVICE_COLLECTION_QUERY_STATE_REQUEST_FIELD_IDS,
        AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairServiceCollection,
        rows,
      );
    });
  });
  const classMemberInvocations = Array.isArray(requestObject.sourceLoweringClassMemberInvocations)
    ? requestObject.sourceLoweringClassMemberInvocations
    : [];
  classMemberInvocations.forEach((invocation, index) => {
    addRequestFieldUsageRow(
      rows,
      `${requestPath}.sourceLoweringClassMemberInvocations[${index}]`,
      'sourceLoweringInvocation',
      AppBuilderSourceLoweringRequestFieldId.SourceLoweringInvocation,
      invocation,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairClassMember,
    );
    collectInvocationRequestFieldUsageRows(
      invocation,
      `${requestPath}.sourceLoweringClassMemberInvocations[${index}]`,
      rows,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.ComponentPairClassMember,
    );
  });
}

function collectInvocationRequestFieldUsageRows(
  invocationRequest: unknown,
  requestPath: string,
  rows: AppBuilderSourceLoweringRequestFieldUsageRow[],
  ownerKind = AppBuilderSourceLoweringRequestFieldUsageOwnerKind.Invocation,
): void {
  const requestObject = recordValue(invocationRequest);
  if (requestObject == null) {
    return;
  }
  collectRequestObjectFieldUsageRows(
    requestObject,
    requestPath,
    SOURCE_LOWERING_INVOCATION_REQUEST_FIELD_IDS,
    ownerKind,
    rows,
  );
}

function collectCompositionRequestFieldUsageRows(
  compositionRequest: unknown,
  requestPath: string,
  rows: AppBuilderSourceLoweringRequestFieldUsageRow[],
): void {
  const requestObject = recordValue(compositionRequest);
  if (requestObject == null) {
    return;
  }
  collectRequestObjectFieldUsageRows(
    requestObject,
    requestPath,
    SOURCE_LOWERING_COMPOSITION_REQUEST_FIELD_IDS,
    AppBuilderSourceLoweringRequestFieldUsageOwnerKind.Composition,
    rows,
  );
  const fieldControlSelections = Array.isArray(requestObject.fieldControlSelections)
    ? requestObject.fieldControlSelections
    : [];
  fieldControlSelections.forEach((fieldControlSelection, index) => {
    const selectionObject = recordValue(fieldControlSelection);
    if (selectionObject == null) {
      return;
    }
    collectRequestObjectFieldUsageRows(
      selectionObject,
      `${requestPath}.fieldControlSelections[${index}]`,
      SOURCE_LOWERING_COMPOSITION_FIELD_CONTROL_SELECTION_REQUEST_FIELD_IDS,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.CompositionFieldControlSelection,
      rows,
    );
  });
  const relationshipControlSelections = Array.isArray(requestObject.relationshipControlSelections)
    ? requestObject.relationshipControlSelections
    : [];
  relationshipControlSelections.forEach((relationshipControlSelection, index) => {
    const selectionObject = recordValue(relationshipControlSelection);
    if (selectionObject == null) {
      return;
    }
    collectRequestObjectFieldUsageRows(
      selectionObject,
      `${requestPath}.relationshipControlSelections[${index}]`,
      SOURCE_LOWERING_COMPOSITION_RELATIONSHIP_CONTROL_SELECTION_REQUEST_FIELD_IDS,
      AppBuilderSourceLoweringRequestFieldUsageOwnerKind.CompositionRelationshipControlSelection,
      rows,
    );
  });
  const childCompositions = Array.isArray(requestObject.childCompositions)
    ? requestObject.childCompositions
    : [];
  childCompositions.forEach((childComposition, index) => {
    collectCompositionRequestFieldUsageRows(
      childComposition,
      `${requestPath}.childCompositions[${index}]`,
      rows,
    );
  });
  const childContent = Array.isArray(requestObject.childContent)
    ? requestObject.childContent
    : [];
  childContent.forEach((childContentRow, index) => {
    const childContentObject = recordValue(childContentRow);
    if (childContentObject == null) {
      return;
    }
    collectCompositionRequestFieldUsageRows(
      childContentObject.composition ?? null,
      `${requestPath}.childContent[${index}].composition`,
      rows,
    );
    collectInvocationRequestFieldUsageRows(
      childContentObject.invocation ?? null,
      `${requestPath}.childContent[${index}].invocation`,
      rows,
    );
  });
  collectCompositionRequestFieldUsageRows(
    requestObject.fulfilledContentComposition ?? null,
    `${requestPath}.fulfilledContentComposition`,
    rows,
  );
}

function collectRequestObjectFieldUsageRows(
  requestObject: Record<string, unknown>,
  requestPath: string,
  fieldIdsByName: Readonly<Record<string, AppBuilderSourceLoweringRequestFieldId>>,
  ownerKind: AppBuilderSourceLoweringRequestFieldUsageOwnerKind,
  rows: AppBuilderSourceLoweringRequestFieldUsageRow[],
): void {
  for (const [requestFieldName, fieldId] of Object.entries(fieldIdsByName)) {
    if (!Object.prototype.hasOwnProperty.call(requestObject, requestFieldName)) {
      continue;
    }
    addRequestFieldUsageRow(
      rows,
      requestPath,
      requestFieldName,
      fieldId,
      requestObject[requestFieldName],
      ownerKind,
    );
  }
}

function addRequestFieldUsageRow(
  rows: AppBuilderSourceLoweringRequestFieldUsageRow[],
  requestPath: string,
  requestFieldName: string,
  fieldId: AppBuilderSourceLoweringRequestFieldId,
  value: unknown,
  ownerKind: AppBuilderSourceLoweringRequestFieldUsageOwnerKind,
): void {
  if (value == null) {
    return;
  }
  rows.push({
    requestPath: `${requestPath}.${requestFieldName}`,
    ownerKind,
    fieldId,
    requestFieldName,
    valueShape: requestFieldValueShape(value),
  });
}

function requestFieldValueShape(
  value: unknown,
): AppBuilderSourceLoweringRequestFieldValueShape {
  if (Array.isArray(value)) {
    return {
      kind: AppBuilderSourceLoweringRequestFieldValueShapeKind.Array,
      itemCount: value.length,
    };
  }
  const objectValue = recordValue(value);
  if (objectValue != null) {
    return {
      kind: AppBuilderSourceLoweringRequestFieldValueShapeKind.Object,
      keyCount: Object.keys(objectValue).length,
    };
  }
  return {
    kind: primitiveRequestFieldValueShapeKind(value),
  };
}

function primitiveRequestFieldValueShapeKind(
  value: unknown,
): AppBuilderSourceLoweringRequestFieldValueShapeKind {
  switch (typeof value) {
    case 'string':
      return AppBuilderSourceLoweringRequestFieldValueShapeKind.String;
    case 'number':
      return AppBuilderSourceLoweringRequestFieldValueShapeKind.Number;
    case 'boolean':
      return AppBuilderSourceLoweringRequestFieldValueShapeKind.Boolean;
    case 'bigint':
      return AppBuilderSourceLoweringRequestFieldValueShapeKind.BigInt;
    case 'symbol':
      return AppBuilderSourceLoweringRequestFieldValueShapeKind.Symbol;
    case 'function':
      return AppBuilderSourceLoweringRequestFieldValueShapeKind.Function;
    case 'undefined':
      return AppBuilderSourceLoweringRequestFieldValueShapeKind.Undefined;
    case 'object':
      return AppBuilderSourceLoweringRequestFieldValueShapeKind.Object;
  }
}


function sourceLoweringRequestFieldIdsByName(
  fieldIds: readonly AppBuilderSourceLoweringRequestFieldId[],
): Readonly<Record<string, AppBuilderSourceLoweringRequestFieldId>> {
  return Object.fromEntries(fieldIds.map((fieldId) => [
    APP_BUILDER_SOURCE_LOWERING_REQUEST_FIELD_NAMES[fieldId],
    fieldId,
  ]));
}


function recordValue(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
