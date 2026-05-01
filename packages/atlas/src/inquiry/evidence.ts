import type { Basis } from "./basis.js";
import type { InquiryHandle } from "./handle.js";
import type { SourceRange } from "./locus.js";

/** Evidence classifier for facts returned by inquiry lenses. */
export const enum EvidenceKind {
  /** Exact source span that can be inspected or used as a continuation anchor. */
  SourceSpan = "source-span",
  /** TypeScript symbol or declaration identity. */
  Symbol = "symbol",
  /** TypeScript checker fact such as a type, signature, or flow relation. */
  TypeFact = "type-fact",
  /** Call or construction site observed in source/checker data. */
  CallSite = "call-site",
  /** DI registration write or helper expansion. */
  DiRegistration = "di-registration",
  /** DI lookup read such as container/service-locator resolution. */
  DiLookup = "di-lookup",
  /** Aurelia resource definition or syntax-resource carrier. */
  ResourceDefinition = "resource-definition",
  /** Product-owned semantic claim or claim graph row. */
  ProductClaim = "product-claim",
  /** Product vocabulary definition, slot, or usage. */
  VocabularyTerm = "vocabulary-term",
  /** Product-to-framework auLink anchor. */
  AuLinkAnchor = "aulink-anchor",
  /** Explicit seam that blocked complete closure. */
  OpenSeam = "open-seam",
  /** Atlas maintenance signal about contracts, wiring, or static coherence. */
  MaintenanceSignal = "maintenance-signal",
}

/** Role one evidence row plays in an answer. */
export const enum EvidenceRole {
  /** Evidence names the primary thing the inquiry asked about. */
  Subject = "subject",
  /** Evidence supports the answer. */
  Support = "support",
  /** Evidence complicates or weakens the answer. */
  Counterpoint = "counterpoint",
  /** Evidence marks a boundary, limit, or open seam. */
  Boundary = "boundary",
  /** Evidence is representative rather than exhaustive. */
  Example = "example",
  /** Evidence explains a diagnostic or maintenance issue. */
  Diagnostic = "diagnostic",
}

/** Confidence class for an evidence row before consumer-specific policy. */
export const enum EvidenceConfidence {
  /** Evidence is exact within the declared basis. */
  Exact = "exact",
  /** Evidence is strongly supported but may stop at declared analysis budgets or open seams. */
  Strong = "strong",
  /** Evidence is a heuristic steering signal. */
  Heuristic = "heuristic",
  /** Evidence has not declared a confidence class. */
  Unknown = "unknown",
}

/** Direct witness used by answers, continuations, and open seams. */
export interface Evidence {
  /** Optional answer-local or substrate-local evidence id. */
  readonly id?: string;
  /** Evidence classifier. */
  readonly kind: EvidenceKind;
  /** Role this evidence plays in the answer. */
  readonly role: EvidenceRole;
  /** Confidence class before consumer-specific trust policy. */
  readonly confidence?: EvidenceConfidence;
  /** Grounded explanation of what was observed. */
  readonly summary: string;
  /** Basis that produced this evidence, when more specific than the answer basis. */
  readonly basis?: Basis;
  /** Optional concrete source range for inspection continuations. */
  readonly source?: SourceRange;
  /** Optional handle for expanding the evidence. */
  readonly handle?: InquiryHandle;
  /** Lens-specific structured details kept behind the shared evidence envelope. */
  readonly data?: unknown;
}

/** Classifier for explicitly modeled unresolved seams. */
export const enum OpenSeamKind {
  /** Runtime-dependent behavior that static analysis should not pretend to close. */
  DynamicRuntime = "dynamic-runtime",
  /** Source syntax or TypeScript shape the current evaluator does not support. */
  UnsupportedSyntax = "unsupported-syntax",
  /** Symbol resolution failed or remained ambiguous. */
  UnresolvedSymbol = "unresolved-symbol",
  /** Traversal or evaluator depth limit stopped closure. */
  DepthLimit = "depth-limit",
  /** Substrate identity is known but stale for the current question. */
  StaleSubstrate = "stale-substrate",
  /** No lens contract exists for the requested question. */
  MissingLens = "missing-lens",
  /** Lens exists but does not support the selected locus. */
  UnsupportedLocus = "unsupported-locus",
  /** Lens exists but does not support the selected projection. */
  UnsupportedProjection = "unsupported-projection",
  /** A required substrate contract or implementation is missing. */
  MissingSubstrate = "missing-substrate",
  /** The available basis is not strong enough for the requested answer. */
  InsufficientBasis = "insufficient-basis",
  /** Seam is known but not yet classified. */
  Unknown = "unknown",
}

/** Explicit unresolved boundary carried by an answer. */
export interface OpenSeam {
  /** Optional seam id for continuation targeting. */
  readonly id?: string;
  /** Seam classifier. */
  readonly kind: OpenSeamKind;
  /** Grounded explanation of what prevented closure. */
  readonly summary: string;
  /** Evidence that exposed the seam, when available. */
  readonly evidence?: Evidence;
  /** Basis that reached or declared the seam. */
  readonly basis?: Basis;
  /** Optional handle for seam-specific follow-up. */
  readonly handle?: InquiryHandle;
  /** Lens-specific structured seam details. */
  readonly data?: unknown;
}
