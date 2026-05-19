import { LensId } from "../inquiry/lens.js";
import { OutcomeKind } from "../inquiry/answer.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertKnownScriptArguments,
  printEmptyRows,
  printRowSectionHeader,
  scriptArgumentValue,
  scriptArgumentValues,
  scriptFilterSummary,
  scriptNumberArgumentValue,
  sourceLabel,
} from "./script-output.js";
import type { Continuation } from "../inquiry/continuation.js";
import { LensCatalog } from "../inquiry/lens-catalog.js";
import type {
  AtlasWorkRouteLensAnchor,
} from "../inquiry/runtime/atlas-work-router-contracts.js";
import type {
  AtlasWorkRouteHealthRow,
  AtlasWorkRouteMemoryCoverageRow,
  AtlasWorkRoutePlanRow,
  AtlasWorkRouteRow,
  AtlasWorkRouteWorksetRow,
  AtlasWorkRouterValue,
} from "../inquiry/runtime/atlas-work-router-rows.js";

assertKnownScriptArguments("atlas.work-router", [
  "--detail",
  "--json",
  "--projection=",
  "--query=",
  "--routeId=",
  "--route=",
  "--domain=",
  "--domainMode=",
  "--relatedTo=",
  "--role=",
  "--lensId=",
  "--path=",
  "--symbolName=",
  "--auLinkId=",
  "--concept=",
  "--effectKind=",
  "--recipeKey=",
  "--seedUse=",
  "--rows=",
  "--limit=",
  "--plans",
  "--includePlans",
  "--fileRows=",
  "--changedFileRows=",
]);

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = scriptArgumentValue("--projection=") ?? "summary";
const query = scriptArgumentValue("--query=");
const routeIds = [
  ...scriptArgumentValues("--routeId="),
  ...scriptArgumentValues("--route="),
].flatMap(splitCsv);
const domains = scriptArgumentValues("--domain=").flatMap(splitCsv);
const domainMode = scriptArgumentValue("--domainMode=");
const relatedTo = scriptArgumentValue("--relatedTo=");
const role = scriptArgumentValue("--role=");
const lensId = scriptArgumentValue("--lensId=");
const path = scriptArgumentValue("--path=");
const symbolName = scriptArgumentValue("--symbolName=");
const auLinkId = scriptArgumentValue("--auLinkId=");
const concept = scriptArgumentValue("--concept=");
const effectKind = scriptArgumentValue("--effectKind=");
const recipeKey = scriptArgumentValue("--recipeKey=");
const seedUse = scriptArgumentValue("--seedUse=");
const rows = scriptNumberArgumentValue("--rows=");
const rowLimit = rows ?? scriptNumberArgumentValue("--limit=");
const displayRowLimit = rowLimit ?? (detail ? 20 : 8);
const answerRowBudget = rowLimit ?? (detail ? 40 : 16);
const includePlans = process.argv.includes("--plans") ||
  process.argv.includes("--includePlans");
const fileRows = scriptNumberArgumentValue("--fileRows=") ??
  scriptNumberArgumentValue("--changedFileRows=");
const worksetFileRowLimit = fileRows ?? (detail ? 8 : 0);

const routeFilters = {
  ...(query === undefined ? {} : { query }),
  ...(routeIds.length === 0
    ? {}
    : { routeId: routeIds.length === 1 ? routeIds[0] : routeIds }),
  ...(domains.length === 0
    ? {}
    : { domain: domains.length === 1 ? domains[0] : domains }),
  ...(domainMode === undefined ? {} : { domainMode }),
  ...(relatedTo === undefined ? {} : { relatedTo }),
  ...(role === undefined ? {} : { role }),
  ...(lensId === undefined ? {} : { lensId }),
  ...(path === undefined ? {} : { path }),
  ...(symbolName === undefined ? {} : { symbolName }),
  ...(auLinkId === undefined ? {} : { auLinkId }),
  ...(concept === undefined ? {} : { concept }),
  ...(effectKind === undefined ? {} : { effectKind }),
  ...(recipeKey === undefined ? {} : { recipeKey }),
  ...(seedUse === undefined ? {} : { seedUse }),
};
const filters = {
  ...routeFilters,
  ...(fileRows === undefined ? {} : { worksetFileRows: fileRows }),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 120_000 });
const answer = await api.ask({
  lens: LensId.AtlasWorkRouter,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 4 : 2 },
});

