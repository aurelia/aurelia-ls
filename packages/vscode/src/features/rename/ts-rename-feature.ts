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
        const aureliaChanges = await ctx.lsp.renameFromTs(
          document.uri.toString(),
          { line: position.line, character: position.character },
          newName,
        );

        // No template edits — return TS-only edits
        if (!aureliaChanges?.changes) {
          log.debug("[TsRename] no template edits, TS-only rename");
          return tsEdit;
        }

        // Step 3: Merge TS + template edits
        const merged = tsEdit ?? new vscode.WorkspaceEdit();
        let templateEditCount = 0;
        for (const [uri, edits] of Object.entries(aureliaChanges.changes)) {
          const fileUri = vscode.Uri.parse(uri);
          for (const edit of edits) {
            merged.replace(
              fileUri,
              new vscode.Range(
                new vscode.Position(edit.range.start.line, edit.range.start.character),
                new vscode.Position(edit.range.end.line, edit.range.end.character),
              ),
              edit.newText,
            );
            templateEditCount++;
          }
        }

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
