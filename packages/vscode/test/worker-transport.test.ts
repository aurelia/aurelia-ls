import { once } from "node:events";
import path from "node:path";
import {
  CancellationTokenSource,
  createMessageConnection,
} from "vscode-jsonrpc/node";
import { describe, expect, test } from "vitest";
import {
  createExperimentalWorkerCancellationStrategy,
  createExperimentalWorkerMessageTransports,
  EXPERIMENTAL_WORKER_TRANSPORT_ENV,
  shouldUseExperimentalWorkerTransport,
} from "../out/worker-transport.js";

const WORKER_FIXTURE = path.resolve(
  import.meta.dirname,
  "../../language-server/test/fixtures/shared-array-cancellation-worker.mjs",
);

describe("experimental Worker transport", () => {
  test("stays opt-in and keeps Node inspector sessions on IPC", () => {
    expect(shouldUseExperimentalWorkerTransport({}, [])).toBe(false);
    expect(shouldUseExperimentalWorkerTransport({
      [EXPERIMENTAL_WORKER_TRANSPORT_ENV]: "1",
    }, [])).toBe(true);
    expect(shouldUseExperimentalWorkerTransport({
      [EXPERIMENTAL_WORKER_TRANSPORT_ENV]: "1",
    }, ["--inspect=0"])).toBe(false);
    expect(shouldUseExperimentalWorkerTransport({
      [EXPERIMENTAL_WORKER_TRANSPORT_ENV]: "1",
    }, ["--inspect-brk"])).toBe(false);
  });

  test("flips a shared token during a synchronous worker loop and exits gracefully", async () => {
    const transports = createExperimentalWorkerMessageTransports(WORKER_FIXTURE);
    const connection = createMessageConnection(
      transports.reader,
      transports.writer,
      undefined,
      { cancellationStrategy: createExperimentalWorkerCancellationStrategy() },
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
      const exited = once(transports.worker, "exit");
      await connection.sendNotification("exit");
      const [exitCode] = await exited;
      expect(exitCode).toBe(0);
    } finally {
      connection.end();
      connection.dispose();
      if (transports.worker.threadId !== -1) {
        await transports.worker.terminate();
      }
    }
  });
});
