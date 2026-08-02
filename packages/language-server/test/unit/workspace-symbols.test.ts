import { describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SymbolKind } from "vscode-languageserver/node";
import { handleWorkspaceSymbols } from "../../src/handlers/workspace-symbols.js";
import { testRequestGuard } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const workspaceRoot = path.resolve("test-workspace");
const documentUris = testWorkspaceDocumentUris(workspaceRoot);
const resourcePath = path.join(workspaceRoot, "src", "resources.ts");
const resourceUri = documentUris.resolve(pathToFileURL(resourcePath).toString()).uri;

function source(filePath: string, start: number, end: number) {
  return {
    kind: "source-span-address",
    label: `${filePath}@${start}..${end}`,
    path: filePath,
    start,
    end,
    role: "range",
  };
}

function answer<T>(rows: T[]) {
  return Promise.resolve({
    schemaVersion: "0.2",
    result: "answered",
    selection: "not-applicable",
    coverage: "complete",
    summary: "mock",
    value: { rows },
    page: null,
  });
}

function createMockContext(input: { text: string; definitions: unknown[] }) {
  return {
    workspaceRoot,
    documentUris,
    documents: {
      get: vi.fn(),
      all: vi.fn(() => []),
    },
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    semanticRuntime: {
      resourceDefinitions: vi.fn(() => answer(input.definitions)),
    },
    lookupText: vi.fn((uri: string) =>
      uri === resourceUri ? input.text : null,
    ),
  };
}

describe("runtime-backed workspace symbols", () => {
  test("maps source-backed resources into query-filtered workspace symbols", async () => {
    const text = [
      "export class ProductCard {}",
      "export class CurrencyValueConverter {}",
    ].join("\n");
    const productClassStart = text.indexOf("ProductCard");
    const converterClassStart = text.indexOf("CurrencyValueConverter");
    const ctx = createMockContext({
      text,
      definitions: [
        {
          resourceKind: "custom-element",
          name: "product-card",
          aliases: [{ name: "product-tile", source: null }],
          key: "custom-element:product-card",
          targetName: "ProductCard",
          targetSource: source(
            "src/resources.ts",
            productClassStart,
            productClassStart + "ProductCard".length,
          ),
          source: source(
            "src/resources.ts",
            productClassStart,
            productClassStart + "ProductCard".length,
          ),
        },
        {
          resourceKind: "value-converter",
          name: "currency",
          aliases: [],
          key: "value-converter:currency",
          targetName: "CurrencyValueConverter",
          targetSource: source(
            "src/resources.ts",
            converterClassStart,
            converterClassStart + "CurrencyValueConverter".length,
          ),
          source: source(
            "src/resources.ts",
            converterClassStart,
            converterClassStart + "CurrencyValueConverter".length,
          ),
        },
      ],
    });

    const result = await handleWorkspaceSymbols(
      ctx as never,
      { query: "tile" },
      testRequestGuard,
    );

    expect(result).toEqual([
      {
        name: "ProductCard",
        kind: SymbolKind.Class,
        location: {
          uri: resourceUri,
          range: {
            start: { line: 0, character: 13 },
            end: { line: 0, character: 24 },
          },
        },
        containerName: "custom-element: product-card",
      },
    ]);
    expect(ctx.semanticRuntime.resourceDefinitions).toHaveBeenCalledTimes(1);
  });

  test("returns null when no source-backed resource matches the query", async () => {
    const ctx = createMockContext({
      text: "export class ProductCard {}",
      definitions: [
        {
          resourceKind: "custom-element",
          name: "product-card",
          aliases: [],
          key: "custom-element:product-card",
          targetName: "ProductCard",
          targetSource: source("src/resources.ts", 13, 24),
          source: source("src/resources.ts", 13, 24),
        },
      ],
    });

    const result = await handleWorkspaceSymbols(
      ctx as never,
      { query: "missing" },
      testRequestGuard,
    );

    expect(result).toBeNull();
  });
});
