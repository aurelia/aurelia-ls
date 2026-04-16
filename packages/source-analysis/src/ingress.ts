import type { SourceAnalysisAnswerCard, SourceAnalysisAnswerRef } from './answer-card.js';
import { createStructuredSourceAnalysisAnswerCard } from './answer-card.js';
import { createSourceAnalysisAnswerDocument } from './answer-document.js';
import { createSourceAnalysisAnswerEnvelope } from './answer-envelope.js';
import type {
  SourceAnalysisCapabilityCatalog,
  SourceAnalysisCapabilityDescriptor,
  SourceAnalysisCapabilityMatch,
  SourceAnalysisCapabilityMatchReason,
  SourceAnalysisCapabilityView,
} from './capability-catalog.js';
import { createDefaultSourceAnalysisCapabilityCatalog } from './capability-catalog.js';
import type { SourceAnalysisConsumerKind } from './inquiry-policy.js';
import { resolveSourceAnalysisInquiryPolicy } from './inquiry-policy.js';
import type {
  SourceAnalysisIngressFocusHints,
  SourceAnalysisIngressHintDetail,
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
  SourceAnalysisClosureBasis,
  SourceAnalysisContinuation,
  SourceAnalysisIssue,
  SourceAnalysisTrustProfile,
} from './outcome-algebra.js';
import type {
  SourceAnalysisAnswer,
  SourceAnalysisFocusKind,
  SourceAnalysisFocusRef,
  SourceAnalysisQuery,
  SourceAnalysisReadMode,
  SourceAnalysisWorldFrame,
} from './query-model.js';

export const SOURCE_ANALYSIS_CAPABILITY_PLAN_STATUSES = [
  'ready',
  'needs-input',
  'ambiguous',
  'no-match',
] as const;

export const SOURCE_ANALYSIS_CAPABILITY_REPAIR_STATUSES = [
  'ready',
  'repaired',
  'needs-input',
  'no-match',
] as const;

export const SOURCE_ANALYSIS_CAPABILITY_PLAN_REASON_KINDS = [
  'match',
  'input',
  'focus-inference',
  'missing-input',
  'repair',
  'alternative',
] as const;

export type SourceAnalysisCapabilityPlanStatus =
  typeof SOURCE_ANALYSIS_CAPABILITY_PLAN_STATUSES[number];

export type SourceAnalysisCapabilityRepairStatus =
  typeof SOURCE_ANALYSIS_CAPABILITY_REPAIR_STATUSES[number];

export type SourceAnalysisCapabilityPlanReasonKind =
  typeof SOURCE_ANALYSIS_CAPABILITY_PLAN_REASON_KINDS[number];

export type SourceAnalysisCapabilityRef =
  SourceAnalysisAnswerRef & { readonly kind: 'capability' | 'repo' };

export interface SourceAnalysisPlannedInvocation {
  readonly command: string;
  readonly args: Record<string, unknown>;
}

export interface SourceAnalysisCapabilityPlanReason {
  readonly kind: SourceAnalysisCapabilityPlanReasonKind;
  readonly detail: string;
}

export interface SourceAnalysisCommandRepair {
  readonly kind: 'command' | 'args' | 'missing-input' | 'alternative';
  readonly detail: string;
  readonly from?: string;
  readonly to?: string;
}

export interface SourceAnalysisCapabilityDiscoveryOptions {
  readonly question?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly includeExamples?: boolean;
  readonly topK?: number;
  readonly readMode?: SourceAnalysisReadMode;
  readonly consumer?: SourceAnalysisConsumerKind;
  readonly worldFrame?: SourceAnalysisWorldFrame;
}

export interface SourceAnalysisCapabilityPlanOptions {
  readonly question: string;
  readonly sessionId?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly focusValue?: string;
  readonly readMode?: SourceAnalysisReadMode;
  readonly consumer?: SourceAnalysisConsumerKind;
  readonly worldFrame?: SourceAnalysisWorldFrame;
}

