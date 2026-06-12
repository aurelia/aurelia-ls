import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type {
  FrameworkCapabilitiesValue,
  FrameworkCapabilityEvidenceRef,
  FrameworkCapabilityEvidenceRow,
  FrameworkCapabilityEvidenceTraceRow,
  FrameworkCapabilityGroundingRow,
  FrameworkCapabilityMatrixRow,
  FrameworkCapabilityRow,
} from "../inquiry/runtime/framework-capability-lenses.js";
import type {
  FrameworkReverseCoverageFamily,
  FrameworkTerritoryConstruct,
} from "../inquiry/runtime/framework-capability-territory.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  assertKnownScriptArguments,
  printCounts,
  printEmptyRows,
  scriptArgumentValue,
  scriptNumberArgumentValue,
  scriptOptionalStringFilter,
} from "./script-output.js";

assertKnownScriptArguments("framework:capabilities", [
  "--detail",
  "--json",
  "--projection=",
  "--rows=",
  "--id=",
  "--capabilityId=",
  "--domain=",
  "--locality=",
  "--resourceKind=",
  "--resourceSourceForm=",
  "--effect=",
  "--requirement=",
  "--groundingStrength=",
  "--targetRows=",
  "--targetEvidenceRows=",
  "--query=",
]);

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = scriptArgumentValue("--projection=") ?? "summary";
const rows = scriptNumberArgumentValue("--rows=");
const targetRows = scriptNumberArgumentValue("--targetRows=");
const targetEvidenceRows = scriptNumberArgumentValue("--targetEvidenceRows=");
const displayRowLimit = rows ?? (detail ? 80 : 24);
const answerRowBudget = rows ?? (detail ? 120 : 60);

const filters = {
  ...scriptOptionalStringFilter("id"),
  ...scriptOptionalStringFilter("capabilityId"),
  ...scriptOptionalStringFilter("domain"),
  ...scriptOptionalStringFilter("locality"),
  ...scriptOptionalStringFilter("resourceKind"),
  ...scriptOptionalStringFilter("resourceSourceForm"),
  ...scriptOptionalStringFilter("effect"),
  ...scriptOptionalStringFilter("requirement"),
  ...scriptOptionalStringFilter("groundingStrength"),
  ...(targetRows === undefined ? {} : { targetRows }),
  ...(targetEvidenceRows === undefined ? {} : { targetEvidenceRows }),
  ...scriptOptionalStringFilter("query"),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const answer = await api.ask({
  lens: LensId.FrameworkCapabilities,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 2 : 0 },
});

assertHitOrMissAnswer(`framework.capabilities:${projection}`, answer);
const value = answerValue<FrameworkCapabilitiesValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "framework.capabilities",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("framework.capabilities");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
console.log(answer.summary);

if (value !== undefined) {
  printRollup(value, detail);
  if (value.capabilityRows !== undefined) {
    printRows(value.capabilityRows, displayRowLimit, detail);
  }
  printMatrixRows(value.matrixRows ?? [], displayRowLimit, detail);
  printEvidenceRows(value.evidenceRows ?? [], displayRowLimit, detail);
  printEvidenceTraceRows(value.evidenceTraceRows ?? [], displayRowLimit, detail);
  printGroundingRows(value.groundingRows ?? [], displayRowLimit, detail);
    printInventoryRows(value.inventoryRows ?? [], displayRowLimit, detail);
    printReverseCoverageRows(value.reverseCoverageRows ?? [], displayRowLimit, detail);
}

