import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertKnownScriptArguments,
  assertHitOrMissAnswer,
  printEmptyRows,
  scriptArgumentValue,
  scriptFilterSummary,
  scriptNumberArgumentValue,
  sourceLabel,
  type ScriptSourceRef,
} from "./script-output.js";

interface ProductArchitectureValue {
  readonly areas?: readonly SummaryRow[];
  readonly classSurfaces?: readonly ClassSurfaceRow[];
  readonly callDependencies?: readonly SummaryRow[];
  readonly callSites?: readonly CallSiteRow[];
  readonly cycles?: readonly SummaryRow[];
  readonly declarations?: readonly SummaryRow[];
  readonly dependencies?: readonly SummaryRow[];
  readonly areaDependencies?: readonly SummaryRow[];
  readonly fieldProvenanceConstructions?: readonly SummaryRow[];
  readonly functionSurfaces?: readonly FunctionSurfaceRow[];
  readonly functionDuplicateGroups?: readonly FunctionDuplicateGroupRow[];
  readonly functionControlFlowShapeGroups?: readonly FunctionControlFlowShapeGroupRow[];
  readonly kernelRecordBatches?: readonly SummaryRow[];
  readonly kernelRecordConstructions?: readonly SummaryRow[];
  readonly modules?: readonly ModuleRow[];
  readonly symbolDependencies?: readonly SummaryRow[];
  readonly symbolReferences?: readonly SummaryRow[];
}

interface SummaryRow {
  readonly summary: string;
  readonly source?: ScriptSourceRef;
}

interface ClassSurfaceRow {
  readonly name: string;
  readonly filePath: string;
  readonly lineCount: number;
  readonly methodCount: number;
  readonly propertyCount: number;
  readonly methods: readonly string[];
  readonly staticMethods: readonly string[];
  readonly accessors: readonly string[];
  readonly properties: readonly string[];
  readonly auLinkIds: readonly string[];
  readonly auLinkCatalogIdsForName: readonly string[];
  readonly surfaceRole: string;
  readonly surfaceRoleReason: string;
  readonly source?: ScriptSourceRef;
}

interface FunctionSurfaceRow {
  readonly name: string;
  readonly functionKind: string;
  readonly className: string | null;
  readonly parentFunctionName: string | null;
  readonly filePath: string;
  readonly lineCount: number;
  readonly parameterCount: number;
  readonly callSiteCount: number;
  readonly localCallSiteCount: number;
  readonly crossAreaCallSiteCount: number;
  readonly distinctCalleeCount: number;
  readonly sampleCalleeNames: readonly string[];
  readonly sampleCalleeTexts: readonly string[];
  readonly switchTopologyFingerprint: string | null;
  readonly switchTopologyCount: number;
  readonly source?: ScriptSourceRef;
}

interface FunctionDuplicateGroupRow {
  readonly name: string;
  readonly functionCount: number;
  readonly fileCount: number;
  readonly lineCount: number;
  readonly filePaths: readonly string[];
  readonly distinctBodyFingerprintCount: number | null;
  readonly repeatedBodyFingerprintCount: number;
  readonly distinctBodyShapeFingerprintCount: number | null;
  readonly repeatedBodyShapeFingerprintCount: number;
  readonly samples: readonly string[];
  readonly source?: ScriptSourceRef;
}

interface FunctionControlFlowShapeGroupRow {
  readonly switchTopologyFingerprint: string;
  readonly functionCount: number;
  readonly nameCount: number;
  readonly fileCount: number;
  readonly lineCount: number;
  readonly switchTopologyCount: number;
  readonly functionKinds: readonly string[];
  readonly nameSamples: readonly string[];
  readonly fileSamples: readonly string[];
  readonly source?: ScriptSourceRef;
}

interface CallSiteRow {
  readonly callKind: string;
  readonly fromFilePath: string;
  readonly className: string | null;
  readonly functionName: string | null;
  readonly calleeName: string;
  readonly calleeText: string;
  readonly calleeType: string | null;
  readonly calleeSymbolName: string | null;
  readonly targetPackageId: string | null;
  readonly targetFilePath: string | null;
  readonly local: boolean;
  readonly crossesArea: boolean;
  readonly signature: string | null;
  readonly argumentCount: number;
  readonly source?: ScriptSourceRef;
  readonly targetSource?: ScriptSourceRef | null;
}

interface ModuleRow {
  readonly filePath: string;
  readonly area: string;
  readonly lineCount: number;
  readonly functionSurfaceCount: number;
  readonly largeFunctionCount: number;
  readonly maxFunctionLineCount: number;
  readonly maxFunctionName: string | null;
  readonly crossAreaImportCount: number;
  readonly localImportInCount: number;
  readonly source?: ScriptSourceRef;
}

