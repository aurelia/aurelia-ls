import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  diffSemanticRuntimeCountRows,
  diffSemanticRuntimeKernelCounts,
  diffSemanticRuntimeMemorySamples,
  formatSemanticRuntimeBytes,
  readSemanticRuntimeMemorySample,
  SEMANTIC_APP_RETENTION_POLICIES,
  SemanticAppQueryKind,
  SemanticProjectShapeKind,
  semanticAppQueryCatalogRow,
  SEMANTIC_APP_ANALYSIS_DEPTHS,
  SEMANTIC_RUNTIME_INQUIRY_PROFILES,
  SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const authoringFixtureRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/authoring');
const pressureFixtureRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/pressure');
const queryDefaultAnalysisDepth = 'query-default';

const roots = telemetryRoots();
const depths = telemetryDepths();
const profiles = telemetryProfiles();
const selectedQueryKinds = telemetryQueryKinds();
const projectDiscovery = stringEnv('SEMANTIC_RUNTIME_TELEMETRY_PROJECT_DISCOVERY');
const includeAuthoringTemplates = booleanEnv('SEMANTIC_RUNTIME_TELEMETRY_AUTHORING_TEMPLATES', false);
const capturePhaseMemory = booleanEnv('SEMANTIC_RUNTIME_TELEMETRY_PHASE_MEMORY', true);
const capturePhaseKernel = booleanEnv('SEMANTIC_RUNTIME_TELEMETRY_PHASE_KERNEL', true);
const capturePhaseKernelBreakdowns = booleanEnv('SEMANTIC_RUNTIME_TELEMETRY_PHASE_KERNEL_BREAKDOWNS', false);
const captureFineGrainedPhases = booleanEnv('SEMANTIC_RUNTIME_TELEMETRY_FINE_PHASES', false);
const captureKernelBreakdowns = booleanEnv('SEMANTIC_RUNTIME_TELEMETRY_KERNEL_BREAKDOWNS', false);
const captureDetailDensity = booleanEnv('SEMANTIC_RUNTIME_TELEMETRY_DETAIL_DENSITY', false);
const capturePhaseDetailDensity = booleanEnv(
  'SEMANTIC_RUNTIME_TELEMETRY_PHASE_DETAIL_DENSITY',
  captureDetailDensity && capturePhaseKernelBreakdowns,
);
const queryPageSize = integerEnv('SEMANTIC_RUNTIME_TELEMETRY_QUERY_PAGE_SIZE', 100);
const rowSampleSize = integerEnv('SEMANTIC_RUNTIME_TELEMETRY_ROW_SAMPLE_SIZE', 0);
const forceGc = booleanEnv('SEMANTIC_RUNTIME_TELEMETRY_GC', true);
const outputMode = telemetryOutputMode();
const telemetryMode = normalizeTelemetryMode(stringEnv('SEMANTIC_RUNTIME_TELEMETRY_MODE'));
const routedAppRetention = normalizeAppRetention(stringEnv('SEMANTIC_RUNTIME_TELEMETRY_APP_RETENTION'));
const typeSystemDependencyCacheClearPolicy = telemetryTypeSystemDependencyCacheClearPolicy(
  stringEnv('SEMANTIC_RUNTIME_TELEMETRY_TYPE_SYSTEM_CACHE_CLEAR_POLICY'),
);
const routedAnswerClearsTypeSystemDependencyCache = telemetryMode === 'routed-query' || telemetryMode === 'routed-batch';
const includeTypeSystemDependencyCacheEntries = booleanEnv(
  'SEMANTIC_RUNTIME_TELEMETRY_TYPE_SYSTEM_CACHE_ENTRIES',
  false,
);
const repeatCount = Math.max(1, integerEnv('SEMANTIC_RUNTIME_TELEMETRY_REPEAT', 1));
const queryRepeatCount = Math.max(1, integerEnv('SEMANTIC_RUNTIME_TELEMETRY_QUERY_REPEAT', 1));

console.log('semantic-runtime app telemetry');
console.log('scope: construction and public-query cost by inquiry profile');
console.log('paths: fixture labels are printed; custom/external roots are identified only by input index');
console.log(`inputs: ${roots.length}`);
console.log(`depths: ${depths.join(',')}`);
console.log(`profiles: ${profiles.join(',')}`);
console.log(`query-kinds: ${selectedQueryKinds.length === 0 ? 'profile-default' : selectedQueryKinds.join(',')}`);
console.log(`include-authoring-templates: ${includeAuthoringTemplates}`);
console.log(`phase-memory: ${capturePhaseMemory}`);
console.log(`phase-kernel: ${capturePhaseKernel}`);
console.log(`phase-kernel-breakdowns: ${capturePhaseKernelBreakdowns}`);
console.log(`phase-detail-density: ${capturePhaseDetailDensity}`);
console.log(`fine-phases: ${captureFineGrainedPhases}`);
console.log(`kernel-breakdowns: ${captureKernelBreakdowns}`);
console.log(`detail-density: ${captureDetailDensity}`);
console.log(`query-page-size: ${queryPageSize}`);
console.log(`row-sample-size: ${rowSampleSize}`);
console.log(`project-discovery: ${projectDiscovery ?? 'default'}`);
console.log(`gc: ${typeof globalThis.gc === 'function' && forceGc ? 'before measured boundaries' : 'unavailable-or-disabled'}`);
console.log(`output: ${outputMode}`);
console.log(`mode: ${telemetryMode}`);
console.log(`routed-app-retention: ${routedAppRetention}`);
console.log(`type-system-cache-clear-policy: ${typeSystemDependencyCacheClearPolicy ?? 'profile-default'}`);
console.log(`type-system-cache-entries: ${includeTypeSystemDependencyCacheEntries}`);
console.log(`repeat: ${repeatCount}`);
console.log(`query-repeat: ${queryRepeatCount}`);

const aggregate = createAggregate();
for (const [rootIndex, root] of roots.entries()) {
  for (const depth of depths) {
    for (const profile of profiles) {
      for (let iteration = 0; iteration < repeatCount; iteration += 1) {
        const result = await profileRoot({ root, rootIndex, depth, profile, iteration, repeatCount });
        addToAggregate(aggregate, result);
        if (outputMode !== 'aggregate') {
          printRun(result);
        }
      }
    }
  }
}

if (outputMode !== 'runs') {
  printAggregate(aggregate);
}

async function profileRoot({ root, rootIndex, depth, profile, iteration, repeatCount }) {
  collectIfRequested();
  const rootLabel = telemetryRootLabel(root, rootIndex);
  const run = {
    rootLabel,
    iteration,
    repeatCount,
    depth,
    profile,
    projectKey: 'none',
    projectShape: 'none',
    timings: [],
    queries: [],
    constructionMemory: null,
    queryMemory: null,
    processMemoryStart: null,
    processMemoryEnd: null,
    kernelGrowth: null,
    kernelProductKinds: [],
    kernelRecordKinds: [],
    kernelSourceSpanRoles: [],
    kernelSourceFileRoles: [],
    kernelProductDetailKinds: [],
    kernelHotDetailKinds: [],
    kernelProductDetailDensity: [],
    kernelHotDetailDensity: [],
    kernelSidecarIndexes: [],
    kernelRecordKindHandleCharacters: [],
    kernelProductKindHandleCharacters: [],
    kernelSourceSpanRoleHandleCharacters: [],
    finalKernel: null,
    appWorldOpened: null,
    queryClaimGraph: null,
    appQueryClaimGraphs: [],
    queryRepeatCount,
    typeShapeDuplicates: [],
    staticEvaluationPhases: [],
    staticEvaluationSources: null,
    resourceRecognitionPhases: [],
    staticEvaluationHost: null,
    typeSystemCompilerOptions: null,
    typeSystemPhases: [],
    typeSystemHostSourceFileCache: null,
    projectCompilerOptionsCache: null,
    typeSystemDependencyCache: null,
    typeSystemDependencyCacheClear: null,
    typeSystemDependencyCacheAfterClear: null,
    typeSystemProgramRootFiles: null,
    typeSystemProgramSourceFiles: null,
    typeSystemProgramRootFileGroups: [],
    typeSystemProgramSourceFileGroups: [],
    typeSystemProgramNodeRemaps: null,
    topPhases: [],
    topPhaseMemory: [],
    topPhaseKernel: [],
    templatePhases: [],
    topTemplatePhaseMemory: [],
    topTemplatePhaseKernel: [],
    templateRuntimePhases: [],
    topTemplateRuntimePhaseMemory: [],
    topTemplateRuntimePhaseKernel: [],
    templateExpressionCache: null,
    warnings: [],
  };
  const runMemoryBefore = readSemanticRuntimeMemorySample();
  run.processMemoryStart = runMemoryBefore;
  const runtime = await measure(run.timings, 'runtime.open', () =>
    createSemanticRuntime({
      workspaceRoot: root,
      ...(projectDiscovery == null ? {} : { projectDiscovery }),
    })
  );
  const runtimeSummary = await measure(run.timings, 'runtime.summary', () =>
    runtime.summary({ projectPage: { size: 4 }, inquiryProfile: profile })
  );
  const appCandidate = selectAppCandidate(runtimeSummary.value.appCandidates);
  if (appCandidate == null) {
    run.warnings.push('no app candidate selected');
    run.constructionMemory = diffSemanticRuntimeMemorySamples(readSemanticRuntimeMemorySample(), runMemoryBefore);
    run.finalKernel = runtime.workspace.store.readTelemetrySnapshot({
      includeBreakdowns: captureKernelBreakdowns,
      includeDetailDensity: captureDetailDensity,
    });
    return finalizeRunMemory(run);
  }

  run.projectKey = appCandidate.projectKey;
  run.projectShape = appCandidate.shapeKind ?? SemanticProjectShapeKind.AureliaApp;
  if (telemetryMode === 'routed-query') {
    return finalizeRunMemory(await profileRoutedQueries(run, runtime, appCandidate, depth, profile, runMemoryBefore));
  }
  if (telemetryMode === 'routed-batch') {
    return finalizeRunMemory(await profileRoutedQueryBatch(run, runtime, appCandidate, depth, profile, runMemoryBefore));
  }
  const kernelBeforeOpen = runtime.workspace.store.readTelemetrySnapshot({
    includeBreakdowns: captureKernelBreakdowns,
    includeDetailDensity: captureDetailDensity,
  });
  collectIfRequested();
  const openMemoryBefore = readSemanticRuntimeMemorySample();
  const app = await measure(run.timings, 'app.open', () =>
    runtime.openApp({
      projectKey: appCandidate.projectKey,
      ...analysisDepthRequest(depth),
      includeAuthoringTemplates,
      telemetry: {
        inquiryProfile: profile,
        capturePhaseMemory,
        capturePhaseKernel,
        capturePhaseKernelBreakdowns,
        capturePhaseDetailDensity,
        captureFineGrainedPhases,
        captureKernelBreakdowns,
      },
    })
  );
  collectIfRequested();
  const openMemoryAfter = readSemanticRuntimeMemorySample();
  run.constructionMemory = diffSemanticRuntimeMemorySamples(openMemoryAfter, openMemoryBefore);
  const kernelAfterOpen = runtime.workspace.store.readTelemetrySnapshot({
    includeBreakdowns: captureKernelBreakdowns,
    includeDetailDensity: captureDetailDensity,
  });
  run.kernelGrowth = diffSemanticRuntimeKernelCounts(kernelAfterOpen, kernelBeforeOpen);
  if (captureKernelBreakdowns) {
    run.kernelProductKinds = diffSemanticRuntimeCountRows(kernelAfterOpen.productKinds, kernelBeforeOpen.productKinds);
    run.kernelRecordKinds = diffSemanticRuntimeCountRows(kernelAfterOpen.recordKinds, kernelBeforeOpen.recordKinds);
    run.kernelSourceSpanRoles = diffSemanticRuntimeCountRows(kernelAfterOpen.sourceSpanRoles, kernelBeforeOpen.sourceSpanRoles);
    run.kernelSourceFileRoles = diffSemanticRuntimeCountRows(kernelAfterOpen.sourceFileRoles, kernelBeforeOpen.sourceFileRoles);
    run.kernelProductDetailKinds = diffSemanticRuntimeCountRows(kernelAfterOpen.productDetailKinds, kernelBeforeOpen.productDetailKinds);
    run.kernelHotDetailKinds = diffSemanticRuntimeCountRows(kernelAfterOpen.hotDetailKinds, kernelBeforeOpen.hotDetailKinds);
    run.kernelProductDetailDensity = diffSemanticRuntimeDetailDensityRows(
      kernelAfterOpen.productDetailDensity,
      kernelBeforeOpen.productDetailDensity,
    );
    run.kernelHotDetailDensity = diffSemanticRuntimeDetailDensityRows(
      kernelAfterOpen.hotDetailDensity,
      kernelBeforeOpen.hotDetailDensity,
    );
    run.kernelSidecarIndexes = kernelAfterOpen.sidecarIndexes ?? [];
    run.kernelRecordKindHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterOpen.recordKindHandleCharacters, kernelBeforeOpen.recordKindHandleCharacters);
    run.kernelProductKindHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterOpen.productKindHandleCharacters, kernelBeforeOpen.productKindHandleCharacters);
    run.kernelSourceSpanRoleHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterOpen.sourceSpanRoleHandleCharacters, kernelBeforeOpen.sourceSpanRoleHandleCharacters);
  }
  run.finalKernel = kernelAfterOpen;
  recordAppProfile(run, app.emission.profile);
  recordStaticEvaluationProfile(run, app.emission.evaluation.profile);
  recordTypeSystemProfile(run, app.emission.typeSystem.profile);
  recordResourceRecognitionProfile(run, app.emission.resources.profile);
  recordTemplateProfile(run, app.emission.templates.profile);
  recordTemplateRuntimeProfiles(run, app.emission.templates);

  const queryMemoryBefore = readSemanticRuntimeMemorySample();
  const queries = queriesForProfile(profile);
  for (let queryIteration = 0; queryIteration < queryRepeatCount; queryIteration += 1) {
    for (const query of queries) {
      const queryResult = measureQuery(app, query, queryIteration);
      run.queries.push(queryResult);
      if (
        queryResult.kernel.totalRecords !== 0
        || queryResult.kernel.products !== 0
        || queryResult.kernel.provenance !== 0
      ) {
        run.warnings.push(
          `query '${query.kind}' repeat ${queryIteration + 1}/${queryRepeatCount} grew kernel: records=${queryResult.kernel.totalRecords}, products=${queryResult.kernel.products}, provenance=${queryResult.kernel.provenance}`,
        );
      }
    }
  }
  collectIfRequested();
  run.queryMemory = diffSemanticRuntimeMemorySamples(readSemanticRuntimeMemorySample(), queryMemoryBefore);
  const kernelAfterQueries = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });
  run.queryClaimGraph = app.queryClaims.snapshot();
  const cache = runtime.analysisCacheOverview({
    includeTypeSystemDependencyEntries: includeTypeSystemDependencyCacheEntries,
    rowLimit: 8,
  }).value;
  run.projectCompilerOptionsCache = cache.projectCompilerOptionsCache;
  run.typeSystemDependencyCache = cache.typeSystemDependencyCache;
  applyTypeSystemDependencyCacheClear(run, runtime);
  run.typeShapeDuplicates = captureKernelBreakdowns
    ? topTypeShapeDuplicateRows(runtime.workspace.store, 8)
    : [];
  const queryKernelGrowth = diffSemanticRuntimeKernelCounts(kernelAfterQueries, kernelAfterOpen);
  if (queryKernelGrowth.totalRecords !== 0 || queryKernelGrowth.products !== 0 || queryKernelGrowth.provenance !== 0) {
    run.warnings.push(
      `query projection grew kernel: records=${queryKernelGrowth.totalRecords}, products=${queryKernelGrowth.products}, provenance=${queryKernelGrowth.provenance}`,
    );
  }
  return finalizeRunMemory(run);
}

function finalizeRunMemory(run) {
  collectIfRequested();
  run.processMemoryEnd = readSemanticRuntimeMemorySample();
  return run;
}

async function profileRoutedQueries(run, runtime, appCandidate, depth, profile, runMemoryBefore) {
  collectIfRequested();
  run.constructionMemory = diffSemanticRuntimeMemorySamples(readSemanticRuntimeMemorySample(), runMemoryBefore);
  const kernelBeforeQueries = runtime.workspace.store.readTelemetrySnapshot({
    includeBreakdowns: captureKernelBreakdowns,
    includeDetailDensity: captureDetailDensity,
  });
  collectIfRequested();
  const queryMemoryBefore = readSemanticRuntimeMemorySample();
  const queries = queriesForProfile(profile);
  for (let queryIteration = 0; queryIteration < queryRepeatCount; queryIteration += 1) {
    for (const query of queries) {
      const queryResult = await measureRoutedQuery(runtime, appCandidate, depth, profile, query, queryIteration);
      run.queries.push(queryResult);
      if (!queryResult.retainedAnswerHit) {
        recordRoutedAppWorldFreeProfileSummary(run, queryResult.appWorldFreeProfile);
      }
      if (
        queryResult.kernel.totalRecords !== 0
        || queryResult.kernel.products !== 0
        || queryResult.kernel.provenance !== 0
      ) {
        run.warnings.push(
          `routed query '${query.kind}' repeat ${queryIteration + 1}/${queryRepeatCount} retained kernel: records=${queryResult.kernel.totalRecords}, products=${queryResult.kernel.products}, provenance=${queryResult.kernel.provenance}`,
        );
      }
    }
  }
  collectIfRequested();
  run.queryMemory = diffSemanticRuntimeMemorySamples(readSemanticRuntimeMemorySample(), queryMemoryBefore);
  const cache = runtime.analysisCacheOverview(typeSystemDependencyCacheOverviewRequest());
  run.queryClaimGraph = cache.value.runtimeQueryClaimProfiles
    .find((entry) => entry.inquiryProfile === profile)?.queryClaims
    ?? null;
  run.projectCompilerOptionsCache = cache.value.projectCompilerOptionsCache;
  run.typeSystemDependencyCache = cache.value.typeSystemDependencyCache;
  applyTypeSystemDependencyCacheClear(run, runtime);
  const kernelAfterQueries = runtime.workspace.store.readTelemetrySnapshot({
    includeBreakdowns: captureKernelBreakdowns,
    includeDetailDensity: captureDetailDensity,
  });
  run.finalKernel = kernelAfterQueries;
  run.kernelGrowth = diffSemanticRuntimeKernelCounts(kernelAfterQueries, kernelBeforeQueries);
  if (captureKernelBreakdowns) {
    run.kernelProductKinds = diffSemanticRuntimeCountRows(kernelAfterQueries.productKinds, kernelBeforeQueries.productKinds);
    run.kernelRecordKinds = diffSemanticRuntimeCountRows(kernelAfterQueries.recordKinds, kernelBeforeQueries.recordKinds);
    run.kernelSourceSpanRoles = diffSemanticRuntimeCountRows(kernelAfterQueries.sourceSpanRoles, kernelBeforeQueries.sourceSpanRoles);
    run.kernelSourceFileRoles = diffSemanticRuntimeCountRows(kernelAfterQueries.sourceFileRoles, kernelBeforeQueries.sourceFileRoles);
    run.kernelProductDetailKinds = diffSemanticRuntimeCountRows(kernelAfterQueries.productDetailKinds, kernelBeforeQueries.productDetailKinds);
    run.kernelHotDetailKinds = diffSemanticRuntimeCountRows(kernelAfterQueries.hotDetailKinds, kernelBeforeQueries.hotDetailKinds);
    run.kernelProductDetailDensity = diffSemanticRuntimeDetailDensityRows(
      kernelAfterQueries.productDetailDensity,
      kernelBeforeQueries.productDetailDensity,
    );
    run.kernelHotDetailDensity = diffSemanticRuntimeDetailDensityRows(
      kernelAfterQueries.hotDetailDensity,
      kernelBeforeQueries.hotDetailDensity,
    );
    run.kernelSidecarIndexes = kernelAfterQueries.sidecarIndexes ?? [];
    run.kernelRecordKindHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterQueries.recordKindHandleCharacters, kernelBeforeQueries.recordKindHandleCharacters);
    run.kernelProductKindHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterQueries.productKindHandleCharacters, kernelBeforeQueries.productKindHandleCharacters);
    run.kernelSourceSpanRoleHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterQueries.sourceSpanRoleHandleCharacters, kernelBeforeQueries.sourceSpanRoleHandleCharacters);
  }
  return run;
}