function printInventoryRows(
  rows: readonly FrameworkTerritoryConstruct[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("inventory (source-derived concrete constructs)");
  const byFamily = new Map<string, number>();
  for (const row of rows) {
    byFamily.set(row.family, (byFamily.get(row.family) ?? 0) + 1);
  }
  for (const [family, count] of byFamily) {
    console.log(`- ${family}: ${count}`);
  }
  if (!includeDetail) {
    return;
  }
  for (const row of rows.slice(0, limit)) {
    const kind = row.kind === null ? "" : ` [${row.kind}]`;
    const shape = row.exportShape === null ? "" : ` (${row.exportShape})`;
    console.log(`  ${row.family}:${row.identity}${kind}${shape}`);
  }
}

function printReverseCoverageRows(
  rows: readonly FrameworkReverseCoverageFamily[],
  _limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("reverse coverage (concrete constructs vs auLink mirror)");
  for (const row of rows) {
    console.log(
      `- ${row.family}: ${row.mirrored}/${row.total} mirrored (role evidence ${row.mirroredWithRoleEvidence}); instantiable ${row.instantiableMirrored}/${row.instantiableTotal}`,
    );
    if (!includeDetail) {
      continue;
    }
    for (const group of row.notMirroredByShape) {
      const cap = group.instantiable ? group.symbols.length : 12;
      const shown = group.symbols.slice(0, cap);
      const more = group.symbols.length - shown.length;
      console.log(
        `  not mirrored [${group.shape}] (${group.symbols.length}): ${shown.join(", ")}${more > 0 ? `, +${more} more` : ""}`,
      );
    }
  }
}

function printRollup(
  value: FrameworkCapabilitiesValue,
  includeCounts: boolean,
): void {
  console.log("");
  console.log("rollup");
  console.log(`- capability rows: ${value.capabilityRowCount}`);
  if (value.totalCapabilityRowCount !== value.capabilityRowCount) {
    console.log(`- total capability rows before filters: ${value.totalCapabilityRowCount}`);
  }
  if (!includeCounts) {
    return;
  }
  printCounts("domains", value.domains, 30);
  printCounts("localities", value.localities, 30);
  printCounts("resource kinds", value.resourceKinds, 30);
  printCounts("resource source forms", value.resourceSourceForms, 30);
  printCounts("effects", value.effects, 40);
  printCounts("requirement kinds", value.requirementKinds, 10);
  printCounts("grounding strengths", value.groundingStrengths, 10);
}

function printRows(
  rows: readonly FrameworkCapabilityRow[],
  limit: number,
  includeDetail: boolean,
): void {
  console.log("");
  console.log("capabilities");
  printEmptyRows(rows, "no framework capability rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.id} (${row.domain}); locality=${row.localities.join(",")}; resources=${resourceKindsForRow(row).join(",") || "<none>"}; sourceForms=${sourceFormsForRow(row).join(",") || "<none>"}; effect=${row.effects.join(",")}`,
    );
    if (!includeDetail) {
      continue;
    }
    console.log(`  title=${row.title}`);
    console.log(`  concepts=${row.frameworkConcepts.join(", ") || "<none>"}`);
    console.log(`  forms=${row.userFacingForms.join("; ") || "<none>"}`);
    printResourceSourceSupport(row);
    printRelation("requires", row.requires);
    printRelation("exclusive", row.mutuallyExclusiveWith);
    console.log(`  ${row.summary}`);
    printEvidence(row.evidence);
  }
}

