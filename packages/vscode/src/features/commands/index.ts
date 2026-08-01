import type { ClientFeature } from "../../core/feature.js";
import { UserCommandsFeature } from "./user-commands.js";

export const CommandFeatures: readonly ClientFeature[] = [UserCommandsFeature];
