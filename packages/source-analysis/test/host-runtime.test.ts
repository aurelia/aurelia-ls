import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from './test-harness.js';

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

    const navigateSymbol = runtime.execute({
      command: 'query.navigate',
      args: {
        sessionId,
        focusKind: 'symbol',
        focusValue: 'createExample',
      },
    });
    expect(navigateSymbol.status).toBe('ok');
    expect(navigateSymbol.result.answer.outcome.tag).toBe('hit');
    expect(navigateSymbol.result.answer.outcome.value?.summaryLines.some((line) =>
      line.includes('src/index.ts:'),
    )).toBe(true);
    expect(navigateSymbol.result.answer.outcome.value?.relatedRefs.some((ref) =>
      ref.kind === 'file' && ref.value === 'src/index.ts',
    )).toBe(true);

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
    expect(audit.result.answer.outcome.value?.findings.some((finding) =>
      finding.code === 'exercise-only-files',
    )).toBe(false);
    const auditSignals = runtime.execute({
      command: 'query.package.audit-signals',
      args: {
        sessionId,
        locator: '@fixture/source-analysis-audit',
      },
    });
    expect(auditSignals.status).toBe('ok');
    const sharedSignalCodes = new Set((auditSignals.result.signals ?? []).map((signal) => signal.code));
    expect([...sharedSignalCodes].every((code) =>
      audit.result.answer.outcome.value?.findings.some((finding) => finding.code === code),
    )).toBe(true);

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
    const fileRoute = runtime.execute({
      command: 'query.file.route',
      args: {
        sessionId,
        filePath: 'src/live.ts',
      },
    });
    expect(fileRoute.status).toBe('ok');
    expect(routeWitness.result.answer.outcome.value?.witnesses).toEqual(fileRoute.result.witnesses);

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

  it('keeps structural file focus honest for uncovered files and admitted edge-free files', () => {
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
      line.includes('repo source scan')
      || line.includes('source-backed file'),
    )).toBe(true);
    expect(navigate.result.answer.outcome.issues.some((issue) =>
      issue.code === 'path-evaluator-blocked'
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
      line.includes('repo source scan')
      || line.includes('source-backed file'),
    )).toBe(true);

    const admitted = runtime.execute({
      command: 'query.navigate',
      args: {
        sessionId,
        focusKind: 'file',
        focusValue: 'src/idle.ts',
      },
    });

    expect(admitted.status).toBe('ok');
    expect(admitted.result.answer.outcome.tag).toBe('hit');
    expect(admitted.result.answer.outcome.value?.primaryRef.value).toBe('src/idle.ts');
    expect(admitted.result.answer.outcome.value?.summaryLines.some((line) =>
      line.includes('src/idle.ts has 0 outbound imports and 0 inbound imports'),
    )).toBe(true);
    expect(admitted.result.answer.outcome.value?.relatedRefs.some((ref) =>
      ref.kind === 'package' && ref.value === '@fixture/source-analysis-sparse',
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

  it('resolves package, type, export, symbol, file, package-surface, reachability, and export-trace through direct primitive host commands', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        target: 'fixture-primitives',
      },
    });

    const sessionId = opened.result.sessionId;

    const pkg = runtime.execute({
      command: 'query.package.resolve',
      args: {
        sessionId,
        locator: '@fixture/source-analysis-audit',
      },
    });
    expect(pkg.status).toBe('ok');
    expect(pkg.result.outcome.kind).toBe('claim');
    if (pkg.result.outcome.kind !== 'claim') {
      throw new Error('Expected package resolution to produce a claim.');
    }
    expect(pkg.result.outcome.value?.package_name).toBe('@fixture/source-analysis-audit');

    const typeDecl = runtime.execute({
      command: 'query.type.resolve',
      args: {
        sessionId,
        locator: 'LiveShape',
      },
    });
    expect(typeDecl.status).toBe('ok');
    expect(typeDecl.result.outcome.kind).toBe('claim');
    if (typeDecl.result.outcome.kind !== 'claim') {
      throw new Error('Expected type resolution to produce a claim.');
    }
    expect(typeDecl.result.outcome.value?.name).toBe('LiveShape');

    const exported = runtime.execute({
      command: 'query.export.resolve',
      args: {
        sessionId,
        locator: 'auditReady',
      },
    });
    expect(exported.status).toBe('ok');
    expect(exported.result.outcome.kind).toBe('claim');
    if (exported.result.outcome.kind !== 'claim') {
      throw new Error('Expected export resolution to produce a claim.');
    }
    expect(exported.result.outcome.value?.exported_name).toBe('auditReady');

    const packageSurface = runtime.execute<'query.package.surface'>({
      command: 'query.package.surface',
      args: {
        sessionId,
        locator: '@fixture/source-analysis-audit',
      },
    });
    expect(packageSurface.status).toBe('ok');
    expect(packageSurface.result.packageOutcome.kind).toBe('claim');
    expect(packageSurface.result.surface?.files).toContain('src/index.ts');
    expect(packageSurface.result.surface?.uncoveredFiles).toContain('test/index.test.ts');
    expect(packageSurface.result.surface?.fileEntries.find((entry) => entry.filePath === 'src/live.ts')?.declarations[0]?.name).toBe('LiveShape');

    const packageReachability = runtime.execute<'query.package.reachability'>({
      command: 'query.package.reachability',
      args: {
        sessionId,
        locator: '@fixture/source-analysis-audit',
      },
    });
    expect(packageReachability.status).toBe('ok');
    expect(packageReachability.result.packageOutcome.kind).toBe('claim');
    expect(packageReachability.result.reachability?.roots.some((root) => root.kind === 'manifest-bin' && root.filePath === 'src/cli.ts')).toBe(true);
    expect(packageReachability.result.reachability?.candidateEntryFiles).toContain('src/tool.ts');
    expect(packageReachability.result.reachability?.files.find((file) => file.filePath === 'src/live.ts')?.routeWitnesses[0]?.rootKind).toBe('public-api');

    const exportTrace = runtime.execute<'query.export.trace'>({
      command: 'query.export.trace',
      args: {
        sessionId,
        packageLocator: '@fixture/source-analysis-audit',
        exportedName: 'auditReady',
      },
    });
    expect(exportTrace.status).toBe('ok');
    expect(exportTrace.result.packageOutcome.kind).toBe('claim');
    expect(exportTrace.result.exportOutcome?.kind).toBe('claim');
    expect(exportTrace.result.route?.declarationFile).toBe('src/index.ts');
    expect(exportTrace.result.route?.declarationName).toBe('auditReady');

    const auditSignals = runtime.execute<'query.package.audit-signals'>({
      command: 'query.package.audit-signals',
      args: {
        sessionId,
        locator: '@fixture/source-analysis-audit',
      },
    });
    expect(auditSignals.status).toBe('ok');
    expect(auditSignals.result.packageOutcome.kind).toBe('claim');
    expect(auditSignals.result.signals?.some((signal) => signal.code === 'package-uncovered-files')).toBe(true);
    expect(auditSignals.result.signals?.some((signal) => signal.code === 'candidate-entry-roots')).toBe(true);
    expect(auditSignals.result.signals?.some((signal) => signal.code === 'answer-coordination-fragmentation')).toBe(false);

    const fileRoute = runtime.execute<'query.file.route'>({
      command: 'query.file.route',
      args: {
        sessionId,
        filePath: 'src/live.ts',
      },
    });
    expect(fileRoute.status).toBe('ok');
    expect(fileRoute.result.inspection.matchedFilePath).toBe('src/live.ts');
    expect(fileRoute.result.package?.package_name).toBe('@fixture/source-analysis-audit');
    expect(fileRoute.result.witnesses?.[0]?.rootKind).toBe('public-api');
    expect(fileRoute.result.witnesses?.[0]?.files).toEqual(['src/index.ts', 'src/live.ts']);

    const typeRoute = runtime.execute<'query.type.route'>({
      command: 'query.type.route',
      args: {
        sessionId,
        locator: 'LiveShape',
      },
    });
    expect(typeRoute.status).toBe('ok');
    expect(typeRoute.result.typeOutcome.kind).toBe('claim');
    if (typeRoute.result.typeOutcome.kind !== 'claim') {
      throw new Error('Expected type route query to resolve a declaration.');
    }
    expect(typeRoute.result.typeOutcome.value?.file).toBe('src/live.ts');
    expect(typeRoute.result.package?.package_name).toBe('@fixture/source-analysis-audit');
    expect(typeRoute.result.regimeContext?.focusLabel).toBe('LiveShape');
    expect(typeRoute.result.witnesses?.[0]?.rootKind).toBe('public-api');

    const symbol = runtime.execute({
      command: 'query.symbol.lookup',
      args: {
        sessionId,
        locator: 'auditReady',
      },
    });
    expect(symbol.status).toBe('ok');
    expect(symbol.result.lookup.tag).toBe('hit');
    expect(symbol.result.lookup.matches[0]?.declaration.attributes.name).toBe('auditReady');

    const file = runtime.execute({
      command: 'query.file.inspect',
      args: {
        sessionId,
        filePath: 'src/live.ts',
      },
    });
    expect(file.status).toBe('ok');
    expect(file.result.inspection.matchedFilePath).toBe('src/live.ts');
    expect(file.result.inspection.matches).toContain('src/live.ts');
  });

  it('keeps answer-bearing query surfaces available alongside the direct primitives', () => {
    const repoPath = createAuditFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
        target: 'fixture-host-read-mode',
      },
    });

    const sessionId = opened.result.sessionId;
    const audit = runtime.execute({
      command: 'query.audit.package',
      args: {
        sessionId,
        packageName: '@fixture/source-analysis-audit',
        readMode: 'snapshot',
      },
    });

    expect(audit.status).toBe('ok');
    expect(audit.result.answer.query.readMode).toBe('summary-card');
    expect(audit.result.answer.slots.read_mode).toBe('summary-card');

    const navigate = runtime.execute({
      command: 'query.navigate',
      args: {
        sessionId,
        focusKind: 'package',
        focusValue: '@fixture/source-analysis-audit',
        readMode: 'snapshot',
        renderStyle: 'plain-text',
      },
    });

    expect(navigate.status).toBe('ok');
    expect(navigate.result.answer.query.readMode).toBe('focus-card');
    expect(navigate.result.answer.slots.read_mode).toBe('focus-card');
    expect(navigate.result.rendered?.style).toBe('plain-text');
  });

  it('uses repo-local sessions for primitive resolution and materialization', () => {
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

    const resolved = runtime.execute({
      command: 'query.package.resolve',
      args: {
        sessionId,
        locator: '@fixture/source-analysis-audit',
      },
    });

    expect(resolved.status).toBe('ok');
    expect(resolved.result.outcome.kind).toBe('claim');
    expect(resolved.meta.sessionId).toBe(sessionId);
  });

  it('uses explicit profile-path targeting for primitive hosted queries', () => {
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
    const resolved = runtime.execute({
      command: 'query.package.resolve',
      args: {
        sessionId,
        locator: '@fixture/source-analysis-explicit',
      },
    });

    expect(resolved.status).toBe('ok');
    expect(resolved.result.outcome.kind).toBe('claim');
    expect(resolved.meta.sessionId).toBe(sessionId);

    const status = runtime.execute({
      command: 'session.status',
      args: { sessionId },
    });
    expect(status.result.sessions[0]?.profilePath?.replace(/\\/g, '/').endsWith('profiles/framework-core.json')).toBe(true);
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

    const navigate = runtime.execute({
      command: 'query.navigate',
      args: {
        sessionId: opened.result.sessionId,
        focusKind: 'file',
        focusValue: 'modules/alpha/src/index.ts',
      },
    });
    expect(navigate.status).toBe('ok');
    expect(navigate.result.answer.outcome.tag).toBe('hit');
    expect(navigate.result.answer.outcome.value?.relatedRefs.some((ref) =>
      ref.kind === 'package' && ref.value === '@fixture/alpha',
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
      "export function createExample(): import('./types.js').Example { return { value: 'ok' }; }",
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
    join(repoPath, 'src', 'idle.ts'),
    'export {};\n',
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
