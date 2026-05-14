import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { readTextFileOrNull } from "../../source/index.js";

/** Source baseline for the curated framework.router descriptor maps. */
export const FRAMEWORK_ROUTER_SOURCE_BASELINE = {
  sourceRoot: "aurelia",
  aureliaCommit: "fe12b6c8d96dfdafc2f5e7bb16808391e111b3a1",
  routerPackageRoots: [
    "aurelia/packages/router/src",
    "aurelia/packages/route-recognizer/src",
  ],
  flowDescriptorCount: 81,
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
      return `Curated router descriptors match Aurelia ${FRAMEWORK_ROUTER_SOURCE_BASELINE.aureliaCommit}.`;
    case "drifted":
      return `Curated router descriptors were authored for Aurelia ${FRAMEWORK_ROUTER_SOURCE_BASELINE.aureliaCommit}, but the checkout is ${actualAureliaCommit}. Re-run framework.router flow and recognizer issue projections before trusting the map.`;
    case "unknown":
    default:
      return `Could not read the Aurelia checkout commit for curated router descriptors authored against ${FRAMEWORK_ROUTER_SOURCE_BASELINE.aureliaCommit}.`;
  }
}

function readGitHead(workTreeRoot: string): string | null {
  const gitDir = readGitDir(workTreeRoot);
  if (gitDir === null) {
    return null;
  }
  const headText = readTextFileOrNull(path.join(gitDir, "HEAD"));
  if (headText === null) {
    return null;
  }
  const head = headText.trim();
  if (!head.startsWith("ref: ")) {
    return looksLikeSha(head) ? head : null;
  }
  const ref = head.slice("ref: ".length).trim();
  return readGitRef(gitDir, ref);
}

function readGitDir(workTreeRoot: string): string | null {
  const gitPath = path.join(workTreeRoot, ".git");
  if (!existsSync(gitPath)) {
    return null;
  }
  if (statSync(gitPath).isDirectory()) {
    return gitPath;
  }
  const text = readTextFileOrNull(gitPath);
  const prefix = "gitdir:";
  if (text === null || !text.startsWith(prefix)) {
    return null;
  }
  const gitDir = text.slice(prefix.length).trim();
  return path.resolve(workTreeRoot, gitDir);
}

function readGitRef(gitDir: string, ref: string): string | null {
  const looseRef = readTextFileOrNull(path.join(gitDir, ref))?.trim();
  if (looseRef !== undefined && looseRef !== null && looksLikeSha(looseRef)) {
    return looseRef;
  }
  const packedRefs = readTextFileOrNull(path.join(gitDir, "packed-refs"));
  if (packedRefs === null) {
    return null;
  }
  for (const line of packedRefs.split(/\r?\n/u)) {
    if (line.length === 0 || line.startsWith("#") || line.startsWith("^")) {
      continue;
    }
    const [sha, name] = line.split(" ");
    if (name === ref && sha !== undefined && looksLikeSha(sha)) {
      return sha;
    }
  }
  return null;
}

function looksLikeSha(value: string): boolean {
  return /^[0-9a-f]{40}$/u.test(value);
}
