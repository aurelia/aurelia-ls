import { describe, expect, it } from "vitest";
import { BatchRunner, type BatchCase } from "../src/testing/batch-runner.js";

describe("AOT batched harness", () => {
  it("filters and repeats cases without registering one test per execution", async () => {
    const visits: string[] = [];
    const cases: readonly BatchCase<string[]>[] = [
      {
        id: "alpha.binding",
        family: "binding",
        tags: ["binding"],
        requirement: "Alpha runs.",
        run: (context) => { context.push("alpha"); },
      },
      {
        id: "beta.static",
        family: "static",
        tags: ["static"],
        requirement: "Beta runs.",
        run: (context) => { context.push("beta"); },
      },
    ];

    const result = await new BatchRunner(cases).run(visits, { families: new Set(["binding"]), repeat: 3 });

    expect(visits).toEqual(["alpha", "alpha", "alpha"]);
    expect(result.selectedCaseCount).toBe(1);
    expect(result.executionCount).toBe(3);
    expect(result.passedCount).toBe(3);
    expect(result.failedCount).toBe(0);
  });

  it("uses stable shards and bounds retained failures", async () => {
    const cases: readonly BatchCase<void>[] = [
      failingCase("case.one", "one"),
      failingCase("case.two", "two"),
      failingCase("case.three", "three"),
    ];
    const shard = { index: 0, count: 2 } as const;
    const runner = new BatchRunner(cases);
    const selectedIds = runner.plan({ shard }).selected.map((candidate) => candidate.id);

    expect(runner.plan({ shard }).selected.map((candidate) => candidate.id)).toEqual(selectedIds);

    const result = await runner.run(undefined, { failureLimit: 20, repeat: 3 });
    expect(result.failedCount).toBe(9);
    expect(result.failures).toHaveLength(3);
    expect(result.suppressedFailureCount).toBe(6);
    expect(result.failures[0]?.logs[0]).toContain("case.one");
  });

  it("fails preflight for unknown filters and empty selections", async () => {
    const cases: readonly BatchCase<void>[] = [{
      id: "known.case",
      family: "known",
      tags: ["known"],
      requirement: "The known case runs.",
      run: () => {},
    }];

    const runner = new BatchRunner(cases);
    expect(() => runner.plan({ families: new Set(["missing"]) })).toThrow("Unknown batch family");
    await expect(runner.run(undefined, { idPatterns: ["missing"] })).rejects.toThrow(
      "matched zero cases",
    );
    expect(() => runner.plan({ idPatterns: [""] })).toThrow("non-blank");
  });

  it("accepts an empty stable shard when pre-shard filters matched", async () => {
    const cases: readonly BatchCase<void>[] = [{
      id: "shard.case",
      family: "shard",
      tags: ["shard"],
      requirement: "A valid shard may receive no cases.",
      run: () => {},
    }];
    const runner = new BatchRunner(cases);
    const emptyShard = Array.from({ length: 8 }, (_, index) => ({ index, count: 8 } as const))
      .find((shard) => runner.plan({ shard }).selected.length === 0);
    expect(emptyShard).toBeDefined();

    const result = await runner.run(undefined, {
      shard: emptyShard,
      repeat: 100_001,
      executionLimit: 100_000,
    });
    expect(result.eligibleCaseCount).toBe(1);
    expect(result.selectedCaseCount).toBe(0);
    expect(result.executionCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  it("bounds planned executions before running a case", async () => {
    const cases: readonly BatchCase<void>[] = [{
      id: "budget.case",
      family: "budget",
      tags: ["budget"],
      requirement: "Execution count is bounded.",
      run: () => {},
    }];

    await expect(new BatchRunner(cases).run(undefined, { repeat: 3, executionLimit: 2 })).rejects.toThrow(
      "exceeding the limit",
    );
  });
});

function failingCase(id: string, message: string): BatchCase<void> {
  return {
    id,
    family: "failure",
    tags: ["failure"],
    requirement: `${id} fails for the harness contract.`,
    run: () => {
      console.warn(`before ${id}`);
      throw new Error(message);
    },
  };
}
