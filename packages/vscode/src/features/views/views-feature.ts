import type { FeatureModule } from "../../core/feature-graph.js";
import { DisposableStore } from "../../core/disposables.js";
import { ResourceExplorerProvider } from "./resource-explorer.js";

export const ViewsFeature: FeatureModule = {
  id: "views.workspace",
  isEnabled: (ctx) => ctx.config.current.features.views,
  activate: (ctx) => {
    const store = new DisposableStore();

    const explorer = new ResourceExplorerProvider(ctx.vscode, ctx.lsp, ctx.logger);

    const treeView = ctx.vscode.window.createTreeView("aureliaResourceExplorer", {
      treeDataProvider: explorer,
      showCollapseAll: true,
    });
    store.add(treeView);

    // Refresh on overlay ready (new compilation available)
    ctx.lsp.onOverlayReady(() => {
      void explorer.refresh();
    });

    // Refresh when catalog updates (e.g. third-party package scan completes)
    ctx.lsp.onCatalogUpdated(() => {
      void explorer.refresh();
    });

    // Refresh command
    store.add(
      ctx.vscode.commands.registerCommand("aurelia.refreshResourceExplorer", () => {
        void explorer.refresh();
      }),
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
