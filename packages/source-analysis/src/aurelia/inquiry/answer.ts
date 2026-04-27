import type {
  ClaimHandle,
  EvidenceHandle,
  OpenSeamHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { InquiryBasis } from './basis.js';
import type { InquiryLocus } from './locus.js';
import type { InquiryPageInfo } from './page.js';

export const enum InquiryOutcomeKind {
  /** The query closed with the requested result. */
  Hit = 'hit',
  /** The query was valid but found no matching fact in the selected locus. */
  Miss = 'miss',
  /** The query found multiple incompatible candidates and needs narrowing. */
  Ambiguous = 'ambiguous',
  /** The query reached an explicitly modeled unresolved seam. */
  Open = 'open',
  /** The query produced useful results but did not close the full basis. */
  Partial = 'partial',
  /** The query shape or requested interpretation is not supported yet. */
  Unsupported = 'unsupported',
  /** The query should be answered by a different locus or query shape. */
  Reroute = 'reroute',
}

/** Suggested next inquiry that preserves uncertainty and route context. */
export class InquiryContinuation<TQuery> {
  constructor(
    /** Machine-readable continuation kind. */
    readonly kind: string,
    /** Human/AI-readable reason this continuation is useful. */
    readonly rationale: string,
    /** Next query shape. */
    readonly query: TQuery,
  ) {}
}

/** Shared answer envelope for kernel-backed inquiry surfaces. */
export class InquiryAnswer<TValue, TQuery> {
  constructor(
    /** Query outcome without hiding miss, open, partial, or unsupported states. */
    readonly outcome: InquiryOutcomeKind,
    /** Locus this answer is about. */
    readonly locus: InquiryLocus,
    /** Short answer summary for IDE/MCP/agent consumers. */
    readonly summary: string,
    /** Basis describing what substrate the answer actually spent. */
    readonly basis: InquiryBasis,
    /** Structured result payload for this query. */
    readonly value: TValue,
    /** Evidence handles directly relevant to the answer. */
    readonly evidenceHandles: readonly EvidenceHandle[] = [],
    /** Provenance handles that can expand the explanation. */
    readonly provenanceHandles: readonly ProvenanceHandle[] = [],
    /** Claim handles consumed or returned by the query. */
    readonly claimHandles: readonly ClaimHandle[] = [],
    /** Open seams that prevented complete closure. */
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
    /** Suggested next useful queries. */
    readonly continuations: readonly InquiryContinuation<TQuery>[] = [],
    /** Page state when this answer returns one page of a larger ordered result. */
    readonly page: InquiryPageInfo | null = null,
  ) {}
}
