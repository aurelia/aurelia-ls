import type { FeatureModule } from "../core/feature-graph.js";
import { CommandFeatures } from "./commands/index.js";
import { DiagnosticsFeatures } from "./diagnostics/index.js";
import { InlineFeatures } from "./inline/index.js";
import { ObservabilityFeatures } from "./observability/index.js";
import { StatusFeatures } from "./status/index.js";
import { ViewFeatures } from "./views/index.js";

export const DefaultFeatures: FeatureModule[] = [
  ...CommandFeatures,
  ...DiagnosticsFeatures,
  ...InlineFeatures,
  ...ObservabilityFeatures,
  ...StatusFeatures,
  ...ViewFeatures,
];

