import {
  SourcePatternParameterKey,
} from '../source-plan/source-plan.js';
import {
  SourcePlan,
  SourcePlanContributionOriginKind,
  SourcePlanFileRole,
} from '../source-plan/source-plan.js';
import {
  AppBuilderAppStateOwnershipMode,
  AppBuilderAreaNavigationPolicy,
  AppBuilderConventionPolicy,
  AppBuilderDomainModelingMode,
  AppBuilderLocalStatePolicy,
  AppBuilderResourceCarrier,
  AppBuilderRouterAdmissionPolicy,
} from './aurelia-lowering-option.js';
import {
  AppBuilderCollectionDisplayRole,
  AppBuilderCollectionTableColumnDisplayKind,
  type AppBuilderCollectionDisplayFieldPayload,
  type AppBuilderCollectionTableColumnPayload,
} from './ontology/collection-projection.js';
import {
  AppBuilderControlPatternId,
} from './ontology/control.js';
import {
  AppBuilderChoiceOptionBindingKind,
} from './control-catalog.js';
import {
  AppBuilderDomainActionKind,
  AppBuilderDomainActionScope,
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainIdentityValueKind,
  type AppBuilderDomainActionDescriptor,
  type AppBuilderDomainFieldDescriptor,
  type AppBuilderDomainValueSetDescriptor,
} from './domain-model.js';
import {
  AppBuilderApplicationPatternId,
} from './ontology/application-pattern.js';
import {
  appBuilderEffectContractIdsForTargetRef,
} from './ontology/effect-target.js';
import {
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
  AppBuilderSuppliedInputSource,
} from './ontology/input.js';
import type {
  AppBuilderSuppliedInput,
} from './ontology/input-readiness.js';
import {
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './ontology/relation.js';
import {
  appBuilderOntologyRowRefKey,
  appBuilderUniqueOntologyRowRefs,
} from './ontology/row-descriptor.js';
import {
  appBuilderSourceLoweringComposition,
} from './ontology/source-lowering-composition.js';
import {
  AppBuilderSourceLoweringCompositionKind,
  type AppBuilderSourceLoweringComposition,
  type AppBuilderSourceLoweringCompositionRequest,
} from './ontology/source-lowering-composition-contracts.js';
import {
  appBuilderSourceLoweringEmissionContext,
  type AppBuilderSourceLoweringEmissionContext,
} from './ontology/source-lowering-context.js';
import {
  appBuilderSourceLoweringInvocation,
  AppBuilderSourceLoweringButtonType,
  AppBuilderSourceLoweringMessageKind,
  type AppBuilderSourceLoweringInvocation,
  type AppBuilderSourceLoweringInvocationRequest,
} from './ontology/source-lowering-invocation.js';
import {
  type AppBuilderSourceLoweringActionFeedbackPayload,
  AppBuilderSourceLoweringVisualHookTarget,
} from './ontology/source-lowering-inputs.js';
import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectKind,
  ExpectedSemanticEffectScope,
  ExpectedSemanticEffectTopologyNodeKind,
  expectedSemanticEffectFilters,
  type ExpectedSemanticEffect as ExpectedSemanticEffectRow,
} from '../fixture-verification/expected-effect.js';
import {
  appBuilderApplicationAssemblyExpectedEffects,
  appBuilderComponentPairAppShellExpectedEffects,
  appBuilderMinimalAppShellExpectedEffects,
  appBuilderProjectToolingExpectedEffects,
  appBuilderRoutedCollectionDetailSourcePlanExpectedEffects,
} from './source-plan-expected-effects.js';
import {
  appBuilderSourceLoweringSourcePlan,
  type AppBuilderSourceLoweringSourcePlan,
  type AppBuilderSourceLoweringSourcePlanRequest,
} from './ontology/source-lowering-source-plan.js';
import {
  appBuilderSourceLoweringRequestFieldUsageRowsFromCompositionRequest,
  appBuilderSourceLoweringRequestFieldUsageRowsFromInvocationRequest,
  appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest,
  type AppBuilderSourceLoweringRequestFieldUsageRow,
} from './ontology/source-lowering-request-field.js';
import {
  AppBuilderSourceLoweringSurfaceKind,
} from './ontology/source-lowering-surface.js';
import {
  appBuilderTargetCatalog,
} from './ontology/target-catalog.js';
import {
  AppBuilderPartSourceFragmentKind,
  AppBuilderSourceFragmentOriginKind,
  type AppBuilderPartSourceFragment,
  type AppBuilderSourceFragmentOrigin,
} from './part-source-invocation.js';
import {
  appBuilderCustomElementPairSourcePlan,
} from './custom-element-pair-source-plan.js';
import {
  appBuilderLocalViewModelStateSourceFragments,
  type AppBuilderLocalViewModelStateSourceFragments,
} from './local-view-model-state-source.js';
import {
  AppBuilderSourcePlanAssembly,
} from './source-plan-assembly.js';
import {
  uniqueStrings,
} from '../kernel/collections.js';

export interface AppBuilderSourceLoweringGalleryRequest {
  readonly rootDir: string;
  readonly appName: string;
}

/** Fixture rows generated from app-builder source-lowering surfaces rather than the deleted starter lane. */
export enum AppBuilderSourceLoweringGalleryFixtureId {
  /** One real app containing invocation and composition fragments. */
  FragmentGallery = 'app-builder-source-lowering-gallery',
  /** Direct app-builder SourcePlan for the AppShell target. */
  AppShell = 'app-builder-source-lowering-app-shell',
  /** Direct app-builder SourcePlan for assembling several routed app areas under one shell. */
  ApplicationAssembly = 'app-builder-source-lowering-application-assembly',
  /** Direct app-builder SourcePlan for the router-backed list/detail target. */
  RouterBackedListDetail = 'app-builder-source-lowering-router-backed-list-detail',
  /** Direct app-builder SourcePlan for the DI state-class target. */
  DiStateClass = 'app-builder-source-lowering-di-state-class',
  /** Direct app-builder SourcePlan for a local view-model state target. */
  LocalViewModelState = 'app-builder-source-lowering-local-view-model-state',
  /** Component-pair SourcePlan that proves an explicit service-backed load/save boundary. */
  ServiceBackedLoadSave = 'app-builder-source-lowering-service-backed-load-save',
}

/** One generated pressure fixture and the app-builder ontology targets it intentionally spends. */
export interface AppBuilderSourceLoweringGalleryPlan {
  readonly fixtureId: AppBuilderSourceLoweringGalleryFixtureId;
  readonly folderName: string;
  readonly sourcePlan: SourcePlan;
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  readonly sourceLoweringRequestFieldUsageRows: readonly AppBuilderSourceLoweringRequestFieldUsageRow[];
  readonly effectContractIds: readonly string[];
  readonly expectedEffects: readonly ExpectedSemanticEffectRow[];
}

/** Coverage issue for the app-builder source-lowering gallery fixture set. */
export enum AppBuilderSourceLoweringGalleryCoverageIssueKind {
  /** A source-lowering-implemented target is absent from the gallery fixture set. */
  MissingTarget = 'missing-target',
  /** A gallery fixture reported a target that is not source-lowering-implemented. */
  UnexpectedTarget = 'unexpected-target',
  /** One gallery source-plan lowerer returned issues instead of complete source. */
  SourceLoweringIssue = 'source-lowering-issue',
}

/** One app-builder source-lowering gallery coverage issue. */
export interface AppBuilderSourceLoweringGalleryCoverageIssue {
  readonly issueKind: AppBuilderSourceLoweringGalleryCoverageIssueKind;
  readonly targetRef?: AppBuilderOntologyRowRef;
  readonly fixtureId?: AppBuilderSourceLoweringGalleryFixtureId;
  readonly summary: string;
}

/** Build pressure fixtures that exercise every currently executable app-builder source-lowering target row. */
export function appBuilderSourceLoweringGalleryPlans(
  request: AppBuilderSourceLoweringGalleryRequest,
): readonly AppBuilderSourceLoweringGalleryPlan[] {
  const plans = buildAppBuilderSourceLoweringGalleryPlans(request);
  assertAppBuilderSourceLoweringGalleryCoverage(plans);
  return plans;
}

