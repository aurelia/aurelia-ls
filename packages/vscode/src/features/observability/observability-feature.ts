import type { FeatureModule } from "../../core/feature-registry.js";
import { registerObservabilityCommands } from "../../observability-commands.js";
import { ObservabilityStatusService } from "../../observability-status.js";
import { DisposableStore } from "../../core/disposables.js";

export const ObservabilityFeature: FeatureModule = {
  id: "observability.core",
  activate: (ctx) => {
    const store = new DisposableStore();

    const status = new ObservabilityStatusService(ctx.config.current, ctx.vscode);
    ctx.services.observabilityStatus = status;
    store.add({ dispose: () => status.dispose() });

    store.add(registerObservabilityCommands(ctx.config, ctx.observability, ctx.vscode));
    store.add(ctx.config.onDidChange((next) => status.update(next)));

    return store;
  },
  deactivate: (ctx) => {
    ctx.services.observabilityStatus = undefined;
  },
};
