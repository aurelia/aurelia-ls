import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AureliaMcpSemanticRuntimeAdapter,
  projectDetachedAureliaMcpResponse,
} from '../out/runtime-adapter.js';
import {
  expectedPatternCatalogCount,
  patternReleaseSentinels,
} from './pattern-sentinels.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const serverPath = path.join(repoRoot, 'packages/mcp/out/server.js');
const fixtureRoot = path.join(repoRoot, 'packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form');
const openSeamSitesFixtureRoot = path.join(repoRoot, 'packages/semantic-runtime/fixtures/pressure/evaluation-open-seam-sites');
const typescriptDiagnosticsFixtureRoot = path.join(repoRoot, 'packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics');
const projectConfigurationFixtureRoot = path.join(repoRoot, 'playground/issue-tracker');
const projectConfigurationDiagnosticsFixtureRoot = path.join(repoRoot, 'packages/mcp/fixtures/project-configuration-diagnostics');

const child = spawn(process.execPath, [serverPath], {
  cwd: repoRoot,
  stdio: ['pipe', 'pipe', 'pipe'],
});

let nextId = 1;
let buffer = '';
const pending = new Map();

child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  for (;;) {
    const lineEnd = buffer.indexOf('\n');
    if (lineEnd < 0) {
      return;
    }
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    if (line.length === 0) {
      continue;
    }
    const message = JSON.parse(line);
    if (message.id != null && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  }
});

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
});

try {
  const initializeResponse = await initialize();
  verifyServerInstructions(initializeResponse);
  await verifyOrientationResource();
  await verifyToolSurfaceBudget();
  await verifyToolInputSchemaDescriptions();
  await verifyNativeProjectConfigurations();
  await verifyPatternFollowUpHints();
  await verifyBundledDocsTools();
  await verifyStrictTopLevelEnvelope();
  await verifyStrictCuratedSelectors();
  await verifyPageClampAndTextPreview();
  await verifyObservedDependencyLocus();
  await verifyWorkspaceOverviewContinuations();
  await verifyAnalysisDepthEnvelope();
  await verifyProfileDrivenRetention();
  await verifySourceFilePathUnsupportedPreflight();
  await verifyAnalysisCacheClearVocabulary();
  await verifyCacheWorkspaceDescriptorIdentity();
  await verifyDiagnosticTextPreviewIdentity();
  await verifyOpenSeamSitesPreview();
  await verifyCursorVocabulary();
  await verifyMissingWorkspaceRoot();
  await verifyInvalidProjectKeyRemedy();
  await verifyInvalidQueryKindRemedy();
  await verifyCursorOutOfRangeRemedy();
  await verifyDirectAdapterSourceFileGuard();
  console.log('MCP adversarial surface contract passed.');
} finally {
  child.kill();
}

async function initialize() {
  const response = await call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'adversarial-contract', version: '0' },
  });
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {},
  }) + '\n');
  return response;
}

function verifyServerInstructions(response) {
  const instructions = response.result?.instructions;
  expect(typeof instructions === 'string' && instructions.includes('aurelia_workspace_overview'), 'Initialize response should include Aurelia MCP orientation instructions.');
  expect(instructions.includes('aurelia_project_configurations'), 'Initialize response should expose the native project-configuration query when configuration state matters.');
  expect(instructions.includes('aurelia_pattern_menu'), 'Initialize response should mention the Aurelia pattern menu for app-building examples.');
  expect(instructions.includes('support.followUp'), 'Initialize response should mention pattern follow-up hints.');
  expect(instructions.includes('aurelia_docs_search'), 'Initialize response should mention bundled docs search.');
  expect(instructions.includes('aurelia_docs_fetch'), 'Initialize response should mention bundled docs fetch.');
  expect(instructions.includes('no web requests'), 'Initialize response should state that docs grounding is local and offline.');
  expect(!instructions.includes('aurelia_app_builder'), 'Initialize response should not advertise retired app-builder tools.');
  expect(instructions.includes('page.size=0'), 'Server instructions should teach rollup-first page.size=0 usage.');
  expect(instructions.includes('auto-selects') || instructions.includes('auto-satisfies'), 'Server instructions should teach analysis-depth auto-selection.');
  expect(!containsLocalPathOrScratchReference(instructions), 'Server instructions should stay app-agnostic.');
}

async function verifyOrientationResource() {
  const listed = await call('resources/list', {});
  const resource = listed.result?.resources?.find((entry) => entry.uri === 'aurelia://semantic-runtime/orientation');
  expect(resource != null, 'Orientation resource should be advertised through resources/list.');
  const read = await call('resources/read', { uri: 'aurelia://semantic-runtime/orientation' });
  const text = read.result?.contents?.[0]?.text;
  expect(typeof text === 'string' && text.includes('## Golden Path'), 'Orientation resource should provide the full golden path.');
  expect(text.includes('aurelia_project_configurations'), 'Orientation resource should expose the native project-configuration query when configuration state matters.');
  expect(text.includes('aurelia_app_query_catalog'), 'Orientation resource should teach catalog-first query selection.');
  expect(text.includes('aurelia_pattern_example'), 'Orientation resource should teach pattern example fetch for source guidance.');
  expect(text.includes('support.followUp'), 'Orientation resource should teach semantic-runtime follow-up hints from pattern examples.');
  expect(text.includes('aurelia_docs_search'), 'Orientation resource should teach docs search before docs fetch.');
  expect(text.includes('no web requests'), 'Orientation resource should describe bundled docs as offline/local.');
  expect(!text.includes('aurelia_app_builder'), 'Orientation resource should not advertise retired app-builder tools.');
  expect(text.includes('sourceFile') && text.includes('result=unsupported'), 'Orientation resource should teach honest source-file selector rejection.');
  expect(!containsLocalPathOrScratchReference(text), 'Orientation resource should stay app-agnostic.');
}

