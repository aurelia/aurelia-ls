import type {
  SourceAnalysisClosureBasis,
  SourceAnalysisOutcome,
} from './outcome-algebra.js';

export const SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION = 'v0alpha1' as const;

export const SOURCE_ANALYSIS_INQUIRY_EPISODES = [
  'orient-and-localize',
  'bounded-closure-explanation',
  'governing-anchor-jump',
  'inventory-and-audit-sweep',
  'delta-and-reread-floor',
] as const;

export const SOURCE_ANALYSIS_QUESTION_ROUTES = [
  'search',
  'join',
  'route',
  'inventory',
  'materialize',
  'refresh',
  'diff',
] as const;

export const SOURCE_ANALYSIS_READ_MODES = [
  'focus-card',
  'summary-card',
  'supporting-evidence',
  'snapshot',
  'delta-card',
] as const;

export const SOURCE_ANALYSIS_QUERY_SLOT_IDS = [
  'focus_ref',
  'question_route',
  'read_mode',
  'world_frame',
  'outcome',
  'closure_basis',
  'provenance',
  'continuation_basis',
  'delta',
] as const;

export const SOURCE_ANALYSIS_FOCUS_KINDS = [
  'repo',
  'package',
  'directory',
  'file',
  'symbol',
  'type',
  'export',
  'claim',
  'session',
  'capability',
] as const;

export const SOURCE_ANALYSIS_REGIME_ANCHORS = [
  'batch',
  'hosted',
  'watch',
] as const;

export const SOURCE_ANALYSIS_PARTIALITY_MODES = [
  'partial',
  'complete',
] as const;

export const SOURCE_ANALYSIS_FRESHNESS_MODES = [
  'snapshot',
  'live',
  'dirty',
  'mixed',
] as const;

export const SOURCE_ANALYSIS_PROVENANCE_ENTRY_KINDS = [
  'substrate',
  'claim',
  'route',
  'snapshot',
  'host',
] as const;

export type SourceAnalysisInquiryEpisode =
  typeof SOURCE_ANALYSIS_INQUIRY_EPISODES[number];

export type SourceAnalysisQuestionRoute =
  typeof SOURCE_ANALYSIS_QUESTION_ROUTES[number];

export type SourceAnalysisReadMode =
  typeof SOURCE_ANALYSIS_READ_MODES[number];

export type SourceAnalysisQuerySlotId =
  typeof SOURCE_ANALYSIS_QUERY_SLOT_IDS[number];

export type SourceAnalysisFocusKind =
  typeof SOURCE_ANALYSIS_FOCUS_KINDS[number];

export type SourceAnalysisRegimeAnchor =
  typeof SOURCE_ANALYSIS_REGIME_ANCHORS[number];

export type SourceAnalysisPartialityMode =
  typeof SOURCE_ANALYSIS_PARTIALITY_MODES[number];

export type SourceAnalysisFreshnessMode =
  typeof SOURCE_ANALYSIS_FRESHNESS_MODES[number];

export type SourceAnalysisProvenanceEntryKind =
  typeof SOURCE_ANALYSIS_PROVENANCE_ENTRY_KINDS[number];

export type SourceAnalysisAnswerProvenanceEntryKind =
  SourceAnalysisProvenanceEntryKind;

export interface SourceAnalysisFocusRef {
  readonly kind: SourceAnalysisFocusKind;
  readonly value: string;
  readonly label?: string;
}

export interface SourceAnalysisWorldFrame {
  readonly repoPath?: string;
  readonly target?: string;
  readonly regimeAnchor?: SourceAnalysisRegimeAnchor;
  readonly partiality?: SourceAnalysisPartialityMode;
  readonly freshness?: SourceAnalysisFreshnessMode;
}

export interface SourceAnalysisContinuationBasis {
  readonly focusRef?: SourceAnalysisFocusRef;
  readonly questionRoute?: SourceAnalysisQuestionRoute;
  readonly readMode?: SourceAnalysisReadMode;
  readonly worldFrame?: SourceAnalysisWorldFrame;
  readonly governingAnchorRefs?: readonly string[];
}

export interface SourceAnalysisDeltaDescriptor {
  readonly kind: 'none' | 'files' | 'project' | 'claims';
  readonly count: number;
  readonly affectedRefs: readonly string[];
  readonly rereadFloor?: SourceAnalysisQuestionRoute;
}

export interface SourceAnalysisAnswerProvenanceEntry {
  readonly kind: SourceAnalysisProvenanceEntryKind;
  readonly label: string;
  readonly ref?: string;
  readonly detail?: string;
}

export interface SourceAnalysisQuery {
  readonly inquiryEpisode?: SourceAnalysisInquiryEpisode;
  readonly focusRef: SourceAnalysisFocusRef;
  readonly questionRoute: SourceAnalysisQuestionRoute;
  readonly readMode?: SourceAnalysisReadMode;
  readonly worldFrame?: SourceAnalysisWorldFrame;
  readonly requestedSlotIds?: readonly SourceAnalysisQuerySlotId[];
  readonly continuationBasis?: SourceAnalysisContinuationBasis;
}

export interface SourceAnalysisAnswerSlots<TResult = unknown> {
  readonly focus_ref?: SourceAnalysisFocusRef;
  readonly question_route?: SourceAnalysisQuestionRoute;
  readonly read_mode?: SourceAnalysisReadMode;
  readonly world_frame?: SourceAnalysisWorldFrame;
  readonly outcome?: SourceAnalysisOutcome<TResult>;
  readonly closure_basis?: readonly SourceAnalysisClosureBasis[];
  readonly provenance?: readonly SourceAnalysisAnswerProvenanceEntry[];
  readonly continuation_basis?: SourceAnalysisContinuationBasis;
  readonly delta?: SourceAnalysisDeltaDescriptor;
}

export interface SourceAnalysisAnswer<TResult = unknown> {
  readonly schemaVersion: typeof SOURCE_ANALYSIS_QUERY_MODEL_SCHEMA_VERSION;
  readonly query: SourceAnalysisQuery;
  readonly slots: SourceAnalysisAnswerSlots<TResult>;
  readonly outcome: SourceAnalysisOutcome<TResult>;
}
