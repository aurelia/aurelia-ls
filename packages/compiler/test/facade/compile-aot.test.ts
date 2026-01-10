import { describe, test, expect } from "vitest";

import {
  compileAot,
  DEFAULT_SEMANTICS,
  prepareSemantics,
  buildTemplateSyntaxRegistry,
  createAttributeParserFromRegistry,
  materializeSemanticsForScope,
  INSTRUCTION_TYPE,
  BINDING_MODE,
  toSourceFileId,
} from "@aurelia-ls/compiler";

function hasSpan(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) {
    return value.some(hasSpan);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("span" in record) return true;
    return Object.values(record).some(hasSpan);
  }
  return false;
}

describe("compileAot facade", () => {
  test("strips spans by default and respects catalog overrides", () => {
    const sem = prepareSemantics(DEFAULT_SEMANTICS);
    const result = compileAot("<div>${msg}</div>", {
      semantics: DEFAULT_SEMANTICS,
      catalog: sem.catalog,
    });

    expect(result.template).toBe("<div><!--au--> </div>");
    expect(result.codeResult.definition.targetCount).toBe(1);
    expect(result.codeResult.definition.instructions[0]?.[0]?.type).toBe(
      INSTRUCTION_TYPE.textBinding
    );
    expect(result.codeResult.expressions.length).toBe(1);
    expect(hasSpan(result.codeResult.expressions[0]?.ast)).toBe(false);
  });

  test("retains spans when stripSpans is false", () => {
    const templatePath = "/app/template.html";
    const result = compileAot("<div>${msg}</div>", {
      semantics: DEFAULT_SEMANTICS,
      templatePath,
      stripSpans: false,
    });

    const expr = result.codeResult.expressions[0];
    expect(expr).toBeDefined();
    expect(hasSpan(expr?.ast)).toBe(true);
    expect(expr?.ast.span?.file).toBe(toSourceFileId(templatePath));
  });

  test("deduplicates expressions when enabled", () => {
    const markup = "<div>${msg}</div><div>${msg}</div>";
    const deduped = compileAot(markup, {
      semantics: DEFAULT_SEMANTICS,
      deduplicateExpressions: true,
    });
    const noDedup = compileAot(markup, {
      semantics: DEFAULT_SEMANTICS,
      deduplicateExpressions: false,
    });

    expect(deduped.codeResult.expressions.length).toBe(1);
    expect(noDedup.codeResult.expressions.length).toBe(2);
  });

  test("honors local imports and explicit syntax/attrParser overrides", () => {
    const localImports = [
      { name: "foo-bar", bindables: { value: { name: "value", mode: "toView" } } },
    ];
    const scopedSemantics = materializeSemanticsForScope(
      DEFAULT_SEMANTICS,
      null,
      null,
      localImports
    );
    const syntax = buildTemplateSyntaxRegistry(scopedSemantics);
    const attrParser = createAttributeParserFromRegistry(syntax);

    const result = compileAot("<foo-bar value.bind=\"msg\"></foo-bar>", {
      semantics: DEFAULT_SEMANTICS,
      localImports,
      syntax,
      attrParser,
    });

    const [hydrate] = result.codeResult.definition.instructions[0] ?? [];
    expect(hydrate?.type).toBe(INSTRUCTION_TYPE.hydrateElement);
    expect(hydrate?.res).toBe("foo-bar");
    expect(hydrate?.instructions?.[0]).toMatchObject({
      type: INSTRUCTION_TYPE.propertyBinding,
      to: "value",
      mode: BINDING_MODE.toView,
    });
    expect(result.template).toBe("<!--au--><foo-bar></foo-bar>");
  });
});
