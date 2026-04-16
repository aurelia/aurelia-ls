import type { AnswerCard, AnswerRef } from './answer-card.js';
import { createStructuredAnswerCard } from './answer-card.js';
import { createAnswerDocument } from './answer-document.js';
import { createAnswerEnvelope } from './answer-envelope.js';
import type {
  CapabilityCatalog,
  CapabilityDescriptor,
  CapabilityMatch,
  CapabilityMatchReason,
  CapabilityView,
} from './capability-catalog.js';
import { createDefaultCapabilityCatalog } from './capability-catalog.js';
import type { ConsumerKind } from './inquiry-policy.js';
import { resolveInquiryPolicy } from './inquiry-policy.js';
import type {
  IngressFocusHints,
  IngressHintDetail,
} from './ingress-hints.js';
import {
  asFocusKind,
  asString,
  deriveFocusHints,
  deriveRepairHints,
  describeFocusHints,
  extractRepoPath,
  inferFocusKindFromArgs,
} from './ingress-hints.js';
import type {
  ClosureBasis,
  Continuation,
  Issue,
  TrustProfile,
} from './outcome-algebra.js';
import type {
  InquiryAnswer,
  FocusKind,
  FocusRef,
  Inquiry,
  ReadMode,
  WorldFrame,
} from './inquiry-model.js';

export const CAPABILITY_PLAN_STATUSES = [
  'ready',
  'needs-input',
  'ambiguous',
  'no-match',
] as const;

export const CAPABILITY_REPAIR_STATUSES = [
  'ready',
  'repaired',
  'needs-input',
  'no-match',
] as const;

export const CAPABILITY_PLAN_REASON_KINDS = [
  'match',
  'input',
  'focus-inference',
  'missing-input',
  'repair',
  'alternative',
] as const;

export type CapabilityPlanStatus =
  typeof CAPABILITY_PLAN_STATUSES[number];

export type CapabilityRepairStatus =
  typeof CAPABILITY_REPAIR_STATUSES[number];

export type CapabilityPlanReasonKind =
  typeof CAPABILITY_PLAN_REASON_KINDS[number];

export type CapabilityRef =
  AnswerRef & { readonly kind: 'capability' | 'repo' };

export interface PlannedInvocation {
  readonly command: string;
  readonly args: Record<string, unknown>;
}

export interface CapabilityPlanReason {
  readonly kind: CapabilityPlanReasonKind;
  readonly detail: string;
}

export interface CommandRepair {
  readonly kind: 'command' | 'args' | 'missing-input' | 'alternative';
  readonly detail: string;
  readonly from?: string;
  readonly to?: string;
}

export interface CapabilityDiscoveryOptions {
  readonly question?: string;
  readonly focusKind?: FocusKind;
  readonly includeExamples?: boolean;
  readonly topK?: number;
  readonly readMode?: ReadMode;
  readonly consumer?: ConsumerKind;
  readonly worldFrame?: WorldFrame;
}

export interface CapabilityPlanOptions {
  readonly question: string;
  readonly sessionId?: string;
  readonly focusKind?: FocusKind;
  readonly focusValue?: string;
  readonly readMode?: ReadMode;
  readonly consumer?: ConsumerKind;
  readonly worldFrame?: WorldFrame;
}

export interface CapabilityRepairOptions {
  readonly command?: string;
  readonly args?: Record<string, unknown>;
  readonly question?: string;
  readonly readMode?: ReadMode;
  readonly consumer?: ConsumerKind;
  readonly worldFrame?: WorldFrame;
}

export interface CapabilityDiscoveryValue
  extends AnswerCard<CapabilityRef> {
  readonly capabilities: readonly CapabilityView[];
  readonly matches: readonly CapabilityMatch[];
}

export interface CapabilityPlanValue
  extends AnswerCard<CapabilityRef> {
  readonly status: CapabilityPlanStatus;
  readonly capability?: CapabilityView;
  readonly invocation?: PlannedInvocation;
  readonly alternatives: readonly CapabilityView[];
  readonly reasons: readonly CapabilityPlanReason[];
  readonly missingInputs: readonly string[];
}

export interface CapabilityRepairValue
  extends AnswerCard<CapabilityRef> {
  readonly status: CapabilityRepairStatus;
  readonly capability?: CapabilityView;
  readonly invocation?: PlannedInvocation;
  readonly repairs: readonly CommandRepair[];
  readonly alternatives: readonly CapabilityView[];
  readonly reasons: readonly CapabilityPlanReason[];
  readonly missingInputs: readonly string[];
}

