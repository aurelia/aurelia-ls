import path from "node:path";
import { URI } from "vscode-uri";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { SemanticRuntimeSourceTextOverlay } from "@aurelia-ls/semantic-runtime";

export interface OpenTextDocumentStore {
  get(uri: string): TextDocument | undefined;
  all(): TextDocument[];
}

export class OpenDocumentSourceTextOverlay implements SemanticRuntimeSourceTextOverlay {
  constructor(
    private readonly documents: OpenTextDocumentStore,
  ) {}

  readFile(fileName: string): string | undefined {
    return this.openDocumentForFileName(fileName)?.getText();
  }

  fileExists(fileName: string): boolean | undefined {
    return this.openDocumentForFileName(fileName) == null ? undefined : true;
  }

  private openDocumentForFileName(fileName: string): TextDocument | null {
    const normalized = normalizeHostPath(fileName);
    for (const document of this.documents.all()) {
      if (normalizeDocumentPath(document.uri) === normalized) {
        return document;
      }
    }
    return null;
  }
}

export function normalizeDocumentPath(uri: string): string {
  return normalizeHostPath(URI.parse(uri).fsPath);
}

function normalizeHostPath(fileName: string): string {
  return path.resolve(fileName).replace(/\\/g, "/").toLowerCase();
}
