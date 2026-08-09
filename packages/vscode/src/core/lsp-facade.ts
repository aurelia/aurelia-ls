import type { CancellationToken, Disposable, WorkspaceEdit } from "vscode";
import {
  AureliaProtocolNotification,
  AureliaProtocolRequest,
  type ResourceInventoryParams,
  type ResourceInventoryResponse,
  type SourceOwnershipResponse,
  type TemplateResourceAvailabilityResponse,
} from "@aurelia-ls/language-server/protocol";
import type { AureliaLanguageClient, AureliaLanguageClientSession } from "../client-core.js";
import type { ClientLogger } from "../log.js";
import type {
  ProtocolWorkspaceEdit,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ResourceInventorySnapshot,
  SourceOwnershipSnapshot,
  TemplateResourceAvailabilitySnapshot,
  AnalysisChangedPayload,
  WorkspaceNotificationPayload,
} from "../types.js";

type NotificationHandler = (payload: unknown) => void;

export interface ResourceInventoryOptions {
  readonly workspaceKey?: string;
  readonly includeTypeSurfaces?: boolean;
}

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

  async getResourceInventory(
    options: ResourceInventoryOptions = {},
    token?: CancellationToken,
  ): Promise<ResourceInventorySnapshot | null> {
    const sessions = options.workspaceKey == null
      ? this.#clients.sessions
      : this.#clients.sessions.filter((session) => session.workspace.key === options.workspaceKey);
    if (sessions.length === 0) return null;
    const params: ResourceInventoryParams = options.includeTypeSurfaces === true
      ? { includeTypeSurfaces: true }
      : {};
    const rows = await Promise.all(sessions.map(async (session) => {
      try {
        const response = await this.#sendRequest<ResourceInventoryResponse>(
          session,
          AureliaProtocolRequest.ResourceInventory,
          params,
          token,
        );
        return { ...session.workspace, status: "ready" as const, response };
      } catch (err) {
        return { ...session.workspace, status: "error" as const, error: errorMessage(err) };
      }
    }));
    return { workspaces: rows };
  }

  async getTemplateResourceAvailability(
    uri: string,
    position: { readonly line: number; readonly character: number },
    projectKey?: string,
    templateResourceScopeIdentityKey?: string,
    token?: CancellationToken,
  ): Promise<TemplateResourceAvailabilitySnapshot | null> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    const response = await this.#sendRequest<TemplateResourceAvailabilityResponse>(
      session,
      AureliaProtocolRequest.TemplateResourceAvailability,
      {
        uri,
        position: protocolPosition(position),
        ...(projectKey == null ? {} : { projectKey }),
        ...(templateResourceScopeIdentityKey == null ? {} : { templateResourceScopeIdentityKey }),
      },
      token,
    );
    return { ...response, workspace: session.workspace };
  }

  async getRelatedFiles(uri: string): Promise<RelatedFilesResponse> {
    const session = this.#sessionForUri(uri);
    if (session == null) return [];
    return this.#sendRequest<RelatedFilesResponse>(session, AureliaProtocolRequest.RelatedFiles, { uri });
  }

  async getSourceOwnership(
    uri: string,
    token?: CancellationToken,
  ): Promise<SourceOwnershipSnapshot | null> {
    const session = this.#sessionForUri(uri);
    if (session == null) return null;
    const response = await this.#sendRequest<SourceOwnershipResponse>(
      session,
      AureliaProtocolRequest.SourceOwnership,
      { uri },
      token,
    );
    return { ...response, workspace: session.workspace };
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
        { uri, position: protocolPosition(position), ...(newName == null ? {} : { newName }) },
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
          if (
            method === AureliaProtocolNotification.AnalysisChanged
            && isAnalysisChangedPayload(payload)
            && payload.changeKind === "topology"
          ) {
            void this.#dispatchSettledTopologyNotification(method, payload, session);
            return;
          }
          const enriched = workspaceNotificationPayload(payload, session);
          for (const handler of [...(this.#notificationHandlers.get(method) ?? [])]) {
            handler(enriched);
          }
        }));
      }
    }
  }

  async #dispatchSettledTopologyNotification(
    method: string,
    payload: AnalysisChangedPayload,
    observedSession: AureliaLanguageClientSession,
  ): Promise<void> {
    try {
      const retained = await this.#clients.reconfirmSessionTopology(observedSession, payload);
      if (!retained || this.#disposed) return;
      const current = this.#clients.sessions.find((session) =>
        session.workspace.key === observedSession.workspace.key
        && session.client === observedSession.client
      );
      if (current == null) return;
      const enriched = workspaceNotificationPayload(payload, current);
      for (const handler of [...(this.#notificationHandlers.get(method) ?? [])]) {
        handler(enriched);
      }
    } catch (error) {
      this.#logger.warn("topology-reconfirmation.failed", {
        workspace: observedSession.workspace.uri,
        fingerprint: payload.fingerprint,
      }, error);
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

function protocolPosition(position: { readonly line: number; readonly character: number }): {
  readonly line: number;
  readonly character: number;
} {
  return { line: position.line, character: position.character };
}

function isAnalysisChangedPayload(value: unknown): value is AnalysisChangedPayload {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return typeof payload["fingerprint"] === "string"
    && (payload["changeKind"] === "source-text" || payload["changeKind"] === "topology");
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
