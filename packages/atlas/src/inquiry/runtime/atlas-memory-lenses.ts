import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import type { Inquiry } from "../inquiry.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset, rowLimit } from "../paging.js";
import { inquiryStringFilter } from "./lens-filter-utils.js";
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
  staleAtlasMemoryRecordRows,
} from "./atlas-memory-store.js";
import {
  atlasMemoryConsultRecordNextAction,
  atlasMemoryNextActionRows,
  type AtlasMemoryNextActionRow,
} from "./atlas-memory-next-actions.js";
import type { SourceProject } from "../../source/index.js";

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
  const analysis = readAtlasMemoryAnalysis(sourceProject);
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
  const nextActions = filterNextActions(atlasMemoryNextActionRows(analysis), inquiry)
    .slice(0, limit);
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
  const rows = filterNextActions(atlasMemoryNextActionRows(analysis), inquiry);
  if (rows.length > 0) {
    return rows;
  }
  const recordId = inquiryStringFilter(inquiry, "recordId");
  if (recordId === undefined) {
    return rows;
  }
  return filterNextActions(
    analysis.records
      .filter((row) => row.id === recordId && row.nextActionPolicy !== "hidden")
      .map(atlasMemoryConsultRecordNextAction),
    inquiry,
  );
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
    shardLine: 1,
    record: {
      id: "atlas.memory:schema",
      kind: "doc-shard",
      domains: ["atlas", "memory"],
      summary:
        "Atlas memory stores a root manifest plus focused JSON record shards; records have id, kind, domains, summary, optional rationale, guidance, anchors, and liveChecks.",
      guidance: [
        "Keep the root manifest small; add durable records to focused shards under packages/atlas/memory/records.",
        "Use pressure-frontier for live work that should become resolved.",
        "Use nextActionPolicy=proactive for live work that should drive unfiltered autonomous next actions, when-touched for solved/currently quiet frontiers that should only steer matching tasks, and hidden only for records that must stay queryable without becoming work queue rows.",
        "Use intentional-shape for large or unusual structures that are deliberately kept.",
        "Use reuse-guide for 'what should I inspect before solving this kind of problem?' records.",
        "Use doc-shard for stable large-document headings that should be queryable without rereading the whole workbench.",
        "Prefer liveChecks when Atlas can verify status from source instead of trusting prose; source/file/auLink presence checks are anchors, not pressure by themselves.",
        "Use source-declaration-exists when a record depends on a specific admitted TypeScript declaration rather than a broad file; pair it with a pressure-shaped check when it should keep a pressure-frontier active.",
        "Use atlas-self-source-file, atlas-self-class, atlas-self-function, or atlas-self-variable when a record depends on Atlas-owned source pressure rather than semantic-runtime product pressure.",
        "Use untracked product-class frontiers and surfaceRole rollups as a canary for missing durable handles, not as a static task list.",
        "Use --surfaceRole when a broad frontier pass needs to focus product-owner, service-surface, epoch-context, semantic-model, or carrier-like rows.",
        "Use --liveCheckKind when you want records grouped by the mechanism that keeps them active, stale, or resolved.",
        "Use --path with a source path, documentation path, live-check path, untracked source path, or durable memory shard path.",
        "Use --query for substring plus camel-case/punctuation token matching before narrowing by structural filters.",
        "Use --anchorKind, --anchorLensId, or --symbolName when you need structural memory lookup instead of fuzzy query text.",
        "Use auLink anchors and auLink-exists live checks when durable memory points at framework-shaped semantic-runtime concepts.",
        "Use memory:write --template --auLinkId plus optional --symbolName to draft framework-shaped records without hand-authoring the auLink anchor envelope.",
        "Lens anchors are checked against LensCatalog ids and projections; recognized pnpm package-script anchors are checked against package.json scripts.",
        "auLink anchors continue to bridge.aulink mirror rows and are checked against product.architecture auLink decorator placements.",
        "Use memory:write to list shards, print a template, upsert a draft record, or remove a stale record with --dry-run first.",
        "Keep JSON memory as the queryable handle; use README files for stable boundaries, workbenches for rolling context, and .temp only for scratch/review packs.",
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
