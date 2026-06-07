import {
  AppBuilderConventionPolicy,
  AppBuilderCustomElementViewForm,
  AppBuilderResourceCarrier,
} from '../aurelia-lowering-option.js';
import type {
  AppBuilderDomainActionDescriptor,
  AppBuilderDomainFieldDescriptor,
  AppBuilderDomainRelationshipDescriptor,
} from '../domain-model.js';
import type {
  AppBuilderDomainDescriptor,
} from '../domain-descriptor.js';
import type {
  AppBuilderDomainMaterializationIssue,
} from '../domain-materialization.js';
import type {
  AppBuilderSeedDataSetDescriptor,
  AppBuilderSeedRecord,
} from '../seed-data.js';
import type {
  AppBuilderRoutedCollectionDetailSourceRequest,
} from '../routed-collection-detail-source.js';
import type {
  AppBuilderLocalViewModelFieldObjectStateSourceModel,
} from '../local-view-model-state-source.js';
import type {
  AppBuilderServiceCollectionFilterPredicateKind as AppBuilderServiceCollectionFilterPredicateKindValue,
} from '../service-boundary-source.js';
import type {
  SourcePlan,
} from '../../source-plan/source-plan.js';
import type {
  AppBuilderPartSourceFragment,
} from '../part-source-invocation.js';
import {
  AppBuilderPartSourceFragmentKind,
} from '../part-source-invocation.js';
import type {
  AppBuilderControlUseInventoryRow,
} from './control-use-inventory.js';
import type {
  AppBuilderCollectionFeatureId as AppBuilderCollectionFeatureIdValue,
} from './collection.js';
import type {
  AppBuilderCollectionTableColumnPayload,
} from './collection-projection.js';
import type {
  AppBuilderEffectContractId as AppBuilderEffectContractIdValue,
} from './effect.js';
import {
  AppBuilderInputFacetId,
} from './input.js';
import type {
  AppBuilderSuppliedInput,
} from './input-readiness.js';
import type {
  AppBuilderOntologyRowRef,
} from './relation.js';
import type {
  AppBuilderSourceLoweringActionFeedbackPayload,
  AppBuilderSourceLoweringRoutingPolicyPayload,
  AppBuilderSourceLoweringStatePolicyPayload,
} from './source-lowering-inputs.js';
import type {
  AppBuilderSourceLoweringComposition,
  AppBuilderSourceLoweringCompositionIssue,
  AppBuilderSourceLoweringCompositionRequest,
} from './source-lowering-composition-contracts.js';
import type {
  AppBuilderSourceLoweringInvocation,
  AppBuilderSourceLoweringInvocationIssue,
  AppBuilderSourceLoweringInvocationRequest,
} from './source-lowering-invocation.js';
import type {
  AppBuilderSourceLoweringPreflight,
  AppBuilderSourceLoweringPreflightIssue,
  AppBuilderSourceLoweringPreflightRow,
} from './source-lowering-preflight.js';
import type {
  AppBuilderSourceLoweringSourcePlanSelectionKind,
  AppBuilderSourceLoweringRequestFieldRequirement,
  AppBuilderSourceLoweringRequestFieldSummary,
} from './source-lowering-request-field.js';
import type {
  AppBuilderExpectedSemanticEffectPreview,
} from './semantic-effect-witness.js';
import type {
  ExpectedSemanticEffectKind,
} from '../../fixture-verification/expected-effect.js';
import type {
  AppBuilderDecisionBundle,
  AppBuilderDecisionBundleExpansionRow,
} from '../policy/decision-bundle.js';
import type {
  AppBuilderSourcePlanWitnessRow,
} from './source-plan-witness.js';

