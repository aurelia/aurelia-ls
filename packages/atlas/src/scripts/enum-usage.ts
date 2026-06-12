import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  createSourceProject,
  defaultSourcePackageDefinitions,
  findRepoRoot,
  readTypeScriptEnumUsageIndex,
  SourcePackageId,
  type SourcePackageDefinition,
  type SourceProject,
  type SourceSpan,
  type TypeScriptEnumCouplingEdgeRow,
  type TypeScriptEnumDeclarationRow,
  type TypeScriptEnumMemberUsageSummaryRow,
  type TypeScriptEnumMemberReferenceRow,
  type TypeScriptEnumMemberRow,
  type TypeScriptEnumTranslationEdgeRow,
  type TypeScriptEnumUsageIndex,
  type TypeScriptEnumValueOccurrenceRow,
  type TypeScriptEnumValueSpaceRow,
} from "../source/index.js";
import {
  assertKnownScriptArguments,
  printEmptyRows,
  printRowSectionHeader,
  scriptArgumentValue,
  scriptFilterSummary,
  scriptNumberArgumentValue,
} from "./script-output.js";

type EnumUsageProjection =
  | "summary"
  | "enums"
  | "members"
  | "member-usage"
  | "enum-references"
  | "enum-value-spaces"
  | "enum-value-occurrences"
  | "enum-mappings"
  | "enum-couplings"
  | "phase-profile";

interface EnumUsageScriptScope {
  readonly repoRoot: string;
  readonly sourceProject: SourceProject;
  readonly indexedPackageId: string | undefined;
  readonly packageLabel: string;
}

const knownProjections = new Set<EnumUsageProjection>([
  "summary",
  "enums",
  "members",
  "member-usage",
  "enum-references",
  "enum-value-spaces",
  "enum-value-occurrences",
  "enum-mappings",
  "enum-couplings",
  "phase-profile",
]);

const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = enumUsageProjection(scriptArgumentValue("--projection=") ?? "summary");
const rowLimit = scriptNumberArgumentValue("--rows=") ??
  scriptNumberArgumentValue("--limit=");
const displayRowLimit = rowLimit ?? (detail ? 40 : 12);
const enumName = scriptArgumentValue("--enumName=");
const memberName = scriptArgumentValue("--memberName=");
const query = scriptArgumentValue("--query=")?.toLowerCase();
const role = scriptArgumentValue("--role=");
const controlFlowKind = scriptArgumentValue("--controlFlowKind=");
const relation = scriptArgumentValue("--relation=");
const carrier = scriptArgumentValue("--carrier=");
const value = scriptArgumentValue("--value=");
const valueKind = scriptArgumentValue("--valueKind=");
const packageIdArgument = scriptArgumentValue("--packageId=") ?? SourcePackageId.SemanticRuntime;
const packagePath = scriptArgumentValue("--packagePath=");
const tsconfigPath = scriptArgumentValue("--tsconfigPath=");
const packageNameArgument = scriptArgumentValue("--packageName=");
const enumContext = scriptArgumentValue("--enumContext=");

assertKnownScriptArguments("atlas.enum-usage", [
  "--detail",
  "--json",
  "--projection=",
  "--rows=",
  "--limit=",
  "--packageId=",
  "--packagePath=",
  "--packageName=",
  "--tsconfigPath=",
  "--enumName=",
  "--memberName=",
  "--query=",
  "--role=",
  "--controlFlowKind=",
  "--relation=",
  "--carrier=",
  "--value=",
  "--valueKind=",
  "--enumContext=",
]);

const scope = createEnumUsageScriptScope();
const index = readTypeScriptEnumUsageIndex(scope.sourceProject, {
  packageId: scope.indexedPackageId,
  contextualRawValueRoles:
    enumContext === "none" ? "none" : enumContext === "all" ? "all" : undefined,
});
const memberNamesByKey = new Map(
  index.enumDeclarations.flatMap((enumRow) =>
    enumRow.members.map((member) => [
      member.key,
      `${member.enumName}.${member.memberName}`,
    ]),
  ),
);

