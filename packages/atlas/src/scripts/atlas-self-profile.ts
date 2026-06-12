import { performance } from "node:perf_hooks";

import type { Answer } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import { enumValueKey } from "../source/index.js";
import {
  answerValue,
  readAllPagedRows,
  scriptArgumentValue,
  scriptNumberArgumentValue,
} from "./script-output.js";

interface SelfProfileLane {
  readonly label: string;
  readonly projection: string;
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly rows?: number;
}

interface SelfProfileValue {
  readonly taxonomy?: {
    readonly profile?: readonly SelfPhaseProfileRow[];
  };
}

interface SelfPhaseProfileRow {
  readonly phase: string;
  readonly milliseconds: number;
  readonly exclusiveMilliseconds?: number;
  readonly childMilliseconds?: number;
  readonly itemCount?: number;
  readonly summary: string;
}

interface SelfEnumUsageValue {
  readonly enumValueOccurrences?: readonly SelfEnumValueOccurrence[];
}

interface SelfEnumValueOccurrence {
  readonly value: string | number;
  readonly valueKind: "number" | "string";
  readonly role: string;
  readonly memberNames: readonly string[];
  readonly contextualMemberNames: readonly string[];
}

interface EnumValueHotspot {
  readonly value: string | number;
  readonly count: number;
  readonly contextualCount: number;
  readonly memberNames: readonly string[];
}

const lanes: readonly SelfProfileLane[] = [
  { label: "summary", projection: "summary", rows: 20 },
  {
    label: "source files by line count",
    projection: "source-files",
    filters: { minLineCount: 250, orderBy: "lineCount" },
  },
  {
    label: "source files by cross-area imports",
    projection: "source-files",
    filters: {
      minCrossAreaOutgoingImportCount: 2,
      orderBy: "crossAreaOutgoingImportCount",
    },
  },
  {
    label: "classes by method count",
    projection: "classes",
    filters: { minMethodCount: 8, orderBy: "methodCount" },
  },
  {
    label: "functions by call count",
    projection: "functions",
    filters: { minCallCount: 20, orderBy: "callCount" },
  },
  {
    label: "function shapes",
    projection: "function-shapes",
    filters: { minNameCount: 2, minFunctionCount: 2, minLineCount: 8 },
  },
  {
    label: "axis pressure high",
    projection: "axis-pressure",
    filters: { pressure: "high" },
  },
  {
    label: "contracts",
    projection: "contracts",
  },
  {
    label: "modules by cross-area imports",
    projection: "modules",
    filters: { crossesArea: true },
  },
  {
    label: "magic strings",
    projection: "strings",
    filters: { magicOnly: true },
  },
  {
    label: "contract strings",
    projection: "contract-strings",
  },
];

const detail = process.argv.includes("--detail");
const maxPhaseRows = scriptNumberArgumentValue("--phaseRows=") ??
  (detail ? Number.POSITIVE_INFINITY : 20);
const laneRows = scriptNumberArgumentValue("--laneRows=");
const includeEnumHotspots = !process.argv.includes("--skipEnumHotspots");
const enumRoleRows = scriptNumberArgumentValue("--enumRoleRows=") ??
  (detail ? Number.POSITIVE_INFINITY : 6);
const enumHotspotRows = scriptNumberArgumentValue("--enumHotspotRows=") ??
  (detail ? 8 : 4);
const enumContext = scriptArgumentValue("--enumContext=");

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const warmupStarted = performance.now();
await api.status();
const warmupMilliseconds = performance.now() - warmupStarted;
console.log(`atlas.self profile session warmup: ${warmupMilliseconds.toFixed(1)}ms startup/status`);
console.log("");

for (const [index, lane] of lanes.entries()) {
  const answer = await printLane(lane);
  if (index === 0) {
    printSelfAnalysisPhaseProfile(
      answerValue<SelfProfileValue>(answer)?.taxonomy?.profile ?? [],
      maxPhaseRows,
    );
    if (includeEnumHotspots) {
      await printEnumUsageHotspots(enumRoleRows, enumHotspotRows);
    }
  }
}

async function printLane(lane: SelfProfileLane): Promise<Answer<unknown>> {
  const started = performance.now();
  const answer = await api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: lane.projection,
    filters: profileLaneFilters(lane),
    budget: { rows: laneRows ?? lane.rows ?? 12, evidencePerSubject: 0 },
  });
  const milliseconds = performance.now() - started;
  console.log(
    `atlas.self ${lane.label}: ${milliseconds.toFixed(1)}ms, outcome=${answer.outcome}; ${answer.summary}`,
  );
  return answer;
}

function profileLaneFilters(lane: SelfProfileLane): Readonly<Record<string, unknown>> | undefined {
  return enumContext === undefined
    ? lane.filters
    : { ...lane.filters, enumContext };
}

function printSelfAnalysisPhaseProfile(
  rows: readonly SelfPhaseProfileRow[],
  maxRows: number,
): void {
  if (rows.length === 0) {
    return;
  }
  const sortedRows = rows.slice().sort(comparePhaseProfileRows);
  const shownRows = Number.isFinite(maxRows)
    ? sortedRows.slice(0, maxRows)
    : sortedRows;
  console.log(
    `atlas.self self-analysis phases (${shownRows.length}/${rows.length} shown; sorted by exclusive cost)`,
  );
  for (const row of shownRows) {
    const itemCount = row.itemCount === undefined ? "" : `; items=${row.itemCount}`;
    const exclusive = row.exclusiveMilliseconds;
    const child = row.childMilliseconds ?? 0;
    const timing = exclusive === undefined || child <= 0.05
      ? `${row.milliseconds.toFixed(1)}ms`
      : `${exclusive.toFixed(1)}ms excl / ${row.milliseconds.toFixed(1)}ms total`;
    console.log(`- ${row.phase}: ${timing}${itemCount}; ${row.summary}`);
  }
  if (shownRows.length < rows.length) {
    console.log(
      `- omitted ${rows.length - shownRows.length} lower-cost phase row(s); pass --detail or --phaseRows=${rows.length} when the tail matters`,
    );
  }
  console.log("");
}

