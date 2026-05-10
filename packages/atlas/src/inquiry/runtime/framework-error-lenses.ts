import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { evidenceLimit, pageOffset, rowLimit } from "../paging.js";
import type { SourceProject } from "../../source/index.js";
import {
  frameworkErrorRollupForRows,
  readFrameworkErrorAnalysis,
  type FrameworkErrorAnalysis,
  type FrameworkErrorCodeRow,
  type FrameworkErrorPackageRow,
  type FrameworkErrorUsageRow,
} from "./framework-error-analysis.js";
import {
  hasAnyInquiryStringFilter,
  inquiryLowerStringFilter,
  inquiryPackageIdFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import {
  optionalNextPageContinuation,
  sourceInspectionContinuations,
} from "./lens-continuation-utils.js";

export interface FrameworkErrorsValue {
  readonly version: FrameworkErrorAnalysis["version"];
  readonly rollup: FrameworkErrorAnalysis["rollup"];
  readonly packages?: readonly FrameworkErrorPackageRow[];
  readonly codes?: readonly FrameworkErrorCodeRow[];
  readonly usages?: readonly FrameworkErrorUsageRow[];
}

type FrameworkErrorsProjection = "summary" | "packages" | "codes" | "usages";

interface FilteredFrameworkErrorRows {
  readonly packages: readonly FrameworkErrorPackageRow[];
  readonly codes: readonly FrameworkErrorCodeRow[];
  readonly usages: readonly FrameworkErrorUsageRow[];
}

type FrameworkErrorSourceRow = FrameworkErrorCodeRow | FrameworkErrorUsageRow;

export function answerFrameworkErrors(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkErrorsValue> {
  const analysis = readFrameworkErrorAnalysis(sourceProject);
  const basis = frameworkErrorBasis();
  switch (frameworkErrorsProjection(inquiry)) {
    case "summary":
      return answerFrameworkErrorsSummary(inquiry, analysis, basis);
    case "packages": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages);
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:packages",
        "Aurelia framework package error-code row(s)",
        filtered.packages,
        basis,
        (rows) => ({ version: analysis.version, rollup, packages: rows }),
        frameworkErrorEvidenceForPackage,
        () => [],
      );
    }
    case "codes": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages);
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:codes",
        "Aurelia framework error/event code row(s)",
        filtered.codes,
        basis,
        (rows) => ({ version: analysis.version, rollup, codes: rows }),
        frameworkErrorEvidenceForSourceRow,
        frameworkErrorSourceContinuations,
      );
    }
    case "usages": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages);
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:usages",
        "Aurelia framework error usage row(s)",
        filtered.usages,
        basis,
        (rows) => ({ version: analysis.version, rollup, usages: rows }),
        frameworkErrorEvidenceForSourceRow,
        frameworkErrorSourceContinuations,
      );
    }
  }
}

