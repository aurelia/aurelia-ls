import { countEntriesBy } from "../../collections.js";
import type {
  AtlasMemoryAnalysis,
  AtlasMemoryComputedStatus,
  AtlasMemoryRecordRow,
  AtlasMemoryStorageIssue,
  AtlasMemoryUntrackedProductClassFrontier,
} from "./atlas-memory-contracts.js";
import {
  staleAtlasMemoryRecordRows,
} from "./atlas-memory-store.js";

const productLinePressureDivisor = 100;
const atlasSourceFileLinePressureDivisor = 200;
const atlasFunctionLinePressureDivisor = 80;
const methodPressureDivisor = 5;
const functionCallPressureDivisor = 10;

/** One computed next move exposed by atlas.memory. */
export interface AtlasMemoryNextActionRow {
  /** Computed action discriminator. */
  readonly kind:
    | "repair-storage"
    | "review-stale-memory"
    | "seed-untracked-area"
    | "inspect-untracked-frontier"
    | "continue-live-frontier"
    | "consult-live-frontier"
    | "consult-intentional-shape"
    | "consult-reuse-guide";
  /** Stable row id. */
  readonly id: string;
  /** Sorting weight. Higher rows are better first moves for a fresh session. */
  readonly rank: number;
  /** Live status behind the recommendation. */
  readonly status: AtlasMemoryComputedStatus | "untracked" | "storage-issue";
  /** Domains copied from the backing record or inferred frontier area. */
  readonly domains: readonly string[];
  /** Compact row summary. */
  readonly summary: string;
  /** Why this row is ranked as a next move. */
  readonly rationale: string;
  /** Backing durable memory row, when the action is record-shaped. */
  readonly record?: AtlasMemoryRecordRow;
  /** Backing untracked class frontier, when the action is class-shaped. */
  readonly frontier?: AtlasMemoryUntrackedProductClassFrontier;
  /** Representative frontier for area-level actions. */
  readonly sampleFrontier?: AtlasMemoryUntrackedProductClassFrontier;
  /** Backing storage issue, when the action is store-repair-shaped. */
  readonly issue?: AtlasMemoryStorageIssue;
  /** Area name for aggregate untracked pressure. */
  readonly area?: string;
  /** Number of untracked class frontiers covered by an aggregate action. */
  readonly untrackedCount?: number;
}

/** Rank next moves from live memory state without storing them as tasks. */
export function atlasMemoryNextActionRows(
  analysis: AtlasMemoryAnalysis,
): readonly AtlasMemoryNextActionRow[] {
  return [
    ...analysis.issues.map(storageIssueNextAction),
    ...staleAtlasMemoryRecordRows(analysis.records).map(staleMemoryNextAction),
    ...untrackedAreaNextActions(analysis.untrackedProductClassFrontiers),
    ...analysis.untrackedProductClassFrontiers
      .slice()
      .sort(compareUntrackedFrontierPressure)
      .slice(0, 24)
      .map(untrackedFrontierNextAction),
    ...analysis.records
      .filter((row) =>
        row.kind === "pressure-frontier" &&
        row.status === "active" &&
        row.nextActionPolicy !== "hidden",
      )
      .map(liveFrontierNextAction),
    ...analysis.records
      .filter((row) => row.kind === "intentional-shape" && row.status === "intentional-live")
      .map(intentionalShapeNextAction),
    ...analysis.records
      .filter((row) => row.kind === "reuse-guide")
      .map(reuseGuideNextAction),
  ].sort(compareNextActions);
}

function storageIssueNextAction(
  issue: AtlasMemoryStorageIssue,
): AtlasMemoryNextActionRow {
  return {
    kind: "repair-storage",
    id: `atlas.memory:next:repair:${issue.id}`,
    rank: 10_000,
    status: "storage-issue",
    domains: ["atlas", "memory"],
    summary: `Repair Atlas memory store issue: ${issue.summary}`,
    rationale:
      "Memory storage integrity comes before using records as autonomous-session guidance.",
    issue,
  };
}

