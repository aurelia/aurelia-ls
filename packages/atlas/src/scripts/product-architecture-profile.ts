import { performance } from "node:perf_hooks";

import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";

interface ProductArchitectureProfileValue {
  readonly profile?: {
    readonly includeCallSites: boolean;
    readonly includeSymbols: boolean;
    readonly totalMilliseconds: number;
    readonly phases: readonly {
      readonly phase: string;
      readonly milliseconds: number;
      readonly count: number | null;
    }[];
  };
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

for (const lane of [
  { includeCallSites: false, includeSymbols: false },
  { includeCallSites: true, includeSymbols: false },
  { includeCallSites: false, includeSymbols: true },
  { includeCallSites: true, includeSymbols: true },
]) {
  await printProfile(lane.includeCallSites, lane.includeSymbols);
}

async function printProfile(
  includeCallSites: boolean,
  includeSymbols: boolean,
): Promise<void> {
  const started = performance.now();
  const answer = await api.ask({
    lens: LensId.ProductArchitecture,
    locus: RepoRootLocus,
    projection: "profile",
    filters: { includeCallSites, includeSymbols },
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
  const label = profileLaneName(
    profile.includeCallSites,
    profile.includeSymbols,
  );

  console.log(
    `product.architecture ${label} profile: ${profile.totalMilliseconds.toFixed(1)}ms analysis, ${(performance.now() - started).toFixed(1)}ms request`,
  );

  for (const row of phases) {
    const count = row.count === null ? "" : ` (${row.count} row(s))`;
    console.log(`- ${row.phase}: ${row.milliseconds.toFixed(1)}ms${count}`);
  }
  console.log("");
}

function profileLaneName(
  includeCallSites: boolean,
  includeSymbols: boolean,
): string {
  if (includeCallSites && includeSymbols) {
    return "full";
  }
  if (includeCallSites) {
    return "core";
  }
  if (includeSymbols) {
    return "symbol";
  }
  return "structure";
}
