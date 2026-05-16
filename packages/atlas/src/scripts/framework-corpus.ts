import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { FrameworkCorpusValue } from "../inquiry/runtime/framework-corpus-lenses.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  printCounts,
  printEmptyRows,
  scriptArgumentValue,
  scriptNumberArgumentValue,
} from "./script-output.js";

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = scriptArgumentValue("--projection=") ?? "summary";
const query = scriptArgumentValue("--query=");
const queryMode = scriptArgumentValue("--queryMode=");
const concept = scriptArgumentValue("--concept=");
const group = scriptArgumentValue("--group=");
const path = scriptArgumentValue("--path=");
const language = scriptArgumentValue("--language=");
const snippetKind = scriptArgumentValue("--snippetKind=");
const generated = scriptArgumentValue("--generated=");
const sourceKind = scriptArgumentValue("--sourceKind=");
const seedUse = scriptArgumentValue("--seedUse=");
const effectKind = scriptArgumentValue("--effectKind=");
const effectRole = scriptArgumentValue("--effectRole=");
const effectSeedPolicy = scriptArgumentValue("--effectSeedPolicy=");
const recipeKey = scriptArgumentValue("--recipeKey=");
const classificationKind = scriptArgumentValue("--classificationKind=");
const classificationKey = scriptArgumentValue("--classificationKey=");
const expectedEffectFilterField = scriptArgumentValue("--expectedEffectFilterField=");
const expectedEffectFilterValue = scriptArgumentValue("--expectedEffectFilterValue=");
const rows = scriptNumberArgumentValue("--rows=");
const displayRowLimit = rows ?? (detail ? 40 : 12);
const answerRowBudget = rows ?? (detail ? 80 : 24);

const filters = {
  ...(query === undefined ? {} : { query }),
  ...(queryMode === undefined ? {} : { queryMode }),
  ...(concept === undefined ? {} : { concept }),
  ...(group === undefined ? {} : { group }),
  ...(path === undefined ? {} : { path }),
  ...(language === undefined ? {} : { language }),
  ...(snippetKind === undefined ? {} : { snippetKind }),
  ...(generated === undefined ? {} : { generated }),
  ...(sourceKind === undefined ? {} : { sourceKind }),
  ...(seedUse === undefined ? {} : { seedUse }),
  ...(effectKind === undefined ? {} : { effectKind }),
  ...(effectRole === undefined ? {} : { effectRole }),
  ...(effectSeedPolicy === undefined ? {} : { effectSeedPolicy }),
  ...(recipeKey === undefined ? {} : { recipeKey }),
  ...(classificationKind === undefined ? {} : { classificationKind }),
  ...(classificationKey === undefined ? {} : { classificationKey }),
  ...(expectedEffectFilterField === undefined ? {} : { expectedEffectFilterField }),
  ...(expectedEffectFilterValue === undefined ? {} : { expectedEffectFilterValue }),
};

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 120_000 });
const answer = await api.ask({
  lens: LensId.FrameworkCorpus,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 4 : 1 },
});

assertHitOrMissAnswer(`framework.corpus:${projection}`, answer);
const value = answerValue<FrameworkCorpusValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "framework.corpus",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("framework.corpus");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
console.log(answer.summary);

if (value?.rollup !== undefined) {
  console.log("");
  console.log("rollup");
  console.log(`- doc files: ${value.rollup.docFileCount}`);
  console.log(`- doc snippets: ${value.rollup.docSnippetCount}`);
  console.log(`- framework test files: ${value.rollup.testFileCount}`);
  console.log(`- framework test snippets: ${value.rollup.testSnippetCount}`);
  console.log(`- fixture seeds: ${value.rollup.fixtureSeedCount}`);
  console.log(`- expected effect descriptors: ${value.rollup.expectedEffectDescriptorCount}`);
  console.log(`- legacy packages: ${value.rollup.legacyPackageCount}`);
  if (detail) {
    printCounts("doc files by group", value.rollup.docFilesByGroup, 20);
    printCounts("test files by group", value.rollup.testFilesByGroup, 20);
    printCounts("doc snippets by language", value.rollup.docSnippetsByLanguage, 20);
    printCounts("doc rows by concept", value.rollup.docRowsByConcept, 20);
    printCounts("test rows by concept", value.rollup.testRowsByConcept, 20);
    printCounts("fixture seeds by effect", value.rollup.fixtureSeedsByEffect, 20);
    printCounts("fixture seeds by recipe", value.rollup.fixtureSeedsByRecipe, 20);
    if (value.rollup.fixtureSeedEffectHintsWithoutDescriptor.length > 0) {
      console.log(`- fixture effect hints without descriptor: ${value.rollup.fixtureSeedEffectHintsWithoutDescriptor.join(", ")}`);
    }
    if (value.rollup.seedableExpectedEffectDescriptorsWithoutFixtureSeeds.length > 0) {
      console.log(`- seedable expected effect descriptors without fixture seeds: ${value.rollup.seedableExpectedEffectDescriptorsWithoutFixtureSeeds.join(", ")}`);
    }
    const nonCorpusExpectedEffectsWithoutFixtureSeeds = value.rollup.expectedEffectDescriptorsWithoutFixtureSeeds.filter((effectKind) =>
      !value.rollup.seedableExpectedEffectDescriptorsWithoutFixtureSeeds.includes(effectKind)
    );
    if (nonCorpusExpectedEffectsWithoutFixtureSeeds.length > 0) {
      console.log(`- non-corpus expected effect contracts without direct fixture seeds: ${nonCorpusExpectedEffectsWithoutFixtureSeeds.join(", ")}`);
    }
  }
}