function comparePhaseProfileRows(
  left: {
    readonly milliseconds: number;
    readonly exclusiveMilliseconds?: number;
  },
  right: {
    readonly milliseconds: number;
    readonly exclusiveMilliseconds?: number;
  },
): number {
  return (right.exclusiveMilliseconds ?? right.milliseconds) -
    (left.exclusiveMilliseconds ?? left.milliseconds) ||
    right.milliseconds - left.milliseconds;
}

async function printEnumUsageHotspots(
  maxRoleRows: number,
  maxHotspotRows: number,
): Promise<void> {
  const rows = await readAllPagedRows<SelfEnumUsageValue, SelfEnumValueOccurrence>(api, {
    label: "atlas.self enum raw value hotspots",
    lens: LensId.AtlasSelf,
    projection: "enum-value-occurrences",
    filters: enumContext === undefined ? undefined : { enumContext },
    pageSize: 1_000,
    rowsFromValue: (value) => value?.enumValueOccurrences ?? [],
  });
  if (rows.length === 0) {
    return;
  }
  console.log(`atlas.self enum raw value hotspots (${rows.length} occurrence rows)`);
  const summaries = enumRoleSummaries(rows);
  const shownSummaries = Number.isFinite(maxRoleRows)
    ? summaries.slice(0, maxRoleRows)
    : summaries;
  for (const summary of shownSummaries) {
    console.log(
      `- role ${summary.role}: ${summary.count} occurrence(s), ${summary.contextualCount} contextual, ${summary.stringCount} string, ${summary.numberCount} number, ${summary.distinctValueCount} distinct value(s)`,
    );
  }
  if (shownSummaries.length < summaries.length) {
    console.log(
      `- omitted ${summaries.length - shownSummaries.length} lower-count role summary row(s); pass --detail or --enumRoleRows=${summaries.length} when needed`,
    );
  }
  console.log(
    "- numeric raw overlaps are candidate rows only; checker-backed contextual narrowing is string-like by policy",
  );
  console.log(
    "- standard atlas.self skips call-argument contextual refinement; use atlas.self --enumContext=all or a role-targeted call-argument occurrence inquiry for that lane",
  );
  for (const role of enumHotspotRoles(summaries)) {
    const hotspots = enumValueHotspots(rows, role).slice(0, maxHotspotRows);
    if (hotspots.length === 0) {
      continue;
    }
    console.log(`- top ${role} values: ${hotspots.map(formatEnumHotspot).join("; ")}`);
  }
  console.log("");
}

function enumHotspotRoles(
  summaries: readonly {
    readonly role: string;
    readonly count: number;
  }[],
): readonly string[] {
  const preferred = detail
    ? ["call-argument", "comparison", "object-value", "return-expression"]
    : ["call-argument", "comparison"];
  const available = new Set(summaries.map((summary) => summary.role));
  return preferred.filter((role) => available.has(role));
}

function enumRoleSummaries(rows: readonly SelfEnumValueOccurrence[]): readonly {
  readonly role: string;
  readonly count: number;
  readonly contextualCount: number;
  readonly stringCount: number;
  readonly numberCount: number;
  readonly distinctValueCount: number;
}[] {
  const byRole = new Map<string, SelfEnumValueOccurrence[]>();
  for (const row of rows) {
    const roleRows = byRole.get(row.role) ?? [];
    roleRows.push(row);
    byRole.set(row.role, roleRows);
  }
  return [...byRole]
    .map(([role, roleRows]) => ({
      role,
      count: roleRows.length,
      contextualCount: roleRows.filter((row) => row.contextualMemberNames.length > 0).length,
      stringCount: roleRows.filter((row) => row.valueKind === "string").length,
      numberCount: roleRows.filter((row) => row.valueKind === "number").length,
      distinctValueCount: new Set(roleRows.map((row) => enumValueKey(row.value))).size,
    }))
    .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role));
}

function enumValueHotspots(
  rows: readonly SelfEnumValueOccurrence[],
  role: string,
): readonly EnumValueHotspot[] {
  const buckets = new Map<string, {
    value: string | number;
    rows: SelfEnumValueOccurrence[];
    memberNames: Set<string>;
  }>();
  for (const row of rows) {
    if (row.role !== role) {
      continue;
    }
    const key = enumValueKey(row.value);
    const bucket = buckets.get(key) ?? {
      value: row.value,
      rows: [],
      memberNames: new Set<string>(),
    };
    bucket.rows.push(row);
    for (const memberName of row.memberNames) {
      bucket.memberNames.add(memberName);
    }
    buckets.set(key, bucket);
  }
  return [...buckets.values()]
    .map((bucket) => ({
      value: bucket.value,
      count: bucket.rows.length,
      contextualCount: bucket.rows.filter((row) => row.contextualMemberNames.length > 0).length,
      memberNames: [...bucket.memberNames].sort(),
    }))
    .sort((left, right) =>
      right.count - left.count ||
      right.contextualCount - left.contextualCount ||
      String(left.value).localeCompare(String(right.value)),
    );
}

function formatEnumHotspot(row: EnumValueHotspot): string {
  const members = row.memberNames.slice(0, 3).join("|");
  const more = row.memberNames.length > 3 ? `+${row.memberNames.length - 3}` : "";
  return `${JSON.stringify(row.value)} ${row.contextualCount}/${row.count} contextual [${members}${more}]`;
}