const filtered = filteredIndexRows(index);
if (json) {
  console.log(JSON.stringify({
    projection,
    package: scope.packageLabel,
    packageId: scope.indexedPackageId ?? "all",
    sourceProject: scope.sourceProject.snapshot().summary,
    filters: activeFilters(),
    counts: countsFor(index),
    value: filtered,
  }, null, 2));
  scope.sourceProject.dispose();
  process.exit(0);
}

console.log("atlas.enum-usage");
console.log(`projection: ${projection}; package=${scope.packageLabel}; mode=${detail ? "detail" : "compact"}`);
const filterSummary = scriptFilterSummary(activeFilters());
if (filterSummary !== undefined) {
  console.log(`filters: ${filterSummary}`);
}
printCounts(index);
printProjection(filtered);
scope.sourceProject.dispose();

function enumUsageProjection(value: string): EnumUsageProjection {
  if (knownProjections.has(value as EnumUsageProjection)) {
    return value as EnumUsageProjection;
  }
  throw new Error(`Unknown enum usage projection: ${value}`);
}

function createEnumUsageScriptScope(): EnumUsageScriptScope {
  const repoRoot = findRepoRoot();
  const packages = packagePath === undefined
    ? defaultPackagesFor(repoRoot)
    : [packageDefinitionForPath(repoRoot)];
  const sourceProject = createSourceProject({ repoRoot, packages });
  const indexedPackageId = packageIdArgument === "*" || packageIdArgument === "all"
    ? undefined
    : packageIdArgument;
  return {
    repoRoot,
    sourceProject,
    indexedPackageId,
    packageLabel: indexedPackageId ?? "all",
  };
}

function defaultPackagesFor(repoRoot: string): readonly SourcePackageDefinition[] {
  const definitions = defaultSourcePackageDefinitions(repoRoot);
  if (packageIdArgument === "*" || packageIdArgument === "all") {
    return definitions;
  }
  const selected = definitions.find((definition) => definition.id === packageIdArgument);
  if (selected === undefined) {
    const known = definitions.map((definition) => definition.id).join(", ");
    throw new Error(`Unknown packageId ${packageIdArgument}. Known package ids: ${known}`);
  }
  return [selected];
}

function packageDefinitionForPath(repoRoot: string): SourcePackageDefinition {
  if (packagePath === undefined) {
    throw new Error("packageDefinitionForPath requires --packagePath.");
  }
  const rootPath = normalizeScriptPath(repoRoot, packagePath);
  const packageJsonPath = path.join(resolveScriptPath(repoRoot, rootPath), "package.json");
  const packageName = packageNameArgument ??
    readPackageName(packageJsonPath) ??
    path.basename(rootPath);
  const packageId = packageIdArgument === "*" || packageIdArgument === "all"
    ? sourcePackageIdFor(packageName)
    : packageIdArgument;
  return {
    id: packageId,
    packageName,
    rootPath,
    tsconfigPath: tsconfigPath === undefined
      ? path.posix.join(rootPath, "tsconfig.json")
      : normalizeScriptPath(repoRoot, tsconfigPath),
  };
}

function filteredIndexRows(index: TypeScriptEnumUsageIndex): Readonly<Record<string, unknown>> {
  const enums = filteredEnums(index.enumDeclarations);
  const members = filteredMembers(enums.flatMap((row) => row.members));
  const memberUsage = filteredMemberUsage(index.memberUsageSummaries);
  const enumReferences = filteredEnumReferences(index.memberReferences);
  const enumValueSpaces = filteredValueSpaces(index.valueSpaces);
  const enumValueOccurrences = filteredValueOccurrences(index.valueOccurrences);
  const enumMappings = filteredMappings(index.translationEdges);
  const enumCouplings = filteredCouplings(index.couplingEdges);
  return {
    enums,
    members,
    memberUsage,
    enumReferences,
    enumValueSpaces,
    enumValueOccurrences,
    enumMappings,
    enumCouplings,
    phaseProfile: index.profile,
  };
}

function filteredEnums(rows: readonly TypeScriptEnumDeclarationRow[]): readonly TypeScriptEnumDeclarationRow[] {
  return rows.filter((row) =>
    matchesEnum(row.enumName) &&
    matchesQuery([
      row.packageId,
      row.packageName,
      row.enumName,
      row.file.repoPath,
      ...row.members.map((member) => member.memberName),
    ])
  );
}

