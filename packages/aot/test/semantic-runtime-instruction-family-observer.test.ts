import { describe, expect, it } from "vitest";

import type { RuntimeExpressionAstValue } from "@aurelia-ls/semantic-runtime/browser-template";
import { canonicalCompilerJson } from "../src/testing/compiler-canonical-data.js";
import { normalizeSemanticRuntimeExpressionAstForObservation } from "../src/testing/semantic-runtime-instruction-family-observer.js";

describe("semantic runtime-instruction family observer", () => {
  it("retains tagged-template cooked and raw strings as canonical plain data", () => {
    const first = taggedTemplate(["line\n", ""], ["line\\n", ""]);
    const rawMutation = taggedTemplate(["line\n", ""], ["changed-raw", ""]);

    const normalized = normalizeSemanticRuntimeExpressionAstForObservation(first);
    const normalizedMutation = normalizeSemanticRuntimeExpressionAstForObservation(rawMutation);

    expect(normalized).toMatchObject({
      $kind: "TaggedTemplate",
      cooked: {
        kind: "tagged-template-cooked",
        cooked: ["line\n", ""],
        raw: ["line\\n", ""],
      },
    });
    expect(canonicalCompilerJson(normalizedMutation)).not.toBe(canonicalCompilerJson(normalized));
  });
});

function taggedTemplate(
  cookedValues: readonly string[],
  rawValues: readonly string[],
): RuntimeExpressionAstValue {
  const cooked: string[] & { raw?: readonly string[] } = [...cookedValues];
  cooked.raw = [...rawValues];
  return {
    $kind: "TaggedTemplate",
    cooked,
    func: { $kind: "AccessScope", name: "tag", ancestor: 0 },
    expressions: [{ $kind: "AccessScope", name: "value", ancestor: 0 }],
  };
}
