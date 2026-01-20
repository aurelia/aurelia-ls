import type { FeatureModule } from "../../core/feature-registry.js";

export const InlineUxFeature: FeatureModule = {
  id: "inline.ux",
  isEnabled: (ctx) => ctx.config.current.features.inline,
  activate: (ctx) => {
    ctx.logger.debug("inline.feature.init");
  },
};
