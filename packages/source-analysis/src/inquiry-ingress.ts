import type { SourceAnalysisAnswerCard, SourceAnalysisAnswerRef } from './answer-card.js';
import { createStructuredSourceAnalysisAnswerCard } from './answer-card.js';
import { createSourceAnalysisAnswerDocument } from './answer-document.js';
import { createSourceAnalysisAnswerEnvelope } from './answer-envelope.js';
import type { SourceAnalysisCapabilityCatalog } from './capability-catalog.js';
import { createDefaultSourceAnalysisCapabilityCatalog } from './capability-catalog.js';
import type {
  DiscoverSourceAnalysisInquiriesInput,
  SourceAnalysisInquiryCatalogDiagnostics,
  SourceAnalysisInquiryFamilyDescriptor,
  SourceAnalysisInquiryFamilyId,
  SourceAnalysisInquiryFamilyView,
  SourceAnalysisInquiryMatch,
  SourceAnalysisInquiryMatchReason,
  SourceAnalysisInquiryCatalog,
} from './inquiry-catalog.js';
import { createDefaultSourceAnalysisInquiryCatalog } from './inquiry-catalog.js';
import type { SourceAnalysisConsumerKind } from './inquiry-policy.js';
import { resolveSourceAnalysisInquiryPolicy } from './inquiry-policy.js';
import type {
  SourceAnalysisIngressFocusHints,
  SourceAnalysisIngressHintDetail,
} from './ingress-hints.js';
import {
  deriveFocusHints,
  extractRepoPath,
} from './ingress-hints.js';
import { matchTokens } from './ingress-language.js';
import type {
  SourceAnalysisClosureBasis,
  SourceAnalysisContinuation,
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

export const SOURCE_ANALYSIS_INQUIRY_PLAN_STATUSES = [
  'ready',
  'needs-input',
  'ambiguous',
  'no-match',
] as const;

export const SOURCE_ANALYSIS_INQUIRY_ASK_STATUSES = [
  'answered',
  'planned',
  'ambiguous',
  'no-match',
] as const;

export const SOURCE_ANALYSIS_INQUIRY_PLAN_REASON_KINDS = [
  'match',
  'input',
  'focus-inference',
  'missing-input',
  'alternative',
  'execution',
  'repair',
] as const;

export const SOURCE_ANALYSIS_INQUIRY_STEP_PHASES = [
  'prepare',
  'query',
  'guidance',
  'maintenance',
] as const;

export type SourceAnalysisInquiryPlanStatus =
  typeof SOURCE_ANALYSIS_INQUIRY_PLAN_STATUSES[number];

export type SourceAnalysisInquiryAskStatus =
  typeof SOURCE_ANALYSIS_INQUIRY_ASK_STATUSES[number];

export type SourceAnalysisInquiryPlanReasonKind =
  typeof SOURCE_ANALYSIS_INQUIRY_PLAN_REASON_KINDS[number];

export type SourceAnalysisInquiryStepPhase =
  typeof SOURCE_ANALYSIS_INQUIRY_STEP_PHASES[number];

export type SourceAnalysisInquiryRef =
  SourceAnalysisAnswerRef & { readonly kind: 'inquiry' | 'capability' | 'repo' };

export interface SourceAnalysisInquiryPlanReason {
  readonly kind: SourceAnalysisInquiryPlanReasonKind;
  readonly detail: string;
}

export interface SourceAnalysisInquiryPlanStep {
  readonly label: string;
  readonly summary: string;
  readonly phase: SourceAnalysisInquiryStepPhase;
  readonly command: string;
  readonly args: Record<string, unknown>;
  readonly required: boolean;
}

export interface SourceAnalysisInquiryExecutionSummary {
  readonly status: 'executed' | 'skipped' | 'failed';
  readonly command?: string;
  readonly sessionId?: string;
  readonly ephemeralSession: boolean;
  readonly facts: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly lines: readonly string[];
}

export interface SourceAnalysisResolvedInquiryPlan {
  readonly status: SourceAnalysisInquiryPlanStatus;
  readonly inquiry?: SourceAnalysisInquiryFamilyView;
  readonly steps: readonly SourceAnalysisInquiryPlanStep[];
  readonly primaryStep?: SourceAnalysisInquiryPlanStep;
  readonly alternatives: readonly SourceAnalysisInquiryFamilyView[];
  readonly reasons: readonly SourceAnalysisInquiryPlanReason[];
  readonly missingInputs: readonly string[];
}

export interface SourceAnalysisInquiryDiscoveryOptions extends DiscoverSourceAnalysisInquiriesInput {
  readonly readMode?: SourceAnalysisReadMode;
  readonly consumer?: SourceAnalysisConsumerKind;
  readonly worldFrame?: SourceAnalysisWorldFrame;
}

export interface SourceAnalysisInquiryPlanOptions {
  readonly question: string;
  readonly sessionId?: string;
  readonly repoPath?: string;
  readonly target?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly focusValue?: string;
  readonly familyId?: SourceAnalysisInquiryFamilyId;
  readonly readMode?: SourceAnalysisReadMode;
  readonly consumer?: SourceAnalysisConsumerKind;
  readonly worldFrame?: SourceAnalysisWorldFrame;
}

export interface SourceAnalysisInquiryAskOptions extends SourceAnalysisInquiryPlanOptions {
  readonly plan: SourceAnalysisResolvedInquiryPlan;
  readonly execution?: SourceAnalysisInquiryExecutionSummary;
}

export interface SourceAnalysisInquiryDiscoveryValue
  extends SourceAnalysisAnswerCard<SourceAnalysisInquiryRef> {
  readonly inquiries: readonly SourceAnalysisInquiryFamilyView[];
  readonly matches: readonly SourceAnalysisInquiryMatch[];
  readonly diagnostics: SourceAnalysisInquiryCatalogDiagnostics;
}

export interface SourceAnalysisInquiryPlanValue
  extends SourceAnalysisAnswerCard<SourceAnalysisInquiryRef> {
  readonly status: SourceAnalysisInquiryPlanStatus;
  readonly inquiry?: SourceAnalysisInquiryFamilyView;
  readonly steps: readonly SourceAnalysisInquiryPlanStep[];
  readonly primaryStep?: SourceAnalysisInquiryPlanStep;
  readonly alternatives: readonly SourceAnalysisInquiryFamilyView[];
  readonly reasons: readonly SourceAnalysisInquiryPlanReason[];
  readonly missingInputs: readonly string[];
}

export interface SourceAnalysisInquiryAskValue
  extends SourceAnalysisAnswerCard<SourceAnalysisInquiryRef> {
  readonly status: SourceAnalysisInquiryAskStatus;
  readonly inquiry?: SourceAnalysisInquiryFamilyView;
  readonly steps: readonly SourceAnalysisInquiryPlanStep[];
  readonly primaryStep?: SourceAnalysisInquiryPlanStep;
  readonly alternatives: readonly SourceAnalysisInquiryFamilyView[];
  readonly reasons: readonly SourceAnalysisInquiryPlanReason[];
  readonly missingInputs: readonly string[];
  readonly execution?: SourceAnalysisInquiryExecutionSummary;
}

interface BuiltInquirySteps {
  readonly steps: readonly SourceAnalysisInquiryPlanStep[];
  readonly primaryStep?: SourceAnalysisInquiryPlanStep;
  readonly missingInputs: readonly string[];
  readonly reasons: readonly SourceAnalysisInquiryPlanReason[];
}

export class SourceAnalysisInquiryIngress {
  readonly #inquiries: SourceAnalysisInquiryCatalog;
  readonly #capabilities: SourceAnalysisCapabilityCatalog;

  constructor(
    inquiries = createDefaultSourceAnalysisInquiryCatalog(),
    capabilities = createDefaultSourceAnalysisCapabilityCatalog(),
  ) {
    this.#inquiries = inquiries;
    this.#capabilities = capabilities;
  }

  get inquiries(): SourceAnalysisInquiryCatalog {
    return this.#inquiries;
  }

  get capabilities(): SourceAnalysisCapabilityCatalog {
    return this.#capabilities;
  }

  diagnose(): SourceAnalysisInquiryCatalogDiagnostics {
    return this.#inquiries.diagnose(this.#capabilities);
  }

  plan(options: SourceAnalysisInquiryPlanOptions): SourceAnalysisResolvedInquiryPlan {
    const hints = deriveFocusHints(options.question, options.focusKind, options.focusValue);
    const matches = this.#inquiries.discover({
      question: options.question,
      focusKind: hints.focusKind ?? options.focusKind,
      familyId: options.familyId,
      topK: 5,
    });
    const top = matches[0];
    const second = matches[1];
    const ambiguous = top && second ? compareMatchesForAmbiguity(top, second) : false;

    if (!top) {
      return {
        status: 'no-match',
        steps: [],
        alternatives: this.#inquiries.list(false).slice(0, 4),
        reasons: [{
          kind: 'alternative',
          detail: 'No inquiry family matched the question strongly enough to produce a plan.',
        }],
        missingInputs: [],
      };
    }

    if (ambiguous) {
      return {
        status: 'ambiguous',
        inquiry: top.inquiry,
        steps: [],
        alternatives: matches.slice(0, 4).map((match) => match.inquiry),
        reasons: top.reasons.map(toPlanReason),
        missingInputs: [],
      };
    }

    const descriptor = this.#inquiries.resolve(top.inquiry.id);
    if (!descriptor) {
      return {
        status: 'no-match',
        steps: [],
        alternatives: this.#inquiries.list(false).slice(0, 4),
        reasons: [{
          kind: 'alternative',
          detail: `The inquiry family "${top.inquiry.id}" is no longer declared.`,
        }],
        missingInputs: [],
      };
    }

    const built = buildInquirySteps(descriptor, options, hints);
    return {
      status: built.missingInputs.length > 0 ? 'needs-input' : 'ready',
      inquiry: top.inquiry,
      steps: built.steps,
      ...(built.primaryStep ? { primaryStep: built.primaryStep } : {}),
      alternatives: matches.slice(1, 4).map((match) => match.inquiry),
      reasons: [
        ...top.reasons.map(toPlanReason),
        ...hints.reasons.map(toHintPlanReason),
        ...built.reasons,
      ],
      missingInputs: built.missingInputs,
    };
  }

  createDiscoveryAnswer(
    options: SourceAnalysisInquiryDiscoveryOptions = {},
  ): SourceAnalysisAnswer<SourceAnalysisInquiryDiscoveryValue> {
    const matches = this.#inquiries.discover({
      question: options.question,
      focusKind: options.focusKind,
      familyId: options.familyId,
      includeExamples: options.includeExamples,
      topK: options.topK ?? 6,
    });
    const inquiries = matches.length > 0
      ? matches.map((match) => match.inquiry)
      : this.#inquiries.list(options.includeExamples).slice(0, options.topK ?? 6);
    const diagnostics = this.diagnose();
    const readMode = options.readMode ?? 'summary-card';
    const worldFrame = options.worldFrame ?? defaultWorldFrame();
    const query: SourceAnalysisQuery = {
      inquiryEpisode: 'orient-and-localize',
      focusRef: inquiryFocusRef('source-analysis-inquiries'),
      questionRoute: 'search',
      readMode,
      worldFrame,
    };
    const policy = resolveSourceAnalysisInquiryPolicy(query, {
      focusKind: 'inquiry',
      inquiryEpisode: 'orient-and-localize',
      readMode,
      ...(options.consumer ? { consumer: options.consumer } : {}),
    });
    const relatedRefs = inquiries.map((inquiry) => inquiryRef(inquiry.id, inquiry.label, inquiry.summary));
    const topInquiry = inquiries[0];
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisInquiryRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [options.question
          ? (topInquiry
            ? `The best inquiry-family matches for "${options.question}" start with ${topInquiry.id}.`
            : `No inquiry family closed on "${options.question}", so the inquiry catalog is shown instead.`)
          : `The public ingress currently exposes ${inquiries.length} inquiry families.`],
      },
      {
        kind: 'key-fact-list',
        importance: 'supporting',
        facts: [
          { label: 'inquiry families', value: `${inquiries.length}` },
          { label: 'kernel commands covered', value: `${this.#capabilities.list(false).length - diagnostics.uncoveredCommands.length}` },
          { label: 'kernel commands uncovered', value: `${diagnostics.uncoveredCommands.length}` },
        ],
      },
      {
        kind: 'bullet-list',
        importance: 'supporting',
        title: 'Inquiry families',
        items: inquiries.map((inquiry) => `${inquiry.id}: ${inquiry.summary}`),
      },
      ...(diagnostics.uncoveredCommands.length > 0 ? [{
        kind: 'bullet-list' as const,
        importance: 'detail' as const,
        title: 'Uncovered kernel commands',
        items: diagnostics.uncoveredCommands.map((command) => `${command} is not routed through any inquiry family yet.`),
      }] : []),
      {
        kind: 'ref-list',
        importance: 'detail',
        refs: relatedRefs,
      },
    ]);
    const value = createStructuredSourceAnalysisAnswerCard({
      title: 'Source-analysis inquiry catalog',
      primaryRef: inquiryRef(topInquiry?.id ?? 'capability-guidance', topInquiry?.label ?? 'Capability guidance'),
      relatedRefs,
      document,
      policy,
      extra: {
        inquiries,
        matches,
        diagnostics,
      },
    });
    return createSourceAnalysisAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'orient-and-localize',
      readMode,
      worldFrame,
      tag: options.question && matches.length === 0 ? 'reroute' : 'hit',
      value,
      trust: groundedTrust('Inquiry discovery is reading the declared public inquiry-family catalog.'),
      closureBasis: inquiryClosureBasis('describe.inquiries'),
      issues: diagnostics.uncoveredCommands.length > 0
        ? [{
          code: 'inquiry-kernel-coverage-gap',
          message: `${diagnostics.uncoveredCommands.length} kernel commands are not yet covered by any inquiry family.`,
          severity: 'warning',
          origin: 'infrastructure',
        }]
        : [],
      continuations: inquiries.slice(0, 2).map((inquiry) => ({
        kind: 'reroute',
        label: `Plan ${inquiry.id}`,
        description: `Turn your question into an inquiry plan for ${inquiry.id}.`,
        targetQuestionRoute: 'route',
      })),
      provenance: inquiryProvenance(),
    });
  }

  createPlanAnswer(
    options: SourceAnalysisInquiryPlanOptions,
  ): SourceAnalysisAnswer<SourceAnalysisInquiryPlanValue> {
    const plan = this.plan(options);
    const readMode = options.readMode ?? 'focus-card';
    const worldFrame = options.worldFrame ?? defaultWorldFrame(options.repoPath, options.target);
    const query: SourceAnalysisQuery = {
      inquiryEpisode: 'bounded-closure-explanation',
      focusRef: inquiryFocusRef('source-analysis-inquiry-plan'),
      questionRoute: 'route',
      readMode,
      worldFrame,
    };
    const policy = resolveSourceAnalysisInquiryPolicy(query, {
      focusKind: 'inquiry',
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      ...(options.consumer ? { consumer: options.consumer } : {}),
    });
    const relatedRefs = [
      ...(plan.inquiry ? [inquiryRef(plan.inquiry.id, plan.inquiry.label, plan.inquiry.summary)] : []),
      ...plan.alternatives.map((inquiry) => inquiryRef(inquiry.id, inquiry.label, inquiry.summary)),
      ...plan.steps.map((step) => capabilityRef(step.command, step.label, step.summary)),
    ];
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisInquiryRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [describePlanStatus(plan)],
      },
      {
        kind: 'key-fact-list',
        importance: 'supporting',
        facts: [
          { label: 'selected inquiry', value: plan.inquiry?.id ?? 'none' },
          { label: 'steps', value: `${plan.steps.length}` },
          { label: 'missing inputs', value: plan.missingInputs.length > 0 ? plan.missingInputs.join(', ') : 'none' },
        ],
      },
      ...(plan.reasons.length > 0 ? [{
        kind: 'bullet-list' as const,
        importance: 'supporting' as const,
        title: 'Planning basis',
        items: plan.reasons.map((reason) => reason.detail),
      }] : []),
      ...(plan.steps.length > 0 ? [{
        kind: 'bullet-list' as const,
        importance: 'supporting' as const,
        title: 'Planned steps',
        items: plan.steps.map((step) => `${step.command}: ${step.summary}`),
      }] : []),
      {
        kind: 'ref-list',
        importance: 'detail',
        refs: dedupeRefs(relatedRefs),
      },
    ]);
    const value = createStructuredSourceAnalysisAnswerCard({
      title: 'Source-analysis inquiry plan',
      primaryRef: plan.inquiry
        ? inquiryRef(plan.inquiry.id, plan.inquiry.label, plan.inquiry.summary)
        : inquiryRef('capability-guidance', 'Capability guidance'),
      relatedRefs: dedupeRefs(relatedRefs),
      document,
      policy,
      extra: plan,
    });
    return createSourceAnalysisAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      worldFrame,
      tag: plan.status === 'ready' ? 'hit' : plan.status === 'no-match' ? 'reroute' : plan.status === 'ambiguous' ? 'ambiguous' : 'open-boundary',
      value,
      trust: plan.status === 'ready'
        ? qualifiedTrust('The plan is derived from the declared inquiry families plus contextual focus inference.')
        : frontierTrust('The inquiry family is identified, but execution still depends on missing input or narrowing.'),
      closureBasis: inquiryClosureBasis(plan.inquiry?.id ?? 'capability-guidance'),
      issues: plan.missingInputs.map((missing) => ({
        code: 'inquiry-missing-input',
        message: `${missing} is still required before this inquiry can execute honestly.`,
        severity: 'warning',
        origin: 'query',
      })),
      continuations: inquiryContinuations(plan),
      provenance: inquiryProvenance(),
    });
  }

  createAskAnswer(
    options: SourceAnalysisInquiryAskOptions,
  ): SourceAnalysisAnswer<SourceAnalysisInquiryAskValue> {
    const readMode = options.readMode ?? 'focus-card';
    const worldFrame = options.worldFrame ?? defaultWorldFrame(options.repoPath, options.target);
    const query: SourceAnalysisQuery = {
      inquiryEpisode: 'bounded-closure-explanation',
      focusRef: inquiryFocusRef('source-analysis-ask-question'),
      questionRoute: 'route',
      readMode,
      worldFrame,
    };
    const policy = resolveSourceAnalysisInquiryPolicy(query, {
      focusKind: 'inquiry',
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      ...(options.consumer ? { consumer: options.consumer } : {}),
    });
    const plan = options.plan;
    const relatedRefs = [
      ...(plan.inquiry ? [inquiryRef(plan.inquiry.id, plan.inquiry.label, plan.inquiry.summary)] : []),
      ...plan.alternatives.map((inquiry) => inquiryRef(inquiry.id, inquiry.label, inquiry.summary)),
      ...plan.steps.map((step) => capabilityRef(step.command, step.label, step.summary)),
    ];
    const askStatus = resolveAskStatus(plan, options.execution);
    const document = createSourceAnalysisAnswerDocument<SourceAnalysisInquiryRef>([
      {
        kind: 'paragraph',
        importance: 'primary',
        lines: [describeAskStatus(askStatus, plan, options.execution)],
      },
      {
        kind: 'key-fact-list',
        importance: 'supporting',
        facts: [
          { label: 'selected inquiry', value: plan.inquiry?.id ?? 'none' },
          { label: 'primary step', value: plan.primaryStep?.command ?? 'none' },
          { label: 'execution', value: options.execution?.status ?? 'skipped' },
        ],
      },
      ...(options.execution && options.execution.lines.length > 0 ? [{
        kind: 'bullet-list' as const,
        importance: 'supporting' as const,
        title: 'Execution summary',
        items: options.execution.lines,
      }] : []),
      ...(options.execution && options.execution.facts.length > 0 ? [{
        kind: 'key-fact-list' as const,
        importance: 'detail' as const,
        facts: options.execution.facts,
      }] : []),
      ...(plan.missingInputs.length > 0 ? [{
        kind: 'bullet-list' as const,
        importance: 'supporting' as const,
        title: 'Missing inputs',
        items: plan.missingInputs.map((missing) => `${missing} is still required.`),
      }] : []),
      {
        kind: 'ref-list',
        importance: 'detail',
        refs: dedupeRefs(relatedRefs),
      },
    ]);
    const value = createStructuredSourceAnalysisAnswerCard({
      title: 'Source-analysis inquiry answer',
      primaryRef: plan.inquiry
        ? inquiryRef(plan.inquiry.id, plan.inquiry.label, plan.inquiry.summary)
        : inquiryRef('capability-guidance', 'Capability guidance'),
      relatedRefs: dedupeRefs(relatedRefs),
      document,
      policy,
      extra: {
        status: askStatus,
        inquiry: plan.inquiry,
        steps: plan.steps,
        ...(plan.primaryStep ? { primaryStep: plan.primaryStep } : {}),
        alternatives: plan.alternatives,
        reasons: plan.reasons,
        missingInputs: plan.missingInputs,
        ...(options.execution ? { execution: options.execution } : {}),
      },
    });
    return createSourceAnalysisAnswerEnvelope({
      query,
      focusRef: query.focusRef,
      inquiryEpisode: 'bounded-closure-explanation',
      readMode,
      worldFrame,
      tag: askStatus === 'answered' ? 'hit' : askStatus === 'ambiguous' ? 'ambiguous' : askStatus === 'no-match' ? 'reroute' : 'open-boundary',
      value,
      trust: askStatus === 'answered'
        ? qualifiedTrust('The public inquiry plan closed and its primary kernel step executed successfully.')
        : frontierTrust('The public inquiry face identified the right family, but more narrowing or input is still required.'),
      closureBasis: inquiryClosureBasis(plan.inquiry?.id ?? 'capability-guidance'),
      issues: [
        ...plan.missingInputs.map((missing) => ({
          code: 'ask-missing-input',
          message: `${missing} is still required before this question can execute honestly.`,
          severity: 'warning' as const,
          origin: 'query' as const,
        })),
        ...(options.execution?.status === 'failed'
          ? [{
            code: 'ask-execution-failed',
            message: 'The inquiry plan closed, but the primary kernel command failed during execution.',
            severity: 'warning' as const,
            origin: 'infrastructure' as const,
          }]
          : []),
      ],
      continuations: inquiryContinuations(plan),
      provenance: inquiryProvenance(),
    });
  }
}

