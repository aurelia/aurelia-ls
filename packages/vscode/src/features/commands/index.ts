import type { ClientFeature } from "../../core/feature.js";
import { BindingUncertaintyExplanationFeature } from "../binding-uncertainty-explanation/binding-uncertainty-explanation-feature.js";
import { CapabilityExplanationFeature } from "../capability-explanation/capability-explanation-feature.js";
import { UserCommandsFeature } from "./user-commands.js";

export const CommandFeatures: readonly ClientFeature[] = [
  UserCommandsFeature,
  BindingUncertaintyExplanationFeature,
  CapabilityExplanationFeature,
];
