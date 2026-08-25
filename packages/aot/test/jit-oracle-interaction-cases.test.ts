import { describe, expect, it } from "vitest";
import { BatchRunner } from "../src/testing/batch-runner.js";
import { CompilerCaseCatalog } from "../src/testing/compiler-case-catalog.js";
import {
  JitCompilerCaseExecutor,
  validateJitCharacterizationCases,
} from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle, type JitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_INTERACTION_CASES } from "../src/testing/jit-oracle-interaction-cases.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";
import {
  JIT_ORACLE_SETUP_FACTORIES,
  JIT_ORACLE_SETUP_MATERIALIZERS,
} from "../src/testing/jit-oracle-setups.js";

describe("checked-artifact JIT interaction cases", () => {
  it("retains checked artifacts as behavior authority and the stale generator only as history", () => {
    const catalog = new CompilerCaseCatalog(
      JIT_ORACLE_INTERACTION_CASES,
      JIT_ORACLE_SETUP_FACTORIES,
      COMPILER_OBLIGATION_CATALOG,
    );

    validateJitCharacterizationCases(catalog.cases);
    expect(catalog.cases).toHaveLength(4);
    for (const candidate of catalog.cases) {
      const checkedArtifact = candidate.provenance.find((authority) =>
        authority.role === "behavior" && authority.filePath.includes("/generated/")
      );
      const staleGenerator = candidate.provenance.find((authority) =>
        authority.role === "history"
        && authority.filePath === "scripts/generate-tests/template-compiler.static.ts"
      );
      expect(checkedArtifact?.testName, candidate.id).toBeTruthy();
      expect(staleGenerator, candidate.id).toBeTruthy();
      expect(candidate.oracles.lanes, candidate.id).toEqual([{
        id: "framework-jit",
        expectedProduct: "compiled-definition",
      }]);
      expect(candidate.oracles.claims, candidate.id).toEqual([]);
      expect(candidate.closure.every((claim) => claim.state === "not-claimed"), candidate.id).toBe(true);
      expect(candidate.effects, candidate.id).toEqual([]);
    }

    expect(catalog.cases.slice(0, 2).every((candidate) => candidate.world.setups.length === 0)).toBe(true);
    expect(catalog.cases.slice(2).every((candidate) =>
      candidate.world.setups.length === 1
      && candidate.world.registrations.length === 1
      && candidate.world.registrations[0]?.site === "definition-dependency"
    )).toBe(true);
  });

  it("runs every topology invariant through the real JIT without a runtime oracle lane", async () => {
    const executor = new JitCompilerCaseExecutor(
      JIT_ORACLE_SETUP_FACTORIES,
      JIT_ORACLE_SETUP_MATERIALIZERS,
    );
    const oracle = createJitCompilerOracle();
    try {
      const result = await new BatchRunner(
        JIT_ORACLE_INTERACTION_CASES,
        (candidate, context: JitCompilerOracle) => executor.execute(candidate, context),
      ).run(oracle);

      expect(result.executionCount).toBe(JIT_ORACLE_INTERACTION_CASES.length);
      expect(result.passedCount).toBe(JIT_ORACLE_INTERACTION_CASES.length);
      expect(result.failedCount).toBe(0);
    } finally {
      oracle.dispose();
    }
  });
});
