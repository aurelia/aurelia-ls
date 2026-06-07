import { moduleSpecifier } from '../application/module-specifier.js';
import {
  uniqueByKey,
} from '../collections.js';
import {
  aureliaConfigurationAdmissionSourceSet,
  aureliaRouterConfigurationAdmissionSource,
} from '../source-plan/aurelia-configuration-admission-source.js';
import {
  SourcePatternParameterKey,
  sourcePatternParameterValue,
  SourcePlan,
  type SourcePlanFileArtifact,
  SourcePlanFileRole,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  type SourcePatternParameterValue,
} from '../source-plan/source-plan.js';
import { normalizedSourceInputText } from '../source-plan/source-template.js';
import type { TypeScriptImportRequirement } from '../source-plan/typescript-import-source.js';
import {
  pluralizeLastSourceNameWord,
  sourceNameWords,
  titleSourceName,
} from '../source-plan/source-name.js';
import { typeScriptSourceText, type TypeScriptSourceText } from '../source-plan/typescript-source-text.js';
import {
  type AuthoredTemplateChildSource,
  authoredTemplateElementSource,
  authoredTemplateElementSourceText,
  authoredTemplatePlainTextChildSource,
  authoredTemplateTextContentText,
} from '../template/authored-template-source.js';
import type {
  RouterRouteConfigSource,
} from '../router/route-configuration-source.js';
import { AppBuilderResourceCarrier } from './aurelia-lowering-option.js';
import {
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlId,
} from './control-catalog.js';
import {
  appBuilderCustomElementClassSource,
  appBuilderCustomElementTypeScriptPreludeSource,
  appBuilderCustomElementSourceLayout,
  appBuilderRootCustomElementSourceLayout,
  type AppBuilderCustomElementSourceLayout,
  type AppBuilderCustomElementTypeScriptPreludeSource,
} from './custom-element-source-layout.js';
import type { AppBuilderDomainDescriptor } from './domain-descriptor.js';
import {
  appBuilderDomainCollectionInitializerSource,
  appBuilderDomainSeedRecordConstructionExpressionSource,
} from './domain-collection-source.js';
import {
  appBuilderDomainEntityClassSource,
  appBuilderDomainEntityConstructionExpressionSource,
} from './domain-entity-source.js';
import {
  appBuilderDomainValueObjectClassSource,
  appBuilderDomainValueObjectSeedRecordConstructionExpressionSource,
} from './domain-value-object-source.js';
import {
  appBuilderDomainFieldDisplayExpression,
  appBuilderDomainFieldOptionPropertySource,
  appBuilderDomainFieldSeedLiteral,
  appBuilderDomainFieldSourceModels,
  appBuilderDomainFiniteOptionFields,
  appBuilderPrimaryDomainField,
  type AppBuilderDomainFieldSourceModel,
} from './domain-field-source.js';
import {
  AppBuilderDomainFieldValueKind,
  type AppBuilderDomainActionDescriptor,
  AppBuilderDomainIdentityValueKind,
  appBuilderDomainIdentityTypeScriptType,
  AppBuilderDomainRelationshipLocalValueKind,
  AppBuilderDomainRelationshipKind,
  type AppBuilderDomainFieldDescriptor,
  type AppBuilderDomainRelationshipDescriptor,
  type AppBuilderDomainValueSetDescriptor,
} from './domain-model.js';
import type { AppBuilderCollectionTableColumnPayload } from './ontology/collection-projection.js';
import { AppBuilderPartSlotKind } from './part-application.js';
import type {
  AppBuilderPartSourceFragment,
  AppBuilderTemplateAttributeSource,
  AppBuilderTemplateElementPartSourceFragment,
  AppBuilderTemplateElementSource,
} from './part-source-invocation.js';
import {
  AppBuilderSourceFragmentOriginKind,
} from './part-source-invocation.js';
import {
  AppBuilderApplicationPatternId,
} from './ontology/application-pattern.js';
import {
  AppBuilderOntologyRowKind,
} from './ontology/relation.js';
import type {
  AppBuilderSourceLoweringActionFeedbackPayload,
} from './ontology/source-lowering-inputs.js';
import {
  appBuilderEntityCompleteMutationFieldName,
  appBuilderEntityMutationFieldNamesForDomainActions,
} from './ontology/source-lowering-inputs.js';
import type { AppBuilderSeedDataSetDescriptor, AppBuilderSeedRecord } from './seed-data.js';
import {
  appBuilderKebabCase,
  appBuilderLowerCamelCase,
  appBuilderPascalCase,
  appBuilderRepeatAttributeFragment,
  appBuilderRouteContextParameterReadExpressionFragmentForMembers,
  appBuilderRouteDecoratorFragment,
  appBuilderRouterLoadAttributeFragment,
  appBuilderAttributeBindingAttributeFragment,
  appBuilderAttributeToViewBindingAttributeFragment,
  appBuilderTemplateElementFragment,
  appBuilderTemplateControllerAttributeFragment,
  appBuilderTextInterpolationFragment,
  appBuilderViewportElementFragment,
  appBuilderChoiceControlElementFragment,
  appBuilderControlElementFragment,
  appBuilderSeedRecordLiteral,
  appBuilderTypeScriptClassMemberFragmentsText,
} from './source-lowering-helpers.js';
import { appendAppBuilderTemplateElementAttributes } from './part-source-lowering.js';
import { appBuilderPartSourceFragmentContributions } from './source-plan-contributions.js';
import { AppBuilderSourcePlanAssembly } from './source-plan-assembly.js';
import { appBuilderRoutedCollectionDetailSourcePattern } from './source-patterns.js';
import {
  appBuilderHtmlTemplateFileArtifact,
  type AppBuilderHtmlTemplateSource,
} from './template-source-plan.js';
import { AppBuilderStructuralPartId } from './structural-part-catalog.js';
import {
  appBuilderServiceCollectionFileArtifact,
  type AppBuilderServiceCollectionFilterMethodSourceModel,
  AppBuilderServiceCollectionRecordTypeSourceKind,
  type AppBuilderServiceCollectionUpdateMethodSourceModel,
} from './service-boundary-source.js';
import { lowerAppBuilderEventAttribute } from './source-lowering-event-attribute.js';

export interface AppBuilderRoutedCollectionDetailSourceRequest {
  readonly rootDir: string;
  readonly appName: string;
  readonly carrier: AppBuilderResourceCarrier;
  readonly domain: AppBuilderDomainDescriptor;
  readonly valueSets?: readonly AppBuilderDomainValueSetDescriptor[];
  readonly seedDataSet: AppBuilderSeedDataSetDescriptor;
  readonly referenceRelationships?: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipSource[];
  readonly ownedRelationships?: readonly AppBuilderRoutedCollectionDetailOwnedRelationshipSource[];
  readonly nestedValueObjectRelationships?: readonly AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipSource[];
  readonly detailRelatedCollections?: readonly AppBuilderRoutedCollectionDetailRelatedCollectionSource[];
  readonly detailNavigationAction?: AppBuilderRoutedCollectionDetailNavigationActionSource | null;
  readonly createForm?: AppBuilderRoutedCollectionDetailCreateFormSource | null;
  readonly createActionFeedback?: AppBuilderSourceLoweringActionFeedbackPayload | null;
  readonly tableColumns?: readonly AppBuilderRoutedCollectionDetailTableColumnSource[];
  readonly serviceCollection?: AppBuilderRoutedCollectionDetailServiceCollectionSource | null;
  readonly sourcePatternParameterValues?: readonly SourcePatternParameterValue[];
}

/** Route component imported by a parent app shell that assembles route-area source. */
export interface AppBuilderRoutedCollectionDetailRouteComponentSource {
  /** Route view-model file path relative to the generated app root. */
  readonly componentPath: string;
  /** Route view-model class referenced by a parent route config. */
  readonly className: string;
}

/** Navigation link exposed by a generated route area for its parent app shell. */
export interface AppBuilderRoutedCollectionDetailRouteAreaNavigationLinkSource {
  /** Route instruction/path used by a parent shell link. */
  readonly path: string;
  /** Visible link text used by a parent shell nav. */
  readonly title: string;
}

/** Reusable route-area source frame for assembling several routed browse/detail areas under one app shell. */
export interface AppBuilderRoutedCollectionDetailRouteAreaSourceFrame {
  /** Route and support files owned by this routed browse/detail area, excluding the root shell and entrypoint. */
  readonly files: readonly SourcePlanFileArtifact[];
  /** Route config object inserted into a parent `@route(...)` decorator. */
  readonly routeConfig: RouterRouteConfigSource;
  /** Route components a parent root view-model must import before referencing this route config. */
  readonly routeComponents: readonly AppBuilderRoutedCollectionDetailRouteComponentSource[];
  /** Parent-shell navigation link for entering this route area. */
  readonly navigationLink: AppBuilderRoutedCollectionDetailRouteAreaNavigationLinkSource;
  /** Route parameter source-pattern value spent by the detail route. */
  readonly detailRouteParameterName: string;
  /** List route path source-pattern value spent by this route area. */
  readonly listRoutePath: string;
  /** True when this route area emits a generated service boundary. */
  readonly includesServiceBoundary: boolean;
  /** True when this route area emits form submission through a generated service boundary. */
  readonly includesServiceBackedSubmission: boolean;
}

/** Navigation-scoped action rendered by routed browse/detail source as a row-to-detail link. */
export interface AppBuilderRoutedCollectionDetailNavigationActionSource {
  /** Caller/domain action name selected from DomainActions. */
  readonly actionName: string;
  /** Caller-supplied visible link text for the generated route link. */
  readonly linkText: string;
}

/** Form-scoped create action rendered by routed browse/detail source as a list-route form. */
export interface AppBuilderRoutedCollectionDetailCreateFormSource {
  /** Caller/domain action name selected from DomainActions. */
  readonly actionName: string;
  /** Ordered domain field members accepted by the generated create form. */
  readonly fieldNames: readonly string[];
  /** Caller-supplied visible submit button text. */
  readonly submitButtonText: string;
}

/** Service-boundary source selected for routed browse/detail load/find/create operations. */
export interface AppBuilderRoutedCollectionDetailServiceCollectionSource {
  /** TypeScript service file path relative to the source-plan root. */
  readonly sourceTargetPath: string;
  /** Exported service class resolved by the generated DI state class. */
  readonly serviceClassName: string;
  /** State/service method that returns the routed collection. */
  readonly loadMethodName: string;
  /** State/service method that returns one routed detail entity by route parameter. */
  readonly findMethodName: string;
  /** Service method used by the generated state create method, when a create form is present. */
  readonly createMethodName?: string | null;
  /** Service methods emitted for explicit routed collection query controls. */
  readonly filterMethods?: readonly AppBuilderServiceCollectionFilterMethodSourceModel[];
  /** Service methods emitted for explicit routed collection row commands. */
  readonly updateMethods?: readonly AppBuilderServiceCollectionUpdateMethodSourceModel[];
  /** Visible list-route query controls that refresh the routed collection promise. */
  readonly queryControls?: readonly AppBuilderRoutedCollectionDetailServiceQueryControlSource[];
}

