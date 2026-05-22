import { BasisKind } from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
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
  maintenanceDiagnosticEvidenceForOneBasedSource,
} from "./evidence-helpers.js";
import type {
  AtlasMemoryAnchor,
  AtlasMemoryComputedStatus,
  AtlasMemoryRecordRow,
  AtlasMemoryStorageIssue,
  AtlasMemoryUntrackedProductClassFrontier,
} from "./atlas-memory-contracts.js";
import type { AtlasMemoryNextActionRow } from "./atlas-memory-next-actions.js";
import type {
  AtlasMemoryFrontierRow,
  AtlasMemoryProjection,
} from "./atlas-memory-rows.js";
import type { ProductArchitectureSourceReference } from "./product-architecture-source.js";
import { sourceRangeFromOneBasedReference } from "../../source/index.js";

export function memoryRowEvidence(row: AtlasMemoryRecordRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: memoryEvidenceRole(row.status),
    confidence: row.liveChecks.length > 0
      ? EvidenceConfidence.Exact
      : EvidenceConfidence.Strong,
    summary: row.summary,
    source: storageSourceForMemoryRow(row) ?? sourceForMemoryRow(row),
    data: row,
  };
}

export function frontierEvidence(row: AtlasMemoryFrontierRow): Evidence {
  return row.kind === "memory-record"
    ? memoryRowEvidence(row.record)
    : untrackedProductClassFrontierEvidence(row.frontier);
}

export function untrackedProductClassFrontierEvidence(
  row: AtlasMemoryUntrackedProductClassFrontier,
): Evidence {
  return maintenanceDiagnosticEvidenceForOneBasedSource(row);
}

export function nextActionEvidence(row: AtlasMemoryNextActionRow): Evidence {
  if (row.record !== undefined) {
    return memoryRowEvidence(row.record);
  }
  if (row.frontier !== undefined) {
    return untrackedProductClassFrontierEvidence(row.frontier);
  }
  if (row.sampleFrontier !== undefined) {
    return untrackedProductClassFrontierEvidence(row.sampleFrontier);
  }
  if (row.issue !== undefined) {
    return storageIssueEvidence(row.issue);
  }
  return maintenanceDiagnosticEvidence({
    id: row.id,
    summary: row.summary,
    data: row,
  });
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
  if (liveSource !== undefined) {
    return sourceRangeFromOneBasedReference(liveSource);
  }
  const sourceAnchor = (row.record.anchors ?? [])
    .find((anchor): anchor is Extract<AtlasMemoryAnchor, { readonly kind: "source" }> =>
      anchor.kind === "source" && anchor.line !== undefined,
    );
  if (sourceAnchor === undefined || sourceAnchor.line === undefined) {
    return undefined;
  }
  const line = Math.max(0, sourceAnchor.line - 1);
  return {
    filePath: sourceAnchor.filePath,
    start: { line, character: 0 },
    end: { line, character: 1 },
  };
}

export function storageSourceForMemoryRow(
  row: AtlasMemoryRecordRow,
): SourceRange | undefined {
  if (row.shardLine === undefined) {
    return undefined;
  }
  const line = Math.max(0, row.shardLine - 1);
  return {
    filePath: row.shardPath,
    start: { line, character: 0 },
    end: { line, character: 1 },
  };
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

export function frontierContinuations(row: AtlasMemoryFrontierRow): readonly Continuation[] {
  if (row.kind === "memory-record") {
    return memoryRowContinuations(row.record);
  }
  return sourceInspectionContinuations(
    sourceRangeFromOneBasedReference(row.frontier.source),
    {
      id: `${row.id}:source`,
      rationale: `Inspect untracked frontier ${row.frontier.className}.`,
      routeSummary: "Untracked product class frontier source.",
      basis: [BasisKind.SourceText, BasisKind.TypeScriptProgram],
    },
  );
}

export function nextActionContinuations(row: AtlasMemoryNextActionRow): readonly Continuation[] {
  if (row.record !== undefined) {
    return memoryRowContinuations(row.record);
  }
  const frontier = row.frontier ?? row.sampleFrontier;
  if (frontier === undefined) {
    return [];
  }
  return sourceInspectionContinuations(
    sourceRangeFromOneBasedReference(frontier.source),
    {
      id: `${row.id}:source`,
      rationale: `Inspect source behind ${row.id}.`,
      routeSummary: "Atlas memory next-action source.",
      basis: [BasisKind.SourceText, BasisKind.TypeScriptProgram],
    },
  );
}

export function atlasMemorySummaryContinuations(
  inquiry: Inquiry,
  summaryRecords: readonly AtlasMemoryRecordRow[],
  nextActions: readonly AtlasMemoryNextActionRow[],
  untracked: readonly { readonly source: ProductArchitectureSourceReference; readonly id: string; readonly className: string }[],
): readonly Continuation[] {
  return [
    ...atlasMemoryProjectionContinuations(inquiry),
    ...summaryRecords.flatMap(memoryRowContinuations).slice(0, 8),
    ...nextActions.flatMap(nextActionContinuations).slice(0, 8),
    ...untracked.flatMap((row) =>
      sourceInspectionContinuations(sourceRangeFromOneBasedReference(row.source), {
        id: `${row.id}:source`,
        rationale: `Inspect untracked product class frontier ${row.className}.`,
        routeSummary: "Untracked product class source.",
      }),
    ).slice(0, 4),
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
      "atlas.memory:frontiers",
      "frontiers",
      "Inspect live active, intentional, stale, and untracked frontiers.",
    ),
    atlasMemoryProjectionContinuation(
      inquiry,
      "atlas.memory:next",
      "next",
      "Rank the next source-backed maintenance moves from live memory and pressure.",
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

export function storageOpenSeams(
  issues: readonly AtlasMemoryStorageIssue[],
): readonly OpenSeam[] {
  return issues.map((issue) => ({
    id: issue.id,
    kind: OpenSeamKind.StaleSubstrate,
    summary: issue.summary,
    evidence: storageIssueEvidence(issue),
  }));
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
          priority: ContinuationPriority.Secondary,
          rationale: anchor.summary ?? `Inspect ${anchor.filePath}.`,
          inquiry: {
            lens: LensId.TsSource,
            locus: { kind: LocusKind.SourceFile, filePath: anchor.filePath },
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
          priority: ContinuationPriority.Secondary,
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
          priority: ContinuationPriority.Secondary,
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
    priority: ContinuationPriority.Primary,
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