const projection = scriptArgumentValue("--projection=") ?? "classes";
const rows = scriptNumberArgumentValue("--rows=") ?? 20;
const detail = process.argv.includes("--detail");

const stringFilterArguments: readonly (readonly [string, string])[] = [
  ["--query=", "query"],
  ["--area=", "area"],
  ["--fromArea=", "fromArea"],
  ["--toArea=", "toArea"],
  ["--className=", "className"],
  ["--classNameSuffix=", "classNameSuffix"],
  ["--functionName=", "functionName"],
  ["--functionKind=", "functionKind"],
  ["--parentFunctionName=", "parentFunctionName"],
  ["--calleeName=", "calleeName"],
  ["--calleeSymbolName=", "calleeSymbolName"],
  ["--calleeSymbolKey=", "calleeSymbolKey"],
  ["--callKind=", "callKind"],
  ["--targetPackageId=", "targetPackageId"],
  ["--fromFilePath=", "fromFilePath"],
  ["--toFilePath=", "toFilePath"],
  ["--switchTopologyFingerprint=", "switchTopologyFingerprint"],
  ["--methodName=", "methodName"],
  ["--pathPrefix=", "pathPrefix"],
  ["--filePath=", "filePath"],
  ["--surfaceRole=", "surfaceRole"],
  ["--declarationKind=", "declarationKind"],
  ["--auLinkId=", "auLinkId"],
  ["--auLinkCatalogIdForName=", "auLinkCatalogIdForName"],
  ["--orderBy=", "orderBy"],
];

const booleanFilterArguments: readonly (readonly [string, string])[] = [
  ["--exported=", "exported"],
  ["--static=", "static"],
  ["--async=", "async"],
  ["--topLevel=", "topLevel"],
  ["--hasAuLink=", "hasAuLink"],
  ["--hasAuLinkCatalogNameMatch=", "hasAuLinkCatalogNameMatch"],
  ["--resolved=", "resolved"],
  ["--local=", "local"],
  ["--crossesArea=", "crossesArea"],
  ["--includeFunctionBodyAnalysis=", "includeFunctionBodyAnalysis"],
  ["--includeCallSites=", "includeCallSites"],
  ["--includeCallDetails=", "includeCallDetails"],
  ["--includeSymbols=", "includeSymbols"],
  ["--includeKernelRecords=", "includeKernelRecords"],
];

const numberFilterArguments: readonly (readonly [string, string])[] = [
  ["--minLineCount=", "minLineCount"],
  ["--minMethodCount=", "minMethodCount"],
  ["--minFunctionCount=", "minFunctionCount"],
  ["--minNameCount=", "minNameCount"],
  ["--minFileCount=", "minFileCount"],
  ["--minSwitchTopologyCount=", "minSwitchTopologyCount"],
  ["--minCallSiteCount=", "minCallSiteCount"],
  ["--minDistinctCalleeCount=", "minDistinctCalleeCount"],
  ["--minCrossAreaCallSiteCount=", "minCrossAreaCallSiteCount"],
];

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printUsage();
  process.exit(0);
}

assertKnownScriptArguments("product.architecture", [
  "--detail",
  "--help",
  "-h",
  "--projection=",
  "--rows=",
  ...stringFilterArguments.map(([argument]) => argument),
  ...booleanFilterArguments.map(([argument]) => argument),
  ...numberFilterArguments.map(([argument]) => argument),
]);

const filters: Record<string, unknown> = {};
for (const [argument, filterName] of stringFilterArguments) {
  copyStringFilter(argument, filterName);
}
for (const [argument, filterName] of booleanFilterArguments) {
  copyBooleanFilter(argument, filterName);
}
for (const [argument, filterName] of numberFilterArguments) {
  copyNumberFilter(argument, filterName);
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 120_000 });
const answer = await api.ask({
  lens: LensId.ProductArchitecture,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows, evidencePerSubject: detail ? 3 : 1 },
});
assertHitOrMissAnswer(`product.architecture:${projection}`, answer);

const value = answerValue<ProductArchitectureValue>(answer);
console.log("product.architecture");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
const filterSummary = scriptFilterSummary(filters);
if (filterSummary !== undefined) {
  console.log(`filters: ${filterSummary}`);
}
console.log(answer.summary);

