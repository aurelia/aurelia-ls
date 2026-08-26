import { describe, expect, it } from "vitest";
import { BatchRunner } from "../src/testing/batch-runner.js";
import { CompilerCaseCatalog } from "../src/testing/compiler-case-catalog.js";
import {
  JitCompilerCaseExecutor,
  validateJitCharacterizationCases,
} from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle, type JitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_BROWSER_INTERACTION_CASES } from "../src/testing/jit-oracle-browser-interaction-cases.js";
import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-case-registry.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";
import {
  JIT_ORACLE_SETUP_FACTORIES,
  JIT_ORACLE_SETUP_MATERIALIZERS,
} from "../src/testing/jit-oracle-setups.js";

const expectedCaseIds = [
  "interaction.browser.foster-target-order",
  "interaction.browser.paragraph-controller-topology",
  "interaction.browser.duplicate-binding-elision",
  "interaction.browser.carrier-comment-shield",
];

const expectedObligationIds = [
  "compiler.interaction.browser-foster-target-order",
  "compiler.interaction.browser-paragraph-controller-topology",
  "compiler.interaction.browser-duplicate-binding-elision",
  "compiler.interaction.browser-carrier-comment-shield",
];

describe("browser-interaction JIT characterization cases", () => {
  it("records focused JIT witnesses without claiming browser or compiler closure", () => {
    const catalog = new CompilerCaseCatalog(
      JIT_ORACLE_BROWSER_INTERACTION_CASES,
      JIT_ORACLE_SETUP_FACTORIES,
      COMPILER_OBLIGATION_CATALOG,
    );

    validateJitCharacterizationCases(catalog.cases);
    expect(catalog.cases.map((candidate) => candidate.id)).toEqual(expectedCaseIds);
    expect(expectedCaseIds.every((id) => JIT_ORACLE_CASES.some((candidate) => candidate.id === id))).toBe(true);

    for (const candidate of catalog.cases) {
      expect(candidate.oracles).toEqual({
        lanes: [{ id: "framework-jit", expectedProduct: "compiled-definition" }],
        claims: [],
      });
      expect(candidate.closure.every((claim) => claim.state === "not-claimed"), candidate.id).toBe(true);
      expect(candidate.effects).toHaveLength(1);
      expect(candidate.effects[0]).toMatchObject({ conservation: "open" });
      expect(candidate.provenance.some((authority) =>
        authority.repository === "aurelia"
        && authority.revision === "4ff60906593bdedc9f9dc6003606ba138df87f0e"
      ), candidate.id).toBe(true);
      expect(candidate.provenance.some((authority) =>
        authority.repository === "aurelia-ls2"
        && authority.revision === "b1a646c7bef0c2e6a4b3578ebb601ed8b01d8546"
      ), candidate.id).toBe(true);
    }

    for (const id of expectedObligationIds.slice(0, 3)) {
      expect(catalog.obligationAudit.rows.find((row) => row.id === id)).toMatchObject({
        state: "witnessed-not-claimed",
        disposition: { closure: { state: "not-claimed" } },
      });
    }
    expect(catalog.obligationAudit.rows.find(
      (row) => row.id === "compiler.interaction.browser-carrier-comment-shield",
    )).toMatchObject({
      state: "witnessed-open",
      disposition: {
        source: "ambiguous",
        policy: "maintainer-decision",
        closure: { state: "open" },
      },
    });
    expect(catalog.obligationAudit.rows.find(
      (row) => row.id === "compiler.browser-tree.authored-disposition",
    )).toMatchObject({
      state: "witnessed-open",
      disposition: { semanticRuntime: "projection-gap", closure: { state: "open" } },
    });
  });

  it("runs all four exact templates and instruction products in one JIT batch", async () => {
    const executor = new JitCompilerCaseExecutor(
      JIT_ORACLE_SETUP_FACTORIES,
      JIT_ORACLE_SETUP_MATERIALIZERS,
    );
    const oracle = createJitCompilerOracle();
    try {
      const result = await new BatchRunner(
        JIT_ORACLE_BROWSER_INTERACTION_CASES,
        (candidate, context: JitCompilerOracle) => executor.execute(candidate, context),
      ).run(oracle);

      expect(result.executionCount).toBe(4);
      expect(result.passedCount).toBe(4);
      expect(result.failedCount).toBe(0);
    } finally {
      oracle.dispose();
    }
  });
});
