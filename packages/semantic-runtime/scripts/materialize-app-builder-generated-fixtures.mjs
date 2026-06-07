import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appBuilderGeneratedFixtureDetailRequest,
  appBuilderGeneratedFixturePublicResponseSnapshot,
  normalizeFixtureRootValue,
} from './app-builder-generated-fixture-snapshots.mjs';
import {
  AppBuilderAppStateOwnershipMode,
  AppBuilderApplicationPatternId,
  AppBuilderAreaNavigationPolicy,
  AppBuilderCollectionFeatureId,
  AppBuilderCollectionIdentityMode,
  AppBuilderCollectionIdentityUse,
  AppBuilderCollectionDisplayRole,
  AppBuilderCollectionTableColumnDisplayKind,
  AppBuilderConventionPolicy,
  AppBuilderControlPatternId,
  AppBuilderChoiceOptionBindingKind,
  AppBuilderDecisionBundleSource,
  AppBuilderDomainActionKind,
  AppBuilderDomainActionScope,
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainIdentityValueKind,
  AppBuilderDomainModelingMode,
  AppBuilderDomainRelationshipKind,
  AppBuilderDomainRelationshipLocalValueKind,
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
  AppBuilderOntologyDomain,
  AppBuilderOntologyRowKind,
  AppBuilderPolicySatisfactionSource,
  AppBuilderPolicySatisfactionState,
  AppBuilderResourceCarrier,
  AppBuilderRouterAdmissionPolicy,
  AppBuilderLocalStatePolicy,
  AppBuilderSourceLoweringAsyncDataMemberMutability,
  AppBuilderSourceLoweringButtonType,
  AppBuilderSourceLoweringRequestFieldId,
  AppBuilderServiceCollectionFilterPredicateKind,
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS,
  AppBuilderSourceLoweringCompositionKind,
  AppBuilderSourceLoweringMessageKind,
  AppBuilderSourceLoweringVisualHookTarget,
  APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeAppBuilderQueryKind,
  SourcePatternParameterKey,
  answerSemanticRuntimeAppBuilderQuery,
  appBuilderPolicySatisfactionForTarget,
  appBuilderPolicySatisfactionCandidateRow,
  appBuilderControlPatternIdForLeafControlId,
  appBuilderDomainFieldControlId,
  appBuilderRecommendationPolicyRows,
  appBuilderSourceLoweringRequestFieldRegistryCoverageRows,
  appBuilderSourceLoweringRequestFieldRegistryCoverageSummary,
  appBuilderSourceLoweringRequestFieldUsageRowsFromAppBuilderRequest,
  sourcePlanHasCompleteText,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const appBuilderFixtureRoot = path.join(packageRoot, 'fixtures/app-builder');
const recommendationPolicyRowsByTargetKey = new Map(
  appBuilderRecommendationPolicyRows(APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS)
    .map((row) => [ontologyTargetRefKey(row.targetRef), row]),
);

const GENERATED_APP_UNUSED_REQUEST_FIELD_REVIEW = new Map([
  [AppBuilderSourceLoweringRequestFieldId.BindingExpression, {
    reviewDisposition: 'covered-by-focused-pressure',
    summary: 'Direct one-target bindingExpression overrides are covered by the focused source-lowering pressure gallery; generated app forms usually bind through composed fieldBindingExpressions or field-name defaults.',
    nextReview: 'Only add a generated-app fixture when a realistic pattern needs a non-default direct control binding expression that is not better modeled as a composition field binding.',
  }],
  [AppBuilderSourceLoweringRequestFieldId.BindingRootExpression, {
    reviewDisposition: 'covered-by-generated-draft-object',
    summary: 'bindingRootExpression is covered by component-pair draft-object fixtures where local view-model state emits the receiver object consumed by composed native form bindings.',
    nextReview: 'Revisit with the edit-buffer/dirty-state application-design pattern; do not treat rooted draft-object coverage as full edit-buffer support.',
  }],
  [AppBuilderSourceLoweringRequestFieldId.MatcherExpression, {
    reviewDisposition: 'covered-by-object-relationship-fixture',
    summary: 'matcherExpression is covered by object-valued relationship controls in generated app fixtures; scalar value-set forms still avoid it when native value identity is sufficient.',
    nextReview: 'Revisit when multi-select object arrays or object-valued domain value sets become recommendable app-builder rungs.',
  }],
  [AppBuilderSourceLoweringRequestFieldId.RouteInstruction, {
    reviewDisposition: 'covered-by-focused-pressure',
    summary: 'routeInstruction is covered by the focused source-lowering pressure gallery through direct RouteNavigationAction invocation; generated cross-area relationship navigation currently spends routeBindingExpression because rooted dynamic URL expressions close better than eager route+params for sibling areas.',
    nextReview: 'Keep generated navigation caller-owned; add richer topology helpers only when app-builder needs to derive cross-area links from a declared route graph.',
  }],
  [AppBuilderSourceLoweringRequestFieldId.RouteParamsExpression, {
    reviewDisposition: 'covered-by-focused-pressure',
    summary: 'routeParamsExpression is covered by the focused source-lowering pressure gallery; generated RouterBackedListDetail fixtures derive params.bind from domain identity and route topology rather than asking the caller for a raw expression.',
    nextReview: 'Revisit when a generated app intentionally composes standalone navigation links that cannot derive params from a known router-backed row context.',
  }],
  [AppBuilderSourceLoweringRequestFieldId.RouteContextExpression, {
    reviewDisposition: 'covered-by-focused-pressure',
    summary: 'routeContextExpression is an optional router-load refinement covered by low-level part/source pressure rather than current generated app patterns.',
    nextReview: 'Add generated-app coverage only when nested route-context navigation becomes an application-design pattern, not as a standalone slot smoke.',
  }],
  [AppBuilderSourceLoweringRequestFieldId.RouteActiveExpression, {
    reviewDisposition: 'covered-by-focused-pressure',
    summary: 'routeActiveExpression is an optional router-load refinement covered by low-level part/source pressure rather than current generated app patterns.',
    nextReview: 'Add generated-app coverage when route active-state presentation becomes part of an app-builder navigation composition.',
  }],
  [AppBuilderSourceLoweringRequestFieldId.RouteTargetAttributeName, {
    reviewDisposition: 'covered-by-focused-pressure',
    summary: 'routeTargetAttributeName is an optional router-load refinement covered by low-level part/source pressure rather than current generated app patterns.',
    nextReview: 'Add generated-app coverage only when a concrete app pattern needs router-managed href projection onto a non-default attribute.',
  }],
  [AppBuilderSourceLoweringRequestFieldId.LinkText, {
    reviewDisposition: 'covered-by-focused-pressure',
    summary: 'linkText is covered by direct RouteNavigationAction pressure and by generated RouterBackedListDetail row-navigation actions when the caller selects an actionName.',
    nextReview: 'If linkText becomes unused again, inspect whether row-navigation action coverage regressed before adding a new fixture.',
  }],
]);

async function materializeGeneratedAppBuilderFixtures() {
  const fixtureIndexRows = [];
  for (const spec of generatedAppFixtureSpecs()) {
    const fixtureRoot = path.join(appBuilderFixtureRoot, spec.fixtureId);
    const materializedRequest = requestWithFixtureRoot(spec.request, fixtureRoot);
    const answer = answerSemanticRuntimeAppBuilderQuery(materializedRequest);
    const detailedAnswer = answerSemanticRuntimeAppBuilderQuery(
      appBuilderGeneratedFixtureDetailRequest(materializedRequest),
    );

    if (answer.outcome !== SemanticRuntimeAnswerOutcome.Hit || answer.value.sourcePlan == null) {
      console.error(`${spec.fixtureId}: source-lowering issues`, JSON.stringify(answer.value?.issues ?? [], null, 2));
      throw new Error(`${spec.fixtureId}: app-builder source lowering did not produce a complete SourcePlan: ${answer.summary}`);
    }
    if (!sourcePlanHasCompleteText(answer.value.sourcePlan)) {
      throw new Error(`${spec.fixtureId}: app-builder SourcePlan did not include complete file text.`);
    }
    if (detailedAnswer.outcome !== SemanticRuntimeAnswerOutcome.Hit || detailedAnswer.value.sourcePlan == null) {
      throw new Error(`${spec.fixtureId}: app-builder detailed verification query did not produce a complete SourcePlan: ${detailedAnswer.summary}`);
    }

    await resetGeneratedFixtureRoot(fixtureRoot);
    const appBuilderResponseSnapshot = appBuilderGeneratedFixturePublicResponseSnapshot(answer, spec.request, fixtureRoot);
    const semanticFixtureManifest = semanticFixtureManifestSnapshot(fixtureRoot, {
      fixtureId: spec.fixtureId,
      title: spec.title,
      description: spec.description,
      appBuilderRequestPath: 'app-builder-request.json',
      appBuilderResponsePath: 'app-builder-response.json',
      expectedEffects: detailedAnswer.value.expectedEffects,
      expectedEffectKinds: detailedAnswer.value.expectedEffectKinds,
      effectContractIds: detailedAnswer.value.effectContractIds,
      ontologyTargetRefs: detailedAnswer.value.sourceLoweringTargetRefs,
      controlUseInventoryRows: detailedAnswer.value.controlUseInventoryRows,
      sourcePlanWitnessRows: detailedAnswer.value.sourcePlanWitnessRows,
    });
    await writeJson(path.join(fixtureRoot, 'app-builder-request.json'), spec.request);
    await writeJson(path.join(fixtureRoot, 'app-builder-response.json'), appBuilderResponseSnapshot);
    await writeSourcePlan(fixtureRoot, answer.value.sourcePlan);
    await writeJson(path.join(fixtureRoot, 'semantic-fixture.json'), semanticFixtureManifest);
    fixtureIndexRows.push(generatedFixtureIndexRow(spec, detailedAnswer.value, {
      appBuilderRequestJsonByteCount: jsonSnapshotByteCount(spec.request),
      appBuilderResponseJsonByteCount: jsonSnapshotByteCount(appBuilderResponseSnapshot),
      semanticFixtureJsonByteCount: jsonSnapshotByteCount(semanticFixtureManifest),
    }));
    console.log(`${spec.fixtureId}: source=${answer.value.sourcePlan.files.length}, complete=${sourcePlanHasCompleteText(answer.value.sourcePlan)}`);
  }

  await writeGeneratedFixtureIndex(fixtureIndexRows);
}

function generatedAppFixtureSpecs() {
  return [
    {
      fixtureId: 'minimal-app-shell-convention',
      title: 'Minimal app shell with conventions enabled',
      description: 'Blank-slate app shell that spends explicit source placement, app naming, convention policy, and app-builder baseline project tooling.',
      request: sourcePlanQuery({
        rootDir: '.',
        sourceLoweringAppShell: {
          targetRef: appShellTargetRef(),
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('minimal-app-shell-decisions', 'minimal app shell explicit choices', [
            sourcePlacementDecision({
              appName: 'Aurelia App',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
          ])],
        },
      }),
    },
    {
      fixtureId: 'minimal-app-shell-decorator',
      title: 'Minimal app shell with explicit decorator metadata',
      description: 'Blank-slate app shell that spends explicit resource-declaration policy and a decorator carrier without multiplying the rest of the generated-app matrix.',
      request: sourcePlanQuery({
        rootDir: '.',
        sourceLoweringAppShell: {
          targetRef: appShellTargetRef(),
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('minimal-app-shell-decorator-decisions', 'minimal app shell explicit decorator choices', [
            sourcePlacementDecision({
              appName: 'Aurelia Decorator App',
              resourceCarrier: AppBuilderResourceCarrier.Decorator,
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ExplicitResourceDeclarations,
            }),
          ])],
        },
      }),
    },
    {
      fixtureId: 'application-assembly-projects-and-milestones',
      title: 'Application assembly with project, milestone, assignment, and review areas',
      description: 'Multi-area generated app that assembles routed project, milestone, relationship-backed assignment workflow, and object-valued review domains under one root router shell without duplicating startup, root navigation, or project tooling.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringApplicationAssembly: {
          targetRef: applicationAssemblyTargetRef(),
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('application-assembly-root-decisions', 'application assembly root explicit choices', [
            sourcePlacementDecision({
              appName: 'Project Milestone Hub',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
            }),
          ])],
          routeAreas: [{
            targetRef: routerBackedListDetailTargetRef(),
            primaryEntityName: 'Project',
            actionName: 'openProject',
            linkText: 'Open project',
            createForm: {
              actionName: 'createProject',
              fieldNames: ['name', 'phase'],
              submitButtonText: 'Create project',
            },
            detailRelatedCollections: [{
              relationshipName: 'project',
              title: 'Assignments',
              itemLocalName: 'taskItem',
              tableColumns: [{
                fieldName: 'title',
                header: 'Assignment',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
              }, {
                fieldName: 'done',
                header: 'Done',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
              }, {
                header: 'Open',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
                routeBindingExpression: "'/assignments/' + taskItem.id",
                linkText: 'Open assignment',
              }],
            }],
            decisionBundles: [explicitDecisionBundle('application-assembly-project-decisions', 'project route-area explicit choices', [
              projectAssignmentDomainDecision({
                actions: [
                  openProjectAction(),
                  createProjectAction(),
                ],
              }),
              sourcePlacementDecision({
                appName: 'Project Milestone Hub',
                resourceCarrier: AppBuilderResourceCarrier.Convention,
                sourcePatternParameterValues: [{
                  key: SourcePatternParameterKey.ListRoutePath,
                  value: 'projects',
                }, {
                  key: SourcePatternParameterKey.DetailRouteParameter,
                  value: 'projectId',
                }],
              }),
              aureliaPolicyDecision({
                conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
                routingPolicy: {
                  routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                  areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
                },
                statePolicy: {
                  appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                  domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
                },
              }),
              projectAssignmentSeedDataDecision(),
            ])],
          }, {
            targetRef: routerBackedListDetailTargetRef(),
            actionName: 'openMilestone',
            linkText: 'Open milestone',
            decisionBundles: [explicitDecisionBundle('application-assembly-milestone-decisions', 'milestone route-area explicit choices', [
              milestoneDomainDecision({
                actions: [openMilestoneAction()],
              }),
              sourcePlacementDecision({
                appName: 'Project Milestone Hub',
                resourceCarrier: AppBuilderResourceCarrier.Convention,
                sourcePatternParameterValues: [{
                  key: SourcePatternParameterKey.ListRoutePath,
                  value: 'milestones',
                }, {
                  key: SourcePatternParameterKey.DetailRouteParameter,
                  value: 'milestoneId',
                }],
              }),
              aureliaPolicyDecision({
                conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
                routingPolicy: {
                  routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                  areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
                },
                statePolicy: {
                  appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                  domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
                },
              }),
              seedDataDecision([{
                id: 1,
                title: 'Prototype review',
                targetDate: '2026-06-15',
              }, {
                id: 2,
                title: 'Public preview',
                targetDate: '2026-07-01',
              }]),
            ])],
          }, {
            targetRef: routerBackedListDetailTargetRef(),
            primaryEntityName: 'TaskItem',
            actionName: 'openTask',
            linkText: 'Open assignment',
            createForm: {
              actionName: 'create',
              fieldNames: ['title', 'done', 'projectId'],
              submitButtonText: 'Create assignment',
            },
            decisionBundles: [explicitDecisionBundle('application-assembly-assignment-decisions', 'assignment route-area explicit choices', [
              projectAssignmentDomainDecision({
                actions: [
                  openTaskAction(),
                  createTaskAction({ inputFieldNames: ['title', 'done', 'projectId'], targetEntityName: 'TaskItem' }),
                ],
              }),
              sourcePlacementDecision({
                appName: 'Project Milestone Hub',
                resourceCarrier: AppBuilderResourceCarrier.Convention,
                sourcePatternParameterValues: [{
                  key: SourcePatternParameterKey.ListRoutePath,
                  value: 'assignments',
                }, {
                  key: SourcePatternParameterKey.DetailRouteParameter,
                  value: 'taskId',
                }],
              }),
              aureliaPolicyDecision({
                conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
                routingPolicy: {
                  routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                  areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
                },
                statePolicy: {
                  appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                  domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
                },
              }),
              collectionProjectionDecision([{
                fieldName: 'title',
                header: 'Title',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
              }, {
                relationshipName: 'project',
                header: 'Project',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
                routeBindingExpression: "'/projects/' + taskItem.projectId",
              }, {
                fieldName: 'done',
                header: 'Done',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
              }, {
                actionName: 'openTask',
                header: 'Open',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
              }]),
              interactionFeedbackDecision([{
                actionName: 'create',
                statusMemberName: 'createStatusMessage',
                statusText: 'Assignment saved.',
                statusId: 'assignment-create-status',
              }]),
              projectAssignmentSeedDataDecision(),
            ])],
          }, {
            targetRef: routerBackedListDetailTargetRef(),
            actionName: 'openReview',
            linkText: 'Open review',
            createForm: {
              actionName: 'createReview',
              fieldNames: ['title', 'done', 'reviewer'],
              submitButtonText: 'Create review',
            },
            serviceCollection: {
              sourceTargetPath: 'src/services/review-assignment-service.ts',
              serviceClassName: 'ReviewAssignmentService',
              loadMethodName: 'loadReviews',
              findMethodName: 'loadReview',
              createMethodName: 'createReview',
            },
            decisionBundles: [explicitDecisionBundle('application-assembly-review-decisions', 'review route-area explicit choices', [
              reviewObjectAssigneeDomainDecision({
                actions: [
                  {
                    name: 'openReview',
                    kind: AppBuilderDomainActionKind.Custom,
                    scope: AppBuilderDomainActionScope.Navigation,
                    targetEntityName: 'ReviewItem',
                  },
                  {
                    name: 'createReview',
                    kind: AppBuilderDomainActionKind.Create,
                    scope: AppBuilderDomainActionScope.Form,
                    targetEntityName: 'ReviewItem',
                    inputFieldNames: ['title', 'done', 'reviewer'],
                    mutatesState: true,
                  },
                ],
              }),
              sourcePlacementDecision({
                appName: 'Project Milestone Hub',
                resourceCarrier: AppBuilderResourceCarrier.Convention,
                sourcePatternParameterValues: [{
                  key: SourcePatternParameterKey.ListRoutePath,
                  value: 'reviews',
                }, {
                  key: SourcePatternParameterKey.DetailRouteParameter,
                  value: 'reviewId',
                }],
              }),
              aureliaPolicyDecision({
                conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
                routingPolicy: {
                  routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                  areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
                },
                statePolicy: {
                  appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                  domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
                },
              }),
              collectionProjectionDecision([{
                fieldName: 'title',
                header: 'Review',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
              }, {
                relationshipName: 'reviewer',
                header: 'Reviewer',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
              }, {
                fieldName: 'done',
                header: 'Done',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
              }, {
                actionName: 'openReview',
                header: 'Open',
                displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
              }]),
              interactionFeedbackDecision([{
                actionName: 'createReview',
                statusMemberName: 'createReviewStatusMessage',
                statusText: 'Review saved.',
                statusId: 'review-create-status',
              }]),
              seedDataDecision([{
                entityName: 'ReviewItem',
                records: [{
                  id: 1,
                  title: 'Architecture review',
                  done: false,
                  reviewer: 'ada',
                }, {
                  id: 2,
                  title: 'Launch checklist review',
                  done: true,
                  reviewer: 'grace',
                }],
              }, {
                entityName: 'ReviewerProfile',
                records: [{
                  reviewerId: 'ada',
                  displayName: 'Ada Lovelace',
                  email: 'ada@example.test',
                }, {
                  reviewerId: 'grace',
                  displayName: 'Grace Hopper',
                  email: 'grace@example.test',
                }],
              }]),
            ])],
          }],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-browser',
      title: 'Router-backed task browser',
      description: 'Small routed collection/detail app that spends caller domain fields, seed records, a reference-one relationship, router policy, DI state ownership, and convention-backed source placement.',
      request: sourcePlanQuery({
        rootDir: '.',
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-browser-decisions', 'task browser explicit choices', [
            taskBrowserRelationshipDomainDecision({
              actions: [openTaskAction()],
            }),
            sourcePlacementDecision({
              appName: 'Task Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'tasks',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Plan the release checklist',
                done: false,
                assigneeId: 'ada',
              }, {
                id: 2,
                title: 'Publish the onboarding guide',
                done: true,
                assigneeId: 'grace',
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-create-browser',
      title: 'Router-backed task browser with create form',
      description: 'Routed collection/detail app that combines list/detail navigation with a list-route native create form and DI state mutation over caller-selected scalar fields.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'done'],
            submitButtonText: 'Create task',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-create-browser-decisions', 'task browser create form explicit choices', [
            taskDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'done'] }),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Task Create Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-create',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              id: 1,
              title: 'Plan the release checklist',
              done: false,
            }, {
              id: 2,
              title: 'Publish the onboarding guide',
              done: true,
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-browser',
      title: 'Router-backed task browser with service boundary',
      description: 'Routed collection/detail app that keeps list/detail navigation and native creation while generated DI state delegates load, detail lookup, and create operations through a service boundary.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'done'],
            submitButtonText: 'Create task',
          },
          serviceCollection: {},
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-browser-decisions', 'task service browser explicit choices', [
            taskDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'done'] }),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Task Service Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              id: 1,
              title: 'Plan the release checklist',
              done: false,
            }, {
              id: 2,
              title: 'Publish the onboarding guide',
              done: true,
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-vocabulary-browser',
      title: 'Router-backed task browser with explicit service vocabulary and create feedback',
      description: 'Routed collection/detail app that preserves caller-supplied service class, file, load, detail lookup, and create method names while displaying caller-supplied create feedback after the service-backed create promise resolves.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'done'],
            submitButtonText: 'Create task',
          },
          serviceCollection: {
            sourceTargetPath: 'src/api/task-repository.ts',
            serviceClassName: 'TaskRepository',
            loadMethodName: 'fetchTaskItems',
            findMethodName: 'readTaskItem',
            createMethodName: 'addTaskItem',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-vocabulary-browser-decisions', 'task service vocabulary browser explicit choices', [
            taskDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'done'] }),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Task Service Vocabulary Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-vocabulary',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              id: 1,
              title: 'Prepare onboarding checklist',
              done: false,
            }, {
              id: 2,
              title: 'Send invoice reminder',
              done: false,
            }]),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-create-status',
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-search-browser',
      title: 'Router-backed task browser with service-backed search',
      description: 'Routed collection/detail app that combines route navigation, a generated service text filter, list-route query controls, promise-backed table loading, and caller-supplied search/clear feedback.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          serviceCollection: {
            sourceTargetPath: 'src/services/task-search-service.ts',
            serviceClassName: 'TaskSearchService',
            loadMethodName: 'loadTaskItems',
            findMethodName: 'loadTaskItem',
            filterMethods: [{
              methodName: 'searchTaskItemsByTitle',
              fieldName: 'title',
              parameterName: 'query',
              predicateKind: AppBuilderServiceCollectionFilterPredicateKind.TextContains,
            }],
            queryControls: [{
              stateMemberName: 'taskItemTitleQuery',
              stateTypeText: 'string',
              initialValueExpression: "''",
              inactiveValueExpression: "''",
              reloadMethodName: 'reloadTaskItemsByTitle',
              resultMemberName: 'taskItemsPromise',
              filterMethodName: 'searchTaskItemsByTitle',
              fieldControlId: 'task-search-query',
              labelText: 'Search tasks',
              applyActionName: 'searchTaskItems',
              applyButtonText: 'Search tasks',
              clearActionName: 'clearTaskItemSearch',
              clearButtonText: 'Clear search',
            }],
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-search-browser-decisions', 'task service search browser explicit choices', [
            taskDomainDecision({
              actions: [
                openTaskAction(),
                searchTaskItemsAction(),
                clearTaskItemSearchAction(),
              ],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Service Search Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-search',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            interactionFeedbackDecision([{
              actionName: 'searchTaskItems',
              statusMemberName: 'searchStatusMessage',
              statusText: 'Search applied.',
              statusId: 'task-search-status',
            }, {
              actionName: 'clearTaskItemSearch',
              statusMemberName: 'clearSearchStatusMessage',
              statusText: 'Search cleared.',
              statusId: 'task-clear-search-status',
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Search routed tasks',
              done: false,
            }, {
              id: 2,
              title: 'Review generated service query',
              done: true,
            }, {
              id: 3,
              title: 'Clear task search',
              done: false,
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-create-options-browser',
      title: 'Router-backed task browser with finite-option create form',
      description: 'Routed collection/detail app that extends list-route creation from scalar fields into finite choice and choice-set fields backed by field-local options and DomainValueSets.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'priority', 'labels'],
            submitButtonText: 'Create task',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-create-options-browser-decisions', 'task finite-option create form explicit choices', [
            taskCreateOptionsDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'priority', 'labels'] }),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Task Create Options Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-create-options',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              id: 1,
              title: 'Review release notes',
              priority: 'normal',
              labels: ['docs'],
            }, {
              id: 2,
              title: 'Prepare issue triage',
              priority: 'urgent',
              labels: ['frontend', 'review'],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-create-assignment-browser',
      title: 'Router-backed task browser with relationship create form',
      description: 'Routed collection/detail app that extends list-route creation into reference-one and reference-many relationships by selecting identities from related contact state.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'assigneeId', 'reviewerIds'],
            submitButtonText: 'Create task',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-create-assignment-browser-decisions', 'task relationship create form explicit choices', [
            taskBrowserRelationshipDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'assigneeId', 'reviewerIds'] }),
              ],
              includeReviewers: true,
            }),
            sourcePlacementDecision({
              appName: 'Task Create Assignment Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-create-assignments',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Plan the release checklist',
                done: false,
                assigneeId: 'ada',
                reviewerIds: ['ada', 'grace'],
              }, {
                id: 2,
                title: 'Publish the onboarding guide',
                done: true,
                assigneeId: 'grace',
                reviewerIds: ['ada'],
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-assignment-table-browser',
      title: 'Router-backed task assignment table browser',
      description: 'Routed collection/detail app that composes relationship-backed create controls, relationship table columns, and route navigation into one generated assignment workflow.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'assigneeId', 'reviewerIds'],
            submitButtonText: 'Create task',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-assignment-table-browser-decisions', 'task assignment table explicit choices', [
            taskBrowserRelationshipDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'assigneeId', 'reviewerIds'] }),
              ],
              includeReviewers: true,
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Assignment Table Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-assignment-table',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Review the assignment flow',
                done: false,
                assigneeId: 'ada',
                reviewerIds: ['ada', 'grace'],
              }, {
                id: 2,
                title: 'Publish the handoff notes',
                done: true,
                assigneeId: 'grace',
                reviewerIds: ['ada'],
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-object-assignment-table-browser',
      title: 'Router-backed task object assignment table browser',
      description: 'Routed collection/detail app that spends an object-valued reference-one assignee relationship through domain construction, model-bound create select, matcher expression, relationship table labels, route navigation, DI state ownership, and caller-supplied create feedback.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'done', 'assignee'],
            submitButtonText: 'Create task',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-object-assignment-table-browser-decisions', 'task object assignment table explicit choices', [
            taskObjectAssigneeRelationshipDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'done', 'assignee'] }),
              ],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Object Assignment Table Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-object-assignments',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task assignment saved.',
              statusId: 'task-object-assignment-create-status',
            }]),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Review the assignment flow',
                done: false,
                assignee: 'ada',
              }, {
                id: 2,
                title: 'Publish the handoff notes',
                done: true,
                assignee: 'grace',
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-object-assignment-table-browser',
      title: 'Router-backed task service object assignment table browser',
      description: 'Routed collection/detail app that spends an object-valued reference-one assignee relationship through a service-backed collection boundary, model-bound create select, matcher expression, relationship table labels, route navigation, DI state ownership, and caller-supplied create feedback.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'done', 'assignee'],
            submitButtonText: 'Create task',
          },
          serviceCollection: {
            sourceTargetPath: 'src/services/task-object-assignment-service.ts',
            serviceClassName: 'TaskObjectAssignmentService',
            loadMethodName: 'loadAssignedTasks',
            findMethodName: 'loadAssignedTask',
            createMethodName: 'addAssignedTask',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-object-assignment-table-browser-decisions', 'task service object assignment table explicit choices', [
            taskObjectAssigneeRelationshipDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'done', 'assignee'] }),
              ],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Service Object Assignment Table Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-object-assignments',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task assignment saved.',
              statusId: 'task-service-object-assignment-create-status',
            }]),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Review the assignment flow',
                done: false,
                assignee: 'ada',
              }, {
                id: 2,
                title: 'Publish the handoff notes',
                done: true,
                assignee: 'grace',
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-object-reviewers-table-browser',
      title: 'Router-backed task service object reviewers table browser',
      description: 'Routed collection/detail app that spends an object-valued reference-many reviewers relationship through a service-backed collection boundary, model-bound create multi-select, matcher expression, relationship table labels, route navigation, DI state ownership, and caller-supplied create feedback.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'done', 'reviewers'],
            submitButtonText: 'Create task',
          },
          serviceCollection: {
            sourceTargetPath: 'src/services/task-object-reviewers-service.ts',
            serviceClassName: 'TaskObjectReviewersService',
            loadMethodName: 'loadReviewedTasks',
            findMethodName: 'loadReviewedTask',
            createMethodName: 'addReviewedTask',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-object-reviewers-table-browser-decisions', 'task service object reviewers table explicit choices', [
            taskObjectReviewersRelationshipDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'done', 'reviewers'] }),
              ],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Service Object Reviewers Table Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-object-reviewers',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task reviewers saved.',
              statusId: 'task-service-object-reviewers-create-status',
            }]),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Review the assignment flow',
                done: false,
                reviewers: ['ada', 'grace'],
              }, {
                id: 2,
                title: 'Publish the handoff notes',
                done: true,
                reviewers: ['grace'],
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-assignment-table-browser',
      title: 'Router-backed task assignment table browser with service boundary and create feedback',
      description: 'Routed collection/detail app that combines explicit service vocabulary, service-backed creation, relationship-backed create controls, relationship table columns, route navigation, and caller-supplied create feedback.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'assigneeId', 'reviewerIds'],
            submitButtonText: 'Create task',
          },
          serviceCollection: {
            sourceTargetPath: 'src/services/task-assignment-service.ts',
            serviceClassName: 'TaskAssignmentService',
            loadMethodName: 'loadAssignedTasks',
            findMethodName: 'loadAssignedTask',
            createMethodName: 'addAssignedTask',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-assignment-table-browser-decisions', 'task service assignment table explicit choices', [
            taskBrowserRelationshipDomainDecision({
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'assigneeId', 'reviewerIds'] }),
              ],
              includeReviewers: true,
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Service Assignment Table Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-assignment-table',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task assignment saved.',
              statusId: 'task-assignment-create-status',
            }]),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Review the assignment flow',
                done: false,
                assigneeId: 'ada',
                reviewerIds: ['ada', 'grace'],
              }, {
                id: 2,
                title: 'Publish the handoff notes',
                done: true,
                assigneeId: 'grace',
                reviewerIds: ['ada'],
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-relationship-overview-browser',
      title: 'Router-backed task relationship overview browser',
      description: 'Routed collection/detail app that spends reference-one, reference-many, owns-one, owns-many, and nested value-object relationships together through routed table columns, detail labels, DI state ownership, and grouped seed data.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-routed-relationship-overview-browser-decisions', 'task routed relationship overview browser explicit choices', [
            taskRelationshipOverviewDomainDecision({
              actions: [openTaskAction()],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'schedule',
              header: 'Schedule',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'checkpoints',
              header: 'Checkpoints',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'effort',
              header: 'Effort',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Relationship Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-relationships',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            taskRelationshipOverviewSeedDataDecision(),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-relationship-overview-browser',
      title: 'Router-backed task service relationship overview browser',
      description: 'Routed collection/detail app that spends reference-one, reference-many, owns-one, owns-many, and nested value-object relationships together through a generated service boundary, routed table columns, detail labels, DI state ownership, and grouped seed data.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          serviceCollection: {
            sourceTargetPath: 'src/services/task-relationship-service.ts',
            serviceClassName: 'TaskRelationshipService',
            loadMethodName: 'loadTaskRelationships',
            findMethodName: 'loadTaskRelationship',
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-relationship-overview-browser-decisions', 'task service relationship overview browser explicit choices', [
            taskRelationshipOverviewDomainDecision({
              actions: [openTaskAction()],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'schedule',
              header: 'Schedule',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'checkpoints',
              header: 'Checkpoints',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'effort',
              header: 'Effort',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Service Relationship Overview Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-relationships',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            taskRelationshipOverviewSeedDataDecision(),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-relationship-search-browser',
      title: 'Router-backed task service relationship search browser',
      description: 'Routed collection/detail app that combines relationship-rich task/domain display, service-backed title search, query controls, integration feedback, route navigation, DI state ownership, and grouped seed data.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          serviceCollection: {
            sourceTargetPath: 'src/services/task-relationship-search-service.ts',
            serviceClassName: 'TaskRelationshipSearchService',
            loadMethodName: 'loadTaskRelationships',
            findMethodName: 'loadTaskRelationship',
            filterMethods: [{
              methodName: 'searchTaskRelationshipsByTitle',
              fieldName: 'title',
              parameterName: 'query',
              predicateKind: AppBuilderServiceCollectionFilterPredicateKind.TextContains,
            }],
            queryControls: [{
              stateMemberName: 'taskRelationshipTitleQuery',
              stateTypeText: 'string',
              initialValueExpression: "''",
              inactiveValueExpression: "''",
              reloadMethodName: 'reloadTaskRelationshipsByTitle',
              resultMemberName: 'taskItemsPromise',
              filterMethodName: 'searchTaskRelationshipsByTitle',
              fieldControlId: 'task-relationship-search-query',
              labelText: 'Search task relationships',
              applyActionName: 'searchTaskRelationships',
              applyButtonText: 'Search task relationships',
              clearActionName: 'clearTaskRelationshipSearch',
              clearButtonText: 'Clear search',
            }],
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-relationship-search-browser-decisions', 'task service relationship search browser explicit choices', [
            taskRelationshipOverviewDomainDecision({
              actions: [
                openTaskAction(),
                {
                  ...searchTaskItemsAction(),
                  name: 'searchTaskRelationships',
                },
                {
                  ...clearTaskItemSearchAction(),
                  name: 'clearTaskRelationshipSearch',
                },
              ],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'schedule',
              header: 'Schedule',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'checkpoints',
              header: 'Checkpoints',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'effort',
              header: 'Effort',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Service Relationship Search Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-relationship-search',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            interactionFeedbackDecision([{
              actionName: 'searchTaskRelationships',
              statusMemberName: 'searchStatusMessage',
              statusText: 'Search applied.',
              statusId: 'task-relationship-search-status',
            }, {
              actionName: 'clearTaskRelationshipSearch',
              statusMemberName: 'clearSearchStatusMessage',
              statusText: 'Search cleared.',
              statusId: 'task-relationship-clear-search-status',
            }]),
            taskRelationshipOverviewSeedDataDecision(),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-relationship-search-create-browser',
      title: 'Router-backed task service relationship search and create browser',
      description: 'Routed collection/detail app that combines relationship-rich task display, service-backed title search, native create submission, reference relationship controls, action feedback, route navigation, DI state ownership, and grouped seed data without generating nested edit-buffer semantics.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'done', 'assigneeId', 'reviewerIds'],
            submitButtonText: 'Create task',
          },
          serviceCollection: {
            sourceTargetPath: 'src/services/task-relationship-search-create-service.ts',
            serviceClassName: 'TaskRelationshipSearchCreateService',
            loadMethodName: 'loadTaskRelationships',
            findMethodName: 'loadTaskRelationship',
            createMethodName: 'createTaskRelationship',
            filterMethods: [{
              methodName: 'searchTaskRelationshipsByTitle',
              fieldName: 'title',
              parameterName: 'query',
              predicateKind: AppBuilderServiceCollectionFilterPredicateKind.TextContains,
            }],
            queryControls: [{
              stateMemberName: 'taskRelationshipTitleQuery',
              stateTypeText: 'string',
              initialValueExpression: "''",
              inactiveValueExpression: "''",
              reloadMethodName: 'reloadTaskRelationshipsByTitle',
              resultMemberName: 'taskItemsPromise',
              filterMethodName: 'searchTaskRelationshipsByTitle',
              fieldControlId: 'task-relationship-search-query',
              labelText: 'Search task relationships',
              applyActionName: 'searchTaskRelationships',
              applyButtonText: 'Search task relationships',
              clearActionName: 'clearTaskRelationshipSearch',
              clearButtonText: 'Clear search',
            }],
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-relationship-search-create-browser-decisions', 'task service relationship search create browser explicit choices', [
            taskRelationshipOverviewDomainDecision({
              optionalEmbeddedRelationships: true,
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'done', 'assigneeId', 'reviewerIds'] }),
                {
                  ...searchTaskItemsAction(),
                  name: 'searchTaskRelationships',
                },
                {
                  ...clearTaskItemSearchAction(),
                  name: 'clearTaskRelationshipSearch',
                },
              ],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'schedule',
              header: 'Schedule',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'checkpoints',
              header: 'Checkpoints',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'effort',
              header: 'Effort',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Service Relationship Search Create Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-relationship-search-create',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            interactionFeedbackDecision([{
              actionName: 'searchTaskRelationships',
              statusMemberName: 'searchStatusMessage',
              statusText: 'Search applied.',
              statusId: 'task-relationship-search-status',
            }, {
              actionName: 'clearTaskRelationshipSearch',
              statusMemberName: 'clearSearchStatusMessage',
              statusText: 'Search cleared.',
              statusId: 'task-relationship-clear-search-status',
            }, {
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task relationship saved.',
              statusId: 'task-relationship-create-status',
            }]),
            taskRelationshipOverviewSeedDataDecision(),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-service-relationship-search-create-complete-browser',
      title: 'Router-backed task service relationship search, create, and complete browser',
      description: 'Routed collection/detail app that combines relationship-rich task display, service-backed title search, native create submission, and an entity-scoped complete row command through an explicit service update method.',
      request: sourcePlanQuery({
        rootDir: '.',
        includeControlUseInventoryRows: true,
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          createForm: {
            actionName: 'create',
            fieldNames: ['title', 'done', 'assigneeId', 'reviewerIds'],
            submitButtonText: 'Create task',
          },
          serviceCollection: {
            sourceTargetPath: 'src/services/task-relationship-search-create-complete-service.ts',
            serviceClassName: 'TaskRelationshipSearchCreateCompleteService',
            loadMethodName: 'loadTaskRelationships',
            findMethodName: 'loadTaskRelationship',
            createMethodName: 'createTaskRelationship',
            filterMethods: [{
              methodName: 'searchTaskRelationshipsByTitle',
              fieldName: 'title',
              parameterName: 'query',
              predicateKind: AppBuilderServiceCollectionFilterPredicateKind.TextContains,
            }],
            updateMethods: [{
              methodName: 'completeTaskRelationship',
              inputFieldNames: ['done'],
            }],
            queryControls: [{
              stateMemberName: 'taskRelationshipTitleQuery',
              stateTypeText: 'string',
              initialValueExpression: "''",
              inactiveValueExpression: "''",
              reloadMethodName: 'reloadTaskRelationshipsByTitle',
              resultMemberName: 'taskItemsPromise',
              filterMethodName: 'searchTaskRelationshipsByTitle',
              fieldControlId: 'task-relationship-search-query',
              labelText: 'Search task relationships',
              applyActionName: 'searchTaskRelationships',
              applyButtonText: 'Search task relationships',
              clearActionName: 'clearTaskRelationshipSearch',
              clearButtonText: 'Clear search',
            }],
          },
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-service-relationship-search-create-complete-browser-decisions', 'task service relationship search create complete browser explicit choices', [
            taskRelationshipOverviewDomainDecision({
              optionalEmbeddedRelationships: true,
              actions: [
                openTaskAction(),
                createTaskAction({ inputFieldNames: ['title', 'done', 'assigneeId', 'reviewerIds'] }),
                completeTaskAction(),
                {
                  ...searchTaskItemsAction(),
                  name: 'searchTaskRelationships',
                },
                {
                  ...clearTaskItemSearchAction(),
                  name: 'clearTaskRelationshipSearch',
                },
              ],
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'complete',
              header: 'Complete',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Service Relationship Search Create Complete Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-service-relationship-search-create-complete',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            interactionFeedbackDecision([{
              actionName: 'searchTaskRelationships',
              statusMemberName: 'searchStatusMessage',
              statusText: 'Search applied.',
              statusId: 'task-relationship-search-status',
            }, {
              actionName: 'clearTaskRelationshipSearch',
              statusMemberName: 'clearSearchStatusMessage',
              statusText: 'Search cleared.',
              statusId: 'task-relationship-clear-search-status',
            }, {
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task relationship saved.',
              statusId: 'task-relationship-create-status',
            }]),
            taskRelationshipOverviewSeedDataDecision(),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-review-browser',
      title: 'Router-backed task review browser',
      description: 'Small routed collection/detail app that spends reference-one and reference-many labels against the same related contact collection while preserving explicit route navigation and DI state ownership.',
      request: sourcePlanQuery({
        rootDir: '.',
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-review-browser-decisions', 'task review browser explicit choices', [
            taskBrowserRelationshipDomainDecision({
              actions: [openTaskAction()],
              includeReviewers: true,
            }),
            sourcePlacementDecision({
              appName: 'Task Review Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-reviews',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Plan the release checklist',
                done: false,
                assigneeId: 'ada',
                reviewerIds: ['ada', 'grace'],
              }, {
                id: 2,
                title: 'Publish the onboarding guide',
                done: true,
                assigneeId: 'grace',
                reviewerIds: ['ada'],
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-task-table-browser',
      title: 'Router-backed task table browser',
      description: 'Routed collection/detail app whose list route spends explicit table columns, source-spent relationship labels, and a navigation-scoped action column against real generated route topology.',
      request: sourcePlanQuery({
        rootDir: '.',
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          actionName: 'openTask',
          linkText: 'Open',
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-table-browser-decisions', 'task table browser explicit choices', [
            taskBrowserRelationshipDomainDecision({
              actions: [openTaskAction()],
              includeReviewers: true,
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              actionName: 'openTask',
              header: 'Action',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            sourcePlacementDecision({
              appName: 'Task Table Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'task-table',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'taskId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Plan the release checklist',
                done: false,
                assigneeId: 'ada',
                reviewerIds: ['ada', 'grace'],
              }, {
                id: 2,
                title: 'Publish the onboarding guide',
                done: true,
                assigneeId: 'grace',
                reviewerIds: ['ada'],
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'router-backed-note-browser-string-id',
      title: 'Router-backed note browser with string identity',
      description: 'Small routed collection/detail app that proves explicit string identities typecheck while route params remain string-valued at the router boundary.',
      request: sourcePlanQuery({
        rootDir: '.',
        sourceLoweringRouterBackedListDetail: {
          targetRef: routerBackedListDetailTargetRef(),
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('note-browser-decisions', 'note browser explicit choices', [
            noteDomainDecision(),
            sourcePlacementDecision({
              appName: 'Note Browser',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourcePatternParameterValues: [{
                key: SourcePatternParameterKey.ListRoutePath,
                value: 'notes',
              }, {
                key: SourcePatternParameterKey.DetailRouteParameter,
                value: 'noteId',
              }],
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
                domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
              },
            }),
            seedDataDecision([{
              code: 'note-alpha',
              title: 'Project kickoff notes',
              archived: false,
            }, {
              code: 'note-beta',
              title: 'Archived deployment notes',
              archived: true,
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'di-state-task-state',
      title: 'DI task state class',
      description: 'Standalone DI state-class SourcePlan that spends caller domain fields, seed records, and explicit TypeScript source placement without app-shell or router wiring.',
      request: sourcePlanQuery({
        rootDir: '.',
        sourceTargetPath: 'src/task-state.ts',
        sourceLoweringDiStateClass: {
          targetRef: diStateClassTargetRef(),
          includePreflight: true,
          decisionBundles: [explicitDecisionBundle('task-state-class-decisions', 'task state class explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task State',
              sourceTargetPath: 'src/task-state.ts',
            }),
            seedDataDecision([{
              id: 1,
              title: 'Prepare project outline',
              done: false,
            }, {
              id: 2,
              title: 'Confirm team schedule',
              done: true,
            }]),
          ])],
        },
      }),
    },
    {
      fixtureId: 'component-pair-contact-card-string-id',
      title: 'Component-pair contact card collection with string identity',
      description: 'Runnable app shell assembled from a non-task contact domain, string identity seed records, explicit local collection state, and card display-field inputs.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/contact-cards.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('contact-card-component-decisions', 'contact card component explicit choices', [
            contactDomainDecision(),
            sourcePlacementDecision({
              appName: 'Contact Cards',
              baseName: 'Contact Cards',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/contact-cards.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionDisplayProjectionDecision([{
              fieldName: 'fullName',
              role: AppBuilderCollectionDisplayRole.Title,
              label: 'Contact',
            }, {
              fieldName: 'email',
              role: AppBuilderCollectionDisplayRole.Summary,
              label: 'Email',
            }, {
              fieldName: 'active',
              role: AppBuilderCollectionDisplayRole.Boolean,
              label: 'Active',
            }]),
            seedDataDecision([{
              contactId: 'contact-alex',
              fullName: 'Alex Morgan',
              email: 'alex@example.com',
              active: true,
            }, {
              contactId: 'contact-riley',
              fullName: 'Riley Chen',
              email: 'riley@example.com',
              active: false,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionCardTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionCard,
            collectionExpression: 'contacts',
            itemLocalName: 'contact',
            emptyStateText: 'No contacts yet.',
            emptyStateConditionExpression: 'contacts.length === 0',
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-draft-app-shell',
      title: 'Component-pair task draft app shell',
      description: 'Runnable app shell assembled from component-pair source lowering, local view-model state, a native submit form, and an explicit form-save command.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-draft.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-draft-component-decisions', 'task draft component explicit choices', [
            taskDomainDecision({
              actions: [saveDraftAction({
                inputFieldNames: ['title', 'done'],
              })],
            }),
            sourcePlacementDecision({
              appName: 'Task Draft',
              baseName: 'Task Draft',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-draft.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: nativeSubmitFormTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
            fieldNames: ['title', 'done'],
            actionName: 'saveDraft',
            submitButtonText: 'Save draft',
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'saveDraft',
            methodBodyStatements: 'this.title = this.title.trim();',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-section-create-and-table',
      title: 'Component-pair task section with create form and table',
      description: 'Runnable app shell assembled from app-section source lowering, local scalar and collection state, a native submit form, a table projection, caller seed records, and derived local create behavior.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-section-component-decisions', 'task section component explicit choices', [
            taskDomainDecision({
              actions: [createTaskAction()],
            }),
            sourcePlacementDecision({
              appName: 'Task Section',
              baseName: 'Task Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-section'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-section__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-section__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-section__empty'],
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Plan sprint goals',
              done: false,
            }, {
              id: 2,
              title: 'Review pull request',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done'],
              actionName: 'create',
              submitButtonText: 'Create',
            }, {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-section-create-feedback',
      title: 'Component-pair task section with create form, feedback, and table',
      description: 'Runnable app shell assembled from app-section source lowering, local scalar and collection state, a native submit form, explicit action feedback status, a table projection, caller seed records, and derived local create behavior.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-section-feedback.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-section-feedback-decisions', 'task section feedback explicit choices', [
            taskDomainDecision({
              actions: [createTaskAction()],
            }),
            sourcePlacementDecision({
              appName: 'Task Section Feedback',
              baseName: 'Task Section Feedback',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-section-feedback.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'actionStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-action-status',
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-section'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-section__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
              actionName: 'create',
              classTokens: ['task-section__action-status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-section__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-section__empty'],
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Plan sprint goals',
              done: false,
            }, {
              id: 2,
              title: 'Review pull request',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done'],
              actionName: 'create',
              submitButtonText: 'Create',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'create',
            }, {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-assignment-section',
      title: 'Component-pair task assignment section',
      description: 'Runnable app shell assembled from app-section source lowering, local task/contact collections, a reference-one assignee relationship, a native submit form with a related-contact select, a table projection, grouped seed records, and derived local create behavior.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-assignment-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-assignment-section-component-decisions', 'task assignment section component explicit choices', [
            taskBrowserRelationshipDomainDecision({
              actions: [createTaskAction({
                targetEntityName: 'TaskItem',
                inputFieldNames: ['title', 'done', 'assigneeId'],
              })],
            }),
            sourcePlacementDecision({
              appName: 'Task Assignment Section',
              baseName: 'Task Assignment Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-assignment-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-assignment'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-assignment__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-assignment__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-assignment__empty'],
            }]),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Prepare release notes',
                done: false,
                assigneeId: 'ada',
              }, {
                id: 2,
                title: 'Check deployment checklist',
                done: true,
                assigneeId: 'grace',
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done', 'assigneeId'],
              fieldControlSelections: [{
                fieldName: 'assigneeId',
                innerControlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
                fieldControlId: 'task-assignee-select',
                labelText: 'Assignee',
                valueDomainExpression: 'contacts',
                optionLocalName: 'contact',
                optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
                optionValueExpression: 'contact.contactId',
                optionLabelExpression: 'contact.fullName',
              }],
              actionName: 'create',
              submitButtonText: 'Create task',
            }, {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-object-assignment-section',
      title: 'Component-pair task object assignment section',
      description: 'Runnable app shell assembled from app-section source lowering, local task/contact collections, an object-valued reference-one assignee relationship, a native submit form with model-bound related-contact select, matcher expression, a table projection, grouped seed records, and derived local create behavior.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-object-assignment-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-object-assignment-section-component-decisions', 'task object assignment section component explicit choices', [
            taskObjectAssigneeRelationshipDomainDecision({
              actions: [createTaskAction({
                targetEntityName: 'TaskItem',
                inputFieldNames: ['title', 'done', 'assignee'],
              })],
            }),
            sourcePlacementDecision({
              appName: 'Task Object Assignment Section',
              baseName: 'Task Object Assignment Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-object-assignment-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-object-assignment'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-object-assignment__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-object-assignment__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-object-assignment__empty'],
            }]),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Prepare release notes',
                done: false,
                assignee: 'ada',
              }, {
                id: 2,
                title: 'Check deployment checklist',
                done: true,
                assignee: 'grace',
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done'],
              relationshipNames: ['assignee'],
              relationshipControlSelections: [{
                relationshipName: 'assignee',
                innerControlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
                bindingExpression: 'assignee',
                fieldControlId: 'task-assignee-select',
                labelText: 'Assignee',
                valueDomainExpression: 'contacts',
                optionLocalName: 'contact',
                optionBindingKind: AppBuilderChoiceOptionBindingKind.Model,
                optionValueExpression: 'contact',
                optionLabelExpression: 'contact.fullName',
                matcherExpression: 'matchContactEntry',
              }],
              actionName: 'create',
              submitButtonText: 'Create task',
            }, {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-operations-section',
      title: 'Component-pair task operations section',
      description: 'Runnable app shell assembled from object-valued assignment, derived create behavior, action feedback, a filtered and paged table, scalar row selection, a caller-owned batch action, and explicit local sort behavior.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-operations-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-operations-section-component-decisions', 'task operations section component explicit choices', [
            taskObjectAssigneeRelationshipDomainDecision({
              actions: [
                createTaskAction({
                  targetEntityName: 'TaskItem',
                  inputFieldNames: ['title', 'done', 'assignee'],
                }),
                sortByTitleTaskAction(),
                deleteSelectedTaskItemsAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Task Operations Section',
              baseName: 'Task Operations Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-operations-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
              sortable: true,
              filterable: true,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }], [{
              featureId: AppBuilderCollectionFeatureId.LocalSorting,
              fieldNames: ['title'],
              initiallyEnabled: true,
              summary: 'The caller chose a local title sort and supplied the sort handler explicitly.',
            }, {
              featureId: AppBuilderCollectionFeatureId.LocalFiltering,
              fieldNames: ['title'],
              initiallyEnabled: true,
              summary: 'The caller chose local title filtering and supplied the filter binding explicitly.',
            }, {
              featureId: AppBuilderCollectionFeatureId.LocalPagination,
              pageSize: 2,
              initiallyEnabled: true,
              summary: 'The caller chose local pagination and supplied the table control expressions explicitly.',
            }, {
              featureId: AppBuilderCollectionFeatureId.RowSelection,
              initiallyEnabled: true,
              summary: 'The caller chose scalar row selection before adding collection-scoped batch actions.',
            }, {
              featureId: AppBuilderCollectionFeatureId.BatchActions,
              initiallyEnabled: true,
              summary: 'The caller chose one explicit batch action over selected scalar identities.',
            }]),
            collectionIdentityPolicyDecision({
              mode: AppBuilderCollectionIdentityMode.ScalarField,
              requiredBy: [
                AppBuilderCollectionIdentityUse.RowSelection,
                AppBuilderCollectionIdentityUse.BatchAction,
              ],
              fieldName: 'id',
            }),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-create-status',
            }, {
              actionName: 'deleteSelectedTaskItems',
              statusMemberName: 'batchStatusMessage',
              statusText: 'Selected tasks deleted.',
              statusId: 'task-batch-status',
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-operations'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-operations__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
              actionName: 'create',
              classTokens: ['task-operations__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
              actionName: 'deleteSelectedTaskItems',
              classTokens: ['task-operations__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-operations__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['task-operations__row'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-operations__empty'],
            }]),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Prepare release notes',
                done: false,
                assignee: 'ada',
              }, {
                id: 2,
                title: 'Check deployment checklist',
                done: true,
                assignee: 'grace',
              }, {
                id: 3,
                title: 'Review accessibility labels',
                done: false,
                assignee: 'ada',
              }, {
                id: 4,
                title: 'Publish sprint summary',
                done: false,
                assignee: 'grace',
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done'],
              relationshipNames: ['assignee'],
              relationshipControlSelections: [{
                relationshipName: 'assignee',
                innerControlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
                bindingExpression: 'assignee',
                fieldControlId: 'task-assignee-select',
                labelText: 'Assignee',
                valueDomainExpression: 'contacts',
                optionLocalName: 'contact',
                optionBindingKind: AppBuilderChoiceOptionBindingKind.Model,
                optionValueExpression: 'contact',
                optionLabelExpression: 'contact.fullName',
                matcherExpression: 'matchContactEntry',
              }],
              actionName: 'create',
              submitButtonText: 'Create task',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'create',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'deleteSelectedTaskItems',
            }, {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'pagedTaskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No matching tasks.',
              emptyStateConditionExpression: 'filteredTaskItems.length === 0',
              sortHandlerExpressions: [{
                fieldName: 'title',
                handlerExpression: 'sortByTitle()',
              }],
              filterBindingExpressions: [{
                fieldName: 'title',
                bindingExpression: 'titleFilter',
              }],
              paginationPreviousHandlerExpression: 'previousTaskItemsPage()',
              paginationNextHandlerExpression: 'nextTaskItemsPage()',
              paginationCurrentPageExpression: 'Math.min(taskItemsPage, taskItemsPageCount)',
              paginationPageCountExpression: 'taskItemsPageCount',
              paginationPreviousButtonText: 'Previous',
              paginationNextButtonText: 'Next',
              rowSelectionCheckedExpression: 'selectedTaskItemIds.includes(taskItem.id)',
              rowSelectionToggleHandlerExpression: 'toggleTaskItemSelection(taskItem)',
              rowSelectionColumnHeaderText: 'Select',
              rowSelectionCheckboxLabelExpression: "'Select ' + taskItem.title",
              batchActionControls: [{
                actionName: 'deleteSelectedTaskItems',
                handlerExpression: 'deleteSelectedTaskItems()',
                buttonText: 'Delete selected',
              }],
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'sortByTitle',
            methodBodyStatements: "this.taskItems.sort((left, right) => left.title.localeCompare(right.title));\nthis.taskItemsPage = 1;",
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'deleteSelectedTaskItems',
            methodBodyStatements: `const selectedIds = new Set(this.selectedTaskItemIds);
for (let index = this.taskItems.length - 1; index >= 0; index -= 1) {
  if (selectedIds.has(this.taskItems[index]!.id)) {
    this.taskItems.splice(index, 1);
  }
}
this.selectedTaskItemIds = [];
this.taskItemsPage = Math.min(this.taskItemsPage, this.taskItemsPageCount);
this.batchStatusMessage = 'Selected tasks deleted.';`,
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-relationship-overview-section',
      title: 'Component-pair task relationship overview section',
      description: 'Runnable app shell assembled from one local task collection that spends reference-one, reference-many, owns-one, owns-many, and nested value-object relationships together through relationship-backed table columns and grouped seed data.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-relationship-overview-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-relationship-overview-section-component-decisions', 'task relationship overview section component explicit choices', [
            taskRelationshipOverviewDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Relationship Overview Section',
              baseName: 'Task Relationship Overview Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-relationship-overview-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'schedule',
              header: 'Schedule',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'checkpoints',
              header: 'Checkpoints',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'effort',
              header: 'Effort',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-relationship-overview'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-relationship-overview__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['task-relationship-overview__row'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-relationship-overview__empty'],
            }]),
            taskRelationshipOverviewSeedDataDecision(),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-relationship-operations-section',
      title: 'Component-pair task relationship operations section',
      description: 'Runnable app shell assembled from all local relationship kinds, relationship-backed table columns, local title filtering, explicit sort, local pagination, scalar row selection, and a caller-owned batch delete action.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-relationship-operations-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-relationship-operations-section-component-decisions', 'task relationship operations section component explicit choices', [
            taskRelationshipOverviewDomainDecision({
              actions: [
                sortByTitleTaskAction(),
                deleteSelectedTaskItemsAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Task Relationship Operations Section',
              baseName: 'Task Relationship Operations Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-relationship-operations-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
              sortable: true,
              filterable: true,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'schedule',
              header: 'Schedule',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'checkpoints',
              header: 'Checkpoints',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'effort',
              header: 'Effort',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }], [{
              featureId: AppBuilderCollectionFeatureId.LocalSorting,
              fieldNames: ['title'],
              initiallyEnabled: true,
              summary: 'The caller chose local title sorting for the relationship-heavy task table.',
            }, {
              featureId: AppBuilderCollectionFeatureId.LocalFiltering,
              fieldNames: ['title'],
              initiallyEnabled: true,
              summary: 'The caller chose local title filtering for the relationship-heavy task table.',
            }, {
              featureId: AppBuilderCollectionFeatureId.LocalPagination,
              pageSize: 1,
              initiallyEnabled: true,
              summary: 'The caller chose local pagination to force filtered/paged relationship table composition.',
            }, {
              featureId: AppBuilderCollectionFeatureId.RowSelection,
              initiallyEnabled: true,
              summary: 'The caller chose scalar row selection before adding a collection-scoped delete action.',
            }, {
              featureId: AppBuilderCollectionFeatureId.BatchActions,
              initiallyEnabled: true,
              summary: 'The caller chose one explicit batch action over selected scalar task identities.',
            }]),
            collectionIdentityPolicyDecision({
              mode: AppBuilderCollectionIdentityMode.ScalarField,
              requiredBy: [
                AppBuilderCollectionIdentityUse.RowSelection,
                AppBuilderCollectionIdentityUse.BatchAction,
              ],
              fieldName: 'id',
            }),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-relationship-operations'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-relationship-operations__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['task-relationship-operations__row'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-relationship-operations__empty'],
            }]),
            taskRelationshipOverviewSeedDataDecision(),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'pagedTaskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No matching tasks.',
              emptyStateConditionExpression: 'filteredTaskItems.length === 0',
              sortHandlerExpressions: [{
                fieldName: 'title',
                handlerExpression: 'sortByTitle()',
              }],
              filterBindingExpressions: [{
                fieldName: 'title',
                bindingExpression: 'titleFilter',
              }],
              paginationPreviousHandlerExpression: 'previousTaskItemsPage()',
              paginationNextHandlerExpression: 'nextTaskItemsPage()',
              paginationCurrentPageExpression: 'Math.min(taskItemsPage, taskItemsPageCount)',
              paginationPageCountExpression: 'taskItemsPageCount',
              paginationPreviousButtonText: 'Previous',
              paginationNextButtonText: 'Next',
              rowSelectionCheckedExpression: 'selectedTaskItemIds.includes(taskItem.id)',
              rowSelectionToggleHandlerExpression: 'toggleTaskItemSelection(taskItem)',
              rowSelectionColumnHeaderText: 'Select',
              rowSelectionCheckboxLabelExpression: "'Select ' + taskItem.title",
              batchActionControls: [{
                actionName: 'deleteSelectedTaskItems',
                handlerExpression: 'deleteSelectedTaskItems()',
                buttonText: 'Delete selected',
              }],
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'sortByTitle',
            methodBodyStatements: "this.taskItems.sort((left, right) => left.title.localeCompare(right.title));\nthis.taskItemsPage = 1;",
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'deleteSelectedTaskItems',
            methodBodyStatements: `const selectedIds = new Set(this.selectedTaskItemIds);
for (let index = this.taskItems.length - 1; index >= 0; index -= 1) {
  if (selectedIds.has(this.taskItems[index]!.id)) {
    this.taskItems.splice(index, 1);
  }
}
this.selectedTaskItemIds = [];
this.taskItemsPage = Math.min(this.taskItemsPage, this.taskItemsPageCount);`,
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-relationship-async-section',
      title: 'Component-pair task relationship async section',
      description: 'Runnable app shell assembled from local relationship-heavy task state, an explicit async data source, loading/empty/error composition, and a nested relationship-backed fulfilled table.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-relationship-async-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-relationship-async-section-component-decisions', 'task relationship async section component explicit choices', [
            taskRelationshipOverviewDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Relationship Async Section',
              baseName: 'Task Relationship Async Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-relationship-async-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'schedule',
              header: 'Schedule',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'checkpoints',
              header: 'Checkpoints',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'effort',
              header: 'Effort',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-relationship-async'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['task-relationship-async__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusPending,
              classTokens: ['task-relationship-async__pending'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusEmpty,
              classTokens: ['task-relationship-async__empty'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusError,
              classTokens: ['task-relationship-async__error'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-relationship-async__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['task-relationship-async__row'],
            }]),
            taskRelationshipOverviewSeedDataDecision(),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: loadingEmptyErrorStateTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
              promiseExpression: 'taskItemsPromise',
              pendingText: 'Loading tasks...',
              fulfilledLocalName: 'loadedTaskItems',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'loadedTaskItems.length === 0',
              rejectedLocalName: 'error',
              rejectedText: 'Could not load tasks.',
              fulfilledContentComposition: {
                targetRef: collectionTableTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                collectionExpression: 'loadedTaskItems',
                itemLocalName: 'taskItem',
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: 'Promise<TaskItem[]>',
            asyncDataInitializerExpression: 'Promise.resolve(this.taskItems)',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-review-workflow-section',
      title: 'Component-pair task review workflow section',
      description: 'Runnable app shell assembled from reference-one and reference-many task relationships, a native create form, action feedback, an explicit async data source, loading/empty/error composition, and a nested relationship-backed table.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-review-workflow-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-review-workflow-section-component-decisions', 'task review workflow section component explicit choices', [
            taskBrowserRelationshipDomainDecision({
              includeReviewers: true,
              actions: [createTaskAction({
                targetEntityName: 'TaskItem',
                inputFieldNames: ['title', 'done', 'assigneeId', 'reviewerIds'],
              })],
            }),
            sourcePlacementDecision({
              appName: 'Task Review Workflow Section',
              baseName: 'Task Review Workflow Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-review-workflow-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-create-status',
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-review-workflow'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-review-workflow__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
              actionName: 'create',
              classTokens: ['task-review-workflow__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['task-review-workflow__status-region'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusPending,
              classTokens: ['task-review-workflow__pending'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusEmpty,
              classTokens: ['task-review-workflow__empty'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusError,
              classTokens: ['task-review-workflow__error'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-review-workflow__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['task-review-workflow__row'],
            }]),
            taskReviewWorkflowSeedDataDecision(),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done', 'assigneeId', 'reviewerIds'],
              fieldControlSelections: [{
                fieldName: 'assigneeId',
                innerControlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
                fieldControlId: 'task-assignee-select',
                labelText: 'Assignee',
                valueDomainExpression: 'contacts',
                optionLocalName: 'contact',
                optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
                optionValueExpression: 'contact.contactId',
                optionLabelExpression: 'contact.fullName',
              }, {
                fieldName: 'reviewerIds',
                innerControlPatternId: AppBuilderControlPatternId.NativeMultiSelect,
                fieldControlId: 'task-reviewers-select',
                labelText: 'Reviewers',
                valueDomainExpression: 'contacts',
                optionLocalName: 'contact',
                optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
                optionValueExpression: 'contact.contactId',
                optionLabelExpression: 'contact.fullName',
              }],
              actionName: 'create',
              submitButtonText: 'Create task',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'create',
            }, {
              targetRef: loadingEmptyErrorStateTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
              promiseExpression: 'taskItemsPromise',
              pendingText: 'Loading tasks...',
              fulfilledLocalName: 'loadedTaskItems',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'loadedTaskItems.length === 0',
              rejectedLocalName: 'error',
              rejectedText: 'Could not load tasks.',
              fulfilledContentComposition: {
                targetRef: collectionTableTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                collectionExpression: 'loadedTaskItems',
                itemLocalName: 'taskItem',
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }, {
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: 'Promise<TaskItem[]>',
            asyncDataInitializerExpression: 'Promise.resolve(this.taskItems)',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-review-workbench-section',
      title: 'Component-pair task review workbench section',
      description: 'Runnable app shell assembled from reference-one and reference-many task relationships, native create input, action feedback, local title filtering, explicit sort, local pagination, scalar row selection, and a caller-owned batch delete action.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-review-workbench-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-review-workbench-section-component-decisions', 'task review workbench section component explicit choices', [
            taskBrowserRelationshipDomainDecision({
              includeReviewers: true,
              actions: [
                createTaskAction({
                  targetEntityName: 'TaskItem',
                  inputFieldNames: ['title', 'done', 'assigneeId', 'reviewerIds'],
                }),
                sortByTitleTaskAction(),
                deleteSelectedTaskItemsAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Task Review Workbench Section',
              baseName: 'Task Review Workbench Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-review-workbench-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
              sortable: true,
              filterable: true,
            }, {
              relationshipName: 'assignee',
              header: 'Assignee',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }], [{
              featureId: AppBuilderCollectionFeatureId.LocalSorting,
              fieldNames: ['title'],
              initiallyEnabled: true,
              summary: 'The caller chose local title sorting for the review workbench table.',
            }, {
              featureId: AppBuilderCollectionFeatureId.LocalFiltering,
              fieldNames: ['title'],
              initiallyEnabled: true,
              summary: 'The caller chose local title filtering for the review workbench table.',
            }, {
              featureId: AppBuilderCollectionFeatureId.LocalPagination,
              pageSize: 2,
              initiallyEnabled: true,
              summary: 'The caller chose local pagination for the review workbench table.',
            }, {
              featureId: AppBuilderCollectionFeatureId.RowSelection,
              initiallyEnabled: true,
              summary: 'The caller chose scalar row selection before adding a collection-scoped batch action.',
            }, {
              featureId: AppBuilderCollectionFeatureId.BatchActions,
              initiallyEnabled: true,
              summary: 'The caller chose one explicit batch action over selected scalar task identities.',
            }]),
            collectionIdentityPolicyDecision({
              mode: AppBuilderCollectionIdentityMode.ScalarField,
              requiredBy: [
                AppBuilderCollectionIdentityUse.RowSelection,
                AppBuilderCollectionIdentityUse.BatchAction,
              ],
              fieldName: 'id',
            }),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-create-status',
            }, {
              actionName: 'deleteSelectedTaskItems',
              statusMemberName: 'batchStatusMessage',
              statusText: 'Selected tasks deleted.',
              statusId: 'task-batch-status',
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-review-workbench'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-review-workbench__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
              actionName: 'create',
              classTokens: ['task-review-workbench__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
              actionName: 'deleteSelectedTaskItems',
              classTokens: ['task-review-workbench__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-review-workbench__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['task-review-workbench__row'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-review-workbench__empty'],
            }]),
            taskReviewWorkflowSeedDataDecision(),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done', 'assigneeId', 'reviewerIds'],
              fieldControlSelections: [{
                fieldName: 'assigneeId',
                innerControlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
                fieldControlId: 'task-assignee-select',
                labelText: 'Assignee',
                valueDomainExpression: 'contacts',
                optionLocalName: 'contact',
                optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
                optionValueExpression: 'contact.contactId',
                optionLabelExpression: 'contact.fullName',
              }, {
                fieldName: 'reviewerIds',
                innerControlPatternId: AppBuilderControlPatternId.NativeMultiSelect,
                fieldControlId: 'task-reviewers-select',
                labelText: 'Reviewers',
                valueDomainExpression: 'contacts',
                optionLocalName: 'contact',
                optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
                optionValueExpression: 'contact.contactId',
                optionLabelExpression: 'contact.fullName',
              }],
              actionName: 'create',
              submitButtonText: 'Create task',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'create',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'deleteSelectedTaskItems',
            }, {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'pagedTaskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No matching tasks.',
              emptyStateConditionExpression: 'filteredTaskItems.length === 0',
              sortHandlerExpressions: [{
                fieldName: 'title',
                handlerExpression: 'sortByTitle()',
              }],
              filterBindingExpressions: [{
                fieldName: 'title',
                bindingExpression: 'titleFilter',
              }],
              paginationPreviousHandlerExpression: 'previousTaskItemsPage()',
              paginationNextHandlerExpression: 'nextTaskItemsPage()',
              paginationCurrentPageExpression: 'Math.min(taskItemsPage, taskItemsPageCount)',
              paginationPageCountExpression: 'taskItemsPageCount',
              paginationPreviousButtonText: 'Previous',
              paginationNextButtonText: 'Next',
              rowSelectionCheckedExpression: 'selectedTaskItemIds.includes(taskItem.id)',
              rowSelectionToggleHandlerExpression: 'toggleTaskItemSelection(taskItem)',
              rowSelectionColumnHeaderText: 'Select',
              rowSelectionCheckboxLabelExpression: "'Select ' + taskItem.title",
              batchActionControls: [{
                actionName: 'deleteSelectedTaskItems',
                handlerExpression: 'deleteSelectedTaskItems()',
                buttonText: 'Delete selected',
              }],
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'sortByTitle',
            methodBodyStatements: "this.taskItems.sort((left, right) => left.title.localeCompare(right.title));\nthis.taskItemsPage = 1;",
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'deleteSelectedTaskItems',
            methodBodyStatements: `const selectedIds = new Set(this.selectedTaskItemIds);
for (let index = this.taskItems.length - 1; index >= 0; index -= 1) {
  if (selectedIds.has(this.taskItems[index]!.id)) {
    this.taskItems.splice(index, 1);
  }
}
this.selectedTaskItemIds = [];
this.taskItemsPage = Math.min(this.taskItemsPage, this.taskItemsPageCount);
this.batchStatusMessage = 'Selected tasks deleted.';`,
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-reviewers-section',
      title: 'Component-pair task reviewers section',
      description: 'Runnable app shell assembled from app-section source lowering, local task/contact collections, a reference-many reviewers relationship, a native multi-select, a table projection, grouped seed records, and derived local create behavior.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-reviewers-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-reviewers-section-component-decisions', 'task reviewers section component explicit choices', [
            taskReviewersRelationshipDomainDecision({
              actions: [createTaskAction({
                targetEntityName: 'TaskItem',
                inputFieldNames: ['title', 'done', 'reviewerIds'],
              })],
            }),
            sourcePlacementDecision({
              appName: 'Task Reviewers Section',
              baseName: 'Task Reviewers Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-reviewers-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'reviewers',
              header: 'Reviewers',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-reviewers'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-reviewers__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-reviewers__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-reviewers__empty'],
            }]),
            seedDataDecision([{
              entityName: 'TaskItem',
              records: [{
                id: 1,
                title: 'Prepare release notes',
                done: false,
                reviewerIds: ['ada', 'grace'],
              }, {
                id: 2,
                title: 'Check deployment checklist',
                done: true,
                reviewerIds: ['grace'],
              }],
            }, {
              entityName: 'ContactEntry',
              records: [{
                contactId: 'ada',
                fullName: 'Ada Lovelace',
                email: 'ada@example.test',
              }, {
                contactId: 'grace',
                fullName: 'Grace Hopper',
                email: 'grace@example.test',
              }],
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done', 'reviewerIds'],
              fieldControlSelections: [{
                fieldName: 'reviewerIds',
                innerControlPatternId: AppBuilderControlPatternId.NativeMultiSelect,
                fieldControlId: 'task-reviewers-select',
                labelText: 'Reviewers',
                valueDomainExpression: 'contacts',
                optionLocalName: 'contact',
                optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
                optionValueExpression: 'contact.contactId',
                optionLabelExpression: 'contact.fullName',
              }],
              actionName: 'create',
              submitButtonText: 'Create task',
            }, {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-schedule-section',
      title: 'Component-pair task schedule section',
      description: 'Runnable app shell assembled from app-section source lowering, local task collection state, a required owns-one schedule relationship, nested caller seed objects, and a relationship-backed table projection.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-schedule-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-schedule-section-component-decisions', 'task schedule section component explicit choices', [
            taskScheduleRelationshipDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Schedule Section',
              baseName: 'Task Schedule Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-schedule-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'schedule',
              header: 'Schedule',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-schedule'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-schedule__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-schedule__empty'],
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Prepare release notes',
              done: false,
              schedule: {
                id: 101,
                label: 'Draft review',
                confirmed: true,
              },
            }, {
              id: 2,
              title: 'Check deployment checklist',
              done: true,
              schedule: {
                id: 102,
                label: 'Launch readiness',
                confirmed: false,
              },
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-checkpoints-section',
      title: 'Component-pair task checkpoints section',
      description: 'Runnable app shell assembled from app-section source lowering, local task collection state, an owns-many checkpoints relationship, nested caller seed records, and a relationship-backed table projection.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-checkpoints-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-checkpoints-section-component-decisions', 'task checkpoints section component explicit choices', [
            taskCheckpointsRelationshipDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Checkpoints Section',
              baseName: 'Task Checkpoints Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-checkpoints-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'checkpoints',
              header: 'Checkpoints',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-checkpoints'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-checkpoints__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-checkpoints__empty'],
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Prepare release notes',
              done: false,
              checkpoints: [{
                id: 101,
                title: 'Draft summary',
                done: true,
              }, {
                id: 102,
                title: 'Review changes',
                done: false,
              }],
            }, {
              id: 2,
              title: 'Check deployment checklist',
              done: true,
              checkpoints: [{
                id: 201,
                title: 'Confirm owners',
                done: true,
              }],
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-effort-section',
      title: 'Component-pair task effort section',
      description: 'Runnable app shell assembled from app-section source lowering, local task collection state, a required nested value-object effort relationship, nested caller seed objects, and a relationship-backed table projection.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-effort-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-effort-section-component-decisions', 'task effort section component explicit choices', [
            taskEffortRelationshipDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Effort Section',
              baseName: 'Task Effort Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-effort-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              relationshipName: 'effort',
              header: 'Effort',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-effort'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-effort__table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-effort__empty'],
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Prepare release notes',
              done: false,
              effort: {
                summary: 'Short focused pass',
                hours: 2,
              },
            }, {
              id: 2,
              title: 'Check deployment checklist',
              done: true,
              effort: {
                summary: 'Review with owner',
                hours: 1,
              },
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'taskItems',
              itemLocalName: 'taskItem',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'taskItems.length === 0',
            }],
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-section-create-and-async-table',
      title: 'Component-pair task section with create form and async table',
      description: 'Runnable app shell assembled from app-section source lowering, local scalar and collection state, a native submit form, a loading/empty/error region, a nested fulfilled-branch table projection, caller seed records, derived local create behavior, and caller-owned async state.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/async-task-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('async-task-section-component-decisions', 'async task section component explicit choices', [
            taskDomainDecision({
              actions: [
                createTaskAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Async Task Section',
              baseName: 'Async Task Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/async-task-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                  AppBuilderLocalStatePolicy.ViewModelLocalCollection,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['task-section'],
              dataAttributes: [{ name: 'data-au-role', value: 'app-section' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-section__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['task-section__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusPending,
              classTokens: ['task-section__pending'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusEmpty,
              classTokens: ['task-section__empty'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusError,
              classTokens: ['task-section__error'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-section__table'],
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Prepare sprint report',
              done: false,
            }, {
              id: 2,
              title: 'Send release update',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done'],
              actionName: 'create',
              submitButtonText: 'Create',
            }, {
              targetRef: loadingEmptyErrorStateTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
              promiseExpression: 'taskItemsPromise',
              pendingText: 'Loading tasks...',
              fulfilledLocalName: 'loadedTaskItems',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'loadedTaskItems.length === 0',
              rejectedLocalName: 'error',
              rejectedText: 'Could not load tasks.',
              fulfilledContentComposition: {
                targetRef: collectionTableTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                collectionExpression: 'loadedTaskItems',
                itemLocalName: 'taskItem',
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: 'Promise<TaskItem[]>',
            asyncDataInitializerExpression: 'Promise.resolve(this.taskItems)',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-draft-object',
      title: 'Component-pair task form with draft object binding',
      description: 'Runnable app shell proving that a native submit form can bind through an emitted local draft object without claiming edit-buffer or dirty-state behavior.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-draft-object.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-draft-object-decisions', 'task draft object explicit choices', [
            taskDomainDecision({
              actions: [saveDraftAction({
                inputFieldNames: ['title', 'done'],
              })],
            }),
            sourcePlacementDecision({
              appName: 'Task Draft Object',
              baseName: 'Task Draft Object',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-draft-object.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: nativeSubmitFormTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
            fieldNames: ['title', 'done'],
            bindingRootExpression: 'taskDraft',
            actionName: 'saveDraft',
            submitButtonText: 'Save draft',
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'saveDraft',
            methodBodyStatements: 'this.taskDraft.title = this.taskDraft.title.trim();',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-domain-backed-submit-form',
      title: 'Component-pair task domain-backed submit form',
      description: 'Runnable app shell proving that a domain-backed submit form emits a class-backed local draft object with explicit required-field submit readiness.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-domain-backed-submit-form.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-domain-backed-submit-form-decisions', 'task domain-backed submit form explicit choices', [
            taskDomainDecision({
              actions: [saveDraftAction({
                inputFieldNames: ['title', 'done'],
              })],
              requiredFieldNames: ['title'],
            }),
            sourcePlacementDecision({
              appName: 'Task Domain Backed Submit Form',
              baseName: 'Task Domain Backed Submit Form',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-domain-backed-submit-form.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: domainBackedSubmitFormTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
            fieldNames: ['title', 'done'],
            bindingRootExpression: 'taskDraft',
            actionName: 'saveDraft',
            submitButtonText: 'Save draft',
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'saveDraft',
            methodBodyStatements: 'if (!this.taskDraft.canSubmit) {\n  return;\n}\nthis.taskDraft.title = this.taskDraft.title.trim();',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-draft-field-variety',
      title: 'Component-pair task form with native field variety',
      description: 'Runnable app shell assembled from component-pair source lowering, local view-model state, and a native submit form that spends all first-ring native field controls.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-draft-fields.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-draft-field-variety-decisions', 'task draft field variety explicit choices', [
            taskFieldVarietyDomainDecision({
              actions: [saveDraftAction()],
            }),
            sourcePlacementDecision({
              appName: 'Task Field Variety',
              baseName: 'Task Draft Fields',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-draft-fields.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            controlAccessibilityDecision([{
              fieldName: 'title',
              helpText: 'Enter a short task title before saving the draft.',
            }, {
              fieldName: 'description',
              helpText: 'Describe the expected outcome in one or two sentences.',
            }, {
              fieldName: 'progressPercent',
              statusText: 'Use the slider to capture a rough completion signal.',
            }, {
              fieldName: 'priority',
              helpText: 'Pick the urgency that should drive review order.',
            }, {
              fieldName: 'reviewType',
              helpText: 'Choose the review mode that fits the task.',
            }, {
              fieldName: 'checkpoints',
              statusText: 'Select every checkpoint already completed.',
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['task-form'],
              dataAttributes: [{ name: 'data-au-role', value: 'native-submit-form' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
              classTokens: ['task-form__field'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.FieldLabel,
              classTokens: ['task-form__label'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.FieldControl,
              classTokens: ['task-form__control'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.FieldMessage,
              classTokens: ['task-form__message'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Button,
              actionName: 'saveDraft',
              classTokens: ['task-form__submit'],
              dataAttributes: [{ name: 'data-action', value: 'save-draft' }],
            }], [nativeSubmitFormTargetRef(), fieldGroupTargetRef()]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: nativeSubmitFormTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
            fieldNames: [
              'title',
              'description',
              'estimateHours',
              'progressPercent',
              'dueDate',
              'done',
              'priority',
              'labels',
              'reviewType',
              'checkpoints',
            ],
            fieldControlSelections: [{
              fieldName: 'description',
              innerControlPatternId: AppBuilderControlPatternId.NativeTextarea,
            }, {
              fieldName: 'progressPercent',
              innerControlPatternId: AppBuilderControlPatternId.NativeRangeInput,
            }, {
              fieldName: 'reviewType',
              innerControlPatternId: AppBuilderControlPatternId.NativeRadioGroup,
            }, {
              fieldName: 'checkpoints',
              innerControlPatternId: AppBuilderControlPatternId.NativeCheckboxList,
            }],
            actionName: 'saveDraft',
            submitButtonText: 'Save draft',
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'saveDraft',
            methodBodyStatements: `this.title = this.title.trim();
this.description = this.description.trim();`,
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-draft-explicit-field-overrides',
      title: 'Component-pair task form with explicit field-control overrides',
      description: 'Runnable app shell proving that composed field-control selections can spend caller-supplied ids, labels, messages, option locals, and option binding kinds without dropping to manual control invocation.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-draft-overrides.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-draft-explicit-field-overrides-decisions', 'task draft explicit field override choices', [
            taskFieldVarietyDomainDecision({
              actions: [saveDraftAction({
                inputFieldNames: [
                  'title',
                  'priority',
                  'reviewType',
                  'checkpoints',
                ],
              })],
            }),
            sourcePlacementDecision({
              appName: 'Task Draft Overrides',
              baseName: 'Task Draft Overrides',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-draft-overrides.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: nativeSubmitFormTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
            fieldNames: [
              'title',
              'priority',
              'reviewType',
              'checkpoints',
            ],
            fieldControlSelections: [{
              fieldName: 'title',
              innerControlPatternId: AppBuilderControlPatternId.NativeTextInput,
              fieldControlId: 'task-summary-input',
              labelText: 'Task summary',
              messageKind: AppBuilderSourceLoweringMessageKind.Help,
              messageText: 'Use a short active-voice summary.',
              messageId: 'task-summary-guidance',
            }, {
              fieldName: 'priority',
              innerControlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
              fieldControlId: 'task-priority-select',
              labelText: 'Review priority',
              valueDomainExpression: 'priorityOptions',
              optionLocalName: 'priorityChoice',
              optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
              optionValueExpression: 'priorityChoice.value',
              optionLabelExpression: 'priorityChoice.title',
            }, {
              fieldName: 'reviewType',
              innerControlPatternId: AppBuilderControlPatternId.NativeRadioGroup,
              labelText: 'Review mode',
              messageKind: AppBuilderSourceLoweringMessageKind.Status,
              messageText: 'Choose how this task will be reviewed.',
              messageId: 'task-review-mode-status',
              valueDomainExpression: 'reviewTypeOptions',
              optionLocalName: 'reviewChoice',
              optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
              optionValueExpression: 'reviewChoice.value',
              optionLabelExpression: 'reviewChoice.title',
            }, {
              fieldName: 'checkpoints',
              innerControlPatternId: AppBuilderControlPatternId.NativeCheckboxList,
              labelText: 'Completed checkpoints',
              valueDomainExpression: 'checkpointOptions',
              optionLocalName: 'checkpointChoice',
              optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
              optionValueExpression: 'checkpointChoice.value',
              optionLabelExpression: 'checkpointChoice.title',
            }],
            actionName: 'saveDraft',
            handlerExpression: 'saveDraft()',
            submitButtonText: 'Save draft',
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'saveDraft',
            methodBodyStatements: 'this.title = this.title.trim();',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-preferences-named-value-sets',
      title: 'Component-pair task form with named value sets',
      description: 'Runnable app shell proving that composed choice controls can select reusable domain value sets by name while local view-model state emits the matching option members.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-preferences.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-preferences-named-value-sets-decisions', 'task preferences named value-set choices', [
            taskNamedValueSetDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Preferences',
              baseName: 'Task Preferences',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-preferences.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: nativeSubmitFormTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
            fieldNames: [
              'title',
              'priority',
              'reviewType',
            ],
            fieldControlSelections: [{
              fieldName: 'priority',
              innerControlPatternId: AppBuilderControlPatternId.NativeSingleSelect,
              valueSetName: 'priorityOptions',
              optionLocalName: 'priorityOption',
            }, {
              fieldName: 'reviewType',
              innerControlPatternId: AppBuilderControlPatternId.NativeRadioGroup,
              valueSetName: 'reviewTypeOptions',
              optionLocalName: 'reviewTypeOption',
            }],
            actionName: 'savePreferences',
            submitButtonText: 'Save choices',
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'savePreferences',
            methodBodyStatements: 'this.title = this.title.trim();',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-draft-reset-button',
      title: 'Component-pair task form with reset button invocation',
      description: 'Runnable app shell proving that component-pair templates can combine a form composition with a direct native button invocation backed by a generated class-member action.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-draft-reset.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-draft-reset-button-decisions', 'task draft reset button explicit choices', [
            taskDomainDecision({
              actions: [saveDraftAction({ inputFieldNames: ['title', 'done'] }), resetDraftAction()],
            }),
            sourcePlacementDecision({
              appName: 'Task Reset Button',
              baseName: 'Task Draft Reset',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-draft-reset.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: nativeSubmitFormTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
            fieldNames: ['title', 'done'],
            actionName: 'saveDraft',
            submitButtonText: 'Save draft',
          },
          sourceLoweringTemplateInvocations: [{
            targetRef: nativeButtonTargetRef(),
            actionName: 'resetDraft',
            handlerExpression: 'resetDraft()',
            eventName: 'click',
            buttonText: 'Reset draft',
            buttonType: AppBuilderSourceLoweringButtonType.Button,
          }],
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'saveDraft',
            methodBodyStatements: 'this.title = this.title.trim();',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'resetDraft',
            methodBodyStatements: `this.title = '';
this.done = false;`,
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-local-collection',
      title: 'Component-pair task table with local collection state',
      description: 'Runnable app shell assembled from component-pair source lowering, explicit local collection state, caller seed records, and table projection inputs.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-table-component-decisions', 'task table component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Table',
              baseName: 'Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Write project brief',
              done: false,
            }, {
              id: 2,
              title: 'Confirm launch checklist',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-list-local-collection',
      title: 'Component-pair task list with local collection state',
      description: 'Runnable app shell assembled from component-pair source lowering, explicit local collection state, caller seed records, and list display-field inputs.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-list.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-list-component-decisions', 'task list component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task List',
              baseName: 'Task List',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-list.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionDisplayProjectionDecision([{
              fieldName: 'title',
              role: AppBuilderCollectionDisplayRole.Title,
              label: 'Task',
            }, {
              fieldName: 'done',
              role: AppBuilderCollectionDisplayRole.Boolean,
              label: 'Done',
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Draft onboarding task',
              done: false,
            }, {
              id: 2,
              title: 'Schedule stakeholder review',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionListTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionList,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-card-local-collection',
      title: 'Component-pair task card collection with local state',
      description: 'Runnable app shell assembled from component-pair source lowering, explicit local collection state, caller seed records, and card display-field inputs.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-cards.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-card-component-decisions', 'task card component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Cards',
              baseName: 'Task Cards',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-cards.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionDisplayProjectionDecision([{
              fieldName: 'title',
              role: AppBuilderCollectionDisplayRole.Title,
              label: 'Task',
            }, {
              fieldName: 'done',
              role: AppBuilderCollectionDisplayRole.Boolean,
              label: 'Done',
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Prepare welcome email',
              done: false,
            }, {
              id: 2,
              title: 'Confirm design review',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionCardTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionCard,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-loading-empty-error',
      title: 'Component-pair task table with loading, empty, and error branches',
      description: 'Runnable app shell assembled from explicit local collection state, caller-owned async member source, loading/empty/error composition, and a nested collection table fulfilled branch.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/async-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('async-task-table-component-decisions', 'async task table component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Async Task Table',
              baseName: 'Async Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/async-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['async-task-table__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'fulfilled-collection-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['async-task-table__row'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableCell,
              fieldName: 'done',
              classTokens: ['async-task-table__done-cell'],
            }], [collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Collect vendor quotes',
              done: false,
            }, {
              id: 2,
              title: 'Publish meeting summary',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: loadingEmptyErrorStateTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
            promiseExpression: 'taskItemsPromise',
            pendingText: 'Loading tasks...',
            fulfilledLocalName: 'loadedTaskItems',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'loadedTaskItems.length === 0',
            rejectedText: 'Could not load tasks.',
            fulfilledContentComposition: {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'loadedTaskItems',
              itemLocalName: 'taskItem',
            },
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: 'Promise<TaskItem[]>',
            asyncDataInitializerExpression: 'Promise.resolve(this.taskItems)',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-service-loading',
      title: 'Component-pair task table with service-backed loading',
      description: 'Runnable app shell assembled from caller domain fields, a generated service collection boundary, a DI-resolved service member, an async data member, loading/empty/error composition, and a nested table fulfilled branch.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/service-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('service-task-table-component-decisions', 'service task table component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Service Task Table',
              baseName: 'Service Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/service-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['service-task-table__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['service-task-table__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'service-backed-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['service-task-table__row'],
            }], [loadingEmptyErrorStateTargetRef(), collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Prepare import contract',
              done: false,
            }, {
              id: 2,
              title: 'Verify service topology',
              done: true,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
          }],
          sourceLoweringComposition: {
            targetRef: loadingEmptyErrorStateTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
            promiseExpression: 'taskItemsPromise',
            pendingText: 'Loading tasks...',
            fulfilledLocalName: 'loadedTaskItems',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'loadedTaskItems.length === 0',
            rejectedLocalName: 'error',
            rejectedText: 'Could not load tasks.',
            fulfilledContentComposition: {
              targetRef: collectionTableTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
              collectionExpression: 'loadedTaskItems',
              itemLocalName: 'taskItem',
            },
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-service-refresh',
      title: 'Component-pair task table with service-backed refresh',
      description: 'Runnable app shell assembled from caller domain fields, a generated service collection boundary, a mutable async data member, a refresh button, and action feedback without raw method body statements.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/refreshable-service-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('refreshable-service-task-table-component-decisions', 'refreshable service task table component explicit choices', [
            taskDomainDecision({
              actions: [refreshTaskItemsAction()],
            }),
            sourcePlacementDecision({
              appName: 'Refreshable Service Task Table',
              baseName: 'Refreshable Service Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/refreshable-service-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            interactionFeedbackDecision([{
              actionName: 'refreshTaskItems',
              statusMemberName: 'refreshStatusMessage',
              statusText: 'Tasks refreshed.',
              statusId: 'task-refresh-status',
            }], [actionFeedbackStatusTargetRef(), domainCommandActionTargetRef(), localViewModelStateTargetRef()]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['refreshable-service-task-table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['refreshable-service-task-table__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['refreshable-service-task-table__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'refreshable-service-backed-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['refreshable-service-task-table__row'],
            }], [appSectionTargetRef(), loadingEmptyErrorStateTargetRef(), collectionTableTargetRef(), actionFeedbackStatusTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Refresh generated fixtures',
              done: false,
            }, {
              id: 2,
              title: 'Review service boundary inputs',
              done: true,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
          }],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'refreshTaskItems',
            }, {
              targetRef: loadingEmptyErrorStateTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
              promiseExpression: 'taskItemsPromise',
              pendingText: 'Loading tasks...',
              fulfilledLocalName: 'loadedTaskItems',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'loadedTaskItems.length === 0',
              rejectedLocalName: 'error',
              rejectedText: 'Could not load tasks.',
              fulfilledContentComposition: {
                targetRef: collectionTableTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                collectionExpression: 'loadedTaskItems',
                itemLocalName: 'taskItem',
              },
            }],
          },
          sourceLoweringTemplateInvocations: [{
            targetRef: nativeButtonTargetRef(),
            actionName: 'refreshTaskItems',
            buttonText: 'Refresh tasks',
          }],
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
            asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'refreshTaskItems',
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'listTaskItems',
            serviceCallResultMemberName: 'taskItemsPromise',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-service-filter',
      title: 'Component-pair task table with service-backed filter action',
      description: 'Runnable app shell assembled from caller domain fields, a generated service collection boundary with an explicit filter method, a mutable async data member, and a service-backed command that passes caller-owned arguments.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/filterable-service-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('filterable-service-task-table-component-decisions', 'filterable service task table component explicit choices', [
            taskDomainDecision({
              actions: [showCompletedTaskItemsAction()],
            }),
            sourcePlacementDecision({
              appName: 'Filterable Service Task Table',
              baseName: 'Filterable Service Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/filterable-service-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            interactionFeedbackDecision([{
              actionName: 'showCompletedTaskItems',
              statusMemberName: 'filterStatusMessage',
              statusText: 'Showing completed tasks.',
              statusId: 'task-filter-status',
            }], [actionFeedbackStatusTargetRef(), domainCommandActionTargetRef(), localViewModelStateTargetRef()]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['filterable-service-task-table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['filterable-service-task-table__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['filterable-service-task-table__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'filterable-service-backed-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['filterable-service-task-table__row'],
            }], [appSectionTargetRef(), loadingEmptyErrorStateTargetRef(), collectionTableTargetRef(), actionFeedbackStatusTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Model service filter inputs',
              done: false,
            }, {
              id: 2,
              title: 'Verify filtered source lowering',
              done: true,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            collectionEntityName: 'TaskItem',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
            filterMethods: [{
              methodName: 'listTaskItemsByDone',
              fieldName: 'done',
              parameterName: 'done',
            }],
          }],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'showCompletedTaskItems',
            }, {
              targetRef: loadingEmptyErrorStateTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
              promiseExpression: 'taskItemsPromise',
              pendingText: 'Loading tasks...',
              fulfilledLocalName: 'loadedTaskItems',
              emptyStateText: 'No completed tasks yet.',
              emptyStateConditionExpression: 'loadedTaskItems.length === 0',
              rejectedLocalName: 'error',
              rejectedText: 'Could not load tasks.',
              fulfilledContentComposition: {
                targetRef: collectionTableTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                collectionExpression: 'loadedTaskItems',
                itemLocalName: 'taskItem',
              },
            }],
          },
          sourceLoweringTemplateInvocations: [{
            targetRef: nativeButtonTargetRef(),
            actionName: 'showCompletedTaskItems',
            buttonText: 'Show completed tasks',
          }],
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
            asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'showCompletedTaskItems',
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'listTaskItemsByDone',
            serviceCallResultMemberName: 'taskItemsPromise',
            serviceCallArgumentExpressions: ['true'],
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-section-service-create',
      title: 'Component-pair task section with service-backed create',
      description: 'Runnable app shell assembled from caller domain fields, a generated service collection boundary with an explicit create method, a native submit form, mutable async table state, and service-backed command wiring.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/service-create-task-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('service-create-task-section-decisions', 'service create task section explicit choices', [
            taskDomainDecision({
              actions: [createTaskAction({
                inputFieldNames: ['title', 'done'],
              })],
            }),
            sourcePlacementDecision({
              appName: 'Service Create Task Section',
              baseName: 'Service Create Task Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/service-create-task-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-create-status',
            }], [actionFeedbackStatusTargetRef(), domainCommandActionTargetRef(), localViewModelStateTargetRef()]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['service-create-task-section'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['service-create-task-section__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['service-create-task-section__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['service-create-task-section__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'service-create-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['service-create-task-section__row'],
            }], [appSectionTargetRef(), nativeSubmitFormTargetRef(), actionFeedbackStatusTargetRef(), loadingEmptyErrorStateTargetRef(), collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Open service write boundary',
              done: false,
            }, {
              id: 2,
              title: 'Verify generated create method',
              done: true,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            collectionEntityName: 'TaskItem',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
            createMethods: [{
              methodName: 'createTaskItem',
              inputFieldNames: ['title', 'done'],
            }],
          }],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done'],
              actionName: 'create',
              submitButtonText: 'Create task',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'create',
            }, {
              targetRef: loadingEmptyErrorStateTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
              promiseExpression: 'taskItemsPromise',
              pendingText: 'Loading tasks...',
              fulfilledLocalName: 'loadedTaskItems',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'loadedTaskItems.length === 0',
              rejectedLocalName: 'error',
              rejectedText: 'Could not load tasks.',
              fulfilledContentComposition: {
                targetRef: collectionTableTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                collectionExpression: 'loadedTaskItems',
                itemLocalName: 'taskItem',
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
            asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'createTaskItem',
            serviceCallResultMemberName: 'taskItemsPromise',
            serviceCallArgumentExpressions: ['this.title', 'this.done'],
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-service-complete',
      title: 'Component-pair task table with service-backed row completion',
      description: 'Runnable app shell assembled from caller domain fields, a generated service collection boundary with an explicit update method, promise-backed table state, and a row action that refreshes from the service call result.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/service-complete-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('service-complete-task-table-decisions', 'service complete task table explicit choices', [
            taskDomainDecision({
              actions: [completeTaskAction()],
            }),
            sourcePlacementDecision({
              appName: 'Service Complete Task Table',
              baseName: 'Service Complete Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/service-complete-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'complete',
              header: 'Complete',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['service-complete-task-table'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['service-complete-task-table__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'service-complete-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['service-complete-task-table__row'],
            }], [appSectionTargetRef(), loadingEmptyErrorStateTargetRef(), collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Trace row command service call',
              done: false,
            }, {
              id: 2,
              title: 'Keep completed rows visible',
              done: true,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            collectionEntityName: 'TaskItem',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
            updateMethods: [{
              methodName: 'completeTaskItem',
              inputFieldNames: ['done'],
            }],
          }],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: loadingEmptyErrorStateTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
              promiseExpression: 'taskItemsPromise',
              pendingText: 'Loading tasks...',
              fulfilledLocalName: 'loadedTaskItems',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'loadedTaskItems.length === 0',
              rejectedLocalName: 'error',
              rejectedText: 'Could not load tasks.',
              fulfilledContentComposition: {
                targetRef: collectionTableTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                collectionExpression: 'loadedTaskItems',
                itemLocalName: 'taskItem',
                actionHandlerExpressions: [{
                  actionName: 'complete',
                  handlerExpression: 'complete(taskItem)',
                }],
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
            asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'complete',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItemRecord' },
            ],
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'completeTaskItem',
            serviceCallResultMemberName: 'taskItemsPromise',
            serviceCallArgumentExpressions: ['taskItem.id', 'true'],
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-section-service-create-and-complete',
      title: 'Component-pair task section with service-backed create and row completion',
      description: 'Runnable app shell assembled from caller domain fields, a generated service collection boundary with explicit create and update methods, a native submit form, mutable async table state, and a row command that refreshes from the service call result.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/service-create-complete-task-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('service-create-complete-task-section-decisions', 'service create complete task section explicit choices', [
            taskDomainDecision({
              actions: [
                createTaskAction({
                  inputFieldNames: ['title', 'done'],
                }),
                completeTaskAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Service Create Complete Task Section',
              baseName: 'Service Create Complete Task Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/service-create-complete-task-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'complete',
              header: 'Complete',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            interactionFeedbackDecision([{
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-create-status',
            }, {
              actionName: 'complete',
              statusMemberName: 'completeStatusMessage',
              statusText: 'Task completed.',
              statusId: 'task-complete-status',
            }], [actionFeedbackStatusTargetRef(), domainCommandActionTargetRef(), localViewModelStateTargetRef()]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['service-create-complete-task-section'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['service-create-complete-task-section__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['service-create-complete-task-section__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['service-create-complete-task-section__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'service-create-complete-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['service-create-complete-task-section__row'],
            }], [appSectionTargetRef(), nativeSubmitFormTargetRef(), actionFeedbackStatusTargetRef(), loadingEmptyErrorStateTargetRef(), collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Create a service-backed task',
              done: false,
            }, {
              id: 2,
              title: 'Complete a row command',
              done: true,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            collectionEntityName: 'TaskItem',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
            createMethods: [{
              methodName: 'createTaskItem',
              inputFieldNames: ['title', 'done'],
            }],
            updateMethods: [{
              methodName: 'completeTaskItem',
              inputFieldNames: ['done'],
            }],
          }],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childCompositions: [{
              targetRef: nativeSubmitFormTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
              fieldNames: ['title', 'done'],
              actionName: 'create',
              submitButtonText: 'Create task',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'create',
            }, {
              targetRef: actionFeedbackStatusTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
              actionName: 'complete',
            }, {
              targetRef: loadingEmptyErrorStateTargetRef(),
              compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
              promiseExpression: 'taskItemsPromise',
              pendingText: 'Loading tasks...',
              fulfilledLocalName: 'loadedTaskItems',
              emptyStateText: 'No tasks yet.',
              emptyStateConditionExpression: 'loadedTaskItems.length === 0',
              rejectedLocalName: 'error',
              rejectedText: 'Could not load tasks.',
              fulfilledContentComposition: {
                targetRef: collectionTableTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                collectionExpression: 'loadedTaskItems',
                itemLocalName: 'taskItem',
                actionHandlerExpressions: [{
                  actionName: 'complete',
                  handlerExpression: 'complete(taskItem)',
                }],
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
            asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'createTaskItem',
            serviceCallResultMemberName: 'taskItemsPromise',
            serviceCallArgumentExpressions: ['this.title', 'this.done'],
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'complete',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItemRecord' },
            ],
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'completeTaskItem',
            serviceCallResultMemberName: 'taskItemsPromise',
            serviceCallArgumentExpressions: ['taskItem.id', 'true'],
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-section-service-filter-create-complete',
      title: 'Component-pair task section with service-backed query controls, create, and row completion',
      description: 'Runnable app shell assembled from caller domain fields, a generated service collection boundary with explicit filter/create/update methods, query-state preservation, ordered mixed app-section content, a native submit form, section-owned all/open/completed query controls, mutable async table state, and row command feedback.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/service-filter-create-complete-task-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('service-filter-create-complete-task-section-decisions', 'service filter create complete task section explicit choices', [
            taskDomainDecision({
              actions: [
                showAllTaskItemsAction(),
                showOpenTaskItemsAction(),
                showCompletedTaskItemsAction(),
                createTaskAction({
                  inputFieldNames: ['title', 'done'],
                }),
                completeTaskAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Service Filter Create Complete Task Section',
              baseName: 'Service Filter Create Complete Task Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/service-filter-create-complete-task-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'complete',
              header: 'Complete',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            interactionFeedbackDecision([{
              actionName: 'showAllTaskItems',
              statusMemberName: 'allFilterStatusMessage',
              statusText: 'Showing all tasks.',
              statusId: 'task-all-filter-status',
            }, {
              actionName: 'showOpenTaskItems',
              statusMemberName: 'openFilterStatusMessage',
              statusText: 'Showing open tasks.',
              statusId: 'task-open-filter-status',
            }, {
              actionName: 'showCompletedTaskItems',
              statusMemberName: 'completedFilterStatusMessage',
              statusText: 'Showing completed tasks.',
              statusId: 'task-completed-filter-status',
            }, {
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-create-status',
            }, {
              actionName: 'complete',
              statusMemberName: 'completeStatusMessage',
              statusText: 'Task completed.',
              statusId: 'task-complete-status',
            }], [actionFeedbackStatusTargetRef(), domainCommandActionTargetRef(), localViewModelStateTargetRef()]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['service-filter-create-complete-task-section'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['service-filter-create-complete-task-section__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Button,
              actionName: 'showAllTaskItems',
              classTokens: ['service-filter-create-complete-task-section__filter-button'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Button,
              actionName: 'showOpenTaskItems',
              classTokens: ['service-filter-create-complete-task-section__filter-button'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Button,
              actionName: 'showCompletedTaskItems',
              classTokens: ['service-filter-create-complete-task-section__filter-button'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['service-filter-create-complete-task-section__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['service-filter-create-complete-task-section__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'service-filter-create-complete-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['service-filter-create-complete-task-section__row'],
            }], [appSectionTargetRef(), nativeSubmitFormTargetRef(), nativeButtonTargetRef(), actionFeedbackStatusTargetRef(), loadingEmptyErrorStateTargetRef(), collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Filter completed service rows',
              done: true,
            }, {
              id: 2,
              title: 'Create a new service-backed row',
              done: false,
            }, {
              id: 3,
              title: 'Complete a row command',
              done: false,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            collectionEntityName: 'TaskItem',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
            filterMethods: [{
              methodName: 'listTaskItemsByDone',
              fieldName: 'done',
              parameterName: 'done',
            }],
            createMethods: [{
              methodName: 'createTaskItem',
              inputFieldNames: ['title', 'done'],
            }],
            updateMethods: [{
              methodName: 'completeTaskItem',
              inputFieldNames: ['done'],
            }],
            queryStates: [{
              stateMemberName: 'taskItemDoneFilter',
              stateTypeText: 'boolean | null',
              initialValueExpression: 'null',
              inactiveValueExpression: 'null',
              reloadMethodName: 'reloadTaskItems',
              resultMemberName: 'taskItemsPromise',
              filterMethodName: 'listTaskItemsByDone',
            }],
          }],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childContent: [{
              composition: {
                targetRef: nativeSubmitFormTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
                fieldNames: ['title', 'done'],
                actionName: 'create',
                submitButtonText: 'Create task',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'create',
              },
            }, {
              invocation: {
                targetRef: nativeButtonTargetRef(),
                actionName: 'showAllTaskItems',
                buttonText: 'Show all tasks',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'showAllTaskItems',
              },
            }, {
              invocation: {
                targetRef: nativeButtonTargetRef(),
                actionName: 'showOpenTaskItems',
                buttonText: 'Show open tasks',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'showOpenTaskItems',
              },
            }, {
              invocation: {
                targetRef: nativeButtonTargetRef(),
                actionName: 'showCompletedTaskItems',
                buttonText: 'Show completed tasks',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'showCompletedTaskItems',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'complete',
              },
            }, {
              composition: {
                targetRef: loadingEmptyErrorStateTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
                promiseExpression: 'taskItemsPromise',
                pendingText: 'Loading tasks...',
                fulfilledLocalName: 'loadedTaskItems',
                emptyStateText: 'No tasks yet.',
                emptyStateConditionExpression: 'loadedTaskItems.length === 0',
                rejectedLocalName: 'error',
                rejectedText: 'Could not load tasks.',
                fulfilledContentComposition: {
                  targetRef: collectionTableTargetRef(),
                  compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                  collectionExpression: 'loadedTaskItems',
                  itemLocalName: 'taskItem',
                  actionHandlerExpressions: [{
                    actionName: 'complete',
                    handlerExpression: 'complete(taskItem)',
                  }],
                },
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
            asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'showAllTaskItems',
            serviceQueryStateMemberName: 'taskItemDoneFilter',
            serviceQueryStateValueExpression: 'null',
            serviceQueryReloadMethodName: 'reloadTaskItems',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'showOpenTaskItems',
            serviceQueryStateMemberName: 'taskItemDoneFilter',
            serviceQueryStateValueExpression: 'false',
            serviceQueryReloadMethodName: 'reloadTaskItems',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'showCompletedTaskItems',
            serviceQueryStateMemberName: 'taskItemDoneFilter',
            serviceQueryStateValueExpression: 'true',
            serviceQueryReloadMethodName: 'reloadTaskItems',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'createTaskItem',
            serviceCallRefreshMethodName: 'reloadTaskItems',
            serviceCallArgumentExpressions: ['this.title', 'this.done'],
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'complete',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItemRecord' },
            ],
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'completeTaskItem',
            serviceCallRefreshMethodName: 'reloadTaskItems',
            serviceCallArgumentExpressions: ['taskItem.id', 'true'],
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-section-service-search',
      title: 'Component-pair task section with service-backed text search',
      description: 'Runnable app shell assembled from explicit service collection support, text query state, generated service text predicate, search/clear actions, action feedback, and promise-backed table composition.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/service-search-task-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('service-search-task-section-decisions', 'service search task section explicit choices', [
            taskDomainDecision({
              actions: [
                searchTaskItemsAction(),
                clearTaskItemSearchAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Service Search Task Section',
              baseName: 'Service Search Task Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/service-search-task-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            interactionFeedbackDecision([{
              actionName: 'searchTaskItems',
              statusMemberName: 'searchStatusMessage',
              statusText: 'Search applied.',
              statusId: 'task-search-status',
            }, {
              actionName: 'clearTaskItemSearch',
              statusMemberName: 'clearSearchStatusMessage',
              statusText: 'Search cleared.',
              statusId: 'task-clear-search-status',
            }], [actionFeedbackStatusTargetRef(), domainCommandActionTargetRef(), localViewModelStateTargetRef()]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['service-search-task-section'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
              fieldName: 'title',
              classTokens: ['service-search-task-section__search-field'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Button,
              actionName: 'searchTaskItems',
              classTokens: ['service-search-task-section__search-button'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Button,
              actionName: 'clearTaskItemSearch',
              classTokens: ['service-search-task-section__search-button'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['service-search-task-section__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['service-search-task-section__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'service-search-task-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['service-search-task-section__row'],
            }], [appSectionTargetRef(), fieldGroupTargetRef(), nativeButtonTargetRef(), actionFeedbackStatusTargetRef(), loadingEmptyErrorStateTargetRef(), collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Search service rows',
              done: false,
            }, {
              id: 2,
              title: 'Review generated query state',
              done: true,
            }, {
              id: 3,
              title: 'Clear task search',
              done: false,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            collectionEntityName: 'TaskItem',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
            filterMethods: [{
              methodName: 'searchTaskItemsByTitle',
              fieldName: 'title',
              parameterName: 'query',
              predicateKind: AppBuilderServiceCollectionFilterPredicateKind.TextContains,
            }],
            queryStates: [{
              stateMemberName: 'taskItemTitleQuery',
              stateTypeText: 'string',
              initialValueExpression: "''",
              inactiveValueExpression: "''",
              reloadMethodName: 'reloadTaskItemsByTitle',
              resultMemberName: 'taskItemsPromise',
              filterMethodName: 'searchTaskItemsByTitle',
            }],
          }],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childContent: [{
              invocation: {
                targetRef: fieldGroupTargetRef(),
                fieldName: 'title',
                bindingExpression: 'taskItemTitleQuery',
                innerControlPatternId: AppBuilderControlPatternId.NativeTextInput,
                labelText: 'Search tasks',
                fieldControlId: 'task-search-query',
              },
            }, {
              invocation: {
                targetRef: nativeButtonTargetRef(),
                actionName: 'searchTaskItems',
                buttonText: 'Search tasks',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'searchTaskItems',
              },
            }, {
              invocation: {
                targetRef: nativeButtonTargetRef(),
                actionName: 'clearTaskItemSearch',
                buttonText: 'Clear search',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'clearTaskItemSearch',
              },
            }, {
              composition: {
                targetRef: loadingEmptyErrorStateTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
                promiseExpression: 'taskItemsPromise',
                pendingText: 'Loading tasks...',
                fulfilledLocalName: 'loadedTaskItems',
                emptyStateText: 'No matching tasks.',
                emptyStateConditionExpression: 'loadedTaskItems.length === 0',
                rejectedLocalName: 'error',
                rejectedText: 'Could not search tasks.',
                fulfilledContentComposition: {
                  targetRef: collectionTableTargetRef(),
                  compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                  collectionExpression: 'loadedTaskItems',
                  itemLocalName: 'taskItem',
                },
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
            asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'searchTaskItems',
            serviceQueryStateMemberName: 'taskItemTitleQuery',
            serviceQueryReloadMethodName: 'reloadTaskItemsByTitle',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'clearTaskItemSearch',
            serviceQueryStateMemberName: 'taskItemTitleQuery',
            serviceQueryStateValueExpression: "''",
            serviceQueryReloadMethodName: 'reloadTaskItemsByTitle',
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-section-service-search-create-complete',
      title: 'Component-pair task section with service-backed text search, create, and row completion',
      description: 'Runnable app shell assembled from explicit service collection support, text query state, generated service text predicate, native create form, row completion action, action feedback, active search reload, and promise-backed table composition.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/service-search-create-complete-task-section.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('service-search-create-complete-task-section-decisions', 'service search create complete task section explicit choices', [
            taskDomainDecision({
              actions: [
                searchTaskItemsAction(),
                clearTaskItemSearchAction(),
                createTaskAction({
                  inputFieldNames: ['title', 'done'],
                }),
                completeTaskAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Service Search Create Complete Task Section',
              baseName: 'Service Search Create Complete Task Section',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/service-search-create-complete-task-section.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [
                  AppBuilderLocalStatePolicy.ViewModelLocalState,
                ],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Task',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'complete',
              header: 'Complete',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            interactionFeedbackDecision([{
              actionName: 'searchTaskItems',
              statusMemberName: 'searchStatusMessage',
              statusText: 'Search applied.',
              statusId: 'task-search-status',
            }, {
              actionName: 'clearTaskItemSearch',
              statusMemberName: 'clearSearchStatusMessage',
              statusText: 'Search cleared.',
              statusId: 'task-clear-search-status',
            }, {
              actionName: 'create',
              statusMemberName: 'createStatusMessage',
              statusText: 'Task saved.',
              statusId: 'task-create-status',
            }, {
              actionName: 'complete',
              statusMemberName: 'completeStatusMessage',
              statusText: 'Task completed.',
              statusId: 'task-complete-status',
            }], [actionFeedbackStatusTargetRef(), domainCommandActionTargetRef(), localViewModelStateTargetRef()]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
              classTokens: ['service-search-create-complete-task-section'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
              fieldName: 'title',
              classTokens: ['service-search-create-complete-task-section__field'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Form,
              classTokens: ['service-search-create-complete-task-section__form'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Button,
              actionName: 'searchTaskItems',
              classTokens: ['service-search-create-complete-task-section__button'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.Button,
              actionName: 'clearTaskItemSearch',
              classTokens: ['service-search-create-complete-task-section__button'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
              classTokens: ['service-search-create-complete-task-section__status'],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['service-search-create-complete-task-section__table'],
              dataAttributes: [{ name: 'data-au-role', value: 'service-search-create-complete-task-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['service-search-create-complete-task-section__row'],
            }], [appSectionTargetRef(), fieldGroupTargetRef(), nativeSubmitFormTargetRef(), nativeButtonTargetRef(), actionFeedbackStatusTargetRef(), loadingEmptyErrorStateTargetRef(), collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Search before creating rows',
              done: false,
            }, {
              id: 2,
              title: 'Complete a searched row',
              done: false,
            }, {
              id: 3,
              title: 'Review search preservation',
              done: true,
            }]),
          ])],
          serviceCollections: [{
            sourceTargetPath: 'src/services/task-item-service.ts',
            serviceClassName: 'TaskItemService',
            componentMemberName: 'taskItemService',
            collectionEntityName: 'TaskItem',
            recordTypeName: 'TaskItemRecord',
            loadMethodName: 'listTaskItems',
            filterMethods: [{
              methodName: 'searchTaskItemsByTitle',
              fieldName: 'title',
              parameterName: 'query',
              predicateKind: AppBuilderServiceCollectionFilterPredicateKind.TextContains,
            }],
            createMethods: [{
              methodName: 'createTaskItem',
              inputFieldNames: ['title', 'done'],
            }],
            updateMethods: [{
              methodName: 'completeTaskItem',
              inputFieldNames: ['done'],
            }],
            queryStates: [{
              stateMemberName: 'taskItemTitleQuery',
              stateTypeText: 'string',
              initialValueExpression: "''",
              inactiveValueExpression: "''",
              reloadMethodName: 'reloadTaskItemsByTitle',
              resultMemberName: 'taskItemsPromise',
              filterMethodName: 'searchTaskItemsByTitle',
            }],
          }],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: appSectionTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
            childContent: [{
              invocation: {
                targetRef: fieldGroupTargetRef(),
                fieldName: 'title',
                bindingExpression: 'taskItemTitleQuery',
                innerControlPatternId: AppBuilderControlPatternId.NativeTextInput,
                labelText: 'Search tasks',
                fieldControlId: 'task-search-query',
              },
            }, {
              invocation: {
                targetRef: nativeButtonTargetRef(),
                actionName: 'searchTaskItems',
                buttonText: 'Search tasks',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'searchTaskItems',
              },
            }, {
              invocation: {
                targetRef: nativeButtonTargetRef(),
                actionName: 'clearTaskItemSearch',
                buttonText: 'Clear search',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'clearTaskItemSearch',
              },
            }, {
              composition: {
                targetRef: nativeSubmitFormTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
                fieldNames: ['title', 'done'],
                actionName: 'create',
                submitButtonText: 'Create task',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'create',
              },
            }, {
              composition: {
                targetRef: actionFeedbackStatusTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.ActionFeedbackStatus,
                actionName: 'complete',
              },
            }, {
              composition: {
                targetRef: loadingEmptyErrorStateTargetRef(),
                compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
                promiseExpression: 'taskItemsPromise',
                pendingText: 'Loading tasks...',
                fulfilledLocalName: 'loadedTaskItems',
                emptyStateText: 'No matching tasks.',
                emptyStateConditionExpression: 'loadedTaskItems.length === 0',
                rejectedLocalName: 'error',
                rejectedText: 'Could not load searched tasks.',
                fulfilledContentComposition: {
                  targetRef: collectionTableTargetRef(),
                  compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
                  collectionExpression: 'loadedTaskItems',
                  itemLocalName: 'taskItem',
                  actionHandlerExpressions: [{
                    actionName: 'complete',
                    handlerExpression: 'complete(taskItem)',
                  }],
                },
              },
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: asyncDataSourceTargetRef(),
            asyncDataMemberName: 'taskItemsPromise',
            asyncDataPromiseType: "ReturnType<TaskItemService['listTaskItems']>",
            asyncDataInitializerExpression: 'this.taskItemService.listTaskItems()',
            asyncDataMemberMutability: AppBuilderSourceLoweringAsyncDataMemberMutability.Mutable,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'searchTaskItems',
            serviceQueryStateMemberName: 'taskItemTitleQuery',
            serviceQueryReloadMethodName: 'reloadTaskItemsByTitle',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'clearTaskItemSearch',
            serviceQueryStateMemberName: 'taskItemTitleQuery',
            serviceQueryStateValueExpression: "''",
            serviceQueryReloadMethodName: 'reloadTaskItemsByTitle',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'create',
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'createTaskItem',
            serviceCallRefreshMethodName: 'reloadTaskItemsByTitle',
            serviceCallArgumentExpressions: ['this.title', 'this.done'],
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'complete',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItemRecord' },
            ],
            serviceMemberName: 'taskItemService',
            serviceMethodName: 'completeTaskItem',
            serviceCallRefreshMethodName: 'reloadTaskItemsByTitle',
            serviceCallArgumentExpressions: ['taskItem.id', 'true'],
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-local-sort',
      title: 'Component-pair task table with caller-supplied local sorting',
      description: 'Runnable app shell assembled from explicit local collection state, sortable table metadata, caller sort handler wiring, and a caller-owned sort method body.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/sortable-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('sortable-task-table-component-decisions', 'sortable task table component explicit choices', [
            taskDomainDecision({
              actions: [sortByTitleTaskAction()],
            }),
            sourcePlacementDecision({
              appName: 'Sortable Task Table',
              baseName: 'Sortable Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/sortable-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
              sortable: true,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }], [{
              featureId: AppBuilderCollectionFeatureId.LocalSorting,
              fieldNames: ['title'],
              initiallyEnabled: true,
              summary: 'The caller chose a local title sort and supplied the handler/method body explicitly.',
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Write project brief',
              done: false,
            }, {
              id: 2,
              title: 'Confirm launch checklist',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
            sortHandlerExpressions: [{
              fieldName: 'title',
              handlerExpression: 'sortByTitle()',
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'sortByTitle',
            methodBodyStatements: "this.taskItems.sort((left, right) => left.title.localeCompare(right.title));",
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-local-filter',
      title: 'Component-pair task table with caller-supplied local filtering',
      description: 'Runnable app shell assembled from explicit local collection state, filterable table metadata, caller filter binding, and generated local query state.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/filterable-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('filterable-task-table-component-decisions', 'filterable task table component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Filterable Task Table',
              baseName: 'Filterable Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/filterable-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
              filterable: true,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }], [{
              featureId: AppBuilderCollectionFeatureId.LocalFiltering,
              fieldNames: ['title'],
              initiallyEnabled: true,
              summary: 'The caller chose local title filtering and supplied the filter binding explicitly.',
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Write project brief',
              done: false,
            }, {
              id: 2,
              title: 'Confirm launch checklist',
              done: true,
            }, {
              id: 3,
              title: 'Review onboarding notes',
              done: false,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'filteredTaskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No matching tasks.',
            emptyStateConditionExpression: 'filteredTaskItems.length === 0',
            filterBindingExpressions: [{
              fieldName: 'title',
              bindingExpression: 'titleFilter',
            }],
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-local-pagination',
      title: 'Component-pair task table with caller-supplied local pagination',
      description: 'Runnable app shell assembled from explicit local collection state, paginated table metadata, caller pagination controls, and generated local page state.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/paginated-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('paginated-task-table-component-decisions', 'paginated task table component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Paginated Task Table',
              baseName: 'Paginated Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/paginated-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }], [{
              featureId: AppBuilderCollectionFeatureId.LocalPagination,
              pageSize: 2,
              initiallyEnabled: true,
              summary: 'The caller chose local pagination and supplied the page size plus control expressions explicitly.',
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Write project brief',
              done: false,
            }, {
              id: 2,
              title: 'Confirm launch checklist',
              done: true,
            }, {
              id: 3,
              title: 'Review onboarding notes',
              done: false,
            }, {
              id: 4,
              title: 'Send stakeholder update',
              done: true,
            }, {
              id: 5,
              title: 'Archive planning notes',
              done: false,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'pagedTaskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
            paginationPreviousHandlerExpression: 'previousTaskItemsPage()',
            paginationNextHandlerExpression: 'nextTaskItemsPage()',
            paginationCurrentPageExpression: 'taskItemsPage',
            paginationPageCountExpression: 'taskItemsPageCount',
            paginationPreviousButtonText: 'Previous',
            paginationNextButtonText: 'Next',
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-row-selection',
      title: 'Component-pair task table with explicit scalar row selection',
      description: 'Runnable app shell assembled from explicit local collection state, scalar identity policy, caller row-selection control expressions, and generated selected-id state.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/selectable-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('selectable-task-table-component-decisions', 'selectable task table component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Selectable Task Table',
              baseName: 'Selectable Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/selectable-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }], [{
              featureId: AppBuilderCollectionFeatureId.RowSelection,
              initiallyEnabled: true,
              summary: 'The caller chose local row selection and supplied scalar identity plus table control expressions explicitly.',
            }]),
            collectionIdentityPolicyDecision({
              mode: AppBuilderCollectionIdentityMode.ScalarField,
              requiredBy: [AppBuilderCollectionIdentityUse.RowSelection],
              fieldName: 'id',
            }),
            seedDataDecision([{
              id: 1,
              title: 'Write project brief',
              done: false,
            }, {
              id: 2,
              title: 'Confirm launch checklist',
              done: true,
            }, {
              id: 3,
              title: 'Review onboarding notes',
              done: false,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
            rowSelectionCheckedExpression: 'selectedTaskItemIds.includes(taskItem.id)',
            rowSelectionToggleHandlerExpression: 'toggleTaskItemSelection(taskItem)',
            rowSelectionColumnHeaderText: 'Select',
            rowSelectionCheckboxLabelExpression: "'Select ' + taskItem.title",
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-batch-actions',
      title: 'Component-pair task table with explicit local batch action',
      description: 'Runnable app shell assembled from explicit scalar row selection plus a caller-owned collection-scoped batch action button and method body.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/batch-task-table.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('batch-task-table-component-decisions', 'batch task table component explicit choices', [
            taskDomainDecision({
              actions: [deleteSelectedTaskItemsAction()],
            }),
            sourcePlacementDecision({
              appName: 'Batch Task Table',
              baseName: 'Batch Task Table',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/batch-task-table.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }], [{
              featureId: AppBuilderCollectionFeatureId.RowSelection,
              initiallyEnabled: true,
              summary: 'The caller chose local row selection before adding collection-scoped batch actions.',
            }, {
              featureId: AppBuilderCollectionFeatureId.BatchActions,
              initiallyEnabled: true,
              summary: 'The caller chose one explicit local batch action over selected scalar identities.',
            }]),
            collectionIdentityPolicyDecision({
              mode: AppBuilderCollectionIdentityMode.ScalarField,
              requiredBy: [
                AppBuilderCollectionIdentityUse.RowSelection,
                AppBuilderCollectionIdentityUse.BatchAction,
              ],
              fieldName: 'id',
            }),
            seedDataDecision([{
              id: 1,
              title: 'Draft onboarding plan',
              done: false,
            }, {
              id: 2,
              title: 'Ship accessibility pass',
              done: false,
            }, {
              id: 3,
              title: 'Review table states',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
            rowSelectionCheckedExpression: 'selectedTaskItemIds.includes(taskItem.id)',
            rowSelectionToggleHandlerExpression: 'toggleTaskItemSelection(taskItem)',
            rowSelectionColumnHeaderText: 'Select',
            rowSelectionCheckboxLabelExpression: "'Select ' + taskItem.title",
            batchActionControls: [{
              actionName: 'deleteSelectedTaskItems',
              handlerExpression: 'deleteSelectedTaskItems()',
              buttonText: 'Delete selected',
            }],
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'deleteSelectedTaskItems',
            methodBodyStatements: `const selectedIds = new Set(this.selectedTaskItemIds);
for (let index = this.taskItems.length - 1; index >= 0; index -= 1) {
  if (selectedIds.has(this.taskItems[index]!.id)) {
    this.taskItems.splice(index, 1);
  }
}
this.selectedTaskItemIds = [];`,
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-visual-hooks',
      title: 'Component-pair task table with caller-supplied visual hooks',
      description: 'Runnable app shell assembled from explicit local collection state, table projection inputs, and caller-supplied structural class/data hooks without generated CSS.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-table-hooks.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-table-hooks-component-decisions', 'task table visual hook component explicit choices', [
            taskDomainDecision(),
            sourcePlacementDecision({
              appName: 'Task Table Hooks',
              baseName: 'Task Table Hooks',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-table-hooks.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }]),
            visualClassHooksDecision([{
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
              classTokens: ['task-table'],
              dataAttributes: [{ name: 'data-au-role', value: 'collection-table' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableHeader,
              fieldName: 'title',
              classTokens: ['task-table__header'],
              dataAttributes: [{ name: 'data-field', value: 'title' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
              classTokens: ['task-table__row'],
              dataAttributes: [{ name: 'data-row', value: 'task' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableCell,
              fieldName: 'done',
              classTokens: ['task-table__cell'],
              dataAttributes: [{ name: 'data-field', value: 'done' }],
            }, {
              target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
              classTokens: ['task-table__empty'],
              dataAttributes: [{ name: 'data-state', value: 'empty' }],
            }], [collectionTableTargetRef()]),
            seedDataDecision([{
              id: 1,
              title: 'Review quarterly goals',
              done: false,
            }, {
              id: 2,
              title: 'Confirm team availability',
              done: true,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-row-action',
      title: 'Component-pair task table with row action',
      description: 'Runnable app shell assembled from explicit local collection state, an entity-scoped row action column, and a derived single-boolean complete command body.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-table-row-action.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-table-row-action-component-decisions', 'task table row action component explicit choices', [
            taskDomainDecision({
              actions: [completeTaskAction()],
            }),
            sourcePlacementDecision({
              appName: 'Task Table Row Action',
              baseName: 'Task Table Row Action',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-table-row-action.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'complete',
              header: 'Complete',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Prepare onboarding checklist',
              done: false,
            }, {
              id: 2,
              title: 'Send invoice reminder',
              done: false,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            fieldBindingExpressions: [{
              fieldName: 'title',
              bindingExpression: 'taskItem.title.toUpperCase()',
            }],
            actionHandlerExpressions: [{
              actionName: 'complete',
              handlerExpression: 'complete(taskItem)',
            }],
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
          },
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'complete',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItem' },
            ],
          }],
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-table-route-action',
      title: 'Component-pair task table with route action',
      description: 'Component-level table projection proving that an explicit navigation-scoped domain action column lowers to a router load link and remains visible to generated control-use verification.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-table-route-action.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-table-route-action-component-decisions', 'task table route action component explicit choices', [
            taskDomainDecision({
              actions: [openTaskAction()],
            }),
            sourcePlacementDecision({
              appName: 'Task Table Route Action',
              baseName: 'Task Table Route Action',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-table-route-action.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              routingPolicy: {
                routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
                areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
              },
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'openTask',
              header: 'Open',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
              routeInstruction: 'task-item-detail',
              routeParamsExpression: '{ taskId: taskItem.id }',
              linkText: 'Open',
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Prepare onboarding checklist',
              done: false,
            }, {
              id: 2,
              title: 'Send invoice reminder',
              done: false,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
          },
        },
      }),
    },
    {
      fixtureId: 'component-pair-task-command-actions',
      title: 'Component-pair task table with explicit command actions',
      description: 'Runnable app shell proving that caller-authored domain action kinds can flow through table row buttons, top-level command buttons, and explicit class-member bodies without app-builder inventing business behavior.',
      request: sourcePlanQuery({
        rootDir: '.',
        templatePath: 'src/task-command-actions.html',
        sourceLoweringComponentPair: {
          appShell: {
            entrypointPath: 'src/main.ts',
          },
          decisionBundles: [explicitDecisionBundle('task-command-actions-component-decisions', 'task command actions component explicit choices', [
            taskDomainDecision({
              actions: [
                updateTaskAction(),
                deleteTaskAction(),
                archiveTaskAction(),
                assignTaskAction(),
                submitTaskReportAction(),
                refreshTaskItemsAction(),
              ],
            }),
            sourcePlacementDecision({
              appName: 'Task Command Actions',
              baseName: 'Task Command Actions',
              resourceCarrier: AppBuilderResourceCarrier.Convention,
              sourceTargetPath: 'src/task-command-actions.ts',
            }),
            aureliaPolicyDecision({
              conventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
              statePolicy: {
                localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalCollection],
              },
            }),
            collectionProjectionDecision([{
              fieldName: 'title',
              header: 'Title',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
            }, {
              fieldName: 'done',
              header: 'Done',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
            }, {
              actionName: 'updateTask',
              header: 'Update',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }, {
              actionName: 'deleteTask',
              header: 'Delete',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }, {
              actionName: 'archiveTask',
              header: 'Archive',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }, {
              actionName: 'assignTask',
              header: 'Assign',
              displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
            }]),
            seedDataDecision([{
              id: 1,
              title: 'Review release notes',
              done: false,
            }, {
              id: 2,
              title: 'Confirm migration checklist',
              done: false,
            }]),
          ])],
          sourceLoweringLocalViewModelState: {
            targetRef: localViewModelStateTargetRef(),
          },
          sourceLoweringComposition: {
            targetRef: collectionTableTargetRef(),
            compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
            collectionExpression: 'taskItems',
            itemLocalName: 'taskItem',
            emptyStateText: 'No tasks yet.',
            emptyStateConditionExpression: 'taskItems.length === 0',
          },
          sourceLoweringTemplateInvocations: [{
            targetRef: nativeButtonTargetRef(),
            actionName: 'submitTaskReport',
            buttonText: 'Submit report',
          }, {
            targetRef: nativeButtonTargetRef(),
            actionName: 'refreshTaskItems',
            buttonText: 'Refresh tasks',
          }],
          sourceLoweringClassMemberInvocations: [{
            targetRef: domainCommandActionTargetRef(),
            actionName: 'updateTask',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItem' },
            ],
            methodBodyStatements: 'taskItem.title = taskItem.title.trim();',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'deleteTask',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItem' },
            ],
            methodBodyStatements: `const index = this.taskItems.findIndex((candidate) => candidate.id === taskItem.id);
if (index >= 0) {
  this.taskItems.splice(index, 1);
}`,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'archiveTask',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItem' },
            ],
            methodBodyStatements: 'taskItem.done = true;',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'assignTask',
            methodParameters: [
              { name: 'taskItem', typeText: 'TaskItem' },
            ],
            methodBodyStatements: 'taskItem.title = `${taskItem.title} (assigned)`;',
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'submitTaskReport',
            methodBodyStatements: `console.info('submit task report', this.taskItems.length);`,
          }, {
            targetRef: domainCommandActionTargetRef(),
            actionName: 'refreshTaskItems',
            methodBodyStatements: 'this.taskItems.sort((left, right) => left.title.localeCompare(right.title));',
          }],
        },
      }),
    },
  ];
}

function sourcePlanQuery(sourceLoweringSourcePlan) {
  return {
    kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
    sourceLoweringSourcePlan: {
      ...sourceLoweringSourcePlan,
    },
  };
}

function appShellTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.AppShell,
  };
}

function applicationAssemblyTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.ApplicationAssembly,
  };
}

function routerBackedListDetailTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.RouterBackedListDetail,
  };
}

function localViewModelStateTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.LocalViewModelState,
  };
}

function diStateClassTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.DiStateClass,
  };
}

function nativeSubmitFormTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.NativeSubmitForm,
  };
}

function domainBackedSubmitFormTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.DomainBackedSubmitForm,
  };
}

function fieldGroupTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ControlPattern,
    domain: AppBuilderOntologyDomain.Control,
    id: AppBuilderControlPatternId.FieldGroup,
  };
}

function nativeButtonTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ControlPattern,
    domain: AppBuilderOntologyDomain.Control,
    id: AppBuilderControlPatternId.NativeButton,
  };
}

function appSectionTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.AppSection,
  };
}

function collectionTableTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.CollectionTable,
  };
}

function collectionListTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.CollectionList,
  };
}

function collectionCardTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.CollectionCard,
  };
}

function loadingEmptyErrorStateTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.LoadingEmptyErrorState,
  };
}

function actionFeedbackStatusTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.ActionFeedbackStatus,
  };
}

function asyncDataSourceTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.AsyncDataSource,
  };
}

function domainCommandActionTargetRef() {
  return {
    kind: AppBuilderOntologyRowKind.ApplicationPattern,
    domain: AppBuilderOntologyDomain.ApplicationPattern,
    id: AppBuilderApplicationPatternId.DomainCommandAction,
  };
}

function projectDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Project',
      entityTypeName: 'Project',
      collectionMemberName: 'projects',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    },
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'name',
      title: 'Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      required: true,
    }, {
      name: 'phase',
      title: 'Phase',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }],
  }]);
}

function projectAssignmentDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Project',
      entityTypeName: 'Project',
      collectionMemberName: 'projects',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Assignment',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }],
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'Project',
      name: 'name',
      title: 'Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      required: true,
    }, {
      entityName: 'Project',
      name: 'phase',
      title: 'Phase',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      required: true,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'TaskItem',
      name: 'projectId',
      title: 'Project',
      valueKind: AppBuilderDomainFieldValueKind.Number,
      defaultValue: 1,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'project',
      title: 'Project',
      kind: AppBuilderDomainRelationshipKind.ReferenceOne,
      fromEntityName: 'TaskItem',
      toEntityName: 'Project',
      localFieldName: 'projectId',
      foreignFieldName: 'id',
      displayFieldName: 'name',
      required: true,
    }],
  }]);
}

function milestoneDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Milestone',
      entityTypeName: 'Milestone',
      collectionMemberName: 'milestones',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    },
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      required: true,
    }, {
      name: 'targetDate',
      title: 'Target Date',
      valueKind: AppBuilderDomainFieldValueKind.Date,
    }],
  }]);
}

function taskDomainDecision({
  actions = [],
  requiredFieldNames = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    },
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      ...(requiredFieldNames.includes('title') ? { required: true } : {}),
    }, {
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
      ...(requiredFieldNames.includes('done') ? { required: true } : {}),
    }],
  }]);
}

function taskCreateOptionsDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    },
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'priority',
      title: 'Priority',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      defaultValue: 'normal',
      options: [{
        value: 'low',
        title: 'Low',
      }, {
        value: 'normal',
        title: 'Normal',
      }, {
        value: 'urgent',
        title: 'Urgent',
      }],
    }, {
      name: 'labels',
      title: 'Labels',
      valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
      valueSetName: 'labelOptions',
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainValueSets,
    value: [{
      name: 'labelOptions',
      title: 'Labels',
      valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
      options: [{
        value: 'frontend',
        title: 'Frontend',
      }, {
        value: 'review',
        title: 'Review',
      }, {
        value: 'docs',
        title: 'Docs',
      }],
    }],
  }]);
}

function taskBrowserRelationshipDomainDecision({
  actions = [],
  includeReviewers = false,
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Contact',
      entityTypeName: 'ContactEntry',
      collectionMemberName: 'contacts',
      identityMemberName: 'contactId',
      identityValueKind: AppBuilderDomainIdentityValueKind.String,
    }],
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'TaskItem',
      name: 'assigneeId',
      title: 'Assignee',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      defaultValue: 'ada',
    }, ...(includeReviewers
      ? [{
          entityName: 'TaskItem',
          name: 'reviewerIds',
          title: 'Reviewers',
          valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
          defaultValue: ['ada'],
        }]
      : []), {
      entityName: 'ContactEntry',
      name: 'fullName',
      title: 'Full Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ContactEntry',
      name: 'email',
      title: 'Email',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'assignee',
      title: 'Assignee',
      kind: AppBuilderDomainRelationshipKind.ReferenceOne,
      fromEntityName: 'TaskItem',
      toEntityName: 'ContactEntry',
      localFieldName: 'assigneeId',
      foreignFieldName: 'contactId',
      displayFieldName: 'fullName',
      required: true,
    }, ...(includeReviewers
      ? [{
          name: 'reviewers',
          title: 'Reviewers',
          kind: AppBuilderDomainRelationshipKind.ReferenceMany,
          fromEntityName: 'TaskItem',
          toEntityName: 'ContactEntry',
          localFieldName: 'reviewerIds',
          foreignFieldName: 'contactId',
          displayFieldName: 'fullName',
          required: false,
        }]
      : [])],
  }]);
}

function taskObjectAssigneeRelationshipDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Contact',
      entityTypeName: 'ContactEntry',
      collectionMemberName: 'contacts',
      identityMemberName: 'contactId',
      identityValueKind: AppBuilderDomainIdentityValueKind.String,
    }],
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'ContactEntry',
      name: 'fullName',
      title: 'Full Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ContactEntry',
      name: 'email',
      title: 'Email',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'assignee',
      title: 'Assignee',
      kind: AppBuilderDomainRelationshipKind.ReferenceOne,
      fromEntityName: 'TaskItem',
      toEntityName: 'ContactEntry',
      localFieldName: 'assignee',
      localValueKind: AppBuilderDomainRelationshipLocalValueKind.Object,
      foreignFieldName: 'contactId',
      displayFieldName: 'fullName',
      required: true,
    }],
  }]);
}

function reviewObjectAssigneeDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Review',
      entityTypeName: 'ReviewItem',
      collectionMemberName: 'reviewItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Reviewer',
      entityTypeName: 'ReviewerProfile',
      collectionMemberName: 'reviewerProfiles',
      identityMemberName: 'reviewerId',
      identityValueKind: AppBuilderDomainIdentityValueKind.String,
    }],
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'ReviewItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ReviewItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'ReviewerProfile',
      name: 'displayName',
      title: 'Display Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ReviewerProfile',
      name: 'email',
      title: 'Email',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'reviewer',
      title: 'Reviewer',
      kind: AppBuilderDomainRelationshipKind.ReferenceOne,
      fromEntityName: 'ReviewItem',
      toEntityName: 'ReviewerProfile',
      localFieldName: 'reviewer',
      localValueKind: AppBuilderDomainRelationshipLocalValueKind.Object,
      foreignFieldName: 'reviewerId',
      displayFieldName: 'displayName',
      required: true,
    }],
  }]);
}

function taskObjectReviewersRelationshipDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Contact',
      entityTypeName: 'ContactEntry',
      collectionMemberName: 'contacts',
      identityMemberName: 'contactId',
      identityValueKind: AppBuilderDomainIdentityValueKind.String,
    }],
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'ContactEntry',
      name: 'fullName',
      title: 'Full Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ContactEntry',
      name: 'email',
      title: 'Email',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'reviewers',
      title: 'Reviewers',
      kind: AppBuilderDomainRelationshipKind.ReferenceMany,
      fromEntityName: 'TaskItem',
      toEntityName: 'ContactEntry',
      localFieldName: 'reviewers',
      localValueKind: AppBuilderDomainRelationshipLocalValueKind.Object,
      foreignFieldName: 'contactId',
      displayFieldName: 'fullName',
      required: false,
    }],
  }]);
}

function taskReviewersRelationshipDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Contact',
      entityTypeName: 'ContactEntry',
      collectionMemberName: 'contacts',
      identityMemberName: 'contactId',
      identityValueKind: AppBuilderDomainIdentityValueKind.String,
    }],
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'TaskItem',
      name: 'reviewerIds',
      title: 'Reviewers',
      valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
      defaultValue: ['ada'],
    }, {
      entityName: 'ContactEntry',
      name: 'fullName',
      title: 'Full Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ContactEntry',
      name: 'email',
      title: 'Email',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'reviewers',
      title: 'Reviewers',
      kind: AppBuilderDomainRelationshipKind.ReferenceMany,
      fromEntityName: 'TaskItem',
      toEntityName: 'ContactEntry',
      localFieldName: 'reviewerIds',
      foreignFieldName: 'contactId',
      displayFieldName: 'fullName',
      required: false,
    }],
  }]);
}

function taskRelationshipOverviewDomainDecision({
  actions = [],
  optionalEmbeddedRelationships = false,
  includeProjectReference = false,
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Contact',
      entityTypeName: 'ContactEntry',
      collectionMemberName: 'contacts',
      identityMemberName: 'contactId',
      identityValueKind: AppBuilderDomainIdentityValueKind.String,
    }, {
      entityTitle: 'Schedule',
      entityTypeName: 'ScheduleWindow',
      collectionMemberName: 'schedules',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Checkpoint',
      entityTypeName: 'CheckpointItem',
      collectionMemberName: 'checkpoints',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, ...(includeProjectReference
      ? [{
          entityTitle: 'Project',
          entityTypeName: 'Project',
          collectionMemberName: 'projects',
          identityMemberName: 'id',
          identityValueKind: AppBuilderDomainIdentityValueKind.Number,
        }]
      : [])],
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, ...(includeProjectReference
      ? [{
          entityName: 'TaskItem',
          name: 'projectId',
          title: 'Project',
          valueKind: AppBuilderDomainFieldValueKind.Number,
          defaultValue: 1,
        }]
      : []), {
      entityName: 'TaskItem',
      name: 'assigneeId',
      title: 'Assignee',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      defaultValue: 'ada',
    }, {
      entityName: 'TaskItem',
      name: 'reviewerIds',
      title: 'Reviewers',
      valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
      defaultValue: ['ada'],
    }, {
      entityName: 'ContactEntry',
      name: 'fullName',
      title: 'Full Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ContactEntry',
      name: 'email',
      title: 'Email',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ScheduleWindow',
      name: 'label',
      title: 'Label',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ScheduleWindow',
      name: 'confirmed',
      title: 'Confirmed',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'CheckpointItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'CheckpointItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'TaskEffort',
      name: 'summary',
      title: 'Summary',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskEffort',
      name: 'hours',
      title: 'Hours',
      valueKind: AppBuilderDomainFieldValueKind.Number,
    }, ...(includeProjectReference
      ? [{
          entityName: 'Project',
          name: 'name',
          title: 'Name',
          valueKind: AppBuilderDomainFieldValueKind.Text,
          required: true,
        }, {
          entityName: 'Project',
          name: 'phase',
          title: 'Phase',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }]
      : [])],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [...(includeProjectReference
      ? [{
          name: 'project',
          title: 'Project',
          kind: AppBuilderDomainRelationshipKind.ReferenceOne,
          fromEntityName: 'TaskItem',
          toEntityName: 'Project',
          localFieldName: 'projectId',
          foreignFieldName: 'id',
          displayFieldName: 'name',
          required: true,
        }]
      : []), {
      name: 'assignee',
      title: 'Assignee',
      kind: AppBuilderDomainRelationshipKind.ReferenceOne,
      fromEntityName: 'TaskItem',
      toEntityName: 'ContactEntry',
      localFieldName: 'assigneeId',
      foreignFieldName: 'contactId',
      displayFieldName: 'fullName',
      required: true,
    }, {
      name: 'reviewers',
      title: 'Reviewers',
      kind: AppBuilderDomainRelationshipKind.ReferenceMany,
      fromEntityName: 'TaskItem',
      toEntityName: 'ContactEntry',
      localFieldName: 'reviewerIds',
      foreignFieldName: 'contactId',
      displayFieldName: 'fullName',
      required: false,
    }, {
      name: 'schedule',
      title: 'Schedule',
      kind: AppBuilderDomainRelationshipKind.OwnsOne,
      fromEntityName: 'TaskItem',
      toEntityName: 'ScheduleWindow',
      localFieldName: 'schedule',
      displayFieldName: 'label',
      required: !optionalEmbeddedRelationships,
    }, {
      name: 'checkpoints',
      title: 'Checkpoints',
      kind: AppBuilderDomainRelationshipKind.OwnsMany,
      fromEntityName: 'TaskItem',
      toEntityName: 'CheckpointItem',
      localFieldName: 'checkpoints',
      displayFieldName: 'title',
      required: false,
    }, {
      name: 'effort',
      title: 'Effort',
      kind: AppBuilderDomainRelationshipKind.NestedValueObject,
      fromEntityName: 'TaskItem',
      toEntityName: 'TaskEffort',
      localFieldName: 'effort',
      displayFieldName: 'summary',
      required: !optionalEmbeddedRelationships,
    }],
  }]);
}

