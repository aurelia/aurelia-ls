/** Substrate family that produced, budget-limited, or blocked an inquiry answer. */
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
  /** Static evaluator facts and explicit open seams. */
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
  /** The substrate closed the requested row, depth, route, fact, or text budget. */
  Budgeted = "budgeted",
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
  /** Authority comes from evaluator interpretation with explicit open seams. */
  Evaluator = "evaluator",
  /** Authority comes from product-owned kernel or vocabulary declarations. */
  Product = "product",
  /** Authority comes from explicit maintainer judgement. */
  Human = "human",
  /** No authority is claimed. */
  None = "none",
}

/** Relationship between basis lanes when an inquiry changes epistemic footing. */
export const enum BasisTransitionKind {
  /** The next inquiry preserves the same basis lane. */
  Preserve = "preserve",
  /** The next inquiry narrows or strengthens facts within a compatible basis lane. */
  Refine = "refine",
  /** The next inquiry joins facts from multiple basis lanes. */
  Join = "join",
  /** The next inquiry crosses into a different modeling authority. */
  Handoff = "handoff",
}

/** Explicit basis movement for continuations that should not hide authority changes. */
export interface BasisTransition {
  /** Basis movement kind. */
  readonly kind: BasisTransitionKind;
  /** Basis lanes consumed or left by the current inquiry. */
  readonly from: readonly BasisKind[];
  /** Basis lanes expected or entered by the next inquiry. */
  readonly to: readonly BasisKind[];
  /** Grounded explanation of why this transition is valid. */
  readonly summary: string;
}

/** Explanation of the substrate an answer actually spent. */
export interface Basis {
  /** Substrate family that produced or budget-limited the answer. */
  readonly kind: BasisKind;
  /** Whether the substrate closed, exhausted a budget, partially answered, or rejected the inquiry. */
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