/** Visible query control emitted on a routed browse/detail list route. */
export interface AppBuilderRoutedCollectionDetailServiceQueryControlSource {
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

/** Reference-one relationship consumed by routed browse/detail source as related-label lookup source. */
export interface AppBuilderRoutedCollectionDetailReferenceRelationshipSource {
  /** Caller-owned relationship descriptor selected from DomainRelationships. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Related entity domain descriptor materialized from DomainEntities and scoped DomainFields. */
  readonly relatedDomain: AppBuilderDomainDescriptor;
  /** Caller-supplied related seed records. */
  readonly seedDataSet: AppBuilderSeedDataSetDescriptor;
}

/** Owned-child relationship consumed by routed browse/detail source as nested domain source. */
export interface AppBuilderRoutedCollectionDetailOwnedRelationshipSource {
  /** Caller-owned relationship descriptor selected from DomainRelationships. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Owned child entity domain descriptor materialized from scoped DomainEntities and DomainFields. */
  readonly ownedDomain: AppBuilderDomainDescriptor;
}

/** Nested value-object relationship consumed by routed browse/detail source as identityless domain source. */
export interface AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipSource {
  /** Caller-owned relationship descriptor selected from DomainRelationships. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Caller-supplied value-object fields scoped by relationship toEntityName. */
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
}

/** Inverse related collection consumed by routed browse/detail source as detail-route child table source. */
export interface AppBuilderRoutedCollectionDetailRelatedCollectionSource {
  /** Caller-owned reference-one relationship from related child rows to the current detail entity. */
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  /** Child-row domain rendered as a filtered detail-route collection. */
  readonly domain: AppBuilderDomainDescriptor;
  /** Caller-supplied child-row seed records. */
  readonly seedDataSet: AppBuilderSeedDataSetDescriptor;
  /** Visible heading emitted above the generated related table. */
  readonly title: string;
  /** Local repeat variable used by generated related table rows. */
  readonly itemLocalName: string;
  /** Caller-selected field/action columns rendered for each related row. */
  readonly tableColumns: readonly AppBuilderCollectionTableColumnPayload[];
}

/** Routed browse/detail table column source kind selected from CollectionTableColumns input. */
export enum AppBuilderRoutedCollectionDetailTableColumnKind {
  /** Field-backed column rendered from the primary collection item. */
  Field = 'field',
  /** Relationship-backed column rendered through the generated routed state label helper. */
  Relationship = 'relationship',
  /** Navigation-scoped action column rendered as a router load link to the detail route. */
  NavigationAction = 'navigation-action',
  /** Entity-scoped command action column rendered as a button that calls generated state/service source. */
  RowCommandAction = 'row-command-action',
}

/** Selected table presentation column for the routed collection/detail list route. */
export interface AppBuilderRoutedCollectionDetailTableColumnSource {
  /** Column kind selected from the caller's CollectionTableColumns payload. */
  readonly kind: AppBuilderRoutedCollectionDetailTableColumnKind;
  /** Original caller payload retained for response/debug provenance. */
  readonly column: AppBuilderCollectionTableColumnPayload;
  /** Human-facing table header. */
  readonly header: string;
  /** Domain field member for field-backed columns. */
  readonly fieldName?: string;
  /** Domain relationship name for relationship-backed columns. */
  readonly relationshipName?: string;
  /** Domain action name for row-to-detail navigation action columns. */
  readonly actionName?: string;
  /** Entity-scoped action descriptor for row command columns. */
  readonly rowCommandAction?: AppBuilderDomainActionDescriptor;
}

interface AppBuilderRoutedCollectionDetailSourceModel extends AppBuilderCustomElementSourceLayout {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly listRoute: AppBuilderCustomElementSourceLayout;
  readonly detailRoute: AppBuilderCustomElementSourceLayout;
  readonly domainModelPath: string;
  readonly stateModelPath: string;
  readonly entityTitle: string;
  readonly collectionTitle: string;
  readonly entityTypeName: string;
  readonly stateClassName: string;
  readonly collectionMemberName: string;
  readonly identityMemberName: string;
  readonly identityValueKind: AppBuilderDomainIdentityValueKind;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly titleField: AppBuilderDomainFieldSourceModel;
  readonly records: readonly AppBuilderSeedRecord[];
  readonly referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipModel[];
  readonly ownedRelationships: readonly AppBuilderRoutedCollectionDetailOwnedRelationshipModel[];
  readonly nestedValueObjectRelationships: readonly AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel[];
  readonly detailRelatedCollections: readonly AppBuilderRoutedCollectionDetailRelatedCollectionModel[];
  readonly viewportName: string;
  readonly nestedViewportName: string;
  readonly listRouteSegment: string;
  readonly detailRouteId: string;
  readonly detailRouteParameterName: string;
  readonly detailRouteChildSegment: string;
  readonly detailNavigationAction: AppBuilderRoutedCollectionDetailNavigationActionSource | null;
  readonly createForm: AppBuilderRoutedCollectionDetailCreateFormModel | null;
  readonly createActionFeedback: AppBuilderSourceLoweringActionFeedbackPayload | null;
  readonly tableColumns: readonly AppBuilderRoutedCollectionDetailTableColumnModel[];
  readonly serviceCollection: AppBuilderRoutedCollectionDetailServiceCollectionModel | null;
}

interface AppBuilderRoutedCollectionDetailServiceCollectionModel {
  readonly sourceTargetPath: string;
  readonly serviceClassName: string;
  readonly serviceMemberName: string;
  readonly loadMethodName: string;
  readonly findMethodName: string;
  readonly createMethodName: string | null;
  readonly filterMethods: readonly AppBuilderServiceCollectionFilterMethodSourceModel[];
  readonly updateMethods: readonly AppBuilderServiceCollectionUpdateMethodSourceModel[];
  readonly queryControls: readonly AppBuilderRoutedCollectionDetailServiceQueryControlSource[];
  readonly collectionPromiseMemberName: string;
  readonly detailPromiseMemberName: string;
  readonly fulfilledCollectionLocalName: string;
}

interface AppBuilderRoutedCollectionDetailCreateFormModel {
  readonly actionName: string;
  readonly fields: readonly AppBuilderRoutedCollectionDetailCreateFormFieldModel[];
  readonly submitButtonText: string;
}

interface AppBuilderRoutedCollectionDetailCreateFormFieldModel {
  readonly field: AppBuilderDomainFieldSourceModel | null;
  readonly memberName: string;
  readonly title: string;
  readonly typeScriptType: string;
  readonly initialValueExpression: string;
  readonly referenceRelationship: AppBuilderRoutedCollectionDetailReferenceRelationshipModel | null;
}

interface AppBuilderRoutedCollectionDetailTableColumnModel {
  readonly kind: AppBuilderRoutedCollectionDetailTableColumnKind;
  readonly column: AppBuilderCollectionTableColumnPayload;
  readonly header: string;
  readonly field?: AppBuilderDomainFieldSourceModel;
  readonly relationship?: AppBuilderRoutedCollectionDetailDisplayRelationshipModel;
  readonly navigationAction?: AppBuilderRoutedCollectionDetailNavigationActionSource;
  readonly rowCommandAction?: AppBuilderDomainActionDescriptor;
}

type AppBuilderRoutedCollectionDetailDisplayRelationshipModel =
  | AppBuilderRoutedCollectionDetailReferenceRelationshipModel
  | AppBuilderRoutedCollectionDetailOwnedRelationshipModel
  | AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel;

interface AppBuilderRoutedCollectionDetailReferenceRelationshipModel {
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  readonly title: string;
  readonly nameSegment: string;
  readonly relatedDomain: AppBuilderDomainDescriptor;
  readonly relatedDomainModelPath: string;
  readonly relatedFields: readonly AppBuilderDomainFieldSourceModel[];
  readonly relatedRecords: readonly AppBuilderSeedRecord[];
  readonly relatedItemName: string;
  readonly relatedCollectionMemberName: string;
  readonly localField: AppBuilderDomainFieldSourceModel | null;
  readonly localMemberName: string;
  readonly localValueKind: AppBuilderDomainRelationshipLocalValueKind;
  readonly foreignFieldName: string;
  readonly displayField: AppBuilderDomainFieldSourceModel;
  readonly relatedLookupMethodName: string;
  readonly labelMethodName: string;
}

interface AppBuilderRoutedCollectionDetailOwnedRelationshipModel {
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  readonly title: string;
  readonly nameSegment: string;
  readonly ownedDomain: AppBuilderDomainDescriptor;
  readonly ownedFields: readonly AppBuilderDomainFieldSourceModel[];
  readonly ownedItemName: string;
  readonly localMemberName: string;
  readonly displayField: AppBuilderDomainFieldSourceModel;
  readonly labelMethodName: string;
}

interface AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel {
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  readonly title: string;
  readonly nameSegment: string;
  readonly valueObjectTypeName: string;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly valueObjectItemName: string;
  readonly localMemberName: string;
  readonly displayField: AppBuilderDomainFieldSourceModel;
  readonly labelMethodName: string;
}

interface AppBuilderRoutedCollectionDetailRelatedCollectionModel {
  readonly relationship: AppBuilderDomainRelationshipDescriptor;
  readonly domain: AppBuilderDomainDescriptor;
  readonly fields: readonly AppBuilderDomainFieldSourceModel[];
  readonly records: readonly AppBuilderSeedRecord[];
  readonly domainModelPath: string;
  readonly collectionMemberName: string;
  readonly itemLocalName: string;
  readonly title: string;
  readonly filterMethodName: string;
  readonly localField: AppBuilderDomainFieldSourceModel;
  readonly foreignFieldName: string;
  readonly tableColumns: readonly AppBuilderCollectionTableColumnPayload[];
}

/** List-route template frame for routed collection/detail browse links and nested viewport placement. */
interface AppBuilderRoutedCollectionDetailListTemplateFrame {
  readonly createFormElement: AppBuilderTemplateElementSource | null;
  readonly createFeedbackElement: AppBuilderTemplateElementSource | null;
  readonly emptyStateIfAttribute: AppBuilderTemplateAttributeSource;
  readonly collectionElement: AppBuilderTemplateElementSource;
  readonly detailViewportElement: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
}

/** Detail-route template frame for the selected item branch, fields, and back navigation. */
interface AppBuilderRoutedCollectionDetailTemplateFrame {
  readonly itemIfAttribute: AppBuilderTemplateAttributeSource;
  readonly itemElseAttribute: AppBuilderTemplateAttributeSource;
  readonly backLoadAttribute: AppBuilderTemplateAttributeSource;
  readonly titleText: string;
  readonly fieldDisplayElements: readonly AppBuilderTemplateElementSource[];
  readonly relatedCollectionElements: readonly AppBuilderTemplateElementSource[];
  readonly missingItemText: string;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
}

/** Build a routed browse/detail source plan with DI state, route params, and ID-to-object lookup. */
export function appBuilderRoutedCollectionDetailSourcePlan(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
): SourcePlan {
  const model = normalizeRoutedCollectionDetailSourceRequest(request);
  const routeAreaFrame = routedCollectionDetailRouteAreaSourceFrameForModel(model);
  const routerAdmission = aureliaConfigurationAdmissionSourceSet([
    aureliaRouterConfigurationAdmissionSource(),
  ]);
  const assembly = new AppBuilderSourcePlanAssembly({
    rootDir: model.rootDir,
    appName: model.appName,
    dependencySpecifiers: routerAdmission.dependencySpecifiers,
  })
    .addConfiguredEntrypoint({
      entrypointPath: model.entrypointPath,
      rootComponentPath: model.componentPath,
      rootComponentClassName: model.className,
      configurationAdmission: routerAdmission,
    })
    .addFile(routedCollectionDetailRootComponentFileArtifact(model))
    .addFile(routedCollectionDetailRootTemplateFileArtifact(model));
  for (const file of routeAreaFrame.files) {
    assembly.addFile(file);
  }
  return assembly.build(appBuilderRoutedCollectionDetailSourcePattern(model.carrier, {
    detailRouteParameterName: routeAreaFrame.detailRouteParameterName,
    listRoutePath: routeAreaFrame.listRoutePath,
    includesServiceBoundary: routeAreaFrame.includesServiceBoundary,
    includesServiceBackedSubmission: routeAreaFrame.includesServiceBackedSubmission,
  }));
}

/** Build only the route-area files/config so a parent app shell can assemble multiple areas. */
export function appBuilderRoutedCollectionDetailRouteAreaSourceFrame(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
): AppBuilderRoutedCollectionDetailRouteAreaSourceFrame {
  return routedCollectionDetailRouteAreaSourceFrameForModel(normalizeRoutedCollectionDetailSourceRequest(request));
}

/** Imports required by a parent root component that references this route-area config. */
export function appBuilderRoutedCollectionDetailRouteAreaRootImports(
  frame: AppBuilderRoutedCollectionDetailRouteAreaSourceFrame,
  rootComponentPath: string,
): readonly TypeScriptImportRequirement[] {
  return frame.routeComponents.map((component) => ({
    moduleSpecifier: moduleSpecifier(rootComponentPath, component.componentPath, false),
    namedImports: [component.className],
  }));
}

function routedCollectionDetailRouteAreaSourceFrameForModel(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): AppBuilderRoutedCollectionDetailRouteAreaSourceFrame {
  return {
    files: routedCollectionDetailRouteAreaFileArtifacts(model),
    routeConfig: routedCollectionDetailRouteConfigSource(model),
    routeComponents: [
      {
        componentPath: model.listRoute.componentPath,
        className: model.listRoute.className,
      },
      {
        componentPath: model.detailRoute.componentPath,
        className: model.detailRoute.className,
      },
    ],
    navigationLink: {
      path: model.listRouteSegment,
      title: model.collectionTitle,
    },
    detailRouteParameterName: model.detailRouteParameterName,
    listRoutePath: model.listRouteSegment,
    includesServiceBoundary: model.serviceCollection != null,
    includesServiceBackedSubmission: model.serviceCollection != null && model.createForm != null,
  };
}

function routedCollectionDetailRouteAreaFileArtifacts(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly SourcePlanFileArtifact[] {
  const stateSource = routedCollectionDetailStateModelSource(model);
  return [
    routedCollectionDetailListRouteFileArtifact(model),
    routedCollectionDetailListTemplateFileArtifact(model),
    routedCollectionDetailRouteFileArtifact(model),
    routedCollectionDetailTemplateFileArtifact(model),
    routedCollectionDetailDomainFileArtifact(model),
    ...(model.serviceCollection == null
      ? []
      : [routedCollectionDetailServiceCollectionFileArtifact(model, model.serviceCollection)]),
    ...uniqueByKey(
      model.referenceRelationships,
      (candidate) => candidate.relatedDomainModelPath,
    ).map(routedCollectionDetailRelatedDomainFileArtifact),
    ...uniqueByKey(
      model.detailRelatedCollections,
      (candidate) => candidate.domainModelPath,
    ).map(routedCollectionDetailDetailRelatedDomainFileArtifact),
    {
      path: model.stateModelPath,
      role: SourcePlanFileRole.StateModel,
      language: SourcePlanLanguage.TypeScript,
      operationKind: SourcePlanOperationKind.CreateStateModel,
      text: stateSource.text,
      contributions: stateSource.contributions,
    },
  ];
}

function routedCollectionDetailDomainFileArtifact(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): SourcePlanFileArtifact {
  const objectRelationships = routedCollectionDetailObjectReferenceRelationships(model);
  const domainSources = [
    appBuilderDomainEntityClassSource({
    entityTypeName: model.entityTypeName,
    identityMemberName: model.identityMemberName,
    identityValueKind: model.identityValueKind,
    fields: model.fields,
    extraProperties: routedCollectionDetailDomainExtraProperties(model),
    fieldParameterModifier: 'readonly',
    mutableFieldNames: routedCollectionDetailMutableFieldNames(model),
    includeDisplayAccessors: true,
    displayAccessorFields: routedCollectionDetailDisplayAccessorFields(model),
    }),
    ...model.ownedRelationships.map(routedCollectionDetailOwnedEntitySource),
    ...model.nestedValueObjectRelationships.map(routedCollectionDetailNestedValueObjectSource),
  ];
  const source = typeScriptSourceText(domainSources.join('\n'), uniqueByKey(
    objectRelationships.map((relationship) => ({
      moduleSpecifier: moduleSpecifier(model.domainModelPath, relationship.relatedDomainModelPath, false),
      namedTypeImports: [relationship.relatedDomain.entityTypeName],
    })),
    (requirement) => requirement.moduleSpecifier,
  ));
  return {
    path: model.domainModelPath,
    role: SourcePlanFileRole.DomainModel,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateDomainModel,
    text: source.text,
    contributions: source.contributions,
  };
}

function normalizeRoutedCollectionDetailSourceRequest(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
): AppBuilderRoutedCollectionDetailSourceModel {
  const fields = appBuilderDomainFieldSourceModels(request.domain.fields, {
    entityTypeName: request.domain.entityTypeName,
    valueSets: request.valueSets ?? [],
  });
  const titleField = appBuilderPrimaryDomainField(fields, AppBuilderDomainFieldValueKind.Text);
  if (titleField == null) {
    throw new Error(`App-builder domain '${request.domain.id}' must provide a text field for routed browse/detail lowering.`);
  }

  const entityFileName = appBuilderKebabCase(request.domain.entityTypeName);
  const listRouteSegment = sourcePatternParameterValue(
    request.sourcePatternParameterValues ?? [],
    SourcePatternParameterKey.ListRoutePath,
  ) ?? appBuilderKebabCase(request.domain.collectionMemberName);
  const detailRouteParameterName = sourcePatternParameterValue(
    request.sourcePatternParameterValues ?? [],
    SourcePatternParameterKey.DetailRouteParameter,
  ) ?? `${appBuilderLowerCamelCase(request.domain.entityTypeName)}Id`;
  const rootLayout = appBuilderRootCustomElementSourceLayout(request.carrier);
  const referenceRelationships = routedCollectionDetailReferenceRelationshipModels(request, fields);
  const ownedRelationships = routedCollectionDetailOwnedRelationshipModels(request);
  const nestedValueObjectRelationships = routedCollectionDetailNestedValueObjectRelationshipModels(request);
  const detailRelatedCollections = routedCollectionDetailRelatedCollectionModels(request);
  const displayRelationships = [
    ...referenceRelationships,
    ...ownedRelationships,
    ...nestedValueObjectRelationships,
  ];
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: 'src/main.ts',
    ...rootLayout,
    listRoute: appBuilderCustomElementSourceLayout({
      carrier: request.carrier,
      componentPath: `src/routes/${entityFileName}-list-route.ts`,
      templatePath: `src/routes/${entityFileName}-list-route.html`,
      className: `${request.domain.entityTypeName}ListRoute`,
      resourceName: `${entityFileName}-list-route`,
    }),
    detailRoute: appBuilderCustomElementSourceLayout({
      carrier: request.carrier,
      componentPath: `src/routes/${entityFileName}-detail-route.ts`,
      templatePath: `src/routes/${entityFileName}-detail-route.html`,
      className: `${request.domain.entityTypeName}DetailRoute`,
      resourceName: `${entityFileName}-detail-route`,
    }),
    domainModelPath: `src/${entityFileName}.ts`,
    stateModelPath: `src/${entityFileName}-browse-state.ts`,
    entityTitle: request.domain.entityTitle,
    collectionTitle: pluralDisplayTitle(request.domain.entityTitle),
    entityTypeName: request.domain.entityTypeName,
    stateClassName: `${request.domain.entityTypeName}BrowseState`,
    collectionMemberName: request.domain.collectionMemberName,
    identityMemberName: request.domain.identityMemberName,
    identityValueKind: request.domain.identityValueKind,
    fields,
    titleField,
    records: request.seedDataSet.records,
    referenceRelationships,
    ownedRelationships,
    nestedValueObjectRelationships,
    detailRelatedCollections,
    viewportName: 'main',
    nestedViewportName: 'detail',
    listRouteSegment,
    detailRouteId: `${entityFileName}-detail`,
    detailRouteParameterName,
    detailRouteChildSegment: `:${detailRouteParameterName}`,
    detailNavigationAction: request.detailNavigationAction ?? null,
    createForm: routedCollectionDetailCreateFormModel(request, fields, referenceRelationships),
    createActionFeedback: request.createActionFeedback ?? null,
    tableColumns: routedCollectionDetailTableColumnModels(request, fields, displayRelationships),
    serviceCollection: routedCollectionDetailServiceCollectionModel(request),
  };
}

function routedCollectionDetailServiceCollectionModel(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
): AppBuilderRoutedCollectionDetailServiceCollectionModel | null {
  const serviceCollection = request.serviceCollection;
  if (serviceCollection == null) {
    return null;
  }
  return {
    sourceTargetPath: serviceCollection.sourceTargetPath,
    serviceClassName: serviceCollection.serviceClassName,
    serviceMemberName: appBuilderLowerCamelCase(serviceCollection.serviceClassName),
    loadMethodName: serviceCollection.loadMethodName,
    findMethodName: serviceCollection.findMethodName,
    createMethodName: serviceCollection.createMethodName
      ?? (request.createForm == null ? null : `create${request.domain.entityTypeName}`),
    filterMethods: serviceCollection.filterMethods ?? [],
    updateMethods: serviceCollection.updateMethods ?? [],
    queryControls: serviceCollection.queryControls ?? [],
    collectionPromiseMemberName: `${request.domain.collectionMemberName}Promise`,
    detailPromiseMemberName: `${appBuilderLowerCamelCase(request.domain.entityTypeName)}Promise`,
    fulfilledCollectionLocalName: `loaded${appBuilderPascalCase(request.domain.collectionMemberName)}`,
  };
}

function routedCollectionDetailCreateFormModel(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipModel[],
): AppBuilderRoutedCollectionDetailCreateFormModel | null {
  if (request.createForm == null) {
    return null;
  }
  return {
    actionName: request.createForm.actionName,
    fields: request.createForm.fieldNames.map((fieldName) => {
      const field = fields.find((candidate) => candidate.memberName === fieldName);
      if (field != null) {
        return {
          field,
          memberName: field.memberName,
          title: field.field.title,
          typeScriptType: field.typeScriptType,
          initialValueExpression: appBuilderDomainFieldSeedLiteral(undefined, field),
          referenceRelationship: routedCollectionDetailCreateFormReferenceRelationship(field.memberName, referenceRelationships),
        };
      }
      const objectRelationship = routedCollectionDetailCreateFormObjectRelationship(fieldName, referenceRelationships);
      if (objectRelationship == null) {
        throw new Error(`Create form action '${request.createForm?.actionName}' references unknown field '${fieldName}'.`);
      }
      return {
        field: null,
        memberName: objectRelationship.localMemberName,
        title: objectRelationship.title,
        typeScriptType: routedCollectionDetailObjectRelationshipTypeScriptType(objectRelationship),
        initialValueExpression: routedCollectionDetailObjectRelationshipInitialValueExpression(objectRelationship),
        referenceRelationship: objectRelationship,
      };
    }),
    submitButtonText: request.createForm.submitButtonText,
  };
}

function routedCollectionDetailCreateFormReferenceRelationship(
  memberName: string,
  referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipModel[],
): AppBuilderRoutedCollectionDetailReferenceRelationshipModel | null {
  return referenceRelationships.find((relationship) =>
    relationship.localMemberName === memberName
    && (relationship.relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity) === AppBuilderDomainRelationshipLocalValueKind.Identity
  ) ?? null;
}

function routedCollectionDetailCreateFormObjectRelationship(
  memberName: string,
  referenceRelationships: readonly AppBuilderRoutedCollectionDetailReferenceRelationshipModel[],
): AppBuilderRoutedCollectionDetailReferenceRelationshipModel | null {
  return referenceRelationships.find((relationship) =>
    relationship.localMemberName === memberName
    && relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object
    && (relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceOne
      || relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany)
  ) ?? null;
}

function routedCollectionDetailTableColumnModels(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
  fields: readonly AppBuilderDomainFieldSourceModel[],
  relationships: readonly AppBuilderRoutedCollectionDetailDisplayRelationshipModel[],
): readonly AppBuilderRoutedCollectionDetailTableColumnModel[] {
  return (request.tableColumns ?? []).map((column) => {
    switch (column.kind) {
      case AppBuilderRoutedCollectionDetailTableColumnKind.Field: {
        const fieldName = requiredRelationshipValue(column.fieldName, column.header, 'fieldName');
        const field = fields.find((candidate) => candidate.memberName === fieldName);
        if (field == null) {
          throw new Error(`Table column '${column.header}' references unknown field '${fieldName}'.`);
        }
        return { ...column, field };
      }
      case AppBuilderRoutedCollectionDetailTableColumnKind.Relationship: {
        const relationshipName = requiredRelationshipValue(column.relationshipName, column.header, 'relationshipName');
        const relationship = relationships.find((candidate) => candidate.relationship.name === relationshipName);
        if (relationship == null) {
          throw new Error(`Table column '${column.header}' references unknown routed relationship '${relationshipName}'.`);
        }
        return { ...column, relationship };
      }
      case AppBuilderRoutedCollectionDetailTableColumnKind.NavigationAction: {
        const actionName = requiredRelationshipValue(column.actionName, column.header, 'actionName');
        const navigationAction = request.detailNavigationAction?.actionName === actionName
          ? request.detailNavigationAction
          : null;
        if (navigationAction == null) {
          throw new Error(`Table column '${column.header}' references unknown routed navigation action '${actionName}'.`);
        }
        return { ...column, navigationAction };
      }
      case AppBuilderRoutedCollectionDetailTableColumnKind.RowCommandAction: {
        if (column.rowCommandAction == null) {
          throw new Error(`Table column '${column.header}' references a row command action without a selected action descriptor.`);
        }
        return { ...column, rowCommandAction: column.rowCommandAction };
      }
    }
  });
}

function routedCollectionDetailReferenceRelationshipModels(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
  primaryFields: readonly AppBuilderDomainFieldSourceModel[],
): readonly AppBuilderRoutedCollectionDetailReferenceRelationshipModel[] {
  return (request.referenceRelationships ?? []).map((source) => {
    const relationship = source.relationship;
    const relatedFields = appBuilderDomainFieldSourceModels(source.relatedDomain.fields, {
      entityTypeName: source.relatedDomain.entityTypeName,
    });
    const localFieldName = requiredRelationshipValue(relationship.localFieldName, relationship.name, 'localFieldName');
    const foreignFieldName = requiredRelationshipValue(relationship.foreignFieldName, relationship.name, 'foreignFieldName');
    const displayFieldName = requiredRelationshipValue(relationship.displayFieldName, relationship.name, 'displayFieldName');
    const localValueKind = relationship.localValueKind ?? AppBuilderDomainRelationshipLocalValueKind.Identity;
    const localField = primaryFields.find((field) => field.memberName === localFieldName) ?? null;
    const displayField = relatedFields.find((field) => field.memberName === displayFieldName);
    if (localField == null && localValueKind === AppBuilderDomainRelationshipLocalValueKind.Identity) {
      throw new Error(`Relationship '${relationship.name}' localFieldName '${localFieldName}' is not part of '${request.domain.entityTypeName}'.`);
    }
    if (displayField == null) {
      throw new Error(`Relationship '${relationship.name}' displayFieldName '${displayFieldName}' is not part of '${source.relatedDomain.entityTypeName}'.`);
    }
    return {
      relationship,
      title: relationship.title ?? titleSourceName(sourceNameWords(relationship.name)),
      nameSegment: appBuilderPascalCase(relationship.name),
      relatedDomain: source.relatedDomain,
      relatedDomainModelPath: `src/${appBuilderKebabCase(source.relatedDomain.entityTypeName)}.ts`,
      relatedFields,
      relatedRecords: source.seedDataSet.records,
      relatedItemName: appBuilderLowerCamelCase(source.relatedDomain.entityTypeName),
      relatedCollectionMemberName: source.relatedDomain.collectionMemberName,
      localField,
      localMemberName: localFieldName,
      localValueKind,
      foreignFieldName,
      displayField,
      relatedLookupMethodName: `${appBuilderLowerCamelCase(relationship.name)}For${request.domain.entityTypeName}`,
      labelMethodName: `${appBuilderLowerCamelCase(relationship.name)}LabelFor${request.domain.entityTypeName}`,
    };
  });
}

function routedCollectionDetailOwnedRelationshipModels(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
): readonly AppBuilderRoutedCollectionDetailOwnedRelationshipModel[] {
  return (request.ownedRelationships ?? []).map((source) => {
    const relationship = source.relationship;
    const ownedFields = appBuilderDomainFieldSourceModels(source.ownedDomain.fields, {
      entityTypeName: source.ownedDomain.entityTypeName,
      valueSets: request.valueSets ?? [],
    });
    const localMemberName = requiredRelationshipValue(relationship.localFieldName, relationship.name, 'localFieldName');
    const displayFieldName = requiredRelationshipValue(relationship.displayFieldName, relationship.name, 'displayFieldName');
    const displayField = ownedFields.find((field) => field.memberName === displayFieldName);
    if (displayField == null) {
      throw new Error(`Relationship '${relationship.name}' displayFieldName '${displayFieldName}' is not part of '${source.ownedDomain.entityTypeName}'.`);
    }
    return {
      relationship,
      title: relationship.title ?? titleSourceName(sourceNameWords(relationship.name)),
      nameSegment: appBuilderPascalCase(relationship.name),
      ownedDomain: source.ownedDomain,
      ownedFields,
      ownedItemName: appBuilderLowerCamelCase(source.ownedDomain.entityTypeName),
      localMemberName,
      displayField,
      labelMethodName: `${appBuilderLowerCamelCase(relationship.name)}LabelFor${request.domain.entityTypeName}`,
    };
  });
}

function routedCollectionDetailNestedValueObjectRelationshipModels(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
): readonly AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel[] {
  return (request.nestedValueObjectRelationships ?? []).map((source) => {
    const relationship = source.relationship;
    const fields = appBuilderDomainFieldSourceModels(source.fields, {
      entityTypeName: appBuilderPascalCase(relationship.toEntityName),
      valueSets: request.valueSets ?? [],
    });
    const localMemberName = requiredRelationshipValue(relationship.localFieldName, relationship.name, 'localFieldName');
    const displayFieldName = requiredRelationshipValue(relationship.displayFieldName, relationship.name, 'displayFieldName');
    const displayField = fields.find((field) => field.memberName === displayFieldName);
    if (displayField == null) {
      throw new Error(`Relationship '${relationship.name}' displayFieldName '${displayFieldName}' is not part of value object '${relationship.toEntityName}'.`);
    }
    const valueObjectTypeName = appBuilderPascalCase(relationship.toEntityName);
    return {
      relationship,
      title: relationship.title ?? titleSourceName(sourceNameWords(relationship.name)),
      nameSegment: appBuilderPascalCase(relationship.name),
      valueObjectTypeName,
      fields,
      valueObjectItemName: appBuilderLowerCamelCase(valueObjectTypeName),
      localMemberName,
      displayField,
      labelMethodName: `${appBuilderLowerCamelCase(relationship.name)}LabelFor${request.domain.entityTypeName}`,
    };
  });
}

function routedCollectionDetailRelatedCollectionModels(
  request: AppBuilderRoutedCollectionDetailSourceRequest,
): readonly AppBuilderRoutedCollectionDetailRelatedCollectionModel[] {
  return (request.detailRelatedCollections ?? []).map((source) => {
    const relationship = source.relationship;
    const fields = appBuilderDomainFieldSourceModels(source.domain.fields, {
      entityTypeName: source.domain.entityTypeName,
      valueSets: request.valueSets ?? [],
    });
    const localFieldName = requiredRelationshipValue(relationship.localFieldName, relationship.name, 'localFieldName');
    const foreignFieldName = requiredRelationshipValue(relationship.foreignFieldName, relationship.name, 'foreignFieldName');
    const localField = fields.find((field) => field.memberName === localFieldName);
    if (localField == null) {
      throw new Error(`Detail related collection '${relationship.name}' localFieldName '${localFieldName}' is not part of '${source.domain.entityTypeName}'.`);
    }
    return {
      relationship,
      domain: source.domain,
      fields,
      records: source.seedDataSet.records,
      domainModelPath: `src/${appBuilderKebabCase(source.domain.entityTypeName)}.ts`,
      collectionMemberName: source.domain.collectionMemberName,
      itemLocalName: source.itemLocalName,
      title: source.title,
      filterMethodName: `${appBuilderLowerCamelCase(source.domain.collectionMemberName)}For${request.domain.entityTypeName}`,
      localField,
      foreignFieldName,
      tableColumns: source.tableColumns,
    };
  });
}

function requiredRelationshipValue(
  value: string | undefined,
  relationshipName: string,
  fieldName: string,
): string {
  if (value == null || value.trim().length === 0) {
    throw new Error(`Relationship '${relationshipName}' must supply ${fieldName} before routed source can be emitted.`);
  }
  return value;
}

function routedCollectionDetailRootComponentFileArtifact(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): SourcePlanFileArtifact {
  const routeDecorator = appBuilderRouteDecoratorFragment({
    title: model.appName,
    routes: [
      { path: '', redirectTo: model.listRouteSegment },
      routedCollectionDetailRouteConfigSource(model),
    ],
  });
  const routeDecoratorContributions = appBuilderPartSourceFragmentContributions(routeDecorator, SourcePlanLanguage.TypeScript);
  const prelude = appBuilderCustomElementTypeScriptPreludeSource(
    model,
    routedCollectionDetailRouteComponentImports(model, model.componentPath),
    routeDecoratorContributions,
  );
  return {
    path: model.componentPath,
    role: SourcePlanFileRole.RootComponent,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateComponentViewModel,
    text: appBuilderCustomElementClassSource(model, prelude, '', [routeDecorator.text]),
    contributions: prelude.contributions,
  };
}

function routedCollectionDetailRouteConfigSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): RouterRouteConfigSource {
  return {
    id: model.collectionMemberName,
    path: model.listRouteSegment,
    componentIdentifier: model.listRoute.className,
    title: model.collectionTitle,
    viewport: model.viewportName,
    routes: [
      {
        id: model.detailRouteId,
        path: model.detailRouteChildSegment,
        componentIdentifier: model.detailRoute.className,
        title: `${model.entityTitle} Detail`,
        viewport: model.nestedViewportName,
      },
    ],
  };
}

