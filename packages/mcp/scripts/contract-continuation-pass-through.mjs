import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AureliaMcpSemanticRuntimeAdapter,
  SemanticRuntimeSessionRegistry,
} from '../out/index.js';
import { aureliaMcpResultText } from '../out/result-text.js';

const packageRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'semantic-runtime/fixtures/pressure/router-dynamic-pattern');
const failures = [];

const adapter = new AureliaMcpSemanticRuntimeAdapter(new SemanticRuntimeSessionRegistry());

const single = await adapter.appQuery({
  workspaceRoot: fixtureRoot,
  storeKey: 'mcp-contract-continuation-pass-through-single',
  queryKind: 'open-seams',
  page: { size: 1 },
});

expect(single.tool === 'aurelia_app_query', 'single app-query should report the public MCP tool name.');
expectContinuation(single.value, 'open-seam-summary', 'single app-query should pass semantic-runtime continuation rows through unchanged.');
expect(
  aureliaMcpResultText(single).includes('Continuations: open-seam-summary'),
  'single app-query text should expose compact continuation targets without requiring structured JSON inspection.',
);

const diagnosticFiltered = await adapter.appQuery({
  workspaceRoot: fixtureRoot,
  storeKey: 'mcp-contract-continuation-pass-through-filtered',
  queryKind: 'summary',
  continuationIntents: ['diagnose'],
});

expect(
  (diagnosticFiltered.value.continuations ?? []).every((row) =>
    row.intents.length === 0 || row.intents.includes('diagnose')
  ),
  'single app-query should let MCP callers filter continuation rows by next-move intent.',
);

const curatedFiltered = await adapter.appOverview({
  workspaceRoot: fixtureRoot,
  storeKey: 'mcp-contract-continuation-pass-through-curated',
  continuationIntents: ['diagnose'],
});

expect(
  (curatedFiltered.value.continuations ?? []).length > 0,
  'curated app-query-backed tools should receive semantic-runtime continuation rows.',
);
expect(
  (curatedFiltered.value.continuations ?? []).every((row) =>
    row.intents.length === 0 || row.intents.includes('diagnose')
  ),
  'curated app-query-backed tools should pass top-level continuation intent filters to semantic-runtime.',
);

const batch = await adapter.appQueryBatch({
  workspaceRoot: fixtureRoot,
  storeKey: 'mcp-contract-continuation-pass-through-batch',
  continuationIntents: ['inspect'],
  queries: [
    { kind: 'summary' },
    { kind: 'open-seams', page: { size: 1 } },
  ],
});

const openSeamChild = batch.value.value?.rows?.find((row) => row.queryKind === 'open-seams')?.answer;
expectContinuation(openSeamChild, 'open-seam-summary', 'batch child answer should retain semantic-runtime continuation rows.');
expect(
  (openSeamChild?.continuations ?? []).every((row) =>
    row.intents.length === 0 || row.intents.includes('inspect')
  ),
  'batch-level continuation intent filter should flow into child app-query answers.',
);
expect(
  aureliaMcpResultText(batch).includes('Child continuations:'),
  'batch app-query text should expose bounded child continuation targets without requiring structured JSON inspection.',
);
expect(
  aureliaMcpResultText(batch).includes('open-seams -> open-seam-summary'),
  'batch child continuation text should not let the first child monopolize the compact continuation budget.',
);

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('contract ok: MCP app-query surfaces pass through semantic-runtime continuation rows.');

function expectContinuation(answer, targetQueryKind, message) {
  const continuation = answer?.continuations?.find((row) => row.targetQueryKind === targetQueryKind);
  expect(continuation != null, message);
  expect(continuation?.targetQuery?.kind === targetQueryKind, `${message} targetQuery should be followable.`);
  expect(continuation?.evidence?.sourcePrecision === 'exact-authored-span', `${message} should preserve semantic-runtime evidence metadata.`);
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
