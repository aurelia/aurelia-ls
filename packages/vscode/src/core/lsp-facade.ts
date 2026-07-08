import type { LanguageClient } from "vscode-languageclient/node.js";
import type { ClientLogger } from "../log.js";
import type { DebugChannel, ObservabilityService, TraceService } from "./observability.js";
import type {
  CapabilitiesResponse,
  AnalysisReadyPayload,
  DiagnosticsSnapshotResponse,
  RelatedFileResponse,
  RenameFromTsResponse,
} from "../types.js";

export class LspFacade {
  #client: LanguageClient;
  #logger: ClientLogger;
  #trace: TraceService;
  #debug: DebugChannel;
  #notifications: Array<{ method: string; handler: (payload: unknown) => void }> = [];

  constructor(client: LanguageClient, observability: ObservabilityService) {
    this.#client = client;
    this.#logger = observability.logger;
    this.#trace = observability.trace;
    this.#debug = observability.debug.channel("lsp");
  }

  get raw(): LanguageClient {
    return this.#client;
  }

  setClient(client: LanguageClient): void {
    this.#client = client;
    for (const { method, handler } of this.#notifications) {
      this.#client.onNotification(method, handler);
    }
  }

  onNotification<T>(method: string, handler: (payload: T) => void): void {
    this.#notifications.push({ method, handler: handler as (payload: unknown) => void });
    this.#client.onNotification(method, handler);
  }

  sendRequest<T>(method: string, params?: unknown): Promise<T> {
    return this.#trace.spanAsync(`lsp.${method}`, async () => {
      this.#debug("request", { method });
      this.#logger.info(`[lsp] → ${method}`);
      this.#trace.setAttribute("lsp.method", method);
      this.#trace.setAttribute("lsp.hasParams", Boolean(params));
      try {
        const result = await this.#client.sendRequest<T>(method, params);
        this.#debug("response", { method });
        this.#logger.info(`[lsp] ← ${method} ok`);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.#debug("error", { method, message });
        this.#logger.info(`[lsp] ← ${method} ERROR: ${message}`);
        throw err;
      }
    });
  }

  async getDiagnostics(uri: string): Promise<DiagnosticsSnapshotResponse | null> {
    return this.sendRequest<DiagnosticsSnapshotResponse | null>("aurelia/getDiagnostics", { uri });
  }

  async dumpState(): Promise<unknown> {
    return this.sendRequest<unknown>("aurelia/dumpState");
  }

  async inspectEntity(uri: string, position: { line: number; character: number }): Promise<import("../types.js").InspectEntityResponse | null> {
    try {
      return await this.sendRequest<import("../types.js").InspectEntityResponse | null>("aurelia/inspectEntity", { uri, position });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#logger.warn("inspectEntity.request.failed", { message });
      return null;
    }
  }

  async getResources(): Promise<import("../types.js").ResourceExplorerResponse | null> {
    try {
      return await this.sendRequest<import("../types.js").ResourceExplorerResponse | null>("aurelia/getResources");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#logger.warn("resources.request.failed", { message });
      return null;
    }
  }

  async getCapabilities(): Promise<CapabilitiesResponse | null> {
    try {
      return await this.sendRequest<CapabilitiesResponse | null>("aurelia/capabilities");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#logger.warn("capabilities.request.failed", { message });
      return null;
    }
  }

  onAnalysisReady(handler: (payload: AnalysisReadyPayload) => void): void {
    this.onNotification("aurelia/analysisReady", handler);
  }

  async getScopeResources(uri: string): Promise<import("../types.js").ScopeResourcesResponse | null> {
    try {
      return await this.sendRequest<import("../types.js").ScopeResourcesResponse | null>("aurelia/getScopeResources", { uri });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#logger.warn("scopeResources.request.failed", { message });
      return null;
    }
  }

  async getRelatedFile(uri: string): Promise<RelatedFileResponse> {
    try {
      return await this.sendRequest<RelatedFileResponse>("aurelia/getRelatedFile", { uri });
    } catch {
      return null;
    }
  }

  async renameFromTs(
    uri: string,
    position: { line: number; character: number },
    newName: string,
  ): Promise<RenameFromTsResponse> {
    try {
      const response = await this.sendRequest<RenameFromTsResponse | null>("aurelia/renameFromTs", { uri, position, newName });
      return response ?? {
        status: "blocked",
        reason: "empty-response",
        message: "Aurelia template rename propagation returned no status.",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.#logger.warn("renameFromTs.request.failed", { message });
      return {
        status: "blocked",
        reason: "request-failed",
        message: `Aurelia template rename propagation request failed: ${message}`,
      };
    }
  }

  onWorkspaceChanged(handler: (payload: { fingerprint: string; domains: string[] }) => void): void {
    this.onNotification("aurelia/workspaceChanged", handler);
  }
}
