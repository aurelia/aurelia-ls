import type {
  ClosureBasis,
  Outcome,
} from './outcome-algebra.js';
import type { InquiryAnswerSlots } from './inquiry-wire.js';

export const INQUIRY_MODEL_SCHEMA_VERSION = 'v0alpha1' as const;

export const INQUIRY_EPISODES = [
  'orient-and-localize',
  'bounded-closure-explanation',
  'governing-anchor-jump',
  'inventory-and-audit-sweep',
  'delta-and-reread-floor',
] as const;

export const COGNITIVE_QUESTION_ROUTES = [
  'search',
  'join',
  'route',
  'inventory',
] as const;

export const MAINTENANCE_QUESTION_ROUTES = [
  'materialize',
  'refresh',
  'diff',
] as const;
export const QUESTION_ROUTES = [
  ...COGNITIVE_QUESTION_ROUTES,
  ...MAINTENANCE_QUESTION_ROUTES,
] as const;
// TODO: This currently mixes cognitive inquiry moves (search/join/route/inventory)
// with control-plane or maintenance operations (materialize/refresh/diff).
// Catalogs and the newer continuation/delta adapters now carry explicit route
// families internally, but the outer query and wire-compatible payloads still
// flatten them back into QuestionRoute. Keep shrinking those compatibility
// carriers before execution planning grows further.

export const PRESENTATION_READ_MODES = [
  'focus-card',
  'summary-card',
  'supporting-evidence',
  'delta-card',
] as const;
export const PAYLOAD_READ_MODES = [
  'snapshot',
] as const;
export const READ_MODES = [
  ...PRESENTATION_READ_MODES,
  ...PAYLOAD_READ_MODES,
] as const;
// TODO: 'snapshot' is not really a presentation mode like the other entries;
// it is a transport/materialization mode. The families and presentation-policy
// adapters are explicit now, but the outer public query/options carriers still
// flatten everything back into ReadMode. Keep pushing that broad union outward
// until only compatibility entrypoints still need it.

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

export const SUBJECT_FOCUS_KINDS = [
  'repo',
  'package',
  'directory',
  'file',
  'symbol',
  'type',
  'export',
] as const;

export const EVIDENCE_FOCUS_KINDS = [
  'claim',
] as const;

export const CONTROL_FOCUS_KINDS = [
  'session',
  'capability',
  'inquiry',
] as const;
export const FOCUS_KINDS = [
  ...SUBJECT_FOCUS_KINDS,
  ...EVIDENCE_FOCUS_KINDS,
  ...CONTROL_FOCUS_KINDS,
] as const;
export const POLICY_FOCUS_KINDS = [
  ...SUBJECT_FOCUS_KINDS,
  ...CONTROL_FOCUS_KINDS,
] as const;
// TODO: This union currently mixes at least three semantic categories:
// concrete code/world subjects (package/file/type/export), evidence/model
// objects (claim), and control-plane/API anchors (session/capability/inquiry).
// The families are explicit now, but many APIs still accept the broad
// FocusKind union. Push those APIs onto narrower kinds where possible so
// routing/policy logic stops treating the whole ontology as one label slot.

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

export const EVIDENCE_PROVENANCE_ENTRY_KINDS = [
  'substrate',
  'claim',
  'route',
] as const;

export const CARRIER_PROVENANCE_ENTRY_KINDS = [
  'snapshot',
  'host',
] as const;
export const PROVENANCE_ENTRY_KINDS = [
  ...EVIDENCE_PROVENANCE_ENTRY_KINDS,
  ...CARRIER_PROVENANCE_ENTRY_KINDS,
] as const;
// TODO: This currently combines reasoning-layer provenance (substrate/claim/route)
// with carrier/origin provenance (snapshot/host). The families are explicit
// now, but provenance payloads still carry the broad union. Push codec and
// answer-layer APIs onto the narrower provenance families as grounding grows.

export type InquiryEpisode =
  typeof INQUIRY_EPISODES[number];

