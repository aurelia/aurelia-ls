/**
 * Transform edge case tests.
 *
 * Focus: error paths + options that change transform semantics.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../../src/transform/index.js";
import { TransformError, TransformErrorCode } from "../../src/transform/types.js";
import { loadFixture } from "../fixtures/index.js";
import type { AotCodeResult, ExprId } from "@aurelia-ls/compiler";

function createAot(name: string, withExpression = false): AotCodeResult {
  return {
    definition: {
      name,
      instructions: [],
      nestedTemplates: [],
    },
    expressions: withExpression
      ? [
          {
            id: "expr0" as ExprId,
            ast: { $kind: "AccessScope", name: "message", ancestor: 0 } as any,
          },
        ]
      : [],
    mapping: [],
  };
}

describe("transform edge cases", () => {
  it("throws when the target class is missing", () => {
    const source = loadFixture("decorator-simple");

    expect(() => {
      transform({
        source,
        filePath: "missing-class.ts",
        aot: createAot("missing-class"),
        resource: { kind: "custom-element", name: "missing-class", className: "MissingClass" },
        template: "<div></div>",
      });
    }).toThrow(TransformError);

    try {
      transform({
        source,
        filePath: "missing-class.ts",
        aot: createAot("missing-class"),
        resource: { kind: "custom-element", name: "missing-class", className: "MissingClass" },
        template: "<div></div>",
      });
    } catch (error) {
      const err = error as TransformError;
      expect(err.code).toBe(TransformErrorCode.CLASS_NOT_FOUND);
      expect(err.file).toBe("missing-class.ts");
    }
  });

  it("preserves decorators when removeDecorators is false", () => {
    const source = loadFixture("decorator-simple");

    const result = transform({
      source,
      filePath: "decorator-simple.ts",
      aot: createAot("my-element"),
      resource: { kind: "custom-element", name: "my-element", className: "MyElement" },
      template: "<div>${message}</div>",
      removeDecorators: false,
    });

    expect(result.code).toContain("@customElement");
    expect(result.code).toContain('import { customElement } from "aurelia"');
    expect(result.code).toContain("static $au = myElement_$au;");
  });

  it("replaces existing static $au definitions", () => {
    const source = loadFixture("static-au");

    const result = transform({
      source,
      filePath: "static-au.ts",
      aot: createAot("status-badge"),
      resource: { kind: "custom-element", name: "status-badge", className: "StatusBadge" },
      template: "<div>${status}</div>",
    });

    expect(result.code).toContain("static $au = statusBadge_$au;");
    expect(result.code).toContain('template: "<div>${status}</div>"');
    expect(result.code).not.toContain('template: "<span class=\\"badge\\">${status}</span>"');
  });

  it("keeps dynamic dependencies from decorator config", () => {
    const source = `
import { customElement } from "aurelia";
import { Foo } from "./foo";

const extra = [Foo];
const registry = (name: string) => name;

@customElement({ name: "dep-case", dependencies: [Foo, registry("bar"), ...extra] })
export class DepCase {}
`.trim();

    const result = transform({
      source,
      filePath: "dep-case.ts",
      aot: createAot("dep-case"),
      resource: { kind: "custom-element", name: "dep-case", className: "DepCase" },
      template: "<div></div>",
    });

    expect(result.code).toContain('dependencies: [Foo, registry("bar"), ...extra]');
  });

  it("suppresses expression comments and warns about source maps", () => {
    const source = loadFixture("decorator-simple");

    const result = transform({
      source,
      filePath: "decorator-simple.ts",
      aot: createAot("my-element", true),
      resource: { kind: "custom-element", name: "my-element", className: "MyElement" },
      template: "<div>${message}</div>",
      includeComments: false,
      sourceMap: true,
    });

    expect(result.code).toContain("const myElement__e = [");
    expect(result.code).not.toContain("/* 0 */");
    expect(result.warnings.some((w) => w.code === "TRANSFORM_SOURCEMAP_NOT_IMPLEMENTED")).toBe(true);
  });
});
