import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import {
  expandMappedRepoRelativePathCandidates,
  resolveAnalysisProfile,
} from '../out/analysis-profile.js';
import { createRepoSession } from '../out/repo-session.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('analysis profiles', () => {
  it('derives repo targeting, package discovery, path mappings, and partition schemes from profile config', () => {
    const repoPath = createProfileFixtureRepo();
    const profile = resolveAnalysisProfile({ repoPath });

    expect(profile.snapshotTarget).toBe('fixture-profile-target');
    expect(profile.profileId).toBe('fixture-profile');
    expect(profile.packageDiscoveryRoots.map((root) => root.root)).toEqual(['modules']);
    expect(profile.partitionSchemes.map((scheme) => scheme.id)).toContain('lib-area');
    expect(expandMappedRepoRelativePathCandidates(profile, 'modules/alpha/out/index.js')).toContain(
      'modules/alpha/src/index.js',
    );

    const session = createRepoSession({ repoPath });
    expect(session.target).toBe('fixture-profile-target');
    expect(session.profile.profileId).toBe('fixture-profile');
    expect(session.listPackageDirs().map((dir) => session.toRepoRelative(dir))).toEqual([
      'modules/alpha',
      'modules/beta',
    ]);
  });
});

function createProfileFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-profile-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, '.source-analysis'), { recursive: true });
  mkdirSync(join(repoPath, 'modules', 'alpha', 'src', 'runtime'), { recursive: true });
  mkdirSync(join(repoPath, 'modules', 'beta', 'src', 'model'), { recursive: true });
  writeFileSync(
    join(repoPath, '.source-analysis', 'profile.json'),
    JSON.stringify(
      {
        id: 'fixture-profile',
        target: 'fixture-profile-target',
        packageDiscoveryRoots: ['modules'],
        includeRepoRootPackage: false,
        pathMappings: [
          { from: 'out', to: 'src' },
        ],
        partitionSchemes: [
          {
            id: 'lib-area',
            summary: 'Top-level source areas inside modules.',
            rules: [
              {
                pattern: 'modules/{package}/src/{area}/**',
                partitionTemplate: 'modules/{package}/src/{area}',
                labelTemplate: '{package}:{area}',
              },
            ],
          },
        ],
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
    join(repoPath, 'modules', 'alpha', 'src', 'runtime', 'index.ts'),
    'export const alpha = true;\n',
  );
  writeFileSync(
    join(repoPath, 'modules', 'beta', 'src', 'model', 'types.ts'),
    'export interface BetaType { value: string; }\n',
  );

  return repoPath;
}
