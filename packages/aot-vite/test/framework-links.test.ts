import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Plugin, ResolvedConfig } from "vite";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  aureliaAot,
  type AotArtifactProvider,
  type AotBuildReceipt,
  type AotFrameworkLinksOptions,
  type AotPreparedFrameworkLinksResult,
} from "../src/index.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("exact-fingerprinted framework links", () => {
  it("arms one atomic applied batch before sources and emits deterministic receipt evidence", async () => {
    const fixture = await frameworkFixture();
    const linkedCode = "export const target = 'linked';\n";
    const prepareFrameworkLinks = vi.fn(async (): Promise<AotPreparedFrameworkLinksResult> => ({
      disposition: "applied",
      recipeFingerprint: sha256("recipe"),
      modules: [{
        packageName: "@aurelia/runtime-html",
        packageRelativePath: "dist/esm/index.mjs",
        resolvedId: fixture.target,
        inputSha256: sha256(fixture.targetCode),
        linkedSha256: sha256(linkedCode),
        code: linkedCode,
        map: null,
      }],
    }));
    let observedReceipt: AotBuildReceipt | undefined;
    const preset = aureliaAot({
      provider: provider(prepareFrameworkLinks),
      frameworkLinks: frameworkOptions(fixture),
      receipt: { onReceipt: (receipt) => { observedReceipt = receipt; } },
    });
    const names = preset.map((plugin) => plugin.name);
    expect(names.indexOf("aurelia-aot:framework-links")).toBeGreaterThan(names.indexOf("aurelia-aot:guard"));
    expect(names.indexOf("aurelia-aot:framework-links")).toBeLessThan(names.indexOf("aurelia-aot:sources"));
    expect(names.indexOf("aurelia-aot:sources")).toBeLessThan(names.indexOf("aurelia-aot:artifacts"));

    const context = pluginContext();
    await resolvePreset(preset);
    const linker = requiredPlugin(preset, "aurelia-aot:framework-links");
    await invoke(linker, "buildStart", context);
    expect(prepareFrameworkLinks).toHaveBeenCalledTimes(1);
    expect(prepareFrameworkLinks).toHaveBeenCalledWith(expect.objectContaining({
      protocol: 1,
      graphFingerprint: sha256("graph"),
      mapPosture: "performance-no-map",
      policy: "allow-c0-fallback",
      modules: [
        expect.objectContaining({
          role: "guard",
          resolvedId: fixture.guard,
          observedSha256: sha256(fixture.guardCode),
          code: fixture.guardCode,
        }),
        expect.objectContaining({
          role: "target",
          resolvedId: fixture.target,
          observedSha256: sha256(fixture.targetCode),
          code: fixture.targetCode,
        }),
      ],
    }));
    expect(await invoke(linker, "transform", context, fixture.guardCode, fixture.guard, { ssr: false })).toBeNull();
    expect(await invoke(linker, "transform", context, fixture.targetCode, fixture.target, { ssr: false })).toEqual({
      code: linkedCode,
      map: null,
    });
    await invoke(linker, "buildEnd", context, undefined);

    const receiptPlugin = requiredPlugin(preset, "aurelia-aot:receipt");
    await invoke(receiptPlugin, "generateBundle", context, {}, {});
    const emitted = context.emitFile.mock.calls[0]?.[0] as { readonly source?: string } | undefined;
    const receipt = JSON.parse(String(emitted?.source)) as AotBuildReceipt;
    expect(observedReceipt).toEqual(receipt);
    expect(receipt.frameworkLinks).toEqual({
      version: 1,
      protocol: 1,
      graphFingerprint: sha256("graph"),
      mapPosture: "performance-no-map",
      policy: "allow-c0-fallback",
      disposition: "applied",
      recipeFingerprint: sha256("recipe"),
      reason: null,
      modules: [
        expect.objectContaining({
          role: "guard",
          disposition: "guard-verified",
          loaded: true,
          linkedSha256: null,
          map: "none",
        }),
        expect.objectContaining({
          role: "target",
          disposition: "applied",
          loaded: true,
          linkedSha256: sha256(linkedCode),
          map: "none",
        }),
      ],
    });
  });

  it("keeps an allowed session refusal completely on C0 and rejects the same refusal when applied is required", async () => {
    const fixture = await frameworkFixture();
    const refusal: AotPreparedFrameworkLinksResult = {
      disposition: "c0-fallback",
      reason: { kind: "recipe-unavailable", summary: "No recipe for this exact framework graph." },
    };
    const allowed = aureliaAot({
      provider: provider(vi.fn(async () => refusal)),
      frameworkLinks: frameworkOptions(fixture),
    });
    await resolvePreset(allowed);
    const allowedLinker = requiredPlugin(allowed, "aurelia-aot:framework-links");
    const allowedContext = pluginContext();
    await invoke(allowedLinker, "buildStart", allowedContext);
    expect(await invoke(
      allowedLinker,
      "transform",
      allowedContext,
      fixture.targetCode,
      fixture.target,
      { ssr: false },
    )).toBeNull();

    const required = aureliaAot({
      provider: provider(vi.fn(async () => refusal)),
      frameworkLinks: frameworkOptions(fixture, { policy: "require-applied" }),
    });
    await resolvePreset(required);
    await expect(invoke(
      requiredPlugin(required, "aurelia-aot:framework-links"),
      "buildStart",
      pluginContext(),
    )).rejects.toMatchObject({
      code: "AOT_VITE_FRAMEWORK_LINK_FAILED",
      message: expect.stringContaining("No recipe for this exact framework graph"),
    });
  });

  it("preflights all hashes before the session call and permits only whole-plan C0 fallback", async () => {
    const fixture = await frameworkFixture();
    const prepareFrameworkLinks = vi.fn();
    const preset = aureliaAot({
      provider: provider(prepareFrameworkLinks),
      frameworkLinks: frameworkOptions(fixture, {
        modules: [
          targetModule(fixture, sha256("wrong target")),
          guardModule(fixture),
        ],
      }),
      receipt: {},
    });
    await resolvePreset(preset);
    const linker = requiredPlugin(preset, "aurelia-aot:framework-links");
    const context = pluginContext();
    await invoke(linker, "buildStart", context);
    expect(prepareFrameworkLinks).not.toHaveBeenCalled();
    expect(await invoke(linker, "transform", context, fixture.targetCode, fixture.target, {})).toBeNull();
    expect(await invoke(linker, "transform", context, fixture.guardCode, fixture.guard, {})).toBeNull();

    await invoke(requiredPlugin(preset, "aurelia-aot:receipt"), "generateBundle", context, {}, {});
    const emitted = context.emitFile.mock.calls[0]?.[0] as { readonly source?: string } | undefined;
    const receipt = JSON.parse(String(emitted?.source)) as AotBuildReceipt;
    expect(receipt.frameworkLinks).toMatchObject({
      disposition: "c0-fallback",
      recipeFingerprint: null,
      reason: {
        kind: "input-hash-mismatch",
        packageName: "@aurelia/runtime-html",
      },
    });
    expect(receipt.frameworkLinks?.modules.every((module) => module.disposition === "c0-fallback")).toBe(true);
  });

  it("decides applied status from end-of-graph target consumption and rejects partial worlds", async () => {
    const fixture = await frameworkFixture();
    const runtimeLinked = "export const guard = 'linked';\n";
    const htmlLinked = "export const target = 'linked';\n";
    const result: AotPreparedFrameworkLinksResult = {
      disposition: "applied",
      recipeFingerprint: sha256("two-target-recipe"),
      modules: [
        {
          packageName: "@aurelia/runtime-html",
          packageRelativePath: "dist/esm/index.mjs",
          resolvedId: fixture.target,
          inputSha256: sha256(fixture.targetCode),
          linkedSha256: sha256(htmlLinked),
          code: htmlLinked,
          map: null,
        },
        {
          packageName: "@aurelia/runtime",
          packageRelativePath: "dist/esm/index.mjs",
          resolvedId: fixture.guard,
          inputSha256: sha256(fixture.guardCode),
          linkedSha256: sha256(runtimeLinked),
          code: runtimeLinked,
          map: null,
        },
      ],
    };
    const modules = [
      targetModule(fixture),
      { ...guardModule(fixture), role: "target" as const },
    ];

    const zero = aureliaAot({
      provider: provider(vi.fn(async () => result)),
      frameworkLinks: frameworkOptions(fixture, { modules }),
      receipt: {},
    });
    await resolvePreset(zero);
    const zeroLinker = requiredPlugin(zero, "aurelia-aot:framework-links");
    const zeroContext = pluginContext();
    await invoke(zeroLinker, "buildStart", zeroContext);
    await invoke(zeroLinker, "buildEnd", zeroContext, undefined);
    await invoke(requiredPlugin(zero, "aurelia-aot:receipt"), "generateBundle", zeroContext, {}, {});
    const emitted = zeroContext.emitFile.mock.calls[0]?.[0] as { readonly source?: string } | undefined;
    const receipt = JSON.parse(String(emitted?.source)) as AotBuildReceipt;
    expect(receipt.frameworkLinks).toMatchObject({
      disposition: "c0-fallback",
      reason: { kind: "target-unreached" },
    });
    expect(receipt.frameworkLinks?.modules.every((module) => module.disposition === "c0-fallback")).toBe(true);

    const required = aureliaAot({
      provider: provider(vi.fn(async () => result)),
      frameworkLinks: frameworkOptions(fixture, { modules, policy: "require-applied" }),
    });
    await resolvePreset(required);
    const requiredLinker = requiredPlugin(required, "aurelia-aot:framework-links");
    const requiredContext = pluginContext();
    await invoke(requiredLinker, "buildStart", requiredContext);
    await expect(invoke(requiredLinker, "buildEnd", requiredContext, undefined)).rejects.toMatchObject({
      code: "AOT_VITE_FRAMEWORK_LINK_FAILED",
      message: expect.stringContaining("None of the 2"),
    });

    const partial = aureliaAot({
      provider: provider(vi.fn(async () => result)),
      frameworkLinks: frameworkOptions(fixture, { modules }),
    });
    await resolvePreset(partial);
    const partialLinker = requiredPlugin(partial, "aurelia-aot:framework-links");
    const partialContext = pluginContext();
    await invoke(partialLinker, "buildStart", partialContext);
    await invoke(partialLinker, "transform", partialContext, fixture.targetCode, fixture.target, {});
    await expect(invoke(partialLinker, "buildEnd", partialContext, undefined)).rejects.toMatchObject({
      code: "AOT_VITE_FRAMEWORK_LINK_FAILED",
      message: expect.stringContaining("consumed 1 of 2"),
    });
  });

  it("fails closed for missing paths, post-arm input drift, foreign equal-byte ids, and mapped artifacts without maps", async () => {
    const fixture = await frameworkFixture();
    const missing = aureliaAot({
      provider: provider(vi.fn()),
      frameworkLinks: frameworkOptions(fixture, {
        modules: [{ ...targetModule(fixture), resolvedId: path.join(fixture.root, "missing.mjs") }],
      }),
    });
    await resolvePreset(missing);
    await expect(invoke(
      requiredPlugin(missing, "aurelia-aot:framework-links"),
      "buildStart",
      pluginContext(),
    )).rejects.toMatchObject({ code: "AOT_VITE_FRAMEWORK_LINK_FAILED" });

    const linkedCode = "export const target = 'linked';\n";
    const appliedResult: AotPreparedFrameworkLinksResult = {
      disposition: "applied",
      recipeFingerprint: sha256("recipe"),
      modules: [{
        packageName: "@aurelia/runtime-html",
        packageRelativePath: "dist/esm/index.mjs",
        resolvedId: fixture.target,
        inputSha256: sha256(fixture.targetCode),
        linkedSha256: sha256(linkedCode),
        code: linkedCode,
        map: null,
      }],
    };
    const applied = aureliaAot({
      provider: provider(vi.fn(async () => appliedResult)),
      frameworkLinks: frameworkOptions(fixture),
    });
    await resolvePreset(applied);
    const appliedLinker = requiredPlugin(applied, "aurelia-aot:framework-links");
    const appliedContext = pluginContext();
    await invoke(appliedLinker, "buildStart", appliedContext);
    await expect(invoke(
      appliedLinker,
      "transform",
      appliedContext,
      "export const target = 'post-arm-drift';\n",
      fixture.target,
      {},
    )).rejects.toMatchObject({ code: "AOT_VITE_FRAMEWORK_LINK_FAILED" });
    expect(await invoke(
      appliedLinker,
      "transform",
      appliedContext,
      fixture.targetCode,
      path.join(fixture.root, "equal-copy.mjs"),
      {},
    )).toBeNull();

    const mapped = aureliaAot({
      provider: provider(vi.fn(async () => appliedResult)),
      frameworkLinks: frameworkOptions(fixture, { mapPosture: "mapped" }),
    });
    await resolvePreset(mapped);
    await expect(invoke(
      requiredPlugin(mapped, "aurelia-aot:framework-links"),
      "buildStart",
      pluginContext(),
    )).rejects.toMatchObject({
      code: "AOT_VITE_FRAMEWORK_LINK_FAILED",
      message: expect.stringContaining("returned no usable source map"),
    });
  });
});

