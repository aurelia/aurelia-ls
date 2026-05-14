import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  printCounts,
  printEmptyRows,
  scriptArgumentValue,
  scriptArgumentValues,
  scriptNumberArgumentValue,
  sourceLabel,
  type ScriptSourceRef,
} from "./script-output.js";

interface AtlasMemoryScriptValue {
  readonly rollup?: {
    readonly recordCount: number;
    readonly byKind: Readonly<Record<string, number>>;
    readonly byStatus: Readonly<Record<string, number>>;
    readonly untrackedProductClassFrontierCount: number;
    readonly untrackedProductClassFrontiersByArea?: Readonly<Record<string, number>>;
    readonly untrackedProductClassFrontiersBySurfaceRole?: Readonly<Record<string, number>>;
    readonly storageIssueCount: number;
  };
  readonly records?: readonly AtlasMemoryScriptRecordRow[];
  readonly untrackedProductClassFrontiers?: readonly {
    readonly id: string;
    readonly className: string;
    readonly filePath: string;
    readonly area?: string;
    readonly methodCount: number;
    readonly propertyCount: number;
    readonly lineCount: number;
    readonly surfaceRole?: string;
    readonly surfaceRoleReason?: string;
    readonly source?: ScriptSourceRef;
    readonly summary: string;
  }[];
  readonly frontiers?: readonly {
    readonly kind: string;
    readonly id: string;
    readonly status: string;
    readonly summary: string;
    readonly record?: AtlasMemoryScriptRecordRow;
    readonly frontier?: {
      readonly id: string;
      readonly className: string;
      readonly filePath: string;
      readonly area?: string;
      readonly methodCount: number;
      readonly propertyCount: number;
      readonly lineCount: number;
      readonly surfaceRole?: string;
      readonly surfaceRoleReason?: string;
      readonly source?: ScriptSourceRef;
      readonly summary: string;
    };
  }[];
  readonly nextActions?: readonly {
    readonly kind: string;
    readonly id: string;
    readonly rank: number;
    readonly status: string;
    readonly domains: readonly string[];
    readonly summary: string;
    readonly rationale: string;
    readonly area?: string;
    readonly untrackedCount?: number;
    readonly record?: AtlasMemoryScriptRecordRow;
    readonly frontier?: {
      readonly id: string;
      readonly className: string;
      readonly filePath: string;
      readonly area?: string;
      readonly methodCount: number;
      readonly propertyCount: number;
      readonly lineCount: number;
      readonly surfaceRole?: string;
      readonly surfaceRoleReason?: string;
      readonly source?: ScriptSourceRef;
      readonly summary: string;
    };
    readonly sampleFrontier?: {
      readonly id: string;
      readonly className: string;
      readonly filePath: string;
      readonly area?: string;
      readonly methodCount: number;
      readonly propertyCount: number;
      readonly lineCount: number;
      readonly surfaceRole?: string;
      readonly surfaceRoleReason?: string;
      readonly source?: ScriptSourceRef;
      readonly summary: string;
    };
    readonly issue?: {
      readonly id: string;
      readonly summary: string;
    };
  }[];
  readonly issues?: readonly {
    readonly id: string;
    readonly summary: string;
  }[];
}

interface AtlasMemoryScriptRecordRow {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly domains: readonly string[];
  readonly nextActionPolicy?: string;
  readonly shardPath?: string;
  readonly shardIndex?: number;
  readonly shardLine?: number;
  readonly summary: string;
  readonly liveChecks?: readonly AtlasMemoryScriptLiveCheckResult[];
  readonly record: {
    readonly guidance?: readonly string[];
    readonly anchors?: readonly AtlasMemoryScriptAnchor[];
  };
}

interface AtlasMemoryScriptLiveCheckResult {
  readonly status: string;
  readonly summary: string;
  readonly source?: ScriptSourceRef;
}

