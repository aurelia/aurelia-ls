import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createSnapshotHostRuntime } from '../out/host/runtime.js';
import {
  inspectAnalyzabilityPosture,
  inspectFocusedAnalyzabilityContext,
  resolveAnalysisProfile,
} from '../out/public/profile.js';
import { createSnapshotPaths } from '../out/snapshot-config.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('analyzability posture', () => {
  it('names excluded frontiers and observed seams instead of silently omitting them', () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const profile = resolveAnalysisProfile({ repoPath });
    const posture = inspectAnalyzabilityPosture(
      createSnapshotPaths(import.meta.url, {}),
      profile,
    );

    expect(posture.frontierEvidenceSource).toBe('live-scan');
    expect(posture.operationalAnalyzabilityTier.id).toBe('source-analyzable');
    expect(posture.minimumDeterministicInterpretationCeiling.id).toBe('bounded-source-analyzable-closure');
    expect(posture.boundaryState.id).toBe('named-open-fronts');
    expect(posture.excludedFrontiers).toHaveLength(1);
    expect(posture.excludedFrontiers[0]?.prefix).toBe('packages/excluded');
    expect(posture.excludedFrontiers[0]?.packageCount).toBe(1);
    expect(posture.excludedFrontiers[0]?.inboundBoundaryCount).toBe(1);
    expect(posture.excludedFrontiers[0]?.boundaryReferences[0]?.source).toBe('packages/app/src/index.ts');
    expect(posture.openFronts.some((front) =>
      front.origin === 'excluded-frontier'
      && front.prefix === 'packages/excluded',
    )).toBe(true);
  });

  it('prefers frontier evidence already carried by aligned snapshots over the live fallback scan', () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const runtime = createSnapshotHostRuntime();
    const opened = runtime.execute({
      command: 'session.open',
      args: {
        repoPath,
      },
    });

    runtime.execute({
      command: 'materializeSnapshots',
      args: {
        sessionId: opened.result.sessionId,
      },
    });

    const profile = resolveAnalysisProfile({ repoPath });
    const posture = inspectAnalyzabilityPosture(
      createSnapshotPaths(import.meta.url, {}),
      profile,
    );

    expect(posture.frontierEvidenceSource).toBe('snapshot-contract');
    expect(posture.snapshotSupport.usableKinds).toEqual(['deps', 'typerefs', 'exports']);
    expect(posture.excludedFrontiers[0]?.boundaryReferences[0]?.target).toBe('packages/excluded/src/hidden.ts');
  });

  it('routes regime questions through analyzability posture and preserves the open-boundary outcome', () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const runtime = createSnapshotHostRuntime();

    const asked = runtime.execute({
      command: 'ask.question',
      args: {
        question: 'What boundaries are open because parts of the repo are excluded from analysis?',
        repoPath,
      },
    });

    expect(asked.status).toBe('ok');
    expect(asked.result.answer.outcome.tag).toBe('open-boundary');
    expect(asked.result.answer.outcome.value?.inquiry?.id).toBe('analyzability-posture');
    expect(asked.result.answer.outcome.value?.execution?.command).toBe('describe.profile');
    expect(asked.result.answer.outcome.trust.kind).toBe('grounded');
    expect(asked.result.answer.outcome.issues.some((issue) =>
      issue.code.includes('excluded-frontier'),
    )).toBe(true);
    expect(asked.result.execution?.steps.map((step) => step.command)).toEqual([
      'describe.profile',
    ]);
  });

  it('classifies focused paths separately from repo-level posture', () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const profile = resolveAnalysisProfile({ repoPath });
    const posture = inspectAnalyzabilityPosture(
      createSnapshotPaths(import.meta.url, {}),
      profile,
    );

    const included = inspectFocusedAnalyzabilityContext(posture, {
      focusLabel: 'packages/app/src/index.ts',
      pathPrefixes: ['packages/app/src/index.ts'],
      queryHints: ['@fixture/app'],
    });
    expect(included.classification.currentWorldPathState).toBe('inside-current-world');
    expect(included.classification.currentWorldPathTier?.id).toBe('source-analyzable');
    expect(included.classification.blockingReasons.some((reason) =>
      reason.code === 'observed-excluded-boundary-seam',
    )).toBe(true);
    expect(included.lines[0]).toContain('currently inhabits the source-analyzable path tier');

    const excluded = inspectFocusedAnalyzabilityContext(posture, {
      focusLabel: '@fixture/excluded',
      queryHints: ['@fixture/excluded'],
    });
    expect(excluded.classification.currentWorldPathState).toBe('outside-current-world');
    expect(excluded.classification.currentWorldPathTier).toBeNull();
    expect(excluded.classification.blockingReasons[0]?.code).toBe('focus-outside-current-world');
    expect(excluded.lines[0]).toContain('no current-world path tier is claimed');
  });
});

function createExcludedFrontierFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-analyzability-posture-'));
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
