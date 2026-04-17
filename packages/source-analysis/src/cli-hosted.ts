import type {
  DescribeProfileResult,
  HostCommandEnvelope,
  HostCommandInvocation,
  HostCommandName,
  HostRenderedView,
} from './host/types.js';
import type { SnapshotKind } from './snapshots.js';
import {
  ensureHostServiceRunning,
  executeHostServiceInvocation,
  inspectHostServiceStatus,
  stopHostService,
} from './host/service-client.js';
import type { InquiryFamilyId } from './inquiry-catalog.js';
import type { ConsumerKind } from './inquiry-policy.js';
import type { FocusKind, ReadMode } from './inquiry-model.js';

const HOSTED_CLI_MODES = ['describe', 'plan', 'ask', 'session', 'host'] as const;

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
  readonly focusKind?: FocusKind;
  readonly focusValue?: string;
  readonly familyId?: InquiryFamilyId;
  readonly includeExamples?: boolean;
  readonly topK?: number;
  readonly question?: string;
  readonly warmPrograms?: boolean;
  readonly force?: boolean;
  readonly kinds?: readonly SnapshotKind[];
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
  const envelope = await executeInvocation(mode, invocation as HostCommandInvocation<HostCommandName>);

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
  mode: Exclude<HostedCliMode, 'host'>,
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
    case 'plan':
      return buildPlanInvocation(remainingArgs, common);
    case 'ask':
      return buildAskInvocation(remainingArgs, common);
    case 'session':
      return buildSessionInvocation(remainingArgs, common);
    default:
      return assertNever(mode);
  }
}

function buildDescribeInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  if (!topic) {
    throw new Error('Usage: pnpm source-analysis describe <profile|inquiries|capabilities> [question]');
  }

  const question = common.question ?? (remainingArgs.slice(1).join(' ').trim() || undefined);
  switch (topic) {
    case 'profile':
      return {
        command: 'describe.profile',
        args: {
          repoPath: common.repoPath,
          target: common.target,
          profilePath: common.profilePath,
        },
      };
    case 'inquiries':
      return {
        command: 'describe.inquiries',
        args: {
          question,
          focusKind: common.focusKind,
          includeExamples: common.includeExamples,
          topK: common.topK,
          readMode: common.readMode,
          consumer: common.consumer,
          renderStyle: common.json ? 'json-document' : 'plain-text',
        },
      };
    case 'capabilities':
      return {
        command: 'describe.capabilities',
        args: {
          question,
          focusKind: common.focusKind,
          includeExamples: common.includeExamples,
          topK: common.topK,
          readMode: common.readMode,
          consumer: common.consumer,
          renderStyle: common.json ? 'json-document' : 'plain-text',
        },
      };
    default:
      throw new Error(`Unknown describe topic: ${topic}`);
  }
}

function buildPlanInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  const question = common.question ?? (remainingArgs.slice(1).join(' ').trim() || undefined);
  if (!topic || !question) {
    throw new Error('Usage: pnpm source-analysis plan <inquiry|question> <question>');
  }

  switch (topic) {
    case 'inquiry':
      return {
        command: 'plan.inquiry',
        args: {
          question,
          sessionId: common.sessionId,
          repoPath: common.repoPath,
          target: common.target,
          profilePath: common.profilePath,
          focusKind: common.focusKind,
          focusValue: common.focusValue,
          familyId: common.familyId,
          readMode: common.readMode,
          consumer: common.consumer,
          renderStyle: common.json ? 'json-document' : 'plain-text',
        },
      };
    case 'question':
      return {
        command: 'plan.question',
        args: {
          question,
          sessionId: common.sessionId,
          repoPath: common.repoPath,
          target: common.target,
          profilePath: common.profilePath,
          focusKind: common.focusKind,
          focusValue: common.focusValue,
          readMode: common.readMode,
          consumer: common.consumer,
          renderStyle: common.json ? 'json-document' : 'plain-text',
        },
      };
    default:
      throw new Error(`Unknown plan topic: ${topic}`);
  }
}

function buildAskInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<'ask.question'> {
  const question = common.question ?? (remainingArgs.join(' ').trim() || undefined);
  if (!question) {
    throw new Error('Usage: pnpm source-analysis ask <question>');
  }

  return {
    command: 'ask.question',
    args: {
      question,
      sessionId: common.sessionId,
      repoPath: common.repoPath,
      target: common.target,
      profilePath: common.profilePath,
      focusKind: common.focusKind,
      focusValue: common.focusValue,
      familyId: common.familyId,
      readMode: common.readMode,
      consumer: common.consumer,
      renderStyle: common.json ? 'json-document' : 'plain-text',
    },
  };
}