async function verifyToolSurfaceBudget() {
  const response = await call('tools/list', {});
  const text = JSON.stringify(response.result);
  const surfaceBytes = Buffer.byteLength(text, 'utf8');
  const largestTools = [...(response.result?.tools ?? [])]
    .map((tool) => ({ name: tool.name, bytes: Buffer.byteLength(JSON.stringify(tool), 'utf8') }))
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 4)
    .map((tool) => `${tool.name}=${tool.bytes}`)
    .join(', ');
  expect(
    surfaceBytes < 68_000,
    `tools/list should stay below the fixed 19-tool schema budget; observed ${surfaceBytes} bytes; largest tools: ${largestTools}.`,
  );
  expect(response.result?.tools?.length === 19, 'tools/list should advertise the expected public tool count.');
  const toolNames = new Set((response.result?.tools ?? []).map((tool) => tool.name));
  expect(toolNames.has('aurelia_pattern_menu'), 'tools/list should advertise aurelia_pattern_menu.');
  expect(toolNames.has('aurelia_pattern_example'), 'tools/list should advertise aurelia_pattern_example.');
  expect(toolNames.has('aurelia_docs_search'), 'tools/list should advertise aurelia_docs_search.');
  expect(toolNames.has('aurelia_docs_fetch'), 'tools/list should advertise aurelia_docs_fetch.');
  expect(toolNames.has('aurelia_project_configurations'), 'tools/list should advertise aurelia_project_configurations.');
  expect(!toolNames.has('aurelia_app_builder_catalog'), 'tools/list should not advertise retired app-builder catalog.');
  expect(!toolNames.has('aurelia_app_builder_query'), 'tools/list should not advertise retired app-builder query.');
  expect(!text.includes('sourceLowering') && !text.includes('targetCatalog') && !text.includes('inputReadiness'), 'tools/list should not expose old app-builder request vocabulary.');
}

async function verifyToolInputSchemaDescriptions() {
  const response = await call('tools/list', {});
  const tools = response.result?.tools ?? [];
  for (const tool of tools) {
    const missing = missingDescriptions(tool.inputSchema, tool.name);
    expect(missing.length === 0, `Tool ${tool.name} has undescribed input schema field(s): ${missing.join(', ')}`);
  }
  const appQuery = tools.find((tool) => tool.name === 'aurelia_app_query');
  const workspaceProperties = appQuery?.inputSchema?.properties ?? {};
  expect('projectRootHints' in workspaceProperties, 'Workspace tools should expose shared semantic project-root hints.');
  expect('excludedWorkspaceRoots' in workspaceProperties, 'Workspace tools should expose shared authored-source exclusions.');
  expect(!('projects' in workspaceProperties), 'Ordinary MCP tools should not repeat synthetic explicit-project boot inputs.');
  expect(!('storeKey' in workspaceProperties), 'Ordinary MCP tools should not expose runtime-only store namespaces.');
  expect(!('projectDiscovery' in workspaceProperties), 'Ordinary MCP tools should use shared project-marker discovery rather than consumer policy switches.');
  expect(JSON.stringify(appQuery?.inputSchema).includes('Check supportsSourceFile'), 'sourceFile schema description should point callers to supportsSourceFile.');
  expect(JSON.stringify(appQuery?.inputSchema).includes('result=unsupported'), 'sourceFilePath schema description should promise honest unsupported answers.');
  expect(JSON.stringify(appQuery?.inputSchema).includes('observedDependencyLocus'), 'Generic app-query schema should expose family-owned observed-dependency loci.');
  const openSeamOverview = tools.find((tool) => tool.name === 'aurelia_open_seam_overview');
  expect(openSeamOverview?.description?.includes('unique authored source site'), 'Open-seam overview should describe its authored-site-first projection.');
  expect(!('detail' in (openSeamOverview?.inputSchema?.properties ?? {})), 'Open-seam overview should not advertise unsupported detail.');
  expect('page' in (openSeamOverview?.inputSchema?.properties ?? {}), 'Open-seam overview should retain its supported page selector.');
  const cursorInfo = tools.find((tool) => tool.name === 'aurelia_template_cursor_info');
  expect(!('page' in (cursorInfo?.inputSchema?.properties ?? {})), 'Template cursor info should not advertise unsupported paging.');
  expect('detail' in (cursorInfo?.inputSchema?.properties ?? {}), 'Template cursor info should retain its supported detail selector.');
  const completions = tools.find((tool) => tool.name === 'aurelia_template_completions');
  expect('page' in (completions?.inputSchema?.properties ?? {}), 'Template completions should retain its supported page selector.');
  expect('detail' in (completions?.inputSchema?.properties ?? {}), 'Template completions should retain its supported detail selector.');
  const projectConfigurations = tools.find((tool) => tool.name === 'aurelia_project_configurations');
  const configurationProperties = projectConfigurations?.inputSchema?.properties ?? {};
  expect('projectKey' in configurationProperties, 'Project configurations should expose the exact projectKey selector.');
  expect('sourceFilePaths' in configurationProperties, 'Project configurations should expose exact sourceFilePaths selection.');
  expect(!('sourceFilePath' in configurationProperties), 'Project configurations should not collapse its exact path set into a singular selector.');
  expect('page' in configurationProperties, 'Project configurations should expose runtime paging.');
  const cacheOverview = tools.find((tool) => tool.name === 'aurelia_analysis_cache_overview');
  const cacheProperties = cacheOverview?.inputSchema?.properties ?? {};
  expect('workspace' in cacheProperties, 'Cache overview should expose one exact nested semantic workspace selector.');
  expect(!('workspaceRoot' in cacheProperties) && !('projectRootHints' in cacheProperties), 'Cache overview should not expose a partial top-level workspace selector.');
  const appQueryCatalog = tools.find((tool) => tool.name === 'aurelia_app_query_catalog');
  expect(!('workspaceRoot' in (appQueryCatalog?.inputSchema?.properties ?? {})), 'Static app-query catalog should not open or label a workspace session.');
  expect(!('telemetry' in workspaceProperties), 'Ordinary MCP app queries should not expose runtime profiling controls.');
}

