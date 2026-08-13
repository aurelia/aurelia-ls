import type { CancellationToken, Disposable, WorkspaceEdit } from "vscode";
import {
  AureliaProtocolNotification,
  AureliaProtocolRequest,
  type AnalysisLimitationsResponse,
  type AttributeInterpretationExplanationParams,
  type AttributeInterpretationExplanationResponse,
  type BindingUncertaintyExplanationParams,
  type BindingUncertaintyExplanationResponse,
  type FrameworkCapabilityExplanationParams,
  type FrameworkCapabilityExplanationResponse,
  type ResourceAvailabilityExplanationParams,
  type ResourceAvailabilityExplanationResponse,
  type ResourceInventoryParams,
  type ResourceInventoryResponse,
  type SourceOwnershipResponse,
  type TemplateResourceAvailabilityResponse,
} from "@aurelia-ls/language-server/protocol";
import type { AureliaLanguageClient, AureliaLanguageClientSession } from "../client-core.js";
import type { ClientLogger } from "../log.js";
import {
  createResourceDiscoveryHostControl,
  type ResourceDiscoveryHostControl,
  type ResourceDiscoveryHostFault,
  type ResourceDiscoveryHostRequest,
} from "../resource-discovery-host-control.js";
import type {
  AnalysisLimitationsSnapshot,
  AttributeInterpretationExplanationSnapshot,
  BindingUncertaintyExplanationSnapshot,
  FrameworkCapabilityExplanationSnapshot,
  ProtocolWorkspaceEdit,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ResourceInventorySnapshot,
  ResourceAvailabilityExplanationSnapshot,
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

export interface AnalysisLimitationsOptions {
  readonly workspaceKey?: string;
}

/** Routes custom LSP traffic across the active workspace-owned client sessions. */
export class LspFacade implements Disposable {
  #clients: AureliaLanguageClient;
  #logger: ClientLogger;
  #notificationHandlers = new Map<string, Set<NotificationHandler>>();
  #rawNotificationSubscriptions: Disposable[] = [];
  #sessionSubscription: Disposable;
  #resourceDiscoveryHostControl: ResourceDiscoveryHostControl | undefined;
  #disposed = false;

  constructor(clients: AureliaLanguageClient, logger: ClientLogger) {
    this.#clients = clients;
    this.#logger = logger.child("lsp");
    this.#sessionSubscription = clients.onDidChangeSessions(() => this.#rebindNotifications());
    this.#resourceDiscoveryHostControl = createResourceDiscoveryHostControl({
      admittedWorkspaceKeys: () => this.#clients.sessions.map((session) => session.workspace.key),
    });
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
    this.#resourceDiscoveryHostControl?.dispose();
    this.#resourceDiscoveryHostControl = undefined;
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
    const controlRequest: ResourceDiscoveryHostRequest = {
      operation: "inventory",
      workspaceKeys: sessions.map((session) => session.workspace.key),
      includeTypeSurfaces: options.includeTypeSurfaces === true,
    };
    const beforeControl = this.#resourceDiscoveryHostControl;
    const controlOrdinal = beforeControl == null
      ? 0
      : await beforeControl.beforeDispatch(controlRequest, token);
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
    let snapshot: ResourceInventorySnapshot = { workspaces: rows };
    const afterControl = this.#resourceDiscoveryHostControl;
    if (afterControl != null) {
      afterControl.noteInventory(snapshot.workspaces);
      snapshot = await afterControl.afterResponse(
        controlRequest,
        controlOrdinal,
        resourceInventoryFingerprint(snapshot, options.workspaceKey),
        snapshot,
        applyResourceInventoryHostFault,
        token,
      );
    }
    this.#logResourceInventoryIssues(snapshot.workspaces);
    return snapshot;
  }

  async getAnalysisLimitations(
    options: AnalysisLimitationsOptions = {},
    token?: CancellationToken,
  ): Promise<AnalysisLimitationsSnapshot | null> {
    const sessions = options.workspaceKey == null
      ? this.#clients.sessions
      : this.#clients.sessions.filter((session) => session.workspace.key === options.workspaceKey);
    if (sessions.length === 0) return null;
    const workspaces = await Promise.all(sessions.map(async (session) => {
      try {
        const response = await this.#sendRequest<AnalysisLimitationsResponse>(
          session,
          AureliaProtocolRequest.AnalysisLimitations,
          undefined,
          token,
        );
        return { ...session.workspace, status: "ready" as const, response };
      } catch (error) {
        return { ...session.workspace, status: "error" as const, error: errorMessage(error) };
      }
    }));
    const snapshot: AnalysisLimitationsSnapshot = { workspaces };
    this.#logAnalysisLimitationIssues(snapshot);
    return snapshot;
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
    const controlRequest: ResourceDiscoveryHostRequest = {
      operation: "availability",
      workspaceKeys: [session.workspace.key],
      ...(projectKey == null ? {} : { projectKey }),
    };
    const beforeControl = this.#resourceDiscoveryHostControl;
    const controlOrdinal = beforeControl == null
      ? 0
      : await beforeControl.beforeDispatch(controlRequest, token);
    let response = await this.#sendRequest<TemplateResourceAvailabilityResponse>(
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
    const afterControl = this.#resourceDiscoveryHostControl;
    if (afterControl != null) {
      afterControl.noteAvailability(session.workspace.key, response.projectSelection);
      response = await afterControl.afterResponse(
        controlRequest,
        controlOrdinal,
        response.fingerprint,
        response,
        (value) => ({ applied: false, value }),
        token,
      );
    }
    this.#logTemplateAvailabilityIssues(response, session.workspace.key);
    return { ...response, workspace: session.workspace };
  }

  async getFrameworkCapabilityExplanation(
    params: FrameworkCapabilityExplanationParams,
    token?: CancellationToken,
  ): Promise<FrameworkCapabilityExplanationSnapshot | null> {
    const session = this.#sessionForUri(params.uri);
    if (session == null) return null;
    const response = await this.#sendRequest<FrameworkCapabilityExplanationResponse>(
      session,
      AureliaProtocolRequest.FrameworkCapabilityExplanation,
      params,
      token,
    );
    return { ...response, workspace: session.workspace };
  }

  async getAttributeInterpretationExplanation(
    params: AttributeInterpretationExplanationParams,
    token?: CancellationToken,
  ): Promise<AttributeInterpretationExplanationSnapshot | null> {
    const session = this.#sessionForUri(params.uri);
    if (session == null) return null;
    const response = await this.#sendRequest<AttributeInterpretationExplanationResponse>(
      session,
      AureliaProtocolRequest.AttributeInterpretationExplanation,
      params,
      token,
    );
    return { ...response, workspace: session.workspace };
  }

  async getBindingUncertaintyExplanation(
    params: BindingUncertaintyExplanationParams,
    token?: CancellationToken,
  ): Promise<BindingUncertaintyExplanationSnapshot | null> {
    const session = this.#sessionForUri(params.uri);
    if (session == null) return null;
    const response = await this.#sendRequest<BindingUncertaintyExplanationResponse>(
      session,
      AureliaProtocolRequest.BindingUncertaintyExplanation,
      params,
      token,
    );
    return { ...response, workspace: session.workspace };
  }

  async getResourceAvailabilityExplanation(
    workspaceKey: string,
    params: ResourceAvailabilityExplanationParams,
    token?: CancellationToken,
  ): Promise<ResourceAvailabilityExplanationSnapshot | null> {
    const session = this.#clients.sessions.find((candidate) => candidate.workspace.key === workspaceKey);
    const sourceSession = this.#sessionForUri(params.uri);
    if (session == null || sourceSession !== session) return null;
    const response = await this.#sendRequest<ResourceAvailabilityExplanationResponse>(
      session,
      AureliaProtocolRequest.ResourceAvailabilityExplanation,
      params,
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

  #logResourceInventoryIssues(workspaces: ResourceInventorySnapshot["workspaces"]): void {
    for (const workspace of workspaces) {
      if (workspace.status === "error") {
        // #sendRequest already recorded the transport exception with workspace
        // context before it was conserved as an error row.
        continue;
      }
      for (const project of workspace.response.projects) {
        if (project.status === "error") {
          this.#logger.warn("resource-inventory.project.issue", {
            workspace: workspace.key,
            project: project.project.projectKey,
            status: project.status,
            message: project.message,
          });
          continue;
        }
        if (
          project.answer.result === "answered"
          && project.answer.coverage === "complete"
          && !resourceCompletenessHasIssue(project.completeness)
        ) {
          continue;
        }
        this.#logger.warn("resource-inventory.project.issue", {
          workspace: workspace.key,
          project: project.project.projectKey,
          result: project.answer.result,
          coverage: project.answer.coverage,
          summary: project.answer.summary,
          completeness: project.completeness,
        });
      }
    }
  }

  #logAnalysisLimitationIssues(snapshot: AnalysisLimitationsSnapshot): void {
    for (const workspace of snapshot.workspaces) {
      if (workspace.status === "error") continue;
      for (const project of workspace.response.projects) {
        if (project.status === "error") {
          this.#logger.warn("analysis-limitations.project.issue", {
            workspace: workspace.key,
            project: project.projectKey,
            message: project.message,
          });
          continue;
        }
        if (project.answer.result === "answered") continue;
        this.#logger.warn("analysis-limitations.project.issue", {
          workspace: workspace.key,
          project: project.projectKey,
          result: project.answer.result,
          coverage: project.answer.coverage,
          summary: project.answer.summary,
        });
      }
    }
  }

  #logTemplateAvailabilityIssues(
    response: TemplateResourceAvailabilityResponse,
    workspaceKey: string,
  ): void {
    const selection = response.projectSelection;
    if (selection.status !== "exact") return;
    if (
      selection.answer.result === "answered"
      && selection.answer.coverage === "complete"
      && !resourceCompletenessHasIssue(selection.completeness)
    ) {
      return;
    }
    this.#logger.warn("template-resource-availability.issue", {
      workspace: workspaceKey,
      project: selection.project.projectKey,
      result: selection.answer.result,
      coverage: selection.answer.coverage,
      summary: selection.answer.summary,
      completeness: selection.completeness,
    });
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

