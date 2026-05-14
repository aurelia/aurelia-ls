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
import { LocusKind } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { evidenceLimit, pageOffset, rowLimit } from "../paging.js";
import type { SourceProject } from "../../source/index.js";
import {
  frameworkErrorUsageCodeIsUnresolved,
  frameworkErrorUsageIsIntentionallyUnclaimedRawAuthority,
  frameworkErrorUsageIsOpenRawAuthorityGap,
  frameworkErrorUsageIsRawAuthorityGap,
  frameworkErrorDefinitionIdentity,
  frameworkErrorDiagnosticCodeRowsForRows,
  frameworkErrorDiagnosticFrontiersForRows,
  frameworkErrorFamiliesForRows,
  frameworkErrorRollupForRows,
  readFrameworkErrorAnalysis,
  type FrameworkErrorAnalysis,
  type FrameworkErrorCodeRow,
  type FrameworkErrorDiagnosticCodeDisposition,
  type FrameworkErrorDiagnosticCodeRow,
  type FrameworkErrorDiagnosticFrontierRow,
  type FrameworkErrorFamilyRow,
  type FrameworkErrorPackageRow,
  type FrameworkErrorSemanticRuntimeReferenceRow,
  type FrameworkErrorSemanticRuntimeRawReferenceRow,
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
  readonly families?: readonly FrameworkErrorFamilyRow[];
  readonly diagnosticFrontiers?: readonly FrameworkErrorDiagnosticFrontierRow[];
  readonly diagnosticCodes?: readonly FrameworkErrorDiagnosticCodeRow[];
  readonly codes?: readonly FrameworkErrorCodeRow[];
  readonly usages?: readonly FrameworkErrorUsageRow[];
  readonly semanticRuntimeReferences?: readonly FrameworkErrorSemanticRuntimeReferenceRow[];
  readonly semanticRuntimeRawReferences?: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[];
}

type FrameworkErrorsProjection = "summary" | "packages" | "families" | "diagnostic-frontiers" | "diagnostic-codes" | "codes" | "usages" | "semantic-references" | "semantic-raw-references";
type FrameworkErrorGapFilter =
  | "code-without-message"
  | "unused-code"
  | "unresolved-usage-code"
  | "raw-new-error"
  | "raw-error-factory-call"
  | "raw-error-usage"
  | "raw-error-authority-gap"
  | "intentionally-unclaimed-raw-authority"
  | "unresolved-semantic-runtime-reference"
  | "unresolved-semantic-runtime-raw-reference";

interface FilteredFrameworkErrorRows {
  readonly packages: readonly FrameworkErrorPackageRow[];
  readonly codes: readonly FrameworkErrorCodeRow[];
  readonly usages: readonly FrameworkErrorUsageRow[];
  readonly semanticRuntimeReferences: readonly FrameworkErrorSemanticRuntimeReferenceRow[];
  readonly semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[];
}

