import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname } from "node:path";

import type { Answer } from "../inquiry/answer.js";
import type { Continuation } from "../inquiry/continuation.js";
import type { LensId } from "../inquiry/lens.js";
import type { InquiryRuntimeRequest } from "../inquiry/runtime/index.js";
import type { InquirySurfaceMap } from "../inquiry/surface-map.js";
import { computeSessionCompatibilityHash } from "./hash.js";
import { readInquirySessionManifest, removeInquirySessionManifest } from "./manifest.js";
import {
  resolveInquirySessionPaths,
  resolveInquirySessionProfilePaths,
  type InquirySessionPaths,
} from "./paths.js";
import { isProcessAlive } from "./process.js";
import {
  InquirySessionMethod,
  type InquirySessionFollowParams,
  type InquirySessionFrameworkEmulationSymbolsReportResult,
  type InquirySessionManifest,
  type InquirySessionMapParams,
  type InquirySessionRequest,
  type InquirySessionResponse,
  type InquirySessionSelfCheckResult,
  type InquirySessionShutdownParams,
  type InquirySessionShutdownResult,
  type InquirySessionStatus,
} from "./protocol.js";

/** Default time a daemon can sit idle before exiting itself. */
export const DEFAULT_SESSION_IDLE_TTL_MS = 10 * 60 * 1000;

/** Default interval for daemon manifest heartbeats. */
export const DEFAULT_SESSION_HEARTBEAT_INTERVAL_MS = 2_000;

/** Default request timeout for source-backed inquiry work. */
export const DEFAULT_SESSION_REQUEST_TIMEOUT_MS = 30_000;

/** Default startup timeout while the daemon publishes and answers its first status probe. */
export const DEFAULT_SESSION_STARTUP_TIMEOUT_MS = 180_000;

const STARTUP_LOCK_SCHEMA_VERSION = "atlas-session-startup-lock-v1" as const;

const pendingEnsures = new Map<string, Promise<InquirySessionClient>>();
const compatibilityHashCache = new Map<string, string>();

/** Options shared by session connection and startup helpers. */
export interface InquirySessionOptions {
  /** Package root override for tests or unusual launchers. */
  readonly packageRoot?: string;
  /** Manifest path override for isolated experiments. */
  readonly manifestPath?: string;
  /** Build hash override when the caller already computed it. */
  readonly buildHash?: string;
  /** Request timeout used while probing or calling the daemon. */
  readonly requestTimeoutMs?: number;
}

/** Options for idempotently ensuring a daemon exists. */
export interface EnsureInquirySessionOptions extends InquirySessionOptions {
  /** Startup timeout while waiting for the daemon manifest and status response. */
  readonly startupTimeoutMs?: number;
  /** Idle timeout passed to a newly started daemon. */
  readonly idleTtlMs?: number;
  /** Heartbeat interval passed to a newly started daemon. */
  readonly heartbeatIntervalMs?: number;
}

interface ResolvedEnsureInquirySessionOptions {
  readonly paths: InquirySessionPaths;
  readonly manifestPath: string;
  readonly startupLockPath: string;
  readonly stdoutPath: string;
  readonly stderrPath: string;
  readonly buildHash: string;
  readonly requestTimeoutMs: number;
  readonly startupTimeoutMs: number;
  readonly idleTtlMs: number;
  readonly heartbeatIntervalMs: number;
}

interface InquirySessionStartupLock {
  readonly schemaVersion: typeof STARTUP_LOCK_SCHEMA_VERSION;
  readonly packageName: "@aurelia-ls/atlas";
  readonly pid: number;
  readonly buildHash: string;
  readonly manifestPath: string;
  readonly packageRoot: string;
  readonly createdAt: string;
}

interface StartupLockHandle {
  readonly path: string;
  readonly pid: number;
}

/** Client for a running local inquiry session daemon. */
export class InquirySessionClient {
  constructor(
    /** Manifest used to reach this daemon. */
    readonly manifest: InquirySessionManifest,
    /** Request timeout applied to protocol calls. */
    readonly requestTimeoutMs: number = DEFAULT_SESSION_REQUEST_TIMEOUT_MS,
  ) {}

  /** Return daemon identity and cheap world summary. */
  status(): Promise<InquirySessionStatus> {
    return sendProtocolRequest(this.manifest, InquirySessionMethod.Status, undefined, this.requestTimeoutMs);
  }

  /** Return the surface map through the daemon-held runtime API. */
  map(focus?: string): Promise<Answer<InquirySurfaceMap>> {
    const params: InquirySessionMapParams | undefined = focus === undefined ? undefined : { focus };
    return sendProtocolRequest<Answer<InquirySurfaceMap>>(this.manifest, InquirySessionMethod.Map, params, this.requestTimeoutMs);
  }

