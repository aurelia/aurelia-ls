import type { FeatureModule } from "../../core/feature-registry.js";
import { DebugCommandsFeature } from "./debug-commands.js";

export const CommandFeatures: FeatureModule[] = [DebugCommandsFeature];
