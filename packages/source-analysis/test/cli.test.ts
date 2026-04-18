import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { afterAll, afterEach, beforeAll, describe, expect, it } from './test-harness.js';
import {
  startHostServiceServer,
  type HostServiceServer,
} from '../src/host/service-server.js';

const tempDirs: string[] = [];
let hostServer: HostServiceServer | undefined;
let previousHostEndpoint = process.env.SOURCE_ANALYSIS_HOST_ENDPOINT;
const execFileAsync = promisify(execFile);

beforeAll(async () => {
  previousHostEndpoint = process.env.SOURCE_ANALYSIS_HOST_ENDPOINT;
  hostServer = await startHostServiceServer({
    endpoint: createTestHostEndpoint(),
    idleTimeoutMs: 60_000,
  });
  process.env.SOURCE_ANALYSIS_HOST_ENDPOINT = hostServer.endpoint;
});

afterEach(async () => {
  closeAllHostSessions();

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

afterAll(async () => {
  if (hostServer) {
    await hostServer.close();
    hostServer = undefined;
  }
  if (previousHostEndpoint === undefined) {
    delete process.env.SOURCE_ANALYSIS_HOST_ENDPOINT;
  } else {
    process.env.SOURCE_ANALYSIS_HOST_ENDPOINT = previousHostEndpoint;
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

  it('resolves package, type, export, symbol, file, package-surface, reachability, and export-trace through the hosted CLI', async () => {
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

    const pkgRaw = await runCliAsync([
      'resolve',
      'package',
      '@fixture/source-analysis-audit',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const pkg = JSON.parse(pkgRaw) as {
      readonly command: string;
      readonly result: {
        readonly outcome: {
          readonly kind: string;
          readonly value?: {
            readonly package_name?: string;
          };
        };
      };
    };

    expect(pkg.command).toBe('query.package.resolve');
    expect(pkg.result.outcome.kind).toBe('claim');
    expect(pkg.result.outcome.value?.package_name).toBe('@fixture/source-analysis-audit');

    const typeRaw = await runCliAsync([
      'resolve',
      'type',
      'LiveShape',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const typeDecl = JSON.parse(typeRaw) as {
      readonly command: string;
      readonly result: {
        readonly outcome: {
          readonly kind: string;
          readonly value?: {
            readonly name?: string;
          };
        };
      };
    };

    expect(typeDecl.command).toBe('query.type.resolve');
    expect(typeDecl.result.outcome.kind).toBe('claim');
    expect(typeDecl.result.outcome.value?.name).toBe('LiveShape');

    const exportRaw = await runCliAsync([
      'resolve',
      'export',
      'auditReady',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const exported = JSON.parse(exportRaw) as {
      readonly command: string;
      readonly result: {
        readonly outcome: {
          readonly kind: string;
          readonly value?: {
            readonly exported_name?: string;
          };
        };
      };
    };

    expect(exported.command).toBe('query.export.resolve');
    expect(exported.result.outcome.kind).toBe('claim');
    expect(exported.result.outcome.value?.exported_name).toBe('auditReady');

    const surfaceRaw = await runCliAsync([
      'inspect',
      'package-surface',
      '@fixture/source-analysis-audit',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const surface = JSON.parse(surfaceRaw) as {
      readonly command: string;
      readonly result: {
        readonly packageOutcome: {
          readonly kind: string;
        };
        readonly surface: null | {
          readonly files: readonly string[];
          readonly uncoveredFiles: readonly string[];
          readonly fileEntries: ReadonlyArray<{
            readonly filePath: string;
            readonly declarations: ReadonlyArray<{
              readonly name: string;
            }>;
          }>;
        };
      };
    };

    expect(surface.command).toBe('query.package.surface');
    expect(surface.result.packageOutcome.kind).toBe('claim');
    expect(surface.result.surface?.files).toContain('src/index.ts');
    expect(surface.result.surface?.uncoveredFiles).toContain('test/index.test.ts');
    expect(surface.result.surface?.fileEntries.find((entry) => entry.filePath === 'src/live.ts')?.declarations[0]?.name).toBe('LiveShape');

    const reachabilityRaw = await runCliAsync([
      'inspect',
      'package-reachability',
      '@fixture/source-analysis-audit',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const reachability = JSON.parse(reachabilityRaw) as {
      readonly command: string;
      readonly result: {
        readonly packageOutcome: {
          readonly kind: string;
        };
        readonly reachability: null | {
          readonly publicSurfaceFiles: readonly string[];
          readonly candidateEntryFiles: readonly string[];
        };
      };
    };

    expect(reachability.command).toBe('query.package.reachability');
    expect(reachability.result.packageOutcome.kind).toBe('claim');
    expect(reachability.result.reachability?.publicSurfaceFiles).toContain('src/index.ts');
    expect(reachability.result.reachability?.candidateEntryFiles).toContain('src/tool.ts');

    const traceRaw = await runCliAsync([
      'inspect',
      'export-trace',
      '@fixture/source-analysis-audit',
      'auditReady',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const trace = JSON.parse(traceRaw) as {
      readonly command: string;
      readonly result: {
        readonly packageOutcome: {
          readonly kind: string;
        };
        readonly exportOutcome: null | {
          readonly kind: string;
        };
        readonly route: null | {
          readonly declarationFile: string | null;
          readonly declarationName: string;
        };
      };
    };

    expect(trace.command).toBe('query.export.trace');
    expect(trace.result.packageOutcome.kind).toBe('claim');
    expect(trace.result.exportOutcome?.kind).toBe('claim');
    expect(trace.result.route?.declarationFile).toBe('src/index.ts');
    expect(trace.result.route?.declarationName).toBe('auditReady');

    const auditSignalsRaw = await runCliAsync([
      'inspect',
      'package-audit-signals',
      '@fixture/source-analysis-audit',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const auditSignals = JSON.parse(auditSignalsRaw) as {
      readonly command: string;
      readonly result: {
        readonly packageOutcome: {
          readonly kind: string;
        };
        readonly signals: null | ReadonlyArray<{
          readonly code: string;
        }>;
      };
    };

    expect(auditSignals.command).toBe('query.package.audit-signals');
    expect(auditSignals.result.packageOutcome.kind).toBe('claim');
    expect(auditSignals.result.signals?.some((signal) => signal.code === 'package-uncovered-files')).toBe(true);
    expect(auditSignals.result.signals?.some((signal) => signal.code === 'candidate-entry-roots')).toBe(true);
    expect(auditSignals.result.signals?.some((signal) => signal.code === 'answer-coordination-fragmentation')).toBe(false);

    const fileRouteRaw = await runCliAsync([
      'inspect',
      'file-route',
      'src/live.ts',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const fileRoute = JSON.parse(fileRouteRaw) as {
      readonly command: string;
      readonly result: {
        readonly inspection: {
          readonly matchedFilePath: string | null;
        };
        readonly package: null | {
          readonly package_name: string;
        };
        readonly witnesses: null | ReadonlyArray<{
          readonly rootKind: string;
          readonly files: readonly string[];
        }>;
      };
    };

    expect(fileRoute.command).toBe('query.file.route');
    expect(fileRoute.result.inspection.matchedFilePath).toBe('src/live.ts');
    expect(fileRoute.result.package?.package_name).toBe('@fixture/source-analysis-audit');
    expect(fileRoute.result.witnesses?.[0]?.rootKind).toBe('public-api');
    expect(fileRoute.result.witnesses?.[0]?.files).toEqual(['src/index.ts', 'src/live.ts']);

    const typeRouteRaw = await runCliAsync([
      'inspect',
      'type-route',
      'LiveShape',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const typeRoute = JSON.parse(typeRouteRaw) as {
      readonly command: string;
      readonly result: {
        readonly typeOutcome: {
          readonly kind: string;
          readonly value?: {
            readonly file?: string;
          };
        };
        readonly package: null | {
          readonly package_name: string;
        };
        readonly regimeContext: null | {
          readonly focusLabel: string;
        };
        readonly witnesses: null | ReadonlyArray<{
          readonly rootKind: string;
        }>;
      };
    };

    expect(typeRoute.command).toBe('query.type.route');
    expect(typeRoute.result.typeOutcome.kind).toBe('claim');
    expect(typeRoute.result.typeOutcome.value?.file).toBe('src/live.ts');
    expect(typeRoute.result.package?.package_name).toBe('@fixture/source-analysis-audit');
    expect(typeRoute.result.regimeContext?.focusLabel).toBe('LiveShape');
    expect(typeRoute.result.witnesses?.[0]?.rootKind).toBe('public-api');

    const symbolRaw = await runCliAsync([
      'lookup',
      'symbol',
      'auditReady',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const symbol = JSON.parse(symbolRaw) as {
      readonly command: string;
      readonly result: {
        readonly lookup: {
          readonly tag: string;
          readonly matches: ReadonlyArray<{
            readonly declaration: {
              readonly attributes: {
                readonly name: string;
              };
            };
          }>;
        };
      };
    };

    expect(symbol.command).toBe('query.symbol.lookup');
    expect(symbol.result.lookup.tag).toBe('hit');
    expect(symbol.result.lookup.matches[0]?.declaration.attributes.name).toBe('auditReady');

    const fileRaw = await runCliAsync([
      'inspect',
      'file',
      'src/live.ts',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const file = JSON.parse(fileRaw) as {
      readonly command: string;
      readonly result: {
        readonly inspection: {
          readonly matchedFilePath: string | null;
          readonly matches: readonly string[];
        };
      };
    };

    expect(file.command).toBe('query.file.inspect');
    expect(file.result.inspection.matchedFilePath).toBe('src/live.ts');
    expect(file.result.inspection.matches).toContain('src/live.ts');
  });

  it('reuses an opened hosted session across separate primitive CLI invocations', async () => {
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
      readonly result: {
        readonly sessionId: string;
      };
    };

    const resolveRaw = await runCliAsync([
      'resolve',
      'package',
      '@fixture/source-analysis-audit',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const resolved = JSON.parse(resolveRaw) as {
      readonly meta: {
        readonly sessionId?: string;
      };
      readonly result: {
        readonly outcome: {
          readonly kind: string;
        };
      };
    };

    expect(resolved.meta.sessionId).toBe(opened.result.sessionId);
    expect(resolved.result.outcome.kind).toBe('claim');

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

  it('surfaces analyzability posture directly through describe profile', async () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const raw = await runCliAsync([
      'describe',
      'profile',
      '--repo',
      repoPath,
      '--json',
    ]);
    const parsed = JSON.parse(raw) as {
      readonly command: string;
      readonly result: {
        readonly posture: {
          readonly boundaryState: {
            readonly id: string;
          };
          readonly openFronts: ReadonlyArray<{
            readonly title: string;
          }>;
        };
      };
    };

    expect(parsed.command).toBe('describe.profile');
    expect(parsed.result.posture.boundaryState.id).toBe('named-open-fronts');
    expect(parsed.result.posture.openFronts.some((front) =>
      front.title.toLowerCase().includes('excluded'),
    )).toBe(true);
  });

  it('treats excluded package focuses as explicit boundaries in direct navigate queries', async () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const openRaw = await runCliAsync([
      'session',
      'open',
      '--repo',
      repoPath,
      '--target',
      'fixture-cli-excluded',
      '--json',
    ]);
    const opened = JSON.parse(openRaw) as {
      readonly result: {
        readonly sessionId: string;
      };
    };

    const raw = await runCliAsync([
      'query',
      'navigate',
      'package',
      '@fixture/excluded',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const parsed = JSON.parse(raw) as {
      readonly result: {
        readonly answer: {
          readonly outcome: {
            readonly tag: string;
            readonly summary: string;
            readonly issues: ReadonlyArray<{
              readonly code: string;
            }>;
          };
        };
      };
    };

    expect(parsed.result.answer.outcome.tag).toBe('open-boundary');
    expect(parsed.result.answer.outcome.issues.some((issue) => issue.code.includes('focus-excluded'))).toBe(true);
  });

  it('spends excluded-frontier seams inside direct package-audit CLI queries', async () => {
    const repoPath = createExcludedFrontierFixtureRepo();
    const openRaw = await runCliAsync([
      'session',
      'open',
      '--repo',
      repoPath,
      '--target',
      'fixture-cli-audit',
      '--json',
    ]);
    const opened = JSON.parse(openRaw) as {
      readonly result: {
        readonly sessionId: string;
      };
    };

    const raw = await runCliAsync([
      'query',
      'audit-package',
      '@fixture/app',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const parsed = JSON.parse(raw) as {
      readonly result: {
        readonly answer: {
          readonly outcome: {
            readonly tag: string;
            readonly issues: ReadonlyArray<{
              readonly code: string;
              readonly message: string;
            }>;
          };
        };
      };
    };

    expect(parsed.result.answer.outcome.tag).toBe('open-boundary');
    expect(parsed.result.answer.outcome.issues.some((issue) =>
      issue.code === 'focus-excluded-boundary-seams'
      && issue.message.includes('touches 1 observed seam'),
    )).toBe(true);
  });

  it('keeps explicit repo and profile targeting visible in direct session flows', async () => {
    const repoPath = createExplicitProfileFixtureRepo();
    const openRaw = await runCliAsync([
      'session',
      'open',
      '--repo',
      repoPath,
      '--target',
      'fixture-explicit-target',
      '--profile-path',
      'profiles/framework-core.json',
      '--json',
    ]);
    const opened = JSON.parse(openRaw) as {
      readonly command: string;
      readonly result: {
        readonly sessionId: string;
        readonly target: string;
        readonly profilePath: string | null;
      };
    };

    expect(opened.command).toBe('session.open');
    expect(opened.result.target).toBe('fixture-explicit-target');
    expect(opened.result.profilePath?.replace(/\\/g, '/').endsWith('profiles/framework-core.json')).toBe(true);

    const statusRaw = await runCliAsync([
      'session',
      'status',
      '--session-id',
      opened.result.sessionId,
      '--json',
    ]);
    const status = JSON.parse(statusRaw) as {
      readonly result: {
        readonly sessions: ReadonlyArray<{
          readonly sessionId: string;
          readonly profilePath: string | null;
        }>;
      };
    };

    expect(status.result.sessions[0]?.sessionId).toBe(opened.result.sessionId);
    expect(status.result.sessions[0]?.profilePath?.replace(/\\/g, '/').endsWith('profiles/framework-core.json')).toBe(true);
  });
});

async function runCliAsync(
  args: readonly string[],
): Promise<string> {
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

function closeAllHostSessions(): void {
  const sessions = hostServer?.runtime.execute({
    command: 'session.status',
    args: {},
  }).result.sessions ?? [];
  for (const session of sessions) {
    hostServer?.runtime.execute({
      command: 'session.close',
      args: { sessionId: session.sessionId },
    });
  }
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