export type CognitiveQuestionRoute =
  typeof COGNITIVE_QUESTION_ROUTES[number];

export type MaintenanceQuestionRoute =
  typeof MAINTENANCE_QUESTION_ROUTES[number];

export type QuestionRoute =
  typeof QUESTION_ROUTES[number];

export interface QuestionRouteFamilies {
  readonly cognitive?: readonly CognitiveQuestionRoute[];
  readonly maintenance?: readonly MaintenanceQuestionRoute[];
}

export interface CognitiveQuestionRouteSelection {
  readonly family: 'cognitive';
  readonly route: CognitiveQuestionRoute;
}

export interface MaintenanceQuestionRouteSelection {
  readonly family: 'maintenance';
  readonly route: MaintenanceQuestionRoute;
}

export type QuestionRouteSelection =
  | CognitiveQuestionRouteSelection
  | MaintenanceQuestionRouteSelection;

export type PresentationReadMode =
  typeof PRESENTATION_READ_MODES[number];

export type PayloadReadMode =
  typeof PAYLOAD_READ_MODES[number];

export type ReadMode =
  typeof READ_MODES[number];

export interface ReadModeFamilies {
  readonly presentation?: readonly PresentationReadMode[];
  readonly payload?: readonly PayloadReadMode[];
}

export type InquirySlotId =
  typeof INQUIRY_SLOT_IDS[number];

export type SubjectFocusKind =
  typeof SUBJECT_FOCUS_KINDS[number];

export type EvidenceFocusKind =
  typeof EVIDENCE_FOCUS_KINDS[number];

export type ControlFocusKind =
  typeof CONTROL_FOCUS_KINDS[number];

export type FocusKind =
  typeof FOCUS_KINDS[number];

export type PolicyFocusKind =
  typeof POLICY_FOCUS_KINDS[number];

export type RegimeAnchor =
  typeof REGIME_ANCHORS[number];

export type PartialityMode =
  typeof PARTIALITY_MODES[number];

export type FreshnessMode =
  typeof FRESHNESS_MODES[number];

export type EvidenceProvenanceEntryKind =
  typeof EVIDENCE_PROVENANCE_ENTRY_KINDS[number];

export type CarrierProvenanceEntryKind =
  typeof CARRIER_PROVENANCE_ENTRY_KINDS[number];

export type ProvenanceEntryKind =
  typeof PROVENANCE_ENTRY_KINDS[number];

export type InquiryProvenanceEntryKind =
  ProvenanceEntryKind;

export interface FocusRef<
  TKind extends FocusKind = FocusKind,
> {
  readonly kind: TKind;
  readonly value: string;
  readonly label?: string;
}

export interface WorldTargeting {
  readonly repoPath?: string;
  readonly target?: string;
  readonly profilePath?: string;
}

export interface ExecutionPosture {
  readonly regimeAnchor?: RegimeAnchor;
  readonly partiality?: PartialityMode;
  readonly freshness?: FreshnessMode;
}

export interface WorldFrame {
  readonly repoPath?: WorldTargeting['repoPath'];
  readonly target?: WorldTargeting['target'];
  readonly profilePath?: WorldTargeting['profilePath'];
  readonly regimeAnchor?: ExecutionPosture['regimeAnchor'];
  readonly partiality?: ExecutionPosture['partiality'];
  readonly freshness?: ExecutionPosture['freshness'];
}
// TODO: WorldFrame remains the wire-compatible flattened carrier, but shared
// helpers now expose WorldTargeting and ExecutionPosture as the honest internal
// slices, and answer/wire adapters now spend those slices before flattening.
// Keep pushing high-fanout consumers onto those slices until the flattened
// carrier becomes compatibility-only.

export interface ContinuationBasis<
  TFocusKind extends FocusKind = FocusKind,
> {
  readonly focusRef?: FocusRef<TFocusKind>;
  readonly questionRoute?: QuestionRoute;
  readonly readMode?: PresentationReadMode;
  readonly worldFrame?: WorldFrame;
  readonly governingAnchorRefs?: readonly string[];
}

