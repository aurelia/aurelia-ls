import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import type { Inquiry } from "../inquiry.js";
import { LocusKind, type Locus } from "../locus.js";
import { findTerrainById } from "../terrain.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset, rowLimit } from "../paging.js";
import {
  inquiryStringFilter,
  inquiryStringListFilter,
} from "./lens-filter-utils.js";
import {
  atlasMemoryNextPageContinuation,
  atlasMemoryProjectionContinuations,
  atlasMemorySummaryContinuations,
  frontierContinuations,
  frontierEvidence,
  memoryRowContinuations,
  memoryRowEvidence,
  nextActionContinuations,
  nextActionEvidence,
  storageIssueEvidence,
  storageOpenSeams,
  untrackedProductClassFrontierEvidence,
} from "./atlas-memory-routing.js";
import {
  filterFrontiers,
  filterMemoryRows,
  filterNextActions,
  filterUntrackedFrontiers,
  frontierRows,
  guidanceRows,
  type AtlasMemoryFrontierRow,
  type AtlasMemoryProjection,
} from "./atlas-memory-rows.js";
import {
  type AtlasMemoryAnalysis,
  type AtlasMemoryRecordRow,
  type AtlasMemoryRollup,
  type AtlasMemoryStorageIssue,
  type AtlasMemoryUntrackedProductClassFrontier,
} from "./atlas-memory-contracts.js";
import {
  readAtlasMemoryAnalysis,
  memoryRollup,
  staleAtlasMemoryRecordRows,
} from "./atlas-memory-store.js";
import {
  atlasMemoryConsultRecordNextAction,
  atlasMemoryNextActionRows,
  compareAtlasMemoryNextActionRowsByRank,
  type AtlasMemoryNextActionRow,
} from "./atlas-memory-next-actions.js";
import { repoRelativePath, resolveRepoPath, type SourceProject } from "../../source/index.js";
import { atlasMemoryBackingPaths, atlasMemoryRepoPathMatches } from "./atlas-memory-row-matching.js";

/** Value returned by the atlas.memory lens. */
export interface AtlasMemoryValue {
  /** Schema marker. */
  readonly version: AtlasMemoryAnalysis["version"];
  /** Absolute JSON storage path. */
  readonly storagePath: string;
  /** True when the durable JSON store exists. */
  readonly storageExists: boolean;
  /** Compact rollup. */
  readonly rollup?: AtlasMemoryRollup;
  /** Durable records joined to live status. */
  readonly records?: readonly AtlasMemoryRecordRow[];
  /** Live frontiers, including untracked product class pressure. */
  readonly frontiers?: readonly AtlasMemoryFrontierRow[];
  /** Computed next actions derived from live memory/frontier state. */
  readonly nextActions?: readonly AtlasMemoryNextActionRow[];
  /** Storage issues. */
  readonly issues?: readonly AtlasMemoryStorageIssue[];
  /** Untracked live product class pressure rows. */
  readonly untrackedProductClassFrontiers?: readonly AtlasMemoryUntrackedProductClassFrontier[];
}

