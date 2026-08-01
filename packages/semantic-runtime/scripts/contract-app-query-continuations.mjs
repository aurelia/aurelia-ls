import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  INQUIRY_CONTINUATION_INTENTS,
  SEMANTIC_APP_QUERY_KINDS,
  SEMANTIC_RUNTIME_API_VERSION,
  AppBuilderControlManifestRowId,
  AppBuilderEffectContractId,
  SemanticAppQueryKind,
  SemanticObservedDependencyLocusKind,
  SemanticRuntimeAppBuilderQueryKind,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  projectSemanticAppQueryContinuations,
  semanticContinuationSourceFacts,
  semanticAppQueryCatalogShape,
  semanticAppQueryCatalogRow,
  semanticAppQueryMaterializationPolicy,
  semanticSourceReferencesInAnswerRows,
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
const sourceRequirementValues = new Set(['not-required', 'authored-source', 'exact-authored-span']);
const epochDependencyValues = new Set(['runtime-session', 'project-input', 'app-world', 'source-input']);
const sourceFacetValues = new Set([
  'authored-source',
  'exact-authored-span',
  'carrier-span',
  'generated',
  'external',
  'unavailable',
]);
verifyCatalogWideContinuationCoverage();
verifyCatalogShapeAndIdentityNormalization();
verifyContinuationTargetQueryShapes();
verifyObservedDependencyLocusContinuations();
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

console.log('contract ok: public app-query continuations are typed, followable, and fixture-pressure backed.');

