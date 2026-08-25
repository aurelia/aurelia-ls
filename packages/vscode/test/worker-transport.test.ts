import path from "node:path";
import { Worker } from "node:worker_threads";
import {
  CancellationTokenSource,
  createMessageConnection,
  type RequestMessage,
} from "vscode-jsonrpc/node";
import { describe, expect, test } from "vitest";
import {
  createWorkerCancellationStrategy,
  createWorkerMessageTransports,
  FORCE_IPC_TRANSPORT_ENV,
  shouldUseWorkerTransport,
  type WorkerTransportEvent,
} from "../out/worker-transport.js";

const WORKER_FIXTURE = path.resolve(
  import.meta.dirname,
  "../../language-server/test/fixtures/shared-array-cancellation-worker.mjs",
);

describe("Worker transport", () => {
  test("is the default and keeps forced IPC and Node inspector sessions on IPC", () => {
    expect(shouldUseWorkerTransport({}, [])).toBe(true);
    expect(shouldUseWorkerTransport({}, ["--inspect=0"])).toBe(false);
    expect(shouldUseWorkerTransport({}, ["--inspect-brk"])).toBe(false);
    expect(shouldUseWorkerTransport({
      [FORCE_IPC_TRANSPORT_ENV]: "1",
    }, [])).toBe(false);
  });

  test("flips a shared token during a synchronous worker loop and exits gracefully", async () => {
    const transports = createWorkerMessageTransports(WORKER_FIXTURE);
    const connection = createMessageConnection(
      transports.reader,
      transports.writer,
      undefined,
      { cancellationStrategy: createWorkerCancellationStrategy() },
    );
    connection.listen();

    try {
      await connection.sendRequest("initialize", {
        processId: process.pid,
        rootUri: null,
        capabilities: {},
      });
      await connection.sendNotification("initialized", {});

      const started = new Promise<void>((resolve) => {
        connection.onNotification("test/synchronousCancellationStarted", resolve);
      });
      const cancellation = new CancellationTokenSource();
      const maximumBusyMilliseconds = 10_000;
      const responsePromise = connection.sendRequest<{
        readonly cancelled: boolean;
        readonly checks: number;
        readonly elapsedMilliseconds: number;
      }>(
        "test/synchronousCancellation",
        { maximumBusyMilliseconds },
        cancellation.token,
      );

      await started;
      cancellation.cancel();
      const response = await responsePromise;

      expect(response.cancelled).toBe(true);
      expect(response.checks).toBeGreaterThan(0);
      expect(response.elapsedMilliseconds).toBeLessThan(maximumBusyMilliseconds / 2);

      await connection.sendRequest("shutdown");
      await connection.sendNotification("exit");
      const exitCode = await transports.exited;
      expect(exitCode).toBe(0);
    } finally {
      connection.end();
      connection.dispose();
      await transports.terminate();
    }
  });

  test("reports an abnormal crash once, closes once, and permits a fresh transport", async () => {
    const events: WorkerTransportEvent[] = [];
    const transports = createWorkerMessageTransports("unused", {
      createWorker: () => new Worker(
        [
          "console.log('intentional Worker stdout');",
          "console.error('intentional Worker stderr');",
          "setImmediate(() => { throw new Error('intentional Worker crash'); });",
        ].join("\n"),
        { eval: true, stdout: true, stderr: true },
      ),
      onEvent: (event) => events.push(event),
    });
    const connection = createMessageConnection(transports.reader, transports.writer);
    const errors: Array<readonly [Error, unknown, number | undefined]> = [];
    let closes = 0;
    connection.onError((error) => errors.push(error));
    connection.onClose(() => { closes += 1; });
    connection.listen();

    const exitCode = await transports.exited;

    expect(exitCode).not.toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.[0].message).toContain("intentional Worker crash");
    expect(errors[0]?.[2]).toBe(1);
    expect(closes).toBe(1);
    expect(events.some((event) => (
      event.type === "stdout" && event.text.includes("intentional Worker stdout")
    ))).toBe(true);
    expect(events.some((event) => (
      event.type === "stderr" && event.text.includes("intentional Worker stderr")
    ))).toBe(true);
    expect(events.filter((event) => event.type === "error")).toHaveLength(1);
    expect(events.filter((event) => event.type === "exit")).toHaveLength(1);
    connection.dispose();

    const replacement = createWorkerMessageTransports(WORKER_FIXTURE);
    const replacementConnection = createMessageConnection(
      replacement.reader,
      replacement.writer,
      undefined,
      { cancellationStrategy: createWorkerCancellationStrategy() },
    );
    replacementConnection.listen();
    try {
      const initializeResult = await replacementConnection.sendRequest<{ capabilities: unknown }>(
        "initialize",
        { processId: process.pid, rootUri: null, capabilities: {} },
      );
      expect(initializeResult.capabilities).toBeDefined();
      await replacementConnection.sendRequest("shutdown");
      await replacementConnection.sendNotification("exit");
      expect(await replacement.exited).toBe(0);
    } finally {
      replacementConnection.end();
      replacementConnection.dispose();
      await replacement.terminate();
    }
  });

  test("force-terminates a noncooperative Worker after the configured grace", async () => {
    const events: WorkerTransportEvent[] = [];
    let online!: () => void;
    const onlinePromise = new Promise<void>((resolve) => { online = resolve; });
    const transports = createWorkerMessageTransports("unused", {
      shutdownGraceMilliseconds: 25,
      createWorker: () => new Worker("setInterval(() => undefined, 1_000);", { eval: true }),
      onEvent: (event) => {
        events.push(event);
        if (event.type === "online") online();
      },
    });

    await onlinePromise;
    const startedAt = performance.now();
    const shutdownRequest: RequestMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "shutdown",
    };
    await transports.writer.write(shutdownRequest);
    const exitCode = await transports.exited;
    const elapsedMilliseconds = performance.now() - startedAt;

    expect(exitCode).not.toBe(0);
    expect(elapsedMilliseconds).toBeLessThan(500);
    expect(events.filter((event) => event.type === "force-terminate")).toEqual([
      { type: "force-terminate", graceMilliseconds: 25 },
    ]);
    expect(events.filter((event) => event.type === "exit")).toHaveLength(1);
  });

  test("force-terminates a noncooperative Worker after the default two-second grace", async () => {
    const events: WorkerTransportEvent[] = [];
    let online!: () => void;
    const onlinePromise = new Promise<void>((resolve) => { online = resolve; });
    const transports = createWorkerMessageTransports("unused", {
      createWorker: () => new Worker("setInterval(() => undefined, 1_000);", { eval: true }),
      onEvent: (event) => {
        events.push(event);
        if (event.type === "online") online();
      },
    });

    await onlinePromise;
    const startedAt = performance.now();
    const shutdownRequest: RequestMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "shutdown",
    };
    await transports.writer.write(shutdownRequest);
    const exitCode = await transports.exited;
    const elapsedMilliseconds = performance.now() - startedAt;

    expect(exitCode).not.toBe(0);
    expect(elapsedMilliseconds).toBeGreaterThanOrEqual(1_500);
    expect(elapsedMilliseconds).toBeLessThan(10_000);
    expect(events.filter((event) => event.type === "force-terminate")).toEqual([
      { type: "force-terminate", graceMilliseconds: 2_000 },
    ]);
    expect(events.filter((event) => event.type === "exit")).toHaveLength(1);
  }, 15_000);
});
