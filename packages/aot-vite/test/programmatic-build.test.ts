import { fileURLToPath } from "node:url";
import { build, type Rollup } from "vite";
import { describe, expect, it, vi } from "vitest";
import {
  aureliaAot,
  type AotBuildReceipt,
  type AotTemplateArtifact,
} from "../src/index.js";

describe("aureliaAot programmatic Vite 8 build", () => {
  it("carries the official convention rewrite through the AOT provider and final output", async () => {
    const root = fileURLToPath(new URL("./fixtures/programmatic", import.meta.url));
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
    expect(receipt?.artifacts).toHaveLength(1);
    expect(receipt?.artifacts[0]).toMatchObject({
      digest: "programmatic-proof",
      sourcePath: expect.stringMatching(/app\.html$/),
    });
    expect(receipt?.chunks[0]?.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringMatching(/app\.html\?aurelia-aot$/),
        renderedExports: ["default"],
      }),
    ]));
  });
});

function buildOutput(result: Rollup.RolldownOutput | Rollup.RolldownOutput[]): Rollup.OutputBundle[keyof Rollup.OutputBundle][] {
  const outputs = Array.isArray(result) ? result : [result];
  return outputs.flatMap((output) => output.output);
}