function routedCollectionDetailRouteComponentImports(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  ownerComponentPath: string,
): readonly TypeScriptImportRequirement[] {
  return [
    {
      moduleSpecifier: moduleSpecifier(ownerComponentPath, model.listRoute.componentPath, false),
      namedImports: [model.listRoute.className],
    },
    {
      moduleSpecifier: moduleSpecifier(ownerComponentPath, model.detailRoute.componentPath, false),
      namedImports: [model.detailRoute.className],
    },
  ];
}

function routedCollectionDetailRelatedDomainFileArtifact(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipModel,
): SourcePlanFileArtifact {
  return {
    path: relationship.relatedDomainModelPath,
    role: SourcePlanFileRole.DomainModel,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateDomainModel,
    text: appBuilderDomainEntityClassSource({
      entityTypeName: relationship.relatedDomain.entityTypeName,
      identityMemberName: relationship.relatedDomain.identityMemberName,
      identityValueKind: relationship.relatedDomain.identityValueKind,
      fields: relationship.relatedFields,
      fieldParameterModifier: 'readonly',
      includeDisplayAccessors: true,
    }),
  };
}

function routedCollectionDetailDetailRelatedDomainFileArtifact(
  collection: AppBuilderRoutedCollectionDetailRelatedCollectionModel,
): SourcePlanFileArtifact {
  return {
    path: collection.domainModelPath,
    role: SourcePlanFileRole.DomainModel,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateDomainModel,
    text: appBuilderDomainEntityClassSource({
      entityTypeName: collection.domain.entityTypeName,
      identityMemberName: collection.domain.identityMemberName,
      identityValueKind: collection.domain.identityValueKind,
      fields: collection.fields,
      fieldParameterModifier: 'readonly',
      includeDisplayAccessors: true,
      displayAccessorFields: routedCollectionDetailRelatedCollectionDisplayAccessorFields(collection),
    }),
  };
}

