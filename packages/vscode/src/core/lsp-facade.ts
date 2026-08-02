import type { CancellationToken, Disposable, WorkspaceEdit } from "vscode";
import {
  AureliaProtocolNotification,
  AureliaProtocolRequest,
  type ResourceExplorerResponse as ProtocolResourceExplorerResponse,
} from "@aurelia-ls/language-server/protocol";
import type { AureliaLanguageClient, AureliaLanguageClientSession } from "../client-core.js";
import type { ClientLogger } from "../log.js";
import type {
  ProtocolWorkspaceEdit,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ResourceExplorerResponse,
  ScopeResourcesResponse,
  AnalysisChangedPayload,
  WorkspaceNotificationPayload,
} from "../types.js";

type NotificationHandler = (payload: unknown) => void;

/** Routes custom LSP traffic across the active workspace-owned client sessions. */
export class LspFacade implements Disposable {
  #clients: AureliaLanguageClient;
  #logger: ClientLogger;
  #notificationHandlers = new Map<string, Set<NotificationHandler>>();
  #rawNotificationSubscriptions: Disposable[] = [];
  #sessionSubscription: Disposable;
  #disposed = false;

  constructor(clients: AureliaLanguageClient, logger: ClientLogger) {
    this.#clients = clients;
    this.#logger = logger.child("lsp");
    this.#sessionSubscription = clients.onDidChangeSessions(() => this.#rebindNotifications());
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    try {
      this.#sessionSubscription.dispose();
    } catch (error) {
      this.#logger.warn("session-subscription.dispose.failed", undefined, error);
    }
    this.#disposeRawNotifications();
    this.#notificationHandlers.clear();
  }

  onNotification<T>(
    method: string,
    handler: (payload: WorkspaceNotificationPayload<T>) => void,
  ): Disposable {
    let handlers = this.#notificationHandlers.get(method);
    if (handlers == null) {
      handlers = new Set();
      this.#notificationHandlers.set(method, handlers);
    }
    handlers.add(handler as NotificationHandler);
    this.#rebindNotifications();
    return {
      dispose: () => {
        const current = this.#notificationHandlers.get(method);
        current?.delete(handler as NotificationHandler);
        if (current?.size === 0) {
          this.#notificationHandlers.delete(method);
          this.#rebindNotifications();
        }
      },
    };
  }

  async getResources(): Promise<ResourceExplorerResponse | null> {
    const sessions = this.#clients.sessions;
    if (sessions.length === 0) return null;
    const rows = await Promise.all(sessions.map(async (session) => {
      try {
        const response = await this.#sendRequest<ProtocolResourceExplorerResponse>(session, AureliaProtocolRequest.Resources);
        return { status: "ready" as const, session, response };
      } catch (err) {
        return { status: "error" as const, session, error: errorMessage(err) };
      }
    }));
    const available = rows.filter((row): row is Extract<typeof rows[number], { status: "ready" }> =>
      row.status === "ready"
    );
    return {
      fingerprint: rows
        .map((row) => row.status === "ready"
          ? `${row.session.workspace.key}:${row.response.fingerprint}`
          : `${row.session.workspace.key}:error`
        )
        .sort()
        .join("|"),
      resources: available.flatMap(({ session, response }) =>
        response.resources.map((resource) => ({ ...resource, workspace: session.workspace }))
      ),
      templateCount: available.reduce((sum, row) => sum + row.response.templateCount, 0),
      inlineTemplateCount: available.reduce((sum, row) => sum + row.response.inlineTemplateCount, 0),
      workspaces: rows.map((row) => row.status === "ready"
        ? {
            ...row.session.workspace,
            status: row.status,
            resourceCount: row.response.resources.length,
            templateCount: row.response.templateCount,
            inlineTemplateCount: row.response.inlineTemplateCount,
            evidence: row.response.evidence,
          }
        : {
            ...row.session.workspace,
            status: row.status,
            error: row.error,
          }
      ),
    };
  }

  async getScopeResources(uri: string): Promise<ScopeResourcesResponse | null> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    return this.#sendRequest<ScopeResourcesResponse>(session, AureliaProtocolRequest.ScopeResources, { uri });
  }

  async getRelatedFiles(uri: string): Promise<RelatedFilesResponse> {
    const session = this.#sessionForUri(uri);
    if (session == null) return [];
    return this.#sendRequest<RelatedFilesResponse>(session, AureliaProtocolRequest.RelatedFiles, { uri });
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

  onAnalysisChanged(
    handler: (payload: WorkspaceNotificationPayload<AnalysisChangedPayload>) => void,
  ): Disposable {
    return this.onNotification(AureliaProtocolNotification.AnalysisChanged, handler);
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
      } catch (error) {
        this.#logger.warn("raw-notification.dispose.failed", undefined, error);
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
