import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  ManagedSemanticWorkspaceSession,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeAnalysisCurrentnessError,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputReadKind,
  createSemanticRuntime,
  type SemanticRuntimeSourceTextOverlay,
} from '../src/index.js';
import {
  semanticRuntimeAnalysisReceiptFor,
  type SemanticRuntimeAnalysisReceipt,
} from '../src/api/analysis-receipt.js';

const temporaryRoots: string[] = [];
const sessions: ManagedSemanticWorkspaceSession[] = [];

afterEach(async () => {
  await Promise.allSettled(sessions.splice(0).map((session) => session.dispose()));
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe('public source-path answer receipts', () => {
  test('captures positive and negative routed fallback probes in the exact answer receipt', async () => {
    const fixture = await createFallbackWorkspace();
    const overlay = new MutableSourceOverlay();
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixture.workspaceRoot,
      storeKey: 'source-path-receipt:routed-fallback',
      projects: [{ projectKey: 'app', rootDir: fixture.projectRoot }],
      projectInputAuthority: authority,
    });

    const answer = await runtime.answerAppQuery(routedFallbackQuery());
    const receipt = semanticRuntimeAnalysisReceiptFor(answer);

    expect(receipt).not.toBeNull();
    expectCapturedFallbackProbes(receipt!, authority, fixture);
    expect(receipt?.isCurrent()).toBe(true);

    overlay.write(fixture.workspaceCandidate, 'the previously absent workspace interpretation now exists\n');
    expect(receipt?.validate()).toMatchObject({
      isCurrent: false,
      changedReadKeys: [authority.fileContentReadKey(fixture.workspaceCandidate)],
      changedFacets: [SemanticRuntimeProjectInputReadKind.FileContent],
    });
  }, 60_000);

  test('keeps an admitted project alias independent from an unrelated workspace fallback', async () => {
    const fixture = await createFallbackWorkspace();
    const overlay = new MutableSourceOverlay();
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixture.workspaceRoot,
      storeKey: 'source-path-receipt:admitted-alias',
      projects: [{ projectKey: 'app', rootDir: fixture.projectRoot }],
      projectInputAuthority: authority,
    });
    const unrelatedWorkspaceCandidate = path.join(fixture.workspaceRoot, 'src/main.ts');
    const unrelatedReadKey = authority.fileContentReadKey(unrelatedWorkspaceCandidate);
    const query = routedAdmittedQuery();

    const first = await runtime.answerAppQuery(query);
    const firstReceipt = semanticRuntimeAnalysisReceiptFor(first);
    expect(firstReceipt).not.toBeNull();
    expect(firstReceipt?.projectInputReads.map((read) => read.readKey)).not.toContain(unrelatedReadKey);

    overlay.write(unrelatedWorkspaceCandidate, 'export const unrelatedWorkspaceMain = true;\n');
    expect(firstReceipt?.validate()).toMatchObject({
      isCurrent: true,
      changedReadKeys: [],
    });

    const retained = await runtime.answerAppQuery(query);
    const retainedReceipt = semanticRuntimeAnalysisReceiptFor(retained);
    expect(retainedReceipt?.projectInputReads.map((read) => read.readKey)).not.toContain(unrelatedReadKey);
    expect(retainedReceipt?.isCurrent()).toBe(true);
  }, 60_000);

  test('keeps direct open-app fallback probes on retained-query reuse currentness', async () => {
    const fixture = await createFallbackWorkspace();
    const overlay = new MutableSourceOverlay();
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixture.workspaceRoot,
      storeKey: 'source-path-receipt:direct-fallback',
      projects: [{ projectKey: 'app', rootDir: fixture.projectRoot }],
      projectInputAuthority: authority,
    });
    const app = await runtime.openApp({ projectKey: 'app' });
    const query = directFallbackQuery();

    const first = app.ask(query);
    const receipt = semanticRuntimeAnalysisReceiptFor(first);
    expect(receipt).not.toBeNull();
    expectCapturedFallbackProbes(receipt!, authority, fixture);

    overlay.write(fixture.workspaceCandidate, 'a competing workspace interpretation appeared\n');
    let failure: unknown;
    try {
      app.ask(query);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(SemanticRuntimeAnalysisCurrentnessError);
    expect(failure).toMatchObject({
      reason: 'query-answer-lease-changed',
      changedReadKeys: [authority.fileContentReadKey(fixture.workspaceCandidate)],
      changedFacets: [SemanticRuntimeProjectInputReadKind.FileContent],
    });
  }, 60_000);

  test('refuses managed egress when a negative routed fallback probe changes after materialization', async () => {
    const fixture = await createFallbackWorkspace();
    const overlay = new MutableSourceOverlay();
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const session = new ManagedSemanticWorkspaceSession({
      workspaceRoot: fixture.workspaceRoot,
      projects: [{ projectKey: 'app', rootDir: fixture.projectRoot }],
      projectInputAuthority: authority,
    });
    sessions.push(session);

    const operation = session.run(async ({ runtime }) => {
      const answer = await runtime.answerAppQuery(routedFallbackQuery());
      expect(semanticRuntimeAnalysisReceiptFor(answer)?.isCurrent()).toBe(true);
      overlay.write(fixture.workspaceCandidate, 'a competing path appeared before managed egress\n');
      return answer.value;
    });

    await expect(operation).rejects.toMatchObject({
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-basis-changed',
      changedReadKeys: [authority.fileContentReadKey(fixture.workspaceCandidate)],
      changedFacets: [SemanticRuntimeProjectInputReadKind.FileContent],
    });
  }, 60_000);
});