/** Build app-builder source-lowering gallery plans without asserting coverage, for integrity probes. */
export function buildAppBuilderSourceLoweringGalleryPlans(
  request: AppBuilderSourceLoweringGalleryRequest,
): readonly AppBuilderSourceLoweringGalleryPlan[] {
  return [
    fragmentGalleryPlan(request),
    directAppShellGalleryPlan(request),
    directApplicationAssemblyGalleryPlan(request),
    directRouterBackedListDetailGalleryPlan(request),
    directDiStateClassGalleryPlan(request),
    directLocalViewModelStateGalleryPlan(request),
    serviceBackedLoadSaveGalleryPlan(request),
  ];
}

/** Return app-builder source-lowering gallery coverage issues without throwing. */
export function appBuilderSourceLoweringGalleryCoverageIssues(
  plans: readonly AppBuilderSourceLoweringGalleryPlan[],
): readonly AppBuilderSourceLoweringGalleryCoverageIssue[] {
  const expected = expectedSourceLoweringTargetRefsByKey();
  const observed = observedGalleryTargetRefsByKey(plans);
  const issues: AppBuilderSourceLoweringGalleryCoverageIssue[] = [];
  for (const [key, targetRef] of expected) {
    if (observed.has(key)) {
      continue;
    }
    issues.push({
      issueKind: AppBuilderSourceLoweringGalleryCoverageIssueKind.MissingTarget,
      targetRef,
      summary: `App-builder source-lowering gallery does not spend target '${targetRef.kind}:${targetRef.id}'.`,
    });
  }
  for (const [key, row] of observed) {
    if (expected.has(key)) {
      continue;
    }
    issues.push({
      issueKind: AppBuilderSourceLoweringGalleryCoverageIssueKind.UnexpectedTarget,
      targetRef: row.targetRef,
      fixtureId: row.fixtureId,
      summary: `App-builder source-lowering gallery fixture '${row.fixtureId}' reported unexpected target '${row.targetRef.kind}:${row.targetRef.id}'.`,
    });
  }
  return issues;
}

/** Throw when the gallery fixture set stops representing every executable app-builder source-lowering target. */
export function assertAppBuilderSourceLoweringGalleryCoverage(
  plans: readonly AppBuilderSourceLoweringGalleryPlan[],
): void {
  const issues = appBuilderSourceLoweringGalleryCoverageIssues(plans);
  if (issues.length === 0) {
    return;
  }
  throw new Error(
    `App-builder source-lowering gallery coverage has ${issues.length} issue(s): ${issues
      .map((issue) => `${issue.issueKind}:${issue.targetRef == null ? 'unknown' : `${issue.targetRef.kind}:${issue.targetRef.id}`}`)
      .join(', ')}`,
  );
}

function fragmentGalleryPlan(
  request: AppBuilderSourceLoweringGalleryRequest,
): AppBuilderSourceLoweringGalleryPlan {
  const rootDir = `${request.rootDir}/${AppBuilderSourceLoweringGalleryFixtureId.FragmentGallery}`;
  const entrypointPath = 'src/main.ts';
  const appPath = 'src/my-app.ts';
  const templatePath = 'src/my-app.html';
  const fragmentSet = fragmentGalleryFragmentSet();
  const componentPairSourcePlan = appBuilderCustomElementPairSourcePlan({
    rootDir,
    layout: {
      carrier: AppBuilderResourceCarrier.Convention,
      componentPath: appPath,
      templatePath,
      className: 'MyApp',
      resourceName: 'my-app',
    },
    componentFileRole: SourcePlanFileRole.RootComponent,
    templateFileTextFragments: fragmentSet.fragments,
    templateContributionFragments: fragmentSet.fragments,
    typeScriptTopLevelFragments: fragmentSet.typeScriptTopLevelFragments,
    classMemberFragments: fragmentSet.classMemberFragments,
  });
  const assembly = new AppBuilderSourcePlanAssembly({
    rootDir,
    appName: `${request.appName} Fragment Gallery`,
  })
    .addConfiguredEntrypoint({
      entrypointPath,
      rootComponentPath: appPath,
      rootComponentClassName: 'MyApp',
    });
  for (const file of componentPairSourcePlan.files) {
    assembly.addSourcePlanFile(file);
  }
  const sourcePlan = assembly.build();
  return {
    fixtureId: AppBuilderSourceLoweringGalleryFixtureId.FragmentGallery,
    folderName: AppBuilderSourceLoweringGalleryFixtureId.FragmentGallery,
    sourcePlan,
    sourceLoweringTargetRefs: appBuilderUniqueOntologyRowRefs([
      ...fragmentSet.sourceLoweringTargetRefs,
      ...sourceLoweringTargetRefsFromSourcePlan(sourcePlan),
    ]),
    sourceLoweringRequestFieldUsageRows: fragmentSet.sourceLoweringRequestFieldUsageRows,
    effectContractIds: uniqueStrings(fragmentSet.effectContractIds),
    expectedEffects: appBuilderFragmentGalleryExpectedEffects(),
  };
}

function directAppShellGalleryPlan(
  request: AppBuilderSourceLoweringGalleryRequest,
): AppBuilderSourceLoweringGalleryPlan {
  const targetRef = sourceLoweringTargetRef(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.AppShell,
  );
  const sourcePlanRequest = {
    rootDir: `${request.rootDir}/${AppBuilderSourceLoweringGalleryFixtureId.AppShell}`,
    sourceLoweringAppShell: {
      targetRef,
      suppliedInputs: sourcePlanAppShellInputs(`${request.appName} Shell`),
    },
  };
  const lowering = checkedSourcePlanLowering(
    AppBuilderSourceLoweringGalleryFixtureId.AppShell,
    sourcePlanRequest,
  );
  return {
    fixtureId: AppBuilderSourceLoweringGalleryFixtureId.AppShell,
    folderName: AppBuilderSourceLoweringGalleryFixtureId.AppShell,
    sourcePlan: lowering.sourcePlan!,
    sourceLoweringTargetRefs: lowering.sourceLoweringTargetRefs,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest(sourcePlanRequest),
    effectContractIds: lowering.effectContractIds,
    expectedEffects: appBuilderMinimalAppShellExpectedEffects(),
  };
}

function directApplicationAssemblyGalleryPlan(
  request: AppBuilderSourceLoweringGalleryRequest,
): AppBuilderSourceLoweringGalleryPlan {
  const targetRef = sourceLoweringTargetRef(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.ApplicationAssembly,
  );
  const childTargetRef = sourceLoweringTargetRef(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.RouterBackedListDetail,
  );
  const sourcePlanRequest = {
    rootDir: `${request.rootDir}/${AppBuilderSourceLoweringGalleryFixtureId.ApplicationAssembly}`,
    sourceLoweringApplicationAssembly: {
      targetRef,
      suppliedInputs: sourcePlanAppShellInputs(`${request.appName} Assembly Gallery`),
      routeAreas: [
        {
          targetRef: childTargetRef,
          suppliedInputs: projectRouteAreaInputs(`${request.appName} Assembly Gallery`),
          actionName: 'openProject',
          linkText: 'Open project',
          serviceCollection: {},
        },
        {
          targetRef: childTargetRef,
          suppliedInputs: milestoneRouteAreaInputs(`${request.appName} Assembly Gallery`),
          actionName: 'openMilestone',
          linkText: 'Open milestone',
          serviceCollection: {},
        },
      ],
    },
  } satisfies AppBuilderSourceLoweringSourcePlanRequest;
  const lowering = checkedSourcePlanLowering(
    AppBuilderSourceLoweringGalleryFixtureId.ApplicationAssembly,
    sourcePlanRequest,
  );
  return {
    fixtureId: AppBuilderSourceLoweringGalleryFixtureId.ApplicationAssembly,
    folderName: AppBuilderSourceLoweringGalleryFixtureId.ApplicationAssembly,
    sourcePlan: lowering.sourcePlan!,
    sourceLoweringTargetRefs: lowering.sourceLoweringTargetRefs,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest(sourcePlanRequest),
    effectContractIds: lowering.effectContractIds,
    expectedEffects: appBuilderApplicationAssemblyExpectedEffects(lowering.sourcePlan),
  };
}

