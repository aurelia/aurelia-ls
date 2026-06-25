import { describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SymbolKind } from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleDocumentSymbols } from "@aurelia-ls/language-server/api";

const workspaceRoot = path.resolve("test-workspace");
const resourcePath = path.join(workspaceRoot, "src", "resources.ts");
const resourceUri = pathToFileURL(resourcePath).toString();

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
    schemaVersion: "0.1",
    outcome: "hit",
    closure: "complete",
    summary: "mock",
    value: { rows },
    page: null,
  });
}

function createMockContext(input: {
  text?: string;
  definitions?: unknown[];
}) {
  const document = TextDocument.create(
    resourceUri,
    "typescript",
    1,
    input.text ?? "",
  );

  return {
    workspaceRoot,
    documents: {
      get: vi.fn((uri: string) => uri === resourceUri ? document : undefined),
    },
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    semanticRuntime: {
      resourceDefinitions: vi.fn(() => answer(input.definitions ?? [])),
    },
  };
}

describe("runtime-backed document symbols", () => {
  test("maps source-backed resources and bindables into document symbols", async () => {
    const text = [
      "export class ProductCard {",
      "  @bindable product!: string;",
      "}",
      "export class CurrencyValueConverter {}",
    ].join("\n");
    const productClassStart = text.indexOf("ProductCard");
    const productNameStart = text.indexOf("product");
    const converterClassStart = text.indexOf("CurrencyValueConverter");
    const ctx = createMockContext({
      text,
      definitions: [
        {
          resourceKind: "custom-element",
          name: "product-card",
          targetName: "ProductCard",
          targetSource: source("src/resources.ts", productClassStart, productClassStart + "ProductCard".length),
          source: source("src/resources.ts", productClassStart, productClassStart + "ProductCard".length),
          bindables: [
            {
              name: "product",
              attribute: "product",
              callback: "productChanged",
              mode: "toView",
              setterKind: "property",
              valueType: "string",
              valueTypeShapeKind: "string",
              effectiveValueTypeShapeKind: "string",
              valueTypeHasCallSignature: false,
              valueTypeHasMembers: false,
              valueTypeIsWeak: false,
              source: source("src/resources.ts", productNameStart, productNameStart + "product".length),
            },
          ],
        },
        {
          resourceKind: "value-converter",
          name: "currency",
          targetName: "CurrencyValueConverter",
          targetSource: source("src/resources.ts", converterClassStart, converterClassStart + "CurrencyValueConverter".length),
          source: source("src/resources.ts", converterClassStart, converterClassStart + "CurrencyValueConverter".length),
          bindables: [],
        },
      ],
    });

    const result = await handleDocumentSymbols(ctx as never, { textDocument: { uri: resourceUri } });

    expect(result).toHaveLength(2);
    expect(result?.[0]).toMatchObject({
      name: "ProductCard",
      detail: "custom-element: product-card",
      kind: SymbolKind.Class,
      selectionRange: {
        start: { line: 0, character: 13 },
        end: { line: 0, character: 24 },
      },
      children: [
        {
          name: "product",
          detail: "@bindable product | toView | string",
          kind: SymbolKind.Field,
          selectionRange: {
            start: { line: 1, character: 12 },
            end: { line: 1, character: 19 },
          },
        },
      ],
    });
    expect(result?.[1]).toMatchObject({
      name: "CurrencyValueConverter",
      detail: "value-converter: currency",
      kind: SymbolKind.Function,
    });
    expect(ctx.semanticRuntime.resourceDefinitions).toHaveBeenCalledTimes(1);
  });

  test("does not query runtime rows for non-TypeScript files", async () => {
    const ctx = createMockContext({});

    const result = await handleDocumentSymbols(ctx as never, {
      textDocument: { uri: pathToFileURL(path.join(workspaceRoot, "src", "app.html")).toString() },
    });

    expect(result).toBeNull();
    expect(ctx.semanticRuntime.resourceDefinitions).not.toHaveBeenCalled();
  });
});
