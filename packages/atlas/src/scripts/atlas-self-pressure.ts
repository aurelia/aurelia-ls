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
  readonly functionShapeGroups?: readonly {
    readonly bodyShapeFingerprint: string;
    readonly functionCount: number;
    readonly nameCount: number;
    readonly fileCount: number;
    readonly lineCount: number;
    readonly nameSamples: readonly string[];
    readonly fileSamples: readonly string[];
    readonly source?: SourceRef;
  }[];
  readonly functionWrapperRows?: readonly {
    readonly name: string;
    readonly functionKind: string;
    readonly filePath: string;
    readonly lineCount: number;
    readonly wrapperKind: string;
    readonly wrappedTarget: string;
    readonly argumentCount: number;
    readonly incomingCallCount: number;
    readonly incomingValueReferenceCount: number;
    readonly incomingUsageCount: number;
    readonly exported: boolean;
    readonly source?: SourceRef;
  }[];
  readonly axisPressure?: readonly {
    readonly kind: string;
    readonly axis: string;
    readonly axisField: string | null;
    readonly pressure: string;
    readonly sourceName: string;
    readonly summary: string;
    readonly source?: SourceRef;
  }[];
  readonly strings?: readonly {
    readonly value: string;
    readonly count: number;
    readonly roles: Readonly<Record<string, number>>;
    readonly files: readonly string[];
    readonly declaredByEnumMembers: readonly string[];
    readonly declaredByConstObjectMembers: readonly string[];
    readonly reusedOutsideDeclaration: boolean;
    readonly firstSource: SourceRef;
  }[];
  readonly contractStrings?: readonly {
    readonly value: string;
    readonly classes: readonly string[];
    readonly count: number;
    readonly declaredByEnumMembers: readonly string[];
    readonly declaredByConstObjectMembers: readonly string[];
    readonly files: readonly string[];
    readonly firstSource: SourceRef;
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
const stringDisplayRows = detail ? 12 : 6;
const functionShapeFilters = detail
  ? { minNameCount: 2, minFunctionCount: 2 }
  : { minNameCount: 2, minFunctionCount: 2, minLineCount: 8 };

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
  functionShapeAnswer,
  functionWrapperAnswer,
  axisAnswer,
  optionalObjectSpreadAnswer,
  magicStringAnswer,
  contractStringAnswer,
  constObjectContractStringRows,
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
    projection: "function-shapes",
    filters: functionShapeFilters,
    budget: { rows: detail ? 12 : 6, evidencePerSubject: 2 },
  }),
  api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "function-wrappers",
    filters: { maxIncomingUsageCount: 1, exported: false, orderBy: "incomingUsageCount" },
    budget: { rows: detail ? 12 : 6, evidencePerSubject: 2 },
  }),
  api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "axis-pressure",
    filters: { pressure: "high" },
    budget: { rows: 12, evidencePerSubject: 2 },
  }),
  api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "axis-pressure",
    filters: { kind: "optional-object-spread" },
    budget: { rows: detail ? 12 : 6, evidencePerSubject: 2 },
  }),
  api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "strings",
    filters: { magicOnly: true },
    budget: { rows: detail ? 12 : 6, evidencePerSubject: 2 },
  }),
  api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "contract-strings",
    budget: { rows: detail ? 12 : 6, evidencePerSubject: 2 },
  }),
  readAllPagedRows<AtlasSelfPressureValue, NonNullable<AtlasSelfPressureValue["contractStrings"]>[number]>(
    api,
    {
      label: "atlas.self:contract-strings const-object",
      lens: LensId.AtlasSelf,
      projection: "contract-strings",
      filters: { declarationKind: "const-object" },
      rowsFromValue: (value) => value?.contractStrings ?? [],
    },
  ),
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
assertHitOrMissAnswer("atlas.self:function-shapes", functionShapeAnswer);
assertHitOrMissAnswer("atlas.self:function-wrappers", functionWrapperAnswer);
assertHitOrMissAnswer("atlas.self:axis-pressure", axisAnswer);
assertHitOrMissAnswer("atlas.self:axis-pressure optional object spread", optionalObjectSpreadAnswer);
assertHitOrMissAnswer("atlas.self:strings magic", magicStringAnswer);
assertHitOrMissAnswer("atlas.self:contract-strings", contractStringAnswer);

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
const functionShapeRows =
  answerValue<AtlasSelfPressureValue>(functionShapeAnswer)?.functionShapeGroups ?? [];
const functionWrapperRows =
  answerValue<AtlasSelfPressureValue>(functionWrapperAnswer)?.functionWrapperRows ?? [];
const axisRows =
  (answerValue<AtlasSelfPressureValue>(axisAnswer)?.axisPressure ?? [])
    .filter((row) => row.kind !== "optional-object-spread");
const optionalObjectSpreadRows =
  answerValue<AtlasSelfPressureValue>(optionalObjectSpreadAnswer)?.axisPressure ?? [];
const magicStringRows =
  (answerValue<AtlasSelfPressureValue>(magicStringAnswer)?.strings ?? [])
    .filter((row) => row.value.length > 0);
const contractStringRows =
  [...(answerValue<AtlasSelfPressureValue>(contractStringAnswer)?.contractStrings ?? [])]
    .sort((left, right) =>
      right.count - left.count ||
      left.classes.join(",").localeCompare(right.classes.join(",")) ||
      left.value.localeCompare(right.value)
    );
