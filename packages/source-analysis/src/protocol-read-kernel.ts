/**
 * Read/adjudicate protocol kernel for a shared semantic authority.
 *
 * Scope:
 * - observe/query
 * - adjudicate/validate
 *
 * Explicitly out of scope:
 * - session/control-plane management
 * - artifact materialization
 * - authoring or transformation
 * - visualization-only surfaces
 *
 * Design intent:
 * - keep the kernel narrow enough to survive many delivery surfaces
 * - keep request, adjudication, and result separate
 * - keep discoverability inside typed continuations
 * - keep policy, world, and consumer thresholds explicit
 *
 * Comment style:
 * - no suffix: I would be comfortable freezing this early in a protocol
 * - `(provisional)`: the split feels durable, but the exact leaf shape may still move
 * - `(tentative)`: useful placeholder or example, but not something I would freeze hard
 */

export const PROTOCOL_READ_KERNEL_SCHEMA_VERSION = 'v1alpha2' as const;

/**
 * ExtensibleString keeps suggested literals visible in editors without closing
 * the protocol to future domains.
 */
export type ExtensibleString<T extends string> =
  | T
  | (string & { readonly __protocolExtensible?: never });

/**
 * Generic JSON payload support for escape hatches and open-ended attributes.
 */
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonArray = readonly JsonValue[];

/**
 * SubjectFamily freezes only the broad semantic split needed by a read kernel.
 */
export const SUBJECT_FAMILIES = [
  // A semantic subject in the analyzed world.
  'entity',
  // A proof object, claim object, or support object.
  'evidence',
] as const;

export type SubjectFamily =
  ExtensibleString<typeof SUBJECT_FAMILIES[number]>;

/**
 * SubjectKind separates the durable family split from the open-ended leaf kind.
 */
export interface SubjectKind {
  readonly family: SubjectFamily; // Family is the durable split.
  readonly kind: string; // Leaf vocab should stay open-ended.
}

/**
 * SelectorScheme captures how the caller points at a subject.
 */
export const SELECTOR_SCHEMES = [
  // Locator-style addressing by name, path, or symbol-like key.
  'locator',
  // A single source position.
  'position',
  // A source span or interval.
  'range',
  // Exact identity by a stable authority-owned identifier. (provisional)
  'identity',
  // Content-anchored or semantic-anchor style addressing. (provisional)
  'anchor',
] as const;

export type SelectorScheme =
  ExtensibleString<typeof SELECTOR_SCHEMES[number]>;

/**
 * Text coordinates are useful enough across editor, CLI, and host surfaces to
 * justify a small shared carrier.
 */
export interface TextCoordinate {
  readonly line: number; // Line-oriented coordinates are a durable cross-surface convention.
  readonly character: number; // Character-oriented columns are a durable cross-surface convention.
}

/**
 * TextRange freezes only the ordered start/end shape.
 */
export interface TextRange {
  readonly start: TextCoordinate; // Ranges should carry an explicit start coordinate.
  readonly end: TextCoordinate; // Ranges should carry an explicit end coordinate.
}

/**
 * IdentityUniquenessLevel defines the scope in which an identity handle is
 * promised to remain unique.
 */
export const IDENTITY_UNIQUENESS_LEVELS = [
  // The identity is only unique within one carrier or document.
  'document',
  // The identity is unique within one analyzed authority scope or project.
  'project',
  // The identity is unique within a wider package or product group. (provisional)
  'group',
  // The identity is unique within the issuing identity scheme.
  'scheme',
  // The identity is globally unique.
  'global',
] as const;

export type IdentityUniquenessLevel =
  ExtensibleString<typeof IDENTITY_UNIQUENESS_LEVELS[number]>;

/**
 * IdentityHandle is a canonical semantic identity token.
 *
 * Unlike anchors, identities are not relocation hints. They are claims about
 * stable semantic naming within a declared uniqueness scope.
 */
