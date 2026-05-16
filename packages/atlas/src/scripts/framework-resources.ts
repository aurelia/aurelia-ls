import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type {
  FrameworkResourceConvergenceRow,
  FrameworkResourcesValue,
} from "../inquiry/runtime/framework-resource-lenses.js";
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
  ...scriptOptionalStringFilter("exportName"),
  ...scriptOptionalStringFilter("resourceKind"),
  ...scriptOptionalStringFilter("resourceName"),
  ...scriptOptionalStringFilter("targetName"),
  ...scriptOptionalStringFilter("lane"),
  ...scriptOptionalStringFilter("bundleExportName"),
  ...scriptOptionalStringFilter("producerKind"),
  ...scriptOptionalStringFilter("productKind"),
  ...scriptOptionalStringFilter("instructionName"),
  ...scriptOptionalStringFilter("bindingName"),
  ...scriptOptionalStringFilter("instantiationKind"),
  ...scriptOptionalStringFilter("materializationSiteKind"),
  ...scriptOptionalStringFilter("query"),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const answer = await api.ask({
  lens: LensId.FrameworkResources,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 2 : 0 },
});

assertHitOrMissAnswer(`framework.resources:${projection}`, answer);
const value = answerValue<FrameworkResourcesValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "framework.resources",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("framework.resources");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
console.log(answer.summary);

if (value !== undefined) {
  printRollup(value, detail);
}
printConvergenceRows(value?.convergenceRows ?? [], displayRowLimit, detail);

function printRollup(
  value: FrameworkResourcesValue,
  includeCounts: boolean,
): void {
  console.log("");
  console.log("rollup");
  console.log(`- convergence rows: ${value.resourceConvergenceCount}`);
  if (value.totalResourceConvergenceCount !== value.resourceConvergenceCount) {
    console.log(`- total convergence rows before filters: ${value.totalResourceConvergenceCount}`);
  }
  console.log(`- open reasons: ${value.openReasonCount}`);
  console.log(`- open rows: ${value.openConvergenceRowCount}`);
  console.log(`- missing definition source site: ${value.missingDefinitionSourceSiteCount}`);
  console.log(`- only definition source site: ${value.onlyDefinitionSourceSiteCount}`);
  console.log(`- definition source same as declaration: ${value.definitionSourceSameAsDeclarationCount}`);
  console.log(`- definition source differs from declaration: ${value.definitionSourceDiffersFromDeclarationCount}`);
  if (!includeCounts) {
    return;
  }
  printCounts("resource kinds", value.resourceKinds, 30);
  printCounts("carrier kinds", value.carrierKinds, 30);
  printCounts("carrier source roles", value.carrierSourceRoles, 30);
  printCounts("lanes", value.lanes, 30);
  printCounts("source-site roles", value.sourceSiteRoles, 30);
}

function printConvergenceRows(
  rows: readonly FrameworkResourceConvergenceRow[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("convergence");
  printEmptyRows(rows, "no framework resource convergence rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId}:${row.sourceExportName} (${row.resourceKind}); name=${row.resourceName ?? "<none>"}; target=${row.targetName ?? "<none>"}; lanes=${row.lanes.join(",")}; ${sourceLabel({ source: row.definitionSource })}`,
    );
    if (includeDetail) {
      console.log(`  carrier=${row.carrierKind}; sourceRole=${row.carrierSourceRole}; lifetime=${row.instanceLifetime}`);
      if (row.publicExportNames.length > 0) {
        console.log(`  exports=${row.publicExportNames.join(", ")}`);
      }
      if (row.aliases.length > 0) {
        console.log(`  aliases=${row.aliases.join(", ")}`);
      }
      if (row.bindingNames.length > 0 || row.instructionNames.length > 0 || row.syntaxProductKinds.length > 0) {
        console.log(`  syntax=${[
          ...row.syntaxProductKinds,
          ...row.bindingNames.map((name) => `binding:${name}`),
          ...row.instructionNames.map((name) => `instruction:${name}`),
        ].join(", ")}`);
      }
      if (row.admissions.length > 0) {
        console.log(`  admissions=${row.admissions.map((admission) => admission.bundleExportName).join(", ")}`);
      }
      if (row.materializationSiteKinds.length > 0) {
        console.log(`  materialization=${row.materializationSiteKinds.join(", ")}; phases=${row.materializationPhases.join(", ")}; relations=${row.materializationRelations.join(", ")}`);
      }
      if (row.sourceSites.length > 0) {
        console.log(`  sourceSites=${row.sourceSites.map((site) => `${site.role}@${sourceLabel({ source: site.source })}`).join("; ")}`);
      }
      if (row.openReasons.length > 0) {
        console.log(`  open=${row.openReasons.join(" | ")}`);
      }
      console.log(`  ${row.summary}`);
    }
  }
}
