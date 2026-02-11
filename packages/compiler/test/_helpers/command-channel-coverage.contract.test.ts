import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

interface VectorEntry {
  name?: unknown;
  markup?: unknown;
  expect?: unknown;
}

interface RequiredVector {
  file: string;
  name: string;
  markupIncludes: string;
  assertExpect?: (expectValue: unknown, vector: { name: string; markup: string }) => void;
}

const CLASS_SEAM_VECTORS: RequiredVector[] = [
  {
    file: "packages/compiler/test/10-lower/basics.json",
    name: "LB-61 non-interpolation attribute commands preserve attr/to channel",
    markupIncludes: "active.class",
    assertExpect: (expectValue) => {
      const expectRecord = asRecord(expectValue);
      const commands = asArray(expectRecord.attributeCommands);
      expect(commands.length).toBeGreaterThanOrEqual(2);
      expect(asRecord(commands[0]).attr).toBe("class");
      expect(asRecord(commands[0]).to).toBe("active");
      expect(asRecord(commands[0]).command).toBe("bind");
      expect(asRecord(commands[0]).code).toBe("isActive");
    },
  },
  {
    file: "packages/compiler/test/20-link/attrs.json",
    name: "R-A-19b .class target preserved for active.class",
    markupIncludes: "active.class",
    assertExpect: (expectValue) => {
      const expectRecord = asRecord(expectValue);
      const items = asArray(expectRecord.items);
      expect(items.length).toBeGreaterThanOrEqual(1);
      const first = asRecord(items[0]);
      expect(first.kind).toBe("attr");
      expect(first.attr).toBe("class");
      expect(first.to).toBe("active");
      expect(first.target).toBe("native");
    },
  },
  {
    file: "packages/compiler/test/30-bind/bind-events-and-ref.json",
    name: "ER-06 class.prop binding in with overlay keeps expression semantics",
    markupIncludes: "active.class",
    assertExpect: (expectValue) => {
      const expectRecord = asRecord(expectValue);
      const exprs = asArray(expectRecord.exprs).map(asRecord);
      expect(exprs.some((expr) => expr.code === "active")).toBe(true);
      expect(exprs.some((expr) => expr.frame === "overlay:valueOverlay@1")).toBe(true);
    },
  },
  {
    file: "packages/compiler/test/40-typecheck/basics.json",
    name: "TC-B-04 active.class keeps identifier expression semantics",
    markupIncludes: "active.class",
    assertExpect: (expectValue) => {
      const expectRecord = asRecord(expectValue);
      const inferred = asArray(expectRecord.inferred).map(asRecord);
      const diags = asArray(expectRecord.diags).map(asRecord);
      expect(inferred.some((entry) => entry.code === "active")).toBe(true);
      expect(inferred.some((entry) => entry.type === "NonNullable<(RootVm)>['active']")).toBe(true);
      expect(diags.some((diag) => diag.code === "aurelia/expr-type-mismatch")).toBe(true);
    },
  },
];

const STYLE_SEAM_VECTORS: RequiredVector[] = [
  {
    file: "packages/compiler/test/10-lower/basics.json",
    name: "LB-04 style command + interpolation",
    markupIncludes: ".style",
    assertExpect: (expectValue) => {
      const expectRecord = asRecord(expectValue);
      const expressions = asArray(expectRecord.expressions).map(asRecord);
      expect(expressions.some((entry) => entry.command === "bind")).toBe(true);
      expect(expressions.some((entry) => entry.kind === "attrInterpolation")).toBe(true);
    },
  },
  {
    file: "packages/compiler/test/20-link/attrs.json",
    name: "R-A-19 style.prop with kebab CSS property",
    markupIncludes: ".style",
    assertExpect: (expectValue) => {
      const expectRecord = asRecord(expectValue);
      const items = asArray(expectRecord.items).map(asRecord);
      expect(items.some((entry) => entry.kind === "style")).toBe(true);
      expect(items.some((entry) => entry.to === "background-color")).toBe(true);
      expect(items.some((entry) => entry.target === "style")).toBe(true);
    },
  },
  {
    file: "packages/compiler/test/30-bind/bind-events-and-ref.json",
    name: "ER-03 style.prop binding in with overlay",
    markupIncludes: ".style",
    assertExpect: (expectValue) => {
      const expectRecord = asRecord(expectValue);
      const exprs = asArray(expectRecord.exprs).map(asRecord);
      expect(exprs.some((expr) => expr.code === "c")).toBe(true);
      expect(exprs.some((expr) => expr.frame === "overlay:valueOverlay@1")).toBe(true);
    },
  },
  {
    file: "packages/compiler/test/40-typecheck/basics.json",
    name: "TC-B-05 width.style keeps identifier expression semantics",
    markupIncludes: ".style",
    assertExpect: (expectValue) => {
      const expectRecord = asRecord(expectValue);
      const expected = asArray(expectRecord.expected).map(asRecord);
      const diags = asArray(expectRecord.diags).map(asRecord);
      expect(expected.some((entry) => entry.code === "width" && entry.type === "string")).toBe(true);
      expect(diags.some((diag) => diag.actual === "NonNullable<(RootVm)>['width']")).toBe(true);
    },
  },
];

describe("command-channel seam coverage contract", () => {
  test("class seam vectors are present across lower/link/bind/typecheck", () => {
    for (const vector of CLASS_SEAM_VECTORS) assertVectorExists(vector);
  });

  test("style seam vectors are present across lower/link/bind/typecheck", () => {
    for (const vector of STYLE_SEAM_VECTORS) assertVectorExists(vector);
  });
});

function assertVectorExists(vector: RequiredVector): void {
  const vectors = loadVectors(vector.file);
  const match = vectors.find((entry) => entry.name === vector.name);
  expect(match, `${vector.file}: missing required vector "${vector.name}"`).toBeDefined();
  expect(
    match?.markup?.includes(vector.markupIncludes),
    `${vector.file}: vector "${vector.name}" must include "${vector.markupIncludes}" in markup`
  ).toBe(true);
  vector.assertExpect?.(match?.expect, { name: match?.name ?? "", markup: match?.markup ?? "" });
}

function loadVectors(file: string): Array<{ name: string; markup: string; expect: unknown }> {
  const fullPath = path.resolve(process.cwd(), file);
  const payload = JSON.parse(fs.readFileSync(fullPath, "utf8")) as unknown;
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((entry): entry is VectorEntry => !!entry && typeof entry === "object")
    .map((entry) => ({
      name: typeof entry.name === "string" ? entry.name : "",
      markup: typeof entry.markup === "string" ? entry.markup : "",
      expect: entry.expect,
    }));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected object in vector contract assertion.");
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected array in vector contract assertion.");
  }
  return value;
}
