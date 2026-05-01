#!/usr/bin/env node
import { createServer, type Server, type Socket } from "node:net";

import { OutcomeKind } from "../inquiry/answer.js";
import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createInMemoryApi, type InquiryRuntimeRequest } from "../inquiry/runtime/index.js";
import { prewarmFrameworkDiscoveryIndex } from "../framework/index.js";
import { createSourceProject, prewarmAuLinkIndex } from "../source/index.js";
import { readInquirySessionManifest, removeInquirySessionManifest, writeInquirySessionManifest } from "./manifest.js";
import { resolveInquirySessionPaths } from "./paths.js";
import {
  INQUIRY_SESSION_MANIFEST_VERSION,
  InquirySessionMethod,
  type InquirySessionEndpoint,
  type InquirySessionFollowParams,
  type InquirySessionManifest,
  type InquirySessionMapParams,
  type InquirySessionRequest,
  type InquirySessionResponse,
  type InquirySessionSelfCheckResult,
  type InquirySessionShutdownParams,
  type InquirySessionShutdownResult,
  type InquirySessionStatus,
  type InquirySessionWorldSummary,
} from "./protocol.js";

const args = parseArgs(process.argv.slice(2));
const packageRoot = requireArg(args, "package-root");
const paths = resolveInquirySessionPaths(packageRoot);
const manifestPath = args.get("manifest") ?? paths.manifestPath;
const buildHash = requireArg(args, "build-hash");
const idleTtlMs = readPositiveInteger(args.get("idle-ttl-ms"), 10 * 60 * 1000);
const heartbeatIntervalMs = readPositiveInteger(args.get("heartbeat-interval-ms"), 2_000);
const sourceProject = createSourceProject({ repoRoot: paths.repoRoot });
prewarmAuLinkIndex(sourceProject);
prewarmFrameworkDiscoveryIndex(sourceProject);
const api = createInMemoryApi({ sourceProject });
const blockingFrameworkEntityPrewarmProjections = [
  "observers",
  "app-tasks",
  "router-entities",
  "expression-entities",
  "rendering-structures",
] as const;
const backgroundFrameworkEntityPrewarmProjections = [
  "package-exports",
  "registry-exports",
  "di-interfaces",
  "resource-carriers",
  "resources",
  "syntax-products",
  "instruction-slots",
  "binding-products",
] as const;
await Promise.all(blockingFrameworkEntityPrewarmProjections.map((projection) =>
  api.ask({
    lens: LensId.FrameworkDiscovery,
    locus: RepoRootLocus,
    projection,
    budget: { rows: 1, evidencePerSubject: 1 },
  })
));
const startedAtMs = Date.now();
let lastRequestAtMs = startedAtMs;
let endpoint: InquirySessionEndpoint | undefined;
let server: Server | undefined;
let shuttingDown = false;
let manifestEstablished = false;

server = createServer((socket) => {
  wireSocket(socket);
});

server.listen(0, "127.0.0.1", () => {
  const address = server?.address();
  if (address === undefined || address === null || typeof address === "string") {
    throw new Error("Atlas session could not resolve its listening address.");
  }
  endpoint = { host: "127.0.0.1", port: address.port };
  refreshManifest();
  scheduleBackgroundFrameworkEntityPrewarm();
});

const heartbeat = setInterval(() => {
  if (Date.now() - lastRequestAtMs > idleTtlMs) {
    shutdown("idle timeout");
    return;
  }
  refreshManifest();
}, heartbeatIntervalMs);
heartbeat.unref();

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

/** Attach line-delimited JSON request handling to one socket. */
function wireSocket(
  /** Socket accepted from the loopback server. */
  socket: Socket,
): void {
  let buffer = "";
  socket.setEncoding("utf8");
  socket.on("error", () => {
    // A client may time out and close the connection while a heavy inquiry is still finishing.
  });
  socket.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }
      void handleLine(socket, line);
    }
  });
}

/** Parse, answer, and write one protocol line. */
async function handleLine(
  /** Socket to answer on. */
  socket: Socket,
  /** Raw JSON request line. */
  line: string,
): Promise<void> {
  let request: InquirySessionRequest;
  try {
    request = JSON.parse(line) as InquirySessionRequest;
  } catch (error) {
    socket.write(`${JSON.stringify(failure("unknown", "invalid-json", errorSummary(error)))}\n`);
    return;
  }

  lastRequestAtMs = Date.now();
  try {
    const result = await handleRequest(request);
    const response: InquirySessionResponse = { id: request.id, ok: true, result };
    socket.write(`${JSON.stringify(response)}\n`);
  } catch (error) {
    socket.write(`${JSON.stringify(failure(request.id, "request-failed", errorSummary(error)))}\n`);
  }
}

