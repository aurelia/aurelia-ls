import { performance } from "node:perf_hooks";

import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";

interface AtlasSelfPressureValue {
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

interface SourceRef {
  readonly filePath: string;
  readonly startLine?: number;
  readonly start?: {
    readonly line: number;
  };
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 120_000 });

const started = performance.now();
const classAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "classes",
  filters: { minMethodCount: 8, orderBy: "methodCount" },
  budget: { rows: 12, evidencePerSubject: 2 },
});

const functionAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "functions",
  filters: { minCallCount: 20, orderBy: "callCount" },
  budget: { rows: 12, evidencePerSubject: 2 },
});

const axisAnswer = await api.ask({
  lens: LensId.AtlasSelf,
  locus: RepoRootLocus,
  projection: "axis-pressure",
  filters: { pressure: "high" },
  budget: { rows: 12, evidencePerSubject: 2 },
});

if (classAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(`atlas.self:classes returned ${classAnswer.outcome}.`);
}
if (functionAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(`atlas.self:functions returned ${functionAnswer.outcome}.`);
}
if (axisAnswer.outcome !== OutcomeKind.Hit) {
  throw new Error(`atlas.self:axis-pressure returned ${axisAnswer.outcome}.`);
}

const classRows =
  (classAnswer.value as AtlasSelfPressureValue | undefined)?.classSurfaces ?? [];
const functionRows =
  (functionAnswer.value as AtlasSelfPressureValue | undefined)
    ?.functionSurfaces ?? [];
const axisRows =
  (axisAnswer.value as AtlasSelfPressureValue | undefined)?.axisPressure ?? [];

console.log("atlas.self class pressure by methodCount");
console.log(`requests: ${(performance.now() - started).toFixed(1)}ms`);
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
console.log("atlas.self high multi-axis pressure");
for (const row of axisRows) {
  const field = row.axisField === null ? "" : `/${row.axisField}`;
  console.log(
    `- ${row.kind} ${row.axis}${field}: ${row.summary} (${sourceLabel(row)})`,
  );
}

function sourceLabel(row: { readonly filePath?: string; readonly source?: SourceRef }): string {
  const filePath = row.source?.filePath ?? row.filePath ?? "<unknown-source>";
  const line = row.source?.startLine ?? row.source?.start?.line;
  return line === undefined ? filePath : `${filePath}:${line}`;
}
