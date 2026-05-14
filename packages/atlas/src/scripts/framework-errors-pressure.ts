import { LensId } from "../inquiry/lens.js";
import { LocusKind } from "../inquiry/locus.js";
import type { FrameworkErrorsValue } from "../inquiry/runtime/framework-error-lenses.js";
import { createApi } from "../session/index.js";
import { answerValue, assertHitAnswer, assertHitOrMissAnswer, printCounts } from "./script-output.js";

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const started = performance.now();
const summaryAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "summary",
  budget: { rows: 10, evidencePerSubject: 0 },
});

assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors summary",
  summaryAnswer,
);

const rollup = summaryAnswer.value.rollup;
const sampleCodes = summaryAnswer.value.codes ?? [];
const unusedCodesAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "codes",
  filters: { gap: "unused-code" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const familiesAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "families",
  budget: { rows: 15, evidencePerSubject: 0 },
});
const diagnosticFrontiersAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "diagnostic-frontiers",
  budget: { rows: 15, evidencePerSubject: 0 },
});
const diagnosticCodesAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "diagnostic-codes",
  budget: { rows: 20, evidencePerSubject: 0 },
});
const rawErrorAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "usages",
  filters: { gap: "raw-new-error" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const rawErrorFactoryCallAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "usages",
  filters: { gap: "raw-error-factory-call" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const rawErrorAuthorityGapAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "usages",
  filters: { gap: "raw-error-authority-gap" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const intentionalRawAuthorityAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "usages",
  filters: { gap: "intentionally-unclaimed-raw-authority" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const queryBindingCodesAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "codes",
  filters: { query: "binding" },
  budget: { rows: 10, evidencePerSubject: 0 },
});
const semanticRuntimeReferencesAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "semantic-references",
  budget: { rows: 20, evidencePerSubject: 0 },
});
const semanticRuntimeRawReferencesAnswer = await api.ask({
  lens: LensId.FrameworkErrors,
  locus: { kind: LocusKind.Repo },
  projection: "semantic-raw-references",
  budget: { rows: 20, evidencePerSubject: 0 },
});

assertHitOrMissAnswer(
  "framework.errors unused codes",
  unusedCodesAnswer,
);
assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors families",
  familiesAnswer,
);
assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors diagnostic frontiers",
  diagnosticFrontiersAnswer,
);
assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors diagnostic codes",
  diagnosticCodesAnswer,
);
assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors raw errors",
  rawErrorAnswer,
);
assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors raw error factory calls",
  rawErrorFactoryCallAnswer,
);
assertHitOrMissAnswer(
  "framework.errors raw error authority gaps",
  rawErrorAuthorityGapAnswer,
);
assertHitOrMissAnswer(
  "framework.errors intentionally unclaimed raw authority",
  intentionalRawAuthorityAnswer,
);
assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors query binding codes",
  queryBindingCodesAnswer,
);
assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors semantic-runtime references",
  semanticRuntimeReferencesAnswer,
);
assertHitAnswer<FrameworkErrorsValue>(
  "framework.errors semantic-runtime raw references",
  semanticRuntimeRawReferencesAnswer,
);

const sampleUnusedCodes = answerValue<FrameworkErrorsValue>(unusedCodesAnswer)?.codes ?? [];
const sampleFamilies = familiesAnswer.value.families ?? [];
const sampleDiagnosticFrontiers = diagnosticFrontiersAnswer.value.diagnosticFrontiers ?? [];
const sampleDiagnosticCodes = diagnosticCodesAnswer.value.diagnosticCodes ?? [];
const sampleRawErrors = rawErrorAnswer.value.usages ?? [];
const sampleRawErrorFactoryCalls = rawErrorFactoryCallAnswer.value.usages ?? [];
const sampleRawErrorAuthorityGaps = answerValue<FrameworkErrorsValue>(rawErrorAuthorityGapAnswer)?.usages ?? [];
const sampleIntentionalRawAuthority = answerValue<FrameworkErrorsValue>(intentionalRawAuthorityAnswer)?.usages ?? [];
const sampleQueryBindingCodes = queryBindingCodesAnswer.value.codes ?? [];
const sampleSemanticRuntimeReferences = semanticRuntimeReferencesAnswer.value.semanticRuntimeReferences ?? [];
const sampleSemanticRuntimeRawReferences = semanticRuntimeRawReferencesAnswer.value.semanticRuntimeRawReferences ?? [];

