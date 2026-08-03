import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  type SemanticRuntimeSourceTextOverlay,
} from "@aurelia-ls/semantic-runtime";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";

export interface OpenTextDocumentStore {
  get(uri: string): TextDocument | undefined;
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
    const document = this.documents.get(this.documentUris.uriForHostPath(fileName));
    return document != null && this.documentUris.ownsDocument(document.uri)
      ? document
      : null;
  }
}
