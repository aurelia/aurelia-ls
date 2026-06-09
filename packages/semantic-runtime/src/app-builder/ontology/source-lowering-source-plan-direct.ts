import {
  appBuilderApplicationAssemblySourcePlan,
  type AppBuilderApplicationAssemblySourceRequest,
} from '../application-assembly-source.js';
import {
  appBuilderMinimalAppSourcePlan,
} from '../minimal-app-source.js';
import {
  appBuilderDiStateClassSourcePlan,
} from '../di-state-class-source.js';
import {
  appBuilderLocalViewModelStateSourceFragments,
  appBuilderLocalViewModelStateSourcePlan,
  type AppBuilderLocalViewModelActionFeedbackStateSourceModel,
  type AppBuilderLocalViewModelCollectionFilterQueryStateSourceModel,
  type AppBuilderLocalViewModelCollectionPaginationQueryStateSourceModel,
  type AppBuilderLocalViewModelCollectionQueryStateSourceModel,
  type AppBuilderLocalViewModelCollectionSelectionStateSourceModel,
  type AppBuilderLocalViewModelFieldObjectStateSourceModel,
  type AppBuilderLocalViewModelNestedValueObjectRelationshipSourceModel,
  type AppBuilderLocalViewModelOwnedRelationshipSourceModel,
  type AppBuilderLocalViewModelReferenceRelationshipSourceModel,
} from '../local-view-model-state-source.js';
import {
  appBuilderRoutedCollectionDetailSourcePlan,
  AppBuilderRoutedCollectionDetailTableColumnKind,
  type AppBuilderRoutedCollectionDetailCreateFormSource,
  type AppBuilderRoutedCollectionDetailNavigationActionSource,
  type AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipSource,
  type AppBuilderRoutedCollectionDetailOwnedRelationshipSource,
  type AppBuilderRoutedCollectionDetailReferenceRelationshipSource,
  type AppBuilderRoutedCollectionDetailRelatedCollectionSource,
  type AppBuilderRoutedCollectionDetailServiceCollectionSource,
  type AppBuilderRoutedCollectionDetailSourceRequest,
  type AppBuilderRoutedCollectionDetailTableColumnSource,
} from '../routed-collection-detail-source.js';
import {
  APP_BUILDER_SERVICE_COLLECTION_FILTER_PREDICATE_KINDS,
  AppBuilderServiceCollectionFilterPredicateKind,
  type AppBuilderServiceCollectionFilterMethodSourceModel,
  type AppBuilderServiceCollectionUpdateMethodSourceModel,
} from '../service-boundary-source.js';
import {
  AppBuilderAppStateOwnershipMode,
  AppBuilderAreaNavigationPolicy,
  AppBuilderConventionPolicy,
  AppBuilderCustomElementViewForm,
  AppBuilderDomainModelingMode,
  AppBuilderLocalStatePolicy,
  AppBuilderResourceCarrier,
  AppBuilderRouterAdmissionPolicy,
} from '../aurelia-lowering-option.js';
import {
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlId,
} from '../control-catalog.js';
import {
  AppBuilderDomainActionScope,
  AppBuilderDomainActionKind,
  AppBuilderDomainSlotKey,
  AppBuilderDomainSlotKind,
  AppBuilderDomainIdentityValueKind,
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainRelationshipKind,
  AppBuilderDomainRelationshipLocalValueKind,
  APP_BUILDER_ANY_FIELD_SCHEMA_EXPECTATION,
  APP_BUILDER_TEXT_FIELD_SCHEMA_EXPECTATION,
  type AppBuilderDomainActionDescriptor,
  type AppBuilderDomainFieldDescriptor,
  type AppBuilderDomainRelationshipDescriptor,
  type AppBuilderDomainSlot,
  type AppBuilderDomainSlotAssignment,
  type AppBuilderDomainValueSetDescriptor,
} from '../domain-model.js';
import {
  appBuilderDomainFieldDisplayExpression,
  appBuilderDomainFieldResolvedOptions,
  appBuilderDomainFieldSourceModels,
  type AppBuilderDomainFieldSourceModel,
  type AppBuilderDomainFieldValueSetSelection,
} from '../domain-field-source.js';
import type {
  AppBuilderDomainDescriptor,
} from '../domain-descriptor.js';
import {
  materializeAppBuilderCallerDomainForTarget,
  type AppBuilderDomainMaterializationIssue,
  type AppBuilderDomainMaterializationTarget,
} from '../domain-materialization.js';
import {
  AppBuilderSeedDataAudience,
  AppBuilderSeedDataDensity,
  AppBuilderSeedDataPurpose,
  AppBuilderSeedDataSetId,
  type AppBuilderSeedDataSetDescriptor,
  type AppBuilderSeedRecord,
  type AppBuilderSeedRecordObject,
} from '../seed-data.js';
import type {
  SourcePlan,
  SourcePatternParameterValue,
} from '../../source-plan/source-plan.js';
import {
  SourcePatternParameterKey,
  sourcePatternParameterValue,
} from '../../source-plan/source-plan.js';
import { uniqueValues } from '../../collections.js';
import { normalizedSourceInputText } from '../../source-plan/source-template.js';
import {
  appBuilderKebabCase,
  appBuilderIsTypeScriptIdentifier,
  appBuilderLowerCamelCase,
  appBuilderPascalCase,
  appBuilderRouterLoadAttributeFragment,
  appBuilderChoiceControlElementFragment,
  appBuilderControlElementFragment,
  appBuilderTemplateElementFragment,
  appBuilderTemplateControllerAttributeFragment,
  appBuilderTextInterpolationFragment,
} from '../source-lowering-helpers.js';
import { appendAppBuilderTemplateElementAttributes } from '../part-source-lowering.js';
import {
  authoredTemplateTextContentText,
} from '../../template/authored-template-source.js';
import { AppBuilderPartSlotKind } from '../part-application.js';
import { AppBuilderStructuralPartId } from '../structural-part-catalog.js';
import type { AppBuilderPartSlotAssignment, AppBuilderPartSourceFragment, AppBuilderSourceFragmentOrigin } from '../part-source-invocation.js';
import {
  AppBuilderSourceFragmentOriginKind,
} from '../part-source-invocation.js';
import {
  appBuilderSelectNativeFieldConstraints,
} from './source-lowering-native-field-constraints.js';
import {
  appBuilderSelectNumericControlConstraints,
} from './source-lowering-numeric-constraints.js';
import type {
  AppBuilderEffectContractId as AppBuilderEffectContractIdValue,
} from './effect.js';
import {
  appBuilderUniqueEffectContractIds,
} from './effect.js';
import {
  appBuilderEffectContractIdsForTargetRef,
} from './effect-target.js';
import {
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
  AppBuilderSuppliedInputSource,
} from './input.js';
import type {
  AppBuilderSuppliedInput,
} from './input-readiness.js';
import {
  appBuilderSuppliedInputsWithDecisionBundles,
  appBuilderSuppliedInputsWithDecisionBundlesForTarget,
} from '../policy/decision-bundle.js';
import type {
  AppBuilderOntologyRowRef,
} from './relation.js';
import {
  appBuilderOntologyRowRef,
  AppBuilderOntologyRowKind,
} from './relation.js';
import {
  appBuilderUniqueOntologyRowRefs,
} from './row-descriptor.js';
import {
  AppBuilderApplicationPatternId,
} from './application-pattern.js';
import {
  appBuilderControlPatternIdForLeafControlId,
  AppBuilderControlPatternId,
} from './control.js';
import {
  AppBuilderControlUseActionChannelKind,
  AppBuilderControlUseInventorySourceKind,
  appBuilderControlUseInventoryRow,
  appBuilderControlUseInventoryRowsForInvocation,
  type AppBuilderControlUseInventoryRow,
} from './control-use-inventory.js';
import {
  AppBuilderCollectionFeatureId,
  AppBuilderCollectionIdentityMode,
  AppBuilderCollectionIdentityUse,
  type AppBuilderCollectionQueryFeatureSelectionPayload,
} from './collection.js';
import {
  appBuilderSourceLoweringConventionPolicyPayloads,
  appBuilderSourceLoweringDomainActionPayloads,
  appBuilderSourceLoweringDomainEntityPayloads,
  appBuilderSourceLoweringDomainFieldPayloads,
  appBuilderSourceLoweringDomainRelationshipPayloads,
  appBuilderSourceLoweringDomainValueSetPayloads,
  appBuilderSourceLoweringCollectionQueryFeaturePayloads,
  appBuilderSourceLoweringCollectionIdentityPolicyPayloads,
  appBuilderSourceLoweringCollectionDisplayFieldPayloads,
  appBuilderSourceLoweringCollectionTableColumnPayloads,
  appBuilderSourceLoweringActionFeedbackPayloads,
  appBuilderSourceLoweringSeedRecordsForEntity,
  appBuilderSourceLoweringRoutingPolicyPayloads,
  appBuilderSourceLoweringSourceFileLayoutPayloads,
  appBuilderSourceLoweringSourceNamingPayloads,
  appBuilderSourceLoweringSourcePatternParameterValues,
  appBuilderSourceLoweringSourceRootPayloads,
  appBuilderSourceLoweringStatePolicyPayloads,
  appBuilderEntityMutationFieldNamesForDomainActions,
  type AppBuilderSourceLoweringDomainEntityPayload,
  type AppBuilderSourceLoweringCollectionIdentityPolicyPayload,
  type AppBuilderSourceLoweringActionFeedbackPayload,
  type AppBuilderSourceLoweringRoutingPolicyPayload,
  type AppBuilderSourceLoweringStatePolicyPayload,
} from './source-lowering-inputs.js';
import {
  AppBuilderCollectionDisplayRole,
  type AppBuilderCollectionDisplayFieldPayload,
  AppBuilderCollectionTableColumnDisplayKind,
  type AppBuilderCollectionTableColumnPayload,
} from './collection-projection.js';
import {
  AppBuilderSourceLoweringAvailability,
  AppBuilderSourceLoweringInputGateState,
  appBuilderSourceLoweringPreflight,
  type AppBuilderSourceLoweringPreflight,
  type AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import {
  AppBuilderSourceLoweringSurfaceKind,
  appBuilderTargetSupportsSourceLoweringSurface,
} from './source-lowering-surface.js';
import type {
  AppBuilderSourceLoweringComposition,
} from './source-lowering-composition-contracts.js';
import {
  AppBuilderSourceLoweringBindingExpressionSource,
  AppBuilderSourceLoweringButtonType,
  AppBuilderSourceLoweringFieldControlIdSource,
  AppBuilderSourceLoweringHandlerExpressionSource,
  AppBuilderSourceLoweringLabelTextSource,
  AppBuilderSourceLoweringMessageKind,
  AppBuilderSourceLoweringMessageTextSource,
  AppBuilderSourceLoweringValueDomainExpressionSource,
} from './source-lowering-invocation.js';
import {
  appBuilderExpectedSemanticEffectKinds,
  appBuilderExpectedSemanticEffectPreviews,
} from './semantic-effect-witness.js';
import type {
  ExpectedSemanticEffect,
} from '../../fixture-verification/expected-effect.js';
import {
  appBuilderMinimalAppShellExpectedEffects,
  appBuilderApplicationAssemblyExpectedEffects,
  appBuilderRoutedCollectionDetailSourcePlanExpectedEffects,
} from '../source-plan-expected-effects.js';
import {
  AppBuilderSourceLoweringSourcePlanIssueKind,
  type AppBuilderSourceLoweringApplicationAssembly,
  type AppBuilderSourceLoweringApplicationAssemblyRequest,
  type AppBuilderSourceLoweringAppShell,
  type AppBuilderSourceLoweringAppShellRequest,
  type AppBuilderSourceLoweringDiStateClass,
  type AppBuilderSourceLoweringDiStateClassRequest,
  type AppBuilderSourceLoweringLocalViewModelState,
  type AppBuilderSourceLoweringLocalViewModelStateRequest,
  type AppBuilderSourceLoweringRouterBackedListDetail,
  type AppBuilderSourceLoweringRouterBackedListDetailRelatedCollection,
  type AppBuilderSourceLoweringRouterBackedListDetailRelatedCollectionRequest,
  type AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionFilterMethodRequest,
  type AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionUpdateMethodRequest,
  type AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControl,
  type AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControlRequest,
  type AppBuilderSourceLoweringRouterBackedListDetailRequest,
  type AppBuilderSourceLoweringRouterBackedListDetailServiceCollection,
  type AppBuilderSourceLoweringSourcePlanIssue,
} from './source-lowering-source-plan-contracts.js';

export function lowerAppShellSourcePlan(
  request: AppBuilderSourceLoweringAppShellRequest,
  rootDir: string | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AppBuilderSourceLoweringAppShell {
  const frame = directSourcePlanTargetFrame(
    request.targetRef ?? null,
    suppliedInputs,
    request.includePreflight === true,
    APP_SHELL_SOURCE_PLAN_TARGET_ISSUES,
  );
  const targetRef = frame.targetRef;
  const appName = selectDirectSourcePlanAppName(targetRef, suppliedInputs);
  const resourceCarrier = selectDirectSourcePlanResourceCarrier(targetRef, suppliedInputs);
  const conventionPolicy = selectDirectSourcePlanConventionPolicy(targetRef, suppliedInputs);
  const issues = [
    ...frame.issues,
    ...appName.issues,
    ...resourceCarrier.issues,
    ...conventionPolicy.issues,
    ...directCustomElementSourceLayoutIssues(targetRef, suppliedInputs),
    ...directConventionCarrierIssues(targetRef, conventionPolicy.value, resourceCarrier.value),
  ];
  const sourcePlan = issues.length > 0
    || rootDir == null
    || appName.value == null
    || resourceCarrier.value == null
    ? null
    : appBuilderMinimalAppSourcePlan({
        rootDir,
        appName: appName.value,
        carrier: resourceCarrier.value,
      });
  const expectedEffects = appBuilderExpectedEffectsForSourcePlan(
    sourcePlan,
    appBuilderMinimalAppShellExpectedEffects,
  );
  return {
    targetRef,
    appName: appName.value,
    resourceCarrier: resourceCarrier.value,
    conventionPolicy: conventionPolicy.value,
    preflightRow: frame.preflightRow,
    ...(request.includePreflight === true && frame.preflight != null ? { preflight: frame.preflight } : {}),
    sourceLoweringTargetRefs: frame.sourceLoweringTargetRefs,
    effectContractIds: frame.effectContractIds,
    expectedEffectKinds: appBuilderExpectedSemanticEffectKinds(expectedEffects),
    expectedEffects: appBuilderExpectedSemanticEffectPreviews(expectedEffects),
    sourcePlan,
    issues,
  };
}

export function lowerApplicationAssemblySourcePlan(
  request: AppBuilderSourceLoweringApplicationAssemblyRequest,
  rootDir: string | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AppBuilderSourceLoweringApplicationAssembly {
  const frame = directSourcePlanTargetFrame(
    request.targetRef ?? null,
    suppliedInputs,
    request.includePreflight === true,
    APPLICATION_ASSEMBLY_SOURCE_PLAN_TARGET_ISSUES,
  );
  const targetRef = frame.targetRef;
  const appName = selectDirectSourcePlanAppName(targetRef, suppliedInputs);
  const resourceCarrier = selectDirectSourcePlanResourceCarrier(targetRef, suppliedInputs);
  const conventionPolicy = selectDirectSourcePlanConventionPolicy(targetRef, suppliedInputs);
  const routeAreaFrames = (request.routeAreas ?? []).map((routeAreaRequest) => {
    const routeAreaSuppliedInputs = applicationAssemblyRouteAreaSuppliedInputs(rootDir, suppliedInputs, routeAreaRequest);
    return {
      suppliedInputs: routeAreaSuppliedInputs,
      lowering: lowerRouterBackedListDetailSourcePlan(routeAreaRequest, rootDir, routeAreaSuppliedInputs),
    };
  });
  const routeAreas = routeAreaFrames.map((routeArea) => routeArea.lowering);
  const routeAreaIssues = [
    ...(routeAreas.length === 0
      ? [{
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.ApplicationAssemblyMissingRouteArea,
          targetRef: targetRef ?? undefined,
          summary: 'ApplicationAssembly SourcePlan lowering requires at least one routeAreas entry so the app shell has a child app area to assemble.',
        }]
      : []),
  ];
  const issues = [
    ...frame.issues,
    ...appName.issues,
    ...resourceCarrier.issues,
    ...conventionPolicy.issues,
    ...directCustomElementSourceLayoutIssues(targetRef, suppliedInputs),
    ...directConventionCarrierIssues(targetRef, conventionPolicy.value, resourceCarrier.value),
    ...routeAreas.flatMap((routeArea) => routeArea.issues),
    ...routeAreaIssues,
  ];
  const routeAreaSourceRequests = routeAreaFrames
    .map((routeArea) => applicationAssemblyRouteAreaSourceRequestForAssembly(
      rootDir,
      appName.value,
      routeArea.lowering.routeAreaSourceRequest,
    ));
  const sourcePlanRequest = rootDir == null
    || appName.value == null
    || resourceCarrier.value == null
    || routeAreaSourceRequests.some((routeArea) => routeArea == null)
    ? null
    : {
        rootDir,
        appName: appName.value,
        carrier: resourceCarrier.value,
        routeAreas: routeAreaSourceRequests.filter((routeArea): routeArea is AppBuilderRoutedCollectionDetailSourceRequest => routeArea != null),
      } satisfies AppBuilderApplicationAssemblySourceRequest;
  const sourcePlan = issues.length > 0 || sourcePlanRequest == null
    ? null
    : appBuilderApplicationAssemblySourcePlan(sourcePlanRequest);
  const expectedEffects = appBuilderExpectedEffectsForSourcePlan(
    sourcePlan,
    appBuilderApplicationAssemblyExpectedEffects,
  );
  const sourceLoweringTargetRefs = appBuilderUniqueOntologyRowRefs([
    ...frame.sourceLoweringTargetRefs,
    ...routeAreas.flatMap((routeArea) => routeArea.sourceLoweringTargetRefs),
  ]);
  const controlUseInventoryRows = routeAreas.flatMap((routeArea) => routeArea.controlUseInventoryRows);
  return {
    targetRef,
    appName: appName.value,
    resourceCarrier: resourceCarrier.value,
    conventionPolicy: conventionPolicy.value,
    routeAreas,
    preflightRow: frame.preflightRow,
    ...(request.includePreflight === true && frame.preflight != null ? { preflight: frame.preflight } : {}),
    sourceLoweringTargetRefs,
    effectContractIds: appBuilderUniqueEffectContractIds(sourceLoweringTargetRefs.flatMap(appBuilderEffectContractIdsForTargetRef)),
    expectedEffectKinds: appBuilderExpectedSemanticEffectKinds(expectedEffects),
    expectedEffects: appBuilderExpectedSemanticEffectPreviews(expectedEffects),
    controlUseInventoryRows,
    sourcePlan,
    issues,
  };
}

function applicationAssemblyRouteAreaSuppliedInputs(
  rootDir: string | null,
  inheritedSuppliedInputs: readonly AppBuilderSuppliedInput[],
  request: AppBuilderSourceLoweringRouterBackedListDetailRequest,
): readonly AppBuilderSuppliedInput[] {
  const explicitSuppliedInputs = [
    ...inheritedSuppliedInputs,
    ...(request.suppliedInputs ?? []),
  ];
  const suppliedInputs = request.targetRef == null
    ? appBuilderSuppliedInputsWithDecisionBundles(explicitSuppliedInputs, request.decisionBundles ?? [])
    : appBuilderSuppliedInputsWithDecisionBundlesForTarget(
        explicitSuppliedInputs,
        request.decisionBundles ?? [],
        request.targetRef,
      );
  if (rootDir == null || appBuilderSourceLoweringSourceRootPayloads(suppliedInputs).includes(rootDir)) {
    return suppliedInputs;
  }
  return [
    ...suppliedInputs,
    {
      inputContractId: AppBuilderInputContractId.SourcePlacement,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      ...(request.targetRef == null ? {} : { targetRefs: [request.targetRef] }),
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.SourceRoot,
        value: rootDir,
      }],
      summary: 'SourceRoot synthesized from application assembly rootDir transport for child route-area lowering.',
    },
  ];
}

function applicationAssemblyRouteAreaSourceRequestForAssembly(
  rootDir: string | null,
  appName: string | null,
  routeAreaSourceRequest: AppBuilderRoutedCollectionDetailSourceRequest | null,
): AppBuilderRoutedCollectionDetailSourceRequest | null {
  if (rootDir == null || appName == null || routeAreaSourceRequest == null) {
    return null;
  }
  return {
    ...routeAreaSourceRequest,
    rootDir,
    appName,
  };
}

const ROUTER_BACKED_LIST_DETAIL_DOMAIN_MATERIALIZATION_TARGET = {
  id: AppBuilderApplicationPatternId.RouterBackedListDetail,
  domainSlots: [
    {
      kind: AppBuilderDomainSlotKind.EntityTitle,
      key: AppBuilderDomainSlotKey.EntityTitle,
      summary: 'Human-facing entity title used to derive type, collection, and route names when explicit names are omitted.',
      required: true,
    },
    {
      kind: AppBuilderDomainSlotKind.EntityTypeName,
      key: AppBuilderDomainSlotKey.EntityTypeName,
      summary: 'Optional explicit TypeScript entity class name for generated domain source.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.CollectionMemberName,
      key: AppBuilderDomainSlotKey.CollectionMemberName,
      summary: 'Optional explicit collection member name for generated DI state.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.IdentityMemberName,
      key: AppBuilderDomainSlotKey.IdentityMemberName,
      summary: 'Optional explicit scalar identity member used by routes, links, seed records, and lookup code.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.IdentityValueKind,
      key: AppBuilderDomainSlotKey.IdentityValueKind,
      summary: 'Explicit scalar identity value kind for generated entity constructors, seed records, and route lookup source.',
      required: true,
    },
    {
      kind: AppBuilderDomainSlotKind.FieldSchema,
      key: AppBuilderDomainSlotKey.FieldSchema,
      summary: 'Field schema displayed in the routed list/detail source.',
      required: true,
      fieldSchema: APP_BUILDER_TEXT_FIELD_SCHEMA_EXPECTATION,
    },
  ] satisfies readonly AppBuilderDomainSlot[],
} as const satisfies AppBuilderDomainMaterializationTarget;

const ROUTE_NAVIGATION_ACTION_TARGET_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.RouteNavigationAction,
);

const DOMAIN_COMMAND_ACTION_TARGET_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.DomainCommandAction,
);

const NATIVE_SUBMIT_FORM_TARGET_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.NativeSubmitForm,
);

const FIELD_GROUP_TARGET_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ControlPattern,
  AppBuilderControlPatternId.FieldGroup,
);

const NATIVE_BUTTON_TARGET_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ControlPattern,
  AppBuilderControlPatternId.NativeButton,
);

const SERVICE_BACKED_LOAD_SAVE_TARGET_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.ServiceBackedLoadSave,
);

const ACTION_FEEDBACK_STATUS_TARGET_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.ActionFeedbackStatus,
);

const DI_STATE_CLASS_DOMAIN_MATERIALIZATION_TARGET = {
  id: AppBuilderApplicationPatternId.DiStateClass,
  domainSlots: [
    {
      kind: AppBuilderDomainSlotKind.EntityTitle,
      key: AppBuilderDomainSlotKey.EntityTitle,
      summary: 'Human-facing entity title used to derive the domain class, state class, and collection member when explicit names are omitted.',
      required: true,
    },
    {
      kind: AppBuilderDomainSlotKind.EntityTypeName,
      key: AppBuilderDomainSlotKey.EntityTypeName,
      summary: 'Optional explicit TypeScript entity class name for generated state source.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.CollectionMemberName,
      key: AppBuilderDomainSlotKey.CollectionMemberName,
      summary: 'Optional explicit collection member name for generated DI state.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.IdentityMemberName,
      key: AppBuilderDomainSlotKey.IdentityMemberName,
      summary: 'Optional explicit scalar identity member used by seed records and collection lookup code.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.IdentityValueKind,
      key: AppBuilderDomainSlotKey.IdentityValueKind,
      summary: 'Explicit scalar identity value kind for generated entity constructors and seed records.',
      required: true,
    },
    {
      kind: AppBuilderDomainSlotKind.FieldSchema,
      key: AppBuilderDomainSlotKey.FieldSchema,
      summary: 'Field schema carried by the generated domain entity class inside the state model file.',
      required: true,
      fieldSchema: APP_BUILDER_ANY_FIELD_SCHEMA_EXPECTATION,
    },
  ] satisfies readonly AppBuilderDomainSlot[],
} as const satisfies AppBuilderDomainMaterializationTarget;

