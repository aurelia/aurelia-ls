import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/resource-bindable-boundary-config');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'app-query-filter-preflight-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const unsupportedSourceFileAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  sourceFile: { filePath: 'src/app.ts' },
  page: { size: 20 },
});
const supportedSourceFileAnswer = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  sourceFile: { filePath: 'src/app.ts' },
  page: { size: 20 },
});
const unsupportedOpenSeamFilterAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  openSeamKindKey: 'resource.open-definition-field',
  page: { size: 20 },
});
const unsupportedOpenSeamIdentityFilterAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  openSeamClusterKey: 'cluster:example',
  openSeamSiteKey: 'site:example',
  page: { size: 20 },
});
const unsupportedCatalogSelectorAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  diagnosticProjection: 'type-projection',
  includeTypeSurfaces: true,
  diagnosticPageSize: 5,
  openSeamPageSize: 5,
  rowPageSize: 5,
  includeDeclaration: true,
  newName: 'renamed',
});
const unsupportedDetailAnswer = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSummary,
  detail: 'handles',
});
const unsupportedPagingAnswer = app.ask({
  kind: SemanticAppQueryKind.Summary,
  page: { size: 1 },
});
const retainedUnsupportedSourceFileAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  sourceFile: { filePath: 'src/app.ts' },
  inquiryProfile: 'exploration',
});
const retainedUnsupportedOpenSeamFilterAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  openSeamKindKey: 'resource.open-definition-field',
  inquiryProfile: 'exploration',
});
const retainedValidResourceDefinitionsAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  page: { size: 20 },
  inquiryProfile: 'exploration',
});
const supportedOpenSeamKindCounts = (supportedSourceFileAnswer.value?.rows ?? [])
  .reduce((counts, row) => {
    for (const seamKindKey of row.seamKindKeys) {
      counts.set(seamKindKey, (counts.get(seamKindKey) ?? 0) + 1);
    }
    return counts;
  }, new Map());
const routedRuntime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'app-query-filter-preflight-contract:routed',
});
const routedCacheBefore = routedRuntime.analysisCacheOverview().value.cachedAppCount;
const routedUnsupportedAnswer = await routedRuntime.answerAppQuery({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  sourceFile: { filePath: 'src/app.ts' },
});
const routedCacheAfter = routedRuntime.analysisCacheOverview().value.cachedAppCount;
const batchRuntime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'app-query-filter-preflight-contract:batch',
});
const batchCacheBefore = batchRuntime.analysisCacheOverview().value.cachedAppCount;
const unsupportedSourceFileBatch = await batchRuntime.answerAppQueries({
  inquiryProfile: 'exploration',
  queries: [{
    kind: SemanticAppQueryKind.ResourceDefinitions,
    sourceFile: { filePath: 'src/app.ts' },
  }],
});
const unsupportedOpenSeamFilterBatch = await batchRuntime.answerAppQueries({
  inquiryProfile: 'exploration',
  queries: [{
    kind: SemanticAppQueryKind.ResourceDefinitions,
    openSeamKindKey: 'resource.open-definition-field',
  }],
});
const unsupportedSummaryBatch = await batchRuntime.answerAppQueries({
  inquiryProfile: 'exploration',
  queries: [{
    kind: SemanticAppQueryKind.Summary,
    page: { size: 1 },
  }],
});
const batchCacheAfterUnsupported = batchRuntime.analysisCacheOverview().value.cachedAppCount;
const validSummaryBatch = await batchRuntime.answerAppQueries({
  inquiryProfile: 'exploration',
  queries: [{
    kind: SemanticAppQueryKind.Summary,
  }],
});

