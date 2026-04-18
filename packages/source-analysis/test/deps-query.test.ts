import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from './test-harness.js';

const execFileAsync = promisify(execFile);
const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('deps query CLI', () => {
  it('loads current deps analysis live by default without requiring snapshots', async () => {
    const repoPath = createFixtureRepo();

    const summary = await runCliAsync(['deps', 'summary', '--repo', repoPath]);

    expect(summary).toContain('Query mode:       live workspace');
    expect(summary).toContain(`Source:           ${repoPath}`);
    expect(summary).toContain('Files analyzed:   2');
    expect(summary).toContain('Internal edges:   1');
  });

  it('treats stale as a live-mode explanation when no materialized snapshot is requested', async () => {
    const repoPath = createFixtureRepo();

    const stale = await runCliAsync(['deps', 'stale', '--repo', repoPath]);

    expect(stale).toContain('LIVE: deps query is analyzing the current workspace directly.');
    expect(stale).toContain('snapshot staleness does not apply unless you pass --file.');
  });
});

async function runCliAsync(args: readonly string[]): Promise<string> {
  const result = await execFileAsync(
    process.execPath,
    [
      join(process.cwd(), 'out', 'cli.js'),
      ...args,
    ],
    {
      encoding: 'utf-8',
      cwd: process.cwd(),
      env: process.env,
    },
  );
  return result.stdout;
}

function createFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-deps-query-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/deps-query-live',
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
      "import type { Example } from './types.js';",
      'export type LocalExample = Example;',
      '',
    ].join('\n'),
  );

  return repoPath;
}
