import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, test } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  SemanticRuntimeProjectInputCurrentnessMode,
} from "@aurelia-ls/semantic-runtime";

import {
  OpenDocumentSourceTextOverlay,
  type OpenTextDocumentListener,
  type OpenTextDocumentStore,
} from "../../src/runtime/open-document-source-text-overlay.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

class DirectDocumentStore implements OpenTextDocumentStore {
  private readonly documents = new Map<string, TextDocument>();
  private readonly openListeners: OpenTextDocumentListener[] = [];
  private readonly changeListeners: OpenTextDocumentListener[] = [];
  private readonly closeListeners: OpenTextDocumentListener[] = [];
  getCalls = 0;
  allCalls = 0;
  allDocumentsVisited = 0;

  add(document: TextDocument): void {
    const wasOpen = this.documents.has(document.uri);
    this.documents.set(document.uri, document);
    if (!wasOpen) {
      for (const listener of this.openListeners) listener({ document });
    }
    for (const listener of this.changeListeners) listener({ document });
  }

  remove(uri: string): void {
    const document = this.documents.get(uri);
    this.documents.delete(uri);
    if (document != null) {
      for (const listener of this.closeListeners) listener({ document });
    }
  }

  get(uri: string): TextDocument | undefined {
    this.getCalls += 1;
    return this.documents.get(uri);
  }

  all(): readonly TextDocument[] {
    this.allCalls += 1;
    this.allDocumentsVisited += this.documents.size;
    return [...this.documents.values()];
  }

  onDidOpen(listener: OpenTextDocumentListener): void {
    this.openListeners.push(listener);
  }

  onDidChangeContent(listener: OpenTextDocumentListener): void {
    this.changeListeners.push(listener);
  }

  onDidClose(listener: OpenTextDocumentListener): void {
    this.closeListeners.push(listener);
  }
}

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

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
    expect(documents.allCalls).toBe(1);
  });

  test("does not scan the open set for unopened dependency lookups", () => {
    const root = path.resolve("workspace/open-document-overlay");
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure(pathToFileURL(root).toString());
    const documents = new DirectDocumentStore();
    documents.add(TextDocument.create(
      documentUris.uriForHostPath(path.join(root, "src/app.ts")),
      "typescript",
      1,
      "export class App {}",
    ));
    const overlay = new OpenDocumentSourceTextOverlay(documents, documentUris);

    for (let index = 0; index < 2_000; index += 1) {
      const dependency = path.join(root, "node_modules", `dependency-${index}.d.ts`);
      expect(overlay.fileExists(dependency)).toBeUndefined();
      expect(overlay.readFile(dependency)).toBeUndefined();
    }

    expect(documents.getCalls).toBe(4_000);
    expect(documents.allCalls).toBe(1);
    expect(documents.allDocumentsVisited).toBe(1);
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

  test("tracks dynamic equivalent remote aliases without caching misses", () => {
    const rootUri = "vscode-remote://ssh-remote+dev/home/user/my%20app";
    const canonicalUri = `${rootUri}/src/app.ts`;
    const equivalentUri = "vscode-remote://ssh-remote%2Bdev/home/user/my%20app/src/app.ts";
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure(rootUri);
    const fileName = documentUris.hostPath(canonicalUri)!;
    const documents = new DirectDocumentStore();
    const overlay = new OpenDocumentSourceTextOverlay(documents, documentUris);

    expect(overlay.readFile(fileName)).toBeUndefined();

    const equivalentV1 = TextDocument.create(
      equivalentUri,
      "typescript",
      1,
      "export const value = 1;",
    );
    documents.add(equivalentV1);
    expect(overlay.readFile(fileName)).toBe("export const value = 1;");

    documents.add(TextDocument.create(
      equivalentUri,
      "typescript",
      2,
      "export const value = 2;",
    ));
    expect(overlay.readFile(fileName)).toBe("export const value = 2;");

    documents.add(TextDocument.create(
      canonicalUri,
      "typescript",
      3,
      "export const value = 3;",
    ));
    expect(overlay.readFile(fileName)).toBe("export const value = 3;");

    documents.remove(canonicalUri);
    expect(overlay.readFile(fileName)).toBe("export const value = 2;");

    documents.remove(equivalentUri);
    expect(overlay.readFile(fileName)).toBeUndefined();
    expect(documents.allCalls).toBe(1);
  });

  test.runIf(process.platform === "win32")("preserves the workspace URI spelling for case-folded host paths", () => {
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure("file:///C:/Workspace/App");
    const documents = new DirectDocumentStore();
    documents.add(TextDocument.create(
      "file:///C:/Workspace/App/src/App.ts",
      "typescript",
      1,
      "export class App {}",
    ));
    const overlay = new OpenDocumentSourceTextOverlay(documents, documentUris);

    expect(overlay.readFile("c:/workspace/app/src/app.ts")).toBe("export class App {}");
  });

  test("keeps an excluded dependency readable without making it authored", () => {
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

    expect(documentUris.ownsDocument(documentUris.uriForHostPath(fileName))).toBe(false);
    expect(overlay.fileExists(fileName)).toBe(true);
    expect(overlay.readFile(fileName)).toBe("export class NestedApp {}");
  });

  test("transfers an excluded dependency from push-observed open text back to pull-validated disk on close", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-lsp-overlay-"));
    temporaryRoots.push(root);
    const excludedRoot = path.join(root, "shared");
    const fileName = path.join(excludedRoot, "dependency.ts");
    fs.mkdirSync(excludedRoot, { recursive: true });
    fs.writeFileSync(fileName, "export const value = 'disk';\n", "utf8");
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure(
      pathToFileURL(root).toString(),
      [pathToFileURL(excludedRoot).toString()],
    );
    const uri = documentUris.uriForHostPath(fileName);
    const documents = new DirectDocumentStore();
    documents.add(TextDocument.create(
      uri,
      "typescript",
      1,
      "export const value = 'unsaved';\n",
    ));
    const overlay = new OpenDocumentSourceTextOverlay(documents, documentUris);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
      overlay,
    );
    const first = authority.capture({ projectKey: "app", rootDir: root });

    expect(first.host.readFile(fileName)).toContain("unsaved");
    expect(first.readRegisteredInputs()[0]?.currentnessAuthority.mode)
      .toBe(SemanticRuntimeProjectInputCurrentnessMode.PushObserved);

    documents.remove(uri);
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        fileName,
      ),
    ]);
    const second = authority.capture({ projectKey: "app", rootDir: root });

    expect(first.isCurrent()).toBe(false);
    expect(second.host.readFile(fileName)).toContain("disk");
    expect(second.readRegisteredInputs()[0]?.currentnessAuthority.mode)
      .toBe(SemanticRuntimeProjectInputCurrentnessMode.PullValidated);
  });
});
