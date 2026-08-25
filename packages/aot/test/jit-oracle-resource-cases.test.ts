import { describe, expect, it } from "vitest";
import { BatchRunner } from "../src/testing/batch-runner.js";
import { CompilerCaseCatalog } from "../src/testing/compiler-case-catalog.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";
import { JitCompilerCaseExecutor } from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle, type JitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_RESOURCE_CASES } from "../src/testing/jit-oracle-resource-cases.js";
import {
  JIT_ORACLE_SETUP_FACTORIES,
  JIT_ORACLE_SETUP_MATERIALIZERS,
} from "../src/testing/jit-oracle-setups.js";

describe("resource-backed JIT breadth cases", () => {
  it("declare single definition dependencies without invented effect or closure claims", () => {
    expect(() => new CompilerCaseCatalog(
      JIT_ORACLE_RESOURCE_CASES,
      JIT_ORACLE_SETUP_FACTORIES,
      COMPILER_OBLIGATION_CATALOG,
    )).not.toThrow();

    for (const candidate of JIT_ORACLE_RESOURCE_CASES) {
      expect(candidate.world.setups.length, candidate.id).toBeGreaterThan(0);
      expect(candidate.world.registrations.length, candidate.id).toBe(candidate.world.setups.length);
      expect(candidate.world.registrations.every((registration) =>
        registration.site === "definition-dependency" && registration.cardinality === "single"
      ), candidate.id).toBe(true);
      expect(candidate.effects, candidate.id).toEqual([]);
      expect(candidate.closure.every((claim) => claim.state === "not-claimed"), candidate.id).toBe(true);
    }
  });

  it("runs every focused resource case through the real JIT as one batch", async () => {
    const executor = new JitCompilerCaseExecutor(
      JIT_ORACLE_SETUP_FACTORIES,
      JIT_ORACLE_SETUP_MATERIALIZERS,
    );
    const oracle = createJitCompilerOracle();
    try {
      const result = await new BatchRunner(
        JIT_ORACLE_RESOURCE_CASES,
        (candidate, context: JitCompilerOracle) => executor.execute(candidate, context),
      ).run(oracle, { repeat: 2 });

      expect(result.selectedCaseCount).toBe(JIT_ORACLE_RESOURCE_CASES.length);
      expect(result.passedCount).toBe(JIT_ORACLE_RESOURCE_CASES.length * 2);
      expect(result.failedCount).toBe(0);
    } finally {
      oracle.dispose();
    }
  });
});