const LOCAL_VIEW_MODEL_COLLECTION_DOMAIN_MATERIALIZATION_TARGET = {
  id: AppBuilderApplicationPatternId.LocalViewModelState,
  domainSlots: [
    {
      kind: AppBuilderDomainSlotKind.EntityTitle,
      key: AppBuilderDomainSlotKey.EntityTitle,
      summary: 'Human-facing entity title used to derive the local collection entity type and member name when explicit names are omitted.',
      required: true,
    },
    {
      kind: AppBuilderDomainSlotKind.EntityTypeName,
      key: AppBuilderDomainSlotKey.EntityTypeName,
      summary: 'Optional explicit TypeScript entity class name for generated local collection source.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.CollectionMemberName,
      key: AppBuilderDomainSlotKey.CollectionMemberName,
      summary: 'Optional explicit collection member name for generated local view-model state.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.IdentityMemberName,
      key: AppBuilderDomainSlotKey.IdentityMemberName,
      summary: 'Optional explicit scalar identity member used by generated seed records.',
      required: false,
    },
    {
      kind: AppBuilderDomainSlotKind.IdentityValueKind,
      key: AppBuilderDomainSlotKey.IdentityValueKind,
      summary: 'Explicit scalar identity value kind for generated entity constructors and seed records.',
      required: true,
    },
    {
      kind: AppBuilderDomainSlotKind.FieldSchema,
      key: AppBuilderDomainSlotKey.FieldSchema,
      summary: 'Field schema displayed by the local collection source.',
      required: true,
      fieldSchema: APP_BUILDER_ANY_FIELD_SCHEMA_EXPECTATION,
    },
  ] satisfies readonly AppBuilderDomainSlot[],
} as const satisfies AppBuilderDomainMaterializationTarget;

export function lowerRouterBackedListDetailSourcePlan(
  request: AppBuilderSourceLoweringRouterBackedListDetailRequest,
  rootDir: string | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AppBuilderSourceLoweringRouterBackedListDetail {
  const frame = directSourcePlanTargetFrame(
    request.targetRef ?? null,
    suppliedInputs,
    request.includePreflight === true,
    ROUTER_BACKED_LIST_DETAIL_SOURCE_PLAN_TARGET_ISSUES,
  );
  const targetRef = frame.targetRef;
  const appName = selectDirectSourcePlanAppName(targetRef, suppliedInputs);
  const resourceCarrier = selectDirectSourcePlanResourceCarrier(targetRef, suppliedInputs);
  const conventionPolicy = selectDirectSourcePlanConventionPolicy(targetRef, suppliedInputs);
  const primaryEntityName = normalizedSourceInputText(request.primaryEntityName);
  const domain = materializeRouterBackedListDetailDomain(targetRef, suppliedInputs, primaryEntityName);
  const routingPolicy = selectRouterBackedListDetailRoutingPolicy(targetRef, suppliedInputs);
  const statePolicy = selectRouterBackedListDetailStatePolicy(targetRef, suppliedInputs);
  const valueSets = appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs);
  const seedDataSet = routerBackedListDetailSeedDataSet(targetRef, domain.value, suppliedInputs);
  const referenceRelationships = routerBackedListDetailReferenceRelationships(targetRef, domain.value, suppliedInputs);
  const ownedRelationships = routerBackedListDetailOwnedRelationships(
    targetRef,
    domain.value,
    seedDataSet.value?.records ?? [],
    suppliedInputs,
  );
  const nestedValueObjectRelationships = routerBackedListDetailNestedValueObjectRelationships(
    targetRef,
    domain.value,
    seedDataSet.value?.records ?? [],
    suppliedInputs,
  );
  const navigationAction = selectRouterBackedListDetailNavigationAction(request, targetRef, suppliedInputs);
  const createForm = selectRouterBackedListDetailCreateForm(request, targetRef, domain.value, valueSets, referenceRelationships.value, suppliedInputs);
  const createActionFeedback = selectRouterBackedListDetailCreateActionFeedback(targetRef, createForm.value, suppliedInputs);
  const serviceCollection = selectRouterBackedListDetailServiceCollection(
    request,
    targetRef,
    domain.value,
    valueSets,
    createForm.value,
    suppliedInputs,
  );
  const tableColumns = selectRouterBackedListDetailTableColumns(
    targetRef,
    domain.value,
    [
      ...referenceRelationships.value,
      ...ownedRelationships.value,
      ...nestedValueObjectRelationships.value,
    ],
    navigationAction.value,
    serviceCollection.value,
    suppliedInputs,
  );
  const detailDisplayFields = selectRouterBackedListDetailDisplayFields(
    targetRef,
    domain.value,
    tableColumns.value,
    suppliedInputs,
  );
  const detailRelatedCollections = selectRouterBackedListDetailRelatedCollections(
    request.detailRelatedCollections ?? [],
    targetRef,
    domain.value,
    suppliedInputs,
  );
  const sourcePatternParameterValues = appBuilderSourceLoweringSourcePatternParameterValues(suppliedInputs);
  const issues = [
    ...frame.issues,
    ...appName.issues,
    ...resourceCarrier.issues,
    ...conventionPolicy.issues,
    ...directCustomElementSourceLayoutIssues(targetRef, suppliedInputs),
    ...directConventionCarrierIssues(targetRef, conventionPolicy.value, resourceCarrier.value),
    ...domain.issues,
    ...routingPolicy.issues,
    ...statePolicy.issues,
    ...seedDataSet.issues,
    ...referenceRelationships.issues,
    ...ownedRelationships.issues,
    ...nestedValueObjectRelationships.issues,
    ...navigationAction.issues,
    ...createForm.issues,
    ...createActionFeedback.issues,
    ...serviceCollection.issues,
    ...tableColumns.issues,
    ...detailDisplayFields.issues,
    ...detailRelatedCollections.issues,
  ];
  const routeAreaSourceRequest = issues.length > 0
    || rootDir == null
    || appName.value == null
    || resourceCarrier.value == null
    || domain.value == null
    || seedDataSet.value == null
    ? null
    : {
        rootDir,
        appName: appName.value,
        carrier: resourceCarrier.value,
        domain: domain.value,
        valueSets,
        seedDataSet: seedDataSet.value,
        referenceRelationships: referenceRelationships.value,
        ownedRelationships: ownedRelationships.value,
        nestedValueObjectRelationships: nestedValueObjectRelationships.value,
        detailNavigationAction: navigationAction.value,
        createForm: createForm.value,
        createActionFeedback: createActionFeedback.value,
        tableColumns: tableColumns.value,
        detailDisplayFields: detailDisplayFields.value,
        serviceCollection: serviceCollection.value,
        detailRelatedCollections: detailRelatedCollections.value,
        sourcePatternParameterValues,
      } satisfies AppBuilderRoutedCollectionDetailSourceRequest;
  const sourcePlan = routeAreaSourceRequest == null
    ? null
    : appBuilderRoutedCollectionDetailSourcePlan(routeAreaSourceRequest);
  const expectedEffects = appBuilderExpectedEffectsForSourcePlan(
    sourcePlan,
    appBuilderRoutedCollectionDetailSourcePlanExpectedEffects,
  );
  const controlUseInventoryRows = routerBackedListDetailNavigationControlUseInventoryRows(
    sourcePlan,
    domain.value,
    navigationAction.value,
    sourcePatternParameterValues,
  ).concat(routerBackedListDetailCreateFormControlUseInventoryRows(
    sourcePlan,
    targetRef,
    domain.value,
    createForm.value,
    valueSets,
    referenceRelationships.value,
  )).concat(routerBackedListDetailServiceQueryControlUseInventoryRows(
    sourcePlan,
    serviceCollection.value,
  )).concat(routerBackedListDetailRowCommandControlUseInventoryRows(
    sourcePlan,
    domain.value,
    tableColumns.value,
  ));
  const sourceLoweringTargetRefs = appBuilderUniqueOntologyRowRefs([
    ...frame.sourceLoweringTargetRefs,
    ...(navigationAction.value == null ? [] : [ROUTE_NAVIGATION_ACTION_TARGET_REF]),
    ...routerBackedListDetailCreateFormTargetRefs(domain.value, createForm.value, valueSets, referenceRelationships.value),
    ...(createActionFeedback.value == null ? [] : [ACTION_FEEDBACK_STATUS_TARGET_REF]),
    ...routerBackedListDetailServiceCollectionTargetRefs(serviceCollection.value),
    ...routerBackedListDetailRowCommandTargetRefs(tableColumns.value),
  ]);
  return {
    targetRef,
    appName: appName.value,
    resourceCarrier: resourceCarrier.value,
    conventionPolicy: conventionPolicy.value,
    domain: domain.value,
    routingPolicy: routingPolicy.value,
    statePolicy: statePolicy.value,
    seedDataSet: seedDataSet.value,
    primaryEntityName: domain.entityName,
    navigationAction: navigationAction.action,
    navigationLinkText: navigationAction.value?.linkText ?? null,
    createAction: createForm.action,
    createFormFieldNames: createForm.value?.fieldNames ?? [],
    createSubmitButtonText: createForm.value?.submitButtonText ?? null,
    createActionFeedback: createActionFeedback.value,
    referenceRelationships: referenceRelationships.value.map((relationship) => relationship.relationship),
    ownedRelationships: ownedRelationships.value.map((relationship) => relationship.relationship),
    nestedValueObjectRelationships: nestedValueObjectRelationships.value.map((relationship) => relationship.relationship),
    tableColumns: tableColumns.value.map((column) => column.column),
    serviceCollection: serviceCollection.value,
    detailRelatedCollections: detailRelatedCollections.value.map((collection) => ({
      relationship: collection.relationship,
      domain: collection.domain,
      title: collection.title,
      itemLocalName: collection.itemLocalName,
      tableColumns: collection.tableColumns,
    })),
    preflightRow: frame.preflightRow,
    ...(request.includePreflight === true && frame.preflight != null ? { preflight: frame.preflight } : {}),
    sourceLoweringTargetRefs,
    effectContractIds: appBuilderUniqueEffectContractIds(sourceLoweringTargetRefs.flatMap(appBuilderEffectContractIdsForTargetRef)),
    expectedEffectKinds: appBuilderExpectedSemanticEffectKinds(expectedEffects),
    expectedEffects: appBuilderExpectedSemanticEffectPreviews(expectedEffects),
    controlUseInventoryRows,
    routeAreaSourceRequest,
    sourcePlan,
    issues,
  };
}

function routerBackedListDetailNavigationControlUseInventoryRows(
  sourcePlan: SourcePlan | null,
  domain: AppBuilderDomainDescriptor | null,
  navigationAction: AppBuilderRoutedCollectionDetailNavigationActionSource | null,
  sourcePatternParameterValues: readonly SourcePatternParameterValue[],
): readonly AppBuilderControlUseInventoryRow[] {
  if (sourcePlan == null || domain == null || navigationAction == null) {
    return [];
  }
  const entityFileName = appBuilderKebabCase(domain.entityTypeName);
  const detailRouteId = `${entityFileName}-detail`;
  const detailRouteParameterName = sourcePatternParameterValue(
    sourcePatternParameterValues,
    SourcePatternParameterKey.DetailRouteParameter,
  ) ?? `${appBuilderLowerCamelCase(domain.entityTypeName)}Id`;
  const itemName = appBuilderLowerCamelCase(domain.entityTypeName);
  const routeParamsExpression = `{ ${detailRouteParameterName}: ${itemName}.${domain.identityMemberName} }`;
  const loadAttributeFragment = appBuilderRouterLoadAttributeFragment(detailRouteId, {
    paramsExpression: routeParamsExpression,
  });
  const linkFragment = appBuilderTemplateElementFragment(
    'a',
    [loadAttributeFragment.templateAttribute],
    authoredTemplateTextContentText(navigationAction.linkText),
  );
  return appBuilderControlUseInventoryRowsForInvocation({
    targetRef: ROUTE_NAVIGATION_ACTION_TARGET_REF,
    fragments: [linkFragment],
    controlPatternId: AppBuilderControlPatternId.NativeLinkNavigation,
    actionName: navigationAction.actionName,
    actionChannelKind: AppBuilderControlUseActionChannelKind.RouterLoadNavigation,
    routeInstruction: `route: ${detailRouteId}; params.bind: ${routeParamsExpression}`,
    linkText: navigationAction.linkText,
    labelText: navigationAction.linkText,
    labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
  });
}

function routerBackedListDetailCreateFormControlUseInventoryRows(
  sourcePlan: SourcePlan | null,
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  createForm: AppBuilderRoutedCollectionDetailCreateFormSource | null,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
  referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipSource[],
): readonly AppBuilderControlUseInventoryRow[] {
  if (sourcePlan == null || targetRef == null || domain == null || createForm == null) {
    return [];
  }
  const fields = appBuilderDomainFieldSourceModels(domain.fields, {
    entityTypeName: domain.entityTypeName,
    valueSets,
  });
  const selectedFields = createForm.fieldNames
    .map((fieldName) => fields.find((field) => field.memberName === fieldName))
    .filter((field): field is AppBuilderDomainFieldSourceModel => field != null)
    .map((field) => ({
      field,
      relationship: routerBackedListDetailCreateFormReferenceRelationship(field, referenceRelationships),
    }));
  const selectedObjectRelationships = createForm.fieldNames
    .map((fieldName) => routerBackedListDetailCreateFormObjectRelationship(fieldName, referenceRelationships))
    .filter((relationship): relationship is AppBuilderRoutedCollectionDetailReferenceRelationshipSource => relationship != null);
  return [
    ...selectedFields.flatMap(({ field, relationship }) => {
      const controlId = routerBackedListDetailCreateFormControlId(field, relationship);
      return optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
        sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringSourcePlan,
        targetRef: FIELD_GROUP_TARGET_REF,
        fragments: [routerBackedListDetailCreateFormFieldGroupFragment(field, relationship)],
        controlPatternId: AppBuilderControlPatternId.FieldGroup,
        controlId,
        innerControlPatternId: appBuilderControlPatternIdForLeafControlId(controlId),
        fieldName: field.memberName,
        bindingExpression: field.memberName,
        bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource.SelectedFieldName,
        labelText: field.field.title,
        labelTextSource: AppBuilderSourceLoweringLabelTextSource.SelectedFieldTitle,
        fieldControlId: routerBackedListDetailCreateFormFieldControlId(field),
        fieldControlIdSource: AppBuilderSourceLoweringFieldControlIdSource.SelectedFieldName,
        valueDomainExpression: routerBackedListDetailCreateFormValueDomainExpression(field, relationship),
        valueDomainExpressionSource: routerBackedListDetailCreateFormValueDomainExpressionSource(field, relationship),
      }));
    }),
    ...selectedObjectRelationships.flatMap((relationship) => {
      const fieldName = routerBackedListDetailRelationshipLocalFieldName(relationship);
      const controlId = routerBackedListDetailCreateFormRelationshipControlId(relationship);
      return optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
        sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringSourcePlan,
        targetRef: FIELD_GROUP_TARGET_REF,
        fragments: [routerBackedListDetailCreateFormObjectRelationshipFieldGroupFragment(relationship)],
        controlPatternId: AppBuilderControlPatternId.FieldGroup,
        controlId,
        innerControlPatternId: appBuilderControlPatternIdForLeafControlId(controlId),
        fieldName,
        bindingExpression: fieldName,
        bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource.SelectedRelationshipLocalValue,
        labelText: relationship.relationship.title ?? relationship.relationship.name,
        labelTextSource: AppBuilderSourceLoweringLabelTextSource.SelectedRelationshipTitle,
        fieldControlId: routerBackedListDetailCreateFormRelationshipFieldControlId(relationship),
        fieldControlIdSource: AppBuilderSourceLoweringFieldControlIdSource.SelectedRelationshipLocalValue,
        valueDomainExpression: `state.${relationship.relatedDomain.collectionMemberName}`,
        valueDomainExpressionSource: AppBuilderSourceLoweringValueDomainExpressionSource.RelationshipCollection,
      }));
    }),
    ...optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
      sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringSourcePlan,
      targetRef: NATIVE_SUBMIT_FORM_TARGET_REF,
      fragments: [appBuilderTemplateElementFragment(
        'button',
        [{ rawName: 'type', rawValue: 'submit' }],
        authoredTemplateTextContentText(createForm.submitButtonText),
      )],
      controlPatternId: AppBuilderControlPatternId.NativeButton,
      actionName: createForm.actionName,
      handlerExpression: `${createForm.actionName}()`,
      handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
      eventName: 'submit',
      actionChannelKind: AppBuilderControlUseActionChannelKind.ContainingFormSubmit,
      buttonText: createForm.submitButtonText,
      buttonType: AppBuilderSourceLoweringButtonType.Submit,
      labelText: createForm.submitButtonText,
      labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
    })),
  ];
}

function routerBackedListDetailCreateFormFieldGroupFragment(
  field: AppBuilderDomainFieldSourceModel,
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource | null = null,
): AppBuilderPartSourceFragment {
  const control = appendAppBuilderTemplateElementAttributes(
    relationship == null
      ? (field.optionMemberName == null
        ? appBuilderControlElementFragment(field.controlId, field.memberName, sourcePlanFieldControlConstraintSlots(field))
        : appBuilderChoiceControlElementFragment(field.controlId, field.memberName, {
          optionDomainExpression: `state.${field.optionMemberName}`,
          optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
          optionValueExpression: 'option.value',
          optionLabelExpression: 'option.title',
          slotAssignments: sourcePlanFieldControlConstraintSlots(field),
        }))
      : appBuilderChoiceControlElementFragment(routerBackedListDetailCreateFormRelationshipControlId(relationship), field.memberName, {
          optionDomainExpression: `state.${relationship.relatedDomain.collectionMemberName}`,
          optionLocalName: appBuilderLowerCamelCase(relationship.relatedDomain.entityTypeName),
          optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
          optionValueExpression: `${appBuilderLowerCamelCase(relationship.relatedDomain.entityTypeName)}.${routerBackedListDetailRelationshipForeignFieldName(relationship)}`,
          optionLabelExpression: routerBackedListDetailRelationshipDisplayExpression(relationship),
        }),
    [{ rawName: 'id', rawValue: routerBackedListDetailCreateFormFieldControlId(field) }],
  );
  const label = appBuilderTemplateElementFragment(
    'label',
    [{ rawName: 'for', rawValue: routerBackedListDetailCreateFormFieldControlId(field) }],
    authoredTemplateTextContentText(field.field.title),
  );
  return appBuilderTemplateElementFragment('div', [], null, [
    label.templateElement,
    control.templateElement,
  ]);
}

function sourcePlanFieldControlConstraintSlots(
  field: AppBuilderDomainFieldSourceModel,
): readonly AppBuilderPartSlotAssignment[] {
  const nativeSelection = appBuilderSelectNativeFieldConstraints(field.controlId, field);
  const numericSelection = appBuilderSelectNumericControlConstraints(field.controlId, field);
  return [
    ...(nativeSelection.issue == null ? nativeSelection.slotAssignments : []),
    ...(numericSelection.issue == null ? numericSelection.slotAssignments : []),
  ];
}

function routerBackedListDetailCreateFormObjectRelationshipFieldGroupFragment(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource,
): AppBuilderPartSourceFragment {
  const fieldControlId = routerBackedListDetailCreateFormRelationshipFieldControlId(relationship);
  const relatedItemName = appBuilderLowerCamelCase(relationship.relatedDomain.entityTypeName);
  const control = appendAppBuilderTemplateElementAttributes(
    appBuilderChoiceControlElementFragment(routerBackedListDetailCreateFormRelationshipControlId(relationship), routerBackedListDetailRelationshipLocalFieldName(relationship), {
      optionDomainExpression: `state.${relationship.relatedDomain.collectionMemberName}`,
      optionLocalName: relatedItemName,
      optionBindingKind: AppBuilderChoiceOptionBindingKind.Model,
      optionValueExpression: relatedItemName,
      optionLabelExpression: routerBackedListDetailRelationshipDisplayExpression(relationship),
      matcherExpression: `state.match${relationship.relatedDomain.entityTypeName}`,
    }),
    [{ rawName: 'id', rawValue: fieldControlId }],
  );
  const label = appBuilderTemplateElementFragment(
    'label',
    [{ rawName: 'for', rawValue: fieldControlId }],
    authoredTemplateTextContentText(relationship.relationship.title ?? relationship.relationship.name),
  );
  return appBuilderTemplateElementFragment('div', [], null, [
    label.templateElement,
    control.templateElement,
  ]);
}

function routerBackedListDetailCreateFormValueDomainExpression(
  field: AppBuilderDomainFieldSourceModel,
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource | null = null,
): string | null {
  if (relationship != null) {
    return `state.${relationship.relatedDomain.collectionMemberName}`;
  }
  return field.optionMemberName == null ? null : `state.${field.optionMemberName}`;
}

function routerBackedListDetailCreateFormValueDomainExpressionSource(
  field: AppBuilderDomainFieldSourceModel,
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource | null = null,
): AppBuilderSourceLoweringValueDomainExpressionSource | null {
  if (relationship != null) {
    return AppBuilderSourceLoweringValueDomainExpressionSource.RelationshipCollection;
  }
  if (field.optionMemberName == null) {
    return null;
  }
  return field.field.valueSetName == null
    ? AppBuilderSourceLoweringValueDomainExpressionSource.FieldOptions
    : AppBuilderSourceLoweringValueDomainExpressionSource.FieldValueSetName;
}

function routerBackedListDetailCreateFormFieldControlId(
  field: AppBuilderDomainFieldSourceModel,
): string {
  return `${appBuilderKebabCase(field.memberName)}-field`;
}

function routerBackedListDetailCreateFormRelationshipFieldControlId(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource,
): string {
  return `${appBuilderKebabCase(routerBackedListDetailRelationshipLocalFieldName(relationship))}-field`;
}

function routerBackedListDetailCreateFormControlId(
  field: AppBuilderDomainFieldSourceModel,
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource | null,
): AppBuilderControlId {
  if (relationship == null) {
    return field.controlId;
  }
  return routerBackedListDetailCreateFormRelationshipControlId(relationship);
}

function routerBackedListDetailCreateFormRelationshipControlId(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource,
): AppBuilderControlId {
  return relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany
    ? AppBuilderControlId.MultiSelect
    : AppBuilderControlId.SingleSelect;
}

function routerBackedListDetailCreateFormReferenceRelationship(
  field: AppBuilderDomainFieldDescriptor | AppBuilderDomainFieldSourceModel,
  referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipSource[],
): AppBuilderRoutedCollectionDetailReferenceRelationshipSource | null {
  const fieldName = 'memberName' in field ? field.memberName : field.name;
  return referenceRelationships.find((relationship) =>
    relationship.relationship.localFieldName === fieldName
    && (relationship.relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity) === AppBuilderDomainRelationshipLocalValueKind.Identity
  ) ?? null;
}

function routerBackedListDetailCreateFormObjectRelationship(
  fieldName: string,
  referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipSource[],
): AppBuilderRoutedCollectionDetailReferenceRelationshipSource | null {
  return referenceRelationships.find((relationship) =>
    (
      relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceOne
      || relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany
    )
    && relationship.relationship.localFieldName === fieldName
    && (relationship.relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity) === AppBuilderDomainRelationshipLocalValueKind.Object
  ) ?? null;
}

