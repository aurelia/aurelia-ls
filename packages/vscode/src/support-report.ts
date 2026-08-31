import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { CancellationToken, Disposable, Event, ExtensionContext, Uri } from "vscode";
import type {
  AureliaLanguageClient,
  AureliaLanguageClientSupportState,
} from "./client-core.js";
import {
  AureliaProtocolRequest,
  type AureliaSupportSnapshotResponse,
} from "@aurelia-ls/language-server/protocol";
import { AureliaCommand } from "./product-contract.js";
import type { VscodeApi } from "./vscode-api.js";
import type { WorkerTransportEvent } from "./worker-transport.js";
import {
  readWorkspaceActivationTopology,
  workspaceFolderKey,
} from "./workspace-activation.js";

export const AURELIA_SUPPORT_REPORT_SCHEMA = "aurelia-support-report/1" as const;

const MAX_WORKER_EVENTS = 64;
const MAX_LOG_FILES = 8;
const MAX_LOG_BYTES_PER_FILE = 64 * 1_024;
const MAX_TOTAL_LOG_BYTES = 256 * 1_024;
const MAX_LOG_LINES_PER_FILE = 240;
const MAX_LOG_LINE_CHARACTERS = 1_000;
const MAX_SERVER_SNAPSHOTS = 8;
const DEFAULT_SERVER_SNAPSHOT_DEADLINE_MS = 2_500;
const MAX_TOTAL_SERVER_SNAPSHOT_BYTES = 512 * 1_024;

type SupportTransportMode = "worker" | "ipc";

export interface ResourceExplorerProviderSupportState {
  readonly phase: "empty" | "loading" | "current" | "failed";
  readonly refreshGeneration: number;
  readonly treeRootCount: number;
  readonly hasInventory: boolean;
  readonly updatingAll: boolean;
  readonly updatingWorkspaceCount: number;
  readonly staleWorkspaceCount: number;
  readonly hasIssues: boolean;
  readonly hasAnalysisReview: boolean;
  readonly counts: {
    readonly boundaries: number;
    readonly projects: number;
    readonly resources: number;
    readonly failures: number;
    readonly incomplete: number;
  };
}

export interface ResourceExplorerSupportState {
  readonly visible: boolean;
  readonly acceptingRefreshes: boolean;
  readonly dirtyAll: boolean;
  readonly dirtyWorkspaceCount: number;
  readonly forcedWhileHidden: boolean;
  readonly refreshInFlight: boolean;
  readonly activeRefreshScope: "none" | "all" | "workspace";
  readonly provider: ResourceExplorerProviderSupportState;
}

interface PersistedLogTail {
  readonly channelName: string;
  readonly text: string;
  readonly sourceBytes: number;
  readonly returnedBytes: number;
  readonly truncated: boolean;
}

interface PersistedLogTailRead {
  readonly tails: readonly PersistedLogTail[];
  readonly failures: readonly string[];
}

interface WorkerEventRecord {
  readonly recordedAt: string;
  readonly clientIdDigest: string;
  readonly clientNameDigest: string;
  readonly event: WorkerEventEvidence;
}

type WorkerEventEvidence =
  | { readonly type: "online" }
  | { readonly type: "stdout" | "stderr"; readonly characterCount: number; readonly lineCount: number }
  | {
      readonly type: "error";
      readonly error: {
        readonly name: string;
        readonly code: string | number | null;
        readonly messageKind: "worker-out-of-memory" | "other";
        readonly messageCharacterCount: number;
      };
    }
  | { readonly type: "exit"; readonly code: number }
  | { readonly type: "force-terminate"; readonly graceMilliseconds: number };

export interface SupportReportServiceOptions {
  readonly transportMode: SupportTransportMode;
  readonly now?: () => Date;
  readonly randomSalt?: () => Uint8Array;
  readonly reportId?: () => string;
  readonly readLogTails?: (logUri: Uri) => Promise<PersistedLogTailRead>;
  readonly serverSnapshotDeadlineMilliseconds?: number;
}

/**
 * Owns the user-created support report without exposing a product API or reading
 * authored source/configuration files. Every mutable product surface contributes
 * only its own bounded state projection.
 */
