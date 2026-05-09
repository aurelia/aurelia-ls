import { performance } from "node:perf_hooks";

import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitAnswer,
  assertHitOrMissAnswer,
  duplicateTopLevelFunctionNameGroups,
  printEmptyRows,
  readAllPagedRows,
  sourceLabel,
  type ScriptSourceRef,
} from "./script-output.js";

interface AtlasSelfPressureValue {
  readonly sourceFileSurfaces?: readonly AtlasSelfSourceFilePressureRow[];
  readonly classSurfaces?: readonly {
    readonly name: string;
    readonly filePath: string;
    readonly lineCount: number;
    readonly methodCount: number;
    readonly propertyCount: number;
    readonly source?: SourceRef;
  }[];
  readonly functionSurfaces?: readonly {
    readonly name: string;
    readonly functionKind: string;
    readonly filePath: string;
    readonly lineCount: number;
    readonly callCount: number;
    readonly uniqueCallTargetCount: number;
    readonly source?: SourceRef;
  }[];
  readonly axisPressure?: readonly {
    readonly kind: string;
    readonly axis: string;
    readonly axisField: string | null;
    readonly pressure: string;
    readonly summary: string;
    readonly source?: SourceRef;
  }[];
}

interface AtlasSelfSourceFilePressureRow {
  readonly area: string;
  readonly filePath: string;
  readonly lineCount: number;
  readonly moduleShape: string;
  readonly statementCount: number;
  readonly importCount: number;
  readonly outgoingLocalImportCount: number;
  readonly incomingLocalImportCount: number;
  readonly crossAreaOutgoingImportCount: number;
  readonly exportCount: number;
  readonly declarationCount: number;
  readonly typeDeclarationCount: number;
  readonly valueDeclarationCount: number;
  readonly largeLiteralCount: number;
  readonly source?: SourceRef;
}

type SourceRef = ScriptSourceRef;

const detail = process.argv.includes("--detail");
const sourceFileDisplayRows = detail ? 8 : 5;
const classFunctionDisplayRows = detail ? 10 : 5;
const duplicateDisplayRows = detail ? 12 : 6;

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 120_000 });

const started = performance.now();
const [
  sourceFileSizeAnswer,
  sourceFileImplementationAnswer,
  sourceFileIncomingAnswer,
  sourceFileOutgoingAnswer,
  sourceFileCrossAreaAnswer,
] = await Promise.all([
  askSourceFiles({ minLineCount: 250, orderBy: "lineCount" }, 16),
  askSourceFiles({
    minLineCount: 250,
    moduleShape: "implementation",
    orderBy: "lineCount",
  }),
  askSourceFiles({
    minIncomingLocalImportCount: 3,
    orderBy: "incomingLocalImportCount",
  }),
  askSourceFiles({
    minOutgoingLocalImportCount: 4,
    orderBy: "outgoingLocalImportCount",
  }),
  askSourceFiles({
    minCrossAreaOutgoingImportCount: 2,
    orderBy: "crossAreaOutgoingImportCount",
  }),
]);

const [
  classAnswer,
  functionAnswer,
  duplicateFunctionNameRows,
  axisAnswer,
] = await Promise.all([
  api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "classes",
    filters: { minMethodCount: 8, orderBy: "methodCount" },
    budget: { rows: 10, evidencePerSubject: 2 },
  }),
  api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "functions",
    filters: { minCallCount: 20, orderBy: "callCount" },
    budget: { rows: 10, evidencePerSubject: 2 },
  }),
  readAllPagedRows<AtlasSelfPressureValue, NonNullable<AtlasSelfPressureValue["functionSurfaces"]>[number]>(
    api,
    {
      label: "atlas.self:functions duplicate names",
      lens: LensId.AtlasSelf,
      projection: "functions",
      filters: { functionKind: "top-level" },
      rowsFromValue: (value) => value?.functionSurfaces ?? [],
    },
  ),
  api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "axis-pressure",
    filters: { pressure: "high" },
    budget: { rows: 12, evidencePerSubject: 2 },
  }),
]);

for (const answer of [
  sourceFileSizeAnswer,
  sourceFileIncomingAnswer,
  sourceFileOutgoingAnswer,
  sourceFileCrossAreaAnswer,
]) {
  assertHitOrMissAnswer("atlas.self:source-files", answer);
}
assertHitAnswer<AtlasSelfPressureValue>("atlas.self:classes", classAnswer);
assertHitAnswer<AtlasSelfPressureValue>("atlas.self:functions", functionAnswer);
assertHitOrMissAnswer("atlas.self:axis-pressure", axisAnswer);

const sourceFileRowsBySize = sourceFileRows(sourceFileSizeAnswer.value);
const sourceFileCatalogRowsBySize = sourceFileRowsBySize
  .filter((row) => row.moduleShape === "catalog")
  .slice(0, 3);
const sourceFileActionRowsBySize = sourceFileRowsBySize
  .filter((row) => row.moduleShape !== "catalog")
  .slice(0, sourceFileDisplayRows);
