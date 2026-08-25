import { describe, expect, it } from "vitest";
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
    const candidate = equivalentCase(
      "browser-tree.serialization-collision",
      "<noscript><b>x</b></noscript>",
    );
    const chromium = observation(candidate.id, candidate.expectation.serialization, [element("noscript", [
      element("b", [{ kind: "text", value: "x" }]),
    ])]);
    const semanticRuntime = observation(candidate.id, candidate.expectation.serialization, [element("noscript", [
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
    const candidate = BROWSER_TREE_ORACLE_CASES.find(
      (item) => item.expectation.kind === "expected-divergence",
    );
    if (candidate == null || candidate.expectation.kind !== "expected-divergence") {
      throw new Error("Expected one declared browser-tree divergence.");
    }
    const chromium = observation(
      candidate.id,
      candidate.expectation.chromiumSerialization,
      [element("select", [element("button"), element("option")])],
    );
    const semanticRuntime = observation(
      candidate.id,
      candidate.expectation.semanticRuntimeSerialization,
      [element("select", [element("option")])],
    );

    expect(evaluateBrowserTreeCase(
      candidate,
      chromium,
      semanticRuntime,
      candidate.expectation.authorityVersions,
    ).outcome).toBe("matched-expected-divergence");

    const movedAuthority = evaluateBrowserTreeCase(candidate, chromium, semanticRuntime, {
      ...candidate.expectation.authorityVersions,
      chromium: "next",
    });
    expect(movedAuthority.outcome).toBe("failed");
    expect(movedAuthority.problems[0]).toContain("Chromium authority changed");
  });

  it("fails a stale divergence instead of counting newly equal trees as a pass", () => {
    const candidate = BROWSER_TREE_ORACLE_CASES.find(
      (item) => item.expectation.kind === "expected-divergence",
    );
    if (candidate == null || candidate.expectation.kind !== "expected-divergence") {
      throw new Error("Expected one declared browser-tree divergence.");
    }
    const newlyEqual = observation(
      candidate.id,
      candidate.expectation.chromiumSerialization,
      [element("select", [element("button"), element("option")])],
    );

    const evaluation = evaluateBrowserTreeCase(
      candidate,
      newlyEqual,
      newlyEqual,
      candidate.expectation.authorityVersions,
    );

    expect(evaluation.outcome).toBe("failed");
    expect(evaluation.problems).toContain(
      "The declared customizable-select divergence disappeared; review the authority versions and convert this case to equivalence instead of silently passing it.",
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
});

function equivalentCase(id: string, serialization: string): BrowserTreeOracleCase & {
  readonly expectation: { readonly kind: "equivalent"; readonly serialization: string };
} {
  return {
    id,
    family: "browser-tree",
    tags: ["test"],
    requirement: "Exercise the browser-tree comparison contract.",
    markup: serialization,
    expectation: { kind: "equivalent", serialization },
  };
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