function verifyCatalogWideContinuationCoverage() {
  const answer = {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    result: SemanticRuntimeAnswerResult.Answered,
    selection: SemanticRuntimeAnswerSelection.NotApplicable,
    coverage: SemanticRuntimeAnswerCoverage.Complete,
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
      if (continuation.targetAppBuilderQueryKind != null) {
        expect(continuation.targetAppBuilderQuery?.kind === continuation.targetAppBuilderQueryKind, `${kind} targetAppBuilderQueryKind should match targetAppBuilderQuery.kind.`);
      }
      expect(
        continuation.targetQueryKind != null || continuation.targetAppBuilderQueryKind != null,
        `${kind} continuation should carry either an app-query or app-builder target kind.`,
      );
      expect(
        !(continuation.targetQueryKind != null && continuation.targetAppBuilderQueryKind != null),
        `${kind} continuation should not mix app-query and app-builder targets in one row.`,
      );
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
  expect(nextPage?.evidence?.sourceRequirement === 'not-required', 'project-wide next-page continuation should not invent a source requirement.');
  expect(nextPage?.evidence?.sourceFacts?.length === 0, 'next-page continuation should not reinterpret transport paging as semantic source evidence.');
  expect(
    JSON.stringify(nextPage?.evidence?.epochDependencies) === JSON.stringify(['project-input']),
    'Project-frame paging should identify project input as its invalidation authority.',
  );

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
  expect(projectExtraLocusNextPage?.evidence?.sourceRequirement === 'not-required', 'Unsupported source/cursor fields should not create source requirements for project-frame paging.');

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
  expect(sourceNextPage?.evidence?.sourceRequirement === 'authored-source', 'source-scoped paging should preserve the authored-source requirement without predicting target coverage.');
  expect(
    JSON.stringify(sourceNextPage?.evidence?.epochDependencies) === JSON.stringify(['project-input', 'app-world', 'source-input']),
    'Source-scoped app-world paging should preserve project, app-world, and source-input epoch dependencies independently.',
  );

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
  expect(appOverview?.evidence?.sourceRequirement === 'not-required', 'project overview continuations should not invent a source requirement.');
  expect(
    JSON.stringify(appOverview?.evidence?.epochDependencies) === JSON.stringify(['project-input', 'app-world']),
    'App-world continuations should identify both project-input and app-world generation dependencies.',
  );
  const projectDiagnosticSummary = summary.continuations?.find((row) => row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary);
  expect(projectDiagnosticSummary?.evidence?.sourceRequirement === 'not-required', 'A source-capable target should not require source evidence until a source locus is selected.');

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

  const resourceDefinitionFollowUps = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.ResourceDefinitions },
    answer,
  );
  const componentManifestContinuation = resourceDefinitionFollowUps.continuations?.find((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail
  );
  expect(
    componentManifestContinuation?.targetAppBuilderQuery?.controlManifestDetail?.controlManifestIds?.includes(AppBuilderControlManifestRowId.ComponentApiManifest) === true,
    'Resource-definition continuations should expose the component API manifest app-builder detail target.',
  );
  expect(
    componentManifestContinuation?.cost === 'free',
    'Resource-definition to app-builder manifest detail should be a free ontology-read-model continuation, not an app-world query.',
  );
  expect(
    JSON.stringify(componentManifestContinuation?.evidence?.epochDependencies) === JSON.stringify(['runtime-session']),
    'App-builder ontology continuations should identify the booted runtime session as their generation authority.',
  );
  const componentManifestEffectContinuation = resourceDefinitionFollowUps.continuations?.find((row) =>
    row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.EffectContractDetail
  );
  expect(
    componentManifestEffectContinuation?.targetAppBuilderQuery?.effectContractDetail?.effectContractIds?.includes(AppBuilderEffectContractId.ComponentManifestPublication) === true,
    'Resource-definition continuations should expose the component-manifest publication effect contract.',
  );

  const completionFollowUp = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.TemplateCompletions, cursor: { filePath: 'src/app.html', line: 0, character: 0 } },
    answer,
  );
  const cursorInfo = completionFollowUp.continuations?.find((row) => row.targetQueryKind === SemanticAppQueryKind.TemplateCursorInfo);
  expect(cursorInfo?.evidence?.sourceRequirement === 'exact-authored-span', 'Cursor-locus continuations should require an exact authored span without predicting target coverage.');

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
    semanticAppQueryKey({
      kind: SemanticAppQueryKind.OpenSeams,
      openSeamClusterKey: 'evaluation\u0000missing-static-value',
    }) !== semanticAppQueryKey({
      kind: SemanticAppQueryKind.OpenSeams,
      openSeamClusterKey: 'evaluation_missing-static-value',
    }),
    'App-query identity must preserve separator and NUL distinctions in answer-local selector keys.',
  );
  const referenceCursor = { filePath: 'src/app.html', line: 0, character: 1 };
  expect(
    semanticAppQueryKey({
      kind: SemanticAppQueryKind.TemplateReferences,
      cursor: referenceCursor,
      includeDeclaration: true,
    }) !== semanticAppQueryKey({
      kind: SemanticAppQueryKind.TemplateReferences,
      cursor: referenceCursor,
      includeDeclaration: false,
    }),
    'Template-reference identity must preserve declaration-inclusion policy.',
  );
  expect(
    semanticAppQueryKey({
      kind: SemanticAppQueryKind.TemplateRename,
      cursor: referenceCursor,
      newName: 'alpha',
    }) !== semanticAppQueryKey({
      kind: SemanticAppQueryKind.TemplateRename,
      cursor: referenceCursor,
      newName: 'beta',
    }),
    'Template-rename identity must preserve the requested replacement name.',
  );
  expect(
    semanticAppQueryLocusKey('contract-project', noisyProjectQuery) === 'project:contract-project',
    'App-query locus keys should ignore unsupported source/cursor fields.',
  );
  expect(
    JSON.stringify(semanticAppQueryEpochKeys('contract-project', 'input-1', noisyProjectQuery))
      === JSON.stringify(['project:contract-project', 'project-input:contract-project:input-1']),
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
    result: SemanticRuntimeAnswerResult.Answered,
    selection: SemanticRuntimeAnswerSelection.NotApplicable,
    coverage: SemanticRuntimeAnswerCoverage.Complete,
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
        targetQuery.rowPageSize == null || targetQuery.kind === SemanticAppQueryKind.RouterOverview,
        `${kind} -> ${targetQuery.kind} should not carry rowPageSize outside router-overview.`,
      );
    }
  }
}

