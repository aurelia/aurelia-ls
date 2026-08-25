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
  onDidOpen(listener: OpenTextDocumentListener): unknown;
  onDidChangeContent(listener: OpenTextDocumentListener): unknown;
  onDidClose(listener: OpenTextDocumentListener): unknown;
}

export type OpenTextDocumentListener = (
  event: { readonly document: TextDocument },
) => void;

interface IndexedOpenDocument {
  readonly document: TextDocument;
  readonly canonicalKey: string;
  readonly sequence: number;
}

interface CanonicalOpenDocumentBucket {
  readonly aliases: Map<string, IndexedOpenDocument>;
  current: IndexedOpenDocument;
}

export class OpenDocumentSourceTextOverlay implements
  SemanticRuntimeSourceTextOverlay,
  SemanticRuntimeProjectInputCurrentnessPolicy
{
  private readonly documentsByUri = new Map<string, IndexedOpenDocument>();
  private readonly documentsByCanonicalKey = new Map<string, CanonicalOpenDocumentBucket>();
  private sequence = 0;

  constructor(
    private readonly documents: OpenTextDocumentStore,
    private readonly documentUris: WorkspaceDocumentUris,
  ) {
    // TextDocuments owns open/change/close truth. Keep one canonical index in
    // lockstep with that event stream so project dependency misses stay O(1).
    // The guards retain compatibility with measurement-only stores compiled as
    // JavaScript; the production TextDocuments contract provides every event.
    this.documents.onDidOpen?.(({ document }) => this.synchronize(document));
    this.documents.onDidChangeContent?.(({ document }) => this.synchronize(document));
    this.documents.onDidClose?.(({ document }) => this.close(document.uri));
    this.reindexOpenDocuments();
  }

  /** Reproject the bounded open set after the workspace URI space changes. */
  reindexOpenDocuments(): void {
    this.documentsByUri.clear();
    this.documentsByCanonicalKey.clear();
    for (const document of this.documents.all()) {
      this.synchronize(document);
    }
  }

  /** Resolve synchronized text by canonical document identity without a store scan. */
  openDocument(uri: string): TextDocument | null {
    if (this.documentUris.workspaceHostPath(uri) == null) return null;

    const direct = this.documents.get(uri);
    if (direct != null) {
      if (this.documentsByUri.get(direct.uri)?.document !== direct) {
        this.synchronize(direct);
      }
    }

    // A miss is not cached and cannot prove that an equivalent presentation URI
    // is closed. Open/change/close events alone transfer canonical authority.
    const current = this.documentsByCanonicalKey.get(this.documentUris.key(uri))?.current.document;
    return current != null && this.documentUris.workspaceHostPath(current.uri) != null
      ? current
      : null;
  }

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
    return this.openDocument(uri);
  }

  private synchronize(document: TextDocument): void {
    this.close(document.uri);
    const canonicalKey = this.documentUris.key(document.uri);
    const indexed: IndexedOpenDocument = {
      document,
      canonicalKey,
      sequence: ++this.sequence,
    };
    this.documentsByUri.set(document.uri, indexed);

    const bucket = this.documentsByCanonicalKey.get(canonicalKey);
    if (bucket == null) {
      this.documentsByCanonicalKey.set(canonicalKey, {
        aliases: new Map([[document.uri, indexed]]),
        current: indexed,
      });
      return;
    }
    bucket.aliases.set(document.uri, indexed);
    bucket.current = indexed;
  }

  private close(uri: string): void {
    const indexed = this.documentsByUri.get(uri);
    if (indexed == null) return;
    this.documentsByUri.delete(uri);
    const bucket = this.documentsByCanonicalKey.get(indexed.canonicalKey);
    if (bucket == null) return;
    bucket.aliases.delete(uri);
    if (bucket.aliases.size === 0) {
      this.documentsByCanonicalKey.delete(indexed.canonicalKey);
      return;
    }
    if (bucket.current === indexed) {
      bucket.current = latestOpenDocument(bucket.aliases.values());
    }
  }
}

function latestOpenDocument(
  documents: Iterable<IndexedOpenDocument>,
): IndexedOpenDocument {
  let latest: IndexedOpenDocument | null = null;
  for (const document of documents) {
    if (latest == null || document.sequence > latest.sequence) {
      latest = document;
    }
  }
  if (latest == null) {
    throw new Error("Cannot select a current document from an empty alias bucket.");
  }
  return latest;
}
