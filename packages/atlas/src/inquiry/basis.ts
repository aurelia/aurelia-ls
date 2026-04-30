/** Substrate family that produced, bounded, or blocked an inquiry answer. */
export const enum BasisKind {
  /** Static atlas contract declarations such as lenses, terrain, and substrate specs. */
  AtlasContract = "atlas-contract",
  /** Current source text read from the filesystem. */
  SourceText = "source-text",
  /** Source text read from an explicit git treeish rather than the working tree. */
  GitTree = "git-tree",
  /** TypeScript program structure before checker interpretation. */
  TypeScriptProgram = "typescript-program",
  /** TypeScript TypeChecker facts such as signatures, symbols, reference roles, and flow. */
  TypeScriptChecker = "typescript-checker",
  /** Conservative static evaluator facts and explicit open seams. */
  StaticEvaluator = "static-evaluator",
  /** Product-owned kernel substrate records, claims, products, and provenance. */
  ProductKernelSubstrate = "product-kernel-substrate",
  /** Product-owned controlled vocabulary and declared usage slots. */
  ProductVocabulary = "product-vocabulary",
  /** Narrow product-to-framework anchors declared through auLink. */
  AuLink = "aulink",
  /** Human-maintainer judgement captured as an explicit basis rather than hidden policy. */
  HumanJudgement = "human-judgement",
  /** No trusted substrate is available for this answer. */
  Unsupported = "unsupported",
}

/** Closure state for the substrate that backs an answer or evidence row. */
export const enum BasisClosure {
  /** The substrate closed the requested question within its declared model. */
  Exact = "exact",
  /** The substrate closed a deliberately bounded slice, such as a depth or row budget. */
  Bounded = "bounded",
  /** The substrate produced useful facts but did not close the whole question. */
  Partial = "partial",
  /** The substrate reached a modeled open seam. */
  Open = "open",
  /** The substrate cannot honestly support this inquiry shape. */
  Unsupported = "unsupported",
}

/** Freshness model for interpreting a basis identity. */
export const enum BasisFreshness {
  /** Basis comes from the current live workspace session. */
  Live = "live",
  /** Basis comes from a named snapshot produced outside the current read. */
  Snapshot = "snapshot",
  /** Basis comes from a git treeish. */
  GitTree = "git-tree",
  /** Basis is a static contract compiled into Atlas. */
  Static = "static",
}

/** Authority class that explains why consumers may trust or distrust a basis. */
export const enum BasisAuthority {
  /** Authority comes from Atlas contract declarations. */
  Contract = "contract",
  /** Authority comes from TypeScript checker semantics. */
  Checker = "checker",
  /** Authority comes from conservative evaluator interpretation. */
  Evaluator = "evaluator",
  /** Authority comes from product-owned kernel or vocabulary declarations. */
  Product = "product",
  /** Authority comes from explicit maintainer judgement. */
  Human = "human",
  /** No authority is claimed. */
  None = "none",
}

/** Explanation of the substrate an answer actually spent. */
export interface Basis {
  /** Substrate family that produced or bounded the answer. */
  readonly kind: BasisKind;
  /** Whether the substrate closed, bounded, partially answered, or rejected the inquiry. */
  readonly closure: BasisClosure;
  /** Trust authority behind this basis, kept separate from freshness and closure. */
  readonly authority?: BasisAuthority;
  /** Whether this basis is live, static, historical, or snapshot-backed. */
  readonly freshness?: BasisFreshness;
  /** Compact grounded explanation for future maintainers and agent consumers. */
  readonly summary: string;
  /** Optional stable identity such as package name, treeish, snapshot id, or project id. */
  readonly identity?: string;
  /** Optional version, schema id, commit, or semantic epoch for the basis. */
  readonly version?: string;
  /** Known limits that should affect trust or continuation choice. */
  readonly limitations?: readonly string[];
}

/** Reusable unsupported basis for answer shapes without an implemented substrate. */
export const UnsupportedBasis: Basis = {
  kind: BasisKind.Unsupported,
  closure: BasisClosure.Unsupported,
  authority: BasisAuthority.None,
  summary: "No implemented substrate was available for this inquiry.",
};

/** Reusable exact basis for answers sourced from the Atlas static contract layer. */
export const AtlasContractBasis: Basis = {
  kind: BasisKind.AtlasContract,
  closure: BasisClosure.Exact,
  authority: BasisAuthority.Contract,
  freshness: BasisFreshness.Static,
  summary: "Answered from Atlas static contracts.",
  identity: "@aurelia-ls/atlas",
};
