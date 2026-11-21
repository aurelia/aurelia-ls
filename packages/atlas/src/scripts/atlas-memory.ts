import type { AtlasMemoryValue } from "../inquiry/runtime/atlas-memory-lenses.js";
import type { AtlasMemoryAnchor, AtlasMemoryRecordRow } from "../inquiry/runtime/atlas-memory-contracts.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  assertKnownScriptArguments,
  printCounts,
  printEmptyRows,
  printRowSectionHeader,
  scriptArgumentValue,
  scriptArgumentValues,
  scriptFilterSummary,
  scriptNumberArgumentValue,
  sourceLabel,
} from "./script-output.js";

assertKnownScriptArguments("atlas.memory", [
  "--detail",
  "--json",
  "--query=",
  "--path=",
  "--domain=",
  "--domainMode=",
  "--kind=",
  "--status=",
  "--recordId=",
  "--name=",
  "--surfaceRole=",
  "--liveCheckKind=",
  "--anchorKind=",
  "--anchorLensId=",
  "--auLinkId=",
  "--symbolName=",
  "--nextActionPolicy=",
  "--rows=",
  "--limit=",
  "--all-guidance",
  "--guidanceRows=",
  "--all-anchors",
  "--anchorRows=",
  "--all-live-checks",
  "--liveCheckRows=",
  "--projection=",
]);

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
const recordId = scriptArgumentValue("--recordId=") ?? scriptArgumentValue("--name=");
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
const projection = scriptArgumentValue("--projection=") ?? (recordId === undefined ? "summary" : "records");
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
const value = answerValue<AtlasMemoryValue>(answer);

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
printDomainFilterHint(value);

if (value?.rollup !== undefined && (filterSummary === undefined || detail)) {
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
  row.kind === "memory-record" ? [row.record] : [],
);
const frontierUntracked = frontiers.flatMap((row) =>
  row.kind === "untracked-product-class"
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
  printRowSectionHeader("next actions", nextActions, displayRowLimit);
  for (const row of nextActions.slice(0, displayRowLimit)) {
    const domains = row.domains.length === 0 ? "" : `; domains ${row.domains.join(", ")}`;
    const shard = row.record === undefined
      ? ""
      : `; shard ${row.record.shardPath}:${row.record.shardLine ?? "?"}`;
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

printRowSectionHeader("memory records", records, displayRowLimit);
printEmptyRows(records, "no memory records returned");
for (const row of records.slice(0, displayRowLimit)) {
  const policy = row.nextActionPolicy === undefined
    ? ""
    : `; nextActionPolicy=${row.nextActionPolicy}`;
  console.log(
    `- ${row.id}: ${row.kind}/${row.status}; domains ${row.domains.join(", ")}; shard ${row.shardPath}:${row.shardLine ?? "?"}${policy}; ${row.summary}`,
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

const untracked = projection === "frontiers"
  ? frontierUntracked
  : value?.untrackedProductClassFrontiers ?? [];
if (untracked.length > 0) {
  printRowSectionHeader("untracked product class frontiers", untracked, displayRowLimit);
  for (const row of untracked.slice(0, displayRowLimit)) {
    const area = ` [${row.area}]`;
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

function printDomainFilterHint(value: AtlasMemoryValue | undefined): void {
  if (
    domains.length <= 1 ||
    domainMode === "any" ||
    atlasMemoryScriptValueHasRows(value)
  ) {
    return;
  }
  console.log(
    "hint: repeated --domain filters match records that carry every listed domain; add --domainMode=any to inspect records that carry any listed domain.",
  );
}

function atlasMemoryScriptValueHasRows(value: AtlasMemoryValue | undefined): boolean {
  return (
    (value?.records?.length ?? 0) > 0 ||
    (value?.frontiers?.length ?? 0) > 0 ||
    (value?.nextActions?.length ?? 0) > 0 ||
    (value?.untrackedProductClassFrontiers?.length ?? 0) > 0 ||
    (value?.issues?.length ?? 0) > 0
  );
}

function printRecordLiveChecks(
  row: AtlasMemoryRecordRow,
  indent: string,
): void {
  const checks = row.liveChecks;
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

function printRecordAnchors(
  row: AtlasMemoryRecordRow,
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
  row: AtlasMemoryRecordRow,
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

function anchorLabel(anchor: AtlasMemoryAnchor): string {
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
    case "external":
      return `${anchor.kind} ${anchor.url}${anchorSummary(anchor)}`;
  }
}

function anchorSummary(anchor: { readonly summary?: string }): string {
  return anchor.summary === undefined ? "" : ` - ${anchor.summary}`;
}
