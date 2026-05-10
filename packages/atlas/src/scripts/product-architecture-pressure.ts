import { performance } from "node:perf_hooks";

import { countEntriesBy, groupBy } from "../collections.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  countLabel,
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
    readonly auLinkCatalogIdsForName: readonly string[];
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
  readonly functionDuplicateGroups?: readonly {
    readonly name: string;
    readonly functionCount: number;
    readonly fileCount: number;
    readonly lineCount: number;
    readonly distinctBodyFingerprintCount: number | null;
    readonly repeatedBodyFingerprintCount: number;
    readonly distinctBodyShapeFingerprintCount: number | null;
    readonly repeatedBodyShapeFingerprintCount: number;
    readonly samples: readonly string[];
  }[];
  readonly kernelRecordConstructions?: readonly {
    readonly constructionKind: "new-expression" | "object-literal";
    readonly className: string | null;
    readonly recordKind: string;
    readonly productKindExpression: string | null;
    readonly predicateKeyExpression: string | null;
    readonly seamKindExpression: string | null;
    readonly evidenceKindExpression: string | null;
    readonly filePath: string;
    readonly ownerFunctionName: string | null;
    readonly source?: SourceRef;
  }[];
  readonly kernelRecordBatches?: readonly {
    readonly committed: boolean;
    readonly recordsExpression: string | null;
    readonly labelExpression: string | null;
    readonly labelLiteral: string | null;
    readonly commitReceiverExpression: string | null;
    readonly filePath: string;
    readonly ownerFunctionName: string | null;
    readonly source?: SourceRef;
  }[];
  readonly fieldProvenanceConstructions?: readonly {
    readonly fieldNameExpression: string | null;
    readonly fieldNameLiteral: string | null;
    readonly provenanceExpression: string | null;
    readonly filePath: string;
    readonly ownerFunctionName: string | null;
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
const auLinkNameMatchAnswer = await api.ask({
  lens: LensId.ProductArchitecture,
  locus: RepoRootLocus,
  projection: "classes",
  filters: {
    hasAuLinkCatalogNameMatch: true,
    hasAuLink: false,
  },
  budget: { rows: 80, evidencePerSubject: 1 },
});
const duplicateFunctionAnswer = await api.ask({
  lens: LensId.ProductArchitecture,
  locus: RepoRootLocus,
  projection: "function-duplicates",
  filters: {
    minFileCount: 2,
    orderBy: "bodyShapeFingerprint",
  },
  budget: { rows: 80, evidencePerSubject: 1 },
});
const kernelBatchRows = await readAllPagedRows<
  ProductArchitecturePressureValue,
  NonNullable<ProductArchitecturePressureValue["kernelRecordBatches"]>[number]
>(api, {
  label: "product.architecture:kernel-batches",
  lens: LensId.ProductArchitecture,
  projection: "kernel-batches",
  rowsFromValue: (value) => value?.kernelRecordBatches ?? [],
});
const kernelRecordRows = await readAllPagedRows<
  ProductArchitecturePressureValue,
  NonNullable<ProductArchitecturePressureValue["kernelRecordConstructions"]>[number]
>(api, {
  label: "product.architecture:kernel-records",
  lens: LensId.ProductArchitecture,
  projection: "kernel-records",
  rowsFromValue: (value) => value?.kernelRecordConstructions ?? [],
});
const fieldProvenanceRows = await readAllPagedRows<
  ProductArchitecturePressureValue,
  NonNullable<ProductArchitecturePressureValue["fieldProvenanceConstructions"]>[number]
>(api, {
  label: "product.architecture:field-provenance",
  lens: LensId.ProductArchitecture,
  projection: "field-provenance",
  rowsFromValue: (value) => value?.fieldProvenanceConstructions ?? [],
});

assertHitOrMissAnswer("product.architecture:modules", moduleAnswer);
assertHitOrMissAnswer(
  "product.architecture:area-dependencies",
  areaDependencyAnswer,
);
assertHitOrMissAnswer("product.architecture:classes", classAnswer);
assertHitOrMissAnswer("product.architecture:classes Input", inputClassAnswer);
assertHitOrMissAnswer(
  "product.architecture:classes auLink catalog name matches",
  auLinkNameMatchAnswer,
);
assertHitOrMissAnswer(
  "product.architecture:function-duplicates",
  duplicateFunctionAnswer,
);

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
const unanchoredAuLinkNameMatches =
  answerValue<ProductArchitecturePressureValue>(auLinkNameMatchAnswer)?.classSurfaces ?? [];
const duplicateFunctionNameGroups =
  answerValue<ProductArchitecturePressureValue>(duplicateFunctionAnswer)?.functionDuplicateGroups ?? [];
const kernelRecordKindGroups = countEntriesBy(kernelRecordRows, (row) => row.recordKind);
const kernelProductKindGroups = countEntriesBy(
  kernelRecordRows.filter((row) => row.productKindExpression !== null),
  (row) => row.productKindExpression!,
);
const kernelBatchLabelGroups = countEntriesBy(
  kernelBatchRows,
  (row) => row.labelLiteral ?? row.labelExpression ?? "(unlabeled)",
);
const kernelRecordFileGroups = kernelRecordFilePressureRows(kernelRecordRows);
const kernelBatchFileGroups = kernelBatchFilePressureRows(kernelBatchRows);
const kernelRecordOwnerGroups = kernelRecordOwnerPressureRows(kernelRecordRows);
const kernelBatchOwnerGroups = kernelBatchOwnerPressureRows(kernelBatchRows);
const fieldProvenanceFieldGroups = countEntriesBy(
  fieldProvenanceRows,
  fieldProvenanceFieldLabel,
);
const fieldProvenanceFileGroups = fieldProvenanceFilePressureRows(fieldProvenanceRows);
const fieldProvenanceOwnerGroups = fieldProvenanceOwnerPressureRows(fieldProvenanceRows);

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
console.log("unanchored auLink catalog-name class matches");
console.log("filters: hasAuLinkCatalogNameMatch=true/hasAuLink=false; exact class name equals an auLink catalog symbol");
printEmptyRows(unanchoredAuLinkNameMatches);
for (const row of unanchoredAuLinkNameMatches.slice(0, inputEnvelopeDisplayRows)) {
  console.log(
    `- ${row.name}: catalog ${row.auLinkCatalogIdsForName.join(", ")}, ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), ${row.lineCount} line(s) at ${sourceLabel(row)}`,
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
console.log("KernelStoreRecord construction pressure");
console.log("source-level record constructor sites grouped by record kind and visible product vocabulary expression");
printEmptyRows(kernelRecordKindGroups);
for (const group of kernelRecordKindGroups.slice(0, structureDisplayRows)) {
  console.log(`- ${group.key}: ${group.count} construction site(s)`);
}
console.log("product-kind entry points");
printEmptyRows(kernelProductKindGroups);
for (const group of kernelProductKindGroups.slice(0, structureDisplayRows)) {
  console.log(`- ${group.key}: ${group.count} construction site(s)`);
}
console.log("batch commit labels");
printEmptyRows(kernelBatchLabelGroups);
for (const group of kernelBatchLabelGroups.slice(0, structureDisplayRows)) {
  console.log(`- ${group.key}: ${group.count} batch site(s)`);
}
console.log("record module hot spots");
printEmptyRows(kernelRecordFileGroups);
for (const group of kernelRecordFileGroups.slice(0, structureDisplayRows)) {
  console.log(
    `- ${group.filePath}: ${group.count} construction site(s), ${group.recordKinds}, product kinds ${group.productKindExpressions}, first ${group.firstSource}`,
  );
}
console.log("batch module hot spots");
printEmptyRows(kernelBatchFileGroups);
for (const group of kernelBatchFileGroups.slice(0, structureDisplayRows)) {
  console.log(
    `- ${group.filePath}: ${group.count} batch site(s), labels ${group.labels}, ${group.committedCount} committed, first ${group.firstSource}`,
  );
}
console.log("record owner hot spots");
printEmptyRows(kernelRecordOwnerGroups);
for (const group of kernelRecordOwnerGroups.slice(0, structureDisplayRows)) {
  console.log(
    `- ${group.owner}: ${group.count} construction site(s), ${group.recordKinds}, product kinds ${group.productKindExpressions}, first ${group.firstSource}`,
  );
}
console.log("batch owner hot spots");
printEmptyRows(kernelBatchOwnerGroups);
for (const group of kernelBatchOwnerGroups.slice(0, structureDisplayRows)) {
  console.log(
    `- ${group.owner}: ${group.count} batch site(s), labels ${group.labels}, ${group.committedCount} committed, first ${group.firstSource}`,
  );
}
if (detail) {
  console.log("record source samples");
  printEmptyRows(kernelRecordRows);
  for (const row of kernelRecordRows.slice(0, structureDisplayRows)) {
    const vocabulary = row.productKindExpression ??
      row.predicateKeyExpression ??
      row.seamKindExpression ??
      row.evidenceKindExpression ??
      "(no visible vocabulary expression)";
    console.log(
      `- ${row.recordKind} via ${row.className ?? row.constructionKind} in ${kernelOwnerLabel(row)} at ${sourceLabel(row)}; vocabulary ${vocabulary}`,
    );
  }
  console.log("batch source samples");
  printEmptyRows(kernelBatchRows);
  for (const row of kernelBatchRows.slice(0, structureDisplayRows)) {
    const label = row.labelLiteral ?? row.labelExpression ?? "(unlabeled)";
    const receiver = row.commitReceiverExpression === null
      ? "uncommitted construction"
      : `committed through ${row.commitReceiverExpression}`;
    console.log(
      `- ${label} in ${kernelOwnerLabel(row)} at ${sourceLabel(row)}; ${receiver}; records ${row.recordsExpression ?? "(unknown records expression)"}`,
    );
  }
}

console.log("");
console.log("FieldProvenance construction pressure");
console.log("source-level field provenance sites grouped by field name, module, and owner");
printEmptyRows(fieldProvenanceFieldGroups);
for (const group of fieldProvenanceFieldGroups.slice(0, structureDisplayRows)) {
  console.log(`- ${group.key}: ${group.count} construction site(s)`);
}
console.log("field provenance module hot spots");
printEmptyRows(fieldProvenanceFileGroups);
for (const group of fieldProvenanceFileGroups.slice(0, structureDisplayRows)) {
  console.log(
    `- ${group.filePath}: ${group.count} construction site(s), fields ${group.fields}, provenance handles ${group.provenanceExpressions}, first ${group.firstSource}`,
  );
}
console.log("field provenance owner hot spots");
printEmptyRows(fieldProvenanceOwnerGroups);
for (const group of fieldProvenanceOwnerGroups.slice(0, structureDisplayRows)) {
  console.log(
    `- ${group.owner}: ${group.count} construction site(s), fields ${group.fields}, provenance handles ${group.provenanceExpressions}, first ${group.firstSource}`,
  );
}
if (detail) {
  console.log("field provenance source samples");
  printEmptyRows(fieldProvenanceRows);
  for (const row of fieldProvenanceRows.slice(0, structureDisplayRows)) {
    console.log(
      `- ${fieldProvenanceFieldLabel(row)} in ${kernelOwnerLabel(row)} at ${sourceLabel(row)}; handle ${row.provenanceExpression ?? "(unknown provenance expression)"}`,
    );
  }
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

interface KernelRecordOwnerPressureRow {
  readonly owner: string;
  readonly count: number;
  readonly recordKinds: string;
  readonly productKindExpressions: string;
  readonly firstSource: string;
}

interface KernelRecordFilePressureRow {
  readonly filePath: string;
  readonly count: number;
  readonly recordKinds: string;
  readonly productKindExpressions: string;
  readonly firstSource: string;
}

interface KernelBatchOwnerPressureRow {
  readonly owner: string;
  readonly count: number;
  readonly labels: string;
  readonly committedCount: number;
  readonly firstSource: string;
}

interface KernelBatchFilePressureRow {
  readonly filePath: string;
  readonly count: number;
  readonly labels: string;
  readonly committedCount: number;
  readonly firstSource: string;
}

interface FieldProvenanceFilePressureRow {
  readonly filePath: string;
  readonly count: number;
  readonly fields: string;
  readonly provenanceExpressions: string;
  readonly firstSource: string;
}

interface FieldProvenanceOwnerPressureRow {
  readonly owner: string;
  readonly count: number;
  readonly fields: string;
  readonly provenanceExpressions: string;
  readonly firstSource: string;
}

function kernelRecordFilePressureRows(
  rows: readonly NonNullable<ProductArchitecturePressureValue["kernelRecordConstructions"]>[number][],
): readonly KernelRecordFilePressureRow[] {
  return [...groupBy(rows, (row) => row.filePath)]
    .map(([filePath, group]) => ({
      filePath,
      count: group.length,
      recordKinds: compactCountSummary(group, (row) => row.recordKind),
      productKindExpressions: compactCountSummary(
        group.filter((row) => row.productKindExpression !== null),
        (row) => row.productKindExpression!,
      ),
      firstSource: sourceLabel(group[0]!),
    }))
    .sort((left, right) =>
      right.count - left.count ||
      left.filePath.localeCompare(right.filePath),
    );
}

function kernelRecordOwnerPressureRows(
  rows: readonly NonNullable<ProductArchitecturePressureValue["kernelRecordConstructions"]>[number][],
): readonly KernelRecordOwnerPressureRow[] {
  return [...groupBy(rows, kernelOwnerLabel)]
    .map(([owner, group]) => ({
      owner,
      count: group.length,
      recordKinds: compactCountSummary(group, (row) => row.recordKind),
      productKindExpressions: compactCountSummary(
        group.filter((row) => row.productKindExpression !== null),
        (row) => row.productKindExpression!,
      ),
      firstSource: sourceLabel(group[0]!),
    }))
    .sort((left, right) =>
      right.count - left.count ||
      left.owner.localeCompare(right.owner),
    );
}

function kernelBatchFilePressureRows(
  rows: readonly NonNullable<ProductArchitecturePressureValue["kernelRecordBatches"]>[number][],
): readonly KernelBatchFilePressureRow[] {
  return [...groupBy(rows, (row) => row.filePath)]
    .map(([filePath, group]) => ({
      filePath,
      count: group.length,
      labels: compactCountSummary(
        group,
        (row) => row.labelLiteral ?? row.labelExpression ?? "(unlabeled)",
      ),
      committedCount: group.filter((row) => row.committed).length,
      firstSource: sourceLabel(group[0]!),
    }))
    .sort((left, right) =>
      right.count - left.count ||
      left.filePath.localeCompare(right.filePath),
    );
}

function kernelBatchOwnerPressureRows(
  rows: readonly NonNullable<ProductArchitecturePressureValue["kernelRecordBatches"]>[number][],
): readonly KernelBatchOwnerPressureRow[] {
  return [...groupBy(rows, kernelOwnerLabel)]
    .map(([owner, group]) => ({
      owner,
      count: group.length,
      labels: compactCountSummary(
        group,
        (row) => row.labelLiteral ?? row.labelExpression ?? "(unlabeled)",
      ),
      committedCount: group.filter((row) => row.committed).length,
      firstSource: sourceLabel(group[0]!),
    }))
    .sort((left, right) =>
      right.count - left.count ||
      left.owner.localeCompare(right.owner),
    );
}

function fieldProvenanceFilePressureRows(
  rows: readonly NonNullable<ProductArchitecturePressureValue["fieldProvenanceConstructions"]>[number][],
): readonly FieldProvenanceFilePressureRow[] {
  return [...groupBy(rows, (row) => row.filePath)]
    .map(([filePath, group]) => ({
      filePath,
      count: group.length,
      fields: compactCountSummary(group, fieldProvenanceFieldLabel),
      provenanceExpressions: compactCountSummary(
        group,
        (row) => row.provenanceExpression ?? "(unknown provenance expression)",
      ),
      firstSource: sourceLabel(group[0]!),
    }))
    .sort((left, right) =>
      right.count - left.count ||
      left.filePath.localeCompare(right.filePath),
    );
}

function fieldProvenanceOwnerPressureRows(
  rows: readonly NonNullable<ProductArchitecturePressureValue["fieldProvenanceConstructions"]>[number][],
): readonly FieldProvenanceOwnerPressureRow[] {
  return [...groupBy(rows, kernelOwnerLabel)]
    .map(([owner, group]) => ({
      owner,
      count: group.length,
      fields: compactCountSummary(group, fieldProvenanceFieldLabel),
      provenanceExpressions: compactCountSummary(
        group,
        (row) => row.provenanceExpression ?? "(unknown provenance expression)",
      ),
      firstSource: sourceLabel(group[0]!),
    }))
    .sort((left, right) =>
      right.count - left.count ||
      left.owner.localeCompare(right.owner),
    );
}

function kernelOwnerLabel(row: { readonly filePath: string; readonly ownerFunctionName: string | null }): string {
  return `${row.filePath} :: ${row.ownerFunctionName ?? "(module top level)"}`;
}

function fieldProvenanceFieldLabel(
  row: NonNullable<ProductArchitecturePressureValue["fieldProvenanceConstructions"]>[number],
): string {
  return row.fieldNameLiteral ?? row.fieldNameExpression ?? "(dynamic field name)";
}

function compactCountSummary<TRow>(
  rows: readonly TRow[],
  keyFor: (row: TRow) => string,
): string {
  const allGroups = countEntriesBy(rows, keyFor);
  const groups = allGroups.slice(0, 4);
  if (groups.length === 0) {
    return "(none)";
  }
  const suffix = groups.length < allGroups.length ? ", ..." : "";
  return groups.map((group) => `${group.key}=${group.count}`).join(", ") + suffix;
}
