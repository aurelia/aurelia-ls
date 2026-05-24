import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  INQUIRY_CONTINUATION_INTENTS,
  SEMANTIC_APP_QUERY_KINDS,
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  filterSemanticAppQueryContinuations,
  semanticAppQueryCatalogShape,
  semanticAppQueryCatalogRow,
  semanticAppQueryMaterializationPolicy,
  withSemanticAppQueryContinuations,
} from '../out/index.js';
import {
  semanticAppQueryEpochKeys,
  semanticAppQueryKey,
  semanticAppQueryLocusKey,
} from '../out/api/app-query-identity.js';
import {
  appQueryBatchAuthoringTemplateSourceFiles,
  appQueryNeedsAuthoringTemplates,
  defaultInquiryProfileForRoutedAppQuery,
  defaultInquiryProfileForRoutedAppQueryBatch,
} from '../out/api/app-query-policy.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const failures = [];
const followQueryContinuationKind = 'follow-query';
const continuationIntentValues = new Set(INQUIRY_CONTINUATION_INTENTS);
const continuationCostValues = new Set(['free', 'projection-only', 'query-type-projection', 'app-world', 'deep']);
const evidenceStateValues = new Set(['not-required', 'source-backed', 'type-projected', 'inferred', 'open']);
const evidenceCoverageValues = new Set(['complete-for-locus', 'partial-known-gaps', 'sampled', 'unknown']);
const sourcePrecisionValues = new Set(['not-required', 'exact-authored-span', 'carrier-span', 'generated-anchor', 'external']);
const evidenceStalenessValues = new Set(['current-epoch', 'source-epoch-sensitive', 'project-epoch-sensitive', 'unknown']);
verifyCatalogWideContinuationCoverage();
verifyCatalogShapeAndIdentityNormalization();
verifyContinuationTargetQueryShapes();
verifyContinuationIntentFiltering();
verifyAnswerSourceReferenceCollector();
await verifyDiagnosticRelatedQueryContinuations();
verifyMixedRelatedDiagnosticRepairBlockers();
await verifyAppDiagnosticRelatedFamilyCoverage();
await verifyTemplateAndRouterContinuations();
await verifyTemplateRepairPrecisionContinuations();
await verifyFamilySpecificContinuationCanaries();
await verifyContinuationTargetQueriesEnterClaimGraph();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('contract ok: public app-query continuations are typed, followable, and intentionally authoring-deferred.');

function verifyCatalogWideContinuationCoverage() {
  const answer = {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: SemanticRuntimeAnswerOutcome.Hit,
    summary: 'contract fake answer',
    value: {},
    page: {
      size: 10,
      cursor: null,
      nextCursor: null,
      returnedRows: 0,
      totalRows: 0,
    },
  };
  for (const kind of SEMANTIC_APP_QUERY_KINDS) {
    const catalogRow = semanticAppQueryCatalogRow(kind);
    const result = withSemanticAppQueryContinuations(
      {
        kind,
        page: { size: 10 },
        sourceFile: { filePath: 'src/app.html' },
        cursor: { filePath: 'src/app.html', line: 0, character: 0 },
      },
      answer,
    );
    const continuationCount = result.continuations?.length ?? 0;
    if (kind === SemanticAppQueryKind.AuthoringCatalog || kind === SemanticAppQueryKind.AuthoringOrientation) {
      expect(!catalogRow.supportsContinuationIntentFilter, `${kind} should not advertise continuation intent filtering while authoring continuations are deferred.`);
      expect(continuationCount === 0, `${kind} should stay continuation-free until app-builder replaces recipe-shaped authoring.`);
      continue;
    }
    expect(catalogRow.supportsContinuationIntentFilter, `${kind} should advertise continuation intent filtering.`);
    expect(continuationCount > 0, `${kind} should expose at least one public continuation.`);
    for (const continuation of result.continuations ?? []) {
      expectContinuationRowVocabulary(continuation, kind);
      expect(continuation.kind.length > 0, `${kind} continuation should have a kind.`);
      expect(Array.isArray(continuation.intents), `${kind} continuation should carry normalized intents.`);
      expect(continuation.cost != null, `${kind} continuation should carry cost policy.`);
      expect(continuation.evidence != null, `${kind} continuation should carry an evidence gate.`);
      expect(continuation.blockers != null, `${kind} continuation should carry blocker rows even when empty.`);
      if (continuation.targetQueryKind != null) {
        expect(continuation.targetQuery?.kind === continuation.targetQueryKind, `${kind} targetQueryKind should match targetQuery.kind.`);
      }
    }
  }

  const paged = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.SourceFiles, page: { size: 1 } },
    {
      ...answer,
      page: {
        size: 1,
        cursor: null,
        nextCursor: 'offset:0',
        returnedRows: 1,
        totalRows: 2,
      },
    },
  );
  const nextPage = paged.continuations?.find((row) => row.kind === 'next-page');
  expect(nextPage?.targetQuery?.page?.cursor === 'offset:0', 'next-page continuation should carry the next cursor in targetQuery.');
  expect(nextPage?.evidence?.coverage === 'partial-known-gaps', 'next-page continuation should report partial coverage because paging is not a complete-locus proof.');
  expect(nextPage?.evidence?.staleness === 'project-epoch-sensitive', 'next-page continuation should use query/catalog staleness instead of pretending paged project rows are current-epoch stable.');

  const projectPagedWithExtraLocus = withSemanticAppQueryContinuations(
    {
      kind: SemanticAppQueryKind.SourceFiles,
      cursor: { filePath: 'src/app.html', line: 0, character: 0 },
      sourceFile: { filePath: 'src/app.html' },
      page: { size: 1 },
    },
    {
      ...answer,
      page: {
        size: 1,
        cursor: null,
        nextCursor: 'offset:1',
        returnedRows: 1,
        totalRows: 2,
      },
    },
  );
  const projectExtraLocusNextPage = projectPagedWithExtraLocus.continuations?.find((row) => row.kind === 'next-page');
  expect(projectExtraLocusNextPage?.targetQuery?.cursor == null, 'Continuation target queries should not preserve unsupported cursor fields for project-frame row families.');
  expect(projectExtraLocusNextPage?.targetQuery?.sourceFile == null, 'Continuation target queries should not preserve unsupported sourceFile fields for project-frame row families.');
  expect(projectExtraLocusNextPage?.evidence?.staleness === 'project-epoch-sensitive', 'Unsupported source/cursor fields should not make project-frame next-page continuations source-epoch-sensitive.');

  const sourcePaged = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.TemplateDiagnostics, sourceFile: { filePath: 'src/app.html' }, page: { size: 1 } },
    {
      ...answer,
      page: {
        size: 1,
        cursor: null,
        nextCursor: 'template:offset:0',
        returnedRows: 1,
        totalRows: 2,
      },
    },
  );
  const sourceNextPage = sourcePaged.continuations?.find((row) => row.kind === 'next-page');
  expect(sourceNextPage?.evidence?.staleness === 'source-epoch-sensitive', 'next-page continuation should become source-epoch-sensitive when the paged query has a source-file locus.');

  const sourcePagedFromCursor = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.TemplateDiagnostics, cursor: { filePath: 'src/app.html', line: 0, character: 0 }, page: { size: 1 } },
    {
      ...answer,
      page: {
        size: 1,
        cursor: null,
        nextCursor: 'template:offset:1',
        returnedRows: 1,
        totalRows: 2,
      },
    },
  );
  const sourceFromCursorNextPage = sourcePagedFromCursor.continuations?.find((row) => row.kind === 'next-page');
  expect(sourceFromCursorNextPage?.targetQuery?.cursor == null, 'Source-file query next-page continuations should not preserve a cursor field they cannot consume.');
  expect(sourceFromCursorNextPage?.targetQuery?.sourceFile?.filePath === 'src/app.html', 'Source-file query next-page continuations should convert an incoming cursor to the supported sourceFile locus.');

  const summary = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.Summary },
    answer,
  );
  const appOverview = summary.continuations?.find((row) => row.targetQueryKind === SemanticAppQueryKind.AppOverview);
  expect(appOverview?.evidence?.coverage === 'partial-known-gaps', 'overview continuations should report partial-known-gaps rather than unknown coverage.');
  const projectDiagnosticSummary = summary.continuations?.find((row) => row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary);
  expect(projectDiagnosticSummary?.evidence?.staleness === 'project-epoch-sensitive', 'Project-wide continuations to source-capable query families should stay project-epoch-sensitive until the target query has a source locus.');

  const availableProductSummary = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.Summary, diagnosticProjection: 'available-products' },
    answer,
  );
  const availableProductDiagnosticSummary = availableProductSummary.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary
  );
  expect(
    availableProductDiagnosticSummary?.targetQuery?.diagnosticProjection === 'available-products',
    'Diagnostic projection policy should flow into diagnostic continuation target queries when the target supports it.',
  );
  expect(
    availableProductDiagnosticSummary?.cost === 'app-world',
    'Continuation cost should honor query-specific materialization policy such as diagnosticProjection=available-products without hiding the app-world boundary.',
  );

  const completionFollowUp = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.TemplateCompletions, cursor: { filePath: 'src/app.html', line: 0, character: 0 } },
    answer,
  );
  const cursorInfo = completionFollowUp.continuations?.find((row) => row.targetQueryKind === SemanticAppQueryKind.TemplateCursorInfo);
  expect(cursorInfo?.evidence?.coverage === 'complete-for-locus', 'non-paged cursor-locus continuations should report complete-for-locus coverage.');
  expect(cursorInfo?.evidence?.staleness === 'source-epoch-sensitive', 'Cursor-locus continuations should report source-epoch sensitivity because the target query carries an exact source cursor.');

  const cursorPaged = withSemanticAppQueryContinuations(
    {
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: { filePath: 'src/app.html', line: 0, character: 0 },
      sourceFile: { filePath: 'src/app.html' },
      page: { size: 1 },
    },
    {
      ...answer,
      page: {
        size: 1,
        cursor: null,
        nextCursor: 'completion:offset:1',
        returnedRows: 1,
        totalRows: 2,
      },
    },
  );
  const cursorNextPage = cursorPaged.continuations?.find((row) => row.kind === 'next-page');
  expect(cursorNextPage?.targetQuery?.cursor?.filePath === 'src/app.html', 'Cursor-locus next-page continuations should preserve the required cursor.');
  expect(cursorNextPage?.targetQuery?.sourceFile == null, 'Cursor-locus next-page continuations should not also carry a sourceFile locus.');
}

