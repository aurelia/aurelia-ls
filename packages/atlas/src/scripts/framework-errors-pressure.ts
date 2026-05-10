import { LensId } from "../inquiry/lens.js";
import { LocusKind } from "../inquiry/locus.js";
import type { FrameworkErrorsValue } from "../inquiry/runtime/framework-error-lenses.js";
import { createApi } from "../session/index.js";
import { assertHitAnswer, printCounts } from "./script-output.js";

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
console.log(`- raw Error construction: ${rollup.rawNewErrorCount}`);
console.log(`- throw effects: ${rollup.thrownUsageCount}`);
console.log(`- warning effects: ${rollup.warningUsageCount}`);

printCounts("codes by package", rollup.codesByPackage, 30);
printCounts("codes by enum", rollup.codesByEnum, 10);
printCounts("codes by hundred", rollup.codesByHundred, 30);
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
