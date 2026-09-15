/**
 * Aurelia Language Server - Entry Point
 *
 * This is a thin entry point that creates the server context and wires together
 * all the handlers. The actual logic is split into:
 *
 * - context.ts          - ServerContext with shared state and workspace utilities
 * - mapping/lsp-types.ts - Type conversion from template types to LSP types
 * - handlers/features.ts - LSP feature handlers (completions, hover, etc.)
 * - handlers/custom.ts   - Custom Aurelia request handlers
 * - handlers/lifecycle.ts - Lifecycle and document event handlers
 */
import { parentPort, workerData } from "node:worker_threads";
import { TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createServerContext } from "./context.js";
import type { Logger } from "./services/types.js";
import { registerFeatureHandlers } from "./handlers/features.js";
import { registerCustomHandlers } from "./handlers/custom.js";
import { registerLifecycleHandlers } from "./handlers/lifecycle.js";
import { registerDiagnosticHandlers } from "./handlers/diagnostics.js";
import { createLanguageServerConnection } from "./transport.js";
import { installWorkerProgress } from "./worker-progress.js";
import { AURELIA_WORKER_PROGRESS_SCHEMA } from "./worker-progress-protocol.js";

// Create LSP connection and document store
const workerMode = parentPort != null;
const transportOptions: unknown = workerData;
// Only a host that understands the transport-local envelope receives progress messages.
if (parentPort != null && transportOptions != null && typeof transportOptions === "object"
  && "aureliaWorkerProgress" in transportOptions
  && transportOptions.aureliaWorkerProgress === AURELIA_WORKER_PROGRESS_SCHEMA) {
  const port = parentPort;
  const stopProgress = installWorkerProgress((message) => port.postMessage(message));
  port.once("close", stopProgress);
}
const connection = createLanguageServerConnection(parentPort);
const documents = new TextDocuments(TextDocument);

// Create logger that writes to LSP connection console
const logger: Logger = {
  log: (m: string) => connection.console.log(`[aurelia-ls] ${m}`),
  info: (m: string) => connection.console.info(`[aurelia-ls] ${m}`),
  warn: (m: string) => connection.console.warn(`[aurelia-ls] ${m}`),
  error: (m: string) => connection.console.error(`[aurelia-ls] ${m}`),
};

// Create server context with all dependencies
const ctx = createServerContext({
  connection,
  documents,
  logger,
  enableProjectInputCancellationCheckpoints: workerMode,
});

// Register all handlers
registerLifecycleHandlers(ctx);
registerDiagnosticHandlers(ctx);
registerFeatureHandlers(ctx);
registerCustomHandlers(ctx);

// Start listening
documents.listen(connection);
connection.listen();
