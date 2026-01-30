import type { FeatureModule } from "../../core/feature-graph.js";
import { ContractKeys, hasContract } from "../../core/capabilities.js";

export const DiagnosticsFeature: FeatureModule = {
  id: "diagnostics.ux",
  isEnabled: (ctx) => ctx.config.current.features.diagnostics,
  isAvailable: (ctx) => hasContract(ctx.capabilities.current, ContractKeys.diagnostics),
  activate: (ctx) => {
    ctx.logger.debug("diagnostics.feature.init");
  },
};

