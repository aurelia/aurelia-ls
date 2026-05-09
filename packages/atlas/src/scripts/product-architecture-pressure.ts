import { performance } from "node:perf_hooks";

import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  countLabel,
  duplicateTopLevelFunctionNameGroups,
  printEmptyRows,
  readAllPagedRows,
  sourceLabel,
  type ScriptSourceRef,
} from "./script-output.js";

interface ProductArchitecturePressureValue {
  readonly modules?: readonly {
    readonly filePath: string;
    readonly lineCount: number;
    readonly functionSurfaceCount: number;
    readonly largeFunctionCount: number;
    readonly maxFunctionLineCount: number;
    readonly maxFunctionName: string | null;
    readonly crossAreaImportCount: number;
    readonly localImportInCount: number;
  }[];
  readonly areaDependencies?: readonly {
    readonly fromArea: string;
    readonly toArea: string;
    readonly dependencyCount: number;
    readonly sourceModuleCount: number;
    readonly targetModuleCount: number;
  }[];
  readonly classSurfaces?: readonly {
    readonly name: string;
    readonly filePath: string;
    readonly lineCount: number;
    readonly methodCount: number;
    readonly propertyCount: number;
    readonly auLinkIds: readonly string[];
    readonly source?: SourceRef;
  }[];
  readonly functionSurfaces?: readonly {
    readonly name: string;
    readonly functionKind: string;
    readonly filePath: string;
    readonly lineCount: number;
    readonly callSiteCount: number;
    readonly crossAreaCallSiteCount: number;
    readonly source?: SourceRef;
  }[];
}

type SourceRef = ScriptSourceRef;

const detail = process.argv.includes("--detail");
const structureDisplayRows = detail ? 12 : 6;
const inputEnvelopeDisplayRows = detail ? 20 : 8;
const behavioralInputDisplayRows = detail ? 8 : 4;
const duplicateDisplayRows = detail ? 12 : 6;
const functionDisplayRows = detail ? 30 : 10;

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 120_000 });

const structureStarted = performance.now();
const moduleAnswer = await api.ask({
  lens: LensId.ProductArchitecture,
  locus: RepoRootLocus,
  projection: "modules",
  filters: {
    minLargeFunctionCount: 1,
    orderBy: "bodyPressure",
  },
  budget: { rows: 12, evidencePerSubject: 2 },
});
const areaDependencyAnswer = await api.ask({
  lens: LensId.ProductArchitecture,
  locus: RepoRootLocus,
  projection: "area-dependencies",
  filters: { crossesArea: true },
  budget: { rows: 12, evidencePerSubject: 2 },
});
const classAnswer = await api.ask({
  lens: LensId.ProductArchitecture,
  locus: RepoRootLocus,
  projection: "classes",
  filters: {
    minLineCount: 80,
    orderBy: "methodCount",
  },
  budget: { rows: 12, evidencePerSubject: 2 },
});
const inputClassAnswer = await api.ask({
  lens: LensId.ProductArchitecture,
  locus: RepoRootLocus,
  projection: "classes",
  filters: {
    classNameSuffix: "Input",
    orderBy: "lineCount",
  },
  budget: { rows: 80, evidencePerSubject: 1 },
});
const duplicateFunctionNameRows = await readAllPagedRows<
  ProductArchitecturePressureValue,
  NonNullable<ProductArchitecturePressureValue["functionSurfaces"]>[number]
>(api, {
  label: "product.architecture:functions duplicate names",
  lens: LensId.ProductArchitecture,
  projection: "functions",
  filters: { functionKind: "top-level" },
  rowsFromValue: (value) => value?.functionSurfaces ?? [],
});

assertHitOrMissAnswer("product.architecture:modules", moduleAnswer);
assertHitOrMissAnswer(
  "product.architecture:area-dependencies",
  areaDependencyAnswer,
);
assertHitOrMissAnswer("product.architecture:classes", classAnswer);
assertHitOrMissAnswer("product.architecture:classes Input", inputClassAnswer);

const structureMilliseconds = performance.now() - structureStarted;
const modules = answerValue<ProductArchitecturePressureValue>(moduleAnswer)?.modules ?? [];
const areaDependencies =
  answerValue<ProductArchitecturePressureValue>(areaDependencyAnswer)?.areaDependencies ?? [];
