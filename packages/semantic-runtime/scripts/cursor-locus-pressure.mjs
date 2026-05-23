import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticProjectAnalysisKind,
  SemanticProjectShapeKind,
} from '../out/index.js';
import {
  answerTemplateCompletion,
  templateCompletionQueryForCursor,
} from '../out/inquiry/template-completion.js';
import {
  SourceCursorInquiryLocus,
  SourceTextCursor,
} from '../out/inquiry/locus.js';
import { InquiryPageRequest } from '../out/inquiry/page.js';
import { TemplateProductDetails } from '../out/template/product-details.js';
import {
  parsePressureRootCliOptions,
  pressureRootsForOptions,
} from './pressure-root-selection.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const authoringFixtureRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/authoring');
const pressureFixtureRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/pressure');
const defaultRoot = path.join(workspaceRoot, 'packages/semantic-runtime/fixtures/authoring/storefront');
const analysisDepth = process.env.SEMANTIC_RUNTIME_CURSOR_PRESSURE_DEPTH ?? 'binding-observation';
const projectShapeFilter = pressureProjectShapeFilter();
const projectDiscovery = pressureProjectDiscovery();
const pageSize = integerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_PAGE_SIZE', 40);
const projectLimit = integerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_LIMIT', 40);
const templateLimit = integerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_TEMPLATE_LIMIT', 120);
const sampleLimit = integerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_SAMPLE_LIMIT', 900);
const perResourceLimit = integerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_PER_RESOURCE_LIMIT', 18);
const inputLimit = optionalPositiveIntegerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_INPUT_LIMIT');
const outputMode = cursorPressureOutputMode();
const authoringTemplateLimitPerProject = integerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_AUTHORING_TEMPLATE_LIMIT_PER_PROJECT', 12);
const authoringSourceFileLimitPerProject = integerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_AUTHORING_SOURCE_FILE_LIMIT_PER_PROJECT', 12);
const diagnosticLocusLimitPerProject = integerEnv('SEMANTIC_RUNTIME_CURSOR_PRESSURE_DIAGNOSTIC_LOCUS_LIMIT_PER_PROJECT', 120);
const diagnosticReadLimitPerProject = integerEnv(
  'SEMANTIC_RUNTIME_CURSOR_PRESSURE_DIAGNOSTIC_READ_LIMIT_PER_PROJECT',
  Math.max(1000, diagnosticLocusLimitPerProject * 4),
);
const pressureRootSelectionConfig = {
  workspaceRoot,
  authoringFixtureRoot,
  pressureFixtureRoot,
  defaultRoots: [defaultRoot],
  envRootNames: ['SEMANTIC_RUNTIME_CURSOR_PRESSURE_ROOTS', 'SEMANTIC_RUNTIME_PRESSURE_ROOTS'],
  includeAuthoringFixtureName: (name) => name.startsWith('generated-') || name === 'storefront',
  usageName: 'pnpm --filter @aurelia-ls/semantic-runtime pressure:cursor-loci',
  label: 'cursor-locus pressure',
  fixtureHelp: 'Use --fixture pressure-name, pressure:<name>, or authoring:<name> for focused cursor pressure.',
};
const cliOptions = parsePressureRootCliOptions(process.argv.slice(2), pressureRootSelectionConfig);
const defaultCursorPressureAnalysisKinds = new Set([
  SemanticProjectAnalysisKind.AppWorld,
  SemanticProjectAnalysisKind.ResourceLibraryAuthoring,
]);
const roots = limitedPressureRoots(pressureRootsForOptions(cliOptions, pressureRootSelectionConfig), inputLimit);

console.log('semantic-runtime cursor locus pressure');
console.log('scope: transient template-cursor pressure; paths, source text, and candidate names are omitted');
console.log('note: missing-input values are bucketed so external app resource or domain names are not printed');
console.log(`analysis-depth: ${analysisDepth}`);
console.log(`project-shapes: ${projectShapeFilter == null ? 'all' : [...projectShapeFilter].join(',')}`);
console.log(`project-discovery: ${projectDiscovery ?? 'default'}`);
console.log(`default-analysis-policy: ${projectShapeFilter == null ? 'app-world,resource-library-authoring' : 'shape-filter-explicit'}`);
console.log(`project-limit: ${projectLimit}`);
console.log(`template-limit: ${templateLimit}`);
console.log(`sample-limit: ${sampleLimit}`);
console.log(`per-resource-limit: ${perResourceLimit}`);
console.log(`input-limit: ${inputLimit ?? 'none'}`);
console.log(`output-mode: ${outputMode}`);
console.log(`fixture-filter: ${cliOptions.fixtureNames.length === 0 ? 'all' : cliOptions.fixtureNames.join(',')}`);
console.log(`root-filter: ${cliOptions.rootEntries.length === 0 ? 'all' : `${cliOptions.rootEntries.length} selected`}`);
console.log(`authoring-template-limit-per-project: ${authoringTemplateLimitPerProject}`);
console.log(`authoring-source-file-limit-per-project: ${authoringSourceFileLimitPerProject}`);
console.log(`diagnostic-locus-limit-per-project: ${diagnosticLocusLimitPerProject}`);
console.log(`diagnostic-read-limit-per-project: ${diagnosticReadLimitPerProject}`);
console.log(`inputs: ${roots.length}`);

const aggregateStart = performance.now();
const rootAggregates = [];
for (const [index, root] of roots.entries()) {
  const started = performance.now();
  const aggregate = await readCursorPressureForRoot(root);
  rootAggregates.push(aggregate);
  if (outputMode !== 'aggregate') {
    console.log('');
    console.log(`input ${index + 1}`);
    printCursorAggregate(aggregate, performance.now() - started);
  }
}

if (outputMode !== 'inputs' && rootAggregates.length > 0) {
  console.log('');
  console.log(`combined inputs (${rootAggregates.length})`);
  printCursorAggregate(combineCursorAggregates(rootAggregates), performance.now() - aggregateStart);
}

