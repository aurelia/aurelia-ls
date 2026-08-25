import type {
  BatchCase,
  BatchCaseOutcome,
  BatchCaseResult,
  BatchTimingDistribution,
} from "./batch-contracts.js";

/** Mutable timing owner for one case across repeat executions. */
export class BatchCaseAggregate<TContext> {
  readonly #candidate: BatchCase<TContext>;
  readonly #durations: number[] = [];
  readonly #stages = new StageTimingAccumulator();
  #passedCount = 0;
  #failedCount = 0;

  public constructor(candidate: BatchCase<TContext>) {
    this.#candidate = candidate;
  }

  public recordPassed(durationMs: number, stages: Readonly<Record<string, number>>): void {
    this.#durations.push(durationMs);
    ++this.#passedCount;
    this.#stages.addAll(stages);
  }

  public recordFailed(durationMs: number): void {
    this.#durations.push(durationMs);
    ++this.#failedCount;
  }

  public toResult(): BatchCaseResult {
    const executionCount = this.#passedCount + this.#failedCount;
    const outcome: BatchCaseOutcome = executionCount === 0
      ? "not-run"
      : this.#failedCount === 0
        ? "passed"
        : this.#passedCount === 0
          ? "failed"
          : "mixed";
    return {
      id: this.#candidate.id,
      family: this.#candidate.family,
      tags: this.#candidate.tags,
      outcome,
      executionCount,
      passedCount: this.#passedCount,
      failedCount: this.#failedCount,
      timing: this.#durations.length === 0 ? null : timingDistribution(this.#durations),
      stages: this.#stages.toDistributions(),
    };
  }
}

/** Named-stage timing owner shared across all selected cases. */
export class StageTimingAccumulator {
  readonly #samples = new Map<string, number[]>();

  public addAll(stages: Readonly<Record<string, number>>): void {
    for (const [stage, milliseconds] of Object.entries(stages)) {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) {
        throw new Error(`Invalid timing for stage ${stage}: ${milliseconds}.`);
      }
      const existing = this.#samples.get(stage);
      if (existing == null) {
        this.#samples.set(stage, [milliseconds]);
      } else {
        existing.push(milliseconds);
      }
    }
  }

  public toDistributions(): Readonly<Record<string, BatchTimingDistribution>> {
    return Object.fromEntries(
      [...this.#samples.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([stage, values]) => [stage, timingDistribution(values)]),
    );
  }
}

function timingDistribution(samples: readonly number[]): BatchTimingDistribution {
  // Preserve insertion order for the cold sample while sorting a separate view for percentiles.
  const sorted = [...samples].sort((left, right) => left - right);
  const totalMs = samples.reduce((sum, value) => sum + value, 0);
  return {
    samples: samples.length,
    coldMs: samples[0]!,
    minMs: sorted[0]!,
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1)!,
    totalMs,
    averageMs: totalMs / samples.length,
  };
}

function percentile(sorted: readonly number[], percentileValue: number): number {
  const index = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1);
  return sorted[index]!;
}
