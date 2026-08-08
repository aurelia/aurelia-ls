import { describe, expect, test } from 'vitest';

import {
  InquiryAnswerCoverage,
  InquiryAnswerResult,
  InquiryAnswerSelection,
} from '../src/inquiry/answer.js';
import {
  QueryClaimGraph,
  type QueryClaimAnswerDisposalCollector,
  type QueryClaimAnswerLease,
  type QueryClaimAnswerTransactionBoundary,
  type QueryClaimProvisionalAnswerHandle,
  type QueryClaimRequestInput,
} from '../src/inquiry/query-claim-graph.js';
import {
  QueryClaimAnswerLocalKernelPolicy,
  QueryClaimDisposalReason,
  QueryClaimRetentionKind,
  queryClaimDisposalPolicy,
  type QueryClaimRetentionPolicy,
} from '../src/inquiry/query-claim-policy.js';
import { KernelStore } from '../src/kernel/store.js';

class TestAnswerLease implements QueryClaimAnswerLease {
  current = true;
  validationCalls = 0;
  disposalCalls = 0;

  constructor(
    readonly kind: string,
    private readonly onDispose?: () => void,
  ) {}

  isCurrent(): boolean {
    this.validationCalls += 1;
    return this.current;
  }

  dispose(): void {
    this.disposalCalls += 1;
    this.onDispose?.();
  }
}

class TestAnswerTransaction implements QueryClaimAnswerTransactionBoundary {
  readonly token = Object.freeze({ kind: 'test-answer-transaction' });
  readonly handles: QueryClaimProvisionalAnswerHandle[] = [];
  readonly validatedLeases: QueryClaimAnswerLease[] = [];
  deferCurrentness = true;
  currentnessDeferrals = 0;
  private phase: 'open' | 'committing' | 'committed' | 'rolled-back' = 'open';

  assertAnswerAdmissionOpen(): void {
    if (this.phase !== 'open') {
      throw new Error(`Test answer transaction is not open (phase '${this.phase}').`);
    }
  }

  enlistProvisionalAnswer(handle: QueryClaimProvisionalAnswerHandle): void {
    this.assertAnswerAdmissionOpen();
    this.handles.push(handle);
  }

  shouldDeferAnswerLeaseCurrentness(_lease: QueryClaimAnswerLease): boolean {
    this.assertAnswerAdmissionOpen();
    this.currentnessDeferrals += 1;
    return this.deferCurrentness;
  }

  didValidateAnswerLease(lease: QueryClaimAnswerLease): void {
    this.assertAnswerAdmissionOpen();
    this.validatedLeases.push(lease);
  }

  commit(): void {
    this.assertAnswerAdmissionOpen();
    this.phase = 'committing';
    const groups = new Map<object, QueryClaimProvisionalAnswerHandle>();
    const disposals: (() => void)[] = [];
    const collectDisposal: QueryClaimAnswerDisposalCollector = (disposal) => disposals.push(disposal);
    try {
      for (const handle of this.handles) {
        handle.publish();
        groups.set(handle.commitGroup, handle);
      }
      for (const handle of groups.values()) {
        handle.settleCommit(collectDisposal);
      }
      this.phase = 'committed';
    } catch (error) {
      for (let index = this.handles.length - 1; index >= 0; index -= 1) {
        this.handles[index]?.rollback(collectDisposal);
      }
      this.phase = 'rolled-back';
      for (const dispose of disposals) {
        dispose();
      }
      throw error;
    }
    for (const dispose of disposals) {
      dispose();
    }
  }

  rollback(): void {
    if (this.phase !== 'open') {
      throw new Error(`Cannot roll back test answer transaction in phase '${this.phase}'.`);
    }
    const disposals: (() => void)[] = [];
    for (let index = this.handles.length - 1; index >= 0; index -= 1) {
      this.handles[index]?.rollback((disposal) => disposals.push(disposal));
    }
    this.phase = 'rolled-back';
    for (const dispose of disposals) {
      dispose();
    }
  }
}

const input: QueryClaimRequestInput = {
  queryKind: 'test-query',
  queryKey: 'test-query-key',
  locusKey: 'test-locus',
  responsePolicyKey: 'test-response-policy',
  epochKeys: ['project:test'],
  materializationPolicy: 'static-catalog',
};

function answer(summary: string) {
  return {
    result: InquiryAnswerResult.Answered,
    selection: InquiryAnswerSelection.NotApplicable,
    coverage: InquiryAnswerCoverage.Complete,
    summary,
    value: { summary },
  };
}

function retainedAnswerPolicy(
  overrides: Partial<QueryClaimRetentionPolicy> = {},
): QueryClaimRetentionPolicy {
  return {
    retentionKind: QueryClaimRetentionKind.RetainForSession,
    retainAnswerSummary: true,
    retainPayloadShape: true,
    answerLocalKernelPolicy: QueryClaimAnswerLocalKernelPolicy.DisposeAfterAnswer,
    retainAnswerValue: true,
    retainedAnswerMaterializationPolicies: ['static-catalog'],
    retainedAnswerByteLimit: 64 * 1024,
    retainedAnswerTotalByteLimit: 512 * 1024,
    retainedRecordLimit: 32,
    ...overrides,
  };
}

