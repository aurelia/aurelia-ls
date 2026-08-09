import { describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { LSPErrorCodes, ResponseError, SymbolKind } from "vscode-languageserver/node";
import { handleWorkspaceSymbols } from "../../src/handlers/workspace-symbols.js";
import { createTestOperation } from "./test-request-guard.js";
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
  const resourceDefinitions = vi.fn(() => answer(input.definitions));
  const lookupWorkspaceDocumentSnapshot = vi.fn((uri: string) =>
    uri === resourceUri
      ? {
          uri: resourceUri,
          languageId: "typescript",
          version: null,
          text: input.text,
        }
      : null,
  );
  const operation = createTestOperation({
    documents: { lookupWorkspaceDocumentSnapshot },
    resourceDefinitions,
  });

  return {
    workspaceRoot,
    documentUris,
    documents: {
      get: vi.fn(),
      all: vi.fn(() => []),
    },
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    operation,
    resourceDefinitions,
    lookupWorkspaceDocumentSnapshot,
  };
}

describe("runtime-backed workspace symbols", () => {
  test("maps public source refs without kernel handles into query-filtered workspace symbols", async () => {
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
          patterns: [],
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
          patterns: [],
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
      ctx.operation,
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
    expect(ctx.resourceDefinitions).toHaveBeenCalledTimes(1);
    expect(ctx.lookupWorkspaceDocumentSnapshot).toHaveBeenCalledWith(resourceUri);
  });

  test("matches syntax-resource facts and maps their authored class declarations", async () => {
    const text = [
      "export class CommandResource {}",
      "export class PatternResource {}",
    ].join("\n");
    const commandStart = text.indexOf("CommandResource");
    const patternStart = text.indexOf("PatternResource");
    const ctx = createMockContext({
      text,
      definitions: [{
        resourceKind: "binding-command",
        name: "command-resource",
        aliases: [],
        patterns: [],
        key: "binding-command:command-resource",
        targetName: "CommandResource",
        targetSource: source("src/resources.ts", commandStart, commandStart + "CommandResource".length),
        source: source("src/resources.ts", commandStart, commandStart + "CommandResource".length),
      }, {
        resourceKind: "attribute-pattern",
        name: null,
        aliases: [],
        patterns: [{ pattern: "PART.example", symbols: ".", source: null }],
        key: null,
        targetName: "PatternResource",
        targetSource: source("src/resources.ts", patternStart, patternStart + "PatternResource".length),
        source: source("src/resources.ts", patternStart, patternStart + "PatternResource".length),
      }],
    });

    const result = await handleWorkspaceSymbols(
      ctx as never,
      { query: "PART.example" },
      ctx.operation,
    );

    expect(result).toEqual([expect.objectContaining({
      name: "PatternResource",
      kind: SymbolKind.Class,
      containerName: "attribute-pattern: PART.example",
    })]);
  });

  test("sorts the complete candidate set before applying the workspace cap", async () => {
    const names = Array.from({ length: 101 }, (_, index) => `Resource${String(index).padStart(3, "0")}`);
    const text = names.map((name) => `export class ${name} {}`).join("\n");
    const definitions = names.map((name) => {
      const start = text.indexOf(name);
      return {
        resourceKind: "custom-element",
        name: name.toLowerCase(),
        aliases: [],
        patterns: [],
        key: `custom-element:${name.toLowerCase()}`,
        targetName: name,
        targetSource: source("src/resources.ts", start, start + name.length),
        source: source("src/resources.ts", start, start + name.length),
      };
    }).reverse();
    const ctx = createMockContext({ text, definitions });

    const result = await handleWorkspaceSymbols(
      ctx as never,
      { query: "" },
      ctx.operation,
    );

    expect(result).toHaveLength(100);
    expect(result?.[0]?.name).toBe("Resource000");
    expect(result?.at(-1)?.name).toBe("Resource099");
    expect(result?.some((symbol) => symbol.name === "Resource100")).toBe(false);
  });

  test("fails loudly for a non-answer or an unmappable authoritative source", async () => {
    const failed = createMockContext({ text: "", definitions: [] });
    failed.resourceDefinitions.mockResolvedValue({
      schemaVersion: "0.2",
      result: "invalid",
      selection: "not-applicable",
      coverage: "not-applicable",
      summary: "invalid",
      value: { rows: [] },
      page: null,
    });
    const answerError = await handleWorkspaceSymbols(
      failed as never,
      { query: "" },
      failed.operation,
    ).then(() => null, (failure: unknown) => failure);
    expect(answerError).toBeInstanceOf(ResponseError);
    expect((answerError as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((answerError as Error).message).toContain("result=invalid");

    const invalid = createMockContext({
      text: "export class ProductCard {}",
      definitions: [{
        resourceKind: "custom-element",
        name: "product-card",
        aliases: [],
        patterns: [],
        key: "custom-element:product-card",
        targetName: "ProductCard",
        targetSource: source("src/resources.ts", 13, 999),
        source: source("src/resources.ts", 13, 999),
      }],
    });
    const mappingError = await handleWorkspaceSymbols(
      invalid as never,
      { query: "" },
      invalid.operation,
    ).then(() => null, (failure: unknown) => failure);
    expect(mappingError).toBeInstanceOf(ResponseError);
    expect((mappingError as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((mappingError as Error).message).toContain("outside its current document text");
  });

  test("returns null when no source-backed resource matches the query", async () => {
    const ctx = createMockContext({
      text: "export class ProductCard {}",
      definitions: [
        {
          resourceKind: "custom-element",
          name: "product-card",
          aliases: [],
          patterns: [],
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
      ctx.operation,
    );

    expect(result).toBeNull();
  });
});
