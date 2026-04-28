import type {
  AddressHandle,
  ClaimHandle,
  DerivationEdgeHandle,
  DerivationHandle,
  DerivationRuleHandle,
  EvidenceHandle,
  IdentityHandle,
  OpenSeamHandle,
} from './handles.js';
import type { KernelNote } from './note.js';
import type {
  DerivationEdgeRoleKey,
  DerivationRuleKindKey,
  OpenSeamKindKey,
} from './vocabulary.js';

/**
 * Derivation is a high-leverage unstable surface: it records rule applications, not consumer answers. Keep
 * phases as indexing hints, edges as rule inputs/outputs, and states as production outcomes. Ranking, confidence,
 * actionability, and UI/agent answer semantics belong in the inquiry layer built over the kernel.
 */

export const enum DerivationRecordKind {
  /** One input or output edge in a derivation rule application. */
  DerivationEdge = 'derivation-edge',
  /** A visible unresolved point that should survive into IDE and MCP projections. */
  OpenSeam = 'open-seam',
  /** A named rule that turns observations into claims or materialized products. */
  DerivationRule = 'derivation-rule',
  /** One concrete application of a derivation rule. */
  DerivationRecord = 'derivation-record',
}

export const enum DerivationPhase {
  /** Indexing hint for rules that find source shapes such as decorators, calls, markup, or conventions. */
  Discovery = 'discovery',
  /** Indexing hint for rules that convert equivalent source shapes into a common semantic representation. */
  Normalization = 'normalization',
  /** Indexing hint for rules that connect references to resources, DI keys, symbols, or scopes. */
  Resolution = 'resolution',
  /** Indexing hint for rules that lower high-level template/resource concepts into compiler-level structures. */
  Lowering = 'lowering',
  /** Indexing hint for rules that build concrete products such as resource definitions or rendering instructions. */
  Materialization = 'materialization',
  /** Indexing hint for rules that format stored facts into IDE, MCP, AI, or diagnostic views. */
  Projection = 'projection',
}

export const enum DerivationState {
  /** Use when the rule outcome has not been classified. */
  Unknown = 'unknown',
  /** The rule produced all expected outputs with no open seams. */
  Complete = 'complete',
  /** The rule produced useful outputs but left some uncertainty or missing pieces. */
  Partial = 'partial',
  /** The rule could not proceed because a required input was unavailable. */
  Blocked = 'blocked',
  /** The rule produced exploratory output that must not be treated as resolved. */
  Speculative = 'speculative',
  /** The rule ran and determined that the attempted derivation is invalid. */
  Failed = 'failed',
}

export const enum DerivationEdgeKind {
  /** A source, template, generated, or external address edge. */
  Address = 'address',
  /** A semantic identity edge such as a resource, DI key, or template node. */
  Identity = 'identity',
  /** A semantic claim edge produced or consumed by the rule. */
  Claim = 'claim',
  /** An evidence edge explaining why the rule was allowed to run. */
  Evidence = 'evidence',
}

/** Derivation edge carrying an address handle. */
export class AddressDerivationEdge {
  /** String discriminator for serialized derivation-edge records. */
  readonly kind = DerivationRecordKind.DerivationEdge;
  /** Edge value category for fast filtering and projection. */
  readonly edgeKind = DerivationEdgeKind.Address;

  constructor(
    /** Store-local handle for this derivation edge. */
    readonly handle: DerivationEdgeHandle,
    /** Address handle carried by this edge. */
    readonly addressHandle: AddressHandle,
    /** Optional controlled role key, such as decorator input or lowered-instruction output. */
    readonly roleKey: DerivationEdgeRoleKey | null = null,
  ) {}
}

/** Derivation edge carrying a semantic identity handle. */
export class IdentityDerivationEdge {
  /** String discriminator for serialized derivation-edge records. */
  readonly kind = DerivationRecordKind.DerivationEdge;
  /** Edge value category for fast filtering and projection. */
  readonly edgeKind = DerivationEdgeKind.Identity;

  constructor(
    /** Store-local handle for this derivation edge. */
    readonly handle: DerivationEdgeHandle,
    /** Identity handle carried by this edge. */
    readonly identityHandle: IdentityHandle,
    /** Optional controlled role key, such as resource identity, provider, or lookup key. */
    readonly roleKey: DerivationEdgeRoleKey | null = null,
  ) {}
}