function verifyObservedDependencyLocusContinuations() {
  const answer = {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    result: SemanticRuntimeAnswerResult.Answered,
    selection: SemanticRuntimeAnswerSelection.NotApplicable,
    coverage: SemanticRuntimeAnswerCoverage.Complete,
    summary: 'contract fake dependency answer',
    value: { rows: [] },
    page: {
      size: 10,
      cursor: null,
      nextCursor: null,
      returnedRows: 0,
      totalRows: 0,
    },
  };
  const clusterLocus = {
    kind: SemanticObservedDependencyLocusKind.Cluster,
    clusterKey: 'member:catalog-state:items',
  };
  const clusteredSummary = withSemanticAppQueryContinuations(
    {
      kind: SemanticAppQueryKind.BindingObservedDependencySummary,
      observedDependencyLocus: clusterLocus,
    },
    answer,
  );
  const clusteredRows = clusteredSummary.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingObservedDependencies
  );
  expect(
    JSON.stringify(clusteredRows?.targetQuery?.observedDependencyLocus) === JSON.stringify(clusterLocus),
    'Binding dependency summary-to-row continuations should preserve the selected cluster locus exactly.',
  );

  const ownerLocus = {
    kind: SemanticObservedDependencyLocusKind.Owner,
    ownerKey: 'binding:template:42',
  };
  const ownerRows = withSemanticAppQueryContinuations(
    {
      kind: SemanticAppQueryKind.BindingObservedDependencies,
      observedDependencyLocus: ownerLocus,
    },
    answer,
  );
  const ownerSummary = ownerRows.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingObservedDependencySummary
  );
  expect(
    JSON.stringify(ownerSummary?.targetQuery?.observedDependencyLocus) === JSON.stringify(ownerLocus),
    'Binding dependency row-to-summary continuations should preserve the selected owner locus exactly.',
  );

  const sourceLocus = {
    kind: SemanticObservedDependencyLocusKind.SourceFile,
    sourceFile: { filePath: 'src/catalog.html' },
  };
  const effectRows = withSemanticAppQueryContinuations(
    {
      kind: SemanticAppQueryKind.RuntimeEffectObservedDependencies,
      observedDependencyLocus: sourceLocus,
    },
    answer,
  );
  const effectSummary = effectRows.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.BindingObservedDependencySummary
  );
  expect(
    JSON.stringify(effectSummary?.targetQuery?.observedDependencyLocus) === JSON.stringify(sourceLocus),
    'Cross-family observed-dependency continuations should preserve an authored source-file locus.',
  );
  expect(
    semanticAppQueryCatalogRow(SemanticAppQueryKind.BindingObservedDependencies)
      .observedDependencyLocusKinds.includes(SemanticObservedDependencyLocusKind.Cluster),
    'Binding dependency row queries should advertise cluster loci so a summary drill-down remains followable.',
  );
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
    expect(
      sourceRequirementValues.has(continuation.evidence.sourceRequirement),
      `${context} continuation sourceRequirement should be a known value, got ${JSON.stringify(continuation.evidence.sourceRequirement)}.`,
    );
    expect(Array.isArray(continuation.evidence.sourceFacts), `${context} continuation sourceFacts should be an array.`);
    expect(Array.isArray(continuation.evidence.epochDependencies), `${context} continuation epochDependencies should be an array.`);
    for (const dependency of continuation.evidence.epochDependencies ?? []) {
      expect(
        epochDependencyValues.has(dependency),
        `${context} continuation epoch dependency should be a known value, got ${JSON.stringify(dependency)}.`,
      );
    }
    for (const [index, fact] of (continuation.evidence.sourceFacts ?? []).entries()) {
      expect(fact != null && typeof fact === 'object' && !Array.isArray(fact), `${context} source fact ${index} should be an object.`);
      expect(Number.isInteger(fact?.count) && fact.count > 0, `${context} source fact ${index} should carry a positive integer count.`);
      expect(Array.isArray(fact?.facets) && fact.facets.length > 0, `${context} source fact ${index} should carry at least one facet.`);
      for (const facet of fact?.facets ?? []) {
        expect(sourceFacetValues.has(facet), `${context} source fact ${index} should use a known facet, got ${JSON.stringify(facet)}.`);
      }
      expect(
        fact?.source == null || (
          typeof fact.source === 'object'
          && typeof fact.source.kind === 'string'
          && typeof fact.source.label === 'string'
        ),
        `${context} source fact ${index} should carry a public source reference or null.`,
      );
    }
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
      result: SemanticRuntimeAnswerResult.Answered,
      selection: SemanticRuntimeAnswerSelection.NotApplicable,
      coverage: SemanticRuntimeAnswerCoverage.Complete,
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
  const filtered = projectSemanticAppQueryContinuations(
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

  const resourceFull = withSemanticAppQueryContinuations(
    { kind: SemanticAppQueryKind.ResourceDefinitions },
    {
      schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
      result: SemanticRuntimeAnswerResult.Answered,
      selection: SemanticRuntimeAnswerSelection.NotApplicable,
      coverage: SemanticRuntimeAnswerCoverage.Complete,
      summary: 'contract fake resource answer',
      value: {},
    },
  );
  const resourceFiltered = projectSemanticAppQueryContinuations(
    { continuationIntents: ['inspect'] },
    resourceFull,
  );
  expect(
    (resourceFiltered.continuations ?? []).some((row) =>
      row.targetAppBuilderQueryKind === SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail
      && row.targetAppBuilderQuery?.continuationIntents?.includes('inspect') === true
    ),
    'Filtered app-query continuations should thread intent filters into app-builder target queries too.',
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
  const external = {
    kind: 'typescript-node',
    label: 'node_modules/pkg/index.d.ts@1..5',
    path: 'node_modules/pkg/index.d.ts',
    start: 1,
    end: 5,
  };
  const anchoredTemplate = {
    kind: 'template-address',
    label: 'template:contract',
    anchor: source,
  };
  const generated = {
    kind: 'generated-address',
    label: 'generated overlay',
    anchor: source,
  };
  const collected = semanticSourceReferencesInAnswerRows({
    rows: [{
      observedMemberSource: source,
      targetSource: external,
      source: anchoredTemplate,
      suggestion: { actionTarget: { source: generated } },
    }],
  });
  const facts = semanticContinuationSourceFacts(collected);
  expect(collected.length === 4, 'Bounded public-row traversal should discover every source-bearing carrier in the synthetic answer.');
  expectSourceFactFacets(facts, source.label, ['authored-source', 'exact-authored-span'], 'exact authored source');
  expectSourceFactFacets(facts, external.label, ['external'], 'external TypeScript source');
  expectSourceFactFacets(facts, anchoredTemplate.label, ['authored-source', 'exact-authored-span'], 'anchored template source');
  expectSourceFactFacets(facts, generated.label, ['authored-source', 'exact-authored-span', 'generated'], 'generated source with authored anchor');
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
  expect(related?.evidence?.sourceRequirement === 'exact-authored-span', 'Repair-oriented diagnostic continuations should require exact authored spans.');
  expect(
    related?.evidence?.sourceFacts?.every((fact) => fact.facets.includes('exact-authored-span')) === true,
    'Related diagnostic continuations should retain each exact authored source fact independently.',
  );
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
      result: SemanticRuntimeAnswerResult.Answered,
      selection: SemanticRuntimeAnswerSelection.NotApplicable,
      coverage: SemanticRuntimeAnswerCoverage.Complete,
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
      sourceRequirement: 'exact-authored-span',
      sourceFacets: ['exact-authored-span'],
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
    sourceFacets: ['exact-authored-span'],
    notIntents: ['repair'],
  }, 'template repair precision');
  expectContinuationEvidence(answer, SemanticAppQueryKind.TemplateDiagnostics, {
    target: SemanticAppQueryKind.BindingDataFlowSummary,
    sourceRequirement: 'not-required',
    sourceFactCount: 0,
    notIntents: ['repair'],
  }, 'template repair precision');
  expectContinuationEvidence(answer, SemanticAppQueryKind.TemplateDiagnostics, {
    target: SemanticAppQueryKind.ResourceDefinitions,
    sourceRequirement: 'not-required',
    sourceFactCount: 0,
    notIntents: ['repair'],
  }, 'template repair precision');
}

