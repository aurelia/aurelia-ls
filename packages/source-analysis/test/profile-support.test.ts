import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from './test-harness.js';

import { resolveAnalysisProfile } from '../out/analysis-profile.js';
import {
  inspectProfileSnapshotSupport,
  isUsableSnapshotArtifact,
} from '../out/profile-support.js';
import { createSnapshotPaths } from '../out/snapshot-config.js';
import { tryLoadCurrentSnapshots } from '../out/current-snapshots.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('profile snapshot support', () => {
  it('derives the current-snapshot target from the resolved profile when repoPath changes', () => {
    const repoPath = createProfileFixtureRepo();
    const snapshots = tryLoadCurrentSnapshots(undefined, 0, repoPath);

    expect(snapshots.warnings).toHaveLength(3);
    expect(snapshots.warnings.every((warning) => warning.includes('fixture-profile-target'))).toBe(true);
  });

  it('describes missing snapshots as explicit support gaps', () => {
    const repoPath = createProfileFixtureRepo();
    const profile = resolveAnalysisProfile({ repoPath });
    const support = inspectProfileSnapshotSupport(createSnapshotPaths(import.meta.url, {}), profile);

    expect(support.snapshotRootPath).toBe(join(repoPath, '.source-analysis', 'snapshots'));
    expect(support.usableKinds).toEqual([]);
    expect(support.missingKinds).toEqual(['deps', 'typerefs', 'exports']);
    expect(support.snapshots.every((snapshot) => snapshot.status === 'missing')).toBe(true);
    expect(support.snapshots[0]?.issues.some((issue) => issue.startsWith('Run: pnpm source-analysis refresh'))).toBe(true);
  });

  it('treats regime-mismatched snapshots as unusable instead of silently loading them', () => {
    const repoPath = createProfileFixtureRepo();
    mkdirSync(join(repoPath, '.source-analysis', 'snapshots'), { recursive: true });
    writeFileSync(
      join(repoPath, '.source-analysis', 'snapshots', 'fixture-profile-target-deps.json'),
      JSON.stringify(
        {
          generated_at: '2026-04-16T00:00:00.000Z',
          source_commit: 'abc',
          analyzer_commit: 'def',
          profile: {
            target: 'fixture-profile-target',
            profileId: 'wrong-profile',
            profilePath: join(repoPath, '.source-analysis', 'profile.json'),
            excludedRepoRelativePrefixes: [],
          },
          summary: { files_analyzed: 0, internal_edges: 0, external_imports: 0, unresolved: 0, uncovered_files: 0 },
          tsconfigs: [],
          edges: [],
          external_imports: [],
          unresolved_imports: [],
          uncovered_files: [],
          directory_crossings: [],
          directory_profiles: [],
          orphans: { no_inbound: [], no_outbound: [] },
          cycles: [],
          coupling_matrices: [],
        },
        null,
        2,
      ),
    );

    const profile = resolveAnalysisProfile({ repoPath });
    const support = inspectProfileSnapshotSupport(createSnapshotPaths(import.meta.url, {}), profile);
    expect(support.mismatchedKinds).toEqual(['deps']);
    expect(isUsableSnapshotArtifact(support.snapshots[0]!)).toBe(false);
    expect(support.snapshots[0]?.issues.some((issue) => issue.includes('wrong-profile'))).toBe(true);

    const snapshots = tryLoadCurrentSnapshots('fixture-profile-target', 0, repoPath);
    expect(snapshots.deps).toBeNull();
    expect(snapshots.support?.mismatchedKinds).toEqual(['deps']);
    expect(snapshots.warnings.some((warning) => warning.includes('wrong-profile'))).toBe(true);
  });

  it('treats deeper profile-law drift as a regime mismatch even when id and target still match', () => {
    const repoPath = createProfileFixtureRepo();
    mkdirSync(join(repoPath, '.source-analysis', 'snapshots'), { recursive: true });
    writeFileSync(
      join(repoPath, '.source-analysis', 'snapshots', 'fixture-profile-target-deps.json'),
      JSON.stringify(
        {
          generated_at: '2026-04-16T00:00:00.000Z',
          source_commit: 'abc',
          analyzer_commit: 'def',
          profile: {
            target: 'fixture-profile-target',
            profileId: 'fixture-profile',
            profilePath: join(repoPath, '.source-analysis', 'profile.json'),
            excludedRepoRelativePrefixes: [],
            packageDiscoveryRoots: [{ root: 'wrong-root', mode: 'children-with-package-json' }],
            includeRepoRootPackage: false,
            pathMappings: [],
            exercisePatterns: [],
            partitionSchemes: [],
          },
          summary: { files_analyzed: 0, internal_edges: 0, external_imports: 0, unresolved: 0, uncovered_files: 0 },
          tsconfigs: [],
          edges: [],
          external_imports: [],
          unresolved_imports: [],
          uncovered_files: [],
          directory_crossings: [],
          directory_profiles: [],
          orphans: { no_inbound: [], no_outbound: [] },
          cycles: [],
          coupling_matrices: [],
        },
        null,
        2,
      ),
    );

    const profile = resolveAnalysisProfile({ repoPath });
    const support = inspectProfileSnapshotSupport(createSnapshotPaths(import.meta.url, {}), profile);
    expect(support.mismatchedKinds).toEqual(['deps']);
    expect(support.snapshots[0]?.issues.some((issue) => issue.includes('package discovery roots'))).toBe(true);
  });
});

function createProfileFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-profile-support-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, '.source-analysis'), { recursive: true });
  writeFileSync(
    join(repoPath, '.source-analysis', 'profile.json'),
    JSON.stringify(
      {
        id: 'fixture-profile',
        target: 'fixture-profile-target',
        packageDiscoveryRoots: ['packages'],
        includeRepoRootPackage: false,
      },
      null,
      2,
    ),
  );

  return repoPath;
}
