import { performance } from "node:perf_hooks";
import { BatchCaseRegistry } from "./batch-case-registry.js";
import { batchFailure, executeWithCapturedConsole, failureCharacterCount } from "./batch-case-execution.js";
import { BatchCaseAggregate, StageTimingAccumulator } from "./batch-timing.js";
import type {
  BatchCaseDescriptor,
  BatchCaseExecutor,
  BatchCasePlan,
  BatchCaseSearchTerms,
  BatchFailure,
  BatchRunOptions,
  BatchRunResult,
} from "./batch-contracts.js";

export type {
  BatchCaseDescriptor,
  BatchCaseExecution,
  BatchCaseExecutor,
  BatchCaseOutcome,
  BatchCasePlan,
  BatchCaseSearchTerms,
  BatchCaseResult,
  BatchFailure,
  BatchProgressEvent,
  BatchRunOptions,
  BatchRunResult,
  BatchShard,
  BatchTimingDistribution,
} from "./batch-contracts.js";

/** Validated registry plus sequential execution owner for one batched harness family. */
export class BatchRunner<TCase extends BatchCaseDescriptor, TContext> {
  readonly #registry: BatchCaseRegistry<TCase>;
  readonly #execute: BatchCaseExecutor<TCase, TContext>;

  public constructor(
    cases: readonly TCase[],
    execute: BatchCaseExecutor<TCase, TContext>,
    searchTerms: BatchCaseSearchTerms<TCase> = () => [],
  ) {
    this.#registry = new BatchCaseRegistry(cases, searchTerms);
    this.#execute = execute;
  }

  public plan(options: BatchRunOptions = {}): BatchCasePlan<TCase> {
    return this.#registry.plan(options);
  }

  public async run(context: TContext, options: BatchRunOptions = {}): Promise<BatchRunResult> {
    const plan = this.#registry.plan(options);
    if (plan.eligible.length === 0) {
      throw new Error("Batch selection matched zero cases.");
    }

    const repeat = positiveInteger(options.repeat, 1, "repeat");
    const executionLimit = positiveInteger(options.executionLimit, 100_000, "executionLimit");
    const plannedExecutionCount = plan.selected.length * repeat;
    if (!Number.isSafeInteger(plannedExecutionCount) || plannedExecutionCount > executionLimit) {
      throw new Error(
        `Batch plan requires ${plannedExecutionCount} executions, exceeding the limit of ${executionLimit}.`,
      );
    }
    if (plan.selected.length === 0) {
      return emptyBatchResult(plan);
    }

    const failureLimit = nonNegativeInteger(options.failureLimit, 20, "failureLimit");
    const failureDetailLimit = nonNegativeInteger(
      options.failureDetailCharacterLimit,
      64 * 1024,
      "failureDetailCharacterLimit",
    );
    const logLimit = nonNegativeInteger(
      options.capturedLogCharacterLimit,
      16 * 1024,
      "capturedLogCharacterLimit",
    );
    const failures: BatchFailure[] = [];
    const detailedFailureCaseIds = new Set<string>();
    const aggregates = new Map(
      plan.selected.map((candidate) => [candidate.id, new BatchCaseAggregate(candidate)]),
    );
    const stageTimings = new StageTimingAccumulator();
    let failureDetailCharacters = 0;
    let executionCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    const batchStartedAt = performance.now();

    executionLoop:
    for (let iteration = 1; iteration <= repeat; ++iteration) {
      for (const candidate of plan.selected) {
        const execution = executionCount + 1;
        options.onProgress?.({
          id: candidate.id,
          iteration,
          execution,
          executionCount: plannedExecutionCount,
          phase: "start",
        });
        const startedAt = performance.now();
        const captured = await executeWithCapturedConsole(() => this.#execute(candidate, context), logLimit);
        const durationMs = performance.now() - startedAt;
        ++executionCount;
        const aggregate = aggregates.get(candidate.id)!;

        if (captured.outcome === "passed") {
          const stages = captured.value?.stages ?? {};
          aggregate.recordPassed(durationMs, stages);
          stageTimings.addAll(stages);
          ++passedCount;
          options.onProgress?.({
            id: candidate.id,
            iteration,
            execution,
            executionCount: plannedExecutionCount,
            phase: "passed",
          });
          continue;
        }

        aggregate.recordFailed(durationMs);
        ++failedCount;
        const remainingDetailCharacters = failureDetailLimit - failureDetailCharacters;
        if (
          !detailedFailureCaseIds.has(candidate.id)
          && failures.length < failureLimit
          && remainingDetailCharacters > 128
        ) {
          const failure = batchFailure(candidate, iteration, durationMs, captured, remainingDetailCharacters);
          failureDetailCharacters += failureCharacterCount(failure);
          failures.push(failure);
          detailedFailureCaseIds.add(candidate.id);
        }
        options.onProgress?.({
          id: candidate.id,
          iteration,
          execution,
          executionCount: plannedExecutionCount,
          phase: "failed",
        });
        if (options.failFast === true) {
          break executionLoop;
        }
      }
    }

    return {
      discoveredCaseCount: plan.discoveredCaseCount,
      eligibleCaseCount: plan.eligible.length,
      selectedCaseCount: plan.selected.length,
      executionCount,
      passedCount,
      failedCount,
      suppressedFailureCount: Math.max(0, failedCount - failures.length),
      durationMs: performance.now() - batchStartedAt,
      failures,
      caseResults: plan.selected.map((candidate) => aggregates.get(candidate.id)!.toResult()),
      stages: stageTimings.toDistributions(),
    };
  }
}

function emptyBatchResult<TCase extends BatchCaseDescriptor>(plan: BatchCasePlan<TCase>): BatchRunResult {
  return {
    discoveredCaseCount: plan.discoveredCaseCount,
    eligibleCaseCount: plan.eligible.length,
    selectedCaseCount: 0,
    executionCount: 0,
    passedCount: 0,
    failedCount: 0,
    suppressedFailureCount: 0,
    durationMs: 0,
    failures: [],
    caseResults: [],
    stages: {},
  };
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  const selected = value ?? fallback;
  if (!Number.isSafeInteger(selected) || selected < 1) {
    throw new Error(`${name} must be a positive integer; received ${selected}.`);
  }
  return selected;
}

function nonNegativeInteger(value: number | undefined, fallback: number, name: string): number {
  const selected = value ?? fallback;
  if (!Number.isSafeInteger(selected) || selected < 0) {
    throw new Error(`${name} must be a non-negative integer; received ${selected}.`);
  }
  return selected;
}