const classes = answerValue<ProductArchitecturePressureValue>(classAnswer)?.classSurfaces ?? [];
const inputClasses = answerValue<ProductArchitecturePressureValue>(inputClassAnswer)?.classSurfaces ?? [];
const inputEnvelopeClasses = inputClasses.filter((row) =>
  row.methodCount === 0 && row.auLinkIds.length === 0
);
const auLinkInputClasses = inputClasses.filter((row) =>
  row.methodCount === 0 && row.auLinkIds.length > 0
);
const behavioralInputClasses = inputClasses.filter((row) => row.methodCount > 0);
const duplicateFunctionNameGroups = duplicateTopLevelFunctionNameGroups(
  duplicateFunctionNameRows,
);

console.log("product.architecture structure pressure");
console.log(
  "filters: modules minLargeFunctionCount=1/orderBy=bodyPressure; area-dependencies crossesArea=true; classes minLineCount=80/orderBy=methodCount",
);
console.log(`requests: ${structureMilliseconds.toFixed(1)}ms; mode=${detail ? "detail" : "compact"}`);

console.log("");
console.log("large module pressure");
printEmptyRows(modules);
for (const row of modules.slice(0, structureDisplayRows)) {
  const largest = row.maxFunctionName === null
    ? "no function body"
    : `${row.maxFunctionName} (${row.maxFunctionLineCount} line(s))`;
  console.log(
    `- ${row.filePath}: ${row.lineCount} line(s), ${row.largeFunctionCount} ${countLabel(row.largeFunctionCount, "large body", "large bodies")}, largest ${largest}, ${row.crossAreaImportCount} cross-area import(s), ${row.localImportInCount} local incoming import(s)`,
  );
}

console.log("");
console.log("cross-area import pressure");
printEmptyRows(areaDependencies);
for (const row of areaDependencies.slice(0, structureDisplayRows)) {
  console.log(
    `- ${row.fromArea} -> ${row.toArea}: ${row.dependencyCount} import(s), ${row.sourceModuleCount} source module(s), ${row.targetModuleCount} target module(s)`,
  );
}

console.log("");
console.log("large class pressure");
printEmptyRows(classes);
for (const row of classes.slice(0, structureDisplayRows)) {
  console.log(
    `- ${row.name}: ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
  );
}

console.log("");
console.log("input-envelope class pressure");
console.log("filters: classNameSuffix=Input/orderBy=lineCount, printed rows require methodCount=0 and no auLink anchors");
printEmptyRows(inputEnvelopeClasses);
for (const row of inputEnvelopeClasses.slice(0, inputEnvelopeDisplayRows)) {
  console.log(
    `- ${row.name}: ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
  );
}

console.log("");
console.log("auLink-backed Input product classes");
console.log("filters: classNameSuffix=Input/orderBy=lineCount, printed rows require methodCount=0 and auLink anchors");
printEmptyRows(auLinkInputClasses);
for (const row of auLinkInputClasses.slice(0, inputEnvelopeDisplayRows)) {
  console.log(
    `- ${row.name}: ${row.auLinkIds.join(", ")}, ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
  );
}

console.log("");
console.log("behavioral Input suffix classes");
printEmptyRows(behavioralInputClasses);
for (const row of behavioralInputClasses.slice(0, behavioralInputDisplayRows)) {
  console.log(
    `- ${row.name}: ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
  );
}

console.log("");
console.log("duplicate top-level helper-name pressure");
console.log("filters: functionKind=top-level; same function name appears in more than one file");
printEmptyRows(duplicateFunctionNameGroups);
for (const group of duplicateFunctionNameGroups.slice(0, duplicateDisplayRows)) {
  console.log(
    `- ${group.name}: ${group.functionCount} function(s), ${group.fileCount} file(s), ${group.lineCount} total line(s), samples ${group.samples.join("; ")}`,
  );
}

const functionStarted = performance.now();
const functionAnswer = await api.ask({
  lens: LensId.ProductArchitecture,
  locus: RepoRootLocus,
  projection: "functions",
  filters: {
    minLineCount: 35,
    minCallSiteCount: 5,
    minCrossAreaCallSiteCount: 2,
    orderBy: "crossAreaCallSiteCount",
  },
  budget: { rows: 30, evidencePerSubject: 2 },
});

assertHitOrMissAnswer("product.architecture:functions", functionAnswer);

const functions = answerValue<ProductArchitecturePressureValue>(functionAnswer)?.functionSurfaces ?? [];

console.log("");
console.log("function call pressure");
console.log(
  "filters: minLineCount=35, minCallSiteCount=5, minCrossAreaCallSiteCount=2, orderBy=crossAreaCallSiteCount",
);
console.log(`request: ${(performance.now() - functionStarted).toFixed(1)}ms`);

printEmptyRows(functions);
for (const row of functions.slice(0, functionDisplayRows)) {
  console.log(
    `- ${row.name}: ${row.crossAreaCallSiteCount} cross-area call(s), ${row.callSiteCount} total call(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
  );
}
