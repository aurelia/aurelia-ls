import { describe, it, expect } from "vitest";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { AnalyzableValue, LexicalScope } from "../../src/analysis/value/types.js";
import type { ExportBindingMap } from "../../src/binding/types.js";
import { evaluateFileFacts } from "../../src/analysis/index.js";
import { emptyFileFacts } from "../../src/extraction/file-facts.js";

function createScope(path: NormalizedPath): LexicalScope {
  return {
    bindings: new Map(),
    imports: new Map(),
    parent: null,
    filePath: path,
  };
}

describe("partial evaluation failure handling", () => {
  it("records analysis-failed gap and preserves raw facts when evaluation throws", () => {
    const path = "/src/bad.ts" as NormalizedPath;
    const scope = createScope(path);
    const badValue = { kind: "corrupt" } as unknown as AnalyzableValue;

    const fileFacts = {
      ...emptyFileFacts(path, scope),
      variables: [
        {
          name: "bad",
          kind: "const" as const,
          initializer: badValue,
          isExported: false,
          span: { start: 0, end: 1 },
        },
      ],
    };

    const facts = new Map<NormalizedPath, typeof fileFacts>([[path, fileFacts]]);
    const exportBindings = new Map() as ExportBindingMap;

    const result = evaluateFileFacts(facts, exportBindings, { packagePath: "/pkg" });

    expect(result.gaps.some((gap) => gap.why.kind === "analysis-failed")).toBe(true);
    expect(result.files.get(path)?.gaps.some((gap) => gap.why.kind === "analysis-failed")).toBe(true);
    expect(result.facts.get(path)?.variables[0]?.initializer).toBe(badValue);
  });
});
