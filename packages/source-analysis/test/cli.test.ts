import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  startHostServiceServer,
  type HostServiceServer,
} from '../src/host/service-server.js';

const tempDirs: string[] = [];
let hostServer: HostServiceServer | undefined;
let previousHostEndpoint = process.env.SOURCE_ANALYSIS_HOST_ENDPOINT;
const execFileAsync = promisify(execFile);

beforeEach(async () => {
  previousHostEndpoint = process.env.SOURCE_ANALYSIS_HOST_ENDPOINT;
  hostServer = await startHostServiceServer({
    endpoint: createTestHostEndpoint(),
    idleTimeoutMs: 60_000,
  });
  process.env.SOURCE_ANALYSIS_HOST_ENDPOINT = hostServer.endpoint;
});

afterEach(async () => {
  if (hostServer) {
    await hostServer.close();
    hostServer = undefined;
  }
  if (previousHostEndpoint === undefined) {
    delete process.env.SOURCE_ANALYSIS_HOST_ENDPOINT;
  } else {
    process.env.SOURCE_ANALYSIS_HOST_ENDPOINT = previousHostEndpoint;
  }

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('source-analysis hosted CLI', () => {
  it('describes the resolved profile and snapshot support as JSON', async () => {
    const repoPath = createProfileFixtureRepo();
    const raw = await runCliAsync(['describe', 'profile', '--repo', repoPath, '--json']);
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

  it('answers questions end-to-end through the top-level ask command', async () => {
    const repoPath = createAuditFixtureRepo();
    const raw = await runCliAsync([
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

  it('reuses an opened hosted session across separate CLI invocations', async () => {
    const repoPath = createAuditFixtureRepo();
    const openRaw = await runCliAsync([
      'session',
      'open',
      '--repo',
      repoPath,
      '--target',
      'fixture-cli-session',
      '--json',
    ]);
    const opened = JSON.parse(openRaw) as {
      readonly command: string;
      readonly result: {
        readonly sessionId: string;
      };
    };

    const askRaw = await runCliAsync([
      'ask',
      'Audit @fixture/source-analysis-audit for tech debt.',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const asked = JSON.parse(askRaw) as {
      readonly result: {
        readonly execution?: {
          readonly usedSessionId?: string;
          readonly ephemeralSession: boolean;
          readonly steps: ReadonlyArray<{
            readonly command: string;
            readonly status: string;
          }>;
        };
      };
    };

    expect(asked.result.execution?.usedSessionId).toBe(opened.result.sessionId);
    expect(asked.result.execution?.ephemeralSession).toBe(false);
    expect(asked.result.execution?.steps.map((step) => step.command)).toEqual([
      'query.audit.package',
    ]);

    const statusRaw = await runCliAsync(['session', 'status', '--json']);
    const status = JSON.parse(statusRaw) as {
      readonly result: {
        readonly sessions: ReadonlyArray<{
          readonly sessionId: string;
        }>;
      };
    };

    expect(status.result.sessions.some((session) => session.sessionId === opened.result.sessionId)).toBe(true);
  });

  it('routes analyzability questions through profile posture instead of workspace orientation', async () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const raw = await runCliAsync([
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

  it('treats excluded package focuses as explicit boundaries instead of silent misses', async () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const raw = await runCliAsync([
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

  it('spends excluded-frontier seams inside package-audit answers', async () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const raw = await runCliAsync([
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

  it('keeps explicit repo and profile targeting visible in plan.question flows', async () => {
    const repoPath = createExplicitProfileFixtureRepo();
    const raw = await runCliAsync([
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

async function runCliAsync(
  args: readonly string[],
): Promise<string> {
  const result = await execFileAsync(
    process.execPath,
    [
      join(process.cwd(), 'packages', 'source-analysis', 'out', 'cli.js'),
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

function createTestHostEndpoint(): string {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\source-analysis-test-${suffix}`;
  }
  return join(tmpdir(), `source-analysis-test-${suffix}.sock`);
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
