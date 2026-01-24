import type { SourceSpan } from "../../model/index.js";
import type { DiagnosticRelated } from "../../model/diagnostics.js";
import type { Origin } from "../../model/origin.js";
import type { DocumentUri } from "../../program/primitives.js";
import type {
  DiagnosticActionability,
  DiagnosticCategory,
  DiagnosticConfidence,
  CatalogConfidence,
  DiagnosticImpact,
  DiagnosticSeverity,
  DiagnosticStage,
  DiagnosticSurface,
  DiagnosticSpec,
  DiagnosticsCatalog,
  DiagnosticDataBase,
  DiagnosticDataRecord,
} from "../types.js";

export type DiagnosticCodeValue = string;

export type RawDiagnostic = {
  readonly code: string;
  readonly message: string;
  readonly severity?: DiagnosticSeverity;
  readonly span?: SourceSpan;
  readonly uri?: DocumentUri;
  readonly stage?: DiagnosticStage;
  readonly source?: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly origin?: Origin | null;
  readonly related?: readonly DiagnosticRelated[];
};

export type DiagnosticIssueKind =
  | "unknown-code"
  | "conditional-code"
  | "missing-required-data"
  | "invalid-severity"
  | "invalid-impact"
  | "invalid-actionability"
  | "missing-span"
  | "missing-uri"
  | "disallowed-status"
  | "conflicting-default"
  | "missing-severity";

export type DiagnosticIssue = {
  readonly kind: DiagnosticIssueKind;
  readonly message: string;
  readonly rawCode?: string;
  readonly code?: DiagnosticCodeValue;
  readonly field?: string;
};

export type NormalizedDiagnostic = {
  readonly raw: RawDiagnostic;
  readonly code: DiagnosticCodeValue;
  readonly spec: DiagnosticSpec<DiagnosticDataRecord>;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  readonly impact: DiagnosticImpact;
  readonly actionability: DiagnosticActionability;
  readonly span?: SourceSpan;
  readonly uri?: DocumentUri;
  readonly stage?: DiagnosticStage;
  readonly source?: string;
  readonly data: DiagnosticDataRecord;
  readonly origin?: Origin | null;
  readonly related?: readonly DiagnosticRelated[];
  readonly suppressed?: boolean;
  readonly suppressionReason?: string;
  readonly issues?: readonly DiagnosticIssue[];
};

export type NormalizationResult = {
  readonly diagnostics: readonly NormalizedDiagnostic[];
  readonly issues: readonly DiagnosticIssue[];
  readonly dropped: readonly RawDiagnostic[];
};

export type DiagnosticOverride = {
  readonly severity?: DiagnosticSeverity | "off";
  readonly impact?: DiagnosticImpact;
  readonly actionability?: DiagnosticActionability;
};

export type DiagnosticsPolicyConfig = {
  readonly defaults?: DiagnosticOverride;
  readonly categories?: Partial<Record<DiagnosticCategory, DiagnosticOverride>>;
  readonly codes?: Partial<Record<string, DiagnosticOverride>>;
  readonly surfaces?: Partial<Record<DiagnosticSurface, DiagnosticOverride>>;
  readonly modes?: Partial<Record<string, DiagnosticOverride>>;
  readonly allowSuppressBlocking?: boolean;
  readonly gapSummary?: {
    readonly enabled?: boolean;
  };
  readonly confidence?: {
    readonly min: CatalogConfidence;
  };
};

export type PolicyContext = {
  readonly surface?: DiagnosticSurface;
  readonly mode?: string;
  readonly confidence?: DiagnosticConfidence;
  readonly gapCount?: number;
  readonly catalogConfidence?: CatalogConfidence;
};

export type ResolvedDiagnostic = NormalizedDiagnostic & {
  readonly severity: DiagnosticSeverity;
  readonly impact: DiagnosticImpact;
  readonly actionability: DiagnosticActionability;
  readonly suppressed?: boolean;
  readonly suppressionReason?: string;
};

export type RoutedDiagnostics = {
  readonly bySurface: ReadonlyMap<DiagnosticSurface, readonly ResolvedDiagnostic[]>;
  readonly suppressed: readonly ResolvedDiagnostic[];
};

export type RoutingContext = {
  readonly surfaces?: readonly DiagnosticSurface[];
  readonly requireSpanFor?: readonly DiagnosticSurface[];
};

export type AggregationContext = {
  readonly dedupe?: boolean;
  readonly sort?: boolean;
};

export type DiagnosticsCatalogSnapshot = {
  readonly catalog: DiagnosticsCatalog;
};

export type DiagnosticCodeResolution = {
  readonly code: DiagnosticCodeValue | null;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly issues?: readonly DiagnosticIssue[];
};

export type DiagnosticCodeResolver = (
  raw: RawDiagnostic,
  catalog: DiagnosticsCatalog,
) => DiagnosticCodeResolution;
