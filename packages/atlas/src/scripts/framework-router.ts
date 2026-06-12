import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkRouterValue } from "../inquiry/runtime/framework-router-lenses.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  printCounts,
  printEmptyRows,
  scriptArgumentValue,
  scriptNumberArgumentValue,
  scriptOptionalStringFilter,
  sourceLabel,
} from "./script-output.js";

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = scriptArgumentValue("--projection=") ?? "summary";
const rows = scriptNumberArgumentValue("--rows=");
const displayRowLimit = rows ?? (detail ? 60 : 20);
const answerRowBudget = rows ?? (detail ? 120 : 40);

const filters = {
  ...scriptOptionalStringFilter("packageId"),
  ...scriptOptionalStringFilter("kind"),
  ...scriptOptionalStringFilter("surfaceKind"),
  ...scriptOptionalStringFilter("mechanicKind"),
  ...scriptOptionalStringFilter("issueKind"),
  ...scriptOptionalStringFilter("mechanism"),
  ...scriptOptionalStringFilter("stage"),
  ...scriptOptionalStringFilter("relation"),
  ...scriptOptionalStringFilter("actor"),
  ...scriptOptionalStringFilter("target"),
  ...scriptOptionalStringFilter("descriptorKey"),
  ...scriptOptionalStringFilter("key"),
  ...scriptOptionalStringFilter("sequence"),
  ...scriptOptionalStringFilter("phase"),
  ...scriptOptionalStringFilter("product"),
  ...scriptOptionalStringFilter("owner"),
  ...scriptOptionalStringFilter("ownerName"),
  ...scriptOptionalStringFilter("query"),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const answer = await api.ask({
  lens: LensId.FrameworkRouter,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 2 : 0 },
});

assertHitOrMissAnswer(`framework.router:${projection}`, answer);
const value = answerValue<FrameworkRouterValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "framework.router",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("framework.router");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
console.log(answer.summary);

if (value?.rollup !== undefined) {
  printRollup(value, detail);
}

printPackageRows(value, displayRowLimit);
printSurfaceRows(value, displayRowLimit, detail);
printFlowRows(value, displayRowLimit, detail);
printFlowIssueRows(value, displayRowLimit);
printRecognizerRows(value, displayRowLimit, detail);
printRecognizerIssueRows(value, displayRowLimit);
printRelationshipRows(value, displayRowLimit, detail);

function printRollup(
  value: FrameworkRouterValue,
  includeCounts: boolean,
): void {
  const rollup = value.rollup;
  console.log("");
  console.log("rollup");
  console.log(`- source baseline: ${value.sourceState.status}`);
  console.log(`- expected Aurelia commit: ${value.sourceState.baseline.aureliaCommit}`);
  console.log(`- actual Aurelia commit: ${value.sourceState.actualAureliaCommit ?? "unknown"}`);
  console.log(`- packages: ${rollup.packageCount}`);
  console.log(`- source files: ${rollup.sourceFileCount}`);
  console.log(`- surfaces: ${rollup.surfaceCount}`);
  console.log(`- flows: ${rollup.flowCount}`);
  console.log(`- relationships: ${rollup.relationshipCount}`);
  console.log(`- flow self-audit issues: ${rollup.flowIssueCount}`);
  console.log(`- recognizer mechanics: ${rollup.routeRecognizerMechanicCount}`);
  console.log(`- recognizer self-audit issues: ${rollup.routeRecognizerMechanicIssueCount}`);
  console.log(`- route-context rows: ${rollup.routeContextCount}`);
  console.log(`- route-tree rows: ${rollup.routeTreeCount}`);
  console.log(`- route-recognizer rows: ${rollup.routeRecognizerCount}`);
  console.log(`- viewport-agent rows: ${rollup.viewportAgentCount}`);
  if (!includeCounts) {
    return;
  }
  printCounts("flow stages", rollup.flowStages, 30);
  printCounts("relationship relations", rollup.relationshipRelations, 30);
  printCounts("relationship mechanisms", rollup.relationshipMechanisms, 30);
  printCounts("relationship phases", rollup.relationshipPhases, 30);
  printCounts("route-recognizer mechanic phases", rollup.routeRecognizerMechanicPhases, 30);
  printCounts("route-recognizer mechanic products", rollup.routeRecognizerMechanicProducts, 30);
  printCounts("route-recognizer mechanic kinds", rollup.routeRecognizerMechanicKinds, 30);
}

function printPackageRows(
  value: FrameworkRouterValue | undefined,
  limit: number,
): void {
  const rows = value?.packages ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("packages");
  printEmptyRows(rows, "no framework router package rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.id}; files=${row.sourceFileCount}; surfaces=${row.surfaceCount}; flows=${row.flowCount}; recognizer=${row.routeRecognizerCount}; viewport=${row.viewportAgentCount}; ${row.packageName}`,
    );
  }
}

function printSurfaceRows(
  value: FrameworkRouterValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.surfaces ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("surfaces");
  printEmptyRows(rows, "no framework router surface rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId} ${row.kind}; owner=${row.ownerName ?? "<none>"}; name=${row.name ?? "<none>"}; mechanism=${row.mechanism}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printFlowRows(
  value: FrameworkRouterValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.flows ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("flow");
  printEmptyRows(rows, "no framework router flow rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- #${row.sequence} ${row.packageId} ${row.stage}; ${row.actor} ${row.flowRelation} ${row.target}; key=${row.descriptorKey}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printFlowIssueRows(
  value: FrameworkRouterValue | undefined,
  limit: number,
): void {
  const rows = value?.flowIssues ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("flow issues");
  printEmptyRows(rows, "no framework router flow issue rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.kind}; key=${row.descriptorKey ?? "<none>"}; sequence=${row.sequence ?? "<none>"}; actor=${row.actor ?? "<none>"}; count=${row.count}; ${row.summary}`,
    );
  }
}

function printRecognizerRows(
  value: FrameworkRouterValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.routeRecognizerMechanics ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("route-recognizer mechanics");
  printEmptyRows(rows, "no framework route-recognizer mechanic rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId} ${row.phase}/${row.product}; ${row.kind}; ${row.ownerName ?? "<none>"}.${row.name}; key=${row.descriptorKey}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printRecognizerIssueRows(
  value: FrameworkRouterValue | undefined,
  limit: number,
): void {
  const rows = value?.routeRecognizerMechanicIssues ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("route-recognizer issues");
  printEmptyRows(rows, "no framework route-recognizer issue rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.kind}; key=${row.descriptorKey}; owner=${row.ownerName ?? "<none>"}; name=${row.name}; count=${row.count}; ${row.summary}`,
    );
  }
}

function printRelationshipRows(
  value: FrameworkRouterValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.relationships ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("relationships");
  printEmptyRows(rows, "no framework router relationship rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId} ${row.phase}/${row.relation}; ${row.from.kind}:${row.from.name} -> ${row.to.kind}:${row.to.name}; mechanism=${row.mechanism}; stage=${row.flowStage}; key=${row.descriptorKey}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}
