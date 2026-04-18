import type {
  FocusKind,
  InquiryEpisode,
  QuestionRoute,
  ReadMode,
} from './inquiry-model.js';
import type { CapabilityCatalog } from './capability-catalog.js';
import {
  captureKindsForFocusKinds,
  type IngressCapture,
} from './ingress-recognizers.js';
import {
  compareIngressEvaluations,
  createCaptureRule,
  createExactRule,
  createFocusRule,
  createIngressContext,
  createPhraseRule,
  createTokenRule,
  evaluateIngressRules,
  rehydrateIngressEvaluation,
  type IngressContext,
  type IngressMatchTrace,
  type IngressRuleSpec,
  type IngressSelectionPolicy,
} from './ingress-matcher.js';
import { tokenize } from './ingress-normalization.js';

export const INQUIRY_FAMILY_IDS = [
  'capability-guidance',
  'analyzability-posture',
  'workspace-orientation',
  'package-audit',
  'route-explanation',
  'snapshot-maintenance',
] as const;

export const INQUIRY_MATCH_REASON_KINDS = [
  'family',
  'alias',
  'noun',
  'verb',
  'focus',
  'route',
  'command',
  'confusion',
] as const;

export type InquiryFamilyId =
  typeof INQUIRY_FAMILY_IDS[number];

export type InquiryMatchReasonKind =
  typeof INQUIRY_MATCH_REASON_KINDS[number];

export interface InquiryExample {
  readonly label: string;
  readonly question: string;
  readonly primaryCommand: string;
}

export interface InquiryConfusion {
  readonly label: string;
  readonly detail: string;
  readonly terms: readonly string[];
  readonly steer: string;
}

export interface InquiryFamilyDefinition {
  readonly id: InquiryFamilyId;
  readonly label: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly focusKinds: readonly FocusKind[];
  readonly inquiryEpisodes: readonly InquiryEpisode[];
  readonly questionRoutes: readonly QuestionRoute[];
  readonly readModes: readonly ReadMode[];
  readonly aliases: readonly string[];
  readonly nouns: readonly string[];
  readonly verbs: readonly string[];
  readonly primaryCommands: readonly string[];
  readonly supportingCommands: readonly string[];
  readonly examples: readonly InquiryExample[];
  readonly commonConfusions: readonly InquiryConfusion[];
}

export interface InquiryFamilyView {
  readonly id: InquiryFamilyId;
  readonly label: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly focusKinds: readonly FocusKind[];
  readonly inquiryEpisodes: readonly InquiryEpisode[];
  readonly questionRoutes: readonly QuestionRoute[];
  readonly readModes: readonly ReadMode[];
  readonly aliases: readonly string[];
  readonly primaryCommands: readonly string[];
  readonly supportingCommands: readonly string[];
  readonly examples: readonly InquiryExample[];
  readonly commonConfusions: readonly InquiryConfusion[];
}

export interface InquiryMatchReason {
  readonly kind: InquiryMatchReasonKind;
  readonly detail: string;
  readonly term?: string;
}

export interface InquiryMatch {
  readonly inquiry: InquiryFamilyView;
  readonly reasons: readonly InquiryMatchReason[];
  readonly traces: readonly IngressMatchTrace<InquiryMatchReasonKind>[];
  readonly captures: readonly IngressCapture[];
  readonly requiredSatisfied: boolean;
  readonly exactFamily: boolean;
  readonly aliasMatches: readonly string[];
  readonly nounMatches: readonly string[];
  readonly verbMatches: readonly string[];
  readonly routeMatches: readonly string[];
  readonly commandMatches: readonly string[];
  readonly confusionMatches: readonly string[];
  readonly focusMatched: boolean;
}

export interface DiscoverInquiriesInput {
  readonly question?: string;
  readonly focusKind?: FocusKind;
  readonly familyId?: string;
  readonly includeExamples?: boolean;
  readonly topK?: number;
}

export interface InquiryCatalogDiagnostics {
  readonly uncoveredCommands: readonly string[];
  readonly familiesWithoutExamples: readonly string[];
}

