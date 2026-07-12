/**
 * TypeScript-side rename propagation to Aurelia templates.
 *
 * When the user renames a VM property/method in a TypeScript file,
 * VS Code's built-in TypeScript extension handles the TS-side edits.
 * This feature augments those edits with template-side edits by asking
 * the Aurelia language server for binding expression references.
 *
 * Architecture: registers a RenameProvider for TS files with a
 * pattern-augmented document selector (scores higher than the built-in
 * TS provider). Our prepareRename validates the position using
 * getWordRangeAtPosition (NOT vscode.prepareDocumentRenameProvider,
 * which doesn't exist as a command — calling it throws silently and
 * causes VS Code to fall back to the built-in TS provider, skipping
 * our provideRenameEdits entirely). Our provideRenameEdits delegates
 * to the built-in TS rename, then augments with template edits from
 * the Aurelia LS.
 */
import type { FeatureModule } from "../../core/feature-graph.js";
import { DisposableStore } from "../../core/disposables.js";
import type { ProtocolWorkspaceEdit, RenameFromTsResponse } from "../../types.js";
import { assertWorkspaceEditVersionsCurrent } from "../../workspace-edit-versions.js";

export const TsRenameFeature: FeatureModule = {
  id: "rename.tsPropagate",
  isEnabled: () => true,
  activate: (ctx) => {
    const store = new DisposableStore();
    const vscode = ctx.vscode;
    const log = ctx.logger;

    let delegating = false;

    const provider: import("vscode").RenameProvider = {
      provideRenameEdits: async (document, position, newName, token) => {
        if (delegating) return undefined;

        const isTs = document.languageId === "typescript" || document.languageId === "typescriptreact";
        if (!isTs) return undefined;

        log.debug(`[TsRename] rename: ${document.uri.fsPath}:${position.line}:${position.character} -> "${newName}"`);

        // Step 1: Delegate to the built-in TS rename (reentrancy-guarded)
        let tsEdit: import("vscode").WorkspaceEdit | undefined;
        delegating = true;
        try {
          tsEdit = await vscode.commands.executeCommand<import("vscode").WorkspaceEdit>(
            "vscode.executeDocumentRenameProvider",
            document.uri,
            position,
            newName,
          );
        } catch (e) {
          log.warn(`[TsRename] built-in TS rename failed: ${e instanceof Error ? e.message : e}`);
          return undefined;
        } finally {
          delegating = false;
        }

        // Step 2: Ask Aurelia LS for template edits
        const aureliaRename = await ctx.lsp.renameFromTs(
          document.uri.toString(),
          { line: position.line, character: position.character },
          newName,
          token,
        );
        if (token?.isCancellationRequested === true) return undefined;

        if (aureliaRename.status === "blocked" || aureliaRename.status === "refused") {
          const message = renamePropagationFailureMessage(aureliaRename);
          log.warn(`[TsRename] ${message}`);
          throw new Error(message);
        }

        if (aureliaRename.status === "not-applicable") {
          notifyUnverifiedCandidates(ctx, aureliaRename);
          log.debug(`[TsRename] no template edits, TS-only rename: ${aureliaRename.reason}`);
          return tsEdit;
        }

        const convertWorkspaceEdit = ctx.rawClient.protocol2CodeConverter.asWorkspaceEdit as (
          workspaceEdit: ProtocolWorkspaceEdit,
          token: import("vscode").CancellationToken,
        ) => Promise<import("vscode").WorkspaceEdit | undefined>;
        const templateEdit = await convertWorkspaceEdit(aureliaRename.workspaceEdit, token);
        if (templateEdit == null) {
          throw new Error("Aurelia template rename propagation returned no convertible workspace edit.");
        }
        assertWorkspaceEditVersionsCurrent(
          ctx.vscode,
          aureliaRename.workspaceEdit,
          "Aurelia template rename propagation was blocked because editor documents changed",
        );

        // Step 3: Merge TS + template edits
        const merged = tsEdit ?? new vscode.WorkspaceEdit();
        let templateEditCount = 0;
        for (const [uri, edits] of templateEdit.entries()) {
          const existingEdits = merged.get(uri);
          merged.set(uri, [...existingEdits, ...edits]);
          templateEditCount += edits.length;
        }
        if (templateEditCount === 0) {
          log.debug("[TsRename] template propagation returned an empty workspace edit");
        }

        notifyUnverifiedCandidates(ctx, aureliaRename);
        log.debug(`[TsRename] merged: ${merged.entries().length} files, ${templateEditCount} template edits`);
        return merged;
      },

      prepareRename: async (document, position, token) => {
        if (delegating) return undefined;

        const isTs = document.languageId === "typescript" || document.languageId === "typescriptreact";
        if (!isTs) return undefined;

        // Extract the word at the cursor position directly from the document.
        // Do NOT use vscode.prepareDocumentRenameProvider — that command does
        // not exist. Calling it throws, which causes VS Code to skip our
        // provider and fall back to the built-in TS provider, meaning our
        // provideRenameEdits is never called.
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return undefined;

        const placeholder = document.getText(wordRange);
        log.debug(`[TsRename] prepare: ${document.uri.fsPath}:${position.line}:${position.character} -> "${placeholder}"`);
        return { range: wordRange, placeholder };
      },
    };

    // Pattern-augmented selector scores higher than the built-in TS provider.
    // VS Code ranks by specificity: language+scheme+pattern > language+scheme.
    store.add(
      vscode.languages.registerRenameProvider(
        [
          { language: "typescript", scheme: "file", pattern: "**/*.ts" },
          { language: "typescriptreact", scheme: "file", pattern: "**/*.tsx" },
        ],
        provider,
      ),
    );

    log.debug("[TsRename] activated");
    return store;
  },
};

function renamePropagationFailureMessage(response: Extract<RenameFromTsResponse, { status: "blocked" | "refused" }>): string {
  return response.message || `Aurelia template rename propagation ${response.status}: ${response.reason}`;
}

function notifyUnverifiedCandidates(ctx: Parameters<FeatureModule["activate"]>[0], response: RenameFromTsResponse): void {
  const candidateCount = typeof response.candidateCount === "number" ? response.candidateCount : 0;
  if (candidateCount <= 0) {
    return;
  }
  const candidateNoun = candidateCount === 1 ? "usage" : "usages";
  ctx.vscode.window.showInformationMessage(
    `Aurelia rename left ${candidateCount} same-name template ${candidateNoun} unchanged because they could not be verified.`,
  );
}
