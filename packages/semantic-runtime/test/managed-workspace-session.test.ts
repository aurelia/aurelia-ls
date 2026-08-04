import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  ManagedSemanticWorkspaceDisposedError,
  ManagedSemanticWorkspaceOperationStaleError,
  ManagedSemanticWorkspaceReentrantOperationError,
  ManagedSemanticWorkspaceSession,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  SemanticRuntimeProjectInputCurrentnessMode,
  SemanticRuntimeProjectInputReadKind,
  SemanticSourceWorldCurrentnessKind,
  SemanticSourceWorldInputReceipt,
  type SemanticRuntime,
} from '../src/index.js';
import { semanticRuntimeAnalysisReceiptFor } from '../src/api/analysis-receipt.js';

const temporaryRoots: string[] = [];
const sessions: ManagedSemanticWorkspaceSession[] = [];

afterEach(async () => {
  await Promise.allSettled(sessions.splice(0).map((session) => session.dispose()));
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { force: true, recursive: true })));
});

describe('managed semantic workspace session', () => {
  test('singleflights initial boot and a concurrent fresh replacement', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const initiallyObserved = new Set<SemanticRuntime>();

    const initialStoreKeys = await Promise.all(Array.from({ length: 12 }, () =>
      session.run(({ runtime }) => {
        initiallyObserved.add(runtime);
        return runtime.workspace.workspaceKey;
      })));

    expect(initiallyObserved.size).toBe(1);
    expect(new Set(initialStoreKeys).size).toBe(1);
    expect(initialStoreKeys[0]).toMatch(/^semantic-runtime-managed:[0-9a-z]+:incarnation:1$/);
    const initialRuntime = [...initiallyObserved][0]!;
    const clearInitialRuntime = vi.spyOn(initialRuntime, 'clearAnalysisCache');

    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');
    const replacements = new Set<SemanticRuntime>();
    const replacementStoreKeys = await Promise.all(Array.from({ length: 12 }, () =>
      session.run(({ runtime }) => {
        replacements.add(runtime);
        return runtime.workspace.workspaceKey;
      })));

    expect(replacements.size).toBe(1);
    expect([...replacements][0]).not.toBe(initialRuntime);
    expect(new Set(replacementStoreKeys).size).toBe(1);
    expect(replacementStoreKeys[0]).toMatch(/^semantic-runtime-managed:[0-9a-z]+:incarnation:2$/);
    expect(clearInitialRuntime).toHaveBeenCalledTimes(1);
    expect(clearInitialRuntime).toHaveBeenCalledWith({ typeSystemDependencyCacheClearPolicy: 'preserve' });
  });

  test('keeps the current runtime and rebinds an equivalent source world onto its warm store', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const first = await captureRuntime(session);
    const current = await captureRuntime(session);

    expect(current.runtime).toBe(first.runtime);
    expect(current.workspace).toBe(first.workspace);
    expect(current.sourceWorld).toBe(first.sourceWorld);
    expect(current.projectInputGeneration).toBe(first.projectInputGeneration);

    await writeWorkspaceFile(workspaceRoot, 'README.md', '# Irrelevant source-admission churn\n');
    const equivalent = await captureRuntime(session);

    expect(equivalent.runtime).toBe(first.runtime);
    expect(equivalent.workspace).not.toBe(first.workspace);
    expect(equivalent.store).toBe(first.store);
    expect(equivalent.storeKey).toBe(first.storeKey);
    expect(equivalent.sourceWorld).not.toBe(first.sourceWorld);
    expect(equivalent.sourceWorld.sourceWorldRevision).toBe(first.sourceWorld.sourceWorldRevision);
    expect(equivalent.projectInputGeneration).not.toBe(first.projectInputGeneration);
  });

  test('owns source-world validation at managed ingress and egress, outside answer receipt validation', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    await captureRuntime(session);
    const validateSourceWorld = vi.spyOn(SemanticSourceWorldInputReceipt.prototype, 'validate');
    let detachedReceipt: ReturnType<typeof semanticRuntimeAnalysisReceiptFor> = null;

    await session.run(({ runtime, absorb }) => {
      const answer = absorb(runtime.summary());
      detachedReceipt = semanticRuntimeAnalysisReceiptFor(answer);
      expect(detachedReceipt?.isCurrent()).toBe(true);
    });

    expect(validateSourceWorld).toHaveBeenCalledTimes(2);
    expect(detachedReceipt?.validate().isCurrent).toBe(true);
    expect(validateSourceWorld).toHaveBeenCalledTimes(2);
  });

  test('revokes detached receipts on fresh replacement and managed-session disposal', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    let initialReceipt: ReturnType<typeof semanticRuntimeAnalysisReceiptFor> = null;
    const initialRuntime = await session.run(({ runtime, absorb }) => {
      const answer = absorb(runtime.summary());
      initialReceipt = semanticRuntimeAnalysisReceiptFor(answer);
      return runtime;
    });
    expect(initialReceipt?.isCurrent()).toBe(true);

    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');
    let replacementReceipt: ReturnType<typeof semanticRuntimeAnalysisReceiptFor> = null;
    const replacementRuntime = await session.run(({ runtime, absorb }) => {
      const answer = absorb(runtime.summary());
      replacementReceipt = semanticRuntimeAnalysisReceiptFor(answer);
      return runtime;
    });

    expect(replacementRuntime).not.toBe(initialRuntime);
    expect(initialReceipt?.isCurrent()).toBe(false);
    expect(replacementReceipt?.isCurrent()).toBe(true);

    await session.dispose();
    expect(replacementReceipt?.isCurrent()).toBe(false);
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

    expect(added.runtime).not.toBe(baseline.runtime);
    expect(reverted.runtime).not.toBe(added.runtime);
    expect(new Set([baseline.storeKey, added.storeKey, reverted.storeKey]).size).toBe(3);
    expect(storeIncarnationSequence(baseline.storeKey)).toBe(1);
    expect(storeIncarnationSequence(added.storeKey)).toBe(2);
    expect(storeIncarnationSequence(reverted.storeKey)).toBe(3);
    expect(added.sourceWorld.sourceWorldRevision).not.toBe(baseline.sourceWorld.sourceWorldRevision);
    expect(reverted.sourceWorld.sourceWorldRevision).toBe(baseline.sourceWorld.sourceWorldRevision);
    expect(added.projectInputAuthority).toBe(baseline.projectInputAuthority);
    expect(reverted.projectInputAuthority).toBe(baseline.projectInputAuthority);
    expect(added.projectInputGeneration.revision).not.toBe(baseline.projectInputGeneration.revision);
    expect(reverted.projectInputGeneration.revision).not.toBe(added.projectInputGeneration.revision);
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
      expect(runtime).toBe(baseline.runtime);
      entered.resolve();
      await release.promise;
      throw callbackFailure;
    });
    await entered.promise;
    await writeWorkspaceFile(workspaceRoot, 'src/added.ts', 'export const added = true;\n');

    const replacementOperation = session.run(({ runtime }) => {
      replacementCallbackCalls += 1;
      return runtime;
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
      previousSourceWorldRevision: baseline.sourceWorld.sourceWorldRevision,
      cause: callbackFailure,
    });
    const replacementRuntime = await replacementOperation;

    expect(staleCallbackCalls).toBe(1);
    expect(replacementCallbackCalls).toBe(1);
    expect(replacementRuntime).not.toBe(baseline.runtime);
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
      return runtime;
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
    const reboundRuntime = await replacement;
    expect(replacementCalls).toBe(1);
    expect(reboundRuntime).toBe(baseline.runtime);
    expect(reboundRuntime.workspace.workspaceKey).toBe(baseline.storeKey);
    expect(reboundRuntime.workspace).not.toBe(baseline.workspace);
  });

  test('validates egress after consumer mapping and never replays a stale callback', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    let calls = 0;

    const operation = session.run(async ({ runtime }) => {
      calls += 1;
      await writeWorkspaceFile(workspaceRoot, 'src/during-operation.ts', 'export const changed = true;\n');
      return {
        mappedStoreKey: runtime.workspace.workspaceKey,
        sourceCount: runtime.workspace.projects[0]!.sourceFiles.length,
      };
    });

    await expect(operation).rejects.toBeInstanceOf(ManagedSemanticWorkspaceOperationStaleError);
    const replacement = await captureRuntime(session);
    expect(calls).toBe(1);
    expect(replacement.runtime).not.toBe(baseline.runtime);
    expect(replacement.sourceWorld.projects[0]!.sourceFiles.map((source) => source.path))
      .toContain('src/during-operation.ts');
  });

  test('composes absorbed answer receipts and rejects analysis changes that leave source membership current', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'package.json', '{"name":"receipt-workspace"}');
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const projectKey = baseline.runtime.workspace.projects[0]!.projectKey;
    let callbackCalls = 0;

    const operation = session.run(async ({ runtime, absorb }) => {
      callbackCalls += 1;
      const answer = absorb(await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        projectKey,
      }));
      await writeFile(sourceFile, 'export const value = 2;\n');
      return answer.value;
    });
    const staleError = await operation.then(() => null, (error: unknown) => error);

    expect(staleError).toBeInstanceOf(ManagedSemanticWorkspaceOperationStaleError);
    expect(staleError).toMatchObject({
      reason: 'analysis-basis-changed',
      currentnessKind: null,
      previousSourceWorldRevision: baseline.sourceWorld.sourceWorldRevision,
      nextSourceWorldRevision: baseline.sourceWorld.sourceWorldRevision,
    });
    expect((staleError as ManagedSemanticWorkspaceOperationStaleError).changedReadKeys.length).toBeGreaterThan(0);
    expect(callbackCalls).toBe(1);

    const afterContentChange = await captureRuntime(session);
    expect(afterContentChange.runtime).toBe(baseline.runtime);
    expect(afterContentChange.sourceWorld).toBe(baseline.sourceWorld);
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
    const registeredBefore = baseline.projectInputGeneration.readRegisteredInputs().length;
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
    expect(after.runtime).toBe(baseline.runtime);
    expect(after.sourceWorld).toBe(baseline.sourceWorld);
    expect(after.projectInputGeneration.readRegisteredInputs()).toHaveLength(registeredBefore);
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
    const projectKey = baseline.runtime.workspace.projects[0]!.projectKey;
    let mappedText: string | undefined;
    let callsBeforeMapping = 0;
    let callsAfterMapping = 0;

    const operation = session.run(async ({ runtime, absorb, readSourceText }) => {
      const answer = absorb(await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        projectKey,
      }));
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
    const projectKey = baseline.runtime.workspace.projects[0]!.projectKey;
    let calls = 0;

    const result = await session.run(async ({ runtime, absorb }) => {
      calls += 1;
      const answer = absorb(await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.SourceFiles,
        projectKey,
      }));
      await writeFile(sourceFile, 'export const value = 2;\n');
      return answer.result;
    });

    expect(result).toBe('answered');
    expect(calls).toBe(1);
    const afterContentChange = await captureRuntime(session);
    expect(afterContentChange.runtime).toBe(baseline.runtime);
    expect(afterContentChange.sourceWorld).toBe(baseline.sourceWorld);
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
    const projectKey = baseline.runtime.workspace.projects[0]!.projectKey;
    const callbackFailure = new Error('consumer mapping failed');

    const operation = session.run(async ({ runtime, absorb }) => {
      absorb(await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        projectKey,
      }));
      await writeFile(sourceFile, 'export const value = 2;\n');
      throw callbackFailure;
    });

    await expect(operation).rejects.toBe(callbackFailure);
    const afterFailure = await captureRuntime(session);
    expect(afterFailure.runtime).toBe(baseline.runtime);
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
    expect(equivalent.runtime).toBe(baseline.runtime);
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
    const childConfig = await writeWorkspaceFile(childRoot, 'aurelia.project.json', '{"version":2}');
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

    const first = await session.run(({ runtime, absorb }) => {
      const answer = absorb(runtime.nativeProjectConfigurations({
        sourceFilePaths: [childConfig, rootConfig, childConfig],
        page: { size: 1 },
        inquiryProfile: 'lsp-cursor',
      }));
      return {
        runtime,
        cursor: answer.page!.nextCursor!,
      };
    });
    await writeFile(childConfig, '{"version":1,"unknown":true}', 'utf8');
    authority.advance();

    const staleCursor = await session.run(({ runtime, absorb }) => {
      const answer = absorb(runtime.nativeProjectConfigurations({
        sourceFilePaths: [childConfig, rootConfig],
        page: { size: 1, cursor: first.cursor },
        inquiryProfile: 'lsp-cursor',
      }));
      return {
        runtime,
        result: answer.result,
        cursorProblem: answer.page?.cursorProblem,
        rows: answer.value.rows,
      };
    });

    expect(staleCursor.runtime).not.toBe(first.runtime);
    expect(staleCursor.result).toBe('invalid');
    expect(staleCursor.cursorProblem?.kind).toBe('stale');
    expect(staleCursor.rows).toEqual([]);
  });

  test('keeps a failed fresh transition atomic and retries without reusing its store sequence', async () => {
    const workspaceRoot = await createWorkspace();
    const projectRoot = path.join(workspaceRoot, 'project');
    await writeWorkspaceFile(projectRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot, projectRoot);
    const baseline = await captureRuntime(session);
    const clearBaselineRuntime = vi.spyOn(baseline.runtime, 'clearAnalysisCache');
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
    expect(recovered.runtime).not.toBe(baseline.runtime);
    expect(storeIncarnationSequence(recovered.storeKey)).toBe(3);
    expect(recovered.projectInputAuthority).toBe(baseline.projectInputAuthority);
    expect(clearBaselineRuntime).toHaveBeenCalledTimes(1);
  });

  test('stops admission immediately but lets disposal wait for a pinned current operation', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const session = createSession(workspaceRoot);
    const baseline = await captureRuntime(session);
    const clearRuntime = vi.spyOn(baseline.runtime, 'clearAnalysisCache');
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
  readonly runtime: SemanticRuntime;
  readonly workspace: SemanticRuntime['workspace'];
  readonly store: SemanticRuntime['workspace']['store'];
  readonly storeKey: string;
  readonly sourceWorld: SemanticRuntime['workspace']['sourceWorld'];
  readonly projectInputAuthority: SemanticRuntime['workspace']['projectInputAuthority'];
  readonly projectInputGeneration: SemanticRuntime['workspace']['projects'][number]['inputGeneration'];
}