function resourceInventoryFingerprint(
  snapshot: ResourceInventorySnapshot,
  workspaceKey: string | undefined,
): string | null {
  if (workspaceKey == null) {
    if (snapshot.workspaces.length !== 1) return null;
    const [workspace] = snapshot.workspaces;
    return workspace?.status === "ready" ? workspace.response.fingerprint : null;
  }
  const fingerprints = snapshot.workspaces.flatMap((workspace) =>
    workspace.status === "ready" && workspace.key === workspaceKey
      ? [workspace.response.fingerprint]
      : []
  );
  return fingerprints.length === 1 ? fingerprints[0]! : null;
}

function applyResourceInventoryHostFault(
  snapshot: ResourceInventorySnapshot,
  fault: ResourceDiscoveryHostFault,
): { readonly applied: boolean; readonly value: ResourceInventorySnapshot } {
  let applied = false;
  const message = `Resource discovery host control ${fault.stableCode}.`;
  const workspaces = snapshot.workspaces.map((workspace) => {
    if (fault.effect === "newest-error-once") {
      if (workspace.key !== fault.workspaceKey || workspace.status !== "ready") return workspace;
      applied = true;
      return {
        key: workspace.key,
        name: workspace.name,
        uri: workspace.uri,
        status: "error" as const,
        error: message,
      };
    }
    if (workspace.status !== "ready") return workspace;
    if (fault.effect === "project-error-once" && workspace.key !== fault.workspaceKey) return workspace;
    const projects = workspace.response.projects.map((project) => {
      if (project.status !== "ready") return project;
      if (fault.effect === "project-error-once" && project.project.projectKey !== fault.projectKey) return project;
      applied = true;
      return {
        status: "error" as const,
        project: project.project,
        message,
      };
    });
    return { ...workspace, response: { ...workspace.response, projects } };
  });
  return { applied, value: { workspaces } };
}

function protocolPosition(position: { readonly line: number; readonly character: number }): {
  readonly line: number;
  readonly character: number;
} {
  return { line: position.line, character: position.character };
}

function resourceCompletenessHasIssue(completeness: {
  readonly unnamedDefinitions: number;
  readonly unresolvedModules: number;
  readonly openVisibility: number;
}): boolean {
  return completeness.unnamedDefinitions > 0
    || completeness.unresolvedModules > 0
    || completeness.openVisibility > 0;
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
