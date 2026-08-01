import { StatusService } from "../../status.js";
import type { FeatureModule } from "../../core/feature-graph.js";
import { StatusServiceToken } from "../../service-tokens.js";
import { ContractKeys, hasContract } from "../../core/capabilities.js";
import { DisposableStore } from "../../core/disposables.js";

export const StatusFeature: FeatureModule = {
  id: "status.bar",
  isEnabled: (ctx) => ctx.config.current.features.statusBar,
  isAvailable: (ctx) => hasContract(ctx.capabilities.current, ContractKeys.query),
  activate: (ctx) => {
    const store = new DisposableStore();
    const status = new StatusService(ctx.vscode);
    store.add(ctx.services.register(StatusServiceToken, status, { dispose: () => status.dispose() }));

    // Transition to "discovering" once capabilities are known (server is ready)
    status.discovering();

    const queryAndUpdateStatus = () => {
      void ctx.queries.getResources({ timeoutMs: 1_500 }).then((response) => {
        if (!response) return;
        status.ready(response.resources.length, response.templateCount);
      });
    };

    // Eagerly query resources — they may already be available from server init
    queryAndUpdateStatus();

    // Refresh counts when semantic-runtime observes workspace/resource changes.
    store.add(ctx.lsp.onWorkspaceChanged((payload) => {
      if (
        payload.domains.includes("resources") ||
        payload.domains.includes("scopes") ||
        payload.domains.includes("templates")
      ) {
        queryAndUpdateStatus();
      }
    }));

    store.add(ctx.lsp.onAnalysisReady((payload) => {
      if (status.phase !== "ready") {
        status.analyzing();
      }
      ctx.presentation.update({
        diagnostics: {
          count: typeof payload.diags === "number" ? payload.diags : undefined,
          source: payload.uri,
        },
      });
      queryAndUpdateStatus();
    }));

    return store;
  },
};