function routedCollectionDetailServiceCollectionFileArtifact(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  serviceCollection: AppBuilderRoutedCollectionDetailServiceCollectionModel,
): SourcePlanFileArtifact {
  return appBuilderServiceCollectionFileArtifact(serviceCollection.sourceTargetPath, {
    serviceClassName: serviceCollection.serviceClassName,
    recordTypeName: model.entityTypeName,
    loadMethodName: serviceCollection.loadMethodName,
    entityTypeName: model.entityTypeName,
    collectionMemberName: model.collectionMemberName,
    identityMemberName: model.identityMemberName,
    identityValueKind: model.identityValueKind,
    fields: model.fields.map((field) => field.field),
    seedRecords: model.records,
    recordTypeSourceKind: AppBuilderServiceCollectionRecordTypeSourceKind.ImportedDomainEntity,
    recordTypeImport: {
      moduleSpecifier: moduleSpecifier(serviceCollection.sourceTargetPath, model.domainModelPath, false),
      namedImports: routedCollectionDetailDomainModelValueImports(model),
      namedTypeImports: routedCollectionDetailFiniteOptionTypeImports(model.fields),
    },
    findMethod: {
      methodName: serviceCollection.findMethodName,
      parameterName: model.identityMemberName,
      parameterTypeScriptType: 'string',
      compareAsRouteParameter: true,
    },
    createMethods: serviceCollection.createMethodName == null || model.createForm == null
      ? []
      : [{
          methodName: serviceCollection.createMethodName,
          inputFieldNames: routedCollectionDetailServiceCreateInputFieldNames(model),
        }],
    filterMethods: serviceCollection.filterMethods,
    updateMethods: serviceCollection.updateMethods,
    relatedCollections: routedCollectionDetailServiceRelatedCollections(model, serviceCollection),
    extraProperties: routedCollectionDetailServiceExtraProperties(model),
  });
}

function routedCollectionDetailServiceCreateInputFieldNames(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly string[] {
  if (model.createForm == null) {
    return [];
  }
  return model.createForm.fields.map((fieldModel) => {
    return fieldModel.memberName;
  });
}

function routedCollectionDetailMutableFieldNames(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly string[] {
  return appBuilderEntityMutationFieldNamesForDomainActions(
    routedCollectionDetailRowCommandActions(model),
    model.fields.map((field) => field.field),
  );
}

function routedCollectionDetailRowCommandActions(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly AppBuilderDomainActionDescriptor[] {
  return model.tableColumns
    .map((column) => column.rowCommandAction)
    .filter((action): action is AppBuilderDomainActionDescriptor => action != null);
}

function routedCollectionDetailServiceRelatedCollections(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  serviceCollection: AppBuilderRoutedCollectionDetailServiceCollectionModel,
) {
  return uniqueByKey(
    routedCollectionDetailObjectReferenceRelationships(model).map((relationship) => ({
      entityTypeName: relationship.relatedDomain.entityTypeName,
      collectionMemberName: relationship.relatedCollectionMemberName,
      identityMemberName: relationship.relatedDomain.identityMemberName,
      fields: relationship.relatedDomain.fields,
      seedRecords: relationship.relatedRecords,
      recordTypeImport: {
        moduleSpecifier: moduleSpecifier(serviceCollection.sourceTargetPath, relationship.relatedDomainModelPath, false),
        namedImports: [relationship.relatedDomain.entityTypeName],
      },
    })),
    (collection) => collection.collectionMemberName,
  );
}

function routedCollectionDetailServiceExtraProperties(
  model: AppBuilderRoutedCollectionDetailSourceModel,
) {
  return routedCollectionDetailRelationshipInitializerProperties(model).map((property) => ({
    memberName: property.memberName,
    typeScriptType: property.typeScriptType,
    seedExpressionForRecord: property.expressionForRecord,
    defaultExpression: property.defaultExpression,
  }));
}

function routedCollectionDetailObjectRelationshipTypeScriptType(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipModel,
): string {
  return relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany
    ? `${relationship.relatedDomain.entityTypeName}[]`
    : `${relationship.relatedDomain.entityTypeName} | null`;
}

function routedCollectionDetailObjectRelationshipInitialValueExpression(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipModel,
): string {
  return relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany
    ? '[]'
    : `this.state.${relationship.relatedCollectionMemberName}[0] ?? null`;
}

function routedCollectionDetailObjectRelationshipDefaultExpression(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipModel,
): string {
  return relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany
    ? '[]'
    : 'null';
}

function routedCollectionDetailRootTemplateFileArtifact(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): SourcePlanFileArtifact {
  return appBuilderHtmlTemplateFileArtifact(model.templatePath, routedCollectionDetailRootTemplateSource(model));
}

function routedCollectionDetailRootTemplateSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): AppBuilderHtmlTemplateSource {
  const listLoad = appBuilderRouterLoadAttributeFragment(model.listRouteSegment);
  const viewport = appBuilderViewportElementFragment({ name: model.viewportName });
  return {
    text: `${authoredTemplateElementSourceText(authoredTemplateElementSource('main', [], null, [
    authoredTemplateElementSource('nav', [], null, [
      authoredTemplateElementSource('a', [listLoad.templateAttribute], model.collectionTitle),
    ]),
    viewport.templateElement,
  ]))}
`,
    fragments: [listLoad, viewport],
  };
}

function routedCollectionDetailListRouteFileArtifact(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): SourcePlanFileArtifact {
  const createFormChoiceTypeImports = routedCollectionDetailCreateFormChoiceTypeImports(model);
  const createFormObjectTypeImports = routedCollectionDetailCreateFormObjectTypeImports(model);
  const classMemberText = appBuilderTypeScriptClassMemberFragmentsText([
    { text: `readonly state = resolve(${model.stateClassName});` },
    ...routedCollectionDetailListRouteServiceClassMemberFragments(model),
    ...routedCollectionDetailRowCommandClassMemberFragments(model),
    ...routedCollectionDetailCreateFormClassMemberFragments(model),
  ]);
  const prelude = appBuilderCustomElementTypeScriptPreludeSource(model.listRoute, [
    { moduleSpecifier: 'aurelia', namedImports: ['resolve'] },
    {
      moduleSpecifier: moduleSpecifier(model.listRoute.componentPath, model.stateModelPath, false),
      namedImports: [model.stateClassName],
    },
    ...(createFormChoiceTypeImports.length === 0 ? [] : [{
      moduleSpecifier: moduleSpecifier(model.listRoute.componentPath, model.domainModelPath, false),
      namedTypeImports: createFormChoiceTypeImports,
    }]),
    ...createFormObjectTypeImports,
  ]);
  return {
    path: model.listRoute.componentPath,
    role: SourcePlanFileRole.Component,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateComponentViewModel,
    text: appBuilderCustomElementClassSource(
      model.listRoute,
      prelude,
      `${classMemberText}\n`,
    ),
    contributions: prelude.contributions,
  };
}

function routedCollectionDetailListRouteServiceClassMemberFragments(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly { readonly text: string }[] {
  const serviceCollection = model.serviceCollection;
  if (serviceCollection == null) {
    return [];
  }
  return [{
    text: `${serviceCollection.collectionPromiseMemberName}: ReturnType<${model.stateClassName}['${serviceCollection.loadMethodName}']> = this.state.${serviceCollection.loadMethodName}();`,
  }, ...serviceCollection.queryControls.flatMap((queryControl) =>
    routedCollectionDetailQueryControlClassMemberFragments(queryControl, serviceCollection)
  )];
}

function routedCollectionDetailRowCommandClassMemberFragments(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly { readonly text: string }[] {
  if (model.serviceCollection == null) {
    return [];
  }
  const serviceCollection = model.serviceCollection;
  return routedCollectionDetailRowCommandActions(model).map((action) => {
    const updateMethod = routedCollectionDetailUpdateMethodForAction(model, action);
    if (updateMethod == null) {
      throw new Error(`Row command action '${action.name}' has no matching routed service update method.`);
    }
    const itemName = appBuilderLowerCamelCase(model.entityTypeName);
    const identityType = appBuilderDomainIdentityTypeScriptType(model.identityValueKind);
    const queryRefresh = serviceCollection.queryControls[0]?.reloadMethodName ?? null;
    const updateArguments = [
      `${itemName}.${model.identityMemberName}`,
      ...routedCollectionDetailUpdateMethodArgumentExpressions(model, action, updateMethod),
    ].join(', ');
    const body = queryRefresh == null
      ? `this.${serviceCollection.collectionPromiseMemberName} = this.state.${updateMethod.methodName}(${updateArguments});
  await this.${serviceCollection.collectionPromiseMemberName};`
      : `await this.state.${updateMethod.methodName}(${updateArguments});
  this.${queryRefresh}();`;
    return {
      text: `async ${action.name}(${itemName}: { readonly ${model.identityMemberName}: ${identityType} }): Promise<void> {
  ${body}
}`,
    };
  });
}

function routedCollectionDetailUpdateMethodForAction(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  action: AppBuilderDomainActionDescriptor,
): AppBuilderServiceCollectionUpdateMethodSourceModel | null {
  if (model.serviceCollection == null) {
    return null;
  }
  const mutationFieldNames = routedCollectionDetailActionMutationFieldNames(model, action);
  return model.serviceCollection.updateMethods.find((updateMethod) =>
    stringArraysEqual(updateMethod.inputFieldNames, mutationFieldNames)
  ) ?? null;
}

function routedCollectionDetailActionMutationFieldNames(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  action: AppBuilderDomainActionDescriptor,
): readonly string[] {
  return appBuilderEntityMutationFieldNamesForDomainActions([action], model.fields.map((field) => field.field));
}

function routedCollectionDetailUpdateMethodArgumentExpressions(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  action: AppBuilderDomainActionDescriptor,
  updateMethod: AppBuilderServiceCollectionUpdateMethodSourceModel,
): readonly string[] {
  return updateMethod.inputFieldNames.map((fieldName) => {
    const completeFieldName = appBuilderEntityCompleteMutationFieldName(action, model.fields.map((field) => field.field));
    if (completeFieldName === fieldName) {
      return 'true';
    }
    throw new Error(`Row command action '${action.name}' needs an explicit argument expression for update field '${fieldName}'.`);
  });
}

function routedCollectionDetailQueryControlClassMemberFragments(
  queryControl: AppBuilderRoutedCollectionDetailServiceQueryControlSource,
  serviceCollection: AppBuilderRoutedCollectionDetailServiceCollectionModel,
): readonly { readonly text: string }[] {
  return [
    {
      text: `${queryControl.stateMemberName}: ${queryControl.stateTypeText} = ${queryControl.initialValueExpression};`,
    },
    ...routedCollectionDetailQueryControlFeedbackMemberFragments(queryControl),
    {
      text: `${queryControl.reloadMethodName}() {
  const queryValue = this.${queryControl.stateMemberName};
  this.${queryControl.resultMemberName} = queryValue === ${queryControl.inactiveValueExpression}
    ? this.state.${serviceCollection.loadMethodName}()
    : this.state.${queryControl.filterMethodName}(queryValue);
}`,
    },
    {
      text: `${queryControl.applyActionName}() {
${routedCollectionDetailQueryControlActionBody([
  `this.${queryControl.reloadMethodName}();`,
], queryControl.applyActionFeedback)}
}`,
    },
    {
      text: `${queryControl.clearActionName}() {
${routedCollectionDetailQueryControlActionBody([
  `this.${queryControl.stateMemberName} = ${queryControl.inactiveValueExpression};`,
  `this.${queryControl.reloadMethodName}();`,
], queryControl.clearActionFeedback)}
}`,
    },
  ];
}

function routedCollectionDetailQueryControlFeedbackMemberFragments(
  queryControl: AppBuilderRoutedCollectionDetailServiceQueryControlSource,
): readonly { readonly text: string }[] {
  const feedbackMembers = [
    queryControl.applyActionFeedback,
    queryControl.clearActionFeedback,
  ].filter((feedback): feedback is AppBuilderSourceLoweringActionFeedbackPayload => feedback != null);
  return uniqueByKey(feedbackMembers, (feedback) => feedback.statusMemberName).map((feedback) => ({
    text: `${feedback.statusMemberName}: string = '';`,
  }));
}

function routedCollectionDetailQueryControlActionBody(
  statements: readonly string[],
  feedback: AppBuilderSourceLoweringActionFeedbackPayload | null | undefined,
): string {
  return [
    ...statements,
    ...(feedback == null ? [] : [
      `this.${feedback.statusMemberName} = ${appBuilderSeedRecordLiteral(feedback.statusText)};`,
    ]),
  ].map((statement) => `  ${statement}`).join('\n');
}

function routedCollectionDetailCreateFormClassMemberFragments(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly { readonly text: string }[] {
  if (model.createForm == null) {
    return [];
  }
  return [
    ...model.createForm.fields.map((fieldModel) => ({
      text: `${fieldModel.memberName}: ${fieldModel.typeScriptType} = ${fieldModel.initialValueExpression};`,
    })),
    ...(model.createActionFeedback == null ? [] : [{
      text: `${model.createActionFeedback.statusMemberName}: string = '';`,
    }]),
    {
      text: `${model.serviceCollection != null && model.createActionFeedback != null ? 'async ' : ''}${model.createForm.actionName}() {
  ${routedCollectionDetailCreateFormStateCallSource(model)}
}`,
    },
  ];
}

function routedCollectionDetailCreateFormStateCallSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): string {
  if (model.createForm == null) {
    return '';
  }
  const stateCall = `this.state.create${model.entityTypeName}(${model.createForm.fields.map((fieldModel) => `this.${fieldModel.memberName}`).join(', ')})`;
  const feedbackStatement = model.createActionFeedback == null
    ? ''
    : `\n  this.${model.createActionFeedback.statusMemberName} = ${appBuilderSeedRecordLiteral(model.createActionFeedback.statusText)};`;
  if (model.serviceCollection == null) {
    return `${stateCall};${feedbackStatement}`;
  }
  if (model.createActionFeedback == null) {
    return `this.${model.serviceCollection.collectionPromiseMemberName} = ${stateCall};`;
  }
  return `this.${model.serviceCollection.collectionPromiseMemberName} = ${stateCall};
  await this.${model.serviceCollection.collectionPromiseMemberName};${feedbackStatement}`;
}

function routedCollectionDetailListTemplateFileArtifact(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): SourcePlanFileArtifact {
  return appBuilderHtmlTemplateFileArtifact(model.listRoute.templatePath, routedCollectionDetailListTemplateSource(model));
}

function routedCollectionDetailListTemplateSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): AppBuilderHtmlTemplateSource {
  if (model.serviceCollection != null) {
    return routedCollectionDetailServiceListTemplateSource(model, model.serviceCollection);
  }
  const frame = routedCollectionDetailListTemplateFrame(model);
  const createFormElement = frame.createFormElement == null
    ? []
    : [frame.createFormElement];
  const createFeedbackElement = frame.createFeedbackElement == null
    ? []
    : [frame.createFeedbackElement];
  return {
    text: `${authoredTemplateElementSourceText(authoredTemplateElementSource('section', [], null, [
    authoredTemplateElementSource('h2', [], authoredTemplateTextContentText(model.collectionTitle)),
    ...createFormElement,
    ...createFeedbackElement,
    authoredTemplateElementSource('p', [frame.emptyStateIfAttribute], `No ${authoredTemplateTextContentText(lowerFirst(model.collectionTitle))} yet.`),
    frame.collectionElement,
    frame.detailViewportElement,
  ]))}
`,
    fragments: frame.fragments,
  };
}

function routedCollectionDetailServiceListTemplateSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  serviceCollection: AppBuilderRoutedCollectionDetailServiceCollectionModel,
): AppBuilderHtmlTemplateSource {
  const frame = routedCollectionDetailListTemplateFrame(model, serviceCollection.fulfilledCollectionLocalName);
  const queryControls = routedCollectionDetailServiceQueryControlTemplateFrames(serviceCollection);
  const createFormElement = frame.createFormElement == null
    ? []
    : [frame.createFormElement];
  const createFeedbackElement = frame.createFeedbackElement == null
    ? []
    : [frame.createFeedbackElement];
  const promise = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.Promise, [
    [AppBuilderPartSlotKind.BindingExpression, serviceCollection.collectionPromiseMemberName],
  ]);
  const pending = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.PromisePending, []);
  const fulfilled = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.PromiseFulfilled, [
    [AppBuilderPartSlotKind.LocalName, serviceCollection.fulfilledCollectionLocalName],
  ]);
  const rejected = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.PromiseRejected, []);
  return {
    text: `${authoredTemplateElementSourceText(authoredTemplateElementSource('section', [], null, [
    authoredTemplateElementSource('h2', [], authoredTemplateTextContentText(model.collectionTitle)),
    ...queryControls.flatMap((queryControl) => queryControl.elements),
    ...createFormElement,
    ...createFeedbackElement,
    authoredTemplateElementSource('section', [promise.templateAttribute], null, [
      authoredTemplateElementSource('p', [pending.templateAttribute], `Loading ${authoredTemplateTextContentText(lowerFirst(model.collectionTitle))}...`),
      authoredTemplateElementSource('template', [fulfilled.templateAttribute], null, [
        authoredTemplateElementSource('p', [frame.emptyStateIfAttribute], `No ${authoredTemplateTextContentText(lowerFirst(model.collectionTitle))} yet.`),
        frame.collectionElement,
      ]),
      authoredTemplateElementSource('p', [rejected.templateAttribute], `Could not load ${authoredTemplateTextContentText(lowerFirst(model.collectionTitle))}.`),
    ]),
    frame.detailViewportElement,
  ]))}
`,
    fragments: [
      promise,
      pending,
      fulfilled,
      rejected,
      ...queryControls.flatMap((queryControl) => queryControl.fragments),
      ...frame.fragments,
    ],
  };
}

