import {
  LSPErrorCodes,
  ResponseError,
} from "vscode-languageserver/node";
import { describe, expect, test, vi } from "vitest";
import {
  requestFailure,
  runSemanticRuntimeDiagnosticRequest,
  runSemanticRuntimeRequest,
} from "../../src/handlers/request-guard.js";
import { SemanticRuntimeLspRequestAbortedError } from "../../src/runtime/semantic-runtime-session.js";

function context() {
  return {
    semanticRuntime: {
      requestGuard: vi.fn((isCancellationRequested) => ({
        generation: {
          workspaceGeneration: 1,
          sourceGeneration: 2,
          fingerprint: "test-generation",
        },
        isCancellationRequested,
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
