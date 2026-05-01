import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Filesystem paths used by the local inquiry session workbench. */
export interface InquirySessionPaths {
  /** Absolute package root for atlas. */
  readonly packageRoot: string;
  /** Absolute repository root that owns the ignored temp directory. */
  readonly repoRoot: string;
  /** Directory for session manifests and daemon logs. */
  readonly sessionDir: string;
  /** JSON manifest path for the active daemon lease. */
  readonly manifestPath: string;
  /** Atomic lock path used to singleflight cold daemon startup. */
  readonly startupLockPath: string;
  /** Log file receiving daemon stdout. */
  readonly stdoutPath: string;
  /** Log file receiving daemon stderr. */
  readonly stderrPath: string;
  /** Compiled daemon entrypoint started by the supervisor. */
  readonly daemonEntry: string;
}

/** Resolve the package root from a module URL inside src/session or dist/session. */
export function resolvePackageRoot(
  /** Module URL used as the anchor. */
  moduleUrl: string = import.meta.url,
): string {
  return resolve(dirname(fileURLToPath(moduleUrl)), "../..");
}

/** Resolve all session paths from an optional package root. */
export function resolveInquirySessionPaths(
  /** Package root override for tests or unusual launchers. */
  packageRoot: string = resolvePackageRoot(),
): InquirySessionPaths {
  const normalizedPackageRoot = resolve(packageRoot);
  const repoRoot = resolve(normalizedPackageRoot, "../..");
  const sessionDir = join(repoRoot, ".temp", "atlas", "session");

  return {
    packageRoot: normalizedPackageRoot,
    repoRoot,
    sessionDir,
    manifestPath: join(sessionDir, "session.json"),
    startupLockPath: join(sessionDir, "startup.lock.json"),
    stdoutPath: join(sessionDir, "daemon.stdout.log"),
    stderrPath: join(sessionDir, "daemon.stderr.log"),
    daemonEntry: join(normalizedPackageRoot, "dist", "session", "daemon.js"),
  };
}
