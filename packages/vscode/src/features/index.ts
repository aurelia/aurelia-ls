import type { FeatureModule } from "../core/feature-graph.js";
import { CommandFeatures } from "./commands/index.js";
import { DiagnosticsFeatures } from "./diagnostics/index.js";
import { InlineFeatures } from "./inline/index.js";
import { ObservabilityFeatures } from "./observability/index.js";
import { StatusFeatures } from "./status/index.js";
import { CodeLensFeature } from "./code-lens/code-lens-feature.js";
import { InlayHintsFeatures } from "./inlay-hints/inlay-hints-feature.js";
import { ViewFeatures } from "./views/index.js";

export const DefaultFeatures: FeatureModule[] = [
  CodeLensFeature,
  ...CommandFeatures,
  ...DiagnosticsFeatures,
  ...InlayHintsFeatures,
  ...InlineFeatures,
  ...ObservabilityFeatures,
  ...StatusFeatures,
  ...ViewFeatures,
];