function printCursorAggregate(aggregate, requestMilliseconds) {
  console.log(`- request: ${requestMilliseconds.toFixed(1)}ms`);
  console.log(`- projects: ${aggregate.projects}`);
  console.log(`- selected projects: ${aggregate.selectedProjects}`);
  console.log(`- opened app-world emissions: ${aggregate.openedAppWorlds}`);
  console.log(`- resource definitions: ${aggregate.resourceDefinitions}`);
  console.log(`- custom-element definitions: ${aggregate.customElementDefinitions}`);
  console.log(`- custom-element definitions with templates: ${aggregate.customElementDefinitionsWithTemplates}`);
  console.log(`- projects with template definitions: ${aggregate.projectsWithTemplateDefinitions}`);
  console.log(`- projects with compiled templates: ${aggregate.projectsWithCompiledTemplates}`);
  console.log(`- projects with template definitions but no compiled templates: ${aggregate.projectsWithTemplateDefinitionsNoCompiledTemplates}`);
  console.log(`- app/runtime templates seen: ${aggregate.appRuntimeTemplatesSeen}`);
  console.log(`- authoring templates seen: ${aggregate.authoringTemplatesSeen}`);
  console.log(`- authoring source files requested: ${aggregate.authoringSourceFilesRequested}`);
  console.log(`- templates seen: ${aggregate.templatesSeen}`);
  console.log(`- templates sampled: ${aggregate.templatesSampled}`);
  console.log(`- loci sampled: ${aggregate.lociSampled}`);
  console.log(`- diagnostic loci available: ${aggregate.diagnosticLociAvailable}`);
  console.log(`- diagnostic loci sampled: ${aggregate.diagnosticLociSampled}`);
  console.log(`- candidate rows read: ${aggregate.candidateRows}`);
  printCounts('project shape kinds', aggregate.projectShapeKinds);
  printCounts('skipped project shape kinds', aggregate.skippedProjectShapeKinds);
  printCounts('project analysis kinds', aggregate.projectAnalysisKinds);
  printCounts('skipped project analysis kinds', aggregate.skippedProjectAnalysisKinds);
  printCounts('project shape reasons', aggregate.projectShapeReasons);
  printCounts('sample lanes', aggregate.sampleLanes);
  printCounts('site kinds', aggregate.siteKinds);
  printCounts('outcomes', aggregate.outcomes);
  printCounts('outcomes by site kind', aggregate.outcomeSiteKinds, 18);
  printCounts('outcomes by sample lane', aggregate.outcomeSampleLanes, 18);
  printCounts('completion pressure classes', aggregate.completionPressureClasses, 18);
  printCounts('outcomes by completion pressure class', aggregate.outcomeCompletionPressureClasses, 18);
  printCounts('public API outcomes', aggregate.apiOutcomes, 18);
  printCounts('public API site kinds', aggregate.apiSiteKinds, 18);
  printCounts('public API pressure classes', aggregate.apiCompletionPressureClasses, 18);
  printCounts('public API exception classes', aggregate.apiExceptionClasses, 18);
  printCounts('public API answer mismatches', aggregate.apiAnswerMismatches, 18);
  printCounts('public API template-resource miss reasons', aggregate.apiTemplateResourceMissReasons, 18);
  printCounts('public API missing inputs', aggregate.apiMissingInputs, 24);
  printCounts('public cursor-info outcomes', aggregate.apiCursorInfoOutcomes, 18);
  printCounts('public cursor-info site kinds', aggregate.apiCursorInfoSiteKinds, 18);
  printCounts('public cursor-info value-site kinds', aggregate.apiCursorInfoValueSiteKinds, 18);
  printCounts('public cursor-info definition kinds', aggregate.apiCursorInfoDefinitionKinds, 18);
  printCounts('public cursor-info bindable sources', aggregate.apiCursorInfoBindableSources, 18);
  printCounts('public cursor-info source coverage', aggregate.apiCursorInfoSourceCoverage, 24);
  printCounts('public cursor-info selected-member coverage', aggregate.apiCursorInfoSelectedMemberCoverage, 18);
  printCounts('public cursor-info member-owner origins', aggregate.apiCursorInfoMemberOwnerOrigins, 18);
  printCounts('public cursor-info hover targets', aggregate.apiCursorInfoHoverTargets, 24);
  printCounts('public cursor-info navigation targets', aggregate.apiCursorInfoNavigationTargets, 24);
  printCounts('public cursor-info diagnostics', aggregate.apiCursorInfoDiagnostics, 24);
  printCounts('public cursor-info diagnostic suggestions', aggregate.apiCursorInfoDiagnosticSuggestions, 24);
  printCounts('public cursor-info diagnostic suggestion actions', aggregate.apiCursorInfoDiagnosticSuggestionActions, 24);
  printCounts('public cursor-info diagnostic suggestion targets', aggregate.apiCursorInfoDiagnosticSuggestionTargets, 24);
  printCounts('public cursor-info diagnostic owner origins', aggregate.apiCursorInfoDiagnosticOwnerOrigins, 24);
  printCounts('public cursor-info diagnostic signals', aggregate.apiCursorInfoDiagnosticSignals, 24);
  printCounts('public cursor-info LSP envelopes', aggregate.apiCursorInfoLspEnvelopes, 24);
  printCounts('public cursor-info exception classes', aggregate.apiCursorInfoExceptionClasses, 18);
  printCounts('public cursor-info mismatches', aggregate.apiCursorInfoMismatches, 18);
  printCounts('public cursor-info missing inputs', aggregate.apiCursorInfoMissingInputs, 18);
  printCounts('value-site kinds', aggregate.valueSiteKinds, 18);
  printCounts('outcomes by value-site kind', aggregate.outcomeValueSiteKinds, 18);
  printCounts('value-domain gaps', aggregate.valueDomainGaps, 18);
  printCounts('context missing inputs', aggregate.contextMissingInputs, 20);
  printCounts('answer missing inputs', aggregate.answerMissingInputs, 24);
  printCounts('candidate kinds', aggregate.candidateKinds);
  printCounts('candidate source kinds', aggregate.candidateSourceKinds);
  printCounts('frontier kinds', aggregate.frontierKinds);
  printCounts('expected continuation classes', aggregate.expectedContinuationClasses);
}