async function profileRoutedQueryBatch(run, runtime, appCandidate, depth, profile, runMemoryBefore) {
  collectIfRequested();
  run.constructionMemory = diffSemanticRuntimeMemorySamples(readSemanticRuntimeMemorySample(), runMemoryBefore);
  const kernelBeforeQueries = runtime.workspace.store.readTelemetrySnapshot({
    includeBreakdowns: captureKernelBreakdowns,
    includeDetailDensity: captureDetailDensity,
  });
  collectIfRequested();
  const queryMemoryBefore = readSemanticRuntimeMemorySample();
  const queries = queriesForProfile(profile);
  for (let queryIteration = 0; queryIteration < queryRepeatCount; queryIteration += 1) {
    const queryResult = await measureRoutedQueryBatch(runtime, appCandidate, depth, profile, queries, queryIteration);
    run.queries.push(queryResult);
    run.appWorldOpened = run.appWorldOpened === true
      || (!queryResult.retainedAnswerHit && queryResult.appWorldOpened !== false);
    if (queryResult.retainedAnswerHit) {
      continue;
    }
    if (queryResult.appWorldOpened !== false) {
      recordRoutedAppProfileSummary(run, queryResult.appProfile);
      recordRoutedAppQueryClaimProfiles(run, queryResult.appQueryClaimProfiles);
    } else {
      recordRoutedAppWorldFreeProfileSummary(run, queryResult.appWorldFreeProfile);
    }
    if (
      queryResult.kernel.totalRecords !== 0
      || queryResult.kernel.products !== 0
      || queryResult.kernel.provenance !== 0
    ) {
      run.warnings.push(
        `routed query batch repeat ${queryIteration + 1}/${queryRepeatCount} retained kernel: records=${queryResult.kernel.totalRecords}, products=${queryResult.kernel.products}, provenance=${queryResult.kernel.provenance}`,
      );
    }
  }
  collectIfRequested();
  run.queryMemory = diffSemanticRuntimeMemorySamples(readSemanticRuntimeMemorySample(), queryMemoryBefore);
  const cache = runtime.analysisCacheOverview(typeSystemDependencyCacheOverviewRequest());
  run.queryClaimGraph = cache.value.runtimeQueryClaimProfiles
    .find((entry) => entry.inquiryProfile === profile)?.queryClaims
    ?? null;
  run.projectCompilerOptionsCache = cache.value.projectCompilerOptionsCache;
  run.typeSystemDependencyCache = cache.value.typeSystemDependencyCache;
  applyTypeSystemDependencyCacheClear(run, runtime);
  const kernelAfterQueries = runtime.workspace.store.readTelemetrySnapshot({
    includeBreakdowns: captureKernelBreakdowns,
    includeDetailDensity: captureDetailDensity,
  });
  run.finalKernel = kernelAfterQueries;
  run.kernelGrowth = diffSemanticRuntimeKernelCounts(kernelAfterQueries, kernelBeforeQueries);
  if (captureKernelBreakdowns) {
    run.kernelProductKinds = diffSemanticRuntimeCountRows(kernelAfterQueries.productKinds, kernelBeforeQueries.productKinds);
    run.kernelRecordKinds = diffSemanticRuntimeCountRows(kernelAfterQueries.recordKinds, kernelBeforeQueries.recordKinds);
    run.kernelSourceSpanRoles = diffSemanticRuntimeCountRows(kernelAfterQueries.sourceSpanRoles, kernelBeforeQueries.sourceSpanRoles);
    run.kernelSourceFileRoles = diffSemanticRuntimeCountRows(kernelAfterQueries.sourceFileRoles, kernelBeforeQueries.sourceFileRoles);
    run.kernelProductDetailKinds = diffSemanticRuntimeCountRows(kernelAfterQueries.productDetailKinds, kernelBeforeQueries.productDetailKinds);
    run.kernelHotDetailKinds = diffSemanticRuntimeCountRows(kernelAfterQueries.hotDetailKinds, kernelBeforeQueries.hotDetailKinds);
    run.kernelProductDetailDensity = diffSemanticRuntimeDetailDensityRows(
      kernelAfterQueries.productDetailDensity,
      kernelBeforeQueries.productDetailDensity,
    );
    run.kernelHotDetailDensity = diffSemanticRuntimeDetailDensityRows(
      kernelAfterQueries.hotDetailDensity,
      kernelBeforeQueries.hotDetailDensity,
    );
    run.kernelSidecarIndexes = kernelAfterQueries.sidecarIndexes ?? [];
    run.kernelRecordKindHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterQueries.recordKindHandleCharacters, kernelBeforeQueries.recordKindHandleCharacters);
    run.kernelProductKindHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterQueries.productKindHandleCharacters, kernelBeforeQueries.productKindHandleCharacters);
    run.kernelSourceSpanRoleHandleCharacters = diffSemanticRuntimeCountRows(kernelAfterQueries.sourceSpanRoleHandleCharacters, kernelBeforeQueries.sourceSpanRoleHandleCharacters);
  }
  return run;
}

function selectAppCandidate(appCandidates) {
  if (appCandidates.length === 0) {
    return null;
  }
  return [...appCandidates].sort((left, right) => left.projectKey.localeCompare(right.projectKey))[0];
}

function recordAppProfile(run, profile) {
  if (profile == null) {
    run.warnings.push('app emission has no profile');
    return;
  }
  run.timings.push({ label: 'app.profile.total', milliseconds: profile.totalMilliseconds });
  run.topPhases = [...(profile.phases ?? [])]
    .sort((left, right) => phaseSortMilliseconds(right) - phaseSortMilliseconds(left) || left.name.localeCompare(right.name))
    .slice(0, 8)
    .map((phase) => ({
      label: phase.name,
      milliseconds: phase.milliseconds,
      exclusiveMilliseconds: phase.exclusiveMilliseconds ?? phase.milliseconds,
      itemCount: phase.itemCount ?? null,
    }));
  run.topPhaseMemory = [...(profile.phases ?? [])]
    .filter((phase) => phase.memory?.delta != null)
    .sort((left, right) => Math.abs(right.memory.delta.heapUsedBytes) - Math.abs(left.memory.delta.heapUsedBytes))
    .slice(0, 6)
    .map((phase) => ({
      label: phase.name,
      heapUsed: phase.memory.delta.heapUsedBytes,
      rss: phase.memory.delta.rssBytes,
    }));
  run.topPhaseKernel = [...(profile.phases ?? [])]
    .filter((phase) => phase.kernel?.delta != null)
    .sort((left, right) => Math.abs(right.kernel.delta.totalRecords) - Math.abs(left.kernel.delta.totalRecords))
    .slice(0, 6)
    .map((phase) => ({
      label: phase.name,
      records: phase.kernel.delta.totalRecords,
      products: phase.kernel.delta.products,
      provenance: phase.kernel.delta.provenance,
      sourceSpanRoles: phaseCountRows(phase, 'sourceSpanRoles', 3),
      productKinds: phaseCountRows(phase, 'productKinds', 3),
      productDetails: phaseCountRows(phase, 'productDetailKinds', 3),
      hotDetails: phaseCountRows(phase, 'hotDetailKinds', 3),
      productDetailDensity: phaseDetailDensityRows(phase, 'productDetailDensity', 2),
      hotDetailDensity: phaseDetailDensityRows(phase, 'hotDetailDensity', 2),
    }));
}

function recordRoutedAppProfileSummary(run, profile) {
  if (profile == null) {
    run.warnings.push('routed batch answer did not expose app profile');
    return;
  }
  run.timings.push({ label: 'app.profile.total', milliseconds: profile.totalMilliseconds });
  run.topPhases = routedPhaseSummaryRows(profile.topPhases);
  run.topPhaseMemory = routedPhaseMemoryRows(profile.topPhases);
  run.topPhaseKernel = routedPhaseKernelRows(profile.topPhases);
  run.staticEvaluationPhases = routedPhaseSummaryRows(profile.staticEvaluationPhases);
  run.staticEvaluationHost = profile.staticEvaluationHost ?? null;
  run.staticEvaluationSources = profile.staticEvaluationSources ?? null;
  run.typeSystemPhases = routedPhaseSummaryRows(profile.typeSystemPhases);
  run.resourceRecognitionPhases = routedPhaseSummaryRows(profile.resourceRecognitionPhases);
  run.templatePhases = routedPhaseSummaryRows(profile.templatePhases);
  run.topTemplatePhaseMemory = routedPhaseMemoryRows(profile.templatePhases);
  run.topTemplatePhaseKernel = routedPhaseKernelRows(profile.templatePhases);
  run.templateRuntimePhases = routedPhaseSummaryRows(profile.templateRuntimePhases);
  run.topTemplateRuntimePhaseMemory = routedPhaseMemoryRows(profile.templateRuntimePhases);
  run.topTemplateRuntimePhaseKernel = routedPhaseKernelRows(profile.templateRuntimePhases);
  run.templateExpressionCache = aggregateExpressionTypeCaches(
    profile.templateExpressionTypeCache == null ? [] : [profile.templateExpressionTypeCache],
  );
  run.typeSystemCompilerOptions = profile.compilerOptions ?? null;
  run.typeSystemHostSourceFileCache = profile.hostSourceFileCache ?? null;
  run.typeSystemProgramRootFiles = profile.programRootFiles ?? null;
  run.typeSystemProgramSourceFiles = profile.programSourceFiles ?? null;
  run.typeSystemProgramRootFileGroups = profile.programRootFileGroups ?? [];
  run.typeSystemProgramSourceFileGroups = profile.programSourceFileGroups ?? [];
  run.typeSystemProgramNodeRemaps = profile.programNodeRemaps ?? null;
}

function recordRoutedAppWorldFreeProfileSummary(run, profile) {
  if (profile == null) {
    return;
  }
  run.timings.push({ label: 'app-world-free.profile.total', milliseconds: profile.totalMilliseconds });
  run.staticEvaluationPhases = routedPhaseSummaryRows(profile.staticEvaluationPhases);
  run.staticEvaluationHost = profile.staticEvaluationHost ?? null;
  run.staticEvaluationSources = profile.staticEvaluationSources ?? null;
}

function recordRoutedAppQueryClaimProfiles(run, profiles) {
  for (const entry of profiles ?? []) {
    const row = {
      inquiryProfile: entry.inquiryProfile,
      queryClaims: entry.queryClaims,
    };
    const existingIndex = run.appQueryClaimGraphs.findIndex((candidate) =>
      candidate.inquiryProfile === entry.inquiryProfile
    );
    if (existingIndex >= 0) {
      run.appQueryClaimGraphs[existingIndex] = row;
    } else {
      run.appQueryClaimGraphs.push(row);
    }
  }
}

function routedPhaseSummaryRows(phases) {
  return [...(phases ?? [])]
    .map((phase) => ({
      label: phase.name,
      milliseconds: phase.milliseconds,
      exclusiveMilliseconds: phase.exclusiveMilliseconds ?? phase.milliseconds,
      itemCount: phase.itemCount ?? null,
    }));
}

function routedPhaseMemoryRows(phases) {
  return [...(phases ?? [])]
    .filter((phase) => phase.memory != null)
    .map((phase) => ({
      label: phase.name,
      heapUsed: phase.memory.heapUsedBytes,
      rss: phase.memory.rssBytes,
    }))
    .sort((left, right) => Math.abs(right.heapUsed) - Math.abs(left.heapUsed))
    .slice(0, 8);
}

function routedPhaseKernelRows(phases) {
  return [...(phases ?? [])]
    .filter((phase) => phase.kernel != null)
    .map((phase) => ({
      label: phase.name,
      records: phase.kernel.totalRecords,
      products: phase.kernel.products,
      provenance: phase.kernel.provenance,
      sourceSpanRoles: phase.kernel.sourceSpanRoles ?? [],
      productKinds: phase.kernel.productKinds ?? [],
      productDetails: phase.kernel.productDetailKinds ?? [],
      hotDetails: phase.kernel.hotDetailKinds ?? [],
      productDetailDensity: phase.kernel.productDetailDensity ?? [],
      hotDetailDensity: phase.kernel.hotDetailDensity ?? [],
    }))
    .sort((left, right) => Math.abs(right.records) - Math.abs(left.records) || left.label.localeCompare(right.label))
    .slice(0, 8);
}

function recordStaticEvaluationProfile(run, profile) {
  if (profile == null) {
    run.warnings.push('static evaluation has no profile');
    return;
  }
  run.staticEvaluationPhases = [...(profile.phases ?? [])]
    .map((phase) => ({
      label: phase.name,
      milliseconds: phase.milliseconds,
      exclusiveMilliseconds: phase.exclusiveMilliseconds ?? phase.milliseconds,
      itemCount: phase.itemCount ?? null,
    }))
    .sort((left, right) => phaseSortMilliseconds(right) - phaseSortMilliseconds(left) || left.label.localeCompare(right.label));
  run.staticEvaluationHost = profile.sourceHost ?? null;
  run.staticEvaluationSources = profile.sourceFiles ?? null;
}

function recordTypeSystemProfile(run, profile) {
  run.timings.push({ label: 'type-system.profile.total', milliseconds: profile.totalMilliseconds });
  run.typeSystemPhases = [...(profile.phases ?? [])]
    .map((phase) => ({
      label: phase.name,
      milliseconds: phase.milliseconds,
      exclusiveMilliseconds: phase.exclusiveMilliseconds ?? phase.milliseconds,
      itemCount: phase.itemCount ?? null,
    }))
    .sort((left, right) => phaseSortMilliseconds(right) - phaseSortMilliseconds(left) || left.label.localeCompare(right.label));
  run.typeSystemCompilerOptions = profile.compilerOptions ?? null;
  run.typeSystemHostSourceFileCache = profile.hostSourceFileCache ?? null;
  run.typeSystemProgramRootFiles = profile.programRootFiles ?? null;
  run.typeSystemProgramSourceFiles = profile.programSourceFiles ?? null;
  run.typeSystemProgramRootFileGroups = profile.programRootFileGroups ?? [];
  run.typeSystemProgramSourceFileGroups = profile.programSourceFileGroups ?? [];
  run.typeSystemProgramNodeRemaps = profile.programNodeRemaps ?? null;
}

function recordResourceRecognitionProfile(run, profile) {
  if (profile == null) {
    run.warnings.push('resource recognition has no profile');
    return;
  }
  run.timings.push({ label: 'resource-recognition.profile.total', milliseconds: profile.totalMilliseconds });
  run.resourceRecognitionPhases = phaseTotals(profile.phases ?? [])
    .map((row) => ({
      label: row.label,
      milliseconds: row.milliseconds,
      exclusiveMilliseconds: row.exclusiveMilliseconds,
      itemCount: row.count,
    }))
    .sort((left, right) => phaseSortMilliseconds(right) - phaseSortMilliseconds(left) || left.label.localeCompare(right.label));
}

function recordTemplateProfile(run, profile) {
  if (profile == null) {
    run.warnings.push('template compilation has no profile');
    return;
  }
  run.timings.push({ label: 'template.profile.total', milliseconds: profile.totalMilliseconds });
  const totals = templatePhaseTotals(profile.phases ?? []);
  run.templatePhases = totals
    .map((row) => ({
      label: row.label,
      milliseconds: row.milliseconds,
      exclusiveMilliseconds: row.exclusiveMilliseconds,
      itemCount: row.count,
    }))
    .sort((left, right) => phaseSortMilliseconds(right) - phaseSortMilliseconds(left) || left.label.localeCompare(right.label));
  run.topTemplatePhaseMemory = totals
    .filter((row) => row.hasMemory)
    .sort((left, right) => Math.abs(right.heapUsed) - Math.abs(left.heapUsed))
    .slice(0, 8)
    .map((row) => ({
      label: row.label,
      heapUsed: row.heapUsed,
      rss: row.rss,
    }));
  run.topTemplatePhaseKernel = totals
    .filter((row) => row.hasKernel)
    .sort((left, right) => Math.abs(right.records) - Math.abs(left.records))
    .slice(0, 8)
    .map((row) => ({
      label: row.label,
      records: row.records,
      products: row.products,
      provenance: row.provenance,
      sourceSpanRoles: countMapRows(row.sourceSpanRoles).slice(0, 3),
      productKinds: countMapRows(row.productKinds).slice(0, 3),
      productDetails: countMapRows(row.productDetails).slice(0, 3),
      hotDetails: countMapRows(row.hotDetails).slice(0, 3),
      productDetailDensity: sortedDetailDensityRows([...row.productDetailDensity.values()]).slice(0, 2),
      hotDetailDensity: sortedDetailDensityRows([...row.hotDetailDensity.values()]).slice(0, 2),
    }));
}

function recordTemplateRuntimeProfiles(run, templates) {
  const runtimeProfiles = [
    ...templates.resources,
    ...templates.authoringResources,
  ].map((resource) => resource.runtimeAnalysis.profile).filter((profile) => profile != null);
  const phases = runtimeProfiles.flatMap((profile) => profile.phases ?? []);
  const totals = templatePhaseTotals(phases);
  run.templateExpressionCache = aggregateExpressionTypeCaches(
    runtimeProfiles.map((profile) => profile.expressionTypeCache).filter((cache) => cache != null),
  );
  run.templateRuntimePhases = totals
    .map((row) => ({
      label: row.label,
      milliseconds: row.milliseconds,
      exclusiveMilliseconds: row.exclusiveMilliseconds,
      itemCount: row.count,
    }))
    .sort((left, right) => phaseSortMilliseconds(right) - phaseSortMilliseconds(left) || left.label.localeCompare(right.label));
  run.topTemplateRuntimePhaseMemory = totals
    .filter((row) => row.hasMemory)
    .sort((left, right) => Math.abs(right.heapUsed) - Math.abs(left.heapUsed))
    .slice(0, 8)
    .map((row) => ({
      label: row.label,
      heapUsed: row.heapUsed,
      rss: row.rss,
    }));
  run.topTemplateRuntimePhaseKernel = totals
    .filter((row) => row.hasKernel)
    .sort((left, right) => Math.abs(right.records) - Math.abs(left.records))
    .slice(0, 8)
    .map((row) => ({
      label: row.label,
      records: row.records,
      products: row.products,
      provenance: row.provenance,
      sourceSpanRoles: countMapRows(row.sourceSpanRoles).slice(0, 3),
      productKinds: countMapRows(row.productKinds).slice(0, 3),
      productDetails: countMapRows(row.productDetails).slice(0, 3),
      hotDetails: countMapRows(row.hotDetails).slice(0, 3),
      productDetailDensity: sortedDetailDensityRows([...row.productDetailDensity.values()]).slice(0, 2),
      hotDetailDensity: sortedDetailDensityRows([...row.hotDetailDensity.values()]).slice(0, 2),
    }));
}

function aggregateExpressionTypeCaches(caches) {
  if (caches.length === 0) {
    return null;
  }
  const aggregate = {
    entries: 0,
    hits: 0,
    misses: 0,
    writes: 0,
    entriesByBucket: new Map(),
    hitsByBucket: new Map(),
    missesByBucket: new Map(),
    writesByBucket: new Map(),
  };
  for (const cache of caches) {
    aggregate.entries += cache.entries ?? 0;
    aggregate.hits += cache.hits ?? 0;
    aggregate.misses += cache.misses ?? 0;
    aggregate.writes += cache.writes ?? 0;
    addRecordCounts(aggregate.entriesByBucket, cache.entriesByBucket);
    addRecordCounts(aggregate.hitsByBucket, cache.hitsByBucket);
    addRecordCounts(aggregate.missesByBucket, cache.missesByBucket);
    addRecordCounts(aggregate.writesByBucket, cache.writesByBucket);
  }
  return aggregate;
}

function addRecordCounts(target, source) {
  for (const [key, value] of Object.entries(source ?? {})) {
    target.set(key, (target.get(key) ?? 0) + (value ?? 0));
  }
}

function phaseTotals(phases) {
  const rows = new Map();
  for (const phase of phases) {
    const row = rows.get(phase.name) ?? {
      label: phase.name,
      count: 0,
      milliseconds: 0,
      exclusiveMilliseconds: 0,
    };
    row.count += 1;
    row.milliseconds += phase.milliseconds;
    row.exclusiveMilliseconds += phase.exclusiveMilliseconds ?? phase.milliseconds;
    rows.set(phase.name, row);
  }
  return [...rows.values()];
}

function templatePhaseTotals(phases) {
  const rows = new Map();
  for (const phase of phases) {
    const row = rows.get(phase.name) ?? {
      label: phase.name,
      count: 0,
      milliseconds: 0,
      exclusiveMilliseconds: 0,
      hasMemory: false,
      heapUsed: 0,
      rss: 0,
      hasKernel: false,
      records: 0,
      products: 0,
      provenance: 0,
      sourceSpanRoles: new Map(),
      productKinds: new Map(),
      productDetails: new Map(),
      hotDetails: new Map(),
      productDetailDensity: new Map(),
      hotDetailDensity: new Map(),
    };
    row.count += 1;
    row.milliseconds += phase.milliseconds;
    row.exclusiveMilliseconds += phase.exclusiveMilliseconds ?? phase.milliseconds;
    if (phase.memory?.delta != null) {
      row.hasMemory = true;
      row.heapUsed += phase.memory.delta.heapUsedBytes;
      row.rss += phase.memory.delta.rssBytes;
    }
    if (phase.kernel?.delta != null) {
      row.hasKernel = true;
      row.records += phase.kernel.delta.totalRecords;
      row.products += phase.kernel.delta.products;
      row.provenance += phase.kernel.delta.provenance;
      addCountRows(row.sourceSpanRoles, phaseDiffRows(phase, 'sourceSpanRoles'));
      addCountRows(row.productKinds, phaseDiffRows(phase, 'productKinds'));
      addCountRows(row.productDetails, phaseDiffRows(phase, 'productDetailKinds'));
      addCountRows(row.hotDetails, phaseDiffRows(phase, 'hotDetailKinds'));
      addDetailDensityRows(row.productDetailDensity, phaseDiffDetailDensityRows(phase, 'productDetailDensity'));
      addDetailDensityRows(row.hotDetailDensity, phaseDiffDetailDensityRows(phase, 'hotDetailDensity'));
    }
    rows.set(phase.name, row);
  }
  return [...rows.values()];
}