function directRouterBackedListDetailGalleryPlan(
  request: AppBuilderSourceLoweringGalleryRequest,
): AppBuilderSourceLoweringGalleryPlan {
  const targetRef = sourceLoweringTargetRef(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.RouterBackedListDetail,
  );
  const sourcePlanRequest = {
    rootDir: `${request.rootDir}/${AppBuilderSourceLoweringGalleryFixtureId.RouterBackedListDetail}`,
    sourceLoweringRouterBackedListDetail: {
      targetRef,
      suppliedInputs: routerBackedListDetailInputs(`${request.appName} Router Gallery`),
    },
  };
  const lowering = checkedSourcePlanLowering(
    AppBuilderSourceLoweringGalleryFixtureId.RouterBackedListDetail,
    sourcePlanRequest,
  );
  return {
    fixtureId: AppBuilderSourceLoweringGalleryFixtureId.RouterBackedListDetail,
    folderName: AppBuilderSourceLoweringGalleryFixtureId.RouterBackedListDetail,
    sourcePlan: lowering.sourcePlan!,
    sourceLoweringTargetRefs: lowering.sourceLoweringTargetRefs,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest(sourcePlanRequest),
    effectContractIds: lowering.effectContractIds,
    expectedEffects: appBuilderRoutedCollectionDetailSourcePlanExpectedEffects(lowering.sourcePlan),
  };
}

function directDiStateClassGalleryPlan(
  request: AppBuilderSourceLoweringGalleryRequest,
): AppBuilderSourceLoweringGalleryPlan {
  const targetRef = sourceLoweringTargetRef(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.DiStateClass,
  );
  const sourcePlanRequest = {
    rootDir: `${request.rootDir}/${AppBuilderSourceLoweringGalleryFixtureId.DiStateClass}`,
    sourceLoweringDiStateClass: {
      targetRef,
      suppliedInputs: diStateClassInputs(`${request.appName} State Gallery`),
    },
  };
  const lowering = checkedSourcePlanLowering(
    AppBuilderSourceLoweringGalleryFixtureId.DiStateClass,
    sourcePlanRequest,
  );
  return {
    fixtureId: AppBuilderSourceLoweringGalleryFixtureId.DiStateClass,
    folderName: AppBuilderSourceLoweringGalleryFixtureId.DiStateClass,
    sourcePlan: lowering.sourcePlan!,
    sourceLoweringTargetRefs: lowering.sourceLoweringTargetRefs,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest(sourcePlanRequest),
    effectContractIds: lowering.effectContractIds,
    expectedEffects: [],
  };
}

function directLocalViewModelStateGalleryPlan(
  request: AppBuilderSourceLoweringGalleryRequest,
): AppBuilderSourceLoweringGalleryPlan {
  const targetRef = sourceLoweringTargetRef(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.LocalViewModelState,
  );
  const sourcePlanRequest = {
    rootDir: `${request.rootDir}/${AppBuilderSourceLoweringGalleryFixtureId.LocalViewModelState}`,
    sourceLoweringLocalViewModelState: {
      targetRef,
      suppliedInputs: localViewModelStateInputs(`${request.appName} Local State Gallery`),
    },
  };
  const lowering = checkedSourcePlanLowering(
    AppBuilderSourceLoweringGalleryFixtureId.LocalViewModelState,
    sourcePlanRequest,
  );
  return {
    fixtureId: AppBuilderSourceLoweringGalleryFixtureId.LocalViewModelState,
    folderName: AppBuilderSourceLoweringGalleryFixtureId.LocalViewModelState,
    sourcePlan: lowering.sourcePlan!,
    sourceLoweringTargetRefs: lowering.sourceLoweringTargetRefs,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest(sourcePlanRequest),
    effectContractIds: lowering.effectContractIds,
    expectedEffects: [],
  };
}

function serviceBackedLoadSaveGalleryPlan(
  request: AppBuilderSourceLoweringGalleryRequest,
): AppBuilderSourceLoweringGalleryPlan {
  const sourcePlanRequest = {
    rootDir: `${request.rootDir}/${AppBuilderSourceLoweringGalleryFixtureId.ServiceBackedLoadSave}`,
    templatePath: 'src/service-gallery.html',
    sourceTargetPath: 'src/service-gallery.ts',
    sourceLoweringComponentPair: {
      appShell: {
        entrypointPath: 'src/main.ts',
      },
      suppliedInputs: serviceBackedLoadSaveInputs(`${request.appName} Service Gallery`),
      serviceCollections: [{
        sourceTargetPath: 'src/services/gallery-item-service.ts',
        serviceClassName: 'GalleryItemService',
        componentMemberName: 'galleryItemService',
        collectionEntityName: 'GalleryItem',
        recordTypeName: 'GalleryItemRecord',
        loadMethodName: 'listGalleryItems',
      }],
      sourceLoweringComposition: {
        targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.LoadingEmptyErrorState),
        compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
        promiseExpression: 'itemsPromise',
        pendingText: 'Loading gallery items...',
        fulfilledLocalName: 'loadedItems',
        emptyStateText: 'No gallery items yet.',
        emptyStateConditionExpression: 'loadedItems.length === 0',
        rejectedText: 'Could not load gallery items.',
        fulfilledContentComposition: {
          targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.CollectionTable),
          compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
          collectionExpression: 'loadedItems',
          itemLocalName: 'item',
        },
      },
      sourceLoweringClassMemberInvocations: [{
        targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.AsyncDataSource),
        asyncDataMemberName: 'itemsPromise',
        asyncDataPromiseType: "ReturnType<GalleryItemService['listGalleryItems']>",
        asyncDataInitializerExpression: 'this.galleryItemService.listGalleryItems()',
      }],
    },
  } satisfies AppBuilderSourceLoweringSourcePlanRequest;
  const lowering = checkedSourcePlanLowering(
    AppBuilderSourceLoweringGalleryFixtureId.ServiceBackedLoadSave,
    sourcePlanRequest,
  );
  return {
    fixtureId: AppBuilderSourceLoweringGalleryFixtureId.ServiceBackedLoadSave,
    folderName: AppBuilderSourceLoweringGalleryFixtureId.ServiceBackedLoadSave,
    sourcePlan: lowering.sourcePlan!,
    sourceLoweringTargetRefs: lowering.sourceLoweringTargetRefs,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromSourcePlanRequest(sourcePlanRequest),
    effectContractIds: lowering.effectContractIds,
    expectedEffects: appBuilderComponentPairAppShellExpectedEffects({ includesServiceCollection: true }),
  };
}

/** Expected effects for the app-builder source-lowering fragment gallery fixture. */
export function appBuilderFragmentGalleryExpectedEffects(): readonly ExpectedSemanticEffectRow[] {
  return [
    ...appBuilderProjectToolingExpectedEffects('App-builder source-lowering fragment gallery'),
    ExpectedSemanticEffect.fact(
      'App-builder source-lowering gallery should reopen as an Aurelia app.',
      ExpectedSemanticEffectKind.ProjectShape,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'App-builder source-lowering gallery should compile generated template source.',
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectScope.Template,
      1,
      ExpectedSemanticEffectTopologyNodeKind.Template,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'App-builder source-lowering gallery should hydrate generated runtime controllers.',
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectScope.Template,
      1,
      ExpectedSemanticEffectTopologyNodeKind.Component,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'App-builder source-lowering fragment gallery should expose generated value-channel facts.',
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectScope.Template,
      8,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'App-builder source-lowering fragment gallery should expose generated binding data-flow facts.',
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectScope.Template,
      8,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
    ),
  ];
}