async function readCursorPressureForRoot(root) {
  const runtime = await createSemanticRuntime({ workspaceRoot: root, projectDiscovery });
  const summary = runtime.summary({ projectPage: { size: projectLimit } }).value;
  const aggregate = {
    projects: summary.projects.length,
    selectedProjects: 0,
    openedAppWorlds: 0,
    resourceDefinitions: 0,
    customElementDefinitions: 0,
    customElementDefinitionsWithTemplates: 0,
    projectsWithTemplateDefinitions: 0,
    projectsWithCompiledTemplates: 0,
    projectsWithTemplateDefinitionsNoCompiledTemplates: 0,
    appRuntimeTemplatesSeen: 0,
    authoringTemplatesSeen: 0,
    authoringSourceFilesRequested: 0,
    templatesSeen: 0,
    templatesSampled: 0,
    lociSampled: 0,
    diagnosticLociAvailable: 0,
    diagnosticLociSampled: 0,
    candidateRows: 0,
    projectShapeKinds: {},
    skippedProjectShapeKinds: {},
    projectAnalysisKinds: {},
    skippedProjectAnalysisKinds: {},
    projectShapeReasons: {},
    sampleLanes: {},
    siteKinds: {},
    outcomes: {},
    outcomeSiteKinds: {},
    outcomeSampleLanes: {},
    completionPressureClasses: {},
    outcomeCompletionPressureClasses: {},
    apiOutcomes: {},
    apiSiteKinds: {},
    apiCompletionPressureClasses: {},
    apiExceptionClasses: {},
    apiAnswerMismatches: {},
    apiTemplateResourceMissReasons: {},
    apiMissingInputs: {},
    apiCursorInfoOutcomes: {},
    apiCursorInfoSiteKinds: {},
    apiCursorInfoValueSiteKinds: {},
    apiCursorInfoDefinitionKinds: {},
    apiCursorInfoBindableSources: {},
    apiCursorInfoSourceCoverage: {},
    apiCursorInfoSelectedMemberCoverage: {},
    apiCursorInfoMemberOwnerOrigins: {},
    apiCursorInfoHoverTargets: {},
    apiCursorInfoNavigationTargets: {},
    apiCursorInfoDiagnostics: {},
    apiCursorInfoDiagnosticSuggestions: {},
    apiCursorInfoDiagnosticSuggestionActions: {},
    apiCursorInfoDiagnosticSuggestionTargets: {},
    apiCursorInfoDiagnosticOwnerOrigins: {},
    apiCursorInfoDiagnosticSignals: {},
    apiCursorInfoLspEnvelopes: {},
    apiCursorInfoExceptionClasses: {},
    apiCursorInfoMismatches: {},
    apiCursorInfoMissingInputs: {},
    valueSiteKinds: {},
    outcomeValueSiteKinds: {},
    valueDomainGaps: {},
    contextMissingInputs: {},
    answerMissingInputs: {},
    candidateKinds: {},
    candidateSourceKinds: {},
    frontierKinds: {},
    expectedContinuationClasses: {},
  };
  const sourceCache = new Map();

  for (const project of summary.projects.slice(0, projectLimit)) {
    const projectFrame = runtime.workspace.projects.find((candidate) => candidate.projectKey === project.projectKey);
    increment(aggregate.projectShapeKinds, project.shapeKind);
    increment(aggregate.projectAnalysisKinds, project.analysisKind);
    for (const shapeReason of project.shapeReasons ?? []) {
      increment(aggregate.projectShapeReasons, shapeReason.reason, shapeReason.count);
    }
    if (projectShapeFilter != null && !projectShapeFilter.has(project.shapeKind)) {
      increment(aggregate.skippedProjectShapeKinds, project.shapeKind);
      continue;
    }
    if (projectShapeFilter == null && !defaultCursorPressureAnalysisKinds.has(project.analysisKind)) {
      increment(aggregate.skippedProjectAnalysisKinds, project.analysisKind);
      continue;
    }
    aggregate.selectedProjects += 1;
    let app;
    const authoringTemplateSourceFiles = projectFrame == null
      ? []
      : authoringTemplateSourceFilesForProject(projectFrame);
    aggregate.authoringSourceFilesRequested += authoringTemplateSourceFiles.length;
    try {
      app = await runtime.openApp({
        projectKey: project.projectKey,
        analysisDepth,
        includeAuthoringTemplates: true,
        authoringTemplateSourceFiles,
        authoringTemplateLimit: authoringTemplateSourceFiles.length === 0
          ? authoringTemplateLimitPerProject
          : null,
      });
    } catch {
      continue;
    }
    aggregate.openedAppWorlds += 1;
    const definitions = app.emission.resources.readDefinitions();
    const customElements = definitions.filter((definition) => definition.type === 'custom-element');
    const customElementsWithTemplates = customElements.filter((definition) => definition.template != null);
    aggregate.resourceDefinitions += definitions.length;
    aggregate.customElementDefinitions += customElements.length;
    aggregate.customElementDefinitionsWithTemplates += customElementsWithTemplates.length;
    if (customElementsWithTemplates.length > 0) {
      aggregate.projectsWithTemplateDefinitions += 1;
    }
    const templateResources = [
      ...app.emission.templates.resources,
      ...app.emission.templates.authoringResources,
    ];
    aggregate.appRuntimeTemplatesSeen += app.emission.templates.resources.length;
    aggregate.authoringTemplatesSeen += app.emission.templates.authoringResources.length;
    if (templateResources.length > 0) {
      aggregate.projectsWithCompiledTemplates += 1;
    } else if (customElementsWithTemplates.length > 0) {
      aggregate.projectsWithTemplateDefinitionsNoCompiledTemplates += 1;
    }
    const diagnosticRowsBySourcePath = await readDiagnosticRowsBySourcePath(runtime, app.project.projectKey);
    aggregate.diagnosticLociAvailable += countDiagnosticRows(diagnosticRowsBySourcePath);

    for (const resource of templateResources) {
      aggregate.templatesSeen += 1;
      if (aggregate.templatesSampled >= templateLimit || aggregate.lociSampled >= sampleLimit) {
        continue;
      }
      const source = templateSource(root, runtime.workspace.store, resource, sourceCache);
      if (source == null) {
        continue;
      }
      const diagnosticRows = diagnosticRowsForResourceSource(
        runtime.workspace.store,
        resource,
        diagnosticRowsBySourcePath,
        source.filePath,
      );
      const loci = cursorLociForResource(runtime.workspace.store, resource, diagnosticRows, perResourceLimit);
      if (loci.length === 0) {
        continue;
      }
      aggregate.templatesSampled += 1;

      for (const locusSpec of loci) {
        if (aggregate.lociSampled >= sampleLimit) {
          break;
        }
        aggregate.lociSampled += 1;
        if (locusSpec.fromDiagnostic === true) {
          aggregate.diagnosticLociSampled += 1;
        }
        increment(aggregate.sampleLanes, locusSpec.lane);
        const position = positionForOffset(source, locusSpec.sourceOffset);
        const locus = new SourceCursorInquiryLocus(
          new SourceTextCursor(source.filePath, position.line, position.character, locusSpec.sourceOffset),
          resource.compilation.unit.templateSource.sourceAddressHandle,
        );
        const context = templateCompletionQueryForCursor(runtime.workspace.store, {
          locus,
          resource,
          page: new InquiryPageRequest(pageSize, null),
          routeConfigProductHandles: app.emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
          i18nTranslationKeyProductHandles: app.emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
        });
        const answer = answerTemplateCompletion(runtime.workspace.store, context.query);
        const rows = answer.value.candidates;
        const valueSite = context.valueSiteProductHandle == null
          ? null
          : runtime.workspace.store.productDetails.read(TemplateProductDetails.ValueSite, context.valueSiteProductHandle);
        const apiCompletionAnswer = await recordPublicApiCompletionPressure(
          aggregate,
          runtime.workspace.store,
          runtime,
          app.project.projectKey,
          resource,
          source,
          position,
          locusSpec.sourceOffset,
          answer,
          valueSite,
        );
        const apiCursorInfoAnswer = await recordPublicApiCursorInfoPressure(
          aggregate,
          runtime,
          app.project.projectKey,
          source,
          position,
          locusSpec.sourceOffset,
          context,
          valueSite,
          apiCompletionAnswer ?? answer,
        );
        if (apiCompletionAnswer != null) {
          increment(
            aggregate.apiCompletionPressureClasses,
            completionPressureClass(apiCompletionAnswer, valueSite, apiCursorInfoAnswer?.value ?? null),
          );
        }
        aggregate.candidateRows += rows.length;
        increment(aggregate.outcomes, answer.outcome);
        increment(aggregate.siteKinds, answer.value.siteKind);
        increment(aggregate.outcomeSiteKinds, `${answer.outcome}:${answer.value.siteKind}`);
        increment(aggregate.outcomeSampleLanes, `${answer.outcome}:${locusSpec.lane}`);
        const pressureClass = completionPressureClass(answer, valueSite, apiCursorInfoAnswer?.value ?? null);
        increment(aggregate.completionPressureClasses, pressureClass);
        increment(aggregate.outcomeCompletionPressureClasses, `${answer.outcome}:${pressureClass}`);
        if (valueSite != null) {
          increment(aggregate.valueSiteKinds, valueSite.siteKind);
          increment(aggregate.outcomeValueSiteKinds, `${answer.outcome}:${valueSite.siteKind}`);
        } else if (answer.value.siteKind === 'attribute-value') {
          increment(aggregate.outcomeValueSiteKinds, `${answer.outcome}:none`);
        }
        for (const missing of context.missingInputs) {
          increment(aggregate.contextMissingInputs, bucketMissingInput(missing));
        }
        for (const missing of answer.value.missingInputs) {
          const bucket = bucketMissingInput(missing);
          increment(aggregate.answerMissingInputs, bucket);
          if (bucket.startsWith('attribute-value-domain:')) {
            increment(aggregate.valueDomainGaps, `${bucket}:${valueSite?.siteKind ?? 'unknown'}`);
          }
        }
        if (answer.value.expressionFrontier?.frontierKind != null) {
          increment(aggregate.frontierKinds, answer.value.expressionFrontier.frontierKind);
        }
        for (const expected of answer.value.expressionFrontier?.expectedContinuationClasses ?? []) {
          increment(aggregate.expectedContinuationClasses, expected);
        }
        for (const row of rows) {
          increment(aggregate.candidateKinds, row.candidateKind);
          increment(aggregate.candidateSourceKinds, row.sourceKind);
        }
      }
    }
  }

  return aggregate;
}

