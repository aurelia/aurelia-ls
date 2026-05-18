import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticProjectAnalysisKind,
  SemanticProjectShapeKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const authoringFixtureRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/authoring');
const pressureFixtureRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/pressure');
const defaultRoots = [
  ...fixtureChildRoots(authoringFixtureRoot, (name) => name.startsWith('generated-') || name === 'storefront'),
  ...fixtureChildRoots(pressureFixtureRoot),
];
const defaultAppApiPressureAnalysisKinds = new Set([
  SemanticProjectAnalysisKind.AppWorld,
  SemanticProjectAnalysisKind.ResourceLibraryAuthoring,
]);
const roots = pressureRoots();
const analysisDepth = pressureAnalysisDepth();
const projectShapeFilter = pressureProjectShapeFilter();
const projectKeyFilter = pressureProjectKeyFilter();
const projectRootDirFilter = pressureProjectRootDirFilter();
const projectDiscovery = pressureProjectDiscovery();
const detailMode = pressureDetailMode();
const outputMode = pressureOutputMode();
const authoringSourceFileLimitPerProject = integerEnv('SEMANTIC_RUNTIME_APP_AUTHORING_SOURCE_FILE_LIMIT_PER_PROJECT', 12);

console.log('semantic-runtime app API pressure');
console.log('scope: transient app-world API pressure; project keys, paths, and source text are omitted');
console.log('note: compact/summary detail buckets source-assignment and open-seam reasons into generalized pressure');
console.log('note: raw detail may include source-level names; do not promote it from external clean-room roots without manual abstraction');
console.log(`analysis-depth: ${analysisDepth}`);
console.log(`project-shapes: ${projectShapeFilter == null ? 'all' : [...projectShapeFilter].join(',')}`);
console.log(`project-keys: ${projectKeyFilter == null ? 'all' : `${projectKeyFilter.size} selected`}`);
console.log(`project-root-dirs: ${projectRootDirFilter == null ? 'all' : `${projectRootDirFilter.length} selected`}`);
console.log(`project-discovery: ${projectDiscovery ?? 'default'}`);
console.log(`default-analysis-policy: ${projectShapeFilter == null ? 'app-world,resource-library-authoring' : 'shape-filter-explicit'}`);
console.log(`detail-mode: ${detailMode}`);
console.log(`output-mode: ${outputMode}`);
console.log('compact-output: route-friendly pressure counts by default; set SEMANTIC_RUNTIME_PRESSURE_DETAIL=summary or raw for wider buckets');
console.log(`authoring-source-file-limit-per-project: ${authoringSourceFileLimitPerProject}`);
console.log(`inputs: ${roots.length}`);

const aggregateStart = performance.now();
const rootAggregates = [];
for (const [index, root] of roots.entries()) {
  const started = performance.now();
  const aggregate = await readPressureForRoot(root);
  rootAggregates.push(aggregate);
  if (outputMode !== 'aggregate') {
    console.log('');
    console.log(`input ${index + 1}`);
    printInputSummary(aggregate, performance.now() - started);
    printTimings('timings', aggregate.timings);
    printAggregateCounts(aggregate);
  }
}

function fixtureChildRoots(rootDir, includeName = () => true) {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => {
      const childRoot = path.join(rootDir, entry.name);
      return entry.isDirectory() && includeName(entry.name) && fixtureRootHasFiles(childRoot);
    })
    .map((entry) => path.join(rootDir, entry.name))
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

function fixtureRootHasFiles(rootDir) {
  const pending = [rootDir];
  while (pending.length > 0) {
    const currentDir = pending.pop();
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isFile()) {
        return true;
      }
      if (entry.isDirectory()) {
        pending.push(path.join(currentDir, entry.name));
      }
    }
  }
  return false;
}

if (outputMode !== 'inputs' && rootAggregates.length > 0) {
  const aggregate = combinePressureAggregates(rootAggregates);
  console.log('');
  console.log(`combined inputs (${rootAggregates.length})`);
  printInputSummary(aggregate, performance.now() - aggregateStart);
  printTimings('combined timings', aggregate.timings);
  printAggregateCounts(aggregate);
}

function printInputSummary(aggregate, requestMilliseconds) {
  console.log(`- request: ${requestMilliseconds.toFixed(1)}ms`);
  console.log(
    `- source/app: projects=${aggregate.projects}, selected=${aggregate.selectedProjects}, ` +
    `opened=${aggregate.openedAppWorlds}, files=${aggregate.sourceFiles}, templates=${aggregate.appRuntimeTemplatesSeen}, ` +
    `resources=${aggregate.resourceDefinitions}, controllers=${aggregate.runtimeControllers}, ` +
    `targetAccesses=${aggregate.bindingTargetAccesses}, behaviorApps=${aggregate.bindingBehaviorApplications}, valueChannels=${aggregate.bindingValueChannels}, dataFlows=${aggregate.bindingDataFlows}`,
  );
  console.log(
    `- authoring: coverage=${aggregate.authoringOrientationCoverageRows}, taste=${aggregate.authoringOrientationTasteValues}, ` +
    `capabilities=${aggregate.authoringOrientationCapabilities}, operations=${aggregate.authoringOrientationOperations}, ` +
    `repairs=${aggregate.authoringOrientationRepairs}, repairClusters=${aggregate.authoringOrientationRepairClusters}, ` +
    `openReasons=${aggregate.authoringOrientationOpenReasons}`,
  );
  const auxiliaryParts = [
    metricPart('appTasks', aggregate.appTasks),
    metricPart('diKeys', aggregate.diKeyIdentities),
    metricPart('stateStores', aggregate.stateStores),
    metricPart('diResolve', aggregate.diResolveCallSites),
    metricPart('diIssues', aggregate.diIssues),
    metricPart('i18nKeys', aggregate.i18nTranslationKeys),
    metricPart('i18nBindings', aggregate.i18nTranslationBindings),
    metricPart('bindables', aggregate.bindables),
    metricPart('watches', aggregate.watches),
    metricPart('topologyServices', aggregate.appTopologyServices),
    metricPart('topologyInjections', aggregate.appTopologyInjections),
    metricPart('topologyServiceInteractions', aggregate.appTopologyServiceInteractions),
    metricPart('topologyServiceInteractionBindings', aggregate.appTopologyServiceInteractionBindings),
    metricPart('stateCompositions', aggregate.appTopologyStateCompositions),
    metricPart('topologyStyles', aggregate.appTopologyStyles),
    metricPart('componentRoles', aggregate.appTopologyComponentRoles),
    metricPart('runtimeCompositions', aggregate.runtimeCompositions),
    metricPart('runtimeCompositionCandidates', aggregate.runtimeCompositionResolvedComponents),
    metricPart('runtimeCompositionTemplates', aggregate.runtimeCompositionCompiledTemplates),
    metricPart('runtimeCompositionCandidateResourceAnalyses', aggregate.runtimeCompositionCandidateResourceAnalyses),
    metricPart('runtimeCompositionComposedControllers', aggregate.runtimeCompositionComposedChildControllers),
    metricPart('runtimeCompositionModelHandoffs', aggregate.runtimeCompositionModelAssignableHandoffs),
    metricPart('authoringSources', aggregate.authoringSourceFilesRequested),
    metricPart('authoringTemplates', aggregate.authoringTemplatesSeen),
  ].filter(Boolean);
  if (auxiliaryParts.length > 0) {
    console.log(`- auxiliary: ${auxiliaryParts.join(', ')}`);
  }
  const routerParts = [
    metricPart('options', aggregate.routerOptions),
    metricPart('configs', aggregate.routeConfigs),
    metricPart('contexts', aggregate.routeContexts),
    metricPart('recognizers', aggregate.routeRecognizers),
    metricPart('patterns', aggregate.routePatterns),
    metricPart('endpoints', aggregate.routeEndpoints),
    metricPart('states', aggregate.routeRecognizerStates),
    metricPart('issues', aggregate.routeRecognizerIssues),
    metricPart('routerIssues', aggregate.routerIssues),
    metricPart('recognized', aggregate.recognizedRoutes),
    metricPart('typedNav', aggregate.typedNavigationInstructions),
    metricPart('viewportInstructions', aggregate.viewportInstructions),
    metricPart('instructionTrees', aggregate.viewportInstructionTrees),
    metricPart('routeTrees', aggregate.routeTrees),
    metricPart('nodes', aggregate.routeNodes),
    metricPart('viewports', aggregate.routerViewports),
    metricPart('viewportAgents', aggregate.viewportAgents),
    metricPart('componentAgents', aggregate.componentAgents),
  ].filter(Boolean);
  if (routerParts.length > 0) {
    console.log(`- router: ${routerParts.join(', ')}`);
  }
  const pressureParts = [
    metricPart('configurationIssues', aggregate.configurationIssues),
    metricPart('evaluationIssues', aggregate.evaluationIssues),
    metricPart('diIssues', aggregate.diIssues),
    metricPart('observationIssues', aggregate.observationIssues),
    metricPart('validationIssues', aggregate.validationIssues),
    metricPart('fetchClientIssues', aggregate.fetchClientIssues),
    metricPart('dialogIssues', aggregate.dialogIssues),
    metricPart('diagnostics', aggregate.templateDiagnostics),
    metricPart('appDiagnostics', aggregate.appDiagnostics),
    metricPart('resourceIssues', aggregate.resourceIssues),
    metricPart('openFlows', aggregate.openBindingDataFlows),
    metricPart('openRuntimeCompositions', aggregate.openRuntimeCompositions),
    metricPart('assignmentPressure', aggregate.bindingDataFlowSourceAssignmentPressures),
    metricPart('unresolvedEdges', aggregate.unresolvedModuleEdges),
    metricPart('openSeams', aggregate.openSeams),
    metricPart('appRootOpenSeams', aggregate.appRootProjectOpenSeams),
    metricPart('nonAppRootOpenSeams', aggregate.nonAppRootProjectOpenSeams),
    metricPart('missingAppRoots', aggregate.projectsWithoutAppRoots),
    metricPart('resourceLibraries', aggregate.resourceLibrariesWithoutAppRoots),
  ].filter(Boolean);
  console.log(pressureParts.length > 0 ? `- pressure: ${pressureParts.join(', ')}` : '- pressure: closed');
}

function metricPart(label, value) {
  return value > 0 ? `${label}=${value}` : null;
}

function pressureFixtureLane(root) {
  const resolvedRoot = path.resolve(root);
  if (isPathAtOrUnder(resolvedRoot, authoringFixtureRoot)) {
    return path.basename(resolvedRoot).startsWith('generated-')
      ? 'generated-authoring-fixture'
      : 'hand-authored-authoring-fixture';
  }
  if (isPathAtOrUnder(resolvedRoot, pressureFixtureRoot)) {
    return 'stress-pressure-fixture';
  }
  return 'custom-root';
}

function pressureFixtureKey(root) {
  const resolvedRoot = path.resolve(root);
  if (isPathAtOrUnder(resolvedRoot, authoringFixtureRoot)) {
    return `authoring:${fixtureRootName(resolvedRoot, authoringFixtureRoot)}`;
  }
  if (isPathAtOrUnder(resolvedRoot, pressureFixtureRoot)) {
    return `pressure:${fixtureRootName(resolvedRoot, pressureFixtureRoot)}`;
  }
  return 'custom-root';
}

function fixtureRootName(resolvedRoot, fixtureRoot) {
  const relativePath = path.relative(fixtureRoot, resolvedRoot);
  if (relativePath === '') {
    return 'root';
  }
  return relativePath.split(path.sep).filter(Boolean)[0] ?? path.basename(resolvedRoot);
}

function isPathAtOrUnder(candidate, parent) {
  const relativePath = path.relative(parent, candidate);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function combinePressureAggregates(aggregates) {
  const combined = {
    timings: createTimingAccumulator(),
  };
  for (const aggregate of aggregates) {
    mergePressureAggregate(combined, aggregate);
  }
  return combined;
}

function mergePressureAggregate(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (key === 'timings') {
      mergeTimingAccumulator(target.timings, value);
    } else if (typeof value === 'number') {
      target[key] = staticCatalogAggregateKey(key)
        ? Math.max(target[key] ?? 0, value)
        : (target[key] ?? 0) + value;
    } else if (value instanceof Set) {
      const targetSet = target[key] instanceof Set ? target[key] : new Set();
      for (const item of value) {
        targetSet.add(item);
      }
      target[key] = targetSet;
    } else if (isCountMap(value)) {
      target[key] ??= {};
      if (staticCatalogAggregateKey(key)) {
        mergeMaxCounts(target[key], value);
      } else {
        incrementAll(target[key], value);
      }
    }
  }
}

function staticCatalogAggregateKey(key) {
  return key.startsWith('authoringCatalog');
}

function mergeTimingAccumulator(target, source) {
  incrementAll(target.totals, source.totals);
  incrementAll(target.phaseItemCounts, source.phaseItemCounts);
  incrementAll(target.expressionTypeCache, source.expressionTypeCache);
  incrementAll(target.expressionTypeCacheEntriesByBucket, source.expressionTypeCacheEntriesByBucket);
  incrementAll(target.expressionTypeCacheHitsByBucket, source.expressionTypeCacheHitsByBucket);
  incrementAll(target.expressionTypeCacheMissesByBucket, source.expressionTypeCacheMissesByBucket);
  incrementAll(target.expressionTypeCacheWritesByBucket, source.expressionTypeCacheWritesByBucket);
  incrementAll(target.typeSystemHostSourceFileCache, source.typeSystemHostSourceFileCache);
  incrementAll(target.projectBuckets, source.projectBuckets);
  target.slowestProjectMilliseconds = Math.max(
    target.slowestProjectMilliseconds,
    source.slowestProjectMilliseconds ?? 0,
  );
}