function taskRelationshipOverviewSeedDataDecision({
  includeProjectReference = false,
} = {}) {
  return seedDataDecision([{
    entityName: 'TaskItem',
    records: [{
      id: 1,
      title: 'Prepare release notes',
      done: false,
      ...(includeProjectReference ? { projectId: 1 } : {}),
      assigneeId: 'ada',
      reviewerIds: ['ada', 'grace'],
      schedule: {
        id: 101,
        label: 'Draft review',
        confirmed: true,
      },
      checkpoints: [{
        id: 1001,
        title: 'Draft summary',
        done: true,
      }, {
        id: 1002,
        title: 'Review changes',
        done: false,
      }],
      effort: {
        summary: 'Short focused pass',
        hours: 2,
      },
    }, {
      id: 2,
      title: 'Check deployment checklist',
      done: true,
      ...(includeProjectReference ? { projectId: 2 } : {}),
      assigneeId: 'grace',
      reviewerIds: ['ada'],
      schedule: {
        id: 102,
        label: 'Launch readiness',
        confirmed: false,
      },
      checkpoints: [{
        id: 2001,
        title: 'Confirm owners',
        done: true,
      }],
      effort: {
        summary: 'Review with owner',
        hours: 1,
      },
    }],
  }, {
    entityName: 'ContactEntry',
    records: [{
      contactId: 'ada',
      fullName: 'Ada Lovelace',
      email: 'ada@example.test',
    }, {
      contactId: 'grace',
      fullName: 'Grace Hopper',
      email: 'grace@example.test',
    }],
  }, ...(includeProjectReference
    ? [{
        entityName: 'Project',
        records: [{
          id: 1,
          name: 'Platform refresh',
          phase: 'Planning',
        }, {
          id: 2,
          name: 'Docs cleanup',
          phase: 'Active',
        }],
      }]
    : [])]);
}

