import { StatusService } from "../../status.js";
import type { FeatureModule } from "../../core/feature-registry.js";

export const StatusFeature: FeatureModule = {
  id: "status.bar",
  isEnabled: (ctx) => ctx.config.current.features.statusBar,
  activate: (ctx) => {
    const status = new StatusService(ctx.vscode);
    ctx.services.status = status;

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

    return { dispose: () => status.dispose() };
  },
};
