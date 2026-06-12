import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod/v4';

import {
  AureliaMcpSemanticRuntimeAdapter,
  SemanticRuntimeSessionRegistry,
} from '../out/index.js';
import { aureliaMcpResultText } from '../out/result-text.js';
import { appBuilderQueryInputSchema } from '../out/tool-schemas.js';

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

const syntheticNextPageFirstText = aureliaMcpResultText({
  tool: 'aurelia_app_query',
  value: {
    summary: 'Synthetic continuation ordering probe.',
    continuations: [
      {
        kind: 'next-page',
        rationale: 'Continue paging this query with the next cursor.',
        targetQueryKind: 'open-seams',
        targetQuery: { kind: 'open-seams', page: { cursor: 'after:0', size: 1 } },
        intents: ['inspect'],
        cost: 'free',
        evidence: { evidenceState: 'not-required', coverage: 'partial-known-gaps', sourcePrecision: 'not-required' },
        blockers: [],
      },
      {
        kind: 'follow-query',
        rationale: 'Group open seams before choosing a narrower follow-up.',
        targetQueryKind: 'open-seam-summary',
        targetQuery: { kind: 'open-seam-summary', page: { size: 1 } },
        intents: ['orient', 'inspect'],
        cost: 'free',
        evidence: { evidenceState: 'open', coverage: 'partial-known-gaps', sourcePrecision: 'exact-authored-span' },
        blockers: [],
      },
    ],
  },
});
expect(
  syntheticNextPageFirstText.includes('Continuations: open-seam-summary'),
  'MCP compact continuation text should not hide semantic follow-ups behind next-page rows.',
);
expect(
  syntheticNextPageFirstText.indexOf('open-seam-summary') < syntheticNextPageFirstText.indexOf('open-seams'),
  'MCP compact continuation text should order semantic follow-ups before next-page rows.',
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

z.object(appBuilderQueryInputSchema).strict().parse({
  queryKind: 'input-contract-detail',
  inputContractDetail: {
    inputContractIds: ['domain-model'],
    inputFacetIds: ['domain-actions'],
    includePayloadSchemas: true,
    includeSourceLoweringConsumers: true,
  },
});

z.object(appBuilderQueryInputSchema).strict().parse({
  queryKind: 'control-manifest-detail',
  controlManifestDetail: {
    controlManifestIds: ['component-api-manifest'],
    includeEffectContracts: true,
  },
});

z.object(appBuilderQueryInputSchema).strict().parse({
  queryKind: 'source-lowering-preflight',
  sourceLoweringPreflight: {
    targetSelectors: [{
      kind: 'control-pattern',
      id: 'native-text-input',
    }],
  },
});

const selectorPreflight = await adapter.appBuilderQuery({
  queryKind: 'source-lowering-preflight',
  sourceLoweringPreflight: {
    targetSelectors: [{
      kind: 'control-pattern',
      id: 'native-text-input',
    }],
  },
});
expect(
  selectorPreflight.value.value?.rows?.[0]?.targetRef?.domain === 'control',
  'app-builder MCP query should accept compact target selectors and let semantic-runtime derive exact row domains.',
);

const controlManifestDetail = await adapter.appBuilderQuery({
  queryKind: 'control-manifest-detail',
  controlManifestDetail: {
    controlManifestIds: ['component-api-manifest'],
    includeEffectContracts: true,
  },
});
const componentApiManifest = controlManifestDetail.value.value?.rows?.find((row) =>
  row.controlManifest?.id === 'component-api-manifest'
);
expect(
  componentApiManifest?.effectContracts?.some((row) => row.id === 'component-manifest-publication') === true,
  'app-builder MCP query should forward controlManifestDetail and expose direct component-manifest publication effects.',
);
expect(
  aureliaMcpResultText(controlManifestDetail).includes('Continuations:'),
  'app-builder MCP query text should expose compact app-builder continuation targets.',
);

const domainActionDetail = await adapter.appBuilderQuery({
  queryKind: 'input-contract-detail',
  inputContractDetail: {
    inputContractIds: ['domain-model'],
    inputFacetIds: ['domain-actions'],
    includePayloadSchemas: true,
    includeSourceLoweringConsumers: true,
    includeSourceLoweringValueSupport: true,
  },
});
const domainActionFacet = domainActionDetail.value.value?.rows
  ?.flatMap((row) => row.inputFacets ?? [])
  .find((row) => row.facet?.id === 'domain-actions');
expect(
  domainActionFacet?.sourceLoweringConsumerRows?.some((row) =>
    row.targetRef?.id === 'native-button'
  ) === true,
  'app-builder MCP query should accept includeSourceLoweringConsumers and return source-lowering consumers for DomainActions.',
);
expect(
  domainActionFacet?.sourceLoweringValueSupportRows?.some((row) =>
    row.axis === 'domain-action-kind'
    && row.value === 'create'
    && row.supportKind === 'derived-local-typescript-method'
  ) === true,
  'app-builder MCP query should accept includeSourceLoweringValueSupport and return value-level support rows for DomainActions.',
);

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('contract ok: MCP app-query and app-builder surfaces pass through semantic-runtime continuation rows.');

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
