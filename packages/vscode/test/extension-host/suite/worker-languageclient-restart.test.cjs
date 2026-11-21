/* global suite, test */

const assert = require("assert");
const { readFileSync, writeFileSync } = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { Worker } = require("worker_threads");
const vscode = require("vscode");
const { LanguageClient, State } = require("vscode-languageclient/node");

const workerFixture = path.resolve(
  __dirname,
  "../../fixtures/language-client-restart-worker.mjs",
);
const transportModuleUrl = pathToFileURL(path.resolve(
  requiredEnvironment("AURELIA_LS_EXTENSION_HOST_HARNESS_ROOT"),
  "out/worker-transport.js",
));
const aureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const extensionId = "AureliaEffect.aurelia-2";
const extensionHostObservationEvent = "aurelia-ls:extension-host-observation";
const workerRestartHostControlEvent = "aurelia-ls:worker-restart-host-control";
const workerRestartHostControlSchema = "aurelia-worker-restart-host-control/1";

if (!aureliaWorkspace) {
  throw new Error("AURELIA_LS_EXTENSION_HOST_WORKSPACE is required.");
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required.`);
  return value;
}
if (process.env.AURELIA_LS_WORKER_RESTART_HOST_ACCEPTANCE !== "1") {
  throw new Error("Worker lifecycle requires its exact host-acceptance gate.");
}

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

  test("re-proves real extension ownership, inventory, context, and diagnostics after Worker replacement", async function() {
    this.timeout(180_000);
    const observations = [];
    const controlId = "real-aurelia-worker-restart";
    const workspaceKey = vscode.Uri.file(aureliaWorkspace).toString();
    const templatePath = path.join(aureliaWorkspace, "src", "components", "product-card.html");
    const viewModelPath = path.join(aureliaWorkspace, "src", "components", "product-card.ts");
    const originalViewModel = readFileSync(viewModelPath, "utf8");
    const mutatedViewModel = originalViewModel
      .replace(
        "  @bindable selected = false;",
        "  @bindable selected = false;\n  @bindable({ attribute: 'restart-marker' }) restartMarker = '';",
      )
      .replace(
        "  readonly selectionProgressPercent = 40;",
        "  readonly selectionProgressPercentAfterRestart = 40;",
      );
    assert.notStrictEqual(mutatedViewModel, originalViewModel, "restart mutation must change the fixture");
    let mutationCount = 0;
    let mutationError;
    const recordObservation = (event) => {
      if (event == null || typeof event !== "object") return;
      observations.push(event);
      if (
        event.source === "worker-restart-host-control"
        && event.observationId === controlId
        && event.phase === "session-withdrawn"
        && mutationCount === 0
      ) {
        try {
          // The process event is synchronous. This write therefore occurs
          // inside the manager's withdrawn publication, before that stopped
          // state can finish handing control back to LanguageClient restart.
          writeFileSync(viewModelPath, mutatedViewModel);
          mutationCount += 1;
        } catch (error) {
          mutationError = error;
        }
      }
    };
    process.on(extensionHostObservationEvent, recordObservation);

    let document;
    let baselineHover;
    try {
      const extension = vscode.extensions.getExtension(extensionId);
      assert(extension, `Expected extension ${extensionId} in the Extension Development Host.`);
      const exports = await extension.activate();
      assert.strictEqual(extension.packageJSON.api, "none", "the acceptance hook must not add a product API");
      assert.strictEqual(exports, undefined, "extension activation must keep its public export empty");

      document = await vscode.workspace.openTextDocument(vscode.Uri.file(templatePath));
      await vscode.window.showTextDocument(document, { preview: false });
      await waitFor(
        async () => (await hoverMarkdown(document, "selectionProgressPercent")).includes(
          "selectionProgressPercent",
        ),
        "the initial real Aurelia Worker should answer template hover",
        60_000,
      );
      baselineHover = await hoverMarkdown(document, "selectionProgressPercent");
      await waitFor(
        () => observations.some((event) => isOwnedTemplateContext(event, workspaceKey, 1)),
        "the initial manager incarnation should prove active template context",
        60_000,
      );

      const baselineStart = observations.length;
      await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
      const baseline = await waitForCurrentPublication(
        observations,
        baselineStart,
        "the initial Resource Explorer inventory",
      );
      const baselineNodes = publicationNodes(observations, baseline);
      assert(baselineNodes.some((node) => node.label === "product-card"));
      assert(!baselineNodes.some((node) => String(node.label).includes("restart-marker")));
      assert.strictEqual(
        aureliaDiagnostics(document).some((diagnostic) => diagnosticCode(diagnostic) === "missing-expression-member"),
        false,
        "the baseline owner type should contain selectionProgressPercent",
      );

      const restartStart = observations.length;
      process.emit(workerRestartHostControlEvent, {
        schemaVersion: workerRestartHostControlSchema,
        action: "crash-active-worker",
        controlId,
        workspaceKey,
      });
      const withdrawn = await waitForObservation(
        observations,
        restartStart,
        (event) => event.source === "worker-restart-host-control"
          && event.observationId === controlId
          && event.phase === "session-withdrawn",
        "the manager should withdraw the crashed Worker incarnation",
      );
      if (mutationError != null) throw mutationError;
      assert.strictEqual(mutationCount, 1, "the source mutation must occur inside the withdrawal receipt");
      assert.strictEqual(readFileSync(viewModelPath, "utf8"), mutatedViewModel);

      const republished = await waitForObservation(
        observations,
        restartStart,
        (event) => event.source === "worker-restart-host-control"
          && event.observationId === controlId
          && event.phase === "session-republished",
        "the manager should republish the replacement Worker incarnation",
        90_000,
      );
      assert.strictEqual(republished.previousIncarnation, withdrawn.previousIncarnation);
      assert.strictEqual(republished.incarnation, withdrawn.nextIncarnation);
      assert(
        observations.indexOf(withdrawn) < observations.indexOf(republished),
        "session withdrawal must precede replacement publication",
      );

      const withdrawnContext = await waitForObservation(
        observations,
        restartStart,
        (event) => event?.source === "worker-restart-context"
          && event.phase === "context-committed"
          && event.active === false
          && event.documentOwned === false
          && event.templateOwned === false,
        "the withdrawn incarnation should clear active template context",
        90_000,
      );
      const replacementContext = await waitForObservation(
        observations,
        observations.indexOf(republished),
        (event) => isOwnedTemplateContext(event, workspaceKey, republished.incarnation),
        "the replacement incarnation should re-prove active template ownership and context",
        90_000,
      );
      assert(
        observations.indexOf(withdrawnContext) < observations.indexOf(replacementContext),
        "withdrawn context must clear before replacement ownership is re-proved",
      );
      await waitFor(
        () => aureliaDiagnostics(document).some((diagnostic) => (
          diagnosticCode(diagnostic) === "missing-expression-member"
          && diagnostic.message.includes("selectionProgressPercent")
        )),
        "the replacement Worker should repopulate diagnostics from the downtime source mutation",
        90_000,
      );
      await waitFor(
        async () => (await hoverMarkdown(document, "selectionProgressPercent")) !== baselineHover,
        "the replacement Worker should stop serving the retired owner-member hover",
        90_000,
      );

      const replacementInventoryStart = observations.length;
      await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
      const replacement = await waitForCurrentPublication(
        observations,
        replacementInventoryStart,
        "the replacement Resource Explorer inventory",
      );
      const replacementNodes = publicationNodes(observations, replacement);
      assert(replacementNodes.some((node) => node.label === "product-card"));
      assert(
        replacementNodes.some((node) => String(node.label).includes("restart-marker")),
        `replacement inventory did not publish restart-marker: ${JSON.stringify(replacementNodes)}`,
      );
      assert.notStrictEqual(
        replacement.fingerprint,
        baseline.fingerprint,
        "replacement inventory must carry a new semantic fingerprint",
      );
    } finally {
      writeFileSync(viewModelPath, originalViewModel);
      process.removeListener(extensionHostObservationEvent, recordObservation);
      if (document != null) {
        await waitFor(
          async () => (await hoverMarkdown(document, "selectionProgressPercent")).includes(
            "selectionProgressPercent",
          ),
          "the restored fixture should settle before host shutdown",
          60_000,
        ).catch(() => undefined);
      }
    }
  });

  test("pulls fresh diagnostics after an ordinary request failure in a still-open editor", async function() {
    this.timeout(180_000);
    const target = await vscode.workspace.openTextDocument(path.join(aureliaWorkspace, "src/my-app.html"));
    const neighbor = await vscode.workspace.openTextDocument(path.join(aureliaWorkspace, "src/components/product-card.html"));
    await vscode.window.showTextDocument(neighbor, { viewColumn: vscode.ViewColumn.Two, preview: false });
    await vscode.window.showTextDocument(target, { viewColumn: vscode.ViewColumn.One, preview: false });
    assert(!target.isDirty && !neighbor.isDirty);
    const replaceMember = (edit, document, from, to) => {
      const offset = document.getText().indexOf("${" + from + "}");
      assert.notStrictEqual(offset, -1, `Expected interpolation for ${from} in ${document.fileName}`);
      const range = new vscode.Range(document.positionAt(offset + 2), document.positionAt(offset + 2 + from.length));
      edit.replace(document.uri, range, to);
    };
    const hasProblem = (document, token) => aureliaDiagnostics(document).some(diagnostic =>
      diagnosticCode(diagnostic) === "missing-expression-member" && document.getText(diagnostic.range) === token
      && diagnostic.message.includes(token));
    const send = Worker.prototype.postMessage;
    let injected = false;
    try {
      const baseline = new vscode.WorkspaceEdit();
      replaceMember(baseline, target, "heading", "baselineDiagnosticMember");
      assert(await vscode.workspace.applyEdit(baseline));
      await waitFor(() => hasProblem(target, "baselineDiagnosticMember"), "initial authored diagnostic", 60_000);

      // Deliver one ordinary JSON-RPC error to the real language client. Limit the
      // intervention to this document and restore the genuine transport immediately.
      Worker.prototype.postMessage = function(message, ...rest) {
        if (message?.method === "textDocument/diagnostic" && message.params?.identifier === "aurelia"
          && vscode.Uri.parse(message.params.textDocument.uri).toString() === target.uri.toString()) {
          Worker.prototype.postMessage = send;
          setImmediate(() => {
            this.emit("message", {
              jsonrpc: "2.0", id: message.id, error: { code: -32603, message: "Diagnostic recovery test" },
            });
            injected = true;
          });
          return;
        }
        return send.call(this, message, ...rest);
      };
      const failed = new vscode.WorkspaceEdit();
      replaceMember(failed, target, "baselineDiagnosticMember", "failedDiagnosticMember");
      assert(await vscode.workspace.applyEdit(failed));
      await waitFor(() => injected, "one failed Aurelia diagnostic pull", 30_000);

      const recovery = new vscode.WorkspaceEdit();
      replaceMember(recovery, target, "failedDiagnosticMember", "recoveredDiagnosticMember");
      replaceMember(recovery, neighbor, "labelText", "neighborDiagnosticMember");
      assert(await vscode.workspace.applyEdit(recovery));
      await waitFor(() => hasProblem(neighbor, "neighborDiagnosticMember"), "healthy neighboring editor", 30_000);
      await waitFor(() => hasProblem(target, "recoveredDiagnosticMember"), "fresh authored diagnostic after failure", 30_000);
      assert(target.isDirty && neighbor.isDirty && !target.isClosed);
    } finally {
      Worker.prototype.postMessage = send;
      for (const document of [target, neighbor]) {
        if (document.isDirty) {
          await vscode.window.showTextDocument(document);
          await vscode.commands.executeCommand("workbench.action.files.revert");
        }
      }
    }
  });
});

function isOwnedTemplateContext(event, workspaceKey, incarnation) {
  return event?.source === "worker-restart-context"
    && event.phase === "context-committed"
    && event.active === true
    && event.documentOwned === true
    && event.templateOwned === true
    && event.workspaceKey === workspaceKey
    && event.incarnation === incarnation;
}

async function hoverMarkdown(document, token) {
  const offset = document.getText().indexOf(token);
  assert.notStrictEqual(offset, -1, `Expected template token ${token}.`);
  const hovers = await vscode.commands.executeCommand(
    "vscode.executeHoverProvider",
    document.uri,
    document.positionAt(offset + Math.floor(token.length / 2)),
  );
  return (hovers ?? []).flatMap((hover) => hover?.contents ?? []).map((content) => (
    typeof content === "string" ? content : content?.value ?? ""
  )).join("\n");
}

function aureliaDiagnostics(document) {
  return vscode.languages.getDiagnostics(document.uri).filter((diagnostic) => diagnostic.source === "aurelia");
}

function diagnosticCode(diagnostic) {
  return typeof diagnostic.code === "object" ? diagnostic.code?.value ?? null : diagnostic.code ?? null;
}

async function waitForCurrentPublication(observations, start, description) {
  return waitForObservation(
    observations,
    start,
    (event) => event.source === "resource-explorer"
      && event.phase === "publish-complete"
      && event.publicationKind === "current"
      && typeof event.fingerprint === "string"
      && event.fingerprint.length > 0,
    description,
    90_000,
  );
}

function publicationNodes(observations, publication) {
  return observations.filter((event) => event.source === "resource-explorer"
    && event.observationId === publication.observationId
    && event.phase === "publish-node"
    && event.generation === publication.generation
    && event.publicationKind === publication.publicationKind);
}

async function waitForObservation(
  observations,
  start,
  predicate,
  description,
  timeoutMilliseconds = 60_000,
) {
  let matched;
  await waitFor(() => {
    matched = observations.slice(start).find(predicate);
    return matched != null;
  }, description, timeoutMilliseconds);
  return matched;
}

async function waitFor(check, description, timeoutMilliseconds = 10_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}
