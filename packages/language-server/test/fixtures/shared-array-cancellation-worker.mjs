import { parentPort } from "node:worker_threads";
import { createLanguageServerConnection } from "../../out/transport.js";

if (parentPort == null) {
  throw new Error("The shared-array cancellation fixture must run in a Worker");
}

const connection = createLanguageServerConnection(parentPort);

connection.onInitialize(() => ({ capabilities: {} }));
connection.onRequest("test/synchronousCancellation", (params, token) => {
  void connection.sendNotification("test/synchronousCancellationStarted");

  const startedAt = performance.now();
  const deadline = startedAt + params.maximumBusyMilliseconds;
  let checks = 0;
  while (performance.now() < deadline) {
    checks += 1;
    if (token.isCancellationRequested) break;
  }

  return {
    cancelled: token.isCancellationRequested,
    checks,
    elapsedMilliseconds: performance.now() - startedAt,
  };
});

connection.listen();