const value = answerValue<AtlasWorkRouterValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "atlas.work-router",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("atlas.work-router");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
const filterSummary = scriptFilterSummary(routeFilters);
if (filterSummary !== undefined) {
  console.log(`filters: ${filterSummary}`);
}
if (fileRows !== undefined) {
  console.log(`workset file rows: ${fileRows}`);
}
console.log(answer.summary);

if (value?.rollup !== undefined) {
  console.log("");
  console.log("rollup");
  console.log(`- routes: ${value.rollup.matchedRouteCount}/${value.rollup.routeCount}`);
  console.log(`- weak-text matches: ${value.rollup.weakTextMatchCount}`);
  console.log(`- routes with memory joins: ${value.rollup.routeWithMemoryCount}`);
  console.log(`- routes with fixture seeds: ${value.rollup.routeWithFixtureSeedCount}`);
  console.log(`- routes with source matches: ${value.rollup.routeWithSourceMatchCount}`);
}

if (projection !== "memory-coverage") {
  printRoutes(value?.routes ?? [], displayRowLimit);
}
if (shouldPrintRoutePlans()) {
  printRoutePlans(value?.routePlans ?? [], displayRowLimit);
}
if (projection === "route-health" || (detail && (value?.routeHealth?.length ?? 0) > 0)) {
  printRouteHealth(value?.routeHealth ?? [], displayRowLimit);
}
if (projection === "workset" || (detail && (value?.workset?.length ?? 0) > 0)) {
  printWorkset(value?.workset ?? [], displayRowLimit, worksetFileRowLimit);
}
if (projection === "memory-coverage" || (detail && (value?.memoryCoverage?.length ?? 0) > 0)) {
  printMemoryCoverage(value?.memoryCoverage ?? [], displayRowLimit);
}
if (answer.outcome !== OutcomeKind.Hit && answer.outcome !== OutcomeKind.Miss) {
  printSupportedProjectionHint(projection);
  printContinuations(answer.continuations, displayRowLimit);
  process.exit(answer.outcome === OutcomeKind.Error ? 1 : 0);
}

function printRoutes(
  routes: readonly AtlasWorkRouteRow[],
  limit: number,
): void {
  printRowSectionHeader("routes", routes, limit);
  printEmptyRows(routes, "no work routes matched");
  for (const row of routes.slice(0, limit)) {
    console.log(`- ${row.id} [${row.matchStrength}; score=${row.matchScore}]`);
    console.log(`  ${row.title}`);
    console.log(`  domains: ${row.domains.join(", ")}`);
    console.log(`  matched: ${row.matchedBy.join("; ")}`);
    if (detail && row.cautions.length > 0) {
      console.log(`  caution: ${row.cautions[0]}`);
    }
  }
}

function shouldPrintRoutePlans(): boolean {
  return projection === "next" ||
    projection === "route-plan" ||
    projection === "next-questions" ||
    includePlans ||
    (
      detail &&
      projection !== "route-health" &&
      projection !== "memory-coverage" &&
      projection !== "workset"
    );
}

