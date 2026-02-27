import type { FeatureModule } from "../../core/feature-graph.js";
import { DebugCommandsFeature } from "./debug-commands.js";
import { UserCommandsFeature } from "./user-commands.js";

export const CommandFeatures: FeatureModule[] = [UserCommandsFeature, DebugCommandsFeature];