/** Source-lowering source-plan issue category. */
export enum AppBuilderSourceLoweringSourcePlanIssueKind {
  /** The request omitted the root directory for the previewed SourcePlan. */
  MissingRootDir = 'missing-root-dir',
  /** The request omitted the template file path for the previewed SourcePlan artifact. */
  MissingTemplatePath = 'missing-template-path',
  /** The request omitted a non-template source file path for a direct SourcePlan artifact. */
  MissingSourceTargetPath = 'missing-source-target-path',
  /** The component-pair SourcePlan request omitted the template composition that owns HTML file text. */
  MissingComponentPairTemplateComposition = 'missing-component-pair-template-composition',
  /** The component-pair service collection request omitted its generated service file path. */
  MissingComponentPairServiceCollectionPath = 'missing-component-pair-service-collection-path',
  /** The component-pair service collection request supplied a non-identifier service class name. */
  InvalidComponentPairServiceCollectionClassName = 'invalid-component-pair-service-collection-class-name',
  /** The component-pair service collection request supplied a non-identifier component member name. */
  InvalidComponentPairServiceCollectionMemberName = 'invalid-component-pair-service-collection-member-name',
  /** The component-pair service collection request supplied a non-identifier record type name. */
  InvalidComponentPairServiceCollectionRecordTypeName = 'invalid-component-pair-service-collection-record-type-name',
  /** The component-pair service collection request supplied a non-identifier load method name. */
  InvalidComponentPairServiceCollectionLoadMethodName = 'invalid-component-pair-service-collection-load-method-name',
  /** The component-pair service collection request supplied a malformed filter-method descriptor. */
  InvalidComponentPairServiceCollectionFilterMethod = 'invalid-component-pair-service-collection-filter-method',
  /** The component-pair service collection request supplied a malformed create-method descriptor. */
  InvalidComponentPairServiceCollectionCreateMethod = 'invalid-component-pair-service-collection-create-method',
  /** The component-pair service collection request supplied a malformed update-method descriptor. */
  InvalidComponentPairServiceCollectionUpdateMethod = 'invalid-component-pair-service-collection-update-method',
  /** The component-pair service collection request supplied a malformed query-state descriptor. */
  InvalidComponentPairServiceCollectionQueryState = 'invalid-component-pair-service-collection-query-state',
  /** The component-pair service collection request could not select one domain entity from supplied inputs. */
  InvalidComponentPairServiceCollectionDomainEntity = 'invalid-component-pair-service-collection-domain-entity',
  /** The direct app-shell SourcePlan request omitted its exact AppShell target row. */
  MissingAppShellTargetRef = 'missing-app-shell-target-ref',
  /** The direct app-shell SourcePlan request named a target outside the app-builder ontology. */
  UnknownAppShellTarget = 'unknown-app-shell-target',
  /** The direct app-shell SourcePlan request named a non-AppShell target row. */
  UnsupportedAppShellTarget = 'unsupported-app-shell-target',
  /** The AppShell target is not registered for direct SourcePlan lowering. */
  SourceLoweringAppShellNotImplemented = 'source-lowering-app-shell-not-implemented',
  /** AppShell source lowering is blocked by missing required app-builder inputs. */
  AppShellMissingRequiredInput = 'app-shell-missing-required-input',
  /** AppShell source lowering is blocked by invalid supplied app-builder input payloads. */
  AppShellInvalidSuppliedPayload = 'app-shell-invalid-supplied-payload',
  /** The direct application assembly SourcePlan request omitted its exact target row. */
  MissingApplicationAssemblyTargetRef = 'missing-application-assembly-target-ref',
  /** The direct application assembly SourcePlan request named a target outside the app-builder ontology. */
  UnknownApplicationAssemblyTarget = 'unknown-application-assembly-target',
  /** The direct application assembly SourcePlan request named a non-application-assembly target row. */
  UnsupportedApplicationAssemblyTarget = 'unsupported-application-assembly-target',
  /** The ApplicationAssembly target is not registered for direct SourcePlan lowering. */
  SourceLoweringApplicationAssemblyNotImplemented = 'source-lowering-application-assembly-not-implemented',
  /** ApplicationAssembly source lowering is blocked by missing required app-builder inputs. */
  ApplicationAssemblyMissingRequiredInput = 'application-assembly-missing-required-input',
  /** ApplicationAssembly source lowering is blocked by invalid supplied app-builder input payloads. */
  ApplicationAssemblyInvalidSuppliedPayload = 'application-assembly-invalid-supplied-payload',
  /** ApplicationAssembly source lowering did not receive at least one child route area. */
  ApplicationAssemblyMissingRouteArea = 'application-assembly-missing-route-area',
  /** ApplicationAssembly source lowering received a child route area it cannot safely compose yet. */
  ApplicationAssemblyUnsupportedRouteArea = 'application-assembly-unsupported-route-area',
  /** The direct router-backed list/detail request omitted its exact target row. */
  MissingRouterBackedListDetailTargetRef = 'missing-router-backed-list-detail-target-ref',
  /** The direct router-backed list/detail request named a target outside the app-builder ontology. */
  UnknownRouterBackedListDetailTarget = 'unknown-router-backed-list-detail-target',
  /** The direct router-backed list/detail request named a non-router-backed-list/detail target row. */
  UnsupportedRouterBackedListDetailTarget = 'unsupported-router-backed-list-detail-target',
  /** The router-backed list/detail target is not registered for direct SourcePlan lowering. */
  SourceLoweringRouterBackedListDetailNotImplemented = 'source-lowering-router-backed-list-detail-not-implemented',
  /** Router-backed list/detail lowering is blocked by missing required app-builder inputs. */
  RouterBackedListDetailMissingRequiredInput = 'router-backed-list-detail-missing-required-input',
  /** Router-backed list/detail lowering is blocked by invalid supplied app-builder input payloads. */
  RouterBackedListDetailInvalidSuppliedPayload = 'router-backed-list-detail-invalid-supplied-payload',
  /** The router-backed list/detail service request supplied a non-identifier service class name. */
  InvalidRouterBackedListDetailServiceCollectionClassName = 'invalid-router-backed-list-detail-service-collection-class-name',
  /** The router-backed list/detail service request supplied a non-identifier load method name. */
  InvalidRouterBackedListDetailServiceCollectionLoadMethodName = 'invalid-router-backed-list-detail-service-collection-load-method-name',
  /** The router-backed list/detail service request supplied a non-identifier find method name. */
  InvalidRouterBackedListDetailServiceCollectionFindMethodName = 'invalid-router-backed-list-detail-service-collection-find-method-name',
  /** The router-backed list/detail service request supplied a non-identifier create method name. */
  InvalidRouterBackedListDetailServiceCollectionCreateMethodName = 'invalid-router-backed-list-detail-service-collection-create-method-name',
  /** The router-backed list/detail service request supplied a malformed filter-method descriptor. */
  InvalidRouterBackedListDetailServiceCollectionFilterMethod = 'invalid-router-backed-list-detail-service-collection-filter-method',
  /** The router-backed list/detail service request supplied a malformed update-method descriptor. */
  InvalidRouterBackedListDetailServiceCollectionUpdateMethod = 'invalid-router-backed-list-detail-service-collection-update-method',
  /** The router-backed list/detail service request supplied a malformed query-control descriptor. */
  InvalidRouterBackedListDetailServiceCollectionQueryControl = 'invalid-router-backed-list-detail-service-collection-query-control',
  /** Router-backed list/detail create feedback received multiple payloads for one create action. */
  RouterBackedListDetailDuplicateCreateActionFeedback = 'router-backed-list-detail-duplicate-create-action-feedback',
  /** Router-backed list/detail create feedback supplied a non-identifier status member. */
  RouterBackedListDetailInvalidCreateActionFeedbackStatusMember = 'router-backed-list-detail-invalid-create-action-feedback-status-member',
  /** The direct DI state-class SourcePlan request omitted its exact target row. */
  MissingDiStateClassTargetRef = 'missing-di-state-class-target-ref',
  /** The direct DI state-class SourcePlan request named a target outside the app-builder ontology. */
  UnknownDiStateClassTarget = 'unknown-di-state-class-target',
  /** The direct DI state-class SourcePlan request named a non-DI-state-class target row. */
  UnsupportedDiStateClassTarget = 'unsupported-di-state-class-target',
  /** The DI state-class target is not registered for direct SourcePlan lowering. */
  SourceLoweringDiStateClassNotImplemented = 'source-lowering-di-state-class-not-implemented',
  /** DI state-class lowering is blocked by missing required app-builder inputs. */
  DiStateClassMissingRequiredInput = 'di-state-class-missing-required-input',
  /** DI state-class lowering is blocked by invalid supplied app-builder input payloads. */
  DiStateClassInvalidSuppliedPayload = 'di-state-class-invalid-supplied-payload',
  /** The direct local view-model state SourcePlan request omitted its exact target row. */
  MissingLocalViewModelStateTargetRef = 'missing-local-view-model-state-target-ref',
  /** The direct local view-model state SourcePlan request named a target outside the app-builder ontology. */
  UnknownLocalViewModelStateTarget = 'unknown-local-view-model-state-target',
  /** The direct local view-model state SourcePlan request named a non-local-view-model-state target row. */
  UnsupportedLocalViewModelStateTarget = 'unsupported-local-view-model-state-target',
  /** The local view-model state target is not registered for direct SourcePlan lowering. */
  SourceLoweringLocalViewModelStateNotImplemented = 'source-lowering-local-view-model-state-not-implemented',
  /** Local view-model state lowering is blocked by missing required app-builder inputs. */
  LocalViewModelStateMissingRequiredInput = 'local-view-model-state-missing-required-input',
  /** Local view-model state lowering is blocked by invalid supplied app-builder input payloads. */
  LocalViewModelStateInvalidSuppliedPayload = 'local-view-model-state-invalid-supplied-payload',
  /** Local view-model collection lowering received relationship descriptors it cannot spend as source. */
  LocalViewModelStateUnsupportedRelationship = 'local-view-model-state-unsupported-relationship',
  /** Local view-model collection lowering could not identify the primary entity from multi-entity relationship input. */
  LocalViewModelStateAmbiguousRelationshipPrimaryEntity = 'local-view-model-state-ambiguous-relationship-primary-entity',
  /** Local view-model collection lowering could not find or materialize a related relationship entity. */
  LocalViewModelStateInvalidRelationshipEntity = 'local-view-model-state-invalid-relationship-entity',
  /** Local view-model collection lowering received an incomplete relationship descriptor for reference lookup source. */
  LocalViewModelStateInvalidRelationshipDescriptor = 'local-view-model-state-invalid-relationship-descriptor',
  /** Local view-model collection query lowering received query fields it cannot spend as source. */
  LocalViewModelStateInvalidCollectionQueryDescriptor = 'local-view-model-state-invalid-collection-query-descriptor',
  /** Local view-model state lowering received action-feedback state it cannot spend as source. */
  LocalViewModelStateInvalidActionFeedbackDescriptor = 'local-view-model-state-invalid-action-feedback-descriptor',
  /** Local view-model state lowering received more than one state policy payload. */
  AmbiguousLocalStatePolicy = 'ambiguous-local-state-policy',
  /** Direct SourcePlan lowering is blocked by target-specific preflight requirements. */
  TargetRequirementIssue = 'target-requirement-issue',
  /** The direct custom-element SourcePlan request did not supply an app name through SourceNaming. */
  MissingAppName = 'missing-app-name',
  /** The direct custom-element SourcePlan request supplied more than one app name. */
  AmbiguousAppName = 'ambiguous-app-name',
  /** The direct component SourcePlan request did not supply a base name through SourceNaming. */
  MissingBaseName = 'missing-base-name',
  /** The direct component SourcePlan request supplied more than one base name. */
  AmbiguousBaseName = 'ambiguous-base-name',
  /** The selected SourceNaming.baseName did not produce a usable TypeScript class name. */
  InvalidClassName = 'invalid-class-name',
  /** The direct custom-element SourcePlan request did not supply a custom-element resource carrier. */
  MissingResourceCarrier = 'missing-resource-carrier',
  /** The direct custom-element SourcePlan request supplied more than one custom-element resource carrier. */
  AmbiguousResourceCarrier = 'ambiguous-resource-carrier',
  /** The direct custom-element SourcePlan request supplied a resource carrier this lowerer cannot emit. */
  UnsupportedResourceCarrier = 'unsupported-resource-carrier',
  /** The direct custom-element SourcePlan request did not supply convention policy. */
  MissingConventionPolicy = 'missing-convention-policy',
  /** The direct custom-element SourcePlan request supplied more than one convention policy. */
  AmbiguousConventionPolicy = 'ambiguous-convention-policy',
  /** Convention policy and selected resource carrier contradict one another. */
  InconsistentConventionCarrier = 'inconsistent-convention-carrier',
  /** The direct custom-element SourcePlan request selected a view form this lowerer cannot emit. */
  UnsupportedCustomElementViewForm = 'unsupported-custom-element-view-form',
  /** Router-backed list/detail lowering did not receive exactly one domain entity payload. */
  MissingDomainEntity = 'missing-domain-entity',
  /** Router-backed list/detail lowering received more than one domain entity payload. */
  AmbiguousDomainEntity = 'ambiguous-domain-entity',
  /** Router-backed list/detail lowering could not match an explicit primary entity name to supplied DomainEntities. */
  InvalidPrimaryDomainEntity = 'invalid-primary-domain-entity',
  /** Caller domain slots did not materialize into a supported source-lowering domain descriptor. */
  DomainMaterializationIssue = 'domain-materialization-issue',
  /** Router-backed list/detail lowering did not receive routing policy. */
  MissingRoutingPolicy = 'missing-routing-policy',
  /** Router-backed list/detail lowering received more than one routing policy payload. */
  AmbiguousRoutingPolicy = 'ambiguous-routing-policy',
  /** Router-backed list/detail lowering cannot emit the selected router admission policy. */
  UnsupportedRouterAdmission = 'unsupported-router-admission',
  /** Router-backed list/detail lowering cannot emit the selected area navigation policy. */
  UnsupportedAreaNavigationPolicy = 'unsupported-area-navigation-policy',
  /** Router-backed list/detail lowering did not receive state ownership policy. */
  MissingStatePolicy = 'missing-state-policy',
  /** Router-backed list/detail lowering received more than one state policy payload. */
  AmbiguousStatePolicy = 'ambiguous-state-policy',
  /** Router-backed list/detail lowering cannot emit the selected state policy. */
  UnsupportedStatePolicy = 'unsupported-state-policy',
  /** Router-backed list/detail lowering selected link text without selecting a navigation action. */
  RouterBackedListDetailMissingNavigationAction = 'router-backed-list-detail-missing-navigation-action',
  /** Router-backed list/detail lowering selected a navigation action but no DomainActions payload was supplied. */
  RouterBackedListDetailMissingDomainActions = 'router-backed-list-detail-missing-domain-actions',
  /** Router-backed list/detail lowering selected an action name absent from DomainActions. */
  RouterBackedListDetailUnknownNavigationAction = 'router-backed-list-detail-unknown-navigation-action',
  /** Router-backed list/detail lowering selected an action whose scope is not navigation. */
  RouterBackedListDetailIncompatibleNavigationAction = 'router-backed-list-detail-incompatible-navigation-action',
  /** Router-backed list/detail lowering selected a navigation action without caller-supplied visible link text. */
  RouterBackedListDetailMissingNavigationLinkText = 'router-backed-list-detail-missing-navigation-link-text',
  /** Router-backed list/detail create form was supplied without a form-scoped create action. */
  RouterBackedListDetailMissingCreateAction = 'router-backed-list-detail-missing-create-action',
  /** Router-backed list/detail create form selected an action but no DomainActions payload was supplied. */
  RouterBackedListDetailMissingCreateDomainActions = 'router-backed-list-detail-missing-create-domain-actions',
  /** Router-backed list/detail create form selected an action name absent from DomainActions. */
  RouterBackedListDetailUnknownCreateAction = 'router-backed-list-detail-unknown-create-action',
  /** Router-backed list/detail create form selected an action that is not a form-scoped create action. */
  RouterBackedListDetailIncompatibleCreateAction = 'router-backed-list-detail-incompatible-create-action',
  /** Router-backed list/detail create form did not receive explicit ordered fieldNames. */
  RouterBackedListDetailMissingCreateFieldSelection = 'router-backed-list-detail-missing-create-field-selection',
  /** Router-backed list/detail create form selected a field absent from the primary domain. */
  RouterBackedListDetailUnknownCreateField = 'router-backed-list-detail-unknown-create-field',
  /** Router-backed list/detail create form selected duplicate or otherwise invalid field names. */
  RouterBackedListDetailInvalidCreateFieldSelection = 'router-backed-list-detail-invalid-create-field-selection',
  /** Router-backed list/detail create form selected a field that this source cannot spend yet. */
  RouterBackedListDetailUnsupportedCreateField = 'router-backed-list-detail-unsupported-create-field',
  /** Router-backed list/detail create form selected a non-numeric identity strategy this source cannot allocate yet. */
  RouterBackedListDetailUnsupportedCreateIdentityValueKind = 'router-backed-list-detail-unsupported-create-identity-value-kind',
  /** Router-backed list/detail create form omitted visible submit button text. */
  RouterBackedListDetailMissingCreateSubmitButtonText = 'router-backed-list-detail-missing-create-submit-button-text',
  /** Router-backed list/detail lowering received relationship descriptors but no source-spendable reference-one relationship. */
  RouterBackedListDetailUnsupportedRelationship = 'router-backed-list-detail-unsupported-relationship',
  /** Router-backed list/detail lowering could not identify the primary entity from multi-entity relationship input. */
  RouterBackedListDetailAmbiguousRelationshipPrimaryEntity = 'router-backed-list-detail-ambiguous-relationship-primary-entity',
  /** Router-backed list/detail lowering could not find or materialize a related relationship entity. */
  RouterBackedListDetailInvalidRelationshipEntity = 'router-backed-list-detail-invalid-relationship-entity',
  /** Router-backed list/detail lowering received an incomplete relationship descriptor for reference lookup source. */
  RouterBackedListDetailInvalidRelationshipDescriptor = 'router-backed-list-detail-invalid-relationship-descriptor',
  /** Router-backed list/detail lowering received an invalid CollectionTableColumns payload. */
  RouterBackedListDetailInvalidCollectionTableColumn = 'router-backed-list-detail-invalid-collection-table-column',
  /** Router-backed list/detail table presentation selected a field absent from the primary domain. */
  RouterBackedListDetailUnknownCollectionTableColumnField = 'router-backed-list-detail-unknown-collection-table-column-field',
  /** Router-backed list/detail table presentation selected a relationship not spent by routed source. */
  RouterBackedListDetailUnknownCollectionTableColumnRelationship = 'router-backed-list-detail-unknown-collection-table-column-relationship',
  /** Router-backed list/detail table presentation selected an action absent from DomainActions. */
  RouterBackedListDetailUnknownCollectionTableColumnAction = 'router-backed-list-detail-unknown-collection-table-column-action',
  /** Router-backed list/detail table presentation selected an action that is not its row navigation action. */
  RouterBackedListDetailIncompatibleCollectionTableColumnAction = 'router-backed-list-detail-incompatible-collection-table-column-action',
  /** Router-backed list/detail table presentation selected a table feature this source cannot emit yet. */
  RouterBackedListDetailUnsupportedCollectionTableColumnFeature = 'router-backed-list-detail-unsupported-collection-table-column-feature',
  /** Router-backed list/detail detail route received an invalid inverse related collection descriptor. */
  RouterBackedListDetailInvalidDetailRelatedCollection = 'router-backed-list-detail-invalid-detail-related-collection',
  /** A caller-supplied seed record is missing the selected identity member value. */
  SeedRecordMissingIdentityValue = 'seed-record-missing-identity-value',
  /** A caller-supplied seed record identity value does not match the selected identity value kind. */
  SeedRecordInvalidIdentityValueKind = 'seed-record-invalid-identity-value-kind',
  /** Direct rootDir transport and supplied SourceRoot input disagree. */
  ConflictingSourceRoot = 'conflicting-source-root',
  /** Direct templatePath transport and supplied SourceTargetPath input disagree. */
  ConflictingSourceTargetPath = 'conflicting-source-target-path',
  /** The request supplied neither invocation nor composition input. */
  MissingSourceLoweringSelection = 'missing-source-lowering-selection',
  /** The request supplied more than one source-lowering selection. */
  MultipleSourceLoweringSelections = 'multiple-source-lowering-selections',
  /** The selected invocation produced one or more lower-level issues. */
  SourceLoweringInvocationIssue = 'source-lowering-invocation-issue',
  /** The selected composition produced one or more lower-level issues. */
  SourceLoweringCompositionIssue = 'source-lowering-composition-issue',
  /** The selected lowering produced no complete HTML-template fragments for file text. */
  MissingTemplateFragments = 'missing-template-fragments',
  /** The selected lowering produced a fragment kind that cannot be emitted as top-level HTML template text. */
  UnsupportedTemplateFragmentKind = 'unsupported-template-fragment-kind',
  /** The selected lowering produced a fragment kind that cannot be emitted as a TypeScript top-level declaration. */
  UnsupportedTypeScriptTopLevelFragmentKind = 'unsupported-typescript-top-level-fragment-kind',
  /** The selected lowering produced a fragment kind that cannot be emitted as a TypeScript class member. */
  UnsupportedClassMemberFragmentKind = 'unsupported-class-member-fragment-kind',
}

