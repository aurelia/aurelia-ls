import {
  DocumentDiagnosticReportKind,
  type CancellationToken,
  type DocumentDiagnosticParams,
  type DocumentDiagnosticReport,
} from "vscode-languageserver/node";
import type { ServerContext } from "../context.js";
import { mapSemanticRuntimeAppDiagnostics } from "../mapping/lsp-types.js";
import { runSemanticRuntimeDiagnosticRequest } from "./request-guard.js";

export function registerDiagnosticHandlers(ctx: ServerContext): void {
  ctx.connection.languages.diagnostics.on((params, token) =>
    documentDiagnostics(ctx, params, token));
}

async function documentDiagnostics(
  ctx: ServerContext,
  params: DocumentDiagnosticParams,
  token: CancellationToken,
): Promise<DocumentDiagnosticReport> {
  return runSemanticRuntimeDiagnosticRequest(ctx, token, async (guard) => {
    const document = ctx.ensureProgramDocument(params.textDocument.uri);
    const resultId = `${guard.generation.fingerprint}:document-${document?.version ?? "closed"}`;
    if (params.previousResultId === resultId) {
      return {
        kind: DocumentDiagnosticReportKind.Unchanged,
        resultId,
      };
    }
    if (document == null) {
      return {
        kind: DocumentDiagnosticReportKind.Full,
        resultId,
        items: [],
      };
    }

    const answer = await ctx.semanticRuntime.appDiagnostics(document, guard);
    const mapped = mapSemanticRuntimeAppDiagnostics(
      answer,
      document,
      ctx.documentUris,
      (uri) => ctx.lookupText(uri),
    );
    if (mapped.failures.length > 0) {
      ctx.logger.warn(
        `[diagnostics] omitted ${mapped.failures.length} source-backed row(s): ${mapped.failures.join(" ")}`,
      );
    }
    return {
      kind: DocumentDiagnosticReportKind.Full,
      resultId,
      items: mapped.value,
    };
  }, params.textDocument.uri);
}
