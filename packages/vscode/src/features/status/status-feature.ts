import { StatusService } from "../../status.js";
import type { FeatureModule } from "../../core/feature-graph.js";
import { StatusServiceToken } from "../../service-tokens.js";

export const StatusFeature: FeatureModule = {
  id: "status.bar",
  isEnabled: (ctx) => ctx.config.current.features.statusBar,
  activate: (ctx) => {
    const status = new StatusService(ctx.vscode);
    const registration = ctx.services.register(StatusServiceToken, status, { dispose: () => status.dispose() });

    ctx.lsp.onOverlayReady((payload) => {
      status.overlayReady(payload);
      ctx.presentation.update({
        overlay: {
          lastUri: payload.uri,
          callCount: typeof payload.calls === "number" ? payload.calls : undefined,
          diagCount: typeof payload.diags === "number" ? payload.diags : undefined,
        },
      });
    });

    return registration;
  },
};