function routerBackedListDetailRelationshipLocalFieldName(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource,
): string {
  const localFieldName = relationship.relationship.localFieldName;
  if (localFieldName == null) {
    throw new Error(`Relationship '${relationship.relationship.name}' must supply localFieldName before routed source inventory can be emitted.`);
  }
  return localFieldName;
}

function routerBackedListDetailRelationshipForeignFieldName(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource,
): string {
  return relationship.relationship.foreignFieldName ?? relationship.relatedDomain.identityMemberName;
}

function routerBackedListDetailRelationshipDisplayExpression(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipSource,
): string {
  const relatedItemName = appBuilderLowerCamelCase(relationship.relatedDomain.entityTypeName);
  const relatedFields = appBuilderDomainFieldSourceModels(relationship.relatedDomain.fields, {
    entityTypeName: relationship.relatedDomain.entityTypeName,
  });
  const displayField = relatedFields.find((field) => field.memberName === relationship.relationship.displayFieldName)
    ?? relatedFields.find((field) => field.memberName === relationship.relatedDomain.identityMemberName)
    ?? relatedFields[0]!;
  return appBuilderDomainFieldDisplayExpression(displayField, relatedItemName);
}

function routerBackedListDetailCreateFormTargetRefs(
  domain: AppBuilderDomainDescriptor | null,
  createForm: AppBuilderRoutedCollectionDetailCreateFormSource | null,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
  referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipSource[],
): readonly AppBuilderOntologyRowRef[] {
  if (domain == null || createForm == null) {
    return [];
  }
  const fields = appBuilderDomainFieldSourceModels(domain.fields, {
    entityTypeName: domain.entityTypeName,
    valueSets,
  });
  const selectedLeafTargetRefs = createForm.fieldNames
    .map((fieldName) => fields.find((field) => field.memberName === fieldName))
    .filter((field): field is AppBuilderDomainFieldSourceModel => field != null)
    .map((field) => {
      const relationship = routerBackedListDetailCreateFormReferenceRelationship(field, referenceRelationships);
      const controlId = routerBackedListDetailCreateFormControlId(field, relationship);
      return appBuilderOntologyRowRef(
        AppBuilderOntologyRowKind.ControlPattern,
        appBuilderControlPatternIdForLeafControlId(controlId),
      );
    });
  const selectedObjectRelationshipTargetRefs = createForm.fieldNames
    .map((fieldName) => routerBackedListDetailCreateFormObjectRelationship(fieldName, referenceRelationships))
    .filter((relationship): relationship is AppBuilderRoutedCollectionDetailReferenceRelationshipSource => relationship != null)
    .map((relationship) => appBuilderOntologyRowRef(
      AppBuilderOntologyRowKind.ControlPattern,
      appBuilderControlPatternIdForLeafControlId(routerBackedListDetailCreateFormRelationshipControlId(relationship)),
    ));
  return [
    NATIVE_SUBMIT_FORM_TARGET_REF,
    NATIVE_BUTTON_TARGET_REF,
    ...(selectedLeafTargetRefs.length === 0 && selectedObjectRelationshipTargetRefs.length === 0 ? [] : [FIELD_GROUP_TARGET_REF]),
    ...selectedLeafTargetRefs,
    ...selectedObjectRelationshipTargetRefs,
  ];
}

function routerBackedListDetailServiceQueryControlUseInventoryRows(
  sourcePlan: SourcePlan | null,
  serviceCollection: AppBuilderSourceLoweringRouterBackedListDetailServiceCollection | null,
): readonly AppBuilderControlUseInventoryRow[] {
  if (sourcePlan == null || serviceCollection == null) {
    return [];
  }
  return serviceCollection.queryControls.flatMap((queryControl) => {
    const filterMethod = serviceCollection.filterMethods.find((candidate) =>
      candidate.methodName === queryControl.filterMethodName
    ) ?? null;
    return [
      ...optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
        sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringSourcePlan,
        targetRef: FIELD_GROUP_TARGET_REF,
        fragments: [routerBackedListDetailServiceQueryControlFieldGroupFragment(queryControl)],
        controlPatternId: AppBuilderControlPatternId.FieldGroup,
        controlId: AppBuilderControlId.SearchInput,
        innerControlPatternId: appBuilderControlPatternIdForLeafControlId(AppBuilderControlId.SearchInput),
        fieldName: filterMethod?.fieldName ?? queryControl.stateMemberName,
        bindingExpression: queryControl.stateMemberName,
        bindingExpressionSource: AppBuilderSourceLoweringBindingExpressionSource.ExplicitRequest,
        labelText: queryControl.labelText,
        labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
        fieldControlId: queryControl.fieldControlId,
        fieldControlIdSource: AppBuilderSourceLoweringFieldControlIdSource.ExplicitRequest,
      })),
      ...routerBackedListDetailServiceQueryControlButtonUseInventoryRows(
        queryControl.applyActionName,
        queryControl.applyButtonText,
      ),
      ...routerBackedListDetailServiceQueryControlFeedbackUseInventoryRows(queryControl.applyActionFeedback ?? null),
      ...routerBackedListDetailServiceQueryControlButtonUseInventoryRows(
        queryControl.clearActionName,
        queryControl.clearButtonText,
      ),
      ...routerBackedListDetailServiceQueryControlFeedbackUseInventoryRows(queryControl.clearActionFeedback ?? null),
    ];
  });
}

function routerBackedListDetailServiceQueryControlFieldGroupFragment(
  queryControl: AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControl,
): AppBuilderPartSourceFragment {
  const control = appendAppBuilderTemplateElementAttributes(
    appBuilderControlElementFragment(AppBuilderControlId.SearchInput, queryControl.stateMemberName),
    [{ rawName: 'id', rawValue: queryControl.fieldControlId }],
  );
  const label = appBuilderTemplateElementFragment(
    'label',
    [{ rawName: 'for', rawValue: queryControl.fieldControlId }],
    authoredTemplateTextContentText(queryControl.labelText),
  );
  return appBuilderTemplateElementFragment('div', [], null, [
    label.templateElement,
    control.templateElement,
  ]);
}

function routerBackedListDetailServiceQueryControlButtonUseInventoryRows(
  actionName: string,
  buttonText: string,
): readonly AppBuilderControlUseInventoryRow[] {
  return optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
    sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringSourcePlan,
    targetRef: NATIVE_BUTTON_TARGET_REF,
    fragments: [routerBackedListDetailServiceQueryControlButtonFragment(actionName, buttonText)],
    controlPatternId: AppBuilderControlPatternId.NativeButton,
    actionName,
    handlerExpression: `${actionName}()`,
    handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
    eventName: 'click',
    actionChannelKind: AppBuilderControlUseActionChannelKind.DirectControlEvent,
    buttonText,
    buttonType: AppBuilderSourceLoweringButtonType.Button,
    labelText: buttonText,
    labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
  }));
}

function routerBackedListDetailServiceQueryControlButtonFragment(
  actionName: string,
  buttonText: string,
): AppBuilderPartSourceFragment {
  return appBuilderTemplateElementFragment(
    'button',
    [
      { rawName: 'type', rawValue: 'button' },
      { rawName: 'click.trigger', rawValue: `${actionName}()` },
    ],
    authoredTemplateTextContentText(buttonText),
  );
}

function routerBackedListDetailServiceQueryControlFeedbackUseInventoryRows(
  feedback: AppBuilderSourceLoweringActionFeedbackPayload | null,
): readonly AppBuilderControlUseInventoryRow[] {
  if (feedback == null) {
    return [];
  }
  return optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
    sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringSourcePlan,
    targetRef: ACTION_FEEDBACK_STATUS_TARGET_REF,
    fragments: [routerBackedListDetailServiceQueryControlFeedbackFragment(feedback)],
    controlPatternId: AppBuilderControlPatternId.FormMessage,
    actionName: feedback.actionName,
    messageKind: AppBuilderSourceLoweringMessageKind.Status,
    messageText: feedback.statusText,
    messageTextSource: AppBuilderSourceLoweringMessageTextSource.ExplicitRequest,
    messageId: feedback.statusId ?? null,
  }));
}

function routerBackedListDetailServiceQueryControlFeedbackFragment(
  feedback: AppBuilderSourceLoweringActionFeedbackPayload,
): AppBuilderPartSourceFragment {
  const conditional = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.Conditional, [
    [AppBuilderPartSlotKind.BindingExpression, feedback.statusMemberName],
  ]);
  const interpolation = appBuilderTextInterpolationFragment(feedback.statusMemberName);
  return appBuilderTemplateElementFragment(
    'p',
    [
      conditional.templateAttribute,
      { rawName: 'role', rawValue: 'status' },
      ...(feedback.statusId == null ? [] : [{ rawName: 'id', rawValue: feedback.statusId }]),
    ],
    interpolation.text,
  );
}

function routerBackedListDetailRowCommandControlUseInventoryRows(
  sourcePlan: SourcePlan | null,
  domain: AppBuilderDomainDescriptor | null,
  tableColumns: readonly AppBuilderRoutedCollectionDetailTableColumnSource[],
): readonly AppBuilderControlUseInventoryRow[] {
  if (sourcePlan == null || domain == null) {
    return [];
  }
  const itemName = appBuilderLowerCamelCase(domain.entityTypeName);
  return routerBackedListDetailRowCommandTableColumns(tableColumns).flatMap((column) => {
    const action = column.rowCommandAction;
    if (action == null) {
      return [];
    }
    return optionalControlUseInventoryRow(appBuilderControlUseInventoryRow({
      sourceKind: AppBuilderControlUseInventorySourceKind.SourceLoweringSourcePlan,
      targetRef: DOMAIN_COMMAND_ACTION_TARGET_REF,
      fragments: [routerBackedListDetailRowCommandButtonFragment(action, itemName, column.header)],
      controlPatternId: AppBuilderControlPatternId.NativeButton,
      actionName: action.name,
      handlerExpression: `${action.name}(${itemName})`,
      handlerExpressionSource: AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
      eventName: 'click',
      actionChannelKind: AppBuilderControlUseActionChannelKind.DirectControlEvent,
      buttonText: column.header,
      buttonType: AppBuilderSourceLoweringButtonType.Button,
      labelText: column.header,
      labelTextSource: AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
    }));
  });
}

function routerBackedListDetailRowCommandButtonFragment(
  action: AppBuilderDomainActionDescriptor,
  itemName: string,
  buttonText: string,
): AppBuilderPartSourceFragment {
  return appBuilderTemplateElementFragment(
    'button',
    [
      { rawName: 'type', rawValue: 'button' },
      { rawName: 'click.trigger', rawValue: `${action.name}(${itemName})` },
    ],
    authoredTemplateTextContentText(buttonText),
  );
}

function routerBackedListDetailRowCommandTargetRefs(
  tableColumns: readonly AppBuilderRoutedCollectionDetailTableColumnSource[],
): readonly AppBuilderOntologyRowRef[] {
  return routerBackedListDetailRowCommandTableColumns(tableColumns).length === 0
    ? []
    : [DOMAIN_COMMAND_ACTION_TARGET_REF, NATIVE_BUTTON_TARGET_REF];
}

function routerBackedListDetailRowCommandTableColumns(
  tableColumns: readonly AppBuilderRoutedCollectionDetailTableColumnSource[],
): readonly AppBuilderRoutedCollectionDetailTableColumnSource[] {
  return tableColumns.filter((column) =>
    column.kind === AppBuilderRoutedCollectionDetailTableColumnKind.RowCommandAction);
}

function routerBackedListDetailServiceCollectionTargetRefs(
  serviceCollection: AppBuilderSourceLoweringRouterBackedListDetailServiceCollection | null,
): readonly AppBuilderOntologyRowRef[] {
  if (serviceCollection == null) {
    return [];
  }
  const hasQueryControls = serviceCollection.queryControls.length > 0;
  const hasQueryFeedback = serviceCollection.queryControls.some((queryControl) =>
    queryControl.applyActionFeedback != null || queryControl.clearActionFeedback != null
  );
  return [
    SERVICE_BACKED_LOAD_SAVE_TARGET_REF,
    ...(hasQueryControls
      ? [
          FIELD_GROUP_TARGET_REF,
          appBuilderOntologyRowRef(
            AppBuilderOntologyRowKind.ControlPattern,
            appBuilderControlPatternIdForLeafControlId(AppBuilderControlId.SearchInput),
          ),
          NATIVE_BUTTON_TARGET_REF,
        ]
      : []),
    ...(hasQueryFeedback ? [ACTION_FEEDBACK_STATUS_TARGET_REF] : []),
  ];
}

function optionalControlUseInventoryRow(
  row: AppBuilderControlUseInventoryRow | null,
): readonly AppBuilderControlUseInventoryRow[] {
  return row == null ? [] : [row];
}

export function lowerDiStateClassSourcePlan(
  request: AppBuilderSourceLoweringDiStateClassRequest,
  rootDir: string | null,
  stateModelPath: string | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AppBuilderSourceLoweringDiStateClass {
  const frame = directSourcePlanTargetFrame(
    request.targetRef ?? null,
    suppliedInputs,
    request.includePreflight === true,
    DI_STATE_CLASS_SOURCE_PLAN_TARGET_ISSUES,
  );
  const targetRef = frame.targetRef;
  const domain = materializeDiStateClassDomain(targetRef, suppliedInputs);
  const seedRecords = diStateClassSeedRecords(targetRef, domain.value, suppliedInputs);
  const issues = [
    ...frame.issues,
    ...domain.issues,
    ...seedRecords.issues,
  ];
  const sourcePlan = issues.length > 0
    || rootDir == null
    || stateModelPath == null
    || domain.value == null
    ? null
    : appBuilderDiStateClassSourcePlan({
        rootDir,
        stateModelPath,
        domain: domain.value,
        seedRecords: seedRecords.value,
      });
  return {
    targetRef,
    stateModelPath,
    domain: domain.value,
    seedRecords: seedRecords.value,
    preflightRow: frame.preflightRow,
    ...(request.includePreflight === true && frame.preflight != null ? { preflight: frame.preflight } : {}),
    sourceLoweringTargetRefs: frame.sourceLoweringTargetRefs,
    effectContractIds: frame.effectContractIds,
    expectedEffectKinds: [],
    expectedEffects: [],
    sourcePlan,
    issues,
  };
}

export function lowerLocalViewModelStateSourcePlan(
  request: AppBuilderSourceLoweringLocalViewModelStateRequest,
  rootDir: string | null,
  componentPath: string | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  localFieldNames: readonly string[] | null = null,
  collectionMutableFieldNames: readonly string[] = [],
  fieldValueSetSelections: readonly AppBuilderDomainFieldValueSetSelection[] = [],
  fieldObjectStates: readonly AppBuilderLocalViewModelFieldObjectStateSourceModel[] = [],
): AppBuilderSourceLoweringLocalViewModelState {
  const frame = directSourcePlanTargetFrame(
    request.targetRef ?? null,
    suppliedInputs,
    request.includePreflight === true,
    LOCAL_VIEW_MODEL_STATE_SOURCE_PLAN_TARGET_ISSUES,
  );
  const targetRef = frame.targetRef;
  const className = selectDirectSourcePlanClassName(targetRef, suppliedInputs);
  const fields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const valueSets = appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs);
  const statePolicy = selectLocalViewModelStatePolicy(targetRef, suppliedInputs);
  const localStatePolicies = statePolicy.value?.localStatePolicies ?? [];
  const includeLocalFieldState = statePolicy.value == null
    || localStatePolicies.includes(AppBuilderLocalStatePolicy.ViewModelLocalState);
  const includeLocalCollectionState = localStatePolicies.includes(AppBuilderLocalStatePolicy.ViewModelLocalCollection);
  const domain = includeLocalCollectionState
    ? materializeLocalViewModelCollectionDomain(targetRef, suppliedInputs)
    : { value: null, issues: [] };
  const seedRecords = includeLocalCollectionState
    ? localViewModelCollectionSeedRecords(targetRef, domain.value, suppliedInputs)
    : { value: [], issues: [] };
  const referenceRelationships = includeLocalCollectionState
    ? localViewModelCollectionReferenceRelationships(targetRef, domain.value, suppliedInputs)
    : { value: [], issues: [] };
  const ownedRelationships = includeLocalCollectionState
    ? localViewModelCollectionOwnedRelationships(targetRef, domain.value, seedRecords.value, suppliedInputs)
    : { value: [], issues: [] };
  const nestedValueObjectRelationships = includeLocalCollectionState
    ? localViewModelCollectionNestedValueObjectRelationships(targetRef, domain.value, seedRecords.value, suppliedInputs)
    : { value: [], issues: [] };
  const collectionQueryState = includeLocalCollectionState
    ? localViewModelCollectionQueryState(targetRef, domain.value, suppliedInputs)
    : { value: null, issues: [] };
  const collectionSelectionState = includeLocalCollectionState
    ? localViewModelCollectionSelectionState(targetRef, domain.value, suppliedInputs)
    : { value: null, issues: [] };
  const actionFeedbackState = localViewModelActionFeedbackState(targetRef, suppliedInputs);
  const localFields = includeLocalFieldState
    ? appBuilderLocalViewModelFieldsForNames(fields, localFieldNames)
    : [];
  const issues = [
    ...frame.issues,
    ...className.issues,
    ...statePolicy.issues,
    ...domain.issues,
    ...seedRecords.issues,
    ...referenceRelationships.issues,
    ...ownedRelationships.issues,
    ...nestedValueObjectRelationships.issues,
    ...collectionQueryState.issues,
    ...collectionSelectionState.issues,
    ...actionFeedbackState.issues,
  ];
  const fragmentOrigin = targetRef == null
    ? undefined
    : sourceLoweringTargetFragmentOrigin(targetRef, AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview);
  const fragments = className.value == null
    ? { typeScriptTopLevelFragments: [], classMemberFragments: [] }
    : appBuilderLocalViewModelStateSourceFragments({
        className: className.value,
        fields: localFields,
        valueSets,
        fieldValueSetSelections,
        fieldObjectStates,
        collectionState: domain.value == null
          ? null
          : {
              domain: domain.value,
              seedRecords: seedRecords.value,
              mutableFieldNames: collectionMutableFieldNames,
              referenceRelationships: referenceRelationships.value,
              ownedRelationships: ownedRelationships.value,
              nestedValueObjectRelationships: nestedValueObjectRelationships.value,
              queryState: collectionQueryState.value,
              selectionState: collectionSelectionState.value,
            },
        actionFeedbackState: actionFeedbackState.value,
        fragmentOrigin,
      });
  const sourcePlan = issues.length > 0
    || rootDir == null
    || componentPath == null
    || className.value == null
    ? null
    : appBuilderLocalViewModelStateSourcePlan({
        rootDir,
        componentPath,
        className: className.value,
        fields: localFields,
        valueSets,
        fieldValueSetSelections,
        fieldObjectStates,
        collectionState: domain.value == null
          ? null
          : {
              domain: domain.value,
              seedRecords: seedRecords.value,
              mutableFieldNames: collectionMutableFieldNames,
              referenceRelationships: referenceRelationships.value,
              ownedRelationships: ownedRelationships.value,
              nestedValueObjectRelationships: nestedValueObjectRelationships.value,
              queryState: collectionQueryState.value,
              selectionState: collectionSelectionState.value,
        },
        actionFeedbackState: actionFeedbackState.value,
        fragmentOrigin,
      });
  return {
    targetRef,
    componentPath,
    className: className.value,
    statePolicy: statePolicy.value,
    fields: localFields,
    fieldObjectStates,
    domain: domain.value,
    seedRecords: seedRecords.value,
    typeScriptTopLevelFragments: fragments.typeScriptTopLevelFragments,
    classMemberFragments: fragments.classMemberFragments,
    preflightRow: frame.preflightRow,
    ...(request.includePreflight === true && frame.preflight != null ? { preflight: frame.preflight } : {}),
    sourceLoweringTargetRefs: frame.sourceLoweringTargetRefs,
    effectContractIds: frame.effectContractIds,
    expectedEffectKinds: [],
    expectedEffects: [],
    sourcePlan,
    issues,
  };
}

function sourceLoweringTargetFragmentOrigin(
  targetRef: AppBuilderOntologyRowRef,
  surfaceKind: AppBuilderSourceLoweringSurfaceKind,
): AppBuilderSourceFragmentOrigin {
  return {
    kind: AppBuilderSourceFragmentOriginKind.SourceLoweringTarget,
    targetKind: targetRef.kind,
    targetId: targetRef.id,
    surfaceKind,
  };
}

function appBuilderLocalViewModelFieldsForNames(
  fields: readonly AppBuilderDomainFieldDescriptor[],
  fieldNames: readonly string[] | null,
): readonly AppBuilderDomainFieldDescriptor[] {
  if (fieldNames == null) {
    return fields;
  }
  const fieldNameSet = new Set(fieldNames);
  return fields.filter((field) => fieldNameSet.has(field.name));
}

function localViewModelCollectionQueryState(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderLocalViewModelCollectionQueryStateSourceModel | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (domain == null) {
    return { value: null, issues: [] };
  }
  const queryFeatures = appBuilderSourceLoweringCollectionQueryFeaturePayloads(suppliedInputs);
  const localFilteringFeatures = queryFeatures
    .filter((feature) => feature.featureId === AppBuilderCollectionFeatureId.LocalFiltering);
  const localPaginationFeatures = queryFeatures
    .filter((feature) => feature.featureId === AppBuilderCollectionFeatureId.LocalPagination);
  if (localFilteringFeatures.length === 0 && localPaginationFeatures.length === 0) {
    return { value: null, issues: [] };
  }

  const filter = localViewModelCollectionFilterQueryState(targetRef, domain, localFilteringFeatures, suppliedInputs);
  const pagination = localViewModelCollectionPaginationQueryState(targetRef, domain, localPaginationFeatures, filter.value);
  const issues = [...filter.issues, ...pagination.issues];
  if (issues.length > 0) {
    return { value: null, issues };
  }
  const value = filter.value == null && pagination.value == null
    ? null
    : {
        filter: filter.value,
        pagination: pagination.value,
      };
  return { value, issues: [] };
}

function localViewModelCollectionFilterQueryState(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor,
  localFilteringFeatures: readonly AppBuilderCollectionQueryFeatureSelectionPayload[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderLocalViewModelCollectionFilterQueryStateSourceModel | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (localFilteringFeatures.length === 0) {
    return { value: null, issues: [] };
  }

  const selectedFeatureFieldNames = uniqueValues(localFilteringFeatures
    .flatMap((feature) => feature.fieldNames ?? [])
    .map((fieldName) => normalizedSourceInputText(fieldName))
    .filter((fieldName): fieldName is string => fieldName != null));
  const filterableColumnFieldNames = uniqueValues(appBuilderSourceLoweringCollectionTableColumnPayloads(suppliedInputs)
    .filter((column) => column.filterable === true)
    .map((column) => normalizedSourceInputText(column.fieldName))
    .filter((fieldName): fieldName is string => fieldName != null));
  const requestedFieldNames = selectedFeatureFieldNames.length > 0
    ? selectedFeatureFieldNames
    : filterableColumnFieldNames;

  if (requestedFieldNames.length === 0) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalFiltering],
        summary: 'Local view-model collection filtering needs CollectionQueryFeatures.fieldNames or filterable CollectionTableColumns rows so query state can be tied to concrete domain fields.',
      }],
    };
  }

  const domainFieldNames = new Set(domain.fields.map((field) => field.name));
  const unknownFieldNames = requestedFieldNames.filter((fieldName) => !domainFieldNames.has(fieldName));
  const filterFieldNames = requestedFieldNames.filter((fieldName) => domainFieldNames.has(fieldName));
  const filterMemberName = localViewModelCollectionFilterMemberName(domain, filterFieldNames);
  const filteredCollectionMemberName = `filtered${appBuilderPascalCase(domain.collectionMemberName)}`;
  const invalidGeneratedMembers = [filterMemberName, filteredCollectionMemberName]
    .filter((memberName) => !appBuilderIsTypeScriptIdentifier(memberName));

  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (unknownFieldNames.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
      fieldNames: unknownFieldNames,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalFiltering],
      summary: `Local view-model collection filtering selected field(s) outside '${domain.entityTypeName}': ${unknownFieldNames.join(', ')}.`,
    });
  }
  if (filterFieldNames.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
      fieldNames: requestedFieldNames,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalFiltering],
      summary: `Local view-model collection filtering has no source-spendable field for '${domain.entityTypeName}'.`,
    });
  }
  if (invalidGeneratedMembers.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
      fieldNames: filterFieldNames,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalFiltering],
      summary: `Local view-model collection filtering would generate invalid TypeScript member(s): ${invalidGeneratedMembers.join(', ')}.`,
    });
  }

  if (issues.length > 0) {
    return { value: null, issues };
  }
  return {
    value: {
      filterMemberName,
      filteredCollectionMemberName,
      filterFieldNames,
    },
    issues: [],
  };
}

