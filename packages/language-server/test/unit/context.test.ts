import { describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createServerContext } from "../../src/context.js";

function createLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("createServerContext", () => {
  test("finds synchronized open-document metadata without syncing a second workspace", () => {
    const rootUri = pathToFileURL(path.resolve("test-workspace")).toString();
    const uri = pathToFileURL(path.resolve("test-workspace/component.html")).toString();
    const live = TextDocument.create(uri, "html", 1, "<template>${name}</template>");
    const documents = {
      get: vi.fn((nextUri: string) => (nextUri === uri ? live : undefined)),
      all: vi.fn(() => [live]),
    };
    const ctx = createServerContext({
      connection: {} as never,
      documents: documents as never,
      logger: createLogger(),
    });
    ctx.configureWorkspace(rootUri);

    expect(ctx.openWorkspaceDocument(uri)).toEqual({
      uri,
      languageId: "html",
      version: 1,
    });
    expect(ctx.openWorkspaceDocument(uri)).not.toHaveProperty("getText");
    expect(ctx.openWorkspaceDocument(uri)).toEqual({
      uri,
      languageId: "html",
      version: 1,
    });
    expect(documents.get).toHaveBeenCalledWith(uri);
  });

  test("finds open-document metadata by canonical equivalent URI", () => {
    const rootUri = pathToFileURL(path.resolve("test-workspace")).toString();
    const uri = pathToFileURL(path.resolve("test-workspace/component.html")).toString();
    const live = TextDocument.create(uri, "html", 1, "<template>${name}</template>");
    const documents = {
      get: vi.fn(() => undefined),
      all: vi.fn(() => [live]),
    };
    const ctx = createServerContext({
      connection: {} as never,
      documents: documents as never,
      logger: createLogger(),
    });
    ctx.configureWorkspace(rootUri);

    expect(ctx.openWorkspaceDocument(uri)).toEqual({
      uri,
      languageId: "html",
      version: 1,
    });
  });

  test("keeps excluded synchronized text readable without granting authored document access", () => {
    const rootUri = pathToFileURL(path.resolve("test-workspace")).toString();
    const excludedRootUri = pathToFileURL(path.resolve("test-workspace/packages/disabled")).toString();
    const uri = pathToFileURL(path.resolve("test-workspace/packages/disabled/component.html")).toString();
    const live = TextDocument.create(uri, "html", 1, "<template>${name}</template>");
    const documents = {
      get: vi.fn(() => live),
      all: vi.fn(() => [live]),
    };
    const ctx = createServerContext({
      connection: {} as never,
      documents: documents as never,
      logger: createLogger(),
    });
    ctx.configureWorkspace(rootUri, [excludedRootUri]);

    expect(ctx.ownsDocument(uri)).toBe(false);
    expect(ctx.openWorkspaceDocument(uri)).toEqual({
      uri,
      languageId: "html",
      version: 1,
    });
    expect(ctx.documentUris.hostPath(uri)).toBe(path.resolve("test-workspace/packages/disabled/component.html"));
  });

  test("rejects project-root hint URIs outside the configured workspace", () => {
    const rootUri = pathToFileURL(path.resolve("test-workspace")).toString();
    const outsideRootUri = pathToFileURL(path.resolve("other-workspace")).toString();
    const ctx = createServerContext({
      connection: {} as never,
      documents: { get: vi.fn(), all: vi.fn(() => []) } as never,
      logger: createLogger(),
    });

    expect(() => ctx.configureWorkspace(rootUri, [], [outsideRootUri]))
      .toThrow(`Project root hint '${outsideRootUri}' is not inside workspace '${rootUri}'.`);
  });
});
