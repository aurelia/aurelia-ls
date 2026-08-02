import {
  type DiagnosticServerCancellationData,
  LSPErrorCodes,
  ResponseError,
  type CancellationToken,
} from "vscode-languageserver/node";
import type { ServerContext } from "../context.js";
import {
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspRequestGuard,
} from "../runtime/semantic-runtime-session.js";
import { runServerOperation } from "./lifecycle.js";

export function semanticRuntimeRequestGuard(
  ctx: ServerContext,
  token: CancellationToken | undefined,
): SemanticRuntimeLspRequestGuard {
  return ctx.semanticRuntime.requestGuard(token == null ? null : () => token.isCancellationRequested);
}

export async function runSemanticRuntimeRequest<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  request: (guard: SemanticRuntimeLspRequestGuard) => T | Promise<T>,
  uri?: string,
): Promise<T> {
  try {
    return await runServerOperation(ctx, () =>
      request(semanticRuntimeRequestGuard(ctx, token)));
  } catch (error) {
    throw requestFailure(ctx, feature, error, uri);
  }
}

/**
 * Run a diagnostic pull without laundering server-side invalidation into an empty report.
 *
 * LSP 3.17 gives diagnostics a dedicated cancellation contract: a server that invalidates
 * an in-flight pull must return `ServerCancelled` with `retriggerRequest: true`. The VS Code
 * language client treats generic `ContentModified` as a successful empty fallback instead.
 */
export async function runSemanticRuntimeDiagnosticRequest<T>(
  ctx: ServerContext,
  token: CancellationToken,
  request: (guard: SemanticRuntimeLspRequestGuard) => T | Promise<T>,
  uri: string,
): Promise<T> {
  try {
    return await runServerOperation(ctx, () =>
      request(semanticRuntimeRequestGuard(ctx, token)));
  } catch (error) {
    if (isSemanticRuntimeLspRequestAborted(error) && error.reason === "stale") {
      ctx.logger.log(`[diagnostics] stale semantic-runtime request for ${uri}`);
      throw new ResponseError<DiagnosticServerCancellationData>(
        LSPErrorCodes.ServerCancelled,
        "Aurelia diagnostics changed while the request was running.",
        { retriggerRequest: true },
      );
    }
    throw requestFailure(ctx, "diagnostics", error, uri);
  }
}

export function requestFailure(
  ctx: ServerContext,
  feature: string,
  error: unknown,
  uri?: string,
): ResponseError<unknown> {
  const location = uri == null ? "" : ` for ${uri}`;
  if (error instanceof ResponseError) {
    return error;
  }
  if (isSemanticRuntimeLspRequestAborted(error)) {
    const code = error.reason === "cancelled"
      ? LSPErrorCodes.RequestCancelled
      : LSPErrorCodes.ContentModified;
    ctx.logger.log(`[${feature}] ${error.reason} semantic-runtime request${location}`);
    return new ResponseError(code, error.reason === "cancelled"
      ? `Aurelia ${feature} request was cancelled.`
      : `Aurelia ${feature} request used stale document content.`);
  }

  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  ctx.logger.error(`[${feature}] failed${location}: ${detail}`);
  return new ResponseError(
    LSPErrorCodes.RequestFailed,
    `Aurelia ${feature} failed. See the Aurelia language server output for details.`,
  );
}
