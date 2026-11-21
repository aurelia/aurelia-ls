import { PassThrough } from "node:stream";
import {
  CancellationTokenSource,
  createMessageConnection,
  Message,
  StreamMessageReader,
  StreamMessageWriter,
  type DataCallback,
  type RequestMessage,
  type ResponseMessage,
} from "vscode-jsonrpc/node";
import { LSPErrorCodes } from "vscode-languageserver-protocol";
import { describe, expect, test, vi } from "vitest";
import { AureliaProtocolRequest } from "@aurelia-ls/language-server/protocol";
import { registerCustomHandlers } from "../../../language-server/out/handlers/custom.js";
import { SemanticRuntimeLspRequestAbortedError } from "../../../language-server/out/runtime/semantic-runtime-session.js";
import { LanguageServerSupportLedger } from "../../../language-server/out/support-snapshot.js";
import { LspFacade } from "../../out/core/lsp-facade.js";
import { createTestServices } from "../helpers/test-helpers.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

type CancellationProbe = (() => boolean) | null;
type BeforeRequest = (probe: CancellationProbe, attempt: number) => void | Promise<void>;

const requests = [
  {
    name: "present params",
    method: AureliaProtocolRequest.ResourceInventory,
    feature: "resourceInventory",
    wireParams: {},
    send: (facade: LspFacade, token?: CancellationTokenSource["token"]) =>
      facade.getResourceInventory({}, token),
  },
  {
    name: "absent params",
    method: AureliaProtocolRequest.AnalysisLimitations,
    feature: "analysisLimitations",
    // Custom handlers have a (params, token) signature even when params are optional.
    wireParams: [null],
    send: (facade: LspFacade, token?: CancellationTokenSource["token"]) =>
      facade.getAnalysisLimitations({}, token),
  },
] as const;

class ObservedMessageReader extends StreamMessageReader {
  readonly requests: RequestMessage[] = [];
  readonly responses: ResponseMessage[] = [];

  override listen(callback: DataCallback) {
    return super.listen((message) => {
      if (Message.isRequest(message)) this.requests.push(message);
      if (Message.isResponse(message)) this.responses.push(message);
      callback(message);
    });
  }
}

