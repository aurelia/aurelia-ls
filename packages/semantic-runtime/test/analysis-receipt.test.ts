import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  SemanticRuntimeProjectInputCurrentnessMode,
  SemanticRuntimeProjectInputReadKind,
  SemanticSourceWorldCurrentnessKind,
  SemanticSourceWorldInputReceipt,
  SemanticRuntimeAnalysisCurrentnessError,
  createSemanticRuntime,
  isSemanticRuntimeAnalysisCurrentnessError,
  type SemanticRuntimeSourceTextOverlay,
} from '../src/api/index.js';
import {
  SemanticRuntimeAnalysisReceipt,
  type SemanticRuntimeAnalysisReceiptBuilder,
  semanticRuntimeAnalysisReceiptFor,
} from '../src/api/analysis-receipt.js';
import { SemanticAnswerTransaction } from '../src/api/analysis-answer-transaction.js';
import { AureliaAppWorldProjectGeneration } from '../src/configuration/app-analysis-computation.js';
import { SourceFileAddress, SourceLanguage } from '../src/kernel/address.js';
import type { ComputationRead } from '../src/kernel/computation-lifecycle.js';
import { KernelStoreBatch } from '../src/kernel/store.js';
import {
  QueryClaimGraph,
  type QueryClaimAnswerDisposalCollector,
  type QueryClaimAnswerLease,
  type QueryClaimProvisionalAnswerHandle,
} from '../src/inquiry/query-claim-graph.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('semantic answer receipts', () => {
  test('reports conflicting portable semantic facts by their full domain-qualified identity', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:semantic-fact-conflict',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const builder = runtime.createAnalysisReceiptBuilder();
    const observer = builder as unknown as {
      observeSemanticFactReads(reads: readonly ComputationRead[]): void;
    };
    const semanticFact = (observedRevision: string): ComputationRead => ({
      domain: 'project-compiler-options-environment',
      readKey: 'shared-read-key',
      observedRevision,
      validate: () => ({ isCurrent: true, currentRevision: observedRevision, changedFacets: [] }),
      tryRebaseCurrent() {
        return this;
      },
    });

    observer.observeSemanticFactReads([semanticFact('revision:1')]);
    const failure = (() => {
      try {
        observer.observeSemanticFactReads([semanticFact('revision:2')]);
        return null;
      } catch (error) {
        return error;
      }
    })();

    expect(failure).toBeInstanceOf(SemanticRuntimeAnalysisCurrentnessError);
    expect(failure).toMatchObject({
      reason: 'answer-proof-changed',
      changedReadKeys: [],
      changedFacets: [],
      changedSemanticFactKeys: [
        'project-compiler-options-environment:shared-read-key',
      ],
    });
    runtime.releaseAnalysisReceiptBuilder(builder);
  });

  test('reports the exact stale portable semantic fact from a sealed receipt', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:stale-semantic-fact',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const builder = runtime.createAnalysisReceiptBuilder();
    const observer = builder as unknown as {
      observeSemanticFactReads(reads: readonly ComputationRead[]): void;
    };
    let current = true;
    const semanticFact: ComputationRead = {
      domain: 'static-project-evaluation-profile',
      readKey: 'project:app',
      observedRevision: 'revision:1',
      validate: () => ({
        isCurrent: current,
        currentRevision: current ? 'revision:1' : 'revision:2',
        changedFacets: current ? [] : ['semantic-profile'],
      }),
      tryRebaseCurrent() {
        return this;
      },
    };
    observer.observeSemanticFactReads([semanticFact]);
    const receipt = builder.seal();
    current = false;

    let failure: unknown;
    try {
      receipt.assertCurrent();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(SemanticRuntimeAnalysisCurrentnessError);
    expect(failure).toMatchObject({
      reason: 'query-answer-lease-changed',
      answerLeaseKind: 'semantic-runtime-analysis-receipt/1',
      invalidGenerationKeys: [],
      changedReadKeys: [],
      changedFacets: ['semantic-profile'],
      changedSemanticFactKeys: [
        'static-project-evaluation-profile:project:app',
      ],
    });
    receipt.dispose();
    runtime.releaseAnalysisReceiptBuilder(builder);
  });

  test('validates one aggregate receipt for fresh runtime-to-app nesting', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:fresh-runtime-app-transaction',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const validateReceipt = vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'validate');

    const result = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.Summary,
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
    });

    expect(result.result).toBe('answered');
    expect(validateReceipt).toHaveBeenCalledTimes(1);
  });

  test('validates a fresh direct-app answer exactly once', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:fresh-direct-app',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const app = await runtime.openApp({ projectKey: 'app' });
    const validateReceipt = vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'validate');

    const result = app.ask({
      kind: SemanticAppQueryKind.Summary,
      inquiryProfile: 'mcp-orientation',
    });

    expect(result.result).toBe('answered');
    expect(validateReceipt).toHaveBeenCalledTimes(1);
  });

  test('validates and returns fresh planning reads when a root answer reuses its retained value', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:retained-root-planning-aggregate',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const request = {
      kind: SemanticAppQueryKind.Summary,
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
      typeSystemDependencyCacheClearPolicy: 'preserve',
    } as const;
    const first = await runtime.answerAppQuery(request);
    const extraRead = runtime.workspace.projectInputAuthority.captureExactFileContentRead(
      path.join(workspaceRoot, '__retained_root_planning_absent__.txt'),
    );
    const validateExtraRead = vi.spyOn(extraRead, 'validateObservedValue');
    const planner = runtime as unknown as {
      planOpenApp(options: unknown): {
        readonly planningReads: readonly (typeof extraRead)[];
        readonly [key: string]: unknown;
      };
    };
    const planOpenApp = planner.planOpenApp.bind(planner);
    vi.spyOn(planner, 'planOpenApp').mockImplementation((options) => {
      const plan = planOpenApp(options);
      return {
        ...plan,
        planningReads: Object.freeze([...plan.planningReads, extraRead]),
      };
    });
    const validateReceipt = vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'validate');

    const retained = await runtime.answerAppQuery(request);
    const receipt = semanticRuntimeAnalysisReceiptFor(retained);

    expect(retained.value).toBe(first.value);
    expect(validateReceipt).toHaveBeenCalledTimes(1);
    expect(validateExtraRead).toHaveBeenCalledTimes(1);
    expect(receipt?.projectInputReads.some((read) => read.readKey === extraRead.readKey)).toBe(true);
  });

  test('validates a committed retained direct-app answer exactly once', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:retained-direct-app',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const app = await runtime.openApp({ projectKey: 'app' });
    const query = {
      kind: SemanticAppQueryKind.Summary,
      inquiryProfile: 'mcp-orientation',
    } as const;
    const first = app.ask(query);
    const validateReceipt = vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'validate');

    const retained = app.ask(query);

    expect(retained.value).toBe(first.value);
    expect(validateReceipt).toHaveBeenCalledTimes(1);
    const profile = app.cacheSummary(8, false).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );
    expect(profile?.queryClaims.retainedAnswerHits).toBe(1);
  });

  test('reuses a provisional child inside one batch and validates only the aggregate receipt', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:provisional-batch-reuse',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const validateReceipt = vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'validate');
    const validateAppGeneration = vi.spyOn(AureliaAppWorldProjectGeneration.prototype, 'isCurrent');

    const result = await runtime.answerAppQueries({
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
      includeAppQueryClaimProfiles: true,
      queries: [
        { kind: SemanticAppQueryKind.Summary },
        { kind: SemanticAppQueryKind.Summary },
      ],
    });

    expect(result.value.rows[1]?.answer.value).toBe(result.value.rows[0]?.answer.value);
    const profile = result.value.appQueryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );
    expect(profile?.queryClaims.retainedAnswerHits).toBe(1);
    expect(validateReceipt).toHaveBeenCalledTimes(1);
    expect(validateAppGeneration).not.toHaveBeenCalled();
  });

  test('composes invocation-local reads into same-token provisional reuse', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:provisional-invocation-reads',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const extraRead = runtime.workspace.projectInputAuthority.captureExactFileContentRead(
      path.join(workspaceRoot, '__provisional_reuse_absent__.txt'),
    );
    const validateExtraRead = vi.spyOn(extraRead, 'validateObservedValue');
    interface RuntimeQueryInputForTest {
      readonly queryKind: string;
      readonly planningReads?: readonly (typeof extraRead)[];
      readonly [key: string]: unknown;
    }
    interface RuntimeInternalsForTest {
      answerRuntimeQuery(
        input: RuntimeQueryInputForTest,
        materialize: (transaction: unknown) => unknown,
        enclosingTransaction?: unknown,
      ): unknown;
      composeRetainedAnalysisReceipt(
        owner: SemanticRuntimeAnalysisReceiptBuilder,
        lease: QueryClaimAnswerLease,
      ): SemanticRuntimeAnalysisReceipt;
    }
    const internals = runtime as unknown as RuntimeInternalsForTest;
    const answerRuntimeQuery = internals.answerRuntimeQuery.bind(internals);
    let summaryChildCalls = 0;
    vi.spyOn(internals, 'answerRuntimeQuery').mockImplementation((input, materialize, enclosingTransaction) => {
      if (enclosingTransaction != null && input.queryKind === SemanticAppQueryKind.Summary) {
        summaryChildCalls += 1;
        if (summaryChildCalls === 2) {
          return answerRuntimeQuery({
            ...input,
            planningReads: [...(input.planningReads ?? []), extraRead],
          }, materialize, enclosingTransaction);
        }
      }
      return answerRuntimeQuery(input, materialize, enclosingTransaction);
    });
    const composeRetained = internals.composeRetainedAnalysisReceipt.bind(internals);
    const historicalReceipts: SemanticRuntimeAnalysisReceipt[] = [];
    const composedReceipts: SemanticRuntimeAnalysisReceipt[] = [];
    vi.spyOn(internals, 'composeRetainedAnalysisReceipt').mockImplementation((owner, lease) => {
      historicalReceipts.push(lease as SemanticRuntimeAnalysisReceipt);
      const composed = composeRetained(owner, lease);
      composedReceipts.push(composed);
      return composed;
    });
    const validateReceipt = vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'validate');
    const unsupportedSummary = {
      kind: SemanticAppQueryKind.Summary,
      sourceFile: { filePath: 'src/main.ts' },
    } as const;

    const result = await runtime.answerAppQueries({
      inquiryProfile: 'mcp-orientation',
      queries: [unsupportedSummary, unsupportedSummary],
    });
    const firstChild = result.value.rows[0]?.answer;
    const secondChild = result.value.rows[1]?.answer;
    const outerReceipt = semanticRuntimeAnalysisReceiptFor(result);
    const firstChildReceipt = firstChild == null ? null : semanticRuntimeAnalysisReceiptFor(firstChild);
    const secondChildReceipt = secondChild == null ? null : semanticRuntimeAnalysisReceiptFor(secondChild);
    const historicalReceipt = historicalReceipts[0];
    const composedReceipt = composedReceipts[0];
    const hasExtraRead = (receipt: SemanticRuntimeAnalysisReceipt | null | undefined): boolean =>
      receipt?.projectInputReads.some((read) => read.readKey === extraRead.readKey) === true;

    expect(summaryChildCalls).toBe(2);
    expect(secondChild?.value).toBe(firstChild?.value);
    expect(historicalReceipts).toHaveLength(1);
    expect(composedReceipts).toHaveLength(1);
    expect(validateReceipt).toHaveBeenCalledTimes(1);
    expect(validateExtraRead).toHaveBeenCalledTimes(1);
    expect(hasExtraRead(historicalReceipt)).toBe(false);
    expect(hasExtraRead(firstChildReceipt)).toBe(false);
    expect(hasExtraRead(composedReceipt)).toBe(true);
    expect(hasExtraRead(secondChildReceipt)).toBe(true);
    expect(hasExtraRead(outerReceipt)).toBe(true);
    expect(secondChildReceipt).not.toBe(composedReceipt);
    expect(historicalReceipt?.isRuntimeIncarnationCurrent()).toBe(true);
    expect(composedReceipt?.isRuntimeIncarnationCurrent()).toBe(false);
    expect(firstChildReceipt?.isRuntimeIncarnationCurrent()).toBe(true);
    expect(secondChildReceipt?.isRuntimeIncarnationCurrent()).toBe(true);
    expect(outerReceipt?.isRuntimeIncarnationCurrent()).toBe(true);
  });

  test('closes a multi-group commit before deferred release callbacks can reenter it', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:commit-release-isolation',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const transaction = new SemanticAnswerTransaction();
    const builder = runtime.createAnalysisReceiptBuilder(transaction);
    const boundary = transaction.boundaryFor(builder);
    const groupsSettled: string[] = [];
    let releaseObservation: { readonly settled: readonly string[]; readonly rollbackError: string | null } | null = null;
    const firstGroup = Object.freeze({ group: 'first' });
    const secondGroup = Object.freeze({ group: 'second' });
    const handle = (
      name: string,
      commitGroup: object,
      onSettle?: (deferDisposal?: QueryClaimAnswerDisposalCollector) => void,
    ): QueryClaimProvisionalAnswerHandle => ({
      commitGroup,
      publish: () => {},
      rollback: () => {},
      settleCommit: (deferDisposal) => {
        groupsSettled.push(name);
        onSettle?.(deferDisposal);
      },
    });
    boundary.enlistProvisionalAnswer(handle('first', firstGroup, (deferDisposal) => {
      deferDisposal?.(() => {
        let rollbackError: string | null = null;
        try {
          transaction.rollback();
        } catch (error) {
          rollbackError = error instanceof Error ? error.message : String(error);
        }
        releaseObservation = {
          settled: [...groupsSettled],
          rollbackError,
        };
      });
    }));
    boundary.enlistProvisionalAnswer(handle('second', secondGroup));
    const rootReceipt = builder.seal();
    boundary.didValidateAnswerLease(rootReceipt);

    transaction.commit();

    expect(groupsSettled).toEqual(['first', 'second']);
    expect(releaseObservation).toEqual({
      settled: ['first', 'second'],
      rollbackError: expect.stringMatching(/committed semantic answer transaction/i),
    });
    rootReceipt.dispose();
    runtime.releaseAnalysisReceiptBuilder(builder);
  });

  test('reports root-proof mutation after validation as nominal answer currentness', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:proof-mutated-after-validation',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const transaction = new SemanticAnswerTransaction();
    const builder = runtime.createAnalysisReceiptBuilder(transaction);
    const receipt = builder.seal();
    transaction.boundaryFor(builder).didValidateAnswerLease(receipt);
    builder.readSourceText(path.join(workspaceRoot, 'src/main.ts'));

    let failure: unknown;
    try {
      transaction.commit();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(SemanticRuntimeAnalysisCurrentnessError);
    expect(isSemanticRuntimeAnalysisCurrentnessError(failure) && failure.reason).toBe('answer-proof-changed');
    receipt.dispose();
    runtime.releaseAnalysisReceiptBuilder(builder);
  });

  test('reports runtime-lifetime revocation after validation as nominal analysis currentness', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:lifetime-revoked-after-validation',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const transaction = new SemanticAnswerTransaction();
    const builder = runtime.createAnalysisReceiptBuilder(transaction);
    const receipt = builder.seal();
    transaction.boundaryFor(builder).didValidateAnswerLease(receipt);
    runtime.clearAnalysisCache({ typeSystemDependencyCacheClearPolicy: 'preserve' });

    let failure: unknown;
    try {
      transaction.commit();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(SemanticRuntimeAnalysisCurrentnessError);
    expect(isSemanticRuntimeAnalysisCurrentnessError(failure) && failure).toMatchObject({
      reason: 'analysis-lifetime-changed',
      invalidGenerationKeys: ['semantic-runtime-analysis-lifetime'],
    });
    receipt.dispose();
    runtime.releaseAnalysisReceiptBuilder(builder);
  });

  test('does not classify answer-transaction phase invariants as semantic currentness', () => {
    let failure: unknown;
    try {
      new SemanticAnswerTransaction().commit();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect(isSemanticRuntimeAnalysisCurrentnessError(failure)).toBe(false);
  });

  test('validates an ordinary cache summary once instead of once per profile field', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:cache-summary-currentness',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const app = await runtime.openApp({ projectKey: 'app' });
    const requireAppGeneration = vi.spyOn(AureliaAppWorldProjectGeneration.prototype, 'requireCurrent');

    app.cacheSummary(8, false);

    expect(requireAppGeneration).toHaveBeenCalledTimes(1);
  });

  test('captures each cache-overview app and query-claim graph once', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:cache-overview-currentness',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.Summary,
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
    });
    await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.Summary,
      projectKey: 'app',
      inquiryProfile: 'lsp-cursor',
      appRetention: 'retain-app',
    });
    const validateAppGeneration = vi.spyOn(AureliaAppWorldProjectGeneration.prototype, 'isCurrent');
    const inspectQueryClaims = vi.spyOn(QueryClaimGraph.prototype, 'inspect');

    const overview = runtime.analysisCacheOverview({ includeQueryClaimRows: true, rowLimit: 8 }).value;

    const cachedApp = overview.cachedApps[0];
    const defaultProfile = cachedApp?.queryClaimProfiles.find(
      ({ inquiryProfile }) => inquiryProfile === cachedApp.profile.inquiryProfile,
    );
    expect(validateAppGeneration).toHaveBeenCalledTimes(1);
    expect(inspectQueryClaims).toHaveBeenCalledTimes(
      (cachedApp?.queryClaimProfiles.length ?? 0) + overview.runtimeQueryClaimProfiles.length,
    );
    expect(overview.runtimeQueryClaimProfiles.length).toBeGreaterThan(1);
    expect(cachedApp?.queryClaimProfiles.length).toBeGreaterThan(1);
    expect(cachedApp?.queryClaims).toEqual(defaultProfile?.queryClaims);
    expect(cachedApp?.queryClaims).not.toBe(defaultProfile?.queryClaims);
    expect([
      ...overview.runtimeQueryClaimProfiles,
      ...(cachedApp?.queryClaimProfiles ?? []),
    ].every((profile) => profile.queryClaimRows != null && profile.queryClaimRows.length <= 8)).toBe(true);
  });

  test('reuses one routed-query cache preflight but keeps direct app opens independently validated', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:warm-cache-preflight',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const request = {
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
      includeAppProfile: true,
      queries: [{ kind: SemanticAppQueryKind.Summary }],
    } as const;
    const runtimeInternals = runtime as unknown as {
      readCachedApp: (...args: unknown[]) => unknown;
    };
    const readCachedApp = vi.spyOn(runtimeInternals, 'readCachedApp');
    await runtime.answerAppQueries(request);
    expect(readCachedApp).toHaveBeenCalledTimes(1);
    readCachedApp.mockClear();
    const validateAppGeneration = vi.spyOn(AureliaAppWorldProjectGeneration.prototype, 'isCurrent');
    const validateReceipt = vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'validate');

    const result = await runtime.answerAppQueries(request);

    expect(result.result).toBe('answered');
    expect(readCachedApp).toHaveBeenCalledTimes(1);
    expect(validateAppGeneration).toHaveBeenCalledTimes(1);
    expect(validateReceipt).toHaveBeenCalledTimes(2);

    validateAppGeneration.mockClear();
    readCachedApp.mockClear();
    await runtime.openApp({ projectKey: 'app' });
    expect(readCachedApp).toHaveBeenCalledTimes(1);
    expect(validateAppGeneration).toHaveBeenCalledTimes(1);
  });

  test('rejects unrelated cache variants cheaply and validates one compatible deeper app', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:cache-variant-selection',
      projects: [
        { projectKey: 'first', rootDir: workspaceRoot },
        { projectKey: 'second', rootDir: workspaceRoot },
      ],
    });
    const second = await runtime.openApp({ projectKey: 'second' });
    const validateSecond = vi.spyOn(second, 'isCurrent');

    await runtime.openApp({ projectKey: 'first', analysisDepth: 'runtime-topology' });

    // The unrelated cached app is touched only by post-publication stale retirement, not either cache lookup.
    expect(validateSecond).toHaveBeenCalledTimes(1);
    const deep = await runtime.openApp({ projectKey: 'first', analysisDepth: 'binding-observation' });
    validateSecond.mockClear();
    const validateDeep = vi.spyOn(deep, 'isCurrent');

    const compatible = await runtime.openApp({ projectKey: 'first', analysisDepth: 'runtime-topology' });

    expect(compatible).toBe(deep);
    expect(validateDeep).toHaveBeenCalledTimes(1);
    expect(validateSecond).not.toHaveBeenCalled();
  });

  test('keeps one project retained claims and continuations across another project cache miss', async () => {
    const { workspaceRoot, firstRoot, secondRoot } = await createTwoProjectWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:project-cache-isolation',
      projects: [
        { projectKey: 'first', rootDir: firstRoot },
        { projectKey: 'second', rootDir: secondRoot },
      ],
    });
    const firstShallow = await runtime.openApp({
      projectKey: 'first',
      analysisDepth: 'runtime-topology',
    });
    const second = await runtime.openApp({ projectKey: 'second' });
    const query = {
      kind: SemanticAppQueryKind.Summary,
      inquiryProfile: 'mcp-orientation',
    } as const;
    const initial = second.ask(query);
    const before = second.cacheSummary(8, true).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );

    expect(initial.continuations?.length).toBeGreaterThan(0);
    expect(before?.queryClaims).toMatchObject({
      retainedRecords: 1,
      retainedAnswerValues: 1,
      retainedAnswerHits: 0,
    });

    const first = await runtime.openApp({
      projectKey: 'first',
      analysisDepth: 'binding-observation',
    });
    const afterMiss = second.cacheSummary(8, true).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );

    expect(runtime.sessionAnalysisCacheOverview().value.cachedAppCount).toBe(2);
    expect(first).not.toBe(firstShallow);
    expect(firstShallow.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
    expect(afterMiss?.queryClaims).toMatchObject({
      retainedRecords: before?.queryClaims.retainedRecords,
      retainedAnswerValues: before?.queryClaims.retainedAnswerValues,
      retainedAnswerHits: before?.queryClaims.retainedAnswerHits,
    });
    expect(afterMiss?.queryClaimRows).toEqual(before?.queryClaimRows);

    const retained = second.ask(query);
    const afterReuse = second.cacheSummary(8, false).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );
    expect(retained.value).toBe(initial.value);
    expect(retained.continuations).toBe(initial.continuations);
    expect(afterReuse?.queryClaims.retainedAnswerHits).toBe(1);

    const cleared = runtime.sessionAnalysisCacheClear().value;
    expect(cleared).toMatchObject({
      disposedCachedApps: 2,
      remainingCachedApps: 0,
    });
    expect(cleared.disposedQueryClaimRecords).toBeGreaterThan(0);
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(false);
  });

  test('reclaims only the replaced project RetainInOwnerEpoch kernel answer state', async () => {
    const { workspaceRoot, firstRoot, secondRoot } = await createTwoProjectWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:project-kernel-answer-isolation',
      projects: [
        { projectKey: 'first', rootDir: firstRoot },
        { projectKey: 'second', rootDir: secondRoot },
      ],
    });
    const store = runtime.workspace.store;
    const query = {
      kind: SemanticAppQueryKind.Summary,
      inquiryProfile: 'mcp-authoring',
    } as const;
    const firstShallow = await runtime.openApp({
      projectKey: 'first',
      analysisDepth: 'runtime-topology',
    });
    const firstAnswerRecord = new SourceFileAddress(
      store.handles.address('answer-local:first'),
      'answer-local:first',
      'first-answer.html',
      SourceLanguage.Html,
    );
    const readFirstSummary = firstShallow.summary.bind(firstShallow);
    const firstSummary = vi.spyOn(firstShallow, 'summary').mockImplementation(() => {
      store.commit(new KernelStoreBatch([firstAnswerRecord], 'first answer-local materialization'));
      return readFirstSummary();
    });
    const firstAnswer = firstShallow.ask(query);
    firstSummary.mockRestore();

    const second = await runtime.openApp({ projectKey: 'second' });
    const secondAnswerRecord = new SourceFileAddress(
      store.handles.address('answer-local:second'),
      'answer-local:second',
      'second-answer.html',
      SourceLanguage.Html,
    );
    const readSecondSummary = second.summary.bind(second);
    const secondSummary = vi.spyOn(second, 'summary').mockImplementation(() => {
      store.commit(new KernelStoreBatch([secondAnswerRecord], 'second answer-local materialization'));
      return readSecondSummary();
    });
    const secondAnswer = second.ask(query);
    secondSummary.mockRestore();
    const secondReceipt = semanticRuntimeAnalysisReceiptFor(secondAnswer);
    const secondBefore = second.cacheSummary(8, true).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-authoring',
    );

    expect(firstAnswer.continuations?.length).toBeGreaterThan(0);
    expect(secondAnswer.continuations?.length).toBeGreaterThan(0);
    expect(secondBefore?.queryClaims).toMatchObject({
      retentionKind: 'retain-for-app-epoch',
      answerLocalKernelPolicy: 'retain-in-owner-epoch',
      retainedRecords: 1,
    });
    expect(secondBefore?.queryClaimRows).toContainEqual(expect.objectContaining({
      queryKind: SemanticAppQueryKind.Summary,
      kernelRecordDelta: 1,
      disposedKernelRecords: 0,
    }));
    expect(store.read(firstAnswerRecord.handle)).toBe(firstAnswerRecord);
    expect(store.read(secondAnswerRecord.handle)).toBe(secondAnswerRecord);
    expect(secondReceipt?.isCurrent()).toBe(true);

    const firstDeep = await runtime.openApp({
      projectKey: 'first',
      analysisDepth: 'binding-observation',
    });
    const secondAfter = second.cacheSummary(8, true).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-authoring',
    );

    expect(firstDeep).not.toBe(firstShallow);
    expect(firstShallow.isCurrent()).toBe(false);
    expect(store.read(firstAnswerRecord.handle)).toBeNull();
    expect(second.isCurrent()).toBe(true);
    expect(secondReceipt?.isCurrent()).toBe(true);
    expect(store.read(secondAnswerRecord.handle)).toBe(secondAnswerRecord);
    expect(secondAfter?.queryClaims).toEqual(secondBefore?.queryClaims);
    expect(secondAfter?.queryClaimRows).toEqual(secondBefore?.queryClaimRows);

    const cleared = runtime.sessionAnalysisCacheClear().value;
    expect(cleared).toMatchObject({ disposedCachedApps: 2, remainingCachedApps: 0 });
    expect(store.read(secondAnswerRecord.handle)).toBeNull();
    expect(secondReceipt?.isCurrent()).toBe(false);
  });

  test('rolls back failed RetainInOwnerEpoch kernel materialization without touching prior answers', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:failed-kernel-answer-frame',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const app = await runtime.openApp({ projectKey: 'app' });
    const store = runtime.workspace.store;
    const retainedRecord = new SourceFileAddress(
      store.handles.address('answer-local:retained-before-failure'),
      'answer-local:retained',
      'retained-before-failure.html',
      SourceLanguage.Html,
    );
    const failedRecord = new SourceFileAddress(
      store.handles.address('answer-local:failed-frame'),
      'answer-local:failed',
      'failed-frame.html',
      SourceLanguage.Html,
    );
    const readSummary = app.summary.bind(app);
    const summary = vi.spyOn(app, 'summary').mockImplementation(() => {
      store.commit(new KernelStoreBatch([retainedRecord], 'retained answer before failure'));
      return readSummary();
    });
    app.ask({ kind: SemanticAppQueryKind.Summary, inquiryProfile: 'mcp-authoring' });
    summary.mockRestore();
    const retainedBefore = app.cacheSummary(8, true).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-authoring',
    );
    vi.spyOn(app, 'sourceFiles').mockImplementation(() => {
      store.commit(new KernelStoreBatch([failedRecord], 'failed answer-local frame'));
      throw new Error('injected answer failure');
    });

    expect(() => app.ask({
      kind: SemanticAppQueryKind.SourceFiles,
      inquiryProfile: 'mcp-authoring',
    })).toThrow('injected answer failure');

    const retainedAfter = app.cacheSummary(8, true).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-authoring',
    );
    expect(store.read(failedRecord.handle)).toBeNull();
    expect(store.read(retainedRecord.handle)).toBe(retainedRecord);
    expect(retainedAfter?.queryClaims).toMatchObject({
      retainedRecords: retainedBefore?.queryClaims.retainedRecords,
      createdRecords: (retainedBefore?.queryClaims.createdRecords ?? 0) + 1,
      failed: (retainedBefore?.queryClaims.failed ?? 0) + 1,
      disposed: (retainedBefore?.queryClaims.disposed ?? 0) + 1,
    });
    expect(retainedAfter?.queryClaimRows).toEqual(retainedBefore?.queryClaimRows);
  });

  test('keeps a nested retained-owner row outside an enclosing discard-after-answer cleanup', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:nested-kernel-answer-policy',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const app = await runtime.openApp({ projectKey: 'app' });
    const store = runtime.workspace.store;
    const outerRecord = new SourceFileAddress(
      store.handles.address('answer-local:outer-discard'),
      'answer-local:outer',
      'outer-discard.html',
      SourceLanguage.Html,
    );
    const nestedRecord = new SourceFileAddress(
      store.handles.address('answer-local:nested-retained'),
      'answer-local:nested',
      'nested-retained.html',
      SourceLanguage.Html,
    );
    const readSummary = app.summary.bind(app);
    const readSourceFiles = app.sourceFiles.bind(app);
    let nestedAnswer: ReturnType<typeof app.ask> | null = null;
    vi.spyOn(app, 'sourceFiles').mockImplementation((page, detail) => {
      store.commit(new KernelStoreBatch([nestedRecord], 'nested retained-owner answer'));
      return readSourceFiles(page, detail);
    });
    vi.spyOn(app, 'summary').mockImplementation(() => {
      store.commit(new KernelStoreBatch([outerRecord], 'outer discard-after-answer answer'));
      nestedAnswer = app.ask({
        kind: SemanticAppQueryKind.SourceFiles,
        inquiryProfile: 'mcp-authoring',
      });
      return readSummary();
    });

    app.ask({ kind: SemanticAppQueryKind.Summary, inquiryProfile: 'lsp-cursor' });

    expect(store.read(outerRecord.handle)).toBeNull();
    expect(store.read(nestedRecord.handle)).toBe(nestedRecord);
    expect(semanticRuntimeAnalysisReceiptFor(nestedAnswer)?.isCurrent()).toBe(true);
    expect(app.cacheSummary(8, true).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-authoring',
    )?.queryClaims).toMatchObject({
      retentionKind: 'retain-for-app-epoch',
      retainedRecords: 1,
    });

    runtime.sessionAnalysisCacheClear();
    expect(store.read(nestedRecord.handle)).toBeNull();
  });

  test('reuses an all-authoring app for a subset and rebuilds a finite subset for an all-source request', async () => {
    const workspaceRoot = pressureFixtureRoot('resource-registration-local-templates');
    const subsetSourceFile = path.join(workspaceRoot, 'src/local-templates-app.html');
    const allRuntime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:authoring-cache-all-to-subset',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const all = await allRuntime.openApp({
      projectKey: 'app',
      includeAuthoringTemplates: true,
    });

    const subsetFromAll = await allRuntime.openApp({
      projectKey: 'app',
      includeAuthoringTemplates: true,
      authoringTemplateSourceFiles: [subsetSourceFile],
      authoringTemplateLimit: 1,
    });

    expect(subsetFromAll).toBe(all);

    const subsetRuntime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:authoring-cache-subset-to-all',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const subset = await subsetRuntime.openApp({
      projectKey: 'app',
      includeAuthoringTemplates: true,
      authoringTemplateSourceFiles: [subsetSourceFile],
      authoringTemplateLimit: 1,
    });

    const rebuiltAll = await subsetRuntime.openApp({
      projectKey: 'app',
      includeAuthoringTemplates: true,
    });

    expect(rebuiltAll).not.toBe(subset);
    expect(subset.isCurrent()).toBe(false);
    expect(rebuiltAll.isCurrent()).toBe(true);
  }, 60_000);

  test('rejects an unwatched mutation after routed cache preflight before publishing claims', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const sourceFile = path.join(workspaceRoot, 'src/main.ts');
    const sourceText = await readFile(sourceFile, 'utf8');
    const overlay = new MutableSourceOverlay();
    overlay.write(sourceFile, sourceText);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:warm-cache-preflight-mutation',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const request = {
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
      includeAppProfile: true,
      queries: [{ kind: SemanticAppQueryKind.Summary }],
    } as const;
    await runtime.answerAppQueries(request);
    const before = runtime.analysisCacheOverview().value;
    const runtimeInternals = runtime as unknown as {
      readCachedApp: (...args: unknown[]) => unknown;
    };
    const readCachedApp = runtimeInternals.readCachedApp.bind(runtimeInternals);
    let mutationInjected = false;
    vi.spyOn(runtimeInternals, 'readCachedApp').mockImplementation((...args) => {
      const cachedApp = readCachedApp(...args);
      if (cachedApp != null && !mutationInjected) {
        mutationInjected = true;
        overlay.write(sourceFile, `${sourceText}\nexport const changedAfterCachePreflight = true;\n`);
      }
      return cachedApp;
    });

    let failure: unknown;
    try {
      await runtime.answerAppQueries(request);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(SemanticRuntimeAnalysisCurrentnessError);
    expect(isSemanticRuntimeAnalysisCurrentnessError(failure) && failure).toMatchObject({
      reason: 'query-answer-lease-changed',
      changedReadKeys: [authority.fileContentReadKey(sourceFile)],
      changedFacets: [SemanticRuntimeProjectInputReadKind.FileContent],
      changedSemanticFactKeys: [],
    });

    expect(mutationInjected).toBe(true);
    overlay.write(sourceFile, sourceText);
    const after = runtime.analysisCacheOverview().value;
    expect(retainedQueryClaimCounts(after.runtimeQueryClaimProfiles)).toEqual(
      retainedQueryClaimCounts(before.runtimeQueryClaimProfiles),
    );
    expectNoAdditionalRetainedQueryClaims(
      after.cachedApps[0]?.queryClaimProfiles ?? [],
      before.cachedApps[0]?.queryClaimProfiles ?? [],
    );
  });

  test('captures a selected default project only once during app-open planning', async () => {
    const workspaceRoot = pressureFixtureRoot('template-completion-member-metadata');
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:default-project-single-capture',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const captureProject = vi.spyOn(runtime.workspace.projectInputAuthority, 'capture');

    await runtime.openApp();

    expect(captureProject).toHaveBeenCalledTimes(1);
  });

  test('reports every non-app default candidate without recapturing it for the failure summary', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:default-project-non-app-summary',
      projects: [
        { projectKey: 'first', rootDir: workspaceRoot },
        { projectKey: 'second', rootDir: workspaceRoot },
      ],
    });
    const captureProject = vi.spyOn(runtime.workspace.projectInputAuthority, 'capture');

    await expect(runtime.openApp()).rejects.toThrow(/project shapes: non-aurelia=2/);

    expect(captureProject).toHaveBeenCalledTimes(2);
  });

  test('rolls back nested query claims when an input mutates before the root proof', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const sourceFile = path.join(workspaceRoot, 'src/main.ts');
    const sourceText = await readFile(sourceFile, 'utf8');
    const overlay = new MutableSourceOverlay();
    overlay.write(sourceFile, sourceText);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:root-proof-rollback',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const observeReceipt = runtime.observeAnalysisReceipt.bind(runtime);
    let mutationInjected = false;
    const observeReceiptSpy = vi.spyOn(runtime, 'observeAnalysisReceipt').mockImplementation((owner, lease) => {
      const receipt = observeReceipt(owner, lease);
      if (!mutationInjected) {
        mutationInjected = true;
        overlay.write(sourceFile, `${sourceText}\nexport const changedBeforeRootProof = true;\n`);
      }
      return receipt;
    });

    await expect(runtime.answerAppQuery({
      kind: SemanticAppQueryKind.Summary,
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
    })).rejects.toThrow(/no longer current/);
    expect(mutationInjected).toBe(true);

    const failedProfile = runtime.analysisCacheOverview({
      includeQueryClaimRows: true,
      rowLimit: 8,
    }).value.runtimeQueryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );
    expect(failedProfile?.queryClaims.retainedRecords).toBe(0);

    overlay.write(sourceFile, sourceText);
    observeReceiptSpy.mockRestore();
    await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.Summary,
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
    });

    const retriedAppProfile = runtime.analysisCacheOverview({
      includeQueryClaimRows: true,
      rowLimit: 8,
    }).value.cachedApps[0]?.queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );
    expect(retriedAppProfile?.queryClaims.retainedAnswerHits).toBe(0);
  });

  test('keeps failed-child reads but rolls back the caught nested claim savepoint', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const failureOnlyFile = path.join(workspaceRoot, 'failure-only.txt');
    await writeFile(failureOnlyFile, 'read only by the failed nested answer\n', 'utf8');
    const authority = new SemanticRuntimeProjectInputAuthority();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:caught-nested-savepoint',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const app = await runtime.openApp({ projectKey: 'app' });
    const fallbackDiagnostics = app.ask({
      kind: SemanticAppQueryKind.AppDiagnosticSummary,
      inquiryProfile: 'exploration',
      page: { size: 5 },
    });
    const failureOnlyRead = authority.captureExactFileContentRead(failureOnlyFile);
    const sealReceipt = runtime.sealAnalysisReceipt.bind(runtime);
    const observeReceipt = runtime.observeAnalysisReceipt.bind(runtime);
    const ask = app.ask.bind(app);
    let insideFailingChild = false;
    let caughtNestedFailure = false;

    vi.spyOn(runtime, 'sealAnalysisReceipt').mockImplementation((builder, generations, additionalReads = []) =>
      sealReceipt(
        builder,
        generations,
        insideFailingChild ? [...additionalReads, failureOnlyRead] : additionalReads,
      )
    );
    vi.spyOn(runtime, 'observeAnalysisReceipt').mockImplementation((owner, lease) => {
      const receipt = observeReceipt(owner, lease);
      if (insideFailingChild) {
        throw new Error('caught nested observation failure');
      }
      return receipt;
    });
    vi.spyOn(app, 'ask').mockImplementation((query, pagePolicy) => {
      if (
        query.kind === SemanticAppQueryKind.AppDiagnosticSummary
        && query.inquiryProfile == null
        && !caughtNestedFailure
      ) {
        insideFailingChild = true;
        try {
          return ask(query, pagePolicy);
        } catch (error) {
          expect(error).toMatchObject({ message: 'caught nested observation failure' });
          caughtNestedFailure = true;
          return fallbackDiagnostics;
        } finally {
          insideFailingChild = false;
        }
      }
      return ask(query, pagePolicy);
    });

    const result = app.ask({
      kind: SemanticAppQueryKind.AppOverview,
      inquiryProfile: 'mcp-orientation',
      diagnosticPageSize: 5,
      openSeamPageSize: 5,
    });

    expect(result.result).toBe('answered');
    expect(caughtNestedFailure).toBe(true);
    const receipt = semanticRuntimeAnalysisReceiptFor(result);
    expect(receipt?.projectInputReads).toContain(failureOnlyRead);
    expect(receipt?.isCurrent()).toBe(true);
    const profile = app.cacheSummary(16, true).queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );
    expect(profile?.queryClaimRows?.some(
      (row) => row.queryKind === SemanticAppQueryKind.AppDiagnosticSummary,
    )).toBe(false);
  });

  test('rolls back fresh runtime and app claims when the post-publication hook throws', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:post-publication-hook-rollback',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const observeReceipt = runtime.observeAnalysisReceipt.bind(runtime);
    const observedLeases: SemanticRuntimeAnalysisReceipt[] = [];
    vi.spyOn(runtime, 'observeAnalysisReceipt').mockImplementation((owner, lease) => {
      observedLeases.push(lease as SemanticRuntimeAnalysisReceipt);
      return observeReceipt(owner, lease);
    });
    const disposalHost = runtime as unknown as {
      disposeRoutedAppAnswerSideEffects(): never;
    };
    vi.spyOn(disposalHost, 'disposeRoutedAppAnswerSideEffects').mockImplementation(() => {
      throw new Error('post-publication disposal failed');
    });

    await expect(runtime.answerAppQuery({
      kind: SemanticAppQueryKind.Summary,
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
    })).rejects.toThrow('post-publication disposal failed');

    expect(observedLeases).toHaveLength(2);
    expect(observedLeases.every((lease) => !lease.validate().isCurrent)).toBe(true);
    const overview = runtime.analysisCacheOverview({
      includeQueryClaimRows: true,
      rowLimit: 8,
    }).value;
    const runtimeProfile = overview.runtimeQueryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );
    const appProfile = overview.cachedApps[0]?.queryClaimProfiles.find(
      (candidate) => candidate.inquiryProfile === 'mcp-orientation',
    );
    expect(runtimeProfile?.queryClaims.retainedRecords).toBe(0);
    expect(appProfile?.queryClaims.retainedRecords).toBe(0);
  });

  test('keeps query-lease and detached-receipt validation off the source-world discovery path', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:source-world-validation-boundary',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const validateSourceWorld = vi.spyOn(SemanticSourceWorldInputReceipt.prototype, 'validate');

    const first = runtime.summary();
    const firstReceipt = semanticRuntimeAnalysisReceiptFor(first);
    expect(firstReceipt?.validate().isCurrent).toBe(true);

    const retained = runtime.summary();
    const retainedReceipt = semanticRuntimeAnalysisReceiptFor(retained);
    expect(retainedReceipt?.validate().isCurrent).toBe(true);
    expect(validateSourceWorld).not.toHaveBeenCalled();
  });

  test('projects a store-independent basis and replays cached project-shape reads exactly', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const firstRuntime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:first-store',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const secondRuntime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:second-store',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });

    const first = firstRuntime.summary();
    const second = secondRuntime.summary();
    const firstReceipt = semanticRuntimeAnalysisReceiptFor(first);
    expect(first.analysisBasis).toEqual(second.analysisBasis);
    expect(first.value.workspaceKey).toBe(firstRuntime.workspace.semanticWorkspaceKey);
    expect(first.value.workspaceKey).not.toBe(firstRuntime.workspace.workspaceKey);
    expect(firstReceipt?.isCurrent()).toBe(true);

    const sourceFile = path.join(workspaceRoot, 'src/main.ts');
    await writeFile(sourceFile, 'export const changed = true;\n', 'utf8');
    expect(firstReceipt?.isCurrent()).toBe(false);

    const refreshed = firstRuntime.summary();
    expect(refreshed.analysisBasis?.revision).not.toBe(first.analysisBasis?.revision);
    expect(semanticRuntimeAnalysisReceiptFor(refreshed)?.isCurrent()).toBe(true);
  });

  test('preserves a detached receipt across an equivalent source-world rebind', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:equivalent-rebind',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const answer = runtime.summary();
    const receipt = semanticRuntimeAnalysisReceiptFor(answer);
    const previousSourceWorld = runtime.workspace.sourceWorld;

    await writeFile(path.join(workspaceRoot, 'README.md'), '# Equivalent source-world churn\n', 'utf8');
    const currentness = previousSourceWorld.resolveCurrent();
    expect(currentness.kind).toBe(SemanticSourceWorldCurrentnessKind.EquivalentPlan);
    expect(currentness.sourceWorld.sourceWorldRevision).toBe(previousSourceWorld.sourceWorldRevision);

    runtime.rebindEquivalentSourceWorld(currentness.sourceWorld);
    expect(runtime.workspace.sourceWorld).toBe(currentness.sourceWorld);
    expect(receipt?.isCurrent()).toBe(true);
    expect(receipt?.basis).toEqual(answer.analysisBasis);
  });

  test('invalidates a prior exact read when a later validation callback advances a relevant input event', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const pushFile = path.join(workspaceRoot, 'a-push.ts');
    const pullFile = path.join(workspaceRoot, 'z-pull.ts');
    await writeFile(pushFile, 'export const pushed = true;\n', 'utf8');
    await writeFile(pullFile, 'export const pulled = true;\n', 'utf8');
    const authority = new SemanticRuntimeProjectInputAuthority(undefined, {
      authorityForRead: (descriptor) =>
        descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
          && path.normalize(descriptor.fileName).toLowerCase() === path.normalize(pushFile).toLowerCase()
          ? { mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }
          : null,
    });
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:reentrant-project-input-event',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const pushRead = authority.captureExactFileContentRead(pushFile);
    const pullRead = authority.captureExactFileContentRead(pullFile);
    expect(pushRead.currentnessAuthority.mode).toBe(SemanticRuntimeProjectInputCurrentnessMode.PushObserved);
    const builder = runtime.createAnalysisReceiptBuilder();
    builder.observeProjectInputReads([pushRead, pullRead]);
    const receipt = builder.seal();
    expect(receipt.projectInputReads.map((read) => read.readKey)).toEqual([
      pushRead.readKey,
      pullRead.readKey,
    ]);
    const validatePull = pullRead.validateObservedValue.bind(pullRead);
    vi.spyOn(pullRead, 'validateObservedValue').mockImplementation(() => {
      const validation = validatePull();
      authority.advance([
        new SemanticRuntimeProjectInputChange(
          SemanticRuntimeProjectInputChangeKind.FileValue,
          pushFile,
        ),
      ]);
      return validation;
    });

    const validation = receipt.validate();

    expect(validation).toMatchObject({
      isCurrent: false,
      changedReadKeys: [pushRead.readKey],
    });
    expect(pushRead.validateObservedValue().isCurrent).toBe(false);
  });

  test('invalidates when the runtime incarnation advances during exact-read validation', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const authority = new SemanticRuntimeProjectInputAuthority();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:lifetime-validation-toctou',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const read = authority.captureExactFileContentRead(path.join(workspaceRoot, 'src/main.ts'));
    const builder = runtime.createAnalysisReceiptBuilder();
    builder.observeProjectInputReads([read]);
    const receipt = builder.seal();
    const validateRead = read.validateObservedValue.bind(read);
    let cacheCleared = false;
    vi.spyOn(read, 'validateObservedValue').mockImplementation(() => {
      const validation = validateRead();
      if (!cacheCleared) {
        cacheCleared = true;
        runtime.clearAnalysisCache({ typeSystemDependencyCacheClearPolicy: 'preserve' });
      }
      return validation;
    });

    const validation = receipt.validate();

    expect(cacheCleared).toBe(true);
    expect(validation).toMatchObject({
      runtimeIncarnationCurrent: false,
      isCurrent: false,
    });
  });

  test('invalidates detached receipts on cache clear and mints a current later receipt', async () => {
    const workspaceRoot = await createShapeWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'analysis-receipt:cache-clear-lifetime',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const before = runtime.summary();
    const beforeReceipt = semanticRuntimeAnalysisReceiptFor(before);
    expect(beforeReceipt?.isCurrent()).toBe(true);

    runtime.clearAnalysisCache({ typeSystemDependencyCacheClearPolicy: 'preserve' });
    expect(beforeReceipt?.validate()).toMatchObject({
      isCurrent: false,
      runtimeIncarnationCurrent: false,
    });
    let failure: unknown;
    try {
      beforeReceipt?.assertCurrent();
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(SemanticRuntimeAnalysisCurrentnessError);
    expect(failure).toMatchObject({
      reason: 'analysis-lifetime-changed',
      answerLeaseKind: 'semantic-runtime-analysis-receipt/1',
      invalidGenerationKeys: ['semantic-runtime-analysis-lifetime'],
      changedReadKeys: [],
      changedFacets: [],
      changedSemanticFactKeys: [],
    });

    const after = runtime.summary();
    const afterReceipt = semanticRuntimeAnalysisReceiptFor(after);
    expect(afterReceipt?.isCurrent()).toBe(true);
    expect(after.analysisBasis).toEqual(before.analysisBasis);
  });

  test('keeps the exact proof detached after dispose-app and invalidates on an unwatched source edit', async () => {
    const fixtureRoot = pressureFixtureRoot('template-completion-member-metadata');
    const templateFile = path.join(fixtureRoot, 'src/app.html');
    const originalTemplate = await readFile(templateFile, 'utf8');
    const overlay = new MutableSourceOverlay();
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'analysis-receipt:detached-dispose-app',
      projectInputAuthority: authority,
    });

    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppDiagnostics,
      appRetention: 'dispose-app',
      typeSystemDependencyCacheClearPolicy: 'preserve',
    });
    const receipt = semanticRuntimeAnalysisReceiptFor(answer);
    expect(answer.analysisBasis).toBeDefined();
    expect(receipt?.isCurrent()).toBe(true);
    expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(0);

    overlay.write(templateFile, `${originalTemplate}\n<!-- unwatched change -->`);
    expect(receipt?.isCurrent()).toBe(false);
  }, 60_000);
});

