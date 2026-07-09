import type { Connection, TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import fs from "node:fs";
import { URI } from "vscode-uri";
import type { Logger } from "./services/types.js";
import { SemanticRuntimeLspSession } from "./runtime/semantic-runtime-session.js";
import { canonicalDocumentUri, type DocumentUri } from "./utils/document-uri.js";
import { createServerTrace, type CompileTrace } from "./utils/trace.js";

/**
 * Shared server context passed to all handlers.
 * Holds references to core services and provides workspace utilities.
 */
export interface ServerContext {
  readonly connection: Connection;
  readonly documents: TextDocuments<TextDocument>;
  readonly logger: Logger;
  readonly trace: CompileTrace;
  readonly semanticRuntime: SemanticRuntimeLspSession;

  workspaceRoot: string | null;

  ensureProgramDocument(uri: string): TextDocument | null;
  lookupDocumentSnapshot(uri: DocumentUri): DocumentSnapshot | null;
  lookupText(uri: DocumentUri): string | null;
}

export interface DocumentSnapshot {
  readonly uri: DocumentUri;
  readonly languageId: string;
  readonly version: number | null;
  readonly text: string;
}

export interface ServerContextInit {
  connection: Connection;
  documents: TextDocuments<TextDocument>;
  logger: Logger;
}

export function createServerContext(init: ServerContextInit): ServerContext {
  const { connection, documents, logger } = init;

  const trace = createServerTrace(logger);
  let workspaceRoot: string | null = null;
  const semanticRuntime = new SemanticRuntimeLspSession({
    workspaceRoot,
    documents,
  });

  function ensureProgramDocument(uri: string): TextDocument | null {
    const live = liveDocumentForUri(uri);
    if (live) {
      return live;
    }
    const snapshot = lookupDocumentSnapshot(uri);
    return snapshot == null
      ? null
      : TextDocument.create(snapshot.uri, snapshot.languageId, snapshot.version ?? 0, snapshot.text);
  }

  function lookupDocumentSnapshot(uri: DocumentUri): DocumentSnapshot | null {
    const live = liveDocumentForUri(uri);
    if (live) {
      return {
        uri: live.uri,
        languageId: live.languageId,
        version: live.version,
        text: live.getText(),
      };
    }
    const canonical = canonicalDocumentUri(uri);
    if (!fs.existsSync(canonical.file)) {
      return null;
    }
    const text = fs.readFileSync(canonical.file, "utf8");
    return {
      uri: canonical.uri,
      languageId: guessLanguage(canonical.file),
      version: null,
      text,
    };
  }

  function lookupText(uri: DocumentUri): string | null {
    return lookupDocumentSnapshot(uri)?.text ?? null;
  }

  function liveDocumentForUri(uri: DocumentUri): TextDocument | null {
    const direct = documents.get(uri);
    if (direct) {
      return direct;
    }
    const canonical = canonicalDocumentUri(uri);
    return documents.all().find((doc) => {
      try {
        return canonicalDocumentUri(doc.uri).file.toLowerCase() === canonical.file.toLowerCase();
      } catch {
        return false;
      }
    }) ?? null;
  }

  return {
    connection,
    documents,
    logger,
    trace,
    semanticRuntime,

    get workspaceRoot() { return workspaceRoot; },
    set workspaceRoot(v) {
      workspaceRoot = v;
      semanticRuntime.configureWorkspace(v);
    },

    ensureProgramDocument,
    lookupDocumentSnapshot,
    lookupText,
  };
}

function guessLanguage(filePathOrUri: string): string {
  const path = filePathOrUri.startsWith("file:") ? URI.parse(filePathOrUri).fsPath : filePathOrUri;
  if (path.endsWith(".ts") || path.endsWith(".js")) return "typescript";
  if (path.endsWith(".json")) return "json";
  return "html";
}

export { canonicalDocumentUri } from "./utils/document-uri.js";
