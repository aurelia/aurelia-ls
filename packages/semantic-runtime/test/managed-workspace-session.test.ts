import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  ManagedSemanticWorkspaceDisposedError,
  ManagedSemanticWorkspaceOperationStaleError,
  ManagedSemanticWorkspaceReentrantOperationError,
  ManagedSemanticWorkspaceSession,
  NodeSemanticRuntimeProjectInputHost,
  ProjectRootAdmissionOriginKind,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  SemanticRuntimeProjectInputCurrentnessMode,
  SemanticRuntimeProjectInputReadKind,
  SemanticSourceWorldCurrentnessKind,
  SemanticSourceWorldInputReceipt,
  SemanticRuntime,
  type ProjectRootAdmissionOrigin,
  type SemanticRuntimeSourceTextOverlay,
} from '../src/index.js';
import {
  ComputationReadValidationScope,
  type ComputationRead,
} from '../src/kernel/computation-lifecycle.js';
import {
  SemanticRuntimeProjectInputRead,
} from '../src/kernel/project-input.js';
import {
  AureliaAppWorldProjectGeneration,
} from '../src/configuration/app-analysis-computation.js';
import {
  SemanticRuntimeAnalysisReceipt,
  SemanticRuntimeAnalysisReceiptBuilder,
  semanticRuntimeAnalysisReceiptFor,
} from '../src/api/analysis-receipt.js';

const temporaryRoots: string[] = [];
const sessions: ManagedSemanticWorkspaceSession[] = [];

afterEach(async () => {
  await Promise.allSettled(sessions.splice(0).map((session) => session.dispose()));
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { force: true, recursive: true })));
  vi.restoreAllMocks();
});