/** Handle one parsed protocol request. */
async function handleRequest(
  /** Parsed request envelope. */
  request: InquirySessionRequest,
): Promise<unknown> {
  switch (request.method) {
    case InquirySessionMethod.Status:
      return createStatus();
    case InquirySessionMethod.Map:
      return api.map(readMapParams(request.params).focus);
    case InquirySessionMethod.Ask:
      return api.ask(readAskParams(request.params));
    case InquirySessionMethod.Follow:
      return api.follow(readFollowParams(request.params).continuation);
    case InquirySessionMethod.SelfCheck:
      return runSelfCheck();
    case InquirySessionMethod.Shutdown: {
      const reason = readShutdownParams(request.params).reason ?? "protocol shutdown";
      const result: InquirySessionShutdownResult = { accepted: true, reason };
      setTimeout(() => shutdown(reason), 0).unref();
      return result;
    }
    default:
      throw new Error(`Unknown inquiry session method: ${String(request.method)}`);
  }
}

/** Run lightweight runtime coherence checks inside the daemon process. */
async function runSelfCheck(): Promise<InquirySessionSelfCheckResult> {
  const mapAnswer = await api.map("session-self-check");
  const terrainAnswer = await api.ask({
    lens: LensId.RepoTerrain,
    locus: RepoRootLocus,
    projection: "areas",
  });
  const selfAnswer = await api.ask({
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "summary",
  });
  const firstContinuation = mapAnswer.continuations[0];
  const followedAnswer = firstContinuation === undefined ? undefined : await api.follow(firstContinuation);

  if (mapAnswer.outcome !== OutcomeKind.Hit) {
    throw new Error("Session self-check expected repo.map to return a hit.");
  }
  if (terrainAnswer.outcome !== OutcomeKind.Hit) {
    throw new Error("Session self-check expected repo.terrain to return a hit.");
  }
  if (selfAnswer.outcome !== OutcomeKind.Hit && selfAnswer.outcome !== OutcomeKind.Partial) {
    throw new Error("Session self-check expected atlas.self to return hit or partial.");
  }

  return {
    status: createStatus(),
    mapOutcome: mapAnswer.outcome,
    terrainOutcome: terrainAnswer.outcome,
    selfOutcome: selfAnswer.outcome,
    ...(followedAnswer === undefined ? {} : { followedOutcome: followedAnswer.outcome }),
    selfOpenSeams: selfAnswer.openSeams.length,
  };
}

/** Create the current daemon status payload. */
function createStatus(): InquirySessionStatus {
  if (endpoint === undefined) {
    throw new Error("Session endpoint is not ready yet.");
  }
  return {
    packageName: "@aurelia-ls/atlas",
    pid: process.pid,
    buildHash,
    endpoint,
    uptimeMs: Date.now() - startedAtMs,
    idleMs: Date.now() - lastRequestAtMs,
    world: createWorldSummary(),
    implementedLensIds: api.implementedLensIds,
  };
}

/** Create a compact summary of the runtime world. */
function createWorldSummary(): InquirySessionWorldSummary {
  return {
    terrainAreas: api.world.terrain.length,
    activeTerrainAreas: api.world.activeTerrain.length,
    substrateContracts: api.world.substrates.length,
    lensContracts: api.world.lenses.length,
    vocabularyDefinitions: api.world.vocabulary.length,
    sourceProject: api.sourceProject.snapshot().summary,
  };
}

/** Warm the rest of the entity atom cache after startup so first-fill misses do not block manifest publication. */
function scheduleBackgroundFrameworkEntityPrewarm(): void {
  setTimeout(() => {
    void prewarmFrameworkEntityCatalogsInBackground();
  }, 30_000).unref();
}

/** Prewarm non-critical entity families opportunistically. */
async function prewarmFrameworkEntityCatalogsInBackground(): Promise<void> {
  for (const projection of backgroundFrameworkEntityPrewarmProjections) {
    if (shuttingDown) {
      return;
    }
    await api.ask({
      lens: LensId.FrameworkDiscovery,
      locus: RepoRootLocus,
      projection,
      budget: { rows: 1, evidencePerSubject: 1 },
    }).catch((error: unknown) => {
      console.error(`Atlas background framework entity prewarm failed for ${projection}: ${errorSummary(error)}`);
    });
  }
}