function verifyCatalogShapeAndIdentityNormalization() {
  const noisyProjectQuery = {
    kind: SemanticAppQueryKind.SourceFiles,
    page: { size: 5 },
    detail: 'handles',
    diagnosticProjection: 'type-projection',
    includeTypeSurfaces: true,
    diagnosticPageSize: 3,
    openSeamPageSize: 4,
    includeAuthoringOrientation: true,
    rowPageSize: 6,
    cursor: { filePath: 'src/app.html', line: 0, character: 0 },
    sourceFile: { filePath: 'src/app.html' },
  };
  const shapedProjectQuery = semanticAppQueryCatalogShape(noisyProjectQuery);
  expect(shapedProjectQuery.cursor == null, 'Catalog-shaped project-frame queries should drop unsupported cursor fields.');
  expect(shapedProjectQuery.sourceFile == null, 'Catalog-shaped project-frame queries should drop unsupported sourceFile fields.');
  expect(shapedProjectQuery.detail === 'handles', 'Catalog-shaped queries should keep supported detail fields.');
  expect(shapedProjectQuery.diagnosticProjection == null, 'Catalog-shaped queries should drop unsupported diagnosticProjection fields.');
  expect(shapedProjectQuery.includeTypeSurfaces == null, 'Catalog-shaped queries should drop includeTypeSurfaces outside app-topology.');
  expect(
    semanticAppQueryKey(noisyProjectQuery) === semanticAppQueryKey(shapedProjectQuery),
    'App-query identity should be computed from the catalog-shaped query rather than unsupported caller fields.',
  );
  expect(
    semanticAppQueryLocusKey('contract-project', noisyProjectQuery) === 'project:contract-project',
    'App-query locus keys should ignore unsupported source/cursor fields.',
  );
  expect(
    JSON.stringify(semanticAppQueryEpochKeys('contract-project', noisyProjectQuery)) === JSON.stringify(['project:contract-project']),
    'App-query epoch keys should ignore unsupported source/cursor fields.',
  );
  expect(
    semanticAppQueryMaterializationPolicy(noisyProjectQuery, 'projection-only') === 'projection-only',
    'includeTypeSurfaces should not upgrade materialization policy outside app-topology.',
  );
  expect(
    !appQueryNeedsAuthoringTemplates(noisyProjectQuery),
    'Unsupported source/cursor fields should not opt project-frame queries into authoring-template compilation.',
  );
  expect(
    defaultInquiryProfileForRoutedAppQuery(noisyProjectQuery) === 'mcp-orientation',
    'Unsupported source/cursor fields should not move project-frame queries into an LSP profile.',
  );

  const topologyQuery = { kind: SemanticAppQueryKind.AppTopology, includeTypeSurfaces: true };
  expect(
    semanticAppQueryMaterializationPolicy(topologyQuery, 'projection-only') === 'query-type-projection',
    'includeTypeSurfaces should still upgrade app-topology materialization policy.',
  );

  const templateDiagnosticsFromCursor = {
    kind: SemanticAppQueryKind.TemplateDiagnostics,
    cursor: { filePath: 'src/app.html', line: 0, character: 0 },
  };
  const shapedTemplateDiagnostics = semanticAppQueryCatalogShape(templateDiagnosticsFromCursor);
  expect(shapedTemplateDiagnostics.cursor == null, 'Source-file diagnostic queries should not keep cursor fields.');
  expect(shapedTemplateDiagnostics.sourceFile?.filePath === 'src/app.html', 'Source-file diagnostic queries should derive a sourceFile locus from incoming cursor fields.');
  expect(appQueryNeedsAuthoringTemplates(templateDiagnosticsFromCursor), 'Source-file template diagnostic queries should still opt into source authoring-template compilation.');
  expect(
    defaultInquiryProfileForRoutedAppQuery(templateDiagnosticsFromCursor) === 'lsp-diagnostics',
    'Source-file template diagnostic queries should still choose the diagnostics inquiry profile.',
  );
  expect(
    semanticAppQueryKey(templateDiagnosticsFromCursor) === semanticAppQueryKey({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: 'src/app.html' },
    }),
    'Template diagnostic identity should canonicalize cursor-derived source-file loci.',
  );

  const templateCompletion = semanticAppQueryCatalogShape({
    kind: SemanticAppQueryKind.TemplateCompletions,
    cursor: { filePath: 'src/app.html', line: 0, character: 0 },
    sourceFile: { filePath: 'src/app.html' },
  });
  expect(templateCompletion.cursor?.filePath === 'src/app.html', 'Cursor-locus queries should keep their required cursor.');
  expect(templateCompletion.sourceFile == null, 'Cursor-locus queries should not also keep a sourceFile locus.');
  expect(
    defaultInquiryProfileForRoutedAppQuery(templateCompletion) === 'lsp-cursor',
    'Cursor-locus template queries should still choose the cursor inquiry profile.',
  );
  expect(
    JSON.stringify(appQueryBatchAuthoringTemplateSourceFiles([noisyProjectQuery, templateDiagnosticsFromCursor, templateCompletion])) === JSON.stringify(['src/app.html']),
    'Batch authoring-template source files should be collected from catalog-shaped source/cursor loci only.',
  );
  expect(
    defaultInquiryProfileForRoutedAppQueryBatch([noisyProjectQuery, templateDiagnosticsFromCursor]) === 'lsp-diagnostics',
    'Batch inquiry profile selection should use catalog-shaped source/cursor loci.',
  );
}

