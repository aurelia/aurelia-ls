import {
  itLetBinding,
  itSetClassAttribute,
  itTextBinding,
  type HydrateElementInstruction,
  type HydrateLetElementInstruction,
} from "@aurelia/template-compiler";
import { describe, expect, it } from "vitest";
import { BatchRunner } from "../src/testing/batch-runner.js";
import { CompilerCaseCatalog } from "../src/testing/compiler-case-catalog.js";
import type { CompilerCase } from "../src/testing/compiler-case.js";
import {
  JitCompilerCaseExecutor,
  validateJitCharacterizationCases,
} from "../src/testing/jit-compiler-case-executor.js";
import {
  createJitCompilerOracle,
  type JitCompilerExecution,
  type JitCompilerOracle,
} from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_BREADTH_CASES } from "../src/testing/jit-oracle-breadth-cases.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";

describe("setup-free JIT oracle breadth cases", () => {
  it("admits source-mined worlds without setup factories or conservation claims", () => {
    const catalog = new CompilerCaseCatalog(
      JIT_ORACLE_BREADTH_CASES,
      [],
      COMPILER_OBLIGATION_CATALOG,
    );

    validateJitCharacterizationCases(catalog.cases);
    expect(catalog.cases).toHaveLength(11);
    expect(catalog.cases.every((candidate) => candidate.world.setups.length === 0)).toBe(true);
    expect(catalog.cases.every((candidate) => candidate.world.registrations.length === 0)).toBe(true);
    expect(catalog.cases.every((candidate) => candidate.oracles.claims.length === 0)).toBe(true);
    const auSlotCase = catalog.cases.find((candidate) => candidate.id === "projection.au-slot.interpolation-fallback");
    expect(catalog.cases.filter((candidate) => candidate !== auSlotCase).every((candidate) =>
      candidate.closure.every((claim) => claim.state === "not-claimed")
    )).toBe(true);
    expect(auSlotCase?.effects)
      .toEqual([expect.objectContaining({
        id: "effect.framework.au-slot-process-content",
        conservation: "open",
      })]);
    expect(auSlotCase?.closure.find((claim) => claim.dimension === "compiler-extensions")).toMatchObject({
      state: "open",
      blockerEffectIds: ["effect.framework.au-slot-process-content"],
    });
  });

  it("runs the breadth batch through isolated StandardConfiguration worlds", async () => {
    const executor = new JitCompilerCaseExecutor();
    const oracle = createJitCompilerOracle();
    try {
      const result = await new BatchRunner(
        JIT_ORACLE_BREADTH_CASES,
        (candidate, context: JitCompilerOracle) => executor.execute(candidate, context),
      ).run(oracle);

      expect(result.executionCount).toBe(JIT_ORACLE_BREADTH_CASES.length);
      expect(result.passedCount).toBe(JIT_ORACLE_BREADTH_CASES.length);
      expect(result.failedCount).toBe(0);
    } finally {
      oracle.dispose();
    }
  });

  it("retains nested fallback, let, and flat surrogate products beyond the generic selectors", async () => {
    const executor = new JitCompilerCaseExecutor();
    const oracle = createJitCompilerOracle();
    try {
      const auSlot = await compileCase("projection.au-slot.interpolation-fallback", executor, oracle);
      const auSlotInstruction = auSlot.compiled.instructions[0]![0] as HydrateElementInstruction;
      const fallback = auSlotInstruction.projections?.default;
      expect((fallback?.template as HTMLTemplateElement).outerHTML)
        .toBe("<template><!--au--> </template>");
      expect(fallback?.instructions).toEqual([[
        { type: itTextBinding, from: accessScope("message") },
      ]]);

      const letCase = await compileCase("let.bind-interpolation", executor, oracle);
      const letInstruction = letCase.compiled.instructions[0]![0] as HydrateLetElementInstruction;
      expect(letInstruction.instructions).toEqual([
        { type: itLetBinding, from: accessScope("b"), to: "a" },
        { type: itLetBinding, from: interpolation("d"), to: "c" },
      ]);

      const surrogate = await compileCase("surrogate.static-class", executor, oracle);
      expect(surrogate.compiled.surrogates).toEqual([
        { type: itSetClassAttribute, value: "h-100" },
      ]);
    } finally {
      oracle.dispose();
    }
  });
});

async function compileCase(
  id: string,
  executor: JitCompilerCaseExecutor,
  oracle: JitCompilerOracle,
): Promise<JitCompilerExecution> {
  const candidate = requireCase(id);
  const execution = await executor.execute(candidate, oracle);
  if (execution == null || !("compiled" in execution)) {
    throw new Error(`Compiler case ${id} did not return a compiled definition.`);
  }
  return execution as JitCompilerExecution;
}

function requireCase(id: string): CompilerCase {
  const candidate = JIT_ORACLE_BREADTH_CASES.find((entry) => entry.id === id);
  if (candidate == null) {
    throw new Error(`Unknown breadth compiler case ${id}.`);
  }
  return candidate;
}

function accessScope(name: string) {
  return { $kind: "AccessScope", name, ancestor: 0 } as const;
}

function interpolation(name: string) {
  const expression = accessScope(name);
  return {
    $kind: "Interpolation",
    isMulti: false,
    firstExpression: expression,
    parts: ["", ""],
    expressions: [expression],
  } as const;
}