function staleMemoryNextAction(
  record: AtlasMemoryRecordRow,
): AtlasMemoryNextActionRow {
  const staleRank = record.status === "resolved" ? 8_000 : 9_000;
  return {
    kind: "review-stale-memory",
    id: `atlas.memory:next:stale:${record.id}`,
    rank: staleRank,
    status: record.status,
    domains: record.domains,
    summary: `Review ${record.id}: ${record.summary}`,
    rationale:
      "A stale or resolved record should be removed, revised, or deliberately kept as reference before future work trusts it.",
    record,
  };
}

function untrackedAreaNextActions(
  frontiers: readonly AtlasMemoryUntrackedProductClassFrontier[],
): readonly AtlasMemoryNextActionRow[] {
  const byArea = new Map<string, AtlasMemoryUntrackedProductClassFrontier[]>();
  for (const frontier of frontiers) {
    const areaFrontiers = byArea.get(frontier.area);
    if (areaFrontiers === undefined) {
      byArea.set(frontier.area, [frontier]);
    } else {
      areaFrontiers.push(frontier);
    }
  }
  return [...byArea.entries()].map(([area, rows]) => {
    const sampleFrontier = rows.slice().sort(compareUntrackedFrontierPressure)[0];
    return {
      kind: "seed-untracked-area" as const,
      id: `atlas.memory:next:area:${area}`,
      rank: 7_000 + Math.min(rows.length, 100),
      status: "untracked" as const,
      domains: domainsForUntrackedArea(area, rows),
      summary:
        `${area} has ${rows.length} untracked large product class frontier(s); roles ${roleCountSummary(rows)}.`,
      rationale:
        "Area-level untracked pressure is a live canary for missing durable memory or missing product-architecture split points.",
      sampleFrontier,
      area,
      untrackedCount: rows.length,
    };
  });
}

function untrackedFrontierNextAction(
  frontier: AtlasMemoryUntrackedProductClassFrontier,
): AtlasMemoryNextActionRow {
  return {
    kind: "inspect-untracked-frontier",
    id: `atlas.memory:next:frontier:${frontier.id}`,
    rank: 6_000 + frontier.lineCount + rolePressureBonus(frontier),
    status: "untracked",
    domains: frontier.domains,
    summary: `Inspect untracked frontier ${frontier.className}: ${frontier.summary}`,
    rationale:
      `Large source shapes without durable memory are likely places where future sessions could rediscover old pressure or miss an intentional split; class role is ${frontier.surfaceRole} because ${frontier.surfaceRoleReason}.`,
    frontier,
  };
}

function liveFrontierNextAction(
  record: AtlasMemoryRecordRow,
): AtlasMemoryNextActionRow {
  const policy = record.nextActionPolicy ?? "proactive";
  const proactive = policy !== "when-touched";
  return {
    kind: proactive ? "continue-live-frontier" : "consult-live-frontier",
    id: `atlas.memory:next:active:${record.id}`,
    rank: (proactive ? 5_000 : 3_500) +
      record.liveChecks.length +
      liveRecordPressureBonus(record),
    status: record.status,
    domains: record.domains,
    summary: `${proactive ? "Continue" : "Consult"} live frontier ${record.id}: ${record.summary}`,
    rationale:
      proactive
        ? "A durable pressure frontier is still live in source and is marked proactive, so it is a grounded candidate after storage and stale-memory cleanup."
        : "A durable pressure frontier is still live in source, but its next-action policy is when-touched: keep it available as domain guidance without letting it drive unfiltered autonomous work.",
    record,
  };
}