type AtlasMemoryScriptAnchor =
  | {
      readonly kind: "source";
      readonly filePath: string;
      readonly symbolName?: string;
      readonly line?: number;
      readonly summary?: string;
    }
  | {
      readonly kind: "doc" | "fixture";
      readonly path: string;
      readonly heading?: string;
      readonly scenario?: string;
      readonly summary?: string;
    }
  | {
      readonly kind: "script";
      readonly command: string;
      readonly summary?: string;
    }
  | {
      readonly kind: "lens";
      readonly lensId: string;
      readonly projection?: string;
      readonly summary?: string;
    }
  | {
      readonly kind: "auLink";
      readonly linkId: string;
      readonly symbolName?: string;
      readonly summary?: string;
    };

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const query = scriptArgumentValue("--query=");
const path = scriptArgumentValue("--path=");
const domains = scriptArgumentValues("--domain=").flatMap((value) =>
  value.split(",").map((entry) => entry.trim()).filter(Boolean)
);
const domainMode = scriptArgumentValue("--domainMode=");
const kind = scriptArgumentValue("--kind=");
const status = scriptArgumentValue("--status=");
const recordId = scriptArgumentValue("--recordId=");
const surfaceRole = scriptArgumentValue("--surfaceRole=");
const liveCheckKind = scriptArgumentValue("--liveCheckKind=");
const anchorKind = scriptArgumentValue("--anchorKind=");
const anchorLensId = scriptArgumentValue("--anchorLensId=");
const auLinkId = scriptArgumentValue("--auLinkId=");
const symbolName = scriptArgumentValue("--symbolName=");
const nextActionPolicy = scriptArgumentValue("--nextActionPolicy=");
const rows = scriptNumberArgumentValue("--rows=");
const guidanceRows = process.argv.includes("--all-guidance")
  ? Number.MAX_SAFE_INTEGER
  : scriptNumberArgumentValue("--guidanceRows=") ?? (detail ? 6 : 0);
const anchorRows = process.argv.includes("--all-anchors")
  ? Number.MAX_SAFE_INTEGER
  : scriptNumberArgumentValue("--anchorRows=") ?? (detail ? 8 : 0);
const liveCheckRows = process.argv.includes("--all-live-checks")
  ? Number.MAX_SAFE_INTEGER
  : scriptNumberArgumentValue("--liveCheckRows=") ?? (detail ? 4 : 0);
const rowLimit = rows ?? scriptNumberArgumentValue("--limit=");
const displayRowLimit = rowLimit ?? (detail ? 40 : 10);
const answerRowBudget = rowLimit ?? (detail ? 80 : 20);
const projection = scriptArgumentValue("--projection=") ?? "summary";
const filters = {
  ...(query === undefined ? {} : { query }),
  ...(path === undefined ? {} : { path }),
  ...(domains.length === 0 ? {} : { domain: domains.length === 1 ? domains[0] : domains }),
  ...(domainMode === undefined ? {} : { domainMode }),
  ...(kind === undefined ? {} : { kind }),
  ...(status === undefined ? {} : { status }),
  ...(recordId === undefined ? {} : { recordId }),
  ...(surfaceRole === undefined ? {} : { surfaceRole }),
  ...(liveCheckKind === undefined ? {} : { liveCheckKind }),
  ...(anchorKind === undefined ? {} : { anchorKind }),
  ...(anchorLensId === undefined ? {} : { anchorLensId }),
  ...(auLinkId === undefined ? {} : { auLinkId }),
  ...(symbolName === undefined ? {} : { symbolName }),
  ...(nextActionPolicy === undefined ? {} : { nextActionPolicy }),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 120_000 });
const answer = await api.ask({
  lens: LensId.AtlasMemory,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 4 : 2 },
});

assertHitOrMissAnswer("atlas.memory", answer);
const value = answerValue<AtlasMemoryScriptValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "atlas.memory",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("atlas.memory");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
const filterSummary = scriptFilterSummary(filters);
if (filterSummary !== undefined) {
  console.log(`filters: ${filterSummary}`);
}
console.log(answer.summary);