  /** Ask one inquiry through the daemon-held runtime API. */
  ask(input: InquiryRuntimeRequest): Promise<Answer> {
    return sendProtocolRequest<Answer>(this.manifest, InquirySessionMethod.Ask, input, this.requestTimeoutMs);
  }

  /** Follow one continuation through the daemon-held runtime API. */
  follow(continuation: Continuation): Promise<Answer> {
    const params: InquirySessionFollowParams = { continuation };
    return sendProtocolRequest<Answer>(this.manifest, InquirySessionMethod.Follow, params, this.requestTimeoutMs);
  }

  /** Build the deterministic framework emulation symbols Markdown report. */
  frameworkEmulationSymbolsReport(): Promise<InquirySessionFrameworkEmulationSymbolsReportResult> {
    return sendProtocolRequest(this.manifest, InquirySessionMethod.FrameworkEmulationSymbolsReport, undefined, this.requestTimeoutMs);
  }

  /** Run lightweight self-coherence checks inside the daemon. */
  selfCheck(): Promise<InquirySessionSelfCheckResult> {
    return sendProtocolRequest(this.manifest, InquirySessionMethod.SelfCheck, undefined, this.requestTimeoutMs);
  }

  /** Politely stop the daemon after it responds. */
  shutdown(reason = "client requested shutdown"): Promise<InquirySessionShutdownResult> {
    const params: InquirySessionShutdownParams = { reason };
    return sendProtocolRequest(this.manifest, InquirySessionMethod.Shutdown, params, this.requestTimeoutMs);
  }

  /** True when a lens id is implemented by this daemon's runtime. */
  async isImplemented(lens: LensId): Promise<boolean> {
    const status = await this.status();
    return status.implementedLensIds.includes(lens);
  }
}

/** Idempotently return a compatible running inquiry session, starting one when needed. */
export function ensureInquirySession(
  /** Session startup and probing options. */
  options: EnsureInquirySessionOptions = {},
): Promise<InquirySessionClient> {
  const paths = resolveInquirySessionPaths(options.packageRoot);
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_SESSION_REQUEST_TIMEOUT_MS;
  const buildHash = options.buildHash ?? cachedSessionCompatibilityHash(paths);
  const profilePaths = resolveInquirySessionProfilePaths(paths, buildHash);
  const manifestPath = options.manifestPath ?? profilePaths.manifestPath;
  const startupLockPath = options.manifestPath === undefined
    ? profilePaths.startupLockPath
    : `${manifestPath}.startup.lock.json`;
  const stdoutPath = options.manifestPath === undefined
    ? profilePaths.stdoutPath
    : `${manifestPath}.stdout.log`;
  const stderrPath = options.manifestPath === undefined
    ? profilePaths.stderrPath
    : `${manifestPath}.stderr.log`;
  const resolved: ResolvedEnsureInquirySessionOptions = {
    paths,
    manifestPath,
    startupLockPath,
    stdoutPath,
    stderrPath,
    buildHash,
    requestTimeoutMs,
    startupTimeoutMs: options.startupTimeoutMs ?? DEFAULT_SESSION_STARTUP_TIMEOUT_MS,
    idleTtlMs: options.idleTtlMs ?? DEFAULT_SESSION_IDLE_TTL_MS,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? DEFAULT_SESSION_HEARTBEAT_INTERVAL_MS,
  };
  const pendingKey = [
    paths.packageRoot,
    manifestPath,
    startupLockPath,
    buildHash,
    requestTimeoutMs,
    resolved.startupTimeoutMs,
  ].join("\0");
  const pending = pendingEnsures.get(pendingKey);
  if (pending !== undefined) {
    return pending;
  }

  const promise = ensureInquirySessionOnce(resolved);
  pendingEnsures.set(pendingKey, promise);
  void promise.then(
    () => {
      if (pendingEnsures.get(pendingKey) === promise) {
        pendingEnsures.delete(pendingKey);
      }
    },
    () => {
      if (pendingEnsures.get(pendingKey) === promise) {
        pendingEnsures.delete(pendingKey);
      }
    },
  );
  return promise;
}

/** Return the process-local compatibility hash for this package root and source-admission environment. */
function cachedSessionCompatibilityHash(
  /** Resolved session paths. */
  paths: InquirySessionPaths,
): string {
  const cacheKey = sessionCompatibilityCacheKey(paths);
  const cached = compatibilityHashCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const hash = computeSessionCompatibilityHash({ packageRoot: paths.packageRoot });
  compatibilityHashCache.set(cacheKey, hash);
  return hash;
}

