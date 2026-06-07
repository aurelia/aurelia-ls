import { z } from 'zod/v4';
import {
  SEMANTIC_APP_RETENTION_POLICIES,
  SEMANTIC_APP_ANALYSIS_DEPTHS,
  SEMANTIC_APP_QUERY_KINDS,
  SEMANTIC_DIAGNOSTIC_PROJECTION_POLICIES,
  INQUIRY_CONTINUATION_INTENTS,
  APP_BUILDER_PART_APPLICATION_SITE_KINDS,
  APP_BUILDER_PART_AUTHORING_TIERS,
  APP_BUILDER_PART_IDS,
  APP_BUILDER_PART_KINDS,
  APP_BUILDER_PART_OPERATION_KINDS,
  APP_BUILDER_PART_VALUE_CHANNEL_RESOLUTION_KINDS,
  APP_BUILDER_PART_SOURCE_LOWERING_SAMPLE_KINDS,
  APP_BUILDER_PART_SLOT_KINDS,
  APP_BUILDER_PART_SLOT_VALUE_LANGUAGES,
  APP_BUILDER_ONTOLOGY_DOMAINS,
  APP_BUILDER_ONTOLOGY_REASON_AUTHORITIES,
  APP_BUILDER_ONTOLOGY_RELATION_KINDS,
  APP_BUILDER_ONTOLOGY_ROW_KINDS,
  APP_BUILDER_AFFORDANCE_IDS,
  APP_BUILDER_APPLICATION_PATTERN_IDS,
  APP_BUILDER_COLLECTION_CONCEPT_IDS,
  APP_BUILDER_CHOICE_OPTION_BINDING_KINDS,
  APP_BUILDER_CONTROL_MANIFEST_ROW_IDS,
  APP_BUILDER_CONTROL_PATTERN_IDS,
  APP_BUILDER_CONTROL_REALIZATION_POLICY_IDS,
  APP_BUILDER_EFFECT_CONTRACT_IDS,
  APP_BUILDER_SOURCE_LOWERING_ASYNC_DATA_MEMBER_MUTABILITIES,
  APP_BUILDER_SOURCE_LOWERING_BUTTON_TYPES,
  APP_BUILDER_SOURCE_LOWERING_COMPOSITION_KINDS,
  APP_BUILDER_SOURCE_LOWERING_MESSAGE_KINDS,
  APP_BUILDER_SOURCE_LOWERING_SURFACE_KINDS,
  APP_BUILDER_SERVICE_COLLECTION_FILTER_PREDICATE_KINDS,
  APP_BUILDER_INPUT_CONTRACT_IDS,
  APP_BUILDER_INPUT_FACET_IDS,
  APP_BUILDER_INPUT_PAYLOAD_SCHEMA_STATES,
  APP_BUILDER_POLICY_AXIS_IDS,
  APP_BUILDER_STYLING_MECHANISM_IDS,
  APP_BUILDER_SUPPLIED_INPUT_SOURCES,
  APP_BUILDER_DECISION_BUNDLE_SOURCES,
  APP_BUILDER_INPUT_READINESS_STATES,
  APP_BUILDER_RECOMMENDATION_APPLICABILITY_KINDS,
  APP_BUILDER_RECOMMENDATION_EVIDENCE_KINDS,
  APP_BUILDER_RECOMMENDATION_STATUSES,
  APP_BUILDER_VISUAL_POLICY_IDS,
  BUILT_IN_RESOURCE_PACKAGES,
  RESOURCE_DEFINITION_KINDS,
  SEMANTIC_RUNTIME_APP_BUILDER_QUERY_KINDS,
  SEMANTIC_PROJECT_DISCOVERY_MODES,
  SEMANTIC_RUNTIME_DETAIL_VALUES,
  SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES,
} from '@aurelia-ls/semantic-runtime';

const pageSchema = z.object({
  size: z.number().int().nonnegative().optional(),
  cursor: z.string().nullable().optional(),
}).strict();

const sourceFileInputSchema = z.object({
  path: z.string(),
  language: z.string().optional(),
  role: z.string().optional(),
  note: z.string().nullable().optional(),
}).strict();

const projectSchema = z.object({
  rootDir: z.string(),
  projectKey: z.string().optional(),
  sourceFiles: z.array(sourceFileInputSchema).optional(),
  sourceDiscoveryOptions: z.unknown().optional(),
}).passthrough();

const workspaceShape = {
  workspaceRoot: z.string(),
  storeKey: z.string().optional(),
  projects: z.array(projectSchema).optional(),
  projectDiscovery: z.enum(SEMANTIC_PROJECT_DISCOVERY_MODES).optional(),
} as const;

const optionalRuntimeSelectorShape = {
  workspaceRoot: z.string().nullable().optional(),
  storeKey: z.string().nullable().optional(),
  projects: z.array(projectSchema).nullable().optional(),
  projectDiscovery: z.enum(SEMANTIC_PROJECT_DISCOVERY_MODES).nullable().optional(),
} as const;

const appRetentionShape = {
  appRetention: z.enum(SEMANTIC_APP_RETENTION_POLICIES).nullable().optional(),
} as const;

const continuationIntentShape = {
  continuationIntents: z.array(z.enum(INQUIRY_CONTINUATION_INTENTS)).nullable().optional(),
} as const;

const openAppShape = {
  ...workspaceShape,
  projectKey: z.string().nullable().optional(),
  sourceFilePath: z.string().nullable().optional(),
  analysisDepth: z.enum(SEMANTIC_APP_ANALYSIS_DEPTHS).nullable().optional(),
  includeAuthoringTemplates: z.boolean().nullable().optional(),
  authoringTemplateSourceFiles: z.array(z.string()).nullable().optional(),
  authoringTemplateLimit: z.number().int().nonnegative().nullable().optional(),
  ...appRetentionShape,
  ...continuationIntentShape,
} as const;

