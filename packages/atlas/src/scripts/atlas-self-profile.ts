import { performance } from "node:perf_hooks";

import type { Answer } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import { answerValue } from "./script-output.js";

interface SelfProfileLane {
  readonly label: string;
  readonly projection: string;
  readonly filters?: Readonly<Record<string, unknown>>;
  readonly rows?: number;
}

interface SelfProfileValue {
  readonly taxonomy?: {
    readonly profile?: readonly {
      readonly phase: string;
      readonly milliseconds: number;
      readonly itemCount?: number;
      readonly summary: string;
    }[];
  };
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

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const warmupStarted = performance.now();
await api.status();
const warmupMilliseconds = performance.now() - warmupStarted;
console.log(`atlas.self profile session warmup: ${warmupMilliseconds.toFixed(1)}ms startup/status`);
console.log("");

for (const [index, lane] of lanes.entries()) {
  const answer = await printLane(lane);
  if (index === 0) {
    printSelfAnalysisPhaseProfile(answerValue<SelfProfileValue>(answer)?.taxonomy?.profile ?? []);
  }
}

async function printLane(lane: SelfProfileLane): Promise<Answer<unknown>> {
  const started = performance.now();
  const answer = await api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: lane.projection,
    filters: lane.filters,
    budget: { rows: lane.rows ?? 12, evidencePerSubject: 0 },
  });
  const milliseconds = performance.now() - started;
  console.log(
    `atlas.self ${lane.label}: ${milliseconds.toFixed(1)}ms, outcome=${answer.outcome}; ${answer.summary}`,
  );
  return answer;
}

function printSelfAnalysisPhaseProfile(
  rows: readonly {
    readonly phase: string;
    readonly milliseconds: number;
    readonly itemCount?: number;
    readonly summary: string;
  }[],
): void {
  if (rows.length === 0) {
    return;
  }
  console.log("atlas.self self-analysis phases");
  for (const row of rows.slice().sort((left, right) => right.milliseconds - left.milliseconds)) {
    const itemCount = row.itemCount === undefined ? "" : `; items=${row.itemCount}`;
    console.log(`- ${row.phase}: ${row.milliseconds.toFixed(1)}ms${itemCount}; ${row.summary}`);
  }
  console.log("");
}
