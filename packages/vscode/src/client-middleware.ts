import type { CancellationToken, CodeAction, TextDocument, Uri } from "vscode";
import type { Middleware } from "vscode-languageclient/node";
import type * as LanguageClientProtocol from "vscode-languageclient/node";
import {
  AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA,
  templateCodeActionResolveRefusalFromData,
  type TemplateCodeActionResolveRefusalKind,
} from "@aurelia-ls/language-server/protocol";
import {
  emitExtensionHostObservation,
  extensionHostTailObservationEnabled,
  nextExtensionHostObservationId,
} from "./extension-host-observation.js";
import type { ClientLogger } from "./log.js";
import type { VscodeApi } from "./vscode-api.js";
import {
  globalActivationTopologyOwner,
  readWorkspaceActivationTopology,
} from "./workspace-activation.js";
import { workspaceEditVersionMismatches } from "./workspace-edit-versions.js";

type MiddlewareLanguageClient = {
  readonly client: {
    sendRequest<T>(method: string, params?: unknown, token?: CancellationToken): Promise<T>;
    code2ProtocolConverter: {
      asCodeActionSync(action: CodeAction): LanguageClientProtocol.CodeAction;
    };
    protocol2CodeConverter: {
      asCodeAction(action: LanguageClientProtocol.CodeAction, token: CancellationToken): Promise<CodeAction | undefined>;
    };
  } | undefined;
};

export function createMiddleware(
  vscode: VscodeApi,
  logger: ClientLogger,
  client: MiddlewareLanguageClient,
): Middleware {
  return {
    ...extensionHostTailMiddleware(),
    workspace: {
      didChangeWatchedFile: async (event, next) => {
        const uri = vscode.Uri.parse(event.uri);
        const topology = readWorkspaceActivationTopology(vscode);
        if (globalActivationTopologyOwner(topology, uri) != null) {
          return;
        }
        await next(event);
      },
    },
    resolveCodeAction: async (action, token, next) => {
      if (!isAureliaTemplateCodeAction(action)) {
        return next(action, token);
      }
      const rawClient = client.client;
      if (!rawClient) {
        return next(action, token);
      }
      // VS Code resolves a lazy action immediately before applying it. Own the
      // raw request so document versions remain available until after the final
      // asynchronous protocol conversion.
      const resolved = await rawClient.sendRequest<LanguageClientProtocol.CodeAction>(
        "codeAction/resolve",
        rawClient.code2ProtocolConverter.asCodeActionSync(action),
        token,
      );
      if (token.isCancellationRequested) {
        return action;
      }
      const converted = await rawClient.protocol2CodeConverter.asCodeAction(resolved, token);
      if (token.isCancellationRequested) {
        return action;
      }
      const refusal = templateCodeActionResolveRefusalFromData(resolved.data);
      if (refusal != null) {
        refuseCodeAction(
          vscode,
          logger,
          action.title,
          refusal.reason,
          templateCodeActionRefusalRecovery(refusal.kind),
        );
        return action;
      }
      if (resolved.edit == null || converted?.edit == null) {
        refuseCodeAction(
          vscode,
          logger,
          action.title,
          "the action is no longer applicable",
        );
        return action;
      }
      const mismatches = workspaceEditVersionMismatches(vscode, resolved.edit);
      if (mismatches.length > 0) {
        refuseCodeAction(vscode, logger, action.title, `editor documents changed: ${mismatches.join("; ")}`);
        return action;
      }
      return converted;
    },
  };
}

