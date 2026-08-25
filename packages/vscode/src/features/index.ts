import type { ClientFeature } from "../core/feature.js";
import { CommandFeatures } from "./commands/index.js";
import { TsRenameFeature } from "./rename/ts-rename-feature.js";
import { ViewFeatures } from "./views/index.js";

/** Explicit activation order for the retained client-owned surfaces. */
export const DefaultFeatures: readonly ClientFeature[] = [
  ...CommandFeatures,
  TsRenameFeature,
  ...ViewFeatures,
];