export interface DeltaDescriptor {
  readonly kind: 'none' | 'files' | 'project' | 'claims';
  readonly count: number;
  readonly affectedRefs: readonly string[];
  readonly rereadFloor?: QuestionRoute;
}

export interface InquiryEvidenceProvenanceEntry {
  readonly kind: EvidenceProvenanceEntryKind;
  readonly label: string;
  readonly ref?: string;
  readonly detail?: string;
}

export interface InquiryCarrierProvenanceEntry {
  readonly kind: CarrierProvenanceEntryKind;
  readonly label: string;
  readonly ref?: string;
  readonly detail?: string;
}

export type InquiryProvenanceEntry =
  | InquiryEvidenceProvenanceEntry
  | InquiryCarrierProvenanceEntry;

export interface Inquiry<
  TFocusKind extends FocusKind = FocusKind,
> {
  readonly inquiryEpisode?: InquiryEpisode;
  readonly focusRef: FocusRef<TFocusKind>;
  readonly questionRoute: QuestionRoute;
  readonly readMode?: ReadMode;
  readonly worldFrame?: WorldFrame;
  readonly requestedSlotIds?: readonly InquirySlotId[];
  readonly continuationBasis?: ContinuationBasis<TFocusKind>;
}

export interface InquiryAnswer<TResult = unknown> {
  readonly schemaVersion: typeof INQUIRY_MODEL_SCHEMA_VERSION;
  readonly query: Inquiry;
  readonly slots: InquiryAnswerSlots<TResult>;
  readonly outcome: Outcome<TResult>;
}

const FOCUS_KIND_SET = new Set<string>(FOCUS_KINDS);
const POLICY_FOCUS_KIND_SET = new Set<string>(POLICY_FOCUS_KINDS);
const SUBJECT_FOCUS_KIND_SET = new Set<string>(SUBJECT_FOCUS_KINDS);
const EVIDENCE_FOCUS_KIND_SET = new Set<string>(EVIDENCE_FOCUS_KINDS);
const CONTROL_FOCUS_KIND_SET = new Set<string>(CONTROL_FOCUS_KINDS);
const COGNITIVE_QUESTION_ROUTE_SET = new Set<string>(COGNITIVE_QUESTION_ROUTES);
const MAINTENANCE_QUESTION_ROUTE_SET = new Set<string>(MAINTENANCE_QUESTION_ROUTES);
const PRESENTATION_READ_MODE_SET = new Set<string>(PRESENTATION_READ_MODES);
const PAYLOAD_READ_MODE_SET = new Set<string>(PAYLOAD_READ_MODES);
const EVIDENCE_PROVENANCE_ENTRY_KIND_SET = new Set<string>(EVIDENCE_PROVENANCE_ENTRY_KINDS);
const CARRIER_PROVENANCE_ENTRY_KIND_SET = new Set<string>(CARRIER_PROVENANCE_ENTRY_KINDS);

export function isFocusKind(
  value: unknown,
): value is FocusKind {
  return typeof value === 'string' && FOCUS_KIND_SET.has(value);
}

export function isPolicyFocusKind(
  value: FocusKind,
): value is PolicyFocusKind {
  return POLICY_FOCUS_KIND_SET.has(value);
}

export function isSubjectFocusKind(
  value: FocusKind,
): value is SubjectFocusKind {
  return SUBJECT_FOCUS_KIND_SET.has(value);
}

export function isEvidenceFocusKind(
  value: FocusKind,
): value is EvidenceFocusKind {
  return EVIDENCE_FOCUS_KIND_SET.has(value);
}

export function isControlFocusKind(
  value: FocusKind,
): value is ControlFocusKind {
  return CONTROL_FOCUS_KIND_SET.has(value);
}

export function isCognitiveQuestionRoute(
  value: QuestionRoute,
): value is CognitiveQuestionRoute {
  return COGNITIVE_QUESTION_ROUTE_SET.has(value);
}

