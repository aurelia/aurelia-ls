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
import { runServerOperation } from "./lifecycle.js";

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
  try {
    return await runServerOperation(ctx, () =>
      ctx.semanticRuntime.runRequest(semanticRuntimeCancellationProbe(token), request));
  } catch (error) {
    throw requestFailure(ctx, feature, cancellationPrecedence(error, token), uri);
  }
}

/**
 * Run an incoming document request only when the current semantic-runtime boot
 * admits that exact source as authored by at least one project.
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
  whenNotAuthored: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
  request: (operation: SemanticRuntimeLspOperation) => T | Promise<T>,
): Promise<T> {
  try {
    return await runServerOperation(ctx, () =>
      ctx.semanticRuntime.runRequest(
        semanticRuntimeCancellationProbe(token),
        async (operation) => {
          if (!ctx.ownsDocument(uri)) {
            return await whenNotAuthored(operation);
          }
          const ownership = await operation.authoredSourceOwnership(uri);
          if (ownership.value.owners.length === 0) {
            return await whenNotAuthored(operation);
          }
          return await request(operation);
        },
      ));
  } catch (error) {
    throw requestFailure(ctx, feature, cancellationPrecedence(error, token), uri);
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
  try {
    return await runServerOperation(ctx, () =>
      ctx.semanticRuntime.runDiagnosticRequest(
        semanticRuntimeCancellationProbe(token),
        request,
        render,
      ));
  } catch (error) {
    const failure = cancellationPrecedence(error, token);
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
    ctx.logger.log(
      `[${feature}] ${error.reason} semantic-runtime request${location}${semanticRuntimeStaleFacts(error)}`,
    );
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
