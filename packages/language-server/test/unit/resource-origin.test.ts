import { test, expect, describe, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  handleGetResources,
  handleGetRelatedFiles,
  handleGetScopeResources,
  type ResourceExplorerResponse,
  type ScopeResourcesResponse,
} from "../../src/handlers/custom.js";
import { testRequestGuard } from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

/**
 * Boundary: semantic-runtime resource rows -> VS Code resource explorer DTOs.
 *
 * The language server preserves exact semantic-runtime definition and
 * visibility identity instead of reconstructing a catalog by resource name.
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
  const definitionProductHandle = input.definitionProductHandle
    ?? `product:definition:${input.resourceKind}:${input.name}`;
  return {
    projectKey: "app",
    resourceKind: input.resourceKind,
    declarationModes: ["decorator"],
    name: input.name,
    aliases: input.aliases ?? [],
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
    defaultProperty: input.defaultProperty ?? null,
    noMultiBindings: null,
    containerless: null,
    shadowMode: null,
    hasSlots: null,
    needsCompile: null,
    patterns: [],
    source: input.source ?? source("src/my-resource.ts"),
    nameSource: input.nameSource ?? input.source ?? source("src/my-resource.ts", 0, 10),
    targetSource:
      input.targetSource ?? input.source ?? source("src/my-resource.ts", 2, 12),
    targetDeclarationSource:
      input.targetDeclarationSource ?? input.source ?? source("src/my-resource.ts", 0, 20),
    handles: {
      definitionProductHandle,
      identityHandle: `identity:definition:${input.resourceKind}:${input.name}`,
      targetIdentityHandle: `identity:target:${input.resourceKind}:${input.name}`,
      sourceAddressHandle: `address:source:${input.resourceKind}:${input.name}`,
      nameSourceAddressHandle: `address:name:${input.resourceKind}:${input.name}`,
      targetAddressHandle: `address:target:${input.resourceKind}:${input.name}`,
      targetDeclarationSourceAddressHandle: `address:declaration:${input.resourceKind}:${input.name}`,
    },
  };
}

function visibility(input: {
  resourceKind: string;
  name: string;
  visibilityKind?: string;
  compilerWorld?: string;
  source?: Record<string, unknown>;
  aliases?: string[];
  definitionProductHandle?: string | null;
  resourceProductHandle?: string | null;
}) {
  const definitionProductHandle = input.definitionProductHandle === undefined
    ? `product:definition:${input.resourceKind}:${input.name}`
    : input.definitionProductHandle;
  const resourceProductHandle = input.resourceProductHandle === undefined
    ? definitionProductHandle ?? `product:resource:${input.resourceKind}:${input.name}`
    : input.resourceProductHandle;
  return {
    compilerWorld: input.compilerWorld ?? "app-root src/main.ts@0..10",
    resourceKind: input.resourceKind,
    name: input.name,
    aliases: input.aliases ?? [],
    visibilityKind: input.visibilityKind ?? "app-root",
    source: input.source ?? source("src/my-resource.ts"),
    handles: {
      compilerWorldProductHandle: `product:compiler-world:${input.compilerWorld ?? "app-root"}`,
      resourceProductHandle,
      definitionProductHandle,
      sourceAddressHandle: `address:visibility:${input.resourceKind}:${input.name}`,
    },
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

function topologyComponent(input: {
  elementName: string;
  className?: string | null;
  componentPath: string;
  templatePath: string;
  templateSourceKind?: string;
}) {
  return {
    elementName: input.elementName,
    className: input.className ?? null,
    source: source(input.componentPath),
    template: {
      sourceKind: input.templateSourceKind ?? "markup",
      source: source(input.templatePath),
    },
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
  topologyComponents?: unknown[];
}) {
  const document = {
    uri: componentUri,
    getText: vi.fn(() => "<template></template>"),
  };
  return {
    workspaceRoot,
    documentUris: testWorkspaceDocumentUris(workspaceRoot),
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    ensureProgramDocument: vi.fn(() => document),
    semanticRuntime: {
      resourceDefinitions: vi.fn(() => answer(input.definitions ?? [])),
      resourceVisibility: vi.fn(() => answer(input.visibility ?? [])),
      templateCompilations: vi.fn(() => answer(input.compilations ?? [])),
      appTopology: vi.fn(() => Promise.resolve({
        schemaVersion: "0.2",
        result: "answered",
        selection: "not-applicable",
        coverage: "complete",
        summary: "mock topology",
        value: { components: input.topologyComponents ?? [] },
        page: null,
      })),
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
          defaultProperty: "value",
          aliases: [{ name: "alternate-resource", source: source("src/my-resource.ts", 30, 48) }],
        }),
      ],
      visibility: [
        visibility({
          resourceKind: "custom-element",
          name: "my-resource",
          visibilityKind: "app-root",
          aliases: ["alternate-resource"],
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
    expect(result.fingerprint).toBe("semantic-runtime:test");
    expect(result.evidence.definitions.coverage).toBe("complete");
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0]).toEqual(expect.objectContaining({
      id: "definition:product:definition:custom-element:my-resource",
      name: "my-resource",
      kind: "custom-element",
      uri: pathToFileURL(path.join(workspaceRoot, "src", "my-resource.ts")).toString(),
      origin: "project",
    }));
    expect(result.resources[0].definition).toEqual(expect.objectContaining({
      targetName: "MyResource",
      declarationModes: ["decorator"],
    }));
    expect(result.resources[0].aliases).toEqual([
      expect.objectContaining({ name: "alternate-resource", source: expect.objectContaining({ start: 30, end: 48 }) }),
    ]);
    expect(result.resources[0].visibility).toEqual([
      expect.objectContaining({
        visibilityKind: "app-root",
        compilerWorld: "app-root src/main.ts@0..10",
        uri: pathToFileURL(path.join(workspaceRoot, "src", "my-resource.ts")).toString(),
      }),
    ]);
    expect(result.resources[0].bindables[0]).toEqual(
      expect.objectContaining({
        name: "value",
        attribute: "value",
        mode: "twoWay",
        valueType: "string",
        primary: true,
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
          definitionProductHandle: null,
        }),
      ],
    });

    const result = await handleGetResources(ctx as never, testRequestGuard);

    expect(result.resources).toEqual([
      expect.objectContaining({
        name: "if",
        kind: "template-controller",
        origin: "framework",
        package: null,
        definition: null,
        visibility: [expect.objectContaining({ visibilityKind: "local" })],
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
        origin: "package",
        uri: pathToFileURL(path.join(
          workspaceRoot,
          "node_modules",
          "@scope",
          "plugin",
          "dist",
          "plugin-card.js",
        )).toString(),
      }),
    );
  });

  test("joins definitions and visibility only through exact product identity", async () => {
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
    expect(result.resources[0].visibility).toHaveLength(1);
  });

  test("keeps same-named definitions distinct across product identities and compiler worlds", async () => {
    const firstHandle = "product:definition:custom-element:shared:first";
    const secondHandle = "product:definition:custom-element:shared:second";
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "shared-card",
          targetName: "FirstCard",
          definitionProductHandle: firstHandle,
          source: source("src/first-card.ts"),
        }),
        definition({
          resourceKind: "custom-element",
          name: "shared-card",
          targetName: "SecondCard",
          definitionProductHandle: secondHandle,
          source: source("src/second-card.ts"),
        }),
      ],
      visibility: [
        visibility({
          resourceKind: "custom-element",
          name: "shared-card",
          compilerWorld: "app-root first",
          definitionProductHandle: firstHandle,
          resourceProductHandle: firstHandle,
          source: source("src/first-card.ts"),
        }),
        visibility({
          resourceKind: "custom-element",
          name: "shared-card",
          compilerWorld: "app-root second",
          definitionProductHandle: secondHandle,
          resourceProductHandle: secondHandle,
          source: source("src/second-card.ts"),
        }),
      ],
    });

    const result = await handleGetResources(ctx as never, testRequestGuard);

    expect(result.resources).toHaveLength(2);
    expect(result.resources.map((resource) => resource.id)).toEqual([
      `definition:${firstHandle}`,
      `definition:${secondHandle}`,
    ]);
    expect(result.resources.map((resource) => resource.definition?.targetName)).toEqual(["FirstCard", "SecondCard"]);
    expect(result.resources.map((resource) => resource.visibility[0]?.compilerWorld)).toEqual([
      "app-root first",
      "app-root second",
    ]);
  });

  test("keeps compiler extension resources in the inventory taxonomy", async () => {
    const ctx = createMockContext({
      visibility: [
        visibility({ resourceKind: "binding-command", name: "bind" }),
        visibility({ resourceKind: "attribute-pattern", name: "dot-separated" }),
      ],
    });

    const result = await handleGetResources(ctx as never, testRequestGuard);

    expect(result.resources.map((resource) => resource.kind)).toEqual([
      "binding-command",
      "attribute-pattern",
    ]);
  });

  test("does not guess a join between same-named rows without product handles", async () => {
    const looseDefinition = definition({ resourceKind: "custom-element", name: "shared-card" });
    const looseVisibility = visibility({
      resourceKind: "custom-element",
      name: "shared-card",
      definitionProductHandle: null,
      resourceProductHandle: null,
    });
    looseDefinition.handles = null;
    looseVisibility.handles = null;
    const ctx = createMockContext({
      definitions: [looseDefinition],
      visibility: [looseVisibility],
    });

    const result = await handleGetResources(ctx as never, testRequestGuard);

    expect(result.resources).toHaveLength(2);
    expect(result.resources.map((resource) => resource.definition == null)).toEqual([false, true]);
  });

  test("does not compare resource-product handles with definition-product handles", async () => {
    const coincidentalHandle = "product:coincidental-cross-role-handle";
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "shared-card",
          definitionProductHandle: coincidentalHandle,
        }),
      ],
      visibility: [
        visibility({
          resourceKind: "custom-element",
          name: "shared-card",
          definitionProductHandle: null,
          resourceProductHandle: coincidentalHandle,
        }),
      ],
    });

    const result = await handleGetResources(ctx as never, testRequestGuard);

    expect(result.resources).toHaveLength(2);
    expect(result.resources.map((resource) => resource.id)).toEqual([
      `definition:${coincidentalHandle}`,
      `resource:${coincidentalHandle}`,
    ]);
  });

  test("rejects duplicate exact definition identity", async () => {
    const handle = "product:definition:custom-element:duplicate";
    const ctx = createMockContext({
      definitions: [
        definition({ resourceKind: "custom-element", name: "first-card", definitionProductHandle: handle }),
        definition({ resourceKind: "custom-element", name: "second-card", definitionProductHandle: handle }),
      ],
    });

    await expect(handleGetResources(ctx as never, testRequestGuard)).rejects.toThrow(
      `Duplicate resource definition product handle: ${handle}`,
    );
  });

  test("propagates query failure instead of presenting an empty inventory", async () => {
    const ctx = createMockContext({});
    ctx.semanticRuntime.resourceDefinitions.mockRejectedValueOnce(new Error("definition query failed"));

    await expect(handleGetResources(ctx as never, testRequestGuard)).rejects.toThrow("definition query failed");
  });
});

describe("runtime-backed scope resources", () => {
  test("preserves exact resource facts while filtering to the template compiler world", async () => {
    const bindables = [{
      name: "value",
      attribute: "value",
      callback: "valueChanged",
      mode: "toView",
      setterKind: "property",
      valueType: "string",
      valueTypeShapeKind: "primitive",
      effectiveValueTypeShapeKind: "primitive",
      valueTypeHasCallSignature: false,
      valueTypeHasMembers: false,
      valueTypeIsWeak: false,
      source: source("src/in-scope.ts", 20, 25),
    }];
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "in-scope",
          targetName: "InScope",
          source: source("src/in-scope.ts"),
          aliases: [{ name: "also-in-scope", source: source("src/in-scope.ts", 30, 43) }],
          bindables,
          defaultProperty: "value",
        }),
        definition({ resourceKind: "custom-element", name: "out-of-scope" }),
      ],
      visibility: [
        visibility({
          resourceKind: "custom-element",
          name: "in-scope",
          compilerWorld: "app-root selected",
          source: source("src/in-scope.ts"),
          aliases: ["also-in-scope"],
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
        compilation({
          compilerWorld: "app-root other",
          source: source("src/other-app.html"),
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
    expect(result?.compilerWorlds).toEqual(["app-root selected"]);
    expect(result?.scopeLabel).toBe("app-root selected");
    expect(result?.resources).toEqual([
      expect.objectContaining({
        id: "definition:product:definition:custom-element:in-scope",
        name: "in-scope",
        kind: "custom-element",
        uri: pathToFileURL(path.join(workspaceRoot, "src", "in-scope.ts")).toString(),
        aliases: [expect.objectContaining({ name: "also-in-scope" })],
        bindables: [expect.objectContaining({ name: "value", primary: true })],
        definition: expect.objectContaining({ targetName: "InScope" }),
        visibility: [expect.objectContaining({ compilerWorld: "app-root selected" })],
      }),
    ]);
    expect(result?.evidence.visibility.coverage).toBe("complete");
  });

  test("keeps same-named resources distinct across all compiler worlds selected for one template", async () => {
    const firstHandle = "product:definition:custom-element:shared:first";
    const secondHandle = "product:definition:custom-element:shared:second";
    const ctx = createMockContext({
      definitions: [
        definition({
          resourceKind: "custom-element",
          name: "shared-card",
          targetName: "FirstCard",
          definitionProductHandle: firstHandle,
          source: source("src/first-card.ts"),
        }),
        definition({
          resourceKind: "custom-element",
          name: "shared-card",
          targetName: "SecondCard",
          definitionProductHandle: secondHandle,
          source: source("src/second-card.ts"),
        }),
      ],
      visibility: [
        visibility({
          resourceKind: "custom-element",
          name: "shared-card",
          compilerWorld: "app-root first",
          definitionProductHandle: firstHandle,
          resourceProductHandle: firstHandle,
          source: source("src/first-card.ts"),
        }),
        visibility({
          resourceKind: "custom-element",
          name: "shared-card",
          compilerWorld: "app-root second",
          definitionProductHandle: secondHandle,
          resourceProductHandle: secondHandle,
          source: source("src/second-card.ts"),
        }),
      ],
      compilations: [
        compilation({ compilerWorld: "app-root first" }),
        compilation({ compilerWorld: "app-root second" }),
      ],
    });

    const result = await handleGetScopeResources(
      ctx as never,
      { uri: componentUri },
      testRequestGuard,
    );

    expect(result?.compilerWorlds).toEqual(["app-root first", "app-root second"]);
    expect(result?.scopeLabel).toBe("2 compiler worlds");
    expect(result?.resources.map((item) => item.id)).toEqual([
      `definition:${firstHandle}`,
      `definition:${secondHandle}`,
    ]);
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

  test("propagates query failure instead of presenting an empty scope", async () => {
    const ctx = createMockContext({ compilations: [compilation()] });
    ctx.semanticRuntime.resourceVisibility.mockRejectedValueOnce(new Error("visibility query failed"));

    await expect(handleGetScopeResources(
      ctx as never,
      { uri: componentUri },
      testRequestGuard,
    )).rejects.toThrow("visibility query failed");
  });
});

describe("runtime-backed related file lookup", () => {
  test("opens the custom element template from the component source", async () => {
    const componentFile = path.join(workspaceRoot, "src", "my-card.ts");
    const templateFile = path.join(workspaceRoot, "src", "my-card.html");
    const ctx = createMockContext({
      topologyComponents: [
        topologyComponent({
          elementName: "my-card",
          className: "MyCard",
          componentPath: "src/my-card.ts",
          templatePath: "src/my-card.html",
        }),
      ],
    });

    const result = await handleGetRelatedFiles(
      ctx as never,
      { uri: pathToFileURL(componentFile).toString() },
      testRequestGuard,
    );

    expect(result).toEqual([{
      uri: pathToFileURL(templateFile).toString(),
      role: "component-template",
      elementName: "my-card",
      className: "MyCard",
    }]);
    expect(ctx.semanticRuntime.appTopology).toHaveBeenCalledWith(componentFile, testRequestGuard);
    expect(ctx.semanticRuntime.resourceDefinitions).not.toHaveBeenCalled();
  });

  test("opens the custom element component from the template source", async () => {
    const componentFile = path.join(workspaceRoot, "src", "my-card.ts");
    const templateFile = path.join(workspaceRoot, "src", "my-card.html");
    const ctx = createMockContext({
      topologyComponents: [
        topologyComponent({
          elementName: "my-card",
          className: "MyCard",
          componentPath: "src/my-card.ts",
          templatePath: "src/my-card.html",
        }),
      ],
    });

    const result = await handleGetRelatedFiles(
      ctx as never,
      { uri: pathToFileURL(templateFile).toString() },
      testRequestGuard,
    );

    expect(result).toEqual([{
      uri: pathToFileURL(componentFile).toString(),
      role: "component-source",
      elementName: "my-card",
      className: "MyCard",
    }]);
  });

  test("preserves every topology relation when one source owns several components", async () => {
    const componentFile = path.join(workspaceRoot, "src", "cards.ts");
    const ctx = createMockContext({
      topologyComponents: [
        topologyComponent({
          elementName: "secondary-card",
          className: "SecondaryCard",
          componentPath: "src/cards.ts",
          templatePath: "src/secondary-card.html",
        }),
        topologyComponent({
          elementName: "primary-card",
          className: "PrimaryCard",
          componentPath: "src/cards.ts",
          templatePath: "src/primary-card.html",
        }),
      ],
    });

    const result = await handleGetRelatedFiles(
      ctx as never,
      { uri: pathToFileURL(componentFile).toString() },
      testRequestGuard,
    );

    expect(result.map((candidate) => candidate.elementName)).toEqual([
      "primary-card",
      "secondary-card",
    ]);
    expect(result.map((candidate) => candidate.uri)).toEqual([
      pathToFileURL(path.join(workspaceRoot, "src", "primary-card.html")).toString(),
      pathToFileURL(path.join(workspaceRoot, "src", "secondary-card.html")).toString(),
    ]);
  });

  test("does not return a related file for inline templates", async () => {
    const componentFile = path.join(workspaceRoot, "src", "inline-card.ts");
    const ctx = createMockContext({
      topologyComponents: [
        topologyComponent({
          elementName: "inline-card",
          className: "InlineCard",
          componentPath: "src/inline-card.ts",
          templatePath: "src/inline-card.ts",
          templateSourceKind: "inline",
        }),
      ],
    });

    await expect(
      handleGetRelatedFiles(
        ctx as never,
        { uri: pathToFileURL(componentFile).toString() },
        testRequestGuard,
      ),
    ).resolves.toEqual([]);
  });

  test("propagates topology failures instead of falling back to resource scans", async () => {
    const componentFile = path.join(workspaceRoot, "src", "my-card.ts");
    const ctx = createMockContext({});
    ctx.semanticRuntime.appTopology.mockRejectedValueOnce(new Error("topology query failed"));

    await expect(handleGetRelatedFiles(
      ctx as never,
      { uri: pathToFileURL(componentFile).toString() },
      testRequestGuard,
    )).rejects.toThrow("topology query failed");
    expect(ctx.semanticRuntime.resourceDefinitions).not.toHaveBeenCalled();
  });
});
