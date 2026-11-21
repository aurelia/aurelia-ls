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
  atlasMemoryNextPageContinuation,
  atlasMemoryProjectionContinuations,
  atlasMemorySummaryContinuations,
  memoryRowContinuations,
  memoryRowEvidence,
  storageIssueEvidence,
  atlasMemoryOpenSeams,
} from "./atlas-memory-routing.js";
import {
  filterMemoryRows,
  guidanceRows,
  type AtlasMemoryProjection,
} from "./atlas-memory-rows.js";
import {
  type AtlasMemoryAnalysis,
  type AtlasMemoryRecordRow,
  type AtlasMemoryRollup,
  type AtlasMemoryStorageIssue,
} from "./atlas-memory-contracts.js";
import {
  readAtlasMemoryAnalysis,
  memoryRollup,
  staleAtlasMemoryRecordRows,
} from "./atlas-memory-store.js";
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
  /** Storage issues. */
  readonly issues?: readonly AtlasMemoryStorageIssue[];
}

/** Answer queryable memory inquiries by joining durable JSON records with live source pressure. */
export function answerAtlasMemory(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<AtlasMemoryValue> {
  const projection = atlasMemoryProjection(inquiry);
  if (projection === undefined) {
    return createAnswer(inquiry, OutcomeKind.Unsupported, `Unknown Atlas memory projection: ${inquiry.projection}.`);
  }
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
  const ids = new Set(records.map(row => row.id));
  return {
    ...store,
    records,
    scopeGaps: store.scopeGaps.filter(gap => ids.has(gap.recordId)),
    rollup: memoryRollup(records, store.issues),
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
  const issues = analysis.issues.slice(0, limit);
  const evidence = [
    ...summaryRecords.map(memoryRowEvidence),
    ...issues.map(storageIssueEvidence),
  ];
  return createAnswer(
    inquiry,
    analysis.storageExists ? OutcomeKind.Hit : OutcomeKind.Open,
    `Read ${analysis.rollup.recordCount} Atlas memory record(s) and ${analysis.rollup.storageIssueCount} storage issue(s); showing ${summaryRecords.length} record(s) and ${issues.length} issue(s) after filters.`,
    {
      value: {
        ...atlasMemoryBaseValue(analysis),
        rollup: analysis.rollup,
        records: summaryRecords,
        issues,
      },
      basis,
      evidence,
      openSeams: atlasMemoryOpenSeams(analysis, summaryRecords),
      continuations: atlasMemorySummaryContinuations(inquiry, summaryRecords),
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
    openSeams: page => atlasMemoryOpenSeams(analysis, page.rows),
  });
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

function atlasMemoryProjection(inquiry: Inquiry): AtlasMemoryProjection | undefined {
  switch (inquiry.projection) {
    case undefined:
    case "summary":
      return "summary";
    case "records":
    case "guidance":
    case "stale":
    case "schema":
      return inquiry.projection;
    default:
      return undefined;
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
  const excludedChecks = analysis.records.reduce(
    (count, row) => count + row.liveChecks.filter(check => check.status === "out-of-scope").length, 0,
  );
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
      closure: analysis.scopeGaps.length > 0 || excludedChecks > 0 ? BasisClosure.Partial : BasisClosure.Exact,
      authority: BasisAuthority.Checker,
      freshness: BasisFreshness.Live,
      summary: `Evaluated memory against admitted source and analysis surfaces. Across ${analysis.records.length} record(s), ${analysis.scopeGaps.length} anchor(s) and ${excludedChecks} live check(s) were outside that scope.`,
      identity: sourceProject.summary().identity,
    },
  ];
}