const pagedShape = {
  page: pageSchema.nullable().optional(),
  detail: z.enum(SEMANTIC_RUNTIME_DETAIL_VALUES).nullable().optional(),
} as const;

const diagnosticProjectionShape = {
  diagnosticProjection: z.enum(SEMANTIC_DIAGNOSTIC_PROJECTION_POLICIES).nullable().optional(),
} as const;

const sourceFileSchema = z.object({
  filePath: z.string(),
}).strict();

const cursorSchema = sourceFileSchema.extend({
  line: z.number().int().nonnegative(),
  character: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative().nullable().optional(),
}).strict();

const semanticAppQuerySchema = z.object({
  kind: z.enum(SEMANTIC_APP_QUERY_KINDS),
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  includeTypeSurfaces: z.boolean().nullable().optional(),
  diagnosticPageSize: z.number().int().positive().nullable().optional(),
  openSeamPageSize: z.number().int().positive().nullable().optional(),
  rowPageSize: z.number().int().nonnegative().nullable().optional(),
  cursor: cursorSchema.nullable().optional(),
  sourceFile: sourceFileSchema.nullable().optional(),
}).strict();

const appBuilderPartSlotAssignmentSchema = z.object({
  slotKind: z.enum(APP_BUILDER_PART_SLOT_KINDS),
  value: z.string(),
}).strict();

const appBuilderPartSourceInvocationSchema = z.object({
  partKind: z.enum(APP_BUILDER_PART_KINDS),
  partId: z.enum(APP_BUILDER_PART_IDS.map((value) => String(value)) as [string, ...string[]]),
  applicationSite: z.enum(APP_BUILDER_PART_APPLICATION_SITE_KINDS).optional(),
  slotAssignments: z.array(appBuilderPartSlotAssignmentSchema).optional(),
}).strict();

const resourceDefinitionKindSchema = z.enum(RESOURCE_DEFINITION_KINDS.map((value) => String(value)) as [string, ...string[]]);
const builtInResourcePackageSchema = z.enum(BUILT_IN_RESOURCE_PACKAGES.map((value) => String(value)) as [string, ...string[]]);

const appBuilderPartMenuSchema = z.object({
  partKinds: z.array(z.enum(APP_BUILDER_PART_KINDS)).optional(),
  authoringTiers: z.array(z.enum(APP_BUILDER_PART_AUTHORING_TIERS)).optional(),
  partIds: z.array(z.enum(APP_BUILDER_PART_IDS.map((value) => String(value)) as [string, ...string[]])).optional(),
  applicationSites: z.array(z.enum(APP_BUILDER_PART_APPLICATION_SITE_KINDS)).optional(),
  operationKinds: z.array(z.enum(APP_BUILDER_PART_OPERATION_KINDS)).optional(),
  resourceKinds: z.array(resourceDefinitionKindSchema).optional(),
  resourcePackageIds: z.array(builtInResourcePackageSchema).optional(),
  packageDependencies: z.array(z.string()).optional(),
  valueChannelResolutionKinds: z.array(z.enum(APP_BUILDER_PART_VALUE_CHANNEL_RESOLUTION_KINDS)).optional(),
  availableSlotKinds: z.array(z.enum(APP_BUILDER_PART_SLOT_KINDS)).optional(),
  relevantSlotKinds: z.array(z.enum(APP_BUILDER_PART_SLOT_KINDS)).optional(),
  availableSlotValueLanguages: z.array(z.enum(APP_BUILDER_PART_SLOT_VALUE_LANGUAGES)).optional(),
  relevantSlotValueLanguages: z.array(z.enum(APP_BUILDER_PART_SLOT_VALUE_LANGUAGES)).optional(),
  includePartDetails: z.boolean().nullable().optional(),
}).strict();

const appBuilderPartSourceLoweringPreviewSchema = appBuilderPartMenuSchema.extend({
  sampleKinds: z.array(z.enum(APP_BUILDER_PART_SOURCE_LOWERING_SAMPLE_KINDS)).optional(),
  includeSourceText: z.boolean().optional(),
}).strict();

const appBuilderOntologyCatalogSchema = z.object({
  domains: z.array(z.enum(APP_BUILDER_ONTOLOGY_DOMAINS)).optional(),
  recommendationStatuses: z.array(z.enum(APP_BUILDER_RECOMMENDATION_STATUSES)).optional(),
  reasonAuthorities: z.array(z.enum(APP_BUILDER_ONTOLOGY_REASON_AUTHORITIES)).optional(),
  sourceLoweringImplemented: z.boolean().nullable().optional(),
  defaultingCandidate: z.boolean().nullable().optional(),
  requiresExplicitInput: z.boolean().nullable().optional(),
  includeRows: z.boolean().nullable().optional(),
  includeRelations: z.boolean().nullable().optional(),
  relationKinds: z.array(z.enum(APP_BUILDER_ONTOLOGY_RELATION_KINDS)).optional(),
}).strict();

const appBuilderOntologyRowRefSchema = z.object({
  kind: z.enum(APP_BUILDER_ONTOLOGY_ROW_KINDS),
  domain: z.enum(APP_BUILDER_ONTOLOGY_DOMAINS),
  id: z.string(),
}).strict();

const appBuilderOntologyTargetSelectorSchema = z.object({
  kind: z.enum(APP_BUILDER_ONTOLOGY_ROW_KINDS),
  id: z.string(),
  domain: z.enum(APP_BUILDER_ONTOLOGY_DOMAINS).nullable().optional(),
}).strict();