function phaseDiffRows(phase, field) {
  if (Array.isArray(phase.kernel?.[field])) {
    return phase.kernel[field];
  }
  const after = phase.kernel?.after?.[field];
  const before = phase.kernel?.before?.[field];
  if (!Array.isArray(after) || !Array.isArray(before)) {
    return [];
  }
  return diffSemanticRuntimeCountRows(after, before);
}

function phaseDiffDetailDensityRows(phase, field) {
  const deltaRows = field === 'productDetailDensity'
    ? phase.kernel?.productDetailDensityDelta
    : phase.kernel?.hotDetailDensityDelta;
  if (Array.isArray(deltaRows)) {
    return deltaRows;
  }
  const after = phase.kernel?.after?.[field];
  const before = phase.kernel?.before?.[field];
  if (!Array.isArray(after) || !Array.isArray(before)) {
    return [];
  }
  return diffSemanticRuntimeDetailDensityRows(after, before);
}

function measureQuery(app, query, queryIteration = 0) {
  collectIfRequested();
  const retainedAnswerHitsBefore = queryRepeatCount > 1 ? app.queryClaims.snapshot().retainedAnswerHits : 0;
  const memoryBefore = readSemanticRuntimeMemorySample();
  const kernelBefore = app.runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: captureKernelBreakdowns });
  const started = performance.now();
  const answer = app.ask(query);
  const milliseconds = performance.now() - started;
  const kernelAfter = app.runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: captureKernelBreakdowns });
  collectIfRequested();
  const memoryAfter = readSemanticRuntimeMemorySample();
  return {
    label: queryLabel(query.kind, queryIteration),
    outcome: answer.outcome,
    milliseconds,
    payloadBytes: jsonByteLength(answer.value),
    rowCount: resultRowCount(answer.value),
    retainedAnswerHit: queryRepeatCount > 1 && app.queryClaims.snapshot().retainedAnswerHits > retainedAnswerHitsBefore,
    appWorldFreeProfile: answer.profile?.appWorldFreeProfile ?? null,
    memory: diffSemanticRuntimeMemorySamples(memoryAfter, memoryBefore),
    kernel: diffSemanticRuntimeKernelCounts(kernelAfter, kernelBefore),
    productKinds: captureKernelBreakdowns
      ? diffSemanticRuntimeCountRows(kernelAfter.productKinds, kernelBefore.productKinds)
      : [],
  };
}

async function measureRoutedQuery(runtime, appCandidate, depth, profile, query, queryIteration = 0) {
  collectIfRequested();
  const retainedAnswerHitsBefore = queryRepeatCount > 1
    ? runtimeQueryClaimRetainedAnswerHits(runtime, profile)
    : 0;
  const memoryBefore = readSemanticRuntimeMemorySample();
  const kernelBefore = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: captureKernelBreakdowns });
  const started = performance.now();
  const answer = await runtime.answerAppQuery({
    ...query,
    projectKey: appCandidate.projectKey,
    ...analysisDepthRequest(depth),
    includeAuthoringTemplates,
    includeAppProfile: true,
    includeAppQueryClaimProfiles: true,
    inquiryProfile: profile,
    appRetention: routedAppRetention,
    ...typeSystemDependencyCacheClearRequest(),
    telemetry: {
      inquiryProfile: profile,
      capturePhaseMemory,
      capturePhaseKernel,
      capturePhaseKernelBreakdowns,
      capturePhaseDetailDensity,
      captureFineGrainedPhases,
      captureKernelBreakdowns,
    },
  });
  const milliseconds = performance.now() - started;
  const kernelAfter = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: captureKernelBreakdowns });
  collectIfRequested();
  const memoryAfter = readSemanticRuntimeMemorySample();
  return {
    label: queryLabel(query.kind, queryIteration),
    outcome: answer.outcome,
    milliseconds,
    payloadBytes: jsonByteLength(answer.value),
    rowCount: resultRowCount(answer.value),
    retainedAnswerHit: queryRepeatCount > 1
      && runtimeQueryClaimRetainedAnswerHits(runtime, profile) > retainedAnswerHitsBefore,
    appWorldFreeProfile: answer.profile?.appWorldFreeProfile ?? null,
    memory: diffSemanticRuntimeMemorySamples(memoryAfter, memoryBefore),
    kernel: diffSemanticRuntimeKernelCounts(kernelAfter, kernelBefore),
    productKinds: captureKernelBreakdowns
      ? diffSemanticRuntimeCountRows(kernelAfter.productKinds, kernelBefore.productKinds)
      : [],
  };
}

async function measureRoutedQueryBatch(runtime, appCandidate, depth, profile, queries, queryIteration = 0) {
  collectIfRequested();
  const retainedAnswerHitsBefore = queryRepeatCount > 1
    ? runtimeQueryClaimRetainedAnswerHits(runtime, profile)
    : 0;
  const memoryBefore = readSemanticRuntimeMemorySample();
  const kernelBefore = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: captureKernelBreakdowns });
  const started = performance.now();
  const answer = await runtime.answerAppQueries({
    projectKey: appCandidate.projectKey,
    ...analysisDepthRequest(depth),
    includeAuthoringTemplates,
    inquiryProfile: profile,
    appRetention: routedAppRetention,
    ...typeSystemDependencyCacheClearRequest(),
    queries,
    telemetry: {
      inquiryProfile: profile,
      capturePhaseMemory,
      capturePhaseKernel,
      capturePhaseKernelBreakdowns,
      capturePhaseDetailDensity,
      captureFineGrainedPhases,
      captureKernelBreakdowns,
    },
  });
  const milliseconds = performance.now() - started;
  const kernelAfter = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: captureKernelBreakdowns });
  collectIfRequested();
  const memoryAfter = readSemanticRuntimeMemorySample();
  return {
    label: queryLabel('app-query-batch', queryIteration),
    outcome: answer.outcome,
    milliseconds,
    payloadBytes: jsonByteLength(answer.value),
    rowCount: resultRowCount(answer.value),
    retainedAnswerHit: queryRepeatCount > 1
      && runtimeQueryClaimRetainedAnswerHits(runtime, profile) > retainedAnswerHitsBefore,
    appWorldOpened: answer.value?.appWorldOpened ?? true,
    appProfile: answer.value?.appProfile ?? null,
    appQueryClaimProfiles: answer.value?.appQueryClaimProfiles ?? [],
    appWorldFreeProfile: answer.profile?.appWorldFreeProfile ?? null,
    memory: diffSemanticRuntimeMemorySamples(memoryAfter, memoryBefore),
    kernel: diffSemanticRuntimeKernelCounts(kernelAfter, kernelBefore),
    productKinds: captureKernelBreakdowns
      ? diffSemanticRuntimeCountRows(kernelAfter.productKinds, kernelBefore.productKinds)
      : [],
  };
}

function runtimeQueryClaimRetainedAnswerHits(runtime, profile) {
  const cache = runtime.analysisCacheOverview({ rowLimit: 0 });
  return cache.value.runtimeQueryClaimProfiles
    .find((entry) => entry.inquiryProfile === profile)
    ?.queryClaims.retainedAnswerHits
    ?? 0;
}

function queryLabel(kind, queryIteration) {
  return queryRepeatCount > 1
    ? `${kind}#${queryIteration + 1}`
    : kind;
}

async function measure(timings, label, read) {
  collectIfRequested();
  const started = performance.now();
  const value = await read();
  timings.push({ label, milliseconds: performance.now() - started });
  return value;
}

function queriesForProfile(profile) {
  const profileQueries = queryPresetForProfile(profile);
  if (selectedQueryKinds.length > 0) {
    return selectedQueryKinds.map((kind) =>
      profileQueries.find((candidate) => candidate.kind === kind) ?? query(kind)
    );
  }
  return profileQueries;
}

function queryPresetForProfile(profile) {
  switch (profile) {
    case 'lsp-cursor':
      return [
        query(SemanticAppQueryKind.Summary),
        query(SemanticAppQueryKind.TemplateDiagnostics),
        query(SemanticAppQueryKind.TemplateCompilations),
      ];
    case 'lsp-diagnostics':
      return [
        query(SemanticAppQueryKind.AppDiagnosticSummary),
        query(SemanticAppQueryKind.AppDiagnostics),
        query(SemanticAppQueryKind.TemplateDiagnostics),
        query(SemanticAppQueryKind.OpenSeamSummary),
      ];
    case 'mcp-orientation':
      return [
        query(SemanticAppQueryKind.Summary),
        query(SemanticAppQueryKind.AppOverview),
        query(SemanticAppQueryKind.RouterOverview),
        query(SemanticAppQueryKind.AppDiagnosticSummary, { diagnosticProjection: 'available-products' }),
        query(SemanticAppQueryKind.OpenSeamSummary),
      ];
    case 'mcp-authoring':
      return [
        query(SemanticAppQueryKind.AuthoringCatalog),
        query(SemanticAppQueryKind.AuthoringOrientation),
        query(SemanticAppQueryKind.AppOverview),
        query(SemanticAppQueryKind.ResourceDefinitions),
        query(SemanticAppQueryKind.AppDiagnostics),
      ];
    case 'aot':
      return [
        query(SemanticAppQueryKind.ResourceDefinitions),
        query(SemanticAppQueryKind.ResourceVisibility),
        query(SemanticAppQueryKind.TemplateCompilations),
        query(SemanticAppQueryKind.Routes),
        query(SemanticAppQueryKind.RouteTrees),
      ];
    case 'ssr':
      return [
        query(SemanticAppQueryKind.Summary),
        query(SemanticAppQueryKind.RouterOverview),
        query(SemanticAppQueryKind.Routes),
        query(SemanticAppQueryKind.ViewportAgents),
        query(SemanticAppQueryKind.ComponentAgents),
      ];
    case 'fixture':
      return [
        query(SemanticAppQueryKind.Summary),
        query(SemanticAppQueryKind.AppOverview),
        query(SemanticAppQueryKind.AppDiagnosticSummary),
        query(SemanticAppQueryKind.TemplateDiagnostics),
        query(SemanticAppQueryKind.RuntimeControllers),
        query(SemanticAppQueryKind.BindingValueChannels),
        query(SemanticAppQueryKind.BindingDataFlows),
      ];
    case 'exploration':
    default:
      return [
        query(SemanticAppQueryKind.Summary),
        query(SemanticAppQueryKind.AppOverview),
        query(SemanticAppQueryKind.AppDiagnosticSummary),
        query(SemanticAppQueryKind.OpenSeamSummary),
        query(SemanticAppQueryKind.RouterOverview),
        query(SemanticAppQueryKind.TemplateDiagnostics),
        query(SemanticAppQueryKind.RuntimeControllers),
        query(SemanticAppQueryKind.BindingTargetAccesses),
        query(SemanticAppQueryKind.BindingValueChannels),
        query(SemanticAppQueryKind.BindingDataFlows),
      ];
  }
}

function query(kind, options = {}) {
  const row = semanticAppQueryCatalogRow(kind);
  const request = { kind, ...options };
  switch (row.pagingKind) {
    case 'offset-cursor':
    case 'continuation-cursor':
      request.page = { size: queryPageSize };
      break;
    case 'row-sample':
      if (rowSampleSize > 0) {
        request.page = { size: rowSampleSize };
      }
      break;
  }
  return request;
}

function createAggregate() {
  return {
    groups: new Map(),
    runs: 0,
    timings: new Map(),
    phaseMemory: new Map(),
    templatePhaseMemory: new Map(),
    templateRuntimePhaseMemory: new Map(),
    phaseKernel: new Map(),
    templatePhaseKernel: new Map(),
    templateRuntimePhaseKernel: new Map(),
    queries: new Map(),
    memory: {
      constructionHeapUsed: 0,
      constructionHeapTotal: 0,
      constructionRss: 0,
      constructionExternal: 0,
      constructionArrayBuffers: 0,
      constructionRssOther: 0,
      constructionV8HeapPhysical: 0,
      constructionV8HeapAvailable: 0,
      constructionV8MallocedMemory: 0,
      constructionV8PeakMallocedMemory: 0,
      constructionV8ExternalMemory: 0,
      constructionV8NativeContexts: 0,
      constructionV8DetachedContexts: 0,
      queryHeapUsed: 0,
      queryHeapTotal: 0,
      queryRss: 0,
      queryExternal: 0,
      queryArrayBuffers: 0,
      queryRssOther: 0,
      queryV8HeapPhysical: 0,
      queryV8HeapAvailable: 0,
      queryV8MallocedMemory: 0,
      queryV8PeakMallocedMemory: 0,
      queryV8ExternalMemory: 0,
      queryV8NativeContexts: 0,
      queryV8DetachedContexts: 0,
    },
    kernel: {
      totalRecords: 0,
      products: 0,
      provenance: 0,
      addresses: 0,
      identities: 0,
      claims: 0,
      hotDetails: 0,
      handleCharacters: 0,
      productKinds: new Map(),
      recordKinds: new Map(),
      sourceSpanRoles: new Map(),
      sourceFileRoles: new Map(),
      productDetailKinds: new Map(),
      hotDetailKinds: new Map(),
      productDetailDensity: new Map(),
      hotDetailDensity: new Map(),
      recordKindHandleCharacters: new Map(),
      productKindHandleCharacters: new Map(),
      sourceSpanRoleHandleCharacters: new Map(),
    },
    queryClaims: createQueryClaimAggregate(),
    appQueryClaims: createQueryClaimAggregate(),
    typeShapeDuplicates: new Map(),
    staticEvaluationHost: createStaticEvaluationHostAggregate(),
    typeSystemHostSourceFileCache: {
      hits: 0,
      hitSourceTextCharacters: 0,
      misses: 0,
      writes: 0,
      writeSourceTextCharacters: 0,
      bypasses: 0,
      cacheableNodeModuleReads: 0,
      cacheableExternalDeclarationReads: 0,
      bypassFreshSourceFileReads: 0,
      bypassProjectSourceReads: 0,
      bypassExternalSourceReads: 0,
      clearOperations: 0,
      clearedEntries: 0,
      clearedSourceTextCharacters: 0,
      clearedNodeModuleEntries: 0,
      clearedNodeModuleSourceTextCharacters: 0,
      clearedDeclarationEntries: 0,
      clearedDeclarationSourceTextCharacters: 0,
      clearedDefaultLibraryEntries: 0,
      clearedDefaultLibrarySourceTextCharacters: 0,
      clearedExternalDeclarationEntries: 0,
      clearedExternalDeclarationSourceTextCharacters: 0,
    },
    projectCompilerOptionsCache: {
      maxEntries: 0,
      maxHits: 0,
      maxMisses: 0,
      maxWrites: 0,
      maxClearOperations: 0,
      maxClearedEntries: 0,
      maxPathMappingCount: 0,
      maxPathMappingTargetCount: 0,
    },
    typeSystemDependencyCache: createTypeSystemDependencyCacheAggregate(),
    typeSystemDependencyCacheClear: {
      operations: 0,
      files: 0,
      sourceTextCharacters: 0,
      nodeModuleFiles: 0,
      nodeModuleSourceTextCharacters: 0,
      declarationFiles: 0,
      declarationSourceTextCharacters: 0,
      defaultLibraryFiles: 0,
      defaultLibrarySourceTextCharacters: 0,
      externalDeclarationFiles: 0,
      externalDeclarationSourceTextCharacters: 0,
      policies: new Map(),
    },
    typeSystemDependencyCacheAfterClear: createTypeSystemDependencyCacheAggregate(),
    typeSystemProgramRootFiles: createProgramSourceFileAggregate(),
    typeSystemProgramSourceFiles: createProgramSourceFileAggregate(),
    typeSystemProgramRootFileGroups: new Map(),
    typeSystemProgramSourceFileGroups: new Map(),
    typeSystemProgramNodeRemaps: createProgramNodeRemapAggregate(),
    warnings: new Map(),
  };
}

function createProgramNodeRemapAggregate() {
  return {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    sameSourceHits: 0,
    spanHits: 0,
    sourceFileMisses: 0,
    spanMisses: 0,
  };
}

function createProgramSourceFileAggregate() {
  return {
    total: 0,
    evaluatedSources: 0,
    ambientSources: 0,
    projectSources: 0,
    nodeModuleSources: 0,
    declarationSources: 0,
    defaultLibrarySources: 0,
    externalSources: 0,
    sourceTextCharacters: 0,
    evaluatedSourceTextCharacters: 0,
    ambientSourceTextCharacters: 0,
    projectSourceTextCharacters: 0,
    nodeModuleSourceTextCharacters: 0,
    declarationSourceTextCharacters: 0,
    defaultLibrarySourceTextCharacters: 0,
    externalSourceTextCharacters: 0,
  };
}

function createTypeSystemDependencyCacheAggregate() {
  return {
    maxEntries: 0,
    maxDistinctCanonicalPaths: 0,
    maxDuplicateCanonicalPathEntries: 0,
    maxSourceTextCharacters: 0,
    maxHits: 0,
    maxHitSourceTextCharacters: 0,
    maxMisses: 0,
    maxWrites: 0,
    maxWriteSourceTextCharacters: 0,
    maxNodeModuleEntries: 0,
    maxNodeModuleSourceTextCharacters: 0,
    maxDeclarationEntries: 0,
    maxDeclarationSourceTextCharacters: 0,
    maxDefaultLibraryEntries: 0,
    maxDefaultLibrarySourceTextCharacters: 0,
    maxExternalDeclarationEntries: 0,
    maxExternalDeclarationSourceTextCharacters: 0,
    parseOptions: new Map(),
    duplicateParseOptionSets: new Map(),
    maxClearOperations: 0,
    maxClearedEntries: 0,
    maxClearedSourceTextCharacters: 0,
    maxClearedDefaultLibraryEntries: 0,
    maxClearedDefaultLibrarySourceTextCharacters: 0,
    maxClearedExternalDeclarationEntries: 0,
    maxClearedExternalDeclarationSourceTextCharacters: 0,
    largestEntries: [],
  };
}

function createQueryClaimAggregate() {
  return {
    createdRecords: 0,
    retainedRecords: 0,
    records: 0,
    pending: 0,
    answered: 0,
    failed: 0,
    disposed: 0,
    projectionOnly: 0,
    queryTypeProjection: 0,
    staticCatalog: 0,
    rootRecords: 0,
    childRecords: 0,
    maxDepth: 0,
    retainedDependencyEdges: 0,
    distinctParentClaimIds: 0,
    approximatePayloadBytes: 0,
    retainedAnswerBytes: 0,
    retainedAnswerValues: 0,
    retainedAnswerHits: 0,
    retainedQueryKeyCharacters: 0,
    retainedLocusKeyCharacters: 0,
    retainedEpochKeyCharacters: 0,
    retainedOutcomeKeyCharacters: 0,
    budgetDisposedRecords: 0,
    budgetDisposedAnswerValues: 0,
    budgetDisposedAnswerBytes: 0,
    rows: 0,
    rootKernelRecordDelta: 0,
    rootKernelProductDelta: 0,
    rootKernelProductDetailDelta: 0,
    rootKernelHotDetailDelta: 0,
    rootKernelHandleCharacterDelta: 0,
    allKernelRecordDelta: 0,
    allKernelProductDelta: 0,
    allKernelProductDetailDelta: 0,
    allKernelHotDetailDelta: 0,
    allKernelHandleCharacterDelta: 0,
    disposedKernelRecords: 0,
    disposedProductDetails: 0,
    disposedHotDetails: 0,
    disposedKernelHandleCharacters: 0,
    disposedQueryClaimRecords: 0,
    clearedTypeSystemDependencySourceFiles: 0,
    clearedTypeSystemDependencySourceTextCharacters: 0,
    clearedTypeSystemDependencyNodeModuleSourceFiles: 0,
    clearedTypeSystemDependencyNodeModuleSourceTextCharacters: 0,
    clearedTypeSystemDependencyDeclarationSourceFiles: 0,
    clearedTypeSystemDependencyDeclarationSourceTextCharacters: 0,
    clearedTypeSystemDependencyDefaultLibrarySourceFiles: 0,
    clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters: 0,
    clearedTypeSystemDependencyExternalDeclarationSourceFiles: 0,
    clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters: 0,
    netKernelRecordDelta: 0,
    netProductDetailDelta: 0,
    netHotDetailDelta: 0,
    netKernelHandleCharacterDelta: 0,
    retentionKinds: new Map(),
    answerLocalKernelPolicies: new Map(),
  };
}