function routedCollectionDetailServiceQueryControlTemplateFrames(
  serviceCollection: AppBuilderRoutedCollectionDetailServiceCollectionModel,
): readonly {
  readonly elements: readonly AppBuilderTemplateElementSource[];
  readonly fragments: readonly AppBuilderPartSourceFragment[];
}[] {
  return serviceCollection.queryControls.map((queryControl) => {
    const control = appendAppBuilderTemplateElementAttributes(
      appBuilderControlElementFragment(AppBuilderControlId.TextInput, queryControl.stateMemberName),
      [{ rawName: 'id', rawValue: queryControl.fieldControlId }],
    );
    const label = appBuilderTemplateElementFragment(
      'label',
      [{ rawName: 'for', rawValue: queryControl.fieldControlId }],
      authoredTemplateTextContentText(queryControl.labelText),
    );
    const group = appBuilderTemplateElementFragment('div', [], null, [
      label.templateElement,
      control.templateElement,
    ]);
    const applyButton = appBuilderTemplateElementFragment(
      'button',
      [
        { rawName: 'type', rawValue: 'button' },
        { rawName: 'click.trigger', rawValue: `${queryControl.applyActionName}()` },
      ],
      authoredTemplateTextContentText(queryControl.applyButtonText),
    );
    const clearButton = appBuilderTemplateElementFragment(
      'button',
      [
        { rawName: 'type', rawValue: 'button' },
        { rawName: 'click.trigger', rawValue: `${queryControl.clearActionName}()` },
      ],
      authoredTemplateTextContentText(queryControl.clearButtonText),
    );
    const applyFeedback = routedCollectionDetailActionFeedbackElement(queryControl.applyActionFeedback ?? null);
    const clearFeedback = routedCollectionDetailActionFeedbackElement(queryControl.clearActionFeedback ?? null);
    return {
      elements: [
        group.templateElement,
        applyButton.templateElement,
        ...(applyFeedback == null ? [] : [applyFeedback.element]),
        clearButton.templateElement,
        ...(clearFeedback == null ? [] : [clearFeedback.element]),
      ],
      fragments: [
        control,
        label,
        group,
        applyButton,
        ...(applyFeedback?.fragments ?? []),
        clearButton,
        ...(clearFeedback?.fragments ?? []),
      ],
    };
  });
}

function routedCollectionDetailActionFeedbackElement(
  feedback: AppBuilderSourceLoweringActionFeedbackPayload | null,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} | null {
  if (feedback == null) {
    return null;
  }
  const conditional = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.Conditional, [
    [AppBuilderPartSlotKind.BindingExpression, feedback.statusMemberName],
  ]);
  const interpolation = appBuilderTextInterpolationFragment(feedback.statusMemberName);
  const status = actionFeedbackStatusFragment(appBuilderTemplateElementFragment(
    'p',
    [
      conditional.templateAttribute,
      { rawName: 'role', rawValue: 'status' },
      ...(feedback.statusId == null ? [] : [{ rawName: 'id', rawValue: feedback.statusId }]),
    ],
    interpolation.text,
  ));
  return {
    element: status.templateElement,
    fragments: [conditional, interpolation, status],
  };
}

function routedCollectionDetailListTemplateFrame(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  collectionExpression = `state.${model.collectionMemberName}`,
): AppBuilderRoutedCollectionDetailListTemplateFrame {
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  const emptyStateIf = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.Conditional, [
    [AppBuilderPartSlotKind.BindingExpression, `${collectionExpression}.length === 0`],
  ]);
  const collectionElse = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.ConditionalElse, []);
  const repeat = appBuilderRepeatAttributeFragment(itemName, collectionExpression);
  const detailViewport = appBuilderViewportElementFragment({ name: model.nestedViewportName });
  const createForm = routedCollectionDetailCreateFormTemplateFrame(model);
  const createFeedback = routedCollectionDetailCreateFeedbackTemplateFrame(model);
  if (model.tableColumns.length > 0) {
    const table = routedCollectionDetailTableElement(model, itemName, collectionElse.templateAttribute, repeat.templateAttribute);
    return {
      createFormElement: createForm?.element ?? null,
      createFeedbackElement: createFeedback?.element ?? null,
      emptyStateIfAttribute: emptyStateIf.templateAttribute,
      collectionElement: table.element,
      detailViewportElement: detailViewport.templateElement,
      fragments: [
        ...(createForm?.fragments ?? []),
        ...(createFeedback?.fragments ?? []),
        emptyStateIf,
        collectionElse,
        repeat,
        ...table.fragments,
        detailViewport,
      ],
    };
  }
  const detailLoad = appBuilderRouterLoadAttributeFragment(model.detailRouteId, {
    paramsExpression: `{ ${model.detailRouteParameterName}: ${itemName}.${model.identityMemberName} }`,
  });
  const title = appBuilderTextInterpolationFragment(`${itemName}.${model.titleField.memberName}`);
  const titleElement = appBuilderTemplateElementFragment('span', [], title.text);
  const relationshipLabelElements = routedCollectionDetailListRelationshipLabelElements(model, itemName);
  const detailLink = appBuilderTemplateElementFragment(
    'a',
    [detailLoad.templateAttribute],
    model.detailNavigationAction == null
      ? title.text
      : authoredTemplateTextContentText(model.detailNavigationAction.linkText),
  );
  const fragments: AppBuilderPartSourceFragment[] = [
    emptyStateIf,
    collectionElse,
    repeat,
    detailLoad,
    title,
    ...relationshipLabelElements.fragments,
    detailViewport,
  ];
  const listItemChildren: readonly AuthoredTemplateChildSource[] = model.detailNavigationAction == null
    ? [detailLink.templateElement, ...relationshipLabelElements.elements]
    : [
        titleElement.templateElement,
        ...relationshipLabelElements.elements,
        routeNavigationActionFragment(detailLink).templateElement,
      ];
  if (model.detailNavigationAction == null) {
    fragments.push(detailLink);
  } else {
    fragments.push(titleElement, routeNavigationActionFragment(detailLink));
  }
  return {
    createFormElement: createForm?.element ?? null,
    createFeedbackElement: createFeedback?.element ?? null,
    emptyStateIfAttribute: emptyStateIf.templateAttribute,
    collectionElement: authoredTemplateElementSource('ul', [collectionElse.templateAttribute], null, [
      authoredTemplateElementSource('li', [
        repeat.templateAttribute,
      ], null, [
        ...listItemChildren,
      ]),
    ]),
    detailViewportElement: detailViewport.templateElement,
    fragments: [
      ...(createForm?.fragments ?? []),
      ...(createFeedback?.fragments ?? []),
      ...fragments,
    ],
  };
}

function routedCollectionDetailCreateFormTemplateFrame(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} | null {
  if (model.createForm == null) {
    return null;
  }
  const fragments: AppBuilderPartSourceFragment[] = [];
  const fieldGroups = model.createForm.fields.map((fieldModel) => {
    const fieldGroup = routedCollectionDetailCreateFormFieldGroup(fieldModel);
    fragments.push(...fieldGroup.fragments);
    return fieldGroup.element;
  });
  const submitButton = appBuilderTemplateElementFragment(
    'button',
    [{ rawName: 'type', rawValue: 'submit' }],
    authoredTemplateTextContentText(model.createForm.submitButtonText),
  );
  const form = appBuilderTemplateElementFragment('form', [
    { rawName: 'submit.trigger', rawValue: `${model.createForm.actionName}()` },
  ], null, [
    ...fieldGroups,
    submitButton.templateElement,
  ]);
  return {
    element: form.templateElement,
    fragments: [...fragments, submitButton, form],
  };
}

function routedCollectionDetailCreateFeedbackTemplateFrame(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} | null {
  const feedback = model.createActionFeedback;
  if (feedback == null) {
    return null;
  }
  const conditional = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.Conditional, [
    [AppBuilderPartSlotKind.BindingExpression, feedback.statusMemberName],
  ]);
  const interpolation = appBuilderTextInterpolationFragment(feedback.statusMemberName);
  const status = actionFeedbackStatusFragment(appBuilderTemplateElementFragment(
    'p',
    [
      conditional.templateAttribute,
      { rawName: 'role', rawValue: 'status' },
      ...(feedback.statusId == null ? [] : [{ rawName: 'id', rawValue: feedback.statusId }]),
    ],
    interpolation.text,
  ));
  return {
    element: status.templateElement,
    fragments: [conditional, interpolation, status],
  };
}

function routedCollectionDetailCreateFormFieldGroup(
  fieldModel: AppBuilderRoutedCollectionDetailCreateFormFieldModel,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const fieldControlId = `${appBuilderKebabCase(fieldModel.memberName)}-field`;
  const control = appendAppBuilderTemplateElementAttributes(
    routedCollectionDetailCreateFormControlFragment(fieldModel),
    [{ rawName: 'id', rawValue: fieldControlId }],
  );
  const label = appBuilderTemplateElementFragment(
    'label',
    [{ rawName: 'for', rawValue: fieldControlId }],
    authoredTemplateTextContentText(fieldModel.title),
  );
  const group = appBuilderTemplateElementFragment('div', [], null, [
    label.templateElement,
    control.templateElement,
  ]);
  return {
    element: group.templateElement,
    fragments: [control, label, group],
  };
}

function routedCollectionDetailCreateFormControlFragment(
  fieldModel: AppBuilderRoutedCollectionDetailCreateFormFieldModel,
): AppBuilderTemplateElementPartSourceFragment {
  const field = fieldModel.field;
  if (fieldModel.referenceRelationship != null) {
    const relationship = fieldModel.referenceRelationship;
    if (relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object) {
      return appBuilderChoiceControlElementFragment(
        routedCollectionDetailCreateFormRelationshipControlId(relationship),
        fieldModel.memberName,
        {
          optionDomainExpression: `state.${relationship.relatedCollectionMemberName}`,
          optionLocalName: relationship.relatedItemName,
          optionBindingKind: AppBuilderChoiceOptionBindingKind.Model,
          optionValueExpression: relationship.relatedItemName,
          optionLabelExpression: appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName),
          matcherExpression: `state.match${relationship.relatedDomain.entityTypeName}`,
        },
      );
    }
    if (field == null) {
      throw new Error(`Relationship '${relationship.relationship.name}' cannot lower an identity-valued form control without a scalar field.`);
    }
    return appBuilderChoiceControlElementFragment(
      routedCollectionDetailCreateFormRelationshipControlId(relationship),
      fieldModel.memberName,
      {
        optionDomainExpression: `state.${relationship.relatedCollectionMemberName}`,
        optionLocalName: relationship.relatedItemName,
        optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
        optionValueExpression: `${relationship.relatedItemName}.${relationship.foreignFieldName}`,
        optionLabelExpression: appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName),
      },
    );
  }
  if (field == null) {
    throw new Error(`Create form field '${fieldModel.memberName}' is not a scalar field and has no reference relationship.`);
  }
  if (field.optionMemberName != null) {
    return appBuilderChoiceControlElementFragment(field.controlId, fieldModel.memberName, {
      optionDomainExpression: `state.${field.optionMemberName}`,
      optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
      optionValueExpression: 'option.value',
      optionLabelExpression: 'option.title',
    });
  }
  return appBuilderControlElementFragment(field.controlId, fieldModel.memberName);
}

function routedCollectionDetailCreateFormRelationshipControlId(
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipModel,
): AppBuilderControlId {
  return relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany
    ? AppBuilderControlId.MultiSelect
    : AppBuilderControlId.SingleSelect;
}

function routedCollectionDetailTableElement(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  itemName: string,
  collectionElseAttribute: AppBuilderTemplateAttributeSource,
  repeatAttribute: AppBuilderTemplateAttributeSource,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const fragments: AppBuilderPartSourceFragment[] = [];
  const headerCells = model.tableColumns.map((column) =>
    authoredTemplateElementSource('th', [], authoredTemplateTextContentText(column.header))
  );
  const bodyCells = model.tableColumns.map((column) => {
    const cell = routedCollectionDetailTableCell(model, itemName, column);
    fragments.push(...cell.fragments);
    return cell.element;
  });
  return {
    element: authoredTemplateElementSource('table', [collectionElseAttribute], null, [
      authoredTemplateElementSource('thead', [], null, [
        authoredTemplateElementSource('tr', [], null, headerCells),
      ]),
      authoredTemplateElementSource('tbody', [], null, [
        authoredTemplateElementSource('tr', [repeatAttribute], null, bodyCells),
      ]),
    ]),
    fragments,
  };
}

function routedCollectionDetailTableCell(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  itemName: string,
  column: AppBuilderRoutedCollectionDetailTableColumnModel,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  switch (column.kind) {
    case AppBuilderRoutedCollectionDetailTableColumnKind.Field:
      return routedCollectionDetailFieldTableCell(itemName, column);
    case AppBuilderRoutedCollectionDetailTableColumnKind.Relationship:
      return routedCollectionDetailRelationshipTableCell(itemName, column);
    case AppBuilderRoutedCollectionDetailTableColumnKind.NavigationAction:
      return routedCollectionDetailNavigationActionTableCell(model, itemName, column);
    case AppBuilderRoutedCollectionDetailTableColumnKind.RowCommandAction:
      return routedCollectionDetailRowCommandActionTableCell(itemName, column);
  }
}

function routedCollectionDetailFieldTableCell(
  itemName: string,
  column: AppBuilderRoutedCollectionDetailTableColumnModel,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const field = column.field;
  if (field == null) {
    throw new Error('Internal app-builder invariant failed: field table columns require a field source model.');
  }
  if (field.valueKind === AppBuilderDomainFieldValueKind.Boolean) {
    const checkedAttribute = appBuilderAttributeToViewBindingAttributeFragment('checked', `${itemName}.${field.memberName}`);
    const checkboxFragment = appBuilderTemplateElementFragment('input', [
      { rawName: 'type', rawValue: 'checkbox' },
      checkedAttribute.templateAttribute,
      { rawName: 'disabled' },
      { rawName: 'aria-label', rawValue: column.header },
    ]);
    const cellFragment = appBuilderTemplateElementFragment('td', [], null, [
      checkboxFragment.templateElement,
    ]);
    return {
      element: cellFragment.templateElement,
      fragments: [checkedAttribute, checkboxFragment, cellFragment],
    };
  }
  const interpolation = appBuilderTextInterpolationFragment(`${itemName}.${field.memberName}`);
  const cellFragment = appBuilderTemplateElementFragment('td', [], interpolation.text);
  return {
    element: cellFragment.templateElement,
    fragments: [interpolation, cellFragment],
  };
}