async function recordPublicApiCursorInfoPressure(
  aggregate,
  runtime,
  projectKey,
  source,
  position,
  offset,
  context,
  valueSite,
  completionAnswer,
) {
  let apiAnswer;
  try {
    apiAnswer = await runtime.templateCursorInfo({
      projectKey,
      cursor: {
        filePath: source.filePath,
        line: position.line,
        character: position.character,
        offset,
      },
    });
  } catch (error) {
    increment(aggregate.apiCursorInfoOutcomes, 'exception');
    increment(aggregate.apiCursorInfoExceptionClasses, runtimeExceptionClass(error));
    increment(aggregate.apiCursorInfoMismatches, 'api-exception');
    return;
  }

  increment(aggregate.apiCursorInfoOutcomes, apiAnswer.outcome);
  increment(aggregate.apiCursorInfoSiteKinds, apiAnswer.value.siteKind);
  increment(aggregate.apiCursorInfoValueSiteKinds, apiAnswer.value.valueSite?.siteKind ?? 'none');
  increment(aggregate.apiCursorInfoDefinitionKinds, apiAnswer.value.selectedDefinition?.resourceKind ?? 'none');
  increment(
    aggregate.apiCursorInfoBindableSources,
    apiAnswer.value.selectedBindable == null
      ? 'none'
      : apiAnswer.value.selectedBindable.source == null ? 'selected:no-source' : 'selected:source',
  );
  recordCursorInfoSourceCoverage(aggregate, apiAnswer.value);
  recordCursorInfoDiagnostics(aggregate, apiAnswer.value);
  recordCursorInfoFeaturePressure(aggregate, apiAnswer.value, completionAnswer, valueSite);
  if (apiAnswer.value.siteKind !== context.query.siteKind) {
    increment(aggregate.apiCursorInfoMismatches, `site-kind:${context.query.siteKind}->${apiAnswer.value.siteKind}`);
  }
  const contextValueSiteKind = valueSite?.siteKind ?? 'none';
  const apiValueSiteKind = apiAnswer.value.valueSite?.siteKind ?? 'none';
  if (contextValueSiteKind !== apiValueSiteKind) {
    increment(aggregate.apiCursorInfoMismatches, `value-site:${contextValueSiteKind}->${apiValueSiteKind}`);
  }
  const contextBindable = context.selectedBindable == null ? 'none' : 'selected';
  const apiBindable = apiAnswer.value.selectedBindable == null ? 'none' : 'selected';
  if (contextBindable !== apiBindable) {
    increment(aggregate.apiCursorInfoMismatches, `bindable:${contextBindable}->${apiBindable}`);
  }
  for (const missing of apiAnswer.value.missingInputs) {
    increment(aggregate.apiCursorInfoMissingInputs, bucketMissingInput(missing));
  }
  return apiAnswer;
}

function recordCursorInfoDiagnostics(aggregate, value) {
  for (const diagnostic of value.diagnostics ?? []) {
    for (const missingInput of diagnosticMissingInputs(diagnostic)) {
      increment(
        aggregate.apiCursorInfoDiagnostics,
        `${diagnostic.severity}:${diagnostic.diagnosticAuthority ?? 'unknown'}:${diagnostic.frameworkErrorCode ?? 'none'}:${diagnostic.diagnosticKind}:${missingInput}`,
      );
    }
    increment(aggregate.apiCursorInfoDiagnosticSuggestions, diagnostic.suggestion?.suggestionKind ?? 'none');
    increment(aggregate.apiCursorInfoDiagnosticSuggestionActions, diagnostic.suggestion?.actionKind ?? 'none');
    increment(aggregate.apiCursorInfoDiagnosticSuggestionTargets, suggestionTargetKey(diagnostic.suggestion));
    increment(aggregate.apiCursorInfoDiagnosticOwnerOrigins, diagnostic.ownerTypeOrigin ?? 'none');
  }
}

function diagnosticMissingInputs(diagnostic) {
  return diagnostic.missingInputs?.length > 0
    ? diagnostic.missingInputs
    : [diagnostic.missingInput ?? 'none'];
}

function recordCursorInfoSourceCoverage(aggregate, value) {
  increment(aggregate.apiCursorInfoSourceCoverage, `template:${sourceReferenceState(value.template.source)}`);
  increment(aggregate.apiCursorInfoSourceCoverage, `html-node:${htmlNodeSourceState(value.html)}`);
  increment(aggregate.apiCursorInfoSourceCoverage, `html-attribute:${htmlAttributeSourceState(value.html)}`);
  increment(aggregate.apiCursorInfoSourceCoverage, `value-site:${rowSourceState(value.valueSite)}`);
  increment(aggregate.apiCursorInfoSourceCoverage, `definition:${rowSourceState(value.selectedDefinition)}`);
  increment(aggregate.apiCursorInfoSourceCoverage, `bindable:${rowSourceState(value.selectedBindable)}`);
  increment(aggregate.apiCursorInfoSourceCoverage, `selected-member:${selectedMemberSourceState(value)}`);
  increment(aggregate.apiCursorInfoSourceCoverage, `member-owner:${rowSourceState(value.memberOwnerType)}`);
  increment(aggregate.apiCursorInfoSourceCoverage, `member-owner-declaration:${memberOwnerDeclarationSourceState(value)}`);
  increment(aggregate.apiCursorInfoSelectedMemberCoverage, selectedMemberCoverageState(value));
  increment(aggregate.apiCursorInfoMemberOwnerOrigins, value.memberOwnerType?.origin ?? 'none');
}

function selectedMemberCoverageState(value) {
  if (value.selectedMemberName == null) {
    return 'not-a-member-site';
  }
  if (value.selectedMember == null) {
    return value.memberOwnerType == null ? 'missing:no-owner' : 'missing:owner-known';
  }
  if (value.selectedMember.memberKind === 'index-signature' && value.selectedMember.source == null) {
    return 'selected:synthetic-index-signature';
  }
  return `selected:${sourceReferenceState(value.selectedMember.source)}`;
}

function selectedMemberSourceState(value) {
  if (value.selectedMember == null) {
    return 'none';
  }
  if (value.selectedMember.memberKind === 'index-signature' && value.selectedMember.source == null) {
    return 'synthetic-index-signature';
  }
  return sourceReferenceState(value.selectedMember.source);
}

function memberOwnerDeclarationSourceState(value) {
  return value.memberOwnerType == null
    ? 'none'
    : sourceReferenceState(value.memberOwnerType.declarationSource);
}

function rowSourceState(row) {
  if (row == null) {
    return 'none';
  }
  return sourceReferenceState(row.source);
}

function sourceReferenceState(source) {
  return source == null ? 'no-source' : 'source';
}

function htmlNodeSourceState(html) {
  return html.nodeKind == null ? 'none' : sourceReferenceState(html.source);
}

function htmlAttributeSourceState(html) {
  return html.attributeName == null ? 'none' : sourceReferenceState(html.attributeSource);
}

function suggestionTargetKey(suggestion) {
  const target = suggestion?.actionTarget ?? null;
  if (target == null) {
    return 'none';
  }
  return `${target.targetKind}:${sourceReferenceState(target.source)}`;
}

