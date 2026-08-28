import { describe, expect, it } from "vitest";
import { COMPILER_CASE_SCHEMA_VERSION } from "../src/testing/compiler-case.js";
import {
  BROWSER_TREE_ORACLE_CASES,
  browserTreeOracleCaseDigest,
  type BrowserTreeOracleCase,
  validateBrowserTreeOracleCases,
} from "../src/testing/browser-tree-oracle-cases.js";
import {
  evaluateBrowserTreeCase,
  type BrowserTreeObservation,
  type BrowserTreeStructureNode,
} from "../src/testing/browser-tree-oracle.js";

describe("browser-tree oracle contract", () => {
  it("keeps structural equality authoritative when serialization collides", () => {
    const serialization = "<noscript><b>x</b></noscript>";
    const candidate = equivalentCase(
      "browser-tree.serialization-collision",
      serialization,
    );
    const chromium = observation(candidate.id, serialization, [element("noscript", [
      element("b", [{ kind: "text", value: "x" }]),
    ])]);
    const semanticRuntime = observation(candidate.id, serialization, [element("noscript", [
      { kind: "text", value: "<b>x</b>" },
    ])]);

    const evaluation = evaluateBrowserTreeCase(candidate, chromium, semanticRuntime, {
      chromium: "test",
      semanticRuntimeParser: "test",
    });

    expect(evaluation.serializationEqual).toBe(true);
    expect(evaluation.structureEqual).toBe(false);
    expect(evaluation.outcome).toBe("failed");
    expect(evaluation.problems).toContain("Chromium and semantic-runtime structural normal forms differ.");
  });

  it("keeps the known divergence explicit and authority-version-bound", () => {
    const { candidate, authorities, chromiumSerialization, semanticRuntimeSerialization } =
      declaredDivergence();
    const chromium = observation(
      candidate.id,
      chromiumSerialization,
      [element("select", [element("button"), element("option")])],
    );
    const semanticRuntime = observation(
      candidate.id,
      semanticRuntimeSerialization,
      [element("select", [element("option")])],
    );

    expect(evaluateBrowserTreeCase(
      candidate,
      chromium,
      semanticRuntime,
      authorities,
    ).outcome).toBe("matched-expected-divergence");

    const movedAuthority = evaluateBrowserTreeCase(candidate, chromium, semanticRuntime, {
      ...authorities,
      chromium: "next",
    });
    expect(movedAuthority.outcome).toBe("failed");
    expect(movedAuthority.problems[0]).toContain("Chromium authority changed");
  });

  it("fails a stale divergence instead of counting newly equal trees as a pass", () => {
    const { candidate, authorities, chromiumSerialization } = declaredDivergence();
    const newlyEqual = observation(
      candidate.id,
      chromiumSerialization,
      [element("select", [element("button"), element("option")])],
    );

    const evaluation = evaluateBrowserTreeCase(
      candidate,
      newlyEqual,
      newlyEqual,
      authorities,
    );

    expect(evaluation.outcome).toBe("failed");
    expect(evaluation.problems).toContain(
      "The declared customizable-select divergence disappeared; review the authority versions and convert this case to equivalence instead of silently passing it.",
    );
  });

  it("evaluates expected divergence structurally even when serialization is equal", () => {
    const { candidate: base, authorities } = declaredDivergence();
    const serialization = "<select><option>one</option></select>";
    const candidate: BrowserTreeOracleCase = {
      ...base,
      invariants: base.invariants.map((invariant) =>
        invariant.selector.kind === "browser-serialization"
          ? { ...invariant, assertion: { kind: "equal", expected: serialization } }
          : invariant
      ),
    };
    const chromium = observation(candidate.id, serialization, [
      element("select", [element("button"), element("option")]),
    ]);
    const semanticRuntime = observation(candidate.id, serialization, [
      element("select", [element("option")]),
    ]);

    const evaluation = evaluateBrowserTreeCase(candidate, chromium, semanticRuntime, authorities);

    expect(evaluation.serializationEqual).toBe(true);
    expect(evaluation.structureEqual).toBe(false);
    expect(evaluation.outcome).toBe("matched-expected-divergence");
  });

  it("executes browser-focused invariant selectors against their declared lanes", () => {
    const base = equivalentCase("browser-tree.focused-invariant", "<div></div>");
    const candidate: BrowserTreeOracleCase = {
      ...base,
      invariants: [{
        id: "browser-tree.focused-invariant.root-tag",
        description: "Deliberately wrong expected root for the selector contract.",
        lanes: ["chromium-parser", "semantic-runtime"],
        selector: { kind: "browser-tree-path", path: [0, "tagName"] },
        assertion: { kind: "equal", expected: "section" },
      }],
    };
    const observed = observation(candidate.id, "<div></div>", [element("div")]);

    const evaluation = evaluateBrowserTreeCase(candidate, observed, observed, {
      chromium: "test",
      semanticRuntimeParser: "test",
    });

    expect(evaluation.outcome).toBe("failed");
    expect(evaluation.problems).toContain(
      "Focused invariant browser-tree.focused-invariant.root-tag failed in chromium-parser.",
    );
    expect(evaluation.problems).toContain(
      "Focused invariant browser-tree.focused-invariant.root-tag failed in semantic-runtime.",
    );
  });

  it("validates registry identity and produces an order-independent digest", () => {
    validateBrowserTreeOracleCases(BROWSER_TREE_ORACLE_CASES);
    expect(browserTreeOracleCaseDigest([...BROWSER_TREE_ORACLE_CASES].reverse()))
      .toBe(browserTreeOracleCaseDigest(BROWSER_TREE_ORACLE_CASES));
    expect(() => validateBrowserTreeOracleCases([
      BROWSER_TREE_ORACLE_CASES[0]!,
      BROWSER_TREE_ORACLE_CASES[0]!,
    ])).toThrow("Duplicate browser-tree oracle case id");
  });

  it("publishes browser observations as conservation evidence without claiming wrapper or lineage", () => {
    validateBrowserTreeOracleCases(BROWSER_TREE_ORACLE_CASES);

    expect(BROWSER_TREE_ORACLE_CASES).toHaveLength(17);
    for (const candidate of BROWSER_TREE_ORACLE_CASES) {
      expect(candidate.caseKind).toBe("browser-tree");
      expect(candidate.schemaVersion).toBe(COMPILER_CASE_SCHEMA_VERSION);
      expect(candidate.provenance.length).toBeGreaterThanOrEqual(3);
      expect(candidate.obligations.map((row) => row.id)).toContain("compiler.browser-tree.fragment-context");
      expect(candidate.obligations.map((row) => row.id)).not.toContain("compiler.browser-tree.root-wrapper");
      expect(candidate.obligations.map((row) => row.id)).not.toContain("compiler.browser-tree.authored-lineage");
      expect(candidate.obligations.map((row) => row.id)).not.toContain("compiler.browser-tree.compiler-lineage");
      expect(candidate.oracles.lanes.map((lane) => lane.id).sort())
        .toEqual(["chromium-parser", "semantic-runtime"]);
      expect(candidate.effects.length).toBeGreaterThan(0);
      expect(candidate.closure.length).toBeGreaterThan(0);
      expect(candidate.oracles.claims.length).toBeGreaterThan(0);
      expect(candidate.invariants.some((row) => row.selector.kind.startsWith("browser-"))).toBe(true);
      expect(candidate.contrasts.length).toBeGreaterThan(0);
      expect(candidate.closure.find((row) => row.dimension === "dom-tree-effects")?.state)
        .toBe("not-claimed");
      expect("world" in candidate).toBe(false);
    }

    const recoveryCases = BROWSER_TREE_ORACLE_CASES.filter((candidate) =>
      candidate.obligations.some((row) => row.id === "compiler.browser-tree.recovery")
    );
    expect(recoveryCases.map((candidate) => candidate.id))
      .toEqual(BROWSER_TREE_ORACLE_CASES.slice(1).map((candidate) => candidate.id));
  });
});

