import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AureliaMcpSemanticRuntimeAdapter } from '../out/runtime-adapter.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const serverPath = path.join(repoRoot, 'packages/mcp/out/server.js');
const fixtureRoot = path.join(repoRoot, 'packages/semantic-runtime/fixtures/pressure/app-pattern-state-backed-form');

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
  await initialize();
  await verifyToolSurfaceBudget();
  await verifyStrictTopLevelEnvelope();
  await verifyPageClampAndTextPreview();
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
  await call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'adversarial-contract', version: '0' },
  });
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {},
  }) + '\n');
}

async function verifyToolSurfaceBudget() {
  const response = await call('tools/list', {});
  const text = JSON.stringify(response.result);
  expect(Buffer.byteLength(text, 'utf8') < 45_000, 'tools/list should stay below the current compact-schema budget.');
  expect(response.result?.tools?.length === 16, 'tools/list should advertise the expected public tool count.');
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
  const text = resultText(response);
  expect(text.includes('Clamped requested size 100000 to max 200'), 'Text content should mention page-size clamping.');
  expect(text.includes('Rows:'), 'Text content should include a bounded row preview for row answers.');
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

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
