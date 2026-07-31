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
import type { InquiryContinuationApplicability } from './continuation-intent.js';

export const enum InquiryAnswerResult {
  /** The query executed and produced its declared answer shape. */
  Answered = 'answered',
  /** The query shape or requested interpretation is outside this runtime boundary. */
  Unsupported = 'unsupported',
  /** The request envelope, selector, or cursor was invalid or stale. */
  Invalid = 'invalid',
  /** Execution failed before a trustworthy answer could be produced. */
  Failed = 'failed',
}

export const enum InquiryAnswerSelection {
  /** Selection does not apply to this collection, summary, or static-catalog answer. */
  NotApplicable = 'not-applicable',
  /** One semantic locus was selected with enough authority for this answer. */
  Exact = 'exact',
  /** The requested semantic locus was absent. */
  Absent = 'absent',
  /** More than one semantic locus remains plausible. */
  Ambiguous = 'ambiguous',
  /** Another query or locus owns the requested answer. */
  Rerouted = 'rerouted',
}

export const enum InquiryAnswerCoverage {
  /** The runtime covered the requested semantic basis completely. */
  Complete = 'complete',
  /** One or more facts required for complete semantic coverage remain open. */
  Open = 'open',
  /** A semantic analysis guardrail deliberately stopped enumeration. */
  Truncated = 'truncated',
  /** Coverage does not apply because the request was invalid or unsupported. */
  NotApplicable = 'not-applicable',
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
  /** Follow a fully shaped query payload; target query and intent carry the concrete lane. */
  FollowQuery = 'follow-query',
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

/** Transport-safe value form for continuation action enum members. */
export type InquiryContinuationKindValue = InquiryContinuationKind | `${InquiryContinuationKind}`;

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
    /** Intent and evidence gates for choosing this continuation without ranking by vibes. */
    readonly applicability: InquiryContinuationApplicability | null = null,
  ) {}
}

export interface InquiryAnswerInit<TValue, TQuery> {
  readonly result: InquiryAnswerResult;
  readonly selection: InquiryAnswerSelection;
  readonly coverage: InquiryAnswerCoverage;
  readonly locus: InquiryLocus;
  readonly summary: string;
  readonly basis: InquiryBasis;
  readonly value: TValue;
  readonly evidenceHandles?: readonly EvidenceHandle[];
  readonly provenanceHandles?: readonly ProvenanceHandle[];
  readonly claimHandles?: readonly ClaimHandle[];
  readonly openSeamHandles?: readonly OpenSeamHandle[];
  readonly continuations?: readonly InquiryContinuation<TQuery>[];
  readonly page?: InquiryPageInfo | null;
  readonly projection?: InquiryProjection | null;
}

/** Shared answer envelope for kernel-backed inquiry surfaces. */
export class InquiryAnswer<TValue, TQuery> {
  /** Whether execution produced an answer, independently from selection and semantic coverage. */
  readonly result: InquiryAnswerResult;
  /** Selection state for the requested semantic locus. */
  readonly selection: InquiryAnswerSelection;
  /** Coverage of the selected semantic basis, independent from transport paging. */
  readonly coverage: InquiryAnswerCoverage;
  /** Locus this answer is about. */
  readonly locus: InquiryLocus;
  /** Short answer summary for IDE, Atlas, tooling, and agent consumers. */
  readonly summary: string;
  /** Basis describing what substrate the answer actually spent. */
  readonly basis: InquiryBasis;
  /** Structured result value for this query. */
  readonly value: TValue;
  /** Evidence handles directly relevant to the answer. */
  readonly evidenceHandles: readonly EvidenceHandle[];
  /** Provenance handles that can expand the explanation. */
  readonly provenanceHandles: readonly ProvenanceHandle[];
  /** Claim handles consumed or returned by the query. */
  readonly claimHandles: readonly ClaimHandle[];
  /** Open seams that prevented complete coverage. */
  readonly openSeamHandles: readonly OpenSeamHandle[];
  /** Suggested follow-up queries. */
  readonly continuations: readonly InquiryContinuation<TQuery>[];
  /** Page state when this answer returns one page of a larger ordered result. */
  readonly page: InquiryPageInfo | null;
  /** Projection lane and expansions represented by this answer. */
  readonly projection: InquiryProjection | null;

  constructor(init: InquiryAnswerInit<TValue, TQuery>) {
    this.result = init.result;
    this.selection = init.selection;
    this.coverage = init.coverage;
    this.locus = init.locus;
    this.summary = init.summary;
    this.basis = init.basis;
    this.value = init.value;
    this.evidenceHandles = init.evidenceHandles ?? [];
    this.provenanceHandles = init.provenanceHandles ?? [];
    this.claimHandles = init.claimHandles ?? [];
    this.openSeamHandles = init.openSeamHandles ?? [];
    this.continuations = init.continuations ?? [];
    this.page = init.page ?? null;
    this.projection = init.projection ?? null;
  }
}