export class InquiryFamilyDescriptor {
  readonly #definition: InquiryFamilyDefinition;
  readonly #rules: readonly IngressRuleSpec<InquiryMatchReasonKind>[];

  constructor(definition: InquiryFamilyDefinition) {
    this.#definition = definition;
    this.#rules = createInquiryMatchRules(definition);
  }

  get id(): InquiryFamilyId {
    return this.#definition.id;
  }

  get primaryCommands(): readonly string[] {
    return this.#definition.primaryCommands;
  }

  get supportingCommands(): readonly string[] {
    return this.#definition.supportingCommands;
  }

  toView(includeExamples = false): InquiryFamilyView {
    return {
      id: this.#definition.id,
      label: this.#definition.label,
      summary: this.#definition.summary,
      whenToUse: this.#definition.whenToUse,
      focusKinds: this.#definition.focusKinds,
      inquiryEpisodes: this.#definition.inquiryEpisodes,
      questionRoutes: this.#definition.questionRoutes,
      readModes: this.#definition.readModes,
      aliases: this.#definition.aliases,
      primaryCommands: this.#definition.primaryCommands,
      supportingCommands: this.#definition.supportingCommands,
      examples: includeExamples ? this.#definition.examples : [],
      commonConfusions: this.#definition.commonConfusions,
    };
  }

  emptyMatch(includeExamples = false): InquiryMatch {
    return {
      inquiry: this.toView(includeExamples),
      reasons: [],
      traces: [],
      captures: [],
      requiredSatisfied: true,
      exactFamily: false,
      aliasMatches: [],
      nounMatches: [],
      verbMatches: [],
      routeMatches: [],
      commandMatches: [],
      confusionMatches: [],
      focusMatched: false,
    };
  }

  matchContext(
    context: IngressContext,
    includeExamples = false,
  ): InquiryMatch | null {
    const evaluation = evaluateIngressRules(context, this.#rules);
    if (!evaluation.matched) {
      return null;
    }

    const traces = evaluation.traces;
    const matchedTraces = evaluation.matchedTraces;

    return {
      inquiry: this.toView(includeExamples),
      reasons: matchedTraces.map(toInquiryMatchReason),
      traces,
      captures: matchedTraces
        .map((trace) => trace.capture)
        .filter((capture): capture is IngressCapture => capture !== undefined),
      requiredSatisfied: evaluation.requiredSatisfied,
      exactFamily: matchedTraces.some((trace) => trace.ruleId === 'exact-family'),
      aliasMatches: matchedTerms(matchedTraces, 'alias'),
      nounMatches: matchedTerms(matchedTraces, 'noun'),
      verbMatches: matchedTerms(matchedTraces, 'verb'),
      routeMatches: matchedTerms(matchedTraces, 'route'),
      commandMatches: matchedTerms(matchedTraces, 'command'),
      confusionMatches: matchedTerms(matchedTraces, 'confusion'),
      focusMatched: matchedTraces.some((trace) => trace.reasonKind === 'focus' && trace.importance !== 'negative'),
    };
  }
}

export class InquiryCatalog {
  readonly #descriptors: readonly InquiryFamilyDescriptor[];
  readonly #selectionPolicy: IngressSelectionPolicy<InquiryMatchReasonKind>;

  constructor(
    descriptors: readonly InquiryFamilyDescriptor[],
    selectionPolicy: IngressSelectionPolicy<InquiryMatchReasonKind> = DEFAULT_INQUIRY_SELECTION_POLICY,
  ) {
    this.#descriptors = descriptors;
    this.#selectionPolicy = selectionPolicy;
  }

  list(includeExamples = false): readonly InquiryFamilyView[] {
    return this.#descriptors.map((descriptor) => descriptor.toView(includeExamples));
  }

  resolve(id: string): InquiryFamilyDescriptor | undefined {
    const normalizedId = id.trim().toLowerCase();
    return this.#descriptors.find((descriptor) => descriptor.id.trim().toLowerCase() === normalizedId);
  }