function addToAggregate(aggregate, run, options = {}) {
  aggregate.runs += 1;
  addTimings(aggregate.timings, run.timings);
  addTimings(aggregate.timings, run.topPhases.map((phase) => ({
    label: `phase:${phase.label}`,
    milliseconds: phase.milliseconds,
  })));
  addTimings(aggregate.timings, run.templatePhases.map((phase) => ({
    label: `template-phase:${phase.label}`,
    milliseconds: phase.milliseconds,
  })));
  addTimings(aggregate.timings, run.templateRuntimePhases.map((phase) => ({
    label: `template-runtime-phase:${phase.label}`,
    milliseconds: phase.milliseconds,
  })));
  addTimings(aggregate.timings, run.staticEvaluationPhases.map((phase) => ({
    label: `static-evaluation-phase:${phase.label}`,
    milliseconds: phase.milliseconds,
  })));
  addTimings(aggregate.timings, run.typeSystemPhases.map((phase) => ({
    label: `type-system-phase:${phase.label}`,
    milliseconds: phase.milliseconds,
  })));
  addTimings(aggregate.timings, run.resourceRecognitionPhases.map((phase) => ({
    label: `resource-recognition-phase:${phase.label}`,
    milliseconds: phase.milliseconds,
  })));
  addPhaseMemoryRows(aggregate.phaseMemory, run.topPhaseMemory);
  addPhaseMemoryRows(aggregate.templatePhaseMemory, run.topTemplatePhaseMemory);
  addPhaseMemoryRows(aggregate.templateRuntimePhaseMemory, run.topTemplateRuntimePhaseMemory);
  addPhaseKernelRows(aggregate.phaseKernel, run.topPhaseKernel);
  addPhaseKernelRows(aggregate.templatePhaseKernel, run.topTemplatePhaseKernel);
  addPhaseKernelRows(aggregate.templateRuntimePhaseKernel, run.topTemplateRuntimePhaseKernel);
  addMemory(aggregate.memory, 'construction', run.constructionMemory);
  addMemory(aggregate.memory, 'query', run.queryMemory);
  addKernel(aggregate.kernel, run.kernelGrowth);
  addCountRows(aggregate.kernel.productKinds, run.kernelProductKinds);
  addCountRows(aggregate.kernel.recordKinds, run.kernelRecordKinds);
  addCountRows(aggregate.kernel.sourceSpanRoles, run.kernelSourceSpanRoles);
  addCountRows(aggregate.kernel.sourceFileRoles, run.kernelSourceFileRoles);
  addCountRows(aggregate.kernel.productDetailKinds, run.kernelProductDetailKinds);
  addCountRows(aggregate.kernel.hotDetailKinds, run.kernelHotDetailKinds);
  addDetailDensityRows(aggregate.kernel.productDetailDensity, run.kernelProductDetailDensity);
  addDetailDensityRows(aggregate.kernel.hotDetailDensity, run.kernelHotDetailDensity);
  addCountRows(aggregate.kernel.recordKindHandleCharacters, run.kernelRecordKindHandleCharacters);
  addCountRows(aggregate.kernel.productKindHandleCharacters, run.kernelProductKindHandleCharacters);
  addCountRows(aggregate.kernel.sourceSpanRoleHandleCharacters, run.kernelSourceSpanRoleHandleCharacters);
  addQueryClaims(aggregate.queryClaims, run.queryClaimGraph);
  for (const appQueryClaims of run.appQueryClaimGraphs) {
    addQueryClaims(aggregate.appQueryClaims, appQueryClaims.queryClaims);
  }
  addTypeShapeDuplicates(aggregate.typeShapeDuplicates, run.typeShapeDuplicates);
  addStaticEvaluationHost(aggregate.staticEvaluationHost, run.staticEvaluationHost);
  addHostSourceFileCache(aggregate.typeSystemHostSourceFileCache, run.typeSystemHostSourceFileCache);
  addProjectCompilerOptionsCache(aggregate.projectCompilerOptionsCache, run.projectCompilerOptionsCache);
  addTypeSystemDependencyCache(aggregate.typeSystemDependencyCache, run.typeSystemDependencyCache);
  addTypeSystemDependencyCacheClear(aggregate.typeSystemDependencyCacheClear, run.typeSystemDependencyCacheClear);
  addTypeSystemDependencyCache(aggregate.typeSystemDependencyCacheAfterClear, run.typeSystemDependencyCacheAfterClear);
  addProgramSourceFiles(aggregate.typeSystemProgramRootFiles, run.typeSystemProgramRootFiles);
  addProgramSourceFiles(aggregate.typeSystemProgramSourceFiles, run.typeSystemProgramSourceFiles);
  addProgramSourceFileGroups(aggregate.typeSystemProgramRootFileGroups, run.typeSystemProgramRootFileGroups);
  addProgramSourceFileGroups(aggregate.typeSystemProgramSourceFileGroups, run.typeSystemProgramSourceFileGroups);
  addProgramNodeRemaps(aggregate.typeSystemProgramNodeRemaps, run.typeSystemProgramNodeRemaps);
  for (const queryResult of run.queries) {
    const current = aggregate.queries.get(queryResult.label) ?? {
      count: 0,
      milliseconds: 0,
      payloadBytes: 0,
      rows: 0,
      heapUsed: 0,
      kernelRecords: 0,
      kernelProducts: 0,
      retainedAnswerHits: 0,
      productKinds: new Map(),
    };
    current.count += 1;
    current.milliseconds += queryResult.milliseconds;
    current.payloadBytes += queryResult.payloadBytes;
    current.rows += queryResult.rowCount;
    current.heapUsed += queryResult.memory.heapUsedBytes;
    current.kernelRecords += queryResult.kernel.totalRecords;
    current.kernelProducts += queryResult.kernel.products;
    current.retainedAnswerHits += queryResult.retainedAnswerHit ? 1 : 0;
    addCountRows(current.productKinds, queryResult.productKinds);
    aggregate.queries.set(queryResult.label, current);
  }
  for (const warning of run.warnings) {
    aggregate.warnings.set(warning, (aggregate.warnings.get(warning) ?? 0) + 1);
  }
  if (options.includeGroups !== false) {
    addAggregateGroup(aggregate, run);
  }
}

function addAggregateGroup(aggregate, run) {
  const key = aggregateGroupKey(run);
  let group = aggregate.groups.get(key);
  if (group == null) {
    group = createAggregate();
    aggregate.groups.set(key, group);
  }
  addToAggregate(group, run, { includeGroups: false });
}

function aggregateGroupKey(run) {
  return `${run.rootLabel}; shape=${run.projectShape}; depth=${run.depth}; profile=${run.profile}`;
}

function addHostSourceFileCache(target, source) {
  if (source == null) {
    return;
  }
  target.hits += source.hits ?? 0;
  target.hitSourceTextCharacters += source.hitSourceTextCharacters ?? 0;
  target.misses += source.misses ?? 0;
  target.writes += source.writes ?? 0;
  target.writeSourceTextCharacters += source.writeSourceTextCharacters ?? 0;
  target.bypasses += source.bypasses ?? 0;
  target.cacheableNodeModuleReads += source.cacheableNodeModuleReads ?? 0;
  target.cacheableExternalDeclarationReads += source.cacheableExternalDeclarationReads ?? 0;
  target.bypassFreshSourceFileReads += source.bypassFreshSourceFileReads ?? 0;
  target.bypassProjectSourceReads += source.bypassProjectSourceReads ?? 0;
  target.bypassExternalSourceReads += source.bypassExternalSourceReads ?? 0;
  target.clearOperations += source.clearOperations ?? 0;
  target.clearedEntries += source.clearedEntries ?? 0;
  target.clearedSourceTextCharacters += source.clearedSourceTextCharacters ?? 0;
  target.clearedNodeModuleEntries += source.clearedNodeModuleEntries ?? 0;
  target.clearedNodeModuleSourceTextCharacters += source.clearedNodeModuleSourceTextCharacters ?? 0;
  target.clearedDeclarationEntries += source.clearedDeclarationEntries ?? 0;
  target.clearedDeclarationSourceTextCharacters += source.clearedDeclarationSourceTextCharacters ?? 0;
  target.clearedDefaultLibraryEntries += source.clearedDefaultLibraryEntries ?? 0;
  target.clearedDefaultLibrarySourceTextCharacters += source.clearedDefaultLibrarySourceTextCharacters ?? 0;
  target.clearedExternalDeclarationEntries += source.clearedExternalDeclarationEntries ?? 0;
  target.clearedExternalDeclarationSourceTextCharacters += source.clearedExternalDeclarationSourceTextCharacters ?? 0;
}

function addTypeSystemDependencyCache(target, source) {
  if (source == null) {
    return;
  }
  target.maxEntries = Math.max(target.maxEntries, source.entries ?? 0);
  target.maxDistinctCanonicalPaths = Math.max(target.maxDistinctCanonicalPaths, source.distinctCanonicalPaths ?? 0);
  target.maxDuplicateCanonicalPathEntries = Math.max(target.maxDuplicateCanonicalPathEntries, source.duplicateCanonicalPathEntries ?? 0);
  target.maxSourceTextCharacters = Math.max(target.maxSourceTextCharacters, source.sourceTextCharacters ?? 0);
  target.maxHits = Math.max(target.maxHits, source.hits ?? 0);
  target.maxHitSourceTextCharacters = Math.max(target.maxHitSourceTextCharacters, source.hitSourceTextCharacters ?? 0);
  target.maxMisses = Math.max(target.maxMisses, source.misses ?? 0);
  target.maxWrites = Math.max(target.maxWrites, source.writes ?? 0);
  target.maxWriteSourceTextCharacters = Math.max(target.maxWriteSourceTextCharacters, source.writeSourceTextCharacters ?? 0);
  target.maxNodeModuleEntries = Math.max(target.maxNodeModuleEntries, source.nodeModuleEntries ?? 0);
  target.maxNodeModuleSourceTextCharacters = Math.max(target.maxNodeModuleSourceTextCharacters, source.nodeModuleSourceTextCharacters ?? 0);
  target.maxDeclarationEntries = Math.max(target.maxDeclarationEntries, source.declarationEntries ?? 0);
  target.maxDeclarationSourceTextCharacters = Math.max(target.maxDeclarationSourceTextCharacters, source.declarationSourceTextCharacters ?? 0);
  target.maxDefaultLibraryEntries = Math.max(target.maxDefaultLibraryEntries, source.defaultLibraryEntries ?? 0);
  target.maxDefaultLibrarySourceTextCharacters = Math.max(target.maxDefaultLibrarySourceTextCharacters, source.defaultLibrarySourceTextCharacters ?? 0);
  target.maxExternalDeclarationEntries = Math.max(target.maxExternalDeclarationEntries, source.externalDeclarationEntries ?? 0);
  target.maxExternalDeclarationSourceTextCharacters = Math.max(target.maxExternalDeclarationSourceTextCharacters, source.externalDeclarationSourceTextCharacters ?? 0);
  addCountRows(target.parseOptions, source.parseOptions ?? []);
  addCountRows(target.duplicateParseOptionSets, source.duplicateParseOptionSets ?? []);
  addTypeSystemDependencyCacheLargestEntries(target, source.largestEntries ?? []);
  target.maxClearOperations = Math.max(target.maxClearOperations, source.clearOperations ?? 0);
  target.maxClearedEntries = Math.max(target.maxClearedEntries, source.clearedEntries ?? 0);
  target.maxClearedSourceTextCharacters = Math.max(target.maxClearedSourceTextCharacters, source.clearedSourceTextCharacters ?? 0);
  target.maxClearedDefaultLibraryEntries = Math.max(target.maxClearedDefaultLibraryEntries ?? 0, source.clearedDefaultLibraryEntries ?? 0);
  target.maxClearedDefaultLibrarySourceTextCharacters = Math.max(target.maxClearedDefaultLibrarySourceTextCharacters ?? 0, source.clearedDefaultLibrarySourceTextCharacters ?? 0);
  target.maxClearedExternalDeclarationEntries = Math.max(target.maxClearedExternalDeclarationEntries ?? 0, source.clearedExternalDeclarationEntries ?? 0);
  target.maxClearedExternalDeclarationSourceTextCharacters = Math.max(target.maxClearedExternalDeclarationSourceTextCharacters ?? 0, source.clearedExternalDeclarationSourceTextCharacters ?? 0);
}

function addProjectCompilerOptionsCache(target, source) {
  if (source == null) {
    return;
  }
  target.maxEntries = Math.max(target.maxEntries, source.entries ?? 0);
  target.maxHits = Math.max(target.maxHits, source.hits ?? 0);
  target.maxMisses = Math.max(target.maxMisses, source.misses ?? 0);
  target.maxWrites = Math.max(target.maxWrites, source.writes ?? 0);
  target.maxClearOperations = Math.max(target.maxClearOperations, source.clearOperations ?? 0);
  target.maxClearedEntries = Math.max(target.maxClearedEntries, source.clearedEntries ?? 0);
  target.maxPathMappingCount = Math.max(target.maxPathMappingCount, source.pathMappingCount ?? 0);
  target.maxPathMappingTargetCount = Math.max(target.maxPathMappingTargetCount, source.pathMappingTargetCount ?? 0);
}

function addTypeSystemDependencyCacheLargestEntries(target, entries) {
  if (entries.length === 0) {
    return;
  }
  target.largestEntries.push(...entries.map((entry) => ({
    bucket: entry.bucket,
    sourceTextCharacters: entry.sourceTextCharacters ?? 0,
  })));
  target.largestEntries.sort((left, right) =>
    right.sourceTextCharacters - left.sourceTextCharacters
    || left.bucket.localeCompare(right.bucket)
  );
  target.largestEntries.splice(20);
}

function addTypeSystemDependencyCacheClear(target, source) {
  if (source == null) {
    return;
  }
  target.operations += 1;
  target.files += source.clearedTypeSystemDependencySourceFiles ?? 0;
  target.sourceTextCharacters += source.clearedTypeSystemDependencySourceTextCharacters ?? 0;
  target.nodeModuleFiles += source.clearedTypeSystemDependencyNodeModuleSourceFiles ?? 0;
  target.nodeModuleSourceTextCharacters += source.clearedTypeSystemDependencyNodeModuleSourceTextCharacters ?? 0;
  target.declarationFiles += source.clearedTypeSystemDependencyDeclarationSourceFiles ?? 0;
  target.declarationSourceTextCharacters += source.clearedTypeSystemDependencyDeclarationSourceTextCharacters ?? 0;
  target.defaultLibraryFiles += source.clearedTypeSystemDependencyDefaultLibrarySourceFiles ?? 0;
  target.defaultLibrarySourceTextCharacters += source.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters ?? 0;
  target.externalDeclarationFiles += source.clearedTypeSystemDependencyExternalDeclarationSourceFiles ?? 0;
  target.externalDeclarationSourceTextCharacters += source.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters ?? 0;
  const policy = source.typeSystemDependencyCacheClearPolicy ?? 'preserve';
  target.policies.set(policy, (target.policies.get(policy) ?? 0) + 1);
}

function createStaticEvaluationHostAggregate() {
  return {
    sourceFiles: {
      cacheHits: 0,
      cacheMisses: 0,
      missingFiles: 0,
      readMilliseconds: 0,
      parseMilliseconds: 0,
      sourceBytes: 0,
    },
    moduleResolutions: {
      calls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      milliseconds: 0,
      postTypeScriptRelativePathProbeEnabled: 0,
      relativeCalls: 0,
      bareCalls: 0,
      querySuffixCalls: 0,
      assetSpecifierCalls: 0,
      extensionlessRelativeCalls: 0,
      emittedJavaScriptRelativeCalls: 0,
      frameworkExternalBoundaries: 0,
      packageExternalBoundaries: 0,
      typeScriptCalls: 0,
      typeScriptMilliseconds: 0,
      resolvedByTypeScript: 0,
      resolvedByPathProbe: 0,
      resolvedByPathProbeBeforeTypeScript: 0,
      resolvedByPathProbeAfterTypeScript: 0,
      unresolved: 0,
      pathProbeCalls: 0,
      pathProbeMilliseconds: 0,
      pathProbeBeforeTypeScript: 0,
      pathProbeBeforeTypeScriptMilliseconds: 0,
      pathProbeAfterTypeScript: 0,
      pathProbeAfterTypeScriptMilliseconds: 0,
      unresolvedRelative: 0,
      unresolvedBare: 0,
      declarationSourceHits: 0,
      declarationSourceMisses: 0,
      packagePolicyHits: 0,
      packagePolicyMisses: 0,
    },
    fileSystem: {
      fileExistsCalls: 0,
      fileExistsHits: 0,
      fileExistsMisses: 0,
      directoryExistsCalls: 0,
      directoryExistsHits: 0,
      directoryExistsMisses: 0,
      readFileCalls: 0,
      readFileHits: 0,
      readFileMisses: 0,
      realpathCalls: 0,
      realpathHits: 0,
      realpathMisses: 0,
      getDirectoriesCalls: 0,
      getDirectoriesHits: 0,
      getDirectoriesMisses: 0,
    },
  };
}

function addStaticEvaluationHost(target, source) {
  if (source == null) {
    return;
  }
  addNumberFields(target.sourceFiles, source.sourceFiles);
  addNumberFields(target.moduleResolutions, source.moduleResolutions);
  addNumberFields(target.fileSystem, source.fileSystem);
}

function addNumberFields(target, source) {
  if (source == null) {
    return;
  }
  for (const key of Object.keys(target)) {
    target[key] += source[key] ?? 0;
  }
}

function addProgramSourceFiles(target, source) {
  if (source == null) {
    return;
  }
  target.total += source.total ?? 0;
  target.evaluatedSources += source.evaluatedSources ?? 0;
  target.ambientSources += source.ambientSources ?? 0;
  target.projectSources += source.projectSources ?? 0;
  target.nodeModuleSources += source.nodeModuleSources ?? 0;
  target.declarationSources += source.declarationSources ?? 0;
  target.defaultLibrarySources += source.defaultLibrarySources ?? 0;
  target.externalSources += source.externalSources ?? 0;
  target.sourceTextCharacters += source.sourceTextCharacters ?? 0;
  target.evaluatedSourceTextCharacters += source.evaluatedSourceTextCharacters ?? 0;
  target.ambientSourceTextCharacters += source.ambientSourceTextCharacters ?? 0;
  target.projectSourceTextCharacters += source.projectSourceTextCharacters ?? 0;
  target.nodeModuleSourceTextCharacters += source.nodeModuleSourceTextCharacters ?? 0;
  target.declarationSourceTextCharacters += source.declarationSourceTextCharacters ?? 0;
  target.defaultLibrarySourceTextCharacters += source.defaultLibrarySourceTextCharacters ?? 0;
  target.externalSourceTextCharacters += source.externalSourceTextCharacters ?? 0;
}

function addProgramSourceFileGroups(target, source) {
  for (const row of source ?? []) {
    const key = `${row.groupKind}:${row.groupKey}`;
    const current = target.get(key) ?? {
      groupKind: row.groupKind,
      groupKey: row.groupKey,
      sourceFiles: 0,
      sourceTextCharacters: 0,
      declarationSources: 0,
      evaluatedSources: 0,
    };
    current.sourceFiles += row.sourceFiles ?? 0;
    current.sourceTextCharacters += row.sourceTextCharacters ?? 0;
    current.declarationSources += row.declarationSources ?? 0;
    current.evaluatedSources += row.evaluatedSources ?? 0;
    target.set(key, current);
  }
}

function addProgramNodeRemaps(target, source) {
  addNumberFields(target, source);
}

function addTimings(target, timings) {
  for (const timing of timings) {
    const current = target.get(timing.label) ?? { count: 0, milliseconds: 0 };
    current.count += 1;
    current.milliseconds += timing.milliseconds;
    target.set(timing.label, current);
  }
}

function addPhaseMemoryRows(target, rows) {
  for (const row of rows ?? []) {
    const current = target.get(row.label) ?? {
      label: row.label,
      sampleCount: 0,
      heapUsed: 0,
      rss: 0,
      maxAbsHeapUsed: 0,
      maxAbsRss: 0,
    };
    const heapUsed = row.heapUsed ?? 0;
    const rss = row.rss ?? 0;
    current.sampleCount += 1;
    current.heapUsed += heapUsed;
    current.rss += rss;
    current.maxAbsHeapUsed = Math.max(current.maxAbsHeapUsed, Math.abs(heapUsed));
    current.maxAbsRss = Math.max(current.maxAbsRss, Math.abs(rss));
    target.set(row.label, current);
  }
}

function addPhaseKernelRows(target, rows) {
  for (const row of rows ?? []) {
    const current = target.get(row.label) ?? {
      label: row.label,
      sampleCount: 0,
      records: 0,
      products: 0,
      provenance: 0,
      maxAbsRecords: 0,
      productKinds: new Map(),
      sourceSpanRoles: new Map(),
      productDetails: new Map(),
      hotDetails: new Map(),
      productDetailDensity: new Map(),
      hotDetailDensity: new Map(),
    };
    const records = row.records ?? 0;
    current.sampleCount += 1;
    current.records += records;
    current.products += row.products ?? 0;
    current.provenance += row.provenance ?? 0;
    current.maxAbsRecords = Math.max(current.maxAbsRecords, Math.abs(records));
    addCountRows(current.productKinds, row.productKinds);
    addCountRows(current.sourceSpanRoles, row.sourceSpanRoles);
    addCountRows(current.productDetails, row.productDetails);
    addCountRows(current.hotDetails, row.hotDetails);
    addDetailDensityRows(current.productDetailDensity, row.productDetailDensity);
    addDetailDensityRows(current.hotDetailDensity, row.hotDetailDensity);
    target.set(row.label, current);
  }
}

