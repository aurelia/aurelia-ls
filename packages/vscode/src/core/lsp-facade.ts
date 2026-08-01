import type { CancellationToken, WorkspaceEdit } from "vscode";
import type { LanguageClient } from "vscode-languageclient/node";
import type { AureliaLanguageClient, AureliaLanguageClientSession } from "../client-core.js";
import type { ClientLogger } from "../log.js";
import type {
  AnalysisReadyPayload,
  CapabilitiesResponse,
  DiagnosticsSnapshotResponse,
  InspectEntityResponse,
  ProtocolWorkspaceEdit,
  RelatedFileResponse,
  RenameFromTsResponse,
  ResourceExplorerResponse,
  ScopeResourcesResponse,
  WorkspaceChangedPayload,
  WorkspaceNotificationPayload,
} from "../types.js";
import { toDisposable, type DisposableLike } from "./disposables.js";
import type { DebugChannel, ObservabilityService, TraceService } from "./observability.js";

type NotificationHandler = (payload: unknown) => void;

/** Routes custom LSP traffic across the active workspace-owned client sessions. */
export class LspFacade implements DisposableLike {
  #clients: AureliaLanguageClient;
  #logger: ClientLogger;
  #trace: TraceService;
  #debug: DebugChannel;
  #notificationHandlers = new Map<string, Set<NotificationHandler>>();
  #rawNotificationSubscriptions: DisposableLike[] = [];
  #sessionSubscription: DisposableLike;
  #disposed = false;

  constructor(clients: AureliaLanguageClient, observability: ObservabilityService) {
    this.#clients = clients;
    this.#logger = observability.logger;
    this.#trace = observability.trace;
    this.#debug = observability.debug.channel("lsp");
    this.#sessionSubscription = clients.onDidChangeSessions(() => this.#rebindNotifications());
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#sessionSubscription.dispose();
    this.#disposeRawNotifications();
    this.#notificationHandlers.clear();
  }

  onNotification<T>(
    method: string,
    handler: (payload: WorkspaceNotificationPayload<T>) => void,
  ): DisposableLike {
    let handlers = this.#notificationHandlers.get(method);
    if (handlers == null) {
      handlers = new Set();
      this.#notificationHandlers.set(method, handlers);
    }
    handlers.add(handler as NotificationHandler);
    this.#rebindNotifications();
    return toDisposable(() => {
      const current = this.#notificationHandlers.get(method);
      current?.delete(handler as NotificationHandler);
      if (current?.size === 0) {
        this.#notificationHandlers.delete(method);
        this.#rebindNotifications();
      }
    });
  }

  async getDiagnostics(uri: string): Promise<DiagnosticsSnapshotResponse | null> {
    const session = this.#sessionForUri(uri);
    return session == null
      ? null
      : this.#sendRequest(session, "aurelia/getDiagnostics", { uri });
  }

