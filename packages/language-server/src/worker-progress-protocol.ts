/** Transport-local operational evidence; never an LSP request or semantic answer. */
export const AURELIA_WORKER_PROGRESS_SCHEMA = "aurelia-worker-progress/1" as const;
export const AURELIA_WORKER_PROGRESS_PHASES = [
  "worker-startup", "static-evaluation", "evaluation-session-fork", "type-system", "resource-recognition", "resource-index",
  "configuration-recognition", "app-world-composition", "template-compilation", "runtime-rendering",
  "scope-construction", "binding-data-flow", "runtime-expression-access-use", "other",
] as const;
export type AureliaWorkerProgressPhase = typeof AURELIA_WORKER_PROGRESS_PHASES[number];

export interface AureliaWorkerProgressSnapshot {
  readonly sequence: number;
  readonly elapsedMilliseconds: number;
  readonly phase: AureliaWorkerProgressPhase;
  readonly status: "started" | "completed" | "failed";
  /** Worker-isolate values. RSS would describe the shared Extension Host process. */
  readonly heapUsedBytes: number;
  readonly heapTotalBytes: number;
  readonly heapLimitBytes: number;
  readonly externalBytes: number;
  readonly omittedEventCount: number;
}

export interface AureliaWorkerProgressMessage {
  readonly aureliaWorkerProgress: typeof AURELIA_WORKER_PROGRESS_SCHEMA;
  readonly snapshot: AureliaWorkerProgressSnapshot;
}

export function isAureliaWorkerProgressMessage(value: unknown): value is AureliaWorkerProgressMessage {
  return value != null && typeof value === "object"
    && !("jsonrpc" in value)
    && "aureliaWorkerProgress" in value
    && value.aureliaWorkerProgress === AURELIA_WORKER_PROGRESS_SCHEMA;
}

/** Project the wire value at ingress so added fields cannot retain source text in the host. */
export function readAureliaWorkerProgressSnapshot(value: unknown): AureliaWorkerProgressSnapshot | null {
  if (value == null || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!AURELIA_WORKER_PROGRESS_PHASES.includes(row.phase as AureliaWorkerProgressPhase)
    || !["started", "completed", "failed"].includes(row.status as string)) return null;
  const numbers = ["sequence", "elapsedMilliseconds", "heapUsedBytes", "heapTotalBytes", "heapLimitBytes",
    "externalBytes", "omittedEventCount"] as const;
  for (const key of numbers) {
    if (typeof row[key] !== "number" || !Number.isSafeInteger(row[key]) || row[key] < 0) return null;
  }
  return {
    sequence: row.sequence as number,
    elapsedMilliseconds: row.elapsedMilliseconds as number,
    phase: row.phase as AureliaWorkerProgressPhase,
    status: row.status as AureliaWorkerProgressSnapshot["status"],
    heapUsedBytes: row.heapUsedBytes as number,
    heapTotalBytes: row.heapTotalBytes as number,
    heapLimitBytes: row.heapLimitBytes as number,
    externalBytes: row.externalBytes as number,
    omittedEventCount: row.omittedEventCount as number,
  };
}