function routedCollectionDetailRelationshipTableCell(
  itemName: string,
  column: AppBuilderRoutedCollectionDetailTableColumnModel,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const relationship = column.relationship;
  if (relationship == null) {
    throw new Error('Internal app-builder invariant failed: relationship table columns require a relationship source model.');
  }
  const interpolation = appBuilderTextInterpolationFragment(`state.${relationship.labelMethodName}(${itemName})`);
  const routeBindingExpression = normalizedSourceInputText(column.column.routeBindingExpression);
  if (routeBindingExpression != null) {
    const loadAttribute = appBuilderAttributeBindingAttributeFragment('load', routeBindingExpression);
    const linkFragment = routeNavigationActionFragment(appBuilderTemplateElementFragment(
      'a',
      [loadAttribute.templateAttribute],
      interpolation.text,
    ));
    const cellFragment = appBuilderTemplateElementFragment('td', [], null, [linkFragment.templateElement]);
    return {
      element: cellFragment.templateElement,
      fragments: [interpolation, loadAttribute, linkFragment, cellFragment],
    };
  }
  const routeInstruction = normalizedSourceInputText(column.column.routeInstruction);
  if (routeInstruction != null) {
    const loadAttribute = appBuilderRouterLoadAttributeFragment(routeInstruction, {
      paramsExpression: normalizedSourceInputText(column.column.routeParamsExpression) ?? undefined,
      contextExpression: normalizedSourceInputText(column.column.routeContextExpression) ?? undefined,
      activeExpression: normalizedSourceInputText(column.column.routeActiveExpression) ?? undefined,
      targetAttributeName: normalizedSourceInputText(column.column.routeTargetAttributeName) ?? undefined,
    });
    const linkFragment = routeNavigationActionFragment(appBuilderTemplateElementFragment(
      'a',
      [loadAttribute.templateAttribute],
      interpolation.text,
    ));
    const cellFragment = appBuilderTemplateElementFragment('td', [], null, [
      linkFragment.templateElement,
    ]);
    return {
      element: cellFragment.templateElement,
      fragments: [interpolation, loadAttribute, linkFragment, cellFragment],
    };
  }
  const cellFragment = appBuilderTemplateElementFragment('td', [], interpolation.text);
  return {
    element: cellFragment.templateElement,
    fragments: [interpolation, cellFragment],
  };
}

function routedCollectionDetailNavigationActionTableCell(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  itemName: string,
  column: AppBuilderRoutedCollectionDetailTableColumnModel,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const navigationAction = column.navigationAction;
  if (navigationAction == null) {
    throw new Error('Internal app-builder invariant failed: navigation action table columns require a navigation action source.');
  }
  const detailLoad = appBuilderRouterLoadAttributeFragment(model.detailRouteId, {
    paramsExpression: `{ ${model.detailRouteParameterName}: ${itemName}.${model.identityMemberName} }`,
  });
  const detailLink = routeNavigationActionFragment(appBuilderTemplateElementFragment(
    'a',
    [detailLoad.templateAttribute],
    authoredTemplateTextContentText(navigationAction.linkText),
  ));
  const cellFragment = appBuilderTemplateElementFragment('td', [], null, [
    detailLink.templateElement,
  ]);
  return {
    element: cellFragment.templateElement,
    fragments: [detailLoad, detailLink, cellFragment],
  };
}

function routedCollectionDetailRowCommandActionTableCell(
  itemName: string,
  column: AppBuilderRoutedCollectionDetailTableColumnModel,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const rowCommandAction = column.rowCommandAction;
  if (rowCommandAction == null) {
    throw new Error('Internal app-builder invariant failed: row command table columns require a selected action descriptor.');
  }
  const event = lowerAppBuilderEventAttribute('click', `${rowCommandAction.name}(${itemName})`);
  const button = rowCommandActionFragment(appBuilderTemplateElementFragment(
    'button',
    [
      { rawName: 'type', rawValue: 'button' },
      ...(event.attributeFragment == null ? [] : [event.attributeFragment.templateAttribute]),
    ],
    authoredTemplateTextContentText(column.header),
  ));
  const cellFragment = appBuilderTemplateElementFragment('td', [], null, [
    button.templateElement,
  ]);
  return {
    element: cellFragment.templateElement,
    fragments: [
      ...(event.attributeFragment == null ? [] : [event.attributeFragment]),
      button,
      cellFragment,
    ],
  };
}

function routedCollectionDetailListRelationshipLabelElements(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  itemName: string,
): {
  readonly elements: readonly AppBuilderTemplateElementSource[];
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const fragments: AppBuilderPartSourceFragment[] = [];
  const elements = routedCollectionDetailDisplayRelationships(model).map((relationship) => {
    const interpolation = appBuilderTextInterpolationFragment(`state.${relationship.labelMethodName}(${itemName})`);
    const element = appBuilderTemplateElementFragment(
      'span',
      [],
      `${authoredTemplateTextContentText(relationship.title)}: ${interpolation.text}`,
    );
    fragments.push(interpolation, element);
    return element.templateElement;
  });
  return { elements, fragments };
}

function routeNavigationActionFragment<T extends AppBuilderPartSourceFragment>(
  fragment: T,
): T {
  return {
    ...fragment,
    origin: {
      kind: AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation,
      targetKind: AppBuilderOntologyRowKind.ApplicationPattern,
      targetId: AppBuilderApplicationPatternId.RouteNavigationAction,
      controlPatternId: null,
      controlId: null,
      innerControlPatternId: null,
    },
  } as T;
}

function rowCommandActionFragment<T extends AppBuilderPartSourceFragment>(
  fragment: T,
): T {
  return {
    ...fragment,
    origin: {
      kind: AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation,
      targetKind: AppBuilderOntologyRowKind.ApplicationPattern,
      targetId: AppBuilderApplicationPatternId.DomainCommandAction,
      controlPatternId: null,
      controlId: null,
      innerControlPatternId: null,
    },
  } as T;
}

function actionFeedbackStatusFragment<T extends AppBuilderPartSourceFragment>(
  fragment: T,
): T {
  return {
    ...fragment,
    origin: {
      kind: AppBuilderSourceFragmentOriginKind.SourceLoweringComposition,
      targetKind: AppBuilderOntologyRowKind.ApplicationPattern,
      targetId: AppBuilderApplicationPatternId.ActionFeedbackStatus,
      controlPatternId: null,
      controlId: null,
      innerControlPatternId: null,
    },
  } as T;
}

function routedCollectionDetailRouteFileArtifact(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): SourcePlanFileArtifact {
  const routeParamsExpression = appBuilderRouteContextParameterReadExpressionFragmentForMembers([
    { name: model.detailRouteParameterName },
  ]);
  const routeParamsExpressionContributions = appBuilderPartSourceFragmentContributions(routeParamsExpression, SourcePlanLanguage.TypeScript);
  const prelude = appBuilderCustomElementTypeScriptPreludeSource(model.detailRoute, [
    { moduleSpecifier: 'aurelia', namedImports: ['resolve'] },
    {
      moduleSpecifier: moduleSpecifier(model.detailRoute.componentPath, model.stateModelPath, false),
      namedImports: [model.stateClassName],
    },
    ...(model.serviceCollection == null ? [{
      moduleSpecifier: moduleSpecifier(model.detailRoute.componentPath, model.domainModelPath, false),
      namedImports: [model.entityTypeName],
    }] : []),
  ], routeParamsExpressionContributions);
  return {
    path: model.detailRoute.componentPath,
    role: SourcePlanFileRole.Component,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateComponentViewModel,
    text: routedCollectionDetailRouteSource(model, prelude, routeParamsExpression.text),
    contributions: prelude.contributions,
  };
}

function routedCollectionDetailRouteSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  prelude: AppBuilderCustomElementTypeScriptPreludeSource,
  routeParamsExpressionText: string,
): string {
  if (model.serviceCollection != null) {
    return appBuilderCustomElementClassSource(
      model.detailRoute,
      prelude,
      `  readonly state = resolve(${model.stateClassName});
  readonly routeParams = ${routeParamsExpressionText};
  readonly ${model.serviceCollection.detailPromiseMemberName}: ReturnType<${model.stateClassName}['${model.serviceCollection.findMethodName}']> = this.state.${model.serviceCollection.findMethodName}(this.routeParams.${model.detailRouteParameterName});
`,
    );
  }
  return appBuilderCustomElementClassSource(
    model.detailRoute,
    prelude,
    `  readonly state = resolve(${model.stateClassName});
  readonly routeParams = ${routeParamsExpressionText};

  get ${appBuilderLowerCamelCase(model.entityTypeName)}(): ${model.entityTypeName} | null {
    return this.state.find${model.entityTypeName}(this.routeParams.${model.detailRouteParameterName});
  }
`,
  );
}

function routedCollectionDetailTemplateFileArtifact(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): SourcePlanFileArtifact {
  return appBuilderHtmlTemplateFileArtifact(model.detailRoute.templatePath, routedCollectionDetailTemplateSource(model));
}

function routedCollectionDetailTemplateSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): AppBuilderHtmlTemplateSource {
  if (model.serviceCollection != null) {
    return routedCollectionDetailServiceTemplateSource(model, model.serviceCollection);
  }
  const frame = routedCollectionDetailTemplateFrame(model);
  return {
    text: `${authoredTemplateElementSourceText(authoredTemplateElementSource('section', [], null, [
    authoredTemplateElementSource('a', [frame.backLoadAttribute], 'Back'),
    authoredTemplateElementSource('article', [frame.itemIfAttribute], null, [
        authoredTemplateElementSource('section', [], null, [
          authoredTemplateElementSource('h2', [], frame.titleText),
          ...frame.fieldDisplayElements,
          ...frame.relatedCollectionElements,
        ]),
    ]),
    authoredTemplateElementSource('p', [frame.itemElseAttribute], frame.missingItemText),
  ]))}
`,
    fragments: frame.fragments,
  };
}

function routedCollectionDetailServiceTemplateSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  serviceCollection: AppBuilderRoutedCollectionDetailServiceCollectionModel,
): AppBuilderHtmlTemplateSource {
  const frame = routedCollectionDetailTemplateFrame(model);
  const promise = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.Promise, [
    [AppBuilderPartSlotKind.BindingExpression, serviceCollection.detailPromiseMemberName],
  ]);
  const pending = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.PromisePending, []);
  const fulfilled = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.PromiseFulfilled, [
    [AppBuilderPartSlotKind.LocalName, appBuilderLowerCamelCase(model.entityTypeName)],
  ]);
  const rejected = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.PromiseRejected, []);
  return {
    text: `${authoredTemplateElementSourceText(authoredTemplateElementSource('section', [], null, [
    authoredTemplateElementSource('a', [frame.backLoadAttribute], 'Back'),
    authoredTemplateElementSource('section', [promise.templateAttribute], null, [
      authoredTemplateElementSource('p', [pending.templateAttribute], `Loading ${authoredTemplateTextContentText(lowerFirst(model.entityTitle))}...`),
      authoredTemplateElementSource('template', [fulfilled.templateAttribute], null, [
        authoredTemplateElementSource('article', [frame.itemIfAttribute], null, [
          authoredTemplateElementSource('section', [], null, [
            authoredTemplateElementSource('h2', [], frame.titleText),
            ...frame.fieldDisplayElements,
            ...frame.relatedCollectionElements,
          ]),
        ]),
        authoredTemplateElementSource('p', [frame.itemElseAttribute], frame.missingItemText),
      ]),
      authoredTemplateElementSource('p', [rejected.templateAttribute], `Could not load ${authoredTemplateTextContentText(lowerFirst(model.entityTitle))}.`),
    ]),
  ]))}
`,
    fragments: [
      promise,
      pending,
      fulfilled,
      rejected,
      ...frame.fragments,
    ],
  };
}

function routedCollectionDetailTemplateFrame(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): AppBuilderRoutedCollectionDetailTemplateFrame {
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  const itemIf = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.Conditional, [
    [AppBuilderPartSlotKind.BindingExpression, itemName],
  ]);
  const itemElse = appBuilderTemplateControllerAttributeFragment(AppBuilderStructuralPartId.ConditionalElse, []);
  const backLoad = appBuilderRouterLoadAttributeFragment('../');
  const title = appBuilderTextInterpolationFragment(appBuilderDomainFieldDisplayExpression(model.titleField, itemName));
  const fieldDisplays = routedCollectionDetailFieldDisplays(model);
  const relatedCollections = routedCollectionDetailRelatedCollectionElements(model);
  const fragments: readonly AppBuilderPartSourceFragment[] = [
    itemIf,
    itemElse,
    backLoad,
    title,
    ...fieldDisplays.fragments,
    ...relatedCollections.fragments,
  ];
  return {
    itemIfAttribute: itemIf.templateAttribute,
    itemElseAttribute: itemElse.templateAttribute,
    backLoadAttribute: backLoad.templateAttribute,
    titleText: title.text,
    fieldDisplayElements: fieldDisplays.elements,
    relatedCollectionElements: relatedCollections.elements,
    missingItemText: `No ${authoredTemplateTextContentText(lowerFirst(model.entityTitle))} found for this route.`,
    fragments,
  };
}

function routedCollectionDetailRelatedCollectionElements(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): {
  readonly elements: readonly AppBuilderTemplateElementSource[];
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const detailItemName = appBuilderLowerCamelCase(model.entityTypeName);
  const fragments: AppBuilderPartSourceFragment[] = [];
  const elements = model.detailRelatedCollections.map((collection) => {
    const repeat = appBuilderRepeatAttributeFragment(
      collection.itemLocalName,
      `state.${collection.filterMethodName}(${detailItemName})`,
    );
    const headerRow = appBuilderTemplateElementFragment('tr', [], null, collection.tableColumns.map((column) =>
      authoredTemplateElementSource('th', [], authoredTemplateTextContentText(column.header))));
    const rowCells = collection.tableColumns.map((column) =>
      routedCollectionDetailRelatedCollectionTableCellElement(collection, column));
    const row = appBuilderTemplateElementFragment('tr', [repeat.templateAttribute], null, rowCells.flatMap((cell) => {
      fragments.push(...cell.fragments);
      return [cell.element];
    }));
    const table = appBuilderTemplateElementFragment('table', [], null, [
      appBuilderTemplateElementFragment('thead', [], null, [headerRow.templateElement]).templateElement,
      appBuilderTemplateElementFragment('tbody', [], null, [row.templateElement]).templateElement,
    ]);
    const section = appBuilderTemplateElementFragment('section', [], null, [
      authoredTemplateElementSource('h3', [], authoredTemplateTextContentText(collection.title)),
      table.templateElement,
    ]);
    fragments.push(repeat, headerRow, row, table, section);
    return section.templateElement;
  });
  return { elements, fragments };
}