function isCountMap(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function printAggregateCounts(aggregate) {
  if (detailMode === 'compact') {
    printCompactAggregateCounts(aggregate);
    return;
  }
  if (detailMode === 'raw') {
    printRawAggregateCounts(aggregate);
    return;
  }
  printCounts('project shape kinds', aggregate.projectShapeKinds);
  printCounts('fixture lanes', aggregate.fixtureLaneKinds);
  printCounts('skipped project filters', aggregate.skippedProjectFilters);
  printCounts('project analysis kinds', aggregate.projectAnalysisKinds);
  printCounts('skipped project analysis kinds', aggregate.skippedProjectAnalysisKinds);
  printCounts('project source roles', aggregate.projectSourceRoles);
  printCounts('project Aurelia dependency origins', aggregate.projectAureliaDependencyOrigins);
  printCounts('project Aurelia dependency scope origins', aggregate.projectAureliaDependencyScopeOrigins);
  printCounts('project Aurelia source signals', aggregate.projectAureliaSourceSignals);
  printCounts('project shape reasons', aggregate.projectShapeReasons);
  printCounts('app topology service roles', aggregate.appTopologyServiceRoles);
  printCounts('app topology service export states', aggregate.appTopologyServiceExportStates);
  printCounts('app topology service resolve call counts', aggregate.appTopologyServiceResolveCallCounts);
  printCounts('app topology injection mechanisms', aggregate.appTopologyInjectionMechanisms);
  printCounts('app topology injection key declaration kinds', aggregate.appTopologyInjectionKeyDeclarationKinds);
  printCounts('app topology injection key declaration roles', aggregate.appTopologyInjectionKeyDeclarationRoles);
  printCounts('app topology injection key import kinds', aggregate.appTopologyInjectionKeyImportKinds);
  printCounts('app topology injection key import scopes', aggregate.appTopologyInjectionKeyImportScopes);
  printCounts('app topology injection consumer classes', aggregate.appTopologyInjectionConsumerClasses);
  printCounts('app topology injection consumer member kinds', aggregate.appTopologyInjectionConsumerMemberKinds);
  printCounts('app topology injection execution contexts', aggregate.appTopologyInjectionExecutionContexts);
  printCounts('app topology injection active-container expectations', aggregate.appTopologyInjectionActiveContainerExpectations);
  printCounts('app topology injection nullish key argument counts', aggregate.appTopologyInjectionNullishKeyArgumentCounts);
  printCounts('app topology injection nullish key argument kinds', aggregate.appTopologyInjectionNullishKeyArgumentKinds);
  printCounts('app topology injection source coverage', aggregate.appTopologyInjectionSourceCoverage);
  printCounts('app topology service interaction operation kinds', aggregate.appTopologyServiceInteractionOperationKinds);
  printCounts('app topology service interaction target roles', aggregate.appTopologyServiceInteractionTargetRoles);
  printCounts('app topology service interaction consumer roles', aggregate.appTopologyServiceInteractionConsumerRoles);
  printCounts('app topology service interaction consumer classes', aggregate.appTopologyServiceInteractionConsumerClasses);
  printCounts('app topology service interaction consumer members', aggregate.appTopologyServiceInteractionConsumerMembers);
  printCounts('app topology service interaction argument counts', aggregate.appTopologyServiceInteractionArgumentCounts);
  printCounts('app topology service interaction self states', aggregate.appTopologyServiceInteractionSelfStates);
  printCounts('app topology service interaction source coverage', aggregate.appTopologyServiceInteractionSourceCoverage);
  printCounts('app topology service interaction binding source kinds', aggregate.appTopologyServiceInteractionBindingSourceKinds);
  printCounts('app topology service interaction binding source roots', aggregate.appTopologyServiceInteractionBindingSourceRoots);
  printCounts('app topology service interaction binding directions', aggregate.appTopologyServiceInteractionBindingDirections);
  printCounts('app topology service interaction binding target properties', aggregate.appTopologyServiceInteractionBindingTargetProperties);
  printCounts('app topology service interaction binding operation kinds', aggregate.appTopologyServiceInteractionBindingOperationKinds);
  printCounts('app topology service interaction binding target roles', aggregate.appTopologyServiceInteractionBindingTargetRoles);
  printCounts('app topology service interaction binding self states', aggregate.appTopologyServiceInteractionBindingSelfStates);
  printCounts('app topology component roles', aggregate.appTopologyComponentRolesByKind);
  printCounts('app topology component role evidence', aggregate.appTopologyComponentRoleEvidence);
  printCounts('app topology component role source coverage', aggregate.appTopologyComponentRoleSourceCoverage);
  printCounts('app topology state composition roles', aggregate.appTopologyStateCompositionRoles);
  printCounts('app topology state composition value type shapes', aggregate.appTopologyStateCompositionValueTypeShapes);
  printCounts('app topology state composition source coverage', aggregate.appTopologyStateCompositionSourceCoverage);
  printCounts('runtime composition component resolution', aggregate.runtimeCompositionComponentResolutionKinds);
  printCounts('runtime composition model resolution', aggregate.runtimeCompositionModelResolutionKinds);
  printCounts('runtime composition scope behavior', aggregate.runtimeCompositionScopeBehavior);
  printCounts('runtime composition flush mode', aggregate.runtimeCompositionFlushMode);
  printCounts('runtime composition tag', aggregate.runtimeCompositionTag);
  printCounts('runtime composition component input', aggregate.runtimeCompositionComponentInput);
  printCounts('runtime composition template input', aggregate.runtimeCompositionTemplateInput);
  printCounts('runtime composition component input fulfillment', aggregate.runtimeCompositionComponentInputFulfillmentKinds);
  printCounts('runtime composition template input fulfillment', aggregate.runtimeCompositionTemplateInputFulfillmentKinds);
  printCounts('runtime composition model input fulfillment', aggregate.runtimeCompositionModelInputFulfillmentKinds);
  printCounts('runtime composition static component name', aggregate.runtimeCompositionStaticComponentName);
  printCounts('runtime composition template binding', aggregate.runtimeCompositionTemplateBinding);
  printCounts('runtime composition composition binding', aggregate.runtimeCompositionCompositionBinding);
  printCounts('runtime composition composing binding', aggregate.runtimeCompositionComposingBinding);
  printCounts('runtime composition candidate counts', aggregate.runtimeCompositionCandidateCounts);
  printCounts('runtime composition compiled-template counts', aggregate.runtimeCompositionCompiledTemplateCounts);
  printCounts('runtime composition candidate resource-analysis states', aggregate.runtimeCompositionCandidateResourceAnalysisStates);
  printCounts('runtime composition candidate resource-analysis counts', aggregate.runtimeCompositionCandidateResourceAnalysisCounts);
  printCounts('runtime composition candidate resource-controller counts', aggregate.runtimeCompositionCandidateResourceControllerCounts);
  printCounts('runtime composition candidate resource-controller creation kinds', aggregate.runtimeCompositionCandidateResourceControllerCreationKinds);
  printCounts('runtime composition composed child-controller counts', aggregate.runtimeCompositionComposedChildControllerCounts);
  printCounts('runtime composition composed child-controller creation kinds', aggregate.runtimeCompositionComposedChildControllerCreationKinds);
  printCounts('runtime composition activation handoff kinds', aggregate.runtimeCompositionActivationHandoffKinds);
  printCounts('runtime composition activation parameter types', aggregate.runtimeCompositionActivationParameterTypes, 12);
  printCounts('runtime composition activation assignability', aggregate.runtimeCompositionActivationAssignability);
  printCounts('runtime composition source coverage', aggregate.runtimeCompositionSourceCoverage);
  printCounts('runtime composition open reasons', aggregate.runtimeCompositionOpenReasons, 12);
  printCounts('runtime composition open reason kinds', aggregate.runtimeCompositionOpenReasonKinds, 12);
  printCounts('app topology style asset kinds', aggregate.appTopologyStyleAssetKinds);
  printCounts('app topology style source kinds', aggregate.appTopologyStyleSourceKinds);
  printCounts('app topology style owner kinds', aggregate.appTopologyStyleOwnerKinds);
  printCounts('app topology style source coverage', aggregate.appTopologyStyleSourceCoverage);
  printCounts('app topology style evidence coverage', aggregate.appTopologyStyleEvidenceCoverage);
  printCounts('state store defaultness', aggregate.stateStoreDefaultness);
  printCounts('state store initial-state kinds', aggregate.stateStoreInitialStateKinds);
  printCounts('state store options-or-handler kinds', aggregate.stateStoreOptionsOrHandlerKinds);
  printCounts('state store action-handler counts', aggregate.stateStoreActionHandlerCounts);
  printCounts('i18n translation key locale states', aggregate.i18nTranslationKeyLocaleStates);
  printCounts('i18n translation key namespace states', aggregate.i18nTranslationKeyNamespaceStates);
  printCounts('i18n translation key source coverage', aggregate.i18nTranslationKeySourceCoverage);
  printCounts('i18n translation key source kinds', aggregate.i18nTranslationKeySourceKinds);
  printCounts('i18n translation key segment counts', aggregate.i18nTranslationKeySegmentCounts);
  printCounts('i18n translation binding key expression kinds', aggregate.i18nTranslationBindingKeyExpressionKinds);
  printCounts('i18n translation binding target properties', aggregate.i18nTranslationBindingTargetProperties);
  printCounts('i18n translation binding target kinds', aggregate.i18nTranslationBindingTargetKinds);
  printCounts('i18n translation binding parameter presence', aggregate.i18nTranslationBindingParameterPresence);
  printCounts('i18n translation binding issue counts', aggregate.i18nTranslationBindingIssueCounts);
  printCounts('i18n translation binding framework code presence', aggregate.i18nTranslationBindingFrameworkErrorCodePresence);
  printCounts('authoring catalog taste axis layers', aggregate.authoringCatalogTasteAxisLayers);
  printCounts('authoring catalog taste axis value layers', aggregate.authoringCatalogTasteAxisValueLayers, 36);
  printCounts('authoring catalog taste axis primitive-policy value counts', aggregate.authoringCatalogTasteAxisPrimitivePolicyValueCounts);
  printCounts('authoring catalog taste axis observed-shape value counts', aggregate.authoringCatalogTasteAxisObservedShapeValueCounts);
  printCounts('authoring catalog taste axis derived-reading value counts', aggregate.authoringCatalogTasteAxisDerivedReadingValueCounts);
  printCounts('authoring catalog taste value layers', aggregate.authoringCatalogTasteValueLayers);
  printCounts('authoring catalog profile preference counts', aggregate.authoringCatalogProfilePreferenceCounts, 18);
  printCounts('authoring catalog profile preference axes', aggregate.authoringCatalogProfilePreferenceAxes, 18);
  printCounts('authoring catalog profile preference values', aggregate.authoringCatalogProfilePreferenceValues, 18);
  printCounts('authoring catalog profile preference layers', aggregate.authoringCatalogProfilePreferenceLayers, 18);
  printCounts('authoring catalog operation families', aggregate.authoringCatalogOperationFamiliesByKey, 18);
  printCounts('authoring catalog operation actions', aggregate.authoringCatalogOperationActions, 18);
  printCounts('authoring catalog operation targets', aggregate.authoringCatalogOperationTargetKinds, 18);
  printCounts('authoring catalog operation capability counts', aggregate.authoringCatalogOperationCapabilityCounts, 18);
  printCounts('authoring catalog capability product open reasons', aggregate.authoringCatalogCapabilityProductOpenReasons, 18);
  printCounts('authoring catalog operation product open reasons', aggregate.authoringCatalogOperationProductOpenReasons, 18);
  printCounts('authoring catalog recipe support states', aggregate.authoringCatalogRecipeSupportStates, 18);
  printCounts('authoring catalog recipe base keys', aggregate.authoringCatalogRecipeBaseKeys, 18);
  printCounts('authoring catalog recipe specificity ranks', aggregate.authoringCatalogRecipeSpecificityRanks, 18);
  printCounts('authoring catalog recipe preference counts', aggregate.authoringCatalogRecipePreferenceCounts, 18);
  printCounts('authoring catalog recipe preference axes', aggregate.authoringCatalogRecipePreferenceAxes, 18);
  printCounts('authoring catalog recipe preference values', aggregate.authoringCatalogRecipePreferenceValues, 18);
  printCounts('authoring catalog recipe preference layers', aggregate.authoringCatalogRecipePreferenceLayers, 18);
  printCounts('authoring catalog recipe source plan presence', aggregate.authoringCatalogRecipeSourcePlanPresence, 18);
  printCounts('authoring catalog recipe source plan conflict policies', aggregate.authoringCatalogRecipeSourcePlanConflictPolicies, 18);
  printCounts('authoring catalog recipe source plan formatting policies', aggregate.authoringCatalogRecipeSourcePlanFormattingPolicies, 18);
  printCounts('authoring catalog recipe source plan package-tooling policies', aggregate.authoringCatalogRecipeSourcePlanPackageToolingPolicies, 18);
  printCounts('authoring catalog recipe source plan file counts', aggregate.authoringCatalogRecipeSourcePlanFileCounts, 18);
  printCounts('authoring catalog recipe project tooling presence', aggregate.authoringCatalogRecipeProjectToolingPresence, 18);
  printCounts('authoring catalog recipe project tooling package managers', aggregate.authoringCatalogRecipeProjectToolingPackageManagers, 18);
  printCounts('authoring catalog recipe project tooling build-tool policies', aggregate.authoringCatalogRecipeProjectToolingBuildToolPolicies, 18);
  printCounts('authoring catalog recipe project tooling dependency scopes', aggregate.authoringCatalogRecipeProjectToolingDependencyScopes, 18);
  printCounts('authoring catalog recipe project tooling dependency specifiers', aggregate.authoringCatalogRecipeProjectToolingDependencySpecifiers, 18);
  printCounts('authoring catalog recipe project tooling script names', aggregate.authoringCatalogRecipeProjectToolingScriptNames, 18);
  printCounts('authoring catalog recipe project tooling file kinds', aggregate.authoringCatalogRecipeProjectToolingFileKinds, 18);
  printCounts('authoring catalog recipe project tooling file languages', aggregate.authoringCatalogRecipeProjectToolingFileLanguages, 18);
  printCounts('authoring catalog recipe project tooling text authorities', aggregate.authoringCatalogRecipeProjectToolingTextAuthorities, 18);
  printCounts('authoring catalog recipe source file roles', aggregate.authoringCatalogRecipeSourceFileRoles, 18);
  printCounts('authoring catalog recipe source file languages', aggregate.authoringCatalogRecipeSourceFileLanguages, 18);
  printCounts('authoring catalog recipe source file edit kinds', aggregate.authoringCatalogRecipeSourceFileEditKinds, 18);
  printCounts('authoring catalog recipe source file text authorities', aggregate.authoringCatalogRecipeSourceFileTextAuthorities, 18);
  printCounts('authoring catalog recipe expected effects', aggregate.authoringCatalogRecipeExpectedEffectKinds, 18);
  printCounts('authoring catalog recipe expected effect roles', aggregate.authoringCatalogRecipeExpectedEffectRoles, 18);
  printCounts('authoring catalog recipe expected effect targets', aggregate.authoringCatalogRecipeExpectedEffectTargets, 18);
  printCounts('authoring catalog recipe expected effect filter counts', aggregate.authoringCatalogRecipeExpectedEffectFilterCounts, 18);
  printCounts('authoring catalog recipe expected effect filter fields', aggregate.authoringCatalogRecipeExpectedEffectFilterFields, 18);
  printCounts('authoring taste axis primitive-policy state', aggregate.authoringTasteAxisPolicyStates);
  printCounts('authoring taste axis keys', aggregate.authoringTasteAxisKeys, 24);
  printCounts('authoring taste axis key primitive-policy state', aggregate.authoringTasteAxisKeyPolicyStates, 24);
  printCounts('authoring taste axis key value counts', aggregate.authoringTasteAxisKeyValueCounts, 24);
  printCounts('authoring taste axis key open reasons', aggregate.authoringTasteAxisKeyOpenReasons, 24);
  printCounts('authoring taste axis primitive-policy value counts', aggregate.authoringTasteAxisPrimitivePolicyValueCounts);
  printCounts('authoring taste axis observed-shape value counts', aggregate.authoringTasteAxisObservedShapeValueCounts);
  printCounts('authoring taste axis derived-reading value counts', aggregate.authoringTasteAxisDerivedReadingValueCounts);
  printCounts('authoring taste value layers', aggregate.authoringTasteValueLayers);
  printCounts('authoring taste axis values', aggregate.authoringTasteAxisValues, 24);
  printAuthoringTasteFocus(aggregate);
  printCounts('authoring taste values', aggregate.authoringTasteValues, 24);
  printCounts('authoring capability support states', aggregate.authoringCapabilitySupportStates);
  printCounts('authoring capability open reasons', aggregate.authoringCapabilityOpenReasons, 18);
  printCounts('authoring operation support states', aggregate.authoringOperationSupportStates);
  printCounts('authoring operation open reasons', aggregate.authoringOperationOpenReasons, 18);
  printCounts('authoring repair kinds', aggregate.authoringRepairKinds, 18);
  printCounts('authoring repair evidence kinds', aggregate.authoringRepairEvidenceKinds);
  printCounts('authoring repair support states', aggregate.authoringRepairSupportStates);
  printCounts('authoring repair open reasons', aggregate.authoringRepairOpenReasons, 18);
  printCounts('authoring repair action targets', aggregate.authoringRepairActionTargets, 18);
  printCounts('authoring repair cluster kinds', aggregate.authoringRepairClusterKinds, 18);
  printCounts('authoring repair cluster plan kinds', aggregate.authoringRepairClusterPlanKinds, 18);
  printCounts('authoring repair cluster change domains', aggregate.authoringRepairClusterChangeDomains, 18);
  printCounts('authoring repair cluster plan readiness', aggregate.authoringRepairClusterPlanReadiness, 18);
  printCounts('authoring repair cluster action targets', aggregate.authoringRepairClusterActionTargets, 18);
  printCounts('authoring repair cluster action-target counts', aggregate.authoringRepairClusterActionTargetCounts, 18);
  printCounts('authoring repair cluster site kinds', aggregate.authoringRepairClusterSiteKinds, 18);
  printCounts('authoring repair cluster value-site kinds', aggregate.authoringRepairClusterValueSiteKinds, 18);
  printCounts('authoring repair cluster runtime boundary kinds', aggregate.authoringRepairClusterRuntimeBoundaryKinds, 18);
  printCounts('authoring repair cluster runtime intent kinds', aggregate.authoringRepairClusterRuntimeIntentKinds, 18);
  printCounts('authoring repair cluster target-member counts', aggregate.authoringRepairClusterTargetMemberCounts, 18);
  printCounts('authoring repair cluster owner-type counts', aggregate.authoringRepairClusterOwnerTypeCounts, 18);
  printCounts('authoring repair cluster value-type counts', aggregate.authoringRepairClusterValueTypeCounts, 18);
  printCounts('authoring repair cluster member-hint counts', aggregate.authoringRepairClusterMemberHintCounts, 18);
  printCounts('authoring repair cluster member-hint value-type coverage', aggregate.authoringRepairClusterMemberHintValueTypeCoverage, 18);
  printCounts('authoring repair cluster member-hint value-type sources', aggregate.authoringRepairClusterMemberHintValueTypeSources, 18);
  printCounts('authoring repair cluster target source coverage', aggregate.authoringRepairClusterActionTargetSourceCoverage, 18);
  printCounts('authoring recipe keys', aggregate.authoringRecipeKeys, 18);
  printCounts('authoring recipe expected effects', aggregate.authoringRecipeExpectedEffects, 18);
  printCounts('authoring recipe current fit states', aggregate.authoringRecipeCurrentFitStates, 18);
  printCounts('authoring recipe current fit specificity', aggregate.authoringRecipeCurrentFitSpecificity, 18);
  printCounts('authoring recipe expected effect roles', aggregate.authoringRecipeExpectedEffectRoles, 18);
  printCounts('authoring applicable recipe expected effect current outcomes', aggregate.authoringRecipeApplicableExpectedEffectCurrentOutcomes, 18);
  printCounts('authoring applicable recipe expected effect fixture-lane outcomes', aggregate.authoringRecipeApplicableExpectedEffectFixtureLaneOutcomes, 18);
  printCounts('authoring applicable recipe expected effect recipe fixture-lane outcomes', aggregate.authoringRecipeApplicableExpectedEffectRecipeFixtureLaneOutcomes, 18);
  printCounts('authoring applicable project-tooling fixture-lane outcomes', aggregate.authoringRecipeApplicableProjectToolingFixtureLaneOutcomes, 18);
  printCounts('authoring all-candidate recipe expected effect current outcomes', aggregate.authoringRecipeExpectedEffectCurrentOutcomes, 18);
  printCounts('authoring all-candidate recipe expected effect fixture-lane outcomes', aggregate.authoringRecipeExpectedEffectFixtureLaneOutcomes, 18);
  printCounts('authoring all-candidate project-tooling fixture-lane outcomes', aggregate.authoringRecipeProjectToolingFixtureLaneOutcomes, 18);
  printCounts('authoring recipe expected effect taste value layers', aggregate.authoringRecipeExpectedEffectTasteValueLayers, 18);
  printCounts('authoring recipe expected effect taste layer outcomes', aggregate.authoringRecipeExpectedEffectTasteLayerOutcomes, 18);
  printCounts('authoring recipe expected effect targets', aggregate.authoringRecipeExpectedEffectTargets, 18);
  printCounts('authoring applicable recipe expected effect target outcomes', aggregate.authoringRecipeApplicableExpectedEffectTargetOutcomes, 18);
  printCounts('authoring applicable recipe expected effect recipe target outcomes', aggregate.authoringRecipeApplicableExpectedEffectRecipeTargetOutcomes, 18);
  printCounts('authoring all-candidate recipe expected effect target outcomes', aggregate.authoringRecipeExpectedEffectTargetOutcomes, 18);
  printCounts('authoring all-candidate recipe expected effect recipe target outcomes', aggregate.authoringRecipeExpectedEffectRecipeTargetOutcomes, 18);
  printCounts('authoring recipe signature target outcomes', aggregate.authoringRecipeSignatureEffectTargetOutcomes, 18);
  printCounts('authoring recipe signature recipe target outcomes', aggregate.authoringRecipeSignatureEffectRecipeTargetOutcomes, 18);
  printCounts('authoring recipe discriminator target outcomes', aggregate.authoringRecipeDiscriminatorEffectTargetOutcomes, 18);
  printCounts('authoring recipe discriminator recipe target outcomes', aggregate.authoringRecipeDiscriminatorEffectRecipeTargetOutcomes, 18);
  printCounts('authoring recipe candidate signature target outcomes', aggregate.authoringRecipeCandidateSignatureEffectTargetOutcomes, 18);
  printCounts('authoring recipe candidate signature recipe target outcomes', aggregate.authoringRecipeCandidateSignatureEffectRecipeTargetOutcomes, 18);
  printCounts('authoring recipe expected effect scopes', aggregate.authoringRecipeExpectedEffectScopes, 18);
  printCounts('authoring recipe expected effect cardinalities', aggregate.authoringRecipeExpectedEffectCardinalities, 18);
  printCounts('authoring recipe expected effect filter counts', aggregate.authoringRecipeExpectedEffectFilterCounts, 18);
  printCounts('authoring recipe open reasons', aggregate.authoringRecipeOpenReasons, 18);
  printCounts('resource kinds', aggregate.resourceKinds);
  printCounts('resource declaration modes', aggregate.resourceDeclarationModes);
  printCounts('DI key identity kinds', aggregate.diKeyIdentityKinds);
  printCounts('DI key identity declaration coverage', aggregate.diKeyIdentityDeclarationCoverage);
  printCounts('DI key identity declaration address coverage', aggregate.diKeyIdentityDeclarationAddressCoverage);
  printCounts('configuration issue kinds', aggregate.configurationIssueKinds);
  printCounts('configuration issue framework error codes', aggregate.configurationIssueFrameworkErrorCodes, 18);
  printCounts('evaluation issue kinds', aggregate.evaluationIssueKinds);
  printCounts('evaluation issue framework error codes', aggregate.evaluationIssueFrameworkErrorCodes, 18);
  printCounts('evaluation issue subjects', aggregate.evaluationIssueSubjectKinds);
  printCounts('evaluation issue actual values', aggregate.evaluationIssueActualValueKinds);
  printCounts('di issue kinds', aggregate.diIssueKinds);
  printCounts('di issue subjects', aggregate.diIssueSubjectKinds);
  printCounts('di issue severities', aggregate.diIssueSeverities);
  printCounts('di issue resolve execution contexts', aggregate.diIssueResolveExecutionContexts);
  printCounts('di issue active-container expectations', aggregate.diIssueActiveContainerExpectations);
  printCounts('di issue resolve nullish key argument counts', aggregate.diIssueResolveNullishKeyArgumentCounts);
  printCounts('di issue resolve nullish key argument kinds', aggregate.diIssueResolveNullishKeyArgumentKinds);
  printCounts('di issue inject decorator target kinds', aggregate.diIssueInjectDecoratorTargetKinds);
  printCounts('di issue inject decorator names', aggregate.diIssueInjectDecoratorNames);
  printCounts('di issue container API methods', aggregate.diIssueContainerApiMethods);
  printCounts('di issue container API key kinds', aggregate.diIssueContainerApiKeyKinds);
  printCounts('di issue container API key identities', aggregate.diIssueContainerApiKeyIdentities);
  printCounts('di issue container API auto-register', aggregate.diIssueContainerApiAutoRegister);
  printCounts('di issue framework error codes', aggregate.diIssueFrameworkErrorCodes, 18);
  printCounts('observation issue kinds', aggregate.observationIssueKinds);
  printCounts('observation issue framework error codes', aggregate.observationIssueFrameworkErrorCodes, 18);
  printCounts('validation issue kinds', aggregate.validationIssueKinds);
  printCounts('validation issue framework error codes', aggregate.validationIssueFrameworkErrorCodes, 18);
  printCounts('fetch-client issue kinds', aggregate.fetchClientIssueKinds);
  printCounts('fetch-client issue framework error codes', aggregate.fetchClientIssueFrameworkErrorCodes, 18);
  printCounts('dialog issue kinds', aggregate.dialogIssueKinds);
  printCounts('dialog issue framework error codes', aggregate.dialogIssueFrameworkErrorCodes, 18);
  printCounts('resource issue kinds', aggregate.resourceIssueKinds);
  printCounts('resource issue framework error codes', aggregate.resourceIssueFrameworkErrorCodes, 18);
  printRouterPressureCounts(aggregate);
  printCounts('runtime controllers: creation kinds', aggregate.runtimeControllerCreationKinds);
  printCounts('runtime controllers: hydration handoff', aggregate.runtimeControllerHydrationHandoff);
  printCounts('runtime controllers: child-view rendering state', aggregate.runtimeControllerChildViewRenderingState);
  printCounts('runtime composition component resolution', aggregate.runtimeCompositionComponentResolutionKinds);
  printCounts('runtime composition model resolution', aggregate.runtimeCompositionModelResolutionKinds);
  printCounts('runtime composition scope behavior', aggregate.runtimeCompositionScopeBehavior);
  printCounts('runtime composition flush mode', aggregate.runtimeCompositionFlushMode);
  printCounts('runtime composition tag', aggregate.runtimeCompositionTag);
  printCounts('runtime composition component input', aggregate.runtimeCompositionComponentInput);
  printCounts('runtime composition template input', aggregate.runtimeCompositionTemplateInput);
  printCounts('runtime composition component input fulfillment', aggregate.runtimeCompositionComponentInputFulfillmentKinds);
  printCounts('runtime composition template input fulfillment', aggregate.runtimeCompositionTemplateInputFulfillmentKinds);
  printCounts('runtime composition model input fulfillment', aggregate.runtimeCompositionModelInputFulfillmentKinds);
  printCounts('runtime composition static component name', aggregate.runtimeCompositionStaticComponentName);
  printCounts('runtime composition template binding', aggregate.runtimeCompositionTemplateBinding);
  printCounts('runtime composition composition binding', aggregate.runtimeCompositionCompositionBinding);
  printCounts('runtime composition composing binding', aggregate.runtimeCompositionComposingBinding);
  printCounts('runtime composition candidate counts', aggregate.runtimeCompositionCandidateCounts);
  printCounts('runtime composition compiled-template counts', aggregate.runtimeCompositionCompiledTemplateCounts);
  printCounts('runtime composition candidate resource-analysis states', aggregate.runtimeCompositionCandidateResourceAnalysisStates);
  printCounts('runtime composition candidate resource-analysis counts', aggregate.runtimeCompositionCandidateResourceAnalysisCounts);
  printCounts('runtime composition candidate resource-controller counts', aggregate.runtimeCompositionCandidateResourceControllerCounts);
  printCounts('runtime composition candidate resource-controller creation kinds', aggregate.runtimeCompositionCandidateResourceControllerCreationKinds);
  printCounts('runtime composition composed child-controller counts', aggregate.runtimeCompositionComposedChildControllerCounts);
  printCounts('runtime composition composed child-controller creation kinds', aggregate.runtimeCompositionComposedChildControllerCreationKinds);
  printCounts('runtime composition activation handoff kinds', aggregate.runtimeCompositionActivationHandoffKinds);
  printCounts('runtime composition activation parameter types', aggregate.runtimeCompositionActivationParameterTypes, 12);
  printCounts('runtime composition activation assignability', aggregate.runtimeCompositionActivationAssignability);
  printCounts('runtime composition source coverage', aggregate.runtimeCompositionSourceCoverage);
  printCounts('runtime composition open reasons', aggregate.runtimeCompositionOpenReasons, 12);
  printCounts('runtime composition open reason kinds', aggregate.runtimeCompositionOpenReasonKinds, 12);
  printCounts('bindable modes', aggregate.bindableModes);
  printCounts('bindable effective value type shapes', aggregate.bindableEffectiveValueTypeShapes);
  printCounts('bindable value type weak', aggregate.bindableValueTypeWeak);
  printCounts('binding target-access strategies', aggregate.bindingTargetAccessStrategies);
  printCounts('binding target-access target type sources', aggregate.bindingTargetAccessTargetTypeSources);
  printCounts('binding target-access target type surfaces', aggregate.bindingTargetAccessTargetTypeSurfaces, 18);
  printCounts('binding target-access property type surfaces', aggregate.bindingTargetAccessPropertyTypeSurfaces, 18);
  printCounts('binding target-access type surface classes', aggregate.bindingTargetAccessTypeSurfaceClasses, 18);
  printCounts('binding target-access type-source surface classes', aggregate.bindingTargetAccessTypeSourceSurfaceClasses, 18);
  printCounts('binding target-access framework error codes', aggregate.bindingTargetAccessFrameworkErrorCodes, 18);
  printCounts('binding target-access framework error code fixtures', aggregate.bindingTargetAccessFrameworkErrorCodeFixtureKeys, 18);
  printCounts('binding behavior application names', aggregate.bindingBehaviorApplicationNames);
  printCounts('binding behavior application target properties', aggregate.bindingBehaviorApplicationTargetProperties, 18);
  printCounts('binding value-channel kinds', aggregate.bindingValueChannelKinds);
  printCounts('binding value-channel target kinds', aggregate.bindingValueChannelTargetKinds);
  printCounts('binding value-channel matcher modes', aggregate.bindingValueChannelMatcherModes);
  printCounts('binding value-channel runtime type surfaces', aggregate.bindingValueChannelRuntimeTypeSurfaces, 18);
  printCounts('template diagnostic authorities', aggregate.templateDiagnosticAuthorities);
  printCounts('template diagnostic kinds', aggregate.templateDiagnosticKinds);
  printCounts('template diagnostic framework error codes', aggregate.templateDiagnosticFrameworkErrorCodes, 18);
  printCounts('template diagnostic framework error code fixtures', aggregate.templateDiagnosticFrameworkErrorCodeFixtureKeys, 18);
  printCounts('template diagnostic missing inputs', aggregate.templateDiagnosticMissingInputs, 18);
  printCounts('template diagnostic missing input fixtures', aggregate.templateDiagnosticMissingInputFixtureKeys, 18);
  printCounts('template diagnostic suggestions', aggregate.templateDiagnosticSuggestions, 18);
  printCounts('app diagnostic domains', aggregate.appDiagnosticDomains);
  printCounts('app diagnostic kinds', aggregate.appDiagnosticKinds, 18);
  printCounts('app diagnostic framework error codes', aggregate.appDiagnosticFrameworkErrorCodes, 18);
  printCounts('app diagnostic framework error code fixtures', aggregate.appDiagnosticFrameworkErrorCodeFixtureKeys, 18);
  printCounts('binding data-flow binding kinds', aggregate.bindingDataFlowBindingKinds);
  printCounts('binding data-flow directions', aggregate.bindingDataFlowDirections);
  printCounts('binding data-flow strict bindings', aggregate.bindingDataFlowStrictBindings);
  printCounts('binding data-flow parse result kinds', aggregate.bindingDataFlowParseResultKinds);
  printCounts('binding data-flow value-site kinds', aggregate.bindingDataFlowValueSiteKinds);
  printCounts('binding data-flow source kinds', aggregate.bindingDataFlowSourceKinds);
  printCounts('binding data-flow target kinds', aggregate.bindingDataFlowTargetKinds);
  printCounts('binding data-flow source type open kinds', aggregate.bindingDataFlowSourceTypeOpenKinds);
  printCounts('binding data-flow source type surfaces', aggregate.bindingDataFlowSourceTypeSurfaces, 18);
  printCounts('binding data-flow target type surfaces', aggregate.bindingDataFlowTargetTypeSurfaces, 18);
  printCounts('binding data-flow value-site type surfaces', aggregate.bindingDataFlowValueSiteTypeSurfaces, 18);
  printCounts('binding data-flow source assignment kinds', aggregate.bindingDataFlowSourceAssignmentKinds);
  printCounts('binding data-flow framework error codes', aggregate.bindingDataFlowFrameworkErrorCodes, 18);
  printCounts('binding data-flow framework error code fixtures', aggregate.bindingDataFlowFrameworkErrorCodeFixtureKeys, 18);
  printCounts('binding data-flow source assignment pressure classes', aggregate.bindingDataFlowSourceAssignmentPressureClasses, 18);
  printCounts('binding data-flow source assignment reason fixtures', aggregate.bindingDataFlowSourceAssignmentReasonFixtureKeys, 18);
  printCounts('binding data-flow open reasons', aggregate.bindingDataFlowOpenReasons, 12);
  printCounts('open seam kinds', aggregate.openSeamKinds);
  printCounts('open seam reason kinds', aggregate.openSeamReasonKinds, 12);
  printCounts('open seam reason fixtures', aggregate.openSeamReasonFixtureKeys, 18);
  printQueryOutcomes('query outcomes', aggregate.outcomes);
}

function printRouterPressureCounts(aggregate) {
  printCounts('router options: useHref', aggregate.routerOptionsUseHref);
  printCounts('router options: useUrlFragmentHash', aggregate.routerOptionsUseUrlFragmentHash);
  printCounts('router options: useEagerLoading', aggregate.routerOptionsUseEagerLoading);
  printCounts('route kinds', aggregate.routeKinds);
  printCounts('route origin kinds', aggregate.routeOriginKinds);
  printCounts('route value kinds', aggregate.routeValueKinds);
  printCounts('route component kinds', aggregate.routeComponentKinds);
  printCounts('route component resolution', aggregate.routeComponentResolution);
  printCounts('route viewport fields', aggregate.routeViewportPresence);
  printCounts('route child cardinality', aggregate.routeChildCardinality);
  printCounts('route contexts: viewport agent', aggregate.routeContextViewportAgents);
  printCounts('route trees: node count', aggregate.routeTreeNodeCount);
  printCounts('route nodes: children', aggregate.routeNodeChildren);
  printCounts('route nodes: viewport', aggregate.routeNodeViewport);
  printCounts('route pattern segment kinds', aggregate.routePatternSegmentKinds);
  printCounts('route endpoint residuals', aggregate.routeEndpointResiduals);
  printCounts('route-recognizer state kinds', aggregate.routeRecognizerStateKinds);
  printCounts('route-recognizer state endpoints', aggregate.routeRecognizerStateEndpoints);
  printCounts('route-recognizer issue kinds', aggregate.routeRecognizerIssueKinds);
  printCounts('router issue kinds', aggregate.routerIssueKinds);
  printCounts('router issue framework error codes', aggregate.routerIssueFrameworkErrorCodes, 18);
  printCounts('router issue framework error code fixtures', aggregate.routerIssueFrameworkErrorCodeFixtureKeys, 18);
  printCounts('recognized route route context', aggregate.recognizedRouteRouteContext);
  printCounts('typed navigation instruction kinds', aggregate.typedNavigationInstructionKinds);
  printCounts('viewport instruction component kinds', aggregate.viewportInstructionComponentKinds);
  printCounts('viewport instruction tree route context', aggregate.viewportInstructionTreeRouteContext);
}

function printCompactAggregateCounts(aggregate) {
  console.log('');
  console.log('compact pressure counts');

  printCompactCounts('projects.shape', aggregate.projectShapeKinds);
  printCompactCounts('inputs.fixture-lanes', aggregate.fixtureLaneKinds);
  printCompactCounts('inputs.fixture-keys', aggregate.fixtureKeys, 8);
  printCompactCounts('projects.skipped-filter', aggregate.skippedProjectFilters);
  printCompactCounts('projects.analysis', aggregate.projectAnalysisKinds);
  printCompactCounts('projects.skipped-analysis', aggregate.skippedProjectAnalysisKinds);
  printCompactCounts('projects.shape-reasons', aggregate.projectShapeReasons);

  printCompactCounts('topology.services', aggregate.appTopologyServiceRoles);
  printCompactCounts('topology.injections', aggregate.appTopologyInjectionMechanisms);
  printCompactCounts('topology.service-interactions', aggregate.appTopologyServiceInteractionOperationKinds);
  printCompactCounts('topology.component-roles', aggregate.appTopologyComponentRolesByKind);
  printCompactCounts('topology.styles', aggregate.appTopologyStyleAssetKinds);

  printCompactCounts('authoring.taste-axes', aggregate.authoringTasteAxisKeys);
  printCompactCounts('authoring.capabilities', aggregate.authoringCapabilitySupportStates);
  printCompactCounts('authoring.capability-open', aggregate.authoringCapabilityOpenReasons);
  printCompactCounts('authoring.operations', aggregate.authoringOperationSupportStates);
  printCompactCounts('authoring.operation-open', aggregate.authoringOperationOpenReasons);
  printCompactCounts('authoring.repairs', aggregate.authoringRepairSupportStates);
  printCompactCounts('authoring.repair-open', aggregate.authoringRepairOpenReasons);
  printCompactCounts('authoring.recipes', aggregate.authoringRecipeKeys);
  printCompactCounts('authoring.recipe-fit', aggregate.authoringRecipeCurrentFitStates);
  printCompactCounts('authoring.recipe-effects', aggregate.authoringRecipeExpectedEffects);
  printCompactCounts('authoring.applicable-effect-current-outcomes', aggregate.authoringRecipeApplicableExpectedEffectCurrentOutcomes);
  printCompactCounts('authoring.applicable-effect-fixture-lane-outcomes', aggregate.authoringRecipeApplicableExpectedEffectFixtureLaneOutcomes, 12);
  printCompactCounts('authoring.applicable-project-tooling-fixture-lane-outcomes', aggregate.authoringRecipeApplicableProjectToolingFixtureLaneOutcomes);
  printCompactCounts('authoring.applicable-effect-target-outcomes', aggregate.authoringRecipeApplicableExpectedEffectTargetOutcomes);
  printCompactCounts('authoring.all-candidate-effect-current-outcomes', aggregate.authoringRecipeExpectedEffectCurrentOutcomes);
  printCompactCounts('authoring.all-candidate-effect-fixture-lane-outcomes', aggregate.authoringRecipeExpectedEffectFixtureLaneOutcomes, 12);
  printCompactCounts('authoring.all-candidate-project-tooling-fixture-lane-outcomes', aggregate.authoringRecipeProjectToolingFixtureLaneOutcomes);
  printCompactCounts('authoring.all-candidate-effect-target-outcomes', aggregate.authoringRecipeExpectedEffectTargetOutcomes);
  printCompactCounts('authoring.recipe-open', aggregate.authoringRecipeOpenReasons);

  printCompactCounts('resources.kinds', aggregate.resourceKinds);
  printCompactCounts('resources.issues', aggregate.resourceIssueKinds);
  printCompactCounts('resources.error-codes', aggregate.resourceIssueFrameworkErrorCodes);
  printCompactCounts('controllers.child-view-rendering', aggregate.runtimeControllerChildViewRenderingState);
  printCompactCounts('runtime-compositions.component-resolution', aggregate.runtimeCompositionComponentResolutionKinds);
  printCompactCounts('runtime-compositions.model-resolution', aggregate.runtimeCompositionModelResolutionKinds);
  printCompactCounts('runtime-compositions.scope-behavior', aggregate.runtimeCompositionScopeBehavior);
  printCompactCounts('runtime-compositions.flush-mode', aggregate.runtimeCompositionFlushMode);
  printCompactCounts('runtime-compositions.tag', aggregate.runtimeCompositionTag);
  printCompactCounts('runtime-compositions.component-input', aggregate.runtimeCompositionComponentInput);
  printCompactCounts('runtime-compositions.template-input', aggregate.runtimeCompositionTemplateInput);
  printCompactCounts('runtime-compositions.component-input-fulfillment', aggregate.runtimeCompositionComponentInputFulfillmentKinds);
  printCompactCounts('runtime-compositions.template-input-fulfillment', aggregate.runtimeCompositionTemplateInputFulfillmentKinds);
  printCompactCounts('runtime-compositions.model-input-fulfillment', aggregate.runtimeCompositionModelInputFulfillmentKinds);
  printCompactCounts('runtime-compositions.static-component-name', aggregate.runtimeCompositionStaticComponentName);
  printCompactCounts('runtime-compositions.template-binding', aggregate.runtimeCompositionTemplateBinding);
  printCompactCounts('runtime-compositions.composition-binding', aggregate.runtimeCompositionCompositionBinding);
  printCompactCounts('runtime-compositions.composing-binding', aggregate.runtimeCompositionComposingBinding);
  printCompactCounts('runtime-compositions.candidate-counts', aggregate.runtimeCompositionCandidateCounts);
  printCompactCounts('runtime-compositions.compiled-template-counts', aggregate.runtimeCompositionCompiledTemplateCounts);
  printCompactCounts('runtime-compositions.candidate-resource-analysis', aggregate.runtimeCompositionCandidateResourceAnalysisStates);
  printCompactCounts('runtime-compositions.candidate-resource-controller-counts', aggregate.runtimeCompositionCandidateResourceControllerCounts);
  printCompactCounts('runtime-compositions.composed-child-controller-counts', aggregate.runtimeCompositionComposedChildControllerCounts);
  printCompactCounts('runtime-compositions.activation-handoffs', aggregate.runtimeCompositionActivationHandoffKinds);
  printCompactCounts('runtime-compositions.activation-assignability', aggregate.runtimeCompositionActivationAssignability);
  printCompactCounts('runtime-compositions.open-reasons', aggregate.runtimeCompositionOpenReasons);
  printCompactCounts('di.key-kinds', aggregate.diKeyIdentityKinds);
  printCompactCounts('state.stores', aggregate.stateStoreDefaultness);

  printCompactCounts('router.routes', aggregate.routeKinds);
  printCompactCounts('router.components', aggregate.routeComponentKinds);
  printCompactCounts('router.component-resolution', aggregate.routeComponentResolution);
  printCompactCounts('router.viewports', aggregate.routeViewportPresence);
  printCompactCounts('router.route-tree-options', aggregate.routeTreeOptions);
  printCompactCounts('router.recognizer-issues', aggregate.routeRecognizerIssueKinds);
  printCompactCounts('router.issues', aggregate.routerIssueKinds);
  printCompactCounts('router.error-codes', aggregate.routerIssueFrameworkErrorCodes);
  printCompactCounts('router.error-code-fixtures', aggregate.routerIssueFrameworkErrorCodeFixtureKeys, 8);

  printCompactCounts('bindings.target-access-strategies', aggregate.bindingTargetAccessStrategies);
  printCompactCounts('bindings.target-access-open', aggregate.bindingTargetAccessOpenReasons);
  printCompactCounts('bindings.target-access-error-codes', aggregate.bindingTargetAccessFrameworkErrorCodes);
  printCompactCounts('bindings.target-access-error-code-fixtures', aggregate.bindingTargetAccessFrameworkErrorCodeFixtureKeys, 8);
  printCompactCounts('bindings.value-channels', aggregate.bindingValueChannelKinds);
  printCompactCounts('bindings.value-channel-targets', aggregate.bindingValueChannelTargetKinds);
  printCompactCounts('bindings.value-channel-matchers', aggregate.bindingValueChannelMatcherModes);
  printCompactCounts('bindings.value-channel-open', aggregate.bindingValueChannelOpenReasons);
  printCompactCounts('bindings.data-flow-kinds', aggregate.bindingDataFlowBindingKinds);
  printCompactCounts('bindings.data-flow-directions', aggregate.bindingDataFlowDirections);
  printCompactCounts('bindings.data-flow-source-types', aggregate.bindingDataFlowSourceTypeSurfaces);
  printCompactCounts('bindings.data-flow-target-types', aggregate.bindingDataFlowTargetTypeSurfaces);
  printCompactCounts('bindings.data-flow-assignment', aggregate.bindingDataFlowSourceAssignmentKinds);
  printCompactCounts('bindings.data-flow-assignment-reasons', aggregate.bindingDataFlowSourceAssignmentReasons);
  printCompactCounts('bindings.data-flow-assignment-reason-fixtures', aggregate.bindingDataFlowSourceAssignmentReasonFixtureKeys, 10);
  printCompactCounts('bindings.data-flow-open', aggregate.bindingDataFlowOpenReasons);
  printCompactCounts('bindings.data-flow-error-codes', aggregate.bindingDataFlowFrameworkErrorCodes);
  printCompactCounts('bindings.data-flow-error-code-fixtures', aggregate.bindingDataFlowFrameworkErrorCodeFixtureKeys, 8);

  printCompactCounts('observation.issues', aggregate.observationIssueKinds);
  printCompactCounts('observation.error-codes', aggregate.observationIssueFrameworkErrorCodes);
  printCompactCounts('watches.expressions', aggregate.watchExpressionKinds);
  printCompactCounts('watches.callbacks', aggregate.watchCallbackKinds);

  printCompactCounts('templates.diagnostic-severity', aggregate.templateDiagnosticSeverities);
  printCompactCounts('templates.diagnostic-kinds', aggregate.templateDiagnosticKinds);
  printCompactCounts('templates.diagnostic-error-codes', aggregate.templateDiagnosticFrameworkErrorCodes);
  printCompactCounts('templates.diagnostic-error-code-fixtures', aggregate.templateDiagnosticFrameworkErrorCodeFixtureKeys, 10);
  printCompactCounts('templates.missing-inputs', aggregate.templateDiagnosticMissingInputs);
  printCompactCounts('templates.missing-input-fixtures', aggregate.templateDiagnosticMissingInputFixtureKeys, 10);
  printCompactCounts('templates.suggestions', aggregate.templateDiagnosticSuggestions);
  printCompactCounts('app.diagnostic-domains', aggregate.appDiagnosticDomains);
  printCompactCounts('app.diagnostic-kinds', aggregate.appDiagnosticKinds);
  printCompactCounts('app.diagnostic-error-codes', aggregate.appDiagnosticFrameworkErrorCodes);
  printCompactCounts('app.diagnostic-error-code-fixtures', aggregate.appDiagnosticFrameworkErrorCodeFixtureKeys, 10);

  printCompactCounts('validation.issues', aggregate.validationIssueKinds);
  printCompactCounts('fetch-client.issues', aggregate.fetchClientIssueKinds);
  printCompactCounts('dialog.issues', aggregate.dialogIssueKinds);
  printCompactCounts('open-seams.kinds', aggregate.openSeamKinds);
  printCompactCounts('open-seams.reasons', aggregate.openSeamReasonKinds);
  printCompactCounts('open-seams.reason-fixtures', aggregate.openSeamReasonFixtureKeys, 10);
  printCompactCounts('open-seams.summaries', aggregate.openSeamSummaries);
}

function printRawAggregateCounts(aggregate) {
  printPageCounts('page counts', aggregate.pageCounts);
  printCounts('project shape kinds', aggregate.projectShapeKinds);
  printCounts('fixture lanes', aggregate.fixtureLaneKinds);
  printCounts('fixture keys', aggregate.fixtureKeys, 36);
  printCounts('skipped project filters', aggregate.skippedProjectFilters);
  printCounts('skipped project shape kinds', aggregate.skippedProjectShapeKinds);
  printCounts('project analysis kinds', aggregate.projectAnalysisKinds);
  printCounts('skipped project analysis kinds', aggregate.skippedProjectAnalysisKinds);
  printCounts('project Aurelia dependency scopes', aggregate.projectAureliaDependencyScopes);
  printCounts('project Aurelia dependency origins', aggregate.projectAureliaDependencyOrigins);
  printCounts('project Aurelia dependency scope origins', aggregate.projectAureliaDependencyScopeOrigins);
  printCounts('project Aurelia source signals', aggregate.projectAureliaSourceSignals);
  printCounts('project shape reasons', aggregate.projectShapeReasons);
  printCounts('project source roles', aggregate.projectSourceRoles);
  printCounts('app topology service roles', aggregate.appTopologyServiceRoles);
  printCounts('app topology service export states', aggregate.appTopologyServiceExportStates);
  printCounts('app topology service resolve call counts', aggregate.appTopologyServiceResolveCallCounts);
  printCounts('app topology injection mechanisms', aggregate.appTopologyInjectionMechanisms);
  printCounts('app topology injection key declaration kinds', aggregate.appTopologyInjectionKeyDeclarationKinds);
  printCounts('app topology injection key declaration roles', aggregate.appTopologyInjectionKeyDeclarationRoles);
  printCounts('app topology injection key import kinds', aggregate.appTopologyInjectionKeyImportKinds);
  printCounts('app topology injection key import scopes', aggregate.appTopologyInjectionKeyImportScopes);
  printCounts('app topology injection consumer classes', aggregate.appTopologyInjectionConsumerClasses);
  printCounts('app topology injection consumer member kinds', aggregate.appTopologyInjectionConsumerMemberKinds);
  printCounts('app topology injection execution contexts', aggregate.appTopologyInjectionExecutionContexts);
  printCounts('app topology injection active-container expectations', aggregate.appTopologyInjectionActiveContainerExpectations);
  printCounts('app topology injection nullish key argument counts', aggregate.appTopologyInjectionNullishKeyArgumentCounts);
  printCounts('app topology injection nullish key argument kinds', aggregate.appTopologyInjectionNullishKeyArgumentKinds);
  printCounts('app topology injection source coverage', aggregate.appTopologyInjectionSourceCoverage);
  printCounts('app topology component roles', aggregate.appTopologyComponentRolesByKind);
  printCounts('app topology component role evidence', aggregate.appTopologyComponentRoleEvidence);
  printCounts('app topology component role source coverage', aggregate.appTopologyComponentRoleSourceCoverage);
  printCounts('app topology state composition roles', aggregate.appTopologyStateCompositionRoles);
  printCounts('app topology state composition value type shapes', aggregate.appTopologyStateCompositionValueTypeShapes);
  printCounts('app topology state composition source coverage', aggregate.appTopologyStateCompositionSourceCoverage);
  printCounts('runtime composition component resolution', aggregate.runtimeCompositionComponentResolutionKinds);
  printCounts('runtime composition model resolution', aggregate.runtimeCompositionModelResolutionKinds);
  printCounts('runtime composition scope behavior', aggregate.runtimeCompositionScopeBehavior);
  printCounts('runtime composition flush mode', aggregate.runtimeCompositionFlushMode);
  printCounts('runtime composition tag', aggregate.runtimeCompositionTag);
  printCounts('runtime composition component input', aggregate.runtimeCompositionComponentInput);
  printCounts('runtime composition template input', aggregate.runtimeCompositionTemplateInput);
  printCounts('runtime composition component input fulfillment', aggregate.runtimeCompositionComponentInputFulfillmentKinds);
  printCounts('runtime composition template input fulfillment', aggregate.runtimeCompositionTemplateInputFulfillmentKinds);
  printCounts('runtime composition model input fulfillment', aggregate.runtimeCompositionModelInputFulfillmentKinds);
  printCounts('runtime composition static component name', aggregate.runtimeCompositionStaticComponentName);
  printCounts('runtime composition template binding', aggregate.runtimeCompositionTemplateBinding);
  printCounts('runtime composition composition binding', aggregate.runtimeCompositionCompositionBinding);
  printCounts('runtime composition composing binding', aggregate.runtimeCompositionComposingBinding);
  printCounts('runtime composition candidate counts', aggregate.runtimeCompositionCandidateCounts);
  printCounts('runtime composition compiled-template counts', aggregate.runtimeCompositionCompiledTemplateCounts);
  printCounts('runtime composition composed child-controller counts', aggregate.runtimeCompositionComposedChildControllerCounts);
  printCounts('runtime composition composed child-controller creation kinds', aggregate.runtimeCompositionComposedChildControllerCreationKinds);
  printCounts('runtime composition activation handoff kinds', aggregate.runtimeCompositionActivationHandoffKinds);
  printCounts('runtime composition activation parameter types', aggregate.runtimeCompositionActivationParameterTypes, 12);
  printCounts('runtime composition activation assignability', aggregate.runtimeCompositionActivationAssignability);
  printCounts('runtime composition source coverage', aggregate.runtimeCompositionSourceCoverage);
  printCounts('runtime composition open reasons', aggregate.runtimeCompositionOpenReasons, 12);
  printCounts('runtime composition open reason kinds', aggregate.runtimeCompositionOpenReasonKinds, 12);
  printCounts('app topology style asset kinds', aggregate.appTopologyStyleAssetKinds);
  printCounts('app topology style source kinds', aggregate.appTopologyStyleSourceKinds);
  printCounts('app topology style owner kinds', aggregate.appTopologyStyleOwnerKinds);
  printCounts('app topology style source coverage', aggregate.appTopologyStyleSourceCoverage);
  printCounts('app topology style evidence coverage', aggregate.appTopologyStyleEvidenceCoverage);
  printCounts('state store defaultness', aggregate.stateStoreDefaultness);
  printCounts('state store initial-state kinds', aggregate.stateStoreInitialStateKinds);
  printCounts('state store options-or-handler kinds', aggregate.stateStoreOptionsOrHandlerKinds);
  printCounts('state store action-handler counts', aggregate.stateStoreActionHandlerCounts);
  printCounts('authoring catalog taste axis layers', aggregate.authoringCatalogTasteAxisLayers);
  printCounts('authoring catalog taste axis value layers', aggregate.authoringCatalogTasteAxisValueLayers, 36);
  printCounts('authoring catalog taste axis primitive-policy value counts', aggregate.authoringCatalogTasteAxisPrimitivePolicyValueCounts);
  printCounts('authoring catalog taste axis observed-shape value counts', aggregate.authoringCatalogTasteAxisObservedShapeValueCounts);
  printCounts('authoring catalog taste axis derived-reading value counts', aggregate.authoringCatalogTasteAxisDerivedReadingValueCounts);
  printCounts('authoring catalog taste value layers', aggregate.authoringCatalogTasteValueLayers);
  printCounts('authoring catalog profile preference counts', aggregate.authoringCatalogProfilePreferenceCounts, 18);
  printCounts('authoring catalog profile preference axes', aggregate.authoringCatalogProfilePreferenceAxes, 18);
  printCounts('authoring catalog profile preference values', aggregate.authoringCatalogProfilePreferenceValues, 18);
  printCounts('authoring catalog profile preference layers', aggregate.authoringCatalogProfilePreferenceLayers, 18);
  printCounts('authoring catalog operation families', aggregate.authoringCatalogOperationFamiliesByKey, 18);
  printCounts('authoring catalog operation actions', aggregate.authoringCatalogOperationActions, 18);
  printCounts('authoring catalog operation targets', aggregate.authoringCatalogOperationTargetKinds, 18);
  printCounts('authoring catalog operation capability counts', aggregate.authoringCatalogOperationCapabilityCounts, 18);
  printCounts('authoring catalog capability product open reasons', aggregate.authoringCatalogCapabilityProductOpenReasons, 18);
  printCounts('authoring catalog operation product open reasons', aggregate.authoringCatalogOperationProductOpenReasons, 18);
  printCounts('authoring catalog recipe support states', aggregate.authoringCatalogRecipeSupportStates, 18);
  printCounts('authoring catalog recipe base keys', aggregate.authoringCatalogRecipeBaseKeys, 18);
  printCounts('authoring catalog recipe specificity ranks', aggregate.authoringCatalogRecipeSpecificityRanks, 18);
  printCounts('authoring catalog recipe preference counts', aggregate.authoringCatalogRecipePreferenceCounts, 18);
  printCounts('authoring catalog recipe preference axes', aggregate.authoringCatalogRecipePreferenceAxes, 18);
  printCounts('authoring catalog recipe preference values', aggregate.authoringCatalogRecipePreferenceValues, 18);
  printCounts('authoring catalog recipe preference layers', aggregate.authoringCatalogRecipePreferenceLayers, 18);
  printCounts('authoring catalog recipe source plan presence', aggregate.authoringCatalogRecipeSourcePlanPresence, 18);
  printCounts('authoring catalog recipe source plan conflict policies', aggregate.authoringCatalogRecipeSourcePlanConflictPolicies, 18);
  printCounts('authoring catalog recipe source plan formatting policies', aggregate.authoringCatalogRecipeSourcePlanFormattingPolicies, 18);
  printCounts('authoring catalog recipe source plan package-tooling policies', aggregate.authoringCatalogRecipeSourcePlanPackageToolingPolicies, 18);
  printCounts('authoring catalog recipe source plan file counts', aggregate.authoringCatalogRecipeSourcePlanFileCounts, 18);
  printCounts('authoring catalog recipe project tooling presence', aggregate.authoringCatalogRecipeProjectToolingPresence, 18);
  printCounts('authoring catalog recipe project tooling package managers', aggregate.authoringCatalogRecipeProjectToolingPackageManagers, 18);
  printCounts('authoring catalog recipe project tooling build-tool policies', aggregate.authoringCatalogRecipeProjectToolingBuildToolPolicies, 18);
  printCounts('authoring catalog recipe project tooling dependency scopes', aggregate.authoringCatalogRecipeProjectToolingDependencyScopes, 18);
  printCounts('authoring catalog recipe project tooling dependency specifiers', aggregate.authoringCatalogRecipeProjectToolingDependencySpecifiers, 18);
  printCounts('authoring catalog recipe project tooling script names', aggregate.authoringCatalogRecipeProjectToolingScriptNames, 18);
  printCounts('authoring catalog recipe project tooling file kinds', aggregate.authoringCatalogRecipeProjectToolingFileKinds, 18);
  printCounts('authoring catalog recipe project tooling file languages', aggregate.authoringCatalogRecipeProjectToolingFileLanguages, 18);
  printCounts('authoring catalog recipe project tooling text authorities', aggregate.authoringCatalogRecipeProjectToolingTextAuthorities, 18);
  printCounts('authoring catalog recipe source file roles', aggregate.authoringCatalogRecipeSourceFileRoles, 18);
  printCounts('authoring catalog recipe source file languages', aggregate.authoringCatalogRecipeSourceFileLanguages, 18);
  printCounts('authoring catalog recipe source file edit kinds', aggregate.authoringCatalogRecipeSourceFileEditKinds, 18);
  printCounts('authoring catalog recipe source file text authorities', aggregate.authoringCatalogRecipeSourceFileTextAuthorities, 18);
  printCounts('authoring catalog recipe expected effects', aggregate.authoringCatalogRecipeExpectedEffectKinds, 18);
  printCounts('authoring catalog recipe expected effect roles', aggregate.authoringCatalogRecipeExpectedEffectRoles, 18);
  printCounts('authoring catalog recipe expected effect targets', aggregate.authoringCatalogRecipeExpectedEffectTargets, 18);
  printCounts('authoring catalog recipe expected effect filter counts', aggregate.authoringCatalogRecipeExpectedEffectFilterCounts, 18);
  printCounts('authoring catalog recipe expected effect filter fields', aggregate.authoringCatalogRecipeExpectedEffectFilterFields, 18);
  printCounts('authoring coverage surface kinds', aggregate.authoringCoverageSurfaceKinds);
  printCounts('authoring coverage support states', aggregate.authoringCoverageSupportStates);
  printCounts('authoring taste axis layers', aggregate.authoringTasteAxisLayers);
  printCounts('authoring taste axis primitive-policy state', aggregate.authoringTasteAxisPolicyStates);
  printCounts('authoring taste axis keys', aggregate.authoringTasteAxisKeys, 24);
  printCounts('authoring taste axis key primitive-policy state', aggregate.authoringTasteAxisKeyPolicyStates, 24);
  printCounts('authoring taste axis key value counts', aggregate.authoringTasteAxisKeyValueCounts, 24);
  printCounts('authoring taste axis key open reasons', aggregate.authoringTasteAxisKeyOpenReasons, 24);
  printCounts('authoring taste axis confidences', aggregate.authoringTasteAxisConfidences);
  printCounts('authoring taste axis primitive-policy value counts', aggregate.authoringTasteAxisPrimitivePolicyValueCounts);
  printCounts('authoring taste axis observed-shape value counts', aggregate.authoringTasteAxisObservedShapeValueCounts);
  printCounts('authoring taste axis derived-reading value counts', aggregate.authoringTasteAxisDerivedReadingValueCounts);
  printCounts('authoring taste value layers', aggregate.authoringTasteValueLayers);
  printCounts('authoring taste axis values', aggregate.authoringTasteAxisValues, 24);
  printAuthoringTasteFocus(aggregate);
  printCounts('authoring taste values', aggregate.authoringTasteValues, 24);
  printCounts('authoring capability keys', aggregate.authoringCapabilityKeys, 24);
  printCounts('authoring capability support states', aggregate.authoringCapabilitySupportStates);
  printCounts('authoring capability open reasons', aggregate.authoringCapabilityOpenReasons, 18);
  printCounts('authoring operation actions', aggregate.authoringOperationActions);
  printCounts('authoring operation support states', aggregate.authoringOperationSupportStates);
  printCounts('authoring operation open reasons', aggregate.authoringOperationOpenReasons, 18);
  printCounts('authoring repair kinds', aggregate.authoringRepairKinds, 18);
  printCounts('authoring repair evidence kinds', aggregate.authoringRepairEvidenceKinds);
  printCounts('authoring repair support states', aggregate.authoringRepairSupportStates);
  printCounts('authoring repair authorities', aggregate.authoringRepairAuthorities);
  printCounts('authoring repair loci', aggregate.authoringRepairLoci);
  printCounts('authoring repair diagnostic kinds', aggregate.authoringRepairDiagnosticKinds, 18);
  printCounts('authoring repair seam kinds', aggregate.authoringRepairSeamKinds, 18);
  printCounts('authoring repair open reasons', aggregate.authoringRepairOpenReasons, 18);
  printCounts('authoring repair action targets', aggregate.authoringRepairActionTargets, 18);
  printCounts('authoring repair cluster kinds', aggregate.authoringRepairClusterKinds, 18);
  printCounts('authoring repair cluster plan kinds', aggregate.authoringRepairClusterPlanKinds, 18);
  printCounts('authoring repair cluster change domains', aggregate.authoringRepairClusterChangeDomains, 18);
  printCounts('authoring repair cluster plan readiness', aggregate.authoringRepairClusterPlanReadiness, 18);
  printCounts('authoring repair cluster action targets', aggregate.authoringRepairClusterActionTargets, 18);
  printCounts('authoring repair cluster action-target counts', aggregate.authoringRepairClusterActionTargetCounts, 18);
  printCounts('authoring repair cluster site kinds', aggregate.authoringRepairClusterSiteKinds, 18);
  printCounts('authoring repair cluster value-site kinds', aggregate.authoringRepairClusterValueSiteKinds, 18);
  printCounts('authoring repair cluster runtime boundary kinds', aggregate.authoringRepairClusterRuntimeBoundaryKinds, 18);
  printCounts('authoring repair cluster runtime intent kinds', aggregate.authoringRepairClusterRuntimeIntentKinds, 18);
  printCounts('authoring repair cluster target-member counts', aggregate.authoringRepairClusterTargetMemberCounts, 18);
  printCounts('authoring repair cluster owner-type counts', aggregate.authoringRepairClusterOwnerTypeCounts, 18);
  printCounts('authoring repair cluster value-type counts', aggregate.authoringRepairClusterValueTypeCounts, 18);
  printCounts('authoring repair cluster member-hint counts', aggregate.authoringRepairClusterMemberHintCounts, 18);
  printCounts('authoring repair cluster member-hint value-type coverage', aggregate.authoringRepairClusterMemberHintValueTypeCoverage, 18);
  printCounts('authoring repair cluster member-hint value-type sources', aggregate.authoringRepairClusterMemberHintValueTypeSources, 18);
  printCounts('authoring repair cluster target source coverage', aggregate.authoringRepairClusterActionTargetSourceCoverage, 18);
  printCounts('authoring surface support states', aggregate.authoringSurfaceSupportStates);
  printCounts('authoring recipe keys', aggregate.authoringRecipeKeys, 18);
  printCounts('authoring recipe support states', aggregate.authoringRecipeSupportStates);
  printCounts('authoring recipe expected effects', aggregate.authoringRecipeExpectedEffects, 18);
  printCounts('authoring recipe current fit states', aggregate.authoringRecipeCurrentFitStates, 18);
  printCounts('authoring recipe current fit specificity', aggregate.authoringRecipeCurrentFitSpecificity, 18);
  printCounts('authoring recipe expected effect roles', aggregate.authoringRecipeExpectedEffectRoles, 18);
  printCounts('authoring applicable recipe expected effect current outcomes', aggregate.authoringRecipeApplicableExpectedEffectCurrentOutcomes, 18);
  printCounts('authoring applicable recipe expected effect fixture-lane outcomes', aggregate.authoringRecipeApplicableExpectedEffectFixtureLaneOutcomes, 24);
  printCounts('authoring applicable recipe expected effect recipe fixture-lane outcomes', aggregate.authoringRecipeApplicableExpectedEffectRecipeFixtureLaneOutcomes, 24);
  printCounts('authoring applicable project-tooling fixture-lane outcomes', aggregate.authoringRecipeApplicableProjectToolingFixtureLaneOutcomes, 24);
  printCounts('authoring all-candidate recipe expected effect current outcomes', aggregate.authoringRecipeExpectedEffectCurrentOutcomes, 18);
  printCounts('authoring all-candidate recipe expected effect fixture-lane outcomes', aggregate.authoringRecipeExpectedEffectFixtureLaneOutcomes, 24);
  printCounts('authoring all-candidate project-tooling fixture-lane outcomes', aggregate.authoringRecipeProjectToolingFixtureLaneOutcomes, 24);
  printCounts('authoring recipe expected effect taste value layers', aggregate.authoringRecipeExpectedEffectTasteValueLayers, 18);
  printCounts('authoring recipe expected effect taste layer outcomes', aggregate.authoringRecipeExpectedEffectTasteLayerOutcomes, 18);
  printCounts('authoring recipe expected effect targets', aggregate.authoringRecipeExpectedEffectTargets, 24);
  printCounts('authoring applicable recipe expected effect target outcomes', aggregate.authoringRecipeApplicableExpectedEffectTargetOutcomes, 24);
  printCounts('authoring applicable recipe expected effect recipe target outcomes', aggregate.authoringRecipeApplicableExpectedEffectRecipeTargetOutcomes, 24);
  printCounts('authoring all-candidate recipe expected effect target outcomes', aggregate.authoringRecipeExpectedEffectTargetOutcomes, 24);
  printCounts('authoring all-candidate recipe expected effect recipe target outcomes', aggregate.authoringRecipeExpectedEffectRecipeTargetOutcomes, 24);
  printCounts('authoring recipe signature target outcomes', aggregate.authoringRecipeSignatureEffectTargetOutcomes, 24);
  printCounts('authoring recipe signature recipe target outcomes', aggregate.authoringRecipeSignatureEffectRecipeTargetOutcomes, 24);
  printCounts('authoring recipe discriminator target outcomes', aggregate.authoringRecipeDiscriminatorEffectTargetOutcomes, 24);
  printCounts('authoring recipe discriminator recipe target outcomes', aggregate.authoringRecipeDiscriminatorEffectRecipeTargetOutcomes, 24);
  printCounts('authoring recipe candidate signature target outcomes', aggregate.authoringRecipeCandidateSignatureEffectTargetOutcomes, 24);
  printCounts('authoring recipe candidate signature recipe target outcomes', aggregate.authoringRecipeCandidateSignatureEffectRecipeTargetOutcomes, 24);
  printCounts('authoring recipe expected effect observed counts', aggregate.authoringRecipeExpectedEffectObservedCounts, 18);
  printCounts('authoring recipe expected effect scopes', aggregate.authoringRecipeExpectedEffectScopes, 18);
  printCounts('authoring recipe expected effect cardinalities', aggregate.authoringRecipeExpectedEffectCardinalities, 18);
  printCounts('authoring recipe expected effect filter counts', aggregate.authoringRecipeExpectedEffectFilterCounts, 18);
  printCounts('authoring recipe expected effect filter fields', aggregate.authoringRecipeExpectedEffectFilterFields, 18);
  printCounts('authoring recipe open reasons', aggregate.authoringRecipeOpenReasons, 18);
  printCounts('authoring open reason loci', aggregate.authoringOpenReasonLoci);
  printCounts('resource kinds', aggregate.resourceKinds);
  printCounts('resource declaration modes', aggregate.resourceDeclarationModes);
  printCounts('resource issue kinds', aggregate.resourceIssueKinds);
  printCounts('resource issue framework error codes', aggregate.resourceIssueFrameworkErrorCodes, 18);
  printCounts('observation issue kinds', aggregate.observationIssueKinds);
  printCounts('observation issue framework error codes', aggregate.observationIssueFrameworkErrorCodes, 18);
  printCounts('DI key identity kinds', aggregate.diKeyIdentityKinds);
  printCounts('DI key identity declaration coverage', aggregate.diKeyIdentityDeclarationCoverage);
  printCounts('DI key identity declaration address coverage', aggregate.diKeyIdentityDeclarationAddressCoverage);
  printCounts('router options: useHref', aggregate.routerOptionsUseHref);
  printCounts('router options: useUrlFragmentHash', aggregate.routerOptionsUseUrlFragmentHash);
  printCounts('router options: useEagerLoading', aggregate.routerOptionsUseEagerLoading);
  printCounts('route kinds', aggregate.routeKinds);
  printCounts('route origin kinds', aggregate.routeOriginKinds);
  printCounts('route value kinds', aggregate.routeValueKinds);
  printCounts('route component kinds', aggregate.routeComponentKinds);
  printCounts('route component resolution', aggregate.routeComponentResolution);
  printCounts('route viewport fields', aggregate.routeViewportPresence);
  printCounts('route child cardinality', aggregate.routeChildCardinality);
  printCounts('route contexts: container', aggregate.routeContextContainers);
  printCounts('route contexts: viewport agent', aggregate.routeContextViewportAgents);
  printCounts('router viewports: declared usedBy entries', aggregate.routerViewportUsedByCount);
  printCounts('viewport agents: host controller', aggregate.viewportAgentHostControllers);
  printCounts('component agents: controller', aggregate.componentAgentControllers);
  printCounts('component agents: viewport agent', aggregate.componentAgentViewportAgents);
  printCounts('component agents: component kinds', aggregate.componentAgentComponentKinds);
  printCounts('component agents: component resolution', aggregate.componentAgentComponentResolution);
  printCounts('runtime controllers: creation kinds', aggregate.runtimeControllerCreationKinds);
  printCounts('runtime controllers: readiness', aggregate.runtimeControllerReadiness);
  printCounts('runtime controllers: hydration handoff', aggregate.runtimeControllerHydrationHandoff);
  printCounts('runtime controllers: child-view rendering state', aggregate.runtimeControllerChildViewRenderingState);
  printCounts('route trees: options', aggregate.routeTreeOptions);
  printCounts('route trees: instruction tree', aggregate.routeTreeInstructionTree);
  printCounts('route trees: node count', aggregate.routeTreeNodeCount);
  printCounts('route nodes: children', aggregate.routeNodeChildren);
  printCounts('route nodes: instruction', aggregate.routeNodeInstruction);
  printCounts('route nodes: recognized route', aggregate.routeNodeRecognizedRoute);
  printCounts('route nodes: parameters', aggregate.routeNodeParameters);
  printCounts('route nodes: query params', aggregate.routeNodeQueryParams);
  printCounts('route nodes: fragment', aggregate.routeNodeFragment);
  printCounts('route nodes: viewport', aggregate.routeNodeViewport);
  printCounts('route nodes: residue', aggregate.routeNodeResidue);
  printCounts('route pattern segments', aggregate.routePatternSegments);
  printCounts('route pattern segment kinds', aggregate.routePatternSegmentKinds);
  printCounts('route pattern parameters', aggregate.routePatternParameters);
  printCounts('route pattern parameter kinds', aggregate.routePatternParameterKinds);
  printCounts('route endpoint residuals', aggregate.routeEndpointResiduals);
  printCounts('route endpoint parameters', aggregate.routeEndpointParameters);
  printCounts('route endpoint parameter kinds', aggregate.routeEndpointParameterKinds);
  printCounts('route-recognizer state kinds', aggregate.routeRecognizerStateKinds);
  printCounts('route-recognizer state next counts', aggregate.routeRecognizerStateNextCounts);
  printCounts('route-recognizer state endpoints', aggregate.routeRecognizerStateEndpoints);
  printCounts('route-recognizer state dynamic', aggregate.routeRecognizerStateDynamic);
  printCounts('route-recognizer state constrained', aggregate.routeRecognizerStateConstrained);
  printCounts('route-recognizer issue kinds', aggregate.routeRecognizerIssueKinds);
  printCounts('router issue kinds', aggregate.routerIssueKinds);
  printCounts('router issue framework error codes', aggregate.routerIssueFrameworkErrorCodes, 18);
  printCounts('router issue framework error code fixtures', aggregate.routerIssueFrameworkErrorCodeFixtureKeys, 18);
  printCounts('recognized route residue', aggregate.recognizedRouteResidue);
  printCounts('recognized route parameters', aggregate.recognizedRouteParameters);
  printCounts('recognized route redirect depth', aggregate.recognizedRouteRedirectDepth);
  printCounts('recognized route endpoint residuals', aggregate.recognizedRouteEndpointResiduals);
  printCounts('recognized route route context', aggregate.recognizedRouteRouteContext);
  printCounts('typed navigation instruction kinds', aggregate.typedNavigationInstructionKinds);
  printCounts('typed navigation instruction components', aggregate.typedNavigationInstructionComponents);
  printCounts('viewport instruction component kinds', aggregate.viewportInstructionComponentKinds);
  printCounts('viewport instruction typed kinds', aggregate.viewportInstructionTypedKinds);
  printCounts('viewport instruction children', aggregate.viewportInstructionChildren);
  printCounts('viewport instruction parameters', aggregate.viewportInstructionParameters);
  printCounts('viewport instruction parameter count', aggregate.viewportInstructionParameterCount);
  printCounts('viewport instruction grouping open', aggregate.viewportInstructionOpen);
  printCounts('viewport instruction grouping close', aggregate.viewportInstructionClose);
  printCounts('viewport instruction recognized route', aggregate.viewportInstructionRecognizedRoute);
  printCounts('viewport instruction tree route context', aggregate.viewportInstructionTreeRouteContext);
  printCounts('viewport instruction tree instructions', aggregate.viewportInstructionTreeInstructions);
  printCounts('viewport instruction tree options', aggregate.viewportInstructionTreeOptions);
  printCounts('viewport instruction tree absolute', aggregate.viewportInstructionTreeAbsolute);
  printCounts('viewport instruction tree query params', aggregate.viewportInstructionTreeQueryParams);
  printCounts('viewport instruction tree fragment', aggregate.viewportInstructionTreeFragment);
  printCounts('bindable modes', aggregate.bindableModes);
  printCounts('setter kinds', aggregate.setterKinds);
  printCounts('bindable value type shapes', aggregate.bindableValueTypeShapes);
  printCounts('bindable effective value type shapes', aggregate.bindableEffectiveValueTypeShapes);
  printCounts('bindable value type weak', aggregate.bindableValueTypeWeak);
  printCounts('bindable value type call signatures', aggregate.bindableValueTypeCallSignatures);
  printCounts('bindable value type members', aggregate.bindableValueTypeMembers);
  printCounts('binding target-access lookups', aggregate.bindingTargetAccessLookups);
  printCounts('binding target-access target kinds', aggregate.bindingTargetAccessTargetKinds);
  printCounts('binding target-access strategies', aggregate.bindingTargetAccessStrategies);
  printCounts('binding target-access authorities', aggregate.bindingTargetAccessAuthorities);
  printCounts('binding target-access target type sources', aggregate.bindingTargetAccessTargetTypeSources);
  printCounts('binding target-access target type surfaces', aggregate.bindingTargetAccessTargetTypeSurfaces, 18);
  printCounts('binding target-access property type surfaces', aggregate.bindingTargetAccessPropertyTypeSurfaces, 18);
  printCounts('binding target-access type surface classes', aggregate.bindingTargetAccessTypeSurfaceClasses, 18);
  printCounts('binding target-access type-source surface classes', aggregate.bindingTargetAccessTypeSourceSurfaceClasses, 18);
  printCounts('binding target-access framework error codes', aggregate.bindingTargetAccessFrameworkErrorCodes, 18);
  printCounts('binding target-access framework error code fixtures', aggregate.bindingTargetAccessFrameworkErrorCodeFixtureKeys, 18);
  printCounts('binding target-access open reasons', aggregate.bindingTargetAccessOpenReasons, 12);
  printCounts('binding behavior application names', aggregate.bindingBehaviorApplicationNames);
  printCounts('binding behavior application phases', aggregate.bindingBehaviorApplicationPhases);
  printCounts('binding behavior application binding kinds', aggregate.bindingBehaviorApplicationBindingKinds);
  printCounts('binding behavior application target kinds', aggregate.bindingBehaviorApplicationTargetKinds);
  printCounts('binding behavior application target properties', aggregate.bindingBehaviorApplicationTargetProperties, 18);
  printCounts('binding behavior application argument counts', aggregate.bindingBehaviorApplicationArgumentCounts, 18);
  printCounts('binding behavior application static argument counts', aggregate.bindingBehaviorApplicationStaticArgumentCounts, 18);
  printCounts('binding value-channel kinds', aggregate.bindingValueChannelKinds);
  printCounts('binding value-channel target kinds', aggregate.bindingValueChannelTargetKinds);
  printCounts('binding value-channel authorities', aggregate.bindingValueChannelAuthorities);
  printCounts('binding value-channel matcher modes', aggregate.bindingValueChannelMatcherModes);
  printCounts('binding value-channel raw target type surfaces', aggregate.bindingValueChannelRawTypeSurfaces, 18);
  printCounts('binding value-channel runtime type surfaces', aggregate.bindingValueChannelRuntimeTypeSurfaces, 18);
  printCounts('binding value-channel domain counts', aggregate.bindingValueChannelDomainCounts, 18);
  printCounts('binding value-channel primitive domain counts', aggregate.bindingValueChannelPrimitiveDomainCounts, 18);
  printCounts('binding value-channel primitive domain kinds', aggregate.bindingValueChannelPrimitiveDomainKinds, 18);
  printCounts('binding value-channel open reasons', aggregate.bindingValueChannelOpenReasons, 12);
  printCounts('watch expression kinds', aggregate.watchExpressionKinds);
  printCounts('watch expression property-key kinds', aggregate.watchExpressionPropertyKeyKinds);
  printCounts('watch callback kinds', aggregate.watchCallbackKinds);
  printCounts('watch callback property-key kinds', aggregate.watchCallbackPropertyKeyKinds);
  printCounts('watch flush modes', aggregate.watchFlushModes);
  printCounts('template diagnostic severities', aggregate.templateDiagnosticSeverities);
  printCounts('template diagnostic authorities', aggregate.templateDiagnosticAuthorities);
  printCounts('template diagnostic kinds', aggregate.templateDiagnosticKinds);
  printCounts('template diagnostic framework error codes', aggregate.templateDiagnosticFrameworkErrorCodes, 18);
  printCounts('template diagnostic framework error code fixtures', aggregate.templateDiagnosticFrameworkErrorCodeFixtureKeys, 18);
  printCounts('template diagnostic missing inputs', aggregate.templateDiagnosticMissingInputs, 18);
  printCounts('template diagnostic missing input fixtures', aggregate.templateDiagnosticMissingInputFixtureKeys, 18);
  printCounts('template diagnostic suggestions', aggregate.templateDiagnosticSuggestions, 18);
  printCounts('template diagnostic suggestion actions', aggregate.templateDiagnosticSuggestionActions, 18);
  printCounts('template diagnostic suggestion targets', aggregate.templateDiagnosticSuggestionTargets, 18);
  printCounts('template diagnostic owner origins', aggregate.templateDiagnosticOwnerOrigins, 18);
  printCounts('template diagnostic site kinds', aggregate.templateDiagnosticSiteKinds, 18);
  printCounts('template diagnostic value-site kinds', aggregate.templateDiagnosticValueSiteKinds, 18);
  printCounts('validation issue kinds', aggregate.validationIssueKinds);
  printCounts('validation issue framework error codes', aggregate.validationIssueFrameworkErrorCodes, 18);
  printCounts('fetch-client issue kinds', aggregate.fetchClientIssueKinds);
  printCounts('fetch-client issue framework error codes', aggregate.fetchClientIssueFrameworkErrorCodes, 18);
  printCounts('dialog issue kinds', aggregate.dialogIssueKinds);
  printCounts('dialog issue framework error codes', aggregate.dialogIssueFrameworkErrorCodes, 18);
  printCounts('app diagnostic domains', aggregate.appDiagnosticDomains);
  printCounts('app diagnostic authorities', aggregate.appDiagnosticAuthorities);
  printCounts('app diagnostic kinds', aggregate.appDiagnosticKinds, 18);
  printCounts('app diagnostic framework error codes', aggregate.appDiagnosticFrameworkErrorCodes, 18);
  printCounts('app diagnostic framework error code fixtures', aggregate.appDiagnosticFrameworkErrorCodeFixtureKeys, 18);
  printCounts('binding data-flow binding kinds', aggregate.bindingDataFlowBindingKinds);
  printCounts('binding data-flow directions', aggregate.bindingDataFlowDirections);
  printCounts('binding data-flow strict bindings', aggregate.bindingDataFlowStrictBindings);
  printCounts('binding data-flow parse states', aggregate.bindingDataFlowParseStates);
  printCounts('binding data-flow parse result kinds', aggregate.bindingDataFlowParseResultKinds);
  printCounts('binding data-flow value-site kinds', aggregate.bindingDataFlowValueSiteKinds);
  printCounts('binding data-flow source kinds', aggregate.bindingDataFlowSourceKinds);
  printCounts('binding data-flow target kinds', aggregate.bindingDataFlowTargetKinds);
  printCounts('binding data-flow source type open kinds', aggregate.bindingDataFlowSourceTypeOpenKinds);
  printCounts('binding data-flow source type surfaces', aggregate.bindingDataFlowSourceTypeSurfaces, 18);
  printCounts('binding data-flow target type surfaces', aggregate.bindingDataFlowTargetTypeSurfaces, 18);
  printCounts('binding data-flow value-site type surfaces', aggregate.bindingDataFlowValueSiteTypeSurfaces, 18);
  printCounts('binding data-flow source assignment kinds', aggregate.bindingDataFlowSourceAssignmentKinds);
  printCounts('binding data-flow framework error codes', aggregate.bindingDataFlowFrameworkErrorCodes, 18);
  printCounts('binding data-flow framework error code fixtures', aggregate.bindingDataFlowFrameworkErrorCodeFixtureKeys, 18);
  printCounts('binding data-flow source assignment reason kinds', aggregate.bindingDataFlowSourceAssignmentReasons, 12);
  printCounts('binding data-flow source assignment reason fixtures', aggregate.bindingDataFlowSourceAssignmentReasonFixtureKeys, 18);
  printCounts('binding data-flow source assignment pressure classes', aggregate.bindingDataFlowSourceAssignmentPressureClasses, 18);
  printCounts('binding data-flow source assignment by binding kind', aggregate.bindingDataFlowSourceAssignmentBindingKinds, 18);
  printCounts('binding data-flow source assignment by source kind', aggregate.bindingDataFlowSourceAssignmentSourceKinds, 18);
  printCounts('binding data-flow source assignment by value channel', aggregate.bindingDataFlowSourceAssignmentValueChannels, 18);
  printCounts('binding data-flow source assignment by source type surface', aggregate.bindingDataFlowSourceAssignmentSourceTypeSurfaces, 18);
  printCounts('binding data-flow source assignment by assignment target type surface', aggregate.bindingDataFlowSourceAssignmentTargetSourceTypeSurfaces, 18);
  printCounts('binding data-flow source assignment by target type surface', aggregate.bindingDataFlowSourceAssignmentTargetTypeSurfaces, 18);
  printCounts('binding data-flow source assignment by writeability', aggregate.bindingDataFlowSourceAssignmentWriteability, 18);
  printCounts('binding data-flow open reasons', aggregate.bindingDataFlowOpenReasons, 12);
  printCounts('open seam kinds', aggregate.openSeamKinds);
  printCounts('open seam reason kinds', aggregate.openSeamReasonKinds, 12);
  printCounts('open seam reason fixtures', aggregate.openSeamReasonFixtureKeys, 18);
  printCounts('app-root project open seam kinds', aggregate.appRootOpenSeamKinds);
  printCounts('non-app-root project open seam kinds', aggregate.nonAppRootOpenSeamKinds);
  printCounts('open seam summaries', aggregate.openSeamSummaries, 12);
  printQueryOutcomes('query outcomes', aggregate.outcomes);
}

async function readPressureForRoot(root) {
  const fixtureLane = pressureFixtureLane(root);
  const fixtureKey = pressureFixtureKey(root);
  const timings = createTimingAccumulator();
  const runtime = await measure(timings, 'create-runtime', () =>
    createSemanticRuntime({
      workspaceRoot: root,
      projectDiscovery,
    }),
  );
  const summary = await measure(timings, 'workspace-summary', () =>
    runtime.summary({ projectPage: { size: Number.MAX_SAFE_INTEGER } }).value,
  );
  const aggregate = {
    projects: summary.projects.length,
    sourceFiles: summary.projects.reduce((sum, project) => sum + project.sourceFiles, 0),
    projectsWithAureliaAppEntrypointSignal: 0,
    selectedProjects: 0,
    openedAppWorlds: 0,
    projectsWithAppRoots: 0,
    projectsWithoutAppRoots: 0,
    resourceLibrariesWithoutAppRoots: 0,
    resourceDefinitions: 0,
    authoringSourceFilesRequested: 0,
    appRuntimeTemplatesSeen: 0,
    authoringTemplatesSeen: 0,
    appTopologyServices: 0,
    appTopologyInjections: 0,
    appTopologyServiceInteractions: 0,
    appTopologyServiceInteractionBindings: 0,
    appTopologyComponentRoles: 0,
    appTopologyStateCompositions: 0,
    appTopologyStyles: 0,
    stateStores: 0,
    authoringOrientationCoverageRows: 0,
    authoringOrientationTasteAxes: 0,
    authoringOrientationTasteValues: 0,
    authoringOrientationCapabilities: 0,
    authoringOrientationOperations: 0,
    authoringOrientationRepairs: 0,
    authoringOrientationRepairClusters: 0,
    authoringOrientationOpenReasons: 0,
    authoringCatalogOperationFamilies: 0,
    authoringCatalogTasteAxes: 0,
    authoringCatalogTasteValues: 0,
    authoringCatalogProfiles: 0,
    authoringCatalogCapabilities: 0,
    authoringCatalogOperations: 0,
    authoringCatalogRecipes: 0,
    authoringCatalogRecipeExpectedEffects: 0,
    routerOptions: 0,
    routeConfigs: 0,
    routeConfigContexts: 0,
    routeContexts: 0,
    routeRecognizers: 0,
    routePatterns: 0,
    routeEndpoints: 0,
    routeRecognizerStates: 0,
    routeRecognizerIssues: 0,
    routerIssues: 0,
    recognizedRoutes: 0,
    typedNavigationInstructions: 0,
    viewportInstructions: 0,
    viewportInstructionTrees: 0,
    routeTrees: 0,
    routeNodes: 0,
    routerViewports: 0,
    viewportAgents: 0,
    componentAgents: 0,
    appTasks: 0,
    i18nTranslationKeys: 0,
    i18nTranslationBindings: 0,
    diKeyIdentities: 0,
    diResolveCallSites: 0,
    runtimeControllers: 0,
    runtimeCompositions: 0,
    runtimeCompositionResolvedComponents: 0,
    runtimeCompositionCompiledTemplates: 0,
    runtimeCompositionCandidateResourceAnalyses: 0,
    runtimeCompositionCandidateResourceControllers: 0,
    runtimeCompositionComposedChildControllers: 0,
    runtimeCompositionModelAssignableHandoffs: 0,
    runtimeCompositionModelUnassignableHandoffs: 0,
    runtimeCompositionOpenHandoffs: 0,
    openRuntimeCompositions: 0,
    bindables: 0,
    watches: 0,
    templateDiagnostics: 0,
    appDiagnostics: 0,
    configurationIssues: 0,
    evaluationIssues: 0,
    diIssues: 0,
    observationIssues: 0,
    validationIssues: 0,
    fetchClientIssues: 0,
    dialogIssues: 0,
    resourceIssues: 0,
    bindingTargetAccesses: 0,
    bindingBehaviorApplications: 0,
    bindingValueChannels: 0,
    bindingDataFlows: 0,
    openBindingDataFlows: 0,
    bindingDataFlowSourceAssignmentPressures: 0,
    unresolvedModuleEdges: 0,
    openSeams: 0,
    appRootProjectOpenSeams: 0,
    nonAppRootProjectOpenSeams: 0,
    fixtureLaneKinds: {},
    fixtureKeys: {},
    resourceKinds: {},
    skippedProjectFilters: {},
    resourceDeclarationModes: {},
    diKeyIdentityKinds: {},
    diKeyIdentityDeclarationCoverage: {},
    diKeyIdentityDeclarationAddressCoverage: {},
    seenDiKeyIdentityHandles: new Set(),
    configurationIssueKinds: {},
    configurationIssueFrameworkErrorCodes: {},
    evaluationIssueKinds: {},
    evaluationIssueFrameworkErrorCodes: {},
    evaluationIssueSubjectKinds: {},
    evaluationIssueActualValueKinds: {},
    diIssueKinds: {},
    diIssueSubjectKinds: {},
    diIssueSeverities: {},
    diIssueResolveExecutionContexts: {},
    diIssueActiveContainerExpectations: {},
    diIssueResolveNullishKeyArgumentCounts: {},
    diIssueResolveNullishKeyArgumentKinds: {},
    diIssueInjectDecoratorTargetKinds: {},
    diIssueInjectDecoratorNames: {},
    diIssueContainerApiMethods: {},
    diIssueContainerApiKeyKinds: {},
    diIssueContainerApiKeyIdentities: {},
    diIssueContainerApiAutoRegister: {},
    diIssueFrameworkErrorCodes: {},
    observationIssueKinds: {},
    observationIssueFrameworkErrorCodes: {},
    validationIssueKinds: {},
    validationIssueFrameworkErrorCodes: {},
    fetchClientIssueKinds: {},
    fetchClientIssueFrameworkErrorCodes: {},
    dialogIssueKinds: {},
    dialogIssueFrameworkErrorCodes: {},
    resourceIssueKinds: {},
    resourceIssueFrameworkErrorCodes: {},
    routerOptionsUseHref: {},
    routerOptionsUseUrlFragmentHash: {},
    routerOptionsUseEagerLoading: {},
    routeKinds: {},
    routeOriginKinds: {},
    routeValueKinds: {},
    routeComponentKinds: {},
    routeComponentResolution: {},
    routeViewportPresence: {},
    routeChildCardinality: {},
    routeContextContainers: {},
    routeContextViewportAgents: {},
    routerViewportUsedByCount: {},
    viewportAgentHostControllers: {},
    componentAgentControllers: {},
    componentAgentViewportAgents: {},
    componentAgentComponentKinds: {},
    componentAgentComponentResolution: {},
    runtimeControllerCreationKinds: {},
    runtimeControllerReadiness: {},
    runtimeControllerHydrationHandoff: {},
    runtimeControllerChildViewRenderingState: {},
    runtimeCompositionComponentResolutionKinds: {},
    runtimeCompositionModelResolutionKinds: {},
    runtimeCompositionScopeBehavior: {},
    runtimeCompositionFlushMode: {},
    runtimeCompositionTag: {},
    runtimeCompositionComponentInput: {},
    runtimeCompositionTemplateInput: {},
    runtimeCompositionComponentInputFulfillmentKinds: {},
    runtimeCompositionTemplateInputFulfillmentKinds: {},
    runtimeCompositionModelInputFulfillmentKinds: {},
    runtimeCompositionStaticComponentName: {},
    runtimeCompositionTemplateBinding: {},
    runtimeCompositionCompositionBinding: {},
    runtimeCompositionComposingBinding: {},
    runtimeCompositionCandidateCounts: {},
    runtimeCompositionCompiledTemplateCounts: {},
    runtimeCompositionCandidateResourceAnalysisStates: {},
    runtimeCompositionCandidateResourceAnalysisCounts: {},
    runtimeCompositionCandidateResourceControllerCounts: {},
    runtimeCompositionCandidateResourceControllerCreationKinds: {},
    runtimeCompositionComposedChildControllerCounts: {},
    runtimeCompositionComposedChildControllerCreationKinds: {},
    runtimeCompositionActivationHandoffKinds: {},
    runtimeCompositionActivationParameterTypes: {},
    runtimeCompositionActivationAssignability: {},
    runtimeCompositionSourceCoverage: {},
    runtimeCompositionOpenReasons: {},
    runtimeCompositionOpenReasonKinds: {},
    routeTreeOptions: {},
    routeTreeInstructionTree: {},
    routeTreeNodeCount: {},
    routeNodeChildren: {},
    routeNodeInstruction: {},
    routeNodeRecognizedRoute: {},
    routeNodeParameters: {},
    routeNodeQueryParams: {},
    routeNodeFragment: {},
    routeNodeViewport: {},
    routeNodeResidue: {},
    routePatternSegments: {},
    routePatternSegmentKinds: {},
    routePatternParameters: {},
    routePatternParameterKinds: {},
    routeEndpointResiduals: {},
    routeEndpointParameters: {},
    routeEndpointParameterKinds: {},
    routeRecognizerStateKinds: {},
    routeRecognizerStateNextCounts: {},
    routeRecognizerStateEndpoints: {},
    routeRecognizerStateDynamic: {},
    routeRecognizerStateConstrained: {},
    routeRecognizerIssueKinds: {},
    routerIssueKinds: {},
    routerIssueFrameworkErrorCodes: {},
    routerIssueFrameworkErrorCodeFixtureKeys: {},
    i18nTranslationKeyLocaleStates: {},
    i18nTranslationKeyNamespaceStates: {},
    i18nTranslationKeySourceCoverage: {},
    i18nTranslationKeySourceKinds: {},
    i18nTranslationKeySegmentCounts: {},
    i18nTranslationBindingKeyExpressionKinds: {},
    i18nTranslationBindingTargetProperties: {},
    i18nTranslationBindingTargetKinds: {},
    i18nTranslationBindingParameterPresence: {},
    i18nTranslationBindingIssueCounts: {},
    i18nTranslationBindingFrameworkErrorCodePresence: {},
    recognizedRouteResidue: {},
    recognizedRouteParameters: {},
    recognizedRouteRedirectDepth: {},
    recognizedRouteEndpointResiduals: {},
    recognizedRouteRouteContext: {},
    typedNavigationInstructionKinds: {},
    typedNavigationInstructionComponents: {},
    viewportInstructionComponentKinds: {},
    viewportInstructionTypedKinds: {},
    viewportInstructionChildren: {},
    viewportInstructionParameters: {},
    viewportInstructionParameterCount: {},
    viewportInstructionOpen: {},
    viewportInstructionClose: {},
    viewportInstructionRecognizedRoute: {},
    viewportInstructionTreeRouteContext: {},
    viewportInstructionTreeInstructions: {},
    viewportInstructionTreeOptions: {},
    viewportInstructionTreeAbsolute: {},
    viewportInstructionTreeQueryParams: {},
    viewportInstructionTreeFragment: {},
    bindableModes: {},
    setterKinds: {},
    bindableValueTypeShapes: {},
    bindableEffectiveValueTypeShapes: {},
    bindableValueTypeWeak: {},
    bindableValueTypeCallSignatures: {},
    bindableValueTypeMembers: {},
    bindingTargetAccessLookups: {},
    bindingTargetAccessTargetKinds: {},
    bindingTargetAccessStrategies: {},
    bindingTargetAccessAuthorities: {},
    bindingTargetAccessTargetTypeSources: {},
    bindingTargetAccessTargetTypeSurfaces: {},
    bindingTargetAccessPropertyTypeSurfaces: {},
    bindingTargetAccessTypeSurfaceClasses: {},
    bindingTargetAccessTypeSourceSurfaceClasses: {},
    bindingTargetAccessOpenReasons: {},
    bindingTargetAccessFrameworkErrorCodes: {},
    bindingTargetAccessFrameworkErrorCodeFixtureKeys: {},
    bindingBehaviorApplicationNames: {},
    bindingBehaviorApplicationPhases: {},
    bindingBehaviorApplicationBindingKinds: {},
    bindingBehaviorApplicationTargetKinds: {},
    bindingBehaviorApplicationTargetProperties: {},
    bindingBehaviorApplicationArgumentCounts: {},
    bindingBehaviorApplicationStaticArgumentCounts: {},
    bindingValueChannelKinds: {},
    bindingValueChannelTargetKinds: {},
    bindingValueChannelAuthorities: {},
    bindingValueChannelMatcherModes: {},
    bindingValueChannelRawTypeSurfaces: {},
    bindingValueChannelRuntimeTypeSurfaces: {},
    bindingValueChannelDomainCounts: {},
    bindingValueChannelPrimitiveDomainCounts: {},
    bindingValueChannelPrimitiveDomainKinds: {},
    bindingValueChannelOpenReasons: {},
    watchExpressionKinds: {},
    watchExpressionPropertyKeyKinds: {},
    watchCallbackKinds: {},
    watchCallbackPropertyKeyKinds: {},
    watchFlushModes: {},
    templateDiagnosticSeverities: {},
    templateDiagnosticAuthorities: {},
    templateDiagnosticKinds: {},
    templateDiagnosticFrameworkErrorCodes: {},
    templateDiagnosticFrameworkErrorCodeFixtureKeys: {},
    templateDiagnosticMissingInputs: {},
    templateDiagnosticMissingInputFixtureKeys: {},
    templateDiagnosticSuggestions: {},
    templateDiagnosticSuggestionActions: {},
    templateDiagnosticSuggestionTargets: {},
    templateDiagnosticOwnerOrigins: {},
    templateDiagnosticSiteKinds: {},
    templateDiagnosticValueSiteKinds: {},
    appDiagnosticDomains: {},
    appDiagnosticAuthorities: {},
    appDiagnosticKinds: {},
    appDiagnosticFrameworkErrorCodes: {},
    appDiagnosticFrameworkErrorCodeFixtureKeys: {},
    bindingDataFlowBindingKinds: {},
    bindingDataFlowDirections: {},
    bindingDataFlowStrictBindings: {},
    bindingDataFlowParseStates: {},
    bindingDataFlowParseResultKinds: {},
    bindingDataFlowValueSiteKinds: {},
    bindingDataFlowSourceKinds: {},
    bindingDataFlowTargetKinds: {},
    bindingDataFlowSourceTypeOpenKinds: {},
    bindingDataFlowSourceTypeSurfaces: {},
    bindingDataFlowTargetTypeSurfaces: {},
    bindingDataFlowValueSiteTypeSurfaces: {},
    bindingDataFlowSourceAssignmentKinds: {},
    bindingDataFlowFrameworkErrorCodes: {},
    bindingDataFlowFrameworkErrorCodeFixtureKeys: {},
    bindingDataFlowSourceAssignmentReasons: {},
    bindingDataFlowSourceAssignmentReasonFixtureKeys: {},
    bindingDataFlowSourceAssignmentPressureClasses: {},
    bindingDataFlowSourceAssignmentBindingKinds: {},
    bindingDataFlowSourceAssignmentSourceKinds: {},
    bindingDataFlowSourceAssignmentValueChannels: {},
    bindingDataFlowSourceAssignmentSourceTypeSurfaces: {},
    bindingDataFlowSourceAssignmentTargetSourceTypeSurfaces: {},
    bindingDataFlowSourceAssignmentTargetTypeSurfaces: {},
    bindingDataFlowSourceAssignmentWriteability: {},
    bindingDataFlowOpenReasons: {},
    openSeamKinds: {},
    openSeamReasonKinds: {},
    openSeamReasonFixtureKeys: {},
    appRootOpenSeamKinds: {},
    nonAppRootOpenSeamKinds: {},
    openSeamSummaries: {},
    projectShapeKinds: {},
    skippedProjectShapeKinds: {},
    projectAnalysisKinds: {},
    skippedProjectAnalysisKinds: {},
    projectAureliaDependencyScopes: {},
    projectAureliaDependencyOrigins: {},
    projectAureliaDependencyScopeOrigins: {},
    projectAureliaSourceSignals: {},
    projectShapeReasons: {},
    projectSourceRoles: {},
    appTopologyServiceRoles: {},
    appTopologyServiceExportStates: {},
    appTopologyServiceResolveCallCounts: {},
    appTopologyInjectionMechanisms: {},
    appTopologyInjectionKeyDeclarationKinds: {},
    appTopologyInjectionKeyDeclarationRoles: {},
    appTopologyInjectionKeyImportKinds: {},
    appTopologyInjectionKeyImportScopes: {},
    appTopologyInjectionConsumerClasses: {},
    appTopologyInjectionConsumerMemberKinds: {},
    appTopologyInjectionExecutionContexts: {},
    appTopologyInjectionActiveContainerExpectations: {},
    appTopologyInjectionNullishKeyArgumentCounts: {},
    appTopologyInjectionNullishKeyArgumentKinds: {},
    appTopologyInjectionSourceCoverage: {},
    appTopologyServiceInteractionOperationKinds: {},
    appTopologyServiceInteractionTargetRoles: {},
    appTopologyServiceInteractionConsumerRoles: {},
    appTopologyServiceInteractionConsumerClasses: {},
    appTopologyServiceInteractionConsumerMembers: {},
    appTopologyServiceInteractionArgumentCounts: {},
    appTopologyServiceInteractionSelfStates: {},
    appTopologyServiceInteractionSourceCoverage: {},
    appTopologyServiceInteractionBindingSourceKinds: {},
    appTopologyServiceInteractionBindingSourceRoots: {},
    appTopologyServiceInteractionBindingDirections: {},
    appTopologyServiceInteractionBindingTargetProperties: {},
    appTopologyServiceInteractionBindingOperationKinds: {},
    appTopologyServiceInteractionBindingTargetRoles: {},
    appTopologyServiceInteractionBindingSelfStates: {},
    appTopologyComponentRolesByKind: {},
    appTopologyComponentRoleEvidence: {},
    appTopologyComponentRoleSourceCoverage: {},
    appTopologyStateCompositionRoles: {},
    appTopologyStateCompositionValueTypeShapes: {},
    appTopologyStateCompositionSourceCoverage: {},
    appTopologyStyleAssetKinds: {},
    appTopologyStyleSourceKinds: {},
    appTopologyStyleOwnerKinds: {},
    appTopologyStyleSourceCoverage: {},
    appTopologyStyleEvidenceCoverage: {},
    stateStoreDefaultness: {},
    stateStoreInitialStateKinds: {},
    stateStoreOptionsOrHandlerKinds: {},
    stateStoreActionHandlerCounts: {},
    authoringCatalogTasteAxisLayers: {},
    authoringCatalogTasteAxisValueLayers: {},
    authoringCatalogTasteAxisPrimitivePolicyValueCounts: {},
    authoringCatalogTasteAxisObservedShapeValueCounts: {},
    authoringCatalogTasteAxisDerivedReadingValueCounts: {},
    authoringCatalogTasteValueLayers: {},
    authoringCatalogProfilePreferenceCounts: {},
    authoringCatalogProfilePreferenceAxes: {},
    authoringCatalogProfilePreferenceValues: {},
    authoringCatalogProfilePreferenceLayers: {},
    authoringCatalogOperationFamiliesByKey: {},
    authoringCatalogOperationActions: {},
    authoringCatalogOperationTargetKinds: {},
    authoringCatalogOperationCapabilityCounts: {},
    authoringCatalogCapabilityProductOpenReasons: {},
    authoringCatalogOperationProductOpenReasons: {},
    authoringCatalogRecipeSupportStates: {},
    authoringCatalogRecipeBaseKeys: {},
    authoringCatalogRecipeSpecificityRanks: {},
    authoringCatalogRecipePreferenceCounts: {},
    authoringCatalogRecipePreferenceAxes: {},
    authoringCatalogRecipePreferenceValues: {},
    authoringCatalogRecipePreferenceLayers: {},
    authoringCatalogRecipeSourcePlanPresence: {},
    authoringCatalogRecipeSourcePlanConflictPolicies: {},
    authoringCatalogRecipeSourcePlanFormattingPolicies: {},
    authoringCatalogRecipeSourcePlanPackageToolingPolicies: {},
    authoringCatalogRecipeSourcePlanFileCounts: {},
    authoringCatalogRecipeProjectToolingPresence: {},
    authoringCatalogRecipeProjectToolingPackageManagers: {},
    authoringCatalogRecipeProjectToolingBuildToolPolicies: {},
    authoringCatalogRecipeProjectToolingDependencyScopes: {},
    authoringCatalogRecipeProjectToolingDependencySpecifiers: {},
    authoringCatalogRecipeProjectToolingScriptNames: {},
    authoringCatalogRecipeProjectToolingFileKinds: {},
    authoringCatalogRecipeProjectToolingFileLanguages: {},
    authoringCatalogRecipeProjectToolingTextAuthorities: {},
    authoringCatalogRecipeSourceFileRoles: {},
    authoringCatalogRecipeSourceFileLanguages: {},
    authoringCatalogRecipeSourceFileEditKinds: {},
    authoringCatalogRecipeSourceFileTextAuthorities: {},
    authoringCatalogRecipeExpectedEffectKinds: {},
    authoringCatalogRecipeExpectedEffectRoles: {},
    authoringCatalogRecipeExpectedEffectTargets: {},
    authoringCatalogRecipeExpectedEffectFilterCounts: {},
    authoringCatalogRecipeExpectedEffectFilterFields: {},
    authoringCoverageSurfaceKinds: {},
    authoringCoverageSupportStates: {},
    authoringTasteAxisKeys: {},
    authoringTasteAxisLayers: {},
    authoringTasteAxisPolicyStates: {},
    authoringTasteAxisKeyPolicyStates: {},
    authoringTasteAxisKeyValueCounts: {},
    authoringTasteAxisKeyOpenReasons: {},
    authoringTasteAxisConfidences: {},
    authoringTasteAxisPrimitivePolicyValueCounts: {},
    authoringTasteAxisObservedShapeValueCounts: {},
    authoringTasteAxisDerivedReadingValueCounts: {},
    authoringTasteValueLayers: {},
    authoringTasteAxisValues: {},
    authoringTasteValues: {},
    authoringCapabilityKeys: {},
    authoringCapabilitySupportStates: {},
    authoringCapabilityOpenReasons: {},
    authoringOperationActions: {},
    authoringOperationSupportStates: {},
    authoringOperationOpenReasons: {},
    authoringRepairKinds: {},
    authoringRepairEvidenceKinds: {},
    authoringRepairSupportStates: {},
    authoringRepairAuthorities: {},
    authoringRepairLoci: {},
    authoringRepairDiagnosticKinds: {},
    authoringRepairSeamKinds: {},
    authoringRepairOpenReasons: {},
    authoringRepairActionTargets: {},
    authoringRepairClusterKinds: {},
    authoringRepairClusterPlanKinds: {},
    authoringRepairClusterChangeDomains: {},
    authoringRepairClusterPlanReadiness: {},
    authoringRepairClusterActionTargets: {},
    authoringRepairClusterActionTargetCounts: {},
    authoringRepairClusterSiteKinds: {},
    authoringRepairClusterValueSiteKinds: {},
    authoringRepairClusterRuntimeBoundaryKinds: {},
    authoringRepairClusterRuntimeIntentKinds: {},
    authoringRepairClusterTargetMemberCounts: {},
    authoringRepairClusterOwnerTypeCounts: {},
    authoringRepairClusterValueTypeCounts: {},
    authoringRepairClusterMemberHintCounts: {},
    authoringRepairClusterMemberHintValueTypeCoverage: {},
    authoringRepairClusterMemberHintValueTypeSources: {},
    authoringRepairClusterActionTargetSourceCoverage: {},
    authoringSurfaceSupportStates: {},
    authoringRecipeKeys: {},
    authoringRecipeSupportStates: {},
    authoringRecipeExpectedEffects: {},
    authoringRecipeCurrentFitStates: {},
    authoringRecipeCurrentFitSpecificity: {},
    authoringRecipeExpectedEffectRoles: {},
    authoringRecipeExpectedEffectCurrentOutcomes: {},
    authoringRecipeApplicableExpectedEffectCurrentOutcomes: {},
    authoringRecipeExpectedEffectFixtureLaneOutcomes: {},
    authoringRecipeApplicableExpectedEffectFixtureLaneOutcomes: {},
    authoringRecipeApplicableExpectedEffectRecipeFixtureLaneOutcomes: {},
    authoringRecipeProjectToolingFixtureLaneOutcomes: {},
    authoringRecipeApplicableProjectToolingFixtureLaneOutcomes: {},
    authoringRecipeExpectedEffectTasteValueLayers: {},
    authoringRecipeExpectedEffectTasteLayerOutcomes: {},
    authoringRecipeExpectedEffectTargets: {},
    authoringRecipeExpectedEffectTargetOutcomes: {},
    authoringRecipeExpectedEffectRecipeTargetOutcomes: {},
    authoringRecipeApplicableExpectedEffectTargetOutcomes: {},
    authoringRecipeApplicableExpectedEffectRecipeTargetOutcomes: {},
    authoringRecipeSignatureEffectTargetOutcomes: {},
    authoringRecipeSignatureEffectRecipeTargetOutcomes: {},
    authoringRecipeDiscriminatorEffectTargetOutcomes: {},
    authoringRecipeDiscriminatorEffectRecipeTargetOutcomes: {},
    authoringRecipeCandidateSignatureEffectTargetOutcomes: {},
    authoringRecipeCandidateSignatureEffectRecipeTargetOutcomes: {},
    authoringRecipeExpectedEffectObservedCounts: {},
    authoringRecipeExpectedEffectScopes: {},
    authoringRecipeExpectedEffectCardinalities: {},
    authoringRecipeExpectedEffectFilterCounts: {},
    authoringRecipeExpectedEffectFilterFields: {},
    authoringRecipeOpenReasons: {},
    authoringOpenReasonLoci: {},
    outcomes: {},
    pageCounts: {},
    timings,
  };

  increment(aggregate.fixtureLaneKinds, fixtureLane);
  increment(aggregate.fixtureKeys, fixtureKey);

  for (const project of summary.projects) {
    if (project.hasAureliaAppEntrypointSignal) {
      aggregate.projectsWithAureliaAppEntrypointSignal += 1;
    }
    increment(aggregate.projectShapeKinds, project.shapeKind);
    increment(aggregate.projectAnalysisKinds, project.analysisKind);
    for (const dependencyScope of project.aureliaDependencyScopes ?? []) {
      increment(aggregate.projectAureliaDependencyScopes, dependencyScope.scope, dependencyScope.count);
      increment(aggregate.projectAureliaDependencyOrigins, dependencyScope.origin ?? 'unknown', dependencyScope.count);
      increment(
        aggregate.projectAureliaDependencyScopeOrigins,
        `${dependencyScope.scope}:${dependencyScope.origin ?? 'unknown'}`,
        dependencyScope.count,
      );
    }
    for (const sourceSignal of project.aureliaSourceSignals ?? []) {
      increment(aggregate.projectAureliaSourceSignals, sourceSignal.signal, sourceSignal.count);
    }
    for (const shapeReason of project.shapeReasons ?? []) {
      increment(aggregate.projectShapeReasons, shapeReason.reason, shapeReason.count);
    }
    for (const sourceRole of project.sourceRoles ?? []) {
      increment(aggregate.projectSourceRoles, sourceRole.role, sourceRole.count);
    }
    if (projectShapeFilter != null && !projectShapeFilter.has(project.shapeKind)) {
      increment(aggregate.skippedProjectShapeKinds, project.shapeKind);
      continue;
    }
    const projectFilterMiss = skippedProjectFilterReason(project, root);
    if (projectFilterMiss != null) {
      increment(aggregate.skippedProjectFilters, projectFilterMiss);
      continue;
    }
    if (projectShapeFilter == null && !defaultAppApiPressureAnalysisKinds.has(project.analysisKind)) {
      increment(aggregate.skippedProjectAnalysisKinds, project.analysisKind);
      continue;
    }
    aggregate.selectedProjects += 1;

    try {
      const projectFrame = runtime.workspace.projects.find((candidate) => candidate.projectKey === project.projectKey);
      const authoringTemplateSourceFiles = authoringTemplateSourceFilesForProject(project, projectFrame);
      aggregate.authoringSourceFilesRequested += authoringTemplateSourceFiles.length;
      const appStarted = performance.now();
      const app = await measure(timings, 'open-app', () =>
        runtime.openApp({
          projectKey: project.projectKey,
          analysisDepth,
          includeAuthoringTemplates: authoringTemplateSourceFiles.length > 0,
          authoringTemplateSourceFiles,
        }),
      );
      recordAppWorldProfile(timings, app.emission?.profile);
      recordTypeSystemProjectProfile(timings, app.emission?.typeSystem?.profile);
      recordResourceRecognitionProfile(timings, app.emission?.resources?.profile);
      recordTemplateCompilationProfile(timings, app.emission?.templates?.profile);
      recordTemplateRuntimeAnalysisProfiles(timings, allTemplateRuntimeAnalysisResources(app.emission?.templates));
      aggregate.openedAppWorlds += 1;
      aggregate.appRuntimeTemplatesSeen += app.emission?.templates?.resources?.length ?? 0;
      aggregate.authoringTemplatesSeen += app.emission?.templates?.authoringResources?.length ?? 0;
      const appSummary = await measure(timings, 'app-summary', () =>
        app.summary().value,
      );
      const hasAppRoot = appSummary.appRoots > 0;
      if (hasAppRoot) {
        aggregate.projectsWithAppRoots += 1;
        aggregate.appRootProjectOpenSeams += appSummary.kernelOpenSeams;
      } else {
        aggregate.projectsWithoutAppRoots += 1;
        aggregate.nonAppRootProjectOpenSeams += appSummary.kernelOpenSeams;
        if (appSummary.resourceDefinitions > 0) {
          aggregate.resourceLibrariesWithoutAppRoots += 1;
        }
      }
      aggregate.resourceDefinitions += appSummary.resourceDefinitions;
      aggregate.routerOptions += appSummary.routerOptions;
      aggregate.routeConfigs += appSummary.routeConfigs;
      aggregate.routeConfigContexts += appSummary.routeConfigContexts;
      aggregate.routeContexts += appSummary.routeContexts;
      aggregate.routeRecognizers += appSummary.routeRecognizers;
      aggregate.routePatterns += appSummary.routePatterns;
      aggregate.routeEndpoints += appSummary.routeEndpoints;
      aggregate.routeRecognizerStates += appSummary.routeRecognizerStates;
      aggregate.routeRecognizerIssues += appSummary.routeRecognizerIssues;
      aggregate.routerIssues += appSummary.routerIssues;
      aggregate.recognizedRoutes += appSummary.recognizedRoutes;
      aggregate.typedNavigationInstructions += appSummary.typedNavigationInstructions;
      aggregate.viewportInstructions += appSummary.viewportInstructions;
      aggregate.viewportInstructionTrees += appSummary.viewportInstructionTrees;
      aggregate.routeTrees += appSummary.routeTrees;
      aggregate.routeNodes += appSummary.routeNodes;
      aggregate.routerViewports += appSummary.routerViewports;
      aggregate.viewportAgents += appSummary.viewportAgents;
      aggregate.componentAgents += appSummary.componentAgents;
      aggregate.appTasks += appSummary.appTasks;
      aggregate.i18nTranslationKeys += appSummary.i18nTranslationKeys;
      aggregate.i18nTranslationBindings += appSummary.i18nTranslationBindings;
      recordDiKeyIdentities(aggregate, runtime.workspace.store);
      aggregate.stateStores += appSummary.stateStores;
      aggregate.diResolveCallSites += appSummary.diResolveCallSites;
      aggregate.evaluationIssues += appSummary.evaluationIssues;
      aggregate.diIssues += appSummary.diIssues;
      aggregate.runtimeControllers += appSummary.runtimeControllers;
      aggregate.unresolvedModuleEdges += appSummary.unresolvedModuleEdges;
      aggregate.openSeams += appSummary.kernelOpenSeams;

      const topologyAnswer = await measure(timings, 'query-app-topology', () =>
        app.ask({ kind: SemanticAppQueryKind.AppTopology }),
      );
      increment(aggregate.outcomes, `app-topology:${topologyAnswer.outcome}`);
      observeAppTopologyPressure(aggregate, topologyAnswer.value);

      const authoringCatalogAnswer = await measure(timings, 'query-authoring-catalog', () =>
        app.ask({ kind: SemanticAppQueryKind.AuthoringCatalog }),
      );
      increment(aggregate.outcomes, `authoring-catalog:${authoringCatalogAnswer.outcome}`);
      observeAuthoringCatalogPressure(aggregate, authoringCatalogAnswer.value);

      const authoringOrientationAnswer = await measure(timings, 'query-authoring-orientation', () =>
        app.ask({ kind: SemanticAppQueryKind.AuthoringOrientation }),
      );
      increment(aggregate.outcomes, `authoring-orientation:${authoringOrientationAnswer.outcome}`);
      observeAuthoringOrientationPressure(aggregate, authoringOrientationAnswer.value, fixtureLane);

      const stateStoreRows = await measure(timings, 'query-state-stores', () =>
        pagedRows(app, SemanticAppQueryKind.StateStores),
      );
      increment(aggregate.outcomes, `state-stores:${stateStoreRows.outcome}`);
      increment(aggregate.pageCounts, 'state-stores', stateStoreRows.pages);
      for (const row of stateStoreRows.rows) {
        increment(aggregate.stateStoreDefaultness, row.isDefault ? 'default' : 'named');
        increment(aggregate.stateStoreInitialStateKinds, row.initialStateKind ?? 'none');
        increment(aggregate.stateStoreOptionsOrHandlerKinds, row.optionsOrHandlerKind);
        increment(aggregate.stateStoreActionHandlerCounts, cardinalityBucket(row.actionHandlerCount));
      }

      const i18nTranslationKeyRows = await measure(timings, 'query-i18n-translation-keys', () =>
        pagedRows(app, SemanticAppQueryKind.I18nTranslationKeys),
      );
      increment(aggregate.outcomes, `i18n-translation-keys:${i18nTranslationKeyRows.outcome}`);
      increment(aggregate.pageCounts, 'i18n-translation-keys', i18nTranslationKeyRows.pages);
      for (const row of i18nTranslationKeyRows.rows) {
        increment(aggregate.i18nTranslationKeyLocaleStates, row.locale == null ? 'none' : 'present');
        increment(aggregate.i18nTranslationKeyNamespaceStates, row.namespace == null ? 'none' : 'present');
        increment(aggregate.i18nTranslationKeySourceCoverage, row.source == null ? 'none' : 'source');
        increment(aggregate.i18nTranslationKeySourceKinds, row.source?.kind ?? 'unknown');
        increment(aggregate.i18nTranslationKeySegmentCounts, cardinalityBucket(String(row.key ?? '').split('.').filter(Boolean).length));
      }

      const i18nTranslationBindingRows = await measure(timings, 'query-i18n-translation-bindings', () =>
        pagedRows(app, SemanticAppQueryKind.I18nTranslationBindings),
      );
      increment(aggregate.outcomes, `i18n-translation-bindings:${i18nTranslationBindingRows.outcome}`);
      increment(aggregate.pageCounts, 'i18n-translation-bindings', i18nTranslationBindingRows.pages);
      for (const row of i18nTranslationBindingRows.rows) {
        increment(aggregate.i18nTranslationBindingKeyExpressionKinds, row.keyExpressionKind ?? 'unknown');
        for (const targetProperty of row.targetProperties ?? []) {
          increment(aggregate.i18nTranslationBindingTargetProperties, targetProperty);
        }
        for (const targetKind of row.targetKinds ?? []) {
          increment(aggregate.i18nTranslationBindingTargetKinds, targetKind);
        }
        increment(aggregate.i18nTranslationBindingParameterPresence, String(row.hasParameterBinding));
        increment(aggregate.i18nTranslationBindingIssueCounts, cardinalityBucket(row.issueCount ?? 0));
        increment(aggregate.i18nTranslationBindingFrameworkErrorCodePresence, row.frameworkErrorCodes?.length > 0 ? 'present' : 'none');
      }

      const resourceRows = await measure(timings, 'query-resources', () =>
        pagedRows(app, SemanticAppQueryKind.ResourceDefinitions),
      );
      increment(aggregate.outcomes, `resources:${resourceRows.outcome}`);
      increment(aggregate.pageCounts, 'resources', resourceRows.pages);
      for (const row of resourceRows.rows) {
        increment(aggregate.resourceKinds, row.resourceKind);
        for (const mode of row.declarationModes ?? []) {
          increment(aggregate.resourceDeclarationModes, mode);
        }
        const bindables = row.bindables ?? [];
        aggregate.bindables += bindables.length;
        for (const bindable of bindables) {
          increment(aggregate.bindableModes, bindable.mode);
          increment(aggregate.setterKinds, bindable.setterKind);
          increment(aggregate.bindableValueTypeShapes, bindable.valueTypeShapeKind ?? 'none');
          increment(aggregate.bindableEffectiveValueTypeShapes, bindable.effectiveValueTypeShapeKind ?? 'none');
          increment(aggregate.bindableValueTypeWeak, String(bindable.valueTypeIsWeak));
          increment(aggregate.bindableValueTypeCallSignatures, String(bindable.valueTypeHasCallSignature));
          increment(aggregate.bindableValueTypeMembers, String(bindable.valueTypeHasMembers));
        }
        const watches = row.watches ?? [];
        aggregate.watches += watches.length;
        for (const watch of watches) {
          increment(aggregate.watchExpressionKinds, watch.expressionKind);
          increment(aggregate.watchExpressionPropertyKeyKinds, watch.expressionPropertyKeyKind ?? 'none');
          increment(aggregate.watchCallbackKinds, watch.callbackKind);
          increment(aggregate.watchCallbackPropertyKeyKinds, watch.callbackPropertyKeyKind ?? 'none');
          increment(aggregate.watchFlushModes, watch.flush);
        }
      }

      const resourceIssueRows = await measure(timings, 'query-resource-issues', () =>
        pagedRows(app, SemanticAppQueryKind.ResourceIssues),
      );
      increment(aggregate.outcomes, `resource-issues:${resourceIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'resource-issues', resourceIssueRows.pages);
      aggregate.resourceIssues += resourceIssueRows.rows.length;
      for (const row of resourceIssueRows.rows) {
        increment(aggregate.resourceIssueKinds, row.issueKind);
        increment(aggregate.resourceIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
      }

      const configurationIssueRows = await measure(timings, 'query-configuration-issues', () =>
        pagedRows(app, SemanticAppQueryKind.ConfigurationIssues),
      );
      increment(aggregate.outcomes, `configuration-issues:${configurationIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'configuration-issues', configurationIssueRows.pages);
      aggregate.configurationIssues += configurationIssueRows.rows.length;
      for (const row of configurationIssueRows.rows) {
        increment(aggregate.configurationIssueKinds, row.issueKind);
        increment(aggregate.configurationIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
      }

      const evaluationIssueRows = await measure(timings, 'query-evaluation-issues', () =>
        pagedRows(app, SemanticAppQueryKind.EvaluationIssues),
      );
      increment(aggregate.outcomes, `evaluation-issues:${evaluationIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'evaluation-issues', evaluationIssueRows.pages);
      for (const row of evaluationIssueRows.rows) {
        increment(aggregate.evaluationIssueKinds, row.issueKind);
        increment(aggregate.evaluationIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
        increment(aggregate.evaluationIssueSubjectKinds, row.subjectKind);
        increment(aggregate.evaluationIssueActualValueKinds, row.actualValueKind ?? 'none');
      }

      const diIssueRows = await measure(timings, 'query-di-issues', () =>
        pagedRows(app, SemanticAppQueryKind.DiIssues),
      );
      increment(aggregate.outcomes, `di-issues:${diIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'di-issues', diIssueRows.pages);
      for (const row of diIssueRows.rows) {
        increment(aggregate.diIssueKinds, row.issueKind);
        increment(aggregate.diIssueSubjectKinds, row.subjectKind ?? 'unknown');
        increment(aggregate.diIssueSeverities, row.severity);
        increment(aggregate.diIssueResolveExecutionContexts, row.resolveCall?.executionContextKind ?? 'none');
        increment(aggregate.diIssueActiveContainerExpectations, row.resolveCall?.activeContainerExpectation ?? 'none');
        increment(aggregate.diIssueResolveNullishKeyArgumentCounts, cardinalityBucket(row.resolveCall?.nullishKeyArguments?.length ?? 0));
        for (const argument of row.resolveCall?.nullishKeyArguments ?? []) {
          increment(aggregate.diIssueResolveNullishKeyArgumentKinds, argument.kind ?? 'unknown');
        }
        increment(aggregate.diIssueInjectDecoratorTargetKinds, row.injectDecorator?.targetKind ?? 'none');
        increment(aggregate.diIssueInjectDecoratorNames, row.injectDecorator?.decoratorName ?? 'none');
        increment(aggregate.diIssueContainerApiMethods, row.containerApiCall?.methodKind ?? 'none');
        increment(aggregate.diIssueContainerApiKeyKinds, row.containerApiCall?.keyKind ?? 'none');
        increment(aggregate.diIssueContainerApiKeyIdentities, row.containerApiCall?.keyIdentityKind ?? 'none');
        increment(aggregate.diIssueContainerApiAutoRegister, row.containerApiCall?.autoRegister == null ? 'none' : String(row.containerApiCall.autoRegister));
        increment(aggregate.diIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
      }

      const observationIssueRows = await measure(timings, 'query-observation-issues', () =>
        pagedRows(app, SemanticAppQueryKind.ObservationIssues),
      );
      increment(aggregate.outcomes, `observation-issues:${observationIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'observation-issues', observationIssueRows.pages);
      aggregate.observationIssues += observationIssueRows.rows.length;
      for (const row of observationIssueRows.rows) {
        increment(aggregate.observationIssueKinds, row.issueKind);
        increment(aggregate.observationIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
      }

      const validationIssueRows = await measure(timings, 'query-validation-issues', () =>
        pagedRows(app, SemanticAppQueryKind.ValidationIssues),
      );
      increment(aggregate.outcomes, `validation-issues:${validationIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'validation-issues', validationIssueRows.pages);
      aggregate.validationIssues += validationIssueRows.rows.length;
      for (const row of validationIssueRows.rows) {
        increment(aggregate.validationIssueKinds, row.issueKind);
        increment(aggregate.validationIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
      }

      const fetchClientIssueRows = await measure(timings, 'query-fetch-client-issues', () =>
        pagedRows(app, SemanticAppQueryKind.FetchClientIssues),
      );
      increment(aggregate.outcomes, `fetch-client-issues:${fetchClientIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'fetch-client-issues', fetchClientIssueRows.pages);
      aggregate.fetchClientIssues += fetchClientIssueRows.rows.length;
      for (const row of fetchClientIssueRows.rows) {
        increment(aggregate.fetchClientIssueKinds, row.issueKind);
        increment(aggregate.fetchClientIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
      }

      const dialogIssueRows = await measure(timings, 'query-dialog-issues', () =>
        pagedRows(app, SemanticAppQueryKind.DialogIssues),
      );
      increment(aggregate.outcomes, `dialog-issues:${dialogIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'dialog-issues', dialogIssueRows.pages);
      aggregate.dialogIssues += dialogIssueRows.rows.length;
      for (const row of dialogIssueRows.rows) {
        increment(aggregate.dialogIssueKinds, row.issueKind);
        increment(aggregate.dialogIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
      }

      const templateDiagnosticRows = await measure(timings, 'query-template-diagnostics', () =>
        pagedRows(app, SemanticAppQueryKind.TemplateDiagnostics),
      );
      increment(aggregate.outcomes, `template-diagnostics:${templateDiagnosticRows.outcome}`);
      increment(aggregate.pageCounts, 'template-diagnostics', templateDiagnosticRows.pages);
      aggregate.templateDiagnostics += templateDiagnosticRows.rows.length;
      for (const row of templateDiagnosticRows.rows) {
        increment(aggregate.templateDiagnosticSeverities, row.severity);
        increment(aggregate.templateDiagnosticAuthorities, row.diagnosticAuthority ?? 'unknown');
        increment(aggregate.templateDiagnosticKinds, row.diagnosticKind);
        increment(aggregate.templateDiagnosticFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
        if (row.frameworkErrorCode != null) {
          increment(aggregate.templateDiagnosticFrameworkErrorCodeFixtureKeys, `${fixtureKey}:${row.frameworkErrorCode}`);
        }
        for (const missingInput of diagnosticMissingInputs(row)) {
          increment(aggregate.templateDiagnosticMissingInputs, missingInput);
          increment(aggregate.templateDiagnosticMissingInputFixtureKeys, `${fixtureKey}:${missingInput}`);
        }
        increment(aggregate.templateDiagnosticSuggestions, row.suggestion?.suggestionKind ?? 'none');
        increment(aggregate.templateDiagnosticSuggestionActions, row.suggestion?.actionKind ?? 'none');
        increment(aggregate.templateDiagnosticSuggestionTargets, suggestionTargetKey(row.suggestion));
        increment(aggregate.templateDiagnosticOwnerOrigins, row.ownerTypeOrigin ?? 'none');
        increment(aggregate.templateDiagnosticSiteKinds, row.siteKind);
        increment(aggregate.templateDiagnosticValueSiteKinds, row.valueSiteKind ?? 'none');
      }

      const appDiagnosticRows = await measure(timings, 'query-app-diagnostics', () =>
        pagedRows(app, SemanticAppQueryKind.AppDiagnostics),
      );
      increment(aggregate.outcomes, `app-diagnostics:${appDiagnosticRows.outcome}`);
      increment(aggregate.pageCounts, 'app-diagnostics', appDiagnosticRows.pages);
      aggregate.appDiagnostics += appDiagnosticRows.rows.length;
      for (const row of appDiagnosticRows.rows) {
        increment(aggregate.appDiagnosticDomains, row.diagnosticDomain);
        increment(aggregate.appDiagnosticAuthorities, row.diagnosticAuthority);
        increment(aggregate.appDiagnosticKinds, row.diagnosticKind);
        increment(aggregate.appDiagnosticFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
        if (row.frameworkErrorCode != null) {
          increment(aggregate.appDiagnosticFrameworkErrorCodeFixtureKeys, `${fixtureKey}:${row.frameworkErrorCode}`);
        }
      }

      const routerOptionsRows = await measure(timings, 'query-router-options', () =>
        pagedRows(app, SemanticAppQueryKind.RouterOptions),
      );
      increment(aggregate.outcomes, `router-options:${routerOptionsRows.outcome}`);
      increment(aggregate.pageCounts, 'router-options', routerOptionsRows.pages);
      for (const row of routerOptionsRows.rows) {
        increment(aggregate.routerOptionsUseHref, String(row.useHref));
        increment(aggregate.routerOptionsUseUrlFragmentHash, String(row.useUrlFragmentHash));
        increment(aggregate.routerOptionsUseEagerLoading, String(row.useEagerLoading));
      }

      const routeRows = await measure(timings, 'query-routes', () =>
        pagedRows(app, SemanticAppQueryKind.Routes),
      );
      increment(aggregate.outcomes, `routes:${routeRows.outcome}`);
      increment(aggregate.pageCounts, 'routes', routeRows.pages);
      for (const row of routeRows.rows) {
        increment(aggregate.routeKinds, row.routeKind);
        increment(aggregate.routeOriginKinds, row.originKind ?? 'unknown');
        increment(aggregate.routeValueKinds, row.valueKind ?? 'unknown');
        increment(aggregate.routeViewportPresence, row.viewport == null ? 'none' : 'present');
        if (row.component != null) {
          increment(aggregate.routeComponentKinds, row.component.componentKind);
          increment(aggregate.routeComponentResolution, row.component.resolved ? 'resolved' : 'unresolved');
        }
        increment(aggregate.routeChildCardinality, cardinalityBucket(row.childRouteCount));
      }

      const routeContextRows = await measure(timings, 'query-route-contexts', () =>
        pagedRows(app, SemanticAppQueryKind.RouteContexts),
      );
      increment(aggregate.outcomes, `route-contexts:${routeContextRows.outcome}`);
      increment(aggregate.pageCounts, 'route-contexts', routeContextRows.pages);
      for (const row of routeContextRows.rows) {
        increment(aggregate.routeContextContainers, String(row.hasContainer));
        increment(aggregate.routeContextViewportAgents, String(row.hasViewportAgent));
      }

      const routerViewportRows = await measure(timings, 'query-router-viewports', () =>
        pagedRows(app, SemanticAppQueryKind.RouterViewports),
      );
      increment(aggregate.outcomes, `router-viewports:${routerViewportRows.outcome}`);
      increment(aggregate.pageCounts, 'router-viewports', routerViewportRows.pages);
      for (const row of routerViewportRows.rows) {
        increment(aggregate.routerViewportUsedByCount, cardinalityBucket(row.usedBy.length));
      }

      const viewportAgentRows = await measure(timings, 'query-viewport-agents', () =>
        pagedRows(app, SemanticAppQueryKind.ViewportAgents),
      );
      increment(aggregate.outcomes, `viewport-agents:${viewportAgentRows.outcome}`);
      increment(aggregate.pageCounts, 'viewport-agents', viewportAgentRows.pages);
      for (const row of viewportAgentRows.rows) {
        increment(aggregate.viewportAgentHostControllers, String(row.hasHostController));
      }

      const componentAgentRows = await measure(timings, 'query-component-agents', () =>
        pagedRows(app, SemanticAppQueryKind.ComponentAgents),
      );
      increment(aggregate.outcomes, `component-agents:${componentAgentRows.outcome}`);
      increment(aggregate.pageCounts, 'component-agents', componentAgentRows.pages);
      for (const row of componentAgentRows.rows) {
        increment(aggregate.componentAgentControllers, String(row.hasController));
        increment(aggregate.componentAgentViewportAgents, row.viewportAgent == null ? 'none' : row.viewportAgent.routerKind);
        increment(aggregate.componentAgentComponentKinds, row.component?.componentKind ?? 'none');
        increment(aggregate.componentAgentComponentResolution, row.component == null ? 'none' : row.component.resolved ? 'resolved' : 'unresolved');
      }

      const runtimeControllerRows = await measure(timings, 'query-runtime-controllers', () =>
        pagedRows(app, SemanticAppQueryKind.RuntimeControllers),
      );
      increment(aggregate.outcomes, `runtime-controllers:${runtimeControllerRows.outcome}`);
      increment(aggregate.pageCounts, 'runtime-controllers', runtimeControllerRows.pages);
      for (const row of runtimeControllerRows.rows) {
        increment(aggregate.runtimeControllerCreationKinds, row.creationKind);
        increment(aggregate.runtimeControllerReadiness, row.controllerReadiness);
        increment(aggregate.runtimeControllerHydrationHandoff, row.hydrationHandoffKind);
        increment(aggregate.runtimeControllerChildViewRenderingState, row.childViewRenderingState);
      }

      const runtimeCompositionRows = await measure(timings, 'query-runtime-compositions', () =>
        pagedRows(app, SemanticAppQueryKind.RuntimeCompositions),
      );
      increment(aggregate.outcomes, `runtime-compositions:${runtimeCompositionRows.outcome}`);
      increment(aggregate.pageCounts, 'runtime-compositions', runtimeCompositionRows.pages);
      aggregate.runtimeCompositions += runtimeCompositionRows.rows.length;
      for (const row of runtimeCompositionRows.rows) {
        aggregate.runtimeCompositionResolvedComponents += row.resolvedComponentCount ?? 0;
        aggregate.runtimeCompositionCompiledTemplates += row.compiledTemplateCount ?? 0;
        aggregate.runtimeCompositionCandidateResourceAnalyses += row.candidateResourceAnalysisCount ?? 0;
        aggregate.runtimeCompositionCandidateResourceControllers += row.candidateResourceControllerCount ?? 0;
        aggregate.runtimeCompositionComposedChildControllers += row.composedChildControllerCount ?? 0;
        increment(aggregate.runtimeCompositionComponentResolutionKinds, row.componentResolutionKind);
        increment(aggregate.runtimeCompositionModelResolutionKinds, row.modelResolutionKind);
        increment(aggregate.runtimeCompositionScopeBehavior, row.scopeBehavior ?? 'dynamic-or-open');
        increment(aggregate.runtimeCompositionFlushMode, row.flushMode ?? 'dynamic-or-open');
        increment(aggregate.runtimeCompositionTag, row.tag ?? 'none');
        increment(aggregate.runtimeCompositionComponentInput, row.hasComponentInput ? 'present' : 'absent');
        increment(aggregate.runtimeCompositionTemplateInput, row.hasTemplateInput ? 'present' : 'absent');
        increment(aggregate.runtimeCompositionComponentInputFulfillmentKinds, row.componentInputFulfillmentKind ?? 'unknown');
        increment(aggregate.runtimeCompositionTemplateInputFulfillmentKinds, row.templateInputFulfillmentKind ?? 'unknown');
        increment(aggregate.runtimeCompositionModelInputFulfillmentKinds, row.modelInputFulfillmentKind ?? 'unknown');
        increment(aggregate.runtimeCompositionStaticComponentName, row.staticComponentName == null ? 'absent' : 'present');
        increment(aggregate.runtimeCompositionTemplateBinding, row.hasTemplateBinding ? 'present' : 'absent');
        increment(aggregate.runtimeCompositionCompositionBinding, row.hasCompositionBinding ? 'present' : 'absent');
        increment(aggregate.runtimeCompositionComposingBinding, row.hasComposingBinding ? 'present' : 'absent');
        increment(aggregate.runtimeCompositionCandidateCounts, cardinalityBucket(row.resolvedComponentCount ?? 0));
        increment(aggregate.runtimeCompositionCompiledTemplateCounts, cardinalityBucket(row.compiledTemplateCount ?? 0));
        increment(aggregate.runtimeCompositionCandidateResourceAnalysisStates, row.candidateResourceAnalysisState ?? 'unknown');
        increment(aggregate.runtimeCompositionCandidateResourceAnalysisCounts, cardinalityBucket(row.candidateResourceAnalysisCount ?? 0));
        increment(aggregate.runtimeCompositionCandidateResourceControllerCounts, cardinalityBucket(row.candidateResourceControllerCount ?? 0));
        for (const creationKind of row.candidateResourceControllerCreationKinds ?? []) {
          increment(aggregate.runtimeCompositionCandidateResourceControllerCreationKinds, creationKind);
        }
        increment(aggregate.runtimeCompositionComposedChildControllerCounts, cardinalityBucket(row.composedChildControllerCount ?? 0));
        for (const creationKind of row.composedChildControllerCreationKinds ?? []) {
          increment(aggregate.runtimeCompositionComposedChildControllerCreationKinds, creationKind);
        }
        for (const handoffKind of row.activationHandoffKinds ?? []) {
          increment(aggregate.runtimeCompositionActivationHandoffKinds, handoffKind);
        }
        for (const parameterType of row.activationParameterTypes ?? []) {
          increment(aggregate.runtimeCompositionActivationParameterTypes, parameterType);
        }
        aggregate.runtimeCompositionModelAssignableHandoffs += row.modelAssignableToActivationParameterCount ?? 0;
        aggregate.runtimeCompositionModelUnassignableHandoffs += row.modelUnassignableToActivationParameterCount ?? 0;
        aggregate.runtimeCompositionOpenHandoffs += row.activationOpenReasonCount ?? 0;
        increment(
          aggregate.runtimeCompositionActivationAssignability,
          `assignable:${row.modelAssignableToActivationParameterCount ?? 0}`,
        );
        increment(
          aggregate.runtimeCompositionActivationAssignability,
          `unassignable:${row.modelUnassignableToActivationParameterCount ?? 0}`,
        );
        increment(
          aggregate.runtimeCompositionActivationAssignability,
          `open:${row.activationOpenReasonCount ?? 0}`,
        );
        increment(aggregate.runtimeCompositionSourceCoverage, sourceReferenceState(row.source));
        if (row.openReason != null) {
          aggregate.openRuntimeCompositions += 1;
          increment(aggregate.runtimeCompositionOpenReasons, row.openReason);
        }
        for (const reasonKind of row.reasonKinds ?? []) {
          increment(aggregate.runtimeCompositionOpenReasonKinds, reasonKind);
        }
      }

      const routeTreeRows = await measure(timings, 'query-route-trees', () =>
        pagedRows(app, SemanticAppQueryKind.RouteTrees),
      );
      increment(aggregate.outcomes, `route-trees:${routeTreeRows.outcome}`);
      increment(aggregate.pageCounts, 'route-trees', routeTreeRows.pages);
      for (const row of routeTreeRows.rows) {
        increment(aggregate.routeTreeOptions, String(row.hasOptions));
        increment(aggregate.routeTreeInstructionTree, row.instructionTree == null ? 'none' : row.instructionTree.routerKind);
        increment(aggregate.routeTreeNodeCount, cardinalityBucket(row.nodeCount));
      }

      const routeNodeRows = await measure(timings, 'query-route-nodes', () =>
        pagedRows(app, SemanticAppQueryKind.RouteNodes),
      );
      increment(aggregate.outcomes, `route-nodes:${routeNodeRows.outcome}`);
      increment(aggregate.pageCounts, 'route-nodes', routeNodeRows.pages);
      for (const row of routeNodeRows.rows) {
        increment(aggregate.routeNodeChildren, cardinalityBucket(row.childCount));
        increment(aggregate.routeNodeInstruction, row.instruction == null ? 'none' : row.instruction.routerKind);
        increment(aggregate.routeNodeRecognizedRoute, row.recognizedRoute == null ? 'none' : row.recognizedRoute.recognizerKind);
        increment(aggregate.routeNodeParameters, cardinalityBucket(row.parameterCount));
        increment(aggregate.routeNodeQueryParams, cardinalityBucket(row.queryParamCount));
        increment(aggregate.routeNodeFragment, row.fragment == null ? 'none' : 'present');
        increment(aggregate.routeNodeViewport, row.viewport == null ? 'none' : 'present');
        increment(aggregate.routeNodeResidue, cardinalityBucket(row.residueInstructionCount));
      }

      const routePatternRows = await measure(timings, 'query-route-patterns', () =>
        pagedRows(app, SemanticAppQueryKind.RoutePatterns),
      );
      increment(aggregate.outcomes, `route-patterns:${routePatternRows.outcome}`);
      increment(aggregate.pageCounts, 'route-patterns', routePatternRows.pages);
      for (const row of routePatternRows.rows) {
        increment(aggregate.routePatternSegments, cardinalityBucket(row.segmentCount));
        increment(aggregate.routePatternParameters, cardinalityBucket(row.parameterCount));
        for (const segment of row.segments ?? []) {
          increment(aggregate.routePatternSegmentKinds, segment.segmentKind);
        }
        for (const parameter of row.parameters ?? []) {
          increment(aggregate.routePatternParameterKinds, parameter.isStar ? 'star' : parameter.isOptional ? 'optional' : 'required');
        }
      }

      const routeEndpointRows = await measure(timings, 'query-route-endpoints', () =>
        pagedRows(app, SemanticAppQueryKind.RouteEndpoints),
      );
      increment(aggregate.outcomes, `route-endpoints:${routeEndpointRows.outcome}`);
      increment(aggregate.pageCounts, 'route-endpoints', routeEndpointRows.pages);
      for (const row of routeEndpointRows.rows) {
        increment(aggregate.routeEndpointResiduals, row.isResidual ? 'residual' : 'primary');
        increment(aggregate.routeEndpointParameters, cardinalityBucket(row.parameterCount));
        for (const parameter of row.parameters ?? []) {
          increment(aggregate.routeEndpointParameterKinds, parameter.isStar ? 'star' : parameter.isOptional ? 'optional' : 'required');
        }
      }

      const routeRecognizerStateRows = await measure(timings, 'query-route-recognizer-states', () =>
        pagedRows(app, SemanticAppQueryKind.RouteRecognizerStates),
      );
      increment(aggregate.outcomes, `route-recognizer-states:${routeRecognizerStateRows.outcome}`);
      increment(aggregate.pageCounts, 'route-recognizer-states', routeRecognizerStateRows.pages);
      for (const row of routeRecognizerStateRows.rows) {
        increment(aggregate.routeRecognizerStateKinds, row.stateKind);
        increment(aggregate.routeRecognizerStateNextCounts, cardinalityBucket(row.nextCount));
        increment(aggregate.routeRecognizerStateEndpoints, row.endpoint == null ? 'none' : row.endpoint.isResidual ? 'residual' : 'primary');
        increment(aggregate.routeRecognizerStateDynamic, String(row.isDynamic));
        increment(aggregate.routeRecognizerStateConstrained, String(row.isConstrained));
      }

      const routeRecognizerIssueRows = await measure(timings, 'query-route-recognizer-issues', () =>
        pagedRows(app, SemanticAppQueryKind.RouteRecognizerIssues),
      );
      increment(aggregate.outcomes, `route-recognizer-issues:${routeRecognizerIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'route-recognizer-issues', routeRecognizerIssueRows.pages);
      for (const row of routeRecognizerIssueRows.rows) {
        increment(aggregate.routeRecognizerIssueKinds, row.issueKind);
      }

      const routerIssueRows = await measure(timings, 'query-router-issues', () =>
        pagedRows(app, SemanticAppQueryKind.RouterIssues),
      );
      increment(aggregate.outcomes, `router-issues:${routerIssueRows.outcome}`);
      increment(aggregate.pageCounts, 'router-issues', routerIssueRows.pages);
      for (const row of routerIssueRows.rows) {
        increment(aggregate.routerIssueKinds, row.issueKind);
        increment(aggregate.routerIssueFrameworkErrorCodes, row.frameworkErrorCode ?? 'none');
        if (row.frameworkErrorCode != null) {
          increment(aggregate.routerIssueFrameworkErrorCodeFixtureKeys, `${fixtureKey}:${row.frameworkErrorCode}`);
        }
      }

      const recognizedRouteRows = await measure(timings, 'query-recognized-routes', () =>
        pagedRows(app, SemanticAppQueryKind.RecognizedRoutes),
      );
      increment(aggregate.outcomes, `recognized-routes:${recognizedRouteRows.outcome}`);
      increment(aggregate.pageCounts, 'recognized-routes', recognizedRouteRows.pages);
      for (const row of recognizedRouteRows.rows) {
        increment(aggregate.recognizedRouteResidue, row.hasResidue ? 'present' : 'none');
        increment(aggregate.recognizedRouteParameters, cardinalityBucket(row.parameterCount));
        increment(aggregate.recognizedRouteRedirectDepth, cardinalityBucket(row.redirectDepth));
        increment(aggregate.recognizedRouteEndpointResiduals, row.endpoint.isResidual == null ? 'unknown' : row.endpoint.isResidual ? 'residual' : 'primary');
        increment(aggregate.recognizedRouteRouteContext, row.routeContext == null ? 'none' : 'present');
      }

      const typedNavigationInstructionRows = await measure(timings, 'query-typed-navigation-instructions', () =>
        pagedRows(app, SemanticAppQueryKind.TypedNavigationInstructions),
      );
      increment(aggregate.outcomes, `typed-navigation-instructions:${typedNavigationInstructionRows.outcome}`);
      increment(aggregate.pageCounts, 'typed-navigation-instructions', typedNavigationInstructionRows.pages);
      for (const row of typedNavigationInstructionRows.rows) {
        increment(aggregate.typedNavigationInstructionKinds, row.instructionKind);
        increment(aggregate.typedNavigationInstructionComponents, row.component == null ? 'none' : row.component.routerKind);
      }

      const viewportInstructionRows = await measure(timings, 'query-viewport-instructions', () =>
        pagedRows(app, SemanticAppQueryKind.ViewportInstructions),
      );
      increment(aggregate.outcomes, `viewport-instructions:${viewportInstructionRows.outcome}`);
      increment(aggregate.pageCounts, 'viewport-instructions', viewportInstructionRows.pages);
      for (const row of viewportInstructionRows.rows) {
        increment(aggregate.viewportInstructionComponentKinds, row.component?.routerKind ?? 'none');
        increment(aggregate.viewportInstructionTypedKinds, row.component?.instructionKind ?? 'none');
        increment(aggregate.viewportInstructionChildren, cardinalityBucket(row.childCount));
        increment(aggregate.viewportInstructionParameters, String(row.hasParameters));
        increment(aggregate.viewportInstructionParameterCount, cardinalityBucket(row.parameterCount));
        increment(aggregate.viewportInstructionOpen, cardinalityBucket(row.open));
        increment(aggregate.viewportInstructionClose, cardinalityBucket(row.close));
        increment(aggregate.viewportInstructionRecognizedRoute, row.recognizedRoute == null ? 'none' : row.recognizedRoute.recognizerKind);
      }

      const viewportInstructionTreeRows = await measure(timings, 'query-viewport-instruction-trees', () =>
        pagedRows(app, SemanticAppQueryKind.ViewportInstructionTrees),
      );
      increment(aggregate.outcomes, `viewport-instruction-trees:${viewportInstructionTreeRows.outcome}`);
      increment(aggregate.pageCounts, 'viewport-instruction-trees', viewportInstructionTreeRows.pages);
      for (const row of viewportInstructionTreeRows.rows) {
        increment(aggregate.viewportInstructionTreeRouteContext, row.routeContext == null ? 'none' : 'present');
        increment(aggregate.viewportInstructionTreeInstructions, cardinalityBucket(row.instructionCount));
        increment(aggregate.viewportInstructionTreeOptions, String(row.hasOptions));
        increment(aggregate.viewportInstructionTreeAbsolute, String(row.isAbsolute));
        increment(aggregate.viewportInstructionTreeQueryParams, cardinalityBucket(row.queryParamCount));
        increment(aggregate.viewportInstructionTreeFragment, row.fragment == null ? 'none' : 'present');
      }

      if (analysisDepth === 'binding-observation') {
        const targetAccessRows = await measure(timings, 'query-binding-target-accesses', () =>
          pagedRows(app, SemanticAppQueryKind.BindingTargetAccesses),
        );
        increment(aggregate.outcomes, `binding-target-accesses:${targetAccessRows.outcome}`);
        increment(aggregate.pageCounts, 'binding-target-accesses', targetAccessRows.pages);
        aggregate.bindingTargetAccesses += targetAccessRows.rows.length;
        for (const row of targetAccessRows.rows) {
          const targetTypeSurface = typeSurfaceKey(row.targetType);
          const propertyTypeSurface = typeSurfaceKey(row.propertyType);
          increment(aggregate.bindingTargetAccessLookups, row.lookup);
          increment(aggregate.bindingTargetAccessTargetKinds, row.targetKind);
          increment(aggregate.bindingTargetAccessStrategies, row.strategy);
          increment(aggregate.bindingTargetAccessAuthorities, row.authority);
          increment(aggregate.bindingTargetAccessTargetTypeSources, row.targetTypeSource ?? 'none');
          increment(aggregate.bindingTargetAccessTargetTypeSurfaces, targetTypeSurface);
          increment(aggregate.bindingTargetAccessPropertyTypeSurfaces, propertyTypeSurface);
          increment(aggregate.bindingTargetAccessTypeSurfaceClasses, `${row.targetKind}:${row.strategy}:${targetTypeSurface}->${propertyTypeSurface}`);
          increment(aggregate.bindingTargetAccessTypeSourceSurfaceClasses, `${row.targetKind}:${row.strategy}:${row.targetTypeSource ?? 'none'}:${targetTypeSurface}->${propertyTypeSurface}`);
          if (row.frameworkErrorCode != null) {
            increment(aggregate.bindingTargetAccessFrameworkErrorCodes, row.frameworkErrorCode);
            increment(aggregate.bindingTargetAccessFrameworkErrorCodeFixtureKeys, `${fixtureKey}:${row.frameworkErrorCode}`);
          }
          if (row.openReason != null) {
            increment(aggregate.bindingTargetAccessOpenReasons, row.openReason);
          }
        }

        const bindingBehaviorRows = await measure(timings, 'query-binding-behavior-applications', () =>
          pagedRows(app, SemanticAppQueryKind.BindingBehaviorApplications),
        );
        increment(aggregate.outcomes, `binding-behavior-applications:${bindingBehaviorRows.outcome}`);
        increment(aggregate.pageCounts, 'binding-behavior-applications', bindingBehaviorRows.pages);
        aggregate.bindingBehaviorApplications += bindingBehaviorRows.rows.length;
        for (const row of bindingBehaviorRows.rows) {
          increment(aggregate.bindingBehaviorApplicationNames, row.behaviorName);
          increment(aggregate.bindingBehaviorApplicationPhases, row.phase);
          increment(aggregate.bindingBehaviorApplicationBindingKinds, row.bindingKind);
          increment(aggregate.bindingBehaviorApplicationTargetKinds, row.targetKind ?? 'none');
          increment(aggregate.bindingBehaviorApplicationTargetProperties, row.targetProperty ?? 'none');
          increment(aggregate.bindingBehaviorApplicationArgumentCounts, cardinalityBucket(row.argumentCount));
          increment(aggregate.bindingBehaviorApplicationStaticArgumentCounts, cardinalityBucket(row.staticArgumentValues?.length ?? 0));
        }

        const valueChannelRows = await measure(timings, 'query-binding-value-channels', () =>
          pagedRows(app, SemanticAppQueryKind.BindingValueChannels),
        );
        increment(aggregate.outcomes, `binding-value-channels:${valueChannelRows.outcome}`);
        increment(aggregate.pageCounts, 'binding-value-channels', valueChannelRows.pages);
        aggregate.bindingValueChannels += valueChannelRows.rows.length;
        for (const row of valueChannelRows.rows) {
          increment(aggregate.bindingValueChannelKinds, row.channelKind);
          increment(aggregate.bindingValueChannelTargetKinds, row.targetKind ?? 'none');
          increment(aggregate.bindingValueChannelAuthorities, row.authority);
          increment(aggregate.bindingValueChannelMatcherModes, row.usesCustomMatcher === true ? 'custom-matcher' : 'default-matcher');
          increment(aggregate.bindingValueChannelRawTypeSurfaces, typeSurfaceKey(row.rawTargetPropertyType));
          increment(aggregate.bindingValueChannelRuntimeTypeSurfaces, typeSurfaceKey(row.runtimeValueType));
          increment(aggregate.bindingValueChannelDomainCounts, cardinalityBucket(row.valueDomain?.length ?? 0));
          increment(aggregate.bindingValueChannelPrimitiveDomainCounts, cardinalityBucket(row.primitiveValueDomain?.length ?? 0));
          for (const kind of row.primitiveValueDomainKinds ?? []) {
            increment(aggregate.bindingValueChannelPrimitiveDomainKinds, kind);
          }
          if (row.openReason != null) {
            increment(aggregate.bindingValueChannelOpenReasons, row.openReason);
          }
        }

        const dataFlowRows = await measure(timings, 'query-binding-data-flows', () =>
          pagedRows(app, SemanticAppQueryKind.BindingDataFlows),
        );
        increment(aggregate.outcomes, `binding-data-flows:${dataFlowRows.outcome}`);
        increment(aggregate.pageCounts, 'binding-data-flows', dataFlowRows.pages);
        aggregate.bindingDataFlows += dataFlowRows.rows.length;
        for (const row of dataFlowRows.rows) {
          increment(aggregate.bindingDataFlowBindingKinds, row.bindingKind);
          increment(aggregate.bindingDataFlowDirections, row.direction);
          increment(aggregate.bindingDataFlowStrictBindings, strictBindingLabel(row.strictBinding));
          increment(aggregate.bindingDataFlowParseStates, row.expressionParseState ?? 'none');
          increment(aggregate.bindingDataFlowParseResultKinds, row.expressionParseResultKind ?? 'none');
          increment(aggregate.bindingDataFlowValueSiteKinds, row.valueSiteKind ?? 'none');
          increment(aggregate.bindingDataFlowSourceKinds, row.sourceKind);
          increment(aggregate.bindingDataFlowTargetKinds, row.targetKind ?? 'none');
          if (row.sourceTypeOpenKind != null) {
            increment(aggregate.bindingDataFlowSourceTypeOpenKinds, row.sourceTypeOpenKind);
          }
          const sourceTypeSurface = typeSurfaceKey(row.sourceType);
          const targetTypeSurface = typeSurfaceKey(row.targetValueType ?? row.targetPropertyType);
          increment(aggregate.bindingDataFlowSourceTypeSurfaces, sourceTypeSurface);
          increment(aggregate.bindingDataFlowTargetTypeSurfaces, targetTypeSurface);
          increment(
            aggregate.bindingDataFlowValueSiteTypeSurfaces,
            `${row.valueSiteKind ?? 'none'}:${sourceTypeSurface}->${targetTypeSurface}`,
          );
          if (row.sourceAssignmentKind != null) {
            increment(aggregate.bindingDataFlowSourceAssignmentKinds, row.sourceAssignmentKind);
          }
          if (row.frameworkErrorCode != null) {
            increment(aggregate.bindingDataFlowFrameworkErrorCodes, row.frameworkErrorCode);
            increment(aggregate.bindingDataFlowFrameworkErrorCodeFixtureKeys, `${fixtureKey}:${row.frameworkErrorCode}`);
          }
          if (row.sourceAssignmentReason != null) {
            aggregate.bindingDataFlowSourceAssignmentPressures += 1;
            const reasonKeys = row.sourceAssignmentReasonKinds?.length > 0
              ? row.sourceAssignmentReasonKinds.map(sourceAssignmentReasonKindKey)
              : [sourceAssignmentReasonKey(row.sourceAssignmentReason)];
            for (const reasonKey of reasonKeys) {
              increment(aggregate.bindingDataFlowSourceAssignmentReasons, reasonKey);
              increment(aggregate.bindingDataFlowSourceAssignmentReasonFixtureKeys, `${fixtureKey}:${reasonKey}`);
              increment(
                aggregate.bindingDataFlowSourceAssignmentPressureClasses,
                `${row.sourceAssignmentKind ?? 'unknown'}:${reasonKey}`,
              );
              increment(
                aggregate.bindingDataFlowSourceAssignmentBindingKinds,
                `${reasonKey}:${row.bindingKind}`,
              );
              increment(
                aggregate.bindingDataFlowSourceAssignmentSourceKinds,
                `${reasonKey}:${row.sourceKind}`,
              );
              increment(
                aggregate.bindingDataFlowSourceAssignmentValueChannels,
                `${reasonKey}:${row.valueChannelKind ?? 'none'}`,
              );
              increment(
                aggregate.bindingDataFlowSourceAssignmentSourceTypeSurfaces,
                `${reasonKey}:${typeSurfaceKey(row.sourceType)}`,
              );
              increment(
                aggregate.bindingDataFlowSourceAssignmentTargetSourceTypeSurfaces,
                `${reasonKey}:${typeSurfaceKey(row.sourceAssignmentTargetType ?? row.sourceType)}`,
              );
              increment(
                aggregate.bindingDataFlowSourceAssignmentTargetTypeSurfaces,
                `${reasonKey}:${typeSurfaceKey(row.targetValueType ?? row.targetPropertyType)}`,
              );
              increment(
                aggregate.bindingDataFlowSourceAssignmentWriteability,
                `${reasonKey}:${writeabilityKey(row.sourceWritable)}`,
              );
            }
          }
          if (row.openReason != null) {
            aggregate.openBindingDataFlows += 1;
            increment(aggregate.bindingDataFlowOpenReasons, row.openReason);
          }
        }
      } else {
        increment(aggregate.outcomes, 'binding-target-accesses:skipped-by-analysis-depth');
        increment(aggregate.outcomes, 'binding-behavior-applications:skipped-by-analysis-depth');
        increment(aggregate.outcomes, 'binding-value-channels:skipped-by-analysis-depth');
        increment(aggregate.outcomes, 'binding-data-flows:skipped-by-analysis-depth');
      }

      const seamRows = await measure(timings, 'query-open-seams', () =>
        pagedRows(app, SemanticAppQueryKind.OpenSeams),
      );
      increment(aggregate.outcomes, `open-seams:${seamRows.outcome}`);
      increment(aggregate.pageCounts, 'open-seams', seamRows.pages);
      for (const row of seamRows.rows) {
        increment(aggregate.openSeamKinds, row.seamKindKey);
        for (const reasonKind of row.reasonKinds ?? []) {
          increment(aggregate.openSeamReasonKinds, reasonKind);
          increment(aggregate.openSeamReasonFixtureKeys, `${fixtureKey}:${reasonKind}`);
        }
        increment(hasAppRoot ? aggregate.appRootOpenSeamKinds : aggregate.nonAppRootOpenSeamKinds, row.seamKindKey);
        increment(aggregate.openSeamSummaries, openSeamSummaryKey(row));
      }
      observeProjectTiming(timings, performance.now() - appStarted);
    } catch {
      increment(aggregate.outcomes, 'open-app:error');
    }
  }

  return aggregate;
}

function observeAuthoringCatalogPressure(aggregate, catalog) {
  if (catalog == null) {
    return;
  }
  const operationFamilies = catalog.operationFamilies ?? [];
  const tasteAxes = catalog.tasteAxes ?? [];
  const tasteValues = catalog.tasteValues ?? [];
  const profiles = catalog.profiles ?? [];
  const capabilities = catalog.capabilities ?? [];
  const operations = catalog.operations ?? [];
  const recipes = catalog.recipes ?? [];
  aggregate.authoringCatalogOperationFamilies += operationFamilies.length;
  aggregate.authoringCatalogTasteAxes += tasteAxes.length;
  aggregate.authoringCatalogTasteValues += tasteValues.length;
  aggregate.authoringCatalogProfiles += profiles.length;
  aggregate.authoringCatalogCapabilities += capabilities.length;
  aggregate.authoringCatalogOperations += operations.length;
  aggregate.authoringCatalogRecipes += recipes.length;
  for (const axis of tasteAxes) {
    increment(aggregate.authoringCatalogTasteAxisLayers, axis.layer ?? 'unknown');
    increment(
      aggregate.authoringCatalogTasteAxisPrimitivePolicyValueCounts,
      cardinalityBucket(axis.primitivePolicyValueKeys?.length ?? 0),
    );
    increment(
      aggregate.authoringCatalogTasteAxisObservedShapeValueCounts,
      cardinalityBucket(axis.observedShapeValueKeys?.length ?? 0),
    );
    increment(
      aggregate.authoringCatalogTasteAxisDerivedReadingValueCounts,
      cardinalityBucket(axis.derivedReadingValueKeys?.length ?? 0),
    );
    for (const layerCount of axis.valueLayerCounts ?? []) {
      increment(
        aggregate.authoringCatalogTasteAxisValueLayers,
        `${axis.axisKey ?? 'unknown'}:${layerCount.layer ?? 'unknown'}`,
        layerCount.count ?? 0,
      );
    }
  }
  for (const value of tasteValues) {
    increment(aggregate.authoringCatalogTasteValueLayers, value.layer ?? 'unknown');
  }
  for (const profile of profiles) {
    const preferences = profile.preferences ?? [];
    increment(aggregate.authoringCatalogProfilePreferenceCounts, cardinalityBucket(preferences.length));
    for (const preference of preferences) {
      increment(aggregate.authoringCatalogProfilePreferenceAxes, preference.axisKey ?? 'unknown');
      increment(aggregate.authoringCatalogProfilePreferenceValues, `${preference.axisKey ?? 'unknown'}:${preference.valueKey ?? 'unknown'}`);
      increment(aggregate.authoringCatalogProfilePreferenceLayers, preference.valueLayer ?? 'unknown');
    }
  }
  for (const capability of capabilities) {
    for (const reasonKind of capability.productOpenReasonKinds ?? []) {
      increment(aggregate.authoringCatalogCapabilityProductOpenReasons, reasonKind);
    }
  }
  for (const operation of operations) {
    increment(aggregate.authoringCatalogOperationFamiliesByKey, operation.familyKey ?? 'unknown');
    increment(aggregate.authoringCatalogOperationActions, operation.action ?? 'unknown');
    increment(aggregate.authoringCatalogOperationTargetKinds, operation.targetKind ?? 'unknown');
    increment(
      aggregate.authoringCatalogOperationCapabilityCounts,
      cardinalityBucket(operation.requiredCapabilityKeys?.length ?? 0),
    );
    for (const reasonKind of operation.productOpenReasonKinds ?? []) {
      increment(aggregate.authoringCatalogOperationProductOpenReasons, reasonKind);
    }
  }
  for (const recipe of recipes) {
    increment(aggregate.authoringCatalogRecipeSupportStates, recipe.supportState ?? 'unknown');
    const baseRecipeKeys = recipe.baseRecipeKeys ?? [];
    increment(aggregate.authoringCatalogRecipeSpecificityRanks, String(recipe.specificityRank ?? 0));
    if (baseRecipeKeys.length === 0) {
      increment(aggregate.authoringCatalogRecipeBaseKeys, `${recipe.key ?? 'unknown'}<-none`);
    } else {
      for (const baseRecipeKey of baseRecipeKeys) {
        increment(aggregate.authoringCatalogRecipeBaseKeys, `${recipe.key ?? 'unknown'}<-${baseRecipeKey}`);
      }
    }
    const preferences = recipe.preferences ?? [];
    increment(aggregate.authoringCatalogRecipePreferenceCounts, cardinalityBucket(preferences.length));
    for (const preference of preferences) {
      increment(aggregate.authoringCatalogRecipePreferenceAxes, preference.axisKey ?? 'unknown');
      increment(aggregate.authoringCatalogRecipePreferenceValues, `${preference.axisKey ?? 'unknown'}:${preference.valueKey ?? 'unknown'}`);
      increment(aggregate.authoringCatalogRecipePreferenceLayers, preference.valueLayer ?? 'unknown');
    }
    const sourcePlan = recipe.sourcePlan ?? null;
    increment(aggregate.authoringCatalogRecipeSourcePlanPresence, sourcePlan == null ? 'absent' : 'present');
    if (sourcePlan != null) {
      increment(aggregate.authoringCatalogRecipeSourcePlanConflictPolicies, sourcePlan.conflictPolicy ?? 'unknown');
      increment(aggregate.authoringCatalogRecipeSourcePlanFormattingPolicies, sourcePlan.formattingPolicy ?? 'unknown');
      increment(aggregate.authoringCatalogRecipeSourcePlanPackageToolingPolicies, sourcePlan.packageToolingPolicy ?? 'unknown');
      increment(aggregate.authoringCatalogRecipeSourcePlanFileCounts, cardinalityBucket(sourcePlan.fileCount ?? 0));
      const projectTooling = sourcePlan.projectTooling ?? null;
      increment(aggregate.authoringCatalogRecipeProjectToolingPresence, projectTooling == null ? 'absent' : 'present');
      if (projectTooling != null) {
        increment(aggregate.authoringCatalogRecipeProjectToolingPackageManagers, projectTooling.packageManager ?? 'unknown');
        increment(aggregate.authoringCatalogRecipeProjectToolingBuildToolPolicies, projectTooling.buildToolPolicy ?? 'unknown');
        for (const dependency of projectTooling.dependencies ?? []) {
          increment(aggregate.authoringCatalogRecipeProjectToolingDependencyScopes, dependency.scope ?? 'unknown');
          increment(aggregate.authoringCatalogRecipeProjectToolingDependencySpecifiers, dependency.specifier ?? 'unknown');
        }
        for (const script of projectTooling.scripts ?? []) {
          increment(aggregate.authoringCatalogRecipeProjectToolingScriptNames, script.name ?? 'unknown');
        }
        for (const file of projectTooling.files ?? []) {
          increment(aggregate.authoringCatalogRecipeProjectToolingFileKinds, file.fileKind ?? 'unknown');
          increment(aggregate.authoringCatalogRecipeProjectToolingFileLanguages, file.language ?? 'unknown');
          increment(aggregate.authoringCatalogRecipeProjectToolingTextAuthorities, file.textAuthority ?? 'unknown');
        }
      }
      for (const file of sourcePlan.files ?? []) {
        increment(aggregate.authoringCatalogRecipeSourceFileRoles, file.role ?? 'unknown');
        increment(aggregate.authoringCatalogRecipeSourceFileLanguages, file.language ?? 'unknown');
        increment(aggregate.authoringCatalogRecipeSourceFileEditKinds, file.editKind ?? 'unknown');
        increment(aggregate.authoringCatalogRecipeSourceFileTextAuthorities, file.textAuthority ?? 'none');
      }
    }
    aggregate.authoringCatalogRecipeExpectedEffects += recipe.expectedEffectCount ?? 0;
    for (const effectKind of recipe.expectedEffectKinds ?? []) {
      increment(aggregate.authoringCatalogRecipeExpectedEffectKinds, effectKind);
    }
    for (const effect of recipe.expectedEffects ?? []) {
      increment(aggregate.authoringCatalogRecipeExpectedEffectRoles, effect.role ?? 'baseline');
      increment(aggregate.authoringCatalogRecipeExpectedEffectTargets, expectedEffectTargetKey(effect));
      increment(aggregate.authoringCatalogRecipeExpectedEffectFilterCounts, cardinalityBucket(effect.filterCount ?? 0));
      for (const field of effect.filterFields ?? []) {
        increment(aggregate.authoringCatalogRecipeExpectedEffectFilterFields, field);
      }
    }
  }
}

function observeAuthoringOrientationPressure(aggregate, orientation, fixtureLane) {
  if (orientation == null) {
    return;
  }
  const coverage = orientation.coverage ?? [];
  const taste = orientation.taste ?? [];
  const capabilities = orientation.capabilities ?? [];
  const operations = orientation.operations ?? [];
  const surfaces = orientation.surfaces ?? [];
  const recipes = orientation.recipes ?? [];
  const repairs = orientation.repairs ?? [];
  const repairClusters = orientation.repairClusters ?? [];
  const openReasons = orientation.openReasons ?? [];
  aggregate.authoringOrientationCoverageRows += coverage.length;
  aggregate.authoringOrientationTasteAxes += taste.length;
  aggregate.authoringOrientationCapabilities += capabilities.length;
  aggregate.authoringOrientationOperations += operations.length;
  aggregate.authoringOrientationRepairs += repairs.length;
  aggregate.authoringOrientationRepairClusters += repairClusters.length;
  aggregate.authoringOrientationOpenReasons += openReasons.length;

  for (const row of coverage) {
    increment(aggregate.authoringCoverageSurfaceKinds, row.surfaceKind);
    increment(aggregate.authoringCoverageSupportStates, row.supportState);
  }
  for (const axis of taste) {
    const axisKey = axis.axisKey ?? 'unknown';
    const values = axis.values ?? [];
    increment(aggregate.authoringTasteAxisKeys, axisKey);
    increment(aggregate.authoringTasteAxisLayers, axis.layer);
    increment(aggregate.authoringTasteAxisPolicyStates, axis.policyState);
    increment(aggregate.authoringTasteAxisKeyPolicyStates, `${axisKey}:${axis.policyState ?? 'unknown'}`);
    increment(aggregate.authoringTasteAxisKeyValueCounts, `${axisKey}:${cardinalityBucket(values.length)}`);
    for (const reasonKind of axis.openReasonKinds ?? []) {
      increment(aggregate.authoringTasteAxisKeyOpenReasons, `${axisKey}:${reasonKind}`);
    }
    increment(aggregate.authoringTasteAxisConfidences, axis.confidence);
    increment(aggregate.authoringTasteAxisPrimitivePolicyValueCounts, cardinalityBucket(axis.primitivePolicyValueCount ?? 0));
    increment(aggregate.authoringTasteAxisObservedShapeValueCounts, cardinalityBucket(axis.observedShapeValueCount ?? 0));
    increment(aggregate.authoringTasteAxisDerivedReadingValueCounts, cardinalityBucket(axis.derivedReadingValueCount ?? 0));
    aggregate.authoringOrientationTasteValues += values.length;
    for (const value of values) {
      increment(aggregate.authoringTasteValueLayers, value.layer);
      increment(aggregate.authoringTasteAxisValues, `${axisKey}:${value.valueKey ?? 'unknown'}`);
      increment(aggregate.authoringTasteValues, value.valueKey);
    }
  }
  for (const capability of capabilities) {
    increment(aggregate.authoringCapabilityKeys, `${capability.key}:${capability.supportState}`);
    increment(aggregate.authoringCapabilitySupportStates, capability.supportState);
    for (const reasonKind of capability.openReasonKinds ?? []) {
      increment(aggregate.authoringCapabilityOpenReasons, reasonKind);
    }
  }
  for (const operation of operations) {
    increment(aggregate.authoringOperationActions, operation.action);
    increment(aggregate.authoringOperationSupportStates, operation.supportState);
    for (const reasonKind of operation.openReasonKinds ?? []) {
      increment(aggregate.authoringOperationOpenReasons, reasonKind);
    }
  }
  for (const repair of repairs) {
    increment(aggregate.authoringRepairKinds, repair.repairKind);
    increment(aggregate.authoringRepairEvidenceKinds, repair.evidenceKind);
    increment(aggregate.authoringRepairSupportStates, repair.supportState);
    increment(aggregate.authoringRepairAuthorities, repair.authority);
    increment(aggregate.authoringRepairLoci, repair.locus);
    increment(aggregate.authoringRepairDiagnosticKinds, repair.diagnosticKind ?? 'none');
    increment(aggregate.authoringRepairSeamKinds, repair.seamKindKey ?? 'none');
    for (const reasonKind of repair.openReasonKinds ?? []) {
      increment(aggregate.authoringRepairOpenReasons, reasonKind);
    }
    increment(aggregate.authoringRepairActionTargets, suggestionTargetKey(repair.suggestion));
  }
  for (const cluster of repairClusters) {
    increment(aggregate.authoringRepairClusterKinds, cluster.repairKind);
    increment(aggregate.authoringRepairClusterPlanKinds, cluster.planKind ?? 'unknown');
    increment(aggregate.authoringRepairClusterChangeDomains, cluster.changeDomain ?? 'unknown');
    increment(aggregate.authoringRepairClusterPlanReadiness, cluster.planReadiness ?? 'unknown');
    increment(aggregate.authoringRepairClusterActionTargets, cluster.actionTargetKind ?? 'none');
    increment(aggregate.authoringRepairClusterActionTargetCounts, cardinalityBucket(cluster.actionTargetCount ?? 0));
    increment(aggregate.authoringRepairClusterTargetMemberCounts, cardinalityBucket(cluster.targetMemberCount ?? 0));
    increment(aggregate.authoringRepairClusterOwnerTypeCounts, cardinalityBucket(cluster.ownerTypeCount ?? 0));
    increment(aggregate.authoringRepairClusterValueTypeCounts, cardinalityBucket(cluster.valueTypeCount ?? 0));
    increment(aggregate.authoringRepairClusterMemberHintCounts, cardinalityBucket(cluster.memberHints?.length ?? 0));
    increment(aggregate.authoringRepairClusterActionTargetSourceCoverage, cluster.actionTargetSourceCoverage ?? 'unknown');
    for (const memberHint of cluster.memberHints ?? []) {
      increment(aggregate.authoringRepairClusterMemberHintValueTypeCoverage, memberHint.valueTypeCoverage ?? 'unknown');
      for (const valueTypeSource of memberHint.valueTypeSources ?? []) {
        increment(aggregate.authoringRepairClusterMemberHintValueTypeSources, valueTypeSource);
      }
    }
    for (const siteKind of cluster.siteKinds ?? []) {
      increment(aggregate.authoringRepairClusterSiteKinds, siteKind);
    }
    for (const valueSiteKind of cluster.valueSiteKinds ?? []) {
      increment(aggregate.authoringRepairClusterValueSiteKinds, valueSiteKind);
    }
    for (const runtimeBoundaryKind of cluster.runtimeBoundaryKinds ?? []) {
      increment(aggregate.authoringRepairClusterRuntimeBoundaryKinds, runtimeBoundaryKind);
    }
    for (const runtimeIntentKind of cluster.runtimeIntentKinds ?? []) {
      increment(aggregate.authoringRepairClusterRuntimeIntentKinds, runtimeIntentKind);
    }
  }
  for (const surface of surfaces) {
    increment(aggregate.authoringSurfaceSupportStates, surface.supportState);
  }
  for (const recipe of recipes) {
    const isApplicableRecipe = recipe.currentFitState !== 'not-applicable';
    increment(aggregate.authoringRecipeKeys, `${recipe.key}:${recipe.supportState}`);
    increment(aggregate.authoringRecipeSupportStates, recipe.supportState);
    increment(aggregate.authoringRecipeCurrentFitStates, `${recipe.key}:${recipe.currentFitState ?? 'unknown'}`);
    increment(
      aggregate.authoringRecipeCurrentFitSpecificity,
      `${recipe.specificityRank ?? 0}:${recipe.currentFitState ?? 'unknown'}`,
    );
    for (const effectKind of recipe.expectedEffectKinds ?? []) {
      increment(aggregate.authoringRecipeExpectedEffects, effectKind);
    }
    for (const effect of recipe.expectedEffects ?? []) {
      const targetKey = expectedEffectTargetKey(effect);
      const role = effect.role ?? 'baseline';
      increment(aggregate.authoringRecipeExpectedEffectRoles, role);
      increment(aggregate.authoringRecipeExpectedEffectTargets, targetKey);
      increment(
        aggregate.authoringRecipeExpectedEffectCurrentOutcomes,
        `${effect.effectKind}:${effect.currentOutcome ?? 'unknown'}`,
      );
      increment(
        aggregate.authoringRecipeExpectedEffectFixtureLaneOutcomes,
        `${fixtureLane}:${effect.effectKind}:${effect.currentOutcome ?? 'unknown'}`,
      );
      if (effect.effectKind === 'project-tooling') {
        increment(
          aggregate.authoringRecipeProjectToolingFixtureLaneOutcomes,
          `${fixtureLane}:${effect.currentOutcome ?? 'unknown'}`,
        );
      }
      if (effect.effectKind === 'authoring-taste') {
        const tasteValueLayer = effect.tasteValueLayer ?? 'none';
        increment(aggregate.authoringRecipeExpectedEffectTasteValueLayers, tasteValueLayer);
        increment(
          aggregate.authoringRecipeExpectedEffectTasteLayerOutcomes,
          `${tasteValueLayer}:${effect.currentOutcome ?? 'unknown'}`,
        );
      }
      increment(
        aggregate.authoringRecipeExpectedEffectTargetOutcomes,
        `${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
      );
      increment(
        aggregate.authoringRecipeExpectedEffectRecipeTargetOutcomes,
        `${recipe.key}:${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
      );
      if (isApplicableRecipe) {
        increment(
          aggregate.authoringRecipeApplicableExpectedEffectCurrentOutcomes,
          `${effect.effectKind}:${effect.currentOutcome ?? 'unknown'}`,
        );
        increment(
          aggregate.authoringRecipeApplicableExpectedEffectFixtureLaneOutcomes,
          `${fixtureLane}:${effect.effectKind}:${effect.currentOutcome ?? 'unknown'}`,
        );
        increment(
          aggregate.authoringRecipeApplicableExpectedEffectRecipeFixtureLaneOutcomes,
          `${fixtureLane}:${recipe.key}:${effect.effectKind}:${effect.currentOutcome ?? 'unknown'}`,
        );
        if (effect.effectKind === 'project-tooling') {
          increment(
            aggregate.authoringRecipeApplicableProjectToolingFixtureLaneOutcomes,
            `${fixtureLane}:${effect.currentOutcome ?? 'unknown'}`,
          );
        }
        increment(
          aggregate.authoringRecipeApplicableExpectedEffectTargetOutcomes,
          `${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
        );
        increment(
          aggregate.authoringRecipeApplicableExpectedEffectRecipeTargetOutcomes,
          `${recipe.key}:${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
        );
      }
      if (isRecipeSignatureRole(role)) {
        increment(
          aggregate.authoringRecipeSignatureEffectTargetOutcomes,
          `${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
        );
        increment(
          aggregate.authoringRecipeSignatureEffectRecipeTargetOutcomes,
          `${recipe.key}:${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
        );
        if (isApplicableRecipe) {
          increment(
            aggregate.authoringRecipeCandidateSignatureEffectTargetOutcomes,
            `${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
          );
          increment(
            aggregate.authoringRecipeCandidateSignatureEffectRecipeTargetOutcomes,
            `${recipe.key}:${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
          );
        }
      }
      if (role === 'discriminator') {
        increment(
          aggregate.authoringRecipeDiscriminatorEffectTargetOutcomes,
          `${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
        );
        increment(
          aggregate.authoringRecipeDiscriminatorEffectRecipeTargetOutcomes,
          `${recipe.key}:${targetKey}:${effect.currentOutcome ?? 'unknown'}`,
        );
      }
      increment(
        aggregate.authoringRecipeExpectedEffectObservedCounts,
        cardinalityBucket(effect.currentObservedCount ?? 0),
      );
      increment(aggregate.authoringRecipeExpectedEffectScopes, `${effect.effectKind}:${effect.scope}`);
      increment(
        aggregate.authoringRecipeExpectedEffectCardinalities,
        `${effect.effectKind}:${effect.cardinality}`,
      );
      increment(aggregate.authoringRecipeExpectedEffectFilterCounts, cardinalityBucket(effect.filterCount ?? 0));
      for (const field of effect.filterFields ?? []) {
        increment(aggregate.authoringRecipeExpectedEffectFilterFields, field);
      }
    }
    for (const reasonKind of recipe.openReasonKinds ?? []) {
      increment(aggregate.authoringRecipeOpenReasons, reasonKind);
    }
  }
  for (const reason of openReasons) {
    increment(aggregate.authoringOpenReasonLoci, reason.locus);
  }
}

function recordDiKeyIdentities(aggregate, store) {
  for (const identity of store.readIdentities()) {
    if (identity.kind !== 'di-key-identity' || aggregate.seenDiKeyIdentityHandles.has(identity.handle)) {
      continue;
    }
    aggregate.seenDiKeyIdentityHandles.add(identity.handle);
    aggregate.diKeyIdentities += 1;
    increment(aggregate.diKeyIdentityKinds, identity.keyKind ?? 'unknown');

    const declarationHandle = identity.declarationHandle ?? null;
    increment(aggregate.diKeyIdentityDeclarationCoverage, declarationHandle == null ? 'no-declaration' : 'declaration');
    if (declarationHandle == null) {
      continue;
    }

    const declaration = store.readIdentity(declarationHandle);
    increment(
      aggregate.diKeyIdentityDeclarationAddressCoverage,
      declaration?.declarationAddressHandle == null ? 'no-address' : 'address',
    );
  }
}

function observeAppTopologyPressure(aggregate, topology) {
  if (topology == null) {
    return;
  }
  const components = topology.components ?? [];
  for (const component of components) {
    const roles = component.roles ?? [];
    aggregate.appTopologyComponentRoles += roles.length;
    for (const role of roles) {
      increment(aggregate.appTopologyComponentRolesByKind, role.roleKind ?? 'unknown');
      increment(aggregate.appTopologyComponentRoleEvidence, role.evidenceKind ?? 'unknown');
      increment(aggregate.appTopologyComponentRoleSourceCoverage, sourceReferenceState(role.source));
    }
  }
  const services = topology.services ?? [];
  aggregate.appTopologyServices += services.length;
  for (const service of services) {
    increment(aggregate.appTopologyServiceRoles, service.role ?? 'unknown');
    increment(aggregate.appTopologyServiceExportStates, service.isExported === true ? 'exported' : 'local');
    increment(aggregate.appTopologyServiceResolveCallCounts, cardinalityBucket(service.resolveCallCount ?? 0));
  }
  const injections = topology.injections ?? [];
  aggregate.appTopologyInjections += injections.length;
  for (const injection of injections) {
    increment(aggregate.appTopologyInjectionMechanisms, injection.mechanism ?? 'unknown');
    increment(aggregate.appTopologyInjectionKeyDeclarationKinds, injection.keyDeclarationKind ?? 'unknown');
    increment(aggregate.appTopologyInjectionKeyDeclarationRoles, injection.keyDeclarationRole ?? 'none');
    increment(aggregate.appTopologyInjectionKeyImportKinds, injection.keyImportKind ?? 'none');
    increment(aggregate.appTopologyInjectionKeyImportScopes, moduleSpecifierScope(injection.keyImportModuleSpecifier));
    increment(aggregate.appTopologyInjectionConsumerClasses, injection.consumerClassName == null ? 'none' : 'class');
    increment(aggregate.appTopologyInjectionConsumerMemberKinds, injection.consumerMemberKind ?? 'none');
    increment(aggregate.appTopologyInjectionExecutionContexts, injection.executionContextKind ?? 'unknown');
    increment(aggregate.appTopologyInjectionActiveContainerExpectations, injection.activeContainerExpectation ?? 'unknown');
    increment(aggregate.appTopologyInjectionNullishKeyArgumentCounts, cardinalityBucket(injection.nullishKeyArguments?.length ?? 0));
    for (const argument of injection.nullishKeyArguments ?? []) {
      increment(aggregate.appTopologyInjectionNullishKeyArgumentKinds, argument.kind ?? 'unknown');
    }
    increment(aggregate.appTopologyInjectionSourceCoverage, sourceReferenceState(injection.source));
  }
  const serviceInteractions = topology.serviceInteractions ?? [];
  aggregate.appTopologyServiceInteractions += serviceInteractions.length;
  for (const interaction of serviceInteractions) {
    increment(aggregate.appTopologyServiceInteractionOperationKinds, interaction.operationKind ?? 'unknown');
    increment(aggregate.appTopologyServiceInteractionTargetRoles, interaction.targetRole ?? 'unknown');
    increment(aggregate.appTopologyServiceInteractionConsumerRoles, interaction.consumerRole ?? 'unknown');
    increment(aggregate.appTopologyServiceInteractionConsumerClasses, interaction.consumerClassName == null ? 'none' : 'class');
    increment(aggregate.appTopologyServiceInteractionConsumerMembers, interaction.consumerMemberName == null ? 'none' : 'member');
    increment(aggregate.appTopologyServiceInteractionArgumentCounts, cardinalityBucket(interaction.argumentCount ?? 0));
    increment(aggregate.appTopologyServiceInteractionSelfStates, interaction.isSelfInteraction === true ? 'self' : 'cross');
    increment(aggregate.appTopologyServiceInteractionSourceCoverage, sourceReferenceState(interaction.source));
  }
  const serviceInteractionBindings = topology.serviceInteractionBindings ?? [];
  aggregate.appTopologyServiceInteractionBindings += serviceInteractionBindings.length;
  for (const binding of serviceInteractionBindings) {
    increment(aggregate.appTopologyServiceInteractionBindingSourceKinds, binding.bindingSourceKind ?? 'unknown');
    increment(aggregate.appTopologyServiceInteractionBindingSourceRoots, binding.bindingSourceRootName == null ? 'none' : 'present');
    increment(aggregate.appTopologyServiceInteractionBindingDirections, binding.bindingDirection ?? 'unknown');
    increment(aggregate.appTopologyServiceInteractionBindingTargetProperties, binding.bindingTargetProperty ?? 'none');
    increment(aggregate.appTopologyServiceInteractionBindingOperationKinds, binding.interactionOperationKind ?? 'unknown');
    increment(aggregate.appTopologyServiceInteractionBindingTargetRoles, binding.interactionTargetRole ?? 'unknown');
    increment(aggregate.appTopologyServiceInteractionBindingSelfStates, binding.interactionIsSelfInteraction === true ? 'self' : 'cross');
  }
  const stateCompositions = topology.stateCompositions ?? [];
  aggregate.appTopologyStateCompositions += stateCompositions.length;
  for (const composition of stateCompositions) {
    increment(aggregate.appTopologyStateCompositionRoles, composition.valueDeclarationRole ?? 'none');
    increment(aggregate.appTopologyStateCompositionValueTypeShapes, composition.valueTypeShapeKind ?? 'unknown');
    increment(aggregate.appTopologyStateCompositionSourceCoverage, sourceReferenceState(composition.source));
  }
  const styles = topology.styles ?? [];
  aggregate.appTopologyStyles += styles.length;
  for (const style of styles) {
    increment(aggregate.appTopologyStyleAssetKinds, style.assetKind ?? 'unknown');
    increment(aggregate.appTopologyStyleSourceKinds, style.sourceKind ?? 'unknown');
    increment(aggregate.appTopologyStyleOwnerKinds, style.ownerKind ?? 'unknown');
    increment(aggregate.appTopologyStyleSourceCoverage, sourceReferenceState(style.source));
    increment(aggregate.appTopologyStyleEvidenceCoverage, sourceReferenceState(style.evidenceSource));
  }
}

function moduleSpecifierScope(moduleSpecifier) {
  if (moduleSpecifier == null) {
    return 'none';
  }
  if (moduleSpecifier === 'aurelia' || moduleSpecifier.startsWith('@aurelia/')) {
    return 'aurelia-package';
  }
  if (moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/')) {
    return 'local-module';
  }
  return 'package';
}

function expectedEffectTargetKey(effect) {
  if (effect.semanticTargetKey != null) {
    return effect.semanticTargetKey;
  }
  if (effect.effectKind === 'authoring-taste') {
    return `taste:${effect.tasteAxisKey ?? 'none'}:${effect.tasteValueKey ?? 'none'}`;
  }
  if (effect.effectKind === 'authoring-capability') {
    return `capability:${effect.capabilityKey ?? 'none'}:${effect.minimumSupportState ?? 'none'}`;
  }
  const filters = effect.filters ?? [];
  if (filters.length > 0) {
    return `${effect.effectKind}:${filters
      .map((filter) => `${filter.field}=${expectedEffectValueKey(filter.value)}`)
      .join('&')}`;
  }
  const countPart = effect.count == null ? '' : `:${effect.count}`;
  return `${effect.effectKind}:${effect.cardinality}${countPart}`;
}

function expectedEffectValueKey(value) {
  return value == null ? 'null' : String(value);
}

function isRecipeSignatureRole(role) {
  return role === 'signature' || role === 'discriminator';
}

function diagnosticMissingInputs(diagnostic) {
  return diagnostic.missingInputs?.length > 0
    ? diagnostic.missingInputs
    : [diagnostic.missingInput ?? 'none'];
}

function suggestionTargetKey(suggestion) {
  const target = suggestion?.actionTarget ?? null;
  if (target == null) {
    return 'none';
  }
  return `${target.targetKind}:${sourceReferenceState(target.source)}`;
}

function sourceReferenceState(source) {
  return source == null ? 'no-source' : 'source';
}

async function pagedRows(app, kind) {
  const rows = [];
  let cursor = null;
  let outcome = 'hit';
  let pages = 0;
  for (;;) {
    pages += 1;
    const answer = app.ask({
      kind,
      page: { size: 500, cursor },
    });
    outcome = answer.outcome;
    rows.push(...(answer.value?.rows ?? []));
    cursor = answer.page?.nextCursor ?? null;
    if (cursor == null) {
      return { outcome, rows, pages };
    }
  }
}

function pressureRoots() {
  const raw = process.env.SEMANTIC_RUNTIME_PRESSURE_ROOTS;
  if (raw == null || raw.trim().length === 0) {
    return defaultRoots;
  }
  return [...new Set(raw
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => path.isAbsolute(entry) ? path.resolve(entry) : path.resolve(workspaceRoot, entry))
    .flatMap((root) => fixtureCollectionRootsFor(root)))]
    .sort((left, right) => left.localeCompare(right));
}

function fixtureCollectionRootsFor(root) {
  if (samePath(root, authoringFixtureRoot)) {
    return fixtureChildRoots(authoringFixtureRoot, (name) => name.startsWith('generated-') || name === 'storefront');
  }
  if (samePath(root, pressureFixtureRoot)) {
    return fixtureChildRoots(pressureFixtureRoot);
  }
  return [root];
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

function pressureAnalysisDepth() {
  const raw = process.env.SEMANTIC_RUNTIME_APP_ANALYSIS_DEPTH;
  if (raw == null || raw.trim().length === 0) {
    return 'binding-observation';
  }
  const value = raw.trim();
  if (
    value === 'runtime-topology'
    || value === 'binding-targets'
    || value === 'binding-observation'
  ) {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_APP_ANALYSIS_DEPTH '${raw}'.`);
}

function pressureProjectShapeFilter() {
  const raw = process.env.SEMANTIC_RUNTIME_PROJECT_SHAPES;
  if (raw == null || raw.trim().length === 0) {
    return null;
  }
  const supported = new Set(Object.values(SemanticProjectShapeKind));
  const values = raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  for (const value of values) {
    if (!supported.has(value)) {
      throw new Error(`Unsupported SEMANTIC_RUNTIME_PROJECT_SHAPES entry '${value}'.`);
    }
  }
  return new Set(values);
}

function pressureProjectKeyFilter() {
  return stringSetEnv('SEMANTIC_RUNTIME_PRESSURE_PROJECT_KEYS');
}

function pressureProjectRootDirFilter() {
  return stringListEnv('SEMANTIC_RUNTIME_PRESSURE_PROJECT_ROOT_DIRS');
}

function pressureProjectDiscovery() {
  const raw = process.env.SEMANTIC_RUNTIME_PRESSURE_PROJECT_DISCOVERY;
  if (raw == null || raw.trim().length === 0) {
    return undefined;
  }
  const value = raw.trim();
  if (value === 'single-root' || value === 'package-tsconfig') {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_PRESSURE_PROJECT_DISCOVERY '${raw}'.`);
}

function pressureDetailMode() {
  const raw = process.env.SEMANTIC_RUNTIME_PRESSURE_DETAIL;
  if (raw == null || raw.trim().length === 0) {
    return 'compact';
  }
  const value = raw.trim();
  if (value === 'compact' || value === 'summary' || value === 'raw') {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_PRESSURE_DETAIL '${raw}'.`);
}

function pressureOutputMode() {
  const raw = process.env.SEMANTIC_RUNTIME_PRESSURE_OUTPUT;
  if (raw == null || raw.trim().length === 0) {
    return 'aggregate';
  }
  const value = raw.trim();
  if (value === 'inputs' || value === 'aggregate' || value === 'both') {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_PRESSURE_OUTPUT '${raw}'.`);
}

function skippedProjectFilterReason(project, root) {
  if (projectKeyFilter != null && !projectKeyFilter.has(project.projectKey)) {
    return 'project-key';
  }
  if (projectRootDirFilter != null && !projectRootDirMatchesFilter(project.rootDir, root, projectRootDirFilter)) {
    return 'project-root-dir';
  }
  return null;
}

function projectRootDirMatchesFilter(projectRootDir, root, filters) {
  return filters.some((filter) => {
    const expectedRoot = path.isAbsolute(filter)
      ? path.resolve(filter)
      : path.resolve(root, filter);
    return samePath(projectRootDir, expectedRoot);
  });
}

function stringSetEnv(name) {
  const values = stringListEnv(name);
  return values == null ? null : new Set(values);
}

function stringListEnv(name) {
  const raw = process.env[name];
  if (raw == null || raw.trim().length === 0) {
    return null;
  }
  return raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function authoringTemplateSourceFilesForProject(project, projectFrame) {
  if (project.shapeKind !== SemanticProjectShapeKind.AureliaResourceLibrary || projectFrame == null) {
    return [];
  }
  return projectFrame.sourceFiles
    .filter((source) => source.role === 'template' || source.path.toLowerCase().endsWith('.html'))
    .map((source) => source.path)
    .slice(0, authoringSourceFileLimitPerProject);
}

function allTemplateRuntimeAnalysisResources(templates) {
  if (templates == null) {
    return [];
  }
  return [
    ...(templates.resources ?? []),
    ...(templates.authoringResources ?? []),
  ];
}

function sourceAssignmentReasonKey(reason) {
  if (detailMode === 'raw') {
    return reason;
  }
  if (/^Source member .+ is readonly in the TypeChecker surface/.test(reason)) {
    return 'source member is readonly in the TypeChecker surface; Aurelia runtime astAssign still writes';
  }
  if (/^TypeChecker target-to-source assignment is not assignable/.test(reason)) {
    return 'TypeChecker target-to-source assignment is not assignable; Aurelia runtime still passes observer value to astAssign';
  }
  if (/^Aurelia astAssign does not assign to expression kind /.test(reason)) {
    return 'Aurelia astAssign does not assign to this expression kind';
  }
  if (/^Owner type .+ did not project member /.test(reason)) {
    return 'owner type did not project member; Aurelia astAssign can still write to runtime objects';
  }
  return 'other source-assignment strictness pressure';
}

function sourceAssignmentReasonKindKey(kind) {
  return kind;
}

function openSeamSummaryKey(row) {
  if (detailMode === 'raw') {
    return `${row.seamKindKey} :: ${row.summary}`;
  }
  if (row.reasonKinds?.length > 0) {
    return `${row.seamKindKey} :: ${row.reasonKinds.join('+')}`;
  }
  return `${row.seamKindKey} :: ${generalizedOpenSeamSummary(row)}`;
}

function generalizedOpenSeamSummary(row) {
  switch (row.seamKindKey) {
    case 'evaluation.unresolved-identifier':
      return 'unresolved identifier';
    case 'evaluation.unsupported-statement':
      return 'unsupported evaluator statement';
    case 'evaluation.unsupported-expression':
      return 'unsupported evaluator expression';
    case 'evaluation.dynamic-mutation':
      return 'dynamic mutation needs runtime value';
    default:
      return 'no reason-kind summary';
  }
}

function typeSurfaceKey(type) {
  if (type == null) {
    return 'none';
  }
  const normalized = String(type).trim();
  if (normalized.length === 0) {
    return 'empty';
  }
  if (normalized === 'unknown') {
    return 'unknown';
  }
  if (normalized === 'any') {
    return 'any';
  }
  if (/\bany\b/u.test(normalized)) {
    return 'contains-any';
  }
  if (/\bunknown\b/u.test(normalized)) {
    return 'contains-unknown';
  }
  if (normalized.includes('|')) {
    return 'union';
  }
  if (normalized.endsWith('[]') || /\b(?:Readonly)?Array</u.test(normalized)) {
    return 'array';
  }
  if (/^(?:string|number|boolean|bigint|symbol|null|undefined)$/u.test(normalized)) {
    return normalized;
  }
  return 'object-like';
}

function writeabilityKey(value) {
  return value == null ? 'unknown' : String(value);
}

function strictBindingLabel(value) {
  return value == null ? 'unknown' : String(value);
}

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function increment(counts, key, amount = 1) {
  const propertyKey = String(key);
  const current = Object.hasOwn(counts, propertyKey) ? counts[propertyKey] : 0;
  Object.defineProperty(counts, propertyKey, {
    value: current + amount,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function incrementAll(target, values) {
  if (values == null) {
    return;
  }
  for (const [key, value] of Object.entries(values)) {
    increment(target, key, value);
  }
}

function mergeMaxCounts(target, values) {
  if (values == null) {
    return;
  }
  for (const [key, value] of Object.entries(values)) {
    const current = Object.hasOwn(target, key) ? target[key] : 0;
    Object.defineProperty(target, key, {
      value: Math.max(current, value),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
}

function cardinalityBucket(count) {
  if (count === 0) {
    return '0';
  }
  if (count === 1) {
    return '1';
  }
  if (count <= 5) {
    return '2-5';
  }
  return '6+';
}

function printCounts(label, counts, limit = 20) {
  const entries = Object.entries(counts)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      rightValue - leftValue || leftKey.localeCompare(rightKey)
    )
    .slice(0, limit);

  if (entries.length === 0) {
    if (detailMode === 'raw') {
      console.log('');
      console.log(label);
      console.log('- none');
    }
    return;
  }
  console.log('');
  console.log(label);
  for (const [key, count] of entries) {
    console.log(`- ${key}: ${count}`);
  }
}

function compactCounts(counts, limit = 3) {
  const entries = Object.entries(counts ?? {})
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      rightValue - leftValue || leftKey.localeCompare(rightKey)
    )
    .slice(0, limit);
  return entries.length === 0
    ? 'none'
    : entries.map(([key, count]) => `${key}=${count}`).join(', ');
}

function printCompactCounts(label, counts, limit = 5) {
  if (counts == null || Object.keys(counts).length === 0) {
    return;
  }
  console.log(`- ${label}: ${compactCounts(counts, limit)}`);
}

function printAuthoringTasteFocus(aggregate) {
  printCountsByPrefix(
    'authoring taste style-binding-model values',
    aggregate.authoringTasteAxisValues,
    'style-binding-model:',
  );
  printCountsByPrefix(
    'authoring taste style-resource-ownership values',
    aggregate.authoringTasteAxisValues,
    'style-resource-ownership:',
  );
  printCountsByPrefix(
    'authoring taste form-value-channel values',
    aggregate.authoringTasteAxisValues,
    'form-value-channel:',
  );
  printCountsByPrefix(
    'authoring taste state-ownership values',
    aggregate.authoringTasteAxisValues,
    'state-ownership:',
  );
  printCountsByPrefix(
    'authoring taste validation-ownership values',
    aggregate.authoringTasteAxisValues,
    'validation-ownership:',
  );
  printCountsByPrefix(
    'authoring taste build-tool-profile values',
    aggregate.authoringTasteAxisValues,
    'build-tool-profile:',
  );
}

function printCountsByPrefix(label, counts, prefix) {
  const scopedCounts = Object.fromEntries(
    Object.entries(counts ?? {})
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  );
  printCounts(label, scopedCounts);
}

function printPageCounts(label, counts) {
  if (detailMode === 'raw') {
    printCounts(label, counts);
    return;
  }
  const multiPageCounts = Object.fromEntries(
    Object.entries(counts).filter(([, count]) => count > 1),
  );
  printCounts(label, multiPageCounts);
}

function printQueryOutcomes(label, counts) {
  if (detailMode === 'raw') {
    printCounts(label, counts);
    return;
  }
  const pressureOutcomes = Object.fromEntries(
    Object.entries(counts).filter(([key]) => !key.endsWith(':hit')),
  );
  printCounts(label, pressureOutcomes);
}

function createTimingAccumulator() {
  return {
    totals: {},
    expressionTypeCache: {},
    expressionTypeCacheEntriesByBucket: {},
    expressionTypeCacheHitsByBucket: {},
    expressionTypeCacheMissesByBucket: {},
    expressionTypeCacheWritesByBucket: {},
    typeSystemHostSourceFileCache: {},
    phaseItemCounts: {},
    projectBuckets: {},
    slowestProjectMilliseconds: 0,
  };
}

async function measure(timings, label, read) {
  const started = performance.now();
  const value = await read();
  recordTiming(timings, label, performance.now() - started);
  return value;
}

function recordTiming(timings, label, milliseconds) {
  timings.totals[label] = (timings.totals[label] ?? 0) + milliseconds;
}

function observeProjectTiming(timings, milliseconds) {
  timings.slowestProjectMilliseconds = Math.max(
    timings.slowestProjectMilliseconds,
    milliseconds,
  );
  const bucket =
    milliseconds < 100 ? '<100ms' :
    milliseconds < 500 ? '100-499ms' :
    milliseconds < 1_000 ? '500-999ms' :
    milliseconds < 5_000 ? '1-4.9s' :
    milliseconds < 15_000 ? '5-14.9s' :
    '15s+';
  increment(timings.projectBuckets, bucket);
}

function recordAppWorldProfile(timings, profile) {
  if (profile == null) {
    return;
  }
  recordTiming(timings, 'app-world-profile-total', profile.totalMilliseconds);
  for (const phase of profile.phases ?? []) {
    recordTiming(timings, `app-world:${phase.name}`, phase.milliseconds);
  }
}

function recordTypeSystemProjectProfile(timings, profile) {
  if (profile == null) {
    return;
  }
  recordTiming(timings, 'type-system-profile-total', profile.totalMilliseconds);
  for (const phase of profile.phases ?? []) {
    recordTiming(timings, `type-system:${phase.name}`, phase.milliseconds);
    recordPhaseItemCount(timings, `type-system:${phase.name}`, phase.itemCount);
  }
  incrementAll(timings.typeSystemHostSourceFileCache, profile.hostSourceFileCache ?? {});
}

function recordPhaseItemCount(timings, label, itemCount) {
  if (!Number.isFinite(itemCount)) {
    return;
  }
  increment(timings.phaseItemCounts, label, itemCount);
}

function recordResourceRecognitionProfile(timings, profile) {
  if (profile == null) {
    return;
  }
  recordTiming(timings, 'resource-recognition-profile-total', profile.totalMilliseconds);
  for (const phase of profile.phases ?? []) {
    recordTiming(timings, `resource-recognition:${phase.name}`, phase.milliseconds);
  }
}

function recordTemplateCompilationProfile(timings, profile) {
  if (profile == null) {
    return;
  }
  recordTiming(timings, 'template-profile-total', profile.totalMilliseconds);
  for (const phase of profile.phases ?? []) {
    recordTiming(timings, `template:${phase.name}`, phase.milliseconds);
  }
}

function recordTemplateRuntimeAnalysisProfiles(timings, resources) {
  if (resources == null) {
    return;
  }
  for (const resource of resources) {
    const profile = resource.runtimeAnalysis?.profile;
    if (profile == null) {
      continue;
    }
    recordTiming(timings, 'template-runtime-profile-total', profile.totalMilliseconds);
    for (const phase of profile.phases ?? []) {
      recordTiming(timings, `template-runtime:${phase.name}`, phase.milliseconds);
    }
    recordExpressionTypeCacheStats(timings, profile.expressionTypeCache);
  }
}

function recordExpressionTypeCacheStats(timings, stats) {
  if (stats == null) {
    return;
  }
  increment(timings.expressionTypeCache, 'entries', stats.entries ?? 0);
  increment(timings.expressionTypeCache, 'hits', stats.hits ?? 0);
  increment(timings.expressionTypeCache, 'misses', stats.misses ?? 0);
  increment(timings.expressionTypeCache, 'writes', stats.writes ?? 0);
  incrementAll(timings.expressionTypeCacheEntriesByBucket, stats.entriesByBucket);
  incrementAll(timings.expressionTypeCacheHitsByBucket, stats.hitsByBucket);
  incrementAll(timings.expressionTypeCacheMissesByBucket, stats.missesByBucket);
  incrementAll(timings.expressionTypeCacheWritesByBucket, stats.writesByBucket);
}

function printTimings(label, timings) {
  console.log('');
  console.log(label);
  const entries = Object.entries(timings.totals)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      rightValue - leftValue || leftKey.localeCompare(rightKey)
    );
  if (entries.length === 0) {
    console.log('- none');
  } else {
    const printedEntries = entries.slice(0, detailMode === 'raw' ? entries.length : 14);
    for (const [key, milliseconds] of printedEntries) {
      console.log(`- ${key}: ${milliseconds.toFixed(1)}ms`);
    }
    if (printedEntries.length < entries.length) {
      console.log(`- ... ${entries.length - printedEntries.length} lower timing bucket(s) omitted`);
    }
  }
  console.log(`- slowest project: ${timings.slowestProjectMilliseconds.toFixed(1)}ms`);
  if (detailMode === 'raw') {
    printCounts(`${label}: phase item counts`, timings.phaseItemCounts, 18);
    printCounts(`${label}: expression type cache`, timings.expressionTypeCache, 10);
    printCounts(`${label}: expression type cache entries by bucket`, timings.expressionTypeCacheEntriesByBucket, 10);
    printCounts(`${label}: expression type cache hits by bucket`, timings.expressionTypeCacheHitsByBucket, 10);
    printCounts(`${label}: expression type cache misses by bucket`, timings.expressionTypeCacheMissesByBucket, 10);
    printCounts(`${label}: expression type cache writes by bucket`, timings.expressionTypeCacheWritesByBucket, 10);
    printCounts(`${label}: type-system host source-file cache`, timings.typeSystemHostSourceFileCache, 10);
  } else {
    if (Object.keys(timings.phaseItemCounts).length > 0) {
      console.log(`- phase items: ${compactCounts(timings.phaseItemCounts, 8)}`);
    }
  }
  if (detailMode !== 'raw' && Object.keys(timings.typeSystemHostSourceFileCache).length > 0) {
    console.log(`- type-system host source cache: ${compactCounts(timings.typeSystemHostSourceFileCache, 8)}`);
  }
  if (detailMode !== 'raw' && Object.keys(timings.expressionTypeCache).length > 0) {
    console.log(
      `- expression cache: entries=${timings.expressionTypeCache.entries ?? 0}, ` +
      `hits=${timings.expressionTypeCache.hits ?? 0}, misses=${timings.expressionTypeCache.misses ?? 0}, ` +
      `writes=${timings.expressionTypeCache.writes ?? 0}`,
    );
    console.log(
      `- expression cache buckets: entries ${compactCounts(timings.expressionTypeCacheEntriesByBucket)}, ` +
      `misses ${compactCounts(timings.expressionTypeCacheMissesByBucket)}, ` +
      `hits ${compactCounts(timings.expressionTypeCacheHitsByBucket)}`,
    );
  }
  if (detailMode === 'compact') {
    console.log(`- project buckets: ${compactCounts(timings.projectBuckets, 10)}`);
  } else {
    printCounts(`${label}: project buckets`, timings.projectBuckets, 10);
  }
}
