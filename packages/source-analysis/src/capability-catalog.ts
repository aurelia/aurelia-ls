import type {
  CognitiveQuestionRoute,
  FocusKind,
  MaintenanceQuestionRoute,
  PayloadReadMode,
  PolicyFocusKind,
  PresentationReadMode,
  QuestionRouteFamilies,
  QuestionRoute,
  ReadModeFamilies,
  ReadMode,
} from './inquiry-model.js';
import {
  createReadModeFamilies,
  createQuestionRouteFamilies,
  flattenReadModeFamilies,
  flattenQuestionRouteFamilies,
} from './inquiry-model.js';
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

export const CAPABILITY_FAMILIES = [
  'ingress',
  'regime',
  'session',
  'query',
  'materialize',
] as const;

export const CAPABILITY_PLANNER_KINDS = [
  'discover',
  'plan',
  'repair',
  'profile-describe',
  'session-open',
  'session-close',
  'session-status',
  'session-invalidate',
  'session-refresh',
  'navigate',
  'kind-summary',
  'kind-snapshot',
  'package-audit',
  'route-witness',
  'materialize',
] as const;

export const CAPABILITY_MATCH_REASON_KINDS = [
  'command',
  'alias',
  'noun',
  'verb',
  'focus',
  'route',
  'example',
  'confusion',
] as const;

export type CapabilityFamily =
  typeof CAPABILITY_FAMILIES[number];

export type CapabilityPlannerKind =
  typeof CAPABILITY_PLANNER_KINDS[number];

export type CapabilityMatchReasonKind =
  typeof CAPABILITY_MATCH_REASON_KINDS[number];

export interface CapabilityArgSpec {
  readonly name: string;
  readonly required: boolean;
  readonly summary: string;
  readonly acceptedValues?: readonly string[];
}

export interface CapabilityExample {
  readonly label: string;
  readonly question: string;
  readonly invocation: {
    readonly command: string;
    readonly args: Record<string, unknown>;
  };
}

export interface CapabilityConfusion {
  readonly label: string;
  readonly detail: string;
  readonly terms: readonly string[];
  readonly preferredCommand?: string;
}

export interface CapabilityDefinition {
  readonly id: string;
  readonly command: string;
  readonly plannerKind: CapabilityPlannerKind;
  readonly family: CapabilityFamily;
  readonly label: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly focusKinds: readonly PolicyFocusKind[];
  readonly questionRouteFamilies: QuestionRouteFamilies;
  readonly readModeFamilies: ReadModeFamilies;
  readonly aliases: readonly string[];
  readonly nouns: readonly string[];
  readonly verbs: readonly string[];
  readonly requiredArgs: readonly CapabilityArgSpec[];
  readonly optionalArgs: readonly CapabilityArgSpec[];
  readonly relatedCommands: readonly string[];
  readonly examples: readonly CapabilityExample[];
  readonly commonConfusions: readonly CapabilityConfusion[];
}

export interface CapabilityView {
  readonly id: string;
  readonly command: string;
  readonly plannerKind: CapabilityPlannerKind;
  readonly family: CapabilityFamily;
  readonly label: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly focusKinds: readonly PolicyFocusKind[];
  readonly questionRoutes: readonly QuestionRoute[];
  readonly readModes: readonly ReadMode[];
  readonly aliases: readonly string[];
  readonly requiredArgs: readonly CapabilityArgSpec[];
  readonly optionalArgs: readonly CapabilityArgSpec[];
  readonly relatedCommands: readonly string[];
  readonly examples: readonly CapabilityExample[];
  readonly commonConfusions: readonly CapabilityConfusion[];
}

export interface CapabilityMatchReason {
  readonly kind: CapabilityMatchReasonKind;
  readonly detail: string;
  readonly term?: string;
}

export interface CapabilityMatch {
  readonly capability: CapabilityView;
  readonly reasons: readonly CapabilityMatchReason[];
  readonly traces: readonly IngressMatchTrace<CapabilityMatchReasonKind>[];
  readonly captures: readonly IngressCapture[];
  readonly requiredSatisfied: boolean;
  readonly exactCommand: boolean;
  readonly aliasMatches: readonly string[];
  readonly nounMatches: readonly string[];
  readonly verbMatches: readonly string[];
  readonly routeMatches: readonly string[];
  readonly confusionMatches: readonly string[];
  readonly focusMatched: boolean;
}

export interface DiscoverCapabilitiesInput {
  readonly question?: string;
  readonly focusKind?: FocusKind;
  readonly command?: string;
  readonly includeExamples?: boolean;
  readonly topK?: number;
}

export class CapabilityDescriptor {
  readonly #definition: CapabilityDefinition;
  readonly #rules: readonly IngressRuleSpec<CapabilityMatchReasonKind>[];

  constructor(definition: CapabilityDefinition) {
    this.#definition = definition;
    this.#rules = createCapabilityMatchRules(definition);
  }

  get id(): string {
    return this.#definition.id;
  }

  get command(): string {
    return this.#definition.command;
  }

  get plannerKind(): CapabilityPlannerKind {
    return this.#definition.plannerKind;
  }

  get family(): CapabilityFamily {
    return this.#definition.family;
  }

  get focusKinds(): readonly PolicyFocusKind[] {
    return this.#definition.focusKinds;
  }

