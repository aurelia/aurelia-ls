import type { Answer } from "../inquiry/answer.js";
import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { BridgeAuLinkValue } from "../inquiry/runtime/bridge-lenses.js";
import type { AuLinkMirrorRow } from "../inquiry/runtime/bridge-aulink-mirror.js";
import type { AuLinkUsageComparisonSummaryRow } from "../inquiry/runtime/bridge-aulink-usage-lenses.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitAnswer,
  assertHitOrMissAnswer,
  printCounts,
  printEmptyRows,
} from "./script-output.js";

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const sampleRows = 12;
const timings: { readonly label: string; readonly milliseconds: number }[] = [];

const started = performance.now();
const summaryAnswer = await timedAsk("summary", () => askBridge("summary"));
const gapAnswer = await timedAsk("gaps", () => askOptionalBridge("gaps", {}, sampleRows));
const noRoleEvidenceAnswer = await timedAsk("mirror without role evidence", () =>
  askOptionalBridge("mirror", {
    hasRoleEvidence: false,
    orderBy: "pressure",
  }, sampleRows)
);
const noObligationAnswer = await timedAsk("mirror without obligations", () =>
  askOptionalBridge("mirror", {
    hasEmulationObligations: false,
    orderBy: "pressure",
  }, sampleRows)
);
const usageDivergenceAnswer = await timedAsk("usage comparison", () =>
  askOptionalBridge("usage-comparison", {
    orderBy: "divergence",
  }, sampleRows)
);

const summary = summaryAnswer.value.rollup;
const gaps = answerValue<BridgeAuLinkValue>(gapAnswer)?.gaps ?? [];
const noRoleEvidence = answerValue<BridgeAuLinkValue>(noRoleEvidenceAnswer)?.mirror ?? [];
const noRoleEvidenceRollup = answerValue<BridgeAuLinkValue>(noRoleEvidenceAnswer)?.mirrorRollup;
const noObligations = answerValue<BridgeAuLinkValue>(noObligationAnswer)?.mirror ?? [];
const noObligationRollup = answerValue<BridgeAuLinkValue>(noObligationAnswer)?.mirrorRollup;
const usageDivergence = answerValue<BridgeAuLinkValue>(usageDivergenceAnswer)?.usageComparison ?? [];
const usageDivergenceRollup = answerValue<BridgeAuLinkValue>(usageDivergenceAnswer)?.usageComparisonRollup;

console.log("bridge.aulink pressure");
console.log("scope: product-to-framework auLink coverage, mirror role evidence, emulation obligations, and usage divergence");
console.log(`request: ${(performance.now() - started).toFixed(1)}ms`);
console.log(`projection timings: ${timingSummary(timings)}`);

console.log("");
console.log("catalog and placement coverage");
console.log(`- catalog entries: ${summary.catalogEntries}`);
console.log(`- decorator placements: ${summary.anchors}`);
console.log(`- linked ids: ${summary.linkedIds}`);
console.log(`- gap rows: ${summary.gaps}`);
console.log(`- unplaced catalog entries: ${summary.unplacedCatalogEntries}`);
console.log(`- placements without catalog: ${summary.placementsWithoutCatalog}`);
console.log(`- duplicate placement groups: ${summary.duplicatePlacementGroups}`);
console.log(`- multi-facet placement groups: ${summary.multiFacetPlacementGroups}`);
console.log(`- resolved framework targets: ${summary.resolvedFrameworkTargets}`);
console.log(`- ambiguous framework targets: ${summary.ambiguousFrameworkTargets}`);
console.log(`- unresolved framework targets: ${summary.unresolvedFrameworkTargets}`);
console.log(`- unadmitted framework packages: ${summary.unadmittedFrameworkPackages}`);

console.log("");
console.log("gap rows");
printEmptyRows(gaps, "no catalog, placement, or framework target gaps");
for (const gap of gaps) {
  console.log(`- ${gap.linkId}: ${gap.kind}`);
}

console.log("");
console.log("mirror rows without framework role evidence");
console.log(`- rows: ${noRoleEvidenceRollup?.linkCount ?? 0}`);
printEmptyRows(noRoleEvidence, "all resolved mirror rows have framework role evidence");
for (const row of noRoleEvidence) {
  console.log(`- ${mirrorRowLabel(row)}`);
}