export function createSourceAnalysisInquiryIngress(
  inquiries?: SourceAnalysisInquiryCatalog,
  capabilities?: SourceAnalysisCapabilityCatalog,
): SourceAnalysisInquiryIngress {
  return new SourceAnalysisInquiryIngress(inquiries, capabilities);
}

function buildInquirySteps(
  descriptor: SourceAnalysisInquiryFamilyDescriptor,
  options: SourceAnalysisInquiryPlanOptions,
  hints: SourceAnalysisIngressFocusHints,
): BuiltInquirySteps {
  switch (descriptor.id) {
    case 'capability-guidance':
      return buildCapabilityGuidanceSteps(options);
    case 'workspace-orientation':
      return buildWorkspaceOrientationSteps(options, hints);
    case 'package-audit':
      return buildPackageAuditSteps(options, hints);
    case 'route-explanation':
      return buildRouteExplanationSteps(options, hints);
    case 'snapshot-maintenance':
      return buildSnapshotMaintenanceSteps(options, hints);
    default:
      return {
        steps: [],
        missingInputs: ['unsupported inquiry family'],
        reasons: [{
          kind: 'missing-input',
          detail: `The inquiry family "${descriptor.id}" does not yet declare any executable steps.`,
        }],
      };
  }
}

function buildCapabilityGuidanceSteps(
  options: SourceAnalysisInquiryPlanOptions,
): BuiltInquirySteps {
  const command = chooseCapabilityGuidanceCommand(options.question);
  const step: SourceAnalysisInquiryPlanStep = {
    label: command === 'repair.command' ? 'Repair a command shape' : command === 'plan.question' ? 'Plan a command shape' : 'Describe capabilities',
    summary: command === 'repair.command'
      ? 'Route a wrong or incomplete command attempt toward the declared kernel surface.'
      : command === 'plan.question'
        ? 'Turn the natural-language question into a canonical command invocation.'
        : 'Show the declared commands, focus kinds, and examples that fit the question.',
    phase: 'guidance',
    command,
    args: { question: options.question },
    required: true,
  };
  return {
    steps: [step],
    primaryStep: step,
    missingInputs: [],
    reasons: [{
      kind: 'input',
      detail: `The question is best served by the ${command} guidance command.`,
    }],
  };
}

