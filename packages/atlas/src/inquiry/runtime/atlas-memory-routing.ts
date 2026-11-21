import { BasisKind } from "../basis.js";
import {
  ContinuationKind,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  OpenSeamKind,
  type Evidence,
  type OpenSeam,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, RepoRootLocus, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
} from "../navigation.js";
import {
  optionalNextPageContinuation,
  sourceInspectionContinuations,
} from "./lens-continuation-utils.js";
import {
  maintenanceDiagnosticEvidence,
} from "./evidence-helpers.js";
import type {
  AtlasMemoryAnchor,
  AtlasMemoryAnalysis,
  AtlasMemoryComputedStatus,
  AtlasMemoryRecordRow,
  AtlasMemoryStorageIssue,
} from "./atlas-memory-contracts.js";
import type {
  AtlasMemoryProjection,
} from "./atlas-memory-rows.js";
import type { ProductArchitectureSourceReference } from "./product-architecture-source.js";
import { sourceRangeFromOneBasedReference } from "../../source/index.js";

export function memoryRowEvidence(row: AtlasMemoryRecordRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: memoryEvidenceRole(row.status),
    confidence: row.storageSource !== undefined
      ? EvidenceConfidence.Exact
      : EvidenceConfidence.Strong,
    summary: `Recorded ${row.kind} ${row.id}: ${row.summary}`,
    source: storageSourceForMemoryRow(row) ?? sourceForMemoryRow(row),
    data: row,
  };
}

export function storageIssueEvidence(issue: AtlasMemoryStorageIssue): Evidence {
  return maintenanceDiagnosticEvidence({
    id: issue.id,
    summary: issue.summary,
    data: issue,
  });
}

export function sourceForMemoryRow(row: AtlasMemoryRecordRow): SourceRange | undefined {
  const liveSource = row.liveChecks
    .map((check) => check.source)
    .find((source): source is ProductArchitectureSourceReference =>
      source !== undefined,
    );
  return liveSource === undefined ? undefined : sourceRangeFromOneBasedReference(liveSource);
}

export function storageSourceForMemoryRow(
  row: AtlasMemoryRecordRow,
): SourceRange | undefined {
  return row.storageSource;
}

export function memoryRowContinuations(row: AtlasMemoryRecordRow): readonly Continuation[] {
  return [
    ...sourceInspectionContinuations(storageSourceForMemoryRow(row), {
      id: `atlas.memory:${row.id}:storage`,
      rationale: `Inspect durable memory record ${row.id}.`,
      routeSummary: "Atlas memory record storage.",
      basis: [BasisKind.SourceText],
    }),
    ...sourceInspectionContinuations(sourceForMemoryRow(row), {
      id: `atlas.memory:${row.id}:source`,
      rationale: `Inspect source behind ${row.id}.`,
      routeSummary: "Atlas memory row source.",
      basis: [BasisKind.SourceText, BasisKind.TypeScriptProgram],
    }),
    ...anchorContinuations(row),
  ];
}

export function atlasMemorySummaryContinuations(
  inquiry: Inquiry,
  summaryRecords: readonly AtlasMemoryRecordRow[],
): readonly Continuation[] {
  return [
    ...atlasMemoryProjectionContinuations(inquiry),
    ...summaryRecords.flatMap(memoryRowContinuations).slice(0, 8),
  ];
}

export function atlasMemoryProjectionContinuations(
  inquiry: Inquiry,
): readonly Continuation[] {
  return [
    atlasMemoryProjectionContinuation(
      inquiry,
      "atlas.memory:records",
      "records",
      "Inspect all durable memory records joined to live status.",
    ),
    atlasMemoryProjectionContinuation(
      inquiry,
      "atlas.memory:guidance",
      "guidance",
      "Inspect reuse guidance before solving a similar problem.",
    ),
    atlasMemoryProjectionContinuation(
      inquiry,
      "atlas.memory:stale",
      "stale",
      "Inspect resolved or stale memory records before trusting old notes.",
    ),
    atlasMemoryProjectionContinuation(
      inquiry,
      "atlas.memory:schema",
      "schema",
      "Inspect storage shape, information ownership, and record-update guidance.",
    ),
  ];
}