function recordCursorInfoFeaturePressure(aggregate, value, completionAnswer, valueSite) {
  const hoverTargets = cursorInfoHoverTargets(value);
  const navigationTargets = cursorInfoNavigationTargets(value);
  const diagnosticSignals = cursorInfoDiagnosticSignals(value, completionAnswer, valueSite);
  for (const target of hoverTargets) {
    increment(aggregate.apiCursorInfoHoverTargets, target);
  }
  for (const target of navigationTargets) {
    increment(aggregate.apiCursorInfoNavigationTargets, target);
  }
  for (const signal of diagnosticSignals) {
    increment(aggregate.apiCursorInfoDiagnosticSignals, signal);
  }
  increment(
    aggregate.apiCursorInfoLspEnvelopes,
    [
      `site=${value.siteKind}`,
      `value=${value.valueSite?.siteKind ?? 'none'}`,
      `hover=${primaryFeatureClass(hoverTargets)}`,
      `nav=${primaryFeatureClass(navigationTargets)}`,
      `diag=${primaryDiagnosticSignal(diagnosticSignals)}`,
    ].join(';'),
  );
}

function cursorInfoHoverTargets(value) {
  const targets = [];
  if (value.selectedBindable != null) {
    targets.push(`bindable:${sourceReferenceState(value.selectedBindable.source)}`);
  }
  if (value.selectedDefinition != null) {
    targets.push(`definition:${value.selectedDefinition.resourceKind}:${sourceReferenceState(value.selectedDefinition.source)}`);
  }
  if (value.selectedMember != null) {
    targets.push(`selected-member:${selectedMemberSourceState(value)}`);
  }
  if (value.memberOwnerType != null) {
    targets.push(
      `member-owner:${value.memberOwnerType.shapeKind ?? 'unknown'}:` +
      `projection=${sourceReferenceState(value.memberOwnerType.source)}:` +
      `declaration=${sourceReferenceState(value.memberOwnerType.declarationSource)}`,
    );
  }
  if (value.valueSite != null) {
    targets.push(`value-site:${value.valueSite.siteKind}:${sourceReferenceState(value.valueSite.source)}`);
  }
  if (value.html.attributeName != null) {
    targets.push(`html-attribute:${sourceReferenceState(value.html.attributeSource)}`);
  }
  if (value.html.tagName != null) {
    targets.push(`html-element:${sourceReferenceState(value.html.source)}`);
  }
  return targets.length === 0 ? ['none'] : targets;
}

function cursorInfoNavigationTargets(value) {
  const targets = [];
  if (value.selectedBindable != null) {
    targets.push(`bindable:${sourceReferenceState(value.selectedBindable.source)}`);
  }
  if (value.selectedDefinition != null) {
    targets.push(`definition:${value.selectedDefinition.resourceKind}:${sourceReferenceState(value.selectedDefinition.source)}`);
  }
  if (value.selectedMember?.source != null) {
    targets.push(`selected-member:${sourceReferenceState(value.selectedMember.source)}`);
  }
  if (value.memberOwnerType != null) {
    targets.push(
      `member-owner:` +
      `projection=${sourceReferenceState(value.memberOwnerType.source)}:` +
      `declaration=${sourceReferenceState(value.memberOwnerType.declarationSource)}`,
    );
  }
  return targets.length === 0 ? ['none'] : targets;
}

function cursorInfoDiagnosticSignals(value, completionAnswer, valueSite) {
  const signals = [];
  for (const diagnostic of value.diagnostics ?? []) {
    for (const missingInput of diagnosticMissingInputs(diagnostic)) {
      signals.push(
        `cursor-diagnostic:${diagnostic.diagnosticAuthority ?? 'unknown'}:${diagnostic.frameworkErrorCode ?? 'none'}:${diagnostic.diagnosticKind}:${missingInput}`,
      );
    }
    if (diagnostic.suggestion?.suggestionKind != null) {
      signals.push(`cursor-suggestion:${diagnostic.suggestion.suggestionKind}`);
    }
    if (diagnostic.suggestion?.actionKind != null) {
      signals.push(`cursor-action:${diagnostic.suggestion.actionKind}`);
    }
  }
  for (const missing of value.missingInputs) {
    signals.push(`missing-input:${bucketMissingInput(missing)}`);
  }
  for (const missing of completionAnswer?.value?.missingInputs ?? []) {
    signals.push(`completion-missing-input:${bucketMissingInput(missing)}`);
  }
  const completionPressure = completionAnswer == null
    ? null
    : completionPressureClass(completionAnswer, valueSite, value);
  if (completionPressure != null
    && completionPressure !== 'complete'
    && !completionPressure.startsWith('expected-empty:')) {
    signals.push(`completion-pressure:${completionPressure}`);
  }
  if (value.selectedMemberName != null
    && value.selectedMember == null
    && value.memberOwnerType != null
    && !completionAnswerHasWeakMemberOwner(completionAnswer)) {
    signals.push('selected-member:missing');
  }
  for (const expected of value.expressionFrontier?.expectedContinuationClasses ?? []) {
    signals.push(`expected-continuation:${expected}`);
  }
  if (signals.length === 0 && value.expressionFrontier?.frontierKind != null) {
    signals.push(`frontier:${value.expressionFrontier.frontierKind}`);
  }
  return signals.length === 0 ? ['none'] : signals;
}

function completionAnswerHasWeakMemberOwner(completionAnswer) {
  return completionAnswer?.value?.missingInputs?.some((missing) =>
    bucketMissingInput(missing).startsWith('expression-member-owner-type:')
  ) === true;
}

function primaryFeatureClass(targets) {
  const semanticTarget = targets.find((target) => !target.startsWith('html-') && target !== 'none');
  return semanticTarget ?? targets[0] ?? 'none';
}

function primaryDiagnosticSignal(signals) {
  return signals.find((signal) => signal !== 'none') ?? 'none';
}

async function recordPublicApiCompletionPressure(
  aggregate,
  store,
  runtime,
  projectKey,
  resource,
  source,
  position,
  offset,
  inquiryAnswer,
  valueSite,
) {
  let apiAnswer;
  try {
    apiAnswer = await runtime.templateCompletions({
      projectKey,
      cursor: {
        filePath: source.filePath,
        line: position.line,
        character: position.character,
        offset,
      },
      page: {
        size: pageSize,
        cursor: null,
      },
    });
  } catch (error) {
    increment(aggregate.apiOutcomes, 'exception');
    increment(aggregate.apiExceptionClasses, runtimeExceptionClass(error));
    increment(aggregate.apiAnswerMismatches, 'api-exception');
    return;
  }

  increment(aggregate.apiOutcomes, apiAnswer.outcome);
  increment(aggregate.apiSiteKinds, apiAnswer.value.siteKind);
  compareCompletionAnswers(aggregate, inquiryAnswer, apiAnswer);

  for (const missing of apiAnswer.value.missingInputs) {
    const bucket = bucketMissingInput(missing);
    increment(aggregate.apiMissingInputs, bucket);
    if (bucket === 'template-resource') {
      increment(aggregate.apiTemplateResourceMissReasons, templateResourceMissReason(store, resource, source.filePath, offset));
    }
  }
  return apiAnswer;
}

function templateResourceMissReason(
  store,
  resource,
  filePath,
  offset,
) {
  const span = templateSourceSpan(store, resource);
  if (span == null) {
    return 'expected-resource-source-span:missing';
  }
  const file = store.readAddress(span.fileHandle);
  if (file?.kind !== 'source-file-address') {
    return 'expected-resource-source-file:missing';
  }
  if (!hostPathMatches(file.path, filePath)) {
    return 'expected-resource-source-file:mismatch';
  }
  if (sourceSpanContainsOffset(span, offset)) {
    return 'expected-resource-source-span:contains-cursor';
  }
  if (resource.compilation.html.nodes.some((node) => addressContainsOffset(store, node.sourceAddressHandle, offset))) {
    return 'template-source-span:excludes-cursor:html-node-contains';
  }
  if (resource.compilation.html.attributes.some((attribute) => addressContainsOffset(store, attribute.sourceAddressHandle, offset))) {
    return 'template-source-span:excludes-cursor:html-attribute-contains';
  }
  if (resource.compilation.html.attributes.some((attribute) => addressContainsOffset(store, attribute.nameAddressHandle, offset))) {
    return 'template-source-span:excludes-cursor:attribute-name-contains';
  }
  if (resource.compilation.html.attributes.some((attribute) => addressContainsOffset(store, attribute.valueAddressHandle, offset))) {
    return 'template-source-span:excludes-cursor:attribute-value-contains';
  }
  return offset < span.start
    ? 'template-source-span:after-cursor'
    : 'template-source-span:before-cursor';
}

