import type { FeatureModule } from "../../core/feature-registry.js";

export const ViewsFeature: FeatureModule = {
  id: "views.workspace",
  isEnabled: (ctx) => ctx.config.current.features.views,
  activate: (ctx) => {
    ctx.logger.debug("views.feature.init");
  },
};
