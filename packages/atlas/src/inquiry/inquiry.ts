import type { Basis } from "./basis.js";
import type { Budget, PageRequest } from "./budget.js";
import type { InquiryHandle } from "./handle.js";
import type { LensId } from "./lens.js";
import type { Locus } from "./locus.js";

/** Subject payload accepted by the shared inquiry envelope. */
export type InquirySubject =
  | string
  | InquiryHandle
  | readonly InquiryHandle[]
  | Record<string, unknown>
  | readonly unknown[]
  | object;

/** Shared question envelope consumed by every Atlas lens. */
export interface Inquiry<TSubject = InquirySubject, TFilters = Record<string, unknown>> {
  /** Lens that owns the interpretation of subject, filters, and projection. */
  readonly lens: LensId;
  /** Place where this inquiry is rooted. */
  readonly locus: Locus;
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
}
