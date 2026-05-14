import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { SourceRange } from "../locus.js";
import { sourceRangeFromOneBasedReference } from "../../source/index.js";

type OneBasedSourceReference = Parameters<typeof sourceRangeFromOneBasedReference>[0];

/** Data needed to build a standard maintenance diagnostic evidence row. */
export interface MaintenanceDiagnosticEvidenceInput<TData> {
  /** Stable evidence id. */
  readonly id: string;
  /** Human-readable issue summary. */
  readonly summary: string;
  /** Optional source range for the issue. */
  readonly source?: SourceRange;
  /** Original row attached for machine readers. */
  readonly data: TData;
}

/** Build a standard exact diagnostic maintenance evidence row. */
export function maintenanceDiagnosticEvidence<TData>(
  input: MaintenanceDiagnosticEvidenceInput<TData>,
): Evidence {
  return {
    id: input.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Diagnostic,
    confidence: EvidenceConfidence.Exact,
    summary: input.summary,
    source: input.source,
    data: input.data,
  };
}

/** Row shape for maintenance diagnostics whose source uses one-based line/character coordinates. */
export interface OneBasedSourceMaintenanceDiagnosticRow {
  /** Stable evidence id. */
  readonly id: string;
  /** Human-readable issue summary. */
  readonly summary: string;
  /** One-based source reference. */
  readonly source: OneBasedSourceReference;
}

/** Build maintenance diagnostic evidence for a row carrying a one-based source reference. */
export function maintenanceDiagnosticEvidenceForOneBasedSource<
  TData extends OneBasedSourceMaintenanceDiagnosticRow,
>(row: TData): Evidence {
  return maintenanceDiagnosticEvidence({
    id: row.id,
    summary: row.summary,
    source: sourceRangeFromOneBasedReference(row.source),
    data: row,
  });
}