function verifyContinuationTargetQueryShapes() {
  const answer = {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: SemanticRuntimeAnswerOutcome.Hit,
    summary: 'contract fake shape answer',
    value: { rows: [] },
    page: {
      size: 7,
      cursor: null,
      nextCursor: 'shape:next',
      returnedRows: 7,
      totalRows: 14,
    },
  };
  for (const kind of SEMANTIC_APP_QUERY_KINDS) {
    const result = withSemanticAppQueryContinuations(
      {
        kind,
        page: { size: 7 },
        detail: 'handles',
        diagnosticProjection: 'type-projection',
        diagnosticPageSize: 3,
        openSeamPageSize: 4,
        includeAuthoringOrientation: true,
        rowPageSize: 5,
        cursor: { filePath: 'src/app.html', line: 0, character: 0 },
        sourceFile: { filePath: 'src/app.html' },
      },
      answer,
    );
    for (const continuation of result.continuations ?? []) {
      expectContinuationRowVocabulary(continuation, kind);
      const targetQuery = continuation.targetQuery;
      if (targetQuery == null) {
        continue;
      }
      const targetRow = semanticAppQueryCatalogRow(targetQuery.kind);
      expect(
        targetQuery.cursor == null || targetRow.requiresCursor,
        `${kind} -> ${targetQuery.kind} should not carry a cursor unless the target query requires one.`,
      );
      expect(
        targetQuery.sourceFile == null || (targetRow.supportsSourceFile && !targetRow.requiresCursor),
        `${kind} -> ${targetQuery.kind} should not carry a sourceFile unless the target query supports a source-file locus.`,
      );
      expect(
        targetQuery.detail == null || targetRow.supportsDetail,
        `${kind} -> ${targetQuery.kind} should not carry detail for a target query that does not support detail.`,
      );
      expect(
        targetQuery.diagnosticProjection == null || targetRow.supportsDiagnosticProjection,
        `${kind} -> ${targetQuery.kind} should not carry diagnosticProjection for a target query that does not support it.`,
      );
      expect(
        targetQuery.page == null || targetRow.supportsPaging,
        `${kind} -> ${targetQuery.kind} should not carry page for a target query that does not support paging.`,
      );
      expect(
        targetQuery.diagnosticPageSize == null || targetQuery.kind === SemanticAppQueryKind.AppOverview,
        `${kind} -> ${targetQuery.kind} should not carry diagnosticPageSize outside app-overview.`,
      );
      expect(
        targetQuery.openSeamPageSize == null || targetQuery.kind === SemanticAppQueryKind.AppOverview,
        `${kind} -> ${targetQuery.kind} should not carry openSeamPageSize outside app-overview.`,
      );
      expect(
        targetQuery.includeAuthoringOrientation == null || targetQuery.kind === SemanticAppQueryKind.AppOverview,
        `${kind} -> ${targetQuery.kind} should not carry includeAuthoringOrientation outside app-overview.`,
      );
      expect(
        targetQuery.rowPageSize == null || targetQuery.kind === SemanticAppQueryKind.RouterOverview,
        `${kind} -> ${targetQuery.kind} should not carry rowPageSize outside router-overview.`,
      );
    }
  }
}

function expectContinuationRowVocabulary(continuation, context) {
  expect(typeof continuation.kind === 'string' && continuation.kind.length > 0, `${context} continuation kind should be a non-empty string.`);
  expect(Array.isArray(continuation.intents), `${context} continuation intents should be an array.`);
  for (const intent of continuation.intents ?? []) {
    expect(continuationIntentValues.has(intent), `${context} continuation intent should be a known value, got ${JSON.stringify(intent)}.`);
  }
  expect(continuationCostValues.has(continuation.cost), `${context} continuation cost should be a known value, got ${JSON.stringify(continuation.cost)}.`);
  expect(continuation.evidence != null && typeof continuation.evidence === 'object' && !Array.isArray(continuation.evidence), `${context} continuation evidence should be an object.`);
  if (continuation.evidence != null && typeof continuation.evidence === 'object') {
    expect(evidenceStateValues.has(continuation.evidence.evidenceState), `${context} continuation evidenceState should be a known value, got ${JSON.stringify(continuation.evidence.evidenceState)}.`);
    expect(evidenceCoverageValues.has(continuation.evidence.coverage), `${context} continuation coverage should be a known value, got ${JSON.stringify(continuation.evidence.coverage)}.`);
    expect(sourcePrecisionValues.has(continuation.evidence.sourcePrecision), `${context} continuation sourcePrecision should be a known value, got ${JSON.stringify(continuation.evidence.sourcePrecision)}.`);
    expect(evidenceStalenessValues.has(continuation.evidence.staleness), `${context} continuation staleness should be a known value, got ${JSON.stringify(continuation.evidence.staleness)}.`);
  }
  expect(Array.isArray(continuation.blockers), `${context} continuation blockers should be an array.`);
  for (const blocker of continuation.blockers ?? []) {
    expect(typeof blocker === 'string' && blocker.length > 0, `${context} continuation blocker should be a non-empty string.`);
  }
}

function verifyContinuationIntentFiltering() {
  const full = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.Summary },
    {
      schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
      outcome: SemanticRuntimeAnswerOutcome.Hit,
      summary: 'contract fake summary answer',
      value: {},
      page: {
        size: 10,
        cursor: null,
        nextCursor: null,
        returnedRows: 0,
        totalRows: 0,
      },
    },
  );
  const filtered = filterSemanticAppQueryContinuations(
    { continuationIntents: ['diagnose'] },
    full,
  );
  const rows = filtered.continuations ?? [];
  expect(rows.length > 0, 'Diagnostic continuation intent filter should keep matching continuation rows.');
  expect(
    rows.every((row) => row.intents.length === 0 || row.intents.includes('diagnose')),
    'Diagnostic continuation intent filter should remove non-diagnostic rows from the answer envelope.',
  );
  expect(
    rows.every((row) => row.targetQuery == null || row.targetQuery.continuationIntents?.includes('diagnose')),
    'Filtered continuation target queries should inherit the same continuation intent filter for follow-up calls.',
  );
}

