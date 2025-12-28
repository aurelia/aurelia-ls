/**
 * Transform Package - Emit Tests
 *
 * Tests for JavaScript source generation.
 */

import { describe, it, expect } from "vitest";
import {
  emitStaticAu,
  emitExpressionTable,
  hasEmittableContent,
  generateAuAssignment,
  escapeString,
  toIdentifierPrefix,
  formatValue,
} from "@aurelia-ls/transform";
import type { AotCodeResult, SerializedExpression, SerializedDefinition, ExprId, AnyBindingExpression } from "@aurelia-ls/compiler";

// Helper to create mock expressions
function mockExpr(id: string, kind: string, name: string): SerializedExpression {
  return {
    id: id as ExprId,
    ast: { $kind: kind, name, ancestor: 0, span: { start: 0, end: 1, loc: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } } } as unknown as AnyBindingExpression,
  };
}

// Helper to create mock definition
function mockDef(name: string, instructions: unknown[][] = [], nestedTemplates: unknown[] = []): SerializedDefinition {
  return {
    name,
    instructions: instructions as SerializedDefinition["instructions"],
    nestedTemplates: nestedTemplates as SerializedDefinition["nestedTemplates"],
    targetCount: 0,
  };
}

describe("escapeString", () => {
  it("escapes double quotes", () => {
    expect(escapeString('hello "world"')).toBe('hello \\"world\\"');
  });

  it("escapes backslashes", () => {
    expect(escapeString("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  it("escapes newlines", () => {
    expect(escapeString("line1\nline2")).toBe("line1\\nline2");
  });

  it("escapes tabs", () => {
    expect(escapeString("col1\tcol2")).toBe("col1\\tcol2");
  });
});

describe("toIdentifierPrefix", () => {
  it("converts kebab-case to camelCase", () => {
    expect(toIdentifierPrefix("my-app")).toBe("myApp");
    expect(toIdentifierPrefix("user-profile-card")).toBe("userProfileCard");
  });

  it("preserves single words (lowercased)", () => {
    expect(toIdentifierPrefix("counter")).toBe("counter");
  });

  it("converts PascalCase to camelCase", () => {
    expect(toIdentifierPrefix("MyApp")).toBe("myApp");
    expect(toIdentifierPrefix("Counter")).toBe("counter");
  });
});

describe("formatValue", () => {
  it("formats strings", () => {
    expect(formatValue("hello")).toBe('"hello"');
  });

  it("formats numbers", () => {
    expect(formatValue(42)).toBe("42");
    expect(formatValue(3.14)).toBe("3.14");
  });

  it("formats booleans", () => {
    expect(formatValue(true)).toBe("true");
    expect(formatValue(false)).toBe("false");
  });

  it("formats null and undefined", () => {
    expect(formatValue(null)).toBe("null");
    expect(formatValue(undefined)).toBe("undefined");
  });

  it("formats simple arrays", () => {
    expect(formatValue([1, 2, 3])).toBe("[1, 2, 3]");
  });

  it("formats simple objects", () => {
    const result = formatValue({ a: 1, b: 2 });
    expect(result).toContain("a: 1");
    expect(result).toContain("b: 2");
  });
});

describe("emitExpressionTable", () => {
  it("emits empty array for no expressions", () => {
    const result = emitExpressionTable([], { prefix: "myApp" });
    expect(result).toBe("const myApp__e = [];");
  });

  it("emits expression with kind comment", () => {
    const expressions = [mockExpr("e1", "AccessScope", "message")];
    const result = emitExpressionTable(expressions, { prefix: "myApp" });
    expect(result).toContain("const myApp__e = [");
    expect(result).toContain("AccessScope");
  });

  it("can strip spans from AST", () => {
    const expressions = [mockExpr("e1", "AccessScope", "x")];
    const result = emitExpressionTable(expressions, { prefix: "test", stripSpans: true });
    expect(result).not.toContain('"start"');
    expect(result).not.toContain('"end"');
  });
});

describe("emitStaticAu", () => {
  it("emits complete artifact for simple element", () => {
    const aot: AotCodeResult = {
      expressions: [mockExpr("e0", "AccessScope", "message")],
      definition: mockDef("my-element", [
        [{ type: "textBinding", parts: ["", ""], exprIds: ["e0" as ExprId] }],
      ]),
      mapping: [],
    };

    const result = emitStaticAu(aot, {
      name: "my-element",
      className: "MyElement",
      type: "custom-element",
      template: "<div>${message}</div>",
    });

    expect(result.expressionTable).toContain("myElement__e");
    expect(result.mainDefinition).toContain("myElement_$au");
    expect(result.combined).toContain('template: "');
    expect(result.combined).toContain('needsCompile: false');
    expect(result.prefix).toBe("myElement");
    expect(result.expressionTableVar).toBe("myElement__e");
    expect(result.definitionVar).toBe("myElement_$au");
  });

  it("includes nested definitions for template controllers", () => {
    const aot: AotCodeResult = {
      expressions: [mockExpr("e0", "AccessScope", "show")],
      definition: mockDef("conditional", [
        [{
          type: "hydrateTemplateController",
          resource: "if",
          templateIndex: 0,
          instructions: [{ type: "propertyBinding", to: "value", exprId: "e0" as ExprId, mode: "toView" }],
        }],
      ], [mockDef("(anonymous)")]),
      mapping: [],
    };

    const result = emitStaticAu(aot, {
      name: "conditional",
      className: "Conditional",
      type: "custom-element",
      template: '<template if.bind="show">Visible</template>',
    });

    expect(result.nestedDefinitions.length > 0).toBe(true);
    expect(result.combined).toContain("__def");
  });

  it("includes dependencies in definition", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef("parent"),
      mapping: [],
    };

    const result = emitStaticAu(aot, {
      name: "parent",
      className: "Parent",
      type: "custom-element",
      template: "<child-a></child-a>",
      dependencies: ["ChildA", "ChildB"],
    });

    expect(result.mainDefinition).toContain("dependencies: [ChildA, ChildB]");
  });

  it("omits dependencies when empty", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef("simple"),
      mapping: [],
    };

    const result = emitStaticAu(aot, {
      name: "simple",
      className: "Simple",
      type: "custom-element",
      template: "<div>Hello</div>",
      dependencies: [],
    });

    expect(result.mainDefinition).not.toContain("dependencies");
  });

  it("includes bindables in definition", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef("form-input"),
      mapping: [],
    };

    const result = emitStaticAu(aot, {
      name: "form-input",
      className: "FormInput",
      type: "custom-element",
      template: "<input>",
      bindables: [
        { name: "value", mode: 6 },
        { name: "label" },
      ],
    });

    expect(result.mainDefinition).toContain("bindables:");
    expect(result.mainDefinition).toContain("value: { mode: 6 }");
    expect(result.mainDefinition).toContain("label: {}");
  });

  it("includes bindable with primary option", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef("my-comp"),
      mapping: [],
    };

    const result = emitStaticAu(aot, {
      name: "my-comp",
      className: "MyComp",
      type: "custom-element",
      template: "<div></div>",
      bindables: [{ name: "value", primary: true }],
    });

    expect(result.mainDefinition).toContain("value: { primary: true }");
  });

  it("omits bindables when empty", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef("simple"),
      mapping: [],
    };

    const result = emitStaticAu(aot, {
      name: "simple",
      className: "Simple",
      type: "custom-element",
      template: "<div>Hello</div>",
      bindables: [],
    });

    expect(result.mainDefinition).not.toContain("bindables");
  });
});

describe("hasEmittableContent", () => {
  it("returns false for empty AOT", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef(""),
      mapping: [],
    };
    expect(hasEmittableContent(aot)).toBe(false);
  });

  it("returns true when there are expressions", () => {
    const aot: AotCodeResult = {
      expressions: [mockExpr("e0", "AccessScope", "x")],
      definition: mockDef(""),
      mapping: [],
    };
    expect(hasEmittableContent(aot)).toBe(true);
  });

  it("returns true when there are instructions", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef("", [[]]),
      mapping: [],
    };
    expect(hasEmittableContent(aot)).toBe(true);
  });
});

describe("generateAuAssignment", () => {
  it("generates assignment statement", () => {
    expect(generateAuAssignment("MyApp", "myApp")).toBe("MyApp.$au = myApp_$au;");
  });

  it("derives prefix from class name", () => {
    expect(generateAuAssignment("MyApp")).toBe("MyApp.$au = myApp_$au;");
  });
});
