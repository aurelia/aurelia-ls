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
import { createConnection, ProposedFeatures, TextDocuments } from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createServerContext } from "./context.js";
import type { Logger } from "./services/types.js";
import { registerFeatureHandlers } from "./handlers/features.js";
import { registerCustomHandlers } from "./handlers/custom.js";
import { registerLifecycleHandlers } from "./handlers/lifecycle.js";

// Create LSP connection and document store
const connection = createConnection(ProposedFeatures.all);
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
});

// Register all handlers
registerLifecycleHandlers(ctx);
registerFeatureHandlers(ctx);
registerCustomHandlers(ctx);

// Start listening
documents.listen(connection);
connection.listen();