type FrameworkErrorSourceRow =
  | FrameworkErrorCodeRow
  | FrameworkErrorDiagnosticCodeRow
  | FrameworkErrorDiagnosticFrontierRow
  | FrameworkErrorUsageRow
  | FrameworkErrorSemanticRuntimeReferenceRow
  | FrameworkErrorSemanticRuntimeRawReferenceRow;

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
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages, filtered.semanticRuntimeReferences, filtered.semanticRuntimeRawReferences);
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
    case "families": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages, filtered.semanticRuntimeReferences, filtered.semanticRuntimeRawReferences);
      const families = frameworkErrorFamiliesForRows(filtered.codes, filtered.usages);
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:families",
        "Aurelia framework error-code family row(s)",
        families,
        basis,
        (rows) => ({ version: analysis.version, rollup, families: rows }),
        frameworkErrorEvidenceForSourceBackedRow,
        frameworkErrorFamilyContinuations,
      );
    }
    case "diagnostic-frontiers": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages, filtered.semanticRuntimeReferences, filtered.semanticRuntimeRawReferences);
      const families = frameworkErrorFamiliesForRows(filtered.codes, filtered.usages);
      const diagnosticFrontiers = frameworkErrorDiagnosticFrontiersForRows(
        families,
        filtered.codes,
        filtered.usages,
        filtered.semanticRuntimeReferences,
        filtered.semanticRuntimeRawReferences,
      );
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:diagnostic-frontiers",
        "Aurelia framework diagnostic frontier row(s)",
        diagnosticFrontiers,
        basis,
        (rows) => ({ version: analysis.version, rollup, diagnosticFrontiers: rows }),
        frameworkErrorEvidenceForSourceBackedRow,
        frameworkErrorDiagnosticFrontierContinuations,
      );
    }
    case "diagnostic-codes": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const diagnosticCodes = filterFrameworkErrorDiagnosticCodeRows(
        frameworkErrorDiagnosticCodeRowsForRows(
          filtered.codes,
          filtered.usages,
          filtered.semanticRuntimeReferences,
          filtered.semanticRuntimeRawReferences,
        ),
        inquiry,
      );
      const diagnosticFiltered = filterFrameworkErrorRowsForDiagnosticCodes(
        filtered,
        diagnosticCodes,
      );
      const rollup = frameworkErrorRollupForRows(
        diagnosticFiltered.packages,
        diagnosticFiltered.codes,
        diagnosticFiltered.usages,
        diagnosticFiltered.semanticRuntimeReferences,
        diagnosticFiltered.semanticRuntimeRawReferences,
      );
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:diagnostic-codes",
        "Aurelia framework diagnostic code intake row(s)",
        diagnosticCodes,
        basis,
        (rows) => ({ version: analysis.version, rollup, diagnosticCodes: rows }),
        frameworkErrorEvidenceForSourceBackedRow,
        frameworkErrorDiagnosticCodeContinuations,
      );
    }
    case "codes": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages, filtered.semanticRuntimeReferences, filtered.semanticRuntimeRawReferences);
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:codes",
        "Aurelia framework error/event code row(s)",
        filtered.codes,
        basis,
        (rows) => ({ version: analysis.version, rollup, codes: rows }),
        frameworkErrorEvidenceForSourceBackedRow,
        frameworkErrorSourceContinuations,
      );
    }
    case "usages": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages, filtered.semanticRuntimeReferences, filtered.semanticRuntimeRawReferences);
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:usages",
        "Aurelia framework error usage row(s)",
        filtered.usages,
        basis,
        (rows) => ({ version: analysis.version, rollup, usages: rows }),
        frameworkErrorEvidenceForSourceBackedRow,
        frameworkErrorSourceContinuations,
      );
    }
    case "semantic-references": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages, filtered.semanticRuntimeReferences, filtered.semanticRuntimeRawReferences);
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:semantic-references",
        "semantic-runtime framework error-code reference row(s)",
        filtered.semanticRuntimeReferences,
        basis,
        (rows) => ({ version: analysis.version, rollup, semanticRuntimeReferences: rows }),
        frameworkErrorEvidenceForSourceBackedRow,
        frameworkErrorSourceContinuations,
      );
    }
    case "semantic-raw-references": {
      const filtered = filterFrameworkErrorRows(analysis, inquiry);
      const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages, filtered.semanticRuntimeReferences, filtered.semanticRuntimeRawReferences);
      return answerFrameworkErrorRows(
        inquiry,
        "framework.errors:semantic-raw-references",
        "semantic-runtime framework raw Error reference row(s)",
        filtered.semanticRuntimeRawReferences,
        basis,
        (rows) => ({ version: analysis.version, rollup, semanticRuntimeRawReferences: rows }),
        frameworkErrorEvidenceForSourceBackedRow,
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
  const rollup = frameworkErrorRollupForRows(filtered.packages, filtered.codes, filtered.usages, filtered.semanticRuntimeReferences, filtered.semanticRuntimeRawReferences);
  const codes = filtered.codes.slice(0, rowLimit(inquiry));
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${rollup.codeCount} Aurelia framework error/event code(s), ${rollup.messageCount} mapped message(s), ${rollup.usageCount} usage site(s), and ${rollup.semanticRuntimeCodeReferenceCount} semantic-runtime AUR reference(s).`,
    {
      value: {
        version: analysis.version,
        rollup,
        codes,
      },
      basis,
      evidence: codes.slice(0, evidenceLimit(inquiry)).map(frameworkErrorEvidenceForSourceBackedRow),
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
    case "families":
    case "diagnostic-frontiers":
    case "diagnostic-codes":
    case "codes":
    case "usages":
    case "semantic-references":
    case "semantic-raw-references":
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
  const codeNamePrefix = inquiryStringFilter(inquiry, "codeNamePrefix");
  const mechanism = inquiryStringFilter(inquiry, "mechanism");
  const effect = inquiryStringFilter(inquiry, "effect");
  const rawErrorKind = inquiryStringFilter(inquiry, "rawErrorKind");
  const inlineCodeLabel = inquiryStringFilter(inquiry, "inlineCodeLabel");
  const gap = frameworkErrorGapFilter(inquiry);
  const query = inquiryLowerStringFilter(inquiry, "query");
  const packageCandidates = analysis.packages.filter((row) =>
    packageId === undefined || row.id === packageId
  );
  const packageIds = new Set(packageCandidates.map((row) => row.id));
  const codes = analysis.codes.filter((row) =>
    packageIds.has(row.packageId) &&
    (enumName === undefined || row.enumName === enumName) &&
    (codeNamePrefix === undefined || row.namePrefix === codeNamePrefix) &&
    frameworkErrorCodeMatchesGap(row, gap) &&
    (query === undefined || frameworkErrorCodeMatches(row, query))
  );
  const codeKeys = new Set(codes.map((row) => `${row.packageId}:${row.enumName}:${row.name}`));
  const codeLabels = new Set(codes.map((row) => row.codeLabel));
  const codeIdentities = new Set(codes.map(frameworkErrorDefinitionIdentity));
  const hasCodeFilter = hasAnyInquiryStringFilter(inquiry, ["enumName", "codeNamePrefix"]);
  const hasDefinitionFilter = packageId !== undefined || hasCodeFilter;
  const semanticRuntimeRawReferences = analysis.semanticRuntimeRawReferences.filter((row) =>
    packageIds.has(row.frameworkPackageId) &&
    (mechanism === undefined || row.mechanism === mechanism) &&
    (effect === undefined || row.effect === effect) &&
    frameworkErrorSemanticRuntimeRawReferenceMatchesGap(row, gap) &&
    (query === undefined || frameworkErrorSemanticRuntimeRawReferenceMatches(row, query))
  );
  const usages = analysis.usages.filter((row) =>
    packageIds.has(row.packageId) &&
    (mechanism === undefined || row.mechanism === mechanism) &&
    (effect === undefined || row.effect === effect) &&
    (rawErrorKind === undefined || row.rawErrorKind === rawErrorKind) &&
    (inlineCodeLabel === undefined || row.inlineCodeLabel === inlineCodeLabel) &&
    (codeNamePrefix === undefined || row.codeNamePrefix === codeNamePrefix) &&
    frameworkErrorUsageMatchesGap(row, gap, analysis.semanticRuntimeRawReferences) &&
    (!hasCodeFilter || (row.enumName != null && row.codeName != null && codeKeys.has(`${row.packageId}:${row.enumName}:${row.codeName}`))) &&
    (query === undefined || frameworkErrorUsageMatches(row, query))
  );
  const semanticRuntimeReferences = analysis.semanticRuntimeReferences.filter((row) =>
    (inlineCodeLabel === undefined || row.codeLabel === inlineCodeLabel) &&
    frameworkErrorSemanticRuntimeReferenceMatchesGap(row, gap) &&
    (!hasDefinitionFilter || frameworkErrorSemanticRuntimeReferenceMatchesDefinitions(row, codeLabels, codeIdentities)) &&
    (query === undefined || codeLabels.has(row.codeLabel) || frameworkErrorSemanticRuntimeReferenceMatches(row, query))
  );
  const usedPackageIds = new Set([
    ...codes.map((row) => row.packageId),
    ...usages.map((row) => row.packageId),
    ...semanticRuntimeRawReferences.map((row) => row.frameworkPackageId),
  ]);
  return {
    packages: packageCandidates.filter((row) =>
      usedPackageIds.has(row.id) ||
      (query !== undefined && frameworkErrorPackageMatches(row, query)) ||
      (query === undefined && !hasExplicitFrameworkErrorFilter(inquiry))
    ),
    codes,
    usages,
    semanticRuntimeReferences,
    semanticRuntimeRawReferences,
  };
}

function filterFrameworkErrorDiagnosticCodeRows(
  rows: readonly FrameworkErrorDiagnosticCodeRow[],
  inquiry: Inquiry,
): readonly FrameworkErrorDiagnosticCodeRow[] {
  const disposition = frameworkErrorDiagnosticDispositionFilter(inquiry);
  if (disposition === undefined) {
    return rows;
  }
  return rows.filter((row) => row.diagnosticDisposition === disposition);
}

function filterFrameworkErrorRowsForDiagnosticCodes(
  rows: FilteredFrameworkErrorRows,
  diagnosticCodes: readonly FrameworkErrorDiagnosticCodeRow[],
): FilteredFrameworkErrorRows {
  if (diagnosticCodes.length === 0) {
    return {
      packages: [],
      codes: [],
      usages: [],
      semanticRuntimeReferences: [],
      semanticRuntimeRawReferences: [],
    };
  }
  const packageIds = new Set(diagnosticCodes.map((row) => row.packageId));
  const codeKeys = new Set(diagnosticCodes.map((row) =>
    frameworkErrorDiagnosticCodeKey(row)
  ));
  const codeLabels = new Set(diagnosticCodes.map((row) => row.codeLabel));
  const codeDefinitions = new Set(diagnosticCodes.map(frameworkErrorDefinitionIdentity));
  const codes = rows.codes.filter((row) =>
    codeKeys.has(frameworkErrorDiagnosticCodeKey(row))
  );
  const usages = rows.usages.filter((row) =>
    packageIds.has(row.packageId) &&
    (
      (
        row.enumName != null &&
        row.codeName != null &&
        codeKeys.has(`${row.packageId}:${row.enumName}:${row.codeName}`)
      ) ||
      (
        row.inlineCodeLabel != null &&
        codeLabels.has(row.inlineCodeLabel)
      )
    )
  );
  const semanticRuntimeReferences = rows.semanticRuntimeReferences.filter((row) =>
    frameworkErrorSemanticRuntimeReferenceMatchesDefinitions(row, codeLabels, codeDefinitions)
  );
  const semanticRuntimeRawReferences = rows.semanticRuntimeRawReferences.filter((row) =>
    packageIds.has(row.frameworkPackageId)
  );
  return {
    packages: rows.packages.filter((row) => packageIds.has(row.id)),
    codes,
    usages,
    semanticRuntimeReferences,
    semanticRuntimeRawReferences,
  };
}

function frameworkErrorDiagnosticCodeKey(
  row: Pick<FrameworkErrorCodeRow | FrameworkErrorDiagnosticCodeRow, "packageId" | "enumName" | "name">,
): string {
  return `${row.packageId}:${row.enumName}:${row.name}`;
}

function frameworkErrorPackageMatches(row: FrameworkErrorPackageRow, query: string): boolean {
  return row.id.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.summary.toLowerCase().includes(query);
}

function frameworkErrorSemanticRuntimeRawReferenceMatches(
  row: FrameworkErrorSemanticRuntimeRawReferenceRow,
  query: string,
): boolean {
  return row.packageId.toLowerCase().includes(query) ||
    row.referenceKind.toLowerCase().includes(query) ||
    row.frameworkPackageId.toLowerCase().includes(query) ||
    row.mechanism.toLowerCase().includes(query) ||
    row.effect.toLowerCase().includes(query) ||
    row.frameworkSourceFilePath.toLowerCase().includes(query) ||
    row.expressionText.toLowerCase().includes(query) ||
    row.filePath.toLowerCase().includes(query) ||
    row.summary.toLowerCase().includes(query);
}

function frameworkErrorCodeMatches(row: FrameworkErrorCodeRow, query: string): boolean {
  return row.packageId.toLowerCase().includes(query) ||
    row.packageName.toLowerCase().includes(query) ||
    row.enumName.toLowerCase().includes(query) ||
    row.name.toLowerCase().includes(query) ||
    row.namePrefix.toLowerCase().includes(query) ||
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
    (row.codeNamePrefix?.toLowerCase().includes(query) ?? false) ||
    (row.codeLabel?.toLowerCase().includes(query) ?? false) ||
    (row.inlineCodeLabel?.toLowerCase().includes(query) ?? false) ||
    row.expressionText.toLowerCase().includes(query) ||
    row.summary.toLowerCase().includes(query);
}

function frameworkErrorSemanticRuntimeReferenceMatches(
  row: FrameworkErrorSemanticRuntimeReferenceRow,
  query: string,
): boolean {
  return row.packageId.toLowerCase().includes(query) ||
    row.codeLabel.toLowerCase().includes(query) ||
    row.referenceKind.toLowerCase().includes(query) ||
    (row.frameworkPackageId?.toLowerCase().includes(query) ?? false) ||
    (row.frameworkEnumName?.toLowerCase().includes(query) ?? false) ||
    (row.frameworkCodeName?.toLowerCase().includes(query) ?? false) ||
    row.filePath.toLowerCase().includes(query) ||
    row.summary.toLowerCase().includes(query);
}

function frameworkErrorSemanticRuntimeReferenceMatchesDefinitions(
  row: FrameworkErrorSemanticRuntimeReferenceRow,
  codeLabels: ReadonlySet<string>,
  codeIdentities: ReadonlySet<string>,
): boolean {
  return row.frameworkPackageId == null || row.frameworkEnumName == null || row.frameworkCodeName == null
    ? codeLabels.has(row.codeLabel)
    : codeIdentities.has(frameworkErrorDefinitionIdentity({
      packageId: row.frameworkPackageId,
      enumName: row.frameworkEnumName,
      name: row.frameworkCodeName,
      codeLabel: row.codeLabel,
    }));
}

function hasExplicitFrameworkErrorFilter(inquiry: Inquiry): boolean {
  return hasAnyInquiryStringFilter(inquiry, ["enumName", "codeNamePrefix", "mechanism", "effect", "rawErrorKind", "inlineCodeLabel", "disposition", "gap", "query"]);
}

function frameworkErrorGapFilter(inquiry: Inquiry): FrameworkErrorGapFilter | undefined {
  const value = inquiryStringFilter(inquiry, "gap");
  switch (value) {
    case "code-without-message":
    case "unused-code":
    case "unresolved-usage-code":
    case "raw-new-error":
    case "raw-error-factory-call":
    case "raw-error-usage":
    case "raw-error-authority-gap":
    case "intentionally-unclaimed-raw-authority":
    case "unresolved-semantic-runtime-reference":
    case "unresolved-semantic-runtime-raw-reference":
      return value;
    default:
      return undefined;
  }
}

function frameworkErrorDiagnosticDispositionFilter(
  inquiry: Inquiry,
): FrameworkErrorDiagnosticCodeDisposition | undefined {
  const value = inquiryStringFilter(inquiry, "disposition");
  switch (value) {
    case "modeled-exact":
    case "declared-unspent":
    case "broken-exact-link":
    case "raw-authority-gap":
    case "intentionally-unclaimed-framework-authority":
    case "unmodeled-used-framework-authority":
    case "dormant-framework-authority":
      return value;
    default:
      return undefined;
  }
}

function frameworkErrorCodeMatchesGap(
  row: FrameworkErrorCodeRow,
  gap: FrameworkErrorGapFilter | undefined,
): boolean {
  switch (gap) {
    case undefined:
      return true;
    case "code-without-message":
      return row.message == null;
    case "unused-code":
      return row.usageCount === 0;
    case "raw-new-error":
    case "raw-error-factory-call":
    case "raw-error-usage":
    case "raw-error-authority-gap":
    case "intentionally-unclaimed-raw-authority":
    case "unresolved-usage-code":
    case "unresolved-semantic-runtime-reference":
    case "unresolved-semantic-runtime-raw-reference":
      return false;
  }
}

function frameworkErrorUsageMatchesGap(
  row: FrameworkErrorUsageRow,
  gap: FrameworkErrorGapFilter | undefined,
  semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[],
): boolean {
  switch (gap) {
    case undefined:
      return true;
    case "raw-new-error":
      return row.mechanism === "raw-new-error";
    case "raw-error-factory-call":
      return row.mechanism === "raw-error-factory-call";
    case "raw-error-usage":
      return row.rawErrorKind != null;
    case "raw-error-authority-gap":
      return frameworkErrorUsageIsOpenRawAuthorityGap(row, semanticRuntimeRawReferences);
    case "intentionally-unclaimed-raw-authority":
      return frameworkErrorUsageIsIntentionallyUnclaimedRawAuthority(row);
    case "unresolved-usage-code":
      return frameworkErrorUsageCodeIsUnresolved(row);
    case "code-without-message":
    case "unused-code":
    case "unresolved-semantic-runtime-reference":
    case "unresolved-semantic-runtime-raw-reference":
      return false;
  }
}

function frameworkErrorSemanticRuntimeReferenceMatchesGap(
  row: FrameworkErrorSemanticRuntimeReferenceRow,
  gap: FrameworkErrorGapFilter | undefined,
): boolean {
  switch (gap) {
    case undefined:
      return true;
    case "unresolved-semantic-runtime-reference":
      return row.frameworkPackageId == null
        ? row.resolvedDefinitionCount === 0
        : row.resolvedExactDefinitionCount === 0;
    case "code-without-message":
    case "unused-code":
    case "unresolved-usage-code":
    case "raw-new-error":
    case "raw-error-factory-call":
    case "raw-error-usage":
    case "raw-error-authority-gap":
    case "intentionally-unclaimed-raw-authority":
    case "unresolved-semantic-runtime-raw-reference":
      return false;
  }
}

function frameworkErrorSemanticRuntimeRawReferenceMatchesGap(
  row: FrameworkErrorSemanticRuntimeRawReferenceRow,
  gap: FrameworkErrorGapFilter | undefined,
): boolean {
  switch (gap) {
    case undefined:
      return true;
    case "unresolved-semantic-runtime-raw-reference":
      return row.resolvedUsageCount === 0;
    case "code-without-message":
    case "unused-code":
    case "unresolved-usage-code":
    case "raw-new-error":
    case "raw-error-factory-call":
    case "raw-error-usage":
    case "raw-error-authority-gap":
    case "intentionally-unclaimed-raw-authority":
    case "unresolved-semantic-runtime-reference":
      return false;
  }
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

function frameworkErrorEvidenceForSourceBackedRow(
  row: FrameworkErrorFamilyRow | FrameworkErrorSourceRow,
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

function frameworkErrorFamilyContinuations(row: FrameworkErrorFamilyRow): readonly Continuation[] {
  return [
    ...sourceInspectionContinuations(row.source, {
      basis: [BasisKind.TypeScriptProgram],
      rationale: "Inspect the representative framework source span behind this error-code family.",
      routeSummary: "Representative source span for this Aurelia framework error-code family.",
    }),
    {
      id: `${row.id}:codes`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the code definitions in this framework error-code family.",
      inquiry: {
        lens: LensId.FrameworkErrors,
        locus: { kind: LocusKind.Repo },
        projection: "codes",
        filters: {
          packageId: row.packageId,
          enumName: row.enumName,
          codeNamePrefix: row.namePrefix,
        },
      },
    },
    {
      id: `${row.id}:usages`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect mapped usage sites in this framework error-code family.",
      inquiry: {
        lens: LensId.FrameworkErrors,
        locus: { kind: LocusKind.Repo },
        projection: "usages",
        filters: {
          packageId: row.packageId,
          enumName: row.enumName,
          codeNamePrefix: row.namePrefix,
        },
      },
    },
  ];
}

function frameworkErrorDiagnosticFrontierContinuations(row: FrameworkErrorDiagnosticFrontierRow): readonly Continuation[] {
  const baseFilters = {
    packageId: row.packageId,
    enumName: row.enumName,
    codeNamePrefix: row.namePrefix,
  };
  return [
    ...sourceInspectionContinuations(row.source, {
      basis: [BasisKind.TypeScriptProgram],
      rationale: "Inspect the representative framework source span behind this diagnostic frontier.",
      routeSummary: "Representative source span for this Aurelia framework diagnostic frontier.",
    }),
    {
      id: `${row.id}:codes`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the source-backed framework codes that define this diagnostic frontier.",
      inquiry: {
        lens: LensId.FrameworkErrors,
        locus: { kind: LocusKind.Repo },
        projection: "codes",
        filters: baseFilters,
      },
    },
    {
      id: `${row.id}:usages`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the framework usage sites that show the runtime effect and message authority for this diagnostic frontier.",
      inquiry: {
        lens: LensId.FrameworkErrors,
        locus: { kind: LocusKind.Repo },
        projection: "usages",
        filters: baseFilters,
      },
    },
    {
      id: `${row.id}:semantic-references`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect semantic-runtime exact AUR links for this framework diagnostic frontier.",
      inquiry: {
        lens: LensId.FrameworkErrors,
        locus: { kind: LocusKind.Repo },
        projection: "semantic-references",
        filters: baseFilters,
      },
    },
  ];
}

function frameworkErrorDiagnosticCodeContinuations(row: FrameworkErrorDiagnosticCodeRow): readonly Continuation[] {
  const baseFilters = {
    packageId: row.packageId,
    enumName: row.enumName,
    codeNamePrefix: row.namePrefix,
    query: row.name,
  };
  return [
    ...sourceInspectionContinuations(row.source, {
      basis: [BasisKind.TypeScriptProgram],
      rationale: "Inspect the exact framework source definition behind this diagnostic code row.",
      routeSummary: "Exact framework source span for this Aurelia diagnostic code.",
    }),
    {
      id: `${row.id}:usages`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect framework usage sites for this diagnostic code before spending it in semantic-runtime.",
      inquiry: {
        lens: LensId.FrameworkErrors,
        locus: { kind: LocusKind.Repo },
        projection: "usages",
        filters: baseFilters,
      },
    },
    {
      id: `${row.id}:semantic-references`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect semantic-runtime links for this exact framework diagnostic code.",
      inquiry: {
        lens: LensId.FrameworkErrors,
        locus: { kind: LocusKind.Repo },
        projection: "semantic-references",
        filters: baseFilters,
      },
    },
  ];
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
      id: "framework.errors:families",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect framework error-code families before selecting diagnostic substrate work.",
      inquiry: {
        ...inquiry,
        projection: "families",
      },
    },
    {
      id: "framework.errors:diagnostic-frontiers",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect framework diagnostic frontiers joined to semantic-runtime AUR-link coverage.",
      inquiry: {
        ...inquiry,
        projection: "diagnostic-frontiers",
      },
    },
    {
      id: "framework.errors:diagnostic-codes",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect code-level framework diagnostic intake rows with modeled/dormant/raw/unmodeled disposition.",
      inquiry: {
        ...inquiry,
        projection: "diagnostic-codes",
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
      id: "framework.errors:semantic-references",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect semantic-runtime references to framework error-code labels.",
      inquiry: {
        ...inquiry,
        projection: "semantic-references",
      },
    },
    {
      id: "framework.errors:semantic-raw-references",
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect semantic-runtime references to raw framework Error usage sites.",
      inquiry: {
        ...inquiry,
        projection: "semantic-raw-references",
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
    frameworkErrorGapContinuation(inquiry, "code-without-message", "codes", "Inspect error/event codes that do not have mapped framework messages."),
    frameworkErrorGapContinuation(inquiry, "unused-code", "codes", "Inspect error/event codes that are currently not referenced by mapped usage rows."),
    frameworkErrorGapContinuation(inquiry, "unresolved-usage-code", "usages", "Inspect mapped usage rows whose enum member did not resolve to a code definition."),
    frameworkErrorGapContinuation(inquiry, "raw-new-error", "usages", "Inspect raw Error construction sites that bypass mapped framework error codes."),
    frameworkErrorGapContinuation(inquiry, "raw-error-factory-call", "usages", "Inspect symbol-resolved calls into raw Error factory helpers."),
    frameworkErrorGapContinuation(inquiry, "raw-error-usage", "usages", "Inspect raw Error construction and raw Error factory call sites together."),
    frameworkErrorGapContinuation(inquiry, "raw-error-authority-gap", "usages", "Inspect raw Error usages that are not merely createMappedError implementation details."),
    frameworkErrorGapContinuation(inquiry, "intentionally-unclaimed-raw-authority", "usages", "Inspect raw Error usages classified as internal framework guards or helper bodies rather than product diagnostics."),
    frameworkErrorGapContinuation(inquiry, "unresolved-semantic-runtime-reference", "semantic-references", "Inspect semantic-runtime AUR labels that do not resolve to framework error-code definitions."),
    frameworkErrorGapContinuation(inquiry, "unresolved-semantic-runtime-raw-reference", "semantic-raw-references", "Inspect semantic-runtime raw framework Error links that no longer resolve to exact framework usage rows."),
  ];
}

function frameworkErrorGapContinuation(
  inquiry: Inquiry,
  gap: FrameworkErrorGapFilter,
  projection: "codes" | "usages" | "semantic-references" | "semantic-raw-references",
  rationale: string,
): Continuation {
  return {
    id: `framework.errors:${gap}`,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      filters: {
        ...inquiry.filters,
        gap,
      },
    },
  };
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