async function verifyNativeProjectConfigurations() {
  const all = await callTool('aurelia_project_configurations', {
    workspaceRoot: projectConfigurationFixtureRoot,
  });
  const allAnswer = all.result?.structuredContent?.value;
  const rows = allAnswer?.value?.rows;
  expect(allAnswer?.result === 'answered', 'Native project configurations should return an answered semantic-runtime result.');
  expect(Array.isArray(rows) && rows.length === 1, 'Omitted sourceFilePaths should select the fixture native configuration.');
  expect(path.resolve(rows[0]?.filePath ?? '') === path.resolve(projectConfigurationFixtureRoot, 'aurelia.project.json'), 'Native project configurations should preserve the exact runtime-owned config path.');
  expect(rows[0]?.appliedExcludedSourceRootDirs?.some((rootDir) => path.basename(rootDir) === 'golden'), 'Native project configurations should pass through the runtime-owned applied exclusion.');
  expect(rows[0]?.diagnosticCount === 0, 'Native project configurations should pass through the runtime-owned diagnostic count.');

  const exact = await callTool('aurelia_project_configurations', {
    workspaceRoot: projectConfigurationFixtureRoot,
    projectKey: rows[0]?.projectKey,
    sourceFilePaths: ['aurelia.project.json'],
    page: { size: 1_000 },
  });
  expect(exact.result?.structuredContent?.value?.value?.rows?.length === 1, 'Exact project/path selectors should preserve the matching native configuration.');
  expect(exact.result?.structuredContent?.value?.page?.size === 200, 'Project configuration paging should honor the MCP transport clamp.');

  const none = await callTool('aurelia_project_configurations', {
    workspaceRoot: projectConfigurationFixtureRoot,
    sourceFilePaths: [],
  });
  expect(none.result?.structuredContent?.value?.value?.rows?.length === 0, 'An explicit empty sourceFilePaths list should select no configurations.');

  const diagnostics = await callTool('aurelia_project_configurations', {
    workspaceRoot: projectConfigurationDiagnosticsFixtureRoot,
    view: 'diagnostics',
    sourceFilePaths: ['aurelia.project.json'],
    page: { size: 10 },
  });
  const diagnosticAnswer = diagnostics.result?.structuredContent?.value;
  const diagnosticRows = diagnosticAnswer?.value?.rows;
  expect(diagnosticAnswer?.result === 'answered', 'Native configuration diagnostics should remain app-world-free in a config-only workspace.');
  expect(diagnosticRows?.length === 1, 'Diagnostic view should expose the exact native configuration diagnostic row rather than only its count.');
  expect(diagnosticRows?.[0]?.diagnosticKind === 'aurelia-project-config-unknown-property', 'Diagnostic view should preserve semantic-runtime diagnostic vocabulary.');
  expect(diagnosticRows?.[0]?.message?.includes("property 'unexpected'"), 'Diagnostic view should preserve the actionable semantic-runtime message.');
  expect(path.resolve(diagnosticRows?.[0]?.source?.filePath ?? '') === path.resolve(projectConfigurationDiagnosticsFixtureRoot, 'aurelia.project.json'), 'Diagnostic view should preserve the exact config source path.');
  expect(typeof diagnosticRows?.[0]?.source?.start === 'number' && diagnosticRows[0].source.end > diagnosticRows[0].source.start, 'Diagnostic view should preserve the exact repair span.');
  expect(resultText(diagnostics).includes('aurelia-project-config-unknown-property'), 'Diagnostic text preview should make the exact diagnostic kind visible without inspecting raw JSON.');
  expect(!resultText(diagnostics).includes("property 'unexpected'.."), 'Diagnostic text preview should not duplicate terminal punctuation from runtime-owned messages.');

  const noDiagnostics = await callTool('aurelia_project_configurations', {
    workspaceRoot: projectConfigurationDiagnosticsFixtureRoot,
    view: 'diagnostics',
    sourceFilePaths: [],
  });
  expect(noDiagnostics.result?.structuredContent?.value?.value?.rows?.length === 0, 'Diagnostic view should preserve explicit empty path selection.');
}

