import { spawnSync } from "node:child_process";

export function repositoryIdentity(root) {
  const options = { encoding: "utf8", windowsHide: true, stdio: "pipe" };
  const head = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], options);
  if (head.status !== 0) return { revision: null, dirty: null };

  const revision = head.stdout.trim();
  const status = spawnSync("git", ["-C", root, "status", "--porcelain=v1"], options);
  if (status.status !== 0) return { revision, dirty: null };
  if (status.stdout.trim().length > 0) return { revision, dirty: true };
  // Git can succeed with a partial scan when a directory disappears concurrently.
  return { revision, dirty: status.stderr.length > 0 ? null : false };
}
