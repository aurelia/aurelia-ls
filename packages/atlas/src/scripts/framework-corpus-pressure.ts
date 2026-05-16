import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkCorpusValue } from "../inquiry/runtime/framework-corpus-lenses.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  printCounts,
} from "./script-output.js";

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 120_000 });

const summaryAnswer = await askCorpus("summary", { rows: 8, evidencePerSubject: 2 });
const docSnippetAnswer = await askCorpus("doc-snippets", { rows: 12, evidencePerSubject: 0 });
const testSnippetAnswer = await askCorpus("test-snippets", { rows: 12, evidencePerSubject: 0 });
const fixtureSeedAnswer = await askCorpus("fixture-seeds", { rows: 12, evidencePerSubject: 0 });
const expectedEffectAnswer = await askCorpus("expected-effects", { rows: 24, evidencePerSubject: 0 });
const legacyAnswer = await askCorpus("legacy", { rows: 20, evidencePerSubject: 0 });

const summary = answerValue<FrameworkCorpusValue>(summaryAnswer);
const docSnippetValue = answerValue<FrameworkCorpusValue>(docSnippetAnswer);
const testSnippetValue = answerValue<FrameworkCorpusValue>(testSnippetAnswer);
const fixtureSeedValue = answerValue<FrameworkCorpusValue>(fixtureSeedAnswer);
const expectedEffectValue = answerValue<FrameworkCorpusValue>(expectedEffectAnswer);
const legacyValue = answerValue<FrameworkCorpusValue>(legacyAnswer);

console.log("framework.corpus pressure");
console.log("scope: public Aurelia docs/tests plus old package replacement inventory for Atlas-guided substrate work");
console.log("note: docs are promoted-pattern pressure, tests are behavior-grounding pressure, old packages are replacement pressure");

if (summary?.rollup !== undefined) {
  console.log("");
  console.log("framework corpus rollup");
  console.log(`- doc files: ${summary.rollup.docFileCount}`);
  console.log(`- doc snippets: ${summary.rollup.docSnippetCount}`);
  console.log(`- framework test files: ${summary.rollup.testFileCount}`);
  console.log(`- framework test snippets: ${summary.rollup.testSnippetCount}`);
  console.log(`- fixture seeds: ${summary.rollup.fixtureSeedCount}`);
  console.log(`- expected effect descriptors: ${summary.rollup.expectedEffectDescriptorCount}`);
  console.log(`- legacy packages: ${summary.rollup.legacyPackageCount}`);
  console.log(`- legacy source lines: ${summary.rollup.legacySourceLineCount}`);
  console.log(`- source state: ${summary.sourceState.summary}`);
  printCounts("doc files by group", summary.rollup.docFilesByGroup, 20);
  printCounts("test files by group", summary.rollup.testFilesByGroup, 20);
  printCounts("doc snippets by language", summary.rollup.docSnippetsByLanguage, 25);
  printCounts("doc rows by concept", summary.rollup.docRowsByConcept, 20);
  printCounts("doc snippets by concept", summary.rollup.docSnippetsByConcept, 20);
  printCounts("test rows by concept", summary.rollup.testRowsByConcept, 20);
  printCounts("test snippets by concept", summary.rollup.testSnippetsByConcept, 20);
  printCounts("fixture seeds by effect", summary.rollup.fixtureSeedsByEffect, 20);
  printCounts("fixture seeds by recipe", summary.rollup.fixtureSeedsByRecipe, 20);
  if (summary.rollup.fixtureSeedEffectHintsWithoutDescriptor.length > 0) {
    console.log(`- fixture effect hints without descriptor: ${summary.rollup.fixtureSeedEffectHintsWithoutDescriptor.join(", ")}`);
  }
  if (summary.rollup.seedableExpectedEffectDescriptorsWithoutFixtureSeeds.length > 0) {
    console.log(`- seedable expected effect descriptors without fixture seeds: ${summary.rollup.seedableExpectedEffectDescriptorsWithoutFixtureSeeds.join(", ")}`);
  }
  const nonCorpusExpectedEffectsWithoutFixtureSeeds = summary.rollup.expectedEffectDescriptorsWithoutFixtureSeeds.filter((effectKind) =>
    !summary.rollup.seedableExpectedEffectDescriptorsWithoutFixtureSeeds.includes(effectKind)
  );
  if (nonCorpusExpectedEffectsWithoutFixtureSeeds.length > 0) {
    console.log(`- non-corpus expected effect contracts without direct fixture seeds: ${nonCorpusExpectedEffectsWithoutFixtureSeeds.join(", ")}`);
  }
  printCounts("docs Aurelia package imports", summary.rollup.aureliaPackageImports, 25);
}