interface AppBuilderSourceLoweringGalleryFragmentSet {
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly typeScriptTopLevelFragments: readonly AppBuilderPartSourceFragment[];
  readonly classMemberFragments: readonly AppBuilderPartSourceFragment[];
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  readonly sourceLoweringRequestFieldUsageRows: readonly AppBuilderSourceLoweringRequestFieldUsageRow[];
  readonly effectContractIds: readonly string[];
}

interface AppBuilderSourceLoweringGalleryFragmentLowering {
  readonly fragments: readonly AppBuilderPartSourceFragment[];
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  readonly sourceLoweringRequestFieldUsageRows: readonly AppBuilderSourceLoweringRequestFieldUsageRow[];
  readonly effectContractIds: readonly string[];
}

interface AppBuilderSourceLoweringGalleryFragmentSections {
  readonly localStateTargetRef: AppBuilderOntologyRowRef;
  readonly localStateFragments: AppBuilderLocalViewModelStateSourceFragments;
  readonly classMemberLowerings: readonly AppBuilderSourceLoweringGalleryFragmentLowering[];
  readonly templateLowerings: readonly AppBuilderSourceLoweringGalleryFragmentLowering[];
}

function fragmentGalleryFragmentSet(): AppBuilderSourceLoweringGalleryFragmentSet {
  const sections = fragmentGalleryFragmentSections();
  const allLowerings = [
    ...sections.classMemberLowerings,
    ...sections.templateLowerings,
  ];
  return {
    fragments: sections.templateLowerings.flatMap((lowering) => lowering.fragments),
    typeScriptTopLevelFragments: [
      ...sections.localStateFragments.typeScriptTopLevelFragments,
      ...fragmentGallerySupportTopLevelFragments(),
    ],
    classMemberFragments: [
      ...sections.localStateFragments.classMemberFragments,
      ...fragmentGallerySupportClassMemberFragments(),
      ...sections.classMemberLowerings.flatMap((lowering) => lowering.fragments),
    ],
    sourceLoweringTargetRefs: appBuilderUniqueOntologyRowRefs([
      sections.localStateTargetRef,
      ...allLowerings.flatMap((lowering) => lowering.sourceLoweringTargetRefs),
    ]),
    sourceLoweringRequestFieldUsageRows: allLowerings.flatMap((lowering) =>
      lowering.sourceLoweringRequestFieldUsageRows
    ),
    effectContractIds: uniqueStrings([
      ...appBuilderEffectContractIdsForTargetRef(sections.localStateTargetRef),
      ...allLowerings.flatMap((lowering) => lowering.effectContractIds),
    ]),
  };
}

function fragmentGalleryFragmentSections(): AppBuilderSourceLoweringGalleryFragmentSections {
  const emissionContext = appBuilderSourceLoweringEmissionContext();
  const localStateTargetRef = sourceLoweringTargetRef(
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderApplicationPatternId.LocalViewModelState,
  );
  return {
    localStateTargetRef,
    localStateFragments: appBuilderLocalViewModelStateSourceFragments({
      className: 'MyApp',
      fields: fragmentGalleryDomainFields(),
      valueSets: fragmentGalleryDomainValueSets(),
      actionFeedbackState: fragmentGalleryActionFeedbackPayloads(),
      fragmentOrigin: sourceLoweringTargetFragmentOrigin(localStateTargetRef),
    }),
    classMemberLowerings: fragmentGalleryClassMemberLowerings(),
    templateLowerings: [
      ...fragmentGalleryControlLowerings(emissionContext),
      routeNavigationActionInvocation({
        actionName: 'openItem',
        routeInstruction: 'gallery-item-detail',
        routeParamsExpression: '{ itemId: items[0].id }',
        linkText: 'Open item',
      }),
      ...fragmentGalleryCollectionLowerings(emissionContext),
      ...fragmentGalleryStatusLowerings(emissionContext),
      ...fragmentGalleryFormLowerings(emissionContext),
      ...fragmentGallerySectionLowerings(emissionContext),
    ],
  };
}

function fragmentGalleryClassMemberLowerings(): readonly AppBuilderSourceLoweringGalleryFragmentLowering[] {
  return [
    commandActionInvocation({
      actionName: 'save',
      methodBodyStatements: 'this.enabled = true;',
    }),
    commandActionInvocation({
      actionName: 'selectItem',
      methodParameters: [{ name: 'item', typeText: 'GalleryItem' }],
      methodBodyStatements: 'this.title = item.title;',
    }),
    asyncDataSourceInvocation({
      asyncDataMemberName: 'itemsPromise',
      asyncDataPromiseType: 'Promise<GalleryItem[]>',
      asyncDataInitializerExpression: 'Promise.resolve(this.items)',
    }),
  ];
}

function fragmentGalleryControlLowerings(
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): readonly AppBuilderSourceLoweringGalleryFragmentLowering[] {
  return [
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeTextInput, { fieldName: 'title' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeTextInput, {
      fieldName: 'title',
      bindingExpression: 'title',
      labelText: 'Explicit gallery title',
    }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeTextarea, { fieldName: 'description' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeNumberInput, { fieldName: 'quantity' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeDateInput, { fieldName: 'dueDate' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeRangeInput, { fieldName: 'quantity' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeBooleanCheckbox, { fieldName: 'enabled' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeCheckboxList, { fieldName: 'labels' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeRadioGroup, {
      fieldName: 'priority',
      valueSetName: 'priorityOptions',
    }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeSingleSelect, { fieldName: 'priority' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeSingleSelect, {
      fieldName: 'priority',
      bindingExpression: 'priority',
      valueDomainExpression: 'priorityOptions',
      optionLocalName: 'priorityOption',
      optionValueExpression: 'priorityOption.value',
      optionBindingKind: AppBuilderChoiceOptionBindingKind.Model,
      optionLabelExpression: 'priorityOption.title',
      matcherExpression: 'matchOption',
    }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeMultiSelect, { fieldName: 'labels' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeButton, {
      actionName: 'save',
      buttonText: 'Save',
      buttonType: AppBuilderSourceLoweringButtonType.Button,
    }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.NativeButton, {
      actionName: 'save',
      handlerExpression: 'save()',
      eventName: 'dblclick',
      buttonText: 'Double save',
      buttonType: AppBuilderSourceLoweringButtonType.Button,
    }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.FieldGroup, { fieldName: 'title' }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.FieldGroup, {
      fieldName: 'description',
      bindingExpression: 'description',
      labelText: 'Explicit description',
      fieldControlId: 'explicit-description-field',
      innerControlPatternId: AppBuilderControlPatternId.NativeTextarea,
    }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.FormMessage, {
      messageKind: AppBuilderSourceLoweringMessageKind.Help,
    }),
    controlInvocation(emissionContext, AppBuilderControlPatternId.FormMessage, {
      messageKind: AppBuilderSourceLoweringMessageKind.Error,
      messageText: 'Explicit gallery error.',
      messageId: 'explicit-gallery-error',
    }),
  ];
}

function fragmentGalleryCollectionLowerings(
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): readonly AppBuilderSourceLoweringGalleryFragmentLowering[] {
  return [
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.CollectionList, {
      collectionExpression: 'items',
      itemLocalName: 'item',
      emptyStateText: 'No items yet.',
      emptyStateConditionExpression: 'items.length === 0',
    }),
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.CollectionCard, {
      collectionExpression: 'items',
      itemLocalName: 'item',
      emptyStateText: 'No cards yet.',
      emptyStateConditionExpression: 'items.length === 0',
    }),
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.CollectionTable, {
      collectionExpression: 'items',
      itemLocalName: 'item',
      emptyStateText: 'No rows yet.',
      emptyStateConditionExpression: 'items.length === 0',
      actionHandlerExpressions: [{ actionName: 'save', handlerExpression: 'save()' }],
      sortHandlerExpressions: [{ fieldName: 'title', handlerExpression: "sortBy('title')" }],
    }),
  ];
}

function fragmentGalleryStatusLowerings(
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): readonly AppBuilderSourceLoweringGalleryFragmentLowering[] {
  return [
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.LoadingEmptyErrorState, {
      promiseExpression: 'itemsPromise',
      pendingText: 'Loading...',
      fulfilledLocalName: 'loadedItems',
      emptyStateText: 'Nothing loaded.',
      emptyStateConditionExpression: 'loadedItems.length === 0',
      rejectedLocalName: 'error',
      rejectedText: 'Loading failed.',
    }),
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.LoadingEmptyErrorState, {
      promiseExpression: 'itemsPromise',
      pendingText: 'Loading with fulfilled content...',
      fulfilledLocalName: 'loadedItems',
      emptyStateText: 'No loaded rows.',
      emptyStateConditionExpression: 'loadedItems.length === 0',
      rejectedLocalName: 'error',
      rejectedText: 'Loading with fulfilled content failed.',
      fulfilledContentComposition: {
        targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.CollectionList),
        compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionList,
        collectionExpression: 'loadedItems',
        itemLocalName: 'loadedItem',
        emptyStateText: 'No loaded rows.',
        emptyStateConditionExpression: 'loadedItems.length === 0',
      },
    }),
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.ActionFeedbackStatus, {
      actionName: 'save',
    }),
  ];
}

function fragmentGalleryFormLowerings(
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): readonly AppBuilderSourceLoweringGalleryFragmentLowering[] {
  return [
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.NativeSubmitForm, {
      fieldNames: ['title', 'description', 'quantity', 'dueDate', 'enabled', 'priority', 'labels'],
      actionName: 'save',
      submitButtonText: 'Save item',
    }),
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.DomainBackedSubmitForm, {
      fieldNames: ['title', 'enabled'],
      bindingRootExpression: 'draftItem',
      fieldBindingExpressions: [{ fieldName: 'enabled', bindingExpression: 'draftItem.enabled' }],
      fieldControlSelections: [
        { fieldName: 'title', innerControlPatternId: AppBuilderControlPatternId.NativeTextInput },
        { fieldName: 'enabled', innerControlPatternId: AppBuilderControlPatternId.NativeBooleanCheckbox },
      ],
      actionName: 'save',
      handlerExpression: 'save()',
      submitButtonText: 'Save draft',
    }),
  ];
}

