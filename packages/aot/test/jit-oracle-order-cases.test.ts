import { describe, expect, it } from "vitest";
import { BatchRunner } from "../src/testing/batch-runner.js";
import { CompilerCaseCatalog } from "../src/testing/compiler-case-catalog.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";
import { JitCompilerCaseExecutor } from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle, type JitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_ORDER_CASES } from "../src/testing/jit-oracle-order-cases.js";

describe("native instruction-order JIT breadth cases", () => {
  it("remain setup-free characterization worlds with no closure or equivalence claims", () => {
    expect(() => new CompilerCaseCatalog(
      JIT_ORACLE_ORDER_CASES,
      [],
      COMPILER_OBLIGATION_CATALOG,
    )).not.toThrow();

    for (const candidate of JIT_ORACLE_ORDER_CASES) {
      expect(candidate.world.setups, candidate.id).toEqual([]);
      expect(candidate.world.registrations, candidate.id).toEqual([]);
      expect(candidate.effects, candidate.id).toEqual([]);
      expect(candidate.closure.every((claim) => claim.state === "not-claimed"), candidate.id).toBe(true);
      expect(candidate.oracles.claims, candidate.id).toEqual([]);
      expect(candidate.obligations.some((row) => row.id.startsWith("compiler.order.")), candidate.id).toBe(true);
      expect(candidate.obligations.some((row) =>
        row.id === "compiler.wire.property" && row.role === "runtime-consequence"
      ), candidate.id).toBe(true);
    }
  });

  it("runs every native-order permutation through the real JIT as one batch", async () => {
    const executor = new JitCompilerCaseExecutor();
    const oracle = createJitCompilerOracle();
    try {
      const result = await new BatchRunner(
        JIT_ORACLE_ORDER_CASES,
        (candidate, context: JitCompilerOracle) => executor.execute(candidate, context),
      ).run(oracle);

      expect(result.selectedCaseCount).toBe(JIT_ORACLE_ORDER_CASES.length);
      expect(result.passedCount).toBe(JIT_ORACLE_ORDER_CASES.length);
      expect(result.failedCount).toBe(0);
    } finally {
      oracle.dispose();
    }
  });
});