function localViewModelCollectionPaginationQueryState(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor,
  localPaginationFeatures: readonly AppBuilderCollectionQueryFeatureSelectionPayload[],
  filterState: AppBuilderLocalViewModelCollectionFilterQueryStateSourceModel | null,
): {
  readonly value: AppBuilderLocalViewModelCollectionPaginationQueryStateSourceModel | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (localPaginationFeatures.length === 0) {
    return { value: null, issues: [] };
  }
  if (localPaginationFeatures.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
        summary: `Local view-model collection pagination received ${localPaginationFeatures.length} CollectionQueryFeatures rows; supply exactly one local pagination row for this first-ring lowerer.`,
      }],
    };
  }
  const feature = localPaginationFeatures[0]!;
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (feature.pageSize == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      summary: 'Local view-model collection pagination needs CollectionQueryFeatures.pageSize; app-builder will not invent page size.',
    });
  }
  const collectionName = appBuilderPascalCase(domain.collectionMemberName);
  const currentPageMemberName = `${domain.collectionMemberName}Page`;
  const pageSizeMemberName = `${domain.collectionMemberName}PageSize`;
  const pageCountMemberName = `${domain.collectionMemberName}PageCount`;
  const paginatedCollectionMemberName = `paged${collectionName}`;
  const sourceCollectionMemberName = filterState?.filteredCollectionMemberName ?? domain.collectionMemberName;
  const previousPageMethodName = `previous${collectionName}Page`;
  const nextPageMethodName = `next${collectionName}Page`;
  const generatedMemberNames = [
    currentPageMemberName,
    pageSizeMemberName,
    pageCountMemberName,
    paginatedCollectionMemberName,
    sourceCollectionMemberName,
    previousPageMethodName,
    nextPageMethodName,
  ];
  const invalidGeneratedMembers = generatedMemberNames
    .filter((memberName) => !appBuilderIsTypeScriptIdentifier(memberName));
  if (invalidGeneratedMembers.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      summary: `Local view-model collection pagination would generate invalid TypeScript member(s): ${invalidGeneratedMembers.join(', ')}.`,
    });
  }
  if (issues.length > 0 || feature.pageSize == null) {
    return { value: null, issues };
  }
  return {
    value: {
      currentPageMemberName,
      pageSizeMemberName,
      pageCountMemberName,
      paginatedCollectionMemberName,
      sourceCollectionMemberName,
      previousPageMethodName,
      nextPageMethodName,
      pageSize: feature.pageSize,
      ...(feature.initialPage == null ? {} : { initialPage: feature.initialPage }),
    },
    issues: [],
  };
}

function localViewModelCollectionSelectionState(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderLocalViewModelCollectionSelectionStateSourceModel | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (domain == null) {
    return { value: null, issues: [] };
  }
  const rowSelectionFeatures = appBuilderSourceLoweringCollectionQueryFeaturePayloads(suppliedInputs)
    .filter((feature) => feature.featureId === AppBuilderCollectionFeatureId.RowSelection);
  if (rowSelectionFeatures.length === 0) {
    return { value: null, issues: [] };
  }
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (rowSelectionFeatures.length > 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: `Local view-model collection row selection received ${rowSelectionFeatures.length} CollectionQueryFeatures rows; supply exactly one local row-selection row for this first-ring lowerer.`,
    });
  }

  const identityPolicies = appBuilderSourceLoweringCollectionIdentityPolicyPayloads(suppliedInputs)
    .filter(collectionIdentityPolicyAppliesToRowSelection);
  if (identityPolicies.length !== 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: identityPolicies.length === 0
        ? 'Local view-model collection row selection needs one CollectionIdentityPolicy payload with mode scalar-field; app-builder will not infer a stable key for selection.'
        : `Local view-model collection row selection received ${identityPolicies.length} applicable CollectionIdentityPolicy payloads; supply exactly one for this first-ring lowerer.`,
    });
  }
  const identityPolicy = identityPolicies.length === 1 ? identityPolicies[0]! : null;
  if (identityPolicy != null && identityPolicy.mode !== AppBuilderCollectionIdentityMode.ScalarField) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: `Local view-model collection row selection currently lowers only scalar-field identity; '${identityPolicy.mode}' remains deferred for richer selection policy.`,
    });
  }

  const identityFieldName = normalizedSourceInputText(identityPolicy?.fieldName) ?? domain.identityMemberName;
  if (identityFieldName !== domain.identityMemberName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
      fieldNames: [identityFieldName, domain.identityMemberName],
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: `Local view-model collection row selection currently lowers only the domain identity member '${domain.identityMemberName}'; custom scalar field '${identityFieldName}' remains deferred.`,
    });
  }

  const entityName = appBuilderPascalCase(domain.entityTypeName);
  const selectedIdentityMemberName = `selected${entityName}Ids`;
  const toggleSelectionMethodName = `toggle${entityName}Selection`;
  const invalidGeneratedMembers = [selectedIdentityMemberName, toggleSelectionMethodName]
    .filter((memberName) => !appBuilderIsTypeScriptIdentifier(memberName));
  if (invalidGeneratedMembers.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: `Local view-model collection row selection would generate invalid TypeScript member(s): ${invalidGeneratedMembers.join(', ')}.`,
    });
  }

  if (issues.length > 0 || identityPolicy == null || identityPolicy.mode !== AppBuilderCollectionIdentityMode.ScalarField) {
    return { value: null, issues };
  }
  return {
    value: {
      selectedIdentityMemberName,
      identityMemberName: domain.identityMemberName,
      identityValueKind: domain.identityValueKind,
      toggleSelectionMethodName,
    },
    issues: [],
  };
}

function collectionIdentityPolicyAppliesToRowSelection(
  identityPolicy: AppBuilderSourceLoweringCollectionIdentityPolicyPayload,
): boolean {
  return identityPolicy.requiredBy == null
    || identityPolicy.requiredBy.length === 0
    || identityPolicy.requiredBy.includes(AppBuilderCollectionIdentityUse.RowSelection)
    || identityPolicy.requiredBy.includes(AppBuilderCollectionIdentityUse.BatchAction);
}

function localViewModelCollectionFilterMemberName(
  domain: AppBuilderDomainDescriptor,
  filterFieldNames: readonly string[],
): string {
  if (filterFieldNames.length === 1) {
    return `${filterFieldNames[0]}Filter`;
  }
  return `${domain.collectionMemberName}Filter`;
}

export function appBuilderExpectedEffectsForSourcePlan(
  sourcePlan: SourcePlan | null,
  readExpectedEffects: (sourcePlan: SourcePlan) => readonly ExpectedSemanticEffect[],
): readonly ExpectedSemanticEffect[] {
  return sourcePlan == null ? [] : readExpectedEffects(sourcePlan);
}

interface DirectSourcePlanTargetIssueDescriptor {
  readonly targetDisplayName: string;
  readonly directLoweringDisplayName: string;
  readonly supportedApplicationPatternDisplayName: string;
  readonly missingTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind;
  readonly unknownTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind;
  readonly unsupportedTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind;
  readonly sourceLoweringNotImplementedIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind;
  readonly missingRequiredInputIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind;
  readonly invalidSuppliedPayloadIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind;
  readonly supportsTarget: (targetRef: AppBuilderOntologyRowRef) => boolean;
}

/** Shared admission envelope for direct SourcePlan targets before target-specific inputs are lowered. */
interface DirectSourcePlanTargetFrame {
  readonly targetRef: AppBuilderOntologyRowRef | null;
  readonly preflight: AppBuilderSourceLoweringPreflight | null;
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

const APP_SHELL_SOURCE_PLAN_TARGET_ISSUES: DirectSourcePlanTargetIssueDescriptor = {
  targetDisplayName: 'AppShell',
  directLoweringDisplayName: 'AppShell',
  supportedApplicationPatternDisplayName: 'AppShell',
  missingTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingAppShellTargetRef,
  unknownTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnknownAppShellTarget,
  unsupportedTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedAppShellTarget,
  sourceLoweringNotImplementedIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringAppShellNotImplemented,
  missingRequiredInputIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AppShellMissingRequiredInput,
  invalidSuppliedPayloadIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AppShellInvalidSuppliedPayload,
  supportsTarget: isAppShellTargetRef,
};

const APPLICATION_ASSEMBLY_SOURCE_PLAN_TARGET_ISSUES: DirectSourcePlanTargetIssueDescriptor = {
  targetDisplayName: 'ApplicationAssembly',
  directLoweringDisplayName: 'application assembly',
  supportedApplicationPatternDisplayName: 'ApplicationAssembly',
  missingTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingApplicationAssemblyTargetRef,
  unknownTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnknownApplicationAssemblyTarget,
  unsupportedTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedApplicationAssemblyTarget,
  sourceLoweringNotImplementedIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringApplicationAssemblyNotImplemented,
  missingRequiredInputIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.ApplicationAssemblyMissingRequiredInput,
  invalidSuppliedPayloadIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.ApplicationAssemblyInvalidSuppliedPayload,
  supportsTarget: isApplicationAssemblyTargetRef,
};

const ROUTER_BACKED_LIST_DETAIL_SOURCE_PLAN_TARGET_ISSUES: DirectSourcePlanTargetIssueDescriptor = {
  targetDisplayName: 'RouterBackedListDetail',
  directLoweringDisplayName: 'router-backed list/detail',
  supportedApplicationPatternDisplayName: 'RouterBackedListDetail',
  missingTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingRouterBackedListDetailTargetRef,
  unknownTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnknownRouterBackedListDetailTarget,
  unsupportedTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedRouterBackedListDetailTarget,
  sourceLoweringNotImplementedIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringRouterBackedListDetailNotImplemented,
  missingRequiredInputIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingRequiredInput,
  invalidSuppliedPayloadIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidSuppliedPayload,
  supportsTarget: isRouterBackedListDetailTargetRef,
};

const DI_STATE_CLASS_SOURCE_PLAN_TARGET_ISSUES: DirectSourcePlanTargetIssueDescriptor = {
  targetDisplayName: 'DiStateClass',
  directLoweringDisplayName: 'DI state-class',
  supportedApplicationPatternDisplayName: 'DiStateClass',
  missingTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingDiStateClassTargetRef,
  unknownTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnknownDiStateClassTarget,
  unsupportedTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedDiStateClassTarget,
  sourceLoweringNotImplementedIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringDiStateClassNotImplemented,
  missingRequiredInputIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.DiStateClassMissingRequiredInput,
  invalidSuppliedPayloadIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.DiStateClassInvalidSuppliedPayload,
  supportsTarget: isDiStateClassTargetRef,
};

const LOCAL_VIEW_MODEL_STATE_SOURCE_PLAN_TARGET_ISSUES: DirectSourcePlanTargetIssueDescriptor = {
  targetDisplayName: 'LocalViewModelState',
  directLoweringDisplayName: 'local view-model state',
  supportedApplicationPatternDisplayName: 'LocalViewModelState',
  missingTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingLocalViewModelStateTargetRef,
  unknownTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnknownLocalViewModelStateTarget,
  unsupportedTargetIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedLocalViewModelStateTarget,
  sourceLoweringNotImplementedIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringLocalViewModelStateNotImplemented,
  missingRequiredInputIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateMissingRequiredInput,
  invalidSuppliedPayloadIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidSuppliedPayload,
  supportsTarget: isLocalViewModelStateTargetRef,
};

export function directSourcePlanTargetFrame(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  includeInputDependencies: boolean,
  descriptor: DirectSourcePlanTargetIssueDescriptor,
): DirectSourcePlanTargetFrame {
  const preflight = targetRef == null
    ? null
    : appBuilderSourceLoweringPreflight({
        targetRefs: [targetRef],
        suppliedInputs,
        includeInputDependencies,
      });
  const preflightRow = preflight?.rows[0] ?? null;
  const sourceLoweringTargetRefs = targetRef == null || !descriptor.supportsTarget(targetRef) ? [] : [targetRef];
  return {
    targetRef,
    preflight,
    preflightRow,
    sourceLoweringTargetRefs,
    effectContractIds: sourceLoweringTargetRefs.length === 0
      ? []
      : appBuilderEffectContractIdsForTargetRef(sourceLoweringTargetRefs[0]!),
    issues: directSourcePlanTargetIssues(targetRef, preflightRow, descriptor),
  };
}

function directSourcePlanTargetIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  preflightRow: AppBuilderSourceLoweringPreflightRow | null,
  descriptor: DirectSourcePlanTargetIssueDescriptor,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  if (targetRef == null) {
    return [{
      issueKind: descriptor.missingTargetIssueKind,
      summary: `Direct ${descriptor.directLoweringDisplayName} SourcePlan lowering requires the exact ${descriptor.targetDisplayName} targetRef selected from target-catalog or source-lowering-preflight.`,
    }];
  }
  if (preflightRow == null) {
    return [{
      issueKind: descriptor.unknownTargetIssueKind,
      targetRef,
      summary: `Direct ${descriptor.directLoweringDisplayName} SourcePlan lowering does not know target '${targetRef.kind}:${targetRef.id}'.`,
    }];
  }
  if (!descriptor.supportsTarget(targetRef)) {
    return [{
      issueKind: descriptor.unsupportedTargetIssueKind,
      targetRef,
      summary: `Direct ${descriptor.directLoweringDisplayName} SourcePlan lowering only supports the ${descriptor.supportedApplicationPatternDisplayName} application pattern, not '${targetRef.kind}:${targetRef.id}'.`,
    }];
  }
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (!appBuilderTargetSupportsSourceLoweringSurface(targetRef, AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview)) {
    issues.push({
      issueKind: descriptor.sourceLoweringNotImplementedIssueKind,
      targetRef,
      summary: `${descriptor.targetDisplayName} target '${targetRef.kind}:${targetRef.id}' does not expose the '${AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview}' source-lowering surface.`,
    });
  }
  if (preflightRow.sourceLoweringAvailability !== AppBuilderSourceLoweringAvailability.SourceLoweringImplemented) {
    issues.push({
      issueKind: descriptor.sourceLoweringNotImplementedIssueKind,
      targetRef,
      summary: `${descriptor.targetDisplayName} target '${targetRef.kind}:${targetRef.id}' has source availability '${preflightRow.sourceLoweringAvailability}', not source-lowering-implemented SourcePlan lowering.`,
    });
  }
  if (preflightRow.inputGateState === AppBuilderSourceLoweringInputGateState.MissingRequiredInput) {
    issues.push({
      issueKind: descriptor.missingRequiredInputIssueKind,
      targetRef,
      summary: `${descriptor.targetDisplayName} target '${targetRef.kind}:${targetRef.id}' is missing required input facets: ${preflightRow.inputReadiness.missingRequiredInputFacetIds.join(', ')}.`,
    });
  }
  if (preflightRow.inputGateState === AppBuilderSourceLoweringInputGateState.InvalidSuppliedPayload) {
    issues.push({
      issueKind: descriptor.invalidSuppliedPayloadIssueKind,
      targetRef,
      summary: `${descriptor.targetDisplayName} target '${targetRef.kind}:${targetRef.id}' has ${preflightRow.inputReadiness.invalidPayloadCount} invalid supplied payload(s).`,
    });
  }
  issues.push(...directTargetRequirementIssues(preflightRow));
  return issues;
}

function directTargetRequirementIssues(
  preflightRow: AppBuilderSourceLoweringPreflightRow,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return preflightRow.targetRequirementIssues.map((issue): AppBuilderSourceLoweringSourcePlanIssue => ({
    issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.TargetRequirementIssue,
    targetRef: preflightRow.targetRef,
    inputFacetId: issue.inputFacetId,
    sourceLoweringPreflightIssue: issue,
    summary: issue.summary,
  }));
}

function materializeRouterBackedListDetailDomain(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  primaryEntityName: string | null,
): {
  readonly value: AppBuilderDomainDescriptor | null;
  readonly entityName: string | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  return materializeSourcePlanDomain(targetRef, suppliedInputs, {
    target: ROUTER_BACKED_LIST_DETAIL_DOMAIN_MATERIALIZATION_TARGET,
    targetTitle: 'Router-backed list/detail',
    missingSummary: 'Router-backed list/detail lowering requires one DomainEntities payload with entityTitle, identityValueKind, and optional explicit source names.',
    ambiguousSummary: (count) => `Router-backed list/detail lowering received ${count} domain entity payloads; supply exactly one for this first-ring source plan.`,
    allowRelationshipPrimaryEntity: true,
    explicitEntityName: primaryEntityName,
    invalidExplicitEntityNameIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidPrimaryDomainEntity,
  });
}

function materializeDiStateClassDomain(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderDomainDescriptor | null;
  readonly entityName: string | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  return materializeSourcePlanDomain(targetRef, suppliedInputs, {
    target: DI_STATE_CLASS_DOMAIN_MATERIALIZATION_TARGET,
    targetTitle: 'DI state-class',
    missingSummary: 'DI state-class lowering requires one DomainEntities payload with entityTitle, identityValueKind, and optional explicit source names.',
    ambiguousSummary: (count) => `DI state-class lowering received ${count} domain entity payloads; supply exactly one for this first-ring source plan.`,
  });
}

function materializeLocalViewModelCollectionDomain(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderDomainDescriptor | null;
  readonly entityName: string | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  return materializeSourcePlanDomain(targetRef, suppliedInputs, {
    target: LOCAL_VIEW_MODEL_COLLECTION_DOMAIN_MATERIALIZATION_TARGET,
    targetTitle: 'Local view-model collection',
    missingSummary: 'Local view-model collection lowering requires one DomainEntities payload with entityTitle, identityValueKind, and optional explicit source names.',
    ambiguousSummary: (count) => `Local view-model collection lowering received ${count} domain entity payloads; supply exactly one for this local collection source plan.`,
    allowRelationshipPrimaryEntity: true,
    ambiguousRelationshipPrimaryEntityIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateAmbiguousRelationshipPrimaryEntity,
    invalidRelationshipEntityIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipEntity,
  });
}

function materializeSourcePlanDomain(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  options: {
    readonly target: AppBuilderDomainMaterializationTarget;
    readonly targetTitle: string;
    readonly missingSummary: string;
    readonly ambiguousSummary: (count: number) => string;
    readonly allowRelationshipPrimaryEntity?: boolean;
    readonly explicitEntityName?: string | null;
    readonly invalidExplicitEntityNameIssueKind?: AppBuilderSourceLoweringSourcePlanIssueKind;
    readonly ambiguousRelationshipPrimaryEntityIssueKind?: AppBuilderSourceLoweringSourcePlanIssueKind;
    readonly invalidRelationshipEntityIssueKind?: AppBuilderSourceLoweringSourcePlanIssueKind;
  },
): {
  readonly value: AppBuilderDomainDescriptor | null;
  readonly entityName: string | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  if (entities.length === 0) {
    return {
      value: null,
      entityName: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingDomainEntity,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainEntities,
        summary: options.missingSummary,
      }],
    };
  }

  const selectedEntity = selectSourcePlanDomainEntity(
    targetRef,
    suppliedInputs,
    entities,
    options,
  );
  if (selectedEntity.value == null) {
    return { value: null, entityName: null, issues: selectedEntity.issues };
  }

  const entity = selectedEntity.value;
  const fields = sourcePlanDomainFieldsForEntity(
    appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs),
    selectedEntity.entityName,
    entities.length,
  );
  const assignments: AppBuilderDomainSlotAssignment[] = [
    { key: AppBuilderDomainSlotKey.EntityTitle, value: entity.entityTitle },
    ...(entity.entityTypeName == null ? [] : [{ key: AppBuilderDomainSlotKey.EntityTypeName, value: entity.entityTypeName } satisfies AppBuilderDomainSlotAssignment]),
    ...(entity.collectionMemberName == null ? [] : [{ key: AppBuilderDomainSlotKey.CollectionMemberName, value: entity.collectionMemberName } satisfies AppBuilderDomainSlotAssignment]),
    ...(entity.identityMemberName == null ? [] : [{ key: AppBuilderDomainSlotKey.IdentityMemberName, value: entity.identityMemberName } satisfies AppBuilderDomainSlotAssignment]),
    ...(entity.identityValueKind == null ? [] : [{ key: AppBuilderDomainSlotKey.IdentityValueKind, value: entity.identityValueKind } satisfies AppBuilderDomainSlotAssignment]),
    { key: AppBuilderDomainSlotKey.FieldSchema, value: fields },
  ];
  const materialized = materializeAppBuilderCallerDomainForTarget(
    options.target,
    assignments,
  );
  if (isDomainMaterializationIssueArray(materialized)) {
    return {
      value: null,
      entityName: null,
      issues: materialized.map((issue) => ({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.DomainMaterializationIssue,
        targetRef: targetRef ?? undefined,
        inputFacetId: issue.slotKey === AppBuilderDomainSlotKey.FieldSchema
          ? AppBuilderInputFacetId.DomainFields
          : AppBuilderInputFacetId.DomainEntities,
        domainMaterializationIssue: issue,
        summary: `${options.targetTitle} domain input could not materialize: ${issue.summary}`,
      })),
    };
  }
  return { value: materialized, entityName: selectedEntity.entityName, issues: [] };
}

function routerBackedListDetailReferenceRelationships(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipSource[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (primaryDomain == null) {
    return { value: [], issues: [] };
  }
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  if (relationships.length === 0) {
    return { value: [], issues: [] };
  }

  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const allFields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const relationshipSources: AppBuilderRoutedCollectionDetailReferenceRelationshipSource[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const relationship of relationships) {
    if (
      relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceOne
      && relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceMany
    ) {
      continue;
    }
    if (relationship.fromEntityName != null && relationship.fromEntityName !== primaryDomain.entityTypeName) {
      continue;
    }
    const relationshipIssues = routerBackedListDetailReferenceRelationshipIssues(
      targetRef,
      primaryDomain,
      relationship,
    );
    if (relationshipIssues.length > 0) {
      issues.push(...relationshipIssues);
      continue;
    }
    const relatedEntity = entities.find((entity) => domainEntityPayloadName(entity) === relationship.toEntityName) ?? null;
    if (relatedEntity == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipEntity,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' targets entity '${relationship.toEntityName}', but no matching DomainEntities payload exists.`,
      });
      continue;
    }
    const relatedDomain = materializeDomainForEntityPayload(
      relatedEntity,
      sourcePlanDomainFieldsForEntity(allFields, relationship.toEntityName, entities.length),
      ROUTER_BACKED_LIST_DETAIL_DOMAIN_MATERIALIZATION_TARGET,
    );
    if (isDomainMaterializationIssueArray(relatedDomain)) {
      issues.push(...relatedDomain.map((issue) => ({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.DomainMaterializationIssue,
        targetRef: targetRef ?? undefined,
        inputFacetId: issue.slotKey === AppBuilderDomainSlotKey.FieldSchema
          ? AppBuilderInputFacetId.DomainFields
          : AppBuilderInputFacetId.DomainEntities,
        domainMaterializationIssue: issue,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' target entity '${relationship.toEntityName}' could not materialize: ${issue.summary}`,
      } satisfies AppBuilderSourceLoweringSourcePlanIssue)));
      continue;
    }
    const materializedRelationshipIssues = routerBackedListDetailMaterializedRelationshipIssues(
      targetRef,
      primaryDomain,
      relatedDomain,
      relationship,
    );
    if (materializedRelationshipIssues.length > 0) {
      issues.push(...materializedRelationshipIssues);
      continue;
    }
    const relatedSeedRecords = appBuilderSourceLoweringSeedRecordsForEntity(suppliedInputs, relatedDomain.entityTypeName);
    issues.push(...seedRecordIdentityIssues(
      targetRef,
      relatedDomain,
      relatedSeedRecords,
      `relationship '${relationship.name}' related collection initialization`,
    ).map((issue) => ({
      ...issue,
      relationshipNames: [relationship.name],
    })));
    relationshipSources.push({
      relationship,
      relatedDomain,
      seedDataSet: seedDataSetForRecords(
        relatedSeedRecords,
        `Caller-supplied ${relatedDomain.entityTitle} seed records`,
        `Caller-supplied seed records for relationship '${relationship.name}'.`,
      ),
    });
  }
  return { value: relationshipSources, issues };
}

