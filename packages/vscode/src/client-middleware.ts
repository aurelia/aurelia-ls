import type { CancellationToken, MarkdownString, SemanticTokens, TextDocument, WorkspaceEdit } from "vscode";
import type { Middleware } from "vscode-languageclient/node";
import type { ClientLogger } from "./log.js";
import type { VscodeApi } from "./vscode-api.js";
import { applyDiagnosticsUxAugmentation } from "./features/diagnostics/taxonomy.js";
import { assertWorkspaceEditVersionsCurrent } from "./features/rename/workspace-edit-versions.js";
import type { ProtocolWorkspaceEdit } from "./types.js";

export type DiagnosticsUxState = {
  enabled: boolean;
};

export type InlineUxState = {
  enabled: boolean;
  onSemanticTokens: ((document: TextDocument, tokens: SemanticTokens) => void) | null;
};

type MiddlewareLanguageClient = {
  readonly client: {
    sendRequest<T>(method: string, params?: unknown, token?: CancellationToken): Promise<T>;
    code2ProtocolConverter: {
      asTextDocumentIdentifier(document: TextDocument): { uri: string };
      asPosition(position: unknown): unknown;
    };
    protocol2CodeConverter: {
      asWorkspaceEdit(workspaceEdit: ProtocolWorkspaceEdit, token: CancellationToken): Promise<WorkspaceEdit | undefined>;
    };
  } | undefined;
  readonly inlayHintsEnabled: boolean;
};

export function createMiddleware(
  vscode: VscodeApi,
  logger: ClientLogger,
  diagnosticsUx: DiagnosticsUxState,
  inlineUx: InlineUxState,
  client: MiddlewareLanguageClient,
): Middleware {
  return {
    provideHover: async (document, position, token, next) => {
      const hover = await next(document, position, token);
      if (!hover) return hover;
      // Upgrade MarkdownString contents to enable command links and theme icons
      hover.contents = hover.contents.map((c) => {
        if (typeof c === "string" || !("value" in c)) return c;
        const md = new vscode.MarkdownString(c.value) as MarkdownString;
        md.isTrusted = true;
        md.supportThemeIcons = true;
        return md;
      });
      return hover;
    },
    provideRenameEdits: async (document, position, newName, token, next) => {
      if (document.languageId !== "html") {
        return next(document, position, newName, token);
      }
      const rawClient = client.client;
      if (!rawClient) {
        return next(document, position, newName, token);
      }
      // Own the standard rename request so we can validate the protocol
      // `documentChanges` versions before VS Code's provider API erases them.
      const workspaceEdit = await rawClient.sendRequest<ProtocolWorkspaceEdit | null>(
        "textDocument/rename",
        {
          textDocument: rawClient.code2ProtocolConverter.asTextDocumentIdentifier(document),
          position: rawClient.code2ProtocolConverter.asPosition(position),
          newName,
        },
        token,
      );
      if (workspaceEdit == null) {
        return null;
      }
      assertWorkspaceEditVersionsCurrent(
        vscode,
        workspaceEdit,
        "Aurelia rename was blocked because editor documents changed",
      );
      return rawClient.protocol2CodeConverter.asWorkspaceEdit(workspaceEdit, token);
    },
    handleDiagnostics: (uri, diagnostics, next) => {
      if (diagnosticsUx.enabled) {
        applyDiagnosticsUxAugmentation(diagnostics);
      }
      next(uri, diagnostics);
    },
    provideDocumentSemanticTokens: async (document, token, next) => {
      const semanticTokens = await next(document, token);
      if (semanticTokens && inlineUx.enabled && inlineUx.onSemanticTokens) {
        try {
          inlineUx.onSemanticTokens(document, semanticTokens);
        } catch (error) {
          logger.warn(`[client] inline semantic token hook failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return semanticTokens;
    },
    provideInlayHints: async (document, range, token, next) => {
      if (!client.inlayHintsEnabled) return [];
      return next(document, range, token);
    },
  };
}
