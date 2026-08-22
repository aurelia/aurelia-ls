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
import type { ClientContext } from "../../core/context.js";
import type {
  CancellationToken,
  DocumentSelector,
  RenameProvider,
  TextDocument,
} from "vscode";
import type { RenameFromTsResponse } from "../../types.js";
import { assertWorkspaceEditTransactionCurrent } from "../../workspace-edit-versions.js";
import {
  AureliaSemanticSessionState,
  type AureliaLanguageClientSession,
} from "../../client-core.js";

const SCRIPT_RENAME_SELECTOR: DocumentSelector = [
  { language: "typescript" },
  { language: "typescriptreact" },
  { language: "javascript" },
  { language: "javascriptreact" },
];

export const TsRenameFeature: ClientFeature = {
  id: "rename.tsPropagate",
  activate: (ctx, own) => {
    const vscode = ctx.vscode;
    const log = ctx.logger;

    const provider: RenameProvider = {
      provideRenameEdits: async (document, position, newName, token) => {
        if (
          isCancelled(token)
          || !isScriptDocument(document)
        ) {
          return undefined;
        }
        const sessionState = ctx.languageClient.semanticSessionStateForUri(document.uri);
        if (sessionState === AureliaSemanticSessionState.Unowned) return undefined;
        if (sessionState === AureliaSemanticSessionState.Transitioning) {
          throw new Error("Aurelia cross-domain rename is temporarily unavailable while workspace ownership reconciles; retry the rename.");
        }
        const originatingSession = ctx.languageClient.sessionForUri(document.uri);
        if (originatingSession == null) return undefined;
        const originatingIncarnation = originatingSession.incarnation;

        log.debug(`[TsRename] rename: ${document.uri.fsPath}:${position.line}:${position.character} -> "${newName}"`);

        const aureliaRename = await ctx.lsp.renameFromTs(
          document.uri.toString(),
          { line: position.line, character: position.character },
          newName,
          token,
        );
        if (isCancelled(token)) return undefined;
        assertSessionCurrent(ctx, document, originatingSession, originatingIncarnation);

        if (aureliaRename.status === "blocked" || aureliaRename.status === "refused") {
          const message = renameFailureMessage(aureliaRename);
          log.warn(`[TsRename] ${message}`);
          throw new Error(message);
        }

        assertNoUnresolvedCandidates(aureliaRename);

        if (aureliaRename.status === "not-applicable") {
          log.debug(`[TsRename] falling through to TypeScript rename: ${aureliaRename.reason}`);
          return undefined;
        }

        if (aureliaRename.status === "available") {
          throw new Error("Aurelia cross-domain rename returned a prepare result for an edit request.");
        }

        const edit = await ctx.lsp.convertWorkspaceEdit(
          originatingSession,
          aureliaRename.workspaceEdit,
          token,
        );
        if (isCancelled(token)) return undefined;
        assertSessionCurrent(ctx, document, originatingSession, originatingIncarnation);
        if (edit == null) {
          throw new Error("Aurelia cross-domain rename returned no convertible workspace edit.");
        }
        await assertWorkspaceEditTransactionCurrent(
          ctx.vscode,
          aureliaRename.workspaceEdit,
          "Aurelia cross-domain rename was blocked because target documents changed",
        );
        assertSessionCurrent(ctx, document, originatingSession, originatingIncarnation);

        log.debug(`[TsRename] atomic plan: ${edit.entries().length} files`);
        return edit;
      },

      prepareRename: async (document, position, token) => {
        if (
          isCancelled(token)
          || !isScriptDocument(document)
        ) {
          return undefined;
        }
        const sessionState = ctx.languageClient.semanticSessionStateForUri(document.uri);
        if (sessionState === AureliaSemanticSessionState.Unowned) return undefined;
        if (sessionState === AureliaSemanticSessionState.Transitioning) {
          throw new Error("Aurelia cross-domain rename is temporarily unavailable while workspace ownership reconciles; retry the rename.");
        }
        const originatingSession = ctx.languageClient.sessionForUri(document.uri);
        if (originatingSession == null) return undefined;
        const originatingIncarnation = originatingSession.incarnation;
        const response = await ctx.lsp.renameFromTs(
          document.uri.toString(),
          { line: position.line, character: position.character },
          undefined,
          token,
        );
        if (isCancelled(token)) return undefined;
        assertSessionCurrent(ctx, document, originatingSession, originatingIncarnation);
        if (response.status === "blocked" || response.status === "refused") {
          throw new Error(renameFailureMessage(response));
        }
        assertNoUnresolvedCandidates(response);
        if (response.status === "not-applicable") return undefined;
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

    log.debug("[TsRename] activated");
    own(vscode.languages.registerRenameProvider(SCRIPT_RENAME_SELECTOR, provider));
  },
};

function assertSessionCurrent(
  ctx: ClientContext,
  document: TextDocument,
  originatingSession: AureliaLanguageClientSession,
  originatingIncarnation: number,
): void {
  const current = ctx.languageClient.sessionForUri(document.uri);
  if (
    current?.client !== originatingSession.client
    || current.incarnation !== originatingIncarnation
  ) {
    throw new Error("Aurelia cross-domain rename was blocked because the workspace session changed; retry the rename.");
  }
}

function isScriptDocument(document: TextDocument): boolean {
  return document.languageId === "typescript"
    || document.languageId === "typescriptreact"
    || document.languageId === "javascript"
    || document.languageId === "javascriptreact";
}

function isCancelled(token: CancellationToken | undefined): boolean {
  return token?.isCancellationRequested === true;
}

function renameFailureMessage(response: Extract<RenameFromTsResponse, { status: "blocked" | "refused" }>): string {
  const base = response.message || `Aurelia cross-domain rename ${response.status}: ${response.reason}`;
  const candidates = response.candidates ?? [];
  if (candidates.length === 0) {
    return base;
  }
  const locations = candidates.map((candidate) =>
    `${candidate.uri}:${candidate.range.start.line + 1}:${candidate.range.start.character + 1} (${candidate.reason})`
  ).join(", ");
  return `${base} Unresolved authored locations: ${locations}`;
}

function assertNoUnresolvedCandidates(
  response: Exclude<RenameFromTsResponse, { status: "blocked" | "refused" }>,
): void {
  const candidateCount = typeof response.candidateCount === "number" ? response.candidateCount : 0;
  if (candidateCount <= 0) {
    return;
  }
  const locations = response.candidates.map((candidate) =>
    `${candidate.uri}:${candidate.range.start.line + 1}:${candidate.range.start.character + 1} (${candidate.reason})`
  ).join(", ");
  throw new Error(
    `Aurelia refused a partial rename plan with ${candidateCount} unresolved authored ${
      candidateCount === 1 ? "location" : "locations"
    }.${locations.length === 0 ? "" : ` Locations: ${locations}`}`,
  );
}