describe('managed semantic workspace session', () => {
  test('singleflights initial boot and a concurrent fresh replacement', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const summaryRuntime = vi.spyOn(SemanticRuntime.prototype, 'summary');

    await Promise.all(Array.from({ length: 12 }, () =>
      session.run(({ runtime }) => runtime.summary().analysisBasis!.sourceWorldRevision)));
    const initiallyObserved = new Set(
      summaryRuntime.mock.contexts.slice(0, 12) as SemanticRuntime[],
    );
    const initialStoreKeys = [...initiallyObserved].map((runtime) => runtime.workspace.workspaceKey);

    expect(initiallyObserved.size).toBe(1);
    expect(new Set(initialStoreKeys).size).toBe(1);
    expect(initialStoreKeys[0]).toMatch(/^semantic-runtime-managed:[0-9a-z]+:incarnation:1$/);
    const initialRuntime = [...initiallyObserved][0]!;
    const clearInitialRuntime = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear');

    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');
    await Promise.all(Array.from({ length: 12 }, () =>
      session.run(({ runtime }) => runtime.summary().analysisBasis!.sourceWorldRevision)));
    const replacements = new Set(
      summaryRuntime.mock.contexts.slice(12, 24) as SemanticRuntime[],
    );
    const replacementStoreKeys = [...replacements].map((runtime) => runtime.workspace.workspaceKey);

    expect(replacements.size).toBe(1);
    expect([...replacements][0]).not.toBe(initialRuntime);
    expect(new Set(replacementStoreKeys).size).toBe(1);
    expect(replacementStoreKeys[0]).toMatch(/^semantic-runtime-managed:[0-9a-z]+:incarnation:2$/);
    expect(clearInitialRuntime).toHaveBeenCalledTimes(1);
    expect(clearInitialRuntime).toHaveBeenCalledWith();
  });

  test('keeps the current runtime and rebinds an equivalent source world onto its warm store', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const first = await captureRuntime(session);
    const current = await captureRuntime(session);

    expect(current.runtimeIdentity).toBe(first.runtimeIdentity);
    expect(current.storeIdentity).toBe(first.storeIdentity);
    expect(current.workspaceIdentity).toBe(first.workspaceIdentity);
    expect(current.sourceWorldIdentity).toBe(first.sourceWorldIdentity);
    expect(current.projectInputGenerationIdentity).toBe(first.projectInputGenerationIdentity);

    await writeWorkspaceFile(workspaceRoot, 'README.md', '# Irrelevant source-admission churn\n');
    const equivalent = await captureRuntime(session);

    expect(equivalent.runtimeIdentity).toBe(first.runtimeIdentity);
    expect(equivalent.workspaceIdentity).not.toBe(first.workspaceIdentity);
    expect(equivalent.storeIdentity).toBe(first.storeIdentity);
    expect(equivalent.storeKey).toBe(first.storeKey);
    expect(equivalent.sourceWorldIdentity).not.toBe(first.sourceWorldIdentity);
    expect(equivalent.sourceWorldRevision).toBe(first.sourceWorldRevision);
    expect(equivalent.projectInputGenerationIdentity).not.toBe(first.projectInputGenerationIdentity);
  });

  test('rebinds effective finding policy onto the warm runtime without replacing its store', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const configurationFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":1,"findings":{"aurelia.analysis.dynamic-registration-spread":"warning"}}',
    );
    const authority = new SemanticRuntimeProjectInputAuthority();
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    sessions.push(session);
    const before = await captureRuntime(session);

    await writeFile(
      configurationFile,
      '{"version":1,"findings":{"aurelia.analysis.dynamic-registration-spread":"off"}}',
    );
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        configurationFile,
      ),
    ]);
    const inventory = await session.run(({ runtime }) => runtime.nativeProjectConfigurations());
    const after = await captureRuntime(session);

    expect(after.runtimeIdentity).toBe(before.runtimeIdentity);
    expect(after.storeIdentity).toBe(before.storeIdentity);
    expect(after.storeKey).toBe(before.storeKey);
    expect(after.workspaceIdentity).not.toBe(before.workspaceIdentity);
    expect(after.sourceWorldRevision).toBe(before.sourceWorldRevision);
    expect(after.projectInputGenerationIdentity).not.toBe(before.projectInputGenerationIdentity);
    expect(inventory.value.rows).toEqual([expect.objectContaining({
      acceptedVersion: 1,
      applicationState: 'applied',
      effectiveFindingPolicies: [expect.objectContaining({
        ruleId: 'aurelia.analysis.dynamic-registration-spread',
        disposition: 'off',
        authority: 'project-configuration',
      })],
    })]);
  });

  test('owns source-world validation at managed ingress and egress, then revokes borrowed answer proof', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    await captureRuntime(session);
    const validateSourceWorld = vi.spyOn(SemanticSourceWorldInputReceipt.prototype, 'validate');
    let detachedReceipt: ReturnType<typeof semanticRuntimeAnalysisReceiptFor> = null;

    await session.run(({ runtime }) => {
      const answer = runtime.summary();
      detachedReceipt = semanticRuntimeAnalysisReceiptFor(answer);
      expect(detachedReceipt?.isCurrent()).toBe(true);
    });

    expect(validateSourceWorld).toHaveBeenCalledTimes(2);
    expect(detachedReceipt?.validate().isCurrent).toBe(false);
    expect(validateSourceWorld).toHaveBeenCalledTimes(2);
  });

  test('exposes the pinned source-world revision without requiring a semantic query', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const summary = vi.spyOn(SemanticRuntime.prototype, 'summary');

    const sourceWorldRevision = await session.run(({ sourceWorldRevision }) => sourceWorldRevision);

    expect(sourceWorldRevision).toMatch(/^semantic-source-world\/2:/);
    expect(summary).not.toHaveBeenCalled();
  });

  test('stale-rejects a zero-query operation whose pinned source world changes before egress', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const entered = deferred<string>();
    const release = deferred<void>();
    const operation = session.run(async ({ sourceWorldRevision }) => {
      entered.resolve(sourceWorldRevision);
      await release.promise;
      return sourceWorldRevision;
    });
    const pinnedRevision = await entered.promise;

    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');
    release.resolve();

    await expect(operation).rejects.toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      previousSourceWorldRevision: pinnedRevision,
    });
  });

  test('keeps facade answers portable while transferring currentness only through runWithReceipt', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    let retainedAnswer: ReturnType<SemanticRuntime['summary']> | null = null;
    const returnedAnswer = await session.run(({ runtime }) => {
      const answer = runtime.summary();
      retainedAnswer = answer;
      expect(semanticRuntimeAnalysisReceiptFor(answer)?.isCurrent()).toBe(true);
      return answer;
    });
    expect(returnedAnswer.analysisBasis?.sourceWorldRevision).toBeDefined();
    expect(semanticRuntimeAnalysisReceiptFor(returnedAnswer)).toBeNull();
    expect(semanticRuntimeAnalysisReceiptFor(retainedAnswer!)).toBeNull();

    const baseline = await captureRuntime(session);
    const returnedBatch = await session.run(async ({ runtime }) => {
      const answer = await runtime.answerAppQueries({
        projectKey: baseline.projectKey,
        inquiryProfile: 'mcp-orientation',
        queries: [{ kind: SemanticAppQueryKind.Summary }],
      });
      expect(semanticRuntimeAnalysisReceiptFor(answer)?.isCurrent()).toBe(true);
      expect(semanticRuntimeAnalysisReceiptFor(answer.value.rows[0]!.answer)?.isCurrent()).toBe(true);
      return answer;
    });
    expect(semanticRuntimeAnalysisReceiptFor(returnedBatch)).toBeNull();
    expect(semanticRuntimeAnalysisReceiptFor(returnedBatch.value.rows[0]!.answer)).toBeNull();

    const completed = await session.runWithReceipt(({ runtime }) => {
      const answer = runtime.summary();
      return { answer, alias: { ...answer } };
    });
    expect(semanticRuntimeAnalysisReceiptFor(completed.value.answer)).toBeNull();
    expect(semanticRuntimeAnalysisReceiptFor(completed.value.alias)).toBeNull();
    await expect(session.run(({ tryAbsorbReceipt }) => tryAbsorbReceipt(completed.receipt))).resolves.toBe(true);
    completed.receipt.dispose();
  });

  test('composes one aggregate batch proof while revoking every nested answer carrier', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const createReceiptBuilder = SemanticRuntime.prototype.createAnalysisReceiptBuilder;
    const observeReceipt = SemanticRuntimeAnalysisReceiptBuilder.prototype.observeReceipt;
    let operationBuilder: SemanticRuntimeAnalysisReceiptBuilder | null = null;
    let operationReceiptObservations = 0;
    vi.spyOn(SemanticRuntime.prototype, 'createAnalysisReceiptBuilder').mockImplementation(function (
      this: SemanticRuntime,
      transaction = null,
    ) {
      const builder = createReceiptBuilder.call(this, transaction);
      if (transaction == null && operationBuilder == null) {
        operationBuilder = builder;
      }
      return builder;
    });
    vi.spyOn(SemanticRuntimeAnalysisReceiptBuilder.prototype, 'observeReceipt').mockImplementation(function (
      this: SemanticRuntimeAnalysisReceiptBuilder,
      receipt,
    ) {
      if (this === operationBuilder) {
        operationReceiptObservations += 1;
      }
      return observeReceipt.call(this, receipt);
    });
    let rootReceipt: ReturnType<typeof semanticRuntimeAnalysisReceiptFor> = null;
    let childReceipt: ReturnType<typeof semanticRuntimeAnalysisReceiptFor> = null;

    await session.run(async ({ runtime }) => {
      const answer = await runtime.answerAppQueries({
        projectKey: baseline.projectKey,
        inquiryProfile: 'mcp-orientation',
        queries: [{ kind: SemanticAppQueryKind.Summary }],
      });
      rootReceipt = semanticRuntimeAnalysisReceiptFor(answer);
      childReceipt = semanticRuntimeAnalysisReceiptFor(answer.value.rows[0]!.answer);
      expect(rootReceipt?.isCurrent()).toBe(true);
      expect(childReceipt?.isCurrent()).toBe(true);
    });

    expect(operationReceiptObservations).toBe(1);
    expect(rootReceipt?.validate().isCurrent).toBe(false);
    expect(childReceipt?.validate().isCurrent).toBe(false);
  });

  test('shares routed capture and cache-preflight pulls while keeping claim and egress proofs fresh', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const request = {
      kind: SemanticAppQueryKind.Summary,
      projectKey: baseline.projectKey,
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
      typeSystemDependencyCacheClearPolicy: 'preserve',
    } as const;
    await session.run(({ runtime }) => runtime.answerAppQuery(request));

    const captureProjectInput = SemanticRuntimeProjectInputAuthority.prototype.capture;
    const validateAppGeneration = AureliaAppWorldProjectGeneration.prototype.isCurrent;
    const validateInScope = ComputationReadValidationScope.prototype.validate;
    const validatePullRead = SemanticRuntimeProjectInputRead.prototype.validate;
    const validateObservedValue = SemanticRuntimeProjectInputRead.prototype.validateObservedValue;
    const validateReceipt = SemanticRuntimeAnalysisReceipt.prototype.validate;
    const assertReceiptCurrent = SemanticRuntimeAnalysisReceipt.prototype.assertCurrent;
    const captureScopes: (ComputationReadValidationScope | undefined)[] = [];
    const cacheCurrentnessScopes: (ComputationReadValidationScope | undefined)[] = [];
    const captureRequests = new Set<string>();
    const cacheCurrentnessRequests = new Set<string>();
    const pullValidationsByIdentity = new Map<string, number>();
    const receiptObservationsByIdentity = new Map<
      string,
      { executions: number; receipts: Set<SemanticRuntimeAnalysisReceipt> }
    >();
    const validatedReceipts: SemanticRuntimeAnalysisReceipt[] = [];
    const receiptBoundaries = new Map<SemanticRuntimeAnalysisReceipt, 'query-claim' | 'managed-egress'>();
    let validationPhase: 'capture' | 'cache-currentness' | null = null;
    let activeReceipt: SemanticRuntimeAnalysisReceipt | null = null;
    let activeReceiptBoundary: 'query-claim' | null = null;
    const readIdentity = (read: Pick<ComputationRead, 'domain' | 'readKey' | 'observedRevision'>): string =>
      `${read.domain}\0${read.readKey}\0${read.observedRevision}`;
    const increment = (counts: Map<string, number>, identity: string): void => {
      counts.set(identity, (counts.get(identity) ?? 0) + 1);
    };

    vi.spyOn(SemanticRuntimeProjectInputAuthority.prototype, 'capture').mockImplementation(function (
      this: SemanticRuntimeProjectInputAuthority,
      scope,
      validationScope,
    ) {
      captureScopes.push(validationScope);
      const previousPhase = validationPhase;
      validationPhase = 'capture';
      try {
        return captureProjectInput.call(this, scope, validationScope);
      } finally {
        validationPhase = previousPhase;
      }
    });
    vi.spyOn(AureliaAppWorldProjectGeneration.prototype, 'isCurrent').mockImplementation(function (
      this: AureliaAppWorldProjectGeneration,
      validationScope,
    ) {
      cacheCurrentnessScopes.push(validationScope);
      const previousPhase = validationPhase;
      validationPhase = 'cache-currentness';
      try {
        return validateAppGeneration.call(this, validationScope);
      } finally {
        validationPhase = previousPhase;
      }
    });
    vi.spyOn(ComputationReadValidationScope.prototype, 'validate').mockImplementation(function (
      this: ComputationReadValidationScope,
      read: ComputationRead,
    ) {
      if (
        read instanceof SemanticRuntimeProjectInputRead
        && read.currentnessAuthority.mode === SemanticRuntimeProjectInputCurrentnessMode.PullValidated
      ) {
        const identity = readIdentity(read);
        if (validationPhase === 'capture') {
          captureRequests.add(identity);
        } else if (validationPhase === 'cache-currentness') {
          cacheCurrentnessRequests.add(identity);
        }
      }
      return validateInScope.call(this, read);
    });
    vi.spyOn(SemanticRuntimeProjectInputRead.prototype, 'validate').mockImplementation(function (
      this: SemanticRuntimeProjectInputRead,
    ) {
      increment(pullValidationsByIdentity, readIdentity(this));
      return validatePullRead.call(this);
    });
    vi.spyOn(SemanticRuntimeProjectInputRead.prototype, 'validateObservedValue').mockImplementation(function (
      this: SemanticRuntimeProjectInputRead,
    ) {
      if (
        activeReceipt != null
        && this.currentnessAuthority.mode === SemanticRuntimeProjectInputCurrentnessMode.PullValidated
      ) {
        const identity = readIdentity(this);
        let observation = receiptObservationsByIdentity.get(identity);
        if (observation == null) {
          observation = { executions: 0, receipts: new Set() };
          receiptObservationsByIdentity.set(identity, observation);
        }
        observation.executions += 1;
        observation.receipts.add(activeReceipt);
      }
      return validateObservedValue.call(this);
    });
    vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'assertCurrent').mockImplementation(function (
      this: SemanticRuntimeAnalysisReceipt,
    ) {
      const previousBoundary = activeReceiptBoundary;
      activeReceiptBoundary = 'query-claim';
      try {
        return assertReceiptCurrent.call(this);
      } finally {
        activeReceiptBoundary = previousBoundary;
      }
    });
    vi.spyOn(SemanticRuntimeAnalysisReceipt.prototype, 'validate').mockImplementation(function (
      this: SemanticRuntimeAnalysisReceipt,
    ) {
      validatedReceipts.push(this);
      receiptBoundaries.set(this, activeReceiptBoundary ?? 'managed-egress');
      const previousReceipt = activeReceipt;
      activeReceipt = this;
      try {
        return validateReceipt.call(this);
      } finally {
        activeReceipt = previousReceipt;
      }
    });

    await session.run(({ runtime }) => runtime.answerAppQuery(request));

    expect(captureScopes).toHaveLength(1);
    expect(cacheCurrentnessScopes).toHaveLength(1);
    expect(captureScopes[0]).toBeInstanceOf(ComputationReadValidationScope);
    expect(cacheCurrentnessScopes[0]).toBe(captureScopes[0]);
    expect(validatedReceipts).toHaveLength(2);
    expect(new Set(validatedReceipts).size).toBe(2);
    expect(new Set(receiptBoundaries.values())).toEqual(new Set(['query-claim', 'managed-egress']));

    const sharedPullIdentities = [...captureRequests]
      .filter((identity) => cacheCurrentnessRequests.has(identity));
    expect(sharedPullIdentities.length).toBeGreaterThan(0);
    expect(sharedPullIdentities.every((identity) => pullValidationsByIdentity.get(identity) === 1)).toBe(true);
    const independentlyProvedIdentity = sharedPullIdentities.find((identity) => {
      const observation = receiptObservationsByIdentity.get(identity);
      return pullValidationsByIdentity.get(identity) === 1
        && observation?.executions === 2
        && observation.receipts.size === 2;
    });
    expect(independentlyProvedIdentity).toBeDefined();
  });

  test('mints a new non-reused store when source membership changes and cycles back', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);

    const addedFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/transient.ts',
      'export const transient = true;\n',
    );
    const added = await captureRuntime(session);
    await rm(addedFile);
    const reverted = await captureRuntime(session);

    expect(added.storeIdentity).not.toBe(baseline.storeIdentity);
    expect(reverted.storeIdentity).not.toBe(added.storeIdentity);
    expect(new Set([baseline.storeKey, added.storeKey, reverted.storeKey]).size).toBe(3);
    expect(storeIncarnationSequence(baseline.storeKey)).toBe(1);
    expect(storeIncarnationSequence(added.storeKey)).toBe(2);
    expect(storeIncarnationSequence(reverted.storeKey)).toBe(3);
    expect(added.sourceWorldRevision).not.toBe(baseline.sourceWorldRevision);
    expect(reverted.sourceWorldRevision).toBe(baseline.sourceWorldRevision);
    expect(added.projectInputAuthorityIdentity).toBe(baseline.projectInputAuthorityIdentity);
    expect(reverted.projectInputAuthorityIdentity).toBe(baseline.projectInputAuthorityIdentity);
    expect(added.projectInputGenerationRevision).not.toBe(baseline.projectInputGenerationRevision);
    expect(reverted.projectInputGenerationRevision).not.toBe(added.projectInputGenerationRevision);
  });

  test('pins an in-flight callback, types a stale callback failure with its cause, then publishes the replacement', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const entered = deferred<void>();
    const release = deferred<void>();
    let staleCallbackCalls = 0;
    let replacementCallbackCalls = 0;
    const callbackFailure = new Error('revoked project generation surfaced inside callback');

    const staleOperation = session.run(async ({ runtime }) => {
      staleCallbackCalls += 1;
      entered.resolve();
      await release.promise;
      throw callbackFailure;
    });
    await entered.promise;
    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');

    const replacementOperation = session.run(({ runtime }) => {
      replacementCallbackCalls += 1;
      return runtime.summary().analysisBasis!.sourceWorldRevision;
    });
    await yieldTurn();
    expect(replacementCallbackCalls).toBe(0);

    release.resolve();
    const staleError = await staleOperation.then(
      () => null,
      (error: unknown) => error,
    );
    expect(staleError).toBeInstanceOf(ManagedSemanticWorkspaceOperationStaleError);
    expect(staleError).toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      currentnessKind: SemanticSourceWorldCurrentnessKind.FreshBootRequired,
      previousSourceWorldRevision: baseline.sourceWorldRevision,
      cause: callbackFailure,
    });
    const replacementSourceWorldRevision = await replacementOperation;

    expect(staleCallbackCalls).toBe(1);
    expect(replacementCallbackCalls).toBe(1);
    expect(replacementSourceWorldRevision).not.toBe(baseline.sourceWorldRevision);
  });

  test('transfers nested source ownership through one fresh marker-root replacement and reuses it', async () => {
    const workspaceRoot = await createWorkspace();
    const nestedRoot = path.join(workspaceRoot, 'packages', 'feature');
    const nestedSource = await writeWorkspaceFile(
      nestedRoot,
      'src/feature.ts',
      'export const feature = true;\n',
    );
    await writeWorkspaceFile(workspaceRoot, 'package.json', '{"name":"workspace"}');
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const authority = new SemanticRuntimeProjectInputAuthority(undefined, {
      authorityForRead: () => ({ mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }),
    });
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      projectInputAuthority: authority,
    });
    sessions.push(session);
    const baseline = await captureRuntime(session);
    const baselineProject = capturedProjectForRoot(baseline, workspaceRoot);
    expect(baseline.projects).toHaveLength(1);
    expect(baselineProject.sourceFilePaths).toContain(path.normalize(nestedSource));

    const retireRuntime = vi.spyOn(SemanticRuntime.prototype, 'retireWorkspaceIncarnation');
    const clearRuntime = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear');
    const incumbentEntered = deferred<void>();
    const releaseIncumbent = deferred<void>();
    const incumbentOperation = session.run(async ({ runtime }) => {
      runtime.summary();
      incumbentEntered.resolve();
      await releaseIncumbent.promise;
      return 'incumbent';
    });
    await incumbentEntered.promise;

    const markerFile = await writeWorkspaceFile(nestedRoot, 'package.json', '{"name":"feature"}');
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.StructuralMembership,
        markerFile,
      ),
    ]);
    const replacementOperation = captureRuntime(session);
    await yieldTurn();

    releaseIncumbent.resolve();
    const staleError = await incumbentOperation.then(
      () => null,
      (error: unknown) => error,
    );
    expect(staleError).toBeInstanceOf(ManagedSemanticWorkspaceOperationStaleError);
    expect(staleError).toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'source-world-changed',
      currentnessKind: SemanticSourceWorldCurrentnessKind.FreshBootRequired,
      previousSourceWorldRevision: baseline.sourceWorldRevision,
    });

    const replacement = await replacementOperation;
    const stable = await captureRuntime(session);
    const replacementParent = capturedProjectForRoot(replacement, workspaceRoot);
    const replacementNested = capturedProjectForRoot(replacement, nestedRoot);
    expect(replacement.projects).toHaveLength(2);
    expect(replacementParent.sourceFilePaths).not.toContain(path.normalize(nestedSource));
    expect(replacementNested.sourceFilePaths).toContain(path.normalize(nestedSource));
    expect(replacementNested.admissionOrigins).toEqual([{
      kind: ProjectRootAdmissionOriginKind.PackageJsonMarker,
      sourceFilePath: path.normalize(markerFile),
      viaProjectRootHintDir: null,
    }]);
    expect(replacement.runtimeIdentity).not.toBe(baseline.runtimeIdentity);
    expect(replacement.storeIdentity).not.toBe(baseline.storeIdentity);
    expect(storeIncarnationSequence(replacement.storeKey)).toBe(2);
    expect(staleError).toMatchObject({
      nextSourceWorldRevision: replacement.sourceWorldRevision,
    });
    expect(stable.runtimeIdentity).toBe(replacement.runtimeIdentity);
    expect(stable.storeIdentity).toBe(replacement.storeIdentity);
    expect(stable.storeKey).toBe(replacement.storeKey);
    expect(stable.sourceWorldIdentity).toBe(replacement.sourceWorldIdentity);
    expect(retireRuntime.mock.contexts.filter((runtime) => runtime === baseline.runtimeIdentity)).toHaveLength(1);
    expect(clearRuntime.mock.contexts.filter((runtime) => runtime === baseline.runtimeIdentity)).toHaveLength(1);
  });

  test('drains every pinned operation before publishing an equivalent warm rebind', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const firstEntered = deferred<void>();
    const secondEntered = deferred<void>();
    const releaseFirst = deferred<void>();
    const releaseSecond = deferred<void>();

    const first = session.run(async () => {
      firstEntered.resolve();
      await releaseFirst.promise;
      return 'first';
    });
    const second = session.run(async () => {
      secondEntered.resolve();
      await releaseSecond.promise;
      return 'second';
    });
    await Promise.all([firstEntered.promise, secondEntered.promise]);
    await writeWorkspaceFile(workspaceRoot, 'README.md', '# Equivalent while pinned\n');

    let replacementCalls = 0;
    const replacement = session.run(({ runtime }) => {
      replacementCalls += 1;
      return runtime.summary().analysisBasis!.sourceWorldRevision;
    });
    await yieldTurn();
    expect(replacementCalls).toBe(0);

    releaseFirst.resolve();
    const firstError = await first.then(() => null, (error: unknown) => error);
    expect(firstError).toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      currentnessKind: SemanticSourceWorldCurrentnessKind.EquivalentPlan,
    });
    await yieldTurn();
    expect(replacementCalls).toBe(0);

    releaseSecond.resolve();
    const secondError = await second.then(() => null, (error: unknown) => error);
    expect(secondError).toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      currentnessKind: SemanticSourceWorldCurrentnessKind.EquivalentPlan,
    });
    const reboundSourceWorldRevision = await replacement;
    expect(replacementCalls).toBe(1);
    expect(reboundSourceWorldRevision).toBe(baseline.sourceWorldRevision);
    const rebound = await captureRuntime(session);
    expect(rebound.storeIdentity).toBe(baseline.storeIdentity);
    expect(rebound.workspaceIdentity).not.toBe(baseline.workspaceIdentity);
  });

  test('validates egress after consumer mapping and never replays a stale callback', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    let calls = 0;

    const operation = session.run(async () => {
      calls += 1;
      await writeWorkspaceFile(workspaceRoot, 'src/during-operation.ts', 'export const changed = true;\n');
      return { mapped: true };
    });

    await expect(operation).rejects.toBeInstanceOf(ManagedSemanticWorkspaceOperationStaleError);
    const replacement = await captureRuntime(session);
    expect(calls).toBe(1);
    expect(replacement.storeIdentity).not.toBe(baseline.storeIdentity);
    expect(replacement.sourceFilePaths).toContain('src/during-operation.ts');
  });

  test('auto-composes facade answer receipts and rejects analysis changes that leave source membership current', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'package.json', '{"name":"receipt-workspace"}');
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const projectKey = baseline.projectKey;
    let callbackCalls = 0;

    const operation = session.run(async ({ runtime }) => {
      callbackCalls += 1;
      const answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        projectKey,
      });
      await writeFile(sourceFile, 'export const value = 2;\n');
      return answer.value;
    });
    const staleError = await operation.then(() => null, (error: unknown) => error);

    expect(staleError).toBeInstanceOf(ManagedSemanticWorkspaceOperationStaleError);
    expect(staleError).toMatchObject({
      reason: 'analysis-basis-changed',
      currentnessKind: null,
      previousSourceWorldRevision: baseline.sourceWorldRevision,
      nextSourceWorldRevision: baseline.sourceWorldRevision,
    });
    expect((staleError as ManagedSemanticWorkspaceOperationStaleError).changedReadKeys.length).toBeGreaterThan(0);
    expect(callbackCalls).toBe(1);

    const afterContentChange = await captureRuntime(session);
    expect(afterContentChange.storeIdentity).toBe(baseline.storeIdentity);
    expect(afterContentChange.sourceWorldIdentity).toBe(baseline.sourceWorldIdentity);
  });

  test('wraps a same-source-world runtime race as managed analysis currentness without replaying the callback', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const sourceText = 'export const value = 1;\n';
    const overlay = new MutableSourceOverlay();
    overlay.write(sourceFile, sourceText);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    sessions.push(session);
    const baseline = await captureRuntime(session);
    const request = {
      projectKey: baseline.projectKey,
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
      includeAppProfile: true,
      queries: [{ kind: SemanticAppQueryKind.Summary }],
    } as const;
    await session.run(({ runtime }) => runtime.answerAppQueries(request));
    const runtimeInternals = baseline.runtimeIdentity as SemanticRuntime & {
      readCachedApp: (...args: unknown[]) => unknown;
    };
    const readCachedApp = runtimeInternals.readCachedApp.bind(runtimeInternals);
    let mutationInjected = false;
    vi.spyOn(runtimeInternals, 'readCachedApp').mockImplementation((...args) => {
      const cachedApp = readCachedApp(...args);
      if (cachedApp != null && !mutationInjected) {
        mutationInjected = true;
        overlay.write(sourceFile, `${sourceText}export const changedAfterCachePreflight = true;\n`);
      }
      return cachedApp;
    });
    let callbackCalls = 0;

    const failure = await session.run(({ runtime }) => {
      callbackCalls += 1;
      return runtime.answerAppQueries(request);
    }).then(() => null, (error: unknown) => error);

    expect(failure).toBeInstanceOf(ManagedSemanticWorkspaceOperationStaleError);
    expect(failure).toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-currentness-changed',
      currentnessKind: null,
      previousSourceWorldRevision: baseline.sourceWorldRevision,
      nextSourceWorldRevision: baseline.sourceWorldRevision,
      analysisBasisRevision: null,
      analysisCurrentness: {
        code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED',
        reason: 'query-answer-lease-changed',
      },
    });
    expect((failure as ManagedSemanticWorkspaceOperationStaleError).cause).toMatchObject({
      code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED',
      reason: 'query-answer-lease-changed',
    });
    expect(mutationInjected).toBe(true);
    expect(callbackCalls).toBe(1);
    overlay.write(sourceFile, sourceText);
    const after = await captureRuntime(session);
    expect(after.sourceWorldRevision).toBe(baseline.sourceWorldRevision);
    expect(after.runtimeIdentity).toBe(baseline.runtimeIdentity);
  });

  test.each([
    {
      name: 'a restored value with no query in the transient generation',
      transitions: (original: string, renamed: string) => [renamed, original],
    },
    {
      name: 'an explicit no-op file-value event',
      transitions: (original: string) => [original],
    },
  ])('converges fresh PushObserved answers after $name', async ({ transitions }) => {
    const workspaceRoot = fileURLToPath(new URL('../../../fixtures/hello-world/', import.meta.url));
    const sourceFile = path.join(workspaceRoot, 'src/components/product-card.ts');
    const original = await readFile(sourceFile, 'utf8');
    const renamed = original.replace('@bindable item:', '@bindable item2:');
    expect(renamed).not.toBe(original);
    const overlay = new MutableSourceOverlay();
    overlay.write(sourceFile, original);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
      {
        authorityForRead: (descriptor) =>
          descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
          && path.resolve(descriptor.fileName) === path.resolve(sourceFile)
            ? { mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }
            : null,
      },
    );
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    sessions.push(session);
    const baseline = await captureRuntime(session);
    const request = {
      projectKey: baseline.projectKey,
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
      includeAppProfile: true,
      queries: [{ kind: SemanticAppQueryKind.Summary }],
    } as const;
    await expect(session.run(({ runtime }) => runtime.answerAppQueries(request)))
      .resolves.toMatchObject({ result: 'answered' });

    for (const sourceText of transitions(original, renamed)) {
      overlay.write(sourceFile, sourceText);
      authority.advance([new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        sourceFile,
      )]);
    }

    await expect(session.run(({ runtime }) => runtime.answerAppQueries(request)))
      .resolves.toMatchObject({ result: 'answered' });
    await expect(session.run(({ runtime }) => runtime.answerAppQueries(request)))
      .resolves.toMatchObject({ result: 'answered' });
  });

  test('preserves an arbitrary mapper failure even when its composed answer receipt later becomes stale', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const sentinel = new Error('transport mapping failed');

    const failure = await session.run(async ({ runtime }) => {
      await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        projectKey: baseline.projectKey,
      });
      await writeFile(sourceFile, 'export const value = 2;\n');
      throw sentinel;
    }).then(() => null, (error: unknown) => error);

    expect(failure).toBe(sentinel);
  });

  test('snapshots and freezes nested analysis-currentness evidence at the managed error boundary', () => {
    const invalidGenerationKeys = ['generation:b', 'generation:a', 'generation:b'];
    const currentness = {
      code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED' as const,
      reason: 'generation-changed' as const,
      message: 'Generation changed.',
      answerLeaseKind: null,
      invalidGenerationKeys,
      changedReadKeys: [] as string[],
      changedFacets: [] as string[],
      changedSemanticFactKeys: ['semantic-domain:semantic-read'] as string[],
    };
    const error = new ManagedSemanticWorkspaceOperationStaleError({
      message: 'Managed operation became stale.',
      reason: 'analysis-currentness-changed',
      currentnessKind: null,
      previousSourceWorldRevision: 'source:same',
      nextSourceWorldRevision: 'source:same',
      analysisBasisRevision: null,
      changedReadKeys: [],
      changedFacets: [],
      changedSemanticFactKeys: [],
      analysisCurrentness: currentness,
    });

    invalidGenerationKeys.push('generation:c');
    currentness.message = 'Mutated after construction.';

    expect(error.analysisCurrentness).toMatchObject({
      message: 'Generation changed.',
      invalidGenerationKeys: ['generation:a', 'generation:b'],
      changedSemanticFactKeys: ['semantic-domain:semantic-read'],
    });
    expect(Object.isFrozen(error.analysisCurrentness)).toBe(true);
    expect(Object.isFrozen(error.analysisCurrentness?.invalidGenerationKeys)).toBe(true);
    expect(Object.isFrozen(error.analysisCurrentness?.changedReadKeys)).toBe(true);
    expect(Object.isFrozen(error.analysisCurrentness?.changedFacets)).toBe(true);
    expect(Object.isFrozen(error.analysisCurrentness?.changedSemanticFactKeys)).toBe(true);
  });

  test('adds memoized mapping text only to the final operation receipt', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const host = new NodeSemanticRuntimeProjectInputHost();
    const readFile = vi.spyOn(host, 'readFile');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    sessions.push(session);
    const baseline = await captureRuntime(session);
    const registeredBefore = baseline.projectInputReadCount;
    let firstReadCount = 0;
    let secondReadCount = 0;

    await session.run(({ readSourceText }) => {
      expect(readSourceText(sourceFile)).toBe('export const value = 1;\n');
      firstReadCount = readFile.mock.calls.filter(([fileName]) => path.resolve(fileName) === path.resolve(sourceFile)).length;
      expect(readSourceText(sourceFile)).toBe('export const value = 1;\n');
      secondReadCount = readFile.mock.calls.filter(([fileName]) => path.resolve(fileName) === path.resolve(sourceFile)).length;
    });

    expect(secondReadCount).toBe(firstReadCount);
    const after = await captureRuntime(session);
    expect(after.storeIdentity).toBe(baseline.storeIdentity);
    expect(after.sourceWorldIdentity).toBe(baseline.sourceWorldIdentity);
    expect(after.projectInputReadCount).toBe(registeredBefore);
  });

  test('maps against an absorbed answer exact text and rejects a later host value', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'package.json', '{"name":"mapping-answer-text"}');
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const host = new NodeSemanticRuntimeProjectInputHost();
    const readFile = vi.spyOn(host, 'readFile');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    sessions.push(session);
    const baseline = await captureRuntime(session);
    const projectKey = baseline.projectKey;
    let mappedText: string | undefined;
    let callsBeforeMapping = 0;
    let callsAfterMapping = 0;

    const operation = session.run(async ({ runtime, readSourceText }) => {
      const answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        projectKey,
      });
      const receipt = semanticRuntimeAnalysisReceiptFor(answer);
      expect(receipt?.projectInputReads.some((read) =>
        read.descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
        && path.resolve(read.descriptor.fileName) === path.resolve(sourceFile))).toBe(true);
      await writeFile(sourceFile, 'export const value = 2;\n');
      callsBeforeMapping = readFile.mock.calls
        .filter(([fileName]) => path.resolve(fileName) === path.resolve(sourceFile)).length;
      mappedText = readSourceText(sourceFile);
      callsAfterMapping = readFile.mock.calls
        .filter(([fileName]) => path.resolve(fileName) === path.resolve(sourceFile)).length;
    });

    await expect(operation).rejects.toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-basis-changed',
    });
    expect(mappedText).toBe('export const value = 1;\n');
    expect(callsAfterMapping).toBe(callsBeforeMapping);
  });

  test('retains an opaque completed proof and composes it only inside a later pinned operation', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const session = createSession(workspaceRoot);
    const completed = await session.runWithReceipt(({ readSourceText }) => {
      expect(readSourceText(sourceFile)).toBe('export const value = 1;\n');
      return 'full';
    });

    expect(completed.value).toBe('full');
    expect(completed.receipt.analysisBasis.semanticModelRevision).not.toBe('');
    await expect(session.run(({ tryAbsorbReceipt }) => tryAbsorbReceipt(completed.receipt))).resolves.toBe(true);

    await writeFile(sourceFile, 'export const value = 2;\n');
    await expect(session.run(({ tryAbsorbReceipt }) => tryAbsorbReceipt(completed.receipt))).resolves.toBe(false);

    completed.receipt.dispose();
    await expect(session.run(({ tryAbsorbReceipt }) => tryAbsorbReceipt(completed.receipt))).resolves.toBe(false);
  });

  test('uses exact push events for operation text without polling or unrelated invalidation', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const unrelatedFile = path.join(workspaceRoot, 'src/unrelated.ts');
    const host = new NodeSemanticRuntimeProjectInputHost();
    const readFile = vi.spyOn(host, 'readFile');
    const authority = new SemanticRuntimeProjectInputAuthority(host, {
      authorityForRead: (descriptor) =>
        descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
        && path.resolve(descriptor.fileName) === path.resolve(sourceFile)
          ? { mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }
          : null,
    });
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    sessions.push(session);

    const beforeUnrelated = readFile.mock.calls
      .filter(([fileName]) => path.resolve(fileName) === path.resolve(sourceFile)).length;
    await session.run(({ readSourceText }) => {
      expect(readSourceText(sourceFile)).toBe('export const value = 1;\n');
      authority.advance([new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        unrelatedFile,
      )]);
    });
    const afterUnrelated = readFile.mock.calls
      .filter(([fileName]) => path.resolve(fileName) === path.resolve(sourceFile)).length;
    expect(afterUnrelated - beforeUnrelated).toBe(1);

    const staleOperation = session.run(async ({ readSourceText }) => {
      expect(readSourceText(sourceFile)).toBe('export const value = 1;\n');
      await writeFile(sourceFile, 'export const value = 2;\n');
      authority.advance([new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        sourceFile,
      )]);
    });
    await expect(staleOperation).rejects.toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-basis-changed',
    });
  });

  test('retains negative operation text reads and rejects a later file appearance', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export {};\n');
    const dependencyRoot = await createWorkspace();
    const missingFile = path.join(dependencyRoot, 'mapping.txt');
    const session = createSession(workspaceRoot);

    const operation = session.run(async ({ readSourceText }) => {
      expect(readSourceText(missingFile)).toBeUndefined();
      await writeFile(missingFile, 'now present\n');
    });

    await expect(operation).rejects.toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-basis-changed',
    });
  });

  test('rejects relative and post-callback source-text reads', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export {};\n');
    const session = createSession(workspaceRoot);
    let retainedRead: ((fileName: string) => string | undefined) | null = null;

    await session.run(({ readSourceText }) => {
      retainedRead = readSourceText;
      expect(() => readSourceText('src/main.ts')).toThrow(/absolute host path/);
      expect(readSourceText(sourceFile)).toBe('export {};\n');
    });

    expect(() => retainedRead!(sourceFile)).toThrow(/operation has closed/);
  });

  test('does not over-invalidate a membership-only answer after a source-content edit', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const projectKey = baseline.projectKey;
    let calls = 0;

    const result = await session.run(async ({ runtime }) => {
      calls += 1;
      const answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.SourceFiles,
        projectKey,
      });
      await writeFile(sourceFile, 'export const value = 2;\n');
      return answer.result;
    });

    expect(result).toBe('answered');
    expect(calls).toBe(1);
    const afterContentChange = await captureRuntime(session);
    expect(afterContentChange.storeIdentity).toBe(baseline.storeIdentity);
    expect(afterContentChange.sourceWorldIdentity).toBe(baseline.sourceWorldIdentity);
  });

  test('preserves a callback failure when only an absorbed analysis basis changed', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const projectKey = baseline.projectKey;
    const callbackFailure = new Error('consumer mapping failed');

    const operation = session.run(async ({ runtime }) => {
      await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        projectKey,
      });
      await writeFile(sourceFile, 'export const value = 2;\n');
      throw callbackFailure;
    });

    await expect(operation).rejects.toBe(callbackFailure);
    const afterFailure = await captureRuntime(session);
    expect(afterFailure.storeIdentity).toBe(baseline.storeIdentity);
  });

  test('rebases exact project-shape reads and bounds obsolete generation entries', async () => {
    const workspaceRoot = await createWorkspace();
    const packageFile = await writeWorkspaceFile(workspaceRoot, 'package.json', '{"name":"shape-cache"}');
    const tsconfigFile = await writeWorkspaceFile(
      workspaceRoot,
      'tsconfig.json',
      '{"compilerOptions":{"strict":false}}',
    );
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 0;\n',
    );
    const session = createSession(workspaceRoot);

    const baseline = await captureProjectShapeCache(session);
    expect(baseline.entries).toHaveLength(1);

    await writeWorkspaceFile(workspaceRoot, 'README.md', '# Equivalent plan\n');
    const equivalent = await captureProjectShapeCache(session);
    expect(equivalent.storeIdentity).toBe(baseline.storeIdentity);
    expect(equivalent.entries).toHaveLength(1);
    expect(equivalent.entries[0]!.shape).toBe(baseline.entries[0]!.shape);

    let currentShape = equivalent.entries[0]!.shape;
    for (let index = 1; index <= 3; index += 1) {
      await writeFile(tsconfigFile, `{"compilerOptions":{"strict":${index % 2 === 0}}}`);
      const tsconfigGeneration = await captureProjectShapeCache(session);
      expect(tsconfigGeneration.entries).toHaveLength(1);
      expect(tsconfigGeneration.entries[0]!.shape).toBe(currentShape);

      await writeFile(sourceFile, `export const value = ${index};\n`);
      const contentGeneration = await captureProjectShapeCache(session);
      expect(contentGeneration.entries).toHaveLength(1);
      expect(contentGeneration.entries[0]!.shape).not.toBe(currentShape);
      currentShape = contentGeneration.entries[0]!.shape;
    }

    await writeFile(packageFile, '{"name":"shape-cache","dependencies":{"aurelia":"latest"}}');
    const changedManifest = await captureProjectShapeCache(session);
    expect(changedManifest.entries).toHaveLength(1);
    expect(changedManifest.entries[0]!.shape).not.toBe(currentShape);
  });

  test('reconciles native configuration before answering an old project-configuration cursor', async () => {
    const workspaceRoot = await createWorkspace();
    const childRoot = path.join(workspaceRoot, 'child');
    await writeWorkspaceFile(workspaceRoot, 'package.json', '{"name":"configured-workspace"}');
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const root = true;\n');
    const rootConfig = await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', '{"version":1}');
    const childConfig = await writeWorkspaceFile(childRoot, 'aurelia.project.json', '{"version":3}');
    await writeWorkspaceFile(childRoot, 'src/child.ts', 'export const child = true;\n');
    const authority = new SemanticRuntimeProjectInputAuthority();
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      projects: [
        { rootDir: workspaceRoot, projectKey: 'root', excludedSourceRoots: ['child'] },
        { rootDir: childRoot, projectKey: 'child' },
      ],
      projectInputAuthority: authority,
    });
    sessions.push(session);
    const beforeCursor = await captureRuntime(session);

    const first = await session.run(({ runtime }) => {
      const answer = runtime.nativeProjectConfigurations({
        sourceFilePaths: [childConfig, rootConfig, childConfig],
        page: { size: 1 },
        inquiryProfile: 'lsp-cursor',
      });
      return {
        cursor: answer.page!.nextCursor!,
      };
    });
    await writeFile(childConfig, '{"version":1}', 'utf8');
    authority.advance();

    const staleCursor = await session.run(({ runtime }) => {
      const answer = runtime.nativeProjectConfigurations({
        sourceFilePaths: [childConfig, rootConfig],
        page: { size: 1, cursor: first.cursor },
        inquiryProfile: 'lsp-cursor',
      });
      return {
        result: answer.result,
        cursorProblem: answer.page?.cursorProblem,
        rows: answer.value.rows,
      };
    });

    const afterCursor = await captureRuntime(session);
    const currentInventory = await session.run(({ runtime }) => runtime.nativeProjectConfigurations({
      sourceFilePaths: [childConfig],
    }));
    expect(afterCursor.storeIdentity).toBe(beforeCursor.storeIdentity);
    expect(afterCursor.storeKey).toBe(beforeCursor.storeKey);
    expect(afterCursor.sourceWorldRevision).toBe(beforeCursor.sourceWorldRevision);
    expect(staleCursor.result).toBe('invalid');
    expect(staleCursor.cursorProblem?.kind).toBe('stale');
    expect(staleCursor.rows).toEqual([]);
    expect(currentInventory.value.rows).toEqual([expect.objectContaining({
      acceptedVersion: 1,
      applicationState: 'applied',
      diagnosticCount: 0,
    })]);
  });

  test('keeps a failed fresh transition atomic and retries without reusing its store sequence', async () => {
    const workspaceRoot = await createWorkspace();
    const projectRoot = path.join(workspaceRoot, 'project');
    await writeWorkspaceFile(projectRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot, projectRoot);
    const baseline = await captureRuntime(session);
    const clearBaselineRuntime = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear');
    await rm(projectRoot, { force: true, recursive: true });
    let callbackCalls = 0;

    const firstFailure = session.run(() => {
      callbackCalls += 1;
    });
    const secondFailure = session.run(() => {
      callbackCalls += 1;
    });
    const [firstError, secondError] = await Promise.all([
      firstFailure.then(() => null, (error: unknown) => error),
      secondFailure.then(() => null, (error: unknown) => error),
    ]);

    expect(firstError).toBeInstanceOf(Error);
    expect(firstError).toBe(secondError);
    expect(String(firstError)).toContain(`project rootDir '${path.normalize(projectRoot)}' does not exist`);
    expect(callbackCalls).toBe(0);
    expect(clearBaselineRuntime).not.toHaveBeenCalled();

    await writeWorkspaceFile(projectRoot, 'src/recovered.ts', 'export const recovered = true;\n');
    const recovered = await captureRuntime(session);
    expect(recovered.storeIdentity).not.toBe(baseline.storeIdentity);
    expect(storeIncarnationSequence(recovered.storeKey)).toBe(3);
    expect(recovered.projectInputAuthorityIdentity).toBe(baseline.projectInputAuthorityIdentity);
    expect(clearBaselineRuntime).toHaveBeenCalledTimes(1);
  });

  test('stops admission immediately but lets disposal wait for a pinned current operation', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const clearRuntime = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear');
    const entered = deferred<void>();
    const release = deferred<void>();
    let disposalSettled = false;

    const operation = session.run(async () => {
      entered.resolve();
      await release.promise;
      return 'completed';
    });
    await entered.promise;
    const disposal = session.dispose();
    void disposal.then(() => {
      disposalSettled = true;
    });

    await expect(session.run(() => 'late')).rejects.toBeInstanceOf(ManagedSemanticWorkspaceDisposedError);
    await yieldTurn();
    expect(disposalSettled).toBe(false);
    expect(clearRuntime).not.toHaveBeenCalled();

    release.resolve();
    await expect(operation).resolves.toBe('completed');
    await disposal;
    expect(disposalSettled).toBe(true);
    expect(clearRuntime).toHaveBeenCalledTimes(1);
    expect(session.dispose()).toBe(disposal);
  });

  test('disposal cancels unpublished initial and fresh reconciliations', async () => {
    const initialWorkspaceRoot = await createWorkspace();
    await writeWorkspaceFile(initialWorkspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const initialSession = createSession(initialWorkspaceRoot);
    let initialCallbackCalls = 0;
    const initialOperation = initialSession.run(() => {
      initialCallbackCalls += 1;
    });
    const initialDisposal = initialSession.dispose();

    await expect(initialOperation).rejects.toBeInstanceOf(ManagedSemanticWorkspaceDisposedError);
    await initialDisposal;
    expect(initialCallbackCalls).toBe(0);

    const freshWorkspaceRoot = await createWorkspace();
    await writeWorkspaceFile(freshWorkspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const freshSession = createSession(freshWorkspaceRoot);
    await captureRuntime(freshSession);
    await writeWorkspaceFile(freshWorkspaceRoot, 'src/added.ts', 'export const added = true;\n');
    let freshCallbackCalls = 0;
    const freshOperation = freshSession.run(() => {
      freshCallbackCalls += 1;
    });
    const freshDisposal = freshSession.dispose();

    await expect(freshOperation).rejects.toBeInstanceOf(ManagedSemanticWorkspaceDisposedError);
    await freshDisposal;
    expect(freshCallbackCalls).toBe(0);
  });

  test('rejects nested run and disposal cycles instead of waiting on the callback own lease', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);

    await expect(session.run(async () => session.run(() => 'nested'))).rejects.toMatchObject({
      code: 'SEMANTIC_RUNTIME_WORKSPACE_REENTRANT_OPERATION',
      action: 'run',
    });
    await session.run(() => {
      expect(() => session.dispose()).toThrow(ManagedSemanticWorkspaceReentrantOperationError);
    });

    await expect(session.run(() => 'still-open')).resolves.toBe('still-open');
  });

  test('shares overview with readers, then drains both before an exclusive clear and blocks later admission', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    await captureRuntime(session);
    const rawClear = SemanticRuntime.prototype.sessionAnalysisCacheClear;
    const events: string[] = [];
    const clearRuntime = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear')
      .mockImplementation(function (this: SemanticRuntime, request = {}) {
        events.push('raw-clear');
        return rawClear.call(this, request);
      });
    const runEntered = deferred<void>();
    const releaseRun = deferred<void>();
    const overviewEntered = deferred<void>();
    const releaseOverview = deferred<void>();
    let lateRunCalls = 0;

    const heldRun = session.run(async () => {
      runEntered.resolve();
      await releaseRun.promise;
    });
    await runEntered.promise;
    const overview = session.analysisCacheOverview({}, async (answer) => {
      expect(semanticRuntimeAnalysisReceiptFor(answer)).toBeNull();
      overviewEntered.resolve();
      await releaseOverview.promise;
      events.push('overview-exit');
      return answer.value.cachedAppCount;
    });
    await overviewEntered.promise;

    const clear = session.clearAnalysisCache({}, (answer) => {
      expect(semanticRuntimeAnalysisReceiptFor(answer)).toBeNull();
      events.push('clear-project');
      return answer.value.disposedCachedApps;
    });
    const lateRun = session.run(() => {
      lateRunCalls += 1;
      events.push('late-run');
      return 'late';
    });
    await yieldTurn();
    expect(clearRuntime).not.toHaveBeenCalled();
    expect(lateRunCalls).toBe(0);

    releaseRun.resolve();
    await heldRun;
    await yieldTurn();
    expect(clearRuntime).not.toHaveBeenCalled();
    expect(lateRunCalls).toBe(0);

    releaseOverview.resolve();
    await expect(overview).resolves.toBeGreaterThanOrEqual(0);
    await expect(clear).resolves.toBeGreaterThanOrEqual(0);
    await expect(lateRun).resolves.toBe('late');
    expect(clearRuntime).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['overview-exit', 'raw-clear', 'clear-project', 'late-run']);
  });

  test('uses the session-local overview path and preserves proof until an exclusive clear', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const combinedOverview = vi.spyOn(SemanticRuntime.prototype, 'analysisCacheOverview');
    const sessionOverview = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheOverview');
    const completed = await session.runWithReceipt(({ runtime }) => runtime.summary().value.workspaceRoot);

    const overviewCount = await session.analysisCacheOverview({}, (answer) => {
      expect('typeSystemDependencyCache' in answer.value).toBe(false);
      expect('processMemory' in answer.value).toBe(false);
      return answer.value.cachedAppCount;
    });
    expect(overviewCount).toBeGreaterThanOrEqual(0);
    expect(sessionOverview).toHaveBeenCalledTimes(1);
    expect(combinedOverview).not.toHaveBeenCalled();
    await expect(session.run(({ tryAbsorbReceipt }) => tryAbsorbReceipt(completed.receipt))).resolves.toBe(true);

    const beforeClear = await captureRuntime(session);
    await session.clearAnalysisCache({}, (answer) => {
      expect('clearedTypeSystemDependencySourceFiles' in answer.value).toBe(false);
      expect('typeSystemDependencyCacheClearPolicy' in answer.value).toBe(false);
      return answer.value;
    });
    await expect(session.run(({ tryAbsorbReceipt }) => tryAbsorbReceipt(completed.receipt))).resolves.toBe(false);
    const afterClear = await captureRuntime(session);
    expect(afterClear.runtimeIdentity).toBe(beforeClear.runtimeIdentity);
    expect(afterClear.storeIdentity).toBe(beforeClear.storeIdentity);
    completed.receipt.dispose();
  });

  test('returns detached cache counters only from an idle published incarnation', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);

    expect(session.tryAnalysisCacheOverview({}, (answer) => answer.value.cachedAppCount)).toBeNull();
    await captureRuntime(session);
    expect(session.tryAnalysisCacheOverview({}, (answer) => answer.value.cachedAppCount))
      .toBeGreaterThanOrEqual(0);

    const entered = deferred<void>();
    const release = deferred<void>();
    const active = session.run(async () => {
      entered.resolve();
      await release.promise;
    });
    await entered.promise;
    expect(session.tryAnalysisCacheOverview({}, (answer) => answer.value.cachedAppCount)).toBeNull();
    release.resolve();
    await active;
    expect(session.tryAnalysisCacheOverview({}, (answer) => answer.value.cachedAppCount))
      .toBeGreaterThanOrEqual(0);
  });

  test('serializes queued clears without reopening reader admission between them', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    await captureRuntime(session);
    const clearRuntime = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear');
    const readerEntered = deferred<void>();
    const releaseReader = deferred<void>();
    const firstProjectorEntered = deferred<void>();
    const releaseFirstProjector = deferred<void>();
    const events: string[] = [];
    let lateRunCalls = 0;

    const reader = session.run(async () => {
      readerEntered.resolve();
      await releaseReader.promise;
    });
    await readerEntered.promise;
    const firstClear = session.clearAnalysisCache({}, async () => {
      events.push('clear-a-enter');
      firstProjectorEntered.resolve();
      await releaseFirstProjector.promise;
      events.push('clear-a-exit');
      return 'a';
    });
    const secondClear = session.clearAnalysisCache({}, () => {
      events.push('clear-b');
      return 'b';
    });
    const lateRun = session.run(() => {
      lateRunCalls += 1;
      events.push('late-run');
      return 'late';
    });

    releaseReader.resolve();
    await reader;
    await firstProjectorEntered.promise;
    expect(clearRuntime).toHaveBeenCalledTimes(1);
    expect(lateRunCalls).toBe(0);
    expect(events).toEqual(['clear-a-enter']);

    releaseFirstProjector.resolve();
    await expect(firstClear).resolves.toBe('a');
    await expect(secondClear).resolves.toBe('b');
    await expect(lateRun).resolves.toBe('late');
    expect(clearRuntime).toHaveBeenCalledTimes(2);
    expect(events).toEqual(['clear-a-enter', 'clear-a-exit', 'clear-b', 'late-run']);
  });

  test('keeps clear before reconciliation when topology changes while the selected incumbent drains', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const clearRuntime = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear');
    const readerEntered = deferred<void>();
    const releaseReader = deferred<void>();

    const reader = session.run(async () => {
      readerEntered.resolve();
      await releaseReader.promise;
      return 'pinned';
    });
    const readerError = reader.then(() => null, (error: unknown) => error);
    await readerEntered.promise;
    const clear = session.clearAnalysisCache({}, (_answer, outcome) => outcome);
    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');
    const lateRun = session.run(({ runtime }) => runtime.summary().analysisBasis!.sourceWorldRevision);

    releaseReader.resolve();
    await expect(readerError).resolves.toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'source-world-changed',
    });
    const outcome = await clear;
    const lateRevision = await lateRun;
    expect(outcome).toMatchObject({
      status: 'reconciliation-pending',
      clearedSourceWorldRevision: baseline.sourceWorldRevision,
      currentnessKind: SemanticSourceWorldCurrentnessKind.FreshBootRequired,
    });
    expect(outcome.nextSourceWorldRevision).toBe(lateRevision);
    expect(lateRevision).not.toBe(baseline.sourceWorldRevision);
    expect(clearRuntime).toHaveBeenCalledTimes(1);
  });

  test('keeps reconciliation before clear when topology transition wins FIFO admission', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');
    const events: string[] = [];

    const reader = session.run(({ runtime }) => {
      events.push('reader');
      return runtime.summary().analysisBasis!.sourceWorldRevision;
    });
    const clear = session.clearAnalysisCache({}, (_answer, outcome) => {
      events.push('clear-project');
      return outcome;
    });

    const [readerRevision, outcome] = await Promise.all([reader, clear]);
    expect(outcome).toMatchObject({
      status: 'current',
      clearedSourceWorldRevision: readerRevision,
      nextSourceWorldRevision: readerRevision,
      currentnessKind: null,
    });
    expect(readerRevision).not.toBe(baseline.sourceWorldRevision);
    expect(events).toEqual(['clear-project', 'reader']);
  });

  test('terminally replaces an incarnation after a partially applied clear failure', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const originalClear = SemanticRuntime.prototype.sessionAnalysisCacheClear;
    const injectedFailure = new Error('injected clear failure after mutation');
    let failed = false;
    let baselineClearCalls = 0;
    vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear')
      .mockImplementation(function (this: SemanticRuntime, request = {}) {
        if (this === baseline.runtimeIdentity) {
          baselineClearCalls += 1;
          const answer = originalClear.call(this, request);
          if (!failed) {
            failed = true;
            throw injectedFailure;
          }
          return answer;
        }
        return originalClear.call(this, request);
      });
    let projectorCalls = 0;

    const clear = session.clearAnalysisCache({}, () => {
      projectorCalls += 1;
    });
    const clearError = clear.then(() => null, (error: unknown) => error);
    const lateRun = session.run(({ runtime }) => runtime.summary().analysisBasis!.sourceWorldRevision);

    await expect(clearError).resolves.toBe(injectedFailure);
    const replacementRevision = await lateRun;
    const replacement = await captureRuntime(session);
    expect(projectorCalls).toBe(0);
    expect(baselineClearCalls).toBe(1);
    expect(replacement.runtimeIdentity).not.toBe(baseline.runtimeIdentity);
    expect(replacement.storeIdentity).not.toBe(baseline.storeIdentity);
    expect(replacementRevision).toBe(replacement.sourceWorldRevision);
  });

  test('keeps a retirement-clear failure terminal while a later transition publishes a fresh store', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const originalClear = SemanticRuntime.prototype.sessionAnalysisCacheClear;
    const injectedFailure = new Error('injected incumbent retirement-clear failure after mutation');
    const retireRuntime = vi.spyOn(SemanticRuntime.prototype, 'retireWorkspaceIncarnation');
    let baselineClearCalls = 0;
    let unpublishedClearCalls = 0;
    vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear')
      .mockImplementation(function (this: SemanticRuntime, request = {}) {
        const answer = originalClear.call(this, request);
        if (this === baseline.runtimeIdentity) {
          baselineClearCalls += 1;
          if (baselineClearCalls === 1) {
            throw injectedFailure;
          }
        } else {
          unpublishedClearCalls += 1;
        }
        return answer;
      });
    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');
    let callbackCalls = 0;

    const failedTransition = session.run(() => {
      callbackCalls += 1;
    });

    await expect(failedTransition).rejects.toBe(injectedFailure);
    expect(callbackCalls).toBe(0);
    expect(baselineClearCalls).toBe(1);
    expect(unpublishedClearCalls).toBe(1);
    expect(retireRuntime.mock.contexts.filter((runtime) => runtime === baseline.runtimeIdentity)).toHaveLength(1);

    const replacement = await captureRuntime(session);
    expect(replacement.runtimeIdentity).not.toBe(baseline.runtimeIdentity);
    expect(replacement.storeIdentity).not.toBe(baseline.storeIdentity);
    expect(storeIncarnationSequence(replacement.storeKey)).toBe(3);
    expect(baselineClearCalls).toBe(1);
    expect(unpublishedClearCalls).toBe(1);
    expect(retireRuntime.mock.contexts.filter((runtime) => runtime === baseline.runtimeIdentity)).toHaveLength(1);
  });

  test('makes disposal terminal and single-shot when retirement clear fails after mutation', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const originalClear = SemanticRuntime.prototype.sessionAnalysisCacheClear;
    const injectedFailure = new Error('injected disposal retirement-clear failure after mutation');
    let baselineClearCalls = 0;
    vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear')
      .mockImplementation(function (this: SemanticRuntime, request = {}) {
        const answer = originalClear.call(this, request);
        if (this === baseline.runtimeIdentity) {
          baselineClearCalls += 1;
          throw injectedFailure;
        }
        return answer;
      });

    const disposal = session.dispose();

    await expect(disposal).rejects.toBe(injectedFailure);
    expect(session.dispose()).toBe(disposal);
    expect(baselineClearCalls).toBe(1);
    await expect(session.run(() => 'late')).rejects.toBeInstanceOf(ManagedSemanticWorkspaceDisposedError);
    expect(baselineClearCalls).toBe(1);
  });

  test('cancels a queued clear during disposal while draining the pinned reader', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    await captureRuntime(session);
    const clearRuntime = vi.spyOn(SemanticRuntime.prototype, 'sessionAnalysisCacheClear');
    const entered = deferred<void>();
    const release = deferred<void>();
    let projectorCalls = 0;

    const reader = session.run(async () => {
      entered.resolve();
      await release.promise;
    });
    await entered.promise;
    const clear = session.clearAnalysisCache({}, () => {
      projectorCalls += 1;
    });
    const disposal = session.dispose();
    const clearError = clear.then(() => null, (error: unknown) => error);
    await yieldTurn();
    expect(clearRuntime).not.toHaveBeenCalled();

    release.resolve();
    await reader;
    await expect(clearError).resolves.toBeInstanceOf(ManagedSemanticWorkspaceDisposedError);
    await disposal;
    expect(projectorCalls).toBe(0);
    expect(clearRuntime).toHaveBeenCalledTimes(1);
  });

  test('denies runtime carriers, revokes retained facade access, and drains pending facade promises', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    let retainedFacade: object | null = null;
    let retainedSummary: (() => unknown) | null = null;

    await session.run(({ runtime }) => {
      retainedFacade = runtime;
      retainedSummary = runtime.summary;
      expect(Object.getPrototypeOf(runtime)).toBeNull();
      expect(Object.getOwnPropertyNames(runtime)).toContain('summary');
      expect('workspace' in runtime).toBe(false);
      expect(() => Reflect.get(runtime as object, 'workspace')).toThrow(/not available/);
      runtime.summary();
    });
    expect(() => Reflect.get(retainedFacade!, 'summary')).toThrow(/operation has closed/);
    expect(() => retainedSummary!()).toThrow(/operation has closed/);
    await expect(session.run(({ runtime, absorb }) => absorb(runtime.summary()))).rejects.toThrow(/auto-composed/);

    const originalAnswerAppQuery = SemanticRuntime.prototype.answerAppQuery;
    const entered = deferred<void>();
    const release = deferred<void>();
    const pendingSpy = vi.spyOn(SemanticRuntime.prototype, 'answerAppQuery')
      .mockImplementation(async function (this: SemanticRuntime, request) {
        const answer = await originalAnswerAppQuery.call(this, request);
        entered.resolve();
        await release.promise;
        return answer;
      });
    let operationSettled = false;
    const operation = session.run(({ runtime }) => {
      void runtime.answerAppQuery({
        kind: SemanticAppQueryKind.SourceFiles,
        projectKey: baseline.projectKey,
      });
      return 'mapped';
    });
    void operation.then(
      () => { operationSettled = true; },
      () => { operationSettled = true; },
    );
    await entered.promise;
    await yieldTurn();
    expect(operationSettled).toBe(false);
    release.resolve();
    await expect(operation).resolves.toBe('mapped');
    pendingSpy.mockRestore();

    const handledFailure = new Error('mapped per-project failure');
    vi.spyOn(SemanticRuntime.prototype, 'answerAppQuery').mockRejectedValue(handledFailure);
    await expect(session.run(async ({ runtime }) => {
      try {
        await runtime.answerAppQuery({
          kind: SemanticAppQueryKind.SourceFiles,
          projectKey: baseline.projectKey,
        });
      } catch (error) {
        expect(error).toBe(handledFailure);
      }
      return 'handled';
    })).resolves.toBe('handled');
  });

  test('types every setImmediate-lineage nested action and admits post-egress descendants', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);

    await session.run(async () => {
      await yieldTurn();
      await expect(session.analysisCacheOverview({}, (answer) => answer.value)).rejects.toMatchObject({
        code: 'SEMANTIC_RUNTIME_WORKSPACE_REENTRANT_OPERATION',
        action: 'analysis-cache-overview',
      });
      expect(() => session.clearAnalysisCache({}, (answer) => answer.value)).toThrow(expect.objectContaining({
        code: 'SEMANTIC_RUNTIME_WORKSPACE_REENTRANT_OPERATION',
        action: 'clear-analysis-cache',
      }));
    });
    await session.analysisCacheOverview({}, async (answer) => {
      await yieldTurn();
      await expect(session.run(() => 'nested')).rejects.toMatchObject({
        code: 'SEMANTIC_RUNTIME_WORKSPACE_REENTRANT_OPERATION',
        action: 'run',
      });
      expect(() => session.dispose()).toThrow(expect.objectContaining({
        code: 'SEMANTIC_RUNTIME_WORKSPACE_REENTRANT_OPERATION',
        action: 'dispose',
      }));
      return answer.value.cachedAppCount;
    });
    await session.clearAnalysisCache({}, async () => {
      await yieldTurn();
      await expect(session.analysisCacheOverview({}, (answer) => answer.value)).rejects.toMatchObject({
        code: 'SEMANTIC_RUNTIME_WORKSPACE_REENTRANT_OPERATION',
        action: 'analysis-cache-overview',
      });
      return 'cleared';
    });
    await expect(session.run(() => 'still-open')).resolves.toBe('still-open');

    const admitDescendant = deferred<void>();
    const descendantResult = deferred<string>();
    await session.run(() => {
      setImmediate(() => {
        void admitDescendant.promise
          .then(() => session.run(() => 'post-egress-descendant'))
          .then(descendantResult.resolve, descendantResult.reject);
      });
    });
    admitDescendant.resolve();
    await expect(descendantResult.promise).resolves.toBe('post-egress-descendant');
  });

  test('makes a raw session clear self-stale when it bypasses the managed exclusive API', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const rawRuntime = baseline.runtimeIdentity as SemanticRuntime;

    await expect(session.run(({ runtime }) => {
      const answer = runtime.summary();
      rawRuntime.sessionAnalysisCacheClear();
      return answer.value;
    })).rejects.toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-basis-changed',
    });
  });

  test('rejects caller-owned store namespaces', async () => {
    const workspaceRoot = await createWorkspace();
    expect(() => new ManagedSemanticWorkspaceSession({
      workspaceRoot,
      storeKey: 'consumer-owned',
    } as ConstructorParameters<typeof ManagedSemanticWorkspaceSession>[0] & { storeKey: string }))
      .toThrow(/own their private store namespace/);
  });
});

