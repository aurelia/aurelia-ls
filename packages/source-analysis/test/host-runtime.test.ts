import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createSourceAnalysisHostRuntime } from '../out/index.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('SourceAnalysisHostRuntime', () => {
  it('opens sessions, refreshes snapshots on demand, invalidates files, and materializes outputs', () => {
    const repoPath = createFixtureRepo();
    const runtime = createSourceAnalysisHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        target: 'fixture',
        warmPrograms: true,
      },
    });

    expect(opened.status).toBe('ok');
    expect(opened.result.dirtyKinds).toEqual(['deps', 'typerefs', 'exports']);

    const sessionId = opened.result.sessionId;
    const initialStatus = runtime.execute({
      command: 'session.status',
      args: { sessionId },
    });
    expect(initialStatus.result.sessions).toHaveLength(1);
    expect(initialStatus.result.sessions[0]?.dirtyKinds).toEqual(['deps', 'typerefs', 'exports']);

    const depsSummary = runtime.execute({
      command: 'query.deps.summary',
      args: { sessionId },
    });
    expect(depsSummary.status).toBe('ok');
    expect(depsSummary.meta.refreshedKinds).toEqual(['deps']);
    expect(depsSummary.result.summary.files_analyzed).toBe(2);

    const depsSummaryCached = runtime.execute({
      command: 'query.deps.summary',
      args: { sessionId },
    });
    expect(depsSummaryCached.meta.cache.hit).toBe(true);
    expect(depsSummaryCached.meta.refreshedKinds).toEqual([]);

    const exportsSummary = runtime.execute({
      command: 'query.exports.summary',
      args: { sessionId },
    });
    expect(exportsSummary.result.summary.exports).toBeGreaterThan(0);

    writeFileSync(
      join(repoPath, 'src', 'types.ts'),
      [
        'export interface Example { value: string; nested?: Nested; }',
        'export interface Nested { count: number; }',
        '',
      ].join('\n'),
    );

    const invalidated = runtime.execute({
      command: 'session.invalidate',
      args: {
        sessionId,
        files: [join(repoPath, 'src', 'types.ts')],
      },
    });
    expect(invalidated.result.invalidatedFiles).toEqual(['src/types.ts']);
    expect(invalidated.result.dirtyKinds).toEqual(['deps', 'typerefs', 'exports']);

    const typeRefsSummary = runtime.execute({
      command: 'query.typerefs.summary',
      args: { sessionId },
    });
    expect(typeRefsSummary.meta.refreshedKinds).toEqual(['typerefs']);
    expect(typeRefsSummary.result.summary.type_declarations).toBe(2);

    const materializeDir = join(repoPath, '.materialized');
    const materialized = runtime.execute({
      command: 'materializeSnapshots',
      args: {
        sessionId,
        kinds: ['deps', 'typerefs'],
        outDir: materializeDir,
      },
    });

    expect(materialized.meta.refreshedKinds).toEqual(['deps']);
    expect(existsSync(join(materializeDir, 'fixture-deps.json'))).toBe(true);
    expect(existsSync(join(materializeDir, 'fixture-typerefs.json'))).toBe(true);

    const depsSnapshot = JSON.parse(
      readFileSync(join(materializeDir, 'fixture-deps.json'), 'utf-8'),
    ) as {
      readonly summary: {
        readonly files_analyzed: number;
      };
    };
    expect(depsSnapshot.summary.files_analyzed).toBe(2);

    const finalStatus = runtime.execute({
      command: 'session.status',
      args: { sessionId },
    });
    expect(finalStatus.result.sessions[0]?.dirtyKinds).toEqual(['exports']);
  });

  it('runs a package audit query that combines blind spots and under-integrated file hints', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSourceAnalysisHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        target: 'fixture-audit',
      },
    });

    const sessionId = opened.result.sessionId;
    const audit = runtime.execute({
      command: 'query.audit.package',
      args: {
        sessionId,
        packageName: '@fixture/source-analysis-audit',
      },
    });

    expect(audit.status).toBe('ok');
    expect(audit.meta.refreshedKinds).toEqual(['deps', 'typerefs', 'exports']);
    expect(audit.result.answer.outcome.tag).toBe('open-boundary');
    expect(audit.result.answer.outcome.value?.findings.some((finding) =>
      finding.code === 'package-uncovered-files',
    )).toBe(true);
    expect(audit.result.answer.outcome.value?.findings.some((finding) =>
      finding.code === 'under-integrated-file'
      && finding.primaryRef.value === 'src/dormant.ts',
    )).toBe(true);
    const candidateRootsFinding = audit.result.answer.outcome.value?.findings.find((finding) =>
      finding.code === 'candidate-entry-roots',
    );
    expect(candidateRootsFinding).toBeTruthy();
    expect(candidateRootsFinding?.relatedRefs.some((ref) => ref.value === 'src/tool.ts')).toBe(true);
    expect(candidateRootsFinding?.relatedRefs.some((ref) => ref.value === 'src/cli.ts')).toBe(false);
    const exerciseOnlyFinding = audit.result.answer.outcome.value?.findings.find((finding) =>
      finding.code === 'exercise-only-files',
    );
    expect(exerciseOnlyFinding).toBeTruthy();
    expect(exerciseOnlyFinding?.relatedRefs.some((ref) => ref.value === 'src/test-only.ts')).toBe(true);

    const routeWitness = runtime.execute({
      command: 'query.route.witness',
      args: {
        sessionId,
        focusKind: 'file',
        focusValue: 'src/live.ts',
      },
    });

    expect(routeWitness.status).toBe('ok');
    expect(routeWitness.meta.refreshedKinds).toEqual([]);
    expect(routeWitness.result.answer.outcome.tag).toBe('hit');
    expect(routeWitness.result.answer.outcome.trust.kind).toBe('grounded');
    expect(routeWitness.result.answer.outcome.value?.witnesses[0]?.rootKind).toBe('public-api');
    expect(routeWitness.result.answer.outcome.value?.witnesses[0]?.files).toEqual([
      'src/index.ts',
      'src/live.ts',
    ]);

    const renderedAudit = runtime.execute({
      command: 'query.audit.package',
      args: {
        sessionId,
        packageName: '@fixture/source-analysis-audit',
        readMode: 'supporting-evidence',
        renderStyle: 'plain-text',
        consumer: 'machine',
      },
    });
    expect(renderedAudit.result.answer.query.readMode).toBe('supporting-evidence');
    expect(renderedAudit.result.rendered?.style).toBe('plain-text');
    if (renderedAudit.result.rendered?.style !== 'plain-text') {
      throw new Error('Expected plain-text render output.');
    }
    expect(renderedAudit.result.rendered.rendered.lines.length).toBeGreaterThan(
      renderedAudit.result.rendered.rendered.summaryLines.length,
    );

    const renderedWitness = runtime.execute({
      command: 'query.route.witness',
      args: {
        sessionId,
        focusKind: 'file',
        focusValue: 'src/live.ts',
        renderStyle: 'json-document',
      },
    });
    expect(renderedWitness.result.rendered?.style).toBe('json-document');
    if (renderedWitness.result.rendered?.style !== 'json-document') {
      throw new Error('Expected json-document render output.');
    }
    expect(renderedWitness.result.rendered.document.blocks.some((block) => block.kind === 'witness-list')).toBe(true);
  });

  it('detects fragmented answer coordination from repeated envelope builders and carriers', () => {
    const repoPath = createCoordinationFixtureRepo();
    const runtime = createSourceAnalysisHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        target: 'fixture-coordination',
      },
    });

    const sessionId = opened.result.sessionId;
    const audit = runtime.execute({
      command: 'query.audit.package',
      args: {
        sessionId,
        packageName: '@fixture/source-analysis-coordination',
      },
    });

    expect(audit.status).toBe('ok');
    const coordinationFinding = audit.result.answer.outcome.value?.findings.find((finding) =>
      finding.code === 'answer-coordination-fragmentation',
    );
    expect(coordinationFinding).toBeTruthy();
    expect(coordinationFinding?.relatedRefs.some((ref) => ref.value === 'src/alpha.ts')).toBe(true);
    expect(coordinationFinding?.relatedRefs.some((ref) => ref.value === 'src/beta.ts')).toBe(true);

    const presentationFinding = audit.result.answer.outcome.value?.findings.find((finding) =>
      finding.code === 'answer-presentation-fragmentation',
    );
    expect(presentationFinding).toBeTruthy();
    expect(presentationFinding?.evidence.some((line) => line.includes('AlphaValue'))).toBe(true);
    expect(presentationFinding?.evidence.some((line) => line.includes('BetaValue'))).toBe(true);
  });

  it('describes, plans, and repairs capability ingress through the hosted runtime', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSourceAnalysisHostRuntime();

    const describe = runtime.execute({
      command: 'describe.capabilities',
      args: {
        question: 'Why is src/live.ts alive?',
        renderStyle: 'plain-text',
      },
    });

    expect(describe.status).toBe('ok');
    expect(describe.result.answer.outcome.value?.capabilities[0]?.command).toBe('query.route.witness');
    expect(describe.result.rendered?.style).toBe('plain-text');

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        target: 'fixture-ingress',
      },
    });

    const sessionId = opened.result.sessionId;
    const plan = runtime.execute({
      command: 'plan.question',
      args: {
        question: 'Audit @fixture/source-analysis-audit for tech debt.',
        sessionId,
        renderStyle: 'json-document',
      },
    });

    expect(plan.status).toBe('ok');
    expect(plan.result.answer.outcome.value?.status).toBe('ready');
    expect(plan.result.answer.outcome.value?.invocation).toEqual({
      command: 'query.audit.package',
      args: {
        sessionId,
        packageName: '@fixture/source-analysis-audit',
      },
    });
    expect(plan.result.rendered?.style).toBe('json-document');

    const repair = runtime.execute({
      command: 'repair.command',
      args: {
        command: 'query.audit.pkg',
        question: 'Audit @fixture/source-analysis-audit for tech debt.',
        args: {
          sessionId,
          packageName: '@fixture/source-analysis-audit',
        },
      },
    });

    expect(repair.status).toBe('ok');
    expect(repair.result.answer.outcome.value?.status).toBe('repaired');
    expect(repair.result.answer.outcome.value?.invocation).toEqual({
      command: 'query.audit.package',
      args: {
        sessionId,
        packageName: '@fixture/source-analysis-audit',
      },
    });
  });

  it('describes inquiry families, plans them, and answers questions end-to-end through the hosted runtime', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSourceAnalysisHostRuntime();

    const describe = runtime.execute({
      command: 'describe.inquiries',
      args: {
        question: 'I want to understand the repo before editing it.',
        renderStyle: 'plain-text',
      },
    });

    expect(describe.status).toBe('ok');
    expect(describe.result.answer.outcome.value?.inquiries[0]?.id).toBe('workspace-orientation');
    expect(describe.result.answer.outcome.value?.diagnostics.uncoveredCommands).toEqual([]);
    expect(describe.result.rendered?.style).toBe('plain-text');

    const plan = runtime.execute({
      command: 'plan.inquiry',
      args: {
        question: 'Audit @fixture/source-analysis-audit for tech debt.',
        repoPath,
        target: 'fixture-inquiry',
        renderStyle: 'json-document',
      },
    });

    expect(plan.status).toBe('ok');
    expect(plan.result.answer.outcome.value?.status).toBe('ready');
    expect(plan.result.answer.outcome.value?.inquiry?.id).toBe('package-audit');
    expect(plan.result.answer.outcome.value?.steps.map((step) => step.command)).toEqual([
      'session.open',
      'query.audit.package',
    ]);
    expect(plan.result.rendered?.style).toBe('json-document');

    const askedAudit = runtime.execute({
      command: 'ask.question',
      args: {
        question: 'Audit @fixture/source-analysis-audit for tech debt.',
        repoPath,
        target: 'fixture-inquiry',
      },
    });

    expect(askedAudit.status).toBe('ok');
    expect(askedAudit.result.answer.outcome.value?.status).toBe('answered');
    expect(askedAudit.result.answer.outcome.value?.inquiry?.id).toBe('package-audit');
    expect(askedAudit.result.execution?.ephemeralSession).toBe(true);
    expect(askedAudit.result.execution?.steps.map((step) => step.command)).toEqual([
      'session.open',
      'query.audit.package',
    ]);
    expect(askedAudit.result.execution?.steps.every((step) => step.status === 'executed')).toBe(true);
    expect(askedAudit.result.answer.outcome.value?.execution?.command).toBe('query.audit.package');

    const askedOrientation = runtime.execute({
      command: 'ask.question',
      args: {
        question: 'Orient me to @fixture/source-analysis-audit before I edit it.',
        repoPath,
        target: 'fixture-inquiry',
        renderStyle: 'plain-text',
      },
    });

    expect(askedOrientation.status).toBe('ok');
    expect(askedOrientation.result.answer.outcome.value?.status).toBe('answered');
    expect(askedOrientation.result.answer.outcome.value?.inquiry?.id).toBe('workspace-orientation');
    expect(askedOrientation.result.execution?.steps.map((step) => step.command)).toEqual([
      'session.open',
      'query.navigate',
    ]);
    expect(askedOrientation.result.answer.outcome.value?.execution?.command).toBe('query.navigate');
    expect(askedOrientation.result.rendered?.style).toBe('plain-text');
  });

  it('uses current snapshots for live ask.question flows instead of opening a transient session', () => {
    const runtime = createSourceAnalysisHostRuntime();

    const asked = runtime.execute({
      command: 'ask.question',
      args: {
        question: 'Audit @aurelia-ls/source-analysis for tech debt.',
        repoPath: process.cwd(),
      },
    });

    expect(asked.status).toBe('ok');
    expect(asked.result.answer.outcome.value?.status).toBe('answered');
    expect(asked.result.answer.outcome.value?.execution?.command).toBe('query.audit.package');
    expect(asked.result.answer.query.worldFrame?.freshness).toBe('snapshot');
    expect(asked.result.execution?.ephemeralSession).toBe(false);
    expect(asked.result.execution?.steps.some((step) =>
      step.command === 'session.open' && step.status === 'skipped',
    )).toBe(true);
  });
});

function createFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-host-runtime-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/source-analysis-host',
        type: 'module',
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          noEmit: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'src', 'types.ts'),
    'export interface Example { value: string; }\n',
  );
  writeFileSync(
    join(repoPath, 'src', 'index.ts'),
    [
      "export type { Example } from './types.js';",
      'export const answer = 42;',
      '',
    ].join('\n'),
  );

  return repoPath;
}

function createAuditFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-host-audit-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  mkdirSync(join(repoPath, 'test'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/source-analysis-audit',
        type: 'module',
        bin: {
          'fixture-audit': './out/cli.js',
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          noEmit: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'src', 'live.ts'),
    'export interface LiveShape { value: string; }\n',
  );
  writeFileSync(
    join(repoPath, 'src', 'cli.ts'),
    [
      "import { auditReady } from './index.js';",
      'void auditReady;',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'dormant.ts'),
    'export interface DormantShape { parked: boolean; }\n',
  );
  writeFileSync(
    join(repoPath, 'src', 'tool.ts'),
    [
      "import { auditReady } from './index.js';",
      'void auditReady;',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'index.ts'),
    [
      "export type { LiveShape } from './live.js';",
      'export const auditReady = true;',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'test-only.ts'),
    'export interface TestOnlyShape { helper: boolean; }\n',
  );
  writeFileSync(
    join(repoPath, 'test', 'index.test.ts'),
    [
      "import { auditReady } from '../src/index.js';",
      "import type { TestOnlyShape } from '../src/test-only.js';",
      'void auditReady;',
      'type _ExerciseOnly = TestOnlyShape;',
      '',
    ].join('\n'),
  );

  return repoPath;
}

function createCoordinationFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-host-coordination-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/source-analysis-coordination',
        type: 'module',
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          noEmit: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'src', 'alpha.ts'),
    [
      "type FocusRef = { kind: string; value: string; };",
      '',
      'export interface AlphaRef {',
      '  readonly kind: string;',
      '  readonly value: string;',
      '  readonly label: string;',
      '  readonly detail?: string;',
      '}',
      '',
      'export interface AlphaValue {',
      '  readonly title: string;',
      '  readonly summaryLines: readonly string[];',
      '  readonly primaryRef: AlphaRef;',
      '  readonly relatedRefs: readonly AlphaRef[];',
      '}',
      '',
      'function createAlphaAnswer() {',
      "  const summaryLines = ['alpha summary'];",
      "  const focusRef: FocusRef = { kind: 'package', value: 'alpha' };",
      '  const value: AlphaValue = {',
      "    title: 'Alpha answer',",
      '    summaryLines,',
      "    primaryRef: { kind: 'package', value: 'alpha', label: 'alpha' },",
      '    relatedRefs: [],',
      '  };',
      '  return {',
      "    schemaVersion: 'v0alpha1',",
      "    query: { focusRef, questionRoute: 'inventory' },",
      '    slots: {',
      "      focus_ref: focusRef,",
      "      question_route: 'inventory',",
      "      outcome: { tag: 'hit', summary: summaryLines[0], value },",
      '    },',
      "    outcome: { tag: 'hit', summary: summaryLines[0], value },",
      '  };',
      '}',
      '',
      'export function buildAlphaCard() {',
      '  return createAlphaAnswer();',
      '}',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'beta.ts'),
    [
      "type FocusRef = { kind: string; value: string; };",
      '',
      'export interface BetaRef {',
      '  readonly kind: string;',
      '  readonly value: string;',
      '  readonly label: string;',
      '  readonly detail?: string;',
      '}',
      '',
      'export interface BetaValue {',
      '  readonly title: string;',
      '  readonly summaryLines: readonly string[];',
      '  readonly primaryRef: BetaRef;',
      '  readonly relatedRefs: readonly BetaRef[];',
      '}',
      '',
      'function createBetaAnswer() {',
      "  const summaryLines = ['beta summary'];",
      "  const focusRef: FocusRef = { kind: 'package', value: 'beta' };",
      '  const value: BetaValue = {',
      "    title: 'Beta answer',",
      '    summaryLines,',
      "    primaryRef: { kind: 'package', value: 'beta', label: 'beta' },",
      '    relatedRefs: [],',
      '  };',
      '  return {',
      "    schemaVersion: 'v0alpha1',",
      "    query: { focusRef, questionRoute: 'inventory' },",
      '    slots: {',
      "      focus_ref: focusRef,",
      "      question_route: 'inventory',",
      "      outcome: { tag: 'hit', summary: summaryLines[0], value },",
      '    },',
      "    outcome: { tag: 'hit', summary: summaryLines[0], value },",
      '  };',
      '}',
      '',
      'export function buildBetaCard() {',
      '  return createBetaAnswer();',
      '}',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'index.ts'),
    [
      "export { buildAlphaCard } from './alpha.js';",
      "export { buildBetaCard } from './beta.js';",
      '',
    ].join('\n'),
  );

  return repoPath;
}