function projectAssignmentSeedDataDecision() {
  return seedDataDecision([{
    entityName: 'Project',
    records: [{
      id: 1,
      name: 'Platform refresh',
      phase: 'Planning',
    }, {
      id: 2,
      name: 'Docs cleanup',
      phase: 'Active',
    }],
  }, {
    entityName: 'TaskItem',
    records: [{
      id: 1,
      title: 'Prepare release notes',
      done: false,
      projectId: 1,
    }, {
      id: 2,
      title: 'Check deployment checklist',
      done: true,
      projectId: 2,
    }, {
      id: 3,
      title: 'Collect preview feedback',
      done: false,
      projectId: 1,
    }],
  }]);
}

function taskReviewWorkflowSeedDataDecision() {
  return seedDataDecision([{
    entityName: 'TaskItem',
    records: [{
      id: 1,
      title: 'Prepare release notes',
      done: false,
      assigneeId: 'ada',
      reviewerIds: ['ada', 'grace'],
    }, {
      id: 2,
      title: 'Check deployment checklist',
      done: true,
      assigneeId: 'grace',
      reviewerIds: ['ada'],
    }],
  }, {
    entityName: 'ContactEntry',
    records: [{
      contactId: 'ada',
      fullName: 'Ada Lovelace',
      email: 'ada@example.test',
    }, {
      contactId: 'grace',
      fullName: 'Grace Hopper',
      email: 'grace@example.test',
    }],
  }]);
}

