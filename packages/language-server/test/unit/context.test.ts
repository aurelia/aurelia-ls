import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createServerContext } from "@aurelia-ls/language-server/api";
import { canonicalDocumentUri } from "@aurelia-ls/compiler/program/paths.js";
function createLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("createServerContext", () => {
  test("ensureProgramDocument only syncs live documents when version changes", () => {
    const uri = "file:///app/component.html";
    // ensureProgramDocument passes canonical.uri (normalized path) to workspace.update
    const canonicalUri = canonicalDocumentUri(uri).uri;
    let live = TextDocument.create(uri, "html", 1, "<template>${name}</template>");
    const documents = {
      get: vi.fn((nextUri: string) => (nextUri === uri ? live : null)),
    };
    const ctx = createServerContext({
      connection: {} as never,
      documents: documents as never,
      logger: createLogger(),
    });
    const workspace = {
      update: vi.fn(),
      ensureFromFile: vi.fn(),
      lookupText: vi.fn(() => null),
    };
    ctx.workspace = workspace as never;

    ctx.ensureProgramDocument(uri);
    ctx.ensureProgramDocument(uri);
    expect(workspace.update).toHaveBeenCalledTimes(1);
    expect(workspace.update).toHaveBeenLastCalledWith(canonicalUri, "<template>${name}</template>", 1);

    live = TextDocument.create(uri, "html", 2, "<template>${firstName}</template>");
    ctx.ensureProgramDocument(uri);
    expect(workspace.update).toHaveBeenCalledTimes(2);
    expect(workspace.update).toHaveBeenLastCalledWith(canonicalUri, "<template>${firstName}</template>", 2);
  });

  test("replacing workspace clears synced document version cache", () => {
    const uri = "file:///app/component.html";
    const live = TextDocument.create(uri, "html", 5, "<template>${name}</template>");
    const documents = {
      get: vi.fn((nextUri: string) => (nextUri === uri ? live : null)),
    };
    const ctx = createServerContext({
      connection: {} as never,
      documents: documents as never,
      logger: createLogger(),
    });

    const workspaceA = {
      update: vi.fn(),
      ensureFromFile: vi.fn(),
      lookupText: vi.fn(() => null),
    };
    const workspaceB = {
      update: vi.fn(),
      ensureFromFile: vi.fn(),
      lookupText: vi.fn(() => null),
    };

    ctx.workspace = workspaceA as never;
    ctx.ensureProgramDocument(uri);
    expect(workspaceA.update).toHaveBeenCalledTimes(1);

    ctx.workspace = workspaceB as never;
    ctx.ensureProgramDocument(uri);
    expect(workspaceB.update).toHaveBeenCalledTimes(1);
  });
});