async function verifyPatternFollowUpHints() {
  const fullMenu = await callTool('aurelia_pattern_menu', {});
  const fullMenuText = resultText(fullMenu);
  const fullMenuItems = structuredToolValue(fullMenu)?.items;
  expect(fullMenuText.includes('Pattern menu returned'), 'Pattern menu text should summarize returned pattern rows.');
  expect(fullMenuText.includes('component.local-collection'), 'Pattern menu text should name representative pattern ids.');
  expect(
    Array.isArray(fullMenuItems) && fullMenuItems.length === expectedPatternCatalogCount,
    `Pattern menu should expose the guarded ${expectedPatternCatalogCount}-pattern catalog.`,
  );
  expect(
    Buffer.byteLength(JSON.stringify(fullMenuItems), 'utf8') < 20_000,
    'Pattern menu should remain compact enough for a first-choice MCP lookup.',
  );
  expect(
    fullMenuItems.every((item) => {
      const keys = Object.keys(item).sort();
      return keys.join(',') === 'patternId,summary,title';
    }),
    'Pattern menu rows should stay compact: patternId, title, summary.',
  );

  const response = await callTool('aurelia_pattern_example', {
    patternId: 'router.route-parameters',
  });
  const exampleText = resultText(response);
  const value = structuredToolValue(response);
  const followUp = value?.support?.followUp;
  expect(exampleText.includes('Pattern router.route-parameters'), 'Pattern example text should name the fetched pattern.');
  expect(exampleText.includes('Follow-up:'), 'Pattern example text should summarize follow-up hints.');
  expect(Array.isArray(followUp) && followUp.length > 0, 'Pattern examples should return semantic-runtime follow-up hints.');
  expect(followUp.length <= 3, 'Pattern follow-up hints should stay compact.');
  expect(followUp.some((row) => row.tool === 'aurelia_router_overview'), 'Router patterns should point to router overview.');
  expect(followUp.some((row) => row.tool === 'aurelia_diagnostic_overview'), 'Pattern follow-up hints should include diagnostic overview when useful.');
  expect(
    followUp.some((row) => row.tool === 'aurelia_app_query' && row.queryKind === 'typescript-diagnostic-summary'),
    'Router patterns should include a compact TypeScript diagnostic follow-up.',
  );
  expect(JSON.stringify(value).includes('aurelia_app_builder') === false, 'Pattern follow-up hints should not reference retired app-builder tools.');

  for (const sentinel of patternReleaseSentinels) {
    const menu = await callTool('aurelia_pattern_menu', {
      query: sentinel.query,
    });
    const menuItems = structuredToolValue(menu)?.items;
    expect(
      Array.isArray(menuItems) && menuItems.some((item) => item.patternId === sentinel.patternId),
      `Pattern menu query "${sentinel.query}" should find ${sentinel.patternId}.`,
    );

    const latestResponse = await callTool('aurelia_pattern_example', {
      patternId: sentinel.patternId,
    });
    const latestValue = structuredToolValue(latestResponse);
    expect(latestValue?.patternId === sentinel.patternId, `Pattern example should return ${sentinel.patternId}.`);
    expectLatestPatternSupport(latestValue, sentinel);
  }
}

async function verifyBundledDocsTools() {
  const docsIndex = await call('resources/read', { uri: 'aurelia://docs/index' });
  const docsIndexText = docsIndex.result?.contents?.[0]?.text;
  const docsIndexValue = typeof docsIndexText === 'string' ? JSON.parse(docsIndexText) : undefined;
  expect(docsIndexValue?.tools?.includes('aurelia_docs_search'), 'Docs index resource should point to docs search.');
  expect(docsIndexValue?.tools?.includes('aurelia_docs_fetch'), 'Docs index resource should point to docs fetch.');
  expect(docsIndexValue?.markdownDocumentCount >= 600, 'Docs index resource should summarize the bundled docs corpus.');

  const search = await callTool('aurelia_docs_search', {
    query: 'route parameters loading',
    page: { size: 5 },
  });
  const searchValue = structuredToolValue(search);
  expect(Array.isArray(searchValue?.items) && searchValue.items.length > 0, 'Docs search should return compact docs rows.');
  expect(searchValue.items.some((item) => item.documentPath === 'router/route-parameters.md'), 'Docs search should find router route parameters.');
  expect(searchValue.items.every((item) => !item.documentPath.startsWith('router-direct/')), 'Docs search should permanently exclude router-direct rows.');
  expect(resultText(search).includes('Docs results for'), 'Docs search text preview should summarize returned docs rows.');

  const first = searchValue.items[0];
  const fetched = await callTool('aurelia_docs_fetch', {
    documentPath: first.documentPath,
    sectionAnchor: first.sectionAnchor,
    maxChars: 4000,
  });
  const fetchedValue = structuredToolValue(fetched);
  expect(fetchedValue?.documentPath === first.documentPath, 'Docs fetch should return the requested document path.');
  expect(Array.isArray(fetchedValue?.sections) && fetchedValue.sections.length >= 1, 'Docs fetch should return bounded section payloads.');
  expect(Array.isArray(fetchedValue?.availableSections) && fetchedValue.availableSections.length >= 1, 'Docs fetch should include available section summaries.');
  expect(resultText(fetched).includes('Fetched'), 'Docs fetch text preview should summarize fetched content.');

  const excluded = await callTool('aurelia_docs_fetch', {
    documentPath: 'router-direct/getting-started.md',
  });
  const excludedValue = structuredToolValue(excluded);
  expect(excludedValue?.cautions?.some((entry) => entry.includes('permanently excluded')), 'Explicit router-direct fetch should carry a permanent-exclusion caution.');
}