function intentionalShapeNextAction(
  record: AtlasMemoryRecordRow,
): AtlasMemoryNextActionRow {
  return {
    kind: "consult-intentional-shape",
    id: `atlas.memory:next:intent:${record.id}`,
    rank: 3_750 + record.liveChecks.length,
    status: record.status,
    domains: record.domains,
    summary: `Consult intentional shape ${record.id}: ${record.summary}`,
    rationale:
      "Intentional shapes capture durable design constraints that should steer new work even when they are not pressure frontiers.",
    record,
  };
}

function liveRecordPressureBonus(record: AtlasMemoryRecordRow): number {
  return Math.max(
    0,
    ...record.liveChecks.map((result) => {
      if (result.productClass !== undefined) {
        return Math.min(
          25,
          Math.floor(result.productClass.lineCount / productLinePressureDivisor),
        ) + Math.min(
          15,
          Math.floor(result.productClass.methodCount / methodPressureDivisor),
        );
      }
      if (result.atlasSelfSourceFile !== undefined) {
        return Math.min(
          25,
          Math.floor(
            result.atlasSelfSourceFile.lineCount /
              atlasSourceFileLinePressureDivisor,
          ),
        ) +
          Math.min(10, result.atlasSelfSourceFile.crossAreaOutgoingImportCount);
      }
      if (result.atlasSelfClass !== undefined) {
        return Math.min(
          25,
          Math.floor(result.atlasSelfClass.lineCount / productLinePressureDivisor),
        ) + Math.min(
          15,
          Math.floor(result.atlasSelfClass.methodCount / methodPressureDivisor),
        );
      }
      if (result.atlasSelfFunction !== undefined) {
        return Math.min(
          20,
          Math.floor(
            result.atlasSelfFunction.lineCount / atlasFunctionLinePressureDivisor,
          ),
        ) + Math.min(
          15,
          Math.floor(result.atlasSelfFunction.callCount / functionCallPressureDivisor),
        );
      }
      return 0;
    }),
  );
}

function reuseGuideNextAction(
  record: AtlasMemoryRecordRow,
): AtlasMemoryNextActionRow {
  return {
    kind: "consult-reuse-guide",
    id: `atlas.memory:next:reuse:${record.id}`,
    rank: 4_000,
    status: record.status,
    domains: record.domains,
    summary: `Consult reuse guide ${record.id}: ${record.summary}`,
    rationale:
      "Reuse guides answer 'what should I inspect or hook into first?' when a fresh task touches the same domain.",
    record,
  };
}

function domainsForUntrackedArea(
  area: string,
  frontiers: readonly AtlasMemoryUntrackedProductClassFrontier[],
): readonly string[] {
  return [...new Set([area, ...frontiers.flatMap((frontier) => frontier.domains)])];
}

function compareUntrackedFrontierPressure(
  left: AtlasMemoryUntrackedProductClassFrontier,
  right: AtlasMemoryUntrackedProductClassFrontier,
): number {
  return (
    rolePressureBonus(right) - rolePressureBonus(left) ||
    right.lineCount - left.lineCount ||
    right.methodCount - left.methodCount ||
    right.propertyCount - left.propertyCount ||
    left.className.localeCompare(right.className)
  );
}

function rolePressureBonus(frontier: AtlasMemoryUntrackedProductClassFrontier): number {
  switch (frontier.surfaceRole) {
    case "product-owner":
      return 500;
    case "service-surface":
      return 300;
    case "epoch-context":
      return 250;
    case "publisher":
      return 200;
    case "semantic-model":
      return 150;
    case "work-frame":
      return 50;
    case "data-carrier":
    case "other":
      return 0;
  }
}

function roleCountSummary(
  rows: readonly AtlasMemoryUntrackedProductClassFrontier[],
): string {
  return countEntriesBy(rows, (row) => row.surfaceRole)
    .map((row) => `${row.key}=${row.count}`)
    .join(", ");
}

function compareNextActions(
  left: AtlasMemoryNextActionRow,
  right: AtlasMemoryNextActionRow,
): number {
  return right.rank - left.rank || left.id.localeCompare(right.id);
}