export interface SourceAnalysisCapabilityRepairOptions {
  readonly command?: string;
  readonly args?: Record<string, unknown>;
  readonly question?: string;
  readonly readMode?: SourceAnalysisReadMode;
  readonly consumer?: SourceAnalysisConsumerKind;
  readonly worldFrame?: SourceAnalysisWorldFrame;
}

export interface SourceAnalysisCapabilityDiscoveryValue
  extends SourceAnalysisAnswerCard<SourceAnalysisCapabilityRef> {
  readonly capabilities: readonly SourceAnalysisCapabilityView[];
  readonly matches: readonly SourceAnalysisCapabilityMatch[];
}

export interface SourceAnalysisCapabilityPlanValue
  extends SourceAnalysisAnswerCard<SourceAnalysisCapabilityRef> {
  readonly status: SourceAnalysisCapabilityPlanStatus;
  readonly capability?: SourceAnalysisCapabilityView;
  readonly invocation?: SourceAnalysisPlannedInvocation;
  readonly alternatives: readonly SourceAnalysisCapabilityView[];
  readonly reasons: readonly SourceAnalysisCapabilityPlanReason[];
  readonly missingInputs: readonly string[];
}

export interface SourceAnalysisCapabilityRepairValue
  extends SourceAnalysisAnswerCard<SourceAnalysisCapabilityRef> {
  readonly status: SourceAnalysisCapabilityRepairStatus;
  readonly capability?: SourceAnalysisCapabilityView;
  readonly invocation?: SourceAnalysisPlannedInvocation;
  readonly repairs: readonly SourceAnalysisCommandRepair[];
  readonly alternatives: readonly SourceAnalysisCapabilityView[];
  readonly reasons: readonly SourceAnalysisCapabilityPlanReason[];
  readonly missingInputs: readonly string[];
}

type FocusHints = SourceAnalysisIngressFocusHints;

interface BuiltInvocation {
  readonly status: 'ready' | 'needs-input';
  readonly invocation?: SourceAnalysisPlannedInvocation;
  readonly missingInputs: readonly string[];
  readonly reasons: readonly SourceAnalysisCapabilityPlanReason[];
}

export class SourceAnalysisCapabilityIngress {
  readonly #catalog: SourceAnalysisCapabilityCatalog;

  constructor(catalog = createDefaultSourceAnalysisCapabilityCatalog()) {
    this.#catalog = catalog;
  }

  get catalog(): SourceAnalysisCapabilityCatalog {
    return this.#catalog;
  }

