/**
 * Atomic TypeScript-origin rename across TypeScript and Aurelia-authored surfaces.
 *
 * The semantic runtime owns the complete related-symbol edit plan whenever a
 * TypeScript symbol participates in Aurelia semantics. Returning undefined for
 * other symbols deliberately lets VS Code continue to its built-in TypeScript
 * provider. Calling vscode.executeDocumentRenameProvider from this provider is
 * not a delegation mechanism: VS Code extension providers rank ahead of the
 * built-in provider and the command re-enters this provider through RPC.
 */
import type { ClientFeature } from "../../core/feature.js";
import { DisposableStore, toDisposable, type DisposableLike } from "../../core/disposables.js";
import type { ProtocolWorkspaceEdit, RenameFromTsResponse } from "../../types.js";
import { assertWorkspaceEditVersionsCurrent } from "../../workspace-edit-versions.js";

export const TsRenameFeature: ClientFeature = {
  id: "rename.tsPropagate",
  activate: async (ctx) => {
    const store = new DisposableStore();
    const vscode = ctx.vscode;
    const log = ctx.logger;

    const provider: import("vscode").RenameProvider = {
      provideRenameEdits: async (document, position, newName, token) => {
        if (
          isCancelled(token)
          || !isTypeScriptDocument(document)
          || ctx.languageClient.sessionForUri(document.uri) == null
        ) {
          return undefined;
        }

        log.debug(`[TsRename] rename: ${document.uri.fsPath}:${position.line}:${position.character} -> "${newName}"`);

        const aureliaRename = await ctx.lsp.renameFromTs(
          document.uri.toString(),
          { line: position.line, character: position.character },
          newName,
          token,
        );
        if (isCancelled(token)) return undefined;

        if (aureliaRename.status === "blocked" || aureliaRename.status === "refused") {
          const message = renameFailureMessage(aureliaRename);
          log.warn(`[TsRename] ${message}`);
          throw new Error(message);
        }

        if (aureliaRename.status === "not-applicable") {
          notifyUnverifiedCandidates(ctx, aureliaRename);
          log.debug(`[TsRename] falling through to TypeScript rename: ${aureliaRename.reason}`);
          return undefined;
        }

        if (aureliaRename.status === "available") {
          throw new Error("Aurelia cross-domain rename returned a prepare result for an edit request.");
        }

        const edit = await ctx.lsp.convertWorkspaceEdit(
          document.uri.toString(),
          aureliaRename.workspaceEdit as ProtocolWorkspaceEdit,
          token,
        );
        if (isCancelled(token)) return undefined;
        if (edit == null) {
          throw new Error("Aurelia cross-domain rename returned no convertible workspace edit.");
        }
        assertWorkspaceEditVersionsCurrent(
          ctx.vscode,
          aureliaRename.workspaceEdit,
          "Aurelia cross-domain rename was blocked because editor documents changed",
        );

        notifyUnverifiedCandidates(ctx, aureliaRename);
        log.debug(`[TsRename] atomic plan: ${edit.entries().length} files`);
        return edit;
      },

      prepareRename: async (document, position, token) => {
        if (
          isCancelled(token)
          || !isTypeScriptDocument(document)
          || ctx.languageClient.sessionForUri(document.uri) == null
        ) {
          return undefined;
        }
        const response = await ctx.lsp.renameFromTs(
          document.uri.toString(),
          { line: position.line, character: position.character },
          undefined,
          token,
        );
        if (isCancelled(token)) return undefined;
        if (response.status === "not-applicable") return undefined;
        if (response.status === "blocked" || response.status === "refused") {
          throw new Error(renameFailureMessage(response));
        }
        if (response.status !== "available") {
          throw new Error("Aurelia cross-domain rename returned an edit result during preparation.");
        }
        return {
          range: new vscode.Range(
            new vscode.Position(response.range.start.line, response.range.start.character),
            new vscode.Position(response.range.end.line, response.range.end.character),
          ),
          placeholder: response.placeholder,
        };
      },
    };

    let registration: DisposableLike | null = null;
    const registerForOwnedWorkspaces = () => {
      registration?.dispose();
      registration = null;
      const selector = ctx.languageClient.sessions.flatMap((session) => [
        {
          language: "typescript",
          scheme: session.folder.uri.scheme,
          pattern: new vscode.RelativePattern(session.folder, "**/*.ts"),
        },
        {
          language: "typescriptreact",
          scheme: session.folder.uri.scheme,
          pattern: new vscode.RelativePattern(session.folder, "**/*.tsx"),
        },
      ]);
      if (selector.length > 0) {
        registration = vscode.languages.registerRenameProvider(selector, provider);
      }
    };
    registerForOwnedWorkspaces();
    store.add(ctx.languageClient.onDidChangeSessions(registerForOwnedWorkspaces));
    store.add(toDisposable(() => registration?.dispose()));

    log.debug("[TsRename] activated");
    return store;
  },
};

function isTypeScriptDocument(document: import("vscode").TextDocument): boolean {
  return document.languageId === "typescript" || document.languageId === "typescriptreact";
}

function isCancelled(token: import("vscode").CancellationToken | undefined): boolean {
  return token?.isCancellationRequested === true;
}

function renameFailureMessage(response: Extract<RenameFromTsResponse, { status: "blocked" | "refused" }>): string {
  return response.message || `Aurelia cross-domain rename ${response.status}: ${response.reason}`;
}

function notifyUnverifiedCandidates(ctx: Parameters<ClientFeature["activate"]>[0], response: RenameFromTsResponse): void {
  const candidateCount = typeof response.candidateCount === "number" ? response.candidateCount : 0;
  if (candidateCount <= 0) {
    return;
  }
  const candidateNoun = candidateCount === 1 ? "usage" : "usages";
  ctx.vscode.window.showInformationMessage(
    `Aurelia rename left ${candidateCount} same-name template ${candidateNoun} unchanged because they could not be verified.`,
  );
}