function taskCheckpointsRelationshipDomainDecision() {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Checkpoint',
      entityTypeName: 'CheckpointItem',
      collectionMemberName: 'checkpoints',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'CheckpointItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'CheckpointItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'checkpoints',
      title: 'Checkpoints',
      kind: AppBuilderDomainRelationshipKind.OwnsMany,
      fromEntityName: 'TaskItem',
      toEntityName: 'CheckpointItem',
      localFieldName: 'checkpoints',
      displayFieldName: 'title',
      required: false,
    }],
  }]);
}

function taskScheduleRelationshipDomainDecision() {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }, {
      entityTitle: 'Schedule',
      entityTypeName: 'ScheduleWindow',
      collectionMemberName: 'schedules',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'ScheduleWindow',
      name: 'label',
      title: 'Label',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'ScheduleWindow',
      name: 'confirmed',
      title: 'Confirmed',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'schedule',
      title: 'Schedule',
      kind: AppBuilderDomainRelationshipKind.OwnsOne,
      fromEntityName: 'TaskItem',
      toEntityName: 'ScheduleWindow',
      localFieldName: 'schedule',
      displayFieldName: 'label',
      required: true,
    }],
  }]);
}

function taskEffortRelationshipDomainDecision() {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: [{
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      entityName: 'TaskItem',
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskItem',
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      entityName: 'TaskEffort',
      name: 'summary',
      title: 'Summary',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      entityName: 'TaskEffort',
      name: 'hours',
      title: 'Hours',
      valueKind: AppBuilderDomainFieldValueKind.Number,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainRelationships,
    value: [{
      name: 'effort',
      title: 'Effort',
      kind: AppBuilderDomainRelationshipKind.NestedValueObject,
      fromEntityName: 'TaskItem',
      toEntityName: 'TaskEffort',
      localFieldName: 'effort',
      displayFieldName: 'summary',
      required: true,
    }],
  }]);
}