/** Build the cache key for environment-sensitive source package admission. */
function sessionCompatibilityCacheKey(
  /** Resolved session paths. */
  paths: InquirySessionPaths,
): string {
  return [
    paths.packageRoot,
    process.env.ATLAS_AURELIA_FRAMEWORK_ROOT ?? "",
    process.env.ATLAS_AURELIA_PLUGIN_ROOT ?? "",
    process.env.ATLAS_EXTERNAL_SOURCE_ROOTS ?? "",
  ].join("\0");
}

async function ensureInquirySessionOnce(
  /** Fully resolved session startup options. */
  options: ResolvedEnsureInquirySessionOptions,
): Promise<InquirySessionClient> {
  const { manifestPath, requestTimeoutMs, buildHash } = options;
  const existing = await probeManifestPath(manifestPath, requestTimeoutMs);

  if (existing !== undefined) {
    if (existing.status.buildHash === buildHash) {
      return existing.client;
    }
  }

  return waitForOrStartCompatibleSession(options);
}

/** Connect to an existing compatible session without starting a daemon. */
export async function connectExistingInquirySession(
  /** Session probing options. */
  options: InquirySessionOptions = {},
): Promise<InquirySessionClient | undefined> {
  const paths = resolveInquirySessionPaths(options.packageRoot);
  const buildHash = options.buildHash ?? cachedSessionCompatibilityHash(paths);
  const profilePaths = resolveInquirySessionProfilePaths(paths, buildHash);
  const manifestPath = options.manifestPath ?? profilePaths.manifestPath;
  const probed = await probeManifestPath(manifestPath, options.requestTimeoutMs ?? DEFAULT_SESSION_REQUEST_TIMEOUT_MS);
  if (probed === undefined) {
    return undefined;
  }
  if (probed.status.buildHash !== buildHash) {
    return undefined;
  }
  return probed.client;
}

/** Politely stop an existing session without starting a new daemon. */
export async function shutdownExistingInquirySession(
  /** Session probing options. */
  options: InquirySessionOptions & { readonly reason?: string } = {},
): Promise<boolean> {
  const client = await connectExistingInquirySession(options);
  if (client === undefined) {
    return false;
  }
  await client.shutdown(options.reason ?? "shutdown helper requested shutdown");
  return true;
}

/** Wait for an in-flight cold startup or become the one process allowed to spawn it. */
async function waitForOrStartCompatibleSession(
  /** Fully resolved session startup options. */
  options: ResolvedEnsureInquirySessionOptions,
): Promise<InquirySessionClient> {
  const deadline = Date.now() + options.startupTimeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const probed = await probeManifestPath(options.manifestPath, options.requestTimeoutMs).catch((error: unknown) => {
      lastError = error;
      return undefined;
    });
    if (probed?.status.buildHash === options.buildHash) {
      return probed.client;
    }

    const lock = tryAcquireStartupLock(options);
    if (lock !== undefined) {
      try {
        return await startCompatibleSessionUnderLock(options);
      } finally {
        releaseStartupLock(lock);
      }
    }

    removeStaleStartupLock(options.startupLockPath, options.startupTimeoutMs);
    await sleep(100);
  }

  throw new Error(`Timed out waiting for Atlas session startup lock.${lastError instanceof Error ? ` Last error: ${lastError.message}` : ""}`);
}

/** Re-check session state under the startup lock, then spawn exactly one daemon if still needed. */
async function startCompatibleSessionUnderLock(
  /** Fully resolved session startup options. */
  options: ResolvedEnsureInquirySessionOptions,
): Promise<InquirySessionClient> {
  const existing = await probeManifestPath(options.manifestPath, options.requestTimeoutMs);
  if (existing !== undefined) {
    if (existing.status.buildHash === options.buildHash) {
      return existing.client;
    }
    await existing.client.shutdown(`build hash changed from ${existing.status.buildHash} to ${options.buildHash}`).catch(() => undefined);
    await sleep(250);
  } else {
    const staleManifest = readInquirySessionManifest(options.manifestPath);
    if (staleManifest !== undefined) {
      removeInquirySessionManifest(options.manifestPath, staleManifest.pid);
      await sleep(250);
    }
  }

  startInquirySessionDaemon(options.paths, {
    manifestPath: options.manifestPath,
    buildHash: options.buildHash,
    idleTtlMs: options.idleTtlMs,
    heartbeatIntervalMs: options.heartbeatIntervalMs,
    stdoutPath: options.stdoutPath,
    stderrPath: options.stderrPath,
  });

  return waitForCompatibleSession(options.manifestPath, options.buildHash, {
    requestTimeoutMs: options.requestTimeoutMs,
    startupTimeoutMs: options.startupTimeoutMs,
  });
}

