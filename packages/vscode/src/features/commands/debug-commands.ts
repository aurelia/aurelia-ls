import { registerCommands } from "../../commands.js";
import { VirtualDocProvider } from "../../virtual-docs.js";
import type { FeatureModule } from "../../core/feature-graph.js";

export const DebugCommandsFeature: FeatureModule = {
  id: "commands.debug",
  requires: ["observability.core"],
  isEnabled: (ctx) => ctx.config.current.features.commands && ctx.config.current.features.debugCommands,
  activate: (ctx) => {
    const provider = ctx.virtualDocs.ensureProvider(ctx.extension, VirtualDocProvider.scheme);
    registerCommands(ctx.extension, ctx.queries, provider, ctx.observability, ctx.vscode);
  },
};