type FocusHints = IngressFocusHints;

interface BuiltInvocation {
  readonly status: 'ready' | 'needs-input';
  readonly invocation?: PlannedInvocation;
  readonly missingInputs: readonly string[];
  readonly reasons: readonly CapabilityPlanReason[];
}

export class CapabilityIngress {
  readonly #catalog: CapabilityCatalog;

  constructor(catalog = createDefaultCapabilityCatalog()) {
    this.#catalog = catalog;
  }

  get catalog(): CapabilityCatalog {
    return this.#catalog;
  }

  createDiscoveryAnswer(
    options: CapabilityDiscoveryOptions = {},
  ): InquiryAnswer<CapabilityDiscoveryValue> {
    const matches = this.#catalog.discover({
      question: options.question,
      focusKind: options.focusKind,
      includeExamples: options.includeExamples,
      topK: options.topK ?? 6,
    });
    const capabilities = matches.length > 0
      ? matches.map((match) => match.capability)
      : this.#catalog.list(options.includeExamples).slice(0, options.topK ?? 6);
    const readMode = options.readMode ?? 'summary-card';
    const worldFrame = options.worldFrame ?? defaultWorldFrame();
    const query: Inquiry = {
      inquiryEpisode: 'orient-and-localize',
      focusRef: repoFocusRef('source-analysis-capabilities'),
      questionRoute: 'search',
      readMode,
      worldFrame,
    };
    const policy = resolveInquiryPolicy(query, {
      focusKind: 'repo',
      inquiryEpisode: 'orient-and-localize',
      readMode,
      ...(options.consumer ? { consumer: options.consumer } : {}),
    });
    const primaryRef = capabilityRef(capabilities[0]?.command ?? 'describe.capabilities', capabilities[0]?.label ?? 'source-analysis capabilities');
    const relatedRefs = capabilities.map((capability) => capabilityRef(capability.command, capability.label, capability.summary));
    const title = options.question
      ? 'Source-analysis capability matches'
      : 'Source-analysis capability catalog';
    const topCapability = capabilities[0];
    const topMatch = matches[0];
    const summaryLine = options.question
      ? (capabilities.length > 0
        ? `The best capability matches for "${options.question}" start with ${topCapability?.command ?? 'describe.capabilities'}.`
        : `No direct capability match closed on "${options.question}", so the catalog is shown instead.`)
      : `The catalog currently exposes ${capabilities.length} source-analysis capabilities.`;
    const document = createAnswerDocument<CapabilityRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [summaryLine],
      },
      {
        kind: 'key-fact-list',
        importance: 'supporting',
        facts: [
          { label: 'capabilities', value: `${capabilities.length}` },
          { label: 'focus hint', value: options.focusKind ?? 'none' },
          { label: 'examples', value: options.includeExamples ? 'included' : 'omitted' },
        ],
      },
      {
        kind: 'bullet-list',
        importance: 'supporting',
        title: 'Capability matches',
        items: capabilities.map((capability) => `${capability.command}: ${capability.summary}`),
      },
      ...(topMatch && topMatch.reasons.length > 0 ? [{
        kind: 'bullet-list' as const,
        importance: 'supporting' as const,
        title: 'Why the top match fits',
        items: topMatch.reasons.slice(0, 6).map((reason) => reason.detail),
      }] : []),
      {
        kind: 'ref-list',
        importance: 'detail',
        refs: relatedRefs,
      },
    ]);
    const value = createStructuredAnswerCard({
      title,
      primaryRef,
      relatedRefs,
      document,
      policy,
      extra: {
        capabilities,
        matches,
      },
    });
    const tag = options.question && matches.length === 0 ? 'reroute' : 'hit';
    const trust = options.question && matches.length > 0
      ? qualifiedTrust('Capability discovery is grounded in the declared catalog plus question-term matching.')
      : groundedTrust('Capability discovery is reading the declared ingress catalog.');
    return createAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'orient-and-localize',
      readMode,
      worldFrame,
      tag,
      value,
      trust,
      closureBasis: discoveryClosureBasis(),
      issues: options.question && matches.length === 0
        ? [{
          code: 'capability-no-match',
          message: 'No capability matched the question directly; inspect the catalog or provide a stronger focus hint.',
          severity: 'warning',
          origin: 'query',
        }]
        : [],
      continuations: capabilities.slice(0, 2).map((capability) => ({
        kind: 'reroute',
        label: `Plan ${capability.command}`,
        description: `Use the planner to turn your question into ${capability.command}.`,
        targetQuestionRoute: 'route',
      })),
      provenance: capabilityProvenance(),
    });
  }

  createPlanAnswer(
    options: CapabilityPlanOptions,
  ): InquiryAnswer<CapabilityPlanValue> {
    const matches = this.#catalog.discover({
      question: options.question,
      focusKind: options.focusKind,
      topK: 5,
    });
    const readMode = options.readMode ?? 'focus-card';
    const worldFrame = options.worldFrame ?? defaultWorldFrame();
    const query: Inquiry = {
      inquiryEpisode: 'bounded-closure-explanation',
      focusRef: repoFocusRef('source-analysis-capability-plan'),
      questionRoute: 'route',
      readMode,
      worldFrame,
    };
    const policy = resolveInquiryPolicy(query, {
      focusKind: 'repo',
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      ...(options.consumer ? { consumer: options.consumer } : {}),
    });
    const hints = deriveFocusHints(options.question, options.focusKind, options.focusValue);
    const top = matches[0];
    const second = matches[1];
    const ambiguous = top && second ? this.#catalog.isAmbiguousTie(top, second) : false;

    if (!top) {
      return this.#createNoMatchPlanAnswer(query, policy, options.question);
    }
    if (ambiguous) {
      return this.#createAmbiguousPlanAnswer(query, policy, options.question, matches);
    }

    const descriptor = this.#catalog.resolve(top.capability.command);
    if (!descriptor) {
      return this.#createNoMatchPlanAnswer(query, policy, options.question);
    }

    const built = buildInvocation(descriptor, options, hints);
    const capability = top.capability;
    const relatedRefs = [
      capabilityRef(capability.command, capability.label, capability.summary),
      ...matches.slice(1, 4).map((match) => capabilityRef(match.capability.command, match.capability.label, match.capability.summary)),
    ];
    const document = createAnswerDocument<CapabilityRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [
          built.status === 'ready'
            ? `The question maps most directly to ${capability.command}.`
            : `The question most likely maps to ${capability.command}, but more input is still needed.`,
        ],
      },
      {
        kind: 'key-fact-list',
        importance: 'supporting',
        facts: [
          { label: 'selected command', value: capability.command },
          { label: 'session id', value: options.sessionId ?? 'missing' },
          { label: 'focus', value: describeFocusHints(hints) },
        ],
      },
      {
        kind: 'bullet-list',
        importance: 'supporting',
        title: 'Why this command fits',
        items: [
          ...top.reasons.map((reason) => reason.detail),
          ...built.reasons.map((reason) => reason.detail),
        ],
      },
      ...(built.missingInputs.length > 0 ? [{
        kind: 'bullet-list' as const,
        importance: 'supporting' as const,
        title: 'Missing inputs',
        items: built.missingInputs.map((missing) => `${missing} is still required.`),
      }] : []),
      {
        kind: 'ref-list',
        importance: 'detail',
        refs: relatedRefs,
      },
    ]);
    const value = createStructuredAnswerCard({
      title: 'Source-analysis invocation plan',
      primaryRef: capabilityRef(capability.command, capability.label, capability.summary),
      relatedRefs,
      document,
      policy,
      extra: {
        status: built.status,
        capability,
        ...(built.invocation ? { invocation: built.invocation } : {}),
        alternatives: matches.slice(1, 4).map((match) => match.capability),
        reasons: [
          ...top.reasons.map(toPlanReason),
          ...hints.reasons.map(toHintPlanReason),
          ...built.reasons,
        ],
        missingInputs: built.missingInputs,
      },
    });
    const tag = built.status === 'ready' ? 'hit' : 'open-boundary';
    const trust = built.status === 'ready'
      ? qualifiedTrust('The plan is derived from the declared capability catalog and explicit/inferred focus hints.')
      : frontierTrust('The command family is identified, but invocation closure still depends on missing input.');
    return createAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      worldFrame,
      tag,
      value,
      trust,
      closureBasis: capabilityClosureBasis(capability.command),
      issues: built.missingInputs.map((missing) => ({
        code: 'capability-missing-input',
        message: `${missing} is required before the invocation can execute honestly.`,
        severity: 'warning',
        origin: 'query',
      })),
      continuations: planContinuations(capability.command, built.missingInputs),
      provenance: capabilityProvenance(),
    });
  }

  createRepairAnswer(
    options: CapabilityRepairOptions,
  ): InquiryAnswer<CapabilityRepairValue> {
    const readMode = options.readMode ?? 'focus-card';
    const worldFrame = options.worldFrame ?? defaultWorldFrame();
    const query: Inquiry = {
      inquiryEpisode: 'bounded-closure-explanation',
      focusRef: repoFocusRef('source-analysis-capability-repair'),
      questionRoute: 'route',
      readMode,
      worldFrame,
    };
    const policy = resolveInquiryPolicy(query, {
      focusKind: 'repo',
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      ...(options.consumer ? { consumer: options.consumer } : {}),
    });
    const directDescriptor = options.command ? this.#catalog.resolve(options.command) : undefined;
    const fallbackMatches = this.#catalog.discover({
      question: options.question,
      command: options.command,
      focusKind: inferFocusKindFromArgs(options.args),
      topK: 4,
    });
    const match = directDescriptor
      ? fallbackMatches.find((candidate) => candidate.capability.command === directDescriptor.command) ?? fallbackMatches[0]
      : fallbackMatches[0];

    if (!match) {
      return this.#createNoRepairAnswer(query, policy, options.command);
    }

    const descriptor = this.#catalog.resolve(match.capability.command);
    if (!descriptor) {
      return this.#createNoRepairAnswer(query, policy, options.command);
    }

    const hints = deriveRepairHints(options.args, options.question);
    const built = buildInvocation(descriptor, {
      question: options.question ?? options.command ?? descriptor.command,
      sessionId: asString(options.args?.sessionId),
      focusKind: hints.focusKind,
      focusValue: hints.focusValue,
    }, hints);
    const repairs = collectRepairs(options.command, descriptor.command, options.args, built.missingInputs, match.reasons);
    const status = determineRepairStatus(options.command, descriptor.command, built.status);
    const capability = match.capability;
    const relatedRefs = [
      capabilityRef(capability.command, capability.label, capability.summary),
      ...fallbackMatches.slice(1, 4).map((candidate) => capabilityRef(candidate.capability.command, candidate.capability.label, candidate.capability.summary)),
    ];
    const document = createAnswerDocument<CapabilityRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [
          status === 'ready'
            ? `The attempted command already aligns with ${capability.command}.`
            : status === 'repaired'
              ? `The attempted command should be rerouted to ${capability.command}.`
              : `The attempted command is closest to ${capability.command}, but more input is still required.`,
        ],
      },
      {
        kind: 'finding-list',
        importance: 'supporting',
        findings: repairs.map((repair, index) => ({
          code: `repair-${index + 1}`,
          title: repair.kind,
          summary: repair.detail,
          severity: repair.kind === 'missing-input' ? 'warning' : 'info',
          trust: repair.kind === 'missing-input' ? 'frontier' : 'qualified',
          primaryRef: capabilityRef(capability.command, capability.label, capability.summary),
        })),
      },
      {
        kind: 'bullet-list',
        importance: 'supporting',
        title: 'Repair basis',
        items: [
          ...match.reasons.map((reason) => reason.detail),
          ...built.reasons.map((reason) => reason.detail),
        ],
      },
      {
        kind: 'ref-list',
        importance: 'detail',
        refs: relatedRefs,
      },
    ]);
    const value = createStructuredAnswerCard({
      title: 'Source-analysis invocation repair',
      primaryRef: capabilityRef(capability.command, capability.label, capability.summary),
      relatedRefs,
      document,
      policy,
      extra: {
        status,
        capability,
        ...(built.invocation ? { invocation: built.invocation } : {}),
        repairs,
        alternatives: fallbackMatches.slice(1, 4).map((candidate) => candidate.capability),
        reasons: [
          ...match.reasons.map(toPlanReason),
          ...hints.reasons.map(toHintPlanReason),
          ...built.reasons,
        ],
        missingInputs: built.missingInputs,
      },
    });
    const tag = status === 'ready' ? 'hit' : status === 'repaired' ? 'reroute' : 'open-boundary';
    const trust = status === 'ready'
      ? groundedTrust('Repair validation confirms the attempted command already fits the declared capability.')
      : qualifiedTrust('Repair suggestions are derived from the declared capability catalog and arg-shape reconciliation.');
    return createAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      worldFrame,
      tag,
      value,
      trust,
      closureBasis: capabilityClosureBasis(capability.command),
      issues: built.missingInputs.map((missing) => ({
        code: 'repair-missing-input',
        message: `${missing} is still required after repair.`,
        severity: 'warning',
        origin: 'query',
      })),
      continuations: planContinuations(capability.command, built.missingInputs),
      provenance: capabilityProvenance(),
    });
  }

  #createNoMatchPlanAnswer(
    query: Inquiry,
    policy: ReturnType<typeof resolveInquiryPolicy>,
    question: string,
  ): InquiryAnswer<CapabilityPlanValue> {
    const capabilities = this.#catalog.list(false).slice(0, 4);
    const relatedRefs = capabilities.map((capability) => capabilityRef(capability.command, capability.label, capability.summary));
    const document = createAnswerDocument<CapabilityRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [`No single declared capability closed on "${question}". Start with capability discovery instead.`],
      },
      {
        kind: 'bullet-list',
        importance: 'supporting',
        title: 'Fallback capabilities',
        items: capabilities.map((capability) => `${capability.command}: ${capability.summary}`),
      },
    ]);
    const value = createStructuredAnswerCard({
      title: 'Source-analysis invocation plan',
      primaryRef: capabilityRef('describe.capabilities', 'Describe source-analysis capabilities'),
      relatedRefs,
      document,
      policy,
      extra: {
        status: 'no-match',
        alternatives: capabilities,
        reasons: [{
          kind: 'alternative',
          detail: 'The current capability catalog did not produce a direct plan for this question.',
        }],
        missingInputs: [],
      } satisfies Pick<CapabilityPlanValue, 'status' | 'alternatives' | 'reasons' | 'missingInputs'>,
    });
    return createAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'bounded-closure-explanation',
      readMode: query.readMode ?? 'focus-card',
      worldFrame: query.worldFrame ?? defaultWorldFrame(),
      tag: 'reroute',
      value,
      trust: frontierTrust('No declared capability closed directly on the question.'),
      closureBasis: discoveryClosureBasis(),
      issues: [{
        code: 'capability-plan-no-match',
        message: 'No declared capability matched the question strongly enough to produce a canonical invocation.',
        severity: 'warning',
        origin: 'query',
      }],
      continuations: [{
        kind: 'reroute',
        label: 'Describe capabilities',
        description: 'Inspect the capability catalog and provide a stronger focus hint.',
        targetQuestionRoute: 'search',
      }],
      provenance: capabilityProvenance(),
    });
  }

  #createAmbiguousPlanAnswer(
    query: Inquiry,
    policy: ReturnType<typeof resolveInquiryPolicy>,
    question: string,
    matches: readonly CapabilityMatch[],
  ): InquiryAnswer<CapabilityPlanValue> {
    const capabilities = matches.slice(0, 4).map((match) => match.capability);
    const relatedRefs = capabilities.map((capability) => capabilityRef(capability.command, capability.label, capability.summary));
    const document = createAnswerDocument<CapabilityRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [`The question "${question}" matches more than one capability equally well.`],
      },
      {
        kind: 'bullet-list',
        importance: 'supporting',
        title: 'Ambiguous candidates',
        items: capabilities.map((capability) => `${capability.command}: ${capability.summary}`),
      },
    ]);
    const value = createStructuredAnswerCard({
      title: 'Source-analysis invocation plan',
      primaryRef: capabilityRef(capabilities[0]?.command ?? 'describe.capabilities', capabilities[0]?.label ?? 'Describe source-analysis capabilities'),
      relatedRefs,
      document,
      policy,
      extra: {
        status: 'ambiguous',
        alternatives: capabilities,
        reasons: matches[0]?.reasons.map(toPlanReason) ?? [],
        missingInputs: [],
      } satisfies Pick<CapabilityPlanValue, 'status' | 'alternatives' | 'reasons' | 'missingInputs'>,
    });
    return createAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'bounded-closure-explanation',
      readMode: query.readMode ?? 'focus-card',
      worldFrame: query.worldFrame ?? defaultWorldFrame(),
      tag: 'ambiguous',
      value,
      trust: frontierTrust('The question overlaps multiple declared capabilities at the same strength.'),
      closureBasis: discoveryClosureBasis(),
      issues: [{
        code: 'capability-plan-ambiguous',
        message: 'The question maps equally well to multiple capabilities; provide a stronger focus hint.',
        severity: 'warning',
        origin: 'query',
      }],
      continuations: capabilities.map((capability) => ({
        kind: 'narrow',
        label: `Narrow toward ${capability.command}`,
        description: capability.whenToUse,
        targetQuestionRoute: 'route',
      })),
      provenance: capabilityProvenance(),
    });
  }

  #createNoRepairAnswer(
    query: Inquiry,
    policy: ReturnType<typeof resolveInquiryPolicy>,
    command: string | undefined,
  ): InquiryAnswer<CapabilityRepairValue> {
    const capabilities = this.#catalog.list(false).slice(0, 4);
    const relatedRefs = capabilities.map((capability) => capabilityRef(capability.command, capability.label, capability.summary));
    const document = createAnswerDocument<CapabilityRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [command
          ? `No declared capability could repair "${command}" directly.`
          : 'No attempted command was supplied for repair.'],
      },
      {
        kind: 'bullet-list',
        importance: 'supporting',
        title: 'Fallback capabilities',
        items: capabilities.map((capability) => `${capability.command}: ${capability.summary}`),
      },
    ]);
    const value = createStructuredAnswerCard({
      title: 'Source-analysis invocation repair',
      primaryRef: capabilityRef('describe.capabilities', 'Describe source-analysis capabilities'),
      relatedRefs,
      document,
      policy,
      extra: {
        status: 'no-match',
        repairs: command ? [{
          kind: 'alternative',
          detail: `The attempted command "${command}" does not line up with a declared capability yet.`,
          from: command,
        }] : [{
          kind: 'missing-input',
          detail: 'A command name or question is required before repair can close.',
        }],
        alternatives: capabilities,
        reasons: [],
        missingInputs: command ? [] : ['command or question'],
      } satisfies Pick<CapabilityRepairValue, 'status' | 'repairs' | 'alternatives' | 'reasons' | 'missingInputs'>,
    });
    return createAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'bounded-closure-explanation',
      readMode: query.readMode ?? 'focus-card',
      worldFrame: query.worldFrame ?? defaultWorldFrame(),
      tag: 'reroute',
      value,
      trust: frontierTrust('Repair could not map the attempted command to a declared capability.'),
      closureBasis: discoveryClosureBasis(),
      issues: [{
        code: 'capability-repair-no-match',
        message: 'The attempted command did not map cleanly onto the declared capability catalog.',
        severity: 'warning',
        origin: 'query',
      }],
      continuations: [{
        kind: 'reroute',
        label: 'Describe capabilities',
        description: 'Inspect the capability catalog before trying another command shape.',
        targetQuestionRoute: 'search',
      }],
      provenance: capabilityProvenance(),
    });
  }
}