function filteredMembers(rows: readonly TypeScriptEnumMemberRow[]): readonly TypeScriptEnumMemberRow[] {
  return rows.filter((row) =>
    matchesEnum(row.enumName) &&
    matchesMember(row.memberName) &&
    matchesValue(row.value, row.valueKind) &&
    matchesQuery([
      row.packageId,
      row.enumName,
      row.memberName,
      String(row.value ?? ""),
      row.file.repoPath,
    ])
  );
}

function filteredMemberUsage(
  rows: readonly TypeScriptEnumMemberUsageSummaryRow[],
): readonly TypeScriptEnumMemberUsageSummaryRow[] {
  return rows.filter((row) =>
    matchesEnum(row.enumName) &&
    matchesMember(row.memberName) &&
    matchesValue(row.value, row.value === null ? "computed" : typeof row.value) &&
    matchesQuery([
      row.packageId,
      row.enumName,
      row.memberName,
      String(row.value ?? ""),
      row.file.repoPath,
      ...Object.keys(row.roleCounts),
      ...Object.keys(row.controlFlowKindCounts),
      ...row.containingFunctions,
      ...row.containingClasses,
      ...row.coupledEnumNames,
    ])
  );
}

function filteredEnumReferences(
  rows: readonly TypeScriptEnumMemberReferenceRow[],
): readonly TypeScriptEnumMemberReferenceRow[] {
  return rows.filter((row) =>
    matchesEnum(row.enumName) &&
    matchesMember(row.memberName) &&
    matchesRole(row.role) &&
    matchesControlFlow(row.controlFlow?.kind ?? null) &&
    matchesQuery([
      row.packageId,
      row.enumName,
      row.memberName,
      row.role,
      row.expressionText,
      row.containingClass ?? "",
      row.containingFunction ?? "",
      row.file.repoPath,
    ])
  );
}

function filteredValueSpaces(
  rows: readonly TypeScriptEnumValueSpaceRow[],
): readonly TypeScriptEnumValueSpaceRow[] {
  return rows.filter((row) =>
    (enumName === undefined || row.enumNames.includes(enumName)) &&
    (memberName === undefined || row.memberKeys.some((key) => memberMatchesKey(key))) &&
    matchesValue(row.value, row.valueKind) &&
    matchesQuery([
      String(row.value),
      row.valueKind,
      ...row.enumNames,
      ...row.memberKeys,
      ...row.sourceFiles,
    ])
  );
}

function filteredValueOccurrences(
  rows: readonly TypeScriptEnumValueOccurrenceRow[],
): readonly TypeScriptEnumValueOccurrenceRow[] {
  return rows.filter((row) =>
    (enumName === undefined || row.memberKeys.some((key) => enumMatchesKey(key))) &&
    (memberName === undefined || row.memberKeys.some((key) => memberMatchesKey(key))) &&
    matchesRole(row.role) &&
    matchesControlFlow(row.controlFlow?.kind ?? null) &&
    matchesValue(row.value, row.valueKind) &&
    matchesQuery([
      row.packageId,
      String(row.value),
      row.valueKind,
      row.role,
      row.text,
      ...row.memberKeys,
      ...row.contextualMemberKeys,
      row.file.repoPath,
    ])
  );
}

function filteredMappings(
  rows: readonly TypeScriptEnumTranslationEdgeRow[],
): readonly TypeScriptEnumTranslationEdgeRow[] {
  return rows.filter((row) =>
    (enumName === undefined || row.fromEnumName === enumName || row.toEnumName === enumName) &&
    (memberName === undefined || row.fromMemberName === memberName || row.toMemberName === memberName) &&
    matchesQuery([
      row.packageId,
      row.fromEnumName,
      row.fromMemberName,
      row.toEnumName,
      row.toMemberName,
      row.carrier,
      row.relation,
      row.expressionText,
      row.file.repoPath,
    ])
  );
}

