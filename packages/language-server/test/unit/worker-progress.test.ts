import { afterEach, describe, expect, test, vi } from "vitest";
import { observeSemanticRuntimePhase } from "@aurelia-ls/semantic-runtime";
import { installWorkerProgress } from "../../out/worker-progress.js";
import { type AureliaWorkerProgressMessage, readAureliaWorkerProgressSnapshot } from "../../out/protocol.js";

afterEach(() => { vi.useRealTimers(); });

describe("Worker progress", () => {
  test("reports a synchronous allocating phase before completion and retains only fixed labels", () => {
    const messages: AureliaWorkerProgressMessage[] = [];
    const stop = installWorkerProgress((message) => { messages.push(message); });
    try {
      observeSemanticRuntimePhase("static-evaluation", () => {
        expect(messages.at(-1)?.snapshot).toMatchObject({ phase: "static-evaluation", status: "started" });
        expect(messages.at(-1)!.snapshot.heapLimitBytes).toBeGreaterThan(0);
        expect(messages.at(-1)!.snapshot.heapUsedBytes).toBeGreaterThan(0);
      });
      expect(messages.at(-1)?.snapshot.status).toBe("completed");
      expect(() => observeSemanticRuntimePhase("private/project/component.ts", () => { throw new Error("private error"); }))
        .toThrow("private error");
      expect(messages.at(-1)?.snapshot).toMatchObject({ phase: "other", status: "failed" });
      expect(JSON.stringify(messages)).not.toContain("private");
    } finally { stop(); }
  });

  test("bounds a busy phase stream and flushes its final sample without sampling after disposal", () => {
    vi.useFakeTimers();
    let now = 0;
    const messages: AureliaWorkerProgressMessage[] = [];
    const readHeap = vi.fn(() => ({ used_heap_size: 10, total_heap_size: 20, heap_size_limit: 100, external_memory: 0 }));
    const stop = installWorkerProgress((message) => { messages.push(message); }, { now: () => now, readHeap });
    for (let index = 0; index < 10_000; index++) observeSemanticRuntimePhase("static-evaluation", () => undefined);
    expect(messages).toHaveLength(3); // startup and first entry/completion
    expect(readHeap).toHaveBeenCalledTimes(3);
    now = 250;
    vi.advanceTimersByTime(250);
    expect(messages).toHaveLength(4);
    expect(messages.at(-1)?.snapshot).toMatchObject({ status: "completed", omittedEventCount: 19_997 });
    observeSemanticRuntimePhase("static-evaluation", () => undefined);
    stop();
    vi.runAllTimers();
    expect(messages).toHaveLength(4);
  });

  test("projects progress fields and rejects invalid heap numbers and authored phases", () => {
    const row = { sequence: 1, elapsedMilliseconds: 1, phase: "static-evaluation", status: "started",
      heapUsedBytes: 1, heapTotalBytes: 2, heapLimitBytes: 3, externalBytes: 0, omittedEventCount: 0 };
    expect(readAureliaWorkerProgressSnapshot({ ...row, source: "private" })).toEqual(row);
    expect(readAureliaWorkerProgressSnapshot({ ...row, heapUsedBytes: Infinity })).toBeNull();
    expect(readAureliaWorkerProgressSnapshot({ ...row, phase: "private-file.ts" })).toBeNull();
  });
});