function buildInvocation(
  descriptor: CapabilityDescriptor,
  options: {
    readonly question: string;
    readonly sessionId?: string;
    readonly focusKind?: FocusKind;
    readonly focusValue?: string;
  },
  hints: FocusHints,
): BuiltInvocation {
  const reasons: CapabilityPlanReason[] = [];
  const args: Record<string, unknown> = {};
  const missingInputs: string[] = [];

  switch (descriptor.plannerKind) {
    case 'discover':
      args.question = options.question;
      if (hints.focusKind) {
        args.focusKind = hints.focusKind;
      }
      return readyInvocation(descriptor.command, args, reasons);
    case 'plan':
      args.question = options.question;
      if (options.sessionId) {
        args.sessionId = options.sessionId;
      }
      if (options.focusKind && options.focusValue) {
        args.focusKind = options.focusKind;
        args.focusValue = options.focusValue;
      }
      return readyInvocation(descriptor.command, args, reasons);
    case 'repair':
      args.question = options.question;
      return readyInvocation(descriptor.command, args, reasons);
    case 'session-open': {
      const repoPath = extractRepoPath(options.question);
      if (!repoPath) {
        missingInputs.push('repoPath');
      } else {
        args.repoPath = repoPath;
        reasons.push({
          kind: 'focus-inference',
          detail: `Inferred repoPath "${repoPath}" from the question text.`,
        });
      }
      return finalizeInvocation(descriptor.command, args, reasons, missingInputs);
    }
    case 'session-close':
    case 'session-refresh':
    case 'materialize': {
      if (!options.sessionId) {
        missingInputs.push('sessionId');
      } else {
        args.sessionId = options.sessionId;
        reasons.push({
          kind: 'input',
          detail: `Using the provided sessionId "${options.sessionId}".`,
        });
      }
      return finalizeInvocation(descriptor.command, args, reasons, missingInputs);
    }
    case 'session-status':
      if (options.sessionId) {
        args.sessionId = options.sessionId;
        reasons.push({
          kind: 'input',
          detail: `Using the provided sessionId "${options.sessionId}".`,
        });
      }
      return readyInvocation(descriptor.command, args, reasons);
    case 'session-invalidate':
      if (!options.sessionId) {
        missingInputs.push('sessionId');
      } else {
        args.sessionId = options.sessionId;
        reasons.push({
          kind: 'input',
          detail: `Using the provided sessionId "${options.sessionId}".`,
        });
      }
      if (hints.focusKind === 'file' && hints.focusValue) {
        args.scope = 'files';
        args.files = [hints.focusValue];
        reasons.push({
          kind: 'focus-inference',
          detail: `Using "${hints.focusValue}" as a file-scoped invalidation target.`,
        });
      }
      return finalizeInvocation(descriptor.command, args, reasons, missingInputs);
    case 'navigate':
      if (!options.sessionId) {
        missingInputs.push('sessionId');
      } else {
        args.sessionId = options.sessionId;
        reasons.push({
          kind: 'input',
          detail: `Using the provided sessionId "${options.sessionId}".`,
        });
      }
      if (!hints.focusKind || !['package', 'file', 'type', 'export'].includes(hints.focusKind)) {
        missingInputs.push('focusKind');
      } else {
        args.focusKind = hints.focusKind;
      }
      if (!hints.focusValue) {
        missingInputs.push('focusValue');
      } else {
        args.focusValue = hints.focusValue;
        reasons.push({
          kind: 'focus-inference',
          detail: `Using "${hints.focusValue}" as the navigation focus.`,
        });
      }
      args.questionRoute = hints.focusKind === 'package' ? 'join' : 'route';
      return finalizeInvocation(descriptor.command, args, reasons, missingInputs);
    case 'kind-summary':
    case 'kind-snapshot':
      if (!options.sessionId) {
        missingInputs.push('sessionId');
      } else {
        args.sessionId = options.sessionId;
        reasons.push({
          kind: 'input',
          detail: `Using the provided sessionId "${options.sessionId}".`,
        });
      }
      return finalizeInvocation(descriptor.command, args, reasons, missingInputs);
    case 'package-audit':
      if (!options.sessionId) {
        missingInputs.push('sessionId');
      } else {
        args.sessionId = options.sessionId;
        reasons.push({
          kind: 'input',
          detail: `Using the provided sessionId "${options.sessionId}".`,
        });
      }
      if (!hints.packageName) {
        missingInputs.push('packageName');
      } else {
        args.packageName = hints.packageName;
        reasons.push({
          kind: 'focus-inference',
          detail: `Using "${hints.packageName}" as the package focus.`,
        });
      }
      return finalizeInvocation(descriptor.command, args, reasons, missingInputs);
    case 'route-witness':
      if (!options.sessionId) {
        missingInputs.push('sessionId');
      } else {
        args.sessionId = options.sessionId;
        reasons.push({
          kind: 'input',
          detail: `Using the provided sessionId "${options.sessionId}".`,
        });
      }
      if (!hints.focusKind || (hints.focusKind !== 'file' && hints.focusKind !== 'type')) {
        missingInputs.push('focusKind');
      } else {
        args.focusKind = hints.focusKind;
      }
      if (!hints.focusValue) {
        missingInputs.push('focusValue');
      } else {
        args.focusValue = hints.focusValue;
        reasons.push({
          kind: 'focus-inference',
          detail: `Using "${hints.focusValue}" as the ${hints.focusKind ?? 'focus'} target.`,
        });
      }
      return finalizeInvocation(descriptor.command, args, reasons, missingInputs);
    default:
      return finalizeInvocation(descriptor.command, args, reasons, ['unsupported planner kind']);
  }
}

