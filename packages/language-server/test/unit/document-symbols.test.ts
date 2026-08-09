import { describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { LSPErrorCodes, ResponseError, SymbolKind } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleDocumentSymbols } from "../../src/handlers/document-symbols.js";
import { createTestOperation } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

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

function sourceCarrier(filePath: string, anchor: ReturnType<typeof source>) {
  return {
    kind: "source-file-address",
    label: filePath,
    path: filePath,
    anchor,
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

function createMockContext(input: { text?: string; definitions?: unknown[] }) {
  const document = TextDocument.create(
    resourceUri,
    "typescript",
    1,
    input.text ?? "",
  );

  const resourceDefinitions = vi.fn(() => answer(input.definitions ?? []));
  const operation = createTestOperation({
    documents: {
      openDocument: (uri: string) => (uri === resourceUri ? document : null),
    },
    resourceDefinitions,
  });

  return {
    workspaceRoot,
    documentUris: testWorkspaceDocumentUris(workspaceRoot),
    documents: {
      get: vi.fn((uri: string) => (uri === resourceUri ? document : undefined)),
    },
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    operation,
    resourceDefinitions,
  };
}

describe("runtime-backed document symbols", () => {
  test("maps public source refs without kernel handles into resource and bindable symbols", async () => {
    const text = [
      "export class ProductCard {",
      "  @bindable product!: string;",
      "}",
      "export class CurrencyValueConverter {}",
    ].join("\n");
    const productClassStart = text.indexOf("ProductCard");
    const productDeclarationStart = text.indexOf("export class ProductCard");
    const productDeclarationEnd = text.indexOf("}\nexport class") + 1;
    const productNameStart = text.indexOf("product");
    const converterClassStart = text.indexOf("CurrencyValueConverter");
    const converterDeclarationStart = text.indexOf(
      "export class CurrencyValueConverter",
    );
    const ctx = createMockContext({
      text,
      definitions: [
        {
          resourceKind: "custom-element",
          name: "product-card",
          aliases: [],
          patterns: [],
          targetName: "ProductCard",
          targetSource: source(
            "src/resources.ts",
            productClassStart,
            productClassStart + "ProductCard".length,
          ),
          targetDeclarationSource: source(
            "src/resources.ts",
            productDeclarationStart,
            productDeclarationEnd,
          ),
          source: source(
            "src/resources.ts",
            productClassStart,
            productClassStart + "ProductCard".length,
          ),
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
              source: source(
                "src/resources.ts",
                productNameStart,
                productNameStart + "product".length,
              ),
            },
          ],
        },
        {
          resourceKind: "value-converter",
          name: "currency",
          aliases: [],
          patterns: [],
          targetName: "CurrencyValueConverter",
          targetSource: source(
            "src/resources.ts",
            converterClassStart,
            converterClassStart + "CurrencyValueConverter".length,
          ),
          targetDeclarationSource: source(
            "src/resources.ts",
            converterDeclarationStart,
            text.length,
          ),
          source: source(
            "src/resources.ts",
            converterClassStart,
            converterClassStart + "CurrencyValueConverter".length,
          ),
          bindables: [],
        },
      ],
    });

    const result = await handleDocumentSymbols(
      ctx as never,
      { textDocument: { uri: resourceUri } },
      ctx.operation,
    );

    expect(result).toHaveLength(2);
    expect(result?.[0]).toMatchObject({
      name: "ProductCard",
      detail: "custom-element: product-card",
      kind: SymbolKind.Class,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 2, character: 1 },
      },
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
      kind: SymbolKind.Class,
      range: {
        start: { line: 3, character: 0 },
        end: { line: 3, character: 38 },
      },
      selectionRange: {
        start: { line: 3, character: 13 },
        end: { line: 3, character: 35 },
      },
    });
    expect(ctx.resourceDefinitions).toHaveBeenCalledTimes(1);
  });

  test("projects every resource kind through one declaration-oriented policy", async () => {
    const resources = [
      ["custom-element", "ElementResource", "element-resource"],
      ["custom-attribute", "AttributeResource", "attribute-resource"],
      ["template-controller", "ControllerResource", "controller-resource"],
      ["value-converter", "ConverterResource", "converter-resource"],
      ["binding-behavior", "BehaviorResource", "behavior-resource"],
      ["binding-command", "CommandResource", "command-resource"],
      ["attribute-pattern", "PatternResource", null],
    ] as const;
    const text = resources.map(([, targetName]) => `export class ${targetName} {}`).join("\n");
    const ctx = createMockContext({
      text,
      definitions: resources.map(([resourceKind, targetName, name]) => {
        const start = text.indexOf(targetName);
        const declarationStart = text.lastIndexOf("export class", start);
        const declarationEnd = text.indexOf("}", start) + 1;
        return {
          resourceKind,
          name,
          aliases: [],
          patterns: resourceKind === "attribute-pattern"
            ? [{ pattern: "PART.example", symbols: ".", source: null }]
            : [],
          targetName,
          targetSource: source("src/resources.ts", start, start + targetName.length),
          targetDeclarationSource: source("src/resources.ts", declarationStart, declarationEnd),
          source: source("src/resources.ts", start, start + targetName.length),
          bindables: [],
        };
      }),
    });

    const result = await handleDocumentSymbols(
      ctx as never,
      { textDocument: { uri: resourceUri } },
      ctx.operation,
    );

    expect(result?.map((symbol) => symbol.name)).toEqual(resources.map(([, targetName]) => targetName));
    expect(result?.every((symbol) => symbol.kind === SymbolKind.Class)).toBe(true);
    expect(result?.at(-1)?.detail).toBe("attribute-pattern: PART.example");
  });

  test("uses the exact authored anchor, not its outer carrier path, for document identity", async () => {
    const text = [
      "export class ProductCard {}",
      "export class ForeignResource {}",
    ].join("\n");
    const productStart = text.indexOf("ProductCard");
    const foreignStart = text.indexOf("ForeignResource");
    const ctx = createMockContext({
      text,
      definitions: [{
        resourceKind: "custom-element",
        name: "product-card",
        aliases: [],
        patterns: [],
        targetName: "ProductCard",
        targetSource: sourceCarrier(
          "src/generated-carrier.ts",
          source("src/resources.ts", productStart, productStart + "ProductCard".length),
        ),
        targetDeclarationSource: null,
        source: null,
        bindables: [],
      }, {
        resourceKind: "custom-element",
        name: "foreign-resource",
        aliases: [],
        patterns: [],
        targetName: "ForeignResource",
        targetSource: sourceCarrier(
          "src/resources.ts",
          source("src/other.ts", foreignStart, foreignStart + "ForeignResource".length),
        ),
        targetDeclarationSource: null,
        source: null,
        bindables: [],
      }],
    });

    const result = await handleDocumentSymbols(
      ctx as never,
      { textDocument: { uri: resourceUri } },
      ctx.operation,
    );

    expect(result?.map((symbol) => symbol.name)).toEqual(["ProductCard"]);
  });

  test("fails loudly for a non-answer or an authoritative span outside current text", async () => {
    const failed = createMockContext({ text: "export class ProductCard {}", definitions: [] });
    failed.resourceDefinitions.mockResolvedValue({
      schemaVersion: "0.2",
      result: "failed",
      selection: "not-applicable",
      coverage: "not-applicable",
      summary: "failed",
      value: { rows: [] },
      page: null,
    });
    const answerError = await handleDocumentSymbols(
      failed as never,
      { textDocument: { uri: resourceUri } },
      failed.operation,
    ).then(() => null, (failure: unknown) => failure);
    expect(answerError).toBeInstanceOf(ResponseError);
    expect((answerError as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((answerError as Error).message).toContain("result=failed");

    const invalid = createMockContext({
      text: "export class ProductCard {}",
      definitions: [{
        resourceKind: "custom-element",
        name: "product-card",
        aliases: [],
        patterns: [],
        targetName: "ProductCard",
        targetSource: source("src/resources.ts", 13, 999),
        targetDeclarationSource: null,
        source: source("src/resources.ts", 13, 999),
        bindables: [],
      }],
    });
    const mappingError = await handleDocumentSymbols(
      invalid as never,
      { textDocument: { uri: resourceUri } },
      invalid.operation,
    ).then(() => null, (failure: unknown) => failure);
    expect(mappingError).toBeInstanceOf(ResponseError);
    expect((mappingError as ResponseError<unknown>).code).toBe(LSPErrorCodes.RequestFailed);
    expect((mappingError as Error).message).toContain("outside the current document text");
  });

  test("does not query runtime rows for non-TypeScript files", async () => {
    const ctx = createMockContext({});

    const result = await handleDocumentSymbols(
      ctx as never,
      {
        textDocument: {
          uri: pathToFileURL(
            path.join(workspaceRoot, "src", "app.html"),
          ).toString(),
        },
      },
      ctx.operation,
    );

    expect(result).toBeNull();
    expect(ctx.resourceDefinitions).not.toHaveBeenCalled();
  });
});