console.log("");
console.log("docs hotspots");
for (const row of summary?.docs ?? []) {
  console.log(
    `- ${row.filePath}: fences=${row.fenceCount}, concepts=${row.concepts.join(", ") || "<none>"}`,
  );
}

console.log("");
console.log("test hotspots");
for (const row of summary?.tests ?? []) {
  console.log(
    `- ${row.filePath}: it=${row.itCount}, createFixture=${row.createFixtureCount}, generated=${row.generated}, concepts=${row.concepts.join(", ") || "<none>"}`,
  );
}

console.log("");
console.log("doc snippet seeds");
for (const row of docSnippetValue?.docSnippets ?? []) {
  console.log(
    `- ${row.filePath}:${row.source.start.line + 1} ${row.language}; concepts=${row.concepts.join(", ") || "<none>"}; ${row.preview}`,
  );
}

console.log("");
console.log("test snippet seeds");
for (const row of testSnippetValue?.testSnippets ?? []) {
  console.log(
    `- ${row.filePath}:${row.source.start.line + 1} ${row.kind}; generated=${row.generated}; ${row.name ?? "<unnamed>"}; concepts=${row.concepts.join(", ") || "<none>"}`,
  );
}

console.log("");
console.log("expected effect contracts");
for (const row of expectedEffectValue?.expectedEffectDescriptors ?? []) {
  console.log(
    `- ${row.contractKind}:${row.key}; seedPolicy=${row.seedPolicy ?? "<none>"}: ${row.summary}`,
  );
}

console.log("");
console.log("fixture seeds");
for (const row of fixtureSeedValue?.fixtureSeeds ?? []) {
  const filters = row.expectedEffects.flatMap((effect) =>
    effect.filters.map((filter) => `${effect.effectKind}.${filter.field}=${String(filter.value ?? "")}`)
  );
  const reasons = row.classificationReasons
    .slice(0, 5)
    .map((reason) => `${reason.kind}:${reason.key}`)
    .join(", ") || "<none>";
  console.log(
    `- ${row.filePath}:${row.source.start.line + 1} ${row.sourceKind}; use=${row.seedUse}; expectedEffects=${row.effectHints.join(", ") || "<none>"}; filters=${filters.join(", ") || "<none>"}; recipes=${row.recipeHints.join(", ") || "<none>"}; reasons=${reasons}`,
  );
}

console.log("");
console.log("legacy replacement inventory");
for (const row of legacyValue?.legacyPackages ?? []) {
  console.log(
    `- ${row.packagePath}: source=${row.sourceFiles}, tests=${row.testFiles}, lines=${row.sourceLines}, ` +
    `semantic-runtime=${row.dependsOnSemanticRuntime}, compiler=${row.dependsOnCompiler}, semantic-workspace=${row.dependsOnSemanticWorkspace}`,
  );
  if (row.aureliaDependencies.length > 0) {
    console.log(`  aurelia deps: ${row.aureliaDependencies.join(", ")}`);
  }
  if (row.topSourceGroups.length > 0) {
    console.log(`  top source groups: ${row.topSourceGroups.map((group) => `${group.name}:${group.count}`).join(", ")}`);
  }
}

async function askCorpus(
  projection: string,
  budget: Readonly<Record<string, number>>,
) {
  const answer = await api.ask({
    lens: LensId.FrameworkCorpus,
    locus: RepoRootLocus,
    projection,
    budget,
  });
  assertHitOrMissAnswer(`framework.corpus:${projection}`, answer);
  return answer;
}
