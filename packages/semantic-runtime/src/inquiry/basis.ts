export const enum InquiryBasisKind {
  /** Answer reads exact records already present in the kernel store. */
  KernelExact = 'kernel-exact',
  /** Answer depends on source discovery rather than a complete project graph. */
  SourceDiscovery = 'source-discovery',
  /** Answer depends on static/evaluator interpretation. */
  StaticEvaluation = 'static-evaluation',
  /** Answer includes recovered or partial-input facts. */
  Recovered = 'recovered',
  /** Answer cannot honestly claim an analyzable basis yet. */
  Unsupported = 'unsupported',
}

/** Explanation of what substrate the answer actually spent. */
export class InquiryBasis {
  constructor(
    /** Basis kind used for closure and trust interpretation. */
    readonly kind: InquiryBasisKind,
    /** Compact human/AI-readable description of the basis. */
    readonly summary: string,
  ) {}
}

export const KernelExactBasis = new InquiryBasis(
  InquiryBasisKind.KernelExact,
  'Answered from exact records already present in the active kernel store.',
);
