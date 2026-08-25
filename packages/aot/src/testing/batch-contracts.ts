/** Optional named-stage timing returned by one batched case execution. */
export interface BatchCaseExecution {
  readonly stages?: Readonly<Record<string, number>>;
}

/** One independently attributable case executed by a batched harness. */
export interface BatchCase<TContext> {
  readonly id: string;
  readonly family: string;
  readonly tags: readonly string[];
  readonly requirement: string;
  run(context: TContext): void | BatchCaseExecution | Promise<void | BatchCaseExecution>;
}

/** Stable zero-based shard selection for separate runner processes. */
export interface BatchShard {
  readonly index: number;
  readonly count: number;
}

/** Progress event emitted only when an interactive caller opts in. */
export interface BatchProgressEvent {
  readonly id: string;
  readonly iteration: number;
  readonly execution: number;
  readonly executionCount: number;
  readonly phase: "start" | "passed" | "failed";
}

/** Selection, repetition, and bounded-report policy for one batch. */
export interface BatchRunOptions {
  readonly idPatterns?: readonly string[];
  readonly families?: ReadonlySet<string>;
  readonly tags?: ReadonlySet<string>;
  readonly query?: string;
  readonly shard?: BatchShard;
  readonly repeat?: number;
  readonly executionLimit?: number;
  readonly failFast?: boolean;
  readonly failureLimit?: number;
  readonly failureDetailCharacterLimit?: number;
  readonly capturedLogCharacterLimit?: number;
  readonly onProgress?: (event: BatchProgressEvent) => void;
}

/** Bounded serializable failure retained by a batch result. */
export interface BatchFailure {
  readonly id: string;
  readonly family: string;
  readonly iteration: number;
  readonly durationMs: number;
  readonly errorName: string;
  readonly message: string;
  readonly stack: readonly string[];
  readonly logs: readonly string[];
  readonly logsTruncated: boolean;
}

/** Distribution used for cold/warm and outlier-aware timing inspection. */
export interface BatchTimingDistribution {
  readonly samples: number;
  readonly coldMs: number;
  readonly minMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly totalMs: number;
  readonly averageMs: number;
}

export type BatchCaseOutcome = "passed" | "failed" | "mixed" | "not-run";

/** Compact per-case aggregate; one row survives regardless of repeat count. */
export interface BatchCaseResult {
  readonly id: string;
  readonly family: string;
  readonly tags: readonly string[];
  readonly outcome: BatchCaseOutcome;
  readonly executionCount: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly timing: BatchTimingDistribution | null;
  readonly stages: Readonly<Record<string, BatchTimingDistribution>>;
}

/** Compact result intended for terminal and versioned JSON receipt projection. */
export interface BatchRunResult {
  readonly discoveredCaseCount: number;
  readonly eligibleCaseCount: number;
  readonly selectedCaseCount: number;
  readonly executionCount: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly suppressedFailureCount: number;
  readonly durationMs: number;
  readonly failures: readonly BatchFailure[];
  readonly caseResults: readonly BatchCaseResult[];
  readonly stages: Readonly<Record<string, BatchTimingDistribution>>;
}

/** Deterministic preflight result before the expensive shared context is created. */
export interface BatchCasePlan<TContext> {
  readonly discoveredCaseCount: number;
  readonly eligible: readonly BatchCase<TContext>[];
  readonly selected: readonly BatchCase<TContext>[];
}