export class SupportReportService implements Disposable {
  readonly #extension: ExtensionContext;
  readonly #vscode: VscodeApi;
  readonly #transportMode: SupportTransportMode;
  readonly #now: () => Date;
  readonly #randomSalt: () => Uint8Array;
  readonly #reportId: () => string;
  readonly #readLogTails: (logUri: Uri) => Promise<PersistedLogTailRead>;
  readonly #serverSnapshotDeadlineMilliseconds: number;
  readonly #workerEvents: WorkerEventRecord[] = [];
  readonly #workerIdentityKey = randomBytes(32);
  #languageClient: AureliaLanguageClient | null = null;
  #resourceExplorerState: (() => ResourceExplorerSupportState) | null = null;
  #disposed = false;

  constructor(
    extension: ExtensionContext,
    vscode: VscodeApi,
    options: SupportReportServiceOptions,
  ) {
    this.#extension = extension;
    this.#vscode = vscode;
    this.#transportMode = options.transportMode;
    this.#now = options.now ?? (() => new Date());
    this.#randomSalt = options.randomSalt ?? (() => randomBytes(32));
    this.#reportId = options.reportId ?? randomUUID;
    this.#readLogTails = options.readLogTails ?? readPersistedSupportLogTails;
    this.#serverSnapshotDeadlineMilliseconds = options.serverSnapshotDeadlineMilliseconds
      ?? DEFAULT_SERVER_SNAPSHOT_DEADLINE_MS;
  }

  attachLanguageClient(languageClient: AureliaLanguageClient): void {
    if (this.#disposed) return;
    this.#languageClient = languageClient;
  }

  registerResourceExplorerState(
    read: () => ResourceExplorerSupportState,
  ): Disposable {
    if (this.#disposed) return { dispose() {} };
    this.#resourceExplorerState = read;
    return {
      dispose: () => {
        if (this.#resourceExplorerState === read) this.#resourceExplorerState = null;
      },
    };
  }

  recordWorkerTransportEvent(
    client: Readonly<{ id: string; name: string }>,
    event: WorkerTransportEvent,
  ): void {
    if (this.#disposed) return;
    this.#workerEvents.push({
      recordedAt: this.#now().toISOString(),
      clientIdDigest: privateIngressIdentity(this.#workerIdentityKey, "language-client", client.id),
      clientNameDigest: privateIngressIdentity(this.#workerIdentityKey, "language-client-name", client.name),
      event: projectWorkerEventAtIngress(event),
    });
    if (this.#workerEvents.length > MAX_WORKER_EVENTS) {
      this.#workerEvents.splice(0, this.#workerEvents.length - MAX_WORKER_EVENTS);
    }
  }

  registerCommand(): Disposable {
    return this.#vscode.commands.registerCommand(
      AureliaCommand.CreateSupportReport,
      () => this.openReport(),
    );
  }

  async openReport(): Promise<void> {
    const report = await this.createReport();
    const document = await this.#vscode.workspace.openTextDocument({
      language: "json",
      content: `${JSON.stringify(report, null, 2)}\n`,
    });
    await this.#vscode.window.showTextDocument(document, { preview: false });
  }

  async createReport(): Promise<Readonly<Record<string, unknown>>> {
    const createdAt = this.#now();
    const identities = new SupportReportIdentities(this.#randomSalt());
    const failures: Array<{ readonly section: string; readonly reason: string }> = [];
    const client = this.#readClientState(identities, failures);
    const explorer = this.#readResourceExplorerState(failures);
    const [servers, logs] = await Promise.all([
      this.#readServerSnapshots(identities, failures),
      this.#readPersistedLogs(identities, failures),
    ]);
    const report = {
      schemaVersion: AURELIA_SUPPORT_REPORT_SCHEMA,
      reportId: this.#reportId(),
      createdAt: createdAt.toISOString(),
      privacy: {
        automaticUpload: false,
        sourceFilesRead: false,
        configurationFilesRead: false,
        packageManifestsRead: false,
        identityPolicy: "fresh per-report HMAC pseudonyms",
        liveServerSnapshots:
          "bounded schema-projected counters only; collection is skipped for explicit server overrides",
        persistedLogs: "bounded tails with paths, URIs, and source-like file names pseudonymized",
        persistedLogCaveat:
          "Log messages are not source files, but may still contain authored identifiers or short text emitted by an error. Review the report before sharing.",
        reviewBeforeSharing: true,
      },
      product: this.#productState(),
      workspace: this.#workspaceState(identities),
      client,
      worker: {
        transportMode: this.#transportMode,
        serverOverridePresent: process.env.AURELIA_LS_SERVER_PATH != null,
        recentEvents: this.#workerEvents.map((record) =>
          projectWorkerEvent(record, identities)),
      },
      servers,
      resourceExplorer: explorer,
      persistedLogs: logs,
      collection: {
        complete: failures.length === 0,
        failures,
      },
    } as const;
    return deepFreeze(report);
  }

  dispose(): void {
    this.#disposed = true;
    this.#languageClient = null;
    this.#resourceExplorerState = null;
    this.#workerEvents.splice(0);
  }

  #readClientState(
    identities: SupportReportIdentities,
    failures: Array<{ readonly section: string; readonly reason: string }>,
  ): AureliaLanguageClientSupportState | Readonly<{ status: "unavailable" }> {
    const languageClient = this.#languageClient;
    if (languageClient == null) return { status: "unavailable" };
    try {
      return languageClient.supportState((kind, value) => identities.id(kind, value));
    } catch (error) {
      failures.push({ section: "client", reason: safeFailureReason(error) });
      return { status: "unavailable" };
    }
  }

