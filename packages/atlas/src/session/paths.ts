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
  /** Compiled daemon entrypoint started by the supervisor. */
  readonly daemonEntry: string;
}

/** Filesystem paths for one compatibility-keyed daemon profile. */
export interface InquirySessionProfilePaths {
  /** Short stable key derived from the session compatibility hash. */
  readonly profileKey: string;
  /** Directory for this compatibility profile's manifest, lock, and logs. */
  readonly profileDir: string;
  /** JSON manifest path for this profile's active daemon lease. */
  readonly manifestPath: string;
  /** Atomic lock path used to singleflight cold daemon startup for this profile. */
  readonly startupLockPath: string;
  /** Log file receiving this profile daemon's stdout. */
  readonly stdoutPath: string;
  /** Log file receiving this profile daemon's stderr. */
  readonly stderrPath: string;
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
    daemonEntry: join(normalizedPackageRoot, "dist", "session", "daemon.js"),
  };
}

/** Resolve the default manifest, lock, and log paths for one source/build compatibility hash. */
export function resolveInquirySessionProfilePaths(
  /** Base package/session paths. */
  paths: InquirySessionPaths,
  /** Full session compatibility hash. */
  compatibilityHash: string,
): InquirySessionProfilePaths {
  const profileKey = sessionProfileKeyForCompatibilityHash(compatibilityHash);
  const profileDir = join(paths.sessionDir, "profiles", profileKey);
  return {
    profileKey,
    profileDir,
    manifestPath: join(profileDir, "session.json"),
    startupLockPath: join(profileDir, "startup.lock.json"),
    stdoutPath: join(profileDir, "daemon.stdout.log"),
    stderrPath: join(profileDir, "daemon.stderr.log"),
  };
}

/** Return a path-safe compact profile key for one compatibility hash. */
export function sessionProfileKeyForCompatibilityHash(
  /** Full session compatibility hash. */
  compatibilityHash: string,
): string {
  const hashBody = compatibilityHash.includes(":")
    ? compatibilityHash.slice(compatibilityHash.indexOf(":") + 1)
    : compatibilityHash;
  const key = hashBody
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
  return key.length === 0 ? "default" : key;
}
