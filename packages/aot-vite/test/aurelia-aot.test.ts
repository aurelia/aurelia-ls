import type { AureliaPluginOptions } from "@aurelia/vite-plugin";
import type { Plugin, ResolvedConfig } from "vite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const official = vi.hoisted(() => ({
  options: undefined as AureliaPluginOptions | undefined,
}));

vi.mock("@aurelia/vite-plugin", () => ({
  default: (options: AureliaPluginOptions): Plugin[] => {
    official.options = options;
    return [
      { name: "official:aurelia-conventions" },
      { name: "official:aurelia-decorators" },
    ];
  },
}));

import {
  AOT_RECEIPT_FILE,
  aureliaAot,
  isAotTemplateId,
  sourcePathFromAotTemplateId,
  toAotTemplateSpecifier,
  type AotArtifactProvider,
  type AotBuildReceipt,
  type AotSourceTransformArtifact,
  type AotTemplateArtifact,
  type AotVirtualModuleArtifact,
} from "../src/index.js";

describe("aureliaAot Vite preset", () => {
  beforeEach(() => {
    official.options = undefined;
  });

  it("owns official convention ordering and reserves the AOT import query", () => {
    const preset = aureliaAot({ provider: artifactProvider() });

    expect(preset.map((plugin) => plugin.name)).toEqual([
      "aurelia-aot:guard",
      "aurelia-aot:sources",
      "official:aurelia-conventions",
      "official:aurelia-decorators",
      "aurelia-aot:artifacts",
    ]);
    expect(official.options?.pre).toBe(true);
    expect(official.options?.useDev).toBe(false);
    expect(official.options?.hmr).toBe(false);
    expect(official.options?.transformHtmlImportSpecifier?.("./app.html")).toBe(
      "./app.html?aurelia-aot",
    );
  });

  it("starts one build session and loads every marked template through it", async () => {
    const openBuild = vi.fn(async () => ({
      artifactFor: vi.fn(async ({ sourcePath }) => artifact(sourcePath, "digest-1")),
    }));
    const preset = aureliaAot({ provider: { openBuild } });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const loader = requiredPlugin(preset, "aurelia-aot:artifacts");
    const context = pluginContext();

    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(loader, "buildStart", context);
    await invoke(loader, "buildStart", context);
    const resolved = await invoke(loader, "resolveId", context, "./app.html?aurelia-aot", "/app/main.ts", {
      attributes: {},
      isEntry: false,
    });
    const loaded = await invoke(loader, "load", context, "C:/app/app.html?aurelia-aot", {});

    expect(openBuild).toHaveBeenCalledTimes(1);
    expect(openBuild).toHaveBeenCalledWith({
      root: "C:/app",
      mode: "production",
      environmentName: "client",
      sourcemap: true,
    });
    expect(context.resolve).toHaveBeenCalledWith("./app.html", "/app/main.ts", expect.objectContaining({
      skipSelf: true,
    }));
    expect(resolved).toEqual({
      id: "C:/app/app.html?aurelia-aot",
      moduleSideEffects: true,
    });
    expect(loaded).toEqual({ code: "export const template = 1;", map: null });
  });

  it("forwards an explicit nominated app entry as structural build input", async () => {
    const openBuild = vi.fn(async () => ({
      artifactFor: async ({ sourcePath }: { readonly sourcePath: string }) => artifact(sourcePath, "html"),
    }));
    const nominatedEntry = {
      sourceFilePath: "src/main.ts",
      callable: { kind: "export" as const, name: "start" },
      arguments: [
        { kind: "host-environment" as const, path: "benchmark.host" },
        {
          kind: "array" as const,
          elements: [{ kind: "primitive" as const, value: 10 }],
        },
      ],
    };
    const preset = aureliaAot({ provider: { openBuild }, nominatedEntry });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const sources = requiredPlugin(preset, "aurelia-aot:sources");
    const context = pluginContext();

    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(sources, "buildStart", context);

    expect(openBuild).toHaveBeenCalledWith({
      root: "C:/app",
      mode: "production",
      environmentName: "client",
      sourcemap: true,
      nominatedEntry,
    });
  });

  it("does not transform queried TypeScript and JavaScript module variants", async () => {
    const transformSource = vi.fn(async () => null);
    const preset = aureliaAot({
      provider: {
        async openBuild() {
          return {
            artifactFor: async ({ sourcePath }) => artifact(sourcePath, "html"),
            transformSource,
          };
        },
      },
    });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const sources = requiredPlugin(preset, "aurelia-aot:sources");
    const context = pluginContext();
    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(sources, "buildStart", context);

    for (const id of ["C:/app/component.ts?raw", "C:/app/component.ts?url", "C:/app/component.js#worker"]) {
      expect(await invoke(sources, "transform", context, "export const value = 1;", id, { ssr: false })).toBeNull();
    }
    await invoke(
      sources,
      "transform",
      context,
      "export const value = 1;",
      "C:/app/component.ts",
      { ssr: false },
    );

    expect(transformSource).toHaveBeenCalledTimes(1);
    expect(transformSource).toHaveBeenCalledWith({
      sourcePath: "C:/app/component.ts",
      code: "export const value = 1;",
    });
  });

  it("transforms authored modules before conventions and strictly owns returned virtual modules", async () => {
    const sourceMap = {
      version: 3,
      file: "C:/app/component.ts",
      sources: ["C:/app/component.ts"],
      sourcesContent: ["export class Component {}"],
      names: [],
      mappings: "AAAA",
    };
    const transformSource = vi.fn(async ({ sourcePath, code }) =>
      sourceTransform(sourcePath, code, sourceMap));
    const virtualModuleFor = vi.fn(async ({ specifier }) => virtualArtifact(specifier));
    const preset = aureliaAot({
      provider: {
        async openBuild() {
          return {
            artifactFor: async ({ sourcePath }) => artifact(sourcePath, "html"),
            transformSource,
            virtualModuleFor,
          };
        },
      },
    });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const sources = requiredPlugin(preset, "aurelia-aot:sources");
    const context = pluginContext();
    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(sources, "buildStart", context);

    const transformed = await invoke(
      sources,
      "transform",
      context,
      "export class Component {}",
      "C:/app/component.ts",
      { ssr: false },
    );
    const runtimeResolution = await invoke(
      sources,
      "resolveId",
      context,
      "virtual:aurelia-aot/runtime-proof",
      "C:/app/component.ts",
      { attributes: {}, isEntry: false },
    ) as { readonly id: string };
    const payloadResolution = await invoke(
      sources,
      "resolveId",
      context,
      "virtual:aurelia-aot/payload/proof-0",
      "C:/app/component.ts",
      { attributes: {}, isEntry: false },
    ) as { readonly id: string };
    const unclaimed = await invoke(
      sources,
      "resolveId",
      context,
      "virtual:aurelia-aot/not-claimed",
      "C:/app/component.ts",
      { attributes: {}, isEntry: false },
    );
    const runtime = await invoke(sources, "load", context, runtimeResolution.id, { ssr: false });
    const payload = await invoke(sources, "load", context, payloadResolution.id, { ssr: false });

    expect(transformSource).toHaveBeenCalledWith({
      sourcePath: "C:/app/component.ts",
      code: "export class Component {}",
    });
    expect(transformed).toEqual({
      code: expect.stringContaining("virtual:aurelia-aot/payload/proof-0"),
      map: sourceMap,
    });
    expect(runtimeResolution.id).toBe("\0aurelia-aot:virtual:aurelia-aot/runtime-proof");
    expect(payloadResolution.id).toBe("\0aurelia-aot:virtual:aurelia-aot/payload/proof-0");
    expect(unclaimed).toBeNull();
    expect(runtime).toEqual({ code: "export const apply = value => value;", map: null });
    expect(payload).toEqual({
      code: "export default 'compiled-payload';",
      map: expect.objectContaining({ file: "payload.js" }),
    });
    expect(virtualModuleFor).toHaveBeenCalledTimes(2);
  });

  it("claims configuration modules directly from transformed-source evidence and enforces their digest", async () => {
    const transformSource = vi.fn(async ({ sourcePath, code }) => configurationSourceTransform(sourcePath, code));
    const virtualModuleFor = vi.fn(async ({ specifier }) => ({
      specifier,
      code: "export const AotConfiguration = {};",
      map: null,
      digest: "configuration-digest",
    }));
    const preset = aureliaAot({
      provider: {
        async openBuild() {
          return {
            artifactFor: async ({ sourcePath }) => artifact(sourcePath, "html"),
            transformSource,
            virtualModuleFor,
          };
        },
      },
    });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const sources = requiredPlugin(preset, "aurelia-aot:sources");
    const context = pluginContext();
    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(sources, "buildStart", context);
    await invoke(sources, "transform", context, "bootstrap(StandardConfiguration);", "C:/app/main.ts", { ssr: false });

    const resolution = await invoke(
      sources,
      "resolveId",
      context,
      "virtual:aurelia-aot/configuration/proof",
      "C:/app/main.ts",
      { attributes: {}, isEntry: false },
    ) as { readonly id: string };
    expect(resolution.id).toBe("\0aurelia-aot:virtual:aurelia-aot/configuration/proof");
    expect(await invoke(sources, "load", context, resolution.id, { ssr: false })).toEqual({
      code: "export const AotConfiguration = {};",
      map: null,
    });
    expect(virtualModuleFor).toHaveBeenCalledWith({
      specifier: "virtual:aurelia-aot/configuration/proof",
    });

    virtualModuleFor.mockResolvedValueOnce({
      specifier: "virtual:aurelia-aot/configuration/proof",
      code: "export const AotConfiguration = {};",
      map: null,
      digest: "stale-configuration-digest",
    });
    await expect(invoke(sources, "load", context, resolution.id, { ssr: false }))
      .rejects.toMatchObject({ code: "AOT_VITE_INVALID_ARTIFACT" });
  });

  it("fails closed when a transformed source has no virtual-module session port", async () => {
    const preset = aureliaAot({
      provider: {
        async openBuild() {
          return {
            artifactFor: async ({ sourcePath }) => artifact(sourcePath, "html"),
            transformSource: async ({ sourcePath, code }) => sourceTransform(sourcePath, code),
          };
        },
      },
    });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const sources = requiredPlugin(preset, "aurelia-aot:sources");
    const context = pluginContext();
    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(sources, "buildStart", context);

    await expect(invoke(
      sources,
      "transform",
      context,
      "export class Component {}",
      "C:/app/component.ts",
      { ssr: false },
    )).rejects.toMatchObject({
      code: "AOT_VITE_SESSION_CONTRACT",
      sourcePath: "C:/app/component.ts",
    });
  });

  it("fails closed when a claimed artifact cannot be produced", async () => {
    const provider: AotArtifactProvider = {
      async openBuild() {
        return {
          async artifactFor() {
            throw new Error("semantic closure unavailable");
          },
        };
      },
    };
    const preset = aureliaAot({ provider });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const loader = requiredPlugin(preset, "aurelia-aot:artifacts");
    const context = pluginContext();
    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(loader, "buildStart", context);

    await expect(
      invoke(loader, "load", context, "C:/app/app.html?aurelia-aot", {}),
    ).rejects.toMatchObject({
      code: "AOT_VITE_ARTIFACT_FAILED",
      sourcePath: "C:/app/app.html",
      cause: expect.objectContaining({ message: "semantic closure unavailable" }),
    });
  });

  it("rejects artifacts that abandon the requested source authority", async () => {
    const preset = aureliaAot({
      provider: artifactProvider(() => artifact("C:/other/app.html", "wrong-source")),
    });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const loader = requiredPlugin(preset, "aurelia-aot:artifacts");
    const context = pluginContext();
    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(loader, "buildStart", context);

    await expect(
      invoke(loader, "load", context, "C:/app/app.html?aurelia-aot", {}),
    ).rejects.toMatchObject({
      code: "AOT_VITE_SOURCE_AUTHORITY",
      sourcePath: "C:/app/app.html",
    });
  });

  it("emits a deterministic receipt from the graph and rendered chunk modules", async () => {
    let observed: AotBuildReceipt | undefined;
    const preset = aureliaAot({
      provider: artifactProvider(),
      receipt: {
        onReceipt(receipt) {
          observed = receipt;
        },
      },
    });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const loader = requiredPlugin(preset, "aurelia-aot:artifacts");
    const receiptPlugin = requiredPlugin(preset, "aurelia-aot:receipt");
    const context = pluginContext();
    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(loader, "buildStart", context);
    await invoke(loader, "load", context, "C:/app/app.html?aurelia-aot", {});

    await invoke(receiptPlugin, "generateBundle", context, {}, {
      "assets/app.js": {
        type: "chunk",
        fileName: "assets/app.js",
        name: "app",
        code: "",
        map: null,
        sourcemapFileName: null,
        preliminaryFileName: "assets/app.js",
        imports: ["assets/vendor.js"],
        dynamicImports: [],
        implicitlyLoadedBefore: [],
        importedBindings: {},
        referencedFiles: [],
        exports: [],
        facadeModuleId: "C:/app/main.ts",
        isDynamicEntry: false,
        isEntry: true,
        isImplicitEntry: false,
        moduleIds: ["C:/app/app.html?aurelia-aot"],
        modules: {
          "C:/app/app.html?aurelia-aot": {
            code: null,
            renderedExports: ["template"],
            renderedLength: 38,
          },
        },
        viteMetadata: undefined,
      },
    });

    expect(context.emitFile).toHaveBeenCalledTimes(1);
    const emitted = context.emitFile.mock.calls[0]?.[0];
    expect(emitted?.fileName).toBe(AOT_RECEIPT_FILE);
    const receipt = JSON.parse(String(emitted?.source)) as AotBuildReceipt;
    expect(receipt.artifacts).toEqual([{
      sourcePath: "C:/app/app.html",
      virtualId: "C:/app/app.html?aurelia-aot",
      digest: "digest",
    }]);
    expect(receipt.graph[0]).toMatchObject({
      id: "C:/app/app.html?aurelia-aot",
      importedIds: ["C:/app/dependency.ts"],
    });
    expect(receipt.chunks[0]?.modules[0]).toEqual({
      id: "C:/app/app.html?aurelia-aot",
      renderedLength: 38,
      renderedExports: ["template"],
    });
    expect(observed).toEqual(receipt);
  });

  it("records multiple transformed resources from one authored module by resource identity", async () => {
    let observed: AotBuildReceipt | undefined;
    const preset = aureliaAot({
      provider: {
        async openBuild() {
          return {
            artifactFor: async ({ sourcePath }) => artifact(sourcePath, "html"),
            transformSource: async ({ sourcePath, code }) => sourceTransform(sourcePath, code, null, 2),
            virtualModuleFor: async ({ specifier }) => virtualArtifact(specifier),
          };
        },
      },
      receipt: {
        onReceipt(value) {
          observed = value;
        },
      },
    });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const sources = requiredPlugin(preset, "aurelia-aot:sources");
    const receiptPlugin = requiredPlugin(preset, "aurelia-aot:receipt");
    const context = pluginContext();
    await invoke(guard, "configResolved", undefined, resolvedConfig());
    await invoke(sources, "buildStart", context);
    await invoke(
      sources,
      "transform",
      context,
      "export class Component {}",
      "C:/app/component.ts",
      { ssr: false },
    );
    await invoke(receiptPlugin, "generateBundle", context, {}, {});

    expect(observed?.artifacts).toEqual([
      {
        sourcePath: "C:/app/component.ts",
        virtualId: "\0aurelia-aot:virtual:aurelia-aot/payload/proof-0",
        digest: "payload-digest-0",
        resourceKey: "resource-0",
        compilerVariantKey: "variant-0",
        definitionName: "proof-0",
      },
      {
        sourcePath: "C:/app/component.ts",
        virtualId: "\0aurelia-aot:virtual:aurelia-aot/payload/proof-1",
        digest: "payload-digest-1",
        resourceKey: "resource-1",
        compilerVariantKey: "variant-1",
        definitionName: "proof-1",
      },
    ]);
  });

  it("rejects serve, watch, SSR, workers, and non-client environments", async () => {
    const preset = aureliaAot({ provider: artifactProvider() });
    const guard = requiredPlugin(preset, "aurelia-aot:guard");
    const loader = requiredPlugin(preset, "aurelia-aot:artifacts");

    await expect(invoke(guard, "config", undefined, {}, { command: "serve", mode: "development" }))
      .rejects.toMatchObject({ code: "AOT_VITE_UNSUPPORTED_BUILD" });
    await expect(invoke(guard, "configResolved", undefined, resolvedConfig({ watch: {} })))
      .rejects.toMatchObject({ code: "AOT_VITE_UNSUPPORTED_BUILD" });
    await expect(invoke(guard, "configResolved", undefined, resolvedConfig({ ssr: "main.ts" })))
      .rejects.toMatchObject({ code: "AOT_VITE_UNSUPPORTED_BUILD" });
    await expect(invoke(guard, "configResolved", undefined, resolvedConfig({}, true)))
      .rejects.toMatchObject({ code: "AOT_VITE_UNSUPPORTED_BUILD" });

    await invoke(guard, "configResolved", undefined, resolvedConfig());
    const serverContext = pluginContext("ssr", "server");
    await expect(invoke(loader, "buildStart", serverContext))
      .rejects.toMatchObject({ code: "AOT_VITE_UNSUPPORTED_BUILD" });
  });
});

