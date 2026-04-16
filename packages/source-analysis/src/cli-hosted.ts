import { createSnapshotHostRuntime } from './host/runtime.js';
import type {
  DescribeProfileResult,
  HostCommandEnvelope,
  HostCommandInvocation,
  HostCommandName,
  HostRenderedView,
} from './host/types.js';
import type { InquiryFamilyId } from './inquiry-catalog.js';
import type { ConsumerKind } from './inquiry-policy.js';
import type { FocusKind, ReadMode } from './inquiry-model.js';

const HOSTED_CLI_MODES = ['describe', 'plan', 'ask'] as const;

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
}

export function isHostedCliMode(
  value: string | undefined,
): value is HostedCliMode {
  return Boolean(value && HOSTED_CLI_MODES.includes(value as HostedCliMode));
}

export function runHostedCli(
  argv: readonly string[],
): number {
  const args = [...argv];
  const mode = args.shift();

  if (!isHostedCliMode(mode)) {
    throw new Error(`Unsupported hosted CLI mode: ${String(mode)}`);
  }

  const runtime = createSnapshotHostRuntime();
  const common = parseCommonArgs(args);
  const invocation = buildInvocation(mode, args, common);
  const envelope = runtime.execute(invocation as HostCommandInvocation<HostCommandName>);

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

function buildInvocation(
  mode: HostedCliMode,
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
