import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createSnapshotHostRuntime } from '../out/host/runtime.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('SnapshotHostRuntime', () => {
  it('opens sessions, refreshes snapshots on demand, invalidates files, and materializes outputs', () => {
    const repoPath = createFixtureRepo();
    const runtime = createSnapshotHostRuntime();

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
    expect(opened.result.profileId.length).toBeGreaterThan(0);

    const sessionId = opened.result.sessionId;
    const initialStatus = runtime.execute({
      command: 'session.status',
      args: { sessionId },
    });
    expect(initialStatus.result.sessions).toHaveLength(1);
    expect(initialStatus.result.sessions[0]?.dirtyKinds).toEqual(['deps', 'typerefs', 'exports']);
    expect(initialStatus.result.sessions[0]?.profileId.length).toBeGreaterThan(0);

    const depsSummary = runtime.execute({
      command: 'query.deps.summary',
      args: { sessionId },
    });
    expect(depsSummary.status).toBe('ok');
    expect(depsSummary.meta.refreshedKinds).toEqual(['deps']);
    expect(depsSummary.result.summary.files_analyzed).toBe(2);

    const depsSnapshotQuery = runtime.execute({
      command: 'query.deps.snapshot',
      args: { sessionId },
    });
    expect(depsSnapshotQuery.status).toBe('ok');
    expect(depsSnapshotQuery.result.snapshot.profile.target).toBe('fixture');
    expect(depsSnapshotQuery.result.snapshot.profile.profileId.length).toBeGreaterThan(0);

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

    const materializedDepsSnapshot = JSON.parse(
      readFileSync(join(materializeDir, 'fixture-deps.json'), 'utf-8'),
    ) as {
      readonly profile: {
        readonly target: string;
      };
      readonly summary: {
        readonly files_analyzed: number;
      };
    };
    expect(materializedDepsSnapshot.profile.target).toBe('fixture');
    expect(materializedDepsSnapshot.summary.files_analyzed).toBe(2);

    const finalStatus = runtime.execute({
      command: 'session.status',
      args: { sessionId },
    });
    expect(finalStatus.result.sessions[0]?.dirtyKinds).toEqual(['exports']);
  });

  it('runs a package audit query that combines blind spots and under-integrated file hints', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSnapshotHostRuntime();

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

  it('keeps file-focus resolution aligned between navigation and route witnesses for uncovered files', () => {
    const repoPath = createSparseFileFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        target: 'fixture-sparse',
      },
    });

    const sessionId = opened.result.sessionId;
    const navigate = runtime.execute({
      command: 'query.navigate',
      args: {
        sessionId,
        focusKind: 'file',
        focusValue: 'notes/isolated.ts',
      },
    });

    expect(navigate.status).toBe('ok');
    expect(navigate.result.answer.outcome.tag).toBe('open-boundary');
    expect(navigate.result.answer.outcome.value?.primaryRef.value).toBe('notes/isolated.ts');
    expect(navigate.result.answer.outcome.value?.summaryLines.some((line) =>
      line.includes('does not declare any tracked project types'),
    )).toBe(true);
    expect(navigate.result.answer.outcome.issues.some((issue) =>
      issue.code === 'path-evaluator-unclaimed'
      && issue.message.includes('notes/isolated.ts'),
    )).toBe(true);

    const witness = runtime.execute({
      command: 'query.route.witness',
      args: {
        sessionId,
        focusKind: 'file',
        focusValue: 'notes/isolated.ts',
      },
    });

    expect(witness.status).toBe('ok');
    expect(witness.result.answer.outcome.tag).toBe('open-boundary');
    expect(witness.result.answer.outcome.value?.summaryLines.some((line) =>
      line.includes('notes/isolated.ts currently has no modeled route witness'),
    )).toBe(true);
  });

  it('detects fragmented answer coordination from repeated envelope builders and carriers', () => {
    const repoPath = createCoordinationFixtureRepo();
    const runtime = createSnapshotHostRuntime();

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

  it('spends excluded-frontier regime context in navigation, audit, and route answers', () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
      },
    });

    const sessionId = opened.result.sessionId;
    const navigateExcluded = runtime.execute({
      command: 'query.navigate',
      args: {
        sessionId,
        focusKind: 'package',
        focusValue: '@fixture/excluded.',
      },
    });

    expect(navigateExcluded.result.answer.outcome.tag).toBe('open-boundary');
    expect(navigateExcluded.result.answer.outcome.summary).toContain('excluded frontier packages/excluded');
    expect(navigateExcluded.result.answer.outcome.issues.some((issue) =>
      issue.code.includes('focus-excluded-packages-excluded'),
    )).toBe(true);

    const auditIncluded = runtime.execute({
      command: 'query.audit.package',
      args: {
        sessionId,
        packageName: '@fixture/app',
      },
    });

    expect(auditIncluded.result.answer.outcome.tag).toBe('open-boundary');
    expect(auditIncluded.result.answer.outcome.issues.some((issue) =>
      issue.code === 'focus-excluded-boundary-seams'
      && issue.message.includes('touches 1 observed seam'),
    )).toBe(true);

    const witnessIncluded = runtime.execute({
      command: 'query.route.witness',
      args: {
        sessionId,
        focusKind: 'file',
        focusValue: 'packages/app/src/index.ts',
      },
    });

    expect(witnessIncluded.result.answer.outcome.tag).toBe('open-boundary');
    expect(witnessIncluded.result.answer.outcome.issues.some((issue) =>
      issue.code === 'focus-excluded-boundary-seams',
    )).toBe(true);
  });

  it('describes, plans, and repairs capability ingress through the hosted runtime', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSnapshotHostRuntime();

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
    const runtime = createSnapshotHostRuntime();

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
    expect(askedAudit.result.execution?.ephemeralSession).toBe(false);
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
      'query.navigate',
    ]);
    expect(askedOrientation.result.answer.outcome.value?.execution?.command).toBe('query.navigate');
    expect(askedOrientation.result.rendered?.style).toBe('plain-text');
  });

  it('opens and keeps a live ambient session for ask.question flows', () => {
    const runtime = createSnapshotHostRuntime();
    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath: process.cwd(),
      },
    });
    runtime.execute({
      command: 'materializeSnapshots',
      args: {
        sessionId: opened.result.sessionId,
      },
    });

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
    expect(asked.result.answer.query.worldFrame?.freshness).toBe('live');
    expect(asked.result.execution?.ephemeralSession).toBe(false);
    expect(asked.result.execution?.usedSessionId).toBe(opened.result.sessionId);
    expect(asked.result.execution?.steps.some((step) => step.command === 'query.audit.package')).toBe(true);
  });

  it('reuses an ambient live session in session-first mode for repeated ask.question flows', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const firstAsk = runtime.execute({
      command: 'ask.question',
      args: {
        question: 'Audit @fixture/source-analysis-audit for tech debt.',
        repoPath,
        target: 'fixture-live',
      },
    });

    expect(firstAsk.status).toBe('ok');
    expect(firstAsk.result.answer.query.worldFrame?.freshness).toBe('live');
    expect(firstAsk.result.execution?.ephemeralSession).toBe(false);
    expect(firstAsk.result.execution?.usedSessionId).toBeTruthy();
    expect(firstAsk.result.execution?.steps.map((step) => step.command)).toEqual([
      'session.open',
      'query.audit.package',
    ]);

    const firstSessionId = firstAsk.result.execution?.usedSessionId;

    const secondAsk = runtime.execute({
      command: 'ask.question',
      args: {
        question: 'Why is src/live.ts alive?',
        repoPath,
        target: 'fixture-live',
      },
    });

    expect(secondAsk.status).toBe('ok');
    expect(secondAsk.result.answer.query.worldFrame?.freshness).toBe('live');
    expect(secondAsk.result.execution?.ephemeralSession).toBe(false);
    expect(secondAsk.result.execution?.usedSessionId).toBe(firstSessionId);
    expect(secondAsk.result.execution?.steps.some((step) =>
      step.command === 'session.open' && step.status === 'executed',
    )).toBe(false);

    const status = runtime.execute({
      command: 'session.status',
      args: {},
    });
    expect(status.result.sessions).toHaveLength(1);
    expect(status.result.sessions[0]?.sessionId).toBe(firstSessionId);
  });

  it('uses repo-local live sessions for non-cwd repos', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        target: 'fixture-current',
      },
    });

    const sessionId = opened.result.sessionId;
    const materialized = runtime.execute({
      command: 'materializeSnapshots',
      args: {
        sessionId,
      },
    });

    expect(materialized.result.outDir).toBe(join(repoPath, '.source-analysis', 'snapshots'));
    expect(existsSync(join(repoPath, '.source-analysis', 'snapshots', 'fixture-current-deps.json'))).toBe(true);

    const asked = runtime.execute({
      command: 'ask.question',
      args: {
        question: 'Audit @fixture/source-analysis-audit for tech debt.',
        repoPath,
        target: 'fixture-current',
      },
    });

    expect(asked.status).toBe('ok');
    expect(asked.result.execution?.ephemeralSession).toBe(false);
    expect(asked.result.answer.query.worldFrame?.freshness).toBe('live');
    expect(asked.result.execution?.usedSessionId).toBe(sessionId);
    expect(asked.result.execution?.steps.some((step) => step.command === 'query.audit.package')).toBe(true);
  });

  it('uses explicit profile-path targeting for live inquiry execution', () => {
    const repoPath = createExplicitProfileAuditFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        profilePath: 'profiles/framework-core.json',
      },
    });

    const sessionId = opened.result.sessionId;
    runtime.execute({
      command: 'materializeSnapshots',
      args: {
        sessionId,
      },
    });

    const asked = runtime.execute({
      command: 'ask.question',
      args: {
        question: 'Audit @fixture/source-analysis-explicit for tech debt.',
        repoPath,
        profilePath: 'profiles/framework-core.json',
      },
    });

    expect(asked.status).toBe('ok');
    expect(asked.result.answer.query.worldFrame?.profilePath).toBe('profiles/framework-core.json');
    expect(asked.result.answer.query.worldFrame?.freshness).toBe('live');
    expect(asked.result.execution?.ephemeralSession).toBe(false);
    expect(asked.result.execution?.usedSessionId).toBe(sessionId);
    expect(asked.result.execution?.steps.some((step) => step.command === 'query.audit.package')).toBe(true);
  });

  it('derives session targeting and package discovery from a repo profile', () => {
    const repoPath = createProfileFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const described = runtime.execute({
      command: 'describe.profile',
      args: {
        repoPath,
      },
    });
    expect(described.status).toBe('ok');
    expect(described.result.profile.profileId).toBe('fixture-profile');
    expect(described.result.profile.snapshotTarget).toBe('fixture-profile-target');
    expect(described.result.snapshotSupport.target).toBe('fixture-profile-target');
    expect(described.result.posture.operationalAnalyzabilityTier.id).toBe('source-analyzable');
    expect(described.result.posture.minimumDeterministicInterpretationCeiling.id).toBe('bounded-source-analyzable-closure');
    expect(described.result.posture.boundaryState.id).toBe('named-open-fronts');
    expect(described.result.posture.frontierEvidenceSource).toBe('live-scan');
    expect(described.result.snapshotSupport.missingKinds).toEqual(['deps', 'typerefs', 'exports']);

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
      },
    });

    expect(opened.status).toBe('ok');
    expect(opened.result.target).toBe('fixture-profile-target');
    expect(opened.result.profileId).toBe('fixture-profile');

    const status = runtime.execute({
      command: 'session.status',
      args: { sessionId: opened.result.sessionId },
    });
    expect(status.result.sessions[0]?.profileId).toBe('fixture-profile');

    const exportsSummary = runtime.execute({
      command: 'query.exports.summary',
      args: { sessionId: opened.result.sessionId },
    });
    expect(exportsSummary.status).toBe('ok');
    expect(exportsSummary.result.summary.packages_analyzed).toBe(2);
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

function createSparseFileFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-host-sparse-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  mkdirSync(join(repoPath, 'notes'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/source-analysis-sparse',
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
    join(repoPath, 'src', 'live.ts'),
    'export interface LiveShape { value: string; }\n',
  );
  writeFileSync(
    join(repoPath, 'src', 'index.ts'),
    "export type { LiveShape } from './live.js';\n",
  );
  writeFileSync(
    join(repoPath, 'notes', 'isolated.ts'),
    'export {};\n',
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

function createProfileFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-host-profile-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, '.source-analysis'), { recursive: true });
  mkdirSync(join(repoPath, 'modules', 'alpha', 'src'), { recursive: true });
  mkdirSync(join(repoPath, 'modules', 'beta', 'src'), { recursive: true });
  writeFileSync(
    join(repoPath, '.source-analysis', 'profile.json'),
    JSON.stringify(
      {
        id: 'fixture-profile',
        target: 'fixture-profile-target',
        packageDiscoveryRoots: ['modules'],
        includeRepoRootPackage: false,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'modules', 'alpha', 'package.json'),
    JSON.stringify({ name: '@fixture/alpha', type: 'module' }, null, 2),
  );
  writeFileSync(
    join(repoPath, 'modules', 'beta', 'package.json'),
    JSON.stringify({ name: '@fixture/beta', type: 'module' }, null, 2),
  );
  writeFileSync(
    join(repoPath, 'modules', 'alpha', 'tsconfig.json'),
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
    join(repoPath, 'modules', 'beta', 'tsconfig.json'),
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
  writeFileSync(join(repoPath, 'modules', 'alpha', 'src', 'index.ts'), 'export const alpha = true;\n');
  writeFileSync(join(repoPath, 'modules', 'beta', 'src', 'index.ts'), 'export const beta = true;\n');

  return repoPath;
}

function createExcludedFrontierFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-host-frontier-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, '.source-analysis'), { recursive: true });
  mkdirSync(join(repoPath, 'packages', 'app', 'src'), { recursive: true });
  mkdirSync(join(repoPath, 'packages', 'excluded', 'src'), { recursive: true });
  writeFileSync(
    join(repoPath, '.source-analysis', 'profile.json'),
    JSON.stringify(
      {
        id: 'fixture-frontier-profile',
        target: 'fixture-frontier-target',
        packageDiscoveryRoots: ['packages'],
        includeRepoRootPackage: false,
        excludedRepoRelativePrefixes: ['packages/excluded'],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'packages', 'app', 'package.json'),
    JSON.stringify({ name: '@fixture/app', type: 'module' }, null, 2),
  );
  writeFileSync(
    join(repoPath, 'packages', 'excluded', 'package.json'),
    JSON.stringify({ name: '@fixture/excluded', type: 'module' }, null, 2),
  );
  writeFileSync(
    join(repoPath, 'packages', 'app', 'tsconfig.json'),
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
    join(repoPath, 'packages', 'excluded', 'tsconfig.json'),
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
    join(repoPath, 'packages', 'app', 'src', 'index.ts'),
    "export { hiddenValue } from '../../excluded/src/hidden.js';\n",
  );
  writeFileSync(
    join(repoPath, 'packages', 'excluded', 'src', 'hidden.ts'),
    'export const hiddenValue = 1;\n',
  );

  return repoPath;
}

function createExplicitProfileAuditFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-host-explicit-profile-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'profiles'), { recursive: true });
  mkdirSync(join(repoPath, 'packages', 'alpha', 'src'), { recursive: true });
  mkdirSync(join(repoPath, 'packages', 'alpha', 'test'), { recursive: true });
  writeFileSync(
    join(repoPath, 'profiles', 'framework-core.json'),
    JSON.stringify(
      {
        id: 'fixture-explicit-profile',
        target: 'fixture-explicit-target',
        packageDiscoveryRoots: ['packages'],
        includeRepoRootPackage: false,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'packages', 'alpha', 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/source-analysis-explicit',
        type: 'module',
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'packages', 'alpha', 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          target: 'ES2022',
          noEmit: true,
        },
        include: ['src/**/*.ts', 'test/**/*.ts'],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(repoPath, 'packages', 'alpha', 'src', 'live.ts'),
    'export interface LiveShape { value: string; }\n',
  );
  writeFileSync(
    join(repoPath, 'packages', 'alpha', 'src', 'index.ts'),
    [
      "export type { LiveShape } from './live.js';",
      'export const auditReady = true;',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'packages', 'alpha', 'test', 'index.test.ts'),
    [
      "import { auditReady } from '../src/index.js';",
      'void auditReady;',
      '',
    ].join('\n'),
  );

  return repoPath;
}
