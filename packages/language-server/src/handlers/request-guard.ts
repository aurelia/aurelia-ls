import {
  isSemanticRuntimeAnalysisCurrentnessError,
  ManagedSemanticWorkspaceOperationStaleError,
} from "@aurelia-ls/semantic-runtime";
import {
  type DiagnosticServerCancellationData,
  LSPErrorCodes,
  ResponseError,
  type CancellationToken,
} from "vscode-languageserver/node";
import type { ServerContext } from "../context.js";
import {
  isSemanticRuntimeLspRequestAborted,
  SemanticRuntimeLspRequestAbortedError,
  type SemanticRuntimeLspDiagnosticRenderer,
  type SemanticRuntimeLspDiagnosticReport,
  type SemanticRuntimeLspDiagnosticRequest,
  type SemanticRuntimeLspOperation,
} from "../runtime/semantic-runtime-session.js";
import {
  runServerOperation,
  scheduleAnalysisRefreshForRequestCurrentness,
} from "./lifecycle.js";

export type SemanticRuntimeDocumentAdmissionFailure =
  | "outside-workspace"
  | "not-authored"
  | "ambiguous";

function semanticRuntimeCancellationProbe(
  token: CancellationToken | undefined,
): (() => boolean) | null {
  return token == null ? null : () => token.isCancellationRequested;
}

export async function runSemanticRuntimeRequest<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  request: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
  uri?: string,
): Promise<T> {
  const observation = beginSupportObservation(ctx, feature, uri);
  try {
    const result = await runServerOperation(ctx, () =>
      ctx.semanticRuntime.runRequest(semanticRuntimeCancellationProbe(token), request));
    observation.finish({ outcome: "succeeded" });
    return result;
  } catch (error) {
    const failure = cancellationPrecedence(error, token);
    observation.finish(supportTerminalFacts(error, failure, token));
    scheduleAnalysisRefreshForRequestCurrentness(ctx, error);
    throw requestFailure(ctx, feature, failure, uri);
  }
}

/**
 * Run an incoming document request only when the current semantic-runtime boot
 * admits that exact source as authored by at least one project. Unkeyed standard providers opt into exact-one
 * admission; project-aware custom requests retain the full candidate set for explicit selection.
 *
 * URI/workspace ownership remains the coarse transport boundary. The runtime
 * answer is the project-specific authority and deliberately belongs to the
 * same managed operation as feature projection, so topology cannot race the gate.
 */
export async function runSemanticRuntimeDocumentRequest<T>(
  ctx: ServerContext,
  feature: string,
  token: CancellationToken,
  uri: string,
  whenUnavailable: (
    operation: SemanticRuntimeLspOperation,
    failure: SemanticRuntimeDocumentAdmissionFailure,
  ) => T | Promise<T>,
  request: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
  options: { readonly requireExactProjectOwner?: boolean } = {},
): Promise<T> {
  const observation = beginSupportObservation(ctx, feature, uri);
  try {
    const result = await runServerOperation(ctx, () =>
      ctx.semanticRuntime.runRequest(
        semanticRuntimeCancellationProbe(token),
        async (operation) => {
          if (!ctx.ownsDocument(uri)) {
            return await whenUnavailable(operation, "outside-workspace");
          }
          const ownership = await operation.authoredSourceOwnership(uri);
          const ownerCount = ownership.value.owners.length;
          if (
            ownerCount === 0
            || (options.requireExactProjectOwner === true && ownerCount !== 1)
          ) {
            return await whenUnavailable(
              operation,
              ownerCount === 0 ? "not-authored" : "ambiguous",
            );
          }
          return await request(operation);
        },
      ));
    observation.finish({ outcome: "succeeded" });
    return result;
  } catch (error) {
    const failure = cancellationPrecedence(error, token);
    observation.finish(supportTerminalFacts(error, failure, token));
    scheduleAnalysisRefreshForRequestCurrentness(ctx, error);
    throw requestFailure(ctx, feature, failure, uri);
  }
}

/**
 * Run a diagnostic pull without laundering server-side invalidation into an empty report.
 *
 * LSP 3.17 gives diagnostics a dedicated cancellation contract: a server that invalidates
 * an in-flight pull must return `ServerCancelled` with `retriggerRequest: true`. The VS Code
 * language client treats generic `ContentModified` as a successful empty fallback instead.
 */
