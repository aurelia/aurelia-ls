import type { Connection, TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import fs from "node:fs";
import { NodeSemanticRuntimeProjectInputHost } from "@aurelia-ls/semantic-runtime";
import type { Logger } from "./services/types.js";
import { OpenDocumentSourceTextOverlay } from "./runtime/open-document-source-text-overlay.js";
import { SemanticRuntimeLspSession } from "./runtime/semantic-runtime-session.js";
import {
  WorkspaceDocumentUris,
  type DocumentUri,
} from "./utils/document-uri.js";
import { languageIdForSource } from "./utils/document-kind.js";

/**
 * Shared server context passed to all handlers.
 * Holds references to core services and provides workspace utilities.
 */
export interface ServerContext {
  readonly connection: Connection;
  readonly documents: TextDocuments<TextDocument>;
  readonly logger: Logger;
  readonly semanticRuntime: SemanticRuntimeLspSession;
  readonly clientSupport: ServerClientSupport;
  readonly documentUris: WorkspaceDocumentUris;

  readonly workspaceRoot: string | null;
  /** Client can preserve CodeAction.data and lazily resolve the edit property. */
  clientSupportsCodeActionResolveEdit: boolean;

  configureWorkspace(
    rootUri: DocumentUri,
    excludedRootUris?: readonly DocumentUri[],
    projectRootHintUris?: readonly DocumentUri[],
  ): void;

  ownsDocument(uri: DocumentUri): boolean;
  /** Synchronized open text anywhere in the coarse workspace, including hard-excluded dependency roots. */
  openWorkspaceDocument(uri: DocumentUri): TextDocument | null;
  openDocument(uri: DocumentUri): TextDocument | null;
  ensureProgramDocument(uri: string): TextDocument | null;
  lookupDocumentSnapshot(uri: DocumentUri): DocumentSnapshot | null;
  lookupText(uri: DocumentUri): string | null;
}

export interface ServerClientSupport {
  configurationPull: boolean;
  configurationChangeRegistration: boolean;
  inlayHintRefresh: boolean;
  semanticTokensRefresh: boolean;
  diagnosticRefresh: boolean;
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

  const documentUris = new WorkspaceDocumentUris();
  const sourceTextOverlay = new OpenDocumentSourceTextOverlay(documents, documentUris);
  const semanticRuntime = new SemanticRuntimeLspSession({
    documentUris,
    projectInputHost: new NodeSemanticRuntimeProjectInputHost(
      sourceTextOverlay,
    ),
    projectInputCurrentnessPolicy: sourceTextOverlay,
  });
  const clientSupport: ServerClientSupport = {
    configurationPull: false,
    configurationChangeRegistration: false,
    inlayHintRefresh: false,
    semanticTokensRefresh: false,
    diagnosticRefresh: false,
  };

  function ensureProgramDocument(uri: string): TextDocument | null {
    const live = openDocument(uri);
    if (live) {
      return live;
    }
    const snapshot = lookupDocumentSnapshot(uri);
    return snapshot == null
      ? null
      : TextDocument.create(snapshot.uri, snapshot.languageId, snapshot.version ?? 0, snapshot.text);
  }

  function lookupDocumentSnapshot(uri: DocumentUri): DocumentSnapshot | null {
    if (!documentUris.ownsDocument(uri)) {
      return null;
    }
    return lookupWorkspaceDocumentSnapshot(uri);
  }

  function lookupWorkspaceDocumentSnapshot(uri: DocumentUri): DocumentSnapshot | null {
    if (documentUris.workspaceHostPath(uri) == null) {
      return null;
    }
    const live = openWorkspaceDocument(uri);
    if (live) {
      return {
        uri: live.uri,
        languageId: live.languageId,
        version: live.version,
        text: live.getText(),
      };
    }
    const resolved = documentUris.resolve(uri);
    if (resolved.hostPath == null || !fs.existsSync(resolved.hostPath)) {
      return null;
    }
    const text = fs.readFileSync(resolved.hostPath, "utf8");
    return {
      uri: resolved.uri,
      languageId: languageIdForSource(resolved.hostPath),
      version: null,
      text,
    };
  }

  function lookupText(uri: DocumentUri): string | null {
    return lookupWorkspaceDocumentSnapshot(uri)?.text ?? null;
  }

  function openDocument(uri: DocumentUri): TextDocument | null {
    if (!documentUris.ownsDocument(uri)) {
      return null;
    }
    return openWorkspaceDocument(uri);
  }

  function openWorkspaceDocument(uri: DocumentUri): TextDocument | null {
    if (documentUris.workspaceHostPath(uri) == null) {
      return null;
    }
    const direct = documents.get(uri);
    if (direct) {
      return direct;
    }
    const resolved = documentUris.resolve(uri);
    return documents.all().find((doc) => documentUris.sameDocument(doc.uri, resolved.uri)) ?? null;
  }

  return {
    connection,
    documents,
    logger,
    semanticRuntime,
    clientSupport,
    documentUris,

    get workspaceRoot() { return documentUris.workspaceRoot; },
    configureWorkspace(rootUri, excludedRootUris = [], projectRootHintUris = []) {
      documentUris.configure(rootUri, excludedRootUris);
      const projectRootHints = projectRootHintUris.map((uri) => {
        const hostPath = documentUris.workspaceHostPath(uri);
        if (hostPath == null) {
          throw new Error(`Project root hint '${uri}' is not inside workspace '${rootUri}'.`);
        }
        return hostPath;
      });
      semanticRuntime.configureWorkspace(projectRootHints);
    },
    clientSupportsCodeActionResolveEdit: false,

    ownsDocument: (uri) => documentUris.ownsDocument(uri),
    openWorkspaceDocument,
    openDocument,
    ensureProgramDocument,
    lookupDocumentSnapshot,
    lookupText,
  };
}
