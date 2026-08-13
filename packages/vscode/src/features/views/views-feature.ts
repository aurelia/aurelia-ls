import type { ClientFeature } from "../../core/feature.js";
import { AureliaCommand, AureliaView } from "../../product-contract.js";
import {
  emitResourceDiscoveryHostObservation,
  nextResourceDiscoveryHostObservationId,
} from "../../resource-discovery-host-control.js";
import { openResourceNavigation } from "../resource-discovery/navigation.js";
import { reviewAnalysisLimitations } from "../analysis-limitations/review.js";
import { explainResourceAvailability } from "../resource-availability-explanation/resource-availability-explanation.js";
import {
  ResourceExplorerProvider,
  type ResourceExplorerNavigationAction,
} from "./resource-explorer.js";

export const ViewsFeature: ClientFeature = {
  id: "views.workspace",
  activate: (ctx, own) => {
    const observationId = nextResourceDiscoveryHostObservationId("resource-explorer-view");
    const observe = (
      phase: string,
      detail: Readonly<Record<string, string | number | boolean | null | undefined>> = {},
    ): void => {
      if (observationId == null) return;
      emitResourceDiscoveryHostObservation({
        source: "resource-explorer-view",
        observationId,
        phase,
        ...detail,
      });
    };
    const explorer = own(new ResourceExplorerProvider(
      ctx.vscode,
      ctx.lsp,
      ctx.logger,
      async (task) => {
        observe("progress", { status: "started", viewId: AureliaView.ResourceExplorer });
        try {
          return await ctx.vscode.window.withProgress(
            { location: { viewId: AureliaView.ResourceExplorer } },
            () => task(),
          );
        } finally {
          observe("progress", { status: "finished", viewId: AureliaView.ResourceExplorer });
        }
      },
    ));
    const view = own(ctx.vscode.window.createTreeView(AureliaView.ResourceExplorer, {
      treeDataProvider: explorer,
      showCollapseAll: true,
    }));
    explorer.attachView(view);
    observe("visibility", { visible: view.visible, viewId: AureliaView.ResourceExplorer });

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
    const noActiveRefresh = Symbol("no-active-resource-refresh");
    let activeRefreshScope: string | null | typeof noActiveRefresh = noActiveRefresh;
    const hasDirtyRefresh = (): boolean => dirtyAll || dirtyWorkspaceKeys.size > 0;
    const drainRefresh = (): Promise<void> => {
      if (!acceptingRefreshes) return Promise.resolve();
      if (refreshDrain != null) return refreshDrain;
      if (!hasDirtyRefresh() || (!view.visible && !forceWhileHidden)) return Promise.resolve();

      // An explicit hidden refresh is one demand for a coherent current
      // snapshot, not merely permission for its first attempt. Session and
      // analysis invalidations can supersede that attempt while it is in
      // flight, so retain the permission until this drain has consumed the
      // causally requeued work.
      let drainWhileHidden = forceWhileHidden;
      forceWhileHidden = false;

      const operation = (async () => {
        while (
          acceptingRefreshes
          && hasDirtyRefresh()
          && (view.visible || drainWhileHidden || forceWhileHidden)
        ) {
          if (forceWhileHidden) {
            drainWhileHidden = true;
            forceWhileHidden = false;
          }
          if (dirtyAll) {
            dirtyAll = false;
            dirtyWorkspaceKeys.clear();
            activeRefreshScope = null;
            try {
              await explorer.refresh();
            } finally {
              activeRefreshScope = noActiveRefresh;
            }
            continue;
          }
          const workspaceKey = dirtyWorkspaceKeys.values().next().value;
          if (workspaceKey == null) continue;
          dirtyWorkspaceKeys.delete(workspaceKey);
          activeRefreshScope = workspaceKey;
          try {
            await explorer.refreshWorkspace(workspaceKey);
          } finally {
            activeRefreshScope = noActiveRefresh;
          }
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
      observe("invalidation", { scope: "all", force, visible: view.visible });
      explorer.markUpdating(null);
      if (activeRefreshScope !== noActiveRefresh) {
        observe("superseded", {
          activeScope: activeRefreshScope ?? "all",
          replacementScope: "all",
        });
        explorer.supersedeRefresh(null);
      }
      dirtyAll = true;
      dirtyWorkspaceKeys.clear();
      observe("requeued", { scope: "all" });
      if (force) forceWhileHidden = true;
      return drainRefresh();
    };
    const invalidateWorkspace = (workspaceKey: string): Promise<void> => {
      observe("invalidation", { scope: "workspace", workspaceKey, visible: view.visible });
      if (activeRefreshScope === null || dirtyAll) {
        explorer.markUpdating(null);
        if (activeRefreshScope === null) {
          observe("superseded", { activeScope: "all", replacementScope: "all", workspaceKey });
          explorer.supersedeRefresh(null);
        }
        dirtyAll = true;
        dirtyWorkspaceKeys.clear();
        observe("requeued", { scope: "all", workspaceKey });
      } else {
        explorer.markUpdating(workspaceKey);
        if (activeRefreshScope === workspaceKey) {
          observe("superseded", { activeScope: workspaceKey, replacementScope: workspaceKey, workspaceKey });
          explorer.supersedeRefresh(workspaceKey);
        }
        if (!dirtyAll) dirtyWorkspaceKeys.add(workspaceKey);
        observe("requeued", { scope: "workspace", workspaceKey });
      }
      return drainRefresh();
    };

    own(view.onDidChangeVisibility((event) => {
      observe("visibility", { visible: event.visible, viewId: AureliaView.ResourceExplorer });
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
    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.ReviewAnalysisLimitations,
      async () => {
        // Re-prove exact generation/project joins before any source navigation.
        await invalidateAll(true);
        return reviewAnalysisLimitations(
          ctx.vscode,
          ctx.logger,
          explorer.analysisLimitationsForReview(),
          async () => {
            await invalidateAll(true);
            return explorer.analysisLimitationsForReview();
          },
        );
      },
    ));
    const openTreeResource = async (target: unknown, action: ResourceExplorerNavigationAction): Promise<boolean> => {
      while (true) {
        const request = explorer.navigationFor(target, action);
        if (request == null) return false;
        try {
          return await openResourceNavigation(ctx.vscode, ctx.lsp, ctx.logger, request);
        } catch (error) {
          ctx.logger.warn("resourceExplorer.navigation.failed", {
            action,
            message: error instanceof Error ? error.message : String(error),
          });
          const recoveryMessage = "The Aurelia resource could not be opened. Try again or open Aurelia Output for details.";
          observe("recovery-presented", {
            action,
            actionCount: 2,
            message: recoveryMessage,
            outputActionLabel: "Open Aurelia Output",
            retryActionLabel: "Retry",
          });
          const recovery = await ctx.vscode.window.showInformationMessage(
            recoveryMessage,
            "Retry",
            "Open Aurelia Output",
          );
          observe("recovery-choice", { action, choice: recovery ?? "dismissed" });
          if (recovery === "Retry") {
            await invalidateWorkspace(request.workspaceKey);
            continue;
          }
          if (recovery === "Open Aurelia Output") {
            observe("output-requested", { origin: "navigation-recovery", action });
            ctx.logger.show(true);
          }
          return false;
        }
      }
    };
    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.OpenResourceDeclaration,
      (target: unknown) => openTreeResource(target, "declaration"),
    ));
    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.OpenResourceImplementation,
      (target: unknown) => openTreeResource(target, "implementation"),
    ));
    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.OpenResourceToSide,
      (target: unknown) => openTreeResource(target, "beside"),
    ));
    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.ExplainResourceAvailability,
      (target: unknown) => ctx.errors.capture(
        "command.explainResourceAvailability",
        () => explainResourceAvailability(ctx, explorer, target),
        { notify: false },
      ).then(async (outcome) => {
        if (!outcome.ok) {
          await ctx.vscode.window.showInformationMessage(
            "Aurelia could not load this resource availability explanation. Try again.",
          );
        }
        return outcome;
      }),
    ));
    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.RetryResourceProject,
      (target: unknown) => {
        const workspaceKey = explorer.retryWorkspaceFor(target);
        observe("retry", { workspaceKey, admitted: workspaceKey != null });
        return workspaceKey == null ? Promise.resolve() : invalidateWorkspace(workspaceKey);
      },
    ));
    own(ctx.vscode.commands.registerCommand(
      AureliaCommand.OpenAureliaOutput,
      () => {
        observe("output-requested", { origin: "tree-action" });
        ctx.logger.show(true);
      },
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