async function frameworkFixture(): Promise<{
  readonly root: string;
  readonly target: string;
  readonly targetCode: string;
  readonly guard: string;
  readonly guardCode: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), "aurelia-aot-vite-framework-links-"));
  temporaryRoots.push(root);
  const target = path.join(root, "runtime-html.mjs");
  const guard = path.join(root, "runtime.mjs");
  const targetCode = "export const target = 'ordinary';\n";
  const guardCode = "export const guard = 'ordinary';\n";
  await Promise.all([
    writeFile(target, targetCode, "utf8"),
    writeFile(guard, guardCode, "utf8"),
    writeFile(path.join(root, "equal-copy.mjs"), targetCode, "utf8"),
  ]);
  return { root, target, targetCode, guard, guardCode };
}

function frameworkOptions(
  fixture: Awaited<ReturnType<typeof frameworkFixture>>,
  overrides: Partial<Omit<AotFrameworkLinksOptions, "protocol" | "graphFingerprint">> = {},
): AotFrameworkLinksOptions {
  return {
    protocol: 1,
    graphFingerprint: sha256("graph"),
    mapPosture: overrides.mapPosture ?? "performance-no-map",
    policy: overrides.policy ?? "allow-c0-fallback",
    modules: overrides.modules ?? [targetModule(fixture), guardModule(fixture)],
  };
}