function retainedQueryClaimCounts(
  profiles: readonly {
    readonly inquiryProfile: string;
    readonly queryClaims: { readonly retainedRecords: number };
  }[],
): readonly (readonly [string, number])[] {
  return profiles.map(({ inquiryProfile, queryClaims }) => [inquiryProfile, queryClaims.retainedRecords] as const);
}

function expectNoAdditionalRetainedQueryClaims(
  actual: readonly {
    readonly inquiryProfile: string;
    readonly queryClaims: { readonly retainedRecords: number };
  }[],
  before: readonly {
    readonly inquiryProfile: string;
    readonly queryClaims: { readonly retainedRecords: number };
  }[],
): void {
  const retainedBefore = new Map(retainedQueryClaimCounts(before));
  for (const { inquiryProfile, queryClaims } of actual) {
    expect(queryClaims.retainedRecords).toBeLessThanOrEqual(retainedBefore.get(inquiryProfile) ?? 0);
  }
}

class MutableSourceOverlay implements SemanticRuntimeSourceTextOverlay {
  private readonly sourceByPath = new Map<string, string>();

  readFile(fileName: string): string | undefined {
    return this.sourceByPath.get(path.resolve(fileName));
  }

  fileExists(fileName: string): boolean | undefined {
    return this.sourceByPath.has(path.resolve(fileName)) ? true : undefined;
  }

