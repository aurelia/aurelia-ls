import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkErrorsValue } from "../inquiry/runtime/framework-error-lenses.js";
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
  ...scriptOptionalStringFilter("enumName"),
  ...scriptOptionalStringFilter("codeNamePrefix"),
  ...scriptOptionalStringFilter("mechanism"),
  ...scriptOptionalStringFilter("effect"),
  ...scriptOptionalStringFilter("rawErrorKind"),
  ...scriptOptionalStringFilter("inlineCodeLabel"),
  ...scriptOptionalStringFilter("disposition"),
  ...scriptOptionalStringFilter("gap"),
  ...scriptOptionalStringFilter("query"),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const answer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 2 : 0 },
});

assertHitOrMissAnswer(`framework.errors:${projection}`, answer);
const value = answerValue<FrameworkErrorsValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "framework.errors",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("framework.errors");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
console.log(answer.summary);

if (value?.rollup !== undefined) {
  printRollup(value, detail);
}

printPackageRows(value, displayRowLimit);
printFamilyRows(value, displayRowLimit, detail);
printDiagnosticFrontierRows(value, displayRowLimit, detail);
printDiagnosticCodeRows(value, displayRowLimit, detail);
printCodeRows(value, displayRowLimit, detail);
printUsageRows(value, displayRowLimit, detail);
printSemanticReferenceRows(value, displayRowLimit, detail);
printSemanticRawReferenceRows(value, displayRowLimit, detail);

function printRollup(
  value: FrameworkErrorsValue,
  includeCounts: boolean,
): void {
  const rollup = value.rollup;
  console.log("");
  console.log("rollup");
  console.log(`- packages: ${rollup.packageCount}`);
  console.log(`- codes: ${rollup.codeCount}`);
  console.log(`- mapped messages: ${rollup.messageCount}`);
  console.log(`- usage sites: ${rollup.usageCount}`);
  console.log(`- raw Error authority gaps: ${rollup.rawErrorAuthorityGapCount}`);
  console.log(`- intentionally unclaimed raw Error authority: ${rollup.intentionallyUnclaimedRawAuthorityCount}`);
  console.log(`- semantic-runtime references: ${rollup.semanticRuntimeCodeReferenceCount}`);
  console.log(`- semantic-runtime used references: ${rollup.semanticRuntimeUsedCodeReferenceCount}`);
  console.log(`- semantic-runtime raw Error references: ${rollup.semanticRuntimeRawReferenceCount}`);
  console.log(`- semantic-runtime used raw Error references: ${rollup.semanticRuntimeUsedRawReferenceCount}`);
  console.log(`- unresolved semantic-runtime raw Error references: ${rollup.semanticRuntimeUnresolvedRawReferenceCount}`);
  console.log(`- unresolved exact semantic-runtime links: ${rollup.semanticRuntimeUnresolvedExactReferenceCount}`);
  printCounts("diagnostic code dispositions", rollup.diagnosticCodeDispositions, 20);
  if (!includeCounts) {
    return;
  }
  printCounts("codes by package", rollup.codesByPackage, 30);
  printCounts("codes by name prefix", rollup.codesByNamePrefix, 30);
  printCounts("usages by package", rollup.usagesByPackage, 30);
  printCounts("usage mechanisms", rollup.usageMechanisms, 20);
  printCounts("raw Error authority gaps by package", rollup.rawErrorAuthorityGapsByPackage, 30);
  printCounts("intentionally unclaimed raw Error authority by package", rollup.intentionallyUnclaimedRawAuthorityByPackage, 30);
  printCounts("semantic-runtime references by framework package", rollup.semanticRuntimeCodeReferencesByFrameworkPackage, 30);
  printCounts("semantic-runtime raw Error references by framework package", rollup.semanticRuntimeRawReferencesByFrameworkPackage, 30);
  printCounts("unresolved semantic-runtime raw Error references by framework package", rollup.semanticRuntimeUnresolvedRawReferencesByFrameworkPackage, 30);
}

function printPackageRows(
  value: FrameworkErrorsValue | undefined,
  limit: number,
): void {
  const rows = value?.packages ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("packages");
  printEmptyRows(rows, "no framework error package rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.id}; codes=${row.codeCount}; usages=${row.usageCount}; rawErrors=${row.rawNewErrorCount}; thrown=${row.thrownUsageCount}; ${row.packageName}`,
    );
  }
}

function printFamilyRows(
  value: FrameworkErrorsValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.families ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("families");
  printEmptyRows(rows, "no framework error family rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId} ${row.enumName}.${row.namePrefix}*; score=${row.pressureScore}; codes=${row.codeCount}; usages=${row.usageCount}; unused=${row.unusedCodeCount}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  codes=${row.codeNames.join(", ")}`);
    }
  }
}

