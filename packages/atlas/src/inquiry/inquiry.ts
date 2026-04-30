import type { Basis } from "./basis.js";
import type { Budget, PageRequest } from "./budget.js";
import type { InquiryHandle } from "./handle.js";
import type { LensId } from "./lens.js";
import type { Locus } from "./locus.js";

/** Caller intent before projection and transport policy are applied. */
export const enum InquiryIntent {
  /** Orient around available terrain, lenses, substrates, or code shape. */
  Orient = "orient",
  /** Inspect a known subject or source locus. */
  Inspect = "inspect",
  /** Explain why an answer, evidence row, claim, or seam exists. */
  Explain = "explain",
  /** Trace references, flow, derivation, or dependency paths. */
  Trace = "trace",
  /** Compare two semantic surfaces, contracts, or loci. */
  Compare = "compare",
  /** Maintain Atlas itself. */
  Maintain = "maintain",
  /** Support refactor planning or impact analysis. */
  Refactor = "refactor",
  /** Verify static coherence, diagnostics, or consistency pressure. */
  Verify = "verify",
}

/** Caller family preserved across inquiry and continuation hops. */
export const enum InquiryCaller {
  /** Codex or another agent initiated the inquiry. */
  Codex = "codex",
  /** Human maintainer initiated or shaped the inquiry. */
  Human = "human",
  /** Tooling initiated the inquiry without direct conversation context. */
  Tool = "tool",
}

/** Subject payload accepted by the shared inquiry envelope. */
export type InquirySubject =
  | string
  | InquiryHandle
  | readonly InquiryHandle[]
  | Record<string, unknown>
  | readonly unknown[]
  | object;

/** Small caller context that should survive answer and continuation hops. */
export interface InquiryContext {
  /** Optional trace id assigned by a caller or continuation planner. */
  readonly traceId?: string;
  /** Who initiated this inquiry. */
  readonly caller?: InquiryCaller;
  /** Explicit assumptions the caller wants preserved with the answer. */
  readonly assumptions?: readonly string[];
}

/** Shared question envelope consumed by every Atlas lens. */
export interface Inquiry<TSubject = InquirySubject, TFilters = Record<string, unknown>> {
  /** Lens that owns the interpretation of subject, filters, and projection. */
  readonly lens: LensId;
  /** Place where this inquiry is rooted. */
  readonly locus: Locus;
  /** Caller intent used for answer wording and continuation planning. */
  readonly intent?: InquiryIntent;
  /** Optional subject inside the locus. */
  readonly subject?: TSubject;
  /** Lens-specific projection id. */
  readonly projection?: string;
  /** Lens-specific filters. */
  readonly filters?: TFilters;
  /** Shared budget lanes for large answers. */
  readonly budget?: Budget;
  /** Optional cursor/page request. */
  readonly page?: PageRequest;
  /** Caller-requested or inherited basis constraint. */
  readonly basis?: Basis;
  /** Optional caller context preserved across continuations. */
  readonly context?: InquiryContext;
}