function taskFieldVarietyDomainDecision({
  actions = [],
} = {}) {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    },
  }, ...(actions.length === 0
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: actions,
      }]), {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'description',
      title: 'Description',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'estimateHours',
      title: 'Estimate Hours',
      valueKind: AppBuilderDomainFieldValueKind.Number,
      numericConstraints: {
        minimum: 0,
        maximum: 40,
        step: 1,
      },
    }, {
      name: 'progressPercent',
      title: 'Progress',
      valueKind: AppBuilderDomainFieldValueKind.Number,
      numericConstraints: {
        minimum: 0,
        maximum: 100,
        step: 5,
      },
    }, {
      name: 'dueDate',
      title: 'Due Date',
      valueKind: AppBuilderDomainFieldValueKind.Date,
    }, {
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      name: 'priority',
      title: 'Priority',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      defaultValue: 'normal',
      options: [{
        value: 'low',
        title: 'Low',
      }, {
        value: 'normal',
        title: 'Normal',
      }, {
        value: 'urgent',
        title: 'Urgent',
      }],
    }, {
      name: 'reviewType',
      title: 'Review Type',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      defaultValue: 'manual',
      options: [{
        value: 'manual',
        title: 'Manual',
      }, {
        value: 'automated',
        title: 'Automated',
      }, {
        value: 'peer',
        title: 'Peer',
      }],
    }, {
      name: 'labels',
      title: 'Labels',
      valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
      options: [{
        value: 'frontend',
        title: 'Frontend',
      }, {
        value: 'review',
        title: 'Review',
      }, {
        value: 'docs',
        title: 'Docs',
      }],
    }, {
      name: 'checkpoints',
      title: 'Checkpoints',
      valueKind: AppBuilderDomainFieldValueKind.ChoiceSet,
      options: [{
        value: 'requirements',
        title: 'Requirements',
      }, {
        value: 'implementation',
        title: 'Implementation',
      }, {
        value: 'review',
        title: 'Review',
      }],
    }],
  }]);
}

function taskNamedValueSetDomainDecision() {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    },
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    value: [{
      name: 'savePreferences',
      kind: AppBuilderDomainActionKind.Save,
      scope: AppBuilderDomainActionScope.Form,
      mutatesState: true,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      defaultValue: 'Update onboarding notes',
    }, {
      name: 'priority',
      title: 'Priority',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      defaultValue: 'normal',
    }, {
      name: 'reviewType',
      title: 'Review Type',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      defaultValue: 'manual',
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainValueSets,
    value: [{
      name: 'priorityOptions',
      title: 'Priorities',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      options: [{
        value: 'low',
        title: 'Low',
      }, {
        value: 'normal',
        title: 'Normal',
      }, {
        value: 'urgent',
        title: 'Urgent',
      }],
    }, {
      name: 'reviewTypeOptions',
      title: 'Review types',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      options: [{
        value: 'manual',
        title: 'Manual',
      }, {
        value: 'peer',
        title: 'Peer',
      }, {
        value: 'automated',
        title: 'Automated',
      }],
    }],
  }]);
}

function createTaskAction({
  inputFieldNames,
  targetEntityName,
} = {}) {
  return {
    name: 'create',
    kind: AppBuilderDomainActionKind.Create,
    scope: AppBuilderDomainActionScope.Form,
    mutatesState: true,
    ...(targetEntityName == null ? {} : { targetEntityName }),
    ...(inputFieldNames == null ? {} : { inputFieldNames }),
  };
}

function saveDraftAction({
  inputFieldNames,
} = {}) {
  return {
    name: 'saveDraft',
    kind: AppBuilderDomainActionKind.Save,
    scope: AppBuilderDomainActionScope.Form,
    mutatesState: true,
    ...(inputFieldNames == null ? {} : { inputFieldNames }),
  };
}

function resetDraftAction() {
  return {
    name: 'resetDraft',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Form,
    inputFieldNames: ['title', 'done'],
    mutatesState: true,
  };
}

function sortByTitleTaskAction() {
  return {
    name: 'sortByTitle',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Collection,
  };
}

function openTaskAction() {
  return {
    name: 'openTask',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Navigation,
    targetEntityName: 'TaskItem',
  };
}

function openProjectAction() {
  return {
    name: 'openProject',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Navigation,
    targetEntityName: 'Project',
  };
}

function createProjectAction() {
  return {
    name: 'createProject',
    kind: AppBuilderDomainActionKind.Create,
    scope: AppBuilderDomainActionScope.Form,
    targetEntityName: 'Project',
    inputFieldNames: ['name', 'phase'],
    mutatesState: true,
  };
}

function openMilestoneAction() {
  return {
    name: 'openMilestone',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Navigation,
    targetEntityName: 'Milestone',
  };
}

function completeTaskAction() {
  return {
    name: 'complete',
    kind: AppBuilderDomainActionKind.Complete,
    scope: AppBuilderDomainActionScope.Entity,
    mutatesState: true,
  };
}

function updateTaskAction() {
  return {
    name: 'updateTask',
    kind: AppBuilderDomainActionKind.Update,
    scope: AppBuilderDomainActionScope.Entity,
    targetEntityName: 'TaskItem',
    inputFieldNames: ['title'],
    mutatesState: true,
  };
}

function deleteTaskAction() {
  return {
    name: 'deleteTask',
    kind: AppBuilderDomainActionKind.Delete,
    scope: AppBuilderDomainActionScope.Entity,
    targetEntityName: 'TaskItem',
    mutatesState: true,
  };
}

function deleteSelectedTaskItemsAction() {
  return {
    name: 'deleteSelectedTaskItems',
    kind: AppBuilderDomainActionKind.Delete,
    scope: AppBuilderDomainActionScope.Collection,
    targetEntityName: 'TaskItem',
    mutatesState: true,
  };
}

function archiveTaskAction() {
  return {
    name: 'archiveTask',
    kind: AppBuilderDomainActionKind.Archive,
    scope: AppBuilderDomainActionScope.Entity,
    targetEntityName: 'TaskItem',
    inputFieldNames: ['done'],
    mutatesState: true,
  };
}

function assignTaskAction() {
  return {
    name: 'assignTask',
    kind: AppBuilderDomainActionKind.Assign,
    scope: AppBuilderDomainActionScope.Entity,
    targetEntityName: 'TaskItem',
    inputFieldNames: ['title'],
    mutatesState: true,
  };
}

function submitTaskReportAction() {
  return {
    name: 'submitTaskReport',
    kind: AppBuilderDomainActionKind.Submit,
    scope: AppBuilderDomainActionScope.Integration,
  };
}

function refreshTaskItemsAction() {
  return {
    name: 'refreshTaskItems',
    kind: AppBuilderDomainActionKind.Refresh,
    scope: AppBuilderDomainActionScope.Integration,
  };
}

function showCompletedTaskItemsAction() {
  return {
    name: 'showCompletedTaskItems',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Integration,
    targetEntityName: 'TaskItem',
  };
}

function showAllTaskItemsAction() {
  return {
    name: 'showAllTaskItems',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Integration,
    targetEntityName: 'TaskItem',
  };
}

function showOpenTaskItemsAction() {
  return {
    name: 'showOpenTaskItems',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Integration,
    targetEntityName: 'TaskItem',
  };
}

function searchTaskItemsAction() {
  return {
    name: 'searchTaskItems',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Integration,
    targetEntityName: 'TaskItem',
  };
}

function clearTaskItemSearchAction() {
  return {
    name: 'clearTaskItemSearch',
    kind: AppBuilderDomainActionKind.Custom,
    scope: AppBuilderDomainActionScope.Integration,
    targetEntityName: 'TaskItem',
  };
}

function noteDomainDecision() {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Note',
      entityTypeName: 'NoteItem',
      collectionMemberName: 'noteItems',
      identityMemberName: 'code',
      identityValueKind: AppBuilderDomainIdentityValueKind.String,
    },
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'archived',
      title: 'Archived',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }]);
}

function contactDomainDecision() {
  return domainModelDecision([{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Contact',
      entityTypeName: 'ContactEntry',
      collectionMemberName: 'contacts',
      identityMemberName: 'contactId',
      identityValueKind: AppBuilderDomainIdentityValueKind.String,
    },
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'fullName',
      title: 'Full Name',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'email',
      title: 'Email',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'active',
      title: 'Active',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }]);
}

function domainModelDecision(facetPayloads) {
  return {
    inputContractId: AppBuilderInputContractId.DomainModel,
    facetPayloads,
  };
}

function explicitDecisionBundle(bundleId, label, decisions) {
  return {
    bundleId,
    sourceId: AppBuilderDecisionBundleSource.ExplicitCallerSelection,
    label,
    decisions,
  };
}

function sourcePlacementDecision({
  appName,
  baseName,
  resourceCarrier,
  sourceTargetPath,
  sourcePatternParameterValues = [],
}) {
  return {
    inputContractId: AppBuilderInputContractId.SourcePlacement,
    facetPayloads: sourcePlacementFacetPayloads({
      appName,
      baseName,
      resourceCarrier,
      sourceTargetPath,
      sourcePatternParameterValues,
    }),
  };
}

function aureliaPolicyDecision({
  conventionPolicy,
  routingPolicy = null,
  statePolicy = null,
}) {
  return {
    inputContractId: AppBuilderInputContractId.AureliaPolicy,
    facetPayloads: aureliaPolicyFacetPayloads({
      conventionPolicy,
      routingPolicy,
      statePolicy,
    }),
  };
}

function sourcePlacementFacetPayloads({
  appName,
  baseName,
  resourceCarrier,
  sourceTargetPath,
  sourcePatternParameterValues = [],
}) {
  return [{
    inputFacetId: AppBuilderInputFacetId.SourceNaming,
    value: {
      appName,
      ...(baseName == null ? {} : { baseName }),
      ...(sourcePatternParameterValues.length === 0 ? {} : { sourcePatternParameterValues }),
    },
  }, ...(resourceCarrier == null
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
        value: {
          resourceCarrier,
        },
      }]), ...(sourceTargetPath == null
    ? []
    : [{
        inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
        value: sourceTargetPath,
      }])];
}

function aureliaPolicyFacetPayloads({
  conventionPolicy,
  routingPolicy = null,
  statePolicy = null,
}) {
  return [
    {
      inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
      value: conventionPolicy,
    },
    ...(routingPolicy == null
      ? []
      : [{
          inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
          value: routingPolicy,
        }]),
    ...(statePolicy == null
      ? []
      : [{
          inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
          value: statePolicy,
        }]),
  ];
}

function seedDataDecision(records) {
  return {
    inputContractId: AppBuilderInputContractId.SeedData,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
      value: records,
    }],
  };
}