function readyInvocation(
  command: string,
  args: Record<string, unknown>,
  reasons: readonly CapabilityPlanReason[],
): BuiltInvocation {
  return {
    status: 'ready',
    invocation: { command, args },
    missingInputs: [],
    reasons,
  };
}

function finalizeInvocation(
  command: string,
  args: Record<string, unknown>,
  reasons: readonly CapabilityPlanReason[],
  missingInputs: readonly string[],
): BuiltInvocation {
  if (missingInputs.length > 0) {
    return {
      status: 'needs-input',
      missingInputs,
      reasons: [
        ...reasons,
        ...missingInputs.map((missing) => ({
          kind: 'missing-input' as const,
          detail: `${missing} is still required to close the invocation shape.`,
        })),
      ],
    };
  }

  return {
    status: 'ready',
    invocation: { command, args },
    missingInputs: [],
    reasons,
  };
}

function collectRepairs(
  attemptedCommand: string | undefined,
  repairedCommand: string,
  attemptedArgs: Record<string, unknown> | undefined,
  missingInputs: readonly string[],
  reasons: readonly CapabilityMatchReason[],
): readonly CommandRepair[] {
  const repairs: CommandRepair[] = [];

  if (attemptedCommand && attemptedCommand !== repairedCommand) {
    repairs.push({
      kind: 'command',
      detail: `Reroute "${attemptedCommand}" to the declared command "${repairedCommand}".`,
      from: attemptedCommand,
      to: repairedCommand,
    });
  } else if (attemptedCommand) {
    repairs.push({
      kind: 'command',
      detail: `The attempted command already aligns with "${repairedCommand}".`,
      from: attemptedCommand,
      to: repairedCommand,
    });
  }

  if (attemptedArgs && Object.keys(attemptedArgs).length > 0) {
    repairs.push({
      kind: 'args',
      detail: `The attempted args were reinterpreted through the ${repairedCommand} capability contract.`,
    });
  }

  for (const missing of missingInputs) {
    repairs.push({
      kind: 'missing-input',
      detail: `${missing} is still required after command repair.`,
      to: missing,
    });
  }

  for (const reason of reasons.slice(0, 2)) {
    repairs.push({
      kind: 'alternative',
      detail: reason.detail,
    });
  }

  return repairs;
}