function buildWorkspaceOrientationSteps(
  options: SourceAnalysisInquiryPlanOptions,
  hints: SourceAnalysisIngressFocusHints,
): BuiltInquirySteps {
  const reasons: SourceAnalysisInquiryPlanReason[] = [];
  const missingInputs: string[] = [];
  const steps: SourceAnalysisInquiryPlanStep[] = [];
  const sessionStep = maybeCreateSessionStep(options, reasons, missingInputs);
  if (sessionStep) {
    steps.push(sessionStep);
  }

  let queryStep: SourceAnalysisInquiryPlanStep;
  if (hints.focusKind && (hints.focusKind === 'package' || hints.focusKind === 'file' || hints.focusKind === 'type' || hints.focusKind === 'export') && hints.focusValue) {
    queryStep = {
      label: 'Navigate the focused target',
      summary: `Build a structured neighborhood view for ${hints.focusKind}:${hints.focusValue}.`,
      phase: 'query',
      command: 'query.navigate',
      args: {
        ...(options.sessionId ? { sessionId: options.sessionId } : {}),
        focusKind: hints.focusKind,
        focusValue: hints.focusValue,
        questionRoute: 'join',
      },
      required: true,
    };
    reasons.push({
      kind: 'focus-inference',
      detail: `The workspace-orientation family can spend ${hints.focusKind}:${hints.focusValue} through query.navigate.`,
    });
  } else if (questionSuggests(options.question, ['exports', 'entrypoint', 'public'])) {
    queryStep = {
      label: 'Summarize export surface',
      summary: 'Inspect the exported package surface before editing.',
      phase: 'query',
      command: 'query.exports.summary',
      args: {
        ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      },
      required: true,
    };
  } else if (questionSuggests(options.question, ['types', 'type', 'hub'])) {
    queryStep = {
      label: 'Summarize type hubs',
      summary: 'Inspect the dominant type hubs before editing.',
      phase: 'query',
      command: 'query.typerefs.summary',
      args: {
        ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      },
      required: true,
    };
  } else {
    queryStep = {
      label: 'Summarize dependency posture',
      summary: 'Inspect the repo-wide dependency posture before editing.',
      phase: 'query',
      command: 'query.deps.summary',
      args: {
        ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      },
      required: true,
    };
  }

  const resolvedQueryStep = !options.sessionId && missingInputs.length === 0 && sessionStep
    ? {
      ...queryStep,
      args: {
        ...queryStep.args,
        sessionId: '$session.open',
      },
    }
    : queryStep;

  steps.push(resolvedQueryStep);
  return {
    steps,
    primaryStep: resolvedQueryStep,
    missingInputs,
    reasons,
  };
}