const appBuilderSuppliedInputSchema = z.object({
  inputContractId: z.enum(APP_BUILDER_INPUT_CONTRACT_IDS),
  sourceId: z.enum(APP_BUILDER_SUPPLIED_INPUT_SOURCES),
  inputFacetIds: z.array(z.enum(APP_BUILDER_INPUT_FACET_IDS)).nullable().optional(),
  targetRefs: z.array(appBuilderOntologyRowRefSchema).nullable().optional(),
  facetPayloads: z.array(z.object({
    inputFacetId: z.enum(APP_BUILDER_INPUT_FACET_IDS),
    value: z.unknown(),
    label: z.string().optional(),
    summary: z.string().optional(),
  }).strict()).nullable().optional(),
  label: z.string().optional(),
  summary: z.string().optional(),
}).strict();

const appBuilderDecisionBundleDecisionSchema = z.object({
  inputContractId: z.enum(APP_BUILDER_INPUT_CONTRACT_IDS),
  inputFacetIds: z.array(z.enum(APP_BUILDER_INPUT_FACET_IDS)).nullable().optional(),
  facetPayloads: z.array(z.object({
    inputFacetId: z.enum(APP_BUILDER_INPUT_FACET_IDS),
    value: z.unknown(),
    label: z.string().optional(),
    summary: z.string().optional(),
  }).strict()).nullable().optional(),
  targetRefs: z.array(appBuilderOntologyRowRefSchema).nullable().optional(),
  label: z.string().optional(),
  summary: z.string().optional(),
}).strict();

const appBuilderDecisionBundleSchema = z.object({
  bundleId: z.string().nullable().optional(),
  sourceId: z.enum(APP_BUILDER_DECISION_BUNDLE_SOURCES),
  decisions: z.array(appBuilderDecisionBundleDecisionSchema),
  label: z.string().optional(),
  summary: z.string().optional(),
}).strict();

const appBuilderInputReadinessSchema = z.object({
  targetRefs: z.array(appBuilderOntologyRowRefSchema).nullable().optional(),
  targetSelectors: z.array(appBuilderOntologyTargetSelectorSchema).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputFacets: z.boolean().nullable().optional(),
  includeDecisionBundleExpansionRows: z.boolean().nullable().optional(),
}).strict();

const appBuilderInputContractDetailSchema = z.object({
  inputContractIds: z.array(z.enum(APP_BUILDER_INPUT_CONTRACT_IDS)).nullable().optional(),
  inputFacetIds: z.array(z.enum(APP_BUILDER_INPUT_FACET_IDS)).nullable().optional(),
  payloadSchemaStates: z.array(z.enum(APP_BUILDER_INPUT_PAYLOAD_SCHEMA_STATES)).nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
  includeSourceLoweringConsumers: z.boolean().nullable().optional(),
  includeSourceLoweringValueSupport: z.boolean().nullable().optional(),
}).strict();

const appBuilderAffordanceDetailSchema = z.object({
  affordanceIds: z.array(z.enum(APP_BUILDER_AFFORDANCE_IDS)).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputReadiness: z.boolean().nullable().optional(),
  includeInputContractDetail: z.boolean().nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
  includeEffectContracts: z.boolean().nullable().optional(),
  includeApplicationPatterns: z.boolean().nullable().optional(),
  includeFollowUps: z.boolean().nullable().optional(),
}).strict();

const appBuilderApplicationPatternDetailSchema = z.object({
  applicationPatternIds: z.array(z.enum(APP_BUILDER_APPLICATION_PATTERN_IDS)).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputReadiness: z.boolean().nullable().optional(),
  includeInputContractDetail: z.boolean().nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
  includeCollectionConcepts: z.boolean().nullable().optional(),
  includeCollectionFeatures: z.boolean().nullable().optional(),
  includeCompanionApplicationPatterns: z.boolean().nullable().optional(),
  includeControlPatterns: z.boolean().nullable().optional(),
  includeControlManifests: z.boolean().nullable().optional(),
  includeStylingMechanisms: z.boolean().nullable().optional(),
  includeVisualPolicies: z.boolean().nullable().optional(),
  includeAffordances: z.boolean().nullable().optional(),
  includeSemanticEffectDescriptors: z.boolean().nullable().optional(),
}).strict();

const appBuilderCollectionConceptDetailSchema = z.object({
  collectionConceptIds: z.array(z.enum(APP_BUILDER_COLLECTION_CONCEPT_IDS)).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputReadiness: z.boolean().nullable().optional(),
  includeInputContractDetail: z.boolean().nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
  includeApplicationPatterns: z.boolean().nullable().optional(),
  includeCollectionFeatures: z.boolean().nullable().optional(),
  includeControlPatterns: z.boolean().nullable().optional(),
  includeControlManifests: z.boolean().nullable().optional(),
  includeStylingMechanisms: z.boolean().nullable().optional(),
  includeVisualPolicies: z.boolean().nullable().optional(),
  includeAffordances: z.boolean().nullable().optional(),
}).strict();

const appBuilderControlPatternDetailSchema = z.object({
  controlPatternIds: z.array(z.enum(APP_BUILDER_CONTROL_PATTERN_IDS)).nullable().optional(),
  controlRealizationPolicyIds: z.array(z.enum(APP_BUILDER_CONTROL_REALIZATION_POLICY_IDS)).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputReadiness: z.boolean().nullable().optional(),
  includeInputContractDetail: z.boolean().nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
  includeApplicationPatterns: z.boolean().nullable().optional(),
  includeControlDescriptors: z.boolean().nullable().optional(),
  includeRealizationPolicies: z.boolean().nullable().optional(),
  includeControlManifests: z.boolean().nullable().optional(),
  includeStylingMechanisms: z.boolean().nullable().optional(),
  includeVisualPolicies: z.boolean().nullable().optional(),
  includeAffordances: z.boolean().nullable().optional(),
}).strict();