function targetModule(
  fixture: Awaited<ReturnType<typeof frameworkFixture>>,
  expectedSha256 = sha256(fixture.targetCode),
) {
  return {
    role: "target" as const,
    packageName: "@aurelia/runtime-html",
    packageRelativePath: "dist/esm/index.mjs",
    resolvedId: fixture.target,
    expectedSha256,
  };
}

function guardModule(fixture: Awaited<ReturnType<typeof frameworkFixture>>) {
  return {
    role: "guard" as const,
    packageName: "@aurelia/runtime",
    packageRelativePath: "dist/esm/index.mjs",
    resolvedId: fixture.guard,
    expectedSha256: sha256(fixture.guardCode),
  };
}

function provider(
  prepareFrameworkLinks: NonNullable<Awaited<ReturnType<AotArtifactProvider["openBuild"]>>["prepareFrameworkLinks"]>,
): AotArtifactProvider {
  return {
    async openBuild() {
      return {
        artifactFor: async ({ sourcePath }) => ({
          sourcePath,
          code: "export default {};",
          map: null,
          digest: "unused-template",
        }),
        prepareFrameworkLinks,
      };
    },
  };
}

async function resolvePreset(preset: readonly Plugin[]): Promise<void> {
  await invoke(requiredPlugin(preset, "aurelia-aot:guard"), "configResolved", undefined, resolvedConfig());
}