export interface IdentityHandle {
  readonly scheme: string; // The issuing identity scheme should remain explicit.
  readonly identifier: string; // The identifier payload is opaque to the kernel.
  readonly unique: IdentityUniquenessLevel; // Uniqueness scope is part of the truth contract.
  readonly issuer?: string; // Useful when multiple authorities can issue identities. (provisional)
  readonly scopeRef?: string; // Useful when uniqueness is narrower than scheme or global. (provisional)
  readonly subject?: SubjectKind; // Useful when the handle is transported outside a typed envelope. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for scheme-local identity detail. (provisional)
}

/**
 * AnchorFingerprint carries one relocatability witness for an anchor. (provisional)
 */
export interface AnchorFingerprint {
  readonly algorithm: string; // Fingerprint algorithm should remain explicit. (provisional)
  readonly value: string; // Fingerprint payload is opaque to the kernel. (provisional)
  readonly role?: string; // Useful when several fingerprints cover different anchor regions. (provisional)
}

/**
 * AnchorPath carries a structural path used during relocation. (provisional)
 */
export type AnchorPath =
  readonly (string | number)[];

/**
 * AnchorHandle is a relocatable reacquisition handle.
 *
 * Unlike identities, anchors are not promises of canonical naming. They are
 * typed hints the authority can use to reacquire a subject after change.
 */
export interface AnchorHandle {
  readonly scheme: string; // The anchor relocation scheme should remain explicit.
  readonly carrierRef: string; // A carrier ref identifies the text or artifact being anchored into.
  readonly range: TextRange; // The last known anchor span.
  readonly fingerprints?: readonly AnchorFingerprint[]; // Relocation witnesses beyond raw range. (provisional)
  readonly astPath?: AnchorPath; // Useful when structural relocation is supported. (provisional)
  readonly semanticHints?: JsonObject; // Useful when relocation needs semantic confirmation. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for anchor-local detail. (provisional)
}

/**
 * SelectorBase keeps the subject dimension common across selector forms.
 */
export interface SelectorBase {
  readonly subject: SubjectKind; // Requests should state what kind of thing is being addressed.
}

/**
 * LocatorSelector addresses a subject by a portable locator string.
 */
export interface LocatorSelector extends SelectorBase {
  readonly scheme: 'locator'; // Locator addressing is a durable kernel scheme.
  readonly locator: string; // The main locator token stays scalar for portability.
  readonly namespace?: string; // Namespace is useful when locators are not globally unique. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for locator-local detail. (provisional)
}

/**
 * PositionSelector addresses a single text position inside a carrier.
 */
export interface PositionSelector extends SelectorBase {
  readonly scheme: 'position'; // Position addressing is a durable kernel scheme.
  readonly carrierRef: string; // A carrier ref identifies the text container being addressed.
  readonly position: TextCoordinate; // The pointed-at text position.
  readonly attributes?: JsonObject; // Escape hatch for carrier-local detail. (provisional)
}

/**
 * RangeSelector addresses a bounded text span inside a carrier.
 */
export interface RangeSelector extends SelectorBase {
  readonly scheme: 'range'; // Range addressing is a durable kernel scheme.
  readonly carrierRef: string; // A carrier ref identifies the text container being addressed.
  readonly range: TextRange; // The bounded addressed span.
  readonly attributes?: JsonObject; // Escape hatch for carrier-local detail. (provisional)
}

/**
 * IdentitySelector addresses a subject by an authority-owned stable identity. (provisional)
 */
export interface IdentitySelector extends SelectorBase {
  readonly scheme: 'identity'; // Identity addressing is useful but still somewhat authority-shaped. (provisional)
  readonly identity: IdentityHandle; // Identity handles should carry explicit uniqueness scope.
  readonly attributes?: JsonObject; // Escape hatch for identity-local detail. (provisional)
}

/**
 * AnchorSelector addresses a subject through a relocatable content or semantic anchor. (provisional)
 */
