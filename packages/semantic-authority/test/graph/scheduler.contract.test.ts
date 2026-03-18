import { describe, expect, it } from "vitest";
import {
  GraphPullScheduler,
  type GraphPullExecutor,
  type GraphPullResult,
} from "../../out/graph/index.js";

function createNodeKey(canonicalName: string) {
  return {
    keyKind: "resource" as const,
    resourceKind: "custom-element" as const,
    canonicalName,
    ownerKey: null,
  };
}

function createResult(canonicalName: string): GraphPullResult {
  return {
    cutoffAppliedNodeKeys: [],
    node: {
      key: createNodeKey(canonicalName),
      nodeKind: "resource-identity",
      familyTag: "claim.identity.custom-element",
      claimState: "holds",
      validityState: "valid",
      revisionToken: 1,
      retentionTier: "warm",
    },
    propagatedChanges: null,
    status: "pulled",
  };
}

function labelNodeKey(nodeKey: Parameters<GraphPullExecutor["pullNode"]>[0]): string {
  return nodeKey.keyKind === "resource" ? nodeKey.canonicalName : JSON.stringify(nodeKey);
}

describe("semantic-authority graph pull scheduler", () => {
  it("prioritizes cursor-time requests ahead of queued background work", async () => {
    const order: string[] = [];
    let yieldCount = 0;
    let injected = false;
    let scheduler!: GraphPullScheduler;
    const executor: GraphPullExecutor = {
      async pullNode(nodeKey) {
        order.push(labelNodeKey(nodeKey));
        return createResult(labelNodeKey(nodeKey));
      },
    };

    scheduler = new GraphPullScheduler({
      pullExecutor: executor,
      yieldAfterTaskCount: 1,
      yieldControl: async () => {
        yieldCount += 1;
        if (!injected) {
          injected = true;
          void scheduler.requestCursorTime(createNodeKey("cursor"));
        }
      },
    });

    const first = scheduler.requestBackground(createNodeKey("background-a"));
    const second = scheduler.requestBackground(createNodeKey("background-b"));

    await Promise.all([first, second]);

    expect(order).toEqual(["background-a", "cursor", "background-b"]);
    expect(yieldCount).toBeGreaterThanOrEqual(1);
  });

  it("treats file-save requests above background work", async () => {
    const order: string[] = [];
    let injected = false;
    let scheduler!: GraphPullScheduler;
    const executor: GraphPullExecutor = {
      async pullNode(nodeKey) {
        order.push(labelNodeKey(nodeKey));
        return createResult(labelNodeKey(nodeKey));
      },
    };

    scheduler = new GraphPullScheduler({
      pullExecutor: executor,
      yieldAfterTaskCount: 1,
      yieldControl: async () => {
        if (!injected) {
          injected = true;
          void scheduler.requestFileSave(createNodeKey("file-save"));
        }
      },
    });

    const first = scheduler.requestBackground(createNodeKey("background-a"));
    const second = scheduler.requestBackground(createNodeKey("background-b"));

    await Promise.all([first, second]);

    expect(order).toEqual(["background-a", "file-save", "background-b"]);
  });

  it("cooperatively yields after the configured task threshold", async () => {
    let yieldCount = 0;
    const executor: GraphPullExecutor = {
      async pullNode(nodeKey) {
        return createResult(labelNodeKey(nodeKey));
      },
    };

    const scheduler = new GraphPullScheduler({
      pullExecutor: executor,
      yieldAfterTaskCount: 1,
      yieldControl: async () => {
        yieldCount += 1;
      },
    });

    await Promise.all([
      scheduler.requestBackground(createNodeKey("a")),
      scheduler.requestBackground(createNodeKey("b")),
    ]);

    expect(yieldCount).toBeGreaterThanOrEqual(1);
  });

  it("promotes queued requests for the same node to the higher priority without duplicating execution", async () => {
    const order: string[] = [];
    const executor: GraphPullExecutor = {
      async pullNode(nodeKey) {
        order.push(labelNodeKey(nodeKey));
        return createResult(labelNodeKey(nodeKey));
      },
    };

    const scheduler = new GraphPullScheduler({
      pullExecutor: executor,
      yieldAfterTaskCount: 1,
      yieldControl: async () => undefined,
    });

    const background = scheduler.requestBackground(createNodeKey("same-node"));
    const cursor = scheduler.requestCursorTime(createNodeKey("same-node"));

    const [backgroundResult, cursorResult] = await Promise.all([background, cursor]);

    expect(order).toEqual(["same-node"]);
    expect(backgroundResult.node?.key).toEqual(cursorResult.node?.key);
  });

  it("supports background pre-evaluation batches", async () => {
    const order: string[] = [];
    const executor: GraphPullExecutor = {
      async pullNode(nodeKey) {
        order.push(labelNodeKey(nodeKey));
        return createResult(labelNodeKey(nodeKey));
      },
    };

    const scheduler = new GraphPullScheduler({
      pullExecutor: executor,
    });

    const results = await scheduler.scheduleBackgroundPreEvaluation([
      createNodeKey("hot-a"),
      createNodeKey("hot-b"),
    ]);

    expect(order).toEqual(["hot-a", "hot-b"]);
    expect(results).toHaveLength(2);
    expect(scheduler.queuedTaskCount).toBe(0);
  });
});
