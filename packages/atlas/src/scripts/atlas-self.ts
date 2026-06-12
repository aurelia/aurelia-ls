import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import type { SelfValue } from "../inquiry/runtime/index.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  assertKnownScriptArguments,
  scriptArgumentValue,
  scriptFilterSummary,
  scriptNumberArgumentValue,
  sourceLabel,
  type ScriptSourceRef,
} from "./script-output.js";

type AtlasSelfRow = Readonly<Record<string, unknown>>;

const stringFilterNames = [
  "packageId",
  "query",
  "domain",
  "lensId",
  "projectionId",
  "parameterId",
  "functionName",
  "variableName",
  "initializerKind",
  "bodyFingerprint",
  "bodyShapeFingerprint",
  "switchTopologyFingerprint",
  "targetLens",
  "targetProjection",
  "routeRelationMember",
  "semanticRouteId",
  "navigationSpecId",
  "targetEndpointId",
  "axis",
  "axisId",
  "axisField",
  "valueSpace",
  "pressure",
  "phase",
  "fromArea",
  "area",
  "toArea",
  "class",
  "kind",
  "enumName",
  "memberName",
  "value",
  "valueKind",
  "fromEnum",
  "toEnum",
  "carrier",
  "enumRelation",
  "enumContext",
  "role",
  "stringRole",
  "declarationKind",
  "surfaceKind",
  "surfaceRole",
  "className",
  "methodName",
  "functionKind",
  "moduleShape",
  "orderBy",
] as const;

const booleanFilterNames = [
  "crossesArea",
  "contextualOnly",
  "magicOnly",
  "includeSourceProject",
  "includeFunctionBodyAnalysis",
  "includeSemanticTaxonomyAnalysis",
] as const;

const numberFilterNames = [
  "minInitializerEntryCount",
  "minSwitchTopologyCount",
  "minMilliseconds",
  "minExclusiveMilliseconds",
  "minLineCount",
  "minOutgoingLocalImportCount",
  "minIncomingLocalImportCount",
  "minCrossAreaOutgoingImportCount",
  "minCallCount",
  "minFunctionCount",
  "minNameCount",
  "minFileCount",
  "minUniqueCallTargetCount",
  "minMethodCount",
  "minPropertyCount",
] as const;

const rowProjectionKeys: Readonly<Record<string, keyof SelfValue>> = {
  recipes: "recipes",
  contracts: "contracts",
  projections: "projectionBranches",
  continuations: "continuationRows",
  "semantic-routes": "semanticRoutes",
  modules: "moduleDependencies",
  "substrate-surfaces": "substrateSurfaces",
  "contract-strings": "contractStrings",
  enums: "enums",
  "enum-references": "enumReferences",
  "enum-value-spaces": "enumValueSpaces",
  "enum-value-occurrences": "enumValueOccurrences",
  "enum-mappings": "enumMappings",
  strings: "strings",
  "relationship-surfaces": "relationshipSurfaces",
  "axis-pressure": "axisPressure",
  "row-surfaces": "rowSurfaces",
  classes: "classSurfaces",
  "source-files": "sourceFileSurfaces",
  functions: "functionSurfaces",
  variables: "variableSurfaces",
  "function-shapes": "functionShapeGroups",
  "function-control-flow-shapes": "functionControlFlowShapeGroups",
  "function-wrappers": "functionWrapperRows",
  "phase-profile": "phaseProfileRows",
};

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = scriptArgumentValue("--projection=") ?? "summary";
const rowLimit = scriptNumberArgumentValue("--rows=") ??
  scriptNumberArgumentValue("--limit=");
const displayRowLimit = rowLimit ?? (detail ? 40 : 12);
const answerRowBudget = rowLimit ?? (detail ? 80 : 24);

assertKnownScriptArguments("atlas.self", [
  "--detail",
  "--json",
  "--projection=",
  "--rows=",
  "--limit=",
  ...stringFilterNames.map((name) => `--${name}=`),
  ...booleanFilterNames.map((name) => `--${name}=`),
  ...numberFilterNames.map((name) => `--${name}=`),
]);

const filters: Record<string, unknown> = {};
for (const name of stringFilterNames) {
  copyStringFilter(name);
}
for (const name of booleanFilterNames) {
  copyBooleanFilter(name);
}
for (const name of numberFilterNames) {
  copyNumberFilter(name);
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const answer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection,
  filters,
  budget: { rows: answerRowBudget, evidencePerSubject: detail ? 2 : 0 },
});

assertHitOrMissAnswer(`atlas.self:${projection}`, answer);
const value = answerValue<SelfValue>(answer);

if (json) {
  console.log(JSON.stringify({
    lens: "atlas.self",
    projection,
    outcome: answer.outcome,
    summary: answer.summary,
    value,
    page: answer.page,
  }, null, 2));
  process.exit(0);
}

console.log("atlas.self");
console.log(`projection: ${projection}; outcome=${answer.outcome}; mode=${detail ? "detail" : "compact"}`);
const filterSummary = scriptFilterSummary(filters);
if (filterSummary !== undefined) {
  console.log(`filters: ${filterSummary}`);
}
console.log(answer.summary);

if (projection === "summary" || projection === "taxonomy") {
  printTaxonomy(value);
}

const rows = rowsForProjection(projection, value);
if (rows.length > 0) {
  printRows(projection, rows, displayRowLimit);
}

