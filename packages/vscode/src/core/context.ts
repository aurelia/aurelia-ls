import type { ExtensionContext } from "vscode";
import type { LanguageClient } from "vscode-languageclient/node.js";
import type { VscodeApi } from "../vscode-api.js";
import type { ClientLogger } from "../log.js";
import type { AureliaLanguageClient } from "../client-core.js";
import type { StatusService } from "../status.js";
import { DisposableStore } from "./disposables.js";
import type { CapabilityStore } from "./capabilities.js";
import type { ConfigService } from "./config.js";
import type { FeatureRegistry } from "./feature-registry.js";
import type { LspFacade } from "./lsp-facade.js";
import type { DebugService, ErrorReporter, ObservabilityService, TraceService } from "./observability.js";
import type { ObservabilityStatusService } from "../observability-status.js";
import type { PresentationStore } from "./presentation-store.js";
import type { VirtualDocRegistry } from "./virtual-docs-registry.js";

export interface ClientServices {
  status?: StatusService;
  observabilityStatus?: ObservabilityStatusService;
}

export interface ClientContext {
  extension: ExtensionContext;
  vscode: VscodeApi;
  logger: ClientLogger;
  observability: ObservabilityService;
  debug: DebugService;
  trace: TraceService;
  errors: ErrorReporter;
  languageClient: AureliaLanguageClient;
  lsp: LspFacade;
  rawClient: LanguageClient;
  config: ConfigService;
  capabilities: CapabilityStore;
  presentation: PresentationStore;
  virtualDocs: VirtualDocRegistry;
  features: FeatureRegistry;
  services: ClientServices;
  disposables: DisposableStore;
}

export function createClientContext(opts: Omit<ClientContext, "disposables">): ClientContext {
  return {
    ...opts,
    disposables: new DisposableStore(),
  };
}
