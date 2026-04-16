import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

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

describe('RepoSession program caching', () => {
  it('does not cache TypeScript programs unless asked to', () => {
    const repoPath = createFixtureRepo();
    const session = createRepoSession({ repoPath, target: 'fixture' });
    const [tsconfigPath] = session.findTsconfigs();
    expect(tsconfigPath).toBeTruthy();

    const first = session.getProgram(tsconfigPath!, 'analysis');
    const second = session.getProgram(tsconfigPath!, 'analysis');
    const cachedFirst = session.getProgram(tsconfigPath!, 'analysis', { cache: true });
    const cachedSecond = session.getProgram(tsconfigPath!, 'analysis', { cache: true });

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(cachedFirst).toBeTruthy();
    expect(cachedSecond).toBeTruthy();
    expect(first).not.toBe(second);
    expect(cachedFirst).toBe(cachedSecond);

    session.clearProgramCache('analysis');

    const cachedAfterClear = session.getProgram(tsconfigPath!, 'analysis', { cache: true });
    expect(cachedAfterClear).toBeTruthy();
    expect(cachedAfterClear).not.toBe(cachedFirst);
  });

  it('evicts least-recently-used cached programs when the cache budget is reached', () => {
    const repoPath = createFixtureRepo({ includeSecondTsconfig: true });
    const session = createRepoSession({
      repoPath,
      target: 'fixture',
      maxCachedPrograms: 1,
    });
    const tsconfigPaths = session.findTsconfigs().slice().sort();

    expect(tsconfigPaths).toHaveLength(2);

    const first = session.getProgram(tsconfigPaths[0]!, 'analysis', { cache: true });
    const second = session.getProgram(tsconfigPaths[1]!, 'analysis', { cache: true });
    const firstReloaded = session.getProgram(tsconfigPaths[0]!, 'analysis', { cache: true });

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(firstReloaded).toBeTruthy();
    expect(firstReloaded).not.toBe(first);
  });
});

function createFixtureRepo(
  options: { includeSecondTsconfig?: boolean } = {},
): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-session-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
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
    join(repoPath, 'src', 'index.ts'),
    'export interface Example { value: string; }\n',
  );

  if (options.includeSecondTsconfig) {
    mkdirSync(join(repoPath, 'extra', 'src'), { recursive: true });
    writeFileSync(
      join(repoPath, 'extra', 'tsconfig.json'),
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
      join(repoPath, 'extra', 'src', 'index.ts'),
      'export interface ExtraExample { value: number; }\n',
    );
  }

  return repoPath;
}
