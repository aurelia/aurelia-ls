import { describe, test, expect, vi } from "vitest";
import type { ClientContext } from "../../out/core/context.js";
import type { FeatureModule } from "../../out/core/feature-graph.js";
import { FeatureGraph } from "../../out/core/feature-graph.js";

function createStubContext(): ClientContext {
  const debug = { channel: () => () => {} };
  const trace = {
    span: (_name: string, fn: () => void) => fn(),
    spanAsync: async (_name: string, fn: () => Promise<unknown>) => fn(),
  };
  const errors = {
    report: vi.fn(),
    guard: (_label: string, fn: () => void) => {
      fn();
      return { ok: true, value: undefined };
    },
    capture: async (_label: string, fn: () => Promise<unknown>) => {
      const value = await fn();
      return { ok: true, value };
    },
  };

  return { debug, trace, errors } as unknown as ClientContext;
}

describe("FeatureGraph", () => {
  test("activates features in dependency order", async () => {
    const ctx = createStubContext();
    const calls: string[] = [];
    const featureA: FeatureModule = { id: "feature.a", activate: () => calls.push("a") };
    const featureB: FeatureModule = { id: "feature.b", requires: ["feature.a"], activate: () => calls.push("b") };

    const graph = new FeatureGraph();
    graph.register(featureB, featureA);
    await graph.activateAll(ctx);

    expect(calls).toEqual(["a", "b"]);
    expect(graph.getStatus("feature.a")?.state).toBe("active");
    expect(graph.getStatus("feature.b")?.state).toBe("active");
  });

  test("blocks features when dependencies are disabled", async () => {
    const ctx = createStubContext();
    const featureA: FeatureModule = {
      id: "feature.a",
      isEnabled: () => false,
      activate: () => {},
    };
    const featureB: FeatureModule = {
      id: "feature.b",
      requires: ["feature.a"],
      activate: () => {},
    };

    const graph = new FeatureGraph();
    graph.register(featureA, featureB);
    await graph.activateAll(ctx);

    expect(graph.getStatus("feature.a")?.state).toBe("disabled");
    const statusB = graph.getStatus("feature.b");
    expect(statusB?.state).toBe("blocked");
    expect(statusB?.missing).toEqual(["feature.a"]);
  });

  test("marks cycles as blocked", async () => {
    const ctx = createStubContext();
    const featureA: FeatureModule = { id: "feature.a", requires: ["feature.b"], activate: () => {} };
    const featureB: FeatureModule = { id: "feature.b", requires: ["feature.a"], activate: () => {} };

    const graph = new FeatureGraph();
    graph.register(featureA, featureB);
    await graph.activateAll(ctx);

    expect(graph.getStatus("feature.a")?.state).toBe("blocked");
    expect(graph.getStatus("feature.b")?.state).toBe("blocked");
  });
});