function verifyAnswerSourceReferenceCollector() {
  const source = {
    kind: 'source-span-address',
    label: 'src/app.ts@10..20',
    path: 'src/app.ts',
    start: 10,
    end: 20,
    role: 'primary',
  };
  const result = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.BindingDataFlows, page: { size: 1 } },
    {
      schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
      outcome: SemanticRuntimeAnswerOutcome.Hit,
      summary: 'contract fake binding answer',
      value: {
        rows: [
          {
            observedMemberSource: source,
          },
        ],
      },
      page: {
        size: 1,
        cursor: null,
        nextCursor: null,
        returnedRows: 1,
        totalRows: 1,
      },
    },
  );
  const continuation = result.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingDataFlowSummary
  );
  expect(
    continuation?.evidence?.sourcePrecision === 'exact-authored-span',
    'Continuation evidence should discover source references in public row fields beyond the literal name "source".',
  );

  const externalResult = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.BindingDataFlows, page: { size: 1 } },
    {
      schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
      outcome: SemanticRuntimeAnswerOutcome.Hit,
      summary: 'contract fake external binding answer',
      value: {
        rows: [
          {
            targetSource: {
              kind: 'typescript-node',
              label: 'node_modules/pkg/index.d.ts@1..5',
              path: 'node_modules/pkg/index.d.ts',
              start: 1,
              end: 5,
            },
          },
        ],
      },
      page: {
        size: 1,
        cursor: null,
        nextCursor: null,
        returnedRows: 1,
        totalRows: 1,
      },
    },
  );
  const externalContinuation = externalResult.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingDataFlowSummary
  );
  expect(
    externalContinuation?.evidence?.sourcePrecision === 'external',
    'Continuation evidence should report external source precision for dependency/default-library references instead of treating them as authored spans.',
  );

  const anchoredTemplateResult = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.BindingDataFlows, page: { size: 1 } },
    {
      schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
      outcome: SemanticRuntimeAnswerOutcome.Hit,
      summary: 'contract fake template-address binding answer',
      value: {
        rows: [
          {
            source: {
              kind: 'template-address',
              label: 'template:contract',
              anchor: source,
            },
          },
        ],
      },
      page: {
        size: 1,
        cursor: null,
        nextCursor: null,
        returnedRows: 1,
        totalRows: 1,
      },
    },
  );
  const anchoredTemplateContinuation = anchoredTemplateResult.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingDataFlowSummary
  );
  expect(
    anchoredTemplateContinuation?.evidence?.sourcePrecision === 'exact-authored-span',
    'Continuation evidence should follow source-reference anchors for template/source carriers before falling back to carrier precision.',
  );

  const generatedResult = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.BindingDataFlows, page: { size: 1 } },
    {
      schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
      outcome: SemanticRuntimeAnswerOutcome.Hit,
      summary: 'contract fake generated binding answer',
      value: {
        rows: [
          {
            source: {
              kind: 'generated-address',
              label: 'generated overlay',
              anchor: source,
            },
          },
        ],
      },
      page: {
        size: 1,
        cursor: null,
        nextCursor: null,
        returnedRows: 1,
        totalRows: 1,
      },
    },
  );
  const generatedContinuation = generatedResult.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingDataFlowSummary
  );
  expect(
    generatedContinuation?.evidence?.sourcePrecision === 'generated-anchor',
    'Continuation evidence should keep generated-address precision even when the generated source carries an authored anchor.',
  );
}

async function verifyDiagnosticRelatedQueryContinuations() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/di-resolve-contexts'),
    storeKey: 'contract-app-query-continuations-di',
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const answer = app.ask({
    kind: SemanticAppQueryKind.AppDiagnostics,
    page: { size: 20 },
  });
  const related = answer.continuations?.find((row) =>
    row.kind === followQueryContinuationKind
    && row.targetQueryKind === SemanticAppQueryKind.DiIssues
  );
  expect(related != null, 'AppDiagnostics should expose diagnostic-row continuations to related issue products.');
  expect(related?.evidence?.evidenceState === 'source-backed', 'Related diagnostic continuation should be source-backed.');
  expect(related?.evidence?.sourcePrecision === 'exact-authored-span', 'Related diagnostic continuation should keep exact authored source precision when rows have spans.');
  expect(related?.evidence?.staleness === 'source-epoch-sensitive', 'Related diagnostic continuation should be source-epoch-sensitive when evidence has authored spans.');
  expect(related?.intents?.includes('repair'), 'Related diagnostic continuation with exact source-backed rows should be repair-intent eligible.');
  expect((related?.blockers ?? []).length === 0, 'Related diagnostic continuation with exact source-backed rows should not report repair blockers.');
}

function verifyMixedRelatedDiagnosticRepairBlockers() {
  const exactSource = {
    kind: 'source-span-address',
    label: 'src/app.ts@1..2',
    path: 'src/app.ts',
    start: 1,
    end: 2,
  };
  const carrierSource = {
    kind: 'source-file-address',
    label: 'src/app.ts',
    path: 'src/app.ts',
  };
  const answer = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: 10 } },
    {
      schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
      outcome: SemanticRuntimeAnswerOutcome.Hit,
      summary: 'contract fake mixed related diagnostics',
      value: {
        rows: [
          {
            source: exactSource,
            relatedQueryKind: SemanticAppQueryKind.DiIssues,
            frameworkErrorCode: 'AUR0001',
          },
          {
            source: carrierSource,
            relatedQueryKind: SemanticAppQueryKind.DiIssues,
            frameworkErrorCode: 'AUR0002',
          },
        ],
      },
      page: {
        size: 10,
        cursor: null,
        nextCursor: null,
        returnedRows: 2,
        totalRows: 2,
      },
    },
  );
  const related = answer.continuations?.find((row) =>
    row.kind === followQueryContinuationKind
    && row.targetQueryKind === SemanticAppQueryKind.DiIssues
  );
  expect(related != null, 'Mixed related diagnostic rows should still expose a related-row continuation.');
  expect(related?.intents?.includes('repair'), 'Mixed related diagnostic rows should keep the repair intent visible with blockers.');
  expect(
    (related?.blockers ?? []).some((blocker) => blocker.includes('lacks an exact authored source span')),
    'Mixed related diagnostic rows should block repair intent when any returned related source is only a carrier span.',
  );
}

async function verifyAppDiagnosticRelatedFamilyCoverage() {
  const pressureRoot = path.join(packageRoot, 'fixtures/pressure');
  const families = [
    ['typescript diagnostics', 'typescript-project-diagnostics', SemanticAppQueryKind.TypeScriptDiagnostics],
    ['configuration issues', 'attr-mapper-config-errors', SemanticAppQueryKind.ConfigurationIssues],
    ['di issues', 'di-resolve-contexts', SemanticAppQueryKind.DiIssues],
    ['observation issues', 'ast-track-decorator-contexts', SemanticAppQueryKind.ObservationIssues],
    ['evaluation issues', 'kernel-api-errors', SemanticAppQueryKind.EvaluationIssues],
    ['resource issues', 'resource-definition-api-errors', SemanticAppQueryKind.ResourceIssues],
    ['template diagnostics', 'template-compiler-errors', SemanticAppQueryKind.TemplateDiagnostics],
    ['router issues', 'router-instruction-errors', SemanticAppQueryKind.RouterIssues],
    ['route recognizer issues', 'router-invalid-paths', SemanticAppQueryKind.RouteRecognizerIssues],
    ['validation issues', 'validation-rule-source-errors', SemanticAppQueryKind.ValidationIssues],
    ['fetch-client issues', 'fetch-client-config-errors', SemanticAppQueryKind.FetchClientIssues],
    ['dialog issues', 'dialog-source-errors', SemanticAppQueryKind.DialogIssues],
  ];
  for (const [label, fixture, target] of families) {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, fixture),
      storeKey: `contract-app-query-continuations-app-diagnostic-family-${label.replace(/[^a-z0-9]+/gi, '-')}`,
    });
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppDiagnostics,
      page: { size: 100 },
    });
    const rows = answer.value?.rows ?? [];
    expect(
      rows.some((row) => row.relatedQueryKind === target),
      `${label}: AppDiagnostics should include at least one row related to ${target}.`,
    );
    expectContinuationEvidence(answer, SemanticAppQueryKind.AppDiagnostics, {
      continuationKind: followQueryContinuationKind,
      target,
      state: 'source-backed',
      sourcePrecision: 'exact-authored-span',
      intents: ['repair'],
      blockerCount: 0,
    }, `app diagnostic family ${label}`);
  }
}

