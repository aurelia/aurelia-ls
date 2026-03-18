import { describe, expect, it } from "vitest";
import {
  GraphNodeStore,
  GraphRevisionClock,
  type ClaimNodeBase,
} from "../../out/graph/index.js";

function createResourceNode(
  overrides: Partial<ClaimNodeBase> = {},
): ClaimNodeBase {
  return {
    key: {
      keyKind: "resource",
      resourceKind: "custom-element",
      canonicalName: "app",
      ownerKey: null,
    },
    nodeKind: "resource-identity",
    familyTag: "claim.identity.custom-element",
    claimState: "holds",
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
    ...overrides,
  };
}

describe("semantic-authority graph node store", () => {
  it("stores and retrieves graph nodes by serialized node key", () => {
    const store = new GraphNodeStore();
    const node = createResourceNode();

    expect(store.has(node.key)).toBe(false);

    store.set(node);

    expect(store.has(node.key)).toBe(true);
    expect(store.get(node.key)).toBe(node);
    expect(Array.from(store.values())).toEqual([node]);
    expect(store.size).toBe(1);
  });

  it("stamps monotonic revision tokens on writes", () => {
    const store = new GraphNodeStore();
    const first = createResourceNode();
    const second = createResourceNode({
      key: {
        keyKind: "resource",
        resourceKind: "custom-attribute",
        canonicalName: "if",
        ownerKey: null,
      },
      nodeKind: "resource-identity",
      familyTag: "claim.identity.custom-attribute",
    });

    store.set(first);
    store.set(second);
    store.set(first);

    expect(first.revisionToken).toBe(3);
    expect(second.revisionToken).toBe(2);
    expect(store.currentRevisionToken).toBe(3);
  });

  it("supports node-kind guarded lookup", () => {
    const store = new GraphNodeStore();
    const node = createResourceNode();

    store.set(node);

    expect(store.getByNodeKind("resource-identity", node.key)).toBe(node);
    expect(store.getByNodeKind("completeness-witness", node.key)).toBeUndefined();
  });

  it("can share a revision clock with other graph stores", () => {
    const clock = new GraphRevisionClock();
    const store = new GraphNodeStore(clock);
    const node = createResourceNode();

    store.set(node);

    expect(node.revisionToken).toBe(1);
    expect(clock.currentRevisionToken).toBe(1);
  });

  it("deletes stored nodes by key", () => {
    const store = new GraphNodeStore();
    const node = createResourceNode();

    store.set(node);

    expect(store.delete(node.key)).toBe(true);
    expect(store.delete(node.key)).toBe(false);
    expect(store.get(node.key)).toBeUndefined();
    expect(store.size).toBe(0);
  });
});