describe('query-claim answer leases', () => {
  test('inspects aggregate counters and recent rows from one token-scoped graph view', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    graph.answer(input, () => answer('committed'));
    const transaction = new TestAnswerTransaction();
    graph.answer({
      ...input,
      queryKind: 'provisional',
      queryKey: 'provisional-key',
    }, () => answer('provisional'), {
      answerTransaction: transaction,
    });

    const committed = graph.inspect(8);
    const owner = graph.inspect(8, transaction.token);
    const foreign = graph.inspect(8, Object.freeze({ kind: 'foreign-transaction' }));
    const aggregateOnly = graph.inspect();
    const zeroRows = graph.inspect(0, transaction.token);

    expect(committed.snapshot.retainedRecords).toBe(1);
    expect(committed.recentRecords?.map((record) => record.queryKind)).toEqual([input.queryKind]);
    expect(owner.snapshot.retainedRecords).toBe(2);
    expect(owner.recentRecords?.map((record) => record.queryKind)).toEqual([input.queryKind, 'provisional']);
    expect(foreign).toEqual(committed);
    expect(aggregateOnly.recentRecords).toBeNull();
    expect(zeroRows.recentRecords).toEqual([]);
    transaction.rollback();
  });

  test('seals and observes a current lease before disposal and exposes it again on a retained hit', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const store = new KernelStore('query-claim-answer-lease-order');
    const lease = new TestAnswerLease('semantic-basis');
    const events: string[] = [];
    const observed: QueryClaimAnswerLease[] = [];
    let materializations = 0;
    const boundary = {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => {
        events.push('seal');
        return lease;
      },
      observeAnswerLease: (observedLease: QueryClaimAnswerLease) => {
        events.push('observe');
        observed.push(observedLease);
      },
      readKernelMarker: () => store.markLifetime(),
      disposeKernelSince: (marker: ReturnType<KernelStore['markLifetime']>) => {
        events.push('kernel-dispose');
        return store.disposeSince(marker);
      },
      disposeAnswerSideEffects: () => {
        events.push('answer-dispose');
        return null;
      },
    };

    const first = graph.answer(input, () => {
      materializations += 1;
      events.push('materialize');
      return answer('first');
    }, boundary);
    const second = graph.answer(input, () => {
      materializations += 1;
      return answer('second');
    }, boundary);

    expect(second).toBe(first);
    expect(materializations).toBe(1);
    expect(observed).toEqual([lease, lease]);
    expect(events).toEqual([
      'materialize',
      'seal',
      'observe',
      'kernel-dispose',
      'answer-dispose',
      'observe',
      'answer-dispose',
    ]);
    expect(graph.snapshot().retainedAnswerHits).toBe(1);
    expect(lease.disposalCalls).toBe(0);

    graph.dispose();
    expect(lease.disposalCalls).toBe(1);
  });

  test('disposes a stale retained lease and rematerializes without observing the invalid lease', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const firstLease = new TestAnswerLease('semantic-basis');
    const secondLease = new TestAnswerLease('semantic-basis');
    const observed: QueryClaimAnswerLease[] = [];
    let materializations = 0;
    const boundary = {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => materializations === 1 ? firstLease : secondLease,
      observeAnswerLease: (lease: QueryClaimAnswerLease) => observed.push(lease),
    };

    graph.answer(input, () => {
      materializations += 1;
      return answer('first');
    }, boundary);
    firstLease.current = false;
    observed.length = 0;

    const refreshed = graph.answer(input, () => {
      materializations += 1;
      return answer('refreshed');
    }, boundary);

    expect(refreshed.summary).toBe('refreshed');
    expect(materializations).toBe(2);
    expect(observed).toEqual([secondLease]);
    expect(firstLease.disposalCalls).toBe(1);
    expect(secondLease.disposalCalls).toBe(0);
    expect(graph.snapshot()).toMatchObject({
      retainedRecords: 1,
      retainedAnswerHits: 0,
      disposed: 1,
    });
  });

  test('rejects unleased and wrong-kind retained answers under a required lease contract', () => {
    const missingGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    let missingMaterializations = 0;
    missingGraph.answer(input, () => {
      missingMaterializations += 1;
      return answer('legacy-unleased');
    });
    const requiredLease = new TestAnswerLease('semantic-basis');
    const refreshed = missingGraph.answer(input, () => {
      missingMaterializations += 1;
      return answer('leased');
    }, {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => requiredLease,
    });
    expect(refreshed.summary).toBe('leased');
    expect(missingMaterializations).toBe(2);
    expect(missingGraph.snapshot().disposed).toBe(1);

    const mismatchGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const oldLease = new TestAnswerLease('old-basis');
    let mismatchMaterializations = 0;
    mismatchGraph.answer(input, () => {
      mismatchMaterializations += 1;
      return answer('old-kind');
    }, {
      sealAnswerLease: () => oldLease,
    });
    const newLease = new TestAnswerLease('semantic-basis');
    mismatchGraph.answer(input, () => {
      mismatchMaterializations += 1;
      return answer('new-kind');
    }, {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => newLease,
    });
    expect(mismatchMaterializations).toBe(2);
    expect(oldLease.disposalCalls).toBe(1);
    expect(newLease.disposalCalls).toBe(0);
  });

  test('fails fresh answers whose required lease is missing, wrong, stale, or cannot be sealed', () => {
    const cases: readonly {
      readonly name: string;
      readonly seal: () => QueryClaimAnswerLease | null;
      readonly expected: RegExp;
    }[] = [
      {
        name: 'missing',
        seal: () => null,
        expected: /was not sealed/,
      },
      {
        name: 'wrong kind',
        seal: () => new TestAnswerLease('other-basis'),
        expected: /does not satisfy required lease kind/,
      },
      {
        name: 'stale',
        seal: () => {
          const lease = new TestAnswerLease('semantic-basis');
          lease.current = false;
          return lease;
        },
        expected: /no longer current/,
      },
      {
        name: 'sealer throws',
        seal: () => {
          throw new Error('seal exploded');
        },
        expected: /seal exploded/,
      },
    ];

    for (const testCase of cases) {
      const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
      const observed: QueryClaimAnswerLease[] = [];
      let disposedSideEffects = 0;
      let sealedLease: QueryClaimAnswerLease | null = null;
      const seal = () => {
        sealedLease = testCase.seal();
        return sealedLease;
      };
      expect(() => graph.answer(input, () => answer(testCase.name), {
        requiredAnswerLeaseKind: 'semantic-basis',
        sealAnswerLease: seal,
        observeAnswerLease: (lease) => observed.push(lease),
        disposeAnswerSideEffects: () => {
          disposedSideEffects += 1;
          return null;
        },
      })).toThrow(testCase.expected);
      expect(observed, testCase.name).toEqual([]);
      expect(disposedSideEffects, testCase.name).toBe(1);
      expect(graph.readRecords()[0]?.evaluationState, testCase.name).toBe('failed');
      if (sealedLease instanceof TestAnswerLease) {
        expect(sealedLease.disposalCalls, testCase.name).toBe(1);
      }
    }
  });

  test('observes non-retained leases and releases graph ownership before answer disposal', () => {
    const graph = new QueryClaimGraph('aot', retainedAnswerPolicy({
      retentionKind: QueryClaimRetentionKind.DiscardAfterAnswer,
      retainAnswerValue: false,
      retainedAnswerMaterializationPolicies: [],
      retainedAnswerByteLimit: 0,
      retainedAnswerTotalByteLimit: 0,
      retainedRecordLimit: 0,
    }));
    const lease = new TestAnswerLease('semantic-basis');
    const events: string[] = [];

    graph.answer(input, () => answer('discarded'), {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => {
        events.push('seal');
        return lease;
      },
      observeAnswerLease: () => events.push('observe'),
      disposeAnswerSideEffects: () => {
        events.push(`answer-dispose:${lease.disposalCalls}`);
        return null;
      },
    });

    expect(events).toEqual(['seal', 'observe', 'answer-dispose:1']);
    expect(lease.disposalCalls).toBe(1);
    expect(graph.snapshot().retainedRecords).toBe(0);
  });

  test('releases a retained lease exactly once when the answer-value byte budget evicts it', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy({
      retainedAnswerTotalByteLimit: 0,
    }));
    const lease = new TestAnswerLease('semantic-basis');

    graph.answer(input, () => answer('evicted'), {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => lease,
    });

    expect(graph.snapshot()).toMatchObject({
      retainedRecords: 1,
      retainedAnswerValues: 0,
      budgetDisposedAnswerValues: 1,
    });
    expect(lease.disposalCalls).toBe(1);
    graph.dispose();
    expect(lease.disposalCalls).toBe(1);
  });

  test('hides and accounts a disposed node before its retained lease can reenter the graph', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy({
      retainedRecordLimit: 1,
    }));
    const oldInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'reentrant-old',
      queryKey: 'reentrant-old-key',
    };
    const newInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'reentrant-new',
      queryKey: 'reentrant-new-key',
    };
    const lease = new TestAnswerLease('semantic-basis', () => {
      graph.answer(newInput, () => answer('new'));
    });
    graph.answer(oldInput, () => answer('old'), {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => lease,
    });

    const summary = graph.disposeWithSummary(queryClaimDisposalPolicy(
      QueryClaimDisposalReason.Manual,
      { queryKinds: ['reentrant-old'] },
    ));

    expect(summary).toMatchObject({ matchedRecords: 1, disposedRecords: 1 });
    expect(graph.readRecords().map((record) => record.queryKind)).toEqual(['reentrant-new']);
    expect(graph.snapshot()).toMatchObject({
      retainedRecords: 1,
      disposed: 1,
      budgetDisposedRecords: 0,
    });
    expect(lease.disposalCalls).toBe(1);
  });

  test('keeps same-token answers provisional and reusable until commit settles graph budgets', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy({
      retainedAnswerTotalByteLimit: 0,
    }));
    const transaction = new TestAnswerTransaction();
    const lease = new TestAnswerLease('semantic-basis');
    const observed: QueryClaimAnswerLease[] = [];
    let materializations = 0;
    const boundary = {
      answerTransaction: transaction,
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => lease,
      observeAnswerLease: (answerLease: QueryClaimAnswerLease) => observed.push(answerLease),
    };

    const first = graph.answer(input, () => {
      materializations += 1;
      return answer('provisional');
    }, boundary);
    const second = graph.answer(input, () => {
      materializations += 1;
      return answer('unexpected-rematerialization');
    }, boundary);

    expect(second).toBe(first);
    expect(materializations).toBe(1);
    expect(observed).toEqual([lease, lease]);
    expect(lease.validationCalls).toBe(0);
    expect(transaction.currentnessDeferrals).toBe(2);
    expect(graph.readRecords()).toEqual([]);
    expect(graph.readRecords(transaction.token)).toHaveLength(1);
    expect(graph.snapshot()).toMatchObject({ records: 0, retainedAnswerValues: 0 });
    expect(graph.snapshot(transaction.token)).toMatchObject({ records: 1, retainedAnswerValues: 1 });

    transaction.commit();

    expect(graph.readRecords()).toHaveLength(1);
    expect(graph.snapshot()).toMatchObject({
      records: 1,
      retainedAnswerValues: 0,
      budgetDisposedAnswerValues: 1,
    });
    expect(lease.disposalCalls).toBe(1);
  });

  test('keeps indexed-but-unsettled publication invisible outside its owning token', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    const otherTransaction = new TestAnswerTransaction();
    let materializations = 0;
    graph.answer(input, () => {
      materializations += 1;
      return answer('provisional');
    }, { answerTransaction: transaction });
    transaction.handles[0]?.publish();

    expect(graph.readRecords()).toEqual([]);
    expect(graph.snapshot()).toMatchObject({ retainedRecords: 0, retainedAnswerHits: 0 });
    expect(graph.readRecords(transaction.token)).toHaveLength(1);
    expect(graph.readRecords(otherTransaction.token)).toEqual([]);
    expect(graph.dispose()).toBe(0);

    const committed = graph.answer(input, () => {
      materializations += 1;
      return answer('independent committed answer');
    });
    expect(committed.summary).toBe('independent committed answer');
    expect(materializations).toBe(2);
    expect(graph.readRecords()).toHaveLength(1);
    expect(graph.readRecords(transaction.token)).toHaveLength(2);

    transaction.rollback();
    otherTransaction.rollback();
    expect(graph.readRecords()).toHaveLength(1);
  });

  test('runs cross-graph budget release callbacks only after every graph has settled', () => {
    const firstGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy({
      retainedAnswerTotalByteLimit: 0,
    }));
    const secondGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    let secondMaterializations = 0;
    let visibleSecondKinds: readonly string[] = [];
    let reusedSecondSummary: string | null = null;
    const firstLease = new TestAnswerLease('semantic-basis', () => {
      visibleSecondKinds = secondGraph.readRecords().map((record) => record.queryKind);
      reusedSecondSummary = secondGraph.answer(input, () => {
        secondMaterializations += 1;
        return answer('unexpected reentrant rematerialization');
      }).summary;
    });

    firstGraph.answer(input, () => answer('first'), {
      answerTransaction: transaction,
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => firstLease,
    });
    secondGraph.answer(input, () => {
      secondMaterializations += 1;
      return answer('second');
    }, { answerTransaction: transaction });

    transaction.commit();

    expect(visibleSecondKinds).toEqual(['test-query']);
    expect(reusedSecondSummary).toBe('second');
    expect(secondMaterializations).toBe(1);
    expect(firstLease.disposalCalls).toBe(1);
    expect(secondGraph.snapshot().retainedAnswerHits).toBe(1);
  });

  test('withdraws every graph before a later publish failure releases caller-owned leases', () => {
    const firstGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const secondGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    const visibilityDuringRelease: string[][] = [];
    const lease = new TestAnswerLease('semantic-basis', () => {
      visibilityDuringRelease.push([
        ...firstGraph.readRecords().map((record) => `first:${record.queryKind}`),
        ...secondGraph.readRecords().map((record) => `second:${record.queryKind}`),
      ]);
    });
    firstGraph.answer(input, () => answer('answered'), {
      answerTransaction: transaction,
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => lease,
    });
    secondGraph.claim(input, () => answer('never materialized'), {
      answerTransaction: transaction,
    });

    expect(() => transaction.commit()).toThrow(/Cannot publish provisional query claim/);
    expect(firstGraph.readRecords()).toEqual([]);
    expect(secondGraph.readRecords()).toEqual([]);
    expect(visibilityDuringRelease).toEqual([[]]);
    expect(lease.disposalCalls).toBe(1);
  });

  test('fully validates committed retained hits even inside a deferring transaction', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const lease = new TestAnswerLease('semantic-basis');
    graph.answer(input, () => answer('committed'), {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => lease,
    });
    lease.validationCalls = 0;
    const transaction = new TestAnswerTransaction();
    const observed: QueryClaimAnswerLease[] = [];

    const reused = graph.answer(input, () => answer('unexpected-rematerialization'), {
      answerTransaction: transaction,
      requiredAnswerLeaseKind: 'semantic-basis',
      observeAnswerLease: (answerLease) => observed.push(answerLease),
    });

    expect(reused.summary).toBe('committed');
    expect(lease.validationCalls).toBe(1);
    expect(observed).toEqual([lease]);
    expect(transaction.currentnessDeferrals).toBe(0);
    expect(transaction.validatedLeases).toEqual([lease]);
    expect(transaction.handles).toEqual([]);
  });

  test('validates and releases a request-composed lease without replacing the retained historical lease', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const historicalLease = new TestAnswerLease('semantic-basis');
    graph.answer(input, () => answer('committed'), {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => historicalLease,
    });
    historicalLease.validationCalls = 0;
    const aggregateLease = new TestAnswerLease('semantic-basis');
    const transaction = new TestAnswerTransaction();
    const observed: QueryClaimAnswerLease[] = [];

    const reused = graph.answer(input, () => answer('unexpected-rematerialization'), {
      answerTransaction: transaction,
      requiredAnswerLeaseKind: 'semantic-basis',
      composeRetainedAnswerLease: (lease) => {
        expect(lease).toBe(historicalLease);
        return aggregateLease;
      },
      observeAnswerLease: (lease) => observed.push(lease),
    });

    expect(reused.summary).toBe('committed');
    expect(historicalLease.validationCalls).toBe(0);
    expect(historicalLease.disposalCalls).toBe(0);
    expect(aggregateLease.validationCalls).toBe(1);
    expect(aggregateLease.disposalCalls).toBe(1);
    expect(observed).toEqual([aggregateLease]);
    expect(transaction.validatedLeases).toEqual([aggregateLease]);
    graph.dispose();
    expect(historicalLease.disposalCalls).toBe(1);
    expect(aggregateLease.disposalCalls).toBe(1);
  });

  test('composes invocation-local proof for same-token provisional reuse without replacing its historical lease', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    const historicalLease = new TestAnswerLease('semantic-basis');
    const aggregateLease = new TestAnswerLease('semantic-basis');
    const observed: QueryClaimAnswerLease[] = [];
    let materializations = 0;
    const boundary = {
      answerTransaction: transaction,
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => historicalLease,
      composeRetainedAnswerLease: (lease: QueryClaimAnswerLease) => {
        expect(lease).toBe(historicalLease);
        return aggregateLease;
      },
      observeAnswerLease: (lease: QueryClaimAnswerLease) => observed.push(lease),
    };

    const first = graph.answer(input, () => {
      materializations += 1;
      return answer('provisional');
    }, boundary);
    const second = graph.answer(input, () => {
      materializations += 1;
      return answer('unexpected rematerialization');
    }, boundary);

    expect(second).toBe(first);
    expect(materializations).toBe(1);
    expect(observed).toEqual([historicalLease, aggregateLease]);
    expect(historicalLease.validationCalls).toBe(0);
    expect(historicalLease.disposalCalls).toBe(0);
    expect(aggregateLease.validationCalls).toBe(0);
    expect(aggregateLease.disposalCalls).toBe(1);
    expect(transaction.currentnessDeferrals).toBe(2);

    transaction.commit();
    expect(historicalLease.disposalCalls).toBe(0);
    graph.dispose();
    expect(historicalLease.disposalCalls).toBe(1);
    expect(aggregateLease.disposalCalls).toBe(1);
  });

  test('composes invocation-local proof when rereading an already-resolved claim handle', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const historicalLease = new TestAnswerLease('semantic-basis');
    const aggregateLease = new TestAnswerLease('semantic-basis');
    const observed: QueryClaimAnswerLease[] = [];
    let materializations = 0;
    const claim = graph.claim(input, () => {
      materializations += 1;
      return answer('resolved claim');
    }, {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => historicalLease,
      composeRetainedAnswerLease: () => aggregateLease,
      observeAnswerLease: (lease) => observed.push(lease),
    });

    const first = claim.readAnswer();
    historicalLease.validationCalls = 0;
    const second = claim.readAnswer();

    expect(second).toBe(first);
    expect(materializations).toBe(1);
    expect(historicalLease.validationCalls).toBe(0);
    expect(historicalLease.disposalCalls).toBe(0);
    expect(aggregateLease.validationCalls).toBe(1);
    expect(aggregateLease.disposalCalls).toBe(1);
    expect(observed).toEqual([historicalLease, aggregateLease]);
    graph.dispose();
    expect(historicalLease.disposalCalls).toBe(1);
  });

  test('exact-rolls provisional and fresh committed nodes when post-resolution finalization throws', () => {
    const transactionGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    const provisionalLease = new TestAnswerLease('semantic-basis');

    expect(() => transactionGraph.answer(input, () => answer('provisional'), {
      answerTransaction: transaction,
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => provisionalLease,
      disposeAnswerSideEffects: () => {
        throw new Error('post-answer cleanup failed');
      },
    })).toThrow('post-answer cleanup failed');

    expect(transactionGraph.readRecords()).toEqual([]);
    expect(transactionGraph.readRecords(transaction.token)).toEqual([]);
    expect(provisionalLease.disposalCalls).toBe(1);
    transaction.rollback();
    expect(provisionalLease.disposalCalls).toBe(1);

    const directGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const directLease = new TestAnswerLease('semantic-basis');
    expect(() => directGraph.answer(input, () => answer('direct'), {
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => directLease,
      disposeAnswerSideEffects: () => {
        throw new Error('direct finalization failed');
      },
    })).toThrow('direct finalization failed');
    expect(directGraph.readRecords()).toEqual([]);
    expect(directGraph.snapshot().disposed).toBe(1);
    expect(directLease.disposalCalls).toBe(1);
  });

  test('token-scoped reentrant disposal cancels a completed child while its parent stays active', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    const childLease = new TestAnswerLease('semantic-basis');
    const outerLease = new TestAnswerLease('semantic-basis');
    const leases = [childLease, outerLease];
    let leaseIndex = 0;
    let disposalHookCalls = 0;
    let reentrantDisposed = 0;
    const boundary = {
      answerTransaction: transaction,
      requiredAnswerLeaseKind: 'semantic-basis',
      sealAnswerLease: () => leases[leaseIndex++] ?? null,
      disposeAnswerSideEffects: () => {
        disposalHookCalls += 1;
        if (disposalHookCalls === 2) {
          reentrantDisposed = graph.dispose(
            queryClaimDisposalPolicy(QueryClaimDisposalReason.AppEpochDisposed),
            transaction.token,
          );
        }
        return null;
      },
    };
    const childInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'child-query',
      queryKey: 'child-query-key',
    };
    const outerInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'outer-query',
      queryKey: 'outer-query-key',
    };

    graph.answer(outerInput, () => {
      graph.answer(childInput, () => answer('child'), boundary);
      return answer('outer');
    }, boundary);

    expect(reentrantDisposed).toBe(1);
    expect(graph.readRecords(transaction.token).map((record) => record.queryKind)).toEqual(['outer-query']);
    expect(childLease.disposalCalls).toBe(1);
    expect(outerLease.disposalCalls).toBe(0);

    transaction.commit();
    expect(graph.readRecords().map((record) => record.queryKind)).toEqual(['outer-query']);
    graph.dispose();
    expect(outerLease.disposalCalls).toBe(1);
  });

  test('projects and cascades a committed-child reuse edge from a fresh provisional parent', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const childInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'committed-child',
      queryKey: 'committed-child-key',
    };
    const parentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'fresh-parent',
      queryKey: 'fresh-parent-key',
    };
    graph.answer(childInput, () => answer('child'));
    const transaction = new TestAnswerTransaction();

    graph.answer(parentInput, () => {
      graph.answer(childInput, () => answer('unexpected-child-rematerialization'), {
        answerTransaction: transaction,
      });
      return answer('parent');
    }, {
      answerTransaction: transaction,
    });

    const committedView = graph.readRecords();
    const transactionView = graph.readRecords(transaction.token);
    const child = transactionView.find((record) => record.queryKind === 'committed-child');
    const parent = transactionView.find((record) => record.queryKind === 'fresh-parent');
    expect(committedView.map((record) => record.queryKind)).toEqual(['committed-child']);
    expect(committedView[0]?.dependencyIds).toEqual([]);
    expect(parent).toMatchObject({ parentId: null, depth: 0, dependencyIds: [child?.id] });
    expect(graph.snapshot()).toMatchObject({ retainedDependencyEdges: 0, distinctParentClaimIds: 0 });
    expect(graph.snapshot(transaction.token)).toMatchObject({
      retainedDependencyEdges: 1,
      distinctParentClaimIds: 1,
    });

    transaction.commit();
    expect(graph.dispose(queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual, {
      queryKinds: ['committed-child'],
    }))).toBe(2);
    expect(graph.readRecords()).toEqual([]);
  });

  test('cascades one dependency through multiple retained parents and transitive reuse', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const childInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'shared-child',
      queryKey: 'shared-child-key',
    };
    const firstParentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'first-parent',
      queryKey: 'first-parent-key',
    };
    const secondParentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'second-parent',
      queryKey: 'second-parent-key',
    };
    const grandparentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'grandparent',
      queryKey: 'grandparent-key',
    };
    graph.answer(childInput, () => answer('shared child'));
    graph.answer(firstParentInput, () => {
      graph.answer(childInput, () => answer('unexpected child rematerialization'));
      return answer('first parent');
    });
    graph.answer(secondParentInput, () => {
      graph.answer(childInput, () => answer('unexpected child rematerialization'));
      return answer('second parent');
    });
    graph.answer(grandparentInput, () => {
      graph.answer(firstParentInput, () => answer('unexpected parent rematerialization'));
      return answer('grandparent');
    });

    const records = graph.readRecords();
    const child = records.find((record) => record.queryKind === 'shared-child');
    const firstParent = records.find((record) => record.queryKind === 'first-parent');
    expect(records.find((record) => record.queryKind === 'first-parent')?.dependencyIds).toEqual([child?.id]);
    expect(records.find((record) => record.queryKind === 'second-parent')?.dependencyIds).toEqual([child?.id]);
    expect(records.find((record) => record.queryKind === 'grandparent')?.dependencyIds).toEqual([firstParent?.id]);
    expect(graph.snapshot()).toMatchObject({
      retainedDependencyEdges: 3,
      distinctParentClaimIds: 3,
    });

    expect(graph.dispose(queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual, {
      queryKinds: ['shared-child'],
    }))).toBe(4);
    expect(graph.readRecords()).toEqual([]);
  });

  test('prunes a dependent parent without evicting its reusable child', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const childInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'independent-child',
      queryKey: 'independent-child-key',
    };
    const parentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'disposable-parent',
      queryKey: 'disposable-parent-key',
    };
    let childMaterializations = 0;
    const childAnswer = graph.answer(childInput, () => {
      childMaterializations += 1;
      return answer('child');
    });
    graph.answer(parentInput, () => {
      graph.answer(childInput, () => {
        childMaterializations += 1;
        return answer('unexpected child rematerialization');
      });
      return answer('parent');
    });

    expect(graph.dispose(queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual, {
      queryKinds: ['disposable-parent'],
    }))).toBe(1);
    expect(graph.snapshot()).toMatchObject({ retainedRecords: 1, retainedDependencyEdges: 0 });
    const reusedChild = graph.answer(childInput, () => {
      childMaterializations += 1;
      return answer('unexpected child rematerialization');
    });
    expect(reusedChild).toBe(childAnswer);
    expect(childMaterializations).toBe(1);
  });

  test('keeps provisional reuse edges token-scoped and removes them on rollback', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    const childInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'provisional-dependency',
      queryKey: 'provisional-dependency-key',
    };
    const parentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'provisional-dependent',
      queryKey: 'provisional-dependent-key',
    };
    const boundary = { answerTransaction: transaction };
    graph.answer(childInput, () => answer('child'), boundary);
    graph.answer(parentInput, () => {
      graph.answer(childInput, () => answer('unexpected child rematerialization'), boundary);
      return answer('parent');
    }, boundary);

    const tokenRecords = graph.readRecords(transaction.token);
    const child = tokenRecords.find((record) => record.queryKind === 'provisional-dependency');
    expect(graph.readRecords()).toEqual([]);
    expect(tokenRecords.find((record) => record.queryKind === 'provisional-dependent')?.dependencyIds).toEqual([
      child?.id,
    ]);
    expect(graph.snapshot()).toMatchObject({ retainedDependencyEdges: 0, distinctParentClaimIds: 0 });
    expect(graph.snapshot(transaction.token)).toMatchObject({
      retainedDependencyEdges: 1,
      distinctParentClaimIds: 1,
    });

    transaction.handles[1]?.rollback();
    expect(graph.readRecords(transaction.token).map((record) => record.queryKind)).toEqual([
      'provisional-dependency',
    ]);
    expect(graph.snapshot(transaction.token)).toMatchObject({
      retainedDependencyEdges: 0,
      distinctParentClaimIds: 0,
    });
    transaction.rollback();
    expect(graph.readRecords(transaction.token)).toEqual([]);
  });

  test('token-scoped disposal cascades through a completed provisional reuse parent', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    const dependencyInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'disposal-dependency',
      queryKey: 'disposal-dependency-key',
    };
    const dependentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'disposal-dependent',
      queryKey: 'disposal-dependent-key',
    };
    const boundary = { answerTransaction: transaction };
    graph.answer(dependencyInput, () => answer('dependency'), boundary);
    graph.answer(dependentInput, () => {
      graph.answer(dependencyInput, () => answer('unexpected dependency rematerialization'), boundary);
      return answer('dependent');
    }, boundary);

    expect(graph.dispose(queryClaimDisposalPolicy(QueryClaimDisposalReason.AppEpochDisposed, {
      queryKinds: ['disposal-dependency'],
    }), transaction.token)).toBe(2);
    expect(graph.readRecords(transaction.token)).toEqual([]);
    transaction.rollback();
    expect(graph.snapshot(transaction.token).retainedRecords).toBe(0);
  });

  test('rejects nested answers that cross publication transaction ownership', () => {
    const parentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'transaction-parent',
      queryKey: 'transaction-parent-key',
    };
    const childInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'transaction-child',
      queryKey: 'transaction-child-key',
    };

    const committedParentGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const childTransaction = new TestAnswerTransaction();
    expect(() => committedParentGraph.answer(parentInput, () => {
      committedParentGraph.answer(childInput, () => answer('child'), {
        answerTransaction: childTransaction,
      });
      return answer('parent');
    })).toThrow(/cannot cross answer transaction ownership/i);
    childTransaction.rollback();
    expect(committedParentGraph.readRecords().map((record) => record.evaluationState)).toEqual(['failed']);

    const provisionalParentGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const parentTransaction = new TestAnswerTransaction();
    expect(() => provisionalParentGraph.answer(parentInput, () => {
      provisionalParentGraph.answer(childInput, () => answer('child'));
      return answer('parent');
    }, {
      answerTransaction: parentTransaction,
    })).toThrow(/cannot cross answer transaction ownership/i);
    parentTransaction.rollback();
    expect(provisionalParentGraph.readRecords(parentTransaction.token)).toEqual([]);

    const differentTokenGraph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const outerTransaction = new TestAnswerTransaction();
    const innerTransaction = new TestAnswerTransaction();
    expect(() => differentTokenGraph.answer(parentInput, () => {
      differentTokenGraph.answer(childInput, () => answer('child'), {
        answerTransaction: innerTransaction,
      });
      return answer('parent');
    }, {
      answerTransaction: outerTransaction,
    })).toThrow(/cannot cross answer transaction ownership/i);
    outerTransaction.rollback();
    innerTransaction.rollback();
  });

  test('records lazy answer consumption at the reader while preserving creation provenance', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const creatorInput = {
      ...input,
      queryKind: 'lazy-creator',
      queryKey: 'lazy-creator-key',
    };
    const lazyInput = {
      ...input,
      queryKind: 'lazy-dependency',
      queryKey: 'lazy-dependency-key',
    };
    const consumerInput = {
      ...input,
      queryKind: 'lazy-consumer',
      queryKey: 'lazy-consumer-key',
    };
    let lazyClaim: ReturnType<typeof graph.claim> | null = null;

    graph.answer(creatorInput, () => {
      lazyClaim = graph.claim(lazyInput, () => answer('lazy dependency'));
      return answer('creator');
    });
    graph.answer(consumerInput, () => {
      lazyClaim?.readAnswer();
      return answer('consumer');
    });

    const records = graph.readRecords();
    const creator = records.find((record) => record.queryKind === 'lazy-creator');
    const dependency = records.find((record) => record.queryKind === 'lazy-dependency');
    const consumer = records.find((record) => record.queryKind === 'lazy-consumer');
    expect(creator?.dependencyIds).toEqual([]);
    expect(dependency).toMatchObject({ parentId: creator?.id, depth: 1, dependencyIds: [] });
    expect(consumer?.dependencyIds).toEqual([dependency?.id]);

    expect(graph.dispose(queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual, {
      queryKinds: ['lazy-dependency'],
    }))).toBe(2);
    expect(graph.readRecords().map((record) => record.queryKind)).toEqual(['lazy-creator']);
  });

  test('rejects deferred claim materialization under a different transaction owner', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const claimTransaction = new TestAnswerTransaction();
    const consumerTransaction = new TestAnswerTransaction();
    const lazyClaim = graph.claim({
      ...input,
      queryKind: 'owned-lazy-claim',
      queryKey: 'owned-lazy-claim-key',
    }, () => answer('owned lazy claim'), {
      answerTransaction: claimTransaction,
    });

    expect(() => graph.answer({
      ...input,
      queryKind: 'foreign-lazy-consumer',
      queryKey: 'foreign-lazy-consumer-key',
    }, () => {
      lazyClaim.readAnswer();
      return answer('foreign consumer');
    }, {
      answerTransaction: consumerTransaction,
    })).toThrow(/cannot cross answer transaction ownership/i);

    claimTransaction.rollback();
    consumerTransaction.rollback();
    expect(graph.readRecords()).toEqual([]);
  });

  test('batches overlapping broad-disposal candidates without counting a cascaded parent twice', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const parentInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'broad-parent',
      queryKey: 'broad-parent-key',
    };
    const childInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'broad-child',
      queryKey: 'broad-child-key',
    };
    graph.answer(parentInput, () => {
      graph.answer(childInput, () => answer('child'));
      return answer('parent');
    });

    const summary = graph.disposeWithSummary(
      queryClaimDisposalPolicy(QueryClaimDisposalReason.Manual),
    );

    expect(summary).toMatchObject({
      candidateRecords: 2,
      matchedRecords: 1,
      disposedRecords: 2,
    });
    expect(graph.readRecords()).toEqual([]);
  });

  test('prunes an old dependent leaf before a shared dependency at the retained-record budget', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy({
      retainedRecordLimit: 3,
    }));
    const childInput: QueryClaimRequestInput = {
      ...input,
      queryKind: 'budget-shared-child',
      queryKey: 'budget-shared-child-key',
    };
    let childMaterializations = 0;
    const childAnswer = graph.answer(childInput, () => {
      childMaterializations += 1;
      return answer('shared child');
    });
    const addParent = (ordinal: number): void => {
      graph.answer({
        ...input,
        queryKind: `budget-parent-${ordinal}`,
        queryKey: `budget-parent-key-${ordinal}`,
      }, () => {
        graph.answer(childInput, () => {
          childMaterializations += 1;
          return answer('unexpected child rematerialization');
        });
        return answer(`parent ${ordinal}`);
      });
    };
    addParent(1);
    addParent(2);
    addParent(3);

    expect(graph.readRecords().map((record) => record.queryKind)).toEqual([
      'budget-shared-child',
      'budget-parent-2',
      'budget-parent-3',
    ]);
    expect(graph.snapshot()).toMatchObject({
      retainedRecords: 3,
      retainedDependencyEdges: 2,
      budgetDisposedRecords: 1,
    });
    expect(graph.answer(childInput, () => {
      childMaterializations += 1;
      return answer('unexpected child rematerialization');
    })).toBe(childAnswer);
    expect(childMaterializations).toBe(1);
  });

  test('defers an impossible nested budget drain until the active dependent closes', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy({
      retainedRecordLimit: 0,
    }));
    const parentInput = {
      ...input,
      queryKind: 'active-budget-parent',
      queryKey: 'active-budget-parent-key',
    };
    const childInput = {
      ...input,
      queryKind: 'active-budget-child',
      queryKey: 'active-budget-child-key',
    };
    let recordsWhileParentActive: readonly string[] = [];

    graph.answer(parentInput, () => {
      graph.answer(childInput, () => answer('child'));
      recordsWhileParentActive = graph.readRecords().map((record) => record.queryKind);
      return answer('parent');
    });

    expect(recordsWhileParentActive).toEqual(['active-budget-parent', 'active-budget-child']);
    expect(graph.readRecords()).toEqual([]);
    expect(graph.snapshot()).toMatchObject({
      retainedRecords: 0,
      disposed: 2,
      budgetDisposedRecords: 2,
    });
  });

  test('refuses to publish or later materialize a lazy provisional claim', () => {
    const graph = new QueryClaimGraph('mcp-orientation', retainedAnswerPolicy());
    const transaction = new TestAnswerTransaction();
    let materializations = 0;
    const claim = graph.claim(input, () => {
      materializations += 1;
      return answer('too late');
    }, {
      answerTransaction: transaction,
    });

    expect(graph.readRecords()).toEqual([]);
    expect(graph.readRecords(transaction.token)[0]?.evaluationState).toBe('pending');
    expect(() => transaction.commit()).toThrow(/Cannot publish provisional query claim/);
    expect(graph.readRecords()).toEqual([]);
    expect(graph.readRecords(transaction.token)).toEqual([]);
    expect(() => claim.readAnswer()).toThrow(/not open/);
    expect(materializations).toBe(0);
  });
});