  #readResourceExplorerState(
    failures: Array<{ readonly section: string; readonly reason: string }>,
  ): ResourceExplorerSupportState | Readonly<{ status: "unavailable" }> {
    const read = this.#resourceExplorerState;
    if (read == null) return { status: "unavailable" };
    try {
      return deepFreeze(read());
    } catch (error) {
      failures.push({ section: "resourceExplorer", reason: safeFailureReason(error) });
      return { status: "unavailable" };
    }
  }

  async #readServerSnapshots(
    identities: SupportReportIdentities,
    failures: Array<{ readonly section: string; readonly reason: string }>,
  ): Promise<Readonly<Record<string, unknown>>> {
    const languageClient = this.#languageClient;
    if (languageClient == null) return { status: "unavailable" };
    if (process.env.AURELIA_LS_SERVER_PATH != null) {
      failures.push({ section: "servers", reason: "ServerOverridePresent" });
      return { status: "unavailable", reason: "ServerOverridePresent" };
    }
    const collectionStartedAt = this.#now().toISOString();
    const startLifecycleGeneration = readClientLifecycleGeneration(languageClient, identities);
    const sessions = [...(languageClient.sessions ?? [])]
      .sort((left, right) => left.workspace.key.localeCompare(right.workspace.key));
    const selected = sessions.slice(0, MAX_SERVER_SNAPSHOTS);
    const identitySalt = identities.requestSalt();
    const settled = await Promise.allSettled(selected.map(async (session) => {
      const rawSnapshot = await withDeadline(
        (token) => session.client.sendRequest<AureliaSupportSnapshotResponse>(
          AureliaProtocolRequest.SupportSnapshot,
          { identitySalt },
          token,
        ),
        this.#serverSnapshotDeadlineMilliseconds,
      );
      const snapshot = projectServerSnapshot(rawSnapshot);
      if (snapshot == null) {
        throw Object.assign(new Error("Server returned an incompatible support snapshot."), {
          code: "SUPPORT_SNAPSHOT_INCOMPATIBLE",
        });
      }
      if (!languageClient.sessions.some((candidate) =>
        candidate.workspace.key === session.workspace.key
        && candidate.client === session.client
        && candidate.incarnation === session.incarnation
      )) {
        throw Object.assign(new Error("Language server session changed during support collection."), {
          code: "SUPPORT_SNAPSHOT_SESSION_CHANGED",
        });
      }
      return {
        workspaceId: identities.id("workspace", session.workspace.uri),
        incarnation: session.incarnation,
        status: "available" as const,
        snapshot,
      };
    }));
    let remainingBytes = MAX_TOTAL_SERVER_SNAPSHOT_BYTES;
    const snapshots = settled.map((result, index) => {
      if (result.status === "fulfilled") {
        const bytes = Buffer.byteLength(JSON.stringify(result.value.snapshot), "utf8");
        if (bytes <= remainingBytes) {
          remainingBytes -= bytes;
          return result.value;
        }
        failures.push({ section: `servers[${index}]`, reason: "SnapshotSizeLimitExceeded" });
        return {
          workspaceId: result.value.workspaceId,
          incarnation: result.value.incarnation,
          status: "unavailable" as const,
          reason: "SnapshotSizeLimitExceeded",
        };
      }
      const session = selected[index]!;
      failures.push({
        section: `servers[${index}]`,
        reason: safeFailureReason(result.reason),
      });
      return {
        workspaceId: identities.id("workspace", session.workspace.uri),
        incarnation: session.incarnation,
        status: "unavailable" as const,
        reason: safeFailureReason(result.reason),
      };
    });
    if (sessions.length > selected.length) {
      failures.push({ section: "servers", reason: "SessionLimitExceeded" });
    }
    const endLifecycleGeneration = readClientLifecycleGeneration(languageClient, identities);
    return deepFreeze({
      status: "available",
      collectionStartedAt,
      collectionCompletedAt: this.#now().toISOString(),
      clientLifecycleGenerationStart: startLifecycleGeneration,
      clientLifecycleGenerationEnd: endLifecycleGeneration,
      clientStateChangedDuringCollection:
        startLifecycleGeneration == null
        || endLifecycleGeneration == null
        || startLifecycleGeneration !== endLifecycleGeneration,
      sessionCount: sessions.length,
      snapshots,
      omittedSessionCount: Math.max(0, sessions.length - selected.length),
      maximumSnapshotBytes: MAX_TOTAL_SERVER_SNAPSHOT_BYTES,
      returnedSnapshotBytes: MAX_TOTAL_SERVER_SNAPSHOT_BYTES - remainingBytes,
    });
  }

  async #readPersistedLogs(
    identities: SupportReportIdentities,
    failures: Array<{ readonly section: string; readonly reason: string }>,
  ): Promise<readonly Readonly<Record<string, unknown>>[]> {
    let read: PersistedLogTailRead;
    try {
      read = await this.#readLogTails(this.#extension.logUri);
    } catch (error) {
      failures.push({ section: "persistedLogs", reason: safeFailureReason(error) });
      return [];
    }
    for (const reason of read.failures) {
      failures.push({ section: "persistedLogs", reason: boundedText(reason, 200) });
    }
    return read.tails.map((tail) => ({
      channelId: identities.id("log-channel", tail.channelName),
      sourceBytes: tail.sourceBytes,
      returnedBytes: tail.returnedBytes,
      truncated: tail.truncated,
      lines: sanitizePersistedLogText(tail.text, identities),
    }));
  }

  #workspaceState(identities: SupportReportIdentities): Readonly<Record<string, unknown>> {
    const topology = readWorkspaceActivationTopology(this.#vscode);
    const folders = topology.folders.map((folder) => ({
      workspaceId: identities.id("workspace", workspaceFolderKey(folder)),
      activationMode: topology.modeFor(folder),
      excluded: topology.isDisabled(folder.uri),
    })).sort((left, right) => left.workspaceId.localeCompare(right.workspaceId));
    const documents = this.#vscode.workspace.textDocuments;
    const languageCounts = new Map<string, number>();
    for (const document of documents) {
      languageCounts.set(document.languageId, (languageCounts.get(document.languageId) ?? 0) + 1);
    }
    const active = this.#vscode.window.activeTextEditor?.document;
    return {
      folderCount: folders.length,
      folders,
      openDocumentCount: documents.length,
      openDocumentLanguages: [...languageCounts.entries()]
        .map(([languageId, count]) => ({ languageId, count }))
        .sort((left, right) => left.languageId.localeCompare(right.languageId)),
      activeDocument: active == null
        ? null
        : {
            documentId: identities.id("document", active.uri.toString()),
            languageId: active.languageId,
            version: Number.isSafeInteger(active.version) ? active.version : null,
            semanticSessionState: this.#languageClient?.semanticSessionStateForUri(active.uri) ?? "unavailable",
          },
    };
  }

  #productState(): Readonly<Record<string, unknown>> {
    const vscodeEnvironment = this.#vscode as VscodeApi & {
      readonly version?: string;
      readonly env?: { readonly remoteName?: string; readonly uiKind?: number };
    };
    const packageJson = this.#extension.extension.packageJSON as Readonly<Record<string, unknown>>;
    return {
      extensionId: this.#extension.extension.id,
      extensionVersion: stringField(packageJson, "version"),
      extensionMode: this.#extension.extensionMode,
      vscodeVersion: vscodeEnvironment.version ?? null,
      remoteExtensionHost: vscodeEnvironment.env?.remoteName != null,
      uiKind: vscodeEnvironment.env?.uiKind ?? null,
      process: {
        platform: process.platform,
        architecture: process.arch,
        node: process.versions.node,
        electron: process.versions.electron ?? null,
      },
    };
  }
}

