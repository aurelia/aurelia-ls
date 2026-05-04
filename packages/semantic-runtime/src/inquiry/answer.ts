import type {
  ClaimHandle,
  EvidenceHandle,
  KernelRecordHandle,
  OpenSeamHandle,
  ProductHandle,
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

export const enum InquiryProjectionKind {
  /** Return durable handles and summaries only. */
  Handles = 'handles',
  /** Return compact typed fields without expanding neighborhoods. */
  Compact = 'compact',
  /** Return hydrated product details where available. */
  Detail = 'detail',
  /** Return provenance, evidence, and claim explanation paths. */
  Explanation = 'explanation',
  /** Return surrounding graph neighborhoods for app-map or architecture views. */
  GraphNeighborhood = 'graph-neighborhood',
}

export const enum InquiryExpansionKind {
  /** Expand a materialized-product handle through a typed product-detail slot. */
  ProductDetail = 'product-detail',
  /** Expand claims adjacent to the selected result. */
  ClaimNeighborhood = 'claim-neighborhood',
  /** Expand evidence and provenance records behind the selected result. */
  ProvenanceTrace = 'provenance-trace',
  /** Expand source addresses around the selected result. */
  SourceContext = 'source-context',
  /** Expand open seams that prevented closure. */
  OpenSeam = 'open-seam',
}

export const enum InquiryContinuationKind {
  /** Continue an ordered result with the next page cursor. */
  NextPage = 'next-page',
  /** Narrow an ambiguous answer to a specific source file. */
  SelectSourceFile = 'select-source-file',
  /** Inventory admitted source files before selecting a source locus. */
  ListAdmittedSources = 'list-admitted-sources',
  /** Expand a product handle through the product-detail sidecar. */
  ExpandProductDetail = 'expand-product-detail',
  /** Inspect claims adjacent to a selected handle or product. */
  InspectClaimNeighborhood = 'inspect-claim-neighborhood',
  /** Trace provenance, evidence, or source context behind an answer. */
  TraceProvenance = 'trace-provenance',
  /** Inspect open seams that blocked closure. */
  InspectOpenSeams = 'inspect-open-seams',
  /** Ask a narrower question when an answer was ambiguous. */
  NarrowAmbiguity = 'narrow-ambiguity',
  /** Ask a different query shape or locus. */
  Reroute = 'reroute',
}

/** One expansion that was requested, returned, or suggested by an answer. */
export class InquiryExpansion {
  constructor(
    /** Expansion lane independent from Atlas and tooling, IDE, AOT, or any other adapter. */
    readonly expansionKind: InquiryExpansionKind,
    /** Records this expansion reads or proposes to read. */
    readonly recordHandles: readonly KernelRecordHandle[] = [],
    /** Product handles whose rich details are relevant to this expansion. */
    readonly productHandles: readonly ProductHandle[] = [],
    /** Compact explanation of why this expansion matters. */
    readonly summary: string | null = null,
  ) {}
}

/** Consumer-neutral projection shape selected for one answer. */
export class InquiryProjection {
  constructor(
    /** Projection lane chosen by the query or adapter. */
    readonly projectionKind: InquiryProjectionKind,
    /** Expansion work already represented by this answer. */
    readonly expansions: readonly InquiryExpansion[] = [],
  ) {}
}

/** Suggested next inquiry that preserves uncertainty and route context. */
export class InquiryContinuation<TQuery> {
  constructor(
    /** Machine-readable continuation kind. */
    readonly kind: InquiryContinuationKind,
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
    /** Short answer summary for IDE, Atlas, tooling, and agent consumers. */
    readonly summary: string,
    /** Basis describing what substrate the answer actually spent. */
    readonly basis: InquiryBasis,
    /** Structured result value for this query. */
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
    /** Projection lane and expansions represented by this answer. */
    readonly projection: InquiryProjection | null = null,
  ) {}
}
