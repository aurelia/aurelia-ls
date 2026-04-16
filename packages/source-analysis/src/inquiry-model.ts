import type {
  ClosureBasis,
  Outcome,
} from './outcome-algebra.js';

export const INQUIRY_MODEL_SCHEMA_VERSION = 'v0alpha1' as const;

export const INQUIRY_EPISODES = [
  'orient-and-localize',
  'bounded-closure-explanation',
  'governing-anchor-jump',
  'inventory-and-audit-sweep',
  'delta-and-reread-floor',
] as const;

export const QUESTION_ROUTES = [
  'search',
  'join',
  'route',
  'inventory',
  'materialize',
  'refresh',
  'diff',
] as const;

export const READ_MODES = [
  'focus-card',
  'summary-card',
  'supporting-evidence',
  'snapshot',
  'delta-card',
] as const;

export const INQUIRY_SLOT_IDS = [
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

export const FOCUS_KINDS = [
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
  'inquiry',
] as const;

export const REGIME_ANCHORS = [
  'batch',
  'hosted',
  'watch',
] as const;

export const PARTIALITY_MODES = [
  'partial',
  'complete',
] as const;

export const FRESHNESS_MODES = [
  'snapshot',
  'live',
  'dirty',
  'mixed',
] as const;

export const PROVENANCE_ENTRY_KINDS = [
  'substrate',
  'claim',
  'route',
  'snapshot',
  'host',
] as const;

export type InquiryEpisode =
  typeof INQUIRY_EPISODES[number];

export type QuestionRoute =
  typeof QUESTION_ROUTES[number];

export type ReadMode =
  typeof READ_MODES[number];

export type InquirySlotId =
  typeof INQUIRY_SLOT_IDS[number];

export type FocusKind =
  typeof FOCUS_KINDS[number];

export type RegimeAnchor =
  typeof REGIME_ANCHORS[number];

export type PartialityMode =
  typeof PARTIALITY_MODES[number];

export type FreshnessMode =
  typeof FRESHNESS_MODES[number];

export type ProvenanceEntryKind =
  typeof PROVENANCE_ENTRY_KINDS[number];

export type InquiryProvenanceEntryKind =
  ProvenanceEntryKind;

export interface FocusRef {
  readonly kind: FocusKind;
  readonly value: string;
  readonly label?: string;
}

export interface WorldFrame {
  readonly repoPath?: string;
  readonly target?: string;
  readonly profilePath?: string;
  readonly regimeAnchor?: RegimeAnchor;
  readonly partiality?: PartialityMode;
  readonly freshness?: FreshnessMode;
}

export interface ContinuationBasis {
  readonly focusRef?: FocusRef;
  readonly questionRoute?: QuestionRoute;
  readonly readMode?: ReadMode;
  readonly worldFrame?: WorldFrame;
  readonly governingAnchorRefs?: readonly string[];
}

export interface DeltaDescriptor {
  readonly kind: 'none' | 'files' | 'project' | 'claims';
  readonly count: number;
  readonly affectedRefs: readonly string[];
  readonly rereadFloor?: QuestionRoute;
}

export interface InquiryProvenanceEntry {
  readonly kind: ProvenanceEntryKind;
  readonly label: string;
  readonly ref?: string;
  readonly detail?: string;
}

export interface Inquiry {
  readonly inquiryEpisode?: InquiryEpisode;
  readonly focusRef: FocusRef;
  readonly questionRoute: QuestionRoute;
  readonly readMode?: ReadMode;
  readonly worldFrame?: WorldFrame;
  readonly requestedSlotIds?: readonly InquirySlotId[];
  readonly continuationBasis?: ContinuationBasis;
}

export interface InquiryAnswerSlots<TResult = unknown> {
  readonly focus_ref?: FocusRef;
  readonly question_route?: QuestionRoute;
  readonly read_mode?: ReadMode;
  readonly world_frame?: WorldFrame;
  readonly outcome?: Outcome<TResult>;
  readonly closure_basis?: readonly ClosureBasis[];
  readonly provenance?: readonly InquiryProvenanceEntry[];
  readonly continuation_basis?: ContinuationBasis;
  readonly delta?: DeltaDescriptor;
}

export interface InquiryAnswer<TResult = unknown> {
  readonly schemaVersion: typeof INQUIRY_MODEL_SCHEMA_VERSION;
  readonly query: Inquiry;
  readonly slots: InquiryAnswerSlots<TResult>;
  readonly outcome: Outcome<TResult>;
}