describe("AOT template query", () => {
  it("preserves unrelated queries while adding and removing its own claim", () => {
    const marked = toAotTemplateSpecifier("./app.html?inline#view");
    expect(marked).toBe("./app.html?inline&aurelia-aot#view");
    expect(isAotTemplateId(marked)).toBe(true);
    expect(sourcePathFromAotTemplateId(marked)).toBe("./app.html?inline");
    expect(isAotTemplateId("./app.html?not-aurelia-aot")).toBe(false);
  });
});

function artifactProvider(
  create: (sourcePath: string) => AotTemplateArtifact = (sourcePath) => artifact(sourcePath, "digest"),
): AotArtifactProvider {
  return {
    async openBuild() {
      return {
        async artifactFor({ sourcePath }) {
          return create(sourcePath);
        },
      };
    },
  };
}

function artifact(sourcePath: string, digest: string): AotTemplateArtifact {
  return {
    sourcePath,
    code: "export const template = 1;",
    map: null,
    digest,
  };
}

function sourceTransform(
  sourcePath: string,
  sourceCode: string,
  map: AotSourceTransformArtifact["map"] = null,
  resourceCount = 1,
): AotSourceTransformArtifact {
  const resources = Array.from({ length: resourceCount }, (_, index) => ({
    resourceKey: `resource-${index}`,
    compilerVariantKey: `variant-${index}`,
    definitionName: `proof-${index}`,
    carrierKind: "define-call",
    carrierStart: 0,
    carrierEnd: 0,
    payloadDigest: `payload-digest-${index}`,
    payloadSpecifier: `virtual:aurelia-aot/payload/proof-${index}`,
  }));
  const imports = resources.map((resource, index) =>
    `import payload${index} from ${JSON.stringify(resource.payloadSpecifier)};`
  );
  return {
    sourcePath,
    code: [
      "import { apply } from 'virtual:aurelia-aot/runtime-proof';",
      ...imports,
      sourceCode,
      `globalThis.__proof = apply(payload0);`,
    ].join("\n"),
    map,
    digest: "source-transform-digest",
    runtimeModuleSpecifier: "virtual:aurelia-aot/runtime-proof",
    resources,
    configurations: [],
  };
}