/** Stable value list for source-lowering source-plan issue transport schemas. */
export const APP_BUILDER_SOURCE_LOWERING_SOURCE_PLAN_ISSUE_KINDS = [
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingRootDir,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingTemplatePath,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingSourceTargetPath,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingComponentPairTemplateComposition,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingComponentPairServiceCollectionPath,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionClassName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionMemberName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionRecordTypeName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionLoadMethodName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionFilterMethod,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionCreateMethod,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionUpdateMethod,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionQueryState,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionDomainEntity,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingAppShellTargetRef,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnknownAppShellTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedAppShellTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringAppShellNotImplemented,
  AppBuilderSourceLoweringSourcePlanIssueKind.AppShellMissingRequiredInput,
  AppBuilderSourceLoweringSourcePlanIssueKind.AppShellInvalidSuppliedPayload,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingApplicationAssemblyTargetRef,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnknownApplicationAssemblyTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedApplicationAssemblyTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringApplicationAssemblyNotImplemented,
  AppBuilderSourceLoweringSourcePlanIssueKind.ApplicationAssemblyMissingRequiredInput,
  AppBuilderSourceLoweringSourcePlanIssueKind.ApplicationAssemblyInvalidSuppliedPayload,
  AppBuilderSourceLoweringSourcePlanIssueKind.ApplicationAssemblyMissingRouteArea,
  AppBuilderSourceLoweringSourcePlanIssueKind.ApplicationAssemblyUnsupportedRouteArea,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingRouterBackedListDetailTargetRef,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnknownRouterBackedListDetailTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedRouterBackedListDetailTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringRouterBackedListDetailNotImplemented,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingRequiredInput,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidSuppliedPayload,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionClassName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionLoadMethodName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionFindMethodName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionCreateMethodName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionFilterMethod,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionUpdateMethod,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidRouterBackedListDetailServiceCollectionQueryControl,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailDuplicateCreateActionFeedback,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCreateActionFeedbackStatusMember,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingDiStateClassTargetRef,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnknownDiStateClassTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedDiStateClassTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringDiStateClassNotImplemented,
  AppBuilderSourceLoweringSourcePlanIssueKind.DiStateClassMissingRequiredInput,
  AppBuilderSourceLoweringSourcePlanIssueKind.DiStateClassInvalidSuppliedPayload,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingLocalViewModelStateTargetRef,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnknownLocalViewModelStateTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedLocalViewModelStateTarget,
  AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringLocalViewModelStateNotImplemented,
  AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateMissingRequiredInput,
  AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidSuppliedPayload,
  AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateUnsupportedRelationship,
  AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateAmbiguousRelationshipPrimaryEntity,
  AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipEntity,
  AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidRelationshipDescriptor,
  AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidCollectionQueryDescriptor,
  AppBuilderSourceLoweringSourcePlanIssueKind.LocalViewModelStateInvalidActionFeedbackDescriptor,
  AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousLocalStatePolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.TargetRequirementIssue,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingAppName,
  AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousAppName,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingBaseName,
  AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousBaseName,
  AppBuilderSourceLoweringSourcePlanIssueKind.InvalidClassName,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingResourceCarrier,
  AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousResourceCarrier,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedResourceCarrier,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingConventionPolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousConventionPolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.InconsistentConventionCarrier,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedCustomElementViewForm,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingDomainEntity,
  AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousDomainEntity,
  AppBuilderSourceLoweringSourcePlanIssueKind.DomainMaterializationIssue,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingRoutingPolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousRoutingPolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedRouterAdmission,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedAreaNavigationPolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingStatePolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.AmbiguousStatePolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedStatePolicy,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingNavigationAction,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingDomainActions,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownNavigationAction,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailIncompatibleNavigationAction,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingNavigationLinkText,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingCreateAction,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingCreateDomainActions,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCreateAction,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailIncompatibleCreateAction,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingCreateFieldSelection,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCreateField,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCreateFieldSelection,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedCreateField,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedCreateIdentityValueKind,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailMissingCreateSubmitButtonText,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedRelationship,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailAmbiguousRelationshipPrimaryEntity,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipEntity,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidRelationshipDescriptor,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailInvalidCollectionTableColumn,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCollectionTableColumnField,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCollectionTableColumnRelationship,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnknownCollectionTableColumnAction,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailIncompatibleCollectionTableColumnAction,
  AppBuilderSourceLoweringSourcePlanIssueKind.RouterBackedListDetailUnsupportedCollectionTableColumnFeature,
  AppBuilderSourceLoweringSourcePlanIssueKind.SeedRecordMissingIdentityValue,
  AppBuilderSourceLoweringSourcePlanIssueKind.SeedRecordInvalidIdentityValueKind,
  AppBuilderSourceLoweringSourcePlanIssueKind.ConflictingSourceRoot,
  AppBuilderSourceLoweringSourcePlanIssueKind.ConflictingSourceTargetPath,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingSourceLoweringSelection,
  AppBuilderSourceLoweringSourcePlanIssueKind.MultipleSourceLoweringSelections,
  AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringInvocationIssue,
  AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringCompositionIssue,
  AppBuilderSourceLoweringSourcePlanIssueKind.MissingTemplateFragments,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedTemplateFragmentKind,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedTypeScriptTopLevelFragmentKind,
  AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedClassMemberFragmentKind,
] as const;

