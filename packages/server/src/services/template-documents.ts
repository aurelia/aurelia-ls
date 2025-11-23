import fs from "node:fs";
import {
  canonicalDocumentUri,
  type DocumentSnapshot,
  type DocumentUri,
  type TemplateProgram,
} from "@aurelia-ls/domain";
import type { TextDocument } from "vscode-languageserver-textdocument";

/**
 * Host-facing adapter that keeps a TemplateProgram's SourceStore in sync with
 * LSP TextDocuments (or raw string inputs for CLI/build flows).
 */
export class TemplateDocumentStore {
  constructor(private readonly program: TemplateProgram) {}

  upsertDocument(doc: TextDocument): DocumentSnapshot {
    return this.upsertText(doc.uri, doc.getText(), doc.version);
  }

  upsertText(uri: DocumentUri | string, text: string, version?: number): DocumentSnapshot {
    const canonical = canonicalDocumentUri(uri);
    this.program.upsertTemplate(canonical.uri, text, version);
    const snap = this.program.sources.get(canonical.uri);
    if (!snap) {
      throw new Error(`TemplateDocumentStore: failed to persist snapshot for ${canonical.uri}`);
    }
    return snap;
  }

  /**
   * Read a template from disk (if present) and add it to the program store.
   * Returns null when the file is missing or unreadable.
   */
  ensureFromFile(uri: DocumentUri | string): DocumentSnapshot | null {
    const canonical = canonicalDocumentUri(uri);
    const existing = this.program.sources.get(canonical.uri);
    if (existing) return existing;
    try {
      const text = fs.readFileSync(canonical.path, "utf8");
      this.program.upsertTemplate(canonical.uri, text);
      return this.program.sources.get(canonical.uri);
    } catch {
      return null;
    }
  }

  close(uri: DocumentUri | string): void {
    const canonical = canonicalDocumentUri(uri);
    this.program.closeTemplate(canonical.uri);
  }
}
