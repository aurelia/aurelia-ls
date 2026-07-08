import type { CancellationToken } from "vscode-languageserver/node.js";
import type { ServerContext } from "../context.js";
import {
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspRequestAbortedError,
  type SemanticRuntimeLspRequestGuard,
} from "../runtime/semantic-runtime-session.js";

export function semanticRuntimeRequestGuard(
  ctx: ServerContext,
  token: CancellationToken | undefined,
): SemanticRuntimeLspRequestGuard {
  return ctx.semanticRuntime.requestGuard(token == null ? null : () => token.isCancellationRequested);
}

export function logIfSemanticRuntimeRequestAborted(
  ctx: ServerContext,
  feature: string,
  error: unknown,
  uri?: string,
): error is SemanticRuntimeLspRequestAbortedError {
  if (!isSemanticRuntimeLspRequestAborted(error)) {
    return false;
  }
  const location = uri == null ? "" : ` for ${uri}`;
  ctx.logger.log(`[${feature}] skipped ${error.reason} semantic-runtime request${location}`);
  return true;
}
