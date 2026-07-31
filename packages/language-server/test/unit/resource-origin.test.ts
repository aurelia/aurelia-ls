import { test, expect, describe, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  handleGetResources,
  handleGetRelatedFile,
  handleGetScopeResources,
  type ResourceExplorerResponse,
  type ScopeResourcesResponse,
} from "@aurelia-ls/language-server/api";
import { testRequestGuard } from "./test-request-guard.js";

/**
 * Boundary: semantic-runtime resource rows -> VS Code resource explorer DTOs.
 *
 * The language server keeps the existing extension-facing shape, but the
 * authority is now semantic-runtime ResourceDefinitions/ResourceVisibility
 * instead of a legacy catalog snapshot.
 */

const workspaceRoot = path.resolve("test-workspace");
const componentPath = path.join(workspaceRoot, "src", "my-app.html");
const componentUri = pathToFileURL(componentPath).toString();

function source(path: string, start = 0, end = 10) {
  return {
    kind: "source-span-address",
    label: `${path}@${start}..${end}`,
    path,
    start,
    end,
    role: "range",
  };
}

function externalCatalogSource(value = "runtime-html:default-resources") {
  return {
    kind: "external-address",
    label: `Framework built-in resource catalog ${value}.`,
    scheme: "aurelia-package-catalog",
    value,
  };
}

function definition(
  input: Partial<Record<string, unknown>> & {
    resourceKind: string;
    name: string;
  },
) {
  return {
    projectKey: "app",
    resourceKind: input.resourceKind,
    declarationModes: ["decorator"],
    name: input.name,
    aliases: [],
    key: `au:resource:${input.resourceKind}:${input.name}`,
    targetName: input.targetName ?? "MyResource",
    captureKind: null,
    template: input.template ?? null,
    bindables: input.bindables ?? [],
    watches: [],
    issues: [],
    dependencies: [],
    isTemplateController:
      input.resourceKind === "template-controller" ? true : null,
    containerStrategy: null,
    defaultProperty: null,
    containerless: null,
    shadowMode: null,
    hasSlots: null,
    needsCompile: null,
    patterns: [],
    source: input.source ?? source("src/my-resource.ts"),
    targetSource:
      input.targetSource ?? input.source ?? source("src/my-resource.ts", 2, 12),
  };
}

function visibility(input: {
  resourceKind: string;
  name: string;
  visibilityKind?: string;
  compilerWorld?: string;
  source?: Record<string, unknown>;
}) {
  return {
    compilerWorld: input.compilerWorld ?? "app-root src/main.ts@0..10",
    resourceKind: input.resourceKind,
    name: input.name,
    aliases: [],
    visibilityKind: input.visibilityKind ?? "app-root",
    source: input.source ?? source("src/my-resource.ts"),
  };
}

