/** Top-level namespace that owns one family of inquiry handles. */
export const enum HandleNamespace {
  /** Handles that name repository-wide areas or contracts. */
  Repo = "repo",
  /** Handles that name package roots or package identities. */
  Package = "package",
  /** Handles that name source files or source ranges. */
  Source = "source",
  /** Handles that name TypeScript symbols independent from checker facts. */
  Symbol = "symbol",
  /** Handles that name TypeScript program or checker facts. */
  TypeScript = "typescript",
  /** Handles that name product kernel, vocabulary, claim, or auLink facts. */
  Product = "product",
  /** Handles that name framework DI, evaluator, or materialization facts. */
  Framework = "framework",
  /** Handles that name Atlas contracts or maintenance facts. */
  Atlas = "atlas",
}

/** Stable handle kind used inside continuations, evidence, and loci. */
export const enum HandleKind {
  /** Repository terrain area such as active product, framework, or deferred legacy code. */
  RepoArea = "repo-area",
  /** Configured package or package root. */
  Package = "package",
  /** Source file in the current source basis. */
  SourceFile = "source-file",
  /** Exact source range suitable for source/type follow-up reads. */
  SourceRange = "source-range",
  /** TypeScript symbol or declaration target. */
  Symbol = "symbol",
  /** TypeScript checker fact such as type, signature, or flow carrier. */
  TypeFact = "type-fact",
  /** Product kernel record or materialized product envelope. */
  ProductRecord = "product-record",
  /** Product semantic claim or claim-graph row. */
  ProductClaim = "product-claim",
  /** Product-owned vocabulary term or usage slot. */
  VocabularyTerm = "vocabulary-term",
  /** auLink product-to-framework anchor. */
  AuLinkAnchor = "aulink-anchor",
  /** Aurelia framework DI key. */
  DiKey = "di-key",
  /** Aurelia framework DI provider or registration association. */
  DiProvider = "di-provider",
  /** Static evaluator value or effect. */
  EvaluatorValue = "evaluator-value",
  /** Explicit unresolved seam that blocked closure. */
  OpenSeam = "open-seam",
  /** Inquiry lens contract. */
  Lens = "lens",
  /** Named continuation edge returned by an answer. */
  Continuation = "continuation",
}

/** Navigable pointer in the active Atlas world. */
export interface InquiryHandle {
  /** Namespace that owns the handle id. */
  readonly namespace: HandleNamespace;
  /** Concrete handle family within the namespace. */
  readonly kind: HandleKind;
  /** Namespace-local stable id for the current inquiry/session contract. */
  readonly id: string;
  /** Optional short label for compact answer rows. */
  readonly label?: string;
  /** Optional grounded explanation of what the handle points at. */
  readonly summary?: string;
}

/** Handle that points at source text. */
export interface SourceHandle extends InquiryHandle {
  /** Source handles are owned by the source namespace. */
  readonly namespace: HandleNamespace.Source;
  /** Source handles identify either files or exact ranges. */
  readonly kind: HandleKind.SourceFile | HandleKind.SourceRange;
  /** Source path in the active basis. */
  readonly filePath: string;
}

/** Handle that points at a TypeScript symbol or checker fact. */
export interface SymbolHandle extends InquiryHandle {
  /** Symbol-like handles live in symbol or TypeScript namespaces. */
  readonly namespace: HandleNamespace.Symbol | HandleNamespace.TypeScript;
  /** Symbol-like handles identify declarations or checker facts. */
  readonly kind: HandleKind.Symbol | HandleKind.TypeFact;
  /** Display or declaration name for the symbol target. */
  readonly name: string;
  /** Optional source file that narrows the symbol. */
  readonly filePath?: string;
  /** Optional package name that narrows the symbol. */
  readonly packageName?: string;
}

/** Handle that points at product-owned semantic substrate. */
export interface ProductHandle extends InquiryHandle {
  /** Product handles are owned by the product namespace. */
  readonly namespace: HandleNamespace.Product;
  /** Product handles cover records, claims, vocabulary, and auLink anchors. */
  readonly kind: HandleKind.ProductRecord | HandleKind.ProductClaim | HandleKind.VocabularyTerm | HandleKind.AuLinkAnchor;
}

/** Handle that points at framework semantic substrate. */
export interface FrameworkHandle extends InquiryHandle {
  /** Framework handles are owned by the framework namespace. */
  readonly namespace: HandleNamespace.Framework;
  /** Framework handles cover DI, evaluator, and framework open-seam facts. */
  readonly kind: HandleKind.DiKey | HandleKind.DiProvider | HandleKind.EvaluatorValue | HandleKind.OpenSeam;
}

/** Build the canonical map key for a handle-like value. */
export function handleKey(handle: Pick<InquiryHandle, "namespace" | "kind" | "id">): string {
  return `${handle.namespace}:${handle.kind}:${handle.id}`;
}
