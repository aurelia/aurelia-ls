import type { ClientFeature } from "../../core/feature.js";
import { DisposableStore } from "../../core/disposables.js";
import { AureliaCommand, AureliaView } from "../../product-contract.js";
import { ResourceExplorerProvider } from "./resource-explorer.js";

export const ViewsFeature: ClientFeature = {
  id: "views.workspace",
  activate: (ctx) => {
    const store = new DisposableStore();

    const explorer = new ResourceExplorerProvider(ctx.vscode, ctx.lsp, ctx.logger);
    store.add(explorer);

    const treeView = ctx.vscode.window.createTreeView(AureliaView.ResourceExplorer, {
      treeDataProvider: explorer,
      showCollapseAll: true,
    });
    store.add(treeView);

    // The server publishes only after a newer semantic generation has settled.
    store.add(ctx.lsp.onAnalysisChanged(() => {
      void explorer.refresh();
    }));

    // Refresh command
    store.add(
      ctx.vscode.commands.registerCommand(AureliaCommand.RefreshResourceExplorer, () => explorer.refresh()),
    );

    // Initial refresh
    void explorer.refresh();

    ctx.logger.debug("views.feature.init");
    store.add({
      dispose: () => {
        ctx.logger.debug("views.feature.dispose");
      },
    });

    return store;
  },
};