function buildSessionInvocation(
  remainingArgs: readonly string[],
  common: ParsedCommonArgs,
): HostCommandInvocation<HostCommandName> {
  const topic = remainingArgs[0];
  if (!topic) {
    throw new Error('Usage: pnpm source-analysis session <open|status|close|refresh>');
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
    case 'close': {
      const sessionId = requireSessionId(common.sessionId, 'session close');
      return {
        command: 'session.close',
        args: { sessionId },
      };
    }
    case 'refresh': {
      const sessionId = requireSessionId(common.sessionId, 'session refresh');
      return {
        command: 'session.refresh',
        args: {
          sessionId,
          ...(common.kinds && common.kinds.length > 0 ? { kinds: common.kinds } : {}),
          ...(common.force ? { force: true } : {}),
        },
      };
    }
    default:
      throw new Error(`Unknown session topic: ${topic}`);
  }
}

function parseCommonArgs(
  args: string[],
): ParsedCommonArgs {
  const json = takeBooleanFlag(args, '--json');
  const includeExamples = takeBooleanFlag(args, '--include-examples');
  const repoPath = takeOption(args, '--repo');
  const target = takeOption(args, '--target');
  const profilePath = takeOption(args, '--profile-path');
  const sessionId = takeOption(args, '--session-id');
  const readMode = takeOption(args, '--read-mode') as ReadMode | undefined;
  const consumer = takeOption(args, '--consumer') as ConsumerKind | undefined;
  const focusKind = takeOption(args, '--focus-kind') as FocusKind | undefined;
  const focusValue = takeOption(args, '--focus-value');
  const familyId = takeOption(args, '--family-id') as InquiryFamilyId | undefined;
  const topKRaw = takeOption(args, '--top-k');
  const questionFromFlag = takeOption(args, '--question');
  const warmPrograms = !takeBooleanFlag(args, '--cold');
  const force = takeBooleanFlag(args, '--force');
  const kinds = takeRepeatableKinds(args, '--kind');
  const topK = topKRaw ? Number(topKRaw) : undefined;

  if (topKRaw && !Number.isFinite(topK)) {
    throw new Error(`Invalid --top-k value: ${topKRaw}`);
  }

  return {
    json,
    ...(repoPath ? { repoPath } : {}),
    ...(target ? { target } : {}),
    ...(profilePath ? { profilePath } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(readMode ? { readMode } : {}),
    ...(consumer ? { consumer } : {}),
    ...(focusKind ? { focusKind } : {}),
    ...(focusValue ? { focusValue } : {}),
    ...(familyId ? { familyId } : {}),
    ...(includeExamples ? { includeExamples: true } : {}),
    ...(typeof topK === 'number' ? { topK } : {}),
    ...(questionFromFlag ? { question: questionFromFlag } : {}),
    ...(warmPrograms ? { warmPrograms: true } : { warmPrograms: false }),
    ...(force ? { force: true } : {}),
    ...(kinds.length > 0 ? { kinds } : {}),
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
  const common = parseCommonArgs(rawArgs);
  const topic = rawArgs[0] ?? 'status';

  switch (topic) {
    case 'start': {
      const status = await ensureHostServiceRunning();
      renderHostStatus(status, common.json);
      return status.running ? 0 : 1;
    }
    case 'status': {
      const status = await inspectHostServiceStatus();
      renderHostStatus(status, common.json);
      return status.running ? 0 : 1;
    }
    case 'stop': {
      const status = await stopHostService();
      renderHostStatus(status, common.json);
      return status.stopped || !status.running ? 0 : 1;
    }
    default:
      throw new Error('Usage: pnpm source-analysis host <start|status|stop> [--json]');
  }
}

function renderHostStatus(
  status: Awaited<ReturnType<typeof inspectHostServiceStatus>>,
  json: boolean,
): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
    return;
  }

  const lines = [
    `Running:      ${status.running ? 'yes' : 'no'}`,
    `Endpoint:     ${status.endpoint}`,
    ...(typeof status.pid === 'number' ? [`PID:          ${status.pid}`] : []),
    ...(typeof status.sessionCount === 'number' ? [`Sessions:     ${status.sessionCount}`] : []),
    ...(status.started ? ['Started:      yes'] : []),
    ...(status.stopped ? ['Stopped:      yes'] : []),
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}
