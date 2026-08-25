import { CustomElement } from "@aurelia/runtime-html";
import {
  itHydrateElement,
  itPropertyBinding,
  type HydrateElementInstruction,
  type PropertyBindingInstruction,
} from "@aurelia/template-compiler";
import { describe, expect, it } from "vitest";
import { createJitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";

describe("AOT JIT compiler oracle", () => {
  it("compiles an explicit custom-element definition through the real framework compiler", () => {
    const oracle = createJitCompilerOracle();
    try {
      const { compiled } = oracle.compile({
        definition: {
          name: "aot-parity-smoke",
          type: "custom-element",
          template: '<template><input value.bind="message"></template>',
        },
      });

      expect(compiled.name).toBe("aot-parity-smoke");
      expect(compiled.type).toBe("custom-element");
      expect(compiled.needsCompile).toBe(false);
      expect(compiled.template?.nodeName).toBe("TEMPLATE");
      expect(compiled.surrogates).toEqual([]);
      expect(compiled.instructions).toHaveLength(1);

      const row = compiled.instructions[0];
      expect(row).toHaveLength(1);

      const instruction = row?.[0];
      expect(instruction?.type).toBe(itPropertyBinding);
      if (instruction?.type !== itPropertyBinding) {
        throw new Error("Expected the JIT compiler to emit one property-binding instruction.");
      }
      expect((instruction as PropertyBindingInstruction).to).toBe("value");
    } finally {
      oracle.dispose();
    }
  });

  it("registers definition dependencies in the compilation container", () => {
    const ChildItem = CustomElement.define({
      name: "child-item",
      template: "<template></template>",
    });
    const oracle = createJitCompilerOracle();
    try {
      const unresolved = oracle.compile({
        definition: {
          name: "dependency-by-name",
          type: "custom-element",
          template: "<template><child-item></child-item></template>",
          dependencies: [ChildItem],
        },
      }).compiled;
      const unresolvedInstruction = unresolved.instructions[0]?.[0];
      expect(unresolvedInstruction?.type).toBe(itHydrateElement);
      expect((unresolvedInstruction as HydrateElementInstruction).res).toBe("child-item");

      const resolved = oracle.compile({
        definition: {
          name: "dependency-by-definition",
          type: "custom-element",
          template: "<template><child-item></child-item></template>",
          dependencies: [ChildItem],
        },
        resolveResources: true,
      }).compiled;
      const resolvedInstruction = resolved.instructions[0]?.[0];
      expect(resolvedInstruction?.type).toBe(itHydrateElement);
      expect((resolvedInstruction as HydrateElementInstruction).res).not.toBe("child-item");
      expect((resolvedInstruction as HydrateElementInstruction).res).toMatchObject({ name: "child-item" });
    } finally {
      oracle.dispose();
    }
  });

  it("keeps one DOM realm alive for the process-global framework template cache", () => {
    const first = createJitCompilerOracle();
    const firstDocument = first.compile({
      definition: {
        name: "first-realm",
        type: "custom-element",
        template: '<template><div class="realm"></div></template>',
      },
    }).compiled.template?.ownerDocument;
    first.dispose();

    const second = createJitCompilerOracle();
    try {
      const secondDocument = second.compile({
        definition: {
          name: "second-realm",
          type: "custom-element",
          template: '<template><div class="realm"></div></template>',
        },
      }).compiled.template?.ownerDocument;
      expect(secondDocument).toBe(firstDocument);
    } finally {
      second.dispose();
    }
  });
});
