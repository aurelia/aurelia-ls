import { describe, expect, it } from "vitest";
import { BatchRunner } from "../src/testing/batch-runner.js";
import { CompilerCaseCatalog } from "../src/testing/compiler-case-catalog.js";
import { COMPILER_CORPUS_FRAMEWORK_REVISION } from "../src/testing/compiler-case.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";
import {
  JitCompilerCaseExecutor,
  type JitCompilerSetupMaterialization,
  type JitCompilerSetupMaterializer,
  validateJitCharacterizationCases,
} from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle, type JitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_EXTENSION_CASES } from "../src/testing/jit-oracle-extension-cases.js";
import {
  JIT_ORACLE_EXTENSION_SETUP_FACTORIES,
  JIT_ORACLE_EXTENSION_SETUP_MATERIALIZERS,
} from "../src/testing/jit-oracle-extension-setups.js";

describe("dangerous compiler extension characterizations", () => {
  it("keeps executed effects open and runs fresh disposable setups through exact JIT invariants", async () => {
    const catalog = new CompilerCaseCatalog(
      JIT_ORACLE_EXTENSION_CASES,
      JIT_ORACLE_EXTENSION_SETUP_FACTORIES,
      COMPILER_OBLIGATION_CATALOG,
    );
    validateJitCharacterizationCases(catalog.cases);

    for (const candidate of catalog.cases) {
      expect(candidate.effects.length, candidate.id).toBeGreaterThan(0);
      expect(candidate.effects.every((effect) =>
        effect.oracle === "executed-by-framework" && effect.conservation === "open"
      ), candidate.id).toBe(true);
      expect(candidate.oracles.claims, candidate.id).toEqual([]);
      expect(candidate.provenance.every((authority) =>
        authority.repository === "aurelia" && authority.revision === COMPILER_CORPUS_FRAMEWORK_REVISION
      ), candidate.id).toBe(true);
      const extensionClosure = candidate.closure.find((claim) => claim.dimension === "compiler-extensions");
      expect(extensionClosure, candidate.id).toMatchObject({
        state: "open",
        blockerEffectIds: candidate.effects.map((effect) => effect.id),
      });
      expect(candidate.closure.find((claim) => claim.dimension === "extern-execution"), candidate.id)
        .toMatchObject({ state: "open" });
    }
    expect(catalog.obligationAudit.rows.find((row) => row.id === "compiler.extension.hooks"))
      .toMatchObject({ state: "witnessed-open" });
    expect(catalog.obligationAudit.rows.find((row) => row.id === "compiler.extension.process-content"))
      .toMatchObject({ state: "witnessed-open" });

    const events: string[] = [];
    const liveExports = new Set<unknown>();
    const seenExports = new Set<unknown>();
    let materialization = 0;
    const trackedMaterializers = JIT_ORACLE_EXTENSION_SETUP_MATERIALIZERS.map(
      (base): JitCompilerSetupMaterializer => ({
        factoryId: base.factoryId,
        async materialize(args, context): Promise<JitCompilerSetupMaterialization> {
          const value = await base.materialize(args, context);
          const exported = Object.values(value.exports)[0];
          if (exported == null || seenExports.has(exported)) {
            throw new Error(`${base.factoryId} did not materialize a fresh setup value.`);
          }
          seenExports.add(exported);
          liveExports.add(exported);
          const id = ++materialization;
          events.push(`materialize:${base.factoryId}:${id}`);
          let disposed = false;
          return {
            exports: value.exports,
            witness: value.witness,
            async dispose(): Promise<void> {
              if (disposed) {
                throw new Error(`${base.factoryId} setup ${id} was disposed twice.`);
              }
              disposed = true;
              await value.dispose?.();
              liveExports.delete(exported);
              events.push(`dispose:${base.factoryId}:${id}`);
            },
          };
        },
      }),
    );
    const executor = new JitCompilerCaseExecutor(
      JIT_ORACLE_EXTENSION_SETUP_FACTORIES,
      trackedMaterializers,
    );
    const oracle = createJitCompilerOracle();
    try {
      const result = await new BatchRunner(
        catalog.cases,
        (candidate, context: JitCompilerOracle) => executor.execute(candidate, context),
      ).run(oracle, { repeat: 2 });

      expect(result.failedCount).toBe(0);
      expect(result.executionCount).toBe(4);
      expect(materialization).toBe(6);
      expect(events.filter((event) => event.startsWith("materialize:"))).toHaveLength(6);
      expect(events.filter((event) => event.startsWith("dispose:"))).toHaveLength(6);
      expect(seenExports.size).toBe(6);
      expect(liveExports.size).toBe(0);
    } finally {
      oracle.dispose();
    }
  });
});
