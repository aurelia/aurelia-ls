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

    // The tree snapshot is presentation state, not semantic authority. Keep it
    // until the view is requested again, but do not spend a workspace-wide
    // inventory query while the contributed view is hidden. A single drain
    // folds any invalidations received during an active refresh into one
    // trailing refresh.
    let acceptingRefreshes = true;
    let dirty = true;
    let forceWhileHidden = false;
    let refreshDrain: Promise<void> | null = null;
    const drainRefresh = (): Promise<void> => {
      if (!acceptingRefreshes) return Promise.resolve();
      if (refreshDrain != null) return refreshDrain;
      if (!dirty || (!view.visible && !forceWhileHidden)) return Promise.resolve();

      const operation = (async () => {
        while (acceptingRefreshes && dirty && (view.visible || forceWhileHidden)) {
          dirty = false;
          forceWhileHidden = false;
          await explorer.refresh();
        }
      })();
      refreshDrain = operation.finally(() => {
        refreshDrain = null;
        if (acceptingRefreshes && dirty && (view.visible || forceWhileHidden)) {
          void drainRefresh();
        }
      });
      return refreshDrain;
    };
    const invalidate = (): void => {
      dirty = true;
      void drainRefresh();
    };

    own(view.onDidChangeVisibility((event) => {
      if (event.visible) void drainRefresh();
    }));
    // The server publishes only after a newer semantic generation has settled.
    own(ctx.lsp.onAnalysisChanged(() => {
      invalidate();
    }));

    // Contribution registration is extension-scoped; workspace sessions are
    // dynamic inputs, so the visible inventory follows session ownership.
    own(ctx.languageClient.onDidChangeSessions(() => {
      invalidate();
    }));

    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.RefreshResourceExplorer,
      () => {
        dirty = true;
        forceWhileHidden = true;
        return drainRefresh();
      },
    ));
    // Registered last so deactivation closes the drain before disposing the
    // view and provider that an already-running refresh still references.
    own({
      dispose: () => {
        acceptingRefreshes = false;
        dirty = false;
        forceWhileHidden = false;
      },
    });

    // A restored visible view requests its initial snapshot immediately. A
    // hidden view stays dirty until VS Code reveals it.
    void drainRefresh();

    ctx.logger.debug("views.feature.init");
  },
};