interface ProjectShapeCacheEntryForTest {
  readonly shape: object;
}

interface CapturedProjectShapeCache {
  readonly runtime: SemanticRuntime;
  readonly entries: readonly ProjectShapeCacheEntryForTest[];
}

async function captureRuntime(session: ManagedSemanticWorkspaceSession): Promise<CapturedRuntime> {
  return session.run(({ runtime }) => ({
    runtime,
    workspace: runtime.workspace,
    store: runtime.workspace.store,
    storeKey: runtime.workspace.workspaceKey,
    sourceWorld: runtime.workspace.sourceWorld,
    projectInputAuthority: runtime.workspace.projectInputAuthority,
    projectInputGeneration: runtime.workspace.projects[0]!.inputGeneration,
  }));
}

async function captureProjectShapeCache(
  session: ManagedSemanticWorkspaceSession,
): Promise<CapturedProjectShapeCache> {
  return session.run(({ runtime, absorb }) => {
    absorb(runtime.summary());
    const entries = [...(runtime as unknown as {
      readonly projectShapesByGenerationKey: ReadonlyMap<string, ProjectShapeCacheEntryForTest>;
    }).projectShapesByGenerationKey.values()];
    return { runtime, entries };
  });
}

function createSession(workspaceRoot: string, projectRoot = workspaceRoot): ManagedSemanticWorkspaceSession {
  const session = new ManagedSemanticWorkspaceSession({
    workspaceRoot,
    projects: [{ rootDir: projectRoot }],
  });
  sessions.push(session);
  return session;
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