function createHarness(beforeRequest: BeforeRequest = () => {}) {
  // Use real framing, serialization, JSON-RPC argument dispatch and cancellation.
  // LanguageClient forwards string-method arguments to this same sendRequest API.
  const outbound = new PassThrough();
  const inbound = new PassThrough();
  const serverReader = new ObservedMessageReader(outbound);
  const clientReader = new ObservedMessageReader(inbound);
  const client = createMessageConnection(
    clientReader, new StreamMessageWriter(outbound),
  );
  const server = createMessageConnection(serverReader, new StreamMessageWriter(inbound));
  const probes: CancellationProbe[] = [];
  const operation = {
    generation: { fingerprint: "transport-generation" },
    workspaceSummary: async () => ({ value: { appCandidates: [], defaultAppProjectKey: null } }),
  };
  const context = {
    connection: server,
    semanticRuntime: {
      async runRequest(probe: CancellationProbe, request: (value: unknown) => unknown) {
        probes.push(probe);
        await beforeRequest(probe, probes.length);
        return await request(operation);
      },
    },
    supportLedger: new LanguageServerSupportLedger(),
    logger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
  // Keep the production custom-handler registration and semantic request guard.
  registerCustomHandlers(context as never);
  server.listen();
  client.listen();

  const session = {
    client,
    workspace: { key: "file:///app", uri: "file:///app", name: "app" },
    incarnation: 1,
  };
  const manager = {
    sessions: [session],
    onDidChangeSessions: () => ({ dispose() {} }),
  };
  const { vscode } = createVscodeApi();
  const { logger } = createTestServices(vscode as never);
  const facade = new LspFacade(manager as never, logger);
  return {
    facade,
    context,
    probes,
    wireRequests: serverReader.requests,
    wireResponses: clientReader.responses,
    terminals: () => context.supportLedger.snapshot(new Uint8Array(32).fill(1)).recentTerminals,
    dispose() {
      facade.dispose();
      client.dispose();
      server.dispose();
      outbound.destroy();
      inbound.destroy();
    },
  };
}

describe.each(requests)("LspFacade JSON-RPC transport with $name", (request) => {
  test.each(["omitted", "present"] as const)("preserves handler arity with token %s", async (tokenMode) => {
    const harness = createHarness();
    const cancellation = new CancellationTokenSource();
    try {
      const response = await request.send(harness.facade, tokenMode === "present" ? cancellation.token : undefined);

      expect(response?.workspaces).toEqual([expect.objectContaining({
        status: "ready", response: { fingerprint: "transport-generation", projects: [] },
      })]);
      expect(harness.wireRequests).toEqual([expect.objectContaining({
        method: request.method, params: request.wireParams,
      })]);
      expect(harness.probes).toHaveLength(1);
      expect(harness.probes[0]).toBeTypeOf("function");
      expect(harness.probes[0]?.()).toBe(false);
    } finally {
      cancellation.dispose();
      harness.dispose();
    }
  });

  test("retries original tokenless stale errors instead of masking them with a null-token exception", async () => {
    const harness = createHarness((_probe, attempt) => {
      if (attempt === 1) throw new SemanticRuntimeLspRequestAbortedError("stale");
    });
    try {
      const response = await request.send(harness.facade);

      expect(response?.workspaces[0]).toMatchObject({ status: "ready" });
      expect(harness.wireRequests).toHaveLength(2);
      expect(harness.wireResponses[0]?.error?.code).toBe(LSPErrorCodes.ContentModified);
      expect(harness.terminals()).toEqual([
        expect.objectContaining({ feature: request.feature, outcome: "stale", underlyingStale: true }),
        expect.objectContaining({ feature: request.feature, outcome: "succeeded" }),
      ]);
      expect(harness.context.logger.error).not.toHaveBeenCalled();
    } finally {
      harness.dispose();
    }
  });

  test("preserves exhausted tokenless staleness as ContentModified", async () => {
    const harness = createHarness(() => { throw new SemanticRuntimeLspRequestAbortedError("stale"); });
    try {
      const response = await request.send(harness.facade);

      expect(response?.workspaces[0]).toMatchObject({
        status: "error", error: `Aurelia ${request.feature} request used stale document content.`,
      });
      expect(harness.wireRequests).toHaveLength(3);
      expect(harness.wireResponses.map((response) => response.error?.code)).toEqual([
        LSPErrorCodes.ContentModified, LSPErrorCodes.ContentModified, LSPErrorCodes.ContentModified,
      ]);
      expect(harness.terminals()).toHaveLength(3);
      expect(harness.terminals().every((row) => row.outcome === "stale")).toBe(true);
    } finally {
      harness.dispose();
    }
  });

  test("preserves the original unexpected failure in server evidence", async () => {
    const harness = createHarness(() => { throw new Error("original semantic failure"); });
    try {
      const response = await request.send(harness.facade);

      expect(response?.workspaces[0]).toMatchObject({
        status: "error",
        error: `Aurelia ${request.feature} failed. See the Aurelia language server output for details.`,
      });
      expect(harness.wireRequests).toHaveLength(1);
      expect(harness.wireResponses[0]?.error?.code).toBe(LSPErrorCodes.RequestFailed);
      expect(harness.context.logger.error).toHaveBeenCalledWith(expect.stringContaining("original semantic failure"));
      expect(harness.terminals()).toEqual([
        expect.objectContaining({ outcome: "failed", clientCancellationRequested: false, underlyingStale: false }),
      ]);
    } finally {
      harness.dispose();
    }
  });

  test.each(["before dispatch", "in flight"] as const)("honors cancellation %s without retrying", async (timing) => {
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    const cancellation = new CancellationTokenSource();
    const harness = createHarness(async (probe) => {
      signalStarted();
      // Wait for real $/cancelRequest dispatch, not a mocked token shared by both sides.
      await expect.poll(() => probe?.(), { timeout: 1_000 }).toBe(true);
      throw new SemanticRuntimeLspRequestAbortedError("stale");
    });
    try {
      if (timing === "before dispatch") cancellation.cancel();
      const response = request.send(harness.facade, cancellation.token);
      const assertion = expect(response).rejects.toMatchObject({ code: LSPErrorCodes.RequestCancelled });
      await started;
      if (timing === "in flight") cancellation.cancel();
      await assertion;

      expect(harness.wireRequests).toHaveLength(1);
      expect(harness.wireRequests[0]?.params).toEqual(request.wireParams);
      expect(harness.terminals()).toEqual([
        expect.objectContaining({ outcome: "client-cancelled", clientCancellationRequested: true, underlyingStale: true }),
      ]);
    } finally {
      cancellation.dispose();
      harness.dispose();
    }
  });
});
