import type { ExtensionContext } from "vscode";
import type { VscodeApi } from "../vscode-api.js";
import type { ClientLogger } from "../log.js";
import type { AureliaLanguageClient } from "../client-core.js";
import type { LspFacade } from "./lsp-facade.js";
import type { ErrorReporter } from "./errors.js";
import type { SupportReportService } from "../support-report.js";

export interface ClientContext {
  extension: ExtensionContext;
  vscode: VscodeApi;
  logger: ClientLogger;
  errors: ErrorReporter;
  languageClient: AureliaLanguageClient;
  lsp: LspFacade;
  /** Early, extension-owned support surface; absent in focused feature harnesses. */
  supportReport?: SupportReportService;
}

export function createClientContext(opts: ClientContext): ClientContext {
  return opts;
}