function controlAccessibilityDecision(messages) {
  return {
    inputContractId: AppBuilderInputContractId.ControlAccessibility,
    facetPayloads: messages.map((message) => ({
      inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
      value: message,
    })),
  };
}

function interactionFeedbackDecision(feedbacks, targetRefs = []) {
  return {
    inputContractId: AppBuilderInputContractId.InteractionFeedback,
    ...(targetRefs.length === 0 ? {} : { targetRefs }),
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.ActionFeedback,
      value: feedbacks,
    }],
  };
}

function visualClassHooksDecision(hooks, targetRefs = []) {
  return {
    inputContractId: AppBuilderInputContractId.VisualStyleInput,
    ...(targetRefs.length === 0 ? {} : { targetRefs }),
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
      value: hooks,
    }],
  };
}

function collectionProjectionDecision(tableColumns, queryFeatures = []) {
  return {
    inputContractId: AppBuilderInputContractId.CollectionProjection,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
      value: tableColumns,
    }, ...(queryFeatures.length === 0
      ? []
      : [{
          inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
          value: queryFeatures,
      }])],
  };
}

function collectionIdentityPolicyDecision(identityPolicy) {
  return {
    inputContractId: AppBuilderInputContractId.CollectionProjection,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
      value: identityPolicy,
    }],
  };
}

function collectionDisplayProjectionDecision(displayFields) {
  return {
    inputContractId: AppBuilderInputContractId.CollectionProjection,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.CollectionDisplayFields,
      value: displayFields,
    }],
  };
}

function requestWithFixtureRoot(request, fixtureRoot) {
  return {
    ...request,
    sourceLoweringSourcePlan: {
      ...request.sourceLoweringSourcePlan,
      rootDir: fixtureRoot,
    },
  };
}

function slash(value) {
  return value.replaceAll(path.sep, '/');
}

async function resetGeneratedFixtureRoot(rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedFixtureRoot = path.resolve(appBuilderFixtureRoot);
  const expectedPrefix = `${resolvedFixtureRoot}${path.sep}`;
  if (!resolvedRoot.startsWith(expectedPrefix)) {
    throw new Error(`Refusing to reset generated app-builder fixture outside ${appBuilderFixtureRoot}: ${rootDir}`);
  }
  await rm(resolvedRoot, { recursive: true, force: true });
  await mkdir(resolvedRoot, { recursive: true });
}

async function writeSourcePlan(rootDir, sourcePlan) {
  for (const file of sourcePlan.files) {
    if (file.text?.text == null) {
      throw new Error(`Cannot materialize ${file.path}: source text is not present.`);
    }
    const filePath = path.join(rootDir, file.path);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.text.text);
  }
  for (const file of sourcePlan.projectTooling?.files ?? []) {
    const filePath = path.join(rootDir, file.path);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.text);
  }
}

function semanticFixtureManifestSnapshot(rootDir, options) {
  return normalizeFixtureRootValue({
    schemaVersion: 'semantic-generated-app-fixture.v1',
    fixtureRole: 'app-builder-generated-app-contract',
    fixtureId: options.fixtureId,
    title: options.title,
    description: options.description,
    appBuilderRequestPath: options.appBuilderRequestPath,
    appBuilderResponsePath: options.appBuilderResponsePath,
    expectedEffects: options.expectedEffects,
    expectedEffectKinds: options.expectedEffectKinds,
    effectContractIds: options.effectContractIds,
    ontologyTargetRefs: options.ontologyTargetRefs,
    controlUseInventoryRows: options.controlUseInventoryRows,
    sourcePlanWitnessRows: options.sourcePlanWitnessRows,
  }, rootDir);
}

function generatedFixtureIndexRow(spec, value, artifactMetrics) {
  const fixtureRoot = spec.fixtureId;
  const controlUseControlPatternIds = controlUseInventoryControlPatternIds(value.controlUseInventoryRows);
  const controlUseLeafControlIds = controlUseInventoryLeafControlIds(value.controlUseInventoryRows);
  const generatedSourceByteCount = sourcePlanSourceByteCount(value.sourcePlan);
  const generatedProjectToolingByteCount = sourcePlanProjectToolingByteCount(value.sourcePlan);
  return {
    fixtureId: spec.fixtureId,
    title: spec.title,
    description: spec.description,
    appBuilderRequestPath: `${fixtureRoot}/app-builder-request.json`,
    appBuilderResponsePath: `${fixtureRoot}/app-builder-response.json`,
    semanticFixturePath: `${fixtureRoot}/semantic-fixture.json`,
    semanticVerificationPath: `${fixtureRoot}/semantic-verification.json`,
    generatedSourceFiles: value.sourcePlan.files.map((file) => ({
      path: `${fixtureRoot}/${file.path}`,
      role: file.role,
      language: file.language,
      operationKind: file.operationKind,
      textAuthority: file.text?.authority ?? null,
    })),
    generatedProjectToolingFiles: (value.sourcePlan.projectTooling?.files ?? []).map((file) => ({
      path: `${fixtureRoot}/${file.path}`,
      fileKind: file.fileKind,
      language: file.language,
      textAuthority: file.textAuthority,
    })),
    reviewArtifactByteCounts: {
      appBuilderRequestJson: artifactMetrics.appBuilderRequestJsonByteCount,
      appBuilderResponseJson: artifactMetrics.appBuilderResponseJsonByteCount,
      semanticFixtureJson: artifactMetrics.semanticFixtureJsonByteCount,
      generatedSourceText: generatedSourceByteCount,
      generatedProjectToolingText: generatedProjectToolingByteCount,
      generatedSourceAndProjectToolingText: generatedSourceByteCount + generatedProjectToolingByteCount,
    },
    sourceLoweringTargetRefs: value.sourceLoweringTargetRefs,
    sourceLoweringTargetPolicyRows: sourceLoweringTargetPolicyRows(value.sourceLoweringTargetRefs),
    effectContractIds: value.effectContractIds,
    expectedEffectKinds: value.expectedEffectKinds,
    expectedEffectCount: value.expectedEffects.length,
    controlUseInventoryRowCount: value.controlUseInventoryRows.length,
    controlUseInventoryControlPatternIds: controlUseControlPatternIds,
    controlUseInventoryLeafControlIds: controlUseLeafControlIds,
    generatedControlUsePolicyRows: generatedControlUsePolicyRows(
      value.controlUseInventoryRows,
      value.sourceLoweringTargetRefs,
      spec.request,
    ),
    sourcePlanWitnessCount: value.sourcePlanWitnessRows.length,
    suppliedInputCount: value.suppliedInputCount,
    explicitSuppliedInputCount: value.explicitSuppliedInputCount,
    decisionBundleCount: value.decisionBundleCount,
    decisionBundleDecisionCount: value.decisionBundleDecisionCount,
    decisionBundleInputContractIds: decisionBundleInputContractIds(spec.request),
    decisionBundleInputFacetIds: decisionBundleInputFacetIds(spec.request),
    decisionBundleInputSummaries: decisionBundleInputSummaries(spec.request),
    domainModelReview: domainModelReviewFromRequest(spec.fixtureId, spec.request),
    sourceLoweringRequestFieldUsageCount: sourceLoweringRequestFieldUsageRows(spec.request).length,
    sourceLoweringRequestFieldUsageIds: sourceLoweringRequestFieldUsageIds(spec.request),
    sourceLoweringRequestFieldUsageRows: sourceLoweringRequestFieldUsageRows(spec.request),
    sourceLoweringRequestFieldSurfaces: value.sourceLoweringRequestFieldSummary.surfaces.map((surface) => ({
      surfaceKind: surface.surfaceKind,
      requestFieldCount: surface.requestFieldCount,
      requiredCount: surface.requiredCount,
      conditionalCount: surface.conditionalCount,
      optionalCount: surface.optionalCount,
      requiredRequestFieldNames: surface.requiredRequestFieldNames,
      conditionalRequestFieldNames: surface.conditionalRequestFieldNames,
      optionalRequestFieldNames: surface.optionalRequestFieldNames,
    })),
    sourcePattern: value.sourcePlan.pattern == null
      ? null
      : {
          key: value.sourcePlan.pattern.key,
          role: value.sourcePlan.pattern.role,
          domainModelPolicy: value.sourcePlan.pattern.domainModelPolicy,
          stylePolicy: value.sourcePlan.pattern.stylePolicy,
          dataPolicy: value.sourcePlan.pattern.dataPolicy,
          codeEconomyPolicy: value.sourcePlan.pattern.codeEconomyPolicy,
      },
  };
}

function sourcePlanSourceByteCount(sourcePlan) {
  return sourcePlan.files.reduce((total, file) =>
    total + textByteCount(file.text?.text ?? ''),
  0);
}

function sourcePlanProjectToolingByteCount(sourcePlan) {
  return (sourcePlan.projectTooling?.files ?? []).reduce((total, file) =>
    total + textByteCount(file.text),
  0);
}

function controlUseInventoryControlPatternIds(rows) {
  return uniqueSortedStrings(rows.flatMap((row) => [
    row.controlPatternId,
    row.innerControlPatternId,
  ]));
}

function controlUseInventoryLeafControlIds(rows) {
  return uniqueSortedStrings(rows.map((row) => row.controlId));
}

function sourceLoweringRequestFieldUsageIds(request) {
  return uniqueSortedStrings(sourceLoweringRequestFieldUsageRows(request).map((row) => row.fieldId));
}

function sourceLoweringRequestFieldUsageRows(request) {
  return appBuilderSourceLoweringRequestFieldUsageRowsFromAppBuilderRequest(request);
}

function decisionBundleInputSummaries(request) {
  const summaries = new Map();
  for (const bundle of requestDecisionBundles(request)) {
    for (const decision of bundle.decisions ?? []) {
      if (typeof decision.inputContractId !== 'string') {
        continue;
      }
      const existing = summaries.get(decision.inputContractId) ?? new Set();
      for (const facetId of decisionInputFacetIds(decision)) {
        existing.add(facetId);
      }
      summaries.set(decision.inputContractId, existing);
    }
  }
  return [...summaries.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([inputContractId, facetIds]) => ({
      inputContractId,
      inputFacetIds: [...facetIds].sort(),
    }));
}

function decisionBundleInputContractIds(request) {
  return decisionBundleInputSummaries(request).map((summary) => summary.inputContractId);
}

function decisionBundleInputFacetIds(request) {
  return uniqueSortedStrings(decisionBundleInputSummaries(request).flatMap((summary) => summary.inputFacetIds));
}

function decisionInputFacetIds(decision) {
  return uniqueSortedStrings([
    ...(Array.isArray(decision.inputFacetIds) ? decision.inputFacetIds : []),
    ...((decision.facetPayloads ?? [])
      .map((payload) => payload?.inputFacetId)
      .filter((facetId) => typeof facetId === 'string')),
  ]);
}

function domainModelReviewFromRequest(fixtureId, request) {
  const entities = decisionFacetPayloadValues(request, AppBuilderInputFacetId.DomainEntities).flatMap(normalizeReviewArray);
  const fields = decisionFacetPayloadValues(request, AppBuilderInputFacetId.DomainFields).flatMap(normalizeReviewArray);
  const relationships = decisionFacetPayloadValues(request, AppBuilderInputFacetId.DomainRelationships).flatMap(normalizeReviewArray);
  const actions = decisionFacetPayloadValues(request, AppBuilderInputFacetId.DomainActions).flatMap(normalizeReviewArray);
  const valueSets = decisionFacetPayloadValues(request, AppBuilderInputFacetId.DomainValueSets).flatMap(normalizeReviewArray);
  const seedRecordSetReviews = decisionFacetPayloadValues(request, AppBuilderInputFacetId.SeedRecordSet)
    .map(seedRecordSetReview);
  return {
    fixtureId,
    hasDomainModel: entities.length > 0 || fields.length > 0 || relationships.length > 0 || actions.length > 0 || valueSets.length > 0,
    hasSeedData: seedRecordSetReviews.some((recordSet) => recordSet.recordCount > 0),
    entityTitles: uniqueSortedStrings(entities.map((entity) => entity?.entityTitle)),
    entityTypeNames: uniqueSortedStrings(entities.map((entity) => entity?.entityTypeName)),
    collectionMemberNames: uniqueSortedStrings(entities.map((entity) => entity?.collectionMemberName)),
    identityMemberNames: uniqueSortedStrings(entities.map((entity) => entity?.identityMemberName)),
    identityValueKindCounts: countStringValues(entities.map((entity) => entity?.identityValueKind).filter((value) => value != null)),
    fieldCount: fields.length,
    fieldNames: uniqueSortedStrings(fields.map((field) => field?.name)),
    fieldValueKindCounts: countStringValues(fields.map((field) => field?.valueKind).filter((value) => value != null)),
    fieldsWithDefaultValueCount: fields.filter((field) => Object.hasOwn(field ?? {}, 'defaultValue')).length,
    fieldsWithInlineOptionsCount: fields.filter((field) => Array.isArray(field?.options) && field.options.length > 0).length,
    relationshipCount: relationships.length,
    relationshipNames: uniqueSortedStrings(relationships.map((relationship) => relationship?.name)),
    relationshipKindCounts: countStringValues(relationships.map((relationship) => relationship?.kind).filter((value) => value != null)),
    actionCount: actions.length,
    actionNames: uniqueSortedStrings(actions.map((action) => action?.name)),
    actionKindCounts: countStringValues(actions.map((action) => action?.kind).filter((value) => value != null)),
    actionScopeCounts: countStringValues(actions.map((action) => action?.scope).filter((value) => value != null)),
    valueSetCount: valueSets.length,
    valueSetNames: uniqueSortedStrings(valueSets.map((valueSet) => valueSet?.name)),
    valueSetValueKindCounts: countStringValues(valueSets.map((valueSet) => valueSet?.valueKind).filter((value) => value != null)),
    seedRecordSetCount: seedRecordSetReviews.length,
    seedRecordCount: seedRecordSetReviews.reduce((total, recordSet) => total + recordSet.recordCount, 0),
  };
}

function seedRecordSetReview(value) {
  const rows = normalizeReviewArray(value);
  if (rows.every(isEntitySeedRecordGroupReviewRow)) {
    return {
      groupCount: rows.length,
      recordCount: rows.reduce((total, group) => total + normalizeReviewArray(group.records).length, 0),
    };
  }
  return {
    groupCount: 0,
    recordCount: rows.length,
  };
}

function isEntitySeedRecordGroupReviewRow(value) {
  return typeof value?.entityName === 'string'
    && Array.isArray(value.records);
}

function decisionFacetPayloadValues(request, inputFacetId) {
  const values = [];
  for (const bundle of requestDecisionBundles(request)) {
    for (const decision of bundle.decisions ?? []) {
      for (const payload of decision.facetPayloads ?? []) {
        if (payload?.inputFacetId === inputFacetId) {
          values.push(payload.value);
        }
      }
    }
  }
  return values;
}

function normalizeReviewArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value == null ? [] : [value];
}

function generatedDomainModelCoverageSummary(rows) {
  return {
    fixturesWithDomainModel: rows.filter((row) => row.hasDomainModel).length,
    fixturesWithSeedData: rows.filter((row) => row.hasSeedData).length,
    entityTitles: uniqueSortedStrings(rows.flatMap((row) => row.entityTitles)),
    entityTypeNames: uniqueSortedStrings(rows.flatMap((row) => row.entityTypeNames)),
    collectionMemberNames: uniqueSortedStrings(rows.flatMap((row) => row.collectionMemberNames)),
    identityMemberNames: uniqueSortedStrings(rows.flatMap((row) => row.identityMemberNames)),
    identityValueKindCounts: mergeCountObjects(rows.map((row) => row.identityValueKindCounts)),
    fieldCount: rows.reduce((total, row) => total + row.fieldCount, 0),
    fieldNames: uniqueSortedStrings(rows.flatMap((row) => row.fieldNames)),
    fieldValueKindCounts: mergeCountObjects(rows.map((row) => row.fieldValueKindCounts)),
    fieldsWithDefaultValueCount: rows.reduce((total, row) => total + row.fieldsWithDefaultValueCount, 0),
    fieldsWithInlineOptionsCount: rows.reduce((total, row) => total + row.fieldsWithInlineOptionsCount, 0),
    relationshipCount: rows.reduce((total, row) => total + row.relationshipCount, 0),
    relationshipNames: uniqueSortedStrings(rows.flatMap((row) => row.relationshipNames)),
    relationshipKindCounts: mergeCountObjects(rows.map((row) => row.relationshipKindCounts)),
    actionCount: rows.reduce((total, row) => total + row.actionCount, 0),
    actionNames: uniqueSortedStrings(rows.flatMap((row) => row.actionNames)),
    actionKindCounts: mergeCountObjects(rows.map((row) => row.actionKindCounts)),
    actionScopeCounts: mergeCountObjects(rows.map((row) => row.actionScopeCounts)),
    valueSetCount: rows.reduce((total, row) => total + row.valueSetCount, 0),
    valueSetNames: uniqueSortedStrings(rows.flatMap((row) => row.valueSetNames)),
    valueSetValueKindCounts: mergeCountObjects(rows.map((row) => row.valueSetValueKindCounts)),
    seedRecordSetCount: rows.reduce((total, row) => total + row.seedRecordSetCount, 0),
    seedRecordCount: rows.reduce((total, row) => total + row.seedRecordCount, 0),
  };
}

function generatedDomainModelKindCoverageSummary(summary) {
  return {
    identityValueKinds: domainKindCoverage(Object.values(AppBuilderDomainIdentityValueKind), summary.identityValueKindCounts),
    fieldValueKinds: domainKindCoverage(Object.values(AppBuilderDomainFieldValueKind), summary.fieldValueKindCounts),
    relationshipKinds: domainKindCoverage(Object.values(AppBuilderDomainRelationshipKind), summary.relationshipKindCounts),
    actionKinds: domainKindCoverage(Object.values(AppBuilderDomainActionKind), summary.actionKindCounts),
    actionScopes: domainKindCoverage(Object.values(AppBuilderDomainActionScope), summary.actionScopeCounts),
  };
}

function domainKindCoverage(allKinds, countObject) {
  const allKindIds = uniqueSortedStrings(allKinds);
  const coveredKindIds = allKindIds.filter((kindId) => (countObject?.[kindId] ?? 0) > 0);
  const missingKindIds = allKindIds.filter((kindId) => (countObject?.[kindId] ?? 0) === 0);
  return {
    kindCount: allKindIds.length,
    coveredKindCount: coveredKindIds.length,
    missingKindCount: missingKindIds.length,
    coveredKinds: coveredKindIds,
    missingKinds: missingKindIds,
    counts: countObject ?? {},
  };
}

function requestDecisionBundles(request) {
  const bundles = [];
  collectDecisionBundles(request, bundles);
  return bundles;
}

function collectDecisionBundles(value, bundles) {
  if (value == null) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectDecisionBundles(item, bundles);
    }
    return;
  }
  if (typeof value !== 'object') {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === 'decisionBundles' && Array.isArray(item)) {
      bundles.push(...item);
      continue;
    }
    collectDecisionBundles(item, bundles);
  }
}

function uniqueSortedStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string'))].sort();
}

async function writeGeneratedFixtureIndex(rows) {
  const sourceLoweringTargetCoverageRows = sourceLoweringTargetRegistryCoverageRows(rows);
  const sourceLoweringRequestFieldCoverageRows = appBuilderSourceLoweringRequestFieldRegistryCoverageRows(rows.map((row) => ({
    sourceId: row.fixtureId,
    usageRows: row.sourceLoweringRequestFieldUsageRows,
  })));
  const sourceLoweringRequestFieldReviewRows = generatedAppRequestFieldReviewRows(sourceLoweringRequestFieldCoverageRows);
  const policySatisfactionCandidateCoverageRows = generatedPolicySatisfactionCandidateCoverageRows(rows);
  const domainModelCoverageRows = rows.map((row) => row.domainModelReview);
  const domainModelCoverageSummary = generatedDomainModelCoverageSummary(domainModelCoverageRows);
  const index = {
    schemaVersion: 'app-builder-generated-fixture-index.v4',
    fixtureRole: 'app-builder-generated-app-contract-index',
    generatedBy: 'packages/semantic-runtime/scripts/materialize-app-builder-generated-fixtures.mjs',
    summary: 'Review index for generated app-builder fixture requests, outputs, semantic manifests, and source-lowering coverage.',
    fixtureCount: rows.length,
    reviewArtifactByteCountSummary: generatedFixtureReviewArtifactByteCountSummary(rows),
    domainModelCoverageSummary,
    domainModelKindCoverageSummary: generatedDomainModelKindCoverageSummary(domainModelCoverageSummary),
    domainModelCoverageRows,
    sourceLoweringTargetRegistryCoverageSummary: sourceLoweringTargetRegistryCoverageSummary(sourceLoweringTargetCoverageRows),
    sourceLoweringTargetRegistryCoverageRows: sourceLoweringTargetCoverageRows,
    sourceLoweringRequestFieldRegistryCoverageSummary: appBuilderSourceLoweringRequestFieldRegistryCoverageSummary(sourceLoweringRequestFieldCoverageRows),
    sourceLoweringRequestFieldRegistryCoverageRows: sourceLoweringRequestFieldCoverageRows,
    sourceLoweringRequestFieldReviewSummary: generatedAppRequestFieldReviewSummary(sourceLoweringRequestFieldReviewRows),
    sourceLoweringRequestFieldReviewRows,
    policySatisfactionCandidateCoverageSummary: generatedPolicySatisfactionCandidateCoverageSummary(
      policySatisfactionCandidateCoverageRows,
      rows,
    ),
    policySatisfactionCandidateCoverageRows,
    fixtureSummaryRows: generatedFixtureSummaryRows(rows),
    fixtures: rows,
  };
  await writeJson(path.join(appBuilderFixtureRoot, 'generated-fixture-index.json'), index);
  await writeFile(
    path.join(appBuilderFixtureRoot, 'generated-fixture-index.md'),
    generatedFixtureMarkdownIndex(index),
    'utf8',
  );
}

