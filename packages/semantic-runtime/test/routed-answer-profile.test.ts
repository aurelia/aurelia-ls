import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeRoutedAnswerProfile,
} from '../src/api/index.js';
import { semanticRuntimeAnalysisReceiptFor } from '../src/api/analysis-receipt.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('routed answer profiling', () => {
  test('profiles the two synchronous routed spans only for an opted-in single answer', async () => {
    const workspaceRoot = await createWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'routed-answer-profile:single',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });
    const request = {
      kind: SemanticAppQueryKind.Summary,
      projectKey: 'app',
      inquiryProfile: 'lsp-cursor',
      appRetention: 'retain-app',
      typeSystemDependencyCacheClearPolicy: 'preserve',
    } as const;

    const profiled = await runtime.answerAppQuery({ ...request, telemetry: {} });
    const unprofiled = await runtime.answerAppQuery(request);

    expectRoutedProfile(profiled, profiled.profile?.routedAnswer);
    expect(semanticRuntimeAnalysisReceiptFor(profiled)).not.toBeNull();
    expect(unprofiled.profile?.routedAnswer).toBeUndefined();
  });

  test('profiles the routed batch root without adding profiles to nested child answers', async () => {
    const workspaceRoot = await createWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'routed-answer-profile:batch',
      projects: [{ projectKey: 'app', rootDir: workspaceRoot }],
    });

    const result = await runtime.answerAppQueries({
      projectKey: 'app',
      inquiryProfile: 'mcp-orientation',
      appRetention: 'retain-app',
      typeSystemDependencyCacheClearPolicy: 'preserve',
      telemetry: {},
      queries: [{ kind: SemanticAppQueryKind.Summary }],
    });

    expectRoutedProfile(result, result.profile?.routedAnswer);
    expect(semanticRuntimeAnalysisReceiptFor(result)).not.toBeNull();
    expect(result.value.rows).toHaveLength(1);
    expect(result.value.rows[0]?.answer.profile?.routedAnswer).toBeUndefined();
  });
});

function expectRoutedProfile(
  answer: SemanticRuntimeAnswer<unknown>,
  profile: SemanticRuntimeRoutedAnswerProfile | null | undefined,
): void {
  expect(answer.result).toBe('answered');
  expect(profile).toBeDefined();
  if (profile == null) {
    throw new Error('Expected routed-answer telemetry.');
  }
  expect(profile.checkpoints).toEqual([
    { name: 'entry', elapsedMilliseconds: 0 },
    { name: 'preflight-complete', elapsedMilliseconds: profile.preflightMilliseconds },
    { name: 'answer-transaction-complete', elapsedMilliseconds: profile.totalMilliseconds },
  ]);
  expect(profile.preflightMilliseconds).toBeGreaterThanOrEqual(0);
  expect(profile.answerTransactionMilliseconds).toBeGreaterThanOrEqual(0);
  expect(profile.totalMilliseconds).toBeGreaterThanOrEqual(profile.longestUninterruptedMilliseconds);
  expect(profile.longestUninterruptedMilliseconds).toBe(Math.max(
    profile.preflightMilliseconds,
    profile.answerTransactionMilliseconds,
  ));
  expect(Object.isFrozen(profile)).toBe(true);
  expect(Object.isFrozen(profile.checkpoints)).toBe(true);
}

async function createWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'semantic-routed-answer-profile-'));
  temporaryRoots.push(workspaceRoot);
  await mkdir(path.join(workspaceRoot, 'src'), { recursive: true });
  await writeFile(path.join(workspaceRoot, 'package.json'), JSON.stringify({ name: 'routed-profile' }), 'utf8');
  await writeFile(path.join(workspaceRoot, 'tsconfig.json'), JSON.stringify({ include: ['src/**/*.ts'] }), 'utf8');
  await writeFile(path.join(workspaceRoot, 'src/main.ts'), 'export const ready = true;\n', 'utf8');
  return workspaceRoot;
}