async function verifyTemplateAndRouterContinuations() {
  const templateRuntime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-overlay-type-errors'),
    storeKey: 'contract-app-query-continuations-template',
  });
  const templateBatch = await templateRuntime.answerAppQueries({
    queries: [
      {
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        cursor: { filePath: 'src/template-overlay-type-errors-app.html', line: 0, character: 1 },
      },
      {
        kind: SemanticAppQueryKind.TemplateCompletions,
        cursor: { filePath: 'src/template-overlay-type-errors-app.html', line: 0, character: 1 },
      },
      {
        kind: SemanticAppQueryKind.TemplateDiagnostics,
        sourceFile: { filePath: 'src/template-overlay-type-errors-app.html' },
        page: { size: 3 },
      },
    ],
  });
  expectBatchTargets(templateBatch, SemanticAppQueryKind.TemplateCursorInfo, [
    SemanticAppQueryKind.TemplateCompletions,
    SemanticAppQueryKind.TemplateDiagnostics,
  ]);
  expectBatchTargets(templateBatch, SemanticAppQueryKind.TemplateCompletions, [
    SemanticAppQueryKind.TemplateCursorInfo,
    SemanticAppQueryKind.TemplateDiagnostics,
  ]);
  expectBatchTargets(templateBatch, SemanticAppQueryKind.TemplateDiagnostics, [
    SemanticAppQueryKind.AppDiagnostics,
    SemanticAppQueryKind.AppDiagnosticSummary,
    SemanticAppQueryKind.ResourceDefinitions,
    SemanticAppQueryKind.BindingDataFlowSummary,
  ]);

  const routerRuntime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/router-route-parameter-aggregation'),
    storeKey: 'contract-app-query-continuations-router',
  });
  const routerBatch = await routerRuntime.answerAppQueries({
    queries: [
      { kind: SemanticAppQueryKind.Summary },
      { kind: SemanticAppQueryKind.RouterOverview, page: { size: 2 } },
      { kind: SemanticAppQueryKind.Routes, page: { size: 2 } },
      { kind: SemanticAppQueryKind.BindingDataFlowSummary, page: { size: 2 } },
      { kind: SemanticAppQueryKind.ResourceDefinitions, page: { size: 2 } },
    ],
  });
  expectBatchTargets(routerBatch, SemanticAppQueryKind.Summary, [
    SemanticAppQueryKind.AppOverview,
    SemanticAppQueryKind.RouterOverview,
  ]);
  expectBatchTargets(routerBatch, SemanticAppQueryKind.RouterOverview, [
    SemanticAppQueryKind.Routes,
    SemanticAppQueryKind.RouteContexts,
    SemanticAppQueryKind.RouterIssues,
  ]);
  expectBatchTargets(routerBatch, SemanticAppQueryKind.Routes, [
    SemanticAppQueryKind.RouterOverview,
  ]);
  expectBatchTargets(routerBatch, SemanticAppQueryKind.BindingDataFlowSummary, [
    SemanticAppQueryKind.BindingDataFlows,
  ]);
  expectBatchTargets(routerBatch, SemanticAppQueryKind.ResourceDefinitions, [
    SemanticAppQueryKind.ResourceIssues,
    SemanticAppQueryKind.ResourceVisibility,
    SemanticAppQueryKind.TemplateCompilations,
  ]);
}

async function verifyTemplateRepairPrecisionContinuations() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/weak-owner-repair-planning'),
    storeKey: 'contract-app-query-continuations-template-repair-precision',
  });
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateDiagnostics,
    page: { size: 5 },
  });
  const rows = answer.value?.rows ?? [];
  expect(rows.length > 0, 'Weak-owner template diagnostics should return source-backed rows for continuation precision.');
  expect(
    rows.some((row) => row.suggestion?.actionTarget?.source?.start != null && row.suggestion?.actionTarget?.source?.end != null),
    'Weak-owner template diagnostics should preserve exact suggestion action-target sources.',
  );
  expectContinuationEvidence(answer, SemanticAppQueryKind.TemplateDiagnostics, {
    target: SemanticAppQueryKind.AppDiagnostics,
    state: 'type-projected',
    sourcePrecision: 'exact-authored-span',
    notIntents: ['repair'],
  }, 'template repair precision');
  expectContinuationEvidence(answer, SemanticAppQueryKind.TemplateDiagnostics, {
    target: SemanticAppQueryKind.BindingDataFlowSummary,
    state: 'type-projected',
    sourcePrecision: 'exact-authored-span',
    notIntents: ['repair'],
  }, 'template repair precision');
  expectContinuationEvidence(answer, SemanticAppQueryKind.TemplateDiagnostics, {
    target: SemanticAppQueryKind.ResourceDefinitions,
    sourcePrecision: 'exact-authored-span',
    notIntents: ['repair'],
  }, 'template repair precision');
}