function determineRepairStatus(
  attemptedCommand: string | undefined,
  repairedCommand: string,
  builtStatus: BuiltInvocation['status'],
): CapabilityRepairStatus {
  if (!attemptedCommand) {
    return builtStatus === 'ready' ? 'repaired' : 'needs-input';
  }
  if (attemptedCommand === repairedCommand) {
    return builtStatus === 'ready' ? 'ready' : 'needs-input';
  }
  return builtStatus === 'ready' ? 'repaired' : 'needs-input';
}

function repoFocusRef(value: string): FocusRef {
  return { kind: 'repo', value };
}

function capabilityRef(
  command: string,
  label: string,
  detail?: string,
): CapabilityRef {
  return {
    kind: 'capability',
    value: command,
    label,
    ...(detail ? { detail } : {}),
  };
}

function defaultWorldFrame(): WorldFrame {
  return {
    regimeAnchor: 'hosted',
    partiality: 'complete',
    freshness: 'live',
  };
}

function groundedTrust(summary: string): TrustProfile {
  return { kind: 'grounded', summary };
}

function qualifiedTrust(summary: string): TrustProfile {
  return { kind: 'qualified', summary };
}

function frontierTrust(summary: string): TrustProfile {
  return { kind: 'frontier', summary };
}

function capabilityProvenance() {
  return [{
    kind: 'host' as const,
    label: 'Declared capability ingress catalog',
    detail: 'Discovery, planning, and repair are derived from declared capability descriptors.',
  }];
}