async function verifyStrictTopLevelEnvelope() {
  const response = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'source-files',
    pageSize: 3,
  });
  const text = resultText(response);
  expect(response.result?.isError === true, 'Unknown top-level app-query keys should fail SDK input validation.');
  expect(text.includes('pageSize'), 'Strict-envelope validation should name the unknown top-level key.');
}

async function verifyStrictCuratedSelectors() {
  const cursorInfo = await callTool('aurelia_template_cursor_info', {
    workspaceRoot: fixtureRoot,
    cursor: { filePath: 'src/app.html', line: 0, character: 0 },
    page: { size: 1 },
  });
  expect(cursorInfo.result?.isError === true, 'Template cursor info should reject unsupported page input at its curated schema boundary.');
  expect(resultText(cursorInfo).includes('page'), 'Template cursor page rejection should name the unsupported selector.');

  const openSeams = await callTool('aurelia_open_seam_overview', {
    workspaceRoot: openSeamSitesFixtureRoot,
    detail: 'handles',
  });
  expect(openSeams.result?.isError === true, 'Open-seam overview should reject unsupported detail input at its curated schema boundary.');
  expect(resultText(openSeams).includes('detail'), 'Open-seam detail rejection should name the unsupported selector.');
}

async function verifyPageClampAndTextPreview() {
  const response = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'binding-observed-dependencies',
    page: { size: 100000 },
  });
  const page = response.result?.structuredContent?.value?.page;
  expect(page?.size === 200, 'Oversized pages should be clamped to 200 rows.');
  expect(page?.requestedSize === 100000, 'Clamped pages should retain the caller-requested size.');
  expect(page?.clamped === true, 'Clamped pages should report clamped=true.');
  expect(page?.byteClamped === true, 'Dense row families should stop before 200 rows when the public row payload budget is reached.');
  expect(page?.returnedRows < 200, 'Dense row payload budget should reduce returnedRows below the row-count clamp.');
  expect(typeof page?.nextCursor === 'string', 'Byte-clamped dense row pages should still provide a next cursor.');
  expect(page?.estimatedRowsJsonBytes <= page?.maxRowsJsonBytes, 'Byte-clamped page should report an estimated row payload within the public budget.');
  const text = resultText(response);
  expect(text.includes('Clamped requested size 100000 to max 200'), 'Text content should mention page-size clamping.');
  expect(text.includes('Row payload target stopped this page'), 'Text content should mention byte-target pagination.');
  expect(text.includes('Rows:'), 'Text content should include a bounded row preview for row answers.');
}

async function verifyObservedDependencyLocus() {
  const first = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'binding-observed-dependencies',
    page: { size: 1 },
  });
  const firstRow = first.result?.structuredContent?.value?.value?.rows?.[0];
  expect(typeof firstRow?.rowKey === 'string', 'Observed-dependency rows should expose an answer-local row key.');
  if (typeof firstRow?.rowKey !== 'string') {
    return;
  }
  const selected = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'binding-observed-dependencies',
    observedDependencyLocus: {
      kind: 'row',
      rowKey: firstRow.rowKey,
    },
    page: { size: 10 },
  });
  const selectedRows = selected.result?.structuredContent?.value?.value?.rows;
  expect(
    Array.isArray(selectedRows)
      && selectedRows.length === 1
      && selectedRows[0]?.rowKey === firstRow.rowKey,
    'MCP should preserve an observed-dependency row locus through strict schema validation and adapter projection.',
  );
}

async function verifyWorkspaceOverviewContinuations() {
  const response = await callTool('aurelia_workspace_overview', {
    workspaceRoot: fixtureRoot,
  });
  const answer = response.result?.structuredContent?.value;
  expect(Array.isArray(answer?.continuations), 'Workspace overview should expose structured continuations.');
  expect(answer.continuations.some((row) => row.targetQueryKind === 'app-overview'), 'Workspace overview continuations should include app-overview.');
  expect(answer.continuations.some((row) => row.targetQueryKind === 'app-diagnostic-summary'), 'Workspace overview continuations should include diagnostic summary.');
}

async function verifyAnalysisDepthEnvelope() {
  const response = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'binding-data-flow-summary',
    page: { size: 0 },
  });
  const answer = response.result?.structuredContent?.value;
  expect(answer?.analysisDepth === 'binding-observation', `Binding data-flow summary should report binding-observation analysisDepth, observed ${answer?.analysisDepth}.`);
  expect(resultText(response).includes('Analysis depth used: binding-observation'), 'Text preview should expose answer analysis depth.');
}