const appBuilderControlManifestDetailSchema = z.object({
  controlManifestIds: z.array(z.enum(APP_BUILDER_CONTROL_MANIFEST_ROW_IDS)).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputReadiness: z.boolean().nullable().optional(),
  includeInputContractDetail: z.boolean().nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
  includeApplicationPatterns: z.boolean().nullable().optional(),
  includeControlPatterns: z.boolean().nullable().optional(),
  includeControlDescriptors: z.boolean().nullable().optional(),
  includeRealizationPolicies: z.boolean().nullable().optional(),
  includeManifestFieldDescriptors: z.boolean().nullable().optional(),
  includeEffectContracts: z.boolean().nullable().optional(),
  includeStylingMechanisms: z.boolean().nullable().optional(),
  includeVisualPolicies: z.boolean().nullable().optional(),
  includeAffordances: z.boolean().nullable().optional(),
}).strict();

const appBuilderEffectContractDetailSchema = z.object({
  effectContractIds: z.array(z.enum(APP_BUILDER_EFFECT_CONTRACT_IDS)).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includePromisingAffordances: z.boolean().nullable().optional(),
  includeAffordanceInputReadiness: z.boolean().nullable().optional(),
  includeAffordanceInputContractDetail: z.boolean().nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
  includeApplicationPatterns: z.boolean().nullable().optional(),
  includeWitnessDescriptors: z.boolean().nullable().optional(),
  includeWitnessFields: z.boolean().nullable().optional(),
  includeSemanticEffectDescriptors: z.boolean().nullable().optional(),
  includeSemanticRuntimeQueryRows: z.boolean().nullable().optional(),
  includeControlManifestRows: z.boolean().nullable().optional(),
  includeControlManifestFieldDescriptors: z.boolean().nullable().optional(),
}).strict();

const appBuilderPolicyDetailSchema = z.object({
  policyAxisIds: z.array(z.enum(APP_BUILDER_POLICY_AXIS_IDS)).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputReadiness: z.boolean().nullable().optional(),
  includeInputContractDetail: z.boolean().nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
}).strict();

const appBuilderRecommendationPolicySchema = z.object({
  targetRefs: z.array(appBuilderOntologyRowRefSchema).nullable().optional(),
  targetSelectors: z.array(appBuilderOntologyTargetSelectorSchema).nullable().optional(),
  recommendationStatuses: z.array(z.enum(APP_BUILDER_RECOMMENDATION_STATUSES)).nullable().optional(),
  applicabilityKinds: z.array(z.enum(APP_BUILDER_RECOMMENDATION_APPLICABILITY_KINDS)).nullable().optional(),
  evidenceKinds: z.array(z.enum(APP_BUILDER_RECOMMENDATION_EVIDENCE_KINDS)).nullable().optional(),
  sourceLoweringImplemented: z.boolean().nullable().optional(),
  defaultingCandidate: z.boolean().nullable().optional(),
  requiresExplicitInput: z.boolean().nullable().optional(),
  policySatisfactionCandidates: z.boolean().nullable().optional(),
  includeRows: z.boolean().nullable().optional(),
}).strict();

const appBuilderStyleDetailSchema = z.object({
  stylingMechanismIds: z.array(z.enum(APP_BUILDER_STYLING_MECHANISM_IDS)).nullable().optional(),
  visualPolicyIds: z.array(z.enum(APP_BUILDER_VISUAL_POLICY_IDS)).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputReadiness: z.boolean().nullable().optional(),
  includeInputContractDetail: z.boolean().nullable().optional(),
  includePayloadSchemas: z.boolean().nullable().optional(),
  includeApplicationPatterns: z.boolean().nullable().optional(),
  includeCollectionConcepts: z.boolean().nullable().optional(),
  includeControlPatterns: z.boolean().nullable().optional(),
  includeControlManifests: z.boolean().nullable().optional(),
  includeStylingMechanisms: z.boolean().nullable().optional(),
  includeVisualPolicies: z.boolean().nullable().optional(),
  includeAffordances: z.boolean().nullable().optional(),
}).strict();

const appBuilderTargetCatalogSchema = z.object({
  targetRefs: z.array(appBuilderOntologyRowRefSchema).nullable().optional(),
  targetSelectors: z.array(appBuilderOntologyTargetSelectorSchema).nullable().optional(),
  domains: z.array(z.enum(APP_BUILDER_ONTOLOGY_DOMAINS)).optional(),
  targetKinds: z.array(z.enum(APP_BUILDER_ONTOLOGY_ROW_KINDS)).optional(),
  recommendationStatuses: z.array(z.enum(APP_BUILDER_RECOMMENDATION_STATUSES)).optional(),
  reasonAuthorities: z.array(z.enum(APP_BUILDER_ONTOLOGY_REASON_AUTHORITIES)).optional(),
  sourceLoweringImplemented: z.boolean().nullable().optional(),
  sourceLoweringSurfaceKinds: z.array(z.enum(APP_BUILDER_SOURCE_LOWERING_SURFACE_KINDS)).nullable().optional(),
  defaultingCandidate: z.boolean().nullable().optional(),
  requiresExplicitInput: z.boolean().nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputReadiness: z.boolean().nullable().optional(),
  includeInputDependencies: z.boolean().nullable().optional(),
  includeSourceLoweringRequestFields: z.boolean().nullable().optional(),
  readinessStates: z.array(z.enum(APP_BUILDER_INPUT_READINESS_STATES)).optional(),
}).strict();

const appBuilderSourceLoweringPreflightSchema = z.object({
  targetRefs: z.array(appBuilderOntologyRowRefSchema).nullable().optional(),
  targetSelectors: z.array(appBuilderOntologyTargetSelectorSchema).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeInputDependencies: z.boolean().nullable().optional(),
  includeSourceLoweringRequestFields: z.boolean().nullable().optional(),
  includeDecisionBundleExpansionRows: z.boolean().nullable().optional(),
}).strict();