/** Request for wrapping app-builder source-lowering fragments in an explicit SourcePlan preview. */
export interface AppBuilderSourceLoweringSourcePlanRequest {
  /** SourcePlan root directory; required so app-builder does not invent project placement. */
  readonly rootDir?: string | null;
  /** HTML template path to preview inside the SourcePlan; required so app-builder does not invent filenames. */
  readonly templatePath?: string | null;
  /** Non-template source file path to preview inside the SourcePlan; required for generated TypeScript artifacts. */
  readonly sourceTargetPath?: string | null;
  /** Source-placement inputs that may supply SourceRoot and SourceTargetPath facets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles shared by direct SourcePlan lowerers before source inputs are evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include decision-bundle expansion rows; defaults to false so compact answers keep counts only. */
  readonly includeDecisionBundleExpansionRows?: boolean | null;
  /** Include SourcePlan witness rows; defaults to false so compact answers keep witness counts only. */
  readonly includeSourcePlanWitnessRows?: boolean | null;
  /** Include full SourcePlan contribution ledgers on public API source-plan file rows; defaults to false because witness rows own compact provenance. */
  readonly includeSourcePlanContributions?: boolean | null;
  /** Include full expected-effect preview rows; defaults to false because compact answers keep effect counts, kinds, and contracts. */
  readonly includeExpectedEffectRows?: boolean | null;
  /** Include selected source-lowering result details; defaults to false so SourcePlan answers do not repeat the full derivation tree. */
  readonly includeSourceLoweringResultDetails?: boolean | null;
  /** Include generated control-use inventory rows; defaults to false so compact SourcePlan answers keep counts only. */
  readonly includeControlUseInventoryRows?: boolean | null;
  /** Include SourcePlan envelope request-field rows; defaults to false because compact answers keep the field summary. */
  readonly includeSourceLoweringRequestFields?: boolean | null;
  /** One direct app-shell target to lower into a full SourcePlan. */
  readonly sourceLoweringAppShell?: AppBuilderSourceLoweringAppShellRequest | null;
  /** One application-assembly target to lower into a multi-area app SourcePlan. */
  readonly sourceLoweringApplicationAssembly?: AppBuilderSourceLoweringApplicationAssemblyRequest | null;
  /** One direct router-backed list/detail target to lower into a full SourcePlan. */
  readonly sourceLoweringRouterBackedListDetail?: AppBuilderSourceLoweringRouterBackedListDetailRequest | null;
  /** One direct DI state-class target to lower into a full SourcePlan. */
  readonly sourceLoweringDiStateClass?: AppBuilderSourceLoweringDiStateClassRequest | null;
  /** One direct local view-model state target to lower into a component SourcePlan. */
  readonly sourceLoweringLocalViewModelState?: AppBuilderSourceLoweringLocalViewModelStateRequest | null;
  /** One ontology target invocation to wrap in a template SourcePlan. */
  readonly sourceLoweringInvocation?: AppBuilderSourceLoweringInvocationRequest | null;
  /** One ontology target composition to wrap in a template SourcePlan. */
  readonly sourceLoweringComposition?: AppBuilderSourceLoweringCompositionRequest | null;
  /** One custom-element component pair assembled from a template composition and class-member invocations. */
  readonly sourceLoweringComponentPair?: AppBuilderSourceLoweringComponentPairRequest | null;
}

/** Request for lowering the AppShell application pattern into a direct SourcePlan. */
export interface AppBuilderSourceLoweringAppShellRequest {
  /** Exact AppShell ontology target selected from target-catalog or source-lowering-preflight. */
  readonly targetRef?: AppBuilderOntologyRowRef | null;
  /** Input markers and facet payloads already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded before this direct SourcePlan lowerer evaluates inputs. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include the preflight answer that gated this direct SourcePlan lowering; defaults to false. */
  readonly includePreflight?: boolean | null;
}

/** Request for lowering the ApplicationAssembly application pattern into a direct SourcePlan. */
export interface AppBuilderSourceLoweringApplicationAssemblyRequest {
  /** Exact ApplicationAssembly ontology target selected from target-catalog or source-lowering-preflight. */
  readonly targetRef?: AppBuilderOntologyRowRef | null;
  /** Input markers and facet payloads already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded before this direct SourcePlan lowerer evaluates inputs. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Child routed browse/detail areas to assemble under one generated root shell. */
  readonly routeAreas?: readonly AppBuilderSourceLoweringRouterBackedListDetailRequest[] | null;
  /** Include the preflight answer that gated this direct SourcePlan lowering; defaults to false. */
  readonly includePreflight?: boolean | null;
}

/** Request for lowering the router-backed list/detail application pattern into a direct SourcePlan. */
export interface AppBuilderSourceLoweringRouterBackedListDetailRequest {
  /** Exact RouterBackedListDetail target selected from target-catalog or source-lowering-preflight. */
  readonly targetRef?: AppBuilderOntologyRowRef | null;
  /** Input markers and facet payloads already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded before this direct SourcePlan lowerer evaluates inputs. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Explicit domain entity type/name selected as the route-area primary entity when multiple entities are supplied. */
  readonly primaryEntityName?: string | null;
  /** Optional navigation-scoped domain action to render as the visible list-row detail route link. */
  readonly actionName?: string | null;
  /** Visible link text for the optional navigation-scoped list-row detail route action. */
  readonly linkText?: string | null;
  /** Optional create form rendered on the routed list route before the collection. */
  readonly createForm?: AppBuilderSourceLoweringRouterBackedListDetailCreateFormRequest | null;
  /** Optional service boundary used by generated DI state for routed load/find/create operations. */
  readonly serviceCollection?: AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionRequest | null;
  /** Optional inverse related collections rendered inside the routed detail route. */
  readonly detailRelatedCollections?: readonly AppBuilderSourceLoweringRouterBackedListDetailRelatedCollectionRequest[] | null;
  /** Include the preflight answer that gated this direct SourcePlan lowering; defaults to false. */
  readonly includePreflight?: boolean | null;
}