async function verifyProfileDrivenRetention() {
  const automatic = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'resource-definitions',
    detail: 'handles',
    page: { size: 1 },
  });
  expect(automatic.result?.isError !== true, 'Omitted appRetention should let semantic-runtime select retention for handle-bearing answers.');
  expect(automatic.result?.structuredContent?.value?.result === 'answered', 'Profile-retained handle detail should return an answered semantic result.');

  const automaticBatch = await callTool('aurelia_app_query_batch', {
    workspaceRoot: fixtureRoot,
    queries: [{
      kind: 'resource-definitions',
      detail: 'handles',
      page: { size: 1 },
    }],
  });
  expect(automaticBatch.result?.isError !== true, 'Omitted batch appRetention should also let semantic-runtime select retention for handle-bearing answers.');
  expect(automaticBatch.result?.structuredContent?.value?.result === 'answered', 'Profile-retained handle detail should answer through the batch adapter path.');

  const incompatible = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'resource-definitions',
    detail: 'handles',
    appRetention: 'dispose-app',
    page: { size: 1 },
  });
  expect(incompatible.result?.isError === true, 'Explicit dispose-app should remain incompatible with handle-bearing answers.');
  expect(resultText(incompatible).includes("detail='handles'"), 'Explicit retention incompatibility should explain the handle-detail constraint.');
}

async function verifySourceFilePathUnsupportedPreflight() {
  const response = await callTool('aurelia_app_overview', {
    workspaceRoot: fixtureRoot,
    sourceFilePath: 'src/app.ts',
  });
  const answer = response.result?.structuredContent?.value;
  expect(answer?.result === 'unsupported', 'sourceFilePath on an unsupported query family should return result=unsupported.');
  expect(answer?.value?.unsupportedFields?.includes('sourceFile'), 'Unsupported sourceFilePath should be normalized into the runtime sourceFile selector preflight.');
  expect(resultText(response).includes('does not support sourceFile'), 'Unsupported sourceFilePath text should explain that the query cannot honor file scoping.');
}

async function verifyAnalysisCacheClearVocabulary() {
  await callTool('aurelia_app_overview', {
    workspaceRoot: fixtureRoot,
    appRetention: 'retain-app',
  });
  const overviewBefore = await callTool('aurelia_analysis_cache_overview', {
    workspace: { workspaceRoot: fixtureRoot },
  });
  const beforeValue = overviewBefore.result?.structuredContent?.value;
  const beforeSession = beforeValue?.sessions?.find((session) => session.workspaceDescriptor?.workspaceRoot === fixtureRoot);
  expect(beforeSession?.analysisCache?.value?.cachedAppCount >= 1, 'Retained app overview should create at least one cached app epoch for cache-clear testing.');

  const cleared = await callTool('aurelia_clear_analysis_cache', {
    workspace: { workspaceRoot: fixtureRoot },
  });
  const clearValue = cleared.result?.structuredContent?.value;
  expect(clearValue?.remainingCachedApps === 0, 'Cache clear should report zero remaining app epochs for the selected fixture session.');
  expect(typeof clearValue?.retainedWorkspaceKernelRecords === 'number', 'Cache clear should expose retained workspace kernel records explicitly.');
  const clearText = resultText(cleared);
  expect(clearText.includes('app-epoch kernel record'), 'Cache-clear text should distinguish app-epoch kernel disposal from session kernel retention.');
  expect(clearText.includes('boot/source-discovery'), 'Cache-clear text should explain retained workspace-kernel records.');
  expect(clearText.includes('preserve policy keeps warm TypeScript dependency/lib source files'), 'Cache-clear text should explain the default dependency cache policy.');

  const overviewAfter = await callTool('aurelia_analysis_cache_overview', {
    workspace: { workspaceRoot: fixtureRoot },
  });
  const afterValue = overviewAfter.result?.structuredContent?.value;
  const afterSession = afterValue?.sessions?.find((session) => session.workspaceDescriptor?.workspaceRoot === fixtureRoot);
  expect(afterSession?.analysisCache?.value?.cachedAppCount === 0, 'Analysis-cache overview should agree that selected app epochs were cleared.');
}