const appBuilderSourceLoweringTypeScriptMethodParameterSchema = z.object({
  name: z.string(),
  typeText: z.string(),
}).strict();

const appBuilderSourceLoweringComponentPairServiceCollectionFilterMethodSchema = z.object({
  methodName: z.string().nullable().optional(),
  fieldName: z.string().nullable().optional(),
  parameterName: z.string().nullable().optional(),
  predicateKind: z.enum(APP_BUILDER_SERVICE_COLLECTION_FILTER_PREDICATE_KINDS).nullable().optional(),
}).strict();

const appBuilderSourceLoweringComponentPairServiceCollectionCreateMethodSchema = z.object({
  methodName: z.string().nullable().optional(),
  inputFieldNames: z.array(z.string()).nullable().optional(),
}).strict();

const appBuilderSourceLoweringComponentPairServiceCollectionUpdateMethodSchema = z.object({
  methodName: z.string().nullable().optional(),
  inputFieldNames: z.array(z.string()).nullable().optional(),
}).strict();

const appBuilderSourceLoweringComponentPairServiceQueryStateSchema = z.object({
  stateMemberName: z.string().nullable().optional(),
  stateTypeText: z.string().nullable().optional(),
  initialValueExpression: z.string().nullable().optional(),
  inactiveValueExpression: z.string().nullable().optional(),
  reloadMethodName: z.string().nullable().optional(),
  resultMemberName: z.string().nullable().optional(),
  filterMethodName: z.string().nullable().optional(),
}).strict();

const appBuilderSourceLoweringRouterBackedListDetailServiceQueryControlSchema = z.object({
  stateMemberName: z.string().nullable().optional(),
  stateTypeText: z.string().nullable().optional(),
  initialValueExpression: z.string().nullable().optional(),
  inactiveValueExpression: z.string().nullable().optional(),
  reloadMethodName: z.string().nullable().optional(),
  resultMemberName: z.string().nullable().optional(),
  filterMethodName: z.string().nullable().optional(),
  fieldControlId: z.string().nullable().optional(),
  labelText: z.string().nullable().optional(),
  applyActionName: z.string().nullable().optional(),
  applyButtonText: z.string().nullable().optional(),
  clearActionName: z.string().nullable().optional(),
  clearButtonText: z.string().nullable().optional(),
}).strict();

const appBuilderSourceLoweringRouterBackedListDetailServiceCollectionSchema = z.object({
  sourceTargetPath: z.string().nullable().optional(),
  serviceClassName: z.string().nullable().optional(),
  loadMethodName: z.string().nullable().optional(),
  findMethodName: z.string().nullable().optional(),
  createMethodName: z.string().nullable().optional(),
  filterMethods: z.array(appBuilderSourceLoweringComponentPairServiceCollectionFilterMethodSchema).nullable().optional(),
  queryControls: z.array(appBuilderSourceLoweringRouterBackedListDetailServiceQueryControlSchema).nullable().optional(),
}).strict();

const appBuilderSourceLoweringComponentPairServiceCollectionSchema = z.object({
  sourceTargetPath: z.string().nullable().optional(),
  serviceClassName: z.string().nullable().optional(),
  componentMemberName: z.string().nullable().optional(),
  collectionEntityName: z.string().nullable().optional(),
  recordTypeName: z.string().nullable().optional(),
  loadMethodName: z.string().nullable().optional(),
  filterMethods: z.array(appBuilderSourceLoweringComponentPairServiceCollectionFilterMethodSchema).nullable().optional(),
  createMethods: z.array(appBuilderSourceLoweringComponentPairServiceCollectionCreateMethodSchema).nullable().optional(),
  updateMethods: z.array(appBuilderSourceLoweringComponentPairServiceCollectionUpdateMethodSchema).nullable().optional(),
  queryStates: z.array(appBuilderSourceLoweringComponentPairServiceQueryStateSchema).nullable().optional(),
}).strict();

const appBuilderSourceLoweringInvocationSchema = z.object({
  targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  fieldName: z.string().nullable().optional(),
  actionName: z.string().nullable().optional(),
  routeInstruction: z.string().nullable().optional(),
  routeParamsExpression: z.string().nullable().optional(),
  routeContextExpression: z.string().nullable().optional(),
  routeActiveExpression: z.string().nullable().optional(),
  routeTargetAttributeName: z.string().nullable().optional(),
  linkText: z.string().nullable().optional(),
  innerControlPatternId: z.enum(APP_BUILDER_CONTROL_PATTERN_IDS).nullable().optional(),
  bindingExpression: z.string().nullable().optional(),
  handlerExpression: z.string().nullable().optional(),
  methodParameters: z.array(appBuilderSourceLoweringTypeScriptMethodParameterSchema).nullable().optional(),
  methodBodyStatements: z.string().nullable().optional(),
  serviceMemberName: z.string().nullable().optional(),
  serviceMethodName: z.string().nullable().optional(),
  serviceCallResultMemberName: z.string().nullable().optional(),
  serviceCallArgumentExpressions: z.array(z.string()).nullable().optional(),
  serviceQueryStateMemberName: z.string().nullable().optional(),
  serviceQueryStateValueExpression: z.string().nullable().optional(),
  serviceQueryReloadMethodName: z.string().nullable().optional(),
  serviceCallRefreshMethodName: z.string().nullable().optional(),
  asyncDataMemberName: z.string().nullable().optional(),
  asyncDataPromiseType: z.string().nullable().optional(),
  asyncDataInitializerExpression: z.string().nullable().optional(),
  asyncDataMemberMutability: z.enum(APP_BUILDER_SOURCE_LOWERING_ASYNC_DATA_MEMBER_MUTABILITIES).nullable().optional(),
  eventName: z.string().nullable().optional(),
  buttonText: z.string().nullable().optional(),
  buttonType: z.enum(APP_BUILDER_SOURCE_LOWERING_BUTTON_TYPES).nullable().optional(),
  labelText: z.string().nullable().optional(),
  fieldControlId: z.string().nullable().optional(),
  messageKind: z.enum(APP_BUILDER_SOURCE_LOWERING_MESSAGE_KINDS).nullable().optional(),
  messageText: z.string().nullable().optional(),
  messageId: z.string().nullable().optional(),
  valueDomainExpression: z.string().nullable().optional(),
  valueSetName: z.string().nullable().optional(),
  optionLocalName: z.string().nullable().optional(),
  optionValueExpression: z.string().nullable().optional(),
  optionBindingKind: z.enum(APP_BUILDER_CHOICE_OPTION_BINDING_KINDS).nullable().optional(),
  optionLabelExpression: z.string().nullable().optional(),
  matcherExpression: z.string().nullable().optional(),
  includePreflight: z.boolean().nullable().optional(),
}).strict();

