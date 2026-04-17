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
        readonly posture: {
          readonly operationalAnalyzabilityTier: {
            readonly id: string;
          };
          readonly minimumDeterministicInterpretationCeiling: {
            readonly id: string;
          };
          readonly boundaryState: {
            readonly id: string;
          };
          readonly frontierEvidenceSource: string;
        };
        readonly snapshotSupport: {
          readonly missingKinds: readonly string[];
        };
      };
    };

    expect(parsed.command).toBe('describe.profile');
    expect(parsed.result.profile.profileId).toBe('fixture-profile');
    expect(parsed.result.profile.snapshotTarget).toBe('fixture-profile-target');
    expect(parsed.result.posture.operationalAnalyzabilityTier.id).toBe('source-analyzable');
    expect(parsed.result.posture.minimumDeterministicInterpretationCeiling.id).toBe('bounded-source-analyzable-closure');
    expect(parsed.result.posture.boundaryState.id).toBe('named-open-fronts');
    expect(parsed.result.posture.frontierEvidenceSource).toBe('live-scan');
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

  it('routes analyzability questions through profile posture instead of workspace orientation', () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const raw = runCli([
      'ask',
      'What boundaries are open because parts of the repo are excluded from analysis?',
      '--repo',
      repoPath,
      '--json',
    ]);
    const parsed = JSON.parse(raw) as {
      readonly command: string;
      readonly result: {
        readonly answer: {
          readonly outcome: {
            readonly tag: string;
            readonly value?: {
              readonly inquiry?: {
                readonly id?: string;
              };
              readonly execution?: {
                readonly command?: string;
              };
            };
          };
        };
      };
    };

    expect(parsed.command).toBe('ask.question');
    expect(parsed.result.answer.outcome.tag).toBe('open-boundary');
    expect(parsed.result.answer.outcome.value?.inquiry?.id).toBe('analyzability-posture');
    expect(parsed.result.answer.outcome.value?.execution?.command).toBe('describe.profile');
  });

  it('treats excluded package focuses as explicit boundaries instead of silent misses', () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const raw = runCli([
      'ask',
      'Orient me to @fixture/excluded.',
      '--repo',
      repoPath,
      '--json',
    ]);
    const parsed = JSON.parse(raw) as {
      readonly result: {
        readonly answer: {
          readonly outcome: {
            readonly tag: string;
            readonly value?: {
              readonly inquiry?: {
                readonly id?: string;
              };
              readonly execution?: {
                readonly command?: string;
              };
            };
            readonly summary: string;
            readonly issues: ReadonlyArray<{
              readonly code: string;
            }>;
          };
        };
      };
    };

    expect(parsed.result.answer.outcome.tag).toBe('open-boundary');
    expect(parsed.result.answer.outcome.value?.inquiry?.id).toBe('workspace-orientation');
    expect(parsed.result.answer.outcome.value?.execution?.command).toBe('query.navigate');
    expect(parsed.result.answer.outcome.summary).toContain('query.navigate');
    expect(parsed.result.answer.outcome.issues.some((issue) => issue.code.includes('focus-excluded'))).toBe(true);
  });

  it('spends excluded-frontier seams inside package-audit answers', () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const raw = runCli([
      'ask',
      'Audit @fixture/app for tech debt.',
      '--repo',
      repoPath,
      '--json',
    ]);
    const parsed = JSON.parse(raw) as {
      readonly result: {
        readonly answer: {
          readonly outcome: {
            readonly tag: string;
            readonly value?: {
              readonly execution?: {
                readonly command?: string;
              };
            };
            readonly issues: ReadonlyArray<{
              readonly code: string;
              readonly message: string;
            }>;
          };
        };
      };
    };

    expect(parsed.result.answer.outcome.tag).toBe('open-boundary');
    expect(parsed.result.answer.outcome.value?.execution?.command).toBe('query.audit.package');
    expect(parsed.result.answer.outcome.issues.some((issue) =>
      issue.code === 'focus-excluded-boundary-seams'
      && issue.message.includes('touches 1 observed seam'),
    )).toBe(true);
  });

  it('keeps explicit repo and profile targeting visible in plan.question flows', () => {
    const repoPath = createExplicitProfileFixtureRepo();
    const raw = runCli([
      'plan',
      'question',
      `Open a source-analysis session for ${repoPath}.`,
      '--repo',
      repoPath,
      '--target',
      'fixture-explicit-target',
      '--profile-path',
      'profiles/framework-core.json',
      '--json',
    ]);
    const parsed = JSON.parse(raw) as {
      readonly command: string;
      readonly result: {
        readonly answer: {
          readonly query: {
            readonly worldFrame?: {
              readonly repoPath?: string;
              readonly target?: string;
              readonly profilePath?: string;
            };
          };
          readonly outcome: {
            readonly value?: {
              readonly status?: string;
              readonly capability?: {
                readonly command?: string;
              };
            };
          };
        };
      };
    };

    expect(parsed.command).toBe('plan.question');
    expect(parsed.result.answer.query.worldFrame?.repoPath).toBe(repoPath);
    expect(parsed.result.answer.query.worldFrame?.target).toBe('fixture-explicit-target');
    expect(parsed.result.answer.query.worldFrame?.profilePath).toBe('profiles/framework-core.json');
    expect(parsed.result.answer.outcome.value?.status).toBe('ready');
    expect(parsed.result.answer.outcome.value?.capability?.command).toBe('session.open');
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

function createExplicitProfileFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-cli-explicit-profile-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'profiles'), { recursive: true });
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

  return repoPath;
}

function createExcludedFrontierFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-cli-frontier-profile-'));
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