function routedCollectionDetailRelatedCollectionTableCellElement(
  collection: AppBuilderRoutedCollectionDetailRelatedCollectionModel,
  column: AppBuilderCollectionTableColumnPayload,
): {
  readonly element: AppBuilderTemplateElementSource;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const fieldName = normalizedSourceInputText(column.fieldName);
  if (fieldName != null) {
    const field = collection.fields.find((candidate) => candidate.memberName === fieldName);
    if (field == null) {
      throw new Error(`Detail related collection '${collection.relationship.name}' table column '${column.header}' references unknown field '${fieldName}'.`);
    }
    if (field.valueKind === AppBuilderDomainFieldValueKind.Boolean) {
      const checkedAttribute = appBuilderAttributeToViewBindingAttributeFragment('checked', `${collection.itemLocalName}.${field.memberName}`);
      const checkboxFragment = appBuilderTemplateElementFragment('input', [
        { rawName: 'type', rawValue: 'checkbox' },
        checkedAttribute.templateAttribute,
        { rawName: 'disabled' },
        { rawName: 'aria-label', rawValue: column.header },
      ]);
      const cellFragment = appBuilderTemplateElementFragment('td', [], null, [checkboxFragment.templateElement]);
      return { element: cellFragment.templateElement, fragments: [checkedAttribute, checkboxFragment, cellFragment] };
    }
    const interpolation = appBuilderTextInterpolationFragment(appBuilderDomainFieldDisplayExpression(field, collection.itemLocalName));
    const cellFragment = appBuilderTemplateElementFragment('td', [], interpolation.text);
    return { element: cellFragment.templateElement, fragments: [interpolation, cellFragment] };
  }
  const routeBindingExpression = normalizedSourceInputText(column.routeBindingExpression);
  if (routeBindingExpression != null) {
    const loadAttribute = appBuilderAttributeBindingAttributeFragment('load', routeBindingExpression);
    const linkFragment = routeNavigationActionFragment(appBuilderTemplateElementFragment(
      'a',
      [loadAttribute.templateAttribute],
      authoredTemplateTextContentText(column.linkText ?? column.header),
    ));
    const cellFragment = appBuilderTemplateElementFragment('td', [], null, [linkFragment.templateElement]);
    return { element: cellFragment.templateElement, fragments: [loadAttribute, linkFragment, cellFragment] };
  }
  throw new Error(`Detail related collection '${collection.relationship.name}' table column '${column.header}' needs fieldName or routeBindingExpression.`);
}

function pluralDisplayTitle(
  entityTitle: string,
): string {
  return titleSourceName(pluralizeLastSourceNameWord(sourceNameWords(entityTitle)));
}

function lowerFirst(
  value: string,
): string {
  return value.length === 0 ? value : `${value[0]!.toLowerCase()}${value.slice(1)}`;
}

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function routedCollectionDetailStateModelSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): TypeScriptSourceText {
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  const collectionInitializer = appBuilderDomainCollectionInitializerSource({
    entityTypeName: model.entityTypeName,
    identityMemberName: model.identityMemberName,
  }, model.fields, model.records, {
    extraProperties: routedCollectionDetailRelationshipInitializerProperties(model),
  });
  const relatedCollectionSources = uniqueByKey(
    model.referenceRelationships,
    (relationship) => relationship.relatedCollectionMemberName,
  ).map((relationship) => {
    const initializer = appBuilderDomainCollectionInitializerSource({
      entityTypeName: relationship.relatedDomain.entityTypeName,
      identityMemberName: relationship.relatedDomain.identityMemberName,
    }, relationship.relatedFields, relationship.relatedRecords);
    return `  readonly ${relationship.relatedCollectionMemberName}: ${relationship.relatedDomain.entityTypeName}[] = ${initializer};`;
  });
  const detailRelatedCollectionSources = uniqueByKey(
    model.detailRelatedCollections,
    (collection) => collection.collectionMemberName,
  ).map((collection) => {
    const initializer = appBuilderDomainCollectionInitializerSource({
      entityTypeName: collection.domain.entityTypeName,
      identityMemberName: collection.domain.identityMemberName,
    }, collection.fields, collection.records);
    return `  readonly ${collection.collectionMemberName}: ${collection.domain.entityTypeName}[] = ${initializer};`;
  });
  const relationshipMethodSources = [
    ...model.referenceRelationships.map((relationship) =>
      routedCollectionDetailRelationshipMethodSource(model, relationship)),
    ...model.ownedRelationships.map((relationship) =>
      routedCollectionDetailOwnedRelationshipMethodSource(model, relationship)),
    ...model.nestedValueObjectRelationships.map((relationship) =>
      routedCollectionDetailNestedValueObjectRelationshipMethodSource(model, relationship)),
    ...model.detailRelatedCollections.map((collection) =>
      routedCollectionDetailRelatedCollectionMethodSource(model, collection)),
  ];
  const finiteOptionProperties = appBuilderDomainFiniteOptionFields(model.fields)
    .map(appBuilderDomainFieldOptionPropertySource);
  const createMethodSource = routedCollectionDetailCreateMethodSource(model);
  const primaryCollectionMemberSource = model.serviceCollection == null
    ? `  readonly ${model.collectionMemberName}: ${model.entityTypeName}[] = ${collectionInitializer};`
    : `  private readonly ${model.serviceCollection.serviceMemberName} = resolve(${model.serviceCollection.serviceClassName});`;
  const stateMemberSources = [
    ...(model.serviceCollection == null ? relatedCollectionSources : []),
    ...detailRelatedCollectionSources,
    primaryCollectionMemberSource,
    ...finiteOptionProperties,
    ...(model.serviceCollection == null ? [] : relatedCollectionSources),
  ];
  const methodSources = [
    ...(model.serviceCollection == null
      ? [`  find${model.entityTypeName}(${model.identityMemberName}: string): ${model.entityTypeName} | null {
    return this.${model.collectionMemberName}.find((${itemName}) => ${routedCollectionDetailIdentityComparisonExpression(model, itemName)}) ?? null;
  }`]
      : [
          `  ${model.serviceCollection.loadMethodName}(): Promise<readonly ${model.entityTypeName}[]> {
    return this.${model.serviceCollection.serviceMemberName}.${model.serviceCollection.loadMethodName}();
  }`,
          `  ${model.serviceCollection.findMethodName}(${model.identityMemberName}: string): Promise<${model.entityTypeName} | null> {
    return this.${model.serviceCollection.serviceMemberName}.${model.serviceCollection.findMethodName}(${model.identityMemberName});
  }`,
          ...model.serviceCollection.filterMethods.map((filterMethod) =>
            routedCollectionDetailServiceFilterMethodSource(model, filterMethod)
          ),
          ...model.serviceCollection.updateMethods.map((updateMethod) =>
            routedCollectionDetailServiceUpdateMethodSource(model, updateMethod)
          ),
        ]),
    ...(createMethodSource.length === 0 ? [] : [createMethodSource]),
    ...relationshipMethodSources,
  ];
  return typeScriptSourceText(`export class ${model.stateClassName} {
${stateMemberSources.join('\n')}

${methodSources.join('\n\n')}
}
`, [{
    moduleSpecifier: moduleSpecifier(model.stateModelPath, model.domainModelPath, false),
    namedImports: routedCollectionDetailStateDomainModelValueImports(model),
    namedTypeImports: routedCollectionDetailFiniteOptionTypeImports(model.fields),
  }, ...(model.serviceCollection == null ? [] : [{
    moduleSpecifier: 'aurelia',
    namedImports: ['resolve'],
  }, {
    moduleSpecifier: moduleSpecifier(model.stateModelPath, model.serviceCollection.sourceTargetPath, false),
    namedImports: [model.serviceCollection.serviceClassName],
  }]), ...uniqueByKey(
    model.referenceRelationships,
    (relationship) => relationship.relatedDomain.entityTypeName,
  ).map((relationship) => ({
    moduleSpecifier: moduleSpecifier(model.stateModelPath, relationship.relatedDomainModelPath, false),
    namedImports: [relationship.relatedDomain.entityTypeName],
  })), ...uniqueByKey(
    model.detailRelatedCollections,
    (collection) => collection.domain.entityTypeName,
  ).map((collection) => ({
    moduleSpecifier: moduleSpecifier(model.stateModelPath, collection.domainModelPath, false),
    namedImports: [collection.domain.entityTypeName],
  }))]);
}

function routedCollectionDetailServiceFilterMethodSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  filterMethod: AppBuilderServiceCollectionFilterMethodSourceModel,
): string {
  const field = model.fields.find((candidate) => candidate.memberName === filterMethod.fieldName);
  const parameterType = field?.typeScriptType ?? 'unknown';
  if (model.serviceCollection == null) {
    throw new Error('Internal app-builder invariant failed: service filter methods require a service collection.');
  }
  return `  ${filterMethod.methodName}(${filterMethod.parameterName}: ${parameterType}): Promise<readonly ${model.entityTypeName}[]> {
    return this.${model.serviceCollection.serviceMemberName}.${filterMethod.methodName}(${filterMethod.parameterName});
  }`;
}

function routedCollectionDetailServiceUpdateMethodSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  updateMethod: AppBuilderServiceCollectionUpdateMethodSourceModel,
): string {
  if (model.serviceCollection == null) {
    throw new Error('Internal app-builder invariant failed: service update methods require a service collection.');
  }
  const identityType = appBuilderDomainIdentityTypeScriptType(model.identityValueKind);
  const parameters = [
    `${model.identityMemberName}: ${identityType}`,
    ...updateMethod.inputFieldNames.map((fieldName) => {
      const field = model.fields.find((candidate) => candidate.memberName === fieldName);
      if (field == null) {
        throw new Error(`Service update method '${updateMethod.methodName}' references unknown field '${fieldName}'.`);
      }
      return `${field.memberName}: ${field.typeScriptType}`;
    }),
  ].join(', ');
  const argumentsSource = [
    model.identityMemberName,
    ...updateMethod.inputFieldNames,
  ].join(', ');
  return `  ${updateMethod.methodName}(${parameters}): Promise<readonly ${model.entityTypeName}[]> {
    return this.${model.serviceCollection.serviceMemberName}.${updateMethod.methodName}(${argumentsSource});
  }`;
}