export interface AnchorSelector extends SelectorBase {
  readonly scheme: 'anchor'; // Anchor addressing is useful but still maturing. (provisional)
  readonly anchor: AnchorHandle; // Anchors should be typed reacquisition handles, not bare strings.
  readonly attributes?: JsonObject; // Escape hatch for anchor-local detail. (provisional)
}

/**
 * ExtensionSelector keeps the selector slot open for future schemes without
 * forcing the kernel to freeze their payload shape early. (provisional)
 */
export interface ExtensionSelector extends SelectorBase {
  readonly scheme: SelectorScheme; // Open schemes should remain possible. (provisional)
  readonly payload: JsonObject; // Future schemes need a structured escape hatch. (provisional)
}

/**
 * Selector is input-only. It says how the caller points at something.
 *
 * The kernel now freezes a few high-value selector shapes directly while still
 * leaving room for future schemes through ExtensionSelector.
 */
export type Selector =
  | LocatorSelector
  | PositionSelector
  | RangeSelector
  | IdentitySelector
  | AnchorSelector
  | ExtensionSelector;

/**
 * SelectorRuleRef gives capability and algebra layers a stable way to point at
 * selector requirements without freezing a global rule enum too early. (provisional)
 */
export interface SelectorRuleRef {
  readonly ref: string; // Rule refs make selector-specific capability notes addressable. (provisional)
  readonly label?: string; // Human-readable labels help surface selector requirements. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for selector rule metadata. (provisional)
}

/**
 * ReadOperation is intentionally narrow.
 * This kernel owns only read/adjudicate action laws.
 */
export const READ_OPERATIONS = [
  // Produce a candidate set without claiming final identity.
  'locate',
  // Close identity on one candidate or an honest ambiguity set.
  'resolve',
  // Return bounded facts about an already-addressed subject.
  'inspect',
  // Return a path, witness chain, dependency chain, or similar relation.
  'trace',
  // Adjudicate trust, analyzability, completeness, or another semantic posture.
  'evaluate',
] as const;

export type ReadOperation =
  ExtensibleString<typeof READ_OPERATIONS[number]>;

/**
 * Aspect narrows which slice of a subject is wanted. (provisional)
 *
 * The dimension is useful, but the vocabulary should stay open.
 */
export type AspectId = string;

/**
 * AuthorityScope identifies which analyzed workspace or authority context is
 * being queried.
 *
 * The kernel freezes the dimension, not the concrete locator scheme.
 */
export interface AuthorityScope {
  readonly ref?: string; // A stable ref to the analyzed authority scope. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for host-specific scope detail. (provisional)
}

/**
 * SemanticWorld identifies which modeled semantic world is being asked about.
 *
 * The kernel keeps the world kind open to avoid freezing domain-local names.
 */
export interface SemanticWorld {
  readonly kind: string; // World identity is durable; world vocabulary should stay open. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for world-local detail. (provisional)
}

/**
 * WorldSpec keeps authority scope separate from semantic world identity.
 */
export interface WorldSpec {
  readonly scope?: AuthorityScope; // Scope targeting should be separate from semantic-world choice.
  readonly semantic?: SemanticWorld; // Semantic world is a distinct protocol dimension.
}

/**
 * Freshness is central to honest live read behavior.
 */
export const FRESHNESS_STATES = [
  // Computed against current live state.
  'live',
  // Computed against materialized or cached state.
  'snapshot',
  // Known to be affected by unapplied or unincorporated change.
  'dirty',
  // Built from more than one freshness regime.
  'mixed',
] as const;

/**
 * Completeness says whether the answer fully closed under the requested burden.
 */
export const COMPLETENESS_STATES = [
  // The answer or world model is intentionally incomplete.
  'partial',
  // The answer closed under the requested burden.
  'complete',
  // The system is still on an honest open front rather than a closed result. (provisional)
  'open',
] as const;