const dispositionCount = (disposition: string): number =>
  rollup.diagnosticCodeDispositions[disposition] ?? 0;
const activeMappedDiagnosticGapCount =
  dispositionCount("broken-exact-link") +
  dispositionCount("raw-authority-gap") +
  dispositionCount("declared-unspent") +
  dispositionCount("unmodeled-used-framework-authority");

if (sampleQueryBindingCodes.length === 0) {
  throw new Error("framework.errors query binding codes returned no rows.");
}
if (sampleSemanticRuntimeReferences.length === 0) {
  throw new Error("framework.errors semantic-runtime references returned no rows.");
}

console.log("framework.errors pressure");
console.log("scope: Aurelia framework error/event code definitions, mapped messages, and usage mechanisms");
console.log(`request: ${(performance.now() - started).toFixed(1)}ms`);

console.log("");
console.log("error topology");
console.log(`- packages: ${rollup.packageCount}`);
console.log(`- source files: ${rollup.sourceFileCount}`);
console.log(`- codes: ${rollup.codeCount}`);
console.log(`- mapped messages: ${rollup.messageCount}`);
console.log(`- usage sites: ${rollup.usageCount}`);
console.log(`- createMappedError usage: ${rollup.createMappedErrorUsageCount}`);
console.log(`- getMessage usage: ${rollup.getMessageUsageCount}`);
console.log(`- mapped error wrapper calls: ${rollup.mappedErrorWrapperCallCount}`);
console.log(`- raw Error construction: ${rollup.rawNewErrorCount}`);
console.log(`- raw Error factory calls: ${rollup.rawErrorFactoryCallCount}`);
console.log(`- raw Error usage sites: ${rollup.rawErrorUsageCount}`);
console.log(`- raw Error authority gaps: ${rollup.rawErrorAuthorityGapCount}`);
console.log(`- intentionally unclaimed raw Error authority: ${rollup.intentionallyUnclaimedRawAuthorityCount}`);
console.log(`- active mapped diagnostic gaps: ${activeMappedDiagnosticGapCount}`);
console.log(`- hard-coded raw AUR labels: ${rollup.inlineRawCodeUsageCount}`);
console.log(`- codes without mapped message: ${rollup.codeWithoutMessageCount}`);
console.log(`- codes without usage: ${rollup.unusedCodeCount}`);
console.log(`- usages with unresolved code definition: ${rollup.unresolvedUsageCodeCount}`);
console.log(`- duplicate AUR labels across framework definitions: ${rollup.duplicateCodeLabelCount}`);
console.log(`- error families sampled: ${sampleFamilies.length}`);
console.log(`- diagnostic frontiers sampled: ${sampleDiagnosticFrontiers.length}`);
console.log(`- diagnostic code intake rows sampled: ${sampleDiagnosticCodes.length}`);
console.log(`- query 'binding' code rows sampled: ${sampleQueryBindingCodes.length}`);
console.log(`- semantic-runtime AUR references: ${rollup.semanticRuntimeCodeReferenceCount}`);
console.log(`- semantic-runtime used AUR references: ${rollup.semanticRuntimeUsedCodeReferenceCount}`);
console.log(`- semantic-runtime unused AUR references: ${rollup.semanticRuntimeUnusedCodeReferenceCount}`);
console.log(`- semantic-runtime raw Error references: ${rollup.semanticRuntimeRawReferenceCount}`);
console.log(`- semantic-runtime used raw Error references: ${rollup.semanticRuntimeUsedRawReferenceCount}`);
console.log(`- unresolved semantic-runtime raw Error references: ${rollup.semanticRuntimeUnresolvedRawReferenceCount}`);
console.log(`- semantic-runtime ambiguous AUR label references: ${rollup.semanticRuntimeAmbiguousLabelReferenceCount}`);
console.log(`- unresolved semantic-runtime AUR references: ${rollup.semanticRuntimeUnresolvedCodeReferenceCount}`);
console.log(`- unresolved exact semantic-runtime AUR links: ${rollup.semanticRuntimeUnresolvedExactReferenceCount}`);
console.log(`- throw effects: ${rollup.thrownUsageCount}`);
console.log(`- warning effects: ${rollup.warningUsageCount}`);