const appBuilderSourceLoweringCompositionFieldBindingSchema = z.object({
  fieldName: z.string(),
  bindingExpression: z.string(),
}).strict();

const appBuilderSourceLoweringCompositionFieldControlSelectionSchema = z.object({
  fieldName: z.string(),
  innerControlPatternId: z.enum(APP_BUILDER_CONTROL_PATTERN_IDS),
  fieldControlId: z.string().nullable().optional(),
  labelText: z.string().nullable().optional(),
  messageKind: z.enum(APP_BUILDER_SOURCE_LOWERING_MESSAGE_KINDS).nullable().optional(),
  messageText: z.string().nullable().optional(),
  messageId: z.string().nullable().optional(),
  valueDomainExpression: z.string().nullable().optional(),
  valueSetName: z.string().nullable().optional(),
  optionLocalName: z.string().nullable().optional(),
  optionValueExpression: z.string().nullable().optional(),
  optionBindingKind: z.enum(APP_BUILDER_CHOICE_OPTION_BINDING_KINDS).nullable().optional(),
  optionLabelExpression: z.string().nullable().optional(),
  matcherExpression: z.string().nullable().optional(),
}).strict();

const appBuilderSourceLoweringCompositionRelationshipControlSelectionSchema = z.object({
  relationshipName: z.string(),
  innerControlPatternId: z.enum(APP_BUILDER_CONTROL_PATTERN_IDS).nullable().optional(),
  bindingExpression: z.string().nullable().optional(),
  fieldControlId: z.string().nullable().optional(),
  labelText: z.string().nullable().optional(),
  valueDomainExpression: z.string().nullable().optional(),
  optionLocalName: z.string().nullable().optional(),
  optionValueExpression: z.string().nullable().optional(),
  optionBindingKind: z.enum(APP_BUILDER_CHOICE_OPTION_BINDING_KINDS).nullable().optional(),
  optionLabelExpression: z.string().nullable().optional(),
  matcherExpression: z.string().nullable().optional(),
}).strict();

const appBuilderSourceLoweringCompositionActionBindingSchema = z.object({
  actionName: z.string(),
  handlerExpression: z.string(),
}).strict();

const appBuilderSourceLoweringCompositionBatchActionControlSchema = z.object({
  actionName: z.string(),
  handlerExpression: z.string(),
  buttonText: z.string(),
}).strict();

const appBuilderSourceLoweringCompositionSortBindingSchema = z.object({
  fieldName: z.string(),
  handlerExpression: z.string(),
}).strict();

const appBuilderSourceLoweringCompositionFilterBindingSchema = z.object({
  fieldName: z.string(),
  bindingExpression: z.string(),
}).strict();

const appBuilderSourceLoweringCompositionChildSchema: z.ZodType = z.object({
  composition: z.lazy(() => appBuilderSourceLoweringCompositionSchema).nullable().optional(),
  invocation: appBuilderSourceLoweringInvocationSchema.nullable().optional(),
}).strict();

const appBuilderSourceLoweringCompositionSchema: z.ZodType = z.object({
  targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
  compositionKind: z.enum(APP_BUILDER_SOURCE_LOWERING_COMPOSITION_KINDS).nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  fieldNames: z.array(z.string()).nullable().optional(),
  bindingRootExpression: z.string().nullable().optional(),
  fieldBindingExpressions: z.array(appBuilderSourceLoweringCompositionFieldBindingSchema).nullable().optional(),
  fieldControlSelections: z.array(appBuilderSourceLoweringCompositionFieldControlSelectionSchema).nullable().optional(),
  relationshipNames: z.array(z.string()).nullable().optional(),
  relationshipControlSelections: z.array(appBuilderSourceLoweringCompositionRelationshipControlSelectionSchema).nullable().optional(),
  actionHandlerExpressions: z.array(appBuilderSourceLoweringCompositionActionBindingSchema).nullable().optional(),
  batchActionControls: z.array(appBuilderSourceLoweringCompositionBatchActionControlSchema).nullable().optional(),
  sortHandlerExpressions: z.array(appBuilderSourceLoweringCompositionSortBindingSchema).nullable().optional(),
  filterBindingExpressions: z.array(appBuilderSourceLoweringCompositionFilterBindingSchema).nullable().optional(),
  paginationPreviousHandlerExpression: z.string().nullable().optional(),
  paginationNextHandlerExpression: z.string().nullable().optional(),
  paginationCurrentPageExpression: z.string().nullable().optional(),
  paginationPageCountExpression: z.string().nullable().optional(),
  paginationPreviousButtonText: z.string().nullable().optional(),
  paginationNextButtonText: z.string().nullable().optional(),
  rowSelectionCheckedExpression: z.string().nullable().optional(),
  rowSelectionToggleHandlerExpression: z.string().nullable().optional(),
  rowSelectionColumnHeaderText: z.string().nullable().optional(),
  rowSelectionCheckboxLabelExpression: z.string().nullable().optional(),
  actionName: z.string().nullable().optional(),
  handlerExpression: z.string().nullable().optional(),
  submitButtonText: z.string().nullable().optional(),
  collectionExpression: z.string().nullable().optional(),
  itemLocalName: z.string().nullable().optional(),
  emptyStateText: z.string().nullable().optional(),
  emptyStateConditionExpression: z.string().nullable().optional(),
  promiseExpression: z.string().nullable().optional(),
  pendingText: z.string().nullable().optional(),
  fulfilledLocalName: z.string().nullable().optional(),
  rejectedLocalName: z.string().nullable().optional(),
  rejectedText: z.string().nullable().optional(),
  fulfilledContentComposition: z.lazy(() => appBuilderSourceLoweringCompositionSchema).nullable().optional(),
  childContent: z.array(appBuilderSourceLoweringCompositionChildSchema).nullable().optional(),
  childCompositions: z.array(z.lazy(() => appBuilderSourceLoweringCompositionSchema)).nullable().optional(),
  includePreflight: z.boolean().nullable().optional(),
}).strict();

