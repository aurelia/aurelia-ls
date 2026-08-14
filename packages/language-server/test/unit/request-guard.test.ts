import {
  SemanticRuntimeAnalysisCurrentnessError,
  ManagedSemanticWorkspaceOperationStaleError,
} from "@aurelia-ls/semantic-runtime";
import {
  LSPErrorCodes,
  ResponseError,
} from "vscode-languageserver/node";
import { describe, expect, test, vi } from "vitest";
import {
  requestFailure,
  runSemanticRuntimeDocumentRequest,
  runSemanticRuntimeDiagnosticRequest,
  runSemanticRuntimeRequest,
} from "../../src/handlers/request-guard.js";
import { SemanticRuntimeLspRequestAbortedError } from "../../src/runtime/semantic-runtime-session.js";

function context() {
  const generation = {
    workspaceGeneration: 1,
    sourceGeneration: 2,
    fingerprint: "test-generation",
  };
  const operation = {
    generation,
    authoredSourceOwnership: vi.fn(async (_uri: string) => ({
      value: {
        sourceFilePath: "/app/src/app.html",
        templateOwned: true,
        owners: [{ projectKey: "app" }],
      },
    })),
  };
  return {
    ownsDocument: vi.fn(() => true),
    semanticRuntime: {
      runRequest: vi.fn(async (
        _isCancellationRequested: (() => boolean) | null,
        request: (operation: unknown) => unknown,
      ) => await request(operation)),
      runDiagnosticRequest: vi.fn(async (
        _isCancellationRequested: (() => boolean) | null,
        _request: unknown,
        render: (operation: unknown) => unknown,
      ) => await render(operation)),
    },
    testOperation: operation,
    logger: {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

const token = {
  isCancellationRequested: false,
  onCancellationRequested: vi.fn(),
};

const diagnosticRequest = {
  uri: "file:///app/src/app.html",
  identifier: "aurelia",
  previousResultId: null,
  projectionKey: "test-diagnostics/v1",
};

describe("semantic-runtime request boundary", () => {
  test.each([
    ["cancelled", LSPErrorCodes.RequestCancelled],
    ["stale", LSPErrorCodes.ContentModified],
  ] as const)("maps %s semantic work to its protocol error", async (reason, code) => {
    const ctx = context();

    const request = runSemanticRuntimeRequest(
      ctx as never,
      "hover",
      token as never,
      () => { throw new SemanticRuntimeLspRequestAbortedError(reason); },
      "file:///app/src/app.html",
    );

    await expect(request).rejects.toMatchObject({ code });
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(reason));
    if (reason === "stale") {
      expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
        '"staleOrigin":"request-generation"',
      ));
    }
  });

  test("preserves deliberate protocol errors without logging or reclassification", () => {
    const ctx = context();
    const expected = new ResponseError(LSPErrorCodes.RequestFailed, "Rename was refused.");

    const actual = requestFailure(ctx as never, "rename", expected);

    expect(actual).toBe(expected);
    expect(ctx.logger.error).not.toHaveBeenCalled();
  });

  test("logs unexpected failures and exposes only a stable request-failed message", async () => {
    const ctx = context();

    const request = runSemanticRuntimeRequest(
      ctx as never,
      "completion",
      token as never,
      () => { throw new Error("private stack detail"); },
    );

    await expect(request).rejects.toMatchObject({
      code: LSPErrorCodes.RequestFailed,
      message: "Aurelia completion failed. See the Aurelia language server output for details.",
    });
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("private stack detail"));
  });

  test("passes a live cancellation probe into the semantic request guard", async () => {
    const ctx = context();
    const mutableToken = { ...token, isCancellationRequested: false };

    await runSemanticRuntimeRequest(
      ctx as never,
      "references",
      mutableToken as never,
      () => undefined,
    );

    const probe = ctx.semanticRuntime.runRequest.mock.calls[0]?.[0];
    expect(probe?.()).toBe(false);
    mutableToken.isCancellationRequested = true;
    expect(probe?.()).toBe(true);
  });

  test("uses one managed operation for exact ownership and document feature work", async () => {
    const ctx = context();
    const handler = vi.fn(async (_operation: unknown) => "owned");

    const result = await runSemanticRuntimeDocumentRequest(
      ctx as never,
      "hover",
      token as never,
      "file:///app/src/app.html",
      () => "not-authored",
      handler,
    );

    expect(result).toBe("owned");
    expect(ctx.semanticRuntime.runRequest).toHaveBeenCalledOnce();
    expect(ctx.testOperation.authoredSourceOwnership).toHaveBeenCalledWith(
      "file:///app/src/app.html",
    );
    expect(handler).toHaveBeenCalledWith(ctx.testOperation);
  });

  test("returns the neutral result without running semantic feature work for an unowned source", async () => {
    const ctx = context();
    ctx.testOperation.authoredSourceOwnership.mockResolvedValue({
      value: { sourceFilePath: "/app/golden/app.html", templateOwned: false, owners: [] },
    });
    const handler = vi.fn(async () => "owned");

    const result = await runSemanticRuntimeDocumentRequest(
      ctx as never,
      "completion",
      token as never,
      "file:///app/golden/app.html",
      () => "not-authored",
      handler,
    );

    expect(result).toBe("not-authored");
    expect(handler).not.toHaveBeenCalled();
  });

  test("does not query semantic ownership for a URI outside the coarse workspace boundary", async () => {
    const ctx = context();
    ctx.ownsDocument.mockReturnValue(false);

    const result = await runSemanticRuntimeDocumentRequest(
      ctx as never,
      "definition",
      token as never,
      "file:///elsewhere/external.html",
      () => null,
      () => ({ uri: "unexpected" }),
    );

    expect(result).toBeNull();
    expect(ctx.testOperation.authoredSourceOwnership).not.toHaveBeenCalled();
  });

  test("maps nominal managed-operation staleness without accepting shaped impostors", async () => {
    const ctx = context();
    const staleRequest = runSemanticRuntimeRequest(
      ctx as never,
      "definition",
      token as never,
      () => { throw managedStaleError(); },
    );

    await expect(staleRequest).rejects.toMatchObject({ code: LSPErrorCodes.ContentModified });
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"staleOrigin":"managed-operation"',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"managedReason":"analysis-currentness-changed"',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"changedSemanticFactKeys":["semantic-domain:test"]',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"changedSemanticFactKeyCount":1',
    ));

    const shapedRequest = runSemanticRuntimeRequest(
      ctx as never,
      "definition",
      token as never,
      () => {
        throw {
          name: "ManagedSemanticWorkspaceOperationStaleError",
          code: "SEMANTIC_RUNTIME_OPERATION_STALE",
          reason: "source-world-changed",
        };
      },
    );
    await expect(shapedRequest).rejects.toMatchObject({ code: LSPErrorCodes.RequestFailed });
  });

  test("logs the nominal managed cause wrapped by the LSP request generation", () => {
    const ctx = context();

    const failure = requestFailure(
      ctx as never,
      "prepareRename",
      new SemanticRuntimeLspRequestAbortedError("stale", managedStaleError()),
      "file:///app/src/app.html",
    );

    expect(failure).toMatchObject({ code: LSPErrorCodes.ContentModified });
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"staleOrigin":"managed-operation"',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"analysisBasisRevision":"analysis-basis:1"',
    ));
  });

  test("distinguishes nominal analysis currentness from request-generation staleness", () => {
    const ctx = context();
    const currentness = new SemanticRuntimeAnalysisCurrentnessError({
      message: "Analysis changed.",
      reason: "answer-proof-changed",
      answerLeaseKind: "app-query",
      invalidGenerationKeys: ["generation:test"],
      changedReadKeys: ["read:test"],
      changedFacets: ["facet:test"],
      changedSemanticFactKeys: ["semantic:test"],
    });

    const failure = requestFailure(
      ctx as never,
      "prepareRename",
      new SemanticRuntimeLspRequestAbortedError("stale", currentness),
    );

    expect(failure).toMatchObject({ code: LSPErrorCodes.ContentModified });
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"staleOrigin":"analysis-currentness"',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"analysisReason":"answer-proof-changed"',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"invalidGenerationKeys":["generation:test"]',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"invalidGenerationKeyCount":1',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"changedReadKeys":["read:test"]',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"changedReadKeyCount":1',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"changedFacets":["facet:test"]',
    ));
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining(
      '"changedFacetCount":1',
    ));
  });

  test("bounds logged stale evidence while retaining its total count", () => {
    const ctx = context();
    const changedReadKeys = Array.from({ length: 10 }, (_, index) => `read:${index}`);
    const currentness = new SemanticRuntimeAnalysisCurrentnessError({
      message: "Analysis changed.",
      reason: "answer-proof-changed",
      answerLeaseKind: "app-query",
      invalidGenerationKeys: [],
      changedReadKeys,
      changedFacets: [],
      changedSemanticFactKeys: [],
    });

    requestFailure(
      ctx as never,
      "prepareRename",
      new SemanticRuntimeLspRequestAbortedError("stale", currentness),
    );

    const message = String(ctx.logger.log.mock.calls[0]?.[0]);
    expect(message).toContain(
      '"changedReadKeys":["read:0","read:1","read:2","read:3","read:4","read:5","read:6","read:7"]',
    );
    expect(message).toContain('"changedReadKeyCount":10');
    expect(message).not.toContain("read:8");
    expect(message).not.toContain("read:9");
  });

  test("asks diagnostic clients to retrigger work invalidated by a newer source generation", async () => {
    const ctx = context();

    const request = runSemanticRuntimeDiagnosticRequest(
      ctx as never,
      token as never,
      diagnosticRequest,
      () => { throw new SemanticRuntimeLspRequestAbortedError("stale"); },
    );

    await expect(request).rejects.toMatchObject({
      code: LSPErrorCodes.ServerCancelled,
      data: { retriggerRequest: true },
    });
    expect(ctx.logger.log).toHaveBeenCalledWith(expect.stringContaining("stale"));
  });

  test("preserves client cancellation semantics for diagnostic pulls", async () => {
    const ctx = context();

    const request = runSemanticRuntimeDiagnosticRequest(
      ctx as never,
      token as never,
      diagnosticRequest,
      () => { throw new SemanticRuntimeLspRequestAbortedError("cancelled"); },
    );

    await expect(request).rejects.toMatchObject({ code: LSPErrorCodes.RequestCancelled });
  });

  test("gives live client cancellation precedence over concurrent managed staleness", async () => {
    const ctx = context();
    const mutableToken = { ...token, isCancellationRequested: false };

    const request = runSemanticRuntimeDiagnosticRequest(
      ctx as never,
      mutableToken as never,
      diagnosticRequest,
      () => {
        mutableToken.isCancellationRequested = true;
        throw managedStaleError();
      },
    );

    const failure = await request.catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: LSPErrorCodes.RequestCancelled });
    expect(failure).not.toMatchObject({ data: { retriggerRequest: true } });
  });

  test("asks diagnostic clients to retrigger nominal managed-operation staleness", async () => {
    const ctx = context();

    const request = runSemanticRuntimeDiagnosticRequest(
      ctx as never,
      token as never,
      diagnosticRequest,
      () => { throw managedStaleError(); },
    );

    await expect(request).rejects.toMatchObject({
      code: LSPErrorCodes.ServerCancelled,
      data: { retriggerRequest: true },
    });
  });
});

function managedStaleError(): ManagedSemanticWorkspaceOperationStaleError {
  return new ManagedSemanticWorkspaceOperationStaleError({
    message: "Managed semantic operation became stale.",
    reason: "analysis-currentness-changed",
    currentnessKind: null,
    previousSourceWorldRevision: "source-world:1",
    nextSourceWorldRevision: "source-world:1",
    analysisBasisRevision: "analysis-basis:1",
    changedReadKeys: [],
    changedFacets: [],
    changedSemanticFactKeys: ["semantic-domain:test"],
  });
}
