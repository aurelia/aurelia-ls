/**
 * R1: Gap Resource Identity — Verification Tests
 *
 * Tests the four assertion patterns defined in the R1 implementation spec:
 *
 * Pattern A: Gap resource identity at creation sites
 *   Gaps created at the recognition stage carry resource identity (kind + name).
 *
 * Pattern B: Gap identity survival through the catalog boundary
 *   Resource identity on AnalysisGap survives conversion to CatalogGap.
 *
 * Pattern D: Gaps without resource identity remain valid
 *   Pre-recognition gaps honestly lack identity and do not crash or fabricate.
 *
 * Pattern C (end-to-end integration) requires fixture setup and is deferred
 * to the integration harness extension.
 */

import { describe, it, expect } from "vitest";
import type { NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
import type { TextSpan } from "@aurelia-ls/compiler/model/span.js";
import { matchDefine } from "../../out/project-semantics/recognize/define.js";
import { gap } from "../../out/project-semantics/evaluate/types.js";
import { analysisGapToCatalogGap } from "../../out/project-semantics/resolve.js";
import {
  literal,
  ref,
  object,
} from "../../out/project-semantics/evaluate/value/types.js";

// =============================================================================
// Test Helpers
// =============================================================================

const FILE = "/out/resources.ts" as NormalizedPath;
const SPAN: TextSpan = { start: 0, end: 1 };

function defineCall(
  resourceType: "CustomElement" | "CustomAttribute" | "ValueConverter" | "BindingBehavior",
  definition: Parameters<typeof literal>[0] | ReturnType<typeof object>,
  classRef: ReturnType<typeof ref>,
) {
  const def = typeof definition === "object" && "kind" in definition ? definition : literal(definition);
  return { resourceType, definition: def, classRef, span: SPAN };
}

// =============================================================================
// Pattern A: Gap resource identity at creation sites
// =============================================================================

describe("Pattern A: recognizer gaps carry resource identity", () => {
  it("custom-element gap from dynamic definition carries element identity", () => {
    const result = matchDefine(
      defineCall("CustomElement", literal(123), ref("MyCard")),
      FILE,
    );

    expect(result.resource).toBeNull();
    expect(result.gaps).toHaveLength(1);
    const g = result.gaps[0]!;
    expect(g.why.kind).toBe("dynamic-value");
    expect(g.resource).toBeDefined();
    expect(g.resource!.kind).toBe("custom-element");
    expect(g.resource!.name).toBe("MyCard");
  });

  it("custom-element gap from invalid name carries element identity", () => {
    const result = matchDefine(
      defineCall("CustomElement", literal(""), ref("BadName")),
      FILE,
    );

    expect(result.resource).toBeNull();
    expect(result.gaps).toHaveLength(1);
    const g = result.gaps[0]!;
    expect(g.why.kind).toBe("invalid-resource-name");
    expect(g.resource).toBeDefined();
    expect(g.resource!.kind).toBe("custom-element");
    expect(g.resource!.name).toBe("BadName");
  });

  it("custom-attribute gap from dynamic definition carries attribute identity", () => {
    const result = matchDefine(
      defineCall("CustomAttribute", literal(42), ref("MyTooltip")),
      FILE,
    );

    expect(result.resource).toBeNull();
    expect(result.gaps).toHaveLength(1);
    const g = result.gaps[0]!;
    expect(g.why.kind).toBe("dynamic-value");
    expect(g.resource).toBeDefined();
    expect(g.resource!.kind).toBe("custom-attribute");
    expect(g.resource!.name).toBe("MyTooltip");
  });

  it("value-converter gap from dynamic definition carries vc identity", () => {
    const result = matchDefine(
      defineCall("ValueConverter", literal(true), ref("JsonConverter")),
      FILE,
    );

    expect(result.resource).toBeNull();
    expect(result.gaps).toHaveLength(1);
    const g = result.gaps[0]!;
    expect(g.why.kind).toBe("dynamic-value");
    expect(g.resource).toBeDefined();
    expect(g.resource!.kind).toBe("value-converter");
    expect(g.resource!.name).toBe("JsonConverter");
  });

  it("binding-behavior gap from dynamic definition carries bb identity", () => {
    const result = matchDefine(
      defineCall("BindingBehavior", literal(false), ref("ThrottleBB")),
      FILE,
    );

    expect(result.resource).toBeNull();
    expect(result.gaps).toHaveLength(1);
    const g = result.gaps[0]!;
    expect(g.why.kind).toBe("dynamic-value");
    expect(g.resource).toBeDefined();
    expect(g.resource!.kind).toBe("binding-behavior");
    expect(g.resource!.name).toBe("ThrottleBB");
  });

  it("invalidNameGap for each resource kind carries correct identity", () => {
    const kinds = [
      ["CustomElement", "custom-element"],
      ["CustomAttribute", "custom-attribute"],
      ["ValueConverter", "value-converter"],
      ["BindingBehavior", "binding-behavior"],
    ] as const;

    for (const [defineType, expectedKind] of kinds) {
      const result = matchDefine(
        defineCall(defineType, literal(""), ref("SomeClass")),
        FILE,
      );

      expect(result.gaps).toHaveLength(1);
      const g = result.gaps[0]!;
      expect(g.why.kind).toBe("invalid-resource-name");
      expect(g.resource).toBeDefined();
      expect(g.resource!.kind).toBe(expectedKind);
      expect(g.resource!.name).toBe("SomeClass");
    }
  });
});

// =============================================================================
// Pattern B: Gap identity survival through the catalog boundary
// =============================================================================

describe("Pattern B: gap identity survives conversion to CatalogGap", () => {
  it("preserves resource kind and name through conversion", () => {
    const analysisGap = gap(
      "bindables for user-card",
      { kind: "dynamic-value", expression: "computedBindables()" },
      "Provide explicit bindable declarations.",
      { file: "/out/user-card.ts" },
      { kind: "custom-element", name: "user-card" },
    );

    const catalogGap = analysisGapToCatalogGap(analysisGap);

    expect(catalogGap.kind).toBe("dynamic-value");
    expect(catalogGap.message).toBe("bindables for user-card: Provide explicit bindable declarations.");
    expect(catalogGap.resource).toBe("/out/user-card.ts");
    expect(catalogGap.resourceKind).toBe("custom-element");
    expect(catalogGap.resourceName).toBe("user-card");
  });

  it("preserves resource identity without source location", () => {
    const analysisGap = gap(
      "registration for data-grid",
      { kind: "function-return", functionName: "createGrid" },
      "Use explicit resource definition.",
      undefined,
      { kind: "custom-element", name: "data-grid" },
    );

    const catalogGap = analysisGapToCatalogGap(analysisGap);

    expect(catalogGap.kind).toBe("function-return");
    expect(catalogGap.resource).toBeUndefined();
    expect(catalogGap.resourceKind).toBe("custom-element");
    expect(catalogGap.resourceName).toBe("data-grid");
  });

  it("preserves all five resource kinds through conversion", () => {
    const kinds = [
      "custom-element",
      "custom-attribute",
      "template-controller",
      "value-converter",
      "binding-behavior",
    ] as const;

    for (const kind of kinds) {
      const analysisGap = gap(
        `test for ${kind}`,
        { kind: "dynamic-value", expression: "x" },
        "test suggestion",
        undefined,
        { kind, name: "test-resource" },
      );

      const catalogGap = analysisGapToCatalogGap(analysisGap);
      expect(catalogGap.resourceKind).toBe(kind);
      expect(catalogGap.resourceName).toBe("test-resource");
    }
  });
});

// =============================================================================
// Pattern D: Gaps without resource identity remain valid
// =============================================================================

describe("Pattern D: gaps without resource identity are honestly absent", () => {
  it("pre-recognition gap (dynamic classRef) has no resource identity", () => {
    const result = matchDefine(
      defineCall("CustomElement", literal("foo-bar"), literal("NotAClass")),
      FILE,
    );

    expect(result.resource).toBeNull();
    expect(result.gaps).toHaveLength(1);
    const g = result.gaps[0]!;
    expect(g.why.kind).toBe("dynamic-value");
    // Gap created before className is known — identity is honestly absent
    expect(g.resource).toBeUndefined();
  });

  it("gap without identity survives conversion without fabrication", () => {
    const analysisGap = gap(
      "import resolution",
      { kind: "unresolved-import", path: "./missing", reason: "file not found" },
      "Check the import path.",
      { file: "/out/main.ts" },
      // No resource parameter — identity unknown
    );

    const catalogGap = analysisGapToCatalogGap(analysisGap);

    expect(catalogGap.kind).toBe("unresolved-import");
    expect(catalogGap.message).toBe("import resolution: Check the import path.");
    expect(catalogGap.resource).toBe("/out/main.ts");
    // Identity fields absent — not fabricated
    expect(catalogGap.resourceKind).toBeUndefined();
    expect(catalogGap.resourceName).toBeUndefined();
  });

  it("gap() factory produces valid gap without resource parameter", () => {
    const g = gap(
      "test",
      { kind: "parse-error", message: "unexpected token" },
      "Check syntax.",
    );

    expect(g.what).toBe("test");
    expect(g.why.kind).toBe("parse-error");
    expect(g.suggestion).toBe("Check syntax.");
    expect(g.resource).toBeUndefined();
    expect(g.where).toBeUndefined();
  });
});
