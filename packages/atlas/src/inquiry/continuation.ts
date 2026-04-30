import type { Evidence } from "./evidence.js";
import type { Inquiry } from "./inquiry.js";

/** Semantic move suggested by an answer, independent from the target lens name. */
export const enum ContinuationKind {
  /** Continue an ordered answer with a cursor. */
  NextPage = "next-page",
  /** Re-ask with a larger budget lane. */
  BroadenBudget = "broaden-budget",
  /** Re-ask with a narrower subject, filter, or locus. */
  Narrow = "narrow",
  /** Switch projection within the same lens. */
  SwitchProjection = "switch-projection",
  /** Switch to another lens over the same or related subject. */
  SwitchLens = "switch-lens",
  /** Inspect source or structured details behind evidence. */
  InspectEvidence = "inspect-evidence",
  /** Resolve a caller-provided selector into a handle or symbol. */
  ResolveSubject = "resolve-subject",
  /** Move the inquiry to a related locus. */
  ChangeLocus = "change-locus",
  /** Expand evidence, derivation, claim, or product provenance. */
  TraceProvenance = "trace-provenance",
  /** Inspect explicit open seams that blocked closure. */
  InspectOpenSeam = "inspect-open-seam",
  /** Ask a different question shape because this one is not supported here. */
  Reroute = "reroute",
}

/** Stable list of continuation kinds exposed by the surface map. */
export const CONTINUATION_KINDS = [
  ContinuationKind.NextPage,
  ContinuationKind.BroadenBudget,
  ContinuationKind.Narrow,
  ContinuationKind.SwitchProjection,
  ContinuationKind.SwitchLens,
  ContinuationKind.InspectEvidence,
  ContinuationKind.ResolveSubject,
  ContinuationKind.ChangeLocus,
  ContinuationKind.TraceProvenance,
  ContinuationKind.InspectOpenSeam,
  ContinuationKind.Reroute,
] as const satisfies readonly ContinuationKind[];

/** Priority class used to keep continuation lists intentional. */
export const enum ContinuationPriority {
  /** Primary next move for completing or explaining the current answer. */
  Primary = "primary",
  /** Useful but not required follow-up. */
  Secondary = "secondary",
  /** Opportunistic exploration edge for related work. */
  Opportunistic = "opportunistic",
}

/** Typed next inquiry suggested by an answer. */
export interface Continuation<TInquiry extends Inquiry = Inquiry> {
  /** Optional stable id for `follow`-style tools. */
  readonly id?: string;
  /** Semantic move this continuation represents. */
  readonly kind: ContinuationKind;
  /** Priority used by agents to choose between many valid moves. */
  readonly priority?: ContinuationPriority;
  /** Grounded explanation of why this follow-up is useful. */
  readonly rationale: string;
  /** Next inquiry to run. */
  readonly inquiry: TInquiry;
  /** Evidence rows that motivated this continuation. */
  readonly evidence?: readonly Evidence[];
}

/** Build a compact deterministic id for an answer-local continuation. */
export function continuationId(index: number, continuation: Pick<Continuation, "kind">): string {
  return `${continuation.kind}:${index}`;
}