function printRoutePlans(
  plans: readonly AtlasWorkRoutePlanRow[],
  limit: number,
): void {
  printRowSectionHeader("route plans", plans, limit);
  printEmptyRows(plans, "no route plans returned");
  for (const plan of plans.slice(0, limit)) {
    console.log(`- ${plan.routeId}: ${plan.summary}`);
    const sourceMatches = plan.sourceAnchors.filter((anchor) => anchor.found);
    if (sourceMatches.length > 0) {
      console.log(`  source: ${sourceMatches.map((row) => row.anchor.symbolName ?? sourceLabel({ filePath: row.anchor.filePath })).join(", ")}`);
    }
    if (detail && plan.authority.length > 0) {
      console.log(`  authority: ${plan.authority.slice(0, 6).join(" -> ")}`);
    }
    if (detail && plan.relatedRouteIds.length > 0) {
      console.log(`  related routes: ${plan.relatedRouteIds.slice(0, 6).join(", ")}`);
    }
    if (plan.memoryNextActions.length > 0) {
      console.log(`  memory next: ${plan.memoryNextActions.slice(0, 3).map(memoryNextActionLabel).join("; ")}`);
    }
    if (detail && plan.memoryRecords.length > 0) {
      console.log(`  memory records: ${plan.memoryRecords.slice(0, 4).map((row) => `${row.id}(${row.status})`).join(", ")}`);
    }
    if (detail && plan.lensAnchors.length > 0) {
      console.log(`  lenses: ${plan.lensAnchors.slice(0, 4).map(lensAnchorLabel).join(", ")}`);
    }
    if (plan.scriptAnchors.length > 0) {
      console.log(`  scripts: ${plan.scriptAnchors.slice(0, detail ? 5 : 3).map((row) => row.command).join("; ")}`);
    }
    if (plan.docAnchors.length > 0) {
      console.log(`  docs: ${plan.docAnchors.slice(0, detail ? 5 : 3).map((row) => row.path).join("; ")}`);
    }
    if (plan.pathAnchors.length > 0) {
      console.log(`  paths: ${plan.pathAnchors.slice(0, detail ? 5 : 3).map((row) => row.pathPrefix).join("; ")}`);
    }
    if (plan.fixtureSeeds.length > 0) {
      console.log(`  fixture seeds: ${plan.fixtureSeeds.slice(0, detail ? 5 : 3).map(fixtureSeedLabel).join("; ")}`);
    }
    if (plan.expectedEffects.length > 0) {
      console.log(`  expected effects: ${plan.expectedEffects.slice(0, 4).map(expectedEffectLabel).join(", ")}`);
    }
    if (plan.frameworkErrorCodeLabel !== undefined) {
      console.log(`  framework error code: ${plan.frameworkErrorCodeLabel}`);
    }
    if (detail && plan.queryCanaries.length > 0) {
      const passedCanaries = plan.queryCanaries.filter((row) => row.passed).length;
      console.log(`  query canaries: ${passedCanaries}/${plan.queryCanaries.length}`);
      for (const canary of plan.queryCanaries.filter((row) => !row.passed).slice(0, 3)) {
        console.log(`    - miss: ${canary.summary}`);
      }
    }
    if (detail && plan.cautions.length > 0) {
      console.log(`  cautions:`);
      for (const caution of plan.cautions.slice(0, 3)) {
        console.log(`    - ${caution}`);
      }
    }
    if (detail && plan.nextQuestions.length > 0) {
      console.log(`  next:`);
      for (const question of plan.nextQuestions.slice(0, 5)) {
        console.log(`    - ${question}`);
      }
    }
  }
}

function printRouteHealth(
  rows: readonly AtlasWorkRouteHealthRow[],
  limit: number,
): void {
  printRowSectionHeader("route health", rows, limit);
  printEmptyRows(rows, "no route health rows returned");
  for (const row of rows.slice(0, limit)) {
    const status = row.issues.length === 0 ? "ok" : `${row.issues.length} warning(s)`;
    console.log(`- ${row.routeId}: ${status}`);
    console.log(
      `  sources ${row.foundSourceAnchorCount}/${row.sourceAnchorCount}; memory ${row.memoryRecordCount} record(s) from ${row.memoryAnchorCount} anchor(s); corpus ${row.fixtureSeedCount} fixture seed(s), ${row.expectedEffectCount} expected-effect descriptor(s) from ${row.corpusAnchorCount} anchor(s); query canaries ${row.queryCanaryCount - row.failingQueryCanaryCount}/${row.queryCanaryCount}`,
    );
    if (detail && row.issues.length > 0) {
      for (const issue of row.issues.slice(0, 3)) {
        console.log(`  warning: ${issue.summary}`);
      }
    }
  }
}

function lensAnchorLabel(anchor: AtlasWorkRouteLensAnchor): string {
  const projection = anchor.projection === undefined ? "" : `:${anchor.projection}`;
  const filters = anchor.filters === undefined
    ? ""
    : `(${Object.entries(anchor.filters).map(([key, value]) =>
      `${key}=${filterValueLabel(value)}`
    ).join(",")})`;
  return `${anchor.lensId}${projection}${filters}`;
}

function filterValueLabel(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(filterValueLabel).join("|");
  }
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return String(value);
    default:
      return JSON.stringify(value);
  }
}

function printWorkset(
  rows: readonly AtlasWorkRouteWorksetRow[],
  limit: number,
  fileLimit: number,
): void {
  printRowSectionHeader("workset", rows, limit);
  printEmptyRows(rows, "no changed worktree files matched work routes");
  for (const row of rows.slice(0, limit)) {
    console.log(`- ${row.routeId}: ${row.changedFileCount} changed file(s), ${row.matchedAnchorCount} route anchor(s), ${row.matchedMemoryAnchorCount} memory anchor(s), ${row.matchedMemoryShardCount} memory shard(s)`);
    if (detail && fileLimit > 0) {
      const displayedFiles = row.changedFiles.slice(0, fileLimit);
      for (const file of displayedFiles) {
        console.log(`  ${file.status} ${file.filePath} [${file.matchKinds.join(", ")}]`);
      }
      const omittedCount = row.changedFileCount - displayedFiles.length;
      if (omittedCount > 0) {
        console.log(`  ... ${omittedCount} more changed file(s); increase --fileRows to print more`);
      }
    }
  }
}