function addMemory(target, phase, memory) {
  if (memory == null) {
    return;
  }
  target[`${phase}HeapUsed`] += memory.heapUsedBytes;
  target[`${phase}HeapTotal`] += memory.heapTotalBytes;
  target[`${phase}Rss`] += memory.rssBytes;
  target[`${phase}External`] += memory.externalBytes;
  target[`${phase}ArrayBuffers`] += memory.arrayBuffersBytes;
  target[`${phase}RssOther`] += memory.rssOtherBytes;
  target[`${phase}V8HeapPhysical`] += memory.v8HeapPhysicalBytes;
  target[`${phase}V8HeapAvailable`] += memory.v8HeapAvailableBytes;
  target[`${phase}V8MallocedMemory`] += memory.v8MallocedMemoryBytes;
  target[`${phase}V8PeakMallocedMemory`] += memory.v8PeakMallocedMemoryBytes;
  target[`${phase}V8ExternalMemory`] += memory.v8ExternalMemoryBytes;
  target[`${phase}V8NativeContexts`] += memory.v8NativeContextCount;
  target[`${phase}V8DetachedContexts`] += memory.v8DetachedContextCount;
}

function addKernel(target, kernel) {
  if (kernel == null) {
    return;
  }
  target.totalRecords += kernel.totalRecords;
  target.products += kernel.products;
  target.provenance += kernel.provenance;
  target.addresses += kernel.addresses;
  target.identities += kernel.identities;
  target.claims += kernel.claims;
  target.hotDetails += kernel.hotDetails;
  target.handleCharacters += kernel.handleCharacters;
}

function addQueryClaims(target, queryClaims) {
  if (queryClaims == null) {
    return;
  }
  target.createdRecords += queryClaims.createdRecords ?? queryClaims.records;
  target.retainedRecords += queryClaims.retainedRecords ?? queryClaims.records;
  target.records += queryClaims.records;
  target.pending += queryClaims.pending;
  target.answered += queryClaims.answered;
  target.failed += queryClaims.failed ?? 0;
  target.disposed += queryClaims.disposed;
  target.projectionOnly += queryClaims.projectionOnly;
  target.queryTypeProjection += queryClaims.queryTypeProjection;
  target.staticCatalog += queryClaims.staticCatalog;
  target.rootRecords += queryClaims.rootRecords ?? queryClaims.records;
  target.childRecords += queryClaims.childRecords ?? 0;
  target.maxDepth = Math.max(target.maxDepth, queryClaims.maxDepth ?? 0);
  target.retainedDependencyEdges += queryClaims.retainedDependencyEdges ?? 0;
  target.distinctParentClaimIds += queryClaims.distinctParentClaimIds ?? 0;
  target.approximatePayloadBytes += queryClaims.approximatePayloadBytes;
  target.retainedAnswerBytes += queryClaims.retainedAnswerBytes;
  target.retainedAnswerValues += queryClaims.retainedAnswerValues;
  target.retainedAnswerHits += queryClaims.retainedAnswerHits ?? 0;
  target.retainedQueryKeyCharacters += queryClaims.retainedQueryKeyCharacters ?? 0;
  target.retainedLocusKeyCharacters += queryClaims.retainedLocusKeyCharacters ?? 0;
  target.retainedEpochKeyCharacters += queryClaims.retainedEpochKeyCharacters ?? 0;
  target.retainedOutcomeKeyCharacters += queryClaims.retainedOutcomeKeyCharacters ?? 0;
  target.budgetDisposedRecords += queryClaims.budgetDisposedRecords ?? 0;
  target.budgetDisposedAnswerValues += queryClaims.budgetDisposedAnswerValues ?? 0;
  target.budgetDisposedAnswerBytes += queryClaims.budgetDisposedAnswerBytes ?? 0;
  target.rows += queryClaims.rows;
  target.rootKernelRecordDelta += queryClaims.rootKernelRecordDelta ?? 0;
  target.rootKernelProductDelta += queryClaims.rootKernelProductDelta ?? 0;
  target.rootKernelProductDetailDelta += queryClaims.rootKernelProductDetailDelta ?? 0;
  target.rootKernelHotDetailDelta += queryClaims.rootKernelHotDetailDelta ?? 0;
  target.rootKernelHandleCharacterDelta += queryClaims.rootKernelHandleCharacterDelta ?? 0;
  target.allKernelRecordDelta += queryClaims.allKernelRecordDelta ?? 0;
  target.allKernelProductDelta += queryClaims.allKernelProductDelta ?? 0;
  target.allKernelProductDetailDelta += queryClaims.allKernelProductDetailDelta ?? 0;
  target.allKernelHotDetailDelta += queryClaims.allKernelHotDetailDelta ?? 0;
  target.allKernelHandleCharacterDelta += queryClaims.allKernelHandleCharacterDelta ?? 0;
  target.disposedKernelRecords += queryClaims.disposedKernelRecords ?? 0;
  target.disposedProductDetails += queryClaims.disposedProductDetails ?? 0;
  target.disposedHotDetails += queryClaims.disposedHotDetails ?? 0;
  target.disposedKernelHandleCharacters += queryClaims.disposedKernelHandleCharacters ?? 0;
  target.disposedQueryClaimRecords += queryClaims.disposedQueryClaimRecords ?? 0;
  target.clearedTypeSystemDependencySourceFiles += queryClaims.clearedTypeSystemDependencySourceFiles ?? 0;
  target.clearedTypeSystemDependencySourceTextCharacters += queryClaims.clearedTypeSystemDependencySourceTextCharacters ?? 0;
  target.clearedTypeSystemDependencyNodeModuleSourceFiles += queryClaims.clearedTypeSystemDependencyNodeModuleSourceFiles ?? 0;
  target.clearedTypeSystemDependencyNodeModuleSourceTextCharacters += queryClaims.clearedTypeSystemDependencyNodeModuleSourceTextCharacters ?? 0;
  target.clearedTypeSystemDependencyDeclarationSourceFiles += queryClaims.clearedTypeSystemDependencyDeclarationSourceFiles ?? 0;
  target.clearedTypeSystemDependencyDeclarationSourceTextCharacters += queryClaims.clearedTypeSystemDependencyDeclarationSourceTextCharacters ?? 0;
  target.clearedTypeSystemDependencyDefaultLibrarySourceFiles += queryClaims.clearedTypeSystemDependencyDefaultLibrarySourceFiles ?? 0;
  target.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters += queryClaims.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters ?? 0;
  target.clearedTypeSystemDependencyExternalDeclarationSourceFiles += queryClaims.clearedTypeSystemDependencyExternalDeclarationSourceFiles ?? 0;
  target.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters += queryClaims.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters ?? 0;
  target.netKernelRecordDelta += queryClaims.netKernelRecordDelta ?? ((queryClaims.rootKernelRecordDelta ?? 0) - (queryClaims.disposedKernelRecords ?? 0));
  target.netProductDetailDelta += queryClaims.netProductDetailDelta ?? ((queryClaims.rootKernelProductDetailDelta ?? 0) - (queryClaims.disposedProductDetails ?? 0));
  target.netHotDetailDelta += queryClaims.netHotDetailDelta ?? ((queryClaims.rootKernelHotDetailDelta ?? 0) - (queryClaims.disposedHotDetails ?? 0));
  target.netKernelHandleCharacterDelta += queryClaims.netKernelHandleCharacterDelta
    ?? ((queryClaims.rootKernelHandleCharacterDelta ?? 0) - (queryClaims.disposedKernelHandleCharacters ?? 0));
  target.retentionKinds.set(
    queryClaims.retentionKind,
    (target.retentionKinds.get(queryClaims.retentionKind) ?? 0) + 1,
  );
  const answerLocalKernelPolicy = queryClaims.answerLocalKernelPolicy ?? 'unknown';
  target.answerLocalKernelPolicies.set(
    answerLocalKernelPolicy,
    (target.answerLocalKernelPolicies.get(answerLocalKernelPolicy) ?? 0) + 1,
  );
}

function addTypeShapeDuplicates(target, rows) {
  for (const row of rows ?? []) {
    const origins = row.origins == null ? '' : `:${row.origins.join('+')}`;
    const key = `${row.shapeKind}:${row.display}${origins}`;
    target.set(key, (target.get(key) ?? 0) + row.count);
  }
}

function addCountRows(target, rows) {
  for (const row of rows ?? []) {
    target.set(row.key, (target.get(row.key) ?? 0) + row.count);
  }
}

function diffSemanticRuntimeDetailDensityRows(after, before) {
  const rows = new Map();
  for (const row of before ?? []) {
    mergeDetailDensityRow(rows, row, -1);
  }
  for (const row of after ?? []) {
    mergeDetailDensityRow(rows, row, 1);
  }
  return sortedDetailDensityRows([...rows.values()]
    .filter((row) =>
      row.count !== 0
      || row.ownPropertyCount !== 0
      || row.directArrayItemCount !== 0
      || row.directStringCharacterCount !== 0
      || row.directNonHandleStringCharacterCount !== 0
      || row.directUniqueStringCharacterCount !== 0
      || row.directKernelHandleCharacterCount !== 0
      || row.directNonEnvelopeKernelHandleCharacterCount !== 0
      || row.directEnvelopeHandleEchoCharacterCount !== 0
      || row.directLocalKeyCharacterCount !== 0
    ));
}

function addDetailDensityRows(target, rows) {
  for (const row of rows ?? []) {
    mergeDetailDensityRow(target, row, 1);
  }
}

function mergeDetailDensityRow(target, row, sign) {
  const current = target.get(row.detailKind) ?? {
    detailKind: row.detailKind,
    count: 0,
    ownPropertyCount: 0,
    directArrayItemCount: 0,
    directStringCharacterCount: 0,
    directNonHandleStringCharacterCount: 0,
    directUniqueStringCount: 0,
    directUniqueStringCharacterCount: 0,
    directKernelHandleCount: 0,
    directKernelHandleCharacterCount: 0,
    directKernelHandleKinds: new Map(),
    directKernelHandleKindCharacters: new Map(),
    directNonEnvelopeKernelHandleCount: 0,
    directNonEnvelopeKernelHandleCharacterCount: 0,
    directNonEnvelopeKernelHandleKinds: new Map(),
    directNonEnvelopeKernelHandleKindCharacters: new Map(),
    directEnvelopeHandleEchoCount: 0,
    directEnvelopeHandleEchoCharacterCount: 0,
    directEnvelopeHandleEchoKinds: new Map(),
    directEnvelopeHandleEchoKindCharacters: new Map(),
    directLocalKeyCharacterCount: 0,
    objectKinds: new Map(),
    constructors: new Map(),
    directArrayFields: new Map(),
    directStringFields: new Map(),
    directNonHandleStringFields: new Map(),
    directKernelHandleFields: new Map(),
    directNonEnvelopeKernelHandleFields: new Map(),
    directEnvelopeHandleEchoFields: new Map(),
    directLocalKeyFields: new Map(),
  };
  current.count += sign * (row.count ?? 0);
  current.ownPropertyCount += sign * (row.ownPropertyCount ?? 0);
  current.directArrayItemCount += sign * (row.directArrayItemCount ?? 0);
  current.directStringCharacterCount += sign * (row.directStringCharacterCount ?? 0);
  current.directNonHandleStringCharacterCount += sign * (row.directNonHandleStringCharacterCount ?? 0);
  current.directUniqueStringCount += sign * (row.directUniqueStringCount ?? 0);
  current.directUniqueStringCharacterCount += sign * (row.directUniqueStringCharacterCount ?? 0);
  current.directKernelHandleCount += sign * (row.directKernelHandleCount ?? 0);
  current.directKernelHandleCharacterCount += sign * (row.directKernelHandleCharacterCount ?? 0);
  addSignedCountRows(current.directKernelHandleKinds, row.directKernelHandleKinds, sign);
  addSignedCountRows(current.directKernelHandleKindCharacters, row.directKernelHandleKindCharacters, sign);
  current.directNonEnvelopeKernelHandleCount += sign * (row.directNonEnvelopeKernelHandleCount ?? 0);
  current.directNonEnvelopeKernelHandleCharacterCount += sign * (row.directNonEnvelopeKernelHandleCharacterCount ?? 0);
  addSignedCountRows(current.directNonEnvelopeKernelHandleKinds, row.directNonEnvelopeKernelHandleKinds, sign);
  addSignedCountRows(current.directNonEnvelopeKernelHandleKindCharacters, row.directNonEnvelopeKernelHandleKindCharacters, sign);
  current.directEnvelopeHandleEchoCount += sign * (row.directEnvelopeHandleEchoCount ?? 0);
  current.directEnvelopeHandleEchoCharacterCount += sign * (row.directEnvelopeHandleEchoCharacterCount ?? 0);
  addSignedCountRows(current.directEnvelopeHandleEchoKinds, row.directEnvelopeHandleEchoKinds, sign);
  addSignedCountRows(current.directEnvelopeHandleEchoKindCharacters, row.directEnvelopeHandleEchoKindCharacters, sign);
  current.directLocalKeyCharacterCount += sign * (row.directLocalKeyCharacterCount ?? 0);
  addSignedCountRows(current.objectKinds, row.objectKinds, sign);
  addSignedCountRows(current.constructors, row.constructors, sign);
  addSignedCountRows(current.directArrayFields, row.directArrayFields, sign);
  addSignedCountRows(current.directStringFields, row.directStringFields, sign);
  addSignedCountRows(current.directNonHandleStringFields, row.directNonHandleStringFields, sign);
  addSignedCountRows(current.directKernelHandleFields, row.directKernelHandleFields, sign);
  addSignedCountRows(current.directNonEnvelopeKernelHandleFields, row.directNonEnvelopeKernelHandleFields, sign);
  addSignedCountRows(current.directEnvelopeHandleEchoFields, row.directEnvelopeHandleEchoFields, sign);
  addSignedCountRows(current.directLocalKeyFields, row.directLocalKeyFields, sign);
  target.set(row.detailKind, current);
}

function addSignedCountRows(target, rows, sign) {
  for (const row of rows ?? []) {
    target.set(row.key, (target.get(row.key) ?? 0) + sign * row.count);
  }
}

function sortedDetailDensityRows(rows) {
  return rows
    .map((row) => ({
      ...row,
      objectKinds: Array.isArray(row.objectKinds) ? row.objectKinds : countMapRows(row.objectKinds),
      constructors: Array.isArray(row.constructors) ? row.constructors : countMapRows(row.constructors),
      directArrayFields: Array.isArray(row.directArrayFields) ? row.directArrayFields : countMapRows(row.directArrayFields),
      directStringFields: Array.isArray(row.directStringFields) ? row.directStringFields : countMapRows(row.directStringFields),
      directNonHandleStringFields: Array.isArray(row.directNonHandleStringFields)
        ? row.directNonHandleStringFields
        : countMapRows(row.directNonHandleStringFields),
      directKernelHandleFields: Array.isArray(row.directKernelHandleFields)
        ? row.directKernelHandleFields
        : countMapRows(row.directKernelHandleFields),
      directKernelHandleKinds: Array.isArray(row.directKernelHandleKinds)
        ? row.directKernelHandleKinds
        : countMapRows(row.directKernelHandleKinds),
      directKernelHandleKindCharacters: Array.isArray(row.directKernelHandleKindCharacters)
        ? row.directKernelHandleKindCharacters
        : countMapRows(row.directKernelHandleKindCharacters),
      directNonEnvelopeKernelHandleFields: Array.isArray(row.directNonEnvelopeKernelHandleFields)
        ? row.directNonEnvelopeKernelHandleFields
        : countMapRows(row.directNonEnvelopeKernelHandleFields),
      directNonEnvelopeKernelHandleKinds: Array.isArray(row.directNonEnvelopeKernelHandleKinds)
        ? row.directNonEnvelopeKernelHandleKinds
        : countMapRows(row.directNonEnvelopeKernelHandleKinds),
      directNonEnvelopeKernelHandleKindCharacters: Array.isArray(row.directNonEnvelopeKernelHandleKindCharacters)
        ? row.directNonEnvelopeKernelHandleKindCharacters
        : countMapRows(row.directNonEnvelopeKernelHandleKindCharacters),
      directEnvelopeHandleEchoFields: Array.isArray(row.directEnvelopeHandleEchoFields)
        ? row.directEnvelopeHandleEchoFields
        : countMapRows(row.directEnvelopeHandleEchoFields),
      directEnvelopeHandleEchoKinds: Array.isArray(row.directEnvelopeHandleEchoKinds)
        ? row.directEnvelopeHandleEchoKinds
        : countMapRows(row.directEnvelopeHandleEchoKinds),
      directEnvelopeHandleEchoKindCharacters: Array.isArray(row.directEnvelopeHandleEchoKindCharacters)
        ? row.directEnvelopeHandleEchoKindCharacters
        : countMapRows(row.directEnvelopeHandleEchoKindCharacters),
      directLocalKeyFields: Array.isArray(row.directLocalKeyFields)
        ? row.directLocalKeyFields
        : countMapRows(row.directLocalKeyFields),
    }))
    .sort((left, right) =>
      detailDensityWeight(right) - detailDensityWeight(left)
      || right.count - left.count
      || left.detailKind.localeCompare(right.detailKind)
    );
}

function detailDensityWeight(row) {
  return Math.abs(row.ownPropertyCount ?? 0)
    + Math.abs(row.directArrayItemCount ?? 0)
    + Math.abs(row.directStringCharacterCount ?? 0)
    + Math.abs(row.directNonHandleStringCharacterCount ?? 0)
    + Math.abs(row.directUniqueStringCharacterCount ?? 0)
    + Math.abs(row.directKernelHandleCharacterCount ?? 0)
    + Math.abs(row.directNonEnvelopeKernelHandleCharacterCount ?? 0)
    + Math.abs(row.directEnvelopeHandleEchoCharacterCount ?? 0)
    + Math.abs(row.directLocalKeyCharacterCount ?? 0);
}

function printRun(run) {
  console.log('');
  const repeatLabel = run.repeatCount > 1
    ? ` repeat=${run.iteration + 1}/${run.repeatCount}`
    : '';
  const queryRepeatLabel = run.queryRepeatCount > 1
    ? ` query-repeat=${run.queryRepeatCount}`
    : '';
  console.log(`${run.rootLabel} depth=${run.depth} profile=${run.profile}${repeatLabel}${queryRepeatLabel}`);
  console.log(`- project: ${run.projectKey} (${run.projectShape})`);
  printTimingRows('- timings', run.timings, 10);
  console.log(`- construction memory: ${formatMemoryDelta(run.constructionMemory)}`);
  console.log(`- query memory: ${formatMemoryDelta(run.queryMemory)}`);
  console.log(`- process memory start: ${formatMemorySample(run.processMemoryStart)}`);
  console.log(`- process memory end: ${formatMemorySample(run.processMemoryEnd)}`);
  if (run.appWorldOpened != null) {
    console.log(`- app world opened: ${run.appWorldOpened}`);
  }
  console.log(
    `- kernel growth: records=${run.kernelGrowth?.totalRecords ?? 0}, products=${run.kernelGrowth?.products ?? 0}, ` +
    `provenance=${run.kernelGrowth?.provenance ?? 0}, addresses=${run.kernelGrowth?.addresses ?? 0}, identities=${run.kernelGrowth?.identities ?? 0}, ` +
    `hotDetails=${run.kernelGrowth?.hotDetails ?? 0}, handleChars=${formatCharacterCount(run.kernelGrowth?.handleCharacters ?? 0)}`,
  );
  printCountRows('- product growth', run.kernelProductKinds, 8);
  printCountRows('- record growth', run.kernelRecordKinds, 8);
  printCountRows('- source span roles', run.kernelSourceSpanRoles, 8);
  printCountRows('- source file roles', run.kernelSourceFileRoles, 8);
  printCountRows('- detail growth', run.kernelProductDetailKinds, 8);
  printCountRows('- hot detail growth', run.kernelHotDetailKinds, 8);
  printDetailDensityRows('- product detail density', run.kernelProductDetailDensity, 8);
  printDetailDensityRows('- hot detail density', run.kernelHotDetailDensity, 8);
  printSidecarIndexRows('- sidecar indexes', run.kernelSidecarIndexes, 8);
  printCountRows('- record handle chars', run.kernelRecordKindHandleCharacters, 8);
  printCountRows('- product handle chars', run.kernelProductKindHandleCharacters, 8);
  printCountRows('- source span role handle chars', run.kernelSourceSpanRoleHandleCharacters, 8);
  printTimingRows('- phases', run.topPhases, 8);
  printPhaseMemoryRows('- phase heap', run.topPhaseMemory);
  printPhaseKernelRows('- phase kernel', run.topPhaseKernel);
  printTimingRows('- static-evaluation phases', run.staticEvaluationPhases, 8);
  printStaticEvaluationSources('- static-evaluation sources', run.staticEvaluationSources);
  printStaticEvaluationHost('- static-evaluation host', run.staticEvaluationHost);
  printTimingRows('- type-system phases', run.typeSystemPhases, 8);
  printTimingRows('- resource-recognition phases', run.resourceRecognitionPhases, 8);
  printTimingRows('- template phases', run.templatePhases, 10);
  printPhaseMemoryRows('- template phase heap', run.topTemplatePhaseMemory);
  printPhaseKernelRows('- template phase kernel', run.topTemplatePhaseKernel);
  printTimingRows('- template runtime phases', run.templateRuntimePhases, 10);
  printPhaseMemoryRows('- template runtime phase heap', run.topTemplateRuntimePhaseMemory);
  printPhaseKernelRows('- template runtime phase kernel', run.topTemplateRuntimePhaseKernel);
  printExpressionCache('- template expression cache', run.templateExpressionCache);
  printTypeSystemCompilerOptions('- type-system compiler options', run.typeSystemCompilerOptions);
  printProgramSourceFiles('- type-system root files', run.typeSystemProgramRootFiles);
  printProgramSourceFiles('- type-system source files', run.typeSystemProgramSourceFiles);
  printProgramSourceFileGroups('- type-system root file groups', run.typeSystemProgramRootFileGroups, 8);
  printProgramSourceFileGroups('- type-system source file groups', run.typeSystemProgramSourceFileGroups, 12);
  printProgramNodeRemaps('- type-system program-node remaps', run.typeSystemProgramNodeRemaps);
  printHostSourceFileCache('- type-system host cache', run.typeSystemHostSourceFileCache);
  printProjectCompilerOptionsCache('- project compiler-options cache', run.projectCompilerOptionsCache);
  printTypeSystemDependencyCache('- type-system dependency cache', run.typeSystemDependencyCache);
  printTypeSystemDependencyCacheClear('- type-system dependency cache clear', run.typeSystemDependencyCacheClear);
  printTypeSystemDependencyCache('- type-system dependency cache after clear', run.typeSystemDependencyCacheAfterClear);
  printQueryRows('- queries', run.queries);
  if (run.queryClaimGraph != null) {
    console.log(formatQueryClaimGraph('- query claims', run.queryClaimGraph));
  }
  for (const appQueryClaims of run.appQueryClaimGraphs) {
    console.log(formatQueryClaimGraph(`- app query claims[${appQueryClaims.inquiryProfile}]`, appQueryClaims.queryClaims));
  }
  printTypeShapeDuplicateRows('- repeated type checker keys', run.typeShapeDuplicates);
  if (run.warnings.length > 0) {
    console.log(`- warnings: ${run.warnings.join('; ')}`);
  }
}

