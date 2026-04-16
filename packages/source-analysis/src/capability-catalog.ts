import type {
  SourceAnalysisFocusKind,
  SourceAnalysisQuestionRoute,
  SourceAnalysisReadMode,
} from './query-model.js';
import {
  intersect,
  matchPhrases,
  matchTokens,
  normalizePhrase,
  tokenize,
} from './ingress-language.js';

export const SOURCE_ANALYSIS_CAPABILITY_FAMILIES = [
  'ingress',
  'session',
  'query',
  'materialize',
] as const;

export const SOURCE_ANALYSIS_CAPABILITY_PLANNER_KINDS = [
  'discover',
  'plan',
  'repair',
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

export const SOURCE_ANALYSIS_CAPABILITY_MATCH_REASON_KINDS = [
  'command',
  'alias',
  'noun',
  'verb',
  'focus',
  'route',
  'example',
] as const;

export type SourceAnalysisCapabilityFamily =
  typeof SOURCE_ANALYSIS_CAPABILITY_FAMILIES[number];

export type SourceAnalysisCapabilityPlannerKind =
  typeof SOURCE_ANALYSIS_CAPABILITY_PLANNER_KINDS[number];

export type SourceAnalysisCapabilityMatchReasonKind =
  typeof SOURCE_ANALYSIS_CAPABILITY_MATCH_REASON_KINDS[number];

export interface SourceAnalysisCapabilityArgSpec {
  readonly name: string;
  readonly required: boolean;
  readonly summary: string;
  readonly acceptedValues?: readonly string[];
}

export interface SourceAnalysisCapabilityExample {
  readonly label: string;
  readonly question: string;
  readonly invocation: {
    readonly command: string;
    readonly args: Record<string, unknown>;
  };
}

export interface SourceAnalysisCapabilityConfusion {
  readonly label: string;
  readonly detail: string;
  readonly terms: readonly string[];
  readonly preferredCommand?: string;
}

export interface SourceAnalysisCapabilityDefinition {
  readonly id: string;
  readonly command: string;
  readonly plannerKind: SourceAnalysisCapabilityPlannerKind;
  readonly family: SourceAnalysisCapabilityFamily;
  readonly label: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly focusKinds: readonly SourceAnalysisFocusKind[];
  readonly questionRoutes: readonly SourceAnalysisQuestionRoute[];
  readonly readModes: readonly SourceAnalysisReadMode[];
  readonly aliases: readonly string[];
  readonly nouns: readonly string[];
  readonly verbs: readonly string[];
  readonly requiredArgs: readonly SourceAnalysisCapabilityArgSpec[];
  readonly optionalArgs: readonly SourceAnalysisCapabilityArgSpec[];
  readonly relatedCommands: readonly string[];
  readonly examples: readonly SourceAnalysisCapabilityExample[];
  readonly commonConfusions: readonly SourceAnalysisCapabilityConfusion[];
}

export interface SourceAnalysisCapabilityView {
  readonly id: string;
  readonly command: string;
  readonly plannerKind: SourceAnalysisCapabilityPlannerKind;
  readonly family: SourceAnalysisCapabilityFamily;
  readonly label: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly focusKinds: readonly SourceAnalysisFocusKind[];
  readonly questionRoutes: readonly SourceAnalysisQuestionRoute[];
  readonly readModes: readonly SourceAnalysisReadMode[];
  readonly aliases: readonly string[];
  readonly requiredArgs: readonly SourceAnalysisCapabilityArgSpec[];
  readonly optionalArgs: readonly SourceAnalysisCapabilityArgSpec[];
  readonly relatedCommands: readonly string[];
  readonly examples: readonly SourceAnalysisCapabilityExample[];
  readonly commonConfusions: readonly SourceAnalysisCapabilityConfusion[];
}

export interface SourceAnalysisCapabilityMatchReason {
  readonly kind: SourceAnalysisCapabilityMatchReasonKind;
  readonly detail: string;
  readonly term?: string;
}

export interface SourceAnalysisCapabilityMatch {
  readonly capability: SourceAnalysisCapabilityView;
  readonly reasons: readonly SourceAnalysisCapabilityMatchReason[];
  readonly exactCommand: boolean;
  readonly aliasMatches: readonly string[];
  readonly nounMatches: readonly string[];
  readonly verbMatches: readonly string[];
  readonly routeMatches: readonly string[];
  readonly focusMatched: boolean;
}

export interface DiscoverSourceAnalysisCapabilitiesInput {
  readonly question?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly command?: string;
  readonly includeExamples?: boolean;
  readonly topK?: number;
}

export class SourceAnalysisCapabilityDescriptor {
  readonly #definition: SourceAnalysisCapabilityDefinition;
  readonly #commandTokens: readonly string[];

  constructor(definition: SourceAnalysisCapabilityDefinition) {
    this.#definition = definition;
    this.#commandTokens = tokenize(definition.command);
  }

  get id(): string {
    return this.#definition.id;
  }

  get command(): string {
    return this.#definition.command;
  }

  get plannerKind(): SourceAnalysisCapabilityPlannerKind {
    return this.#definition.plannerKind;
  }

  get family(): SourceAnalysisCapabilityFamily {
    return this.#definition.family;
  }

  get focusKinds(): readonly SourceAnalysisFocusKind[] {
    return this.#definition.focusKinds;
  }

  get questionRoutes(): readonly SourceAnalysisQuestionRoute[] {
    return this.#definition.questionRoutes;
  }

  get readModes(): readonly SourceAnalysisReadMode[] {
    return this.#definition.readModes;
  }

  get requiredArgs(): readonly SourceAnalysisCapabilityArgSpec[] {
    return this.#definition.requiredArgs;
  }

  get optionalArgs(): readonly SourceAnalysisCapabilityArgSpec[] {
    return this.#definition.optionalArgs;
  }

  get commonConfusions(): readonly SourceAnalysisCapabilityConfusion[] {
    return this.#definition.commonConfusions;
  }

  toView(includeExamples = false): SourceAnalysisCapabilityView {
    return {
      id: this.#definition.id,
      command: this.#definition.command,
      plannerKind: this.#definition.plannerKind,
      family: this.#definition.family,
      label: this.#definition.label,
      summary: this.#definition.summary,
      whenToUse: this.#definition.whenToUse,
      focusKinds: this.#definition.focusKinds,
      questionRoutes: this.#definition.questionRoutes,
      readModes: this.#definition.readModes,
      aliases: this.#definition.aliases,
      requiredArgs: this.#definition.requiredArgs,
      optionalArgs: this.#definition.optionalArgs,
      relatedCommands: this.#definition.relatedCommands,
      examples: includeExamples ? this.#definition.examples : [],
      commonConfusions: this.#definition.commonConfusions,
    };
  }

  match(input: {
    readonly question?: string;
    readonly focusKind?: SourceAnalysisFocusKind;
    readonly command?: string;
    readonly includeExamples?: boolean;
  }): SourceAnalysisCapabilityMatch | null {
    if (!input.question && !input.command && !input.focusKind) {
      return {
        capability: this.toView(input.includeExamples),
        reasons: [],
        exactCommand: false,
        aliasMatches: [],
        nounMatches: [],
        verbMatches: [],
        routeMatches: [],
        focusMatched: false,
      };
    }

    const reasons: SourceAnalysisCapabilityMatchReason[] = [];
    const aliasMatches = matchPhrases(input.question, [
      this.#definition.label,
      this.#definition.command,
      ...this.#definition.aliases,
    ]);
    const nounMatches = matchTokens(input.question, this.#definition.nouns);
    const verbMatches = matchTokens(input.question, this.#definition.verbs);
    const routeMatches = matchTokens(input.question, this.#definition.questionRoutes);
    const exactCommand = normalizePhrase(input.command) === normalizePhrase(this.#definition.command);
    const focusMatched = input.focusKind !== undefined && this.#definition.focusKinds.includes(input.focusKind);
    const commandTokenOverlap = input.command
      ? intersect(tokenize(input.command), this.#commandTokens)
      : [];

    if (exactCommand) {
      reasons.push({
        kind: 'command',
        detail: `Exact command match for "${this.#definition.command}".`,
        term: this.#definition.command,
      });
    } else if (commandTokenOverlap.length > 0) {
      for (const token of commandTokenOverlap) {
        reasons.push({
          kind: 'command',
          detail: `Command hint overlaps on "${token}".`,
          term: token,
        });
      }
    }

    for (const alias of aliasMatches) {
      reasons.push({
        kind: 'alias',
        detail: `Question mentions "${alias}".`,
        term: alias,
      });
    }
    for (const noun of nounMatches) {
      reasons.push({
        kind: 'noun',
        detail: `Question contains the capability noun "${noun}".`,
        term: noun,
      });
    }
    for (const verb of verbMatches) {
      reasons.push({
        kind: 'verb',
        detail: `Question contains the capability verb "${verb}".`,
        term: verb,
      });
    }
    for (const route of routeMatches) {
      reasons.push({
        kind: 'route',
        detail: `Question aligns with the "${route}" route.`,
        term: route,
      });
    }
    if (focusMatched) {
      reasons.push({
        kind: 'focus',
        detail: `The provided focus kind "${input.focusKind}" is supported.`,
        term: input.focusKind,
      });
    }

    if (reasons.length === 0) {
      return null;
    }

    return {
      capability: this.toView(input.includeExamples),
      reasons,
      exactCommand,
      aliasMatches,
      nounMatches,
      verbMatches,
      routeMatches,
      focusMatched,
    };
  }
}

export class SourceAnalysisCapabilityCatalog {
  readonly #descriptors: readonly SourceAnalysisCapabilityDescriptor[];
  readonly #byCommand = new Map<string, SourceAnalysisCapabilityDescriptor>();

  constructor(definitions: readonly SourceAnalysisCapabilityDefinition[]) {
    this.#descriptors = definitions.map((definition) => new SourceAnalysisCapabilityDescriptor(definition));
    for (const descriptor of this.#descriptors) {
      this.#byCommand.set(descriptor.command, descriptor);
    }
  }

  list(includeExamples = false): readonly SourceAnalysisCapabilityView[] {
    return this.#descriptors
      .map((descriptor) => descriptor.toView(includeExamples))
      .sort((left, right) => left.command.localeCompare(right.command));
  }

  resolve(command: string): SourceAnalysisCapabilityDescriptor | undefined {
    return this.#byCommand.get(command);
  }

  discover(input: DiscoverSourceAnalysisCapabilitiesInput = {}): readonly SourceAnalysisCapabilityMatch[] {
    const matches = this.#descriptors
      .map((descriptor) => descriptor.match(input))
      .filter((match): match is SourceAnalysisCapabilityMatch => match !== null);

    if (!input.question && !input.focusKind && !input.command) {
      return limitMatches(matches, input.topK);
    }

    const sorted = [...matches].sort(compareCapabilityMatches);
    return limitMatches(sorted, input.topK);
  }
}

export function createDefaultSourceAnalysisCapabilityCatalog(): SourceAnalysisCapabilityCatalog {
  return new SourceAnalysisCapabilityCatalog(DEFAULT_SOURCE_ANALYSIS_CAPABILITIES);
}

const DEFAULT_SOURCE_ANALYSIS_CAPABILITIES: readonly SourceAnalysisCapabilityDefinition[] = [
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
    questionRoutes: ['search'],
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
    questionRoutes: ['route'],
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
    questionRoutes: ['route'],
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
    questionRoutes: ['refresh'],
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
    questionRoutes: ['refresh'],
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
    questionRoutes: ['search'],
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
    questionRoutes: ['diff'],
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
    questionRoutes: ['refresh'],
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
    questionRoutes: ['inventory'],
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
    questionRoutes: ['materialize'],
    readModes: ['snapshot'],
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
    questionRoutes: ['inventory'],
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
    questionRoutes: ['materialize'],
    readModes: ['snapshot'],
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
    questionRoutes: ['inventory'],
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
    questionRoutes: ['materialize'],
    readModes: ['snapshot'],
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
    label: 'Navigate a package, file, type, or export',
    summary: 'Return a structured navigation episode that orients the caller to a focused workspace target.',
    whenToUse: 'Use this when you need a grounded starting point, neighborhood view, or export route before editing.',
    aliases: ['navigate workspace', 'orient me', 'package overview', 'type neighborhood', 'file neighborhood'],
    nouns: ['navigate', 'orientation', 'package', 'file', 'type', 'export', 'overview', 'neighborhood'],
    verbs: ['navigate', 'orient', 'inspect', 'show', 'explore'],
    questionRoutes: ['join', 'route', 'search'],
    focusKinds: ['package', 'file', 'type', 'export'],
    requiredArgs: [
      requiredArg('sessionId', 'Hosted session id with snapshots to query.'),
      requiredArg('focusKind', 'The workspace focus kind.', ['package', 'file', 'type', 'export']),
      requiredArg('focusValue', 'Package name, repo-relative file path, type name, or export name to navigate.'),
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
    aliases: ['package audit', 'tech debt', 'dead code', 'red flags', 'self audit'],
    nouns: ['package', 'audit', 'debt', 'dead', 'red', 'flags', 'coverage', 'integration'],
    verbs: ['audit', 'inspect', 'find', 'surface'],
    questionRoutes: ['inventory'],
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
    questionRoutes: ['route'],
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
    questionRoutes: ['materialize'],
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
  definition: Omit<SourceAnalysisCapabilityDefinition, 'family' | 'focusKinds' | 'readModes'> & {
    readonly focusKinds?: readonly SourceAnalysisFocusKind[];
    readonly readModes?: readonly SourceAnalysisReadMode[];
  },
): SourceAnalysisCapabilityDefinition {
  return {
    family: 'ingress',
    focusKinds: definition.focusKinds ?? ['repo', 'capability'],
    readModes: definition.readModes ?? ['summary-card', 'focus-card', 'supporting-evidence'],
    ...definition,
  };
}

function sessionCapability(
  definition: Omit<SourceAnalysisCapabilityDefinition, 'family' | 'focusKinds' | 'readModes'>,
): SourceAnalysisCapabilityDefinition {
  return {
    family: 'session',
    focusKinds: ['session', 'repo'],
    readModes: [],
    ...definition,
  };
}

function queryCapability(
  definition: Omit<SourceAnalysisCapabilityDefinition, 'family' | 'focusKinds' | 'readModes' | 'examples'> & {
    readonly focusKinds?: readonly SourceAnalysisFocusKind[];
    readonly readModes?: readonly SourceAnalysisReadMode[];
    readonly examples: readonly SourceAnalysisCapabilityExample[];
  },
): SourceAnalysisCapabilityDefinition {
  return {
    family: 'query',
    focusKinds: definition.focusKinds ?? ['repo', 'package', 'file', 'type', 'export'],
    readModes: definition.readModes ?? ['summary-card', 'focus-card', 'supporting-evidence'],
    ...definition,
  };
}

function materializeCapability(
  definition: Omit<SourceAnalysisCapabilityDefinition, 'family' | 'focusKinds' | 'readModes'>,
): SourceAnalysisCapabilityDefinition {
  return {
    family: 'materialize',
    focusKinds: ['session', 'repo'],
    readModes: ['snapshot'],
    ...definition,
  };
}

function requiredArg(
  name: string,
  summary: string,
  acceptedValues?: readonly string[],
): SourceAnalysisCapabilityArgSpec {
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
): SourceAnalysisCapabilityArgSpec {
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
): SourceAnalysisCapabilityExample {
  return {
    label,
    question,
    invocation: {
      command,
      args,
    },
  };
}

function compareCapabilityMatches(
  left: SourceAnalysisCapabilityMatch,
  right: SourceAnalysisCapabilityMatch,
): number {
  return compareMatchKey(matchKey(right), matchKey(left))
    || left.capability.command.localeCompare(right.capability.command);
}

function limitMatches(
  matches: readonly SourceAnalysisCapabilityMatch[],
  topK: number | undefined,
): readonly SourceAnalysisCapabilityMatch[] {
  if (!topK || topK <= 0) {
    return matches;
  }
  return matches.slice(0, topK);
}

function matchKey(match: SourceAnalysisCapabilityMatch): readonly [number, number, number, number, number, number] {
  return [
    match.exactCommand ? 1 : 0,
    match.aliasMatches.length,
    match.nounMatches.length,
    match.verbMatches.length,
    match.routeMatches.length,
    match.focusMatched ? 1 : 0,
  ];
}

function compareMatchKey(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}