export type FreshnessState =
  ExtensibleString<typeof FRESHNESS_STATES[number]>;

export type CompletenessState =
  ExtensibleString<typeof COMPLETENESS_STATES[number]>;

/**
 * Regime tags let clients and authorities surface operating constraints without
 * freezing one global regime enum too early. (provisional)
 */
export type RegimeTag = string;

/**
 * Cost carriers stay generic on purpose.
 * Cost models matter, but they are rarely stable enough to close early.
 */
export interface CostBudget {
  readonly value?: number; // Numeric budgets are broadly useful. (provisional)
  readonly unit?: string; // Unit vocab should stay open. (provisional)
  readonly attributes?: JsonObject; // Cost models evolve quickly. (provisional)
}

export interface CostObservation {
  readonly value?: number; // Same reasoning as CostBudget.value. (provisional)
  readonly unit?: string; // Same reasoning as CostBudget.unit. (provisional)
  readonly attributes?: JsonObject; // Same reasoning as CostBudget.attributes. (provisional)
}

/**
 * RequestedPosture expresses caller constraints.
 */
export interface RequestedPosture {
  readonly freshness?: FreshnessState; // Callers should be able to constrain freshness.
  readonly completeness?: CompletenessState; // Useful, but exact caller semantics may vary. (provisional)
  readonly regimeTags?: readonly RegimeTag[]; // Regime should stay explicit rather than hiding in heuristics. (provisional)
  readonly maxCost?: CostBudget; // Cost ceilings are durable; exact model is not. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for posture policy. (provisional)
}

/**
 * ObservedPosture reports what the authority actually spent or encountered.
 */
export interface ObservedPosture {
  readonly freshness?: FreshnessState; // Results should report actual freshness posture.
  readonly completeness?: CompletenessState; // Results should report actual closure posture.
  readonly regimeTags?: readonly RegimeTag[]; // Results may need to report active regime tags. (provisional)
  readonly cost?: CostObservation; // Useful when the system can report what it spent. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for observed runtime context. (provisional)
}

/**
 * SpendConstraint captures what kind of consumer action threshold is relevant.
 *
 * The kernel freezes the existence of spend constraints, not the final policy taxonomy.
 */
export interface SpendConstraint {
  readonly consumer?: string; // Consumer identity matters, but taxonomy should stay open. (provisional)
  readonly policyRef?: string; // A stable spend-policy ref is safer than a closed level enum. (provisional)
  readonly attributes?: JsonObject; // Escape hatch while spend policy evolves. (provisional)
}

/**
 * ReadQueryRequest is input-only.
 * It describes intent, constraints, and selection, not what the system found.
 */
export interface ReadQueryRequest {
  readonly selector: Selector; // Every query needs a selection mechanism.
  readonly operation: ReadOperation; // Every query should say what read/adjudicate move it wants.
  readonly aspect?: AspectId; // Useful dimension, but vocabulary should remain open. (provisional)
  readonly world?: WorldSpec; // Queries should be able to specify which world they mean.
  readonly requestedPosture?: RequestedPosture; // Caller constraints belong in input, not output.
  readonly spend?: SpendConstraint; // Consumer action threshold is a request-side concern.
}

/**
 * ResolutionRecord captures identity closure.
 * It should not also carry open-front semantics; those belong in the result layer.
 */
export const RESOLUTION_STATUSES = [
  // No candidate closed honestly.
  'unresolved',
  // Exactly one candidate closed honestly.
  'single',
  // More than one candidate remained admissible.
  'ambiguous',
] as const;

export type ResolutionStatus =
  ExtensibleString<typeof RESOLUTION_STATUSES[number]>;

/**
 * CandidateRef is intentionally small and transport-friendly.
 */