function buildPackageAuditSteps(
  options: SourceAnalysisInquiryPlanOptions,
  hints: SourceAnalysisIngressFocusHints,
): BuiltInquirySteps {
  const reasons: SourceAnalysisInquiryPlanReason[] = [];
  const missingInputs: string[] = [];
  const steps: SourceAnalysisInquiryPlanStep[] = [];
  const sessionStep = maybeCreateSessionStep(options, reasons, missingInputs);
  if (sessionStep) {
    steps.push(sessionStep);
  }

  const packageName = hints.packageName ?? (hints.focusKind === 'package' ? hints.focusValue : undefined);
  if (!packageName) {
    missingInputs.push('packageName');
  } else {
    reasons.push({
      kind: 'focus-inference',
      detail: `Using "${packageName}" as the package audit focus.`,
    });
  }

  const auditStep: SourceAnalysisInquiryPlanStep = {
    label: 'Audit the package',
    summary: 'Inspect package-local debt, uncovered files, route gaps, and exercise posture.',
    phase: 'query',
    command: 'query.audit.package',
    args: {
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      ...(packageName ? { packageName } : {}),
    },
    required: true,
  };
  const resolvedAuditStep = !options.sessionId && missingInputs.length === 0 && sessionStep
    ? {
      ...auditStep,
      args: {
        ...auditStep.args,
        sessionId: '$session.open',
      },
    }
    : auditStep;
  steps.push(resolvedAuditStep);

  return {
    steps,
    primaryStep: resolvedAuditStep,
    missingInputs,
    reasons,
  };
}