async function verifyCacheWorkspaceDescriptorIdentity() {
  const invalidSelector = await callTool('aurelia_analysis_cache_overview', {
    workspace: { projectRootHints: [fixtureRoot] },
  });
  expect(invalidSelector.result?.isError === true, 'A cache boundary selector without workspaceRoot should be rejected rather than interpreted against process cwd.');

  await callTool('aurelia_app_overview', {
    workspaceRoot: fixtureRoot,
    appRetention: 'retain-app',
  });
  const hintedApp = await callTool('aurelia_app_overview', {
    workspaceRoot: fixtureRoot,
    projectRootHints: [fixtureRoot],
    appRetention: 'retain-app',
  });
  const hintedAppDescriptor = hintedApp.result?.structuredContent?.workspaceDescriptor;
  expect(hintedAppDescriptor?.workspaceRoot === fixtureRoot, 'Workspace-scoped responses should return the exact normalized shared descriptor.');
  expect(hintedAppDescriptor?.projectTopology?.kind === 'discover', 'Ordinary MCP responses should identify shared discovery topology.');
  expect(hintedAppDescriptor?.projectTopology?.projectRootHints?.length === 1, 'Workspace responses should preserve root hints so callers can reuse the exact source-world boundary.');

  const allBeforeCatalog = await callTool('aurelia_analysis_cache_overview', {});
  const beforeCatalogValue = allBeforeCatalog.result?.structuredContent?.value;
  const catalog = await callTool('aurelia_app_query_catalog', { group: 'template' });
  expect(catalog.result?.isError !== true, 'Static app-query catalog should answer without a workspace session.');
  expect(catalog.result?.structuredContent?.workspaceRoot == null, 'Static app-query catalog should not claim a workspace label.');
  expect(catalog.result?.structuredContent?.workspaceDescriptor == null, 'Static app-query catalog should not claim a semantic workspace descriptor.');
  const allAfterCatalog = await callTool('aurelia_analysis_cache_overview', {});
  expect(
    allAfterCatalog.result?.structuredContent?.value?.totalSessions === beforeCatalogValue?.totalSessions,
    'Static app-query catalog should not create a hidden default-descriptor runtime session.',
  );

  const defaultOverview = await callTool('aurelia_analysis_cache_overview', {
    workspace: { workspaceRoot: fixtureRoot },
  });
  const defaultValue = defaultOverview.result?.structuredContent?.value;
  expect(defaultOverview.result?.structuredContent?.workspaceDescriptor?.projectTopology?.projectRootHints?.length === 0, 'Exact cache selectors should return their shared descriptor at the response boundary.');
  expect(defaultValue?.matchingSessions === 1, 'Default cache selector should identify one exact semantic workspace descriptor.');
  expect(defaultValue?.sessions?.[0]?.workspaceDescriptor?.projectTopology?.projectRootHints?.length === 0, 'Default cache session summary should expose its empty hint set through the shared descriptor.');

  const hintedOverview = await callTool('aurelia_analysis_cache_overview', {
    workspace: { workspaceRoot: fixtureRoot, projectRootHints: [fixtureRoot] },
  });
  const hintedValue = hintedOverview.result?.structuredContent?.value;
  expect(hintedValue?.matchingSessions === 1, 'Hinted cache selector should identify one exact semantic workspace descriptor.');
  expect(hintedValue?.sessions?.[0]?.workspaceDescriptor?.projectTopology?.projectRootHints?.length === 1, 'Hinted cache session summary should preserve its shared root-hint fact.');

  await callTool('aurelia_clear_analysis_cache', {
    workspace: { workspaceRoot: fixtureRoot },
  });
  const hintedAfterDefaultClear = await callTool('aurelia_analysis_cache_overview', {
    workspace: { workspaceRoot: fixtureRoot, projectRootHints: [fixtureRoot] },
  });
  expect(
    hintedAfterDefaultClear.result?.structuredContent?.value?.sessions?.[0]?.analysisCache?.value?.cachedAppCount >= 1,
    'Clearing one descriptor must not cross-clear a session whose shared root-hint boundary differs.',
  );
}

async function verifyDiagnosticTextPreviewIdentity() {
  const response = await callTool('aurelia_app_query', {
    workspaceRoot: typescriptDiagnosticsFixtureRoot,
    queryKind: 'typescript-diagnostics',
    page: { size: 3 },
  });
  const text = resultText(response);
  expect(text.includes('typescript-project-diagnostics-state.ts@49..56'), 'Diagnostic row previews should preserve source filename and span in text.');
  expect(text.includes('Type \'number\' is not assignable to type \'string\'.'), 'Diagnostic row previews should include actionable message text.');
}

async function verifyOpenSeamSitesPreview() {
  const response = await callTool('aurelia_open_seam_overview', {
    workspaceRoot: openSeamSitesFixtureRoot,
    sourceFilePath: 'src/app.ts',
    openSeamKindKey: 'evaluation.unresolved-identifier',
    page: { size: 10 },
  });
  const value = response.result?.structuredContent?.value?.value;
  expect(value?.totalOpenSeamSites === 2, 'Open-seam overview should report unique authored seam sites, not only raw rows.');
  expect(value?.totalOpenSeamRows === 6, 'Open-seam overview should preserve the raw derivation row count.');
  const text = resultText(response);
  expect(text.includes('unique authored site(s)'), 'Open-seam overview text should explain site-level grouping.');
  expect(text.includes('raw=3'), 'Open-seam overview text should show raw rows covered by each site.');
  expect(text.includes('src/app.ts:4:48') && text.includes('src/app.ts:5:48'), 'Open-seam overview text should include authored line/column samples.');
  expect(!text.includes('\0'), 'Open-seam row preview should not leak opaque NUL-delimited keys.');
}

async function verifyCursorVocabulary() {
  const first = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'source-files',
    page: { size: 3 },
  });
  const nextCursor = first.result?.structuredContent?.value?.page?.nextCursor;
  expect(typeof nextCursor === 'string' && nextCursor.length > 0, 'Row pages should expose an opaque continuation cursor.');
  const second = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'source-files',
    page: { size: 3, cursor: nextCursor },
  });
  expect(second.result?.structuredContent?.value?.page?.cursor === nextCursor, 'Next-page calls should echo the opaque cursor they consumed.');
  const legacy = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'source-files',
    page: { size: 3, cursor: 'offset:2' },
  });
  const legacyAnswer = legacy.result?.structuredContent?.value;
  expect(legacyAnswer?.result === 'invalid', 'Legacy offset cursors should be rejected instead of being replayed against an unscoped result.');
  expect(legacyAnswer?.page?.cursorProblem?.kind === 'malformed', 'Legacy offset rejection should expose a structured cursor problem.');
}