function equivalentCase(id: string, serialization: string): BrowserTreeOracleCase {
  const base = BROWSER_TREE_ORACLE_CASES[0]!;
  return {
    ...base,
    id,
    family: "browser-tree",
    tags: ["test"],
    requirement: "Exercise the browser-tree comparison contract.",
    markup: serialization,
    invariants: [{
      id: `${id}.serialization`,
      description: "Both browser lanes retain the fixture serialization.",
      lanes: ["chromium-parser", "semantic-runtime"],
      selector: { kind: "browser-serialization" },
      assertion: { kind: "equal", expected: serialization },
    }],
    contrasts: [],
  };
}

function declaredDivergence(): {
  readonly candidate: BrowserTreeOracleCase;
  readonly authorities: { readonly chromium: string; readonly semanticRuntimeParser: string };
  readonly chromiumSerialization: string;
  readonly semanticRuntimeSerialization: string;
} {
  for (const candidate of BROWSER_TREE_ORACLE_CASES) {
    const claim = candidate.oracles.claims.find((row) => row.kind === "expected-divergence");
    if (claim?.kind !== "expected-divergence") {
      continue;
    }
    const chromium = claim.authorityVersions.chromium;
    const semanticRuntimeParser = claim.authorityVersions.semanticRuntimeParser;
    if (chromium == null || semanticRuntimeParser == null) {
      throw new Error("Expected complete browser-tree divergence authorities.");
    }
    return {
      candidate,
      authorities: { chromium, semanticRuntimeParser },
      chromiumSerialization: expectedLaneSerialization(candidate, "chromium-parser"),
      semanticRuntimeSerialization: expectedLaneSerialization(candidate, "semantic-runtime"),
    };
  }
  throw new Error("Expected one declared browser-tree divergence.");
}

function expectedLaneSerialization(
  candidate: BrowserTreeOracleCase,
  lane: "chromium-parser" | "semantic-runtime",
): string {
  const invariant = candidate.invariants.find((row) =>
    row.lanes.includes(lane)
    && row.selector.kind === "browser-serialization"
    && row.assertion.kind === "equal"
    && typeof row.assertion.expected === "string"
  );
  if (invariant?.assertion.kind !== "equal" || typeof invariant.assertion.expected !== "string") {
    throw new Error(`Expected ${lane} serialization invariant for ${candidate.id}.`);
  }
  return invariant.assertion.expected;
}

function observation(
  id: string,
  serialized: string,
  structure: readonly BrowserTreeStructureNode[],
): BrowserTreeObservation {
  return { id, serialized, structure };
}

function element(
  tagName: string,
  children: readonly BrowserTreeStructureNode[] = [],
): BrowserTreeStructureNode {
  return {
    kind: "element",
    tagName,
    namespaceUri: "http://www.w3.org/1999/xhtml",
    attributes: [],
    children,
    content: null,
  };
}