function configurationSourceTransform(sourcePath: string, sourceCode: string): AotSourceTransformArtifact {
  return {
    sourcePath,
    code: [
      "import { AotConfiguration as __aotConfiguration } from 'virtual:aurelia-aot/configuration/proof';",
      sourceCode.replace("StandardConfiguration", "__aotConfiguration"),
    ].join("\n"),
    map: null,
    digest: "configuration-source-transform",
    runtimeModuleSpecifier: null,
    resources: [],
    configurations: [{
      valueStart: sourceCode.indexOf("StandardConfiguration"),
      valueEnd: sourceCode.indexOf("StandardConfiguration") + "StandardConfiguration".length,
      moduleSpecifier: "virtual:aurelia-aot/configuration/proof",
      expectedDigest: "configuration-digest",
      exportName: "AotConfiguration",
      localName: "__aotConfiguration",
    }],
  };
}

function virtualArtifact(specifier: string): AotVirtualModuleArtifact {
  if (specifier === "virtual:aurelia-aot/runtime-proof") {
    return {
      specifier,
      code: "export const apply = value => value;",
      map: null,
      digest: "runtime-digest",
    };
  }
  const index = Number(specifier.slice(specifier.lastIndexOf("-") + 1));
  return {
    specifier,
    code: "export default 'compiled-payload';",
    map: {
      version: 3,
      file: "payload.js",
      sources: ["template.html"],
      sourcesContent: ["<template></template>"],
      names: [],
      mappings: "AAAA",
    },
    digest: `payload-digest-${index}`,
  };
}