/** Request for a routed list-route create form inside a router-backed list/detail SourcePlan. */
export interface AppBuilderSourceLoweringRouterBackedListDetailCreateFormRequest {
  /** Form-scoped create action selected from DomainActions. */
  readonly actionName?: string | null;
  /** Ordered domain field members accepted by the generated create form. */
  readonly fieldNames?: readonly string[] | null;
  /** Visible submit button text for the generated create form. */
  readonly submitButtonText?: string | null;
}

/** Request for a service boundary inside a router-backed list/detail SourcePlan. */
export interface AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionRequest {
  /** TypeScript service file path relative to the source-plan root; defaults from the selected domain entity. */
  readonly sourceTargetPath?: string | null;
  /** Exported TypeScript service class name; defaults from the selected domain entity. */
  readonly serviceClassName?: string | null;
  /** Service/state method that returns the routed collection; defaults from the selected domain collection. */
  readonly loadMethodName?: string | null;
  /** Service/state method that returns one detail entity by route parameter; defaults from the selected domain entity. */
  readonly findMethodName?: string | null;
  /** Service method used by the generated create form; defaults from the selected domain entity when createForm is present. */
  readonly createMethodName?: string | null;
  /** Optional service methods that filter the routed collection by one explicit domain field. */
  readonly filterMethods?: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionFilterMethodRequest[] | null;
  /** Optional service methods that update one routed collection entity through explicit input fields. */
  readonly updateMethods?: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionUpdateMethodRequest[] | null;
  /** Optional list-route query controls that reload the collection promise through an active service filter. */
  readonly queryControls?: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControlRequest[] | null;
}

/** Selected service boundary inside a router-backed list/detail SourcePlan. */
export interface AppBuilderSourceLoweringRouterBackedListDetailServiceCollection {
  /** TypeScript service file path relative to the source-plan root. */
  readonly sourceTargetPath: string;
  /** Exported TypeScript service class name. */
  readonly serviceClassName: string;
  /** Service/state method that returns the routed collection. */
  readonly loadMethodName: string;
  /** Service/state method that returns one detail entity by route parameter. */
  readonly findMethodName: string;
  /** Service method used by the generated create form, when present. */
  readonly createMethodName: string | null;
  /** Service filter methods emitted for routed collection query controls. */
  readonly filterMethods: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionFilterMethod[];
  /** Service update methods emitted for routed collection row commands. */
  readonly updateMethods: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionUpdateMethod[];
  /** List-route query controls that reload the collection promise through service filter methods. */
  readonly queryControls: readonly AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControl[];
}

/** Request for an inverse related collection rendered inside a router-backed detail route. */
export interface AppBuilderSourceLoweringRouterBackedListDetailRelatedCollectionRequest {
  /** Reference-one relationship from the related collection entity back to the current detail entity. */
  readonly relationshipName?: string | null;
  /** Visible heading for the generated related collection section. */
  readonly title?: string | null;
  /** Local repeat variable used by generated related collection rows. */
  readonly itemLocalName?: string | null;
  /** Caller-selected field/action columns for the related collection table. */
  readonly tableColumns?: readonly AppBuilderCollectionTableColumnPayload[] | null;
}

/** Selected inverse related collection rendered inside a router-backed detail route. */
export interface AppBuilderSourceLoweringRouterBackedListDetailRelatedCollection {
  /** Reference-one relationship from related child rows back to the current detail entity. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Domain descriptor for related child rows. */
  readonly domain: AppBuilderDomainDescriptor;
  /** Visible heading emitted for the related collection section. */
  readonly title: string;
  /** Local repeat variable used by generated related collection rows. */
  readonly itemLocalName: string;
  /** Caller-selected field/action columns for the related collection table. */
  readonly tableColumns: readonly AppBuilderCollectionTableColumnPayload[];
}

/** Request for a generated filter method on a router-backed list/detail service collection. */
export interface AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionFilterMethodRequest {
  /** Service method name emitted for the filter operation. */
  readonly methodName?: string | null;
  /** Domain field member compared by the generated filter operation. */
  readonly fieldName?: string | null;
  /** TypeScript parameter name accepted by the generated filter method. */
  readonly parameterName?: string | null;
  /** Filter predicate selected for the generated method; defaults to strict equality. */
  readonly predicateKind?: AppBuilderServiceCollectionFilterPredicateKindValue | null;
}

/** Request for a generated update method on a router-backed list/detail service collection. */
export interface AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionUpdateMethodRequest {
  /** Service method name emitted for the update operation. */
  readonly methodName?: string | null;
  /** Ordered domain field members accepted by the generated update method after identity. */
  readonly inputFieldNames?: readonly string[] | null;
}

/** Request for a visible routed list-route query control backed by one generated service filter method. */
export interface AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControlRequest {
  /** List-route member that stores the active query value. */
  readonly stateMemberName?: string | null;
  /** Exact TypeScript type text emitted for the query-state member. */
  readonly stateTypeText?: string | null;
  /** Exact initializer expression emitted for the inactive query state. */
  readonly initialValueExpression?: string | null;
  /** Exact expression compared against the query value to select the unfiltered load method. */
  readonly inactiveValueExpression?: string | null;
  /** List-route method that refreshes the collection promise through the active query. */
  readonly reloadMethodName?: string | null;
  /** Promise-valued list-route member assigned by the reload method. */
  readonly resultMemberName?: string | null;
  /** State/service filter method called when the query state is active. */
  readonly filterMethodName?: string | null;
  /** Explicit field control id emitted on the generated query input. */
  readonly fieldControlId?: string | null;
  /** Visible label emitted for the generated query input. */
  readonly labelText?: string | null;
  /** Integration-scoped domain action emitted as the apply/search button handler. */
  readonly applyActionName?: string | null;
  /** Visible button text emitted for the apply/search action. */
  readonly applyButtonText?: string | null;
  /** Integration-scoped domain action emitted as the clear/reset button handler. */
  readonly clearActionName?: string | null;
  /** Visible button text emitted for the clear/reset action. */
  readonly clearButtonText?: string | null;
}

/** Selected generated filter method on a router-backed list/detail service collection. */
export interface AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionFilterMethod {
  /** Service method name emitted for the filter operation. */
  readonly methodName: string;
  /** Domain field member compared by the generated filter operation. */
  readonly fieldName: string;
  /** TypeScript parameter name accepted by the generated filter method. */
  readonly parameterName: string;
  /** Filter predicate selected for the generated method. */
  readonly predicateKind: AppBuilderServiceCollectionFilterPredicateKindValue;
}

/** Selected generated update method on a router-backed list/detail service collection. */
export interface AppBuilderSourceLoweringRouterBackedListDetailServiceCollectionUpdateMethod {
  /** Service method name emitted for the update operation. */
  readonly methodName: string;
  /** Ordered domain field members accepted by the generated update method after identity. */
  readonly inputFieldNames: readonly string[];
}

/** Selected visible routed list-route query control backed by one generated service filter method. */
export interface AppBuilderSourceLoweringRouterBackedListDetailServiceQueryControl {
  /** List-route member that stores the active query value. */
  readonly stateMemberName: string;
  /** Exact TypeScript type text emitted for the query-state member. */
  readonly stateTypeText: string;
  /** Exact initializer expression emitted for the inactive query state. */
  readonly initialValueExpression: string;
  /** Exact expression compared against the query value to select the unfiltered load method. */
  readonly inactiveValueExpression: string;
  /** List-route method that refreshes the collection promise through the active query. */
  readonly reloadMethodName: string;
  /** Promise-valued list-route member assigned by the reload method. */
  readonly resultMemberName: string;
  /** State/service filter method called when the query state is active. */
  readonly filterMethodName: string;
  /** Explicit field control id emitted on the generated query input. */
  readonly fieldControlId: string;
  /** Visible label emitted for the generated query input. */
  readonly labelText: string;
  /** Integration-scoped domain action emitted as the apply/search button handler. */
  readonly applyActionName: string;
  /** Visible button text emitted for the apply/search action. */
  readonly applyButtonText: string;
  /** Integration-scoped domain action emitted as the clear/reset button handler. */
  readonly clearActionName: string;
  /** Visible button text emitted for the clear/reset action. */
  readonly clearButtonText: string;
  /** Optional action feedback rendered after the apply/search action. */
  readonly applyActionFeedback?: AppBuilderSourceLoweringActionFeedbackPayload | null;
  /** Optional action feedback rendered after the clear/reset action. */
  readonly clearActionFeedback?: AppBuilderSourceLoweringActionFeedbackPayload | null;
}

