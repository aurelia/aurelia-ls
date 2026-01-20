import type { FeatureModule } from "../../core/feature-registry.js";

export const DiagnosticsFeature: FeatureModule = {
  id: "diagnostics.ux",
  isEnabled: (ctx) => ctx.config.current.features.diagnostics,
  activate: (ctx) => {
    ctx.logger.debug("diagnostics.feature.init");
  },
};