  createDiscoveryAnswer(
    options: SourceAnalysisCapabilityDiscoveryOptions = {},
  ): SourceAnalysisAnswer<SourceAnalysisCapabilityDiscoveryValue> {
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
    const query: SourceAnalysisQuery = {
      inquiryEpisode: 'orient-and-localize',
      focusRef: repoFocusRef('source-analysis-capabilities'),
      questionRoute: 'search',
      readMode,
      worldFrame,
    };
    const policy = resolveSourceAnalysisInquiryPolicy(query, {
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
    const summaryLine = options.question
      ? (capabilities.length > 0
        ? `The best capability matches for "${options.question}" start with ${topCapability?.command ?? 'describe.capabilities'}.`
        : `No direct capability match closed on "${options.question}", so the catalog is shown instead.`)
      : `The catalog currently exposes ${capabilities.length} source-analysis capabilities.`;
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisCapabilityRef>([
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
      {
        kind: 'ref-list',
        importance: 'detail',
        refs: relatedRefs,
      },
    ]);
    const value = createStructuredSourceAnalysisAnswerCard({
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
    return createSourceAnalysisAnswerEnvelope({
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
    options: SourceAnalysisCapabilityPlanOptions,
  ): SourceAnalysisAnswer<SourceAnalysisCapabilityPlanValue> {
    const matches = this.#catalog.discover({
      question: options.question,
      focusKind: options.focusKind,
      topK: 5,
    });
    const readMode = options.readMode ?? 'focus-card';
    const worldFrame = options.worldFrame ?? defaultWorldFrame();
    const query: SourceAnalysisQuery = {
      inquiryEpisode: 'bounded-closure-explanation',
      focusRef: repoFocusRef('source-analysis-capability-plan'),
      questionRoute: 'route',
      readMode,
      worldFrame,
    };
    const policy = resolveSourceAnalysisInquiryPolicy(query, {
      focusKind: 'repo',
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      ...(options.consumer ? { consumer: options.consumer } : {}),
    });
    const hints = deriveFocusHints(options.question, options.focusKind, options.focusValue);
    const top = matches[0];
    const second = matches[1];
    const ambiguous = top && second ? compareMatchesForAmbiguity(top, second) : false;

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
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisCapabilityRef>([
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
    const value = createStructuredSourceAnalysisAnswerCard({
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
    return createSourceAnalysisAnswerEnvelope({
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
    options: SourceAnalysisCapabilityRepairOptions,
  ): SourceAnalysisAnswer<SourceAnalysisCapabilityRepairValue> {
    const readMode = options.readMode ?? 'focus-card';
    const worldFrame = options.worldFrame ?? defaultWorldFrame();
    const query: SourceAnalysisQuery = {
      inquiryEpisode: 'bounded-closure-explanation',
      focusRef: repoFocusRef('source-analysis-capability-repair'),
      questionRoute: 'route',
      readMode,
      worldFrame,
    };
    const policy = resolveSourceAnalysisInquiryPolicy(query, {
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
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisCapabilityRef>([
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
    const value = createStructuredSourceAnalysisAnswerCard({
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
    return createSourceAnalysisAnswerEnvelope({
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
    query: SourceAnalysisQuery,
    policy: ReturnType<typeof resolveSourceAnalysisInquiryPolicy>,
    question: string,
  ): SourceAnalysisAnswer<SourceAnalysisCapabilityPlanValue> {
    const capabilities = this.#catalog.list(false).slice(0, 4);
    const relatedRefs = capabilities.map((capability) => capabilityRef(capability.command, capability.label, capability.summary));
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisCapabilityRef>([
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
    const value = createStructuredSourceAnalysisAnswerCard({
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
      } satisfies Pick<SourceAnalysisCapabilityPlanValue, 'status' | 'alternatives' | 'reasons' | 'missingInputs'>,
    });
    return createSourceAnalysisAnswerEnvelope({
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
    query: SourceAnalysisQuery,
    policy: ReturnType<typeof resolveSourceAnalysisInquiryPolicy>,
    question: string,
    matches: readonly SourceAnalysisCapabilityMatch[],
  ): SourceAnalysisAnswer<SourceAnalysisCapabilityPlanValue> {
    const capabilities = matches.slice(0, 4).map((match) => match.capability);
    const relatedRefs = capabilities.map((capability) => capabilityRef(capability.command, capability.label, capability.summary));
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisCapabilityRef>([
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
    const value = createStructuredSourceAnalysisAnswerCard({
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
      } satisfies Pick<SourceAnalysisCapabilityPlanValue, 'status' | 'alternatives' | 'reasons' | 'missingInputs'>,
    });
    return createSourceAnalysisAnswerEnvelope({
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
    query: SourceAnalysisQuery,
    policy: ReturnType<typeof resolveSourceAnalysisInquiryPolicy>,
    command: string | undefined,
  ): SourceAnalysisAnswer<SourceAnalysisCapabilityRepairValue> {
    const capabilities = this.#catalog.list(false).slice(0, 4);
    const relatedRefs = capabilities.map((capability) => capabilityRef(capability.command, capability.label, capability.summary));
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisCapabilityRef>([
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
    const value = createStructuredSourceAnalysisAnswerCard({
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
      } satisfies Pick<SourceAnalysisCapabilityRepairValue, 'status' | 'repairs' | 'alternatives' | 'reasons' | 'missingInputs'>,
    });
    return createSourceAnalysisAnswerEnvelope({
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
  descriptor: SourceAnalysisCapabilityDescriptor,
  options: {
    readonly question: string;
    readonly sessionId?: string;
    readonly focusKind?: SourceAnalysisFocusKind;
    readonly focusValue?: string;
  },
  hints: FocusHints,
): BuiltInvocation {
  const reasons: SourceAnalysisCapabilityPlanReason[] = [];
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
  reasons: readonly SourceAnalysisCapabilityPlanReason[],
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
  reasons: readonly SourceAnalysisCapabilityPlanReason[],
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
  reasons: readonly SourceAnalysisCapabilityMatchReason[],
): readonly SourceAnalysisCommandRepair[] {
  const repairs: SourceAnalysisCommandRepair[] = [];

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
): SourceAnalysisCapabilityRepairStatus {
  if (!attemptedCommand) {
    return builtStatus === 'ready' ? 'repaired' : 'needs-input';
  }
  if (attemptedCommand === repairedCommand) {
    return builtStatus === 'ready' ? 'ready' : 'needs-input';
  }
  return builtStatus === 'ready' ? 'repaired' : 'needs-input';
}

function compareMatchesForAmbiguity(
  left: SourceAnalysisCapabilityMatch,
  right: SourceAnalysisCapabilityMatch,
): boolean {
  return left.exactCommand === right.exactCommand
    && left.aliasMatches.length === right.aliasMatches.length
    && left.nounMatches.length === right.nounMatches.length
    && left.verbMatches.length === right.verbMatches.length
    && left.routeMatches.length === right.routeMatches.length
    && left.focusMatched === right.focusMatched;
}

function repoFocusRef(value: string): SourceAnalysisFocusRef {
  return { kind: 'repo', value };
}

function capabilityRef(
  command: string,
  label: string,
  detail?: string,
): SourceAnalysisCapabilityRef {
  return {
    kind: 'capability',
    value: command,
    label,
    ...(detail ? { detail } : {}),
  };
}

function defaultWorldFrame(): SourceAnalysisWorldFrame {
  return {
    regimeAnchor: 'hosted',
    partiality: 'complete',
    freshness: 'live',
  };
}

function groundedTrust(summary: string): SourceAnalysisTrustProfile {
  return { kind: 'grounded', summary };
}

function qualifiedTrust(summary: string): SourceAnalysisTrustProfile {
  return { kind: 'qualified', summary };
}

function frontierTrust(summary: string): SourceAnalysisTrustProfile {
  return { kind: 'frontier', summary };
}

function capabilityProvenance() {
  return [{
    kind: 'host' as const,
    label: 'Declared capability ingress catalog',
    detail: 'Discovery, planning, and repair are derived from declared capability descriptors.',
  }];
}

function discoveryClosureBasis(): readonly SourceAnalysisClosureBasis[] {
  return [{
    kind: 'route',
    summary: 'Capability discovery is derived from the declared ingress catalog.',
    provenanceRefs: ['source-analysis:capability-catalog'],
  }];
}

function capabilityClosureBasis(command: string): readonly SourceAnalysisClosureBasis[] {
  return [{
    kind: 'route',
    summary: `The invocation is shaped by the declared capability descriptor for ${command}.`,
    provenanceRefs: [command],
  }];
}

function toPlanReason(reason: SourceAnalysisCapabilityMatchReason): SourceAnalysisCapabilityPlanReason {
  return {
    kind: 'match',
    detail: reason.detail,
  };
}

function toHintPlanReason(reason: SourceAnalysisIngressHintDetail): SourceAnalysisCapabilityPlanReason {
  return {
    kind: reason.kind,
    detail: reason.detail,
  };
}

function planContinuations(
  command: string,
  missingInputs: readonly string[],
): readonly SourceAnalysisContinuation[] {
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

export function createSourceAnalysisCapabilityIngress(
  catalog?: SourceAnalysisCapabilityCatalog,
): SourceAnalysisCapabilityIngress {
  return new SourceAnalysisCapabilityIngress(catalog);
}