interface CapturedRuntime {
  readonly runtimeIdentity: object;
  readonly workspaceIdentity: object;
  readonly storeIdentity: object;
  readonly storeKey: string;
  readonly sourceWorldIdentity: object;
  readonly sourceWorldRevision: string;
  readonly sourceFilePaths: readonly string[];
  readonly projectInputAuthorityIdentity: object;
  readonly projectInputGenerationIdentity: object;
  readonly projectInputGenerationRevision: string;
  readonly projectInputReadCount: number;
  readonly projectKey: string;
  readonly projects: readonly CapturedProject[];
}

interface CapturedProject {
  readonly rootDir: string;
  readonly admissionOrigins: readonly ProjectRootAdmissionOrigin[];
  readonly sourceFilePaths: readonly string[];
}

interface ProjectShapeCacheEntryForTest {
  readonly shape: object;
}

interface CapturedProjectShapeCache {
  readonly runtimeIdentity: object;
  readonly storeIdentity: object;
  readonly entries: readonly ProjectShapeCacheEntryForTest[];
}

async function captureRuntime(session: ManagedSemanticWorkspaceSession): Promise<CapturedRuntime> {
  const summary = SemanticRuntime.prototype.summary;
  let captured: CapturedRuntime | null = null;
  const summarySpy = vi.spyOn(SemanticRuntime.prototype, 'summary').mockImplementation(function (
    this: SemanticRuntime,
    request = {},
  ) {
    const answer = summary.call(this, request);
    const project = this.workspace.projects[0]!;
    captured = {
      runtimeIdentity: this,
      workspaceIdentity: this.workspace,
      storeIdentity: this.workspace.store,
      storeKey: this.workspace.workspaceKey,
      sourceWorldIdentity: this.workspace.sourceWorld,
      sourceWorldRevision: this.workspace.sourceWorld.sourceWorldRevision,
      sourceFilePaths: Object.freeze(project.sourceFiles.map((source) => source.path)),
      projectInputAuthorityIdentity: this.workspace.projectInputAuthority,
      projectInputGenerationIdentity: project.inputGeneration,
      projectInputGenerationRevision: project.inputGeneration.revision,
      projectInputReadCount: project.inputGeneration.readRegisteredInputs().length,
      projectKey: project.projectKey,
      projects: Object.freeze(this.workspace.projects.map((candidate) => Object.freeze({
        rootDir: candidate.rootDir,
        admissionOrigins: candidate.admissionOrigins,
        sourceFilePaths: Object.freeze(candidate.sourceFiles.map((source) =>
          path.normalize(path.resolve(candidate.rootDir, source.path)))),
      }))),
    };
    return answer;
  });
  try {
    await session.run(({ runtime }) => {
      runtime.summary();
    });
  } finally {
    summarySpy.mockRestore();
  }
  if (captured == null) {
    throw new Error('Managed runtime summary did not execute while capturing its test identity.');
  }
  return captured;
}