async function verifyFamilySpecificContinuationCanaries() {
  const pressureRoot = path.join(packageRoot, 'fixtures/pressure');
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
            { target: SemanticAppQueryKind.TypeScriptDiagnosticSummary, sourceRequirement: 'not-required', sourceFactCount: 0 },
            { target: SemanticAppQueryKind.AppDiagnostics, sourceRequirement: 'not-required', sourceFactCount: 0, notIntents: ['repair'] },
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
          evidence: [{
            continuationKind: followQueryContinuationKind,
            target: SemanticAppQueryKind.TypeScriptDiagnostics,
            sourceRequirement: 'exact-authored-span',
            sourceFacets: ['exact-authored-span'],
            intents: ['repair'],
            blockerCount: 0,
          }],
        },
      ],
    },
    {
      label: 'open seams',
      workspaceRoot: path.join(pressureRoot, 'router-dynamic-pattern'),
      queries: [
        { kind: SemanticAppQueryKind.OpenSeams, page: { size: 5 } },
        { kind: SemanticAppQueryKind.OpenSeamSites, page: { size: 5 } },
        { kind: SemanticAppQueryKind.OpenSeamSummary, page: { size: 5 } },
      ],
      expectations: [
        {
          queryKind: SemanticAppQueryKind.OpenSeams,
          minRows: 1,
          targets: [SemanticAppQueryKind.OpenSeamSummary],
          evidence: [{ target: SemanticAppQueryKind.OpenSeamSummary, sourceRequirement: 'not-required', minSourceFactCount: 1, sourceFacets: ['exact-authored-span'] }],
        },
        {
          queryKind: SemanticAppQueryKind.OpenSeamSites,
          minRows: 1,
          targets: [SemanticAppQueryKind.OpenSeams, SemanticAppQueryKind.OpenSeamSummary],
          evidence: [{ target: SemanticAppQueryKind.OpenSeams, sourceRequirement: 'not-required', minSourceFactCount: 1, sourceFacets: ['exact-authored-span'] }],
        },
        {
          queryKind: SemanticAppQueryKind.OpenSeamSummary,
          minRows: 1,
          targets: [SemanticAppQueryKind.OpenSeams],
          evidence: [{ target: SemanticAppQueryKind.OpenSeams, sourceRequirement: 'not-required', minSourceFactCount: 1, sourceFacets: ['exact-authored-span'] }],
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
          evidence: [{ target: SemanticAppQueryKind.ConfigurationIssues, sourceRequirement: 'exact-authored-span', sourceFacets: ['exact-authored-span'], intents: ['repair'], blockerCount: 0 }],
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
          evidence: [{ target: SemanticAppQueryKind.DiIssues, sourceRequirement: 'exact-authored-span', sourceFacets: ['exact-authored-span'], intents: ['repair'], blockerCount: 0 }],
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
        { kind: SemanticAppQueryKind.ResourceIssues, page: { size: 20 } },
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
          exactRows: 5,
          targets: [SemanticAppQueryKind.ResourceDefinitions, SemanticAppQueryKind.AppDiagnosticSummary],
          evidence: [{ target: SemanticAppQueryKind.ResourceDefinitions, sourceRequirement: 'not-required', sourceFactCount: 0 }],
        },
        { queryKind: SemanticAppQueryKind.ResourceVisibility, minRows: 1, targets: [SemanticAppQueryKind.ResourceDefinitions, SemanticAppQueryKind.TemplateCompilations] },
        {
          queryKind: SemanticAppQueryKind.AppDiagnostics,
          minRows: 1,
          targets: [SemanticAppQueryKind.ResourceIssues],
          evidence: [{ target: SemanticAppQueryKind.ResourceIssues, sourceRequirement: 'exact-authored-span', sourceFacets: ['exact-authored-span'], intents: ['repair'], blockerCount: 0 }],
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
            { continuationKind: followQueryContinuationKind, target: SemanticAppQueryKind.RuntimeEffectObservedDependencies, sourceRequirement: 'not-required', sourceFactCount: 0 },
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
          evidence: [{ target: SemanticAppQueryKind.BindingDataFlowSummary, sourceRequirement: 'not-required', sourceFactCount: 0 }],
        },
      ],
    },
    {
      label: 'control-use inventory',
      workspaceRoot: path.join(pressureRoot, 'app-builder-source-lowering-gallery'),
      queries: [
        { kind: SemanticAppQueryKind.ControlUseInventory, page: { size: 5 } },
        { kind: SemanticAppQueryKind.BindingValueChannels, page: { size: 5 } },
        { kind: SemanticAppQueryKind.BindingDataFlows, page: { size: 5 } },
      ],
      expectations: [
        {
          queryKind: SemanticAppQueryKind.ControlUseInventory,
          minRows: 1,
          targets: [SemanticAppQueryKind.BindingValueChannels, SemanticAppQueryKind.BindingDataFlows],
          evidence: [
            { target: SemanticAppQueryKind.BindingValueChannels, sourceRequirement: 'not-required', sourceFactCount: 0 },
            { target: SemanticAppQueryKind.BindingDataFlows, sourceRequirement: 'not-required', sourceFactCount: 0 },
          ],
        },
        {
          queryKind: SemanticAppQueryKind.BindingValueChannels,
          minRows: 1,
          targets: [SemanticAppQueryKind.BindingValueChannelSummary, SemanticAppQueryKind.ControlUseInventory],
        },
        {
          queryKind: SemanticAppQueryKind.BindingDataFlows,
          minRows: 1,
          targets: [SemanticAppQueryKind.BindingDataFlowSummary, SemanticAppQueryKind.ControlUseInventory],
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
      workspaceRoot: path.join(pressureRoot, 'app-pattern-state-store-list'),
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
          evidence: [{ target: SemanticAppQueryKind.FetchClientIssues, sourceRequirement: 'exact-authored-span', sourceFacets: ['exact-authored-span'], intents: ['repair'], blockerCount: 0 }],
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
          evidence: [{ target: SemanticAppQueryKind.ValidationIssues, sourceRequirement: 'exact-authored-span', sourceFacets: ['exact-authored-span'], intents: ['repair'], blockerCount: 0 }],
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
          evidence: [{ target: SemanticAppQueryKind.DialogIssues, sourceRequirement: 'exact-authored-span', sourceFacets: ['exact-authored-span'], intents: ['repair'], blockerCount: 0 }],
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
      if (expectation.exactRows != null) {
        const rowCount = row.answer.value?.rows?.length ?? 0;
        expect(rowCount === expectation.exactRows, `${canary.label}: ${expectation.queryKind} should return exactly ${expectation.exactRows} row(s), returned ${rowCount}.`);
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
  const summaryWithTypeProjection = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.Summary,
    diagnosticProjection: 'type-projection',
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  const typeProjectedDiagnosticContinuation = summaryWithTypeProjection.continuations?.find((row) =>
    row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary
  );
  expect(
    typeProjectedDiagnosticContinuation?.targetQuery?.diagnosticProjection === 'type-projection',
    'A retained source claim must project the current response diagnostic policy instead of replaying the first policy.',
  );
  expect(
    typeProjectedDiagnosticContinuation?.cost === 'query-type-projection',
    'Continuation cost should be recomputed after projecting a type-checking diagnostic target policy.',
  );
  const summaryWithAvailableProductsAgain = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.Summary,
    diagnosticProjection: 'available-products',
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  expect(
    summaryWithAvailableProductsAgain.continuations?.find((row) =>
      row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary
    )?.targetQuery?.diagnosticProjection === 'available-products',
    'Response projection should remain reversible across repeated reads of one retained semantic claim.',
  );

  const diagnoseFilteredSummary = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.Summary,
    continuationIntents: ['diagnose'],
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  const inspectFilteredSummary = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.Summary,
    continuationIntents: ['inspect'],
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  expect(
    diagnoseFilteredSummary.continuations?.some((row) =>
      row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary
    ) === true,
    'A diagnose envelope should retain the summary diagnostic continuation.',
  );
  expect(
    diagnoseFilteredSummary.continuations?.some((row) =>
      row.targetQueryKind === SemanticAppQueryKind.AppOverview
    ) === false,
    'A diagnose envelope should not retain inspect-only summary continuations.',
  );
  expect(
    inspectFilteredSummary.continuations?.some((row) =>
      row.targetQueryKind === SemanticAppQueryKind.AppOverview
    ) === true,
    'An inspect envelope should retain the summary overview continuation after the diagnose claim read.',
  );
  expect(
    inspectFilteredSummary.continuations?.some((row) =>
      row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary
    ) === false,
    'An inspect envelope should not replay the diagnose filter retained by an earlier request.',
  );

  const diagnoseBatch = await runtime.answerAppQueries({
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
    queries: [{
      kind: SemanticAppQueryKind.Summary,
      continuationIntents: ['diagnose'],
    }],
  });
  const inspectBatch = await runtime.answerAppQueries({
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
    queries: [{
      kind: SemanticAppQueryKind.Summary,
      continuationIntents: ['inspect'],
    }],
  });
  const diagnoseBatchContinuations = diagnoseBatch.value.rows[0]?.answer.continuations ?? [];
  const inspectBatchContinuations = inspectBatch.value.rows[0]?.answer.continuations ?? [];
  expect(
    diagnoseBatchContinuations.some((row) => row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary)
      && !diagnoseBatchContinuations.some((row) => row.targetQueryKind === SemanticAppQueryKind.AppOverview),
    'A reusable batch claim should project diagnose policy only into the diagnose response.',
  );
  expect(
    inspectBatchContinuations.some((row) => row.targetQueryKind === SemanticAppQueryKind.AppOverview)
      && !inspectBatchContinuations.some((row) => row.targetQueryKind === SemanticAppQueryKind.AppDiagnosticSummary),
    'A reusable batch claim should project inspect policy only into the later inspect response.',
  );

  const coldPolicyRuntime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure/router-dynamic-pattern'),
    storeKey: 'contract-app-query-continuations-cold-response-policy',
  });
  await coldPolicyRuntime.answerAppQuery({
    kind: SemanticAppQueryKind.Summary,
    continuationIntents: ['diagnose'],
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  const unfilteredAfterDiagnose = await coldPolicyRuntime.answerAppQuery({
    kind: SemanticAppQueryKind.Summary,
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
  });
  expect(
    unfilteredAfterDiagnose.continuations?.some((row) =>
      row.targetQueryKind === SemanticAppQueryKind.AppOverview
    ) === true,
    'An unfiltered response should recover inspect continuations when the retained claim was first read through a diagnose filter.',
  );
  expect(
    (unfilteredAfterDiagnose.continuations ?? []).every((row) =>
      row.targetQuery?.continuationIntents == null
      && row.targetAppBuilderQuery?.continuationIntents == null
    ),
    'Neutral retained continuations must not preserve the first caller response-intent filter.',
  );
  await coldPolicyRuntime.answerAppQueries({
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
    queries: [{
      kind: SemanticAppQueryKind.Summary,
      continuationIntents: ['diagnose'],
    }],
  });
  const unfilteredBatchAfterDiagnose = await coldPolicyRuntime.answerAppQueries({
    inquiryProfile: 'exploration',
    appRetention: 'retain-app',
    queries: [{
      kind: SemanticAppQueryKind.Summary,
    }],
  });
  expect(
    (unfilteredBatchAfterDiagnose.value.rows[0]?.answer.continuations ?? []).every((row) =>
      row.targetQuery?.continuationIntents == null
      && row.targetAppBuilderQuery?.continuationIntents == null
    ),
    'A neutral retained batch claim must not preserve the first child response-intent filter.',
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
  expect(
    followedAnswer.result === SemanticRuntimeAnswerResult.Answered,
    'Following a targetQuery should use the normal public app-query answer path without conflating paging with result.',
  );
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
  if (expectation.sourceRequirement != null) {
    expect(
      continuation.evidence?.sourceRequirement === expectation.sourceRequirement,
      `${label}: ${queryKind} -> ${expectation.target} should require ${expectation.sourceRequirement}, got ${continuation.evidence?.sourceRequirement}.`,
    );
  }
  if (expectation.sourceFactCount != null) {
    expect(
      (continuation.evidence?.sourceFacts ?? []).length === expectation.sourceFactCount,
      `${label}: ${queryKind} -> ${expectation.target} should carry ${expectation.sourceFactCount} distinct source fact(s), got ${(continuation.evidence?.sourceFacts ?? []).length}.`,
    );
  }
  if (expectation.minSourceFactCount != null) {
    expect(
      (continuation.evidence?.sourceFacts ?? []).length >= expectation.minSourceFactCount,
      `${label}: ${queryKind} -> ${expectation.target} should carry at least ${expectation.minSourceFactCount} distinct source fact(s), got ${(continuation.evidence?.sourceFacts ?? []).length}.`,
    );
  }
  if (expectation.sourceFacets != null) {
    const actualFacets = continuationSourceFacetSet(continuation);
    for (const facet of expectation.sourceFacets) {
      expect(
        actualFacets.has(facet),
        `${label}: ${queryKind} -> ${expectation.target} should preserve source facet ${facet}, got ${JSON.stringify([...actualFacets].sort())}.`,
      );
    }
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
  if (
    expectation.sourceRequirement != null
    && row.evidence?.sourceRequirement !== expectation.sourceRequirement
  ) {
    return false;
  }
  if (
    expectation.sourceFactCount != null
    && (row.evidence?.sourceFacts ?? []).length !== expectation.sourceFactCount
  ) {
    return false;
  }
  const actualFacets = continuationSourceFacetSet(row);
  if ((expectation.sourceFacets ?? []).some((facet) => !actualFacets.has(facet))) {
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

function continuationSourceFacetSet(continuation) {
  return new Set((continuation.evidence?.sourceFacts ?? []).flatMap((fact) => fact.facets ?? []));
}

function expectSourceFactFacets(facts, sourceLabel, expectedFacets, label) {
  const fact = facts.find((candidate) => candidate.source?.label === sourceLabel);
  expect(fact != null, `${label} should survive as a distinct continuation source fact.`);
  expect(
    JSON.stringify(fact?.facets ?? []) === JSON.stringify([...expectedFacets].sort()),
    `${label} should preserve independent facets ${JSON.stringify([...expectedFacets].sort())}, got ${JSON.stringify(fact?.facets ?? [])}.`,
  );
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