function filteredCouplings(
  rows: readonly TypeScriptEnumCouplingEdgeRow[],
): readonly TypeScriptEnumCouplingEdgeRow[] {
  return rows.filter((row) =>
    (enumName === undefined || row.leftEnumName === enumName || row.rightEnumName === enumName) &&
    (memberName === undefined || row.leftMemberNames.includes(memberName) || row.rightMemberNames.includes(memberName)) &&
    (relation === undefined || row.relation === relation) &&
    (carrier === undefined || row.carrier === carrier) &&
    matchesQuery([
      row.packageId,
      row.leftEnumName,
      row.rightEnumName,
      row.relation,
      row.carrier,
      row.expressionText,
      ...row.leftMemberNames,
      ...row.rightMemberNames,
      row.file.repoPath,
    ])
  );
}

function printCounts(index: TypeScriptEnumUsageIndex): void {
  const counts = countsFor(index);
  console.log(`counts: enums=${counts.enums} members=${counts.members} references=${counts.enumReferences} rawValues=${counts.enumValueOccurrences} mappings=${counts.enumMappings} couplings=${counts.enumCouplings}`);
}

function countsFor(index: TypeScriptEnumUsageIndex): Readonly<Record<string, number>> {
  return {
    enums: index.enumDeclarations.length,
    members: index.enumDeclarations.reduce((total, row) => total + row.memberCount, 0),
    unreferencedMembers: index.enumDeclarations.reduce((total, row) => total + row.unreferencedMemberCount, 0),
    memberUsage: index.memberUsageSummaries.length,
    enumReferences: index.memberReferences.length,
    enumValueSpaces: index.valueSpaces.length,
    enumValueOccurrences: index.valueOccurrences.length,
    enumMappings: index.translationEdges.length,
    enumCouplings: index.couplingEdges.length,
    phaseProfile: index.profile.length,
  };
}

function printProjection(value: Readonly<Record<string, unknown>>): void {
  if (projection === "summary") {
    printSummaryRows(value);
    return;
  }
  if (projection === "enums") {
    printEnumRows(value.enums as readonly TypeScriptEnumDeclarationRow[]);
    return;
  }
  if (projection === "members") {
    printMemberRows(value.members as readonly TypeScriptEnumMemberRow[]);
    return;
  }
  if (projection === "member-usage") {
    printMemberUsageRows(value.memberUsage as readonly TypeScriptEnumMemberUsageSummaryRow[]);
    return;
  }
  if (projection === "enum-references") {
    printReferenceRows(value.enumReferences as readonly TypeScriptEnumMemberReferenceRow[]);
    return;
  }
  if (projection === "enum-value-spaces") {
    printValueSpaceRows(value.enumValueSpaces as readonly TypeScriptEnumValueSpaceRow[]);
    return;
  }
  if (projection === "enum-value-occurrences") {
    printValueOccurrenceRows(value.enumValueOccurrences as readonly TypeScriptEnumValueOccurrenceRow[]);
    return;
  }
  if (projection === "enum-mappings") {
    printMappingRows(value.enumMappings as readonly TypeScriptEnumTranslationEdgeRow[]);
    return;
  }
  if (projection === "enum-couplings") {
    printCouplingRows(value.enumCouplings as readonly TypeScriptEnumCouplingEdgeRow[]);
    return;
  }
  printPhaseProfileRows(index.profile);
}

function printSummaryRows(value: Readonly<Record<string, unknown>>): void {
  const enums = value.enums as readonly TypeScriptEnumDeclarationRow[];
  const members = value.members as readonly TypeScriptEnumMemberRow[];
  const memberUsage = value.memberUsage as readonly TypeScriptEnumMemberUsageSummaryRow[];
  const references = value.enumReferences as readonly TypeScriptEnumMemberReferenceRow[];
  const couplings = value.enumCouplings as readonly TypeScriptEnumCouplingEdgeRow[];
  printEnumRows(enums);
  printMemberRows(members.filter((row) => row.referenceCount === 0 || memberName !== undefined));
  printMemberUsageRows(memberUsage.filter((row) => memberName !== undefined || row.referenceCount === 0 || row.couplingCount > 0));
  printReferenceRows(references);
  printCouplingRows(couplings);
}

