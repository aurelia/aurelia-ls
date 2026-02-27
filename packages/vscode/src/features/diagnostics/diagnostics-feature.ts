import type { FeatureModule } from "../../core/feature-graph.js";
import { ContractKeys, hasContract } from "../../core/capabilities.js";

export const DiagnosticsFeature: FeatureModule = {
  id: "diagnostics.ux",
  isEnabled: (ctx) => ctx.config.current.features.diagnostics,
  isAvailable: (ctx) => hasContract(ctx.capabilities.current, ContractKeys.diagnostics),
  activate: (ctx) => {
    ctx.languageClient.setDiagnosticsUxEnabled(true);
    ctx.logger.debug("diagnostics.feature.init");
    return {
      dispose: () => {
        ctx.languageClient.setDiagnosticsUxEnabled(false);
        ctx.logger.debug("diagnostics.feature.dispose");
      },
    };
  },
};

