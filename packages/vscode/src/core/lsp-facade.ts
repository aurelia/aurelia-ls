import type { CancellationToken, WorkspaceEdit } from "vscode";
import { AureliaProtocolNotification, AureliaProtocolRequest } from "@aurelia-ls/language-server/protocol";
import type { AureliaLanguageClient, AureliaLanguageClientSession } from "../client-core.js";
import type { ClientLogger } from "../log.js";
import type {
  AnalysisReadyPayload,
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

type NotificationHandler = (payload: unknown) => void;

/** Routes custom LSP traffic across the active workspace-owned client sessions. */
export class LspFacade implements DisposableLike {
  #clients: AureliaLanguageClient;
  #logger: ClientLogger;
  #notificationHandlers = new Map<string, Set<NotificationHandler>>();
  #rawNotificationSubscriptions: DisposableLike[] = [];
  #sessionSubscription: DisposableLike;
  #disposed = false;

  constructor(clients: AureliaLanguageClient, logger: ClientLogger) {
    this.#clients = clients;
    this.#logger = logger.child("lsp");
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
      : this.#sendRequest(session, AureliaProtocolRequest.Diagnostics, { uri });
  }

  async inspectEntity(
    uri: string,
    position: { line: number; character: number },
  ): Promise<InspectEntityResponse | null> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    try {
      return await this.#sendRequest<InspectEntityResponse>(session, AureliaProtocolRequest.InspectEntity, { uri, position });
    } catch (err) {
      this.#logger.warn("inspectEntity.request.failed", { message: errorMessage(err) });
      return null;
    }
  }

  async getResources(): Promise<ResourceExplorerResponse | null> {
    const rows = await Promise.all(this.#clients.sessions.map(async (session) => {
      try {
        const response = await this.#sendRequest<ResourceExplorerResponse | null>(session, AureliaProtocolRequest.Resources);
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

  onAnalysisReady(
    handler: (payload: WorkspaceNotificationPayload<AnalysisReadyPayload>) => void,
  ): DisposableLike {
    return this.onNotification(AureliaProtocolNotification.AnalysisReady, handler);
  }

  async getScopeResources(uri: string): Promise<ScopeResourcesResponse | null> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    try {
      return await this.#sendRequest<ScopeResourcesResponse>(session, AureliaProtocolRequest.ScopeResources, { uri });
    } catch (err) {
      this.#logger.warn("scopeResources.request.failed", { message: errorMessage(err) });
      return null;
    }
  }

  async getRelatedFile(uri: string): Promise<RelatedFileResponse> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    try {
      return await this.#sendRequest<RelatedFileResponse>(session, AureliaProtocolRequest.RelatedFile, { uri });
    } catch {
      return null;
    }
  }

  async renameFromTs(
    uri: string,
    position: { line: number; character: number },
    newName: string | undefined,
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
        AureliaProtocolRequest.RenameFromTypeScript,
        { uri, position, ...(newName == null ? {} : { newName }) },
        token,
      );
      return response ?? {
        status: "blocked",
        reason: "empty-response",
        message: "Aurelia cross-domain rename returned no status.",
      };
    } catch (err) {
      const message = errorMessage(err);
      this.#logger.warn("renameFromTs.request.failed", { message });
      return {
        status: "blocked",
        reason: "request-failed",
        message: `Aurelia cross-domain rename request failed: ${message}`,
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
    return this.onNotification(AureliaProtocolNotification.WorkspaceChanged, handler);
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
    const started = performance.now();
    this.#logger.debug("request", { method, workspace: session.workspace.uri, hasParams: params != null });
    try {
      const result = await session.client.sendRequest<T>(method, params, token);
      this.#logger.debug("response", {
        method,
        workspace: session.workspace.uri,
        durationMs: Math.round((performance.now() - started) * 10) / 10,
      });
      return result;
    } catch (error) {
      this.#logger.warn("request.failed", {
        method,
        workspace: session.workspace.uri,
        durationMs: Math.round((performance.now() - started) * 10) / 10,
      }, error);
      throw error;
    }
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