function fragmentGallerySectionLowerings(
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): readonly AppBuilderSourceLoweringGalleryFragmentLowering[] {
  return [
    compositionInvocation(emissionContext, AppBuilderApplicationPatternId.AppSection, {
      childCompositions: [
        {
          targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.NativeSubmitForm),
          compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
          fieldNames: ['title', 'enabled'],
          actionName: 'save',
          submitButtonText: 'Add gallery item',
        },
        {
          targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.CollectionTable),
          compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
          collectionExpression: 'items',
          itemLocalName: 'item',
          emptyStateText: 'No gallery items yet.',
          emptyStateConditionExpression: 'items.length === 0',
          actionHandlerExpressions: [{ actionName: 'save', handlerExpression: 'save()' }],
          sortHandlerExpressions: [{ fieldName: 'title', handlerExpression: "sortBy('title')" }],
        },
      ],
    }),
  ];
}

function commandActionInvocation(
  request: Omit<AppBuilderSourceLoweringInvocationRequest, 'targetRef' | 'suppliedInputs'>,
): AppBuilderSourceLoweringGalleryFragmentLowering {
  const invocationRequest = {
    ...request,
    targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.DomainCommandAction),
    suppliedInputs: fragmentGalleryInputs(),
  };
  const lowering = checkedInvocation(AppBuilderApplicationPatternId.DomainCommandAction, invocationRequest);
  return {
    ...lowering,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromInvocationRequest(
      invocationRequest,
      `fragmentGallery.invocation.${AppBuilderApplicationPatternId.DomainCommandAction}`,
    ),
  };
}

function asyncDataSourceInvocation(
  request: Omit<AppBuilderSourceLoweringInvocationRequest, 'targetRef' | 'suppliedInputs'>,
): AppBuilderSourceLoweringGalleryFragmentLowering {
  const invocationRequest = {
    ...request,
    targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.AsyncDataSource),
    suppliedInputs: fragmentGalleryInputs(),
  };
  const lowering = checkedInvocation(AppBuilderApplicationPatternId.AsyncDataSource, invocationRequest);
  return {
    ...lowering,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromInvocationRequest(
      invocationRequest,
      `fragmentGallery.invocation.${AppBuilderApplicationPatternId.AsyncDataSource}`,
    ),
  };
}

function routeNavigationActionInvocation(
  request: Omit<AppBuilderSourceLoweringInvocationRequest, 'targetRef' | 'suppliedInputs'>,
): AppBuilderSourceLoweringGalleryFragmentLowering {
  const invocationRequest = {
    ...request,
    targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.RouteNavigationAction),
    suppliedInputs: fragmentGalleryInputs(),
  };
  const lowering = checkedInvocation(AppBuilderApplicationPatternId.RouteNavigationAction, invocationRequest);
  return {
    ...lowering,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromInvocationRequest(
      invocationRequest,
      `fragmentGallery.invocation.${AppBuilderApplicationPatternId.RouteNavigationAction}`,
    ),
  };
}

function controlInvocation(
  emissionContext: AppBuilderSourceLoweringEmissionContext,
  controlPatternId: AppBuilderControlPatternId,
  request: Omit<AppBuilderSourceLoweringInvocationRequest, 'targetRef' | 'suppliedInputs'>,
): AppBuilderSourceLoweringGalleryFragmentLowering {
  const invocationRequest = {
    ...request,
    targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ControlPattern, controlPatternId),
    suppliedInputs: fragmentGalleryInputs(),
    emissionContext,
  };
  const lowering = checkedInvocation(controlPatternId, invocationRequest);
  return {
    ...lowering,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromInvocationRequest(
      invocationRequest,
      `fragmentGallery.invocation.${controlPatternId}`,
    ),
  };
}

function compositionInvocation(
  emissionContext: AppBuilderSourceLoweringEmissionContext,
  applicationPatternId: AppBuilderApplicationPatternId,
  request: Omit<AppBuilderSourceLoweringCompositionRequest, 'targetRef' | 'compositionKind' | 'suppliedInputs'>,
): AppBuilderSourceLoweringGalleryFragmentLowering {
  const compositionRequest = {
    ...request,
    targetRef: sourceLoweringTargetRef(AppBuilderOntologyRowKind.ApplicationPattern, applicationPatternId),
    compositionKind: compositionKindForApplicationPattern(applicationPatternId),
    suppliedInputs: fragmentGalleryInputs(),
    emissionContext,
  };
  const lowering = checkedComposition(applicationPatternId, compositionRequest);
  return {
    ...lowering,
    sourceLoweringRequestFieldUsageRows: appBuilderSourceLoweringRequestFieldUsageRowsFromCompositionRequest(
      compositionRequest,
      `fragmentGallery.composition.${applicationPatternId}`,
    ),
  };
}

function checkedInvocation(
  targetId: string,
  request: AppBuilderSourceLoweringInvocationRequest,
): AppBuilderSourceLoweringInvocation {
  const lowering = appBuilderSourceLoweringInvocation(request);
  if (lowering.issues.length > 0 || lowering.fragments.length === 0) {
    throw new Error(`App-builder source-lowering gallery failed invocation '${targetId}': ${lowering.issues.map((issue) => issue.summary).join(' ')}`);
  }
  return lowering;
}

function checkedComposition(
  applicationPatternId: AppBuilderApplicationPatternId,
  request: AppBuilderSourceLoweringCompositionRequest,
): AppBuilderSourceLoweringComposition {
  const lowering = appBuilderSourceLoweringComposition(request);
  if (lowering.issues.length > 0 || lowering.fragments.length === 0) {
    throw new Error(`App-builder source-lowering gallery failed composition '${applicationPatternId}': ${lowering.issues.map((issue) => issue.summary).join(' ')}`);
  }
  return lowering;
}

