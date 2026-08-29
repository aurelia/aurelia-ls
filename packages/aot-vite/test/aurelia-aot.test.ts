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
  type AotTemplateArtifact,
} from "../src/index.js";

describe("aureliaAot Vite preset", () => {
  beforeEach(() => {
    official.options = undefined;
  });

  it("owns official convention ordering and reserves the AOT import query", () => {
    const preset = aureliaAot({ provider: artifactProvider() });

    expect(preset.map((plugin) => plugin.name)).toEqual([
      "aurelia-aot:guard",
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