async function verifyMissingWorkspaceRoot() {
  const response = await callTool('aurelia_workspace_overview', {
    workspaceRoot: path.join(repoRoot, '.temp/no-such-mcp-contract-root'),
  });
  expect(response.result?.isError === true, 'Missing workspace roots should fail instead of returning a healthy non-Aurelia project.');
  expect(resultText(response).includes('does not exist or is not a directory'), 'Missing-root errors should name the filesystem problem.');
}

async function verifyInvalidProjectKeyRemedy() {
  const response = await callTool('aurelia_app_overview', {
    workspaceRoot: fixtureRoot,
    projectKey: 'nope-not-here',
  });
  const text = resultText(response);
  expect(response.result?.isError === true, 'Invalid projectKey should fail.');
  expect(text.includes('Valid projectKey values:'), 'Invalid projectKey errors should list valid project keys.');
}

async function verifyInvalidQueryKindRemedy() {
  const response = await callTool('aurelia_app_query_batch', {
    workspaceRoot: fixtureRoot,
    queries: [{ kind: 'not-a-query' }],
  });
  const text = resultText(response);
  expect(response.result?.isError === true, 'Invalid batch child query kind should fail.');
  expect(text.includes('Use the app-query catalog'), 'Invalid query-kind errors should point callers to the catalog.');
}

async function verifyCursorOutOfRangeRemedy() {
  const response = await callTool('aurelia_template_cursor_info', {
    workspaceRoot: fixtureRoot,
    cursor: { filePath: 'src/app.html', line: 9999, character: 0 },
  });
  const value = response.result?.structuredContent?.value?.value;
  expect(value?.missingInputs?.includes('source-line'), 'Out-of-range cursor lines should report source-line as the missing input.');
  expect(resultText(response).includes('line 9999 is outside'), 'Out-of-range cursor lines should name the invalid line.');
}

async function verifyDirectAdapterSourceFileGuard() {
  const adapter = new AureliaMcpSemanticRuntimeAdapter();
  try {
    await adapter.templateDiagnostics({
      workspaceRoot: fixtureRoot,
      sourceFile: 'src/app.html',
    }, projectDetachedAureliaMcpResponse);
  } catch (error) {
    expect(error instanceof Error, 'Direct adapter sourceFile guard should throw an Error.');
    expect(error.message.includes('sourceFile must be an object'), 'Direct adapter sourceFile guard should explain the expected object shape.');
    return;
  } finally {
    await adapter.dispose();
  }
  throw new Error('Direct adapter accepted a string sourceFile unexpectedly.');
}

function callTool(name, args) {
  return call('tools/call', {
    name,
    arguments: args,
  });
}

function call(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params,
  }) + '\n');
  return new Promise((resolve) => {
    pending.set(id, resolve);
  });
}

function resultText(response) {
  return response.result?.content?.find((entry) => entry.type === 'text')?.text ?? '';
}

function structuredToolValue(response) {
  return response.result?.structuredContent?.value?.value ?? response.result?.structuredContent?.value ?? null;
}

function containsLocalPathOrScratchReference(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const lower = value.toLowerCase();
  return lower.includes('.temp') || /[a-z]:[\\/]/i.test(value);
}

function expectLatestPatternSupport(value, sentinel) {
  const followUp = value?.support?.followUp;
  expect(Array.isArray(followUp) && followUp.length > 0, `${sentinel.patternId} should return support.followUp hints.`);
  expect(followUp.length <= 3, `${sentinel.patternId} support.followUp should stay compact.`);
  for (const tool of sentinel.followUpTools) {
    expect(followUp.some((row) => row.tool === tool), `${sentinel.patternId} should return ${tool} follow-up.`);
  }
  for (const queryKind of sentinel.followUpQueryKinds ?? []) {
    expect(
      followUp.some((row) => row.tool === 'aurelia_app_query' && row.queryKind === queryKind),
      `${sentinel.patternId} should return ${queryKind} follow-up.`,
    );
  }

  const refs = value?.support?.refs ?? [];
  const refUrls = refs.map((ref) => ref.url);
  for (const docsRef of sentinel.docsRefs) {
    expect(refUrls.some((url) => url.includes(docsRef)), `${sentinel.patternId} should return docs ref ${docsRef}.`);
  }
  expect(JSON.stringify(value).includes('aurelia_app_builder') === false, `${sentinel.patternId} should avoid retired app-builder vocabulary.`);
}

function missingDescriptions(schema, path) {
  if (schema == null || typeof schema !== 'object') {
    return [];
  }
  const missing = [];
  visitJsonSchema(schema, path, missing);
  return missing;
}

function visitJsonSchema(schema, path, missing) {
  if (schema == null || typeof schema !== 'object') {
    return;
  }
  if (schema.properties != null && typeof schema.properties === 'object') {
    for (const [key, child] of Object.entries(schema.properties)) {
      const childPath = `${path}.${key}`;
      if (child == null || typeof child !== 'object' || typeof child.description !== 'string' || child.description.length === 0) {
        missing.push(childPath);
      }
      visitJsonSchema(child, childPath, missing);
    }
  }
  for (const key of ['items', 'additionalProperties']) {
    const child = schema[key];
    if (child != null && typeof child === 'object') {
      visitJsonSchema(child, `${path}.${key}`, missing);
    }
  }
  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    const entries = schema[key];
    if (Array.isArray(entries)) {
      entries.forEach((entry, index) => visitJsonSchema(entry, `${path}.${key}[${index}]`, missing));
    }
  }
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