function requiredPlugin(preset: readonly Plugin[], name: string): Plugin {
  const plugin = preset.find((candidate) => candidate.name === name);
  if (plugin == null) throw new Error(`Missing plugin '${name}'.`);
  return plugin;
}

async function invoke(
  plugin: Plugin,
  hookName: keyof Plugin,
  context: unknown,
  ...args: unknown[]
): Promise<unknown> {
  const hook = plugin[hookName] as unknown;
  if (hook == null) throw new Error(`Plugin '${plugin.name}' has no '${String(hookName)}' hook.`);
  const handler = typeof hook === "function"
    ? hook
    : (hook as { readonly handler: (...values: unknown[]) => unknown }).handler;
  return await Reflect.apply(handler, context, args);
}

function pluginContext() {
  const environment = {
    name: "client",
    config: { consumer: "client", build: { sourcemap: true } },
  };
  return {
    environment,
    addWatchFile: vi.fn(),
    getModuleIds: vi.fn(() => [].values()),
    getModuleInfo: vi.fn(() => null),
    emitFile: vi.fn((_asset: unknown) => "receipt-reference"),
  };
}

function resolvedConfig(): ResolvedConfig {
  return {
    root: "C:/app",
    mode: "production",
    command: "build",
    isWorker: false,
    build: { watch: null, ssr: false },
  } as unknown as ResolvedConfig;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