  isAmbiguousTie(
    left: InquiryMatch,
    right: InquiryMatch,
  ): boolean {
    return compareInquiryMatches(left, right, this.#selectionPolicy) === 0;
  }

  discover(input: DiscoverInquiriesInput = {}): readonly InquiryMatch[] {
    if (!input.question && !input.focusKind && !input.familyId) {
      return limitMatches(
        this.#descriptors
          .map((descriptor) => descriptor.emptyMatch(input.includeExamples))
          .sort((left, right) => left.inquiry.id.localeCompare(right.inquiry.id)),
        input.topK,
      );
    }

    const context = createIngressContext({
      question: input.question,
      familyId: input.familyId,
      focusKind: input.focusKind,
    });
    const matches = this.#descriptors
      .map((descriptor) => descriptor.matchContext(context, input.includeExamples))
      .filter((match): match is InquiryMatch => Boolean(match))
      .sort((left, right) =>
        compareInquiryMatches(left, right, this.#selectionPolicy)
        || left.inquiry.id.localeCompare(right.inquiry.id),
      );
    return limitMatches(matches, input.topK);
  }

  diagnose(capabilities: CapabilityCatalog): InquiryCatalogDiagnostics {
    const coveredCommands = new Set<string>();
    for (const descriptor of this.#descriptors) {
      for (const command of descriptor.primaryCommands) {
        coveredCommands.add(command);
      }
      for (const command of descriptor.supportingCommands) {
        coveredCommands.add(command);
      }
    }

    const uncoveredCommands = capabilities
      .list(false)
      .map((capability) => capability.command)
      .filter((command) => !coveredCommands.has(command));
    const familiesWithoutExamples = this.#descriptors
      .filter((descriptor) => descriptor.toView(true).examples.length === 0)
      .map((descriptor) => descriptor.id);

    return {
      uncoveredCommands,
      familiesWithoutExamples,
    };
  }
}

export function createDefaultInquiryCatalog(): InquiryCatalog {
  // TODO: These inquiry families are conversational ingress affordances, not
  // the real semantic decomposition of the product. Once the shared authority
  // exposes typed query intents and narrowing axes, generate more of this layer
  // from those contracts instead of freezing more hand-authored family labels.
  return new InquiryCatalog([
    new InquiryFamilyDescriptor({
      id: 'capability-guidance',
      label: 'Capability guidance',
      summary: 'Teach the caller what source-analysis can do and how to shape a valid command.',
      whenToUse: 'Use this when you are unsure what the tool can answer, how to phrase a question, or which command shape is valid.',
      focusKinds: ['repo', 'capability', 'inquiry'],
      inquiryEpisodes: ['orient-and-localize', 'bounded-closure-explanation'],
      questionRoutes: ['search', 'route'],
      readModes: ['summary-card', 'focus-card', 'supporting-evidence'],
      aliases: ['what can this tool do', 'how do i use source analysis', 'help', 'discover commands'],
      nouns: ['capability', 'command', 'surface', 'tool', 'help'],
      verbs: ['discover', 'plan', 'repair', 'describe', 'use'],
      primaryCommands: ['describe.capabilities', 'plan.question', 'repair.command'],
      supportingCommands: [],
      examples: [
        inquiryExample('Learn the surface', 'What can this tool do for package tech debt?', 'describe.capabilities'),
        inquiryExample('Repair a bad label', 'I tried query.audit.pkg and it failed.', 'repair.command'),
      ],
      commonConfusions: [],
    }),
    new InquiryFamilyDescriptor({
      id: 'analyzability-posture',
      label: 'Analyzability posture',
      summary: 'Explain the active profile regime, current snapshot support, and named open fronts.',
      whenToUse: 'Use this when you need to know what regime you are in, how far the current analyzability closes, or which excluded/frontier boundaries remain open.',
      focusKinds: ['repo'],
      inquiryEpisodes: ['bounded-closure-explanation', 'orient-and-localize'],
      questionRoutes: ['route', 'search'],
      readModes: ['summary-card', 'focus-card', 'supporting-evidence'],
      aliases: ['what regime am i in', 'analyzability posture', 'open fronts', 'excluded boundaries', 'profile posture'],
      nouns: ['profile', 'regime', 'analyzability', 'posture', 'boundary', 'boundaries', 'frontier', 'frontiers', 'excluded', 'open'],
      verbs: ['describe', 'inspect', 'explain', 'surface', 'qualify'],
      primaryCommands: ['describe.profile'],
      supportingCommands: ['session.refresh', 'materializeSnapshots'],
      examples: [
        inquiryExample('Regime posture', 'How analyzable is this repo under the current regime?', 'describe.profile'),
        inquiryExample('Excluded fronts', 'What boundaries are open because parts of the repo are excluded from analysis?', 'describe.profile'),
      ],
      commonConfusions: [{
        label: 'Posture versus workspace overview',
        detail: 'If the question is just where to start editing, workspace-orientation is a better fit than a regime posture readout.',
        terms: ['where do i start', 'orient me', 'overview before editing'],
        steer: 'workspace-orientation',
      }],
    }),
    new InquiryFamilyDescriptor({
      id: 'workspace-orientation',
      label: 'Workspace orientation',
      summary: 'Orient an AI to a package, file, symbol, type, export, or repo before editing.',
      whenToUse: 'Use this when you need a starting point, declaration location, neighborhood view, or quick structural posture before making changes.',
      focusKinds: ['repo', 'package', 'file', 'symbol', 'type', 'export'],
      inquiryEpisodes: ['orient-and-localize', 'bounded-closure-explanation'],
      questionRoutes: ['search', 'join', 'inventory', 'route'],
      readModes: ['summary-card', 'focus-card', 'supporting-evidence'],
      aliases: ['where do i start', 'understand the workspace', 'orient me', 'overview before editing'],
      nouns: ['workspace', 'repo', 'package', 'file', 'symbol', 'type', 'export', 'overview', 'orientation', 'declaration', 'definition', 'implementation'],
      verbs: ['understand', 'orient', 'inspect', 'start', 'explore', 'find', 'locate', 'defined', 'declared', 'implemented'],
      primaryCommands: ['query.navigate', 'query.deps.summary'],
      supportingCommands: ['query.exports.summary', 'query.typerefs.summary', 'session.open', 'session.status'],
      examples: [
        inquiryExample('Package overview', 'Orient me to @aurelia-ls/source-analysis before I edit it.', 'query.navigate'),
        inquiryExample('Declaration location', 'Where is createAnalysisViews implemented?', 'query.navigate'),
        inquiryExample('Repo posture', 'I want to understand the repo before editing it.', 'query.deps.summary'),
      ],
      commonConfusions: [{
        label: 'Route explanation versus orientation',
        detail: 'If you already know the file or type and need to prove why it is alive, the route-explanation family is a better fit.',
        terms: ['alive', 'reachable', 'why is this here'],
        steer: 'route-explanation',
      }],
    }),
    new InquiryFamilyDescriptor({
      id: 'package-audit',
      label: 'Package audit',
      summary: 'Find package-local architecture debt, uncovered files, exercise gaps, and route blind spots.',
      whenToUse: 'Use this for tech debt, dead-code suspicion, under-integration, or self-improvement passes on a package.',
      focusKinds: ['package'],
      inquiryEpisodes: ['inventory-and-audit-sweep', 'bounded-closure-explanation'],
      questionRoutes: ['inventory', 'route'],
      readModes: ['summary-card', 'focus-card', 'supporting-evidence'],
      aliases: ['tech debt', 'dead code', 'audit this package', 'integration gaps', 'layer cycles', 'dependency seams'],
      nouns: ['audit', 'debt', 'coverage', 'integration', 'dead', 'exercise', 'cycle', 'layer', 'seam', 'coupling', 'architecture'],
      verbs: ['audit', 'review', 'improve', 'triage', 'find', 'explain', 'trace'],
      primaryCommands: ['query.audit.package'],
      supportingCommands: ['query.route.witness', 'query.navigate', 'session.open', 'session.status'],
      examples: [
        inquiryExample('Package debt scan', 'Audit @aurelia-ls/source-analysis for tech debt.', 'query.audit.package'),
        inquiryExample('Cycle seam scan', 'Which package-internal dependency seams keep @aurelia-ls/source-analysis in a source-area cycle?', 'query.audit.package'),
      ],
      commonConfusions: [{
        label: 'Package audit versus route explanation',
        detail: 'If the real question is about one file or type being alive, go through route-explanation instead of the broader package audit.',
        terms: ['why alive', 'why reachable'],
        steer: 'route-explanation',
      }],
    }),
    new InquiryFamilyDescriptor({
      id: 'route-explanation',
      label: 'Route explanation',
      summary: 'Explain why a file or type is alive by showing the strongest modeled route witness.',
      whenToUse: 'Use this when you want a proof chain from an ingress root to a file or type.',
      focusKinds: ['file', 'type'],
      inquiryEpisodes: ['bounded-closure-explanation'],
      questionRoutes: ['route', 'join'],
      readModes: ['focus-card', 'supporting-evidence'],
      aliases: ['why alive', 'why reachable', 'route witness', 'why does this survive'],
      nouns: ['route', 'witness', 'reachability', 'path', 'survival', 'alive'],
      verbs: ['explain', 'trace', 'prove', 'show', 'route'],
      primaryCommands: ['query.route.witness'],
      supportingCommands: ['query.navigate', 'session.open', 'session.status'],
      examples: [
        inquiryExample('File route', 'Why is packages/source-analysis/src/refresh.ts alive?', 'query.route.witness'),
      ],
      commonConfusions: [{
        label: 'Route explanation versus package audit',
        detail: 'If you want a package-wide red-flag sweep instead of one witness chain, use package-audit.',
        terms: ['tech debt', 'audit package'],
        steer: 'package-audit',
      }, {
        label: 'Implementation location versus route witness',
        detail: 'If the question is asking where a declaration lives or is implemented, workspace-orientation is a better fit than a route witness.',
        terms: ['implemented', 'implementation', 'defined', 'definition', 'declared', 'declaration'],
        steer: 'workspace-orientation',
      }],
    }),
    new InquiryFamilyDescriptor({
      id: 'snapshot-maintenance',
      label: 'Snapshot maintenance',
      summary: 'Inspect, refresh, invalidate, or materialize hosted snapshots and session state.',
      whenToUse: 'Use this when snapshots are stale, dirty, missing, or you need materialized JSON for external use.',
      focusKinds: ['repo', 'session', 'file'],
      inquiryEpisodes: ['delta-and-reread-floor', 'bounded-closure-explanation'],
      questionRoutes: ['refresh', 'diff', 'materialize', 'search'],
      readModes: ['summary-card', 'focus-card', 'delta-card', 'snapshot'],
      aliases: ['stale snapshots', 'refresh analysis', 'materialize snapshots', 'dirty session'],
      nouns: ['snapshot', 'session', 'refresh', 'invalidate', 'materialize', 'stale'],
      verbs: ['refresh', 'invalidate', 'materialize', 'debug', 'inspect'],
      primaryCommands: ['session.status', 'session.refresh', 'materializeSnapshots'],
      supportingCommands: [
        'session.open',
        'session.close',
        'session.invalidate',
        'query.deps.snapshot',
        'query.typerefs.snapshot',
        'query.exports.snapshot',
      ],
      examples: [
        inquiryExample('Refresh dirty snapshots', 'Refresh the current source-analysis session.', 'session.refresh'),
        inquiryExample('Materialize JSON', 'Materialize the current snapshots to disk.', 'materializeSnapshots'),
      ],
      commonConfusions: [],
    }),
  ]);
}

function inquiryExample(
  label: string,
  question: string,
  primaryCommand: string,
): InquiryExample {
  return {
    label,
    question,
    primaryCommand,
  };
}

const DEFAULT_INQUIRY_SELECTION_POLICY: IngressSelectionPolicy<
  InquiryMatchReasonKind
> = {
  reasonKindOrder: ['family', 'alias', 'focus', 'route', 'command', 'noun', 'verb', 'confusion'],
};

function compareInquiryMatches(
  left: InquiryMatch,
  right: InquiryMatch,
  policy: IngressSelectionPolicy<InquiryMatchReasonKind>,
): number {
  return compareIngressEvaluations(
    evaluationForMatch(right),
    evaluationForMatch(left),
    policy,
  );
}

function limitMatches(
  matches: readonly InquiryMatch[],
  topK: number | undefined,
): readonly InquiryMatch[] {
  if (!topK || topK <= 0) {
    return matches;
  }
  return matches.slice(0, topK);
}

function createInquiryMatchRules(
  definition: InquiryFamilyDefinition,
): readonly IngressRuleSpec<InquiryMatchReasonKind>[] {
  // TODO: This ranking layer should choose among ingress affordances only. It
  // should not become the place where semantic ambiguity is "solved" as the
  // package grows; typed locator narrowing and authority-side no-claim outcomes
  // need to take over that burden.
  const focusCaptureKinds = captureKindsForFocusKinds(definition.focusKinds);
  return [
    createExactRule(
      'exact-family',
      'family',
      'familyId',
      definition.id,
      `Exact inquiry-family match for "${definition.id}".`,
    ),
    createPhraseRule(
      'alias-phrases',
      'alias',
      [definition.label, definition.id, ...definition.aliases],
      'Question mentions a declared inquiry alias.',
    ),
    createTokenRule(
      'noun-tokens',
      'noun',
      'question',
      definition.nouns,
      'Question uses a declared inquiry noun.',
    ),
    createTokenRule(
      'verb-tokens',
      'verb',
      'question',
      definition.verbs,
      'Question uses a declared inquiry verb.',
    ),
    createTokenRule(
      'route-tokens',
      'route',
      'question',
      definition.questionRoutes,
      'Question suggests a declared question route.',
    ),
    createTokenRule(
      'command-tokens',
      'command',
      'question',
      definition.primaryCommands,
      'Question lines up with a declared host command.',
      'supporting',
    ),
    createTokenRule(
      'family-tokens',
      'family',
      'familyId',
      tokenize(definition.id),
      'Family hint overlaps declared inquiry-family tokens.',
      'supporting',
    ),
    createFocusRule(
      'focus-kind',
      'focus',
      definition.focusKinds,
      'The provided focus kind is accepted by this inquiry family.',
    ),
    ...(focusCaptureKinds.length > 0
      ? [createCaptureRule(
        'focus-capture',
        'focus',
        focusCaptureKinds,
        'The question contains a recognized focus capture compatible with this inquiry family.',
      )]
      : []),
    ...definition.examples.map((example, index) =>
      createPhraseRule(
        `example-${index}`,
        'command',
        [example.question],
        'Question overlaps a declared inquiry example.',
        'supporting',
      )),
    ...definition.commonConfusions.map((confusion, index) =>
      createPhraseRule(
        `confusion-${index}`,
        'confusion',
        confusion.terms,
        `Question also overlaps a common confusion: ${confusion.detail}`,
        'negative',
      )),
  ];
}

function evaluationForMatch(
  match: InquiryMatch,
) {
  return rehydrateIngressEvaluation(match.traces, match.requiredSatisfied);
}

function matchedTerms(
  traces: readonly IngressMatchTrace<InquiryMatchReasonKind>[],
  reasonKind: InquiryMatchReasonKind,
): readonly string[] {
  return traces
    .filter((trace) => trace.matched && trace.reasonKind === reasonKind && trace.term !== undefined)
    .map((trace) => trace.term!)
    .filter((term, index, values) => values.indexOf(term) === index);
}

function toInquiryMatchReason(
  trace: IngressMatchTrace<InquiryMatchReasonKind>,
): InquiryMatchReason {
  return {
    kind: trace.reasonKind,
    detail: trace.capture ? `${trace.detail} ${trace.capture.detail}` : trace.detail,
    ...(trace.term ? { term: trace.term } : {}),
  };
}