function checkedSourcePlanLowering(
  fixtureId: AppBuilderSourceLoweringGalleryFixtureId,
  request: AppBuilderSourceLoweringSourcePlanRequest,
): AppBuilderSourceLoweringSourcePlan {
  const lowering = appBuilderSourceLoweringSourcePlan(request);
  if (lowering.issues.length > 0 || lowering.sourcePlan == null) {
    throw new Error(`App-builder source-lowering gallery failed SourcePlan '${fixtureId}': ${lowering.issues.map((issue) => issue.summary).join(' ')}`);
  }
  return lowering;
}

function compositionKindForApplicationPattern(
  applicationPatternId: AppBuilderApplicationPatternId,
): AppBuilderSourceLoweringCompositionKind {
  switch (applicationPatternId) {
    case AppBuilderApplicationPatternId.AppSection:
      return AppBuilderSourceLoweringCompositionKind.AppSection;
    case AppBuilderApplicationPatternId.CollectionList:
      return AppBuilderSourceLoweringCompositionKind.CollectionList;
    case AppBuilderApplicationPatternId.CollectionCard:
      return AppBuilderSourceLoweringCompositionKind.CollectionCard;
    case AppBuilderApplicationPatternId.CollectionTable:
      return AppBuilderSourceLoweringCompositionKind.CollectionTable;
    case AppBuilderApplicationPatternId.LoadingEmptyErrorState:
      return AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState;
    case AppBuilderApplicationPatternId.ActionFeedbackStatus:
      return AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus;
    case AppBuilderApplicationPatternId.NativeSubmitForm:
    case AppBuilderApplicationPatternId.DomainBackedSubmitForm:
      return AppBuilderSourceLoweringCompositionKind.NativeSubmitForm;
    case AppBuilderApplicationPatternId.AppShell:
    case AppBuilderApplicationPatternId.ApplicationAssembly:
    case AppBuilderApplicationPatternId.NativeControlBinding:
    case AppBuilderApplicationPatternId.DomainCommandAction:
    case AppBuilderApplicationPatternId.RouteNavigationAction:
    case AppBuilderApplicationPatternId.AsyncDataSource:
    case AppBuilderApplicationPatternId.RouterBackedListDetail:
    case AppBuilderApplicationPatternId.ServiceBackedLoadSave:
    case AppBuilderApplicationPatternId.LocalViewModelState:
    case AppBuilderApplicationPatternId.DiStateClass:
    case AppBuilderApplicationPatternId.EditBuffer:
    case AppBuilderApplicationPatternId.ValidationRules:
    case AppBuilderApplicationPatternId.Localization:
    case AppBuilderApplicationPatternId.StatePluginStore:
      throw new Error(`Application pattern '${applicationPatternId}' is not a fragment-composition gallery target.`);
  }
}

function fragmentGallerySupportTopLevelFragments(): readonly AppBuilderPartSourceFragment[] {
  return [{
    kind: AppBuilderPartSourceFragmentKind.TypeScriptTopLevelDeclaration,
    text: `interface GalleryItem {
  readonly title: string;
  readonly description: string;
  readonly quantity: number;
  readonly dueDate: Date | null;
  readonly enabled: boolean;
  readonly priority: MyAppPriority;
  readonly labels: readonly MyAppLabel[];
}`,
  }];
}

function fragmentGallerySupportClassMemberFragments(): readonly AppBuilderPartSourceFragment[] {
  return [
    {
      kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
      text: `readonly items: GalleryItem[] = [
  {
    title: 'Alpha',
    description: 'First gallery item',
    quantity: 2,
    dueDate: new Date('2026-06-01T00:00:00.000Z'),
    enabled: true,
    priority: 'normal',
    labels: ['frontend'],
  },
  {
    title: 'Beta',
    description: 'Second gallery item',
    quantity: 5,
    dueDate: null,
    enabled: false,
    priority: 'urgent',
    labels: ['backend', 'docs'],
  },
];`,
    },
    {
      kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
      text: `draftItem: GalleryItem = {
  title: 'Draft',
  description: 'Editable gallery item',
  quantity: 1,
  dueDate: null,
  enabled: true,
  priority: 'normal',
  labels: ['frontend'],
};`,
    },
    {
      kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
      text: `sortBy(fieldName: keyof GalleryItem): void {
  this.title = \`Sorted by \${fieldName}\`;
}`,
    },
    {
      kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
      text: `matchOption(left: unknown, right: unknown): boolean {
  return left === right;
}`,
    },
  ];
}

function sourceLoweringTargetFragmentOrigin(
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderSourceFragmentOrigin {
  return {
    kind: AppBuilderSourceFragmentOriginKind.SourceLoweringTarget,
    targetKind: targetRef.kind,
    targetId: targetRef.id,
    surfaceKind: AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  };
}

function fragmentGalleryInputs(): readonly AppBuilderSuppliedInput[] {
  return [
    domainModelInput(fragmentGalleryDomainFields(), fragmentGalleryDomainActions(), fragmentGalleryDomainValueSets()),
    routingPolicyInput(),
    localStatePolicyInput(),
    controlAccessibilityInput('Gallery field'),
    visualClassHookInput(),
    collectionProjectionInput(fragmentGalleryCollectionDisplayFields(), fragmentGalleryCollectionTableColumns()),
    interactionFeedbackInput(fragmentGalleryActionFeedbackPayloads()),
  ];
}

function sourcePlanAppShellInputs(
  appName: string,
): readonly AppBuilderSuppliedInput[] {
  return [
    sourcePlacementInput(appName),
    conventionPolicyInput(),
  ];
}

function routerBackedListDetailInputs(
  appName: string,
): readonly AppBuilderSuppliedInput[] {
  return routeAreaInputs({
    appName,
    entityTitle: 'Item',
    entityTypeName: 'GalleryItem',
    collectionMemberName: 'items',
    identityMemberName: 'id',
    identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    routePath: 'items',
    routeParameter: 'itemId',
    fields: [
      {
        name: 'title',
        title: 'Title',
        valueKind: AppBuilderDomainFieldValueKind.Text,
        required: true,
      },
    ],
    actions: [],
    seedRecords: [
      { id: 1, title: 'Alpha' },
      { id: 2, title: 'Beta' },
    ],
  });
}

function projectRouteAreaInputs(
  appName: string,
): readonly AppBuilderSuppliedInput[] {
  return routeAreaInputs({
    appName,
    entityTitle: 'Project',
    entityTypeName: 'Project',
    collectionMemberName: 'projects',
    identityMemberName: 'id',
    identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    routePath: 'projects',
    routeParameter: 'projectId',
    fields: [
      {
        name: 'name',
        title: 'Name',
        valueKind: AppBuilderDomainFieldValueKind.Text,
        required: true,
      },
      {
        name: 'phase',
        title: 'Phase',
        valueKind: AppBuilderDomainFieldValueKind.Text,
      },
    ],
    actions: [
      {
        name: 'openProject',
        kind: AppBuilderDomainActionKind.Custom,
        scope: AppBuilderDomainActionScope.Navigation,
        targetEntityName: 'Project',
      },
    ],
    seedRecords: [
      { id: 1, name: 'Platform refresh', phase: 'Planning' },
      { id: 2, name: 'Docs cleanup', phase: 'Active' },
    ],
  });
}

function milestoneRouteAreaInputs(
  appName: string,
): readonly AppBuilderSuppliedInput[] {
  return routeAreaInputs({
    appName,
    entityTitle: 'Milestone',
    entityTypeName: 'Milestone',
    collectionMemberName: 'milestones',
    identityMemberName: 'id',
    identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    routePath: 'milestones',
    routeParameter: 'milestoneId',
    fields: [
      {
        name: 'title',
        title: 'Title',
        valueKind: AppBuilderDomainFieldValueKind.Text,
        required: true,
      },
      {
        name: 'targetDate',
        title: 'Target Date',
        valueKind: AppBuilderDomainFieldValueKind.Date,
      },
    ],
    actions: [
      {
        name: 'openMilestone',
        kind: AppBuilderDomainActionKind.Custom,
        scope: AppBuilderDomainActionScope.Navigation,
        targetEntityName: 'Milestone',
      },
    ],
    seedRecords: [
      { id: 1, title: 'Prototype review', targetDate: '2026-06-15' },
      { id: 2, title: 'Public preview', targetDate: '2026-07-01' },
    ],
  });
}

function routeAreaInputs(
  request: {
    readonly appName: string;
    readonly entityTitle: string;
    readonly entityTypeName: string;
    readonly collectionMemberName: string;
    readonly identityMemberName: string;
    readonly identityValueKind: AppBuilderDomainIdentityValueKind;
    readonly routePath: string;
    readonly routeParameter: string;
    readonly fields: readonly AppBuilderDomainFieldDescriptor[];
    readonly actions: readonly AppBuilderDomainActionDescriptor[];
    readonly seedRecords: readonly Record<string, unknown>[];
  },
): readonly AppBuilderSuppliedInput[] {
  return [
    domainModelInput(
      request.fields,
      request.actions,
      [],
      {
        entityTitle: request.entityTitle,
        entityTypeName: request.entityTypeName,
        collectionMemberName: request.collectionMemberName,
        identityMemberName: request.identityMemberName,
        identityValueKind: request.identityValueKind,
      },
    ),
    sourcePlacementInput(request.appName, [
      { key: SourcePatternParameterKey.ListRoutePath, value: request.routePath },
      { key: SourcePatternParameterKey.DetailRouteParameter, value: request.routeParameter },
    ]),
    {
      inputContractId: AppBuilderInputContractId.AureliaPolicy,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [
        {
          inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
          value: AppBuilderConventionPolicy.ConventionsEnabled,
        },
        {
          inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
          value: {
            routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
            areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
          },
        },
        {
          inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
          value: {
            appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
            domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
          },
        },
      ],
    },
    {
      inputContractId: AppBuilderInputContractId.SeedData,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        value: request.seedRecords,
      }],
    },
  ];
}