if (value?.rollup !== undefined) {
  printCounts("records by kind", value.rollup.byKind);
  printCounts("records by status", value.rollup.byStatus);
  console.log("");
  console.log("live untracked product class frontiers");
  console.log(`- ${value.rollup.untrackedProductClassFrontierCount}`);
  printCounts(
    "untracked frontiers by area",
    value.rollup.untrackedProductClassFrontiersByArea ?? {},
    detail ? 30 : 12,
  );
  printCounts(
    "untracked frontiers by class role",
    value.rollup.untrackedProductClassFrontiersBySurfaceRole ?? {},
    detail ? 30 : 12,
  );
  console.log("storage issues");
  console.log(`- ${value.rollup.storageIssueCount}`);
}

const frontiers = value?.frontiers ?? [];
const nextActions = value?.nextActions ?? [];
const frontierRecords = frontiers.flatMap((row) =>
  row.kind === "memory-record" && row.record !== undefined ? [row.record] : [],
);
const frontierUntracked = frontiers.flatMap((row) =>
  row.kind === "untracked-product-class" && row.frontier !== undefined
    ? [row.frontier]
    : [],
);
const records = projection === "frontiers"
  ? frontierRecords
  : value?.records ?? [];
const nextActionRecordIds = new Set(
  nextActions.flatMap((row) => row.record === undefined ? [] : [row.record.id]),
);
if (nextActions.length > 0) {
  console.log("");
  console.log("next actions");
  for (const row of nextActions.slice(0, displayRowLimit)) {
    const domains = row.domains.length === 0 ? "" : `; domains ${row.domains.join(", ")}`;
    const shard = row.record === undefined
      ? ""
      : `; shard ${row.record.shardPath ?? "unknown"}:${row.record.shardLine ?? "?"}`;
    const policy = row.record?.nextActionPolicy === undefined
      ? ""
      : `; nextActionPolicy=${row.record.nextActionPolicy}`;
    console.log(
      `- ${row.id}: ${row.kind}/${row.status}; rank ${row.rank}${domains}${shard}${policy}; ${row.summary}`,
    );
    if (detail) {
      console.log(`  rationale: ${row.rationale}`);
      const frontier = row.frontier ?? row.sampleFrontier;
      if (frontier !== undefined) {
        console.log(
          `  source: ${frontier.className} at ${sourceLabel(frontier)}`,
        );
      }
      if (row.record !== undefined) {
        printRecordAnchors(row.record, "  ");
        printRecordLiveChecks(row.record, "  ");
        printRecordGuidance(row.record, "  ");
      }
    }
  }
}

console.log("");
console.log("memory records");
printEmptyRows(records, "no memory records returned");
for (const row of records.slice(0, displayRowLimit)) {
  const policy = row.nextActionPolicy === undefined
    ? ""
    : `; nextActionPolicy=${row.nextActionPolicy}`;
  console.log(
    `- ${row.id}: ${row.kind}/${row.status}; domains ${row.domains.join(", ")}; shard ${row.shardPath ?? "unknown"}:${row.shardLine ?? "?"}${policy}; ${row.summary}`,
  );
  if (detail) {
    if (projection === "next" && nextActionRecordIds.has(row.id)) {
      console.log("  detail: expanded above as a next action.");
    } else {
      printRecordAnchors(row, "  ");
      printRecordLiveChecks(row, "  ");
      printRecordGuidance(row, "  ");
    }
  }
}

const genericFrontiers = frontiers.filter((row) =>
  (row.kind !== "memory-record" || row.record === undefined) &&
  (row.kind !== "untracked-product-class" || row.frontier === undefined),
);
if (genericFrontiers.length > 0) {
  console.log("");
  console.log("frontiers");
  for (const row of genericFrontiers.slice(0, displayRowLimit)) {
    console.log(`- ${row.id}: ${row.kind}/${row.status}; ${row.summary}`);
  }
}

const untracked = projection === "frontiers"
  ? frontierUntracked
  : value?.untrackedProductClassFrontiers ?? [];
