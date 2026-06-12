import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { BridgeAuLinkValue } from "../inquiry/runtime/bridge-lenses.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  printCounts,
  printEmptyRows,
  scriptArgumentValue,
  scriptNumberArgumentValue,
  scriptOptionalBooleanFilter,
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
  ...scriptOptionalStringFilter("linkId"),
  ...scriptOptionalStringFilter("packageId"),
  ...scriptOptionalStringFilter("targetName"),
  ...scriptOptionalStringFilter("symbolName"),
  ...scriptOptionalStringFilter("frameworkSymbol"),
  ...scriptOptionalStringFilter("filePath"),
  ...scriptOptionalStringFilter("frameworkStatus"),
  ...scriptOptionalStringFilter("roleFamily"),
  ...scriptOptionalStringFilter("relation"),
  ...scriptOptionalStringFilter("sourceLens"),
  ...scriptOptionalStringFilter("sourceProjection"),
  ...scriptOptionalStringFilter("emulationLayer"),
  ...scriptOptionalStringFilter("emulationMode"),
  ...scriptOptionalStringFilter("obligationKind"),
  ...scriptOptionalStringFilter("productArea"),
  ...scriptOptionalStringFilter("productDeclarationKind"),
  ...scriptOptionalBooleanFilter("hasRoleEvidence"),
  ...scriptOptionalBooleanFilter("hasEmulationObligations"),
  ...scriptOptionalStringFilter("side"),
  ...scriptOptionalStringFilter("memberName"),
  ...scriptOptionalStringFilter("memberAccess"),
  ...scriptOptionalStringFilter("frameworkScopeMode"),
  ...scriptOptionalStringFilter("frameworkMemberAccess"),
  ...scriptOptionalStringFilter("productMemberAccess"),
  ...scriptOptionalStringFilter("memberDeclarationKind"),
  ...scriptOptionalStringFilter("presence"),
  ...scriptOptionalStringFilter("ownerName"),
  ...scriptOptionalStringFilter("ownerKind"),
  ...scriptOptionalStringFilter("ownerMemberName"),
  ...scriptOptionalStringFilter("usageRole"),
  ...scriptOptionalStringFilter("callCalleeName"),
  ...scriptOptionalStringFilter("callArgumentText"),
  ...scriptOptionalStringFilter("callArgumentSymbolName"),
  ...scriptOptionalStringFilter("callArgumentFullyQualifiedName"),
  ...scriptOptionalStringFilter("query"),
  ...scriptOptionalStringFilter("orderBy"),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const answer = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 3 : 0 },
});

assertHitOrMissAnswer(`bridge.aulink:${projection}`, answer);
const value = answerValue<BridgeAuLinkValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "bridge.aulink",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("bridge.aulink");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
console.log(answer.summary);

if (value?.rollup !== undefined) {
  printAuLinkRollup(value, detail);
}
if (value?.mirrorRollup !== undefined) {
  printMirrorRollup(value, detail);
}
if (value?.usageComparisonRollup !== undefined) {
  printUsageRollup(value, detail);
}

printCatalogRows(value, displayRowLimit);
printAnchorRows(value, displayRowLimit);
printTargetRows(value, displayRowLimit, detail);
printGapRows(value, displayRowLimit);
printMirrorRows(value, displayRowLimit, detail);
printRoleEvidenceRows(value, displayRowLimit, detail);
printObligationRows(value, displayRowLimit, detail);
printUsageComparisonRows(value, displayRowLimit, detail);
printMemberSurfaceRows(value, displayRowLimit, detail);
printUsageMemberRows(value, displayRowLimit, detail);
printUsageSiteRows(value, displayRowLimit, detail);
printUsageConsumerRows(value, displayRowLimit, detail);

function printAuLinkRollup(
  value: BridgeAuLinkValue,
  includeCounts: boolean,
): void {
  const rollup = value.rollup;
  console.log("");
  console.log("auLink rollup");
  console.log(`- catalog entries: ${rollup.catalogEntries}`);
  console.log(`- anchors: ${rollup.anchors}`);
  console.log(`- linked ids: ${rollup.linkedIds}`);
  console.log(`- gap rows: ${rollup.gaps}`);
  console.log(`- resolved framework targets: ${rollup.resolvedFrameworkTargets}`);
  console.log(`- ambiguous framework targets: ${rollup.ambiguousFrameworkTargets}`);
  console.log(`- unresolved framework targets: ${rollup.unresolvedFrameworkTargets}`);
  console.log(`- unadmitted framework packages: ${rollup.unadmittedFrameworkPackages}`);
  console.log(`- duplicate placement groups: ${rollup.duplicatePlacementGroups}`);
  console.log(`- multi-facet placement groups: ${rollup.multiFacetPlacementGroups}`);
  if (includeCounts) {
    printCounts(
      "packages",
      Object.fromEntries(
        rollup.packages.map((row) => [
          row.packageId,
          row.catalogEntries + row.anchors,
        ]),
      ),
      40,
    );
  }
}