const sourceFileRowsByImplementation = sourceFileRows(
  sourceFileImplementationAnswer.value,
).slice(0, sourceFileDisplayRows);
const sourceFileRowsByIncoming = sourceFileRows(
  sourceFileIncomingAnswer.value,
).slice(0, sourceFileDisplayRows);
const sourceFileRowsByOutgoing = sourceFileRows(
  sourceFileOutgoingAnswer.value,
).slice(0, sourceFileDisplayRows);
const sourceFileRowsByCrossArea = sourceFileRows(
  sourceFileCrossAreaAnswer.value,
).slice(0, sourceFileDisplayRows);
const classRows = (classAnswer.value.classSurfaces ?? []).slice(
  0,
  classFunctionDisplayRows,
);
const functionRows = (functionAnswer.value.functionSurfaces ?? []).slice(
  0,
  classFunctionDisplayRows,
);
const duplicateFunctionNameGroups = duplicateTopLevelFunctionNameGroups(
  duplicateFunctionNameRows,
);
const axisRows =
  answerValue<AtlasSelfPressureValue>(axisAnswer)?.axisPressure ?? [];

console.log("atlas.self source-file pressure by lineCount");
console.log(`requests: ${(performance.now() - started).toFixed(1)}ms; mode=${detail ? "detail" : "compact"}`);
printSourceFileRows(sourceFileActionRowsBySize);

console.log("");
console.log("atlas.self catalog source-file pressure by lineCount");
printSourceFileRows(sourceFileCatalogRowsBySize);

console.log("");
console.log("atlas.self implementation source-file pressure by lineCount");
printSourceFileRows(sourceFileRowsByImplementation);

console.log("");
console.log("atlas.self source-file pressure by incomingLocalImportCount");
printSourceFileRows(sourceFileRowsByIncoming);

console.log("");
console.log("atlas.self source-file pressure by outgoingLocalImportCount");
printSourceFileRows(sourceFileRowsByOutgoing);

console.log("");
console.log("atlas.self source-file pressure by crossAreaOutgoingImportCount");
printSourceFileRows(sourceFileRowsByCrossArea);

console.log("");
console.log("atlas.self class pressure by methodCount");
for (const row of classRows) {
  console.log(
    `- ${row.name}: ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
  );
}

console.log("");
console.log("atlas.self function pressure by callCount");
for (const row of functionRows) {
  console.log(
    `- ${row.name}: ${row.callCount} direct call(s), ${row.uniqueCallTargetCount} unique target(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
  );
}

console.log("");
console.log("atlas.self duplicate top-level helper-name pressure");
console.log("filters: functionKind=top-level; same function name appears in more than one file");
printEmptyRows(duplicateFunctionNameGroups);
for (const group of duplicateFunctionNameGroups.slice(0, duplicateDisplayRows)) {
  console.log(
    `- ${group.name}: ${group.functionCount} function(s), ${group.fileCount} file(s), ${group.lineCount} total line(s), samples ${group.samples.join("; ")}`,
  );
}

console.log("");
console.log("atlas.self high multi-axis pressure");
if (axisRows.length === 0) {
  console.log("- no high pressure rows at the current threshold");
}
for (const row of axisRows) {
  const field = row.axisField === null ? "" : `/${row.axisField}`;
  console.log(
    `- ${row.kind} ${row.axis}${field}: ${row.summary} (${sourceLabel(row)})`,
  );
}

function askSourceFiles(filters: Record<string, unknown>, rows = 8) {
  return api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "source-files",
    filters,
    budget: { rows, evidencePerSubject: 2 },
  });
}

function sourceFileRows(value: unknown): readonly AtlasSelfSourceFilePressureRow[] {
  return (value as AtlasSelfPressureValue | undefined)?.sourceFileSurfaces ?? [];
}

function printSourceFileRows(
  rows: readonly AtlasSelfSourceFilePressureRow[],
): void {
  if (rows.length === 0) {
    console.log("- no matching source-file rows");
    return;
  }
  for (const row of rows) {
    if (detail) {
      console.log(
        `- ${row.filePath}: ${row.moduleShape}, ${row.lineCount} line(s), ${row.statementCount} top-level statement(s), ${row.importCount} import(s), ${row.outgoingLocalImportCount} local out, ${row.incomingLocalImportCount} local in, ${row.crossAreaOutgoingImportCount} cross-area out, ${row.exportCount} export surface(s), ${row.declarationCount} declaration statement(s), ${row.typeDeclarationCount} type decl(s), ${row.valueDeclarationCount} value decl(s), ${row.largeLiteralCount} large literal(s) in ${row.area} at ${sourceLabel(row)}`,
      );
      continue;
    }
    console.log(
      `- ${row.filePath}: ${row.lineCount} lines, ${row.moduleShape}, imports ${row.importCount}, local ${row.outgoingLocalImportCount} out/${row.incomingLocalImportCount} in, cross ${row.crossAreaOutgoingImportCount}, decls ${row.declarationCount} at ${sourceLabel(row)}`,
    );
  }
}
