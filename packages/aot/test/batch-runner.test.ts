import { describe, expect, it } from "vitest";
import { BatchRunner, type BatchCaseDescriptor } from "../src/testing/batch-runner.js";

interface TestBatchCase extends BatchCaseDescriptor {
  readonly operation: string;
  readonly failure?: string;
}

describe("AOT batched harness", () => {
  it("keeps case data separate from execution while filtering and repeating", async () => {
    const visits: string[] = [];
    const cases: readonly TestBatchCase[] = [
      testCase("alpha.binding", "binding", "binding", "alpha"),
      testCase("beta.static", "static", "static", "beta"),
    ];
    const runner = new BatchRunner(cases, (candidate, context: string[]) => {
      context.push(candidate.operation);
    });

    const result = await runner.run(visits, { families: new Set(["binding"]), repeat: 3 });

    expect(visits).toEqual(["alpha", "alpha", "alpha"]);
    expect(result.selectedCaseCount).toBe(1);
    expect(result.executionCount).toBe(3);
    expect(result.passedCount).toBe(3);
    expect(result.failedCount).toBe(0);
  });

  it("uses stable shards and bounds retained failures", async () => {
    const cases: readonly TestBatchCase[] = [
      failingCase("case.one", "one"),
      failingCase("case.two", "two"),
      failingCase("case.three", "three"),
    ];
    const shard = { index: 0, count: 2 } as const;
    const runner = new BatchRunner(cases, executeTestCase);
    const selectedIds = runner.plan({ shard }).selected.map((candidate) => candidate.id);

    expect(runner.plan({ shard }).selected.map((candidate) => candidate.id)).toEqual(selectedIds);

    const result = await runner.run(undefined, { failureLimit: 20, repeat: 3 });
    expect(result.failedCount).toBe(9);
    expect(result.failures).toHaveLength(3);
    expect(result.suppressedFailureCount).toBe(6);
    expect(result.failures[0]?.logs[0]).toContain("case.one");
  });

  it("fails preflight for unknown filters and empty selections", async () => {
    const cases: readonly TestBatchCase[] = [testCase("known.case", "known", "known", "known")];
    const runner = new BatchRunner(cases, executeTestCase);

    expect(() => runner.plan({ families: new Set(["missing"]) })).toThrow("Unknown batch family");
    await expect(runner.run(undefined, { idPatterns: ["missing"] })).rejects.toThrow(
      "matched zero cases",
    );
    expect(() => runner.plan({ idPatterns: [""] })).toThrow("non-blank");
  });

  it("accepts an empty stable shard when pre-shard filters matched", async () => {
    const cases: readonly TestBatchCase[] = [testCase("shard.case", "shard", "shard", "shard")];
    const runner = new BatchRunner(cases, executeTestCase);
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

  it("bounds planned executions before invoking the executor", async () => {
    const cases: readonly TestBatchCase[] = [testCase("budget.case", "budget", "budget", "budget")];
    let executions = 0;
    const runner = new BatchRunner(cases, () => { ++executions; });

    await expect(runner.run(undefined, { repeat: 3, executionLimit: 2 })).rejects.toThrow(
      "exceeding the limit",
    );
    expect(executions).toBe(0);
  });
});

function testCase(id: string, family: string, tag: string, operation: string): TestBatchCase {
  return {
    id,
    family,
    tags: [tag],
    requirement: `${id} exercises the generic batch executor boundary.`,
    operation,
  };
}

function failingCase(id: string, message: string): TestBatchCase {
  return {
    ...testCase(id, "failure", "failure", "fail"),
    failure: message,
  };
}

function executeTestCase(candidate: TestBatchCase): void {
  if (candidate.failure != null) {
    console.warn(`before ${candidate.id}`);
    throw new Error(candidate.failure);
  }
}
