import { getHeapStatistics } from "node:v8";
import { observeSemanticRuntimePhases, type SemanticRuntimePhaseProgress } from "@aurelia-ls/semantic-runtime";
import {
  AURELIA_WORKER_PROGRESS_PHASES,
  AURELIA_WORKER_PROGRESS_SCHEMA,
  type AureliaWorkerProgressMessage,
  type AureliaWorkerProgressPhase,
} from "./worker-progress-protocol.js";

const SAMPLE_INTERVAL_MS = 250;

export interface WorkerProgressOptions {
  readonly now?: () => number;
  readonly readHeap?: () => Pick<ReturnType<typeof getHeapStatistics>,
    "used_heap_size" | "total_heap_size" | "heap_size_limit" | "external_memory">;
}

/** Sends bounded samples synchronously at phase boundaries, including while the Worker event loop is busy. */
export function installWorkerProgress(
  publish: (message: AureliaWorkerProgressMessage) => void,
  options: WorkerProgressOptions = {},
): () => void {
  const now = options.now ?? (() => performance.now());
  const readHeap = options.readHeap ?? getHeapStatistics;
  const started = now();
  // At most three first samples per fixed phase; subsequent traffic is limited to four samples per second.
  const firstSamples = new Set<string>();
  let lastPublished = -Infinity;
  let sequence = 0;
  let omittedEventCount = 0;
  let pending: { phase: AureliaWorkerProgressPhase; status: SemanticRuntimePhaseProgress } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  const flush = (): void => {
    if (disposed || pending == null) return;
    if (timer != null) clearTimeout(timer);
    timer = null;
    const sample = pending;
    pending = null;
    try {
      const heap = readHeap();
      const at = now();
      publish({
        aureliaWorkerProgress: AURELIA_WORKER_PROGRESS_SCHEMA,
        snapshot: {
          sequence: ++sequence,
          elapsedMilliseconds: Math.max(0, Math.round(at - started)),
          ...sample,
          heapUsedBytes: heap.used_heap_size,
          heapTotalBytes: heap.total_heap_size,
          heapLimitBytes: heap.heap_size_limit,
          externalBytes: heap.external_memory,
          omittedEventCount,
        },
      });
      lastPublished = at;
    } catch {
      // A closing transport or failed sample must never interrupt the compiler.
    }
  };
  const observe = (name: string, status: SemanticRuntimePhaseProgress): void => {
    if (disposed) return;
    const phase = AURELIA_WORKER_PROGRESS_PHASES.includes(name as AureliaWorkerProgressPhase)
      ? name as AureliaWorkerProgressPhase : "other";
    if (pending != null) omittedEventCount += 1;
    pending = { phase, status };
    const key = `${phase}:${status}`;
    if (!firstSamples.has(key) || now() - lastPublished >= SAMPLE_INTERVAL_MS) {
      firstSamples.add(key);
      flush();
    } else if (timer == null) {
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, SAMPLE_INTERVAL_MS);
      timer.unref();
    }
  };
  const stopObserving = observeSemanticRuntimePhases(observe);
  observe("worker-startup", "started");
  return () => {
    disposed = true;
    stopObserving();
    pending = null;
    if (timer != null) clearTimeout(timer);
  };
}