printDocs(value, displayRowLimit);
printDocSnippets(value, displayRowLimit, detail);
printTests(value, displayRowLimit);
printTestSnippets(value, displayRowLimit, detail);
printExpectedEffectDescriptors(value, displayRowLimit);
printFixtureSeeds(value, displayRowLimit, detail);
printLegacyPackages(value, displayRowLimit);

function printDocs(value: FrameworkCorpusValue | undefined, limit: number): void {
  const rows = value?.docs ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("docs");
  printEmptyRows(rows, "no documentation rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.filePath}:${row.source.start.line + 1}; fences=${row.fenceCount}; concepts=${row.concepts.join(", ") || "<none>"}; ${row.title ?? row.summary}`,
    );
  }
}

function printDocSnippets(
  value: FrameworkCorpusValue | undefined,
  limit: number,
  detail: boolean,
): void {
  const rows = value?.docSnippets ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("doc snippets");
  printEmptyRows(rows, "no documentation snippet rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.filePath}:${row.source.start.line + 1}; ${row.language}; concepts=${row.concepts.join(", ") || "<none>"}`,
    );
    if (detail) {
      console.log(`  ${row.preview}`);
    }
  }
}

function printTests(value: FrameworkCorpusValue | undefined, limit: number): void {
  const rows = value?.tests ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("tests");
  printEmptyRows(rows, "no framework test rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.filePath}:${row.source.start.line + 1}; it=${row.itCount}; createFixture=${row.createFixtureCount}; concepts=${row.concepts.join(", ") || "<none>"}`,
    );
  }
}

function printTestSnippets(
  value: FrameworkCorpusValue | undefined,
  limit: number,
  detail: boolean,
): void {
  const rows = value?.testSnippets ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("test snippets");
  printEmptyRows(rows, "no framework test snippet rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.filePath}:${row.source.start.line + 1}; ${row.kind}; generated=${row.generated}; ${row.name ?? "<unnamed>"}; concepts=${row.concepts.join(", ") || "<none>"}`,
    );
    if (detail) {
      console.log(`  ${row.preview}`);
    }
  }
}

function printLegacyPackages(
  value: FrameworkCorpusValue | undefined,
  limit: number,
): void {
  const rows = value?.legacyPackages ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("legacy packages");
  printEmptyRows(rows, "no legacy package rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.packagePath}; source=${row.sourceFiles}; tests=${row.testFiles}; lines=${row.sourceLines}; deps=${row.aureliaDependencies.join(", ") || "<none>"}`,
    );
  }
}

function printExpectedEffectDescriptors(
  value: FrameworkCorpusValue | undefined,
  limit: number,
): void {
  const rows = value?.expectedEffectDescriptors ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("expected effect descriptors");
  printEmptyRows(rows, "no expected effect descriptor rows returned");
  for (const row of rows.slice(0, limit)) {
    console.log(
      `- ${row.contractKind}:${row.key}; seedPolicy=${row.seedPolicy ?? "<none>"}; ${row.source.filePath}:${row.source.start.line + 1}; ${row.summary}`,
    );
  }
}

function printFixtureSeeds(
  value: FrameworkCorpusValue | undefined,
  limit: number,
  detail: boolean,
): void {
  const rows = value?.fixtureSeeds ?? [];
  if (rows.length === 0) {
    return;
  }
  console.log("");
  console.log("fixture seeds");
  printEmptyRows(rows, "no framework fixture seed rows returned");
  for (const row of rows.slice(0, limit)) {
    const filters = fixtureSeedFilterSummary(row);
    console.log(
      `- ${row.filePath}:${row.source.start.line + 1}; ${row.sourceKind}; use=${row.seedUse}; expectedEffects=${row.effectHints.join(", ") || "<none>"}; filters=${filters}; recipes=${row.recipeHints.join(", ") || "<none>"}`,
    );
    if (detail) {
      console.log(`  ${row.preview}`);
      console.log(`  reasons: ${fixtureSeedReasonSummary(row)}`);
    }
  }
}

function fixtureSeedFilterSummary(
  row: NonNullable<FrameworkCorpusValue["fixtureSeeds"]>[number],
): string {
  const filters = row.expectedEffects.flatMap((effect) =>
    effect.filters.map((filter) => `${effect.effectKind}.${filter.field}=${String(filter.value ?? "")}`)
  );
  return filters.length === 0 ? "<none>" : filters.join(", ");
}

function fixtureSeedReasonSummary(
  row: NonNullable<FrameworkCorpusValue["fixtureSeeds"]>[number],
): string {
  return row.classificationReasons.length === 0
    ? "<none>"
    : row.classificationReasons
      .map((reason) => `${reason.kind}:${reason.key}`)
      .join(", ");
}