export interface CandidateRef {
  readonly subject: SubjectKind; // Candidate identity should say what kind of thing it is.
  readonly identity?: IdentityHandle; // Durable identity when the authority can issue one. (provisional)
  readonly label?: string; // Human-readable labels are broadly useful.
  readonly locator?: string; // A round-trippable locator is often more portable than an ID.
  readonly anchor?: AnchorHandle; // Relocatable reacquisition handle when available. (provisional)
  readonly attributes?: JsonObject; // Candidate detail will vary by domain. (provisional)
}

export interface ResolutionRecord {
  readonly status: ResolutionStatus; // Resolution state is a durable adjudication concern.
  readonly selected?: CandidateRef; // Single closed candidate when available.
  readonly candidates?: readonly CandidateRef[]; // Ambiguity sets should be first-class.
}

/**
 * Trust should remain visible even when the answer is not positive.
 */
export const TRUST_KINDS = [
  // Directly grounded enough to be treated as strong closure.
  'grounded',
  // Good enough for some consumers, but not the strongest closure.
  'qualified',
  // The answer lives near the analyzability frontier. (provisional)
  'frontier',
  // No reliable trustable closure is available.
  'unavailable',
] as const;

export type TrustKind =
  ExtensibleString<typeof TRUST_KINDS[number]>;

export interface TrustProfile {
  readonly kind: TrustKind; // Trust posture is a durable answer dimension.
  readonly summary?: string; // Short explanation is worth carrying with trust.
}

/**
 * Basis answers why the current closure is honest.
 */
export const CLOSURE_BASIS_KINDS = [
  // Backed by structural or directly observed substrate.
  'substrate',
  // Backed by claim-bearing semantic authority.
  'claim',
  // Backed by route or witness logic.
  'route',
  // Closure depends on freshness conditions.
  'freshness',
  // Closure depends on a boundary condition or open front.
  'boundary',
] as const;

export type ClosureBasisKind =
  ExtensibleString<typeof CLOSURE_BASIS_KINDS[number]>;

export interface ClosureBasis {
  readonly kind: ClosureBasisKind; // Basis kind is a durable protocol slot.
  readonly summary: string; // Basis should be legible, not opaque.
  readonly refs?: readonly string[]; // Useful for proof-bearing links without freezing structure. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for richer basis evidence. (provisional)
}

export const ISSUE_SEVERITIES = [
  // Purely informational.
  'info',
  // Material caution, but not total failure.
  'warning',
  // Serious enough to block or strongly degrade trust.
  'error',
] as const;

export type IssueSeverity =
  ExtensibleString<typeof ISSUE_SEVERITIES[number]>;

export interface Issue {
  readonly code: string; // Stable issue codes are good protocol hygiene.
  readonly message: string; // Issues must stay legible.
  readonly severity: IssueSeverity; // Severity is a durable issue dimension.
  readonly origin?: string; // Useful, but the origin taxonomy should stay open. (provisional)
  readonly ref?: string; // Useful when an issue points to a subject or artifact. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for issue detail. (provisional)
}

/**
 * Provenance stays split forever:
 * - carrier: where the answer came from
 * - evidence: what kinds of support were spent
 */
export const CARRIER_PROVENANCE_KINDS = [
  // Produced directly by a live authority process.
  'host',
  // Produced from a snapshot or materialized state.
  'snapshot',
] as const;

export const EVIDENCE_PROVENANCE_KINDS = [
  // Structural or directly observed support.
  'substrate',
  // Claim-bearing semantic support.
  'claim',
  // Route or witness support.
  'route',
  // Evaluator-derived support above raw substrate. (provisional)
  'evaluation',
] as const;

export type CarrierProvenanceKind =
  ExtensibleString<typeof CARRIER_PROVENANCE_KINDS[number]>;

export type EvidenceProvenanceKind =
  ExtensibleString<typeof EVIDENCE_PROVENANCE_KINDS[number]>;