function printMirrorRollup(
  value: BridgeAuLinkValue,
  includeCounts: boolean,
): void {
  const rollup = value.mirrorRollup!;
  console.log("");
  console.log("mirror rollup");
  console.log(`- link rows: ${rollup.linkCount}`);
  console.log(`- placed links: ${rollup.placedLinkCount}`);
  console.log(`- resolved targets: ${rollup.resolvedTargetCount}`);
  console.log(`- links with role evidence: ${rollup.linksWithRoleEvidence}`);
  console.log(`- links without role evidence: ${rollup.linksWithoutRoleEvidence}`);
  console.log(`- role evidence rows: ${rollup.roleEvidenceCount}`);
  console.log(`- links with emulation obligations: ${rollup.linksWithEmulationObligations}`);
  console.log(`- links without emulation obligations: ${rollup.linksWithoutEmulationObligations}`);
  console.log(`- emulation obligation rows: ${rollup.emulationObligationCount}`);
  if (!includeCounts) {
    return;
  }
  printCounts("role families", rollup.roleFamilies, 30);
  printCounts("relations", rollup.relations, 30);
  printCounts("source lenses", rollup.sourceLenses, 30);
  printCounts("emulation modes", rollup.emulationModes, 30);
  printCounts("obligation kinds", rollup.obligationKinds, 30);
  printCounts("product areas", rollup.productAreas, 30);
}

function printUsageRollup(
  value: BridgeAuLinkValue,
  includeCounts: boolean,
): void {
  const rollup = value.usageComparisonRollup!;
  console.log("");
  console.log("usage rollup");
  console.log(`- link rows: ${rollup.linkCount}`);
  console.log(`- links with both usage: ${rollup.linksWithBothUsage}`);
  console.log(`- framework-only links: ${rollup.linksWithFrameworkOnlyUsage}`);
  console.log(`- product-only links: ${rollup.linksWithProductOnlyUsage}`);
  console.log(`- links with member divergence: ${rollup.linksWithMemberDivergence}`);
  console.log(`- framework usage rows: ${rollup.frameworkUsageCount}`);
  console.log(`- product usage rows: ${rollup.productUsageCount}`);
  if (!includeCounts) {
    return;
  }
  printCounts("framework consumer packages", rollup.packages, 30);
  printCounts("product consumer areas", rollup.productAreas, 30);
  printCounts("framework usage roles", rollup.frameworkUsageRoles, 30);
  printCounts("product usage roles", rollup.productUsageRoles, 30);
}

function printCatalogRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
): void {
  const rows = value?.catalog ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("catalog");
  printEmptyRows(rows, "no auLink catalog rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(`- ${row.linkId}; target=${row.frameworkTarget.status}; ${row.file.repoPath}:${row.span.startLine}`);
  }
}

function printAnchorRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
): void {
  const rows = value?.anchors ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("anchors");
  printEmptyRows(rows, "no auLink anchor rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.linkId}; ${row.target.kind} ${row.target.name ?? "<anonymous>"}; facet=${row.facet ?? "<none>"}; target=${row.frameworkTarget.status}; ${row.target.file.repoPath}:${row.target.span.startLine}`,
    );
  }
}

function printTargetRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.targets ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("targets");
  printEmptyRows(rows, "no auLink framework target rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.linkId}; status=${row.status}; candidates=${row.candidateCount}; composition=${row.compositionKind}; type=${row.typeCandidateCount}; value=${row.valueCandidateCount}`,
    );
    if (includeDetail) {
      for (const candidate of row.candidates.slice(0, 5)) {
        console.log(`  - ${candidate.kind} ${candidate.symbolName}; ${candidate.file.repoPath}:${candidate.span.startLine}`);
      }
    }
  }
}

function printGapRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
): void {
  const rows = value?.gaps ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("gaps");
  printEmptyRows(rows, "no auLink gap rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(`- ${row.kind}; ${row.linkId}; count=${row.count}; facet=${row.facet ?? "<none>"}; target=${row.frameworkTarget.status}`);
  }
}

function printMirrorRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.mirror ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("mirror");
  printEmptyRows(rows, "no auLink mirror rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.linkId}; target=${row.targetStatus}; placements=${row.placementCount}; roleEvidence=${row.roleEvidenceCount}; obligations=${row.emulationObligationCount}; productAreas=${recordKeys(row.productAreas)}; ${sourceLabel({ source: row.firstProductSource ?? row.firstFrameworkSource })}`,
    );
    if (includeDetail) {
      console.log(`  roles=${recordKeys(row.roleFamilies)} relations=${recordKeys(row.relations)}`);
      console.log(`  obligations=${recordKeys(row.obligationKinds)} modes=${recordKeys(row.emulationModes)}`);
    }
  }
}

function printRoleEvidenceRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.roleEvidence ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("role evidence");
  printEmptyRows(rows, "no auLink role evidence rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.linkId}; ${row.roleFamily}/${row.relation}; ${row.from.kind}:${row.from.name} -> ${row.to.kind}:${row.to.name}; lens=${row.sourceLens}:${row.sourceProjection}; match=${row.matchKind}/${row.matchedEndpoint}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printObligationRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.obligations ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("obligations");
  printEmptyRows(rows, "no auLink obligation rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.linkId}; ${row.layer}/${row.mode}; kind=${row.obligationKind}; owner=${row.ownerName}; target=${row.targetName}; closure=${row.closure}; lens=${row.sourceLens}:${row.sourceProjection}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printUsageComparisonRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.usageComparison ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("usage comparison");
  printEmptyRows(rows, "no auLink usage comparison rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.linkId}; framework=${row.frameworkUsageCount}/${row.frameworkMemberUsageCount}; product=${row.productUsageCount}/${row.productMemberUsageCount}; sharedMembers=${row.sharedMemberNameCount}; frameworkOnly=${row.frameworkOnlyMemberNameCount}; productOnly=${row.productOnlyMemberNameCount}; ${sourceLabel({ source: row.firstProductSource ?? row.firstFrameworkSource })}`,
    );
    if (includeDetail) {
      console.log(`  framework subjects=${row.frameworkSubjectNames.join(", ") || "<none>"}`);
      console.log(`  product targets=${row.productTargetNames.join(", ") || "<none>"}`);
      console.log(`  ${row.summary}`);
    }
  }
}

function printMemberSurfaceRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.memberSurface ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("member surface");
  printEmptyRows(rows, "no auLink member surface rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.linkId}.${row.memberName}; presence=${row.presence}; declarations=${row.frameworkDeclarationCount}/${row.productDeclarationCount}; usage=${row.frameworkUsageCount}/${row.productUsageCount}; ${sourceLabel({ source: row.firstProductSource ?? row.firstFrameworkSource })}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printUsageMemberRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.usageMembers ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("usage members");
  printEmptyRows(rows, "no auLink usage member rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.linkId}.${row.memberName}; presence=${row.presence}; usage=${row.frameworkUsageCount}/${row.productUsageCount}; ${sourceLabel({ source: row.firstProductSource ?? row.firstFrameworkSource })}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printUsageSiteRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.usageSites ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("usage sites");
  printEmptyRows(rows, "no auLink usage site rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.side} ${row.linkId}${row.memberName === undefined ? "" : `.${row.memberName}`}; role=${row.role}; owner=${row.owner.ownerName ?? "<none>"}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.text}`);
    }
  }
}

function printUsageConsumerRows(
  value: BridgeAuLinkValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.usageConsumers ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("usage consumers");
  printEmptyRows(rows, "no auLink usage consumer rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.side} ${row.linkId}${row.memberName === undefined ? "" : `.${row.memberName}`}; owner=${row.ownerKind}:${row.ownerName}${row.ownerMemberName === undefined ? "" : `.${row.ownerMemberName}`}; usage=${row.usageCount}; ${sourceLabel({ source: row.firstSource })}`,
    );
    if (includeDetail) {
      console.log(`  roles=${recordKeys(row.usageRoles)} calls=${recordKeys(row.callCalleeNames)}`);
    }
  }
}

function recordKeys(record: Readonly<Record<string, number>>): string {
  const entries = Object.entries(record)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return entries.length === 0
    ? "<none>"
    : entries.map(([key, count]) => `${key}:${count}`).join(", ");
}