if (answer.page?.nextCursor !== undefined) {
  console.log("");
  console.log(`next page: cursor=${answer.page.nextCursor}`);
}

function copyStringFilter(name: string): void {
  const value = scriptArgumentValue(`--${name}=`);
  if (value !== undefined) {
    filters[name] = value;
  }
}

function copyBooleanFilter(name: string): void {
  const value = scriptArgumentValue(`--${name}=`);
  if (value === "true" || process.argv.includes(`--${name}`)) {
    filters[name] = true;
    return;
  }
  if (value === "false") {
    filters[name] = false;
  }
}

function copyNumberFilter(name: string): void {
  const value = scriptNumberArgumentValue(`--${name}=`);
  if (value !== undefined) {
    filters[name] = value;
  }
}

function rowsForProjection(
  projection: string,
  value: SelfValue | undefined,
): readonly AtlasSelfRow[] {
  if (value === undefined) {
    return [];
  }
  const key = rowProjectionKeys[projection];
  if (key === undefined) {
    return [];
  }
  const rows = value[key];
  return Array.isArray(rows) ? rows as readonly AtlasSelfRow[] : [];
}

function printTaxonomy(value: SelfValue | undefined): void {
  const taxonomy = value?.taxonomy;
  if (taxonomy === undefined) {
    return;
  }
  console.log("");
  console.log("taxonomy");
  console.log(`- files: ${taxonomy.sourceFileCount}`);
  console.log(`- enums: ${taxonomy.rollup.enumCount}; references=${taxonomy.pressure.enumReferences}; raw overlaps=${taxonomy.pressure.enumLiteralReuses}`);
  console.log(`- strings: ${taxonomy.rollup.stringValueCount}; magic=${taxonomy.pressure.magicStringValues}`);
  console.log(`- relationships: ${taxonomy.rollup.relationshipSurfaceCount}; rows=${taxonomy.rollup.rowSurfaceCount}; axis pressure=${taxonomy.pressure.axisPressureRows}`);
}

function printRows(
  projection: string,
  rows: readonly AtlasSelfRow[],
  limit: number,
): void {
  const shown = rows.slice(0, limit);
  console.log("");
  console.log(`${projection} rows (${shown.length}/${rows.length} shown)`);
  for (const row of shown) {
    const location = rowSourceLabel(row);
    const suffix = location === undefined ? "" : `; ${location}`;
    console.log(`- ${rowHeadline(row)}${suffix}`);
    if (detail) {
      console.log(`  ${JSON.stringify(detailPayload(row))}`);
    }
  }
  if (shown.length < rows.length) {
    console.log(`- omitted ${rows.length - shown.length} row(s); pass --rows=${rows.length} when the tail matters`);
  }
}

function rowHeadline(row: AtlasSelfRow): string {
  if (
    typeof row.phase === "string" &&
    typeof row.milliseconds === "number"
  ) {
    const exclusive = typeof row.exclusiveMilliseconds === "number"
      ? `${row.exclusiveMilliseconds.toFixed(1)}ms excl / `
      : "";
    const itemCount = typeof row.itemCount === "number"
      ? `; items=${row.itemCount}`
      : "";
    const summary = typeof row.summary === "string" ? `; ${row.summary}` : "";
    return `${row.phase}: ${exclusive}${row.milliseconds.toFixed(1)}ms total${itemCount}${summary}`;
  }
  if (typeof row.summary === "string") {
    return row.summary;
  }
  const head = [
    row.id,
    row.name,
    row.phase,
    row.lensId,
    row.functionName,
    row.filePath,
  ].find((value) => typeof value === "string" && value.length > 0);
  return head === undefined ? JSON.stringify(detailPayload(row)) : String(head);
}

function rowSourceLabel(row: AtlasSelfRow): string | undefined {
  if (
    typeof row.filePath !== "string" &&
    !hasSourceRef(row.source)
  ) {
    return undefined;
  }
  return sourceLabel(row as { readonly filePath?: string; readonly source?: ScriptSourceRef });
}

function hasSourceRef(value: unknown): value is ScriptSourceRef {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return typeof record.filePath === "string";
}

function detailPayload(row: AtlasSelfRow): Readonly<Record<string, unknown>> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "source" || key === "summary") {
      continue;
    }
    payload[key] = compactValue(value, 0);
  }
  return payload;
}

function compactValue(value: unknown, depth: number): unknown {
  if (depth > 1) {
    return compactScalar(value);
  }
  if (Array.isArray(value)) {
    const shown = value.slice(0, 8).map((entry) => compactValue(entry, depth + 1));
    return value.length > shown.length
      ? [...shown, `... ${value.length - shown.length} more`]
      : shown;
  }
  if (value != null && typeof value === "object") {
    const entries = Object.entries(value as Readonly<Record<string, unknown>>)
      .filter(([key]) => key !== "source" && key !== "summary")
      .slice(0, 12)
      .map(([key, entryValue]) => [key, compactValue(entryValue, depth + 1)] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

function compactScalar(value: unknown): unknown {
  if (value == null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return `[${value.length} item(s)]`;
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (typeof record.id === "string") {
    return record.id;
  }
  if (typeof record.name === "string") {
    return record.name;
  }
  if (typeof record.filePath === "string") {
    return record.filePath;
  }
  return "{...}";
}
