import { performance } from "node:perf_hooks";

import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";

interface WorkspaceArchitectureProfileValue {
  readonly profile?: {
    readonly totalMilliseconds: number;
    readonly phases: readonly {
      readonly name: string;
      readonly milliseconds: number;
      readonly rowCount: number;
    }[];
  };
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const warmupStarted = performance.now();
await api.status();
const warmupMilliseconds = performance.now() - warmupStarted;

const started = performance.now();
const answer = await api.ask({
  lens: LensId.WorkspaceArchitecture,
  locus: RepoRootLocus,
  projection: "profile",
  budget: { rows: 1, evidencePerSubject: 0 },
});

if (answer.outcome !== OutcomeKind.Hit) {
  throw new Error(`workspace.architecture profile returned ${answer.outcome}.`);
}

const profile = (answer.value as WorkspaceArchitectureProfileValue | undefined)?.profile;
if (profile === undefined) {
  throw new Error("workspace.architecture profile answer did not include profile data.");
}
const requestMilliseconds = performance.now() - started;

console.log(
  `workspace.architecture profile: ${profile.totalMilliseconds.toFixed(1)}ms analysis, ${requestMilliseconds.toFixed(1)}ms warm request, ${warmupMilliseconds.toFixed(1)}ms startup/status`,
);
const requestDeltaMilliseconds = requestMilliseconds - profile.totalMilliseconds;
if (requestDeltaMilliseconds >= 0) {
  console.log(
    `- request overhead outside analysis: ${requestDeltaMilliseconds.toFixed(1)}ms`,
  );
} else {
  console.log(
    `- hot request reused cached analysis profile: ${Math.abs(requestDeltaMilliseconds).toFixed(1)}ms below stored analysis time`,
  );
}
for (const phase of [...profile.phases].sort((left, right) =>
  right.milliseconds - left.milliseconds ||
  left.name.localeCompare(right.name),
)) {
  console.log(
    `- ${phase.name}: ${phase.milliseconds.toFixed(1)}ms (${phase.rowCount} row(s))`,
  );
}
