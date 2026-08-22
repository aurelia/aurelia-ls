import type { CancellationToken, CodeAction, TextDocument, Uri, WorkspaceEdit } from "vscode";
import type { Middleware } from "vscode-languageclient/node";
import type * as LanguageClientProtocol from "vscode-languageclient/node";
import {
  AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA,
  type ProtocolWorkspaceEdit,
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
import {
  assertWorkspaceEditTransactionCurrent,
} from "./workspace-edit-versions.js";

type MiddlewareRawClient = {
    sendRequest<T>(method: string, params?: unknown, token?: CancellationToken): Promise<T>;
    code2ProtocolConverter: {
      asCodeActionSync(action: CodeAction): LanguageClientProtocol.CodeAction;
    };
    protocol2CodeConverter: {
      asCodeAction(action: LanguageClientProtocol.CodeAction, token: CancellationToken): Promise<CodeAction | undefined>;
      asWorkspaceEdit(edit: ProtocolWorkspaceEdit, token: CancellationToken): Promise<WorkspaceEdit | undefined>;
    };
};

type MiddlewareLanguageClient = {
  readonly client: MiddlewareRawClient | undefined;
  /** Exact active server-process incarnation for this client and optional source URI. */
  currentIncarnation(client: MiddlewareRawClient, uri?: string): number | null;
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
      const sourceUri = templateCodeActionSourceUri(action);
      const originatingIncarnation = client.currentIncarnation(rawClient, sourceUri ?? undefined);
      if (originatingIncarnation == null) {
        refuseCodeAction(vscode, logger, action.title, "the Aurelia workspace session changed");
        return action;
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
      if (client.currentIncarnation(rawClient, sourceUri ?? undefined) !== originatingIncarnation) {
        refuseCodeAction(vscode, logger, action.title, "the Aurelia workspace session changed");
        return action;
      }
      const converted = await rawClient.protocol2CodeConverter.asCodeAction(resolved, token);
      if (token.isCancellationRequested) {
        return action;
      }
      if (client.currentIncarnation(rawClient, sourceUri ?? undefined) !== originatingIncarnation) {
        refuseCodeAction(vscode, logger, action.title, "the Aurelia workspace session changed");
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
      try {
        await assertWorkspaceEditTransactionCurrent(
          vscode,
          resolved.edit,
          "editor documents changed",
        );
      } catch (error) {
        refuseCodeAction(
          vscode,
          logger,
          action.title,
          error instanceof Error ? error.message : "editor documents changed",
        );
        return action;
      }
      if (token.isCancellationRequested) {
        return action;
      }
      if (client.currentIncarnation(rawClient, sourceUri ?? undefined) !== originatingIncarnation) {
        refuseCodeAction(vscode, logger, action.title, "the Aurelia workspace session changed");
        return action;
      }
      return converted;
    },
    provideRenameEdits: async (document, position, newName, token, next) => {
      if (!isAureliaTemplateDocument(document)) {
        return next(document, position, newName, token);
      }
      const rawClient = client.client;
      if (!rawClient) {
        return next(document, position, newName, token);
      }
      const sourceUri = document.uri.toString();
      const originatingIncarnation = client.currentIncarnation(rawClient, sourceUri);
      if (originatingIncarnation == null) {
        throw new Error("Aurelia rename was blocked because the workspace session changed; retry the rename.");
      }
      const protocolEdit = await rawClient.sendRequest<ProtocolWorkspaceEdit | null>(
        "textDocument/rename",
        {
          textDocument: { uri: document.uri.toString() },
          position: { line: position.line, character: position.character },
          newName,
        },
        token,
      );
      if (token.isCancellationRequested || protocolEdit == null) {
        return undefined;
      }
      assertMiddlewareIncarnationCurrent(client, rawClient, sourceUri, originatingIncarnation, "Aurelia rename");
      const converted = await rawClient.protocol2CodeConverter.asWorkspaceEdit(protocolEdit, token);
      if (token.isCancellationRequested) {
        return undefined;
      }
      if (converted == null) {
        throw new Error("Aurelia rename returned no convertible workspace edit.");
      }
      assertMiddlewareIncarnationCurrent(client, rawClient, sourceUri, originatingIncarnation, "Aurelia rename");
      await assertWorkspaceEditTransactionCurrent(
        vscode,
        protocolEdit,
        "Aurelia rename was blocked because target documents changed",
      );
      assertMiddlewareIncarnationCurrent(client, rawClient, sourceUri, originatingIncarnation, "Aurelia rename");
      logger.debug?.(`[Rename] validated atomic transaction for ${converted.entries().length} files`);
      return converted;
    },
  };
}

function assertMiddlewareIncarnationCurrent(
  client: MiddlewareLanguageClient,
  rawClient: MiddlewareRawClient,
  uri: string,
  incarnation: number,
  operation: string,
): void {
  if (client.currentIncarnation(rawClient, uri) !== incarnation) {
    throw new Error(`${operation} was blocked because the workspace session changed; retry the operation.`);
  }
}

function isAureliaTemplateDocument(document: TextDocument): boolean {
  return document.languageId === "html"
    || document.languageId === "aurelia-html"
    || /\.html?$/iu.test(document.uri.path);
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

function templateCodeActionSourceUri(action: CodeAction): string | null {
  const data = (action as CodeAction & { readonly data?: unknown }).data;
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  const semanticRuntime = (data as Record<string, unknown>)["semanticRuntime"];
  if (semanticRuntime == null || typeof semanticRuntime !== "object" || Array.isArray(semanticRuntime)) return null;
  const resolve = (semanticRuntime as Record<string, unknown>)["resolve"];
  if (resolve == null || typeof resolve !== "object" || Array.isArray(resolve)) return null;
  const textDocument = (resolve as Record<string, unknown>)["textDocument"];
  if (textDocument == null || typeof textDocument !== "object" || Array.isArray(textDocument)) return null;
  const uri = (textDocument as Record<string, unknown>)["uri"];
  return typeof uri === "string" ? uri : null;
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
