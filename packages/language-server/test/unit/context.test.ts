import { describe, expect, test, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createServerContext } from "@aurelia-ls/language-server/api";

function createLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("createServerContext", () => {
  test("ensureProgramDocument returns open documents without syncing a second workspace", () => {
    const uri = "file:///app/component.html";
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

    expect(ctx.ensureProgramDocument(uri)).toBe(live);
    expect(ctx.ensureProgramDocument(uri)).toBe(live);
    expect(documents.get).toHaveBeenCalledWith(uri);
  });

  test("lookupText can resolve an open document by canonical equivalent URI", () => {
    const uri = "file:///app/component.html";
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

    expect(ctx.lookupText(uri)).toBe("<template>${name}</template>");
  });
});