const failures = [
  unsupportedSourceFileAnswer.result === 'unsupported'
    ? null
    : `Expected resource-definitions+sourceFile to be unsupported, observed ${unsupportedSourceFileAnswer.result}.`,
  unsupportedSourceFileAnswer.selection === 'not-applicable'
    ? null
    : `Expected resource-definitions+sourceFile selection to be not-applicable, observed ${unsupportedSourceFileAnswer.selection}.`,
  unsupportedSourceFileAnswer.coverage === 'not-applicable'
    ? null
    : `Expected resource-definitions+sourceFile coverage to be not-applicable, observed ${unsupportedSourceFileAnswer.coverage}.`,
  unsupportedSourceFileAnswer.summary.includes('does not support sourceFile')
    ? null
    : `Expected unsupported sourceFile answer to name the rejected selector, observed: ${unsupportedSourceFileAnswer.summary}`,
  unsupportedSourceFileAnswer.value?.unsupportedFields?.includes('sourceFile')
    ? null
    : `Expected unsupported sourceFile answer to expose unsupportedFields, observed ${JSON.stringify(unsupportedSourceFileAnswer.value)}.`,
  unsupportedSourceFileAnswer.value?.acceptedQueryKinds?.sourceFile?.includes(SemanticAppQueryKind.OpenSeamSites)
    ? null
    : `Expected unsupported sourceFile answer to list accepted sourceFile query kinds, observed ${JSON.stringify(unsupportedSourceFileAnswer.value?.acceptedQueryKinds)}.`,
  supportedSourceFileAnswer.result === 'answered'
    ? null
    : `Expected open-seam-sites+sourceFile to remain supported, observed ${supportedSourceFileAnswer.result}.`,
  supportedSourceFileAnswer.coverage === 'complete'
    ? null
    : `Expected open-seam-sites+sourceFile coverage to be complete, observed ${supportedSourceFileAnswer.coverage}.`,
  supportedSourceFileAnswer.value?.rows?.length === 5
    ? null
    : `Expected sourceFile-filtered open-seam-sites to return 5 root-source sites, observed ${supportedSourceFileAnswer.value?.rows?.length ?? 'missing'}.`,
  supportedOpenSeamKindCounts.get('binding.open-observer-setup') === 3
    ? null
    : `Expected three source-filtered root observer-setup sites, observed ${supportedOpenSeamKindCounts.get('binding.open-observer-setup') ?? 0}.`,
  supportedOpenSeamKindCounts.get('resource.open-definition-field') === 3
    ? null
    : `Expected three source-filtered root resource-definition sites, observed ${supportedOpenSeamKindCounts.get('resource.open-definition-field') ?? 0}.`,
  unsupportedOpenSeamFilterAnswer.result === 'unsupported'
    ? null
    : `Expected resource-definitions+openSeamKindKey to be unsupported, observed ${unsupportedOpenSeamFilterAnswer.result}.`,
  unsupportedOpenSeamFilterAnswer.selection === 'not-applicable'
    ? null
    : `Expected resource-definitions+openSeamKindKey selection to be not-applicable, observed ${unsupportedOpenSeamFilterAnswer.selection}.`,
  unsupportedOpenSeamFilterAnswer.coverage === 'not-applicable'
    ? null
    : `Expected resource-definitions+openSeamKindKey coverage to be not-applicable, observed ${unsupportedOpenSeamFilterAnswer.coverage}.`,
  unsupportedOpenSeamFilterAnswer.value?.unsupportedFields?.includes('openSeamKindKey')
    ? null
    : `Expected unsupported open-seam filter answer to expose unsupportedFields, observed ${JSON.stringify(unsupportedOpenSeamFilterAnswer.value)}.`,
  unsupportedOpenSeamIdentityFilterAnswer.value?.unsupportedFields?.includes('openSeamClusterKey')
    && unsupportedOpenSeamIdentityFilterAnswer.value?.unsupportedFields?.includes('openSeamSiteKey')
    ? null
    : `Expected unsupported open-seam identity filters to remain visible, observed ${JSON.stringify(unsupportedOpenSeamIdentityFilterAnswer.value)}.`,
  [
    'includeTypeSurfaces',
    'diagnosticPageSize',
    'openSeamPageSize',
    'rowPageSize',
    'includeDeclaration',
    'newName',
  ].every((field) => unsupportedCatalogSelectorAnswer.value?.unsupportedFields?.includes(field))
    && !unsupportedCatalogSelectorAnswer.value?.unsupportedFields?.includes('diagnosticProjection')
    ? null
    : `Expected query-owned selectors to be rejected while diagnosticProjection remains valid continuation-target policy, observed ${JSON.stringify(unsupportedCatalogSelectorAnswer.value)}.`,
  unsupportedDetailAnswer.result === 'unsupported'
    && unsupportedDetailAnswer.value?.unsupportedFields?.includes('detail')
    ? null
    : `Expected open-seam-summary+detail to refuse the unsupported handle projection, observed ${JSON.stringify(unsupportedDetailAnswer)}.`,
  unsupportedPagingAnswer.result === 'unsupported'
    && unsupportedPagingAnswer.value?.unsupportedFields?.includes('page')
    ? null
    : `Expected summary+page to refuse unsupported paging, observed ${JSON.stringify(unsupportedPagingAnswer)}.`,
  retainedUnsupportedSourceFileAnswer.value?.unsupportedFields?.includes('sourceFile')
    && retainedUnsupportedOpenSeamFilterAnswer.value?.unsupportedFields?.includes('openSeamKindKey')
    && retainedValidResourceDefinitionsAnswer.result === 'answered'
    ? null
    : `Expected retained app claims to distinguish unsupported request shapes from the valid semantic query, observed ${JSON.stringify({
      retainedUnsupportedSourceFileAnswer,
      retainedUnsupportedOpenSeamFilterAnswer,
      retainedValidResourceDefinitionsAnswer,
    })}.`,
  routedUnsupportedAnswer.result === 'unsupported'
    ? null
    : `Expected routed selector preflight to return unsupported, observed ${routedUnsupportedAnswer.result}.`,
  routedCacheBefore === 0 && routedCacheAfter === 0
    ? null
    : `Expected routed selector preflight to avoid opening an app epoch, observed cached apps ${routedCacheBefore} -> ${routedCacheAfter}.`,
  unsupportedSourceFileBatch.value?.rows?.[0]?.answer?.value?.unsupportedFields?.includes('sourceFile')
    && unsupportedOpenSeamFilterBatch.value?.rows?.[0]?.answer?.value?.unsupportedFields?.includes('openSeamKindKey')
    ? null
    : `Expected retained batch claims to preserve each unsupported selector shape independently, observed ${JSON.stringify({
      unsupportedSourceFileBatch,
      unsupportedOpenSeamFilterBatch,
    })}.`,
  unsupportedSummaryBatch.value?.rows?.[0]?.answer?.result === 'unsupported'
    && unsupportedSummaryBatch.value?.rows?.[0]?.answer?.value?.unsupportedFields?.includes('page')
    && validSummaryBatch.value?.rows?.[0]?.answer?.result === 'answered'
    ? null
    : `Expected retained batches to refuse unsupported page input without contaminating the valid semantic query, observed ${JSON.stringify({
      unsupportedSummaryBatch,
      validSummaryBatch,
    })}.`,
  batchCacheBefore === 0 && batchCacheAfterUnsupported === 0
    && unsupportedSourceFileBatch.value?.appWorldOpened === false
    && unsupportedOpenSeamFilterBatch.value?.appWorldOpened === false
    ? null
    : `Expected all-unsupported batches to answer before app-world construction, observed cached apps ${batchCacheBefore} -> ${batchCacheAfterUnsupported}.`,
].filter(Boolean);

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    unsupportedSourceFileAnswer,
    supportedSourceFileAnswer,
    unsupportedOpenSeamFilterAnswer,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    unsupportedSourceFile: {
      result: unsupportedSourceFileAnswer.result,
      selection: unsupportedSourceFileAnswer.selection,
      coverage: unsupportedSourceFileAnswer.coverage,
      summary: unsupportedSourceFileAnswer.summary,
      unsupportedFields: unsupportedSourceFileAnswer.value.unsupportedFields,
    },
    supportedSourceFile: {
      result: supportedSourceFileAnswer.result,
      selection: supportedSourceFileAnswer.selection,
      coverage: supportedSourceFileAnswer.coverage,
      rows: supportedSourceFileAnswer.value.rows.length,
    },
    unsupportedOpenSeamFilter: {
      result: unsupportedOpenSeamFilterAnswer.result,
      selection: unsupportedOpenSeamFilterAnswer.selection,
      coverage: unsupportedOpenSeamFilterAnswer.coverage,
      unsupportedFields: unsupportedOpenSeamFilterAnswer.value.unsupportedFields,
    },
    unsupportedOpenSeamIdentityFilter: {
      result: unsupportedOpenSeamIdentityFilterAnswer.result,
      unsupportedFields: unsupportedOpenSeamIdentityFilterAnswer.value.unsupportedFields,
    },
    unsupportedCatalogSelectors: unsupportedCatalogSelectorAnswer.value.unsupportedFields,
    unsupportedDetail: unsupportedDetailAnswer.value.unsupportedFields,
    unsupportedPaging: unsupportedPagingAnswer.value.unsupportedFields,
    routedPreflight: {
      result: routedUnsupportedAnswer.result,
      cachedAppsBefore: routedCacheBefore,
      cachedAppsAfter: routedCacheAfter,
    },
    batchPreflight: {
      sourceFileFields: unsupportedSourceFileBatch.value.rows[0].answer.value.unsupportedFields,
      openSeamFields: unsupportedOpenSeamFilterBatch.value.rows[0].answer.value.unsupportedFields,
      summaryFields: unsupportedSummaryBatch.value.rows[0].answer.value.unsupportedFields,
      validSummaryResult: validSummaryBatch.value.rows[0].answer.result,
      cachedAppsBefore: batchCacheBefore,
      cachedAppsAfterUnsupported: batchCacheAfterUnsupported,
    },
  }, null, 2));
}