const appBuilderSourceLoweringSourcePlanSchema = z.object({
  rootDir: z.string().nullable().optional(),
  templatePath: z.string().nullable().optional(),
  sourceTargetPath: z.string().nullable().optional(),
  suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
  decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
  includeDecisionBundleExpansionRows: z.boolean().nullable().optional(),
  includeSourcePlanWitnessRows: z.boolean().nullable().optional(),
  includeSourcePlanContributions: z.boolean().nullable().optional(),
  includeExpectedEffectRows: z.boolean().nullable().optional(),
  includeSourceLoweringResultDetails: z.boolean().nullable().optional(),
  includeControlUseInventoryRows: z.boolean().nullable().optional(),
  includeSourceLoweringRequestFields: z.boolean().nullable().optional(),
  sourceLoweringAppShell: z.object({
    targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
    suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
    decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
    includePreflight: z.boolean().nullable().optional(),
  }).strict().nullable().optional(),
  sourceLoweringApplicationAssembly: z.object({
    targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
    suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
    decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
    routeAreas: z.array(z.object({
      targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
      suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
      decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
      actionName: z.string().nullable().optional(),
      linkText: z.string().nullable().optional(),
      createForm: z.object({
        actionName: z.string().nullable().optional(),
        fieldNames: z.array(z.string()).nullable().optional(),
        submitButtonText: z.string().nullable().optional(),
      }).strict().nullable().optional(),
      serviceCollection: appBuilderSourceLoweringRouterBackedListDetailServiceCollectionSchema.nullable().optional(),
      includePreflight: z.boolean().nullable().optional(),
    }).strict()).nullable().optional(),
    includePreflight: z.boolean().nullable().optional(),
  }).strict().nullable().optional(),
  sourceLoweringRouterBackedListDetail: z.object({
    targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
    suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
    decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
    actionName: z.string().nullable().optional(),
    linkText: z.string().nullable().optional(),
    createForm: z.object({
      actionName: z.string().nullable().optional(),
      fieldNames: z.array(z.string()).nullable().optional(),
      submitButtonText: z.string().nullable().optional(),
    }).strict().nullable().optional(),
    serviceCollection: appBuilderSourceLoweringRouterBackedListDetailServiceCollectionSchema.nullable().optional(),
    includePreflight: z.boolean().nullable().optional(),
  }).strict().nullable().optional(),
  sourceLoweringDiStateClass: z.object({
    targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
    suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
    decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
    includePreflight: z.boolean().nullable().optional(),
  }).strict().nullable().optional(),
  sourceLoweringLocalViewModelState: z.object({
    targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
    suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
    decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
    includePreflight: z.boolean().nullable().optional(),
  }).strict().nullable().optional(),
  sourceLoweringInvocation: appBuilderSourceLoweringInvocationSchema.nullable().optional(),
  sourceLoweringComposition: appBuilderSourceLoweringCompositionSchema.nullable().optional(),
  sourceLoweringComponentPair: z.object({
    suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
    decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
    appShell: z.object({
      entrypointPath: z.string().nullable().optional(),
    }).strict().nullable().optional(),
    sourceLoweringComposition: appBuilderSourceLoweringCompositionSchema.nullable().optional(),
    sourceLoweringTemplateInvocations: z.array(appBuilderSourceLoweringInvocationSchema).nullable().optional(),
    sourceLoweringLocalViewModelState: z.object({
      targetRef: appBuilderOntologyRowRefSchema.nullable().optional(),
      suppliedInputs: z.array(appBuilderSuppliedInputSchema).nullable().optional(),
      decisionBundles: z.array(appBuilderDecisionBundleSchema).nullable().optional(),
      includePreflight: z.boolean().nullable().optional(),
    }).strict().nullable().optional(),
    sourceLoweringClassMemberInvocations: z.array(appBuilderSourceLoweringInvocationSchema).nullable().optional(),
    serviceCollections: z.array(appBuilderSourceLoweringComponentPairServiceCollectionSchema).nullable().optional(),
  }).strict().nullable().optional(),
}).strict();

