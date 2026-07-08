import { describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import { handleCodeLens } from "@aurelia-ls/language-server/api";
import { testRequestGuard } from "./test-request-guard.js";

const workspaceRoot = path.resolve("test-workspace");
const resourcePath = path.join(workspaceRoot, "src", "resources.ts");
const resourceUri = pathToFileURL(resourcePath).toString();

function source(filePath: string, start = 0, end = 10) {
  return {
    kind: "source-span-address",
    label: `${filePath}@${start}..${end}`,
    path: filePath,
    start,
    end,
    role: "range",
  };
}

function definition(input: {
  resourceKind: string;
  name: string;
  targetName: string;
  bindables?: unknown[];
}) {
  return {
    resourceKind: input.resourceKind,
    name: input.name,
    targetName: input.targetName,
    bindables: input.bindables ?? [],
    source: source("src/resources.ts"),
    targetSource: source("src/resources.ts"),
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
  controllers?: unknown[];
  bindingBehaviors?: unknown[];
  valueConverters?: unknown[];
}) {
  const document = TextDocument.create(
    resourceUri,
    "typescript",
    1,
    input.text ?? [
      "export class ProductCard {}",
      "export class CurrencyValueConverter {}",
      "export class ValidateBindingBehavior {}",
    ].join("\n"),
  );

  return {
    workspaceRoot,
    documents: {
      get: vi.fn((uri: string) => uri === resourceUri ? document : undefined),
    },
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    semanticRuntime: {
      resourceDefinitions: vi.fn(() => answer(input.definitions ?? [])),
      runtimeControllers: vi.fn(() => answer(input.controllers ?? [])),
      bindingBehaviorApplications: vi.fn(() => answer(input.bindingBehaviors ?? [])),
      valueConverterApplications: vi.fn(() => answer(input.valueConverters ?? [])),
    },
  };
}

describe("runtime-backed code lens", () => {
  test("counts resource usages from semantic-runtime rows", async () => {
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "product-card",
          targetName: "ProductCard",
          bindables: [{ name: "product" }, { name: "featured" }],
        }),
        definition({
          resourceKind: "value-converter",
          name: "currency",
          targetName: "CurrencyValueConverter",
        }),
        definition({
          resourceKind: "binding-behavior",
          name: "validate",
          targetName: "ValidateBindingBehavior",
        }),
      ],
      controllers: [
        {
          definitionKind: "custom-element",
          definitionName: "product-card",
          controllerName: "product-card",
          source: source("src/app.html"),
        },
        {
          definitionKind: "custom-element",
          definitionName: "product-card",
          controllerName: "product-card",
          source: source("src/list.html"),
        },
      ],
      bindingBehaviors: [
        {
          behaviorName: "validate",
          source: source("src/app.html"),
        },
      ],
      valueConverters: [
        {
          converterName: "currency",
          source: source("src/app.html", 5, 13),
        },
        {
          converterName: "currency",
          source: source("src/app.html", 25, 33),
        },
      ],
    });

    const result = await handleCodeLens(ctx as never, { textDocument: { uri: resourceUri } }, testRequestGuard);

    expect(result?.map((lens) => lens.command?.title)).toEqual([
      "$(symbol-class) element: 2 bindables · used in 2 templates",
      "$(symbol-class) converter: used in 1 template",
      "$(symbol-class) behavior: used in 1 template",
    ]);
    expect(result?.every((lens) => lens.command?.command === "editor.action.findReferences")).toBe(true);
    expect(ctx.semanticRuntime.resourceDefinitions).toHaveBeenCalledTimes(1);
    expect(ctx.semanticRuntime.runtimeControllers).toHaveBeenCalledTimes(1);
    expect(ctx.semanticRuntime.bindingBehaviorApplications).toHaveBeenCalledTimes(1);
    expect(ctx.semanticRuntime.valueConverterApplications).toHaveBeenCalledTimes(1);
  });

  test("keeps no-usage resources visible with an inert command", async () => {
    const ctx = createMockContext({
      text: "export class FocusCustomAttribute {}",
      definitions: [
        definition({
          resourceKind: "custom-attribute",
          name: "focus",
          targetName: "FocusCustomAttribute",
        }),
      ],
    });

    const result = await handleCodeLens(ctx as never, { textDocument: { uri: resourceUri } }, testRequestGuard);

    expect(result).toHaveLength(1);
    expect(result?.[0]?.command).toEqual({
      title: "$(symbol-class) attribute: no template usages",
      command: "",
    });
  });

  test("does not query runtime rows for non-TypeScript files", async () => {
    const ctx = createMockContext({});

    const result = await handleCodeLens(ctx as never, {
      textDocument: { uri: pathToFileURL(path.join(workspaceRoot, "src", "app.html")).toString() },
    }, testRequestGuard);

    expect(result).toBeNull();
    expect(ctx.semanticRuntime.resourceDefinitions).not.toHaveBeenCalled();
  });
});