  get questionRoutes(): readonly QuestionRoute[] {
    return flattenQuestionRouteFamilies(this.#definition.questionRouteFamilies);
  }

  get readModes(): readonly ReadMode[] {
    return flattenReadModeFamilies(this.#definition.readModeFamilies);
  }

  get requiredArgs(): readonly CapabilityArgSpec[] {
    return this.#definition.requiredArgs;
  }

  get optionalArgs(): readonly CapabilityArgSpec[] {
    return this.#definition.optionalArgs;
  }

  get commonConfusions(): readonly CapabilityConfusion[] {
    return this.#definition.commonConfusions;
  }

  toView(includeExamples = false): CapabilityView {
    return {
      id: this.#definition.id,
      command: this.#definition.command,
      plannerKind: this.#definition.plannerKind,
      family: this.#definition.family,
      label: this.#definition.label,
      summary: this.#definition.summary,
      whenToUse: this.#definition.whenToUse,
      focusKinds: this.#definition.focusKinds,
      questionRoutes: flattenQuestionRouteFamilies(this.#definition.questionRouteFamilies),
      readModes: flattenReadModeFamilies(this.#definition.readModeFamilies),
      aliases: this.#definition.aliases,
      requiredArgs: this.#definition.requiredArgs,
      optionalArgs: this.#definition.optionalArgs,
      relatedCommands: this.#definition.relatedCommands,
      examples: includeExamples ? this.#definition.examples : [],
      commonConfusions: this.#definition.commonConfusions,
    };
  }

  emptyMatch(includeExamples = false): CapabilityMatch {
    return {
      capability: this.toView(includeExamples),
      reasons: [],
      traces: [],
      captures: [],
      requiredSatisfied: true,
      exactCommand: false,
      aliasMatches: [],
      nounMatches: [],
      verbMatches: [],
      routeMatches: [],
      confusionMatches: [],
      focusMatched: false,
    };
  }

  matchContext(
    context: IngressContext,
    includeExamples = false,
  ): CapabilityMatch | null {
    const evaluation = evaluateIngressRules(context, this.#rules);
    if (!evaluation.matched) {
      return null;
    }

    const traces = evaluation.traces;
    const matchedTraces = evaluation.matchedTraces;

    return {
      capability: this.toView(includeExamples),
      reasons: matchedTraces.map(toCapabilityMatchReason),
      traces,
      captures: matchedTraces
        .map((trace) => trace.capture)
        .filter((capture): capture is IngressCapture => capture !== undefined),
      requiredSatisfied: evaluation.requiredSatisfied,
      exactCommand: matchedTraces.some((trace) => trace.ruleId === 'exact-command'),
      aliasMatches: matchedTerms(matchedTraces, 'alias'),
      nounMatches: matchedTerms(matchedTraces, 'noun'),
      verbMatches: matchedTerms(matchedTraces, 'verb'),
      routeMatches: matchedTerms(matchedTraces, 'route'),
      confusionMatches: matchedTerms(matchedTraces, 'confusion'),
      focusMatched: matchedTraces.some((trace) => trace.reasonKind === 'focus' && trace.importance !== 'negative'),
    };
  }
}

export class CapabilityCatalog {
  readonly #descriptors: readonly CapabilityDescriptor[];
  readonly #byCommand = new Map<string, CapabilityDescriptor>();
  readonly #selectionPolicy: IngressSelectionPolicy<CapabilityMatchReasonKind>;

  constructor(
    definitions: readonly CapabilityDefinition[],
    selectionPolicy: IngressSelectionPolicy<CapabilityMatchReasonKind> = DEFAULT_CAPABILITY_SELECTION_POLICY,
  ) {
    this.#selectionPolicy = selectionPolicy;
    this.#descriptors = definitions.map((definition) => new CapabilityDescriptor(definition));
    for (const descriptor of this.#descriptors) {
      this.#byCommand.set(descriptor.command, descriptor);
    }
  }

  list(includeExamples = false): readonly CapabilityView[] {
    return this.#descriptors
      .map((descriptor) => descriptor.toView(includeExamples))
      .sort((left, right) => left.command.localeCompare(right.command));
  }

  resolve(command: string): CapabilityDescriptor | undefined {
    return this.#byCommand.get(command);
  }

  isAmbiguousTie(
    left: CapabilityMatch,
    right: CapabilityMatch,
  ): boolean {
    return compareCapabilityMatches(left, right, this.#selectionPolicy) === 0;
  }

  discover(input: DiscoverCapabilitiesInput = {}): readonly CapabilityMatch[] {
    if (!input.question && !input.focusKind && !input.command) {
      return limitMatches(
        this.#descriptors
          .map((descriptor) => descriptor.emptyMatch(input.includeExamples))
          .sort((left, right) => left.capability.command.localeCompare(right.capability.command)),
        input.topK,
      );
    }

    const context = createIngressContext({
      question: input.question,
      command: input.command,
      focusKind: input.focusKind,
    });
    const matches = this.#descriptors
      .map((descriptor) => descriptor.matchContext(context, input.includeExamples))
      .filter((match): match is CapabilityMatch => match !== null);
    const sorted = [...matches].sort((left, right) =>
      compareCapabilityMatches(left, right, this.#selectionPolicy)
      || left.capability.command.localeCompare(right.capability.command),
    );
    return limitMatches(sorted, input.topK);
  }
}

export function createDefaultCapabilityCatalog(): CapabilityCatalog {
  return new CapabilityCatalog(DEFAULT_CAPABILITIES);
}

const DEFAULT_CAPABILITIES: readonly CapabilityDefinition[] = [
  ingressCapability({
    id: 'describe.capabilities',
    command: 'describe.capabilities',
    plannerKind: 'discover',
    label: 'Describe source-analysis capabilities',
    summary: 'List the commands, focus kinds, and examples that fit a question.',
    whenToUse: 'Use this when you want the API to teach you what it can do before choosing a command.',
    aliases: ['describe capabilities', 'what can you do', 'discover capabilities', 'help me choose'],
    nouns: ['capabilities', 'commands', 'help', 'catalog', 'surface'],
    verbs: ['describe', 'discover', 'list', 'teach', 'show'],
    questionRouteFamilies: cognitiveRoutes('search'),
    examples: [
      example(
        'general capability discovery',
        'What can source-analysis do for package tech debt questions?',
        'describe.capabilities',
        { question: 'What can source-analysis do for package tech debt questions?' },
      ),
    ],
    requiredArgs: [],
    optionalArgs: [
      optionalArg('question', 'Optional natural-language question used to filter relevant capabilities.'),
      optionalArg('focusKind', 'Optional focus hint such as package, file, or type.'),
      optionalArg('topK', 'Maximum number of capabilities to return.'),
      optionalArg('includeExamples', 'Whether to include example invocations in the response.'),
    ],
    relatedCommands: ['plan.question', 'repair.command'],
    commonConfusions: [],
  }),
  ingressCapability({
    id: 'plan.question',
    command: 'plan.question',
    plannerKind: 'plan',
    label: 'Plan a question into a canonical invocation',
    summary: 'Map a natural-language question into the most likely source-analysis command and args.',
    whenToUse: 'Use this when you know your question but do not want to guess the command or arg shape.',
    aliases: ['plan question', 'which command should i use', 'map this question', 'choose the api'],
    nouns: ['question', 'plan', 'invocation', 'command', 'api'],
    verbs: ['plan', 'map', 'choose', 'route'],
    questionRouteFamilies: cognitiveRoutes('route'),
    examples: [
      example(
        'package audit planning',
        'Audit @aurelia-ls/source-analysis for tech debt.',
        'plan.question',
        { question: 'Audit @aurelia-ls/source-analysis for tech debt.' },
      ),
    ],
    requiredArgs: [requiredArg('question', 'Natural-language question to translate into an invocation.')],
    optionalArgs: [
      optionalArg('sessionId', 'Optional session to reuse when the planned command needs snapshots.'),
      optionalArg('focusKind', 'Optional explicit focus kind to avoid inference.'),
      optionalArg('focusValue', 'Optional explicit focus value to avoid inference.'),
    ],
    relatedCommands: ['describe.capabilities', 'repair.command'],
    commonConfusions: [],
  }),
  ingressCapability({
    id: 'repair.command',
    command: 'repair.command',
    plannerKind: 'repair',
    label: 'Repair a wrong command or invocation shape',
    summary: 'Explain what is wrong with a command attempt and propose the corrected command and args.',
    whenToUse: 'Use this when you already tried a command name or arg shape and want structured repair guidance.',
    aliases: ['repair command', 'fix invocation', 'wrong labels', 'wrong args', 'did you mean'],
    nouns: ['repair', 'command', 'invocation', 'args', 'labels'],
    verbs: ['repair', 'fix', 'correct', 'reroute'],
    questionRouteFamilies: cognitiveRoutes('route'),
    examples: [
      example(
        'command repair',
        'Repair query.audit.pkg for @aurelia-ls/source-analysis.',
        'repair.command',
        { command: 'query.audit.pkg', args: { packageName: '@aurelia-ls/source-analysis' } },
      ),
    ],
    requiredArgs: [],
    optionalArgs: [
      optionalArg('command', 'The attempted command name.'),
      optionalArg('args', 'The attempted command args.'),
      optionalArg('question', 'Optional natural-language intent if the command alone is not enough.'),
    ],
    relatedCommands: ['describe.capabilities', 'plan.question'],
    commonConfusions: [],
  }),
  regimeCapability({
    id: 'describe.profile',
    command: 'describe.profile',
    plannerKind: 'profile-describe',
    label: 'Describe profile regime and analyzability posture',
    summary: 'Resolve the active profile, inspect current snapshot support, and surface named open fronts.',
    whenToUse: 'Use this when you need to know which regime is active, whether current snapshots align with it, and which excluded or support boundaries remain open.',
    aliases: ['describe profile', 'what regime am i in', 'analyzability posture', 'open fronts', 'excluded boundaries'],
    nouns: ['profile', 'regime', 'analyzability', 'posture', 'boundary', 'frontier', 'excluded', 'support'],
    verbs: ['describe', 'inspect', 'explain', 'surface'],
    questionRouteFamilies: cognitiveRoutes('search', 'route'),
    focusKinds: [],
    requiredArgs: [],
    optionalArgs: [
      optionalArg('repoPath', 'Optional repo checkout to analyze. Defaults to the current repo when omitted.'),
      optionalArg('target', 'Optional explicit target name for the snapshot space.'),
      optionalArg('profilePath', 'Optional explicit profile path inside the analyzed repo.'),
    ],
    examples: [
      example(
        'regime posture',
        'How analyzable is this repo under the current regime?',
        'describe.profile',
        {},
      ),
    ],
    relatedCommands: ['session.refresh', 'materializeSnapshots'],
    commonConfusions: [],
  }),
  sessionCapability({
    id: 'session.open',
    command: 'session.open',
    plannerKind: 'session-open',
    label: 'Open a hosted source-analysis session',
    summary: 'Create or reuse a hosted session with cached snapshots and optional warm TypeScript programs.',
    whenToUse: 'Use this before hosted refreshes or snapshot-backed queries when you need a reusable session.',
    aliases: ['open session', 'start session', 'create hosted session'],
    nouns: ['session', 'host', 'repo', 'target'],
    verbs: ['open', 'start', 'create'],
    questionRouteFamilies: maintenanceRoutes('refresh'),
    requiredArgs: [requiredArg('repoPath', 'Repo checkout to analyze.')],
    optionalArgs: [
      optionalArg('sessionId', 'Optional session id to reuse.'),
      optionalArg('target', 'Optional target name for the snapshot space.'),
      optionalArg('warmPrograms', 'Whether the session should reuse warm TypeScript programs.'),
    ],
    examples: [
      example(
        'open hosted session',
        'Open a source-analysis session for C:/projects/aurelia-ls2.',
        'session.open',
        { repoPath: 'C:/projects/aurelia-ls2', warmPrograms: true },
      ),
    ],
    relatedCommands: ['session.status', 'session.refresh'],
    commonConfusions: [],
  }),
  sessionCapability({
    id: 'session.close',
    command: 'session.close',
    plannerKind: 'session-close',
    label: 'Close a hosted source-analysis session',
    summary: 'Dispose a hosted session and release its cached analysis state.',
    whenToUse: 'Use this when a hosted session is no longer needed.',
    aliases: ['close session', 'dispose session'],
    nouns: ['session'],
    verbs: ['close', 'dispose'],
    questionRouteFamilies: maintenanceRoutes('refresh'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id to close.')],
    optionalArgs: [],
    examples: [
      example(
        'close session',
        'Close session sa-1.',
        'session.close',
        { sessionId: 'sa-1' },
      ),
    ],
    relatedCommands: ['session.status'],
    commonConfusions: [],
  }),
  sessionCapability({
    id: 'session.status',
    command: 'session.status',
    plannerKind: 'session-status',
    label: 'Show hosted session status',
    summary: 'List session cache state, dirty kinds, and refresh times.',
    whenToUse: 'Use this when you need to know whether a session is warm, dirty, or ready for reuse.',
    aliases: ['session status', 'list sessions', 'session cache state'],
    nouns: ['session', 'status', 'cache', 'dirty'],
    verbs: ['show', 'list', 'inspect'],
    questionRouteFamilies: cognitiveRoutes('search'),
    requiredArgs: [],
    optionalArgs: [optionalArg('sessionId', 'Optional session id to inspect instead of listing all sessions.')],
    examples: [
      example(
        'session status',
        'Show source-analysis session status.',
        'session.status',
        {},
      ),
    ],
    relatedCommands: ['session.open', 'session.refresh', 'session.invalidate'],
    commonConfusions: [],
  }),
  sessionCapability({
    id: 'session.invalidate',
    command: 'session.invalidate',
    plannerKind: 'session-invalidate',
    label: 'Invalidate hosted session state',
    summary: 'Mark files or the whole project dirty so the next query refreshes the right analyzers.',
    whenToUse: 'Use this after source edits or file watcher events when you want hosted queries to refresh incrementally.',
    aliases: ['invalidate session', 'mark dirty', 'watcher delta'],
    nouns: ['invalidate', 'dirty', 'files', 'project'],
    verbs: ['invalidate', 'mark', 'dirty'],
    questionRouteFamilies: maintenanceRoutes('diff'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id to invalidate.')],
    optionalArgs: [
      optionalArg('files', 'Optional repo-relative files to invalidate instead of the whole project.'),
      optionalArg('scope', 'Optional invalidation scope, either files or project.', ['files', 'project']),
    ],
    examples: [
      example(
        'file invalidation',
        'Invalidate host/runtime.ts in session sa-1.',
        'session.invalidate',
        { sessionId: 'sa-1', scope: 'files', files: ['packages/source-analysis/src/host/runtime.ts'] },
      ),
    ],
    relatedCommands: ['session.refresh', 'query.audit.package', 'query.route.witness'],
    commonConfusions: [],
  }),
  sessionCapability({
    id: 'session.refresh',
    command: 'session.refresh',
    plannerKind: 'session-refresh',
    label: 'Refresh hosted analysis kinds',
    summary: 'Refresh dirty or requested analysis snapshots inside a hosted session.',
    whenToUse: 'Use this when you want fresh deps, typerefs, or exports snapshots before querying or materializing.',
    aliases: ['refresh session', 'refresh snapshots', 'rebuild analysis'],
    nouns: ['refresh', 'snapshots', 'deps', 'typerefs', 'exports'],
    verbs: ['refresh', 'rebuild', 'update'],
    questionRouteFamilies: maintenanceRoutes('refresh'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id to refresh.')],
    optionalArgs: [
      optionalArg('kinds', 'Optional subset of kinds to refresh.', ['deps', 'typerefs', 'exports']),
      optionalArg('force', 'Whether to force a refresh even if the session is already warm.'),
    ],
    examples: [
      example(
        'refresh all kinds',
        'Refresh all source-analysis snapshots in session sa-1.',
        'session.refresh',
        { sessionId: 'sa-1' },
      ),
    ],
    relatedCommands: ['session.invalidate', 'materializeSnapshots'],
    commonConfusions: [],
  }),
  // TODO: These deps/typerefs/exports commands are compatibility shims for the
  // original three ad-hoc tools. Do not grow new projection-shaped command
  // families here. New capability work should land in shared authority/evaluator
  // surfaces first and only materialize outward when a stable projection is
  // genuinely needed.
  queryCapability({
    id: 'query.deps.summary',
    command: 'query.deps.summary',
    plannerKind: 'kind-summary',
    label: 'Summarize dependency graph posture',
    summary: 'Return dependency graph summary counts, warnings, and current generation metadata.',
    whenToUse: 'Use this for dependency coverage or graph health, not for raw edge export.',
    aliases: ['dependency summary', 'deps summary', 'import overview'],
    nouns: ['dependencies', 'dependency', 'imports', 'summary', 'overview'],
    verbs: ['summarize', 'inspect', 'show'],
    questionRouteFamilies: cognitiveRoutes('inventory'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id with snapshots to query.')],
    optionalArgs: [optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.')],
    relatedCommands: ['query.deps.snapshot', 'query.audit.package'],
    examples: [
      example(
        'dependency overview',
        'Show the dependency summary for the current session.',
        'query.deps.summary',
        { sessionId: 'sa-1' },
      ),
    ],
    commonConfusions: [],
  }),
  queryCapability({
    id: 'query.deps.snapshot',
    command: 'query.deps.snapshot',
    plannerKind: 'kind-snapshot',
    label: 'Read the raw dependency snapshot',
    summary: 'Return the full deps snapshot JSON for downstream tooling or machine processing.',
    whenToUse: 'Use this when you need raw machine-readable dependency facts instead of a summary.',
    aliases: ['dependency snapshot', 'deps snapshot', 'raw deps json'],
    nouns: ['dependencies', 'dependency', 'imports', 'snapshot', 'json'],
    verbs: ['read', 'materialize', 'fetch'],
    questionRouteFamilies: maintenanceRoutes('materialize'),
    readModeFamilies: payloadReadModes('snapshot'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id with snapshots to query.')],
    optionalArgs: [optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.')],
    relatedCommands: ['query.deps.summary', 'materializeSnapshots'],
    examples: [
      example(
        'raw dependency snapshot',
        'Give me the deps snapshot JSON for this session.',
        'query.deps.snapshot',
        { sessionId: 'sa-1' },
      ),
    ],
    commonConfusions: [],
  }),
  queryCapability({
    id: 'query.typerefs.summary',
    command: 'query.typerefs.summary',
    plannerKind: 'kind-summary',
    label: 'Summarize type-reference posture',
    summary: 'Return type declaration and reference summary counts plus warnings.',
    whenToUse: 'Use this when you want a high-level picture of type-reference density or coverage.',
    aliases: ['type refs summary', 'typerefs summary', 'type reference overview'],
    nouns: ['types', 'typerefs', 'references', 'summary', 'overview'],
    verbs: ['summarize', 'inspect', 'show'],
    questionRouteFamilies: cognitiveRoutes('inventory'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id with snapshots to query.')],
    optionalArgs: [optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.')],
    relatedCommands: ['query.typerefs.snapshot', 'query.route.witness'],
    examples: [
      example(
        'type reference overview',
        'Show the typerefs summary for this session.',
        'query.typerefs.summary',
        { sessionId: 'sa-1' },
      ),
    ],
    commonConfusions: [],
  }),
  queryCapability({
    id: 'query.typerefs.snapshot',
    command: 'query.typerefs.snapshot',
    plannerKind: 'kind-snapshot',
    label: 'Read the raw type-reference snapshot',
    summary: 'Return the full typerefs snapshot JSON for downstream tooling or machine processing.',
    whenToUse: 'Use this when you need declaration and reference detail instead of summary counts.',
    aliases: ['type refs snapshot', 'typerefs snapshot', 'raw typerefs json'],
    nouns: ['types', 'typerefs', 'references', 'snapshot', 'json'],
    verbs: ['read', 'materialize', 'fetch'],
    questionRouteFamilies: maintenanceRoutes('materialize'),
    readModeFamilies: payloadReadModes('snapshot'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id with snapshots to query.')],
    optionalArgs: [optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.')],
    relatedCommands: ['query.typerefs.summary', 'materializeSnapshots'],
    examples: [
      example(
        'raw typeref snapshot',
        'Give me the raw typerefs snapshot.',
        'query.typerefs.snapshot',
        { sessionId: 'sa-1' },
      ),
    ],
    commonConfusions: [],
  }),
  queryCapability({
    id: 'query.exports.summary',
    command: 'query.exports.summary',
    plannerKind: 'kind-summary',
    label: 'Summarize export surface posture',
    summary: 'Return public export surface counts and warnings for the current session.',
    whenToUse: 'Use this when you want to inspect package export posture, not route a specific symbol.',
    aliases: ['exports summary', 'public api summary', 'export overview'],
    nouns: ['exports', 'public', 'api', 'summary', 'overview'],
    verbs: ['summarize', 'inspect', 'show'],
    questionRouteFamilies: cognitiveRoutes('inventory'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id with snapshots to query.')],
    optionalArgs: [optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.')],
    relatedCommands: ['query.exports.snapshot', 'query.audit.package'],
    examples: [
      example(
        'export surface overview',
        'Show the exports summary for this session.',
        'query.exports.summary',
        { sessionId: 'sa-1' },
      ),
    ],
    commonConfusions: [],
  }),
  queryCapability({
    id: 'query.exports.snapshot',
    command: 'query.exports.snapshot',
    plannerKind: 'kind-snapshot',
    label: 'Read the raw exports snapshot',
    summary: 'Return the full exports snapshot JSON for downstream tooling or machine processing.',
    whenToUse: 'Use this when you need raw public surface records rather than summary counts.',
    aliases: ['exports snapshot', 'raw exports json', 'public api snapshot'],
    nouns: ['exports', 'public', 'api', 'snapshot', 'json'],
    verbs: ['read', 'materialize', 'fetch'],
    questionRouteFamilies: maintenanceRoutes('materialize'),
    readModeFamilies: payloadReadModes('snapshot'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id with snapshots to query.')],
    optionalArgs: [optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.')],
    relatedCommands: ['query.exports.summary', 'materializeSnapshots'],
    examples: [
      example(
        'raw export snapshot',
        'Give me the exports snapshot.',
        'query.exports.snapshot',
        { sessionId: 'sa-1' },
      ),
    ],
    commonConfusions: [],
  }),
  queryCapability({
    id: 'query.navigate',
    command: 'query.navigate',
    plannerKind: 'navigate',
    label: 'Navigate a package, file, symbol, type, or export',
    summary: 'Return a structured navigation episode that orients the caller to a focused workspace target or declaration.',
    whenToUse: 'Use this when you need a grounded starting point, declaration location, neighborhood view, or export route before editing.',
    aliases: ['navigate workspace', 'orient me', 'package overview', 'type neighborhood', 'file neighborhood', 'symbol declaration'],
    nouns: ['navigate', 'orientation', 'package', 'file', 'symbol', 'type', 'export', 'overview', 'neighborhood', 'declaration', 'definition', 'implementation'],
    verbs: ['navigate', 'orient', 'inspect', 'show', 'explore', 'find', 'locate', 'defined', 'declared', 'implemented'],
    questionRouteFamilies: cognitiveRoutes('join', 'route', 'search'),
    focusKinds: ['package', 'file', 'symbol', 'type', 'export'],
    requiredArgs: [
      requiredArg('sessionId', 'Hosted session id with snapshots to query.'),
      requiredArg('focusKind', 'The workspace focus kind.', ['package', 'file', 'symbol', 'type', 'export']),
      requiredArg('focusValue', 'Package name, repo-relative file path, symbol name, type name, or export name to navigate.'),
    ],
    optionalArgs: [
      optionalArg('questionRoute', 'Optional route emphasis.', ['search', 'join', 'route']),
      optionalArg('readMode', 'Presentation style for the answer document.'),
      optionalArg('consumer', 'Whether to optimize the answer for a human or machine caller.', ['human', 'machine']),
      optionalArg('renderStyle', 'Optional rendered projection.', ['answer', 'plain-text', 'json-document']),
      optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.'),
    ],
    relatedCommands: ['query.audit.package', 'query.route.witness', 'query.exports.summary'],
    examples: [
      example(
        'package orientation',
        'Orient me to @aurelia-ls/source-analysis before I edit it.',
        'query.navigate',
        { sessionId: 'sa-1', focusKind: 'package', focusValue: '@aurelia-ls/source-analysis', questionRoute: 'join' },
      ),
    ],
    commonConfusions: [
      {
        label: 'why alive',
        detail: 'If you already know the file or type and need a proof chain for reachability, a route witness fits better.',
        terms: ['why alive', 'reachable', 'proof'],
        preferredCommand: 'query.route.witness',
      },
    ],
  }),
  queryCapability({
    id: 'query.audit.package',
    command: 'query.audit.package',
    plannerKind: 'package-audit',
    label: 'Audit a package for integration and architecture red flags',
    summary: 'Return a package self-audit with reachability, exercise, structural, and uncovered-file findings.',
    whenToUse: 'Use this for package-level tech debt, dead-code suspicion, under-integration, or self-improvement questions.',
    aliases: ['package audit', 'tech debt', 'dead code', 'red flags', 'self audit', 'layer cycles', 'dependency seams'],
    nouns: ['package', 'audit', 'debt', 'dead', 'red', 'flags', 'coverage', 'integration', 'cycle', 'layer', 'seam', 'coupling', 'architecture'],
    verbs: ['audit', 'inspect', 'find', 'surface', 'explain', 'trace'],
    questionRouteFamilies: cognitiveRoutes('inventory'),
    focusKinds: ['package'],
    requiredArgs: [
      requiredArg('sessionId', 'Hosted session id with snapshots to query.'),
      requiredArg('packageName', 'Package name to audit, such as @aurelia-ls/source-analysis.'),
    ],
    optionalArgs: [
      optionalArg('readMode', 'Presentation style for the answer document.'),
      optionalArg('consumer', 'Whether to optimize the answer for a human or machine caller.', ['human', 'machine']),
      optionalArg('renderStyle', 'Optional rendered projection.', ['answer', 'plain-text', 'json-document']),
      optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.'),
    ],
    relatedCommands: ['query.route.witness', 'query.exports.summary', 'query.deps.summary'],
    examples: [
      example(
        'package self-audit',
        'Audit @aurelia-ls/source-analysis for tech debt.',
        'query.audit.package',
        { sessionId: 'sa-1', packageName: '@aurelia-ls/source-analysis' },
      ),
      example(
        'cycle seam scan',
        'Which package-internal dependency seams keep @aurelia-ls/source-analysis in a source-area cycle?',
        'query.audit.package',
        { sessionId: 'sa-1', packageName: '@aurelia-ls/source-analysis' },
      ),
    ],
    commonConfusions: [
      {
        label: 'file or type focus',
        detail: 'This audit works at package scope. File or type “why is this alive?” questions fit route witnesses better.',
        terms: ['file', 'type', 'alive', 'why'],
        preferredCommand: 'query.route.witness',
      },
    ],
  }),
  queryCapability({
    id: 'query.route.witness',
    command: 'query.route.witness',
    plannerKind: 'route-witness',
    label: 'Explain why a file or type is alive',
    summary: 'Return concrete route witnesses that justify why a file or type remains reachable.',
    whenToUse: 'Use this when you need proof chains like “why is this file alive?” or “which route keeps this type reachable?”.',
    aliases: ['why alive', 'route witness', 'reachable proof', 'why is this alive'],
    nouns: ['route', 'witness', 'alive', 'reachable', 'proof', 'file', 'type'],
    verbs: ['explain', 'prove', 'show', 'trace'],
    questionRouteFamilies: cognitiveRoutes('route'),
    focusKinds: ['file', 'type'],
    requiredArgs: [
      requiredArg('sessionId', 'Hosted session id with snapshots to query.'),
      requiredArg('focusKind', 'Whether the focus is a file or a type.', ['file', 'type']),
      requiredArg('focusValue', 'Repo-relative file path or type name to trace.'),
    ],
    optionalArgs: [
      optionalArg('readMode', 'Presentation style for the answer document.'),
      optionalArg('consumer', 'Whether to optimize the answer for a human or machine caller.', ['human', 'machine']),
      optionalArg('renderStyle', 'Optional rendered projection.', ['answer', 'plain-text', 'json-document']),
      optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before reading them.'),
    ],
    relatedCommands: ['query.audit.package', 'query.typerefs.summary', 'query.deps.summary'],
    examples: [
      example(
        'file witness',
        'Why is packages/source-analysis/src/refresh.ts alive?',
        'query.route.witness',
        { sessionId: 'sa-1', focusKind: 'file', focusValue: 'packages/source-analysis/src/refresh.ts' },
      ),
    ],
    commonConfusions: [
      {
        label: 'package tech debt',
        detail: 'Package-wide red-flag questions fit the package audit surface better than a route witness.',
        terms: ['package', 'audit', 'debt', 'red flags'],
        preferredCommand: 'query.audit.package',
      },
    ],
  }),
  materializeCapability({
    id: 'materializeSnapshots',
    command: 'materializeSnapshots',
    plannerKind: 'materialize',
    label: 'Write snapshot files to disk',
    summary: 'Materialize deps, typerefs, or exports snapshots to JSON files on disk.',
    whenToUse: 'Use this when another tool or workflow wants stable snapshot files instead of direct host responses.',
    aliases: ['materialize snapshots', 'write snapshots', 'export json files'],
    nouns: ['materialize', 'snapshots', 'json', 'files', 'disk'],
    verbs: ['materialize', 'write', 'export'],
    questionRouteFamilies: maintenanceRoutes('materialize'),
    requiredArgs: [requiredArg('sessionId', 'Hosted session id whose snapshots should be written.')],
    optionalArgs: [
      optionalArg('kinds', 'Optional subset of kinds to materialize.', ['deps', 'typerefs', 'exports']),
      optionalArg('outDir', 'Optional output directory.'),
      optionalArg('refreshIfNeeded', 'Whether to refresh dirty snapshots before writing them.'),
    ],
    examples: [
      example(
        'write snapshots',
        'Materialize all snapshots for session sa-1.',
        'materializeSnapshots',
        { sessionId: 'sa-1' },
      ),
    ],
    relatedCommands: ['session.refresh', 'query.deps.snapshot', 'query.typerefs.snapshot', 'query.exports.snapshot'],
    commonConfusions: [],
  }),
];

function ingressCapability(
  definition: Omit<CapabilityDefinition, 'family' | 'focusKinds' | 'questionRouteFamilies' | 'readModeFamilies'> & {
    readonly focusKinds?: readonly PolicyFocusKind[];
    readonly questionRouteFamilies?: QuestionRouteFamilies;
    readonly readModeFamilies?: ReadModeFamilies;
  },
): CapabilityDefinition {
  return {
    family: 'ingress',
    focusKinds: definition.focusKinds ?? ['repo', 'capability'],
    questionRouteFamilies: createQuestionRouteFamilies(definition.questionRouteFamilies),
    readModeFamilies: createReadModeFamilies(
      definition.readModeFamilies ?? presentationReadModes('summary-card', 'focus-card', 'supporting-evidence'),
    ),
    ...definition,
  };
}

function sessionCapability(
  definition: Omit<CapabilityDefinition, 'family' | 'focusKinds' | 'questionRouteFamilies' | 'readModeFamilies'> & {
    readonly questionRouteFamilies?: QuestionRouteFamilies;
  },
): CapabilityDefinition {
  return {
    family: 'session',
    focusKinds: ['session', 'repo'],
    questionRouteFamilies: createQuestionRouteFamilies(definition.questionRouteFamilies),
    readModeFamilies: createReadModeFamilies(),
    ...definition,
  };
}

function regimeCapability(
  definition: Omit<CapabilityDefinition, 'family' | 'focusKinds' | 'questionRouteFamilies' | 'readModeFamilies'> & {
    readonly focusKinds?: readonly PolicyFocusKind[];
    readonly questionRouteFamilies?: QuestionRouteFamilies;
    readonly readModeFamilies?: ReadModeFamilies;
  },
): CapabilityDefinition {
  return {
    family: 'regime',
    focusKinds: definition.focusKinds ?? ['repo'],
    questionRouteFamilies: createQuestionRouteFamilies(definition.questionRouteFamilies),
    readModeFamilies: createReadModeFamilies(
      definition.readModeFamilies ?? presentationReadModes('summary-card', 'focus-card', 'supporting-evidence'),
    ),
    ...definition,
  };
}

function queryCapability(
  definition: Omit<CapabilityDefinition, 'family' | 'focusKinds' | 'questionRouteFamilies' | 'readModeFamilies' | 'examples'> & {
    readonly focusKinds?: readonly PolicyFocusKind[];
    readonly questionRouteFamilies?: QuestionRouteFamilies;
    readonly readModeFamilies?: ReadModeFamilies;
    readonly examples: readonly CapabilityExample[];
  },
): CapabilityDefinition {
  return {
    family: 'query',
    focusKinds: definition.focusKinds ?? ['repo'],
    questionRouteFamilies: createQuestionRouteFamilies(definition.questionRouteFamilies),
    readModeFamilies: createReadModeFamilies(
      definition.readModeFamilies ?? presentationReadModes('summary-card', 'focus-card', 'supporting-evidence'),
    ),
    ...definition,
  };
}

function materializeCapability(
  definition: Omit<CapabilityDefinition, 'family' | 'focusKinds' | 'questionRouteFamilies' | 'readModeFamilies'> & {
    readonly questionRouteFamilies?: QuestionRouteFamilies;
  },
): CapabilityDefinition {
  return {
    family: 'materialize',
    focusKinds: ['session', 'repo'],
    questionRouteFamilies: createQuestionRouteFamilies(definition.questionRouteFamilies),
    readModeFamilies: createReadModeFamilies(payloadReadModes('snapshot')),
    ...definition,
  };
}

function cognitiveRoutes(
  ...routes: readonly CognitiveQuestionRoute[]
): QuestionRouteFamilies {
  return { cognitive: routes };
}

function maintenanceRoutes(
  ...routes: readonly MaintenanceQuestionRoute[]
): QuestionRouteFamilies {
  return { maintenance: routes };
}

function presentationReadModes(
  ...modes: readonly PresentationReadMode[]
): ReadModeFamilies {
  return { presentation: modes };
}

function payloadReadModes(
  ...modes: readonly PayloadReadMode[]
): ReadModeFamilies {
  return { payload: modes };
}

function requiredArg(
  name: string,
  summary: string,
  acceptedValues?: readonly string[],
): CapabilityArgSpec {
  return {
    name,
    required: true,
    summary,
    ...(acceptedValues ? { acceptedValues } : {}),
  };
}

function optionalArg(
  name: string,
  summary: string,
  acceptedValues?: readonly string[],
): CapabilityArgSpec {
  return {
    name,
    required: false,
    summary,
    ...(acceptedValues ? { acceptedValues } : {}),
  };
}

function example(
  label: string,
  question: string,
  command: string,
  args: Record<string, unknown>,
): CapabilityExample {
  return {
    label,
    question,
    invocation: {
      command,
      args,
    },
  };
}

const DEFAULT_CAPABILITY_SELECTION_POLICY: IngressSelectionPolicy<
  CapabilityMatchReasonKind
> = {
  reasonKindOrder: ['command', 'alias', 'focus', 'route', 'noun', 'verb', 'example', 'confusion'],
};

function compareCapabilityMatches(
  left: CapabilityMatch,
  right: CapabilityMatch,
  policy: IngressSelectionPolicy<CapabilityMatchReasonKind>,
): number {
  return compareIngressEvaluations(
    evaluationForMatch(right),
    evaluationForMatch(left),
    policy,
  );
}

function limitMatches(
  matches: readonly CapabilityMatch[],
  topK: number | undefined,
): readonly CapabilityMatch[] {
  if (!topK || topK <= 0) {
    return matches;
  }
  return matches.slice(0, topK);
}

function createCapabilityMatchRules(
  definition: CapabilityDefinition,
): readonly IngressRuleSpec<CapabilityMatchReasonKind>[] {
  // TODO: Keep this matcher strictly at the ingress edge. As typed locators,
  // candidate sets, and adjudication surfaces land, ambiguity should be pushed
  // down into shared authority rather than absorbed by more noun/verb/alias
  // matching and ranking rules here.
  const focusCaptureKinds = captureKindsForFocusKinds(definition.focusKinds);
  return [
    createExactRule(
      'exact-command',
      'command',
      'command',
      definition.command,
      `Exact command match for "${definition.command}".`,
    ),
    createPhraseRule(
      'alias-phrases',
      'alias',
      [definition.label, definition.command, ...definition.aliases],
      'Question mentions a declared capability alias.',
    ),
    createTokenRule(
      'noun-tokens',
      'noun',
      'question',
      definition.nouns,
      'Question contains a declared capability noun.',
    ),
    createTokenRule(
      'verb-tokens',
      'verb',
      'question',
      definition.verbs,
      'Question contains a declared capability verb.',
    ),
    createTokenRule(
      'route-tokens',
      'route',
      'question',
      flattenQuestionRouteFamilies(definition.questionRouteFamilies),
      'Question aligns with a declared question route.',
    ),
    createTokenRule(
      'command-tokens',
      'command',
      'command',
      tokenize(definition.command),
      'Command hint overlaps declared command tokens.',
      'supporting',
    ),
    createFocusRule(
      'focus-kind',
      'focus',
      definition.focusKinds,
      'The provided focus kind is supported by this capability.',
    ),
    ...(focusCaptureKinds.length > 0
      ? [createCaptureRule(
        'focus-capture',
        'focus',
        focusCaptureKinds,
        'The question contains a recognized focus capture compatible with this capability.',
      )]
      : []),
    ...definition.examples.map((example, index) =>
      createPhraseRule(
        `example-${index}`,
        'example',
        [example.question],
        'Question overlaps a declared capability example.',
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
  match: CapabilityMatch,
) {
  return rehydrateIngressEvaluation(match.traces, match.requiredSatisfied);
}

function matchedTerms(
  traces: readonly IngressMatchTrace<CapabilityMatchReasonKind>[],
  reasonKind: CapabilityMatchReasonKind,
): readonly string[] {
  return traces
    .filter((trace) => trace.matched && trace.reasonKind === reasonKind && trace.term !== undefined)
    .map((trace) => trace.term!)
    .filter((term, index, values) => values.indexOf(term) === index);
}

function toCapabilityMatchReason(
  trace: IngressMatchTrace<CapabilityMatchReasonKind>,
): CapabilityMatchReason {
  return {
    kind: trace.reasonKind,
    detail: trace.capture ? `${trace.detail} ${trace.capture.detail}` : trace.detail,
    ...(trace.term ? { term: trace.term } : {}),
  };
}