/** Refresh the manifest heartbeat or exit if this daemon no longer owns it. */
function refreshManifest(): void {
  if (endpoint === undefined || shuttingDown) {
    return;
  }

  const current = readInquirySessionManifest(manifestPath);
  if (current === undefined && manifestEstablished) {
    process.exit(0);
  }
  if (current !== undefined && current.pid !== process.pid && isProcessAlive(current.pid)) {
    process.exit(0);
  }
  if (current !== undefined && current.pid === process.pid && current.buildHash !== buildHash) {
    process.exit(0);
  }

  const now = new Date().toISOString();
  const manifest: InquirySessionManifest = {
    schemaVersion: INQUIRY_SESSION_MANIFEST_VERSION,
    packageName: "@aurelia-ls/atlas",
    pid: process.pid,
    endpoint,
    buildHash,
    daemonEntry: paths.daemonEntry,
    packageRoot: paths.packageRoot,
    repoRoot: paths.repoRoot,
    manifestPath,
    startedAt: new Date(startedAtMs).toISOString(),
    heartbeatAt: now,
    lastRequestAt: new Date(lastRequestAtMs).toISOString(),
    idleTtlMs,
    heartbeatIntervalMs,
  };
  writeInquirySessionManifest(manifestPath, manifest);
  manifestEstablished = true;
}

/** Return true when a manifest-owning process still appears to be alive. */
function isProcessAlive(
  /** Process id read from the current session manifest. */
  pid: number,
): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Stop the server, remove the owned manifest, and exit. */
function shutdown(
  /** Reason for shutdown. */
  reason: string,
): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  clearInterval(heartbeat);
  removeInquirySessionManifest(manifestPath, process.pid);
  server?.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
  console.error(`Atlas session shutting down: ${reason}`);
}

/** Build a failure response envelope. */
function failure(
  /** Request id being answered or unknown. */
  id: string,
  /** Stable broad error code. */
  code: string,
  /** Error message. */
  message: string,
): InquirySessionResponse {
  return {
    id,
    ok: false,
    error: { code, message },
  };
}

/** Parse map params from an unknown protocol payload. */
function readMapParams(
  /** Unknown params payload. */
  params: unknown,
): InquirySessionMapParams {
  if (params === undefined || params === null || typeof params !== "object") {
    return {};
  }
  const focus = (params as { readonly focus?: unknown }).focus;
  return typeof focus === "string" ? { focus } : {};
}

/** Parse ask params from an unknown protocol payload. */
function readAskParams(
  /** Unknown params payload. */
  params: unknown,
): InquiryRuntimeRequest {
  if (params === undefined || params === null || typeof params !== "object") {
    throw new Error("ask requires an object payload.");
  }
  return params as InquiryRuntimeRequest;
}

/** Parse follow params from an unknown protocol payload. */
function readFollowParams(
  /** Unknown params payload. */
  params: unknown,
): InquirySessionFollowParams {
  if (params === undefined || params === null || typeof params !== "object") {
    throw new Error("follow requires an object payload.");
  }
  const continuation = (params as { readonly continuation?: unknown }).continuation;
  if (continuation === undefined || continuation === null || typeof continuation !== "object") {
    throw new Error("follow requires a continuation object.");
  }
  return { continuation: continuation as InquirySessionFollowParams["continuation"] };
}

/** Parse shutdown params from an unknown protocol payload. */
function readShutdownParams(
  /** Unknown params payload. */
  params: unknown,
): InquirySessionShutdownParams {
  if (params === undefined || params === null || typeof params !== "object") {
    return {};
  }
  const reason = (params as { readonly reason?: unknown }).reason;
  return typeof reason === "string" ? { reason } : {};
}

/** Parse CLI flags in --key value form. */
function parseArgs(
  /** Raw argv tail. */
  argv: readonly string[],
): Map<string, string> {
  const parsed = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === undefined || !key.startsWith("--") || value === undefined) {
      throw new Error(`Invalid Atlas session argument near '${key ?? ""}'.`);
    }
    parsed.set(key.slice(2), value);
  }
  return parsed;
}

/** Read a required CLI argument. */
function requireArg(
  /** Parsed argv map. */
  args: ReadonlyMap<string, string>,
  /** Required argument key. */
  key: string,
): string {
  const value = args.get(key);
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required Atlas session argument --${key}.`);
  }
  return value;
}

/** Parse a positive integer argument with a default value. */
function readPositiveInteger(
  /** Raw string value. */
  value: string | undefined,
  /** Default value when raw input is absent or invalid. */
  defaultValue: number,
): number {
  const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

/** Convert unknown thrown values into a compact message. */
function errorSummary(
  /** Unknown thrown value. */
  error: unknown,
): string {
  return error instanceof Error ? error.message : String(error);
}
