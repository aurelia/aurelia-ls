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
// TODO: This currently mixes cognitive inquiry moves (search/join/route/inventory)
// with control-plane or maintenance operations (materialize/refresh/diff). If
// route planning keeps growing, split inquiry route from execution/maintenance
// route so planner and policy code stop carrying both concerns in one enum.

export const READ_MODES = [
  'focus-card',
  'summary-card',
  'supporting-evidence',
  'snapshot',
  'delta-card',
] as const;
// TODO: 'snapshot' is not really a presentation mode like the other entries;
// it is a transport/materialization mode. Separate presentation style from
// payload mode before more rendering logic has to special-case this enum.

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
// TODO: This union currently mixes at least three semantic categories:
// concrete code/world subjects (package/file/type/export), evidence/model
// objects (claim), and control-plane/API anchors (session/capability/inquiry).
// Split these into clearer families before more routing/policy logic starts
// treating them as one coherent ontology just because they share one label slot.

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
// TODO: This currently combines reasoning-layer provenance (substrate/claim/route)
// with carrier/origin provenance (snapshot/host). If provenance gets richer,
// break this into evidence kind versus carrier kind so grounding stays honest.

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
// TODO: WorldFrame currently blends targeting inputs (repoPath/target/profilePath)
// with execution/provenance posture (regimeAnchor/partiality/freshness). If the
// host gains richer session and write semantics, split request targeting from
// observed execution frame so answers stop carrying one overloaded bundle.

export interface ContinuationBasis {
  readonly focusRef?: FocusRef;
  readonly questionRoute?: QuestionRoute;
  readonly readMode?: ReadMode;
  readonly worldFrame?: WorldFrame;
  readonly governingAnchorRefs?: readonly string[];
}

export interface WireContinuationBasis {
  readonly focus_ref?: FocusRef;
  readonly question_route?: QuestionRoute;
  readonly read_mode?: ReadMode;
  readonly world_frame?: WorldFrame;
  readonly governing_anchor_refs?: readonly string[];
}

export interface DeltaDescriptor {
  readonly kind: 'none' | 'files' | 'project' | 'claims';
  readonly count: number;
  readonly affectedRefs: readonly string[];
  readonly rereadFloor?: QuestionRoute;
}

export interface WireDeltaDescriptor {
  readonly kind: DeltaDescriptor['kind'];
  readonly count: number;
  readonly affected_refs: readonly string[];
  readonly reread_floor?: QuestionRoute;
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

// TODO: The answer envelope still carries the same semantics twice: once as the
// domain-native query/outcome shape and once as this wire-oriented slots map.
// If both remain public long-term, extract an explicit codec boundary so these
// two representations stop evolving by convention inside the same model file.
export interface InquiryAnswerSlots<TResult = unknown> {
  readonly focus_ref?: FocusRef;
  readonly question_route?: QuestionRoute;
  readonly read_mode?: ReadMode;
  readonly world_frame?: WorldFrame;
  readonly outcome?: Outcome<TResult>;
  // TODO: closure_basis and provenance still reuse domain payloads inside the
  // wire-shaped slots bag. If slots remain part of the public interchange
  // contract, give these nested payloads explicit wire codecs too.
  readonly closure_basis?: readonly ClosureBasis[];
  readonly provenance?: readonly InquiryProvenanceEntry[];
  readonly continuation_basis?: WireContinuationBasis;
  readonly delta?: WireDeltaDescriptor;
}

export interface InquiryAnswer<TResult = unknown> {
  readonly schemaVersion: typeof INQUIRY_MODEL_SCHEMA_VERSION;
  readonly query: Inquiry;
  readonly slots: InquiryAnswerSlots<TResult>;
  readonly outcome: Outcome<TResult>;
}