function addressContainsOffset(store, addressHandle, offset) {
  const span = sourceSpanFor(store, addressHandle);
  return span != null && sourceSpanContainsOffset(span, offset);
}

function sourceSpanContainsOffset(span, offset) {
  return span.start <= offset && offset <= span.end;
}

function hostPathMatches(left, right) {
  const normalizedLeft = normalizeHostPath(left);
  const normalizedRight = normalizeHostPath(right);
  return normalizedLeft === normalizedRight
    || normalizedLeft.endsWith(`/${normalizedRight}`)
    || normalizedRight.endsWith(`/${normalizedLeft}`);
}

function compareCompletionAnswers(
  aggregate,
  inquiryAnswer,
  apiAnswer,
) {
  if (inquiryAnswer.outcome !== apiAnswer.outcome) {
    increment(aggregate.apiAnswerMismatches, `outcome:${inquiryAnswer.outcome}->${apiAnswer.outcome}`);
  }
  if (inquiryAnswer.value.siteKind !== apiAnswer.value.siteKind) {
    increment(aggregate.apiAnswerMismatches, `site-kind:${inquiryAnswer.value.siteKind}->${apiAnswer.value.siteKind}`);
  }
  if (inquiryAnswer.value.candidates.length !== apiAnswer.value.candidates.length) {
    increment(aggregate.apiAnswerMismatches, 'candidate-count');
  }
  if (candidateKindSignature(inquiryAnswer.value.candidates) !== candidateKindSignature(apiAnswer.value.candidates)) {
    increment(aggregate.apiAnswerMismatches, 'candidate-kind-distribution');
  }
  if (missingInputSignature(inquiryAnswer.value.missingInputs) !== missingInputSignature(apiAnswer.value.missingInputs)) {
    increment(aggregate.apiAnswerMismatches, 'missing-input-distribution');
  }
}

function candidateKindSignature(candidates) {
  const counts = {};
  for (const candidate of candidates) {
    increment(counts, candidate.candidateKind);
  }
  return countSignature(counts);
}

function missingInputSignature(inputs) {
  const counts = {};
  for (const input of inputs) {
    increment(counts, bucketMissingInput(input));
  }
  return countSignature(counts);
}

function runtimeExceptionClass(error) {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Duplicate kernel record handle')) {
    return 'duplicate-kernel-record';
  }
  if (message.includes('Cannot open semantic app: source file')) {
    return 'source-file-not-admitted';
  }
  const nullishRead = message.match(/Cannot read properties of (undefined|null) \(reading '([^']+)'\)/);
  if (nullishRead != null) {
    return `nullish-property-read:${nullishRead[2]}`;
  }
  return name === 'Error' ? 'error' : name;
}

function countSignature(counts) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
}

function authoringTemplateSourceFilesForProject(project) {
  return project.sourceFiles
    .filter((source) => source.role === 'template' || source.path.toLowerCase().endsWith('.html'))
    .map((source) => source.path)
    .slice(0, authoringSourceFileLimitPerProject);
}

async function readDiagnosticRowsBySourcePath(runtime, projectKey) {
  const rowsBySourcePath = new Map();
  let cursor = null;
  while (countDiagnosticRows(rowsBySourcePath) < diagnosticReadLimitPerProject) {
    const remaining = diagnosticReadLimitPerProject - countDiagnosticRows(rowsBySourcePath);
    const answer = await runtime.templateDiagnostics({
      projectKey,
      page: {
        size: Math.min(200, remaining),
        cursor,
      },
    });
    for (const row of answer.value.rows) {
      const key = normalizedSourcePath(row.source?.path);
      if (key == null) {
        continue;
      }
      let rows = rowsBySourcePath.get(key);
      if (rows === undefined) {
        rows = [];
        rowsBySourcePath.set(key, rows);
      }
      rows.push(row);
    }
    cursor = answer.page?.nextCursor ?? null;
    if (cursor == null) {
      break;
    }
  }
  return rowsBySourcePath;
}

function countDiagnosticRows(rowsBySourcePath) {
  let count = 0;
  for (const rows of rowsBySourcePath.values()) {
    count += rows.length;
  }
  return count;
}

function diagnosticRowsForSource(rowsBySourcePath, filePath) {
  const key = normalizedSourcePath(filePath);
  if (key == null) {
    return [];
  }
  const direct = rowsBySourcePath.get(key);
  if (direct !== undefined) {
    return direct;
  }
  const suffixMatches = [];
  for (const [candidateKey, rows] of rowsBySourcePath) {
    if (sourcePathSuffixMatches(key, candidateKey)) {
      suffixMatches.push(...rows);
    }
  }
  return suffixMatches;
}

function diagnosticRowsForResourceSource(store, resource, rowsBySourcePath, filePath) {
  const rows = diagnosticRowsForSource(rowsBySourcePath, filePath);
  if (rows.length === 0) {
    return rows;
  }
  const spans = cursorCandidateSpansForResource(store, resource);
  return rows.filter((row) => diagnosticRowBelongsToResource(store, row, spans));
}

function diagnosticRowBelongsToResource(store, row, spans) {
  const start = row.source?.start;
  const end = row.source?.end;
  const filePath = row.source?.path;
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start || filePath == null) {
    return false;
  }
  const midpoint = start + Math.floor((end - start) / 2);
  return spans.some((span) =>
    sourceSpanFileMatches(store, span, filePath) && sourceSpanContainsOffset(span, midpoint)
  );
}

function cursorCandidateSpansForResource(store, resource) {
  return [
    templateSourceSpan(store, resource),
    sourceSpanFor(store, resource.compilation.html.document.sourceAddressHandle),
    ...resource.compilation.html.nodes.map((node) => sourceSpanFor(store, node.sourceAddressHandle)),
    ...resource.compilation.html.attributes.flatMap((attribute) => [
      sourceSpanFor(store, attribute.sourceAddressHandle),
      sourceSpanFor(store, attribute.nameAddressHandle),
      sourceSpanFor(store, attribute.valueAddressHandle),
    ]),
  ].filter((span) => span != null);
}

function sourceSpanFileMatches(store, span, filePath) {
  const file = store.readAddress(span.fileHandle);
  return file?.kind === 'source-file-address' && hostPathMatches(file.path, filePath);
}

function normalizedSourcePath(filePath) {
  if (filePath == null || filePath.length === 0) {
    return null;
  }
  return path.normalize(filePath).toLowerCase();
}

function sourcePathSuffixMatches(left, right) {
  return left.endsWith(pathSeparatorPrefixed(right))
    || right.endsWith(pathSeparatorPrefixed(left));
}

function pathSeparatorPrefixed(value) {
  return value.startsWith('\\') || value.startsWith('/')
    ? value
    : `${path.sep}${value}`;
}