/** Request for lowering the DI state-class application pattern into a direct SourcePlan. */
export interface AppBuilderSourceLoweringDiStateClassRequest {
  /** Exact DiStateClass ontology target selected from target-catalog or source-lowering-preflight. */
  readonly targetRef?: AppBuilderOntologyRowRef | null;
  /** Input markers and facet payloads already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded before this direct SourcePlan lowerer evaluates inputs. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include the preflight answer that gated this direct SourcePlan lowering; defaults to false. */
  readonly includePreflight?: boolean | null;
}

/** Request for lowering local view-model field state into a direct SourcePlan. */
export interface AppBuilderSourceLoweringLocalViewModelStateRequest {
  /** Exact LocalViewModelState ontology target selected from target-catalog or source-lowering-preflight. */
  readonly targetRef?: AppBuilderOntologyRowRef | null;
  /** Input markers and facet payloads already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded before this direct SourcePlan lowerer evaluates inputs. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include the preflight answer that gated this direct SourcePlan lowering; defaults to false. */
  readonly includePreflight?: boolean | null;
}

/** Request for assembling a custom-element component pair from app-builder source-lowering fragments. */
export interface AppBuilderSourceLoweringComponentPairRequest {
  /** Shared supplied inputs used for placement, source naming, resource carrier, domain facts, and policy facts. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles shared by component-pair child lowerers. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Optional root app-shell wrapper that turns the component pair into a runnable Aurelia app. */
  readonly appShell?: AppBuilderSourceLoweringComponentPairAppShellRequest | null;
  /** Template-side composition that owns the component's HTML file text. */
  readonly sourceLoweringComposition?: AppBuilderSourceLoweringCompositionRequest | null;
  /** Template-side one-target invocations inserted beside the optional higher-level composition. */
  readonly sourceLoweringTemplateInvocations?: readonly AppBuilderSourceLoweringInvocationRequest[] | null;
  /** Optional local view-model state target that contributes TypeScript declarations and class members. */
  readonly sourceLoweringLocalViewModelState?: AppBuilderSourceLoweringLocalViewModelStateRequest | null;
  /** TypeScript class-member invocations inserted into the generated component view-model class. */
  readonly sourceLoweringClassMemberInvocations?: readonly AppBuilderSourceLoweringInvocationRequest[] | null;
  /** Generated service collection files and DI members consumed by the component view-model. */
  readonly serviceCollections?: readonly AppBuilderSourceLoweringComponentPairServiceCollectionRequest[] | null;
}

/** Root app-shell wrapper for a component-pair SourcePlan. */
export interface AppBuilderSourceLoweringComponentPairAppShellRequest {
  /** Entrypoint path for the runnable app shell; defaults to src/main.ts when omitted. */
  readonly entrypointPath?: string | null;
}

/** Request for a generated in-memory service collection support file attached to a component pair. */
export interface AppBuilderSourceLoweringComponentPairServiceCollectionRequest {
  /** TypeScript service file path relative to the source-plan root, such as src/services/task-item-service.ts. */
  readonly sourceTargetPath?: string | null;
  /** Exported TypeScript service class name. */
  readonly serviceClassName?: string | null;
  /** Component view-model member that resolves the service; defaults from the service class name when omitted. */
  readonly componentMemberName?: string | null;
  /** Domain entity type name selected when the component pair has more than one entity input. */
  readonly collectionEntityName?: string | null;
  /** Exported record interface name for the service method return type; defaults from the selected entity. */
  readonly recordTypeName?: string | null;
  /** Service method that returns the caller-domain collection records. */
  readonly loadMethodName?: string | null;
  /** Optional service methods that filter the in-memory collection by one explicit field. */
  readonly filterMethods?: readonly AppBuilderSourceLoweringComponentPairServiceCollectionFilterMethodRequest[] | null;
  /** Optional service methods that append one record to the in-memory collection and return the updated collection. */
  readonly createMethods?: readonly AppBuilderSourceLoweringComponentPairServiceCollectionCreateMethodRequest[] | null;
  /** Optional service methods that update one existing record by domain identity and return the updated collection. */
  readonly updateMethods?: readonly AppBuilderSourceLoweringComponentPairServiceCollectionUpdateMethodRequest[] | null;
  /** Optional component query-state members and reload methods that preserve active service filters. */
  readonly queryStates?: readonly AppBuilderSourceLoweringComponentPairServiceQueryStateRequest[] | null;
}

/** Request for a generated filter method on a component-pair service collection. */
export interface AppBuilderSourceLoweringComponentPairServiceCollectionFilterMethodRequest {
  /** Service method name emitted for the filter operation. */
  readonly methodName?: string | null;
  /** Domain field member compared by the generated filter operation. */
  readonly fieldName?: string | null;
  /** TypeScript parameter name accepted by the generated filter method. */
  readonly parameterName?: string | null;
  /** Filter predicate selected for the generated method; defaults to strict equality. */
  readonly predicateKind?: AppBuilderServiceCollectionFilterPredicateKindValue | null;
}

/** Request for a generated create/write method on a component-pair service collection. */
export interface AppBuilderSourceLoweringComponentPairServiceCollectionCreateMethodRequest {
  /** Service method name emitted for the create operation. */
  readonly methodName?: string | null;
  /** Domain field members accepted by the generated create method. */
  readonly inputFieldNames?: readonly string[] | null;
}

/** Request for a generated update method on a component-pair service collection. */
export interface AppBuilderSourceLoweringComponentPairServiceCollectionUpdateMethodRequest {
  /** Service method name emitted for the update operation. */
  readonly methodName?: string | null;
  /** Domain field members accepted after identity by the generated update method. */
  readonly inputFieldNames?: readonly string[] | null;
}

/** Request for generated component state that preserves an active service query. */
export interface AppBuilderSourceLoweringComponentPairServiceQueryStateRequest {
  /** Component member that stores the active query value. */
  readonly stateMemberName?: string | null;
  /** Exact TypeScript type text emitted for the query-state member. */
  readonly stateTypeText?: string | null;
  /** Exact initializer expression emitted for the inactive query state. */
  readonly initialValueExpression?: string | null;
  /** Exact expression compared against the query value to select the unfiltered load method. */
  readonly inactiveValueExpression?: string | null;
  /** Component method that refreshes the result member through the active query. */
  readonly reloadMethodName?: string | null;
  /** Promise-valued component member assigned by the reload method. */
  readonly resultMemberName?: string | null;
  /** Service filter method called when the query state is active. */
  readonly filterMethodName?: string | null;
}

/** Issue produced while wrapping app-builder source lowering in a SourcePlan preview. */
export interface AppBuilderSourceLoweringSourcePlanIssue {
  /** Stable issue category. */
  readonly issueKind: AppBuilderSourceLoweringSourcePlanIssueKind;
  /** Target row involved in the issue when applicable. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** Resource carrier involved in the issue when applicable. */
  readonly resourceCarrier?: AppBuilderResourceCarrier;
  /** Convention policy involved in the issue when applicable. */
  readonly conventionPolicy?: AppBuilderConventionPolicy;
  /** Router policy involved in the issue when applicable. */
  readonly routingPolicy?: AppBuilderSourceLoweringRoutingPolicyPayload;
  /** State policy involved in the issue when applicable. */
  readonly statePolicy?: AppBuilderSourceLoweringStatePolicyPayload;
  /** Custom-element view form involved in the issue when applicable. */
  readonly customElementViewForm?: AppBuilderCustomElementViewForm;
  /** Unsupported fragment kind involved in the issue when applicable. */
  readonly fragmentKind?: AppBuilderPartSourceFragmentKind;
  /** Source-placement facet involved in the issue when applicable. */
  readonly inputFacetId?: AppBuilderInputFacetId;
  /** Domain-materialization issue that blocked direct app source lowering. */
  readonly domainMaterializationIssue?: AppBuilderDomainMaterializationIssue;
  /** Caller-supplied seed record index involved in the issue when applicable. */
  readonly seedRecordIndex?: number;
  /** Domain action names involved in an action-selection issue. */
  readonly actionNames?: readonly string[];
  /** Action-feedback status member names involved in local state source issues. */
  readonly statusMemberNames?: readonly string[];
  /** Domain relationship names involved in a relationship-selection issue. */
  readonly relationshipNames?: readonly string[];
  /** Domain field names involved in a field-selection issue. */
  readonly fieldNames?: readonly string[];
  /** Collection table headers involved in a table presentation issue. */
  readonly columnHeaders?: readonly string[];
  /** Source target paths involved in a support-file issue. */
  readonly sourceTargetPaths?: readonly string[];
  /** Service class names involved in a support-file issue. */
  readonly serviceClassNames?: readonly string[];
  /** Collection feature ids involved in a collection query issue. */
  readonly collectionFeatureIds?: readonly AppBuilderCollectionFeatureIdValue[];
  /** Lower-level invocation issue when applicable. */
  readonly sourceLoweringInvocationIssue?: AppBuilderSourceLoweringInvocationIssue;
  /** Lower-level composition issue when applicable. */
  readonly sourceLoweringCompositionIssue?: AppBuilderSourceLoweringCompositionIssue;
  /** Source-lowering preflight issue bridged into direct SourcePlan lowering when a target-specific fact blocks lowering. */
  readonly sourceLoweringPreflightIssue?: AppBuilderSourceLoweringPreflightIssue;
  /** Compact explanation suitable for MCP/IDE display. */
  readonly summary: string;
}