async function verifyFamilySpecificContinuationCanaries() {
  const pressureRoot = path.join(packageRoot, 'fixtures/pressure');
  const authoringRoot = path.join(packageRoot, 'fixtures/authoring');
  const canaries = [
    {
      label: 'typescript diagnostics',
      workspaceRoot: path.join(pressureRoot, 'typescript-project-diagnostics'),
      queries: [
        { kind: SemanticAppQueryKind.TypeScriptDiagnostics, page: { size: 5 } },
        { kind: SemanticAppQueryKind.TypeScriptDiagnosticSummary, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: 5 } },
      ],
      expectations: [
        {
          queryKind: SemanticAppQueryKind.TypeScriptDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.TypeScriptDiagnosticSummary, SemanticAppQueryKind.AppDiagnostics],
          evidence: [
            { target: SemanticAppQueryKind.TypeScriptDiagnosticSummary, state: 'type-projected' },
            { target: SemanticAppQueryKind.AppDiagnostics, state: 'type-projected', notIntents: ['repair'] },
          ],
        },
        {
          queryKind: SemanticAppQueryKind.TypeScriptDiagnosticSummary,
          minRows: 1,
          targets: [SemanticAppQueryKind.TypeScriptDiagnostics, SemanticAppQueryKind.AppDiagnosticSummary],
        },
        {
          queryKind: SemanticAppQueryKind.AppDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.TypeScriptDiagnostics],
          evidence: [{ continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.TypeScriptDiagnostics, state: 'source-backed', sourcePrecision: 'exact-authored-span', intents: ['repair'], blockerCount: 0 }],
        },
      ],
    },
    {
      label: 'open seams',
      workspaceRoot: path.join(pressureRoot, 'router-dynamic-pattern'),
      queries: [
        { kind: SemanticAppQueryKind.OpenSeams, page: { size: 5 } },
        { kind: SemanticAppQueryKind.OpenSeamSummary, page: { size: 5 } },
      ],
      expectations: [
        {
          queryKind: SemanticAppQueryKind.OpenSeams,
          minRows: 1,
          targets: [SemanticAppQueryKind.OpenSeamSummary],
          evidence: [{ target: SemanticAppQueryKind.OpenSeamSummary, state: 'open', sourcePrecision: 'exact-authored-span' }],
        },
        {
          queryKind: SemanticAppQueryKind.OpenSeamSummary,
          minRows: 1,
          targets: [SemanticAppQueryKind.OpenSeams],
          evidence: [{ target: SemanticAppQueryKind.OpenSeams, state: 'open' }],
        },
      ],
    },
    {
      label: 'source and evaluation',
      workspaceRoot: path.join(pressureRoot, 'attr-mapper-config-errors'),
      queries: [
        { kind: SemanticAppQueryKind.SourceFiles, page: { size: 5 } },
        { kind: SemanticAppQueryKind.UnresolvedModules, page: { size: 5 } },
        { kind: SemanticAppQueryKind.EvaluationIssues, page: { size: 5 } },
        { kind: SemanticAppQueryKind.ConfigurationIssues, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppOverview },
        { kind: SemanticAppQueryKind.AppTopology },
      ],
      expectations: [
        { queryKind: SemanticAppQueryKind.SourceFiles, minRows: 1, targets: [SemanticAppQueryKind.EvaluationIssues] },
        { queryKind: SemanticAppQueryKind.UnresolvedModules, targets: [SemanticAppQueryKind.SourceFiles, SemanticAppQueryKind.EvaluationIssues] },
        { queryKind: SemanticAppQueryKind.EvaluationIssues, targets: [SemanticAppQueryKind.SourceFiles, SemanticAppQueryKind.AppDiagnosticSummary] },
        { queryKind: SemanticAppQueryKind.ConfigurationIssues, minRows: 1, targets: [SemanticAppQueryKind.AppDiagnosticSummary, SemanticAppQueryKind.DiIssues, SemanticAppQueryKind.SourceFiles] },
        {
          queryKind: SemanticAppQueryKind.AppDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.ConfigurationIssues],
          evidence: [{ target: SemanticAppQueryKind.ConfigurationIssues, state: 'source-backed', sourcePrecision: 'exact-authored-span', intents: ['repair'], blockerCount: 0 }],
        },
        { queryKind: SemanticAppQueryKind.AppOverview, targets: [SemanticAppQueryKind.AppTopology, SemanticAppQueryKind.AppDiagnosticSummary, SemanticAppQueryKind.OpenSeamSummary, SemanticAppQueryKind.RouterOverview] },
        { queryKind: SemanticAppQueryKind.AppTopology, targets: [SemanticAppQueryKind.AppOverview, SemanticAppQueryKind.ResourceDefinitions, SemanticAppQueryKind.BindingDataFlowSummary] },
      ],
    },
    {
      label: 'di and unified diagnostics',
      workspaceRoot: path.join(pressureRoot, 'di-resolve-contexts'),
      queries: [
        { kind: SemanticAppQueryKind.DiIssues, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppDiagnosticSummary, page: { size: 5 } },
      ],
      expectations: [
        { queryKind: SemanticAppQueryKind.DiIssues, minRows: 1, targets: [SemanticAppQueryKind.AppDiagnosticSummary, SemanticAppQueryKind.ConfigurationIssues] },
        {
          queryKind: SemanticAppQueryKind.AppDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.TypeScriptDiagnostics, SemanticAppQueryKind.TemplateDiagnostics, SemanticAppQueryKind.DiIssues],
          evidence: [{ target: SemanticAppQueryKind.DiIssues, state: 'source-backed', sourcePrecision: 'exact-authored-span', intents: ['repair'], blockerCount: 0 }],
        },
        {
          queryKind: SemanticAppQueryKind.AppDiagnosticSummary,
          minRows: 1,
          targets: [SemanticAppQueryKind.AppDiagnostics, SemanticAppQueryKind.TypeScriptDiagnostics, SemanticAppQueryKind.TemplateDiagnostics, SemanticAppQueryKind.DiIssues],
        },
      ],
    },
    {
      label: 'resource rows',
      workspaceRoot: path.join(pressureRoot, 'resource-definition-api-errors'),
      queries: [
        { kind: SemanticAppQueryKind.ResourceDefinitions, page: { size: 5 } },
        { kind: SemanticAppQueryKind.ResourceIssues, page: { size: 5 } },
        { kind: SemanticAppQueryKind.ResourceVisibility, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: 5 } },
      ],
      expectations: [
        {
          queryKind: SemanticAppQueryKind.ResourceDefinitions,
          minRows: 1,
          targets: [SemanticAppQueryKind.ResourceIssues, SemanticAppQueryKind.ResourceVisibility, SemanticAppQueryKind.TemplateCompilations],
          evidence: [
            { continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.ResourceVisibility },
            { continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.TemplateCompilations },
          ],
        },
        {
          queryKind: SemanticAppQueryKind.ResourceIssues,
          minRows: 1,
          targets: [SemanticAppQueryKind.ResourceDefinitions, SemanticAppQueryKind.AppDiagnosticSummary],
          evidence: [{ target: SemanticAppQueryKind.ResourceDefinitions, sourcePrecision: 'exact-authored-span' }],
        },
        { queryKind: SemanticAppQueryKind.ResourceVisibility, minRows: 1, targets: [SemanticAppQueryKind.ResourceDefinitions, SemanticAppQueryKind.TemplateCompilations] },
        {
          queryKind: SemanticAppQueryKind.AppDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.ResourceIssues],
          evidence: [{ target: SemanticAppQueryKind.ResourceIssues, state: 'source-backed', sourcePrecision: 'exact-authored-span', intents: ['repair'], blockerCount: 0 }],
        },
      ],
    },
    {
      label: 'observation rows',
      workspaceRoot: path.join(pressureRoot, 'source-observation-effects'),
      queries: [
        { kind: SemanticAppQueryKind.RuntimeEffects, page: { size: 5 } },
        { kind: SemanticAppQueryKind.RuntimeEffectObservedDependencies, page: { size: 5 } },
        { kind: SemanticAppQueryKind.ObservationIssues, page: { size: 5 } },
      ],
      expectations: [
        {
          queryKind: SemanticAppQueryKind.RuntimeEffects,
          minRows: 1,
          targets: [SemanticAppQueryKind.RuntimeEffectObservedDependencies, SemanticAppQueryKind.ObservationIssues],
          evidence: [
            { continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.RuntimeEffectObservedDependencies, sourcePrecision: 'exact-authored-span' },
            { continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.ObservationIssues },
          ],
        },
        { queryKind: SemanticAppQueryKind.RuntimeEffectObservedDependencies, minRows: 1, targets: [SemanticAppQueryKind.RuntimeEffects, SemanticAppQueryKind.BindingObservedDependencySummary] },
        { queryKind: SemanticAppQueryKind.ObservationIssues, targets: [SemanticAppQueryKind.AppDiagnosticSummary] },
      ],
    },
    {
      label: 'proxy observation escapes',
      workspaceRoot: path.join(pressureRoot, 'proxy-observable-escapes'),
      queries: [
        { kind: SemanticAppQueryKind.ProxyObservableEscapes, page: { size: 5 } },
      ],
      expectations: [
        { queryKind: SemanticAppQueryKind.ProxyObservableEscapes, minRows: 1, targets: [SemanticAppQueryKind.ObservationIssues, SemanticAppQueryKind.BindingObservedDependencySummary] },
      ],
    },
    {
      label: 'binding summaries and rows',
      workspaceRoot: path.join(pressureRoot, 'binding-data-flow-issue-rollups'),
      queries: [
        { kind: SemanticAppQueryKind.BindingValueChannelSummary, page: { size: 5 } },
        { kind: SemanticAppQueryKind.BindingDataFlowSummary, page: { size: 5 } },
        { kind: SemanticAppQueryKind.BindingObservedDependencySummary, page: { size: 5 } },
        { kind: SemanticAppQueryKind.BindingDataFlows, page: { size: 5 } },
      ],
      expectations: [
        { queryKind: SemanticAppQueryKind.BindingValueChannelSummary, minRows: 1, targets: [SemanticAppQueryKind.BindingValueChannels] },
        { queryKind: SemanticAppQueryKind.BindingDataFlowSummary, minRows: 1, targets: [SemanticAppQueryKind.BindingDataFlows] },
        { queryKind: SemanticAppQueryKind.BindingObservedDependencySummary, minRows: 1, targets: [SemanticAppQueryKind.BindingObservedDependencies] },
        {
          queryKind: SemanticAppQueryKind.BindingDataFlows,
          minRows: 1,
          targets: [SemanticAppQueryKind.BindingDataFlowSummary],
          evidence: [{ target: SemanticAppQueryKind.BindingDataFlowSummary, sourcePrecision: 'exact-authored-span' }],
        },
      ],
    },
    {
      label: 'runtime rendering',
      workspaceRoot: path.join(pressureRoot, 'template-controller-built-ins'),
      queries: [
        { kind: SemanticAppQueryKind.RuntimeControllers, page: { size: 5 } },
        { kind: SemanticAppQueryKind.RuntimeWatchers, page: { size: 5 } },
        { kind: SemanticAppQueryKind.RuntimeWatcherObservedDependencies, page: { size: 5 } },
      ],
      expectations: [
        { queryKind: SemanticAppQueryKind.RuntimeControllers, minRows: 1, targets: [SemanticAppQueryKind.BindingDataFlowSummary, SemanticAppQueryKind.RuntimeWatchers] },
        {
          queryKind: SemanticAppQueryKind.RuntimeWatchers,
          targets: [SemanticAppQueryKind.RuntimeWatcherObservedDependencies, SemanticAppQueryKind.BindingObservedDependencySummary],
          evidence: [{ continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.RuntimeWatcherObservedDependencies }],
        },
        { queryKind: SemanticAppQueryKind.RuntimeWatcherObservedDependencies, targets: [SemanticAppQueryKind.BindingObservedDependencySummary] },
      ],
    },
    {
      label: 'state rows',
      workspaceRoot: path.join(authoringRoot, 'generated-state-store-list'),
      queries: [
        { kind: SemanticAppQueryKind.StateStores, page: { size: 5 } },
        { kind: SemanticAppQueryKind.StateIssues, page: { size: 5 } },
      ],
      expectations: [
        {
          queryKind: SemanticAppQueryKind.StateStores,
          minRows: 1,
          targets: [SemanticAppQueryKind.StateIssues, SemanticAppQueryKind.AppTopology],
          evidence: [{ continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.StateIssues }],
        },
        { queryKind: SemanticAppQueryKind.StateIssues, targets: [SemanticAppQueryKind.AppDiagnosticSummary, SemanticAppQueryKind.StateStores, SemanticAppQueryKind.BindingDataFlowSummary] },
      ],
    },
    {
      label: 'i18n rows',
      workspaceRoot: path.join(pressureRoot, 'i18n-translation-binding-errors'),
      queries: [
        { kind: SemanticAppQueryKind.I18nTranslationKeys, page: { size: 5 } },
        { kind: SemanticAppQueryKind.I18nTranslationBindings, page: { size: 5 } },
      ],
      expectations: [
        {
          queryKind: SemanticAppQueryKind.I18nTranslationKeys,
          minRows: 1,
          targets: [SemanticAppQueryKind.I18nTranslationBindings, SemanticAppQueryKind.TemplateDiagnostics],
          evidence: [{ continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.I18nTranslationBindings }],
        },
        {
          queryKind: SemanticAppQueryKind.I18nTranslationBindings,
          minRows: 1,
          targets: [SemanticAppQueryKind.I18nTranslationKeys, SemanticAppQueryKind.TemplateDiagnostics],
          evidence: [{ continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.I18nTranslationKeys }],
        },
      ],
    },
    {
      label: 'plugin-ish issue rows',
      workspaceRoot: path.join(pressureRoot, 'fetch-client-config-errors'),
      queries: [
        { kind: SemanticAppQueryKind.FetchClientIssues, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: 5 } },
      ],
      expectations: [
        { queryKind: SemanticAppQueryKind.FetchClientIssues, minRows: 1, targets: [SemanticAppQueryKind.AppDiagnosticSummary, SemanticAppQueryKind.ConfigurationIssues, SemanticAppQueryKind.SourceFiles] },
        {
          queryKind: SemanticAppQueryKind.AppDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.FetchClientIssues],
          evidence: [{ target: SemanticAppQueryKind.FetchClientIssues, state: 'source-backed', sourcePrecision: 'exact-authored-span', intents: ['repair'], blockerCount: 0 }],
        },
      ],
    },
    {
      label: 'validation issue rows',
      workspaceRoot: path.join(pressureRoot, 'validation-rule-source-errors'),
      queries: [
        { kind: SemanticAppQueryKind.ValidationIssues, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: 5 } },
      ],
      expectations: [
        { queryKind: SemanticAppQueryKind.ValidationIssues, minRows: 1, targets: [SemanticAppQueryKind.AppDiagnosticSummary, SemanticAppQueryKind.BindingBehaviorApplications, SemanticAppQueryKind.TemplateDiagnostics] },
        {
          queryKind: SemanticAppQueryKind.AppDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.ValidationIssues],
          evidence: [{ target: SemanticAppQueryKind.ValidationIssues, state: 'source-backed', sourcePrecision: 'exact-authored-span', intents: ['repair'], blockerCount: 0 }],
        },
      ],
    },
    {
      label: 'dialog issue rows',
      workspaceRoot: path.join(pressureRoot, 'dialog-source-errors'),
      queries: [
        { kind: SemanticAppQueryKind.DialogIssues, page: { size: 5 } },
        { kind: SemanticAppQueryKind.AppDiagnostics, page: { size: 5 } },
      ],
      expectations: [
        { queryKind: SemanticAppQueryKind.DialogIssues, minRows: 1, targets: [SemanticAppQueryKind.AppDiagnosticSummary, SemanticAppQueryKind.DiIssues, SemanticAppQueryKind.ResourceDefinitions] },
        {
          queryKind: SemanticAppQueryKind.AppDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.DialogIssues],
          evidence: [{ target: SemanticAppQueryKind.DialogIssues, state: 'source-backed', sourcePrecision: 'exact-authored-span', intents: ['repair'], blockerCount: 0 }],
        },
      ],
    },
  ];

  for (const canary of canaries) {
    const runtime = await createSemanticRuntime({
      workspaceRoot: canary.workspaceRoot,
      storeKey: `contract-app-query-continuations-${canary.label.replace(/[^a-z0-9]+/gi, '-')}`,
    });
    const answer = await runtime.answerAppQueries({
      analysisDepth: 'binding-observation',
      queries: canary.queries,
    });
    for (const expectation of canary.expectations) {
      const row = answer.value.rows.find((candidate) => candidate.queryKind === expectation.queryKind);
      expect(row != null, `${canary.label}: ${expectation.queryKind} batch row should be present.`);
      if (row == null) {
        continue;
      }
      if (expectation.minRows != null) {
        const rowCount = row.answer.value?.rows?.length ?? 0;
        expect(rowCount >= expectation.minRows, `${canary.label}: ${expectation.queryKind} should return at least ${expectation.minRows} row(s), returned ${rowCount}.`);
      }
      expectContinuationTargets(row.answer, expectation.queryKind, expectation.targets, canary.label);
      for (const evidenceExpectation of expectation.evidence ?? []) {
        expectContinuationEvidence(row.answer, expectation.queryKind, evidenceExpectation, canary.label);
      }
    }
  }
}