/** Start a detached daemon process from compiled build output. */
function startInquirySessionDaemon(
  /** Resolved package and log paths. */
  paths: InquirySessionPaths,
  /** Startup identity supplied to the daemon. */
  options: {
    /** Manifest path the daemon should own. */
    readonly manifestPath: string;
    /** Build hash the daemon should advertise. */
    readonly buildHash: string;
    /** Idle timeout before self-exit. */
    readonly idleTtlMs: number;
    /** Manifest heartbeat interval. */
    readonly heartbeatIntervalMs: number;
    /** Log file receiving daemon stdout. */
    readonly stdoutPath: string;
    /** Log file receiving daemon stderr. */
    readonly stderrPath: string;
  },
): void {
  if (!existsSync(paths.daemonEntry)) {
    throw new Error(`Cannot start Atlas session because ${paths.daemonEntry} does not exist. Build the package first.`);
  }

  mkdirSync(dirname(options.stdoutPath), { recursive: true });
  mkdirSync(dirname(options.stderrPath), { recursive: true });
  const stdout = openSync(options.stdoutPath, "a");
  const stderr = openSync(options.stderrPath, "a");
  const child = spawn(process.execPath, [
    paths.daemonEntry,
    "--manifest", options.manifestPath,
    "--build-hash", options.buildHash,
    "--package-root", paths.packageRoot,
    "--idle-ttl-ms", String(options.idleTtlMs),
    "--heartbeat-interval-ms", String(options.heartbeatIntervalMs),
  ], {
    cwd: paths.packageRoot,
    detached: true,
    stdio: ["ignore", stdout, stderr],
    windowsHide: true,
  });

  child.unref();
  closeSync(stdout);
  closeSync(stderr);
}

/** Try to claim the cross-process startup lock through atomic file creation. */
function tryAcquireStartupLock(
  /** Fully resolved session startup options. */
  options: ResolvedEnsureInquirySessionOptions,
): StartupLockHandle | undefined {
  mkdirSync(dirname(options.startupLockPath), { recursive: true });
  let descriptor: number;
  try {
    descriptor = openSync(options.startupLockPath, "wx");
  } catch (error) {
    if (isFileAlreadyExistsError(error)) {
      return undefined;
    }
    throw error;
  }

  const lock: InquirySessionStartupLock = {
    schemaVersion: STARTUP_LOCK_SCHEMA_VERSION,
    packageName: "@aurelia-ls/atlas",
    pid: process.pid,
    buildHash: options.buildHash,
    manifestPath: options.manifestPath,
    packageRoot: options.paths.packageRoot,
    createdAt: new Date().toISOString(),
  };

  try {
    writeFileSync(descriptor, `${JSON.stringify(lock, null, 2)}\n`);
  } finally {
    closeSync(descriptor);
  }
  return { path: options.startupLockPath, pid: process.pid };
}

/** Release a startup lock only when it is still owned by this process. */
function releaseStartupLock(
  /** Lock handle returned by tryAcquireStartupLock. */
  lock: StartupLockHandle,
): void {
  const current = readStartupLock(lock.path);
  if (current?.pid === lock.pid) {
    rmSync(lock.path, { force: true });
  }
}

/** Remove abandoned or expired startup locks so future callers can make progress. */
function removeStaleStartupLock(
  /** Lock path to inspect. */
  lockPath: string,
  /** Maximum age before a live lock is treated as abandoned. */
  startupTimeoutMs: number,
): void {
  const current = readStartupLock(lockPath);
  if (current === undefined) {
    if (existsSync(lockPath)) {
      rmSync(lockPath, { force: true });
    }
    return;
  }

  const createdAtMs = Date.parse(current.createdAt);
  const expired = Number.isNaN(createdAtMs) || Date.now() - createdAtMs > startupTimeoutMs;
  if (!isProcessAlive(current.pid) || expired) {
    rmSync(lockPath, { force: true });
  }
}