function routedCollectionDetailCreateFormChoiceTypeImports(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly string[] {
  return model.createForm == null
    ? []
    : routedCollectionDetailFiniteOptionTypeImports(model.createForm.fields
      .map((fieldModel) => fieldModel.field)
      .filter((field): field is AppBuilderDomainFieldSourceModel => field != null));
}

function routedCollectionDetailCreateFormObjectTypeImports(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly { readonly moduleSpecifier: string; readonly namedTypeImports: readonly string[] }[] {
  if (model.createForm == null) {
    return [];
  }
  return uniqueByKey(
    model.createForm.fields
      .map((fieldModel) => fieldModel.referenceRelationship)
      .filter((relationship): relationship is AppBuilderRoutedCollectionDetailReferenceRelationshipModel =>
        relationship != null
        && relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object
      )
      .map((relationship) => ({
        moduleSpecifier: moduleSpecifier(model.listRoute.componentPath, relationship.relatedDomainModelPath, false),
        namedTypeImports: [relationship.relatedDomain.entityTypeName],
      })),
    (requirement) => requirement.moduleSpecifier,
  );
}

function routedCollectionDetailFiniteOptionTypeImports(
  fields: readonly AppBuilderDomainFieldSourceModel[],
): readonly string[] {
  return uniqueByKey(
    fields
      .map((field) => field.optionTypeName)
      .filter((typeName): typeName is string => typeName != null),
    (typeName) => typeName,
  );
}

function routedCollectionDetailCreateMethodSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): string {
  if (model.createForm == null) {
    return '';
  }
  if (model.serviceCollection != null) {
    if (model.serviceCollection.createMethodName == null) {
      return '';
    }
    const parameters = model.createForm.fields
      .map((fieldModel) => `${fieldModel.memberName}: ${fieldModel.typeScriptType}`)
      .join(', ');
    return `  create${model.entityTypeName}(${parameters}): Promise<readonly ${model.entityTypeName}[]> {
    return this.${model.serviceCollection.serviceMemberName}.${model.serviceCollection.createMethodName}(${model.createForm.fields.map((fieldModel) => fieldModel.memberName).join(', ')});
  }`;
  }
  const selectedFieldNames = new Set(model.createForm.fields.map((fieldModel) => fieldModel.memberName));
  const parameters = model.createForm.fields
    .map((fieldModel) => `${fieldModel.memberName}: ${fieldModel.typeScriptType}`)
    .join(', ');
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  const nextIdSource = `const next${model.identityMemberName[0]!.toUpperCase()}${model.identityMemberName.slice(1)} = this.${model.collectionMemberName}.length === 0
      ? 1
      : Math.max(...this.${model.collectionMemberName}.map((${itemName}) => ${itemName}.${model.identityMemberName})) + 1;`;
  const identityExpression = `next${model.identityMemberName[0]!.toUpperCase()}${model.identityMemberName.slice(1)}`;
  const entityExpression = appBuilderDomainEntityConstructionExpressionSource({
    entityTypeName: model.entityTypeName,
    fields: model.fields,
  }, [
    { memberName: model.identityMemberName, expression: identityExpression },
    ...model.fields.map((field) => ({
      memberName: field.memberName,
      expression: selectedFieldNames.has(field.memberName)
        ? field.memberName
        : appBuilderDomainFieldSeedLiteral(undefined, field),
    })),
    ...routedCollectionDetailRelationshipConstructionProperties(model, selectedFieldNames),
  ], {
    baseIndent: '      ',
  });
  return `  create${model.entityTypeName}(${parameters}): void {
    ${nextIdSource}
    this.${model.collectionMemberName}.push(${entityExpression});
  }`;
}

function routedCollectionDetailObjectReferenceRelationships(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly AppBuilderRoutedCollectionDetailReferenceRelationshipModel[] {
  return model.referenceRelationships.filter((relationship) =>
    relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object);
}

function routedCollectionDetailDisplayRelationships(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly AppBuilderRoutedCollectionDetailDisplayRelationshipModel[] {
  return [
    ...model.referenceRelationships,
    ...model.ownedRelationships,
    ...model.nestedValueObjectRelationships,
  ];
}

function routedCollectionDetailDomainModelValueImports(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly string[] {
  return [
    model.entityTypeName,
    ...model.ownedRelationships.map((relationship) => relationship.ownedDomain.entityTypeName),
    ...model.nestedValueObjectRelationships.map((relationship) => relationship.valueObjectTypeName),
  ];
}

function routedCollectionDetailStateDomainModelValueImports(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly string[] {
  if (model.serviceCollection != null) {
    return [model.entityTypeName];
  }
  return routedCollectionDetailDomainModelValueImports(model);
}

function routedCollectionDetailDomainExtraProperties(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly {
  readonly memberName: string;
  readonly typeScriptType: string;
  readonly parameterModifier: 'public';
}[] {
  return [
    ...routedCollectionDetailObjectReferenceRelationships(model).map((relationship) => ({
      memberName: relationship.localMemberName,
      typeScriptType: routedCollectionDetailObjectRelationshipTypeScriptType(relationship),
      parameterModifier: 'public' as const,
    })),
    ...model.ownedRelationships.map((relationship) => ({
      memberName: relationship.localMemberName,
      typeScriptType: routedCollectionDetailOwnedRelationshipTypeScriptType(relationship),
      parameterModifier: 'public' as const,
    })),
    ...model.nestedValueObjectRelationships.map((relationship) => ({
      memberName: relationship.localMemberName,
      typeScriptType: routedCollectionDetailNestedValueObjectRelationshipTypeScriptType(relationship),
      parameterModifier: 'public' as const,
    })),
  ];
}

function routedCollectionDetailRelationshipInitializerProperties(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly {
  readonly memberName: string;
  readonly typeScriptType: string;
  readonly expressionForRecord: (record: AppBuilderSeedRecord, recordIndex: number) => string;
  readonly defaultExpression: string;
}[] {
  return [
    ...routedCollectionDetailObjectReferenceRelationships(model).map((relationship) => ({
      memberName: relationship.localMemberName,
      typeScriptType: routedCollectionDetailObjectRelationshipTypeScriptType(relationship),
      expressionForRecord: (record: AppBuilderSeedRecord) => routedCollectionDetailObjectRelationshipSeedValueExpression(record, relationship),
      defaultExpression: routedCollectionDetailObjectRelationshipDefaultExpression(relationship),
    })),
    ...model.ownedRelationships.map((relationship) => ({
      memberName: relationship.localMemberName,
      typeScriptType: routedCollectionDetailOwnedRelationshipTypeScriptType(relationship),
      expressionForRecord: (record: AppBuilderSeedRecord) => routedCollectionDetailOwnedRelationshipSeedValueExpression(record, relationship),
      defaultExpression: routedCollectionDetailOwnedRelationshipDefaultExpression(relationship),
    })),
    ...model.nestedValueObjectRelationships.map((relationship) => ({
      memberName: relationship.localMemberName,
      typeScriptType: routedCollectionDetailNestedValueObjectRelationshipTypeScriptType(relationship),
      expressionForRecord: (record: AppBuilderSeedRecord) => routedCollectionDetailNestedValueObjectSeedValueExpression(record, relationship),
      defaultExpression: routedCollectionDetailNestedValueObjectRelationshipDefaultExpression(relationship),
    })),
  ];
}

function routedCollectionDetailObjectRelationshipSeedValueExpression(
  record: AppBuilderSeedRecord,
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipModel,
): string {
  const localValue = record[relationship.localMemberName];
  if (relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany) {
    const localValues = Array.isArray(localValue) ? localValue : [];
    return `this.${relationship.relatedCollectionMemberName}.filter((${relationship.relatedItemName}) => ${appBuilderSeedRecordLiteral(localValues)}.includes(${relationship.relatedItemName}.${relationship.foreignFieldName}))`;
  }
  if (localValue == null) {
    return 'null';
  }
  return `this.${relationship.relatedCollectionMemberName}.find((${relationship.relatedItemName}) => ${relationship.relatedItemName}.${relationship.foreignFieldName} === ${appBuilderSeedRecordLiteral(localValue)}) ?? null`;
}

function routedCollectionDetailObjectRelationshipConstructionProperties(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  selectedFieldNames: ReadonlySet<string>,
): readonly { readonly memberName: string; readonly expression: string }[] {
  return routedCollectionDetailObjectReferenceRelationships(model).map((relationship) => ({
    memberName: relationship.localMemberName,
    expression: selectedFieldNames.has(relationship.localMemberName)
      ? relationship.localMemberName
      : routedCollectionDetailObjectRelationshipDefaultExpression(relationship),
  }));
}

function routedCollectionDetailRelationshipConstructionProperties(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  selectedFieldNames: ReadonlySet<string>,
): readonly { readonly memberName: string; readonly expression: string }[] {
  return [
    ...routedCollectionDetailObjectRelationshipConstructionProperties(model, selectedFieldNames),
    ...model.ownedRelationships.map((relationship) => ({
      memberName: relationship.localMemberName,
      expression: selectedFieldNames.has(relationship.localMemberName)
        ? relationship.localMemberName
        : routedCollectionDetailOwnedRelationshipDefaultExpression(relationship),
    })),
    ...model.nestedValueObjectRelationships.map((relationship) => ({
      memberName: relationship.localMemberName,
      expression: selectedFieldNames.has(relationship.localMemberName)
        ? relationship.localMemberName
        : routedCollectionDetailNestedValueObjectRelationshipDefaultExpression(relationship),
    })),
  ];
}

function routedCollectionDetailOwnedEntitySource(
  relationship: AppBuilderRoutedCollectionDetailOwnedRelationshipModel,
): string {
  return appBuilderDomainEntityClassSource({
    entityTypeName: relationship.ownedDomain.entityTypeName,
    identityMemberName: relationship.ownedDomain.identityMemberName,
    identityValueKind: relationship.ownedDomain.identityValueKind,
    fields: relationship.ownedFields,
    fieldParameterModifier: 'readonly',
    includeDisplayAccessors: true,
  });
}

function routedCollectionDetailNestedValueObjectSource(
  relationship: AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel,
): string {
  return appBuilderDomainValueObjectClassSource({
    valueObjectTypeName: relationship.valueObjectTypeName,
    fields: relationship.fields,
    fieldParameterModifier: 'readonly',
  });
}

function routedCollectionDetailOwnedRelationshipTypeScriptType(
  relationship: AppBuilderRoutedCollectionDetailOwnedRelationshipModel,
): string {
  switch (relationship.relationship.kind) {
    case AppBuilderDomainRelationshipKind.OwnsMany:
      return `${relationship.ownedDomain.entityTypeName}[]`;
    case AppBuilderDomainRelationshipKind.OwnsOne:
      return relationship.relationship.required === true
        ? relationship.ownedDomain.entityTypeName
        : `${relationship.ownedDomain.entityTypeName} | null`;
    case AppBuilderDomainRelationshipKind.ReferenceOne:
    case AppBuilderDomainRelationshipKind.ReferenceMany:
    case AppBuilderDomainRelationshipKind.NestedValueObject:
      throw new Error(`Relationship '${relationship.relationship.name}' is not supported by routed owned-relationship source.`);
  }
}

function routedCollectionDetailNestedValueObjectRelationshipTypeScriptType(
  relationship: AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel,
): string {
  return relationship.relationship.required === true
    ? relationship.valueObjectTypeName
    : `${relationship.valueObjectTypeName} | null`;
}

function routedCollectionDetailOwnedRelationshipDefaultExpression(
  relationship: AppBuilderRoutedCollectionDetailOwnedRelationshipModel,
): string {
  return relationship.relationship.kind === AppBuilderDomainRelationshipKind.OwnsMany
    ? '[]'
    : 'null';
}

function routedCollectionDetailNestedValueObjectRelationshipDefaultExpression(
  _relationship: AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel,
): string {
  return 'null';
}

function routedCollectionDetailOwnedRelationshipSeedValueExpression(
  record: AppBuilderSeedRecord,
  relationship: AppBuilderRoutedCollectionDetailOwnedRelationshipModel,
): string {
  const value = record[relationship.localMemberName];
  if (relationship.relationship.kind === AppBuilderDomainRelationshipKind.OwnsOne) {
    if (isAppBuilderSeedRecordObject(value)) {
      return appBuilderDomainSeedRecordConstructionExpressionSource(
        relationship.ownedDomain,
        relationship.ownedFields,
        value,
        { baseIndent: '    ' },
      );
    }
    return 'null';
  }
  const seedRecords = Array.isArray(value)
    ? value.filter(isAppBuilderSeedRecordObject)
    : [];
  return appBuilderDomainCollectionInitializerSource(
    relationship.ownedDomain,
    relationship.ownedFields,
    seedRecords,
    { rowIndent: '    ', closingIndent: '  ' },
  );
}

function routedCollectionDetailNestedValueObjectSeedValueExpression(
  record: AppBuilderSeedRecord,
  relationship: AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel,
): string {
  const value = record[relationship.localMemberName];
  if (isAppBuilderSeedRecordObject(value)) {
    return appBuilderDomainValueObjectSeedRecordConstructionExpressionSource(
      {
        valueObjectTypeName: relationship.valueObjectTypeName,
        fields: relationship.fields,
      },
      value,
      { baseIndent: '    ' },
    );
  }
  return 'null';
}

function routedCollectionDetailRelationshipMethodSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  relationship: AppBuilderRoutedCollectionDetailReferenceRelationshipModel,
): string {
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  if (relationship.localValueKind === AppBuilderDomainRelationshipLocalValueKind.Object) {
    if (relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany) {
      return `  ${relationship.relatedLookupMethodName}(${itemName}: ${model.entityTypeName}): ${relationship.relatedDomain.entityTypeName}[] {
    return ${itemName}.${relationship.localMemberName};
  }

  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    const ${relationship.relatedCollectionMemberName} = this.${relationship.relatedLookupMethodName}(${itemName});
    return ${relationship.relatedCollectionMemberName}.length === 0 ? '' : ${relationship.relatedCollectionMemberName}.map((${relationship.relatedItemName}) => String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName)})).join(', ');
  }

  match${relationship.relatedDomain.entityTypeName}(left: ${relationship.relatedDomain.entityTypeName} | null, right: ${relationship.relatedDomain.entityTypeName} | null): boolean {
    return left?.${relationship.foreignFieldName} === right?.${relationship.foreignFieldName};
  }`;
    }
    return `  ${relationship.relatedLookupMethodName}(${itemName}: ${model.entityTypeName}): ${relationship.relatedDomain.entityTypeName} | null {
    return ${itemName}.${relationship.localMemberName};
  }

  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    const ${relationship.relatedItemName} = this.${relationship.relatedLookupMethodName}(${itemName});
    return ${relationship.relatedItemName} == null ? '' : String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName)});
  }

  match${relationship.relatedDomain.entityTypeName}(left: ${relationship.relatedDomain.entityTypeName} | null, right: ${relationship.relatedDomain.entityTypeName} | null): boolean {
    return left?.${relationship.foreignFieldName} === right?.${relationship.foreignFieldName};
  }`;
  }
  if (relationship.relationship.kind === AppBuilderDomainRelationshipKind.ReferenceMany) {
    return `  ${relationship.relatedLookupMethodName}(${itemName}: ${model.entityTypeName}): ${relationship.relatedDomain.entityTypeName}[] {
    return this.${relationship.relatedCollectionMemberName}.filter((${relationship.relatedItemName}) => ${itemName}.${relationship.localField!.memberName}.includes(${relationship.relatedItemName}.${relationship.foreignFieldName}));
  }

  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    const ${relationship.relatedCollectionMemberName} = this.${relationship.relatedLookupMethodName}(${itemName});
    return ${relationship.relatedCollectionMemberName}.length === 0 ? '' : ${relationship.relatedCollectionMemberName}.map((${relationship.relatedItemName}) => String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName)})).join(', ');
  }`;
  }
  return `  ${relationship.relatedLookupMethodName}(${itemName}: ${model.entityTypeName}): ${relationship.relatedDomain.entityTypeName} | null {
    return this.${relationship.relatedCollectionMemberName}.find((${relationship.relatedItemName}) => ${relationship.relatedItemName}.${relationship.foreignFieldName} === ${itemName}.${relationship.localField!.memberName}) ?? null;
  }

  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    const ${relationship.relatedItemName} = this.${relationship.relatedLookupMethodName}(${itemName});
    return ${relationship.relatedItemName} == null ? '' : String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.relatedItemName)});
  }`;
}

function routedCollectionDetailOwnedRelationshipMethodSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  relationship: AppBuilderRoutedCollectionDetailOwnedRelationshipModel,
): string {
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  if (relationship.relationship.kind === AppBuilderDomainRelationshipKind.OwnsOne) {
    if (relationship.relationship.required === true) {
      return `  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    return String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, `${itemName}.${relationship.localMemberName}`)});
  }`;
    }
    return `  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    const ${relationship.ownedItemName} = ${itemName}.${relationship.localMemberName};
    return ${relationship.ownedItemName} == null ? '' : String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.ownedItemName)});
  }`;
  }
  return `  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    return ${itemName}.${relationship.localMemberName}.length === 0 ? '' : ${itemName}.${relationship.localMemberName}.map((${relationship.ownedItemName}) => String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.ownedItemName)})).join(', ');
  }`;
}

function routedCollectionDetailNestedValueObjectRelationshipMethodSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  relationship: AppBuilderRoutedCollectionDetailNestedValueObjectRelationshipModel,
): string {
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  if (relationship.relationship.required === true) {
    return `  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    return String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, `${itemName}.${relationship.localMemberName}`)});
  }`;
  }
  return `  ${relationship.labelMethodName}(${itemName}: ${model.entityTypeName}): string {
    const ${relationship.valueObjectItemName} = ${itemName}.${relationship.localMemberName};
    return ${relationship.valueObjectItemName} == null ? '' : String(${appBuilderDomainFieldDisplayExpression(relationship.displayField, relationship.valueObjectItemName)});
  }`;
}

function routedCollectionDetailRelatedCollectionMethodSource(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  collection: AppBuilderRoutedCollectionDetailRelatedCollectionModel,
): string {
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  return `  ${collection.filterMethodName}(${itemName}: ${model.entityTypeName}): ${collection.domain.entityTypeName}[] {
    return this.${collection.collectionMemberName}.filter((${collection.itemLocalName}) => ${collection.itemLocalName}.${collection.localField.memberName} === ${itemName}.${collection.foreignFieldName});
  }`;
}

function routedCollectionDetailIdentityComparisonExpression(
  model: AppBuilderRoutedCollectionDetailSourceModel,
  itemName: string,
): string {
  const memberExpression = `${itemName}.${model.identityMemberName}`;
  if (model.identityValueKind === AppBuilderDomainIdentityValueKind.String) {
    return `${memberExpression} === ${model.identityMemberName}`;
  }
  return `String(${memberExpression}) === ${model.identityMemberName}`;
}

function routedCollectionDetailFieldDisplays(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): {
  readonly elements: readonly AppBuilderTemplateElementSource[];
  readonly fragments: readonly AppBuilderPartSourceFragment[];
} {
  const fragments: AppBuilderPartSourceFragment[] = [];
  const itemName = appBuilderLowerCamelCase(model.entityTypeName);
  const relationshipLocalFieldNames = new Set(model.referenceRelationships
    .map((relationship) => relationship.localField?.memberName)
    .filter((memberName): memberName is string => memberName != null));
  const elements = model.fields
    .filter((field) =>
      field.memberName !== model.titleField.memberName
      && !relationshipLocalFieldNames.has(field.memberName)
    )
    .map((field) => {
      if (field.valueKind === AppBuilderDomainFieldValueKind.Boolean) {
        const checkedAttribute = appBuilderAttributeToViewBindingAttributeFragment('checked', `${itemName}.${field.memberName}`);
        const checkboxFragment = appBuilderTemplateElementFragment('input', [
          { rawName: 'type', rawValue: 'checkbox' },
          checkedAttribute.templateAttribute,
          { rawName: 'disabled' },
          { rawName: 'aria-label', rawValue: field.field.title },
        ]);
        const paragraphFragment = appBuilderTemplateElementFragment('p', [], null, [
          authoredTemplatePlainTextChildSource(`${field.field.title}:`),
          checkboxFragment.templateElement,
        ]);
        fragments.push(checkedAttribute, checkboxFragment, paragraphFragment);
        return paragraphFragment.templateElement;
      }
      const interpolation = appBuilderTextInterpolationFragment(appBuilderDomainFieldDisplayExpression(field, itemName));
      fragments.push(interpolation);
      return authoredTemplateElementSource(
        'p',
        [],
        `${authoredTemplateTextContentText(field.field.title)}: ${interpolation.text}`,
      );
    });
  const relationshipElements = routedCollectionDetailDisplayRelationships(model).map((relationship) => {
    const interpolation = appBuilderTextInterpolationFragment(`state.${relationship.labelMethodName}(${itemName})`);
    const element = appBuilderTemplateElementFragment(
      'p',
      [],
      `${authoredTemplateTextContentText(relationship.title)}: ${interpolation.text}`,
    );
    fragments.push(interpolation, element);
    return element.templateElement;
  });
  return { elements: [...elements, ...relationshipElements], fragments };
}

function routedCollectionDetailDisplayAccessorFields(
  model: AppBuilderRoutedCollectionDetailSourceModel,
): readonly AppBuilderDomainFieldSourceModel[] {
  const relationshipLocalFieldNames = new Set(model.referenceRelationships
    .map((relationship) => relationship.localField?.memberName)
    .filter((memberName): memberName is string => memberName != null));
  return model.fields.filter((field) => !relationshipLocalFieldNames.has(field.memberName));
}

function routedCollectionDetailRelatedCollectionDisplayAccessorFields(
  collection: AppBuilderRoutedCollectionDetailRelatedCollectionModel,
): readonly AppBuilderDomainFieldSourceModel[] {
  const displayedFieldNames = new Set(collection.tableColumns
    .map((column) => column.fieldName)
    .filter((fieldName): fieldName is string => fieldName != null));
  return collection.fields.filter((field) => displayedFieldNames.has(field.memberName));
}

function isAppBuilderSeedRecordObject(
  value: AppBuilderSeedRecord[string] | undefined,
): value is AppBuilderSeedRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
