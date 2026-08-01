import type { ClientFeature } from "../core/feature.js";
import { CommandFeatures } from "./commands/index.js";
import { DiagnosticsFeatures } from "./diagnostics/index.js";
import { StatusFeatures } from "./status/index.js";
import { InlayHintsFeatures } from "./inlay-hints/inlay-hints-feature.js";
import { TsRenameFeature } from "./rename/ts-rename-feature.js";
import { ViewFeatures } from "./views/index.js";

/** Explicit activation order for the retained client-owned surfaces. */
export const DefaultFeatures: readonly ClientFeature[] = [
  ...CommandFeatures,
  ...DiagnosticsFeatures,
  ...InlayHintsFeatures,
  ...StatusFeatures,
  TsRenameFeature,
  ...ViewFeatures,
];
