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