function readClientLifecycleGeneration(
  languageClient: AureliaLanguageClient,
  identities: SupportReportIdentities,
): number | null {
  try {
    const generation = languageClient
      .supportState((kind, value) => identities.id(kind, value))
      .lifecycle.lifecycleGeneration;
    return Number.isSafeInteger(generation) ? generation : null;
  } catch {
    return null;
  }
}

export async function readPersistedSupportLogTails(logUri: Uri): Promise<PersistedLogTailRead> {
  if (logUri.scheme !== "file") {
    return { tails: [], failures: ["The extension log directory is not a local file URI."] };
  }
  const root = path.resolve(logUri.fsPath);
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    return { tails: [], failures: [`Could not enumerate extension logs: ${safeFailureReason(error)}`] };
  }
  const candidates = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".log"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, MAX_LOG_FILES);
  const tails: PersistedLogTail[] = [];
  const failures: string[] = [];
  let remainingBytes = MAX_TOTAL_LOG_BYTES;
  for (const entry of candidates) {
    if (remainingBytes <= 0) break;
    const filePath = path.resolve(root, entry.name);
    if (path.dirname(filePath) !== root) continue;
    try {
      const fileStat = await stat(filePath);
      const requestedBytes = Math.min(fileStat.size, MAX_LOG_BYTES_PER_FILE, remainingBytes);
      const buffer = Buffer.alloc(requestedBytes);
      const handle = await open(filePath, "r");
      let bytesRead = 0;
      try {
        if (requestedBytes > 0) {
          const read = await handle.read(buffer, 0, requestedBytes, Math.max(0, fileStat.size - requestedBytes));
          bytesRead = read.bytesRead;
        }
      } finally {
        await handle.close();
      }
      remainingBytes -= bytesRead;
      tails.push({
        channelName: entry.name,
        text: buffer.subarray(0, bytesRead).toString("utf8"),
        sourceBytes: fileStat.size,
        returnedBytes: bytesRead,
        truncated: bytesRead < fileStat.size,
      });
    } catch (error) {
      failures.push(`Could not read one extension log: ${safeFailureReason(error)}`);
    }
  }
  return { tails, failures };
}