if (untracked.length > 0) {
  console.log("");
  console.log("untracked product class frontiers");
  for (const row of untracked.slice(0, displayRowLimit)) {
    const area = row.area === undefined ? "" : ` [${row.area}]`;
    const role = row.surfaceRole === undefined ? "" : ` {${row.surfaceRole}}`;
    console.log(
      `- ${row.className}${area}${role}: ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
    );
    if (detail && row.surfaceRoleReason !== undefined) {
      console.log(`  role: ${row.surfaceRoleReason}`);
    }
  }
}

const issues = value?.issues ?? [];
if (issues.length > 0) {
  console.log("");
  console.log("storage issues");
  for (const issue of issues) {
    console.log(`- ${issue.id}: ${issue.summary}`);
  }
}

function printRecordLiveChecks(
  row: AtlasMemoryScriptRecordRow,
  indent: string,
): void {
  const checks = row.liveChecks ?? [];
  for (const check of checks.slice(0, liveCheckRows)) {
    const source = check.source === undefined
      ? ""
      : ` at ${sourceLabel({ source: check.source })}`;
    console.log(`${indent}live-check: ${check.status}${source}; ${check.summary}`);
  }
  if (checks.length > liveCheckRows) {
    console.log(`${indent}live-check: ... ${checks.length - liveCheckRows} more; pass --liveCheckRows=${checks.length} or --all-live-checks for all`);
  }
}

function scriptFilterSummary(filters: Readonly<Record<string, unknown>>): string | undefined {
  const parts = Object.entries(filters).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}=[${value.join(",")}]`;
    }
    return `${key}=${String(value)}`;
  });
  return parts.length === 0 ? undefined : parts.join("; ");
}

function printRecordAnchors(
  row: AtlasMemoryScriptRecordRow,
  indent: string,
): void {
  const anchors = row.record.anchors ?? [];
  for (const anchor of anchors.slice(0, anchorRows)) {
    console.log(`${indent}anchor: ${anchorLabel(anchor)}`);
  }
  if (anchors.length > anchorRows) {
    console.log(`${indent}anchor: ... ${anchors.length - anchorRows} more; pass --anchorRows=${anchors.length} or --all-anchors for all`);
  }
}

function printRecordGuidance(
  row: AtlasMemoryScriptRecordRow,
  indent: string,
): void {
  const guidance = row.record.guidance ?? [];
  for (const entry of guidance.slice(0, guidanceRows)) {
    console.log(`${indent}guidance: ${entry}`);
  }
  if (guidance.length > guidanceRows) {
    console.log(`${indent}guidance: ... ${guidance.length - guidanceRows} more; pass --guidanceRows=${guidance.length} or --all-guidance for all`);
  }
}

function anchorLabel(anchor: AtlasMemoryScriptAnchor): string {
  switch (anchor.kind) {
    case "source": {
      const line = anchor.line === undefined ? "" : `:${anchor.line}`;
      const symbol = anchor.symbolName === undefined ? "" : `#${anchor.symbolName}`;
      return `${anchor.kind} ${anchor.filePath}${line}${symbol}${anchorSummary(anchor)}`;
    }
    case "doc": {
      const heading = anchor.heading === undefined ? "" : `#${anchor.heading}`;
      return `${anchor.kind} ${anchor.path}${heading}${anchorSummary(anchor)}`;
    }
    case "fixture": {
      const scenario = anchor.scenario === undefined ? "" : `#${anchor.scenario}`;
      return `${anchor.kind} ${anchor.path}${scenario}${anchorSummary(anchor)}`;
    }
    case "script":
      return `${anchor.kind} ${anchor.command}${anchorSummary(anchor)}`;
    case "lens": {
      const projection = anchor.projection === undefined ? "" : `:${anchor.projection}`;
      return `${anchor.kind} ${anchor.lensId}${projection}${anchorSummary(anchor)}`;
    }
    case "auLink": {
      const symbol = anchor.symbolName === undefined ? "" : `#${anchor.symbolName}`;
      return `${anchor.kind} ${anchor.linkId}${symbol}${anchorSummary(anchor)}`;
    }
  }
}

function anchorSummary(anchor: { readonly summary?: string }): string {
  return anchor.summary === undefined ? "" : ` - ${anchor.summary}`;
}