export async function runSemanticRuntimeDiagnosticRequest<TItem>(
  ctx: ServerContext,
  token: CancellationToken,
  request: SemanticRuntimeLspDiagnosticRequest,
  render: SemanticRuntimeLspDiagnosticRenderer<TItem>,
): Promise<SemanticRuntimeLspDiagnosticReport<TItem>> {
  const observation = beginSupportObservation(ctx, "diagnostics", request.uri);
  try {
    const result = await runServerOperation(ctx, () =>
      ctx.semanticRuntime.runDiagnosticRequest(
        semanticRuntimeCancellationProbe(token),
        request,
        render,
      ));
    observation.finish({ outcome: "succeeded" });
    return result;
  } catch (error) {
    scheduleAnalysisRefreshForRequestCurrentness(ctx, error);
    const failure = cancellationPrecedence(error, token);
    observation.finish(supportTerminalFacts(error, failure, token));
    if (isSemanticRuntimeRequestStale(failure)) {
      ctx.logger.log(
        `[diagnostics] stale semantic-runtime request for ${request.uri}${semanticRuntimeStaleFacts(failure)}`,
      );
      throw new ResponseError<DiagnosticServerCancellationData>(
        LSPErrorCodes.ServerCancelled,
        "Aurelia diagnostics changed while the request was running.",
        { retriggerRequest: true },
      );
    }
    throw requestFailure(ctx, "diagnostics", failure, request.uri);
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
    // Client cancellation is routine provider supersession. Keep it in the bounded support ledger without flooding
    // the user-facing output channel; stale requests remain actionable currentness evidence and are still logged.
    if (error.reason === "stale") {
      ctx.logger.log(
        `[${feature}] stale semantic-runtime request${location}${semanticRuntimeStaleFacts(error)}`,
      );
    }
    return new ResponseError(code, error.reason === "cancelled"
      ? `Aurelia ${feature} request was cancelled.`
      : `Aurelia ${feature} request used stale document content.`);
  }
  if (error instanceof ManagedSemanticWorkspaceOperationStaleError) {
    ctx.logger.log(
      `[${feature}] stale semantic-runtime request${location}${semanticRuntimeStaleFacts(error)}`,
    );
    return new ResponseError(
      LSPErrorCodes.ContentModified,
      `Aurelia ${feature} request used stale document content.`,
    );
  }

  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  ctx.logger.error(`[${feature}] failed${location}: ${detail}`);
  return new ResponseError(
    LSPErrorCodes.RequestFailed,
    `Aurelia ${feature} failed. See the Aurelia language server output for details.`,
  );
}

function isSemanticRuntimeRequestStale(error: unknown): boolean {
  return error instanceof ManagedSemanticWorkspaceOperationStaleError
    || (isSemanticRuntimeLspRequestAborted(error) && error.reason === "stale");
}

const STALE_EVIDENCE_ITEM_LIMIT = 8;

function semanticRuntimeStaleFacts(error: unknown): string {
  if (error instanceof ManagedSemanticWorkspaceOperationStaleError) {
    return formattedStaleFacts(managedOperationStaleFacts(error));
  }
  if (!isSemanticRuntimeLspRequestAborted(error) || error.reason !== "stale") {
    return "";
  }
  if (error.cause instanceof ManagedSemanticWorkspaceOperationStaleError) {
    return formattedStaleFacts(managedOperationStaleFacts(error.cause));
  }
  if (isSemanticRuntimeAnalysisCurrentnessError(error.cause)) {
    return formattedStaleFacts({
      staleOrigin: "analysis-currentness",
      analysisReason: error.cause.reason,
      answerLeaseKind: error.cause.answerLeaseKind,
      invalidGenerationKeys: boundedStaleEvidence(error.cause.invalidGenerationKeys),
      invalidGenerationKeyCount: error.cause.invalidGenerationKeys.length,
      changedReadKeys: boundedStaleEvidence(error.cause.changedReadKeys),
      changedReadKeyCount: error.cause.changedReadKeys.length,
      changedFacets: boundedStaleEvidence(error.cause.changedFacets),
      changedFacetCount: error.cause.changedFacets.length,
      changedSemanticFactKeys: boundedStaleEvidence(error.cause.changedSemanticFactKeys),
      changedSemanticFactKeyCount: error.cause.changedSemanticFactKeys.length,
    });
  }
  return formattedStaleFacts({
    staleOrigin: "request-generation",
    causeName: nominalCauseName(error.cause),
  });
}

