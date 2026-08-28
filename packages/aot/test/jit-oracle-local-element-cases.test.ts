import { describe, expect, test } from "vitest";

import { BatchRunner } from "../src/testing/batch-runner.js";
import { CompilerCaseCatalog } from "../src/testing/compiler-case-catalog.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";
import { JitCompilerCaseExecutor } from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_LOCAL_ELEMENT_CASES } from "../src/testing/jit-oracle-local-element-cases.js";
import {
  JIT_ORACLE_SETUP_FACTORIES,
  JIT_ORACLE_SETUP_MATERIALIZERS,
} from "../src/testing/jit-oracle-setups.js";

describe("local-element JIT breadth cases", () => {
  test("declare a broad source-backed local-element cohort", () => {
    expect(() => new CompilerCaseCatalog(
      JIT_ORACLE_LOCAL_ELEMENT_CASES,
      JIT_ORACLE_SETUP_FACTORIES,
      COMPILER_OBLIGATION_CATALOG,
    )).not.toThrow();
    expect(JIT_ORACLE_LOCAL_ELEMENT_CASES.map((candidate) => candidate.id)).toEqual([
      "local.hoisted-bindables",
      "local.peer-owner-closure",
      "local.recursive-nesting",
      "local.use-site-controller-chain",
    ]);
    expect(JIT_ORACLE_LOCAL_ELEMENT_CASES.every((candidate) => {
      if (candidate.world.entry.kind !== "compile") return false;
      return candidate.world.entry.entryType?.kind === "entry-custom-element-type";
    })).toBe(true);

    const peer = JIT_ORACLE_LOCAL_ELEMENT_CASES.find((candidate) =>
      candidate.id === "local.peer-owner-closure"
    );
    if (peer?.world.entry.kind !== "compile") throw new Error("Expected the peer local compile entry.");
    const competingType = peer.world.registrations[0]?.value;
    if (competingType == null) throw new Error("Expected the peer source dependency reference.");
    const competing = {
      ...peer,
      world: {
        ...peer.world,
        entry: {
          ...peer.world.entry,
          definition: { ...peer.world.entry.definition, Type: competingType },
        },
      },
    };
    expect(() => new CompilerCaseCatalog(
      JIT_ORACLE_LOCAL_ELEMENT_CASES.map((candidate) => candidate === peer ? competing : candidate),
      JIT_ORACLE_SETUP_FACTORIES,
      COMPILER_OBLIGATION_CATALOG,
    )).toThrow(/competing entry Type carrier/u);
  });

  test("runs every local-element case through the real JIT as one batch", async () => {
    const executor = new JitCompilerCaseExecutor(
      JIT_ORACLE_SETUP_FACTORIES,
      JIT_ORACLE_SETUP_MATERIALIZERS,
    );
    const oracle = createJitCompilerOracle();
    try {
      const result = await new BatchRunner(
        JIT_ORACLE_LOCAL_ELEMENT_CASES,
        (candidate) => executor.execute(candidate, oracle),
      ).run(undefined, { repeat: 2 });
      expect(result.selectedCaseCount).toBe(JIT_ORACLE_LOCAL_ELEMENT_CASES.length);
      expect(result.passedCount).toBe(JIT_ORACLE_LOCAL_ELEMENT_CASES.length * 2);
      expect(result.failedCount).toBe(0);
    } finally {
      oracle.dispose();
    }
  });
});
