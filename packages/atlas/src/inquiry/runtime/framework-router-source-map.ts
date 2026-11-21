import { spawnSync } from "node:child_process";
import path from "node:path";

/** Source baseline for the curated framework.router descriptor maps. */
export const FRAMEWORK_ROUTER_SOURCE_BASELINE = {
  sourceRoot: "aurelia",
  aureliaCommit: "4ff60906593bdedc9f9dc6003606ba138df87f0e",
  routerPackageRoots: [
    "aurelia/packages/router/src",
    "aurelia/packages/route-recognizer/src",
  ],
  flowDescriptorCount: 88,
  routeRecognizerMechanicDescriptorCount: 69,
} as const;

export type FrameworkRouterSourceStateKind =
  | "matched"
  | "drifted"
  | "unknown";

/** Runtime source state for the curated router analysis map. */
export interface FrameworkRouterSourceState {
  readonly baseline: typeof FRAMEWORK_ROUTER_SOURCE_BASELINE;
  readonly actualAureliaCommit: string | null;
  readonly status: FrameworkRouterSourceStateKind;
  readonly summary: string;
}

export function readFrameworkRouterSourceState(
  repoRoot: string,
): FrameworkRouterSourceState {
  const actualAureliaCommit = readGitHead(
    path.join(repoRoot, FRAMEWORK_ROUTER_SOURCE_BASELINE.sourceRoot),
  );
  const status =
    actualAureliaCommit === null
      ? "unknown"
      : actualAureliaCommit === FRAMEWORK_ROUTER_SOURCE_BASELINE.aureliaCommit
        ? "matched"
        : "drifted";
  return {
    baseline: FRAMEWORK_ROUTER_SOURCE_BASELINE,
    actualAureliaCommit,
    status,
    summary: sourceStateSummary(status, actualAureliaCommit),
  };
}

function sourceStateSummary(
  status: FrameworkRouterSourceStateKind,
  actualAureliaCommit: string | null,
): string {
  switch (status) {
    case "matched":
      return `The Aurelia checkout HEAD matches the router descriptor baseline ${FRAMEWORK_ROUTER_SOURCE_BASELINE.aureliaCommit}.`;
    case "drifted":
      return `Curated router descriptors were authored for Aurelia ${FRAMEWORK_ROUTER_SOURCE_BASELINE.aureliaCommit}, but the checkout is ${actualAureliaCommit}. Re-run framework.router flow and recognizer issue projections before trusting the map.`;
    case "unknown":
    default:
      return `Could not read the Aurelia checkout commit for curated router descriptors authored against ${FRAMEWORK_ROUTER_SOURCE_BASELINE.aureliaCommit}.`;
  }
}

function readGitHead(workTreeRoot: string): string | null {
  // Pin the gitdir explicitly. A missing submodule must not resolve to the parent repository.
  const result = spawnSync("git", ["--git-dir=.git", "rev-parse", "--verify", "HEAD^{commit}"], {
    cwd: workTreeRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}
