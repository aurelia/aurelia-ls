import { performance } from "node:perf_hooks";

import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { productArchitectureProfileLaneName } from "../inquiry/runtime/product-architecture-profile-label.js";
import { createApi } from "../session/index.js";
import { scriptNumberArgumentValue } from "./script-output.js";

interface ProductArchitectureProfileValue {
  readonly profile?: {
    readonly includeFunctionBodyAnalysis: boolean;
    readonly includeCallSites: boolean;
    readonly includeCallDetails: boolean;
    readonly includeSymbols: boolean;
    readonly includeKernelRecords: boolean;
    readonly totalMilliseconds: number;
    readonly phases: readonly {
      readonly phase: string;
      readonly milliseconds: number;
      readonly count: number | null;
    }[];
  };
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const detail = process.argv.includes("--detail");
const phaseRows = scriptNumberArgumentValue("--phaseRows=")
  ?? scriptNumberArgumentValue("--rows=")
  ?? (detail ? Number.POSITIVE_INFINITY : 8);
const laneRows = scriptNumberArgumentValue("--laneRows=")
  ?? (detail ? Number.POSITIVE_INFINITY : 8);

const warmupStarted = performance.now();
await api.status();
const warmupMilliseconds = performance.now() - warmupStarted;
console.log(`product.architecture profile session warmup: ${warmupMilliseconds.toFixed(1)}ms startup/status`);
console.log("");

const profileLanes = [
  { includeFunctionBodyAnalysis: false, includeCallSites: false, includeCallDetails: false, includeSymbols: false, includeKernelRecords: false },
  { includeFunctionBodyAnalysis: true, includeCallSites: false, includeCallDetails: false, includeSymbols: false, includeKernelRecords: false },
  { includeFunctionBodyAnalysis: false, includeCallSites: false, includeCallDetails: false, includeSymbols: false, includeKernelRecords: true },
  { includeFunctionBodyAnalysis: false, includeCallSites: true, includeCallDetails: false, includeSymbols: false, includeKernelRecords: true },
  { includeFunctionBodyAnalysis: false, includeCallSites: true, includeCallDetails: true, includeSymbols: false, includeKernelRecords: true },
  { includeFunctionBodyAnalysis: false, includeCallSites: false, includeCallDetails: false, includeSymbols: true, includeKernelRecords: true },
  { includeFunctionBodyAnalysis: false, includeCallSites: true, includeCallDetails: false, includeSymbols: true, includeKernelRecords: true },
  { includeFunctionBodyAnalysis: false, includeCallSites: true, includeCallDetails: true, includeSymbols: true, includeKernelRecords: true },
] as const;
const selectedLanes = Number.isFinite(laneRows)
  ? profileLanes.slice(0, Math.max(0, laneRows))
  : profileLanes;
for (const lane of selectedLanes) {
  await printProfile(
    lane.includeFunctionBodyAnalysis,
    lane.includeCallSites,
    lane.includeCallDetails,
    lane.includeSymbols,
    lane.includeKernelRecords,
  );
}

async function printProfile(
  includeFunctionBodyAnalysis: boolean,
  includeCallSites: boolean,
  includeCallDetails: boolean,
  includeSymbols: boolean,
  includeKernelRecords: boolean,
): Promise<void> {
  const started = performance.now();
  const answer = await api.ask({
    lens: LensId.ProductArchitecture,
    locus: RepoRootLocus,
    projection: "profile",
    filters: { includeFunctionBodyAnalysis, includeCallSites, includeCallDetails, includeSymbols, includeKernelRecords },
    budget: { evidencePerSubject: 20 },
  });

  if (answer.outcome !== OutcomeKind.Hit) {
    throw new Error(`product.architecture profile returned ${answer.outcome}.`);
  }

  const value = answer.value as ProductArchitectureProfileValue | undefined;
  const profile = value?.profile;
  if (profile === undefined) {
    throw new Error("product.architecture profile returned no profile payload.");
  }

  const phases = [...profile.phases]
    .sort((left, right) => right.milliseconds - left.milliseconds);
  const displayedPhases = Number.isFinite(phaseRows)
    ? phases.slice(0, Math.max(0, phaseRows))
    : phases;
  const label = productArchitectureProfileLaneName(
    profile.includeFunctionBodyAnalysis,
    profile.includeCallSites,
    profile.includeCallDetails,
    profile.includeSymbols,
    profile.includeKernelRecords,
  );

  console.log(
    `product.architecture ${label} profile: ${profile.totalMilliseconds.toFixed(1)}ms analysis, ${(performance.now() - started).toFixed(1)}ms warm request`,
  );

  if (displayedPhases.length < phases.length) {
    console.log(`showing top ${displayedPhases.length}/${phases.length} phase row(s); pass --detail or --phaseRows=... to widen`);
  }

  for (const row of displayedPhases) {
    const count = row.count === null ? "" : ` (${row.count} row(s))`;
    console.log(`- ${row.phase}: ${row.milliseconds.toFixed(1)}ms${count}`);
  }
  console.log("");
}