export function sanitizePersistedLogText(
  text: string,
  identities: SupportReportIdentities,
): readonly string[] {
  return text
    .replaceAll("\u0000", "")
    .split(/\r?\n/u)
    .filter((line) => line.length > 0)
    .slice(-MAX_LOG_LINES_PER_FILE)
    .map((line) => sanitizeLogLine(line, identities));
}

export class SupportReportIdentities {
  readonly #key: Uint8Array;

  constructor(key: Uint8Array) {
    if (key.byteLength !== 32) throw new Error("Support report identity salt must contain exactly 32 bytes.");
    this.#key = Uint8Array.from(key);
  }

  id(kind: string, value: string): string {
    const digest = createHmac("sha256", this.#key)
      .update(kind)
      .update("\0")
      .update(value)
      .digest("hex")
      .slice(0, 20);
    return `${safeIdentityKind(kind)}:${digest}`;
  }

  /** Local request token for server-side per-report pseudonyms. Never include this value in report JSON. */
  requestSalt(): string {
    return Buffer.from(this.#key).toString("base64url");
  }
}

async function withDeadline<T>(
  request: (token: CancellationToken) => Promise<T>,
  deadlineMilliseconds: number,
): Promise<T> {
  if (!Number.isFinite(deadlineMilliseconds) || deadlineMilliseconds <= 0) {
    throw new RangeError("Support report server deadline must be a positive finite duration.");
  }
  const cancellation = new SupportRequestCancellation();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      request(cancellation.token),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          cancellation.cancel();
          reject(Object.assign(new Error("Server support snapshot timed out."), {
            code: "SUPPORT_SNAPSHOT_TIMEOUT",
          }));
        }, deadlineMilliseconds);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer != null) clearTimeout(timer);
    cancellation.dispose();
  }
}

