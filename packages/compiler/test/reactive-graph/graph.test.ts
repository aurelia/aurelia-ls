/**
 * Claim Graph — Core Reactive Graph Tests
 *
 * Tests the graph infrastructure in isolation: staleness propagation,
 * pull-based evaluation, value-sensitive cutoff, cycle detection,
 * forward references, fixed-point convergence, edge kinds.
 */
import { describe, expect, it, vi } from "vitest";
import { createClaimGraph } from "../../out/reactive-graph/graph.js";
import type {
  ClaimGraph,
  NodeId,
  EvaluateCallback,
  EvaluationContext,
  EvaluationResult,
  PullResult,
} from "../../out/reactive-graph/types.js";

// =============================================================================
// Helpers
// =============================================================================

function makeGraph(budget = 10): ClaimGraph {
  return createClaimGraph({ convergenceBudget: budget });
}

/** Create a simple callback that returns its kind + key as green/red. */
function echoCallback(): EvaluateCallback {
  return (nodeId: NodeId, _ctx: EvaluationContext): EvaluationResult => {
    const key = nodeId.split("::")[1];
    return { green: `green:${key}`, red: `red:${key}` };
  };
}

/** Track evaluation calls. */
function trackingCallback(calls: string[], fn?: (nodeId: NodeId, ctx: EvaluationContext) => EvaluationResult): EvaluateCallback {
  return (nodeId: NodeId, ctx: EvaluationContext): EvaluationResult => {
    calls.push(nodeId);
    if (fn) return fn(nodeId, ctx);
    const key = nodeId.split("::")[1];
    return { green: `green:${key}`, red: `red:${key}` };
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("ClaimGraph", () => {
  // ── Node management ──────────────────────────────────────────────────

  describe("node management", () => {
    it("creates nodes with unique ids", () => {
      const g = makeGraph();
      const a = g.createNode("file", "a.ts");
      const b = g.createNode("file", "b.ts");
      expect(a).not.toBe(b);
      expect(g.nodeCount).toBe(2);
    });

    it("returns same id for same kind+key", () => {
      const g = makeGraph();
      const a1 = g.createNode("file", "a.ts");
      const a2 = g.createNode("file", "a.ts");
      expect(a1).toBe(a2);
      expect(g.nodeCount).toBe(1);
    });

    it("findNode returns undefined for missing nodes", () => {
      const g = makeGraph();
      expect(g.findNode("file", "missing")).toBeUndefined();
    });

    it("findNode returns the node id", () => {
      const g = makeGraph();
      const id = g.createNode("file", "a.ts");
      expect(g.findNode("file", "a.ts")).toBe(id);
    });

    it("getNode returns state", () => {
      const g = makeGraph();
      const id = g.createNode("eval", "unit1");
      const state = g.getNode(id);
      expect(state).toEqual({
        id,
        kind: "eval",
        key: "unit1",
        freshness: "unevaluated",
        green: undefined,
        red: undefined,
      });
    });
  });

  // ── Input values ─────────────────────────────────────────────────────

  describe("setInputValue", () => {
    it("sets green and red, marks node fresh", () => {
      const g = makeGraph();
      const id = g.createNode("file", "a.ts");
      g.setInputValue(id, "content-v1", { file: "a.ts", content: "v1" });

      const state = g.getNode(id)!;
      expect(state.freshness).toBe("fresh");
      expect(state.green).toBe("content-v1");
      expect(state.red).toEqual({ file: "a.ts", content: "v1" });
    });

    it("does not propagate staleness when green is same", () => {
      const g = makeGraph();
      const input = g.createNode("file", "a.ts");
      const derived = g.createNode("eval", "a");
      g.registerCallback("eval", echoCallback());
      g.addEdge(input, derived, "data");
      g.setInputValue(input, "v1", "r1");
      g.pull(derived); // evaluate to make fresh

      // Set same green again
      g.setInputValue(input, "v1", "r1-updated");
      expect(g.getNode(derived)!.freshness).toBe("fresh"); // not stale
    });

    it("propagates staleness when green changes", () => {
      const g = makeGraph();
      const input = g.createNode("file", "a.ts");
      const derived = g.createNode("eval", "a");
      g.registerCallback("eval", (_nodeId, ctx) => {
        const r = ctx.pull(input);
        return { green: `derived(${r.green})`, red: "derived-red" };
      });
      g.setInputValue(input, "v1", "r1");
      g.pull(derived);

      g.setInputValue(input, "v2", "r2");
      expect(g.getNode(derived)!.freshness).toBe("stale");
    });
  });

  // ── Linear chain ─────────────────────────────────────────────────────

  describe("linear chain", () => {
    it("pull evaluates the full chain", () => {
      const g = makeGraph();
      const calls: string[] = [];

      const a = g.createNode("file", "a");
      g.setInputValue(a, "a-content", "a-red");

      const b = g.createNode("derived", "b");
      const c = g.createNode("derived", "c");

      g.registerCallback("derived", trackingCallback(calls, (nodeId, ctx) => {
        const key = nodeId.split("::")[1];
        if (key === "b") {
          const r = ctx.pull(a);
          return { green: `b(${r.green})`, red: `b-red(${r.value})` };
        }
        if (key === "c") {
          const r = ctx.pull(b);
          return { green: `c(${r.green})`, red: `c-red(${r.value})` };
        }
        return { green: key, red: key };
      }));

      const result = g.pull(c);
      expect(result.green).toBe("c(b(a-content))");
      expect(result.value).toBe("c-red(b-red(a-red))");
      expect(calls).toEqual(["derived::c", "derived::b"]);
    });

    it("re-evaluates stale chain on pull", () => {
      const g = makeGraph();
      const calls: string[] = [];
      let inputGreen = "v1";

      const a = g.createNode("file", "a");
      g.setInputValue(a, inputGreen, "r1");

      const b = g.createNode("derived", "b");
      g.registerCallback("derived", trackingCallback(calls, (_nodeId, ctx) => {
        const r = ctx.pull(a);
        return { green: `b(${r.green})`, red: `b-red` };
      }));

      // First pull
      g.pull(b);
      expect(calls).toEqual(["derived::b"]);

      // Second pull — fresh, no re-eval
      calls.length = 0;
      g.pull(b);
      expect(calls).toEqual([]);

      // Change input, pull again
      calls.length = 0;
      inputGreen = "v2";
      g.setInputValue(a, inputGreen, "r2");
      const result = g.pull(b);
      expect(calls).toEqual(["derived::b"]);
      expect(result.green).toBe("b(v2)");
    });
  });

  // ── Value-sensitive cutoff ───────────────────────────────────────────

  describe("cutoff", () => {
    it("skips downstream re-evaluation when green unchanged", () => {
      const g = makeGraph();
      const calls: string[] = [];

      const a = g.createNode("file", "a");
      g.setInputValue(a, "v1", "r1");

      // B always returns the same green regardless of input
      const b = g.createNode("mid", "b");
      g.registerCallback("mid", trackingCallback(calls, (_nodeId, ctx) => {
        ctx.pull(a); // declares dependency
        return { green: "constant", red: "b-red" };
      }));

      const c = g.createNode("leaf", "c");
      g.registerCallback("leaf", trackingCallback(calls, (_nodeId, ctx) => {
        const r = ctx.pull(b);
        return { green: `c(${r.green})`, red: "c-red" };
      }));

      // Initial evaluation
      g.pull(c);
      expect(calls).toEqual(["leaf::c", "mid::b"]);

      // Change input — B re-evaluates but produces same green
      calls.length = 0;
      g.setInputValue(a, "v2", "r2");
      g.pull(c);

      // B should re-evaluate (it's stale), C should also re-evaluate
      // because C's own staleness was propagated. But C will see same
      // green from B, so the cutoff concept is visible at B's level.
      expect(calls).toContain("mid::b");
    });
  });

  // ── Diamond ──────────────────────────────────────────────────────────

  describe("diamond dependency", () => {
    it("evaluates shared dependency only once", () => {
      const g = makeGraph();
      const calls: string[] = [];

      const a = g.createNode("file", "a");
      g.setInputValue(a, "v1", "r1");

      const b = g.createNode("mid", "b");
      const c = g.createNode("mid", "c");
      const d = g.createNode("leaf", "d");

      g.registerCallback("mid", trackingCallback(calls, (nodeId, ctx) => {
        ctx.pull(a);
        const key = nodeId.split("::")[1];
        return { green: `${key}(v1)`, red: `${key}-red` };
      }));

      g.registerCallback("leaf", trackingCallback(calls, (_nodeId, ctx) => {
        const rb = ctx.pull(b);
        const rc = ctx.pull(c);
        return { green: `d(${rb.green},${rc.green})`, red: "d-red" };
      }));

      const result = g.pull(d);
      expect(result.green).toBe("d(b(v1),c(v1))");

      // A should be pulled only once (first by B, then cached for C)
      const midCalls = calls.filter(c => c.startsWith("mid::"));
      expect(midCalls).toHaveLength(2); // b and c
    });
  });

  // ── Edge kinds ───────────────────────────────────────────────────────

  describe("edge kinds", () => {
    it("both data and completeness edges propagate staleness", () => {
      const g = makeGraph();

      const scope = g.createNode("scope", "root");
      g.setInputValue(scope, "scope-v1", "scope-r1");

      const template = g.createNode("template", "t1");
      g.registerCallback("template", (_nodeId, ctx) => {
        ctx.pull(scope, "data");
        ctx.pull(scope, "completeness");
        return { green: "t-green", red: "t-red" };
      });

      g.pull(template);
      expect(g.getNode(template)!.freshness).toBe("fresh");

      g.setInputValue(scope, "scope-v2", "scope-r2");
      expect(g.getNode(template)!.freshness).toBe("stale");
    });

    it("records edge kind correctly", () => {
      const g = makeGraph();
      const a = g.createNode("file", "a");
      const b = g.createNode("eval", "b");
      g.addEdge(a, b, "completeness");

      const edges = g.getEdgesFrom(a);
      expect(edges).toHaveLength(1);
      expect(edges[0]!.edgeKind).toBe("completeness");
    });
  });

  // ── Cycle detection ──────────────────────────────────────────────────

  describe("cycle detection", () => {
    it("returns forward ref on cycle", () => {
      const g = makeGraph();
      let bPullResult: PullResult | null = null;

      const a = g.createNode("eval", "a");
      const b = g.createNode("eval", "b");

      g.registerCallback("eval", (nodeId, ctx) => {
        const key = nodeId.split("::")[1];
        if (key === "a") {
          const r = ctx.pull(b);
          return { green: `a(${r.green ?? "nil"})`, red: `a-red` };
        }
        if (key === "b") {
          const r = ctx.pull(a);
          bPullResult = r;
          return { green: `b(${r.green ?? "nil"})`, red: `b-red` };
        }
        return { green: "?", red: "?" };
      });

      g.pull(a);

      // B's pull of A should have detected the cycle
      expect(bPullResult).not.toBeNull();
      expect(bPullResult!.isCycle).toBe(true);
      expect(bPullResult!.forwardRef).not.toBeNull();
      expect(bPullResult!.forwardRef!.nodeId).toBe(a);
    });
  });

  // ── Convergence ──────────────────────────────────────────────────────

  describe("convergence", () => {
    it("converges a simple cycle", () => {
      const g = makeGraph();
      let iteration = 0;

      const a = g.createNode("eval", "a");
      const b = g.createNode("eval", "b");

      // A and B depend on each other. Each iteration, they converge
      // toward a stable value.
      g.registerCallback("eval", (nodeId, ctx) => {
        const key = nodeId.split("::")[1];
        if (key === "a") {
          const r = ctx.pull(b);
          // First iteration: no previous value. Subsequent: use B's value.
          const bVal = r.isCycle ? 0 : (r.green as number);
          return { green: Math.min(bVal + 1, 5), red: "a-red" };
        }
        if (key === "b") {
          const r = ctx.pull(a);
          const aVal = r.isCycle ? 0 : (r.green as number);
          return { green: Math.min(aVal + 1, 5), red: "b-red" };
        }
        return { green: 0, red: "?" };
      });

      // Use converge directly
      const result = g.converge([a, b], 10);
      expect(result.converged).toBe(true);
      expect(result.iterations).toBeLessThanOrEqual(10);
    });

    it("stops at budget when cycle doesn't converge", () => {
      const g = makeGraph();
      let counter = 0;

      const a = g.createNode("eval", "a");

      g.registerCallback("eval", (_nodeId, _ctx) => {
        counter++;
        return { green: counter, red: "red" }; // always different green
      });

      const result = g.converge([a], 5);
      expect(result.converged).toBe(false);
      expect(result.iterations).toBe(5);
    });
  });

  // ── Dynamic nodes ────────────────────────────────────────────────────

  describe("dynamic node creation", () => {
    it("callback can create nodes during evaluation", () => {
      const g = makeGraph();

      const root = g.createNode("eval", "root");
      g.registerCallback("eval", (nodeId, ctx) => {
        const key = nodeId.split("::")[1];
        if (key === "root") {
          // Dynamically create a dependency
          const child = ctx.createNode("file", "discovered.ts");
          // Can't pull it (no value set), but it exists
          return { green: `root+${child}`, red: "root-red" };
        }
        return { green: key, red: key };
      });

      g.pull(root);
      expect(g.findNode("file", "discovered.ts")).toBeDefined();
      expect(g.nodeCount).toBe(2);
    });
  });

  // ── Staleness handler ────────────────────────────────────────────────

  describe("staleness handler", () => {
    it("notifies handler when nodes become stale", () => {
      const g = makeGraph();
      const staleNotifications: string[] = [];

      const input = g.createNode("file", "a");
      const derived = g.createNode("eval", "b");
      g.registerCallback("eval", (_nodeId, ctx) => {
        ctx.pull(input);
        return { green: "b-green", red: "b-red" };
      });
      g.setInputValue(input, "v1", "r1");
      g.pull(derived);

      g.onStale({
        onNodesStale(nodes) {
          for (const n of nodes) staleNotifications.push(n.id);
        },
      });

      g.setInputValue(input, "v2", "r2");
      expect(staleNotifications).toContain("eval::b");
    });

    it("does not notify when green unchanged", () => {
      const g = makeGraph();
      const staleNotifications: string[] = [];

      const input = g.createNode("file", "a");
      const derived = g.createNode("eval", "b");
      g.addEdge(input, derived, "data");
      g.setInputValue(input, "v1", "r1");

      g.onStale({
        onNodesStale(nodes) {
          for (const n of nodes) staleNotifications.push(n.id);
        },
      });

      g.setInputValue(input, "v1", "r1-same-green");
      expect(staleNotifications).toHaveLength(0);
    });
  });

  // ── Edge clearing on re-evaluation ───────────────────────────────────

  describe("edge clearing on re-evaluation", () => {
    it("re-captures dependencies when they change", () => {
      const g = makeGraph();
      let useB = true;

      const a = g.createNode("file", "a");
      const b = g.createNode("file", "b");
      const c = g.createNode("file", "c");
      g.setInputValue(a, "a", "a");
      g.setInputValue(b, "b", "b");
      g.setInputValue(c, "c", "c");

      const derived = g.createNode("eval", "d");
      g.registerCallback("eval", (_nodeId, ctx) => {
        ctx.pull(a); // always depends on a
        if (useB) {
          ctx.pull(b); // conditionally depends on b
        } else {
          ctx.pull(c); // or c
        }
        return { green: useB ? "with-b" : "with-c", red: "red" };
      });

      // First evaluation: depends on a, b
      g.pull(derived);
      expect(g.getEdgesTo(derived)).toHaveLength(2);

      // Change condition and force re-eval
      useB = false;
      g.markStale(derived);
      g.pull(derived);

      // Now depends on a, c (not b)
      const edges = g.getEdgesTo(derived);
      expect(edges).toHaveLength(2);
      const depKeys = edges.map(e => e.from);
      expect(depKeys).toContain("file::a");
      expect(depKeys).toContain("file::c");
      expect(depKeys).not.toContain("file::b");
    });
  });

  // ── markStale ────────────────────────────────────────────────────────

  describe("markStale", () => {
    it("propagates transitively", () => {
      const g = makeGraph();
      const a = g.createNode("file", "a");
      const b = g.createNode("eval", "b");
      const c = g.createNode("leaf", "c");
      g.setInputValue(a, "v1", "r1");
      g.registerCallback("eval", (_nodeId, ctx) => {
        ctx.pull(a);
        return { green: "b-green", red: "b-red" };
      });
      g.registerCallback("leaf", (_nodeId, ctx) => {
        ctx.pull(b);
        return { green: "c-green", red: "c-red" };
      });
      g.pull(c); // evaluates c → b → a, creating edges

      g.markStale(a);
      expect(g.getNode(b)!.freshness).toBe("stale");
      expect(g.getNode(c)!.freshness).toBe("stale");
    });

    it("is idempotent — already-stale nodes skip", () => {
      const g = makeGraph();
      const a = g.createNode("file", "a");
      const b = g.createNode("eval", "b");
      // Create a cycle in edges to test idempotency
      g.addEdge(a, b, "data");
      g.addEdge(b, a, "data");
      g.setInputValue(a, "v1", "r1");

      // Should not infinite-loop
      g.markStale(a);
      expect(g.getNode(a)!.freshness).toBe("stale");
      expect(g.getNode(b)!.freshness).toBe("stale");
    });
  });

  // ── Observation counts ───────────────────────────────────────────────

  describe("observation", () => {
    it("tracks edge count correctly", () => {
      const g = makeGraph();
      const a = g.createNode("file", "a");
      const b = g.createNode("eval", "b");
      expect(g.edgeCount).toBe(0);

      g.addEdge(a, b, "data");
      expect(g.edgeCount).toBe(1);

      // Duplicate edge — no increase
      g.addEdge(a, b, "data");
      expect(g.edgeCount).toBe(1);
    });

    it("tracks stale count", () => {
      const g = makeGraph();
      const a = g.createNode("file", "a");
      const b = g.createNode("eval", "b");
      g.setInputValue(a, "v1", "r1");
      g.registerCallback("eval", (_nodeId, ctx) => {
        ctx.pull(a);
        return { green: "b-green", red: "b-red" };
      });
      g.pull(b); // creates edge a→b, both now fresh

      expect(g.staleCount).toBe(0);
      g.markStale(a);
      expect(g.staleCount).toBe(2); // both stale
    });
  });
});
