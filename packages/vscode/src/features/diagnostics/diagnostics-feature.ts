import type { ClientFeature } from "../../core/feature.js";

export const DiagnosticsFeature: ClientFeature = {
  id: "diagnostics.ux",
  isEnabled: (ctx) => ctx.config.current.features.diagnostics,
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

