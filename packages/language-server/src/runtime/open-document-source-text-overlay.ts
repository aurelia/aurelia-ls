import type { TextDocument } from "vscode-languageserver-textdocument";
import {
  SemanticRuntimeProjectInputCurrentnessMode,
  SemanticRuntimeProjectInputReadKind,
  type SemanticRuntimeProjectInputCurrentnessPolicy,
  type SemanticRuntimeProjectInputReadDescriptor,
  type SemanticRuntimeSourceTextOverlay,
} from "@aurelia-ls/semantic-runtime";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";

export interface OpenTextDocumentStore {
  get(uri: string): TextDocument | undefined;
  all(): readonly TextDocument[];
}

export class OpenDocumentSourceTextOverlay implements
  SemanticRuntimeSourceTextOverlay,
  SemanticRuntimeProjectInputCurrentnessPolicy
{
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

  authorityForRead(descriptor: SemanticRuntimeProjectInputReadDescriptor) {
    if (
      descriptor.kind !== SemanticRuntimeProjectInputReadKind.FileContent
      && descriptor.kind !== SemanticRuntimeProjectInputReadKind.FileExistence
    ) {
      return null;
    }
    return this.openDocumentForFileName(descriptor.fileName) == null
      ? null
      : { mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved } as const;
  }

  private openDocumentForFileName(fileName: string): TextDocument | null {
    const uri = this.documentUris.uriForHostPath(fileName);
    const document = this.documents.get(uri)
      ?? this.documents.all().find((candidate) => this.documentUris.sameDocument(candidate.uri, uri));
    return document != null && this.documentUris.workspaceHostPath(document.uri) != null
      ? document
      : null;
  }
}
