import { performance } from "node:perf_hooks";

import { OutcomeKind, type Answer } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";

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
    readonly source?: SourceRef;
  }[];
  readonly functionSurfaces?: readonly {
    readonly name: string;
    readonly filePath: string;
    readonly lineCount: number;
    readonly callSiteCount: number;
    readonly crossAreaCallSiteCount: number;
    readonly source?: SourceRef;
  }[];
}

interface SourceRef {
  readonly filePath: string;
  readonly startLine?: number;
  readonly start?: {
    readonly line: number;
  };
}

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

assertPressureAnswer("product.architecture:modules", moduleAnswer);
assertPressureAnswer(
  "product.architecture:area-dependencies",
  areaDependencyAnswer,
);
assertPressureAnswer("product.architecture:classes", classAnswer);

const structureMilliseconds = performance.now() - structureStarted;
const modules = pressureValue(moduleAnswer).modules ?? [];
const areaDependencies =
  pressureValue(areaDependencyAnswer).areaDependencies ?? [];
const classes = pressureValue(classAnswer).classSurfaces ?? [];

console.log("product.architecture structure pressure");
console.log(
  "filters: modules minLargeFunctionCount=1/orderBy=bodyPressure; area-dependencies crossesArea=true; classes minLineCount=80/orderBy=methodCount",
);
console.log(`requests: ${structureMilliseconds.toFixed(1)}ms`);

console.log("");
console.log("large module pressure");
printEmptyRows(modules);
for (const row of modules) {
  const largest = row.maxFunctionName === null
    ? "no function body"
    : `${row.maxFunctionName} (${row.maxFunctionLineCount} line(s))`;
  console.log(
    `- ${row.filePath}: ${row.lineCount} line(s), ${row.largeFunctionCount} ${label(row.largeFunctionCount, "large body", "large bodies")}, largest ${largest}, ${row.crossAreaImportCount} cross-area import(s), ${row.localImportInCount} local incoming import(s)`,
  );
}

console.log("");
console.log("cross-area import pressure");
printEmptyRows(areaDependencies);
for (const row of areaDependencies) {
  console.log(
    `- ${row.fromArea} -> ${row.toArea}: ${row.dependencyCount} import(s), ${row.sourceModuleCount} source module(s), ${row.targetModuleCount} target module(s)`,
  );
}

console.log("");
console.log("large class pressure");
printEmptyRows(classes);
for (const row of classes) {
  console.log(
    `- ${row.name}: ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
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

assertPressureAnswer("product.architecture:functions", functionAnswer);

const functions = pressureValue(functionAnswer).functionSurfaces ?? [];

console.log("");
console.log("function call pressure");
console.log(
  "filters: minLineCount=35, minCallSiteCount=5, minCrossAreaCallSiteCount=2, orderBy=crossAreaCallSiteCount",
);
console.log(`request: ${(performance.now() - functionStarted).toFixed(1)}ms`);

printEmptyRows(functions);
for (const row of functions) {
  console.log(
    `- ${row.name}: ${row.crossAreaCallSiteCount} cross-area call(s), ${row.callSiteCount} total call(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
  );
}

function assertPressureAnswer(
  label: string,
  answer: Answer<unknown>,
): void {
  if (answer.outcome !== OutcomeKind.Hit && answer.outcome !== OutcomeKind.Miss) {
    throw new Error(`${label} returned ${answer.outcome}.`);
  }
}

function pressureValue(answer: Answer<unknown>): ProductArchitecturePressureValue {
  return (answer.value as ProductArchitecturePressureValue | undefined) ?? {};
}

function printEmptyRows(rows: readonly unknown[]): void {
  if (rows.length === 0) {
    console.log("- no rows at the default pressure threshold");
  }
}

function label(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function sourceLabel(row: { readonly filePath: string; readonly source?: SourceRef }): string {
  const line = row.source?.startLine ?? row.source?.start?.line;
  return line === undefined ? row.filePath : `${row.filePath}:${line}`;
}