function generatedFixtureMarkdownIndex(index) {
  const lines = [
    '# App-Builder Generated Fixture Index',
    '',
    '<!-- Generated by packages/semantic-runtime/scripts/materialize-app-builder-generated-fixtures.mjs. Do not edit by hand. -->',
    '',
    index.summary,
    '',
    '## Summary',
    '',
    `- Fixtures: ${index.fixtureCount}`,
    `- Source-lowering targets covered: ${index.sourceLoweringTargetRegistryCoverageSummary.coveredTargetCount}/${index.sourceLoweringTargetRegistryCoverageSummary.targetCount}`,
    `- Request-field review rows needing review: ${index.sourceLoweringRequestFieldReviewSummary.needsReviewCount}`,
    `- Policy-satisfaction candidates covered: ${index.policySatisfactionCandidateCoverageSummary.coveredCandidateCount}/${index.policySatisfactionCandidateCoverageSummary.candidateCount}`,
    `- Domain-model fixture rows: ${index.domainModelCoverageSummary.fixturesWithDomainModel}/${index.fixtureCount}`,
    `- Seed-data fixture rows: ${index.domainModelCoverageSummary.fixturesWithSeedData}/${index.fixtureCount}`,
    `- Domain action kinds covered: ${index.domainModelKindCoverageSummary.actionKinds.coveredKindCount}/${index.domainModelKindCoverageSummary.actionKinds.kindCount}`,
    `- Domain action scopes covered: ${index.domainModelKindCoverageSummary.actionScopes.coveredKindCount}/${index.domainModelKindCoverageSummary.actionScopes.kindCount}`,
    `- Domain relationship kinds covered: ${index.domainModelKindCoverageSummary.relationshipKinds.coveredKindCount}/${index.domainModelKindCoverageSummary.relationshipKinds.kindCount}`,
    `- Generated source/tooling bytes: ${index.reviewArtifactByteCountSummary.generatedSourceAndProjectToolingTextTotal}`,
    '',
    '## Fixtures',
    '',
    '| fixture | title | source bytes | targets | controls | effects | request fields | review files |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...index.fixtureSummaryRows.map((row) => generatedFixtureMarkdownSummaryRow(row)),
    '',
    '## Fixture Details',
    '',
    ...index.fixtureSummaryRows.flatMap((row) => generatedFixtureMarkdownDetailLines(row)),
    '',
    '## Coverage',
    '',
    `- Domain entities: ${markdownCodeList(index.domainModelCoverageSummary.entityTypeNames)}`,
    `- Domain identity kinds: ${markdownCountObject(index.domainModelCoverageSummary.identityValueKindCounts)}`,
    `- Domain field kinds: ${markdownCountObject(index.domainModelCoverageSummary.fieldValueKindCounts)}`,
    `- Domain relationship kinds: ${markdownCountObject(index.domainModelCoverageSummary.relationshipKindCounts)}`,
    `- Domain action kinds: ${markdownCountObject(index.domainModelCoverageSummary.actionKindCounts)}`,
    `- Domain action scopes: ${markdownCountObject(index.domainModelCoverageSummary.actionScopeCounts)}`,
    `- Seed records: ${index.domainModelCoverageSummary.seedRecordCount}`,
    '',
    'Domain-model coverage is exact caller-input coverage. It is not proof that every action scope, relationship kind, or business behavior has a dedicated semantic realization lowerer.',
    '',
    '### Domain Model Kind Coverage',
    '',
    ...generatedFixtureMarkdownDomainKindCoverageLines(index.domainModelKindCoverageSummary),
    '',
    '### Domain Model Coverage Rows',
    '',
    ...generatedFixtureMarkdownDomainModelCoverageLines(index.domainModelCoverageRows),
    '',
    `- Target coverage kinds: ${markdownCodeList(index.sourceLoweringTargetRegistryCoverageSummary.coverageKinds)}`,
    `- Request-field review dispositions: ${markdownCountObject(index.sourceLoweringRequestFieldReviewSummary.dispositionCounts)}`,
    '',
    '### Request-Field Review Rows',
    '',
    ...generatedFixtureMarkdownRequestFieldReviewLines(index.sourceLoweringRequestFieldReviewRows),
    '',
    `- Policy-satisfaction states: ${markdownCountObject(index.policySatisfactionCandidateCoverageSummary.satisfactionStateCounts)}`,
    `- Policy-satisfaction sources: ${markdownCountObject(index.policySatisfactionCandidateCoverageSummary.satisfactionSourceCounts)}`,
    '',
    '### Policy-Satisfaction Candidate Rows',
    '',
    ...generatedFixtureMarkdownPolicyCandidateLines(index.policySatisfactionCandidateCoverageRows),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function generatedFixtureMarkdownRequestFieldReviewLines(rows) {
  if (rows.length === 0) {
    return ['(none)'];
  }
  return [
    '| field | request names | surfaces | requirement kinds | owners | disposition | review summary | next review |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => [
      markdownCode(row.fieldId),
      markdownCodeList(row.requestFieldNames),
      markdownCodeList(row.registeredSurfaceKinds),
      markdownCodeList(row.registeredRequirementKinds),
      markdownCodeList(row.registryOwnerKinds),
      markdownCode(row.reviewDisposition),
      markdownEscape(row.summary),
      markdownEscape(row.nextReview),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
  ];
}

function generatedFixtureMarkdownDomainModelCoverageLines(rows) {
  if (rows.length === 0) {
    return ['(none)'];
  }
  return [
    '| fixture | entities | identity kinds | field kinds | relationships | actions | value sets | seed records |',
    '| --- | --- | --- | --- | --- | --- | --- | ---: |',
    ...rows.map((row) => [
      markdownCode(row.fixtureId),
      markdownCodeList(row.entityTypeNames),
      markdownCountObject(row.identityValueKindCounts),
      markdownCountObject(row.fieldValueKindCounts),
      markdownCountObject(row.relationshipKindCounts),
      markdownCountObject(row.actionKindCounts),
      markdownCodeList(row.valueSetNames),
      String(row.seedRecordCount),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
  ];
}

function generatedFixtureMarkdownDomainKindCoverageLines(summary) {
  return [
    '| kind family | covered | missing | counts |',
    '| --- | --- | --- | --- |',
    ...[
      ['identity value kinds', summary.identityValueKinds],
      ['field value kinds', summary.fieldValueKinds],
      ['relationship kinds', summary.relationshipKinds],
      ['action kinds', summary.actionKinds],
      ['action scopes', summary.actionScopes],
    ].map(([title, row]) => [
      markdownEscape(title),
      markdownCodeList(row.coveredKinds),
      markdownCodeList(row.missingKinds),
      markdownCountObject(row.counts),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
  ];
}

function generatedFixtureMarkdownPolicyCandidateLines(rows) {
  if (rows.length === 0) {
    return ['(none)'];
  }
  return [
    '| target | title | status | defaulting | explicit input | coverage | fixtures | occurrences | satisfaction | defaulting policy |',
    '| --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- |',
    ...rows.map((row) => [
      markdownCode(markdownTargetRefKey(row.targetRef)),
      markdownEscape(row.title),
      markdownCode(row.recommendationStatus),
      markdownCode(row.defaultingCandidate ? 'yes' : 'no'),
      markdownCode(row.requiresExplicitInput ? 'yes' : 'no'),
      markdownCodeList(row.coverageKinds),
      markdownCodeList(uniqueSortedStrings([
        ...row.sourceLoweringTargetRefFixtureIds,
        ...row.generatedControlUseFixtureIds,
      ])),
      String(row.policySatisfactionFixtureOccurrenceCount),
      [
        markdownCountObject(row.policySatisfactionStateCounts),
        markdownCountObject(row.policySatisfactionSourceCounts),
      ].join('<br>'),
      markdownEscape(row.defaultingCandidatePolicy?.summary ?? ''),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
  ];
}

function generatedFixtureMarkdownSummaryRow(row) {
  return [
    markdownLink(markdownCode(row.fixtureId), row.fixtureId),
    markdownEscape(row.title),
    String(row.reviewArtifactByteCounts.generatedSourceAndProjectToolingText),
    String(row.sourceLoweringTargetRefs.length),
    String(row.controlUseInventoryRowCount),
    String(row.expectedEffectCount),
    String(row.sourceLoweringRequestFieldUsageIds.length),
    [
      markdownLink('request', row.appBuilderRequestPath),
      markdownLink('response', row.appBuilderResponsePath),
      markdownLink('manifest', row.semanticFixturePath),
      markdownLink('verification', row.semanticVerificationPath),
    ].join('<br>'),
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |');
}

function generatedFixtureMarkdownDetailLines(row) {
  return [
    `### ${markdownCode(row.fixtureId)}`,
    '',
    `- Title: ${markdownEscape(row.title)}`,
    `- Source/tooling: ${row.sourceFileCount + row.projectToolingFileCount} file(s), ${row.reviewArtifactByteCounts.generatedSourceAndProjectToolingText} bytes`,
    `- Generated source: ${markdownPathList(row.generatedSourcePaths)}`,
    `- Project tooling: ${markdownPathList(row.generatedProjectToolingPaths)}`,
    `- Source-lowering targets: ${markdownTargetRefList(row.sourceLoweringTargetRefs)}`,
    `- Target recommendation statuses: ${markdownCodeList(row.sourceLoweringTargetRecommendationStatuses)}`,
    `- Target policy satisfaction: ${markdownCountObject(row.sourceLoweringTargetPolicySatisfactionCounts.stateCounts)}`,
    `- Control-use rows: ${row.controlUseInventoryRowCount}`,
    `- Control patterns: ${markdownCodeList(row.controlUseInventoryControlPatternIds)}`,
    `- Leaf controls: ${markdownCodeList(row.controlUseInventoryLeafControlIds)}`,
    `- Generated-control recommendation statuses: ${markdownCodeList(row.generatedControlUseRecommendationStatuses)}`,
    `- Generated-control policy satisfaction: ${markdownCountObject(row.generatedControlUsePolicySatisfactionCounts.stateCounts)}`,
    `- Decision-bundle input contracts: ${markdownCodeList(row.decisionBundleInputContractIds)}`,
    `- Decision-bundle input facets: ${markdownCodeList(row.decisionBundleInputFacetIds)}`,
    `- Domain entities: ${markdownCodeList(row.domainModelReview.entityTypeNames)}`,
    `- Domain field kinds: ${markdownCountObject(row.domainModelReview.fieldValueKindCounts)}`,
    `- Domain relationship kinds: ${markdownCountObject(row.domainModelReview.relationshipKindCounts)}`,
    `- Domain action kinds: ${markdownCountObject(row.domainModelReview.actionKindCounts)}`,
    `- Seed records: ${row.domainModelReview.seedRecordCount}`,
    `- Request fields: ${markdownCodeList(row.sourceLoweringRequestFieldUsageIds)}`,
    `- Expected effects: ${row.expectedEffectCount} total; ${markdownCodeList(row.expectedEffectKinds)}`,
    `- Review artifacts: ${markdownLink('request', row.appBuilderRequestPath)}, ${markdownLink('response', row.appBuilderResponsePath)}, ${markdownLink('manifest', row.semanticFixturePath)}, ${markdownLink('verification', row.semanticVerificationPath)}`,
    '',
  ];
}

function markdownTargetRefList(targetRefs) {
  return targetRefs.length === 0
    ? '(none)'
    : targetRefs.map((targetRef) => markdownCode(markdownTargetRefKey(targetRef))).join('<br>');
}

function markdownTargetRefKey(targetRef) {
  return `${targetRef.kind}:${targetRef.id}`;
}

function markdownPathList(paths) {
  return paths.length === 0
    ? '(none)'
    : paths.map((item) => markdownLink(markdownCode(item), item)).join('<br>');
}

function markdownCountObject(value) {
  const entries = Object.entries(value ?? {});
  return entries.length === 0
    ? '(none)'
    : entries.map(([key, count]) => `${markdownCode(key)}=${count}`).join(', ');
}

function markdownCodeList(values) {
  return values.length === 0
    ? '(none)'
    : values.map((value) => markdownCode(value)).join(', ');
}

function markdownLink(label, href) {
  return `[${label}](${encodeURI(href).replaceAll('%2F', '/')})`;
}

function markdownCode(value) {
  return `<code>${markdownEscape(String(value))}</code>`;
}

function markdownEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('|', '\\|')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function generatedAppRequestFieldReviewSummary(reviewRows) {
  return {
    reviewedUnusedFieldCount: reviewRows.length,
    needsReviewCount: reviewRows.filter((row) => row.reviewDisposition === 'needs-review').length,
    dispositionCounts: countStringValues(reviewRows.map((row) => row.reviewDisposition)),
  };
}

function generatedAppRequestFieldReviewRows(coverageRows) {
  return coverageRows
    .filter((coverageRow) => !coverageRow.usedBySource)
    .map((coverageRow) => {
      const review = GENERATED_APP_UNUSED_REQUEST_FIELD_REVIEW.get(coverageRow.fieldId);
      return {
        fieldId: coverageRow.fieldId,
        requestFieldNames: coverageRow.requestFieldNames,
        registeredRequirementKinds: coverageRow.registeredRequirementKinds,
        registryOwnerKinds: coverageRow.registryOwnerKinds,
        registeredSurfaceKinds: coverageRow.registeredSurfaceKinds,
        reviewDisposition: review?.reviewDisposition ?? 'needs-review',
        summary: review?.summary ?? 'This generated-app unused request field has no current review disposition; inspect focused pressure coverage and app-builder ontology before adding a fixture solely for coverage.',
        nextReview: review?.nextReview ?? 'Classify the field as required coverage, pressure-only coverage, or deferred app/domain design work.',
      };
    });
}

function generatedFixtureSummaryRows(rows) {
  return rows.map((row) => ({
    fixtureId: row.fixtureId,
    title: row.title,
    appBuilderRequestPath: row.appBuilderRequestPath,
    appBuilderResponsePath: row.appBuilderResponsePath,
    semanticFixturePath: row.semanticFixturePath,
    semanticVerificationPath: row.semanticVerificationPath,
    reviewArtifactByteCounts: row.reviewArtifactByteCounts,
    sourceFileCount: row.generatedSourceFiles.length,
    generatedSourcePaths: row.generatedSourceFiles.map((file) => file.path),
    projectToolingFileCount: row.generatedProjectToolingFiles.length,
    generatedProjectToolingPaths: row.generatedProjectToolingFiles.map((file) => file.path),
    sourceLoweringTargetRefs: row.sourceLoweringTargetRefs,
    sourceLoweringTargetRecommendationStatuses: uniqueSortedStrings(row.sourceLoweringTargetPolicyRows.map((policyRow) =>
      policyRow.recommendationStatus
    )),
    policySatisfactionCandidateTargetRefs: row.sourceLoweringTargetPolicyRows
      .filter((policyRow) => policyRow.policySatisfactionCandidate)
      .map((policyRow) => policyRow.targetRef),
    sourceLoweringTargetPolicySatisfactionCounts: policySatisfactionCountSummary(row.sourceLoweringTargetPolicyRows),
    generatedControlUseRecommendationStatuses: uniqueSortedStrings(row.generatedControlUsePolicyRows.map((policyRow) =>
      policyRow.recommendationStatus
    )),
    generatedControlUsePolicySatisfactionCandidateTargetRefs: row.generatedControlUsePolicyRows
      .filter((policyRow) => policyRow.policySatisfactionCandidate)
      .map((policyRow) => policyRow.targetRef),
    generatedControlUsePolicySatisfactionCounts: policySatisfactionCountSummary(row.generatedControlUsePolicyRows),
    decisionBundleInputContractIds: row.decisionBundleInputContractIds,
    decisionBundleInputFacetIds: row.decisionBundleInputFacetIds,
    domainModelReview: row.domainModelReview,
    sourceLoweringRequestFieldUsageIds: row.sourceLoweringRequestFieldUsageIds,
    expectedEffectKinds: row.expectedEffectKinds,
    expectedEffectCount: row.expectedEffectCount,
    controlUseInventoryRowCount: row.controlUseInventoryRowCount,
    controlUseInventoryControlPatternIds: row.controlUseInventoryControlPatternIds,
    controlUseInventoryLeafControlIds: row.controlUseInventoryLeafControlIds,
  }));
}

function policySatisfactionCountSummary(policyRows) {
  const candidateRows = policyRows.filter((policyRow) => policyRow.policySatisfactionCandidate);
  for (const policyRow of candidateRows) {
    if (policyRow.policySatisfaction == null) {
      throw new Error(`Policy-satisfaction candidate ${ontologyTargetRefKey(policyRow.targetRef)} is missing a policySatisfaction row.`);
    }
  }
  return {
    candidateCount: candidateRows.length,
    satisfiedCount: candidateRows.filter((policyRow) =>
      policyRow.policySatisfaction.state === AppBuilderPolicySatisfactionState.Satisfied
    ).length,
    missingExplicitSelectionCount: candidateRows.filter((policyRow) =>
      policyRow.policySatisfaction.state === AppBuilderPolicySatisfactionState.MissingExplicitSelection
    ).length,
    stateCounts: countStringValues(candidateRows.map((policyRow) => policyRow.policySatisfaction.state)),
    sourceCounts: countStringValues(candidateRows
      .map((policyRow) => policyRow.policySatisfaction.sourceId)
      .filter((sourceId) => sourceId != null)),
  };
}

function countStringValues(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function mergeCountObjects(countObjects) {
  const counts = new Map();
  for (const countObject of countObjects) {
    for (const [key, count] of Object.entries(countObject ?? {})) {
      counts.set(key, (counts.get(key) ?? 0) + count);
    }
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function generatedFixtureReviewArtifactByteCountSummary(rows) {
  return {
    fixtureCount: rows.length,
    appBuilderRequestJsonTotal: sumReviewArtifactByteCounts(rows, 'appBuilderRequestJson'),
    appBuilderResponseJsonTotal: sumReviewArtifactByteCounts(rows, 'appBuilderResponseJson'),
    semanticFixtureJsonTotal: sumReviewArtifactByteCounts(rows, 'semanticFixtureJson'),
    generatedSourceTextTotal: sumReviewArtifactByteCounts(rows, 'generatedSourceText'),
    generatedProjectToolingTextTotal: sumReviewArtifactByteCounts(rows, 'generatedProjectToolingText'),
    generatedSourceAndProjectToolingTextTotal: sumReviewArtifactByteCounts(rows, 'generatedSourceAndProjectToolingText'),
    largestAppBuilderResponseJsonFixture: largestReviewArtifactByteCountRow(rows, 'appBuilderResponseJson'),
    largestGeneratedSourceTextFixture: largestReviewArtifactByteCountRow(rows, 'generatedSourceText'),
  };
}

function sumReviewArtifactByteCounts(rows, key) {
  return rows.reduce((total, row) => total + row.reviewArtifactByteCounts[key], 0);
}

function largestReviewArtifactByteCountRow(rows, key) {
  const row = rows.reduce((largest, candidate) =>
    largest == null || candidate.reviewArtifactByteCounts[key] > largest.reviewArtifactByteCounts[key]
      ? candidate
      : largest,
  null);
  return row == null
    ? null
    : {
        fixtureId: row.fixtureId,
        byteCount: row.reviewArtifactByteCounts[key],
      };
}

function sourceLoweringTargetRegistryCoverageSummary(coverageRows) {
  return {
    targetCount: coverageRows.length,
    coveredTargetCount: coverageRows.filter((row) => row.coveredByGeneratedFixture).length,
    uncoveredTargetCount: coverageRows.filter((row) => !row.coveredByGeneratedFixture).length,
    coverageKinds: uniqueSortedStrings(coverageRows.flatMap((row) => row.coverageKinds)),
  };
}

function sourceLoweringTargetPolicyRows(targetRefs) {
  return targetRefs.map((targetRef) => compactRecommendationPolicyRow(targetRef, {
    policySatisfactionSourceId: AppBuilderPolicySatisfactionSource.ExplicitTargetSelection,
  }));
}

function generatedControlUsePolicyRows(controlUseInventoryRows, sourceLoweringTargetRefs, request) {
  const controlUseControlPatternIds = controlUseInventoryControlPatternIds(controlUseInventoryRows);
  const satisfactionSourcesByPatternId = generatedControlUsePolicySatisfactionSourcesByPatternId(
    controlUseInventoryRows,
    sourceLoweringTargetRefs,
    request,
  );
  return APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS
    .filter((targetRow) =>
      targetRow.targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
      && controlUseControlPatternIds.includes(targetRow.targetRef.id)
    )
    .map((targetRow) => compactRecommendationPolicyRow(targetRow.targetRef, {
      policySatisfactionSourceId: satisfactionSourcesByPatternId.get(targetRow.targetRef.id) ?? null,
    }));
}

function generatedControlUsePolicySatisfactionSourcesByPatternId(controlUseInventoryRows, sourceLoweringTargetRefs, request) {
  const sources = new Map();
  const exactTargetSelectionPatternIds = new Set(sourceLoweringTargetRefs
    .filter((targetRef) => targetRef.kind === AppBuilderOntologyRowKind.ControlPattern)
    .map((targetRef) => targetRef.id));
  for (const controlPatternId of exactTargetSelectionPatternIds) {
    sources.set(controlPatternId, AppBuilderPolicySatisfactionSource.ExplicitTargetSelection);
  }

  const explicitlySelectedNestedControlPatternIds = explicitNestedControlPatternIdsFromRequest(request);
  for (const controlPatternId of explicitlySelectedNestedControlPatternIds) {
    if (!sources.has(controlPatternId)) {
      sources.set(controlPatternId, AppBuilderPolicySatisfactionSource.ExplicitNestedControlSelection);
    }
  }

  const domainFieldControlPatternIds = domainFieldControlPatternIdsFromGeneratedUses(controlUseInventoryRows, request);
  for (const controlPatternId of domainFieldControlPatternIds) {
    if (!sources.has(controlPatternId)) {
      sources.set(controlPatternId, AppBuilderPolicySatisfactionSource.DomainFieldControlInput);
    }
  }
  return sources;
}

function explicitNestedControlPatternIdsFromRequest(request) {
  const ids = new Set();
  collectExplicitNestedControlPatternIds(request, ids);
  return ids;
}

function collectExplicitNestedControlPatternIds(value, ids) {
  if (value == null) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectExplicitNestedControlPatternIds(item, ids);
    }
    return;
  }
  if (typeof value !== 'object') {
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if ((key === 'fieldControlSelections' || key === 'relationshipControlSelections') && Array.isArray(item)) {
      for (const selection of item) {
        if (typeof selection?.innerControlPatternId === 'string') {
          ids.add(selection.innerControlPatternId);
        }
      }
      continue;
    }
    collectExplicitNestedControlPatternIds(item, ids);
  }
}

function domainFieldControlPatternIdsFromGeneratedUses(controlUseInventoryRows, request) {
  const fieldsByName = domainFieldsByNameFromRequest(request);
  const ids = new Set();
  for (const row of controlUseInventoryRows) {
    if (typeof row.fieldName !== 'string') {
      continue;
    }
    const field = fieldsByName.get(row.fieldName);
    if (field == null) {
      continue;
    }
    const expectedControlPatternId = appBuilderControlPatternIdForLeafControlId(appBuilderDomainFieldControlId(field));
    const actualControlPatternId = row.innerControlPatternId ?? row.controlPatternId;
    if (actualControlPatternId === expectedControlPatternId) {
      ids.add(actualControlPatternId);
    }
  }
  return ids;
}

function domainFieldsByNameFromRequest(request) {
  const fieldsByName = new Map();
  for (const bundle of requestDecisionBundles(request)) {
    for (const decision of bundle.decisions ?? []) {
      for (const payload of decision.facetPayloads ?? []) {
        if (payload?.inputFacetId !== AppBuilderInputFacetId.DomainFields || !Array.isArray(payload.value)) {
          continue;
        }
        for (const field of payload.value) {
          if (typeof field?.name === 'string') {
            fieldsByName.set(field.name, field);
          }
        }
      }
    }
  }
  return fieldsByName;
}

function compactRecommendationPolicyRow(targetRef, options = {}) {
  const policyRow = recommendationPolicyRowsByTargetKey.get(ontologyTargetRefKey(targetRef));
  if (policyRow == null) {
    throw new Error(`No recommendation-policy row found for source-lowering target ${ontologyTargetRefKey(targetRef)}.`);
  }
  const policySatisfaction = appBuilderPolicySatisfactionForTarget(policyRow, {
    sourceId: options.policySatisfactionSourceId ?? null,
  });
  return {
    targetRef: policyRow.targetRef,
    title: policyRow.title,
    recommendationStatus: policyRow.recommendationStatus,
    defaultingCandidate: policyRow.defaultingCandidate,
    ...(compactDefaultingCandidatePolicy(policyRow)),
    requiresExplicitInput: policyRow.requiresExplicitInput,
    sourceLoweringImplemented: policyRow.sourceLoweringImplemented,
    policySatisfactionCandidate: appBuilderPolicySatisfactionCandidateRow(policyRow),
    ...(policySatisfaction.required ? { policySatisfaction: compactPolicySatisfaction(policySatisfaction) } : {}),
    applicabilityKindIds: uniqueSortedStrings(policyRow.applicability.map((applicability) => applicability.kind)),
    evidenceKindIds: uniqueSortedStrings(policyRow.evidence.map((evidence) => evidence.kind)),
  };
}

function compactPolicySatisfaction(policySatisfaction) {
  return {
    state: policySatisfaction.state,
    ...(policySatisfaction.sourceId == null ? {} : { sourceId: policySatisfaction.sourceId }),
    summary: policySatisfaction.summary,
  };
}

function sourceLoweringTargetRegistryCoverageRows(fixtureRows) {
  return APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS.map((targetRow) => {
    const sourceLoweringTargetRefFixtureIds = fixtureRows
      .filter((fixtureRow) => fixtureRow.sourceLoweringTargetRefs.some((targetRef) =>
        ontologyTargetRefKey(targetRef) === ontologyTargetRefKey(targetRow.targetRef)
      ))
      .map((fixtureRow) => fixtureRow.fixtureId)
      .sort();
    const generatedControlUseFixtureIds = targetRow.targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
      ? fixtureRows
        .filter((fixtureRow) => fixtureRow.controlUseInventoryControlPatternIds.includes(targetRow.targetRef.id))
        .map((fixtureRow) => fixtureRow.fixtureId)
        .sort()
      : [];
    return {
      targetRef: targetRow.targetRef,
      sourceLoweringSurfaceKinds: targetRow.sourceLoweringSurfaceKinds,
      coveredByGeneratedFixture: sourceLoweringTargetRefFixtureIds.length > 0 || generatedControlUseFixtureIds.length > 0,
      coverageKinds: [
        ...(sourceLoweringTargetRefFixtureIds.length === 0 ? [] : ['source-lowering-target-ref']),
        ...(generatedControlUseFixtureIds.length === 0 ? [] : ['generated-control-use']),
      ],
      sourceLoweringTargetRefFixtureIds,
      generatedControlUseFixtureIds,
    };
  });
}

function generatedPolicySatisfactionCandidateCoverageSummary(coverageRows, fixtureRows) {
  const fixturePolicyRows = policySatisfactionCandidatePolicyRowsFromFixtures(fixtureRows);
  return {
    candidateCount: coverageRows.length,
    coveredCandidateCount: coverageRows.filter((row) => row.coveredByGeneratedFixture).length,
    uncoveredCandidateCount: coverageRows.filter((row) => !row.coveredByGeneratedFixture).length,
    coverageKinds: uniqueSortedStrings(coverageRows.flatMap((row) => row.coverageKinds)),
    fixtureOccurrenceCount: fixturePolicyRows.length,
    satisfiedFixtureOccurrenceCount: fixturePolicyRows.filter((row) =>
      row.policySatisfaction.state === AppBuilderPolicySatisfactionState.Satisfied
    ).length,
    missingExplicitSelectionFixtureOccurrenceCount: fixturePolicyRows.filter((row) =>
      row.policySatisfaction.state === AppBuilderPolicySatisfactionState.MissingExplicitSelection
    ).length,
    satisfactionStateCounts: countStringValues(fixturePolicyRows.map((row) => row.policySatisfaction.state)),
    satisfactionSourceCounts: countStringValues(fixturePolicyRows
      .map((row) => row.policySatisfaction.sourceId)
      .filter((sourceId) => sourceId != null)),
  };
}

function generatedPolicySatisfactionCandidateCoverageRows(fixtureRows) {
  return appBuilderRecommendationPolicyRows(APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS)
    .filter((policyRow) => appBuilderPolicySatisfactionCandidateRow(policyRow))
    .map((policyRow) => {
      const sourceLoweringTargetRefFixtureIds = fixtureRows
        .filter((fixtureRow) => fixtureRow.sourceLoweringTargetPolicyRows.some((fixturePolicyRow) =>
          ontologyTargetRefKey(fixturePolicyRow.targetRef) === ontologyTargetRefKey(policyRow.targetRef)
        ))
        .map((fixtureRow) => fixtureRow.fixtureId)
        .sort();
      const generatedControlUseFixtureIds = fixtureRows
        .filter((fixtureRow) => fixtureRow.generatedControlUsePolicyRows.some((fixturePolicyRow) =>
          ontologyTargetRefKey(fixturePolicyRow.targetRef) === ontologyTargetRefKey(policyRow.targetRef)
        ))
        .map((fixtureRow) => fixtureRow.fixtureId)
        .sort();
      const fixturePolicyRows = policySatisfactionCandidatePolicyRowsForTarget(fixtureRows, policyRow.targetRef);
      return {
        targetRef: policyRow.targetRef,
        title: policyRow.title,
        recommendationStatus: policyRow.recommendationStatus,
        defaultingCandidate: policyRow.defaultingCandidate,
        ...(compactDefaultingCandidatePolicy(policyRow)),
        requiresExplicitInput: policyRow.requiresExplicitInput,
        coveredByGeneratedFixture: sourceLoweringTargetRefFixtureIds.length > 0 || generatedControlUseFixtureIds.length > 0,
        coverageKinds: [
          ...(sourceLoweringTargetRefFixtureIds.length === 0 ? [] : ['source-lowering-target-ref']),
          ...(generatedControlUseFixtureIds.length === 0 ? [] : ['generated-control-use']),
        ],
        sourceLoweringTargetRefFixtureIds,
        generatedControlUseFixtureIds,
        policySatisfactionFixtureOccurrenceCount: fixturePolicyRows.length,
        policySatisfactionStateCounts: countStringValues(fixturePolicyRows.map((row) => row.policySatisfaction.state)),
        policySatisfactionSourceCounts: countStringValues(fixturePolicyRows
          .map((row) => row.policySatisfaction.sourceId)
          .filter((sourceId) => sourceId != null)),
      };
    });
}

function policySatisfactionCandidatePolicyRowsFromFixtures(fixtureRows) {
  return fixtureRows
    .flatMap((fixtureRow) => [
      ...fixtureRow.sourceLoweringTargetPolicyRows,
      ...fixtureRow.generatedControlUsePolicyRows,
    ])
    .filter((policyRow) => policyRow.policySatisfactionCandidate);
}

function policySatisfactionCandidatePolicyRowsForTarget(fixtureRows, targetRef) {
  const targetKey = ontologyTargetRefKey(targetRef);
  return policySatisfactionCandidatePolicyRowsFromFixtures(fixtureRows)
    .filter((policyRow) => ontologyTargetRefKey(policyRow.targetRef) === targetKey);
}

function compactDefaultingCandidatePolicy(policyRow) {
  if (!policyRow.defaultingCandidate || policyRow.defaultingCandidatePolicy == null) {
    return {};
  }
  return {
    defaultingCandidatePolicy: {
      scope: policyRow.defaultingCandidatePolicy.scope,
      summary: policyRow.defaultingCandidatePolicy.summary,
    },
  };
}

function ontologyTargetRefKey(targetRef) {
  return `${targetRef.kind}:${targetRef.domain}:${targetRef.id}`;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function jsonSnapshotByteCount(value) {
  return textByteCount(`${JSON.stringify(value, null, 2)}\n`);
}

function textByteCount(value) {
  return Buffer.byteLength(String(value), 'utf8');
}

await materializeGeneratedAppBuilderFixtures();
