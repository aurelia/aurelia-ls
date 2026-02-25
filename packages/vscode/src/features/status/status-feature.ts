import { StatusService } from "../../status.js";
import type { FeatureModule } from "../../core/feature-graph.js";
import { StatusServiceToken } from "../../service-tokens.js";
import { NotificationKeys, hasNotification } from "../../core/capabilities.js";

export const StatusFeature: FeatureModule = {
  id: "status.bar",
  isEnabled: (ctx) => ctx.config.current.features.statusBar,
  isAvailable: (ctx) => hasNotification(ctx.capabilities.current, NotificationKeys.overlayReady),
  activate: (ctx) => {
    const status = new StatusService(ctx.vscode);
    const registration = ctx.services.register(StatusServiceToken, status, { dispose: () => status.dispose() });

    // Transition to "discovering" once capabilities are known (server is ready)
    status.discovering();

    let overlayCount = 0;

    // Refresh counts when workspace semantics change
    ctx.lsp.onWorkspaceChanged((payload) => {
      if (payload.domains.includes("resources")) {
        void ctx.lsp.getResources().then((response) => {
          if (!response) return;
          const gapCount = response.resources.reduce((sum, r) => sum + r.gapCount, 0);
          status.ready(response.resources.length, response.templateCount, gapCount);
        });
      }
    });

    ctx.lsp.onOverlayReady((payload) => {
      overlayCount++;

      // If coverage data is available (L2 TemplateCoverage), show that
      const coverage = payload.coverage;
      if (coverage && typeof coverage.totalPositions === "number") {
        status.templateCoverage(
          {
            totalPositions: coverage.totalPositions,
            fullyAnalyzed: coverage.fullyAnalyzed ?? 0,
            partiallyAnalyzed: coverage.partiallyAnalyzed ?? 0,
            emittedCount: coverage.emittedCount ?? 0,
            suppressedCount: coverage.suppressedCount ?? 0,
          },
          payload.uri,
        );
      } else if (overlayCount === 1 && status.phase !== "ready") {
        // First overlay notification — query resources to get counts
        void ctx.lsp.getResources().then((response) => {
          if (!response) return;
          const gapCount = response.resources.reduce((sum, r) => sum + r.gapCount, 0);
          status.ready(response.resources.length, response.templateCount, gapCount);
        });
      }

      ctx.presentation.update({
        overlay: {
          lastUri: payload.uri,
          callCount: typeof payload.calls === "number" ? payload.calls : undefined,
          diagCount: typeof payload.diags === "number" ? payload.diags : undefined,
        },
      });
    });

    return registration;
  },
};