printCounts("codes by package", rollup.codesByPackage, 30);
printCounts("codes by enum", rollup.codesByEnum, 10);
printCounts("codes by hundred", rollup.codesByHundred, 30);
printCounts("codes by name prefix", rollup.codesByNamePrefix, 30);
printCounts("duplicate AUR labels across framework definitions", rollup.duplicateCodeLabels, 30);
printCounts("codes without mapped message by package", rollup.codesWithoutMessageByPackage, 30);
printCounts("codes without usage by package", rollup.unusedCodesByPackage, 30);
printCounts("codes without usage by name prefix", rollup.unusedCodesByNamePrefix, 30);
printCounts("usages with unresolved code definition by package", rollup.unresolvedUsageCodesByPackage, 30);
printCounts("raw Error construction by package", rollup.rawNewErrorsByPackage, 30);
printCounts("raw Error factory calls by package", rollup.rawErrorFactoryCallsByPackage, 30);
printCounts("raw Error usages by package", rollup.rawErrorUsagesByPackage, 30);
printCounts("raw Error usages by kind", rollup.rawErrorUsagesByKind, 10);
printCounts("raw Error usages by package/kind", rollup.rawErrorUsagesByPackageAndKind, 30);
printCounts("raw Error authority gaps by package", rollup.rawErrorAuthorityGapsByPackage, 30);
printCounts("raw Error authority gaps by kind", rollup.rawErrorAuthorityGapsByKind, 10);
printCounts("intentionally unclaimed raw Error authority by package", rollup.intentionallyUnclaimedRawAuthorityByPackage, 30);
printCounts("intentionally unclaimed raw Error authority by kind", rollup.intentionallyUnclaimedRawAuthorityByKind, 10);
printCounts("hard-coded raw AUR labels", rollup.inlineRawCodeLabels, 30);
printCounts("hard-coded raw AUR labels by package", rollup.inlineRawCodeLabelsByPackage, 30);
printCounts("semantic-runtime raw Error references by framework package", rollup.semanticRuntimeRawReferencesByFrameworkPackage, 30);
printCounts("unresolved semantic-runtime raw Error references by framework package", rollup.semanticRuntimeUnresolvedRawReferencesByFrameworkPackage, 30);
printCounts("diagnostic code dispositions", rollup.diagnosticCodeDispositions, 20);
printCounts("semantic-runtime AUR references by code", rollup.semanticRuntimeCodeReferencesByCode, 30);
printCounts("semantic-runtime AUR references by kind", rollup.semanticRuntimeCodeReferencesByKind, 10);
printCounts("semantic-runtime AUR references by framework package", rollup.semanticRuntimeCodeReferencesByFrameworkPackage, 30);
printCounts("semantic-runtime ambiguous AUR label references by code", rollup.semanticRuntimeAmbiguousLabelReferencesByCode, 30);
printCounts("unresolved semantic-runtime AUR references by code", rollup.semanticRuntimeUnresolvedCodeReferencesByCode, 30);
printCounts("unresolved exact semantic-runtime AUR links by code", rollup.semanticRuntimeUnresolvedExactReferencesByCode, 30);
printCounts("usages by package", rollup.usagesByPackage, 30);
printCounts("usage mechanisms", rollup.usageMechanisms, 10);
printCounts("usage effects", rollup.usageEffects, 10);

console.log("");
console.log("sample code rows");
if (sampleCodes.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleCodes) {
    console.log(`- ${row.packageId} ${row.enumName}.${row.name} ${row.codeLabel} usage=${row.usageCount}`);
  }
}

console.log("");
console.log("sample family rows");
if (sampleFamilies.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleFamilies) {
    console.log(`- ${row.packageId} ${row.enumName}.${row.namePrefix}* codes=${row.codeCount} usages=${row.usageCount} unused=${row.unusedCodeCount} score=${row.pressureScore}`);
  }
}