console.log("");
console.log("mirror rows without emulation obligations");
console.log(`- rows: ${noObligationRollup?.linkCount ?? 0}`);
console.log(`- role evidence rows on those links: ${noObligationRollup?.roleEvidenceCount ?? 0}`);
for (const row of noObligations) {
  console.log(`- ${mirrorRowLabel(row)}`);
}
printCounts("role families without obligations", noObligationRollup?.roleFamilies ?? {}, 20);
printCounts("source lenses without obligations", noObligationRollup?.sourceLenses ?? {}, 20);
printCounts("product areas without obligations", noObligationRollup?.productAreas ?? {}, 20);
printCounts("relations without obligations", noObligationRollup?.relations ?? {}, 24);

console.log("");
console.log("usage comparison rollup");
console.log(`- link rows: ${usageDivergenceRollup?.linkCount ?? 0}`);
console.log(`- links with usage on both sides: ${usageDivergenceRollup?.linksWithBothUsage ?? 0}`);
console.log(`- framework-only links: ${usageDivergenceRollup?.linksWithFrameworkOnlyUsage ?? 0}`);
console.log(`- product-only links: ${usageDivergenceRollup?.linksWithProductOnlyUsage ?? 0}`);
console.log(`- member-divergent links: ${usageDivergenceRollup?.linksWithMemberDivergence ?? 0}`);
console.log(`- framework usage rows: ${usageDivergenceRollup?.frameworkUsageCount ?? 0}`);
console.log(`- product usage rows: ${usageDivergenceRollup?.productUsageCount ?? 0}`);

console.log("");
console.log("sample usage-divergent links");
printEmptyRows(usageDivergence, "no usage-divergent auLink rows");
for (const row of usageDivergence) {
  console.log(`- ${usageRowLabel(row)}`);
}

async function askBridge(
  projection: string,
): Promise<Answer<BridgeAuLinkValue> & { readonly value: BridgeAuLinkValue }> {
  const answer = await api.ask({
    lens: LensId.BridgeAuLink,
    locus: RepoRootLocus,
    projection,
  });
  assertHitAnswer<BridgeAuLinkValue>(
    `bridge.aulink ${projection}`,
    answer,
  );
  return answer;
}

async function askOptionalBridge(
  projection: string,
  filters: Readonly<Record<string, unknown>>,
  rows: number,
): Promise<Answer<BridgeAuLinkValue>> {
  const answer = await api.ask({
    lens: LensId.BridgeAuLink,
    locus: RepoRootLocus,
    projection,
    filters,
    budget: { rows, evidencePerSubject: 0 },
    page: { size: rows },
  });
  assertHitOrMissAnswer(`bridge.aulink ${projection}`, answer);
  return answer as Answer<BridgeAuLinkValue>;
}

async function timedAsk<TAnswer>(
  label: string,
  ask: () => Promise<TAnswer>,
): Promise<TAnswer> {
  const startedAt = performance.now();
  const answer = await ask();
  timings.push({ label, milliseconds: performance.now() - startedAt });
  return answer;
}

function mirrorRowLabel(row: AuLinkMirrorRow): string {
  return [
    row.linkId,
    `roles=${row.roleEvidenceCount}`,
    `obligations=${row.emulationObligationCount}`,
    `areas=${countKeys(row.productAreas).join(",") || "none"}`,
    `families=${countKeys(row.roleFamilies).join(",") || "none"}`,
  ].join(" ");
}

function usageRowLabel(row: AuLinkUsageComparisonSummaryRow): string {
  return [
    row.linkId,
    `framework=${row.frameworkUsageCount}`,
    `product=${row.productUsageCount}`,
    `sharedMembers=${row.sharedMemberNameCount}`,
    `frameworkOnlyMembers=${row.frameworkOnlyMemberNameCount}`,
    `productOnlyMembers=${row.productOnlyMemberNameCount}`,
  ].join(" ");
}

function countKeys(counts: Readonly<Record<string, number>>): readonly string[] {
  return Object.keys(counts).sort();
}

function timingSummary(
  rows: readonly { readonly label: string; readonly milliseconds: number }[],
): string {
  return rows
    .map((row) => `${row.label}=${row.milliseconds.toFixed(1)}ms`)
    .join("; ");
}