function formatQueryClaimGraph(label, queryClaims) {
  return `${label}: created=${queryClaims.createdRecords ?? queryClaims.records}, ` +
    `retained=${queryClaims.retainedRecords ?? queryClaims.records}, retention=${queryClaims.retentionKind}, ` +
    `answerLocalKernel=${queryClaims.answerLocalKernelPolicy ?? 'unknown'}, ` +
    `pending=${queryClaims.pending}, answered=${queryClaims.answered}, failed=${queryClaims.failed ?? 0}, ` +
    `disposed=${queryClaims.disposed}, ` +
    `roots=${queryClaims.rootRecords ?? queryClaims.records}/${queryClaims.childRecords ?? 0}, ` +
    `maxDepth=${queryClaims.maxDepth ?? 0}, ` +
    `deps=${queryClaims.retainedDependencyEdges ?? 0}/${queryClaims.distinctParentClaimIds ?? 0}, ` +
    `indexes=q${queryClaims.distinctQueryKinds ?? 0}/l${queryClaims.distinctLocusKeys ?? 0}/e${queryClaims.distinctEpochKeys ?? 0}/m${queryClaims.distinctMaterializationPolicies ?? 0}/o${queryClaims.distinctOutcomeKeys ?? 0}, ` +
    `keyChars=q${formatCharacterCount(queryClaims.retainedQueryKeyCharacters ?? 0)}/l${formatCharacterCount(queryClaims.retainedLocusKeyCharacters ?? 0)}/e${formatCharacterCount(queryClaims.retainedEpochKeyCharacters ?? 0)}/o${formatCharacterCount(queryClaims.retainedOutcomeKeyCharacters ?? 0)}, ` +
    `projectionOnly=${queryClaims.projectionOnly}, queryTypeProjection=${queryClaims.queryTypeProjection}, ` +
    `staticCatalog=${queryClaims.staticCatalog}, payload=${formatSemanticRuntimeBytes(queryClaims.approximatePayloadBytes)}, ` +
    `retainedAnswers=${queryClaims.retainedAnswerValues}/${formatSemanticRuntimeBytes(queryClaims.retainedAnswerBytes)}, ` +
    `retainedAnswerHits=${queryClaims.retainedAnswerHits ?? 0}, recordBudget=${queryClaims.retainedRecordLimit ?? 'unbounded'}, ` +
    `answerBudget=${formatSemanticRuntimeBytes(queryClaims.retainedAnswerTotalByteLimit ?? 0)}, ` +
    `budgetDisposed=${queryClaims.budgetDisposedRecords ?? 0}/${queryClaims.budgetDisposedAnswerValues ?? 0} answers/${formatSemanticRuntimeBytes(queryClaims.budgetDisposedAnswerBytes ?? 0)}, ` +
    `rootKernelDelta=${queryClaims.rootKernelRecordDelta ?? 0}/${queryClaims.rootKernelProductDelta ?? 0}/${queryClaims.rootKernelHotDetailDelta ?? 0}, ` +
    `allKernelDelta=${queryClaims.allKernelRecordDelta ?? 0}/${queryClaims.allKernelProductDelta ?? 0}/${queryClaims.allKernelHotDetailDelta ?? 0}, ` +
    `disposedKernel=${queryClaims.disposedKernelRecords ?? 0}/${queryClaims.disposedProductDetails ?? 0}/${queryClaims.disposedHotDetails ?? 0}/${formatCharacterCount(queryClaims.disposedKernelHandleCharacters ?? 0)}, ` +
    `disposedNestedClaims=${queryClaims.disposedQueryClaimRecords ?? 0}, ` +
    `clearedTsDeps=${queryClaims.clearedTypeSystemDependencySourceFiles ?? 0}/${formatCharacterCount(queryClaims.clearedTypeSystemDependencySourceTextCharacters ?? 0)} ` +
    `(defaultLibs=${queryClaims.clearedTypeSystemDependencyDefaultLibrarySourceFiles ?? 0}/${formatCharacterCount(queryClaims.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters ?? 0)}, ` +
    `externalDecls=${queryClaims.clearedTypeSystemDependencyExternalDeclarationSourceFiles ?? 0}/${formatCharacterCount(queryClaims.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters ?? 0)}), ` +
    `netKernel=${queryClaims.netKernelRecordDelta ?? 0}/${queryClaims.netProductDetailDelta ?? 0}/${queryClaims.netHotDetailDelta ?? 0}/${formatCharacterCount(queryClaims.netKernelHandleCharacterDelta ?? 0)}`;
}

function formatQueryClaimAggregate(label, queryClaims) {
  return `${label}: created=${queryClaims.createdRecords}, retained=${queryClaims.retainedRecords}, ` +
    `pending=${queryClaims.pending}, answered=${queryClaims.answered}, failed=${queryClaims.failed}, ` +
    `disposed=${queryClaims.disposed}, projectionOnly=${queryClaims.projectionOnly}, ` +
    `queryTypeProjection=${queryClaims.queryTypeProjection}, staticCatalog=${queryClaims.staticCatalog}, ` +
    `roots=${queryClaims.rootRecords}/${queryClaims.childRecords}, maxDepth=${queryClaims.maxDepth}, ` +
    `deps=${queryClaims.retainedDependencyEdges}/${queryClaims.distinctParentClaimIds}, ` +
    `payload=${formatSemanticRuntimeBytes(queryClaims.approximatePayloadBytes)}, ` +
    `retainedAnswers=${queryClaims.retainedAnswerValues}/${formatSemanticRuntimeBytes(queryClaims.retainedAnswerBytes)}, ` +
    `retainedAnswerHits=${queryClaims.retainedAnswerHits}, ` +
    `budgetDisposed=${queryClaims.budgetDisposedRecords}/${queryClaims.budgetDisposedAnswerValues} answers/${formatSemanticRuntimeBytes(queryClaims.budgetDisposedAnswerBytes)}, ` +
    `keyChars=q${formatCharacterCount(queryClaims.retainedQueryKeyCharacters)}/l${formatCharacterCount(queryClaims.retainedLocusKeyCharacters)}/e${formatCharacterCount(queryClaims.retainedEpochKeyCharacters)}/o${formatCharacterCount(queryClaims.retainedOutcomeKeyCharacters)}, ` +
    `rootKernelDelta=${queryClaims.rootKernelRecordDelta}/${queryClaims.rootKernelProductDelta}/${queryClaims.rootKernelHotDetailDelta}, ` +
    `allKernelDelta=${queryClaims.allKernelRecordDelta}/${queryClaims.allKernelProductDelta}/${queryClaims.allKernelHotDetailDelta}, ` +
    `disposedKernel=${queryClaims.disposedKernelRecords}/${queryClaims.disposedProductDetails}/${queryClaims.disposedHotDetails}/${formatCharacterCount(queryClaims.disposedKernelHandleCharacters)}, ` +
    `disposedNestedClaims=${queryClaims.disposedQueryClaimRecords}, ` +
    `clearedTsDeps=${queryClaims.clearedTypeSystemDependencySourceFiles}/${formatCharacterCount(queryClaims.clearedTypeSystemDependencySourceTextCharacters)} ` +
    `(defaultLibs=${queryClaims.clearedTypeSystemDependencyDefaultLibrarySourceFiles}/${formatCharacterCount(queryClaims.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters)}, ` +
    `externalDecls=${queryClaims.clearedTypeSystemDependencyExternalDeclarationSourceFiles}/${formatCharacterCount(queryClaims.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters)}), ` +
    `netKernel=${queryClaims.netKernelRecordDelta}/${queryClaims.netProductDetailDelta}/${queryClaims.netHotDetailDelta}/${formatCharacterCount(queryClaims.netKernelHandleCharacterDelta)}, ` +
    `rootHandleChars=${formatCharacterCount(queryClaims.rootKernelHandleCharacterDelta)}, disposedHandleChars=${formatCharacterCount(queryClaims.disposedKernelHandleCharacters)}, ` +
    `retention=${compactMap(queryClaims.retentionKinds, 4)}, ` +
    `answerLocalKernel=${compactMap(queryClaims.answerLocalKernelPolicies, 4)}`;
}

function formatMemoryDelta(memory) {
  return `heap=${formatSemanticRuntimeBytes(memory?.heapUsedBytes ?? 0)}, ` +
    `heapTotal=${formatSemanticRuntimeBytes(memory?.heapTotalBytes ?? 0)}, ` +
    `rss=${formatSemanticRuntimeBytes(memory?.rssBytes ?? 0)}, ` +
    `rssOther=${formatSemanticRuntimeBytes(memory?.rssOtherBytes ?? 0)}, ` +
    `external=${formatSemanticRuntimeBytes(memory?.externalBytes ?? 0)}, ` +
    `arrayBuffers=${formatSemanticRuntimeBytes(memory?.arrayBuffersBytes ?? 0)}, ` +
    `v8Physical=${formatSemanticRuntimeBytes(memory?.v8HeapPhysicalBytes ?? 0)}, ` +
    `v8Available=${formatSemanticRuntimeBytes(memory?.v8HeapAvailableBytes ?? 0)}, ` +
    `v8Malloced=${formatSemanticRuntimeBytes(memory?.v8MallocedMemoryBytes ?? 0)}, ` +
    `v8NativeContexts=${memory?.v8NativeContextCount ?? 0}, ` +
    `v8DetachedContexts=${memory?.v8DetachedContextCount ?? 0}`;
}

function formatMemorySample(memory) {
  return `heap=${formatSemanticRuntimeBytes(memory?.heapUsedBytes ?? 0)}, ` +
    `heapTotal=${formatSemanticRuntimeBytes(memory?.heapTotalBytes ?? 0)}, ` +
    `rss=${formatSemanticRuntimeBytes(memory?.rssBytes ?? 0)}, ` +
    `rssOther=${formatSemanticRuntimeBytes(memory?.rssOtherBytes ?? 0)}, ` +
    `external=${formatSemanticRuntimeBytes(memory?.externalBytes ?? 0)}, ` +
    `arrayBuffers=${formatSemanticRuntimeBytes(memory?.arrayBuffersBytes ?? 0)}, ` +
    `v8Physical=${formatSemanticRuntimeBytes(memory?.v8HeapPhysicalBytes ?? 0)}, ` +
    `v8Available=${formatSemanticRuntimeBytes(memory?.v8HeapAvailableBytes ?? 0)}, ` +
    `v8Malloced=${formatSemanticRuntimeBytes(memory?.v8MallocedMemoryBytes ?? 0)}, ` +
    `v8PeakMalloced=${formatSemanticRuntimeBytes(memory?.v8PeakMallocedMemoryBytes ?? 0)}, ` +
    `v8NativeContexts=${memory?.v8NativeContextCount ?? 0}, ` +
    `v8DetachedContexts=${memory?.v8DetachedContextCount ?? 0}`;
}

function formatAggregateMemoryDelta(memory, phase) {
  return `heap=${formatSemanticRuntimeBytes(memory[`${phase}HeapUsed`] ?? 0)}, ` +
    `heapTotal=${formatSemanticRuntimeBytes(memory[`${phase}HeapTotal`] ?? 0)}, ` +
    `rss=${formatSemanticRuntimeBytes(memory[`${phase}Rss`] ?? 0)}, ` +
    `rssOther=${formatSemanticRuntimeBytes(memory[`${phase}RssOther`] ?? 0)}, ` +
    `external=${formatSemanticRuntimeBytes(memory[`${phase}External`] ?? 0)}, ` +
    `arrayBuffers=${formatSemanticRuntimeBytes(memory[`${phase}ArrayBuffers`] ?? 0)}, ` +
    `v8Physical=${formatSemanticRuntimeBytes(memory[`${phase}V8HeapPhysical`] ?? 0)}, ` +
    `v8Available=${formatSemanticRuntimeBytes(memory[`${phase}V8HeapAvailable`] ?? 0)}, ` +
    `v8Malloced=${formatSemanticRuntimeBytes(memory[`${phase}V8MallocedMemory`] ?? 0)}, ` +
    `v8NativeContexts=${memory[`${phase}V8NativeContexts`] ?? 0}, ` +
    `v8DetachedContexts=${memory[`${phase}V8DetachedContexts`] ?? 0}`;
}

function printAggregate(aggregate) {
  console.log('');
  console.log(`aggregate (${aggregate.runs} run${aggregate.runs === 1 ? '' : 's'})`);
  printAggregateGroupRows(aggregate.groups);
  printAggregateGroupTimingRows(aggregate.groups);
  printTimingRows('- timing totals', sortedTimingAggregate(aggregate.timings), 14);
  printPhaseMemoryRows('- phase memory totals', sortedPhaseMemoryAggregate(aggregate.phaseMemory).slice(0, 8));
  printPhaseMemoryRows('- template phase memory totals', sortedPhaseMemoryAggregate(aggregate.templatePhaseMemory).slice(0, 8));
  printPhaseMemoryRows('- template runtime phase memory totals', sortedPhaseMemoryAggregate(aggregate.templateRuntimePhaseMemory).slice(0, 8));
  printPhaseKernelRows('- phase kernel totals', sortedPhaseKernelAggregate(aggregate.phaseKernel).slice(0, 8));
  printPhaseKernelRows('- template phase kernel totals', sortedPhaseKernelAggregate(aggregate.templatePhaseKernel).slice(0, 8));
  printPhaseKernelRows('- template runtime phase kernel totals', sortedPhaseKernelAggregate(aggregate.templateRuntimePhaseKernel).slice(0, 8));
  console.log(`- construction memory total: ${formatAggregateMemoryDelta(aggregate.memory, 'construction')}`);
  console.log(`- query memory total: ${formatAggregateMemoryDelta(aggregate.memory, 'query')}`);
  console.log(
    `- kernel growth total: records=${aggregate.kernel.totalRecords}, products=${aggregate.kernel.products}, ` +
    `provenance=${aggregate.kernel.provenance}, addresses=${aggregate.kernel.addresses}, identities=${aggregate.kernel.identities}, ` +
    `claims=${aggregate.kernel.claims}, hotDetails=${aggregate.kernel.hotDetails}, handleChars=${formatCharacterCount(aggregate.kernel.handleCharacters)}`,
  );
  printCountRows('- product growth totals', countMapRows(aggregate.kernel.productKinds), 10);
  printCountRows('- record growth totals', countMapRows(aggregate.kernel.recordKinds), 10);
  printCountRows('- source span role totals', countMapRows(aggregate.kernel.sourceSpanRoles), 10);
  printCountRows('- source file role totals', countMapRows(aggregate.kernel.sourceFileRoles), 10);
  printCountRows('- detail growth totals', countMapRows(aggregate.kernel.productDetailKinds), 10);
  printCountRows('- hot detail growth totals', countMapRows(aggregate.kernel.hotDetailKinds), 10);
  printDetailDensityRows('- product detail density totals', sortedDetailDensityRows([...aggregate.kernel.productDetailDensity.values()]), 10);
  printDetailDensityRows('- hot detail density totals', sortedDetailDensityRows([...aggregate.kernel.hotDetailDensity.values()]), 10);
  printCountRows('- record handle char totals', countMapRows(aggregate.kernel.recordKindHandleCharacters), 10);
  printCountRows('- product handle char totals', countMapRows(aggregate.kernel.productKindHandleCharacters), 10);
  printCountRows('- source span role handle char totals', countMapRows(aggregate.kernel.sourceSpanRoleHandleCharacters), 10);
  printProgramSourceFiles('- type-system root file totals', aggregate.typeSystemProgramRootFiles);
  printProgramSourceFiles('- type-system source file totals', aggregate.typeSystemProgramSourceFiles);
  printProgramSourceFileGroups('- type-system root file group totals', sortedProgramSourceFileGroups(aggregate.typeSystemProgramRootFileGroups), 8);
  printProgramSourceFileGroups('- type-system source file group totals', sortedProgramSourceFileGroups(aggregate.typeSystemProgramSourceFileGroups), 12);
  printProgramNodeRemaps('- type-system program-node remap totals', aggregate.typeSystemProgramNodeRemaps);
  printStaticEvaluationHost('- static-evaluation host totals', aggregate.staticEvaluationHost);
  printHostSourceFileCache('- type-system host cache totals', aggregate.typeSystemHostSourceFileCache);
  printProjectCompilerOptionsCacheAggregate('- project compiler-options cache max', aggregate.projectCompilerOptionsCache);
  printTypeSystemDependencyCacheAggregate('- type-system dependency cache max', aggregate.typeSystemDependencyCache);
  printTypeSystemDependencyCacheClearAggregate('- type-system dependency cache clear totals', aggregate.typeSystemDependencyCacheClear);
  printTypeSystemDependencyCacheAggregate('- type-system dependency cache after clear max', aggregate.typeSystemDependencyCacheAfterClear);
  printQueryRows('- query totals', sortedQueryAggregate(aggregate.queries));
  console.log(formatQueryClaimAggregate('- query claim totals', aggregate.queryClaims));
  if (aggregate.appQueryClaims.createdRecords > 0) {
    console.log(formatQueryClaimAggregate('- app query claim totals', aggregate.appQueryClaims));
  }
  printCountRows('- repeated type checker-key totals', countMapRows(aggregate.typeShapeDuplicates), 10);
  if (aggregate.warnings.size > 0) {
    console.log('- warnings');
    for (const [warning, count] of sortedMapEntries(aggregate.warnings).slice(0, 10)) {
      console.log(`  - ${warning}: ${count}`);
    }
  }
}