function printMemoryCoverage(
  rows: readonly AtlasWorkRouteMemoryCoverageRow[],
  limit: number,
): void {
  printRowSectionHeader("memory coverage", rows, limit);
  printEmptyRows(rows, "no Atlas memory next actions returned");
  const routed = rows.filter((row) => row.routed).length;
  if (rows.length > 0) {
    console.log(`- routed: ${routed}/${rows.length}`);
  }
  for (const row of rows.slice(0, limit)) {
    console.log(`- ${row.id}: ${row.routed ? "routed" : "unrouted"}; rank=${row.rank}; status=${row.status}`);
    console.log(`  domains: ${row.domains.join(", ") || "none"}`);
    console.log(`  action: ${row.actionSummary}`);
    if (row.routeMatches.length > 0) {
      console.log(`  routes: ${row.routeMatches.slice(0, detail ? 5 : 3).map((match) => `${match.routeId}(${match.score})`).join(", ")}`);
    }
  }
}

function printContinuations(
  continuations: readonly Continuation[],
  limit: number,
): void {
  console.log("");
  console.log("continuations");
  printEmptyRows(continuations, "no typed continuations returned");
  for (const continuation of continuations.slice(0, limit)) {
    const projection = continuation.inquiry.projection === undefined
      ? ""
      : `:${continuation.inquiry.projection}`;
    const filters = continuation.inquiry.filters === undefined
      ? ""
      : ` filters=${filterValueLabel(continuation.inquiry.filters)}`;
    const priority = continuation.priority === undefined
      ? ""
      : `/${continuation.priority}`;
    console.log(`- ${continuation.kind}${priority}: ${continuation.inquiry.lens}${projection}${filters}`);
    console.log(`  ${continuation.rationale}`);
  }
}

function printSupportedProjectionHint(projection: string): void {
  const supportedProjections = LensCatalog
    .find((lens) => lens.id === LensId.AtlasWorkRouter)
    ?.projections.map((entry) => entry.id) ?? [];
  if (supportedProjections.includes(projection)) {
    return;
  }
  console.log("");
  console.log("supported projections");
  console.log(`- ${supportedProjections.join(", ")}`);
}

function expectedEffectLabel(
  row: { readonly key: string; readonly effectRole: string | null; readonly seedPolicy: string | null },
): string {
  const role = row.effectRole === null ? "" : `:${row.effectRole}`;
  const seedPolicy = row.seedPolicy === null ? "" : `/${row.seedPolicy}`;
  return `${row.key}${role}${seedPolicy}`;
}

function fixtureSeedLabel(
  row: {
    readonly source?: { readonly filePath?: string; readonly start?: { readonly line?: number } };
    readonly filePath: string;
    readonly seedUse: string;
    readonly effectHints: readonly string[];
    readonly recipeHints: readonly string[];
    readonly classificationReasons?: readonly { readonly kind: string; readonly key: string }[];
  },
): string {
  const effects = row.effectHints.slice(0, 3).join("|") || "none";
  const recipes = row.recipeHints.slice(0, 4).join("|") || "none";
  const reasons = fixtureSeedReasonLabel(row.classificationReasons ?? []);
  const line = row.source?.start?.line;
  const label = line === undefined ? row.filePath : `${row.filePath}:${line + 1}`;
  return `${label} [${row.seedUse}; effects=${effects}; recipes=${recipes}${reasons}]`;
}

function fixtureSeedReasonLabel(
  reasons: readonly { readonly kind: string; readonly key: string }[],
): string {
  const focusedReasons = reasons
    .filter((reason) => reason.kind === "surface" || reason.kind === "contrast")
    .slice(0, 4)
    .map((reason) => `${reason.kind}:${reason.key}`);
  return focusedReasons.length === 0
    ? ""
    : `; reasons=${focusedReasons.join("|")}`;
}

function memoryNextActionLabel(
  row: { readonly id: string; readonly summary: string },
): string {
  return `${row.id} :: ${row.summary}`;
}

function splitCsv(value: string): readonly string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
