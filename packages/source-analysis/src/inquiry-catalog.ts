import type {
  SourceAnalysisFocusKind,
  SourceAnalysisInquiryEpisode,
  SourceAnalysisQuestionRoute,
  SourceAnalysisReadMode,
} from './query-model.js';
import type { SourceAnalysisCapabilityCatalog } from './capability-catalog.js';
import {
  intersect,
  matchPhrases,
  matchTokens,
  normalizePhrase,
  tokenize,
} from './ingress-language.js';

export const SOURCE_ANALYSIS_INQUIRY_FAMILY_IDS = [
  'capability-guidance',
  'workspace-orientation',
  'package-audit',
  'route-explanation',
  'snapshot-maintenance',
] as const;

export const SOURCE_ANALYSIS_INQUIRY_MATCH_REASON_KINDS = [
  'family',
  'alias',
  'noun',
  'verb',
  'focus',
  'route',
  'command',
] as const;

export type SourceAnalysisInquiryFamilyId =
  typeof SOURCE_ANALYSIS_INQUIRY_FAMILY_IDS[number];

export type SourceAnalysisInquiryMatchReasonKind =
  typeof SOURCE_ANALYSIS_INQUIRY_MATCH_REASON_KINDS[number];

export interface SourceAnalysisInquiryExample {
  readonly label: string;
  readonly question: string;
  readonly primaryCommand: string;
}

export interface SourceAnalysisInquiryConfusion {
  readonly label: string;
  readonly detail: string;
  readonly terms: readonly string[];
  readonly steer: string;
}

export interface SourceAnalysisInquiryFamilyDefinition {
  readonly id: SourceAnalysisInquiryFamilyId;
  readonly label: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly focusKinds: readonly SourceAnalysisFocusKind[];
  readonly inquiryEpisodes: readonly SourceAnalysisInquiryEpisode[];
  readonly questionRoutes: readonly SourceAnalysisQuestionRoute[];
  readonly readModes: readonly SourceAnalysisReadMode[];
  readonly aliases: readonly string[];
  readonly nouns: readonly string[];
  readonly verbs: readonly string[];
  readonly primaryCommands: readonly string[];
  readonly supportingCommands: readonly string[];
  readonly examples: readonly SourceAnalysisInquiryExample[];
  readonly commonConfusions: readonly SourceAnalysisInquiryConfusion[];
}

export interface SourceAnalysisInquiryFamilyView {
  readonly id: SourceAnalysisInquiryFamilyId;
  readonly label: string;
  readonly summary: string;
  readonly whenToUse: string;
  readonly focusKinds: readonly SourceAnalysisFocusKind[];
  readonly inquiryEpisodes: readonly SourceAnalysisInquiryEpisode[];
  readonly questionRoutes: readonly SourceAnalysisQuestionRoute[];
  readonly readModes: readonly SourceAnalysisReadMode[];
  readonly aliases: readonly string[];
  readonly primaryCommands: readonly string[];
  readonly supportingCommands: readonly string[];
  readonly examples: readonly SourceAnalysisInquiryExample[];
  readonly commonConfusions: readonly SourceAnalysisInquiryConfusion[];
}

export interface SourceAnalysisInquiryMatchReason {
  readonly kind: SourceAnalysisInquiryMatchReasonKind;
  readonly detail: string;
  readonly term?: string;
}

export interface SourceAnalysisInquiryMatch {
  readonly inquiry: SourceAnalysisInquiryFamilyView;
  readonly reasons: readonly SourceAnalysisInquiryMatchReason[];
  readonly exactFamily: boolean;
  readonly aliasMatches: readonly string[];
  readonly nounMatches: readonly string[];
  readonly verbMatches: readonly string[];
  readonly routeMatches: readonly string[];
  readonly commandMatches: readonly string[];
  readonly focusMatched: boolean;
}

export interface DiscoverSourceAnalysisInquiriesInput {
  readonly question?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly familyId?: string;
  readonly includeExamples?: boolean;
  readonly topK?: number;
}

export interface SourceAnalysisInquiryCatalogDiagnostics {
  readonly uncoveredCommands: readonly string[];
  readonly familiesWithoutExamples: readonly string[];
}

export class SourceAnalysisInquiryFamilyDescriptor {
  readonly #definition: SourceAnalysisInquiryFamilyDefinition;
  readonly #familyTokens: readonly string[];
  readonly #commandTokens: readonly string[];

  constructor(definition: SourceAnalysisInquiryFamilyDefinition) {
    this.#definition = definition;
    this.#familyTokens = tokenize(definition.id);
    this.#commandTokens = tokenize(definition.primaryCommands.join(' '));
  }

