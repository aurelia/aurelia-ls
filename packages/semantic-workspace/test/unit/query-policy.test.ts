import { describe, expect, it } from "vitest";
import { asDocumentUri, type DocumentUri } from "@aurelia-ls/compiler";
import { mergeTieredLocations, mergeTieredLocationsWithIds } from "../../src/query-policy.js";
import type { WorkspaceLocation } from "../../src/types.js";

function location(
  uri: DocumentUri,
  start: number,
  end: number,
  ids?: Pick<WorkspaceLocation, "symbolId" | "exprId" | "nodeId">,
): WorkspaceLocation {
  return {
    uri,
    span: { start, end, file: String(uri) },
    ...(ids?.symbolId ? { symbolId: ids.symbolId } : {}),
    ...(ids?.exprId ? { exprId: ids.exprId } : {}),
    ...(ids?.nodeId ? { nodeId: ids.nodeId } : {}),
  };
}

describe("query policy", () => {
  const current = asDocumentUri("file:///workspace/src/current.html");
  const other = asDocumentUri("file:///workspace/src/other.html");

  it("orders by semantic tier before current-file and canonical tie-breaks", () => {
    const merged = mergeTieredLocations(current, [
      { tier: "base", items: [location(current, 20, 25)] },
      { tier: "local", items: [location(current, 10, 15)] },
      { tier: "meta", items: [location(other, 1, 5)] },
      { tier: "resource", items: [location(other, 2, 6)] },
    ]);

    expect(merged).toHaveLength(4);
    expect(merged[0]?.uri).toBe(other);
    expect(merged[0]?.span.start).toBe(1);
    expect(merged[1]?.uri).toBe(current);
    expect(merged[1]?.span.start).toBe(10);
    expect(merged[2]?.uri).toBe(other);
    expect(merged[2]?.span.start).toBe(2);
    expect(merged[3]?.uri).toBe(current);
    expect(merged[3]?.span.start).toBe(20);
  });

  it("dedupes same-span hits by preferring higher semantic tier", () => {
    const merged = mergeTieredLocations(current, [
      { tier: "base", items: [location(current, 40, 48)] },
      { tier: "local", items: [location(current, 40, 48)] },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.uri).toBe(current);
    expect(merged[0]?.span.start).toBe(40);
  });

  it("drops id-less duplicates when a symbol-aware hit exists at the same span", () => {
    const merged = mergeTieredLocationsWithIds(current, [
      { tier: "local", items: [location(current, 60, 66)] },
      { tier: "base", items: [location(current, 60, 66, { symbolId: "sym:abc" as WorkspaceLocation["symbolId"] })] },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.symbolId).toBe("sym:abc");
  });

  it("keeps multiple symbol-aware entries for the same span in deterministic id order", () => {
    const merged = mergeTieredLocationsWithIds(current, [
      {
        tier: "resource",
        items: [
          location(current, 80, 84, { symbolId: "sym:z" as WorkspaceLocation["symbolId"] }),
          location(current, 80, 84, { symbolId: "sym:a" as WorkspaceLocation["symbolId"] }),
        ],
      },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]?.symbolId).toBe("sym:a");
    expect(merged[1]?.symbolId).toBe("sym:z");
  });
});