export function isMaintenanceQuestionRoute(
  value: QuestionRoute,
): value is MaintenanceQuestionRoute {
  return MAINTENANCE_QUESTION_ROUTE_SET.has(value);
}

export function isPresentationReadMode(
  value: ReadMode,
): value is PresentationReadMode {
  return PRESENTATION_READ_MODE_SET.has(value);
}

export function isPayloadReadMode(
  value: ReadMode,
): value is PayloadReadMode {
  return PAYLOAD_READ_MODE_SET.has(value);
}

export function resolvePresentationReadMode(
  readMode: ReadMode | undefined,
  fallback: PresentationReadMode,
): PresentationReadMode {
  return readMode && isPresentationReadMode(readMode)
    ? readMode
    : fallback;
}

export function isEvidenceProvenanceEntryKind(
  value: ProvenanceEntryKind,
): value is EvidenceProvenanceEntryKind {
  return EVIDENCE_PROVENANCE_ENTRY_KIND_SET.has(value);
}

export function isCarrierProvenanceEntryKind(
  value: ProvenanceEntryKind,
): value is CarrierProvenanceEntryKind {
  return CARRIER_PROVENANCE_ENTRY_KIND_SET.has(value);
}

export function flattenQuestionRouteFamilies(
  families: QuestionRouteFamilies,
): readonly QuestionRoute[] {
  return [
    ...(families.cognitive ?? []),
    ...(families.maintenance ?? []),
  ];
}

export function createQuestionRouteFamilies(
  families: QuestionRouteFamilies = {},
): Required<QuestionRouteFamilies> {
  return {
    cognitive: families.cognitive ?? [],
    maintenance: families.maintenance ?? [],
  };
}

export function flattenReadModeFamilies(
  families: ReadModeFamilies,
): readonly ReadMode[] {
  return [
    ...(families.presentation ?? []),
    ...(families.payload ?? []),
  ];
}

export function createReadModeFamilies(
  families: ReadModeFamilies = {},
): Required<ReadModeFamilies> {
  return {
    presentation: families.presentation ?? [],
    payload: families.payload ?? [],
  };
}

export function selectCognitiveQuestionRoute(
  route: CognitiveQuestionRoute,
): CognitiveQuestionRouteSelection {
  return {
    family: 'cognitive',
    route,
  };
}

export function selectMaintenanceQuestionRoute(
  route: MaintenanceQuestionRoute,
): MaintenanceQuestionRouteSelection {
  return {
    family: 'maintenance',
    route,
  };
}

export function selectQuestionRoute(
  route: QuestionRoute,
): QuestionRouteSelection {
  return isCognitiveQuestionRoute(route)
    ? selectCognitiveQuestionRoute(route)
    : selectMaintenanceQuestionRoute(route);
}

export function questionRouteFromSelection(
  selection: QuestionRouteSelection | undefined,
): QuestionRoute | undefined {
  return selection?.route;
}

export function worldTargetingFromFrame(
  worldFrame: WorldFrame | undefined,
): WorldTargeting {
  return {
    ...(worldFrame?.repoPath ? { repoPath: worldFrame.repoPath } : {}),
    ...(worldFrame?.target ? { target: worldFrame.target } : {}),
    ...(worldFrame?.profilePath ? { profilePath: worldFrame.profilePath } : {}),
  };
}

export function executionPostureFromFrame(
  worldFrame: WorldFrame | undefined,
): ExecutionPosture {
  return {
    ...(worldFrame?.regimeAnchor ? { regimeAnchor: worldFrame.regimeAnchor } : {}),
    ...(worldFrame?.partiality ? { partiality: worldFrame.partiality } : {}),
    ...(worldFrame?.freshness ? { freshness: worldFrame.freshness } : {}),
  };
}

export function composeWorldFrame(
  targeting: WorldTargeting = {},
  posture: ExecutionPosture = {},
): WorldFrame {
  return {
    ...targeting,
    ...posture,
  };
}