  get id(): SourceAnalysisInquiryFamilyId {
    return this.#definition.id;
  }

  get primaryCommands(): readonly string[] {
    return this.#definition.primaryCommands;
  }

  get supportingCommands(): readonly string[] {
    return this.#definition.supportingCommands;
  }

  toView(includeExamples = false): SourceAnalysisInquiryFamilyView {
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

  match(input: {
    readonly question?: string;
    readonly focusKind?: SourceAnalysisFocusKind;
    readonly familyId?: string;
    readonly includeExamples?: boolean;
  }): SourceAnalysisInquiryMatch | null {
    if (!input.question && !input.familyId && !input.focusKind) {
      return {
        inquiry: this.toView(input.includeExamples),
        reasons: [],
        exactFamily: false,
        aliasMatches: [],
        nounMatches: [],
        verbMatches: [],
        routeMatches: [],
        commandMatches: [],
        focusMatched: false,
      };
    }

    const reasons: SourceAnalysisInquiryMatchReason[] = [];
    const aliasMatches = matchPhrases(input.question, [
      this.#definition.label,
      this.#definition.id,
      ...this.#definition.aliases,
    ]);
    const nounMatches = matchTokens(input.question, this.#definition.nouns);
    const verbMatches = matchTokens(input.question, this.#definition.verbs);
    const routeMatches = matchTokens(input.question, this.#definition.questionRoutes);
    const commandMatches = matchTokens(input.question, this.#definition.primaryCommands);
    const exactFamily = normalizePhrase(input.familyId) === normalizePhrase(this.#definition.id);
    const focusMatched = input.focusKind !== undefined && this.#definition.focusKinds.includes(input.focusKind);
    const familyTokenOverlap = input.familyId
      ? intersect(tokenize(input.familyId), this.#familyTokens)
      : [];
    const commandTokenOverlap = input.question
      ? intersect(tokenize(input.question), this.#commandTokens)
      : [];

    if (exactFamily) {
      reasons.push({
        kind: 'family',
        detail: `Exact inquiry-family match for "${this.#definition.id}".`,
        term: this.#definition.id,
      });
    } else {
      for (const token of familyTokenOverlap) {
        reasons.push({
          kind: 'family',
          detail: `Family hint overlaps on "${token}".`,
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
        detail: `Question uses the inquiry noun "${noun}".`,
        term: noun,
      });
    }
    for (const verb of verbMatches) {
      reasons.push({
        kind: 'verb',
        detail: `Question uses the inquiry verb "${verb}".`,
        term: verb,
      });
    }
    for (const route of routeMatches) {
      reasons.push({
        kind: 'route',
        detail: `Question suggests the "${route}" route.`,
        term: route,
      });
    }
    for (const command of commandMatches) {
      reasons.push({
        kind: 'command',
        detail: `Question lines up with the kernel command "${command}".`,
        term: command,
      });
    }
    for (const token of commandTokenOverlap) {
      reasons.push({
        kind: 'command',
        detail: `Question overlaps a kernel command token "${token}".`,
        term: token,
      });
    }
    if (focusMatched) {
      reasons.push({
        kind: 'focus',
        detail: `The inquiry accepts the ${input.focusKind} focus kind.`,
        term: input.focusKind,
      });
    }

    if (reasons.length === 0) {
      return null;
    }

    return {
      inquiry: this.toView(input.includeExamples),
      reasons,
      exactFamily,
      aliasMatches,
      nounMatches,
      verbMatches,
      routeMatches,
      commandMatches,
      focusMatched,
    };
  }
}

export class SourceAnalysisInquiryCatalog {
  readonly #descriptors: readonly SourceAnalysisInquiryFamilyDescriptor[];

  constructor(descriptors: readonly SourceAnalysisInquiryFamilyDescriptor[]) {
    this.#descriptors = descriptors;
  }

  list(includeExamples = false): readonly SourceAnalysisInquiryFamilyView[] {
    return this.#descriptors.map((descriptor) => descriptor.toView(includeExamples));
  }

  resolve(id: string): SourceAnalysisInquiryFamilyDescriptor | undefined {
    const normalizedId = normalizePhrase(id);
    return this.#descriptors.find((descriptor) => normalizePhrase(descriptor.id) === normalizedId);
  }

  discover(input: DiscoverSourceAnalysisInquiriesInput = {}): readonly SourceAnalysisInquiryMatch[] {
    const matches = this.#descriptors
      .map((descriptor) => descriptor.match(input))
      .filter((match): match is SourceAnalysisInquiryMatch => Boolean(match))
      .sort(compareInquiryMatches);
    return limitMatches(matches, input.topK);
  }

  diagnose(capabilities: SourceAnalysisCapabilityCatalog): SourceAnalysisInquiryCatalogDiagnostics {
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

export function createDefaultSourceAnalysisInquiryCatalog(): SourceAnalysisInquiryCatalog {
  return new SourceAnalysisInquiryCatalog([
    new SourceAnalysisInquiryFamilyDescriptor({
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
    new SourceAnalysisInquiryFamilyDescriptor({
      id: 'workspace-orientation',
      label: 'Workspace orientation',
      summary: 'Orient an AI to a package, file, type, export, or repo before editing.',
      whenToUse: 'Use this when you need a starting point, neighborhood view, or quick structural posture before making changes.',
      focusKinds: ['repo', 'package', 'file', 'type', 'export'],
      inquiryEpisodes: ['orient-and-localize', 'bounded-closure-explanation'],
      questionRoutes: ['search', 'join', 'inventory', 'route'],
      readModes: ['summary-card', 'focus-card', 'supporting-evidence'],
      aliases: ['where do i start', 'understand the workspace', 'orient me', 'overview before editing'],
      nouns: ['workspace', 'repo', 'package', 'file', 'type', 'export', 'overview', 'orientation'],
      verbs: ['understand', 'orient', 'inspect', 'start', 'explore'],
      primaryCommands: ['query.navigate', 'query.deps.summary'],
      supportingCommands: ['query.exports.summary', 'query.typerefs.summary', 'session.open', 'session.status'],
      examples: [
        inquiryExample('Package overview', 'Orient me to @aurelia-ls/source-analysis before I edit it.', 'query.navigate'),
        inquiryExample('Repo posture', 'I want to understand the repo before editing it.', 'query.deps.summary'),
      ],
      commonConfusions: [{
        label: 'Route explanation versus orientation',
        detail: 'If you already know the file or type and need to prove why it is alive, the route-explanation family is a better fit.',
        terms: ['alive', 'reachable', 'why is this here'],
        steer: 'route-explanation',
      }],
    }),
    new SourceAnalysisInquiryFamilyDescriptor({
      id: 'package-audit',
      label: 'Package audit',
      summary: 'Find package-local architecture debt, uncovered files, exercise gaps, and route blind spots.',
      whenToUse: 'Use this for tech debt, dead-code suspicion, under-integration, or self-improvement passes on a package.',
      focusKinds: ['package'],
      inquiryEpisodes: ['inventory-and-audit-sweep', 'bounded-closure-explanation'],
      questionRoutes: ['inventory', 'route'],
      readModes: ['summary-card', 'focus-card', 'supporting-evidence'],
      aliases: ['tech debt', 'dead code', 'audit this package', 'integration gaps'],
      nouns: ['audit', 'debt', 'coverage', 'integration', 'dead', 'exercise'],
      verbs: ['audit', 'review', 'improve', 'triage', 'find'],
      primaryCommands: ['query.audit.package'],
      supportingCommands: ['query.route.witness', 'query.navigate', 'session.open', 'session.status'],
      examples: [
        inquiryExample('Package debt scan', 'Audit @aurelia-ls/source-analysis for tech debt.', 'query.audit.package'),
      ],
      commonConfusions: [{
        label: 'Package audit versus route explanation',
        detail: 'If the real question is about one file or type being alive, go through route-explanation instead of the broader package audit.',
        terms: ['why alive', 'why reachable'],
        steer: 'route-explanation',
      }],
    }),
    new SourceAnalysisInquiryFamilyDescriptor({
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
      }],
    }),
    new SourceAnalysisInquiryFamilyDescriptor({
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
): SourceAnalysisInquiryExample {
  return {
    label,
    question,
    primaryCommand,
  };
}

function compareInquiryMatches(
  left: SourceAnalysisInquiryMatch,
  right: SourceAnalysisInquiryMatch,
): number {
  return compareMatchKey(matchKey(right), matchKey(left))
    || left.inquiry.id.localeCompare(right.inquiry.id);
}

function limitMatches(
  matches: readonly SourceAnalysisInquiryMatch[],
  topK: number | undefined,
): readonly SourceAnalysisInquiryMatch[] {
  if (!topK || topK <= 0) {
    return matches;
  }
  return matches.slice(0, topK);
}

function matchKey(match: SourceAnalysisInquiryMatch): readonly [number, number, number, number, number, number, number] {
  return [
    match.exactFamily ? 1 : 0,
    match.aliasMatches.length,
    match.nounMatches.length,
    match.verbMatches.length,
    match.routeMatches.length,
    match.commandMatches.length,
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
