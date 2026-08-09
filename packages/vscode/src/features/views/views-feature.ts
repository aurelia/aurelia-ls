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
    let dirtyAll = true;
    const dirtyWorkspaceKeys = new Set<string>();
    let forceWhileHidden = false;
    let refreshDrain: Promise<void> | null = null;
    const hasDirtyRefresh = (): boolean => dirtyAll || dirtyWorkspaceKeys.size > 0;
    const drainRefresh = (): Promise<void> => {
      if (!acceptingRefreshes) return Promise.resolve();
      if (refreshDrain != null) return refreshDrain;
      if (!hasDirtyRefresh() || (!view.visible && !forceWhileHidden)) return Promise.resolve();

      const operation = (async () => {
        while (acceptingRefreshes && hasDirtyRefresh() && (view.visible || forceWhileHidden)) {
          forceWhileHidden = false;
          if (dirtyAll) {
            dirtyAll = false;
            dirtyWorkspaceKeys.clear();
            await explorer.refresh();
            continue;
          }
          const workspaceKey = dirtyWorkspaceKeys.values().next().value;
          if (workspaceKey == null) continue;
          dirtyWorkspaceKeys.delete(workspaceKey);
          await explorer.refreshWorkspace(workspaceKey);
        }
      })();
      refreshDrain = operation.finally(() => {
        refreshDrain = null;
        if (acceptingRefreshes && hasDirtyRefresh() && (view.visible || forceWhileHidden)) {
          void drainRefresh();
        }
      });
      return refreshDrain;
    };
    const invalidateAll = (force = false): Promise<void> => {
      dirtyAll = true;
      dirtyWorkspaceKeys.clear();
      if (force) forceWhileHidden = true;
      return drainRefresh();
    };
    const invalidateWorkspace = (workspaceKey: string): Promise<void> => {
      if (!dirtyAll) dirtyWorkspaceKeys.add(workspaceKey);
      return drainRefresh();
    };

    own(view.onDidChangeVisibility((event) => {
      if (event.visible) void drainRefresh();
    }));
    // The server publishes only after a newer semantic generation has settled.
    own(ctx.lsp.onAnalysisChanged((payload) => {
      if (payload.changeKind === "source-text") {
        void invalidateWorkspace(payload.workspace.key);
      } else {
        void invalidateAll();
      }
    }));

    // Contribution registration is extension-scoped; workspace sessions are
    // dynamic inputs, so the visible inventory follows session ownership.
    own(ctx.languageClient.onDidChangeSessions(() => {
      void invalidateAll();
    }));

    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.RefreshResourceExplorer,
      () => invalidateAll(true),
    ));
    // Registered last so deactivation closes the drain before disposing the
    // view and provider that an already-running refresh still references.
    own({
      dispose: () => {
        acceptingRefreshes = false;
        dirtyAll = false;
        dirtyWorkspaceKeys.clear();
        forceWhileHidden = false;
      },
    });

    // A restored visible view requests its initial snapshot immediately. A
    // hidden view stays dirty until VS Code reveals it.
    void drainRefresh();

    ctx.logger.debug("views.feature.init");
  },
};