/** Answer queryable memory inquiries by joining durable JSON records with live source pressure. */
export function answerAtlasMemory(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<AtlasMemoryValue> {
  const projection = atlasMemoryProjection(inquiry);
  const scope = memoryScopePath(inquiry.locus, sourceProject);
  if (scope === null) {
    return createAnswer(inquiry, OutcomeKind.NoClaim, "This locus has no repository path in the current Atlas memory basis.");
  }
  if (scope !== undefined && projection === "schema") {
    return createAnswer(inquiry, OutcomeKind.Unsupported, "Ask for the Atlas memory storage schema at the repository locus.");
  }
  const store = readAtlasMemoryAnalysis(sourceProject);
  const analysis = scope === undefined ? store : memoryAtPath(store, scope, inquiry.locus.kind === LocusKind.SourceFile);
  const basis = atlasMemoryBasis(sourceProject, analysis);
  switch (projection) {
    case "summary":
      return answerAtlasMemorySummary(inquiry, analysis, basis);
    case "records":
      return answerAtlasMemoryRecordRows(
        inquiry,
        "atlas.memory:records",
        "Atlas memory record(s)",
        filterMemoryRows(analysis.records, inquiry),
        analysis,
        basis,
      );
    case "guidance":
      return answerAtlasMemoryRecordRows(
        inquiry,
        "atlas.memory:guidance",
        "Atlas memory guidance record(s)",
        filterMemoryRows(guidanceRows(analysis.records), inquiry),
        analysis,
        basis,
      );
    case "stale":
      return answerAtlasMemoryRecordRows(
        inquiry,
        "atlas.memory:stale",
        "stale or resolved Atlas memory record(s)",
        filterMemoryRows(staleAtlasMemoryRecordRows(analysis.records), inquiry),
        analysis,
        basis,
      );
    case "frontiers":
      return answerAtlasMemoryFrontiers(inquiry, analysis, basis);
    case "next":
      return answerAtlasMemoryNextActions(inquiry, analysis, basis);
    case "schema":
      return answerAtlasMemorySchema(inquiry, analysis, basis);
  }
}

function memoryScopePath(locus: Locus, project: SourceProject): string | null | undefined {
  if (locus.kind === LocusKind.Repo) return undefined;
  if (locus.kind === LocusKind.RepoArea) return findTerrainById(locus.areaId)?.root ?? null;
  const path = locus.kind === LocusKind.SourceFile ? locus.filePath
    : locus.kind === LocusKind.Package ? locus.relativePath : undefined;
  return path === undefined ? null : repoRelativePath(project.repoRoot, resolveRepoPath(project.repoRoot, path));
}

function memoryAtPath(store: AtlasMemoryAnalysis, path: string, exactFile: boolean): AtlasMemoryAnalysis {
  const matches = (candidate: string) => exactFile ? candidate === path : atlasMemoryRepoPathMatches(candidate, path);
  const records = store.records.filter(row =>
    (exactFile && row.shardPath === path) || atlasMemoryBackingPaths(row).some(matches),
  );
  const untrackedProductClassFrontiers = store.untrackedProductClassFrontiers.filter(row => matches(row.filePath));
  return {
    ...store,
    records,
    untrackedProductClassFrontiers,
    rollup: memoryRollup(records, untrackedProductClassFrontiers, store.issues),
  };
}

function answerAtlasMemorySummary(
  inquiry: Inquiry,
  analysis: AtlasMemoryAnalysis,
  basis: readonly Basis[],
): Answer<AtlasMemoryValue> {
  const limit = rowLimit(inquiry);
  const summaryRecords = filterMemoryRows(analysis.records, inquiry)
    .slice(0, limit);
  const untracked = filterUntrackedFrontiers(
    analysis.untrackedProductClassFrontiers,
    inquiry,
  ).slice(0, limit);
  const issues = analysis.issues.slice(0, limit);
  const nextActions = atlasMemoryNextRowsForInquiry(analysis, inquiry).slice(0, limit);
  const evidence = [
    ...summaryRecords.map(memoryRowEvidence),
    ...nextActions.map(nextActionEvidence),
    ...untracked.map(untrackedProductClassFrontierEvidence),
    ...issues.map(storageIssueEvidence),
  ];
  return createAnswer(
    inquiry,
    analysis.storageExists ? OutcomeKind.Hit : OutcomeKind.Open,
    `Read ${analysis.rollup.recordCount} Atlas memory record(s), ${analysis.rollup.untrackedProductClassFrontierCount} untracked product class frontier(s), and ${analysis.rollup.storageIssueCount} storage issue(s); showing ${summaryRecords.length} record(s), ${nextActions.length} next action(s), ${untracked.length} untracked frontier(s), and ${issues.length} issue(s) after filters.`,
    {
      value: {
        ...atlasMemoryBaseValue(analysis),
        rollup: analysis.rollup,
        records: summaryRecords,
        nextActions,
        untrackedProductClassFrontiers: untracked,
        issues,
      },
      basis,
      evidence,
      openSeams: storageOpenSeams(analysis.issues),
      continuations: atlasMemorySummaryContinuations(
        inquiry,
        summaryRecords,
        nextActions,
        untracked,
      ),
    },
  );
}

function answerAtlasMemoryRecordRows(
  inquiry: Inquiry,
  familyId: string,
  rowLabel: string,
  rows: readonly AtlasMemoryRecordRow[],
  analysis: AtlasMemoryAnalysis,
  basis: readonly Basis[],
): Answer<AtlasMemoryValue> {
  const rowFamily = new PagedRowFamily<AtlasMemoryRecordRow>({
    id: familyId,
    rowLabel,
    evidenceForRow: (row) => memoryRowEvidence(row),
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...atlasMemoryNextPageContinuation(
        inquiry,
        nextOffset,
        limit,
        "atlas.memory:next-page",
        "Continue Atlas memory rows.",
        "Next Atlas memory row page.",
      ),
      ...rows.flatMap(memoryRowContinuations),
      ...atlasMemoryProjectionContinuations(inquiry),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => ({
      ...atlasMemoryBaseValue(analysis),
      records: page.rows,
      issues: analysis.issues,
    }),
    openSeams: () => storageOpenSeams(analysis.issues),
  });
}

function answerAtlasMemoryFrontiers(
  inquiry: Inquiry,
  analysis: AtlasMemoryAnalysis,
  basis: readonly Basis[],
): Answer<AtlasMemoryValue> {
  const rows = filterFrontiers(frontierRows(analysis), inquiry);
  const rowFamily = new PagedRowFamily<AtlasMemoryFrontierRow>({
    id: "atlas.memory:frontiers",
    rowLabel: "Atlas memory frontier row(s)",
    evidenceForRow: (row) => frontierEvidence(row),
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...atlasMemoryNextPageContinuation(
        inquiry,
        nextOffset,
        limit,
        "atlas.memory:frontiers:next-page",
        "Continue Atlas memory frontier rows.",
        "Next Atlas memory frontier page.",
      ),
      ...rows.flatMap(frontierContinuations),
      ...atlasMemoryProjectionContinuations(inquiry),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => ({
      ...atlasMemoryBaseValue(analysis),
      frontiers: page.rows,
      issues: analysis.issues,
    }),
    openSeams: () => storageOpenSeams(analysis.issues),
  });
}

function answerAtlasMemoryNextActions(
  inquiry: Inquiry,
  analysis: AtlasMemoryAnalysis,
  basis: readonly Basis[],
): Answer<AtlasMemoryValue> {
  const rows = atlasMemoryNextRowsForInquiry(analysis, inquiry);
  const rowFamily = new PagedRowFamily<AtlasMemoryNextActionRow>({
    id: "atlas.memory:next",
    rowLabel: "Atlas memory next action(s)",
    evidenceForRow: (row) => nextActionEvidence(row),
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...atlasMemoryNextPageContinuation(
        inquiry,
        nextOffset,
        limit,
        "atlas.memory:next:next-page",
        "Continue Atlas memory next action rows.",
        "Next Atlas memory action page.",
      ),
      ...rows.flatMap(nextActionContinuations),
      ...atlasMemoryProjectionContinuations(inquiry),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => ({
      ...atlasMemoryBaseValue(analysis),
      rollup: analysis.rollup,
      nextActions: page.rows,
      records: backingRecordsForNextActions(page.rows),
      untrackedProductClassFrontiers:
        backingUntrackedFrontiersForNextActions(page.rows),
      issues: analysis.issues,
    }),
    openSeams: () => storageOpenSeams(analysis.issues),
  });
}

function atlasMemoryNextRowsForInquiry(
  analysis: AtlasMemoryAnalysis,
  inquiry: Inquiry,
): readonly AtlasMemoryNextActionRow[] {
  // A targeted inquiry can name a class outside the global queue sample.
  const rows = atlasMemoryNextActionRows(
    analysis,
    hasConsultableMemoryFilter(inquiry) ? analysis.untrackedProductClassFrontiers.length : undefined,
  );
  // Integrity issues qualify the whole store. Only the repository queue schedules storage repairs.
  const computedRows = inquiry.locus.kind === LocusKind.Repo ? rows : rows.filter(row => row.issue === undefined);
  return filterNextActions([
    ...computedRows,
    ...consultRecordNextRowsForInquiry(analysis, inquiry, computedRows),
  ], inquiry);
}

function consultRecordNextRowsForInquiry(
  analysis: AtlasMemoryAnalysis,
  inquiry: Inquiry,
  computedRows: readonly AtlasMemoryNextActionRow[],
): readonly AtlasMemoryNextActionRow[] {
  if (!hasConsultableMemoryFilter(inquiry)) {
    return [];
  }
  const computedRecordIds = new Set(computedRows.flatMap((row) =>
    row.record === undefined ? [] : [row.record.id]
  ));
  return filterMemoryRows(analysis.records, inquiry)
    .filter((row) => row.nextActionPolicy !== "hidden")
    .filter((row) => !computedRecordIds.has(row.id))
    .map(atlasMemoryConsultRecordNextAction)
    .sort(compareAtlasMemoryNextActionRowsByRank);
}

function hasConsultableMemoryFilter(inquiry: Inquiry): boolean {
  return inquiry.locus.kind !== LocusKind.Repo ||
    inquiryStringListFilter(inquiry, "domain").length > 0 ||
    [
      "query",
      "recordId",
      "surfaceRole",
      "kind",
      "status",
      "path",
      "liveCheckKind",
      "anchorKind",
      "anchorLensId",
      "auLinkId",
      "symbolName",
      "nextActionPolicy",
    ].some((key) => inquiryStringFilter(inquiry, key) !== undefined);
}

function backingRecordsForNextActions(
  rows: readonly AtlasMemoryNextActionRow[],
): readonly AtlasMemoryRecordRow[] {
  const records = new Map<string, AtlasMemoryRecordRow>();
  for (const row of rows) {
    if (row.record !== undefined) {
      records.set(row.record.id, row.record);
    }
  }
  return [...records.values()];
}

function backingUntrackedFrontiersForNextActions(
  rows: readonly AtlasMemoryNextActionRow[],
): readonly AtlasMemoryUntrackedProductClassFrontier[] {
  const frontiers = new Map<string, AtlasMemoryUntrackedProductClassFrontier>();
  for (const row of rows) {
    if (row.frontier !== undefined) {
      frontiers.set(row.frontier.id, row.frontier);
    }
    if (row.sampleFrontier !== undefined) {
      frontiers.set(row.sampleFrontier.id, row.sampleFrontier);
    }
  }
  return [...frontiers.values()];
}

function answerAtlasMemorySchema(
  inquiry: Inquiry,
  analysis: AtlasMemoryAnalysis,
  basis: readonly Basis[],
): Answer<AtlasMemoryValue> {
  const schemaRecord: AtlasMemoryRecordRow = {
    id: "atlas.memory:schema",
    kind: "doc-shard",
    domains: ["atlas", "memory"],
    status: "reference",
    liveChecks: [],
    shardPath: "packages/atlas/memory/README.md",
    shardIndex: 0,
    record: {
      id: "atlas.memory:schema",
      kind: "doc-shard",
      domains: ["atlas", "memory"],
      summary:
        "Atlas memory stores a root manifest plus focused JSON record shards; records have id, kind, domains, summary, optional rationale, guidance, anchors, and liveChecks.",
      guidance: [
        "Store each record in the shard for its primary domain. Use memory:write --mode=list-shards to discover targets and --template to draft one.",
        "Use pressure-frontier or intentional-shape for measured source pressure. A presence check alone establishes that an anchor exists.",
        "Use reuse-guide, decision, and doc-shard to retain guidance, intent, and documentation pointers.",
        "Read the storage schema and retrieval examples in packages/atlas/memory/README.md. The TypeScript contracts and writer below own validation.",
      ],
      anchors: [
        {
          kind: "source",
          filePath: "packages/atlas/src/inquiry/runtime/atlas-memory-contracts.ts",
          symbolName: "AtlasMemoryRecord",
          summary: "Runtime memory schema contracts.",
        },
        {
          kind: "source",
          filePath: "packages/atlas/src/scripts/atlas-memory-write.ts",
          symbolName: "upsertRecord",
          summary: "Structured memory storage update helper.",
        },
        {
          kind: "source",
          filePath: "packages/atlas/src/inquiry/runtime/product-architecture-analysis.ts",
          symbolName: "ProductArchitectureClassSurfaceRole",
          summary: "Class-role classifier used by untracked product-class pressure.",
        },
      ],
    },
    summary: "Atlas memory schema guidance.",
  };
  return answerAtlasMemoryRecordRows(
    inquiry,
    "atlas.memory:schema",
    "Atlas memory schema row(s)",
    [schemaRecord],
    analysis,
    basis,
  );
}

function atlasMemoryProjection(inquiry: Inquiry): AtlasMemoryProjection {
  switch (inquiry.projection) {
    case undefined:
    case "summary":
      return "summary";
    case "records":
    case "frontiers":
    case "next":
    case "guidance":
    case "stale":
    case "schema":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function atlasMemoryBaseValue(
  analysis: AtlasMemoryAnalysis,
): AtlasMemoryValue {
  return {
    version: analysis.version,
    storagePath: analysis.storagePath,
    storageExists: analysis.storageExists,
  };
}

function atlasMemoryBasis(
  sourceProject: SourceProject,
  analysis: AtlasMemoryAnalysis,
): readonly Basis[] {
  return [
    {
      kind: BasisKind.HumanJudgement,
      closure: analysis.issues.length === 0
        ? BasisClosure.Exact
        : BasisClosure.Partial,
      authority: BasisAuthority.Human,
      freshness: BasisFreshness.Live,
      summary:
        "Read durable maintainer and agent intent from the Atlas memory JSON store.",
      identity: analysis.storagePath,
      version: analysis.version,
    },
    {
      kind: BasisKind.TypeScriptProgram,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Checker,
      freshness: BasisFreshness.Live,
      summary:
        "Joined memory live checks to product.architecture rows derived from the hot TypeScript Program.",
      identity: sourceProject.summary().identity,
    },
  ];
}
