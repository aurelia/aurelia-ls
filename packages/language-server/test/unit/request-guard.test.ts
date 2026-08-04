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
  return {
    ownsDocument: vi.fn(() => true),
    semanticRuntime: {
      requestGuard: vi.fn((isCancellationRequested) => ({
        generation,
        isCancellationRequested,
      })),
      authoredSourceOwnership: vi.fn(async (_uri: string, _guard: unknown) => ({
        value: {
          sourceFilePath: "/app/src/app.html",
          owners: [{ projectKey: "app" }],
        },
      })),
    },
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
      (guard) => {
        expect(guard.isCancellationRequested?.()).toBe(false);
        mutableToken.isCancellationRequested = true;
        expect(guard.isCancellationRequested?.()).toBe(true);
      },
    );
  });

  test("uses one captured guard for exact ownership and document feature work", async () => {
    const ctx = context();
    const handler = vi.fn(async (_guard: unknown) => "owned");

    const result = await runSemanticRuntimeDocumentRequest(
      ctx as never,
      "hover",
      token as never,
      "file:///app/src/app.html",
      () => "not-authored",
      handler,
    );

    expect(result).toBe("owned");
    expect(ctx.semanticRuntime.requestGuard).toHaveBeenCalledOnce();
    const ownershipGuard = ctx.semanticRuntime.authoredSourceOwnership.mock.calls[0]?.[1];
    const handlerGuard = handler.mock.calls[0]?.[0];
    expect(handlerGuard).toBe(ownershipGuard);
  });

  test("returns the neutral result without running semantic feature work for an unowned source", async () => {
    const ctx = context();
    ctx.semanticRuntime.authoredSourceOwnership.mockResolvedValue({
      value: { sourceFilePath: "/app/golden/app.html", owners: [] },
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

  test("does not open semantic ownership for a URI outside the coarse workspace boundary", async () => {
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
    expect(ctx.semanticRuntime.authoredSourceOwnership).not.toHaveBeenCalled();
  });

  test("asks diagnostic clients to retrigger work invalidated by a newer source generation", async () => {
    const ctx = context();

    const request = runSemanticRuntimeDiagnosticRequest(
      ctx as never,
      token as never,
      () => { throw new SemanticRuntimeLspRequestAbortedError("stale"); },
      "file:///app/src/app.html",
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
      () => { throw new SemanticRuntimeLspRequestAbortedError("cancelled"); },
      "file:///app/src/app.html",
    );

    await expect(request).rejects.toMatchObject({ code: LSPErrorCodes.RequestCancelled });
  });
});