function routerBackedListDetailOwnedRelationships(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor | null,
  primarySeedRecords: readonly AppBuilderSeedRecord[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderRoutedCollectionDetailOwnedRelationshipSource[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (primaryDomain == null) {
    return { value: [], issues: [] };
  }
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  if (relationships.length === 0) {
    return { value: [], issues: [] };
  }

  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const allFields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const relationshipSources: AppBuilderRoutedCollectionDetailOwnedRelationshipSource[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const relationship of relationships) {
    if (
      relationship.kind !== AppBuilderDomainRelationshipKind.OwnsOne
      && relationship.kind !== AppBuilderDomainRelationshipKind.OwnsMany
    ) {
      continue;
    }
    if (relationship.fromEntityName != null && relationship.fromEntityName !== primaryDomain.entityTypeName) {
      continue;
    }
    const relationshipIssues = routerBackedListDetailOwnedRelationshipIssues(
      targetRef,
      primaryDomain,
      relationship,
    );
    if (relationshipIssues.length > 0) {
      issues.push(...relationshipIssues);
      continue;
    }
    const ownedEntity = entities.find((entity) => domainEntityPayloadName(entity) === relationship.toEntityName) ?? null;
    if (ownedEntity == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipEntity,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' owns entity '${relationship.toEntityName}', but no matching DomainEntities payload exists.`,
      });
      continue;
    }
    const ownedDomain = materializeDomainForEntityPayload(
      ownedEntity,
      sourcePlanDomainFieldsForEntity(allFields, relationship.toEntityName, entities.length),
      ROUTER_BACKED_LIST_DETAIL_DOMAIN_MATERIALIZATION_TARGET,
    );
    if (isDomainMaterializationIssueArray(ownedDomain)) {
      issues.push(...ownedDomain.map((issue) => ({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.DomainMaterializationIssue,
        targetRef: targetRef ?? undefined,
        inputFacetId: issue.slotKey === AppBuilderDomainSlotKey.FieldSchema
          ? AppBuilderInputFacetId.DomainFields
          : AppBuilderInputFacetId.DomainEntities,
        domainMaterializationIssue: issue,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' owned entity '${relationship.toEntityName}' could not materialize: ${issue.summary}`,
      } satisfies AppBuilderSourceLoweringSourcePlanIssue)));
      continue;
    }
    const materializedRelationshipIssues = routerBackedListDetailMaterializedOwnedRelationshipIssues(
      targetRef,
      ownedDomain,
      relationship,
      primarySeedRecords,
    );
    if (materializedRelationshipIssues.length > 0) {
      issues.push(...materializedRelationshipIssues);
      continue;
    }
    relationshipSources.push({
      relationship,
      ownedDomain,
    });
  }
  return { value: relationshipSources, issues };
}

function routerBackedListDetailNestedValueObjectRelationships(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor | null,
  primarySeedRecords: readonly AppBuilderSeedRecord[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipSource[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (primaryDomain == null) {
    return { value: [], issues: [] };
  }
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs)
    .filter((relationship) => relationship.kind === AppBuilderDomainRelationshipKind.NestedValueObject);
  if (relationships.length === 0) {
    return { value: [], issues: [] };
  }

  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const allFields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const relationshipSources: AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipSource[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const relationship of relationships) {
    if (relationship.fromEntityName != null && relationship.fromEntityName !== primaryDomain.entityTypeName) {
      continue;
    }
    const fields = sourcePlanDomainFieldsForEntity(allFields, relationship.toEntityName, Math.max(2, entities.length + 1));
    const relationshipIssues = routerBackedListDetailNestedValueObjectRelationshipIssues(
      targetRef,
      primaryDomain,
      relationship,
      fields,
      primarySeedRecords,
    );
    if (relationshipIssues.length > 0) {
      issues.push(...relationshipIssues);
      continue;
    }
    relationshipSources.push({
      relationship,
      fields,
    });
  }
  return { value: relationshipSources, issues };
}

function localViewModelCollectionReferenceRelationships(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderLocalViewModelReferenceRelationshipSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (primaryDomain == null) {
    return { value: [], issues: [] };
  }
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  if (relationships.length === 0) {
    return { value: [], issues: [] };
  }

  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const allFields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const relationshipSources: AppBuilderLocalViewModelReferenceRelationshipSourceModel[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const relationship of relationships) {
    if (
      relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceOne
      && relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceMany
    ) {
      continue;
    }
    const relationshipIssues = localViewModelReferenceRelationshipIssues(
      targetRef,
      primaryDomain,
      relationship,
    );
    if (relationshipIssues.length > 0) {
      issues.push(...relationshipIssues);
      continue;
    }
    const relatedEntity = entities.find((entity) => domainEntityPayloadName(entity) === relationship.toEntityName) ?? null;
    if (relatedEntity == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipEntity,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' targets entity '${relationship.toEntityName}', but no matching DomainEntities payload exists.`,
      });
      continue;
    }
    const relatedDomain = materializeDomainForEntityPayload(
      relatedEntity,
      sourcePlanDomainFieldsForEntity(allFields, relationship.toEntityName, entities.length),
      LOCAL_VIEW_MODEL_COLLECTION_DOMAIN_MATERIALIZATION_TARGET,
    );
    if (isDomainMaterializationIssueArray(relatedDomain)) {
      issues.push(...relatedDomain.map((issue) => ({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.DomainMaterializationIssue,
        targetRef: targetRef ?? undefined,
        inputFacetId: issue.slotKey === AppBuilderDomainSlotKey.FieldSchema
          ? AppBuilderInputFacetId.DomainFields
          : AppBuilderInputFacetId.DomainEntities,
        domainMaterializationIssue: issue,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' target entity '${relationship.toEntityName}' could not materialize: ${issue.summary}`,
      } satisfies AppBuilderSourceLoweringSourcePlanIssue)));
      continue;
    }
    const materializedRelationshipIssues = localViewModelMaterializedRelationshipIssues(
      targetRef,
      primaryDomain,
      relatedDomain,
      relationship,
    );
    if (materializedRelationshipIssues.length > 0) {
      issues.push(...materializedRelationshipIssues);
      continue;
    }
    const relatedSeedRecords = appBuilderSourceLoweringSeedRecordsForEntity(suppliedInputs, relatedDomain.entityTypeName);
    issues.push(...seedRecordIdentityIssues(
      targetRef,
      relatedDomain,
      relatedSeedRecords,
      `relationship '${relationship.name}' related local collection initialization`,
    ).map((issue) => ({
      ...issue,
      relationshipNames: [relationship.name],
    })));
    relationshipSources.push({
      relationship,
      relatedDomain,
      seedRecords: relatedSeedRecords,
    });
  }
  return { value: relationshipSources, issues };
}

function localViewModelCollectionOwnedRelationships(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor | null,
  primarySeedRecords: readonly AppBuilderSeedRecord[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderLocalViewModelOwnedRelationshipSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (primaryDomain == null) {
    return { value: [], issues: [] };
  }
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  if (relationships.length === 0) {
    return { value: [], issues: [] };
  }

  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const allFields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const relationshipSources: AppBuilderLocalViewModelOwnedRelationshipSourceModel[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const relationship of relationships) {
    if (
      relationship.kind === AppBuilderDomainRelationshipKind.ReferenceOne
      || relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany
      || relationship.kind === AppBuilderDomainRelationshipKind.NestedValueObject
    ) {
      continue;
    }
    const relationshipIssues = localViewModelOwnedRelationshipIssues(
      targetRef,
      primaryDomain,
      relationship,
    );
    if (relationshipIssues.length > 0) {
      issues.push(...relationshipIssues);
      continue;
    }
    const ownedEntity = entities.find((entity) => domainEntityPayloadName(entity) === relationship.toEntityName) ?? null;
    if (ownedEntity == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipEntity,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' owns entity '${relationship.toEntityName}', but no matching DomainEntities payload exists.`,
      });
      continue;
    }
    const ownedDomain = materializeDomainForEntityPayload(
      ownedEntity,
      sourcePlanDomainFieldsForEntity(allFields, relationship.toEntityName, entities.length),
      LOCAL_VIEW_MODEL_COLLECTION_DOMAIN_MATERIALIZATION_TARGET,
    );
    if (isDomainMaterializationIssueArray(ownedDomain)) {
      issues.push(...ownedDomain.map((issue) => ({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.DomainMaterializationIssue,
        targetRef: targetRef ?? undefined,
        inputFacetId: issue.slotKey === AppBuilderDomainSlotKey.FieldSchema
          ? AppBuilderInputFacetId.DomainFields
          : AppBuilderInputFacetId.DomainEntities,
        domainMaterializationIssue: issue,
        relationshipNames: [relationship.name],
        summary: `Relationship '${relationship.name}' owned entity '${relationship.toEntityName}' could not materialize: ${issue.summary}`,
      } satisfies AppBuilderSourceLoweringSourcePlanIssue)));
      continue;
    }
    const materializedRelationshipIssues = localViewModelMaterializedOwnedRelationshipIssues(
      targetRef,
      ownedDomain,
      relationship,
      primarySeedRecords,
    );
    if (materializedRelationshipIssues.length > 0) {
      issues.push(...materializedRelationshipIssues);
      continue;
    }
    relationshipSources.push({
      relationship,
      ownedDomain,
    });
  }
  return { value: relationshipSources, issues };
}

function localViewModelCollectionNestedValueObjectRelationships(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor | null,
  primarySeedRecords: readonly AppBuilderSeedRecord[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderLocalViewModelNestedValueObjectRelationshipSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (primaryDomain == null) {
    return { value: [], issues: [] };
  }
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs)
    .filter((relationship) => relationship.kind === AppBuilderDomainRelationshipKind.NestedValueObject);
  if (relationships.length === 0) {
    return { value: [], issues: [] };
  }

  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const allFields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const relationshipSources: AppBuilderLocalViewModelNestedValueObjectRelationshipSourceModel[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const relationship of relationships) {
    const fields = sourcePlanDomainFieldsForEntity(allFields, relationship.toEntityName, Math.max(2, entities.length + 1));
    const relationshipIssues = localViewModelNestedValueObjectRelationshipIssues(
      targetRef,
      primaryDomain,
      relationship,
      fields,
      primarySeedRecords,
    );
    if (relationshipIssues.length > 0) {
      issues.push(...relationshipIssues);
      continue;
    }
    relationshipSources.push({
      relationship,
      fields,
    });
  }
  return { value: relationshipSources, issues };
}

function routerBackedListDetailMaterializedRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relatedDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const localField = primaryDomain.fields.find((field) => field.name === relationship.localFieldName) ?? null;
  const localValueKind = relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity;
  const displayField = relatedDomain.fields.find((field) => field.name === relationship.displayFieldName) ?? null;
  if (
    localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object
    && relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceOne
    && relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceMany
  ) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' uses localValueKind='${localValueKind}', but routed source currently lowers object-valued reference-one and reference-many relationships only.`,
    });
  }
  if (relationship.foreignFieldName !== relatedDomain.identityMemberName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' currently needs foreignFieldName='${relatedDomain.identityMemberName}' because first-ring router-backed reference-one source uses related identity lookup.`,
    });
  }
  if (displayField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' displayFieldName '${relationship.displayFieldName ?? ''}' is not present on related entity '${relatedDomain.entityTypeName}'.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Identity && localField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' localFieldName '${relationship.localFieldName ?? ''}' is not present on primary entity '${primaryDomain.entityTypeName}', but router-backed reference source needs a scalar local field.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object && (relationship.localFieldName == null || !appBuilderIsTypeScriptIdentifier(relationship.localFieldName))) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name a TypeScript-safe localFieldName for object-valued routed reference source.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object && localField != null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' uses object-valued local source, so localFieldName '${relationship.localFieldName ?? ''}' must describe a generated relationship member rather than an existing scalar domain field.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Identity && localField != null && !relationshipLocalFieldMatchesRelatedIdentity(localField, relatedDomain.identityValueKind, relationship.kind)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' local field '${localField.name}' has valueKind='${localField.valueKind}', which cannot hold a ${relatedDomain.identityValueKind} related identity in the first-ring router-backed reference-one lowerer.`,
    });
  }
  return issues;
}

function routerBackedListDetailOwnedRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (
    relationship.kind !== AppBuilderDomainRelationshipKind.OwnsOne
    && relationship.kind !== AppBuilderDomainRelationshipKind.OwnsMany
  ) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedRelationship,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Router-backed list/detail currently spends owned relationship '${relationship.name}' only when kind='${AppBuilderDomainRelationshipKind.OwnsOne}' or kind='${AppBuilderDomainRelationshipKind.OwnsMany}', not '${relationship.kind}'.`,
    });
  }
  if (relationship.fromEntityName !== primaryDomain.entityTypeName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name fromEntityName='${primaryDomain.entityTypeName}' for this router-backed primary entity.`,
    });
  }
  if (relationship.localFieldName == null || relationship.localFieldName.trim().length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name localFieldName so owned child source has a generated parent member.`,
    });
  } else if (primaryDomain.fields.some((field) => field.name === relationship.localFieldName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' localFieldName '${relationship.localFieldName}' conflicts with a scalar field on primary entity '${primaryDomain.entityTypeName}'.`,
    });
  }
  if (relationship.foreignFieldName != null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' is an owned relationship and should not supply foreignFieldName; owned children are nested values, not related identity lookups.`,
    });
  }
  if (relationship.displayFieldName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name displayFieldName so generated source does not invent owned-child label policy.`,
    });
  }
  return issues;
}

function routerBackedListDetailMaterializedOwnedRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  ownedDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
  primarySeedRecords: readonly AppBuilderSeedRecord[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const displayField = ownedDomain.fields.find((field) => field.name === relationship.displayFieldName) ?? null;
  if (displayField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' displayFieldName '${relationship.displayFieldName ?? ''}' is not present on owned entity '${ownedDomain.entityTypeName}'.`,
    });
  }
  if (relationship.localFieldName == null) {
    return issues;
  }
  for (const [recordIndex, record] of primarySeedRecords.entries()) {
    const value = record[relationship.localFieldName];
    if (relationship.kind === AppBuilderDomainRelationshipKind.OwnsOne) {
      if (value == null) {
        if (relationship.required === true) {
          issues.push({
            issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
            targetRef: targetRef ?? undefined,
            inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
            seedRecordIndex: recordIndex,
            relationshipNames: [relationship.name],
            summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be an owned child seed record because the relationship is required.`,
          });
        }
        continue;
      }
      if (!isSeedRecordObject(value)) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
          seedRecordIndex: recordIndex,
          relationshipNames: [relationship.name],
          summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be one child seed record or null for first-ring owns-one source.`,
        });
        continue;
      }
      issues.push(...seedRecordIdentityIssues(
        targetRef,
        ownedDomain,
        [value],
        `relationship '${relationship.name}' owned child initialization`,
      ).map((issue) => ({
        ...issue,
        seedRecordIndex: recordIndex,
        relationshipNames: [relationship.name],
        summary: `${issue.summary} Parent seed record index: ${recordIndex}.`,
      })));
      continue;
    }
    if (value == null) {
      continue;
    }
    if (!isSeedRecordObjectArray(value)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        seedRecordIndex: recordIndex,
        relationshipNames: [relationship.name],
        summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be an array of child seed records for first-ring owns-many source.`,
      });
      continue;
    }
    issues.push(...seedRecordIdentityIssues(
      targetRef,
      ownedDomain,
      value,
      `relationship '${relationship.name}' owned child initialization`,
    ).map((issue) => ({
      ...issue,
      seedRecordIndex: recordIndex,
      relationshipNames: [relationship.name],
      summary: `${issue.summary} Parent seed record index: ${recordIndex}.`,
    })));
  }
  return issues;
}

function routerBackedListDetailNestedValueObjectRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
  fields: readonly AppBuilderDomainFieldDescriptor[],
  primarySeedRecords: readonly AppBuilderSeedRecord[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const displayField = fields.find((field) => field.name === relationship.displayFieldName) ?? null;
  if (relationship.fromEntityName !== primaryDomain.entityTypeName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name fromEntityName='${primaryDomain.entityTypeName}' for this router-backed primary entity.`,
    });
  }
  if (relationship.localFieldName == null || relationship.localFieldName.trim().length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name localFieldName so nested value objects have a generated parent member.`,
    });
  } else if (primaryDomain.fields.some((field) => field.name === relationship.localFieldName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' localFieldName '${relationship.localFieldName}' conflicts with a scalar field on primary entity '${primaryDomain.entityTypeName}'.`,
    });
  }
  if (relationship.foreignFieldName != null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' is a nested value object and should not supply foreignFieldName; nested values are not related identity lookups.`,
    });
  }
  if (fields.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainFields,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' targets value object '${relationship.toEntityName}', but no scoped DomainFields rows exist for that value object.`,
    });
  }
  if (displayField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' displayFieldName '${relationship.displayFieldName ?? ''}' is not present on value object '${relationship.toEntityName}'.`,
    });
  } else if (!nestedValueObjectDisplayFieldCanRender(displayField)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      fieldNames: [displayField.name],
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' display field '${displayField.name}' has valueKind='${displayField.valueKind}', but first-ring nested value-object display currently supports text, number, and boolean fields without value-object display accessors.`,
    });
  }
  if (relationship.localFieldName == null) {
    return issues;
  }
  for (const [recordIndex, record] of primarySeedRecords.entries()) {
    const value = record[relationship.localFieldName];
    if (value == null) {
      if (relationship.required === true) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
          seedRecordIndex: recordIndex,
          relationshipNames: [relationship.name],
          summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be a nested value-object seed record because the relationship is required.`,
        });
      }
      continue;
    }
    if (!isSeedRecordObject(value)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        seedRecordIndex: recordIndex,
        relationshipNames: [relationship.name],
        summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be one nested value-object seed record or null.`,
      });
    }
  }
  return issues;
}

function localViewModelMaterializedRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relatedDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const localField = primaryDomain.fields.find((field) => field.name === relationship.localFieldName) ?? null;
  const localValueKind = relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity;
  const displayField = relatedDomain.fields.find((field) => field.name === relationship.displayFieldName) ?? null;
  if (
    localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object
    && relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceOne
  ) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' uses localValueKind='${localValueKind}', but current local source only lowers object-valued reference-one relationships; object-valued reference-many remains a later multi-select object-array rung.`,
    });
  }
  if (relationship.foreignFieldName !== relatedDomain.identityMemberName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' currently needs foreignFieldName='${relatedDomain.identityMemberName}' because first-ring local reference source uses related identity lookup.`,
    });
  }
  if (displayField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' displayFieldName '${relationship.displayFieldName ?? ''}' is not present on related entity '${relatedDomain.entityTypeName}'.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Identity && localField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' localFieldName '${relationship.localFieldName ?? ''}' is not present on primary entity '${primaryDomain.entityTypeName}', but identity-valued reference source needs a scalar local field.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Identity && localField != null && !relationshipLocalFieldMatchesRelatedIdentity(localField, relatedDomain.identityValueKind, relationship.kind)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' local field '${localField.name}' has valueKind='${localField.valueKind}', which cannot hold ${relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany ? 'related identity arrays' : `a ${relatedDomain.identityValueKind} related identity`} in the first-ring local reference lowerer.`,
    });
  }
  return issues;
}

function localViewModelMaterializedOwnedRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  ownedDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
  primarySeedRecords: readonly AppBuilderSeedRecord[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const displayField = ownedDomain.fields.find((field) => field.name === relationship.displayFieldName) ?? null;
  if (displayField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' displayFieldName '${relationship.displayFieldName ?? ''}' is not present on owned entity '${ownedDomain.entityTypeName}'.`,
    });
  }
  if (relationship.localFieldName == null) {
    return issues;
  }
  for (const [recordIndex, record] of primarySeedRecords.entries()) {
    const value = record[relationship.localFieldName];
    if (value == null) {
      continue;
    }
    if (relationship.kind === AppBuilderDomainRelationshipKind.OwnsOne) {
      if (value == null) {
        if (relationship.required === true) {
          issues.push({
            issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
            targetRef: targetRef ?? undefined,
            inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
            seedRecordIndex: recordIndex,
            relationshipNames: [relationship.name],
            summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be an owned child seed record because the relationship is required.`,
          });
        }
        continue;
      }
      if (!isSeedRecordObject(value)) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
          seedRecordIndex: recordIndex,
          relationshipNames: [relationship.name],
          summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be one child seed record or null for first-ring owns-one source.`,
        });
        continue;
      }
      issues.push(...seedRecordIdentityIssues(
        targetRef,
        ownedDomain,
        [value],
        `relationship '${relationship.name}' owned child initialization`,
      ).map((issue) => ({
        ...issue,
        seedRecordIndex: recordIndex,
        relationshipNames: [relationship.name],
        summary: `${issue.summary} Parent seed record index: ${recordIndex}.`,
      })));
      continue;
    }
    if (!isSeedRecordObjectArray(value)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        seedRecordIndex: recordIndex,
        relationshipNames: [relationship.name],
        summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be an array of child seed records for first-ring owns-many source.`,
      });
      continue;
    }
    issues.push(...seedRecordIdentityIssues(
      targetRef,
      ownedDomain,
      value,
      `relationship '${relationship.name}' owned child initialization`,
    ).map((issue) => ({
      ...issue,
      seedRecordIndex: recordIndex,
      relationshipNames: [relationship.name],
      summary: `${issue.summary} Parent seed record index: ${recordIndex}.`,
    })));
  }
  return issues;
}

function localViewModelNestedValueObjectRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
  fields: readonly AppBuilderDomainFieldDescriptor[],
  primarySeedRecords: readonly AppBuilderSeedRecord[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const displayField = fields.find((field) => field.name === relationship.displayFieldName) ?? null;
  if (relationship.fromEntityName !== primaryDomain.entityTypeName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name fromEntityName='${primaryDomain.entityTypeName}' for this local collection primary entity.`,
    });
  }
  if (relationship.localFieldName == null || relationship.localFieldName.trim().length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name localFieldName so nested value objects have a generated parent member.`,
    });
  } else if (primaryDomain.fields.some((field) => field.name === relationship.localFieldName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' localFieldName '${relationship.localFieldName}' conflicts with a scalar field on primary entity '${primaryDomain.entityTypeName}'.`,
    });
  }
  if (relationship.foreignFieldName != null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' is a nested value object and should not supply foreignFieldName; nested values are not related identity lookups.`,
    });
  }
  if (fields.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainFields,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' targets value object '${relationship.toEntityName}', but no scoped DomainFields rows exist for that value object.`,
    });
  }
  if (displayField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' displayFieldName '${relationship.displayFieldName ?? ''}' is not present on value object '${relationship.toEntityName}'.`,
    });
  } else if (!nestedValueObjectDisplayFieldCanRender(displayField)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      fieldNames: [displayField.name],
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' display field '${displayField.name}' has valueKind='${displayField.valueKind}', but first-ring nested value-object display currently supports text, number, and boolean fields without value-object display accessors.`,
    });
  }
  if (relationship.localFieldName == null) {
    return issues;
  }
  for (const [recordIndex, record] of primarySeedRecords.entries()) {
    const value = record[relationship.localFieldName];
    if (value == null) {
      if (relationship.required === true) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
          seedRecordIndex: recordIndex,
          relationshipNames: [relationship.name],
          summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be a nested value-object seed record because the relationship is required.`,
        });
      }
      continue;
    }
    if (!isSeedRecordObject(value)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        seedRecordIndex: recordIndex,
        relationshipNames: [relationship.name],
        summary: `Seed record ${recordIndex} relationship '${relationship.name}' member '${relationship.localFieldName}' must be one nested value-object seed record or null.`,
      });
    }
  }
  return issues;
}

function nestedValueObjectDisplayFieldCanRender(
  field: AppBuilderDomainFieldDescriptor,
): boolean {
  switch (field.valueKind) {
    case AppBuilderDomainFieldValueKind.Text:
    case AppBuilderDomainFieldValueKind.Boolean:
    case AppBuilderDomainFieldValueKind.Number:
      return true;
    case AppBuilderDomainFieldValueKind.Date:
    case AppBuilderDomainFieldValueKind.Choice:
    case AppBuilderDomainFieldValueKind.ChoiceSet:
      return false;
  }
}

function relationshipLocalFieldMatchesRelatedIdentity(
  field: AppBuilderDomainFieldDescriptor,
  identityValueKind: AppBuilderDomainIdentityValueKind,
  relationshipKind: AppBuilderDomainRelationshipKind,
): boolean {
  if (relationshipKind === AppBuilderDomainRelationshipKind.ReferenceMany) {
    return identityValueKind === AppBuilderDomainIdentityValueKind.String
      && field.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet;
  }
  switch (identityValueKind) {
    case AppBuilderDomainIdentityValueKind.String:
      return field.valueKind === AppBuilderDomainFieldValueKind.Text
        || field.valueKind === AppBuilderDomainFieldValueKind.Choice;
    case AppBuilderDomainIdentityValueKind.Number:
      return field.valueKind === AppBuilderDomainFieldValueKind.Number;
  }
}

function localViewModelOwnedRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (
    relationship.kind !== AppBuilderDomainRelationshipKind.OwnsMany
    && relationship.kind !== AppBuilderDomainRelationshipKind.OwnsOne
  ) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateUnsupportedRelationship,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Local view-model collection lowering currently spends owned relationship '${relationship.name}' only when kind='${AppBuilderDomainRelationshipKind.OwnsOne}' or kind='${AppBuilderDomainRelationshipKind.OwnsMany}', not '${relationship.kind}'.`,
    });
  }
  if (relationship.fromEntityName !== primaryDomain.entityTypeName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name fromEntityName='${primaryDomain.entityTypeName}' for this local collection primary entity.`,
    });
  }
  if (relationship.localFieldName == null || relationship.localFieldName.trim().length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name localFieldName so owned child arrays have a generated parent member.`,
    });
  } else if (primaryDomain.fields.some((field) => field.name === relationship.localFieldName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' localFieldName '${relationship.localFieldName}' conflicts with a scalar field on primary entity '${primaryDomain.entityTypeName}'.`,
    });
  }
  if (relationship.foreignFieldName != null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' is an owned relationship and should not supply foreignFieldName; owned children are nested values, not related identity lookups.`,
    });
  }
  if (relationship.displayFieldName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name displayFieldName so local generated source does not invent owned-child label policy.`,
    });
  }
  return issues;
}

function localViewModelReferenceRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (
    relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceOne
    && relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceMany
  ) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateUnsupportedRelationship,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Local view-model collection lowering currently spends relationship '${relationship.name}' only when kind='${AppBuilderDomainRelationshipKind.ReferenceOne}' or '${AppBuilderDomainRelationshipKind.ReferenceMany}', not '${relationship.kind}'.`,
    });
  }
  if (relationship.fromEntityName !== primaryDomain.entityTypeName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name fromEntityName='${primaryDomain.entityTypeName}' for this local collection primary entity.`,
    });
  }
  const localValueKind = relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity;
  const localFieldName = normalizedSourceInputText(relationship.localFieldName);
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Identity && (localFieldName == null || !primaryDomain.fields.some((field) => field.name === localFieldName))) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name a localFieldName present on primary entity '${primaryDomain.entityTypeName}' for identity-valued local reference source.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object && (localFieldName == null || !appBuilderIsTypeScriptIdentifier(localFieldName))) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name a TypeScript-safe localFieldName for object-valued local reference source.`,
    });
  }
  if (relationship.foreignFieldName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name the related identity foreignFieldName before local source can emit a lookup.`,
    });
  }
  if (relationship.displayFieldName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name displayFieldName so local generated source does not invent related-label policy.`,
    });
  }
  return issues;
}

function routerBackedListDetailReferenceRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (
    relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceOne
    && relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceMany
  ) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedRelationship,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Router-backed list/detail currently spends relationship '${relationship.name}' only when kind='${AppBuilderDomainRelationshipKind.ReferenceOne}' or '${AppBuilderDomainRelationshipKind.ReferenceMany}', not '${relationship.kind}'.`,
    });
  }
  if (relationship.fromEntityName !== primaryDomain.entityTypeName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name fromEntityName='${primaryDomain.entityTypeName}' for this router-backed primary entity.`,
    });
  }
  const localValueKind = relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity;
  const localField = relationship.localFieldName == null
    ? null
    : primaryDomain.fields.find((field) => field.name === relationship.localFieldName) ?? null;
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Identity && localField == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name a localFieldName present on primary entity '${primaryDomain.entityTypeName}'.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object && (relationship.localFieldName == null || !appBuilderIsTypeScriptIdentifier(relationship.localFieldName))) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name a TypeScript-safe localFieldName for the generated object-valued relationship member.`,
    });
  }
  if (localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object && localField != null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' uses object-valued local source, so localFieldName '${relationship.localFieldName ?? ''}' must not collide with a scalar primary-domain field.`,
    });
  }
  if (relationship.foreignFieldName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name the related identity foreignFieldName before source can emit a lookup.`,
    });
  }
  if (relationship.displayFieldName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Relationship '${relationship.name}' must name displayFieldName so generated source does not invent related-label policy.`,
    });
  }
  return issues;
}

function materializeDomainForEntityPayload(
  entity: AppBuilderSourceLoweringDomainEntityPayload,
  fields: readonly AppBuilderDomainFieldDescriptor[],
  target: AppBuilderDomainMaterializationTarget,
): AppBuilderDomainDescriptor | readonly AppBuilderDomainMaterializationIssue[] {
  return materializeAppBuilderCallerDomainForTarget(
    target,
    [
      { key: AppBuilderDomainSlotKey.EntityTitle, value: entity.entityTitle },
      ...(entity.entityTypeName == null ? [] : [{ key: AppBuilderDomainSlotKey.EntityTypeName, value: entity.entityTypeName } satisfies AppBuilderDomainSlotAssignment]),
      ...(entity.collectionMemberName == null ? [] : [{ key: AppBuilderDomainSlotKey.CollectionMemberName, value: entity.collectionMemberName } satisfies AppBuilderDomainSlotAssignment]),
      ...(entity.identityMemberName == null ? [] : [{ key: AppBuilderDomainSlotKey.IdentityMemberName, value: entity.identityMemberName } satisfies AppBuilderDomainSlotAssignment]),
      ...(entity.identityValueKind == null ? [] : [{ key: AppBuilderDomainSlotKey.IdentityValueKind, value: entity.identityValueKind } satisfies AppBuilderDomainSlotAssignment]),
      { key: AppBuilderDomainSlotKey.FieldSchema, value: fields },
    ],
  );
}

function selectSourcePlanDomainEntity(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  entities: readonly AppBuilderSourceLoweringDomainEntityPayload[],
  options: {
    readonly targetTitle: string;
    readonly ambiguousSummary: (count: number) => string;
    readonly allowRelationshipPrimaryEntity?: boolean;
    readonly explicitEntityName?: string | null;
    readonly invalidExplicitEntityNameIssueKind?: AppBuilderSourceLoweringSourcePlanIssueKind;
    readonly ambiguousRelationshipPrimaryEntityIssueKind?: AppBuilderSourceLoweringSourcePlanIssueKind;
    readonly invalidRelationshipEntityIssueKind?: AppBuilderSourceLoweringSourcePlanIssueKind;
  },
): {
  readonly value: AppBuilderSourceLoweringDomainEntityPayload | null;
  readonly entityName: string | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (entities.length === 1) {
    const entity = entities[0]!;
    return {
      value: entity,
      entityName: domainEntityPayloadName(entity),
      issues: [],
    };
  }
  const explicitEntityName = normalizedSourceInputText(options.explicitEntityName);
  if (explicitEntityName != null) {
    const entity = entities.find((candidate) => domainEntityPayloadName(candidate) === explicitEntityName) ?? null;
    if (entity == null) {
      return {
        value: null,
        entityName: null,
        issues: [{
          issueKind: options.invalidExplicitEntityNameIssueKind
            ?? AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousDomainEntity,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.DomainEntities,
          summary: `${options.targetTitle} selected primaryEntityName='${explicitEntityName}', but supplied DomainEntities are: ${entities.map(domainEntityPayloadName).join(', ')}.`,
        }],
      };
    }
    return {
      value: entity,
      entityName: explicitEntityName,
      issues: [],
    };
  }
  if (options.allowRelationshipPrimaryEntity !== true) {
    return {
      value: null,
      entityName: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousDomainEntity,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainEntities,
        summary: options.ambiguousSummary(entities.length),
      }],
    };
  }
  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  const fromEntityNames = uniqueValues(relationships
    .map((relationship) => normalizedSourceInputText(relationship.fromEntityName))
    .filter((value): value is string => value != null));
  if (fromEntityNames.length !== 1) {
    return {
      value: null,
      entityName: null,
      issues: [{
        issueKind: options.ambiguousRelationshipPrimaryEntityIssueKind
          ?? AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailAmbiguousRelationshipPrimaryEntity,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: relationships.map((relationship) => relationship.name),
        summary: `${options.targetTitle} received ${entities.length} DomainEntities payloads; relationship-aware lowering needs exactly one DomainRelationships.fromEntityName to identify the primary entity.`,
      }],
    };
  }
  const entityName = fromEntityNames[0]!;
  const entity = entities.find((candidate) => domainEntityPayloadName(candidate) === entityName) ?? null;
  if (entity == null) {
    return {
      value: null,
      entityName: null,
      issues: [{
        issueKind: options.invalidRelationshipEntityIssueKind
          ?? AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipEntity,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: relationships.map((relationship) => relationship.name),
        summary: `${options.targetTitle} relationship input names primary entity '${entityName}', but no matching DomainEntities payload exists.`,
      }],
    };
  }
  return { value: entity, entityName, issues: [] };
}

function domainEntityPayloadName(
  entity: AppBuilderSourceLoweringDomainEntityPayload,
): string {
  return entity.entityTypeName ?? appBuilderPascalCase(entity.entityTitle);
}

function sourcePlanDomainFieldsForEntity(
  fields: readonly AppBuilderDomainFieldDescriptor[],
  entityName: string | null,
  entityCount: number,
): readonly AppBuilderDomainFieldDescriptor[] {
  if (entityName == null || entityCount === 1 && fields.every((field) => field.entityName == null)) {
    return fields;
  }
  return fields.filter((field) => field.entityName === entityName);
}

function isDomainMaterializationIssueArray(
  value: AppBuilderDomainDescriptor | readonly AppBuilderDomainMaterializationIssue[],
): value is readonly AppBuilderDomainMaterializationIssue[] {
  return Array.isArray(value);
}

function selectRouterBackedListDetailRoutingPolicy(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderSourceLoweringRoutingPolicyPayload | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const policies = appBuilderSourceLoweringRoutingPolicyPayloads(suppliedInputs);
  if (policies.length === 0) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingRoutingPolicy,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
        summary: 'Router-backed list/detail lowering requires AureliaRoutingPolicy with routerAdmission=router-configuration and router-driven area navigation.',
      }],
    };
  }
  if (policies.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousRoutingPolicy,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
        summary: `Router-backed list/detail lowering received ${policies.length} routing policy payloads; supply exactly one.`,
      }],
    };
  }
  const policy = policies[0]!;
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (policy.routerAdmission !== AppBuilderRouterAdmissionPolicy.RouterConfiguration) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedRouterAdmission,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
      routingPolicy: policy,
      summary: `Router-backed list/detail lowering emits router configuration and cannot satisfy routerAdmission='${policy.routerAdmission}'.`,
    });
  }
  if (!policy.areaNavigationPolicies?.includes(AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedAreaNavigationPolicy,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
      routingPolicy: policy,
      summary: `Router-backed list/detail lowering requires areaNavigationPolicies to include '${AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection}'.`,
    });
  }
  return { value: policy, issues };
}

function selectRouterBackedListDetailStatePolicy(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderSourceLoweringStatePolicyPayload | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const policies = appBuilderSourceLoweringStatePolicyPayloads(suppliedInputs);
  if (policies.length === 0) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingStatePolicy,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
        summary: `Router-backed list/detail lowering requires AureliaStatePolicy with appStateOwnership='${AppBuilderAppStateOwnershipMode.DiStateClass}'.`,
      }],
    };
  }
  if (policies.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousStatePolicy,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
        summary: `Router-backed list/detail lowering received ${policies.length} state policy payloads; supply exactly one.`,
      }],
    };
  }
  const policy = policies[0]!;
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (policy.appStateOwnership == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingStatePolicy,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
      statePolicy: policy,
      summary: `Router-backed list/detail lowering requires appStateOwnership='${AppBuilderAppStateOwnershipMode.DiStateClass}'.`,
    });
  } else if (policy.appStateOwnership !== AppBuilderAppStateOwnershipMode.DiStateClass) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedStatePolicy,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
      statePolicy: policy,
      summary: `Router-backed list/detail lowering currently emits a DI state class, not appStateOwnership='${policy.appStateOwnership}'.`,
    });
  }
  if (
    policy.domainModeling != null
    && policy.domainModeling !== AppBuilderDomainModelingMode.PlainDomainComposition
  ) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedStatePolicy,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
      statePolicy: policy,
      summary: `Router-backed list/detail lowering currently emits plain domain composition, not domainModeling='${policy.domainModeling}'.`,
    });
  }
  return { value: policy, issues };
}

function selectRouterBackedListDetailServiceCollection(
  request: AppBuilderSourceLoweringRouterBackedListDetailRequest,
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
  createForm: AppBuilderRoutedCollectionDetailCreateFormSource | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: (AppBuilderSourceLoweringRouterBackedListDetailServiceCollection & AppBuilderRoutedCollectionDetailServiceCollectionSource) | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (request.serviceCollection == null || domain == null) {
    return { value: null, issues: [] };
  }
  const entityFileName = appBuilderKebabCase(domain.entityTypeName);
  const serviceClassName = normalizedSourceInputText(request.serviceCollection.serviceClassName)
    ?? `${domain.entityTypeName}Service`;
  const sourceTargetPath = normalizedSourceInputText(request.serviceCollection.sourceTargetPath)
    ?? `src/services/${entityFileName}-service.ts`;
  const loadMethodName = normalizedSourceInputText(request.serviceCollection.loadMethodName)
    ?? `list${appBuilderPascalCase(domain.collectionMemberName)}`;
  const findMethodName = normalizedSourceInputText(request.serviceCollection.findMethodName)
    ?? `find${domain.entityTypeName}`;
  const createMethodName = normalizedSourceInputText(request.serviceCollection.createMethodName)
    ?? (createForm == null ? null : `create${domain.entityTypeName}`);
  const fields = appBuilderDomainFieldSourceModels(domain.fields, {
    entityTypeName: domain.entityTypeName,
    valueSets,
  });
  const collectionPromiseMemberName = `${domain.collectionMemberName}Promise`;
  const filterMethods = selectRouterBackedListDetailServiceCollectionFilterMethods(
    request.serviceCollection.filterMethods ?? [],
    fields,
    targetRef,
    serviceClassName,
  );
  const updateMethods = selectRouterBackedListDetailServiceCollectionUpdateMethods(
    request.serviceCollection.updateMethods ?? [],
    fields,
    targetRef,
    serviceClassName,
  );
  const queryControls = selectRouterBackedListDetailServiceQueryControls(
    request.serviceCollection.queryControls ?? [],
    filterMethods.value,
    collectionPromiseMemberName,
    targetRef,
    serviceClassName,
    suppliedInputs,
  );
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (!appBuilderIsTypeScriptIdentifier(serviceClassName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionClassName,
      targetRef: targetRef ?? undefined,
      serviceClassNames: [serviceClassName],
      summary: `Router-backed list/detail service collection needs a TypeScript-safe serviceClassName; '${serviceClassName}' cannot be emitted.`,
    });
  }
  if (!appBuilderIsTypeScriptIdentifier(loadMethodName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionLoadMethodName,
      targetRef: targetRef ?? undefined,
      serviceClassNames: [serviceClassName],
      summary: `Router-backed list/detail service collection needs a TypeScript-safe loadMethodName; '${loadMethodName}' cannot be emitted.`,
    });
  }
  if (!appBuilderIsTypeScriptIdentifier(findMethodName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionFindMethodName,
      targetRef: targetRef ?? undefined,
      serviceClassNames: [serviceClassName],
      summary: `Router-backed list/detail service collection needs a TypeScript-safe findMethodName; '${findMethodName}' cannot be emitted.`,
    });
  }
  if (createMethodName != null && !appBuilderIsTypeScriptIdentifier(createMethodName)) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionCreateMethodName,
      targetRef: targetRef ?? undefined,
      serviceClassNames: [serviceClassName],
      summary: `Router-backed list/detail service collection needs a TypeScript-safe createMethodName; '${createMethodName}' cannot be emitted.`,
    });
  }
  issues.push(...filterMethods.issues, ...updateMethods.issues, ...queryControls.issues);
  return {
    value: issues.length === 0
      ? {
          sourceTargetPath,
          serviceClassName,
          loadMethodName,
          findMethodName,
          createMethodName,
          filterMethods: filterMethods.value,
          updateMethods: updateMethods.value,
          queryControls: queryControls.value,
        }
      : null,
    issues,
  };
}

function selectRouterBackedListDetailServiceCollectionUpdateMethods(
  updateMethodRequests: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionUpdateMethodRequest[],
  fields: readonly AppBuilderDomainFieldSourceModel[],
  targetRef: AppBuilderOntologyRowRef | null,
  serviceClassName: string,
): {
  readonly value: readonly AppBuilderServiceCollectionUpdateMethodSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const selected: AppBuilderServiceCollectionUpdateMethodSourceModel[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const updateMethodRequest of updateMethodRequests) {
    const methodName = normalizedSourceInputText(updateMethodRequest.methodName);
    const inputFieldNames = updateMethodRequest.inputFieldNames ?? [];
    const unknownFieldNames = inputFieldNames.filter((fieldName) =>
      fields.every((field) => field.memberName !== fieldName));
    if (
      methodName == null
      || !appBuilderIsTypeScriptIdentifier(methodName)
      || inputFieldNames.length === 0
      || unknownFieldNames.length > 0
    ) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionUpdateMethod,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        serviceClassNames: [serviceClassName],
        fieldNames: inputFieldNames,
        summary: 'Router-backed list/detail service update methods need a TypeScript-safe methodName and at least one explicit inputFieldNames entry that matches a generated domain field.',
      });
      continue;
    }
    selected.push({
      methodName,
      inputFieldNames,
    });
  }
  return {
    value: selected,
    issues,
  };
}

function selectRouterBackedListDetailServiceCollectionFilterMethods(
  filterMethodRequests: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionFilterMethodRequest[],
  fields: readonly AppBuilderDomainFieldSourceModel[],
  targetRef: AppBuilderOntologyRowRef | null,
  serviceClassName: string,
): {
  readonly value: readonly AppBuilderServiceCollectionFilterMethodSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const selected: AppBuilderServiceCollectionFilterMethodSourceModel[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const filterMethodRequest of filterMethodRequests) {
    const methodName = normalizedSourceInputText(filterMethodRequest.methodName);
    const fieldName = normalizedSourceInputText(filterMethodRequest.fieldName);
    const parameterName = normalizedSourceInputText(filterMethodRequest.parameterName);
    const requestedPredicateKind = filterMethodRequest.predicateKind ?? AppBuilderServiceCollectionFilterPredicateKind.Equals;
    const field = fieldName == null
      ? null
      : fields.find((candidate) => candidate.memberName === fieldName) ?? null;
    const predicateKind = APP_BUILDER_SERVICE_COLLECTION_FILTER_PREDICATE_KINDS.includes(requestedPredicateKind)
      ? requestedPredicateKind
      : null;
    if (
      methodName == null
      || !appBuilderIsTypeScriptIdentifier(methodName)
      || fieldName == null
      || field == null
      || parameterName == null
      || !appBuilderIsTypeScriptIdentifier(parameterName)
      || predicateKind == null
      || (predicateKind === AppBuilderServiceCollectionFilterPredicateKind.TextContains && field.typeScriptType !== 'string')
    ) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionFilterMethod,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        serviceClassNames: [serviceClassName],
        fieldNames: [fieldName].filter((value): value is string => value != null),
        summary: 'Router-backed list/detail service filter methods need methodName, fieldName, parameterName, and predicateKind that match TypeScript identifiers, a generated domain field, and a supported field/predicate pairing.',
      });
      continue;
    }
    selected.push({
      methodName,
      fieldName: field.memberName,
      parameterName,
      predicateKind,
    });
  }
  return {
    value: selected,
    issues,
  };
}

function selectRouterBackedListDetailServiceQueryControls(
  queryControlRequests: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControlRequest[],
  filterMethods: readonly AppBuilderServiceCollectionFilterMethodSourceModel[],
  collectionPromiseMemberName: string,
  targetRef: AppBuilderOntologyRowRef | null,
  serviceClassName: string,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControl[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const selected: AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControl[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const filterMethodNames = new Set(filterMethods.map((filterMethod) => filterMethod.methodName));
  const actions = appBuilderSourceLoweringDomainActionPayloads(suppliedInputs);
  for (const queryControlRequest of queryControlRequests) {
    const stateMemberName = normalizedSourceInputText(queryControlRequest.stateMemberName);
    const stateTypeText = normalizedSourceInputText(queryControlRequest.stateTypeText);
    const initialValueExpression = normalizedSourceInputText(queryControlRequest.initialValueExpression);
    const inactiveValueExpression = normalizedSourceInputText(queryControlRequest.inactiveValueExpression);
    const reloadMethodName = normalizedSourceInputText(queryControlRequest.reloadMethodName);
    const resultMemberName = normalizedSourceInputText(queryControlRequest.resultMemberName) ?? collectionPromiseMemberName;
    const filterMethodName = normalizedSourceInputText(queryControlRequest.filterMethodName);
    const fieldControlId = normalizedSourceInputText(queryControlRequest.fieldControlId);
    const labelText = normalizedSourceInputText(queryControlRequest.labelText);
    const applyActionName = normalizedSourceInputText(queryControlRequest.applyActionName);
    const applyButtonText = normalizedSourceInputText(queryControlRequest.applyButtonText);
    const clearActionName = normalizedSourceInputText(queryControlRequest.clearActionName);
    const clearButtonText = normalizedSourceInputText(queryControlRequest.clearButtonText);
    const applyAction = applyActionName == null
      ? null
      : actions.find((action) => action.name === applyActionName) ?? null;
    const clearAction = clearActionName == null
      ? null
      : actions.find((action) => action.name === clearActionName) ?? null;
    const feedback = selectRouterBackedListDetailServiceQueryControlFeedback(
      targetRef,
      [applyActionName, clearActionName].filter((value): value is string => value != null),
      suppliedInputs,
    );
    if (
      stateMemberName == null
      || !appBuilderIsTypeScriptIdentifier(stateMemberName)
      || stateTypeText == null
      || initialValueExpression == null
      || inactiveValueExpression == null
      || reloadMethodName == null
      || !appBuilderIsTypeScriptIdentifier(reloadMethodName)
      || resultMemberName !== collectionPromiseMemberName
      || filterMethodName == null
      || !appBuilderIsTypeScriptIdentifier(filterMethodName)
      || !filterMethodNames.has(filterMethodName)
      || fieldControlId == null
      || labelText == null
      || applyActionName == null
      || !appBuilderIsTypeScriptIdentifier(applyActionName)
      || applyAction == null
      || applyAction.scope !== AppBuilderDomainActionScope.Integration
      || applyButtonText == null
      || clearActionName == null
      || !appBuilderIsTypeScriptIdentifier(clearActionName)
      || clearAction == null
      || clearAction.scope !== AppBuilderDomainActionScope.Integration
      || clearButtonText == null
    ) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionQueryControl,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        serviceClassNames: [serviceClassName],
        actionNames: [
          applyActionName,
          clearActionName,
          ...actions.map((action) => action.name),
        ].filter((value): value is string => value != null),
        summary: `Router-backed list/detail service query controls need identifier-safe state/reload/action names, resultMemberName '${collectionPromiseMemberName}', a known filterMethodName, explicit label/button text, and integration-scoped apply/clear DomainActions.`,
      });
      issues.push(...feedback.issues);
      continue;
    }
    issues.push(...feedback.issues);
    if (feedback.issues.length > 0) {
      continue;
    }
    selected.push({
      stateMemberName,
      stateTypeText,
      initialValueExpression,
      inactiveValueExpression,
      reloadMethodName,
      resultMemberName,
      filterMethodName,
      fieldControlId,
      labelText,
      applyActionName,
      applyButtonText,
      clearActionName,
      clearButtonText,
      applyActionFeedback: feedback.byActionName.get(applyActionName) ?? null,
      clearActionFeedback: feedback.byActionName.get(clearActionName) ?? null,
    });
  }
  return {
    value: selected,
    issues,
  };
}