/** Direct AppShell SourcePlan lowering result. */
export interface AppBuilderSourceLoweringAppShell {
  /** Exact AppShell target row, when supplied and known. */
  readonly targetRef: AppBuilderOntologyRowRef | null;
  /** App name selected from SourceNaming input. */
  readonly appName: string | null;
  /** Custom-element resource carrier selected from SourceFileLayout input. */
  readonly resourceCarrier: AppBuilderResourceCarrier | null;
  /** Convention policy selected from AureliaPolicy input. */
  readonly conventionPolicy: AppBuilderConventionPolicy | null;
  /** Source-lowering preflight row used to gate the direct lowering. */
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  /** Full preflight answer when requested. */
  readonly preflight?: AppBuilderSourceLoweringPreflight;
  /** App-builder ontology rows exercised by this direct SourcePlan lowering. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the AppShell target and SourcePlan preview boundary. */
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  /** Reopen effect kinds expected from this direct AppShell SourcePlan when complete. */
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
  /** Compact reopen witnesses expected from this direct AppShell SourcePlan when complete. */
  readonly expectedEffects: readonly AppBuilderExpectedSemanticEffectPreview[];
  /** Direct AppShell SourcePlan when all required inputs are supplied and coherent. */
  readonly sourcePlan: SourcePlan | null;
  /** AppShell source-plan issues. */
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

/** Direct ApplicationAssembly SourcePlan lowering result. */
export interface AppBuilderSourceLoweringApplicationAssembly {
  /** Exact ApplicationAssembly target row, when supplied and known. */
  readonly targetRef: AppBuilderOntologyRowRef | null;
  /** App name selected from SourceNaming input. */
  readonly appName: string | null;
  /** Custom-element resource carrier selected from SourceFileLayout input. */
  readonly resourceCarrier: AppBuilderResourceCarrier | null;
  /** Convention policy selected from AureliaPolicy input. */
  readonly conventionPolicy: AppBuilderConventionPolicy | null;
  /** Child routed browse/detail results selected for this application assembly. */
  readonly routeAreas: readonly AppBuilderSourceLoweringRouterBackedListDetail[];
  /** Source-lowering preflight row used to gate the direct lowering. */
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  /** Full preflight answer when requested. */
  readonly preflight?: AppBuilderSourceLoweringPreflight;
  /** App-builder ontology rows exercised by this direct SourcePlan lowering. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the ApplicationAssembly target and SourcePlan preview boundary. */
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  /** Reopen effect kinds expected from this direct ApplicationAssembly SourcePlan when complete. */
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
  /** Compact reopen witnesses expected from this direct ApplicationAssembly SourcePlan when complete. */
  readonly expectedEffects: readonly AppBuilderExpectedSemanticEffectPreview[];
  /** Generated control-use rows for top-level and child route navigation carried across the direct SourcePlan boundary. */
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
  /** Direct ApplicationAssembly SourcePlan when all required inputs are supplied and coherent. */
  readonly sourcePlan: SourcePlan | null;
  /** ApplicationAssembly source-plan issues. */
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

/** Direct router-backed list/detail SourcePlan lowering result. */
export interface AppBuilderSourceLoweringRouterBackedListDetail {
  /** Exact RouterBackedListDetail target row, when supplied and known. */
  readonly targetRef: AppBuilderOntologyRowRef | null;
  /** App name selected from SourceNaming input. */
  readonly appName: string | null;
  /** Custom-element resource carrier selected from SourceFileLayout input. */
  readonly resourceCarrier: AppBuilderResourceCarrier | null;
  /** Convention policy selected from AureliaPolicy input. */
  readonly conventionPolicy: AppBuilderConventionPolicy | null;
  /** Domain descriptor materialized from caller-supplied slots. */
  readonly domain: AppBuilderDomainDescriptor | null;
  /** Routing policy selected for this generated browse/detail surface. */
  readonly routingPolicy: AppBuilderSourceLoweringRoutingPolicyPayload | null;
  /** State policy selected for this generated browse/detail surface. */
  readonly statePolicy: AppBuilderSourceLoweringStatePolicyPayload | null;
  /** Seed data set projected from caller-supplied records, or an explicit empty set. */
  readonly seedDataSet: AppBuilderSeedDataSetDescriptor | null;
  /** Domain entity type/name selected as the route-area primary entity, when known. */
  readonly primaryEntityName: string | null;
  /** Navigation-scoped domain action selected for row-to-detail links, when requested. */
  readonly navigationAction: AppBuilderDomainActionDescriptor | null;
  /** Caller-supplied visible link text for the selected row-to-detail navigation action. */
  readonly navigationLinkText: string | null;
  /** Form-scoped domain action selected for a list-route create form, when requested. */
  readonly createAction: AppBuilderDomainActionDescriptor | null;
  /** Caller-supplied ordered create-form field names selected for the generated routed form. */
  readonly createFormFieldNames: readonly string[];
  /** Caller-supplied visible submit button text for the generated routed create form. */
  readonly createSubmitButtonText: string | null;
  /** Caller-supplied feedback selected for the routed create action, when provided. */
  readonly createActionFeedback: AppBuilderSourceLoweringActionFeedbackPayload | null;
  /** Reference-one relationships selected and spent by the generated browse/detail source. */
  readonly referenceRelationships: readonly AppBuilderDomainRelationshipDescriptor[];
  /** Owned-child relationships selected and spent as nested domain source by the generated browse/detail source. */
  readonly ownedRelationships: readonly AppBuilderDomainRelationshipDescriptor[];
  /** Nested value-object relationships selected and spent as identityless domain source by the generated browse/detail source. */
  readonly nestedValueObjectRelationships: readonly AppBuilderDomainRelationshipDescriptor[];
  /** Caller-supplied table columns selected for the list route presentation. */
  readonly tableColumns: readonly AppBuilderCollectionTableColumnPayload[];
  /** Service boundary selected for routed load/find/create operations, when requested. */
  readonly serviceCollection: AppBuilderSourceLoweringRouterBackedListDetailServiceCollection | null;
  /** Inverse related collections selected for routed detail-route projection. */
  readonly detailRelatedCollections: readonly AppBuilderSourceLoweringRouterBackedListDetailRelatedCollection[];
  /** Source-lowering preflight row used to gate the direct lowering. */
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  /** Full preflight answer when requested. */
  readonly preflight?: AppBuilderSourceLoweringPreflight;
  /** App-builder ontology rows exercised by this direct SourcePlan lowering. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the RouterBackedListDetail target and SourcePlan preview boundary. */
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  /** Reopen effect kinds expected from this direct router-backed SourcePlan when complete. */
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
  /** Compact reopen witnesses expected from this direct router-backed SourcePlan when complete. */
  readonly expectedEffects: readonly AppBuilderExpectedSemanticEffectPreview[];
  /** Generated control-use rows for route navigation links carried across the direct SourcePlan boundary. */
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
  /** Reusable route-area source request selected by this lowering before root shell/tooling wrapping. */
  readonly routeAreaSourceRequest: AppBuilderRoutedCollectionDetailSourceRequest | null;
  /** Direct router-backed list/detail SourcePlan when all required inputs are supplied and coherent. */
  readonly sourcePlan: SourcePlan | null;
  /** Router-backed list/detail source-plan issues. */
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

/** Direct DI state-class SourcePlan lowering result. */
export interface AppBuilderSourceLoweringDiStateClass {
  /** Exact DiStateClass target row, when supplied and known. */
  readonly targetRef: AppBuilderOntologyRowRef | null;
  /** SourceTargetPath selected for the generated state model file. */
  readonly stateModelPath: string | null;
  /** Domain descriptor materialized from caller-supplied slots. */
  readonly domain: AppBuilderDomainDescriptor | null;
  /** Caller-supplied seed records projected into the state collection initializer. */
  readonly seedRecords: readonly AppBuilderSeedRecord[];
  /** Source-lowering preflight row used to gate the direct lowering. */
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  /** Full preflight answer when requested. */
  readonly preflight?: AppBuilderSourceLoweringPreflight;
  /** App-builder ontology rows exercised by this direct SourcePlan lowering. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the DiStateClass target and SourcePlan preview boundary. */
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  /** Reopen effect kinds expected from this direct DI state-class SourcePlan when complete. */
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
  /** Compact reopen witnesses expected from this direct DI state-class SourcePlan when complete. */
  readonly expectedEffects: readonly AppBuilderExpectedSemanticEffectPreview[];
  /** Direct DI state-class SourcePlan when all required inputs are supplied and coherent. */
  readonly sourcePlan: SourcePlan | null;
  /** DI state-class source-plan issues. */
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

/** Direct local view-model state SourcePlan lowering result. */
export interface AppBuilderSourceLoweringLocalViewModelState {
  /** Exact LocalViewModelState target row, when supplied and known. */
  readonly targetRef: AppBuilderOntologyRowRef | null;
  /** SourceTargetPath selected for the generated component view-model file. */
  readonly componentPath: string | null;
  /** Class name derived from explicit SourceNaming.baseName input. */
  readonly className: string | null;
  /** State policy selected for this local view-model state source. */
  readonly statePolicy: AppBuilderSourceLoweringStatePolicyPayload | null;
  /** Explicit domain fields lowered into local view-model members. */
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
  /** Object-shaped local state emitted for rooted form bindings such as `draft.title`. */
  readonly fieldObjectStates: readonly AppBuilderLocalViewModelFieldObjectStateSourceModel[];
  /** Domain descriptor lowered into a local collection when the local collection policy is selected. */
  readonly domain: AppBuilderDomainDescriptor | null;
  /** Caller-supplied seed records projected into the local collection initializer. */
  readonly seedRecords: readonly AppBuilderSeedRecord[];
  /** TypeScript declarations emitted before the generated component class. */
  readonly typeScriptTopLevelFragments: readonly AppBuilderPartSourceFragment[];
  /** TypeScript class members emitted inside the generated component class. */
  readonly classMemberFragments: readonly AppBuilderPartSourceFragment[];
  /** Source-lowering preflight row used to gate the direct lowering. */
  readonly preflightRow: AppBuilderSourceLoweringPreflightRow | null;
  /** Full preflight answer when requested. */
  readonly preflight?: AppBuilderSourceLoweringPreflight;
  /** App-builder ontology rows exercised by this direct SourcePlan lowering. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the LocalViewModelState target and SourcePlan preview boundary. */
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  /** Reopen effect kinds expected from this direct local state SourcePlan when complete. */
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
  /** Compact reopen witnesses expected from this direct local state SourcePlan when complete. */
  readonly expectedEffects: readonly AppBuilderExpectedSemanticEffectPreview[];
  /** Direct local view-model state SourcePlan when all required inputs are supplied and coherent. */
  readonly sourcePlan: SourcePlan | null;
  /** Local view-model state source-plan issues. */
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

/** Direct custom-element companion SourcePlan assembled from template and class-member source-lowering fragments. */
export interface AppBuilderSourceLoweringComponentPair {
  /** SourceTargetPath selected for the generated component view-model file. */
  readonly componentPath: string | null;
  /** HTML template path selected for the generated component template file. */
  readonly templatePath: string | null;
  /** Class name derived from explicit SourceNaming.baseName input. */
  readonly className: string | null;
  /** Custom-element resource name derived from explicit SourceNaming.baseName input. */
  readonly resourceName: string | null;
  /** Custom-element resource carrier selected from SourceFileLayout input. */
  readonly resourceCarrier: AppBuilderResourceCarrier | null;
  /** Convention policy selected from AureliaPolicy input. */
  readonly conventionPolicy: AppBuilderConventionPolicy | null;
  /** Root app-shell wrapper result when the component pair is emitted as a runnable app. */
  readonly appShell: AppBuilderSourceLoweringComponentPairAppShell | null;
  /** Template-side composition used to produce the HTML file. */
  readonly sourceLoweringComposition: AppBuilderSourceLoweringComposition | null;
  /** Template-side one-target invocations used to produce additional HTML file fragments. */
  readonly sourceLoweringTemplateInvocations: readonly AppBuilderSourceLoweringInvocation[];
  /** Local view-model state fragments used to produce the component view-model body. */
  readonly sourceLoweringLocalViewModelState: AppBuilderSourceLoweringLocalViewModelState | null;
  /** Class-member invocations used to produce the component view-model body. */
  readonly sourceLoweringClassMemberInvocations: readonly AppBuilderSourceLoweringInvocation[];
  /** App-builder ontology rows exercised by this component-pair SourcePlan lowering. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the nested ontology targets and SourcePlan preview boundary. */
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  /** Reopen effect kinds expected from this component-pair SourcePlan when complete. */
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
  /** Compact reopen witnesses expected from this component-pair SourcePlan when complete. */
  readonly expectedEffects: readonly AppBuilderExpectedSemanticEffectPreview[];
  /** Generated control-use rows carried across the component-pair SourcePlan boundary. */
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
  /** Direct component-pair SourcePlan when all required inputs are supplied and coherent. */
  readonly sourcePlan: SourcePlan | null;
  /** Component-pair source-plan issues. */
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

/** Root app-shell wrapper selected for component-pair SourcePlan lowering. */
export interface AppBuilderSourceLoweringComponentPairAppShell {
  /** Application name supplied through SourceNaming.appName. */
  readonly appName: string | null;
  /** Entrypoint path used by the generated Aurelia configuration file. */
  readonly entrypointPath: string;
}

/** Generated SourcePlan preview for app-builder source lowering. */
export interface AppBuilderSourceLoweringSourcePlan {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** SourcePlan root directory requested by the caller, if valid. */
  readonly rootDir: string | null;
  /** HTML template file path requested by the caller, if valid. */
  readonly templatePath: string | null;
  /** Non-template source file path requested by the caller, if valid. */
  readonly sourceTargetPath: string | null;
  /** SourcePlan envelope selector that was actually selected by the request. */
  readonly sourceLoweringSelectionKind: AppBuilderSourceLoweringSourcePlanSelectionKind | null;
  /** Whether selected source-lowering result details are included on this answer. */
  readonly sourceLoweringResultDetailsIncluded: boolean;
  /** Direct AppShell source-lowering result when that source was selected. */
  readonly sourceLoweringAppShell?: AppBuilderSourceLoweringAppShell | null;
  /** Direct ApplicationAssembly source-lowering result when that source was selected. */
  readonly sourceLoweringApplicationAssembly?: AppBuilderSourceLoweringApplicationAssembly | null;
  /** Direct router-backed list/detail source-lowering result when that source was selected. */
  readonly sourceLoweringRouterBackedListDetail?: AppBuilderSourceLoweringRouterBackedListDetail | null;
  /** Direct DI state-class source-lowering result when that source was selected. */
  readonly sourceLoweringDiStateClass?: AppBuilderSourceLoweringDiStateClass | null;
  /** Direct local view-model state source-lowering result when that source was selected. */
  readonly sourceLoweringLocalViewModelState?: AppBuilderSourceLoweringLocalViewModelState | null;
  /** Invocation source-lowering result when that source was selected. */
  readonly sourceLoweringInvocation?: AppBuilderSourceLoweringInvocation | null;
  /** Composition source-lowering result when that source was selected. */
  readonly sourceLoweringComposition?: AppBuilderSourceLoweringComposition | null;
  /** Component-pair source-lowering result when that source was selected. */
  readonly sourceLoweringComponentPair?: AppBuilderSourceLoweringComponentPair | null;
  /** App-builder ontology rows exercised by the selected source lowering. */
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  /** Effect contracts associated with the selected target and SourcePlan preview boundary. */
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  /** Reopen effect kinds expected from the selected full-app SourcePlan, if any. */
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
  /** Number of compact reopen witnesses expected from the selected full-app SourcePlan, if any. */
  readonly expectedEffectCount: number;
  /** Compact reopen witnesses expected from the selected full-app SourcePlan when explicitly requested. */
  readonly expectedEffects?: readonly AppBuilderExpectedSemanticEffectPreview[];
  /** Number of generated control-use rows carried across the SourcePlan preview boundary. */
  readonly controlUseInventoryRowCount: number;
  /** Generated control-use rows carried across the SourcePlan preview boundary when explicitly requested. */
  readonly controlUseInventoryRows?: readonly AppBuilderControlUseInventoryRow[];
  /** Per-call request fields owned by the selected SourcePlan envelope when explicitly requested. */
  readonly sourceLoweringRequestFields?: readonly AppBuilderSourceLoweringRequestFieldRequirement[];
  /** Compact count/field-name summary for SourcePlan envelope request fields. */
  readonly sourceLoweringRequestFieldSummary: AppBuilderSourceLoweringRequestFieldSummary;
  /** Number of compact witnesses derived from generated SourcePlan file, contribution, and tooling rows. */
  readonly sourcePlanWitnessCount: number;
  /** Compact witnesses derived from the generated SourcePlan file, contribution, and tooling rows. */
  readonly sourcePlanWitnessRows?: readonly AppBuilderSourcePlanWitnessRow[];
  /** SourcePlan preview when explicit placement and source lowering are both complete. */
  readonly sourcePlan: SourcePlan | null;
  /** Number of supplied input markers considered after decision-bundle expansion. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
  /** Expansion rows showing which decision-bundle decisions became supplied inputs when explicitly requested. */
  readonly decisionBundleExpansionRows?: readonly AppBuilderDecisionBundleExpansionRow[];
  /** Source-plan and bridged lower-level issues. */
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}