/** Derivation edge carrying a semantic claim handle. */
export class ClaimDerivationEdge {
  /** String discriminator for serialized derivation-edge records. */
  readonly kind = DerivationRecordKind.DerivationEdge;
  /** Edge value category for fast filtering and projection. */
  readonly edgeKind = DerivationEdgeKind.Claim;

  constructor(
    /** Store-local handle for this derivation edge. */
    readonly handle: DerivationEdgeHandle,
    /** Claim handle carried by this edge. */
    readonly claimHandle: ClaimHandle,
    /** Optional controlled role key, such as input claim or output claim. */
    readonly roleKey: DerivationEdgeRoleKey | null = null,
  ) {}
}

/** Derivation edge carrying an evidence handle. */
export class EvidenceDerivationEdge {
  /** String discriminator for serialized derivation-edge records. */
  readonly kind = DerivationRecordKind.DerivationEdge;
  /** Edge value category for fast filtering and projection. */
  readonly edgeKind = DerivationEdgeKind.Evidence;

  constructor(
    /** Store-local handle for this derivation edge. */
    readonly handle: DerivationEdgeHandle,
    /** Evidence handle carried by this edge. */
    readonly evidenceHandle: EvidenceHandle,
    /** Optional controlled role key, such as direct witness or recovery witness. */
    readonly roleKey: DerivationEdgeRoleKey | null = null,
  ) {}
}

/** Typed input or output edge for one derivation rule application. */
export type DerivationEdge =
  | AddressDerivationEdge
  | IdentityDerivationEdge
  | ClaimDerivationEdge
  | EvidenceDerivationEdge;

export const enum OpenSeamSeverity {
  /** Informational seam that helps AI explanation but should not alarm users. */
  Info = 'info',
  /** A seam worth surfacing because it may affect completion, navigation, or analysis. */
  Warning = 'warning',
  /** A seam that invalidates a fact or indicates a likely user-visible problem. */
  Error = 'error',
  /** A seam that prevents this derivation from producing ordinary outputs. */
  Blocked = 'blocked',
}

/** First-class unresolved point that must not disappear behind nulls or missing arrays. */
export class OpenSeam {
  /** String discriminator for serialized open-seam records. */
  readonly kind = DerivationRecordKind.OpenSeam;

  constructor(
    /** Store-local handle for this open seam. */
    readonly handle: OpenSeamHandle,
    /** Controlled vocabulary key describing the seam category. */
    readonly seamKindKey: OpenSeamKindKey,
    /** Severity that determines whether the seam blocks outputs or is explanatory only. */
    readonly severity: OpenSeamSeverity,
    /** Short explanation of what remained unresolved. */
    readonly summary: string,
    /** Optional address handle where the unresolved pressure is visible. */
    readonly addressHandle: AddressHandle | null = null,
    /** Optional direct evidence handle that produced the seam. */
    readonly evidenceHandle: EvidenceHandle | null = null,
    /** Optional non-semantic notes for related diagnostics or AI guidance. */
    readonly notes: readonly KernelNote[] = [],
  ) {}
}

/** Named semantic rule that can be applied by scanners, materializers, or projections. */
export class DerivationRule {
  /** String discriminator for serialized derivation-rule records. */
  readonly kind = DerivationRecordKind.DerivationRule;

  constructor(
    /** Store-local handle for this derivation rule. */
    readonly handle: DerivationRuleHandle,
    /** Controlled vocabulary key describing the rule family. */
    readonly ruleKindKey: DerivationRuleKindKey,
    /** Analysis phase where this rule belongs. */
    readonly phase: DerivationPhase,
    /** Short explanation of what this rule recognizes or produces. */
    readonly summary: string,
  ) {}
}

/** Concrete application of one derivation rule to specific inputs and outputs. */
export class DerivationRecord {
  /** String discriminator for serialized derivation records. */
  readonly kind = DerivationRecordKind.DerivationRecord;

  constructor(
    /** Store-local handle for this derivation record. */
    readonly handle: DerivationHandle,
    /** Rule handle that was applied. */
    readonly ruleHandle: DerivationRuleHandle,
    /** Outcome state, including partial, blocked, speculative, or failed derivations. */
    readonly state: DerivationState,
    /** Input edge handles consumed by the rule application. */
    readonly inputEdgeHandles: readonly DerivationEdgeHandle[] = [],
    /** Output edge handles produced by the rule application. */
    readonly outputEdgeHandles: readonly DerivationEdgeHandle[] = [],
    /** Direct witness handles that justified applying the rule. */
    readonly evidenceHandles: readonly EvidenceHandle[] = [],
    /** Open seam handles left by this rule application. */
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}
