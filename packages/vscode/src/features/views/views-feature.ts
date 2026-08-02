import type { ClientFeature } from "../../core/feature.js";
import { AureliaCommand, AureliaView } from "../../product-contract.js";
import { ResourceExplorerProvider } from "./resource-explorer.js";

export const ViewsFeature: ClientFeature = {
  id: "views.workspace",
  activate: (ctx, own) => {
    const explorer = own(new ResourceExplorerProvider(ctx.vscode, ctx.lsp, ctx.logger));
    const view = own(ctx.vscode.window.createTreeView(AureliaView.ResourceExplorer, {
      treeDataProvider: explorer,
      showCollapseAll: true,
    }));
    explorer.attachView(view);
    // The server publishes only after a newer semantic generation has settled.
    own(ctx.lsp.onAnalysisChanged(() => {
      void explorer.refresh();
    }));

    // Contribution registration is extension-scoped; workspace sessions are
    // dynamic inputs, so the visible inventory follows session ownership.
    own(ctx.languageClient.onDidChangeSessions(() => {
      void explorer.refresh();
    }));

    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.RefreshResourceExplorer,
      () => explorer.refresh(),
    ));

    // Initial refresh
    void explorer.refresh();

    ctx.logger.debug("views.feature.init");
  },
};