async function verifyContinuationTargetQueriesEnterClaimGraph() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/router-dynamic-pattern'),
    storeKey: 'contract-app-query-continuations-claim-graph',
  });
  const summaryWithDiagnosticProjection = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.Summary,
    diagnosticProjection: 'available-products',
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  const projectedDiagnosticContinuation = summaryWithDiagnosticProjection.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary
  );
  expect(
    projectedDiagnosticContinuation?.targetQuery?.diagnosticProjection === 'available-products',
    'Routed app-query dispatch should preserve target-policy hints for continuation target queries even when the source query does not consume them.',
  );
  expect(
    projectedDiagnosticContinuation?.cost === 'app-world',
    'Routed app-query continuations should compute cost from the shaped target query materialization policy.',
  );

  const firstAnswer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.OpenSeams,
    page: { size: 2 },
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  const continuation = firstAnswer.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.OpenSeamSummary
  );
  expect(continuation?.targetQuery != null, 'Continuation followability should publish a targetQuery payload.');
  if (continuation?.targetQuery == null) {
    return;
  }

  const followedAnswer = await runtime.answerAppQuery({
    ...continuation.targetQuery,
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  expect(followedAnswer.outcome === SemanticRuntimeAnswerOutcome.Hit, 'Following a targetQuery should use the normal public app-query answer path.');
  expect(followedAnswer.value?.rows?.length >= 1, 'Following a targetQuery should return the expected continuation target rows.');

  const intentFilteredAnswer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.OpenSeams,
    page: { size: 2 },
    continuationIntents: ['inspect'],
    inquiryProfile: 'mcp-orientation',
    appRetention: 'retain-app',
  });
  expect(
    (intentFilteredAnswer.continuations ?? []).every((row) =>
      row.intents.length === 0 || row.intents.includes('inspect')
    ),
    'Continuation intent filters should narrow returned rows after the query claim answers the semantic facts.',
  );

  const cache = runtime.analysisCacheOverview({ includeQueryClaimRows: true, rowLimit: 20 });
  const runtimeClaimKinds = new Set((cache.value.runtimeQueryClaimProfiles ?? [])
    .flatMap((profile) => profile.queryClaimRows ?? [])
    .map((row) => row.queryKind));
  expect(runtimeClaimKinds.has(SemanticAppQueryKind.OpenSeams), 'Runtime query-claim graph should record the source query as an ordinary claim.');
  expect(runtimeClaimKinds.has(SemanticAppQueryKind.OpenSeamSummary), 'Runtime query-claim graph should record the followed continuation query as an ordinary claim.');

  const appClaimRows = (cache.value.cachedApps ?? [])
    .flatMap((app) => app.queryClaimProfiles ?? [])
    .flatMap((profile) => profile.queryClaimRows ?? []);
  const appClaimKinds = new Set(appClaimRows.map((row) => row.queryKind));
  expect(appClaimKinds.has(SemanticAppQueryKind.OpenSeams), 'App query-claim graph should record the source query as an ordinary claim.');
  expect(appClaimKinds.has(SemanticAppQueryKind.OpenSeamSummary), 'App query-claim graph should record the followed continuation query as an ordinary claim.');
  const openSeamQueryKeys = [...new Set(appClaimRows
    .filter((row) => row.queryKind === SemanticAppQueryKind.OpenSeams)
    .map((row) => row.queryKey))];
  expect(openSeamQueryKeys.length === 1, 'Continuation intent filtering should not add a second app-query identity for the same semantic query.');
  expect(!openSeamQueryKeys.some((key) => key.includes('inspect')), 'Continuation intent filtering should stay out of query-claim keys.');
  expect(
    appClaimRows
      .filter((row) => row.queryKind === SemanticAppQueryKind.OpenSeams || row.queryKind === SemanticAppQueryKind.OpenSeamSummary)
      .every((row) => row.parentId == null && row.depth === 0),
    'Public continuation follows should remain root query claims; nested parent/depth edges are reserved for composed answers.',
  );

  const profileBatchRequest = {
    analysisDepth: 'runtime-topology',
    inquiryProfile: 'mcp-orientation',
    appRetention: 'retain-app',
    includeAppQueryClaimProfiles: true,
    queries: [
      { kind: SemanticAppQueryKind.OpenSeamSummary, page: { size: 2 } },
    ],
  };
  const firstProfileBatch = await runtime.answerAppQueries(profileBatchRequest);
  const secondProfileBatch = await runtime.answerAppQueries(profileBatchRequest);
  const firstProfileHits = firstProfileBatch.value.appQueryClaimProfiles.find((profile) =>
    profile.inquiryProfile === 'mcp-orientation'
  )?.queryClaims.retainedAnswerHits ?? 0;
  const secondProfileHits = secondProfileBatch.value.appQueryClaimProfiles.find((profile) =>
    profile.inquiryProfile === 'mcp-orientation'
  )?.queryClaims.retainedAnswerHits ?? 0;
  expect(
    secondProfileHits > firstProfileHits,
    'Routed app-query batches that include live app query-claim profiles should materialize again instead of replaying a stale retained profile snapshot.',
  );
}