function printAggregateGroupRows(groups) {
  const rows = [...(groups ?? new Map()).entries()]
    .map(([label, group]) => ({
      label,
      runs: group.runs,
      appOpenMilliseconds: aggregateTimingAverageMilliseconds(group.timings, 'app.open'),
      runtimeSummaryMilliseconds: aggregateTimingAverageMilliseconds(group.timings, 'runtime.summary'),
      queryMilliseconds: aggregateQueryMilliseconds(group),
      constructionHeapUsed: group.memory.constructionHeapUsed,
      queryHeapUsed: group.memory.queryHeapUsed,
      kernelRecords: group.kernel.totalRecords,
      kernelProducts: group.kernel.products,
      kernelHandleCharacters: group.kernel.handleCharacters,
      typeSystemSourceFiles: group.typeSystemProgramSourceFiles.total,
      typeSystemSourceTextCharacters: group.typeSystemProgramSourceFiles.sourceTextCharacters,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
  if (rows.length === 0) {
    return;
  }
  console.log('- grouped run totals');
  for (const row of rows.slice(0, 24)) {
    console.log(
      `  - ${row.label}: runs=${row.runs}, ` +
      `app.open avg=${formatOptionalMilliseconds(row.appOpenMilliseconds)}, ` +
      `runtime.summary avg=${formatOptionalMilliseconds(row.runtimeSummaryMilliseconds)}, ` +
      `query total=${row.queryMilliseconds.toFixed(1)}ms, ` +
      `constructionHeap total=${formatSemanticRuntimeBytes(row.constructionHeapUsed)}, ` +
      `avg=${formatSemanticRuntimeBytes(row.constructionHeapUsed / Math.max(1, row.runs))}, ` +
      `queryHeap total=${formatSemanticRuntimeBytes(row.queryHeapUsed)}, ` +
      `kernel records=${row.kernelRecords}, products=${row.kernelProducts}, handles=${formatCharacterCount(row.kernelHandleCharacters)}, ` +
      `tsFiles=${row.typeSystemSourceFiles}, tsText=${formatCharacterCount(row.typeSystemSourceTextCharacters)}`,
    );
  }
  if (rows.length > 24) {
    console.log(`  - ... ${rows.length - 24} more grouped run totals omitted`);
  }
}

function printAggregateGroupTimingRows(groups) {
  const rows = [...(groups ?? new Map()).entries()]
    .map(([label, group]) => ({
      label,
      timings: sortedTimingAggregate(group.timings)
        .filter(isGroupTimingLeader)
        .slice(0, 5),
    }))
    .filter((row) => row.timings.length > 0)
    .sort((left, right) => left.label.localeCompare(right.label));
  if (rows.length <= 1) {
    return;
  }
  console.log('- grouped timing leaders');
  for (const row of rows.slice(0, 16)) {
    console.log(`  - ${row.label}: ${formatTimingLeaderList(row.timings)}`);
  }
  if (rows.length > 16) {
    console.log(`  - ... ${rows.length - 16} more grouped timing leaders omitted`);
  }
}

function isGroupTimingLeader(row) {
  return row.label === 'app.profile.total'
    || row.label === 'app-world-free.profile.total'
    || row.label.startsWith('phase:')
    || row.label.startsWith('template-phase:')
    || row.label.startsWith('template-runtime-phase:')
    || row.label.startsWith('static-evaluation-phase:')
    || row.label.startsWith('type-system-phase:')
    || row.label.startsWith('resource-recognition-phase:');
}

function formatTimingLeaderList(rows) {
  return rows.map((row) => {
    const average = row.milliseconds / Math.max(1, row.sampleCount ?? 1);
    return `${row.label}=${row.milliseconds.toFixed(1)}ms/${row.sampleCount ?? 1} avg ${average.toFixed(1)}ms`;
  }).join(', ');
}

function aggregateTimingAverageMilliseconds(timings, label) {
  const value = timings.get(label);
  if (value == null || value.count === 0) {
    return null;
  }
  return value.milliseconds / value.count;
}

function aggregateQueryMilliseconds(aggregate) {
  let milliseconds = 0;
  for (const query of aggregate.queries.values()) {
    milliseconds += query.milliseconds;
  }
  return milliseconds;
}

function formatOptionalMilliseconds(milliseconds) {
  return milliseconds == null ? 'n/a' : `${milliseconds.toFixed(1)}ms`;
}

function sortedTimingAggregate(timings) {
  return [...timings.entries()]
    .map(([label, value]) => ({
      label,
      milliseconds: value.milliseconds,
      sampleCount: value.count,
    }))
    .sort((left, right) => right.milliseconds - left.milliseconds || left.label.localeCompare(right.label));
}

function sortedPhaseMemoryAggregate(rows) {
  return [...rows.values()]
    .sort((left, right) =>
      right.maxAbsHeapUsed - left.maxAbsHeapUsed
      || right.maxAbsRss - left.maxAbsRss
      || left.label.localeCompare(right.label)
    );
}

function sortedPhaseKernelAggregate(rows) {
  return [...rows.values()]
    .map((row) => ({
      ...row,
      productKinds: countMapRows(row.productKinds),
      sourceSpanRoles: countMapRows(row.sourceSpanRoles),
      productDetails: countMapRows(row.productDetails),
      hotDetails: countMapRows(row.hotDetails),
      productDetailDensity: sortedDetailDensityRows([...row.productDetailDensity.values()]),
      hotDetailDensity: sortedDetailDensityRows([...row.hotDetailDensity.values()]),
    }))
    .sort((left, right) =>
      right.maxAbsRecords - left.maxAbsRecords
      || Math.abs(right.products) - Math.abs(left.products)
      || left.label.localeCompare(right.label)
    );
}

function sortedQueryAggregate(queries) {
  return [...queries.entries()]
    .map(([label, value]) => ({
      label,
      outcome: `${value.count} run(s)`,
      milliseconds: value.milliseconds,
      payloadBytes: value.payloadBytes,
      rowCount: value.rows,
      memory: { heapUsedBytes: value.heapUsed },
      kernel: {
        totalRecords: value.kernelRecords,
        products: value.kernelProducts,
      },
      retainedAnswerHits: value.retainedAnswerHits,
      productKinds: [...value.productKinds.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((left, right) => Math.abs(right.count) - Math.abs(left.count) || left.key.localeCompare(right.key)),
    }))
    .sort((left, right) => right.milliseconds - left.milliseconds || left.label.localeCompare(right.label));
}

function sortedMapEntries(map) {
  return [...map.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    rightValue - leftValue || leftKey.localeCompare(rightKey)
  );
}

function printTimingRows(label, rows, limit) {
  if (rows.length === 0) {
    console.log(`${label}: none`);
    return;
  }
  const parts = rows
    .slice(0, limit)
    .map((row) => {
      const count = row.sampleCount == null
        ? row.itemCount == null ? '' : `/${row.itemCount}`
        : `/${row.sampleCount} avg ${(row.milliseconds / Math.max(1, row.sampleCount)).toFixed(1)}ms`;
      const exclusive = row.exclusiveMilliseconds == null
        || Math.abs(row.exclusiveMilliseconds - row.milliseconds) < 0.05
        ? ''
        : ` excl ${row.exclusiveMilliseconds.toFixed(1)}ms`;
      return `${row.label}=${row.milliseconds.toFixed(1)}ms${count}${exclusive}`;
    });
  console.log(`${label}: ${parts.join(', ')}`);
}

function phaseSortMilliseconds(row) {
  return row.exclusiveMilliseconds ?? row.milliseconds;
}

function printPhaseMemoryRows(label, rows) {
  if (rows.length === 0) {
    return;
  }
  console.log(`${label}: ${rows.map((row) => {
    const samples = row.sampleCount == null ? '' : `/${row.sampleCount}`;
    return `${row.label}=heap ${formatSemanticRuntimeBytes(row.heapUsed)}, rss ${formatSemanticRuntimeBytes(row.rss)}${samples}`;
  }).join(', ')}`);
}

function printHostSourceFileCache(label, cache) {
  if (cache == null) {
    return;
  }
  console.log(
    `${label}: hits=${cache.hits ?? 0}, misses=${cache.misses ?? 0}, writes=${cache.writes ?? 0}, bypasses=${cache.bypasses ?? 0}, ` +
    `traffic(hitText=${formatCharacterCount(cache.hitSourceTextCharacters ?? 0)}, writeText=${formatCharacterCount(cache.writeSourceTextCharacters ?? 0)}), ` +
    `cacheable(node_modules=${cache.cacheableNodeModuleReads ?? 0}, externalDecls=${cache.cacheableExternalDeclarationReads ?? 0}), ` +
    `bypass(fresh=${cache.bypassFreshSourceFileReads ?? 0}, project=${cache.bypassProjectSourceReads ?? 0}, external=${cache.bypassExternalSourceReads ?? 0}), ` +
    `clears=${cache.clearOperations ?? 0}/${cache.clearedEntries ?? 0}/${formatCharacterCount(cache.clearedSourceTextCharacters ?? 0)}, ` +
    `cleared(defaultLibs=${cache.clearedDefaultLibraryEntries ?? 0}/${formatCharacterCount(cache.clearedDefaultLibrarySourceTextCharacters ?? 0)}, ` +
    `externalDecls=${cache.clearedExternalDeclarationEntries ?? 0}/${formatCharacterCount(cache.clearedExternalDeclarationSourceTextCharacters ?? 0)})`,
  );
}

function printProjectCompilerOptionsCache(label, cache) {
  if (cache == null) {
    return;
  }
  console.log(
    `${label}: entries=${cache.entries ?? 0}, hits=${cache.hits ?? 0}, misses=${cache.misses ?? 0}, ` +
    `writes=${cache.writes ?? 0}, clears=${cache.clearOperations ?? 0}/${cache.clearedEntries ?? 0}, ` +
    `paths=${cache.pathMappingCount ?? 0}/${cache.pathMappingTargetCount ?? 0}`,
  );
}

function printTypeSystemDependencyCache(label, cache) {
  if (cache == null) {
    return;
  }
  console.log(
    `${label}: entries=${cache.entries ?? 0}, sourceText=${formatCharacterCount(cache.sourceTextCharacters ?? 0)}, ` +
    `traffic(hits=${cache.hits ?? 0}/${formatCharacterCount(cache.hitSourceTextCharacters ?? 0)}, ` +
    `writes=${cache.writes ?? 0}/${formatCharacterCount(cache.writeSourceTextCharacters ?? 0)}), ` +
    `nodeModules=${cache.nodeModuleEntries ?? 0}/${formatCharacterCount(cache.nodeModuleSourceTextCharacters ?? 0)}, ` +
    `declarations=${cache.declarationEntries ?? 0}/${formatCharacterCount(cache.declarationSourceTextCharacters ?? 0)}, ` +
    `defaultLibs=${cache.defaultLibraryEntries ?? 0}/${formatCharacterCount(cache.defaultLibrarySourceTextCharacters ?? 0)}, ` +
    `externalDecls=${cache.externalDeclarationEntries ?? 0}/${formatCharacterCount(cache.externalDeclarationSourceTextCharacters ?? 0)}, ` +
    `paths=${cache.distinctCanonicalPaths ?? 0}, duplicateParseEntries=${cache.duplicateCanonicalPathEntries ?? 0}, ` +
    `parseOptions=${compactRows(cache.parseOptions ?? [], 3)}, duplicateOptionSets=${compactRows(cache.duplicateParseOptionSets ?? [], 2)}, ` +
    `clears=${cache.clearOperations ?? 0}/${cache.clearedEntries ?? 0}/${formatCharacterCount(cache.clearedSourceTextCharacters ?? 0)}, ` +
    `cleared(defaultLibs=${cache.clearedDefaultLibraryEntries ?? 0}/${formatCharacterCount(cache.clearedDefaultLibrarySourceTextCharacters ?? 0)}, ` +
    `externalDecls=${cache.clearedExternalDeclarationEntries ?? 0}/${formatCharacterCount(cache.clearedExternalDeclarationSourceTextCharacters ?? 0)}), ` +
    `lastClear=${cache.lastClearPolicy ?? 'none'}, suggestedClear=${cache.suggestedClearPolicy ?? 'preserve'}:${cache.dominantSourceTextBucket ?? 'none'}`,
  );
  const largestEntries = cache.largestEntries ?? [];
  if (largestEntries.length > 0) {
    console.log(
      `${label} largest entries: ` +
      largestEntries.map((entry) =>
        `${entry.bucket}:${formatCharacterCount(entry.sourceTextCharacters ?? 0)}`
      ).join(', '),
    );
  }
}

function printTypeSystemDependencyCacheClear(label, clear) {
  if (clear == null) {
    return;
  }
  console.log(
    `${label}: policy=${clear.typeSystemDependencyCacheClearPolicy ?? 'preserve'}, ` +
    `files=${clear.clearedTypeSystemDependencySourceFiles ?? 0}, ` +
    `sourceText=${formatCharacterCount(clear.clearedTypeSystemDependencySourceTextCharacters ?? 0)}, ` +
    `defaultLibs=${clear.clearedTypeSystemDependencyDefaultLibrarySourceFiles ?? 0}/${formatCharacterCount(clear.clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters ?? 0)}, ` +
    `externalDecls=${clear.clearedTypeSystemDependencyExternalDeclarationSourceFiles ?? 0}/${formatCharacterCount(clear.clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters ?? 0)}`,
  );
}

function printTypeSystemDependencyCacheClearAggregate(label, clear) {
  if (clear == null || clear.operations === 0) {
    return;
  }
  console.log(
    `${label}: operations=${clear.operations}, files=${clear.files}, ` +
    `sourceText=${formatCharacterCount(clear.sourceTextCharacters)}, ` +
    `defaultLibs=${clear.defaultLibraryFiles}/${formatCharacterCount(clear.defaultLibrarySourceTextCharacters)}, ` +
    `externalDecls=${clear.externalDeclarationFiles}/${formatCharacterCount(clear.externalDeclarationSourceTextCharacters)}, ` +
    `policies=${compactMap(clear.policies, 4)}`,
  );
}

function printProjectCompilerOptionsCacheAggregate(label, cache) {
  if (cache == null || cache.maxEntries === 0) {
    return;
  }
  console.log(
    `${label}: entries=${cache.maxEntries}, hits=${cache.maxHits}, misses=${cache.maxMisses}, ` +
    `writes=${cache.maxWrites}, clears=${cache.maxClearOperations}/${cache.maxClearedEntries}, ` +
    `paths=${cache.maxPathMappingCount}/${cache.maxPathMappingTargetCount}`,
  );
}

function printTypeSystemDependencyCacheAggregate(label, cache) {
  if (cache == null || cache.maxEntries === 0) {
    return;
  }
  console.log(
    `${label}: entries=${cache.maxEntries}, sourceText=${formatCharacterCount(cache.maxSourceTextCharacters)}, ` +
    `traffic(hits=${cache.maxHits}/${formatCharacterCount(cache.maxHitSourceTextCharacters)}, ` +
    `writes=${cache.maxWrites}/${formatCharacterCount(cache.maxWriteSourceTextCharacters)}), ` +
    `nodeModules=${cache.maxNodeModuleEntries}/${formatCharacterCount(cache.maxNodeModuleSourceTextCharacters)}, ` +
    `declarations=${cache.maxDeclarationEntries}/${formatCharacterCount(cache.maxDeclarationSourceTextCharacters)}, ` +
    `defaultLibs=${cache.maxDefaultLibraryEntries}/${formatCharacterCount(cache.maxDefaultLibrarySourceTextCharacters)}, ` +
    `externalDecls=${cache.maxExternalDeclarationEntries}/${formatCharacterCount(cache.maxExternalDeclarationSourceTextCharacters)}, ` +
    `paths=${cache.maxDistinctCanonicalPaths}, duplicateParseEntries=${cache.maxDuplicateCanonicalPathEntries}, ` +
    `parseOptions=${compactMap(cache.parseOptions, 3)}, duplicateOptionSets=${compactMap(cache.duplicateParseOptionSets, 2)}, ` +
    `clears=${cache.maxClearOperations}/${cache.maxClearedEntries}/${formatCharacterCount(cache.maxClearedSourceTextCharacters)}, ` +
    `cleared(defaultLibs=${cache.maxClearedDefaultLibraryEntries}/${formatCharacterCount(cache.maxClearedDefaultLibrarySourceTextCharacters)}, ` +
    `externalDecls=${cache.maxClearedExternalDeclarationEntries}/${formatCharacterCount(cache.maxClearedExternalDeclarationSourceTextCharacters)})`,
  );
  if (cache.largestEntries.length > 0) {
    console.log(
      `${label} largest entries: ` +
      cache.largestEntries.slice(0, 8).map((entry) =>
        `${entry.bucket}:${formatCharacterCount(entry.sourceTextCharacters)}`
      ).join(', '),
    );
  }
}

function printExpressionCache(label, cache) {
  if (cache == null) {
    return;
  }
  const bucketNames = [
    ...new Set([
      ...cache.entriesByBucket.keys(),
      ...cache.hitsByBucket.keys(),
      ...cache.missesByBucket.keys(),
      ...cache.writesByBucket.keys(),
    ]),
  ];
  const buckets = bucketNames
    .map((key) => ({
      key,
      entries: cache.entriesByBucket.get(key) ?? 0,
      hits: cache.hitsByBucket.get(key) ?? 0,
      misses: cache.missesByBucket.get(key) ?? 0,
      writes: cache.writesByBucket.get(key) ?? 0,
    }))
    .sort((left, right) =>
      (right.misses + right.hits + right.writes) - (left.misses + left.hits + left.writes)
      || left.key.localeCompare(right.key)
    )
    .slice(0, 8)
    .map((row) => `${row.key}=e${row.entries}/h${row.hits}/m${row.misses}/w${row.writes}`)
    .join(', ');
  console.log(
    `${label}: entries=${cache.entries}, hits=${cache.hits}, misses=${cache.misses}, writes=${cache.writes}` +
    (buckets.length === 0 ? '' : `, buckets ${buckets}`),
  );
}

function printStaticEvaluationSources(label, sources) {
  if (sources == null) {
    return;
  }
  console.log(
    `${label}: total=${sources.total ?? 0}, evaluated=${sources.evaluated ?? 0}, open=${sources.open ?? 0}, ` +
    `project=${sources.projectSources ?? 0}/${formatCharacterCount(sources.projectSourceTextCharacters ?? 0)}, ` +
    `nodeModules=${sources.nodeModuleSources ?? 0}/${formatCharacterCount(sources.nodeModuleSourceTextCharacters ?? 0)}, ` +
    `external=${sources.externalSources ?? 0}/${formatCharacterCount(sources.externalSourceTextCharacters ?? 0)}, ` +
    `tsJs=${sources.typeScriptJavaScriptSources ?? 0}, assets=${sources.assetSources ?? 0}, ` +
    `sourceText=${formatCharacterCount(sources.sourceTextCharacters ?? 0)}`,
  );
}

function printStaticEvaluationHost(label, host) {
  if (host == null) {
    return;
  }
  const sourceFiles = host.sourceFiles ?? {};
  const resolutions = host.moduleResolutions ?? {};
  const fs = host.fileSystem ?? {};
  console.log(
    `${label}: ` +
    `sources hits=${sourceFiles.cacheHits ?? 0}, misses=${sourceFiles.cacheMisses ?? 0}, missing=${sourceFiles.missingFiles ?? 0}, ` +
    `read=${(sourceFiles.readMilliseconds ?? 0).toFixed(1)}ms, parse=${(sourceFiles.parseMilliseconds ?? 0).toFixed(1)}ms, bytes=${formatCharacterCount(sourceFiles.sourceBytes ?? 0)}, ` +
    `resolutions calls=${resolutions.calls ?? 0}, cache=${resolutions.cacheHits ?? 0}/${resolutions.cacheMisses ?? 0}, time=${(resolutions.milliseconds ?? 0).toFixed(1)}ms, ` +
    `postTsProbe=${resolutions.postTypeScriptRelativePathProbeEnabled ?? 0}, ` +
    `relative=${resolutions.relativeCalls ?? 0}, bare=${resolutions.bareCalls ?? 0}, frameworkBoundary=${resolutions.frameworkExternalBoundaries ?? 0}, packageBoundary=${resolutions.packageExternalBoundaries ?? 0}, ` +
    `shapes query=${resolutions.querySuffixCalls ?? 0}, asset=${resolutions.assetSpecifierCalls ?? 0}, extensionless=${resolutions.extensionlessRelativeCalls ?? 0}, emittedJs=${resolutions.emittedJavaScriptRelativeCalls ?? 0}, ` +
    `tsCalls=${resolutions.typeScriptCalls ?? 0}, tsTime=${(resolutions.typeScriptMilliseconds ?? 0).toFixed(1)}ms, ts=${resolutions.resolvedByTypeScript ?? 0}, ` +
    `pathProbe=${resolutions.resolvedByPathProbe ?? 0} (${resolutions.resolvedByPathProbeBeforeTypeScript ?? 0}/${resolutions.resolvedByPathProbeAfterTypeScript ?? 0}), ` +
    `probeCalls=${resolutions.pathProbeCalls ?? 0}, probeTime=${(resolutions.pathProbeMilliseconds ?? 0).toFixed(1)}ms (${(resolutions.pathProbeBeforeTypeScriptMilliseconds ?? 0).toFixed(1)}/${(resolutions.pathProbeAfterTypeScriptMilliseconds ?? 0).toFixed(1)}ms), ` +
    `probeBeforeAfter=${resolutions.pathProbeBeforeTypeScript ?? 0}/${resolutions.pathProbeAfterTypeScript ?? 0}, unresolved=${resolutions.unresolved ?? 0} (${resolutions.unresolvedRelative ?? 0}/${resolutions.unresolvedBare ?? 0}), ` +
    `declCache=${resolutions.declarationSourceHits ?? 0}/${resolutions.declarationSourceMisses ?? 0}, ` +
    `pkgPolicy=${resolutions.packagePolicyHits ?? 0}/${resolutions.packagePolicyMisses ?? 0}, ` +
    `fs exists=${fs.fileExistsHits ?? 0}/${fs.fileExistsMisses ?? 0}, dirs=${fs.directoryExistsHits ?? 0}/${fs.directoryExistsMisses ?? 0}, ` +
    `readFile=${fs.readFileHits ?? 0}/${fs.readFileMisses ?? 0}, realpath=${fs.realpathHits ?? 0}/${fs.realpathMisses ?? 0}, getDirs=${fs.getDirectoriesHits ?? 0}/${fs.getDirectoriesMisses ?? 0}`,
  );
}

function printTypeSystemCompilerOptions(label, options) {
  if (options == null) {
    return;
  }
  console.log(
    `${label}: target=${options.target ?? 'default'}, module=${options.module ?? 'default'}, ` +
    `moduleResolution=${options.moduleResolution ?? 'default'}, jsx=${options.jsx ?? 'default'}, ` +
    `allowJs=${options.allowJs ?? 'default'}, checkJs=${options.checkJs ?? 'default'}, ` +
    `skipLibCheck=${options.skipLibCheck ?? 'default'}, arbitraryExt=${options.allowArbitraryExtensions ?? 'default'}, ` +
    `decorators=${options.experimentalDecorators ?? 'default'}, baseUrl=${options.hasBaseUrl}, ` +
    `pathMappings=${options.pathMappingCount ?? 0}/${options.pathMappingTargetCount ?? 0}, configuredLibs=${options.libraryFileCount ?? 0}`,
  );
}

function printProgramSourceFiles(label, counts) {
  if (counts == null) {
    return;
  }
  console.log(
    `${label}: total=${counts.total ?? 0}, evaluated=${counts.evaluatedSources ?? 0}, ambient=${counts.ambientSources ?? 0}, ` +
    `project=${counts.projectSources ?? 0}, nodeModules=${counts.nodeModuleSources ?? 0}, declarations=${counts.declarationSources ?? 0}, ` +
    `defaultLibs=${counts.defaultLibrarySources ?? 0}, external=${counts.externalSources ?? 0}, ` +
    `sourceText=${formatCharacterCount(counts.sourceTextCharacters ?? 0)}, ` +
    `projectText=${formatCharacterCount(counts.projectSourceTextCharacters ?? 0)}, ` +
    `nodeModuleText=${formatCharacterCount(counts.nodeModuleSourceTextCharacters ?? 0)}, ` +
    `declarationText=${formatCharacterCount(counts.declarationSourceTextCharacters ?? 0)}, ` +
    `defaultLibText=${formatCharacterCount(counts.defaultLibrarySourceTextCharacters ?? 0)}, ` +
    `externalText=${formatCharacterCount(counts.externalSourceTextCharacters ?? 0)}`,
  );
}

function printProgramSourceFileGroups(label, rows, limit) {
  const selected = (rows ?? []).slice(0, limit);
  if (selected.length === 0) {
    return;
  }
  console.log(`${label}: ${selected.map((row) =>
    `${row.groupKind}:${row.groupKey}=files ${row.sourceFiles ?? 0}, text ${formatCharacterCount(row.sourceTextCharacters ?? 0)}, ` +
    `decl ${row.declarationSources ?? 0}, eval ${row.evaluatedSources ?? 0}`
  ).join(', ')}`);
}

function sortedProgramSourceFileGroups(rows) {
  return [...rows.values()]
    .sort((left, right) =>
      (right.sourceTextCharacters ?? 0) - (left.sourceTextCharacters ?? 0)
      || (right.sourceFiles ?? 0) - (left.sourceFiles ?? 0)
      || String(left.groupKind).localeCompare(String(right.groupKind))
      || String(left.groupKey).localeCompare(String(right.groupKey))
    );
}

function printProgramNodeRemaps(label, remaps) {
  if (remaps == null) {
    return;
  }
  console.log(
    `${label}: requests=${remaps.requests ?? 0}, cache=${remaps.cacheHits ?? 0}/${remaps.cacheMisses ?? 0}, ` +
    `sameSource=${remaps.sameSourceHits ?? 0}, span=${remaps.spanHits ?? 0}/${remaps.spanMisses ?? 0}, ` +
    `sourceFileMisses=${remaps.sourceFileMisses ?? 0}`,
  );
}

function printPhaseKernelRows(label, rows) {
  if (rows.length === 0) {
    return;
  }
  console.log(`${label}: ${rows.map((row) =>
    `${row.label}=records ${row.records}, products ${row.products}, provenance ${row.provenance}${row.sampleCount == null ? '' : `/${row.sampleCount}`}`
    + compactPhaseKernelRowSuffix('products', row.productKinds)
    + compactPhaseKernelRowSuffix('spans', row.sourceSpanRoles)
    + compactPhaseKernelRowSuffix('details', row.productDetails)
    + compactPhaseKernelRowSuffix('hotDetails', row.hotDetails)
    + compactPhaseKernelDetailDensitySuffix('detailDensity', row.productDetailDensity)
    + compactPhaseKernelDetailDensitySuffix('hotDensity', row.hotDetailDensity)
  ).join(', ')}`);
}

function compactPhaseKernelRowSuffix(label, rowsOrText) {
  if (rowsOrText == null || rowsOrText.length === 0) {
    return '';
  }
  const text = typeof rowsOrText === 'string'
    ? rowsOrText
    : compactCountRows(rowsOrText, 3);
  return text.length === 0 ? '' : `, ${label} ${text}`;
}

function compactPhaseKernelDetailDensitySuffix(label, rows) {
  if (rows == null || rows.length === 0) {
    return '';
  }
  const text = rows
    .filter((row) => row.count !== 0)
    .slice(0, 2)
    .map((row) =>
      `${row.detailKind}=${row.count}` +
      `/strings ${formatCharacterCount(row.directStringCharacterCount ?? 0)}` +
      `/handles ${formatCharacterCount(row.directKernelHandleCharacterCount ?? 0)}` +
      detailDensityFieldSuffix('handleKinds', row.directKernelHandleKindCharacters, 2)
    )
    .join('|');
  return text.length === 0 ? '' : `, ${label} ${text}`;
}

function phaseCountRows(phase, field, limit) {
  if (Array.isArray(phase.kernel?.[field])) {
    return phase.kernel[field].slice(0, limit);
  }
  const after = phase.kernel.after?.[field];
  const before = phase.kernel.before?.[field];
  if (!Array.isArray(after) || !Array.isArray(before)) {
    return [];
  }
  return diffSemanticRuntimeCountRows(after, before).slice(0, limit);
}

function phaseDetailDensityRows(phase, field, limit) {
  const deltaRows = field === 'productDetailDensity'
    ? phase.kernel?.productDetailDensityDelta
    : phase.kernel?.hotDetailDensityDelta;
  if (Array.isArray(deltaRows)) {
    return deltaRows.slice(0, limit);
  }
  const after = phase.kernel.after?.[field];
  const before = phase.kernel.before?.[field];
  if (!Array.isArray(after) || !Array.isArray(before)) {
    return [];
  }
  return diffSemanticRuntimeDetailDensityRows(after, before).slice(0, limit);
}

function printCountRows(label, rows, limit) {
  if (rows == null || rows.length === 0) {
    return;
  }
  console.log(`${label}: ${compactCountRows(rows, limit)}`);
}

function printDetailDensityRows(label, rows, limit) {
  if (rows == null || rows.length === 0) {
    return;
  }
  const parts = rows
    .slice(0, limit)
    .map((row) =>
      `${row.detailKind}=count ${row.count}/fields ${row.ownPropertyCount}/arrays ${row.directArrayItemCount}` +
      `/strings ${formatCharacterCount(row.directStringCharacterCount)}` +
      `/nonHandleStrings ${formatCharacterCount(row.directNonHandleStringCharacterCount ?? 0)}` +
      `/uniqueStrings ${row.directUniqueStringCount ?? 0}:${formatCharacterCount(row.directUniqueStringCharacterCount ?? 0)}` +
      `/handles ${row.directKernelHandleCount ?? 0}:${formatCharacterCount(row.directKernelHandleCharacterCount ?? 0)}` +
      detailDensityFieldSuffix('handleKinds', row.directKernelHandleKindCharacters, 3) +
      `/nonEnvelopeHandles ${row.directNonEnvelopeKernelHandleCount ?? 0}:${formatCharacterCount(row.directNonEnvelopeKernelHandleCharacterCount ?? 0)}` +
      detailDensityFieldSuffix('nonEnvelopeKinds', row.directNonEnvelopeKernelHandleKindCharacters, 3) +
      `/envelopeEcho ${row.directEnvelopeHandleEchoCount ?? 0}:${formatCharacterCount(row.directEnvelopeHandleEchoCharacterCount ?? 0)}` +
      detailDensityFieldSuffix('envelopeKinds', row.directEnvelopeHandleEchoKindCharacters, 3) +
      `/localKeys ${formatCharacterCount(row.directLocalKeyCharacterCount ?? 0)}` +
      detailDensityConstructorSuffix(row.constructors) +
      detailDensityFieldSuffix('handleFields', row.directKernelHandleFields, 2) +
      detailDensityFieldSuffix('nonEnvelopeHandleFields', row.directNonEnvelopeKernelHandleFields, 2) +
      detailDensityFieldSuffix('envelopeFields', row.directEnvelopeHandleEchoFields, 2) +
      detailDensityFieldSuffix('nonHandleStringFields', row.directNonHandleStringFields, 2) +
      detailDensityFieldSuffix('localKeyFields', row.directLocalKeyFields, 2) +
      detailDensityFieldSuffix('stringFields', row.directStringFields, 2) +
      detailDensityFieldSuffix('arrayFields', row.directArrayFields, 2)
    );
  console.log(`${label}: ${parts.join(', ')}`);
}

function printSidecarIndexRows(label, rows, limit) {
  if (rows == null || rows.length === 0) {
    return;
  }
  const parts = rows
    .slice(0, limit)
    .map((row) => `${row.key}=${row.entries}`);
  console.log(`${label}: ${parts.join(', ')}`);
}

function detailDensityConstructorSuffix(rows) {
  if (rows == null || rows.length === 0) {
    return '';
  }
  const constructors = rows
    .filter((row) => row.count !== 0)
    .slice(0, 2)
    .map((row) => `${row.key}=${row.count}`)
    .join('|');
  return constructors.length === 0 ? '' : `/ctors ${constructors}`;
}

function detailDensityFieldSuffix(label, rows, limit) {
  if (rows == null || rows.length === 0) {
    return '';
  }
  const fields = rows
    .filter((row) => row.count !== 0)
    .slice(0, limit)
    .map((row) => `${row.key}=${row.count}`)
    .join('|');
  return fields.length === 0 ? '' : `/${label} ${fields}`;
}

function printTypeShapeDuplicateRows(label, rows) {
  if (rows == null || rows.length === 0) {
    return;
  }
  const parts = rows
    .slice(0, 8)
    .map((row) => `${row.display}(${row.shapeKind})=${row.count}/origins ${row.originCount}/sources ${row.sourceCount}`);
  console.log(`${label}: ${parts.join(', ')}`);
}

function printQueryRows(label, rows) {
  if (rows.length === 0) {
    console.log(`${label}: none`);
    return;
  }
  const parts = rows
    .slice(0, 12)
    .map((row) =>
      `${row.label}=${row.milliseconds.toFixed(1)}ms/${row.outcome}/rows ${row.rowCount}/json ${formatSemanticRuntimeBytes(row.payloadBytes)}/heap ${formatSemanticRuntimeBytes(row.memory.heapUsedBytes)}`
      + (row.retainedAnswerHit || row.retainedAnswerHits > 0 ? `/retainedHits ${row.retainedAnswerHits ?? 1}` : '')
      + (row.kernel == null || (row.kernel.totalRecords === 0 && row.kernel.products === 0) ? '' : `/kernel ${row.kernel.totalRecords}:${row.kernel.products}`)
      + (row.productKinds == null || row.productKinds.length === 0 ? '' : `/product-kinds ${compactCountRows(row.productKinds, 3)}`)
    );
  console.log(`${label}: ${parts.join(', ')}`);
}

function countMapRows(map) {
  if (map == null) {
    return [];
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => Math.abs(right.count) - Math.abs(left.count) || left.key.localeCompare(right.key));
}

function compactCountRows(rows, limit) {
  return rows
    .filter((row) => row.count !== 0)
    .slice(0, limit)
    .map((row) => `${row.key}=${row.count}`)
    .join('|');
}

function compactMap(map, limit) {
  const value = sortedMapEntries(map)
    .slice(0, limit)
    .map(([key, count]) => `${key}=${count}`)
    .join('|');
  return value.length === 0 ? 'none' : value;
}

function compactRows(rows, limit) {
  const value = [...(rows ?? [])]
    .slice(0, limit)
    .map((row) => `${row.key}=${row.count}`)
    .join('|');
  return value.length === 0 ? 'none' : value;
}

function formatCharacterCount(value) {
  const abs = Math.abs(value);
  if (abs >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)}Mi chars`;
  }
  if (abs >= 1024) {
    return `${(value / 1024).toFixed(1)}Ki chars`;
  }
  return `${value} chars`;
}

function topTypeShapeDuplicateRows(store, limit) {
  const groups = new Map();
  for (const entry of store.productDetails.readEntries()) {
    if (entry.slot.detailKind !== 'type-system.type-shape') {
      continue;
    }
    const detail = entry.detail;
    if (detail == null || typeof detail !== 'object') {
      continue;
    }
    const checkerKey = String(detail.checkerKey ?? 'unknown');
    const current = groups.get(checkerKey) ?? {
      checkerKey,
      display: String(detail.display ?? checkerKey),
      shapeKind: String(detail.shapeKind ?? 'unknown'),
      origins: new Set(),
      sources: new Set(),
      count: 0,
    };
    current.origins.add(String(detail.origin ?? 'unknown'));
    current.sources.add(String(detail.sourceAddressHandle ?? 'no-source'));
    current.count += 1;
    groups.set(checkerKey, current);
  }
  return [...groups.values()]
    .filter((row) => row.count > 1)
    .sort((left, right) => right.count - left.count || left.display.localeCompare(right.display))
    .slice(0, limit)
    .map((row) => ({
      checkerKey: row.checkerKey,
      display: row.display,
      shapeKind: row.shapeKind,
      count: row.count,
      originCount: row.origins.size,
      sourceCount: row.sources.size,
      origins: [...row.origins].sort(),
    }));
}

function resultRowCount(value) {
  if (value == null || typeof value !== 'object') {
    return 0;
  }
  if (Array.isArray(value.rows)) {
    return value.rows.length;
  }
  if (Array.isArray(value.diagnostics)) {
    return value.diagnostics.length;
  }
  if (Array.isArray(value.entries)) {
    return value.entries.length;
  }
  return 1;
}

function jsonByteLength(value) {
  return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
}

function telemetryRoots() {
  const raw = process.env.SEMANTIC_RUNTIME_TELEMETRY_ROOTS;
  if (raw != null && raw.trim().length > 0) {
    return uniqueResolvedRoots(raw.split(path.delimiter));
  }
  return [
    path.join(authoringFixtureRoot, 'generated-state-backed-form'),
    path.join(authoringFixtureRoot, 'generated-routed-state-backed-form'),
    path.join(pressureFixtureRoot, 'mixed-form-surfaces'),
    path.join(pressureFixtureRoot, 'router-viewport-resolution-errors'),
  ].filter((root) => existsSync(root));
}

function uniqueResolvedRoots(rawRoots) {
  return [...new Set(rawRoots
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .flatMap((entry) => expandFixtureCollection(path.isAbsolute(entry) ? path.resolve(entry) : path.resolve(workspaceRoot, entry)))
  )].sort((left, right) => left.localeCompare(right));
}

function expandFixtureCollection(root) {
  if (samePath(root, authoringFixtureRoot)) {
    return fixtureChildRoots(authoringFixtureRoot, (name) => name.startsWith('generated-') || name === 'storefront');
  }
  if (samePath(root, pressureFixtureRoot)) {
    return fixtureChildRoots(pressureFixtureRoot);
  }
  return [root];
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

function telemetryRootLabel(root, index) {
  const resolvedRoot = path.resolve(root);
  if (isPathAtOrUnder(resolvedRoot, authoringFixtureRoot)) {
    return `authoring:${fixtureRootName(resolvedRoot, authoringFixtureRoot)}`;
  }
  if (isPathAtOrUnder(resolvedRoot, pressureFixtureRoot)) {
    return `pressure:${fixtureRootName(resolvedRoot, pressureFixtureRoot)}`;
  }
  return `input:${index + 1}`;
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

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

function telemetryDepths() {
  const raw = process.env.SEMANTIC_RUNTIME_TELEMETRY_DEPTHS;
  if (raw == null || raw.trim().length === 0) {
    return [...SEMANTIC_APP_ANALYSIS_DEPTHS];
  }
  const supported = new Set([...SEMANTIC_APP_ANALYSIS_DEPTHS, queryDefaultAnalysisDepth]);
  const values = listEnv(raw);
  for (const value of values) {
    if (!supported.has(value)) {
      throw new Error(`Unsupported SEMANTIC_RUNTIME_TELEMETRY_DEPTHS entry '${value}'.`);
    }
  }
  return values;
}

function analysisDepthRequest(depth) {
  return depth === queryDefaultAnalysisDepth
    ? {}
    : { analysisDepth: depth };
}

function telemetryProfiles() {
  const raw = process.env.SEMANTIC_RUNTIME_TELEMETRY_PROFILES;
  if (raw == null || raw.trim().length === 0) {
    return ['mcp-orientation', 'lsp-diagnostics', 'fixture'];
  }
  const supported = new Set(SEMANTIC_RUNTIME_INQUIRY_PROFILES);
  const values = listEnv(raw);
  for (const value of values) {
    if (!supported.has(value)) {
      throw new Error(`Unsupported SEMANTIC_RUNTIME_TELEMETRY_PROFILES entry '${value}'.`);
    }
  }
  return values;
}

function telemetryQueryKinds() {
  const raw = process.env.SEMANTIC_RUNTIME_TELEMETRY_QUERY_KINDS;
  if (raw == null || raw.trim().length === 0) {
    return [];
  }
  const supported = new Set(Object.values(SemanticAppQueryKind));
  const values = listEnv(raw);
  for (const value of values) {
    if (!supported.has(value)) {
      throw new Error(`Unsupported SEMANTIC_RUNTIME_TELEMETRY_QUERY_KINDS entry '${value}'.`);
    }
  }
  return values;
}

function telemetryOutputMode() {
  const value = stringEnv('SEMANTIC_RUNTIME_TELEMETRY_OUTPUT') ?? 'runs';
  if (value === 'runs' || value === 'aggregate' || value === 'both') {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_TELEMETRY_OUTPUT '${value}'.`);
}

function normalizeTelemetryMode(value) {
  const mode = value ?? 'opened-app';
  if (mode === 'opened-app' || mode === 'routed-query' || mode === 'routed-batch') {
    return mode;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_TELEMETRY_MODE '${mode}'.`);
}

function normalizeAppRetention(value) {
  const retention = value ?? 'dispose-app';
  if ((SEMANTIC_APP_RETENTION_POLICIES).includes(retention)) {
    return retention;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_TELEMETRY_APP_RETENTION '${retention}'.`);
}

function telemetryTypeSystemDependencyCacheClearPolicy(value) {
  if (value == null || value === '' || value === 'profile-default') {
    return null;
  }
  if (SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES.includes(value)) {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_TELEMETRY_TYPE_SYSTEM_CACHE_CLEAR_POLICY '${value}'.`);
}

function applyTypeSystemDependencyCacheClear(run, runtime) {
  if (typeSystemDependencyCacheClearPolicy == null || typeSystemDependencyCacheClearPolicy === 'preserve') {
    return;
  }
  if (routedAnswerClearsTypeSystemDependencyCache) {
    return;
  }
  run.typeSystemDependencyCacheClear = runtime.clearAnalysisCache({
    typeSystemDependencyCacheClearPolicy,
  }).value;
  run.typeSystemDependencyCacheAfterClear = runtime.analysisCacheOverview({
    includeTypeSystemDependencyEntries: includeTypeSystemDependencyCacheEntries,
    rowLimit: 8,
  }).value.typeSystemDependencyCache;
}

function typeSystemDependencyCacheClearRequest() {
  return typeSystemDependencyCacheClearPolicy == null
    ? {}
    : { typeSystemDependencyCacheClearPolicy };
}

function typeSystemDependencyCacheOverviewRequest() {
  return {
    includeTypeSystemDependencyEntries: includeTypeSystemDependencyCacheEntries,
    rowLimit: 8,
  };
}

function stringEnv(name) {
  const value = process.env[name];
  if (value == null || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

function listEnv(raw) {
  return raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function booleanEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw.trim().length === 0) {
    return fallback;
  }
  const value = raw.trim().toLowerCase();
  if (value === '1' || value === 'true' || value === 'yes') {
    return true;
  }
  if (value === '0' || value === 'false' || value === 'no') {
    return false;
  }
  throw new Error(`Unsupported boolean ${name}='${raw}'.`);
}

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function collectIfRequested() {
  if (forceGc && typeof globalThis.gc === 'function') {
    globalThis.gc();
  }
}
