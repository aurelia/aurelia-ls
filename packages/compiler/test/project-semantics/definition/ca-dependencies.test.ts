import { describe, test, expect } from "vitest";

import { normalizePathForId, type NormalizedPath } from "../../../out/model/index.js";
import { unwrapSourced, type CustomAttributeDef, type Sourced } from "../../../out/schema/index.js";
import { buildCustomAttributeDef } from "../../../out/project-semantics/assemble/resource-def.js";
import { toAttrRes } from "../../../out/schema/convert.js";

const file = normalizePathForId("/repo/my-attribute.ts");

/**
 * Test pattern BL: CA type has dependencies.
 *
 * Construct a CustomAttributeDef with dependencies and verify the field
 * is accessible. This confirms the type change from R-CP1.
 */
describe("BL: CustomAttributeDef has dependencies field", () => {
  test("dependencies field is accessible on CustomAttributeDef", () => {
    const dep: Sourced<string> = { origin: "source", value: "MyDialog" };
    const def: CustomAttributeDef = {
      kind: "custom-attribute",
      name: { origin: "source", value: "if" },
      className: { origin: "source", value: "If" },
      aliases: [],
      noMultiBindings: { origin: "source", value: false },
      bindables: {},
      dependencies: [dep],
      file,
    };

    expect(def.dependencies).toHaveLength(1);
    expect(unwrapSourced(def.dependencies[0]!)).toBe("MyDialog");
  });
});

/**
 * Test pattern BM: builder populates dependencies.
 *
 * buildCustomAttributeDef with dependencies input produces Sourced<string>
 * entries. This verifies the builder actually populates the field (existence
 * without effect is the silent failure R-CP1 prevents).
 */
describe("BM: buildCustomAttributeDef populates dependencies", () => {
  test("dependencies are wrapped as Sourced values", () => {
    const def = buildCustomAttributeDef({
      name: "tooltip",
      className: "Tooltip",
      file,
      dependencies: ["MyDialog", "PopoverService"],
    });

    expect(def.dependencies).toHaveLength(2);
    expect(unwrapSourced(def.dependencies[0]!)).toBe("MyDialog");
    expect(unwrapSourced(def.dependencies[1]!)).toBe("PopoverService");
  });

  test("omitted dependencies default to empty array", () => {
    const def = buildCustomAttributeDef({
      name: "tooltip",
      className: "Tooltip",
      file,
    });

    expect(def.dependencies).toHaveLength(0);
  });
});

/**
 * Test pattern BN: conversion extracts dependencies.
 *
 * toAttrRes with a CustomAttributeDef that has dependencies produces an
 * AttrRes with unwrapped dependencies. This verifies the conversion path
 * that makes CA dependencies visible to scope analysis.
 */
describe("BN: toAttrRes extracts dependencies", () => {
  test("dependencies appear in AttrRes", () => {
    const def = buildCustomAttributeDef({
      name: "tooltip",
      className: "Tooltip",
      file,
      dependencies: ["MyDialog"],
    });

    const res = toAttrRes(def);
    expect(res.dependencies).toBeDefined();
    expect(res.dependencies).toEqual(["MyDialog"]);
  });

  test("empty dependencies are omitted from AttrRes", () => {
    const def = buildCustomAttributeDef({
      name: "tooltip",
      className: "Tooltip",
      file,
    });

    const res = toAttrRes(def);
    expect(res.dependencies).toBeUndefined();
  });
});