class SupportRequestCancellation {
  readonly #listeners = new Set<(event: unknown) => unknown>();
  readonly #tokenState: {
    isCancellationRequested: boolean;
    onCancellationRequested: Event<unknown>;
  };
  #cancelled = false;
  readonly token: CancellationToken;

  constructor() {
    this.#tokenState = {
      isCancellationRequested: false,
      onCancellationRequested: ((listener: (event: unknown) => unknown): Disposable => {
        if (this.#cancelled) {
          listener(undefined);
          return { dispose() {} };
        }
        this.#listeners.add(listener);
        return { dispose: () => this.#listeners.delete(listener) };
      }) as Event<unknown>,
    };
    this.token = this.#tokenState;
  }

  cancel(): void {
    if (this.#cancelled) return;
    this.#cancelled = true;
    this.#tokenState.isCancellationRequested = true;
    for (const listener of [...this.#listeners]) listener(undefined);
    this.#listeners.clear();
  }

  dispose(): void {
    this.#listeners.clear();
  }
}

function projectServerSnapshot(value: unknown): AureliaSupportSnapshotResponse | null {
  if (
    value == null
    || typeof value !== "object"
    || Array.isArray(value)
    || (value as Record<string, unknown>)["schemaVersion"] !== "aurelia-support-snapshot/1"
  ) {
    return null;
  }
  // A server override can return arbitrary JSON. Re-serialize through the exact v1 property catalog so unknown fields
  // cannot bypass the support report's privacy or payload assumptions merely by spoofing the schema version.
  const projected = JSON.parse(JSON.stringify(value, [...SERVER_SUPPORT_PROPERTY_ALLOWLIST])) as unknown;
  return projected != null
    && typeof projected === "object"
    && !Array.isArray(projected)
    && (projected as Record<string, unknown>)["schemaVersion"] === "aurelia-support-snapshot/1"
    ? projected as AureliaSupportSnapshotResponse
    : null;
}

const SERVER_SUPPORT_PROPERTY_ALLOWLIST = [
  "addresses",
  "ageMilliseconds",
  "aggregateCount",
  "aggregates",
  "analysisCache",
  "analysisDepth",
  "analysisRefreshCoalesces",
  "analysisRefreshSchedules",
  "analysisWavesPublished",
  "analysisWavesStarted",
  "analysisWaveStaleRetries",
  "answered",
  "answerLeaseKind",
  "answerLocalKernelPolicy",
  "approximatePayloadBytes",
  "architecture",
  "arrayBuffersBytes",
  "authoringTemplateLimit",
  "authoringTemplateSourceFileCount",
  "backgroundTaskFailures",
  "bounds",
  "budgetDisposedRecords",
  "bypasses",
  "cachedAppCount",
  "cachedApps",
  "capacityEvictions",
  "capturedAt",
  "childRecords",
  "claims",
  "clearedEntries",
  "clearedSourceTextCharacters",
  "clearedTypeSystemDependencySourceFiles",
  "clearedTypeSystemDependencySourceTextCharacters",
  "clearOperations",
  "clientCancellationRequested",
  "clientCancelled",
  "clientCancelledWithUnderlyingStale",
  "closing",
  "configurationInvalidatedFileCount",
  "configurationInvalidations",
  "count",
  "counters",
  "createdRecords",
  "currentnessKind",
  "declarationEntries",
  "declarationSourceTextCharacters",
  "defaultLibraryEntries",
  "defaultLibrarySourceTextCharacters",
  "diagnosticCacheEntries",
  "diagnosticRefreshRequests",
  "disposalStarted",
  "disposed",
  "disposedHotDetails",
  "disposedKernelHandleCharacters",
  "disposedKernelRecords",
  "disposedProductDetails",
  "distinctCanonicalPaths",
  "documentSynchronizations",
  "documentClose",
  "documentId",
  "documentOpen",
  "dominantSourceTextBucket",
  "duplicateCanonicalPathEntries",
  "durationMilliseconds",
  "entries",
  "entryLimit",
  "evidence",
  "externalBytes",
  "externalDeclarationEntries",
  "externalDeclarationSourceTextCharacters",
  "failed",
  "feature",
  "handleCharacters",
  "heapLimitBytes",
  "heapTotalBytes",
  "heapUsedBytes",
  "hits",
  "hotDetailKinds",
  "hotDetails",
  "identities",
  "includeAuthoringTemplates",
  "inFlight",
  "inFlightCount",
  "initialize",
  "inlayHintRefreshRequests",
  "inquiryProfile",
  "itemCount",
  "key",
  "lifecycle",
  "materializations",
  "maxDepth",
  "maximumBreakdownRows",
  "maximumCachedApps",
  "maximumDurationMilliseconds",
  "maximumFeatureAggregates",
  "maximumInFlightRows",
  "maximumRecentTerminals",
  "maximumSerializedBytes",
  "memory",
  "milliseconds",
  "misses",
  "name",
  "netHotDetailDelta",
  "netKernelHandleCharacterDelta",
  "netKernelRecordDelta",
  "netProductDetailDelta",
  "nodeModuleEntries",
  "nodeModuleSourceTextCharacters",
  "nodeVersion",
  "oldestInFlightAgeMilliseconds",
  "omittedAggregateCount",
  "omittedCachedAppCount",
  "omittedInFlightCount",
  "omittedRecentTerminalCount",
  "openSeamKinds",
  "openSeams",
  "origin",
  "outcome",
  "pending",
  "pendingAnalysisChangeKind",
  "pendingAnalysisRefresh",
  "pendingChangedSourceCount",
  "phaseCount",
  "platform",
  "process",
  "productDetailKinds",
  "productDetails",
  "productKinds",
  "products",
  "profile",
  "programDeclarationSourceFileCount",
  "programDefaultLibrarySourceFileCount",
  "programNodeModuleSourceFileCount",
  "programProjectSourceFileCount",
  "programSourceFileCount",
  "programSourceTextCharacters",
  "projectId",
  "projectionOnly",
  "provenance",
  "queryClaims",
  "queryTypeProjection",
  "reason",
  "recentTerminalCount",
  "recentTerminals",
  "recordKinds",
  "registered",
  "requestCurrentnessRefreshes",
  "requestEpoch",
  "requests",
  "retainedAnswerBytes",
  "retainedAnswerHits",
  "retainedAnswerValues",
  "retainedRecordLimit",
  "retainedRecords",
  "retentionKind",
  "retirementFailureCount",
  "retiringWorkspaceCount",
  "rootRecords",
  "rssBytes",
  "rssOtherBytes",
  "runtimeQueryClaims",
  "schemaVersion",
  "semanticSession",
  "semanticTokenRefreshRequests",
  "sequence",
  "shutdown",
  "shuttingDown",
  "sourceTextCharacterLimit",
  "sourceTextCharacters",
  "sourceTextInvalidatedFileCount",
  "sourceTextInvalidations",
  "stale",
  "staleFacts",
  "started",
  "staticCatalog",
  "status",
  "succeeded",
  "suggestedClearPolicy",
  "suggestedClearSourceTextCharacters",
  "supersededRevisionEvictions",
  "templateAnalysisBreadth",
  "topologyInvalidatedFileCount",
  "topologyInvalidations",
  "topPhases",
  "totalDurationMilliseconds",
  "totalMilliseconds",
  "totalRecords",
  "trackedOpenDocumentCount",
  "trackedTaskCount",
  "typeSystemAcquisitionKind",
  "typeSystemAcquisitionMilliseconds",
  "typeSystemConstructionMilliseconds",
  "typeSystemDependencyCache",
  "typeSystemProjectCount",
  "underlyingStale",
  "uptimeMilliseconds",
  "v8DetachedContextCount",
  "v8ExternalMemoryBytes",
  "v8HeapAvailableBytes",
  "v8HeapPhysicalBytes",
  "v8MallocedMemoryBytes",
  "v8NativeContextCount",
  "v8PeakMallocedMemoryBytes",
  "watchedFileBatches",
  "workspaceConfigured",
  "workspaceGeneration",
  "workspaceKernel",
  "writes",
  "writeSourceTextCharacters",
] as const;

function projectWorkerEvent(
  record: WorkerEventRecord,
  identities: SupportReportIdentities,
): Readonly<Record<string, unknown>> {
  const base = {
    recordedAt: record.recordedAt,
    clientId: identities.id("language-client", record.clientIdDigest),
    clientNameId: identities.id("language-client-name", record.clientNameDigest),
    type: record.event.type,
  };
  switch (record.event.type) {
    case "online":
      return base;
    case "stdout":
    case "stderr":
      return { ...base, characterCount: record.event.characterCount, lineCount: record.event.lineCount };
    case "error":
      return {
        ...base,
        error: {
          name: record.event.error.name,
          code: errorCode(record.event.error),
          messageKind: record.event.error.messageKind,
          messageCharacterCount: record.event.error.messageCharacterCount,
        },
      };
    case "exit":
      return { ...base, code: record.event.code };
    case "force-terminate":
      return { ...base, graceMilliseconds: record.event.graceMilliseconds };
  }
}

function projectWorkerEventAtIngress(event: WorkerTransportEvent): WorkerEventEvidence {
  switch (event.type) {
    case "online":
      return { type: event.type };
    case "stdout":
    case "stderr":
      return {
        type: event.type,
        characterCount: event.text.length,
        lineCount: lineCount(event.text),
      };
    case "error": {
      const code = safeWorkerErrorCode(errorCode(event.error));
      return {
        type: event.type,
        error: {
          name: /^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(event.error.name) ? event.error.name : "Error",
          code,
          messageKind: code === "ERR_WORKER_OUT_OF_MEMORY"
            || /(?:heap out of memory|reaching memory limit)/iu.test(event.error.message)
            ? "worker-out-of-memory"
            : "other",
          messageCharacterCount: event.error.message.length,
        },
      };
    }
    case "exit":
      return { type: event.type, code: event.code };
    case "force-terminate":
      return { type: event.type, graceMilliseconds: event.graceMilliseconds };
  }
}

function safeWorkerErrorCode(code: string | number | null): string | number | null {
  if (typeof code === "number") return Number.isSafeInteger(code) ? code : null;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : null;
}

function privateIngressIdentity(key: Uint8Array, kind: string, value: string): string {
  return createHmac("sha256", key)
    .update(kind)
    .update("\0")
    .update(value)
    .digest("hex")
    .slice(0, 20);
}

function sanitizeLogLine(line: string, identities: SupportReportIdentities): string {
  let result = boundedText(line, MAX_LOG_LINE_CHARACTERS);
  result = result.replace(
    /(["'`])([A-Za-z]:[\\/][^\r\n]*?|\/(?!\/)[^\r\n]*?)\1/gu,
    (_value, quote: string, value: string) =>
      `${quote}<${identities.id("path", value)}>${quote}`,
  );
  result = result.replace(
    /\b[A-Za-z]:[\\/][^\r\n]*?\.(?:html?|tsx?|jsx?|mts|cts|mjs|cjs|jsonc?|css|less|scss)\b/giu,
    (value) => `<${identities.id("path", value)}>`,
  );
  result = result.replace(
    /(^|[\s(])\/(?!\/)[^\r\n]*?\.(?:html?|tsx?|jsx?|mts|cts|mjs|cjs|jsonc?|css|less|scss)\b/giu,
    (_value, prefix: string) => `${prefix}<${identities.id("path", _value.slice(prefix.length))}>`,
  );
  result = result.replace(
    /\b(?:file|vscode-remote):\/\/[^\s"'`<>\])}]+/giu,
    (value) => `<${identities.id("uri", value)}>`,
  );
  result = result.replace(
    /\b[A-Za-z]:[\\/][^\r\n"'`<>|]*/gu,
    (value) => `<${identities.id("path", value)}>`,
  );
  result = result.replace(
    /\\\\[^\r\n"'`<>|]*/gu,
    (value) => `<${identities.id("path", value)}>`,
  );
  result = result.replace(
    /(^|[\s(])\/(?!\/)[^\r\n"'`<>|]*/gu,
    (_value, prefix: string) => `${prefix}<${identities.id("path", _value.slice(prefix.length))}>`,
  );
  result = result.replace(
    /\b[A-Za-z0-9_.-]+\.(?:html?|tsx?|jsx?|mts|cts|mjs|cjs|jsonc?|css|less|scss)\b/giu,
    (value) => {
      const extension = value.slice(value.lastIndexOf(".")).toLowerCase();
      return `<${identities.id("source-name", value)}>${extension}`;
    },
  );
  result = result.replace(/<(?!\/?(?:path|uri|source-name|log-text|log-identifier|log-markup):)[^>\r\n]{16,}>/gu, (value) =>
    `<${identities.id("log-markup", value)}>`);
  result = result.replace(/(["'`])([^\r\n]{80,}?)\1/gu, (_value, quote: string, body: string) =>
    `${quote}<${identities.id("log-text", body)}>${quote}`);
  result = result.replace(
    /\b(?!ERR_[A-Z0-9_]*\b)(?!AURELIA_[A-Z0-9_]*\b)[A-Z][A-Z0-9_]{7,}\b/gu,
    (value) => `<${identities.id("log-identifier", value)}>`,
  );
  return result;
}

function safeFailureReason(error: unknown): string {
  if (error instanceof Error) {
    const code = errorCode(error);
    return code == null ? error.name : `${error.name} (${code})`;
  }
  return "UnknownError";
}

function errorCode(error: unknown): string | number | null {
  try {
    if (error == null || typeof error !== "object" || !("code" in error)) return null;
    const code = error.code;
    return typeof code === "string" || typeof code === "number" ? code : null;
  } catch {
    return null;
  }
}

function lineCount(text: string): number {
  if (text.length === 0) return 0;
  return text.split(/\r?\n/u).length;
}

function boundedText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1)}…`;
}

function safeIdentityKind(kind: string): string {
  return kind.replace(/[^a-z0-9-]/giu, "-").toLowerCase();
}

function stringField(record: Readonly<Record<string, unknown>>, key: string): string | null {
  return typeof record[key] === "string" ? record[key] : null;
}

function deepFreeze<T>(value: T): T {
  if (value == null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