function buildRouteExplanationSteps(
  options: SourceAnalysisInquiryPlanOptions,
  hints: SourceAnalysisIngressFocusHints,
): BuiltInquirySteps {
  const reasons: SourceAnalysisInquiryPlanReason[] = [];
  const missingInputs: string[] = [];
  const steps: SourceAnalysisInquiryPlanStep[] = [];
  const sessionStep = maybeCreateSessionStep(options, reasons, missingInputs);
  if (sessionStep) {
    steps.push(sessionStep);
  }

  const focusKind = hints.focusKind;
  const focusValue = hints.focusValue;
  if (!focusKind || (focusKind !== 'file' && focusKind !== 'type')) {
    missingInputs.push('focusKind');
  }
  if (!focusValue) {
    missingInputs.push('focusValue');
  }
  if (focusKind && focusValue) {
    reasons.push({
      kind: 'focus-inference',
      detail: `Using ${focusKind}:${focusValue} as the route-witness focus.`,
    });
  }

  const witnessStep: SourceAnalysisInquiryPlanStep = {
    label: 'Explain the route witness',
    summary: 'Show the strongest modeled route from an ingress root to the focused file or type.',
    phase: 'query',
    command: 'query.route.witness',
    args: {
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      ...(focusKind ? { focusKind } : {}),
      ...(focusValue ? { focusValue } : {}),
    },
    required: true,
  };
  const resolvedWitnessStep = !options.sessionId && missingInputs.length === 0 && sessionStep
    ? {
      ...witnessStep,
      args: {
        ...witnessStep.args,
        sessionId: '$session.open',
      },
    }
    : witnessStep;
  steps.push(resolvedWitnessStep);

  return {
    steps,
    primaryStep: resolvedWitnessStep,
    missingInputs,
    reasons,
  };
}

