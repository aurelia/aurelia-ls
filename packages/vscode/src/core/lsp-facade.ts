import type { LanguageClient } from "vscode-languageclient/node.js";
import type { ClientLogger } from "../log.js";
import type { DebugChannel, ObservabilityService, TraceService } from "./observability.js";
import type {
  CapabilitiesResponse,
  DiagnosticsSnapshotResponse,
  MappingResponse,
  OverlayReadyPayload,
  OverlayResponse,
  SsrResponse,
  TemplateInfoResponse,
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
      this.#trace.setAttribute("lsp.method", method);
      this.#trace.setAttribute("lsp.hasParams", Boolean(params));
      try {
        const result = await this.#client.sendRequest<T>(method, params);
        this.#debug("response", { method });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.#debug("error", { method, message });
        throw err;
      }
    });
  }

  async getOverlay(uri: string): Promise<OverlayResponse | null> {
    return this.sendRequest<OverlayResponse | null>("aurelia/getOverlay", { uri });
  }

  async getMapping(uri: string): Promise<MappingResponse | null> {
    return this.sendRequest<MappingResponse | null>("aurelia/getMapping", { uri });
  }

  async getSsr(uri: string): Promise<SsrResponse | null> {
    return this.sendRequest<SsrResponse | null>("aurelia/getSsr", { uri });
  }

  async getDiagnostics(uri: string): Promise<DiagnosticsSnapshotResponse | null> {
    return this.sendRequest<DiagnosticsSnapshotResponse | null>("aurelia/getDiagnostics", { uri });
  }

  async queryAtPosition(uri: string, position: { line: number; character: number }): Promise<TemplateInfoResponse | null> {
    return this.sendRequest<TemplateInfoResponse | null>("aurelia/queryAtPosition", { uri, position });
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

  onOverlayReady(handler: (payload: OverlayReadyPayload) => void): void {
    this.onNotification("aurelia/overlayReady", handler);
  }

  onCatalogUpdated(handler: (payload: { fingerprint: string; resourceCount: number }) => void): void {
    this.onNotification("aurelia/catalogUpdated", handler);
  }
}
