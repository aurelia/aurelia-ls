import { UnsupportedBasis, type Basis } from "./basis.js";
import type { PageInfo } from "./budget.js";
import type { Continuation } from "./continuation.js";
import type { Evidence, OpenSeam } from "./evidence.js";
import type { Inquiry } from "./inquiry.js";

/** Answer outcome that preserves uncertainty rather than collapsing it into empty values. */
export const enum OutcomeKind {
  /** The inquiry closed with useful answer value. */
  Hit = "hit",
  /** The inquiry was valid but found no matching fact. */
  Miss = "miss",
  /** The lens could not claim a semantic fact for the selected locus. */
  NoClaim = "no-claim",
  /** The inquiry found multiple incompatible candidates and needs narrowing. */
  Ambiguous = "ambiguous",
  /** The inquiry produced useful facts but did not close the whole question. */
  Partial = "partial",
  /** The inquiry reached an explicitly modeled unresolved seam. */
  Open = "open",
  /** The inquiry shape is outside the current lens contract. */
  Unsupported = "unsupported",
  /** The inquiry should be asked through a different lens, locus, or subject. */
  Reroute = "reroute",
  /** The lens failed unexpectedly or received invalid Atlas state. */
  Error = "error",
}

/** Schema marker for serialized Atlas answers. */
export const ANSWER_SCHEMA_VERSION = "atlas-answer-v1" as const;

/** Stable list of answer outcomes exposed by the surface map. */
export const OUTCOME_KINDS = [
  OutcomeKind.Hit,
  OutcomeKind.Miss,
  OutcomeKind.NoClaim,
  OutcomeKind.Ambiguous,
  OutcomeKind.Partial,
  OutcomeKind.Open,
  OutcomeKind.Unsupported,
  OutcomeKind.Reroute,
  OutcomeKind.Error,
] as const satisfies readonly OutcomeKind[];

/** Shared answer envelope returned by all Atlas lenses. */
export interface Answer<TValue = unknown, TInquiry extends Inquiry = Inquiry> {
  /** Versioned answer schema id. */
  readonly schemaVersion: typeof ANSWER_SCHEMA_VERSION;
  /** Inquiry this answer resolves or reframes. */
  readonly inquiry: TInquiry;
  /** Outcome preserving hit, miss, partial, open, reroute, and unsupported distinctions. */
  readonly outcome: OutcomeKind;
  /** Compact grounded answer summary. */
  readonly summary: string;
  /** Lens-specific value payload when the outcome carries data. */
  readonly value?: TValue;
  /** Substrate basis records spent by this answer. */
  readonly basis: readonly Basis[];
  /** Evidence rows directly supporting or bounding the answer. */
  readonly evidence: readonly Evidence[];
  /** Explicit seams that prevented complete closure. */
  readonly openSeams: readonly OpenSeam[];
  /** Page state when this answer is one page of an ordered result. */
  readonly page?: PageInfo;
  /** Typed next inquiries useful after this answer. */
  readonly continuations: readonly Continuation<TInquiry>[];
}

/** Construct an answer while filling the stable empty lanes. */
export function createAnswer<TValue, TInquiry extends Inquiry>(
  /** Inquiry being answered. */
  inquiry: TInquiry,
  /** Outcome for the answer. */
  outcome: OutcomeKind,
  /** Compact answer summary. */
  summary: string,
  /** Optional answer lanes supplied by the lens. */
  options: {
    /** Lens-specific value payload. */
    readonly value?: TValue;
    /** Basis records spent by the answer. */
    readonly basis?: readonly Basis[];
    /** Evidence rows directly supporting or bounding the answer. */
    readonly evidence?: readonly Evidence[];
    /** Explicit open seams carried by the answer. */
    readonly openSeams?: readonly OpenSeam[];
    /** Page state for ordered answers. */
    readonly page?: PageInfo;
    /** Typed follow-up inquiries. */
    readonly continuations?: readonly Continuation<TInquiry>[];
  } = {},
): Answer<TValue, TInquiry> {
  return {
    schemaVersion: ANSWER_SCHEMA_VERSION,
    inquiry,
    outcome,
    summary,
    ...(options.value === undefined ? {} : { value: options.value }),
    basis: options.basis ?? [UnsupportedBasis],
    evidence: options.evidence ?? [],
    openSeams: options.openSeams ?? [],
    ...(options.page === undefined ? {} : { page: options.page }),
    continuations: options.continuations ?? [],
  };
}
