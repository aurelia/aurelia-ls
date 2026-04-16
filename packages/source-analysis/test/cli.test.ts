import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('source-analysis hosted CLI', () => {
  it('describes the resolved profile and snapshot support as JSON', () => {
    const repoPath = createProfileFixtureRepo();
    const raw = runCli(['describe', 'profile', '--repo', repoPath, '--json']);
    const parsed = JSON.parse(raw) as {
      readonly command: string;
      readonly result: {
        readonly profile: {
          readonly profileId: string;
          readonly snapshotTarget: string;
        };
        readonly snapshotSupport: {
          readonly missingKinds: readonly string[];
        };
      };
    };

    expect(parsed.command).toBe('describe.profile');
    expect(parsed.result.profile.profileId).toBe('fixture-profile');
    expect(parsed.result.profile.snapshotTarget).toBe('fixture-profile-target');
    expect(parsed.result.snapshotSupport.missingKinds).toEqual(['deps', 'typerefs', 'exports']);
  });

  it('answers questions end-to-end through the top-level ask command', () => {
    const repoPath = createAuditFixtureRepo();
    const raw = runCli([
      'ask',
      'Audit @fixture/source-analysis-audit for tech debt.',
      '--repo',
      repoPath,
      '--target',
      'fixture-cli',
      '--json',
    ]);
    const parsed = JSON.parse(raw) as {
      readonly command: string;
      readonly result: {
        readonly answer: {
          readonly outcome: {
            readonly value?: {
              readonly status?: string;
              readonly inquiry?: {
                readonly id?: string;
              };
            };
          };
        };
        readonly execution?: {
          readonly steps: ReadonlyArray<{
            readonly command: string;
            readonly status: string;
          }>;
        };
      };
    };

    expect(parsed.command).toBe('ask.question');
    expect(parsed.result.answer.outcome.value?.status).toBe('answered');
    expect(parsed.result.answer.outcome.value?.inquiry?.id).toBe('package-audit');
    expect(parsed.result.execution?.steps.map((step) => step.command)).toEqual([
      'session.open',
      'query.audit.package',
    ]);
    expect(parsed.result.execution?.steps.every((step) => step.status === 'executed')).toBe(true);
  });
});

function runCli(
  args: readonly string[],
): string {
  return execFileSync(
    process.execPath,
    [
      join(process.cwd(), 'packages', 'source-analysis', 'out', 'cli.js'),
      ...args,
    ],
    {
      encoding: 'utf-8',
      cwd: process.cwd(),
    },
  );
}

function createProfileFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-cli-profile-'));
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

function createAuditFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-cli-audit-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'src'), { recursive: true });
  mkdirSync(join(repoPath, 'test'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/source-analysis-audit',
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
  writeFileSync(join(repoPath, 'src', 'live.ts'), 'export interface LiveShape { value: string; }\n');
  writeFileSync(join(repoPath, 'src', 'dormant.ts'), 'export interface DormantShape { parked: boolean; }\n');
  writeFileSync(
    join(repoPath, 'src', 'index.ts'),
    [
      "export type { LiveShape } from './live.js';",
      'export const auditReady = true;',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(repoPath, 'src', 'tool.ts'),
    [
      "import { auditReady } from './index.js';",
      'void auditReady;',
      '',
    ].join('\n'),
  );
  writeFileSync(join(repoPath, 'src', 'test-only.ts'), 'export interface TestOnlyShape { helper: boolean; }\n');
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