function managedOperationStaleFacts(
  error: ManagedSemanticWorkspaceOperationStaleError,
): Readonly<Record<string, string | number | null | readonly string[]>> {
  const invalidGenerationKeys = error.analysisCurrentness?.invalidGenerationKeys ?? [];
  return {
    staleOrigin: "managed-operation",
    managedReason: error.reason,
    currentnessKind: error.currentnessKind,
    previousSourceWorldRevision: error.previousSourceWorldRevision,
    nextSourceWorldRevision: error.nextSourceWorldRevision,
    analysisBasisRevision: error.analysisBasisRevision,
    changedReadKeys: boundedStaleEvidence(error.changedReadKeys),
    changedReadKeyCount: error.changedReadKeys.length,
    changedFacets: boundedStaleEvidence(error.changedFacets),
    changedFacetCount: error.changedFacets.length,
    changedSemanticFactKeys: boundedStaleEvidence(error.changedSemanticFactKeys),
    changedSemanticFactKeyCount: error.changedSemanticFactKeys.length,
    analysisReason: error.analysisCurrentness?.reason ?? null,
    answerLeaseKind: error.analysisCurrentness?.answerLeaseKind ?? null,
    invalidGenerationKeys: boundedStaleEvidence(invalidGenerationKeys),
    invalidGenerationKeyCount: invalidGenerationKeys.length,
  };
}

function boundedStaleEvidence(values: readonly string[]): readonly string[] {
  return values.length <= STALE_EVIDENCE_ITEM_LIMIT
    ? values
    : values.slice(0, STALE_EVIDENCE_ITEM_LIMIT);
}

function nominalCauseName(cause: unknown): string | null {
  return cause instanceof Error ? cause.name : null;
}

function formattedStaleFacts(
  facts: Readonly<Record<string, string | number | null | readonly string[]>>,
): string {
  return `; stale-facts=${JSON.stringify(facts)}`;
}

function cancellationPrecedence(
  error: unknown,
  token: CancellationToken,
): unknown {
  return token.isCancellationRequested && isSemanticRuntimeRequestStale(error)
    ? new SemanticRuntimeLspRequestAbortedError("cancelled", error)
    : error;
}

function supportTerminalFacts(
  originalError: unknown,
  visibleError: unknown,
  token: CancellationToken,
) {
  const underlyingStale = staleCause(originalError) != null;
  const clientCancellationRequested = token.isCancellationRequested;
  const outcome = (isSemanticRuntimeLspRequestAborted(visibleError) && visibleError.reason === "cancelled")
    || (visibleError instanceof ResponseError && visibleError.code === LSPErrorCodes.RequestCancelled)
    ? "client-cancelled" as const
    : staleCause(visibleError) != null
      || (visibleError instanceof ResponseError && (
        visibleError.code === LSPErrorCodes.ContentModified
        || visibleError.code === LSPErrorCodes.ServerCancelled
      ))
      ? "stale" as const
      : "failed" as const;
  return {
    outcome,
    clientCancellationRequested,
    underlyingStale,
    staleFacts: staleCause(originalError) ?? staleCause(visibleError),
  };
}

function staleCause(error: unknown) {
  if (error instanceof ManagedSemanticWorkspaceOperationStaleError) {
    return {
      origin: "managed-operation" as const,
      currentnessKind: error.currentnessKind == null ? null : String(error.currentnessKind),
      reason: error.reason,
      answerLeaseKind: error.analysisCurrentness?.answerLeaseKind ?? null,
    };
  }
  if (!isSemanticRuntimeLspRequestAborted(error)) return null;
  if (error.cause instanceof ManagedSemanticWorkspaceOperationStaleError) {
    return staleCause(error.cause);
  }
  if (isSemanticRuntimeAnalysisCurrentnessError(error.cause)) {
    return {
      origin: "analysis-currentness" as const,
      currentnessKind: null,
      reason: error.cause.reason,
      answerLeaseKind: error.cause.answerLeaseKind,
    };
  }
  if (error.reason === "stale") {
    return {
      origin: "request-generation" as const,
      currentnessKind: null,
      reason: error.reason,
      answerLeaseKind: null,
    };
  }
  return null;
}

function beginSupportObservation(
  ctx: ServerContext,
  feature: string,
  uri?: string,
) {
  // Focused embedding/test hosts predating the support surface remain valid; the production context always owns it.
  return ctx.supportLedger?.beginRequest(feature, uri) ?? { finish() {} };
}