function routedFallbackQuery() {
  return {
    kind: SemanticAppQueryKind.AnalysisLimitations,
    projectKey: 'app',
    inquiryProfile: 'mcp-orientation',
    appRetention: 'retain-app',
    includeAuthoringTemplates: false,
    sourceFile: { filePath: 'probes/locus.txt' },
  } as const;
}

function routedAdmittedQuery() {
  return {
    kind: SemanticAppQueryKind.AnalysisLimitations,
    projectKey: 'app',
    inquiryProfile: 'mcp-orientation',
    appRetention: 'retain-app',
    includeAuthoringTemplates: false,
    sourceFile: { filePath: 'src/main.ts' },
  } as const;
}

function directFallbackQuery() {
  return {
    kind: SemanticAppQueryKind.AnalysisLimitations,
    inquiryProfile: 'mcp-orientation',
    sourceFile: { filePath: 'probes/locus.txt' },
  } as const;
}

function expectCapturedFallbackProbes(
  receipt: SemanticRuntimeAnalysisReceipt,
  authority: SemanticRuntimeProjectInputAuthority,
  fixture: FallbackWorkspace,
): void {
  const readsByKey = new Map(receipt.projectInputReads.map((read) => [read.readKey, read]));
  const negative = readsByKey.get(authority.fileContentReadKey(fixture.workspaceCandidate));
  const positive = readsByKey.get(authority.fileContentReadKey(fixture.projectCandidate));

  expect(negative).toMatchObject({
    kind: SemanticRuntimeProjectInputReadKind.FileContent,
    value: undefined,
  });
  expect(positive).toMatchObject({
    kind: SemanticRuntimeProjectInputReadKind.FileContent,
    value: fixture.projectCandidateText,
  });
}

interface FallbackWorkspace {
  readonly workspaceRoot: string;
  readonly projectRoot: string;
  readonly workspaceCandidate: string;
  readonly projectCandidate: string;
  readonly projectCandidateText: string;
}

async function createFallbackWorkspace(): Promise<FallbackWorkspace> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'semantic-source-path-receipt-'));
  temporaryRoots.push(workspaceRoot);
  const projectRoot = path.join(workspaceRoot, 'packages/app');
  const workspaceCandidate = path.join(workspaceRoot, 'probes/locus.txt');
  const projectCandidate = path.join(projectRoot, 'probes/locus.txt');
  const projectCandidateText = 'the exact project-relative fallback source\n';

  await mkdir(path.join(projectRoot, 'src'), { recursive: true });
  await mkdir(path.dirname(projectCandidate), { recursive: true });
  await writeFile(path.join(projectRoot, 'package.json'), JSON.stringify({ name: 'source-path-receipt-app' }));
  await writeFile(path.join(projectRoot, 'tsconfig.json'), JSON.stringify({ include: ['src/main.ts'] }));
  await writeFile(path.join(projectRoot, 'src/main.ts'), 'export const main = true;\n');
  await writeFile(projectCandidate, projectCandidateText);

  return {
    workspaceRoot,
    projectRoot,
    workspaceCandidate,
    projectCandidate,
    projectCandidateText,
  };
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
