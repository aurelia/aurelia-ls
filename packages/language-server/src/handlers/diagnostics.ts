import {
  type CancellationToken,
  type DocumentDiagnosticParams,
  type DocumentDiagnosticReport,
} from "vscode-languageserver/node";
import {
  AURELIA_PROJECT_CONFIGURATION_FILE_NAME,
  inferSourceLanguage,
  SourceLanguage,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  mapSemanticProjectConfigurationDiagnostics,
  mapSemanticRuntimeAppDiagnostics,
} from "../mapping/lsp-types.js";
import { runSemanticRuntimeDiagnosticRequest } from "./request-guard.js";

const DIAGNOSTIC_PRESENTATION_SCHEMA = "lsp-document-diagnostics/v2";

export function registerDiagnosticHandlers(ctx: ServerContext): void {
  ctx.connection.languages.diagnostics.on((params, token) =>
    documentDiagnostics(ctx, params, token));
}

async function documentDiagnostics(
  ctx: ServerContext,
  params: DocumentDiagnosticParams,
  token: CancellationToken,
): Promise<DocumentDiagnosticReport> {
  return runSemanticRuntimeDiagnosticRequest(ctx, token, {
    uri: params.textDocument.uri,
    identifier: params.identifier ?? null,
    previousResultId: params.previousResultId ?? null,
    projectionKey: DIAGNOSTIC_PRESENTATION_SCHEMA,
  }, async (operation) => {
    const document = operation.documents.ensureProgramDocument(params.textDocument.uri);
    if (document == null) {
      return [];
    }

    if (isNativeProjectConfiguration(ctx, document.uri)) {
      const answer = await operation.projectConfigurationDiagnostics(document.uri);
      const visibleAnswer = ctx.projectConfigurationParserDiagnostics === "client"
        ? {
            ...answer,
            value: {
              ...answer.value,
              rows: answer.value.rows.filter((row) => !isClientOwnedProjectConfigurationParserDiagnostic(
                row.diagnosticKind,
              )),
            },
          }
        : answer;
      const mapped = mapSemanticProjectConfigurationDiagnostics(visibleAnswer, document, ctx.documentUris);
      if (mapped.failures.length > 0) {
        operation.deferEffect({
          kind: "log",
          level: "warn",
          message: `[diagnostics] omitted ${mapped.failures.length} project-configuration row(s): ${mapped.failures.join(" ")}`,
        });
      }
      return mapped.value;
    }

    // JSON participates in the client selector only so native project configuration can
    // reach this session-owned validator. Other JSON documents keep their native editor
    // behavior and never enter Aurelia app-diagnostic projection.
    if (inferSourceLanguage(document.uri) === SourceLanguage.Json) {
      return [];
    }

    const ownership = await operation.authoredSourceOwnership(document.uri);
    // A document diagnostic pull has no project selector. Publishing either owner's rows would make Problems depend
    // on arbitrary project order, so overlap stays explicitly clear while project-aware discovery exposes candidates.
    if (ownership.value.owners.length !== 1) {
      return [];
    }

    const answer = await operation.appDiagnostics(document);
    const mapped = mapSemanticRuntimeAppDiagnostics(
      answer,
      document,
      ctx.documentUris,
      (uri) => operation.documents.lookupText(uri),
      {
        clientOwnsTypeScriptProgramDiagnostics: ctx.typeScriptProgramDiagnostics === "client",
      },
    );
    if (mapped.failures.length > 0) {
      operation.deferEffect({
        kind: "log",
        level: "warn",
        message: `[diagnostics] omitted ${mapped.failures.length} source-backed row(s): ${mapped.failures.join(" ")}`,
      });
    }
    return mapped.value;
  });
}

function isClientOwnedProjectConfigurationParserDiagnostic(
  diagnosticKind: string,
): boolean {
  return diagnosticKind === "aurelia-project-config-syntax"
    || diagnosticKind === "aurelia-project-config-duplicate-property";
}

function isNativeProjectConfiguration(ctx: ServerContext, uri: string): boolean {
  return ctx.documentUris.hasHostFileName(uri, AURELIA_PROJECT_CONFIGURATION_FILE_NAME);
}