function buildSnapshotMaintenanceSteps(
  options: SourceAnalysisInquiryPlanOptions,
  hints: SourceAnalysisIngressFocusHints,
): BuiltInquirySteps {
  const reasons: SourceAnalysisInquiryPlanReason[] = [];
  const missingInputs: string[] = [];
  const steps: SourceAnalysisInquiryPlanStep[] = [];
  const sessionStep = maybeCreateSessionStep(options, reasons, missingInputs);
  if (sessionStep) {
    steps.push(sessionStep);
  }

  const primaryCommand = chooseSnapshotMaintenanceCommand(options.question);
  const args: Record<string, unknown> = {
    ...(options.sessionId ? { sessionId: options.sessionId } : {}),
  };

  if (primaryCommand === 'session.invalidate' && hints.focusKind === 'file' && hints.focusValue) {
    args.scope = 'files';
    args.files = [hints.focusValue];
    reasons.push({
      kind: 'focus-inference',
      detail: `Using "${hints.focusValue}" as a file-scoped invalidation target.`,
    });
  }

  const step: SourceAnalysisInquiryPlanStep = {
    label: describeSnapshotMaintenanceLabel(primaryCommand),
    summary: describeSnapshotMaintenanceSummary(primaryCommand),
    phase: primaryCommand === 'materializeSnapshots' ? 'maintenance' : 'query',
    command: primaryCommand,
    args,
    required: true,
  };
  const resolvedStep = !options.sessionId && missingInputs.length === 0 && sessionStep
    ? {
      ...step,
      args: {
        ...step.args,
        sessionId: '$session.open',
      },
    }
    : step;
  steps.push(resolvedStep);

  return {
    steps,
    primaryStep: resolvedStep,
    missingInputs,
    reasons,
  };
}

