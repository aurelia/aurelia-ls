import type { Connection, TextDocuments } from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { NodeSemanticRuntimeProjectInputHost } from "@aurelia-ls/semantic-runtime";
import type { Logger } from "./services/types.js";
import { OpenDocumentSourceTextOverlay } from "./runtime/open-document-source-text-overlay.js";
import {
  SemanticRuntimeLspSession,
  type SemanticRuntimeLspOpenDocumentMetadata,
} from "./runtime/semantic-runtime-session.js";
import {
  WorkspaceDocumentUris,
  type DocumentUri,
} from "./utils/document-uri.js";

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
  /**
   * Find synchronized open-document metadata anywhere in the coarse workspace,
   * including hard-excluded dependency roots. Semantic handlers must read text
   * through their operation-owned document facade instead of this lifecycle helper.
   */
  openWorkspaceDocument(uri: DocumentUri): SemanticRuntimeLspOpenDocumentMetadata | null;
}

export interface ServerClientSupport {
  configurationPull: boolean;
  configurationChangeRegistration: boolean;
  inlayHintRefresh: boolean;
  semanticTokensRefresh: boolean;
  diagnosticRefresh: boolean;
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
    openDocumentMetadata: (uri) => openWorkspaceDocument(uri),
    publishEffect: (effect) => {
      switch (effect.kind) {
        case "log":
          logger[effect.level](effect.message);
          return;
        case "show-message":
          return connection.sendNotification("window/showMessage", {
            type: effect.type,
            message: effect.message,
          });
      }
    },
  });
  const clientSupport: ServerClientSupport = {
    configurationPull: false,
    configurationChangeRegistration: false,
    inlayHintRefresh: false,
    semanticTokensRefresh: false,
    diagnosticRefresh: false,
  };

  function openWorkspaceDocument(
    uri: DocumentUri,
  ): SemanticRuntimeLspOpenDocumentMetadata | null {
    if (documentUris.workspaceHostPath(uri) == null) {
      return null;
    }
    const document = sourceTextOverlay.openDocument(uri);
    return document == null ? null : openDocumentMetadata(document);
  }

  function openDocumentMetadata(
    document: TextDocument,
  ): SemanticRuntimeLspOpenDocumentMetadata {
    return {
      uri: document.uri,
      languageId: document.languageId,
      version: document.version,
    };
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
      sourceTextOverlay.reindexOpenDocuments();
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
  };
}