switch (projection) {
  case "summary":
    printSummaryRows("areas", value?.areas ?? []);
    printModules(value?.modules ?? []);
    printFunctions(value?.functionSurfaces ?? []);
    printSummaryRows("area dependencies", value?.areaDependencies ?? []);
    printSummaryRows("dependencies", value?.dependencies ?? []);
    printSummaryRows("call dependencies", value?.callDependencies ?? []);
    printSummaryRows("cycles", value?.cycles ?? []);
    printSummaryRows("symbol dependencies", value?.symbolDependencies ?? []);
    printSummaryRows("kernel record constructions", value?.kernelRecordConstructions ?? []);
    printSummaryRows("kernel record batches", value?.kernelRecordBatches ?? []);
    printSummaryRows("field provenance constructions", value?.fieldProvenanceConstructions ?? []);
    break;
  case "areas":
    printSummaryRows("areas", value?.areas ?? []);
    break;
  case "dependencies":
    printSummaryRows("dependencies", value?.dependencies ?? []);
    break;
  case "area-dependencies":
    printSummaryRows("area dependencies", value?.areaDependencies ?? []);
    break;
  case "declarations":
    printSummaryRows("declarations", value?.declarations ?? []);
    break;
  case "cycles":
    printSummaryRows("cycles", value?.cycles ?? []);
    break;
  case "functions":
    printFunctions(value?.functionSurfaces ?? []);
    break;
  case "function-duplicates":
    printFunctionDuplicateGroups(value?.functionDuplicateGroups ?? []);
    break;
  case "function-control-flow-shapes":
    printFunctionControlFlowShapeGroups(value?.functionControlFlowShapeGroups ?? []);
    break;
  case "call-sites":
    printCallSites(value?.callSites ?? []);
    break;
  case "call-dependencies":
    printSummaryRows("call dependencies", value?.callDependencies ?? []);
    break;
  case "symbol-references":
    printSummaryRows("symbol references", value?.symbolReferences ?? []);
    break;
  case "symbol-dependencies":
    printSummaryRows("symbol dependencies", value?.symbolDependencies ?? []);
    break;
  case "kernel-records":
    printSummaryRows("kernel record constructions", value?.kernelRecordConstructions ?? []);
    break;
  case "kernel-batches":
    printSummaryRows("kernel record batches", value?.kernelRecordBatches ?? []);
    break;
  case "field-provenance":
    printSummaryRows("field provenance constructions", value?.fieldProvenanceConstructions ?? []);
    break;
  case "modules":
    printModules(value?.modules ?? []);
    break;
  case "classes":
  default:
    printClasses(value?.classSurfaces ?? []);
    break;
}

function printSummaryRows(label: string, rows: readonly SummaryRow[]): void {
  console.log("");
  console.log(label);
  printEmptyRows(rows);
  for (const row of rows) {
    console.log(`- ${row.summary} at ${sourceLabel(row)}`);
  }
}

function printClasses(rows: readonly ClassSurfaceRow[]): void {
  console.log("");
  console.log("classes");
  printEmptyRows(rows);
  for (const row of rows) {
    console.log(
      `- ${row.name}: ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
    );
    if (detail) {
      console.log(`  role: ${row.surfaceRole}; ${row.surfaceRoleReason}`);
      printDetailList("methods", [...row.methods, ...row.staticMethods.map((name) => `static ${name}`)]);
      printDetailList("properties", [...row.properties, ...row.accessors.map((name) => `accessor ${name}`)]);
      printDetailList("auLink", row.auLinkIds);
      printDetailList("auLink catalog name", row.auLinkCatalogIdsForName);
    }
  }
}

function printFunctions(rows: readonly FunctionSurfaceRow[]): void {
  console.log("");
  console.log("functions");
  printEmptyRows(rows);
  for (const row of rows) {
    console.log(
      `- ${row.name}: ${row.lineCount} line(s), ${row.callSiteCount} call(s), ${row.crossAreaCallSiteCount} cross-area call(s) at ${sourceLabel(row)}`,
    );
    if (detail) {
      console.log(
        `  kind: ${row.functionKind}; params=${row.parameterCount}; localCalls=${row.localCallSiteCount}; callees=${row.distinctCalleeCount}; switchTopology=${row.switchTopologyCount === 0 ? "(none)" : `${row.switchTopologyCount}:${row.switchTopologyFingerprint}`}`,
      );
      if (row.parentFunctionName !== null) {
        console.log(`  parent: ${row.parentFunctionName}`);
      }
      if (row.sampleCalleeNames.length > 0) {
        console.log(`  callees: ${row.sampleCalleeNames.join(", ")}`);
      }
      if (row.sampleCalleeTexts.length > 0) {
        console.log(`  callee expressions: ${row.sampleCalleeTexts.join(", ")}`);
      }
    }
  }
}

function printFunctionControlFlowShapeGroups(
  rows: readonly FunctionControlFlowShapeGroupRow[],
): void {
  console.log("");
  console.log("function control-flow shape groups");
  printEmptyRows(rows);
  for (const row of rows) {
    console.log(
      `- ${row.functionCount} function(s), ${row.nameCount} name(s), ${row.fileCount} file(s), ${row.switchTopologyCount} switch(es), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
    );
    if (detail) {
      printDetailList("names", row.nameSamples);
      printDetailList("files", row.fileSamples);
      printDetailList("kinds", row.functionKinds);
      console.log(`  switchTopologyFingerprint: ${row.switchTopologyFingerprint}`);
    }
  }
}

