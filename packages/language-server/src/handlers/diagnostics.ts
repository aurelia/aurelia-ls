import {
  DocumentDiagnosticReportKind,
  type CancellationToken,
  type DocumentDiagnosticParams,
  type DocumentDiagnosticReport,
} from "vscode-languageserver/node";
import path from "node:path";
import {
  AURELIA_PROJECT_CONFIGURATION_FILE_NAME,
  canonicalTypeSystemPath,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  mapSemanticProjectConfigurationDiagnostics,
  mapSemanticRuntimeAppDiagnostics,
} from "../mapping/lsp-types.js";
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
    const generation = await ctx.semanticRuntime.preflight(guard);
    const document = ctx.ensureProgramDocument(params.textDocument.uri);
    if (document == null) {
      const resultId = `${generation.fingerprint}:document-closed`;
      if (params.previousResultId === resultId) {
        return { kind: DocumentDiagnosticReportKind.Unchanged, resultId };
      }
      return {
        kind: DocumentDiagnosticReportKind.Full,
        resultId,
        items: [],
      };
    }

    if (isNativeProjectConfiguration(ctx, document.uri)) {
      const answer = await ctx.semanticRuntime.projectConfigurationDiagnostics(document.uri, guard);
      const resultId = diagnosticResultId(generation.fingerprint, document.version, answer);
      if (params.previousResultId === resultId) {
        return { kind: DocumentDiagnosticReportKind.Unchanged, resultId };
      }
      const mapped = mapSemanticProjectConfigurationDiagnostics(answer, document, ctx.documentUris);
      if (mapped.failures.length > 0) {
        ctx.logger.warn(
          `[diagnostics] omitted ${mapped.failures.length} project-configuration row(s): ${mapped.failures.join(" ")}`,
        );
      }
      return {
        kind: DocumentDiagnosticReportKind.Full,
        resultId,
        items: mapped.value,
      };
    }

    const ownership = await ctx.semanticRuntime.authoredSourceOwnership(document.uri, guard);
    if (ownership.value.owners.length === 0) {
      const resultId = diagnosticResultId(generation.fingerprint, document.version, ownership);
      if (params.previousResultId === resultId) {
        return { kind: DocumentDiagnosticReportKind.Unchanged, resultId };
      }
      return {
        kind: DocumentDiagnosticReportKind.Full,
        resultId,
        items: [],
      };
    }

    const answer = await ctx.semanticRuntime.appDiagnostics(document, guard);
    const resultId = diagnosticResultId(generation.fingerprint, document.version, answer);
    if (params.previousResultId === resultId) {
      return { kind: DocumentDiagnosticReportKind.Unchanged, resultId };
    }
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

function diagnosticResultId(
  generationFingerprint: string,
  documentVersion: number,
  answer: { readonly analysisBasis?: { readonly revision: string } },
): string {
  const revision = answer.analysisBasis?.revision;
  if (revision == null) {
    throw new Error("Semantic-runtime diagnostic input returned without an exact analysis basis.");
  }
  return `${generationFingerprint}:answer-${revision}:document-${documentVersion}`;
}

function isNativeProjectConfiguration(ctx: ServerContext, uri: string): boolean {
  const hostPath = ctx.documentUris.hostPath(uri);
  if (hostPath == null) return false;
  return canonicalTypeSystemPath(hostPath) === canonicalTypeSystemPath(
    path.join(path.dirname(hostPath), AURELIA_PROJECT_CONFIGURATION_FILE_NAME),
  );
}