function printDiagnosticFrontierRows(
  value: FrameworkErrorsValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.diagnosticFrontiers ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("diagnostic frontiers");
  printEmptyRows(rows, "no framework diagnostic frontier rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId} ${row.enumName}.${row.namePrefix}*; score=${row.frontierScore}; coverage=${row.semanticRuntimeCoverage}; usedExact=${row.semanticRuntimeLinkedCodeCount}/${row.codeCount}; declaredExact=${row.semanticRuntimeExactReferenceCount}; intentional=${row.intentionalUnclaimedCodeCount}; futureSubstrate=${row.intentionalUnclaimedFutureSubstrateCodeCount}; runtimeBoundary=${row.intentionalUnclaimedRuntimeBoundaryCodeCount}; dormant=${row.dormantCodeCount}; actionable=${row.actionableUncoveredCodeCount}; rawGaps=${row.rawAuthorityGapCount}; ${sourceLabel(row)}`,
    );
    console.log(`  next=${row.recommendedNextStep}`);
    if (includeDetail) {
      if (row.likelySemanticRuntimeOwner != null) {
        console.log(`  owner=${row.likelySemanticRuntimeOwner}`);
      }
      console.log(`  codes=${row.codeNames.join(", ")}`);
      if (row.rawAuthorityGapSummaries.length > 0) {
        console.log(`  rawGaps=${row.rawAuthorityGapSummaries.join(" | ")}`);
      }
      if (row.intentionalUnclaimedSummaries.length > 0) {
        console.log(`  intentional=${row.intentionalUnclaimedSummaries.join(" | ")}`);
      }
      if (row.intentionalUnclaimedFutureSubstrateSummaries.length > 0) {
        console.log(`  futureSubstrate=${row.intentionalUnclaimedFutureSubstrateSummaries.join(" | ")}`);
      }
      if (row.dormantCodeSummaries.length > 0) {
        console.log(`  dormant=${row.dormantCodeSummaries.join(" | ")}`);
      }
    }
  }
}

function printDiagnosticCodeRows(
  value: FrameworkErrorsValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.diagnosticCodes ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("diagnostic codes");
  printEmptyRows(rows, "no framework diagnostic code rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId} ${row.enumName}.${row.name} ${row.codeLabel}; disposition=${row.diagnosticDisposition}; score=${row.diagnosticScore}; usages=${row.usageCount}; usedExact=${row.semanticRuntimeUsedExactReferenceCount}; declaredExact=${row.semanticRuntimeExactReferenceCount}; rawGaps=${row.rawAuthorityGapCount}; ${sourceLabel(row)}`,
    );
    console.log(`  next=${row.recommendedNextStep}`);
    if (includeDetail) {
      if (row.likelySemanticRuntimeOwner != null) {
        console.log(`  owner=${row.likelySemanticRuntimeOwner}`);
      }
      if (row.usageMechanisms.length > 0) {
        console.log(`  mechanisms=${row.usageMechanisms.join(", ")} effects=${row.usageEffects.join(", ")}`);
      }
      if (row.message != null) {
        console.log(`  ${row.message}`);
      }
      if (row.intentionalUnclaimedReason != null) {
        console.log(`  intentional=${row.intentionalUnclaimedKind ?? "unclassified"}: ${row.intentionalUnclaimedReason}`);
      }
    }
  }
}

function printCodeRows(
  value: FrameworkErrorsValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.codes ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("codes");
  printEmptyRows(rows, "no framework error code rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packageId} ${row.enumName}.${row.name} ${row.codeLabel}; usages=${row.usageCount}; thrown=${row.thrownUsageCount}; ${sourceLabel(row)}`,
    );
    if (includeDetail && row.message != null) {
      console.log(`  ${row.message}`);
    }
  }
}

function printUsageRows(
  value: FrameworkErrorsValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.usages ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("usages");
  printEmptyRows(rows, "no framework error usage rows returned");
  for (const row of rows.slice(0, limit)) {
    const code = row.codeLabel ?? row.inlineCodeLabel ?? "none";
    const target = row.codeName == null ? "raw" : `${row.enumName}.${row.codeName}`;
    console.log(
      `- ${row.packageId} ${target} ${code}; mechanism=${row.mechanism}; effect=${row.effect}; raw=${row.rawErrorKind ?? "none"}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.expressionText}`);
      if (row.intentionalUnclaimedRawAuthorityReason != null) {
        console.log(`  intentional=${row.intentionalUnclaimedRawAuthorityReason}`);
      }
    }
  }
}

function printSemanticReferenceRows(
  value: FrameworkErrorsValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.semanticRuntimeReferences ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("semantic-runtime references");
  printEmptyRows(rows, "no semantic-runtime framework error references returned");
  for (const row of rows.slice(0, limit)) {
    const target = row.frameworkPackageId == null
      ? "unlinked"
      : `${row.frameworkPackageId} ${row.frameworkEnumName}.${row.frameworkCodeName}`;
    console.log(
      `- ${row.codeLabel}; kind=${row.referenceKind}; target=${target}; exact=${row.resolvedExactDefinitionCount}; labels=${row.resolvedDefinitionCount}; uses=${row.semanticRuntimeUseCount}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.summary}`);
    }
  }
}

function printSemanticRawReferenceRows(
  value: FrameworkErrorsValue | undefined,
  limit: number,
  includeDetail: boolean,
): void {
  const rows = value?.semanticRuntimeRawReferences ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("semantic-runtime raw Error references");
  printEmptyRows(rows, "no semantic-runtime raw framework Error references returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.frameworkPackageId}; mechanism=${row.mechanism}; effect=${row.effect}; exact=${row.resolvedUsageCount}; uses=${row.semanticRuntimeUseCount}; framework=${row.frameworkSourceFilePath}:${row.frameworkSourceStartLine}; ${sourceLabel(row)}`,
    );
    if (includeDetail) {
      console.log(`  ${row.expressionText}`);
    }
  }
}