function expectBatchTargets(answer, queryKind, expectedTargets) {
  const row = answer.value.rows.find((candidate) => candidate.queryKind === queryKind);
  expect(row != null, `${queryKind} batch row should be present.`);
  expectContinuationTargets(row?.answer, queryKind, expectedTargets);
}

function expectContinuationTargets(answer, queryKind, expectedTargets, label = 'continuation canary') {
  const targets = new Set(answer?.continuations?.map((continuation) => continuation.targetQueryKind) ?? []);
  for (const expected of expectedTargets) {
    expect(targets.has(expected), `${label}: ${queryKind} should expose continuation target ${expected}.`);
  }
}

function expectContinuationEvidence(answer, queryKind, expectation, label) {
  const candidates = (answer.continuations ?? []).filter((row) =>
    row.targetQueryKind === expectation.target
    && (expectation.continuationKind == null || row.kind === expectation.continuationKind)
  );
  const continuation = candidates.find((row) => continuationMatchesEvidenceExpectation(row, expectation)) ?? candidates[0];
  expect(continuation != null, `${label}: ${queryKind} should expose continuation target ${expectation.target} for evidence checking.`);
  if (continuation == null) {
    return;
  }
  if (expectation.state != null) {
    expect(continuation.evidence?.evidenceState === expectation.state, `${label}: ${queryKind} -> ${expectation.target} should have evidence state ${expectation.state}, got ${continuation.evidence?.evidenceState}.`);
  }
  if (expectation.sourcePrecision != null) {
    expect(continuation.evidence?.sourcePrecision === expectation.sourcePrecision, `${label}: ${queryKind} -> ${expectation.target} should have source precision ${expectation.sourcePrecision}, got ${continuation.evidence?.sourcePrecision}.`);
  }
  for (const intent of expectation.intents ?? []) {
    expect(continuation.intents?.includes(intent), `${label}: ${queryKind} -> ${expectation.target} should include intent ${intent}.`);
  }
  for (const intent of expectation.notIntents ?? []) {
    expect(!continuation.intents?.includes(intent), `${label}: ${queryKind} -> ${expectation.target} should not include intent ${intent}.`);
  }
  if (expectation.blockerCount != null) {
    expect((continuation.blockers ?? []).length === expectation.blockerCount, `${label}: ${queryKind} -> ${expectation.target} should have ${expectation.blockerCount} blocker(s), got ${(continuation.blockers ?? []).length}.`);
  }
}

function continuationMatchesEvidenceExpectation(row, expectation) {
  if (expectation.state != null && row.evidence?.evidenceState !== expectation.state) {
    return false;
  }
  if (expectation.sourcePrecision != null && row.evidence?.sourcePrecision !== expectation.sourcePrecision) {
    return false;
  }
  for (const intent of expectation.intents ?? []) {
    if (!row.intents?.includes(intent)) {
      return false;
    }
  }
  for (const intent of expectation.notIntents ?? []) {
    if (row.intents?.includes(intent)) {
      return false;
    }
  }
  if (expectation.blockerCount != null && (row.blockers ?? []).length !== expectation.blockerCount) {
    return false;
  }
  return true;
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
