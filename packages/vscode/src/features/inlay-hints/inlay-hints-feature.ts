import type { ClientFeature } from "../../core/feature.js";

export const InlayHintsFeature: ClientFeature = {
  id: "inlayHints.bindingModes",
  isEnabled: (ctx) => ctx.config.current.features.inlayHints,
  activate: (ctx) => {
    ctx.languageClient.setInlayHintsEnabled(true);
    ctx.logger.debug("inlayHints.feature.init");
    return {
      dispose: () => {
        ctx.languageClient.setInlayHintsEnabled(false);
        ctx.logger.debug("inlayHints.feature.dispose");
      },
    };
  },
};

export const InlayHintsFeatures: readonly ClientFeature[] = [InlayHintsFeature];
