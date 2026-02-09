import { describe, expect, test } from "vitest";

import type { Sourced } from "../../src/schema/types.js";
import { sanitizeSourcedSnapshotValue, stripSourcedNode, unwrapSourced } from "../../src/schema/sourced.js";

describe("schema sourced helpers", () => {
  test("unwrapSourced handles known/unknown source states", () => {
    const builtin: Sourced<string> = { origin: "builtin", value: "builtin" };
    const config: Sourced<string> = {
      origin: "config",
      value: "config",
      location: { file: "/app/config.ts", pos: 1, end: 2 },
    };
    const sourceKnown: Sourced<string> = { origin: "source", state: "known", value: "source" };
    const sourceUnknown: Sourced<string> = { origin: "source", state: "unknown" };

    expect(unwrapSourced(builtin)).toBe("builtin");
    expect(unwrapSourced(config)).toBe("config");
    expect(unwrapSourced(sourceKnown)).toBe("source");
    expect(unwrapSourced(sourceUnknown)).toBeUndefined();
  });

  test("stripSourcedNode only strips source envelopes", () => {
    const sourceWithNode: Sourced<string> = {
      origin: "source",
      state: "known",
      value: "x",
      node: { kind: "ts-node" } as unknown as never,
    };
    const builtinWithNode = { origin: "builtin", value: "x", node: { keep: true } } as unknown as Sourced<string>;

    expect(stripSourcedNode(sourceWithNode)).toBe(true);
    expect("node" in sourceWithNode).toBe(false);
    expect(stripSourcedNode(builtinWithNode)).toBe(false);
    expect("node" in builtinWithNode).toBe(true);
  });

  test("sanitizeSourcedSnapshotValue strips node only from source-origin envelopes", () => {
    const value = {
      sourceKnown: { origin: "source", state: "known", value: "a", node: { drop: true } },
      sourceUnknown: { origin: "source", state: "unknown", node: { drop: true } },
      nonSource: { origin: "builtin", value: "b", node: { keep: true } },
      nested: [{ origin: "source", state: "known", value: "c", node: { drop: true } }],
    };

    const sanitized = sanitizeSourcedSnapshotValue(value) as typeof value;
    expect("node" in sanitized.sourceKnown).toBe(false);
    expect("node" in sanitized.sourceUnknown).toBe(false);
    expect("node" in sanitized.nonSource).toBe(true);
    expect("node" in sanitized.nested[0]!).toBe(false);
  });
});