const sortedConstObjectContractStringRows = [...constObjectContractStringRows]
  .sort(
    (left, right) =>
      right.declaredByConstObjectMembers.length - left.declaredByConstObjectMembers.length ||
      right.count - left.count ||
      left.value.localeCompare(right.value),
  );

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
console.log("filters: functionKind=top-level; same function name appears in more than one file; AST body-shape fingerprint groups equivalent control-flow shapes before exact body text");
printEmptyRows(duplicateFunctionNameGroups);
for (const group of duplicateFunctionNameGroups.slice(0, duplicateDisplayRows)) {
  const shapeSignal = group.distinctBodyShapeFingerprintCount === null
    ? "no body-shape fingerprint"
    : `${group.distinctBodyShapeFingerprintCount} distinct body-shape fingerprint(s), ${group.repeatedBodyShapeFingerprintCount} repeated shape(s) across files`;
  const bodySignal = group.distinctBodyFingerprintCount === null
    ? "no body fingerprint"
    : `${group.distinctBodyFingerprintCount} distinct body fingerprint(s), ${group.repeatedBodyFingerprintCount} repeated across files`;
  console.log(
    `- ${group.name}: ${group.functionCount} function(s), ${group.fileCount} file(s), ${group.lineCount} total line(s), ${shapeSignal}, ${bodySignal}, samples ${group.samples.join("; ")}`,
  );
}

console.log("");
console.log("atlas.self repeated function body-shape pressure");
console.log(`filters: minNameCount=2;${detail ? "" : " minLineCount=8;"} canonical AST/control-flow shapes can match helpers with different names`);
printEmptyRows(functionShapeRows);
for (const row of functionShapeRows.slice(0, duplicateDisplayRows)) {
  console.log(
    `- ${row.functionCount} function(s), ${row.nameCount} name(s), ${row.fileCount} file(s), ${row.lineCount} total line(s), names ${row.nameSamples.join(", ")}, samples ${row.fileSamples.join("; ")} at ${sourceLabel(row)}`,
  );
}

console.log("");
console.log("atlas.self shallow function wrapper pressure");
console.log("filters: maxIncomingUsageCount=1; exported=false; rows are exact one-return constructor/call wrappers, not a verdict to inline blindly");
if (functionWrapperRows.length === 0) {
  console.log("- no shallow single-use wrapper rows at the current threshold");
}
for (const row of functionWrapperRows.slice(0, duplicateDisplayRows)) {
  console.log(
    `- ${row.name}: ${row.wrapperKind} -> ${row.wrappedTarget}, ${row.incomingCallCount} incoming call(s), ` +
      `${row.incomingValueReferenceCount} value ref(s), ${row.incomingUsageCount} usage(s), ${row.lineCount} line(s), ` +
      `${row.argumentCount} argument(s) at ${sourceLabel(row)}`,
  );
}

console.log("");
console.log("atlas.self optional object-spread pressure");
console.log("filters: kind=optional-object-spread; conditional spreads of {} / { prop } branches inside one object literal");
if (optionalObjectSpreadRows.length === 0) {
  console.log("- no optional object-spread rows at the current threshold");
}
for (const row of optionalObjectSpreadRows) {
  console.log(
    `- ${row.sourceName}: ${row.summary} (${sourceLabel(row)})`,
  );
}

console.log("");
console.log("atlas.self magic string pressure");
console.log("filters: magicOnly=true; rows have at least one non-module/non-enum occurrence; role counts include all occurrences");
printEmptyRows(magicStringRows);
  for (const row of magicStringRows.slice(0, stringDisplayRows)) {
    console.log(
    `- ${JSON.stringify(row.value)}: ${row.count} occurrence(s), roles ${compactRecordSummary(row.roles)}, files ${row.files.length}, enum declarations ${row.declaredByEnumMembers.length}, const-object declarations ${row.declaredByConstObjectMembers.length}, first ${sourceLabel({ source: row.firstSource })}`,
  );
}

console.log("");
console.log("atlas.self contract string pressure");
console.log("contract-bearing string literals classified by enum, schema, continuation, and lens contract roles");
printEmptyRows(contractStringRows);
  for (const row of contractStringRows.slice(0, stringDisplayRows)) {
    console.log(
    `- ${JSON.stringify(row.value)}: classes ${row.classes.join(", ")}, ${row.count} occurrence(s), files ${row.files.length}, enum declarations ${row.declaredByEnumMembers.length}, const-object declarations ${row.declaredByConstObjectMembers.length}, first ${sourceLabel({ source: row.firstSource })}`,
  );
}

console.log("");
console.log("atlas.self const-object contract string pressure");
console.log("contract-bearing string literals declared by as-const object vocabularies");
printEmptyRows(sortedConstObjectContractStringRows);
for (const row of sortedConstObjectContractStringRows.slice(0, stringDisplayRows)) {
  console.log(
    `- ${JSON.stringify(row.value)}: classes ${row.classes.join(", ")}, const-object declarations ${row.declaredByConstObjectMembers.length}, enum declarations ${row.declaredByEnumMembers.length}, files ${row.files.length}, first ${sourceLabel({ source: row.firstSource })}`,
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

function compactRecordSummary(record: Readonly<Record<string, number>>): string {
  const entries = Object.entries(record)
    .sort((left, right) =>
      right[1] - left[1] ||
      left[0].localeCompare(right[0])
    )
    .slice(0, 4);
  if (entries.length === 0) {
    return "(none)";
  }
  return entries.map(([key, count]) => `${key}=${count}`).join(", ");
}