/** Read a startup lock if it has the expected broad shape. */
function readStartupLock(
  /** Lock path to read. */
  lockPath: string,
): InquirySessionStartupLock | undefined {
  if (!existsSync(lockPath)) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(readFileSync(lockPath, "utf8")) as Partial<InquirySessionStartupLock>;
    if (
      parsed.schemaVersion !== STARTUP_LOCK_SCHEMA_VERSION
      || parsed.packageName !== "@aurelia-ls/atlas"
      || typeof parsed.pid !== "number"
      || parsed.pid <= 0
      || typeof parsed.buildHash !== "string"
      || typeof parsed.manifestPath !== "string"
      || typeof parsed.packageRoot !== "string"
      || typeof parsed.createdAt !== "string"
    ) {
      return undefined;
    }
    return parsed as InquirySessionStartupLock;
  } catch {
    return undefined;
  }
}

/** Wait until a compatible daemon has written a manifest and answered status. */
async function waitForCompatibleSession(
  /** Manifest path to poll. */
  manifestPath: string,
  /** Required build hash. */
  buildHash: string,
  /** Polling options. */
  options: {
    /** Request timeout for each probe. */
    readonly requestTimeoutMs: number;
    /** Overall startup timeout. */
    readonly startupTimeoutMs: number;
  },
): Promise<InquirySessionClient> {
  const deadline = Date.now() + options.startupTimeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const probed = await probeManifestPath(manifestPath, options.requestTimeoutMs).catch((error: unknown) => {
      lastError = error;
      return undefined;
    });
    if (probed?.status.buildHash === buildHash) {
      return probed.client;
    }
    await sleep(100);
  }

  throw new Error(`Timed out waiting for Atlas session to start.${lastError instanceof Error ? ` Last error: ${lastError.message}` : ""}`);
}

/** Probe the manifest path and return a live client plus status when possible. */
async function probeManifestPath(
  /** Manifest path to read. */
  manifestPath: string,
  /** Request timeout for the status probe. */
  requestTimeoutMs: number,
): Promise<{ readonly client: InquirySessionClient; readonly status: InquirySessionStatus } | undefined> {
  const manifest = readInquirySessionManifest(manifestPath);
  if (manifest === undefined) {
    return undefined;
  }

  const client = new InquirySessionClient(manifest, requestTimeoutMs);
  try {
    const status = await client.status();
    if (
      status.pid !== manifest.pid
      || status.buildHash !== manifest.buildHash
      || status.endpoint.port !== manifest.endpoint.port
    ) {
      return undefined;
    }
    return { client, status };
  } catch {
    return undefined;
  }
}

/** Send one line-delimited JSON request to a daemon and return the typed result. */
function sendProtocolRequest<TResult>(
  /** Manifest containing the daemon endpoint. */
  manifest: InquirySessionManifest,
  /** Protocol method to invoke. */
  method: InquirySessionMethod,
  /** Method-specific params. */
  params: unknown,
  /** Request timeout in milliseconds. */
  timeoutMs: number,
): Promise<TResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const id = `${Date.now()}:${process.pid}:${Math.random().toString(36).slice(2)}`;
    const request: InquirySessionRequest = params === undefined ? { id, method } : { id, method, params };
    const socket = createConnection({ host: manifest.endpoint.host, port: manifest.endpoint.port });
    let buffer = "";
    let settled = false;
    const timer = setTimeout(() => {
      settle("reject", new Error(`Timed out waiting for Atlas session method ${method}.`));
    }, timeoutMs);
    timer.unref();

    socket.setEncoding("utf8");
    socket.once("connect", () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim().length === 0) {
          continue;
        }
        let response: InquirySessionResponse<TResult>;
        try {
          response = JSON.parse(line) as InquirySessionResponse<TResult>;
        } catch (error) {
          settle("reject", error instanceof Error ? error : new Error(String(error)));
          return;
        }
        if (response.id !== id) {
          continue;
        }
        if (response.ok) {
          settle("resolve", response.result);
        } else {
          settle("reject", new Error(`${response.error.code}: ${response.error.message}`));
        }
      }
    });
    socket.once("error", (error) => {
      settle("reject", error);
    });
    socket.once("end", () => {
      if (!settled) {
        settle("reject", new Error(`Atlas session closed before answering ${method}.`));
      }
    });

    function settle(kind: "resolve", value: TResult): void;
    function settle(kind: "reject", value: Error): void;
    function settle(kind: "resolve" | "reject", value: TResult | Error): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (kind === "resolve") {
        resolvePromise(value as TResult);
      } else {
        rejectPromise(value);
      }
    }
  });
}

/** Return true when an error came from an existing atomic lock file. */
function isFileAlreadyExistsError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { readonly code?: unknown }).code === "EEXIST";
}

/** Sleep for the requested interval while polling daemon startup. */
function sleep(
  /** Milliseconds to wait. */
  ms: number,
): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