function discoveryClosureBasis(): readonly ClosureBasis[] {
  return [{
    kind: 'route',
    summary: 'Capability discovery is derived from the declared ingress catalog.',
    provenanceRefs: ['source-analysis:capability-catalog'],
  }];
}

function capabilityClosureBasis(command: string): readonly ClosureBasis[] {
  return [{
    kind: 'route',
    summary: `The invocation is shaped by the declared capability descriptor for ${command}.`,
    provenanceRefs: [command],
  }];
}

function toPlanReason(reason: CapabilityMatchReason): CapabilityPlanReason {
  return {
    kind: 'match',
    detail: reason.detail,
  };
}

function toHintPlanReason(reason: IngressHintDetail): CapabilityPlanReason {
  return {
    kind: reason.kind,
    detail: reason.detail,
  };
}

function planContinuations(
  command: string,
  missingInputs: readonly string[],
): readonly Continuation[] {
  if (missingInputs.length > 0) {
    return [{
      kind: 'narrow',
      label: `Provide ${missingInputs.join(', ')}`,
      description: `The command ${command} needs ${missingInputs.join(', ')} before it can execute honestly.`,
      targetQuestionRoute: 'route',
    }];
  }

  return [{
    kind: 'reroute',
    label: `Run ${command}`,
    description: `Execute the canonical invocation for ${command}.`,
    targetQuestionRoute: 'route',
  }];
}

export function createCapabilityIngress(
  catalog?: CapabilityCatalog,
): CapabilityIngress {
  return new CapabilityIngress(catalog);
}