export function atlasMemoryOpenSeams(
  analysis: AtlasMemoryAnalysis,
  records: readonly AtlasMemoryRecordRow[],
): readonly OpenSeam[] {
  const storage = analysis.issues.map((issue) => ({
    id: issue.id,
    kind: OpenSeamKind.StaleSubstrate,
    summary: issue.summary,
    evidence: storageIssueEvidence(issue),
  }));
  const ids = new Set(records.map(row => row.id));
  return [...storage, ...analysis.scopeGaps.filter(gap => ids.has(gap.recordId))];
}

export function atlasMemoryNextPageContinuation(
  inquiry: Inquiry,
  nextOffset: number | undefined,
  limit: number,
  id: string,
  rationale: string,
  routeSummary: string,
): readonly Continuation[] {
  return optionalNextPageContinuation(inquiry, nextOffset, limit, {
    id,
    rationale,
    routeSummary,
    basis: [BasisKind.HumanJudgement, BasisKind.TypeScriptProgram],
  });
}

function memoryEvidenceRole(status: AtlasMemoryComputedStatus): EvidenceRole {
  switch (status) {
    case "out-of-scope":
      return EvidenceRole.Boundary;
    case "resolved":
    case "stale-check":
    case "stale-source":
      return EvidenceRole.Diagnostic;
    case "reference":
      return EvidenceRole.Support;
    case "active":
    case "intentional-live":
      return EvidenceRole.Subject;
  }
}

function anchorContinuations(row: AtlasMemoryRecordRow): readonly Continuation[] {
  return (row.record.anchors ?? []).flatMap((anchor, index) =>
    continuationForAnchor(row.id, anchor, index),
  );
}

function continuationForAnchor(
  recordId: string,
  anchor: AtlasMemoryAnchor,
  index: number,
): readonly Continuation[] {
  switch (anchor.kind) {
    case "source":
      return [
        {
          id: `atlas.memory:${recordId}:anchor:${index}`,
          kind: ContinuationKind.InspectEvidence,
          rationale: anchor.summary ?? `Inspect ${anchor.filePath}.`,
          inquiry: {
            lens: LensId.TsSource,
            locus: anchor.symbolName !== undefined && !anchor.symbolName.includes(".")
              ? { kind: LocusKind.Symbol, name: anchor.symbolName, filePath: anchor.filePath }
              : { kind: LocusKind.SourceFile, filePath: anchor.filePath },
            projection: "text",
          },
          route: {
            plane: NavigationPlane.Inspection,
            relation: NavigationRelation.SourceFor,
            basis: [BasisKind.SourceText],
            summary: "Atlas memory source anchor.",
          },
        },
      ];
    case "lens":
      return [
        {
          id: `atlas.memory:${recordId}:anchor:${index}`,
          kind: ContinuationKind.SwitchLens,
          rationale: anchor.summary ?? `Ask ${anchor.lensId}.`,
          inquiry: {
            lens: anchor.lensId as LensId,
            locus: RepoRootLocus,
            projection: anchor.projection,
            filters: anchor.filters,
          },
          route: {
            plane: NavigationPlane.Maintenance,
            relation: NavigationRelation.RefinementOf,
            basis: [BasisKind.AtlasContract],
            summary: "Atlas memory lens anchor.",
          },
        },
      ];
    case "script":
    case "doc":
    case "fixture":
    case "external":
      return [];
    case "auLink":
      return [
        {
          id: `atlas.memory:${recordId}:anchor:${index}`,
          kind: ContinuationKind.SwitchLens,
          rationale: anchor.summary ?? `Inspect auLink ${anchor.linkId}.`,
          inquiry: {
            lens: LensId.BridgeAuLink,
            locus: RepoRootLocus,
            projection: "mirror",
            filters: { linkId: anchor.linkId },
          },
          route: {
            plane: NavigationPlane.Maintenance,
            relation: NavigationRelation.RefinementOf,
            basis: [BasisKind.AtlasContract, BasisKind.TypeScriptProgram],
            summary: "Atlas memory auLink anchor.",
          },
        },
      ];
  }
}

function atlasMemoryProjectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: AtlasMemoryProjection,
  rationale: string,
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      page: undefined,
    },
    route: {
      plane: NavigationPlane.Addressing,
      relation: NavigationRelation.ProjectionOf,
      basis: [BasisKind.HumanJudgement, BasisKind.TypeScriptProgram],
      summary: `Atlas memory ${projection} projection.`,
    },
  };
}
