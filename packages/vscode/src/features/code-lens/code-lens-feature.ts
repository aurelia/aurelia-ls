import type { FeatureModule } from "../../core/feature-graph.js";
import { DisposableStore } from "../../core/disposables.js";

export const CodeLensFeature: FeatureModule = {
  id: "codeLens.resources",
  isEnabled: (ctx) => ctx.config.current.features.codeLens,
  activate: (ctx) => {
    const store = new DisposableStore();
    const vscode = ctx.vscode;

    const provider: import("vscode").CodeLensProvider = {
      provideCodeLenses: async (document) => {
        const uri = document.uri.toString();
        if (!uri.endsWith(".ts")) return [];

        try {
          const result = await ctx.lsp.sendRequest<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; command?: { title: string; command: string; arguments?: unknown[] } }[] | null>(
            "aurelia/getCodeLens",
            { uri },
          );
          if (!result || result.length === 0) return [];

          return result.map((lens) => {
            const range = new vscode.Range(
              new vscode.Position(lens.range.start.line, lens.range.start.character),
              new vscode.Position(lens.range.end.line, lens.range.end.character),
            );
            const codeLens = new vscode.CodeLens(range);
            if (lens.command) {
              codeLens.command = {
                title: lens.command.title,
                command: lens.command.command || "",
                arguments: lens.command.arguments,
              };
            }
            return codeLens;
          });
        } catch {
          return [];
        }
      },
    };

    store.add(
      vscode.languages.registerCodeLensProvider(
        { language: "typescript", scheme: "file" },
        provider,
      ),
    );

    ctx.logger.debug("codeLens.feature.init");
    store.add({
      dispose: () => ctx.logger.debug("codeLens.feature.dispose"),
    });

    return store;
  },
};
