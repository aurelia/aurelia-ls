import type { Connection, TextDocuments } from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { canonicalDocumentUri } from "@aurelia-ls/compiler/program/paths.js";
import type { DocumentUri } from "@aurelia-ls/compiler/program/primitives.js";
import { createConsoleExporter } from "@aurelia-ls/compiler/shared/trace-exporters.js";
import { NOOP_TRACE, createTrace, type CompileTrace } from "@aurelia-ls/compiler/shared/trace.js";
import type { SemanticWorkspaceEngine } from "@aurelia-ls/semantic-workspace/engine.js";
import type { Logger } from "./services/types.js";

/**
 * Shared server context passed to all handlers.
 * Holds references to core services and provides workspace utilities.
 */
export interface ServerContext {
  readonly connection: Connection;
  readonly documents: TextDocuments<TextDocument>;
  readonly logger: Logger;
  readonly trace: CompileTrace;

  workspaceRoot: string | null;
  workspace: SemanticWorkspaceEngine;

  ensureProgramDocument(uri: string): TextDocument | null;
  lookupText(uri: DocumentUri): string | null;
}

export interface ServerContextInit {
  connection: Connection;
  documents: TextDocuments<TextDocument>;
  logger: Logger;
}

export function createServerContext(init: ServerContextInit): ServerContext {
  const { connection, documents, logger } = init;

  const traceEnabled = process.env["AURELIA_TRACE"] === "1" ||
                       process.env["AURELIA_TRACE"] === "true" ||
                       process.env["AURELIA_LS_TRACE"] === "1" ||
                       process.env["AURELIA_LS_TRACE"] === "true";

  const trace: CompileTrace = traceEnabled
    ? createTrace({
        name: "language-server",
        exporter: createConsoleExporter({
          minDuration: 1_000_000n, // 1ms minimum
          logEvents: false, // Too noisy for LSP
          prefix: "[aurelia-ls-trace]",
        }),
      })
    : NOOP_TRACE;

  if (traceEnabled) {
    logger.info("[trace] Tracing enabled via AURELIA_TRACE environment variable");
  }

  let workspaceRoot: string | null = null;
  let workspace: SemanticWorkspaceEngine;
  const syncedDocumentVersions = new Map<DocumentUri, number>();

  function ensureProgramDocument(uri: string): TextDocument | null {
    const live = documents.get(uri);
    const canonical = canonicalDocumentUri(uri);
    if (live) {
      const lastSyncedVersion = syncedDocumentVersions.get(canonical.uri);
      if (lastSyncedVersion !== live.version) {
        workspace.update(canonical.uri, live.getText(), live.version);
        syncedDocumentVersions.set(canonical.uri, live.version);
      }
      return live;
    }

    const snap = workspace.ensureFromFile(canonical.uri);
    if (!snap) return null;
    syncedDocumentVersions.delete(canonical.uri);
    return TextDocument.create(uri, "html", 0, snap.text);
  }

  function lookupText(uri: DocumentUri): string | null {
    return workspace.lookupText(uri);
  }

  return {
    connection,
    documents,
    logger,
    trace,

    get workspaceRoot() { return workspaceRoot; },
    set workspaceRoot(v) { workspaceRoot = v; },

    get workspace() { return workspace; },
    set workspace(v) {
      workspace = v;
      syncedDocumentVersions.clear();
    },

    ensureProgramDocument,
    lookupText,
  };
}

export { canonicalDocumentUri } from "@aurelia-ls/compiler/program/paths.js";