function compilation(input: Partial<Record<string, unknown>> = {}) {
  return {
    compilationLane: input.compilationLane ?? "app-runtime",
    analysisDepth: "binding-observation",
    definitionName: input.definitionName ?? "my-app",
    compilerWorld: input.compilerWorld ?? "app-root src/main.ts@0..10",
    templateSourceKind: input.templateSourceKind ?? "file",
    htmlNodes: 0,
    htmlAttributes: 0,
    recoveries: 0,
    attributeSyntaxes: 0,
    classifications: 0,
    valueSites: 0,
    expressionParses: 0,
    bindingCommandLowerings: 0,
    instructions: 0,
    renderTargets: 0,
    runtimeControllers: 0,
    runtimeChildContainers: 0,
    runtimeChildContextResolverSlots: 0,
    runtimeBindings: 0,
    runtimeTargetOperations: 0,
    runtimeRendererTargetOperations: 0,
    runtimeBindingTargetAccesses: 0,
    runtimeBindingTargetOperations: 0,
    runtimeBindingSourceOperations: 0,
    runtimeBindingValueChannels: 0,
    runtimeBindingDataFlows: 0,
    runtimeBindingObservedDependencies: 0,
    bindingScopes: 0,
    openSeams: 0,
    source: input.source ?? source("src/my-app.html"),
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

function createMockContext(input: {
  definitions?: unknown[];
  visibility?: unknown[];
  compilations?: unknown[];
}) {
  const document = {
    uri: componentUri,
    getText: vi.fn(() => "<template></template>"),
  };
  return {
    workspaceRoot,
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      resourceDefinitions: vi.fn(() => answer(input.definitions ?? [])),
      resourceVisibility: vi.fn(() => answer(input.visibility ?? [])),
      templateCompilations: vi.fn(() => answer(input.compilations ?? [])),
    },
  };
}

describe("runtime-backed resource explorer", () => {
  test("maps semantic resource definitions to explorer items", async () => {
    const bindables = [
      {
        name: "value",
        attribute: "value",
        callback: "valueChanged",
        mode: "twoWay",
        setterKind: "property",
        valueType: "string",
        valueTypeShapeKind: "primitive",
        effectiveValueTypeShapeKind: "primitive",
        valueTypeHasCallSignature: false,
        valueTypeHasMembers: false,
        valueTypeIsWeak: false,
        source: source("src/my-resource.ts", 20, 25),
      },
    ];
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "my-resource",
          targetName: "MyResource",
          bindables,
        }),
      ],
      visibility: [
        visibility({
          resourceKind: "custom-element",
          name: "my-resource",
          visibilityKind: "app-root",
        }),
      ],
      compilations: [
        compilation({
          source: source("src/my-app.html"),
          templateSourceKind: "file",
        }),
        compilation({
          source: source("src/inline.ts"),
          templateSourceKind: "inline",
        }),
      ],
    });

    const result: ResourceExplorerResponse = await handleGetResources(
      ctx as never,
      testRequestGuard,
    );

    expect(result.templateCount).toBe(2);
    expect(result.inlineTemplateCount).toBe(1);
    expect(result.resources).toEqual([
      expect.objectContaining({
        name: "my-resource",
        kind: "custom-element",
        className: "MyResource",
        file: path.join(workspaceRoot, "src", "my-resource.ts"),
        origin: "source",
        scope: "global",
        bindableCount: 1,
        declarationForm: "decorator",
      }),
    ]);
    expect(result.resources[0].bindables[0]).toEqual(
      expect.objectContaining({
        name: "value",
        attribute: "value",
        mode: "twoWay",
        type: "string",
      }),
    );
  });

  test("adds framework resources from visibility rows when no definition row exists", async () => {
    const ctx = createMockContext({
      definitions: [],
      visibility: [
        visibility({
          resourceKind: "template-controller",
          name: "if",
          visibilityKind: "local",
          source: externalCatalogSource(),
        }),
      ],
    });

    const result = await handleGetResources(ctx as never, testRequestGuard);

    expect(result.resources).toEqual([
      expect.objectContaining({
        name: "if",
        kind: "template-controller",
        origin: "builtin",
        package: undefined,
        scope: "local",
      }),
    ]);
  });

  test("derives package grouping from node_modules source paths", async () => {
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "plugin-card",
          source: source("node_modules/@scope/plugin/dist/plugin-card.js"),
        }),
      ],
      visibility: [
        visibility({
          resourceKind: "custom-element",
          name: "plugin-card",
          source: source("node_modules/@scope/plugin/dist/plugin-card.js"),
        }),
      ],
    });

    const result = await handleGetResources(ctx as never, testRequestGuard);

    expect(result.resources[0]).toEqual(
      expect.objectContaining({
        name: "plugin-card",
        package: "@scope/plugin",
        origin: "source",
        file: path.join(
          workspaceRoot,
          "node_modules",
          "@scope",
          "plugin",
          "dist",
          "plugin-card.js",
        ),
      }),
    );
  });

  test("does not duplicate resources present in definitions and visibility", async () => {
    const ctx = createMockContext({
      definitions: [
        definition({ resourceKind: "template-controller", name: "if" }),
      ],
      visibility: [
        visibility({
          resourceKind: "template-controller",
          name: "if",
          source: externalCatalogSource(),
        }),
      ],
    });

    const result = await handleGetResources(ctx as never, testRequestGuard);

    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].kind).toBe("template-controller");
  });
});

