/**
 * TypeScript-side rename propagation to Aurelia templates.
 *
 * When the user renames a VM property/method in a TypeScript file,
 * VS Code's built-in TypeScript extension handles the TS-side edits.
 * This feature augments those edits with template-side edits by asking
 * the Aurelia language server for binding expression references.
 *
 * Architecture: registers a VS Code RenameProvider for TypeScript files.
 * On rename, it:
 * 1. Executes the built-in TS rename to get TS edits
 * 2. Asks the Aurelia LS for template edits via aurelia/renameFromTs
 * 3. Merges both edit sets into a single WorkspaceEdit
 *
 * Reentrancy: vscode.executeDocumentRenameProvider triggers ALL registered
 * providers, including this one. A reentrancy guard prevents infinite
 * recursion — on reentrant calls, the provider returns undefined so the
 * built-in TS provider handles the request.
 */
import type { FeatureModule } from "../../core/feature-graph.js";
import { DisposableStore } from "../../core/disposables.js";

type Position = { line: number; character: number };
type RenameFromTsResponse = {
  changes: Record<string, { range: { start: Position; end: Position }; newText: string }[]>;
} | null;

export const TsRenameFeature: FeatureModule = {
  id: "rename.tsPropagate",
  isEnabled: () => true,
  activate: (ctx) => {
    const store = new DisposableStore();
    const vscode = ctx.vscode;

    // Reentrancy guard: executeDocumentRenameProvider calls all providers
    // including this one. On reentrant calls, return undefined to let the
    // built-in TS provider handle it.
    let delegating = false;

    const provider: import("vscode").RenameProvider = {
      provideRenameEdits: async (document, position, newName, token) => {
        if (delegating) return undefined;

        // Step 1: Execute the built-in TS rename (reentrancy-guarded)
        let tsEdit: import("vscode").WorkspaceEdit | undefined;
        delegating = true;
        try {
          tsEdit = await vscode.commands.executeCommand<import("vscode").WorkspaceEdit>(
            "vscode.executeDocumentRenameProvider",
            document.uri,
            position,
            newName,
          );
        } finally {
          delegating = false;
        }

        // Step 2: Ask Aurelia LS for template edits
        let aureliaChanges: RenameFromTsResponse = null;
        try {
          aureliaChanges = await ctx.lsp.sendRequest<RenameFromTsResponse>(
            "aurelia/renameFromTs",
            {
              uri: document.uri.toString(),
              position: { line: position.line, character: position.character },
              newName,
            },
          );
        } catch {
          // Aurelia LS not ready or request failed — proceed with TS-only rename
        }

        // No template edits — let TS rename handle it entirely
        if (!aureliaChanges?.changes) return tsEdit;

        // Step 3: Merge edits
        const merged = tsEdit ?? new vscode.WorkspaceEdit();

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
          }
        }

        return merged;
      },

      prepareRename: async (document, position, token) => {
        if (delegating) return undefined;

        // Delegate to VS Code's built-in TS prepareRename
        delegating = true;
        try {
          const result = await vscode.commands.executeCommand<
            | { range: import("vscode").Range; placeholder: string }
            | import("vscode").Range
            | null
          >(
            "vscode.prepareDocumentRenameProvider",
            document.uri,
            position,
          );

          if (!result) return undefined;
          if ("range" in result && "placeholder" in result) {
            return result;
          }
          return result as import("vscode").Range;
        } finally {
          delegating = false;
        }
      },
    };

    store.add(
      vscode.languages.registerRenameProvider(
        [
          { language: "typescript", scheme: "file" },
          { language: "typescriptreact", scheme: "file" },
        ],
        provider,
      ),
    );

    return store;
  },
};