function printFunctionDuplicateGroups(rows: readonly FunctionDuplicateGroupRow[]): void {
  console.log("");
  console.log("function duplicate groups");
  printEmptyRows(rows);
  for (const row of rows) {
    console.log(
      `- ${row.name}: ${row.functionCount} function(s), ${row.fileCount} file(s), ${row.lineCount} total line(s), repeated body-shapes=${row.repeatedBodyShapeFingerprintCount}, repeated exact bodies=${row.repeatedBodyFingerprintCount} at ${sourceLabel(row)}`,
    );
    if (detail) {
      console.log(
        `  distinct body-shapes=${row.distinctBodyShapeFingerprintCount ?? "(unknown)"}; distinct exact bodies=${row.distinctBodyFingerprintCount ?? "(unknown)"}`,
      );
      printDetailList("files", row.filePaths);
      printDetailList("samples", row.samples);
    }
  }
}

function printCallSites(rows: readonly CallSiteRow[]): void {
  console.log("");
  console.log("call sites");
  printEmptyRows(rows);
  for (const row of rows) {
    console.log(
      `- ${row.calleeText}: ${row.callKind}, args=${row.argumentCount}, local=${row.local}, crossesArea=${row.crossesArea} at ${sourceLabel(row)}`,
    );
    if (detail) {
      console.log(
        `  owner: ${row.className ?? "(none)"}.${row.functionName ?? "(none)"}; callee=${row.calleeName}; symbol=${row.calleeSymbolName ?? "(unresolved)"}`,
      );
      console.log(`  from: ${row.fromFilePath}`);
      console.log(`  target: ${row.targetPackageId ?? "(none)"}:${row.targetFilePath ?? "(unresolved)"}`);
      if (row.calleeType != null) {
        console.log(`  callee type: ${row.calleeType}`);
      }
      if (row.signature != null) {
        console.log(`  signature: ${row.signature}`);
      }
      if (row.targetSource != null) {
        console.log(`  target source: ${sourceLabel({ source: row.targetSource })}`);
      }
    }
  }
}

function printModules(rows: readonly ModuleRow[]): void {
  console.log("");
  console.log("modules");
  printEmptyRows(rows);
  for (const row of rows) {
    console.log(
      `- ${row.filePath}: ${row.lineCount} line(s), ${row.functionSurfaceCount} function surface(s), ${row.largeFunctionCount} large body/bodies, max ${row.maxFunctionName ?? "(none)"}=${row.maxFunctionLineCount} line(s)`,
    );
    if (detail) {
      console.log(
        `  area: ${row.area}; crossAreaImports=${row.crossAreaImportCount}; incomingLocalImports=${row.localImportInCount}`,
      );
    }
  }
}

function printDetailList(label: string, values: readonly string[]): void {
  if (values.length > 0) {
    console.log(`  ${label}: ${values.slice(0, 24).join(", ")}${values.length > 24 ? ", ..." : ""}`);
  }
}

function printUsage(): void {
  console.log(`product.architecture

Usage:
  pnpm --filter @aurelia-ls/atlas product:architecture -- --projection=classes --rows=20
  pnpm --filter @aurelia-ls/atlas product:architecture -- --projection=functions --className=Container --orderBy=lineCount --detail
  pnpm --filter @aurelia-ls/atlas product:architecture -- --projection=call-sites --calleeName=register --includeCallDetails=true

Projections:
  summary, areas, dependencies, area-dependencies, declarations, cycles,
  modules, classes, functions, function-duplicates, function-control-flow-shapes,
  call-sites, call-dependencies, symbol-references, symbol-dependencies,
  kernel-records, kernel-batches, field-provenance

Common options:
  --rows=<n>        Limit row families. Defaults to 20.
  --detail          Include bounded supporting fields and source/call detail.
  --query=<text>    Additional row-text filter; prefer exact filters when known.

String filters:
  ${stringFilterArguments.map(([argument]) => argument).join(" ")}

Boolean filters:
  ${booleanFilterArguments.map(([argument]) => argument).join(" ")}

Number filters:
  ${numberFilterArguments.map(([argument]) => argument).join(" ")}
`);
}

function copyStringFilter(argumentName: string, filterName: string): void {
  const value = scriptArgumentValue(argumentName);
  if (value !== undefined) {
    filters[filterName] = value;
  }
}

function copyBooleanFilter(argumentName: string, filterName: string): void {
  const value = scriptArgumentValue(argumentName);
  if (value === "true") {
    filters[filterName] = true;
  } else if (value === "false") {
    filters[filterName] = false;
  }
}

function copyNumberFilter(argumentName: string, filterName: string): void {
  const value = scriptNumberArgumentValue(argumentName);
  if (value !== undefined) {
    filters[filterName] = value;
  }
}