function printEnumRows(rows: readonly TypeScriptEnumDeclarationRow[]): void {
  printRowSectionHeader("enums", rows, displayRowLimit);
  printEmptyRows(rows, "no enum declarations matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    console.log(`- ${row.packageId} ${row.enumName}; members=${row.memberCount}; referenced=${row.referencedMemberCount}; unreferenced=${row.unreferencedMemberCount}; rawValues=${row.rawValueOccurrenceCount}; ${sourceLabel(row.file.repoPath, row.span)}`);
    if (detail) {
      for (const member of row.members) {
        console.log(`  - ${member.memberName}=${JSON.stringify(member.value)} refs=${member.referenceCount} raw=${member.rawValueOccurrenceCount}; ${sourceLabel(member.file.repoPath, member.span)}`);
      }
    }
  }
}

function printMemberRows(rows: readonly TypeScriptEnumMemberRow[]): void {
  printRowSectionHeader(memberName === undefined ? "members with selected pressure" : "members", rows, displayRowLimit);
  printEmptyRows(rows, "no enum members matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    const status = row.referenceCount === 0 ? "unreferenced" : "referenced";
    console.log(`- ${row.enumName}.${row.memberName}=${JSON.stringify(row.value)} ${status}; refs=${row.referenceCount}; raw=${row.rawValueOccurrenceCount}; ${sourceLabel(row.file.repoPath, row.span)}`);
  }
}

function printMemberUsageRows(rows: readonly TypeScriptEnumMemberUsageSummaryRow[]): void {
  printRowSectionHeader("member usage", rows, displayRowLimit);
  printEmptyRows(rows, "no enum member usage summaries matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    const functions = row.containingFunctions.slice(0, 5).join(", ") || "<none>";
    const roles = formatCounts(row.roleCounts);
    const controlFlow = formatCounts(row.controlFlowKindCounts);
    const coupled = row.coupledEnumNames.join(", ") || "<none>";
    console.log(`- ${row.enumName}.${row.memberName}; refs=${row.referenceCount}; roles=${roles}; controlFlow=${controlFlow}; functions=${functions}; translations=out:${row.translationOutCount},in:${row.translationInCount}; coupled=${coupled}; ${sourceLabel(row.file.repoPath, row.span)}`);
  }
}

function printReferenceRows(rows: readonly TypeScriptEnumMemberReferenceRow[]): void {
  printRowSectionHeader("references", rows, displayRowLimit);
  printEmptyRows(rows, "no enum member references matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    const owner = [row.containingClass, row.containingFunction]
      .filter((part): part is string => part !== null && part.length > 0)
      .join(".");
    const controlFlow = row.controlFlow === null
      ? ""
      : `; controlFlow=${row.controlFlow.kind}`;
    console.log(`- ${row.enumName}.${row.memberName}; role=${row.role}${controlFlow}; expr=${row.expressionText}; owner=${owner || "<module>"}; ${sourceLabel(row.file.repoPath, row.span)}`);
  }
}

function printValueSpaceRows(rows: readonly TypeScriptEnumValueSpaceRow[]): void {
  printRowSectionHeader("value spaces", rows, displayRowLimit);
  printEmptyRows(rows, "no enum value spaces matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    console.log(`- ${JSON.stringify(row.value)} ${row.valueKind}; members=${memberNamesForKeys(row.memberKeys).join(", ")}; references=${row.memberReferenceCount}; raw=${row.rawValueOccurrenceCount}; enums=${row.enumNames.join(", ")}`);
  }
}

function printValueOccurrenceRows(rows: readonly TypeScriptEnumValueOccurrenceRow[]): void {
  printRowSectionHeader("raw value occurrences", rows, displayRowLimit);
  printEmptyRows(rows, "no enum raw value occurrences matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    const controlFlow = row.controlFlow === null
      ? ""
      : `; controlFlow=${row.controlFlow.kind}`;
    console.log(`- ${row.text}; value=${JSON.stringify(row.value)}; role=${row.role}${controlFlow}; members=${memberNamesForKeys(row.memberKeys).join(", ")}; contextual=${memberNamesForKeys(row.contextualMemberKeys).join(", ") || "<none>"}; ${sourceLabel(row.file.repoPath, row.span)}`);
  }
}

function printMappingRows(rows: readonly TypeScriptEnumTranslationEdgeRow[]): void {
  printRowSectionHeader("mappings", rows, displayRowLimit);
  printEmptyRows(rows, "no enum mappings matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    console.log(`- ${row.fromEnumName}.${row.fromMemberName} -> ${row.toEnumName}.${row.toMemberName}; carrier=${row.carrier}; ${sourceLabel(row.file.repoPath, row.span)}`);
  }
}

