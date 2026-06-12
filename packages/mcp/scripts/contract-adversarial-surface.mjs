import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AureliaMcpSemanticRuntimeAdapter } from '../out/runtime-adapter.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const serverPath = path.join(repoRoot, 'packages/mcp/out/server.js');
const fixtureRoot = path.join(repoRoot, 'packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form');
const openSeamSitesFixtureRoot = path.join(repoRoot, 'packages/semantic-runtime/fixtures/pressure/evaluation-open-seam-sites');
const typescriptDiagnosticsFixtureRoot = path.join(repoRoot, 'packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics');

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
  await verifyStrictTopLevelEnvelope();
  await verifyPageClampAndTextPreview();
  await verifyWorkspaceOverviewContinuations();
  await verifyAnalysisDepthEnvelope();
  await verifySourceFilePathUnsupportedPreflight();
  await verifyAnalysisCacheClearVocabulary();
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
  expect(text.includes('aurelia_app_query_catalog'), 'Orientation resource should teach catalog-first query selection.');
  expect(text.includes('sourceFile') && text.includes('outcome=unsupported'), 'Orientation resource should teach honest source-file selector rejection.');
  expect(!containsLocalPathOrScratchReference(text), 'Orientation resource should stay app-agnostic.');
}

async function verifyToolSurfaceBudget() {
  const response = await call('tools/list', {});
  const text = JSON.stringify(response.result);
  expect(Buffer.byteLength(text, 'utf8') < 80_000, 'tools/list should stay below the described-schema budget.');
  expect(response.result?.tools?.length === 16, 'tools/list should advertise the expected public tool count.');
}

async function verifyToolInputSchemaDescriptions() {
  const response = await call('tools/list', {});
  const tools = response.result?.tools ?? [];
  for (const tool of tools) {
    const missing = missingDescriptions(tool.inputSchema, tool.name);
    expect(missing.length === 0, `Tool ${tool.name} has undescribed input schema field(s): ${missing.join(', ')}`);
  }
  const appQuery = tools.find((tool) => tool.name === 'aurelia_app_query');
  expect(JSON.stringify(appQuery?.inputSchema).includes('Check supportsSourceFile'), 'sourceFile schema description should point callers to supportsSourceFile.');
  expect(JSON.stringify(appQuery?.inputSchema).includes('outcome=unsupported'), 'sourceFilePath schema description should promise honest unsupported answers.');
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
  expect(text.includes('Row payload budget stopped this page'), 'Text content should mention byte-budget pagination.');
  expect(text.includes('Rows:'), 'Text content should include a bounded row preview for row answers.');
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

async function verifySourceFilePathUnsupportedPreflight() {
  const response = await callTool('aurelia_app_overview', {
    workspaceRoot: fixtureRoot,
    sourceFilePath: 'src/app.ts',
  });
  const answer = response.result?.structuredContent?.value;
  expect(answer?.outcome === 'unsupported', 'sourceFilePath on an unsupported query family should return outcome=unsupported.');
  expect(answer?.value?.unsupportedFields?.includes('sourceFile'), 'Unsupported sourceFilePath should be normalized into the runtime sourceFile selector preflight.');
  expect(resultText(response).includes('does not support sourceFile'), 'Unsupported sourceFilePath text should explain that the query cannot honor file scoping.');
}

async function verifyAnalysisCacheClearVocabulary() {
  await callTool('aurelia_app_overview', {
    workspaceRoot: fixtureRoot,
    appRetention: 'retain-app',
  });
  const overviewBefore = await callTool('aurelia_analysis_cache_overview', {
    workspaceRoot: fixtureRoot,
  });
  const beforeValue = overviewBefore.result?.structuredContent?.value;
  const beforeSession = beforeValue?.sessions?.find((session) => session.workspaceRoot === fixtureRoot);
  expect(beforeSession?.analysisCache?.value?.cachedAppCount >= 1, 'Retained app overview should create at least one cached app epoch for cache-clear testing.');

  const cleared = await callTool('aurelia_clear_analysis_cache', {
    workspaceRoot: fixtureRoot,
  });
  const clearValue = cleared.result?.structuredContent?.value;
  expect(clearValue?.remainingCachedApps === 0, 'Cache clear should report zero remaining app epochs for the selected fixture session.');
  expect(typeof clearValue?.retainedWorkspaceKernelRecords === 'number', 'Cache clear should expose retained workspace kernel records explicitly.');
  const clearText = resultText(cleared);
  expect(clearText.includes('app-epoch kernel record'), 'Cache-clear text should distinguish app-epoch kernel disposal from session kernel retention.');
  expect(clearText.includes('boot/source-discovery'), 'Cache-clear text should explain retained workspace-kernel records.');
  expect(clearText.includes('preserve policy keeps warm TypeScript dependency/lib source files'), 'Cache-clear text should explain the default dependency cache policy.');

  const overviewAfter = await callTool('aurelia_analysis_cache_overview', {
    workspaceRoot: fixtureRoot,
  });
  const afterValue = overviewAfter.result?.structuredContent?.value;
  const afterSession = afterValue?.sessions?.find((session) => session.workspaceRoot === fixtureRoot);
  expect(afterSession?.analysisCache?.value?.cachedAppCount === 0, 'Analysis-cache overview should agree that selected app epochs were cleared.');
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
  expect(nextCursor === 'after:2', 'Newly emitted row cursors should use the after:<row-index> vocabulary.');
  const second = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'source-files',
    page: { size: 3, cursor: nextCursor },
  });
  expect(second.result?.structuredContent?.value?.page?.cursor === 'after:2', 'Next-page calls should echo the opaque cursor they consumed.');
  const legacy = await callTool('aurelia_app_query', {
    workspaceRoot: fixtureRoot,
    queryKind: 'source-files',
    page: { size: 3, cursor: 'offset:2' },
  });
  expect(legacy.result?.structuredContent?.value?.page?.returnedRows === 3, 'Legacy offset cursors should remain accepted for compatibility.');
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
    });
  } catch (error) {
    expect(error instanceof Error, 'Direct adapter sourceFile guard should throw an Error.');
    expect(error.message.includes('sourceFile must be an object'), 'Direct adapter sourceFile guard should explain the expected object shape.');
    return;
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

function containsLocalPathOrScratchReference(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const lower = value.toLowerCase();
  return lower.includes('.temp') || /[a-z]:[\\/]/i.test(value);
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
