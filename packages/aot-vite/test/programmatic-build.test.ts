import { fileURLToPath } from "node:url";
import { build, type Rollup } from "vite";
import { describe, expect, it, vi } from "vitest";
import {
  aureliaAot,
  type AotBuildReceipt,
  type AotSourceTransformArtifact,
  type AotTemplateArtifact,
  type AotVirtualModuleArtifact,
} from "../src/index.js";

describe("aureliaAot programmatic Vite 8 build", () => {
  it("carries the official convention rewrite through the AOT provider and final output", async () => {
    const root = fileURLToPath(new URL("./fixtures/programmatic", import.meta.url));
    const transformSource = vi.fn(async ({ sourcePath, code }): Promise<AotSourceTransformArtifact | null> => {
      if (!/[\\/]main\.js$/u.test(sourcePath)) {
        return null;
      }
      return {
        sourcePath,
        code: [
          "import { applyProof as __applyAotProof } from 'virtual:aurelia-aot/runtime-proof';",
          "import __aotPayload from 'virtual:aurelia-aot/payload/programmatic-proof';",
          "import { AotConfiguration as __aotConfiguration } from 'virtual:aurelia-aot/configuration/programmatic-proof';",
          code,
          "globalThis.__aureliaAotCarrierFixture = __applyAotProof(__aotPayload);",
          "globalThis.__aureliaAotConfigurationFixture = __aotConfiguration;",
        ].join("\n"),
        map: null,
        digest: "programmatic-source-transform",
        runtimeModuleSpecifier: "virtual:aurelia-aot/runtime-proof",
        resources: [{
          resourceKey: "programmatic-resource",
          compilerVariantKey: "programmatic-variant",
          definitionName: "programmatic-carrier-proof",
          carrierKind: "define-call",
          carrierStart: 0,
          carrierEnd: 0,
          payloadDigest: "programmatic-payload",
          payloadSpecifier: "virtual:aurelia-aot/payload/programmatic-proof",
        }],
        configurations: [{
          valueStart: 0,
          valueEnd: 1,
          moduleSpecifier: "virtual:aurelia-aot/configuration/programmatic-proof",
          expectedDigest: "programmatic-configuration",
          exportName: "AotConfiguration",
          localName: "__aotConfiguration",
        }],
        browserFacades: [],
      };
    });
    const virtualModuleFor = vi.fn(async ({ specifier }): Promise<AotVirtualModuleArtifact | null> => {
      switch (specifier) {
        case "virtual:aurelia-aot/runtime-proof":
          return {
            specifier,
            code: "export const applyProof = value => `carrier-neutral:${value}`;",
            map: null,
            digest: "programmatic-runtime",
          };
        case "virtual:aurelia-aot/payload/programmatic-proof":
          return {
            specifier,
            code: "export default 'programmatic-payload';",
            map: null,
            digest: "programmatic-payload",
          };
        case "virtual:aurelia-aot/configuration/programmatic-proof":
          return {
            specifier,
            code: "export const AotConfiguration = 'build-specific-configuration';",
            map: null,
            digest: "programmatic-configuration",
          };
        default:
          return null;
      }
    });
    const openBuild = vi.fn(async () => ({
      artifactFor: vi.fn(async ({ sourcePath }): Promise<AotTemplateArtifact> => ({
        sourcePath,
        code: [
          "export default {",
          "name: 'aot-vite-programmatic-proof',",
          "template: '<template></template>',",
          "dependencies: [], bindables: {}, instructions: []",
          "};",
        ].join(""),
        map: null,
        digest: "programmatic-proof",
      })),
      transformSource,
      virtualModuleFor,
    }));
    let receipt: AotBuildReceipt | undefined;

    const result = await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [aureliaAot({
        // The official filter is cwd-relative. Programmatic fixture roots must
        // therefore make their intended source set explicit.
        conventions: { include: "**/*.{ts,js,html}" },
        provider: { openBuild },
        receipt: {
          onReceipt(value) {
            receipt = value;
          },
        },
      })],
      build: {
        write: false,
        sourcemap: true,
        rolldownOptions: {
          input: fileURLToPath(new URL("./fixtures/programmatic/src/main.js", import.meta.url)),
        },
      },
    });

    const output = buildOutput(result as Rollup.RolldownOutput | Rollup.RolldownOutput[]);
    const chunk = output.find((candidate) => candidate.type === "chunk");
    expect(openBuild).toHaveBeenCalledTimes(1);
    expect(chunk?.code).toContain("aot-vite-programmatic-proof");
    expect(chunk?.code).toContain("carrier-neutral:");
    expect(chunk?.code).toContain("build-specific-configuration");
    expect(transformSource).toHaveBeenCalledWith(expect.objectContaining({
      sourcePath: expect.stringMatching(/main\.js$/u),
    }));
    expect(virtualModuleFor).toHaveBeenCalledTimes(3);
    expect(receipt?.artifacts).toHaveLength(2);
    expect(receipt?.artifacts).toContainEqual(expect.objectContaining({
      digest: "programmatic-proof",
      sourcePath: expect.stringMatching(/app\.html$/),
    }));
    expect(receipt?.artifacts).toContainEqual(expect.objectContaining({
      digest: "programmatic-payload",
      sourcePath: expect.stringMatching(/main\.js$/),
      compilerVariantKey: "programmatic-variant",
      resourceKey: "programmatic-resource",
    }));
    expect(receipt?.chunks[0]?.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringMatching(/app\.html\?aurelia-aot$/),
        renderedExports: ["default"],
      }),
      expect.objectContaining({
        id: expect.stringContaining("virtual:aurelia-aot/payload/programmatic-proof"),
        renderedExports: ["default"],
      }),
      expect.objectContaining({
        id: expect.stringContaining("virtual:aurelia-aot/configuration/programmatic-proof"),
        renderedExports: ["AotConfiguration"],
      }),
    ]));
  });
});

function buildOutput(result: Rollup.RolldownOutput | Rollup.RolldownOutput[]): Rollup.OutputBundle[keyof Rollup.OutputBundle][] {
  const outputs = Array.isArray(result) ? result : [result];
  return outputs.flatMap((output) => output.output);
}