  async dumpState(): Promise<unknown> {
    const workspaces = await Promise.all(this.#clients.sessions.map(async (session) => ({
      workspace: session.workspace,
      state: await this.#sendRequest<unknown>(session, "aurelia/dumpState"),
    })));
    return { workspaces };
  }

  async inspectEntity(
    uri: string,
    position: { line: number; character: number },
  ): Promise<InspectEntityResponse | null> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    try {
      return await this.#sendRequest<InspectEntityResponse | null>(session, "aurelia/inspectEntity", { uri, position });
    } catch (err) {
      this.#logger.warn("inspectEntity.request.failed", { message: errorMessage(err) });
      return null;
    }
  }

  async getResources(): Promise<ResourceExplorerResponse | null> {
    const rows = await Promise.all(this.#clients.sessions.map(async (session) => {
      try {
        const response = await this.#sendRequest<ResourceExplorerResponse | null>(session, "aurelia/getResources");
        return response == null ? null : { session, response };
      } catch (err) {
        this.#logger.warn("resources.request.failed", {
          workspace: session.workspace.uri,
          message: errorMessage(err),
        });
        return null;
      }
    }));
    const available = rows.filter((row): row is NonNullable<typeof row> => row != null);
    if (available.length === 0) return null;
    return {
      fingerprint: available
        .map(({ session, response }) => `${session.workspace.key}:${response.fingerprint ?? ""}`)
        .sort()
        .join("|"),
      resources: available.flatMap(({ session, response }) =>
        response.resources.map((resource) => ({ ...resource, workspace: session.workspace }))
      ),
      templateCount: available.reduce((sum, row) => sum + row.response.templateCount, 0),
      inlineTemplateCount: available.reduce((sum, row) => sum + row.response.inlineTemplateCount, 0),
      workspaces: available.map(({ session, response }) => ({
        ...session.workspace,
        resourceCount: response.resources.length,
        templateCount: response.templateCount,
        inlineTemplateCount: response.inlineTemplateCount,
      })),
    };
  }

  async getCapabilities(): Promise<CapabilitiesResponse | null> {
    const session = this.#clients.sessions[0];
    if (session == null) return null;
    try {
      return await this.#sendRequest<CapabilitiesResponse | null>(session, "aurelia/capabilities");
    } catch (err) {
      this.#logger.warn("capabilities.request.failed", { message: errorMessage(err) });
      return null;
    }
  }

  onAnalysisReady(
    handler: (payload: WorkspaceNotificationPayload<AnalysisReadyPayload>) => void,
  ): DisposableLike {
    return this.onNotification("aurelia/analysisReady", handler);
  }

  async getScopeResources(uri: string): Promise<ScopeResourcesResponse | null> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    try {
      return await this.#sendRequest<ScopeResourcesResponse | null>(session, "aurelia/getScopeResources", { uri });
    } catch (err) {
      this.#logger.warn("scopeResources.request.failed", { message: errorMessage(err) });
      return null;
    }
  }

  async getRelatedFile(uri: string): Promise<RelatedFileResponse> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    try {
      return await this.#sendRequest<RelatedFileResponse>(session, "aurelia/getRelatedFile", { uri });
    } catch {
      return null;
    }
  }

  async renameFromTs(
    uri: string,
    position: { line: number; character: number },
    newName: string,
    token?: CancellationToken,
  ): Promise<RenameFromTsResponse> {
    const session = this.#sessionForUri(uri);
    if (session == null) {
      return {
        status: "blocked",
        reason: "workspace-unowned",
        message: "No active Aurelia workspace owns this TypeScript document.",
      };
    }
    try {
      const response = await this.#sendRequest<RenameFromTsResponse | null>(
        session,
        "aurelia/renameFromTs",
        { uri, position, newName },
        token,
      );
      return response ?? {
        status: "blocked",
        reason: "empty-response",
        message: "Aurelia template rename propagation returned no status.",
      };
    } catch (err) {
      const message = errorMessage(err);
      this.#logger.warn("renameFromTs.request.failed", { message });
      return {
        status: "blocked",
        reason: "request-failed",
        message: `Aurelia template rename propagation request failed: ${message}`,
      };
    }
  }

  async convertWorkspaceEdit(
    uri: string,
    workspaceEdit: ProtocolWorkspaceEdit,
    token: CancellationToken,
  ): Promise<WorkspaceEdit | undefined> {
    const client = this.#clients.clientForUri(uri);
    if (client == null) {
      throw new Error("No active Aurelia workspace owns the workspace edit origin.");
    }
    return client.protocol2CodeConverter.asWorkspaceEdit(workspaceEdit, token);
  }

  onWorkspaceChanged(
    handler: (payload: WorkspaceNotificationPayload<WorkspaceChangedPayload>) => void,
  ): DisposableLike {
    return this.onNotification("aurelia/workspaceChanged", handler);
  }

  #sessionForUri(uri: string): AureliaLanguageClientSession | undefined {
    return this.#clients.sessionForUri(uri);
  }

  async #sendRequest<T>(
    session: AureliaLanguageClientSession,
    method: string,
    params?: unknown,
    token?: CancellationToken,
  ): Promise<T> {
    return this.#trace.spanAsync(`lsp.${method}`, async () => {
      this.#debug("request", { method, workspace: session.workspace.uri });
      this.#logger.info(`[lsp] → ${method} (${session.workspace.name})`);
      this.#trace.setAttribute("lsp.method", method);
      this.#trace.setAttribute("lsp.workspace", session.workspace.uri);
      this.#trace.setAttribute("lsp.hasParams", Boolean(params));
      try {
        const result = await session.client.sendRequest<T>(method, params, token);
        this.#debug("response", { method, workspace: session.workspace.uri });
        this.#logger.info(`[lsp] ← ${method} ok (${session.workspace.name})`);
        return result;
      } catch (err) {
        const message = errorMessage(err);
        this.#debug("error", { method, workspace: session.workspace.uri, message });
        this.#logger.info(`[lsp] ← ${method} ERROR (${session.workspace.name}): ${message}`);
        throw err;
      }
    });
  }

  #rebindNotifications(): void {
    this.#disposeRawNotifications();
    if (this.#disposed) return;
    for (const session of this.#clients.sessions) {
      for (const [method, handlers] of this.#notificationHandlers) {
        if (handlers.size === 0) continue;
        this.#rawNotificationSubscriptions.push(session.client.onNotification(method, (payload: unknown) => {
          const enriched = workspaceNotificationPayload(payload, session);
          for (const handler of [...(this.#notificationHandlers.get(method) ?? [])]) {
            handler(enriched);
          }
        }));
      }
    }
  }

  #disposeRawNotifications(): void {
    for (const subscription of this.#rawNotificationSubscriptions.splice(0)) {
      try {
        subscription.dispose();
      } catch {
        // A failed/restarted raw client may already have disposed the handler.
      }
    }
  }
}

function workspaceNotificationPayload(
  payload: unknown,
  session: AureliaLanguageClientSession,
): unknown {
  if (payload != null && typeof payload === "object" && !Array.isArray(payload)) {
    return { ...(payload as Record<string, unknown>), workspace: session.workspace };
  }
  return { value: payload, workspace: session.workspace };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