export const workspaceOverviewInputSchema = {
  ...workspaceShape,
  projectPage: pageSchema.nullable().optional(),
} as const;
export const analysisCacheOverviewInputSchema = {
  ...optionalRuntimeSelectorShape,
  includeKernelBreakdowns: z.boolean().nullable().optional(),
  includeDetailDensity: z.boolean().nullable().optional(),
  includeQueryClaimRows: z.boolean().nullable().optional(),
  rowLimit: z.number().int().nonnegative().nullable().optional(),
} as const;
export const clearAnalysisCacheInputSchema = {
  ...optionalRuntimeSelectorShape,
  typeSystemDependencyCacheClearPolicy: z.enum(SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES).nullable().optional(),
} as const;
export const appQueryCatalogInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  queryKind: z.enum(SEMANTIC_APP_QUERY_KINDS).nullable().optional(),
} as const;

export const appBuilderCatalogInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  storeKey: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  queryKind: z.enum(SEMANTIC_RUNTIME_APP_BUILDER_QUERY_KINDS).nullable().optional(),
  inquiryProfile: z.string().nullable().optional(),
  ...continuationIntentShape,
} as const;

export const appBuilderQueryInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  storeKey: z.string().nullable().optional(),
  queryKind: z.enum(SEMANTIC_RUNTIME_APP_BUILDER_QUERY_KINDS),
  inquiryProfile: z.string().nullable().optional(),
  ...continuationIntentShape,
  page: pageSchema.nullable().optional(),
  partMenu: appBuilderPartMenuSchema.optional(),
  ontologyCatalog: appBuilderOntologyCatalogSchema.optional(),
  inputReadiness: appBuilderInputReadinessSchema.optional(),
  inputContractDetail: appBuilderInputContractDetailSchema.optional(),
  affordanceDetail: appBuilderAffordanceDetailSchema.optional(),
  applicationPatternDetail: appBuilderApplicationPatternDetailSchema.optional(),
  collectionConceptDetail: appBuilderCollectionConceptDetailSchema.optional(),
  controlManifestDetail: appBuilderControlManifestDetailSchema.optional(),
  controlPatternDetail: appBuilderControlPatternDetailSchema.optional(),
  effectContractDetail: appBuilderEffectContractDetailSchema.optional(),
  policyDetail: appBuilderPolicyDetailSchema.optional(),
  recommendationPolicy: appBuilderRecommendationPolicySchema.optional(),
  styleDetail: appBuilderStyleDetailSchema.optional(),
  targetCatalog: appBuilderTargetCatalogSchema.optional(),
  sourceLoweringPreflight: appBuilderSourceLoweringPreflightSchema.optional(),
  sourceLoweringInvocation: appBuilderSourceLoweringInvocationSchema.optional(),
  sourceLoweringComposition: appBuilderSourceLoweringCompositionSchema.optional(),
  sourceLoweringSourcePlan: appBuilderSourceLoweringSourcePlanSchema.optional(),
  partSourceLoweringPreview: appBuilderPartSourceLoweringPreviewSchema.optional(),
  partSourceInvocation: appBuilderPartSourceInvocationSchema.optional(),
} as const;

export const appQueryInputSchema = {
  ...openAppShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  queryKind: z.enum(SEMANTIC_APP_QUERY_KINDS),
  cursor: cursorSchema.nullable().optional(),
  sourceFile: sourceFileSchema.nullable().optional(),
} as const;

export const appQueryBatchInputSchema = {
  ...openAppShape,
  ...continuationIntentShape,
  queries: z.array(semanticAppQuerySchema).min(1),
  includeAppProfile: z.boolean().nullable().optional(),
  includeAppQueryClaimProfiles: z.boolean().nullable().optional(),
} as const;

export const appOverviewInputSchema = {
  ...openAppShape,
  diagnosticPageSize: z.number().int().positive().nullable().optional(),
  openSeamPageSize: z.number().int().positive().nullable().optional(),
} as const;

export const routerOverviewInputSchema = {
  ...openAppShape,
  rowPageSize: z.number().int().nonnegative().nullable().optional(),
  detail: z.enum(SEMANTIC_RUNTIME_DETAIL_VALUES).nullable().optional(),
} as const;

export const openSeamOverviewInputSchema = {
  ...openAppShape,
  ...pagedShape,
} as const;

export const appDiagnosticsInputSchema = {
  ...openAppShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  sourceFile: sourceFileSchema.nullable().optional(),
} as const;

export const diagnosticOverviewInputSchema = appDiagnosticsInputSchema;

export const templateCursorInputSchema = {
  ...workspaceShape,
  ...pagedShape,
  ...continuationIntentShape,
  ...appRetentionShape,
  cursor: cursorSchema,
  projectKey: z.string().nullable().optional(),
  analysisDepth: z.enum(SEMANTIC_APP_ANALYSIS_DEPTHS).nullable().optional(),
  includeAuthoringTemplates: z.boolean().nullable().optional(),
  authoringTemplateSourceFiles: z.array(z.string()).nullable().optional(),
  authoringTemplateLimit: z.number().int().nonnegative().nullable().optional(),
} as const;

export const templateDiagnosticsInputSchema = {
  ...workspaceShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  ...appRetentionShape,
  sourceFile: sourceFileSchema.nullable().optional(),
  projectKey: z.string().nullable().optional(),
  analysisDepth: z.enum(SEMANTIC_APP_ANALYSIS_DEPTHS).nullable().optional(),
  includeAuthoringTemplates: z.boolean().nullable().optional(),
  authoringTemplateSourceFiles: z.array(z.string()).nullable().optional(),
  authoringTemplateLimit: z.number().int().nonnegative().nullable().optional(),
} as const;

export const aureliaMcpResponseOutputSchema = {
  tool: z.string(),
  generatedAt: z.string(),
  workspaceRoot: z.string().nullable(),
  value: z.unknown(),
} as const;