function answerFrameworkErrorsSummary(
  inquiry: Inquiry,
  analysis: FrameworkErrorAnalysis,
  basis: readonly Basis[],
): Answer<FrameworkErrorsValue> {
  const filtered = filterFrameworkErrorRows(analysis, inquiry);
  const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages);
  const codes = filtered.codes.slice(0, rowLimit(inquiry));
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${rollup.codeCount} Aurelia framework error/event code(s), ${rollup.messageCount} mapped message(s), and ${rollup.usageCount} usage site(s).`,
    {
      value: {
        version: analysis.version,
        rollup,
        codes,
      },
      basis,
      evidence: codes.slice(0, evidenceLimit(inquiry)).map(frameworkErrorEvidenceForSourceRow),
      continuations: frameworkErrorContinuations(inquiry),
    },
  );
}

function answerFrameworkErrorRows<TRow>(
  inquiry: Inquiry,
  familyId: string,
  rowLabel: string,
  rows: readonly TRow[],
  basis: readonly Basis[],
  valueWithRows: (rows: readonly TRow[]) => FrameworkErrorsValue,
  evidenceForRow: (row: TRow) => Evidence,
  sourceContinuationsForRow: (row: TRow) => readonly Continuation[],
): Answer<FrameworkErrorsValue> {
  const rowFamily = new PagedRowFamily<TRow>({
    id: familyId,
    rowLabel,
    evidenceForRow,
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the paged framework error row family.",
        routeSummary: "Next Aurelia framework error row page.",
      }),
      ...rows.flatMap((row) => sourceContinuationsForRow(row)),
      ...frameworkErrorContinuations(inquiry),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => valueWithRows(page.rows),
  });
}

function frameworkErrorsProjection(inquiry: Inquiry): FrameworkErrorsProjection {
  switch (inquiry.projection) {
    case "packages":
    case "codes":
    case "usages":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function filterFrameworkErrorRows(
  analysis: FrameworkErrorAnalysis,
  inquiry: Inquiry,
): FilteredFrameworkErrorRows {
  const packageId = inquiryPackageIdFilter(inquiry);
  const enumName = inquiryStringFilter(inquiry, "enumName");
  const mechanism = inquiryStringFilter(inquiry, "mechanism");
  const effect = inquiryStringFilter(inquiry, "effect");
  const query = inquiryLowerStringFilter(inquiry, "query");
  const packages = analysis.packages.filter((row) =>
    (packageId === undefined || row.id === packageId) &&
    (query === undefined || frameworkErrorPackageMatches(row, query))
  );
  const packageIds = new Set(packages.map((row) => row.id));
  const codes = analysis.codes.filter((row) =>
    packageIds.has(row.packageId) &&
    (enumName === undefined || row.enumName === enumName) &&
    (query === undefined || frameworkErrorCodeMatches(row, query))
  );
  const codeKeys = new Set(codes.map((row) => `${row.packageId}:${row.enumName}:${row.name}`));
  const hasCodeFilter = hasAnyInquiryStringFilter(inquiry, ["enumName"]);
  const usages = analysis.usages.filter((row) =>
    packageIds.has(row.packageId) &&
    (mechanism === undefined || row.mechanism === mechanism) &&
    (effect === undefined || row.effect === effect) &&
    (!hasCodeFilter || (row.enumName != null && row.codeName != null && codeKeys.has(`${row.packageId}:${row.enumName}:${row.codeName}`))) &&
    (query === undefined || frameworkErrorUsageMatches(row, query))
  );
  const usedPackageIds = new Set([
    ...codes.map((row) => row.packageId),
    ...usages.map((row) => row.packageId),
  ]);
  return {
    packages: packages.filter((row) => usedPackageIds.has(row.id) || !hasExplicitFrameworkErrorFilter(inquiry)),
    codes,
    usages,
  };
}

function frameworkErrorPackageMatches(row: FrameworkErrorPackageRow, query: string): boolean {
  return row.id.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.summary.toLowerCase().includes(query);
}

function frameworkErrorCodeMatches(row: FrameworkErrorCodeRow, query: string): boolean {
  return row.packageId.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.enumName.toLowerCase().includes(query) ||
    row.name.toLowerCase().includes(query) ||
    row.codeLabel.toLowerCase().includes(query) ||
    (row.message?.toLowerCase().includes(query) ?? false) ||
    row.summary.toLowerCase().includes(query);
}

function frameworkErrorUsageMatches(row: FrameworkErrorUsageRow, query: string): boolean {
  return row.packageId.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.mechanism.toLowerCase().includes(query) ||
    row.effect.toLowerCase().includes(query) ||
    (row.enumName?.toLowerCase().includes(query) ?? false) ||
    (row.codeName?.toLowerCase().includes(query) ?? false) ||
    (row.codeLabel?.toLowerCase().includes(query) ?? false) ||
    row.summary.toLowerCase().includes(query);
}

function hasExplicitFrameworkErrorFilter(inquiry: Inquiry): boolean {
  return hasAnyInquiryStringFilter(inquiry, ["enumName", "mechanism", "effect", "query"]);
}

function frameworkErrorEvidenceForPackage(row: FrameworkErrorPackageRow): Evidence {
  return {
    id: `${row.id}:framework-error:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkErrorEvidenceBasis(),
    data: row,
  };
}

function frameworkErrorEvidenceForSourceRow(
  row: FrameworkErrorCodeRow | FrameworkErrorUsageRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: frameworkErrorEvidenceBasis(),
    source: row.source,
    data: row,
  };
}

function frameworkErrorSourceContinuations(row: FrameworkErrorSourceRow): readonly Continuation[] {
  return sourceInspectionContinuations(row.source, {
    basis: [BasisKind.TypeScriptProgram],
    rationale: "Inspect the exact framework source span behind this error-code row.",
    routeSummary: "Exact source span for this Aurelia framework error row.",
  });
}

function frameworkErrorContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    {
      id: "framework.errors:codes",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect framework error/event code definitions.",
      inquiry: {
        ...inquiry,
        projection: "codes",
      },
    },
    {
      id: "framework.errors:usages",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect framework error-code usage sites.",
      inquiry: {
        ...inquiry,
        projection: "usages",
      },
    },
    {
      id: "framework.errors:packages",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect package-level framework error-code rollups.",
      inquiry: {
        ...inquiry,
        projection: "packages",
      },
    },
  ];
}

function frameworkErrorBasis(summary = "Aurelia framework error rows are AST-derived from admitted framework source."): readonly Basis[] {
  return [
    frameworkErrorEvidenceBasis(summary),
    {
      kind: BasisKind.SourceText,
      authority: BasisAuthority.None,
      freshness: BasisFreshness.Live,
      closure: BasisClosure.Partial,
      summary: "Rows preserve exact source spans for framework error definitions and usages when available.",
    },
  ];
}

function frameworkErrorEvidenceBasis(
  summary = "Aurelia framework error rows are AST-derived from admitted framework source.",
): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    closure: BasisClosure.Partial,
    summary,
  };
}
