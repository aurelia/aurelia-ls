import type {
  DescribeProfileResult,
  HostCommandEnvelope,
  HostCommandInvocation,
  HostCommandName,
  HostRenderedView,
} from './host/types.js';
import type { SpendThreshold } from './authority/contracts.js';
import type { QuestionRoute, ReadMode } from './inquiry-model.js';
import type { ConsumerKind } from './inquiry-policy.js';
import type { SnapshotKind } from './snapshots.js';
import {
  ensureHostServiceRunning,
  executeHostServiceInvocation,
  inspectHostServiceStatus,
  stopHostService,
} from './host/service-client.js';

const HOSTED_CLI_MODES = [
  'describe',
  'session',
  'query',
  'resolve',
  'lookup',
  'inspect',
  'host',
] as const;

type HostedCliMode =
  typeof HOSTED_CLI_MODES[number];

interface ParsedCommonArgs {
  readonly json: boolean;
  readonly repoPath?: string;
  readonly target?: string;
  readonly profilePath?: string;
  readonly sessionId?: string;
  readonly readMode?: ReadMode;
  readonly consumer?: ConsumerKind;
  readonly focusValue?: string;
  readonly warmPrograms?: boolean;
  readonly force?: boolean;
  readonly kinds?: readonly SnapshotKind[];
  readonly files?: readonly string[];
  readonly outDir?: string;
  readonly scope?: 'files' | 'project';
  readonly locatorKind?: 'package-name' | 'package-dir';
  readonly spendThreshold?: SpendThreshold;
  readonly questionRoute?: QuestionRoute;
}

export function isHostedCliMode(
  value: string | undefined,
): value is HostedCliMode {
  return Boolean(value && HOSTED_CLI_MODES.includes(value as HostedCliMode));
}

export async function runHostedCli(
  argv: readonly string[],
): Promise<number> {
  const args = [...argv];
  const mode = args.shift();

  if (!isHostedCliMode(mode)) {
    throw new Error(`Unsupported hosted CLI mode: ${String(mode)}`);
  }

  if (mode === 'host') {
    return runHostManagementCli(args);
  }

  const common = parseCommonArgs(args);
  const invocation = buildInvocation(mode as Exclude<HostedCliMode, 'host'>, args, common);
  const envelope = await executeInvocation(invocation);

  if (common.json) {
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
  } else {
    renderEnvelopeText(envelope);
  }

  if (envelope.errors.length > 0) {
    for (const error of envelope.errors) {
      process.stderr.write(`${error.code}: ${error.message}\n`);
    }
  }

  return envelope.status === 'ok' && envelope.errors.length === 0 ? 0 : 1;
}

async function executeInvocation(
  invocation: HostCommandInvocation<HostCommandName>,
): Promise<HostCommandEnvelope<unknown>> {
  await ensureHostServiceRunning();
  return executeHostServiceInvocation(invocation);
}

function buildInvocation(
  mode: Exclude<HostedCliMode, 'host'>,
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  switch (mode) {
    case 'describe':
      return buildDescribeInvocation(remainingArgs, common);
    case 'session':
      return buildSessionInvocation(remainingArgs, common);
    case 'query':
      return buildQueryInvocation(remainingArgs, common);
    case 'resolve':
      return buildResolveInvocation(remainingArgs, common);
    case 'lookup':
      return buildLookupInvocation(remainingArgs, common);
    case 'inspect':
      return buildInspectInvocation(remainingArgs, common);
    default:
      return assertNever(mode);
  }
}

function buildDescribeInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  if (topic !== 'profile') {
    throw new Error('Usage: pnpm source-analysis describe profile [--repo <path>] [--json]');
  }

  return {
    command: 'describe.profile',
    args: {
      repoPath: common.repoPath,
      target: common.target,
      profilePath: common.profilePath,
    },
  };
}

function buildSessionInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  if (!topic) {
    throw new Error('Usage: pnpm source-analysis session <open|status|close|refresh|invalidate|materialize>');
  }

  switch (topic) {
    case 'open':
      return {
        command: 'session.open',
        args: {
          repoPath: common.repoPath ?? process.cwd(),
          target: common.target,
          profilePath: common.profilePath,
          sessionId: common.sessionId,
          warmPrograms: common.warmPrograms,
        },
      };
    case 'status':
      return {
        command: 'session.status',
        args: {
          sessionId: common.sessionId,
        },
      };
    case 'close':
      return {
        command: 'session.close',
        args: {
          sessionId: requireSessionId(common.sessionId, 'session close'),
        },
      };
    case 'refresh':
      return {
        command: 'session.refresh',
        args: {
          sessionId: requireSessionId(common.sessionId, 'session refresh'),
          ...(common.kinds && common.kinds.length > 0 ? { kinds: common.kinds } : {}),
          ...(common.force ? { force: true } : {}),
        },
      };
    case 'invalidate':
      return {
        command: 'session.invalidate',
        args: {
          sessionId: requireSessionId(common.sessionId, 'session invalidate'),
          ...(common.files && common.files.length > 0 ? { files: common.files } : {}),
          ...(common.scope ? { scope: common.scope } : {}),
        },
      };
    case 'materialize':
      return {
        command: 'materializeSnapshots',
        args: {
          sessionId: requireSessionId(common.sessionId, 'session materialize'),
          ...(common.kinds && common.kinds.length > 0 ? { kinds: common.kinds } : {}),
          ...(common.outDir ? { outDir: common.outDir } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    default:
      throw new Error(`Unknown session topic: ${topic}`);
  }
}

function buildQueryInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  if (!topic) {
    throw new Error('Usage: pnpm source-analysis query <audit-package|route-witness|navigate>');
  }

  switch (topic) {
    case 'audit-package': {
      const packageName = remainingArgs[1];
      if (!packageName) {
        throw new Error('Usage: pnpm source-analysis query audit-package <package-name> --session-id <id>');
      }
      return {
        command: 'query.audit.package',
        args: {
          sessionId: requireSessionId(common.sessionId, 'query audit-package'),
          packageName,
          readMode: common.readMode,
          consumer: common.consumer,
          renderStyle: common.json ? 'json-document' : 'plain-text',
        },
      };
    }
    case 'route-witness': {
      const focusKind = remainingArgs[1];
      const focusValue = remainingArgs.slice(2).join(' ').trim();
      if ((focusKind !== 'file' && focusKind !== 'type') || !focusValue) {
        throw new Error('Usage: pnpm source-analysis query route-witness <file|type> <focus> --session-id <id>');
      }
      return {
        command: 'query.route.witness',
        args: {
          sessionId: requireSessionId(common.sessionId, 'query route-witness'),
          focusKind,
          focusValue,
          readMode: common.readMode,
          consumer: common.consumer,
          renderStyle: common.json ? 'json-document' : 'plain-text',
        },
      };
    }
    case 'navigate': {
      const focusKind = remainingArgs[1];
      const focusValue = remainingArgs.slice(2).join(' ').trim();
      if (
        (focusKind !== 'package'
          && focusKind !== 'file'
          && focusKind !== 'symbol'
          && focusKind !== 'type'
          && focusKind !== 'export')
        || !focusValue
      ) {
        throw new Error('Usage: pnpm source-analysis query navigate <package|file|symbol|type|export> <focus> --session-id <id>');
      }
      return {
        command: 'query.navigate',
        args: {
          sessionId: requireSessionId(common.sessionId, 'query navigate'),
          focusKind,
          focusValue,
          ...(common.questionRoute ? { questionRoute: common.questionRoute } : {}),
          readMode: common.readMode,
          consumer: common.consumer,
          renderStyle: common.json ? 'json-document' : 'plain-text',
        },
      };
    }
    default:
      throw new Error(`Unknown query topic: ${topic}`);
  }
}

function buildResolveInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  const locator = remainingArgs.slice(1).join(' ').trim();
  if (!topic || !locator) {
    throw new Error('Usage: pnpm source-analysis resolve <package|type|export> <locator> --session-id <id>');
  }

  switch (topic) {
    case 'package':
      return {
        command: 'query.package.resolve',
        args: {
          sessionId: requireSessionId(common.sessionId, 'resolve package'),
          locator,
          ...(common.locatorKind ? { locatorKind: common.locatorKind } : {}),
          ...(common.spendThreshold ? { spendThreshold: common.spendThreshold } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    case 'type':
      return {
        command: 'query.type.resolve',
        args: {
          sessionId: requireSessionId(common.sessionId, 'resolve type'),
          locator,
          ...(common.spendThreshold ? { spendThreshold: common.spendThreshold } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    case 'export':
      return {
        command: 'query.export.resolve',
        args: {
          sessionId: requireSessionId(common.sessionId, 'resolve export'),
          locator,
          ...(common.spendThreshold ? { spendThreshold: common.spendThreshold } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    default:
      throw new Error(`Unknown resolve topic: ${topic}`);
  }
}

function buildLookupInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  const locator = remainingArgs.slice(1).join(' ').trim();
  if (topic !== 'symbol' || !locator) {
    throw new Error('Usage: pnpm source-analysis lookup symbol <locator> --session-id <id>');
  }

  return {
    command: 'query.symbol.lookup',
    args: {
      sessionId: requireSessionId(common.sessionId, 'lookup symbol'),
      locator,
      ...(common.force ? { refreshIfNeeded: true } : {}),
    },
  };
}

function buildInspectInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  switch (topic) {
    case 'file': {
      const filePath = remainingArgs.slice(1).join(' ').trim();
      if (!filePath) {
        throw new Error('Usage: pnpm source-analysis inspect file <path> --session-id <id>');
      }
      return {
        command: 'query.file.inspect',
        args: {
          sessionId: requireSessionId(common.sessionId, 'inspect file'),
          filePath,
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    }
    case 'package-surface': {
      const locator = remainingArgs.slice(1).join(' ').trim();
      if (!locator) {
        throw new Error('Usage: pnpm source-analysis inspect package-surface <locator> --session-id <id>');
      }
      return {
        command: 'query.package.surface',
        args: {
          sessionId: requireSessionId(common.sessionId, 'inspect package-surface'),
          locator,
          ...(common.locatorKind ? { locatorKind: common.locatorKind } : {}),
          ...(common.spendThreshold ? { spendThreshold: common.spendThreshold } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    }
    case 'package-reachability': {
      const locator = remainingArgs.slice(1).join(' ').trim();
      if (!locator) {
        throw new Error('Usage: pnpm source-analysis inspect package-reachability <locator> --session-id <id>');
      }
      return {
        command: 'query.package.reachability',
        args: {
          sessionId: requireSessionId(common.sessionId, 'inspect package-reachability'),
          locator,
          ...(common.locatorKind ? { locatorKind: common.locatorKind } : {}),
          ...(common.spendThreshold ? { spendThreshold: common.spendThreshold } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    }
    case 'package-audit-signals': {
      const locator = remainingArgs.slice(1).join(' ').trim();
      if (!locator) {
        throw new Error('Usage: pnpm source-analysis inspect package-audit-signals <locator> --session-id <id>');
      }
      return {
        command: 'query.package.audit-signals',
        args: {
          sessionId: requireSessionId(common.sessionId, 'inspect package-audit-signals'),
          locator,
          ...(common.locatorKind ? { locatorKind: common.locatorKind } : {}),
          ...(common.spendThreshold ? { spendThreshold: common.spendThreshold } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    }
    case 'export-trace': {
      const packageLocator = remainingArgs[1];
      const exportedName = remainingArgs[2];
      if (!packageLocator || !exportedName) {
        throw new Error('Usage: pnpm source-analysis inspect export-trace <package-locator> <exported-name> --session-id <id>');
      }
      return {
        command: 'query.export.trace',
        args: {
          sessionId: requireSessionId(common.sessionId, 'inspect export-trace'),
          packageLocator,
          exportedName,
          ...(common.locatorKind ? { packageLocatorKind: common.locatorKind } : {}),
          ...(common.spendThreshold ? { spendThreshold: common.spendThreshold } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    }
    case 'file-route': {
      const filePath = remainingArgs.slice(1).join(' ').trim();
      if (!filePath) {
        throw new Error('Usage: pnpm source-analysis inspect file-route <path> --session-id <id>');
      }
      return {
        command: 'query.file.route',
        args: {
          sessionId: requireSessionId(common.sessionId, 'inspect file-route'),
          filePath,
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    }
    case 'type-route': {
      const locator = remainingArgs.slice(1).join(' ').trim();
      if (!locator) {
        throw new Error('Usage: pnpm source-analysis inspect type-route <locator> --session-id <id>');
      }
      return {
        command: 'query.type.route',
        args: {
          sessionId: requireSessionId(common.sessionId, 'inspect type-route'),
          locator,
          ...(common.spendThreshold ? { spendThreshold: common.spendThreshold } : {}),
          ...(common.force ? { refreshIfNeeded: true } : {}),
        },
      };
    }
    default:
      throw new Error('Usage: pnpm source-analysis inspect <file|package-surface|package-reachability|package-audit-signals|export-trace|file-route|type-route> ... --session-id <id>');
  }
}

function parseCommonArgs(
  args: string[],
): ParsedCommonArgs {
  const json = takeBooleanFlag(args, '--json');
  const repoPath = takeOption(args, '--repo');
  const target = takeOption(args, '--target');
  const profilePath = takeOption(args, '--profile-path');
  const sessionId = takeOption(args, '--session-id');
  const readMode = takeOption(args, '--read-mode') as ReadMode | undefined;
  const consumer = takeOption(args, '--consumer') as ConsumerKind | undefined;
  const focusValue = takeOption(args, '--focus-value');
  const warmPrograms = !takeBooleanFlag(args, '--cold');
  const force = takeBooleanFlag(args, '--force');
  const kinds = takeRepeatableKinds(args, '--kind');
  const files = takeRepeatableOption(args, '--file');
  const outDir = takeOption(args, '--out-dir');
  const scope = takeOption(args, '--scope') as 'files' | 'project' | undefined;
  const locatorKind = takeOption(args, '--locator-kind') as 'package-name' | 'package-dir' | undefined;
  const spendThreshold = takeOption(args, '--spend-threshold') as SpendThreshold | undefined;
  const questionRoute = takeOption(args, '--question-route') as QuestionRoute | undefined;

  return {
    json,
    ...(repoPath ? { repoPath } : {}),
    ...(target ? { target } : {}),
    ...(profilePath ? { profilePath } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(readMode ? { readMode } : {}),
    ...(consumer ? { consumer } : {}),
    ...(focusValue ? { focusValue } : {}),
    ...(warmPrograms ? { warmPrograms: true } : { warmPrograms: false }),
    ...(force ? { force: true } : {}),
    ...(kinds.length > 0 ? { kinds } : {}),
    ...(files.length > 0 ? { files } : {}),
    ...(outDir ? { outDir } : {}),
    ...(scope ? { scope } : {}),
    ...(locatorKind ? { locatorKind } : {}),
    ...(spendThreshold ? { spendThreshold } : {}),
    ...(questionRoute ? { questionRoute } : {}),
  };
}

function takeBooleanFlag(
  args: string[],
  flag: string,
): boolean {
  const index = args.indexOf(flag);
  if (index === -1) {
    return false;
  }
  args.splice(index, 1);
  return true;
}

function takeOption(
  args: string[],
  flag: string,
): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  args.splice(index, 2);
  return value;
}

function takeRepeatableOption(
  args: string[],
  flag: string,
): readonly string[] {
  const values: string[] = [];
  while (true) {
    const index = args.indexOf(flag);
    if (index === -1) {
      return values;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${flag}`);
    }
    values.push(value);
    args.splice(index, 2);
  }
}

function takeRepeatableKinds(
  args: string[],
  flag: string,
): readonly SnapshotKind[] {
  const values = takeRepeatableOption(args, flag);
  for (const value of values) {
    if (value !== 'deps' && value !== 'typerefs' && value !== 'exports') {
      throw new Error(`Invalid ${flag} value: ${value}`);
    }
  }
  return values as readonly SnapshotKind[];
}

function renderEnvelopeText(
  envelope: HostCommandEnvelope<unknown>,
): void {
  if (envelope.command === 'describe.profile') {
    renderDescribeProfileText(envelope.result as DescribeProfileResult);
    return;
  }

  const rendered = extractRenderedView(envelope.result);
  if (rendered?.style === 'plain-text') {
    process.stdout.write(`${rendered.rendered.lines.join('\n')}\n`);
    return;
  }

  const answerSummary = extractAnswerSummary(envelope.result);
  if (answerSummary) {
    process.stdout.write(`${answerSummary}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(envelope.result, null, 2)}\n`);
}

function renderDescribeProfileText(
  result: DescribeProfileResult,
): void {
  const lines = [
    `Repo:                ${result.profile.repoPath}`,
    `Target:              ${result.profile.snapshotTarget}`,
    `Profile:             ${result.profile.profileId}${result.profile.profilePath ? ` (${result.profile.profilePath})` : ''}`,
    `Snapshot root:       ${result.snapshotSupport.snapshotRootPath}`,
    `Package roots:       ${result.profile.packageDiscoveryRoots.map((root) => root.root).join(', ') || '(none)'}`,
    `Include repo root:   ${result.profile.includeRepoRootPackage ? 'yes' : 'no'}`,
    `Excluded prefixes:   ${result.profile.excludedRepoRelativePrefixes.length}`,
    `Partition schemes:   ${result.profile.partitionSchemes.map((scheme) => scheme.id).join(', ') || '(none)'}`,
    `Operational tier:    ${result.posture.operationalAnalyzabilityTier.label}`,
    `Minimum deterministic ceiling: ${result.posture.minimumDeterministicInterpretationCeiling.label}`,
    `Boundary state:      ${result.posture.boundaryState.label}`,
    `Frontier evidence:   ${result.posture.frontierEvidenceSource}`,
    `Named open fronts:   ${result.posture.openFronts.length}`,
    '',
    'Analyzability posture:',
    ...result.posture.summaryLines.map((line) => `  ${line}`),
    '',
    'Snapshot support:',
  ];

  for (const snapshot of result.snapshotSupport.snapshots) {
    const statusSuffix = snapshot.regimeStatus === 'aligned'
      ? snapshot.status
      : `${snapshot.status}, ${snapshot.regimeStatus}`;
    lines.push(
      `  ${snapshot.kind}: ${statusSuffix}${snapshot.generatedAt ? ` (${snapshot.generatedAt})` : ''}`,
    );
    for (const issue of snapshot.issues) {
      lines.push(`    - ${issue}`);
    }
  }

  if (result.posture.openFronts.length > 0) {
    lines.push('', 'Named open fronts:');
    for (const front of result.posture.openFronts) {
      lines.push(`  ${front.title}: ${front.summary}`);
      for (const evidence of front.evidence.slice(0, 4)) {
        lines.push(`    - ${evidence}`);
      }
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

function extractRenderedView(
  value: unknown,
): HostRenderedView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return (record.rendered as HostRenderedView | undefined) ?? null;
}

function extractAnswerSummary(
  value: unknown,
): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const answer = (value as Record<string, unknown>).answer;
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    return null;
  }

  const outcome = (answer as Record<string, unknown>).outcome;
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) {
    return null;
  }

  const summary = (outcome as Record<string, unknown>).summary;
  return typeof summary === 'string' && summary.length > 0
    ? summary
    : null;
}

function assertNever(
  value: never,
): never {
  throw new Error(`Unexpected hosted CLI mode: ${JSON.stringify(value)}`);
}

function requireSessionId(
  sessionId: string | undefined,
  topic: string,
): string {
  if (!sessionId) {
    throw new Error(`Usage: pnpm source-analysis ${topic} --session-id <id>`);
  }
  return sessionId;
}

async function runHostManagementCli(
  args: readonly string[],
): Promise<number> {
  const rawArgs = [...args];
  const json = rawArgs.includes('--json');
  if (json) {
    rawArgs.splice(rawArgs.indexOf('--json'), 1);
  }
  const topic = rawArgs[0] ?? 'status';

  switch (topic) {
    case 'start': {
      const status = await ensureHostServiceRunning();
      process.stdout.write(`${json ? JSON.stringify(status, null, 2) : renderHostStatus(status)}\n`);
      return status.running ? 0 : 1;
    }
    case 'status': {
      const status = await inspectHostServiceStatus();
      process.stdout.write(`${json ? JSON.stringify(status, null, 2) : renderHostStatus(status)}\n`);
      return status.running ? 0 : 1;
    }
    case 'stop': {
      const status = await stopHostService();
      process.stdout.write(`${json ? JSON.stringify(status, null, 2) : renderHostStatus(status)}\n`);
      return status.stopped ? 0 : 1;
    }
    default:
      throw new Error(`Unknown host topic: ${topic}`);
  }
}

function renderHostStatus(
  status: Awaited<ReturnType<typeof inspectHostServiceStatus>>,
): string {
  if (!status.running) {
    return `Host service is not running (${status.endpoint}).`;
  }
  return `Host service running at ${status.endpoint} (pid ${status.pid ?? 'unknown'}, sessions ${status.sessionCount ?? 0}).`;
}