function selectRouterBackedListDetailServiceQueryControlFeedback(
  targetRef: AppBuilderOntologyRowRef | null,
  actionNames: readonly string[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly byActionName: ReadonlyMap<string, AppBuilderSourceLoweringActionFeedbackPayload>;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const feedbacks = appBuilderSourceLoweringActionFeedbackPayloads(suppliedInputs)
    .filter((feedback) => actionNames.includes(feedback.actionName));
  const byActionName = new Map<string, AppBuilderSourceLoweringActionFeedbackPayload>();
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const feedback of feedbacks) {
    if (!appBuilderIsTypeScriptIdentifier(feedback.statusMemberName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionQueryControl,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.ActionFeedback,
        actionNames: [feedback.actionName],
        statusMemberNames: [feedback.statusMemberName],
        summary: `Router-backed list/detail query action '${feedback.actionName}' cannot assign action feedback member '${feedback.statusMemberName}' because it is not a TypeScript-safe identifier.`,
      });
      continue;
    }
    if (byActionName.has(feedback.actionName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionQueryControl,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.ActionFeedback,
        actionNames: [feedback.actionName],
        statusMemberNames: feedbacks
          .filter((candidate) => candidate.actionName === feedback.actionName)
          .map((candidate) => candidate.statusMemberName),
        summary: `Router-backed list/detail query action '${feedback.actionName}' received multiple action-feedback payloads; supply at most one feedback row per generated query action.`,
      });
      continue;
    }
    byActionName.set(feedback.actionName, feedback);
  }
  return {
    byActionName,
    issues,
  };
}

function selectRouterBackedListDetailNavigationAction(
  request: AppBuilderSourceLoweringRouterBackedListDetailRequest,
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderRoutedCollectionDetailNavigationActionSource | null;
  readonly action: AppBuilderDomainActionDescriptor | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const requestedActionName = normalizedSourceInputText(request.actionName);
  const linkText = normalizedSourceInputText(request.linkText);
  if (requestedActionName == null && linkText == null) {
    return { value: null, action: null, issues: [] };
  }

  const actions = appBuilderSourceLoweringDomainActionPayloads(suppliedInputs);
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (requestedActionName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingNavigationAction,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: actions.map((action) => action.name),
      summary: 'Router-backed list/detail row navigation received linkText but no actionName; select one navigation-scoped DomainActions entry or omit the navigation action fields.',
    });
  }
  if (requestedActionName != null && actions.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingDomainActions,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: [requestedActionName],
      summary: `Router-backed list/detail row navigation selected action '${requestedActionName}', but no DomainActions payload was supplied.`,
    });
  }
  const selectedAction = requestedActionName == null
    ? null
    : actions.find((action) => action.name === requestedActionName) ?? null;
  if (requestedActionName != null && actions.length > 0 && selectedAction == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownNavigationAction,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: [requestedActionName, ...actions.map((action) => action.name)],
      summary: `Router-backed list/detail row navigation selected unknown action '${requestedActionName}'. Available actions: ${actions.map((action) => action.name).join(', ')}.`,
    });
  }
  if (selectedAction != null && selectedAction.scope !== AppBuilderDomainActionScope.Navigation) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailIncompatibleNavigationAction,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: [selectedAction.name],
      summary: `Router-backed list/detail row navigation needs action '${selectedAction.name}' to have scope '${AppBuilderDomainActionScope.Navigation}'.`,
    });
  }
  if (requestedActionName != null && linkText == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingNavigationLinkText,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: [requestedActionName],
      summary: `Router-backed list/detail row navigation selected action '${requestedActionName}' but omitted explicit linkText; app-builder will not invent visible copy.`,
    });
  }

  if (issues.length > 0 || selectedAction == null || linkText == null) {
    return { value: null, action: null, issues };
  }
  return {
    value: {
      actionName: selectedAction.name,
      linkText,
    },
    action: selectedAction,
    issues: [],
  };
}

function selectRouterBackedListDetailCreateForm(
  request: AppBuilderSourceLoweringRouterBackedListDetailRequest,
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  valueSets: readonly AppBuilderDomainValueSetDescriptor[],
  referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipSource[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderRoutedCollectionDetailCreateFormSource | null;
  readonly action: AppBuilderDomainActionDescriptor | null;
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (request.createForm == null) {
    return { value: null, action: null, fields: [], issues: [] };
  }

  const requestedActionName = normalizedSourceInputText(request.createForm.actionName);
  const submitButtonText = normalizedSourceInputText(request.createForm.submitButtonText);
  const requestedFieldNames = Array.isArray(request.createForm.fieldNames)
    ? request.createForm.fieldNames.map(normalizedSourceInputText).filter((value): value is string => value != null)
    : [];
  const actions = appBuilderSourceLoweringDomainActionPayloads(suppliedInputs);
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];

  if (requestedActionName == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingCreateAction,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: actions.map((action) => action.name),
      summary: 'Router-backed list/detail createForm needs actionName so app-builder can bind the form submit to an explicit form-scoped create action.',
    });
  }
  if (requestedActionName != null && actions.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingCreateDomainActions,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: [requestedActionName],
      summary: `Router-backed list/detail createForm selected action '${requestedActionName}', but no DomainActions payload was supplied.`,
    });
  }

  const selectedAction = requestedActionName == null
    ? null
    : actions.find((action) => action.name === requestedActionName) ?? null;
  if (requestedActionName != null && actions.length > 0 && selectedAction == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCreateAction,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: [requestedActionName, ...actions.map((action) => action.name)],
      summary: `Router-backed list/detail createForm selected unknown action '${requestedActionName}'. Available actions: ${actions.map((action) => action.name).join(', ')}.`,
    });
  }

  if (selectedAction != null) {
    if (
      selectedAction.kind !== AppBuilderDomainActionKind.Create
      || selectedAction.scope !== AppBuilderDomainActionScope.Form
      || selectedAction.mutatesState === false
      || (domain != null && selectedAction.targetEntityName != null && selectedAction.targetEntityName !== domain.entityTypeName)
    ) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailIncompatibleCreateAction,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        actionNames: [selectedAction.name],
        summary: `Router-backed list/detail createForm needs action '${selectedAction.name}' to be a form-scoped create action for the selected domain entity.`,
      });
    }
  }

  if (requestedFieldNames.length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingCreateFieldSelection,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainFields,
      actionNames: requestedActionName == null ? [] : [requestedActionName],
      summary: 'Router-backed list/detail createForm needs explicit ordered fieldNames; app-builder will not infer a write payload shape from the domain by itself.',
    });
  }
  const duplicateFieldNames = duplicateValues(requestedFieldNames);
  if (duplicateFieldNames.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCreateFieldSelection,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainFields,
      fieldNames: duplicateFieldNames,
      summary: `Router-backed list/detail createForm received duplicate fieldNames: ${duplicateFieldNames.join(', ')}.`,
    });
  }

  const fieldsByName = new Map((domain?.fields ?? []).map((field) => [field.name, field]));
  const objectRelationshipFieldNames = new Set(referenceRelationships
    .filter((relationship) =>
      (
        relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceOne
        || relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany
      )
      && (relationship.relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity) === AppBuilderDomainRelationshipLocalValueKind.Object
      && relationship.relationship.localFieldName != null)
    .map((relationship) => relationship.relationship.localFieldName!));
  const selectedFields = requestedFieldNames
    .map((fieldName) => fieldsByName.get(fieldName) ?? null)
    .filter((field): field is AppBuilderDomainFieldDescriptor => field != null);
  const unknownFieldNames = domain == null
    ? []
    : requestedFieldNames.filter((fieldName) => !fieldsByName.has(fieldName) && !objectRelationshipFieldNames.has(fieldName));
  if (unknownFieldNames.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCreateField,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainFields,
      fieldNames: unknownFieldNames,
      summary: `Router-backed list/detail createForm selected fields absent from the primary domain: ${unknownFieldNames.join(', ')}.`,
    });
  }

  const unsupportedFields = selectedFields.filter((field) =>
    (field.valueKind === AppBuilderDomainFieldValueKind.Choice
      || field.valueKind === AppBuilderDomainFieldValueKind.ChoiceSet)
    && appBuilderDomainFieldResolvedOptions(field, valueSets).length === 0
    && routerBackedListDetailCreateFormReferenceRelationship(field, referenceRelationships) == null
  );
  if (unsupportedFields.length > 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedCreateField,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainFields,
      fieldNames: unsupportedFields.map((field) => field.name),
      summary: `Router-backed list/detail createForm needs field-local options, a resolvable DomainValueSets payload, or an identity-valued reference relationship before it can lower choice/choice-set fields: ${unsupportedFields.map((field) => field.name).join(', ')}.`,
    });
  }

  if (domain?.identityValueKind === AppBuilderDomainIdentityValueKind.String) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedCreateIdentityValueKind,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainEntities,
      summary: 'Router-backed list/detail createForm can allocate numeric identities in the first ring; string identity creation needs an explicit ID strategy before source can be emitted.',
    });
  }

  if (submitButtonText == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingCreateSubmitButtonText,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: requestedActionName == null ? [] : [requestedActionName],
      summary: 'Router-backed list/detail createForm needs explicit submitButtonText; app-builder will not invent visible copy.',
    });
  }

  if (
    selectedAction?.inputFieldNames != null
    && !stringArraysEqual(selectedAction.inputFieldNames, requestedFieldNames)
  ) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailIncompatibleCreateAction,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainActions,
      actionNames: [selectedAction.name],
      fieldNames: requestedFieldNames,
      summary: `Router-backed list/detail createForm fieldNames must match action '${selectedAction.name}' inputFieldNames when the action declares its write payload.`,
    });
  }

  if (issues.length > 0 || selectedAction == null || submitButtonText == null || domain == null) {
    return { value: null, action: null, fields: selectedFields, issues };
  }
  return {
    value: {
      actionName: selectedAction.name,
      fieldNames: requestedFieldNames,
      submitButtonText,
    },
    action: selectedAction,
    fields: selectedFields,
    issues: [],
  };
}

function selectRouterBackedListDetailCreateActionFeedback(
  targetRef: AppBuilderOntologyRowRef | null,
  createForm: AppBuilderRoutedCollectionDetailCreateFormSource | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderSourceLoweringActionFeedbackPayload | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (createForm == null) {
    return { value: null, issues: [] };
  }
  const matches = appBuilderSourceLoweringActionFeedbackPayloads(suppliedInputs)
    .filter((feedback) => feedback.actionName === createForm.actionName);
  if (matches.length === 0) {
    return { value: null, issues: [] };
  }
  if (matches.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailDuplicateCreateActionFeedback,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.ActionFeedback,
        actionNames: [createForm.actionName],
        statusMemberNames: matches.map((feedback) => feedback.statusMemberName),
        summary: `Router-backed list/detail create action '${createForm.actionName}' received ${matches.length} action-feedback payloads; supply at most one feedback row per generated create action.`,
      }],
    };
  }
  const feedback = matches[0]!;
  if (!appBuilderIsTypeScriptIdentifier(feedback.statusMemberName)) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCreateActionFeedbackStatusMember,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.ActionFeedback,
        actionNames: [createForm.actionName],
        statusMemberNames: [feedback.statusMemberName],
        summary: `Router-backed list/detail create action '${createForm.actionName}' cannot assign action feedback member '${feedback.statusMemberName}' because it is not a TypeScript-safe identifier.`,
      }],
    };
  }
  return { value: feedback, issues: [] };
}

type AppBuilderRoutedCollectionDetailRelationshipSource =
  | AppBuilderRoutedCollectionDetailReferenceRelationshipSource
  | AppBuilderRoutedCollectionDetailOwnedRelationshipSource
  | AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipSource;

function selectRouterBackedListDetailDisplayFields(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  tableColumns: readonly AppBuilderRoutedCollectionDetailTableColumnSource[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderCollectionDisplayFieldPayload[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (domain == null) {
    return { value: [], issues: [] };
  }
  const fieldsByName = new Map(domain.fields.map((field) => [field.name, field]));
  const selected: AppBuilderCollectionDisplayFieldPayload[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const seen = new Set<string>();
  for (const payload of appBuilderSourceLoweringCollectionDisplayFieldPayloads(suppliedInputs)) {
    const fieldName = normalizedSourceInputText(payload.fieldName);
    if (fieldName == null || seen.has(fieldName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionDisplayField,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionDisplayFields,
        fieldNames: fieldName == null ? [] : [fieldName],
        summary: fieldName == null
          ? 'Router-backed list/detail detail display received a CollectionDisplayFields row without a non-empty fieldName.'
          : `Router-backed list/detail detail display received duplicate CollectionDisplayFields row for '${fieldName}'.`,
      });
      continue;
    }
    seen.add(fieldName);
    const field = fieldsByName.get(fieldName) ?? null;
    if (field == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionDisplayField,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionDisplayFields,
        fieldNames: [fieldName, ...domain.fields.map((candidate) => candidate.name)],
        summary: `Router-backed list/detail detail display field '${fieldName}' is not present on primary entity '${domain.entityTypeName}'. Available fields: ${domain.fields.map((candidate) => candidate.name).join(', ')}.`,
      });
      continue;
    }
    const booleanDisplayTextIssue = routerBackedListDetailBooleanDisplayTextIssue({
      column: payload,
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionDisplayField,
      targetRef,
      inputFacetId: AppBuilderInputFacetId.CollectionDisplayFields,
      fieldName,
      fieldValueKind: field.valueKind,
      columnHeader: normalizedSourceInputText(payload.label) ?? field.title,
      summaryPrefix: 'Router-backed list/detail detail display',
    });
    if (booleanDisplayTextIssue != null) {
      issues.push(booleanDisplayTextIssue);
      continue;
    }
    selected.push(payload);
  }
  for (const column of tableColumns) {
    const fieldName = normalizedSourceInputText(column.fieldName);
    if (
      fieldName == null
      || seen.has(fieldName)
      || normalizedSourceInputText(column.column.booleanTrueText) == null
      && normalizedSourceInputText(column.column.booleanFalseText) == null
    ) {
      continue;
    }
    const field = fieldsByName.get(fieldName) ?? null;
    if (field == null || field.valueKind !== AppBuilderDomainFieldValueKind.Boolean) {
      continue;
    }
    seen.add(fieldName);
    selected.push({
      fieldName,
      role: AppBuilderCollectionDisplayRole.Boolean,
      label: column.header,
      booleanTrueText: column.column.booleanTrueText,
      booleanFalseText: column.column.booleanFalseText,
    });
  }
  return { value: selected, issues };
}

function selectRouterBackedListDetailTableColumns(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  relationships: readonly AppBuilderRoutedCollectionDetailRelationshipSource[],
  navigationAction: AppBuilderRoutedCollectionDetailNavigationActionSource | null,
  serviceCollection: AppBuilderSourceLoweringRouterBackedListDetailServiceCollection | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderRoutedCollectionDetailTableColumnSource[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const columnPayloads = appBuilderSourceLoweringCollectionTableColumnPayloads(suppliedInputs);
  if (columnPayloads.length === 0 || domain == null) {
    return { value: [], issues: [] };
  }

  const fieldsByName = new Map(domain.fields.map((field) => [field.name, field]));
  const relationshipsByName = new Map(relationships.map((relationship) => [relationship.relationship.name, relationship]));
  const actions = appBuilderSourceLoweringDomainActionPayloads(suppliedInputs);
  const actionsByName = new Map(actions.map((action) => [action.name, action]));
  const seen = new Set<string>();
  const selected: AppBuilderRoutedCollectionDetailTableColumnSource[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];

  for (const column of columnPayloads) {
    const header = normalizedSourceInputText(column.header);
    const fieldName = normalizedSourceInputText(column.fieldName);
    const relationshipName = normalizedSourceInputText(column.relationshipName);
    const actionName = normalizedSourceInputText(column.actionName);
    const selectedKindCount = [
      fieldName,
      relationshipName,
      actionName,
    ].filter((value) => value != null).length;
    const columnHeaders = header == null ? [] : [header];
    if (header == null || selectedKindCount !== 1) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionTableColumn,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        fieldNames: [fieldName].filter((value): value is string => value != null),
        relationshipNames: [relationshipName].filter((value): value is string => value != null),
        actionNames: [actionName].filter((value): value is string => value != null),
        columnHeaders,
        summary: 'Router-backed list/detail table columns must supply a non-empty header and exactly one of fieldName, relationshipName, or actionName.',
      });
      continue;
    }
    if (column.sortable === true || column.filterable === true) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedCollectionTableColumnFeature,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        fieldNames: [fieldName].filter((value): value is string => value != null),
        relationshipNames: [relationshipName].filter((value): value is string => value != null),
        actionNames: [actionName].filter((value): value is string => value != null),
        columnHeaders,
        summary: 'Router-backed list/detail table presentation does not yet emit routed query state for sortable/filterable columns; omit sortable/filterable or use a local collection table composition.',
      });
      continue;
    }
    if (fieldName == null) {
      const booleanDisplayTextIssue = routerBackedListDetailBooleanDisplayTextIssue({
        column,
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionTableColumn,
        targetRef,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        fieldName: null,
        relationshipName,
        actionName,
        columnHeader: header,
        summaryPrefix: 'Router-backed list/detail table presentation',
      });
      if (booleanDisplayTextIssue != null) {
        issues.push(booleanDisplayTextIssue);
        continue;
      }
    }

    const duplicateKey = fieldName != null
      ? `field:${fieldName}`
      : relationshipName != null
        ? `relationship:${relationshipName}`
        : `action:${actionName}`;
    if (seen.has(duplicateKey)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionTableColumn,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        fieldNames: [fieldName].filter((value): value is string => value != null),
        relationshipNames: [relationshipName].filter((value): value is string => value != null),
        actionNames: [actionName].filter((value): value is string => value != null),
        columnHeaders,
        summary: `Router-backed list/detail table column '${duplicateKey}' was supplied more than once.`,
      });
      continue;
    }
    seen.add(duplicateKey);

    if (fieldName != null) {
      const field = fieldsByName.get(fieldName) ?? null;
      if (field == null) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCollectionTableColumnField,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
          fieldNames: [fieldName, ...domain.fields.map((candidate) => candidate.name)],
          columnHeaders,
          summary: `Router-backed list/detail table field column '${fieldName}' is not present on primary entity '${domain.entityTypeName}'. Available fields: ${domain.fields.map((candidate) => candidate.name).join(', ')}.`,
        });
        continue;
      }
      if (column.displayKind === AppBuilderCollectionTableColumnDisplayKind.Action) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionTableColumn,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
          fieldNames: [fieldName],
          columnHeaders,
          summary: `Router-backed list/detail table field column '${fieldName}' cannot use displayKind '${AppBuilderCollectionTableColumnDisplayKind.Action}'.`,
        });
        continue;
      }
      const booleanDisplayTextIssue = routerBackedListDetailBooleanDisplayTextIssue({
        column,
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionTableColumn,
        targetRef,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        fieldName,
        fieldValueKind: field.valueKind,
        columnHeader: header,
        summaryPrefix: 'Router-backed list/detail table presentation',
      });
      if (booleanDisplayTextIssue != null) {
        issues.push(booleanDisplayTextIssue);
        continue;
      }
      selected.push({
        kind: AppBuilderRoutedCollectionDetailTableColumnKind.Field,
        column,
        header,
        fieldName,
      });
      continue;
    }

    if (relationshipName != null) {
      const relationship = relationshipsByName.get(relationshipName) ?? null;
      if (relationship == null) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCollectionTableColumnRelationship,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
          relationshipNames: [relationshipName, ...relationships.map((candidate) => candidate.relationship.name)],
          columnHeaders,
          summary: `Router-backed list/detail table relationship column '${relationshipName}' is not one of the source-spent routed relationships. Available relationships: ${relationships.map((candidate) => candidate.relationship.name).join(', ') || 'none'}.`,
        });
        continue;
      }
      if (
        column.displayKind != null
        && column.displayKind !== AppBuilderCollectionTableColumnDisplayKind.Relation
      ) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionTableColumn,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
          relationshipNames: [relationshipName],
          columnHeaders,
          summary: `Router-backed list/detail table relationship column '${relationshipName}' must use displayKind '${AppBuilderCollectionTableColumnDisplayKind.Relation}' when displayKind is supplied.`,
        });
        continue;
      }
      selected.push({
        kind: AppBuilderRoutedCollectionDetailTableColumnKind.Relationship,
        column,
        header,
        relationshipName,
      });
      continue;
    }

    if (actionName != null) {
      const action = actionsByName.get(actionName) ?? null;
      if (action == null) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCollectionTableColumnAction,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
          actionNames: [actionName, ...actions.map((candidate) => candidate.name)],
          columnHeaders,
          summary: `Router-backed list/detail table action column '${actionName}' is not present in supplied DomainActions. Available actions: ${actions.map((candidate) => candidate.name).join(', ') || 'none'}.`,
        });
        continue;
      }
      if (
        column.displayKind != null
        && column.displayKind !== AppBuilderCollectionTableColumnDisplayKind.Action
      ) {
        issues.push({
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionTableColumn,
          targetRef: targetRef ?? undefined,
          inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
          actionNames: [actionName],
          columnHeaders,
          summary: `Router-backed list/detail table action column '${actionName}' must use displayKind '${AppBuilderCollectionTableColumnDisplayKind.Action}' when displayKind is supplied.`,
        });
        continue;
      }
      if (action.scope === AppBuilderDomainActionScope.Navigation
        && navigationAction != null
        && navigationAction.actionName === actionName) {
        selected.push({
          kind: AppBuilderRoutedCollectionDetailTableColumnKind.NavigationAction,
          column,
          header,
          actionName,
        });
        continue;
      }

      if (action.scope === AppBuilderDomainActionScope.Entity
        && action.mutatesState === true
        && serviceCollection != null
        && routerBackedListDetailServiceUpdateMethodForAction(domain, serviceCollection, action) != null) {
        selected.push({
          kind: AppBuilderRoutedCollectionDetailTableColumnKind.RowCommandAction,
          column,
          header,
          actionName,
          rowCommandAction: action,
        });
        continue;
      }

      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailIncompatibleCollectionTableColumnAction,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        actionNames: [actionName],
        columnHeaders,
        summary: `Router-backed list/detail table action column '${actionName}' must either match the selected navigation-scoped route action or match an entity-scoped mutating DomainAction with a serviceCollection.updateMethods entry for its mutation fields.`,
      });
    }
  }

  return { value: selected, issues };
}