function extensionHostTailMiddleware(): Pick<Middleware, "provideDiagnostics" | "provideCompletionItem"> {
  if (!extensionHostTailObservationEnabled()) return {};
  return {
    provideDiagnostics: async (document, previousResultId, token, next) => {
      const observationId = nextExtensionHostObservationId("host-tail-diagnostics");
      if (observationId == null) return next(document, previousResultId, token);
      const documentIdentity = observedDocumentIdentity(document);
      emitExtensionHostObservation({
        source: "language-client-provider",
        observationId,
        phase: "request",
        operation: "diagnostics",
        epochMilliseconds: Date.now(),
        monotonicMilliseconds: performance.now(),
        ...documentIdentity,
        previousResultIdPresent: previousResultId !== undefined,
      });
      try {
        const report = await next(document, previousResultId, token);
        emitExtensionHostObservation({
          source: "language-client-provider",
          observationId,
          phase: "response",
          operation: "diagnostics",
          epochMilliseconds: Date.now(),
          monotonicMilliseconds: performance.now(),
          ...documentIdentity,
          reportKind: report?.kind ?? "null",
          itemCount: report != null && "items" in report ? report.items.length : null,
          resultIdPresent: report?.resultId != null,
          cancellationRequested: token.isCancellationRequested,
        });
        return report;
      } catch (error) {
        emitExtensionHostObservation({
          source: "language-client-provider",
          observationId,
          phase: "failed",
          operation: "diagnostics",
          epochMilliseconds: Date.now(),
          monotonicMilliseconds: performance.now(),
          ...documentIdentity,
          cancellationRequested: token.isCancellationRequested,
          errorName: error instanceof Error ? error.name : "Error",
          serverRetriggerRequested: diagnosticServerRetriggerRequested(error),
        });
        throw error;
      }
    },
    provideCompletionItem: async (document, position, context, token, next) => {
      const observationId = nextExtensionHostObservationId("host-tail-completion");
      if (observationId == null) return next(document, position, context, token);
      const documentIdentity = observedDocumentIdentity(document);
      emitExtensionHostObservation({
        source: "language-client-provider",
        observationId,
        phase: "request",
        operation: "completion",
        epochMilliseconds: Date.now(),
        monotonicMilliseconds: performance.now(),
        ...documentIdentity,
        line: position.line,
        character: position.character,
      });
      try {
        const result = await next(document, position, context, token);
        emitExtensionHostObservation({
          source: "language-client-provider",
          observationId,
          phase: "response",
          operation: "completion",
          epochMilliseconds: Date.now(),
          monotonicMilliseconds: performance.now(),
          ...documentIdentity,
          itemCount: Array.isArray(result) ? result.length : result?.items.length ?? 0,
          isIncomplete: Array.isArray(result) || result == null ? false : result.isIncomplete,
          cancellationRequested: token.isCancellationRequested,
        });
        return result;
      } catch (error) {
        emitExtensionHostObservation({
          source: "language-client-provider",
          observationId,
          phase: "failed",
          operation: "completion",
          epochMilliseconds: Date.now(),
          monotonicMilliseconds: performance.now(),
          ...documentIdentity,
          cancellationRequested: token.isCancellationRequested,
          errorName: error instanceof Error ? error.name : "Error",
        });
        throw error;
      }
    },
  };
}

function observedDocumentIdentity(document: TextDocument | Uri): {
  readonly uri: string;
  readonly documentVersion: number | null;
} {
  return "uri" in document
    ? { uri: document.uri.toString(), documentVersion: document.version }
    : { uri: document.toString(), documentVersion: null };
}

function diagnosticServerRetriggerRequested(error: unknown): boolean {
  try {
    if (error == null || typeof error !== "object" || !("data" in error)) return false;
    const data = error.data;
    return data != null
      && typeof data === "object"
      && "retriggerRequest" in data
      && data.retriggerRequest === true;
  } catch {
    return false;
  }
}

function isAureliaTemplateCodeAction(action: CodeAction): boolean {
  const data = (action as CodeAction & { readonly data?: unknown }).data;
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  const semanticRuntime = (data as Record<string, unknown>)["semanticRuntime"];
  if (semanticRuntime == null || typeof semanticRuntime !== "object" || Array.isArray(semanticRuntime)) {
    return false;
  }
  const resolve = (semanticRuntime as Record<string, unknown>)["resolve"];
  return resolve != null
    && typeof resolve === "object"
    && !Array.isArray(resolve)
    && (resolve as Record<string, unknown>)["schema"] === AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA;
}

function refuseCodeAction(
  vscode: VscodeApi,
  logger: ClientLogger,
  title: string,
  reason: string,
  recovery = "Request the code action again.",
): void {
  logger.warn(`[codeAction] '${title}' was not applied because ${reason}`);
  void vscode.window.showWarningMessage(
    `Aurelia code action was not applied because ${reason}. ${recovery}`,
  );
}

function templateCodeActionRefusalRecovery(kind: TemplateCodeActionResolveRefusalKind): string {
  switch (kind) {
    case "sourceDocumentUnavailable":
      return "Restore or reopen the source document before requesting another code action.";
    case "semanticPlanNoLongerMatches":
      return "Review the current source, then request a fresh code action.";
    case "semanticPlanAmbiguous":
      return "Disambiguate the current source before requesting another code action.";
    case "editMappingFailed":
      return "Review the current source and make the change manually.";
  }
}