describe("runtime-backed scope resources", () => {
  test("filters visibility rows to the selected template compiler world", async () => {
    const ctx = createMockContext({
      visibility: [
        visibility({
          resourceKind: "custom-element",
          name: "in-scope",
          compilerWorld: "app-root selected",
        }),
        visibility({
          resourceKind: "custom-element",
          name: "out-of-scope",
          compilerWorld: "app-root other",
        }),
      ],
      compilations: [
        compilation({
          compilerWorld: "app-root selected",
          source: source("src/my-app.html"),
        }),
      ],
    });

    const result: ScopeResourcesResponse = await handleGetScopeResources(
      ctx as never,
      { uri: componentUri },
      testRequestGuard,
    );

    const calls = ctx.semanticRuntime.templateCompilations.mock
      .calls as unknown as [unknown, string][];
    const calledPath = calls[0]?.[1] ?? "";
    expect(path.normalize(calledPath).toLowerCase()).toBe(
      path.normalize(componentPath).toLowerCase(),
    );
    expect(result?.scopeId).toBe("app-root selected");
    expect(result?.resources.map((item) => item.name)).toEqual(["in-scope"]);
  });

  test("refuses when the requested template has no compiler world", async () => {
    const ctx = createMockContext({
      visibility: [
        visibility({ resourceKind: "custom-element", name: "unrelated" }),
      ],
      compilations: [],
    });

    const result = await handleGetScopeResources(
      ctx as never,
      { uri: componentUri },
      testRequestGuard,
    );

    expect(result).toBeNull();
  });
});

describe("runtime-backed related file lookup", () => {
  test("opens the custom element template from the component source", async () => {
    const componentFile = path.join(workspaceRoot, "src", "my-card.ts");
    const templateFile = path.join(workspaceRoot, "src", "my-card.html");
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "my-card",
          source: source("src/my-card.ts"),
          targetSource: source("src/my-card.ts", 13, 19),
          template: {
            kind: "markup",
            hasMarkup: true,
            source: source("src/my-card.html"),
          },
        }),
      ],
    });

    const result = await handleGetRelatedFile(
      ctx as never,
      { uri: pathToFileURL(componentFile).toString() },
      testRequestGuard,
    );

    expect(result).toEqual({
      uri: pathToFileURL(templateFile).toString(),
      kind: "template",
    });
  });

  test("opens the custom element component from the template source", async () => {
    const componentFile = path.join(workspaceRoot, "src", "my-card.ts");
    const templateFile = path.join(workspaceRoot, "src", "my-card.html");
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "my-card",
          source: source("src/my-card.ts"),
          targetSource: source("src/my-card.ts", 13, 19),
          template: {
            kind: "markup",
            hasMarkup: true,
            source: source("src/my-card.html"),
          },
        }),
      ],
    });

    const result = await handleGetRelatedFile(
      ctx as never,
      { uri: pathToFileURL(templateFile).toString() },
      testRequestGuard,
    );

    expect(result).toEqual({
      uri: pathToFileURL(componentFile).toString(),
      kind: "component",
    });
  });

  test("does not return a related file for inline templates", async () => {
    const componentFile = path.join(workspaceRoot, "src", "inline-card.ts");
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "inline-card",
          source: source("src/inline-card.ts"),
          targetSource: source("src/inline-card.ts", 13, 24),
          template: {
            kind: "inline",
            hasMarkup: true,
            source: source("src/inline-card.ts", 40, 80),
          },
        }),
      ],
    });

    await expect(
      handleGetRelatedFile(
        ctx as never,
        { uri: pathToFileURL(componentFile).toString() },
        testRequestGuard,
      ),
    ).resolves.toBeNull();
  });
});