export interface CarrierProvenanceEntry {
  readonly kind: CarrierProvenanceKind; // Carrier origin should be explicit.
  readonly label: string; // A readable label improves auditability.
  readonly ref?: string; // Useful link to the carrier source. (provisional)
  readonly detail?: string; // Optional freeform clarification. (provisional)
  readonly attributes?: JsonObject; // Escape hatch while provenance matures. (provisional)
}

export interface EvidenceProvenanceEntry {
  readonly kind: EvidenceProvenanceKind; // Evidence provenance should stay distinct from carrier provenance.
  readonly label: string; // Same reasoning as carrier labels.
  readonly ref?: string; // Useful link to support material. (provisional)
  readonly detail?: string; // Optional clarification. (provisional)
  readonly attributes?: JsonObject; // Escape hatch while evidence systems mature. (provisional)
}

export interface Provenance {
  readonly carrier: readonly CarrierProvenanceEntry[]; // Carrier provenance should be first-class.
  readonly evidence: readonly EvidenceProvenanceEntry[]; // Evidence provenance should be first-class.
}

/**
 * Truth must retreat under change.
 * Reopen conditions are part of the authority contract, not an afterthought.
 */
export const RETREAT_TRIGGER_KINDS = [
  // Relevant source content changed.
  'content-change',
  // Config or project shape changed.
  'config-change',
  // The targeted semantic world changed. (provisional)
  'world-change',
  // A dependency or upstream surface changed.
  'dependency-change',
  // Prior closure cannot be sustained within the allowed cost ceiling. (provisional)
  'cost-ceiling',
] as const;

export type RetreatTriggerKind =
  ExtensibleString<typeof RETREAT_TRIGGER_KINDS[number]>;

export interface RetreatTrigger {
  readonly kind: RetreatTriggerKind; // Reopen cause should be explicit.
  readonly ref?: string; // Useful link to the thing that forced retreat. (provisional)
  readonly detail?: string; // Optional explanation. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for richer retreat data. (provisional)
}

export interface RetreatRecord {
  readonly summary?: string; // Retreat should be legible rather than implicit.
  readonly reopensOn: readonly RetreatTrigger[]; // Reopen conditions are a durable authority concern.
}

/**
 * ReadAdjudication is the authority-facing middle layer.
 *
 * The three thresholds below should stay separate:
 * - preserved: knowledge the system can retain
 * - claim: what it can honestly assert now
 * - spendable: what this consumer may safely act on
 */
export interface ReadAdjudication<
  TPreserved = unknown,
  TClaim = unknown,
  TSpend = TClaim,
> {
  readonly resolution?: ResolutionRecord; // Identity closure belongs to adjudication, not raw request or final result.
  readonly preserved?: TPreserved; // Preserved knowledge should stay distinct from admissible claim.
  readonly claim?: TClaim; // Admissible claim should stay distinct from consumer-safe spend.
  readonly spendable?: TSpend; // Consumer action threshold is a distinct layer.
  readonly observedWorld?: WorldSpec; // The authority should report which world it actually spent.
  readonly observedPosture?: ObservedPosture; // The authority should report actual posture, not just requested posture.
  readonly trust: TrustProfile; // Trust belongs to adjudication.
  readonly basis: readonly ClosureBasis[]; // Basis belongs to adjudication.
  readonly provenance: Provenance; // Provenance belongs to adjudication.
  readonly issues: readonly Issue[]; // Issues belong to adjudication.
  readonly retreat?: RetreatRecord; // Retreat law belongs to authority behavior.
}

/**
 * Result kinds are consumer-facing.
 * They should reflect honest non-positive distinctions rather than compressing everything into one miss.
 */
export const OUTCOME_TAGS = [
  // Positive closed result.
  'hit',
  // Honest non-positive result with no admissible claim.
  'no-claim',
  // More than one candidate remains admissible.
  'ambiguous',
  // The system is at an honest open front or boundary.
  'open',
  // Prior closure is degraded by freshness conditions.
  'stale',
  // The requested burden is outside supported capability.
  'unsupported',
  // The authority declines to answer under the current policy or budget. (provisional)
  'refused',
  // A previously claimable answer has been withdrawn under change. (provisional)
  'withdrawn',
  // Execution or authority failure.
  'error',
] as const;

