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
  queryKind: 'open-seams',
  page: { size: 1 },
});

expect(single.tool === 'aurelia_app_query', 'single app-query should report the public MCP tool name.');
expectContinuation(
  single.value,
  'open-seam-summary',
  'single app-query should pass semantic-runtime continuation rows through unchanged.',
  { sourceRequirement: 'not-required' },
);
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
        evidence: {
          sourceRequirement: 'not-required',
          sourceFacts: [],
          epochDependencies: ['project-input', 'app-world'],
        },
        blockers: [],
      },
      {
        kind: 'follow-query',
        rationale: 'Group open seams before choosing a narrower follow-up.',
        targetQueryKind: 'open-seam-summary',
        targetQuery: { kind: 'open-seam-summary', page: { size: 1 } },
        intents: ['orient', 'inspect'],
        cost: 'free',
        evidence: {
          sourceRequirement: 'exact-authored-span',
          epochDependencies: ['project-input', 'app-world', 'source-input'],
          sourceFacts: [
            {
              source: {
                kind: 'source-span-address',
                label: 'src/route-link.html@66..79',
                path: 'src/route-link.html',
                start: 66,
                end: 79,
              },
              facets: ['authored-source', 'carrier-span', 'exact-authored-span'],
              count: 1,
            },
          ],
        },
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
expect(
  syntheticNextPageFirstText.includes('source: exact-authored-span'),
  'MCP compact continuation text should expose the continuation source requirement.',
);
expect(
  syntheticNextPageFirstText.includes('[authored-source+carrier-span+exact-authored-span]'),
  'MCP compact continuation text should preserve mixed source facets on one fact.',
);

const ordinaryAnswerText = aureliaMcpResultText({
  tool: 'aurelia_app_query',
  value: {
    summary: 'Ordinary answer state probe.',
    result: 'answered',
    selection: 'exact',
    coverage: 'complete',
  },
});
expect(
  !ordinaryAnswerText.includes('Answer state:'),
  'MCP compact text should omit the ordinary answered/exact/complete state.',
);

const unsupportedAnswerText = aureliaMcpResultText({
  tool: 'aurelia_app_query',
  value: {
    summary: 'Unsupported answer state probe.',
    result: 'unsupported',
    selection: 'not-applicable',
    coverage: 'not-applicable',
  },
});
expect(
  unsupportedAnswerText.includes('Answer state: result=unsupported; coverage=not-applicable.'),
  'MCP compact text should expose exceptional result and coverage states.',
);
expect(
  !unsupportedAnswerText.includes('selection=not-applicable'),
  'MCP compact text should keep ordinary not-applicable selection compact.',
);

const openAmbiguousAnswerText = aureliaMcpResultText({
  tool: 'aurelia_app_query',
  value: {
    summary: 'Open ambiguous answer state probe.',
    result: 'answered',
    selection: 'ambiguous',
    coverage: 'open',
  },
});
expect(
  openAmbiguousAnswerText.includes('Answer state: selection=ambiguous; coverage=open.'),
  'MCP compact text should expose exceptional selection and semantic coverage without repeating result=answered.',
);

const diagnosticFiltered = await adapter.appQuery({
  workspaceRoot: fixtureRoot,
  queryKind: 'app-diagnostic-summary',
  page: { size: 50 },
  continuationIntents: ['diagnose'],
});

expectContinuation(
  diagnosticFiltered.value,
  'template-diagnostics',
  'diagnostic app-query should pass continuation evidence through unchanged.',
  {
    sourceRequirement: 'exact-authored-span',
    sourceFacets: ['authored-source', 'carrier-span', 'exact-authored-span'],
  },
);
expect(
  (diagnosticFiltered.value.continuations ?? []).every((row) =>
    row.intents.length === 0 || row.intents.includes('diagnose')
  ),
  'single app-query should let MCP callers filter continuation rows by next-move intent.',
);

const curatedFiltered = await adapter.appOverview({
  workspaceRoot: fixtureRoot,
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
  continuationIntents: ['inspect'],
  queries: [
    { kind: 'summary' },
    { kind: 'open-seams', page: { size: 1 } },
  ],
});

const openSeamChild = batch.value.value?.rows?.find((row) => row.queryKind === 'open-seams')?.answer;
expectContinuation(
  openSeamChild,
  'open-seam-summary',
  'batch child answer should retain semantic-runtime continuation rows.',
  { sourceRequirement: 'not-required' },
);
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

function expectContinuation(answer, targetQueryKind, message, evidence) {
  const targetContinuations = answer?.continuations?.filter((row) => row.targetQueryKind === targetQueryKind) ?? [];
  const continuation = targetContinuations.find((row) =>
    row.evidence?.sourceRequirement === evidence.sourceRequirement
  ) ?? targetContinuations[0];
  expect(continuation != null, message);
  expect(continuation?.targetQuery?.kind === targetQueryKind, `${message} targetQuery should be followable.`);
  expect(
    continuation?.evidence?.sourceRequirement === evidence.sourceRequirement,
    `${message} should preserve the semantic-runtime source requirement.`,
  );
  expect(
    Array.isArray(continuation?.evidence?.epochDependencies),
    `${message} should preserve semantic-runtime epoch dependencies.`,
  );
  if (evidence.sourceFacets != null) {
    const mixedFacetFact = continuation?.evidence?.sourceFacts?.find((fact) =>
      evidence.sourceFacets.every((facet) => fact.facets.includes(facet))
    );
    expect(
      mixedFacetFact != null,
      `${message} should preserve mixed facets on one semantic-runtime source fact.`,
    );
    expect(
      Number.isInteger(mixedFacetFact?.count) && mixedFacetFact.count > 0,
      `${message} should preserve the semantic-runtime source fact count.`,
    );
  }
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
