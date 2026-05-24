import { QueryClaimGraph } from '../out/inquiry/query-claim-graph.js';
import { queryClaimDisposalPolicy } from '../out/inquiry/query-claim-policy.js';

const failures = [];

verifyLazyClaimLifetime();
verifyRetainedAnswerReuseAndVeto();
verifyFailureRetentionAndRetry();
verifyRetainedAnswerByteBudget();
verifyContinuationEnvelopeByteBudget();
verifyRetainedRecordBudgetPreservesActiveParents();
verifyEpochDisposalIndexes();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('contract ok: query-claim graph laziness, reuse, failures, budgets, and indexed disposal stay graph-owned.');

function verifyLazyClaimLifetime() {
  const graph = new QueryClaimGraph('contract-discard', discardAfterAnswerPolicy());
  const claim = graph.claim(queryInput('lazy'), () => hit('lazy answer'));

  let snapshot = graph.snapshot();
  expect(snapshot.pending === 1, 'Lazy claim should be retained as pending before the answer closure runs.');
  expect(snapshot.retainedRecords === 1, 'Discard-after-answer profiles should still retain pending lazy claims.');

  const answer = claim.readAnswer();
  expect(answer.summary === 'lazy answer', 'Lazy claim should materialize the answer on first read.');

  snapshot = graph.snapshot();
  expect(snapshot.retainedRecords === 0, 'Discard-after-answer profile should dispose the claim after materialization.');
  expect(snapshot.disposed === 1, 'Disposed counter should include the materialized discard-after-answer claim.');
}

function verifyRetainedAnswerReuseAndVeto() {
  const graph = new QueryClaimGraph('contract-retain', retainSmallAnswerPolicy());
  let materializations = 0;
  let disposalCalls = 0;
  const boundary = {
    disposeAnswerSideEffects: () => {
      disposalCalls += 1;
      return { queryClaims: 1 };
    },
  };

  const first = graph.answer(queryInput('reuse'), () => {
    materializations += 1;
    return hit('retained answer', { rows: [{ id: 1 }] });
  }, boundary);
  const second = graph.answer(queryInput('reuse'), () => {
    materializations += 1;
    return hit('should not run');
  }, boundary);

  expect(first.summary === second.summary, 'Retained answer reuse should return the original public answer shape.');
  expect(materializations === 1, 'Retained answer reuse should avoid rematerializing the answer closure.');
  expect(disposalCalls === 2, 'Answer-side disposal should run for both original materialization and retained-answer hits.');

  const afterReuse = graph.snapshot();
  expect(afterReuse.retainedAnswerHits === 1, 'Retained-answer hit counter should increment on reuse.');
  expect(afterReuse.disposedQueryClaimRecords === 2, 'Answer-side query-claim disposal should be counted on materialization and reuse.');

  const vetoed = graph.answer(queryInput('reuse'), () => {
    materializations += 1;
    return hit('vetoed answer');
  }, {
    shouldReuseRetainedAnswer: () => false,
  });

  expect(vetoed.summary === 'vetoed answer', 'A boundary reuse veto should force rematerialization.');
  expect(materializations === 2, 'Boundary reuse veto should run the answer closure exactly once more.');
}

function verifyFailureRetentionAndRetry() {
  const graph = new QueryClaimGraph('contract-failure', retainSmallAnswerPolicy());
  let attempts = 0;
  let sideEffectDisposals = 0;
  const input = queryInput('failure-retry');
  const boundary = {
    disposeAnswerSideEffects: () => {
      sideEffectDisposals += 1;
      return { queryClaims: 1 };
    },
  };

  try {
    graph.answer(input, () => {
      attempts += 1;
      throw new Error('planned failure');
    }, boundary);
    failures.push('Failed query claim should rethrow the materialization error.');
  } catch (error) {
    expect(String(error?.message ?? error).includes('planned failure'), 'Failed query claim should preserve the original error message.');
  }

  let snapshot = graph.snapshot();
  expect(attempts === 1, 'Failed query claim should run the answer closure exactly once.');
  expect(snapshot.failed === 1, 'Retained-session graph should count failed query claims.');
  expect(snapshot.retainedRecords === 1, 'Retained-session graph should retain failed claims for telemetry and disposal.');
  expect(snapshot.disposedQueryClaimRecords === 1, 'Answer-side disposal should still be recorded for failed claims.');
  expect(sideEffectDisposals === 1, 'Answer-side disposal should run after a failed materialization.');

  const retry = graph.answer(input, () => {
    attempts += 1;
    return hit('retry answer');
  }, boundary);
  expect(retry.summary === 'retry answer', 'A failed retained claim must not be reused as an answer value.');
  expect(attempts === 2, 'Retry after failure should rematerialize the answer closure.');

  snapshot = graph.snapshot();
  expect(snapshot.failed === 1 && snapshot.answered === 1, 'Retry should leave the failed record visible and add an answered record.');
  expect(snapshot.retainedAnswerHits === 0, 'Retry after failure should not count as retained-answer reuse.');

  const discardGraph = new QueryClaimGraph('contract-failure-discard', discardAfterAnswerPolicy());
  try {
    discardGraph.answer(queryInput('discarded-failure'), () => {
      throw new Error('discarded failure');
    });
    failures.push('Discard-after-answer failed query claim should rethrow the materialization error.');
  } catch {}
  const discardedSnapshot = discardGraph.snapshot();
  expect(discardedSnapshot.failed === 1, 'Discard-after-answer graph should count failed query claims.');
  expect(discardedSnapshot.retainedRecords === 0, 'Discard-after-answer graph should dispose failed claims immediately.');
  expect(discardedSnapshot.disposed === 1, 'Discard-after-answer failed claim should increment disposed records.');
}

