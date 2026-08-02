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
  test("ensureProgramDocument returns open documents without syncing a second workspace", () => {
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

    expect(ctx.ensureProgramDocument(uri)).toBe(live);
    expect(ctx.ensureProgramDocument(uri)).toBe(live);
    expect(documents.get).toHaveBeenCalledWith(uri);
  });

  test("lookupText can resolve an open document by canonical equivalent URI", () => {
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

    expect(ctx.lookupText(uri)).toBe("<template>${name}</template>");
  });
});
