import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, test } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";

import {
  OpenDocumentSourceTextOverlay,
  type OpenTextDocumentStore,
} from "../../src/runtime/open-document-source-text-overlay.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

class DirectDocumentStore implements OpenTextDocumentStore {
  private readonly documents = new Map<string, TextDocument>();
  getCalls = 0;

  add(document: TextDocument): void {
    this.documents.set(document.uri, document);
  }

  get(uri: string): TextDocument | undefined {
    this.getCalls += 1;
    return this.documents.get(uri);
  }
}

describe("OpenDocumentSourceTextOverlay", () => {
  test("resolves a filesystem host path through the workspace URI projection", () => {
    const root = path.resolve("workspace/open-document-overlay");
    const fileName = path.join(root, "src/app.ts");
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure(pathToFileURL(root).toString());
    const documents = new DirectDocumentStore();
    documents.add(TextDocument.create(
      documentUris.uriForHostPath(fileName),
      "typescript",
      1,
      "export const openValue = true;",
    ));
    const overlay = new OpenDocumentSourceTextOverlay(documents, documentUris);

    expect(overlay.fileExists(fileName)).toBe(true);
    expect(overlay.readFile(fileName)).toBe("export const openValue = true;");
    expect(documents.getCalls).toBe(2);
  });

  test("resolves host paths in a remote workspace URI space", () => {
    const documentUri = "vscode-remote://ssh-remote%2Bdev/home/user/my%20app/src/app.ts";
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure("vscode-remote://ssh-remote+dev/home/user/my%20app");
    const fileName = documentUris.hostPath(documentUri)!;
    const documents = new DirectDocumentStore();
    documents.add(TextDocument.create(documentUri, "typescript", 1, "export class App {}"));
    const overlay = new OpenDocumentSourceTextOverlay(documents, documentUris);

    expect(overlay.readFile(fileName)).toBe("export class App {}");
  });

  test.runIf(process.platform === "win32")("preserves the workspace URI spelling for case-folded host paths", () => {
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure("file:///C:/Workspace/App");
    const documents = new DirectDocumentStore();
    documents.add(TextDocument.create(
      "file:///C:/Workspace/App/src/app.ts",
      "typescript",
      1,
      "export class App {}",
    ));
    const overlay = new OpenDocumentSourceTextOverlay(documents, documentUris);

    expect(overlay.readFile("c:/workspace/app/src/app.ts")).toBe("export class App {}");
  });

  test("does not expose an open document excluded from this workspace session", () => {
    const root = path.resolve("workspace/open-document-overlay");
    const excludedRoot = path.join(root, "nested");
    const fileName = path.join(excludedRoot, "src/app.ts");
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure(
      pathToFileURL(root).toString(),
      [pathToFileURL(excludedRoot).toString()],
    );
    const documents = new DirectDocumentStore();
    documents.add(TextDocument.create(
      documentUris.uriForHostPath(fileName),
      "typescript",
      1,
      "export class NestedApp {}",
    ));
    const overlay = new OpenDocumentSourceTextOverlay(documents, documentUris);

    expect(overlay.fileExists(fileName)).toBeUndefined();
    expect(overlay.readFile(fileName)).toBeUndefined();
  });
});
