import { StatusService } from "../../status.js";
import type { ClientFeature } from "../../core/feature.js";
import { DisposableStore } from "../../core/disposables.js";

export const StatusFeature: ClientFeature = {
  id: "status.bar",
  isEnabled: (ctx) => ctx.config.current.features.statusBar,
  activate: (ctx) => {
    const store = new DisposableStore();
    const status = new StatusService(ctx.vscode);
    store.add(status);

    store.add(ctx.lsp.onWorkspaceChanged((payload) => {
      if (payload.domains.length > 0) status.analyzing();
    }));
    store.add(ctx.lsp.onAnalysisReady(() => status.ready()));

    return store;
  },
};