function selectRouterBackedListDetailRelatedCollections(
  requests: readonly AppBuilderSourceLoweringRouterBackedListDetailRelatedCollectionRequest[],
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly (AppBuilderSourceLoweringRouterBackedListDetailRelatedCollection & AppBuilderRoutedCollectionDetailRelatedCollectionSource)[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (requests.length === 0 || primaryDomain == null) {
    return { value: [], issues: [] };
  }

  const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const allFields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const selected: (AppBuilderSourceLoweringRouterBackedListDetailRelatedCollection & AppBuilderRoutedCollectionDetailRelatedCollectionSource)[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const seen = new Set<string>();
  for (const request of requests) {
    const relationshipName = normalizedSourceInputText(request.relationshipName);
    const title = normalizedSourceInputText(request.title);
    const itemLocalName = normalizedSourceInputText(request.itemLocalName);
    const tableColumns = request.tableColumns ?? [];
    if (
      relationshipName == null
      || title == null
      || itemLocalName == null
      || !appBuilderIsTypeScriptIdentifier(itemLocalName)
      || tableColumns.length === 0
    ) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        relationshipNames: relationshipName == null ? [] : [relationshipName],
        summary: 'Router-backed detail related collections need relationshipName, title, TypeScript-safe itemLocalName, and at least one tableColumns row.',
      });
      continue;
    }
    if (seen.has(relationshipName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: [relationshipName],
        summary: `Router-backed detail related collection '${relationshipName}' was supplied more than once.`,
      });
      continue;
    }
    seen.add(relationshipName);
    const relationship = relationships.find((candidate) => candidate.name === relationshipName) ?? null;
    if (relationship == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: [relationshipName],
        summary: `Router-backed detail related collection selected unknown relationship '${relationshipName}'. Available relationships: ${relationships.map((candidate) => candidate.name).join(', ') || 'none'}.`,
      });
      continue;
    }
    const relationshipIssues = routerBackedListDetailRelatedCollectionRelationshipIssues(targetRef, primaryDomain, relationship);
    if (relationshipIssues.length > 0) {
      issues.push(...relationshipIssues);
      continue;
    }
    const childEntityName = normalizedSourceInputText(relationship.fromEntityName);
    if (childEntityName == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        relationshipNames: [relationship.name],
        summary: `Router-backed detail related collection '${relationship.name}' needs fromEntityName so child rows can be materialized.`,
      });
      continue;
    }
    const childEntity = entities.find((entity) => domainEntityPayloadName(entity) === childEntityName) ?? null;
    if (childEntity == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.DomainEntities,
        relationshipNames: [relationship.name],
        summary: `Router-backed detail related collection '${relationship.name}' needs child DomainEntities payload '${childEntityName}'.`,
      });
      continue;
    }
    const childDomain = materializeDomainForEntityPayload(
      childEntity,
      sourcePlanDomainFieldsForEntity(allFields, childEntityName, entities.length),
      ROUTER_BACKED_LIST_DETAIL_DOMAIN_MATERIALIZATION_TARGET,
    );
    if (isDomainMaterializationIssueArray(childDomain)) {
      issues.push(...childDomain.map((issue) => ({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.DomainMaterializationIssue,
        targetRef: targetRef ?? undefined,
        inputFacetId: issue.slotKey === AppBuilderDomainSlotKey.FieldSchema
          ? AppBuilderInputFacetId.DomainFields
          : AppBuilderInputFacetId.DomainEntities,
        domainMaterializationIssue: issue,
        relationshipNames: [relationship.name],
        summary: `Detail related collection '${relationship.name}' child domain could not materialize: ${issue.summary}`,
      } satisfies AppBuilderSourceLoweringSourcePlanIssue)));
      continue;
    }
    const columnIssues = routerBackedListDetailRelatedCollectionColumnIssues(targetRef, childDomain, relationship, tableColumns);
    if (columnIssues.length > 0) {
      issues.push(...columnIssues);
      continue;
    }
    const records = appBuilderSourceLoweringSeedRecordsForEntity(suppliedInputs, childDomain.entityTypeName);
    issues.push(...seedRecordIdentityIssues(
      targetRef,
      childDomain,
      records,
      `detail related collection '${relationship.name}'`,
    ).map((issue) => ({
      ...issue,
      relationshipNames: [relationship.name],
    })));
    selected.push({
      relationship,
      domain: childDomain,
      seedDataSet: {
        id: records.length === 0 ? AppBuilderSeedDataSetId.None : AppBuilderSeedDataSetId.CallerSupplied,
        title: `${childDomain.entityTitle} related records`,
        summary: `Caller-supplied records for detail related collection '${relationship.name}'.`,
        audience: AppBuilderSeedDataAudience.CallerSupplied,
        density: AppBuilderSeedDataDensity.Small,
        purposes: records.length === 0
          ? [AppBuilderSeedDataPurpose.EmptyState]
          : [AppBuilderSeedDataPurpose.HappyPath],
        records,
      },
      title,
      itemLocalName,
      tableColumns,
    });
  }
  return { value: selected, issues };
}

function routerBackedListDetailRelatedCollectionRelationshipIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  primaryDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  if (relationship.kind !== AppBuilderDomainRelationshipKind.ReferenceOne) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Detail related collection '${relationship.name}' currently needs kind='${AppBuilderDomainRelationshipKind.ReferenceOne}' from child rows to the detail entity, not '${relationship.kind}'.`,
    });
  }
  if (relationship.toEntityName !== primaryDomain.entityTypeName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Detail related collection '${relationship.name}' must target current detail entity '${primaryDomain.entityTypeName}', not '${relationship.toEntityName}'.`,
    });
  }
  if ((relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity) !== AppBuilderDomainRelationshipLocalValueKind.Identity) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Detail related collection '${relationship.name}' currently supports identity-valued child foreign keys only.`,
    });
  }
  if (relationship.foreignFieldName !== primaryDomain.identityMemberName) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Detail related collection '${relationship.name}' needs foreignFieldName='${primaryDomain.identityMemberName}' so child rows can filter against the detail identity.`,
    });
  }
  if (relationship.localFieldName == null || relationship.localFieldName.trim().length === 0) {
    issues.push({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.DomainRelationships,
      relationshipNames: [relationship.name],
      summary: `Detail related collection '${relationship.name}' needs localFieldName on the child entity.`,
    });
  }
  return issues;
}

function routerBackedListDetailRelatedCollectionColumnIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  childDomain: AppBuilderDomainDescriptor,
  relationship: AppBuilderDomainRelationshipDescriptor,
  columns: readonly AppBuilderCollectionTableColumnPayload[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const seen = new Set<string>();
  for (const column of columns) {
    const fieldName = normalizedSourceInputText(column.fieldName);
    const routeBindingExpression = normalizedSourceInputText(column.routeBindingExpression);
    const key = fieldName != null
      ? `field:${fieldName}`
      : routeBindingExpression != null
        ? `route:${column.header}`
        : column.header;
    if (seen.has(key)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        relationshipNames: [relationship.name],
        summary: `Detail related collection '${relationship.name}' table column '${key}' was supplied more than once.`,
      });
      continue;
    }
    seen.add(key);
    if (fieldName != null && routeBindingExpression != null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        relationshipNames: [relationship.name],
        summary: `Detail related collection '${relationship.name}' table column '${column.header}' must be either field-backed or route-binding-backed, not both.`,
      });
      continue;
    }
    if (fieldName != null && childDomain.fields.every((field) => field.name !== fieldName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        relationshipNames: [relationship.name],
        fieldNames: [fieldName],
        summary: `Detail related collection '${relationship.name}' table column '${column.header}' references unknown child field '${fieldName}'.`,
      });
      continue;
    }
    if (fieldName != null) {
      const field = childDomain.fields.find((candidate) => candidate.name === fieldName)!;
      const booleanDisplayTextIssue = routerBackedListDetailBooleanDisplayTextIssue({
        column,
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        relationshipName: relationship.name,
        fieldName,
        fieldValueKind: field.valueKind,
        columnHeader: column.header,
        summaryPrefix: `Detail related collection '${relationship.name}' table presentation`,
      });
      if (booleanDisplayTextIssue != null) {
        issues.push(booleanDisplayTextIssue);
        continue;
      }
    }
    if (fieldName == null && routeBindingExpression == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        relationshipNames: [relationship.name],
        summary: `Detail related collection '${relationship.name}' table column '${column.header}' needs fieldName or routeBindingExpression.`,
      });
      continue;
    }
    if (fieldName == null) {
      const booleanDisplayTextIssue = routerBackedListDetailBooleanDisplayTextIssue({
        column,
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidDetailRelatedCollection,
        targetRef,
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        relationshipName: relationship.name,
        fieldName: null,
        columnHeader: column.header,
        summaryPrefix: `Detail related collection '${relationship.name}' table presentation`,
      });
      if (booleanDisplayTextIssue != null) {
        issues.push(booleanDisplayTextIssue);
      }
    }
  }
  return issues;
}

function routerBackedListDetailBooleanDisplayTextIssue(options: {
  readonly column: {
    readonly booleanTrueText?: string;
    readonly booleanFalseText?: string;
  };
  readonly issueKind: AppBuilderSourceLoweringSourcePlanIssueKind;
  readonly targetRef: AppBuilderOntologyRowRef | null;
  readonly inputFacetId: AppBuilderInputFacetId;
  readonly fieldName: string | null;
  readonly fieldValueKind?: AppBuilderDomainFieldValueKind;
  readonly relationshipName?: string | null;
  readonly actionName?: string | null;
  readonly columnHeader: string;
  readonly summaryPrefix: string;
}): AppBuilderSourceLoweringSourcePlanIssue | null {
  const trueText = normalizedSourceInputText(options.column.booleanTrueText);
  const falseText = normalizedSourceInputText(options.column.booleanFalseText);
  if (trueText == null && falseText == null) {
    return null;
  }
  const baseIssue = {
    issueKind: options.issueKind,
    targetRef: options.targetRef ?? undefined,
    inputFacetId: options.inputFacetId,
    fieldNames: [options.fieldName].filter((value): value is string => value != null),
    relationshipNames: [options.relationshipName].filter((value): value is string => value != null),
    actionNames: [options.actionName].filter((value): value is string => value != null),
    columnHeaders: [options.columnHeader],
  };
  if (trueText == null || falseText == null) {
    return {
      ...baseIssue,
      summary: `${options.summaryPrefix} column '${options.columnHeader}' must supply both booleanTrueText and booleanFalseText so source lowering does not invent visible status copy.`,
    };
  }
  if (options.fieldName == null) {
    return {
      ...baseIssue,
      summary: `${options.summaryPrefix} column '${options.columnHeader}' supplied boolean display text, but boolean display text is only valid for field-backed boolean columns.`,
    };
  }
  if (options.fieldValueKind !== AppBuilderDomainFieldValueKind.Boolean) {
    return {
      ...baseIssue,
      summary: `${options.summaryPrefix} column '${options.columnHeader}' supplied boolean display text for '${options.fieldName}', but that field is '${options.fieldValueKind}', not '${AppBuilderDomainFieldValueKind.Boolean}'.`,
    };
  }
  return null;
}

function routerBackedListDetailServiceUpdateMethodForAction(
  domain: AppBuilderDomainDescriptor,
  serviceCollection: AppBuilderSourceLoweringRouterBackedListDetailServiceCollection,
  action: AppBuilderDomainActionDescriptor,
): AppBuilderServiceCollectionUpdateMethodSourceModel | null {
  const mutationFieldNames = appBuilderEntityMutationFieldNamesForDomainActions([action], domain.fields);
  return serviceCollection.updateMethods.find((updateMethod) =>
    stringArraysEqual(updateMethod.inputFieldNames, mutationFieldNames)
  ) ?? null;
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }
    seen.add(value);
  }
  return [...duplicates];
}

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function selectLocalViewModelStatePolicy(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderSourceLoweringStatePolicyPayload | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const policies = appBuilderSourceLoweringStatePolicyPayloads(suppliedInputs);
  if (policies.length === 0) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingStatePolicy,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
        summary: `Local view-model state lowering requires AureliaStatePolicy with an explicit localStatePolicies selection.`,
      }],
    };
  }
  if (policies.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousLocalStatePolicy,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
        summary: `Local view-model state lowering received ${policies.length} state policy payloads; supply exactly one for this source plan.`,
      }],
    };
  }
  return { value: policies[0] ?? null, issues: [] };
}

function localViewModelActionFeedbackState(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderLocalViewModelActionFeedbackStateSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const feedbacks = appBuilderSourceLoweringActionFeedbackPayloads(suppliedInputs);
  const byStatusMember = new Map<string, AppBuilderLocalViewModelActionFeedbackStateSourceModel>();
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const feedback of feedbacks) {
    if (!appBuilderIsTypeScriptIdentifier(feedback.statusMemberName)) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidActionFeedbackDescriptor,
        targetRef: targetRef ?? undefined,
        actionNames: [feedback.actionName],
        statusMemberNames: [feedback.statusMemberName],
        summary: `Local view-model state cannot emit action feedback status member '${feedback.statusMemberName}' because it is not a TypeScript-safe identifier.`,
      });
      continue;
    }
    const existing = byStatusMember.get(feedback.statusMemberName);
    if (existing != null && existing.actionName !== feedback.actionName) {
      issues.push({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidActionFeedbackDescriptor,
        targetRef: targetRef ?? undefined,
        actionNames: [existing.actionName, feedback.actionName],
        statusMemberNames: [feedback.statusMemberName],
        summary: `Local view-model state received duplicate action feedback status member '${feedback.statusMemberName}' for multiple actions; choose distinct members or intentionally share through caller-owned source.`,
      });
      continue;
    }
    byStatusMember.set(feedback.statusMemberName, {
      actionName: feedback.actionName,
      statusMemberName: feedback.statusMemberName,
    });
  }
  return {
    value: [...byStatusMember.values()],
    issues,
  };
}

function routerBackedListDetailSeedDataSet(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderSeedDataSetDescriptor | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (domain == null) {
    return { value: null, issues: [] };
  }
  const records = appBuilderSourceLoweringSeedRecordsForEntity(suppliedInputs, domain.entityTypeName);
  const issues = seedRecordIdentityIssues(targetRef, domain, records, 'router-backed list/detail navigation');
  return {
    value: seedDataSetForRecords(
      records,
      'Caller-Supplied Seed Records',
      'Caller-supplied seed records for a router-backed list/detail source plan.',
    ),
    issues,
  };
}

function diStateClassSeedRecords(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderSeedRecord[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (domain == null) {
    return { value: [], issues: [] };
  }
  const records = appBuilderSourceLoweringSeedRecordsForEntity(suppliedInputs, domain.entityTypeName);
  const issues = seedRecordIdentityIssues(targetRef, domain, records, 'DI state-class collection initialization');
  return { value: records, issues };
}

function localViewModelCollectionSeedRecords(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: readonly AppBuilderSeedRecord[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  if (domain == null) {
    return { value: [], issues: [] };
  }
  const records = appBuilderSourceLoweringSeedRecordsForEntity(suppliedInputs, domain.entityTypeName);
  const issues = seedRecordIdentityIssues(targetRef, domain, records, 'local view-model collection initialization');
  return { value: records, issues };
}

function seedDataSetForRecords(
  records: readonly AppBuilderSeedRecord[],
  title: string,
  summary: string,
): AppBuilderSeedDataSetDescriptor {
  return {
    id: records.length === 0 ? AppBuilderSeedDataSetId.None : AppBuilderSeedDataSetId.CallerSupplied,
    title: records.length === 0 ? 'No Seed Records' : title,
    summary: records.length === 0
      ? 'Explicit empty seed data set for this source plan.'
      : summary,
    audience: AppBuilderSeedDataAudience.CallerSupplied,
    density: seedDensityForRecordCount(records.length),
    purposes: records.length === 0
      ? [AppBuilderSeedDataPurpose.EmptyState]
      : [AppBuilderSeedDataPurpose.HappyPath],
    records,
  };
}

function seedRecordIdentityIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  domain: AppBuilderDomainDescriptor,
  records: readonly AppBuilderSeedRecord[],
  purpose: string,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return records.flatMap((record, index): readonly AppBuilderSourceLoweringSourcePlanIssue[] => {
    const identityValue = record[domain.identityMemberName];
    if (!isScalarSeedRecordIdentityValue(identityValue)) {
      return [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SeedRecordMissingIdentityValue,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        seedRecordIndex: index,
        summary: `Seed record ${index} must supply scalar identity member '${domain.identityMemberName}' for ${purpose}.`,
      }];
    }
    if (!seedRecordIdentityValueMatchesKind(identityValue, domain.identityValueKind)) {
      return [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SeedRecordInvalidIdentityValueKind,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        seedRecordIndex: index,
        summary: `Seed record ${index} identity member '${domain.identityMemberName}' must be a ${domain.identityValueKind} value for ${purpose}.`,
      }];
    }
    return [];
  });
}

function isScalarSeedRecordIdentityValue(
  value: AppBuilderSeedRecord[string] | undefined,
): value is string | number | boolean {
  return typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean';
}

function isSeedRecordObjectArray(
  value: AppBuilderSeedRecord[string] | undefined,
): value is readonly AppBuilderSeedRecordObject[] {
  return Array.isArray(value)
    && value.every((entry) => typeof entry === 'object' && entry !== null && !Array.isArray(entry));
}

function isSeedRecordObject(
  value: AppBuilderSeedRecord[string] | undefined,
): value is AppBuilderSeedRecordObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function seedRecordIdentityValueMatchesKind(
  value: string | number | boolean,
  valueKind: AppBuilderDomainIdentityValueKind,
): boolean {
  switch (valueKind) {
    case AppBuilderDomainIdentityValueKind.String:
      return typeof value === 'string';
    case AppBuilderDomainIdentityValueKind.Number:
      return typeof value === 'number';
  }
}

export function selectDirectSourcePlanAppName(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: string | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const appNames = uniqueValues(appBuilderSourceLoweringSourceNamingPayloads(suppliedInputs)
    .map((payload) => normalizedSourceInputText(payload.appName))
    .filter((value): value is string => value != null));
  if (appNames.length === 0) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingAppName,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SourceNaming,
        summary: 'Direct SourcePlan lowering requires SourceNaming.appName; app-builder will not invent an application name.',
      }],
    };
  }
  if (appNames.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousAppName,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SourceNaming,
        summary: `Direct SourcePlan lowering received multiple app names: ${appNames.join(', ')}.`,
      }],
    };
  }
  return { value: appNames[0] ?? null, issues: [] };
}

export function selectDirectSourcePlanClassName(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: string | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const baseNames = uniqueValues(appBuilderSourceLoweringSourceNamingPayloads(suppliedInputs)
    .map((payload) => normalizedSourceInputText(payload.baseName))
    .filter((value): value is string => value != null));
  if (baseNames.length === 0) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingBaseName,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SourceNaming,
        summary: 'Direct local view-model state SourcePlan lowering requires SourceNaming.baseName; app-builder will not invent a component class name.',
      }],
    };
  }
  if (baseNames.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousBaseName,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SourceNaming,
        summary: `Direct local view-model state SourcePlan lowering received multiple base names: ${baseNames.join(', ')}.`,
      }],
    };
  }
  const className = appBuilderPascalCase(baseNames[0]!);
  if (!appBuilderIsTypeScriptIdentifier(className)) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InvalidClassName,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SourceNaming,
        summary: `Direct local view-model state SourcePlan lowering could not derive a TypeScript class name from base name '${baseNames[0]}'.`,
      }],
    };
  }
  return { value: className, issues: [] };
}

export function selectDirectSourcePlanResourceCarrier(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderResourceCarrier | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const carriers = uniqueValues(appBuilderSourceLoweringSourceFileLayoutPayloads(suppliedInputs)
    .map((payload) => payload.resourceCarrier)
    .filter((value): value is AppBuilderResourceCarrier => value != null));
  if (carriers.length === 0) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingResourceCarrier,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
        summary: 'Direct SourcePlan lowering requires SourceFileLayout.resourceCarrier so resource declaration policy is explicit.',
      }],
    };
  }
  if (carriers.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousResourceCarrier,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
        summary: `Direct SourcePlan lowering received multiple resource carriers: ${carriers.join(', ')}.`,
      }],
    };
  }
  const carrier = carriers[0] ?? null;
  if (carrier === AppBuilderResourceCarrier.AttributePatternCreate) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedResourceCarrier,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
        resourceCarrier: carrier,
        summary: `Direct SourcePlan lowering cannot emit carrier '${carrier}' for a custom-element pattern.`,
      }],
    };
  }
  return { value: carrier, issues: [] };
}

export function selectDirectSourcePlanConventionPolicy(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): {
  readonly value: AppBuilderConventionPolicy | null;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const policies = uniqueValues(appBuilderSourceLoweringConventionPolicyPayloads(suppliedInputs));
  if (policies.length === 0) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingConventionPolicy,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
        summary: 'Direct SourcePlan lowering requires AureliaConventionPolicy so convention reliance is explicit.',
      }],
    };
  }
  if (policies.length > 1) {
    return {
      value: null,
      issues: [{
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousConventionPolicy,
        targetRef: targetRef ?? undefined,
        inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
        summary: `Direct SourcePlan lowering received multiple convention policies: ${policies.join(', ')}.`,
      }],
    };
  }
  return { value: policies[0] ?? null, issues: [] };
}

export function directCustomElementSourceLayoutIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return uniqueValues(appBuilderSourceLoweringSourceFileLayoutPayloads(suppliedInputs)
    .map((payload) => payload.customElementViewForm)
    .filter((value): value is AppBuilderCustomElementViewForm =>
      value != null && value !== AppBuilderCustomElementViewForm.CompanionFile
    ))
    .map((customElementViewForm) => ({
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedCustomElementViewForm,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
      customElementViewForm,
      summary: `Direct SourcePlan lowering currently emits companion-file custom-element templates, not '${customElementViewForm}'.`,
    }));
}

export function directConventionCarrierIssues(
  targetRef: AppBuilderOntologyRowRef | null,
  conventionPolicy: AppBuilderConventionPolicy | null,
  resourceCarrier: AppBuilderResourceCarrier | null,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  if (
    conventionPolicy === AppBuilderConventionPolicy.ExplicitResourceDeclarations
    && resourceCarrier === AppBuilderResourceCarrier.Convention
  ) {
    return [{
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.InconsistentConventionCarrier,
      targetRef: targetRef ?? undefined,
      inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
      conventionPolicy,
      resourceCarrier,
      summary: 'Direct SourcePlan lowering cannot use the convention carrier when AureliaConventionPolicy is explicit-resource-declarations.',
    }];
  }
  return [];
}

function isAppShellTargetRef(
  targetRef: AppBuilderOntologyRowRef,
): boolean {
  return targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.AppShell;
}

function isApplicationAssemblyTargetRef(
  targetRef: AppBuilderOntologyRowRef,
): boolean {
  return targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.ApplicationAssembly;
}

function isRouterBackedListDetailTargetRef(
  targetRef: AppBuilderOntologyRowRef,
): boolean {
  return targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.RouterBackedListDetail;
}

function isDiStateClassTargetRef(
  targetRef: AppBuilderOntologyRowRef,
): boolean {
  return targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.DiStateClass;
}

function isLocalViewModelStateTargetRef(
  targetRef: AppBuilderOntologyRowRef,
): boolean {
  return targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.LocalViewModelState;
}

function seedDensityForRecordCount(
  recordCount: number,
): AppBuilderSeedDataDensity {
  if (recordCount === 0) {
    return AppBuilderSeedDataDensity.None;
  }
  if (recordCount === 1) {
    return AppBuilderSeedDataDensity.Minimal;
  }
  return recordCount <= 3
    ? AppBuilderSeedDataDensity.Small
    : AppBuilderSeedDataDensity.Rich;
}