function diStateClassInputs(
  appName: string,
): readonly AppBuilderSuppliedInput[] {
  return [
    domainModelInput(
      [
        {
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
          required: true,
        },
        {
          name: 'enabled',
          title: 'Enabled',
          valueKind: AppBuilderDomainFieldValueKind.Boolean,
        },
      ],
      [],
      [],
      {
        entityTitle: 'State Item',
        entityTypeName: 'StateItem',
        collectionMemberName: 'items',
        identityMemberName: 'id',
        identityValueKind: AppBuilderDomainIdentityValueKind.Number,
      },
    ),
    sourcePlacementInput(appName, [], 'src/state-item-state.ts'),
    {
      inputContractId: AppBuilderInputContractId.SeedData,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        value: [
          { id: 1, title: 'Alpha', enabled: true },
          { id: 2, title: 'Beta', enabled: false },
        ],
      }],
    },
  ];
}

function localViewModelStateInputs(
  appName: string,
): readonly AppBuilderSuppliedInput[] {
  return [
    domainModelInput([
      {
        name: 'title',
        title: 'Title',
        valueKind: AppBuilderDomainFieldValueKind.Text,
        required: true,
      },
      {
        name: 'enabled',
        title: 'Enabled',
        valueKind: AppBuilderDomainFieldValueKind.Boolean,
      },
      {
        name: 'priority',
        title: 'Priority',
        valueKind: AppBuilderDomainFieldValueKind.Choice,
        options: [
          { value: 'low', title: 'Low' },
          { value: 'normal', title: 'Normal' },
          { value: 'urgent', title: 'Urgent' },
        ],
      },
      {
        name: 'tags',
        title: 'Tags',
        valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
        options: [
          { value: 'frontend', title: 'Frontend' },
          { value: 'backend', title: 'Backend' },
          { value: 'docs', title: 'Docs' },
        ],
      },
    ]),
    sourcePlacementInput(appName, [], 'src/local-state.ts', 'Local State'),
    {
      inputContractId: AppBuilderInputContractId.AureliaPolicy,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
        value: {
          localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
        },
      }],
    },
  ];
}

function serviceBackedLoadSaveInputs(
  appName: string,
): readonly AppBuilderSuppliedInput[] {
  return [
    domainModelInput(
      [
        {
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
          required: true,
        },
        {
          name: 'enabled',
          title: 'Enabled',
          valueKind: AppBuilderDomainFieldValueKind.Boolean,
        },
      ],
      [],
      [],
      {
        entityTitle: 'Gallery Item',
        entityTypeName: 'GalleryItem',
        collectionMemberName: 'galleryItems',
        identityMemberName: 'id',
        identityValueKind: AppBuilderDomainIdentityValueKind.Number,
      },
    ),
    sourcePlacementInput(appName, [], 'src/service-gallery.ts', 'Service Gallery'),
    conventionPolicyInput(),
    collectionProjectionInput(
      [
        {
          fieldName: 'title',
          role: AppBuilderCollectionDisplayRole.Title,
        },
        {
          fieldName: 'enabled',
          role: AppBuilderCollectionDisplayRole.Boolean,
        },
      ],
      [
        {
          fieldName: 'title',
          header: 'Title',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
        },
        {
          fieldName: 'enabled',
          header: 'Enabled',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
        },
      ],
    ),
    {
      inputContractId: AppBuilderInputContractId.SeedData,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        value: [
          { id: 1, title: 'Alpha', enabled: true },
          { id: 2, title: 'Beta', enabled: false },
        ],
      }],
    },
  ];
}

function domainModelInput(
  fields: readonly AppBuilderDomainFieldDescriptor[],
  actions: readonly AppBuilderDomainActionDescriptor[] = [],
  valueSets: readonly AppBuilderDomainValueSetDescriptor[] = [],
  entity?: {
    readonly entityTitle: string;
    readonly entityTypeName?: string;
    readonly collectionMemberName?: string;
    readonly identityMemberName?: string;
    readonly identityValueKind?: AppBuilderDomainIdentityValueKind;
  },
): AppBuilderSuppliedInput {
  return {
    inputContractId: AppBuilderInputContractId.DomainModel,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [
      ...(entity == null ? [] : [{
        inputFacetId: AppBuilderInputFacetId.DomainEntities,
        value: entity,
      }]),
      {
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: fields,
      },
      ...(actions.length === 0 ? [] : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]),
      ...(valueSets.length === 0 ? [] : [{
        inputFacetId: AppBuilderInputFacetId.DomainValueSets,
        value: valueSets,
      }]),
    ],
  };
}

function sourcePlacementInput(
  appName: string,
  sourcePatternParameterValues: readonly { readonly key: SourcePatternParameterKey; readonly value: string }[] = [],
  sourceTargetPath?: string,
  baseName?: string,
): AppBuilderSuppliedInput {
  const sourceNaming = {
    appName,
    ...(baseName == null ? {} : { baseName }),
    ...(sourcePatternParameterValues.length === 0 ? {} : { sourcePatternParameterValues }),
  };
  return {
    inputContractId: AppBuilderInputContractId.SourcePlacement,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [
      {
        inputFacetId: AppBuilderInputFacetId.SourceNaming,
        value: sourceNaming,
      },
      {
        inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
        value: { resourceCarrier: AppBuilderResourceCarrier.Convention },
      },
      ...(sourceTargetPath == null ? [] : [{
        inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
        value: sourceTargetPath,
      }]),
    ],
  };
}

function conventionPolicyInput(): AppBuilderSuppliedInput {
  return {
    inputContractId: AppBuilderInputContractId.AureliaPolicy,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
      value: AppBuilderConventionPolicy.ConventionsEnabled,
    }],
  };
}

function routingPolicyInput(): AppBuilderSuppliedInput {
  return {
    inputContractId: AppBuilderInputContractId.AureliaPolicy,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
      value: {
        routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
        areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
      },
    }],
  };
}

function localStatePolicyInput(): AppBuilderSuppliedInput {
  return {
    inputContractId: AppBuilderInputContractId.AureliaPolicy,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
      value: {
        localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
      },
    }],
  };
}