console.log("");
console.log("sample diagnostic frontier rows");
if (sampleDiagnosticFrontiers.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleDiagnosticFrontiers) {
    const owner = row.likelySemanticRuntimeOwner == null ? "" : ` owner=${row.likelySemanticRuntimeOwner}`;
    console.log(`- ${row.packageId} ${row.enumName}.${row.namePrefix}* score=${row.frontierScore} coverage=${row.semanticRuntimeCoverage} usedExact=${row.semanticRuntimeLinkedCodeCount}/${row.codeCount} declaredExact=${row.semanticRuntimeExactReferenceCount} intentional=${row.intentionalUnclaimedCodeCount} futureSubstrate=${row.intentionalUnclaimedFutureSubstrateCodeCount} runtimeBoundary=${row.intentionalUnclaimedRuntimeBoundaryCodeCount} dormant=${row.dormantCodeCount} actionable=${row.actionableUncoveredCodeCount} rawGaps=${row.rawAuthorityGapCount}${owner} next=${row.recommendedNextStep}`);
  }
}

console.log("");
console.log("sample diagnostic code rows");
if (sampleDiagnosticCodes.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleDiagnosticCodes) {
    const owner = row.likelySemanticRuntimeOwner == null ? "" : ` owner=${row.likelySemanticRuntimeOwner}`;
    console.log(`- ${row.packageId} ${row.enumName}.${row.name} ${row.codeLabel}; disposition=${row.diagnosticDisposition}; score=${row.diagnosticScore}; usages=${row.usageCount}; usedExact=${row.semanticRuntimeUsedExactReferenceCount}; declaredExact=${row.semanticRuntimeExactReferenceCount}; rawGaps=${row.rawAuthorityGapCount}${owner} next=${row.recommendedNextStep}`);
  }
}

console.log("");
console.log("sample unused code rows");
if (sampleUnusedCodes.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleUnusedCodes) {
    console.log(`- ${row.packageId} ${row.enumName}.${row.name} ${row.codeLabel}`);
  }
}

console.log("");
console.log("sample raw Error rows");
if (sampleRawErrors.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleRawErrors) {
    console.log(`- ${row.packageId} kind=${row.rawErrorKind ?? "none"} effect=${row.effect} code=${row.inlineCodeLabel ?? row.codeLabel ?? "none"} expression=${row.expressionText}`);
  }
}

console.log("");
console.log("sample raw Error factory call rows");
if (sampleRawErrorFactoryCalls.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleRawErrorFactoryCalls) {
    console.log(`- ${row.packageId} kind=${row.rawErrorKind ?? "none"} effect=${row.effect} code=${row.inlineCodeLabel ?? "none"} expression=${row.expressionText}`);
  }
}

console.log("");
console.log("sample raw Error authority gap rows");
if (sampleRawErrorAuthorityGaps.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleRawErrorAuthorityGaps) {
    console.log(`- ${row.packageId} mechanism=${row.mechanism} kind=${row.rawErrorKind ?? "none"} effect=${row.effect} code=${row.inlineCodeLabel ?? "none"} expression=${row.expressionText}`);
  }
}

console.log("");
console.log("sample intentionally unclaimed raw Error authority rows");
if (sampleIntentionalRawAuthority.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleIntentionalRawAuthority) {
    console.log(`- ${row.packageId} mechanism=${row.mechanism} kind=${row.rawErrorKind ?? "none"} effect=${row.effect} expression=${row.expressionText} reason=${row.intentionalUnclaimedRawAuthorityReason ?? "none"}`);
  }
}

console.log("");
console.log("sample semantic-runtime AUR reference rows");
if (sampleSemanticRuntimeReferences.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleSemanticRuntimeReferences) {
    const target = row.frameworkPackageId == null
      ? "unlinked"
      : `${row.frameworkPackageId} ${row.frameworkEnumName}.${row.frameworkCodeName}`;
    console.log(`- ${row.codeLabel} kind=${row.referenceKind} target=${target} exact=${row.resolvedExactDefinitionCount} labels=${row.resolvedDefinitionCount} uses=${row.semanticRuntimeUseCount} source=${row.filePath}`);
  }
}

console.log("");
console.log("sample semantic-runtime raw Error reference rows");
if (sampleSemanticRuntimeRawReferences.length === 0) {
  console.log("- none");
} else {
  for (const row of sampleSemanticRuntimeRawReferences) {
    console.log(`- ${row.frameworkPackageId} mechanism=${row.mechanism} effect=${row.effect} exact=${row.resolvedUsageCount} uses=${row.semanticRuntimeUseCount} framework=${row.frameworkSourceFilePath}:${row.frameworkSourceStartLine} source=${row.filePath}`);
  }
}
