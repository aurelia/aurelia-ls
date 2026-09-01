import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { build, type Rolldown } from "vite";
import { afterEach, describe, expect, it } from "vitest";

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

describe("framework links through a real Vite build", () => {
  it("links the exact resolved id, composes its map, and emits deterministic receipts", async () => {
    const fixture = await fixtureProject();
    const first = await buildVariant(fixture, "applied", true);
    const second = await buildVariant(fixture, "applied", true);

    expect(first.chunk.code).toContain("framework-value:linked");
    expect(first.chunk.code).not.toContain("framework-value:ordinary");
    expect(first.chunk.map?.sources.some((source) => source.replaceAll("\\", "/").endsWith("/framework.mjs")))
      .toBe(true);
    expect(first.receipt?.frameworkLinks).toEqual(second.receipt?.frameworkLinks);
    expect(first.receipt?.frameworkLinks).toMatchObject({
      disposition: "applied",
      recipeFingerprint: sha256("programmatic-recipe"),
      modules: [{ loaded: true, disposition: "applied", map: "mapped" }],
    });
  });

  it("keeps an allowed C0 fallback byte-identical to the no-link AOT build", async () => {
    const fixture = await fixtureProject();
    const control = await buildVariant(fixture, "not-requested", false);
    const fallback = await buildVariant(fixture, "c0-fallback", false);

    expect(fallback.chunk.code).toBe(control.chunk.code);
    expect(fallback.chunk.code).toContain("framework-value:ordinary");
    expect(fallback.receipt?.frameworkLinks).toMatchObject({
      disposition: "c0-fallback",
      reason: { kind: "recipe-unavailable" },
      modules: [{ disposition: "c0-fallback", loaded: true }],
    });
  });

  it("falsifies externalized and partially consumed applied plans at the real module-graph boundary", async () => {
    const fixture = await fixtureProject();
    const oneTarget = frameworkOptions(fixture, false);
    const oneResult = appliedResult(fixture);
    const externalized = await buildPreparedPlan(fixture, oneTarget, oneResult, ["./framework.mjs"]);
    expect(externalized.receipt?.frameworkLinks).toMatchObject({
      disposition: "c0-fallback",
      reason: { kind: "target-unreached" },
    });

    await expect(buildPreparedPlan(
      fixture,
      { ...oneTarget, policy: "require-applied" },
      oneResult,
      ["./framework.mjs"],
    )).rejects.toThrow(/None of the 1 prepared framework-link target modules/u);

    const second = path.join(fixture.root, "framework-second.mjs");
    const secondCode = "export const second = 'framework-second:ordinary';\n";
    const secondLinked = "export const second = 'framework-second:linked';\n";
    await writeFile(second, secondCode, "utf8");
    const partialOptions: AotFrameworkLinksOptions = {
      ...oneTarget,
      modules: [
        ...oneTarget.modules,
        {
          role: "target",
          packageName: "@aurelia/runtime",
          packageRelativePath: "dist/esm/index.mjs",
          resolvedId: second,
          expectedSha256: sha256(secondCode),
        },
      ],
    };
    if (oneResult.disposition !== "applied") throw new Error("Applied fixture result unexpectedly fell back.");
    const partialResult: AotPreparedFrameworkLinksResult = {
      disposition: "applied",
      recipeFingerprint: oneResult.recipeFingerprint,
      modules: [
        ...oneResult.modules,
        {
          packageName: "@aurelia/runtime",
          packageRelativePath: "dist/esm/index.mjs",
          resolvedId: second,
          inputSha256: sha256(secondCode),
          linkedSha256: sha256(secondLinked),
          code: secondLinked,
          map: null,
        },
      ],
    };
    await expect(buildPreparedPlan(fixture, partialOptions, partialResult))
      .rejects.toThrow(/consumed 1 of 2 target modules/u);
  });
});

interface FixtureProject {
  readonly root: string;
  readonly entry: string;
  readonly framework: string;
  readonly frameworkCode: string;
  readonly linkedCode: string;
}

async function fixtureProject(): Promise<FixtureProject> {
  const root = await mkdtemp(path.join(tmpdir(), "aurelia-aot-vite-framework-build-"));
  temporaryRoots.push(root);
  const entry = path.join(root, "main.js");
  const framework = path.join(root, "framework.mjs");
  const frameworkCode = "export const value = 'framework-value:ordinary';\n";
  const linkedCode = "export const value = 'framework-value:linked';\n";
  await mkdir(root, { recursive: true });
  await Promise.all([
    writeFile(entry, "import { value } from './framework.mjs';\nexport { value };\n", "utf8"),
    writeFile(framework, frameworkCode, "utf8"),
  ]);
  return { root, entry, framework, frameworkCode, linkedCode };
}