function requiredPlugin(preset: readonly Plugin[], name: string): Plugin {
  const plugin = preset.find((candidate) => candidate.name === name);
  if (plugin == null) {
    throw new Error(`Missing plugin '${name}'.`);
  }
  return plugin;
}

async function invoke(
  plugin: Plugin,
  hookName: keyof Plugin,
  context: unknown,
  ...args: unknown[]
): Promise<unknown> {
  const hook = plugin[hookName] as unknown;
  if (hook == null) {
    throw new Error(`Plugin '${plugin.name}' has no '${String(hookName)}' hook.`);
  }
  const handler = typeof hook === "function"
    ? hook
    : (hook as { readonly handler: (...values: unknown[]) => unknown }).handler;
  return await Reflect.apply(handler, context, args);
}

function pluginContext(name = "client", consumer: "client" | "server" = "client") {
  const environment = {
    name,
    config: {
      consumer,
      build: { sourcemap: true },
    },
  };
  return {
    environment,
    resolve: vi.fn(async (source: string) => ({
      id: `C:/app/${source.replace(/^\.\//, "")}`,
      external: false,
      moduleSideEffects: true,
    })),
    getModuleIds: vi.fn(() => [
      "C:/app/main.ts",
      "C:/app/app.html?aurelia-aot",
    ].values()),
    getModuleInfo: vi.fn((id: string) => ({
      id,
      isEntry: id.endsWith("main.ts"),
      importedIds: id.includes("app.html") ? ["C:/app/dependency.ts"] : [],
      dynamicallyImportedIds: [],
      importers: id.endsWith("main.ts") ? [] : ["C:/app/main.ts"],
      dynamicImporters: [],
    })),
    emitFile: vi.fn((_asset: { readonly fileName?: string; readonly source?: string }) => "receipt-reference"),
  };
}

function resolvedConfig(
  build: { readonly watch?: object | null; readonly ssr?: false | string } = {},
  isWorker = false,
): ResolvedConfig {
  return {
    root: "C:/app",
    mode: "production",
    command: "build",
    isWorker,
    build: {
      watch: null,
      ssr: false,
      ...build,
    },
  } as unknown as ResolvedConfig;
}
