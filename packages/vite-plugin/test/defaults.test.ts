import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HMR_OPTIONS,
  DEFAULT_TRACE_OPTIONS,
  DEFAULT_SSR_MANIFEST_OPTIONS,
  DEFAULT_SSR_HYDRATION_OPTIONS,
  normalizeDebugChannels,
  normalizeHMROptions,
  normalizeOptions,
  normalizeSSROptions,
  normalizeTraceOptions,
  mergeConfigs,
  loadConfigFile,
} from "../src/defaults.js";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import os from "node:os";

function createTempDir(): string {
  return mkdtempSync(join(os.tmpdir(), "aurelia-vite-defaults-"));
}

describe("defaults normalization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes HMR options from booleans and objects", () => {
    expect(normalizeHMROptions(undefined)).toEqual(DEFAULT_HMR_OPTIONS);
    expect(normalizeHMROptions(true)).toEqual(DEFAULT_HMR_OPTIONS);
    expect(normalizeHMROptions(false)).toEqual({ ...DEFAULT_HMR_OPTIONS, enabled: false });
    expect(normalizeHMROptions({ enabled: false })).toEqual({
      enabled: false,
      preserveState: DEFAULT_HMR_OPTIONS.preserveState,
      log: DEFAULT_HMR_OPTIONS.log,
    });
  });

  it("normalizes SSR options with dev defaults for manifest/hydration", () => {
    const result = normalizeSSROptions(true, true);
    expect(result.enabled).toBe(true);
    expect(result.manifest).toEqual({ ...DEFAULT_SSR_MANIFEST_OPTIONS, debug: true });
    expect(result.hydration).toEqual({ ...DEFAULT_SSR_HYDRATION_OPTIONS, validate: true });
  });

  it("normalizes trace options from environment variable", () => {
    vi.stubEnv("AURELIA_TRACE", "1");
    const result = normalizeTraceOptions(undefined, "/root");
    expect(result.enabled).toBe(true);
    expect(result.output).toBe(DEFAULT_TRACE_OPTIONS.output);
  });

  it("normalizes trace options with json output defaults", () => {
    const result = normalizeTraceOptions({ output: "json" }, "/project");
    expect(result.enabled).toBe(true);
    expect(result.file).toBe("/project/aurelia-trace.json");
  });

  it("normalizes debug channels from environment", () => {
    vi.stubEnv("AURELIA_DEBUG", "lower,resolve,unknown");
    expect(normalizeDebugChannels(undefined)).toEqual(["lower", "resolve"]);
  });

  it("normalizes options with resolved package roots and useDev default", () => {
    const resolved = normalizeOptions(
      {
        packagePath: "./packages/app",
        packageRoots: {
          "@scope/pkg": "./packages/pkg",
        },
      },
      { command: "build", mode: "production", root: "/repo" },
    );
    expect(resolved.packagePath).toBe(resolve("/repo", "packages/app"));
    expect(resolved.packageRoots).toEqual({
      "@scope/pkg": resolve("/repo", "packages/pkg"),
    });
    expect(resolved.useDev).toBe(false);
  });
});

describe("defaults config merging", () => {
  it("merges config objects with inline precedence", () => {
    const merged = mergeConfigs(
      {
        ssr: { enabled: true, stripMarkers: true },
        compiler: { strict: false },
        thirdParty: {
          resources: {
            elements: { "base-el": { name: "base-el" } as any },
            valueConverters: ["base"],
          },
        },
      },
      {
        ssr: false,
        compiler: { strict: true },
        thirdParty: {
          resources: {
            elements: { "inline-el": { name: "inline-el" } as any },
            valueConverters: ["base", "inline"],
          },
        },
      },
    );

    expect(merged.ssr).toBe(false);
    expect(merged.compiler?.strict).toBe(true);
    expect(merged.thirdParty?.resources?.elements).toEqual({
      "base-el": { name: "base-el" },
      "inline-el": { name: "inline-el" },
    });
    expect(merged.thirdParty?.resources?.valueConverters).toEqual(["base", "inline"]);
  });
});

describe("defaults config loading", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads config by walking up and merges extends", async () => {
    const baseConfig = join(tempDir, "base-config.cjs");
    writeFileSync(
      baseConfig,
      [
        "module.exports = {",
        "  compiler: { strict: false },",
        "  thirdParty: {",
        "    resources: {",
        "      elements: { 'base-el': { name: 'base-el' } },",
        "      valueConverters: ['base']",
        "    }",
        "  }",
        "};",
      ].join("\n"),
      "utf-8",
    );

    const nestedDir = join(tempDir, "apps", "demo");
    mkdirSync(nestedDir, { recursive: true });
    const srcDir = join(nestedDir, "src");
    mkdirSync(srcDir, { recursive: true });
    const entryPath = join(srcDir, "main.ts");
    writeFileSync(entryPath, "// entry", "utf-8");
    writeFileSync(
      join(nestedDir, "aurelia.config.cjs"),
      [
        "module.exports = {",
        `  extends: ${JSON.stringify("../../base-config.cjs")},`,
        "  compiler: { strict: true },",
        "  thirdParty: {",
        "    resources: {",
        "      elements: { 'child-el': { name: 'child-el' } },",
        "      valueConverters: ['child']",
        "    }",
        "  }",
        "};",
      ].join("\n"),
      "utf-8",
    );

    const loaded = await loadConfigFile(tempDir, entryPath);
    expect(loaded?.compiler?.strict).toBe(true);
    expect(loaded?.thirdParty?.resources?.elements).toEqual({
      "base-el": { name: "base-el" },
      "child-el": { name: "child-el" },
    });
    expect(loaded?.thirdParty?.resources?.valueConverters).toEqual(["base", "child"]);
  });

  it("throws on circular config extends", async () => {
    const configA = join(tempDir, "aurelia.config.cjs");
    const configB = join(tempDir, "alt.config.cjs");
    writeFileSync(
      configA,
      `module.exports = { extends: ${JSON.stringify("./alt.config.cjs")} };`,
      "utf-8",
    );
    writeFileSync(
      configB,
      `module.exports = { extends: ${JSON.stringify("./aurelia.config.cjs")} };`,
      "utf-8",
    );

    await expect(loadConfigFile(tempDir, tempDir)).rejects.toThrow("Circular config extends");
  });

  it("returns null when no config file is found", async () => {
    const emptyDir = join(tempDir, "empty");
    mkdirSync(emptyDir, { recursive: true });
    const loaded = await loadConfigFile(emptyDir, emptyDir);
    expect(loaded).toBeNull();
  });
});