async function buildVariant(
  fixture: FixtureProject,
  disposition: "not-requested" | "applied" | "c0-fallback",
  sourcemap: boolean,
): Promise<{ readonly chunk: Rolldown.OutputChunk; readonly receipt: AotBuildReceipt | undefined }> {
  let receipt: AotBuildReceipt | undefined;
  const frameworkLinks = disposition === "not-requested" ? undefined : frameworkOptions(fixture, sourcemap);
  const provider = artifactProvider(fixture, disposition);
  const output = await build({
    root: fixture.root,
    configFile: false,
    mode: "production",
    logLevel: "silent",
    plugins: aureliaAot({
      provider,
      ...(frameworkLinks === undefined ? {} : { frameworkLinks }),
      conventions: { include: [] },
      receipt: { onReceipt: (value) => { receipt = value; } },
    }),
    build: {
      write: false,
      copyPublicDir: false,
      sourcemap,
      minify: false,
      lib: {
        entry: fixture.entry,
        formats: ["es"],
        fileName: () => "app.js",
      },
      rolldownOptions: {
        preserveEntrySignatures: "strict",
        output: { codeSplitting: false },
      },
    },
  });
  const outputs = (Array.isArray(output) ? output : [output]).flatMap((entry) =>
    "output" in entry ? entry.output : []
  );
  const chunk = outputs.find((entry): entry is Rolldown.OutputChunk => entry.type === "chunk");
  if (chunk == null) throw new Error("Programmatic framework-link build emitted no chunk.");
  return { chunk, receipt };
}

function artifactProvider(
  fixture: FixtureProject,
  disposition: "not-requested" | "applied" | "c0-fallback",
): AotArtifactProvider {
  return {
    async openBuild() {
      return {
        artifactFor: async () => {
          throw new Error("Programmatic framework-link fixture has no Aurelia templates.");
        },
        transformSource: async () => null,
        ...(disposition === "not-requested"
          ? {}
          : {
              prepareFrameworkLinks: async (): Promise<AotPreparedFrameworkLinksResult> =>
                disposition === "c0-fallback"
                  ? {
                      disposition: "c0-fallback",
                      reason: {
                        kind: "recipe-unavailable",
                        summary: "Programmatic fallback control intentionally has no link recipe.",
                      },
                    }
                  : {
                      disposition: "applied",
                      recipeFingerprint: sha256("programmatic-recipe"),
                      modules: [{
                        packageName: "@aurelia/runtime-html",
                        packageRelativePath: "dist/esm/index.mjs",
                        resolvedId: fixture.framework,
                        inputSha256: sha256(fixture.frameworkCode),
                        linkedSha256: sha256(fixture.linkedCode),
                        code: fixture.linkedCode,
                        map: {
                          version: 3,
                          file: fixture.framework,
                          sources: [fixture.framework],
                          sourcesContent: [fixture.frameworkCode],
                          names: [],
                          mappings: "AAAA",
                        },
                      }],
                    },
            }),
      };
    },
  };
}

async function buildPreparedPlan(
  fixture: FixtureProject,
  frameworkLinks: AotFrameworkLinksOptions,
  result: AotPreparedFrameworkLinksResult,
  external: readonly string[] = [],
): Promise<{ readonly chunk: Rolldown.OutputChunk; readonly receipt: AotBuildReceipt | undefined }> {
  let receipt: AotBuildReceipt | undefined;
  const output = await build({
    root: fixture.root,
    configFile: false,
    mode: "production",
    logLevel: "silent",
    plugins: aureliaAot({
      provider: {
        async openBuild() {
          return {
            artifactFor: async () => { throw new Error("No templates expected."); },
            transformSource: async () => null,
            prepareFrameworkLinks: async () => result,
          };
        },
      },
      frameworkLinks,
      conventions: { include: [] },
      receipt: { onReceipt: (value) => { receipt = value; } },
    }),
    build: {
      write: false,
      copyPublicDir: false,
      sourcemap: false,
      minify: false,
      lib: { entry: fixture.entry, formats: ["es"], fileName: () => "app.js" },
      rolldownOptions: {
        external: [...external],
        preserveEntrySignatures: "strict",
        output: { codeSplitting: false },
      },
    },
  });
  const outputs = (Array.isArray(output) ? output : [output]).flatMap((entry) =>
    "output" in entry ? entry.output : []
  );
  const chunk = outputs.find((entry): entry is Rolldown.OutputChunk => entry.type === "chunk");
  if (chunk == null) throw new Error("Prepared-plan build emitted no chunk.");
  return { chunk, receipt };
}

function appliedResult(fixture: FixtureProject): AotPreparedFrameworkLinksResult {
  return {
    disposition: "applied",
    recipeFingerprint: sha256("programmatic-recipe"),
    modules: [{
      packageName: "@aurelia/runtime-html",
      packageRelativePath: "dist/esm/index.mjs",
      resolvedId: fixture.framework,
      inputSha256: sha256(fixture.frameworkCode),
      linkedSha256: sha256(fixture.linkedCode),
      code: fixture.linkedCode,
      map: null,
    }],
  };
}

function frameworkOptions(fixture: FixtureProject, mapped: boolean): AotFrameworkLinksOptions {
  return {
    protocol: 1,
    graphFingerprint: sha256("programmatic-graph"),
    mapPosture: mapped ? "mapped" : "performance-no-map",
    policy: "allow-c0-fallback",
    modules: [{
      role: "target",
      packageName: "@aurelia/runtime-html",
      packageRelativePath: "dist/esm/index.mjs",
      resolvedId: fixture.framework,
      expectedSha256: sha256(fixture.frameworkCode),
    }],
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
