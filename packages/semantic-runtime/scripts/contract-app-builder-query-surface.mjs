import assert from 'node:assert/strict';
import {
  AppBuilderBindingPartId,
  AppBuilderFrameworkComponentId,
  AppBuilderPartAuthoringTierPolicyKind,
  AppBuilderPartAuthoringTier,
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartKind,
  AppBuilderPartSlotKind,
  AppBuilderPartSourceFragmentKind,
  AppBuilderPartSourceLoweringSampleKind,
  AppBuilderPartSourceLoweringState,
  AppBuilderSourceFragmentOriginKind,
  AppBuilderApplicationPatternId,
  AppBuilderApplicationAureliaRealizationId,
  AppBuilderApplicationDataShapeId,
  AppBuilderApplicationInteractionShapeId,
  AppBuilderApplicationNavigationShapeId,
  AppBuilderApplicationStateShapeId,
  AppBuilderStructuralPartId,
  AppBuilderAffordanceId,
  AppBuilderEffectBoundary,
  AppBuilderEffectContractId,
  AppBuilderEffectWitnessFieldId,
  AppBuilderEffectWitnessKind,
  AppBuilderEffectWitnessSurface,
  AppBuilderDomainActionKind,
  AppBuilderDomainActionScope,
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainIdentityValueKind,
  AppBuilderDomainRelationshipKind,
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
  AppBuilderGeneratedFallbackCopyId,
  APP_BUILDER_GENERATED_FALLBACK_COPY_ROWS,
  APP_BUILDER_INPUT_FACET_IDS,
  AppBuilderInputPayloadSchemaKind,
  AppBuilderInputPayloadSchemaState,
  AppBuilderExistingAppFactQueryPurpose,
  AppBuilderExistingAppFactUseKind,
  AppBuilderInputFacetValueAxis,
  AppBuilderInputFacetValueSourceLoweringSupportKind,
  AppBuilderCollectionDisplayRole,
  AppBuilderCollectionConceptId,
  AppBuilderCollectionFeatureId,
  AppBuilderCollectionIdentityMode,
  AppBuilderCollectionIdentityUse,
  AppBuilderCollectionTableColumnDisplayKind,
  AppBuilderChoiceOptionBindingKind,
  AppBuilderControlId,
  AppBuilderControlTransportKind,
  AppBuilderControlManifestFieldId,
  AppBuilderControlPatternId,
  AppBuilderControlRealizationPolicyId,
  AppBuilderControlUseActionChannelKind,
  AppBuilderControlUseInventorySourceKind,
  AppBuilderInputReadinessIssueKind,
  AppBuilderInputReadinessState,
  AppBuilderDecisionBundleSource,
  AppBuilderPolicySatisfactionState,
  AppBuilderSuppliedInputSource,
  AppBuilderSuppliedInputPayloadValidationState,
  AppBuilderSourceLoweringAvailability,
  AppBuilderSourceLoweringActionSelectionState,
  AppBuilderSourceLoweringBindingExpressionSource,
  AppBuilderSourceLoweringButtonType,
  AppBuilderSourceLoweringCompositionIssueKind,
  AppBuilderSourceLoweringCompositionKind,
  AppBuilderSourceLoweringFieldSelectionState,
  AppBuilderSourceLoweringHandlerExpressionSource,
  AppBuilderSourceLoweringFieldControlIdSource,
  AppBuilderSourceLoweringInputGateState,
  AppBuilderSourceLoweringInnerControlSelectionState,
  AppBuilderSourceLoweringInvocationIssueKind,
  AppBuilderSourceLoweringLabelTextSource,
  AppBuilderSourceLoweringMessageKind,
  AppBuilderSourceLoweringMessageSelectionState,
  AppBuilderSourceLoweringMessageTextSource,
  AppBuilderSourceLoweringSourcePlanIssueKind,
  AppBuilderSourceLoweringSourcePlanSelectionKind,
  AppBuilderSourceLoweringSurfaceKind,
  AppBuilderSourcePlanHandoffNoteKind,
  AppBuilderSourcePlanWitnessRowKind,
  APP_BUILDER_SOURCE_LOWERING_COMPOSITION_TARGET_ROWS,
  APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS,
  AppBuilderSourceLoweringValueDomainExpressionSource,
  AppBuilderSourceLoweringVisualHookTarget,
  AppBuilderSourceLoweringPreflightDefaultTargetReason,
  AppBuilderSourceLoweringPreflightIssueKind,
  AppBuilderSourceLoweringRequestFieldId,
  AppBuilderSourceLoweringRequestFieldRegistryOwnerKind,
  AppBuilderSourceLoweringRequestFieldRequirementKind,
  AppBuilderControlManifestRowId,
  AppBuilderOntologyDomain,
  AppBuilderOntologyReasonAuthority,
  AppBuilderOntologyRelationKind,
  AppBuilderOntologyRowKind,
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS,
  APP_BUILDER_POLICY_AXIS_IDS,
  appBuilderEffectContractIdsForTargetRef,
  appBuilderOntologyRowRef,
  appBuilderSourceLoweringRequestFieldRegistryCoverageRows,
  appBuilderSourceLoweringRequestFieldRegistryCoverageRowsInSummaryScope,
  appBuilderSourceLoweringRequestFieldRegistryCoverageSummary,
  AppBuilderPolicyAxisId,
  AppBuilderDefaultingCandidatePolicyScope,
  AppBuilderPolicyScope,
  AppBuilderRecommendationStatus,
  AppBuilderRecommendationApplicabilityKind,
  AppBuilderRecommendationEvidenceKind,
  AppBuilderStylingMechanismId,
  AppBuilderVisualPolicyId,
  AppBuilderConventionPolicy,
  AppBuilderAppStateOwnershipMode,
  AppBuilderAreaNavigationPolicy,
  AppBuilderDomainModelingMode,
  AppBuilderLocalStatePolicy,
  AppBuilderPackageCapability,
  AppBuilderResourceCarrier,
  AppBuilderRouterAdmissionPolicy,
  appBuilderHtmlTemplateFileArtifact,
  SourcePatternParameterKey,
  SourcePlanContributionKind,
  SourcePlanContributionOriginKind,
  SourcePlanBuildToolPolicy,
  SourcePlanFileRole,
  SourcePlanTextAuthority,
  SourcePlanPackageDependencyScope,
  SourcePlanPackageManager,
  SourcePlanProjectToolingFileKind,
  EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectKind,
  ExpectedSemanticEffectObservationSurface,
  ExpectedSemanticEffectRouteProductKind,
  observedCountForExpectedSemanticEffect,
  SemanticRuntimeAnswerOutcome,
  SemanticAppQueryKind,
  SemanticRuntimeAppBuilderRequestField,
  SemanticRuntimeAppBuilderQueryKind,
  SemanticRuntimeAppBuilderQueryIssueKind,
  SemanticRuntimeAppBuilderQueryPosture,
  SemanticRuntimeAppBuilderSourceTextPolicy,
  answerSemanticRuntimeAppBuilderQuery,
  filterSemanticRuntimeAppBuilderQueryContinuations,
  InquiryContinuationIntent,
  readSemanticRuntimeAppBuilderQueryCatalog,
  withSemanticRuntimeAppBuilderQueryContinuations,
} from '../out/index.js';

const catalog = readSemanticRuntimeAppBuilderQueryCatalog();
const expectedRequestFields = (fields) => [
  ...fields,
  SemanticRuntimeAppBuilderRequestField.ContinuationIntents,
];
const serializedByteLength = (value) => Buffer.byteLength(JSON.stringify(value));
const emptyExpectedSemanticEffectObservationSnapshot = {
  projectShapeKind: 'unknown',
  projectSourceRoles: [],
  appRoots: 0,
  resourceDefinitions: 0,
  components: [],
  styles: [],
  services: [],
  stateCompositions: [],
  serviceInteractions: [],
  serviceInteractionBindings: [],
  compiledResources: 0,
  templateDiagnostics: [],
  observationIssues: [],
  runtimeControllers: [],
  runtimeWatchers: [],
  runtimeWatcherObservedDependencies: [],
  runtimeCompositions: [],
  bindingTargetAccesses: [],
  bindingSourceOperations: [],
  targetOperations: [],
  bindingValueChannels: [],
  bindingObservedDependencies: [],
  computedObservationDefinitions: [],
  computedObserverSources: [],
  computedObserverObservedDependencies: [],
  bindingBehaviorApplications: [],
  i18nTranslationKeys: [],
  i18nTranslationBindings: [],
  stateStores: [],
  bindingDataFlows: [],
  routeFacts: 0,
  routeFactRows: [],
  routes: [],
  dependencyInjectionFacts: 0,
  openSeams: [],
};
assert.deepEqual(
  new Set(EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS.map((row) => row.kind)),
  new Set(Object.values(ExpectedSemanticEffectKind)),
  'Expected semantic effect descriptors to cover every ExpectedSemanticEffectKind.',
);
assert.deepEqual(
  new Set(APP_BUILDER_GENERATED_FALLBACK_COPY_ROWS.map((row) => row.id)),
  new Set(Object.values(AppBuilderGeneratedFallbackCopyId)),
  'Expected generated fallback copy rows to cover every AppBuilderGeneratedFallbackCopyId.',
);
for (const row of APP_BUILDER_GENERATED_FALLBACK_COPY_ROWS) {
  assert.ok(row.text.length > 0, `Expected generated fallback copy ${row.id} to name concrete text.`);
  assert.ok(row.summary.length > 0, `Expected generated fallback copy ${row.id} to explain ownership.`);
}
for (const descriptor of EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS) {
  assert.ok(
    descriptor.observationSurfaces.length > 0,
    `Expected ${descriptor.kind} descriptor to name at least one verifier observation surface.`,
  );
  assert.ok(
    descriptor.queryKinds.length > 0,
    `Expected ${descriptor.kind} descriptor to name at least one public query family.`,
  );
  assert.notEqual(
    observedCountForExpectedSemanticEffect(
      ExpectedSemanticEffect.fact(`Empty-snapshot descriptor canary for ${descriptor.kind}.`, descriptor.kind),
      emptyExpectedSemanticEffectObservationSnapshot,
    ),
    null,
    `Expected ${descriptor.kind} descriptor to correspond to an observable verifier effect kind.`,
  );
}
const partInvocationCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation
);
assert.equal(
  partInvocationCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourceFragments,
  'Expected the public catalog to advertise part-source invocation as generated source fragments.',
);
assert.equal(
  partInvocationCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.PartSourceSubstrate,
  'Expected the public catalog to identify part-source invocation as reusable part-source substrate.',
);
assert.deepEqual(
  partInvocationCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.PartSourceInvocation,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected the public catalog to advertise the part-source invocation request field.',
);

const ontologyCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.OntologyCatalog
);
assert.equal(
  ontologyCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder ontology catalog to identify itself as the ontology read model.',
);
assert.equal(
  ontologyCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected the app-builder ontology catalog to be read-only.',
);
assert.deepEqual(
  ontologyCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.OntologyCatalog,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected the app-builder ontology catalog to accept only read-only filters plus inquiry profile.',
);

const inputReadinessCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.InputReadiness
);
assert.equal(
  inputReadinessCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder input-readiness query to identify itself as ontology read-model projection.',
);
assert.equal(
  inputReadinessCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder input-readiness to be read-only.',
);
assert.deepEqual(
  inputReadinessCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.InputReadiness,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder input-readiness to accept its typed request field plus inquiry profile.',
);

const inputContractDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
);
assert.equal(
  inputContractDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder input-contract-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  inputContractDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder input-contract-detail to be read-only.',
);
assert.deepEqual(
  inputContractDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.InputContractDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder input-contract-detail to accept its typed request field plus inquiry profile.',
);

const affordanceDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.AffordanceDetail
);
assert.equal(
  affordanceDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder affordance-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  affordanceDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder affordance-detail to be read-only.',
);
assert.deepEqual(
  affordanceDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.AffordanceDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder affordance-detail to accept its typed request field plus inquiry profile.',
);

const applicationPatternDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail
);
assert.equal(
  applicationPatternDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder application-pattern-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  applicationPatternDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder application-pattern-detail to be read-only.',
);
assert.deepEqual(
  applicationPatternDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.ApplicationPatternDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder application-pattern-detail to accept its typed request field plus inquiry profile.',
);

const collectionConceptDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail
);
assert.equal(
  collectionConceptDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder collection-concept-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  collectionConceptDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder collection-concept-detail to be read-only.',
);
assert.deepEqual(
  collectionConceptDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.CollectionConceptDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder collection-concept-detail to accept its typed request field plus inquiry profile.',
);

const controlPatternDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail
);
const controlManifestDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail
);
assert.equal(
  controlManifestDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder control-manifest-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  controlManifestDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder control-manifest-detail to be read-only.',
);
assert.deepEqual(
  controlManifestDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.ControlManifestDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder control-manifest-detail to accept its typed request field plus inquiry profile.',
);

assert.equal(
  controlPatternDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder control-pattern-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  controlPatternDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder control-pattern-detail to be read-only.',
);
assert.deepEqual(
  controlPatternDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.ControlPatternDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder control-pattern-detail to accept its typed request field plus inquiry profile.',
);

const effectContractDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.EffectContractDetail
);
assert.equal(
  effectContractDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder effect-contract-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  effectContractDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder effect-contract-detail to be read-only.',
);
assert.deepEqual(
  effectContractDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.EffectContractDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder effect-contract-detail to accept its typed request field plus inquiry profile.',
);

const policyDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.PolicyDetail
);
assert.equal(
  policyDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder policy-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  policyDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder policy-detail to be read-only.',
);
assert.deepEqual(
  policyDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.PolicyDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder policy-detail to accept its typed request field plus inquiry profile.',
);

const recommendationPolicyCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy
);
assert.equal(
  recommendationPolicyCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder recommendation-policy query to identify itself as ontology read-model projection.',
);
assert.equal(
  recommendationPolicyCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder recommendation-policy to be read-only.',
);
assert.deepEqual(
  recommendationPolicyCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.RecommendationPolicy,
    SemanticRuntimeAppBuilderRequestField.Page,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder recommendation-policy to accept its typed request field, paging, and inquiry profile.',
);

const styleDetailCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.StyleDetail
);
assert.equal(
  styleDetailCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder style-detail query to identify itself as ontology read-model projection.',
);
assert.equal(
  styleDetailCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder style-detail to be read-only.',
);
assert.deepEqual(
  styleDetailCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.StyleDetail,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder style-detail to accept its typed request field plus inquiry profile.',
);

const targetCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.TargetCatalog
);
assert.equal(
  targetCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected the app-builder target catalog to identify itself as ontology read-model projection.',
);
assert.equal(
  targetCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder target catalog to be read-only.',
);
assert.deepEqual(
  targetCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.TargetCatalog,
    SemanticRuntimeAppBuilderRequestField.Page,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder target catalog to accept its typed request field, paging, and inquiry profile.',
);
const defaultTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  page: { size: 10 },
});
assert.equal(defaultTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  defaultTargetCatalogAnswer.value.rows[0]?.targetRef.id,
  AppBuilderApplicationPatternId.AppShell,
  'Expected target-catalog default ordering to start with the source-lowerable app shell instead of raw input facets.',
);
assert.ok(
  defaultTargetCatalogAnswer.value.rows.every((row) =>
    row.status.sourceLoweringImplemented
  ),
  'Expected the first target-catalog page to stay actionable-first for AI-facing menu discovery.',
);
assert.ok(
  defaultTargetCatalogAnswer.value.displayText.includes('order=actionable-first'),
  'Expected target-catalog display text to disclose its AI-facing presentation order.',
);

const sourceLoweringPreflightCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight
);
assert.equal(
  sourceLoweringPreflightCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
  'Expected app-builder source-lowering preflight to identify itself as ontology read-model projection.',
);
assert.equal(
  sourceLoweringPreflightCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.Never,
  'Expected app-builder source-lowering preflight to be read-only.',
);
assert.deepEqual(
  sourceLoweringPreflightCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.SourceLoweringPreflight,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder source-lowering preflight to accept its typed request field plus inquiry profile.',
);

const sourceLoweringInvocationCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation
);
assert.equal(
  sourceLoweringInvocationCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.SourceLoweringSurface,
  'Expected app-builder source-lowering invocation to identify itself as source-lowering surface.',
);
assert.equal(
  sourceLoweringInvocationCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourceFragments,
  'Expected app-builder source-lowering invocation to advertise generated source fragments.',
);
assert.deepEqual(
  sourceLoweringInvocationCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.SourceLoweringInvocation,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder source-lowering invocation to accept its typed request field plus inquiry profile.',
);

const sourceLoweringCompositionCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition
);
assert.equal(
  sourceLoweringCompositionCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.SourceLoweringSurface,
  'Expected app-builder source-lowering composition to identify itself as source-lowering surface.',
);
assert.equal(
  sourceLoweringCompositionCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourceFragments,
  'Expected app-builder source-lowering composition to advertise generated source fragments.',
);
assert.deepEqual(
  sourceLoweringCompositionCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.SourceLoweringComposition,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder source-lowering composition to accept its typed request field plus inquiry profile.',
);

const sourceLoweringSourcePlanCatalogRow = catalog.rows.find((row) =>
  row.queryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
);
assert.equal(
  sourceLoweringSourcePlanCatalogRow?.posture,
  SemanticRuntimeAppBuilderQueryPosture.SourceLoweringSurface,
  'Expected app-builder source-lowering SourcePlan preview to identify itself as source-lowering surface.',
);
assert.equal(
  sourceLoweringSourcePlanCatalogRow?.sourceTextPolicy,
  SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourcePlan,
  'Expected app-builder source-lowering SourcePlan preview to advertise generated SourcePlan output.',
);
assert.deepEqual(
  sourceLoweringSourcePlanCatalogRow?.acceptedRequestFields,
  expectedRequestFields([
    SemanticRuntimeAppBuilderRequestField.SourceLoweringSourcePlan,
    SemanticRuntimeAppBuilderRequestField.InquiryProfile,
  ]),
  'Expected app-builder source-lowering SourcePlan preview to accept its typed request field plus inquiry profile.',
);

const ontologyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
});
assert.equal(ontologyAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const ontologyDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
  ontologyCatalog: {
    includeRows: true,
    includeRelations: true,
  },
});
assert.equal(ontologyDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const toBeDeterminedReasonAuthorityRowCount = APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.filter((row) =>
  row.status.reasonAuthority === AppBuilderOntologyReasonAuthority.ToBeDetermined
).length;
const firstDomainSummary = ontologyAnswer.value.domainSummaries[0];
assert.ok(
  firstDomainSummary != null && 'sourceLoweringImplementedCount' in firstDomainSummary,
  'Expected ontology-catalog domain summaries to expose sourceLoweringImplementedCount.',
);
assert.equal(
  firstDomainSummary != null && 'implementedCount' in firstDomainSummary,
  false,
  'Expected ontology-catalog domain summaries not to expose the ambiguous implementedCount field.',
);
assert.equal(
  ontologyAnswer.value.rowsIncluded,
  false,
  'Expected compact ontology-catalog answers to omit full row families by default.',
);
assert.equal(
  ontologyAnswer.value.relationsIncluded,
  false,
  'Expected compact ontology-catalog answers to omit relation rows by default.',
);
assert.equal(
  ontologyAnswer.value.rowCount,
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.length,
  'Expected compact ontology-catalog answers to keep the total row count visible.',
);
assert.equal(
  ontologyAnswer.value.inputContracts.length
  + ontologyAnswer.value.inputFacets.length
  + ontologyAnswer.value.policyAxes.length
  + ontologyAnswer.value.effectContracts.length
  + ontologyAnswer.value.affordances.length
  + ontologyAnswer.value.applicationPatterns.length
  + ontologyAnswer.value.collectionConcepts.length
  + ontologyAnswer.value.controlPatterns.length
  + ontologyAnswer.value.controlRealizationPolicies.length
  + ontologyAnswer.value.controlManifests.length
  + ontologyAnswer.value.stylingMechanisms.length
  + ontologyAnswer.value.visualPolicies.length,
  0,
  'Expected compact ontology-catalog answers to keep row detail arrays empty.',
);
assert.equal(
  ontologyAnswer.value.relations.length,
  0,
  'Expected compact ontology-catalog answers to keep relation row arrays empty.',
);
assert.ok(
  ontologyAnswer.value.relationCount > 0,
  'Expected compact ontology-catalog answers to keep relation counts visible.',
);
assert.equal(
  ontologyDetailAnswer.value.rowsIncluded,
  true,
  'Expected detail ontology-catalog answers to include full row families when requested.',
);
assert.equal(
  ontologyDetailAnswer.value.relationsIncluded,
  true,
  'Expected detail ontology-catalog answers to include relation rows when requested.',
);
assert.ok(
  ontologyDetailAnswer.value.affordances.every((row) =>
    'sourceLoweringImplemented' in row.status && !('implemented' in row.status)
  ),
  'Expected ontology-catalog status rows to expose sourceLoweringImplemented rather than implemented.',
);
assert.ok(
  ontologyAnswer.value.domainSummaries.some((row) => row.domain === AppBuilderOntologyDomain.Control),
  'Expected the app-builder ontology catalog to expose control terrain.',
);
assert.ok(
  ontologyDetailAnswer.value.inputContracts.some((row) => row.id === AppBuilderInputContractId.VisualStyleInput),
  'Expected the app-builder ontology catalog to expose visual style as explicit input.',
);
assert.ok(
  ontologyDetailAnswer.value.inputFacets.some((row) => row.id === AppBuilderInputFacetId.DomainFields),
  'Expected the app-builder ontology catalog to expose fine-grained input facets.',
);
const domainInputContract = ontologyDetailAnswer.value.inputContracts.find((row) =>
  row.id === AppBuilderInputContractId.DomainModel
);
assert.ok(
  domainInputContract?.acceptedSourceIds.includes(AppBuilderSuppliedInputSource.ExplicitCallerInput),
  'Expected domain-model input to accept explicit caller/AI input.',
);
assert.ok(
  domainInputContract?.acceptedSourceIds.includes(AppBuilderSuppliedInputSource.PublicPreset),
  'Expected domain-model input to accept explicit public presets.',
);
assert.equal(
  domainInputContract?.acceptedSourceIds.includes(AppBuilderSuppliedInputSource.ExistingAppFact),
  false,
  'Expected domain-model input not to treat deterministic existing-app facts as business-domain inference.',
);
assert.ok(
  domainInputContract?.facetIds.includes(AppBuilderInputFacetId.DomainFields),
  'Expected domain-model input to point at its field-schema facet.',
);
assert.ok(
  domainInputContract?.facetIds.includes(AppBuilderInputFacetId.DomainValueSets),
  'Expected domain-model input to point at finite value-set facets for choice controls.',
);
assert.ok(
  ontologyDetailAnswer.value.controlManifests.some((row) => row.id === AppBuilderControlManifestRowId.ValueContract),
  'Expected the app-builder ontology catalog to expose control/component manifest scaffold rows.',
);
assert.ok(
  ontologyDetailAnswer.value.controlRealizationPolicies.some((row) =>
    row.id === AppBuilderControlRealizationPolicyId.InlineNative
  ),
  'Expected the app-builder ontology catalog to expose targetable control realization policy rows.',
);
const sourceLoweringImplementedRowKinds = new Set(
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS
    .filter((row) => row.status.sourceLoweringImplemented)
    .map((row) => row.ref.kind),
);
assert.deepEqual(
  sourceLoweringImplementedRowKinds,
  new Set([AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderOntologyRowKind.ControlPattern]),
  'Expected sourceLoweringImplemented to mean source-lowering support through a named source-lowering surface.',
);
const sourceLoweringImplementedTargetKeys = APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS
  .filter((row) => row.status.sourceLoweringImplemented)
  .map((row) => ontologyTargetKey(row.ref))
  .sort();
const registeredSourceLoweringTargetKeys = APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS
  .map((row) => ontologyTargetKey(row.targetRef))
  .sort();
assert.deepEqual(
  sourceLoweringImplementedTargetKeys,
  registeredSourceLoweringTargetKeys,
  'Expected sourceLoweringImplemented status rows to match the app-builder source-lowering target registry exactly.',
);
assert.ok(
  sourceLoweringImplementedTargetKeys.includes([
    AppBuilderOntologyRowKind.ApplicationPattern,
    AppBuilderOntologyDomain.ApplicationPattern,
    AppBuilderApplicationPatternId.AsyncDataSource,
  ].join('\0')),
  'Expected async-data-source to be a source-lowering-implemented application pattern for promise-member generation.',
);
assert.ok(
  APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS.every((row) => row.sourceLoweringSurfaceKinds.length > 0),
  'Expected every app-builder source-lowering target registry row to expose at least one callable surface.',
);
const fragmentCompositionTargetKeys = APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS
  .filter((row) => row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.FragmentComposition))
  .map((row) => ontologyTargetKey(row.targetRef))
  .sort();
const registeredCompositionTargetKeys = APP_BUILDER_SOURCE_LOWERING_COMPOSITION_TARGET_ROWS
  .map((row) => ontologyTargetKey(row.targetRef))
  .sort();
assert.deepEqual(
  registeredCompositionTargetKeys,
  fragmentCompositionTargetKeys,
  'Expected every FragmentComposition surface target to have an exact source-lowering composition registry row.',
);
const nativeSubmitFormDescriptor = APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.find((row) =>
  row.ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
  && row.ref.id === AppBuilderApplicationPatternId.NativeSubmitForm
);
assert.equal(
  nativeSubmitFormDescriptor?.status.sourceLoweringImplemented,
  true,
  'Expected Native Submit Form to advertise source-lowering support through the composition surface.',
);
assert.ok(
  ontologyDetailAnswer.value.visualPolicies.some((row) => row.id === AppBuilderVisualPolicyId.VisualInputMissing),
  'Expected missing visual input to be a visible policy row rather than hidden fallback behavior.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.HasInputFacet
    && row.from.kind === AppBuilderOntologyRowKind.InputContract
    && row.from.id === AppBuilderInputContractId.DomainModel
    && row.to.kind === AppBuilderOntologyRowKind.InputFacet
    && row.to.id === AppBuilderInputFacetId.DomainFields
  ),
  'Expected ontology-catalog relations to expose input-contract facet edges.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.BlankSlateIntake
    && row.to.kind === AppBuilderOntologyRowKind.InputContract
    && row.to.id === AppBuilderInputContractId.DomainModel
  ),
  'Expected ontology-catalog relations to expose blank-slate input dependencies.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.PolicyAxis
    && row.from.id === AppBuilderPolicyAxisId.ConventionAdmission
    && row.to.kind === AppBuilderOntologyRowKind.InputContract
    && row.to.id === AppBuilderInputContractId.AureliaPolicy
  ),
  'Expected policy-axis rows to publish their declared input dependencies.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.ControlPattern
    && row.from.id === AppBuilderControlPatternId.NativeTextInput
    && row.to.id === AppBuilderInputContractId.DomainModel
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainFields) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainValueSets) === false
  ),
  'Expected text-input control dependency to narrow domain input to field facets rather than all domain-model facets.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.ControlPattern
    && row.from.id === AppBuilderControlPatternId.NativeSingleSelect
    && row.to.id === AppBuilderInputContractId.DomainModel
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainFields) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainValueSets) === true
  ),
  'Expected choice-control dependency to include finite value-set facets in its domain input narrowing.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.UsesControlRealizationPolicy
    && row.from.kind === AppBuilderOntologyRowKind.ControlPattern
    && row.from.id === AppBuilderControlPatternId.NativeTextInput
    && row.to.kind === AppBuilderOntologyRowKind.ControlRealizationPolicy
    && row.to.id === AppBuilderControlRealizationPolicyId.InlineNative
  ),
  'Expected ontology-catalog relations to expose control-pattern realization policy edges.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.ControlRealizationPolicy
    && row.from.id === AppBuilderControlRealizationPolicyId.InlineNative
    && row.to.kind === AppBuilderOntologyRowKind.InputContract
    && row.to.id === AppBuilderInputContractId.DomainModel
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainFields) === true
  ),
  'Expected control-realization policy rows to publish their declared input dependencies.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.CreateSubmitForm
    && row.to.id === AppBuilderInputContractId.DomainModel
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainFields) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainValueSets) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainActions) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainRelationships) === false
  ),
  'Expected create/submit form affordance to compose form field/value-set/action facets without whole-domain input.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.AddAppSection
    && row.to.id === AppBuilderInputContractId.DomainModel
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainEntities) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainFields) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainActions) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainRelationships) === false
  ),
  'Expected add-section affordance to avoid requiring relationship input until a real relationship-oriented section can spend it.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.RouteBackedArea
    && row.to.id === AppBuilderInputContractId.DomainModel
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainEntities) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainFields) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.DomainRelationships) === false
  ),
  'Expected route-backed area affordance to spend entity/field input without treating route addressability as a domain relationship.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.from.id === AppBuilderApplicationPatternId.CollectionTable
    && row.to.id === AppBuilderInputContractId.CollectionProjection
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.CollectionDisplayFields) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.CollectionTableColumns) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.CollectionQueryFeatures) === false
  ),
  'Expected collection-table pattern source projection to ask for display and table facets without forcing query features.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    && row.from.kind === AppBuilderOntologyRowKind.VisualPolicy
    && row.from.id === AppBuilderVisualPolicyId.GeneratedLocalDesignSystem
    && row.to.id === AppBuilderInputContractId.VisualStyleInput
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.VisualTokens) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.VisualClassHooks) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.VisualCssFragments) === true
    && row.inputFacetIds?.includes(AppBuilderInputFacetId.VisualDesignSystemReference) === true
  ),
  'Expected duplicate visual-style facet selections to merge rather than letting the last selection erase earlier facets.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.UsesApplicationPattern
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.CollectionBrowse
    && row.to.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.to.id === AppBuilderApplicationPatternId.CollectionList
  ),
  'Expected affordance rows to publish associated application-pattern relations.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.FollowUpAffordance
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.BlankSlateIntake
    && row.to.kind === AppBuilderOntologyRowKind.Affordance
    && row.to.id === AppBuilderAffordanceId.CreateSubmitForm
  ),
  'Expected blank-slate intake to expose create/submit form as a reachable app-building move.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.UsesApplicationPattern
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.CreateSubmitForm
    && row.to.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.to.id === AppBuilderApplicationPatternId.NativeSubmitForm
  ),
  'Expected create/submit form affordance to publish its native submit-form application-pattern relation.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.PromisesEffect
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.CreateSubmitForm
    && row.to.kind === AppBuilderOntologyRowKind.EffectContract
    && row.to.id === AppBuilderEffectContractId.ControlUseInventory
  ),
  'Expected create/submit form affordance to promise control-use inventory without claiming source lowering exists.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.PromisesEffect
    && row.from.kind === AppBuilderOntologyRowKind.Affordance
    && row.from.id === AppBuilderAffordanceId.CollectionBrowse
    && row.to.kind === AppBuilderOntologyRowKind.EffectContract
    && row.to.id === AppBuilderEffectContractId.SourcePlanPreview
  ),
  'Expected affordance rows to publish promised-effect relations.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.CoordinatesCollectionConcept
    && row.from.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.from.id === AppBuilderApplicationPatternId.CollectionTable
    && row.to.kind === AppBuilderOntologyRowKind.CollectionConcept
    && row.to.id === AppBuilderCollectionConceptId.TableColumn
  ),
  'Expected application-pattern rows to publish coordinated collection-concept relations.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.CompanionApplicationPattern
    && row.from.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.from.id === AppBuilderApplicationPatternId.CollectionTable
    && row.to.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.to.id === AppBuilderApplicationPatternId.LoadingEmptyErrorState
  ),
  'Expected collection presentation patterns to publish loading/empty/error as explicit companion-pattern relations.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.CoordinatesControlPattern
    && row.from.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.from.id === AppBuilderApplicationPatternId.NativeControlBinding
    && row.to.kind === AppBuilderOntologyRowKind.ControlPattern
    && row.to.id === AppBuilderControlPatternId.NativeTextInput
  ),
  'Expected application-pattern rows to publish coordinated control-pattern relations.',
);
assert.ok(
  ontologyDetailAnswer.value.relations.some((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.CoordinatesVisualPolicy
    && row.from.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.from.id === AppBuilderApplicationPatternId.AppShell
    && row.to.kind === AppBuilderOntologyRowKind.VisualPolicy
    && row.to.id === AppBuilderVisualPolicyId.VisualInputMissing
  ),
  'Expected application-pattern rows to publish coordinated visual-policy relations.',
);
const nativeSubmitFormEffectIds = appBuilderEffectContractIdsForTargetRef(appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.NativeSubmitForm,
));
assert.ok(
  nativeSubmitFormEffectIds.includes(AppBuilderEffectContractId.SourcePlanPreview),
  'Expected application-pattern effect targeting to inherit source-plan preview from affordance graph edges.',
);
assert.ok(
  nativeSubmitFormEffectIds.includes(AppBuilderEffectContractId.ControlUseInventory),
  'Expected application-pattern effect targeting to inherit control inventory from affordance graph edges.',
);
assert.ok(
  appBuilderEffectContractIdsForTargetRef(appBuilderOntologyRowRef(
    AppBuilderOntologyRowKind.ControlRealizationPolicy,
    AppBuilderControlRealizationPolicyId.InlineNative,
  )).includes(AppBuilderEffectContractId.ControlUseInventory),
  'Expected control-realization policy effect targeting to traverse policy -> control pattern -> application pattern -> affordance.',
);
assert.deepEqual(
  appBuilderEffectContractIdsForTargetRef(appBuilderOntologyRowRef(
    AppBuilderOntologyRowKind.InputContract,
    AppBuilderInputContractId.DomainModel,
  )),
  [],
  'Expected input contracts to remain dependency facts, not effect targets, even when other rows depend on them.',
);
const filteredOntologyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
  ontologyCatalog: {
    domains: [AppBuilderOntologyDomain.Control],
    recommendationStatuses: [AppBuilderRecommendationStatus.Deferred],
    includeRows: true,
    includeRelations: true,
  },
});
assert.equal(filteredOntologyAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(
  filteredOntologyAnswer.value.domainSummaries.map((row) => row.domain),
  [AppBuilderOntologyDomain.Control],
  'Expected ontology-catalog domain filters to narrow returned row families.',
);
assert.ok(
  filteredOntologyAnswer.value.controlPatterns.length > 0,
  'Expected deferred control rows to remain visible through typed filters.',
);
assert.ok(
  filteredOntologyAnswer.value.inputContracts.length === 0
  && filteredOntologyAnswer.value.applicationPatterns.length === 0
  && filteredOntologyAnswer.value.visualPolicies.length === 0,
  'Expected ontology-catalog filters to omit unrelated row families instead of returning the full catalog.',
);
assert.ok(
  filteredOntologyAnswer.value.relations.every((row) =>
    row.relationKind === AppBuilderOntologyRelationKind.InputDependency
    || row.relationKind === AppBuilderOntologyRelationKind.UsesControlRealizationPolicy
  ),
  'Expected filtered ontology rows to keep only currently modeled control-domain dependency and realization-policy relations.',
);
const compactFilteredOntologyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
  ontologyCatalog: {
    domains: [AppBuilderOntologyDomain.Control],
    recommendationStatuses: [AppBuilderRecommendationStatus.Deferred],
  },
});
assert.equal(compactFilteredOntologyAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  compactFilteredOntologyAnswer.value.rowsIncluded,
  false,
  'Expected filtered ontology-catalog answers to stay compact unless row detail is requested.',
);
assert.equal(
  compactFilteredOntologyAnswer.value.controlPatterns.length,
  0,
  'Expected compact filtered ontology-catalog answers to omit row arrays while keeping summary counts.',
);
assert.ok(
  compactFilteredOntologyAnswer.value.domainSummaries.reduce((sum, row) => sum + row.rowCount, 0) > 0,
  'Expected compact filtered ontology-catalog answers to keep filtered row counts visible.',
);
const noRelationOntologyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
  ontologyCatalog: {
    includeRows: true,
    includeRelations: false,
  },
});
assert.equal(
  noRelationOntologyAnswer.value.relations.length,
  0,
  'Expected ontology-catalog callers to be able to suppress relation rows for compact reads.',
);
const sourceLoweringFilterOntologyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
  ontologyCatalog: {
    sourceLoweringImplemented: false,
    includeRelations: false,
  },
});
assert.equal(sourceLoweringFilterOntologyAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  sourceLoweringFilterOntologyAnswer.value.domainSummaries.reduce((sum, row) => sum + row.rowCount, 0) > 0,
  'Expected ontology-catalog callers to filter by sourceLoweringImplemented.',
);
const reasonAuthorityFilterOntologyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
  ontologyCatalog: {
    reasonAuthorities: [AppBuilderOntologyReasonAuthority.ToBeDetermined],
    includeRelations: false,
  },
});
assert.equal(reasonAuthorityFilterOntologyAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  reasonAuthorityFilterOntologyAnswer.value.domainSummaries.reduce((sum, row) => sum + row.rowCount, 0),
  toBeDeterminedReasonAuthorityRowCount,
  'Expected ontology-catalog callers to filter by reasonAuthority so TBD review terrain is directly queryable.',
);
assert.ok(
  reasonAuthorityFilterOntologyAnswer.value.domainSummaries.length > 0,
  'Expected reasonAuthority filters to expose at least one review-needed ontology family while app-builder ontology terrain remains provisional.',
);

const defaultReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
});
assert.equal(defaultReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(defaultReadinessAnswer.value.defaultTargetUsed, true);
assert.equal(
  defaultReadinessAnswer.value.targets[0]?.targetRef.id,
  AppBuilderAffordanceId.BlankSlateIntake,
  'Expected omitted input-readiness targets to inspect blank-slate intake.',
);
assert.equal(
  defaultReadinessAnswer.value.missingRequiredCount,
  3,
  'Expected blank-slate intake to report missing domain, policy, and placement input.',
);
assert.ok(
  defaultReadinessAnswer.value.targets[0]?.inputDependencies.every((row) =>
    row.state === AppBuilderInputReadinessState.MissingRequired
  ),
  'Expected blank-slate intake dependencies to be required before supplied inputs are present.',
);
assert.ok(
  defaultReadinessAnswer.value.targets[0]?.inputDependencies.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets?.some((facet) => facet.id === AppBuilderInputFacetId.DomainFields) === true
  ),
  'Expected input-readiness dependency rows to include fine-grained input facets by default.',
);
const compactSelectorReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
    includeInputFacets: false,
  },
});
assert.equal(compactSelectorReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactSelectorReadinessAnswer.value.defaultTargetUsed, false);
assert.equal(
  compactSelectorReadinessAnswer.value.targets[0]?.targetRef.domain,
  AppBuilderOntologyDomain.Control,
  'Expected compact input-readiness target selectors to derive the exact target domain from the row kind.',
);
assert.equal(
  compactSelectorReadinessAnswer.value.targets[0]?.targetRef.id,
  AppBuilderControlPatternId.NativeTextInput,
  'Expected compact input-readiness target selectors to select the same row as exact targetRefs.',
);
const mismatchedSelectorReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Input,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
  },
});
assert.equal(mismatchedSelectorReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(mismatchedSelectorReadinessAnswer.value.targets.length, 1);
assert.ok(
  mismatchedSelectorReadinessAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderInputReadinessIssueKind.TargetSelectorDomainMismatch
    && issue.expectedDomain === AppBuilderOntologyDomain.Control
  ),
  'Expected compact target selectors with a stale domain to report the derived-domain mismatch without losing the known target.',
);
const unknownSelectorReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      id: 'not-a-real-control-pattern',
    }],
  },
});
assert.equal(unknownSelectorReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(unknownSelectorReadinessAnswer.value.defaultTargetUsed, false);
assert.equal(unknownSelectorReadinessAnswer.value.targets.length, 0);
assert.ok(
  unknownSelectorReadinessAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderInputReadinessIssueKind.UnknownTarget
    && issue.targetSelector?.id === 'not-a-real-control-pattern'
  ),
  'Expected unknown compact target selectors to report unknown-target instead of falling back to blank-slate readiness.',
);

const unscopedInputContractDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
});
assert.equal(unscopedInputContractDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  unscopedInputContractDetailAnswer.value.payloadSchemasIncluded,
  false,
  'Expected unscoped input-contract-detail to report contract/facet terrain without every payload schema body.',
);
assert.equal(
  unscopedInputContractDetailAnswer.value.existingAppFactQueriesIncluded,
  false,
  'Expected unscoped input-contract-detail to keep app-fact query rows behind explicit detail.',
);
assert.ok(
  unscopedInputContractDetailAnswer.value.rows.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets.some((facet) =>
      facet.facet.id === AppBuilderInputFacetId.DomainFields
      && facet.payloadSchemaState === AppBuilderInputPayloadSchemaState.Modeled
      && facet.payloadSchema == null
    )
  ),
  'Expected unscoped input-contract-detail to preserve modeled schema state while omitting schema bodies.',
);
assert.ok(
  unscopedInputContractDetailAnswer.value.rows.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.ExistingAppFacts
    && row.inputFacets.some((facet) =>
      facet.facet.id === AppBuilderInputFacetId.ExistingResourceFacts
      && facet.existingAppFactQueryCount > 0
      && facet.existingAppFactQueryRows == null
    )
  ),
  'Expected compact existing-app fact detail to report query counts without embedding query rows.',
);
assert.ok(
  serializedByteLength(unscopedInputContractDetailAnswer) < 30000,
  'Expected unscoped input-contract-detail to stay compact unless payload schemas are selected explicitly.',
);
const continuedUnscopedInputContractDetailAnswer = withSemanticRuntimeAppBuilderQueryContinuations(
  { kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail },
  unscopedInputContractDetailAnswer,
);
assert.ok(
  continuedUnscopedInputContractDetailAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
    && row.targetAppBuilderQuery?.inputContractDetail?.includeSourceLoweringConsumers === true
  ) === true,
  'Expected compact input-contract-detail answers with consumer counts to continue into source-lowering consumer row detail.',
);
assert.ok(
  continuedUnscopedInputContractDetailAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
    && row.targetAppBuilderQuery?.inputContractDetail?.includeSourceLoweringValueSupport === true
  ) === true,
  'Expected compact input-contract-detail answers with value-support counts to continue into source-lowering value support row detail.',
);

const domainInputDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputContractIds: [AppBuilderInputContractId.DomainModel],
  },
});
assert.equal(domainInputDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(domainInputDetailAnswer.value.rows.length, 1);
assert.equal(domainInputDetailAnswer.value.rows[0]?.inputContract.id, AppBuilderInputContractId.DomainModel);
const continuedDomainInputDetailAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputContractIds: [AppBuilderInputContractId.DomainModel],
  },
}, domainInputDetailAnswer);
const inputDetailTargetCatalogContinuation = continuedDomainInputDetailAnswer.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.TargetCatalog
);
assert.ok(
  inputDetailTargetCatalogContinuation?.targetAppBuilderQuery?.targetCatalog?.targetRefs?.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.InputContract
    && targetRef.id === AppBuilderInputContractId.DomainModel
  ) === true,
  'Expected input-contract-detail continuations to preserve exact target refs for returned input contracts.',
);
assert.equal(
  inputDetailTargetCatalogContinuation?.targetAppBuilderQuery?.targetCatalog?.targetKinds,
  undefined,
  'Expected input-contract-detail continuations not to widen exact returned rows back to kind-only target-catalog filters.',
);
const domainFieldDetail = domainInputDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.DomainFields
);
assert.equal(
  domainFieldDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected domain field input detail to expose a modeled payload schema.',
);
assert.equal(
  domainFieldDetail?.payloadSchema?.kind,
  AppBuilderInputPayloadSchemaKind.Array,
  'Expected domain field input detail to describe an array of field descriptors.',
);
const fieldValueKindProperty = domainFieldDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'valueKind'
);
assert.ok(
  fieldValueKindProperty?.schema.enumValues?.includes('choice-set') === true,
  'Expected domain field payload schema to carry the current field value-kind enum values.',
);
const optionTypeNameProperty = domainFieldDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'optionTypeName'
);
assert.equal(
  optionTypeNameProperty?.schema.kind,
  AppBuilderInputPayloadSchemaKind.String,
  'Expected domain field payload schema to expose explicit finite-option TypeScript alias names.',
);
const numericConstraintsProperty = domainFieldDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'numericConstraints'
);
assert.equal(
  numericConstraintsProperty?.schema.properties?.some((property) => property.name === 'minimum'),
  true,
  'Expected domain field payload schema to expose numeric minimum constraints for native numeric controls.',
);
assert.equal(
  numericConstraintsProperty?.schema.properties?.some((property) => property.name === 'maximum'),
  true,
  'Expected domain field payload schema to expose numeric maximum constraints for native numeric controls.',
);
assert.equal(
  numericConstraintsProperty?.schema.properties?.some((property) => property.name === 'step'),
  true,
  'Expected domain field payload schema to expose numeric step constraints for native numeric controls.',
);
const domainValueSetDetail = domainInputDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.DomainValueSets
);
assert.equal(
  domainValueSetDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected domain value-set input detail to expose a modeled payload schema.',
);
const valueSetOptionsProperty = domainValueSetDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'options'
);
assert.equal(
  valueSetOptionsProperty?.required,
  true,
  'Expected domain value-set payloads to require explicit option lists.',
);
const domainRelationshipDetail = domainInputDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.DomainRelationships
);
assert.equal(
  domainRelationshipDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected domain relationship input detail to expose a modeled payload schema.',
);
const relationshipKindProperty = domainRelationshipDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'kind'
);
assert.ok(
  relationshipKindProperty?.schema.enumValues?.includes(AppBuilderDomainRelationshipKind.NestedValueObject) === true,
  'Expected domain relationship payload schemas to use the named app-builder relationship-kind vocabulary.',
);
assert.equal(
  domainRelationshipDetail?.sourceLoweringConsumerCount,
  0,
  'Expected domain relationships not to appear as unconditional source-lowering consumers; value-support rows describe the relationship kinds that can currently be spent.',
);
const referenceOneSupport = domainRelationshipDetail?.sourceLoweringValueSupportRows?.find((row) =>
  row.axis === AppBuilderInputFacetValueAxis.DomainRelationshipKind
  && row.value === AppBuilderDomainRelationshipKind.ReferenceOne
);
assert.equal(
  referenceOneSupport?.supportKind,
  AppBuilderInputFacetValueSourceLoweringSupportKind.ReferenceLookup,
  'Expected reference-one relationships to report first-ring related-label lookup support.',
);
assert.ok(
  referenceOneSupport?.targetRefs.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.RouterBackedListDetail
  ) === true,
  'Expected reference-one relationship support to point at router-backed list/detail source lowering.',
);
const ownsManySupport = domainRelationshipDetail?.sourceLoweringValueSupportRows?.find((row) =>
  row.axis === AppBuilderInputFacetValueAxis.DomainRelationshipKind
  && row.value === AppBuilderDomainRelationshipKind.OwnsMany
);
assert.equal(
  ownsManySupport?.supportKind,
  AppBuilderInputFacetValueSourceLoweringSupportKind.OwnedValueSource,
  'Expected owns-many relationships to report first-ring local owned-child source support.',
);
assert.ok(
  ownsManySupport?.targetRefs.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.LocalViewModelState
  ) === true,
  'Expected owns-many relationship support to point at local view-model state source lowering.',
);
const ownsOneSupport = domainRelationshipDetail?.sourceLoweringValueSupportRows?.find((row) =>
  row.axis === AppBuilderInputFacetValueAxis.DomainRelationshipKind
  && row.value === AppBuilderDomainRelationshipKind.OwnsOne
);
assert.equal(
  ownsOneSupport?.supportKind,
  AppBuilderInputFacetValueSourceLoweringSupportKind.OwnedValueSource,
  'Expected owns-one relationships to report first-ring local owned-child source support.',
);
assert.ok(
  ownsOneSupport?.targetRefs.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.LocalViewModelState
  ) === true,
  'Expected owns-one relationship support to point at local view-model state source lowering.',
);
const nestedValueObjectSupport = domainRelationshipDetail?.sourceLoweringValueSupportRows?.find((row) =>
  row.axis === AppBuilderInputFacetValueAxis.DomainRelationshipKind
  && row.value === AppBuilderDomainRelationshipKind.NestedValueObject
);
assert.equal(
  nestedValueObjectSupport?.supportKind,
  AppBuilderInputFacetValueSourceLoweringSupportKind.OwnedValueSource,
  'Expected nested-value-object relationships to report first-ring local value-object source support.',
);
assert.ok(
  nestedValueObjectSupport?.targetRefs.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.LocalViewModelState
  ) === true,
  'Expected nested-value-object relationship support to point at local view-model state source lowering.',
);
const domainActionDetail = domainInputDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.DomainActions
);
assert.equal(
  domainActionDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected domain action input detail to expose a modeled payload schema.',
);
const actionKindProperty = domainActionDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'kind'
);
assert.ok(
  actionKindProperty?.schema.enumValues?.includes(AppBuilderDomainActionKind.Assign) === true,
  'Expected domain action payload schemas to use the named app-builder action-kind vocabulary.',
);
const actionScopeProperty = domainActionDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'scope'
);
assert.ok(
  actionScopeProperty?.schema.enumValues?.includes(AppBuilderDomainActionScope.Integration) === true,
  'Expected domain action payload schemas to expose action scopes for future source realization.',
);
assert.ok(
  domainActionDetail?.sourceLoweringConsumerRows?.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
    && row.targetRef.id === AppBuilderControlPatternId.NativeButton
  ) === true,
  'Expected selected domain action input detail to expose native-button source-lowering consumers.',
);
assert.ok(
  domainActionDetail?.sourceLoweringValueSupportRows?.some((row) =>
    row.axis === AppBuilderInputFacetValueAxis.DomainActionKind
    && row.value === AppBuilderDomainActionKind.Create
    && row.supportKind === AppBuilderInputFacetValueSourceLoweringSupportKind.DerivedLocalTypeScriptMethod
    && row.targetRefs.some((targetRef) =>
      targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
      && targetRef.id === AppBuilderApplicationPatternId.DomainCommandAction
    )
  ) === true,
  'Expected create actions to expose narrow derived local TypeScript method support.',
);
const navigationActionScopeSupportRows = domainActionDetail?.sourceLoweringValueSupportRows?.filter((row) =>
  row.axis === AppBuilderInputFacetValueAxis.DomainActionScope
  && row.value === AppBuilderDomainActionScope.Navigation
) ?? [];
assert.ok(
  navigationActionScopeSupportRows.some((row) =>
    row.supportKind === AppBuilderInputFacetValueSourceLoweringSupportKind.NativeEventBinding
  ),
  'Expected navigation-scoped actions to expose native event binding support without implying route semantics.',
);
assert.ok(
  navigationActionScopeSupportRows.some((row) =>
    row.supportKind === AppBuilderInputFacetValueSourceLoweringSupportKind.RouterLoadNavigation
    && row.targetRefs.some((targetRef) =>
      targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
      && targetRef.id === AppBuilderApplicationPatternId.RouteNavigationAction
    )
  ),
  'Expected navigation-scoped actions to expose route-navigation action support without pointing at route-configuration source lowering.',
);
const inputDetailConsumerTargetContinuation = continuedDomainInputDetailAnswer.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.TargetCatalog
  && row.targetAppBuilderQuery?.targetCatalog?.targetRefs?.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
    && targetRef.id === AppBuilderControlPatternId.NativeButton
  )
);
assert.ok(
  inputDetailConsumerTargetContinuation != null,
  'Expected input-contract-detail continuations to open target rows for source-lowering consumers of returned input facets.',
);
const inputDetailConsumerPreflightContinuation = continuedDomainInputDetailAnswer.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight
  && row.targetAppBuilderQuery?.sourceLoweringPreflight?.targetRefs?.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
    && targetRef.id === AppBuilderControlPatternId.NativeButton
  )
);
assert.ok(
  inputDetailConsumerPreflightContinuation != null,
  'Expected input-contract-detail continuations to offer source-lowering preflight for consumer targets.',
);
const visualInputDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputContractIds: [AppBuilderInputContractId.VisualStyleInput],
  },
});
assert.equal(visualInputDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const visualClassHooksDetail = visualInputDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.VisualClassHooks
);
assert.equal(
  visualClassHooksDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected visual class hooks to expose a modeled payload schema once source lowerers can spend them.',
);
assert.equal(
  visualClassHooksDetail?.payloadSchema?.kind,
  AppBuilderInputPayloadSchemaKind.Array,
  'Expected visual class hooks to describe an array of hook payloads.',
);
const visualHookTargetProperty = visualClassHooksDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'target'
);
assert.ok(
  visualHookTargetProperty?.schema.enumValues?.includes(AppBuilderSourceLoweringVisualHookTarget.FieldControl) === true
  && visualHookTargetProperty.schema.enumValues.includes(AppBuilderSourceLoweringVisualHookTarget.Form) === true,
  'Expected visual hook target schema to expose control and form attachment targets.',
);
const visualHookClassTokensProperty = visualClassHooksDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'classTokens'
);
assert.equal(
  visualHookClassTokensProperty?.schema.items?.kind,
  AppBuilderInputPayloadSchemaKind.PatternString,
  'Expected visual class hook payloads to validate class tokens as pattern strings.',
);
const visualHookDataAttributesProperty = visualClassHooksDetail?.payloadSchema?.items?.properties?.find((property) =>
  property.name === 'dataAttributes'
);
const visualHookDataAttributeNameProperty = visualHookDataAttributesProperty?.schema.items?.properties?.find((property) =>
  property.name === 'name'
);
assert.equal(
  visualHookDataAttributeNameProperty?.schema.kind,
  AppBuilderInputPayloadSchemaKind.PatternString,
  'Expected visual data attribute names to validate through the shared pattern-string schema primitive.',
);
const existingAppFactDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputContractIds: [AppBuilderInputContractId.ExistingAppFacts],
  },
});
assert.equal(existingAppFactDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  existingAppFactDetailAnswer.value.rows[0]?.inputFacets.every((row) =>
    row.payloadSchemaState === AppBuilderInputPayloadSchemaState.NotCallerPayload
    && row.payloadSchema == null
  ),
  'Expected existing-app facts to be semantic-runtime app facts rather than caller payload schemas.',
);
assert.equal(
  existingAppFactDetailAnswer.value.existingAppFactQueryFacetCount,
  3,
  'Expected every existing-app fact facet to list app-world query suppliers.',
);
assert.equal(
  existingAppFactDetailAnswer.value.existingAppFactQueryRowCount,
  12,
  'Expected existing-app facts to expose resource, route, and plugin query suppliers.',
);
const existingResourceFactDetail = existingAppFactDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.ExistingResourceFacts
);
assert.deepEqual(
  existingResourceFactDetail?.existingAppFactQueryRows.map((row) => row.queryKind),
  [
    SemanticAppQueryKind.ResourceDefinitions,
    SemanticAppQueryKind.ResourceVisibility,
    SemanticAppQueryKind.ControlUseInventory,
  ],
  'Expected existing-resource facts to point at resource definitions, visibility, and control-use inventory.',
);
assert.deepEqual(
  existingResourceFactDetail?.existingAppFactQueryRows.map((row) => row.purpose),
  [
    AppBuilderExistingAppFactQueryPurpose.ResourceDefinitionCatalog,
    AppBuilderExistingAppFactQueryPurpose.ResourceScopeVisibility,
    AppBuilderExistingAppFactQueryPurpose.ControlUseInventory,
  ],
  'Expected existing-resource fact query rows to explain their resource/control purpose.',
);
const existingPluginFactDetail = existingAppFactDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.ExistingPluginFacts
);
assert.ok(
  existingPluginFactDetail?.existingAppFactQueryRows.some((row) =>
    row.queryKind === SemanticAppQueryKind.StateStores
    && row.useKind === AppBuilderExistingAppFactUseKind.HandoffBoundary
  ) === true,
  'Expected @aurelia/state existing facts to stay report/handoff oriented rather than source-lowering oriented.',
);
assert.ok(
  existingPluginFactDetail?.existingAppFactQueryRows.some((row) =>
    row.queryKind === SemanticAppQueryKind.ValidationIssues
    && row.useKind === AppBuilderExistingAppFactUseKind.InformPolicySelection
  ) === true,
  'Expected validation plugin facts to inform policy without becoming generated validation-library source.',
);
const compactInputDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputFacetIds: [AppBuilderInputFacetId.DomainFields],
    includePayloadSchemas: false,
  },
});
assert.equal(compactInputDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactInputDetailAnswer.value.rows.length, 1);
assert.equal(compactInputDetailAnswer.value.payloadSchemasIncluded, false);
assert.equal(
  compactInputDetailAnswer.value.rows[0]?.inputFacets[0]?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected compact input detail to retain payload schema state.',
);
assert.equal(
  compactInputDetailAnswer.value.rows[0]?.inputFacets[0]?.payloadSchema,
  undefined,
  'Expected compact input detail to suppress payload schema bodies.',
);
const notCallerPayloadOnlyDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    payloadSchemaStates: [AppBuilderInputPayloadSchemaState.NotCallerPayload],
  },
});
assert.equal(notCallerPayloadOnlyDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(
  notCallerPayloadOnlyDetailAnswer.value.rows.map((row) => row.inputContract.id),
  [AppBuilderInputContractId.ExistingAppFacts],
  'Expected payload-schema-state filters to omit contracts with no matching facets.',
);
const seedInputDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputContractIds: [AppBuilderInputContractId.SeedData],
  },
});
assert.equal(seedInputDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const seedDensityPurposeDetail = seedInputDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.SeedDensityPurpose
);
assert.ok(
  seedDensityPurposeDetail?.payloadSchemaState === AppBuilderInputPayloadSchemaState.Deferred,
  'Expected seed density/purpose selection to stay deferred until a public preset/defaulting layer consumes it.',
);
const seedRecordSetDetail = seedInputDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.SeedRecordSet
);
assert.equal(
  seedRecordSetDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected seed record sets to expose a modeled dynamic record payload schema.',
);
assert.equal(
  seedRecordSetDetail?.payloadSchema?.kind,
  AppBuilderInputPayloadSchemaKind.Union,
  'Expected seed record sets to accept unscoped records or entity-scoped record groups.',
);
const unscopedSeedRecordSetSchema = seedRecordSetDetail?.payloadSchema?.variants?.find((variant) =>
  variant.title === 'Unscoped Seed Records'
);
assert.equal(
  unscopedSeedRecordSetSchema?.items?.kind,
  AppBuilderInputPayloadSchemaKind.Record,
  'Expected unscoped seed record set items to describe dynamic records keyed by selected domain fields.',
);
const entitySeedRecordGroupSchema = seedRecordSetDetail?.payloadSchema?.variants?.find((variant) =>
  variant.title === 'Entity Seed Record Groups'
);
const groupedSeedRecordsProperty = entitySeedRecordGroupSchema?.items?.properties?.find((property) =>
  property.name === 'records'
);
assert.equal(
  groupedSeedRecordsProperty?.schema.items?.kind,
  AppBuilderInputPayloadSchemaKind.Record,
  'Expected entity-scoped seed groups to carry arrays of dynamic seed records.',
);
const seedRecordValueSchema = unscopedSeedRecordSetSchema?.items?.valueSchema;
assert.equal(
  seedRecordValueSchema?.kind,
  AppBuilderInputPayloadSchemaKind.Union,
  'Expected seed record values to use a union payload schema.',
);
assert.ok(
  seedRecordValueSchema?.variants?.some((variant) => variant.kind === AppBuilderInputPayloadSchemaKind.Null) === true,
  'Expected seed record values to include null as a modeled primitive.',
);
assert.ok(
  seedRecordValueSchema?.variants?.some((variant) => variant.kind === AppBuilderInputPayloadSchemaKind.Array) === true,
  'Expected seed record values to include primitive arrays for choice-set-like fields.',
);
const aureliaPolicyInputDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputContractIds: [AppBuilderInputContractId.AureliaPolicy],
    includeSourceLoweringValueSupport: true,
  },
});
assert.equal(aureliaPolicyInputDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const aureliaPluginPolicyDetail = aureliaPolicyInputDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.AureliaPluginPolicy
);
assert.equal(
  aureliaPluginPolicyDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected plugin policy to expose a modeled payload schema even while plugin generation remains contextual/deferred.',
);
const packageCapabilitiesProperty = aureliaPluginPolicyDetail?.payloadSchema?.properties?.find((property) =>
  property.name === 'packageCapabilities'
);
assert.ok(
  packageCapabilitiesProperty?.schema.items?.enumValues?.includes(AppBuilderPackageCapability.State) === true,
  'Expected plugin policy payload schema to admit the @aurelia/state capability explicitly.',
);
const statePackageCapabilitySupport = aureliaPluginPolicyDetail?.sourceLoweringValueSupportRows?.find((row) =>
  row.axis === AppBuilderInputFacetValueAxis.PackageCapability
  && row.value === AppBuilderPackageCapability.State
);
assert.equal(
  statePackageCapabilitySupport?.supportKind,
  AppBuilderInputFacetValueSourceLoweringSupportKind.DeferredCapabilityHandoff,
  'Expected @aurelia/state package policy to report handoff-only source-lowering support until store architecture generation is deliberate.',
);
assert.ok(
  statePackageCapabilitySupport?.targetRefs.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.PolicyAxis
    && targetRef.id === AppBuilderPolicyAxisId.PluginAdmission
  ) === true,
  'Expected @aurelia/state package policy support to point at plugin-admission policy.',
);
for (const capability of [AppBuilderPackageCapability.VirtualRepeat, AppBuilderPackageCapability.Fetch]) {
  assert.ok(
    aureliaPluginPolicyDetail?.sourceLoweringValueSupportRows?.some((row) =>
      row.axis === AppBuilderInputFacetValueAxis.PackageCapability
      && row.value === capability
      && row.supportKind === AppBuilderInputFacetValueSourceLoweringSupportKind.DeferredCapabilityHandoff
    ) === true,
    `Expected ${capability} package policy to be visible as a handoff-only source-lowering value support row.`,
  );
}
const sourcePlacementDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputContractIds: [AppBuilderInputContractId.SourcePlacement],
  },
});
assert.equal(sourcePlacementDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const sourceNamingDetail = sourcePlacementDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.SourceNaming
);
const sourceTargetPathDetail = sourcePlacementDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.SourceTargetPath
);
assert.equal(
  sourceTargetPathDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected source target path to expose a modeled payload schema for concrete SourcePlan preview placement.',
);
assert.equal(
  sourceTargetPathDetail?.payloadSchema?.kind,
  AppBuilderInputPayloadSchemaKind.String,
  'Expected source target path to be modeled as a string payload distinct from source file-layout policy.',
);
assert.equal(
  sourceNamingDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected source naming to expose a modeled payload schema grounded in source-name/source-pattern substrate.',
);
const sourcePatternParameterKeyProperty = sourceNamingDetail?.payloadSchema?.properties
  ?.find((property) => property.name === 'sourcePatternParameterValues')
  ?.schema.items?.properties?.find((property) => property.name === 'key');
assert.ok(
  sourcePatternParameterKeyProperty?.schema.enumValues?.includes(SourcePatternParameterKey.DetailRouteParameter) === true,
  'Expected source naming payload schema to expose SourcePatternParameterKey values for coordinated source rewrites.',
);
const sourceNamingUndefinedOptionalPayloadAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetRefs: [appBuilderOntologyRowRef(
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderApplicationPatternId.AppShell,
    )],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.SourcePlacement,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.SourceNaming,
        value: {
          appName: 'Undefined Optional App',
          baseName: undefined,
        },
      }],
    }],
  },
});
assert.equal(sourceNamingUndefinedOptionalPayloadAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  sourceNamingUndefinedOptionalPayloadAnswer.value.invalidPayloadCount,
  0,
  'Expected optional object payload properties with undefined values to validate like omitted JSON properties.',
);
const sourceProjectToolingDetail = sourcePlacementDetailAnswer.value.rows[0]?.inputFacets.find((row) =>
  row.facet.id === AppBuilderInputFacetId.SourceProjectTooling
);
assert.equal(
  sourceProjectToolingDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected source project tooling to expose a modeled payload schema grounded in SourcePlanProjectTooling.',
);
const packageManagerProperty = sourceProjectToolingDetail?.payloadSchema?.properties?.find((property) =>
  property.name === 'packageManager'
);
assert.ok(
  packageManagerProperty?.schema.enumValues?.includes(SourcePlanPackageManager.HostSelected) === true,
  'Expected source project tooling schema to expose SourcePlanPackageManager values.',
);
const buildToolPolicyProperty = sourceProjectToolingDetail?.payloadSchema?.properties?.find((property) =>
  property.name === 'buildToolPolicy'
);
assert.ok(
  buildToolPolicyProperty?.schema.enumValues?.includes(SourcePlanBuildToolPolicy.AppBuilderBaseline) === true,
  'Expected source project tooling schema to expose SourcePlanBuildToolPolicy values.',
);
const dependencyScopeProperty = sourceProjectToolingDetail?.payloadSchema?.properties
  ?.find((property) => property.name === 'packageDependencies')
  ?.schema.items?.properties?.find((property) => property.name === 'scope');
assert.ok(
  dependencyScopeProperty?.schema.enumValues?.includes(SourcePlanPackageDependencyScope.DevDependency) === true,
  'Expected package dependency payload rows to expose SourcePlanPackageDependencyScope values.',
);
const toolingFileKindProperty = sourceProjectToolingDetail?.payloadSchema?.properties
  ?.find((property) => property.name === 'toolingFiles')
  ?.schema.items?.properties?.find((property) => property.name === 'fileKind');
assert.ok(
  toolingFileKindProperty?.schema.enumValues?.includes(SourcePlanProjectToolingFileKind.TypeScriptConfig) === true
  && toolingFileKindProperty?.schema.enumValues?.includes(SourcePlanProjectToolingFileKind.RootDocument) === true
  && toolingFileKindProperty?.schema.enumValues?.includes(SourcePlanProjectToolingFileKind.BuildConfig) === true,
  'Expected tooling file payload rows to expose SourcePlanProjectToolingFileKind values.',
);
const collectionProjectionDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  inputContractDetail: {
    inputContractIds: [AppBuilderInputContractId.CollectionProjection],
  },
});
assert.equal(collectionProjectionDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const collectionDisplayRoleProperty = collectionProjectionDetailAnswer.value.rows[0]?.inputFacets
  .find((row) => row.facet.id === AppBuilderInputFacetId.CollectionDisplayFields)
  ?.payloadSchema?.items?.properties?.find((property) => property.name === 'role');
assert.ok(
  collectionDisplayRoleProperty?.schema.enumValues?.includes(AppBuilderCollectionDisplayRole.Title) === true,
  'Expected collection display roles to use the named app-builder enum vocabulary.',
);
assert.equal(
  collectionDisplayRoleProperty?.schema.enumValues?.includes('action'),
  false,
  'Expected collection display roles to remain field-backed; row actions belong in CollectionTableColumns.actionName.',
);
const collectionTableDisplayKindProperty = collectionProjectionDetailAnswer.value.rows[0]?.inputFacets
  .find((row) => row.facet.id === AppBuilderInputFacetId.CollectionTableColumns)
  ?.payloadSchema?.items?.properties?.find((property) => property.name === 'displayKind');
assert.ok(
  collectionTableDisplayKindProperty?.schema.enumValues?.includes(AppBuilderCollectionTableColumnDisplayKind.Action) === true,
  'Expected collection table display kinds to use the named app-builder enum vocabulary.',
);
assert.ok(
  collectionTableDisplayKindProperty?.schema.enumValues?.includes(AppBuilderCollectionTableColumnDisplayKind.Relation) === true,
  'Expected collection table display kinds to include relationship-backed relation columns.',
);
const collectionTableFieldNameProperty = collectionProjectionDetailAnswer.value.rows[0]?.inputFacets
  .find((row) => row.facet.id === AppBuilderInputFacetId.CollectionTableColumns)
  ?.payloadSchema?.items?.properties?.find((property) => property.name === 'fieldName');
assert.equal(
  collectionTableFieldNameProperty?.required,
  false,
  'Expected table columns not to require fieldName because action columns are admitted as table columns too.',
);
const collectionTableActionNameProperty = collectionProjectionDetailAnswer.value.rows[0]?.inputFacets
  .find((row) => row.facet.id === AppBuilderInputFacetId.CollectionTableColumns)
  ?.payloadSchema?.items?.properties?.find((property) => property.name === 'actionName');
assert.equal(
  collectionTableActionNameProperty?.required,
  false,
  'Expected table columns to expose actionName for action-backed columns instead of forcing action columns into fieldName.',
);
const collectionTableRelationshipNameProperty = collectionProjectionDetailAnswer.value.rows[0]?.inputFacets
  .find((row) => row.facet.id === AppBuilderInputFacetId.CollectionTableColumns)
  ?.payloadSchema?.items?.properties?.find((property) => property.name === 'relationshipName');
assert.equal(
  collectionTableRelationshipNameProperty?.required,
  false,
  'Expected table columns to expose relationshipName for relationship-backed columns instead of forcing relationship display through field overrides.',
);
const collectionQueryFeatureProperty = collectionProjectionDetailAnswer.value.rows[0]?.inputFacets
  .find((row) => row.facet.id === AppBuilderInputFacetId.CollectionQueryFeatures)
  ?.payloadSchema?.items?.properties?.find((property) => property.name === 'featureId');
assert.ok(
  collectionQueryFeatureProperty?.schema.enumValues?.includes(AppBuilderCollectionFeatureId.LocalSorting) === true,
  'Expected collection query feature input to use caller-selectable feature ids rather than internal gradual-ascent rungs.',
);
const collectionQueryPageSizeProperty = collectionProjectionDetailAnswer.value.rows[0]?.inputFacets
  .find((row) => row.facet.id === AppBuilderInputFacetId.CollectionQueryFeatures)
  ?.payloadSchema?.items?.properties?.find((property) => property.name === 'pageSize');
assert.equal(
  collectionQueryPageSizeProperty?.required,
  false,
  'Expected collection query feature input to advertise optional pageSize for local pagination without requiring it for every feature.',
);
const collectionIdentityPolicyDetail = collectionProjectionDetailAnswer.value.rows[0]?.inputFacets
  .find((row) => row.facet.id === AppBuilderInputFacetId.CollectionIdentityPolicy);
assert.equal(
  collectionIdentityPolicyDetail?.payloadSchemaState,
  AppBuilderInputPayloadSchemaState.Modeled,
  'Expected collection identity policy to expose a modeled feature-driven payload schema.',
);
const collectionIdentityModeProperty = collectionIdentityPolicyDetail?.payloadSchema?.properties?.find((property) =>
  property.name === 'mode'
);
assert.ok(
  collectionIdentityModeProperty?.schema.enumValues?.includes(AppBuilderCollectionIdentityMode.ObjectIdentity) === true,
  'Expected collection identity policy to admit object identity for simple local repeats.',
);
const collectionIdentityUseProperty = collectionIdentityPolicyDetail?.payloadSchema?.properties
  ?.find((property) => property.name === 'requiredBy')
  ?.schema.items;
assert.ok(
  collectionIdentityUseProperty?.enumValues?.includes(AppBuilderCollectionIdentityUse.RouteBoundary) === true,
  'Expected collection identity policy to expose feature pressures such as route boundaries.',
);
assert.ok(
  collectionIdentityUseProperty?.enumValues?.includes(AppBuilderCollectionIdentityUse.RowSelection) === true,
  'Expected collection identity policy to expose row selection as an explicit identity pressure.',
);
const collectionBrowseAffordanceDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.AffordanceDetail,
  affordanceDetail: {
    affordanceIds: [AppBuilderAffordanceId.CollectionBrowse],
  },
});
assert.equal(collectionBrowseAffordanceDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionBrowseAffordanceDetailAnswer.value.rows.length, 1);
assert.equal(
  collectionBrowseAffordanceDetailAnswer.value.rows[0]?.affordance.id,
  AppBuilderAffordanceId.CollectionBrowse,
  'Expected affordance-detail to select the requested affordance.',
);
assert.equal(
  collectionBrowseAffordanceDetailAnswer.value.rows[0]?.inputReadiness?.missingRequiredCount,
  1,
  'Expected affordance-detail to preserve required input-readiness counts for selected moves.',
);
assert.equal(
  collectionBrowseAffordanceDetailAnswer.value.rows[0]?.inputReadiness?.missingRecommendedCount,
  2,
  'Expected affordance-detail to preserve recommended input-readiness counts for selected moves.',
);
assert.ok(
  collectionBrowseAffordanceDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets.some((facet) =>
      facet.facet.id === AppBuilderInputFacetId.DomainFields
      && facet.payloadSchema?.kind === AppBuilderInputPayloadSchemaKind.Array
    )
  ) === true,
  'Expected affordance-detail to join input contract payload details by default.',
);
assert.ok(
  collectionBrowseAffordanceDetailAnswer.value.rows[0]?.effectContracts?.some((row) =>
    row.id === AppBuilderEffectContractId.SourcePlanPreview
  ) === true,
  'Expected affordance-detail to include promised effect rows.',
);
assert.ok(
  collectionBrowseAffordanceDetailAnswer.value.rows[0]?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.CollectionList
  ) === true,
  'Expected affordance-detail to include associated application design pattern rows.',
);
assert.ok(
  collectionBrowseAffordanceDetailAnswer.value.rows[0]?.followUps?.some((row) =>
    row.id === AppBuilderAffordanceId.CollectionTable
  ) === true,
  'Expected affordance-detail to include declared follow-up affordance rows without inventing recommendations.',
);
const compactAffordanceDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.AffordanceDetail,
  affordanceDetail: {
    affordanceIds: [AppBuilderAffordanceId.CollectionBrowse],
    includeInputReadiness: false,
    includeInputContractDetail: false,
    includeEffectContracts: false,
    includeApplicationPatterns: false,
    includeFollowUps: false,
  },
});
assert.equal(compactAffordanceDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactAffordanceDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.equal(compactAffordanceDetailAnswer.value.rows[0]?.inputContractDetails, undefined);
assert.equal(compactAffordanceDetailAnswer.value.rows[0]?.effectContracts, undefined);
assert.equal(compactAffordanceDetailAnswer.value.rows[0]?.applicationPatterns, undefined);
assert.equal(compactAffordanceDetailAnswer.value.rows[0]?.followUps, undefined);

const sourcePlanPreviewAffordanceDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.AffordanceDetail,
  affordanceDetail: {
    affordanceIds: [AppBuilderAffordanceId.SourcePlanPreview],
  },
});
assert.equal(sourcePlanPreviewAffordanceDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const sourcePlanPreviewPlacementDependency = sourcePlanPreviewAffordanceDetailAnswer.value.rows[0]?.inputReadiness
  ?.inputDependencies.find((row) => row.inputContract.id === AppBuilderInputContractId.SourcePlacement);
assert.deepEqual(
  sourcePlanPreviewPlacementDependency?.dependencyInputFacetIds,
  [
    AppBuilderInputFacetId.SourceRoot,
    AppBuilderInputFacetId.SourceTargetPath,
  ],
  'Expected SourcePlan preview affordance to ask only for source root plus concrete target path, not broad naming/tooling placement facts.',
);

const createFormAffordanceDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.AffordanceDetail,
  affordanceDetail: {
    affordanceIds: [AppBuilderAffordanceId.CreateSubmitForm],
  },
});
assert.equal(createFormAffordanceDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(createFormAffordanceDetailAnswer.value.rows.length, 1);
assert.equal(
  createFormAffordanceDetailAnswer.value.rows[0]?.affordance.id,
  AppBuilderAffordanceId.CreateSubmitForm,
  'Expected affordance-detail to select the create/submit form move.',
);
assert.equal(
  createFormAffordanceDetailAnswer.value.rows[0]?.inputReadiness?.missingRequiredCount,
  2,
  'Expected create/submit form readiness to require domain model and source placement input.',
);
assert.equal(
  createFormAffordanceDetailAnswer.value.rows[0]?.inputReadiness?.missingRecommendedCount,
  2,
  'Expected create/submit form readiness to keep accessibility and visual input visible as recommendations.',
);
assert.ok(
  createFormAffordanceDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets.some((facet) =>
      facet.facet.id === AppBuilderInputFacetId.DomainActions
      && facet.payloadSchema?.kind === AppBuilderInputPayloadSchemaKind.Array
    )
  ) === true,
  'Expected create/submit form detail to expose domain action payload shape through domain input detail.',
);
assert.ok(
  createFormAffordanceDetailAnswer.value.rows[0]?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.NativeSubmitForm
  ) === true,
  'Expected create/submit form detail to include native submit form as the first-ring pattern.',
);
assert.ok(
  createFormAffordanceDetailAnswer.value.rows[0]?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.DomainBackedSubmitForm
  ) === true,
  'Expected create/submit form detail to keep domain-backed form behavior visible as contextual.',
);
assert.ok(
  createFormAffordanceDetailAnswer.value.rows[0]?.effectContracts?.some((row) =>
    row.id === AppBuilderEffectContractId.ControlUseInventory
  ) === true,
  'Expected create/submit form detail to include the control-use inventory effect contract.',
);

const collectionTablePatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  applicationPatternDetail: {
    applicationPatternIds: [AppBuilderApplicationPatternId.CollectionTable],
  },
});
assert.equal(collectionTablePatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionTablePatternDetailAnswer.value.rows.length, 1);
assert.equal(
  collectionTablePatternDetailAnswer.value.rows[0]?.applicationPattern.id,
  AppBuilderApplicationPatternId.CollectionTable,
  'Expected application-pattern-detail to select the requested pattern.',
);
assert.equal(
  collectionTablePatternDetailAnswer.value.rows[0]?.inputReadiness?.missingRequiredCount,
  1,
  'Expected application-pattern-detail to preserve required input-readiness counts for selected patterns.',
);
assert.equal(
  collectionTablePatternDetailAnswer.value.rows[0]?.inputReadiness?.missingRecommendedCount,
  1,
  'Expected application-pattern-detail to preserve recommended input-readiness counts for selected patterns.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.CollectionProjection
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.CollectionTableColumns)
  ) === true,
  'Expected application-pattern-detail to join input contract payload detail by default.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.applicationPattern.dataShapeIds.includes(
    AppBuilderApplicationDataShapeId.Query,
  ) === true,
  'Expected collection table pattern to expose query as a structured data shape.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.applicationPattern.interactionShapeIds.includes(
    AppBuilderApplicationInteractionShapeId.Batch,
  ) === true,
  'Expected collection table pattern to keep batch interaction visible as a later collection rung.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.applicationPattern.semanticEffectKinds.includes(
    ExpectedSemanticEffectKind.BindingDataFlow,
  ) === true
  && collectionTablePatternDetailAnswer.value.rows[0]?.applicationPattern.semanticEffectKinds.includes(
    ExpectedSemanticEffectKind.BindingSourceOperation,
  ) === true,
  'Expected collection table pattern to expose semantic-runtime verification product families.',
);
const collectionTableBindingDataFlowDescriptor =
  collectionTablePatternDetailAnswer.value.rows[0]?.semanticEffectDescriptors?.find((row) =>
    row.kind === ExpectedSemanticEffectKind.BindingDataFlow
  );
assert.ok(
  collectionTableBindingDataFlowDescriptor?.observationSurfaces.includes(
    ExpectedSemanticEffectObservationSurface.BindingDataFlows,
  ) === true,
  'Expected application-pattern-detail to explain the BindingDataFlow observation surface.',
);
assert.ok(
  collectionTableBindingDataFlowDescriptor?.queryKinds.includes(SemanticAppQueryKind.BindingDataFlows) === true,
  'Expected application-pattern-detail to explain the BindingDataFlow public query family.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.collectionConcepts?.some((row) =>
    row.id === AppBuilderCollectionConceptId.TableColumn
  ) === true,
  'Expected application-pattern-detail to include coordinated collection concepts.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.collectionFeatures?.some((row) =>
    row.id === AppBuilderCollectionFeatureId.LocalSorting
    && row.conceptIds.includes(AppBuilderCollectionConceptId.LocalSorting)
    && row.status.sourceLoweringImplemented === true
    && row.status.note?.includes('explicit sortable-column handler wiring') === true
  ) === true,
  'Expected application-pattern-detail to expose local sorting as explicit-handler source-lowering support.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.collectionFeatures?.some((row) =>
    row.id === AppBuilderCollectionFeatureId.LocalFiltering
    && row.status.sourceLoweringImplemented === true
    && row.status.note?.includes('filterBindingExpressions') === true
  ) === true,
  'Expected application-pattern-detail to expose local filtering as explicit-binding/local-query-state source-lowering support.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.companionApplicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.LoadingEmptyErrorState
  ) === true,
  'Expected application-pattern-detail to expose companion application patterns without requiring affordance sibling reconstruction.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.controlManifests?.some((row) =>
    row.id === AppBuilderControlManifestRowId.ValueContract
  ) === true,
  'Expected application-pattern-detail to include coordinated control/component manifests.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.stylingMechanisms?.some((row) =>
    row.id === AppBuilderStylingMechanismId.ClassBinding
  ) === true,
  'Expected application-pattern-detail to include coordinated styling mechanisms.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.visualPolicies?.some((row) =>
    row.id === AppBuilderVisualPolicyId.StructuralHooksOnly
  ) === true,
  'Expected application-pattern-detail to include coordinated visual policies.',
);
assert.ok(
  collectionTablePatternDetailAnswer.value.rows[0]?.affordances?.some((row) =>
    row.id === AppBuilderAffordanceId.CollectionTable
  ) === true,
  'Expected application-pattern-detail to include affordances that declare the selected pattern.',
);

const nativeSubmitFormPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  applicationPatternDetail: {
    applicationPatternIds: [AppBuilderApplicationPatternId.NativeSubmitForm],
  },
});
assert.equal(nativeSubmitFormPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(nativeSubmitFormPatternDetailAnswer.value.rows.length, 1);
assert.equal(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.applicationPattern.id,
  AppBuilderApplicationPatternId.NativeSubmitForm,
  'Expected application-pattern-detail to select the native submit form pattern.',
);
assert.equal(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.inputReadiness?.missingRequiredCount,
  1,
  'Expected native submit form to require domain model input.',
);
assert.equal(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.inputReadiness?.missingRecommendedCount,
  2,
  'Expected native submit form to recommend accessibility and visual-hook input.',
);
assert.ok(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.inputReadiness?.inputDependencies.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.VisualStyleInput
    && row.dependencyInputFacetIds.includes(AppBuilderInputFacetId.VisualClassHooks)
  ) === true,
  'Expected native submit form readiness to expose visual hooks because its source composition can spend form, field, and button hooks.',
);
assert.ok(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.applicationPattern.stateShapeIds.includes(
    AppBuilderApplicationStateShapeId.LocalViewModelState,
  ) === true,
  'Expected native submit form to expose local view-model state as its first-ring state shape.',
);
assert.ok(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.applicationPattern.dataShapeIds.includes(
    AppBuilderApplicationDataShapeId.CommandAction,
  ) === true,
  'Expected native submit form to expose domain actions as structured data shape.',
);
assert.ok(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.applicationPattern.aureliaRealizationIds.includes(
    AppBuilderApplicationAureliaRealizationId.NativeDomControl,
  ) === true,
  'Expected native submit form to expose native DOM controls as an Aurelia realization surface.',
);
assert.ok(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.applicationPattern.semanticEffectKinds.includes(
    ExpectedSemanticEffectKind.BindingValueChannel,
  ) === true
  && nativeSubmitFormPatternDetailAnswer.value.rows[0]?.applicationPattern.semanticEffectKinds.includes(
    ExpectedSemanticEffectKind.BindingSourceOperation,
  ) === true,
  'Expected native submit form to expose semantic-runtime value-channel and command/source-operation verification families.',
);
assert.ok(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.controlPatterns?.some((row) =>
    row.id === AppBuilderControlPatternId.NativeTextInput
  ) === true,
  'Expected native submit form to coordinate native-first control patterns.',
);
assert.ok(
  nativeSubmitFormPatternDetailAnswer.value.rows[0]?.controlManifests?.some((row) =>
    row.id === AppBuilderControlManifestRowId.AccessibilityContract
  ) === true,
  'Expected native submit form to coordinate accessibility manifest contracts.',
);

const toastNotificationPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  applicationPatternDetail: {
    applicationPatternIds: [AppBuilderApplicationPatternId.ToastNotification],
    includeInputContractDetail: true,
    includeCompanionApplicationPatterns: true,
    includeControlManifests: true,
    includeStylingMechanisms: true,
    includeVisualPolicies: true,
    includeAffordances: true,
  },
});
assert.equal(toastNotificationPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(toastNotificationPatternDetailAnswer.value.rows.length, 1);
assert.equal(
  toastNotificationPatternDetailAnswer.value.rows[0]?.applicationPattern.status.recommendationStatus,
  AppBuilderRecommendationStatus.Deferred,
  'Expected toast/notification feedback to stay visible as a deferred v1 application pattern.',
);
assert.equal(
  toastNotificationPatternDetailAnswer.value.rows[0]?.applicationPattern.status.sourceLoweringImplemented,
  false,
  'Expected toast/notification feedback not to advertise source lowering until a notification contract is designed.',
);
assert.ok(
  toastNotificationPatternDetailAnswer.value.rows[0]?.companionApplicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.ActionFeedbackStatus
  ) === true,
  'Expected toast/notification feedback detail to point back to the current inline action-feedback source-lowering pattern.',
);
assert.ok(
  toastNotificationPatternDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.InteractionFeedback
  ) === true,
  'Expected toast/notification feedback detail to expose interaction-feedback input even while source lowering is deferred.',
);
assert.ok(
  toastNotificationPatternDetailAnswer.value.rows[0]?.controlManifests?.some((row) =>
    row.id === AppBuilderControlManifestRowId.AccessibilityContract
  ) === true,
  'Expected toast/notification feedback detail to surface accessibility manifest pressure without generating a toast control.',
);
assert.equal(
  toastNotificationPatternDetailAnswer.value.rows[0]?.affordances?.length,
  0,
  'Expected toast/notification feedback not to appear as an affordance until the source-lowering contract exists.',
);

const domainCommandActionPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  applicationPatternDetail: {
    applicationPatternIds: [AppBuilderApplicationPatternId.DomainCommandAction],
  },
});
assert.equal(domainCommandActionPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(domainCommandActionPatternDetailAnswer.value.rows.length, 1);
assert.ok(
  domainCommandActionPatternDetailAnswer.value.rows[0]?.applicationPattern.navigationShapeIds.includes(
    AppBuilderApplicationNavigationShapeId.RouteBacked,
  ) === false,
  'Expected domain command action to avoid route-backed navigation shape until route/navigation action realization is modeled.',
);
assert.ok(
  domainCommandActionPatternDetailAnswer.value.rows[0]?.applicationPattern.aureliaRealizationIds.includes(
    AppBuilderApplicationAureliaRealizationId.Router,
  ) === false,
  'Expected domain command action to avoid router realization because current source lowering only emits caller-owned class-member methods.',
);
assert.ok(
  domainCommandActionPatternDetailAnswer.value.rows[0]?.applicationPattern.semanticEffectKinds.includes(
    ExpectedSemanticEffectKind.Route,
  ) === false,
  'Expected domain command action not to promise route effects; route navigation is a distinct application pattern.',
);
const routeNavigationActionPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  applicationPatternDetail: {
    applicationPatternIds: [AppBuilderApplicationPatternId.RouteNavigationAction],
  },
});
assert.equal(routeNavigationActionPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(routeNavigationActionPatternDetailAnswer.value.rows.length, 1);
assert.ok(
  routeNavigationActionPatternDetailAnswer.value.rows[0]?.applicationPattern.navigationShapeIds.includes(
    AppBuilderApplicationNavigationShapeId.RouteBacked,
  ) === true,
  'Expected route navigation action to carry route-backed navigation shape.',
);
assert.ok(
  routeNavigationActionPatternDetailAnswer.value.rows[0]?.applicationPattern.aureliaRealizationIds.includes(
    AppBuilderApplicationAureliaRealizationId.Router,
  ) === true,
  'Expected route navigation action to realize through Aurelia router source rather than command method source.',
);
assert.ok(
  routeNavigationActionPatternDetailAnswer.value.rows[0]?.applicationPattern.semanticEffectKinds.includes(
    ExpectedSemanticEffectKind.Route,
  ) === true,
  'Expected route navigation action to advertise route reopen effects.',
);

const queryStringStatePatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  applicationPatternDetail: {
    applicationPatternIds: [AppBuilderApplicationPatternId.QueryStringState],
    includeCollectionConcepts: true,
    includeControlPatterns: true,
    includeCompanionApplicationPatterns: true,
    includeAffordances: true,
  },
});
assert.equal(queryStringStatePatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(queryStringStatePatternDetailAnswer.value.rows.length, 1);
assert.equal(
  queryStringStatePatternDetailAnswer.value.rows[0]?.applicationPattern.status.recommendationStatus,
  AppBuilderRecommendationStatus.Deferred,
  'Expected query-string state to stay visible as a deferred v1 application pattern.',
);
assert.equal(
  queryStringStatePatternDetailAnswer.value.rows[0]?.applicationPattern.status.sourceLoweringImplemented,
  false,
  'Expected query-string state not to advertise source lowering until router query-state policy exists.',
);
assert.ok(
  queryStringStatePatternDetailAnswer.value.rows[0]?.applicationPattern.aureliaRealizationIds.includes(
    AppBuilderApplicationAureliaRealizationId.Router,
  ) === true,
  'Expected query-string state to remain tied to router semantics.',
);
assert.ok(
  queryStringStatePatternDetailAnswer.value.rows[0]?.collectionConcepts?.some((row) =>
    row.id === AppBuilderCollectionConceptId.ServiceBackedCollectionQuery
  ) === true,
  'Expected query-string state detail to expose service-backed collection query pressure.',
);
assert.ok(
  queryStringStatePatternDetailAnswer.value.rows[0]?.controlPatterns?.some((row) =>
    row.id === AppBuilderControlPatternId.NativeSearchInput
  ) === true,
  'Expected query-string state detail to expose native search control context without generating URL synchronization source.',
);
assert.ok(
  queryStringStatePatternDetailAnswer.value.rows[0]?.companionApplicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.RouterBackedListDetail
  ) === true,
  'Expected query-string state detail to point callers back to router-backed area context.',
);
assert.equal(
  queryStringStatePatternDetailAnswer.value.rows[0]?.affordances?.length,
  0,
  'Expected query-string state not to appear as an affordance until the source-lowering contract exists.',
);

const remoteFetchIntegrationPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  applicationPatternDetail: {
    applicationPatternIds: [AppBuilderApplicationPatternId.RemoteFetchIntegration],
    includeCollectionConcepts: true,
    includeControlPatterns: true,
    includeCompanionApplicationPatterns: true,
    includeAffordances: true,
  },
});
assert.equal(remoteFetchIntegrationPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(remoteFetchIntegrationPatternDetailAnswer.value.rows.length, 1);
assert.equal(
  remoteFetchIntegrationPatternDetailAnswer.value.rows[0]?.applicationPattern.status.recommendationStatus,
  AppBuilderRecommendationStatus.Deferred,
  'Expected remote fetch/server integration to stay visible as a deferred v1 application pattern.',
);
assert.equal(
  remoteFetchIntegrationPatternDetailAnswer.value.rows[0]?.applicationPattern.status.sourceLoweringImplemented,
  false,
  'Expected remote fetch/server integration not to advertise source lowering until HTTP/API policy exists.',
);
assert.ok(
  remoteFetchIntegrationPatternDetailAnswer.value.rows[0]?.applicationPattern.aureliaRealizationIds.includes(
    AppBuilderApplicationAureliaRealizationId.Plugin,
  ) === true,
  'Expected remote fetch/server integration to keep optional fetch-client/plugin admission visible.',
);
assert.ok(
  remoteFetchIntegrationPatternDetailAnswer.value.rows[0]?.companionApplicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.ServiceBackedLoadSave
  ) === true,
  'Expected remote fetch/server integration detail to distinguish itself from the current local service scaffold pattern.',
);
assert.ok(
  remoteFetchIntegrationPatternDetailAnswer.value.rows[0]?.collectionConcepts?.some((row) =>
    row.id === AppBuilderCollectionConceptId.ServiceBackedCollectionQuery
  ) === true,
  'Expected remote fetch/server integration detail to expose full service-backed query pressure.',
);
assert.equal(
  remoteFetchIntegrationPatternDetailAnswer.value.rows[0]?.affordances?.length,
  0,
  'Expected remote fetch/server integration not to appear as an affordance until the source-lowering contract exists.',
);

const compactApplicationPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  applicationPatternDetail: {
    applicationPatternIds: [AppBuilderApplicationPatternId.CollectionTable],
    includeInputReadiness: false,
    includeInputContractDetail: false,
    includeCollectionConcepts: false,
    includeCollectionFeatures: false,
    includeCompanionApplicationPatterns: false,
    includeControlPatterns: false,
    includeControlManifests: false,
    includeStylingMechanisms: false,
    includeVisualPolicies: false,
    includeAffordances: false,
  },
});
assert.equal(compactApplicationPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.inputContractDetails, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.collectionConcepts, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.collectionFeatures, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.companionApplicationPatterns, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.controlPatterns, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.controlManifests, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.stylingMechanisms, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.visualPolicies, undefined);
assert.equal(compactApplicationPatternDetailAnswer.value.rows[0]?.affordances, undefined);

const tableColumnCollectionDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail,
  collectionConceptDetail: {
    collectionConceptIds: [AppBuilderCollectionConceptId.TableColumn],
  },
});
assert.equal(tableColumnCollectionDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(tableColumnCollectionDetailAnswer.value.rows.length, 1);
assert.equal(
  tableColumnCollectionDetailAnswer.value.rows[0]?.collectionConcept.id,
  AppBuilderCollectionConceptId.TableColumn,
  'Expected collection-concept-detail to select the requested collection concept.',
);
assert.equal(
  tableColumnCollectionDetailAnswer.value.rows[0]?.inputReadiness?.missingRequiredCount,
  0,
  'Expected collection-concept-detail to preserve required input-readiness counts for selected collection concepts.',
);
assert.equal(
  tableColumnCollectionDetailAnswer.value.rows[0]?.inputReadiness?.missingRecommendedCount,
  1,
  'Expected collection-concept-detail to preserve recommended input-readiness counts for selected collection concepts.',
);
assert.ok(
  tableColumnCollectionDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.CollectionProjection
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.CollectionTableColumns)
  ) === true,
  'Expected collection-concept-detail to join collection projection payload detail by default.',
);
assert.ok(
  tableColumnCollectionDetailAnswer.value.rows[0]?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.CollectionTable
  ) === true,
  'Expected collection-concept-detail to include application patterns that coordinate the collection concept.',
);
assert.ok(
  tableColumnCollectionDetailAnswer.value.rows[0]?.collectionFeatures?.some((row) =>
    row.id === AppBuilderCollectionFeatureId.TableColumns
  ) === true,
  'Expected collection-concept-detail to expose feature descriptors that point at the selected concept.',
);
assert.ok(
  tableColumnCollectionDetailAnswer.value.rows[0]?.controlPatterns?.some((row) =>
    row.id === AppBuilderControlPatternId.NativeButton
  ) === true,
  'Expected collection-concept-detail to include controls coordinated through associated application patterns.',
);
assert.ok(
  tableColumnCollectionDetailAnswer.value.rows[0]?.controlManifests?.some((row) =>
    row.id === AppBuilderControlManifestRowId.ValueContract
  ) === true,
  'Expected collection-concept-detail to include coordinated control/component manifest rows.',
);
assert.ok(
  tableColumnCollectionDetailAnswer.value.rows[0]?.stylingMechanisms?.some((row) =>
    row.id === AppBuilderStylingMechanismId.ClassBinding
  ) === true,
  'Expected collection-concept-detail to include coordinated styling mechanism rows.',
);
assert.ok(
  tableColumnCollectionDetailAnswer.value.rows[0]?.visualPolicies?.some((row) =>
    row.id === AppBuilderVisualPolicyId.StructuralHooksOnly
  ) === true,
  'Expected collection-concept-detail to include coordinated visual policy rows.',
);
assert.ok(
  tableColumnCollectionDetailAnswer.value.rows[0]?.affordances?.some((row) =>
    row.id === AppBuilderAffordanceId.CollectionTable
  ) === true,
  'Expected collection-concept-detail to include affordances associated through coordinating application patterns.',
);
const compactCollectionConceptDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail,
  collectionConceptDetail: {
    collectionConceptIds: [AppBuilderCollectionConceptId.TableColumn],
    includeInputReadiness: false,
    includeInputContractDetail: false,
    includeApplicationPatterns: false,
    includeCollectionFeatures: false,
    includeControlPatterns: false,
    includeControlManifests: false,
    includeStylingMechanisms: false,
    includeVisualPolicies: false,
    includeAffordances: false,
  },
});
assert.equal(compactCollectionConceptDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.inputContractDetails, undefined);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.applicationPatterns, undefined);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.collectionFeatures, undefined);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.controlPatterns, undefined);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.controlManifests, undefined);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.stylingMechanisms, undefined);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.visualPolicies, undefined);
assert.equal(compactCollectionConceptDetailAnswer.value.rows[0]?.affordances, undefined);

const nativeTextControlDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail,
  controlPatternDetail: {
    controlPatternIds: [AppBuilderControlPatternId.NativeTextInput],
  },
});
assert.equal(nativeTextControlDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(nativeTextControlDetailAnswer.value.rows.length, 1);
assert.equal(
  nativeTextControlDetailAnswer.value.rows[0]?.controlPattern.id,
  AppBuilderControlPatternId.NativeTextInput,
  'Expected control-pattern-detail to select the requested control pattern.',
);
assert.equal(
  nativeTextControlDetailAnswer.value.rows[0]?.inputReadiness?.missingRequiredCount,
  1,
  'Expected control-pattern-detail to preserve required input-readiness counts for selected controls.',
);
assert.equal(
  nativeTextControlDetailAnswer.value.rows[0]?.inputReadiness?.missingRecommendedCount,
  2,
  'Expected control-pattern-detail to preserve recommended input-readiness counts for selected controls.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.ControlAccessibility
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.AccessibilityLabels)
  ) === true,
  'Expected control-pattern-detail to join control accessibility payload detail by default.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.DomainFields)
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.DomainValueSets) === false
  ) === true,
  'Expected text-input detail to show field input without dragging along finite value-set input.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.inputReadiness?.inputDependencies.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets?.some((facet) => facet.id === AppBuilderInputFacetId.DomainFields) === true
    && row.inputFacets?.some((facet) => facet.id === AppBuilderInputFacetId.DomainValueSets) === false
  ) === true,
  'Expected text-input readiness to use row-local facet narrowing.',
);
const sourceLowerableControlTargetCatalogAnswer = answerPagedSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.ControlPattern],
    sourceLoweringImplemented: true,
    includeInputDependencies: true,
  },
  page: { size: 50 },
});
assert.equal(sourceLowerableControlTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const sourceLowerableControlTargetRefs = APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS
  .filter((row) => row.targetRef.kind === AppBuilderOntologyRowKind.ControlPattern)
  .map((row) => row.targetRef.id);
assert.deepEqual(
  sourceLowerableControlTargetCatalogAnswer.value.rows.map((row) => row.targetRef.id).sort(),
  sourceLowerableControlTargetRefs.sort(),
  'Expected the source-lowering target registry and control target catalog to stay synchronized.',
);
const sourceLowerableControlsMissingVisualHooks = sourceLowerableControlTargetCatalogAnswer.value.rows
  .filter((row) =>
    row.inputDependencies?.some((dependency) =>
      dependency.inputContract.id === AppBuilderInputContractId.VisualStyleInput
      && dependency.dependencyInputFacetIds.includes(AppBuilderInputFacetId.VisualClassHooks)
    ) !== true
  )
  .map((row) => row.targetRef.id);
assert.deepEqual(
  sourceLowerableControlsMissingVisualHooks,
  [],
  'Expected every source-lowering-implemented source-lowerable control to expose visual class-hook readiness because field/button/message lowerers can spend those hooks.',
);
const exactRangeTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeRangeInput,
    }],
  },
});
assert.equal(exactRangeTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(
  exactRangeTargetCatalogAnswer.value.rows.map((row) => row.targetRef.id),
  [AppBuilderControlPatternId.NativeRangeInput],
  'Expected target-catalog exact targetRefs filters to preserve kind/domain/id identity rather than relying on unscoped ids.',
);
assert.ok(
  exactRangeTargetCatalogAnswer.value.displayText.includes('order=targetRefs'),
  'Expected target-catalog exact targetRefs requests to disclose that caller ordering was preserved.',
);
const mixedExactTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetRefs: [
      {
        kind: AppBuilderOntologyRowKind.ApplicationPattern,
        domain: AppBuilderOntologyDomain.ApplicationPattern,
        id: AppBuilderApplicationPatternId.NativeSubmitForm,
      },
      {
        kind: AppBuilderOntologyRowKind.Affordance,
        domain: AppBuilderOntologyDomain.Affordance,
        id: AppBuilderAffordanceId.CreateSubmitForm,
      },
      {
        kind: AppBuilderOntologyRowKind.ControlPattern,
        domain: AppBuilderOntologyDomain.Control,
        id: AppBuilderControlPatternId.NativeRangeInput,
      },
      {
        kind: AppBuilderOntologyRowKind.StylingMechanism,
        domain: AppBuilderOntologyDomain.Style,
        id: AppBuilderStylingMechanismId.ClassBinding,
      },
    ],
    includeInputReadiness: false,
  },
});
assert.equal(mixedExactTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(
  mixedExactTargetCatalogAnswer.value.rows.map((row) => row.targetRef.id),
  [
    AppBuilderApplicationPatternId.NativeSubmitForm,
    AppBuilderAffordanceId.CreateSubmitForm,
    AppBuilderControlPatternId.NativeRangeInput,
    AppBuilderStylingMechanismId.ClassBinding,
  ],
  'Expected mixed exact target-catalog targetRefs to preserve caller order rather than descriptor-family order.',
);
assert.equal(
  exactRangeTargetCatalogAnswer.value.rows[0]?.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.TargetInvocation),
  true,
  'Expected exact target-catalog rows to retain source-lowering surface metadata.',
);
assert.equal(
  exactRangeTargetCatalogAnswer.value.rows[0]?.defaultingCandidate,
  false,
  'Expected contextual range controls not to appear as local defaulting candidates.',
);
assert.equal(
  exactRangeTargetCatalogAnswer.value.rows[0]?.policySatisfactionRequired,
  true,
  'Expected contextual executable target-catalog rows to disclose their source-lowering policy gate.',
);
const selectorRangeTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      id: AppBuilderControlPatternId.NativeRangeInput,
    }],
    includeInputReadiness: false,
  },
});
assert.equal(selectorRangeTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(
  selectorRangeTargetCatalogAnswer.value.rows.map((row) => row.targetRef.id),
  [AppBuilderControlPatternId.NativeRangeInput],
  'Expected compact target-catalog selectors to select the same row as exact targetRefs.',
);
assert.ok(
  selectorRangeTargetCatalogAnswer.value.displayText.includes('order=targetRefs'),
  'Expected target-catalog selector filters to preserve caller-selected presentation order.',
);
const unknownSelectorTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      id: 'not-a-real-control-pattern',
    }],
    includeInputReadiness: false,
  },
});
assert.equal(unknownSelectorTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(unknownSelectorTargetCatalogAnswer.value.rows.length, 0);
assert.ok(
  unknownSelectorTargetCatalogAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderInputReadinessIssueKind.UnknownTarget
    && issue.targetSelector?.id === 'not-a-real-control-pattern'
  ),
  'Expected unknown compact target-catalog selectors to report unknown-target instead of returning the full menu.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.NativeControlBinding
  ) === true,
  'Expected control-pattern-detail to include application patterns that coordinate the control pattern.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.controlDescriptors?.some((row) =>
    row.id === AppBuilderControlId.TextInput
    && row.transportKind === AppBuilderControlTransportKind.NativeValueString
  ) === true,
  'Expected control-pattern-detail to expose concrete leaf-control descriptors from the existing control catalog.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.realizationPolicies?.some((row) =>
    row.id === AppBuilderControlRealizationPolicyId.InlineNative
  ) === true,
  'Expected control-pattern-detail to include targetable realization policy rows coordinated by the control pattern.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.controlManifests?.some((row) =>
    row.id === AppBuilderControlManifestRowId.ValueContract
  ) === true,
  'Expected control-pattern-detail to include coordinated value manifest rows.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.controlManifests?.some((row) =>
    row.id === AppBuilderControlManifestRowId.AccessibilityContract
  ) === true,
  'Expected control-pattern-detail to include coordinated accessibility manifest rows.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.stylingMechanisms?.some((row) =>
    row.id === AppBuilderStylingMechanismId.ClassBinding
  ) === true,
  'Expected control-pattern-detail to include coordinated styling mechanism rows.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.visualPolicies?.some((row) =>
    row.id === AppBuilderVisualPolicyId.StructuralHooksOnly
  ) === true,
  'Expected control-pattern-detail to include coordinated visual policy rows.',
);
assert.ok(
  nativeTextControlDetailAnswer.value.rows[0]?.affordances?.some((row) =>
    row.id === AppBuilderAffordanceId.NativeControlManifest
  ) === true,
  'Expected control-pattern-detail to include affordances associated through coordinating application patterns.',
);
const nativeSelectControlDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail,
  controlPatternDetail: {
    controlPatternIds: [
      AppBuilderControlPatternId.NativeSingleSelect,
      AppBuilderControlPatternId.NativeMultiSelect,
    ],
    includeInputReadiness: false,
    includeInputContractDetail: false,
    includeApplicationPatterns: false,
    includeControlManifests: false,
    includeRealizationPolicies: false,
    includeStylingMechanisms: false,
    includeVisualPolicies: false,
    includeAffordances: false,
  },
});
assert.equal(nativeSelectControlDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  nativeSelectControlDetailAnswer.value.rows.find((detail) =>
    detail.controlPattern.id === AppBuilderControlPatternId.NativeSingleSelect
  )?.controlDescriptors?.some((row) =>
    row.id === AppBuilderControlId.SingleSelect
    && row.requiresValueDomain === true
  ) === true,
  'Expected native select detail to expose single-select descriptor and value-domain requirement.',
);
assert.ok(
  nativeSelectControlDetailAnswer.value.rows.find((detail) =>
    detail.controlPattern.id === AppBuilderControlPatternId.NativeMultiSelect
  )?.controlDescriptors?.some((row) =>
    row.id === AppBuilderControlId.MultiSelect
    && row.requiresValueDomain === true
  ) === true,
  'Expected native select detail to expose multi-select descriptor and value-domain requirement.',
);
const nativeSingleSelectInputDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail,
  controlPatternDetail: {
    controlPatternIds: [AppBuilderControlPatternId.NativeSingleSelect],
    includeApplicationPatterns: false,
    includeControlDescriptors: false,
    includeControlManifests: false,
    includeStylingMechanisms: false,
    includeVisualPolicies: false,
    includeAffordances: false,
  },
});
assert.equal(nativeSingleSelectInputDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  nativeSingleSelectInputDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.DomainFields)
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.DomainValueSets)
  ) === true,
  'Expected single-select detail to include field and finite value-set input facets.',
);
assert.ok(
  nativeSingleSelectInputDetailAnswer.value.rows[0]?.inputReadiness?.inputDependencies.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets?.some((facet) => facet.id === AppBuilderInputFacetId.DomainFields) === true
    && row.inputFacets?.some((facet) => facet.id === AppBuilderInputFacetId.DomainValueSets) === true
  ) === true,
  'Expected single-select readiness to preserve choice-control facet narrowing.',
);
const localWrapperControlDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail,
  controlPatternDetail: {
    controlRealizationPolicyIds: [AppBuilderControlRealizationPolicyId.LocalWrapperComponent],
    includeInputReadiness: false,
    includeInputContractDetail: false,
    includeApplicationPatterns: false,
    includeControlDescriptors: false,
    includeControlManifests: false,
    includeStylingMechanisms: false,
    includeVisualPolicies: false,
    includeAffordances: false,
  },
});
assert.equal(localWrapperControlDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  localWrapperControlDetailAnswer.value.rows.some((row) =>
    row.controlPattern.id === AppBuilderControlPatternId.FieldGroup
    && row.realizationPolicies?.some((policy) =>
      policy.id === AppBuilderControlRealizationPolicyId.LocalWrapperComponent
    ) === true
  ),
  'Expected control-pattern-detail to filter by control realization policy and retain matching policy rows.',
);
const compactControlPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail,
  controlPatternDetail: {
    controlPatternIds: [AppBuilderControlPatternId.NativeTextInput],
    includeInputReadiness: false,
    includeInputContractDetail: false,
    includeApplicationPatterns: false,
    includeControlDescriptors: false,
    includeRealizationPolicies: false,
    includeControlManifests: false,
    includeStylingMechanisms: false,
    includeVisualPolicies: false,
    includeAffordances: false,
  },
});
assert.equal(compactControlPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.inputContractDetails, undefined);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.applicationPatterns, undefined);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.controlDescriptors, undefined);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.realizationPolicies, undefined);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.controlManifests, undefined);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.stylingMechanisms, undefined);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.visualPolicies, undefined);
assert.equal(compactControlPatternDetailAnswer.value.rows[0]?.affordances, undefined);

const valueContractManifestDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail,
  controlManifestDetail: {
    controlManifestIds: [AppBuilderControlManifestRowId.ValueContract],
  },
});
assert.equal(valueContractManifestDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(valueContractManifestDetailAnswer.value.rows.length, 1);
assert.equal(
  valueContractManifestDetailAnswer.value.rows[0]?.controlManifest.id,
  AppBuilderControlManifestRowId.ValueContract,
  'Expected control-manifest-detail to select the requested manifest row.',
);
assert.equal(
  valueContractManifestDetailAnswer.value.rows[0]?.inputReadiness?.missingRequiredCount,
  1,
  'Expected control-manifest-detail to preserve manifest input-readiness counts.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.DomainFields)
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.DomainValueSets) === false
  ) === true,
  'Expected value-contract manifest detail to expose domain-field input without unrelated value-set facets.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.NativeControlBinding
  ) === true,
  'Expected control-manifest-detail to include application patterns that coordinate the manifest row.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.controlPatterns?.some((row) =>
    row.id === AppBuilderControlPatternId.NativeTextInput
  ) === true,
  'Expected control-manifest-detail to include control patterns coordinated through application patterns.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.controlDescriptors?.some((row) =>
    row.id === AppBuilderControlId.TextInput
  ) === true,
  'Expected control-manifest-detail to expose concrete native leaf-control descriptors.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.realizationPolicies?.some((row) =>
    row.id === AppBuilderControlRealizationPolicyId.InlineNative
  ) === true,
  'Expected control-manifest-detail to include realization policy rows coordinated through control patterns.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.manifestFieldDescriptors?.some((row) =>
    row.id === AppBuilderControlManifestFieldId.LeafControlValueChannelKind
    && row.manifestRowId === AppBuilderControlManifestRowId.ValueContract
    && (row.valueSet?.length ?? 0) > 0
  ) === true,
  'Expected control-manifest-detail to expose value-channel field descriptors for value contracts.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.effectContracts?.some((row) =>
    row.id === AppBuilderEffectContractId.ComponentManifestPublication
  ) === true,
  'Expected control-manifest-detail to expose effect contracts associated through direct manifest witnesses.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.stylingMechanisms?.some((row) =>
    row.id === AppBuilderStylingMechanismId.ClassBinding
  ) === true,
  'Expected control-manifest-detail to include coordinated styling mechanism rows.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.visualPolicies?.some((row) =>
    row.id === AppBuilderVisualPolicyId.StructuralHooksOnly
  ) === true,
  'Expected control-manifest-detail to include coordinated visual policy rows.',
);
assert.ok(
  valueContractManifestDetailAnswer.value.rows[0]?.affordances?.some((row) =>
    row.id === AppBuilderAffordanceId.NativeControlManifest
  ) === true,
  'Expected control-manifest-detail to include affordances associated through coordinating application patterns.',
);
const compactControlManifestDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail,
  controlManifestDetail: {
    controlManifestIds: [AppBuilderControlManifestRowId.ValueContract],
    includeInputReadiness: false,
    includeInputContractDetail: false,
    includeApplicationPatterns: false,
    includeControlPatterns: false,
    includeControlDescriptors: false,
    includeRealizationPolicies: false,
    includeManifestFieldDescriptors: false,
    includeEffectContracts: false,
    includeStylingMechanisms: false,
    includeVisualPolicies: false,
    includeAffordances: false,
  },
});
assert.equal(compactControlManifestDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.inputContractDetails, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.applicationPatterns, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.controlPatterns, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.controlDescriptors, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.realizationPolicies, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.manifestFieldDescriptors, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.effectContracts, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.stylingMechanisms, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.visualPolicies, undefined);
assert.equal(compactControlManifestDetailAnswer.value.rows[0]?.affordances, undefined);

const sourcePlanEffectDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
  effectContractDetail: {
    effectContractIds: [AppBuilderEffectContractId.SourcePlanPreview],
    suppliedInputs: [
      {
        inputContractId: AppBuilderInputContractId.DomainModel,
        sourceId: AppBuilderSuppliedInputSource.PublicPreset,
        label: 'example domain descriptor',
      },
      {
        inputContractId: AppBuilderInputContractId.SourcePlacement,
        sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
        label: 'target source folder',
      },
    ],
  },
});
assert.equal(sourcePlanEffectDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(sourcePlanEffectDetailAnswer.value.rows.length, 1);
assert.equal(
  sourcePlanEffectDetailAnswer.value.rows[0]?.effectContract.id,
  AppBuilderEffectContractId.SourcePlanPreview,
  'Expected effect-contract-detail to select the requested promised effect.',
);
assert.equal(
  sourcePlanEffectDetailAnswer.value.rows[0]?.effectContract.boundary,
  AppBuilderEffectBoundary.SourcePlan,
  'Expected SourcePlanPreview to declare SourcePlan as its witness boundary.',
);
assert.ok(
  sourcePlanEffectDetailAnswer.value.rows[0]?.effectContract.witnessKinds.includes(AppBuilderEffectWitnessKind.SourcePlanFile) === true
  && sourcePlanEffectDetailAnswer.value.rows[0]?.effectContract.witnessKinds.includes(AppBuilderEffectWitnessKind.SourcePlanContribution) === true,
  'Expected SourcePlanPreview to declare concrete SourcePlan witness families.',
);
const sourcePlanFileWitness = sourcePlanEffectDetailAnswer.value.rows[0]?.witnessDescriptors?.find((row) =>
  row.kind === AppBuilderEffectWitnessKind.SourcePlanFile
);
assert.ok(
  sourcePlanFileWitness?.surfaces.includes(AppBuilderEffectWitnessSurface.SourcePlanFileArtifacts) === true,
  'Expected SourcePlanPreview detail to expose SourcePlan file artifacts as witness surface.',
);
assert.ok(
  sourcePlanFileWitness?.fields.some((row) =>
    row.fieldId === AppBuilderEffectWitnessFieldId.SourcePlanFileRole
    && row.valueSet?.includes(SourcePlanFileRole.RootComponent) === true
  ) === true,
  'Expected SourcePlan file witness fields to expose the enum-backed SourcePlan file-role value set.',
);
const sourcePlanContributionWitness = sourcePlanEffectDetailAnswer.value.rows[0]?.witnessDescriptors?.find((row) =>
  row.kind === AppBuilderEffectWitnessKind.SourcePlanContribution
);
assert.ok(
  sourcePlanContributionWitness?.fields.some((row) =>
    row.fieldId === AppBuilderEffectWitnessFieldId.SourcePlanContributionOriginKind
  ) === true,
  'Expected SourcePlan contribution witness fields to expose contribution origin identity.',
);
assert.ok(
  sourcePlanContributionWitness?.fields.some((row) =>
    row.fieldId === AppBuilderEffectWitnessFieldId.SourcePlanAppBuilderSourceLoweringOrigin
  ) === true,
  'Expected SourcePlan contribution witness fields to expose app-builder source-lowering origins for composed fragments.',
);
assert.equal(
  sourcePlanEffectDetailAnswer.value.rows[0]?.semanticEffectDescriptors,
  undefined,
  'Expected SourcePlan-only effect contracts not to expose semantic reopen descriptors.',
);
assert.equal(
  sourcePlanEffectDetailAnswer.value.rows[0]?.semanticRuntimeQueryRows,
  undefined,
  'Expected SourcePlan-only effect contracts not to expose semantic-runtime app-query witness rows.',
);
const collectionBrowseEffectAffordance = sourcePlanEffectDetailAnswer.value.rows[0]?.promisingAffordances?.find((row) =>
  row.affordance.id === AppBuilderAffordanceId.CollectionBrowse
);
assert.ok(
  collectionBrowseEffectAffordance != null,
  'Expected effect-contract-detail to invert SourcePlanPreview back to collection-browse.',
);
assert.ok(
  (collectionBrowseEffectAffordance?.inputReadiness?.inputDependencies.length ?? 0) > 0,
  'Expected effect-contract-detail to expose input readiness for promising affordances.',
);
assert.ok(
  collectionBrowseEffectAffordance?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
  ) === true,
  'Expected effect-contract-detail to expose input contract detail for promising affordances.',
);
assert.ok(
  collectionBrowseEffectAffordance?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.CollectionList
  ) === true,
  'Expected effect-contract-detail to expose application patterns surrounding promising affordances.',
);
const compactEffectDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
  effectContractDetail: {
    effectContractIds: [AppBuilderEffectContractId.SourcePlanPreview],
    includePromisingAffordances: false,
    includeWitnessFields: false,
  },
});
assert.equal(compactEffectDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactEffectDetailAnswer.value.rows[0]?.promisingAffordances, undefined);
assert.ok(
  (compactEffectDetailAnswer.value.rows[0]?.witnessDescriptors?.length ?? 0) > 0,
  'Expected compact effect-contract-detail to keep witness descriptors by default.',
);
assert.equal(
  compactEffectDetailAnswer.value.rows[0]?.witnessDescriptors?.[0]?.fields.length,
  0,
  'Expected includeWitnessFields:false to omit witness descriptor field payloads.',
);

const semanticRuntimeReopenEffectDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
  effectContractDetail: {
    effectContractIds: [AppBuilderEffectContractId.SemanticRuntimeReopen],
  },
});
assert.equal(semanticRuntimeReopenEffectDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  semanticRuntimeReopenEffectDetailAnswer.value.rows[0]?.effectContract.boundary,
  AppBuilderEffectBoundary.SemanticRuntimeReopen,
  'Expected semantic-runtime reopen effect detail to declare the reopen boundary.',
);
assert.equal(
  semanticRuntimeReopenEffectDetailAnswer.value.rows[0]?.semanticEffectDescriptors?.length,
  EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS.length,
  'Expected semantic-runtime reopen effect detail to expose the expected-effect descriptor inventory.',
);
assert.ok(
  semanticRuntimeReopenEffectDetailAnswer.value.rows[0]?.semanticRuntimeQueryRows?.some((row) =>
    row.queryKind === SemanticAppQueryKind.BindingDataFlowSummary
  ) === true,
  'Expected semantic-runtime reopen effect detail to expose public app-query catalog rows for reopen witnesses.',
);
const reopenBindingDataFlowDescriptor = semanticRuntimeReopenEffectDetailAnswer.value.rows[0]?.semanticEffectDescriptors?.find((row) =>
  row.kind === ExpectedSemanticEffectKind.BindingDataFlow
);
assert.ok(
  reopenBindingDataFlowDescriptor?.observationSurfaces.includes(ExpectedSemanticEffectObservationSurface.BindingDataFlows) === true,
  'Expected reopen effect detail to explain BindingDataFlow verifier observation surface.',
);
assert.ok(
  reopenBindingDataFlowDescriptor?.queryKinds.includes(SemanticAppQueryKind.BindingDataFlows) === true,
  'Expected reopen effect detail to explain BindingDataFlow public query family.',
);
const compactSemanticRuntimeReopenEffectDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
  effectContractDetail: {
    effectContractIds: [AppBuilderEffectContractId.SemanticRuntimeReopen],
    includeSemanticEffectDescriptors: false,
    includeSemanticRuntimeQueryRows: false,
  },
});
assert.equal(compactSemanticRuntimeReopenEffectDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  compactSemanticRuntimeReopenEffectDetailAnswer.value.rows[0]?.semanticEffectDescriptors,
  undefined,
  'Expected includeSemanticEffectDescriptors:false to omit expected-effect descriptor payloads.',
);
assert.equal(
  compactSemanticRuntimeReopenEffectDetailAnswer.value.rows[0]?.semanticRuntimeQueryRows,
  undefined,
  'Expected includeSemanticRuntimeQueryRows:false to omit public app-query witness payloads.',
);
const componentManifestPublicationEffectDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
  effectContractDetail: {
    effectContractIds: [AppBuilderEffectContractId.ComponentManifestPublication],
  },
});
assert.equal(componentManifestPublicationEffectDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  componentManifestPublicationEffectDetailAnswer.value.rows[0]?.controlManifests?.some((row) =>
    row.id === AppBuilderControlManifestRowId.ComponentApiManifest
  ) === true,
  'Expected component-manifest publication effect detail to expose component API manifest rows.',
);
assert.ok(
  componentManifestPublicationEffectDetailAnswer.value.rows[0]?.controlManifestFieldDescriptors?.some((row) =>
    row.id === AppBuilderControlManifestFieldId.ComponentApiMember
    && row.manifestRowId === AppBuilderControlManifestRowId.ComponentApiManifest
  ) === true,
  'Expected component-manifest publication effect detail to expose component API field descriptors.',
);
assert.ok(
  componentManifestPublicationEffectDetailAnswer.value.rows[0]?.semanticRuntimeQueryRows?.some((row) =>
    row.queryKind === SemanticAppQueryKind.ResourceDefinitions
  ) === true,
  'Expected component-manifest publication effect detail to expose public resource-definition query witnesses.',
);
const compactComponentManifestPublicationEffectDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
  effectContractDetail: {
    effectContractIds: [AppBuilderEffectContractId.ComponentManifestPublication],
    includeControlManifestRows: false,
    includeControlManifestFieldDescriptors: false,
  },
});
assert.equal(compactComponentManifestPublicationEffectDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  compactComponentManifestPublicationEffectDetailAnswer.value.rows[0]?.controlManifests,
  undefined,
  'Expected includeControlManifestRows:false to omit component/control manifest rows from effect detail.',
);
assert.equal(
  compactComponentManifestPublicationEffectDetailAnswer.value.rows[0]?.controlManifestFieldDescriptors,
  undefined,
  'Expected includeControlManifestFieldDescriptors:false to omit manifest field descriptors from effect detail.',
);
const controlUseInventoryEffectDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
  effectContractDetail: {
    effectContractIds: [AppBuilderEffectContractId.ControlUseInventory],
  },
});
assert.equal(controlUseInventoryEffectDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  controlUseInventoryEffectDetailAnswer.value.rows[0]?.controlManifests?.some((row) =>
    row.id === AppBuilderControlManifestRowId.ControlUseInventory
    && row.status.sourceLoweringImplemented === false
  ) === true,
  'Expected control-use inventory effect detail to expose the control-use manifest row without claiming it is itself a source-lowering target.',
);
assert.equal(
  controlUseInventoryEffectDetailAnswer.value.rows[0]?.effectContract.status.sourceLoweringImplemented,
  false,
  'Expected ControlUseInventory effect status to stay distinct from source-lowerable ontology targets.',
);
assert.ok(
  controlUseInventoryEffectDetailAnswer.value.rows[0]?.controlManifestFieldDescriptors?.some((row) =>
    row.id === AppBuilderControlManifestFieldId.ControlUseSourceReference
    && row.manifestRowId === AppBuilderControlManifestRowId.ControlUseInventory
  ) === true,
  'Expected control-use inventory effect detail to expose control-use source-reference field descriptors.',
);
assert.ok(
  controlUseInventoryEffectDetailAnswer.value.rows[0]?.semanticRuntimeQueryRows?.some((row) =>
    row.queryKind === SemanticAppQueryKind.ControlUseInventory
  ) === true,
  'Expected control-use inventory effect detail to expose the public control-use-inventory query witness.',
);
assert.ok(
  controlUseInventoryEffectDetailAnswer.value.rows[0]?.semanticRuntimeQueryRows?.some((row) =>
    row.queryKind === SemanticAppQueryKind.BindingValueChannels
  ) === true,
  'Expected control-use inventory effect detail to expose public binding value-channel query witnesses.',
);

const structuralHooksStyleDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.StyleDetail,
  styleDetail: {
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
  },
});
assert.equal(structuralHooksStyleDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  structuralHooksStyleDetailAnswer.value.stylingMechanismRows[0]?.stylingMechanism.id,
  AppBuilderStylingMechanismId.ClassBinding,
  'Expected style-detail to select the requested styling mechanism.',
);
assert.equal(
  structuralHooksStyleDetailAnswer.value.visualPolicyRows[0]?.visualPolicy.id,
  AppBuilderVisualPolicyId.StructuralHooksOnly,
  'Expected style-detail to select the requested visual policy.',
);
assert.equal(
  structuralHooksStyleDetailAnswer.value.visualPolicyRows[0]?.inputReadiness?.missingRequiredCount,
  0,
  'Expected style-detail to preserve required input-readiness counts for selected visual policies.',
);
assert.equal(
  structuralHooksStyleDetailAnswer.value.visualPolicyRows[0]?.inputReadiness?.missingRecommendedCount,
  1,
  'Expected style-detail to preserve recommended visual-style input counts for selected visual policies.',
);
assert.equal(
  structuralHooksStyleDetailAnswer.value.stylingMechanismRows[0]?.inputReadiness?.inputDependencies.length,
  0,
  'Expected direct styling-mechanism rows to stay selectable style values while policy axes and visual policies own input readiness.',
);
assert.ok(
  structuralHooksStyleDetailAnswer.value.visualPolicyRows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.VisualStyleInput
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.VisualClassHooks)
  ) === true,
  'Expected style-detail to join visual-style payload detail by default.',
);
assert.ok(
  structuralHooksStyleDetailAnswer.value.stylingMechanismRows[0]?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.NativeControlBinding
  ) === true,
  'Expected style-detail to include application patterns that coordinate selected styling mechanisms.',
);
assert.ok(
  structuralHooksStyleDetailAnswer.value.visualPolicyRows[0]?.applicationPatterns?.some((row) =>
    row.id === AppBuilderApplicationPatternId.CollectionTable
  ) === true,
  'Expected style-detail to include application patterns that coordinate selected visual policies.',
);
assert.ok(
  structuralHooksStyleDetailAnswer.value.stylingMechanismRows[0]?.controlPatterns?.some((row) =>
    row.id === AppBuilderControlPatternId.NativeButton
  ) === true,
  'Expected style-detail to include controls coordinated through style-related application patterns.',
);
assert.ok(
  structuralHooksStyleDetailAnswer.value.visualPolicyRows[0]?.collectionConcepts?.some((row) =>
    row.id === AppBuilderCollectionConceptId.TableColumn
  ) === true,
  'Expected style-detail to include collection concepts coordinated through visual-policy application patterns.',
);
assert.ok(
  structuralHooksStyleDetailAnswer.value.visualPolicyRows[0]?.stylingMechanisms?.some((row) =>
    row.id === AppBuilderStylingMechanismId.ClassBinding
  ) === true,
  'Expected style-detail to include styling mechanisms coordinated through selected visual-policy patterns.',
);
assert.ok(
  structuralHooksStyleDetailAnswer.value.stylingMechanismRows[0]?.visualPolicies?.some((row) =>
    row.id === AppBuilderVisualPolicyId.StructuralHooksOnly
  ) === true,
  'Expected style-detail to include visual policies coordinated through selected styling-mechanism patterns.',
);
assert.ok(
  structuralHooksStyleDetailAnswer.value.visualPolicyRows[0]?.affordances?.some((row) =>
    row.id === AppBuilderAffordanceId.CollectionTable
  ) === true,
  'Expected style-detail to include affordances associated through coordinating application patterns.',
);
const generatedLocalDesignSystemStyleDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.StyleDetail,
  styleDetail: {
    visualPolicyIds: [AppBuilderVisualPolicyId.GeneratedLocalDesignSystem],
  },
});
assert.equal(generatedLocalDesignSystemStyleDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const generatedLocalDesignSystemVisualFacets = generatedLocalDesignSystemStyleDetailAnswer
  .value
  .visualPolicyRows[0]
  ?.inputContractDetails
  ?.find((row) => row.inputContract.id === AppBuilderInputContractId.VisualStyleInput)
  ?.inputFacets
  .map((row) => row.facet.id) ?? [];
assert.ok(
  generatedLocalDesignSystemVisualFacets.includes(AppBuilderInputFacetId.VisualTokens),
  'Expected generated-local design-system detail to preserve supplied-style visual-token facets.',
);
assert.ok(
  generatedLocalDesignSystemVisualFacets.includes(AppBuilderInputFacetId.VisualDesignSystemReference),
  'Expected generated-local design-system detail to preserve design-system reference facets after merging selections.',
);
const visualInputMissingStyleDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.StyleDetail,
  styleDetail: {
    visualPolicyIds: [AppBuilderVisualPolicyId.VisualInputMissing],
  },
});
assert.equal(visualInputMissingStyleDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  visualInputMissingStyleDetailAnswer.value.visualPolicyRows[0]?.inputReadiness?.inputDependencies.length,
  0,
  'Expected visual-input-missing to report missing visual input without requiring VisualStyleInput first.',
);
assert.equal(
  visualInputMissingStyleDetailAnswer.value.visualPolicyRows[0]?.inputContractDetails?.length,
  0,
  'Expected visual-input-missing not to join visual payload detail because it does not spend visual payload input.',
);
const compactStyleDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.StyleDetail,
  styleDetail: {
    stylingMechanismIds: [AppBuilderStylingMechanismId.ClassBinding],
    visualPolicyIds: [AppBuilderVisualPolicyId.StructuralHooksOnly],
    includeInputReadiness: false,
    includeInputContractDetail: false,
    includeApplicationPatterns: false,
    includeCollectionConcepts: false,
    includeControlPatterns: false,
    includeControlManifests: false,
    includeStylingMechanisms: false,
    includeVisualPolicies: false,
    includeAffordances: false,
  },
});
assert.equal(compactStyleDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactStyleDetailAnswer.value.stylingMechanismRows[0]?.inputReadiness, undefined);
assert.equal(compactStyleDetailAnswer.value.stylingMechanismRows[0]?.applicationPatterns, undefined);
assert.equal(compactStyleDetailAnswer.value.stylingMechanismRows[0]?.controlPatterns, undefined);
assert.equal(compactStyleDetailAnswer.value.stylingMechanismRows[0]?.visualPolicies, undefined);
assert.equal(compactStyleDetailAnswer.value.stylingMechanismRows[0]?.affordances, undefined);
assert.equal(compactStyleDetailAnswer.value.visualPolicyRows[0]?.inputReadiness, undefined);
assert.equal(compactStyleDetailAnswer.value.visualPolicyRows[0]?.inputContractDetails, undefined);
assert.equal(compactStyleDetailAnswer.value.visualPolicyRows[0]?.applicationPatterns, undefined);
assert.equal(compactStyleDetailAnswer.value.visualPolicyRows[0]?.collectionConcepts, undefined);
assert.equal(compactStyleDetailAnswer.value.visualPolicyRows[0]?.stylingMechanisms, undefined);
assert.equal(compactStyleDetailAnswer.value.visualPolicyRows[0]?.affordances, undefined);

const unscopedAffordanceDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.AffordanceDetail,
});
assert.equal(unscopedAffordanceDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(unscopedAffordanceDetailAnswer.value.inputReadinessIncluded, false);
assert.equal(unscopedAffordanceDetailAnswer.value.inputContractDetailIncluded, false);
assert.equal(unscopedAffordanceDetailAnswer.value.effectContractsIncluded, false);
assert.equal(unscopedAffordanceDetailAnswer.value.applicationPatternsIncluded, false);
assert.equal(unscopedAffordanceDetailAnswer.value.followUpsIncluded, false);
assert.equal(unscopedAffordanceDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.ok(
  serializedByteLength(unscopedAffordanceDetailAnswer) < 12000,
  'Expected unscoped affordance-detail to remain a compact base-row read unless joins are explicitly requested.',
);

const unscopedApplicationPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
});
assert.equal(unscopedApplicationPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(unscopedApplicationPatternDetailAnswer.value.inputReadinessIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.inputContractDetailIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.collectionConceptsIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.collectionFeaturesIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.companionApplicationPatternsIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.controlPatternsIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.controlManifestsIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.stylingMechanismsIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.visualPoliciesIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.affordancesIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.semanticEffectDescriptorsIncluded, false);
assert.equal(unscopedApplicationPatternDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.ok(
  serializedByteLength(unscopedApplicationPatternDetailAnswer)
    < 3000 + (unscopedApplicationPatternDetailAnswer.value.rows.length * 1800),
  'Expected unscoped application-pattern-detail to avoid expanding coordinated concept joins by default.',
);

const unscopedCollectionConceptDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail,
});
assert.equal(unscopedCollectionConceptDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(unscopedCollectionConceptDetailAnswer.value.inputReadinessIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.inputContractDetailIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.applicationPatternsIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.collectionFeaturesIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.controlPatternsIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.controlManifestsIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.stylingMechanismsIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.visualPoliciesIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.affordancesIncluded, false);
assert.equal(unscopedCollectionConceptDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.ok(
  serializedByteLength(unscopedCollectionConceptDetailAnswer) < 10000,
  'Expected unscoped collection-concept-detail to avoid expanding pattern/control/style joins by default.',
);

const unscopedControlPatternDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail,
});
assert.equal(unscopedControlPatternDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(unscopedControlPatternDetailAnswer.value.inputReadinessIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.inputContractDetailIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.applicationPatternsIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.controlDescriptorsIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.realizationPoliciesIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.controlManifestsIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.stylingMechanismsIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.visualPoliciesIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.affordancesIncluded, false);
assert.equal(unscopedControlPatternDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.ok(
  serializedByteLength(unscopedControlPatternDetailAnswer) < 22000,
  'Expected unscoped control-pattern-detail to avoid expanding descriptors/manifests/style joins by default.',
);

const unscopedControlManifestDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail,
});
assert.equal(unscopedControlManifestDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(unscopedControlManifestDetailAnswer.value.inputReadinessIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.inputContractDetailIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.applicationPatternsIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.controlPatternsIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.controlDescriptorsIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.realizationPoliciesIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.manifestFieldDescriptorsIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.effectContractsIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.stylingMechanismsIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.visualPoliciesIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.affordancesIncluded, false);
assert.equal(unscopedControlManifestDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.ok(
  serializedByteLength(unscopedControlManifestDetailAnswer) < 8000,
  'Expected unscoped control-manifest-detail to avoid expanding manifest/control/style joins by default.',
);
const continuedUnscopedControlManifestDetailAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail,
}, unscopedControlManifestDetailAnswer);
const unscopedControlManifestDetailContinuation = continuedUnscopedControlManifestDetailAnswer.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail
);
assert.deepEqual(
  unscopedControlManifestDetailContinuation?.targetAppBuilderQuery?.controlManifestDetail?.controlManifestIds,
  unscopedControlManifestDetailAnswer.value.rows.map((row) => row.controlManifest.id).sort(),
  'Expected compact control-manifest-detail rows to continue to selected manifest detail rather than becoming a public dead end.',
);

const unscopedEffectContractDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
});
assert.equal(unscopedEffectContractDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(unscopedEffectContractDetailAnswer.value.promisingAffordancesIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.affordanceInputReadinessIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.affordanceInputContractDetailIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.applicationPatternsIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.witnessDescriptorsIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.semanticEffectDescriptorsIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.semanticRuntimeQueryRowsIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.controlManifestRowsIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.controlManifestFieldDescriptorsIncluded, false);
assert.equal(unscopedEffectContractDetailAnswer.value.rows[0]?.witnessDescriptors, undefined);
assert.ok(
  serializedByteLength(unscopedEffectContractDetailAnswer) < 6000,
  'Expected unscoped effect-contract-detail to avoid expanding witness and promising-affordance joins by default.',
);

const unscopedPolicyDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PolicyDetail,
});
assert.equal(unscopedPolicyDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(unscopedPolicyDetailAnswer.value.inputReadinessIncluded, false);
assert.equal(unscopedPolicyDetailAnswer.value.inputContractDetailIncluded, false);
assert.equal(unscopedPolicyDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.ok(
  serializedByteLength(unscopedPolicyDetailAnswer) < 9000,
  'Expected unscoped policy-detail to avoid expanding readiness/input detail by default.',
);
const continuedUnscopedPolicyDetailAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.PolicyDetail,
}, unscopedPolicyDetailAnswer);
const unscopedPolicyDetailContinuation = continuedUnscopedPolicyDetailAnswer.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.PolicyDetail
);
assert.deepEqual(
  unscopedPolicyDetailContinuation?.targetAppBuilderQuery?.policyDetail?.policyAxisIds,
  unscopedPolicyDetailAnswer.value.rows.map((row) => row.policyAxis.id).sort(),
  'Expected compact policy-detail rows to continue to selected policy detail rather than becoming a public dead end.',
);

const unscopedStyleDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.StyleDetail,
});
assert.equal(unscopedStyleDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(unscopedStyleDetailAnswer.value.inputReadinessIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.inputContractDetailIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.applicationPatternsIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.collectionConceptsIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.controlPatternsIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.controlManifestsIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.stylingMechanismsIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.visualPoliciesIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.affordancesIncluded, false);
assert.equal(unscopedStyleDetailAnswer.value.stylingMechanismRows[0]?.inputReadiness, undefined);
assert.equal(unscopedStyleDetailAnswer.value.visualPolicyRows[0]?.inputReadiness, undefined);
assert.ok(
  serializedByteLength(unscopedStyleDetailAnswer) < 10000,
  'Expected unscoped style-detail to avoid expanding pattern/control/style joins by default.',
);

const compactReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    includeInputFacets: false,
  },
});
assert.equal(compactReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  compactReadinessAnswer.value.targets[0]?.inputDependencies.every((row) => row.inputFacets == null),
  'Expected input-readiness callers to suppress input facets for compact reads.',
);

const satisfiedInputReadinessRequest = {
  targetRefs: [{
    kind: AppBuilderOntologyRowKind.Affordance,
    domain: AppBuilderOntologyDomain.Affordance,
    id: AppBuilderAffordanceId.BlankSlateIntake,
  }],
  suppliedInputs: [
    {
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.PublicPreset,
      label: 'explicit sample domain',
    },
  ],
  decisionBundles: [{
    sourceId: AppBuilderDecisionBundleSource.OperatorReviewedDefault,
    label: 'blank slate source-start decisions',
    decisions: [
      {
        inputContractId: AppBuilderInputContractId.AureliaPolicy,
        label: 'operator-reviewed Aurelia policy',
      },
      {
        inputContractId: AppBuilderInputContractId.SourcePlacement,
        label: 'operator-reviewed source placement',
      },
    ],
  }],
};
const satisfiedReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: satisfiedInputReadinessRequest,
});
assert.equal(satisfiedReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(satisfiedReadinessAnswer.value.defaultTargetUsed, false);
assert.equal(satisfiedReadinessAnswer.value.satisfiedCount, 3);
assert.equal(satisfiedReadinessAnswer.value.missingRequiredCount, 0);
assert.equal(satisfiedReadinessAnswer.value.suppliedInputCount, 3);
assert.equal(satisfiedReadinessAnswer.value.explicitSuppliedInputCount, 1);
assert.equal(satisfiedReadinessAnswer.value.decisionBundleCount, 1);
assert.equal(satisfiedReadinessAnswer.value.decisionBundleDecisionCount, 2);
assert.equal(
  satisfiedReadinessAnswer.value.decisionBundleExpansionRows,
  undefined,
  'Expected compact/default input-readiness answers to report decision-bundle counts without expansion rows.',
);
const detailedSatisfiedReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    ...satisfiedInputReadinessRequest,
    includeDecisionBundleExpansionRows: true,
  },
});
assert.equal(detailedSatisfiedReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  detailedSatisfiedReadinessAnswer.value.decisionBundleExpansionRows?.length,
  2,
  'Expected detailed input-readiness answers to expose decision-bundle expansion rows when requested.',
);

const targetScopedDecisionReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    }, {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeNumberInput,
    }],
    decisionBundles: [{
      sourceId: AppBuilderDecisionBundleSource.ExplicitCallerSelection,
      label: 'target-scoped field decision',
      decisions: [{
        inputContractId: AppBuilderInputContractId.DomainModel,
        inputFacetIds: [AppBuilderInputFacetId.DomainFields],
        targetRefs: [{
          kind: AppBuilderOntologyRowKind.ControlPattern,
          domain: AppBuilderOntologyDomain.Control,
          id: AppBuilderControlPatternId.NativeTextInput,
        }],
        facetPayloads: [{
          inputFacetId: AppBuilderInputFacetId.DomainFields,
          value: [{
            name: 'title',
            title: 'Title',
            valueKind: AppBuilderDomainFieldValueKind.Text,
          }],
        }],
      }],
    }],
    includeDecisionBundleExpansionRows: true,
  },
});
assert.equal(targetScopedDecisionReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  targetScopedDecisionReadinessAnswer.value.decisionBundleExpansionRows?.[0]?.targetRefs[0]?.id,
  AppBuilderControlPatternId.NativeTextInput,
  'Expected decision-bundle expansion rows to preserve target-scoped decision evidence.',
);
const targetScopedTextReadiness = targetScopedDecisionReadinessAnswer.value.targets.find((row) =>
  row.targetRef.id === AppBuilderControlPatternId.NativeTextInput
);
const targetScopedNumberReadiness = targetScopedDecisionReadinessAnswer.value.targets.find((row) =>
  row.targetRef.id === AppBuilderControlPatternId.NativeNumberInput
);
assert.equal(
  targetScopedTextReadiness?.inputDependencies.find((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
  )?.state,
  AppBuilderInputReadinessState.Satisfied,
  'Expected target-scoped decision input to satisfy the selected text-input target.',
);
assert.equal(
  targetScopedNumberReadiness?.inputDependencies.find((row) =>
    row.inputContract.id === AppBuilderInputContractId.DomainModel
  )?.state,
  AppBuilderInputReadinessState.MissingRequired,
  'Expected target-scoped decision input not to satisfy a neighboring number-input target.',
);

const facetScopedReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      inputFacetIds: [AppBuilderInputFacetId.DomainFields],
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
          required: true,
        }],
      }],
    }],
  },
});
assert.equal(facetScopedReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const facetScopedDomainDependency = facetScopedReadinessAnswer.value.targets[0]?.inputDependencies.find((row) =>
  row.inputContract.id === AppBuilderInputContractId.DomainModel
);
assert.equal(
  facetScopedDomainDependency?.state,
  AppBuilderInputReadinessState.Satisfied,
  'Expected facet-scoped domain-field input to satisfy control dependencies that ask for domain fields.',
);
assert.deepEqual(
  facetScopedDomainDependency?.dependencyInputFacetIds,
  [AppBuilderInputFacetId.DomainFields],
  'Expected readiness rows to preserve the exact dependency facets being satisfied.',
);
assert.deepEqual(
  facetScopedDomainDependency?.suppliedInputFacetIds,
  [AppBuilderInputFacetId.DomainFields],
  'Expected readiness rows to expose which facets the supplied input covered.',
);
assert.equal(
  facetScopedDomainDependency?.payloadValidations[0]?.state,
  AppBuilderSuppliedInputPayloadValidationState.Valid,
  'Expected modeled facet payloads to validate against input-contract-detail schemas.',
);

const invalidPayloadReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      inputFacetIds: [AppBuilderInputFacetId.DomainFields],
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{ name: 'title', valueKind: 'not-a-field-kind' }],
      }],
    }],
  },
});
assert.equal(invalidPayloadReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  invalidPayloadReadinessAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderInputReadinessIssueKind.InvalidSuppliedInputPayload
    && issue.inputFacetId === AppBuilderInputFacetId.DomainFields
  ),
  'Expected invalid facet payloads to produce input-readiness issues instead of being silently accepted.',
);
assert.equal(
  invalidPayloadReadinessAnswer.value.invalidPayloadCount > 0,
  true,
  'Expected input-readiness result counts to expose invalid supplied payloads.',
);
const invalidPayloadDomainDependency = invalidPayloadReadinessAnswer.value.targets[0]?.inputDependencies.find((row) =>
  row.inputContract.id === AppBuilderInputContractId.DomainModel
);
assert.equal(
  invalidPayloadDomainDependency?.state,
  AppBuilderInputReadinessState.MissingRequired,
  'Expected invalid facet payloads not to satisfy a required dependency.',
);
assert.deepEqual(
  invalidPayloadDomainDependency?.missingInputFacetIds,
  [AppBuilderInputFacetId.DomainFields],
  'Expected invalid facet payloads to leave the dependency facet missing.',
);

const rejectedReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExistingAppFact,
    }],
  },
});
assert.equal(rejectedReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  rejectedReadinessAnswer.value.issues[0]?.issueKind,
  AppBuilderInputReadinessIssueKind.UnsupportedInputSource,
  'Expected business-domain input not to be satisfiable directly from deterministic existing-app facts.',
);
assert.equal(
  rejectedReadinessAnswer.value.missingRequiredCount,
  3,
  'Expected rejected supplied inputs not to satisfy readiness.',
);

const policyAxisReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.PolicyAxis,
      domain: AppBuilderOntologyDomain.Policy,
      id: AppBuilderPolicyAxisId.ConventionAdmission,
    }],
  },
});
assert.equal(policyAxisReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  policyAxisReadinessAnswer.value.missingRequiredCount,
  1,
  'Expected policy-axis readiness to spend policy input dependencies instead of being invisible.',
);

const areaNavigationPolicyDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PolicyDetail,
  policyDetail: {
    policyAxisIds: [AppBuilderPolicyAxisId.AreaNavigation],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.AureliaPolicy,
      sourceId: AppBuilderSuppliedInputSource.FuturePolicy,
      label: 'project navigation policy',
    }],
  },
});
assert.equal(areaNavigationPolicyDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(areaNavigationPolicyDetailAnswer.value.rows.length, 1);
assert.equal(
  areaNavigationPolicyDetailAnswer.value.rows[0]?.policyAxis.id,
  AppBuilderPolicyAxisId.AreaNavigation,
  'Expected policy-detail to select the requested policy axis.',
);
assert.equal(
  areaNavigationPolicyDetailAnswer.value.rows[0]?.policyAxis.scope,
  AppBuilderPolicyScope.AreaLocal,
  'Expected policy-detail to preserve policy-axis scope instead of flattening all policy to app-global.',
);
assert.equal(
  areaNavigationPolicyDetailAnswer.value.rows[0]?.inputReadiness?.satisfiedCount,
  1,
  'Expected policy-detail to preserve supplied policy input readiness.',
);
assert.equal(
  areaNavigationPolicyDetailAnswer.value.rows[0]?.inputReadiness?.missingRequiredCount,
  1,
  'Expected policy-detail not to treat a policy marker as business-domain input.',
);
assert.ok(
  areaNavigationPolicyDetailAnswer.value.rows[0]?.inputContractDetails?.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.AureliaPolicy
    && row.inputFacets.some((facet) => facet.facet.id === AppBuilderInputFacetId.AureliaRoutingPolicy)
  ) === true,
  'Expected policy-detail to expose Aurelia policy facets for policy-axis callers.',
);
const compactPolicyDetailAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PolicyDetail,
  policyDetail: {
    policyAxisIds: [AppBuilderPolicyAxisId.AreaNavigation],
    includeInputReadiness: false,
    includeInputContractDetail: false,
  },
});
assert.equal(compactPolicyDetailAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactPolicyDetailAnswer.value.rows[0]?.inputReadiness, undefined);
assert.equal(compactPolicyDetailAnswer.value.rows[0]?.inputContractDetails, undefined);

const recommendationPolicySummaryOnlyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy,
  recommendationPolicy: {},
});
assert.equal(recommendationPolicySummaryOnlyAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  recommendationPolicySummaryOnlyAnswer.value.rows.length,
  0,
  'Expected recommendation-policy to default to summary/counts without dumping row details.',
);
assert.equal(
  recommendationPolicySummaryOnlyAnswer.value.rowsIncluded,
  false,
  'Expected recommendation-policy rows to be opt-in for MCP-sized compact answers.',
);
assert.equal(
  recommendationPolicySummaryOnlyAnswer.value.summary.rowCount,
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.length,
  'Expected recommendation-policy summary to cover all admitted ontology rows by default.',
);
assert.ok(
  recommendationPolicySummaryOnlyAnswer.value.policySatisfactionCandidateCount > 0,
  'Expected recommendation-policy to count contextual executable source-lowering candidates.',
);

const mixedRecommendationPolicyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy,
  recommendationPolicy: {
    targetRefs: [
      {
        kind: AppBuilderOntologyRowKind.ApplicationPattern,
        domain: AppBuilderOntologyDomain.ApplicationPattern,
        id: AppBuilderApplicationPatternId.NativeSubmitForm,
      },
      {
        kind: AppBuilderOntologyRowKind.Affordance,
        domain: AppBuilderOntologyDomain.Affordance,
        id: AppBuilderAffordanceId.CreateSubmitForm,
      },
      {
        kind: AppBuilderOntologyRowKind.ControlPattern,
        domain: AppBuilderOntologyDomain.Control,
        id: AppBuilderControlPatternId.NativeRangeInput,
      },
      {
        kind: AppBuilderOntologyRowKind.StylingMechanism,
        domain: AppBuilderOntologyDomain.Style,
        id: AppBuilderStylingMechanismId.ClassBinding,
      },
    ],
    includeRows: true,
  },
});
assert.equal(mixedRecommendationPolicyAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(
  mixedRecommendationPolicyAnswer.value.rows.map((row) => row.targetRef.id),
  [
    AppBuilderApplicationPatternId.NativeSubmitForm,
    AppBuilderAffordanceId.CreateSubmitForm,
    AppBuilderControlPatternId.NativeRangeInput,
    AppBuilderStylingMechanismId.ClassBinding,
  ],
  'Expected exact recommendation-policy targetRefs to preserve caller order rather than descriptor-family order.',
);

const contextualRecommendationPolicyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy,
  page: { size: 20 },
  recommendationPolicy: {
    includeRows: true,
    policySatisfactionCandidates: true,
    applicabilityKinds: [AppBuilderRecommendationApplicabilityKind.CollectionProjection],
    evidenceKinds: [AppBuilderRecommendationEvidenceKind.SourceLoweringRegistry],
  },
});
assert.equal(contextualRecommendationPolicyAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  contextualRecommendationPolicyAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.CollectionTable
  ),
  'Expected recommendation-policy to expose source-lowerable contextual collection-table policy-satisfaction canaries.',
);
assert.ok(
  contextualRecommendationPolicyAnswer.value.rows.every((row) =>
    row.recommendationStatus === AppBuilderRecommendationStatus.Contextual
    && row.sourceLoweringImplemented
    && row.applicability.some((applicability) =>
      applicability.kind === AppBuilderRecommendationApplicabilityKind.CollectionProjection
    )
    && row.evidence.some((evidence) =>
      evidence.kind === AppBuilderRecommendationEvidenceKind.SourceLoweringRegistry
    )
  ),
  'Expected recommendation-policy filters to keep contextual executable collection-policy rows coherent.',
);
assert.equal(
  Object.hasOwn(contextualRecommendationPolicyAnswer.value.summary, 'recommendationAuthorityCounts'),
  false,
  'Expected recommendation-policy summary to use evidence counts instead of compressed recommendation authority counts.',
);
assert.equal(
  contextualRecommendationPolicyAnswer.value.rows.some((row) => Object.hasOwn(row, 'recommendationAuthority')),
  false,
  'Expected recommendation-policy rows to expose evidence lanes instead of compressed recommendationAuthority.',
);

const stylingMechanismPolicyReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.PolicyAxis,
      domain: AppBuilderOntologyDomain.Policy,
      id: AppBuilderPolicyAxisId.StylingMechanism,
    }],
  },
});
assert.equal(stylingMechanismPolicyReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  stylingMechanismPolicyReadinessAnswer.value.targets[0]?.inputDependencies.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.AureliaPolicy
    && row.dependencyInputFacetIds.includes(AppBuilderInputFacetId.AureliaStylingPolicy)
  ) === true,
  'Expected the styling-mechanism policy axis to own the Aurelia styling-policy input facet.',
);
assert.ok(
  stylingMechanismPolicyReadinessAnswer.value.targets[0]?.inputDependencies.some((row) =>
    row.inputContract.id === AppBuilderInputContractId.VisualStyleInput
    && row.dependencyInputFacetIds.includes(AppBuilderInputFacetId.VisualClassHooks)
  ) === true,
  'Expected the styling-mechanism policy axis to expose visual class-hook readiness without attaching it to every mechanism row.',
);

const noDependencyReadinessAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  inputReadiness: {
    targetRefs: [
      {
        kind: AppBuilderOntologyRowKind.EffectContract,
        domain: AppBuilderOntologyDomain.Effect,
        id: AppBuilderEffectContractId.SourcePlanPreview,
      },
      {
        kind: AppBuilderOntologyRowKind.StylingMechanism,
        domain: AppBuilderOntologyDomain.Style,
        id: AppBuilderStylingMechanismId.ClassBinding,
      },
    ],
  },
});
assert.equal(noDependencyReadinessAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(noDependencyReadinessAnswer.value.targets.length, 2);
assert.equal(noDependencyReadinessAnswer.value.issues.length, 0);
assert.ok(
  noDependencyReadinessAnswer.value.targets.every((target) => target.inputDependencies.length === 0),
  'Expected readiness to resolve known ontology rows with no input dependencies instead of reporting unknown targets.',
);

const policyTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    domains: [AppBuilderOntologyDomain.Policy],
    includeInputDependencies: true,
  },
});
assert.equal(policyTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(policyTargetCatalogAnswer.value.inputReadinessIncluded, true);
assert.equal(policyTargetCatalogAnswer.value.inputDependenciesIncluded, true);
assert.equal(
  policyTargetCatalogAnswer.value.rows.length,
  APP_BUILDER_POLICY_AXIS_IDS.length,
  'Expected policy-domain target catalog to return every policy axis row.',
);
const conventionPolicyTarget = policyTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.id === AppBuilderPolicyAxisId.ConventionAdmission
);
assert.equal(
  conventionPolicyTarget?.inputReadiness?.inputDependencyCount,
  1,
  'Expected target catalog to project policy-axis input-readiness counts.',
);
assert.equal(
  conventionPolicyTarget?.inputDependencies?.[0]?.inputContract.id,
  AppBuilderInputContractId.AureliaPolicy,
  'Expected target catalog dependency detail to expose the policy input contract.',
);
assert.equal(
  conventionPolicyTarget?.defaultingCandidate,
  true,
  'Expected target catalog rows to disclose local defaulting-candidate policy without requiring a separate policy-detail query.',
);
assert.equal(
  conventionPolicyTarget?.defaultingCandidatePolicy?.scope,
  AppBuilderDefaultingCandidatePolicyScope.PolicyAxis,
  'Expected policy-axis defaulting candidates to carry their reviewable defaulting policy scope.',
);
assert.equal(
  conventionPolicyTarget?.policySatisfactionRequired,
  false,
  'Expected non-source-lowering policy axes not to require contextual source-lowering policy satisfaction.',
);
assert.ok(
  conventionPolicyTarget?.inputDependencies?.[0]?.inputFacets?.some((facet) =>
    facet.id === AppBuilderInputFacetId.AureliaConventionPolicy
  ) === true,
  'Expected target catalog dependency detail to carry input-facet rows through input-readiness.',
);

const inputFacetTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.InputFacet],
    includeInputReadiness: true,
  },
});
assert.equal(inputFacetTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  inputFacetTargetCatalogAnswer.value.rows.length,
  APP_BUILDER_INPUT_FACET_IDS.length,
  'Expected target catalog to expose every fine-grained input facet as a selectable ontology row.',
);
assert.ok(
  inputFacetTargetCatalogAnswer.value.rows.every((row) =>
    row.inputReadiness?.inputDependencyCount === 0
  ),
  'Expected input facets to be known target rows without pretending they are input dependencies themselves.',
);
const reasonAuthorityFilterTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    reasonAuthorities: [AppBuilderOntologyReasonAuthority.ToBeDetermined],
    includeInputReadiness: false,
  },
});
assert.equal(reasonAuthorityFilterTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  reasonAuthorityFilterTargetCatalogAnswer.value.rows.length,
  toBeDeterminedReasonAuthorityRowCount,
  'Expected target-catalog callers to filter selectable rows by reasonAuthority.',
);
assert.ok(
  reasonAuthorityFilterTargetCatalogAnswer.value.rows.every((row) =>
    row.status.reasonAuthority === AppBuilderOntologyReasonAuthority.ToBeDetermined
    && row.inputReadiness == null
  ),
  'Expected reasonAuthority target filters to preserve compact readiness suppression.',
);

const compactTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [
      AppBuilderOntologyRowKind.EffectContract,
      AppBuilderOntologyRowKind.StylingMechanism,
    ],
    includeInputReadiness: true,
  },
  page: { size: 2 },
});
assert.equal(compactTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(compactTargetCatalogAnswer.value.rows.length, 2);
assert.equal(compactTargetCatalogAnswer.page?.totalRows, 11);
assert.ok(
  compactTargetCatalogAnswer.value.rows.every((row) =>
    row.inputReadiness?.inputDependencyCount === 0
    && row.inputDependencies == null
  ),
  'Expected compact target catalog rows to include readiness counts without full dependency rows.',
);

const compactSourceLoweringTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    sourceLoweringSurfaceKinds: [AppBuilderSourceLoweringSurfaceKind.TargetInvocation],
    includeInputReadiness: false,
  },
});
assert.equal(compactSourceLoweringTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  compactSourceLoweringTargetCatalogAnswer.value.rows.some((row) => row.sourceLoweringRequestFields != null),
  false,
  'Expected compact/default target catalog rows to omit full source-lowering request-field rows.',
);
assert.ok(
  compactSourceLoweringTargetCatalogAnswer.value.rows.some((row) =>
    row.sourceLoweringRequestFieldSummary.requestFieldCount > 0
  ),
  'Expected compact/default target catalog rows to retain source-lowering request-field summaries.',
);
assert.ok(
  compactSourceLoweringTargetCatalogAnswer.value.rows.every((row) =>
    row.sourceLoweringRequestFieldSummary.surfaces.every((surface) =>
      surface.requiredRequestFieldNames == null
      && surface.conditionalRequestFieldNames == null
      && surface.optionalRequestFieldNames == null
    )
  ),
  'Expected compact/default target catalog summaries to omit request-field name arrays until detail rows are requested.',
);
assert.match(
  compactSourceLoweringTargetCatalogAnswer.value.displayText,
  /sourceLoweringRequestFieldRows=false/,
  'Expected compact/default target catalog display text to disclose that request-field detail rows were omitted.',
);

const controlPatternTargetCatalogAnswer = answerPagedSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.ControlPattern],
    includeInputReadiness: false,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(controlPatternTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const nativeTextInputTarget = controlPatternTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.id === AppBuilderControlPatternId.NativeTextInput
);
assert.equal(
  nativeTextInputTarget?.status.sourceLoweringImplemented,
  true,
  'Expected native text input to report app-builder source-lowering implementation once the source-lowering invocation bridge exists.',
);
assert.deepEqual(
  nativeTextInputTarget?.sourceLoweringSurfaceKinds,
  [
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ],
  'Expected native text input to expose both single-target invocation and SourcePlan-preview wrapper surfaces.',
);
assert.deepEqual(
  targetInvocationRequestFieldPairs(nativeTextInputTarget),
  [
    [AppBuilderSourceLoweringRequestFieldId.FieldName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.BindingExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.LabelText, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected native text input to disclose direct invocation field selection, binding-expression, and standalone accessible-name request fields.',
);
const nativeSingleSelectTarget = controlPatternTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.id === AppBuilderControlPatternId.NativeSingleSelect
);
assert.deepEqual(
  targetInvocationRequestFieldPairs(nativeSingleSelectTarget),
  [
    [AppBuilderSourceLoweringRequestFieldId.FieldName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.BindingExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.LabelText, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ValueDomainExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ValueSetName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.OptionLocalName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.OptionValueExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.OptionBindingKind, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.OptionLabelExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.MatcherExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected native single-select to disclose value-domain and option-shape request fields for direct invocation.',
);
const nativeButtonTarget = controlPatternTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.id === AppBuilderControlPatternId.NativeButton
);
assert.deepEqual(
  targetInvocationRequestFieldPairs(nativeButtonTarget),
  [
    [AppBuilderSourceLoweringRequestFieldId.ActionName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.HandlerExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.EventName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ButtonText, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ButtonType, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected native button to disclose action, handler, event, text, and button-type request fields for direct invocation.',
);
const domainCommandActionTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ApplicationPattern,
      id: AppBuilderApplicationPatternId.DomainCommandAction,
    }],
    includeInputReadiness: false,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(domainCommandActionTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  domainCommandActionTargetCatalogAnswer.value.rows[0]?.status.sourceLoweringImplemented,
  true,
  'Expected domain command actions to report app-builder source-lowering implementation once class-member lowering exists.',
);
assert.deepEqual(
  domainCommandActionTargetCatalogAnswer.value.rows[0]?.sourceLoweringSurfaceKinds,
  [AppBuilderSourceLoweringSurfaceKind.TargetInvocation],
  'Expected domain command actions to expose only target invocation because a class-member fragment is not a standalone SourcePlan file.',
);
assert.deepEqual(
  targetInvocationRequestFieldPairs(domainCommandActionTargetCatalogAnswer.value.rows[0]),
  [
    [AppBuilderSourceLoweringRequestFieldId.ActionName, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodParameters, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodBodyStatements, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCallResultMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCallArgumentExpressions, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateValueExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceQueryReloadMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCallRefreshMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected domain command actions to disclose explicit action selection, optional method parameters, conditional caller-owned method body statements, structured service-call derivation fields, and query-state refresh fields.',
);
const asyncDataSourceTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ApplicationPattern,
      id: AppBuilderApplicationPatternId.AsyncDataSource,
    }],
    includeInputReadiness: false,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(asyncDataSourceTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(
  targetInvocationRequestFieldPairs(asyncDataSourceTargetCatalogAnswer.value.rows[0]),
  [
    [AppBuilderSourceLoweringRequestFieldId.AsyncDataMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.AsyncDataPromiseType, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.AsyncDataInitializerExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.AsyncDataMemberMutability, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected async-data-source to disclose member name, promise type, initializer, and optional mutability request fields.',
);
const fieldGroupTarget = controlPatternTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.id === AppBuilderControlPatternId.FieldGroup
);
assert.deepEqual(
  targetInvocationRequestFieldPairs(fieldGroupTarget),
  [
    [AppBuilderSourceLoweringRequestFieldId.FieldName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.BindingExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.InnerControlPatternId, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.LabelText, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.FieldControlId, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected field-group to disclose selector, label, and control-id request fields for direct invocation.',
);
const formMessageTarget = controlPatternTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.id === AppBuilderControlPatternId.FormMessage
);
assert.deepEqual(
  targetInvocationRequestFieldPairs(formMessageTarget),
  [
    [AppBuilderSourceLoweringRequestFieldId.MessageKind, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.MessageText, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.MessageId, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected form-message to disclose message selector/text/id request fields for direct invocation.',
);
const targetOwnedRequestFieldCoverageScope = {
  summarizedRegistryOwnerKinds: [AppBuilderSourceLoweringRequestFieldRegistryOwnerKind.SourceLoweringTarget],
  summarizedSurfaceKinds: [
    AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
    AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
  ],
};
const allRequestFieldCoverageRows = appBuilderSourceLoweringRequestFieldRegistryCoverageRows([]);
const targetOwnedRequestFieldCoverageRows = appBuilderSourceLoweringRequestFieldRegistryCoverageRowsInSummaryScope(
  allRequestFieldCoverageRows,
  targetOwnedRequestFieldCoverageScope,
);
const targetOwnedRequestFieldCoverageSummary = appBuilderSourceLoweringRequestFieldRegistryCoverageSummary(
  targetOwnedRequestFieldCoverageRows,
  targetOwnedRequestFieldCoverageScope,
);
assert.ok(
  allRequestFieldCoverageRows.some((row) =>
    row.registryOwnerKinds.includes(AppBuilderSourceLoweringRequestFieldRegistryOwnerKind.SourcePlanSelection)
  ),
  'Expected unscoped request-field coverage to include SourcePlan-selection wrapper rows.',
);
assert.ok(
  targetOwnedRequestFieldCoverageRows.length < allRequestFieldCoverageRows.length,
  'Expected target-owned request-field coverage scope to exclude SourcePlan-selection wrapper rows.',
);
assert.equal(
  targetOwnedRequestFieldCoverageSummary.requestFieldCount,
  targetOwnedRequestFieldCoverageRows.length,
  'Expected target-owned request-field coverage summary to count the same rows written as scoped detail rows.',
);
assert.equal(
  targetOwnedRequestFieldCoverageSummary.unusedRequiredFieldCount,
  targetOwnedRequestFieldCoverageRows.filter((row) =>
    !row.usedBySource
    && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Required)
  ).length,
  'Expected target-owned request-field coverage summary to count required holes from scoped detail rows only.',
);
assert.equal(
  targetOwnedRequestFieldCoverageSummary.unusedConditionalOnlyFieldCount,
  targetOwnedRequestFieldCoverageRows.filter((row) =>
    !row.usedBySource
    && !row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Required)
    && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional)
    && !row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Optional)
  ).length,
  'Expected target-owned request-field coverage summary to count conditional-only holes from scoped detail rows only.',
);
assert.equal(
  targetOwnedRequestFieldCoverageSummary.unusedOptionalOnlyFieldCount,
  targetOwnedRequestFieldCoverageRows.filter((row) =>
    !row.usedBySource
    && row.registeredRequirementKinds.length === 1
    && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Optional)
  ).length,
  'Expected target-owned request-field coverage summary to count optional-only holes from scoped detail rows only.',
);
assert.equal(
  targetOwnedRequestFieldCoverageSummary.unusedMixedRequirementFieldCount,
  targetOwnedRequestFieldCoverageRows.filter((row) =>
    !row.usedBySource
    && !row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Required)
    && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional)
    && row.registeredRequirementKinds.includes(AppBuilderSourceLoweringRequestFieldRequirementKind.Optional)
  ).length,
  'Expected target-owned request-field coverage summary to count mixed conditional/optional holes from scoped detail rows only.',
);
assert.equal(
  targetOwnedRequestFieldCoverageSummary.registryOwnerKinds.includes(AppBuilderSourceLoweringRequestFieldRegistryOwnerKind.SourcePlanSelection),
  false,
  'Expected target-owned request-field coverage detail rows to keep SourcePlan-selection ownership out of the summary scope.',
);
assert.ok(
  nativeTextInputTarget?.effectContractIds.includes(AppBuilderEffectContractId.ControlUseInventory) === true
  && nativeTextInputTarget.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview) === true,
  'Expected target catalog rows to expose effect contracts associated with source-lowerable controls.',
);
const fragmentCompositionTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    sourceLoweringSurfaceKinds: [AppBuilderSourceLoweringSurfaceKind.FragmentComposition],
    includeInputReadiness: false,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(fragmentCompositionTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  fragmentCompositionTargetCatalogAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.NativeSubmitForm
    && row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.FragmentComposition)
  ),
  'Expected target catalog sourceLoweringSurfaceKinds filter to expose Native Submit Form as a fragment-composition target.',
);
const nativeSubmitFormTargetCatalogRow = fragmentCompositionTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
  && row.targetRef.id === AppBuilderApplicationPatternId.NativeSubmitForm
);
assert.equal(
  nativeSubmitFormTargetCatalogRow?.defaultingCandidate,
  true,
  'Expected Native Submit Form to disclose local defaulting-candidate status once form intent and inputs narrow the context.',
);
assert.equal(
  nativeSubmitFormTargetCatalogRow?.defaultingCandidatePolicy?.scope,
  AppBuilderDefaultingCandidatePolicyScope.ApplicationPattern,
  'Expected Native Submit Form target rows to carry their application-pattern defaulting scope.',
);
assert.equal(
  nativeSubmitFormTargetCatalogRow?.policySatisfactionRequired,
  false,
  'Expected recommendable executable patterns not to require contextual policy satisfaction.',
);
assert.ok(
  fragmentCompositionTargetCatalogAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.CollectionList
    && row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.FragmentComposition)
  )
  && fragmentCompositionTargetCatalogAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.CollectionCard
    && row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.FragmentComposition)
  )
  && fragmentCompositionTargetCatalogAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.CollectionTable
    && row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.FragmentComposition)
  ),
  'Expected target catalog sourceLoweringSurfaceKinds filter to expose collection list/card/table as fragment-composition source-lowering targets.',
);
const collectionTableTargetCatalogRow = fragmentCompositionTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
  && row.targetRef.id === AppBuilderApplicationPatternId.CollectionTable
);
assert.equal(
  collectionTableTargetCatalogRow?.defaultingCandidate,
  false,
  'Expected Collection Table not to appear as a local fallback when list/card/table projection has not been explicitly selected.',
);
assert.equal(
  collectionTableTargetCatalogRow?.policySatisfactionRequired,
  true,
  'Expected contextual executable Collection Table rows to disclose their source-lowering policy gate in target catalog.',
);
assert.ok(
  fragmentCompositionTargetCatalogAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.LoadingEmptyErrorState
    && row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.FragmentComposition)
  ),
  'Expected target catalog sourceLoweringSurfaceKinds filter to expose Loading / Empty / Error State as a fragment-composition source-lowering target.',
);
const loadingEmptyErrorTargetCatalogRow = fragmentCompositionTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
  && row.targetRef.id === AppBuilderApplicationPatternId.LoadingEmptyErrorState
);
assert.deepEqual(
  loadingEmptyErrorTargetCatalogRow?.sourceLoweringRequestFields
    .filter((field) =>
      field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.FragmentComposition
      && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required
    )
    .map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.PromiseExpression,
    AppBuilderSourceLoweringRequestFieldId.PendingText,
    AppBuilderSourceLoweringRequestFieldId.EmptyStateText,
    AppBuilderSourceLoweringRequestFieldId.EmptyStateConditionExpression,
    AppBuilderSourceLoweringRequestFieldId.RejectedText,
  ],
  'Expected target catalog to expose required Loading / Empty / Error request fields before callers invoke source-lowering composition.',
);
assert.equal(
  loadingEmptyErrorTargetCatalogRow?.status.requiresExplicitInput,
  true,
  'Expected rows with required source-lowering request fields to report requiresExplicitInput=true in the status matrix.',
);
assert.equal(
  loadingEmptyErrorTargetCatalogRow?.sourceLoweringRequestFieldSummary.requiredCount,
  8,
  'Expected target catalog request-field summary to count Loading / Empty / Error fragment and SourcePlan required fields.',
);
assert.deepEqual(
  loadingEmptyErrorTargetCatalogRow?.sourceLoweringRequestFieldSummary.surfaces
    .filter((surface) => surface.requiredCount > 0)
    .map((surface) => [surface.surfaceKind, surface.requiredRequestFieldNames]),
  [
    [
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
      ['promiseExpression', 'pendingText', 'emptyStateText', 'emptyStateConditionExpression', 'rejectedText'],
    ],
    [
      AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
      ['rootDir', 'templatePath', 'sourceLoweringComposition'],
    ],
  ],
  'Expected target catalog request-field summary to preserve surface-scoped required field names.',
);

const sourcePlanPreviewTargetCatalogAnswer = answerPagedSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    sourceLoweringSurfaceKinds: [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
    includeInputReadiness: false,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(sourcePlanPreviewTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  sourcePlanPreviewTargetCatalogAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
    && row.targetRef.id === AppBuilderControlPatternId.NativeTextInput
    && row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview)
  ),
  'Expected SourcePlan-preview target filtering to include invocation-backed native controls.',
);
const nativeTextSourcePlanTargetCatalogRow = sourcePlanPreviewTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
  && row.targetRef.id === AppBuilderControlPatternId.NativeTextInput
);
assert.deepEqual(
  nativeTextSourcePlanTargetCatalogRow?.sourceLoweringRequestFields
    .filter((field) =>
      field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview
      && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required
    )
    .map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.RootDir,
    AppBuilderSourceLoweringRequestFieldId.TemplatePath,
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringInvocation,
  ],
  'Expected SourcePlan-preview target rows for native controls to disclose placement plus nested invocation request fields.',
);
assert.ok(
  sourcePlanPreviewTargetCatalogAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.NativeSubmitForm
    && row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview)
  ),
  'Expected SourcePlan-preview target filtering to include composition-backed application patterns.',
);
assert.ok(
  sourcePlanPreviewTargetCatalogAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.AppShell
    && row.sourceLoweringSurfaceKinds.length === 1
    && row.sourceLoweringSurfaceKinds.includes(AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview)
  ),
  'Expected SourcePlan-preview target filtering to include direct AppShell SourcePlan targets without invocation/composition surfaces.',
);
const appShellSourcePlanTargetCatalogRow = sourcePlanPreviewTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
  && row.targetRef.id === AppBuilderApplicationPatternId.AppShell
);
assert.deepEqual(
  appShellSourcePlanTargetCatalogRow?.sourceLoweringRequestFields
    .filter((field) =>
      field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview
      && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required
    )
    .map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.RootDir,
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringAppShell,
  ],
  'Expected direct AppShell SourcePlan target rows to require rootDir and sourceLoweringAppShell without templatePath.',
);
const diStateClassSourcePlanTargetCatalogRow = sourcePlanPreviewTargetCatalogAnswer.value.rows.find((row) =>
  row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
  && row.targetRef.id === AppBuilderApplicationPatternId.DiStateClass
);
assert.deepEqual(
  diStateClassSourcePlanTargetCatalogRow?.sourceLoweringRequestFields
    .filter((field) =>
      field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview
      && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required
    )
    .map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.RootDir,
    AppBuilderSourceLoweringRequestFieldId.SourceTargetPath,
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringDiStateClass,
  ],
  'Expected direct DI state-class SourcePlan target rows to require rootDir, sourceTargetPath, and sourceLoweringDiStateClass without templatePath.',
);

const defaultSourceLoweringPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
});
assert.equal(defaultSourceLoweringPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  defaultSourceLoweringPreflightAnswer.value.defaultTargetReason,
  AppBuilderSourceLoweringPreflightDefaultTargetReason.SourceLoweringImplemented,
  'Expected omitted source-lowering preflight targets to include source lowerers.',
);
assert.equal(
  defaultSourceLoweringPreflightAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.LoadingEmptyErrorState
    && row.canRequestSourceLowering
  ),
  true,
  'Expected default source-lowering preflight to surface gate-ready rows while separate request-field counts explain remaining call fields.',
);
assert.ok(
  defaultSourceLoweringPreflightAnswer.value.requiredRequestFieldTargetCount > 0,
  'Expected default source-lowering preflight to summarize targets that still advertise required per-call request fields.',
);
assert.ok(
  defaultSourceLoweringPreflightAnswer.value.requiredSourceLoweringRequestFieldCount > 0,
  'Expected default source-lowering preflight to summarize required per-call request fields separately from input readiness.',
);
assert.equal(
  defaultSourceLoweringPreflightAnswer.value.rows.some((row) => row.sourceLoweringRequestFields != null),
  false,
  'Expected compact/default source-lowering preflight rows to omit full request-field rows.',
);
assert.match(
  defaultSourceLoweringPreflightAnswer.value.displayText,
  /sourceLoweringRequestFieldRows=false/,
  'Expected compact/default source-lowering preflight display text to disclose that request-field detail rows were omitted.',
);
assert.equal(
  defaultSourceLoweringPreflightAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.CollectionCard
    && row.sourceLoweringAvailability === AppBuilderSourceLoweringAvailability.SourceLoweringImplemented
  ),
  true,
  'Expected default source-lowering preflight to include implemented source lowerers.',
);
const defaultCollectionCardPreflightRow = defaultSourceLoweringPreflightAnswer.value.rows.find((row) =>
  row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
  && row.targetRef.id === AppBuilderApplicationPatternId.CollectionCard
);
assert.equal(
  defaultCollectionCardPreflightRow?.policySatisfaction.state,
  AppBuilderPolicySatisfactionState.MissingExplicitSelection,
  'Expected contextual source-lowering rows reached through default targets to require explicit target-selection policy.',
);
assert.equal(
  defaultCollectionCardPreflightRow?.policySatisfactionIssues[0]?.issueKind,
  AppBuilderSourceLoweringPreflightIssueKind.PolicySatisfactionRequirement,
  'Expected contextual source-lowering preflight rows to expose a policy-satisfaction issue separately from payload issues.',
);
assert.ok(
  defaultSourceLoweringPreflightAnswer.value.policySatisfactionMissingCount > 0,
  'Expected default source-lowering preflight to summarize contextual policy gates that need exact target selection.',
);
assert.ok(
  defaultSourceLoweringPreflightAnswer.value.displayText.includes('policyGateMissing='),
  'Expected source-lowering preflight display text to include policy gate counts so broad/default answers remain self-describing.',
);
assert.ok(
  defaultSourceLoweringPreflightAnswer.value.displayText.includes('sourceLoweringGateReady='),
  'Expected source-lowering preflight display text to describe durable gate readiness rather than implying complete request readiness.',
);
assert.ok(
  defaultSourceLoweringPreflightAnswer.value.displayText.includes('requiredSourceLoweringRequestFields='),
  'Expected source-lowering preflight display text to include required per-call request-field counts.',
);
const continuedDefaultSourceLoweringPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
}, defaultSourceLoweringPreflightAnswer);
const policyGateContinuation = continuedDefaultSourceLoweringPreflightAnswer.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy
  && row.targetAppBuilderQuery?.recommendationPolicy?.policySatisfactionCandidates === true
);
assert.ok(
  policyGateContinuation,
  'Expected source-lowering preflight policy-gate rows to continue into recommendation-policy detail.',
);
assert.ok(
  policyGateContinuation.targetAppBuilderQuery?.recommendationPolicy?.targetRefs?.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.CollectionTable
  ),
  'Expected policy-gate continuation to carry exact contextual target refs for recommendation-policy review.',
);
assert.equal(
  policyGateContinuation.targetAppBuilderQuery?.recommendationPolicy?.includeRows,
  true,
  'Expected policy-gate continuation to request recommendation-policy rows, not just compact counts.',
);
assert.equal(
  defaultSourceLoweringPreflightAnswer.value.displayText.includes('sourceLoweringReady='),
  false,
  'Expected source-lowering preflight display text not to collapse durable input readiness and request-field readiness.',
);
assert.equal(
  defaultSourceLoweringPreflightAnswer.value.rows.some((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && row.targetRef.id === AppBuilderApplicationPatternId.CollectionTable
    && row.sourceLoweringAvailability === AppBuilderSourceLoweringAvailability.SourceLoweringImplemented
  ),
  true,
  'Expected default source-lowering preflight to include implemented table source lowerers.',
);
const compactDecisionBundlePreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: satisfiedInputReadinessRequest.targetRefs,
    suppliedInputs: satisfiedInputReadinessRequest.suppliedInputs,
    decisionBundles: satisfiedInputReadinessRequest.decisionBundles,
  },
});
assert.equal(compactDecisionBundlePreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(compactDecisionBundlePreflightAnswer.value.suppliedInputCount, 3);
assert.equal(compactDecisionBundlePreflightAnswer.value.explicitSuppliedInputCount, 1);
assert.equal(compactDecisionBundlePreflightAnswer.value.decisionBundleCount, 1);
assert.equal(compactDecisionBundlePreflightAnswer.value.decisionBundleDecisionCount, 2);
assert.equal(
  compactDecisionBundlePreflightAnswer.value.decisionBundleExpansionRows,
  undefined,
  'Expected compact/default source-lowering preflight answers to report decision-bundle counts without expansion rows.',
);
const detailedDecisionBundlePreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: satisfiedInputReadinessRequest.targetRefs,
    suppliedInputs: satisfiedInputReadinessRequest.suppliedInputs,
    decisionBundles: satisfiedInputReadinessRequest.decisionBundles,
    includeDecisionBundleExpansionRows: true,
  },
});
assert.equal(detailedDecisionBundlePreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  detailedDecisionBundlePreflightAnswer.value.decisionBundleExpansionRows?.length,
  2,
  'Expected detailed source-lowering preflight answers to expose decision-bundle expansion rows when requested.',
);

const targetScopedDecisionPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    }, {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeNumberInput,
    }],
    decisionBundles: [{
      sourceId: AppBuilderDecisionBundleSource.ExplicitCallerSelection,
      label: 'target-scoped preflight field decision',
      decisions: [{
        inputContractId: AppBuilderInputContractId.DomainModel,
        inputFacetIds: [AppBuilderInputFacetId.DomainFields],
        targetRefs: [{
          kind: AppBuilderOntologyRowKind.ControlPattern,
          domain: AppBuilderOntologyDomain.Control,
          id: AppBuilderControlPatternId.NativeTextInput,
        }],
        facetPayloads: [{
          inputFacetId: AppBuilderInputFacetId.DomainFields,
          value: [{
            name: 'title',
            title: 'Title',
            valueKind: AppBuilderDomainFieldValueKind.Text,
          }],
        }],
      }],
    }],
  },
});
assert.equal(targetScopedDecisionPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  targetScopedDecisionPreflightAnswer.value.rows.find((row) =>
    row.targetRef.id === AppBuilderControlPatternId.NativeTextInput
  )?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected target-scoped decision input to make the selected text-input preflight ready.',
);
assert.equal(
  targetScopedDecisionPreflightAnswer.value.rows.find((row) =>
    row.targetRef.id === AppBuilderControlPatternId.NativeNumberInput
  )?.inputGateState,
  AppBuilderSourceLoweringInputGateState.MissingRequiredInput,
  'Expected target-scoped decision input not to leak into number-input preflight.',
);

const nativeTextPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
    includeInputDependencies: true,
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }],
  },
});
assert.equal(nativeTextPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const nativeTextPreflightRow = nativeTextPreflightAnswer.value.rows[0];
assert.equal(
  nativeTextPreflightRow?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected preflight to report native text input as source-lowerable once the source-lowering invocation bridge exists.',
);
assert.equal(
  nativeTextPreflightRow?.canRequestSourceLowering,
  true,
  'Expected preflight to allow app-builder source-lowering request for implemented native text input with valid input.',
);
assert.equal(
  nativeTextPreflightRow?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected valid facet payloads to make the native text input preflight input gate ready.',
);
assert.equal(
  nativeTextPreflightRow?.inputReadiness.invalidPayloadCount,
  0,
  'Expected valid facet payloads to avoid invalid payload counts in source preflight.',
);
assert.equal(
  nativeTextPreflightRow?.sourceLoweringRequestFieldSummary.requiredCount,
  3,
  'Expected native text preflight summary to count SourcePlan wrapper request fields separately from durable domain input.',
);
assert.equal(
  nativeTextPreflightRow?.sourceLoweringRequestFieldSummary.conditionalCount,
  1,
  'Expected native text preflight summary to retain conditional field selection after durable domain input is ready.',
);
assert.ok(
  nativeTextPreflightRow?.sourceLoweringRequestFieldSummary.surfaces.every((surface) =>
    surface.requiredRequestFieldNames == null
    && surface.conditionalRequestFieldNames == null
    && surface.optionalRequestFieldNames == null
  ),
  'Expected compact/default preflight summaries to omit request-field name arrays until detail rows are requested.',
);
const selectorNativeTextPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }],
  },
});
assert.equal(selectorNativeTextPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(selectorNativeTextPreflightAnswer.value.defaultTargetSetUsed, false);
assert.equal(
  selectorNativeTextPreflightAnswer.value.rows[0]?.targetRef.domain,
  AppBuilderOntologyDomain.Control,
  'Expected compact source-lowering preflight selectors to derive the exact target domain from the row kind.',
);
assert.equal(
  selectorNativeTextPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected compact source-lowering preflight selectors to preserve source-lowering readiness.',
);
const mismatchedSelectorPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Input,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
  },
});
assert.equal(mismatchedSelectorPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(mismatchedSelectorPreflightAnswer.value.rows.length, 1);
assert.ok(
  mismatchedSelectorPreflightAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringPreflightIssueKind.TargetSelectorDomainMismatch
    && issue.expectedDomain === AppBuilderOntologyDomain.Control
  ),
  'Expected source-lowering preflight to report compact selector domain mismatch without losing the known target.',
);
const unknownSelectorPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      id: 'not-a-real-control-pattern',
    }],
  },
});
assert.equal(unknownSelectorPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(unknownSelectorPreflightAnswer.value.defaultTargetSetUsed, false);
assert.equal(unknownSelectorPreflightAnswer.value.rows.length, 0);
assert.ok(
  unknownSelectorPreflightAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringPreflightIssueKind.UnknownTarget
    && issue.targetSelector?.id === 'not-a-real-control-pattern'
  ),
  'Expected unknown compact source-lowering preflight selectors to report unknown-target instead of using default target rows.',
);

const missingNativeTextInputPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
  },
});
assert.equal(missingNativeTextInputPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  missingNativeTextInputPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.MissingRequiredInput,
  'Expected native text input preflight without domain fields to report a missing durable input gate.',
);
const continuedMissingNativeTextInputPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetSelectors: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
  },
}, missingNativeTextInputPreflightAnswer);
assert.ok(
  continuedMissingNativeTextInputPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
    && row.targetAppBuilderQuery?.inputContractDetail?.inputContractIds?.includes(AppBuilderInputContractId.DomainModel) === true
    && row.targetAppBuilderQuery.inputContractDetail.inputFacetIds?.includes(AppBuilderInputFacetId.DomainFields) === true
    && row.targetAppBuilderQuery.inputContractDetail.includePayloadSchemas === true
  ) === true,
  'Expected source-lowering preflight continuations to open exact missing durable input schemas even when compact dependency rows are omitted.',
);
assert.equal(
  continuedMissingNativeTextInputPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation
  ),
  false,
  'Expected source-lowering preflight not to offer source invocation while durable required input is missing.',
);

const nativeRangeMissingConstraintPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeRangeInput,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'progress',
          title: 'Progress',
          valueKind: AppBuilderDomainFieldValueKind.Number,
        }],
      }],
    }],
  },
});
assert.equal(nativeRangeMissingConstraintPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  nativeRangeMissingConstraintPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected range preflight to keep the general domain-field input gate ready when the field itself is valid.',
);
assert.equal(
  nativeRangeMissingConstraintPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  false,
  'Expected range preflight to block source-lowering requests until target-specific numeric constraints are supplied.',
);
assert.ok(
  nativeRangeMissingConstraintPreflightAnswer.value.rows[0]?.targetRequirementIssues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement
    && issue.fieldNames?.includes('progress') === true
  ) === true,
  'Expected range preflight to report missing numeric constraints as target-specific source facts.',
);
assert.ok(
  nativeRangeMissingConstraintPreflightAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement
    && issue.fieldNames?.includes('progress') === true
  ),
  'Expected top-level preflight issues to carry the target-specific range constraint canary.',
);
const continuedNativeRangeMissingConstraintPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeRangeInput,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'progress',
          title: 'Progress',
          valueKind: AppBuilderDomainFieldValueKind.Number,
        }],
      }],
    }],
  },
}, nativeRangeMissingConstraintPreflightAnswer);
assert.ok(
  continuedNativeRangeMissingConstraintPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
    && row.targetAppBuilderQuery?.inputContractDetail?.inputContractIds?.includes(AppBuilderInputContractId.DomainModel) === true
    && row.targetAppBuilderQuery.inputContractDetail.inputFacetIds?.includes(AppBuilderInputFacetId.DomainFields) === true
    && row.targetAppBuilderQuery.inputContractDetail.includePayloadSchemas === true
  ) === true,
  'Expected range preflight continuations to open DomainFields payload schemas for target-specific numeric constraints.',
);

const nativeRangeReadyPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeRangeInput,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'progress',
          title: 'Progress',
          valueKind: AppBuilderDomainFieldValueKind.Number,
          numericConstraints: {
            minimum: 0,
            maximum: 100,
            step: 5,
          },
        }],
      }],
    }],
  },
});
assert.equal(nativeRangeReadyPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeRangeReadyPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected range preflight input gate to stay ready when numeric field constraints are supplied.',
);
assert.equal(
  nativeRangeReadyPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected range preflight to allow source-lowering requests when min/max/step facts are supplied.',
);
assert.equal(
  nativeRangeReadyPreflightAnswer.value.rows[0]?.targetRequirementIssues.length,
  0,
  'Expected supplied numeric range constraints to clear target-specific source-fact issues.',
);

const nativeSingleSelectPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeSingleSelect,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'priority',
          title: 'Priority',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
          options: [
            { value: 'low', title: 'Low' },
            { value: 'high', title: 'High' },
          ],
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.DomainValueSets,
        value: [{
          name: 'priorityOptions',
          title: 'Priorities',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
          options: [
            { value: 'low', title: 'Low' },
            { value: 'high', title: 'High' },
          ],
        }],
      }],
    }],
  },
});
assert.equal(nativeSingleSelectPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeSingleSelectPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected native single-select to report app-builder source-lowering implementation once choice slots are spendable.',
);
assert.equal(
  nativeSingleSelectPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected choice-control preflight to require both domain fields and finite value-set facets.',
);
assert.equal(
  nativeSingleSelectPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected valid choice-control input to allow app-builder source-lowering invocation.',
);

const nativeButtonPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeButton,
    }],
  },
});
assert.equal(nativeButtonPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeButtonPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected native button to report app-builder source-lowering implementation once action/event source policy is source-lowering-implemented.',
);
assert.equal(
  nativeButtonPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  false,
  'Expected native button source preflight not to allow source-lowering invocation without action and accessibility inputs.',
);

const inlineNativePolicyPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlRealizationPolicy,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlRealizationPolicyId.InlineNative,
    }],
  },
});
assert.equal(inlineNativePolicyPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  inlineNativePolicyPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.NotImplemented,
  'Expected control-realization policy rows to stay selectable/readable without pretending the policy row is itself a source-lowering target.',
);
assert.equal(
  inlineNativePolicyPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  false,
  'Expected source lowering invocation to remain anchored on concrete control-pattern rows rather than realization-policy rows.',
);

const nativeButtonReadyPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeButton,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'save',
          kind: AppBuilderDomainActionKind.Save,
          scope: AppBuilderDomainActionScope.Form,
          mutatesState: true,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityLabels,
        value: {
          label: 'Save',
        },
      }, {
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Save the current draft.',
        },
      }],
    }],
  },
});
assert.equal(nativeButtonReadyPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeButtonReadyPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected native button preflight to be ready once domain action and accessibility payloads are supplied.',
);
assert.equal(
  nativeButtonReadyPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected native button preflight to allow source invocation with action and accessibility input.',
);

const formMessageReadyPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FormMessage,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Use a short, memorable title.',
          helpId: 'title-help',
        },
      }],
    }],
  },
});
assert.equal(formMessageReadyPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  formMessageReadyPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected form-message to report app-builder source-lowering implementation once accessibility message payloads are spendable.',
);
assert.equal(
  formMessageReadyPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected form-message preflight to be ready once accessibility help/error payloads are supplied.',
);

const fieldGroupReadyPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FieldGroup,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }],
  },
});
assert.equal(fieldGroupReadyPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  fieldGroupReadyPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected field-group to report app-builder source-lowering implementation once wrapper composition is source-lowering-implemented.',
);
assert.equal(
  fieldGroupReadyPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected field-group preflight to be ready with domain field input while style/accessibility remain recommended quality inputs.',
);
assert.equal(
  fieldGroupReadyPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected field-group preflight to allow source invocation once required domain field input is present.',
);

const appShellTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.AppShell,
};
const appShellSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.SourceRoot,
    value: 'sample-app',
  }, {
    inputFacetId: AppBuilderInputFacetId.SourceNaming,
    value: {
      appName: 'Sample App',
    },
  }, {
    inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
    value: {
      resourceCarrier: AppBuilderResourceCarrier.Convention,
    },
  }],
}, {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
    value: AppBuilderConventionPolicy.ConventionsEnabled,
  }],
}];
const appShellWithStatePluginSuppliedInputs = [
  ...appShellSuppliedInputs,
  {
    inputContractId: AppBuilderInputContractId.AureliaPolicy,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
      value: {
        appStateOwnership: AppBuilderAppStateOwnershipMode.StatePluginStore,
      },
    }, {
      inputFacetId: AppBuilderInputFacetId.AureliaPluginPolicy,
      value: {
        packageCapabilities: [AppBuilderPackageCapability.State],
      },
    }],
  },
];
const appShellPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [appShellTargetRef],
    suppliedInputs: appShellSuppliedInputs,
    includeInputDependencies: true,
  },
});
assert.equal(appShellPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  appShellPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected AppShell to report app-builder source-lowering implementation once direct SourcePlan lowering exists.',
);
assert.deepEqual(
  appShellPreflightAnswer.value.rows[0]?.sourceLoweringSurfaceKinds,
  [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
  'Expected AppShell preflight to expose only the direct SourcePlan-preview surface.',
);
assert.equal(
  appShellPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected AppShell preflight to be ready with source root, naming, layout, and convention policy input.',
);
const continuedAppShellPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [appShellTargetRef],
    suppliedInputs: appShellSuppliedInputs,
  },
}, appShellPreflightAnswer);
assert.equal(
  continuedAppShellPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
    && row.targetAppBuilderQuery?.sourceLoweringSourcePlan?.sourceLoweringAppShell?.targetRef?.id === AppBuilderApplicationPatternId.AppShell
  ) === true,
  false,
  'Expected AppShell preflight continuations not to offer direct SourcePlan lowering while SourcePlan placement request fields remain.',
);

const routerBackedListDetailTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.RouterBackedListDetail,
};
const routerBackedListDetailSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
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
      name: 'openTask',
      kind: AppBuilderDomainActionKind.Custom,
      scope: AppBuilderDomainActionScope.Navigation,
      targetEntityName: 'TaskItem',
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }],
}, {
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.SourceRoot,
    value: 'sample-router-app',
  }, {
    inputFacetId: AppBuilderInputFacetId.SourceNaming,
    value: {
      appName: 'Task Router',
      sourcePatternParameterValues: [{
        key: SourcePatternParameterKey.ListRoutePath,
        value: 'tasks',
      }, {
        key: SourcePatternParameterKey.DetailRouteParameter,
        value: 'taskId',
      }],
    },
  }, {
    inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
    value: {
      resourceCarrier: AppBuilderResourceCarrier.Decorator,
    },
  }],
}, {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
    value: AppBuilderConventionPolicy.ExplicitResourceDeclarations,
  }, {
    inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
    value: {
      routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
      areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
    },
  }, {
    inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
    value: {
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
    },
  }],
}, {
  inputContractId: AppBuilderInputContractId.SeedData,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
    value: [{
      id: 1,
      title: 'First task',
      done: false,
    }],
  }],
}];
const routerBackedListDetailMissingIdentityKindSuppliedInputs = [{
  ...routerBackedListDetailSuppliedInputs[0],
  facetPayloads: routerBackedListDetailSuppliedInputs[0].facetPayloads.map((payload) =>
    payload.inputFacetId === AppBuilderInputFacetId.DomainEntities
      ? {
          ...payload,
          value: {
            entityTitle: 'Task',
            entityTypeName: 'TaskItem',
            collectionMemberName: 'taskItems',
            identityMemberName: 'id',
          },
        }
      : payload
  ),
}, ...routerBackedListDetailSuppliedInputs.slice(1)];
const routerBackedListDetailPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [routerBackedListDetailTargetRef],
    suppliedInputs: routerBackedListDetailSuppliedInputs,
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(routerBackedListDetailPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  routerBackedListDetailPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected RouterBackedListDetail to report app-builder source-lowering implementation once direct SourcePlan lowering exists.',
);
assert.deepEqual(
  routerBackedListDetailPreflightAnswer.value.rows[0]?.sourceLoweringSurfaceKinds,
  [AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview],
  'Expected RouterBackedListDetail preflight to expose only the direct SourcePlan-preview surface.',
);
assert.deepEqual(
  routerBackedListDetailPreflightAnswer.value.rows[0]?.sourceLoweringRequestFields.map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.RootDir,
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringRouterBackedListDetail,
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailPrimaryEntityName,
    AppBuilderSourceLoweringRequestFieldId.ActionName,
    AppBuilderSourceLoweringRequestFieldId.LinkText,
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailCreateForm,
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollection,
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailDetailRelatedCollections,
    AppBuilderSourceLoweringRequestFieldId.FieldNames,
    AppBuilderSourceLoweringRequestFieldId.SubmitButtonText,
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionSourceTargetPath,
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionClassName,
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionLoadMethodName,
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFindMethodName,
    AppBuilderSourceLoweringRequestFieldId.RouterBackedListDetailServiceCollectionCreateMethodName,
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethods,
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethods,
    AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryControls,
  ],
  'Expected RouterBackedListDetail SourcePlan preview to disclose direct root placement, the router-backed envelope, optional row-navigation fields, and the optional create-form/service-boundary envelope fields.',
);
assert.equal(
  routerBackedListDetailPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected RouterBackedListDetail preflight to be ready with domain, placement, router, state, convention, and seed input.',
);
const routerBackedListDetailMissingIdentityKindPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [routerBackedListDetailTargetRef],
    suppliedInputs: routerBackedListDetailMissingIdentityKindSuppliedInputs,
    includeInputDependencies: true,
  },
});
assert.equal(routerBackedListDetailMissingIdentityKindPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  routerBackedListDetailMissingIdentityKindPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  false,
  'Expected RouterBackedListDetail preflight to reject domain identity input before source lowering can infer from seed records.',
);
assert.ok(
  routerBackedListDetailMissingIdentityKindPreflightAnswer.value.rows[0]?.targetRequirementIssues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement
    && issue.inputFacetId === AppBuilderInputFacetId.DomainEntities
    && issue.summary.includes('identityValueKind')
  ) === true,
  'Expected missing identity value kind to surface as a DomainEntities target-payload requirement.',
);
const continuedRouterBackedListDetailPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [routerBackedListDetailTargetRef],
    suppliedInputs: routerBackedListDetailSuppliedInputs,
  },
}, routerBackedListDetailPreflightAnswer);
assert.equal(
  continuedRouterBackedListDetailPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
    && row.targetAppBuilderQuery?.sourceLoweringSourcePlan?.sourceLoweringRouterBackedListDetail?.targetRef?.id === AppBuilderApplicationPatternId.RouterBackedListDetail
  ) === true,
  false,
  'Expected RouterBackedListDetail preflight continuations not to offer direct SourcePlan lowering while SourcePlan placement request fields remain.',
);
const diStateClassTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.DiStateClass,
};
const diStateClassSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    },
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }],
}, {
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.SourceRoot,
    value: 'sample-state-app',
  }, {
    inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
    value: 'src/task-state.ts',
  }],
}, {
  inputContractId: AppBuilderInputContractId.SeedData,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
    value: [{
      id: 1,
      title: 'First task',
      done: false,
    }],
  }],
}];
const diStateClassPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [diStateClassTargetRef],
    suppliedInputs: diStateClassSuppliedInputs,
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(diStateClassPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  diStateClassPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected DiStateClass to report app-builder source-lowering implementation once direct SourcePlan lowering exists.',
);
assert.deepEqual(
  diStateClassPreflightAnswer.value.rows[0]?.sourceLoweringRequestFields.map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.RootDir,
    AppBuilderSourceLoweringRequestFieldId.SourceTargetPath,
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringDiStateClass,
  ],
  'Expected DiStateClass SourcePlan preview to require root placement, source target path, and the DI state-class envelope.',
);
assert.equal(
  diStateClassPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected DiStateClass preflight to be ready with domain, source root, and source target path input.',
);
const continuedDiStateClassPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [diStateClassTargetRef],
    suppliedInputs: diStateClassSuppliedInputs,
  },
}, diStateClassPreflightAnswer);
assert.equal(
  continuedDiStateClassPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
    && row.targetAppBuilderQuery?.sourceLoweringSourcePlan?.sourceLoweringDiStateClass?.targetRef?.id === AppBuilderApplicationPatternId.DiStateClass
  ) === true,
  false,
  'Expected DiStateClass preflight continuations not to offer direct SourcePlan lowering while SourcePlan placement request fields remain.',
);
const localViewModelStateTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.LocalViewModelState,
};
const localViewModelStateSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
      required: true,
    }, {
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }, {
      name: 'priority',
      title: 'Priority',
      valueKind: AppBuilderDomainFieldValueKind.Choice,
      options: [
        { value: 'low', title: 'Low' },
        { value: 'normal', title: 'Normal' },
      ],
    }],
  }],
}, {
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.SourceRoot,
    value: 'sample-local-state-app',
  }, {
    inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
    value: 'src/local-state.ts',
  }, {
    inputFacetId: AppBuilderInputFacetId.SourceNaming,
    value: { baseName: 'Local State' },
  }],
}, {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
    value: {
      localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
    },
  }],
}];
const localViewModelStatePreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [localViewModelStateTargetRef],
    suppliedInputs: localViewModelStateSuppliedInputs,
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(localViewModelStatePreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  localViewModelStatePreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected LocalViewModelState to report app-builder source-lowering implementation once direct SourcePlan lowering exists.',
);
assert.deepEqual(
  localViewModelStatePreflightAnswer.value.rows[0]?.sourceLoweringRequestFields.map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.RootDir,
    AppBuilderSourceLoweringRequestFieldId.SourceTargetPath,
    AppBuilderSourceLoweringRequestFieldId.SourceLoweringLocalViewModelState,
  ],
  'Expected LocalViewModelState SourcePlan preview to require root placement, source target path, and the local view-model state envelope.',
);
assert.equal(
  localViewModelStatePreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected LocalViewModelState preflight to be ready with local fields, source root, source target path, base name, and local state policy input.',
);
const localViewModelStateSuppliedInputsWithoutStatePolicy = localViewModelStateSuppliedInputs.filter((input) =>
  input.inputContractId !== AppBuilderInputContractId.AureliaPolicy
);
const missingLocalViewModelStatePolicyPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [localViewModelStateTargetRef],
    suppliedInputs: localViewModelStateSuppliedInputsWithoutStatePolicy,
    includeInputDependencies: true,
  },
});
assert.equal(missingLocalViewModelStatePolicyPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  missingLocalViewModelStatePolicyPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  false,
  'Expected LocalViewModelState preflight to reject missing explicit local state policy input.',
);
assert.ok(
  missingLocalViewModelStatePolicyPreflightAnswer.value.rows[0]?.inputReadiness.missingRequiredInputFacetIds.includes(AppBuilderInputFacetId.AureliaStatePolicy),
  'Expected LocalViewModelState preflight to name missing AureliaStatePolicy input when local state policy is absent.',
);
const continuedLocalViewModelStatePreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [localViewModelStateTargetRef],
    suppliedInputs: localViewModelStateSuppliedInputs,
  },
}, localViewModelStatePreflightAnswer);
assert.equal(
  continuedLocalViewModelStatePreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
    && row.targetAppBuilderQuery?.sourceLoweringSourcePlan?.sourceLoweringLocalViewModelState?.targetRef?.id === AppBuilderApplicationPatternId.LocalViewModelState
  ) === true,
  false,
  'Expected LocalViewModelState preflight continuations not to offer direct SourcePlan lowering while SourcePlan placement request fields remain.',
);
const nativeSubmitFormTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.NativeSubmitForm,
};
const appSectionTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.AppSection,
};
const nativeSubmitFormSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    value: [{
      name: 'create',
      kind: AppBuilderDomainActionKind.Create,
      scope: AppBuilderDomainActionScope.Form,
      mutatesState: true,
    }],
  }],
}];
const collectionListTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.CollectionList,
};
const collectionCardTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.CollectionCard,
};
const collectionTableTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.CollectionTable,
};
const loadingEmptyErrorTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.LoadingEmptyErrorState,
};
const collectionProjectionSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }],
}, {
  inputContractId: AppBuilderInputContractId.CollectionProjection,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.CollectionDisplayFields,
    value: [{
      fieldName: 'title',
      role: AppBuilderCollectionDisplayRole.Title,
      label: 'Task',
    }, {
      fieldName: 'done',
      role: AppBuilderCollectionDisplayRole.Boolean,
      label: 'Done',
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
    value: [{
      fieldName: 'title',
      header: 'Task',
      displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
    }, {
      fieldName: 'done',
      header: 'Done',
      displayKind: AppBuilderCollectionTableColumnDisplayKind.Boolean,
    }],
  }],
}];
const collectionListPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionListTargetRef],
    suppliedInputs: collectionProjectionSuppliedInputs,
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(collectionListPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  collectionListPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected Collection List to report source-lowering support once fragment composition is registered.',
);
assert.equal(
  collectionListPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected Collection List preflight to be ready with domain fields and collection display-field input.',
);
assert.deepEqual(
  collectionListPreflightAnswer.value.rows[0]?.sourceLoweringRequestFields
    .filter((field) =>
      field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.FragmentComposition
      && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required
    )
    .map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.CollectionExpression,
    AppBuilderSourceLoweringRequestFieldId.ItemLocalName,
  ],
  'Expected Collection List preflight to disclose explicit collectionExpression and itemLocalName request fields.',
);
const collectionTablePreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionTableTargetRef],
    suppliedInputs: collectionProjectionSuppliedInputs,
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(collectionTablePreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  collectionTablePreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected Collection Table to report source-lowering support once fragment composition is registered.',
);
assert.equal(
  collectionTablePreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected Collection Table preflight to be ready with display and table column input without forcing query features.',
);
assert.equal(
  collectionTablePreflightAnswer.value.rows[0]?.policySatisfaction.state,
  AppBuilderPolicySatisfactionState.Satisfied,
  'Expected exact target selection to satisfy contextual source-lowering policy for Collection Table.',
);
assert.equal(
  collectionTablePreflightAnswer.value.policySatisfactionSatisfiedCount,
  1,
  'Expected exact target selection to count the contextual Collection Table policy gate as satisfied.',
);
assert.equal(
  collectionTablePreflightAnswer.value.policySatisfactionMissingCount,
  0,
  'Expected exact target selection not to leave contextual policy gates missing.',
);
assert.equal(
  collectionTablePreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected explicitly selected Collection Table preflight to remain source-lowering-ready when payloads are ready.',
);
assert.equal(
  collectionTablePreflightAnswer.value.rows[0]?.inputReadiness.missingRequiredInputFacetIds.includes(AppBuilderInputFacetId.CollectionQueryFeatures),
  false,
  'Expected Collection Table preflight not to require query-feature input for basic table source projection.',
);
const collectionTableUnsupportedQueryPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionTableTargetRef],
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.LocalFiltering,
          fieldNames: ['title'],
          initiallyEnabled: true,
        }],
      }],
    }],
    includeInputDependencies: true,
  },
});
assert.equal(collectionTableUnsupportedQueryPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  collectionTableUnsupportedQueryPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  false,
  'Expected Collection Table preflight to block query features that the table projection lowerer cannot spend.',
);
assert.ok(
  collectionTableUnsupportedQueryPreflightAnswer.value.rows[0]?.targetRequirementIssues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement
    && issue.collectionFeatureIds?.includes(AppBuilderCollectionFeatureId.LocalFiltering) === true
  ) === true,
  'Expected unsupported collection query features to surface as target-specific preflight requirements.',
);
const continuedCollectionTableUnsupportedQueryPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionTableTargetRef],
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.LocalFiltering,
          fieldNames: ['title'],
          initiallyEnabled: true,
        }],
      }],
    }],
  },
}, collectionTableUnsupportedQueryPreflightAnswer);
assert.ok(
  continuedCollectionTableUnsupportedQueryPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
    && row.targetAppBuilderQuery?.inputContractDetail?.inputContractIds?.includes(AppBuilderInputContractId.CollectionProjection) === true
    && row.targetAppBuilderQuery.inputContractDetail.inputFacetIds?.includes(AppBuilderInputFacetId.CollectionQueryFeatures) === true
    && row.targetAppBuilderQuery.inputContractDetail.inputFacetIds?.includes(AppBuilderInputFacetId.CollectionTableColumns) === true
  ) === true,
  'Expected collection-table preflight continuations to open query-feature and table-column payload schemas for target-specific blockers.',
);
const collectionTableSortingWithoutColumnPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionTableTargetRef],
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.LocalSorting,
          fieldNames: ['title'],
          initiallyEnabled: true,
        }],
      }],
    }],
  },
});
assert.equal(collectionTableSortingWithoutColumnPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  collectionTableSortingWithoutColumnPreflightAnswer.value.rows[0]?.targetRequirementIssues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement
    && issue.collectionFeatureIds?.includes(AppBuilderCollectionFeatureId.LocalSorting) === true
  ) === true,
  'Expected local sorting feature selection to require at least one sortable field-backed table column.',
);
const continuedCollectionTableSortingWithoutColumnPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionTableTargetRef],
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.LocalSorting,
          fieldNames: ['title'],
          initiallyEnabled: true,
        }],
      }],
    }],
  },
}, collectionTableSortingWithoutColumnPreflightAnswer);
assert.ok(
  continuedCollectionTableSortingWithoutColumnPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
    && row.targetAppBuilderQuery?.inputContractDetail?.inputContractIds?.includes(AppBuilderInputContractId.CollectionProjection) === true
    && row.targetAppBuilderQuery.inputContractDetail.inputFacetIds?.includes(AppBuilderInputFacetId.CollectionQueryFeatures) === true
    && row.targetAppBuilderQuery.inputContractDetail.inputFacetIds?.includes(AppBuilderInputFacetId.CollectionTableColumns) === true
  ) === true,
  'Expected collection-table sorting blockers to expose both query-feature and table-column payload schemas.',
);
assert.ok(
  collectionTablePreflightAnswer.value.rows[0]?.sourceLoweringRequestFields.some((field) =>
    field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.FragmentComposition
    && field.fieldId === AppBuilderSourceLoweringRequestFieldId.ActionHandlerExpressions
    && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional
  ) === true,
  'Expected Collection Table preflight to disclose conditional actionHandlerExpressions for unsafe row actions.',
);
assert.ok(
  collectionTablePreflightAnswer.value.rows[0]?.sourceLoweringRequestFields.some((field) =>
    field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.FragmentComposition
    && field.fieldId === AppBuilderSourceLoweringRequestFieldId.SortHandlerExpressions
    && field.requestFieldName === 'sortHandlerExpressions'
    && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional
  ) === true,
  'Expected Collection Table preflight to disclose conditional sortHandlerExpressions for sortable field columns.',
);
const missingCollectionExpressionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionListTargetRef,
    suppliedInputs: collectionProjectionSuppliedInputs,
  },
});
assert.equal(missingCollectionExpressionAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingCollectionExpressionAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingCollectionExpression
  )
  && missingCollectionExpressionAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingItemLocalName
  ),
  'Expected collection source-lowering composition to require explicit collectionExpression and itemLocalName.',
);
const collectionListCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionListTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionList,
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.VisualStyleInput,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
        value: [{
          target: AppBuilderSourceLoweringVisualHookTarget.Collection,
          classTokens: ['collection'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.CollectionItem,
          classTokens: ['collection__item'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.CollectionField,
          fieldName: 'done',
          classTokens: ['collection__field'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
          classTokens: ['collection__empty'],
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
    emptyStateText: 'No tasks',
    emptyStateConditionExpression: 'tasks.length === 0',
  },
});
assert.equal(collectionListCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionListCompositionAnswer.value.compositionKind, AppBuilderSourceLoweringCompositionKind.CollectionList);
assert.equal(collectionListCompositionAnswer.value.collectionExpression, 'tasks');
assert.equal(collectionListCompositionAnswer.value.itemLocalName, 'task');
assert.equal(collectionListCompositionAnswer.value.selectedCollectionDisplayFields.length, 2);
assert.equal(collectionListCompositionAnswer.value.fragments.length, 2);
assert.match(
  collectionListCompositionAnswer.value.fragments.map((fragment) => fragment.text).join('\n'),
  /<p if\.bind="tasks\.length === 0" class="collection__empty">No tasks<\/p>[\s\S]*<ul else class="collection">[\s\S]*<li repeat\.for="task of tasks" class="collection__item">[\s\S]*<strong>\$\{task\.title\}<\/strong>[\s\S]*<span class="collection__field">[\s\S]*Done:[\s\S]*<input type="checkbox" checked\.to-view="task\.done" disabled aria-label="Done">[\s\S]*<\/span>/,
  'Expected Collection List composition to spend explicit repeat, interpolation, empty-state/else branch, visual hook, and read-only boolean display inputs.',
);
assert.ok(
  collectionListCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.PartSourceInvocation
  )
  && collectionListCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.SourceLoweringComposition
  ),
  'Expected Collection List composition to preserve both delegated part-source and top-level composition provenance.',
);
const invalidCollectionEmptyConditionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionListTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionList,
    suppliedInputs: collectionProjectionSuppliedInputs,
    collectionExpression: 'tasks',
    itemLocalName: 'task',
    emptyStateText: 'No tasks',
    emptyStateConditionExpression: 'tasks.',
  },
});
assert.equal(invalidCollectionEmptyConditionAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  invalidCollectionEmptyConditionAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.StructuralPartLoweringIssue
    && issue.structuralPartId === AppBuilderStructuralPartId.Conditional
  ),
  'Expected malformed collection empty-state conditions to bridge structural-part lowering issues instead of throwing.',
);
const collectionCardPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionCardTargetRef],
    suppliedInputs: collectionProjectionSuppliedInputs,
    includeInputDependencies: true,
  },
});
assert.equal(collectionCardPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  collectionCardPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected Collection Card to report source-lowering support once fragment composition is registered.',
);
assert.equal(
  collectionCardPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected Collection Card preflight to be ready with domain fields and collection display-field input.',
);
assert.equal(
  collectionCardPreflightAnswer.value.rows[0]?.inputReadiness.missingRecommendedCount,
  1,
  'Expected Collection Card preflight to keep visual hooks recommended rather than required.',
);
const collectionCardCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionCardTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionCard,
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.VisualStyleInput,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
        value: [{
          target: AppBuilderSourceLoweringVisualHookTarget.Collection,
          classTokens: ['cards'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.CollectionItem,
          classTokens: ['card'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.CollectionField,
          fieldName: 'done',
          classTokens: ['card__field'],
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
    emptyStateText: 'No tasks',
    emptyStateConditionExpression: 'tasks.length === 0',
  },
});
assert.equal(collectionCardCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionCardCompositionAnswer.value.compositionKind, AppBuilderSourceLoweringCompositionKind.CollectionCard);
assert.equal(collectionCardCompositionAnswer.value.selectedCollectionDisplayFields.length, 2);
assert.match(
  collectionCardCompositionAnswer.value.fragments.map((fragment) => fragment.text).join('\n'),
  /<p if\.bind="tasks\.length === 0">No tasks<\/p>[\s\S]*<section else class="cards">[\s\S]*<article repeat\.for="task of tasks" class="card">[\s\S]*<h3>\$\{task\.title\}<\/h3>[\s\S]*<p class="card__field">[\s\S]*Done:[\s\S]*<input type="checkbox" checked\.to-view="task\.done" disabled aria-label="Done">[\s\S]*<\/p>/,
  'Expected Collection Card composition to spend explicit repeat, projection, empty-state/else branch, visual hook, and read-only boolean display inputs without inventing CSS.',
);
assert.ok(
  collectionCardCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.PartSourceInvocation
  )
  && collectionCardCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.SourceLoweringComposition
  ),
  'Expected Collection Card composition to preserve both delegated part-source and top-level composition provenance.',
);
const collectionCardSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    includeSourcePlanWitnessRows: true,
    includeControlUseInventoryRows: true,
    rootDir: 'sample-app',
    templatePath: 'src/task-cards.html',
    sourceLoweringComposition: {
      targetRef: collectionCardTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionCard,
      suppliedInputs: collectionProjectionSuppliedInputs,
      collectionExpression: 'tasks',
      itemLocalName: 'task',
    },
  },
});
assert.equal(collectionCardSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionCardSourcePlanAnswer.value.sourcePlan?.files[0]?.path, 'src/task-cards.html');
assert.match(
  collectionCardSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /<section>[\s\S]*<article repeat\.for="task of tasks">/,
  'Expected Collection Card composition to wrap in a SourcePlan preview when explicit placement is supplied.',
);
const collectionTableCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.VisualStyleInput,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
        value: [{
          target: AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
          classTokens: ['table'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableCell,
          fieldName: 'title',
          classTokens: ['table__cell'],
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
    emptyStateText: 'No tasks',
    emptyStateConditionExpression: 'tasks.length === 0',
  },
});
assert.equal(collectionTableCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionTableCompositionAnswer.value.compositionKind, AppBuilderSourceLoweringCompositionKind.CollectionTable);
assert.equal(collectionTableCompositionAnswer.value.selectedCollectionTableColumns.length, 2);
assert.match(
  collectionTableCompositionAnswer.value.fragments.map((fragment) => fragment.text).join('\n'),
  /<p if\.bind="tasks\.length === 0">No tasks<\/p>[\s\S]*<table else class="table">[\s\S]*<th>Task<\/th>[\s\S]*<th>Done<\/th>[\s\S]*<tr repeat\.for="task of tasks">[\s\S]*<td class="table__cell">\$\{task\.title\}<\/td>[\s\S]*<td>[\s\S]*<input type="checkbox" checked\.to-view="task\.done" disabled aria-label="Done">[\s\S]*<\/td>/,
  'Expected Collection Table composition to lower explicit columns through empty-state/else branching, repeat, interpolation, and read-only boolean display source fragments.',
);
const collectionTableActionSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    value: [{
      name: 'complete',
      kind: AppBuilderDomainActionKind.Complete,
      scope: AppBuilderDomainActionScope.Entity,
      mutatesState: true,
    }],
  }],
}, {
  inputContractId: AppBuilderInputContractId.CollectionProjection,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
    value: [{
      fieldName: 'title',
      header: 'Task',
      displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
    }, {
      actionName: 'complete',
      header: 'Complete',
      displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
    }],
  }],
}, {
  inputContractId: AppBuilderInputContractId.VisualStyleInput,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
    value: [{
      target: AppBuilderSourceLoweringVisualHookTarget.CollectionTableCell,
      actionName: 'complete',
      classTokens: ['table__action-cell'],
    }, {
      target: AppBuilderSourceLoweringVisualHookTarget.Button,
      actionName: 'complete',
      classTokens: ['button', 'button--row'],
    }],
  }],
}];
const collectionTableActionCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: collectionTableActionSuppliedInputs,
    collectionExpression: 'tasks',
    itemLocalName: 'task',
  },
});
assert.equal(collectionTableActionCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionTableActionCompositionAnswer.value.selectedCollectionTableColumns.length, 2);
const selectedActionColumn = collectionTableActionCompositionAnswer.value.selectedCollectionTableColumns.find((column) =>
  column.action?.name === 'complete'
);
assert.equal(
  selectedActionColumn?.actionInvocation?.handlerExpression,
  'complete(task)',
  'Expected collection table row actions to derive a row-context handler call when the action name is TypeScript-safe.',
);
assert.match(
  collectionTableActionCompositionAnswer.value.fragments[0]?.text ?? '',
  /<th>Complete<\/th>[\s\S]*<td class="table__action-cell">[\s\S]*<button type="button" click\.trigger="complete\(task\)" class="button button--row">Complete<\/button>[\s\S]*<\/td>/,
  'Expected Collection Table action columns to lower through a native button nested in the row cell with action-scoped visual hooks.',
);
assert.ok(
  collectionTableActionCompositionAnswer.value.sourceLoweringTargetRefs.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
    && targetRef.id === AppBuilderControlPatternId.NativeButton
  ),
  'Expected Collection Table action columns to disclose the nested native-button ontology target.',
);
assert.ok(
  collectionTableActionCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation
    && fragment.origin.targetId === AppBuilderControlPatternId.NativeButton
  )
  && collectionTableActionCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.PartSourceInvocation
    && fragment.origin.partId === AppBuilderBindingPartId.EventListener
  ),
  'Expected Collection Table action columns to preserve native-button invocation and delegated event-listener provenance.',
);
assert.ok(
  collectionTableActionCompositionAnswer.value.controlUseInventoryRows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.actionName === 'complete'
    && row.actionChannelKind === AppBuilderControlUseActionChannelKind.DirectControlEvent
  ),
  'Expected Collection Table action columns to contribute native-button control-use rows from nested action invocations.',
);
const collectionTableRelationshipCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainEntities,
        value: [{
          entityTitle: 'Task',
          entityTypeName: 'Task',
          collectionMemberName: 'tasks',
          identityMemberName: 'id',
          identityValueKind: AppBuilderDomainIdentityValueKind.Number,
        }, {
          entityTitle: 'Checkpoint',
          entityTypeName: 'Checkpoint',
          collectionMemberName: 'checkpoints',
          identityMemberName: 'id',
          identityValueKind: AppBuilderDomainIdentityValueKind.Number,
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
          entityName: 'Task',
        }, {
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
          entityName: 'Checkpoint',
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.DomainRelationships,
        value: [{
          name: 'checkpoints',
          kind: AppBuilderDomainRelationshipKind.OwnsMany,
          fromEntityName: 'Task',
          toEntityName: 'Checkpoint',
          localFieldName: 'checkpoints',
          displayFieldName: 'title',
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        value: [{
          fieldName: 'title',
          header: 'Task',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
        }, {
          relationshipName: 'checkpoints',
          header: 'Checkpoints',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Relation,
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
  },
});
assert.equal(collectionTableRelationshipCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionTableRelationshipCompositionAnswer.value.selectedCollectionTableColumns.length, 2);
const selectedRelationshipColumn = collectionTableRelationshipCompositionAnswer.value.selectedCollectionTableColumns.find((column) =>
  column.relationship?.name === 'checkpoints'
);
assert.equal(
  selectedRelationshipColumn?.bindingExpression,
  'checkpointsLabelForTask(task)',
  'Expected relationship-backed Collection Table columns to derive the generated local relationship label helper call.',
);
assert.match(
  collectionTableRelationshipCompositionAnswer.value.fragments[0]?.text ?? '',
  /<th>Checkpoints<\/th>[\s\S]*<td>\$\{checkpointsLabelForTask\(task\)\}<\/td>/,
  'Expected relationship-backed Collection Table columns to lower as relation display cells instead of field-backed binding overrides.',
);
const sortableTableCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [{
      ...collectionTableActionSuppliedInputs[0],
    }, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        value: [{
          fieldName: 'title',
          header: 'Task',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
          sortable: true,
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
    sortHandlerExpressions: [{ fieldName: 'title', handlerExpression: 'sortTitle()' }],
  },
});
assert.equal(sortableTableCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  sortableTableCompositionAnswer.value.selectedCollectionTableColumns[0]?.sortHandlerExpression,
  'sortTitle()',
  'Expected sortable Collection Table columns to spend the explicit sort handler expression.',
);
assert.match(
  sortableTableCompositionAnswer.value.fragments[0]?.text ?? '',
  /<th>[\s\S]*<button type="button" click\.trigger="sortTitle\(\)">Task<\/button>[\s\S]*<\/th>/,
  'Expected sortable Collection Table headers to lower through a native button with delegated click event source.',
);
assert.ok(
  sortableTableCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.PartSourceInvocation
    && fragment.origin.partId === AppBuilderBindingPartId.EventListener
  ),
  'Expected sortable Collection Table headers to preserve delegated event-listener provenance.',
);
assert.ok(
  sortableTableCompositionAnswer.value.controlUseInventoryRows.some((row) =>
    row.sourceReference.sourceKind === AppBuilderControlUseInventorySourceKind.SourceLoweringComposition
    && row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.fieldName === 'title'
    && row.handlerExpression === 'sortTitle()'
    && row.buttonType === AppBuilderSourceLoweringButtonType.Button
  ),
  'Expected sortable Collection Table headers to emit composition-owned native-button control-use rows.',
);
const missingSortableTableHandlerAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [{
      ...collectionTableActionSuppliedInputs[0],
    }, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        value: [{
          fieldName: 'title',
          header: 'Sortable Task',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
          sortable: true,
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
  },
});
assert.equal(missingSortableTableHandlerAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingSortableTableHandlerAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingSortHandlerExpression
  ),
  'Expected sortable Collection Table columns to require explicit sortHandlerExpressions instead of inventing sort state or method names.',
);
const invalidTableColumnAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [{
      ...collectionTableActionSuppliedInputs[0],
    }, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        value: [{
          fieldName: 'title',
          header: 'Task',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Action,
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
  },
});
assert.equal(invalidTableColumnAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  invalidTableColumnAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.InvalidCollectionTableColumn
  ),
  'Expected Collection Table source lowering to reject action displayKind on field columns.',
);
const filterableTableColumnAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [{
      ...collectionTableActionSuppliedInputs[0],
    }, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        value: [{
          fieldName: 'title',
          header: 'Filterable Task',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
          filterable: true,
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
  },
});
assert.equal(filterableTableColumnAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  filterableTableColumnAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingFilterBindingExpression
    && issue.fieldNames?.includes('title') === true
  ),
  'Expected filterable Collection Table columns to require an explicit filterBindingExpressions row before lowering filter controls.',
);
const filterableTableColumnWithBindingAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [{
      ...collectionTableActionSuppliedInputs[0],
    }, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionTableColumns,
        value: [{
          fieldName: 'title',
          header: 'Filterable Task',
          displayKind: AppBuilderCollectionTableColumnDisplayKind.Text,
          filterable: true,
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.LocalFiltering,
          fieldNames: ['title'],
          initiallyEnabled: true,
          summary: 'Caller wants local title filtering.',
        }],
      }],
    }],
    collectionExpression: 'filteredTasks',
    itemLocalName: 'task',
    filterBindingExpressions: [{
      fieldName: 'title',
      bindingExpression: 'titleFilter',
    }],
  },
});
assert.equal(filterableTableColumnWithBindingAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  filterableTableColumnWithBindingAnswer.value.controlUseInventoryRows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeSearchInput
    && row.bindingExpression === 'titleFilter'
  ),
  'Expected local filtering Collection Table lowering to emit a native search-input control-use row for the explicit filter binding.',
);
const missingPaginationPageSizeCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.LocalPagination,
          initiallyEnabled: true,
          summary: 'Caller wants local pagination controls.',
        }],
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
  },
});
assert.equal(missingPaginationPageSizeCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingPaginationPageSizeCompositionAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.TargetRequirementIssue
    && issue.sourceLoweringPreflightIssue?.collectionFeatureIds?.includes(AppBuilderCollectionFeatureId.LocalPagination) === true
  ),
  'Expected local pagination CollectionQueryFeatures payloads without pageSize to produce a facet-level issue instead of inventing page size.',
);
const paginatedTableCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.LocalPagination,
          pageSize: 2,
          initiallyEnabled: true,
          summary: 'Caller wants local pagination controls.',
        }],
      }],
    }],
    collectionExpression: 'pagedTasks',
    itemLocalName: 'task',
    paginationPreviousHandlerExpression: 'previousTasksPage()',
    paginationNextHandlerExpression: 'nextTasksPage()',
    paginationCurrentPageExpression: 'tasksPage',
    paginationPageCountExpression: 'tasksPageCount',
    paginationPreviousButtonText: 'Previous',
    paginationNextButtonText: 'Next',
  },
});
assert.equal(paginatedTableCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.match(
  paginatedTableCompositionAnswer.value.fragments.map((fragment) => fragment.text).join('\n'),
  /<nav aria-label="Pagination">[\s\S]*click\.trigger="previousTasksPage\(\)"[\s\S]*Page \$\{tasksPage\} of \$\{tasksPageCount\}[\s\S]*click\.trigger="nextTasksPage\(\)"[\s\S]*<\/nav>/,
  'Expected local pagination Collection Table lowering to emit explicit previous/next controls and status text.',
);
assert.ok(
  paginatedTableCompositionAnswer.value.controlUseInventoryRows.filter((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && (row.handlerExpression === 'previousTasksPage()' || row.handlerExpression === 'nextTasksPage()')
  ).length === 2,
  'Expected local pagination Collection Table lowering to emit two native-button control-use rows.',
);
const missingRowSelectionIdentityPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionTableTargetRef],
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.RowSelection,
          initiallyEnabled: true,
          summary: 'Caller wants local row selection.',
        }],
      }],
    }],
  },
});
assert.equal(missingRowSelectionIdentityPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingRowSelectionIdentityPreflightAnswer.value.rows[0]?.targetRequirementIssues.some((issue) =>
    issue.inputFacetId === AppBuilderInputFacetId.CollectionIdentityPolicy
    && issue.collectionFeatureIds?.includes(AppBuilderCollectionFeatureId.RowSelection) === true
  ) === true,
  'Expected local row selection to require explicit CollectionIdentityPolicy rather than inferring a stable key.',
);
const rowSelectionTableCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.RowSelection,
          initiallyEnabled: true,
          summary: 'Caller wants local row selection.',
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
        value: {
          mode: AppBuilderCollectionIdentityMode.ScalarField,
          requiredBy: [AppBuilderCollectionIdentityUse.RowSelection],
          fieldName: 'id',
        },
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
    rowSelectionCheckedExpression: 'selectedTaskIds.includes(task.id)',
    rowSelectionToggleHandlerExpression: 'toggleTaskSelection(task)',
    rowSelectionColumnHeaderText: 'Select',
    rowSelectionCheckboxLabelExpression: "'Select ' + task.title",
  },
});
assert.equal(rowSelectionTableCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.match(
  rowSelectionTableCompositionAnswer.value.fragments.map((fragment) => fragment.text).join('\n'),
  /<th>Select<\/th>[\s\S]*<input type="checkbox" checked\.to-view="selectedTaskIds\.includes\(task\.id\)" change\.trigger="toggleTaskSelection\(task\)" aria-label\.bind="'Select ' \+ task\.title">/,
  'Expected local row selection Collection Table lowering to emit explicit checked/toggle/label expressions.',
);
assert.ok(
  rowSelectionTableCompositionAnswer.value.controlUseInventoryRows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeBooleanCheckbox
    && row.bindingExpression === 'selectedTaskIds.includes(task.id)'
    && row.handlerExpression === 'toggleTaskSelection(task)'
    && row.eventName === 'change'
  ),
  'Expected local row selection Collection Table lowering to emit a boolean checkbox control-use row.',
);
const missingBatchActionIdentityPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [collectionTableTargetRef],
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.RowSelection,
          initiallyEnabled: true,
          summary: 'Caller wants local row selection.',
        }, {
          featureId: AppBuilderCollectionFeatureId.BatchActions,
          initiallyEnabled: true,
          summary: 'Caller wants local batch actions.',
        }],
      }],
    }],
  },
});
assert.equal(missingBatchActionIdentityPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingBatchActionIdentityPreflightAnswer.value.rows[0]?.targetRequirementIssues.some((issue) =>
    issue.inputFacetId === AppBuilderInputFacetId.CollectionIdentityPolicy
    && issue.collectionFeatureIds?.includes(AppBuilderCollectionFeatureId.BatchActions) === true
  ) === true,
  'Expected local batch actions to require explicit batch-action identity policy rather than inheriting row-selection intent silently.',
);
const batchActionTableCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    suppliedInputs: [...collectionProjectionSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'deleteSelectedTasks',
          kind: AppBuilderDomainActionKind.Delete,
          scope: AppBuilderDomainActionScope.Collection,
          targetEntityName: 'Task',
          mutatesState: true,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.CollectionProjection,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.CollectionQueryFeatures,
        value: [{
          featureId: AppBuilderCollectionFeatureId.RowSelection,
          initiallyEnabled: true,
          summary: 'Caller wants local row selection.',
        }, {
          featureId: AppBuilderCollectionFeatureId.BatchActions,
          initiallyEnabled: true,
          summary: 'Caller wants local batch actions.',
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
        value: {
          mode: AppBuilderCollectionIdentityMode.ScalarField,
          requiredBy: [
            AppBuilderCollectionIdentityUse.RowSelection,
            AppBuilderCollectionIdentityUse.BatchAction,
          ],
          fieldName: 'id',
        },
      }],
    }],
    collectionExpression: 'tasks',
    itemLocalName: 'task',
    emptyStateText: 'No tasks',
    emptyStateConditionExpression: 'tasks.length === 0',
    rowSelectionCheckedExpression: 'selectedTaskIds.includes(task.id)',
    rowSelectionToggleHandlerExpression: 'toggleTaskSelection(task)',
    rowSelectionColumnHeaderText: 'Select',
    rowSelectionCheckboxLabelExpression: "'Select ' + task.title",
    batchActionControls: [{
      actionName: 'deleteSelectedTasks',
      handlerExpression: 'deleteSelectedTasks()',
      buttonText: 'Delete selected',
    }],
  },
});
assert.equal(batchActionTableCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.match(
  batchActionTableCompositionAnswer.value.fragments.map((fragment) => fragment.text).join('\n'),
  /<p if\.bind="tasks\.length === 0">No tasks<\/p>[\s\S]*<template else>[\s\S]*<div role="toolbar" aria-label="Batch actions">[\s\S]*<button type="button" click\.trigger="deleteSelectedTasks\(\)">Delete selected<\/button>[\s\S]*<table>/,
  'Expected local batch actions with an empty state to wrap toolbar and table in the same else branch.',
);
assert.equal(
  batchActionTableCompositionAnswer.value.selectedCollectionBatchActions.length,
  1,
  'Expected local batch action Collection Table lowering to expose selected batch action rows.',
);
assert.ok(
  batchActionTableCompositionAnswer.value.controlUseInventoryRows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.handlerExpression === 'deleteSelectedTasks()'
    && row.buttonText === 'Delete selected'
  ),
  'Expected local batch action Collection Table lowering to emit a native-button control-use row.',
);
const collectionTableSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    rootDir: 'sample-app',
    templatePath: 'src/tasks.html',
    includeControlUseInventoryRows: true,
    sourceLoweringComposition: {
      targetRef: collectionTableTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
      suppliedInputs: collectionProjectionSuppliedInputs,
      collectionExpression: 'tasks',
      itemLocalName: 'task',
    },
  },
});
assert.equal(collectionTableSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(collectionTableSourcePlanAnswer.value.sourcePlan?.files[0]?.path, 'src/tasks.html');
assert.match(
  collectionTableSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /<table>[\s\S]*repeat\.for="task of tasks"/,
  'Expected Collection Table composition to wrap in a SourcePlan preview when explicit placement is supplied.',
);
assert.equal(
  collectionTableSourcePlanAnswer.value.sourcePlan?.files[0]?.contributions,
  undefined,
  'Expected compact/default SourcePlan answers to omit file contribution ledgers.',
);
assert.ok(
  (collectionTableSourcePlanAnswer.value.sourcePlan?.files[0]?.contributionCount ?? 0) > 0,
  'Expected compact/default SourcePlan answers to retain file contribution counts.',
);
assert.equal(
  collectionTableSourcePlanAnswer.value.sourceLoweringRequestFields,
  undefined,
  'Expected compact/default SourcePlan answers to omit full source-lowering request-field rows.',
);
assert.ok(
  collectionTableSourcePlanAnswer.value.sourceLoweringRequestFieldSummary.requestFieldCount > 0,
  'Expected compact/default SourcePlan answers to retain source-lowering request-field summaries.',
);
const collectionTableActionSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    rootDir: 'sample-app',
    templatePath: 'src/tasks.html',
    includeControlUseInventoryRows: true,
    includeSourcePlanContributions: true,
    sourceLoweringComposition: {
      targetRef: collectionTableTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
      suppliedInputs: collectionTableActionSuppliedInputs,
      collectionExpression: 'tasks',
      itemLocalName: 'task',
    },
  },
});
assert.equal(collectionTableActionSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  collectionTableActionSourcePlanAnswer.value.sourcePlan?.files[0]?.contributions.some((contribution) =>
    contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderSourceLoweringInvocation
    && contribution.origin.targetId === AppBuilderControlPatternId.NativeButton
  )
  && collectionTableActionSourcePlanAnswer.value.sourcePlan?.files[0]?.contributions.some((contribution) =>
    contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderPartSourceInvocation
    && contribution.origin.partId === AppBuilderBindingPartId.EventListener
  ),
  'Expected Collection Table row-action SourcePlan preview to preserve nested native-button and delegated event-listener contribution origins.',
);
assert.ok(
  collectionTableActionSourcePlanAnswer.value.controlUseInventoryRows.some((row) =>
    row.sourceReference.sourceKind === AppBuilderControlUseInventorySourceKind.SourceLoweringInvocation
    && row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.actionName === 'complete'
  ),
  'Expected Collection Table row-action SourcePlan preview to expose generated control-use rows at the SourcePlan boundary.',
);
const appSectionSuppliedInputs = [
  ...nativeSubmitFormSuppliedInputs,
  collectionProjectionSuppliedInputs.find((input) => input.inputContractId === AppBuilderInputContractId.CollectionProjection),
  {
    inputContractId: AppBuilderInputContractId.VisualStyleInput,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
      value: [{
        target: AppBuilderSourceLoweringVisualHookTarget.AppSection,
        classTokens: ['section-shell'],
      }],
    }],
  },
].filter((input) => input != null);
const appSectionPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [appSectionTargetRef],
    suppliedInputs: appSectionSuppliedInputs,
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(appSectionPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  appSectionPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected App Section to report source-lowering support once child-composition assembly is registered.',
);
assert.deepEqual(
  appSectionPreflightAnswer.value.rows[0]?.sourceLoweringRequestFields
    .filter((field) =>
      field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.FragmentComposition
      && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional
    )
    .map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.ChildContent,
    AppBuilderSourceLoweringRequestFieldId.ChildCompositions,
  ],
  'Expected App Section preflight to disclose explicit childContent/childCompositions rather than inferring section contents.',
);
assert.equal(
  appSectionPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected App Section preflight to separate source-lowering availability/input readiness from request-local child composition fields.',
);
const continuedAppSectionPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [appSectionTargetRef],
    suppliedInputs: appSectionSuppliedInputs,
  },
}, appSectionPreflightAnswer);
assert.equal(
  continuedAppSectionPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition
    && row.targetAppBuilderQuery?.sourceLoweringComposition?.targetRef?.id === AppBuilderApplicationPatternId.AppSection
  ) === true,
  true,
  'Expected App Section preflight continuations to offer composition lowering, with the composition query itself reporting missing childContent or childCompositions.',
);
const missingAppSectionChildrenAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: appSectionTargetRef,
    suppliedInputs: appSectionSuppliedInputs,
  },
});
assert.equal(missingAppSectionChildrenAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingAppSectionChildrenAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingSectionChildren
  ),
  'Expected App Section composition to require caller-selected childContent or childCompositions.',
);
const appSectionCompositionRequest = {
  targetRef: appSectionTargetRef,
  compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
  suppliedInputs: appSectionSuppliedInputs,
  childCompositions: [{
    targetRef: nativeSubmitFormTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    fieldNames: ['title', 'done'],
    actionName: 'create',
    submitButtonText: 'Create',
  }, {
    targetRef: collectionTableTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
    collectionExpression: 'tasks',
    itemLocalName: 'task',
    emptyStateText: 'No tasks yet.',
    emptyStateConditionExpression: 'tasks.length === 0',
  }],
};
const appSectionCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: appSectionCompositionRequest,
});
assert.equal(appSectionCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(appSectionCompositionAnswer.value.childCompositions.length, 2);
assert.equal(appSectionCompositionAnswer.value.childContent.length, 2);
assert.equal(appSectionCompositionAnswer.value.fragments.length, 1);
assert.match(
  appSectionCompositionAnswer.value.fragments[0]?.text ?? '',
  /<section class="section-shell">[\s\S]*<form submit\.trigger="create\(\)">[\s\S]*<p if\.bind="tasks\.length === 0">No tasks yet\.<\/p>[\s\S]*<table else>[\s\S]*repeat\.for="task of tasks"[\s\S]*<\/section>/,
  'Expected App Section composition to wrap caller-selected create-form and table child compositions in order.',
);
assert.ok(
  appSectionCompositionAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.id === AppBuilderApplicationPatternId.AppSection
  )
  && appSectionCompositionAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.id === AppBuilderApplicationPatternId.NativeSubmitForm
  )
  && appSectionCompositionAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.id === AppBuilderApplicationPatternId.CollectionTable
  ),
  'Expected App Section composition to expose the app-section target plus child composition targets.',
);
assert.ok(
  appSectionCompositionAnswer.value.controlUseInventoryRows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.actionName === 'create'
  ),
  'Expected App Section composition to aggregate child control-use inventory rows.',
);
const appSectionMixedContentRequest = {
  targetRef: appSectionTargetRef,
  compositionKind: AppBuilderSourceLoweringCompositionKind.AppSection,
  suppliedInputs: appSectionSuppliedInputs,
  childContent: [{
    composition: {
      targetRef: nativeSubmitFormTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
      fieldNames: ['title', 'done'],
      actionName: 'create',
      submitButtonText: 'Create',
    },
  }, {
    invocation: {
      targetRef: {
        kind: AppBuilderOntologyRowKind.ControlPattern,
        domain: AppBuilderOntologyDomain.Control,
        id: AppBuilderControlPatternId.NativeButton,
      },
      handlerExpression: 'refresh()',
      buttonText: 'Refresh',
    },
  }, {
    composition: {
      targetRef: collectionTableTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.CollectionTable,
      collectionExpression: 'tasks',
      itemLocalName: 'task',
      emptyStateText: 'No tasks yet.',
      emptyStateConditionExpression: 'tasks.length === 0',
    },
  }],
};
const appSectionMixedContentAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: appSectionMixedContentRequest,
});
assert.equal(appSectionMixedContentAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(appSectionMixedContentAnswer.value.childContent.length, 3);
assert.equal(appSectionMixedContentAnswer.value.childCompositions.length, 2);
assert.match(
  appSectionMixedContentAnswer.value.fragments[0]?.text ?? '',
  /<section class="section-shell">[\s\S]*<form submit\.trigger="create\(\)">[\s\S]*<button type="button" click\.trigger="refresh\(\)">Refresh<\/button>[\s\S]*<p if\.bind="tasks\.length === 0">No tasks yet\.<\/p>[\s\S]*<\/section>/,
  'Expected App Section childContent to preserve mixed form, direct button, and table order inside the section.',
);
assert.ok(
  appSectionMixedContentAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ControlPattern
    && ref.id === AppBuilderControlPatternId.NativeButton
  ),
  'Expected App Section childContent to expose direct child invocation target refs.',
);
assert.ok(
  appSectionMixedContentAnswer.value.controlUseInventoryRows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.actionChannelKind === AppBuilderControlUseActionChannelKind.DirectControlEvent
  ),
  'Expected App Section childContent to aggregate direct child invocation control-use rows.',
);
const appSectionSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    rootDir: 'sample-app',
    templatePath: 'src/task-section.html',
    sourceLoweringComposition: appSectionCompositionRequest,
  },
});
assert.equal(appSectionSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(appSectionSourcePlanAnswer.value.sourcePlan?.files[0]?.path, 'src/task-section.html');
assert.match(
  appSectionSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /<section class="section-shell">[\s\S]*<form submit\.trigger="create\(\)">[\s\S]*<table else>/,
  'Expected App Section composition to wrap in a SourcePlan preview when explicit placement is supplied.',
);
const loadingEmptyErrorPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [loadingEmptyErrorTargetRef],
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(loadingEmptyErrorPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  loadingEmptyErrorPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected Loading / Empty / Error State to report source-lowering support once promise-state composition is registered.',
);
assert.deepEqual(
  loadingEmptyErrorPreflightAnswer.value.rows[0]?.sourceLoweringSurfaceKinds,
  [
    AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ],
  'Expected Loading / Empty / Error State preflight to expose fragment composition and SourcePlan-preview surfaces.',
);
assert.equal(
  loadingEmptyErrorPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected Loading / Empty / Error State preflight to be ready without pretending a domain model is required.',
);
assert.equal(
  loadingEmptyErrorPreflightAnswer.value.rows[0]?.inputReadiness.missingRecommendedCount,
  1,
  'Expected Loading / Empty / Error State preflight to keep visual hooks recommended rather than required.',
);
assert.equal(
  loadingEmptyErrorPreflightAnswer.value.requiredRequestFieldTargetCount,
  1,
  'Expected Loading / Empty / Error State preflight to summarize that this target still has required per-call request fields.',
);
assert.equal(
  loadingEmptyErrorPreflightAnswer.value.requiredSourceLoweringRequestFieldCount,
  8,
  'Expected Loading / Empty / Error State preflight to count fragment-composition plus SourcePlan wrapper required request fields.',
);
assert.deepEqual(
  loadingEmptyErrorPreflightAnswer.value.rows[0]?.sourceLoweringRequestFields
    .filter((field) =>
      field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.FragmentComposition
      && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required
    )
    .map((field) => field.requestFieldName),
  [
    'promiseExpression',
    'pendingText',
    'emptyStateText',
    'emptyStateConditionExpression',
    'rejectedText',
  ],
  'Expected Loading / Empty / Error State preflight to disclose required per-call request fields separately from input readiness.',
);
assert.match(
  loadingEmptyErrorPreflightAnswer.value.rows[0]?.decisionText ?? '',
  /required request fields must still be supplied by surface: fragment-composition\(promiseExpression, pendingText, emptyStateText, emptyStateConditionExpression, rejectedText\); source-plan-preview\(rootDir, templatePath, sourceLoweringComposition\)/,
  'Expected Loading / Empty / Error State preflight decision text to distinguish ready durable inputs from missing source-lowering request fields.',
);
const continuedLoadingEmptyErrorPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [loadingEmptyErrorTargetRef],
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
}, loadingEmptyErrorPreflightAnswer);
assert.equal(
  continuedLoadingEmptyErrorPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition
    || row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
  ),
  false,
  'Expected source-lowering preflight not to offer source-producing loading-state continuations while required per-call request fields are missing.',
);
const missingLoadingStateAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: loadingEmptyErrorTargetRef,
  },
});
assert.equal(missingLoadingStateAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingLoadingStateAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingPromiseExpression
  )
  && missingLoadingStateAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingPendingText
  )
  && missingLoadingStateAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingEmptyStateText
  )
  && missingLoadingStateAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingEmptyStateConditionExpression
  )
  && missingLoadingStateAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingRejectedText
  ),
  'Expected Loading / Empty / Error State composition to ask for explicit status expressions and text instead of guessing.',
);
const loadingEmptyErrorCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: loadingEmptyErrorTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.VisualStyleInput,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
        value: [{
          target: AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
          classTokens: ['status-region'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.StatusPending,
          classTokens: ['status-pending'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.StatusEmpty,
          classTokens: ['status-empty'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.StatusError,
          classTokens: ['status-error'],
        }],
      }],
    }],
    promiseExpression: 'tasksPromise',
    pendingText: 'Loading tasks',
    fulfilledLocalName: 'tasks',
    emptyStateText: 'No tasks',
    emptyStateConditionExpression: 'tasks.length === 0',
    rejectedLocalName: 'error',
    rejectedText: 'Could not load tasks',
  },
});
assert.equal(loadingEmptyErrorCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  loadingEmptyErrorCompositionAnswer.value.compositionKind,
  AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
  'Expected Loading / Empty / Error State composition to disclose the selected composition kind.',
);
assert.equal(loadingEmptyErrorCompositionAnswer.value.promiseExpression, 'tasksPromise');
assert.equal(loadingEmptyErrorCompositionAnswer.value.fulfilledLocalName, 'tasks');
assert.equal(loadingEmptyErrorCompositionAnswer.value.rejectedLocalName, 'error');
assert.equal(
  loadingEmptyErrorCompositionAnswer.value.fragments.length,
  1,
  'Expected Loading / Empty / Error State composition to return one top-level promise region fragment.',
);
assert.match(
  loadingEmptyErrorCompositionAnswer.value.fragments[0]?.text ?? '',
  /<section promise\.bind="tasksPromise" class="status-region">[\s\S]*<p pending class="status-pending">Loading tasks<\/p>[\s\S]*<template then="tasks">[\s\S]*<p if\.bind="tasks\.length === 0" class="status-empty">No tasks<\/p>[\s\S]*<p catch="error" class="status-error">Could not load tasks<\/p>[\s\S]*<\/section>/,
  'Expected Loading / Empty / Error State composition to preserve promise branch ownership and spend visual hooks.',
);
assert.ok(
  loadingEmptyErrorCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.PartSourceInvocation
  )
  && loadingEmptyErrorCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.SourceLoweringComposition
  ),
  'Expected Loading / Empty / Error State composition to preserve delegated template-controller and top-level composition provenance.',
);
const loadingEmptyErrorSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    rootDir: 'sample-app',
    templatePath: 'src/status.html',
    sourceLoweringComposition: {
      targetRef: loadingEmptyErrorTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.LoadingEmptyErrorState,
      promiseExpression: 'tasksPromise',
      pendingText: 'Loading tasks',
      fulfilledLocalName: 'tasks',
      emptyStateText: 'No tasks',
      emptyStateConditionExpression: 'tasks.length === 0',
      rejectedLocalName: 'error',
      rejectedText: 'Could not load tasks',
    },
  },
});
assert.equal(loadingEmptyErrorSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(loadingEmptyErrorSourcePlanAnswer.value.sourcePlan?.files[0]?.path, 'src/status.html');
assert.match(
  loadingEmptyErrorSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /<section promise\.bind="tasksPromise">[\s\S]*<template then="tasks">[\s\S]*if\.bind="tasks\.length === 0"/,
  'Expected Loading / Empty / Error State composition to wrap in a SourcePlan preview when explicit placement is supplied.',
);
const nativeSubmitFormPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [nativeSubmitFormTargetRef],
    suppliedInputs: nativeSubmitFormSuppliedInputs,
    includeInputDependencies: true,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(nativeSubmitFormPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeSubmitFormPreflightAnswer.value.rows[0]?.sourceLoweringAvailability,
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  'Expected Native Submit Form to report source-lowering support once fragment composition is registered.',
);
assert.deepEqual(
  nativeSubmitFormPreflightAnswer.value.rows[0]?.sourceLoweringSurfaceKinds,
  [
    AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
  ],
  'Expected Native Submit Form preflight to identify both fragment composition and explicit-placement SourcePlan preview surfaces.',
);
assert.equal(
  nativeSubmitFormPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.Ready,
  'Expected scalar Native Submit Form preflight to need domain fields and actions without requiring finite value-set input.',
);
assert.equal(
  nativeSubmitFormPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected Native Submit Form preflight to allow source-lowering composition with explicit scalar field/action input.',
);
assert.deepEqual(
  nativeSubmitFormPreflightAnswer.value.rows[0]?.sourceLoweringRequestFields
    .filter((field) =>
      field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.FragmentComposition
      && field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required
    )
    .map((field) => field.fieldId),
  [
    AppBuilderSourceLoweringRequestFieldId.FieldNames,
    AppBuilderSourceLoweringRequestFieldId.ActionName,
    AppBuilderSourceLoweringRequestFieldId.SubmitButtonText,
  ],
  'Expected Native Submit Form preflight to disclose explicit field order, action selection, and submit text request fields.',
);
assert.ok(
  nativeSubmitFormPreflightAnswer.value.rows[0]?.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview) === true
  && nativeSubmitFormPreflightAnswer.value.rows[0]?.effectContractIds.includes(AppBuilderEffectContractId.SemanticRuntimeReopen) === true
  && nativeSubmitFormPreflightAnswer.value.rows[0]?.effectContractIds.includes(AppBuilderEffectContractId.ControlUseInventory) === true,
  'Expected Native Submit Form preflight to expose associated effect contracts before source is composed.',
);
const continuedNativeSubmitFormPreflightAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [nativeSubmitFormTargetRef],
    suppliedInputs: nativeSubmitFormSuppliedInputs,
  },
}, nativeSubmitFormPreflightAnswer);
assert.equal(
  continuedNativeSubmitFormPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition
    && row.targetAppBuilderQuery?.sourceLoweringComposition?.targetRef?.id === AppBuilderApplicationPatternId.NativeSubmitForm
  ) === true,
  false,
  'Expected fragment-composition preflight continuations not to offer composition lowering while composition request fields remain.',
);
assert.ok(
  continuedNativeSubmitFormPreflightAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.EffectContractDetail
    && row.targetAppBuilderQuery?.effectContractDetail?.effectContractIds?.includes(AppBuilderEffectContractId.SourcePlanPreview)
  ) === true,
  'Expected source-lowering preflight continuations to expose effect-contract detail for associated witness promises.',
);

const nativeSubmitFormSingleInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: nativeSubmitFormTargetRef,
    suppliedInputs: nativeSubmitFormSuppliedInputs,
  },
});
assert.equal(nativeSubmitFormSingleInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  nativeSubmitFormSingleInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.UnsupportedTargetKind
  ),
  'Expected single-target invocation to refuse application-pattern rows even when a separate composition surface exists.',
);
const continuedNativeSubmitFormSingleInvocationAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: nativeSubmitFormTargetRef,
    suppliedInputs: nativeSubmitFormSuppliedInputs,
  },
}, nativeSubmitFormSingleInvocationAnswer);
assert.equal(
  continuedNativeSubmitFormSingleInvocationAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
  ) === true,
  false,
  'Expected zero-fragment source-lowering invocation answers not to advertise a SourcePlan wrapper continuation.',
);

const missingFieldCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    suppliedInputs: nativeSubmitFormSuppliedInputs,
    actionName: 'create',
    submitButtonText: 'Create',
  },
});
assert.equal(missingFieldCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingFieldCompositionAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.MissingFieldSelection
    && issue.fieldNames?.includes('title') === true
    && issue.fieldNames?.includes('done') === true
  ),
  'Expected source-lowering composition to require explicit field order and report candidate fields.',
);
const continuedMissingFieldCompositionAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    suppliedInputs: nativeSubmitFormSuppliedInputs,
    actionName: 'create',
    submitButtonText: 'Create',
  },
}, missingFieldCompositionAnswer);
assert.equal(
  continuedMissingFieldCompositionAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
  ) === true,
  false,
  'Expected zero-fragment source-lowering composition answers not to advertise a SourcePlan wrapper continuation.',
);

const unknownCompositionKindAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    compositionKind: 'not-a-composition-kind',
    suppliedInputs: nativeSubmitFormSuppliedInputs,
    fieldNames: ['title'],
    actionName: 'create',
    submitButtonText: 'Create',
  },
});
assert.equal(unknownCompositionKindAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  unknownCompositionKindAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.UnknownCompositionKind
  ),
  'Expected source-lowering composition to reject unknown compositionKind values instead of deriving a target default.',
);

const unknownScopedFieldInputCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    suppliedInputs: [
      ...nativeSubmitFormSuppliedInputs,
      {
        inputContractId: AppBuilderInputContractId.ControlAccessibility,
        sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
        facetPayloads: [{
          inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
          value: {
            fieldName: 'ghost',
            helpText: 'This field is no longer in the selected form.',
          },
        }],
      },
      {
        inputContractId: AppBuilderInputContractId.VisualStyleInput,
        sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
        facetPayloads: [{
          inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
          value: [{
            target: AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
            fieldName: 'ghost',
            classTokens: ['field'],
          }],
        }],
      },
    ],
    fieldNames: ['title', 'done'],
    actionName: 'create',
    submitButtonText: 'Create',
  },
});
assert.equal(unknownScopedFieldInputCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  unknownScopedFieldInputCompositionAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldAccessibilityMessageField
    && issue.fieldNames?.includes('ghost') === true
    && issue.fieldNames?.includes('title') === true
    && issue.fieldNames?.includes('done') === true
  ),
  'Expected Native Submit Form to report field-scoped ControlAccessibility payloads whose fieldName is absent from selected fields.',
);
assert.ok(
  unknownScopedFieldInputCompositionAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.UnknownFieldVisualHookField
    && issue.fieldNames?.includes('ghost') === true
    && issue.fieldNames?.includes('title') === true
    && issue.fieldNames?.includes('done') === true
  ),
  'Expected Native Submit Form to report field-scoped VisualClassHooks payloads whose fieldName is absent from selected fields.',
);
const unmatchedSubmitButtonVisualHookCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    suppliedInputs: [
      ...nativeSubmitFormSuppliedInputs,
      {
        inputContractId: AppBuilderInputContractId.VisualStyleInput,
        sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
        facetPayloads: [{
          inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
          value: [{
            target: AppBuilderSourceLoweringVisualHookTarget.Button,
            actionName: 'cancel',
            classTokens: ['button'],
          }],
        }],
      },
    ],
    fieldNames: ['title', 'done'],
    actionName: 'create',
    submitButtonText: 'Create',
  },
});
assert.equal(unmatchedSubmitButtonVisualHookCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  unmatchedSubmitButtonVisualHookCompositionAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringCompositionIssueKind.UnmatchedSubmitButtonVisualHookAction
    && issue.actionNames?.includes('cancel') === true
    && issue.actionNames?.includes('create') === true
  ),
  'Expected Native Submit Form to report action-scoped submit-button VisualClassHooks that do not match the selected submit action.',
);

const compactNativeSubmitFormCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    suppliedInputs: nativeSubmitFormSuppliedInputs,
    fieldNames: ['title', 'done'],
    bindingRootExpression: 'draft',
    actionName: 'create',
    submitButtonText: 'Create',
  },
});
assert.equal(compactNativeSubmitFormCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  compactNativeSubmitFormCompositionAnswer.value.preflightRow?.inputDependencies,
  undefined,
  'Expected compact source-lowering composition rows to omit full input-dependency detail by default.',
);
assert.equal(
  compactNativeSubmitFormCompositionAnswer.value.selectedFields[0]?.memberInvocation?.preflightRow?.inputDependencies,
  undefined,
  'Expected compact nested member invocations to omit repeated input-dependency detail by default.',
);

const nativeSubmitFormCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    suppliedInputs: nativeSubmitFormSuppliedInputs,
    fieldNames: ['title', 'done'],
    bindingRootExpression: 'draft',
    actionName: 'create',
    submitButtonText: 'Create',
    includePreflight: true,
  },
});
assert.equal(nativeSubmitFormCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.preflightRow?.inputDependencies?.length > 0,
  'Expected includePreflight source-lowering composition rows to retain input-dependency detail.',
);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.selectedFields[0]?.memberInvocation?.preflightRow?.inputDependencies?.length > 0,
  'Expected includePreflight nested member invocations to retain input-dependency detail.',
);
assert.equal(
  nativeSubmitFormCompositionAnswer.value.compositionKind,
  AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
  'Expected source-lowering composition to disclose the selected composition kind.',
);
assert.equal(
  nativeSubmitFormCompositionAnswer.value.selectedFields.length,
  2,
  'Expected Native Submit Form composition to lower the explicit field order.',
);
assert.equal(
  nativeSubmitFormCompositionAnswer.value.selectedFields[0]?.bindingExpression,
  'draft.title',
  'Expected Native Submit Form composition to spend bindingRootExpression for selected fields.',
);
assert.equal(
  nativeSubmitFormCompositionAnswer.value.selectedAction?.handlerExpression,
  'create()',
  'Expected Native Submit Form composition to derive a submit handler from a TypeScript-safe action name.',
);
assert.equal(
  nativeSubmitFormCompositionAnswer.value.submitEventLowering?.fragments[0]?.text,
  'submit.trigger="create()"',
  'Expected Native Submit Form composition to lower form-level submit event syntax.',
);
assert.equal(
  nativeSubmitFormCompositionAnswer.value.fragments.length,
  1,
  'Expected Native Submit Form composition to return one top-level form fragment.',
);
assert.match(
  nativeSubmitFormCompositionAnswer.value.fragments[0]?.text ?? '',
  /<form submit\.trigger="create\(\)">/,
  'Expected Native Submit Form composition to attach submit.trigger to the form.',
);
assert.match(
  nativeSubmitFormCompositionAnswer.value.fragments[0]?.text ?? '',
  /<input value\.bind="draft\.title"[^>]*>/,
  'Expected Native Submit Form composition to spend member field-group invocations inside the form.',
);
assert.match(
  nativeSubmitFormCompositionAnswer.value.fragments[0]?.text ?? '',
  /<input[^>]*checked\.bind="draft\.done"[^>]*>/,
  'Expected Native Submit Form composition to choose checked binding for boolean fields.',
);
assert.match(
  nativeSubmitFormCompositionAnswer.value.fragments[0]?.text ?? '',
  /<button type="submit">Create<\/button>/,
  'Expected Native Submit Form composition to emit a native submit button without a click handler.',
);
assert.equal(
  nativeSubmitFormCompositionAnswer.value.fragments[0]?.origin?.kind,
  AppBuilderSourceFragmentOriginKind.SourceLoweringComposition,
  'Expected top-level Native Submit Form fragment to carry source-lowering composition origin.',
);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.text === '<button type="submit">Create</button>'
    && fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.SourceLoweringComposition
    && fragment.origin.targetId === AppBuilderApplicationPatternId.NativeSubmitForm
  ),
  'Expected Native Submit Form composition to preserve the generated submit button as source-lowering composition provenance.',
);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.NativeSubmitForm
  )
  && nativeSubmitFormCompositionAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ControlPattern
    && ref.id === AppBuilderControlPatternId.FieldGroup
  ),
  'Expected Native Submit Form composition to expose both the top-level pattern and member field-group ontology target refs.',
);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview)
  && nativeSubmitFormCompositionAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SemanticRuntimeReopen)
  && nativeSubmitFormCompositionAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.ControlUseInventory),
  'Expected Native Submit Form composition to expose effect contracts for source-plan preview, reopen, and control-use witnesses.',
);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation
  ),
  'Expected Native Submit Form composition to expose member source-lowering invocation fragments as contributing provenance.',
);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.contributingFragments.some((fragment) =>
    fragment.origin?.kind === AppBuilderSourceFragmentOriginKind.PartSourceInvocation
  ),
  'Expected Native Submit Form composition to expose the delegated submit event part fragment as contributing provenance.',
);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.controlUseInventoryRows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.FieldGroup
    && row.fieldName === 'title'
  ),
  'Expected Native Submit Form composition to aggregate field-group control-use rows from member invocations.',
);
assert.ok(
  nativeSubmitFormCompositionAnswer.value.controlUseInventoryRows.some((row) =>
    row.sourceReference.sourceKind === AppBuilderControlUseInventorySourceKind.SourceLoweringComposition
    && row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.actionName === 'create'
    && row.actionChannelKind === AppBuilderControlUseActionChannelKind.ContainingFormSubmit
    && row.buttonType === AppBuilderSourceLoweringButtonType.Submit
  ),
  'Expected Native Submit Form composition to emit a native submit-button control-use row without pretending it is a direct click handler.',
);
const nativeSubmitFormTemplateArtifact = appBuilderHtmlTemplateFileArtifact('src/create-task.html', {
  text: nativeSubmitFormCompositionAnswer.value.fragments[0]?.text ?? '',
  fragments: nativeSubmitFormCompositionAnswer.value.contributingFragments,
});
assert.equal(
  nativeSubmitFormTemplateArtifact.role,
  SourcePlanFileRole.Template,
  'Expected Native Submit Form composition fragments to lower into a template SourcePlan artifact.',
);
assert.ok(
  nativeSubmitFormTemplateArtifact.contributions?.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderSourceLoweringComposition
  ) === true,
  'Expected Native Submit Form template artifact to preserve top-level source-lowering composition origin.',
);
assert.ok(
  nativeSubmitFormTemplateArtifact.contributions?.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderSourceLoweringInvocation
  ) === true,
  'Expected Native Submit Form template artifact to preserve child source-lowering invocation origins.',
);
assert.ok(
  nativeSubmitFormTemplateArtifact.contributions?.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderPartSourceInvocation
  ) === true,
  'Expected Native Submit Form template artifact to preserve delegated part-source origins.',
);
const missingPlacementSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    sourceLoweringComposition: {
      targetRef: nativeSubmitFormTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
      suppliedInputs: nativeSubmitFormSuppliedInputs,
      fieldNames: ['title', 'done'],
      bindingRootExpression: 'draft',
      actionName: 'create',
      submitButtonText: 'Create',
    },
  },
});
assert.equal(missingPlacementSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(missingPlacementSourcePlanAnswer.value.sourcePlan, null);
assert.ok(
  missingPlacementSourcePlanAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringSourcePlanIssueKind.MissingRootDir
  )
  && missingPlacementSourcePlanAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringSourcePlanIssueKind.MissingTemplatePath
  ),
  'Expected app-builder SourcePlan preview to require explicit source placement rather than inventing rootDir/templatePath.',
);
const continuedMissingPlacementSourcePlanAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    sourceLoweringComposition: {
      targetRef: nativeSubmitFormTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
      suppliedInputs: nativeSubmitFormSuppliedInputs,
      fieldNames: ['title', 'done'],
      bindingRootExpression: 'draft',
      actionName: 'create',
      submitButtonText: 'Create',
    },
  },
}, missingPlacementSourcePlanAnswer);
assert.ok(
  continuedMissingPlacementSourcePlanAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.AffordanceDetail
    && row.targetAppBuilderQuery?.affordanceDetail?.affordanceIds?.includes(AppBuilderAffordanceId.SourcePlanPreview)
  ) === true,
  'Expected missing SourcePlan placement continuations to open SourcePlan preview affordance readiness.',
);
assert.ok(
  continuedMissingPlacementSourcePlanAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
    && row.targetAppBuilderQuery?.inputContractDetail?.inputContractIds?.includes(AppBuilderInputContractId.SourcePlacement)
    && row.targetAppBuilderQuery.inputContractDetail.inputFacetIds?.includes(AppBuilderInputFacetId.SourceRoot)
    && row.targetAppBuilderQuery.inputContractDetail.inputFacetIds?.includes(AppBuilderInputFacetId.SourceTargetPath)
  ) === true,
  'Expected missing SourcePlan placement continuations to open source-root and source-target-path payload detail.',
);
const compactAppShellSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    sourceLoweringAppShell: {
      targetRef: appShellTargetRef,
      suppliedInputs: appShellSuppliedInputs,
      includePreflight: true,
    },
  },
});
assert.equal(compactAppShellSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  compactAppShellSourcePlanAnswer.value.sourcePlanWitnessRows,
  undefined,
  'Expected compact/default SourcePlan answers to report witness counts without witness rows.',
);
assert.equal(
  compactAppShellSourcePlanAnswer.value.controlUseInventoryRows,
  undefined,
  'Expected compact/default SourcePlan answers to report control-use counts without inventory rows.',
);
assert.equal(
  compactAppShellSourcePlanAnswer.value.handoffNoteCount,
  compactAppShellSourcePlanAnswer.value.handoffNotes.length,
  'Expected compact/default SourcePlan answers to keep public handoff note counts aligned with visible note rows.',
);
assert.ok(
  compactAppShellSourcePlanAnswer.value.handoffNotes.some((row) =>
    row.kind === AppBuilderSourcePlanHandoffNoteKind.BusinessBehaviorCallerOwned
  )
  && compactAppShellSourcePlanAnswer.value.handoffNotes.some((row) =>
    row.kind === AppBuilderSourcePlanHandoffNoteKind.SemanticVerificationContract
  ),
  'Expected compact/default SourcePlan answers to expose caller-owned behavior and verification-contract handoff notes.',
);
const statePluginAppShellSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    sourceLoweringAppShell: {
      targetRef: appShellTargetRef,
      suppliedInputs: appShellWithStatePluginSuppliedInputs,
      includePreflight: true,
    },
  },
});
assert.equal(statePluginAppShellSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.ok(
  statePluginAppShellSourcePlanAnswer.value.handoffNotes.some((row) =>
    row.kind === AppBuilderSourcePlanHandoffNoteKind.DeferredCapabilityHandoff
    && row.summary.includes(AppBuilderPackageCapability.State)
  ),
  'Expected selected @aurelia/state policy to surface as a SourcePlan handoff boundary when the source plan does not emit store architecture.',
);
assert.match(
  compactAppShellSourcePlanAnswer.value.displayText,
  /handoffNotes=\d+/,
  'Expected SourcePlan display text to include compact handoff-note counts.',
);
assert.equal(
  compactAppShellSourcePlanAnswer.value.controlUseInventoryRowCount,
  0,
  'Expected compact/default SourcePlan answers to keep the generated control-use count.',
);
assert.equal(
  compactAppShellSourcePlanAnswer.value.sourceLoweringResultDetailsIncluded,
  false,
  'Expected compact/default SourcePlan answers to omit nested source-lowering result details.',
);
assert.equal(
  compactAppShellSourcePlanAnswer.value.sourceLoweringSelectionKind,
  AppBuilderSourceLoweringSourcePlanSelectionKind.AppShell,
  'Expected compact/default SourcePlan answers to keep the selected source-lowering kind.',
);
assert.equal(
  compactAppShellSourcePlanAnswer.value.sourceLoweringAppShell,
  undefined,
  'Expected compact/default SourcePlan answers not to repeat selected source-lowering result objects.',
);
assert.ok(
  compactAppShellSourcePlanAnswer.value.sourcePlanWitnessCount > 0,
  'Expected compact/default SourcePlan answers to keep the SourcePlan witness count.',
);
assert.equal(
  compactAppShellSourcePlanAnswer.value.expectedEffects,
  undefined,
  'Expected compact/default SourcePlan answers to report expected-effect counts without expected-effect rows.',
);
assert.ok(
  compactAppShellSourcePlanAnswer.value.expectedEffectCount > 0,
  'Expected compact/default SourcePlan answers to keep the expected-effect count.',
);
const appShellSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    includeSourcePlanWitnessRows: true,
    includeExpectedEffectRows: true,
    includeSourceLoweringResultDetails: true,
    sourceLoweringAppShell: {
      targetRef: appShellTargetRef,
      suppliedInputs: appShellSuppliedInputs,
      includePreflight: true,
    },
  },
});
assert.equal(appShellSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(appShellSourcePlanAnswer.value.suppliedInputCount, 2);
assert.equal(appShellSourcePlanAnswer.value.explicitSuppliedInputCount, 2);
assert.equal(appShellSourcePlanAnswer.value.decisionBundleCount, 0);
assert.equal(appShellSourcePlanAnswer.value.decisionBundleDecisionCount, 0);
assert.equal(
  appShellSourcePlanAnswer.value.decisionBundleExpansionRows,
  undefined,
  'Expected compact/default SourcePlan answers to report decision-bundle counts without expansion rows.',
);
assert.equal(appShellSourcePlanAnswer.value.rootDir, 'sample-app');
assert.equal(appShellSourcePlanAnswer.value.templatePath, null);
assert.equal(appShellSourcePlanAnswer.value.sourceLoweringAppShell?.appName, 'Sample App');
assert.equal(appShellSourcePlanAnswer.value.sourceLoweringAppShell?.resourceCarrier, AppBuilderResourceCarrier.Convention);
assert.equal(appShellSourcePlanAnswer.value.sourcePlan?.rootDir, 'sample-app');
assert.equal(appShellSourcePlanAnswer.value.sourcePlan?.files.length, 3);
assert.equal(appShellSourcePlanAnswer.value.sourcePlan?.files[0]?.role, SourcePlanFileRole.Entrypoint);
assert.equal(appShellSourcePlanAnswer.value.sourcePlan?.files[1]?.path, 'src/my-app.ts');
assert.equal(appShellSourcePlanAnswer.value.sourcePlan?.files[2]?.path, 'src/my-app.html');
assert.equal(
  appShellSourcePlanAnswer.value.sourcePlan?.projectTooling?.buildToolPolicy,
  SourcePlanBuildToolPolicy.AppBuilderBaseline,
  'Expected direct AppShell SourcePlan lowering to carry app-builder baseline project tooling.',
);
assert.deepEqual(
  appShellSourcePlanAnswer.value.sourcePlan?.projectTooling?.files.map((file) => [file.path, file.fileKind]),
  [
    ['package.json', SourcePlanProjectToolingFileKind.PackageManifest],
    ['index.html', SourcePlanProjectToolingFileKind.RootDocument],
    ['vite.config.ts', SourcePlanProjectToolingFileKind.BuildConfig],
    ['tsconfig.json', SourcePlanProjectToolingFileKind.TypeScriptConfig],
    ['src/aurelia-assets.d.ts', SourcePlanProjectToolingFileKind.ModuleDeclaration],
  ],
  'Expected direct AppShell SourcePlan lowering to emit package, root document, build config, TypeScript config, and asset declaration tooling files.',
);
assert.match(
  appShellSourcePlanAnswer.value.sourcePlan?.projectTooling?.files.find((file) => file.path === 'index.html')?.text ?? '',
  /<my-app><\/my-app>[\s\S]*src="\/src\/main\.ts"/,
  'Expected direct AppShell SourcePlan root document to host the generated convention root element and entrypoint.',
);
assert.equal(
  appShellSourcePlanAnswer.value.sourcePlan?.projectTooling?.dependencies.some((dependency) =>
    dependency.specifier === '@aurelia/vite-plugin'
    && dependency.scope === SourcePlanPackageDependencyScope.DevDependency
  ),
  true,
  'Expected direct AppShell SourcePlan lowering to carry Aurelia Vite plugin dev tooling.',
);
assert.equal(
  appShellSourcePlanAnswer.value.sourcePlan?.projectTooling?.scripts.some((script) => script.name === 'dev' && script.command === 'vite')
  && appShellSourcePlanAnswer.value.sourcePlan?.projectTooling?.scripts.some((script) => script.name === 'build' && script.command === 'vite build'),
  true,
  'Expected direct AppShell SourcePlan lowering to carry runnable Vite dev/build scripts.',
);
assert.ok(
  appShellSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.Policy
    && row.rootDir === 'sample-app'
    && row.hasCompleteFileText === true
    && row.buildToolPolicy === SourcePlanBuildToolPolicy.AppBuilderBaseline
  )
  && appShellSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.FileArtifact
    && row.filePath === 'src/main.ts'
    && row.fileRole === SourcePlanFileRole.Entrypoint
  )
  && appShellSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.ProjectToolingDependency
    && row.dependencySpecifier === 'aurelia'
  )
  && appShellSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.ProjectToolingDependency
    && row.dependencySpecifier === '@aurelia/vite-plugin'
  )
  && appShellSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.ProjectToolingFile
    && row.filePath === 'package.json'
  )
  && appShellSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.ProjectToolingFile
    && row.filePath === 'index.html'
    && row.projectToolingFileKind === SourcePlanProjectToolingFileKind.RootDocument
  ),
  'Expected direct AppShell SourcePlan answer to expose compact policy, file, dependency, and tooling witnesses.',
);
assert.ok(
  appShellSourcePlanAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.AppShell
  ),
  'Expected direct AppShell SourcePlan lowering to expose the AppShell app-builder ontology target.',
);
assert.ok(
  appShellSourcePlanAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview)
  && appShellSourcePlanAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SemanticRuntimeReopen),
  'Expected direct AppShell SourcePlan lowering to expose SourcePlan preview and reopen effect contracts.',
);
assert.ok(
  appShellSourcePlanAnswer.value.expectedEffectKinds.includes(ExpectedSemanticEffectKind.ProjectShape)
  && appShellSourcePlanAnswer.value.expectedEffectKinds.includes(ExpectedSemanticEffectKind.ProjectTooling)
  && appShellSourcePlanAnswer.value.expectedEffectKinds.includes(ExpectedSemanticEffectKind.OpenSeamClosure),
  'Expected direct AppShell SourcePlan lowering to expose concrete reopen effect kinds.',
);
assert.ok(
  appShellSourcePlanAnswer.value.expectedEffects.some((row) =>
    row.effectKind === ExpectedSemanticEffectKind.ProjectTooling
    && row.filters.some((filter) => filter.field === 'role' && filter.value === 'package-manifest')
  )
  && appShellSourcePlanAnswer.value.expectedEffects.some((row) =>
    row.effectKind === ExpectedSemanticEffectKind.ProjectTooling
    && row.filters.some((filter) => filter.field === 'role' && filter.value === 'root-document')
  )
  && appShellSourcePlanAnswer.value.expectedEffects.some((row) =>
    row.effectKind === ExpectedSemanticEffectKind.OpenSeamClosure
  )
  && appShellSourcePlanAnswer.value.sourceLoweringAppShell?.expectedEffects.length === appShellSourcePlanAnswer.value.expectedEffects.length,
  'Expected direct AppShell SourcePlan lowering to expose compact expected-effect reopen witnesses.',
);
const appShellDecisionBundleSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    includeDecisionBundleExpansionRows: true,
    sourceLoweringAppShell: {
      targetRef: appShellTargetRef,
      decisionBundles: [{
        sourceId: AppBuilderDecisionBundleSource.ExplicitCallerSelection,
        label: 'explicit app shell source-plan choices',
        decisions: [{
          inputContractId: AppBuilderInputContractId.SourcePlacement,
          facetPayloads: appShellSuppliedInputs[0].facetPayloads,
        }, {
          inputContractId: AppBuilderInputContractId.AureliaPolicy,
          facetPayloads: appShellSuppliedInputs[1].facetPayloads,
        }],
      }],
    },
  },
});
assert.equal(appShellDecisionBundleSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(appShellDecisionBundleSourcePlanAnswer.value.rootDir, 'sample-app');
assert.equal(appShellDecisionBundleSourcePlanAnswer.value.suppliedInputCount, 2);
assert.equal(appShellDecisionBundleSourcePlanAnswer.value.explicitSuppliedInputCount, 0);
assert.equal(appShellDecisionBundleSourcePlanAnswer.value.decisionBundleCount, 1);
assert.equal(appShellDecisionBundleSourcePlanAnswer.value.decisionBundleDecisionCount, 2);
assert.equal(
  appShellDecisionBundleSourcePlanAnswer.value.decisionBundleExpansionRows?.length,
  2,
  'Expected detailed SourcePlan answers to expose decision-bundle expansion rows when requested.',
);
assert.match(
  appShellDecisionBundleSourcePlanAnswer.value.displayText,
  /decisionBundles=1/,
  'Expected SourcePlan display text to include compact decision-bundle counts.',
);
const routerBackedListDetailSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    includeExpectedEffectRows: true,
    includeControlUseInventoryRows: true,
    includeSourceLoweringResultDetails: true,
    sourceLoweringRouterBackedListDetail: {
      targetRef: routerBackedListDetailTargetRef,
      suppliedInputs: routerBackedListDetailSuppliedInputs,
      actionName: 'openTask',
      linkText: 'Open',
      includePreflight: true,
    },
  },
});
assert.equal(routerBackedListDetailSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(routerBackedListDetailSourcePlanAnswer.value.rootDir, 'sample-router-app');
assert.equal(routerBackedListDetailSourcePlanAnswer.value.templatePath, null);
assert.equal(routerBackedListDetailSourcePlanAnswer.value.sourceLoweringRouterBackedListDetail?.appName, 'Task Router');
assert.equal(routerBackedListDetailSourcePlanAnswer.value.sourceLoweringRouterBackedListDetail?.resourceCarrier, AppBuilderResourceCarrier.Decorator);
assert.equal(routerBackedListDetailSourcePlanAnswer.value.sourceLoweringRouterBackedListDetail?.domain?.entityTypeName, 'TaskItem');
assert.equal(routerBackedListDetailSourcePlanAnswer.value.sourceLoweringRouterBackedListDetail?.seedDataSet?.records.length, 1);
assert.equal(routerBackedListDetailSourcePlanAnswer.value.sourceLoweringRouterBackedListDetail?.navigationAction?.name, 'openTask');
assert.equal(routerBackedListDetailSourcePlanAnswer.value.sourceLoweringRouterBackedListDetail?.navigationLinkText, 'Open');
assert.equal(routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.rootDir, 'sample-router-app');
assert.equal(routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.files.length, 9);
assert.deepEqual(
  routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.files.map((file) => file.path),
  [
    'src/main.ts',
    'src/app.ts',
    'src/app.html',
    'src/routes/task-item-list-route.ts',
    'src/routes/task-item-list-route.html',
    'src/routes/task-item-detail-route.ts',
    'src/routes/task-item-detail-route.html',
    'src/task-item.ts',
    'src/task-item-browse-state.ts',
  ],
  'Expected direct RouterBackedListDetail SourcePlan lowering to emit the entrypoint, root component, route components, domain model, and DI state model.',
);
assert.equal(
  routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.projectTooling?.dependencies
    .some((dependency) => dependency.specifier === '@aurelia/router'),
  true,
  'Expected direct RouterBackedListDetail SourcePlan lowering to carry router package tooling admission.',
);
assert.equal(
  routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.pattern?.parameters
    .find((parameter) => parameter.key === SourcePatternParameterKey.DetailRouteParameter)?.sourceValue,
  'taskId',
  'Expected direct RouterBackedListDetail SourcePlan lowering to apply caller route parameter source-pattern input.',
);
assert.match(
  routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.files.find((file) => file.path === 'src/app.ts')?.text?.text ?? '',
  /path: 'tasks'[\s\S]*path: ':taskId'/,
  'Expected direct RouterBackedListDetail SourcePlan lowering to apply caller list path and detail route parameter to route config.',
);
assert.match(
  routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.files.find((file) => file.path === 'src/routes/task-item-list-route.html')?.text?.text ?? '',
  /load="route: task-item-detail; params\.bind: \{ taskId: taskItem\.id \}"/,
  'Expected direct RouterBackedListDetail SourcePlan lowering to apply caller detail route parameter to router-load source.',
);
assert.match(
  routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.files.find((file) => file.path === 'src/routes/task-item-list-route.html')?.text?.text ?? '',
  /<span>\$\{taskItem\.title\}<\/span>[\s\S]*<a load="route: task-item-detail; params\.bind: \{ taskId: taskItem\.id \}">Open<\/a>/,
  'Expected direct RouterBackedListDetail SourcePlan lowering to render caller-selected navigation action copy beside the row title.',
);
assert.equal(
  routerBackedListDetailSourcePlanAnswer.value.controlUseInventoryRowCount,
  1,
  'Expected direct RouterBackedListDetail SourcePlan lowering to expose one generated link-navigation control-use row.',
);
assert.equal(
  routerBackedListDetailSourcePlanAnswer.value.controlUseInventoryRows?.[0]?.controlPatternId,
  AppBuilderControlPatternId.NativeLinkNavigation,
  'Expected direct RouterBackedListDetail SourcePlan lowering to classify the generated route link as native link navigation.',
);
assert.equal(
  routerBackedListDetailSourcePlanAnswer.value.controlUseInventoryRows?.[0]?.actionChannelKind,
  AppBuilderControlUseActionChannelKind.RouterLoadNavigation,
  'Expected direct RouterBackedListDetail SourcePlan lowering to preserve router-load navigation as the generated route-link action channel.',
);
assert.equal(
  routerBackedListDetailSourcePlanAnswer.value.controlUseInventoryRows?.[0]?.routeInstruction,
  'route: task-item-detail; params.bind: { taskId: taskItem.id }',
  'Expected direct RouterBackedListDetail SourcePlan lowering to expose the full generated router-load expression for verification.',
);
assert.equal(
  routerBackedListDetailSourcePlanAnswer.value.sourceLoweringRouterBackedListDetail?.controlUseInventoryRows[0]?.linkText,
  'Open',
  'Expected direct RouterBackedListDetail detail rows to preserve caller-owned navigation link text.',
);
assert.match(
  routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.files.find((file) => file.path === 'src/routes/task-item-list-route.html')?.text?.text ?? '',
  /<p if\.bind="state\.taskItems\.length === 0">No tasks yet\.<\/p>[\s\S]*<ul else>[\s\S]*<li repeat\.for="taskItem of state\.taskItems">/,
  'Expected direct RouterBackedListDetail list route to hide its collection branch behind a sibling else when the empty state is active.',
);
assert.ok(
  routerBackedListDetailSourcePlanAnswer.value.handoffNotes.some((row) =>
    row.kind === AppBuilderSourcePlanHandoffNoteKind.SeedDataScaffold
    && row.sourceFileRoles.includes(SourcePlanFileRole.StateModel)
  )
  && routerBackedListDetailSourcePlanAnswer.value.handoffNotes.some((row) =>
    row.kind === AppBuilderSourcePlanHandoffNoteKind.SourcePatternUse
  )
  && routerBackedListDetailSourcePlanAnswer.value.handoffNotes.some((row) =>
    row.kind === AppBuilderSourcePlanHandoffNoteKind.SemanticVerificationContract
    && row.expectedEffectKinds.includes(ExpectedSemanticEffectKind.Route)
  ),
  'Expected direct RouterBackedListDetail SourcePlan lowering to expose source-pattern, seed-scaffold, and semantic-verification handoff rows.',
);
assert.match(
  routerBackedListDetailSourcePlanAnswer.value.sourcePlan?.files.find((file) => file.path === 'src/task-item-browse-state.ts')?.text?.text ?? '',
  /String\(taskItem\.id\) === id/,
  'Expected numeric RouterBackedListDetail identity lookup to project route-param strings before comparison.',
);
assert.ok(
  routerBackedListDetailSourcePlanAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.RouterBackedListDetail
  ),
  'Expected direct RouterBackedListDetail SourcePlan lowering to expose the RouterBackedListDetail app-builder ontology target.',
);
assert.ok(
  routerBackedListDetailSourcePlanAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.RouteNavigationAction
  ),
  'Expected direct RouterBackedListDetail SourcePlan lowering to expose RouteNavigationAction when the caller selects a row navigation action.',
);
assert.ok(
  routerBackedListDetailSourcePlanAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview)
  && routerBackedListDetailSourcePlanAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SemanticRuntimeReopen),
  'Expected direct RouterBackedListDetail SourcePlan lowering to expose SourcePlan preview and reopen effect contracts.',
);
assert.ok(
  routerBackedListDetailSourcePlanAnswer.value.expectedEffectKinds.includes(ExpectedSemanticEffectKind.Route)
  && routerBackedListDetailSourcePlanAnswer.value.expectedEffectKinds.includes(ExpectedSemanticEffectKind.ServiceClass)
  && routerBackedListDetailSourcePlanAnswer.value.expectedEffectKinds.includes(ExpectedSemanticEffectKind.BindingDataFlow),
  'Expected direct RouterBackedListDetail SourcePlan lowering to expose route, state, and binding reopen effect kinds.',
);
assert.ok(
  routerBackedListDetailSourcePlanAnswer.value.expectedEffects.some((row) =>
    row.effectKind === ExpectedSemanticEffectKind.Route
    && row.filters.some((filter) => filter.field === 'routeProductKind' && filter.value === ExpectedSemanticEffectRouteProductKind.RouteContextParameterRead)
    && row.filters.some((filter) => filter.field === 'routePathParameterNames' && filter.value === 'taskId')
  )
  && routerBackedListDetailSourcePlanAnswer.value.expectedEffects.some((row) =>
    row.effectKind === ExpectedSemanticEffectKind.ServiceInteractionBinding
    && row.filters.some((filter) => filter.field === 'interactionTargetRole' && filter.value === 'state-source')
  )
  && routerBackedListDetailSourcePlanAnswer.value.sourceLoweringRouterBackedListDetail?.expectedEffects.length === routerBackedListDetailSourcePlanAnswer.value.expectedEffects.length,
  'Expected direct RouterBackedListDetail SourcePlan lowering to expose compact expected-effect reopen witnesses.',
);
const routerBackedListDetailStringIdentitySuppliedInputs = [routerBackedListDetailSuppliedInputs[0], {
  ...routerBackedListDetailSuppliedInputs[1],
  facetPayloads: routerBackedListDetailSuppliedInputs[1].facetPayloads.map((payload) => {
    if (payload.inputFacetId === AppBuilderInputFacetId.SourceRoot) {
      return {
        ...payload,
        value: 'sample-string-router-app',
      };
    }
    if (payload.inputFacetId === AppBuilderInputFacetId.SourceNaming) {
      return {
        ...payload,
        value: {
          appName: 'Note Router',
          sourcePatternParameterValues: [{
            key: SourcePatternParameterKey.ListRoutePath,
            value: 'notes',
          }, {
            key: SourcePatternParameterKey.DetailRouteParameter,
            value: 'noteId',
          }],
        },
      };
    }
    return payload;
  }),
}, routerBackedListDetailSuppliedInputs[2], routerBackedListDetailSuppliedInputs[3]].map((input) => {
  if (input.inputContractId === AppBuilderInputContractId.DomainModel) {
    return {
      ...input,
      facetPayloads: input.facetPayloads.map((payload) => {
        if (payload.inputFacetId === AppBuilderInputFacetId.DomainEntities) {
          return {
            ...payload,
            value: {
              entityTitle: 'Note',
              entityTypeName: 'NoteItem',
              collectionMemberName: 'noteItems',
              identityMemberName: 'code',
              identityValueKind: AppBuilderDomainIdentityValueKind.String,
            },
          };
        }
        if (payload.inputFacetId === AppBuilderInputFacetId.DomainFields) {
          return {
            ...payload,
            value: [{
              name: 'title',
              title: 'Title',
              valueKind: AppBuilderDomainFieldValueKind.Text,
            }, {
              name: 'archived',
              title: 'Archived',
              valueKind: AppBuilderDomainFieldValueKind.Boolean,
            }],
          };
        }
        return payload;
      }),
    };
  }
  if (input.inputContractId === AppBuilderInputContractId.SeedData) {
    return {
      ...input,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
        value: [{
          code: 'note-alpha',
          title: 'First note',
          archived: false,
        }],
      }],
    };
  }
  return input;
});
const routerBackedListDetailStringIdentitySourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    sourceLoweringRouterBackedListDetail: {
      targetRef: routerBackedListDetailTargetRef,
      suppliedInputs: routerBackedListDetailStringIdentitySuppliedInputs,
    },
  },
});
assert.equal(routerBackedListDetailStringIdentitySourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
const stringIdentityStateSource = routerBackedListDetailStringIdentitySourcePlanAnswer.value.sourcePlan?.files
  .find((file) => file.path === 'src/note-item-browse-state.ts')?.text?.text ?? '';
assert.match(
  stringIdentityStateSource,
  /noteItem\.code === code/,
  'Expected string RouterBackedListDetail identity lookup to compare the string member directly.',
);
assert.doesNotMatch(
  stringIdentityStateSource,
  /String\(noteItem\.code\)/,
  'Expected string RouterBackedListDetail identity lookup not to add generic String(...) projection.',
);
const routerBackedListDetailInvalidSeedSuppliedInputs = [
  ...routerBackedListDetailSuppliedInputs.filter((input) =>
    input.inputContractId !== AppBuilderInputContractId.SeedData
  ),
  {
    inputContractId: AppBuilderInputContractId.SeedData,
    sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.SeedRecordSet,
      value: [{
        id: 'task-1',
        title: 'String id should not satisfy a numeric identity domain',
        done: false,
      }],
    }],
  },
];
const routerBackedListDetailInvalidSeedSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    sourceLoweringRouterBackedListDetail: {
      targetRef: routerBackedListDetailTargetRef,
      suppliedInputs: routerBackedListDetailInvalidSeedSuppliedInputs,
      includePreflight: true,
    },
  },
});
assert.equal(routerBackedListDetailInvalidSeedSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  routerBackedListDetailInvalidSeedSourcePlanAnswer.value.sourcePlan,
  null,
  'Expected invalid seed identity type to block direct RouterBackedListDetail source-plan generation.',
);
assert.ok(
  routerBackedListDetailInvalidSeedSourcePlanAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringSourcePlanIssueKind.SeedRecordInvalidIdentityValueKind
    && issue.inputFacetId === AppBuilderInputFacetId.SeedRecordSet
  ),
  'Expected seed record identity values to be validated against the explicit domain identity value kind.',
);
const diStateClassSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    includeSourcePlanWitnessRows: true,
    includeSourceLoweringResultDetails: true,
    sourceLoweringDiStateClass: {
      targetRef: diStateClassTargetRef,
      suppliedInputs: diStateClassSuppliedInputs,
      includePreflight: true,
    },
  },
});
assert.equal(diStateClassSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(diStateClassSourcePlanAnswer.value.rootDir, 'sample-state-app');
assert.equal(diStateClassSourcePlanAnswer.value.templatePath, null);
assert.equal(diStateClassSourcePlanAnswer.value.sourceTargetPath, 'src/task-state.ts');
assert.equal(diStateClassSourcePlanAnswer.value.sourceLoweringDiStateClass?.stateModelPath, 'src/task-state.ts');
assert.equal(diStateClassSourcePlanAnswer.value.sourceLoweringDiStateClass?.domain?.entityTypeName, 'TaskItem');
assert.equal(diStateClassSourcePlanAnswer.value.sourceLoweringDiStateClass?.seedRecords.length, 1);
assert.equal(diStateClassSourcePlanAnswer.value.sourcePlan?.files.length, 1);
assert.equal(diStateClassSourcePlanAnswer.value.sourcePlan?.files[0]?.path, 'src/task-state.ts');
assert.equal(diStateClassSourcePlanAnswer.value.sourcePlan?.files[0]?.role, SourcePlanFileRole.StateModel);
assert.match(
  diStateClassSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /export class TaskItem[\s\S]*export class TaskItemState[\s\S]*readonly taskItems: TaskItem\[\] = \[[\s\S]*new TaskItem\(1, 'First task', false\)/,
  'Expected direct DiStateClass SourcePlan lowering to emit a typed entity class and seeded DI state collection in one explicit state file.',
);
assert.ok(
  diStateClassSourcePlanAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.DiStateClass
  ),
  'Expected direct DiStateClass SourcePlan lowering to expose the DiStateClass app-builder ontology target.',
);
assert.ok(
  diStateClassSourcePlanAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview),
  'Expected direct DiStateClass SourcePlan lowering to expose SourcePlan preview effect contracts.',
);
assert.deepEqual(
  diStateClassSourcePlanAnswer.value.expectedEffectKinds,
  [],
  'Expected direct DiStateClass SourcePlan lowering to defer reopen expected effects until DI/state-class effects are modeled deliberately.',
);
assert.ok(
  diStateClassSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.FileArtifact
    && row.filePath === 'src/task-state.ts'
    && row.fileRole === SourcePlanFileRole.StateModel
  ),
  'Expected direct DiStateClass SourcePlan answer to expose compact state-model SourcePlan witnesses.',
);
const localViewModelStateSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    includeSourcePlanWitnessRows: true,
    includeSourceLoweringResultDetails: true,
    sourceLoweringLocalViewModelState: {
      targetRef: localViewModelStateTargetRef,
      suppliedInputs: localViewModelStateSuppliedInputs,
      includePreflight: true,
    },
  },
});
assert.equal(localViewModelStateSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(localViewModelStateSourcePlanAnswer.value.rootDir, 'sample-local-state-app');
assert.equal(localViewModelStateSourcePlanAnswer.value.templatePath, null);
assert.equal(localViewModelStateSourcePlanAnswer.value.sourceTargetPath, 'src/local-state.ts');
assert.equal(localViewModelStateSourcePlanAnswer.value.sourceLoweringLocalViewModelState?.componentPath, 'src/local-state.ts');
assert.equal(localViewModelStateSourcePlanAnswer.value.sourceLoweringLocalViewModelState?.className, 'LocalState');
assert.equal(localViewModelStateSourcePlanAnswer.value.sourceLoweringLocalViewModelState?.fields.length, 3);
assert.equal(localViewModelStateSourcePlanAnswer.value.sourcePlan?.files.length, 1);
assert.equal(localViewModelStateSourcePlanAnswer.value.sourcePlan?.files[0]?.path, 'src/local-state.ts');
assert.equal(localViewModelStateSourcePlanAnswer.value.sourcePlan?.files[0]?.role, SourcePlanFileRole.Component);
assert.match(
  localViewModelStateSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /export type LocalStatePriority = 'low' \| 'normal';[\s\S]*export class LocalState[\s\S]*title: string = '';[\s\S]*done: boolean = false;[\s\S]*priority: LocalStatePriority = 'low';/,
  'Expected direct LocalViewModelState SourcePlan lowering to emit typed local view-model fields from explicit domain field input.',
);
assert.ok(
  localViewModelStateSourcePlanAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.LocalViewModelState
  ),
  'Expected direct LocalViewModelState SourcePlan lowering to expose the LocalViewModelState app-builder ontology target.',
);
assert.ok(
  localViewModelStateSourcePlanAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview),
  'Expected direct LocalViewModelState SourcePlan lowering to expose SourcePlan preview effect contracts.',
);
assert.deepEqual(
  localViewModelStateSourcePlanAnswer.value.expectedEffectKinds,
  [],
  'Expected direct LocalViewModelState SourcePlan lowering to defer reopen expected effects until local component reopen contracts are modeled deliberately.',
);
assert.ok(
  localViewModelStateSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.FileArtifact
    && row.filePath === 'src/local-state.ts'
    && row.fileRole === SourcePlanFileRole.Component
  ),
  'Expected direct LocalViewModelState SourcePlan answer to expose compact component SourcePlan witnesses.',
);
const missingLocalViewModelStatePolicySourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    sourceLoweringLocalViewModelState: {
      targetRef: localViewModelStateTargetRef,
      suppliedInputs: localViewModelStateSuppliedInputsWithoutStatePolicy,
      includePreflight: true,
    },
  },
});
assert.equal(missingLocalViewModelStatePolicySourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  missingLocalViewModelStatePolicySourcePlanAnswer.value.sourcePlan,
  null,
  'Expected direct LocalViewModelState SourcePlan lowering not to invent scalar local state when local state policy is absent.',
);
assert.ok(
  missingLocalViewModelStatePolicySourcePlanAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringSourcePlanIssueKind.MissingStatePolicy
    && issue.inputFacetId === AppBuilderInputFacetId.AureliaStatePolicy
  ),
  'Expected direct LocalViewModelState SourcePlan lowering to report missing explicit local state policy.',
);
const inconsistentAppShellSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    sourceLoweringAppShell: {
      targetRef: appShellTargetRef,
      suppliedInputs: [{
        inputContractId: AppBuilderInputContractId.SourcePlacement,
        sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
        facetPayloads: [{
          inputFacetId: AppBuilderInputFacetId.SourceRoot,
          value: 'sample-app',
        }, {
          inputFacetId: AppBuilderInputFacetId.SourceNaming,
          value: { appName: 'Sample App' },
        }, {
          inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
          value: { resourceCarrier: AppBuilderResourceCarrier.Convention },
        }],
      }, {
        inputContractId: AppBuilderInputContractId.AureliaPolicy,
        sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
        facetPayloads: [{
          inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
          value: AppBuilderConventionPolicy.ExplicitResourceDeclarations,
        }],
      }],
    },
  },
});
assert.equal(inconsistentAppShellSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(inconsistentAppShellSourcePlanAnswer.value.sourcePlan, null);
assert.ok(
  inconsistentAppShellSourcePlanAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringSourcePlanIssueKind.InconsistentConventionCarrier
  ),
  'Expected direct AppShell SourcePlan lowering to reject convention carrier under explicit-resource declaration policy.',
);
const sourcePlacementSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.SourcePlacement,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.SourceRoot,
    value: 'sample-app',
  }, {
    inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
    value: 'src/create-task.html',
  }],
}];
const suppliedPlacementSourcePlanQuery = {
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    suppliedInputs: sourcePlacementSuppliedInputs,
    sourceLoweringComposition: {
      targetRef: nativeSubmitFormTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
      suppliedInputs: nativeSubmitFormSuppliedInputs,
      fieldNames: ['title', 'done'],
      bindingRootExpression: 'draft',
      actionName: 'create',
      submitButtonText: 'Create',
    },
  },
};
const suppliedPlacementSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery(suppliedPlacementSourcePlanQuery);
assert.equal(suppliedPlacementSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(suppliedPlacementSourcePlanAnswer.value.rootDir, 'sample-app');
assert.equal(suppliedPlacementSourcePlanAnswer.value.templatePath, 'src/create-task.html');
assert.equal(suppliedPlacementSourcePlanAnswer.value.sourcePlan?.files[0]?.path, 'src/create-task.html');
assert.equal(
  suppliedPlacementSourcePlanAnswer.value.issues.length,
  0,
  'Expected SourcePlan preview to consume supplied SourceRoot and SourceTargetPath facets without raw transport fields.',
);
const continuedSuppliedPlacementSourcePlanAnswer = withSemanticRuntimeAppBuilderQueryContinuations(
  suppliedPlacementSourcePlanQuery,
  suppliedPlacementSourcePlanAnswer,
);
assert.ok(
  continuedSuppliedPlacementSourcePlanAnswer.continuations?.some((row) => {
    const suppliedInputs = row.targetAppBuilderQuery?.applicationPatternDetail?.suppliedInputs;
    return suppliedInputs?.some((input) => input.inputContractId === AppBuilderInputContractId.SourcePlacement) === true
      && suppliedInputs.some((input) => input.inputContractId === AppBuilderInputContractId.DomainModel);
  }) === true,
  'Expected SourcePlan preview detail continuations to retain both wrapper placement inputs and nested source-lowering inputs.',
);
const conflictingPlacementSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    rootDir: 'other-app',
    templatePath: 'src/create-task.html',
    suppliedInputs: sourcePlacementSuppliedInputs,
    sourceLoweringComposition: {
      targetRef: nativeSubmitFormTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
      suppliedInputs: nativeSubmitFormSuppliedInputs,
      fieldNames: ['title', 'done'],
      bindingRootExpression: 'draft',
      actionName: 'create',
      submitButtonText: 'Create',
    },
  },
});
assert.equal(conflictingPlacementSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(conflictingPlacementSourcePlanAnswer.value.sourcePlan, null);
assert.ok(
  conflictingPlacementSourcePlanAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringSourcePlanIssueKind.ConflictingSourceRoot
    && issue.inputFacetId === AppBuilderInputFacetId.SourceRoot
  ),
  'Expected SourcePlan preview to reject conflicting rootDir and SourceRoot placement inputs.',
);
const nativeSubmitFormSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    includeSourcePlanWitnessRows: true,
    includeControlUseInventoryRows: true,
    includeSourcePlanContributions: true,
    rootDir: 'sample-app',
    templatePath: 'src/create-task.html',
    sourceLoweringComposition: {
      targetRef: nativeSubmitFormTargetRef,
      compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
      suppliedInputs: nativeSubmitFormSuppliedInputs,
      fieldNames: ['title', 'done'],
      bindingRootExpression: 'draft',
      actionName: 'create',
      submitButtonText: 'Create',
    },
  },
});
assert.equal(nativeSubmitFormSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(nativeSubmitFormSourcePlanAnswer.value.sourcePlan?.rootDir, 'sample-app');
assert.equal(nativeSubmitFormSourcePlanAnswer.value.sourcePlan?.files.length, 1);
assert.equal(nativeSubmitFormSourcePlanAnswer.value.sourcePlan?.files[0]?.path, 'src/create-task.html');
assert.equal(nativeSubmitFormSourcePlanAnswer.value.sourcePlan?.files[0]?.role, SourcePlanFileRole.Template);
assert.equal(nativeSubmitFormSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.authority, SourcePlanTextAuthority.AppBuilderGenerated);
assert.match(
  nativeSubmitFormSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /<form submit\.trigger="create\(\)">/,
  'Expected app-builder SourcePlan preview to carry generated form source text.',
);
assert.ok(
  nativeSubmitFormSourcePlanAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview),
  'Expected app-builder SourcePlan preview to expose the SourcePlan preview effect contract.',
);
assert.ok(
  nativeSubmitFormSourcePlanAnswer.value.controlUseInventoryRows.some((row) =>
    row.controlPatternId === AppBuilderControlPatternId.FieldGroup
    && row.fieldName === 'title'
  )
  && nativeSubmitFormSourcePlanAnswer.value.controlUseInventoryRows.some((row) =>
    row.sourceReference.sourceKind === AppBuilderControlUseInventorySourceKind.SourceLoweringComposition
    && row.controlPatternId === AppBuilderControlPatternId.NativeButton
    && row.actionChannelKind === AppBuilderControlUseActionChannelKind.ContainingFormSubmit
  ),
  'Expected app-builder SourcePlan preview to aggregate generated field and submit-button control-use rows.',
);
assert.ok(
  nativeSubmitFormSourcePlanAnswer.value.sourcePlan?.files[0]?.contributions.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderSourceLoweringComposition
  ) === true,
  'Expected app-builder SourcePlan preview to preserve top-level source-lowering composition origins.',
);
assert.ok(
  nativeSubmitFormSourcePlanAnswer.value.sourcePlan?.files[0]?.contributions.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderPartSourceInvocation
  ) === true,
  'Expected app-builder SourcePlan preview to preserve delegated part-source origins.',
);
assert.ok(
  nativeSubmitFormSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.Policy
    && row.rootDir === 'sample-app'
    && row.hasCompleteFileText === true
  )
  && nativeSubmitFormSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.FileArtifact
    && row.filePath === 'src/create-task.html'
    && row.fileRole === SourcePlanFileRole.Template
    && row.textAuthority === SourcePlanTextAuthority.AppBuilderGenerated
  )
  && nativeSubmitFormSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.Contribution
    && row.contributionKind === SourcePlanContributionKind.SourceFragment
    && row.contributionOriginKind === SourcePlanContributionOriginKind.AppBuilderSourceLoweringComposition
  )
  && nativeSubmitFormSourcePlanAnswer.value.sourcePlanWitnessRows.some((row) =>
    row.rowKind === AppBuilderSourcePlanWitnessRowKind.Contribution
    && row.contributionKind === SourcePlanContributionKind.SourceFragment
    && row.contributionOriginKind === SourcePlanContributionOriginKind.AppBuilderPartSourceInvocation
  ),
  'Expected app-builder SourcePlan preview to expose compact SourcePlan witness rows for file and contribution effects.',
);
const visualNativeSubmitFormCompositionAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    suppliedInputs: [...nativeSubmitFormSuppliedInputs, {
      inputContractId: AppBuilderInputContractId.VisualStyleInput,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
        value: [{
          target: AppBuilderSourceLoweringVisualHookTarget.Form,
          classTokens: ['form', 'form--create'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
          fieldName: 'title',
          classTokens: ['field'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.Button,
          actionName: 'create',
          classTokens: ['button', 'button--primary'],
        }],
      }],
    }],
    fieldNames: ['title'],
    bindingRootExpression: 'draft',
    actionName: 'create',
    submitButtonText: 'Create',
  },
});
assert.equal(visualNativeSubmitFormCompositionAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.match(
  visualNativeSubmitFormCompositionAnswer.value.fragments[0]?.text ?? '',
  /<form submit\.trigger="create\(\)" class="form form--create">/,
  'Expected source-lowering composition to spend form visual hooks on the composed form element.',
);
assert.match(
  visualNativeSubmitFormCompositionAnswer.value.fragments[0]?.text ?? '',
  /<div class="field">/,
  'Expected source-lowering composition to pass field visual hooks into member field-group invocations.',
);
assert.match(
  visualNativeSubmitFormCompositionAnswer.value.fragments[0]?.text ?? '',
  /<button type="submit" class="button button--primary">Create<\/button>/,
  'Expected source-lowering composition to spend action-scoped button visual hooks on the submit button.',
);
const continuedNativeSubmitFormCompositionAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  sourceLoweringComposition: {
    targetRef: nativeSubmitFormTargetRef,
    compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
    suppliedInputs: nativeSubmitFormSuppliedInputs,
    fieldNames: ['title', 'done'],
    bindingRootExpression: 'draft',
    actionName: 'create',
    submitButtonText: 'Create',
  },
}, nativeSubmitFormCompositionAnswer);
assert.ok(
  continuedNativeSubmitFormCompositionAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.EffectContractDetail
    && row.targetAppBuilderQuery?.effectContractDetail?.effectContractIds?.includes(AppBuilderEffectContractId.SourcePlanPreview)
    && row.targetAppBuilderQuery.effectContractDetail.effectContractIds.includes(AppBuilderEffectContractId.ControlUseInventory)
  ) === true,
  'Expected source-lowering composition continuations to expose effect-contract detail for generated fragments.',
);
assert.ok(
  continuedNativeSubmitFormCompositionAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail
    && row.targetAppBuilderQuery?.applicationPatternDetail?.applicationPatternIds?.includes(AppBuilderApplicationPatternId.NativeSubmitForm)
  ) === true,
  'Expected source-lowering composition continuations to expose detail for the top-level source-lowering pattern.',
);
assert.ok(
  continuedNativeSubmitFormCompositionAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail
    && row.targetAppBuilderQuery?.controlPatternDetail?.controlPatternIds?.includes(AppBuilderControlPatternId.FieldGroup)
  ) === true,
  'Expected source-lowering composition continuations to expose detail for member source-lowering control targets.',
);

const invalidPayloadPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{ name: 'title', valueKind: 'not-a-field-kind' }],
      }],
    }],
  },
});
assert.equal(invalidPayloadPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  invalidPayloadPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.InvalidSuppliedPayload,
  'Expected invalid facet payloads to block source-lowering preflight before missing-input fallback.',
);
assert.ok(
  invalidPayloadPreflightAnswer.value.issues.some((issue) =>
    issue.inputReadinessIssue?.issueKind === AppBuilderInputReadinessIssueKind.InvalidSuppliedInputPayload
  ),
  'Expected source-lowering preflight to bridge invalid payload issues from input-readiness.',
);
const invalidVisualHookPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.VisualStyleInput,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
        value: [{
          target: AppBuilderSourceLoweringVisualHookTarget.FieldControl,
          classTokens: ['not a single class token'],
        }],
      }],
    }],
  },
});
assert.equal(invalidVisualHookPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  invalidVisualHookPreflightAnswer.value.rows[0]?.inputGateState,
  AppBuilderSourceLoweringInputGateState.InvalidSuppliedPayload,
  'Expected invalid visual class-token payloads to block source-lowering preflight through the shared schema validator.',
);

const nativeTextSourceSuppliedInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }],
  }],
}];
const nativeTextSourceInvocationQuery = {
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    },
    suppliedInputs: nativeTextSourceSuppliedInputs,
  },
};
const nativeTextSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery(nativeTextSourceInvocationQuery);
assert.equal(nativeTextSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeTextSourceInvocationAnswer.value.fieldSelectionState,
  AppBuilderSourceLoweringFieldSelectionState.SingleCompatibleField,
  'Expected source invocation to disclose when it selected the only compatible field.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.bindingExpressionSource,
  AppBuilderSourceLoweringBindingExpressionSource.SelectedFieldName,
  'Expected source invocation to disclose when it used the selected field name as the binding expression.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.labelTextSource,
  AppBuilderSourceLoweringLabelTextSource.SelectedFieldTitle,
  'Expected standalone native controls to disclose when the selected field title supplied the accessible name.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.fragments[0]?.text,
  '<input value.bind="title" aria-label="Title">',
  'Expected source-lowering invocation to lower native text input through the part source callback and spend the selected field title as aria-label.',
);
const targetScopedNativeTextDecisionBundle = {
  sourceId: AppBuilderDecisionBundleSource.ExplicitCallerSelection,
  label: 'target-scoped native text source input',
  decisions: [{
    inputContractId: AppBuilderInputContractId.DomainModel,
    inputFacetIds: [AppBuilderInputFacetId.DomainFields],
    targetRefs: [{
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    }],
    facetPayloads: [{
      inputFacetId: AppBuilderInputFacetId.DomainFields,
      value: [{
        name: 'title',
        title: 'Title',
        valueKind: AppBuilderDomainFieldValueKind.Text,
      }],
    }],
  }],
};
const targetScopedNativeTextSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    },
    decisionBundles: [targetScopedNativeTextDecisionBundle],
  },
});
assert.equal(targetScopedNativeTextSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  targetScopedNativeTextSourceInvocationAnswer.value.fragments[0]?.text,
  '<input value.bind="title" aria-label="Title">',
  'Expected source-lowering invocation to spend decision-bundle inputs scoped to its target.',
);
const targetScopedNativeNumberSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeNumberInput,
    },
    decisionBundles: [targetScopedNativeTextDecisionBundle],
  },
});
assert.equal(targetScopedNativeNumberSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  targetScopedNativeNumberSourceInvocationAnswer.value.preflightRow?.inputGateState,
  AppBuilderSourceLoweringInputGateState.MissingRequiredInput,
  'Expected source-lowering invocation not to spend a decision-bundle input scoped to another target.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.fragments[0]?.origin?.kind,
  AppBuilderSourceFragmentOriginKind.PartSourceInvocation,
  'Expected direct native-control fragments to preserve the delegated part-source origin.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.fragments[0]?.origin?.partId,
  AppBuilderControlId.TextInput,
  'Expected direct native-control part origin to identify the concrete control lowerer.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.controlUseInventoryRows.length,
  1,
  'Expected direct native-control source lowering to emit one generated control-use inventory row.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.controlUseInventoryRows[0]?.sourceReference.sourceKind,
  AppBuilderControlUseInventorySourceKind.SourceLoweringInvocation,
  'Expected direct native-control inventory rows to identify source-lowering invocation as their source boundary.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.controlUseInventoryRows[0]?.controlId,
  AppBuilderControlId.TextInput,
  'Expected direct native-control inventory rows to preserve the leaf control id.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.controlUseInventoryRows[0]?.fieldName,
  'title',
  'Expected direct native-control inventory rows to preserve the selected field name.',
);
assert.equal(
  nativeTextSourceInvocationAnswer.value.controlUseInventoryRows[0]?.labelTextSource,
  AppBuilderSourceLoweringLabelTextSource.SelectedFieldTitle,
  'Expected direct native-control inventory rows to preserve standalone accessible-name provenance.',
);
const continuedNativeTextSourceInvocationAnswer = withSemanticRuntimeAppBuilderQueryContinuations(
  nativeTextSourceInvocationQuery,
  nativeTextSourceInvocationAnswer,
);
assert.ok(
  continuedNativeTextSourceInvocationAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan
    && row.targetAppBuilderQuery?.sourceLoweringSourcePlan?.sourceLoweringInvocation?.targetRef?.id === AppBuilderControlPatternId.NativeTextInput
  ) === true,
  'Expected invocation-backed source fragments to continue to SourcePlan preview with the same nested invocation payload.',
);
const nativeTextSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    rootDir: 'sample-app',
    templatePath: 'src/title-field.html',
    includeSourcePlanContributions: true,
    sourceLoweringInvocation: {
      targetRef: {
        kind: AppBuilderOntologyRowKind.ControlPattern,
        domain: AppBuilderOntologyDomain.Control,
        id: AppBuilderControlPatternId.NativeTextInput,
      },
      suppliedInputs: nativeTextSourceSuppliedInputs,
    },
  },
});
assert.equal(nativeTextSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.match(
  nativeTextSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /<input value\.bind="title" aria-label="Title">/,
  'Expected SourcePlan preview to wrap invocation-backed native controls into template file text.',
);
assert.ok(
  nativeTextSourcePlanAnswer.value.sourcePlan?.files[0]?.contributions.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderPartSourceInvocation
  ) === true,
  'Expected invocation-backed SourcePlan preview to preserve delegated part-source origins.',
);
const nativeRangeMissingConstraintInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeRangeInput,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'progress',
          title: 'Progress',
          valueKind: AppBuilderDomainFieldValueKind.Number,
        }],
      }],
    }],
  },
});
assert.equal(nativeRangeMissingConstraintInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  nativeRangeMissingConstraintInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.TargetRequirementIssue
    && issue.sourceLoweringPreflightIssue?.issueKind === AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement
    && issue.sourceLoweringPreflightIssue.numericConstraintIssue?.fieldNames?.includes('progress') === true
  ),
  'Expected range source lowering to bridge preflight target requirements for explicit min/max/step facts instead of rediscovering them locally.',
);
const nativeRangeSelectedFieldMissingConstraintInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeRangeInput,
    },
    fieldName: 'progress',
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'progress',
          title: 'Progress',
          valueKind: AppBuilderDomainFieldValueKind.Number,
        }, {
          name: 'score',
          title: 'Score',
          valueKind: AppBuilderDomainFieldValueKind.Number,
          numericConstraints: {
            minimum: 0,
            maximum: 100,
            step: 5,
          },
        }],
      }],
    }],
  },
});
assert.equal(nativeRangeSelectedFieldMissingConstraintInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  nativeRangeSelectedFieldMissingConstraintInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.MissingNumericRangeConstraints
    && issue.fieldNames?.includes('progress') === true
  ),
  'Expected range invocation to keep selected-field numeric constraint validation after target-level preflight is satisfied by another field.',
);
const nativeRangeSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeRangeInput,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'progress',
          title: 'Progress',
          valueKind: AppBuilderDomainFieldValueKind.Number,
          numericConstraints: {
            minimum: 0,
            maximum: 100,
            step: 5,
          },
        }],
      }],
    }],
  },
});
assert.equal(nativeRangeSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeRangeSourceInvocationAnswer.value.fragments[0]?.text,
  '<input type="range" value-as-number.bind="progress" min="0" max="100" step="5" aria-label="Progress">',
  'Expected range source lowering to spend typed numeric constraints and the selected field title as native/accessibility attributes.',
);
assert.deepEqual(
  nativeRangeSourceInvocationAnswer.value.partInvocation?.slotAssignments?.map((slot) => slot.slotKind),
  [
    AppBuilderPartSlotKind.BindingExpression,
    AppBuilderPartSlotKind.NumericMinimum,
    AppBuilderPartSlotKind.NumericMaximum,
    AppBuilderPartSlotKind.NumericStep,
  ],
  'Expected range source-lowering invocation to delegate through typed numeric part slots rather than string-splicing attributes.',
);
const visualHookInput = {
  inputContractId: AppBuilderInputContractId.VisualStyleInput,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
    value: [{
      target: AppBuilderSourceLoweringVisualHookTarget.FieldControl,
      fieldName: 'title',
      classTokens: ['field-control', 'field-control--title'],
      dataAttributes: [{ name: 'data-au-field', value: 'title' }],
    }, {
      target: AppBuilderSourceLoweringVisualHookTarget.FieldControl,
      fieldName: 'summary',
      classTokens: ['field-control--summary'],
    }],
  }],
};
const visualNativeTextSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }, visualHookInput],
  },
});
assert.equal(visualNativeTextSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  visualNativeTextSourceInvocationAnswer.value.fragments[0]?.text,
  '<input value.bind="title" class="field-control field-control--title" data-au-field="title" aria-label="Title">',
  'Expected visual class hooks to attach caller-supplied class/data hooks to the selected native control without inventing CSS.',
);
assert.equal(
  visualNativeTextSourceInvocationAnswer.value.preflightRow?.inputReadiness.invalidPayloadCount ?? 0,
  0,
  'Expected visual class-hook payloads to validate through the shared input-readiness schema.',
);

const nativeSingleSelectSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeSingleSelect,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'priority',
          title: 'Priority',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
          options: [
            { value: 'low', title: 'Low' },
            { value: 'high', title: 'High' },
          ],
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.DomainValueSets,
        value: [{
          name: 'priorityOptions',
          title: 'Priorities',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
          options: [
            { value: 'low', title: 'Low' },
            { value: 'high', title: 'High' },
          ],
        }],
      }],
    }],
  },
});
assert.equal(nativeSingleSelectSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeSingleSelectSourceInvocationAnswer.value.fieldSelectionState,
  AppBuilderSourceLoweringFieldSelectionState.SingleCompatibleField,
  'Expected choice source invocation to select the only compatible choice field.',
);
assert.equal(
  nativeSingleSelectSourceInvocationAnswer.value.partInvocation?.slotAssignments?.some((slot) =>
    slot.slotKind === AppBuilderPartSlotKind.ValueDomainExpression
    && slot.value === 'priorityOptions'
  ),
  true,
  'Expected choice source invocation to derive the finite option-domain expression from the selected field.',
);
assert.equal(
  nativeSingleSelectSourceInvocationAnswer.value.valueDomainExpressionSource,
  AppBuilderSourceLoweringValueDomainExpressionSource.FieldOptions,
  'Expected field-local options to be reported as the value-domain expression source.',
);
assert.equal(
  nativeSingleSelectSourceInvocationAnswer.value.fragments[0]?.text,
  '<select value.bind="priority" aria-label="Priority">\n  <option repeat.for="option of priorityOptions" model.bind="option.value">${option.title}</option>\n</select>',
  'Expected source-lowering invocation to lower native single-select through the choice-control part callback and spend the selected field title as aria-label.',
);

const explicitChoiceSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeSingleSelect,
    },
    fieldName: 'priority',
    bindingExpression: 'draft.priority',
    valueDomainExpression: 'state.priorityOptions',
    optionLocalName: 'choice',
    optionValueExpression: 'choice.id',
    optionBindingKind: AppBuilderChoiceOptionBindingKind.Value,
    optionLabelExpression: 'choice.label',
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'priority',
          title: 'Priority',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.DomainValueSets,
        value: [{
          name: 'priorityOptions',
          title: 'Priorities',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
          options: [
            { value: 'low', title: 'Low' },
            { value: 'high', title: 'High' },
          ],
        }],
      }],
    }],
  },
});
assert.equal(explicitChoiceSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  explicitChoiceSourceInvocationAnswer.value.fragments[0]?.text,
  '<select value.bind="draft.priority" aria-label="Priority">\n  <option repeat.for="choice of state.priorityOptions" value.bind="choice.id">${choice.label}</option>\n</select>',
  'Expected explicit choice source slots to override derived option-domain, local, value, binding-kind, and label expressions while retaining selected-field accessible-name fallback.',
);
assert.equal(
  explicitChoiceSourceInvocationAnswer.value.valueDomainExpressionSource,
  AppBuilderSourceLoweringValueDomainExpressionSource.ExplicitRequest,
  'Expected explicit valueDomainExpression to be reported as the value-domain source.',
);

const valueSetBackedChoiceSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeSingleSelect,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'priority',
          title: 'Priority',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
          valueSetName: 'priorityOptions',
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.DomainValueSets,
        value: [{
          name: 'priorityOptions',
          title: 'Priorities',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
          options: [
            { value: 'low', title: 'Low' },
            { value: 'high', title: 'High' },
          ],
        }],
      }],
    }],
  },
});
assert.equal(valueSetBackedChoiceSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  valueSetBackedChoiceSourceInvocationAnswer.value.valueDomainExpression,
  'priorityOptions',
  'Expected a field-named reusable value set to supply the value-domain expression.',
);
assert.equal(
  valueSetBackedChoiceSourceInvocationAnswer.value.valueDomainExpressionSource,
  AppBuilderSourceLoweringValueDomainExpressionSource.FieldValueSetName,
  'Expected valueSetName on the selected field to be reported as value-domain provenance.',
);
assert.equal(
  valueSetBackedChoiceSourceInvocationAnswer.value.selectedValueSet?.name,
  'priorityOptions',
  'Expected reusable value-set selection to be visible on the invocation answer.',
);

const missingChoiceValueDomainInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeSingleSelect,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'priority',
          title: 'Priority',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
        }],
      }, {
        inputFacetId: AppBuilderInputFacetId.DomainValueSets,
        value: [],
      }],
    }],
  },
});
assert.equal(missingChoiceValueDomainInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingChoiceValueDomainInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.MissingValueDomainExpression
  ),
  'Expected choice source invocation to ask for valueDomainExpression, field options, or a compatible value set rather than invent an option-domain source.',
);

const explicitBindingSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    },
    fieldName: 'title',
    bindingExpression: 'draft.title',
    labelText: 'Issue title',
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }, {
          name: 'summary',
          title: 'Summary',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }],
  },
});
assert.equal(explicitBindingSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  explicitBindingSourceInvocationAnswer.value.fieldSelectionState,
  AppBuilderSourceLoweringFieldSelectionState.ExplicitFieldName,
  'Expected source invocation to accept explicit field selection when multiple compatible fields exist.',
);
assert.equal(
  explicitBindingSourceInvocationAnswer.value.bindingExpressionSource,
  AppBuilderSourceLoweringBindingExpressionSource.ExplicitRequest,
  'Expected source invocation to disclose caller-supplied binding expressions.',
);
assert.equal(
  explicitBindingSourceInvocationAnswer.value.labelTextSource,
  AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
  'Expected source invocation to disclose caller-supplied standalone accessible-name text.',
);
assert.equal(
  explicitBindingSourceInvocationAnswer.value.fragments[0]?.text,
  '<input value.bind="draft.title" aria-label="Issue title">',
  'Expected source invocation to spend the explicit binding expression and direct labelText.',
);

const ambiguousSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeTextInput,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }, {
          name: 'summary',
          title: 'Summary',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }],
  },
});
assert.equal(ambiguousSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  ambiguousSourceInvocationAnswer.value.fieldSelectionState,
  AppBuilderSourceLoweringFieldSelectionState.AmbiguousCompatibleField,
  'Expected source invocation to refuse hidden field selection when multiple compatible fields exist.',
);
assert.ok(
  ambiguousSourceInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.AmbiguousDomainField
    && issue.fieldNames?.includes('title') === true
    && issue.fieldNames?.includes('summary') === true
  ),
  'Expected ambiguous source invocation to report the candidate field names.',
);

const domainCommandActionTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.DomainCommandAction,
};
const domainCommandActionInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    value: [{
      name: 'save',
      kind: AppBuilderDomainActionKind.Save,
      scope: AppBuilderDomainActionScope.Form,
      mutatesState: true,
    }],
  }],
}];
const domainCommandActionPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [domainCommandActionTargetRef],
    suppliedInputs: domainCommandActionInputs,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(domainCommandActionPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  domainCommandActionPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected domain command action preflight to open once domain-actions input is supplied; method body remains an invocation request field.',
);
assert.deepEqual(
  targetInvocationRequestFieldPairs(domainCommandActionPreflightAnswer.value.rows[0]),
  [
    [AppBuilderSourceLoweringRequestFieldId.ActionName, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodParameters, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.TypeScriptMethodBodyStatements, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCallResultMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCallArgumentExpressions, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceQueryStateValueExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceQueryReloadMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCallRefreshMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected domain command action preflight to disclose actionName, optional methodParameters, conditional methodBodyStatements, structured service-call derivation fields, and query-state refresh fields rather than inventing arbitrary behavior.',
);
const missingDomainCommandBodyAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: domainCommandActionTargetRef,
    suppliedInputs: domainCommandActionInputs,
    actionName: 'save',
  },
});
assert.equal(missingDomainCommandBodyAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingDomainCommandBodyAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.MissingMethodBodyStatements
  ),
  'Expected domain command action source lowering to reject missing methodBodyStatements instead of emitting no-op behavior.',
);
const routeNavigationActionTargetRef = {
  kind: AppBuilderOntologyRowKind.ApplicationPattern,
  domain: AppBuilderOntologyDomain.ApplicationPattern,
  id: AppBuilderApplicationPatternId.RouteNavigationAction,
};
const routeNavigationActionInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    value: [{
      name: 'openTask',
      kind: AppBuilderDomainActionKind.Custom,
      scope: AppBuilderDomainActionScope.Navigation,
      mutatesState: false,
    }],
  }],
}, {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.AureliaRoutingPolicy,
    value: {
      routerAdmission: AppBuilderRouterAdmissionPolicy.RouterConfiguration,
      areaNavigationPolicies: [AppBuilderAreaNavigationPolicy.RouterDrivenViewSelection],
    },
  }],
}];
const routeNavigationActionPreflightAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  sourceLoweringPreflight: {
    targetRefs: [routeNavigationActionTargetRef],
    suppliedInputs: routeNavigationActionInputs,
    includeSourceLoweringRequestFields: true,
  },
});
assert.equal(routeNavigationActionPreflightAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  routeNavigationActionPreflightAnswer.value.rows[0]?.canRequestSourceLowering,
  true,
  'Expected route navigation action preflight to open once navigation action and router policy input are supplied.',
);
assert.deepEqual(
  targetInvocationRequestFieldPairs(routeNavigationActionPreflightAnswer.value.rows[0]),
  [
    [AppBuilderSourceLoweringRequestFieldId.ActionName, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.RouteInstruction, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.LinkText, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.RouteParamsExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.RouteContextExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.RouteActiveExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.RouteTargetAttributeName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
  ],
  'Expected route navigation action preflight to disclose route/link fields rather than reusing command method fields.',
);
const routeNavigationInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: routeNavigationActionTargetRef,
    suppliedInputs: routeNavigationActionInputs,
    actionName: 'openTask',
    routeInstruction: 'task-item-detail',
    routeParamsExpression: '{ taskId: taskItem.id }',
    linkText: 'Open task',
  },
});
assert.equal(routeNavigationInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  routeNavigationInvocationAnswer.value.selectedAction?.action.scope,
  AppBuilderDomainActionScope.Navigation,
  'Expected route navigation source lowering to spend an explicitly navigation-scoped domain action.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.routeInstruction,
  'task-item-detail',
  'Expected route navigation source lowering to report the exact route instruction it spent.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.fragments[0]?.kind,
  AppBuilderPartSourceFragmentKind.TemplateElement,
  'Expected route navigation source lowering to emit a template-element anchor fragment.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.fragments[0]?.text,
  '<a load="route: task-item-detail; params.bind: { taskId: taskItem.id }">Open task</a>',
  'Expected route navigation source lowering to emit an Aurelia router load link with caller-owned visible text.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.fragments[0]?.origin?.targetId,
  AppBuilderApplicationPatternId.RouteNavigationAction,
  'Expected route navigation fragments to carry the route-navigation application-pattern source origin.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.controlUseInventoryRows.length,
  1,
  'Expected route navigation source lowering to emit a generated link-navigation control-use row.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.controlUseInventoryRows[0]?.controlPatternId,
  AppBuilderControlPatternId.NativeLinkNavigation,
  'Expected route navigation source lowering to classify the generated anchor as native link navigation.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.controlUseInventoryRows[0]?.actionChannelKind,
  AppBuilderControlUseActionChannelKind.RouterLoadNavigation,
  'Expected route navigation source lowering to preserve router-load navigation as the action channel.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.controlUseInventoryRows[0]?.routeInstruction,
  'route: task-item-detail; params.bind: { taskId: taskItem.id }',
  'Expected route navigation source lowering to preserve the rendered router load instruction on the generated control-use row.',
);
assert.equal(
  routeNavigationInvocationAnswer.value.controlUseInventoryRows[0]?.linkText,
  'Open task',
  'Expected route navigation source lowering to preserve caller-owned link text on the generated control-use row.',
);
const incompatibleRouteNavigationInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: routeNavigationActionTargetRef,
    suppliedInputs: [domainCommandActionInputs[0], routeNavigationActionInputs[1]],
    actionName: 'save',
    routeInstruction: 'task-item-detail',
    linkText: 'Open task',
  },
});
assert.equal(incompatibleRouteNavigationInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  incompatibleRouteNavigationInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.IncompatibleNavigationAction
  ),
  'Expected route navigation source lowering to reject non-navigation-scoped domain actions instead of treating commands as route links.',
);
const derivedCreateDomainCommandActionInputs = [{
  inputContractId: AppBuilderInputContractId.DomainModel,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.DomainEntities,
    value: {
      entityTitle: 'Task',
      entityTypeName: 'TaskItem',
      collectionMemberName: 'taskItems',
      identityMemberName: 'id',
      identityValueKind: AppBuilderDomainIdentityValueKind.Number,
    },
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainFields,
    value: [{
      name: 'title',
      title: 'Title',
      valueKind: AppBuilderDomainFieldValueKind.Text,
    }, {
      name: 'done',
      title: 'Done',
      valueKind: AppBuilderDomainFieldValueKind.Boolean,
    }],
  }, {
    inputFacetId: AppBuilderInputFacetId.DomainActions,
    value: [{
      name: 'create',
      kind: AppBuilderDomainActionKind.Create,
      scope: AppBuilderDomainActionScope.Form,
      mutatesState: true,
    }],
  }],
}, {
  inputContractId: AppBuilderInputContractId.AureliaPolicy,
  sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
  facetPayloads: [{
    inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
    value: {
      localStatePolicies: [
        AppBuilderLocalStatePolicy.ViewModelLocalState,
        AppBuilderLocalStatePolicy.ViewModelLocalCollection,
      ],
    },
  }],
}];
const derivedCreateDomainCommandActionInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: domainCommandActionTargetRef,
    suppliedInputs: derivedCreateDomainCommandActionInputs,
    actionName: 'create',
  },
});
assert.equal(derivedCreateDomainCommandActionInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  derivedCreateDomainCommandActionInvocationAnswer.value.fragments[0]?.text,
  "create() {\n  const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;\n  this.taskItems.push(new TaskItem(nextId, this.title, this.done));\n  this.title = '';\n  this.done = false;\n}",
  'Expected first-ring local create command lowering to derive numeric-id collection push and input reset behavior from domain, field, and local collection inputs.',
);
const derivedCompleteDomainCommandActionInputs = [structuredClone(derivedCreateDomainCommandActionInputs[0]), derivedCreateDomainCommandActionInputs[1]];
derivedCompleteDomainCommandActionInputs[0].facetPayloads = derivedCompleteDomainCommandActionInputs[0].facetPayloads.map((payload) =>
  payload.inputFacetId === AppBuilderInputFacetId.DomainActions
    ? {
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'complete',
          kind: AppBuilderDomainActionKind.Complete,
          scope: AppBuilderDomainActionScope.Entity,
          mutatesState: true,
        }],
      }
    : payload
);
const derivedCompleteDomainCommandActionInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: domainCommandActionTargetRef,
    suppliedInputs: derivedCompleteDomainCommandActionInputs,
    actionName: 'complete',
    methodParameters: [{ name: 'taskItem', typeText: 'TaskItem' }],
  },
});
assert.equal(derivedCompleteDomainCommandActionInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  derivedCompleteDomainCommandActionInvocationAnswer.value.fragments[0]?.text,
  'complete(taskItem: TaskItem) {\n  taskItem.done = true;\n}',
  'Expected first-ring entity-complete command lowering to derive the single boolean row mutation from domain, action, and local collection inputs.',
);
const domainCommandActionInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: domainCommandActionTargetRef,
    suppliedInputs: domainCommandActionInputs,
    actionName: 'save',
    methodBodyStatements: 'this.saved = true;',
  },
});
assert.equal(domainCommandActionInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  domainCommandActionInvocationAnswer.value.actionSelectionState,
  AppBuilderSourceLoweringActionSelectionState.ExplicitActionName,
  'Expected command-action method lowering to require explicit action selection rather than selecting the only candidate.',
);
assert.equal(
  domainCommandActionInvocationAnswer.value.fragments[0]?.kind,
  AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
  'Expected command-action method lowering to produce a TypeScript class-member fragment.',
);
assert.equal(
  domainCommandActionInvocationAnswer.value.fragments[0]?.text,
  'save() {\n  this.saved = true;\n}',
  'Expected command-action method lowering to wrap caller-owned TypeScript statements in the selected method name.',
);
assert.equal(
  domainCommandActionInvocationAnswer.value.fragments[0]?.origin?.kind,
  AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation,
  'Expected command-action method fragments to carry app-builder source-lowering origin.',
);
assert.equal(
  domainCommandActionInvocationAnswer.value.fragments[0]?.origin?.targetId,
  AppBuilderApplicationPatternId.DomainCommandAction,
  'Expected command-action source origin to identify the exact application-pattern target.',
);
assert.equal(
  domainCommandActionInvocationAnswer.value.controlUseInventoryRows.length,
  0,
  'Expected command-action method lowering not to emit control-use inventory rows; button/form source owns those.',
);
const parameterizedDomainCommandActionInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: domainCommandActionTargetRef,
    suppliedInputs: domainCommandActionInputs,
    actionName: 'save',
    methodParameters: [{ name: 'draft', typeText: 'TaskDraft' }],
    methodBodyStatements: 'this.saved = draft.valid;',
  },
});
assert.equal(parameterizedDomainCommandActionInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(
  parameterizedDomainCommandActionInvocationAnswer.value.methodParameters,
  [{ name: 'draft', typeText: 'TaskDraft' }],
  'Expected command-action method lowering to report the caller-owned TypeScript method parameters it spent.',
);
assert.equal(
  parameterizedDomainCommandActionInvocationAnswer.value.fragments[0]?.text,
  'save(draft: TaskDraft) {\n  this.saved = draft.valid;\n}',
  'Expected command-action method lowering to emit explicit caller-owned TypeScript method parameters.',
);
const componentPairSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    rootDir: 'sample-component-app',
    templatePath: 'src/create-task.html',
    includeSourceLoweringResultDetails: true,
    includeSourcePlanContributions: true,
    includeSourceLoweringRequestFields: true,
    sourceLoweringComponentPair: {
      suppliedInputs: [
        ...nativeSubmitFormSuppliedInputs,
        {
          inputContractId: AppBuilderInputContractId.SourcePlacement,
          sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
          facetPayloads: [{
            inputFacetId: AppBuilderInputFacetId.SourceNaming,
            value: { baseName: 'Create Task' },
          }, {
            inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
            value: { resourceCarrier: AppBuilderResourceCarrier.Convention },
          }, {
            inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
            value: 'src/create-task.ts',
          }],
        },
        {
          inputContractId: AppBuilderInputContractId.AureliaPolicy,
          sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
          facetPayloads: [{
            inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
            value: AppBuilderConventionPolicy.ConventionsEnabled,
          }, {
            inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
            value: {
              localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
            },
          }],
        },
        {
          inputContractId: AppBuilderInputContractId.DomainModel,
          sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
          facetPayloads: [{
            inputFacetId: AppBuilderInputFacetId.DomainFields,
            value: [{
              name: 'priority',
              title: 'Priority',
              valueKind: AppBuilderDomainFieldValueKind.Choice,
              options: [
                { value: 'low', title: 'Low' },
                { value: 'normal', title: 'Normal' },
              ],
            }],
          }],
        },
      ],
      sourceLoweringLocalViewModelState: {
        targetRef: localViewModelStateTargetRef,
      },
      sourceLoweringComposition: {
        targetRef: nativeSubmitFormTargetRef,
        compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
        fieldNames: ['title', 'done'],
        actionName: 'create',
        submitButtonText: 'Create',
      },
      sourceLoweringClassMemberInvocations: [{
        targetRef: domainCommandActionTargetRef,
        actionName: 'create',
        methodBodyStatements: "this.title = '';\nthis.done = false;",
      }],
    },
  },
});
assert.equal(componentPairSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(componentPairSourcePlanAnswer.value.sourceLoweringComponentPair?.componentPath, 'src/create-task.ts');
assert.equal(componentPairSourcePlanAnswer.value.sourceLoweringComponentPair?.templatePath, 'src/create-task.html');
assert.equal(componentPairSourcePlanAnswer.value.sourceLoweringComponentPair?.className, 'CreateTask');
assert.equal(componentPairSourcePlanAnswer.value.sourcePlan?.files.length, 2);
assert.equal(componentPairSourcePlanAnswer.value.sourcePlan?.files[0]?.role, SourcePlanFileRole.Component);
assert.equal(componentPairSourcePlanAnswer.value.sourcePlan?.files[1]?.role, SourcePlanFileRole.Template);
assert.match(
  componentPairSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /export type CreateTaskPriority = 'low' \| 'normal';[\s\S]*export class CreateTask \{[\s\S]*priorityOptions:[\s\S]*= \[[\s\S]*priority: CreateTaskPriority = 'low';[\s\S]*create\(\) \{[\s\S]*this\.title = '';[\s\S]*this\.done = false;[\s\S]*\}/,
  'Expected component-pair SourcePlan to insert local state declarations and caller-owned command method statements into the generated component class.',
);
assert.match(
  componentPairSourcePlanAnswer.value.sourcePlan?.files[1]?.text?.text ?? '',
  /<form submit\.trigger="create\(\)">[\s\S]*<button type="submit">Create<\/button>[\s\S]*<\/form>/,
  'Expected component-pair SourcePlan to emit the template composition as companion HTML file text.',
);
assert.ok(
  componentPairSourcePlanAnswer.value.sourcePlan?.files[0]?.contributions.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderSourceLoweringInvocation
    && contribution.origin.targetId === AppBuilderApplicationPatternId.DomainCommandAction
  ) === true,
  'Expected component-pair TypeScript file to preserve DomainCommandAction source-lowering origin.',
);
assert.ok(
  componentPairSourcePlanAnswer.value.sourcePlan?.files[0]?.contributions.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderSourceLoweringTarget
    && contribution.origin.targetId === AppBuilderApplicationPatternId.LocalViewModelState
  ) === true,
  'Expected component-pair TypeScript file to preserve LocalViewModelState direct source-lowering target origin.',
);
assert.ok(
  componentPairSourcePlanAnswer.value.sourcePlan?.files[1]?.contributions.some((contribution) =>
    contribution.kind === SourcePlanContributionKind.SourceFragment
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AppBuilderSourceLoweringComposition
    && contribution.origin.targetId === AppBuilderApplicationPatternId.NativeSubmitForm
  ) === true,
  'Expected component-pair template file to preserve NativeSubmitForm source-lowering composition origin.',
);
assert.ok(
  componentPairSourcePlanAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.NativeSubmitForm
  )
  && componentPairSourcePlanAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.DomainCommandAction
  )
  && componentPairSourcePlanAnswer.value.sourceLoweringTargetRefs.some((ref) =>
    ref.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && ref.id === AppBuilderApplicationPatternId.LocalViewModelState
  ),
  'Expected component-pair SourcePlan to spend the template composition, local state, and class-member command targets.',
);
assert.ok(
  componentPairSourcePlanAnswer.value.effectContractIds.includes(AppBuilderEffectContractId.SourcePlanPreview),
  'Expected component-pair SourcePlan answer to include the SourcePlan preview effect contract at the public boundary.',
);
assert.deepEqual(
  componentPairSourcePlanAnswer.value.sourceLoweringRequestFields.map((field) => [field.fieldId, field.requirementKind]),
  [
    [AppBuilderSourceLoweringRequestFieldId.RootDir, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.SourceTargetPath, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.TemplatePath, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.SourceLoweringComponentPair, AppBuilderSourceLoweringRequestFieldRequirementKind.Required],
    [AppBuilderSourceLoweringRequestFieldId.SourceLoweringTemplateInvocations, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ComponentPairServiceCollections, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionSourceTargetPath, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionClassName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionComponentMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionEntityName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionRecordTypeName, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionLoadMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethods, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterFieldName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterParameterName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionFilterPredicateKind, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethods, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionCreateInputFieldNames, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethods, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionUpdateInputFieldNames, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStates, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryControls, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateTypeText, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInitialValueExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryStateInactiveValueExpression, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryReloadMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryResultMemberName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryFilterMethodName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyActionName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryApplyButtonText, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearActionName, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
    [AppBuilderSourceLoweringRequestFieldId.ServiceCollectionQueryClearButtonText, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional],
  ],
  'Expected component-pair SourcePlan answer to expose its assembly-level request fields without pretending they are target-owned fields.',
);
assert.equal(
  componentPairSourcePlanAnswer.value.sourceLoweringRequestFieldSummary.requiredCount,
  4,
  'Expected component-pair SourcePlan summary to count rootDir, sourceTargetPath, templatePath, and the component-pair envelope as required assembly fields.',
);
assert.deepEqual(
  componentPairSourcePlanAnswer.value.sourceLoweringRequestFieldSummary.surfaces.map((surface) =>
    [surface.surfaceKind, surface.requiredRequestFieldNames]
  ),
  [[
    AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview,
    ['rootDir', 'sourceTargetPath', 'templatePath', 'sourceLoweringComponentPair'],
  ]],
  'Expected component-pair SourcePlan summary to keep assembly request fields on the SourcePlan-preview surface.',
);
const componentPairAppShellSourcePlanAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  sourceLoweringSourcePlan: {
    rootDir: 'sample-component-app-shell',
    templatePath: 'src/create-task.html',
    includeSourceLoweringResultDetails: true,
    sourceLoweringComponentPair: {
      appShell: {
        entrypointPath: 'src/main.ts',
      },
      suppliedInputs: [
        ...nativeSubmitFormSuppliedInputs,
        {
          inputContractId: AppBuilderInputContractId.SourcePlacement,
          sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
          facetPayloads: [{
            inputFacetId: AppBuilderInputFacetId.SourceNaming,
            value: {
              appName: 'Task Creator',
              baseName: 'Create Task',
            },
          }, {
            inputFacetId: AppBuilderInputFacetId.SourceFileLayout,
            value: { resourceCarrier: AppBuilderResourceCarrier.Convention },
          }, {
            inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
            value: 'src/create-task.ts',
          }],
        },
        {
          inputContractId: AppBuilderInputContractId.AureliaPolicy,
          sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
          facetPayloads: [{
            inputFacetId: AppBuilderInputFacetId.AureliaConventionPolicy,
            value: AppBuilderConventionPolicy.ConventionsEnabled,
          }, {
            inputFacetId: AppBuilderInputFacetId.AureliaStatePolicy,
            value: {
              localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
            },
          }],
        },
      ],
      sourceLoweringLocalViewModelState: {
        targetRef: localViewModelStateTargetRef,
      },
      sourceLoweringComposition: {
        targetRef: nativeSubmitFormTargetRef,
        compositionKind: AppBuilderSourceLoweringCompositionKind.NativeSubmitForm,
        fieldNames: ['title', 'done'],
        actionName: 'create',
        submitButtonText: 'Create',
      },
      sourceLoweringClassMemberInvocations: [{
        targetRef: domainCommandActionTargetRef,
        actionName: 'create',
        methodBodyStatements: "this.title = '';\nthis.done = false;",
      }],
    },
  },
});
assert.equal(componentPairAppShellSourcePlanAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(componentPairAppShellSourcePlanAnswer.value.sourceLoweringComponentPair?.appShell?.appName, 'Task Creator');
assert.equal(componentPairAppShellSourcePlanAnswer.value.sourcePlan?.files.length, 3);
assert.equal(componentPairAppShellSourcePlanAnswer.value.sourcePlan?.files[0]?.role, SourcePlanFileRole.Entrypoint);
assert.equal(componentPairAppShellSourcePlanAnswer.value.sourcePlan?.files[1]?.role, SourcePlanFileRole.RootComponent);
assert.equal(componentPairAppShellSourcePlanAnswer.value.sourcePlan?.files[2]?.role, SourcePlanFileRole.Template);
assert.match(
  componentPairAppShellSourcePlanAnswer.value.sourcePlan?.files[0]?.text?.text ?? '',
  /import \{ CreateTask \} from '\.\/create-task';[\s\S]*Aurelia[\s\S]*\.app\(CreateTask\)[\s\S]*\.start\(\);/,
  'Expected component-pair app shell SourcePlan to register the generated component pair as the Aurelia root component.',
);
assert.ok(
  componentPairAppShellSourcePlanAnswer.value.expectedEffectKinds.includes(ExpectedSemanticEffectKind.ProjectShape),
  'Expected component-pair app shell SourcePlan to advertise reopenable app-shell expected effects.',
);
assert.ok(
  componentPairAppShellSourcePlanAnswer.value.sourcePlan?.projectTooling != null,
  'Expected component-pair app shell SourcePlan to carry app-builder baseline project tooling.',
);

const nativeButtonSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeButton,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'save',
          kind: AppBuilderDomainActionKind.Save,
          scope: AppBuilderDomainActionScope.Form,
          mutatesState: true,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityLabels,
        value: {
          label: 'Save',
        },
      }, {
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Save the current draft.',
        },
      }],
    }],
  },
});
assert.equal(nativeButtonSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.actionSelectionState,
  AppBuilderSourceLoweringActionSelectionState.SingleCompatibleAction,
  'Expected native button invocation to select the only supplied domain action.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.handlerExpression,
  'save()',
  'Expected native button invocation to derive a zero-argument handler call from a TypeScript-safe action name.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.handlerExpressionSource,
  AppBuilderSourceLoweringHandlerExpressionSource.SelectedActionName,
  'Expected native button invocation to report handler-expression provenance.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.buttonText,
  'Save',
  'Expected native button invocation to spend the supplied accessibility label as button text.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.buttonType,
  AppBuilderSourceLoweringButtonType.Button,
  'Expected native button invocation to default event-handler buttons to type=button.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.fragments[0]?.text,
  '<button type="button" click.trigger="save()">Save</button>',
  'Expected native button invocation to lower through the event-listener part callback and compose an explicit non-submit native button element.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.fragments[0]?.origin?.kind,
  AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation,
  'Expected composed native-button fragments to carry app-builder source-lowering origin rather than the delegated event-attribute part origin.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.fragments[0]?.origin?.targetId,
  AppBuilderControlPatternId.NativeButton,
  'Expected native-button source-lowering origin to identify the exact source-lowering control-pattern target.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.controlUseInventoryRows[0]?.controlPatternId,
  AppBuilderControlPatternId.NativeButton,
  'Expected native-button source lowering to emit a native-button control-use row.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.controlUseInventoryRows[0]?.actionChannelKind,
  AppBuilderControlUseActionChannelKind.DirectControlEvent,
  'Expected native-button event-handler rows to identify direct control event channels.',
);
assert.equal(
  nativeButtonSourceInvocationAnswer.value.controlUseInventoryRows[0]?.buttonType,
  AppBuilderSourceLoweringButtonType.Button,
  'Expected native-button inventory rows to preserve the explicit/defaulted native button type.',
);
const visualNativeButtonSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeButton,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'save',
          kind: AppBuilderDomainActionKind.Save,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityLabels,
        value: {
          label: 'Save',
        },
      }],
    }, {
      inputContractId: AppBuilderInputContractId.VisualStyleInput,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
        value: [{
          target: AppBuilderSourceLoweringVisualHookTarget.Button,
          actionName: 'save',
          classTokens: ['button', 'button--primary'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.Button,
          actionName: 'cancel',
          classTokens: ['button--secondary'],
        }],
      }],
    }],
  },
});
assert.equal(visualNativeButtonSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  visualNativeButtonSourceInvocationAnswer.value.fragments[0]?.text,
  '<button type="button" click.trigger="save()" class="button button--primary">Save</button>',
  'Expected native button source lowering to spend action-scoped visual hooks without applying unrelated action hooks.',
);

const missingButtonTextSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeButton,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'save',
          kind: AppBuilderDomainActionKind.Save,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
    }],
  },
});
assert.equal(missingButtonTextSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  missingButtonTextSourceInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.MissingButtonText
  ),
  'Expected native button invocation to reject coarse accessibility markers that do not provide visible button text.',
);

const directButtonTextSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeButton,
    },
    buttonText: 'Save',
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'save',
          kind: AppBuilderDomainActionKind.Save,
        }],
      }],
    }],
  },
});
assert.equal(directButtonTextSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  directButtonTextSourceInvocationAnswer.value.fragments[0]?.text,
  '<button type="button" click.trigger="save()">Save</button>',
  'Expected direct buttonText to satisfy the accessibility input gate without a redundant supplied accessibility marker.',
);

const submitButtonSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeButton,
    },
    buttonText: 'Save',
    buttonType: AppBuilderSourceLoweringButtonType.Submit,
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'save',
          kind: AppBuilderDomainActionKind.Save,
        }],
      }],
    }],
  },
});
assert.equal(submitButtonSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  submitButtonSourceInvocationAnswer.value.buttonType,
  AppBuilderSourceLoweringButtonType.Submit,
  'Expected native button invocation to spend caller-selected submit button type when explicitly requested.',
);
assert.equal(
  submitButtonSourceInvocationAnswer.value.fragments[0]?.text,
  '<button type="submit" click.trigger="save()">Save</button>',
  'Expected explicit submit button type to be reflected in generated button source.',
);

const unknownButtonTypeSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.NativeButton,
    },
    buttonText: 'Save',
    buttonType: 'primary-submit',
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainActions,
        value: [{
          name: 'save',
          kind: AppBuilderDomainActionKind.Save,
        }],
      }],
    }],
  },
});
assert.equal(unknownButtonTypeSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  unknownButtonTypeSourceInvocationAnswer.value.buttonType,
  AppBuilderSourceLoweringButtonType.Button,
  'Expected unknown button types to preserve the safe default in the partial answer.',
);
assert.ok(
  unknownButtonTypeSourceInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.UnknownButtonType
    && issue.requestedButtonType === 'primary-submit'
  ),
  'Expected native button invocation to report the raw unknown buttonType value without passing it into generated source.',
);

const formMessageSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FormMessage,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Use a short, memorable title.',
          helpId: 'title-help',
        },
      }],
    }],
  },
});
assert.equal(formMessageSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  formMessageSourceInvocationAnswer.value.messageKind,
  AppBuilderSourceLoweringMessageKind.Help,
  'Expected form-message invocation to select the only available accessibility message kind.',
);
assert.equal(
  formMessageSourceInvocationAnswer.value.messageSelectionState,
  AppBuilderSourceLoweringMessageSelectionState.SinglePayloadMessage,
  'Expected form-message invocation to report payload-derived message-kind selection.',
);
assert.equal(
  formMessageSourceInvocationAnswer.value.messageTextSource,
  AppBuilderSourceLoweringMessageTextSource.AccessibilityHelpErrorPayload,
  'Expected form-message invocation to report accessibility payload message-text provenance.',
);
assert.equal(
  formMessageSourceInvocationAnswer.value.fragments[0]?.text,
  '<p id="title-help">Use a short, memorable title.</p>',
  'Expected form-message invocation to lower a help message with a caller-supplied id.',
);
assert.equal(
  formMessageSourceInvocationAnswer.value.fragments[0]?.origin?.kind,
  AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation,
  'Expected composed form-message fragments to carry app-builder source-lowering origin.',
);

const explicitErrorMessageInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FormMessage,
    },
    messageKind: AppBuilderSourceLoweringMessageKind.Error,
    messageText: 'Title is required.',
    messageId: 'title-error',
  },
});
assert.equal(explicitErrorMessageInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  explicitErrorMessageInvocationAnswer.value.messageSelectionState,
  AppBuilderSourceLoweringMessageSelectionState.ExplicitMessageKind,
  'Expected explicit form-message invocation to report explicit message-kind selection.',
);
assert.equal(
  explicitErrorMessageInvocationAnswer.value.messageTextSource,
  AppBuilderSourceLoweringMessageTextSource.ExplicitRequest,
  'Expected explicit form-message invocation to report caller-supplied message text.',
);
assert.equal(
  explicitErrorMessageInvocationAnswer.value.fragments[0]?.text,
  '<p id="title-error" role="alert">Title is required.</p>',
  'Expected explicit error form-message invocation to include alert role and caller-supplied id.',
);

const unknownMessageKindInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FormMessage,
    },
    messageKind: 'hint',
    messageText: 'Use a short, memorable title.',
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Use a short, memorable title.',
        },
      }],
    }],
  },
});
assert.equal(unknownMessageKindInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  unknownMessageKindInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.UnknownRequestedMessageKind
    && issue.requestedMessageKind === 'hint'
  ),
  'Expected form-message invocation to report the raw unknown messageKind value without spending it as a candidate kind.',
);

const ambiguousFormMessageInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FormMessage,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Choose one.',
          errorText: 'A choice is required.',
        },
      }],
    }],
  },
});
assert.equal(ambiguousFormMessageInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(
  ambiguousFormMessageInvocationAnswer.value.messageSelectionState,
  AppBuilderSourceLoweringMessageSelectionState.AmbiguousPayloadMessage,
  'Expected form-message invocation not to choose between multiple supplied message roles.',
);
assert.ok(
  ambiguousFormMessageInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.AmbiguousMessageText
    && issue.messageKinds?.includes(AppBuilderSourceLoweringMessageKind.Help) === true
    && issue.messageKinds.includes(AppBuilderSourceLoweringMessageKind.Error) === true
  ),
  'Expected ambiguous form-message invocation to report candidate message kinds.',
);

const fieldGroupSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FieldGroup,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Use a short, memorable title.',
          helpId: 'title-help',
        },
      }],
    }],
  },
});
assert.equal(fieldGroupSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  fieldGroupSourceInvocationAnswer.value.innerControlPatternId,
  AppBuilderControlPatternId.NativeTextInput,
  'Expected field-group invocation to derive the native text input from the selected text field value kind.',
);
assert.equal(
  fieldGroupSourceInvocationAnswer.value.innerControlSelectionState,
  AppBuilderSourceLoweringInnerControlSelectionState.SelectedFieldValueKind,
  'Expected field-group invocation to report field-value-kind inner-control selection.',
);
assert.equal(
  fieldGroupSourceInvocationAnswer.value.labelTextSource,
  AppBuilderSourceLoweringLabelTextSource.SelectedFieldTitle,
  'Expected field-group invocation to use the field title as label text when no explicit accessibility label is supplied.',
);
assert.equal(
  fieldGroupSourceInvocationAnswer.value.fieldControlIdSource,
  AppBuilderSourceLoweringFieldControlIdSource.SelectedFieldName,
  'Expected field-group invocation to report deterministic control-id derivation from the selected field.',
);
assert.deepEqual(
  fieldGroupSourceInvocationAnswer.value.describedByIds,
  ['title-help'],
  'Expected field-group invocation to attach supplied help message id through aria-describedby.',
);
assert.equal(
  fieldGroupSourceInvocationAnswer.value.fragments[0]?.text,
  `<div>
  <label for="title-field">Title</label>
  <input value.bind="title" id="title-field" aria-describedby="title-help">
  <p id="title-help">Use a short, memorable title.</p>
</div>`,
  'Expected field-group invocation to compose label, inner native control, and help message without reparsing source.',
);
assert.equal(
  fieldGroupSourceInvocationAnswer.value.fragments[0]?.origin?.kind,
  AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation,
  'Expected field-group wrapper fragments to carry app-builder source-lowering origin.',
);
assert.equal(
  fieldGroupSourceInvocationAnswer.value.fragments[0]?.origin?.innerControlPatternId,
  AppBuilderControlPatternId.NativeTextInput,
  'Expected field-group source-lowering origin to preserve the selected inner control-pattern identity.',
);
assert.equal(
  fieldGroupSourceInvocationAnswer.value.controlUseInventoryRows.length,
  2,
  'Expected field-group source lowering to emit wrapper and generated message control-use inventory rows.',
);
const fieldGroupWrapperInventoryRow = fieldGroupSourceInvocationAnswer.value.controlUseInventoryRows.find((row) =>
  row.controlPatternId === AppBuilderControlPatternId.FieldGroup
);
const fieldGroupMessageInventoryRow = fieldGroupSourceInvocationAnswer.value.controlUseInventoryRows.find((row) =>
  row.controlPatternId === AppBuilderControlPatternId.FormMessage
);
assert.equal(
  fieldGroupWrapperInventoryRow?.controlPatternId,
  AppBuilderControlPatternId.FieldGroup,
  'Expected field-group inventory rows to preserve the wrapper control-pattern identity.',
);
assert.equal(
  fieldGroupWrapperInventoryRow?.innerControlPatternId,
  AppBuilderControlPatternId.NativeTextInput,
  'Expected field-group inventory rows to preserve the inner native control-pattern identity.',
);
assert.deepEqual(
  fieldGroupWrapperInventoryRow?.describedByIds,
  ['title-help'],
  'Expected field-group inventory rows to preserve help/error relationship ids.',
);
assert.equal(
  fieldGroupMessageInventoryRow?.sourceReference.targetRef.id,
  AppBuilderControlPatternId.FormMessage,
  'Expected field-group message inventory rows to preserve the generated message target identity.',
);
assert.equal(
  fieldGroupMessageInventoryRow?.messageKind,
  AppBuilderSourceLoweringMessageKind.Help,
  'Expected field-group message inventory rows to preserve generated help-message kind.',
);
assert.equal(
  fieldGroupMessageInventoryRow?.messageText,
  'Use a short, memorable title.',
  'Expected field-group message inventory rows to preserve generated help-message text.',
);
assert.equal(
  fieldGroupMessageInventoryRow?.messageTextSource,
  AppBuilderSourceLoweringMessageTextSource.AccessibilityHelpErrorPayload,
  'Expected field-group message inventory rows to preserve generated help-message text provenance.',
);
assert.equal(
  fieldGroupMessageInventoryRow?.messageId,
  'title-help',
  'Expected field-group message inventory rows to preserve generated help-message DOM id.',
);
const unknownInnerControlPatternSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FieldGroup,
    },
    innerControlPatternId: 'native-slider-with-label',
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Use a short, memorable title.',
          helpId: 'title-help',
        },
      }],
    }],
  },
});
assert.equal(unknownInnerControlPatternSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.ok(
  unknownInnerControlPatternSourceInvocationAnswer.value.issues.some((issue) =>
    issue.issueKind === AppBuilderSourceLoweringInvocationIssueKind.UnknownInnerControlPattern
    && issue.requestedInnerControlPatternId === 'native-slider-with-label'
  ),
  'Expected field-group invocation to report the raw unknown inner control pattern without spending it as a candidate pattern.',
);
const visualFieldGroupSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FieldGroup,
    },
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }, {
      inputContractId: AppBuilderInputContractId.ControlAccessibility,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.AccessibilityHelpError,
        value: {
          helpText: 'Use a short, memorable title.',
          helpId: 'title-help',
        },
      }],
    }, {
      inputContractId: AppBuilderInputContractId.VisualStyleInput,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.VisualClassHooks,
        value: [{
          target: AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
          fieldName: 'title',
          classTokens: ['field'],
          dataAttributes: [{ name: 'data-au-field-group', value: 'title' }],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.FieldLabel,
          fieldName: 'title',
          classTokens: ['field__label'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.FieldControl,
          fieldName: 'title',
          classTokens: ['field__control'],
        }, {
          target: AppBuilderSourceLoweringVisualHookTarget.FieldMessage,
          fieldName: 'title',
          classTokens: ['field__message'],
        }],
      }],
    }],
  },
});
assert.equal(visualFieldGroupSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  visualFieldGroupSourceInvocationAnswer.value.fragments[0]?.text,
  `<div class="field" data-au-field-group="title">
  <label for="title-field" class="field__label">Title</label>
  <input value.bind="title" class="field__control" id="title-field" aria-describedby="title-help">
  <p id="title-help" class="field__message">Use a short, memorable title.</p>
</div>`,
  'Expected field-group source lowering to spend field-scoped visual hooks on wrapper, label, control, and message elements.',
);

const directLabelFieldGroupSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FieldGroup,
    },
    labelText: 'Issue title',
    includePreflight: true,
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'title',
          title: 'Title',
          valueKind: AppBuilderDomainFieldValueKind.Text,
        }],
      }],
    }],
  },
});
assert.equal(directLabelFieldGroupSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  directLabelFieldGroupSourceInvocationAnswer.value.labelTextSource,
  AppBuilderSourceLoweringLabelTextSource.ExplicitRequest,
  'Expected direct field-group labelText to be reported as explicit label provenance.',
);
assert.equal(
  directLabelFieldGroupSourceInvocationAnswer.value.preflightRow?.inputReadiness.satisfiedCount,
  1,
  'Expected direct labelText not to hide the remaining recommended accessibility-help/error facet in the dependency-level readiness count.',
);
assert.equal(
  directLabelFieldGroupSourceInvocationAnswer.value.preflightRow?.inputReadiness.missingRecommendedCount,
  2,
  'Expected direct labelText to leave the partial accessibility dependency and visual style as missing recommended dependencies.',
);
const directLabelAccessibilityDependency = directLabelFieldGroupSourceInvocationAnswer.value.preflightRow?.inputDependencies?.find((row) =>
  row.inputContract.id === AppBuilderInputContractId.ControlAccessibility
);
assert.ok(
  directLabelAccessibilityDependency?.suppliedInputFacetIds.includes(AppBuilderInputFacetId.AccessibilityLabels) === true,
  'Expected direct labelText to appear as a supplied AccessibilityLabels facet inside the accessibility dependency row.',
);
assert.ok(
  directLabelAccessibilityDependency?.missingInputFacetIds.includes(AppBuilderInputFacetId.AccessibilityHelpError) === true,
  'Expected direct labelText not to pretend accessibility help/error text was supplied.',
);

const choiceFieldGroupSourceInvocationAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  sourceLoweringInvocation: {
    targetRef: {
      kind: AppBuilderOntologyRowKind.ControlPattern,
      domain: AppBuilderOntologyDomain.Control,
      id: AppBuilderControlPatternId.FieldGroup,
    },
    fieldName: 'priority',
    suppliedInputs: [{
      inputContractId: AppBuilderInputContractId.DomainModel,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.DomainFields,
        value: [{
          name: 'priority',
          title: 'Priority',
          valueKind: AppBuilderDomainFieldValueKind.Choice,
          options: [
            { value: 'low', title: 'Low' },
            { value: 'high', title: 'High' },
          ],
        }],
      }],
    }],
  },
});
assert.equal(choiceFieldGroupSourceInvocationAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(
  choiceFieldGroupSourceInvocationAnswer.value.innerControlPatternId,
  AppBuilderControlPatternId.NativeSingleSelect,
  'Expected field-group invocation to derive native single-select for a choice field.',
);
assert.equal(
  choiceFieldGroupSourceInvocationAnswer.value.valueDomainExpressionSource,
  AppBuilderSourceLoweringValueDomainExpressionSource.FieldOptions,
  'Expected wrapped choice control to reuse existing field-option value-domain derivation.',
);
assert.ok(
  choiceFieldGroupSourceInvocationAnswer.value.fragments[0]?.text.includes('<select value.bind="priority" id="priority-field">'),
  'Expected wrapped choice control to preserve the generated native select element and append the field id.',
);
assert.ok(
  choiceFieldGroupSourceInvocationAnswer.value.fragments[0]?.text.includes('repeat.for="option of priorityOptions"'),
  'Expected wrapped choice control to preserve option-domain repeat lowering.',
);

const continuedTargetCatalogAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.Affordance],
    includeInputReadiness: false,
  },
  page: { size: 2 },
}, answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.Affordance],
    includeInputReadiness: false,
  },
  page: { size: 2 },
}));
assert.ok(
  continuedTargetCatalogAnswer.continuations?.some((row) =>
    row.kind === 'next-page'
    && row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.TargetCatalog
    && row.targetAppBuilderQuery?.page?.cursor === continuedTargetCatalogAnswer.page?.nextCursor
  ) === true,
  'Expected paged app-builder target-catalog answers to expose typed targetAppBuilderQuery next-page continuations.',
);
assert.ok(
  continuedTargetCatalogAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.AffordanceDetail
    && row.targetAppBuilderQuery?.affordanceDetail?.affordanceIds?.length === 2
  ) === true,
  'Expected target-catalog affordance rows to expose grouped affordance-detail continuations.',
);
assert.ok(
  continuedTargetCatalogAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputReadiness
    && row.targetAppBuilderQuery?.inputReadiness?.targetRefs?.length === 2
  ) === true,
  'Expected target-catalog rows without readiness to expose an input-readiness continuation for returned targets.',
);
const continuedManifestTargetCatalogAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.ControlManifest],
    includeInputReadiness: false,
  },
  page: { size: 2 },
}, answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.ControlManifest],
    includeInputReadiness: false,
  },
  page: { size: 2 },
}));
assert.ok(
  continuedManifestTargetCatalogAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail
    && row.targetAppBuilderQuery?.controlManifestDetail?.controlManifestIds?.length === 2
  ) === true,
  'Expected target-catalog control-manifest rows to expose grouped control-manifest-detail continuations.',
);
const continuedControlRealizationPolicyTargetCatalogAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.ControlRealizationPolicy],
    includeInputReadiness: false,
  },
  page: { size: 2 },
}, answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.ControlRealizationPolicy],
    includeInputReadiness: false,
  },
  page: { size: 2 },
}));
assert.ok(
  continuedControlRealizationPolicyTargetCatalogAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail
    && row.targetAppBuilderQuery?.controlPatternDetail?.controlRealizationPolicyIds?.length === 2
  ) === true,
  'Expected target-catalog control-realization-policy rows to expose grouped control-pattern-detail continuations.',
);
const expectedDetailQueryByRowKind = new Map([
  [AppBuilderOntologyRowKind.InputContract, SemanticRuntimeAppBuilderQueryKind.InputContractDetail],
  [AppBuilderOntologyRowKind.InputFacet, SemanticRuntimeAppBuilderQueryKind.InputContractDetail],
  [AppBuilderOntologyRowKind.PolicyAxis, SemanticRuntimeAppBuilderQueryKind.PolicyDetail],
  [AppBuilderOntologyRowKind.EffectContract, SemanticRuntimeAppBuilderQueryKind.EffectContractDetail],
  [AppBuilderOntologyRowKind.Affordance, SemanticRuntimeAppBuilderQueryKind.AffordanceDetail],
  [AppBuilderOntologyRowKind.ApplicationPattern, SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail],
  [AppBuilderOntologyRowKind.CollectionConcept, SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail],
  [AppBuilderOntologyRowKind.ControlPattern, SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail],
  [AppBuilderOntologyRowKind.ControlRealizationPolicy, SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail],
  [AppBuilderOntologyRowKind.ControlManifest, SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail],
  [AppBuilderOntologyRowKind.StylingMechanism, SemanticRuntimeAppBuilderQueryKind.StyleDetail],
  [AppBuilderOntologyRowKind.VisualPolicy, SemanticRuntimeAppBuilderQueryKind.StyleDetail],
]);
for (const [targetKind, expectedQueryKind] of expectedDetailQueryByRowKind) {
  const targetKindAnswer = withSemanticRuntimeAppBuilderQueryContinuations({
    kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
    targetCatalog: {
      targetKinds: [targetKind],
      includeInputReadiness: false,
    },
    page: { size: 1 },
  }, answerSemanticRuntimeAppBuilderQuery({
    kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
    targetCatalog: {
      targetKinds: [targetKind],
      includeInputReadiness: false,
    },
    page: { size: 1 },
  }));
  assert.ok(
    targetKindAnswer.continuations?.some((row) => row.targetAppBuilderQueryKind === expectedQueryKind) === true,
    `Expected target-catalog rows of kind '${targetKind}' to expose a grouped ${expectedQueryKind} continuation.`,
  );
}
const inspectFilteredTargetCatalogAnswer = filterSemanticRuntimeAppBuilderQueryContinuations({
  continuationIntents: [InquiryContinuationIntent.Inspect],
}, continuedTargetCatalogAnswer);
assert.ok(
  inspectFilteredTargetCatalogAnswer.continuations?.length > 0,
  'Expected inspect intent to preserve app-builder target-catalog drilldown continuations.',
);
assert.ok(
  inspectFilteredTargetCatalogAnswer.continuations?.every((row) =>
    row.intents.includes(InquiryContinuationIntent.Inspect)
    && row.targetAppBuilderQuery?.continuationIntents?.includes(InquiryContinuationIntent.Inspect) === true
  ) === true,
  'Expected app-builder continuation intent filtering to inherit the filter into targetAppBuilderQuery payloads.',
);

const readinessFilteredTargetCatalogAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  targetCatalog: {
    targetKinds: [AppBuilderOntologyRowKind.PolicyAxis],
    readinessStates: [AppBuilderInputReadinessState.MissingRequired],
    includeInputReadiness: false,
  },
});
assert.equal(readinessFilteredTargetCatalogAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(readinessFilteredTargetCatalogAnswer.value.rows.length, APP_BUILDER_POLICY_AXIS_IDS.length);
assert.ok(
  readinessFilteredTargetCatalogAnswer.value.rows.every((row) => row.inputReadiness == null),
  'Expected readinessStates filters not to force readiness counts into compact target rows.',
);

const missingInvocation = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation,
});
assert.equal(missingInvocation.outcome, SemanticRuntimeAnswerOutcome.Partial);
assert.equal(missingInvocation.value.issues[0]?.issueKind, SemanticRuntimeAppBuilderQueryIssueKind.MissingPartSourceInvocation);

const broadPartMenu = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartMenu,
});
assert.equal(broadPartMenu.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(broadPartMenu.value.authoringTierPolicy.kind, AppBuilderPartAuthoringTierPolicyKind.DefaultPreferred);
assert.deepEqual(broadPartMenu.value.authoringTiers, [AppBuilderPartAuthoringTier.Preferred]);
assert.ok(broadPartMenu.value.parts.every((part) => part.authoringTier === AppBuilderPartAuthoringTier.Preferred));
assert.equal(
  broadPartMenu.value.parts.some((part) => part.id === AppBuilderStructuralPartId.VirtualRepeat),
  false,
  'Broad app-builder part menus should not proactively advertise advanced virtual-repeat output.',
);

const structuralShapePartMenu = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartMenu,
  partMenu: {
    partKinds: [AppBuilderPartKind.StructuralPart],
  },
});
assert.equal(structuralShapePartMenu.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.deepEqual(structuralShapePartMenu.value.authoringTiers, [AppBuilderPartAuthoringTier.Preferred]);
assert.equal(
  structuralShapePartMenu.value.parts.some((part) => part.id === AppBuilderStructuralPartId.Promise),
  false,
  'Shape-only part filters should narrow the preferred subset instead of advertising every supported template-controller form.',
);
assert.ok(
  structuralShapePartMenu.value.authoringTierFilteredOutCount > 0,
  'Shape-only part filters should report that non-preferred matching rows were intentionally filtered.',
);

const bindingBehaviorShapePartMenu = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartMenu,
  partMenu: {
    partKinds: [AppBuilderPartKind.BindingBehavior],
  },
});
assert.equal(bindingBehaviorShapePartMenu.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(bindingBehaviorShapePartMenu.value.parts.length, 0);
assert.ok(
  bindingBehaviorShapePartMenu.value.authoringTierFilteredOutCount > 0,
  'Shape-only binding-behavior menus should stay opinionated while explaining how many supported rows were filtered out.',
);
assert.match(
  bindingBehaviorShapePartMenu.value.authoringTierFilteredOutSummary,
  /exact part id|authoringTiers/,
);
const continuedBindingBehaviorShapePartMenu = withSemanticRuntimeAppBuilderQueryContinuations(
  {
    kind: SemanticRuntimeAppBuilderQueryKind.PartMenu,
    partMenu: {
      partKinds: [AppBuilderPartKind.BindingBehavior],
    },
  },
  bindingBehaviorShapePartMenu,
);
const bindingBehaviorWidenContinuation = continuedBindingBehaviorShapePartMenu.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.PartMenu
);
assert.ok(
  bindingBehaviorWidenContinuation?.targetAppBuilderQuery?.partMenu?.authoringTiers?.includes(AppBuilderPartAuthoringTier.IntentScoped),
  'Expected zero-row part menus with authoring-tier exclusions to continue into a deliberately widened part-menu query.',
);
assert.equal(
  continuedBindingBehaviorShapePartMenu.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview
  ),
  false,
  'Expected zero-row part menus not to continue into a preview with the same authoring-tier gate.',
);

const targetedAdvancedPartMenu = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartMenu,
  partMenu: {
    partKinds: [AppBuilderPartKind.StructuralPart],
    partIds: [AppBuilderStructuralPartId.VirtualRepeat],
  },
});
assert.equal(targetedAdvancedPartMenu.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(targetedAdvancedPartMenu.value.authoringTierPolicy.kind, AppBuilderPartAuthoringTierPolicyKind.ExplicitCapabilityIntent);
assert.equal(targetedAdvancedPartMenu.value.parts.length, 1);
assert.equal(targetedAdvancedPartMenu.value.parts[0]?.authoringTier, AppBuilderPartAuthoringTier.Advanced);

const routerIntentPartMenu = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartMenu,
  partMenu: {
    packageDependencies: ['@aurelia/router'],
  },
});
assert.equal(routerIntentPartMenu.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(routerIntentPartMenu.value.authoringTierPolicy.kind, AppBuilderPartAuthoringTierPolicyKind.ExplicitCapabilityIntent);
assert.ok(routerIntentPartMenu.value.parts.some((part) =>
  part.kind === AppBuilderPartKind.FrameworkComponent
  && part.id === AppBuilderFrameworkComponentId.Viewport
  && part.authoringTier === AppBuilderPartAuthoringTier.IntentScoped
));

const broadPreview = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview,
});
assert.equal(broadPreview.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(broadPreview.value.authoringTierPolicy.kind, AppBuilderPartAuthoringTierPolicyKind.DefaultPreferred);
assert.ok(broadPreview.value.rows.length > 0);
assert.ok(broadPreview.value.rows.every((row) => row.authoringTier === AppBuilderPartAuthoringTier.Preferred));
assert.equal(
  broadPreview.value.rows.some((row) => row.partId === AppBuilderStructuralPartId.VirtualRepeat),
  false,
  'Broad app-builder source-lowering previews should follow the preferred-part menu policy.',
);

const structuralShapePreview = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview,
  partSourceLoweringPreview: {
    partKinds: [AppBuilderPartKind.StructuralPart],
  },
});
assert.equal(structuralShapePreview.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(structuralShapePreview.value.authoringTierPolicy.kind, AppBuilderPartAuthoringTierPolicyKind.DefaultPreferred);
assert.ok(structuralShapePreview.value.rows.every((row) => row.authoringTier === AppBuilderPartAuthoringTier.Preferred));
assert.equal(
  structuralShapePreview.value.rows.some((row) => row.partId === AppBuilderStructuralPartId.Promise),
  false,
  'Shape-only source-lowering previews should also stay on the preferred tier.',
);
assert.ok(
  structuralShapePreview.value.authoringTierFilteredOutCount > 0,
  'Shape-only source-lowering previews should expose recommendation-tier exclusions just like part menus.',
);

const stateDispatchInvocation = {
  partKind: AppBuilderPartKind.BindingPart,
  partId: AppBuilderBindingPartId.StateDispatch,
  applicationSite: AppBuilderPartApplicationSiteKind.BindingCommandTarget,
  slotAssignments: [
    { slotKind: AppBuilderPartSlotKind.EventName, value: 'click' },
    { slotKind: AppBuilderPartSlotKind.BindingExpression, value: "{ type: 'activate' }" },
    { slotKind: AppBuilderPartSlotKind.StateStoreName, value: 'users' },
  ],
};
const stateDispatchAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation,
  partSourceInvocation: stateDispatchInvocation,
});
assert.equal(stateDispatchAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(stateDispatchAnswer.value.state, AppBuilderPartSourceLoweringState.Complete);
assert.equal(stateDispatchAnswer.value.fragments.length, 1);
const stateDispatchFragment = stateDispatchAnswer.value.fragments[0];
assert.equal(stateDispatchFragment.kind, AppBuilderPartSourceFragmentKind.TemplateAttribute);
assert.equal(stateDispatchFragment.text, `click.dispatch:users="{ type: 'activate' }"`);
assert.equal(stateDispatchFragment.origin.partKind, AppBuilderPartKind.BindingPart);
assert.equal(stateDispatchFragment.origin.partId, AppBuilderBindingPartId.StateDispatch);
assert.deepEqual(stateDispatchFragment.origin.slotKinds, [
  AppBuilderPartSlotKind.BindingExpression,
  AppBuilderPartSlotKind.EventName,
  AppBuilderPartSlotKind.StateStoreName,
]);
assert.deepEqual(stateDispatchAnswer.value.packageDependencies, ['@aurelia/state']);

const previewAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview,
  partSourceLoweringPreview: {
    partKinds: [AppBuilderPartKind.BindingPart],
    partIds: [AppBuilderBindingPartId.StateDispatch],
    sampleKinds: [
      AppBuilderPartSourceLoweringSampleKind.RequiredOnly,
      AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots,
    ],
    includeSourceText: true,
  },
});
assert.equal(previewAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(previewAnswer.value.authoringTierPolicy.kind, AppBuilderPartAuthoringTierPolicyKind.ExplicitCapabilityIntent);
assert.equal(previewAnswer.value.sourceTextIncluded, true);
assert.equal(previewAnswer.value.issueCount, 0);
assert.equal(previewAnswer.value.rows.length, 2);
assert.ok(previewAnswer.value.rows.every((row) =>
  row.state === AppBuilderPartSourceLoweringState.Complete
  && row.authoringTier === AppBuilderPartAuthoringTier.IntentScoped
  && row.fragments.some((fragment) => fragment.text?.includes('.dispatch') === true)
));

const integrityAnswer = answerSemanticRuntimeAppBuilderQuery({
  kind: SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity,
});
assert.equal(integrityAnswer.outcome, SemanticRuntimeAnswerOutcome.Hit);
assert.equal(integrityAnswer.value.issueCount, 0);
assert.equal(integrityAnswer.value.sourceLoweringGalleryCoverageIssues.length, 0);
assert.equal(integrityAnswer.value.statusAuditSummary.integrityIssueCount, 0);
assert.equal(integrityAnswer.value.statusAuditSummary.sourceLoweringImplementedCount, 39);
assert.equal(integrityAnswer.value.statusAuditSummary.sourceLoweringSurfaceTargetCount, 39);
assert.ok(
  integrityAnswer.value.statusAuditSummary.reviewNeededCount > 0,
  'Expected catalog integrity to expose review-visible status audit rows for provisional app-builder terrain.',
);
const continuedIntegrityAnswer = withSemanticRuntimeAppBuilderQueryContinuations(
  { kind: SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity },
  integrityAnswer,
);
const integrityTargetCatalogContinuation = continuedIntegrityAnswer.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.TargetCatalog
);
assert.ok(
  integrityTargetCatalogContinuation?.targetAppBuilderQuery?.targetCatalog?.targetRefs?.some((targetRef) =>
    targetRef.kind === AppBuilderOntologyRowKind.InputFacet
    && targetRef.id === AppBuilderInputFacetId.VisualTokens
  ),
  'Expected catalog-integrity continuations to open exact target rows for review-visible status-audit targets.',
);
const integrityRecommendationPolicyContinuation = continuedIntegrityAnswer.continuations?.find((row) =>
  row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy
);
assert.ok(
  integrityRecommendationPolicyContinuation?.targetAppBuilderQuery?.recommendationPolicy?.includeRows,
  'Expected catalog-integrity continuations to open recommendation-policy rows for review-visible status-audit targets.',
);
assert.ok(
  continuedIntegrityAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail
  ),
  'Expected catalog-integrity continuations to open family-specific detail for review-visible input facets.',
);
assert.ok(
  continuedIntegrityAnswer.continuations?.some((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.StyleDetail
  ),
  'Expected catalog-integrity continuations to open family-specific detail for review-visible visual policies.',
);

console.log(JSON.stringify({
  ok: true,
  catalogRows: catalog.rows.length,
  ontologyRows: ontologyAnswer.value.domainSummaries.reduce((sum, row) => sum + row.rowCount, 0),
  ontologyRelations: ontologyAnswer.value.relationCount,
  inputReadinessTargets: defaultReadinessAnswer.value.targets.length,
  previewRows: previewAnswer.value.rows.length,
  statusReviewRows: integrityAnswer.value.statusAuditSummary.reviewNeededCount,
  stateDispatchText: stateDispatchFragment.text,
}, null, 2));

function ontologyTargetKey(ref) {
  return `${ref.kind}\0${ref.domain}\0${ref.id}`;
}

function answerPagedSemanticRuntimeAppBuilderQuery(request, pageSize = request.page?.size ?? 200) {
  const rows = [];
  let cursor = request.page?.cursor ?? null;
  let firstAnswer = null;
  do {
    const answer = answerSemanticRuntimeAppBuilderQuery({
      ...request,
      page: { ...(request.page ?? {}), size: pageSize, cursor },
    });
    assert.notEqual(answer.outcome, SemanticRuntimeAnswerOutcome.Error);
    firstAnswer ??= answer;
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  assert.ok(firstAnswer != null);
  return {
    ...firstAnswer,
    outcome: SemanticRuntimeAnswerOutcome.Hit,
    value: {
      ...firstAnswer.value,
      rows,
      ...(typeof firstAnswer.value.rowsIncluded === 'number'
        ? { rowsIncluded: rows.length }
        : {}),
    },
    page: firstAnswer.page == null
      ? null
      : {
        ...firstAnswer.page,
        nextCursor: null,
        returnedRows: rows.length,
      },
  };
}

function targetInvocationRequestFieldPairs(row) {
  return row?.sourceLoweringRequestFields
    .filter((field) => field.surfaceKind === AppBuilderSourceLoweringSurfaceKind.TargetInvocation)
    .map((field) => [field.fieldId, field.requirementKind]) ?? null;
}