export type OutcomeTag =
  ExtensibleString<typeof OUTCOME_TAGS[number]>;

/**
 * ReadOutcome is result-facing.
 * `value` should be the consumer-facing payload, not the whole authority state.
 */
export interface ReadOutcome<TValue = unknown> {
  readonly tag: OutcomeTag; // Outcome tag is a durable result slot.
  readonly summary: string; // Results should remain legible without external docs.
  readonly value?: TValue; // Consumer-facing payload belongs here.
}

/**
 * Governing anchors are stable jump targets that help the API document itself.
 */
export interface GoverningAnchor {
  readonly ref: string; // Answers should be able to point at governing targets.
  readonly label?: string; // Human-readable anchor labels are useful.
  readonly role?: string; // Role vocabulary should stay open. (provisional)
  readonly attributes?: JsonObject; // Escape hatch for anchor metadata. (provisional)
}

/**
 * Continuations make the API self-documenting.
 * They are typed next-step affordances that remain inside the read/adjudicate scope.
 */
export const CONTINUATION_KINDS = [
  // Move to a more specific query.
  'narrow',
  // Move to a broader query.
  'broaden',
  // Switch to a different read operation or aspect.
  'reroute',
  // Ask again with a stricter or different posture.
  'tighten-posture',
  // Switch semantic worlds explicitly. (provisional)
  'switch-world',
  // Gather more supporting semantic evidence. (provisional)
  'strengthen-evidence',
] as const;

export type ContinuationKind =
  ExtensibleString<typeof CONTINUATION_KINDS[number]>;

export interface Continuation {
  readonly kind: ContinuationKind; // Continuation kind is a durable discoverability slot.
  readonly next: ReadQueryRequest; // Self-documenting APIs should emit typed next requests.
  readonly rationale?: string; // A short reason makes continuations auditably legible.
}

/**
 * ChangeNotice helps live consumers understand when reread pressure exists.
 */
export const CHANGE_NOTICE_KINDS = [
  // No meaningful change pressure to report.
  'none',
  // Affected subjects changed.
  'subjects',
  // The active semantic world changed. (provisional)
  'world',
  // A broader authority scope changed. (provisional)
  'scope',
] as const;

export type ChangeNoticeKind =
  ExtensibleString<typeof CHANGE_NOTICE_KINDS[number]>;

export interface ChangeNotice {
  readonly kind: ChangeNoticeKind; // Change pressure should be explicit.
  readonly count: number; // Change size is broadly useful.
  readonly affectedRefs?: readonly string[]; // Helpful when the system can point at changed objects. (provisional)
  readonly rereadHint?: ReadQueryRequest; // Typed reread hints are part of self-documenting discoverability.
}

/**
 * ReadQueryResult is the durable output envelope.
 * The result owns outcome and discoverability.
 * The adjudication record explains how that result became honest.
 */
export interface ReadQueryResult<
  TPreserved = unknown,
  TClaim = unknown,
  TSpend = TClaim,
> {
  readonly schemaVersion: typeof PROTOCOL_READ_KERNEL_SCHEMA_VERSION; // Versioning should be explicit.
  readonly request: ReadQueryRequest; // Results should carry the originating request.
  readonly adjudication: ReadAdjudication<TPreserved, TClaim, TSpend>; // The authority layer should be visible, not implicit.
  readonly outcome: ReadOutcome<TSpend>; // Consumer-facing result belongs here.
  readonly governingAnchors?: readonly GoverningAnchor[]; // Governing jump targets are part of the answer law.
  readonly continuations: readonly Continuation[]; // Discoverability should live in typed continuations.
  readonly changeNotice?: ChangeNotice; // Live reread pressure belongs in the result envelope.
}
