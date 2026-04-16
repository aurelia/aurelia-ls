import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createSourceAnalysisSession } from '../out/session.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('SourceAnalysisSession program caching', () => {
  it('does not cache TypeScript programs unless asked to', () => {
    const repoPath = createFixtureRepo();
    const session = createSourceAnalysisSession({ repoPath, target: 'fixture' });
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
});

function createFixtureRepo(): string {
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

  return repoPath;
}
