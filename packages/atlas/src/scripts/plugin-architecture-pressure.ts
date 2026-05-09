import { LensId } from "../inquiry/lens.js";
import { LocusKind } from "../inquiry/locus.js";
import type {
  PluginArchitectureValue,
} from "../inquiry/runtime/plugin-architecture-lenses.js";
import { createApi } from "../session/index.js";
import { assertHitAnswer, printCounts } from "./script-output.js";

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const started = performance.now();
const summaryAnswer = await api.ask({
  lens: LensId.PluginArchitecture,
  locus: { kind: LocusKind.Repo },
  projection: "summary",
  budget: { rows: 0, evidencePerSubject: 0 },
});

assertHitAnswer<PluginArchitectureValue>(
  "plugin.architecture summary",
  summaryAnswer,
);

const rollup = summaryAnswer.value.rollup;

console.log("plugin.architecture pressure");
console.log("scope: public plugin package topology and source-surface mechanism rollups");
console.log(`request: ${(performance.now() - started).toFixed(1)}ms`);

console.log("");
console.log("plugin topology");
console.log(`- packages: ${rollup.packageCount}`);
console.log(`- source files: ${rollup.sourceFileCount}`);
console.log(`- surfaces: ${rollup.surfaceCount}`);
console.log(`- resources: ${rollup.resourceCount}`);
console.log(`- registries: ${rollup.registryCount}`);
console.log(`- DI registrations: ${rollup.diRegistrationCount}`);
console.log(`- AppTasks: ${rollup.appTaskCount}`);
console.log(`- resolve calls: ${rollup.resolveCallCount}`);
console.log(`- router integrations: ${rollup.routerIntegrationCount}`);
console.log(`- template references: ${rollup.templateReferenceCount}`);

printCounts("surface kinds", rollup.surfaceKinds);
printCounts("surface mechanisms", rollup.surfaceMechanisms, 20);
printCounts("bindable mechanisms", rollup.bindableMechanisms, 30);
printCounts("resource mechanisms", rollup.resourceMechanisms, 20);
printCounts("router mechanisms", rollup.routerMechanisms, 20);
printCounts("template reference mechanisms", rollup.templateReferenceMechanisms, 20);
