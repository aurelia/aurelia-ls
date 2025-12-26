/**
 * Transform Package - Emit Tests
 *
 * Tests for JavaScript source generation.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
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
    assert.strictEqual(escapeString('hello "world"'), 'hello \\"world\\"');
  });

  it("escapes backslashes", () => {
    assert.strictEqual(escapeString("path\\to\\file"), "path\\\\to\\\\file");
  });

  it("escapes newlines", () => {
    assert.strictEqual(escapeString("line1\nline2"), "line1\\nline2");
  });

  it("escapes tabs", () => {
    assert.strictEqual(escapeString("col1\tcol2"), "col1\\tcol2");
  });
});

describe("toIdentifierPrefix", () => {
  it("converts kebab-case to camelCase", () => {
    assert.strictEqual(toIdentifierPrefix("my-app"), "myApp");
    assert.strictEqual(toIdentifierPrefix("user-profile-card"), "userProfileCard");
  });

  it("preserves single words (lowercased)", () => {
    assert.strictEqual(toIdentifierPrefix("counter"), "counter");
  });

  it("converts PascalCase to camelCase", () => {
    assert.strictEqual(toIdentifierPrefix("MyApp"), "myApp");
    assert.strictEqual(toIdentifierPrefix("Counter"), "counter");
  });
});

describe("formatValue", () => {
  it("formats strings", () => {
    assert.strictEqual(formatValue("hello"), '"hello"');
  });

  it("formats numbers", () => {
    assert.strictEqual(formatValue(42), "42");
    assert.strictEqual(formatValue(3.14), "3.14");
  });

  it("formats booleans", () => {
    assert.strictEqual(formatValue(true), "true");
    assert.strictEqual(formatValue(false), "false");
  });

  it("formats null and undefined", () => {
    assert.strictEqual(formatValue(null), "null");
    assert.strictEqual(formatValue(undefined), "undefined");
  });

  it("formats simple arrays", () => {
    assert.strictEqual(formatValue([1, 2, 3]), "[1, 2, 3]");
  });

  it("formats simple objects", () => {
    const result = formatValue({ a: 1, b: 2 });
    assert.ok(result.includes("a: 1"));
    assert.ok(result.includes("b: 2"));
  });
});

describe("emitExpressionTable", () => {
  it("emits empty array for no expressions", () => {
    const result = emitExpressionTable([], { prefix: "myApp" });
    assert.strictEqual(result, "const myApp__e = [];");
  });

  it("emits expression with kind comment", () => {
    const expressions = [mockExpr("e1", "AccessScope", "message")];
    const result = emitExpressionTable(expressions, { prefix: "myApp" });
    assert.ok(result.includes("const myApp__e = ["));
    assert.ok(result.includes("AccessScope"));
  });

  it("can strip spans from AST", () => {
    const expressions = [mockExpr("e1", "AccessScope", "x")];
    const result = emitExpressionTable(expressions, { prefix: "test", stripSpans: true });
    assert.ok(!result.includes('"start"'));
    assert.ok(!result.includes('"end"'));
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

    assert.ok(result.expressionTable.includes("myElement__e"));
    assert.ok(result.mainDefinition.includes("myElement_$au"));
    assert.ok(result.combined.includes('template: "'));
    assert.ok(result.combined.includes('needsCompile: false'));
    assert.strictEqual(result.prefix, "myElement");
    assert.strictEqual(result.expressionTableVar, "myElement__e");
    assert.strictEqual(result.definitionVar, "myElement_$au");
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

    assert.ok(result.nestedDefinitions.length > 0);
    assert.ok(result.combined.includes("__def"));
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

    assert.ok(result.mainDefinition.includes("dependencies: [ChildA, ChildB]"));
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

    assert.ok(!result.mainDefinition.includes("dependencies"));
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

    assert.ok(result.mainDefinition.includes("bindables:"));
    assert.ok(result.mainDefinition.includes("value: { mode: 6 }"));
    assert.ok(result.mainDefinition.includes("label: {}"));
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

    assert.ok(result.mainDefinition.includes("value: { primary: true }"));
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

    assert.ok(!result.mainDefinition.includes("bindables"));
  });
});

describe("hasEmittableContent", () => {
  it("returns false for empty AOT", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef(""),
      mapping: [],
    };
    assert.strictEqual(hasEmittableContent(aot), false);
  });

  it("returns true when there are expressions", () => {
    const aot: AotCodeResult = {
      expressions: [mockExpr("e0", "AccessScope", "x")],
      definition: mockDef(""),
      mapping: [],
    };
    assert.strictEqual(hasEmittableContent(aot), true);
  });

  it("returns true when there are instructions", () => {
    const aot: AotCodeResult = {
      expressions: [],
      definition: mockDef("", [[]]),
      mapping: [],
    };
    assert.strictEqual(hasEmittableContent(aot), true);
  });
});

describe("generateAuAssignment", () => {
  it("generates assignment statement", () => {
    assert.strictEqual(
      generateAuAssignment("MyApp", "myApp"),
      "MyApp.$au = myApp_$au;"
    );
  });

  it("derives prefix from class name", () => {
    assert.strictEqual(
      generateAuAssignment("MyApp"),
      "MyApp.$au = myApp_$au;"
    );
  });
});