function printCouplingRows(rows: readonly TypeScriptEnumCouplingEdgeRow[]): void {
  printRowSectionHeader("couplings", rows, displayRowLimit);
  printEmptyRows(rows, "no enum coupling rows matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    console.log(`- ${row.leftEnumName} <-> ${row.rightEnumName}; relation=${row.relation}; carrier=${row.carrier}; occurrences=${row.occurrenceCount}; left=${row.leftMemberNames.join(", ") || "<none>"}; right=${row.rightMemberNames.join(", ") || "<none>"}; ${sourceLabel(row.file.repoPath, row.span)}`);
  }
}

function printPhaseProfileRows(rows: TypeScriptEnumUsageIndex["profile"]): void {
  printRowSectionHeader("phase profile", rows, displayRowLimit);
  printEmptyRows(rows, "no enum usage phase rows matched");
  for (const row of rows.slice(0, displayRowLimit)) {
    const itemCount = row.itemCount === undefined ? "" : `; count=${row.itemCount}`;
    const exclusive = row.exclusiveMilliseconds ?? row.milliseconds;
    console.log(`- ${row.phase}${itemCount}; total=${row.milliseconds.toFixed(2)}ms; self=${exclusive.toFixed(2)}ms`);
  }
}

function enumMatchesKey(key: string): boolean {
  if (enumName === undefined) {
    return true;
  }
  return memberNameForKey(key)?.startsWith(`${enumName}.`) ?? false;
}

function memberMatchesKey(key: string): boolean {
  if (memberName === undefined) {
    return true;
  }
  return memberNameForKey(key)?.endsWith(`.${memberName}`) ?? false;
}

function memberNamesForKeys(keys: readonly string[]): readonly string[] {
  return keys.map((key) => memberNameForKey(key) ?? key);
}

function memberNameForKey(key: string): string | null {
  return memberNamesByKey.get(key) ?? null;
}

function matchesEnum(value: string): boolean {
  return enumName === undefined || value === enumName;
}

function matchesMember(value: string): boolean {
  return memberName === undefined || value === memberName;
}

function matchesRole(value: string): boolean {
  return role === undefined || value === role;
}

function matchesControlFlow(value: string | null): boolean {
  return controlFlowKind === undefined || value === controlFlowKind;
}

function matchesValue(rowValue: string | number | null, rowKind: string): boolean {
  if (value !== undefined && String(rowValue) !== value) {
    return false;
  }
  return valueKind === undefined || rowKind === valueKind;
}

function matchesQuery(values: readonly string[]): boolean {
  return query === undefined || values.some((entry) => entry.toLowerCase().includes(query));
}

function activeFilters(): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries({
      packageId: packageIdArgument,
      packagePath,
      tsconfigPath,
      enumName,
      memberName,
      query,
      role,
      controlFlowKind,
      relation,
      carrier,
      value,
      valueKind,
      enumContext,
    }).filter(([, filterValue]) => filterValue !== undefined),
  );
}

function formatCounts(counts: Readonly<Record<string, number>>): string {
  const entries = Object.entries(counts);
  return entries.length === 0
    ? "<none>"
    : entries.map(([key, count]) => `${key}:${count}`).join(",");
}

function sourceLabel(filePath: string, span: SourceSpan): string {
  return `${filePath}:${span.startLine}`;
}

function normalizeScriptPath(repoRoot: string, value: string): string {
  const absolutePath = resolveScriptPath(repoRoot, value);
  const relative = path.relative(repoRoot, absolutePath);
  return relative.startsWith("..") || path.isAbsolute(relative)
    ? absolutePath
    : relative.split(path.sep).join(path.posix.sep);
}

function resolveScriptPath(repoRoot: string, value: string): string {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(repoRoot, value);
}

function readPackageName(packageJsonPath: string): string | null {
  if (!existsSync(packageJsonPath)) {
    return null;
  }
  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    readonly name?: unknown;
  };
  return typeof parsed.name === "string" ? parsed.name : null;
}

function sourcePackageIdFor(packageName: string): string {
  return packageName
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "package";
}
