import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Disposable, ExtensionContext, Uri } from "vscode";
import type {
  AureliaLanguageClient,
  AureliaLanguageClientSupportState,
} from "./client-core.js";
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
const MAX_ERROR_MESSAGE_CHARACTERS = 2_000;

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
  readonly clientId: string;
  readonly clientName: string;
  readonly event: WorkerTransportEvent;
}

export interface SupportReportServiceOptions {
  readonly transportMode: SupportTransportMode;
  readonly now?: () => Date;
  readonly randomSalt?: () => Uint8Array;
  readonly reportId?: () => string;
  readonly readLogTails?: (logUri: Uri) => Promise<PersistedLogTailRead>;
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
  readonly #workerEvents: WorkerEventRecord[] = [];
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
      clientId: client.id,
      clientName: client.name,
      event,
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
    const logs = await this.#readPersistedLogs(identities, failures);
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
    if (key.byteLength < 16) throw new Error("Support report identity salt must be at least 16 bytes.");
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
}

function projectWorkerEvent(
  record: WorkerEventRecord,
  identities: SupportReportIdentities,
): Readonly<Record<string, unknown>> {
  const base = {
    recordedAt: record.recordedAt,
    clientId: identities.id("language-client", record.clientId),
    clientNameId: identities.id("language-client-name", record.clientName),
    type: record.event.type,
  };
  switch (record.event.type) {
    case "online":
      return base;
    case "stdout":
    case "stderr":
      return {
        ...base,
        characterCount: record.event.text.length,
        lineCount: lineCount(record.event.text),
      };
    case "error":
      return {
        ...base,
        error: {
          name: record.event.error.name,
          code: errorCode(record.event.error),
          message: sanitizeLogLine(
            boundedText(record.event.error.message, MAX_ERROR_MESSAGE_CHARACTERS),
            identities,
          ),
        },
      };
    case "exit":
      return { ...base, code: record.event.code };
    case "force-terminate":
      return { ...base, graceMilliseconds: record.event.graceMilliseconds };
  }
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
    /\b[A-Za-z]:[\\/][^\s"'`<>|),;]*/gu,
    (value) => `<${identities.id("path", value)}>`,
  );
  result = result.replace(
    /\\\\[^\s"'`<>|),;]+/gu,
    (value) => `<${identities.id("path", value)}>`,
  );
  result = result.replace(
    /(^|[\s(])\/(?!\/)[^\s"'`<>|),;]+/gu,
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