  write(fileName: string, sourceText: string): void {
    this.sourceByPath.set(path.resolve(fileName), sourceText);
  }
}

async function createShapeWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'semantic-analysis-receipt-'));
  temporaryRoots.push(workspaceRoot);
  await mkdir(path.join(workspaceRoot, 'src'), { recursive: true });
  await writeFile(path.join(workspaceRoot, 'package.json'), JSON.stringify({ name: 'receipt-shape' }), 'utf8');
  await writeFile(path.join(workspaceRoot, 'tsconfig.json'), JSON.stringify({ include: ['src/**/*.ts'] }), 'utf8');
  await writeFile(path.join(workspaceRoot, 'src/main.ts'), 'export const initial = true;\n', 'utf8');
  return workspaceRoot;
}

async function createTwoProjectWorkspace(): Promise<{
  readonly workspaceRoot: string;
  readonly firstRoot: string;
  readonly secondRoot: string;
}> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'semantic-analysis-receipt-projects-'));
  temporaryRoots.push(workspaceRoot);
  const projectRoots = await Promise.all(['first', 'second'].map(async (projectKey) => {
    const projectRoot = path.join(workspaceRoot, projectKey);
    await mkdir(path.join(projectRoot, 'src'), { recursive: true });
    await writeFile(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({ name: `receipt-shape-${projectKey}` }),
      'utf8',
    );
    await writeFile(
      path.join(projectRoot, 'tsconfig.json'),
      JSON.stringify({ include: ['src/**/*.ts'] }),
      'utf8',
    );
    await writeFile(
      path.join(projectRoot, 'src/main.ts'),
      `export const ${projectKey} = true;\n`,
      'utf8',
    );
    return projectRoot;
  }));
  const [firstRoot, secondRoot] = projectRoots;
  if (firstRoot == null || secondRoot == null) {
    throw new Error('Expected both project roots to be created.');
  }
  return { workspaceRoot, firstRoot, secondRoot };
}

function pressureFixtureRoot(fixtureName: string): string {
  const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  return path.join(packageRoot, 'fixtures/pressure', fixtureName);
}