function verifyRetainedAnswerByteBudget() {
  const graph = new QueryClaimGraph('contract-byte-budget', retainSmallAnswerPolicy({
    retainedAnswerTotalByteLimit: 180,
  }));

  graph.answer(queryInput('budget-a'), () => hit('budget a', { rows: [{ text: 'a'.repeat(40) }] }));
  graph.answer(queryInput('budget-b'), () => hit('budget b', { rows: [{ text: 'b'.repeat(40) }] }));

  const snapshot = graph.snapshot();
  expect(snapshot.retainedRecords === 2, 'Answer-value byte budget should keep claim records for invalidation.');
  expect(snapshot.retainedAnswerValues < 2, 'Answer-value byte budget should prune old retained public DTO values.');
  expect(snapshot.budgetDisposedAnswerValues > 0, 'Answer-value byte budget pruning should be visible in counters.');
}

function verifyContinuationEnvelopeByteBudget() {
  const graph = new QueryClaimGraph('contract-continuation-byte-budget', retainSmallAnswerPolicy({
    retainedAnswerTotalByteLimit: 260,
  }));

  graph.answer(queryInput('continuation-a'), () => hit('continuation a', {}, {
    continuations: continuationRows('a'.repeat(90)),
  }));
  graph.answer(queryInput('continuation-b'), () => hit('continuation b', {}, {
    continuations: continuationRows('b'.repeat(90)),
  }));

  const snapshot = graph.snapshot();
  expect(snapshot.retainedRecords === 2, 'Continuation byte pressure should keep claim records for invalidation.');
  expect(snapshot.retainedAnswerValues < 2, 'Continuation-rich answers should count against the retained answer byte budget.');
  expect(snapshot.budgetDisposedAnswerBytes > 0, 'Continuation-rich answer pruning should report disposed answer bytes.');
}

function verifyRetainedRecordBudgetPreservesActiveParents() {
  const graph = new QueryClaimGraph('contract-record-budget', retainSmallAnswerPolicy({
    retainedRecordLimit: 1,
  }));

  graph.answer(queryInput('parent'), () => {
    graph.answer(queryInput('child'), () => hit('child answer'));
    const duringParent = graph.snapshot();
    expect(duringParent.rootRecords === 1, 'Active parent claim should remain retained while child answer enforces budget.');
    return hit('parent answer');
  });

  const snapshot = graph.snapshot();
  expect(snapshot.retainedRecords <= 1, 'Retained-record budget should be enforced after the root answer resolves.');
  expect(snapshot.budgetDisposedRecords > 0, 'Retained-record budget disposal should be visible in counters.');
}

function verifyEpochDisposalIndexes() {
  const graph = new QueryClaimGraph('contract-indexes', retainSmallAnswerPolicy());
  graph.answer(queryInput('source-a', { epochKeys: ['project:demo', 'source:demo:a'] }), () => hit('a'));
  graph.answer(queryInput('source-b', { epochKeys: ['project:demo', 'source:demo:b'] }), () => hit('b'));
  graph.answer(queryInput('project-only', { epochKeys: ['project:demo'] }), () => hit('project'));

  const disposedSourceA = graph.disposeWithSummary(queryClaimDisposalPolicy('source-epoch-changed', {
    epochKeys: ['source:demo:a'],
  }));
  expect(disposedSourceA.disposedRecords === 1, 'Source-epoch disposal should use the epoch index to dispose the matching source claim.');
  expect(disposedSourceA.disposedAnswered === 1, 'Source-epoch disposal summary should count answered disposed claims.');

  const disposedProject = graph.disposeWithSummary(queryClaimDisposalPolicy('project-epoch-changed', {
    epochKeys: ['project:demo'],
  }));
  expect(disposedProject.disposedRecords === 2, 'Project-epoch disposal should dispose remaining source and project claims.');
  expect(graph.snapshot().retainedRecords === 0, 'Indexed epoch disposal should leave no retained claims for the project epoch.');
}

function queryInput(queryKey, options = {}) {
  return {
    queryKind: options.queryKind ?? 'contract-query',
    queryKey,
    locusKey: options.locusKey ?? `locus:${queryKey}`,
    epochKeys: options.epochKeys,
    materializationPolicy: options.materializationPolicy ?? 'projection-only',
  };
}

function hit(summary, value = {}, extra = {}) {
  return {
    outcome: 'hit',
    summary,
    value,
    ...extra,
  };
}

function continuationRows(rationale) {
  return [{
    kind: 'follow-query',
    label: 'Inspect source files',
    rationale,
    targetQuery: { kind: 'source-files' },
  }];
}

function discardAfterAnswerPolicy(overrides = {}) {
  return {
    retentionKind: 'discard-after-answer',
    retainAnswerSummary: false,
    retainPayloadShape: true,
    answerLocalKernelPolicy: 'dispose-after-answer',
    retainAnswerValue: false,
    retainedAnswerMaterializationPolicies: [],
    retainedAnswerByteLimit: 0,
    retainedAnswerTotalByteLimit: 0,
    retainedRecordLimit: 0,
    ...overrides,
  };
}

function retainSmallAnswerPolicy(overrides = {}) {
  return {
    retentionKind: 'retain-for-session',
    retainAnswerSummary: true,
    retainPayloadShape: true,
    answerLocalKernelPolicy: 'dispose-after-answer',
    retainAnswerValue: true,
    retainedAnswerMaterializationPolicies: ['projection-only', 'static-catalog'],
    retainedAnswerByteLimit: 1024,
    retainedAnswerTotalByteLimit: 1024,
    retainedRecordLimit: 32,
    ...overrides,
  };
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
