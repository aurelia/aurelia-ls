/* global suite, test */

const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");
const { Worker } = require("worker_threads");
const { LanguageClient, State } = require("vscode-languageclient/node");

const workerFixture = path.resolve(
  __dirname,
  "../../fixtures/language-client-restart-worker.mjs",
);
const transportModuleUrl = pathToFileURL(path.resolve(
  __dirname,
  "../../../out/worker-transport.js",
));

suite("Worker LanguageClient restart", () => {
  test("automatically replaces an abnormally exited Worker", async () => {
    const {
      createWorkerCancellationStrategy,
      createWorkerMessageTransports,
    } = await import(transportModuleUrl.href);
    const transportEvents = [];
    const stateChanges = [];
    let launches = 0;

    const client = new LanguageClient(
      "aurelia-worker-restart-witness",
      "Aurelia Worker Restart Witness",
      () => {
        const launch = ++launches;
        return Promise.resolve(createWorkerMessageTransports(workerFixture, {
          createWorker: () => new Worker(workerFixture, {
            stdout: true,
            stderr: true,
            workerData: { launch },
          }),
          onEvent: (event) => transportEvents.push({ launch, event }),
        }));
      },
      {
        documentSelector: [],
        connectionOptions: {
          cancellationStrategy: createWorkerCancellationStrategy(),
          maxRestartCount: 1,
        },
      },
    );
    const stateSubscription = client.onDidChangeState((event) => stateChanges.push(event));

    try {
      await client.start();
      assert.deepStrictEqual(await client.sendRequest("test/workerIdentity"), { launch: 1 });
      assert.strictEqual(launches, 1);

      const changesBeforeCrash = stateChanges.length;
      await client.sendNotification("test/crashWorker");
      await waitFor(
        () => launches === 2 && client.state === State.Running,
        "vscode-languageclient should create and initialize a replacement Worker",
      );

      assert.deepStrictEqual(await client.sendRequest("test/workerIdentity"), { launch: 2 });
      assert(transportEvents.some(({ launch, event }) => launch === 1 && event.type === "error"));
      assert(transportEvents.some(({ launch, event }) => (
        launch === 1 && event.type === "exit" && event.code !== 0
      )));
      assert(stateChanges.slice(changesBeforeCrash).some(({ newState }) => newState === State.Stopped));
      assert(stateChanges.slice(changesBeforeCrash).some(({ newState }) => newState === State.Starting));
      assert.strictEqual(client.state, State.Running);
    } finally {
      stateSubscription.dispose();
      await client.stop();
    }
  });
});

async function waitFor(check, description, timeoutMilliseconds = 10_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}
