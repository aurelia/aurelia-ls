import type { Answer } from "../answer.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import type {
  AtlasSelfAnalysis,
  AtlasSelfAnalysisPhaseProfileRow,
} from "./self-analysis.js";
import {
  inquiryLowerStringFilter,
  inquiryNumberFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import {
  answerSelfRowProjection,
  selfSourceBasis,
} from "./self-row-projection.js";
import type { SelfValue } from "./self-value.js";

/** Answer queryable Atlas self-analysis phase timing rows. */
export function answerSelfPhaseProfileProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterPhaseProfileRows(analysis.profile, inquiry)
    .slice()
    .sort(comparePhaseProfileRows);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:phase-profile",
    rows,
    valueWithRows: (pageRows) => ({ ...value, phaseProfileRows: pageRows }),
    rowNoun: "Atlas self-analysis phase profile row(s)",
    basisSummary:
      "Read measured self-analysis phase costs from the hot Atlas source-analysis substrate.",
    evidenceForRow: evidenceForPhaseProfileRow,
    nextPageId: "atlas.self:phase-profile:next-page",
    nextPageRationale: "Continue Atlas self-analysis phase profile rows.",
    inspectionForRow: () => undefined,
  });
}

function filterPhaseProfileRows(
  rows: readonly AtlasSelfAnalysisPhaseProfileRow[],
  inquiry: Inquiry,
): readonly AtlasSelfAnalysisPhaseProfileRow[] {
  const phase = inquiryStringFilter(inquiry, "phase");
  const query = inquiryLowerStringFilter(inquiry, "query");
  const minMilliseconds = inquiryNumberFilter(inquiry, "minMilliseconds");
  const minExclusiveMilliseconds = inquiryNumberFilter(
    inquiry,
    "minExclusiveMilliseconds",
  );
  return rows.filter((row) => {
    if (phase !== undefined && row.phase !== phase) {
      return false;
    }
    if (
      minMilliseconds !== undefined &&
      row.milliseconds < minMilliseconds
    ) {
      return false;
    }
    if (
      minExclusiveMilliseconds !== undefined &&
      (row.exclusiveMilliseconds ?? row.milliseconds) <
        minExclusiveMilliseconds
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.phase.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query)
    );
  });
}

function comparePhaseProfileRows(
  left: AtlasSelfAnalysisPhaseProfileRow,
  right: AtlasSelfAnalysisPhaseProfileRow,
): number {
  return (
    (right.exclusiveMilliseconds ?? right.milliseconds) -
      (left.exclusiveMilliseconds ?? left.milliseconds) ||
    right.milliseconds - left.milliseconds ||
    left.phase.localeCompare(right.phase)
  );
}

function evidenceForPhaseProfileRow(
  row: AtlasSelfAnalysisPhaseProfileRow,
): Evidence {
  const exclusive = row.exclusiveMilliseconds ?? row.milliseconds;
  const itemCount =
    row.itemCount === undefined ? "" : ` across ${row.itemCount} item(s)`;
  return {
    id: `atlas.self:phase-profile:${row.phase}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary:
      `${row.phase} spent ${exclusive.toFixed(1)}ms exclusive / ${
        row.milliseconds.toFixed(1)
      }ms total${itemCount}. ${row.summary}`,
    basis: selfSourceBasis(
      "Phase profile rows are measured during the cold Atlas self-analysis build.",
    ),
    data: row,
  };
}
