import type { CancellationToken, CodeAction } from "vscode";
import type { CodeAction as ProtocolCodeAction, Middleware } from "vscode-languageclient/node";
import { AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA } from "@aurelia-ls/language-server/protocol";
import type { ClientLogger } from "./log.js";
import type { VscodeApi } from "./vscode-api.js";
import { applyDiagnosticsUxAugmentation } from "./features/diagnostics/taxonomy.js";
import { workspaceEditVersionMismatches } from "./workspace-edit-versions.js";

export type DiagnosticsUxState = {
  enabled: boolean;
};

type MiddlewareLanguageClient = {
  readonly client: {
    sendRequest<T>(method: string, params?: unknown, token?: CancellationToken): Promise<T>;
    code2ProtocolConverter: {
      asCodeActionSync(action: CodeAction): ProtocolCodeAction;
    };
    protocol2CodeConverter: {
      asCodeAction(action: ProtocolCodeAction, token: CancellationToken): Promise<CodeAction | undefined>;
    };
  } | undefined;
  readonly inlayHintsEnabled: boolean;
};

export function createMiddleware(
  vscode: VscodeApi,
  logger: ClientLogger,
  diagnosticsUx: DiagnosticsUxState,
  client: MiddlewareLanguageClient,
): Middleware {
  return {
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
      const resolved = await rawClient.sendRequest<ProtocolCodeAction>(
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
      if (resolved.edit == null || converted?.edit == null) {
        refuseCodeAction(vscode, logger, action.title, "the action is no longer applicable");
        return action;
      }
      const mismatches = workspaceEditVersionMismatches(vscode, resolved.edit);
      if (mismatches.length > 0) {
        refuseCodeAction(vscode, logger, action.title, `editor documents changed: ${mismatches.join("; ")}`);
        return action;
      }
      return converted;
    },
    handleDiagnostics: (uri, diagnostics, next) => {
      if (diagnosticsUx.enabled) {
        applyDiagnosticsUxAugmentation(diagnostics);
      }
      next(uri, diagnostics);
    },
    provideInlayHints: async (document, range, token, next) => {
      if (!client.inlayHintsEnabled) return [];
      return next(document, range, token);
    },
  };
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
): void {
  logger.warn(`[codeAction] '${title}' was not applied because ${reason}`);
  void vscode.window.showWarningMessage(
    `Aurelia code action was not applied because ${reason}. Request the code action again.`,
  );
}