function maybeCreateSessionStep(
  options: SourceAnalysisInquiryPlanOptions,
  reasons: SourceAnalysisInquiryPlanReason[],
  missingInputs: string[],
): SourceAnalysisInquiryPlanStep | undefined {
  if (options.sessionId) {
    reasons.push({
      kind: 'input',
      detail: `Using the provided sessionId "${options.sessionId}".`,
    });
    return undefined;
  }

  const repoPath = options.repoPath ?? extractRepoPath(options.question);
  if (!repoPath) {
    missingInputs.push('repoPath');
    return undefined;
  }

  reasons.push({
    kind: 'input',
    detail: `The inquiry will open a transient session for "${repoPath}".`,
  });
  return {
    label: 'Open a workspace session',
    summary: 'Prepare a hosted session so the kernel can read or refresh live snapshots.',
    phase: 'prepare',
    command: 'session.open',
    args: {
      repoPath,
      ...(options.target ? { target: options.target } : {}),
    },
    required: true,
  };
}

function chooseCapabilityGuidanceCommand(question: string): string {
  if (questionSuggests(question, ['repair', 'wrong', 'failed', 'invalid'])) {
    return 'repair.command';
  }
  if (questionSuggests(question, ['plan', 'invoke', 'which', 'use'])) {
    return 'plan.question';
  }
  return 'describe.capabilities';
}

function chooseSnapshotMaintenanceCommand(question: string): string {
  if (questionSuggests(question, ['materialize', 'json', 'snapshot file', 'write'])) {
    return 'materializeSnapshots';
  }
  if (questionSuggests(question, ['invalidate', 'dirty file', 'dirty files'])) {
    return 'session.invalidate';
  }
  if (questionSuggests(question, ['refresh', 'stale', 'dirty', 'rebuild'])) {
    return 'session.refresh';
  }
  return 'session.status';
}

function describeSnapshotMaintenanceLabel(command: string): string {
  switch (command) {
    case 'materializeSnapshots': return 'Materialize snapshots';
    case 'session.invalidate': return 'Invalidate a session';
    case 'session.refresh': return 'Refresh the session';
    default: return 'Inspect session status';
  }
}

function describeSnapshotMaintenanceSummary(command: string): string {
  switch (command) {
    case 'materializeSnapshots': return 'Write the current snapshots to JSON files for external consumers.';
    case 'session.invalidate': return 'Mark a file or project dirty so the next query refreshes honestly.';
    case 'session.refresh': return 'Refresh the dirty kinds in the current hosted session.';
    default: return 'Inspect session freshness, cache state, and dirty kinds.';
  }
}

function questionSuggests(question: string, terms: readonly string[]): boolean {
  return matchTokens(question, terms).length > 0
    || terms.some((term) => question.toLowerCase().includes(term.toLowerCase()));
}

