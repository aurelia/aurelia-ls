import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { createConnection } from "node:net";

import type { Answer } from "../inquiry/answer.js";
import type { Continuation } from "../inquiry/continuation.js";
import type { LensId } from "../inquiry/lens.js";
import type { InquiryRuntimeRequest } from "../inquiry/runtime/index.js";
import type { InquirySurfaceMap } from "../inquiry/surface-map.js";
import { computeBuildOutputHash } from "./hash.js";
import { readInquirySessionManifest } from "./manifest.js";
import { resolveInquirySessionPaths, type InquirySessionPaths } from "./paths.js";
import {
  InquirySessionMethod,
  type InquirySessionFollowParams,
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

/** Client for a running local inquiry session daemon. */
export class InquirySessionClient {
  constructor(
    /** Manifest used to reach this daemon. */
    readonly manifest: InquirySessionManifest,
    /** Request timeout applied to protocol calls. */
    readonly requestTimeoutMs: number = 5_000,
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
export async function ensureInquirySession(
  /** Session startup and probing options. */
  options: EnsureInquirySessionOptions = {},
): Promise<InquirySessionClient> {
  const paths = resolveInquirySessionPaths(options.packageRoot);
  const manifestPath = options.manifestPath ?? paths.manifestPath;
  const requestTimeoutMs = options.requestTimeoutMs ?? 2_000;
  const buildHash = options.buildHash ?? computeBuildOutputHash({ packageRoot: paths.packageRoot });
  const existing = await probeManifestPath(manifestPath, requestTimeoutMs);

  if (existing !== undefined) {
    if (existing.status.buildHash === buildHash) {
      return existing.client;
    }
    await existing.client.shutdown(`build hash changed from ${existing.status.buildHash} to ${buildHash}`).catch(() => undefined);
    await sleep(250);
  }

  startInquirySessionDaemon(paths, {
    manifestPath,
    buildHash,
    idleTtlMs: options.idleTtlMs ?? DEFAULT_SESSION_IDLE_TTL_MS,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? DEFAULT_SESSION_HEARTBEAT_INTERVAL_MS,
  });

  return waitForCompatibleSession(manifestPath, buildHash, {
    requestTimeoutMs,
    startupTimeoutMs: options.startupTimeoutMs ?? 15_000,
  });
}

/** Connect to an existing compatible session without starting a daemon. */
export async function connectExistingInquirySession(
  /** Session probing options. */
  options: InquirySessionOptions = {},
): Promise<InquirySessionClient | undefined> {
  const paths = resolveInquirySessionPaths(options.packageRoot);
  const manifestPath = options.manifestPath ?? paths.manifestPath;
  const probed = await probeManifestPath(manifestPath, options.requestTimeoutMs ?? 2_000);
  if (probed === undefined) {
    return undefined;
  }
  if (options.buildHash !== undefined && probed.status.buildHash !== options.buildHash) {
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
  },
): void {
  if (!existsSync(paths.daemonEntry)) {
    throw new Error(`Cannot start Atlas session because ${paths.daemonEntry} does not exist. Build the package first.`);
  }

  mkdirSync(paths.sessionDir, { recursive: true });
  const stdout = openSync(paths.stdoutPath, "a");
  const stderr = openSync(paths.stderrPath, "a");
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

/** Sleep for the requested interval while polling daemon startup. */
function sleep(
  /** Milliseconds to wait. */
  ms: number,
): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