function cursorLociForResource(store, resource, diagnosticRows, limit) {
  const loci = [];
  const seen = new Set();
  addDiagnosticLoci(diagnosticRows, loci, seen, 6);
  addElementNameLoci(store, resource, loci, seen, 2);
  addAttributeNameLoci(store, resource, loci, seen, 4);
  addAttributeValueLoci(store, resource, loci, seen, 5);
  addExpressionLoci(resource, loci, seen, 8);
  return loci.slice(0, limit);
}

function addDiagnosticLoci(diagnosticRows, loci, seen, limit) {
  const buckets = diagnosticRowsByPressureClass(diagnosticRows);
  let count = 0;
  while (count < limit && buckets.some((bucket) => bucket.index < bucket.rows.length)) {
    for (const bucket of buckets) {
      if (count >= limit) {
        break;
      }
      if (bucket.index >= bucket.rows.length) {
        continue;
      }
      const row = bucket.rows[bucket.index];
      bucket.index += 1;
      const start = row.source?.start;
      const end = row.source?.end;
      if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
        continue;
      }
      if (addLocus(loci, seen, 'diagnostic-probe', start + Math.floor((end - start) / 2), true)) {
        count += 1;
      }
    }
  }
}

function diagnosticRowsByPressureClass(diagnosticRows) {
  const byKey = new Map();
  for (const row of diagnosticRows) {
    const key = diagnosticPressureClassKey(row);
    let rows = byKey.get(key);
    if (rows === undefined) {
      rows = [];
      byKey.set(key, rows);
    }
    rows.push(row);
  }
  return [...byKey.entries()]
    .sort(([leftKey, leftRows], [rightKey, rightRows]) =>
      leftRows.length - rightRows.length || leftKey.localeCompare(rightKey)
    )
    .map(([key, rows]) => ({ key, rows, index: 0 }));
}

function diagnosticPressureClassKey(row) {
  return [
    row.diagnosticKind,
    bucketMissingInput(row.missingInput ?? row.missingInputs?.[0] ?? null),
    row.suggestion?.suggestionKind ?? 'none',
    row.valueSiteKind ?? 'none',
  ].join(':');
}

function addElementNameLoci(store, resource, loci, seen, limit) {
  let count = 0;
  for (const node of resource.compilation.html.nodes) {
    if (node.tagName == null || count >= limit) {
      continue;
    }
    const span = sourceSpanFor(store, node.sourceAddressHandle);
    if (span == null) {
      continue;
    }
    addLocus(loci, seen, 'element-name-probe', span.start + 1 + Math.floor(node.tagName.length / 2));
    count += 1;
  }
}

function addAttributeNameLoci(store, resource, loci, seen, limit) {
  let count = 0;
  for (const attribute of resource.compilation.html.attributes) {
    if (count >= limit) {
      break;
    }
    const span = sourceSpanFor(store, attribute.nameAddressHandle);
    if (span == null) {
      continue;
    }
    addLocus(loci, seen, 'attribute-name-probe', span.start + Math.floor(attribute.rawName.length / 2));
    count += 1;
  }
}

function addAttributeValueLoci(store, resource, loci, seen, limit) {
  let count = 0;
  for (const attribute of resource.compilation.html.attributes) {
    if (count >= limit) {
      break;
    }
    const span = sourceSpanFor(store, attribute.valueAddressHandle);
    if (span == null || span.end <= span.start) {
      continue;
    }
    addLocus(loci, seen, 'attribute-value-probe', span.start + Math.floor((span.end - span.start) / 2));
    count += 1;
  }
}

function addExpressionLoci(resource, loci, seen, limit) {
  let count = 0;
  for (const parse of templateExpressionParses(resource)) {
    for (const expression of expressionRoots(parse.result)) {
      if (count >= limit) {
        return;
      }
      const offsets = expressionOffsets(expression);
      for (const offset of offsets) {
        if (count >= limit) {
          return;
        }
        if (addLocus(loci, seen, offset.lane, offset.sourceOffset)) {
          count += 1;
        }
      }
    }
  }
}

function templateExpressionParses(resource) {
  return [
    ...resource.compilation.bindingCommandLowering.expressionParses,
    ...resource.compilation.valueSites.parses,
  ];
}

function expressionRoots(result) {
  const roots = [];
  if (result.ast != null) {
    roots.push(result.ast);
  }
  if (result.activeHole?.closedSubtreeRefs != null) {
    for (const ref of result.activeHole.closedSubtreeRefs) {
      roots.push(ref.node);
    }
  }
  if (result.closedSubtreeRefs != null) {
    for (const ref of result.closedSubtreeRefs) {
      roots.push(ref.node);
    }
  }
  if (result.closedHoles != null) {
    for (const hole of result.closedHoles) {
      roots.push(...expressionRoots(hole));
    }
  }
  return roots;
}

function expressionOffsets(expression) {
  const offsets = [];
  walkExpression(expression, (node) => {
    if ((node.$kind === 'AccessMember' || node.$kind === 'CallMember') && node.name?.span != null) {
      offsets.push({ lane: 'expression-member-probe', sourceOffset: midSpan(node.name.span) });
    }
    if ((node.$kind === 'AccessScope' || node.$kind === 'CallScope') && node.name?.span != null) {
      offsets.push({ lane: 'expression-scope-probe', sourceOffset: midSpan(node.name.span) });
    }
    if ((node.$kind === 'ValueConverter' || node.$kind === 'BindingBehavior') && node.name?.span != null) {
      offsets.push({ lane: 'expression-tail-probe', sourceOffset: midSpan(node.name.span) });
    }
  });
  return offsets;
}

function walkExpression(value, visit, seen = new Set()) {
  if (value == null || typeof value !== 'object' || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (typeof value.$kind === 'string') {
    visit(value);
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        walkExpression(item, visit, seen);
      }
      continue;
    }
    walkExpression(child, visit, seen);
  }
}

function addLocus(loci, seen, lane, sourceOffset, fromDiagnostic = false) {
  const key = `${sourceOffset}`;
  if (seen.has(key)) {
    return false;
  }
  seen.add(key);
  loci.push({ lane, sourceOffset, fromDiagnostic });
  return true;
}

function midSpan(span) {
  return span.start + Math.floor((span.end - span.start) / 2);
}

function templateSource(root, store, resource, cache) {
  const span = templateSourceSpan(store, resource);
  if (span == null) {
    return null;
  }
  const file = store.readAddress(span.fileHandle);
  if (file?.kind !== 'source-file-address') {
    return null;
  }
  const filePath = path.isAbsolute(file.path) ? file.path : path.resolve(root, file.path);
  let source = cache.get(filePath);
  if (source == null) {
    try {
      const text = readFileSync(filePath, 'utf8');
      source = {
        filePath,
        text,
        lineStarts: lineStartsForText(text),
      };
    } catch {
      return null;
    }
    cache.set(filePath, source);
  }
  return source;
}

function templateSourceSpan(store, resource) {
  const handle = resource.compilation.unit.templateSource.sourceAddressHandle;
  const address = handle == null ? null : store.readAddress(handle);
  if (address?.kind === 'source-span-address') {
    return address;
  }
  if (address?.kind === 'template-address' && address.authoredSourceHandle != null) {
    const authored = store.readAddress(address.authoredSourceHandle);
    return authored?.kind === 'source-span-address' ? authored : null;
  }
  return null;
}

function sourceSpanFor(store, addressHandle) {
  const address = addressHandle == null ? null : store.readAddress(addressHandle);
  return address?.kind === 'source-span-address' ? address : null;
}

function positionForOffset(source, offset) {
  const line = lineIndexForOffset(source.lineStarts, offset);
  return {
    line,
    character: offset - source.lineStarts[line],
  };
}

