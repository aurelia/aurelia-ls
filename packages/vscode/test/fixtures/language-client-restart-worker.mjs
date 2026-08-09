import { parentPort, workerData } from "node:worker_threads";
import { createLanguageServerConnection } from "../../../language-server/out/transport.js";

if (parentPort == null) {
  throw new Error("The language-client restart fixture must run in a Worker");
}

const launch = workerData?.launch;
if (!Number.isInteger(launch) || launch < 1) {
  throw new Error("The language-client restart fixture requires a positive launch number");
}

const connection = createLanguageServerConnection(parentPort);

connection.onInitialize(() => ({ capabilities: {} }));
connection.onRequest("test/workerIdentity", () => ({ launch }));
connection.onNotification("test/crashWorker", () => {
  setImmediate(() => {
    throw new Error(`Intentional Worker crash on launch ${launch}`);
  });
});

connection.listen();