function compareMatchesForAmbiguity(
  left: SourceAnalysisInquiryMatch,
  right: SourceAnalysisInquiryMatch,
): boolean {
  return left.exactFamily === right.exactFamily
    && left.aliasMatches.length === right.aliasMatches.length
    && left.nounMatches.length === right.nounMatches.length
    && left.verbMatches.length === right.verbMatches.length
    && left.routeMatches.length === right.routeMatches.length
    && left.commandMatches.length === right.commandMatches.length
    && left.focusMatched === right.focusMatched;
}

function describePlanStatus(plan: SourceAnalysisResolvedInquiryPlan): string {
  switch (plan.status) {
    case 'ready':
      return `The question maps most directly to ${plan.inquiry?.id ?? 'an inquiry family'}, and the plan is ready to execute.`;
    case 'needs-input':
      return `The question most likely maps to ${plan.inquiry?.id ?? 'an inquiry family'}, but more input is still required.`;
    case 'ambiguous':
      return 'The question overlaps more than one inquiry family equally well.';
    default:
      return 'No public inquiry family closed directly on this question yet.';
  }
}

function resolveAskStatus(
  plan: SourceAnalysisResolvedInquiryPlan,
  execution: SourceAnalysisInquiryExecutionSummary | undefined,
): SourceAnalysisInquiryAskStatus {
  if (plan.status === 'ambiguous') {
    return 'ambiguous';
  }
  if (plan.status === 'no-match') {
    return 'no-match';
  }
  if (execution?.status === 'executed') {
    return 'answered';
  }
  return 'planned';
}

function describeAskStatus(
  status: SourceAnalysisInquiryAskStatus,
  plan: SourceAnalysisResolvedInquiryPlan,
  execution: SourceAnalysisInquiryExecutionSummary | undefined,
): string {
  switch (status) {
    case 'answered':
      return `The public inquiry face answered the question through ${execution?.command ?? plan.primaryStep?.command ?? 'the planned kernel step'}.`;
    case 'planned':
      return `The public inquiry face identified ${plan.inquiry?.id ?? 'the right inquiry family'}, but more input or a stronger focus is still needed before execution.`;
    case 'ambiguous':
      return 'The question still spans multiple inquiry families and needs one more narrowing move.';
    default:
      return 'No public inquiry family closed directly on this question.';
  }
}

function inquiryFocusRef(value: string): SourceAnalysisFocusRef {
  return { kind: 'inquiry', value };
}

function inquiryRef(
  value: string,
  label: string,
  detail?: string,
): SourceAnalysisInquiryRef {
  return {
    kind: 'inquiry',
    value,
    label,
    ...(detail ? { detail } : {}),
  };
}

function capabilityRef(
  value: string,
  label: string,
  detail?: string,
): SourceAnalysisInquiryRef {
  return {
    kind: 'capability',
    value,
    label,
    ...(detail ? { detail } : {}),
  };
}

function defaultWorldFrame(repoPath?: string, target?: string): SourceAnalysisWorldFrame {
  return {
    ...(repoPath ? { repoPath } : {}),
    ...(target ? { target } : {}),
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

function inquiryProvenance() {
  return [({
    kind: 'host' as const,
    label: 'Declared inquiry-family ingress catalog',
    detail: 'Public inquiry discovery and planning are derived from declared inquiry-family descriptors over the kernel command surface.',
  })];
}

function inquiryClosureBasis(subject: string): readonly SourceAnalysisClosureBasis[] {
  return [{
    kind: 'route',
    summary: `The public inquiry plan is shaped by the declared inquiry family ${subject}.`,
    provenanceRefs: [subject],
  }];
}

function toPlanReason(reason: SourceAnalysisInquiryMatchReason): SourceAnalysisInquiryPlanReason {
  return {
    kind: 'match',
    detail: reason.detail,
  };
}

function toHintPlanReason(reason: SourceAnalysisIngressHintDetail): SourceAnalysisInquiryPlanReason {
  return {
    kind: reason.kind,
    detail: reason.detail,
  };
}

function inquiryContinuations(
  plan: SourceAnalysisResolvedInquiryPlan,
): readonly SourceAnalysisContinuation[] {
  if (plan.missingInputs.length > 0) {
    return [{
      kind: 'narrow',
      label: `Provide ${plan.missingInputs.join(', ')}`,
      description: `The inquiry ${plan.inquiry?.id ?? 'family'} still needs ${plan.missingInputs.join(', ')} before it can execute honestly.`,
      targetQuestionRoute: 'route',
    }];
  }

  if (plan.primaryStep) {
    return [{
      kind: 'reroute',
      label: `Run ${plan.primaryStep.command}`,
      description: `Execute the primary kernel step for ${plan.inquiry?.id ?? 'the selected inquiry family'}.`,
      targetQuestionRoute: 'route',
    }];
  }

  return [];
}

function dedupeRefs<TRef extends { readonly kind: string; readonly value: string }>(
  refs: readonly TRef[],
): readonly TRef[] {
  const seen = new Set<string>();
  const deduped: TRef[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.value}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(ref);
  }
  return deduped;
}