function lineStartsForText(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charCodeAt(index);
    if (char === 13) {
      if (text.charCodeAt(index + 1) === 10) {
        index += 1;
      }
      starts.push(index + 1);
      continue;
    }
    if (char === 10) {
      starts.push(index + 1);
    }
  }
  return starts;
}

function lineIndexForOffset(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return Math.max(0, high);
}

function bucketMissingInput(value) {
  if (value.startsWith('attribute-value-domain:')) {
    return value.split(':').slice(0, 2).join(':');
  }
  if (value.startsWith('expression-member-owner-type:no-members:')) {
    return 'expression-member-owner-type:no-members';
  }
  return value;
}

function completionPressureClass(answer, valueSite, cursorInfoValue = null) {
  if (answer.outcome === 'hit' && answer.value.missingInputs.length === 0) {
    return 'complete';
  }
  const missingInputBuckets = answer.value.missingInputs.map(bucketMissingInput);
  const domainGap = missingInputBuckets.find((missing) => missing.startsWith('attribute-value-domain:'));
  if (domainGap != null) {
    return `${domainGap}:${valueSite?.siteKind ?? 'unknown'}`;
  }
  if (isExpectedEmptyPlainHtmlAttributeValue(answer, valueSite, cursorInfoValue, missingInputBuckets)) {
    return 'expected-empty:plain-html-attribute-value';
  }
  if (isExpectedEmptyAttributeValue(answer, valueSite)) {
    return `expected-empty:${valueSite.siteKind}`;
  }
  if (isExpectedEmptyOpenScalarBindable(answer, valueSite)) {
    return 'expected-empty:open-ended-bindable-value';
  }
  if (isExpectedEmptyOpenTemplateControllerValue(answer, valueSite)) {
    return 'expected-empty:open-ended-template-controller-value';
  }
  const weakType = weakTypeCompletionPressureClass(answer, missingInputBuckets);
  if (weakType != null) {
    return weakType;
  }
  const diagnosticBacked = diagnosticBackedCompletionPressureClass(cursorInfoValue, missingInputBuckets[0] ?? null);
  if (diagnosticBacked != null) {
    return diagnosticBacked;
  }
  const expectedContinuation = answer.value.expressionFrontier?.expectedContinuationClasses?.[0] ?? null;
  if (expectedContinuation != null) {
    return `expected-continuation:${expectedContinuation}`;
  }
  if (missingInputBuckets.length > 0) {
    return `missing-input:${missingInputBuckets[0]}`;
  }
  if (answer.outcome === 'hit') {
    return 'complete-with-pressure';
  }
  return `unexplained-${answer.outcome}:${answer.value.siteKind}`;
}

function diagnosticBackedCompletionPressureClass(cursorInfoValue, missingInput = null) {
  const diagnostic = cursorInfoValue?.diagnostics?.[0] ?? null;
  if (diagnostic == null) {
    return null;
  }
  const missingSuffix = missingInput == null ? '' : `:${missingInput}`;
  return `diagnostic-backed:${diagnostic.diagnosticKind}${missingSuffix}`;
}

function weakTypeCompletionPressureClass(answer, missingInputBuckets) {
  if (answer.value.siteKind !== 'expression-member' || answer.value.candidates.length !== 0) {
    return null;
  }
  if (missingInputBuckets.includes('expression-member-owner-type:index-signature-only')) {
    return 'weak-type:expression-member-owner:index-signature-only';
  }
  if (missingInputBuckets.includes('expression-member-owner-type:any')) {
    return 'weak-type:expression-member-owner:any';
  }
  if (missingInputBuckets.includes('expression-member-owner-type:no-members')) {
    return 'weak-type:expression-member-owner:no-members';
  }
  return null;
}

function isExpectedEmptyAttributeValue(answer, valueSite) {
  return answer.value.siteKind === 'attribute-value'
    && (
      valueSite?.siteKind === 'plain-attribute-value'
      || valueSite?.siteKind === 'plain-attribute-interpolation'
    )
    && answer.value.candidates.length === 0
    && answer.value.missingInputs.length === 0;
}

function isExpectedEmptyPlainHtmlAttributeValue(answer, valueSite, cursorInfoValue, missingInputBuckets) {
  return answer.value.siteKind === 'attribute-value'
    && valueSite == null
    && cursorInfoValue?.valueSite == null
    && cursorInfoValue?.selectedBindable == null
    && answer.value.candidates.length === 0
    && missingInputBuckets.length === 0;
}

function isExpectedEmptyOpenScalarBindable(answer, valueSite) {
  return answer.value.siteKind === 'attribute-value'
    && valueSite?.siteKind === 'bindable-value'
    && answer.value.candidates.length === 0
    && answer.value.missingInputs.length === 0;
}

function isExpectedEmptyOpenTemplateControllerValue(answer, valueSite) {
  return answer.value.siteKind === 'attribute-value'
    && valueSite?.siteKind === 'template-controller-value'
    && answer.value.candidates.length === 0
    && answer.value.missingInputs.length === 0;
}

function combineCursorAggregates(aggregates) {
  const combined = {};
  for (const aggregate of aggregates) {
    mergeCursorAggregate(combined, aggregate);
  }
  return combined;
}

function mergeCursorAggregate(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'number') {
      target[key] = (target[key] ?? 0) + value;
      continue;
    }
    if (isCountMap(value)) {
      target[key] ??= {};
      incrementAll(target[key], value);
    }
  }
}

function isCountMap(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function incrementAll(target, source) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function limitedPressureRoots(allRoots, limit) {
  return limit == null ? allRoots : allRoots.slice(0, limit);
}

function pressureProjectShapeFilter() {
  const raw = process.env.SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_SHAPES
    ?? process.env.SEMANTIC_RUNTIME_PROJECT_SHAPES;
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
      throw new Error(`Unsupported cursor pressure project shape '${value}'.`);
    }
  }
  return new Set(values);
}

function pressureProjectDiscovery() {
  const raw = process.env.SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_DISCOVERY
    ?? process.env.SEMANTIC_RUNTIME_PRESSURE_PROJECT_DISCOVERY;
  if (raw == null || raw.trim().length === 0) {
    return undefined;
  }
  const value = raw.trim();
  if (value === 'single-root' || value === 'package-tsconfig') {
    return value;
  }
  throw new Error(`Unsupported SEMANTIC_RUNTIME_CURSOR_PRESSURE_PROJECT_DISCOVERY '${raw}'.`);
}

function cursorPressureOutputMode() {
  const raw = process.env.SEMANTIC_RUNTIME_CURSOR_PRESSURE_OUTPUT ?? 'inputs';
  const mode = raw.trim();
  if (mode === 'inputs' || mode === 'aggregate' || mode === 'both') {
    return mode;
  }
  throw new Error(`Unsupported cursor pressure output mode '${raw}'. Use inputs, aggregate, or both.`);
}

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function optionalPositiveIntegerEnv(name) {
  const raw = process.env[name];
  if (raw == null || raw.trim().length === 0) {
    return null;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Expected ${name} to be a positive integer when provided.`);
  }
  return value;
}

function normalizeHostPath(value) {
  return value.replace(/\\/g, '/');
}

function increment(counts, key, by = 1) {
  counts[key] = (counts[key] ?? 0) + by;
}

function printCounts(title, counts, limit = 12) {
  const rows = Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  console.log('');
  console.log(title);
  if (rows.length === 0) {
    console.log('- none');
    return;
  }
  for (const [key, value] of rows.slice(0, limit)) {
    console.log(`- ${key}: ${value}`);
  }
  if (rows.length > limit) {
    console.log(`- ... ${rows.length - limit} more`);
  }
}