function capturedProjectForRoot(runtime: CapturedRuntime, rootDir: string): CapturedProject {
  const normalizedRoot = path.normalize(rootDir);
  const project = runtime.projects.find((candidate) => path.normalize(candidate.rootDir) === normalizedRoot);
  if (project == null) {
    throw new Error(`Expected captured project root '${normalizedRoot}'.`);
  }
  return project;
}

async function captureProjectShapeCache(
  session: ManagedSemanticWorkspaceSession,
): Promise<CapturedProjectShapeCache> {
  const summary = SemanticRuntime.prototype.summary;
  let captured: CapturedProjectShapeCache | null = null;
  const summarySpy = vi.spyOn(SemanticRuntime.prototype, 'summary').mockImplementation(function (
    this: SemanticRuntime,
    request = {},
  ) {
    const answer = summary.call(this, request);
    const entries = [...(this as unknown as {
      readonly projectShapesByGenerationKey: ReadonlyMap<string, ProjectShapeCacheEntryForTest>;
    }).projectShapesByGenerationKey.values()];
    captured = {
      runtimeIdentity: this,
      storeIdentity: this.workspace.store,
      entries,
    };
    return answer;
  });
  try {
    await session.run(({ runtime }) => {
      runtime.summary();
    });
  } finally {
    summarySpy.mockRestore();
  }
  if (captured == null) {
    throw new Error('Managed runtime summary did not execute while capturing its project-shape cache.');
  }
  return captured;
}

function createSession(workspaceRoot: string, projectRoot = workspaceRoot): ManagedSemanticWorkspaceSession {
  const session = new ManagedSemanticWorkspaceSession({
    workspaceRoot,
    projects: [{ rootDir: projectRoot }],
  });
  sessions.push(session);
  return session;
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

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'aurelia-managed-session-'));
  temporaryRoots.push(root);
  return root;
}

async function writeWorkspaceFile(rootDir: string, relativePath: string, text: string): Promise<string> {
  const fileName = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fileName), { recursive: true });
  await writeFile(fileName, text);
  return fileName;
}

function storeIncarnationSequence(storeKey: string): number {
  const match = /:incarnation:([0-9a-z]+)$/.exec(storeKey);
  if (match?.[1] == null) {
    throw new Error(`Expected managed semantic workspace store key; received '${storeKey}'.`);
  }
  return Number.parseInt(match[1], 36);
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function yieldTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
