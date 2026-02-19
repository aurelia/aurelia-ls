import { describe, test, expect } from "vitest";

import type { ExprId, FrameId, ScopeFrame, ScopeTemplate, FrameOrigin } from "@aurelia-ls/compiler";
import { buildScopeLookup } from "../../src/analysis/shared/scope-lookup.js";

/**
 * Test pattern BH: canonical ScopeFrame fields flow through buildScopeLookup.
 *
 * After R8 unified the workspace on the canonical ScopeFrame type, the wider
 * type carries `origin` and `kind` fields. This verifies that buildScopeLookup
 * preserves origin on frames retrieved by ID — the canonical type's data
 * actually flows through the scope lookup infrastructure.
 */
describe("buildScopeLookup preserves canonical ScopeFrame fields", () => {
  const rootFrame: ScopeFrame = {
    id: 0 as FrameId,
    parent: null,
    kind: "root",
    symbols: [],
  };

  const iteratorOrigin: FrameOrigin = {
    kind: "iterator",
    forOfAstId: "expr:items" as ExprId,
    controller: "repeat",
  };

  const childFrame: ScopeFrame = {
    id: 1 as FrameId,
    parent: 0 as FrameId,
    kind: "overlay",
    symbols: [{ kind: "iteratorLocal", name: "item" }],
    origin: iteratorOrigin,
  };

  const template: ScopeTemplate = {
    frames: [rootFrame, childFrame],
    root: 0 as FrameId,
    exprToFrame: {},
  };

  test("frame retrieved by ID retains origin", () => {
    const lookup = buildScopeLookup(template);
    const retrieved = lookup.byId.get(1 as FrameId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.origin).toBeDefined();
    expect(retrieved!.origin!.kind).toBe("iterator");
    expect((retrieved!.origin as Extract<FrameOrigin, { kind: "iterator" }>).controller).toBe("repeat");
  });

  test("frame retrieved by ID retains kind field", () => {
    const lookup = buildScopeLookup(template);
    const root = lookup.byId.get(0 as FrameId);
    const child = lookup.byId.get(1 as FrameId);
    expect(root!.kind).toBe("root");
    expect(child!.kind).toBe("overlay");
  });

  test("root frame without origin has undefined origin", () => {
    const lookup = buildScopeLookup(template);
    const root = lookup.byId.get(0 as FrameId);
    expect(root!.origin).toBeUndefined();
  });
});
