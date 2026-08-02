import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  type SemanticRuntimeSourceTextOverlay,
} from "@aurelia-ls/semantic-runtime";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";

export interface OpenTextDocumentStore {
  get(uri: string): TextDocument | undefined;
  all(): TextDocument[];
}

export class OpenDocumentSourceTextOverlay implements SemanticRuntimeSourceTextOverlay {
  constructor(
    private readonly documents: OpenTextDocumentStore,
    private readonly documentUris: WorkspaceDocumentUris,
  ) {}

  readFile(fileName: string): string | undefined {
    return this.openDocumentForFileName(fileName)?.getText();
  }

  fileExists(fileName: string): boolean | undefined {
    return this.openDocumentForFileName(fileName) == null ? undefined : true;
  }

  private openDocumentForFileName(fileName: string): TextDocument | null {
    for (const document of this.documents.all()) {
      if (
        this.documentUris.ownsDocument(document.uri)
        && this.documentUris.sameDocument(document.uri, fileName)
      ) {
        return document;
      }
    }
    return null;
  }
}
