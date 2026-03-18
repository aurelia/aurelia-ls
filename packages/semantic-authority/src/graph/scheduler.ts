import type { NodeKey } from "./keys.js";
import type { GraphPullResult } from "./pull.js";

export type GraphPullPriority = "background" | "cursor-time" | "file-save";

export interface GraphPullExecutor {
  pullNode(nodeKey: NodeKey): Promise<GraphPullResult>;
}

export interface GraphPullSchedulerOptions {
  readonly now?: () => number;
  readonly pullExecutor: GraphPullExecutor;
  readonly yieldAfterMilliseconds?: number;
  readonly yieldAfterTaskCount?: number;
  readonly yieldControl?: () => Promise<void>;
}

interface QueuedPullTask {
  readonly key: string;
  readonly nodeKey: NodeKey;
  priority: GraphPullPriority;
  readonly promise: Promise<GraphPullResult>;
  reject(error: unknown): void;
  resolve(result: GraphPullResult): void;
  state: "queued" | "running";
}

const DEFAULT_PRIORITY_ORDER: readonly GraphPullPriority[] = [
  "cursor-time",
  "file-save",
  "background",
];

const DEFAULT_YIELD_AFTER_MILLISECONDS = 10;
const DEFAULT_YIELD_AFTER_TASK_COUNT = 50;

export class GraphPullScheduler {
  readonly #now: () => number;
  readonly #pullExecutor: GraphPullExecutor;
  #processing = false;
  readonly #queues = new Map<GraphPullPriority, QueuedPullTask[]>(
    DEFAULT_PRIORITY_ORDER.map((priority) => [priority, []]),
  );
  readonly #tasksByKey = new Map<string, QueuedPullTask>();
  readonly #yieldAfterMilliseconds: number;
  readonly #yieldAfterTaskCount: number;
  readonly #yieldControl: () => Promise<void>;

  public constructor(options: GraphPullSchedulerOptions) {
    this.#now = options.now ?? (() => Date.now());
    this.#pullExecutor = options.pullExecutor;
    this.#yieldAfterMilliseconds =
      options.yieldAfterMilliseconds ?? DEFAULT_YIELD_AFTER_MILLISECONDS;
    this.#yieldAfterTaskCount =
      options.yieldAfterTaskCount ?? DEFAULT_YIELD_AFTER_TASK_COUNT;
    this.#yieldControl =
      options.yieldControl ??
      (() =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
        }));
  }

  public get queuedTaskCount(): number {
    let total = 0;
    for (const queue of this.#queues.values()) {
      total += queue.length;
    }

    return total;
  }

  public requestBackground(nodeKey: NodeKey): Promise<GraphPullResult> {
    return this.#schedule(nodeKey, "background");
  }

  public requestCursorTime(nodeKey: NodeKey): Promise<GraphPullResult> {
    return this.#schedule(nodeKey, "cursor-time");
  }

  public requestFileSave(nodeKey: NodeKey): Promise<GraphPullResult> {
    return this.#schedule(nodeKey, "file-save");
  }

  public scheduleBackgroundPreEvaluation(
    nodeKeys: readonly NodeKey[],
  ): Promise<readonly GraphPullResult[]> {
    return Promise.all(nodeKeys.map((nodeKey) => this.requestBackground(nodeKey)));
  }

  async #drain(): Promise<void> {
    this.#processing = true;
    let batchStart = this.#now();
    let processedSinceYield = 0;

    try {
      while (true) {
        const task = this.#dequeueNextTask();
        if (task == null) {
          break;
        }

        task.state = "running";

        try {
          const result = await this.#pullExecutor.pullNode(task.nodeKey);
          task.resolve(result);
        } catch (error) {
          task.reject(error);
        } finally {
          this.#tasksByKey.delete(task.key);
        }

        processedSinceYield += 1;
        if (!this.#hasPendingTasks()) {
          continue;
        }

        const elapsed = this.#now() - batchStart;
        if (
          processedSinceYield >= this.#yieldAfterTaskCount ||
          elapsed >= this.#yieldAfterMilliseconds
        ) {
          processedSinceYield = 0;
          batchStart = this.#now();
          await this.#yieldControl();
        }
      }
    } finally {
      this.#processing = false;
      if (this.#hasPendingTasks()) {
        void this.#drain();
      }
    }
  }

  #dequeueNextTask(): QueuedPullTask | undefined {
    for (const priority of DEFAULT_PRIORITY_ORDER) {
      const queue = this.#queues.get(priority);
      if (queue == null || queue.length === 0) {
        continue;
      }

      return queue.shift();
    }

    return undefined;
  }

  #hasPendingTasks(): boolean {
    return this.queuedTaskCount > 0;
  }

  #schedule(nodeKey: NodeKey, priority: GraphPullPriority): Promise<GraphPullResult> {
    const key = JSON.stringify(nodeKey);
    const existing = this.#tasksByKey.get(key);
    if (existing != null) {
      if (existing.state === "queued") {
        this.#promote(existing, priority);
      }

      return existing.promise;
    }

    let resolve!: (result: GraphPullResult) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<GraphPullResult>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });

    const task: QueuedPullTask = {
      key,
      nodeKey,
      priority,
      promise,
      reject,
      resolve,
      state: "queued",
    };

    this.#tasksByKey.set(key, task);
    this.#queues.get(priority)?.push(task);

    if (!this.#processing) {
      void this.#drain();
    }

    return promise;
  }

  #promote(task: QueuedPullTask, nextPriority: GraphPullPriority): void {
    if (comparePriority(task.priority, nextPriority) >= 0) {
      return;
    }

    const currentQueue = this.#queues.get(task.priority);
    if (currentQueue != null) {
      const index = currentQueue.indexOf(task);
      if (index >= 0) {
        currentQueue.splice(index, 1);
      }
    }

    task.priority = nextPriority;
    this.#queues.get(nextPriority)?.push(task);
  }
}

function comparePriority(
  current: GraphPullPriority,
  next: GraphPullPriority,
): number {
  return DEFAULT_PRIORITY_ORDER.indexOf(current) - DEFAULT_PRIORITY_ORDER.indexOf(next);
}
