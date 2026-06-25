import { registerCommands } from "../../commands.js";
import type { FeatureModule } from "../../core/feature-graph.js";

export const DebugCommandsFeature: FeatureModule = {
  id: "commands.debug",
  requires: ["observability.core"],
  isEnabled: (ctx) =>
    ctx.config.current.features.commands
    && ctx.config.current.features.debugCommands,
  activate: (ctx) => {
    registerCommands(ctx.extension, ctx.queries, ctx.observability, ctx.vscode);
  },
};