function controlAccessibilityInput(
  label: string,
): AppBuilderSuppliedInput {
  return {
    inputContractId: AppBuilderInputContractId.ControlAccessibility,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [
      {
        inputFacetId: AppBuilderInputFacetId.AccessibilityLabels,
        value: { label },
      },
      {
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Use a concise value.',
          errorText: 'A value is required.',
          statusText: 'Ready.',
        },
      },
    ],
  };
}

function visualClassHookInput(): AppBuilderSuppliedInput {
  return {
    inputContractId: AppBuilderInputContractId.VisualStyleInput,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
      value: [
        {
          target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
          classTokens: ['gallery-section'],
        },
        {
          target: AppBuilderSourceLoweringVisualHookTarget.FieldControl,
          classTokens: ['gallery-control'],
          dataAttributes: [{ name: 'data-au-role', value: 'gallery-control' }],
        },
        {
          target: AppBuilderSourceLoweringVisualHookTarget.Collection,
          classTokens: ['gallery-collection'],
        },
        {
          target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
          classTokens: ['gallery-table'],
        },
        {
          target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
          classTokens: ['gallery-status'],
        },
        {
          target: AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
          actionName: 'save',
          classTokens: ['gallery-action-status'],
        },
      ],
    }],
  };
}

function interactionFeedbackInput(
  actionFeedback: readonly AppBuilderSourceLoweringActionFeedbackPayload[],
): AppBuilderSuppliedInput {
  return {
    inputContractId: AppBuilderInputContractId.InteractionFeedback,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.ActionFeedback,
      value: actionFeedback,
    }],
  };
}

function collectionProjectionInput(
  displayFields: readonly AppBuilderCollectionDisplayFieldPayload[],
  tableColumns: readonly AppBuilderCollectionTableColumnPayload[],
): AppBuilderSuppliedInput {
  return {
    inputContractId: AppBuilderInputContractId.CollectionProjection,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [
      {
        inputFacetId: AppBuilderInputFacetId.CollectionDisplayFields,
        value: displayFields,
      },
      {
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        value: tableColumns,
      },
    ],
  };
}

function fragmentGalleryDomainFields(): readonly AppBuilderDomainFieldDescriptor[] {
  return [
    {
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      required: true,
    },
    {
      name: 'description',
      title: 'Description',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    },
    {
      name: 'quantity',
      title: 'Quantity',
      valueKind: AppBuilderDomainFieldValueKind.Number,
      numericConstraints: { minimum: 0, maximum: 10, step: 1 },
    },
    {
      name: 'dueDate',
      title: 'Due Date',
      valueKind: AppBuilderDomainFieldValueKind.Date,
    },
    {
      name: 'enabled',
      title: 'Enabled',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    },
    {
      name: 'priority',
      title: 'Priority',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      valueSetName: 'priorityOptions',
    },
    {
      name: 'labels',
      title: 'Labels',
      valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
      valueSetName: 'labelOptions',
    },
  ];
}

function fragmentGalleryDomainActions(): readonly AppBuilderDomainActionDescriptor[] {
  return [
    {
      name: 'save',
      kind: AppBuilderDomainActionKind.Save,
      mutatesState: true,
      inputFieldNames: ['title', 'description', 'quantity', 'dueDate', 'enabled', 'priority', 'labels'],
    },
    {
      name: 'selectItem',
      kind: AppBuilderDomainActionKind.Custom,
      scope: AppBuilderDomainActionScope.Entity,
      targetEntityName: 'GalleryItem',
      inputFieldNames: ['title'],
    },
    {
      name: 'openItem',
      kind: AppBuilderDomainActionKind.Custom,
      scope: AppBuilderDomainActionScope.Navigation,
      targetEntityName: 'GalleryItem',
    },
  ];
}

function fragmentGalleryActionFeedbackPayloads(): readonly AppBuilderSourceLoweringActionFeedbackPayload[] {
  return [{
    actionName: 'save',
    statusMemberName: 'saveStatusMessage',
    statusText: 'Saved gallery item.',
    statusId: 'gallery-save-status',
  }];
}

function fragmentGalleryDomainValueSets(): readonly AppBuilderDomainValueSetDescriptor[] {
  return [
    {
      name: 'priorityOptions',
      title: 'Priorities',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      options: [
        { value: 'low', title: 'Low' },
        { value: 'normal', title: 'Normal' },
        { value: 'urgent', title: 'Urgent' },
      ],
    },
    {
      name: 'labelOptions',
      title: 'Labels',
      valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
      options: [
        { value: 'frontend', title: 'Frontend' },
        { value: 'backend', title: 'Backend' },
        { value: 'docs', title: 'Docs' },
      ],
    },
  ];
}

function fragmentGalleryCollectionDisplayFields(): readonly AppBuilderCollectionDisplayFieldPayload[] {
  return [
    { fieldName: 'title', role: AppBuilderCollectionDisplayRole.Title, label: 'Title' },
    { fieldName: 'description', role: AppBuilderCollectionDisplayRole.Summary, label: 'Description' },
    { fieldName: 'priority', role: AppBuilderCollectionDisplayRole.Status, label: 'Priority' },
    { fieldName: 'dueDate', role: AppBuilderCollectionDisplayRole.Date, label: 'Due' },
  ];
}

function fragmentGalleryCollectionTableColumns(): readonly AppBuilderCollectionTableColumnPayload[] {
  return [
    {
      fieldName: 'title',
      header: 'Title',
      displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
      sortable: true,
    },
    {
      fieldName: 'quantity',
      header: 'Qty',
      displayKind: AppBuilderCollectionTableColumnDisplayKind.Number,
    },
    {
      actionName: 'save',
      header: 'Action',
      displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
    },
  ];
}

function sourceLoweringTargetRef(
  kind: AppBuilderOntologyRowKind,
  id: string,
): AppBuilderOntologyRowRef {
  const row = appBuilderTargetCatalog({
    sourceLoweringImplemented: true,
    includeInputReadiness: false,
  }).rows.find((candidate) =>
    candidate.targetRef.kind === kind
    && candidate.targetRef.id === id);
  if (row == null) {
    throw new Error(`No app-builder source-lowering target row found for '${kind}:${id}'.`);
  }
  return row.targetRef;
}

function expectedSourceLoweringTargetRefsByKey(): ReadonlyMap<string, AppBuilderOntologyRowRef> {
  return new Map(appBuilderTargetCatalog({
    sourceLoweringImplemented: true,
    includeInputReadiness: false,
  }).rows.map((row) => [appBuilderOntologyRowRefKey(row.targetRef), row.targetRef]));
}

function observedGalleryTargetRefsByKey(
  plans: readonly AppBuilderSourceLoweringGalleryPlan[],
): ReadonlyMap<string, { readonly targetRef: AppBuilderOntologyRowRef; readonly fixtureId: AppBuilderSourceLoweringGalleryFixtureId }> {
  const refs = new Map<string, { readonly targetRef: AppBuilderOntologyRowRef; readonly fixtureId: AppBuilderSourceLoweringGalleryFixtureId }>();
  for (const plan of plans) {
    for (const targetRef of plan.sourceLoweringTargetRefs) {
      refs.set(appBuilderOntologyRowRefKey(targetRef), { targetRef, fixtureId: plan.fixtureId });
    }
  }
  return refs;
}

function sourceLoweringTargetRefsFromSourcePlan(
  sourcePlan: SourcePlan,
): readonly AppBuilderOntologyRowRef[] {
  const refs = new Map<string, AppBuilderOntologyRowRef>();
  for (const file of sourcePlan.files) {
    for (const contribution of file.contributions) {
      const origin = contribution.origin;
      if (
        origin?.kind !== SourcePlanContributionOriginKind.AppBuilderSourceLoweringTarget
        && origin?.kind !== SourcePlanContributionOriginKind.AppBuilderSourceLoweringInvocation
        && origin?.kind !== SourcePlanContributionOriginKind.AppBuilderSourceLoweringComposition
      ) {
        continue;
      }
      const targetRef = sourceLoweringTargetRef(origin.targetKind as AppBuilderOntologyRowKind, origin.targetId);
      refs.set(appBuilderOntologyRowRefKey(targetRef), targetRef);
    }
  }
  return [...refs.values()];
}