function printMatrixRows(
  rows: readonly FrameworkCapabilityMatrixRow[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("matrix");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.capabilityId}; domain=${row.domain}; resource=${row.resourceKind ?? "<none>"}; sourceForm=${row.resourceSourceForm ?? "<none>"}; locality=${row.localities.join(",")}; effect=${row.effects.join(",")}`,
    );
    if (includeDetail) {
      printRelation("requires", row.requirementIds);
      console.log(`  ${row.summary}`);
    }
  }
}

function printEvidenceRows(
  rows: readonly FrameworkCapabilityEvidenceRow[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("evidence");
  for (const row of rows.slice(0, limit)) {
    const target = [
      row.lensId,
      row.projection,
      row.query === undefined ? undefined : `query=${row.query}`,
      row.symbolName === undefined ? undefined : `symbol=${row.symbolName}`,
    ].filter((part): part is string => part !== undefined && part.length > 0).join(" ");
    console.log(
      `- ${row.capabilityId}; lane=${row.lane}; grounding=${row.groundingStrength}${target.length === 0 ? "" : `; target=${target}`}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printEvidenceTraceRows(
  rows: readonly FrameworkCapabilityEvidenceTraceRow[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("evidence trace");
  for (const row of rows.slice(0, limit)) {
    const target = [
      row.lensId,
      row.projection,
      row.query === undefined ? undefined : `query=${row.query}`,
      row.symbolName === undefined ? undefined : `symbol=${row.symbolName}`,
    ].filter((part): part is string => part !== undefined && part.length > 0).join(" ");
    console.log(
      `- ${row.capabilityId}; lane=${row.lane}; grounding=${row.groundingStrength}; outcome=${row.targetOutcome ?? "<none>"}; target=${target || "<none>"}; returned=${row.targetReturned ?? "<none>"}; total=${row.targetTotal ?? "<none>"}; evidence=${row.targetEvidenceCount}; seams=${row.targetOpenSeamCount}`,
    );
    if (!includeDetail) {
      continue;
    }
    for (const collection of row.targetCollections) {
      console.log(`  collection[${collection.fieldName}]=${collection.rowCount}`);
    }
    for (const sample of row.targetEvidenceSamples) {
      const source = sample.source === undefined
        ? ""
        : ` source=${sample.source.filePath}:${sample.source.start.line + 1}:${sample.source.start.character + 1}`;
      console.log(`  evidence[${sample.kind}/${sample.role}]${source}: ${sample.summary}`);
    }
    console.log(`  ${row.summary}`);
  }
}

function printGroundingRows(
  rows: readonly FrameworkCapabilityGroundingRow[],
  limit: number,
  includeDetail: boolean,
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("grounding");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.capabilityId}; grounding=${row.groundingStrength}; evidence=${row.evidenceCount}; sourceEvidence=${row.sourceBackedEvidenceCount}; corpusEvidence=${row.corpusBackedEvidenceCount}; ungroundedEvidence=${row.ungroundedEvidenceCount}; requirements=${row.requirementIds.join(",") || "<none>"}`,
    );
    if (!includeDetail) {
      continue;
    }
    printRelation("exclusive", row.exclusiveCapabilityIds);
    for (const note of row.notes) {
      console.log(`  note=${note}`);
    }
    console.log(`  ${row.summary}`);
  }
}

function sourceFormsForRow(row: FrameworkCapabilityRow): readonly string[] {
  return [...new Set(row.resourceSourceSupport.flatMap((support) => support.sourceForms))].sort();
}

function resourceKindsForRow(row: FrameworkCapabilityRow): readonly string[] {
  return [...new Set([
    ...row.resourceKinds,
    ...row.resourceSourceSupport.map((support) => support.resourceKind),
  ])].sort();
}

function printResourceSourceSupport(row: FrameworkCapabilityRow): void {
  if (row.resourceSourceSupport.length === 0) {
    return;
  }
  for (const support of row.resourceSourceSupport) {
    console.log(`  resource-source[${support.resourceKind}]=${support.sourceForms.join(",")}`);
  }
}

function printRelation(label: string, values: readonly (string | { readonly kind: string; readonly id: string; readonly summary: string })[]): void {
  if (values.length > 0) {
    console.log(`  ${label}=${values.map((value) =>
      typeof value === "string" ? value : `${value.kind}:${value.id}`,
    ).join(", ")}`);
  }
}

function printEvidence(rows: readonly FrameworkCapabilityEvidenceRef[]): void {
  if (rows.length === 0) {
    return;
  }
  for (const row of rows) {
    const target = [
      row.lensId,
      row.projection,
      row.query === undefined ? undefined : `query=${row.query}`,
      row.symbolName === undefined ? undefined : `symbol=${row.symbolName}`,
    ].filter((part): part is string => part !== undefined && part.length > 0).join(" ");
    console.log(`  evidence[${row.lane}]${target.length === 0 ? "" : ` ${target}`}: ${row.summary}`);
  }
}
