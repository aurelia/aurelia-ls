import { parentPort } from "node:worker_threads";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { NodeSemanticRuntimeProjectInputHost } from "../../../semantic-runtime/out/index.js";
import {
  checkpointSemanticRuntimeLspOperation,
  SemanticRuntimeLspSession,
} from "../../out/runtime/semantic-runtime-session.js";
import { createLanguageServerConnection } from "../../out/transport.js";
import { WorkspaceDocumentUris } from "../../out/utils/document-uri.js";

if (parentPort == null) {
  throw new Error("The shared-array cancellation fixture must run in a Worker");
}

const connection = createLanguageServerConnection(parentPort);
const workspaceRoot = path.resolve(
  import.meta.dirname,
  "../../../semantic-runtime/fixtures/pressure/app-pattern-minimal-app",
);
const documentUris = new WorkspaceDocumentUris();
documentUris.configure(pathToFileURL(workspaceRoot).toString());
let bootstrapCancellationProbe = null;
let waitForBootstrapCancellation = false;
const semanticSession = new SemanticRuntimeLspSession({
  documentUris,
  projectInputHost: new NodeSemanticRuntimeProjectInputHost(null, () => {
    if (waitForBootstrapCancellation) {
      waitForBootstrapCancellation = false;
      void connection.sendNotification("test/semanticBootstrapStarted");
      const deadline = performance.now() + 5_000;
      while (bootstrapCancellationProbe?.() !== true && performance.now() < deadline) {
        // Shared-array cancellation must remain observable while this Worker is busy.
      }
      if (bootstrapCancellationProbe?.() !== true) {
        throw new Error("Timed out waiting for semantic bootstrap cancellation.");
      }
    }
    checkpointSemanticRuntimeLspOperation();
  }),
  openDocumentMetadata: () => null,
  publishEffect: () => undefined,
});

connection.onInitialize(() => ({ capabilities: {} }));
connection.onShutdown(() => semanticSession.dispose());
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
connection.onRequest("test/concurrentSemanticBootstrap", async (_params, token) => {
  bootstrapCancellationProbe = () => token.isCancellationRequested;
  waitForBootstrapCancellation = true;
  const leader = semanticSession.runRequest(
    () => token.isCancellationRequested,
    async (operation) => {
      const summary = await operation.workspaceSummary();
      return {
        result: summary.result,
        projectCount: summary.value.appCandidates.length,
      };
    },
  );
  const follower = semanticSession.runRequest(
    () => false,
    async (operation) => {
      const summary = await operation.workspaceSummary();
      return {
        result: summary.result,
        projectCount: summary.value.appCandidates.length,
      };
    },
  );
  const outcomes = await Promise.all([
    semanticBootstrapOutcome(leader),
    semanticBootstrapOutcome(follower),
  ]);
  bootstrapCancellationProbe = null;
  await connection.sendNotification("test/semanticBootstrapSettled", outcomes);
  return outcomes;
});

connection.listen();

async function semanticBootstrapOutcome(request) {
  try {
    return { status: "fulfilled", value: await request };
  } catch (error) {
    return {
      status: "rejected",
      name: error instanceof Error ? error.name : null,
      reason: error?.reason ?? null,
    };
  }
}
