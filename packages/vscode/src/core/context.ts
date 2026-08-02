import type { ExtensionContext } from "vscode";
import type { VscodeApi } from "../vscode-api.js";
import type { ClientLogger } from "../log.js";
import type { AureliaLanguageClient } from "../client-core.js";
import { DisposableStore } from "./disposables.js";
import type { LspFacade } from "./lsp-facade.js";
import type { ErrorReporter } from "./errors.js";

export interface ClientContext {
  extension: ExtensionContext;
  vscode: VscodeApi;
  logger: ClientLogger;
  errors: ErrorReporter;
  languageClient: AureliaLanguageClient;
  lsp: LspFacade;
  disposables: DisposableStore;
}

export function createClientContext(opts: Omit<ClientContext, "disposables">): ClientContext {
  return {
    ...opts,
    disposables: new DisposableStore(),
  };
}

