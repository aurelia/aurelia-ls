/** UI severity is a presentation signal that can be tuned by policy without changing code. */
export type DiagnosticSeverity = "error" | "warning" | "info";
/** Impact captures the real consequence if ignored, which can differ from UI severity. */
export type DiagnosticImpact =
  | "blocking" // Execution cannot proceed or output is unusable.
  | "degraded" // Output continues but is likely wrong or incomplete.
  | "informational"; // No behavioral impact; context only.
/** Actionability communicates how safe automation is (autofix vs guidance vs human). */
export type DiagnosticActionability = "autofix" | "guided" | "manual" | "none";
/** Stage tags where the diagnostic was produced to support routing and suppression. */
export type DiagnosticStage =
  | "lower"
  | "link"
  | "project"
  | "bind"
  | "typecheck"
  | "overlay-plan"
  | "overlay-emit"
  | "aot"
  | "ssr"
  | "ssg"
  | "hmr";
/** Surface indicates which outputs are allowed to render a diagnostic. */
export type DiagnosticSurface =
  | "lsp"
  | "vscode-inline"
  | "vscode-panel"
  | "vscode-status"
  | "cli"
  | "aot"
  | "ssr"
  | "ssg"
  | "hmr"
  | "telemetry";
/** Confidence expresses how trustworthy the diagnostic is, separate from severity. */
export type DiagnosticConfidence =
  | "exact" // Deterministic: precise location and cause are known.
  | "high" // Strong evidence, minor uncertainty remains.
  | "partial" // Some evidence, notable gaps or ambiguity.
  | "low" // Weak evidence; likely heuristic.
  | "manual"; // Human judgment required to validate.
/** Diagnostics inherit catalog confidence from registry semantics when needed. */
export type CatalogConfidence = import("../schema/types.js").CatalogConfidence;
/** Some diagnostics require a span, others can be project-scoped. */
export type DiagnosticSpanRequirement =
  | "span" // Must point to a source location to be actionable.
  | "project" // Applies to the project as a whole, not a specific span.
  | "either"; // Acceptable with or without a span.
/** Status tracks lifecycle (canonical vs migration cases). */
export type DiagnosticStatus =
  | "canonical" // Stable, preferred code for new usage.
  | "proposed" // Not finalized; may change or be removed.
  | "legacy" // Kept for mapping/back-compat, avoid new emits.
  | "deprecated"; // Superseded by another code, do not emit.
/** Category is the primary axis for policy and reporting. */
export type DiagnosticCategory =
  | "expression"
  | "template-syntax"
  | "resource-resolution"
  | "bindable-validation"
  | "meta-imports"
  | "policy"
  | "gaps"
  | "toolchain"
  | "ssr"
  | "ssg"
  | "hmr"
  | "project"
  | "legacy";

export type DiagnosticDataBase = {
  /** Maps to runtime error codes for parity and cross-tool linking. */
  aurCode?: string;
  /** Indicates results are from recovery paths and may be non-authoritative. */
  recovery?: boolean;
  /** Marks diagnostics that only exist at runtime, not in static analysis. */
  runtimeOnly?: boolean;
  /** Per-instance confidence can override catalog defaults. */
  confidence?: DiagnosticConfidence;
  /** Explicit stage is a fallback when source is ambiguous or not present. */
  stage?: DiagnosticStage;
};

/** Normalizes resource kinds for consistent diagnostics data and UI. */
export type DiagnosticResourceKind =
  | "custom-element"
  | "custom-attribute"
  | "template-controller"
  | "event"
  | "value-converter"
  | "binding-behavior";
/** Symbol kinds enable richer messages and suggestions for missing refs. */
export type DiagnosticSymbolKind =
  | "binding-behavior"
  | "value-converter"
  | "property"
  | "method"
  | "variable"
  | "resource";
/** Bindable ownership matters for grouping and component-level guidance. */
export type DiagnosticBindableOwnerKind =
  | "element"
  | "attribute"
  | "controller";

/** Required/optional data fields are validated to catch emitter mistakes. */
export type DiagnosticDataRequirement<TData extends DiagnosticDataBase = DiagnosticDataBase> = {
  readonly required?: readonly string[];
  readonly optional?: readonly string[];
  /** Examples feed docs and UI previews without hardcoding in consumers. */
  readonly example?: DiagnosticDataRecord;
};

/** Single source of truth for severity, policy, and presentation metadata. */
export type DiagnosticSpec<TData extends DiagnosticDataBase = DiagnosticDataBase> = {
  /** Category drives policy defaults and grouping. */
  readonly category: DiagnosticCategory;
  /** Status controls migration paths and exposure. */
  readonly status: DiagnosticStatus;
  /** Baseline severity before policy overrides (required for catalog specs). */
  readonly defaultSeverity?: DiagnosticSeverity;
  /** Impact captures real consequence for suppress/route decisions. */
  readonly impact: DiagnosticImpact;
  /** Actionability signals safe automation level. */
  readonly actionability: DiagnosticActionability;
  /** Enforces whether a source span is mandatory for rendering. */
  readonly span: DiagnosticSpanRequirement;
  /** Stage is the canonical origin for code classification. */
  readonly stages: readonly DiagnosticStage[];
  /** Limits which outputs should render the diagnostic. */
  readonly surfaces?: readonly DiagnosticSurface[];
  /** Default confidence communicates trust without per-instance overrides. */
  readonly defaultConfidence?: DiagnosticConfidence;
  /** Primary runtime code for parity with engine error codes. */
  readonly aurCode?: string;
  /** Known equivalent runtime codes used for mapping and migration. */
  readonly aurCodeHints?: readonly string[];
  /** Indicates diagnostics that should only appear at runtime. */
  readonly runtimeOnly?: boolean;
  /** Marks diagnostics produced via recovery paths. */
  readonly recovery?: boolean;
  /** Human-readable explanation for docs and tooling. */
  readonly description?: string;
  /** Declarative data contract for emitters and validators. */
  readonly data?: DiagnosticDataRequirement<TData>;
  /** Single canonical replacement for deprecated or legacy codes. */
  readonly replacement?: string;
  /** Explicit list of codes this diagnostic supersedes. */
  readonly replaces?: readonly string[];
};

/** Preserves literal types (especially stages) without boilerplate in callers. */
export function defineDiagnostic<
  TData extends DiagnosticDataBase,
  const TSpec extends DiagnosticSpec<TData> = DiagnosticSpec<TData>,
>(spec: TSpec): TSpec {
  return spec;
}

/** Fallback data shape when exact fields are unknown at compile time. */
export type DiagnosticDataRecord = DiagnosticDataBase & Record<string, unknown>;
/** Catalog is the authoritative registry of codes and metadata. */
export type DiagnosticsCatalog = Record<string, DiagnosticSpec<DiagnosticDataRecord>>;
/** Strict catalog contracts preserve canonical shapes without forcing defaults. */
export type DiagnosticsCatalogStrict = Record<string, DiagnosticSpec<DiagnosticDataRecord>>;
/** Code key type used for emitter typing and normalization. */
export type DiagnosticCode<Catalog extends DiagnosticsCatalog> = keyof Catalog & string;
/** Maps code -> data shape for strongly-typed emission. */
export type DiagnosticDataByCode<Catalog extends DiagnosticsCatalog> = {
  [K in keyof Catalog]: Catalog[K] extends DiagnosticSpec<infer D> ? D : never;
};
/** Selects the data contract for a specific diagnostic code. */
export type DiagnosticDataFor<Catalog extends DiagnosticsCatalog, Code extends keyof Catalog> =
  Catalog[Code] extends DiagnosticSpec<infer D> ? D : never;
